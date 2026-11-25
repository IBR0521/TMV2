import Link from 'next/link';

/** The small pages around the app: sign in, reset a password, set up a carrier. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-primary text-[15px] font-semibold text-on-primary"
        >
          T
        </span>
        <span className="text-[16px] font-semibold">TruckMates</span>
      </Link>
      <main className="w-full max-w-[420px]">{children}</main>
    </div>
  );
}
