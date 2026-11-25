import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { COMPANY, INBOX, METRICS, TRUCKS, TRUCK_LABELS, type TruckState } from '../sample-data';

/**
 * Direction B — Queue.
 *
 * Not a dashboard. The thing that needs you is large, in the middle, with
 * everything needed to decide it and two buttons; the rest of the day is one
 * quiet line above it and a short list below. Warm near-black, one green that
 * only ever means "this is the way forward".
 */
const SECTIONS = [
  'Today',
  'Loads',
  'Dispatch',
  'Billing',
  'Driver pay',
  'Fleet',
  'Costs',
  'Customers',
  'Reports',
];

const STATE_COLOR: Record<TruckState, string> = {
  transit: 'var(--ok)',
  late: 'var(--late)',
  available: 'var(--idle)',
  loading: 'var(--color-text-secondary)',
  home: 'var(--idle)',
};

export default function QueueDirection() {
  const [next, ...rest] = INBOX;

  return (
    <div data-world="queue" className="world">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-6 px-6">
          <span className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[12px] font-semibold text-on-primary">
              T
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.01em]">TruckMates</span>
          </span>

          <nav aria-label="Sections" className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {SECTIONS.map((section) => (
              <span
                key={section}
                aria-current={section === 'Today' ? 'page' : undefined}
                className={
                  section === 'Today'
                    ? 'rounded-chip bg-selected px-3 py-1 text-[13px] text-text'
                    : 'rounded-chip px-3 py-1 text-[13px] text-text-muted transition-colors hover:text-text-secondary'
                }
              >
                {section}
              </span>
            ))}
          </nav>

          <span className="ml-auto flex items-center gap-3">
            <span className="rounded-chip border border-input px-2.5 py-1 text-[12px] text-text-muted">
              ⌘K
            </span>
            <span className="text-[13px] text-text-secondary">{COMPANY.name}</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 pt-10 pb-24">
        <StatusLine />

        <section className="mt-8">
          <h1 className="text-[13px] font-medium text-text-muted">Next</h1>

          <article
            className="mt-3 rounded-lg border border-border bg-surface-raised p-7"
            style={{ boxShadow: 'var(--lift)' }}
          >
            <p className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
              {next!.kind}
            </p>

            <h2 className="mt-2 text-[30px] leading-[36px] font-semibold tracking-[-0.025em]">
              {next!.headline}
            </h2>

            <dl className="mt-6 grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
              <Fact label="Route" value="Dallas, TX → Atlanta, GA" />
              <Fact label="Pickup" value="Tomorrow 08:00" />
              <Fact label="Miles" value="790" mono />
              <Fact label="Rate" value={next!.stake ?? '—'} mono strong />
            </dl>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-on-primary"
              >
                <Check size={15} strokeWidth={2.2} aria-hidden />
                {next!.action} this load
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-[14px] text-text-secondary transition-colors hover:text-text"
              >
                <X size={15} strokeWidth={2} aria-hidden />
                Not now
              </button>
              <span className="ml-auto text-[12px] text-text-muted">
                <kbd className="nums rounded border border-input px-1.5 py-0.5">↵</kbd> accept{' '}
                <kbd className="nums ml-2 rounded border border-input px-1.5 py-0.5">X</kbd> dismiss
              </span>
            </div>
          </article>
        </section>

        <section className="mt-10">
          <h2 className="text-[13px] font-medium text-text-muted">
            After this <span className="nums text-text-secondary">{rest.length}</span>
          </h2>

          <ul className="mt-3 overflow-hidden rounded-lg border border-border">
            {rest.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 border-b border-border bg-surface px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-raised"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-text-muted">{item.kind}</span>
                  <span className="block truncate text-[15px]">{item.headline}</span>
                </span>
                {item.stake && (
                  <span
                    className="nums text-[14px]"
                    style={{ color: item.warning ? 'var(--late)' : 'var(--color-text-secondary)' }}
                  >
                    {item.stake}
                  </span>
                )}
                <span className="text-[13px] text-text-secondary">{item.action}</span>
                <ArrowRight size={15} strokeWidth={1.8} className="text-text-muted" aria-hidden />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-3 text-[13px] font-medium text-text-muted">
            Fleet <span className="nums text-text-secondary">{COMPANY.trucks}</span>
            <Link href="/design/c" className="ml-auto text-[13px] text-link hover:underline">
              Dispatch board
            </Link>
          </h2>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRUCKS.map((truck) => (
              <li key={truck.unit} className="rounded-md border border-border bg-surface px-4 py-3">
                <span className="flex items-baseline gap-2">
                  <span className="nums text-[14px] font-medium">{truck.unit}</span>
                  <span className="truncate text-[14px] text-text-secondary">{truck.driver}</span>
                </span>
                <span
                  className="mt-1 block text-[12px]"
                  style={{ color: STATE_COLOR[truck.state] }}
                >
                  {truck.state === 'late' ? truck.status : TRUCK_LABELS[truck.state]}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-text-muted">
                  {truck.where}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function StatusLine() {
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[13px] text-text-secondary">
      {METRICS.map((m) => (
        <span key={m.label} className="flex items-baseline gap-1.5">
          <span className="nums text-[15px] font-medium text-text">{m.value}</span>
          <span>{m.label.toLowerCase()}</span>
          <span style={{ color: m.warning ? 'var(--late)' : 'var(--color-text-muted)' }}>
            · {m.detail}
          </span>
        </span>
      ))}
    </p>
  );
}

function Fact({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-[12px] text-text-muted">{label}</dt>
      <dd
        className={`mt-1 text-[15px] ${mono ? 'nums' : ''} ${strong ? 'font-medium text-text' : 'text-text-secondary'}`}
      >
        {value}
      </dd>
    </div>
  );
}
