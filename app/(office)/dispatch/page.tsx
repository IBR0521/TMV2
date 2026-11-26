import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button';
import { SampleNotice } from '@/ui/app-frame';
import { LiveDot } from '@/ui/pill';
import { requireSection } from '@/server/guard';
import {
  BOARD_BLOCKS,
  BOARD_TRUCKS,
  DAYS,
  UNASSIGNED,
  type BlockState,
} from './_sample';

export const metadata = { title: 'Dispatch' };

/**
 * The dispatch board: trucks down the side, the next four days across, every
 * commitment a block you can read at a glance, and the loads with nobody on
 * them in a rail beside it.
 *
 * This is the screen the week is planned on, so colour is doing real work
 * here: green is running to plan, red is late, amber is being loaded now, a
 * dashed amber outline is the worker's suggestion, and a dashed grey one is a
 * truck with nothing to do.
 */
const BLOCK: Record<BlockState, { className: string; style?: React.CSSProperties }> = {
  transit: {
    className: 'text-text',
    style: {
      background: 'var(--color-ok-fill)',
      border: '1px solid var(--color-ok-border)',
    },
  },
  booked: {
    className: 'text-text',
    style: {
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border-input)',
    },
  },
  late: {
    className: 'text-danger',
    style: {
      background: 'var(--color-danger-fill)',
      border: '1px solid var(--color-danger-border)',
    },
  },
  loading: {
    className: 'text-text',
    style: {
      background: 'rgb(255 178 36 / 0.12)',
      border: '1px solid rgb(255 178 36 / 0.45)',
    },
  },
  suggested: {
    className: 'text-link',
    style: { background: 'transparent', border: '1px dashed rgb(255 178 36 / 0.55)' },
  },
  available: {
    className: 'text-text-muted',
    style: { background: 'transparent', border: '1px dashed var(--color-border-control)' },
  },
  home: {
    className: 'text-text-muted',
    style: {
      background: 'var(--color-neutral-fill)',
      border: '1px solid var(--color-border)',
    },
  },
};

export default async function DispatchPage() {
  await requireSection('dispatch');

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-8 pt-6 pb-4">
        <h1 className="text-page-title">Dispatch</h1>
        <span className="text-label text-text-muted">
          <span className="nums">{BOARD_TRUCKS.length}</span> trucks ·{' '}
          <span className="nums">{UNASSIGNED.length}</span> loads need a driver
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center rounded-md bg-surface p-0.5">
            <button
              type="button"
              aria-label="Previous days"
              className="row flex h-7 w-7 items-center justify-center text-text-muted hover:text-text"
            >
              <ChevronLeft size={15} strokeWidth={1.75} aria-hidden />
            </button>
            <span className="nums px-2 text-body">25 – 28 Nov</span>
            <button
              type="button"
              aria-label="Next days"
              className="row flex h-7 w-7 items-center justify-center text-text-muted hover:text-text"
            >
              <ChevronRight size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </span>
          <Button variant="primary">New load</Button>
        </div>
      </div>

      <SampleNotice phase="phase 3" what="The dispatch board" />

      <div className="flex min-h-0 flex-1 flex-col-reverse xl:flex-row">
        <section className="min-w-0 flex-1 overflow-auto px-8 py-6">
          <div className="min-w-[860px]">
            <div
              className="grid border-b border-border pb-2"
              style={{ gridTemplateColumns: '184px repeat(4, minmax(0, 1fr))' }}
            >
              <span className="text-label text-text-muted">Truck</span>
              {DAYS.map((day) => (
                <span key={day.date} className="px-2 text-label">
                  <span className={day.today ? 'text-text' : 'text-text-muted'}>{day.label}</span>{' '}
                  <span className={day.today ? 'nums text-text' : 'nums text-text-faint'}>
                    {day.date}
                  </span>
                  {day.today && <span className="ml-1.5 text-primary">today</span>}
                </span>
              ))}
            </div>

            {BOARD_TRUCKS.map((truck) => (
              <div
                key={truck.unit}
                className="grid items-stretch border-b border-border"
                style={{ gridTemplateColumns: '184px repeat(4, minmax(0, 1fr))', minHeight: 68 }}
              >
                <div className="flex items-center gap-2.5 py-2.5 pr-3">
                  <span className="unit text-label">{truck.unit}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-body">{truck.driver}</span>
                    <span className="nums block text-label text-text-faint">
                      Trailer {truck.trailer}
                    </span>
                  </span>
                </div>

                {DAYS.map((day, index) => (
                  <div
                    key={day.date}
                    className="border-l border-border/70"
                    style={{ gridRow: 1, gridColumnStart: 2 + index, gridColumnEnd: 3 + index }}
                  />
                ))}

                {BOARD_BLOCKS.filter((block) => block.unit === truck.unit).map((block) => {
                  const look = BLOCK[block.state];
                  return (
                    <div
                      key={`${block.unit}-${block.day}`}
                      className={`m-1.5 flex flex-col justify-center rounded-sm px-2.5 py-1.5 ${look.className}`}
                      style={{
                        ...look.style,
                        gridRow: 1,
                        gridColumnStart: 2 + block.day,
                        gridColumnEnd: 2 + block.day + block.span,
                      }}
                    >
                      <span className="flex items-center gap-1.5 truncate text-label font-medium">
                        {block.state === 'transit' && <LiveDot />}
                        {block.title}
                      </span>
                      {block.detail && (
                        <span className="truncate text-label opacity-75">{block.detail}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <Legend />
          </div>
        </section>

        <aside className="w-full shrink-0 border-border xl:w-[320px] xl:border-l">
          <div className="flex items-baseline gap-2 border-b border-border px-6 py-4">
            <h2 className="text-section-title">Needs a driver</h2>
            <span className="nums text-label text-text-muted">{UNASSIGNED.length}</span>
          </div>

          <ul className="space-y-1 p-4">
            {UNASSIGNED.map((load, index) => (
              <li key={load.number} className="row px-2 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="nums text-body-strong">#{load.number}</span>
                  <span className="nums text-body">{load.rate}</span>
                </div>
                <p className="mt-1 truncate text-body text-text-secondary">{load.route}</p>
                <p className="nums mt-0.5 text-label text-text-muted">
                  {load.when} · {load.miles}
                </p>
                {load.suggestion && (
                  <p className="mt-1.5 text-label text-link">Suggested: {load.suggestion}</p>
                )}
                <Button
                  variant={index === 0 ? 'primary' : 'secondary'}
                  className="mt-2.5 h-8 w-full px-3"
                >
                  Assign
                </Button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function Legend() {
  const items: { state: BlockState; label: string }[] = [
    { state: 'transit', label: 'Running to plan' },
    { state: 'late', label: 'Late' },
    { state: 'loading', label: 'Loading now' },
    { state: 'booked', label: 'Booked' },
    { state: 'suggested', label: 'Suggested' },
    { state: 'available', label: 'Free' },
    { state: 'home', label: 'Home time' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
      {items.map((item) => (
        <span key={item.state} className="flex items-center gap-2 text-label text-text-muted">
          <span
            aria-hidden
            className="h-3 w-5 rounded-[3px]"
            style={BLOCK[item.state].style}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
