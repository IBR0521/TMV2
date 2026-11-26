// Put this file at: app/design-preview/[screen]/page.tsx
// It renders the approved screens from kit components so the visual test can compare them.
// It is only reachable when NEXT_PUBLIC_DESIGN_PREVIEW=1 (local dev and CI), never in production.
import { notFound } from "next/navigation";
import { TodayPreview } from "@/ui/previews/TodayPreview";
import { DispatchPreview } from "@/ui/previews/DispatchPreview";
import { LoadPreview } from "@/ui/previews/LoadPreview";
import { DriverPreview } from "@/ui/previews/DriverPreview";

const SCREENS = {
  today: TodayPreview,
  dispatch: DispatchPreview,
  load: LoadPreview,
  driver: DriverPreview,
} as const;

export default async function DesignPreviewPage({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NEXT_PUBLIC_DESIGN_PREVIEW !== "1") notFound();
  const { screen } = await params;
  const Screen = SCREENS[screen as keyof typeof SCREENS];
  if (!Screen) notFound();
  return <Screen />;
}
