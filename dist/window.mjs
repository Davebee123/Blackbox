// The window behind the monitor. With the casing on, the strips of wall either side of the screen
// look out through grimy glass onto the slum outside: stacked towers, lit windows, vertical neon,
// a spinner drifting past. The weather turns over every few minutes (clear, fog, drizzle, rain,
// storm) and fades between states; storms bring lightning (and thunder, through `onThunder`).
//
// It's scenery, so it stays dark and slow: about 20 frames a second, drawn only around the monitor
// (the strips beside it, the band above it and the desk). Everything that doesn't move is drawn once
// into offscreen layers (the sky, the smog, the city in four depths, the wet sheen, the signs, the
// glass), of which only the pieces around the monitor are kept; a frame only copies those and draws
// what moves (rain, beads, a few windows, lights). Motion
// off or reduced motion: one still frame. A hidden tab draws nothing. The weather is picked from the
// clock, so a reload doesn't reroll it; the sky follows the hour.
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
// The signs' tubes: rose, sodium peach, amber and a pale warm white. Never the player's teal, a threat's red or a
// daemon's violet.
export const NEON = ['#e8707f', '#ffa860', '#f1b92f', '#f2dcb8'];
// The hour's light: the sky's stops (top to the street), the smog's glow, how many windows are lit and how bright the
// signs read. Night is the city as it always was; the rest only tint it. Dark throughout: it sits behind the screen.
export const HOURS = {
  night: { sky: ['#1c1319', '#150e14', '#140d15', '#3a2016', '#1a100c', '#0a0706'], glow: [90, 50, 38], haze: [58, 36, 28], lit: 1, sign: 1 },
  dawn: { sky: ['#1a1519', '#18131a', '#1f181d', '#3b2a25', '#1b130f', '#0a0706'], glow: [96, 70, 62], haze: [66, 50, 44], lit: 0.6, sign: 0.75 },
  day: { sky: ['#201c1c', '#1f1b1b', '#262020', '#382d26', '#1d1612', '#0b0807'], glow: [92, 80, 70], haze: [70, 58, 50], lit: 0.32, sign: 0.5 },
  dusk: { sky: ['#1d1218', '#190f15', '#1f1218', '#47251a', '#1d110c', '#0a0706'], glow: [110, 58, 36], haze: [70, 40, 28], lit: 0.85, sign: 1 },
};
export function hourOf(date) {
  const h = date.getHours();
  return h >= 21 || h < 5 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk';
}
const SKY_AT = [0, 0.07, 0.4, 0.7, 0.86, 1];

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
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// A lit window's light: mostly sodium amber and warm lamps, now and then a pale tube light or a rose curtain.
function windowTone(v) {
  return v < 0.5 ? [241, 170, 70] : v < 0.78 ? [255, 206, 150] : v < 0.9 ? [214, 122, 62] : v < 0.97 ? [196, 196, 182] : [222, 128, 140];
}

