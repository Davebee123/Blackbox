// Saves the Steam capsules (press/capsules.html) as PNGs at their exact sizes, beside it or in the folder given.
//   node press/render.mjs [out dir] [seed]
// Needs Playwright's Chromium and the network (the fonts load from Google Fonts).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const [out = here, seed = ''] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(here, 'capsules.html')}${seed ? `?seed=${seed}` : ''}`);
const loaded = await page.evaluate(async () => {
  await document.fonts.ready;
  return document.fonts.check("14px 'IBM Plex Mono'") && document.fonts.check("40px 'Inter Tight'");
});
if (!loaded) { console.error('render: the fonts did not load (is Google Fonts reachable?)'); process.exit(1); }
for (const cap of await page.$$('.cap')) {
  const file = path.join(out, `blackbox-capsule-${await cap.getAttribute('data-size')}.png`);
  await cap.screenshot({ path: file });
  console.log(file);
}
await browser.close();
