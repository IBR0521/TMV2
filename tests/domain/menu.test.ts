import { describe, expect, it } from 'vitest';
import { MENU_BY_ROLE, NAV_ITEMS, menuFor } from '@/ui/navigation';
import { OFFICE_PATHS, isOfficePath, sectionForPath } from '@/nav';

/**
 * docs/spec/screens.md, "Who sees what": the owner sees all 9 sections, a
 * dispatcher 5 and accounting 8, with Settings always shown and its contents
 * varying by role. The design kit owns the menu; this pins the counts the
 * phase 1 "done when" list names.
 */
describe('the office menu', () => {
  it('has the nine sections of the approved screen, in order, plus Settings', () => {
    expect(NAV_ITEMS.map((item) => item.key)).toEqual([
      'today',
      'loads',
      'dispatch',
      'billing',
      'pay',
      'fleet',
      'costs',
      'customers',
      'reports',
      'settings',
    ]);
  });

  it('shows an owner all nine and Settings', () => {
    expect(menuFor('owner')).toHaveLength(10);
  });

  it('shows a dispatcher exactly five and Settings', () => {
    expect(menuFor('dispatcher').map((item) => item.key)).toEqual([
      'today',
      'loads',
      'dispatch',
      'fleet',
      'customers',
      'settings',
    ]);
  });

  it('shows accounting exactly eight and Settings', () => {
    const keys = menuFor('accounting').map((item) => item.key);
    expect(keys).toHaveLength(9);
    expect(keys).not.toContain('dispatch');
  });

  it('keeps hidden sections out of a role menu entirely', () => {
    expect(MENU_BY_ROLE.dispatcher).not.toContain('billing');
    expect(MENU_BY_ROLE.accounting).not.toContain('dispatch');
  });
});

describe('office paths', () => {
  it('match the kit menu exactly, so the proxy and the sidebar agree', () => {
    expect([...OFFICE_PATHS].sort()).toEqual(NAV_ITEMS.map((item) => item.href).sort());
  });

  it('recognise a section and its children', () => {
    expect(isOfficePath('/loads')).toBe(true);
    expect(isOfficePath('/settings/team')).toBe(true);
    expect(isOfficePath('/login')).toBe(false);
    expect(sectionForPath('/loads/1041')).toBe('loads');
    expect(sectionForPath('/settings/team')).toBe('settings');
    expect(sectionForPath('/nowhere')).toBeNull();
  });
});
