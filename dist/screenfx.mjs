// Screen effects (System: Screen effects; docs/ui.md, Screen effects). Light on the glass around the game, never on
// the game: every effect lives in the backdrop behind the panels (#fx-back), on the tube's edge (#crt-bezel), in the
// monitor casing's lamps, or across the virus picture (#virus-canvas). Text, numbers, bars, chips and the board are
// never touched, moved or dimmed. The one thing that reaches the interface is a floor's palette: its colour tokens
// (style.css :root), set on <html data-floor>, each checked for contrast (docs/ui.md).
//   Low Signal   your health under a quarter, in a fight or out on a run: the screen's edges grey out, light static
//                runs in the backdrop and a slow vignette breathes in it.
//   Big hits     a hit on you of an eighth of your bar or more (a crit always): a brief tear across the backdrop.
//   Crits        your crit on a part: a short horizontal tear across the virus picture.
//   Floor colour each floor its own palette and a light texture in the backdrop (rain on the Sprawl, frost on Coldline).
//   Status lights the casing's lamps (PWR GATE WALL NET INST DMN) glow and blink with real state.
// Off / subtle / medium (default) / bold, and each effect can be switched off on its own (screen fx <effect> off).
// Motion off or reduced motion: still (style.css stops every animation here, and no tear runs). Reads state; never
// changes it, except the two settings below.

export const SFX = {
  levels: ['off', 'subtle', 'medium', 'bold'],
  effects: { signal: 'Low Signal', hits: 'Hits', crits: 'Crits', floor: 'Floor colour', lamps: 'Status lights' },
  low: 0.25, // Signal (your health) under a quarter
  big: { subtle: 0.2, medium: 0.12, bold: 0.08 }, // the share of your bar a hit must take to tear the backdrop (a crit always does)
  tearMs: { subtle: 180, medium: 280, bold: 440 },
  critMs: { subtle: 140, medium: 220, bold: 340 },
  blinkMs: 2400, // a one-off blink (a #net line, a daemon firing) lasts this long
};

