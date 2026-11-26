# Wiring the kit into the Next.js app

1. **Path alias.** In `tsconfig.json`: `"paths": { "@/ui": ["./src/ui/index.ts"], "@/ui/*": ["./src/ui/*"] }`.

2. **Fonts.** `pnpm add geist`. In `app/layout.tsx`:

   ```tsx
   import { GeistSans } from "geist/font/sans";
   import { GeistMono } from "geist/font/mono";
   import "./globals.css";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
         <body>{children}</body>
       </html>
     );
   }
   ```

   The theme reads `--font-geist-sans` and `--font-geist-mono`, which these set.

3. **Styles.** `app/globals.css` contains exactly:

   ```css
   @import "tailwindcss";
   @import "../src/ui/theme.css";
   @source "../src/ui";
   ```

   Nothing else goes in globals.css.

4. **Links.** Edit `src/ui/link.tsx` so `UiLink` returns `next/link` (the comment in the file shows how).

5. **Design preview route.** Copy `design/app-snippets/design-preview-page.tsx` to `app/design-preview/[screen]/page.tsx`.

6. **Playwright config.** Add `snapshotPathTemplate: "{testDir}/__baseline__/{arg}{ext}"`, and a `webServer` that starts the app with `NEXT_PUBLIC_DESIGN_PREVIEW=1`. Put `tests/visual/design.spec.ts` in the Playwright test directory.

7. **Scripts and CI.** In package.json: `"check:ui": "node scripts/check-ui.mjs"` and `"test:visual": "playwright test tests/visual"`. CI runs both on every pull request. They must pass for a phase to be done.

8. **Interactivity.** Kit components are plain server-compatible components. When a screen needs state or handlers, make a small client component that composes kit components and passes handlers in. Don't copy kit markup to add behavior.
