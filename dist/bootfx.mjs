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
// Connecting to a server and jacking out (app.js connectTo, hangUp, Terminal): inside the page; see playConnect.
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

// Connecting to a server (app.js, Terminal): it plays inside the monitor's page, like the rest of the game, not over
// the screen. From the map, the map dims in place; the dial-up types into the page as terminal output (no big title,
// no black screen, your chrome stays lit); then the rooms catch outward from the entry. Nothing teal pops: no
// brackets, pings or rings. Not from the map: it starts at the readout.
// When each beat comes, in ms; without the map (not from the map page) everything comes DIAL sooner.
export const CONNECT = { dim: 0, term: 140, line: 70, out: 560, strip: 600, rooms: 640, ring: 50, done: 1050 };
const DIAL = 140;
// The map dimming as it powers down: [ms from CONNECT.dim, brightness], each held until the next. It only ever dims.
export const DIM = [[0, 1], [35, 0.6], [70, 0.35], [105, 0.15]];

// The readout: what the dial-up checks. The last line, CONNECT, is yours (teal).
export function connectLines({ name = '', kind = '', level = '', rooms = 0 }) {
  const row = (k, v) => `${k} ${'.'.repeat(Math.max(3, 24 - k.length))} ${v}`;
  return [
    { text: row(`dial ${name.toLowerCase()}`, 'ring') },
    { text: row('carrier', '33.6k') },
    { text: row('handshake', 'ok') },
    { text: row([kind.toLowerCase(), level && `lv ${level}`].filter(Boolean).join(' · ') || 'server', rooms ? `${rooms} rooms` : 'up') },
    { text: 'CONNECT_', you: true },
  ];
}

let dialing = null;
export const connecting = () => !!dialing;
export function stopConnect() { dialing?.(); }
const after = [];
// Run fn once the connect is over (at once if none is playing): the first-run reward waits for it.
export function whenConnected(fn) { if (dialing) after.push(fn); else fn(); }

// The page's box in the effect layer, and the layer: a terminal readout there types out the lines.
function termIn(app, add, nodes, lines, at, line) {
  const top = add(app, 'bootfx'), lr = top.getBoundingClientRect(), lk = lr.width / (top.offsetWidth || lr.width) || 1;
  const pv = app.querySelector('#page-view'), r = pv?.getBoundingClientRect();
  const term = add(top, 'bootfx-term');
  if (r?.width) Object.assign(term.style, { left: `${(r.left - lr.left) / lk}px`, top: `${(r.top - lr.top) / lk}px`, width: `${r.width / lk}px`, height: `${r.height / lk}px` });
  const rows = lines.map((l, i) => { const d = document.createElement('div'); d.textContent = l.text; if (l.you) d.className = 'you'; term.append(d); return [d, at + i * line]; });
  return { top, term, rows, lr, lk };
}

