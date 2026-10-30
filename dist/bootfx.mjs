// A fight coming up (app.js go, the first time you see each fight): the screen powers down and boots into it, the
// virus first. From the rooms page, red brackets lock on the room you walked into while the map holds a beat; then a
// flash, and the tube goes black with its edge flaring red. The virus's picture flickers on alone at the centre of the
// dark, decoding out of red noise, holds, and drops into its panel; its name and bar come on and its bar fills. A boot
// console stutters through your system where the board will be (your bar, class, keys, the virus, the clock), and
// then your panels catch one by one like tubes, your bar filling. Any key or click ends it at once (and still acts).
// No canvas: the real panels flicker (opacity and clip-path through the Web Animations API, held steps, no fades), with
// a black layer behind them and the console, noise and flare on top (bootfx.css).
// Leaving a won fight (app.js leaveFight, the designer's pick, Channel cut): the page collapses to a teal line, then a
// dot, like a tube switching channel; the page you go back to opens out of the line, and your room rings teal.
// Screen effects off, Motion off or reduced motion: neither plays (app.js doesn't call them).

// When each beat comes, in ms; without the brackets (not from the rooms page) everything comes LOCK sooner.
export const BOOT = {
  lock: 0, flash: 210, black: 250, virus: 340, centre: 1000, enemy: 910, enemyBar: 990,
  console: 1150, line: 62, chrome: 1710, you: 1750, youBar: 1810, board: 1790, log: 1850, prompt: 1890, tray: 1930, done: 2200,
};
const LOCK = 200;
// A tube catching: [ms, opacity] from the moment it starts, each held until the next.
export const TUBE_ON = [[0, 0], [30, 0.9], [60, 0], [110, 0.6], [140, 0], [175, 1], [205, 0.35], [235, 1], [240, 1]];
const VIRUS_ON = [[0, 0], [40, 1], [70, 0], [150, 0.8], [180, 0.1], [240, 1], [300, 0.5], [330, 1], [600, 1], [630, 0.6], [660, 1], [670, 1]];
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
  const tubeOn = (from) => TUBE_ON.map(([ms, v]) => [from + ms, v]);
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };

  // The rooms page holding a beat, the brackets locking on.
  if (held) {
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect(); // back over where the page stood
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    play(held.lock, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)', offset: 0.55 }, { opacity: 0.2, offset: 0.7 }, { opacity: 1, offset: 0.85 }, { opacity: 1, transform: 'scale(1)' }], 0, 220, 'ease-out');
    steps(held.clone, 'opacity', [[0, 1], [BOOT.black, 0], [BOOT.black + 1, 0]]);
  }
  // The power cut: a flash, black behind the panels, the tube's edge flaring.
  const black = add(app, 'bootfx-black', $('#fx-back')?.nextSibling || app.firstChild);
  steps(black, 'opacity', [[0, 0], [at(BOOT.black), 1], [at(BOOT.chrome), 0], [at(BOOT.chrome) + 1, 0]]);
  const top = add(app, 'bootfx'), flash = add(top, 'bootfx-flash'), flare = add(top, 'bootfx-flare');
  play(flash, [{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], at(BOOT.flash), 90);
  play(flare, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.5, offset: 0.4 }, { opacity: 0 }], at(BOOT.black), 900, 'ease-out');
  // Your chrome goes dark with the cut and catches with the rest of you.
  for (const [q, on] of [['.topbar', BOOT.chrome], ['#sidebar', BOOT.chrome], ['#crewwin', BOOT.chrome], ['#statusline', BOOT.chrome + 20], ['#net-line', BOOT.prompt], ['.prompt-row', BOOT.prompt], ['#tray', BOOT.tray]])
    steps($(q), 'opacity', [[0, 1], [at(BOOT.black), 0], ...tubeOn(at(on))]);
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
    steps(con, 'opacity', [[0, 0], [c0, 1], [c0 + 90, 0.4], [c0 + 120, 1], [c0 + 260, 0.7], [c0 + 290, 1], [c0 + 420, 0.3], [c0 + 440, 1], [c0 + 560, 1], [c0 + 580, 0], [c0 + 610, 0.8], [c0 + 640, 0], [c0 + 641, 0]]);
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
  const folds = els.map((el, i) => play(el, [{ transform: 'scale(1, 1)', transformOrigin: origin(el, rs[i]), filter: 'brightness(1)' }, { transform: 'scale(1, .004)', transformOrigin: origin(el, rs[i]), filter: 'brightness(4) saturate(0)', offset: 0.7 }, { transform: 'scale(0, .004)', transformOrigin: origin(el, rs[i]), filter: 'brightness(4) saturate(0)' }], 0, CUT.cut, 'cubic-bezier(.6,0,.9,.5)'));

  let swapped = false;
  const toNext = () => {
    if (swapped) return;
    swapped = true; folds.forEach((a) => a.cancel());
    swap();
    const chip = room?.(), cr = chip?.getBoundingClientRect(); // measured before the page starts opening
    els.forEach((el) => { const r = el.getBoundingClientRect(); play(el, [{ transform: 'scale(1, .004)', transformOrigin: origin(el, r), filter: 'brightness(4)', opacity: 0 }, { opacity: 1, offset: 0.01 }, { transform: 'scale(1, 1.02)', transformOrigin: origin(el, r), filter: 'brightness(1.3)', offset: 0.7 }, { transform: 'scale(1, 1)', transformOrigin: origin(el, r), filter: 'brightness(1)', opacity: 1 }], CUT.open - CUT.swap, CUT.openFor, 'cubic-bezier(.2,.8,.3,1)'); });
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

// Connecting to a server (app.js, the designer's pick, Handshake): from the map, teal brackets lock on the server's
// node and two pings ring out; the map and your chrome power down in two tube dips into black, the tube's edge glowing
// teal. The server's name decodes at the centre over a dial readout; the name flies into the server strip, and the
// rooms catch outward from the entry, which rings teal; then your chrome. Not from the map: it starts at the black.
// When each beat comes, in ms; without the map (not from the map page) everything comes DIAL sooner.
export const CONNECT = { lock: 0, ping: 200, dim: 380, black: 520, name: 600, lines: 760, line: 95, fly: 1400, strip: 1460, rooms: 1520, ring: 70, chrome: 1700, done: 2300 };
const DIAL = 440;
// The tube dipping as it powers down: [ms from CONNECT.dim, brightness], each held until the next.
export const DIM = [[0, 1], [30, 0.55], [60, 0.85], [100, 0.35], [120, 0.5], [140, 0.15]];
const GLYPHS = '#%&*+=/<>?01ABCDEFX';
// The name part-decoded: its first n characters, the rest noise.
export const decoded = (name, n) => [...name].map((c, j) => (c === ' ' || j < n ? c : GLYPHS[(j * 7 + n * 13) % GLYPHS.length])).join('');

// The readout under the name: what the dial-up checks. The last line, CONNECT, is yours (teal).
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

// Play it. app: #app; held: capture()'s result on the map with the server's node, or null; name: the server's; lines:
// connectLines(). The rooms page must already be drawn in #page-view.
export function playConnect(app, held, name, lines) {
  stopConnect();
  const T = CONNECT, $ = (q) => app.querySelector(q), anims = [], nodes = [], o = held ? 0 : -DIAL, at = (ms) => Math.max(0, ms + o);
  $('#workspace')?.classList.remove('refresh'); // the page change's own sweep: this stands in for it (and its filter would move the map)
  const play = (el, frames, delay, duration, easing = 'linear') => { if (el) anims.push(el.animate(frames, { delay, duration, easing, fill: 'both' })); };
  const steps = (el, prop, pts) => { if (!el) return; const end = pts[pts.length - 1][0] || 1; play(el, pts.map(([ms, v]) => ({ [prop]: v, offset: ms / end, easing: 'steps(1, end)' })), 0, end); };
  const tubeOn = (from) => TUBE_ON.map(([ms, v]) => [from + ms, v]);
  const add = (parent, cls, before = null) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); parent.insertBefore(d, before); nodes.push(d); return d; };
  const black = add(app, 'bootfx-black', $('#fx-back')?.nextSibling || app.firstChild);
  steps(black, 'opacity', [[0, 0], [at(T.black), 1], [at(T.chrome), 0], [at(T.chrome) + 1, 0]]);
  const top = add(app, 'bootfx'), lr = top.getBoundingClientRect(), lk = lr.width / (top.offsetWidth || lr.width) || 1;
  const box = (r, pad = 0) => ({ left: `${(r.left - lr.left) / lk - pad}px`, top: `${(r.top - lr.top) / lk - pad}px`, width: `${r.width / lk + pad * 2}px`, height: `${r.height / lk + pad * 2}px` });
  const dim = DIM.map(([ms, v]) => [at(T.dim) + ms, `brightness(${v})`]);

  // The map holding, the node locking teal and pinging, then powering down.
  if (held) {
    held.parent.append(held.clone); nodes.push(held.clone);
    const r = held.clone.getBoundingClientRect();
    Object.assign(held.clone.style, { left: `${(held.at.left - r.left) / held.k}px`, top: `${(held.at.top - r.top) / held.k}px` });
    held.lock.classList.add('you');
    play(held.lock, [{ opacity: 0, transform: 'scale(2.2)' }, { opacity: 1, transform: 'scale(1)', offset: 0.55 }, { opacity: 0.2, offset: 0.7 }, { opacity: 1, offset: 0.85 }, { opacity: 1, transform: 'scale(1)' }], 0, 240, 'ease-out');
    steps(held.clone, 'filter', [[0, 'brightness(1)'], ...dim]);
    steps(held.clone, 'opacity', [[0, 1], [T.black, 0], [T.black + 1, 0]]);
    const nr = held.lock.getBoundingClientRect(), cx = (nr.left + nr.width / 2 - lr.left) / lk, cy = (nr.top + nr.height / 2 - lr.top) / lk;
    for (const i of [0, 1]) {
      const p = add(top, 'bootfx-ping');
      Object.assign(p.style, { left: `${cx - 20}px`, top: `${cy - 20}px` });
      play(p, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)', offset: 0.1 }, { opacity: 0, transform: 'scale(9)' }], T.ping + i * 110, 420, 'cubic-bezier(.2,.7,.3,1)');
    }
  }
  const glow = add(top, 'bootfx-glow');
  play(glow, [{ opacity: 0 }, { opacity: 0.45, offset: 0.3 }, { opacity: 0.25, offset: 0.6 }, { opacity: 0 }], at(T.black), 900, 'ease-in-out');
  // Your chrome dips with the map, goes dark, and catches again at the end.
  for (const q of ['.topbar', '#sidebar', '#crewwin', '#statusline', '#net-line', '.prompt-row', '#tray']) {
    const el = $(q);
    if (held) steps(el, 'filter', [[0, 'brightness(1)'], ...dim.slice(0, -1), [at(T.black), 'brightness(1)'], [at(T.black) + 1, 'brightness(1)']]);
    steps(el, 'opacity', [[0, 1], [at(T.black), 0], ...tubeOn(at(T.chrome))]);
  }

  // The name at the centre, decoding, with its carrier bar and the readout.
  const card = add(top, 'bootfx-dial'), nm = document.createElement('div'), bar = document.createElement('div'), sub = document.createElement('div');
  nm.className = 'bootfx-dial-name'; bar.className = 'bootfx-dial-bar'; sub.className = 'bootfx-dial-lines';
  card.append(nm, bar, sub);
  const N = 8;
  for (let i = 0; i <= N; i++) {
    const s = document.createElement('div'), t0 = at(T.name) + i * 45;
    s.textContent = decoded(name, Math.round((i / N) * name.length));
    nm.append(s);
    steps(s, 'opacity', i < N ? [[0, 0], [t0, 1], [t0 + 45, 0], [t0 + 46, 0]] : [[0, 0], [t0, 1], [t0 + 1, 1]]);
  }
  play(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], at(T.lines), 420, 'steps(12)');
  lines.forEach((l, i) => { const d = document.createElement('div'); d.textContent = l.text; if (l.you) d.className = 'you'; sub.append(d); steps(d, 'opacity', [[0, 0], [at(T.lines) + i * T.line, 1], [at(T.lines) + i * T.line + 1, 1]]); });
  // The name flies into the strip's; the readout goes out.
  const strip = $('#page-view .fp-hud'), target = strip?.querySelector('.fp-id b');
  if (target) {
    const tr = target.getBoundingClientRect(), br = nm.getBoundingClientRect();
    const dx = (tr.left + tr.width / 2 - (br.left + br.width / 2)) / lk, dy = (tr.top + tr.height / 2 - (br.top + br.height / 2)) / lk;
    play(nm, [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${Math.max(0.3, tr.height / (br.height || 1))})` }], at(T.fly), 200, 'cubic-bezier(.6,0,.4,1)');
  }
  steps(nm, 'opacity', [[0, 1], [at(T.fly) + 200, 0], [at(T.fly) + 201, 0]]);
  steps(sub, 'opacity', [[0, 1], [at(T.fly), 0.4], [at(T.fly) + 30, 1], [at(T.fly) + 60, 0], [at(T.fly) + 61, 0]]);
  steps(bar, 'opacity', [[0, 1], [at(T.fly), 0], [at(T.fly) + 1, 0]]);

  // The rooms page: the strip, then the rooms and links catching outward from the entry, a ring on each step out.
  steps(strip, 'opacity', [[0, 0], ...tubeOn(at(T.strip))]);
  const svg = [...app.querySelectorAll('#page-view .fp-svg')].find((s) => s.getBoundingClientRect().width), here = svg?.querySelector('.fp-room.here');
  if (svg && here) {
    const h = here.getBoundingClientRect(), hx = h.left + h.width / 2, hy = h.top + h.height / 2, unit = h.width * 1.6 || 1;
    const ringOf = (el) => { const r = el.getBoundingClientRect(); return Math.round(Math.hypot(r.left + r.width / 2 - hx, r.top + r.height / 2 - hy) / unit); };
    for (const el of svg.querySelectorAll('.fp-room, .fp-bed, .fp-under, .fp-link')) steps(el, 'opacity', [[0, 0], ...tubeOn(at(T.rooms) + ringOf(el) * T.ring)]);
    for (const el of svg.children) if (!el.matches('defs, symbol') && !el.querySelector('.fp-room, .fp-link') && !el.matches('.fp-room, .fp-link, .fp-bed, .fp-under')) steps(el, 'opacity', [[0, 0], ...tubeOn(at(T.rooms) + T.ring)]);
    const ring = add(top, 'bootfx-ring');
    Object.assign(ring.style, box(h, 8));
    play(ring, [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.35 }, { opacity: 0, transform: 'scale(1)' }], at(T.rooms), 520, 'ease-out');
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
