// The window behind the monitor: what shows in the strips beside, above and below the casing with the Window setting
// on (casing on, a window 1700px wide or more). The city seen through grimy glass: far towers in three depths with
// lit windows, a fire escape and a tower face up close, two soft neon signs (marks, never words), the blinds pulled
// up, a transom and the sill. The sky is tinted by the hour (night, dawn, day, dusk), and the weather, which turns
// over every few minutes, shows only as haze: clear, wet (drizzle, rain, a storm) or fog. Nothing falls, nothing
// flashes; only the smog drifts, very slowly.
//
// DOM, CSS and SVG only (window.css): one layer behind the page (z-index -2), masked so it never paints inside the
// monitor's frame, never catches a click, and everything that moves stops with Motion off or reduced motion. The
// script only looks at the clock and the weather once a minute; CSS fades between them. The weather is picked from
// the clock, so a reload doesn't reroll it. Phones and small windows never show it (the casing's own media query).
export const WEATHER = {
  clear: { rain: 0, fog: 0.12 },
  fog: { rain: 0, fog: 0.75 },
  drizzle: { rain: 0.28, fog: 0.3 },
  rain: { rain: 0.7, fog: 0.35 },
  storm: { rain: 1, fog: 0.4 },
};
const ODDS = [['rain', 30], ['drizzle', 22], ['storm', 16], ['fog', 16], ['clear', 16]];
export const SPELL_MS = 5 * 60000; // how long a spell of weather lasts

// Deterministic randomness: the city is the same city every time you load.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function weatherAt(ms) {
  const r = seeded(Math.floor(ms / SPELL_MS) * 7919 + 13)();
  let n = r * ODDS.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of ODDS) { if ((n -= w) < 0) return k; }
  return 'rain';
}
// The weather on the glass: only ever a haze. Drizzle, rain and storms read as wet.
export const hazeOf = (name) => (name === 'clear' || name === 'fog' ? name : 'wet');
// The sky follows the clock.
export function timeOfDay(d = new Date()) {
  const h = d.getHours();
  return h >= 21 || h < 5 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : 'dusk';
}

const n1 = (v) => Math.round(v * 10) / 10;
// The far city: one SVG drawn to 1920×1080 and sliced to the window (only its edges and its top show beside the
// monitor). Three depths of towers, darker as they come closer, and a few lit windows, mostly amber.
export function cityMarkup() {
  const r = seeded(4242), W = 1920, H = 1080;
  const far = [], mid = [], mega = [], lit = [[], []];
  const seen = (x, y) => x < 300 || x > W - 300 || y < 140; // where a window shows at all
  const windows = (x0, w, top, step, odds) => {
    for (let y = top + step; y < H - step; y += step * 2) for (let x = x0 + step * 0.6; x < x0 + w - step; x += step * 1.7) {
      if (!seen(x, y) || r() > odds) continue;
      lit[r() < 0.75 ? 0 : 1].push(`M${n1(x)} ${n1(y)}h${n1(step * 0.8)}v${n1(step * 0.6)}h-${n1(step * 0.8)}z`);
    }
  };
  for (let x = -20; x < W; x += 16 + r() * 44) { const w = 24 + r() * 50, top = 470 + r() * 200; far.push(`M${n1(x)} ${H}V${n1(top)}h${n1(w)}V${H}z`); }
  for (let x = -30; x < W; x += 26 + r() * 56) {
    const w = 34 + r() * 60, top = 300 + r() * 300;
    mid.push(`M${n1(x)} ${H}V${n1(top)}h${n1(w)}V${H}z`);
    if (r() < 0.4) mid.push(`M${n1(x + w * 0.3)} ${n1(top)}v-${n1(8 + r() * 14)}h1.5V${n1(top)}z`); // an antenna
    windows(x, w, top, 3, 0.08);
  }
  // Megatowers: thin, far taller than the rest. Near the edges their crowns rise above the monitor.
  for (let x = 60 + r() * 60; x < W; x += 150 + r() * 210) {
    const w = 16 + r() * 18, edge = x < 260 || x > W - 280, top = edge ? 30 + r() * 60 : 90 + r() * 160;
    mega.push(`M${n1(x)} ${H}V${n1(top)}h${n1(w)}V${H}z`, `M${n1(x + w * 0.2)} ${n1(top)}v-4h${n1(w * 0.6)}v4z`, `M${n1(x + w * 0.45)} ${n1(top - 4)}v-${n1(12 + r() * 12)}h1.5v${n1(12 + r() * 12)}z`);
    windows(x, w, top + 4, 4, 0.16);
  }
  return `<svg class="wv-city" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`
    + `<path class="wv-far" d="${far.join('')}"/><path class="wv-mid" d="${mid.join('')}"/><path class="wv-mega" d="${mega.join('')}"/>`
    + `<path class="wv-lit" d="${lit[0].join('')}"/><path class="wv-lit2" d="${lit[1].join('')}"/></svg>`;
}
// Up close: a neon sign of glyph-ish marks (never words).
const SIGN = (cls, h) => `<svg class="${cls}" viewBox="0 0 18 ${h}" aria-hidden="true"><rect x="1" y="1" width="16" height="${h - 2}" rx="1.5"/>${Array.from({ length: Math.floor((h - 8) / 16) }, (_, i) => { const y = 6 + i * 16; return `<path d="M5 ${y}h8M${i % 2 ? 9 : 6} ${y}v8M5 ${y + 8}h${i % 3 ? 8 : 5}"/>`; }).join('')}</svg>`;

// The whole view: sky, far city, smog, haze and the hour's tint; then the two strips up close (a tower face each, the
// fire escape, the signs, the window's posts); then the glass, the screen's glow on it, the blinds, the transom; and
// the sill under the monitor.
export function windowMarkup() {
  return `<i class="wv-sky"></i>${cityMarkup()}<i class="wv-smog"></i><i class="wv-haze"></i><i class="wv-tint"></i>`
    + `<div class="wv-l"><i class="wv-face"><i class="wv-esc"></i></i>${SIGN('wv-sign rose', 56)}<i class="wv-post"></i></div>`
    + `<div class="wv-r"><i class="wv-face"></i>${SIGN('wv-sign', 150)}<i class="wv-post"></i></div>`
    + '<i class="wv-glass"></i><i class="wv-halo"></i><i class="wv-head"></i><i class="wv-transom"></i>'
    + '<div class="wv-f"><i class="wv-sill"></i></div>';
}

export function createWindow({ onWeather = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'window-view';
  el.setAttribute('aria-hidden', 'true');
  let on = false, timer = 0, override = null, tod = null, name = null;
  function tick() {
    el.dataset.tod = tod || timeOfDay();
    const w = override || weatherAt(Date.now());
    if (w !== name) { name = w; el.dataset.wx = hazeOf(w); onWeather(w, WEATHER[w]); }
  }
  return {
    el,
    // Show or hide it (casing on and the Window setting on).
    set(show) {
      if (!!show === on) return;
      on = !!show; clearInterval(timer); name = null;
      if (!on) { el.remove(); el.innerHTML = ''; return; }
      el.innerHTML = windowMarkup();
      document.body.prepend(el);
      tick(); timer = setInterval(tick, 60000);
    },
    // weather <name>|auto, and ?tod= for a look at another hour.
    force(w) { override = WEATHER[w] ? w : null; if (on) tick(); },
    hour(t) { tod = ['night', 'dawn', 'day', 'dusk'].includes(t) ? t : null; if (on) tick(); },
    get on() { return on; },
    get weather() { return name || weatherAt(Date.now()); },
  };
}
