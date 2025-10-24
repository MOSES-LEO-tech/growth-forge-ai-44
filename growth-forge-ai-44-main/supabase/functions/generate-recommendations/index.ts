import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth: get user from JWT
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Optional refresh flag and cache lookup (6-hour TTL)
    let refresh = false;
    try {
      const body = await req.json();
      refresh = Boolean(body?.refresh);
    } catch {
      // no body provided
    }

    const { data: cachedRows } = await supabase
      .from("ai_response_cache")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "recommendations")
      .order("created_at", { ascending: false })
      .limit(1);

    const cached = cachedRows && cachedRows[0];
    const isFresh = cached?.created_at
      ? (Date.now() - new Date(cached.created_at).getTime()) < (6 * 60 * 60 * 1000)
      : false;

    if (!refresh && cached && isFresh) {
      return new Response(
        JSON.stringify({ recommendations: cached.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch profile and recent achievements for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, grade_level, major_interest")
      .eq("id", user.id)
      .single();

    const { data: achievements } = await supabase
      .from("achievements")
      .select("title, description, category, date_earned")
      .eq("user_id", user.id)
      .order("date_earned", { ascending: false })
      .limit(20);

    const categories = [...new Set((achievements || []).map((a: any) => a.category))];

    const userContext = `
Student Profile:
- Role: ${profile?.role ?? "student"}
- Grade Level: ${profile?.grade_level ?? "Not specified"}
- Major Interest: ${profile?.major_interest ?? "Not specified"}
- Achievements (${achievements?.length ?? 0}): ${categories.join(", ") || "None"}

Recent Achievements Detail:
${(achievements || [])
  .map((a: any) => `- ${a.title} [${a.category}] - ${a.description}`)
  .join("\n")}
`;

    // Call Lovable AI to generate structured recommendations
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an academic mentor. Generate actionable recommendations tailored to the student's profile and achievements. Categories must be one of: project, skill, activity. Provide clear, concise titles and descriptions. Prioritize based on impact: high, medium, low.",
          },
          {
            role: "user",
            content: userContext,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description:
                "Return 5-8 recommendations with title, description, category (project|skill|activity), and priority (high|medium|low).",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["project", "skill", "activity"],
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["title", "description", "category", "priority"],
                    },
                    minItems: 5,
                    maxItems: 8,
                  },
                },
                required: ["recommendations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const recommendations = toolCall
      ? JSON.parse(toolCall.function.arguments).recommendations
      : [];

    // Cache response
    await supabase
      .from("ai_response_cache")
      .insert({ user_id: user.id, type: "recommendations", data: recommendations });

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in generate-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});