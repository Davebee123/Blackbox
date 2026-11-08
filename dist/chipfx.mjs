// Themed telegraph chips (docs/ui.md "The fight board"): a part with a theme plays it faint inside its own timeline
// chips, under their text: nothing at +2 and +3, faint at +1, stronger in Now and in its last 1.5 s. Nothing leaves the
// chip; the hit itself stays the lash's (lash.mjs). Drawn in the chip's own colour and white, in SVG and the DOM.
//
// The board is rebuilt whenever its markup changes (app.js put), so each chip's effect lives in a box kept here by the
// chip's data-k and moved into the new chip after every rebuild (place): the particles carry on where they were.

// Which parts wear which theme, by the name the player sees (part ids are reused across families).
export const CHIP_THEMES = {
  'Pulse Node': 'zap', Encryptor: 'lock', 'Cipher Block': 'cipher', 'C2 Node': 'ring', 'Cold Store': 'frost', Eraser: 'erase',
  Rig: 'heat', 'Twin Rig': 'heat', Hotspot: 'heat', Volatile: 'heat', Payload: 'heat', Vendetta: 'heat',
  'Bad Block': 'crumble', 'Zip Bomb': 'crumble', Degausser: 'crumble', 'Recycle Bin': 'crumble', Junker: 'crumble',
  Scrambler: 'scramble', Obfuscator: 'scramble', Prism: 'scramble', Packer: 'scramble', Decoy: 'scramble', Sandbox: 'scramble',
  Thorns: 'thorn', Punisher: 'thorn', Predator: 'thorn', Opportunist: 'thorn',
};
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

// ---------- shared ----------
const noise = (x) => Math.sin(x) * 0.5 + Math.sin(x * 2.17 + 1.3) * 0.3 + Math.sin(x * 4.73 + 2.1) * 0.2;
const f1 = (v) => v.toFixed(1);
// A screen-space span for a strike.
const fspan = (cls, x, y, w, h) => { const d = document.createElement('span'); d.className = `cfx-fly ${cls}`; Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); document.body.appendChild(d); return d; };
// A strike's stage: a full-screen SVG redrawn every frame for dur ms.
function stage(dur, frame) {
  const g = document.createElementNS(NS, 'svg'); g.setAttribute('class', 'cfx-fly cfx-bolt'); document.body.appendChild(g);
  const t0 = performance.now(); let last = t0;
  const step = (now) => {
    const t = now - t0;
    if (t >= dur) { g.remove(); return; }
    frame(g, t, Math.min(50, now - last)); last = now;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function burst(x, y, s, delay = 0, dur = 380) {
  const b = fspan('cfx-burst', x - s / 2, y - s / 2, s, s);
  b.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: dur, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }).onfinish = () => b.remove();
}
// An ember in screen space: a white-hot point with a glow, thrown with (vx, vy) px/s under gravity g.
function ember(x, y, { vx = rnd(-20, 20), vy = -rnd(20, 50), g = 0, life = rnd(400, 800), near = Math.random() < 0.4, delay = 0 } = {}) {
  const s = near ? rnd(2.2, 3.4) : rnd(1.2, 1.8), m = fspan(`cfx-em ${near ? '' : 'far'}`, 0, 0, s, s), fr = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8 * life / 1000; fr.push({ transform: `translate(${f1(x + vx * t)}px, ${f1(y + vy * t + 0.5 * g * t * t)}px)`, opacity: (near ? 1 : 0.6) * (1 - (i / 8) ** 2) * (i % 2 ? 0.75 : 1) }); }
  m.animate(fr, { duration: life, delay, fill: 'both' }).onfinish = () => m.remove();
}
// Spark lines: short white streaks thrown out from (x, y).
function sparks(x, y, n, len = 10, delay = 0, ang0 = 0, spread = Math.PI * 2) {
  for (let i = 0; i < n; i++) {
    const an = ang0 - spread / 2 + rnd(0, spread), L = rnd(len * 0.5, len), m = fspan('cfx-sparkln', x, y - 0.75, L, 1.5);
    m.style.transformOrigin = '0 50%';
    const deg = an * 180 / Math.PI;
    m.animate([{ transform: `rotate(${deg}deg) scaleX(.2)`, opacity: 1 }, { transform: `rotate(${deg}deg) translateX(${L * 0.8}px) scaleX(1)`, opacity: 0.9, offset: 0.4 }, { transform: `rotate(${deg}deg) translateX(${L * 1.6}px) scaleX(.1)`, opacity: 0 }], { duration: rnd(180, 260), delay, easing: 'ease-out', fill: 'both' }).onfinish = () => m.remove();
  }
}

// ---------- heat ----------
// Flame tongues standing on y = base from x0 across w: hs[i] each tongue's height, sw[i] its sway.
function flameD(x0, w, base, hs, sw) {
  const n = hs.length, cw = w / n;
  let d = `M${f1(x0)},${f1(base + 2)} L${f1(x0)},${f1(base - hs[0] * 0.15)}`;
  for (let i = 0; i < n; i++) {
    const xl = x0 + i * cw, xr = xl + cw, tx = xl + cw / 2 + sw[i], ty = base - hs[i];
    const yl = base - Math.min(hs[i], hs[i - 1] ?? hs[i]) * 0.15, yr = base - Math.min(hs[i], hs[i + 1] ?? hs[i]) * 0.15;
    d += ` C${f1(xl + (tx - xl) * 0.45)},${f1(yl - (yl - ty) * 0.4)} ${f1(tx - (tx - xl) * 0.12)},${f1(ty + (yl - ty) * 0.38)} ${f1(tx)},${f1(ty)} C${f1(tx + (xr - tx) * 0.12)},${f1(ty + (yr - ty) * 0.38)} ${f1(xr - (xr - tx) * 0.45)},${f1(yr - (yr - ty) * 0.4)} ${f1(xr)},${f1(yr)}`;
  }
  return d + ` L${f1(x0 + w)},${f1(base + 2)} Z`;
}
const FLAME = (d, dc) => `<path class="cfx-fl-halo" d="${d}"/><path class="cfx-fl-body" d="${d}"/><path class="cfx-fl-core" d="${dc}"/>`;

