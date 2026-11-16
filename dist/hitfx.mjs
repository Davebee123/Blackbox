// Hit effects on the fight board: when a command lands, it lands on the part itself: its cell
// flashes and jolts, and a burst of 1s and 0s flies out (amber, a crewmate's violet). A crit bursts
// bigger in gold-white; a broken armor chit throws white bits; a miss shakes it. (How much is the
// number and the bar: app.js.)
//
// The effects live on a layer beside #board, not in it: the board redraws every step of a cycle,
// which would cut them short. Points are measured from the DOM and divided by the screen's scale,
// so the monitor casing's transform doesn't throw them off. Look only.
import { drawDissolve, rgbOf } from './dissolvefx.mjs';

export function createHitFx(board, { canMove = () => true, dissolveMode = () => 'all' } = {}) {
  const layer = document.createElement('div');
  layer.id = 'hitfx';
  layer.setAttribute('aria-hidden', 'true');
  board.parentElement.appendChild(layer);

  function frame() {
    const scale = board.getBoundingClientRect().width / (board.offsetWidth || 1) || 1;
    Object.assign(layer.style, { left: board.offsetLeft + 'px', top: board.offsetTop + 'px', width: board.offsetWidth + 'px', height: board.offsetHeight + 'px' });
    return { box: layer.getBoundingClientRect(), scale }; // measured from the layer itself, wherever it landed
  }
  const local = (f, r) => ({ l: (r.left - f.box.left) / f.scale, t: (r.top - f.box.top) / f.scale, w: r.width / f.scale, h: r.height / f.scale });
  const add = (cls, style, html = '', ms = 700) => {
    const el = document.createElement('span');
    el.className = cls;
    for (const [k, v] of Object.entries(style)) if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
    el.innerHTML = html;
    layer.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };

  // row: the part's board row. who: 'you' or a crewmate's handle. kind: 'you' | 'crew'.
  // result: 'hit' | 'crit' | 'chit' | 'miss'.
  // The strike lands on the part itself: its cell flashes and jolts, and a burst of 1s and 0s
  // flies out of it (in your colour, a crewmate's in violet; a crit: more, bigger, gold-white).
  // A broken chit throws a few white bits; a miss only shakes it.
  const BITS = { hit: 16, crit: 28, chit: 8, miss: 0 };
  function strike(row, { kind, result, word = 'MISS' }) {
    if (!row?.isConnected || !canMove()) return;
    const f = frame(), name = row.querySelector('.bname');
    if (!name) return;
    const n = local(f, name.getBoundingClientRect());
    add(`fx-smash ${kind} ${result}`, { left: n.l + 'px', top: n.t + 'px', width: n.w + 'px', height: n.h + 'px' }, '', 600);
    const cx = n.l + n.w * 0.4, cy = n.t + n.h / 2, reach = result === 'crit' ? 120 : 85;
    for (let i = 0; i < BITS[result]; i++) {
      const a = Math.random() * Math.PI * 2, d = reach * (0.35 + Math.random() * 0.65);
      add(`fx-bit ${kind} ${result}`, {
        left: cx + (Math.random() - 0.5) * n.w * 0.3 + 'px', top: cy + 'px',
        '--tx': Math.cos(a) * d + 'px', '--ty': Math.sin(a) * d * 0.7 + 'px',
        '--r': (Math.random() - 0.5) * 120 + 'deg', '--s': (0.7 + Math.random() * 0.6).toFixed(2),
        '--d': (0.45 + Math.random() * 0.35).toFixed(2) + 's',
      }, Math.random() < 0.5 ? '0' : '1', 900);
    }
    // A miss: a big MISS (or RESISTED) stamped across the part, so you can't overlook it.
    if (result === 'miss') add(`fx-miss ${kind}`, { left: n.l + n.w * 0.5 + 'px', top: n.t + n.h / 2 + 'px' }, word, 1100);
    jolt(row, result);
  }
  // The part's name brightens as a hit lands (light only, it never moves): a strike's, or an ability effect's
  // (abilityfx.mjs) when it lands.
  function jolt(row, result = 'hit') {
    const name = row?.isConnected && canMove() && row.querySelector('.bname');
    if (!name) return;
    name.classList.remove('fx-jolt', 'crit', 'miss'); void name.offsetWidth;
    name.classList.add('fx-jolt'); if (result === 'crit' || result === 'miss') name.classList.add(result);
    setTimeout(() => name.classList.remove('fx-jolt', 'crit', 'miss'), 500);
  }
  // A part broken: its row dissolves (style.css .dying) while 1s and 0s rise off it and scatter, and its name and
  // health break up letter by letter: each one flickers into a 1 or a 0, then drifts up and fades. It is all drawn on
  // one canvas over the part for the length of the effect (dissolvefx.mjs), so the board redrawing doesn't cut it
  // short (the row's own letters are hidden while it dies). dissolveMode (batch 5's setting): 'all' its bits,
  // 'fewer' (a third), or 'fade' (no bits: the row's own letters fade with it, style.css .dissolve-fade).
  const CAP = { all: { letters: 60, cells: 170 }, fewer: { letters: 20, cells: 56 } };
  function letters(row, f, cap, out) {
    const top = row.querySelector('.part-top');
    if (!top) return;
    const walk = document.createTreeWalker(top, NodeFilter.SHOW_TEXT), range = document.createRange();
    let n = 0;
    for (let node = walk.nextNode(); node && n < cap; node = walk.nextNode()) {
      const cs = getComputedStyle(node.parentElement), font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, from = rgbOf(cs.color);
      for (let i = 0; i < node.length && n < cap; i++) {
        const ch = node.data[i];
        if (!ch.trim()) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const b = local(f, range.getBoundingClientRect());
        if (!b.w) continue;
        const turn = 60 + Math.random() * 360, go = turn + 140 + Math.random() * 260, dur = go + 700; // when it turns to a bit, when it lets go
        out.push({ x: b.l + b.w / 2, y: b.t + b.h / 2, ch, font, size: parseFloat(cs.fontSize) || 12, dur,
          o: [[0, 1], [go / dur, 1], [1, 0]],
          c: [[0, from], [turn / dur, C.bright], [go / dur, C.amber], [1, C.dim]],
          dx: [[0, 0], [go / dur, 0], [1, (Math.random() - 0.5) * 30]],
          dy: [[0, 0], [go / dur, 0], [1, -(24 + Math.random() * 40)]],
          flick: { every: 70, from: turn, odds: 1 } });
        n++;
      }
    }
  }
  let C, CELL;
  function dissolve(row) {
    if (!row?.isConnected || !canMove()) return;
    const mode = dissolveMode();
    layer.parentElement?.classList.toggle('dissolve-fade', mode === 'fade');
    if (mode === 'fade') return;
    const cap = CAP[mode] || CAP.all, f = frame(), r = local(f, row.getBoundingClientRect()), out = [];
    const css = getComputedStyle(layer);
    C = { bright: rgbOf(css.getPropertyValue('--bright')), amber: rgbOf(css.getPropertyValue('--amber')), dim: rgbOf(css.getPropertyValue('--dim')) };
    if (!CELL) { const p = document.createElement('span'); p.className = 'fx-cell'; layer.appendChild(p); const cs = getComputedStyle(p); CELL = { font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, size: parseFloat(cs.fontSize) || 11 }; p.remove(); }
    letters(row, f, cap.letters, out);
    // The row itself becomes a block of 1s and 0s where it stood: each one blinks in, flickers, then drifts up and fades.
    const cw = 9, chh = 13, cols = Math.max(1, Math.floor(r.w / cw)), lines = Math.max(1, Math.floor(r.h / chh));
    const step = Math.max(1, Math.ceil((cols * lines) / cap.cells));
    for (let k = 0; k < cols * lines; k += step) {
      const c = k % cols, l = Math.floor(k / cols);
      const appear = 20 + Math.random() * 180, go = appear + 200 + Math.random() * 300, end = go + 500 + Math.random() * 300;
      out.push({ x: r.l + (c + 0.5) * (r.w / cols), y: r.t + (l + 0.5) * (r.h / lines), ch: Math.random() < 0.5 ? '0' : '1', ...CELL, dur: end,
        o: [[0, 0], [appear / end, 0], [Math.min(0.99, (appear + 50) / end), 0.9], [go / end, 0.75], [1, 0]],
        c: [[0, C.amber], [Math.min(0.99, (appear + 50) / end), C.bright], [go / end, C.amber], [1, C.dim]],
        dx: [[0, 0], [go / end, 0], [1, (Math.random() - 0.5) * 24]],
        dy: [[0, 0], [go / end, 0], [1, -(18 + Math.random() * 36)]],
        flick: { every: 80, from: 0, odds: 0.35 } });
    }
    drawDissolve(layer, out, f.scale);
  }
  return { strike, dissolve, jolt };
}