// The eight floors' palettes (FLOORS in data.mjs, by index). Each replaces the structure colour (amber's job), the
// surfaces and the text tints; the job colours (hot, next, you, daemon, steel, gray) never change, so a colour still
// means one thing. Every text tint keeps 4.5:1 or better on the floor's bg, panels and textured backdrop
// (screenfx.test.mjs checks it).
const line = (r, g, b) => ({ '--line': `rgba(${r}, ${g}, ${b}, 0.2)`, '--line-strong': `rgba(${r}, ${g}, ${b}, 0.45)`, '--amber-wash': `rgba(${r}, ${g}, ${b}, 0.1)`, '--sfx-glow': `rgba(${r}, ${g}, ${b}, 0.5)` });
export const PALETTES = [
  { floor: 1, name: 'The Sprawl', texture: 'rain', vars: { '--bg': '#0a0603', '--panel': '#110b05', '--panel-2': '#181006', '--inset': '#070402', '--text': '#f2e0b4', '--bright': '#fff2c8', '--muted': '#bc9c5e', '--dim': '#9b7d4b', '--amber': '#f4b437', '--amber-soft': '#d99a24', '--amber-deep': '#7e5311', ...line(244, 180, 55) } },
  { floor: 2, name: 'Backhaul', texture: 'sodium', vars: { '--bg': '#0b0602', '--panel': '#130b04', '--panel-2': '#1a0f05', '--inset': '#080401', '--text': '#f6dcb8', '--bright': '#fff0d8', '--muted': '#c99a62', '--dim': '#a57e52', '--amber': '#f3a33a', '--amber-soft': '#d98a24', '--amber-deep': '#7e4710', ...line(243, 163, 58) } },
  { floor: 3, name: 'The Stacks', texture: 'dust', vars: { '--bg': '#050804', '--panel': '#0a0f08', '--panel-2': '#10170c', '--inset': '#040603', '--text': '#d8e6c0', '--bright': '#eef8dc', '--muted': '#9fb27e', '--dim': '#809364', '--amber': '#a9c48a', '--amber-soft': '#8aa86c', '--amber-deep': '#3f5530', ...line(169, 196, 138) } },
  { floor: 4, name: 'Coldline', texture: 'frost', vars: { '--bg': '#02060a', '--panel': '#060e14', '--panel-2': '#0a141c', '--inset': '#02050a', '--text': '#dcecf4', '--bright': '#f2fbff', '--muted': '#94b4c4', '--dim': '#7896a6', '--amber': '#cfe9f7', '--amber-soft': '#a6cfe4', '--amber-deep': '#3d6278', ...line(207, 233, 247) } },
  { floor: 5, name: 'Deep Core', texture: 'heat', vars: { '--bg': '#0a0308', '--panel': '#12060f', '--panel-2': '#1a0915', '--inset': '#070206', '--text': '#f4d8ea', '--bright': '#ffeefa', '--muted': '#c690b4', '--dim': '#a37394', '--amber': '#f07ac8', '--amber-soft': '#d25ead', '--amber-deep': '#6e2257', ...line(240, 122, 200) } },
  { floor: 6, name: 'Kernel Space', texture: 'grid', vars: { '--bg': '#000000', '--panel': '#0a0a0a', '--panel-2': '#121212', '--inset': '#000000', '--text': '#ececec', '--bright': '#ffffff', '--muted': '#ababab', '--dim': '#8e8e8e', '--amber': '#f4f4f4', '--amber-soft': '#cfcfcf', '--amber-deep': '#5a5a5a', ...line(244, 244, 244) } },
  { floor: 7, name: 'The Sink', texture: 'drips', vars: { '--bg': '#0a0303', '--panel': '#130606', '--panel-2': '#1b0909', '--inset': '#070202', '--text': '#f2dad6', '--bright': '#fff0ee', '--muted': '#c69890', '--dim': '#a57a73', '--amber': '#e09a94', '--amber-soft': '#c0706a', '--amber-deep': '#6a2420', ...line(224, 154, 148) } },
  { floor: 8, name: 'Bedrock', texture: 'static', vars: { '--bg': '#080807', '--panel': '#0f0f0d', '--panel-2': '#161613', '--inset': '#050504', '--text': '#e0dcd2', '--bright': '#f6f3ea', '--muted': '#aaa496', '--dim': '#8c877b', '--amber': '#cfc7b4', '--amber-soft': '#aaa290', '--amber-deep': '#4e4a40', ...line(207, 199, 180) } },
];
export const paletteOf = (floor) => PALETTES.find((p) => p.floor === floor) || null;

// ---------- settings ----------
export const levelOf = (s) => (SFX.levels.includes(s.settings?.screenFx) ? s.settings.screenFx : 'medium');
export const effectOn = (s, id) => levelOf(s) !== 'off' && !s.settings?.screenFxOff?.[id];
const ALIAS = { signal: 'signal', 'low signal': 'signal', lowsignal: 'signal', hits: 'hits', hit: 'hits', crits: 'crits', crit: 'crits', floor: 'floor', floors: 'floor', colour: 'floor', color: 'floor', lamps: 'lamps', lamp: 'lamps', lights: 'lamps', leds: 'lamps', led: 'lamps' };
// `screen fx` (or `screen fx next`) steps through the levels; `screen fx <level>` sets one; `screen fx <effect> on|off`
// switches one effect. Returns the notice to show, or null when it isn't a screen fx command.
export function screenFxCommand(s, text) {
  const m = String(text).trim().toLowerCase().match(/^screen ?(?:fx|effects)(?: (.+))?$/);
  if (!m) return null;
  const arg = (m[1] || 'next').trim(), set = (s.settings ||= {});
  if (arg === 'next') { const L = SFX.levels; set.screenFx = L[(L.indexOf(levelOf(s)) + 1) % L.length]; return `Screen effects: ${set.screenFx}.`; }
  if (SFX.levels.includes(arg)) { set.screenFx = arg; return `Screen effects: ${arg}.`; }
  const e = arg.match(/^(.+?) (on|off)$/), id = e && ALIAS[e[1]];
  if (!id) return `screen fx off|subtle|medium|bold, or screen fx <${Object.keys(SFX.effects).join('|')}> on|off`;
  const off = { ...(set.screenFxOff || {}) };
  if (e[2] === 'off') off[id] = true; else delete off[id];
  set.screenFxOff = off;
  return `${SFX.effects[id]}: ${e[2]}.${levelOf(s) === 'off' && e[2] === 'on' ? ' (Screen effects are off.)' : ''}`;
}

