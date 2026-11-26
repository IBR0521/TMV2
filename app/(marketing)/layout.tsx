import { UiLink } from '@/ui';

/** The small pages around the app: sign in, reset a password, set up a carrier. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-10">
      <UiLink href="/" className="text-16 font-semibold">
        TruckMates
      </UiLink>
      <main className="w-full max-w-md flex flex-col gap-5">{children}</main>
    </div>
  );
}
