import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

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

    // Call Lovable AI for matching
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a scholarship matching expert. Analyze the student profile and rank scholarships by match quality (high/medium/low). Consider grade level, achievements, and requirements. Provide the scholarship title and match_score for each match.'
          },
          {
            role: 'user',
            content: userContext
          }
        ],
        tools: [{
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
        }],
        tool_choice: { type: 'function', function: { name: 'rank_scholarships' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const aiMatches = JSON.parse(toolCall.function.arguments).matches;

    // Combine AI matches with scholarship data
    const matches = aiMatches.map((match: any) => {
      const scholarship = scholarships.find(s => s.title === match.scholarship_title);
      return {
        ...scholarship,
        match_score: match.match_score,
        match_reason: match.reason
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in match-scholarships:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});