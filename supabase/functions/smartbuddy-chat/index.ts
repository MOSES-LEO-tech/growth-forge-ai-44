import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const GEMINI_25_FLASH_INPUT_PER_1M = 0.30;
const GEMINI_25_FLASH_OUTPUT_PER_1M = 2.50;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const personalityPrompts: Record<string, string> = {
  default:
    "You are SmartBuddy, a warm academic guidance assistant for students. Be friendly, practical, concise, and encouraging. Help with study planning, scholarship preparation, portfolio ideas, and school projects. Do not pretend to know private platform data.",
  "study-ninja":
    "You are Study Ninja, a focused productivity coach for students. Be concise, direct, encouraging, and action-oriented. Break work into steps and help users stay accountable.",
  "chill-mentor":
    "You are Chill Mentor, a calm academic companion. Acknowledge stress, answer thoughtfully, and help students make steady progress without pressure.",
  "hype-squad":
    "You are Hype Squad, an energetic student motivator. Be upbeat and celebratory while keeping the advice useful and not overwhelming.",
  "science-sage":
    "You are Science Sage, a curious analytical tutor. Explain concepts clearly, ask good questions, and encourage experimentation and critical thinking.",
  "creative-spark":
    "You are Creative Spark, an imaginative mentor. Help students brainstorm original ideas, structure creative projects, and build confidence.",
  "life-coach":
    "You are Life Coach, a supportive mentor for goals and habits. Ask clarifying questions when useful, then give concrete next steps.",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeMessage = (value: unknown) => String(value ?? "").trim().slice(0, 4000);

const normalizeHistory = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-8)
    .map((item) => {
      const role = item?.role === "assistant" ? "assistant" : "user";
      const content = safeMessage(item?.content);
      return content ? { role, content } : null;
    })
    .filter(Boolean) as ChatMessage[];
};

const estimateTokens = (messages: ChatMessage[], completion: string) => {
  const promptChars = messages.reduce((total, message) => total + message.content.length, 0);
  const completionChars = completion.length;
  const prompt_tokens = Math.ceil(promptChars / 4);
  const completion_tokens = Math.ceil(completionChars / 4);
  return { prompt_tokens, completion_tokens, total_tokens: prompt_tokens + completion_tokens };
};

const computeCost = (promptTokens: number, completionTokens: number) =>
  Number(
    ((promptTokens / 1_000_000) * GEMINI_25_FLASH_INPUT_PER_1M +
      (completionTokens / 1_000_000) * GEMINI_25_FLASH_OUTPUT_PER_1M).toFixed(6),
  );

const logUsage = async (
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    personality: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCostUsd: number;
    latencyMs: number;
    status: "success" | "error";
    errorCode?: string;
    costSource: string;
  },
) => {
  const { error } = await supabase.from("smartbuddy_usage").insert({
    user_id: input.userId,
    model: MODEL,
    provider: "lovable-ai-gateway",
    personality: input.personality,
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    total_tokens: input.totalTokens,
    total_cost_usd: input.totalCostUsd,
    latency_ms: input.latencyMs,
    status: input.status,
    error_code: input.errorCode ?? null,
    cost_source: input.costSource,
    metadata: {
      pricing: {
        input_per_1m_usd: GEMINI_25_FLASH_INPUT_PER_1M,
        output_per_1m_usd: GEMINI_25_FLASH_OUTPUT_PER_1M,
        source: "Google Gemini API standard pricing",
      },
    },
  });

  if (error) console.error("SmartBuddy telemetry insert failed", error);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let userId: string | null = null;
  let personality = "default";
  let providerMessages: ChatMessage[] = [];

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "SmartBuddy telemetry is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResponse({ error: "Sign in to use SmartBuddy." }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) return jsonResponse({ error: "Invalid session." }, 401);
    userId = userData.user.id;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const message = safeMessage(body.message ?? body.messages?.at?.(-1)?.content);
    personality = String(body.personality ?? "default").trim() || "default";
    if (!message) return jsonResponse({ error: "Message is required." }, 400);

    const history = normalizeHistory(body.history ?? body.messages);
    const systemPrompt = personalityPrompts[personality] ?? personalityPrompts.default;
    providerMessages = [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: providerMessages,
        stream: false,
      }),
    });

    const responseBody = await response.text();
    let parsed: any = null;
    try {
      parsed = responseBody ? JSON.parse(responseBody) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const errorCode = String(response.status);
      const fallback = estimateTokens(providerMessages, "");
      await logUsage(supabase, {
        userId,
        personality,
        promptTokens: parsed?.usage?.prompt_tokens ?? fallback.prompt_tokens,
        completionTokens: parsed?.usage?.completion_tokens ?? 0,
        totalTokens: parsed?.usage?.total_tokens ?? fallback.prompt_tokens,
        totalCostUsd: computeCost(parsed?.usage?.prompt_tokens ?? fallback.prompt_tokens, parsed?.usage?.completion_tokens ?? 0),
        latencyMs: Date.now() - startedAt,
        status: "error",
        errorCode,
        costSource: parsed?.usage ? "provider_usage" : "estimated_tokens",
      });

      if (response.status === 429) return jsonResponse({ error: "Rate limits exceeded, please try again later." }, 429);
      if (response.status === 402) return jsonResponse({ error: "Payment required, please add funds to your Lovable AI workspace." }, 402);
      console.error("AI gateway error:", response.status, responseBody);
      return jsonResponse({ error: "AI gateway error" }, 502);
    }

    const text =
      parsed?.choices?.[0]?.message?.content ??
      parsed?.choices?.[0]?.delta?.content ??
      parsed?.output_text ??
      parsed?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join("") ??
      "";

    if (!text) throw new Error("No response from assistant");

    const estimated = estimateTokens(providerMessages, text);
    const promptTokens = Number(parsed?.usage?.prompt_tokens ?? parsed?.usageMetadata?.promptTokenCount ?? estimated.prompt_tokens);
    const completionTokens = Number(
      parsed?.usage?.completion_tokens ?? parsed?.usageMetadata?.candidatesTokenCount ?? estimated.completion_tokens,
    );
    const totalTokens = Number(parsed?.usage?.total_tokens ?? parsed?.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens);
    const totalCostUsd = computeCost(promptTokens, completionTokens);
    const costSource = parsed?.usage || parsed?.usageMetadata ? "provider_usage" : "estimated_tokens";

    await logUsage(supabase, {
      userId,
      personality,
      promptTokens,
      completionTokens,
      totalTokens,
      totalCostUsd,
      latencyMs: Date.now() - startedAt,
      status: "success",
      costSource,
    });

    return jsonResponse({
      text,
      usage: {
        model: MODEL,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        total_cost_usd: totalCostUsd,
        cost_source: costSource,
      },
    });
  } catch (error) {
    console.error("SmartBuddy chat error:", error);

    if (userId) {
      const fallback = estimateTokens(providerMessages, "");
      await logUsage(supabase, {
        userId,
        personality,
        promptTokens: fallback.prompt_tokens,
        completionTokens: 0,
        totalTokens: fallback.total_tokens,
        totalCostUsd: computeCost(fallback.prompt_tokens, 0),
        latencyMs: Date.now() - startedAt,
        status: "error",
        errorCode: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        costSource: "estimated_tokens",
      });
    }

    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
