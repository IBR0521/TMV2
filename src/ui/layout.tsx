import type { ReactNode } from "react";
import { cn } from "./cn";
import { IconSearch } from "./icons";
import { UiLink } from "./link";
import { menuFor, ROLE_LABEL, type NavKey, type Role } from "./navigation";
import { Wordmark } from "./wordmark";

/** The office app frame: sidebar + content. Every office page renders inside it. */
export function AppShell({
  role,
  active,
  companyName,
  todayCount,
  planLabel,
  children,
}: {
  role: Exclude<Role, "driver">;
  active: NavKey;
  companyName: string;
  todayCount?: number;
  /** Shown under the role: "Trial · 14 days left". */
  planLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-text font-sans text-14 flex flex-wrap">
      <Sidebar role={role} active={active} companyName={companyName} todayCount={todayCount} planLabel={planLabel} />
      <main className="flex-[999_1_560px] min-w-0 px-9 pt-7 pb-12 box-border flex flex-col gap-6">{children}</main>
    </div>
  );
}

export function Sidebar({
  role,
  active,
  companyName,
  todayCount,
  planLabel,
}: {
  role: Exclude<Role, "driver">;
  active: NavKey;
  companyName: string;
  todayCount?: number;
  planLabel?: string;
}) {
  const items = menuFor(role);
  return (
    <nav aria-label="Main" className="flex-[1_1_220px] box-border bg-surface border-r border-border px-3 py-5 flex flex-col gap-0.5">
      <Wordmark className="px-2.5 pt-0.5 pb-5.5" />
      {items.map((item) => {
        const isActive = item.key === active;
        const Icon = item.icon;
        return (
          <UiLink
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md",
              isActive ? "bg-selected text-text font-medium" : "text-text-secondary hover:text-text",
              item.key === "settings" && "mt-3.5",
            )}
          >
            <Icon className={isActive ? "text-link" : undefined} />
            <span className="flex-1">{item.label}</span>
            {item.key === "today" && todayCount ? <span className="text-12 text-link">{todayCount}</span> : null}
          </UiLink>
        );
      })}
      <div className="mt-auto pt-4 px-2.5 border-t border-border text-13">
        <div>{companyName}</div>
        <div className="text-text-muted">{planLabel ? `${ROLE_LABEL[role]} · ${planLabel}` : ROLE_LABEL[role]}</div>
      </div>
    </nav>
  );
}

/** Page header: title + subline on the left, search and actions on the right. Put the ONE primary button last. */
export function PageHeader({
  title,
  subtitle,
  status,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** A StatusChip shown next to the title (detail pages). */
  status?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex-[1_1_240px] min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-24 font-semibold">{title}</h1>
          {status}
        </div>
        {subtitle ? <div className="text-text-muted mt-1">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <div className="text-13 text-text-muted">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 ? " / " : null}
          {it.href ? <UiLink href={it.href} className="text-link">{it.label}</UiLink> : it.label}
        </span>
      ))}
    </div>
  );
}

export function SearchField({ placeholder = "Search loads, drivers, invoices" }: { placeholder?: string }) {
  return (
    <label className="flex-[0_1_320px] flex items-center gap-2 h-9.5 px-3 border border-border-input rounded-md bg-surface">
      <IconSearch size={15} className="text-text-muted" />
      <input
        aria-label="Search"
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-14 text-text placeholder:text-text-muted"
      />
    </label>
  );
}

/** Two columns that stack on narrow screens: a wide main column and a narrow side column. */
export function Columns({ children, gap = "lg" }: { children: ReactNode; gap?: "md" | "lg" }) {
  return <div className={cn("flex flex-wrap items-start", gap === "lg" ? "gap-6" : "gap-5")}>{children}</div>;
}
export function MainColumn({ children }: { children: ReactNode }) {
  return <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-5">{children}</div>;
}
export function SideColumn({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={cn("min-w-0 flex flex-col gap-5", narrow ? "flex-[1_1_260px]" : "flex-[1_1_300px]")}>{children}</div>;
}
