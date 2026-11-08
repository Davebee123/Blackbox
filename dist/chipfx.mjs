// Themed telegraph chips (docs/ui.md "The fight board"): a part with a theme plays it faint inside its own timeline
// chips, under their text: nothing at +2 and +3, faint at +1, stronger in Now and in its last 1.5 s. Nothing leaves the
// chip; the hit itself stays the lash's (lash.mjs). Drawn in the chip's own colour and white, in SVG and the DOM.
//
// The board is rebuilt whenever its markup changes (app.js put), so each chip's effect lives in a box kept here by the
// chip's data-k and moved into the new chip after every rebuild (place): the particles carry on where they were.

// Which parts wear which theme, by the name the player sees (part ids are reused across families).
export const CHIP_THEMES = { 'Pulse Node': 'zap', Encryptor: 'lock', 'Cipher Block': 'cipher', 'C2 Node': 'ring', 'Cold Store': 'frost', Eraser: 'erase' };
export const chipTheme = (name) => CHIP_THEMES[String(name || '').replace(/\.exe$/i, '').trim()] || null;
// How hard a chip plays, by its column (0 is Now) and the ms left in the cycle: [intensity, opacity].
export function chipLevel(col, left) {
  if (col === 0) return left <= 1500 ? [1.6, 0.7] : [1, 0.55];
  if (col === 1) return [0.4, 0.36];
  return [0, 0];
}

