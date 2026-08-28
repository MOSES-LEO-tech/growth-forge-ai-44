import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLlmConfig, chatCompletion, estimateTokens, LlmError } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const logUsage = async (
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    personality: string;
    model: string;
    provider: string;
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
    model: input.model,
    provider: input.provider,
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
        input_per_1m_usd: 0,
        output_per_1m_usd: 0,
        source: "openrouter-free-tier (rate-limited)",
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
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let userId: string | null = null;
  let personality = "default";
  let providerMessages: ChatMessage[] = [];
  let model = "unknown";
  let provider = "unknown";

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

    const body = await req.json();
    const message = safeMessage(body.message ?? body.messages?.at?.(-1)?.content);
    personality = String(body.personality ?? "default").trim() || "default";
    if (!message) return jsonResponse({ error: "Message is required." }, 400);

    const history = normalizeHistory(body.history ?? body.messages);
    const systemPrompt = personalityPrompts[personality] ?? personalityPrompts.default;
    providerMessages = [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }];

    const config = await getLlmConfig("chat", supabase);
    model = config.model;
    provider = config.provider;

    const result = await chatCompletion(config, providerMessages);

    if (!result.content) throw new Error("No response from assistant");

    const promptTokens = result.promptTokens || estimateTokens(providerMessages, result.content).prompt_tokens;
    const completionTokens = result.completionTokens || estimateTokens(providerMessages, result.content).completion_tokens;
    const totalTokens = result.totalTokens || promptTokens + completionTokens;
    const costSource = result.promptTokens ? "provider_usage" : "estimated_tokens";

    await logUsage(supabase, {
      userId,
      personality,
      model,
      provider,
      promptTokens,
      completionTokens,
      totalTokens,
      totalCostUsd: 0,
      latencyMs: Date.now() - startedAt,
      status: "success",
      costSource,
    });

    return jsonResponse({
      text: result.content,
      usage: {
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        total_cost_usd: 0,
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
        model,
        provider,
        promptTokens: fallback.prompt_tokens,
        completionTokens: 0,
        totalTokens: fallback.total_tokens,
        totalCostUsd: 0,
        latencyMs: Date.now() - startedAt,
        status: "error",
        errorCode: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        costSource: "estimated_tokens",
      });
    }

    if (error instanceof LlmError) {
      if (error.status === 429) return jsonResponse({ error: error.message }, 429);
      if (error.status === 401 || error.status === 403) return jsonResponse({ error: error.message }, 502);
      if (error.status === 402) return jsonResponse({ error: error.message }, 402);
      return jsonResponse({ error: error.message }, error.status >= 500 ? error.status : 502);
    }

    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
