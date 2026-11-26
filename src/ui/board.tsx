import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";
import { Button } from "./button";
import { Amount } from "./data";

/**
 * Dispatch board: trucks × days. Blocks span whole day columns.
 * Wrap the board in a Panel; it scrolls sideways on narrow screens.
 */
function gridStyle(days: number): CSSProperties {
  return { gridTemplateColumns: `190px repeat(${days}, minmax(0, 1fr))` };
}

export function Board({ days, children }: { days: Array<{ label: string; today?: boolean }>; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid border-b border-border text-12 text-text-muted" style={gridStyle(days.length)}>
          <div className="px-4.5 py-3">Truck</div>
          {days.map((d) => (
            <div key={d.label} className={cn("p-3 border-l border-border", d.today && "text-text font-medium")}>
              {d.label}
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

/** One truck's row. Pass the same `days` count as the Board. */
export function BoardRow({
  days,
  unit,
  driver,
  children,
}: {
  days: number;
  unit: string;
  driver: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-x-2 items-center py-2.5 pr-3 border-b border-border last:border-b-0" style={gridStyle(days)}>
      <div className="pl-4.5">
        <div className="font-medium">{unit}</div>
        <div className="text-12 text-text-muted">{driver}</div>
      </div>
      {children}
    </div>
  );
}

/**
 * A block on the board.
 * load: booked or moving · late: running late (warning) · free: truck available
 * suggested: v2's suggested assignment (click to assign) · home: home time
 */
export function LoadBlock({
  kind,
  startDay,
  span = 1,
  title,
  detail,
}: {
  kind: "load" | "late" | "free" | "suggested" | "home";
  /** 1-based day column where the block starts. */
  startDay: number;
  span?: number;
  title: ReactNode;
  detail?: ReactNode;
}) {
  const styles = {
    load: "bg-load-fill border border-load-border",
    late: "bg-warning-fill border border-warning",
    free: "border border-dashed border-border-control text-text-muted",
    suggested: "border border-dashed border-primary",
    home: "bg-neutral-fill border border-border-input text-text-secondary",
  } as const;
  const titleCls = kind === "suggested" ? "font-medium text-link" : kind === "free" || kind === "home" ? "" : "font-medium";
  const detailCls = kind === "late" ? "text-warning" : "text-text-secondary";
  return (
    <div
      className={cn("rounded-sm px-2.5 py-1.75 text-12", styles[kind])}
      style={{ gridColumn: `${startDay + 1} / span ${span}` }}
    >
      <div className={titleCls}>{title}</div>
      {detail ? <div className={detailCls}>{detail}</div> : null}
    </div>
  );
}

/** A load waiting for a driver, in the left panel of the dispatch board. */
export function UnassignedLoad({
  number,
  rateCents,
  route,
  meta,
  primary,
  onAssign,
}: {
  number: string;
  rateCents: number;
  route: string;
  meta: string;
  /** Only the first one gets the primary button. */
  primary?: boolean;
  onAssign?: () => void;
}) {
  return (
    <div className="px-4.5 py-3.5 border-b border-border last:border-b-0">
      <div className="flex justify-between">
        <span className="font-medium">{number}</span>
        <Amount cents={rateCents} decimals={false} className="text-13" />
      </div>
      <div className="text-text-secondary mt-1">{route}</div>
      <div className="flex justify-between items-center mt-2.5">
        <span className="text-12 text-text-muted">{meta}</span>
        <Button size="xs" variant={primary ? "primary" : "secondary"} onClick={onAssign}>
          Assign
        </Button>
      </div>
    </div>
  );
}

/** Date range control: ‹ Nov 25 – Nov 28 ›. */
export function DateRange({ label }: { label: string }) {
  return (
    <div className="flex items-center border border-border-input rounded-md overflow-hidden">
      <button type="button" aria-label="Previous days" className="h-9 w-9 bg-surface border-0 text-text-secondary">‹</button>
      <div className="px-3 text-13 border-x border-border-input leading-9">{label}</div>
      <button type="button" aria-label="Next days" className="h-9 w-9 bg-surface border-0 text-text-secondary">›</button>
    </div>
  );
}
