export type LinkState = 'invited' | 'pending' | 'active' | 'declined' | 'expired' | 'revoked';

/** The shape `public.my_parent_links()` returns, reduced to what the UI needs. */
export interface LinkLike {
  state: LinkState;
  initiated_by_me: boolean;
  expires_at: string | null;
  updated_at: string;
}

export interface LinkActionability {
  canAccept: boolean;
  canRevoke: boolean;
  canCancel: boolean;
}

export interface LinkExpiry {
  state: 'none' | 'expiring' | 'expired';
  daysLeft?: number;
  label: string;
}

const LABELS: Record<LinkState, string> = {
  invited: 'Invitation sent',
  pending: 'Awaiting response',
  active: 'Connected',
  declined: 'Declined',
  expired: 'Expired',
  revoked: 'Disconnected',
};

const OPEN_STATES: readonly LinkState[] = ['invited', 'pending'];
const DAY_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = DAY_MS;

export function linkStatusLabel(state: LinkState): string {
  return LABELS[state] ?? 'Unknown';
}

/**
 * What the viewer may do with this link right now.
 * Mirrors the SQL guards: only the non-initiator accepts, only an active link
 * is revocable, and only the initiator may cancel an open request.
 */
export function linkActionability(link: LinkLike): LinkActionability {
  const open = OPEN_STATES.includes(link.state);
  return {
    canAccept: open && !link.initiated_by_me,
    canRevoke: link.state === 'active',
    canCancel: open && link.initiated_by_me,
  };
}

/** Expiry copy for an open link. Terminal and active links never expire. */
export function linkExpiry(link: LinkLike, now: Date = new Date()): LinkExpiry {
  if (!OPEN_STATES.includes(link.state) || !link.expires_at) {
    return { state: 'none', label: '' };
  }

  const remaining = new Date(link.expires_at).getTime() - now.getTime();
  if (!Number.isFinite(remaining)) return { state: 'none', label: '' };
  if (remaining <= 0) return { state: 'expired', label: 'Expired' };

  const daysLeft = Math.floor(remaining / DAY_MS);
  if (daysLeft === 0) return { state: 'expiring', daysLeft, label: 'Expires today' };
  if (daysLeft === 1) return { state: 'expiring', daysLeft, label: 'Expires in 1 day' };
  return { state: 'expiring', daysLeft, label: `Expires in ${daysLeft} days` };
}

/**
 * After a decline or revocation, re-inviting is blocked for 24h (the same window
 * `request_parent_link` enforces). Returns the moment it becomes possible, or
 * null when it already is.
 */
export function reinviteAvailableAt(link: LinkLike, now: Date = new Date()): Date | null {
  if (link.state !== 'declined' && link.state !== 'revoked') return null;
  const at = new Date(new Date(link.updated_at).getTime() + COOLDOWN_MS);
  if (!Number.isFinite(at.getTime())) return null;
  return at.getTime() > now.getTime() ? at : null;
}
