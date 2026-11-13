// A fight coming up (app.js go, the first time you see each fight): the screen powers down and boots into it, the
// virus first. From the rooms page, red brackets lock on the room you walked into while the map holds a beat; then the
// tube goes dark with its edge glowing red. The virus's picture comes up alone at the centre of the dark, decoding out
// of red noise, holds, and drops into its panel; its name and bar come on and its bar fills. A boot console types
// through your system where the board will be (your bar, class, keys, the virus, the clock), and then your panels come
// up one by one, your bar filling. Any key or click ends it at once (and still acts).
// Calm (the designer: less flashing): no flash and nothing blinks; a panel only ever brightens or only dims, in short
// held steps, and your chrome dims rather than going out. No canvas: the real panels through the Web Animations API,
// with a black layer behind them and the console, noise and glow on top (bootfx.css).
// Leaving a won fight (app.js leaveFight, the designer's pick, Channel cut): the page collapses to a teal line, then a
// dot, like a tube switching channel; the page you go back to opens out of the line, and your room rings teal.
// Connecting to a server (app.js connectTo, Carrier): see playConnect. Jacking out (app.js hangUp, the Carrier
// backwards): see playHangup.
// Screen effects off, Motion off or reduced motion: none of them plays (app.js doesn't call them).

// When each beat comes, in ms; without the brackets (not from the rooms page) everything comes LOCK sooner.
export const BOOT = {
  lock: 0, black: 250, virus: 340, centre: 1000, enemy: 910, enemyBar: 990,
  console: 1150, line: 62, chrome: 1710, you: 1750, youBar: 1810, board: 1790, log: 1850, prompt: 1890, tray: 1930, done: 2200,
};
const LOCK = 200;
// A panel coming up: [ms, opacity] from the moment it starts, each held until the next. It only ever brightens.
export const TUBE_ON = [[0, 0], [50, 0.35], [100, 0.7], [150, 1], [155, 1]];
export const VIRUS_ON = [[0, 0], [70, 0.3], [140, 0.65], [220, 1], [225, 1]];
// Your chrome through a cut: it dims to this and comes back up, never out.
export const CHROME_LOW = 0.15;
const DOWN = (at, lo = CHROME_LOW) => [[Math.max(0, at - 80), 0.6], [Math.max(0, at - 40), 0.3], [at, lo]];
const NOISE = '@%#*+=-:.01';

// The console's lines: what your system checks as it comes up. The virus's line is the red one.
export function bootLines({ bar = 'signal', hp = '', cls = '', level = '', keys = [], virus = '', paused = true }) {
  const row = (k, v) => `${k} ${'.'.repeat(Math.max(3, 17 - k.length))} ${v}`;
  return [
    { text: 'BLACKBOX MODEL 7 · cold boot' },
    { text: row(bar.toLowerCase(), hp) },
    { text: row('class', `${cls.toLowerCase()} lv ${level}`) },
    ...keys.slice(0, 4).map((k, i) => ({ text: row(`key ${i + 1} ${k.toLowerCase()}`, 'ok') })),
    { text: row('proc/intrusion', virus), hot: true },
    { text: row('cycle clock', paused ? 'paused' : 'running') },
    { text: '> ready_' },
  ];
}

// Take the rooms page as it stands, with the room the fight is in, before the fight's page replaces it.
export function capture(page, chip) {
  if (!page || page.hidden || !chip) return null;
  const pr = page.getBoundingClientRect(), cr = chip.getBoundingClientRect(), k = pr.width / (page.offsetWidth || pr.width) || 1;
  if (!cr.width) return null;
  const clone = page.cloneNode(true);
  clone.removeAttribute('id'); clone.classList.add('bootfx-hold'); clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, { left: '0px', top: '0px', width: `${page.offsetWidth}px`, height: `${page.offsetHeight}px` });
  const lock = document.createElement('div');
  lock.className = 'bootfx-lock'; lock.innerHTML = '<i></i><i></i><i></i><i></i>';
  Object.assign(lock.style, { left: `${(cr.left - pr.left) / k}px`, top: `${(cr.top - pr.top) / k}px`, width: `${cr.width / k}px`, height: `${cr.height / k}px` });
  clone.append(lock);
  return { clone, parent: page.parentElement, lock, at: pr, k };
}

