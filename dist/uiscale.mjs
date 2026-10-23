// UI scale (System → Settings, `ui scale <auto|percent>`): the whole screen inside the monitor drawn larger or smaller,
// for big displays where the game's fixed pixel sizes read small. app.js sets --ui on the page (style.css zooms .app by
// it and divides the screen's height by it, so the screen still fits the monitor).
//
// The layout's breakpoints read the window's width, not the zoomed screen's, so a scale never leaves the screen
// narrower than the widest layout it was drawn for (MIN_WIDTH): on a 1920 screen there is no room to scale up (the
// browser's own zoom still works), at 2560 about 140%. Auto picks the scale that makes the screen as wide as the
// layout's home width (HOME_WIDTH), and never smaller than 100%.

export const STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2];
export const MIN_WIDTH = 1700; // the widest breakpoint inside the screen (style.css max-width: 1700px)
export const HOME_WIDTH = 1800; // the screen's max-width (style.css .app)
// The room the screen has now, in px (app.js keeps it up to date; the settings page reads it for its label).
export const ROOM = { avail: HOME_WIDTH };

const round = (z) => Math.round(z * 100) / 100;
// The most it can scale with `avail` px of screen: never under 1, so a small window can always shrink but never grow.
export const maxScale = (avail) => Math.max(1, Math.floor((avail / MIN_WIDTH) * 100) / 100); // rounded down, so it never overshoots
// The scale in force: the setting ('auto', or a fraction like 1.25), held within 0.8 and the room there is.
export function scaleFor(setting, avail) {
  const top = maxScale(avail);
  if (setting === 'auto') return round(Math.min(top, Math.max(1, avail / HOME_WIDTH)));
  const z = Number(setting);
  return round(Math.min(top, Math.max(STEPS[0], Number.isFinite(z) && z > 0 ? z : 1)));
}
// A command's argument: auto, or a percent (80 to 200) or a fraction. null when it isn't one.
export function parseScale(arg) {
  const a = String(arg || '').trim().toLowerCase().replace(/%$/, '');
  if (a === 'auto') return 'auto';
  const n = Number(a);
  if (!Number.isFinite(n) || n <= 0) return null;
  const z = n > 5 ? n / 100 : n;
  return z >= STEPS[0] && z <= STEPS.at(-1) ? round(z) : null;
}
// The label on the settings button: "UI scale: Auto (132%)" or "UI scale: 125%", and when the room caps it, what it got.
export function scaleLabel(setting, avail) {
  const z = scaleFor(setting ?? 1, avail), pct = `${Math.round(z * 100)}%`;
  if ((setting ?? 1) === 'auto') return `UI scale: Auto (${pct})`;
  const want = Math.round(Number(setting ?? 1) * 100);
  return want === Math.round(z * 100) ? `UI scale: ${pct}` : `UI scale: ${want}% (${pct} fits)`;
}
// The next setting a click on the button gives: Auto, then each step that fits, then back to Auto.
export function nextScale(setting, avail) {
  const fits = STEPS.filter((z) => z <= maxScale(avail));
  if ((setting ?? 1) === 'auto') return fits[0];
  const i = fits.findIndex((z) => z > Number(setting ?? 1) + 1e-9);
  return i < 0 ? 'auto' : fits[i];
}
