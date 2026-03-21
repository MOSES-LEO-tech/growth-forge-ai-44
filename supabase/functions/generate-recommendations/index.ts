import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Use service role to bypass RLS for data fetching
    )

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { type } = await req.json()
    const userId = user.id

    // Check for cached recommendations (last 24 hours)
    if (type !== 'all') {
      const { data: cached } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (cached) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            type,
            recommendations: cached.content,
            cached: true,
            generated_at: cached.created_at
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // Fetch User Context
    const [
      { data: profile },
      { data: achievements },
      { data: projects },
      { data: scholarships }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('achievements').select('title, description, date_earned').eq('user_id', userId).order('date_earned', { ascending: false }).limit(10),
      supabase.from('projects').select('title, description, tags, status').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
      supabase.from('scholarships').select('title, amount, deadline, requirements')
    ])

    if (!profile) {
      return new Response(JSON.stringify({ success: false, error: 'Profile incomplete' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const context = {
      full_name: profile.full_name || 'Anonymous',
      grade_level: profile.grade_level || 'Not set',
      gpa: profile.gpa || 'Not set',
      interests: (profile.interests || []).join(', '),
      extracurriculars: (profile.extracurriculars || []).join(', '),
      achievements: (achievements || []).map(a => `${a.title}: ${a.description}`).join('; '),
      achievement_count: (achievements || []).length,
      projects: (projects || []).map(p => `${p.title} (${(p.tags || []).join(', ')}): ${p.description}`).join('; '),
      project_count: (projects || []).length,
      scholarships_list: (scholarships || []).map(s => `${s.title} (Amount: ${s.amount}, Deadline: ${s.deadline}): ${s.requirements}`).join('\n'),
      upcoming_deadlines: (scholarships || [])
        .filter(s => s.deadline && new Date(s.deadline) > new Date())
        .map(s => `${s.title}: ${s.deadline}`).join(', ')
    }

    const callClaude = async (prompt: string) => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022', // Updated to actual latest haiku model
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        console.error('Claude API error:', err)
        throw new Error('AI service unavailable')
      }

      const result = await response.json()
      const content = result.content[0].text
      
      // Clean potential markdown code blocks
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
      return JSON.parse(jsonStr)
    }

    const prompts = {
      scholarship: `You are an academic advisor for GrowthForge AI, a student portfolio platform. 
Analyse this student's profile and recommend the most suitable scholarships.

Student Profile:
- Name: ${context.full_name}
- Grade Level: ${context.grade_level}
- GPA: ${context.gpa}
- Interests: ${context.interests}
- Extracurriculars: ${context.extracurriculars}
- Recent Achievements: ${context.achievements}
- Recent Projects: ${context.projects}

Available Scholarships:
${context.scholarships_list}

Return a JSON array of exactly 3 scholarship recommendations. Each item:
{
  "scholarship_title": "string",
  "match_score": number between 0-100,
  "reason": "2-3 sentence explanation of why this matches the student",
  "action": "specific thing the student should do to strengthen their application"
}

Return ONLY the JSON array, no other text.`,

      profile: `You are an academic advisor for GrowthForge AI. 
Analyse this student's profile completeness and suggest improvements.

Student Profile:
- Name: ${context.full_name}
- Grade Level: ${context.grade_level}   
- GPA: ${context.gpa}
- Interests: ${context.interests}
- Extracurriculars: ${context.extracurriculars}
- Number of Achievements: ${context.achievement_count}
- Number of Projects: ${context.project_count}

Return a JSON object:
{
  "completeness_score": number between 0-100,
  "missing_fields": ["list of profile fields that are empty or weak"],
  "suggestions": [
    {
      "area": "string (e.g. Projects, Achievements, Bio)",
      "suggestion": "specific actionable advice in 1-2 sentences",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Return ONLY the JSON object, no other text.`,

      actions: `You are an academic advisor for GrowthForge AI. 
Based on this student's current profile, suggest their top 5 priority action items to improve their scholarship chances.

Student Profile:
- Grade Level: ${context.grade_level} 
- GPA: ${context.gpa}
- Interests: ${context.interests}
- Achievements count: ${context.achievement_count}
- Projects count: ${context.project_count}
- Upcoming scholarship deadlines: ${context.upcoming_deadlines}

Return a JSON array of exactly 5 action items:
{
  "action": "clear specific action in one sentence",
  "category": "Scholarship" | "Profile" | "Achievement" | "Project",
  "urgency": "high" | "medium" | "low",
  "deadline_related": boolean
}

Return ONLY the JSON array, no other text.`
    }

    let finalRecommendations: any = {}

    if (type === 'all') {
      const results = await Promise.all([
        callClaude(prompts.scholarship),
        callClaude(prompts.profile),
        callClaude(prompts.actions)
      ])
      
      finalRecommendations = {
        scholarship: results[0],
        profile: results[1],
        actions: results[2]
      }

      // Save all three
      await Promise.all([
        supabase.from('recommendations').delete().eq('user_id', userId).eq('type', 'scholarship'),
        supabase.from('recommendations').delete().eq('user_id', userId).eq('type', 'profile'),
        supabase.from('recommendations').delete().eq('user_id', userId).eq('type', 'actions')
      ])

      await supabase.from('recommendations').insert([
        { user_id: userId, type: 'scholarship', content: results[0] },
        { user_id: userId, type: 'profile', content: results[1] },
        { user_id: userId, type: 'actions', content: results[2] }
      ])
    } else {
      finalRecommendations = await callClaude(prompts[type as keyof typeof prompts])
      
      // Clear old and save new
      await supabase.from('recommendations').delete().eq('user_id', userId).eq('type', type)
      await supabase.from('recommendations').insert({
        user_id: userId,
        type,
        content: finalRecommendations
      })
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        type,
        recommendations: finalRecommendations,
        cached: false,
        generated_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'AI service unavailable' ? 500 : 400,
    })
  }
})
