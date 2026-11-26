'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navGroupsFor, SETTINGS_SECTION, sectionForPath } from '@/domain/navigation';
import { type Role, roleLabel } from '@/domain/roles';
import { cn } from './cn';
import { NAV_ICONS } from './icons';

/**
 * The left rail.
 *
 * Ten identical lines cannot be scanned, so the nine sections sit in groups —
 * Operations, Money, Records — with air between them and a quiet label on
 * each. Every section and its order from docs/spec/screens.md survives; what
 * changes is that the eye has somewhere to land.
 *
 * The chrome recedes: labels at text-secondary, icons at text-muted, and only
 * the section you are in lifts onto a surface with its icon in amber.
 */
export function Sidebar({
  role,
  companyName,
  planLabel,
  todayCount,
}: {
  role: Role;
  companyName: string;
  planLabel: string;
  todayCount: number;
}) {
  const pathname = usePathname();
  const active = sectionForPath(pathname);
  const groups = navGroupsFor(role);

  return (
    <nav
      aria-label="Sections"
      className="flex shrink-0 flex-col border-b border-border px-3 py-4 md:w-[232px] md:border-r md:border-b-0"
    >
      <div
        data-testid="nav-sections"
        className="flex gap-1 overflow-x-auto md:flex-col md:gap-0 md:overflow-x-visible"
      >
        {groups.map((group) => (
          <div key={group.group} className="contents md:block md:not-first:mt-6">
            {group.label && (
              <p className="hidden px-2.5 pb-2 text-label text-text-faint md:block">
                {group.label}
              </p>
            )}
            <ul className="contents md:block md:space-y-0.5">
              {group.sections.map((section) => (
                <li key={section.key} className="shrink-0">
                  <NavItem
                    href={section.href}
                    label={section.label}
                    icon={section.icon}
                    active={active === section.key}
                    count={section.key === 'today' ? todayCount : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div data-testid="nav-settings" className="md:mt-6">
        <NavItem
          href={SETTINGS_SECTION.href}
          label={SETTINGS_SECTION.label}
          icon={SETTINGS_SECTION.icon}
          active={active === 'settings'}
        />
      </div>

      <div className="mt-auto hidden px-2.5 pt-8 md:block">
        <p className="truncate text-label text-text-muted">{companyName}</p>
        <p className="text-label text-text-faint">
          {roleLabel(role)} · {planLabel}
        </p>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  count,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  count?: number;
}) {
  const Icon = NAV_ICONS[icon];

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'row flex items-center gap-3 px-2.5 py-2 text-body',
        active ? 'bg-surface-raised text-text' : 'text-text-secondary',
      )}
    >
      {Icon && (
        <Icon
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className={active ? 'text-primary' : 'text-text-muted'}
        />
      )}
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="nums ml-auto text-label text-text-muted">{count}</span>
      )}
    </Link>
  );
}

/** Two chevrons: a lane marking, not a letter in a box. */
export function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="shrink-0">
      <rect width="24" height="24" rx="6" fill="var(--color-primary)" />
      <path
        d="M6.4 7.4 11 12l-4.6 4.6M13.2 7.4 17.8 12l-4.6 4.6"
        fill="none"
        stroke="var(--color-on-primary)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
