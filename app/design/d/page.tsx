import {
  Building2,
  CalendarRange,
  ChartBar,
  FileText,
  Inbox,
  Package,
  Receipt,
  Search,
  Settings,
  Truck,
  Wallet,
} from 'lucide-react';
import { COMPANY, INBOX, METRICS, TRUCKS, type Truck as TruckRow } from '../sample-data';

/**
 * Direction D — Night haul.
 *
 * Dark done with the mechanics dark actually needs: every surface a step
 * lighter than the one under it, hairlines made of light rather than drawn
 * grey, four text tones used strictly, weight stopping at 500, and one
 * saturated colour — sodium amber — for the thing that needs a person. Green
 * and red are state and nothing else. Lists have no dividers; the hover
 * surface separates them.
 *
 * The trade shows in the figures, the unit plates and the mark, not in a
 * costume typeface.
 */
const NAV = [
  { icon: Inbox, label: 'Today', badge: 6, active: true },
  { icon: Package, label: 'Loads' },
  { icon: CalendarRange, label: 'Dispatch' },
  { icon: FileText, label: 'Billing' },
  { icon: Wallet, label: 'Driver pay' },
  { icon: Truck, label: 'Fleet' },
  { icon: Receipt, label: 'Costs' },
  { icon: Building2, label: 'Customers' },
  { icon: ChartBar, label: 'Reports' },
];

const TRUCK_TONE: Record<TruckRow['state'], { label: string; color: string }> = {
  transit: { label: 'On route', color: 'var(--guide)' },
  late: { label: 'Late', color: 'var(--signal)' },
  loading: { label: 'Loading', color: 'var(--amber)' },
  available: { label: 'Free', color: 'var(--t3)' },
  home: { label: 'Home', color: 'var(--t3)' },
};