// ---------- what the screen shows ----------
// The floor whose palette is up: the map's floor on the map, the server's floor on a run and in a fight on its server.
// Home (and a fight at your own gate) keeps the default amber. ctx: { module, mapFloor, loc } (loc: the run's location).
export function floorOf(s, { module, mapFloor = null, loc = null } = {}) {
  if (module === 'map') return mapFloor || null;
  const e = s.encounter;
  if (e && (e.phase === 'active' || e.phase === 'alert') && e.mode !== 'run') return null; // a fight at home
  if (s.run) return Math.max(1, Math.min(PALETTES.length, loc?.depth || 1));
  return null;
}
// Low Signal: your health under a quarter, while it matters. health: your bar's share (0..1) in a fight, on a run, in
// a breach or a server's rooms; null at home, where a resting Signal is no danger.
export const lowOf = (health) => health != null && health < SFX.low;

// The casing's lamps, from real state. ctx: { gate (view.mjs gateOf), now, until: { net, dmn } (a blink's end) }.
// Each lamp: { cls (on, low, hot, you, dmn or ''), blink ('' steady, slow, fast, busy, once), title }.
export function lampsOf(s, { gate = null, now = Date.now(), until = {}, fmtLeft = null } = {}) {
  const e = s.encounter, inv = s.invasion, deg = !!s.degraded;
  const L = {};
  L.pwr = { cls: deg ? 'hot' : 'on', blink: deg ? 'slow' : '', title: deg ? `PWR: degraded${fmtLeft ? ` · ${fmtLeft}` : ''}` : 'PWR: power' };
  const waiting = gate && gate.phase !== 'active', fighting = gate?.phase === 'active' || e?.phase === 'active';
  L.gate = { cls: fighting ? 'hot' : waiting ? 'on' : '', blink: waiting ? 'fast' : '', title: waiting ? `GATE: ${gate.virus?.name || 'an intrusion'} waiting at the gate` : fighting ? `GATE: fighting ${e?.virus?.name || gate?.virus?.name || 'an intrusion'}` : 'GATE: intrusions at your gate (clear)' };
  const st = inv?.state;
  L.wall = !inv ? { cls: '', blink: '', title: 'WALL: invasions on your wall (quiet)' }
    : { cls: deg ? 'low' : st === 'breach' ? 'hot' : st === 'siege' ? 'on' : 'low', blink: deg ? '' : st === 'breach' ? 'fast' : st === 'siege' ? 'slow' : '', title: `WALL: ${inv.name}${st === 'travel' ? ' on its way' : st === 'breach' ? ' breaching' : st === 'siege' ? ' contesting the wall' : `: ${st}`}` };
  const events = (s.events || []).length, news = (until.net || 0) > now;
  L.net = { cls: s.run ? 'you' : events || news ? 'on' : '', blink: news ? 'once' : '', title: `NET: ${s.run ? 'connected' : 'the network'}${events ? ` · ${events} event${events === 1 ? '' : 's'} up` : ''}${news ? ' · news on #net' : ''}` };
  const moving = (s.market?.transfers || []).filter((t) => t.landsAt > now).length;
  L.inst = { cls: s.install ? (deg ? 'low' : 'on') : moving ? 'on' : '', blink: (s.install && !deg) || moving ? 'busy' : '', title: `INST: ${s.install ? 'installing' : moving ? `${moving} transfer${moving === 1 ? '' : 's'} on the way` : 'installs and transfers (idle)'}` };
  const slotted = (s.daemons || []).length, firing = (until.dmn || 0) > now;
  L.dmn = { cls: firing ? 'dmn' : slotted ? 'low dmn' : '', blink: firing ? 'once' : '', title: `DMN: daemons (${slotted} slotted${firing ? ', one firing' : ''})` };
  return L;
}

