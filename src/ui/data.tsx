import type { ReactNode } from "react";
import { cn } from "./cn";
import { UiLink } from "./link";

/** StatusChip: words carry the meaning; color only supports it. */
export function StatusChip({
  tone = "normal",
  dot,
  children,
}: {
  /** normal: booked, in transit, delivered · idle: available, home time · warning: late, overdue, offline, unreadable */
  tone?: "normal" | "idle" | "warning";
  dot?: boolean;
  children: ReactNode;
}) {
  const tones = {
    normal: "text-link bg-selected border-load-border",
    idle: "text-text-secondary bg-surface border-border-control",
    warning: "text-warning bg-warning-fill border-warning-border",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-12 font-medium border rounded-chip px-2.5 py-0.75 whitespace-nowrap", tones[tone])}>
      {dot ? <span className={cn("size-1.5 rounded-full", tone === "warning" ? "bg-warning" : "bg-link")} /> : null}
      {children}
    </span>
  );
}

/** Money is integer cents in the database; format it only here. Always Geist Mono. */
export function formatMoney(cents: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? true;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}

export function Amount({ cents, decimals, className }: { cents: number; decimals?: boolean; className?: string }) {
  return <span className={cn("font-mono", className)}>{formatMoney(cents, { decimals })}</span>;
}

/** A label/amount line inside a money Cell. `total` adds the divider and weight. */
export function AmountRow({ label, cents, total }: { label: ReactNode; cents: number; total?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", total && "font-medium pt-2 border-t border-border")}>
      <span className={total ? undefined : "text-text-secondary"}>{label}</span>
      <Amount cents={cents} />
    </div>
  );
}

export function CellLabel({ children }: { children: ReactNode }) {
  return <div className="text-12 text-text-muted">{children}</div>;
}

/** Tabs on detail pages: Overview, Documents, Charges, Check calls. */
export function Tabs({ items }: { items: Array<{ label: string; href: string; active?: boolean; count?: number }> }) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-border text-14">
      {items.map((t) => (
        <UiLink
          key={t.label}
          href={t.href}
          role="tab"
          aria-selected={t.active ? true : undefined}
          className={cn("pb-2.5 -mb-px", t.active ? "border-b-2 border-primary text-text font-medium" : "text-text-muted hover:text-text")}
        >
          {t.label}
          {t.count !== undefined ? ` ${t.count}` : ""}
        </UiLink>
      ))}
    </div>
  );
}

/** Timeline: newest first, a small time over one line of text. Lives in a Panel on the right of detail pages. */
export function Timeline({ items }: { items: Array<{ time: string; text: ReactNode }> }) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-3.5 text-13 leading-[1.45]">
      {items.map((it, i) => (
        <div key={i}>
          <div className="text-12 text-text-muted">{it.time}</div>
          <div>{it.text}</div>
        </div>
      ))}
    </div>
  );
}

/** One stop of a load, inside the Stops panel. */
export function StopItem({
  number,
  state,
  label,
  title,
  detail,
  aside,
}: {
  number: number;
  state: "done" | "current" | "upcoming";
  label: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex gap-4 px-5 py-4 border-b border-border last:border-b-0">
      <div
        className={cn(
          "size-6 rounded-full text-12 flex items-center justify-center flex-none",
          state === "current" ? "bg-primary text-on-primary" : "bg-selected border border-load-border text-link",
        )}
      >
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-12 text-text-muted">{label}</div>
        <div className="font-medium mt-0.75">{title}</div>
        {detail ? <div className="text-13 text-text-secondary mt-1">{detail}</div> : null}
      </div>
      {aside ? <div className={cn("text-13", state === "current" ? "text-link" : "text-text-muted")}>{aside}</div> : null}
    </div>
  );
}

/** DataTable for list screens (Loads, Invoices, Drivers...). Put it inside a Panel. Money columns: align "right" + Amount. */
export type Column<Row> = { key: string; header: string; align?: "left" | "right"; render: (row: Row) => ReactNode };

export function DataTable<Row>({ columns, rows, rowKey }: { columns: Column<Row>[]; rows: Row[]; rowKey: (row: Row) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-14">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn("px-5 py-3 text-12 font-normal text-text-muted border-b border-border", c.align === "right" ? "text-right" : "text-left")}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-surface-raised">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-5 py-3.5 border-b border-border", c.align === "right" && "text-right")}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
