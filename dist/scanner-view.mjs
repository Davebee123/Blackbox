// The scanner (scanner.mjs, GAME_RULES.md "The scanner") as the Listening Post: a hub-style node near HOME on the map,
// LANTERN's, that pings amber while a broadcast is up. Connected, it's a hub terminal (an ssh banner, LANTERN's line,
// the menu): [1] tune opens lantern-rx's pad in a window beside it, [2] recordings the tape, [3] log the log.
// Tune is built once (tuneMarkup) and painted in place (createScanner); its sounds (createRadio) play only while it's
// open, with Sound on, at the Effects volume; the ping when a broadcast starts plays anywhere but a fight.
import * as SC from './scanner.mjs';
import { glyph } from './glyphs.mjs';
import { FACTIONS } from './factions.mjs';
import { chainDef } from './threads.mjs';

const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// The scanner's own icons, in the game's 16×16 stroke hand.
const G = {
  antenna: '<path d="M8 7v7.5M5.5 14.5h5"/><circle cx="8" cy="5.5" r="1.4"/><path d="M5 2.5a4.3 4.3 0 0 0 0 6M11 2.5a4.3 4.3 0 0 1 0 6"/>',
  numbers: '<path d="M6 2.5 5 13.5M11 2.5l-1 11M2.5 6h11M2 10.5h11"/>',
  pirate: '<path d="M3.5 14.5V2"/><path d="M3.5 2.5h9l-2 3 2 3h-9"/>',
  distress: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.6"/><path d="M3.8 3.8l2.4 2.4M12.2 3.8 9.8 6.2M3.8 12.2l2.4-2.4M12.2 12.2 9.8 9.8"/>',
  book: '<path d="M8 4c-1.5-1.2-3.5-1.5-5.5-1.2v10c2-.3 4 0 5.5 1.2 1.5-1.2 3.5-1.5 5.5-1.2v-10C11.5 2.5 9.5 2.8 8 4zM8 4v10"/>',
  thread: '<path d="M2.5 4.5h7M2.5 8h11M2.5 11.5h5"/><path d="M11 10l2.5 2.5L11 15"/>',
  check: '<path d="M3 8.5 6.5 12 13 4.5"/>',
};
const g = (n) => `<svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">${G[n]}</svg>`;
const KIND_ORDER = ['numbers', 'pirate', 'distress'];
// What a logged station paid, as a chip: { icon, text, sub }.
function payOf(s, st) {
  const e = s.scanner?.log?.[st.id] || {};
  if (st.kind === 'numbers') return { icon: g('book'), text: st.lore.title, sub: 'lore' };
  if (st.kind === 'pirate') { const d = Math.round((st.tip.mult - 1) * 100); return { icon: glyph(st.tip.ware), text: `${d > 0 ? '+' : '−'}${Math.abs(d)}%`, sub: `${e.hub ? FACTIONS[e.hub].short : '—'} · ${st.tip.mins}m` }; }
  return { icon: g('thread'), text: chainDef(st.chain)?.title || 'Thread', sub: 'thread' };
}
const payChip = (s, st) => { const p = payOf(s, st); return `<span class="sc-chip" title="${esc(`${p.text}: ${SC.payText(s, st)}`)}">${p.icon}${esc(p.text)}<small>${esc(p.sub)}</small></span>`; };
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
  const tip = why ? `Play back: ${why}` : 'Play back: Puts this broadcast back on the air, once. Catch it in Tune as usual.';
  return `<div class="sc-tape"><span class="sc-tape-k" title="On tape: The post records each broadcast. The next one records over it.">On tape</span>${g(st.kind)}<b>${esc(st.name)}</b><span class="sc-tape-f">${st.f.toFixed(3)} MHz</span><span class="sc-tape-t">${T.start > at ? '' : ago(at - T.start)}</span>${T.caught ? `<span class="sc-ok">${g('check')}LOGGED</span>` : `<button type="button" class="btn small${why ? '' : ' primary'}" data-scan-play${why ? ' disabled' : ''} title="${esc(tip)}">Play back</button>`}</div>`;
}
// ---------- Tune: the pad, as markup ----------
// The status line (lantern-rx, the signal bar, the decoder switch) over the pad, an SVG drawn whole each frame from the
// attempt (scanner.mjs "Tune: the pad"). Teal is only you (your light, dot and lock), amber the station and its pay,
// red the air bar's last seconds, misses and losses.
const { w: W, h: H, light: LIGHT, hold: HOLD } = SC.PAD;
const n1 = (x) => Math.round(x * 10) / 10;
const H01 = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
const ease = (u) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 3;
const back = (u) => { u = Math.max(0, Math.min(1, u)); const c1 = 1.6; return 1 + (c1 + 1) * (u - 1) ** 3 + c1 * (u - 1) ** 2; };
// The cloud: 72 sample points circling the station; the brightest (b > 0.88) glint.
const PTS = Array.from({ length: 72 }, (_, i) => ({ r: (H01(i * 1.7) + H01(i * 2.9 + 3) + H01(i * 4.3 + 7)) / 1.5, a: H01(i * 5.1 + 1) * 6.283, w: (H01(i * 3.3 + 9) - 0.5) * 0.9, ph: H01(i * 7.7) * 6.283, b: H01(i * 9.1 + 4) }));
const ptXY = (q, cx, cy, spread, t) => { const an = q.a + q.w * t, rr = q.r * spread * (0.85 + 0.15 * Math.sin(t * 1.3 + q.ph)); return [cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.9]; };
const pt = (q, x, y, op, cls = '') => `<circle class="p-pt${q.b > 0.88 ? ' hi' : ''}${cls}" cx="${n1(x)}" cy="${n1(y)}" r="${q.b > 0.88 ? 1.7 : 1.2}" style="opacity:${op.toFixed(2)}"/>`;
function scatter(cx, cy, spread, op, t) {
  let o = `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(spread * 1.9 + 10)}" fill="url(#sc-cloud)" style="opacity:${(op * 0.45).toFixed(2)}"/>`;
  for (const q of PTS) { const [x, y] = ptXY(q, cx, cy, spread, t); o += pt(q, x, y, op * (0.35 + 0.65 * q.b)); }
  return o;
}
// Your reticle: the hold ring, 4 ticks, the lock arc on the ring, your dot.
function reticle(x, y, inZ, lk) {
  const L = 2 * Math.PI * HOLD, c = inZ ? ' in' : '';
  let o = `<circle class="p-ring${c}" cx="${n1(x)}" cy="${n1(y)}" r="${HOLD}"/>`;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) o += `<line class="p-tick${c}" x1="${n1(x + dx * (HOLD + 3))}" y1="${n1(y + dy * (HOLD + 3))}" x2="${n1(x + dx * (HOLD + 9))}" y2="${n1(y + dy * (HOLD + 9))}"/>`;
  if (lk > 0.003) o += `<circle class="p-arc${c}" cx="${n1(x)}" cy="${n1(y)}" r="${HOLD}" stroke-dasharray="${n1(L * lk)} ${n1(L)}" transform="rotate(-90 ${n1(x)} ${n1(y)})"/>`;
  return o + `<circle class="p-you" cx="${n1(x)}" cy="${n1(y)}" r="3"/>`;
}
const corners = () => { const k = 14, a = 1; return `<path class="p-corner" d="M${a} ${a + k}V${a}H${a + k}M${W - a - k} ${a}H${W - a}V${a + k}M${W - a} ${H - a - k}V${H - a}H${W - a - k}M${a + k} ${H - a}H${a}V${H - a - k}"/>`; };
const typed = (str, u, from, cps = 36) => esc(str.slice(0, Math.max(0, Math.floor((u - from) * cps))));
// Play back, drawn on the pad; the pad takes it on pointerdown (it redraws every frame, so a click would be lost).
const BTN = { w: 116, h: 28, dy: 60 };
const btnAt = (cy) => ({ x: W / 2 - BTN.w / 2, y: cy + BTN.dy });
const playBtn = (cy, op = 1) => { const { x, y } = btnAt(cy); return `<g class="p-btn" role="button" aria-label="Play back" style="opacity:${op.toFixed(2)}"><title>Play back: Puts this broadcast back on the air, once.</title><rect x="${x}" y="${y}" width="${BTN.w}" height="${BTN.h}" rx="3"/><path d="M${x + 16} ${y + 8}v12l9 -6z"/><text x="${W / 2 + 10}" y="${y + 18.5}" text-anchor="middle">PLAY BACK</text></g>`; };
const LOST_Y = H / 2 - 10;
// Where Play back sits, or null: on the lost screen once it has typed out, and on an idle pad with a tape to play.
export function playAt(s, A, t) {
  if (SC.playable(s, t * 1000)) return null;
  if (A && A.stage !== 'lost') return null;
  if (A && t - A.out.t < 2) return null;
  return btnAt(LOST_Y);
}

