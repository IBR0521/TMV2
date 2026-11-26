import {
  Board,
  BoardRow,
  Button,
  Columns,
  DateRange,
  LoadBlock,
  MainColumn,
  PageHeader,
  Panel,
  PanelHeader,
  SideColumn,
  UnassignedLoad,
} from '@/ui';
import { requireSection } from '@/server/guard';
import { BOARD_BLOCKS, BOARD_TRUCKS, DAYS, UNASSIGNED } from './_sample';

export const metadata = { title: 'Dispatch' };

/**
 * The dispatch board, assembled from the kit exactly as DispatchPreview does.
 *
 * Phase 1 has no loads or trucks, so the rows are the sample figures from
 * docs/spec/approved-mockups.md and the subtitle says so. Phase 3 replaces the
 * sample with queries; the assembly does not change.
 */
export default async function DispatchPage() {
  await requireSection('dispatch');

  return (
    <>
      <PageHeader
        title="Dispatch"
        subtitle={`${BOARD_TRUCKS.length} trucks · ${UNASSIGNED.length} loads need a driver · sample data until phase 3`}
      >
        <DateRange label="Nov 25 – Nov 28" />
        <Button variant="primary">New load</Button>
      </PageHeader>

      <Columns gap="md">
        <SideColumn narrow>
          <Panel label="Needs a driver">
            <PanelHeader title="Needs a driver" count={UNASSIGNED.length} />
            {UNASSIGNED.map((load, index) => (
              <UnassignedLoad
                key={load.number}
                number={load.number}
                rateCents={load.rateCents}
                route={load.route}
                meta={load.meta}
                primary={index === 0}
              />
            ))}
          </Panel>
        </SideColumn>

        <MainColumn>
          <Panel label="Board">
            <Board days={DAYS}>
              {BOARD_TRUCKS.map((truck) => (
                <BoardRow
                  key={truck.unit}
                  days={DAYS.length}
                  unit={truck.unit}
                  driver={truck.driver}
                >
                  {BOARD_BLOCKS.filter((block) => block.unit === truck.unit).map((block) => (
                    <LoadBlock
                      key={`${block.unit}-${block.startDay}`}
                      kind={block.kind}
                      startDay={block.startDay}
                      span={block.span}
                      title={block.title}
                      detail={block.detail}
                    />
                  ))}
                </BoardRow>
              ))}
            </Board>
          </Panel>
        </MainColumn>
      </Columns>
    </>
  );
}
