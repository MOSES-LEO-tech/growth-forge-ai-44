import { supabase } from "@/integrations/supabase/client";
import { reinviteTarget, rpcForAction, type LinkAction } from "@/lib/linkActions";
import type { LinkLike, LinkState } from "@/lib/linkPresentation";

/** Row shape returned by public.my_parent_links(). */
export interface ParentLinkRow extends LinkLike {
  link_id: string;
  direction: "child" | "parent";
  counterparty_id: string;
  counterparty_name: string | null;
  counterparty_email: string | null;
  reason: string | null;
}

type RawLinkRow = {
  link_id: string;
  direction: string;
  counterparty_id: string;
  counterparty_name: string | null;
  counterparty_email: string | null;
  state: string;
  initiated_by_me: boolean;
  reason: string | null;
  expires_at: string | null;
  updated_at: string;
};

/** Normalises the RPC payload; unknown states are dropped rather than guessed. */
export function mapLinkRows(rows: RawLinkRow[] | null | undefined): ParentLinkRow[] {
  const KNOWN: LinkState[] = ["invited", "pending", "active", "declined", "expired", "revoked"];
  return (rows ?? [])
    .filter((r) => KNOWN.includes(r.state as LinkState))
    .map((r) => ({
      link_id: r.link_id,
      direction: r.direction === "parent" ? "parent" : "child",
      counterparty_id: r.counterparty_id,
      counterparty_name: r.counterparty_name,
      counterparty_email: r.counterparty_email,
      state: r.state as LinkState,
      initiated_by_me: Boolean(r.initiated_by_me),
      reason: r.reason,
      expires_at: r.expires_at,
      updated_at: r.updated_at,
    }));
}

export async function listParentLinks(): Promise<ParentLinkRow[]> {
  const { data, error } = await supabase.rpc("my_parent_links");
  if (error) throw error;
  return mapLinkRows(data as RawLinkRow[]);
}

/** Parent → student. A minor's link activates immediately (guardian rule). */
export async function requestParentLink(studentEmail: string) {
  const { data, error } = await supabase.rpc("request_parent_link", { p_student_email: studentEmail.trim() });
  if (error) throw error;
  return data as { status: string; link_id?: string; minor_auto_activated?: boolean };
}

/** Student → parent. The parent must accept. */
export async function inviteParentLink(parentEmail: string) {
  const { data, error } = await supabase.rpc("invite_parent_link", { p_parent_email: parentEmail.trim() });
  if (error) throw error;
  return data as { status: string; link_id?: string };
}

/**
 * Dispatches to the RPC that performs this action.
 *
 * Re-invites are a new request, not a transition: they reuse the counterparty's
 * email (see reinviteTarget). Everything else acts on the link id.
 */
export async function runLinkAction(action: LinkAction, row: ParentLinkRow) {
  if (action === "reinvite") {
    const target = reinviteTarget(row);
    if (!target) {
      throw new Error("That account has no email on file, so the request cannot be sent again.");
    }
    const { error } = await supabase.rpc(target.rpc, { [target.emailParam]: target.email });
    if (error) throw error;
    return null;
  }

  const fn = rpcForAction(action);
  const { data, error } = await supabase.rpc(fn, { p_link_id: row.link_id });
  if (error) throw error;
  return data;
}

export interface PendingStudentRow {
  full_name: string;
  grade_level: string | null;
  requested_at: string;
  request_id: string;
}

/** Name + grade only — a pending connection is not consent to portfolio data (D2). */
export async function listPendingStudents(schoolId: string): Promise<PendingStudentRow[]> {
  const { data, error } = await supabase.rpc("school_pending_students", { p_school_id: schoolId });
  if (error) throw error;
  return (data ?? []) as PendingStudentRow[];
}
