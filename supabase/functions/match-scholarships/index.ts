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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Matching scholarships for user ${user.id}`);

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

    // Create context for AI matching (sanitized and length-limited)
    const userContext = `
Student Profile:
- Grade Level: ${(profile?.grade_level || 'Not specified').substring(0, 50)}
- Achievements: ${achievements?.length || 0} total
- Categories: ${[...new Set(achievements?.map(a => a.category))].join(', ').substring(0, 200) || 'None'}

Available Scholarships (${scholarships.length}):
${scholarships.slice(0, 20).map(s => `
- ${s.title.substring(0, 100)} (${(s.organization || '').substring(0, 100)})
  Amount: $${s.amount || 'Varies'}
  Deadline: ${s.deadline}
  Grade Levels: ${s.grade_levels?.join(', ').substring(0, 100) || 'All'}
  Requirements: ${s.requirements?.join(', ').substring(0, 200) || 'See application'}
`).join('\n')}
    `.substring(0, 5000); // Limit total context size

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
      return new Response(JSON.stringify({ error: 'Failed to match scholarships' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    console.log(`Found ${matches.length} scholarship matches for user ${user.id}`);

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in match-scholarships:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while matching scholarships' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});