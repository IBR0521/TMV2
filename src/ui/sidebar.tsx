'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navSectionsFor, SETTINGS_SECTION, sectionForPath } from '@/domain/navigation';
import { type Role, roleLabel } from '@/domain/roles';
import { cn } from './cn';
import { ICON_STROKE, NAV_ICONS } from './icons';

/**
 * The left menu from the approved mockup: 220px, surface fill, a hairline on
 * the right, the nine sections in order, a gap, then Settings.
 *
 * Only the sections this role may see are rendered — never greyed out
 * (docs/spec/screens.md, "Who sees what"). At phone width it stacks above the
 * content and the items scroll sideways.
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
      className="flex shrink-0 flex-col gap-4 border-b border-border bg-surface px-3 py-5 md:sticky md:top-0 md:h-screen md:w-[220px] md:border-r md:border-b-0"
    >
      <div className="flex items-center justify-between gap-3 px-2.5">
        <Link href="/today" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-primary text-[15px] font-semibold text-on-primary"
          >
            T
          </span>
          <span className="text-[16px] font-semibold">TruckMates</span>
        </Link>
        <span className="text-label text-text-muted md:hidden">{companyName}</span>
      </div>

      <ul data-testid="nav-sections" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-x-visible">
        {sections.map((section) => {
          const Icon = NAV_ICONS[section.icon];
          const isActive = active === section.key;
          return (
            <li key={section.key} className="shrink-0 md:shrink">
              <Link
                href={section.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-body',
                  isActive
                    ? 'bg-selected font-medium text-text'
                    : 'text-text-secondary hover:text-text',
                )}
              >
                {Icon && (
                  <Icon
                    size={16}
                    strokeWidth={ICON_STROKE}
                    className={isActive ? 'text-link' : undefined}
                    aria-hidden
                  />
                )}
                <span>{section.label}</span>
                {section.key === 'today' && todayCount > 0 && (
                  <span className="ml-auto text-label text-link">{todayCount}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <ul data-testid="nav-settings" className="flex md:mt-0 md:flex-col">
        <li className="shrink-0">
          <Link
            href={SETTINGS_SECTION.href}
            aria-current={active === 'settings' ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-body',
              active === 'settings'
                ? 'bg-selected font-medium text-text'
                : 'text-text-secondary hover:text-text',
            )}
          >
            {(() => {
              const Icon = NAV_ICONS[SETTINGS_SECTION.icon];
              return Icon ? (
                <Icon
                  size={16}
                  strokeWidth={ICON_STROKE}
                  className={active === 'settings' ? 'text-link' : undefined}
                  aria-hidden
                />
              ) : null;
            })()}
            <span>{SETTINGS_SECTION.label}</span>
          </Link>
        </li>
      </ul>

      <div className="mt-auto hidden border-t border-border px-2.5 pt-4 md:block">
        <p className="truncate text-body-strong">{companyName}</p>
        <p className="text-label text-text-muted">
          {roleLabel(role)} · {planLabel}
        </p>
      </div>
    </nav>
  );
}
