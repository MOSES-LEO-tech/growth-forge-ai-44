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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = user.id

    // Fetch User Context
    const [
      { data: profile },
      { data: projects },
      { data: scholarships }
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, bio, interests, gpa, grade_level, location').eq('id', userId).single(),
      supabase.from('projects').select('title').eq('user_id', userId).is('deleted_at', null),
      supabase.from('scholarships').select('id, title, requirements')
    ])

    if (!profile) {
      return new Response(JSON.stringify({ success: false, error: 'Profile not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const context = {
      full_name: profile.full_name || 'Not set',
      bio: profile.bio || 'Not set',
      interests: (profile.interests || []).join(', ') || 'Not set',
      gpa: profile.gpa || 'Not set',
      grade_level: profile.grade_level || 'Not set',
      location: profile.location || 'Not set',
      projects: (projects || []).map(p => p.title).join(', ') || 'None',
      project_count: (projects || []).length,
      available_scholarships: (scholarships || []).map(s => `ID: ${s.id}, Title: ${s.title}, Req: ${s.requirements}`).join('\n')
    }

    const prompt = `You are an AI career and academic advisor for Growth Forge AI.
Analyze the following student profile and available opportunities to provide structured recommendations.

Student Profile:
- Name: ${context.full_name}
- Bio: ${context.bio}
- Interests: ${context.interests}
- GPA: ${context.gpa}
- Grade Level: ${context.grade_level}
- Location: ${context.location}
- Projects: ${context.projects} (${context.project_count} projects total)

Available Scholarships:
${context.available_scholarships}

Return a JSON object with the following structure:
{
  "profile_completeness": number (0-100),
  "missing_profile_fields": ["field_name1", "field_name2"],
  "scholarship_matches": [
    {
      "scholarship_id": "string uuid",
      "title": "string",
      "match_score": number (0-100),
      "reason": "short explanation"
    }
  ],
  "action_items": [
    {
      "priority": "high" | "medium" | "low",
      "title": "string",
      "description": "string"
    }
  ]
}

Return ONLY the JSON object, no other text.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
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
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
    const recommendations = JSON.parse(jsonStr)

    // Optional: Cache recommendations in the database if a table exists
    // For now, just return them directly

    return new Response(JSON.stringify({
      success: true,
      data: recommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
