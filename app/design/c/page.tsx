import { Barlow } from 'next/font/google';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BOARD,
  COMPANY,
  DAYS,
  INBOX,
  METRICS,
  TRUCKS,
  UNASSIGNED,
  type BoardBlock,
} from '../sample-data';

/**
 * Direction C — Board.
 *
 * Dispatch is spatial, so the day is the home screen: trucks down the side,
 * the next three days across, every load a block you can read at a glance,
 * with the inbox docked beside it. Colour is the whole language here — moving,
 * late, loading, free, suggested — so the type stays quiet and signlike.
 */
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-barlow',
});

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

function blockStyle(state: BoardBlock['state']): React.CSSProperties {
  switch (state) {
    case 'transit':
      return {
        background: 'color-mix(in oklab, var(--ok) 18%, transparent)',
        border: '1px solid color-mix(in oklab, var(--ok) 55%, transparent)',
      };
    case 'late':
      return {
        background: 'color-mix(in oklab, var(--late) 16%, transparent)',
        border: '1px solid color-mix(in oklab, var(--late) 65%, transparent)',
      };
    case 'loading':
      return {
        background: 'color-mix(in oklab, var(--loadingc) 16%, transparent)',
        border: '1px solid color-mix(in oklab, var(--loadingc) 55%, transparent)',
      };
    case 'suggested':
      return {
        background: 'transparent',
        border: '1px dashed color-mix(in oklab, var(--suggest) 75%, transparent)',
      };
    case 'available':
      return { background: 'transparent', border: '1px dashed var(--color-border-control)' };
    default:
      return { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-input)' };
  }
}

function blockText(state: BoardBlock['state']): string {
  if (state === 'late') return 'var(--late)';
  if (state === 'suggested') return 'var(--suggest)';
  if (state === 'available' || state === 'home') return 'var(--color-text-muted)';
  return 'var(--color-text)';
}

export default function BoardDirection() {
  return (
    <div data-world="board" className={`${barlow.variable} world flex min-h-screen flex-col`}>
      <header className="border-b border-border">
        <div className="flex h-13 items-center gap-5 px-5 py-2.5">
          <span className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[12px] font-semibold text-on-primary">
              T
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em]">TruckMates</span>
          </span>
          <span className="hidden text-[13px] text-text-muted md:inline">{COMPANY.name}</span>

          <div className="ml-auto hidden items-center gap-5 lg:flex">
            {METRICS.map((m) => (
              <span key={m.label} className="flex items-baseline gap-1.5">
                <span className="nums text-[14px] font-medium">{m.value}</span>
                <span className="text-[12px] text-text-muted">{m.label.toLowerCase()}</span>
                {m.warning && (
                  <span className="text-[12px]" style={{ color: 'var(--late)' }}>
                    · {m.detail}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto px-3">
          {SECTIONS.map((section) => (
            <span
              key={section}
              aria-current={section === 'Today' ? 'page' : undefined}
              className="relative px-3 py-2 text-[14px] whitespace-nowrap"
              style={
                section === 'Today'
                  ? { color: 'var(--color-text)' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              {section}
              {section === 'Today' && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 -bottom-px h-0.5"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </span>
          ))}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <main className="min-w-0 flex-1 p-5">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">This week</h1>
            <span className="text-[13px] text-text-muted">
              {COMPANY.trucks} trucks · {UNASSIGNED.length} loads need a driver
            </span>
            <span className="ml-auto flex items-center gap-1 rounded-md border border-input px-1 py-1">
              <ChevronLeft size={15} strokeWidth={1.8} className="text-text-muted" aria-hidden />
              <span className="px-2 text-[13px]">Nov 25 – Nov 27</span>
              <ChevronRight size={15} strokeWidth={1.8} className="text-text-muted" aria-hidden />
            </span>
          </div>

          <section className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
            <div
              className="grid border-b border-border"
              style={{ gridTemplateColumns: '150px repeat(3, minmax(150px, 1fr))' }}
            >
              <span className="px-4 py-2 text-[12px] text-text-muted">Truck</span>
              {DAYS.map((day, index) => (
                <span
                  key={day}
                  className="border-l border-border px-4 py-2 text-[12px]"
                  style={{ color: index === 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="overflow-x-auto">
              {TRUCKS.map((truck) => (
                <div
                  key={truck.unit}
                  className="grid items-stretch border-b border-border last:border-b-0"
                  style={{ gridTemplateColumns: '150px repeat(3, minmax(150px, 1fr))' }}
                >
                  <div className="px-4 py-3">
                    <span className="nums block text-[14px] font-medium">{truck.unit}</span>
                    <span className="block truncate text-[12px] text-text-muted">
                      {truck.driver}
                    </span>
                  </div>

                  {[0, 1, 2].map((day) => (
                    <div key={day} className="border-l border-border" />
                  ))}

                  {BOARD.filter((b) => b.unit === truck.unit).map((block) => (
                    <div
                      key={`${block.unit}-${block.day}`}
                      className="m-1.5 rounded-sm px-2.5 py-1.5"
                      style={{
                        ...blockStyle(block.state),
                        gridRow: 1,
                        gridColumnStart: 2 + block.day,
                        gridColumnEnd: 2 + block.day + block.span,
                        color: blockText(block.state),
                      }}
                    >
                      <span className="block truncate text-[12px] leading-4 font-medium">
                        {block.title}
                      </span>
                      {block.detail && (
                        <span className="block truncate text-[11px] leading-4 opacity-80">
                          {block.detail}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <h2 className="text-[13px] text-text-muted">Needs a driver</h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {UNASSIGNED.map((load, index) => (
                <li key={load.number} className="rounded-md border border-border bg-surface p-3">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="nums text-[14px] font-medium">{load.number}</span>
                    <span className="nums text-[14px]" style={{ color: 'var(--accent)' }}>
                      {load.rate}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[13px] text-text-secondary">
                    {load.route}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-muted">
                    {load.when} · {load.miles}
                  </span>
                  <button
                    type="button"
                    className="mt-3 h-8 w-full rounded-md text-[13px] font-medium"
                    style={
                      index === 0
                        ? { background: 'var(--accent)', color: 'var(--color-on-primary)' }
                        : { border: '1px solid var(--color-border-control)', color: 'var(--color-text)' }
                    }
                  >
                    Assign
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <aside className="w-full shrink-0 border-border xl:w-[330px] xl:border-l">
          <div className="flex items-center gap-2 border-y border-border px-5 py-2.5 xl:border-t-0">
            <h2 className="text-[13px] font-medium">Needs you</h2>
            <span className="nums text-[12px] text-text-muted">{INBOX.length}</span>
            <span className="ml-auto text-[12px]" style={{ color: 'var(--late)' }}>
              2 at risk
            </span>
          </div>

          <ul>
            {INBOX.map((item) => (
              <li key={item.id} className="border-b border-border px-5 py-3.5">
                <span className="flex items-baseline gap-2">
                  <span
                    className="text-[12px]"
                    style={{ color: item.warning ? 'var(--late)' : 'var(--color-text-muted)' }}
                  >
                    {item.kind}
                  </span>
                  {item.stake && (
                    <span className="nums ml-auto text-[12px] text-text-secondary">
                      {item.stake}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[14px]">{item.headline}</span>
                <span className="mt-0.5 block truncate text-[12px] text-text-muted">
                  {item.facts[0]}
                </span>
                <button
                  type="button"
                  className="mt-2 text-[13px] font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
