import type { ReactNode } from "react";
import { cn } from "./cn";
import { StatusChip } from "./data";
import { IconCamera, IconLoads, IconPay, IconUser } from "./icons";
import { UiLink } from "./link";

/**
 * Driver app pieces. Built for one thumb, a glance at a dock, and no signal.
 * Text is 15px; touch targets are at least 44px; the main action is Button size="xl" variant="primary".
 */
export function DriverScreen({ title, sync, children, tab }: {
  title: string;
  /** Pending outbox items; when offline or > 0 the badge shows. */
  sync?: { offline: boolean; waiting: number };
  tab: "loads" | "capture" | "pay" | "me";
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[430px] min-h-dvh box-border bg-bg text-text font-sans text-15 flex flex-col">
      <div className="flex justify-between items-center px-5 pt-5 pb-3">
        <div className="text-16 font-semibold">{title}</div>
        {sync && (sync.offline || sync.waiting > 0) ? (
          <StatusChip tone="warning" dot>
            {sync.offline ? "Offline" : "Syncing"}
            {sync.waiting > 0 ? ` · ${sync.waiting} waiting` : ""}
          </StatusChip>
        ) : null}
      </div>
      <div className="flex-1 px-5 pt-1 pb-4 flex flex-col gap-4">{children}</div>
      <DriverTabBar active={tab} />
    </div>
  );
}

export function DriverCaption({ children }: { children: ReactNode }) {
  return <div className="text-13 text-text-muted">{children}</div>;
}

export function DriverCard({ children, label, padded = true }: { children: ReactNode; label?: string; padded?: boolean }) {
  return (
    <section aria-label={label} className={cn("border border-border rounded-xl bg-surface", padded && "p-4.5")}>
      {children}
    </section>
  );
}

export function DriverKeyValue({ label, value, first }: { label: string; value: ReactNode; first?: boolean }) {
  return (
    <div className={cn("flex justify-between text-14", first ? "mt-4 pt-3.5 border-t border-border" : "mt-2.5")}>
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/** Office instructions shown inside a driver card. */
export function InsetNote({ children }: { children: ReactNode }) {
  return <div className="mt-3.5 p-3 rounded-lg bg-surface-raised text-14 leading-[1.45] text-text-secondary">{children}</div>;
}

/** Checklist rows (BOL, POD, lumper receipt) inside a DriverCard with padded={false}. */
export function ChecklistRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3.5 border-b border-border last:border-b-0">
      <span>{label}</span>
      <span className="text-13 text-text-muted">{status}</span>
    </div>
  );
}

const TABS = [
  { key: "loads", label: "Loads", href: "/d", icon: IconLoads },
  { key: "capture", label: "Capture", href: "/d/capture", icon: IconCamera },
  { key: "pay", label: "Pay", href: "/d/pay", icon: IconPay },
  { key: "me", label: "Me", href: "/d/me", icon: IconUser },
] as const;

export function DriverTabBar({ active }: { active: "loads" | "capture" | "pay" | "me" }) {
  return (
    <nav aria-label="Driver" className="flex border-t border-border bg-surface px-2 pt-2 pb-5">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = t.key === active;
        return (
          <UiLink
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn("flex-1 flex flex-col items-center gap-1 py-1.5 text-11", isActive ? "text-link" : "text-text-muted")}
          >
            <Icon size={22} />
            {t.label}
          </UiLink>
        );
      })}
    </nav>
  );
}