// ---------- crumble ----------
// A crack network: mains run in from the edges and branch twice. Each segment keeps its points, their running length,
// and when it starts and how long it takes to grow (0–1 of the whole).
function cracks(origins) {
  const segs = [];
  const grow = (x, y, ang, len, depth, start) => {
    const line = fractal([x, y], [x + Math.cos(ang) * len, y + Math.sin(ang) * len], depth > 1 ? 4 : 3, 0.2);
    const cum = [0];
    for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    const dur = 0.12 + len / 300;
    segs.push({ line, cum, s: start, p: dur, depth, f: 0 });
    if (!depth) return;
    for (let i = 0; i < (depth > 1 ? 2 : 1); i++) {
      const t = rnd(0.3, 0.75), q = line[Math.floor(t * (line.length - 1))];
      grow(q[0], q[1], ang + (Math.random() < 0.5 ? -1 : 1) * rnd(0.55, 1.05), len * rnd(0.35, 0.55), depth - 1, start + t * dur);
    }
  };
  for (const [x, y, ang, len, depth = 2] of origins) grow(x, y, ang, len, depth, rnd(0, 0.1));
  return segs;
}
const crackOrigins = (x, y, w, h) => [
  [x + rnd(0.08, 0.3) * w, y, Math.PI / 2 + rnd(0.5, 0.9), h * rnd(1.4, 1.8)],
  [x + rnd(0.45, 0.65) * w, y + h, -Math.PI / 2 - rnd(0.5, 0.9) * (Math.random() < 0.5 ? -1 : 1), h * rnd(1.4, 1.8)],
  [x, y + rnd(0.3, 0.7) * h, rnd(-0.35, 0.35), rnd(28, 44)],
  [x + w, y + rnd(0.3, 0.7) * h, Math.PI + rnd(-0.35, 0.35), rnd(28, 44)],
  [x + rnd(0.7, 0.9) * w, y, Math.PI / 2 - rnd(0.5, 0.9), h * rnd(1.2, 1.6), 1],
];
const segAt = (sg, f) => {
  const L = sg.cum[sg.cum.length - 1] * f;
  let i = 1; while (i < sg.cum.length - 1 && sg.cum[i] < L) i++;
  const a = sg.line[i - 1], b = sg.line[i], u = (L - sg.cum[i - 1]) / ((sg.cum[i] - sg.cum[i - 1]) || 1);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
};
const CRACK = (sg, f, w = 1) => { const P = pts(sg.line), o = f1(1 - f); return `<polyline class="cfx-cr-halo" pathLength="1" points="${P}" style="stroke-dashoffset:${o};stroke-width:${2.4 * w}"/><polyline class="cfx-cr-core" pathLength="1" points="${P}" style="stroke-dashoffset:${o};stroke-width:${(sg.depth ? 0.9 : 0.6) * w}"/>`; };

// ---------- scramble ----------
const SCR = '0123456789ABCDEF#%&@$*?!<>{}[]/\\=+~░▒▓';
const glyph = () => SCR[(Math.random() * SCR.length) | 0];
const sparse = () => (Math.random() < 0.62 ? ' ' : glyph());