export function createWindow({ canMove, onThunder = () => {}, onWeather = () => {} }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'window-out';
  canvas.setAttribute('aria-hidden', 'true');
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, mon = null, strips = [], views = [], paint = [], desk = 0, sky = null, clouds = null, drift = 0, band = 0, city = null, glass = null, wet = null, deskImg = null, signs = [];
  let on = false, last = 0, raf = 0, override = null, hourForce = null, hour = hourOf(new Date()), nextHourCheck = 60;
  let wx = { ...WEATHER[weatherAt(Date.now())] }, name = weatherAt(Date.now());
  let beacons = [], drops = [], beads = [], flash = 0, nextBolt = 4, car = null, nextCar = 6, lamps = [], nextLamp = 12;

  // A whole layer is drawn once, then only the pieces around the monitor are kept (a fifth to a third of the
  // window), so the layers held between frames stay small.
  const slice = (src, scale = dpr, rects = paint) => rects.map((p) => {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(p.w * scale)); c.height = Math.max(1, Math.round(p.h * scale));
    c.getContext('2d').drawImage(src, p.x * scale, p.y * scale, p.w * scale, p.h * scale, 0, 0, c.width, c.height);
    return { c, p };
  });
  const layer = (scale = dpr) => { const c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale); const x = c.getContext('2d'); x.setTransform(scale, 0, 0, scale, 0, 0); return [c, x]; };

  // What shows around the monitor's outer ring: the window left, right and above it, and the
  // desk it stands on below. `strips` are the sides (where the close-up city goes); `views` is
  // every patch of window; `paint` is where a frame draws (the rest is under the monitor).
  function measure() {
    const app = document.querySelector('.app')?.getBoundingClientRect();
    strips = []; views = []; paint = [{ x: 0, y: 0, w: W, h: H }];
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
    // Three rects that don't overlap, reaching in under the monitor's rim (its glow and its rounded corners).
    const lx = Math.min(W / 2, Math.ceil(mon.x + 40)), rx = Math.max(W / 2, Math.floor(mon.x + mon.w - 40)), ty = Math.min(low, Math.ceil(mon.y + 40));
    const by = Math.max(ty, Math.floor(mon.y + mon.h - 40));
    paint = [{ x: 0, y: 0, w: lx, h: low }, { x: rx, y: 0, w: W - rx, h: low }, { x: lx, y: 0, w: rx - lx, h: ty }, { x: lx, y: by, w: rx - lx, h: low - by }].filter((v) => v.w > 0 && v.h > 0);
  }

  function build() {
    W = innerWidth; H = innerHeight; dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
    const tod = HOURS[hourForce || hour];
    // `r` lays the city out (the same city it has always been); `d` adds the detail, so detail never moves a tower.
    const r = seeded(4242), d = seeded(8117);
    // Sky: black at the top, smog glowing brown-amber over the streets; the hour tints it.
    let x;
    [sky, x] = layer();
    const grad = x.createLinearGradient(0, 0, 0, H);
    tod.sky.forEach((c, i) => grad.addColorStop(SKY_AT[i], c));
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
    // the city's glow on the low smog, wider than the gradient: a soft dome over the horizon
    const dome = x.createRadialGradient(W / 2, H * 0.78, 0, W / 2, H * 0.78, Math.max(W, H) * 0.7);
    dome.addColorStop(0, rgba(tod.glow, 0.12)); dome.addColorStop(1, rgba(tod.glow, 0));
    x.fillStyle = dome; x.fillRect(0, 0, W, H);
    sky = slice(sky);
    // Smog clouds: a strip twice the screen wide that drifts past, dark on top, lit from below.
    clouds = document.createElement('canvas');
    const ch = Math.max(120, H * 0.3), cw = W * 2, cdpr = Math.min(1, dpr); // soft by nature: never more than 1:1
    clouds.width = Math.round(cw * cdpr); clouds.height = Math.round(ch * cdpr);
    const cx = clouds.getContext('2d'); cx.setTransform(cdpr, 0, 0, cdpr, 0, 0);
    const [gr0, gg0, gb0] = tod.glow;
    for (let i = 0; i < cw / 9; i++) {
      const bx = r() * cw, by = r() * ch * 0.8, rad = 30 + r() * 90;
      const lit = by / ch; // lower clouds catch more of the city's glow
      const gr = cx.createRadialGradient(bx, by + rad * 0.3, 0, bx, by, rad);
      gr.addColorStop(0, `rgba(${gr0 + lit * 70},${gg0 + lit * 30},${gb0},${0.14 + lit * 0.1})`); gr.addColorStop(0.6, 'rgba(40,26,26,0.08)'); gr.addColorStop(1, 'rgba(20,14,16,0)');
      cx.fillStyle = gr; cx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
      // wrap the seam so the loop is invisible
      if (bx < rad) { cx.save(); cx.translate(cw, 0); cx.fillRect(bx - rad, by - rad, rad * 2, rad * 2); cx.restore(); }
      if (bx > cw - rad) { cx.save(); cx.translate(-cw, 0); cx.fillRect(bx - rad, by - rad, rad * 2, rad * 2); cx.restore(); }
    }
    // The city: four depths of towers, darker, sharper and more detailed as they come closer; the air between
    // them hazes each depth toward the smog (atmospheric perspective), baked once.
    [city, x] = layer();
    [wet] = layer(1); const wx2 = wet.getContext('2d');
    lamps = [];
    const haze = (a) => {
      const hz = x.createLinearGradient(0, 0, 0, H);
      hz.addColorStop(0, rgba(tod.haze, a * 0.35)); hz.addColorStop(0.55, rgba(tod.haze, a * 0.8)); hz.addColorStop(0.8, rgba(tod.haze, a)); hz.addColorStop(1, rgba(tod.haze, a * 0.5));
      x.fillStyle = hz; x.fillRect(0, 0, W, H);
    };
    // One tower. `win` is its window size (the grid the city has always had); `depth` 0 far .. 2 up close.
    const tower = (x0, w, top, col, lit, win, depth) => {
      x.fillStyle = col; x.fillRect(x0, top, w, H - top);
      // pilasters up close, the street's light climbing its face, and one edge catching the glow
      if (depth === 2) for (let px = x0 + win * 0.6 + win * 1.7 * 3 - win * 0.45; px < x0 + w - win; px += win * 1.7 * (3 + Math.floor(d() * 2))) { x.fillStyle = 'rgba(255,220,180,0.03)'; x.fillRect(px, top, 0.8, H - top); }
      const up = x.createLinearGradient(0, top, 0, H);
      up.addColorStop(0, 'rgba(0,0,0,0)'); up.addColorStop(1, rgba(tod.glow, 0.05 + depth * 0.015));
      x.fillStyle = up; x.fillRect(x0, top, w, H - top);
      x.fillStyle = `rgba(255,210,170,${0.03 + depth * 0.012})`; x.fillRect(d() < 0.5 ? x0 : x0 + w - 1, top, 1, H - top);
      // a parapet, and a setback on some
      x.fillStyle = `rgba(255,220,180,${0.05 + depth * 0.02})`; x.fillRect(x0, top, w, 1);
      if (w > 26 && d() < 0.35) { const sw = w * (0.45 + d() * 0.3), sx = x0 + (w - sw) * d(), sh = 6 + d() * 14; x.fillStyle = col; x.fillRect(sx, top - sh, sw, sh); x.fillStyle = 'rgba(255,220,180,0.05)'; x.fillRect(sx, top - sh, sw, 1); }
      // the roof: an antenna, a water tank, AC boxes (the antenna and tank where they always stood)
      const ant = r() < 0.5;
      if (ant) {
        const ay = top - 6 - r() * 18, ah = 10 + r() * 16, ax = x0 + w * 0.3;
        x.fillStyle = col; x.fillRect(ax, ay, depth ? 1.2 : 1.5, ah);
        if (depth) { x.fillRect(ax - 2, ay + ah * 0.3, 5, 0.8); x.fillRect(ax - 1.5, ay + ah * 0.55, 4, 0.8); x.strokeStyle = 'rgba(20,16,20,0.6)'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(ax + 0.6, ay + 2); x.lineTo(ax - 6, top); x.moveTo(ax + 0.6, ay + 2); x.lineTo(ax + 7, top); x.stroke(); }
      }
      if (r() < 0.3) { // water tank: legs, a barrel with hoops, a cone of a lid
        const tw = Math.max(5, w * 0.3), tx = x0 + w * 0.15, th = 7 + depth * 2;
        x.fillStyle = col;
        x.fillRect(tx + 1, top - 3, 1, 3); x.fillRect(tx + tw - 2, top - 3, 1, 3);
        x.fillRect(tx, top - 3 - th, tw, th);
        x.beginPath(); x.moveTo(tx - 0.5, top - 3 - th); x.lineTo(tx + tw / 2, top - 6 - th); x.lineTo(tx + tw + 0.5, top - 3 - th); x.fill();
        if (depth) { x.fillStyle = 'rgba(255,220,180,0.05)'; for (let hy = top - 3 - th + 2; hy < top - 3; hy += 3) x.fillRect(tx, hy, tw, 0.6); }
      }
      if (depth && w > 18) for (let i = 0, n = Math.floor(d() * 3); i < n; i++) { x.fillStyle = col; x.fillRect(x0 + w * (0.5 + d() * 0.4) - 3, top - 3, 4 + d() * 3, 3); }
      // ledges every few floors
      const every = 2 + Math.floor(d() * 3);
      // windows: the grid; floors and columns have their habits (a dark floor, a stairwell, a lit office band)
      const floorOf = new Map(), colDark = d() < 0.4 ? Math.floor(d() * 6) : -1;
      let row = 0;
      for (let y = top + win; y < H - win; y += win * 2, row++) {
        if (depth && row % every === 0) { x.fillStyle = `rgba(255,220,180,${0.02 + depth * 0.012})`; x.fillRect(x0, y - win * 0.6, w, 0.8); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(x0, y - win * 0.6 + 0.8, w, 0.8); }
        const f = floorOf.get(row) ?? (d() < 0.18 ? 0 : d() < 0.12 ? 2.2 : 1); floorOf.set(row, f);
        let col2 = 0;
        for (let c = x0 + win * 0.6; c < x0 + w - win; c += win * 1.7, col2++) {
          const v = r();
          const dark = v > lit || f === 0 || col2 === colDark || d() > tod.lit * (f > 1 ? 1 : 0.92);
          if (v > lit) { // unlit, as it always was: the dark pane still shows on the nearer towers
            if (depth) { x.fillStyle = `rgba(70,54,58,${0.06 + depth * 0.05})`; x.fillRect(c, y, win * 0.8, win * 0.7); }
            continue;
          }
          const tone = windowTone(r()), a = (0.18 + r() * 0.35) * (depth === 0 ? 0.7 : 1);
          if (dark) { if (depth) { x.fillStyle = `rgba(70,54,58,${0.06 + depth * 0.05})`; x.fillRect(c, y, win * 0.8, win * 0.7); } continue; }
          // a few windows up close live: drawn each frame, now and then one goes dark (or comes on)
          if (depth === 2 && lamps.length < 60 && d() < 0.06) { lamps.push({ x: c, y, w: win * 0.8, h: win * 0.7, tone, a, level: 1, want: 1 }); continue; }
          x.fillStyle = rgba(tone, a); x.fillRect(c, y, win * 0.8, win * 0.7);
          if (depth === 2) { // up close: a mullion, a blind half down, a glow on the sill
            if (d() < 0.5) { x.fillStyle = 'rgba(20,14,12,0.55)'; x.fillRect(c + win * 0.38, y, 0.6, win * 0.7); }
            if (d() < 0.3) { x.fillStyle = `rgba(30,20,16,${0.4 + d() * 0.3})`; x.fillRect(c, y, win * 0.8, win * 0.7 * (0.3 + d() * 0.4)); }
            x.fillStyle = rgba(tone, a * 0.25); x.fillRect(c - 0.5, y + win * 0.7, win * 0.8 + 1, 0.8);
          }
        }
      }
    };
    // Far off, behind everything: a low haze of blocks, barely there.
    for (let at = -10; at < W; at += 10 + d() * 26) {
      const w = 14 + d() * 34, top = H * (0.42 + d() * 0.16);
      x.fillStyle = '#120c11'; x.fillRect(at, top, w, H - top);
      for (let y = top + 3; y < H; y += 4) if (d() < 0.12 * tod.lit) { x.fillStyle = `rgba(241,170,70,${0.08 + d() * 0.12})`; x.fillRect(at + 1 + d() * (w - 3), y, 1.5, 1); }
    }
    haze(0.55);
    // Megatowers far off: thin, dark, far taller than the rest, their tops showing above the
    // monitor, each with a warning light blinking at its own pace.
    beacons = [];
    for (let at = W * (0.05 + r() * 0.08); at < W; at += W * (0.1 + r() * 0.12)) {
      const w = 12 + r() * 18, top = band ? band * (0.7 + r() * 0.45) + 6 : H * (0.04 + r() * 0.1); // in the top band only the crowns and masts show
      x.fillStyle = '#060407'; x.fillRect(at, top, w, H - top);
      x.fillRect(at + w * 0.2, top - 4, w * 0.6, 4); x.fillRect(at + w * 0.45, top - 14 - r() * 10, 1.5, 16 + r() * 10); // crown, mast
      x.fillRect(at - 1, top + 2, w + 2, 1.5); x.fillRect(at + w * 0.1, H * 0.3 + d() * H * 0.2, w * 0.8, 2); // the crown's lip, a sky lobby
      for (let y = top + 6; y < H; y += 5) if (r() < 0.3) { const a = (0.15 + r() * 0.25) * tod.lit; const px = at + 2 + r() * (w - 5); if (d() < 0.85) { x.fillStyle = `rgba(241,170,70,${a})`; x.fillRect(px, y, 2, 1.5); } }
      x.fillStyle = 'rgba(255,200,160,0.09)'; x.fillRect(at, top, 1, H - top); // one edge catching the glow
      beacons.push({ x: at + w * 0.45, y: top - 15, rate: 900 + r() * 900, phase: r() * 2000, shows: false });
    }
    haze(0.22);
    for (let at = -20; at < W; at += 14 + r() * 40) tower(at, 20 + r() * 50, H * (0.3 + r() * 0.25), '#0d0a0e', 0.05, 2, 0);
    haze(0.12);
    // sodium light from the streets, welling up between the towers
    for (let at = W * d() * 0.1; at < W; at += 90 + d() * 160) {
      const sy = H * (0.86 + d() * 0.1), rad = 40 + d() * 70;
      const s = x.createRadialGradient(at, sy, 0, at, sy, rad);
      s.addColorStop(0, `rgba(255,168,80,${0.09 * (0.6 + tod.lit * 0.4)})`); s.addColorStop(1, 'rgba(255,168,80,0)');
      x.fillStyle = s; x.fillRect(at - rad, sy - rad, rad * 2, rad * 2);
    }
    for (let at = -30; at < W; at += 24 + r() * 50) tower(at, 30 + r() * 60, H * (0.22 + r() * 0.35), '#08070a', 0.1, 3, 1);
    haze(0.05);
    // Up close, in each strip: a tower face right against the glass, with a fire escape and signs.
    signs = [];
    for (const s of strips) {
      // on the far side of the strip from the monitor, so sky and skyline show beside the screen
      const w = s.w * (0.4 + r() * 0.12), top = H * (0.34 + r() * 0.12);
      const near = s.x === 0 ? s.x + s.w * 0.08 : s.x + s.w * 0.92 - w;
      tower(near, w, top, '#050406', 0.18, 4, 2);
      // street lamps at its foot: a sodium head and its bloom, and their streaks on the wet street
      for (let i = 0; i < 2; i++) {
        const lx = s.x + s.w * (0.15 + d() * 0.7), ly = H - Math.max(34, desk) - 30 - d() * 60, rad = 34 + d() * 26;
        const b = x.createRadialGradient(lx, ly, 0, lx, ly, rad);
        b.addColorStop(0, 'rgba(255,176,96,0.3)'); b.addColorStop(0.3, 'rgba(255,160,80,0.1)'); b.addColorStop(1, 'rgba(255,160,80,0)');
        x.fillStyle = b; x.fillRect(lx - rad, ly - rad, rad * 2, rad * 2);
        x.fillStyle = 'rgba(255,214,160,0.75)'; x.fillRect(lx - 1.5, ly - 0.5, 3, 1.2);
        x.fillStyle = 'rgba(10,8,8,0.9)'; x.fillRect(lx + 1, ly, 1, H - ly);
        const st = wx2.createLinearGradient(0, ly + 4, 0, H);
        st.addColorStop(0, 'rgba(255,170,90,0.16)'); st.addColorStop(1, 'rgba(255,170,90,0)');
        wx2.fillStyle = st; wx2.fillRect(lx - 2.5, ly + 4, 5, H - ly);
      }
      // fire escape: landings with rails, zig-zag stairs, a drop ladder at the bottom
      const fx = near + (r() < 0.5 ? 2 : w - 14);
      for (let y = top + 40; y < H - 20; y += 46) {
        x.fillStyle = 'rgba(30,26,30,0.95)';
        x.fillRect(fx - 3, y, 18, 1.5); x.fillRect(fx - 3, y - 8, 18, 1);
        for (let bx = fx - 3; bx <= fx + 15; bx += 3) x.fillRect(bx, y - 8, 0.7, 8);
        x.fillStyle = 'rgba(255,200,150,0.06)'; x.fillRect(fx - 3, y - 8, 18, 0.5);
        x.strokeStyle = 'rgba(30,26,30,0.95)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(fx, y); x.lineTo(fx + 12, y + 46); x.stroke();
        x.lineWidth = 0.5; x.beginPath(); x.moveTo(fx + 2, y - 6); x.lineTo(fx + 14, y + 40); x.stroke();
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(fx - 3, y + 1.5, 18, 3); // its shadow on the wall
      }
      // AC units (with a drip stain under each) and pipes
      for (let i = 0; i < 5; i++) {
        const ax = near + r() * (w - 10), ay = top + 30 + r() * (H - top - 60), aw = 8 + r() * 5, ah = 6 + r() * 3;
        x.fillStyle = '#0d0b0d'; x.fillRect(ax, ay, aw, ah);
        x.fillStyle = 'rgba(255,220,180,0.06)'; x.fillRect(ax, ay, aw, 0.8);
        x.fillStyle = 'rgba(0,0,0,0.35)'; for (let gy = ay + 2; gy < ay + ah - 1; gy += 1.6) x.fillRect(ax + 1, gy, aw - 2, 0.5);
        x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(ax + aw * 0.7, ay + ah, 0.8, 8 + d() * 24);
      }
      const px = near + w * (0.2 + r() * 0.6);
      x.fillStyle = '#0b0a0c'; x.fillRect(px, top, 2, H - top);
      x.fillStyle = 'rgba(255,220,180,0.05)'; x.fillRect(px, top, 0.6, H - top);
      x.fillStyle = '#0b0a0c'; for (let by = top + 20; by < H; by += 60) x.fillRect(px - 1, by, 4, 1.5);
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
    // Each sign's light on the wet: a smear down the wall under it and a glint on the street.
    for (const sg of signs) {
      const c = hex(sg.col), cx0 = sg.x + sg.w / 2, top0 = sg.y + sg.h - sg.pad, len = Math.min(H - top0, 160 + sg.h);
      const sm = wx2.createLinearGradient(0, top0, 0, top0 + len);
      sm.addColorStop(0, rgba(c, 0.14)); sm.addColorStop(1, rgba(c, 0));
      wx2.fillStyle = sm;
      const bw = sg.w - sg.pad * 2;
      wx2.globalAlpha = 0.6; wx2.fillRect(cx0 - bw * 0.7, top0, bw * 1.4, len); wx2.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) { const ox = (d() - 0.5) * bw; wx2.fillRect(cx0 + ox - 1, top0 + d() * 6, 1 + d() * 2, len * (0.4 + d() * 0.5)); }
      wx2.globalAlpha = 1;
    }
    city = slice(city); wet = slice(wet, 1);
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
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, H * 0.36 + 7, W, 2);
    if (!desk) { x.fillStyle = '#0c0b0a'; x.fillRect(0, H - 34, W, 34); x.fillStyle = 'rgba(241,185,47,0.06)'; x.fillRect(0, H - 34, W, 1); } // sill
    for (const s of strips) { x.fillStyle = 'rgba(10,9,8,0.9)'; x.fillRect(s.x + s.w * 0.5, bh, 1, H * 0.1); } // a cord down each side
    // The monitor's amber glow on the glass, following its outline all the way round.
    if (mon) {
      x.save(); x.shadowColor = 'rgba(241,185,47,0.2)'; x.shadowBlur = 90; x.fillStyle = '#0b0a09';
      x.beginPath(); x.roundRect ? x.roundRect(mon.x, mon.y, mon.w, mon.h, 26) : x.rect(mon.x, mon.y, mon.w, mon.h); x.fill(); x.restore();
    }
    // grime, evenly over the whole pane, and an old wipe or two
    for (let i = 0; i < W * H * 0.003; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '120,100,80'},${r() * 0.08})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    for (const s of strips) {
      x.save(); x.strokeStyle = 'rgba(150,130,110,0.025)'; x.lineWidth = 18;
      x.beginPath(); x.arc(s.x + s.w * (0.3 + d() * 0.4), H * (0.55 + d() * 0.2), s.w * 0.4, Math.PI * 1.1, Math.PI * 1.8); x.stroke(); x.restore();
    }
    if (desk) drawDesk(x, r);
    deskImg = desk ? slice(glass, dpr, [{ x: 0, y: H - desk, w: W, h: desk }])[0].c : null;
    glass = slice(glass);
    for (const b of beacons) b.shows = shows(b.x, b.y);
    drops = []; beads = [];
    draw(0);
    start(); // a wider window may have just made room for the wall
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

  // A neon sign, drawn once: its light on the wall round it, the tube's glow, a bright core, and its glyph marks
  // (marks, never real words).
  function sign(x0, y0, w, h, col, r, wide = false) {
    const c = document.createElement('canvas'), pad = 40, rgb = hex(col);
    c.width = Math.round((w + pad * 2) * dpr); c.height = Math.round((h + pad * 2) * dpr);
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const spill = x.createRadialGradient(pad + w / 2, pad + h / 2, 0, pad + w / 2, pad + h / 2, Math.max(w, h) / 2 + pad);
    spill.addColorStop(0, rgba(rgb, 0.1)); spill.addColorStop(0.5, rgba(rgb, 0.04)); spill.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = spill; x.fillRect(0, 0, w + pad * 2, h + pad * 2);
    x.fillStyle = 'rgba(8,6,8,0.55)'; x.fillRect(pad + 1, pad + 1, w - 2, h - 2); // the box the tubes are on
    const marks = [];
    if (wide) for (let c2 = pad + 4; c2 < pad + w - 5; c2 += 7) { marks.push([c2, pad + 3, 4, 1.4]); if (r() < 0.6) marks.push([c2 + (r() < 0.5 ? 0 : 3), pad + 3, 1.4, 6]); marks.push([c2, pad + 8, 4, 1.4]); }
    else for (let y = pad + 5; y < pad + h - 8; y += w + 3) {
      const m = w - 6;
      marks.push([pad + 3, y, m, 1.4]); if (r() < 0.7) marks.push([pad + 3 + r() * m * 0.6, y, 1.4, m]); if (r() < 0.6) marks.push([pad + 3, y + m * (0.4 + r() * 0.5), m, 1.4]); if (r() < 0.5) marks.push([pad + 3 + m - 1.4, y, 1.4, m * 0.6]);
    }
    // the glow twice (wide and soft, then close), then the tubes crisp on top
    x.shadowColor = col; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 1.2;
    for (const [blur, a] of [[24, 0.55], [8, 0.9]]) { x.shadowBlur = blur; x.globalAlpha = a; x.strokeRect(pad, pad, w, h); for (const m of marks) x.fillRect(...m); }
    x.globalAlpha = 1; x.shadowBlur = 0; x.strokeRect(pad, pad, w, h); for (const m of marks) x.fillRect(...m);
    x.fillStyle = 'rgba(255,244,232,0.6)'; // the white-hot middle of each tube
    for (const [mx, my, mw, mh] of marks) x.fillRect(mx + (mw > mh ? 0.5 : 0.35), my + (mw > mh ? 0.35 : 0.5), mw > mh ? mw - 1 : 0.7, mw > mh ? 0.7 : mh - 1);
    return { img: c, x: x0 - pad, y: y0 - pad, w: w + pad * 2, h: h + pad * 2, pad, level: 1, flick: 0, dead: r() < 0.12, col };
  }

  function weather(dt) {
    const now = Date.now(), want = override || weatherAt(now);
    if (want !== name) { name = want; onWeather(name, WEATHER[name]); }
    const t = WEATHER[name], k = Math.min(1, dt / BLEND_S);
    for (const p in t) wx[p] += (t[p] - wx[p]) * k;
  }

  function step(dt) {
    weather(dt);
    // the hour turns: the sky and the lights are drawn again (a few times a day)
    if ((nextHourCheck -= dt) <= 0) { nextHourCheck = 60; const h = hourOf(new Date()); if (h !== hour) { hour = h; if (!hourForce) build(); } }
    const area = strips.reduce((a, s) => a + s.w, 0) * H, all = views.reduce((a, v) => a + v.w * v.h, 0);
    drift += dt * (4 + wx.wind * 30);
    // rain outside: fine pale streaks slanting with the wind in three depths, spread over every patch of window
    const want = Math.round(all * 0.0008 * wx.rain);
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
    // signs buzz: rarely one stutters, a few are half dead
    for (const s of signs) {
      if (s.flick > 0) { s.flick -= dt; s.level = Math.random() < 0.5 ? 0.3 : 1; }
      else { s.level = s.dead ? (Math.random() < 0.02 ? 0.8 : 0.25) : 1; if (Math.random() < dt * 0.012) s.flick = 0.15 + Math.random() * 0.4; }
    }
    // somebody turns a light off (or on), every so often, and it fades
    if ((nextLamp -= dt) <= 0 && lamps.length) {
      const l = lamps[Math.floor(Math.random() * lamps.length)];
      const lit = lamps.reduce((a, x) => a + x.want, 0) / lamps.length;
      l.want = l.want ? 0 : (lit < 0.85 || Math.random() < 0.3 ? 1 : 0);
      nextLamp = 10 + Math.random() * 30;
    }
    for (const l of lamps) l.level += Math.max(-dt * 0.8, Math.min(dt * 0.8, l.want - l.level));
    // a spinner crossing high up, or an aircraft far off and slow, behind the monitor and out the other side
    if (car) { car.x += car.v * dt; if (car.x < -40 || car.x > W + 40) car = null; }
    else if ((nextCar -= dt) <= 0) {
      const ltr = Math.random() < 0.5, plane = Math.random() < 0.4;
      car = { plane, x: ltr ? -30 : W + 30, y: plane ? (band ? 8 + Math.random() * Math.max(2, band - 14) : H * (0.03 + Math.random() * 0.08)) : band && Math.random() < 0.55 ? 18 + Math.random() * Math.max(2, band - 22) : H * (0.08 + Math.random() * 0.2), v: (ltr ? 1 : -1) * (plane ? 14 + Math.random() * 12 : 60 + Math.random() * 60) };
      nextCar = 25 + Math.random() * 50;
    }
  }
  function newDrop(anywhere) {
    const tot = views.reduce((a, v) => a + v.w * v.h, 0);
    let n = Math.random() * tot, v = views[0];
    for (const c of views) { if (n < c.w * c.h) { v = c; break; } n -= c.w * c.h; }
    if (!v) return { x: 0, y: 0, end: 0, v: 0, len: 0, z: 0 };
    const z = Math.random() < 0.45 ? 0 : Math.random() < 0.65 ? 1 : 2; // far, middling, near
    const len = [5, 9, 14][z] + Math.random() * [5, 7, 10][z];
    return { x: v.x + Math.random() * v.w - 30 * wx.wind, y: anywhere ? v.y + Math.random() * v.h : v.y - len - Math.random() * 40, end: v.y + v.h + len, v: [300, 460, 640][z] + Math.random() * [150, 200, 260][z], len, z };
  }
  const newBead = () => ({ x: pickX(), y: Math.random() * (H - 60), r: 0.7 + Math.random() * 1.6, run: 0, trail: 0 });
  function pickX() { const tot = strips.reduce((a, s) => a + s.w, 0); let n = Math.random() * tot; for (const s of strips) { if (n < s.w) return s.x + n; n -= s.w; } return 0; }

  // Copy a cached layer, only where the window shows (the rest is under the monitor), and fill the same way. No
  // canvas-wide clip: a clip of several rects would cost every draw a mask, so each piece goes rect by rect.
  function blit(pieces) {
    for (const { c, p } of pieces) g.drawImage(c, p.x, p.y, p.w, p.h);
  }
  function fill(style, y0 = 0, y1 = H) {
    g.fillStyle = style;
    for (const p of paint) { const a = Math.max(p.y, y0), b = Math.min(p.y + p.h, y1); if (b > a) g.fillRect(p.x, a, p.w, b - a); }
  }
  const shows = (x, y) => paint.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  function draw(t) {
    const tod = HOURS[hourForce || hour];
    blit(sky); // opaque: every frame starts from it, nothing to clear
    if (flash > 0) fill(`rgba(190,180,230,${flash * 0.3})`, 0, H * 0.8);
    // clouds drifting over, lit from inside by lightning (only the top of the window: one plain clip a rect)
    const cw = clouds.width / Math.min(1, dpr), chh = clouds.height / Math.min(1, dpr), off = -(drift % cw);
    for (const p of paint) {
      if (p.y >= chh) continue;
      g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, Math.min(p.h, chh - p.y)); g.clip();
      g.globalAlpha = Math.min(1, 0.55 + wx.fog * 0.3 + wx.rain * 0.35);
      g.drawImage(clouds, off, 0, cw, chh); g.drawImage(clouds, off + cw, 0, cw, chh);
      if (flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = flash * 0.8; g.drawImage(clouds, off, 0, cw, chh); g.drawImage(clouds, off + cw, 0, cw, chh); }
      g.restore();
    }
    if (car && shows(car.x, car.y)) {
      if (car.plane) { const s = (t % 1300) < 90; g.fillStyle = s ? 'rgba(255,246,230,0.85)' : 'rgba(255,230,200,0.22)'; g.fillRect(car.x, car.y, 1.5, 1.5); }
      else { g.fillStyle = Math.floor(t / 400) % 2 ? 'rgba(230,96,70,0.75)' : 'rgba(230,96,70,0.2)'; g.fillRect(car.x, car.y, 2, 2); g.fillStyle = 'rgba(255,230,190,0.45)'; g.fillRect(car.x + (car.v > 0 ? 3 : -5), car.y + 1, 2, 1); }
    }
    blit(city);
    for (const l of lamps) if (l.level > 0.02) { g.fillStyle = rgba(l.tone, l.a * l.level); g.fillRect(l.x, l.y, l.w, l.h); }
    for (const b of beacons) {
      if (!b.shows) continue;
      const lit = ((t + b.phase) % b.rate) < 160;
      g.fillStyle = lit ? 'rgba(226,84,60,0.85)' : 'rgba(226,84,60,0.14)'; g.fillRect(b.x - 1, b.y - 1, 2.5, 2.5);
      if (lit) { g.fillStyle = 'rgba(226,84,60,0.08)'; g.fillRect(b.x - 4, b.y - 4, 8.5, 8.5); }
    }
    for (const s of signs) { g.globalAlpha = s.level * tod.sign * (1 - wx.fog * 0.35); g.drawImage(s.img, s.x, s.y, s.w, s.h); }
    // wet: the signs and lamps smear on the walls and the street while it rains
    if (wx.rain > 0.02) { g.globalAlpha = Math.min(1, wx.rain * 1.1) * (0.5 + tod.sign * 0.5); g.globalCompositeOperation = 'lighter'; blit(wet); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1;
    if (flash > 0) fill(`rgba(200,190,240,${flash * 0.07})`);
    // haze: smog hangs low, fog swallows everything
    const fog = g.createLinearGradient(0, 0, 0, H), [hr, hg, hb] = tod.haze;
    fog.addColorStop(0, `rgba(30,22,26,${0.15 + wx.fog * 0.45})`); fog.addColorStop(0.7, `rgba(${hr},${hg},${hb},${0.1 + wx.fog * 0.55})`); fog.addColorStop(1, `rgba(20,14,12,${0.2 + wx.fog * 0.4})`);
    fill(fog);
    // rain: three depths, the far ones short, slow and faint, the near ones longer and a little brighter
    if (drops.length) {
      const k = 0.6 + wx.rain * 0.4;
      for (let z = 0; z < 3; z++) {
        g.strokeStyle = `rgba(178,176,190,${[0.09, 0.14, 0.19][z] * k})`; g.lineWidth = [0.5, 0.7, 0.9][z]; g.beginPath();
        for (const d of drops) if (d.z === z) { g.moveTo(d.x, d.y); g.lineTo(d.x - wx.wind * d.len * 0.5, d.y - d.len); }
        g.stroke();
      }
    }
    // beads on the glass, in passes (their trails, the drops, the light caught in them)
    if (beads.length) {
      g.fillStyle = 'rgba(200,190,180,0.05)';
      for (const b of beads) if (b.trail > 1) g.fillRect(b.x - b.r * 0.4, b.y - b.trail, b.r * 0.8, b.trail);
      g.fillStyle = 'rgba(12,10,12,0.5)'; g.beginPath();
      for (const b of beads) { g.moveTo(b.x + b.r, b.y); g.arc(b.x, b.y, b.r, 0, 7); }
      g.fill();
      g.fillStyle = `rgba(255,214,170,${0.16 + flash * 0.4})`;
      for (const b of beads) g.fillRect(b.x - b.r * 0.4, b.y - b.r * 0.5, 1, 1);
      g.fillStyle = 'rgba(255,190,120,0.06)'; // the city's light caught underneath
      for (const b of beads) g.fillRect(b.x - b.r * 0.5, b.y + b.r * 0.3, b.r, 0.6);
    }
    blit(glass);
    if (desk) { // the desk isn't behind glass
      g.drawImage(deskImg, 0, H - desk, W, desk);
      if (flash > 0) { g.fillStyle = `rgba(200,195,240,${flash * 0.07})`; g.fillRect(0, H - desk, W, desk); }
    }
  }

  // The loop: about 20 frames a second while it shows, some wall shows at this size, the tab is visible and things
  // may move. Otherwise nothing runs between frames.
  const running = () => raf !== 0;
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function start() { if (running() || !on || !sky || !strips.length || document.hidden || !canMove()) return; last = performance.now(); raf = requestAnimationFrame(frame); }
  function frame(t) {
    raf = 0;
    if (!on || document.hidden || !strips.length) return;
    if (!canMove()) { draw(t); return; } // Motion went off: hold this frame still
    raf = requestAnimationFrame(frame);
    if (t - last < 48) return;
    const dt = Math.min(0.2, (t - last) / 1000 || 0.05);
    last = t;
    step(dt); draw(t);
  }
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => on && build(), 150); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

  return {
    // Show or hide it (casing on and the Window setting on). Called on every render, so it also starts or stops
    // the motion when Motion is switched.
    set(show) {
      if (show === on) { if (on && canMove()) start(); return; }
      on = show;
      if (!on) { stop(); canvas.remove(); return; }
      document.body.prepend(canvas);
      requestAnimationFrame(() => {
        build();
        onWeather(name, WEATHER[name]);
        start();
      });
    },
    // Layout changed (the monitor moved): re-measure the strips.
    remeasure() { if (on) build(); },
    // Force a weather (weather <name>), or null to follow the clock again.
    force(w) { override = WEATHER[w] ? w : null; },
    // Show another hour (`?tod=night|dawn|day|dusk`), or null to follow the clock.
    hour(h) { hourForce = HOURS[h] ? h : null; if (on && W) build(); },
    get weather() { return name; },
  };
}
