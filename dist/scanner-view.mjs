// The scanner on the Map page (scanner.mjs, GAME_RULES.md "The scanner"): a radio button at the map's bottom-left
// corner, dim while nothing is on the air and glowing amber while a broadcast is up. It opens a strip across the map's
// foot: the frequency and the log counts on the left, the dial and the transcript in the middle, the station, the
// S-meter and the lock (or what it paid) on the right. The counts open the log card. Esc or the button closes it, and
// it closes itself when the broadcast ends. DOM and SVG only.
//
// The strip is built once (stripMarkup) and painted in place at 20 frames a second, slot by slot, so the map's own
// redraws (app.js re-attaches it with mount) and the tooltips never lose it. Its sounds (createRadio) play with
// Sound on, at the Effects volume.
import * as SC from './scanner.mjs';
import { glyph } from './glyphs.mjs';
import { FACTIONS } from './factions.mjs';
import { chainDef } from './threads.mjs';

const { band: [LO, HI], fine: FINE, hold: HOLD } = SC.SCANNER;
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// The scanner's own icons, in the game's 16×16 stroke hand.
const G = {
  antenna: '<path d="M8 7v7.5M5.5 14.5h5"/><circle cx="8" cy="5.5" r="1.4"/><path d="M5 2.5a4.3 4.3 0 0 0 0 6M11 2.5a4.3 4.3 0 0 1 0 6"/>',
  numbers: '<path d="M6 2.5 5 13.5M11 2.5l-1 11M2.5 6h11M2 10.5h11"/>',
  pirate: '<path d="M3.5 14.5V2"/><path d="M3.5 2.5h9l-2 3 2 3h-9"/>',
  distress: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.6"/><path d="M3.8 3.8l2.4 2.4M12.2 3.8 9.8 6.2M3.8 12.2l2.4-2.4M12.2 12.2 9.8 9.8"/>',
  unknown: '<path d="M5.8 6a2.2 2.2 0 1 1 3.2 2c-.7.4-1 .9-1 1.6v.6"/><path d="M8 12.6v.4"/>',
  wave: '<path d="M1.5 8c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0"/>',
  book: '<path d="M8 4c-1.5-1.2-3.5-1.5-5.5-1.2v10c2-.3 4 0 5.5 1.2 1.5-1.2 3.5-1.5 5.5-1.2v-10C11.5 2.5 9.5 2.8 8 4zM8 4v10"/>',
  thread: '<path d="M2.5 4.5h7M2.5 8h11M2.5 11.5h5"/><path d="M11 10l2.5 2.5L11 15"/>',
  check: '<path d="M3 8.5 6.5 12 13 4.5"/>',
};
const g = (n) => `<svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">${G[n]}</svg>`;
const RADIO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8 17 2.5"/><rect x="2.5" y="8" width="19" height="13" rx="2"/><circle cx="8" cy="14.5" r="3.4"/><path d="M14 11.5h5M14 14.5h5"/><circle cx="15" cy="18" r=".6"/><circle cx="18" cy="18" r=".6"/></svg>';
const KIND_ORDER = ['numbers', 'pirate', 'distress'];
const ANSWER = '\n▸ Hold the carrier in the zone until the lock fills.';

