import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try { return new Date(value); } catch { return null; }
}

function computeHeuristicMatches(
  scholarships: any[],
  profile: any,
  achievements: any[]
) {
  const achievementText = (achievements || [])
    .map((a: any) => `${a.title} ${a.description}`.toLowerCase())
    .join(" ");
  const achievementCategories = new Set((achievements || []).map((a: any) => a.category?.toLowerCase()).filter(Boolean));
  const grade = (profile?.grade_level || '').toLowerCase();

  return (scholarships || []).map((s: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Grade level fit
    const gradeLevels: string[] = Array.isArray(s.grade_levels) ? s.grade_levels.map((g: any) => String(g).toLowerCase()) : [];
    if (gradeLevels.length === 0 || gradeLevels.includes(grade)) {
      score += 2;
      reasons.push(gradeLevels.length === 0 ? "Open to all grade levels" : `Grade level matches: ${profile?.grade_level}`);
    } else {
      reasons.push(`Grade level may not match (${profile?.grade_level} vs ${gradeLevels.join(', ')})`);
    }

    // Tag/category alignment
    const tags: string[] = Array.isArray(s.tags) ? s.tags.map((t: any) => String(t).toLowerCase()) : [];
    const tagMatches = tags.filter(t => achievementCategories.has(t));
    if (tagMatches.length > 0) {
      score += 2;
      reasons.push(`Achievement categories align with scholarship tags: ${tagMatches.join(', ')}`);
    }

    // Requirements keyword presence
    const requirements: string[] = Array.isArray(s.requirements) ? s.requirements.map((r: any) => String(r).toLowerCase()) : [];
    const reqMatches = requirements.filter(r => achievementText.includes(r));
    if (reqMatches.length > 0) {
      score += 2;
      reasons.push(`Your achievements mention requirements: ${reqMatches.join(', ')}`);
    }

    // Deadline proximity
    const deadline = toDate(s.deadline);
    if (deadline) {
      const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft <= 30) {
        score += 1;
        reasons.push(`Upcoming deadline in ${daysLeft} days`);
      } else if (daysLeft <= 0) {
        reasons.push("Deadline has passed");
      }
    }

    // Amount consideration
    if (typeof s.amount === 'number' && s.amount >= 1000) {
      score += 1;
      reasons.push(`Competitive award amount: $${s.amount}`);
    }

    const match_score = score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';
    const match_reason = reasons.join('; ');

    return {
      ...s,
      match_score,
      match_reason,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read optional refresh flag from request body
    let refresh = false;
    try {
      const body = await req.json();
      refresh = Boolean(body?.refresh);
    } catch {
      // no body provided
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Refresh cadence & cache lookup (6 hours TTL)
    const { data: cachedRows } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'scholarship_matches')
      .order('created_at', { ascending: false })
      .limit(1);

    const cached = cachedRows && cachedRows[0];
    const isFresh = cached?.created_at
      ? (Date.now() - new Date(cached.created_at).getTime()) < (6 * 60 * 60 * 1000)
      : false;

    if (!refresh && cached && isFresh) {
      return new Response(JSON.stringify({ matches: cached.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Create context for AI matching with detailed reasoning requirements
    const userContext = `
Student Profile:
- Grade Level: ${profile?.grade_level || 'Not specified'}
- Achievements: ${achievements?.length || 0} total
- Categories: ${[...new Set(achievements?.map((a: any) => a.category))].join(', ') || 'None'}

Available Scholarships:
${scholarships.map((s: any) => `
- ${s.title} (${s.organization})
  Amount: $${s.amount || 'Varies'}
  Deadline: ${s.deadline}
  Grade Levels: ${s.grade_levels?.join(', ') || 'All'}
  Requirements: ${s.requirements?.join(', ') || 'See application'}
  Tags: ${s.tags?.join(', ') || 'None'}
`).join('\n')}
    `;

    // Try AI-based matching with structured tool output for detailed reasons
    let matches: any[] = [];
    try {
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
              content: 'You are a scholarship matching expert. Analyze the student profile and rank scholarships by match quality (high/medium/low). Provide DETAILED reasons referencing grade level fit, achievement categories, requirement alignment, tags/keywords, and deadline proximity. Output scholarship_title, match_score, reason.'
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
              description: 'Rank scholarships with detailed reasons for the student',
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
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      const aiMatches = toolCall ? JSON.parse(toolCall.function.arguments).matches : [];

      // Combine AI matches with scholarship data
      matches = aiMatches.map((match: any) => {
        const scholarship = scholarships.find((s: any) => s.title === match.scholarship_title);
        if (!scholarship) return null;
        return {
          ...scholarship,
          match_score: match.match_score,
          match_reason: match.reason
        };
      }).filter(Boolean);

      // If AI returns empty, fall back to heuristic
      if (!matches || matches.length === 0) {
        matches = computeHeuristicMatches(scholarships, profile, achievements);
      }
    } catch (aiError) {
      console.warn('AI matching failed, using heuristic:', aiError);
      matches = computeHeuristicMatches(scholarships, profile, achievements);
    }

    // Cache response
    await supabase
      .from('ai_response_cache')
      .insert({ user_id: user.id, type: 'scholarship_matches', data: matches });

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