import { DriverCaption, DriverCard, DriverScreen } from '@/ui';

/**
 * The driver app is phase 4. Until then a driver who signs in lands here
 * rather than on an office screen it has no business seeing.
 */
export const metadata = { title: 'Driver' };

export default function DriverPlaceholder() {
  return (
    <DriverScreen title="TruckMates" tab="loads">
      <DriverCaption>Driver app</DriverCaption>
      <DriverCard label="Coming in phase 4">
        <div className="font-medium">The driver app arrives in phase 4</div>
        <DriverCaption>
          Your loads, arrival and departure times and document photos will live here.
        </DriverCaption>
      </DriverCard>
    </DriverScreen>
  );
}
