import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';

const CONTROL =
  'h-9 w-full rounded-md border border-input bg-surface px-3 text-body text-text ' +
  'focus:border-primary focus:outline-none';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-label text-text-muted">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-label text-warning">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-label text-text-muted">{hint}</span>
      )}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, className)} {...rest}>
      {children}
    </select>
  );
}
