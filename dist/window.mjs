// The window behind the monitor. With the casing on, the strips of wall either side of the screen
// look out through grimy glass onto the slum outside: stacked towers, lit windows, vertical neon,
// a spinner drifting past. The weather turns over every few minutes (clear, fog, drizzle, rain,
// storm) and fades between states; storms bring lightning (and thunder, through `onThunder`).
//
// It's scenery, so it stays dark and slow: about 20 frames a second, drawn only inside the two
// strips you can see. Motion off: one still frame. The weather is picked from the clock, so a
// reload doesn't reroll it.
export const WEATHER = {
  clear: { rain: 0, fog: 0.12, storm: 0, wind: 0.05 },
  fog: { rain: 0, fog: 0.75, storm: 0, wind: 0 },
  drizzle: { rain: 0.28, fog: 0.3, storm: 0, wind: 0.1 },
  rain: { rain: 0.7, fog: 0.35, storm: 0, wind: 0.22 },
  storm: { rain: 1, fog: 0.4, storm: 1, wind: 0.45 },
};
const ODDS = [['rain', 30], ['drizzle', 22], ['storm', 16], ['fog', 16], ['clear', 16]];
export const SPELL_MS = 5 * 60000; // how long a spell of weather lasts
const BLEND_S = 40; // seconds to fade from one to the next
const NEON = ['#ff2d6f', '#29e0d0', '#f1b92f', '#b36bff'];

// Deterministic randomness: the city is the same city every time you load.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function weatherAt(ms) {
  const r = seeded(Math.floor(ms / SPELL_MS) * 7919 + 13)();
  let n = r * ODDS.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of ODDS) { if ((n -= w) < 0) return k; }
  return 'rain';
}

