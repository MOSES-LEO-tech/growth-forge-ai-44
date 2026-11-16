import { supabase } from "@/integrations/supabase/client";

/**
 * Analytics helper.
 *
 * Two rules, enforced here and again in `public.track_event()`:
 *  1. an event is telemetry, not a data dump — primitives only, capped;
 *  2. no PII, ever — the key check is duplicated server-side because a client
 *     is not a trust boundary.
 */

export type EventProps = Record<string, unknown>;

const PII_KEYS = new Set(["email", "password", "token", "full_name", "phone"]);
const MAX_KEYS = 12;
const MAX_STRING = 120;

export function sanitizeEventProps(props: EventProps | null | undefined): EventProps {
  const out: EventProps = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (PII_KEYS.has(key.toLowerCase())) continue;
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      out[key] = value.slice(0, MAX_STRING);
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
    // objects and arrays are dropped: they are how payloads smuggle data in.
  }
  return out;
}

export function isValidEventName(name: string): boolean {
  return typeof name === "string" && /^[a-z0-9_]{3,64}$/.test(name);
}

/** Fire-and-forget: analytics must never break a user flow. */
export async function track(name: string, props: EventProps = {}): Promise<void> {
  if (!isValidEventName(name)) {
    if (import.meta.env.DEV) console.warn(`[analytics] rejected event name: ${name}`);
    return;
  }

  try {
    await supabase.rpc("track_event", { p_name: name, p_props: sanitizeEventProps(props) });
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[analytics] track failed", error);
  }
}

/** Onboarding funnel names, kept in one place so queries stay consistent. */
export const ONBOARDING_EVENTS = {
  started: "onboarding_started",
  stepViewed: "onboarding_step_viewed",
  stepCompleted: "onboarding_step_completed",
  abandoned: "onboarding_abandoned",
  completed: "onboarding_completed",
} as const;

export const LINK_EVENTS = {
  requested: "link_requested",
  accepted: "link_accepted",
  declined: "link_declined",
  revoked: "link_revoked",
} as const;
