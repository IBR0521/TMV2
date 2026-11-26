'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/ui';
import { sectionForPath } from '@/nav';
import type { Role } from '@/domain/roles';

/**
 * The office frame.
 *
 * AppShell needs to know which section is active, which only the URL knows, so
 * this is the small client component the wiring guide asks for: it reads the
 * pathname and composes the kit's AppShell. No markup of its own.
 */
export function OfficeShell({
  role,
  companyName,
  todayCount,
  children,
}: {
  role: Exclude<Role, 'driver'>;
  companyName: string;
  todayCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      role={role}
      active={sectionForPath(pathname) ?? 'today'}
      companyName={companyName}
      todayCount={todayCount}
    >
      {children}
    </AppShell>
  );
}
