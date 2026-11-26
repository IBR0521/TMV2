import { type ReactNode } from 'react';
import { Panel } from './panel';

/** One panel, one job: the small pages around the app all look the same. */
export function AuthCard({
  title,
  subline,
  children,
  footer,
}: {
  title: string;
  subline?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Panel className="p-6">
      <h1 className="text-[20px] leading-7 font-medium tracking-[-0.02em]">{title}</h1>
      {subline && <p className="mt-1 text-label text-text-muted">{subline}</p>}
      <div className="mt-6 space-y-4">{children}</div>
      {footer && (
        <div className="mt-6 border-t border-border pt-4 text-label text-text-muted">{footer}</div>
      )}
    </Panel>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger-border bg-danger-fill px-3 py-2 text-label text-danger"
    >
      {message}
    </p>
  );
}
