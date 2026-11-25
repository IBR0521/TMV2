import { Panel, PanelHeader } from './panel';
import { EmptyState } from './empty-state';
import { PageHeader } from './page-header';

/**
 * A section that exists in the menu but is built in a later phase. It says so
 * plainly rather than showing a half-working screen.
 */
export function PlaceholderPage({
  title,
  subline,
  panelTitle,
  arrives,
}: {
  title: string;
  subline: string;
  panelTitle: string;
  arrives: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subline={subline} />
      <Panel>
        <PanelHeader title={panelTitle} />
        <EmptyState title="Nothing here yet" detail={arrives} />
      </Panel>
    </div>
  );
}
