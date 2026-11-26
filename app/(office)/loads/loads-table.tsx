'use client';

import { useMemo, useState } from 'react';
import { FileText, MapPin, Paperclip, Truck } from 'lucide-react';
import { Button } from '@/ui/button';
import { DetailPanel, Fact, PanelSection } from '@/ui/detail-panel';
import { Pill, LiveDot, type Tone } from '@/ui/pill';
import { Lane, RouteStrip } from '@/ui/route-strip';
import {
  Checkbox,
  SelectionBar,
  Table,
  Td,
  Th,
  Thead,
  Tr,
  type SortDirection,
} from '@/ui/table';
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
 * The loads screen: a table you sort, select from and open beside the list.
 *
 * This is the shape dispatch work actually takes — forty rows, a view for the
 * question you are asking, and a detail that opens without throwing the list
 * away. Phase 3 replaces SAMPLE_LOADS with the database; nothing else here
 * changes.
 */
type SortKey = 'number' | 'pickup' | 'customer' | 'miles' | 'rate' | 'margin';

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'driver', label: 'Needs a driver' },
  { key: 'transit', label: 'In transit' },
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

function marginCents(load: SampleLoad): number {
  return load.rateCents - load.costCents;
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

    const sorted = [...filtered].sort((a, b) => {
      const factor = direction === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'number':
          return a.number.localeCompare(b.number) * factor;
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

    return sorted;
  }, [view, sortKey, direction, lateOnly]);

  const open = rows.find((load) => load.id === openId) ?? null;
  const allShown = rows.length > 0 && rows.every((load) => selected.has(load.id));

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setDirection(key === 'rate' || key === 'margin' || key === 'miles' ? 'desc' : 'asc');
  }

  function sortOf(key: SortKey): SortDirection {
    return key === sortKey ? direction : null;
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const counts = useMemo(
    () =>
      Object.fromEntries(
        VIEWS.map((v) => [v.key, SAMPLE_LOADS.filter((load) => matchesView(load, v.key)).length]),
      ) as Record<ViewKey, number>,
    [],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 pb-3">
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
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="min-w-[1140px]">
            <Thead>
              <Th width="36px">
                <Checkbox
                  checked={allShown}
                  label="Select every load shown"
                  onChange={() =>
                    setSelected(allShown ? new Set() : new Set(rows.map((load) => load.id)))
                  }
                />
              </Th>
              <Th width="92px" sort={sortOf('number')} onSort={() => sortBy('number')}>
                Load
              </Th>
              <Th width="118px">Status</Th>
              <Th sort={sortOf('customer')} onSort={() => sortBy('customer')}>
                Customer
              </Th>
              <Th>Lane</Th>
              <Th width="130px" sort={sortOf('pickup')} onSort={() => sortBy('pickup')}>
                Pickup
              </Th>
              <Th width="140px">Driver</Th>
              <Th width="80px" align="right" sort={sortOf('miles')} onSort={() => sortBy('miles')}>
                Miles
              </Th>
              <Th width="96px" align="right" sort={sortOf('rate')} onSort={() => sortBy('rate')}>
                Rate
              </Th>
              <Th width="104px" align="right" sort={sortOf('margin')} onSort={() => sortBy('margin')}>
                Margin
              </Th>
            </Thead>

            <tbody>
              {rows.map((load) => (
                <Tr
                  key={load.id}
                  selected={selected.has(load.id) || openId === load.id}
                  onClick={() => setOpenId(load.id === openId ? null : load.id)}
                >
                  <Td>
                    <Checkbox
                      checked={selected.has(load.id)}
                      label={`Select load ${load.number}`}
                      onChange={() => toggle(load.id)}
                    />
                  </Td>
                  <Td nums>#{load.number}</Td>
                  <Td>
                    <Pill tone={load.late ? 'risk' : STATUS_TONE[load.status]}>
                      {load.status === 'in_transit' && !load.late && <LiveDot />}
                      {load.late ? 'Late' : STATUS_LABEL[load.status]}
                    </Pill>
                  </Td>
                  <Td className="truncate">{load.customer}</Td>
                  <Td className="text-text-secondary">
                    <Lane from={load.from} to={load.to} />
                  </Td>
                  <Td nums muted>
                    {load.pickup}
                  </Td>
                  <Td>
                    {load.driver ? (
                      <span className="flex items-center gap-2">
                        <span className="unit text-label">{load.unit}</span>
                        <span className="truncate text-text-secondary">{load.driver}</span>
                      </span>
                    ) : (
                      <span className="text-text-faint">Unassigned</span>
                    )}
                  </Td>
                  <Td nums muted align="right">
                    {load.miles}
                  </Td>
                  <Td nums align="right">
                    {money(load.rateCents)}
                  </Td>
                  <Td nums align="right">
                    {load.costCents === 0 ? (
                      <span className="text-text-faint">—</span>
                    ) : (
                      money(marginCents(load))
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>

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
          <Button variant="primary" className="h-8 flex-1">
            {load.status === 'in_transit' ? 'Mark delivered' : 'Open load'}
          </Button>
          <Button variant="secondary" className="h-8">
            Edit
          </Button>
        </>
      }
    >
      <PanelSection title="Route">
        <RouteStrip stops={load.stops} progress={load.progress} late={load.late} />
      </PanelSection>

      <PanelSection title="Assignment">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
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
        <p className="mt-3 text-label text-text-muted">
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
            { icon: Paperclip, name: 'Bill of lading', meta: load.progress > 0 ? 'Uploaded by driver' : 'Not yet' },
            { icon: Paperclip, name: 'Proof of delivery', meta: load.progress === 1 ? 'Uploaded' : 'After unloading' },
          ].map((doc) => (
            <li key={doc.name} className="row flex items-center gap-2.5 px-2 py-1.5">
              <doc.icon size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-body">{doc.name}</span>
              <span className="shrink-0 text-label text-text-faint">{doc.meta}</span>
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="Timeline">
        <ol className="space-y-3">
          {[
            { when: '11:42', what: 'Check call: on I-20 near Birmingham, AL', icon: MapPin },
            { when: '08:14', what: 'BOL uploaded by ' + (load.driver ?? 'the driver'), icon: Paperclip },
            { when: 'Nov 24', what: 'Assigned to ' + (load.driver ?? 'nobody') + ' (suggested)', icon: Truck },
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