// The decoded stream along the pad's bottom edge, newest at the print head on the right. chars: [[ch, kind]] (0 clear,
// 1 garbled, 2 static, 3 a catch's LOGGED line, 4 the sync word); acc: how far the head has moved into the next one.
const TK = ['', ' n', ' s', ' g', ' y'];
function streamSvg(stream) {
  const cw = 7.22, head = W - 28, y = H - 12, all = stream.chars.slice(-Math.floor((W - 60) / cw));
  let txt = '', cls = -1, run = '';
  const flush = () => { if (run) txt += `<tspan class="tk${TK[cls]}">${esc(run)}</tspan>`; run = ''; };
  for (const [ch, k] of all) { if (k !== cls) { flush(); cls = k; } run += k === 4 ? '◆' : ch; }
  flush();
  return `<g mask="url(#sc-tkmask)"><text class="p-tick-text" x="${n1(head - stream.acc * cw)}" y="${y}" text-anchor="end" xml:space="preserve">${txt}</text></g><rect class="p-head" x="${head + 3}" y="${y - 10}" width="6" height="12"/>`;
}
// The search: the station's samples show only inside your light; its brightest points glint now and then.
function searchSvg(A, t) {
  const p = SC.cloudOf(A, t), v = SC.visOf(A, t), spread = 48 + 26 * (1 - v), [mx, my] = A.me;
  let o = '';
  for (const q of PTS) {
    const [x, y] = ptXY(q, p[0], p[1], spread, t), lit = Math.max(0, 1 - Math.hypot(x - mx, y - my) / LIGHT) ** 1.3;
    const glint = q.b > 0.88 && Math.sin(t * 2.1 + q.ph * 5) > 0.985 ? 0.55 : 0, op = Math.max(lit * (0.35 + 0.65 * q.b), glint) * v;
    if (op > 0.02) o += pt(q, x, y, op);
  }
  return o + `<circle class="p-reach" cx="${n1(mx)}" cy="${n1(my)}" r="${LIGHT}"/><circle class="p-you" cx="${n1(mx)}" cy="${n1(my)}" r="3"/>`;
}
function lockSvg(A, t, aim) {
  const bt = t - A.found, into = 0.4 + 0.6 * Math.min(1, bt / 0.5), [mx, my] = A.me, p = SC.cloudOf(A, t), v = SC.visOf(A, t), sv = SC.signalOf(A, t);
  let o = `<line class="p-mid" x1="${W / 2}" x2="${W / 2}" y1="0" y2="${H}"/><line class="p-mid" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/><text class="p-axis" x="${W - 12}" y="${H / 2 - 8}" text-anchor="end">PHASE</text><text class="p-axis" x="${W / 2 + 8}" y="34">RATE</text>`;
  if (bt < 0.7) { const u = bt / 0.7; o += `<circle class="p-found" cx="${n1(mx)}" cy="${n1(my)}" r="${n1(LIGHT * (0.6 + 0.8 * ease(u)))}" style="opacity:${(1 - u).toFixed(2)}"/>`; }
  o += scatter(p[0], p[1], 16 + 32 * (1 - A.lock) + 26 * (1 - v), into * (0.12 + 0.88 * sv) * (0.12 + 0.88 * v), t);
  if (aim && Math.hypot(aim[0] - mx, aim[1] - my) > 6) o += `<line class="p-aim" x1="${n1(mx)}" y1="${n1(my)}" x2="${n1(aim[0])}" y2="${n1(aim[1])}"/>`;
  return o + reticle(mx, my, SC.inHold(A, t), A.lock);
}
// The misses (red crosses, top left) and the symbols read (top right: cells, or SOS as dots and dashes).
function cells(A) {
  const d = A.dec, K = SC.PLAY[A.kind], n = SC.needOf(A.kind), w = K.pattern ? 16 : 14;
  let o = `<g transform="translate(16 30)">${Array.from({ length: K.strikes }, (_, i) => `<path class="p-strike${i < d.miss ? ' on' : ''}" d="M${i * 14 - 3.5} -3.5l7 7m0 -7l-7 7"/>`).join('')}</g><g transform="translate(${W - 10 - n * w} 25)">`;
  for (let i = 0; i < n; i++) { const on = i < d.got ? ' on' : ''; o += K.pattern?.[i] === '-' ? `<rect class="p-cell${on}" x="${i * w}" y="2" width="12" height="6" rx="3"/>` : K.pattern ? `<circle class="p-cell${on}" cx="${i * w + 6}" cy="5" r="3"/>` : `<rect class="p-cell${on}" x="${i * w}" y="0" width="10" height="10" rx="1"/>`; }
  return o + '</g>';
}
const pops = (A, t) => (A.pops || []).map((pp) => { const a = (t - pp.t) / 0.9; return a >= 1 ? '' : `<circle class="p-burst" cx="${n1(pp.x)}" cy="${n1(pp.y)}" r="${n1(8 + a * 30)}" style="opacity:${(1 - a).toFixed(2)}"/>`; }).join('');
// The sync: the cloud draws into a point, a ring breaks out, the 8 positions spring out; then the symbols, each with a
// countdown ring that's tighter and brighter the less time it has.
function symSvg(A, t) {
  const d = A.dec, K = SC.PLAY[A.kind], tr = t - d.t0, R = { numbers: 8, pirate: 6, distress: 7 }[A.kind];
  const e1 = ease(tr / 0.4), cx = d.from[0] + (d.c[0] - d.from[0]) * e1, cy = d.from[1] + (d.c[1] - d.from[1]) * e1, settle = ease((tr - 0.4) / 0.6);
  let o = scatter(cx, cy, tr < 0.4 ? 16 - 13 * e1 : 3 + 4 * settle, Math.max(0.55, tr < 0.4 ? 1 : 1 - 0.65 * settle), t);
  if (tr < 0.9) o += `<circle class="p-core" cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(2 + 3 * e1 * (1 - settle))}"/>`;
  if (tr < 0.35) { const f = 1 - tr / 0.35; o += `<circle class="p-ring in" cx="${n1(A.me[0])}" cy="${n1(A.me[1])}" r="${n1(HOLD * (0.4 + 0.6 * f))}" style="opacity:${f.toFixed(2)}"/>`; }
  if (tr > 0.38 && tr < 1) { const u = (tr - 0.38) / 0.62; o += `<circle class="p-shock" cx="${n1(d.c[0])}" cy="${n1(d.c[1])}" r="${n1(12 + (SC.PAD.rad + 10) * ease(u))}" style="opacity:${(1 - u).toFixed(2)}"/>`; }
  for (let i = 0; i < 8; i++) {
    const u = (tr - 0.45 - i * 0.035) / 0.45; if (u <= 0) continue;
    const [sx, sy] = SC.slotXY(d, i), b = back(u);
    o += `<circle class="p-slot" cx="${n1(d.c[0] + (sx - d.c[0]) * b)}" cy="${n1(d.c[1] + (sy - d.c[1]) * b)}" r="${K.pattern ? 13 : 11}" style="opacity:${Math.min(1, u * 1.6).toFixed(2)}"/>`;
  }
  for (const dot of d.dots) {
    const a = t - dot.born;
    if (a < 0 || dot.done === 'hit') continue;
    if (dot.done === 'miss') { const f = Math.max(0, 1 - (a - dot.life) / 0.5); o += `<circle class="p-sym miss" cx="${n1(dot.x)}" cy="${n1(dot.y)}" r="${R + 1}" style="opacity:${f.toFixed(2)}"/>`; continue; }
    const u = a / dot.life, sc = A.kind === 'distress' ? Math.min(1, a / 0.3) : back(a / 0.22), cr = n1(dot.dash ? 20 + dot.life * 2 : R + 2 + dot.life * 6), Lr = 2 * Math.PI * cr, quick = dot.life < (K.life[0] + K.life[1]) / 2;
    if (dot.dash) {
      const hp = d.hold?.dot === dot ? Math.min(1, (t - d.hold.start) / K.hold) : 0;
      o += `<rect class="p-dash" x="${n1(dot.x - 15)}" y="${n1(dot.y - 6)}" width="30" height="12" rx="6" style="opacity:${Math.min(1, sc).toFixed(2)}"/>`;
      if (hp > 0) o += `<rect class="p-dash-fill" x="${n1(dot.x - 15)}" y="${n1(dot.y - 6)}" width="${n1(30 * hp)}" height="12" rx="6"/>`;
    } else o += `<circle class="p-symhalo" cx="${n1(dot.x)}" cy="${n1(dot.y)}" r="${n1((R + 6) * sc)}"/><circle class="p-sym" cx="${n1(dot.x)}" cy="${n1(dot.y)}" r="${n1(R * sc)}"/>`;
    o += `<circle class="p-count${quick ? ' quick' : ''}" cx="${n1(dot.x)}" cy="${n1(dot.y)}" r="${cr}" stroke-dasharray="${n1(Lr * (1 - u))} ${n1(Lr)}" transform="rotate(-90 ${n1(dot.x)} ${n1(dot.y)})"/>`;
  }
  o += pops(A, t);
  if (tr > 0.8) o += cells(A);
  return o;
}
// LANTERN's mark on a catch: an ASCII lantern that draws in line by line, its flame flickering.
const LANT = ['    ___    ', '   (___)   ', '  __|_|__  ', ' /       \\ ', ' |  FL1  | ', ' | ( F ) | ', " |  `-'  | ", ' \\_______/ ', "   '---'   "];
const FL1 = [",'.", ',^.', ".',"], FL2 = ['*', '+', '*', 'o'];
function asciiLantern(cx, top, u, t) {
  const f1 = FL1[((Math.floor(t * 8 + Math.sin(t * 3) * 2) % 3) + 3) % 3], f2 = FL2[((Math.floor(t * 6.3) % 4) + 4) % 4];
  let o = `<text class="p-ascii" x="${n1(cx)}" text-anchor="middle" xml:space="preserve">`;
  LANT.forEach((ln, i) => {
    const a = (u - i * 0.05) / 0.12; if (a <= 0) return;
    const line = ln.includes('FL1') ? ln.split('FL1').map(esc).join(`<tspan class="fl">${esc(f1)}</tspan>`) : ln.includes(' F ') ? ln.split(' F ').map(esc).join(` <tspan class="fl">${f2}</tspan> `) : esc(ln);
    o += `<tspan x="${n1(cx)}" y="${n1(top + i * 16)}" style="opacity:${Math.min(1, a).toFixed(2)}">${line}</tspan>`;
  });
  return o + '</text>';
}
// Logged: the 8 lights chase round and gather to the middle, the lantern draws in, and LOGGED, the name and the pay type out.
function loggedSvg(s, A, t) {
  const d = A.dec, st = SC.stationById(A.id), tc = t - A.out.t, cx = W / 2, cy = H / 2 - 30;
  let o = pops(A, t);
  if (tc < 0.6) o += `<g style="opacity:${(1 - tc / 0.6).toFixed(2)}">${cells(A)}${scatter(d.c[0], d.c[1], 7, 0.55, t)}</g>`;
  const g = ease((tc - 0.55) / 0.45);
  if (g < 1) for (let i = 0; i < 8; i++) {
    const [sx, sy] = SC.slotXY(d, i), x = n1(sx + (cx - sx) * g), y = n1(sy + (cy - 50 - sy) * g), on = tc >= i * 0.06;
    o += `<g style="opacity:${(1 - g * g).toFixed(2)}">${on ? `<circle class="p-symhalo" cx="${x}" cy="${y}" r="14"/><circle class="p-sym" cx="${x}" cy="${y}" r="${n1(8 * (1 - 0.4 * g))}"/>` : `<circle class="p-slot" cx="${x}" cy="${y}" r="11"/>`}</g>`;
  }
  if (tc > 0.9) {
    const u = tc - 0.9, fl = Math.max(0, 1 - u / 0.8), flick = 0.92 + 0.08 * Math.sin(t * 9) * Math.sin(t * 5.3);
    o += `<circle cx="${n1(cx)}" cy="${n1(cy - 50)}" r="${n1(80 + 80 * ease(u / 0.9))}" fill="url(#sc-cloud)" style="opacity:${((0.25 + 0.5 * fl) * flick).toFixed(2)}"/>`;
    if (u < 1) o += `<circle class="p-flare" cx="${n1(cx)}" cy="${n1(cy - 50)}" r="${n1(30 + 170 * ease(u))}" style="opacity:${(1 - u).toFixed(2)}"/>`;
    o += asciiLantern(cx, cy - 122, u, t);
  }
  const p = payOf(s, st), pay = `${p.text} · ${p.sub}`, w = pay.length * 7.2, ty = cy + 48;
  if (tc > 1.2) o += `<text class="p-k" x="${cx}" y="${n1(ty)}" text-anchor="middle">${typed('LOGGED', tc, 1.2, 24)}</text>`;
  if (tc > 1.4) o += `<text class="p-name" x="${cx}" y="${n1(ty + 22)}" text-anchor="middle">${typed(st.name, tc, 1.4)}</text>`;
  if (tc > 1.8) o += `<g class="p-ico" transform="translate(${n1(cx - w / 2 - 12)} ${n1(ty + 33)})" style="opacity:${Math.min(1, (tc - 1.8) / 0.3).toFixed(2)}"><title>${esc(`${p.text}: ${SC.payText(s, st)}`)}</title>${p.icon.replace('<svg ', '<svg width="16" height="16" ')}</g><text class="p-pay" x="${n1(cx - w / 2 + 10)}" y="${n1(ty + 45)}">${typed(pay, tc, 1.9, 40)}</text>`;
  return o;
}
// Lost: the samples (and a lost frame's positions) blow apart into grey static; why types out, over the tape's line.
function lostSvg(s, A, t) {
  const u = t - A.out.t, [ax, ay] = A.out.at, frame = A.out.why === 'frame', e = ease(u / 1.1), st = SC.stationById(A.id), cx = W / 2, ty = LOST_Y;
  let o = '';
  if (frame && A.dec) for (let i = 0; i < 8; i++) { const [sx, sy] = SC.slotXY(A.dec, i); o += `<circle class="p-slot hot" cx="${n1(ax + (sx - ax) * (1 + 1.4 * e))}" cy="${n1(ay + (sy - ay) * (1 + 1.4 * e))}" r="11" style="opacity:${(1 - e).toFixed(2)}"/>`; }
  for (const q of PTS) { const an = q.a + q.w * t, rr = q.r * (frame ? 7 : 30) + 240 * e * (0.4 + q.b); o += pt(q, ax + Math.cos(an) * rr, ay + Math.sin(an) * rr * 0.9, (1 - e) * (0.3 + 0.7 * q.b), ' dead'); }
  const why = SC.playable(s, t * 1000), note = !why ? 'on tape · play it back once' : SC.tapeOf(s)?.played ? 'played back · nothing left on tape' : 'on tape';
  if (u > 0.6) o += `<text class="p-k hot" x="${cx}" y="${ty}" text-anchor="middle">${typed(frame ? 'FRAME LOST' : 'SIGNAL LOST', u, 0.6, 30)}</text>`;
  if (u > 0.9) o += `<text class="p-name dim" x="${cx}" y="${ty + 22}" text-anchor="middle">${typed(st.name, u, 0.9)}</text>`;
  if (u > 1.3) o += `<text class="p-note" x="${cx}" y="${ty + 44}" text-anchor="middle">${typed(note, u, 1.3, 40)}</text>`;
  if (u > 2 && !why) o += playBtn(ty, Math.min(1, (u - 2) / 0.3));
  return o;
}
// Nothing to catch: dead air (with Play back when the tape holds one), or a station already logged.
function idleSvg(s, t) {
  const a = SC.onAir(s, t * 1000), st = a && SC.stationById(a.id), T = SC.tapeOf(s), tst = T && SC.stationById(T.id), cx = W / 2, ty = LOST_Y;
  if (st) return `<text class="p-k" x="${cx}" y="${ty}" text-anchor="middle">LOGGED</text><text class="p-name dim" x="${cx}" y="${ty + 22}" text-anchor="middle">${esc(st.name)}</text><text class="p-note" x="${cx}" y="${ty + 44}" text-anchor="middle">nothing new on it</text>`;
  const why = SC.playable(s, t * 1000);
  return `<text class="p-k" x="${cx}" y="${ty}" text-anchor="middle">DEAD AIR</text>${!why ? `<text class="p-name dim" x="${cx}" y="${ty + 22}" text-anchor="middle">${esc(tst.name)}</text><text class="p-note" x="${cx}" y="${ty + 44}" text-anchor="middle">on tape · play it back once</text>${playBtn(ty)}` : ''}`;
}
const DEFS = `<defs><radialGradient id="sc-cloud"><stop offset="0" stop-color="#ffd85c" stop-opacity=".85"/><stop offset=".35" stop-color="#f1b92f" stop-opacity=".4"/><stop offset="1" stop-color="#f1b92f" stop-opacity="0"/></radialGradient><radialGradient id="sc-light"><stop offset="0" stop-color="#7fd1c7" stop-opacity=".13"/><stop offset=".6" stop-color="#7fd1c7" stop-opacity=".04"/><stop offset="1" stop-color="#7fd1c7" stop-opacity="0"/></radialGradient><radialGradient id="sc-lamp"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><pattern id="sc-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="#7fd1c7" fill-opacity=".5"/></pattern><linearGradient id="sc-tkgrad" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="sc-tkmask"><rect x="0" y="${H - 30}" width="${W}" height="30" fill="url(#sc-tkgrad)"/></mask>`;
// The pad's insides at t: A the attempt (or null), me your light, aim where a held pointer is, stream the decoded text.
export function padSvg(s, A, t, { me = A?.me || [W * 0.2, H * 0.8], aim = null, stream = { chars: [], acc: 0 } } = {}) {
  const done = A && (A.stage === 'logged' || A.stage === 'lost');
  let o = `${DEFS}<mask id="sc-pmask"><circle cx="${n1(me[0])}" cy="${n1(me[1])}" r="${LIGHT * 1.35}" fill="url(#sc-lamp)"/></mask></defs>${corners()}`;
  // The grid shows only under the lamp, so it covers the lamp's square, not the pad: a whole-pad masked fill redrawn
  // every frame cost most of Tune's frame time.
  const R = LIGHT * 1.35;
  o += `<g style="opacity:${!A || done ? 0.35 : 1}"><rect x="${n1(me[0] - R)}" y="${n1(me[1] - R)}" width="${n1(2 * R)}" height="${n1(2 * R)}" fill="url(#sc-grid)" mask="url(#sc-pmask)"/><circle cx="${n1(me[0])}" cy="${n1(me[1])}" r="${LIGHT * 1.35}" fill="url(#sc-light)"/></g>`;
  o += streamSvg(stream);
  if (!A) return o + idleSvg(s, t);
  if (A.stage === 'search' || A.stage === 'lock') {
    const left = SC.airLeft(s, A, t), fr = left / SC.PLAY[A.kind].air, hot = left < SC.PAD.last ? ' hot' : '';
    o += `<line class="p-airtrack" x1="20" x2="${W - 20}" y1="8" y2="8"/><line class="p-air${hot}" x1="20" x2="${n1(20 + (W - 40) * fr)}" y1="8" y2="8"/><text class="p-airt${hot}" x="${W - 20}" y="24" text-anchor="end">${Math.ceil(left)}s</text>`;
  }
  if (A.stage === 'search') return o + searchSvg(A, t);
  if (A.stage === 'lock') return o + lockSvg(A, t, aim);
  if (A.stage === 'sym') return o + symSvg(A, t);
  if (A.stage === 'logged') return o + loggedSvg(s, A, t);
  return o + lostSvg(s, A, t);
}
// The status line: lantern-rx on post-07, the signal as 9 cells, the decoder switch.
export function statusMarkup(A, t, decoder) {
  const lit = Math.max(1, Math.round(SC.signalOf(A, t) * 8) + 1);
  return `<span class="sc-app">lantern-rx <em>${POST.host}</em></span><span class="sc-sig" title="Signal: How near your light is to the station.">${Array.from({ length: 9 }, (_, i) => `<i${i < lit ? ' class="on"' : ''}></i>`).join('')}</span><span class="sc-decs" role="group" aria-label="Decoder">${Object.entries(SC.DECODERS).map(([k, D]) => `<button type="button" data-sc-dec="${k}" aria-pressed="${decoder === k}" title="${esc(`${D.name}: Decoder. ${D.does}\nThe wrong one locks at half speed and stays garbled.`)}">${D.name}</button>`).join('')}</span>`;
}
// The Tune window's insides, whole (what mount builds, and what the tests read).
export const tuneMarkup = (s, A, t, opts = {}) => `<div class="sc-status" data-sc="status">${statusMarkup(A, t, opts.decoder || A?.decoder || 'vox')}</div><div class="sc-pad" data-sc="pad" tabindex="0" role="application" aria-label="Tune"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" data-sc="svg">${padSvg(s, A, t, opts)}</svg></div>`;

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
    <header class="net-head"><div class="net-where"><span class="fmark-i" style="--fc:${POST.color}">${g('antenna')}</span><b>${POST.host.toUpperCase()}</b></div><span class="post-by" title="LANTERN: The crew that runs this post.">${glyph('f-lantern')}LANTERN</span><button type="button" class="btn small" data-hub-close title="Disconnect">×</button></header>
    <ol class="term" id="hubterm">${lines.map((l) => `<li class="${l.cls}">${l.menu ? postMenuLine(s, at, win).html : l.motd ? postMotd(s, at) : l.html}</li>`).join('')}</ol>
  </section>`;
  const w = W ? `<section class="card hub-win post-win${win === 'tune' ? ' tune' : ''}" data-keep="post ${W.title}"><h2>${W.title}<button type="button" class="btn small x" data-hub-opt="" title="Close">×</button></h2>${W.body(s, at)}</section>` : '';
  return `<div class="hub-session${W ? ' with-win' : ''}" style="--fc:${POST.color}">${term}${w}</div>`;
}

// ---------- the controller ----------
// opts: state() the save, changed() after the save changes (save and redraw), busy() true in a fight, sound() and
// volume() the Sound setting and the Effects volume, played() after Play back, found(loc) when the clue pins Nine Days
// Deaf on a server.
// Tune is built once and painted in place (the status line when it changes, the pad's SVG every frame at up to 30 fps);
// app.js mounts it in the Tune window after every redraw. The attempt lives here: closing Tune drops it, with no loss.
const NOISE = '·:.░▒ ·.:  ';
export function createScanner({ state, changed = () => {}, busy = () => false, sound = () => false, volume = () => 0.8, played = () => {}, found = () => {} }) {
  let open = false, last = 0, lastPaint = 0, lastSched = 0, statusHtml = '', A = null, decoder = 'vox', held = false, lastTick = 99, holdSnd = false;
  const me = [SC.PAD.w * 0.2, SC.PAD.h * 0.8], aim = [...me];
  const stream = { chars: [], acc: 0, src: null, i: 0 };
  const radio = createRadio();
  const root = typeof document === 'undefined' ? null : document.createElement('div');
  const $ = (k) => root.querySelector(`[data-sc="${k}"]`);
  root?.classList.add('sc-rx');
  if (typeof document !== 'undefined') document.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-scan-play]')) play(); // in Recordings
    const b = open && e.target.closest?.('[data-sc-dec]');
    if (b && root.contains(b)) { decoder = b.dataset.scDec; if (A) A.decoder = decoder; paint(true); }
  });
  function play() { const s = state(), now = Date.now(); if (SC.playBack(s, now)) { A = null; begin(s, now); changed(); played(); paint(true); } }
  function begin(s, now) { const a = SC.onAir(s, now); if (!a || (A && A.id === a.id && A.air === a.start)) return; const n = SC.attempt(s, now / 1000, { me, decoder }); if (n) { A = n; A.me = me; lastTick = 99; } }
  // Where a pointer is, in pad units (the SVG scales with the window).
  function padXY(e) { const svg = $('svg'), m = svg.getScreenCTM(); if (!m) return [0, 0]; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return [p.x, p.y]; }
  const clamp = ([x, y]) => [Math.max(8, Math.min(SC.PAD.w - 8, x)), Math.max(8, Math.min(SC.PAD.h - 8, y))];
  function wirePad() {
    const pad = $('pad');
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault(); pad.focus({ preventScroll: true });
      const s = state(), t = Date.now() / 1000, [x, y] = padXY(e);
      const b = playAt(s, A, t); // Play back, on the press: the pad redraws every frame, so a click would be lost
      if (b) { if (x >= b.x && x <= b.x + 116 && y >= b.y && y <= b.y + 28) play(); return; }
      if (!A || A.stage === 'logged' || A.stage === 'lost') return;
      if (A.stage === 'sym') {
        const ev = SC.tap(s, A, [x, y], t); hear(ev, s, t);
        if (ev.some((v) => v.e === 'hold')) { const up = () => { SC.release(A); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }; addEventListener('pointerup', up); addEventListener('pointercancel', up); }
        return;
      }
      // Holding carries your light; it stays where you let go.
      const to = (ev) => { const p = clamp(padXY(ev)); aim[0] = p[0]; aim[1] = p[1]; };
      held = true; to(e);
      const up = () => { held = false; aim[0] = me[0]; aim[1] = me[1]; removeEventListener('pointermove', to); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
      addEventListener('pointermove', to); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }
  function show() {
    open = true; statusHtml = '';
    const s = state(), now = Date.now();
    begin(s, now);
    root.innerHTML = tuneMarkup(s, A, now / 1000, { me, stream, decoder });
    statusHtml = $('status').innerHTML;
    wirePad();
    $('pad').focus({ preventScroll: true });
    if (sound()) radio.wake();
  }
  function close() {
    if (!open) return;
    open = false; A = null; held = false;
    root.remove();
    radio.quiet();
  }
  // The rules' events, as sounds (and the pad's pops).
  function hear(ev, s, t) {
    for (const v of ev) {
      if (v.e === 'found') radio.found();
      else if (v.e === 'sync') radio.sync();
      else if (v.e === 'sym') radio.sym(v.i, v.delay);
      else if (v.e === 'hold') { radio.holdOn(v.i); holdSnd = true; }
      else if (v.e === 'take') { (A.pops ||= []).push({ x: v.x, y: v.y, t }); if (A.stage !== 'logged') radio.take(v.i); }
      else if (v.e === 'miss') radio.miss();
      else if (v.e === 'logged') { radio.logged(); const p = payOf(s, SC.stationById(A.id)); stream.chars.push(...[...` ◆ LOGGED · ${p.text.toUpperCase()} ◆ `].map((c) => [c, 3])); changed(); }
      else if (v.e === 'lost') { radio.lost(); changed(); }
    }
    if (holdSnd && !A?.dec?.hold) { radio.holdOff(); holdSnd = false; }
    if (A) A.pops = (A.pops || []).filter((p) => t - p.t < 0.9);
  }
  // The decoded stream: the station's words scrambled by clarity, LANTERN's sync word (04 09 09) heading each repeat
  // once the lock is a third full; static with nothing to read.
  function flow(s, dt, t) {
    const st = A && A.stage !== 'lost' && SC.stationById(A.id), sv = SC.signalOf(A, t), wrong = A && A.decoder !== SC.PLAY[A.kind].decoder ? 0.3 : 1;
    let src = null, clear = 0;
    if (st && (A.stage !== 'search' || sv > 0.06)) {
      src = SC.textOf(s, st) + ' · ';
      clear = A.stage === 'logged' ? 1 : A.stage === 'sym' ? wrong : A.stage === 'lock' ? Math.min(1, 0.15 + A.lock * 0.9) * Math.min(1, sv * 1.4) * wrong : Math.min(1, sv * sv * 1.1);
    }
    if (src !== stream.src) { stream.src = src; stream.i = 0; }
    const sync = A && (A.stage === 'sym' || A.stage === 'logged' || A.lock >= 0.3);
    stream.acc += dt * (src ? 16 : 26);
    while (stream.acc >= 1) {
      stream.acc -= 1;
      if (src && sync && stream.i % src.length === 0) stream.chars.push(['\x04', 4], ['\x09', 4], ['\x09', 4]);
      const ch = src ? src[stream.i++ % src.length] : NOISE[Math.floor(Math.random() * NOISE.length)];
      stream.chars.push(!src ? [ch, 2] : ch === ' ' || Math.random() < clear ? [ch, 0] : [NOISE[Math.floor(Math.random() * NOISE.length)], 1]);
    }
    if (stream.chars.length > 300) stream.chars.splice(0, stream.chars.length - 200);
  }
  function paint(force = false) {
    if (!open) return;
    const now = Date.now(), t = now / 1000, s = state();
    if (!force && now - lastPaint < 33) return;
    lastPaint = now;
    const sh = statusMarkup(A, t, decoder);
    if (sh !== statusHtml) { $('status').innerHTML = sh; statusHtml = sh; }
    $('svg').innerHTML = padSvg(s, A, t, { me, aim: held ? aim : null, stream });
    const stage = !A ? 'idle' : A.stage;
    radio.frame({ on: sound(), volume: volume(), stage, s: SC.signalOf(A, t), vis: A ? SC.visOf(A, t) : 0, lock: A?.lock || 0, inZ: !!A && SC.inHold(A, t), kind: A?.kind, text: A ? SC.textOf(s, SC.stationById(A.id)) : '' });
  }
  // The arrow keys move your light while Tune is open, unless you're typing (Shift for further).
  if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => {
    if (!open || !root.isConnected || !A || (A.stage !== 'search' && A.stage !== 'lock')) return;
    if (/input|textarea|select/i.test(e.target.tagName || '')) return;
    const k = e.shiftKey ? 32 : 10, mv = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, -k], ArrowDown: [0, k] }[e.key];
    if (!mv) return;
    e.preventDefault();
    const p = clamp([me[0] + mv[0], me[1] + mv[1]]); aim[0] = p[0]; aim[1] = p[1];
  }, true);
  return {
    // Puts Tune in the window's slot (after every redraw), or takes it away (null: the window is shut).
    mount(slot) {
      if (!slot || busy()) return close();
      if (root.parentElement !== slot) slot.append(root);
      if (!open) show();
    },
    isOpen: () => open,
    due: () => lastSched + 500, // when tick() next looks at the schedule (Date.now() ms)
    // Every frame: the schedule, the attempt, the paint, the sound.
    tick(now = Date.now()) {
      const s = state(), dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000)), t = now / 1000;
      last = now;
      if (now - lastSched >= 500) {
        lastSched = now;
        const ev = SC.tickScanner(s, now);
        const clue = !SC.postFound(s) && !busy() && SC.findPost(s, now);
        if (clue) { found(clue); changed(); } // the clue: numbers in the chatter, from a repeater on one of your servers
        else if (ev === 'start' && SC.postFound(s) && sound() && !busy()) radio.cue(volume());
        if (ev) changed();
      }
      if (open && busy()) close();
      if (!open) return;
      begin(s, now);
      if (A && (A.stage === 'search' || A.stage === 'lock')) {
        const k = Math.min(1, 14 * dt); me[0] += (aim[0] - me[0]) * k; me[1] += (aim[1] - me[1]) * k;
        const left = Math.ceil(SC.airLeft(s, A, t));
        if (left <= SC.PAD.last && left !== lastTick && left > 0) radio.tick();
        lastTick = left;
      }
      hear(SC.padStep(s, A, dt, t), s, t);
      flow(s, dt, t);
      paint();
    },
    // For tests and screenshots: the attempt, your light, and the decoder.
    get attempt() { return A; }, me, aim, setDecoder(k) { decoder = k; if (A) A.decoder = k; }, close, play,
  };
}

// ---------- sound ----------
// Plays only while Tune is open, at Sound and the Effects volume (master 0.33 at the default 80%). The beds: static that
// thins as your light nears, the station under it (numbers pips pitched from its digits, a pirate's bass riff, SOS),
// and a lock tone that climbs with the lock and sags when you slip. The moments: a two-tone when found; a rush and a
// high pair on sync; a note per symbol position (A major pentatonic), plucked on a catch and held for a long one; a
// thud for a miss; the ring running up and a chord when logged; a falling static burst when lost; a tick in the last
// 10 s. Outside Tune, only the ping when a broadcast starts (anywhere but a fight).
function createRadio() {
  let ac = null, n = {}, vIdx = 0, vNext = 0, vKind = null, hold = null, on = false;
  const NOTE = [440, 493.9, 554.4, 659.3, 740, 880, 987.8, 1108.7];
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
  function wake() {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const m = ac.createGain(); m.gain.value = 0; m.connect(ac.destination);
        const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.4;
        const hiss = ac.createGain(); hiss.gain.value = 0; noise.connect(bp).connect(hiss).connect(m); noise.start();
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        const voice = ac.createGain(); voice.gain.value = 0; voice.connect(hp).connect(lp).connect(m);
        const lt = ac.createOscillator(); lt.type = 'triangle'; lt.frequency.value = 196;
        const ltf = ac.createBiquadFilter(); ltf.type = 'lowpass'; ltf.frequency.value = 900;
        const ltg = ac.createGain(); ltg.gain.value = 0; lt.connect(ltf).connect(ltg).connect(m); lt.start();
        const fx = ac.createGain(); fx.connect(m);
        const dl = ac.createDelay(); dl.delayTime.value = 0.19; const fb = ac.createGain(); fb.gain.value = 0.28; const wet = ac.createGain(); wet.gain.value = 0.2;
        fx.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(m);
        n = { m, hiss, voice, lt, ltg, fx, buf };
      }
      if (ac.state === 'suspended') ac.resume();
    } catch { ac = null; }
  }
  const live = () => on && ac && ac.state === 'running';
  const set = (prm, v, tc = 0.08) => prm.setTargetAtTime(v, ac.currentTime, tc);
  const master = (volume) => set(n.m.gain, 0.33 * volume / 0.8, 0.05);
  function tone(f, at, dur, { type = 'sine', peak = 0.2, attack = 0.006, dest = n.fx, glide = 0 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, at);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * glide), at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(dest); o.start(at); o.stop(at + dur + 0.05);
  }
  function rush(at, dur, from, to, peak) {
    const src = ac.createBufferSource(); src.buffer = n.buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.08, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(n.fx); src.start(at, Math.random()); src.stop(at + dur + 0.05);
  }
  // The station under the static, scheduled a little ahead: [hz, length, step, type, peak].
  const SOS = (() => { const u = 0.11, out = [], dot = () => out.push([700, u, 2 * u]), dash = () => out.push([700, 3 * u, 4 * u]); for (const l of 'SOS') { (l === 'S' ? [dot, dot, dot] : [dash, dash, dash]).forEach((x) => x()); out.push([0, 0, 2 * u]); } out.push([0, 0, 1.2]); return out; })();
  const RIFF = [110, 110, 165, 147, 110, 98, 131, 147];
  function voiceEvent(kind, text, i) {
    if (kind === 'numbers') { const dg = text.replace(/\D/g, '') || '0', k = i % 6; return k === 5 ? [0, 0, 1.1] : [380 + Number(dg[(Math.floor(i / 6) * 5 + k) % dg.length]) * 55, 0.2, 0.42, 'sine', 0.5]; }
    if (kind === 'pirate') return [RIFF[i % RIFF.length], 0.22, 0.27, 'sawtooth', 0.22];
    return [...SOS[i % SOS.length], 'sine', 0.5];
  }
  function voices(kind, text) {
    if (kind !== vKind || vNext < ac.currentTime - 0.5) { vKind = kind; vIdx = 0; vNext = ac.currentTime + 0.05; }
    while (vNext < ac.currentTime + 0.3) { const [f, d, stp, ty, pk] = voiceEvent(kind, text, vIdx++); if (f) tone(f, vNext, d, { type: ty, peak: pk, dest: n.voice, attack: 0.012 }); vNext += stp; }
  }
  function quiet() { holdOff(); if (!ac) return; for (const k of ['hiss', 'voice', 'ltg']) set(n[k].gain, 0, 0.05); vKind = null; }
  function holdOff() { if (!hold || !ac) return; const { o, g } = hold, t = ac.currentTime; g.gain.setTargetAtTime(0.0001, t, 0.03); o.stop(t + 0.2); hold = null; }
  return {
    wake, quiet,
    // Every paint: the beds from where you are in the catch.
    frame({ on: o, volume, stage, s, vis, lock, inZ, kind, text }) {
      on = o;
      if (!on) return quiet();
      if (!ac) wake();
      if (!live()) return;
      master(volume);
      const hiss = { idle: 0.05, search: 0.05 * (1 - 0.7 * s), lock: 0.035 * (1 - 0.6 * lock), sym: 0.012, logged: 0.008, lost: 0.006 }[stage];
      const voice = { idle: 0, search: 0.55 * s ** 1.3 * vis, lock: (0.25 + 0.5 * lock) * vis, sym: 0.35, logged: 0.15, lost: 0 }[stage];
      set(n.hiss.gain, hiss); set(n.voice.gain, voice);
      if (stage === 'lock') { set(n.lt.frequency, 196 + 196 * lock, 0.1); set(n.ltg.gain, inZ ? 0.05 : 0.016); } else set(n.ltg.gain, 0);
      if (voice > 0.01 && kind) voices(kind, text); else vKind = null;
    },
    found() { if (!live()) return; const t = ac.currentTime; tone(523.3, t, 0.3, { peak: 0.12 }); tone(784, t + 0.11, 0.45, { peak: 0.12 }); },
    sync() { if (!live()) return; const t = ac.currentTime; rush(t, 0.55, 400, 4200, 0.12); tone(880, t + 0.32, 0.7, { peak: 0.07 }); tone(1318.5, t + 0.4, 0.7, { peak: 0.05 }); },
    sym(i, delay = 0) { if (!live()) return; tone(NOTE[i], ac.currentTime + Math.max(0, delay), 0.16, { peak: 0.05 }); },
    take(i) { if (!live()) return; const t = ac.currentTime; tone(NOTE[i], t, 0.55, { type: 'triangle', peak: 0.24 }); tone(NOTE[i] * 2, t, 0.25, { peak: 0.06 }); },
    miss() { if (!live()) return; const t = ac.currentTime; tone(150, t, 0.32, { peak: 0.2, glide: 0.5 }); rush(t, 0.18, 700, 200, 0.06); },
    holdOn(i) { if (!live() || hold) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = NOTE[i] / 2; g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 0.05); o.frequency.linearRampToValueAtTime(NOTE[i], ac.currentTime + 0.5); o.connect(g).connect(n.fx); o.start(); hold = { o, g }; },
    holdOff,
    logged() { holdOff(); if (!live()) return; const t = ac.currentTime; NOTE.forEach((f, k) => tone(f, t + k * 0.06, 0.4, { type: 'triangle', peak: 0.11 })); [220, 277.2, 329.6, 440, 554.4].forEach((f) => tone(f, t + 0.9, 2.4, { type: 'triangle', peak: 0.065, attack: 0.08 })); tone(1760, t + 0.95, 0.5, { peak: 0.03 }); },
    lost() { holdOff(); if (!live()) return; const t = ac.currentTime; rush(t, 1.1, 3600, 160, 0.22); tone(330, t + 0.05, 1.0, { type: 'triangle', peak: 0.12, glide: 0.33 }); },
    tick() { if (!live()) return; tone(1250, ac.currentTime, 0.05, { peak: 0.045 }); },
    // The ping when a broadcast starts, anywhere but a fight (Tune open or not).
    cue(volume) { wake(); if (!ac || ac.state !== 'running') return; set(n.m.gain, 0.33 * volume / 0.8, 0.01); const t = ac.currentTime; tone(660, t, 0.25, { peak: 0.06, dest: n.m }); tone(990, t + 0.22, 0.4, { peak: 0.06, dest: n.m }); },
  };
}
