/**
 * Roles, and the one distinction the whole security model rests on: the office
 * (owner, dispatcher, accounting) works inside a company, a driver only ever
 * sees its own work.
 *
 * Pure: no database, no network, no clock.
 */
export const ROLES = ['owner', 'dispatcher', 'accounting', 'driver'] as const;

export type Role = (typeof ROLES)[number];

export const OFFICE_ROLES = ['owner', 'dispatcher', 'accounting'] as const satisfies readonly Role[];

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  dispatcher: 'Dispatcher',
  accounting: 'Accounting',
  driver: 'Driver',
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** The office app is for these three; drivers use the driver app. */
export function isOfficeRole(role: Role): boolean {
  return (OFFICE_ROLES as readonly Role[]).includes(role);
}

/** Who may invite people and change their roles. */
export function canManageTeam(role: Role): boolean {
  return role === 'owner';
}

/** Who may invite someone with a given role. Only an owner creates owners. */
export function canInviteRole(actor: Role, invited: Role): boolean {
  return canManageTeam(actor) && (invited !== 'owner' || actor === 'owner');
}