// ---------- thorn ----------
// A thorn standing on its base at the origin, pointing down +y to its tip at (curl, L): a hooked body and a white sliver.
const thornD = (b, L, c) => `M${f1(-b / 2)},0 Q${f1(-b * 0.12)},${f1(L * 0.5)} ${f1(c)},${f1(L)} Q${f1(b * 0.32)},${f1(L * 0.4)} ${f1(b / 2)},0Z`;
const thornCore = (b, L, c) => `M${f1(-b * 0.18)},${f1(L * 0.05)} Q${f1(-b * 0.04)},${f1(L * 0.5)} ${f1(c * 0.96)},${f1(L * 0.93)} Q${f1(b * 0.04)},${f1(L * 0.45)} ${f1(b * 0.06)},${f1(L * 0.05)}Z`;
// A ribbon tapering from w0 at the newest point to nothing at the oldest.
function ribbon(h, w0) {
  if (h.length < 2) return '';
  const L = [], R = [];
  h.forEach((p, i) => {
    const a = h[Math.max(0, i - 1)], b = h[Math.min(h.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, w = w0 * (i / (h.length - 1)) / 2;
    L.push([p[0] - dy / n * w, p[1] + dx / n * w]); R.push([p[0] + dy / n * w, p[1] - dx / n * w]);
  });
  return pts([...L, ...R.reverse()]);
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
  // Heat: flame tongues lick up from the chip's foot, a white-hot core inside a blooming body, rising with the cycle.
  // Embers break off the tips, near ones bright and big, far ones small and soft; some pop into sparks on the way up.
  heat(el, box, S, dt, lv, p) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!S.svg) { S.glow = span(box, 'cfx-heat'); S.svg = svgIn(box); S.t = 0; S.H = 0; S.em = []; S.ph = Array.from({ length: 64 }, () => rnd(0, 60)); }
    S.t += dt / 1000 * (lv > 1.2 ? 1.5 : 1);
    const goal = !lv ? 0 : lv < 1 ? 0.22 : 0.36 + 0.46 * p + (lv > 1.2 ? 0.1 : 0);
    S.H += (goal - S.H) * Math.min(1, dt / 250);
    const sheet = (n, off, amp) => {
      const hs = [], sw = [];
      for (let i = 0; i < n; i++) { const f = 0.5 + 0.5 * noise(S.t * 3.1 + S.ph[i + off]); hs.push(h * S.H * amp * (0.22 + 1.05 * f ** 1.5)); sw.push(noise(S.t * 2.3 + S.ph[i + off + 1] * 1.7) * w / n * 0.35); }
      return [hs, sw];
    };
    const n = Math.max(5, Math.round(w / 17)), [bh, bs] = sheet(n + 1, 30, 1.2), [hs, sw] = sheet(n, 0, 1), hc = hs.map((v, i) => v * (0.22 + 0.16 * (0.5 + 0.5 * noise(S.t * 5 + i))));
    S.svg.innerHTML = S.H > 0.01 ? `<path class="cfx-fl-back" d="${flameD(-w / (n + 1) / 2, w * (1 + 1 / (n + 1)), h, bh, bs)}"/>` + FLAME(flameD(0, w, h, hs, sw), flameD(0, w, h, hc, sw.map((s) => s * 0.6))) : '';
    S.glow.style.opacity = clamp(S.H * 1.5) * (0.85 + 0.15 * noise(S.t * 9));
    if (S.H > 0.05 && Math.random() < dt / 1000 * 40 * S.H * lv) {
      const near = Math.random() < 0.35, s = near ? rnd(2.2, 3.2) : rnd(1.2, 1.8), i = (Math.random() * n) | 0, m = span(box, `cfx-em ${near ? '' : 'far'}`);
      Object.assign(m.style, { width: s + 'px', height: s + 'px' });
      S.em.push({ m, x: (i + 0.5) * w / n + sw[i], y: h - hs[i] * rnd(0.7, 1), vx: 0, vy: -rnd(18, 36) * (near ? 1.2 : 0.75), ph: rnd(0, 60), age: 0, life: rnd(700, 1300) * (near ? 1 : 1.3), near, pop: near && Math.random() < 0.3 ? rnd(0.35, 0.7) : 2, hot: true });
    }
    S.em = S.em.filter((q) => {
      q.age += dt; const k = q.age / q.life;
      if (k >= q.pop) {
        for (let i = 0; i < 3; i++) { const sp = span(box, 'cfx-spark'), an = rnd(0, 6.28), L = rnd(4, 8); Object.assign(sp.style, { left: q.x + 'px', top: q.y + 'px' }); sp.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${Math.cos(an) * L}px, ${Math.sin(an) * L}px)`, opacity: 0 }], { duration: 240, easing: 'ease-out' }).onfinish = () => sp.remove(); }
        q.m.remove(); return false;
      }
      if (k >= 1 || q.y < -4) { q.m.remove(); return false; }
      q.vx = (q.vx + noise(S.t * 4 + q.ph) * 120 * dt / 1000) * 0.97;
      q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000;
      if (q.hot && k > 0.4) { q.hot = false; q.m.classList.add('cool'); }
      q.m.style.transform = `translate(${f1(q.x)}px, ${f1(q.y)}px)`;
      q.m.style.opacity = (1 - k * k) * (0.65 + 0.35 * Math.sin(q.age / 45 + q.ph)) * (q.near ? 1 : 0.55);
      return true;
    });
  },
  // Crumble: glowing fissures branch in from the edges as the cycle runs out, a hot point at each growing tip. Chips
  // of the surface break off and fall (near ones bright, tumbling; far ones dust), and dead pixels flicker by the
  // cracks. In the last 1.5 s the light behind the cracks breathes.
  crumble(el, box, S, dt, lv, p) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (S.bw !== w) {
      S.bw = w; S.svg?.remove(); S.tips?.forEach((t) => t.remove());
      S.svg = svgIn(box); S.segs = cracks(crackOrigins(0, 0, w, h)); S.ps = []; S.t = 0;
      S.svg.innerHTML = S.segs.map((sg) => `<g>${CRACK(sg, 0)}</g>`).join('');
      S.els = [...S.svg.children].map((g) => [...g.children]);
      S.tips = S.segs.map(() => span(box, 'cfx-tip'));
    }
    S.t += dt;
    const g = !lv ? 0 : lv < 1 ? 0.14 : 0.18 + 0.82 * p;
    const breathe = lv > 1.2 ? 0.7 + 0.3 * Math.sin(S.t / 110) : 1;
    S.segs.forEach((sg, i) => {
      sg.f = clamp((g * 1.1 - sg.s) / sg.p);
      const o = f1(1 - sg.f);
      S.els[i][0].style.strokeDashoffset = o; S.els[i][1].style.strokeDashoffset = o;
      S.els[i][0].style.opacity = 0.75 * breathe;
      const t = S.tips[i];
      if (sg.f > 0 && sg.f < 1 && lv >= 1) { const [x, y] = segAt(sg, sg.f); Object.assign(t.style, { left: f1(x) + 'px', top: f1(y) + 'px', opacity: 0.9 }); } else t.style.opacity = 0;
    });
    const open = S.segs.filter((sg) => sg.f > 0.15);
    if (lv && open.length && Math.random() < dt / 1000 * 26 * g * lv) {
      const sg = open[(Math.random() * open.length) | 0], [x, y] = segAt(sg, rnd(0, sg.f)), near = Math.random() < 0.4;
      if (near) {
        const s = rnd(2, 3.6), m = span(box, 'cfx-chip');
        Object.assign(m.style, { width: s + 'px', height: s + 'px', clipPath: `polygon(${rnd(0, 40)}% 0, 100% ${rnd(0, 50)}%, ${rnd(50, 100)}% 100%, 0 ${rnd(40, 100)}%)` });
        S.ps.push({ m, x, y, vx: rnd(-10, 10), vy: rnd(-14, 2), g: 240, rot: rnd(0, 360), vr: rnd(-400, 400), age: 0, life: rnd(500, 800) });
      } else {
        const m = span(box, 'cfx-dust1');
        S.ps.push({ m, x, y, vx: rnd(-4, 4), vy: rnd(0, 6), g: 60, rot: 0, vr: 0, age: 0, life: rnd(500, 900), op: 0.6 });
      }
    }
    if (lv && open.length && Math.random() < dt / 1000 * 4 * g * lv) {
      const sg = open[(Math.random() * open.length) | 0], [x, y] = segAt(sg, rnd(0, sg.f)), m = span(box, 'cfx-px');
      Object.assign(m.style, { left: Math.round(x / 3) * 3 + rnd(-1, 1) * 3 + 'px', top: Math.round(y / 3) * 3 + 'px' });
      m.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.2, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0.1, offset: 0.7 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0 }], { duration: 520 }).onfinish = () => m.remove();
    }
    S.ps = S.ps.filter((q) => {
      q.age += dt; const k = q.age / q.life;
      if (k >= 1 || q.y > h + 4) { q.m.remove(); return false; }
      q.vy += q.g * dt / 1000; q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000; q.rot += q.vr * dt / 1000;
      q.m.style.transform = `translate(${f1(q.x)}px, ${f1(q.y)}px) rotate(${q.rot | 0}deg)`;
      q.m.style.opacity = (q.op ?? 1) * (1 - k * k);
      return true;
    });
  },
  // Scramble: a field of dim glyphs churns behind the chip; a decoding wave sweeps through it, white at its head, and the
  // glyphs it passes change fast. Rows tear sideways for a moment, and near glyphs pop in large and settle.
  scramble(el, box, S, dt, lv) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (S.bw !== w) {
      S.bw = w; S.rows?.forEach((r) => { r.back.remove(); r.head.remove(); r.tail.remove(); });
      const R = Math.max(2, Math.floor(h / 8.5)), C = Math.ceil(w / 5.4) + 1;
      S.C = C; S.t = 0; S.wx = -8; S.pops = [];
      S.rows = Array.from({ length: R }, (_, i) => {
        const top = f1((i + 0.5) * h / R - 4.5) + 'px', mk = (c) => { const s = span(box, c); s.style.top = top; return s; };
        return { ch: Array.from({ length: C }, sparse), back: mk('cfx-sc-back'), tail: mk('cfx-sc-tail'), head: mk('cfx-sc-head'), dx: 0, tear: 0 };
      });
      S.tearLn = span(box, 'cfx-tear');
    }
    S.t += dt;
    const sweep = lv > 1.2 ? 620 : lv >= 1 ? 900 : 1700;
    S.wx += dt / sweep * (S.C + 14);
    if (S.wx > S.C + 6) S.wx = -8;
    const wx = Math.round(S.wx);
    for (const r of S.rows) {
      for (let c = 0; c < S.C; c++) { const d = Math.abs(c - wx); if (Math.random() < dt / 1000 * (1.5 + (d < 6 ? 40 : 0))) r.ch[c] = sparse(); }
      r.back.textContent = r.ch.join('');
      const line = (a, b) => ' '.repeat(Math.max(0, a)) + r.ch.slice(Math.max(0, a), Math.max(0, b)).join('');
      r.tail.textContent = line(wx - 5, wx - 1); r.head.textContent = line(wx - 1, wx + 1);
      r.tear = Math.max(0, r.tear - dt);
      const tx = r.tear ? `translateX(${r.dx}px)` : 'none';
      r.back.style.transform = r.tail.style.transform = r.head.style.transform = tx;
      r.head.style.opacity = r.tail.style.opacity = lv >= 1 ? 1 : 0.5;
    }
    if (lv && Math.random() < dt / 1000 * 1.6 * lv) {
      const r = S.rows[(Math.random() * S.rows.length) | 0];
      r.tear = rnd(60, 130); r.dx = (Math.random() < 0.5 ? -1 : 1) * rnd(3, 8);
      const a = rnd(0, w * 0.5);
      Object.assign(S.tearLn.style, { top: r.back.style.top, left: f1(a) + 'px', width: f1(rnd(w * 0.25, w * 0.6)) + 'px' });
      S.tearLn.animate([{ opacity: 1 }, { opacity: 0 }], { duration: r.tear });
    }
    if (lv && Math.random() < dt / 1000 * 4 * lv) {
      const m = span(box, 'cfx-sc-pop'); m.textContent = glyph();
      Object.assign(m.style, { left: f1(rnd(2, w - 10)) + 'px', top: f1(rnd(-1, h - 13)) + 'px' });
      S.pops.push({ m, age: 0, life: rnd(420, 620), next: 0 });
    }
    S.pops = S.pops.filter((q) => {
      q.age += dt; const k = q.age / q.life;
      if (k >= 1) { q.m.remove(); return false; }
      if (k < 0.45 && q.age > q.next) { q.next = q.age + 55; q.m.textContent = glyph(); }
      q.m.style.transform = `scale(${f1(k < 0.2 ? 1.6 - k * 3 : 1)})`;
      q.m.style.opacity = k < 0.1 ? k * 10 : k > 0.7 ? (1 - k) / 0.3 : 1;
      q.m.classList.toggle('set', k >= 0.45);
      return true;
    });
  },
  // Thorns: a bramble runs along the chip's top and bottom edges and hooked thorns sprout from it in a ripple, springing
  // past their length and settling. Near thorns are large with a white sliver and a glint at the tip; far ones are small
  // and soft. They reach further as the cycle runs out and tremble in its last 1.5 s.
  thorn(el, box, S, dt, lv, p) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (S.bw !== w) {
      S.bw = w; S.svg?.remove(); S.svg = svgIn(box); S.t = 0;
      const n = Math.max(5, Math.round(w / 15)), ths = [];
      for (const top of [true, false]) for (let i = 0; i < n; i++) {
        const near = (i + (top ? 0 : 1)) % 2 === 0, L = h * (near ? rnd(0.42, 0.55) : rnd(0.24, 0.34)), b = near ? rnd(4.5, 6) : rnd(3, 4);
        ths.push({ top, near, x: (i + 0.5) * w / n + rnd(-3, 3), L, b, c: rnd(-0.3, 0.3) * L, e: 0, v: 0, ph: rnd(0, 6.3) });
      }
      const vine = (y, s) => { let d = `M0,${y}`; for (let x = 0; x <= w; x += 4) d += ` L${x},${f1(y + s * (0.7 + 0.7 * Math.sin(x / 6.5 + y)))}`; return d; };
      S.svg.innerHTML = `<g class="cfx-vine"><path class="halo" d="${vine(0, 1)}"/><path class="core" d="${vine(0, 1)}"/><path class="halo" d="${vine(h, -1)}"/><path class="core" d="${vine(h, -1)}"/></g>`
        + ths.map((q) => q.near ? `<g><path class="cfx-th-halo" d="${thornD(q.b, q.L, q.c)}"/><path class="cfx-th-body" d="${thornD(q.b, q.L, q.c)}"/><path class="cfx-th-core" d="${thornCore(q.b, q.L, q.c)}"/></g>` : `<g class="far"><path class="cfx-th-body" d="${thornD(q.b, q.L, q.c)}"/></g>`).join('');
      S.vine = S.svg.firstChild; S.ths = ths; [...S.svg.children].slice(1).forEach((g, i) => { ths[i].g = g; });
    }
    S.t += dt;
    const E = !lv ? 0 : lv < 1 ? 0.35 : 0.55 + 0.45 * p, s = dt / 1000;
    S.vine.style.opacity = lv ? (lv < 1 ? 0.4 : 0.8) : 0;
    for (const q of S.ths) {
      const goal = E * (0.62 + 0.38 * Math.sin(S.t / 1000 * 2.6 - q.x / w * 8 + q.ph * 0.3));
      q.v += (380 * (goal - q.e) - 15 * q.v) * s; q.e = Math.max(0, q.e + q.v * s);
      const rot = lv > 1.2 ? Math.sin(S.t / 16 + q.ph) * 3 : 0;
      q.g.setAttribute('transform', `translate(${f1(q.x)} ${q.top ? 0 : h}) rotate(${f1(rot)}) scale(1 ${(q.top ? 1 : -1) * Math.max(0.001, q.e).toFixed(3)})`);
      if (q.near && E > 0.7 && q.e > goal * 0.97 && Math.random() < s * 0.5) {
        const m = span(box, 'cfx-glint'); m.innerHTML = GLINT;
        Object.assign(m.style, { left: f1(q.x + q.c) + 'px', top: f1(q.top ? q.L * q.e : h - q.L * q.e) + 'px' });
        m.animate([{ transform: 'scale(0) rotate(0deg)', opacity: 0 }, { transform: 'scale(.8) rotate(30deg)', opacity: 1, offset: 0.35 }, { transform: 'scale(0) rotate(70deg)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => m.remove();
      }
    }
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
        if (lv || Object.keys(rec.st).length) THEMES[rec.th]?.(el, rec.box, rec.st, dt, lv, col === 0 ? p : 0);
      }
    },
  };
}

// The shared themes' strikes, each (r, to, bar): true, as each stands in for the ghost.
const STRIKE_FX = {
  // Heat: the chip flares, a fireball with a comet's tail arcs to your bar shedding embers, bursts with a ring along the
  // bar and a spray of embers, and flames run out along your bar from where it hit and die down.
  heat(r, to, bar) {
    const x0 = r.left + r.width * 0.5, y0 = r.top + r.height * 0.45, cx = (x0 + to.x) / 2 + (to.x > x0 ? -1 : 1) * 40, cy = Math.min(y0, to.y) - 55;
    const P = (u) => [(1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * to.x, (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * to.y];
    const IGN = 110, T = 500, bw = bar?.width ?? 120, bl = bar?.left ?? to.x - bw / 2, base = to.y, n = Math.max(10, Math.round(bw / 9)), ph = Array.from({ length: n + 2 }, () => rnd(0, 60)), hist = [];
    burst(x0, y0, r.height * 2.4, 0, 320);
    sparks(x0, r.top, 5, 10, 0, -Math.PI / 2, 1.6);
    let hit = false;
    stage(T + 820, (g, t) => {
      let html = '';
      if (t >= IGN && t < T) {
        const u = ((t - IGN) / (T - IGN)) ** 1.5, [x, y] = P(u);
        hist.push([x, y]); if (hist.length > 18) hist.shift();
        if (Math.random() < 0.8) ember(x + rnd(-3, 3), y + rnd(-3, 3), { vx: rnd(-25, 25), vy: -rnd(10, 40), life: rnd(300, 600) });
        const R = 6.5 * (1 + 0.14 * Math.sin(t / 21)), N = hist.length;
        let halo = '', body = '', core = '';
        hist.forEach(([hx, hy], j) => { const f = (j + 1) / N; halo += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(R * 1.25 * f)}"/>`; body += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(R * 0.8 * f)}"/>`; core += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(R * 0.38 * f ** 2)}"/>`; });
        html = `<g class="cfx-fb-halo">${halo}<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 1.8)}"/></g><g class="cfx-fb-body">${body}</g><g class="cfx-fb-core">${core}<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.55)}"/></g>`;
      }
      if (t >= T) {
        if (!hit) {
          hit = true; burst(to.x, to.y, 86, 0, 420);
          const ring = fspan('cfx-clamp', to.x - 30, to.y - 30, 60, 60); ring.style.borderWidth = '2px';
          ring.animate([{ transform: 'scale(.3, .1)', opacity: 1 }, { transform: 'scale(2.4, .7)', opacity: 0 }], { duration: 460, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => ring.remove();
          for (let i = 0; i < 20; i++) ember(to.x + rnd(-8, 8), to.y, { vx: rnd(-110, 110), vy: -rnd(70, 190), g: 420, life: rnd(500, 850) });
        }
        const k = (t - T) / 820, front = bw * 0.6 * clamp((t - T) / 200), decay = 1 - k ** 1.6, hs = [], hc = [], sw = [];
        for (let i = 0; i < n; i++) {
          const x = bl + (i + 0.5) * bw / n, d = Math.abs(x - to.x), f = 0.5 + 0.5 * noise(t / 1000 * 4 + ph[i]);
          const H = d > front ? 0 : 17 * decay * (1 - 0.6 * d / (bw * 0.6)) * (0.4 + 0.8 * f) * clamp((front - d) / 14);
          hs.push(H); hc.push(H * (0.3 + 0.25 * f)); sw.push(noise(t / 1000 * 2.5 + ph[i + 1]) * 2);
        }
        html += `<rect class="cfx-scorch" x="${f1(bl)}" y="${f1(base - 3)}" width="${f1(bw)}" height="6" style="opacity:${f1(0.8 * decay)}"/>` + FLAME(flameD(bl, bw, base, hs, sw), flameD(bl, bw, base, hc, sw));
        if (Math.random() < 0.5 * decay) ember(bl + rnd(0, bw), base - rnd(0, 8), { vy: -rnd(20, 45), life: rnd(400, 700) });
      }
      g.innerHTML = html;
    });
    return true;
  },
  // Crumble: cracks race through the chip and flash, it shatters into glowing shards that tumble onto your bar, bounce
  // and break into dust and grit; the bar cracks where they land, the fissures glowing and fading.
  crumble(r, to, bar) {
    const bw = bar?.width ?? 120, bl = bar?.left ?? to.x - bw / 2, by = to.y, CR = 130;
    const net = cracks(crackOrigins(r.left, r.top, r.width, r.height));
    const cols = Math.max(6, Math.round(r.width / 20)), xt = [], xb = [], shards = [];
    for (let i = 0; i <= cols; i++) { const x = r.left + i * r.width / cols, j = i && i < cols ? 1 : 0; xt.push(x + j * rnd(-7, 7)); xb.push(x + j * rnd(-7, 7)); }
    const at = (c, f) => [xt[c] + (xb[c] - xt[c]) * f, r.top + r.height * f];
    for (let c = 0; c < cols; c++) {
      const a1 = rnd(0.2, 0.45), b1 = rnd(0.2, 0.45), a2 = rnd(0.55, 0.8), b2 = rnd(0.55, 0.8), m = [at(c, (a1 + a2) / 2), at(c + 1, (b1 + b2) / 2)][Math.random() < 0.5 ? 0 : 1];
      const polys = [[at(c, 0), at(c + 1, 0), at(c + 1, b1), at(c, a1)], [at(c, a1), at(c + 1, b1), at(c + 1, b2), at(c, a2)], [at(c, a2), at(c + 1, b2), at(c + 1, 1), at(c, 1)]];
      polys[1] = Math.random() < 0.5 ? [at(c, a1), at(c + 1, b1), at(c + 1, b2), at(c, a2)] : [at(c, a1), at(c + 1, b1), m, at(c + 1, b2), at(c, a2)];
      const cut = [];
      for (const q of polys) if (q.length === 4 && Math.random() < 0.5) { const d = Math.random() < 0.5; cut.push(d ? [q[0], q[1], q[2]] : [q[0], q[1], q[3]], d ? [q[0], q[2], q[3]] : [q[1], q[2], q[3]]); } else cut.push(q);
      for (const poly of cut) {
        const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length, cy = poly.reduce((a, q) => a + q[1], 0) / poly.length;
        const x1 = bl + bw * (0.1 + 0.8 * (cx - r.left) / r.width) + rnd(-6, 6), T = rnd(0.4, 0.52), G = 1500;
        shards.push({ P: pts(poly.map(([x, y]) => [x - cx, y - cy])), x: cx, y: cy, x0: cx, y0: cy, vx: (x1 - cx) / T, vy: (by - cy - 0.5 * G * T * T) / T, G, T, x1, rot: 0, vr: rnd(-480, 480), phi: rnd(0, 6.3), vphi: rnd(8, 18) * (Math.random() < 0.5 ? -1 : 1), land: 0 });
      }
    }
    let barNet = null, tl = 0;
    setTimeout(() => { burst(r.left + r.width / 2, r.top + r.height / 2, r.width * 0.7, 0, 300); for (let i = 0; i < 14; i++) ember(r.left + rnd(0, r.width), r.top + rnd(0, r.height), { vx: rnd(-60, 60), vy: -rnd(20, 90), g: 300, life: rnd(300, 600) }); }, CR);
    stage(CR + 520 + 520, (g, t) => {
      let html = '';
      if (t < CR + 60) html += `<g style="opacity:${f1(t < CR ? 1 : 1 - (t - CR) / 60)}">${net.map((sg) => CRACK(sg, clamp((t / CR * 1.2 - sg.s) / sg.p), 1.2)).join('')}</g>`;
      if (t >= CR) {
        const tt = (t - CR) / 1000;
        for (const q of shards) {
          if (!q.land && tt >= q.T) {
            q.land = t; q.x = q.x1; q.y = by;
            for (let i = 0; i < 3; i++) { const d = fspan('cfx-grit', q.x, by, 2, 2); d.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${rnd(-14, 14)}px, ${rnd(-16, -2)}px)`, opacity: 0 }], { duration: rnd(300, 480), easing: 'ease-out' }).onfinish = () => d.remove(); }
            const pf = fspan('cfx-puff', q.x - 8, by - 10, 16, 16); pf.animate([{ transform: 'scale(.4)', opacity: 0.7 }, { transform: 'translateY(-6px) scale(1.7)', opacity: 0 }], { duration: rnd(450, 650), easing: 'ease-out' }).onfinish = () => pf.remove();
            if (!barNet) { tl = t; barNet = cracks(Array.from({ length: 4 }, (_, i) => [to.x + rnd(-bw * 0.3, bw * 0.3), by + rnd(-1, 1), (i % 2 ? 0 : Math.PI) + rnd(-0.2, 0.2), rnd(24, 50), 1])); }
          }
          let o = 1, s = 1 - 0.2 * Math.min(1, tt / q.T);
          if (!q.land) { const u = tt; q.x = q.x0 + q.vx * u; q.y = q.y0 + q.vy * u + 0.5 * q.G * u * u; q.rot = q.vr * u; }
          else { const a = (t - q.land) / 1000; q.y = by - 7 * Math.sin(Math.PI * Math.min(1, a / 0.14)); q.x = q.x1 + q.vx * 0.04 * Math.min(a, 0.14); q.rot += q.vr * 0.3 / 60; o = clamp(1 - (a - 0.08) / 0.24); s *= 1 - 0.3 * clamp(a / 0.3); }
          const c = Math.cos(q.phi + q.vphi * Math.min(tt, q.T + 0.1)), sx = Math.max(0.12, Math.abs(c));
          if (o > 0) html += `<g class="${Math.abs(c) < 0.35 ? 'glint' : ''}" transform="translate(${f1(q.x)} ${f1(q.y)}) rotate(${q.rot | 0}) scale(${(s * sx).toFixed(2)} ${s.toFixed(2)})" style="opacity:${o.toFixed(2)}"><polygon class="cfx-sh-halo" points="${q.P}"/><polygon class="cfx-sh-body" points="${q.P}"/></g>`;
        }
      }
      if (barNet) { const a = t - tl; html = `<g style="opacity:${f1(clamp(1 - (a - 160) / 420))}">${barNet.map((sg) => CRACK(sg, clamp((a / 150 - sg.s) / sg.p))).join('')}</g>` + html; }
      g.innerHTML = html;
    });
    return true;
  },
  // Scramble: a decoding wave flashes across the chip, its glyphs swarm out on curving paths with ghosts trailing, and
  // settle in a band over your bar, churning; a wave decodes the band into blocks, it tears sideways, and falls apart.
  scramble(r, to, bar) {
    const bw = bar?.width ?? 120, bl = bar?.left ?? to.x - bw / 2, by = to.y + 4, N = Math.max(10, Math.min(24, Math.floor(bw / 9)));
    const ag = Array.from({ length: N }, (_, i) => {
      const x0 = r.left + rnd(4, r.width - 8), y0 = r.top + rnd(6, r.height - 2), sx = bl + (i + 0.5) * bw / N - 3.5;
      return { p: [[x0, y0], [x0 + rnd(-50, 50), y0 - rnd(10, 40)], [sx + rnd(-40, 40), by - rnd(30, 60)], [sx, by]], d: 60 + rnd(0, 140), ch: glyph(), next: 0, sx };
    });
    const B = (q, u) => { const [a, b, c, d] = q.p, v = 1 - u; return [v ** 3 * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u ** 3 * d[0], v ** 3 * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u ** 3 * d[1]]; };
    const F = 380, TW = 660, ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) ** 2), runs = [[0, N / 3 | 0, rnd(-6, -3)], [N / 3 | 0, 2 * N / 3 | 0, rnd(3, 6)], [2 * N / 3 | 0, N, rnd(-5, -2)]];
    stage(TW + 700, (g, t) => {
      let html = '';
      if (t < 160) { const x = r.left + r.width * (t / 160); html += `<rect class="cfx-sc-flash" x="${f1(x - 10)}" y="${f1(r.top)}" width="14" height="${f1(r.height)}"/>`; }
      const front = bl + (t - TW) / 230 * bw, tear = t > TW + 300 && t < TW + 440 && (t / 35 | 0) % 2 === 0;
      for (const [i, q] of ag.entries()) {
        const k = (t - q.d) / F;
        if (k < 0) continue;
        if (t > q.next) { q.next = t + 45; if (q.sx + 4 > front || t < TW) q.ch = glyph(); }
        if (k < 1) {
          for (const [lag, cls] of [[0.12, 'cfx-sc-g2'], [0.06, 'cfx-sc-g1']]) { const [x, y] = B(q, ease(clamp(k - lag))); html += `<text class="${cls}" x="${f1(x)}" y="${f1(y)}">${q.ch}</text>`; }
          const [x, y] = B(q, ease(k));
          html += `<text class="cfx-sc-halo" x="${f1(x)}" y="${f1(y)}">${q.ch}</text><text class="cfx-sc-core" x="${f1(x)}" y="${f1(y)}">${q.ch}</text>`;
        } else {
          const done = q.sx + 4 <= front, run = runs.find(([a, b]) => i >= a && i < b), dx = tear ? run[2] : 0, fall = clamp((t - TW - 440) / 220), y = by + fall * 5;
          if (fall >= 1) continue;
          const lit = done && q.sx + 4 > front - 18, ch = done ? '▓' : q.ch, o = f1(1 - fall);
          html += `<text class="cfx-sc-halo" x="${f1(q.sx + dx)}" y="${f1(y)}" style="opacity:${o}">${ch}</text><text class="${lit || !done ? 'cfx-sc-core' : 'cfx-sc-set'}" x="${f1(q.sx + dx)}" y="${f1(y)}" style="opacity:${o}">${ch}</text>`;
          if (fall > 0 && Math.random() < 0.04) ember(q.sx + 3, y - 4, { vx: rnd(-8, 8), vy: rnd(5, 25), life: 400, near: false });
        }
      }
      if (t > TW && t < TW + 260) html += `<rect class="cfx-sc-flash" x="${f1(front - 6)}" y="${f1(by - 12)}" width="8" height="16"/>`;
      if (tear) for (const [a, b] of runs) html += `<rect class="cfx-sc-tearln" x="${f1(bl + a * bw / N)}" y="${f1(by - 11)}" width="${f1((b - a) * bw / N)}" height="1"/>`;
      g.innerHTML = html;
    });
    return true;
  },
  // Thorns: a volley of hooked thorns leaves the chip's edges with motion streaks, drives into your bar tip first and
  // sticks, quivering, a spray of sparks at each hit; then they fade where they stand.
  thorn(r, to, bar) {
    const bw = bar?.width ?? 120, bl = bar?.left ?? to.x - bw / 2, by = to.y, n = 9, FL = 210, HOLD = 320;
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    const th = order.map((j, i) => {
      const top = Math.random() < 0.5, x0 = r.left + rnd(8, r.width - 8), y0 = top ? r.top : r.top + r.height, x1 = bl + bw * (0.1 + 0.8 * j / (n - 1)) + rnd(-5, 5);
      const mx = (x0 + x1) / 2, my = (y0 + by) / 2, dx = x1 - x0, dy = by - y0, L = Math.hypot(dx, dy) || 1, bend = rnd(-40, 40);
      return { d: i * 34, a: [x0, y0], c: [mx - dy / L * bend, my + dx / L * bend], b: [x1, by], h: [], b0: rnd(8, 10), L: rnd(24, 30), cu: rnd(-5, 5), hit: 0 };
    });
    const Q = (q, u) => { const v = 1 - u; return [v * v * q.a[0] + 2 * v * u * q.c[0] + u * u * q.b[0], v * v * q.a[1] + 2 * v * u * q.c[1] + u * u * q.b[1]]; };
    th.forEach((q) => setTimeout(() => { burst(q.a[0], q.a[1], 24, 0, 240); sparks(q.a[0], q.a[1], 3, 8); }, q.d));
    stage(n * 34 + FL + HOLD + 280, (g, t) => {
      let html = '';
      for (const q of th) {
        const k = (t - q.d) / FL;
        if (k < 0) continue;
        let tip, ang, o = 1, s = 1;
        if (k < 1) {
          const u = k * k, p = Q(q, u), p2 = Q(q, Math.min(1, u + 0.02));
          tip = p; ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
          q.h.push(p); if (q.h.length > 10) q.h.shift();
          html += `<polygon class="cfx-th-streak" points="${ribbon(q.h, q.b0 * 1.2)}"/><polygon class="cfx-th-streakc" points="${ribbon(q.h, q.b0 * 0.35)}"/>`;
          q.ang = ang;
        } else {
          if (!q.hit) { q.hit = t; burst(q.b[0], q.b[1], 34, 0, 280); sparks(q.b[0], q.b[1], 7, 15, 0, q.ang + Math.PI, 2.6); }
          const a = t - q.hit, sink = Math.min(1, a / 40) * 3;
          tip = [q.b[0] + Math.cos(q.ang) * sink, q.b[1] + Math.sin(q.ang) * sink];
          ang = q.ang + (9 * Math.exp(-a / 110) * Math.cos(a / 15)) * Math.PI / 180;
          o = clamp(1 - (a - HOLD) / 220); s = 1 - 0.35 * clamp((a - HOLD) / 220);
          if (o <= 0) continue;
        }
        const deg = f1(ang * 180 / Math.PI - 90);
        html += `<g transform="translate(${f1(tip[0])} ${f1(tip[1])}) rotate(${deg}) scale(${s.toFixed(2)}) translate(${f1(-q.cu)} ${f1(-q.L)})" style="opacity:${o.toFixed(2)}"><path class="cfx-th-halo" d="${thornD(q.b0, q.L, q.cu)}"/><path class="cfx-th-body" d="${thornD(q.b0, q.L, q.cu)}"/><path class="cfx-th-core" d="${thornCore(q.b0, q.L, q.cu)}"/></g>`;
      }
      g.innerHTML = html;
    });
    return true;
  },
};

