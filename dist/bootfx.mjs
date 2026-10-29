// A fight coming up (app.js go, the first time you see each fight): the screen powers down and boots into it, the
// virus first. From the rooms page, red brackets lock on the room you walked into while the map holds a beat; then a
// flash, and the tube goes black with its edge flaring red. The virus's picture flickers on alone at the centre of the
// dark, decoding out of red noise, holds, and drops into its panel; its name and bar come on and its bar fills. A boot
// console stutters through your system where the board will be (your bar, class, keys, the virus, the clock), and
// then your panels catch one by one like tubes, your bar filling. Any key or click ends it at once (and still acts).
// No canvas: the real panels flicker (opacity and clip-path through the Web Animations API, held steps, no fades), with
// a black layer behind them and the console, noise and flare on top (bootfx.css). Screen effects off,
// Motion off or reduced motion: none (app.js doesn't call it).

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
