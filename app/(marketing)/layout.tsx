import Link from 'next/link';
import { Mark } from '@/ui/sidebar';

/** The small pages around the app: sign in, reset a password, set up a carrier. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <Mark />
        <span className="text-body-strong">TruckMates</span>
      </Link>
      <main className="w-full max-w-[400px]">{children}</main>
    </div>
  );
}
