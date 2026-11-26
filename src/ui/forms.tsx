import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Form fields. One form serves both "new" and "edit".
 * `uncertain` marks a value the AI was not sure about (rate con drafts): orange outline + "Check this".
 */
const control =
  "w-full h-9.5 px-3 rounded-md bg-surface border border-border-input text-14 text-text placeholder:text-text-muted outline-none focus:border-primary";

export function Field({
  label,
  hint,
  error,
  uncertain,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  uncertain?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-13 text-text-secondary">{label}</span>
      <span className={cn(uncertain && "[&>*]:border-warning")}>{children}</span>
      {error ? (
        <span className="text-12 text-warning">{error}</span>
      ) : uncertain ? (
        <span className="text-12 text-warning">Check this: the document was hard to read here</span>
      ) : hint ? (
        <span className="text-12 text-text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={cn(control, "appearance-none", props.className)}>
      {children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "h-auto min-h-24 py-2.5", props.className)} />;
}

/** Lays fields out in a responsive grid inside a Panel. */
export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" }[columns];
  return <div className={cn("grid gap-4 px-5 py-4", cols)}>{children}</div>;
}

/** Bottom bar of a form panel: secondary actions then the one primary button. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 px-5 py-3.5 border-t border-border">{children}</div>;
}
