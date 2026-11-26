import type { ReactNode } from "react";
import { cn } from "./cn";
import { TextLink } from "./button";

/**
 * Panel: the ONLY container for grouped content. A page has a few panels;
 * inside a panel, rows are split by hairlines. Never a separate card per row.
 */
export function Panel({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={cn("border border-border rounded-lg bg-surface", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  count,
  action,
}: {
  title: ReactNode;
  count?: number | string;
  /** Usually a TextLink: "View all", "Dispatch board". */
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex justify-between items-center gap-3 px-5 py-3.5 border-b border-border">
      <h2 className="m-0 text-15 font-semibold">
        {title}
        {count !== undefined ? <span className="text-text-muted font-normal"> {count}</span> : null}
      </h2>
      {action ? <TextLink href={action.href}>{action.label}</TextLink> : null}
    </div>
  );
}

/**
 * ListRow: a grey label, one line of facts joined with " · ", and at most one small button.
 * Only the first row of the Today inbox gets a primary button; others are secondary.
 */
export function ListRow({ label, title, action }: { label: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 items-center px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex-[1_1_360px] min-w-0">
        <div className="text-12 text-text-muted">{label}</div>
        <div className="font-medium mt-0.75">{title}</div>
      </div>
      {action}
    </div>
  );
}

/** SplitRow: name + subline on the left, value + subline on the right (trucks list, small summaries). */
export function SplitRow({
  title,
  subtitle,
  value,
  valueSub,
  tone = "default",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  value: ReactNode;
  valueSub?: ReactNode;
  tone?: "default" | "warning" | "link";
}) {
  return (
    <div className="flex justify-between gap-3 px-5 py-3 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        {subtitle ? <div className="text-13 text-text-muted mt-0.5">{subtitle}</div> : null}
      </div>
      <div className="text-right">
        <div className={cn(tone === "warning" && "text-warning", tone === "link" && "text-link")}>{value}</div>
        {valueSub ? <div className="text-13 text-text-muted mt-0.5">{valueSub}</div> : null}
      </div>
    </div>
  );
}

/** SummaryStrip: one panel split into metric cells by vertical hairlines. Max 4 metrics. */
export function SummaryStrip({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap border border-border rounded-lg bg-surface">{children}</div>;
}

export function Metric({
  label,
  value,
  sub,
  tone = "muted",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Use "warning" only when something is wrong (late, overdue). */
  tone?: "muted" | "warning";
}) {
  return (
    <div className="flex-[1_1_180px] px-5 py-4 border-r border-border last:border-r-0">
      <div className="text-13 text-text-muted">{label}</div>
      <div className="text-24 font-medium mt-1.5">{value}</div>
      {sub ? <div className={cn("text-13 mt-0.5", tone === "warning" ? "text-warning" : "text-text-muted")}>{sub}</div> : null}
    </div>
  );
}

/** Cells inside a panel, split by vertical hairlines (load money panel). */
export function CellGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap">{children}</div>;
}
export function Cell({ children, basis = "md" }: { children: ReactNode; basis?: "md" | "sm" }) {
  return (
    <div className={cn("px-5 py-4 border-r border-border last:border-r-0 flex flex-col gap-2 text-13", basis === "md" ? "flex-[1_1_240px]" : "flex-[1_1_200px]")}>
      {children}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="font-medium">{title}</div>
      {hint ? <div className="text-13 text-text-muted mt-1">{hint}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