// ---------- the parts, as markup ----------
// Where a frequency sits on the band, as a % of the dial: the whole band, or the fine window once it bites.
const pct = (tune, m) => (tune.hook ? (m - (tune.hook.c - FINE / 2)) / FINE : (m - LO) / (HI - LO)) * 100;
function ticks(tune) {
  const [from, to, step, major, fmt] = tune.hook ? [tune.hook.c - FINE / 2, tune.hook.c + FINE / 2, 0.02, 0.1, (m) => m.toFixed(1)] : [LO, HI, 0.25, 1, (m) => String(m)];
  let out = '';
  for (let i = Math.ceil(from / step - 1e-9); i <= Math.floor(to / step + 1e-9); i++) {
    const m = +(i * step).toFixed(3), x = pct(tune, m).toFixed(2), big = Math.abs(m / major - Math.round(m / major)) < 1e-6;
    out += `<line x1="${x}%" x2="${x}%" y1="${big ? 27 : 32}" y2="36" class="${big ? 'big' : ''}"/>`;
    if (big) out += `<text x="${x}%" y="48" text-anchor="middle">${fmt(m)}</text>`;
  }
  return out + '<line x1="0" x2="100%" y1="36" y2="36"/>';
}
const NOISE = '·:.░▒ ·.:  ';
const rng = (seed) => { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
function scramble(text, clarity, seed) { const r = rng(seed); let o = ''; for (const ch of text) o += r() < clarity ? ch : ch === ' ' ? ' ' : NOISE[Math.floor(r() * NOISE.length)]; return o; }
function staticLine(n, seed) { const r = rng(seed); let o = ''; for (let i = 0; i < n; i++) o += NOISE[Math.floor(r() * NOISE.length)]; return o; }

// What a logged station paid, as a chip: { icon, text, sub }.
function payOf(s, st) {
  const e = s.scanner?.log?.[st.id] || {};
  if (st.kind === 'numbers') return { icon: g('book'), text: st.lore.title, sub: 'lore' };
  if (st.kind === 'pirate') { const d = Math.round((st.tip.mult - 1) * 100); return { icon: glyph(st.tip.ware), text: `${d > 0 ? '+' : '−'}${Math.abs(d)}%`, sub: `${e.hub ? FACTIONS[e.hub].short : '—'} · ${st.tip.mins}m` }; }
  return { icon: g('thread'), text: chainDef(st.chain)?.title || 'Thread', sub: 'thread' };
}
const payChip = (s, st) => { const p = payOf(s, st); return `<span class="sc-chip" title="${esc(`${p.text}: ${SC.payText(s, st)}`)}">${p.icon}${esc(p.text)}<small>${esc(p.sub)}</small></span>`; };
const stationTitle = (s, st, known) => (known ? `${st.name}: ${SC.KINDS[st.kind].name}. ${SC.KINDS[st.kind].does}${SC.logged(s, st.id) ? '\nLogged.' : ANSWER}` : `Unknown signal: Something is broadcasting here.${ANSWER}`);
export function buttonTitle(s, at) {
  return SC.onAir(s, at) ? 'Shortwave: Radio. Something is on the air.\n▸ Tune in to catch it.' : 'Shortwave: Radio. Nothing is on the air.';
}
function counts(s) {
  return KIND_ORDER.map((k) => { const all = SC.STATIONS.filter((x) => x.kind === k), n = all.filter((x) => SC.logged(s, x.id)).length;
    return `<button type="button" data-scan-log title="${esc(`${SC.KINDS[k].name}s: ${n} of ${all.length} logged.\n▸ Open the log.`)}">${g(k)}<em>${n}/${all.length}</em></button>`; }).join('');
}
export function logMarkup(s) {
  return `<div class="sc-log-h">${g('antenna')}<span class="kick">Log</span><button type="button" class="sc-x" data-scan-log aria-label="Close">×</button></div>
    ${KIND_ORDER.map((k) => { const all = SC.STATIONS.filter((x) => x.kind === k), n = all.filter((x) => SC.logged(s, x.id)).length;
      return `<div class="sc-sec"><span class="lbl">${g(k)}${SC.KINDS[k].name}s<em>${n}/${all.length}</em></span>${all.map((x) => SC.logged(s, x.id) ? `<div class="sc-row"><span>${esc(x.name)}</span>${payChip(s, x)}</div>` : '<div class="sc-row q"><span>???</span></div>').join('')}</div>`; }).join('')}`;
}
// Every slot of the strip at t (seconds), from the save and the needle.
export function parts(s, tune, t) {
  const { st, d, s: str } = SC.heard(s, tune, t), tr = tune.hook ? { tr: null, s: 0 } : SC.trafficHeard(tune.f, t);
  const lit = Math.max(1, Math.round(Math.max(str, tr.s) * 9));
  const meter = `<span class="sc-meter" title="S${lit}: Signal strength.">${Array.from({ length: 9 }, (_, i) => `<i${i < lit ? ' class="on"' : ''}></i>`).join('')}<b>S${lit}</b></span>`;
  const seed = Math.floor(t * 8), lock = `<div class="sc-lock" title="Lock: Fills while the carrier is in the zone, and drains outside it."><i style="width:${(tune.lock * 100).toFixed(1)}%"></i></div>`;
  // The carriers: an unlogged one shows only on the line; a logged one as a muted glow.
  const marks = SC.STATIONS.map((x) => {
    const p = SC.level(s, x, t, tune.hook);
    if (!p) return '';
    const on = tune.hook?.id === x.id;
    if (tune.hook && !on) return '';
    if (!on && !SC.logged(s, x.id)) return '';
    const left = pct(tune, SC.carrier(x, t, tune.hook)).toFixed(2);
    return on ? `<i class="sc-glow" style="left:${left}%;opacity:${(0.3 + 0.6 * p).toFixed(2)}"></i><i class="sc-carrier" style="left:${left}%;opacity:${(0.25 + 0.75 * p).toFixed(2)}"></i>` : `<i class="sc-glow old" style="left:${left}%;opacity:${(0.2 + 0.5 * p).toFixed(2)}"></i>`;
  }).join('');
  const out = { freq: `${tune.f.toFixed(3)}<small>MHz</small>`, counts: counts(s), scale: ticks(tune), marks, needle: pct(tune, tune.f), zone: tune.hook ? [pct(tune, tune.f - HOLD), pct(tune, tune.f + HOLD)] : null, fine: !!tune.hook };
  if (st && str > 0.06) {
    const known = SC.logged(s, st.id) || str > 0.45 || (tune.hook && tune.lock > 0.4);
    const clear = SC.logged(s, st.id) ? 1 : tune.hook ? Math.min(1, 0.15 + tune.lock * 0.9) * Math.min(1, str * 1.4) : Math.min(1, str * str * 1.1);
    out.who = `<span class="sc-who" title="${esc(stationTitle(s, st, known))}">${g(known ? st.kind : 'unknown')}<b class="${known ? '' : 'q'}">${known ? esc(st.name) : '???'}</b></span>${meter}`;
    out.tx = esc(scramble(SC.textOf(s, st), clear, seed)); out.txCls = 'sc-tx';
    out.res = SC.logged(s, st.id) && d < SC.SCANNER.reach / 2 ? `<div class="sc-result">${payChip(s, st)}<span class="sc-ok">${g('check')}LOGGED</span></div>` : lock;
  } else if (tr.tr && tr.s > 0.08) {
    out.who = `<span class="sc-who" title="${esc(`${tr.tr.name}: Radio traffic. Somebody else's transmission.`)}">${g('wave')}<b class="q">${esc(tr.tr.name)}</b></span>${meter}`;
    out.tx = esc(scramble(tr.tr.text, Math.min(1, tr.s * 1.4), seed)); out.txCls = 'sc-tx tr';
    out.res = lock;
  } else {
    out.who = `<span class="sc-who">${g('unknown')}<b class="q">no carrier</b></span>${meter}`;
    out.tx = esc(staticLine(120, seed)); out.txCls = 'sc-tx static';
    out.res = lock;
  }
  out.sound = { st, d, s: str, ts: tr.s, tr: tr.tr, clear: !st || str < 0.03 ? 0 : SC.logged(s, st.id) ? str : tune.hook ? Math.min(1, 0.15 + tune.lock * 0.9) * Math.min(1, str * 1.4) : str };
  return out;
}
// The strip, whole: what mount builds, and what the tests read.
export function stripMarkup(s, tune, t) {
  const p = parts(s, tune, t), air = SC.onAir(s, t * 1000);
  return `<div class="sc-l"><div class="sc-hd">${g('antenna')}<span class="kick">Scanner</span><i class="sc-lamp${air ? '' : ' idle'}" data-sc="lamp"></i></div><span class="sc-freq" data-sc="freq">${p.freq}</span><div class="sc-counts" data-sc="counts">${p.counts}</div></div>
    <div class="sc-m"><div class="sc-dial${p.fine ? ' fine' : ''}" data-sc="dial" tabindex="0" role="slider" aria-label="Frequency" aria-valuemin="${LO}" aria-valuemax="${HI}" aria-valuenow="${tune.f}"><div class="sc-band"><svg class="sc-scale" data-sc="scale">${p.scale}</svg><div data-sc="marks">${p.marks}</div><i class="sc-zone" data-sc="zone"${p.zone ? ` style="left:${p.zone[0]}%;width:${p.zone[1] - p.zone[0]}%"` : ' hidden'}></i><i class="sc-needle" data-sc="needle" style="left:${p.needle}%"></i></div></div><div class="${p.txCls}" data-sc="tx">${p.tx}</div></div>
    <div class="sc-r"><div class="sc-who-row" data-sc="who">${p.who}</div><div data-sc="res">${p.res}</div></div>`;
}

// ---------- the controller ----------
// opts: state() the save, changed() after the save changes (save and redraw), busy() true in a fight, sound() and
// volume() the Sound setting and the Effects volume.
export function createScanner({ state, changed = () => {}, busy = () => false, sound = () => false, volume = () => 0.8 }) {
  let root = null, open = false, logOpen = false, closeAt = 0, last = 0, lastPaint = 0, lastSched = 0, wasAir = false, painted = {};
  const tune = { f: 7.415, hook: null, lock: 0 };
  const radio = createRadio();
  const $ = (k) => root.querySelector(`[data-sc="${k}"]`);
  function build() {
    root = document.createElement('div');
    root.className = 'scan';
    root.innerHTML = `<button type="button" class="sc-radio" data-scan-radio aria-pressed="false" aria-label="Shortwave">${RADIO}</button><div class="sc-strip" hidden></div><div class="sc-logcard" hidden></div>`;
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-scan-radio]')) toggle();
      else if (e.target.closest('[data-scan-log]')) { logOpen = !logOpen; paintLog(); }
    });
    paintButton(Date.now());
  }
  function paintButton(at) {
    const b = root.querySelector('.sc-radio'), air = !!SC.onAir(state(), at);
    b.classList.toggle('live', air);
    b.setAttribute('aria-pressed', String(open));
    const tt = buttonTitle(state(), at);
    if (b.dataset.tt !== tt && b.title !== tt) { b.title = tt; delete b.dataset.tt; }
  }
  function paintLog() { const c = root.querySelector('.sc-logcard'); c.hidden = !(open && logOpen); if (!c.hidden) c.innerHTML = logMarkup(state()); }
  function wireDial() {
    const dial = $('dial');
    const toX = (e) => { const r = dial.querySelector('.sc-band').getBoundingClientRect(), u = (e.clientX - r.left) / r.width; set(tune.hook ? tune.hook.c - FINE / 2 + u * FINE : LO + u * (HI - LO)); };
    // The drag listens on the window, so a redraw of the map under it never drops it.
    dial.addEventListener('pointerdown', (e) => {
      e.preventDefault(); dial.focus({ preventScroll: true }); toX(e);
      const move = (ev) => toX(ev), up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    dial.addEventListener('wheel', (e) => { e.preventDefault(); set(tune.f + Math.sign(e.deltaY || e.deltaX) * step(e)); }, { passive: false });
  }
  const step = (e) => (tune.hook ? 0.002 : 0.005) * (e.shiftKey ? 10 : 1);
  function set(f) { SC.setFreq(tune, f); paint(true); }
  function toggle() { if (open) close(); else show(); }
  function show() {
    open = true; closeAt = 0; painted = {};
    const strip = root.querySelector('.sc-strip');
    strip.innerHTML = stripMarkup(state(), tune, Date.now() / 1000);
    strip.hidden = false;
    wireDial();
    $('dial').focus({ preventScroll: true });
    if (sound()) radio.wake();
    paintButton(Date.now());
  }
  function close() {
    if (!root) return;
    open = false; logOpen = false; tune.hook = null; tune.lock = 0;
    root.querySelector('.sc-strip').hidden = true;
    paintLog(); paintButton(Date.now());
    radio.quiet();
  }
  // Writes each slot whose markup changed since the last paint.
  function paint(force = false) {
    const now = Date.now(), t = now / 1000;
    if (!force && now - lastPaint < 50) return;
    lastPaint = now;
    const s = state(), p = parts(s, tune, t);
    for (const k of ['freq', 'counts', 'scale', 'marks', 'who', 'res']) if (painted[k] !== p[k]) { $(k).innerHTML = p[k]; painted[k] = p[k]; }
    if (painted.tx !== p.tx) { $('tx').innerHTML = p.tx; painted.tx = p.tx; }
    $('tx').className = p.txCls;
    $('needle').style.left = p.needle + '%';
    const z = $('zone'); z.hidden = !p.zone; if (p.zone) { z.style.left = p.zone[0] + '%'; z.style.width = (p.zone[1] - p.zone[0]) + '%'; }
    $('dial').classList.toggle('fine', p.fine);
    $('dial').setAttribute('aria-valuenow', tune.f.toFixed(3));
    $('lamp').classList.toggle('idle', !SC.onAir(s, now));
    radio.hear({ ...p.sound, f: tune.f, t, hook: tune.hook, on: sound(), volume: volume() });
  }
  // Esc closes the log card, then the strip, before the map's own Esc. The arrow keys tune while it's open, unless
  // you're typing (a map redraw can take the focus off the dial).
  document.addEventListener('keydown', (e) => {
    if (!open || !root?.isConnected) return;
    if (e.key === 'Escape') { e.stopPropagation(); if (logOpen) { logOpen = false; paintLog(); } else close(); return; }
    if (/input|textarea|select/i.test(e.target.tagName || '')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(tune.f - step(e));
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(tune.f + step(e));
    else return;
    e.preventDefault();
  }, true);
  return {
    // Puts the button (and the strip, if open) on the map; app.js calls it after every map redraw.
    mount(canvas) {
      if (!canvas) return this.unmount();
      if (!root) build();
      if (root.parentElement !== canvas) canvas.append(root);
    },
    unmount() { if (root?.isConnected) { root.remove(); if (open) close(); } },
    isOpen: () => open,
    // Every frame: the schedule, the reel, the paint, the sound.
    tick(now = Date.now()) {
      const s = state(), dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000));
      last = now;
      if (now - lastSched >= 500) {
        lastSched = now;
        const ev = SC.tickScanner(s, now);
        if (ev === 'start' && sound() && !busy()) radio.cue(volume());
        if (ev) changed();
      }
      const air = !!SC.onAir(s, now);
      if (root?.isConnected) paintButton(now);
      if (open && wasAir && !air) closeAt = now + 3000; // the broadcast ended: the strip folds away 3 s later
      wasAir = air;
      if (open && closeAt && now >= closeAt) close();
      if (!open || !root?.isConnected) { radio.voices(null, null); return; }
      const r = SC.tuneStep(s, tune, dt, now / 1000);
      if (r === 'catch') {
        const id = tune.hook.id;
        tune.hook = null; tune.lock = 0;
        SC.catchStation(s, id, now);
        if (sound()) radio.chirp(volume());
        if (logOpen) paintLog();
        changed();
      }
      if (r) paint(true); else paint();
      const a = SC.onAir(s, now);
      radio.voices(a ? SC.stationById(a.id) : null, tune.hook ? null : SC.trafficHeard(tune.f, now / 1000).tr);
    },
    // For tests and screenshots: the needle, and opening it.
    tune, show: () => { if (root && !open) show(); }, close,
  };
}

