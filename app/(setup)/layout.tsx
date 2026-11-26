import { UiLink } from '@/ui';

/**
 * Setting up a carrier, before the app proper.
 *
 * Its own layout rather than the marketing one because these steps carry a
 * spreadsheet preview, and the sign-in pages are deliberately narrow. No
 * sidebar: there is nothing to navigate to yet, and the only thing to do is
 * the step on screen.
 */
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center gap-6 px-4 py-10">
      <UiLink href="/" className="text-16 font-semibold">
        TruckMates
      </UiLink>
      <main className="w-full max-w-4xl flex flex-col gap-5">{children}</main>
    </div>
  );
}
