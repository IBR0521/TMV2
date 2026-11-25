import { describe, expect, it } from 'vitest';
import {
  NAV_SECTIONS,
  SETTINGS_SECTION,
  canSeeSection,
  navSectionsFor,
  sectionForPath,
} from '@/domain/navigation';

/**
 * docs/spec/screens.md, "Who sees what": the owner sees all 9 sections, a
 * dispatcher 5 and accounting 8. This is the count the phase 1 "done when"
 * list names, so it is pinned here as well as in the end-to-end test.
 */
describe('the office menu', () => {
  it('has the nine sections of the approved mockup, in order', () => {
    expect(NAV_SECTIONS.map((s) => s.key)).toEqual([
      'today',
      'loads',
      'dispatch',
      'billing',
      'driver-pay',
      'fleet',
      'costs',
      'customers',
      'reports',
    ]);
    expect(SETTINGS_SECTION.key).toBe('settings');
  });

  it('shows an owner all nine', () => {
    expect(navSectionsFor('owner')).toHaveLength(9);
  });

  it('shows a dispatcher exactly five', () => {
    expect(navSectionsFor('dispatcher').map((s) => s.key)).toEqual([
      'today',
      'loads',
      'dispatch',
      'fleet',
      'customers',
    ]);
  });

  it('shows accounting exactly eight', () => {
    const keys = navSectionsFor('accounting').map((s) => s.key);
    expect(keys).toHaveLength(8);
    expect(keys).not.toContain('dispatch');
  });

  it('gives a driver no office menu at all', () => {
    expect(navSectionsFor('driver')).toHaveLength(0);
  });

  it('keeps hidden sections unreachable, not greyed out', () => {
    expect(canSeeSection('dispatcher', 'billing')).toBe(false);
    expect(canSeeSection('accounting', 'dispatch')).toBe(false);
    expect(canSeeSection('owner', 'billing')).toBe(true);
    expect(canSeeSection('driver', 'today')).toBe(false);
    expect(canSeeSection('owner', 'nonsense')).toBe(false);
  });

  it('finds the section a path belongs to', () => {
    expect(sectionForPath('/loads')).toBe('loads');
    expect(sectionForPath('/loads/1041')).toBe('loads');
    expect(sectionForPath('/settings/team')).toBe('settings');
    expect(sectionForPath('/')).toBeNull();
    expect(sectionForPath('/nowhere')).toBeNull();
  });
});
