// Saves the Steam capsules, the Discord art and the logo (press/capsules.html) as PNGs at their exact sizes, beside it or in the
// folder given.
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
  const name = (await cap.getAttribute('data-file')) || `capsule-${await cap.getAttribute('data-size')}`;
  const file = path.join(out, `blackbox-${name}.png`);
  await cap.screenshot({ path: file });
  console.log(file);
}
// the logo, on transparent ground
await page.evaluate(() => { document.body.style.background = 'transparent'; });
const logo = path.join(out, 'blackbox-logo.png');
await (await page.$('.logo')).screenshot({ path: logo, omitBackground: true });
console.log(logo);
// Discord's invite splash: the banner at 2x (1920x1080)
const hi = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await hi.goto(`file://${path.join(here, 'capsules.html')}${seed ? `?seed=${seed}` : ''}`);
await hi.evaluate(() => document.fonts.ready);
const splash = path.join(out, 'blackbox-discord-splash.png');
await (await hi.$('[data-file="discord-banner"]')).screenshot({ path: splash });
console.log(splash);
await browser.close();