// Everything the screen wears now: { level, floor, low, lamps, on: { effect: bool } }.
export function screenState(s, ctx = {}) {
  const level = levelOf(s), on = Object.fromEntries(Object.keys(SFX.effects).map((id) => [id, effectOn(s, id)]));
  return { level, on, floor: on.floor ? floorOf(s, ctx) : null, low: on.signal && lowOf(ctx.health), lamps: lampsOf(s, ctx) };
}

// ---------- the DOM side ----------
// Only these are ever written: <html>'s data-sfx / data-floor / data-sfx-tex and the palette's tokens, the
// backdrop, the bezel, the casing's lamps, and the virus picture. screenfx.test.mjs holds it to that list.
export const TOUCHES = ['html', 'fx-back', 'crt-bezel', 'lamp-pwr', 'lamp-gate', 'lamp-wall', 'lamp-net', 'lamp-inst', 'lamp-dmn', 'virus-canvas'];
export function createScreenFx(doc, { canMove = () => true } = {}) {
  const $ = (id) => doc.getElementById(id);
  let level = 'medium', on = {};
  const until = { net: 0, dmn: 0 };
  const replay = (el, cls, ms) => {
    if (!el) return;
    el.classList.remove(...cls.split(' ')); void el.offsetWidth; el.classList.add(...cls.split(' '));
    clearTimeout(el._sfxT); el._sfxT = setTimeout(() => el.classList.remove(...cls.split(' ')), ms);
  };
  return {
    until,
    apply(st) {
      level = st.level; on = st.on;
      const html = doc.documentElement, p = paletteOf(st.floor);
      html.dataset.sfx = level;
      if (String(p?.floor || '') !== (html.dataset.floor || '')) {
        // The palette's tokens go on <html> (they win over style.css :root); home takes them back off.
        for (const k of Object.keys(PALETTES[0].vars)) html.style.removeProperty(k);
        if (p) { for (const [k, v] of Object.entries(p.vars)) html.style.setProperty(k, v); html.dataset.floor = String(p.floor); html.dataset.sfxTex = p.texture; }
        else { delete html.dataset.floor; delete html.dataset.sfxTex; }
      }
      $('fx-back')?.classList.toggle('low', !!st.low);
      $('crt-bezel')?.classList.toggle('low', !!st.low);
      for (const [id, l] of Object.entries(st.lamps)) {
        const el = $('lamp-' + id);
        if (!el) continue;
        const blink = on.lamps && level !== 'subtle' && l.blink ? ' blink-' + l.blink : '';
        const cls = `lamp ${l.cls}${blink}`.trim();
        if (el.className !== cls) el.className = cls;
        if (el.title !== l.title) el.title = l.title;
      }
    },
    // A hit on you: frac is its share of your bar. A big one (or a crit) tears the backdrop.
    hit(frac, crit = false) {
      if (level === 'off' || !on.hits || !canMove() || !(crit || frac >= SFX.big[level])) return false;
      replay($('fx-back'), level === 'bold' || frac >= 0.3 ? 'tear tear-big' : 'tear', SFX.tearMs[level]);
      return true;
    },
    // Your crit on a part: a short tear across the virus picture.
    crit() {
      if (level === 'off' || !on.crits || !canMove()) return false;
      replay($('virus-canvas'), 'sfx-tear', SFX.critMs[level]);
      return true;
    },
    // A lamp's one-off blink (a #net line, a daemon firing): it shows on the next apply.
    blink(id, now = Date.now()) { until[id] = now + SFX.blinkMs; },
  };
}
