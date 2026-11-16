import { describe, it, expect } from 'vitest';
import { availableActions, describeAction, reinviteTarget, rpcForAction, type LinkAction } from '@/lib/linkActions';
import type { LinkLike } from '@/lib/linkPresentation';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const link = (over: Partial<LinkLike> = {}): LinkLike => ({
  state: 'pending',
  initiated_by_me: false,
  expires_at: '2026-11-13T12:00:00.000Z',
  updated_at: '2026-11-10T09:00:00.000Z',
  ...over,
});

describe('availableActions', () => {
  it('offers accept to the non-initiator of an open link', () => {
    expect(availableActions(link({ state: 'pending', initiated_by_me: false }), NOW)).toEqual(['accept']);
  });

  it('offers cancel to the initiator of an open link', () => {
    expect(availableActions(link({ state: 'invited', initiated_by_me: true }), NOW)).toEqual(['cancel']);
  });

  it('offers revoke on an active link', () => {
    expect(availableActions(link({ state: 'active' }), NOW)).toEqual(['revoke']);
  });

  it('offers nothing on an expired link', () => {
    expect(availableActions(link({ state: 'expired', expires_at: '2026-11-09T12:00:00.000Z' }), NOW)).toEqual([]);
  });

  it('hides re-invite during the 24h cooldown', () => {
    const declined = link({ state: 'declined', updated_at: '2026-11-10T09:00:00.000Z' });
    expect(availableActions(declined, NOW)).toEqual([]);
  });

  it('offers re-invite once the cooldown has passed', () => {
    const declined = link({ state: 'declined', updated_at: '2026-11-01T09:00:00.000Z' });
    expect(availableActions(declined, NOW)).toEqual(['reinvite']);
  });

  it('never offers accept to the initiator', () => {
    expect(availableActions(link({ initiated_by_me: true }), NOW)).not.toContain('accept');
  });
});

describe('describeAction', () => {
  it('gives every action a label', () => {
    for (const a of ['accept', 'decline', 'revoke', 'cancel', 'reinvite'] as LinkAction[]) {
      expect(describeAction(a).label.length).toBeGreaterThan(0);
    }
  });

  it('marks only destructive actions destructive', () => {
    expect(describeAction('accept').destructive).toBe(false);
    expect(describeAction('decline').destructive).toBe(true);
    expect(describeAction('revoke').destructive).toBe(true);
    expect(describeAction('cancel').destructive).toBe(true);
    expect(describeAction('reinvite').destructive).toBe(false);
  });
});

describe('rpcForAction', () => {
  it('maps each action to the SQL function that performs it', () => {
    expect(rpcForAction('accept')).toBe('accept_parent_link');
    expect(rpcForAction('decline')).toBe('decline_parent_link');
    expect(rpcForAction('revoke')).toBe('revoke_parent_link');
    expect(rpcForAction('cancel')).toBe('decline_parent_link');
  });

  it('refuses to guess a re-invite RPC, which needs an email', () => {
    expect(() => rpcForAction('reinvite')).toThrow(/reinviteTarget/);
  });
});

describe('reinviteTarget', () => {
  it('re-requests a child through the parent-request RPC', () => {
    expect(reinviteTarget({ direction: 'child', counterparty_email: 'kid@example.com' })).toEqual({
      rpc: 'request_parent_link',
      email: 'kid@example.com',
      emailParam: 'p_student_email',
    });
  });

  it('re-invites a parent through the student-invite RPC', () => {
    expect(reinviteTarget({ direction: 'parent', counterparty_email: 'mum@example.com' })).toEqual({
      rpc: 'invite_parent_link',
      email: 'mum@example.com',
      emailParam: 'p_parent_email',
    });
  });

  it('trims surrounding whitespace from the stored email', () => {
    const target = reinviteTarget({ direction: 'child', counterparty_email: '  kid@example.com  ' });
    expect(target?.email).toBe('kid@example.com');
  });

  it('returns null when there is no email to send to', () => {
    expect(reinviteTarget({ direction: 'child', counterparty_email: null })).toBeNull();
    expect(reinviteTarget({ direction: 'parent', counterparty_email: '   ' })).toBeNull();
  });
});
