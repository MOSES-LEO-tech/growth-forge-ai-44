import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getLlmConfig, chatCompletion, estimateTokens, LlmError } from "../_shared/llm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logUsage = async (
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string
    model: string
    provider: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    latencyMs: number
    status: 'success' | 'error'
    errorCode?: string
    costSource: string
  },
) => {
  const { error } = await supabase.from('smartbuddy_usage').insert({
    user_id: input.userId,
    model: input.model,
    provider: input.provider,
    personality: 'scholarship_matching',
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    total_tokens: input.totalTokens,
    total_cost_usd: 0,
    latency_ms: input.latencyMs,
    status: input.status,
    error_code: input.errorCode ?? null,
    cost_source: input.costSource,
    metadata: {
      pricing: {
        input_per_1m_usd: 0,
        output_per_1m_usd: 0,
        source: 'openrouter-free-tier (rate-limited)',
      },
    },
  })

  if (error) console.error('Scholarship matching telemetry insert failed', error)
}

const rankScholarshipsTool = {
  type: 'function',
  function: {
    name: 'rank_scholarships',
    description: 'Rank scholarships by match quality for the student',
    parameters: {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              scholarship_title: { type: 'string' },
              match_score: { type: 'string', enum: ['high', 'medium', 'low'] },
              reason: { type: 'string' }
            },
            required: ['scholarship_title', 'match_score', 'reason']
          }
        }
      },
      required: ['matches']
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let userId: string | null = null;
  let model = 'unknown';
  let provider = 'unknown';
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    userId = user.id;

    // Fetch user profile and achievements
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', user.id);

    // Fetch all available scholarships
    const { data: scholarships } = await supabase
      .from('scholarships')
      .select('*')
      .gte('deadline', new Date().toISOString().split('T')[0]);

    if (!scholarships || scholarships.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create context for AI matching
    const userContext = `
Student Profile:
- Grade Level: ${profile?.grade_level || 'Not specified'}
- Achievements: ${achievements?.length || 0} total
- Categories: ${[...new Set(achievements?.map(a => a.category))].join(', ') || 'None'}

Available Scholarships:
${scholarships.map(s => `
- ${s.title} (${s.organization})
  Amount: $${s.amount || 'Varies'}
  Deadline: ${s.deadline}
  Grade Levels: ${s.grade_levels?.join(', ') || 'All'}
  Requirements: ${s.requirements?.join(', ') || 'See application'}
`).join('\n')}
    `;

    const config = await getLlmConfig('scholarship_matching', supabase);
    model = config.model;
    provider = config.provider;

    const messages = [
      {
        role: 'system',
        content: 'You are a scholarship matching expert. Analyze the student profile and rank scholarships by match quality (high/medium/low). Consider grade level, achievements, and requirements. Provide the scholarship title and match_score for each match.'
      },
      {
        role: 'user',
        content: userContext
      }
    ];

    const result = await chatCompletion(config, messages, {
      tools: [rankScholarshipsTool as any],
      toolChoice: { type: 'function', function: { name: 'rank_scholarships' } },
    });

    promptTokens = result.promptTokens || estimateTokens(messages, result.content).prompt_tokens;
    completionTokens = result.completionTokens || estimateTokens(messages, result.content).completion_tokens;

    const toolCall = result.toolCalls?.[0];
    if (!toolCall) throw new Error('AI did not return a ranked result');

    const aiMatches = JSON.parse(toolCall.arguments).matches;

    // Combine AI matches with scholarship data
    const matches = aiMatches.map((match: any) => {
      const scholarship = scholarships.find(s => s.title === match.scholarship_title);
      return {
        ...scholarship,
        match_score: match.match_score,
        match_reason: match.reason
      };
    }).filter(Boolean);

    await logUsage(supabase, {
      userId,
      model,
      provider,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs: Date.now() - startedAt,
      status: 'success',
      costSource: result.promptTokens ? 'provider_usage' : 'estimated_tokens',
    });

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in match-scholarships:', error);

    if (userId) {
      await logUsage(supabase, {
        userId,
        model,
        provider,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs: Date.now() - startedAt,
        status: 'error',
        errorCode: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
        costSource: 'estimated_tokens',
      });
    }

    if (error instanceof LlmError) {
      const status = error.status === 429 ? 429 : error.status === 402 ? 402 : 502;
      return new Response(
        JSON.stringify({ error: error.message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
