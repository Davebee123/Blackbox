// Presentation only: each virus is a cloud of points tagged by part, projected
// as terminal glyphs. Parts light up when hit, turn red when their attack lands
// this cycle, and scatter away when broken. Reads state; never changes it.

const COLORS = { amber: '#f1b92f', bright: '#fff2c8', hot: '#ff5b3d', dim: '#7e5311', gold: '#ffd85c' };

export function createArt({ getState, canMove, getSelected, getNowSources }) {
  let canvas = null;
  let ctx = null;
  let previous = 0;
  let angle = 0;
  let builtFor = '';
  let points = [];
  const hits = new Map();
  let shake = null;

  const add = (x, y, z, region) => points.push({ x, y, z, region });
  function orb(cx, cy, cz, rx, ry, rz, region, step = 0.21) {
    for (let a = 0; a < Math.PI * 2; a += step) for (let b = 0.15; b < Math.PI; b += step + 0.02) add(cx + rx * Math.cos(a) * Math.sin(b), cy + ry * Math.cos(b), cz + rz * Math.sin(a) * Math.sin(b), region);
  }
  function limb(from, to, region) {
    for (let t = 0; t <= 1; t += 0.035) {
      const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t, z = from[2] + (to[2] - from[2]) * t;
      add(x, y, z, region);
      add(x + 2, y + 2, z, region);
    }
  }

  // Special parts use `id@L` / `id@R` so a Redundant pair maps to each side.
  function build(v) {
    points = [];
    const special = (side) => {
      const base = v.parts.find((p) => p.special)?.id.replace(/[ab]$/, '');
      return `${base}@${side < 0 ? 'L' : 'R'}`;
    };
    const shape = v.art || v.family;
    if (shape === 'ransomware') {
      orb(0, 0, 0, 43, 32, 29, 'shell');
      orb(0, -4, -29, 19, 17, 10, 'pulse');
      orb(0, 22, -15, 12, 10, 10, 'injector');
      for (const side of [-1, 1]) {
        for (const y of [-12, 8, 24]) {
          limb([side * 30, y, 0], [side * 65, y - 12, 9], 'shell');
          limb([side * 65, y - 12, 9], [side * 78, y + 26, 0], 'shell');
        }
        limb([side * 35, -12, 0], [side * 62, -48, -5], special(side));
        limb([side * 62, -48, -5], [side * 83, -36, -8], special(side));
        limb([side * 62, -48, -5], [side * 64, -25, -8], special(side));
      }
    } else if (shape === 'watchdog') {
      // A squat hound: firewall collar ring, sentry eye, tracker legs.
      for (let a = 0; a < Math.PI * 2; a += 0.12) for (const r of [48, 52]) add(Math.cos(a) * r, Math.sin(a) * 14 - 10, Math.sin(a) * r * 0.5, 'firewall');
      orb(0, -10, 0, 30, 22, 20, 'firewall', 0.34);
      orb(0, -28, -24, 14, 12, 8, 'sentry');
      orb(0, -28, -32, 5, 5, 3, 'sentry', 0.5);
      for (const side of [-1, 1]) {
        limb([side * 20, 6, 10], [side * 34, 40, 18], 'tracker@' + (side < 0 ? 'L' : 'R'));
        limb([side * 20, 6, -10], [side * 30, 40, -22], 'tracker@' + (side < 0 ? 'L' : 'R'));
      }
      limb([0, -6, 22], [0, -30, 46], 'sentry');
    } else if (shape === 'worm') {
      for (let i = 0; i < 8; i++) {
        const x = -52 + i * 14, y = Math.sin(i * 0.7) * 24, z = Math.cos(i * 0.65) * 12;
        orb(x, y, z, 13 - i * 0.6, 11 - i * 0.4, 12 - i * 0.4, i < 4 ? 'pulse' : special(i % 2 ? -1 : 1));
        if (i > 0 && i < 7) orb(x, y, z, 18 - i * 0.6, 16 - i * 0.4, 17 - i * 0.4, 'shell', 0.42);
      }
      for (const side of [-1, 1]) {
        limb([-58, -2, 0], [-80, -23, side * 18], 'pulse');
        limb([44, -10, 0], [75, -35, side * 16], special(side));
      }
      // Fragment slots orbit the body.
      orb(-20, 52, 20, 8, 7, 7, 'frag1', 0.45);
      orb(30, 55, -10, 8, 7, 7, 'frag2', 0.45);
      orb(75, 30, 10, 8, 7, 7, 'frag3', 0.45);
    } else {
      orb(0, -27, 0, 33, 42, 20, 'mask');
      orb(0, -28, -20, 14, 20, 8, 'pulse');
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const x = side * (12 + i * 10);
          limb([side * 10, 5, 0], [x, 37 + i * 3, i * 3], special(side));
          limb([x, 37 + i * 3, i * 3], [x + side * 19, 59 - i * 3, -8], special(side));
        }
      }
    }
  }

  // The body (shell, mask, collar) isn't a part any more: it shows the virus's armor,
  // bright while chits remain and dim once they're stripped.
  const BODY = ['shell', 'mask', 'firewall'];
  function body(v) {
    const max = v.parts.reduce((n, p) => n + (p.maxArmor || 0), 0);
    const left = v.parts.reduce((n, p) => n + (p.integrity > 0 ? p.armor || 0 : 0), 0);
    return { id: 'body', integrity: max ? Math.max(0.2, left) : 1, max: max || 1 };
  }
  function resolvePart(v, region) {
    if (BODY.includes(region)) return body(v);
    if (!region.includes('@')) {
      if (region.startsWith('frag')) {
        // Fragment slots show whichever living fragments exist, in order.
        const living = v.parts.filter((p) => p.kind === 'fragment' && p.integrity > 0);
        return living[Number(region.slice(4)) - 1] || { integrity: 0, max: 1, ghost: true };
      }
      return v.parts.find((p) => p.id === region);
    }
    const [base, side] = region.split('@');
    return v.parts.find((p) => p.id === base) || v.parts.find((p) => p.id === base + (side === 'L' ? 'a' : 'b'));
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (!canvas?.isConnected || now - previous < 40) return;
    const delta = Math.min(100, now - previous);
    previous = now;
    const s = getState();
    const v = s?.encounter?.virus;
    if (!v) return;
    const key = v.id + v.parts.length;
    if (key !== builtFor) { builtFor = key; build(v); }
    const moving = canMove() && s.encounter.phase === 'active' && !s.encounter.paused;
    if (moving) angle += delta * 0.00013;

    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const yaw = Math.sin(angle) * 0.75, cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (const [id, h] of hits) if (now - h.time > 800) hits.delete(id);
    // A crit or an attack landing shakes the whole picture for a moment.
    const quake = canMove() && shake && now - shake.time < 350 ? (1 - (now - shake.time) / 350) ** 2 * shake.power : 0;
    const qx = quake ? (Math.random() - 0.5) * quake : 0, qy = quake ? (Math.random() - 0.5) * quake : 0;
    const selected = getSelected();
    const nowSources = getNowSources();
    const projected = points
      .map((p, i) => { const z2 = -p.x * sy + p.z * cy, k = 280 / (280 + z2); return { ...p, i, z2, x2: (p.x * cy + p.z * sy) * k, y2: p.y * k }; })
      .sort((a, b) => b.z2 - a.z2);
    const xs = projected.map((p) => p.x2), ys = projected.map((p) => p.y2);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const scale = Math.min((width * 0.9) / (right - left), (height * 0.86) / (bottom - top));
    const midX = (left + right) / 2, midY = (top + bottom) / 2;
    const glyph = Math.max(8, Math.min(13, width / 42)), gx = glyph * 0.7, gy = glyph * 0.9;
    ctx.font = `500 ${glyph}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    const grid = new Set();
    for (const p of projected) {
      const part = resolvePart(v, p.region);
      if (!part) continue;
      const h = part.id ? hits.get(part.id) : null;
      const broken = part.integrity === 0;
      if (broken && (!h || !canMove())) continue;
      const age = h ? (now - h.time) / 800 : 0;
      const scatter = broken ? age * 22 : 0;
      // A hit jolts the part (harder on a crit); an attack lunges it toward you (down the screen).
      const fresh = h && !broken && canMove() ? (1 - age) ** 2 : 0;
      const jolt = fresh * (h?.kind === 'crit' ? 14 : h?.kind === 'attack' ? 0 : h?.kind === 'chit' ? 5 : 8);
      const lunge = h?.kind === 'attack' ? fresh * 16 : 0;
      const x = Math.round((width / 2 + qx + (p.x2 - midX) * scale * (1 + lunge / 200) + Math.sin(p.i) * scatter + Math.sin(p.i * 7.3) * jolt) / gx) * gx;
      const y = Math.round((height / 2 + qy + (p.y2 - midY) * scale * (1 + lunge / 200) + lunge + Math.cos(p.i) * scatter + Math.cos(p.i * 3.1) * jolt) / gy) * gy;
      const cell = x + ',' + y;
      if (grid.has(cell)) continue;
      grid.add(cell);
      const ratio = part.integrity / part.max;
      const depth = 0.5 + Math.max(0, (50 - p.z2) / 90) * 0.6;
      const faded = selected && part.id !== selected ? 0.55 : 1;
      ctx.globalAlpha = Math.min(1, depth * faded * (broken ? 1 - age : 1));
      const flare = h && !broken ? (h.kind === 'attack' ? COLORS.hot : h.kind === 'crit' ? COLORS.gold : COLORS.bright) : null;
      ctx.fillStyle = flare || (nowSources.has(part.id) ? COLORS.hot : part.id === selected ? COLORS.gold : ratio < 0.4 ? COLORS.dim : COLORS.amber);
      // A broken armor chit throws sparks off the part; a crit burns its glyphs white-hot.
      const spark = h?.kind === 'chit' && fresh > 0.3 && p.i % 6 === 0;
      ctx.fillText(spark ? '*' : h?.kind === 'crit' && fresh > 0.5 && p.i % 3 === 0 ? '#' : ratio < 0.4 ? '.' : p.z2 < 0 ? (p.i % 2 ? '1' : '0') : ':', x, y);
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(draw);

  return {
    attach(el) { if (canvas !== el) { canvas = el; ctx = el.getContext('2d'); } },
    // kind: 'hit' (you hit it), 'crit', 'chit' (an armor chit broke), 'attack' (its attack landed on you), 'break'.
    hit(id, kind = 'hit') {
      hits.set(id, { time: performance.now(), kind });
      if (kind === 'crit' || kind === 'attack' || kind === 'break') shake = { time: performance.now(), power: kind === 'attack' ? 9 : kind === 'break' ? 12 : 7 };
    },
  };
}
