import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return new Response('Unauthorized', { status: 401 })

  const { userId, type } = await req.json()

  // Placeholder — real AI logic will be added here later
  const recommendations = [
    { type, content: `Sample ${type} recommendation for user ${userId}`, created_at: new Date() }
  ]

  // Insert the recommendations into the database
  const { error: insertError } = await supabase
    .from('recommendations')
    .insert(recommendations.map(rec => ({
      user_id: userId,
      type: rec.type,
      content: { text: rec.content }
    })));

  if (insertError) {
    console.error('Error inserting recommendations:', insertError);
    return new Response(JSON.stringify({ success: false, error: insertError.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ success: true, data: { recommendations } }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