let current = null;
export const booting = () => !!current;
export function stopBoot() { current?.(); }

// Play it. app: #app; held: capture()'s result, or null; lines: bootLines().
export function playBoot(app, held, lines) {
  stopBoot();
  const $ = (q) => app.querySelector(q), anims = [], nodes = [], o = held ? 0 : -LOCK, at = (ms) => Math.max(0, ms + o);
  const play = (el, frames, delay, duration, easing = 'linear') => { if (el) anims.push(el.animate(frames, { delay, duration, easing, fill: 'both' })); };
  // Held steps along absolute times: [[ms, value], ...] from 0.
  const steps = (el, prop, pts) => { const end = pts[pts.length - 1][0] || 1; play(el, pts.map(([ms, v]) => ({ [prop]: v, offset: ms / end, easing: 'steps(1, end)' })), 0, end); };
  const tubeOn = (from, lo = 0) => TUBE_ON.map(([ms, v]) => [from + ms, lo + v * (1 - lo)]);
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };

  // The rooms page holding a beat, the brackets locking on.
  if (held) {
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect(); // back over where the page stood
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    play(held.lock, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)', offset: 0.55 }, { opacity: 1, transform: 'scale(1)' }], 0, 220, 'ease-out');
    steps(held.clone, 'opacity', [[0, 1], ...DOWN(BOOT.black, 0), [BOOT.black + 1, 0]]);
  }
  // The power cut: black behind the panels, the tube's edge glowing red once.
  const black = add(app, 'bootfx-black', $('#fx-back')?.nextSibling || app.firstChild);
  const b0 = Math.max(0, at(BOOT.black) - 100);
  play(black, [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], b0, at(BOOT.chrome) - b0 + 150, 'ease-in-out');
  const top = add(app, 'bootfx'), flare = add(top, 'bootfx-flare');
  play(flare, [{ opacity: 0 }, { opacity: 0.35, offset: 0.3 }, { opacity: 0 }], at(BOOT.black), 900, 'ease-in-out');
  // Your chrome dims with the cut and comes back up with the rest of you.
  for (const [q, on] of [['.topbar', BOOT.chrome], ['#sidebar', BOOT.chrome], ['#crewwin', BOOT.chrome], ['#statusline', BOOT.chrome + 20], ['#net-line', BOOT.prompt], ['.prompt-row', BOOT.prompt], ['#tray', BOOT.tray]])
    steps($(q), 'opacity', [[0, 1], ...DOWN(at(BOOT.black)), ...tubeOn(at(on), CHROME_LOW)]);
  // The virus: alone in the dark at the centre, red-lit and decoding, then into its panel.
  const stage = $('#combat-view > .stage'), pic = stage?.querySelector('.virus-stage');
  if (stage) {
    steps(stage, 'opacity', [[0, 0], ...VIRUS_ON.map(([ms, v]) => [at(BOOT.virus) + ms, v])]);
    play(stage, [{ filter: 'drop-shadow(0 0 0 rgba(255, 91, 61, 0)) brightness(1.6) sepia(.6) hue-rotate(-25deg) saturate(2.2)' }, { filter: 'drop-shadow(0 0 26px rgba(255, 91, 61, .75)) brightness(1.3) sepia(.4) hue-rotate(-20deg) saturate(1.8)', offset: 0.5 }, { filter: 'none' }], at(BOOT.virus), BOOT.centre + 350);
    const sr = stage.getBoundingClientRect(), ar = app.getBoundingClientRect(), k = sr.width / (stage.offsetWidth || sr.width) || 1;
    const dx = (ar.left + ar.width / 2 - (sr.left + sr.width / 2)) / k, dy = (ar.top + ar.height / 2 - (sr.top + sr.height / 2)) / k;
    const big = Math.max(1, Math.min(1.55, (ar.width * 0.8) / sr.width, (ar.height * 0.7) / sr.height));
    play(stage, [{ transform: `translate(${dx}px, ${dy}px) scale(${big})`, zIndex: 5 }, { transform: `translate(${dx}px, ${dy}px) scale(${big * 0.97})`, zIndex: 5, offset: 0.7 }, { transform: 'none', zIndex: 5 }], at(BOOT.virus), BOOT.centre, 'cubic-bezier(.7,0,.25,1)');
    if (pic) {
      const n = add(pic, 'bootfx-noise');
      n.textContent = Array.from({ length: 18 }, () => Array.from({ length: 64 }, () => (Math.random() < 0.5 ? NOISE[Math.floor(Math.random() * NOISE.length)] : ' ')).join('')).join('\n');
      play(n, [{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0.6, offset: 0.55 }, { opacity: 0.25, offset: 0.8 }, { opacity: 0 }], at(BOOT.virus), 520, 'steps(5)');
    }
  }
  // The HUD: the virus's half comes on first, then yours; each bar fills.
  const hud = $('#hud'), foe = hud?.querySelector('.hud-bar.enemy');
  if (hud) {
    steps(hud, 'opacity', [[0, 0], ...tubeOn(at(BOOT.enemy))]);
    if (foe) {
      const hr = hud.getBoundingClientRect(), fr = foe.getBoundingClientRect(), k = hr.width / (hud.offsetWidth || hr.width) || 1;
      const only = `inset(${(fr.top - hr.top) / k}px ${(hr.right - fr.right) / k}px ${(hr.bottom - fr.bottom) / k}px ${(fr.left - hr.left) / k}px)`;
      steps(hud, 'clipPath', [[0, only], ...tubeOn(at(BOOT.you)).map(([ms, v]) => [ms, v > 0 ? 'inset(0px)' : only])]);
    }
    const fill = (q, from, dur) => play(hud.querySelector(q), [{ transform: 'scaleX(0)', transformOrigin: 'left' }, { transform: 'scaleX(1)', transformOrigin: 'left' }], at(from), dur, 'cubic-bezier(.3,.7,.3,1)');
    fill('.hud-bar.enemy .bigbar > span', BOOT.enemyBar, 380);
    fill('.hud-bar.mine .bigbar > span', BOOT.youBar, 300);
  }
  // The console where the board will be, then the board and the log.
  const board = $('#board'), view = $('#combat-view');
  if (board && view) {
    const con = add(view, 'bootfx-console');
    Object.assign(con.style, { left: `${board.offsetLeft}px`, top: `${board.offsetTop}px`, width: `${board.offsetWidth}px`, height: `${board.offsetHeight}px` });
    lines.forEach((l, i) => { const d = document.createElement('div'); d.textContent = l.text; if (l.hot) d.className = 'hot'; con.append(d); steps(d, 'opacity', [[0, 0], [at(BOOT.console + 20) + i * BOOT.line, 1], [at(BOOT.console + 21) + i * BOOT.line, 1]]); });
    const c0 = at(BOOT.console);
    steps(con, 'opacity', [[0, 0], [c0, 1], [c0 + 560, 0.6], [c0 + 600, 0.25], [c0 + 640, 0], [c0 + 641, 0]]);
  }
  steps(board, 'opacity', [[0, 0], ...tubeOn(at(BOOT.board))]);
  steps($('#combat-view > .log'), 'opacity', [[0, 0], ...tubeOn(at(BOOT.log))]);

  let timer = 0;
  const end = () => {
    if (current !== end) return;
    current = null; clearTimeout(timer);
    removeEventListener('keydown', end, true); removeEventListener('pointerdown', end, true);
    anims.forEach((a) => a.cancel()); nodes.forEach((n) => n.remove());
  };
  current = end;
  timer = setTimeout(end, at(BOOT.done));
  addEventListener('keydown', end, true); addEventListener('pointerdown', end, true);
}

