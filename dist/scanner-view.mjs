// The scanner (scanner.mjs, GAME_RULES.md "The scanner") as the Listening Post: a hub-style node near HOME on the map,
// LANTERN's, that pings amber while a broadcast is up. Connected, it's a hub terminal (an ssh banner, LANTERN's line,
// the menu): [1] tune opens the radio in a window beside it, [2] recordings the tape, [3] log the log.
//
// The radio is built once (stripMarkup) and painted in place at 20 frames a second, slot by slot; app.js mounts it in
// the Tune window after every redraw, so a redraw never drops it. Its sounds (createRadio) play only while it's open,
// with Sound on, at the Effects volume; the ping when a broadcast starts plays anywhere but a fight.
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
const KIND_ORDER = ['numbers', 'pirate', 'distress'];
const ANSWER = '\n▸ Hold the carrier in the zone until the lock fills.';

// ---------- the parts, as markup ----------
// Where a frequency sits on the dial, as a %: the whole band, or the fine window round the station once it bites.
const pct = (tune, m) => (tune.hook ? (m - (tune.hook.c - FINE / 2)) / FINE : (m - LO) / (HI - LO)) * 100;
function ticks(tune) {
  const [from, to, step, major, fmt] = tune.hook ? [tune.hook.c - FINE / 2, tune.hook.c + FINE / 2, 0.02, 0.1, (m) => m.toFixed(1)] : [LO, HI, 0.25, 1, (m) => String(m)];
  let out = '';
  for (let i = Math.ceil(from / step - 1e-9); i <= Math.floor(to / step + 1e-9); i++) {
    const m = +(i * step).toFixed(3), x = pct(tune, m).toFixed(2), big = Math.abs(m / major - Math.round(m / major)) < 1e-6;
    out += `<line x1="${x}%" x2="${x}%" y1="${big ? 27 : 32}" y2="36"${big ? ' class="big"' : ''}/>`;
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
const stationTitle = (s, st, known) => (known ? `${st.name}: ${SC.KINDS[st.kind].name}. ${SC.KINDS[st.kind].does}${SC.catchable(s, st) ? ANSWER : '\nLogged.'}` : `Unknown signal: Something is broadcasting here.${ANSWER}`);
function counts(s) {
  return KIND_ORDER.map((k) => { const all = SC.STATIONS.filter((x) => x.kind === k), n = all.filter((x) => SC.logged(s, x.id)).length;
    return `<button type="button" data-hub-opt="log" title="${esc(`${SC.KINDS[k].name}s: ${n} of ${all.length} logged.\n▸ Open the log.`)}">${g(k)}<em>${n}/${all.length}</em></button>`; }).join('');
}
export function logMarkup(s) {
  return `<div class="sc-logcard">${KIND_ORDER.map((k) => { const all = SC.STATIONS.filter((x) => x.kind === k), n = all.filter((x) => SC.logged(s, x.id)).length;
      return `<div class="sc-sec"><span class="lbl">${g(k)}${SC.KINDS[k].name}s<em>${n}/${all.length}</em></span>${all.map((x) => SC.logged(s, x.id) ? `<div class="sc-row-l"><span>${esc(x.name)}</span>${payChip(s, x)}</div>` : '<div class="sc-row-l q"><span>???</span></div>').join('')}</div>`; }).join('')}</div>`;
}
// The tape: the last broadcast, its frequency, how long ago, and Play back (or why not).
const ago = (ms) => (ms < 60000 ? 'just now' : ms < 3600000 ? `${Math.floor(ms / 60000)}m ago` : `${Math.floor(ms / 3600000)}h ago`);
export function tapeMarkup(s, at = Date.now()) {
  const T = SC.tapeOf(s), st = T && SC.stationById(T.id);
  if (!st) return '<div class="sc-tape q"><span class="sc-tape-k">On tape</span><span>nothing yet</span></div>';
  if (SC.onAir(s, at) && !SC.onAir(s, at).tape) return '<div class="sc-tape q"><span class="sc-tape-k" title="On tape: The post records each broadcast. The next one records over it.">On tape</span><span>recording…</span></div>';
  const why = SC.playable(s, at);
  const tip = why ? `Play back: ${why}` : 'Play back: Puts this broadcast back on the air, once. Reel it in as usual.';
  return `<div class="sc-tape"><span class="sc-tape-k" title="On tape: The post records each broadcast. The next one records over it.">On tape</span>${g(st.kind)}<b>${esc(st.name)}</b><span class="sc-tape-f">${st.f.toFixed(3)} MHz</span><span class="sc-tape-t">${T.start > at ? '' : ago(at - T.start)}</span>${T.caught ? `<span class="sc-ok">${g('check')}LOGGED</span>` : `<button type="button" class="btn small${why ? '' : ' primary'}" data-scan-play${why ? ' disabled' : ''} title="${esc(tip)}">Play back</button>`}</div>`;
}
// Every slot of the strip at t (seconds), from the save and the needle.
export function parts(s, tune, t) {
  const { st, d, s: str } = SC.heard(s, tune, t), tr = tune.hook ? { tr: null, s: 0 } : SC.trafficHeard(tune.f, t);
  const lit = Math.max(1, Math.round(Math.max(str, tr.s) * 9));
  const meter = `<span class="sc-meter" title="S${lit}: Signal strength.">${Array.from({ length: 9 }, (_, i) => `<i${i < lit ? ' class="on"' : ''}></i>`).join('')}<b>S${lit}</b></span>`;
  const seed = Math.floor(t * 8), lock = `<div class="sc-lock" title="Lock: Fills while the carrier is in the zone, and drains outside it."><i style="width:${(tune.lock * 100).toFixed(1)}%"></i></div>`;
  // The carriers: one you can catch shows only on the line; one with nothing left to catch, as a muted glow.
  const marks = SC.STATIONS.map((x) => {
    const p = SC.level(s, x, t, tune.hook);
    if (!p) return '';
    const on = tune.hook?.id === x.id;
    if (tune.hook && !on) return '';
    if (!on && (SC.catchable(s, x) || !SC.logged(s, x.id))) return '';
    const at = pct(tune, SC.carrier(x, t, tune.hook)), left = at.toFixed(2);
    if (at < -10 || at > 110) return '';
    return on ? `<i class="sc-glow" style="left:${left}%;opacity:${(0.3 + 0.6 * p).toFixed(2)}"></i><i class="sc-carrier" style="left:${left}%;opacity:${(0.25 + 0.75 * p).toFixed(2)}"></i>` : `<i class="sc-glow old" style="left:${left}%;opacity:${(0.2 + 0.5 * p).toFixed(2)}"></i>`;
  }).join('');
  const out = { freq: `${tune.f.toFixed(3)}<small>MHz</small>`, counts: counts(s), tape: tapeMarkup(s, t * 1000), scale: ticks(tune), marks, needle: pct(tune, tune.f), zone: tune.hook ? [pct(tune, tune.f - HOLD), pct(tune, tune.f + HOLD)] : null, fine: !!tune.hook };
  if (st && str > 0.06) {
    const known = SC.logged(s, st.id) || str > 0.45 || (tune.hook && tune.lock > 0.4);
    const clear = !SC.catchable(s, st) ? 1 : tune.hook ? Math.min(1, 0.15 + tune.lock * 0.9) * Math.min(1, str * 1.4) : Math.min(1, str * str * 1.1);
    out.who = `<span class="sc-who" title="${esc(stationTitle(s, st, known))}">${g(known ? st.kind : 'unknown')}<b class="${known ? '' : 'q'}">${known ? esc(st.name) : '???'}</b></span>${meter}`;
    out.tx = esc(scramble(SC.textOf(s, st), clear, seed)); out.txCls = 'sc-tx';
    out.res = !SC.catchable(s, st) && SC.logged(s, st.id) && d < SC.SCANNER.reach / 2 ? `<div class="sc-result">${payChip(s, st)}<span class="sc-ok">${g('check')}LOGGED</span></div>` : lock;
  } else if (tr.tr && tr.s > 0.08) {
    out.who = `<span class="sc-who" title="${esc(`${tr.tr.name}: Radio traffic. Somebody else's transmission.`)}">${g('wave')}<b class="q">${esc(tr.tr.name)}</b></span>${meter}`;
    out.tx = esc(scramble(tr.tr.text, Math.min(1, tr.s * 1.4), seed)); out.txCls = 'sc-tx tr';
    out.res = lock;
  } else {
    out.who = `<span class="sc-who">${g('unknown')}<b class="q">no carrier</b></span>${meter}`;
    out.tx = esc(staticLine(120, seed)); out.txCls = 'sc-tx static';
    out.res = lock;
  }
  out.sound = { st, d, s: str, ts: tr.s, tr: tr.tr, clear: !st || str < 0.03 ? 0 : !SC.catchable(s, st) ? str : tune.hook ? Math.min(1, 0.15 + tune.lock * 0.9) * Math.min(1, str * 1.4) : str };
  return out;
}
// The radio, whole: the frequency and the log counts; the dial over the band and the transcript; the station, its
// S-meter and the lock (or what it paid); the tape under it. What mount builds, and what the tests read.
export function stripMarkup(s, tune, t) {
  const p = parts(s, tune, t);
  return `<div class="sc-l"><span class="sc-freq" data-sc="freq">${p.freq}</span><div class="sc-counts" data-sc="counts">${p.counts}</div></div>
    <div class="sc-m"><div class="sc-dial${p.fine ? ' fine' : ''}" data-sc="dial" tabindex="0" role="slider" aria-label="Frequency" aria-valuemin="${LO}" aria-valuemax="${HI}" aria-valuenow="${tune.f}"><div class="sc-band"><svg class="sc-scale" data-sc="scale">${p.scale}</svg><div data-sc="marks">${p.marks}</div><i class="sc-zone" data-sc="zone"${p.zone ? ` style="left:${p.zone[0]}%;width:${p.zone[1] - p.zone[0]}%"` : ' hidden'}></i><i class="sc-needle" data-sc="needle" style="left:${p.needle}%"></i></div></div><div class="${p.txCls}" data-sc="tx">${p.tx}</div></div>
    <div class="sc-r"><div class="sc-who-row" data-sc="who">${p.who}</div><div data-sc="res">${p.res}</div></div>
    <div class="sc-foot" data-sc="tape">${p.tape}</div>`;
}

// ---------- the Listening Post ----------
// A hub-style place near HOME, LANTERN's, separate from LANTERN's trading hub. Its terminal is a hub's (view.mjs
// hubTerminalMarkup's classes); app.js runs it as the hub session 'post'.
export const POST = { id: 'post', host: 'post-07', name: 'Listening Post', who: 'lantern@post-07', color: FACTIONS.lantern.color };
const ANT = ['    \\ | /    ', '   -- o --   ', '    / | \\    ', '      |      ', '     /|\\     ', '    /_|_\\    '];
// The map's tooltip and sub-line.
export function postTitle(s, at = Date.now()) {
  const a = SC.onAir(s, at);
  return `${POST.name}: LANTERN's radio hub. Tunes in to broadcasts and records the last one.\n▸ ${a ? 'Something is on the air.' : SC.playable(s, at) ? 'Nothing is on the air.' : 'One broadcast on tape.'}`;
}
// The node: a hub's diamond with an antenna, pinging amber while something is on the air.
// n: the map node ({ x, y }); cls: its selected/crowded classes; after: the reticle and the label (view.mjs's).
export function postNodeSvg(s, n, cls = '', after = '', at = Date.now()) {
  const a = SC.onAir(s, at);
  return `<g class="mnode post hub${a ? ' live' : ''}${cls}" style="--fc:${POST.color}" data-select="${POST.id}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${POST.name}"><title>${esc(postTitle(s, at))}</title>${a ? '<circle r="13" class="post-ping"/>' : ''}<circle r="18" class="mhit"/><path d="M0 -13 L13 0 L0 13 L-13 0 Z" class="hub-frame"/><g class="hub-mark" transform="translate(-8 -8)">${G.antenna}</g>${after}</g>`;
}
export const postNodeSub = (s, at = Date.now()) => (SC.onAir(s, at) ? 'hub · on the air' : 'hub · quiet');
// The card when you pick it on the map: the usual hub card, with Connect.
export function postCard(s, at = Date.now()) {
  const a = SC.onAir(s, at);
  return `<section class="card fcard" style="--fc:${POST.color}"><h2>LANTERN · hub</h2><h1><span class="fmark-i big" style="--fc:${POST.color}">${g('antenna')}</span>${POST.name}</h1>
    <p class="svc-line">${POST.host.toUpperCase()}${a ? ' <span class="tag" title="On the air: A broadcast is up now.">on the air</span>' : ''}</p>
    <div class="row"><button type="button" class="btn primary" data-go="hub:post">Connect</button></div></section>`;
}
// LANTERN's line when you connect: dry, short, lower case.
function postLine(s, at) {
  const a = SC.onAir(s, at), st = a && SC.stationById(a.id);
  if (st) return SC.catchable(s, st) ? `carrier near ${Math.floor(st.f)}. somebody is talking.` : `${st.name.toLowerCase()} again. nothing new on it.`;
  return SC.playable(s, at) ? 'dead air. nothing on tape either.' : 'dead air. one on tape.';
}
// The menu: [{ key, label, meta }]. Typed numbers pick from this.
export function postOptions(s, at = Date.now()) {
  const n = SC.STATIONS.filter((x) => SC.logged(s, x.id)).length;
  return [
    { key: 'tune', label: 'Tune', meta: SC.onAir(s, at) ? '<span class="tag">on air</span>' : '' },
    { key: 'recordings', label: 'Recordings', meta: SC.playable(s, at) ? '' : '1 on tape' },
    { key: 'log', label: 'Log', meta: `${n}/${SC.STATIONS.length}` },
  ];
}
export function postMenuLine(s, at = Date.now(), win = null) {
  const row = (n, label, meta, attr, on = false) => `<button type="button" class="hub-row${on ? ' on' : ''}" ${attr}><span class="hn">${n}</span><span class="hl">${esc(label)}</span><span class="hm">${meta || ''}</span></button>`;
  return { cls: 'hub-menu', html: postOptions(s, at).map((o, i) => row(i + 1, o.label.toLowerCase(), o.meta, `data-hub-opt="${o.key}"`, o.key === win)).join('') + row(0, 'disconnect', '', 'data-hub-close') };
}
const postMotd = (s, at) => `<pre class="hub-ascii" aria-hidden="true">${ANT.map(esc).join('\n')}</pre><span class="hub-motd"><b>${POST.name}</b>${SC.onAir(s, at) ? '<span class="tag" title="On the air: A broadcast is up now.">ON THE AIR</span>' : ''}</span>`;
// The lines a connection prints: handshake, banner, LANTERN's line, the menu.
export function postBanner(s, at = Date.now()) {
  return [
    { cls: 'you', html: `ssh ${esc(s.profile?.handle || 'rookie')}@${POST.host}` },
    { cls: 'note', html: `Connecting to ${POST.host.toUpperCase()} … ⇄ instant` },
    { cls: 'good', html: 'Connected.' },
    { cls: 'hub-banner', motd: true, html: postMotd(s, at) },
    { cls: 'hub-say', html: `<b>${POST.who}:</b> ${esc(postLine(s, at))}` },
    postMenuLine(s, at),
  ];
}
const POST_WINDOWS = {
  tune: { title: 'Tune', body: () => '<div class="sc-slot" data-sc-root></div>' },
  recordings: { title: 'Recordings', body: (s, at) => tapeMarkup(s, at) },
  log: { title: 'Log', body: (s) => logMarkup(s) },
};
// lines: the session so far (app.js keeps it); win: the open window. The banner and the menu redraw live.
export function postTerminalMarkup(s, lines, win, at = Date.now()) {
  const W = POST_WINDOWS[win];
  const term = `<section class="panel net-one hub-term" data-pane="ssh ${esc(s.profile?.handle || 'rookie')}@${POST.host}">
    <header class="net-head"><div class="net-where"><span class="fmark-i" style="--fc:${POST.color}">${g('antenna')}</span><b>${POST.host.toUpperCase()}</b></div><span class="post-by" title="LANTERN: The voice on the numbers station.">${glyph('f-lantern')}LANTERN</span><button type="button" class="btn small" data-hub-close title="Disconnect">×</button></header>
    <ol class="term" id="hubterm">${lines.map((l) => `<li class="${l.cls}">${l.menu ? postMenuLine(s, at, win).html : l.motd ? postMotd(s, at) : l.html}</li>`).join('')}</ol>
  </section>`;
  const w = W ? `<section class="card hub-win post-win${win === 'tune' ? ' tune' : ''}" data-keep="post ${W.title}"><h2>${W.title}<button type="button" class="btn small x" data-hub-opt="" title="Close">×</button></h2>${W.body(s, at)}</section>` : '';
  return `<div class="hub-session${W ? ' with-win' : ''}" style="--fc:${POST.color}">${term}${w}</div>`;
}

// ---------- the controller ----------
// opts: state() the save, changed() after the save changes (save and redraw), busy() true in a fight, sound() and
// volume() the Sound setting and the Effects volume, played() after Play back, found() when the clue finds the post.
export function createScanner({ state, changed = () => {}, busy = () => false, sound = () => false, volume = () => 0.8, played = () => {}, found = () => {} }) {
  let open = false, last = 0, lastPaint = 0, lastSched = 0, painted = {};
  const tune = { f: 7.415, hook: null, lock: 0 };
  const radio = createRadio();
  const root = typeof document === 'undefined' ? null : document.createElement('div');
  const $ = (k) => root.querySelector(`[data-sc="${k}"]`);
  root?.classList.add('sc-strip');
  if (typeof document !== 'undefined') document.addEventListener('click', (e) => { if (e.target.closest?.('[data-scan-play]')) play(); }); // in Tune and in Recordings
  function play() { const s = state(); if (SC.playBack(s, Date.now())) { painted = {}; changed(); played(); paint(true); } }
  function wireDial() {
    const dial = $('dial');
    const toX = (e) => { const r = dial.querySelector('.sc-band').getBoundingClientRect(), u = (e.clientX - r.left) / (r.width || 1); set(tune.hook ? tune.hook.c - FINE / 2 + u * FINE : LO + u * (HI - LO)); };
    // A drag turns the dial; it listens on the window, so a redraw of the page under it never drops it.
    dial.addEventListener('pointerdown', (e) => {
      e.preventDefault(); dial.focus({ preventScroll: true }); toX(e);
      const move = (ev) => toX(ev), up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    dial.addEventListener('wheel', (e) => { e.preventDefault(); set(tune.f + Math.sign(e.deltaY || e.deltaX) * step(e)); }, { passive: false });
  }
  const step = (e) => (tune.hook ? 0.002 : 0.005) * (e.shiftKey ? 10 : 1);
  function set(f) { SC.setFreq(tune, f); paint(true); }
  function show() {
    open = true; painted = {};
    root.innerHTML = stripMarkup(state(), tune, Date.now() / 1000);
    wireDial();
    $('dial').focus({ preventScroll: true });
    if (sound()) radio.wake();
  }
  function close() {
    if (!open) return;
    open = false; tune.hook = null; tune.lock = 0;
    root.remove();
    radio.quiet(); radio.voices(null, null);
  }
  // Writes each slot whose markup changed since the last paint.
  function paint(force = false) {
    if (!open) return;
    const now = Date.now(), t = now / 1000;
    if (!force && now - lastPaint < 50) return;
    lastPaint = now;
    const s = state(), p = parts(s, tune, t);
    for (const k of ['freq', 'counts', 'scale', 'marks', 'who', 'res', 'tape']) if (painted[k] !== p[k]) { $(k).innerHTML = p[k]; painted[k] = p[k]; }
    if (painted.tx !== p.tx) { $('tx').innerHTML = p.tx; painted.tx = p.tx; }
    $('tx').className = p.txCls;
    $('needle').style.left = p.needle + '%';
    const z = $('zone'); z.hidden = !p.zone; if (p.zone) { z.style.left = p.zone[0] + '%'; z.style.width = (p.zone[1] - p.zone[0]) + '%'; }
    $('dial').classList.toggle('fine', p.fine);
    $('dial').setAttribute('aria-valuenow', tune.f.toFixed(3));
    radio.hear({ ...p.sound, f: tune.f, t, hook: tune.hook, on: sound(), volume: volume() });
  }
  // The arrow keys tune while it's open, unless you're typing.
  if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => {
    if (!open || !root.isConnected) return;
    if (/input|textarea|select/i.test(e.target.tagName || '')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(tune.f - step(e));
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(tune.f + step(e));
    else return;
    e.preventDefault();
  }, true);
  return {
    // Puts the radio in the Tune window's slot (after every redraw), or takes it away (null: the window is shut).
    mount(slot) {
      if (!slot || busy()) return close();
      if (root.parentElement !== slot) slot.append(root);
      if (!open) show();
    },
    isOpen: () => open,
    // Every frame: the schedule, the reel, the paint, the sound.
    tick(now = Date.now()) {
      const s = state(), dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000));
      last = now;
      if (now - lastSched >= 500) {
        lastSched = now;
        const ev = SC.tickScanner(s, now);
        if (!SC.postFound(s) && !busy() && SC.findPost(s, now)) { found(); changed(); } // the clue: numbers in the chatter
        else if (ev === 'start' && SC.postFound(s) && sound() && !busy()) radio.cue(volume());
        if (ev) changed();
      }
      if (open && busy()) close();
      if (!open) return;
      const r = SC.tuneStep(s, tune, dt, now / 1000);
      if (r === 'catch') {
        const id = tune.hook.id;
        tune.hook = null; tune.lock = 0;
        SC.catchStation(s, id, now);
        if (sound()) radio.chirp(volume());
        changed();
      }
      if (r) paint(true); else paint();
      const a = SC.onAir(s, now);
      radio.voices(a ? SC.stationById(a.id) : null, tune.hook ? null : SC.trafficHeard(tune.f, now / 1000).tr);
    },
    // For tests and screenshots: the needle.
    tune, close, play,
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
