'use client';

import { useMemo, useState } from 'react';
import { FileText, MapPin, Paperclip, Truck } from 'lucide-react';
import { Button } from '@/ui/button';
import { DetailPanel, Fact, PanelSection } from '@/ui/detail-panel';
import { Pill, LiveDot, type Tone } from '@/ui/pill';
import { RouteStrip } from '@/ui/route-strip';
import { Checkbox, SelectionBar, type SortDirection } from '@/ui/table';
import { FilterChip, ViewTabs } from '@/ui/toolbar';
import {
  SAMPLE_LOADS,
  STATUS_LABEL,
  money,
  perMile,
  type LoadStatus,
  type SampleLoad,
} from './_sample';

/**
 * The loads screen.
 *
 * A dispatcher scans one thing down this list — where each load is going —
 * so the lane is the only strong line in a row and everything else is a tone
 * quieter underneath it. Rows are two lines and 60px tall because twelve
 * identical 40px lines cannot be scanned, and they are grouped by pickup day
 * so the eye has somewhere to rest between them.
 *
 * Phase 3 swaps SAMPLE_LOADS for a query; nothing else here changes.
 */
type SortKey = 'pickup' | 'customer' | 'miles' | 'rate' | 'margin';

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'driver', label: 'Needs a driver' },
  { key: 'transit', label: 'On the road' },
  { key: 'billing', label: 'Ready to bill' },
  { key: 'delivered', label: 'Delivered' },
] as const;

type ViewKey = (typeof VIEWS)[number]['key'];

const STATUS_TONE: Record<LoadStatus, Tone> = {
  draft: 'idle',
  booked: 'neutral',
  dispatched: 'neutral',
  in_transit: 'live',
  delivered: 'ok',
};

function matchesView(load: SampleLoad, view: ViewKey): boolean {
  switch (view) {
    case 'driver':
      return load.driver === null && load.status !== 'draft';
    case 'transit':
      return load.status === 'in_transit' || load.status === 'dispatched';
    case 'billing':
      return load.status === 'delivered' && load.billed === 'ready';
    case 'delivered':
      return load.status === 'delivered';
    default:
      return true;
  }
}

const marginCents = (load: SampleLoad) => load.rateCents - load.costCents;

/** "Nov 24 08:00" -> { day: "Nov 24", time: "08:00" } */
function splitWhen(when: string): { day: string; time: string } {
  const parts = when.split(' ');
  return { day: parts.slice(0, 2).join(' '), time: parts.slice(2).join(' ') };
}

const TODAY = 'Nov 25';
const TOMORROW = 'Nov 26';

function dayHeading(day: string): string {
  if (day === TODAY) return `Today · ${day}`;
  if (day === TOMORROW) return `Tomorrow · ${day}`;
  return day;
}

