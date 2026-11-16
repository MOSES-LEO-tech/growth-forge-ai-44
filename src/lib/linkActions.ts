import { reinviteAvailableAt, type LinkLike } from '@/lib/linkPresentation';

/**
 * Actions the UI may offer for a link.
 *
 * These must stay identical to the guards inside the W5 RPCs — if the UI offers
 * an action the database rejects, the user gets an error for doing what the
 * screen told them to do.
 */
export type LinkAction = 'accept' | 'decline' | 'revoke' | 'cancel' | 'reinvite';

export interface LinkActionMeta {
  label: string;
  destructive: boolean;
  /** Sentence shown in the confirmation dialog. */
  confirmText: string;
}

const META: Record<LinkAction, LinkActionMeta> = {
  accept: {
    label: 'Accept',
    destructive: false,
    confirmText: 'Accept this link? The other person will be able to see the information this link grants.',
  },
  decline: {
    label: 'Decline',
    destructive: true,
    confirmText: 'Decline this request? They will be able to ask again after 24 hours.',
  },
  revoke: {
    label: 'Disconnect',
    destructive: true,
    confirmText: 'Disconnect? Access ends immediately. This cannot be undone.',
  },
  cancel: {
    label: 'Cancel request',
    destructive: true,
    confirmText: 'Cancel this request? The other person will not see it.',
  },
  reinvite: {
    label: 'Send again',
    destructive: false,
    confirmText: 'Send the request again?',
  },
};

export function describeAction(action: LinkAction): LinkActionMeta {
  return META[action];
}

/** Which RPC performs the action. `cancel` is a decline made by the initiator. */
export function rpcForAction(action: LinkAction): string {
  switch (action) {
    case 'accept':
      return 'accept_parent_link';
    case 'decline':
    case 'cancel':
      return 'decline_parent_link';
    case 'revoke':
      return 'revoke_parent_link';
    case 'reinvite':
      // A re-invite is a fresh request addressed to a person, not a transition on
      // an existing link — it needs the counterparty email. See reinviteTarget().
      throw new Error("Use reinviteTarget() for 'reinvite': it needs the counterparty email.");
  }
}

export interface ReinviteContext {
  direction: "child" | "parent";
  counterparty_email: string | null;
}

export interface ReinviteTarget {
  rpc: "request_parent_link" | "invite_parent_link";
  email: string;
  /** The RPC argument name, so callers cannot pass the wrong key. */
  emailParam: "p_student_email" | "p_parent_email";
}

/**
 * Where a re-invite must be sent.
 *
 * `direction` is written from the viewer's side: "child" means the counterparty
 * is my child (I am the parent), so the parent-request RPC applies; "parent"
 * means the counterparty is my parent, so the student-invite RPC applies.
 *
 * The previous implementation sent `p_parent_email: undefined`, which the
 * database rejected for every user who pressed "Send again".
 */
export function reinviteTarget(row: ReinviteContext): ReinviteTarget | null {
  const email = row.counterparty_email?.trim();
  if (!email) return null;

  return row.direction === "child"
    ? { rpc: "request_parent_link", email, emailParam: "p_student_email" }
    : { rpc: "invite_parent_link", email, emailParam: "p_parent_email" };
}

/**
 * Ordered list of actions available to the viewer right now.
 * Empty means the row is informational only.
 */
export function availableActions(link: LinkLike, now: Date = new Date()): LinkAction[] {
  const open = link.state === 'invited' || link.state === 'pending';
  const actions: LinkAction[] = [];

  if (open && !link.initiated_by_me) actions.push('accept');
  if (open && link.initiated_by_me) actions.push('cancel');
  if (link.state === 'active') actions.push('revoke');

  const terminalNegative = link.state === 'declined' || link.state === 'revoked';
  if (terminalNegative && reinviteAvailableAt(link, now) === null) actions.push('reinvite');

  return actions;
}
