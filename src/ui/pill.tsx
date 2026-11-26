import { cn } from './cn';

/**
 * A status chip. Colour never carries the meaning on its own: the word is the
 * meaning, and the colour only makes it findable in a column of fifty rows.
 */
export type Tone = 'neutral' | 'live' | 'ok' | 'risk' | 'idle';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-raised text-text-secondary',
  live: 'bg-[var(--color-ok-fill)] text-ok',
  ok: 'bg-surface-raised text-ok',
  risk: 'bg-[var(--color-danger-fill)] text-danger',
  idle: 'bg-surface-raised text-text-muted',
};

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-label whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A dot that pulses only while something is genuinely in motion. */
export function LiveDot({ tone = 'var(--color-ok)' }: { tone?: string }) {
  return (
    <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
  );
}