export function LoadsTable() {
  const [view, setView] = useState<ViewKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pickup');
  const [direction, setDirection] = useState<Exclude<SortDirection, null>>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [lateOnly, setLateOnly] = useState(false);

  const rows = useMemo(() => {
    const filtered = SAMPLE_LOADS.filter(
      (load) => matchesView(load, view) && (!lateOnly || load.late === true),
    );

    return [...filtered].sort((a, b) => {
      const factor = direction === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'customer':
          return a.customer.localeCompare(b.customer) * factor;
        case 'miles':
          return (a.miles - b.miles) * factor;
        case 'rate':
          return (a.rateCents - b.rateCents) * factor;
        case 'margin':
          return (marginCents(a) - marginCents(b)) * factor;
        default:
          return a.pickup.localeCompare(b.pickup) * factor;
      }
    });
  }, [view, sortKey, direction, lateOnly]);

  /**
   * Grouping only makes sense while the list is in date order. The groups are
   * worked out here rather than tracked while rendering, so a re-render can
   * never disagree with the one before it.
   */
  const sections = useMemo(() => {
    if (sortKey !== 'pickup') return [{ day: null as string | null, loads: rows }];

    const out: { day: string | null; loads: SampleLoad[] }[] = [];
    for (const load of rows) {
      const day = splitWhen(load.pickup).day;
      const last = out.at(-1);
      if (last && last.day === day) last.loads.push(load);
      else out.push({ day, loads: [load] });
    }
    return out;
  }, [rows, sortKey]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((v) => [v.key, SAMPLE_LOADS.filter((load) => matchesView(load, v.key)).length]),
      ) as Record<ViewKey, number>,
    [],
  );

  const open = rows.find((load) => load.id === openId) ?? null;
  const allShown = rows.length > 0 && rows.every((load) => selected.has(load.id));

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setDirection(key === 'pickup' || key === 'customer' ? 'asc' : 'desc');
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-8 pb-4">
          <ViewTabs
            views={VIEWS.map((v) => ({ key: v.key, label: v.label, count: counts[v.key] }))}
            active={view}
            onPick={(key) => {
              setView(key as ViewKey);
              setOpenId(null);
            }}
          />
          <div className="ml-auto flex items-center gap-2">
            <FilterChip
              label="Running late"
              value={lateOnly ? 'only' : undefined}
              onClear={() => setLateOnly(!lateOnly)}
            />
            <SortMenu sortKey={sortKey} direction={direction} onSort={sortBy} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-8 pt-2 pb-10">
          <div className="flex items-center gap-3 py-2 pl-7">
            <Checkbox
              checked={allShown}
              label="Select every load shown"
              onChange={() => setSelected(allShown ? new Set() : new Set(rows.map((l) => l.id)))}
            />
            <span className="text-label text-text-faint">
              {selected.size > 0 ? `${selected.size} selected` : `${rows.length} loads`}
            </span>
          </div>

          {sections.map((section) => (
            <section key={section.day ?? 'all'}>
              {section.day && (
                <h3 className="pt-7 pb-2 pl-7 text-label text-text-muted">
                  {dayHeading(section.day)}
                </h3>
              )}
              <ul>
                {section.loads.map((load) => (
                  <li key={load.id}>
                    <LoadRow
                      load={load}
                      when={splitWhen(load.pickup)}
                      selected={selected.has(load.id)}
                      open={openId === load.id}
                      onToggle={() => toggle(load.id)}
                      onOpen={() => setOpenId(load.id === openId ? null : load.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <SelectionBar count={selected.size} onClear={() => setSelected(new Set())}>
            <Button variant="secondary" className="h-8 px-3">
              Assign driver
            </Button>
            <Button variant="secondary" className="h-8 px-3">
              Create invoices
            </Button>
            <Button variant="quiet" className="h-8 px-3">
              Export
            </Button>
          </SelectionBar>
        </div>
      </div>

      {open && <LoadDetail load={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/**
 * One load. The lane is the strong line; the customer, the reference and the
 * times sit a tone below it. Money is right-aligned so a column of rates can
 * be read down without reading any of the rows.
 */
function LoadRow({
  load,
  when,
  selected,
  open,
  onToggle,
  onOpen,
}: {
  load: SampleLoad;
  when: { day: string; time: string };
  selected: boolean;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const margin = marginCents(load);

  return (
    <div
      onClick={onOpen}
      aria-selected={open}
      className={`row flex cursor-pointer items-center gap-4 px-2 py-3.5 ${
        open || selected ? 'bg-surface-raised' : ''
      }`}
    >
      <span className="shrink-0 pl-1">
        <Checkbox checked={selected} label={`Select load ${load.number}`} onChange={onToggle} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="nums shrink-0 text-label text-text-muted">#{load.number}</span>
          <span className="truncate text-[15px] leading-6">
            {load.from}
            <span aria-hidden className="mx-1.5 text-text-faint">
              →
            </span>
            {load.to}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-label text-text-muted">
          {load.customer} · {load.reference} · <span className="nums">{load.miles} mi</span>
        </span>
      </span>

      <span className="hidden w-[132px] shrink-0 md:block">
        <Pill tone={load.late ? 'risk' : STATUS_TONE[load.status]}>
          {load.status === 'in_transit' && !load.late && <LiveDot />}
          {load.late ? 'Late' : STATUS_LABEL[load.status]}
        </Pill>
        <span className="nums mt-1 block text-label text-text-muted">
          {when.day} {when.time}
        </span>
      </span>

      <span className="hidden w-[150px] shrink-0 lg:block">
        {load.driver ? (
          <>
            <span className="flex items-center gap-2">
              <span className="unit text-label">{load.unit}</span>
              <span className="truncate text-body text-text-secondary">{load.driver}</span>
            </span>
            <span className="nums mt-1 block text-label text-text-faint">
              {load.stops.at(-1)?.when}
            </span>
          </>
        ) : (
          <span className="text-body text-text-faint">Unassigned</span>
        )}
      </span>

      <span className="w-[104px] shrink-0 text-right">
        <span className="nums block text-[15px] leading-6">{money(load.rateCents)}</span>
        <span className="nums block text-label text-text-muted">
          {load.costCents === 0 ? perMile(load.rateCents, load.miles) + '/mi' : money(margin)}
        </span>
      </span>
    </div>
  );
}

function SortMenu({
  sortKey,
  direction,
  onSort,
}: {
  sortKey: SortKey;
  direction: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}) {
  const options: { key: SortKey; label: string }[] = [
    { key: 'pickup', label: 'Pickup' },
    { key: 'rate', label: 'Rate' },
    { key: 'margin', label: 'Margin' },
    { key: 'miles', label: 'Miles' },
    { key: 'customer', label: 'Customer' },
  ];

  return (
    <span className="flex items-center gap-1">
      <span className="text-label text-text-faint">Sort</span>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onSort(option.key)}
          className={`row px-2 py-1 text-label ${
            option.key === sortKey ? 'bg-surface-raised text-text' : 'text-text-muted'
          }`}
        >
          {option.label}
          {option.key === sortKey && (
            <span aria-hidden className="ml-1 text-text-faint">
              {direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
      ))}
    </span>
  );
}

function LoadDetail({ load, onClose }: { load: SampleLoad; onClose: () => void }) {
  const margin = marginCents(load);

  return (
    <DetailPanel
      onClose={onClose}
      title={
        <>
          <span className="nums text-[17px] font-medium">#{load.number}</span>
          <Pill tone={load.late ? 'risk' : STATUS_TONE[load.status]}>
            {load.status === 'in_transit' && !load.late && <LiveDot />}
            {load.late ? 'Late' : STATUS_LABEL[load.status]}
          </Pill>
        </>
      }
      subtitle={
        <>
          {load.customer} · Ref {load.reference}
        </>
      }
      actions={
        <>
          <Button variant="primary" className="h-9 flex-1">
            {load.status === 'in_transit' ? 'Mark delivered' : 'Open load'}
          </Button>
          <Button variant="secondary" className="h-9">
            Edit
          </Button>
        </>
      }
    >
      <PanelSection title="Route">
        <RouteStrip stops={load.stops} progress={load.progress} late={load.late} />
      </PanelSection>

      <PanelSection title="Assignment">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Fact label="Driver">
            {load.driver ?? <span className="text-text-faint">Unassigned</span>}
          </Fact>
          <Fact label="Unit" nums>
            {load.unit ?? <span className="text-text-faint">—</span>}
          </Fact>
          <Fact label="Pickup" nums>
            {load.pickup}
          </Fact>
          <Fact label="Delivery" nums>
            {load.delivery}
          </Fact>
        </dl>
      </PanelSection>

      <PanelSection title="Money">
        <dl className="grid grid-cols-3 gap-x-4">
          <Fact label="Rate" nums>
            {money(load.rateCents)}
          </Fact>
          <Fact label="Cost" nums>
            {load.costCents === 0 ? '—' : money(load.costCents)}
          </Fact>
          <Fact label="Margin" nums>
            {load.costCents === 0 ? '—' : money(margin)}
          </Fact>
        </dl>
        <p className="mt-4 text-label text-text-muted">
          <span className="nums">{load.miles}</span> miles ·{' '}
          <span className="nums">{perMile(load.rateCents, load.miles)}</span> per mile
          {load.costCents > 0 && (
            <>
              {' '}
              · <span className="nums">{perMile(margin, load.miles)}</span> margin per mile
            </>
          )}
        </p>
      </PanelSection>

      <PanelSection title="Documents">
        <ul className="space-y-1">
          {[
            { icon: FileText, name: 'Rate confirmation', meta: 'Read by AI · 2 fields corrected' },
            {
              icon: Paperclip,
              name: 'Bill of lading',
              meta: load.progress > 0 ? 'Uploaded by driver' : 'Not yet',
            },
            {
              icon: Paperclip,
              name: 'Proof of delivery',
              meta: load.progress === 1 ? 'Uploaded' : 'After unloading',
            },
          ].map((doc) => (
            <li key={doc.name} className="row flex items-center gap-3 px-2 py-2">
              <doc.icon size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-body">{doc.name}</span>
              <span className="shrink-0 text-label text-text-faint">{doc.meta}</span>
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="Timeline">
        <ol className="space-y-4">
          {[
            { when: '11:42', what: 'Check call: on I-20 near Birmingham, AL', icon: MapPin },
            {
              when: '08:14',
              what: 'BOL uploaded by ' + (load.driver ?? 'the driver'),
              icon: Paperclip,
            },
            {
              when: 'Nov 24',
              what: 'Assigned to ' + (load.driver ?? 'nobody') + ' (suggested)',
              icon: Truck,
            },
            { when: 'Nov 23', what: 'Created from rate con, 2 fields corrected', icon: FileText },
          ].map((event) => (
            <li key={event.when} className="flex gap-3">
              <event.icon
                size={13}
                strokeWidth={1.75}
                className="mt-1 shrink-0 text-text-faint"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="nums block text-label text-text-faint">{event.when}</span>
                <span className="block text-body text-text-secondary">{event.what}</span>
              </span>
            </li>
          ))}
        </ol>
      </PanelSection>
    </DetailPanel>
  );
}
