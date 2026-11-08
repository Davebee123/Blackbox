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
