import { describe, expect, it } from 'vitest';
import {
  INVITATION_DAYS,
  invitationExpiresAt,
  invitationProblem,
  isInvitationUsable,
} from '@/domain/invitations';

const now = new Date('2026-11-25T12:00:00Z');

describe('invitations', () => {
  it('expires seven days after it is made', () => {
    expect(INVITATION_DAYS).toBe(7);
    expect(invitationExpiresAt(now).toISOString()).toBe('2026-12-02T12:00:00.000Z');
  });

  it('is usable only while pending and unexpired', () => {
    expect(isInvitationUsable({ status: 'pending', expiresAt: '2026-11-30T12:00:00Z' }, now)).toBe(true);
    expect(isInvitationUsable({ status: 'pending', expiresAt: '2026-11-20T12:00:00Z' }, now)).toBe(false);
    expect(isInvitationUsable({ status: 'accepted', expiresAt: '2026-11-30T12:00:00Z' }, now)).toBe(false);
    expect(isInvitationUsable({ status: 'revoked', expiresAt: '2026-11-30T12:00:00Z' }, now)).toBe(false);
  });

  it('says why it cannot be used', () => {
    expect(invitationProblem({ status: 'pending', expiresAt: '2026-11-30T12:00:00Z' }, now)).toBeNull();
    expect(invitationProblem({ status: 'accepted', expiresAt: '2026-11-30T12:00:00Z' }, now)).toMatch(
      /already been used/,
    );
    expect(invitationProblem({ status: 'revoked', expiresAt: '2026-11-30T12:00:00Z' }, now)).toMatch(
      /withdrawn/,
    );
    expect(invitationProblem({ status: 'pending', expiresAt: '2026-11-01T12:00:00Z' }, now)).toMatch(
      /expired/,
    );
  });
});
