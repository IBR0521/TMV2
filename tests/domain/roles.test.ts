import { describe, expect, it } from 'vitest';
import { canInviteRole, canManageTeam, isOfficeRole, isRole, roleLabel } from '@/domain/roles';

describe('roles', () => {
  it('separates the office from the driver', () => {
    expect(isOfficeRole('owner')).toBe(true);
    expect(isOfficeRole('dispatcher')).toBe(true);
    expect(isOfficeRole('accounting')).toBe(true);
    expect(isOfficeRole('driver')).toBe(false);
  });

  it('lets only the owner manage the team', () => {
    expect(canManageTeam('owner')).toBe(true);
    expect(canManageTeam('dispatcher')).toBe(false);
    expect(canManageTeam('accounting')).toBe(false);
    expect(canInviteRole('owner', 'dispatcher')).toBe(true);
    expect(canInviteRole('accounting', 'driver')).toBe(false);
  });

  it('knows what is a role and what is not', () => {
    expect(isRole('dispatcher')).toBe(true);
    expect(isRole('admin')).toBe(false);
    expect(roleLabel('accounting')).toBe('Accounting');
  });
});
