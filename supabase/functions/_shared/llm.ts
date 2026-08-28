// Shared LLM client for Supabase Edge Functions.
//
// Reads provider/model from the runtime `llm_config` table and routes
// completion calls through the matching OpenAI-compatible endpoint.
// All provider keys come from `Deno.env.get` — never from source or the DB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type SupabaseClient = ReturnType<typeof createClient>;

export type LlmConfig = {
  key: string;
  provider: "openrouter" | "lovable" | "anthropic";
  model: string;
  enabled: boolean;
  web_search_enabled: boolean;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type LlmToolCall = {
  id?: string;
  name: string;
  arguments: string;
};

export type ChatCompletionResult = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  model: string;
  toolCalls?: LlmToolCall[];
};

export class LlmError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.code = String(status);
  }
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  lovable: "https://ai.gateway.lovable.dev/v1",
};

/** Fetch a single config row. Functions are short-lived so no caching is needed. */
export async function getLlmConfig(key: string, supabase: SupabaseClient): Promise<LlmConfig> {
  const { data, error } = await supabase
    .from("llm_config")
    .select("key, provider, model, enabled, web_search_enabled")
    .eq("key", key)
    .single();

  if (error || !data) {
    throw new LlmError(500, `LLM config '${key}' not found`);
  }
  if (!data.enabled) {
    throw new LlmError(500, `LLM feature '${key}' is disabled`);
  }

  return {
    key: data.key,
    provider: data.provider,
    model: data.model,
    enabled: data.enabled,
    web_search_enabled: data.web_search_enabled,
  };
}

/** Extract plain text from content that may be a string or an array of parts. */
const extractContent = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
};

/** OpenAI-compatible chat completion routed by the runtime config. */
export async function chatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  opts?: {
    tools?: LlmTool[];
    toolChoice?: { type: "function"; function: { name: string } };
    maxTokens?: number;
  },
): Promise<ChatCompletionResult> {
  const baseUrl = PROVIDER_BASE_URLS[config.provider];
  if (!baseUrl) throw new LlmError(500, `Unsupported LLM provider: ${config.provider}`);

  const apiKey = Deno.env.get(`${config.provider.toUpperCase()}_API_KEY`);
  if (!apiKey) {
    throw new LlmError(500, `${config.provider.toUpperCase()}_API_KEY is not configured`);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://milestone.growthforge.app";
    headers["X-Title"] = "Milestone";
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: false,
  };
  if (opts?.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.toolChoice ?? "auto";
  }
  if (opts?.maxTokens) body.max_tokens = opts.maxTokens;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    let message = "AI service unavailable";
    if (response.status === 401 || response.status === 403) {
      message = "AI provider authentication failed";
    } else if (response.status === 402) {
      message = "AI provider requires payment";
    } else if (response.status === 429) {
      message = "AI is busy right now — please try again shortly.";
    }
    console.error(`LLM error [${config.provider}]`, response.status, raw.slice(0, 500));
    throw new LlmError(response.status, message);
  }

  const choice = parsed?.choices?.[0]?.message;
  const content =
    extractContent(choice?.content) ||
    extractContent(parsed?.choices?.[0]?.delta?.content) ||
    extractContent(parsed?.output_text) ||
    extractContent(parsed?.candidates?.[0]?.content?.parts);

  const toolCalls: LlmToolCall[] | undefined = Array.isArray(choice?.tool_calls)
    ? choice.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name ?? "",
        arguments: tc.function?.arguments ?? "",
      }))
    : undefined;

  const promptTokens = Number(parsed?.usage?.prompt_tokens ?? 0);
  const completionTokens = Number(parsed?.usage?.completion_tokens ?? 0);
  const totalTokens = Number(parsed?.usage?.total_tokens ?? promptTokens + completionTokens);

  return {
    content,
    promptTokens,
    completionTokens,
    totalTokens,
    provider: config.provider,
    model: config.model,
    toolCalls,
  };
}

/** Rough token estimate (chars/4) used when a provider doesn't return usage. */
export const estimateTokens = (messages: ChatMessage[], completion: string) => {
  const promptChars = messages.reduce((total, message) => total + message.content.length, 0);
  const completionChars = completion.length;
  const prompt_tokens = Math.ceil(promptChars / 4);
  const completion_tokens = Math.ceil(completionChars / 4);
  return { prompt_tokens, completion_tokens, total_tokens: prompt_tokens + completion_tokens };
};