// Leaving a won fight, in ms: the page collapses (cut), the next page takes its place (swap), opens out of the line
// (open, for openFor) and your room rings (ring).
export const CUT = { cut: 240, swap: 300, open: 330, openFor: 220, ring: 470, done: 860 };
let cutting = null;
export const leaving = () => !!cutting;
export function stopCut() { cutting?.(); }

// Play it. regions: the page's parts that collapse and open (the workspace, the command dock); swap: goes to the next
// page; room: finds your room's chip on it, or null.
export function playCut(app, regions, swap, room) {
  stopCut();
  const els = regions.filter(Boolean), anims = [], nodes = [], timers = [];
  const play = (el, frames, delay, duration, easing = 'linear') => { const a = el.animate(frames, { delay, duration, easing, fill: 'both' }); anims.push(a); return a; };
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };
  // Every part folds to the same line: the middle of all of them together.
  const rs = els.map((el) => el.getBoundingClientRect()), top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
  const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right)), cx = (left + right) / 2, cy = (top + bottom) / 2;
  const origin = (el, r) => { const k = r.width / (el.offsetWidth || r.width) || 1; return `${(cx - r.left) / k}px ${(cy - r.top) / k}px`; };
  const black = add(app, 'bootfx-black', app.querySelector('#fx-back')?.nextSibling || app.firstChild);
  play(black, [{ opacity: 1 }, { opacity: 1 }], 0, CUT.open + CUT.openFor);
  const layer = add(app, 'bootfx'), lr = layer.getBoundingClientRect(), lk = lr.width / (layer.offsetWidth || lr.width) || 1;
  const line = add(layer, 'bootfx-tline');
  Object.assign(line.style, { left: `${(left - lr.left) / lk}px`, top: `${(cy - lr.top) / lk - 1}px`, width: `${(right - left) / lk}px` });
  play(line, [{ opacity: 0, transform: 'scaleX(1)' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.25 }, { opacity: 1, transform: 'scaleX(.01)', offset: 0.65 }, { opacity: 0, transform: 'scaleX(1)', offset: 0.8 }, { opacity: 0, transform: 'scaleX(1)' }], 100, 260);
  const folds = els.map((el, i) => play(el, [{ transform: 'scale(1, 1)', transformOrigin: origin(el, rs[i]), filter: 'brightness(1)' }, { transform: 'scale(1, .004)', transformOrigin: origin(el, rs[i]), filter: 'brightness(1.4) saturate(0)', offset: 0.7 }, { transform: 'scale(0, .004)', transformOrigin: origin(el, rs[i]), filter: 'brightness(1.4) saturate(0)' }], 0, CUT.cut, 'cubic-bezier(.6,0,.9,.5)'));

  let swapped = false;
  const toNext = () => {
    if (swapped) return;
    swapped = true; folds.forEach((a) => a.cancel());
    swap();
    const chip = room?.(), cr = chip?.getBoundingClientRect(); // measured before the page starts opening
    els.forEach((el) => { const r = el.getBoundingClientRect(); play(el, [{ transform: 'scale(1, .004)', transformOrigin: origin(el, r), filter: 'brightness(1.4)', opacity: 0 }, { opacity: 1, offset: 0.01 }, { transform: 'scale(1, 1.02)', transformOrigin: origin(el, r), filter: 'brightness(1.1)', offset: 0.7 }, { transform: 'scale(1, 1)', transformOrigin: origin(el, r), filter: 'brightness(1)', opacity: 1 }], CUT.open - CUT.swap, CUT.openFor, 'cubic-bezier(.2,.8,.3,1)'); });
    if (cr?.width) {
      const ring = add(layer, 'bootfx-ring');
      Object.assign(ring.style, { left: `${(cr.left - lr.left) / lk - 6}px`, top: `${(cr.top - lr.top) / lk - 6}px`, width: `${cr.width / lk + 12}px`, height: `${cr.height / lk + 12}px` });
      play(ring, [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(1)', offset: 0.35 }, { opacity: 0, transform: 'scale(1)' }], CUT.ring - CUT.swap, 380, 'ease-out');
    }
  };
  const end = () => {
    if (cutting !== end) return;
    cutting = null; timers.forEach(clearTimeout);
    removeEventListener('keydown', end, true); removeEventListener('pointerdown', end, true);
    toNext(); anims.forEach((a) => a.cancel()); nodes.forEach((n) => n.remove());
  };
  cutting = end;
  timers.push(setTimeout(toNext, CUT.swap), setTimeout(end, CUT.done));
  addEventListener('keydown', end, true); addEventListener('pointerdown', end, true);
}

// Connecting to a server (app.js, the designer's pick, Carrier): from the map, your signal runs from HOME to the
// server's node as a teal line; where it lands the node pings and the rooms open in a circle, the map dimming behind
// its edge; the entry rings teal. Eased, never stepped; no black and no text; your chrome stays lit and changes at
// once. HOME not on the map (or not from the map page): no line, the circle opens at once, from the node or the entry.
// When each beat comes, in ms; without the line everything comes `land` sooner.
export const CONNECT = { wire: 0, land: 420, openFor: 780, dimFor: 520, ring: 1160, ringFor: 560, done: 1720 };
const RUN = 'cubic-bezier(.45,0,.55,1)', OPEN = 'cubic-bezier(.55,0,.15,1)';
// The line from HOME's edge to just short of the node: [x, y, length, angle], or null when they're on top of each other.
export function carrierLine(home, node, homeR = 0, nodeR = 0) {
  const dx = node.x - home.x, dy = node.y - home.y, d = Math.hypot(dx, dy), len = d - homeR - nodeR;
  if (!(len >= 12)) return null;
  return { x: home.x + (dx / d) * homeR, y: home.y + (dy / d) * homeR, len, angle: Math.atan2(dy, dx) };
}
// How far the circle opens: from its centre to the page's farthest corner.
export const carrierReach = (c, w, h) => Math.ceil(Math.hypot(Math.max(c.x, w - c.x), Math.max(c.y, h - c.y)));

let dialing = null;
export const connecting = () => !!dialing;
export function stopConnect() { dialing?.(); }
const after = [];
// Run fn once the connect is over (at once if none is playing): the first-run reward waits for it.
export function whenConnected(fn) { if (dialing) after.push(fn); else fn(); }

// Play it. app: #app; held: capture()'s result on the map with the server's node, or null. The rooms page must
// already be drawn in #page-view.
export function playConnect(app, held) {
  stopConnect();
  const T = CONNECT, $ = (q) => app.querySelector(q), anims = [], nodes = [];
  $('#workspace')?.classList.remove('refresh'); // the page change's own sweep: this stands in for it
  const play = (el, frames, delay, duration, easing = 'linear') => { if (el) anims.push(el.animate(frames, { delay, duration, easing, fill: 'both' })); };
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };
  const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const page = $('#page-view'), top = add(app, 'bootfx'), lr = top.getBoundingClientRect(), lk = lr.width / (top.offsetWidth || lr.width) || 1;
  const pr = held ? held.at : page?.getBoundingClientRect() || lr;
  const box = (r, pad = 0, o = lr) => ({ left: `${(r.left - o.left) / lk - pad}px`, top: `${(r.top - o.top) / lk - pad}px`, width: `${r.width / lk + pad * 2}px`, height: `${r.height / lk + pad * 2}px` });
  const pane = add(top, 'bootfx-page'); // the page's own box: nothing drawn here reaches your chrome
  Object.assign(pane.style, box(pr));
  const local = (p) => ({ x: (p.x - pr.left) / lk, y: (p.y - pr.top) / lk });
  const svg = [...app.querySelectorAll('#page-view .fp-svg')].find((s) => s.getBoundingClientRect().width), here = svg?.querySelector('.fp-room.here');

  // The map holding where it stood; the line from HOME to the node.
  let c = here ? mid(here.getBoundingClientRect()) : mid(pr), line = null;
  if (held) {
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect();
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    const nr = held.lock.getBoundingClientRect(), hm = [...held.clone.querySelectorAll('[data-select="server"] .mhit')].find((g) => g.getBoundingClientRect().width)?.getBoundingClientRect();
    held.lock.remove();
    c = mid(nr);
    if (hm) line = carrierLine(mid(hm), c, hm.width / 2, Math.min(nr.width, nr.height) * 0.35);
  }
  const o = line ? 0 : -T.land, at = (ms) => Math.max(0, ms + o), open = at(T.land);
  if (line) {
    const s = local(line), w = add(pane, 'bootfx-wire'), d = add(pane, 'bootfx-dot'), turn = `rotate(${line.angle}rad)`, len = line.len / lk;
    Object.assign(w.style, { left: `${s.x}px`, top: `${s.y - 1}px`, width: `${len}px` });
    play(w, [{ transform: `${turn} scaleX(0)` }, { transform: `${turn} scaleX(1)` }], 0, T.land, RUN);
    play(w, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], 0, T.land + 500);
    Object.assign(d.style, { left: `${s.x - 4}px`, top: `${s.y - 4}px` });
    play(d, [{ transform: 'translate(0, 0)' }, { transform: `translate(${Math.cos(line.angle) * len}px, ${Math.sin(line.angle) * len}px)` }], 0, T.land, RUN);
    play(d, [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], 0, T.land + 140);
  }
  // Where it lands: a ping, and the rooms opening in a circle, its edge a teal ring.
  const cl = local(c), R = carrierReach(cl, pr.width / lk, pr.height / lk) + 4;
  if (held) {
    const p = add(pane, 'bootfx-ping');
    Object.assign(p.style, { left: `${cl.x - 20}px`, top: `${cl.y - 20}px` });
    play(p, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.15 }, { opacity: 0, transform: 'scale(3)' }], Math.max(0, open - 20), 500, 'ease-out');
    // The map goes from the circle's inside: a hole in its mask, growing with the circle.
    const hr = held.clone.getBoundingClientRect(), m = { x: (c.x - hr.left) / held.k, y: (c.y - hr.top) / held.k }, mR = (R * lk) / held.k;
    const s = held.clone.style, img = 'radial-gradient(circle closest-side, #000 calc(100% - 1px), transparent 100%), linear-gradient(#000, #000)';
    s.webkitMaskImage = s.maskImage = img; s.webkitMaskRepeat = s.maskRepeat = 'no-repeat'; s.webkitMaskComposite = 'xor'; s.maskComposite = 'exclude';
    const from = { maskSize: '0px 0px, 100% 100%', maskPosition: `${m.x}px ${m.y}px, 0px 0px` }, to = { maskSize: `${mR * 2}px ${mR * 2}px, 100% 100%`, maskPosition: `${m.x - mR}px ${m.y - mR}px, 0px 0px` };
    const both = (f) => ({ ...f, webkitMaskSize: f.maskSize, webkitMaskPosition: f.maskPosition });
    play(held.clone, [both(from), both(to)], open, T.openFor, OPEN);
    play(held.clone, [{ filter: 'brightness(1)' }, { filter: 'brightness(.4)' }], open, T.dimFor, 'ease-out');
    play(held.clone, [{ opacity: 1 }, { opacity: 0 }], open + T.openFor, 1);
  }
  const pg = page?.getBoundingClientRect(), pk = pg ? pg.width / (page.offsetWidth || pg.width) || 1 : 1;
  if (pg) play(page, [{ clipPath: `circle(0px at ${(c.x - pg.left) / pk}px ${(c.y - pg.top) / pk}px)` }, { clipPath: `circle(${(R * lk) / pk}px at ${(c.x - pg.left) / pk}px ${(c.y - pg.top) / pk}px)` }], open, T.openFor, OPEN);
  const edge = add(pane, 'bootfx-iris'), disc = (r) => ({ left: `${cl.x - r}px`, top: `${cl.y - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
  play(edge, [disc(0), disc(R)], open, T.openFor, OPEN);
  play(edge, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], open, T.openFor);
  // Your room rings teal as the rooms settle.
  if (here) {
    const ring = add(top, 'bootfx-ring');
    Object.assign(ring.style, box(here.getBoundingClientRect(), 8));
    play(ring, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 0, transform: 'scale(1)' }], at(T.ring), T.ringFor, 'ease-out');
  }

  let timer = 0;
  const end = () => {
    if (dialing !== end) return;
    dialing = null; clearTimeout(timer);
    removeEventListener('keydown', end, true); removeEventListener('pointerdown', end, true);
    anims.forEach((a) => a.cancel()); nodes.forEach((n) => n.remove());
    after.splice(0).forEach((fn) => fn());
  };
  dialing = end;
  timer = setTimeout(end, at(T.done));
  addEventListener('keydown', end, true); addEventListener('pointerdown', end, true);
}

// Jacking out (app.js hangUp, the Carrier backwards): your room locks teal; the rooms close in a circle onto the
// server's node on the map, the map brightening back up outside its edge; the node pings and your signal runs home, a
// teal line from the node to HOME, which rings. Eased, never stepped; no black and no text; your chrome stays lit. No
// node on the map: the rooms close on your room, with no line. Not from the rooms page: it starts at the ping.
// When each beat comes, in ms; without the rooms page everything comes `ping` sooner.
export const HANGUP = { lock: 0, close: 200, closeFor: 720, brightFor: 480, ping: 900, wire: 940, runFor: 420, home: 1300, homeFor: 400, done: 1700 };
const SHUT = 'cubic-bezier(.85,0,.45,1)'; // the Carrier's opening, backwards
let hanging = null;
const afterHome = [];
export const hangingUp = () => !!hanging;
export function stopHangup() { hanging?.(); }
// Run fn once the hang-up is over (at once if none is playing): the Banked card waits for it.
export function whenHome(fn) { if (hanging) afterHome.push(fn); else fn(); }

// Play it. app: #app; held: capture()'s result on the rooms page with your room, or null; node: finds the server's node
// on the map (now drawn in #page-view), or null.
export function playHangup(app, held, node) {
  stopHangup();
  const T = HANGUP, $ = (q) => app.querySelector(q), anims = [], nodes = [], at = (ms) => Math.max(0, ms - (held ? 0 : T.ping));
  $('#workspace')?.classList.remove('refresh');
  const play = (el, frames, delay, duration, easing = 'linear') => { if (el) anims.push(el.animate(frames, { delay, duration, easing, fill: 'both' })); };
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };
  const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const shown = (root, q) => [...(root?.querySelectorAll(q) || [])].find((g) => g.getBoundingClientRect().width);
  const page = $('#page-view'), top = add(app, 'bootfx'), lr = top.getBoundingClientRect(), lk = lr.width / (top.offsetWidth || lr.width) || 1;
  const pr = page?.getBoundingClientRect() || lr;
  const box = (r, pad = 0) => ({ left: `${(r.left - lr.left) / lk - pad}px`, top: `${(r.top - lr.top) / lk - pad}px`, width: `${r.width / lk + pad * 2}px`, height: `${r.height / lk + pad * 2}px` });
  const pane = add(top, 'bootfx-page'); // the page's own box: nothing drawn here reaches your chrome
  Object.assign(pane.style, box(pr));
  const local = (p) => ({ x: (p.x - pr.left) / lk, y: (p.y - pr.top) / lk });

  // The rooms page holding over the map, your room locked teal.
  if (held) {
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect();
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    held.lock.classList.add('you');
    play(held.lock, [{ opacity: 0, transform: 'scale(2)' }, { opacity: 1, transform: 'scale(1)', offset: 0.55 }, { opacity: 1, transform: 'scale(1)' }], T.lock, 240, 'ease-out');
  }
  const n = node?.(), nr = n?.getBoundingClientRect(), here = held && shown(held.clone, '.fp-svg .fp-room.here');
  const c = nr?.width ? mid(nr) : here ? mid(here.getBoundingClientRect()) : mid(pr);
  const cl = local(c), R = carrierReach(cl, pr.width / lk, pr.height / lk) + 4;
  // The rooms close in a circle onto the node, its edge a teal ring; the map brightens back up as they go.
  if (held) {
    const hr = held.clone.getBoundingClientRect(), hx = (c.x - hr.left) / held.k, hy = (c.y - hr.top) / held.k, hR = (R * lk) / held.k;
    play(held.clone, [{ clipPath: `circle(${hR}px at ${hx}px ${hy}px)` }, { clipPath: `circle(0px at ${hx}px ${hy}px)` }], T.close, T.closeFor, SHUT);
    play(held.clone, [{ opacity: 1 }, { opacity: 0 }], T.close + T.closeFor, 1);
    const edge = add(pane, 'bootfx-iris'), disc = (r) => ({ left: `${cl.x - r}px`, top: `${cl.y - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
    play(edge, [disc(R), disc(0)], T.close, T.closeFor, SHUT);
    play(edge, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.95 }, { opacity: 0 }], T.close, T.closeFor);
    play(page, [{ filter: 'brightness(.4)' }, { filter: 'brightness(1)' }], T.close + T.closeFor - T.brightFor, T.brightFor, 'ease-in');
  }
  if (!nr?.width) return finish(at(T.close + T.closeFor + 80));
  // Where it closes, the node pings; then your signal runs home along the line.
  const p = add(pane, 'bootfx-ping');
  Object.assign(p.style, { left: `${cl.x - 20}px`, top: `${cl.y - 20}px` });
  play(p, [{ opacity: 0, transform: 'scale(3)' }, { opacity: 1, transform: 'scale(1)', offset: 0.6 }, { opacity: 0, transform: 'scale(.4)' }], Math.max(0, at(T.ping) - 240), 500, 'ease-in');
  const hm = shown(page, '[data-select="server"] .mhit')?.getBoundingClientRect();
  const line = hm && carrierLine(mid(hm), c, hm.width / 2, Math.min(nr.width, nr.height) * 0.35);
  if (line) {
    const len = line.len / lk, a = line.angle + Math.PI, s = local({ x: line.x + Math.cos(line.angle) * line.len, y: line.y + Math.sin(line.angle) * line.len });
    const w = add(pane, 'bootfx-wire'), d = add(pane, 'bootfx-dot'), turn = `rotate(${a}rad)`;
    Object.assign(w.style, { left: `${s.x}px`, top: `${s.y - 1}px`, width: `${len}px` });
    play(w, [{ transform: `${turn} scaleX(0)` }, { transform: `${turn} scaleX(1)` }], at(T.wire), T.runFor, RUN);
    play(w, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], at(T.wire), T.runFor + 400);
    Object.assign(d.style, { left: `${s.x - 4}px`, top: `${s.y - 4}px` });
    play(d, [{ transform: 'translate(0, 0)' }, { transform: `translate(${Math.cos(a) * len}px, ${Math.sin(a) * len}px)` }], at(T.wire), T.runFor, RUN);
    play(d, [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], at(T.wire), T.runFor + 140);
    // HOME rings: you're back.
    const ring = add(top, 'bootfx-ring');
    Object.assign(ring.style, { ...box(hm, 6), borderRadius: '50%' });
    play(ring, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.35 }, { opacity: 0, transform: 'scale(1)' }], at(T.home), T.homeFor, 'ease-out');
  }
  return finish(at(line ? T.done : T.ping + 300));

  function finish(ms) {
    let timer = 0;
    const end = () => {
      if (hanging !== end) return;
      hanging = null; clearTimeout(timer);
      removeEventListener('keydown', end, true); removeEventListener('pointerdown', end, true);
      anims.forEach((x) => x.cancel()); nodes.forEach((x) => x.remove());
      afterHome.splice(0).forEach((fn) => fn());
    };
    hanging = end;
    timer = setTimeout(end, ms);
    addEventListener('keydown', end, true); addEventListener('pointerdown', end, true);
  }
}
