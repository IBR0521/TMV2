import { Panel } from '@/ui/panel';
import { EmptyState } from '@/ui/empty-state';

/**
 * The driver app is phase 4. Until then a driver who signs in lands here
 * rather than on an office screen it has no business seeing.
 */
export const metadata = { title: 'Driver' };

export default function DriverPlaceholder() {
  return (
    <div className="mx-auto max-w-[420px] px-4 py-10">
      <Panel>
        <EmptyState
          title="The driver app arrives in phase 4"
          detail="Your loads, arrival and departure times and document photos will live here."
        />
      </Panel>
    </div>
  );
}
