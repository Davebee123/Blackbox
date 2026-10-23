// The room around the monitor: what shows in the strips beside, above and below the casing when the Window setting
// is on (casing on, a window 1700px or wider). Four to pick from while the designer chooses (System → Settings →
// Room, `room style <name>`, or `?room=a|b|c` for this visit only):
//   city  the slum outside, on a canvas (window.mjs). Today's, and the default.
//   desk  A: the monitor on a desk in a dark room. A lamp, a mug, a sticky note and cables in silhouette, the screen's
//         amber spilling onto the desk. Still.
//   view  B: the window, refined. Far towers, a fire escape and a tower face up close, two soft neon signs, the sky
//         tinted by the hour (night, dawn, day, dusk) and the weather as haze only: nothing falls.
//   void  C: a near-black room with only light. The screen's glow on the wall, its scanlines reflected in the desk,
//         one distant light, breathing slowly.
// DOM, CSS and SVG only (surround.css): one layer behind the page (z-index -2, as the window), masked so it never
// paints inside the monitor's frame, never catches a click, and everything that moves stops with Motion off or
// reduced motion. Phones and small windows never show it (the casing's own media query).
import { WEATHER, weatherAt } from './window.mjs';

export const SURROUNDS = {
  city: { name: 'City', tip: 'The slum outside, and its weather.' },
  desk: { name: 'Desk', tip: 'A desk in a dark room, lit by the screen.' },
  view: { name: 'View', tip: 'The city through the glass, tinted by the hour.' },
  void: { name: 'Void', tip: 'A dark room with only the screen\'s light.' },
};
export const SURROUND_IDS = Object.keys(SURROUNDS);
const LETTER = { a: 'desk', b: 'view', c: 'void', current: 'city', window: 'city' };
const idOf = (w) => { const k = String(w ?? '').trim().toLowerCase(); return SURROUNDS[k] ? k : LETTER[k] || null; };

// The room in use: `?room=` for this visit, else the saved setting, else the city (today's).
export function surroundKind(settings, param = null) {
  return idOf(param) || (SURROUNDS[settings?.room] ? settings.room : 'city');
}
// room style [<name>|a|b|c|next]: pick the room. Returns the line to show, or null when it isn't this command.
export function surroundCommand(settings, text, current = surroundKind(settings)) {
  const m = /^room style(?: (\S+))?$/.exec(String(text).trim().toLowerCase());
  if (!m) return null;
  if (!m[1]) return `Room: ${SURROUNDS[current].name}. room style ${SURROUND_IDS.join('|')}`;
  const id = m[1] === 'next' ? SURROUND_IDS[(SURROUND_IDS.indexOf(current) + 1) % SURROUND_IDS.length] : idOf(m[1]);
  if (!id) return `No room called ${m[1]}. ${SURROUND_IDS.join(', ')}.`;
  if (id === 'city') delete settings.room; else settings.room = id; // the default stays unsaved
  return `Room: ${SURROUNDS[id].name}.${settings.window === false ? ' (Window is off.)' : ''}`;
}

// View's sky follows the clock: night, dawn, day and dusk.
export function timeOfDay(d = new Date()) {
  const h = d.getHours();
  return h >= 21 || h < 5 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : 'dusk';
}
// View's weather, from the window's clock (window.mjs): only ever a haze. Drizzle, rain and storms read as wet.
export const viewWeather = (name) => (name === 'clear' || name === 'fog' ? name : 'wet');

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const n1 = (v) => Math.round(v * 10) / 10;

// View's far city: one SVG drawn to 1920×1080 and sliced to the window (only its edges and its top show beside the
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
  return `<svg class="sv-city" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">`
    + `<path class="sv-far" d="${far.join('')}"/><path class="sv-mid" d="${mid.join('')}"/><path class="sv-mega" d="${mega.join('')}"/>`
    + `<path class="sv-lit" d="${lit[0].join('')}"/><path class="sv-lit2" d="${lit[1].join('')}"/></svg>`;
}

