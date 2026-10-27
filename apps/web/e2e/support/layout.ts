import type { Page } from '@playwright/test';

/**
 * Whether the PAGE scrolls sideways — what a phone user would feel as the screen sliding.
 *
 * Two traps this avoids:
 * - The app sets `scroll-behavior: smooth`, so a plain `window.scrollTo(9999, 0)` only *starts*
 *   an animation and `scrollX` still reads 0 straight after. The probe asks for `instant`.
 * - `body.scrollWidth` misses an absolutely positioned element whose containing block is the
 *   viewport (an `sr-only` span with no positioned ancestor, say), which is exactly what pushed
 *   the Q2 tables' page out to 900px. The root's scrollWidth counts it.
 *
 * A wide table inside its own `overflow-x: auto` wrapper does not count: the wrapper clips it.
 */
export async function pageScrollsSideways(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    window.scrollTo({ left: 99999, top: window.scrollY, behavior: 'instant' });
    const moved = window.scrollX > 0;
    window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' });
    return moved || root.scrollWidth > root.clientWidth + 1;
  });
}

/** The viewports the responsive audit covers, smallest first. */
export const VIEWPORTS = [
  { name: 'small mobile', width: 320, height: 568 },
  { name: 'mobile', width: 375, height: 667 },
  { name: 'modern mobile', width: 390, height: 844 },
  { name: 'large mobile', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const;