export default function NightHaulDirection() {
  return (
    <div data-world="night" className="world flex min-h-screen" style={{ background: 'var(--base)' }}>
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1180px] px-8 py-8">
          <Header />
          <Metrics />

          <div className="mt-8 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
            <NeedsYou />
            <Fleet />
          </div>
        </div>
      </main>
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="shrink-0">
      <rect width="24" height="24" rx="6" fill="var(--amber)" />
      <path
        d="M6.4 7.4 11 12l-4.6 4.6M13.2 7.4 17.8 12l-4.6 4.6"
        fill="none"
        stroke="var(--amber-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sidebar() {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col px-3 py-4 md:flex"
      style={{ borderRight: '1px solid var(--hair)' }}
    >
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <Mark />
        <span className="text-[14px] font-medium" style={{ color: 'var(--t1)' }}>
          TruckMates
        </span>
      </div>

      <ul className="space-y-0.5">
        {NAV.map(({ icon: Icon, label, badge, active }) => (
          <li key={label}>
            <span
              aria-current={active ? 'page' : undefined}
              className="row flex cursor-default items-center gap-2.5 px-2 py-[7px] text-[13px]"
              style={
                active
                  ? { background: 'var(--elevated)', color: 'var(--t1)' }
                  : { color: 'var(--t2)' }
              }
            >
              <Icon
                size={15}
                strokeWidth={1.75}
                aria-hidden
                style={{ color: active ? 'var(--amber)' : 'var(--t3)' }}
              />
              {label}
              {badge !== undefined && (
                <span className="nums ml-auto text-[12px]" style={{ color: 'var(--t3)' }}>
                  {badge}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 pt-1" style={{ borderTop: '1px solid var(--hair)' }}>
        <span className="row flex cursor-default items-center gap-2.5 px-2 py-[7px] text-[13px]" style={{ color: 'var(--t2)' }}>
          <Settings size={15} strokeWidth={1.75} aria-hidden style={{ color: 'var(--t3)' }} />
          Settings
        </span>
      </div>

      <div className="mt-auto px-2">
        <p className="text-[13px]" style={{ color: 'var(--t2)' }}>
          {COMPANY.name}
        </p>
        <p className="text-[12px]" style={{ color: 'var(--t4)' }}>
          Owner · {COMPANY.trial}
        </p>
      </div>
    </nav>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-8 font-medium tracking-[-0.02em]" style={{ color: 'var(--t1)' }}>
          Today
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--t3)' }}>
          Wednesday, 25 November · 02:14 CST
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="row flex h-9 items-center gap-2 px-3 text-[13px]"
          style={{ color: 'var(--t3)', background: 'var(--panel)' }}
        >
          <Search size={14} strokeWidth={1.75} aria-hidden />
          Search
          <kbd className="nums ml-6 text-[11px]" style={{ color: 'var(--t4)' }}>
            ⌘K
          </kbd>
        </span>
        <button
          type="button"
          className="h-9 rounded-md px-3.5 text-[13px] font-medium"
          style={{ background: 'var(--amber)', color: 'var(--amber-ink)' }}
        >
          New load
        </button>
      </div>
    </header>
  );
}

function Metrics() {
  return (
    <section
      className="mt-7 grid grid-cols-2 gap-x-10 gap-y-6 pb-7 lg:grid-cols-4"
      style={{ borderBottom: '1px solid var(--hair)' }}
    >
      {METRICS.map((metric) => (
        <div key={metric.label}>
          <p className="eyebrow">{metric.label}</p>
          <p className="nums mt-1.5 text-[30px] leading-9 font-medium" style={{ color: 'var(--t1)' }}>
            {metric.value}
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: metric.warning ? 'var(--signal)' : 'var(--t3)' }}
          >
            {metric.detail}
          </p>
        </div>
      ))}
    </section>
  );
}

function NeedsYou() {
  return (
    <section>
      <div className="flex items-baseline gap-2 px-2">
        <h2 className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
          Needs you
        </h2>
        <span className="nums text-[12px]" style={{ color: 'var(--t3)' }}>
          {INBOX.length}
        </span>
      </div>

      <ul className="mt-2">
        {INBOX.map((item, index) => (
          <li
            key={item.id}
            className="row group flex cursor-default items-center gap-4 px-2 py-3"
          >
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 self-start rounded-full"
              style={{ background: item.warning ? 'var(--signal)' : 'var(--amber)' }}
            />

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-[14px]" style={{ color: 'var(--t1)' }}>
                  {item.headline}
                </span>
                <span className="hidden shrink-0 text-[12px] lg:block" style={{ color: 'var(--t4)' }}>
                  {item.kind}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13px]" style={{ color: 'var(--t3)' }}>
                {item.facts.join('  ·  ')}
              </span>
            </span>

            <span
              className="nums hidden w-[72px] shrink-0 text-right text-[14px] sm:block"
              style={{ color: item.stake ? 'var(--t2)' : 'transparent' }}
            >
              {item.stake ?? '—'}
            </span>

            <button
              type="button"
              className={
                index === 0
                  ? 'h-8 shrink-0 rounded-md px-3 text-[13px] font-medium whitespace-nowrap'
                  : 'row h-8 shrink-0 px-3 text-[13px] whitespace-nowrap group-hover:bg-[var(--overlay)]'
              }
              style={
                index === 0
                  ? { background: 'var(--amber)', color: 'var(--amber-ink)' }
                  : { color: 'var(--t2)' }
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
    <section>
      <div className="flex items-baseline gap-2 px-2">
        <h2 className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
          Fleet
        </h2>
        <span className="nums text-[12px]" style={{ color: 'var(--t3)' }}>
          {TRUCKS.length}
        </span>
        <span className="ml-auto cursor-default text-[12px]" style={{ color: 'var(--t3)' }}>
          Dispatch board
        </span>
      </div>

      <ul className="mt-2">
        {TRUCKS.map((truck) => {
          const tone = TRUCK_TONE[truck.state];
          const running = truck.progress !== undefined;

          return (
            <li key={truck.unit} className="row cursor-default px-2 py-3">
              <div className="flex items-center gap-2.5">
                <span className="unit px-1.5 py-0.5 text-[12px]" style={{ color: 'var(--t2)' }}>
                  {truck.unit}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: 'var(--t1)' }}>
                  {truck.driver}
                </span>
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: tone.color }}>
                  {truck.state === 'transit' && (
                    <span
                      aria-hidden
                      className="live-dot h-1 w-1 rounded-full"
                      style={{ background: tone.color }}
                    />
                  )}
                  {truck.state === 'late' ? truck.status : tone.label}
                </span>
              </div>

              {running && (
                <div
                  aria-hidden
                  className="relative mt-2.5 ml-[38px] h-px"
                  style={{ background: 'var(--hair-strong)' }}
                >
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.round((truck.progress ?? 0) * 100)}%`,
                      background: tone.color,
                    }}
                  />
                  <span
                    className="absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full"
                    style={{
                      left: `calc(${Math.round((truck.progress ?? 0) * 100)}% - 2.5px)`,
                      background: tone.color,
                    }}
                  />
                </div>
              )}

              <p className="mt-1.5 ml-[38px] flex items-baseline gap-3 text-[12px]">
                <span className="truncate" style={{ color: 'var(--t3)' }}>
                  {truck.where}
                </span>
                {running && (
                  <span className="nums ml-auto shrink-0" style={{ color: 'var(--t2)' }}>
                    {truck.status}
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
