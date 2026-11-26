import { expect, test } from "@playwright/test";

/**
 * Visual guard: the kit must keep rendering the approved screens.
 * Each /design-preview/<screen> page renders a preview built only from src/ui.
 * Baselines in tests/visual/__baseline__ belong to the OWNER:
 * never run --update-snapshots for this file without the owner's written approval.
 *
 * playwright.config.ts needs:
 *   snapshotPathTemplate: "{testDir}/__baseline__/{arg}{ext}",
 *   and a webServer that runs the app with NEXT_PUBLIC_DESIGN_PREVIEW=1.
 * Run in CI on Linux (the baselines were rendered with Chromium on Linux).
 */
const SCREENS = [
  { name: "today", width: 1440, height: 900, fullPage: true },
  { name: "dispatch", width: 1440, height: 860, fullPage: true },
  { name: "load", width: 1440, height: 900, fullPage: true },
  { name: "driver", width: 390, height: 844, fullPage: false },
];

for (const s of SCREENS) {
  test(`design preview matches approved screen: ${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.width, height: s.height });
    await page.goto(`/design-preview/${s.name}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${s.name}.png`, {
      fullPage: s.fullPage,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });
}