export function createWindow({ canMove, onThunder = () => {}, onWeather = () => {} }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'window-out';
  canvas.setAttribute('aria-hidden', 'true');
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, mon = null, strips = [], views = [], desk = 0, sky = null, clouds = null, drift = 0, band = 0, city = null, glass = null, signs = [];
  let on = false, last = 0, raf = 0, override = null;
  let wx = { ...WEATHER[weatherAt(Date.now())] }, name = weatherAt(Date.now());
  let beacons = [], drops = [], beads = [], flash = 0, nextBolt = 4, car = null, nextCar = 6;

  const layer = () => { const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };

  // What shows around the monitor's outer ring: the window left, right and above it, and the
  // desk it stands on below. `strips` are the sides (where the close-up city goes); `views` is
  // every patch of window.
  function measure() {
    const app = document.querySelector('.app')?.getBoundingClientRect();
    strips = []; views = [];
    if (!app) return;
    desk = parseFloat(getComputedStyle(document.body).getPropertyValue('--desk')) || 0;
    const ring = 26, low = H - desk;
    mon = { x: app.left - 18, y: app.top - 14, w: app.width + 36, h: low - 8 - (app.top - 14) }; // the monitor's outer shell
    const L = Math.max(0, app.left - ring), R = Math.max(0, W - app.right - ring), top = Math.max(0, app.top - 22);
    if (L > 8) strips.push({ x: 0, y: 0, w: L, h: low });
    if (R > 8) strips.push({ x: W - R, y: 0, w: R, h: low });
    band = top > 6 ? top : 0;
    // where rain and drops are worth drawing: everywhere the monitor doesn't cover
    views = [{ x: 0, y: 0, w: Math.max(0, app.left - 10), h: low }, { x: app.right + 10, y: 0, w: Math.max(0, W - app.right - 10), h: low }, { x: app.left - 10, y: 0, w: app.width + 20, h: Math.max(0, app.top - 6) }].filter((v) => v.w > 4 && v.h > 4);
  }

  function build() {
    W = innerWidth; H = innerHeight; dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
    const r = seeded(4242);
    // Sky: black at the top, smog glowing brown-amber over the streets.
    let x;
    [sky, x] = layer();
    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1c1319'); grad.addColorStop(0.07, '#150e14'); grad.addColorStop(0.4, '#140d15'); grad.addColorStop(0.7, '#3a2016'); grad.addColorStop(0.86, '#1a100c'); grad.addColorStop(1, '#0a0706');
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
    // Smog clouds: a strip twice the screen wide that drifts past, dark on top, lit amber from below.
    clouds = document.createElement('canvas');
    const ch = Math.max(120, H * 0.3), cw = W * 2;
    clouds.width = Math.round(cw * dpr); clouds.height = Math.round(ch * dpr);
    const cx = clouds.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < cw / 9; i++) {
      const bx = r() * cw, by = r() * ch * 0.8, rad = 30 + r() * 90;
      const lit = by / ch; // lower clouds catch more of the city's glow
      const gr = cx.createRadialGradient(bx, by + rad * 0.3, 0, bx, by, rad);
      gr.addColorStop(0, `rgba(${90 + lit * 70},${50 + lit * 30},${38},${0.14 + lit * 0.1})`); gr.addColorStop(0.6, `rgba(40,26,26,0.08)`); gr.addColorStop(1, 'rgba(20,14,16,0)');
      cx.fillStyle = gr; cx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
      // wrap the seam so the loop is invisible
      if (bx < rad) { cx.save(); cx.translate(cw, 0); cx.fillRect(bx - rad, by - rad, rad * 2, rad * 2); cx.restore(); }
      if (bx > cw - rad) { cx.save(); cx.translate(-cw, 0); cx.fillRect(bx - rad, by - rad, rad * 2, rad * 2); cx.restore(); }
    }
    // The city: three layers of towers, darker and taller as they come closer.
    [city, x] = layer();
    const tower = (x0, w, top, col, lit, win) => {
      x.fillStyle = col; x.fillRect(x0, top, w, H - top);
      if (r() < 0.5) { x.fillRect(x0 + w * 0.3, top - 6 - r() * 18, 1.5, 10 + r() * 16); } // antenna
      if (r() < 0.3) { x.fillRect(x0 + w * 0.15, top - 7, w * 0.3, 7); } // water tank / plant
      for (let y = top + win; y < H - win; y += win * 2) for (let c = x0 + win * 0.6; c < x0 + w - win; c += win * 1.7) {
        if (r() > lit) continue;
        const hue = r();
        x.fillStyle = hue < 0.72 ? `rgba(241,170,70,${0.18 + r() * 0.35})` : hue < 0.9 ? `rgba(90,220,210,${0.15 + r() * 0.25})` : `rgba(255,70,130,${0.15 + r() * 0.25})`;
        x.fillRect(c, y, win * 0.8, win * 0.7);
      }
    };
    // Megatowers far off: thin, dark, far taller than the rest, their tops showing above the
    // monitor, each with a red beacon blinking at its own pace.
    beacons = [];
    for (let at = W * (0.05 + r() * 0.08); at < W; at += W * (0.1 + r() * 0.12)) {
      const w = 12 + r() * 18, top = band ? band * (0.7 + r() * 0.45) + 6 : H * (0.04 + r() * 0.1); // in the top band only the crowns and masts show
      x.fillStyle = '#040305'; x.fillRect(at, top, w, H - top);
      x.fillRect(at + w * 0.2, top - 4, w * 0.6, 4); x.fillRect(at + w * 0.45, top - 14 - r() * 10, 1.5, 16 + r() * 10); // crown, mast
      for (let y = top + 6; y < H; y += 5) if (r() < 0.3) { x.fillStyle = `rgba(241,170,70,${0.15 + r() * 0.25})`; x.fillRect(at + 2 + r() * (w - 5), y, 2, 1.5); }
      x.fillStyle = 'rgba(255,200,160,0.09)'; x.fillRect(at, top, 1, H - top); // one edge catching the glow
      beacons.push({ x: at + w * 0.45, y: top - 15, rate: 900 + r() * 900, phase: r() * 2000 });
    }
    for (let at = -20; at < W; at += 14 + r() * 40) tower(at, 20 + r() * 50, H * (0.3 + r() * 0.25), '#0c0a0e', 0.05, 2);
    for (let at = -30; at < W; at += 24 + r() * 50) tower(at, 30 + r() * 60, H * (0.22 + r() * 0.35), '#08070a', 0.1, 3);
    // Up close, in each strip: a tower face right against the glass, with a fire escape and signs.
    signs = [];
    for (const s of strips) {
      // on the far side of the strip from the monitor, so sky and skyline show beside the screen
      const w = s.w * (0.4 + r() * 0.12), top = H * (0.34 + r() * 0.12);
      const near = s.x === 0 ? s.x + s.w * 0.08 : s.x + s.w * 0.92 - w;
      tower(near, w, top, '#050406', 0.18, 4);
      // fire escape: landings and zig-zag stairs down one side
      x.strokeStyle = 'rgba(30,26,30,0.95)'; x.lineWidth = 1;
      const fx = near + (r() < 0.5 ? 2 : w - 14);
      for (let y = top + 40; y < H - 20; y += 46) {
        x.beginPath(); x.moveTo(fx - 3, y); x.lineTo(fx + 15, y); x.moveTo(fx - 3, y - 8); x.lineTo(fx + 15, y - 8);
        x.moveTo(fx, y); x.lineTo(fx + 12, y + 46); x.stroke();
      }
      // AC units and pipes
      x.fillStyle = '#0b0a0c';
      for (let i = 0; i < 5; i++) x.fillRect(near + r() * (w - 10), top + 30 + r() * (H - top - 60), 8 + r() * 5, 6 + r() * 3);
      x.fillRect(near + w * (0.2 + r() * 0.6), top, 2, H - top);
      // Signs: vertical neon, one or two per strip.
      const n = 1 + (r() < 0.6 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const sw = Math.min(16, Math.max(9, s.w * 0.13)), sh = 70 + r() * 110;
        const sx = s.x + (i ? s.w * 0.62 : s.w * 0.2) + r() * s.w * 0.12, sy = H * (0.25 + r() * 0.4);
        signs.push(sign(sx, sy, sw, sh, NEON[Math.floor(r() * NEON.length)], r));
      }
      // One wide sign low down, half behind the next building.
      if (r() < 0.7) signs.push(sign(s.x + r() * s.w * 0.4, H * (0.78 + r() * 0.08), 40 + r() * 30, 12, NEON[Math.floor(r() * NEON.length)], r, true));
    }
    // Glass, frame and blinds on top of everything.
    [glass, x] = layer();
    // Blinds pulled all the way up: a tight stack of slats under the headrail, cords hanging down.
    x.fillStyle = '#0d0b0a'; x.fillRect(0, 0, W, 4); // headrail
    for (let y = 4; y < 9; y += 2) { x.fillStyle = '#17140f'; x.fillRect(0, y, W, 1.5); x.fillStyle = 'rgba(255,220,170,0.05)'; x.fillRect(0, y, W, 0.5); }
    x.fillStyle = '#1b1712'; x.fillRect(0, 9, W, 2); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 11, W, 1); // bottom rail and its shadow
    const bh = 11;
    for (let cx2 = W * 0.18; cx2 < W; cx2 += W * 0.21 + r() * 40) { // cords, with a pull at the end
      const len = 10 + r() * (band ? band * 0.5 : 30);
      x.fillStyle = 'rgba(8,7,6,0.9)'; x.fillRect(cx2, bh, 1, len); x.fillRect(cx2 - 1.5, bh + len, 4, 5);
    }
    // the head of the frame casts a shadow down the glass
    const hs = x.createLinearGradient(0, 11, 0, 24); hs.addColorStop(0, 'rgba(0,0,0,0.35)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hs; x.fillRect(0, 11, W, 13);
    // One window frame around the whole view: trim down both sides and across the head, a transom.
    x.fillStyle = '#0d0b0a'; x.fillRect(0, 0, 9, H); x.fillRect(W - 9, 0, 9, H);
    x.fillStyle = 'rgba(255,230,190,0.05)'; x.fillRect(9, 0, 1, H); x.fillRect(W - 10, 0, 1, H);
    x.fillStyle = '#0d0b0a'; x.fillRect(0, H * 0.36, W, 7); x.fillStyle = 'rgba(255,230,190,0.05)'; x.fillRect(0, H * 0.36, W, 1);
    if (!desk) { x.fillStyle = '#0c0b0a'; x.fillRect(0, H - 34, W, 34); x.fillStyle = 'rgba(241,185,47,0.06)'; x.fillRect(0, H - 34, W, 1); } // sill
    for (const s of strips) { x.fillStyle = 'rgba(10,9,8,0.9)'; x.fillRect(s.x + s.w * 0.5, bh, 1, H * 0.1); } // a cord down each side
    // The monitor's amber glow on the glass, following its outline all the way round.
    if (mon) {
      x.save(); x.shadowColor = 'rgba(241,185,47,0.2)'; x.shadowBlur = 90; x.fillStyle = '#0b0a09';
      x.beginPath(); x.roundRect ? x.roundRect(mon.x, mon.y, mon.w, mon.h, 26) : x.rect(mon.x, mon.y, mon.w, mon.h); x.fill(); x.restore();
    }
    // grime, evenly over the whole pane
    for (let i = 0; i < W * H * 0.003; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '120,100,80'},${r() * 0.08})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    if (desk) drawDesk(x, r);
    drops = []; beads = [];
    draw(0);
  }

  // The desk under the monitor: a worn top lit by the screen, the monitor's foot, a keyboard,
  // a mug by the window, a cable over the edge.
  function drawDesk(x, r) {
    const y0 = H - desk;
    const top = x.createLinearGradient(0, y0, 0, H);
    top.addColorStop(0, '#2a241c'); top.addColorStop(0.25, '#1a1510'); top.addColorStop(1, '#0a0806');
    x.fillStyle = top; x.fillRect(0, y0, W, desk);
    x.fillStyle = 'rgba(255,225,180,0.10)'; x.fillRect(0, y0, W, 1);
    // screen light spilling onto the desk
    const spill = x.createRadialGradient(W / 2, y0, 10, W / 2, y0, W * 0.5);
    spill.addColorStop(0, 'rgba(241,185,47,0.24)'); spill.addColorStop(0.6, 'rgba(241,185,47,0.06)'); spill.addColorStop(1, 'rgba(241,185,47,0)');
    x.save(); x.scale(1, 0.12); x.fillStyle = spill; x.fillRect(0, y0 / 0.12, W, desk / 0.12); x.restore();
    // wear on the surface
    for (let i = 0; i < W * 0.3; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '160,130,90'},${r() * 0.06})`; x.fillRect(r() * W, y0 + 2 + r() * (desk - 2), 2 + r() * 14, 1); }
    // the monitor's foot
    const fw = Math.min(260, W * 0.14);
    x.fillStyle = '#0b0a09'; x.beginPath(); x.moveTo(W / 2 - fw / 2 + 14, y0); x.lineTo(W / 2 + fw / 2 - 14, y0); x.lineTo(W / 2 + fw / 2, y0 + desk * 0.7); x.lineTo(W / 2 - fw / 2, y0 + desk * 0.7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(W / 2 - fw / 2 + 14, y0, fw - 28, 1);
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(W / 2 - fw / 2, y0 + desk * 0.7, fw, 3);
    // keyboard, left of the foot: a dark slab with a few keys catching the light
    const kx = W * 0.2, kw = W * 0.2, ky = y0 + desk * 0.35;
    x.fillStyle = '#0d0b09'; x.fillRect(kx, ky, kw, desk);
    x.fillStyle = 'rgba(255,225,180,0.06)'; x.fillRect(kx, ky, kw, 1);
    for (let c = kx + 4; c < kx + kw - 6; c += 9) { x.fillStyle = `rgba(241,185,47,${0.03 + r() * 0.05})`; x.fillRect(c, ky + 4, 6, 1); x.fillRect(c + 3, ky + 10, 6, 1); }
    // cable from the foot over the front edge
    x.strokeStyle = '#070605'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 + fw * 0.3, y0 + desk * 0.6); x.bezierCurveTo(W / 2 + fw * 0.6, H, W / 2 + fw * 0.9, y0 + desk * 0.5, W / 2 + fw * 1.2, H + 4); x.stroke();
    // a mug by the right-hand window, a notepad on the left
    const side = strips.find((s) => s.x > 0);
    if (side) {
      const mx = side.x + side.w * 0.4, my = y0 - 15;
      x.fillStyle = '#100e0c'; x.fillRect(mx, my, 14, 18); x.fillRect(mx + 14, my + 4, 4, 8);
      x.fillStyle = 'rgba(255,225,180,0.07)'; x.fillRect(mx, my, 14, 1); x.fillRect(mx, my, 1, 18);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(mx - 2, y0 + 1, 20, 2);
    }
    const lside = strips.find((s) => s.x === 0);
    if (lside) {
      const px = lside.x + lside.w * 0.3;
      x.fillStyle = '#1b1712'; x.save(); x.translate(px, y0 + desk * 0.45); x.rotate(-0.08); x.fillRect(0, 0, Math.min(40, lside.w * 0.6), 9);
      x.fillStyle = 'rgba(120,100,70,0.25)'; for (let i = 2; i < 8; i += 3) x.fillRect(3, i, Math.min(32, lside.w * 0.5), 1); x.restore();
    }
  }

  function sign(x0, y0, w, h, col, r, wide = false) {
    const c = document.createElement('canvas'), pad = 18;
    c.width = Math.round((w + pad * 2) * dpr); c.height = Math.round((h + pad * 2) * dpr);
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.shadowColor = col; x.shadowBlur = 14;
    x.strokeStyle = col; x.lineWidth = 1.2; x.strokeRect(pad, pad, w, h);
    x.shadowBlur = 8; x.fillStyle = col;
    // glyph-ish marks, never real words
    if (wide) for (let c2 = pad + 4; c2 < pad + w - 5; c2 += 7) { x.fillRect(c2, pad + 3, 4, 1.4); if (r() < 0.6) x.fillRect(c2 + (r() < 0.5 ? 0 : 3), pad + 3, 1.4, 6); x.fillRect(c2, pad + 8, 4, 1.4); }
    else for (let y = pad + 5; y < pad + h - 8; y += w + 3) {
      const m = w - 6;
      x.fillRect(pad + 3, y, m, 1.4); if (r() < 0.7) x.fillRect(pad + 3 + r() * m * 0.6, y, 1.4, m); if (r() < 0.6) x.fillRect(pad + 3, y + m * (0.4 + r() * 0.5), m, 1.4); if (r() < 0.5) x.fillRect(pad + 3 + m - 1.4, y, 1.4, m * 0.6);
    }
    return { img: c, x: x0 - pad, y: y0 - pad, w: w + pad * 2, h: h + pad * 2, level: 1, flick: 0, dead: r() < 0.12, col };
  }

  function weather(dt) {
    const now = Date.now(), want = override || weatherAt(now);
    if (want !== name) { name = want; onWeather(name, WEATHER[name]); }
    const t = WEATHER[name], k = Math.min(1, dt / BLEND_S);
    for (const p in t) wx[p] += (t[p] - wx[p]) * k;
  }

  function step(dt) {
    weather(dt);
    const area = strips.reduce((a, s) => a + s.w, 0) * H, all = views.reduce((a, v) => a + v.w * v.h, 0);
    drift += dt * (4 + wx.wind * 30);
    // rain outside: long pale streaks slanting with the wind, spread over every patch of window
    const want = Math.round(all * 0.0009 * wx.rain);
    while (drops.length < want) drops.push(newDrop(true));
    if (drops.length > want) drops.length = want;
    for (const d of drops) { d.y += d.v * dt; d.x += wx.wind * d.v * dt * 0.35; if (d.y > d.end) Object.assign(d, newDrop(false)); }
    // beads on the glass: sit, then run down in little jerks
    const wantB = Math.round(area * 0.00012 * Math.min(1, wx.rain * 1.4));
    while (beads.length < wantB) beads.push(newBead());
    if (beads.length > wantB) beads.length = wantB;
    for (const b of beads) {
      if (b.run > 0) { b.y += b.run * dt; b.run *= 0.97; b.trail = Math.min(40, b.trail + b.run * dt * 0.5); if (b.run < 4) b.run = 0; }
      else if (Math.random() < dt * 0.08 * (0.3 + wx.rain)) b.run = 30 + Math.random() * 90;
      b.trail = Math.max(0, b.trail - dt * 3);
      if (b.y > H - Math.max(34, desk)) Object.assign(b, newBead());
    }
    // lightning
    flash = Math.max(0, flash - dt * 3.2);
    if (wx.storm > 0.5) {
      nextBolt -= dt;
      if (nextBolt <= 0) {
        flash = 0.7 + Math.random() * 0.3;
        if (Math.random() < 0.5) setTimeout(() => { flash = Math.max(flash, 0.6); }, 120 + Math.random() * 120); // the double flicker
        onThunder(0.6 + Math.random() * 2.8);
        nextBolt = 8 + Math.random() * 22;
      }
    }
    // signs buzz: now and then one stutters, a few are half dead
    for (const s of signs) {
      if (s.flick > 0) { s.flick -= dt; s.level = Math.random() < 0.5 ? 0.15 : 1; }
      else { s.level = s.dead ? (Math.random() < 0.04 ? 0.9 : 0.2) : 1; if (Math.random() < dt * 0.03) s.flick = 0.2 + Math.random() * 0.8; }
    }
    // a spinner crossing high up, behind the monitor and out the other side
    if (car) { car.x += car.v * dt; if (car.x < -40 || car.x > W + 40) car = null; }
    else if ((nextCar -= dt) <= 0) { const ltr = Math.random() < 0.5; car = { x: ltr ? -30 : W + 30, y: band && Math.random() < 0.55 ? 18 + Math.random() * Math.max(2, band - 22) : H * (0.08 + Math.random() * 0.2), v: (ltr ? 1 : -1) * (60 + Math.random() * 60) }; nextCar = 25 + Math.random() * 50; }
  }
  function newDrop(anywhere) {
    const tot = views.reduce((a, v) => a + v.w * v.h, 0);
    let n = Math.random() * tot, v = views[0];
    for (const c of views) { if (n < c.w * c.h) { v = c; break; } n -= c.w * c.h; }
    if (!v) return { x: 0, y: 0, end: 0, v: 0, len: 0 };
    const len = 10 + Math.random() * 16;
    return { x: v.x + Math.random() * v.w - 30 * wx.wind, y: anywhere ? v.y + Math.random() * v.h : v.y - len - Math.random() * 40, end: v.y + v.h + len, v: 500 + Math.random() * 400, len };
  }
  const newBead = () => ({ x: pickX(), y: Math.random() * (H - 60), r: 0.8 + Math.random() * 1.8, run: 0, trail: 0 });
  function pickX() { const tot = strips.reduce((a, s) => a + s.w, 0); let n = Math.random() * tot; for (const s of strips) { if (n < s.w) return s.x + n; n -= s.w; } return 0; }

  function draw(t) {
    g.save();
    g.clearRect(0, 0, W, H);
    g.beginPath(); g.rect(0, 0, W, H - desk); g.clip(); // the whole window; the monitor sits over the middle of it
    const part = (img) => g.drawImage(img, 0, 0, img.width, (H - desk) * dpr, 0, 0, W, H - desk);
    part(sky);
    if (flash > 0) { g.fillStyle = `rgba(190,180,230,${flash * 0.35})`; g.fillRect(0, 0, W, H * 0.8); }
    // clouds drifting over, lit from inside by lightning
    const cw = clouds.width / dpr, chh = clouds.height / dpr, off = -(drift % cw);
    g.globalAlpha = Math.min(1, 0.55 + wx.fog * 0.3 + wx.rain * 0.35);
    g.drawImage(clouds, off, 0, cw, chh); g.drawImage(clouds, off + cw, 0, cw, chh);
    if (flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = flash * 0.9; g.drawImage(clouds, off, 0, cw, chh); g.drawImage(clouds, off + cw, 0, cw, chh); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1;
    if (car) { g.fillStyle = Math.floor(t / 400) % 2 ? 'rgba(255,60,60,0.9)' : 'rgba(255,60,60,0.25)'; g.fillRect(car.x, car.y, 2, 2); g.fillStyle = 'rgba(255,230,190,0.5)'; g.fillRect(car.x + (car.v > 0 ? 3 : -5), car.y + 1, 2, 1); }
    part(city);
    for (const b of beacons) { const on = ((t + b.phase) % b.rate) < 160; g.fillStyle = on ? 'rgba(255,50,40,0.95)' : 'rgba(255,50,40,0.18)'; g.fillRect(b.x - 1, b.y - 1, 2.5, 2.5); if (on) { g.fillStyle = 'rgba(255,50,40,0.12)'; g.fillRect(b.x - 4, b.y - 4, 8.5, 8.5); } }
    for (const s of signs) { g.globalAlpha = s.level * (1 - wx.fog * 0.35); g.drawImage(s.img, s.x, s.y, s.w, s.h); }
    g.globalAlpha = 1;
    if (flash > 0) { g.fillStyle = `rgba(200,190,240,${flash * 0.08})`; g.fillRect(0, 0, W, H); }
    // haze: smog hangs low, fog swallows everything
    const fog = g.createLinearGradient(0, 0, 0, H);
    fog.addColorStop(0, `rgba(30,22,26,${0.15 + wx.fog * 0.45})`); fog.addColorStop(0.7, `rgba(58,36,28,${0.1 + wx.fog * 0.55})`); fog.addColorStop(1, `rgba(20,14,12,${0.2 + wx.fog * 0.4})`);
    g.fillStyle = fog; g.fillRect(0, 0, W, H);
    // rain
    if (drops.length) {
      g.strokeStyle = `rgba(170,175,200,${0.12 + wx.rain * 0.12})`; g.lineWidth = 1; g.beginPath();
      for (const d of drops) { g.moveTo(d.x, d.y); g.lineTo(d.x - wx.wind * d.len * 0.5, d.y - d.len); }
      g.stroke();
    }
    for (const b of beads) {
      if (b.trail > 1) { g.fillStyle = 'rgba(200,190,180,0.06)'; g.fillRect(b.x - b.r * 0.4, b.y - b.trail, b.r * 0.8, b.trail); }
      g.fillStyle = 'rgba(12,10,12,0.5)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
      g.fillStyle = `rgba(255,220,180,${0.18 + flash * 0.4})`; g.fillRect(b.x - b.r * 0.4, b.y - b.r * 0.5, 1, 1);
    }
    part(glass);
    g.restore();
    if (desk) { // the desk isn't behind glass
      g.drawImage(glass, 0, (H - desk) * dpr, W * dpr, desk * dpr, 0, H - desk, W, desk);
      if (flash > 0) { g.fillStyle = `rgba(200,195,240,${flash * 0.07})`; g.fillRect(0, H - desk, W, desk); }
    }
  }

  function frame(t) {
    if (!on) return;
    raf = requestAnimationFrame(frame);
    if (t - last < 48) return;
    const dt = Math.min(0.2, (t - last) / 1000 || 0.05);
    last = t;
    if (!strips.length) return; // no wall showing at this size
    step(dt); draw(t);
  }
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => on && build(), 150); });

  return {
    // Show or hide it (casing on and the Window setting on).
    set(show) {
      if (show === on) return;
      on = show;
      if (!on) { cancelAnimationFrame(raf); canvas.remove(); return; }
      document.body.prepend(canvas);
      requestAnimationFrame(() => {
        build();
        onWeather(name, WEATHER[name]);
        if (canMove()) { last = performance.now(); raf = requestAnimationFrame(frame); }
      });
    },
    // Layout changed (the monitor moved): re-measure the strips.
    remeasure() { if (on) build(); },
    // Force a weather (weather <name>), or null to follow the clock again.
    force(w) { override = WEATHER[w] ? w : null; },
    get weather() { return name; },
  };
}