const NS = 'http://www.w3.org/2000/svg';
const WHITE = '#fff2c8'; // --bright
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pts = (a) => a.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
const HEXCH = '0123456789ABCDEF';
const LOCK = '<svg viewBox="0 0 16 18"><path class="sh" d="M5 8.5V5.8a3 3 0 0 1 6 0v2.7" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="2.5" y="8" width="11" height="8.5" rx="1.6" fill="currentColor"/><rect x="7.2" y="10.6" width="1.6" height="3.2" rx=".8" fill="#171006"/></svg>';
const GLINT = `<svg viewBox="-5 -5 10 10"><path d="M0-5 .9-.9 5 0 .9.9 0 5-.9.9-5 0-.9-.9z" fill="${WHITE}"/></svg>`;
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" id="cfx-defs"><defs>
<filter id="cfx-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="cfx-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="cfx-rime" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/><feGaussianBlur stdDeviation="0.8"/></filter>
<radialGradient id="cfx-haze"><stop offset="0" stop-color="${WHITE}" stop-opacity="0.5"/><stop offset="1" stop-color="${WHITE}" stop-opacity="0"/></radialGradient>
</defs></svg>`;
const svgIn = (box) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'cfx-svg'); box.appendChild(s); return s; };
const span = (box, cls) => { const d = document.createElement('span'); d.className = cls; box.appendChild(d); return d; };
// Midpoint displacement: a fractal line from a to b.
function fractal(a, b, depth, rough) {
  let line = [a, b];
  for (let d = 0; d < depth; d++) {
    const next = [line[0]];
    for (let i = 0; i < line.length - 1; i++) {
      const p = line[i], q = line[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1, o = (Math.random() * 2 - 1) * len * rough;
      next.push([(p[0] + q[0]) / 2 - (dy / len) * o, (p[1] + q[1]) / 2 + (dx / len) * o], q);
    }
    line = next;
  }
  return line;
}

// Each theme: (chip, box, state, dt ms, intensity, cycle progress 0–1).
const THEMES = {
  // Electric: fractal arcs jump across the chip, a white-hot core over a bloom, hot spots where they touch its edge.
  zap(el, box, S, dt, lv) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!S.svg) { S.svg = svgIn(box); S.arcs = []; }
    if (lv && Math.random() < dt / 1000 * 9 * lv) {
      const run = Math.random() < (lv > 1.2 ? 0.45 : 0.25), x = rnd(4, w - 4);
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'cfx-arc'); S.svg.appendChild(g);
      const a = run ? { x, y: rnd(3, h - 3), x2: x + rnd(40, 90) * (Math.random() < 0.5 ? -1 : 1), y2: rnd(3, h - 3) } : { x, y: 0, x2: x + rnd(-14, 14), y2: h };
      S.arcs.push({ ...a, run, vx: rnd(-40, 40), g, hA: run ? null : span(box, 'cfx-hot'), hB: run ? null : span(box, 'cfx-hot'), age: 0, life: rnd(90, 180) * (run ? 1.5 : 1) });
    }
    S.arcs = S.arcs.filter((a) => {
      a.age += dt; const k = a.age / a.life;
      if (k >= 1) { a.g.remove(); a.hA?.remove(); a.hB?.remove(); return false; }
      const sh = a.vx * a.age / 1000, A = [a.x + sh, a.y], B = [a.x2 + sh, a.y2];
      const line = fractal(A, B, a.run ? 5 : 4, 0.2);
      let tw = '';
      if (Math.random() < 0.6) { const q = line[(1 + Math.random() * (line.length - 2)) | 0], L = rnd(5, 10), an = rnd(0, 6.28); tw = `<polyline class="twig" points="${pts(fractal(q, [q[0] + Math.cos(an) * L, q[1] + Math.sin(an) * L], 2, 0.3))}"/>`; }
      const P = pts(line);
      a.g.innerHTML = `<polyline class="halo" points="${P}"/><polyline class="mid" points="${P}"/><polyline class="core" points="${P}"/>${tw}`;
      const fl = (k < 0.15 ? k / 0.15 : 1 - Math.pow((k - 0.15) / 0.85, 2)) * rnd(0.6, 1);
      a.g.style.opacity = fl;
      if (a.hA) { Object.assign(a.hA.style, { left: A[0] + 'px', top: '0px', opacity: fl }); Object.assign(a.hB.style, { left: B[0] + 'px', top: h + 'px', opacity: fl }); }
      return true;
    });
  },
  // Locks: padlocks rise through the chip, near ones larger and glowing, far ones small and soft; each shackle snaps shut.
  lock(el, box, S, dt, lv) {
    const w = el.offsetWidth, h = el.offsetHeight;
    S.parts ||= [];
    if (lv && Math.random() < dt / 1000 * 7 * lv) {
      const near = Math.random() < 0.4, size = near ? rnd(10, 13) : rnd(6, 8.5);
      const m = span(box, `cfx-lk ${near ? 'near' : 'far'}`); m.innerHTML = LOCK;
      Object.assign(m.style, { width: size + 'px', height: size * 1.12 + 'px' });
      S.parts.push({ m, x: rnd(2, w - size - 2), y: h + 2, vy: -rnd(16, 26) * (near ? 1.25 : 0.8), ph: rnd(0, 6.3), sw: rnd(1.5, 3.5), rot: rnd(-14, 14), vr: rnd(-25, 25), age: 0, size, shutY: rnd(0.35, 0.6) * h, op: near ? 1 : 0.55, shut: false, snap: 0 });
    }
    S.parts = S.parts.filter((q) => {
      q.age += dt; q.y += q.vy * dt / 1000; q.rot += q.vr * dt / 1000;
      if (q.y < -q.size * 1.2) { q.m.remove(); return false; }
      if (!q.shut && q.y < q.shutY) { q.shut = true; q.snap = 120; q.m.classList.add('shut'); }
      q.snap = Math.max(0, q.snap - dt);
      const x = q.x + Math.sin(q.ph + q.age / 260) * q.sw, pop = q.age < 160 ? 0.5 + 0.5 * q.age / 160 : 1;
      q.m.style.transform = `translate(${x}px, ${q.y}px) rotate(${q.rot}deg) scale(${pop * (q.snap ? 1.15 : 1)})`;
      q.m.style.opacity = q.op * clamp(q.age / 200) * clamp((q.y + q.size) / (h * 0.5));
      return true;
    });
  },
  // Ciphertext: streams of hex fall through the chip, a bright head over a fading tail, the glyphs changing as they go.
  cipher(el, box, S, dt, lv) {
    const w = el.offsetWidth, h = el.offsetHeight;
    S.st ||= [];
    if (lv && Math.random() < dt / 1000 * 9 * lv) {
      const near = Math.random() < 0.4, n = near ? 4 : 3, fs = near ? 10 : 8;
      const d = span(box, `cfx-stream ${near ? 'near' : 'far'}`);
      d.style.fontSize = fs + 'px';
      d.innerHTML = Array.from({ length: n }, (_, i) => `<i style="opacity:${[0.15, 0.35, 0.6, 1].slice(-n)[i]}">${HEXCH[(Math.random() * 16) | 0]}</i>`).join('');
      d.lastChild.classList.add('head');
      S.st.push({ d, x: rnd(2, w - 8), y: -n * fs, v: rnd(22, 34) * (near ? 1.3 : 0.8), t: 0 });
    }
    S.st = S.st.filter((s) => {
      s.y += s.v * dt / 1000; s.t += dt;
      if (s.y > h + 4) { s.d.remove(); return false; }
      if (s.t > 70) { s.t = 0; const c = s.d.children[(Math.random() * s.d.children.length) | 0]; c.textContent = HEXCH[(Math.random() * 16) | 0]; }
      s.d.style.transform = `translate(${s.x}px, ${s.y}px)`;
      return true;
    });
  },
  // Beacon: rings roll out from the icon, thinning as they spread, over a soft glow that pulses with each ping.
  ring(el, box, S, dt, lv) {
    const w = el.offsetWidth, ic = el.querySelector('.ico, .bk-ico');
    const cx = ic ? ic.offsetLeft + ic.offsetWidth / 2 : 14, cy = ic ? ic.offsetTop + ic.offsetHeight / 2 : el.offsetHeight / 2;
    if (!S.svg) { S.svg = svgIn(box); S.rs = []; S.acc = 0; S.core = span(box, 'cfx-glow'); }
    Object.assign(S.core.style, { left: cx + 'px', top: cy + 'px', opacity: lv ? 0.45 : 0 });
    S.acc += dt * lv;
    if (lv && S.acc > 650) {
      S.acc = 0;
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('class', 'cfx-rg');
      S.svg.appendChild(c); S.rs.push({ c, age: 0, life: 1500 });
      S.core.animate([{ opacity: 1, transform: 'scale(1.3)' }, { opacity: 0.45, transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
    }
    S.rs = S.rs.filter((r) => {
      r.age += dt; const k = r.age / r.life;
      if (k >= 1) { r.c.remove(); return false; }
      const e = 1 - Math.pow(1 - k, 2.2);
      r.c.setAttribute('cx', cx); r.c.setAttribute('cy', cy); r.c.setAttribute('r', (3 + e * w * 0.85).toFixed(1));
      r.c.style.strokeWidth = (1.8 - 1.4 * k).toFixed(2);
      r.c.style.opacity = (1 - k) * (1 - k);
      return true;
    });
  },
  // Frost: dendrites branch in from the corners as the cycle runs out, over a noisy rime, glints on the tips.
  frost(el, box, S, dt, lv, p) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (S.bw !== w || S.bh !== h) {
      S.bw = w; S.bh = h; box.querySelector('.cfx-svg')?.remove();
      const svg = svgIn(box), branches = [];
      const grow = (x, y, ang, len, depth, start) => {
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
        branches.push(`<path class="cfx-br" pathLength="1" d="M${x.toFixed(1)},${y.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" style="stroke-width:${(0.35 + depth * 0.35).toFixed(2)}" data-s="${start.toFixed(3)}" data-p="${(0.12 + len / 220).toFixed(3)}"/>`);
        if (!depth) return;
        const n = depth > 1 ? 4 : 2;
        for (let i = 1; i <= n; i++) {
          const t = i / (n + 1), bx = x + Math.cos(ang) * len * t, by = y + Math.sin(ang) * len * t, sub = len * (0.42 - t * 0.18) * rnd(0.8, 1.1), s2 = start + t * (0.12 + len / 220);
          if (Math.random() < 0.85) grow(bx, by, ang - Math.PI / 3, sub, depth - 1, s2);
          if (Math.random() < 0.85) grow(bx, by, ang + Math.PI / 3, sub, depth - 1, s2 + 0.02);
        }
      };
      let haze = '';
      for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) {
        grow(cx, cy, Math.atan2(0, sx), rnd(34, 48), 2, 0);
        grow(cx, cy, Math.atan2(sy, 0), h * 0.8, 1, 0.05);
        grow(cx, cy, Math.atan2(sy, sx), rnd(9, 13), 1, 0.08);
        haze += `<circle cx="${cx}" cy="${cy}" r="${rnd(26, 34).toFixed(1)}" fill="url(#cfx-haze)"/>`;
      }
      svg.innerHTML = `<g class="cfx-rime" filter="url(#cfx-rime)">${haze}</g><g filter="url(#cfx-soft)">${branches.join('')}</g>`;
      S.paths = [...svg.querySelectorAll('.cfx-br')].map((q) => ({ q, s: +q.dataset.s, p: +q.dataset.p, f: 0 }));
      S.rime = svg.querySelector('.cfx-rime');
    }
    const g = lv === 0 ? 0 : lv < 1 ? 0.2 : 0.22 + 0.78 * p;
    for (const b of S.paths) { b.f = clamp((g * 1.05 - b.s) / b.p); b.q.style.strokeDashoffset = 1 - b.f; }
    S.rime.style.opacity = clamp(g * 0.7);
    if (lv && Math.random() < dt / 1000 * 3 * lv) {
      const tip = S.paths[(Math.random() * S.paths.length) | 0];
      if (tip.f > 0.95) {
        const L = tip.q.getPointAtLength(tip.q.getTotalLength()), m = span(box, 'cfx-glint'); m.innerHTML = GLINT;
        Object.assign(m.style, { left: L.x + 'px', top: L.y + 'px' });
        m.animate([{ transform: 'scale(0) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(30deg)', opacity: 1, offset: 0.35 }, { transform: 'scale(0) rotate(70deg)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => m.remove();
      }
    }
  },
  // Wipe: a dither field; in Now the playhead's line eats it, pixels flaking off its edge; at +1 it sheds a pixel now and then.
  erase(el, box, S, dt, lv, p) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!S.field) { S.field = span(box, 'cfx-dith'); S.edge = span(box, 'cfx-edge'); S.fl = []; }
    const now = lv >= 1, x = now ? p * w : 0;
    S.field.style.clipPath = now ? `inset(0 0 0 ${x}px)` : 'none';
    S.field.style.opacity = lv ? (now ? 1 : 0.55) : 0;
    Object.assign(S.edge.style, { left: x + 'px', opacity: now ? 1 : 0 });
    if (lv && Math.random() < dt / 1000 * (now ? 26 : 3) * lv) {
      const f = span(box, 'cfx-flake'), sz = Math.random() < 0.3 ? 3 : 2;
      Object.assign(f.style, { width: sz + 'px', height: sz + 'px' });
      S.fl.push({ f, x: now ? x + rnd(-1, 3) : rnd(0, w), y: rnd(0, h), vx: rnd(-14, 4), vy: rnd(-10, 10), age: 0, life: rnd(350, 650) });
    }
    S.fl = S.fl.filter((q) => {
      q.age += dt; const k = q.age / q.life;
      if (k >= 1) { q.f.remove(); return false; }
      q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000;
      q.f.style.transform = `translate(${q.x}px, ${q.y}px)`; q.f.style.opacity = 1 - k;
      return true;
    });
  },
};

export function createChipFx() {
  const kept = new Map(); // data-k → { box, st, th, seen }
  // The themed chips on the board: a part's own attack and its tells (not its patch, lash or encryption chips).
  const chips = (board) => [...board.querySelectorAll('.brow[data-th] .intent[data-k]')].filter((el) => /^(tell:|[^:]+@)/.test(el.dataset.k));
  return {
    // After every board rebuild: each themed chip gets its box back (or a new one).
    place(board) {
      if (!board) return;
      if (!document.getElementById('cfx-defs')) document.body.insertAdjacentHTML('beforeend', DEFS);
      const now = performance.now();
      for (const el of chips(board)) {
        const k = el.dataset.k;
        let rec = kept.get(k);
        if (!rec) { const box = document.createElement('span'); box.className = 'fxin'; box.setAttribute('aria-hidden', 'true'); rec = { box, st: {}, th: el.closest('.brow').dataset.th }; kept.set(k, rec); }
        rec.seen = now;
        if (rec.box.parentNode !== el) el.prepend(rec.box);
      }
      for (const [k, rec] of kept) if (now - rec.seen > 3000) { rec.box.remove(); kept.delete(k); }
    },
    // Every frame: dt ms (0 while paused), p the cycle's progress, left its ms to go, k the screen effects' strength (0 is off).
    tick({ dt, p, left, k }) {
      for (const rec of kept.values()) {
        const el = rec.box.parentNode;
        if (!el?.isConnected) continue;
        const cell = el.closest('.bcell'), col = cell ? [...cell.parentNode.children].indexOf(cell) - 1 : 9;
        const [lv, op] = k ? chipLevel(col, left) : [0, 0];
        rec.box.style.opacity = op * k;
        if (lv || rec.st.svg || rec.st.parts || rec.st.st || rec.st.field) THEMES[rec.th]?.(el, rec.box, rec.st, dt, lv, col === 0 ? p : 0);
      }
    },
  };
}

// The themes with a strike of their own: the lash (lash.mjs) stays out of their hits, so the eye stays on the chip.
export const STRIKES = new Set(['zap', 'lock', 'frost', 'cipher', 'ring', 'erase']);
// A themed chip going off (app.js fire): its strike, in screen px, from the chip's rect r to your bar at `to`, in the
// threat's red. Pulse Node: a forked bolt that strobes into your bar, a burst and sparks there. Encryptor: its padlocks
// arc to your bar with short trails and clamp on. Cold Store: its frost shatters (the chip's ghost still flies).
// Cipher Block: hex streams fly into your bar, head first, and scatter there. C2 Node: rings ping out of its icon, a
// dashed signal runs to your bar and rings close in on it. Eraser: the chip's pixels fly off in wipe order and a
// dither sweeps your bar under an edge. `bar` is your bar's rect. True when the strike stands in for the ghost.
export function chipStrike(th, r, to, bar) {
  if (!document.getElementById('cfx-defs')) document.body.insertAdjacentHTML('beforeend', DEFS);
  const fly = (cls, x, y, w, h) => { const d = document.createElement('span'); d.className = `cfx-fly ${cls}`; Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); document.body.appendChild(d); return d; };
  if (th === 'zap') {
    const g = document.createElementNS(NS, 'svg'); g.setAttribute('class', 'cfx-fly cfx-bolt'); document.body.appendChild(g);
    const a = [r.left + r.width * 0.35, r.top];
    const strike = (op) => {
      const main = fractal(a, [to.x, to.y + 3], 6, 0.2);
      let html = `<g class="cfx-arc" style="opacity:${op}"><polyline class="halo" points="${pts(main)}" style="stroke-width:5"/><polyline class="mid" points="${pts(main)}" style="stroke-width:2.2"/><polyline class="core" points="${pts(main)}" style="stroke-width:1.2"/>`;
      for (let i = 0; i < 4; i++) {
        const q = main[(4 + Math.random() * (main.length - 8)) | 0], L = rnd(10, 22), an = rnd(0, Math.PI * 2);
        html += `<polyline class="twig" points="${pts(fractal(q, [q[0] + Math.cos(an) * L, q[1] + Math.sin(an) * L], 3, 0.3))}"/>`;
      }
      g.innerHTML = html + '</g>';
    };
    [[0, 1], [45, 0.5], [90, 1], [150, 0.7], [210, 0.35]].forEach(([d, op]) => setTimeout(() => strike(op), d));
    setTimeout(() => g.remove(), 280);
    setTimeout(() => {
      const b = fly('cfx-burst', to.x - 22, to.y - 22, 44, 44);
      b.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => b.remove();
      const sp = document.createElementNS(NS, 'svg'); sp.setAttribute('class', 'cfx-fly cfx-bolt'); document.body.appendChild(sp);
      let html = '';
      for (let i = 0; i < 8; i++) { const an = rnd(0, Math.PI * 2), L = rnd(8, 18); html += `<g class="cfx-arc"><polyline class="mid" points="${pts(fractal([to.x, to.y], [to.x + Math.cos(an) * L, to.y + Math.sin(an) * L], 2, 0.35))}" style="stroke-width:1"/></g>`; }
      sp.innerHTML = html;
      sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in' }).onfinish = () => sp.remove();
    }, 40);
    return true;
  }
  if (th === 'lock') {
    for (let i = 0; i < 7; i++) {
      const x0 = r.left + rnd(8, r.width - 18), y0 = r.top + rnd(0, r.height - 14), x1 = to.x - 48 + i * 15, y1 = to.y - 7;
      const cx = (x0 + x1) / 2 + rnd(-30, 30), cy = Math.min(y0, y1) - rnd(20, 45);
      const path = [];
      for (let j = 0; j <= 12; j++) { const t = j / 12, e = t * t * (3 - 2 * t); path.push({ transform: `translate(${(1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1}px, ${(1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1}px) rotate(${(1 - t) * rnd(-30, 30)}deg)`, offset: t * 0.62 }); }
      const end = path[12].transform.replace(/rotate\([^)]*\)/, 'rotate(0deg)');
      const frames = [...path.map((f) => ({ ...f, opacity: 1 })), { transform: end + ' scale(1.45)', opacity: 1, offset: 0.7 }, { transform: end, opacity: 1, offset: 0.78 }, { transform: end, opacity: 1, offset: 0.9 }, { transform: end + ' scale(.8)', opacity: 0 }];
      [0.25, 0.5, 1].forEach((op, k) => { // two trails, then the lock itself
        const m = fly(`cfx-lk ${k === 2 ? 'near' : ''}`, 0, 0, 12, 13.5); m.innerHTML = LOCK;
        const delay = i * 35 + (2 - k) * 28;
        m.animate(k === 2 ? frames : frames.map((f) => ({ ...f, opacity: f.offset > 0.62 ? 0 : op })), { duration: 1000, delay, easing: 'linear', fill: 'both' }).onfinish = () => m.remove();
        if (k === 2) setTimeout(() => {
          m.classList.add('shut');
          const ring = fly('cfx-clamp', x1 - 4, y1 - 3, 20, 20);
          ring.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 360, easing: 'ease-out' }).onfinish = () => ring.remove();
        }, delay + 640);
      });
    }
    return true;
  }
  if (th === 'frost') {
    for (let i = 0; i < 22; i++) {
      const [ax, ay] = [[0, 0], [1, 0], [0, 1], [1, 1]][i % 4];
      const x = r.left + ax * r.width + (ax ? -1 : 1) * rnd(0, 34), y = r.top + ay * r.height + (ay ? -1 : 1) * rnd(0, 10);
      const m = fly('cfx-shard', x, y, 1, rnd(3, 7));
      const vx = (x - (r.left + r.width / 2)) * rnd(0.15, 0.35), fall = rnd(28, 60), r0 = rnd(0, 180), r1 = r0 + rnd(-260, 260);
      m.animate([{ transform: `rotate(${r0}deg)`, opacity: 1 }, { transform: `translate(${vx * 0.6}px, ${-rnd(4, 12)}px) rotate(${(r0 + r1) / 2}deg)`, opacity: 1, offset: 0.3 }, { transform: `translate(${vx}px, ${fall}px) rotate(${r1}deg)`, opacity: 0 }], { duration: rnd(500, 800), easing: 'cubic-bezier(.3,0,.7,1)' }).onfinish = () => m.remove();
    }
    return false;
  }
  if (th === 'cipher') {
    const bw = bar?.width || 120;
    for (let i = 0; i < 16; i++) {
      const near = i % 3 === 0, n = near ? 4 : 3, fs = near ? 11 : 9;
      const x0 = r.left + rnd(6, r.width - 10), y0 = r.top + rnd(0, r.height - 8), x1 = to.x + rnd(-bw * 0.4, bw * 0.4), y1 = to.y + rnd(-3, 3);
      const rot = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI - 90, d = span(document.body, `cfx-fly cfx-stream${near ? '' : ' far'}`), dur = rnd(380, 560), delay = i * 24;
      d.style.fontSize = fs + 'px';
      d.innerHTML = Array.from({ length: n }, (_, j) => `<i style="opacity:${[0.15, 0.35, 0.6, 1].slice(-n)[j]}">${HEXCH[(Math.random() * 16) | 0]}</i>`).join('');
      d.lastChild.classList.add('head');
      d.style.transformOrigin = '50% 100%';
      d.animate([{ transform: `translate(${x0}px, ${y0}px) rotate(${rot}deg)`, opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${x1}px, ${y1}px) rotate(${rot}deg)`, opacity: 1, offset: 0.9 }, { transform: `translate(${x1}px, ${y1}px) rotate(${rot}deg)`, opacity: 0 }], { duration: dur, delay, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'both' }).onfinish = () => d.remove();
      const flip = setInterval(() => { const c = d.children[(Math.random() * n) | 0]; if (c) c.textContent = HEXCH[(Math.random() * 16) | 0]; }, 55);
      setTimeout(() => {
        clearInterval(flip);
        const g = span(document.body, 'cfx-fly cfx-stream'); g.style.fontSize = '10px'; g.innerHTML = `<i class="head">${HEXCH[(Math.random() * 16) | 0]}</i>`;
        Object.assign(g.style, { left: x1 + 'px', top: y1 + 'px' });
        const an = rnd(0, Math.PI * 2), L = rnd(6, 16);
        g.animate([{ transform: 'scale(1.2)', opacity: 1 }, { transform: `translate(${Math.cos(an) * L}px, ${Math.sin(an) * L}px) scale(.7)`, opacity: 0 }], { duration: 300, easing: 'ease-out' }).onfinish = () => g.remove();
      }, delay + dur * 0.9);
    }
    setTimeout(() => {
      const b = fly('cfx-burst', to.x - 26, to.y - 26, 52, 52);
      b.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => b.remove();
    }, 440);
    return true;
  }
  if (th === 'ring') {
    const cx = r.left + 14, cy = r.top + r.height / 2;
    [0, 110, 220].forEach((d, i) => {
      const s = 20 + i * 4, m = fly('cfx-clamp', cx - s / 2, cy - s / 2, s, s);
      m.animate([{ transform: 'scale(.2)', opacity: 0.9 }, { transform: `scale(${3.4 - i * 0.5})`, opacity: 0 }], { duration: 560, delay: d, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both' }).onfinish = () => m.remove();
    });
    const g = document.createElementNS(NS, 'svg'); g.setAttribute('class', 'cfx-fly cfx-bolt'); document.body.appendChild(g);
    g.innerHTML = `<g class="cfx-arc"><line class="halo" x1="${cx}" y1="${cy}" x2="${to.x}" y2="${to.y}" pathLength="1" style="stroke-dasharray:1 1;stroke-dashoffset:1;stroke-width:4"/><line class="mid" x1="${cx}" y1="${cy}" x2="${to.x}" y2="${to.y}" pathLength="1" style="stroke-dasharray:.04 .03;stroke-dashoffset:0;opacity:.9"/></g>`;
    const mask = g.querySelector('.halo');
    mask.animate([{ strokeDashoffset: 1, opacity: 0.8 }, { strokeDashoffset: 0, opacity: 0.8, offset: 0.6 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 480, delay: 60, easing: 'ease-out', fill: 'both' });
    g.querySelector('.mid').animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0 }], { duration: 480, delay: 60, fill: 'both' }).onfinish = () => g.remove();
    [0, 90, 180].forEach((d, i) => {
      const s = 54 - i * 10, m = fly('cfx-clamp', to.x - s / 2, to.y - s / 2, s, s);
      m.animate([{ transform: 'scale(2.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.7 }, { transform: 'scale(.35)', opacity: 0 }], { duration: 420, delay: 340 + d, easing: 'cubic-bezier(.4,0,.7,1)', fill: 'both' }).onfinish = () => m.remove();
    });
    setTimeout(() => {
      const b = fly('cfx-burst', to.x - 20, to.y - 20, 40, 40);
      b.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => b.remove();
    }, 520);
    return true;
  }
  if (th === 'erase') {
    const bx = bar?.left ?? to.x - 60, bw = bar?.width ?? 120, by = bar?.top ?? to.y - 4, bh = bar?.height ?? 8;
    for (let i = 0; i < 44; i++) {
      const u = Math.random(), s = Math.random() < 0.3 ? 3 : 2, x0 = r.left + u * r.width, y0 = r.top + Math.random() * r.height;
      const x1 = bx + (0.15 + 0.7 * u) * bw + rnd(-8, 8), y1 = by + Math.random() * bh, delay = u * 260, dur = rnd(300, 460);
      const f = fly('cfx-flake', 0, 0, s, s);
      f.animate([{ transform: `translate(${x0}px, ${y0}px)`, opacity: 1 }, { transform: `translate(${x0 + rnd(-10, 6)}px, ${y0 + rnd(-8, 8)}px)`, opacity: 1, offset: 0.2 }, { transform: `translate(${x1}px, ${y1}px)`, opacity: 1, offset: 0.92 }, { transform: `translate(${x1}px, ${y1}px)`, opacity: 0 }], { duration: dur, delay, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'both' }).onfinish = () => f.remove();
    }
    const f = fly('cfx-dith', bx, by, bw, bh), e = fly('cfx-edge', bx, by - 3, 2, bh + 6);
    f.style.clipPath = 'inset(0 100% 0 0)'; e.style.opacity = 0; e.style.height = bh + 6 + 'px';
    const T = { duration: 420, delay: 300, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' };
    f.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0% 0 0)', opacity: 1, offset: 0.85 }, { clipPath: 'inset(0 0% 0 0)', opacity: 0 }], { ...T, duration: 700 }).onfinish = () => f.remove();
    e.animate([{ left: bx + 'px', opacity: 1 }, { left: bx + bw + 'px', opacity: 1, offset: 0.99 }, { left: bx + bw + 'px', opacity: 0 }], T).onfinish = () => e.remove();
    return true;
  }
  return false;
}
