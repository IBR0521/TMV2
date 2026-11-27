import {
  Board,
  BoardRow,
  Button,
  DateRange,
  EmptyState,
  LoadBlock,
  MainColumn,
  Columns,
  PageHeader,
  Panel,
  PanelHeader,
  SideColumn,
} from '@/ui';
import { requireSection } from '@/server/guard';
import { board, BOARD_DAYS } from '@/server/services/board';
import { AssignPanel } from './assign-panel';

export const metadata = { title: 'Dispatch' };

/**
 * The dispatch board (docs/spec/screens.md, row 5), assembled from the
 * approved screen in src/ui/previews/DispatchPreview.tsx: the loads waiting
 * for a driver down the side, trucks by day in the middle.
 *
 * Nothing on this screen is stored. A truck is busy on Thursday because a
 * load it is on has a stop on Thursday, and free the rest of the time — there
 * is no schedule table to disagree with the loads.
 *
 * The dashed "suggested" blocks the approved screen shows come with the
 * ranking rule, which is its own step.
 */
function range(days: { date: string }[]): string {
  const format = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  if (first === undefined || last === undefined) return '';
  return `${format(first)} – ${format(last)}`;
}

export default async function DispatchPage() {
  const ctx = await requireSection('dispatch');
  const data = await board(ctx);

  const waiting = data.unassigned.map((load) => ({
    id: load.id,
    loadNumber: load.loadNumber,
    rateCents: load.rateCents,
    route: `${load.from ?? '—'} → ${load.to ?? '—'}`,
    meta: [
      load.firstPickupAt === null
        ? 'No pickup time'
        : new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date(load.firstPickupAt)),
      load.totalMiles === null ? null : `${load.totalMiles.toLocaleString('en-US')} mi`,
    ]
      .filter((part): part is string => part !== null)
      .join(' · '),
  }));

  return (
    <>
      <PageHeader
        title="Dispatch"
        subtitle={`${data.trucks.length} ${data.trucks.length === 1 ? 'truck' : 'trucks'} · ${waiting.length} ${waiting.length === 1 ? 'load needs' : 'loads need'} a driver`}
      >
        <DateRange label={range(data.days)} />
        <Button variant="primary" href="/loads/new">
          New load
        </Button>
      </PageHeader>

      <Columns gap="md">
        <SideColumn narrow>
          <Panel label="Needs a driver">
            <PanelHeader title="Needs a driver" count={waiting.length} />
            <AssignPanel waiting={waiting} drivers={data.drivers} trucks={data.trucksForAssigning} />
          </Panel>
        </SideColumn>

        <MainColumn>
          <Panel label="Board">
            {data.trucks.length === 0 ? (
              <EmptyState
                title="No active trucks"
                hint="Add a truck in Fleet and it appears here."
                action={<Button href="/fleet/units/new">New truck</Button>}
              />
            ) : (
              <Board days={data.days.map((day) => ({ label: day.label, today: day.today }))}>
                {data.trucks.map((truck) => (
                  <BoardRow
                    key={truck.truckId}
                    days={BOARD_DAYS}
                    unit={truck.unit}
                    driver={truck.driver}
                  >
                    {truck.blocks.map((block) => (
                      <LoadBlock
                        key={`${block.kind}-${block.startDay}-${block.loadId ?? 'free'}`}
                        kind={block.kind}
                        startDay={block.startDay}
                        span={block.span}
                        title={block.title}
                        detail={block.detail ?? undefined}
                      />
                    ))}
                  </BoardRow>
                ))}
              </Board>
            )}
          </Panel>
        </MainColumn>
      </Columns>
    </>
  );
}
