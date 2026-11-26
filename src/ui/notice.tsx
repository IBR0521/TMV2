import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * A line of fact about the whole screen: what it is showing, or what is wrong
 * with it. Sits directly under the PageHeader, above the panels.
 *
 * `warning` is for problems only, with words (CLAUDE.md rule 7); `info` says
 * something factual, such as a screen standing on sample rows until its phase
 * is built.
 */
export function Notice({
  tone = "info",
  label,
  children,
}: {
  tone?: "info" | "warning";
  /** Two or three words: "Sample", "Offline", "Over quota". */
  label: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-border bg-surface text-text-secondary",
    warning: "border-warning-border bg-warning-fill text-warning",
  } as const;
  const chips = {
    info: "bg-selected text-link",
    warning: "bg-warning-border text-warning",
  } as const;

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5 border rounded-lg px-4 py-2.5 text-13", tones[tone])}>
      <span className={cn("rounded-chip px-2 py-0.75 text-12 font-medium", chips[tone])}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
