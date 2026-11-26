import { cn } from "./cn";

/**
 * The TruckMates mark and name. Defined once so the sidebar and the pages
 * outside the app frame (sign in, create account, join) cannot drift apart.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="size-6.5 rounded-md bg-primary flex items-center justify-center text-13 font-semibold text-on-primary">T</div>
      <div className="text-16 font-semibold">TruckMates</div>
    </div>
  );
}
