import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getLlmConfig, chatCompletion, estimateTokens, LlmError } from '../_shared/llm.ts'
import { webSearch } from '../_shared/websearch.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    personality: 'recommendations',
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

  if (error) console.error('Recommendations telemetry insert failed', error)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = Date.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let userId: string | null = null
  let model = 'unknown'
  let provider = 'unknown'
  let promptTokens = 0
  let completionTokens = 0

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    userId = user.id

    // Fetch User Context
    const [
      { data: profile },
      { data: projects },
      { data: scholarships }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, bio, interests, extracurriculars, gpa, grade_level, class_name, age, subjects, clubs')
        .eq('id', userId)
        .single(),
      supabase
        .from('projects')
        .select('title')
        .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
        .is('deleted_at', null),
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
      extracurriculars: (profile.extracurriculars || []).join(', ') || 'Not set',
      gpa: profile.gpa || 'Not set',
      grade_level: profile.grade_level || 'Not set',
      class_name: profile.class_name || 'Not set',
      age: profile.age || 'Not set',
      subjects: (profile.subjects || []).join(', ') || 'Not set',
      clubs: (profile.clubs || []).join(', ') || 'Not set',
      projects: (projects || []).map(p => p.title).join(', ') || 'None',
      project_count: (projects || []).length,
      available_scholarships: (scholarships || []).map(s => `ID: ${s.id}, Title: ${s.title}, Req: ${s.requirements}`).join('\n')
    }

    const config = await getLlmConfig('recommendations', supabase)
    model = config.model
    provider = config.provider

    // Live web search (gracefully degrades to empty when key missing / API fails)
    let webFindingsSection = ''
    if (config.web_search_enabled) {
      const searchTopics = [
        context.interests !== 'Not set' ? context.interests : '',
        context.clubs !== 'Not set' ? context.clubs : '',
      ].filter(Boolean).join(' ')
      const query = `${searchTopics || 'student'} scholarships grants 2026`
      const { results } = await webSearch(query, 5)
      const trimmed = results
        .map(r => `- ${r.title} (${r.url}): ${r.content}`)
        .join('\n')
        .slice(0, 3000)
      if (trimmed) {
        webFindingsSection = `
Current Web Findings (from live search):
${trimmed}

Where relevant, ground your scholarship matches and action items in these web findings. Prefer scholarships that appear both in the available list above and in the web findings.
`
      }
    }

    const prompt = `You are an academic advisor for Milestone.
Analyze the following student profile and available opportunities to provide structured recommendations.

Student Profile:
- Name: ${context.full_name}
- Bio: ${context.bio}
- Interests: ${context.interests}
- Extracurriculars: ${context.extracurriculars}
- GPA: ${context.gpa}
- Grade Level: ${context.grade_level}
- Class / Homeroom: ${context.class_name}
- Age: ${context.age}
- Subjects: ${context.subjects}
- Clubs: ${context.clubs}
- Projects: ${context.projects} (${context.project_count} projects total)

Available Scholarships:
${context.available_scholarships}
${webFindingsSection}
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

    const result = await chatCompletion(config, [{ role: 'user', content: prompt }], { maxTokens: 1500 })

    promptTokens = result.promptTokens || estimateTokens([{ role: 'user', content: prompt }], result.content).prompt_tokens
    completionTokens = result.completionTokens || estimateTokens([{ role: 'user', content: prompt }], result.content).completion_tokens

    const jsonStr = result.content.replace(/```json\n?|\n?```/g, '').trim()
    const recommendations = JSON.parse(jsonStr)

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
    })

    return new Response(JSON.stringify({
      success: true,
      data: recommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Function error:', error)

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
      })
    }

    if (error instanceof LlmError) {
      const status = error.status === 429 ? 429 : error.status === 402 ? 402 : 502
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      })
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
