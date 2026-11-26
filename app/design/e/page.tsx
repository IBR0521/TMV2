import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import {
  COMPANY,
  INBOX,
  METRICS,
  TRUCKS,
  UNASSIGNED,
  type Truck as TruckRow,
} from '../sample-data';

/**
 * Direction E — Manifest.
 *
 * A dispatch sheet rather than a dashboard: ruled lines, placards, stencilled
 * figures and wide-tracked field names, the way the paperwork this trade runs
 * on is set. No left sidebar — the fleet runs across the top, because that is
 * the first thing a dispatcher wants to know, and navigation is a row of tabs
 * under the wordmark.
 *
 * Archivo is an American grotesque drawn for print and signage; IBM Plex Mono
 * carries every figure. The identity is in the structure and the lettering,
 * not in an accent colour sprinkled on a generic shell.
 */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
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

const STATE: Record<TruckRow['state'], { word: string; color: string }> = {
  transit: { word: 'Rolling', color: 'var(--guide)' },
  late: { word: 'Late', color: 'var(--signal)' },
  loading: { word: 'Loading', color: 'var(--amber)' },
  available: { word: 'Empty', color: 'var(--t3)' },
  home: { word: 'Home', color: 'var(--t3)' },
};

export default function ManifestDirection() {
  return (
    <div
      data-world="manifest"
      className={`${archivo.variable} ${plexMono.variable} world min-h-screen`}
      style={{ background: 'var(--ink)' }}
    >
      <Masthead />
      <FleetBand />

      <main className="mx-auto grid max-w-[1320px] grid-cols-1 gap-x-10 gap-y-8 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <div className="min-w-0 space-y-8">
          <NeedsYou />
          <Unassigned />
        </div>
        <Money />
      </main>
    </div>
  );
}

/** A painted door placard, not a rounded square with a letter in it. */
function Mark() {
  return (
    <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden className="shrink-0">
      <rect width="40" height="24" rx="2" fill="var(--amber)" />
      <rect x="1.5" y="1.5" width="37" height="21" rx="1" fill="none" stroke="var(--amber-ink)" strokeOpacity="0.35" />
      <text
        x="20"
        y="17"
        textAnchor="middle"
        fontFamily="var(--font-archivo), sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="0.04em"
        fill="var(--amber-ink)"
      >
        TM
      </text>
    </svg>
  );
}

