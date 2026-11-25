import Link from 'next/link';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import {
  Building2,
  CalendarRange,
  ChartBar,
  FileText,
  Inbox,
  Package,
  Receipt,
  Settings,
  Truck,
  Wallet,
} from 'lucide-react';
import { COMPANY, INBOX, METRICS, TRUCKS, TRUCK_LABELS, type TruckState } from '../sample-data';

/**
 * Direction A — Console.
 *
 * A control room: one instrument, no cards, hairlines instead of containers.
 * The screen is monochrome so that the only colour on it is a fact about a
 * truck or about money. Dense enough that a dispatcher can hold the whole
 * operation in one view and work it from the keyboard.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

const STATE_COLOR: Record<TruckState, string> = {
  transit: 'var(--ok)',
  late: 'var(--late)',
  available: 'var(--idle)',
  loading: 'var(--color-text-secondary)',
  home: 'var(--idle)',
};

const RAIL = [
  { icon: Inbox, label: 'Today', active: true },
  { icon: Package, label: 'Loads' },
  { icon: CalendarRange, label: 'Dispatch' },
  { icon: FileText, label: 'Billing' },
  { icon: Wallet, label: 'Driver pay' },
  { icon: Truck, label: 'Fleet' },
  { icon: Receipt, label: 'Costs' },
  { icon: Building2, label: 'Customers' },
  { icon: ChartBar, label: 'Reports' },
];

export default function ConsoleDirection() {
  return (
    <div
      data-world="console"
      className={`${plexSans.variable} ${plexMono.variable} world flex min-h-screen flex-col`}
    >
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <Rail />

        <main className="grid min-w-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Worklist />
          <Fleet />
        </main>
      </div>

      <footer className="flex items-center gap-5 border-t border-border px-4 py-2">
        <Hint keys="J K" what="move" />
        <Hint keys="↵" what="do it" />
        <Hint keys="X" what="dismiss" />
        <Hint keys="⌘K" what="go anywhere" />
        <span className="ml-auto micro">{COMPANY.name} · {COMPANY.trucks} trucks · {COMPANY.trial}</span>
      </footer>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-stretch border-b border-border">
      <div className="flex w-14 items-center justify-center border-r border-border">
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[12px] font-semibold text-on-primary">
          T
        </span>
      </div>

      <div className="hidden items-center gap-3 border-r border-border px-4 md:flex">
        <span className="text-[13px] font-semibold tracking-[-0.01em]">TruckMates</span>
      </div>

      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="flex min-w-[168px] flex-col justify-center border-r border-border px-4"
          >
            <span className="micro">{m.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="nums text-[15px] leading-5 font-medium">{m.value}</span>
              <span
                className="text-[11px] leading-5"
                style={{ color: m.warning ? 'var(--late)' : 'var(--color-text-muted)' }}
              >
                {m.detail}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="hidden items-center gap-3 px-4 lg:flex">
        <span className="rounded-sm border border-input px-2 py-1 text-[11px] text-text-muted">
          Search ⌘K
        </span>
        <span className="micro">Owner</span>
      </div>
    </header>
  );
}

function Rail() {
  return (
    <nav aria-label="Sections" className="hidden w-14 shrink-0 flex-col border-r border-border py-2 sm:flex">
      {RAIL.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-current={active ? 'page' : undefined}
          className="group relative flex h-11 items-center justify-center"
          style={active ? { color: 'var(--color-text)' } : { color: 'var(--color-text-muted)' }}
        >
          {active && (
            <span
              aria-hidden
              className="absolute top-2 bottom-2 left-0 w-px"
              style={{ background: 'var(--accent)' }}
            />
          )}
          <Icon size={17} strokeWidth={1.6} aria-hidden />
        </button>
      ))}
      <div className="mt-auto flex h-11 items-center justify-center text-text-muted">
        <Settings size={17} strokeWidth={1.6} aria-hidden />
      </div>
    </nav>
  );
}

function Worklist() {
  return (
    <section className="min-w-0 border-border xl:border-r">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h1 className="micro">Needs you</h1>
        <span className="nums text-[11px] text-text-secondary">{INBOX.length}</span>
        <span className="ml-auto text-[11px]" style={{ color: 'var(--late)' }}>
          2 at risk
        </span>
      </div>

      <ul>
        {INBOX.map((item, index) => (
          <li
            key={item.id}
            tabIndex={0}
            className="grid cursor-default grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border px-4 py-3 transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: item.warning ? 'var(--late)' : 'var(--ok)' }}
            />

            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="micro">{item.kind}</span>
                {item.stake && (
                  <span className="nums text-[11px] text-text-secondary">{item.stake}</span>
                )}
              </div>
              <p className="truncate text-[13px] leading-5">
                <span className="font-medium">{item.headline}</span>
                <span className="text-text-secondary"> · {item.facts.join(' · ')}</span>
              </p>
            </div>

            <button
              type="button"
              className="h-7 rounded-sm px-3 text-[12px] font-medium whitespace-nowrap transition-colors"
              style={
                index === 0
                  ? { background: 'var(--accent)', color: 'var(--color-on-primary)' }
                  : { border: '1px solid var(--color-border-control)', color: 'var(--color-text)' }
              }
            >
              {item.action}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fleet() {
  return (
    <aside className="min-w-0 border-t border-border xl:border-t-0">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h2 className="micro">Fleet</h2>
        <span className="nums text-[11px] text-text-secondary">{TRUCKS.length}</span>
        <Link href="/design/c" className="ml-auto text-[11px] text-text-secondary hover:text-text">
          Dispatch board
        </Link>
      </div>

      <ul>
        {TRUCKS.map((truck) => (
          <li key={truck.unit} className="border-b border-border px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="nums text-[13px] font-medium">{truck.unit}</span>
              <span className="truncate text-[13px] text-text-secondary">{truck.driver}</span>
              <span
                className="ml-auto text-[11px] whitespace-nowrap"
                style={{ color: STATE_COLOR[truck.state] }}
              >
                {truck.state === 'late' ? truck.status : TRUCK_LABELS[truck.state]}
              </span>
            </div>

            <p className="mt-0.5 truncate text-[11px] text-text-muted">
              {truck.where}
              {truck.state !== 'late' && truck.status !== TRUCK_LABELS[truck.state]
                ? ` · ${truck.status}`
                : ''}
            </p>

            <div className="mt-2 h-px w-full" style={{ background: 'var(--color-border)' }}>
              {truck.progress !== undefined && (
                <div
                  className="h-px"
                  style={{
                    width: `${Math.round(truck.progress * 100)}%`,
                    background: STATE_COLOR[truck.state],
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Hint({ keys, what }: { keys: string; what: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="nums rounded-sm border border-input px-1.5 py-0.5 text-[10px] text-text-secondary">
        {keys}
      </kbd>
      <span className="micro">{what}</span>
    </span>
  );
}
