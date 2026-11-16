import { describe, it, expect } from 'vitest';
import {
  linkStatusLabel,
  linkActionability,
  linkExpiry,
  reinviteAvailableAt,
  type LinkLike,
} from '@/lib/linkPresentation';

const NOW = new Date('2026-11-10T12:00:00.000Z');

const link = (over: Partial<LinkLike> = {}): LinkLike => ({
  state: 'pending',
  initiated_by_me: false,
  expires_at: '2026-11-13T12:00:00.000Z', // +3 days
  updated_at: '2026-11-10T09:00:00.000Z',
  ...over,
});

describe('linkStatusLabel', () => {
  it('names every state in plain language', () => {
    expect(linkStatusLabel('invited')).toBe('Invitation sent');
    expect(linkStatusLabel('pending')).toBe('Awaiting response');
    expect(linkStatusLabel('active')).toBe('Connected');
    expect(linkStatusLabel('declined')).toBe('Declined');
    expect(linkStatusLabel('expired')).toBe('Expired');
    expect(linkStatusLabel('revoked')).toBe('Disconnected');
  });
});

describe('linkActionability', () => {
  it('lets the non-initiator accept a pending link', () => {
    expect(linkActionability(link({ state: 'pending', initiated_by_me: false })).canAccept).toBe(true);
  });

  it('does not let the initiator accept their own request', () => {
    expect(linkActionability(link({ state: 'pending', initiated_by_me: true })).canAccept).toBe(false);
  });

  it('lets the initiator cancel while still open', () => {
    const a = linkActionability(link({ state: 'pending', initiated_by_me: true }));
    expect(a.canCancel).toBe(true);
    expect(a.canAccept).toBe(false);
  });

  it('allows revoke only while active', () => {
    expect(linkActionability(link({ state: 'active' })).canRevoke).toBe(true);
    expect(linkActionability(link({ state: 'pending' })).canRevoke).toBe(false);
  });

  it('allows neither accept nor revoke on terminal states', () => {
    for (const state of ['declined', 'expired', 'revoked'] as const) {
      const a = linkActionability(link({ state }));
      expect(a.canAccept).toBe(false);
      expect(a.canRevoke).toBe(false);
      expect(a.canCancel).toBe(false);
    }
  });
});

describe('linkExpiry', () => {
  it('reports nothing for an active link', () => {
    expect(linkExpiry(link({ state: 'active' }), NOW).state).toBe('none');
  });

  it('reports nothing when there is no expiry', () => {
    expect(linkExpiry(link({ expires_at: null }), NOW).state).toBe('none');
  });

  it('counts whole days remaining for an open link', () => {
    const e = linkExpiry(link({ state: 'pending' }), NOW);
    expect(e.state).toBe('expiring');
    expect(e.daysLeft).toBe(3);
    expect(e.label).toBe('Expires in 3 days');
  });

  it('uses singular day and "today" wording', () => {
    expect(linkExpiry(link({ expires_at: '2026-11-11T12:00:00.000Z' }), NOW).label).toBe('Expires in 1 day');
    expect(linkExpiry(link({ expires_at: '2026-11-10T18:00:00.000Z' }), NOW).label).toBe('Expires today');
  });

  it('reports an expired link once the timestamp passes', () => {
    const e = linkExpiry(link({ expires_at: '2026-11-09T12:00:00.000Z' }), NOW);
    expect(e.state).toBe('expired');
    expect(e.label).toBe('Expired');
  });
});

describe('reinviteAvailableAt', () => {
  it('is null for states that are not terminal-negative', () => {
    for (const state of ['invited', 'pending', 'active', 'expired'] as const) {
      expect(reinviteAvailableAt(link({ state }), NOW)).toBeNull();
    }
  });

  it('applies a 24h cooldown after a decline', () => {
    const at = reinviteAvailableAt(link({ state: 'declined', updated_at: '2026-11-10T09:00:00.000Z' }), NOW);
    expect(at?.toISOString()).toBe('2026-11-11T09:00:00.000Z');
  });

  it('treats an old decline as immediately re-invitable', () => {
    const at = reinviteAvailableAt(link({ state: 'declined', updated_at: '2026-11-01T09:00:00.000Z' }), NOW);
    expect(at).toBeNull();
  });
});