function Masthead() {
  return (
    <header style={{ borderBottom: '1px solid var(--hair)' }}>
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-5 gap-y-3 px-6 pt-5 pb-4 lg:px-8">
        <Mark />
        <div className="min-w-0">
          <p
            className="text-[19px] leading-6 font-bold"
            style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}
          >
            TruckMates
          </p>
          <p className="caps mt-0.5">
            {COMPANY.name} · {COMPANY.trucks} power units · MC 123456
          </p>
        </div>

        <div className="ml-auto flex items-center gap-5">
          <span className="caps hidden sm:block">Wed 25 Nov · 02:14 CST</span>
          <span
            className="hidden rounded-sm px-2.5 py-1 text-[12px] md:block"
            style={{ background: 'var(--raised)', color: 'var(--t3)' }}
          >
            Search ⌘K
          </span>
          <span className="caps" style={{ color: 'var(--t2)' }}>
            Owner
          </span>
        </div>
      </div>

      <nav aria-label="Sections" className="mx-auto max-w-[1320px] overflow-x-auto px-6 lg:px-8">
        <ul className="flex gap-6">
          {SECTIONS.map((section) => (
            <li key={section} className="shrink-0">
              <span
                aria-current={section === 'Today' ? 'page' : undefined}
                className="caps block cursor-default pb-2.5 whitespace-nowrap"
                style={
                  section === 'Today'
                    ? { color: 'var(--t1)', boxShadow: 'inset 0 -2px 0 0 var(--amber)' }
                    : undefined
                }
              >
                {section}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/**
 * The fleet across the top: six cells divided by rules, each carrying its unit
 * placard, its driver, a word for what it is doing, and a rule underneath
 * showing how far through the run it is.
 */
function FleetBand() {
  return (
    <section
      aria-label="Fleet"
      className="overflow-x-auto"
      style={{ borderBottom: '1px solid var(--hair)', background: 'var(--sheet)' }}
    >
      <div className="mx-auto flex max-w-[1320px] px-6 lg:px-8">
        {TRUCKS.map((truck, index) => {
          const state = STATE[truck.state];
          return (
            <div
              key={truck.unit}
              className="min-w-[200px] flex-1 px-4 py-3.5 first:pl-0 last:pr-0"
              style={index > 0 ? { borderLeft: '1px solid var(--hair)' } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="placard-dark text-[12px] leading-4">{truck.unit}</span>
                <span className="truncate text-[13px]" style={{ color: 'var(--t2)' }}>
                  {truck.driver}
                </span>
                <span
                  className="caps ml-auto"
                  style={{ color: state.color, letterSpacing: '0.12em' }}
                >
                  {state.word}
                </span>
              </div>

              <p className="mt-1.5 truncate text-[12px]" style={{ color: 'var(--t3)' }}>
                {truck.where}
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-0.5 flex-1"
                  style={{ background: 'var(--hair-strong)' }}
                >
                  {truck.progress !== undefined && (
                    <span
                      className="block h-0.5"
                      style={{
                        width: `${Math.round(truck.progress * 100)}%`,
                        background: state.color,
                      }}
                    />
                  )}
                </span>
                <span className="nums text-[11px]" style={{ color: 'var(--t3)' }}>
                  {truck.progress !== undefined ? truck.status : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NeedsYou() {
  return (
    <section>
      <div className="flex items-baseline gap-3 pb-2.5" style={{ borderBottom: '1px solid var(--hair-strong)' }}>
        <h1 className="caps" style={{ color: 'var(--t1)' }}>
          Needs you
        </h1>
        <span className="placard text-[11px] leading-4">{INBOX.length}</span>
        <span className="caps ml-auto" style={{ color: 'var(--signal)', letterSpacing: '0.12em' }}>
          2 at risk
        </span>
      </div>

      <ul className="ruled sheet-grain">
        {INBOX.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-3.5">
            <span
              aria-hidden
              className="mt-1.5 h-2 w-0.5 shrink-0 self-start"
              style={{ background: item.warning ? 'var(--signal)' : 'var(--amber)' }}
            />

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="text-[15px] font-medium" style={{ color: 'var(--t1)' }}>
                  {item.headline}
                </span>
                <span className="caps" style={{ letterSpacing: '0.12em' }}>
                  {item.kind}
                </span>
              </span>
              <span className="mt-1 block truncate text-[13px]" style={{ color: 'var(--t2)' }}>
                {item.facts.join('   ·   ')}
              </span>
            </span>

            <span
              className="nums w-[76px] shrink-0 text-right text-[15px] font-medium"
              style={{ color: item.stake ? 'var(--t1)' : 'transparent' }}
            >
              {item.stake ?? '—'}
            </span>

            <button
              type="button"
              className="h-8 shrink-0 rounded-sm px-3.5 text-[13px] font-semibold whitespace-nowrap"
              style={
                index === 0
                  ? { background: 'var(--amber)', color: 'var(--amber-ink)' }
                  : { background: 'var(--raised)', color: 'var(--t1)' }
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

function Unassigned() {
  return (
    <section>
      <div className="flex items-baseline gap-3 pb-2.5" style={{ borderBottom: '1px solid var(--hair-strong)' }}>
        <h2 className="caps" style={{ color: 'var(--t1)' }}>
          Needs a driver
        </h2>
        <span className="placard-dark text-[11px] leading-4">{UNASSIGNED.length}</span>
      </div>

      <ul className="ruled">
        {UNASSIGNED.map((load) => (
          <li key={load.number} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
            <span className="placard-dark text-[12px] leading-4">{load.number}</span>
            <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: 'var(--t1)' }}>
              {load.route}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
              {load.when} · {load.miles}
            </span>
            <span className="nums w-[76px] text-right text-[14px]" style={{ color: 'var(--t1)' }}>
              {load.rate}
            </span>
            <button
              type="button"
              className="h-8 rounded-sm px-3.5 text-[13px] font-semibold"
              style={{ background: 'var(--raised)', color: 'var(--t1)' }}
            >
              Assign
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Money, as a column of figures with a rule under each whose length is the
 * share of the week it represents. A real reading of the numbers, not a
 * decorative chart.
 */
function Money() {
  const bars = [
    { label: 'Ready to bill', value: '$18,450', detail: '6 loads', share: 0.3, color: 'var(--amber)' },
    { label: 'Overdue', value: '$4,100', detail: '2 invoices', share: 0.07, color: 'var(--signal)' },
    { label: 'Delivered this week', value: '$61,940', detail: '23 loads', share: 1, color: 'var(--guide)' },
  ];

  return (
    <aside>
      <div className="pb-2.5" style={{ borderBottom: '1px solid var(--hair-strong)' }}>
        <h2 className="caps" style={{ color: 'var(--t1)' }}>
          Money
        </h2>
      </div>

      <div className="ruled">
        {bars.map((bar) => (
          <div key={bar.label} className="py-4">
            <p className="caps" style={{ letterSpacing: '0.12em' }}>
              {bar.label}
            </p>
            <p
              className="nums mt-1.5 text-[27px] leading-8 font-semibold"
              style={{ color: 'var(--t1)' }}
            >
              {bar.value}
            </p>
            <div aria-hidden className="mt-2 h-1" style={{ background: 'var(--hair)' }}>
              <div className="h-1" style={{ width: `${bar.share * 100}%`, background: bar.color }} />
            </div>
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--t3)' }}>
              {bar.detail}
            </p>
          </div>
        ))}

        <div className="py-4">
          <p className="caps" style={{ letterSpacing: '0.12em' }}>
            In transit
          </p>
          <p className="nums mt-1.5 text-[27px] leading-8 font-semibold" style={{ color: 'var(--t1)' }}>
            {METRICS[0]!.value}
          </p>
          <p className="mt-1.5 text-[12px]" style={{ color: 'var(--signal)' }}>
            {METRICS[0]!.detail}
          </p>
        </div>
      </div>
    </aside>
  );
}