// Small static pictures, drawn as inline SVG. Silhouettes, their edges catching the screen's amber.
const svg = (cls, vb, body, extra = '') => `<svg class="${cls}" viewBox="${vb}" ${extra}aria-hidden="true">${body}</svg>`;
const LAMP = svg('sd-lamp', '0 0 70 240', '<path class="sd-sil" d="M6 236c0-6 9-9 22-9s22 3 22 9z"/><path class="sd-sil" d="M26 229l6-92 3 1-5 91z"/><path class="sd-sil" d="M31 139l26-82 3 2-25 82z"/><path class="sd-sil" d="M44 40l22 6 3 12-8 14-27-8z"/><path class="sd-edge" d="M50 228c-2-1-6-1.5-10-1.5M35 138l-4 89M60 59L35 140M69 58l-8 14"/><path class="sd-mouth" d="M34 64l27 8"/>');
const MUG = svg('sd-mug', '0 0 34 32', '<path class="sd-sil" d="M2 3h22v25c0 2-1 3-3 3H5c-2 0-3-1-3-3z"/><path class="sd-sil" d="M24 9h4c3 0 4 2 4 5v3c0 3-2 5-5 5h-3v-3h3c1 0 2-1 2-2v-3c0-1-1-2-2-2h-3z"/><path class="sd-edge" d="M2.5 3.5v24M2 3h22"/>');
const PLUG = svg('sd-plug', '0 0 80 280', '<path class="sd-cable" d="M-4 30C20 34 30 90 40 160S50 222 52 232"/><rect class="sd-sil" x="46" y="226" width="12" height="17" rx="1.5"/><path class="sd-edge" d="M46.5 227v15"/>');
const LEAD = svg('sd-lead', '0 0 100 40', '<path class="sd-cable" d="M44 6C52 10 56 26 62 30S80 36 86 40M47 4C42 14 34 22 22 40" vector-effect="non-scaling-stroke"/>', 'preserveAspectRatio="none" ');
// View, up close: a sign of glyph-ish marks (never words), and a fire escape repeated down a tower face.
const SIGN = (cls, h) => svg(cls, `0 0 18 ${h}`, `<rect x="1" y="1" width="16" height="${h - 2}" rx="1.5"/>${Array.from({ length: Math.floor((h - 8) / 16) }, (_, i) => { const y = 6 + i * 16; return `<path d="M5 ${y}h8M${i % 2 ? 9 : 6} ${y}v8M5 ${y + 8}h${i % 3 ? 8 : 5}"/>`; }).join('')}`);

export function surroundMarkup(kind) {
  if (kind === 'desk') {
    return '<i class="sr-wall"></i><i class="sr-halo"></i>'
      + `<div class="sr-l"><span class="sd-note">wick<br>03:00</span><i class="sd-pool"></i>${LAMP}</div>`
      + `<div class="sr-r">${PLUG}${MUG}</div>`
      + `<div class="sr-f"><i class="sd-top"></i><i class="sd-kb"></i><i class="sd-foot"></i>${LEAD}</div>`;
  }
  if (kind === 'view') {
    return `<i class="sv-sky"></i>${cityMarkup()}<i class="sv-smog"></i><i class="sv-haze"></i><i class="sv-tint"></i>`
      + `<div class="sr-l"><i class="sv-face"><i class="sv-esc"></i></i>${SIGN('sv-sign rose', 56)}<i class="sv-post"></i></div>`
      + `<div class="sr-r"><i class="sv-face"></i>${SIGN('sv-sign', 150)}<i class="sv-post"></i></div>`
      + '<i class="sv-glass"></i><i class="sr-halo"></i><i class="sv-head"></i><i class="sv-transom"></i>'
      + '<div class="sr-f"><i class="sv-sill"></i></div>';
  }
  if (kind === 'void') {
    return '<i class="sr-wall"></i><i class="sr-halo"></i><div class="sr-r"><i class="sc-far"></i></div><div class="sr-f"><i class="sc-refl"></i></div>';
  }
  return '';
}

export function createSurround({ onWeather = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'surround';
  el.setAttribute('aria-hidden', 'true');
  let kind = null, timer = 0, override = null, tod = null, wx = null;
  // View only: the hour's tint and the weather's haze, looked at once a minute (CSS fades between them).
  function tick() {
    el.dataset.tod = tod || timeOfDay();
    const name = override || weatherAt(Date.now()), w = viewWeather(name);
    if (w !== wx) { wx = w; el.dataset.wx = w; onWeather(name, WEATHER[name]); }
  }
  return {
    el,
    // Show one (desk, view or void), or null to take it away.
    set(k) {
      k = k && SURROUNDS[k] && k !== 'city' ? k : null;
      if (k === kind) return;
      kind = k; clearInterval(timer); wx = null;
      if (!k) { el.remove(); el.innerHTML = ''; delete el.dataset.kind; delete el.dataset.tod; delete el.dataset.wx; return; }
      el.dataset.kind = k;
      el.innerHTML = surroundMarkup(k);
      if (!el.isConnected) document.body.prepend(el);
      if (k === 'view') { tick(); timer = setInterval(tick, 60000); }
    },
    // weather <name>|auto, and ?tod= for a look at another hour.
    force(w) { override = WEATHER[w] ? w : null; if (kind === 'view') tick(); },
    hour(t) { tod = ['night', 'dawn', 'day', 'dusk'].includes(t) ? t : null; if (kind === 'view') tick(); },
    get kind() { return kind; },
  };
}
