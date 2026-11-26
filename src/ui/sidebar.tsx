'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navSectionsFor, SETTINGS_SECTION, sectionForPath } from '@/domain/navigation';
import { type Role, roleLabel } from '@/domain/roles';
import { cn } from './cn';
import { NAV_ICONS } from './icons';

/**
 * The left menu. Chrome recedes: labels at text-secondary, icons at
 * text-muted, and only the section you are in lifts onto a surface with its
 * icon in amber. Nothing here competes with the content.
 *
 * Only the sections this role may see are rendered — never greyed out
 * (docs/spec/screens.md, "Who sees what"). At phone width it becomes a row
 * above the content that scrolls sideways.
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
  const sections = navSectionsFor(role);

  return (
    <nav
      aria-label="Sections"
      className="flex shrink-0 flex-col gap-4 border-b border-border px-3 py-4 md:sticky md:top-0 md:h-screen md:w-[228px] md:border-r md:border-b-0"
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <Link href="/today" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-body-strong">TruckMates</span>
        </Link>
        <span className="truncate text-label text-text-muted md:hidden">{companyName}</span>
      </div>

      <ul
        data-testid="nav-sections"
        className="flex gap-1 overflow-x-auto md:flex-col md:space-y-0.5 md:overflow-x-visible"
      >
        {sections.map((section) => (
          <li key={section.key} className="shrink-0 md:shrink">
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

      <ul data-testid="nav-settings" className="flex md:flex-col md:border-t md:border-border md:pt-3">
        <li className="shrink-0">
          <NavItem
            href={SETTINGS_SECTION.href}
            label={SETTINGS_SECTION.label}
            icon={SETTINGS_SECTION.icon}
            active={active === 'settings'}
          />
        </li>
      </ul>

      <div className="mt-auto hidden px-2 md:block">
        <p className="truncate text-body text-text-secondary">{companyName}</p>
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
        'row flex items-center gap-2.5 px-2 py-[7px] text-body',
        active ? 'bg-surface-raised text-text' : 'text-text-secondary',
      )}
    >
      {Icon && (
        <Icon
          size={15}
          strokeWidth={1.75}
          aria-hidden
          className={active ? 'text-primary' : 'text-text-muted'}
        />
      )}
      <span>{label}</span>
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