// ---------- sound ----------
// Static that thins as a station clears; the off-tune whistle (110–1800 Hz by how far off, silent dead on); under it the
// station: numbers pips pitched from its digits, a pirate bass riff, SOS for a distress call; radio traffic's own
// sounds; a two-note chirp on a catch and a quiet two-tone ping when a broadcast starts. Master 0.18 × the Effects volume.
function createRadio() {
  let ac = null, n = {}, vIdx = 0, vNext = 0, vSt = null, tIdx = 0, tNext = 0, tCur = null;
  const live = () => ac && ac.state === 'running';
  document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
  function wake() {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const m = ac.createGain(); m.gain.value = 0.18; m.connect(ac.destination);
        const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.35;
        const hiss = ac.createGain(); hiss.gain.value = 0;
        noise.connect(bp).connect(hiss).connect(m); noise.start();
        const beat = ac.createOscillator(); beat.frequency.value = 800;
        const beatG = ac.createGain(); beatG.gain.value = 0; beat.connect(beatG).connect(m); beat.start();
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        const voice = ac.createGain(); voice.gain.value = 0; voice.connect(hp).connect(lp).connect(m);
        const traffic = ac.createGain(); traffic.gain.value = 0; traffic.connect(hp);
        n = { m, hiss, beat, beatG, voice, traffic };
      }
      if (ac.state === 'suspended') ac.resume();
    } catch { ac = null; }
  }
  const set = (param, v) => param.setTargetAtTime(v, ac.currentTime, 0.06);
  function blip(freq, at, dur, type = 'sine', peak = 0.5, dest = n.voice) {
    const o = ac.createOscillator(), gg = ac.createGain(); o.type = type; o.frequency.value = freq;
    gg.gain.setValueAtTime(0, at); gg.gain.linearRampToValueAtTime(peak, at + 0.012);
    gg.gain.setValueAtTime(peak, Math.max(at + 0.013, at + dur - 0.03)); gg.gain.linearRampToValueAtTime(0, at + dur);
    o.connect(gg).connect(dest); o.start(at); o.stop(at + dur + 0.05);
  }
  function quiet() { if (!live()) return; for (const k of ['hiss', 'beatG', 'voice', 'traffic']) set(n[k].gain, 0); }
  function hear({ on, volume, st, s, ts, clear, f, t, hook }) {
    if (!on) return quiet();
    if (!ac) wake();
    if (!live()) return;
    set(n.m.gain, 0.18 * volume / 0.8);
    set(n.hiss.gain, 0.08 * (1 - 0.75 * Math.max(clear, ts * 0.6)));
    set(n.traffic.gain, 0.7 * ts);
    set(n.voice.gain, 0.9 * clear ** 1.3);
    if (st && s > 0.03) {
      const off = Math.abs(f - SC.carrier(st, t, hook));
      set(n.beat.frequency, 110 + Math.min(off, 0.2) / 0.2 * 1700);
      set(n.beatG.gain, 0.05 * Math.min(1, s * 2) * Math.min(1, off / 0.006));
    } else set(n.beatG.gain, 0);
  }
  // Each kind's broadcast under the static, one event a step: [hz, length, step, type, peak].
  const SOS = (() => { const u = 0.11, out = [], dot = () => out.push([700, u, 2 * u]), dash = () => out.push([700, 3 * u, 4 * u]);
    for (const l of 'SOS') { (l === 'S' ? [dot, dot, dot] : [dash, dash, dash]).forEach((x) => x()); out.push([0, 0, 2 * u]); }
    out.push([0, 0, 1.2]); return out; })();
  const RIFF = [110, 110, 165, 147, 110, 98, 131, 147];
  function voiceEvent(st, i) {
    if (st.kind === 'numbers') { const digits = st.text.replace(/\D/g, '') || '0', k = i % 6; return k === 5 ? [0, 0, 1.1] : [380 + Number(digits[(Math.floor(i / 6) * 5 + k) % digits.length]) * 55, 0.2, 0.42]; }
    if (st.kind === 'pirate') return [RIFF[i % RIFF.length], 0.22, 0.27, 'sawtooth', 0.22];
    return SOS[i % SOS.length];
  }
  const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
  const seqs = new Map();
  function morseSeq(tr) {
    if (seqs.has(tr)) return seqs.get(tr);
    const u = tr.unit, out = [];
    for (const ch of tr.text.toLowerCase()) {
      if (ch === ' ') { out.push({ step: 4 * u }); continue; }
      const code = MORSE[ch]; if (!code) continue;
      for (const x of code) { const len = x === '.' ? u : 3 * u; out.push({ f: 820, dur: len, step: len + u }); }
      out.push({ step: 2 * u });
    }
    out.push({ step: 1.5 }); seqs.set(tr, out); return out;
  }
  const TUNE = [392, 440, 523, 587, 659, 587, 523, 440, 392, 330];
  function trafficEvent(tr, i) {
    if (tr.type === 'time') return { f: 1000, dur: i % 10 === 0 ? 0.5 : 0.05, step: 1 };
    if (tr.type === 'morse') { const q = morseSeq(tr); return q[i % q.length]; }
    if (tr.type === 'data') return i % 2 ? { step: 0.5 } : { fsk: true, dur: 0.6, step: 0.6 };
    if (tr.type === 'music') return { f: TUNE[i % TUNE.length], dur: 0.28, step: 0.32, type: 'triangle', peak: 0.35 };
    const r = rng(i * 131 + Math.round(tr.f * 100)), dur = 0.08 + r() * 0.18;
    return r() < 0.15 ? { step: 0.35 + r() * 0.3 } : { syl: true, f: 110 + r() * 60, form: 600 + r() * 900, dur, step: dur + 0.04 };
  }
  function fsk(at, dur) {
    const o = ac.createOscillator(), gg = ac.createGain(); o.type = 'square';
    for (let k = 0; k * 0.022 < dur; k++) o.frequency.setValueAtTime(Math.random() < 0.5 ? 1270 : 1070, at + k * 0.022);
    gg.gain.setValueAtTime(0, at); gg.gain.linearRampToValueAtTime(0.1, at + 0.01); gg.gain.setValueAtTime(0.1, at + dur - 0.02); gg.gain.linearRampToValueAtTime(0, at + dur);
    o.connect(gg).connect(n.traffic); o.start(at); o.stop(at + dur + 0.05);
  }
  function syllable(at, dur, pitch, form) {
    const o = ac.createOscillator(), bp = ac.createBiquadFilter(), gg = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(pitch, at); o.frequency.linearRampToValueAtTime(pitch * (0.85 + Math.random() * 0.3), at + dur);
    bp.type = 'bandpass'; bp.frequency.value = form; bp.Q.value = 4;
    gg.gain.setValueAtTime(0, at); gg.gain.linearRampToValueAtTime(0.6, at + dur * 0.3); gg.gain.linearRampToValueAtTime(0, at + dur);
    o.connect(bp).connect(gg).connect(n.traffic); o.start(at); o.stop(at + dur + 0.05);
  }
  // Schedules the station's and the traffic's events 0.3 s ahead.
  function voices(st, tr) {
    if (!live()) return;
    if (!st) vSt = null;
    else {
      if (st !== vSt || vNext < ac.currentTime - 0.5) { vSt = st; vIdx = 0; vNext = ac.currentTime + 0.05; }
      while (vNext < ac.currentTime + 0.3) { const [fq, dur, stp, type, peak] = voiceEvent(st, vIdx++); if (fq) blip(fq, vNext, dur, type, peak); vNext += stp; }
    }
    if (!tr) { tCur = null; return; }
    if (tr !== tCur || tNext < ac.currentTime - 0.5) { tCur = tr; tIdx = Math.floor(Math.random() * 20); tNext = ac.currentTime + 0.03; }
    while (tNext < ac.currentTime + 0.3) {
      const e = trafficEvent(tr, tIdx++), at = tNext;
      if (e.fsk) fsk(at, e.dur); else if (e.syl) syllable(at, e.dur, e.f, e.form); else if (e.f) blip(e.f, at, e.dur, e.type || 'sine', e.peak || 0.4, n.traffic);
      tNext += e.step;
    }
  }
  return {
    wake, quiet, hear, voices,
    chirp(volume) { wake(); if (!live()) return; set(n.m.gain, 0.18 * volume / 0.8); const t = ac.currentTime; blip(880, t, 0.09, 'sine', 0.25, n.m); blip(1320, t + 0.09, 0.2, 'sine', 0.25, n.m); },
    cue(volume) { wake(); if (!live()) return; set(n.m.gain, 0.18 * volume / 0.8); const t = ac.currentTime; blip(660, t, 0.25, 'sine', 0.09, n.m); blip(990, t + 0.22, 0.4, 'sine', 0.09, n.m); },
  };
}