// The themes with a strike of their own: the lash (lash.mjs) stays out of their hits, so the eye stays on the chip.
export const STRIKES = new Set(['zap', 'lock', 'frost', 'cipher', 'ring', 'erase', 'heat', 'crumble', 'scramble', 'thorn']);
// A themed chip going off (app.js fire): its strike, in screen px, from the chip's rect r to your bar at `to`, in the
// threat's red. Pulse Node: a forked bolt that strobes into your bar, a burst and sparks there. Encryptor: its padlocks
// arc to your bar with short trails and clamp on. Cold Store: its frost shatters (the chip's ghost still flies).
// Cipher Block: hex streams fly into your bar, head first, and scatter there. C2 Node: a beam flashes from its icon to
// your bar, brackets lock on and the bar flashes. Eraser: the chip's pixels fly off in wipe order and a
// dither sweeps your bar under an edge. `bar` is your bar's rect. True when the strike stands in for the ghost.
export function chipStrike(th, r, to, bar) {
  if (!document.getElementById('cfx-defs')) document.body.insertAdjacentHTML('beforeend', DEFS);
  if (STRIKE_FX[th]) return STRIKE_FX[th](r, to, bar);
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
    const cx = r.left + 14, cy = r.top + r.height / 2, bx = bar?.left ?? to.x - 60, by = bar?.top ?? to.y - 4, bw = bar?.width ?? 120, bh = bar?.height ?? 8;
    const g = document.createElementNS(NS, 'svg'); g.setAttribute('class', 'cfx-fly cfx-bolt'); document.body.appendChild(g);
    const ln = (c) => `<line class="${c}" x1="${cx}" y1="${cy}" x2="${to.x}" y2="${to.y}"/>`;
    g.innerHTML = `<g class="cfx-arc">${ln('halo')}${ln('mid')}${ln('core')}</g>`;
    g.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.9, offset: 0.6 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' }).onfinish = () => g.remove();
    const ping = fly('cfx-clamp', cx - 11, cy - 11, 22, 22); ping.style.borderWidth = '2.5px';
    ping.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 420, easing: 'ease-out' }).onfinish = () => ping.remove();
    const hx = bw / 2 + 4, hy = bh / 2 + 4;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = fly('cfx-bracket', 0, 0, 12, 12);
      m.style[sx < 0 ? 'borderLeftWidth' : 'borderRightWidth'] = '2.5px'; m.style[sy < 0 ? 'borderTopWidth' : 'borderBottomWidth'] = '2.5px';
      const P = (ax, ay) => `translate(${to.x + sx * ax - (sx < 0 ? 0 : 12)}px, ${to.y + sy * ay - (sy < 0 ? 0 : 12)}px)`;
      m.animate([{ transform: P(hx + 70, hy + 26), opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: P(hx, hy), opacity: 1, offset: 0.8 }, { transform: P(hx, hy), opacity: 0 }], { duration: 520, delay: 200, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' }).onfinish = () => m.remove();
    }
    const f = fly('cfx-flash', bx, by, bw, bh);
    f.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.2 }, { opacity: 0 }], { duration: 320, delay: 640, fill: 'both' }).onfinish = () => f.remove();
    const b = fly('cfx-burst', to.x - 28, to.y - 28, 56, 56);
    b.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 380, delay: 640, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }).onfinish = () => b.remove();
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
