import { cn } from './cn';

/**
 * A load's route as a line with its stops on it.
 *
 * A dispatcher does not need a map to answer "where is it and is it going to
 * make the appointment" — they need the stops in order, which one it is at,
 * and how much of the run is behind it. The geographic map arrives with
 * routing in phase 7; this is the thing that actually answers the question.
 */
export type Stop = {
  city: string;
  kind: 'pickup' | 'delivery';
  when: string;
  state: 'done' | 'current' | 'ahead';
};

export function RouteStrip({
  stops,
  progress,
  late,
  className,
}: {
  stops: Stop[];
  progress: number;
  late?: boolean;
  className?: string;
}) {
  const tone = late ? 'var(--color-danger)' : 'var(--color-ok)';

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-1.5">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-control" />
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-px -translate-y-1/2"
          style={{ width: `${Math.round(progress * 100)}%`, background: tone }}
        />
        {stops.map((stop, index) => {
          const at = stops.length === 1 ? 0 : index / (stops.length - 1);
          const done = stop.state === 'done';
          const current = stop.state === 'current';
          return (
            <span
              key={`${stop.city}-${index}`}
              aria-hidden
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${at * 100}%`,
                width: current ? 7 : 5,
                height: current ? 7 : 5,
                background: done || current ? tone : 'var(--color-bg)',
                border: done || current ? 'none' : '1px solid var(--color-border-control)',
              }}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between gap-3">
        {stops.map((stop, index) => (
          <div
            key={`${stop.city}-label-${index}`}
            className={cn(
              'min-w-0',
              index === 0 && 'text-left',
              index === stops.length - 1 && 'text-right',
              index > 0 && index < stops.length - 1 && 'text-center',
            )}
          >
            <p
              className={cn(
                'truncate text-label',
                stop.state === 'ahead' ? 'text-text-muted' : 'text-text-secondary',
              )}
            >
              {stop.city}
            </p>
            <p className="nums truncate text-label text-text-faint">{stop.when}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The one-line version for a table cell: origin, arrow, destination. */
export function Lane({ from, to, className }: { from: string; to: string; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <span className="truncate">{from}</span>
      <span aria-hidden className="shrink-0 text-text-faint">
        →
      </span>
      <span className="truncate">{to}</span>
    </span>
  );
}