// Play it. app: #app; held: capture()'s result on the map with the server's node, or null; name: the server's; lines:
// connectLines(). The rooms page must already be drawn in #page-view.
export function playConnect(app, held, name, lines) {
  stopConnect();
  const T = CONNECT, $ = (q) => app.querySelector(q), anims = [], nodes = [], o = held ? 0 : -DIAL, at = (ms) => Math.max(0, ms + o);
  $('#workspace')?.classList.remove('refresh'); document.getElementById('crt-sweep')?.classList.remove('go'); // the page change's own sweep: this stands in for it
  const play = (el, frames, delay, duration, easing = 'linear') => { if (el) anims.push(el.animate(frames, { delay, duration, easing, fill: 'both' })); };
  const steps = (el, prop, pts) => { if (!el) return; const end = pts[pts.length - 1][0] || 1; play(el, pts.map(([ms, v]) => ({ [prop]: v, offset: ms / end, easing: 'steps(1, end)' })), 0, end); };
  const tubeOn = (from, lo = 0) => TUBE_ON.map(([ms, v]) => [from + ms, lo + v * (1 - lo)]);
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };

  // The map holding where it stood, dimming out in the page.
  if (held) {
    held.lock?.remove();
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect();
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    steps(held.clone, 'filter', DIM.map(([ms, v]) => [at(T.dim) + ms, `brightness(${v})`]));
    steps(held.clone, 'opacity', [[0, 1], [at(T.term), 0], [at(T.term) + 1, 0]]);
  }
  // The rooms page waits dark while the readout types into it.
  const pv = $('#page-view');
  steps(pv, 'opacity', [[0, 0], [at(T.out), 0], [at(T.out) + 1, 1]]);
  const { term, rows } = termIn(app, add, nodes, lines, at(T.term), T.line);
  steps(term, 'opacity', [[0, 1], [at(T.out), 1], ...[[at(T.out) + 40, 0.5], [at(T.out) + 80, 0], [at(T.out) + 81, 0]]]);
  for (const [d, t] of rows) steps(d, 'opacity', [[0, 0], [t, 1], [t + 1, 1]]);

  // The strip, then the rooms and links catching outward from the entry.
  const strip = $('#page-view .fp-hud');
  steps(strip, 'opacity', [[0, 0], ...tubeOn(at(T.strip))]);
  const svg = [...app.querySelectorAll('#page-view .fp-svg')].find((s) => s.getBoundingClientRect().width), here = svg?.querySelector('.fp-room.here');
  if (svg && here) {
    const h = here.getBoundingClientRect(), hx = h.left + h.width / 2, hy = h.top + h.height / 2, unit = h.width * 1.6 || 1;
    const ringOf = (el) => { const r = el.getBoundingClientRect(); return Math.round(Math.hypot(r.left + r.width / 2 - hx, r.top + r.height / 2 - hy) / unit); };
    for (const el of svg.querySelectorAll('.fp-room, .fp-bed, .fp-under, .fp-link')) steps(el, 'opacity', [[0, 0], ...tubeOn(at(T.rooms) + ringOf(el) * T.ring)]);
    for (const el of svg.children) if (!el.matches('defs, symbol') && !el.querySelector('.fp-room, .fp-link') && !el.matches('.fp-room, .fp-link, .fp-bed, .fp-under')) steps(el, 'opacity', [[0, 0], ...tubeOn(at(T.rooms) + T.ring)]);
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

// Jacking out (app.js hangUp, Terminal like the connect): inside the page, the rooms go dark from the far ones in to
// yours, the hang-up's readout types into the page (your pack banked), then the map comes up. Your chrome stays lit and
// nothing teal pops. Not from the rooms page: it starts at the readout.
export const HANGUP = { out: 0, ring: 40, term: 260, line: 70, map: 640, done: 950 };
const HANG = 200; // without the rooms page, everything comes this much sooner
export function hangupLines({ name = '', banked = 0 }) {
  const row = (k, v) => `${k} ${'.'.repeat(Math.max(3, 24 - k.length))} ${v}`;
  return [
    { text: row(`ath0 ${name.toLowerCase()}`, 'ok') },
    { text: row('carrier', 'dropped') },
    { text: row('pack', banked ? `${banked} banked` : 'empty') },
    { text: 'HOME_', you: true },
  ];
}
let hanging = null;
const afterHome = [];
export const hangingUp = () => !!hanging;
export function stopHangup() { hanging?.(); }
// Run fn once the hang-up is over (at once if none is playing): the Banked card waits for it.
export function whenHome(fn) { if (hanging) afterHome.push(fn); else fn(); }

// Play it. app: #app; held: capture()'s result on the rooms page with your room, or null; name: the server's; lines:
// hangupLines(); node: unused (the map comes up as it is).
export function playHangup(app, held, name, lines) {
  stopHangup();
  const T = HANGUP, $ = (q) => app.querySelector(q), anims = [], nodes = [], o = held ? 0 : -HANG, at = (ms) => Math.max(0, ms + o);
  $('#workspace')?.classList.remove('refresh'); document.getElementById('crt-sweep')?.classList.remove('go');
  const play = (el, frames, delay, duration, easing = 'linear') => { if (el) anims.push(el.animate(frames, { delay, duration, easing, fill: 'both' })); };
  const steps = (el, prop, pts) => { if (!el) return; const end = pts[pts.length - 1][0] || 1; play(el, pts.map(([ms, v]) => ({ [prop]: v, offset: ms / end, easing: 'steps(1, end)' })), 0, end); };
  const tubeOn = (from, lo = 0) => TUBE_ON.map(([ms, v]) => [from + ms, lo + v * (1 - lo)]);
  const fade = (from, hi = 1) => [[from, hi * 0.6], [from + 40, hi * 0.3], [from + 80, 0], [from + 81, 0]];
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };

  // The rooms page holding, the rooms going dark from the far ones in to yours.
  if (held) {
    held.lock?.remove();
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect();
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    const svg = [...held.clone.querySelectorAll('.fp-svg')].find((s) => s.getBoundingClientRect().width), here = svg?.querySelector('.fp-room.here');
    if (svg && here) {
      const h = here.getBoundingClientRect(), hx = h.left + h.width / 2, hy = h.top + h.height / 2, unit = h.width * 1.6 || 1;
      const ringOf = (el) => { const b = el.getBoundingClientRect(); return Math.round(Math.hypot(b.left + b.width / 2 - hx, b.top + b.height / 2 - hy) / unit); };
      const els = [...svg.querySelectorAll('.fp-room, .fp-bed, .fp-under, .fp-link')].filter((el) => el !== here && !here.contains(el));
      const far = Math.max(1, ...els.map(ringOf));
      for (const el of els) steps(el, 'opacity', [[0, 1], ...fade(T.out + Math.max(0, far - ringOf(el)) * T.ring)]);
    }
    steps(held.clone, 'opacity', [[0, 1], ...fade(T.term - 80)]);
  }
  // The map waits dark while the readout types into the page, then comes up.
  const pv = $('#page-view');
  steps(pv, 'opacity', [[0, 0], ...tubeOn(at(T.map))]);
  const { term, rows } = termIn(app, add, nodes, lines, at(T.term), T.line);
  steps(term, 'opacity', [[0, 1], ...fade(at(T.map) - 40)]);
  for (const [d, t] of rows) steps(d, 'opacity', [[0, 0], [t, 1], [t + 1, 1]]);

  let timer = 0;
  const end = () => {
    if (hanging !== end) return;
    hanging = null; clearTimeout(timer);
    removeEventListener('keydown', end, true); removeEventListener('pointerdown', end, true);
    anims.forEach((a) => a.cancel()); nodes.forEach((x) => x.remove());
    afterHome.splice(0).forEach((fn) => fn());
  };
  hanging = end;
  timer = setTimeout(end, at(T.done));
  addEventListener('keydown', end, true); addEventListener('pointerdown', end, true);
}
