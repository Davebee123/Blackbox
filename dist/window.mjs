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
//
// The view is a district (DISTRICTS): the Sprawl is the city above, as it always was; the others are other parts of
// the same city drawn by the same engine, in the same calm warm light, each brought by an achievement (casing.mjs
// districtOpen): Backhaul's rail yards, The Stacks' server towers, Coldline's harbour and Tar Beach's rooftops. Each
// paints its still layers once (the city, and for some a near layer in front of what moves) and adds its own few
// movers (a train, steam and status lights, a lighthouse and a ship, a sign's chaser bulbs), drawn only where the
// window shows, under the same rules: Motion off holds them still, a hidden tab stops them.
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
// The districts: their name, a line on what you see, the lights each one adds (warm, like the signs: never teal,
// violet or a threat's red) and how much fog it keeps of its own (a harbour's). The Sprawl is the default and always
// open; the rest come with achievements (casing.mjs DISTRICT_FROM).
export const DISTRICTS = {
  sprawl: { name: 'The Sprawl', tip: 'Stacked towers, fire escapes and neon down a wet street.', palette: NEON, fog: 0 },
  backhaul: { name: 'Backhaul', tip: 'Rail yards: floodlight masts, signal gantries and catenary, and now and then a slow train\'s lit windows.', palette: ['#f1b92f', '#f2dcb8', '#ffa860'], fog: 0.04 },
  stacks: { name: 'The Stacks', tip: 'Server towers: rack-faced blocks with tiny blinking status lights, cooling stacks venting steam.', palette: ['#f1b92f', '#f2dcb8', '#ffa860', '#e8707f'], fog: 0.02 },
  coldline: { name: 'Coldline', tip: 'The harbour: cranes, container stacks, black water, fog, and a lighthouse sweeping far off.', palette: ['#f1b92f', '#f2dcb8', '#ffa860'], boxes: ['#4a2e22', '#4a3c24', '#33302a', '#3d2a2c', '#2e2c28', '#46381f'], fog: 0.18 },
  tarbeach: { name: 'Tar Beach', tip: 'Up on the roofs: water tanks close by, bulkheads and a sign\'s bulbs, the skyline across the way.', palette: ['#ffd9a0', '#f1b92f', '#ffa860'], fog: 0.03 },
};
export const DISTRICT_IDS = Object.keys(DISTRICTS);
// Each district's own randomness (the Sprawl's pair is the one it always had), so each is the same place every visit.
const SEEDS = { sprawl: [4242, 8117], backhaul: [5151, 9203], stacks: [6173, 7741], coldline: [8269, 3319], tarbeach: [7307, 1559] };

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
  // the district shown, its near layer (drawn over its movers; null when it has none) and its movers
  let district = 'sprawl', front = null, movers = [], frameMs = 0, frames = 0;

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
    // Each district has its own pair (the Sprawl's are the ones it always had).
    const [s1, s2] = SEEDS[district] || SEEDS.sprawl, r = seeded(s1), d = seeded(s2);
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
    lamps = []; beacons = []; signs = []; movers = []; front = null;
    let fx = null; // the near layer, made only for a district that draws in front of its movers
    const near = () => { if (!fx) [front, fx] = layer(); return fx; };
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
    if (district !== 'sprawl') PAINT[district]({ x, wx2, near, r, d, tod, haze, tower });
    else {
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
    city = slice(city); wet = slice(wet, 1); if (front) front = slice(front);
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
    for (const m of movers) m.ready?.();
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

  // ---------- the other districts ----------
  // Each paints its still layers once, in the Sprawl's habits: far blocks, the hazes between depths, the parts in each
  // side strip placed for the strip (it is only a few dozen pixels wide), and the tall ones reaching up into the band
  // over the monitor. What moves is a mover: { step(dt), back(t) (under the near layer), over(t) (on it), ready() (once
  // the layers are cut) }, each drawing only where the window shows.
  const street = () => H - Math.max(34, desk); // the ground, just above the sill or the desk
  const inStrip = (px) => strips.find((s) => px >= s.x && px < s.x + s.w) || null;
  // whole inside one piece of the window (so a mover never draws where the monitor stands)
  const within = (x0, y0, w, h) => paint.some((p) => x0 >= p.x && y0 >= p.y && x0 + w <= p.x + p.w && y0 + h <= p.y + p.h);
  function glow(c, gx, gy, rad, rgb, a) {
    const b = c.createRadialGradient(gx, gy, 0, gx, gy, rad);
    b.addColorStop(0, rgba(rgb, a)); b.addColorStop(0.3, rgba(rgb, a * 0.35)); b.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = b; c.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
  }
  function sprite(rad, rgb, a) { // a soft round light or puff, drawn once and stamped each frame
    const c = document.createElement('canvas'); c.width = c.height = Math.max(2, Math.ceil(rad * 2 * dpr));
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); glow(x, rad, rad, rad, rgb, a); return c;
  }
  // a low line of blocks far off, a light here and there
  function farBlocks(x, d, tod, top0, span, col = '#120c11', gap = [10, 26], wid = [14, 34]) {
    for (let at = -10; at < W; at += gap[0] + d() * gap[1]) {
      const w = wid[0] + d() * wid[1], top = top0 + d() * span;
      x.fillStyle = col; x.fillRect(at, top, w, H - top);
      for (let y = top + 3; y < H; y += 4) if (d() < 0.12 * tod.lit) { x.fillStyle = `rgba(241,170,70,${0.08 + d() * 0.12})`; x.fillRect(at + 1 + d() * (w - 3), y, 1.5, 1); }
    }
  }
  // megatowers far off, their crowns in the band, a warning light on each
  function megas(x, r, d, tod, gap = [0.1, 0.12], lift = 1) { // lift < 1: their crowns stand higher in the band
    for (let at = W * (0.05 + r() * 0.08); at < W; at += W * (gap[0] + r() * gap[1])) {
      const w = 12 + r() * 18, top = band ? band * (0.7 + r() * 0.45) * lift + 6 : H * (0.04 + r() * 0.1);
      x.fillStyle = '#060407'; x.fillRect(at, top, w, H - top);
      x.fillRect(at + w * 0.2, top - 4, w * 0.6, 4); x.fillRect(at + w * 0.45, top - 14 - r() * 10, 1.5, 16 + r() * 10);
      x.fillRect(at - 1, top + 2, w + 2, 1.5);
      for (let y = top + 6; y < H; y += 5) if (r() < 0.3) { x.fillStyle = `rgba(241,170,70,${(0.15 + r() * 0.25) * tod.lit})`; x.fillRect(at + 2 + r() * (w - 5), y, 2, 1.5); }
      x.fillStyle = 'rgba(255,200,160,0.09)'; x.fillRect(at, top, 1, H - top);
      beacons.push({ x: at + w * 0.45, y: top - 15, rate: 900 + r() * 900, phase: r() * 2000, shows: false });
    }
  }
  // a sodium lamp on a post, its bloom, and its streak on the wet ground
  function lampPost(x, wx2, lx, ly, rad = 40) {
    glow(x, lx, ly, rad, [255, 176, 96], 0.3);
    x.fillStyle = 'rgba(255,214,160,0.75)'; x.fillRect(lx - 1.5, ly - 0.5, 3, 1.2);
    x.fillStyle = 'rgba(10,8,8,0.9)'; x.fillRect(lx + 1, ly, 1, H - ly);
    const st = wx2.createLinearGradient(0, ly + 4, 0, H);
    st.addColorStop(0, 'rgba(255,170,90,0.16)'); st.addColorStop(1, 'rgba(255,170,90,0)');
    wx2.fillStyle = st; wx2.fillRect(lx - 2.5, ly + 4, 5, H - ly);
  }
  // a steel lattice: two chords and X bracing (a gantry's post or beam, a crane's leg or boom)
  function lattice(c, x0, y0, w, h, col, horizontal = false) {
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 0.6; c.beginPath();
    if (horizontal) {
      c.fillRect(x0, y0, w, 1.2); c.fillRect(x0, y0 + h - 1.2, w, 1.2);
      for (let px = x0; px < x0 + w - 0.1; px += h * 1.3) { const p1 = Math.min(x0 + w, px + h * 1.3); c.moveTo(px, y0); c.lineTo(p1, y0 + h); c.moveTo(px, y0 + h); c.lineTo(p1, y0); }
    } else {
      c.fillRect(x0, y0, 1.2, h); c.fillRect(x0 + w - 1.2, y0, 1.2, h);
      for (let py = y0; py < y0 + h - 0.1; py += w * 1.3) { const p1 = Math.min(y0 + h, py + w * 1.3); c.moveTo(x0, py); c.lineTo(x0 + w, p1); c.moveTo(x0 + w, py); c.lineTo(x0, p1); c.fillRect(x0, py, w, 0.8); }
    }
    c.stroke();
  }

  // Backhaul: the rail yards. The city low on the horizon under a wide sky, sawtooth depots, floodlight masts with
  // their heads up in the band, a signal gantry and the catenary in each strip, rails fanning out wet, a lit signal
  // box. Now and then a slow train runs through, its windows lit, behind the catenary's masts.
  function backhaul({ x, wx2, near, r, d, tod, haze }) {
    const g0 = street(), f = near(), P = DISTRICTS.backhaul.palette.map(hex);
    farBlocks(x, d, tod, H * 0.5, H * 0.13);
    haze(0.5);
    megas(x, r, d, tod, [0.17, 0.2]);
    haze(0.22);
    // the depots: long sheds, their sawtooth roofs' glazed faces lit from inside
    for (let at = -30; at < W; at += 60 + r() * 130) {
      const w = 60 + r() * 140, top = H * (0.6 + r() * 0.07), tw = 9 + r() * 5, th = 5 + r() * 4;
      x.fillStyle = '#0c090c'; x.fillRect(at, top, w, H - top);
      for (let tx = at; tx < at + w - tw; tx += tw) {
        x.fillStyle = '#0c090c'; x.beginPath(); x.moveTo(tx, top); x.lineTo(tx, top - th); x.lineTo(tx + tw, top); x.fill();
        if (d() < 0.25 + tod.lit * 0.5) { x.fillStyle = `rgba(241,170,70,${0.08 + d() * 0.14})`; x.fillRect(tx + 0.4, top - th + 1, 1.1, th - 1); }
      }
      x.fillStyle = 'rgba(255,220,180,0.05)'; x.fillRect(at, top, w, 0.8);
      const wy = top + 6 + d() * 8;
      for (let c = at + 3; c < at + w - 5; c += 6) if (d() < 0.45 * tod.lit) { x.fillStyle = rgba(windowTone(d()), 0.1 + d() * 0.2); x.fillRect(c, wy, 3, 2); }
    }
    haze(0.1);
    // the power line over the yards: lattice pylons (one in each strip), three wires sagging between them
    const pyl = strips.map((s) => s.x + s.w * (s.x === 0 ? 0.3 : 0.7));
    for (let at = W * (0.12 + r() * 0.08); at < W - W * 0.1; at += W * (0.2 + r() * 0.1)) if (!inStrip(at)) pyl.push(at);
    pyl.sort((a, b) => a - b);
    const ptop = band ? band * 0.55 : H * 0.12;
    for (const px of pyl) {
      x.fillStyle = '#0b080b'; x.strokeStyle = '#0b080b'; x.lineWidth = 0.7;
      x.beginPath(); x.moveTo(px - 8, H); x.lineTo(px - 2, ptop); x.lineTo(px + 2, ptop); x.lineTo(px + 8, H);
      for (let y = ptop + 10, k = 0; y < H; y += 14 + (y - ptop) * 0.08, k++) { const hw = 2 + (y - ptop) / (H - ptop) * 6, hw2 = 2 + (y + 14 - ptop) / (H - ptop) * 6; x.moveTo(px - hw, y); x.lineTo(px + hw2, y + 14); x.moveTo(px + hw, y); x.lineTo(px - hw2, y + 14); }
      x.stroke();
      for (const [cy, cw] of [[ptop + 4, 13], [ptop + 12, 10], [ptop + 20, 8]]) { x.fillRect(px - cw, cy, cw * 2, 1.4); x.fillRect(px - cw, cy, 0.8, 4); x.fillRect(px + cw - 0.8, cy, 0.8, 4); }
    }
    x.strokeStyle = 'rgba(14,10,12,0.9)'; x.lineWidth = 0.6; x.beginPath();
    for (let i = 0; i + 1 < pyl.length; i++) for (const [cy, cw] of [[ptop + 8, 13], [ptop + 16, 10], [ptop + 24, 8]]) for (const sgn of [-1, 1]) {
      const a = pyl[i] + sgn * cw, b = pyl[i + 1] + sgn * cw, sag = (b - a) * 0.08;
      x.moveTo(a, cy); x.quadraticCurveTo((a + b) / 2, cy + sag * 2, b, cy);
    }
    x.stroke();
    // high masts across the yards, their heads up in the band
    const masts = [];
    for (let at = W * (0.08 + r() * 0.06); at < W; at += W * (0.14 + r() * 0.12)) if (!inStrip(at)) masts.push(at);
    for (const mx of masts) {
      const top = band ? band * (0.35 + r() * 0.45) + 8 : H * (0.07 + r() * 0.1);
      x.fillStyle = '#0a080a'; x.fillRect(mx - 0.8, top, 1.6, g0 - top);
      x.fillRect(mx - 6, top - 3, 12, 3); x.fillRect(mx - 0.4, top - 7, 0.8, 4);
      x.fillStyle = 'rgba(255,214,160,0.85)'; for (let i = 0; i < 4; i++) x.fillRect(mx - 5 + i * 3, top - 2.4, 1.6, 1.1);
      glow(x, mx, top - 1, 38, [255, 190, 120], 0.15);
      const cone = x.createLinearGradient(0, top, 0, g0);
      cone.addColorStop(0, 'rgba(255,190,120,0.07)'); cone.addColorStop(1, 'rgba(255,190,120,0)');
      x.fillStyle = cone; x.beginPath(); x.moveTo(mx - 5, top); x.lineTo(mx + 5, top); x.lineTo(mx + 46, g0); x.lineTo(mx - 46, g0); x.fill();
      glow(wx2, mx, g0 - 8, 34, [255, 180, 100], 0.12); // its pool of light on the wet ballast
    }
    haze(0.05);
    // the yard: ballast and rails fanning out, the near ones further apart, wet on top
    const yard = H * 0.76, bg = x.createLinearGradient(0, yard, 0, H);
    bg.addColorStop(0, '#0d0a0b'); bg.addColorStop(1, '#060405');
    x.fillStyle = bg; x.fillRect(0, yard, W, H - yard);
    const rails = [];
    for (let y = yard + 3, gap = 4; y < g0 + 10; y += gap, gap *= 1.42) rails.push(y);
    for (const y of rails) {
      const sp = Math.max(1.4, (y - yard) * 0.1);
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, y - 1, W, 1 + sp);
      x.fillStyle = 'rgba(255,205,150,0.17)'; x.fillRect(0, y, W, 0.6); x.fillRect(0, y + sp, W, 0.6);
      wx2.fillStyle = 'rgba(255,190,120,0.12)'; wx2.fillRect(0, y, W, 0.8); wx2.fillRect(0, y + sp, W, 0.8);
    }
    const ty = rails.reduce((a, y) => (Math.abs(y - H * 0.82) < Math.abs(a - H * 0.82) ? y : a), rails[0]), wire = ty - 34;
    // the catenary over the train's track: the contact wire, the messenger sagging between masts, droppers
    x.fillStyle = 'rgba(20,16,18,0.95)'; x.fillRect(0, wire, W, 0.7);
    x.strokeStyle = 'rgba(20,16,18,0.9)'; x.lineWidth = 0.6; x.beginPath();
    const span = 90 + r() * 30, m0 = -r() * span;
    for (let mx = m0; mx < W; mx += span) { x.moveTo(mx, wire - 9); x.quadraticCurveTo(mx + span / 2, wire - 2, mx + span, wire - 9); }
    x.stroke();
    x.fillStyle = 'rgba(20,16,18,0.8)';
    for (let mx = m0; mx < W; mx += span) for (let k = 1; k < 8; k++) { const t = k / 8, px = mx + span * t, sag = 3.5 * 4 * t * (1 - t); x.fillRect(px, wire - 9 + sag, 0.5, 9 - sag); }
    // up close (the near layer, so the train passes behind): the catenary's masts, a signal gantry over the tracks
    for (const s of strips) {
      const dir = s.x ? -1 : 1;
      for (const mx of [s.x + s.w * (s.x === 0 ? 0.62 : 0.38)]) { // one mast in each strip, wherever the span falls
        f.fillStyle = '#070506'; f.fillRect(mx - 1.2, wire - 16, 2.4, ty + 6 - (wire - 16));
        f.fillRect(dir > 0 ? mx : mx - 14, wire - 12, 14, 1); f.fillRect(dir > 0 ? mx : mx - 10, wire - 1, 10, 0.8);
        f.fillStyle = 'rgba(255,210,170,0.07)'; f.fillRect(mx - 1.2, wire - 16, 0.6, ty + 6 - (wire - 16));
      }
      const gy = H * (0.57 + r() * 0.04), post = s.x === 0 ? s.x + s.w * 0.1 : s.x + s.w * 0.9 - 5;
      lattice(f, post, gy, 5, g0 - gy, '#080607');
      lattice(f, s.x, gy - 5, s.w, 5, '#080607', true);
      for (let i = 0; i < 2; i++) { // signal heads hung from the beam: one lamp lit, amber or pale
        const hx = s.x + s.w * (0.3 + i * 0.35) + d() * 4, c = P[Math.floor(d() * P.length)];
        f.fillStyle = '#0b0809'; f.fillRect(hx, gy, 5, 11); f.fillStyle = 'rgba(0,0,0,0.6)'; f.fillRect(hx + 1, gy + 2, 3, 3); f.fillRect(hx + 1, gy + 6.5, 3, 3);
        const ly = gy + (d() < 0.5 ? 3.5 : 8);
        glow(f, hx + 2.5, ly, 9, c, 0.35); f.fillStyle = rgba(c, 0.95); f.fillRect(hx + 1.5, ly - 1, 2, 2);
        wx2.fillStyle = rgba(c, 0.07); wx2.fillRect(hx, ty - 6, 5, H - ty);
      }
      // in one strip, the yard's signal tower: a shaft, and its cab lit all the way round
      if (s === strips[strips.length - 1]) {
        const cw = s.w * 0.62, cx = s.x === 0 ? s.x + s.w * 0.08 : s.x + s.w * 0.92 - cw, cy = H * (0.4 + r() * 0.04);
        x.fillStyle = '#080608'; x.fillRect(cx + cw * 0.35, cy, cw * 0.3, g0 - cy);
        x.fillRect(cx - 2, cy - 3, cw + 4, 3); x.fillRect(cx, cy, cw, 14); x.fillRect(cx + cw * 0.5 - 0.4, cy - 12, 0.8, 9);
        x.fillStyle = 'rgba(255,206,150,0.55)'; x.fillRect(cx + 1.5, cy + 3, cw - 3, 6);
        x.fillStyle = 'rgba(20,14,12,0.7)'; for (let c = cx + 5; c < cx + cw - 2; c += 5) x.fillRect(c, cy + 3, 0.8, 6);
        x.fillStyle = 'rgba(30,20,16,0.5)'; x.fillRect(cx + 1.5, cy + 3, cw - 3, 1.5);
        glow(x, cx + cw / 2, cy + 6, 30, [255, 190, 120], 0.16);
        x.fillStyle = 'rgba(255,214,170,0.08)'; x.fillRect(cx + cw * 0.35, cy + 14, 0.7, g0 - cy - 14);
      }
      // a signal box at the yard's edge: a lit window, its glow on the wet
      if (r() < 0.75) {
        const bw = s.w * 0.55, bx = s.x === 0 ? s.x + s.w * 0.4 : s.x + s.w * 0.05, by = g0 - 30;
        x.fillStyle = '#0a0709'; x.fillRect(bx, by, bw, H - by); x.beginPath(); x.moveTo(bx - 2, by); x.lineTo(bx + bw / 2, by - 6); x.lineTo(bx + bw + 2, by); x.fill();
        x.fillStyle = 'rgba(255,206,150,0.5)'; x.fillRect(bx + 3, by + 6, bw - 6, 7);
        x.fillStyle = 'rgba(20,14,12,0.6)'; x.fillRect(bx + 3, by + 6, bw - 6, 2.5); for (let c = bx + 6; c < bx + bw - 4; c += 5) x.fillRect(c, by + 6, 0.7, 7);
        glow(x, bx + bw / 2, by + 10, 24, [255, 190, 120], 0.14);
        wx2.fillStyle = 'rgba(255,190,120,0.14)'; wx2.fillRect(bx + 3, g0 - 2, bw - 6, H - g0);
      }
    }
    // one small sign on a depot wall in one strip
    const ss = strips[Math.floor(r() * strips.length)];
    if (ss) signs.push(sign(ss.x + ss.w * (0.2 + r() * 0.3), H * (0.66 + r() * 0.03), 26 + r() * 12, 10, NEON[Math.floor(r() * NEON.length)], r, true));
    // The train: every two to four minutes (the first a little sooner), six to nine cars of lit windows, slowly.
    const CAR = 72, headGlow = sprite(14, [255, 214, 160], 0.5);
    let tr = null, wait = 25 + Math.random() * 40;
    movers.push({
      step(dt) {
        if (tr) { tr.x0 += tr.v * dt; if (tr.v > 0 ? tr.x0 > W + 30 : tr.x0 + tr.len < -30) { tr = null; wait = 120 + Math.random() * 120; } return; }
        if ((wait -= dt) > 0 || !strips.length) return;
        const ltr = Math.random() < 0.5, cars = 6 + Math.floor(Math.random() * 4), len = cars * CAR, wins = [];
        for (let c = 0; c < cars; c++) for (let o = 6; o < CAR - 8; o += 8) if (Math.random() < 0.85) wins.push({ o: c * CAR + o, c: rgba(windowTone(Math.random() * 0.8), 0.35 + Math.random() * 0.35) });
        tr = { x0: ltr ? -len - 30 : W + 30, v: (ltr ? 1 : -1) * (70 + Math.random() * 30), len, cars, wins };
      },
      back() {
        if (!tr) return;
        for (const s of strips) {
          const a = Math.max(s.x, tr.x0), b = Math.min(s.x + s.w, tr.x0 + tr.len);
          if (b <= a) continue;
          g.fillStyle = '#0b0909'; g.fillRect(a, ty - 18, b - a, 15);
          g.fillStyle = 'rgba(255,215,170,0.08)'; g.fillRect(a, ty - 18, b - a, 0.8);
          for (const w of tr.wins) { const wx0 = Math.max(a, tr.x0 + w.o), wx1 = Math.min(b, tr.x0 + w.o + 5); if (wx1 > wx0) { g.fillStyle = w.c; g.fillRect(wx0, ty - 14, wx1 - wx0, 4.5); } }
          g.fillStyle = 'rgba(0,0,0,0.9)';
          for (let c = 1; c < tr.cars; c++) { const gx = tr.x0 + c * CAR - 1.5; if (gx >= a && gx + 2 <= b) g.fillRect(gx, ty - 16, 2, 12); }
          for (let c = 0; c < tr.cars; c += 2) { // pantographs up to the wire, and now and then a spark
            const px = tr.x0 + c * CAR + CAR * 0.5;
            if (px < a || px + 8 > b) continue;
            g.fillStyle = 'rgba(20,16,18,0.95)'; g.fillRect(px, ty - 19, 8, 1); g.fillRect(px + 3.5, wire, 0.8, ty - 19 - wire);
            if (Math.random() < 0.006) { g.fillStyle = 'rgba(255,240,220,0.9)'; g.fillRect(px + 3, wire - 1, 2, 2); }
          }
        }
        const hx = tr.v > 0 ? tr.x0 + tr.len : tr.x0; // the headlamp
        if (inStrip(hx) && within(hx - 14, ty - 22, 28, 28)) { g.drawImage(headGlow, hx - 14, ty - 22, 28, 28); g.fillStyle = 'rgba(255,240,220,0.95)'; g.fillRect(hx - 1, ty - 9, 2, 2); }
      },
    });
  }

  // The Stacks: the server towers. Windowless blocks with rack-like faces (bays, units, vents) and tiny status lights,
  // cooling stacks venting steam up into the band, a rack face up close in each strip whose lights blink, cable trays
  // and a pipe across it.
  function stacks({ x, wx2, near, r, d, tod, haze }) {
    const g0 = street(), f = near(), P = DISTRICTS.stacks.palette.map(hex);
    const ledTone = (v) => (v < 0.55 ? P[0] : v < 0.8 ? P[1] : v < 0.97 ? P[2] : P[3]);
    const leds = [];
    // a rack-faced block: its bays, its units in fine slats, vent grilles, its lights (baked; up close some live)
    const rack = (x0, w, top, col, depth, live) => {
      x.fillStyle = col; x.fillRect(x0, top, w, H - top);
      x.fillStyle = `rgba(255,220,180,${0.04 + depth * 0.02})`; x.fillRect(x0, top, w, 1);
      x.fillStyle = `rgba(255,210,170,${0.03 + depth * 0.01})`; x.fillRect(d() < 0.5 ? x0 : x0 + w - 1, top, 1, H - top);
      const bay = 5 + depth * 4;
      x.fillStyle = 'rgba(0,0,0,0.4)'; for (let bx = x0 + bay; bx < x0 + w - 1; bx += bay) x.fillRect(bx, top + 2, 0.7, H - top);
      for (let y = top + 3; y < H; y += 1.6 + depth * 0.9) if (d() < 0.7) { x.fillStyle = `rgba(255,215,170,${0.012 + depth * 0.012})`; x.fillRect(x0 + 1, y, w - 2, 0.5); }
      for (let y = top + 8; y < H - 10; y += 30 + d() * 40) {
        if (d() >= 0.5) continue;
        const vw = Math.min(w - 4, bay * 2 - 2), vx = x0 + 2 + Math.floor(d() * Math.max(1, (w - vw - 4) / bay)) * bay, vh = 6 + depth * 2;
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(vx, y, vw, vh);
        x.fillStyle = 'rgba(255,215,170,0.03)'; for (let gy = y + 1; gy < y + vh; gy += 1.5) x.fillRect(vx, gy, vw, 0.4);
      }
      if (depth === 2) for (let y = top + 20 + d() * 20; y < H - 8; y += 34 + d() * 30) { // the hall inside, glowing through vent slits
        const a = (0.1 + d() * 0.14) * (0.4 + tod.lit * 0.6);
        for (let k = 0; k < 3; k++) { x.fillStyle = `rgba(255,190,120,${a * (k === 1 ? 1 : 0.6)})`; x.fillRect(x0 + 2, y + k * 1.6, w - 4, 0.6); }
        glow(x, x0 + w / 2, y + 2, w * 0.6, [255, 170, 100], a * 0.4);
      }
      for (let y = top + 5; y < H - 4; y += 3 + depth * 2.5) for (let bx = x0 + 1.5; bx < x0 + w - 2.5; bx += bay) {
        if (d() > 0.16 + depth * 0.12) continue;
        const c = ledTone(d()), lx = bx + 1 + d() * (bay - 3), a = (0.14 + d() * 0.26) * (0.45 + tod.lit * 0.55) * (depth ? 1.4 : 1);
        if (live && leds.length < 70 * strips.length && d() < 0.5) { leds.push({ x: lx, y, c: rgba(c, Math.min(1, a * 2.6)), mode: d() < 0.45 ? 'blink' : d() < 0.6 ? 'busy' : 'steady', rate: 600 + d() * 2600, phase: d() * 3000, on: true, shows: false }); continue; }
        x.fillStyle = rgba(c, a); x.fillRect(lx, y, depth ? 1.2 : 1, depth ? 1.2 : 0.8);
      }
    };
    for (let at = -10; at < W; at += 18 + d() * 30) { // far: monoliths, a few dots
      const w = 20 + d() * 40, top = H * (0.38 + d() * 0.2);
      x.fillStyle = '#110b10'; x.fillRect(at, top, w, H - top);
      for (let y = top + 4; y < H; y += 6) if (d() < 0.28) { x.fillStyle = `rgba(241,170,70,${(0.06 + d() * 0.1) * (0.5 + tod.lit * 0.5)})`; for (let c = at + 2; c < at + w - 2; c += 3) if (d() < 0.4) x.fillRect(c, y, 1, 0.8); }
    }
    haze(0.5);
    megas(x, r, d, tod, [0.14, 0.16]);
    haze(0.22);
    for (let at = -20; at < W; at += 16 + r() * 40) rack(at, 22 + r() * 46, H * (0.3 + r() * 0.24), '#0d0a0e', 0, false);
    haze(0.12);
    // cooling stacks: one in each strip, a few across the band, each with a warning light and a plume
    const plumes = [], xs = strips.map((s) => s.x + s.w * (s.x === 0 ? 0.55 + r() * 0.25 : 0.2 + r() * 0.25));
    for (let at = W * (0.1 + r() * 0.08); at < W; at += W * (0.16 + r() * 0.14)) xs.push(at);
    for (const [k, cx] of xs.entries()) { // the strips' stacks stand lower, so their steam rises in the strip
      const w = 10 + r() * 8, top = k < strips.length ? H * (0.13 + r() * 0.1) : band ? band * (0.55 + r() * 0.5) + 8 : H * (0.1 + r() * 0.12), x0 = cx - w / 2;
      const sh = x.createLinearGradient(x0, 0, x0 + w, 0);
      sh.addColorStop(0, '#060406'); sh.addColorStop(0.35, '#17111a'); sh.addColorStop(1, '#050305');
      x.fillStyle = sh; x.fillRect(x0, top, w, H - top);
      x.fillStyle = '#0a070a'; x.fillRect(x0 - 1.5, top, w + 3, 2.5);
      for (let y = top + 16; y < H; y += 20 + d() * 12) { x.fillStyle = 'rgba(255,220,180,0.05)'; x.fillRect(x0, y, w, 0.7); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(x0, y + 0.7, w, 0.7); }
      x.fillStyle = 'rgba(255,200,150,0.08)'; x.fillRect(x0 + w * 0.3, top + 2.5, 0.8, H - top);
      glow(x, cx, top - 3, w * 1.8, [255, 170, 100], 0.07);
      beacons.push({ x: x0 + w - 1.5, y: top + 1, rate: 1500 + r() * 900, phase: r() * 2000, shows: false });
      plumes.push({ x: cx, y: top, w, acc: Math.random(), live: false });
    }
    haze(0.06);
    // up close: a rack face in each strip (its lights live), cable trays and a pipe across on the near layer
    for (const s of strips) {
      const w = s.w * (0.44 + r() * 0.12), top = H * (0.4 + r() * 0.1), nx = s.x === 0 ? s.x + s.w * 0.06 : s.x + s.w * 0.94 - w;
      rack(nx, w, top, '#050406', 2, true);
      for (let i = 0; i < 2; i++) { // cable trays, cables sagging out of them
        const cy = H * (0.47 + i * 0.17 + r() * 0.05);
        f.fillStyle = '#0a0809'; f.fillRect(s.x, cy, s.w, 3); f.fillStyle = 'rgba(255,215,170,0.07)'; f.fillRect(s.x, cy, s.w, 0.6);
        f.fillStyle = '#0a0809'; for (let bx = s.x + 4 + d() * 8; bx < s.x + s.w; bx += 16) f.fillRect(bx, cy + 3, 1, 4);
        f.strokeStyle = 'rgba(12,10,12,0.95)'; f.lineWidth = 0.9; f.beginPath();
        for (let k = 0; k < 3; k++) { const c0 = s.x + d() * s.w, c1 = c0 + (d() - 0.5) * 24; f.moveTo(c0, cy + 3); f.quadraticCurveTo((c0 + c1) / 2, cy + 10 + d() * 14, c1, cy + 3); }
        f.stroke();
      }
      const px = s.x + s.w * (s.x === 0 ? 0.75 : 0.2) + d() * 4; // a coolant pipe down the strip, its flanges
      f.fillStyle = '#0b090b'; f.fillRect(px, H * 0.3, 3, H); f.fillStyle = 'rgba(255,215,170,0.06)'; f.fillRect(px, H * 0.3, 0.7, H);
      f.fillStyle = '#0b090b'; for (let y = H * 0.3 + 30; y < H; y += 54) f.fillRect(px - 1, y, 5, 1.8);
      lampPost(x, wx2, s.x + s.w * (0.2 + d() * 0.6), g0 - 34 - d() * 40, 32);
      if (r() < 0.55) signs.push(sign(s.x + s.w * (s.x === 0 ? 0.62 : 0.22) + r() * s.w * 0.08, H * (0.26 + r() * 0.3), Math.min(14, Math.max(9, s.w * 0.12)), 50 + r() * 60, NEON[Math.floor(r() * NEON.length)], r));
    }
    // movers: the status lights on the near racks, and the steam from every stack that shows
    const puff = sprite(16, [200, 184, 170], 0.55);
    let puffs = [];
    const mover = {
      ready() {
        for (const p of plumes) p.live = shows(p.x, p.y - 4);
        for (const l of leds) l.shows = shows(l.x, l.y);
        puffs = []; for (let i = 0; i < 80; i++) mover.step(0.1); // already steaming in a still frame
      },
      step(dt) {
        for (const p of plumes) {
          if (!p.live) continue;
          p.acc += dt * 1.8;
          while (p.acc > 1) { p.acc--; puffs.push({ x: p.x + (Math.random() - 0.5) * p.w * 0.5, y: p.y - 2, r: p.w * 0.55, vy: -(7 + Math.random() * 6), vx: (Math.random() - 0.5) * 3, age: 0, life: 6 + Math.random() * 4 }); }
        }
        for (const q of puffs) { q.age += dt; q.x += (q.vx + wx.wind * 24 + 2) * dt; q.y += q.vy * dt; q.vy *= 1 - dt * 0.15; q.r += dt * 3.4; }
        puffs = puffs.filter((q) => q.age < q.life);
        for (const l of leds) if (l.mode === 'busy' && Math.random() < dt * 8) l.on = Math.random() < 0.6;
      },
      back(t) {
        for (const l of leds) {
          if (!l.shows) continue;
          const lit = l.mode === 'blink' ? ((t + l.phase) % l.rate) < l.rate * 0.5 : l.mode === 'busy' ? l.on : true;
          if (lit) { g.fillStyle = l.c; g.fillRect(l.x, l.y, 1.2, 1.2); }
        }
        for (const q of puffs) {
          if (!within(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2)) continue;
          g.globalAlpha = Math.min(1, q.age / 0.8) * (1 - q.age / q.life) * (0.7 + wx.fog * 0.3);
          g.drawImage(puff, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
        }
        g.globalAlpha = 1;
      },
    };
    movers.push(mover);
  }

  // Coldline: the harbour. A far shore low across black water, a lighthouse on its point sweeping the haze, cranes
  // along the quay (one great one straddling the view: its legs up close in the strips, its boom across the band),
  // container stacks, quay lamps; fog of its own. Now and then a ship slides past far out.
  function coldline({ x, wx2, near, r, d, tod, haze }) {
    const g0 = street(), f = near(), P = DISTRICTS.coldline.palette.map(hex), BOX = DISTRICTS.coldline.boxes;
    const horizon = H * 0.6, quay = H * 0.76;
    farBlocks(x, d, tod, horizon - H * 0.07, H * 0.06, '#130d11', [14, 40], [10, 30]);
    haze(0.55);
    // the lighthouse on its spit, in the first strip
    const ls = strips[0], Lx = ls ? ls.x + ls.w * (ls.x === 0 ? 0.35 : 0.65) : -99, Ly = horizon - 13;
    if (ls) {
      x.fillStyle = '#0e0a0d'; x.beginPath(); x.moveTo(Lx - 26, horizon); x.quadraticCurveTo(Lx, horizon - 6, Lx + 26, horizon); x.fill();
      x.beginPath(); x.moveTo(Lx - 2.2, horizon - 3); x.lineTo(Lx - 1.3, Ly); x.lineTo(Lx + 1.3, Ly); x.lineTo(Lx + 2.2, horizon - 3); x.fill();
      x.fillRect(Lx - 2, Ly - 0.5, 4, 1); x.fillStyle = 'rgba(255,230,190,0.5)'; x.fillRect(Lx - 1.2, Ly - 3, 2.4, 2.5);
      x.fillStyle = '#0e0a0d'; x.beginPath(); x.moveTo(Lx - 1.8, Ly - 3); x.lineTo(Lx, Ly - 5.5); x.lineTo(Lx + 1.8, Ly - 3); x.fill();
    }
    // cranes along the quay: booms out over the water or raised, a light at each top
    const crane = (cx, foot, h, col, dir, raised) => {
      const top = foot - h, lw = h * 0.28, py = top + h * 0.3, mid = cx + lw / 2;
      x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 0.8;
      x.fillRect(cx, py, 1.3, foot - py); x.fillRect(cx + lw, py, 1.3, foot - py); x.fillRect(cx - 1, py, lw + 3.3, 2);
      x.fillRect(cx - 1, py + (foot - py) * 0.55, lw + 3.3, 1.2);
      x.beginPath(); x.moveTo(cx, py); x.lineTo(mid, top); x.lineTo(cx + lw + 1.3, py);
      if (raised) { x.moveTo(mid, py); x.lineTo(mid + dir * h * 0.18, top - h * 0.28); x.lineTo(mid, top); }
      else { x.moveTo(mid, top); x.lineTo(mid + dir * h * 0.8, py - 2); x.moveTo(mid, top); x.lineTo(mid - dir * h * 0.3, py - 2); }
      x.stroke();
      if (!raised) {
        x.fillRect(Math.min(mid, mid + dir * h * 0.8), py - 3, h * 0.8, 1.6); x.fillRect(Math.min(mid, mid - dir * h * 0.3), py - 3, h * 0.3, 1.6);
        x.fillStyle = 'rgba(255,206,150,0.4)'; x.fillRect(mid + dir * h * 0.25, py - 1, 2.5, 1.5);
      }
      beacons.push({ x: raised ? mid + dir * h * 0.18 : mid, y: (raised ? top - h * 0.28 : top) - 1, rate: 1200 + r() * 1200, phase: r() * 2000, shows: false });
    };
    for (let at = W * (0.01 + r() * 0.04); at < W; at += W * (0.06 + r() * 0.07)) crane(at, quay, H * (0.12 + r() * 0.08), '#100b0e', r() < 0.5 ? -1 : 1, r() < 0.35);
    for (const s of strips) crane(s.x + s.w * (0.2 + r() * 0.3), quay + 4, H * (0.2 + r() * 0.06), '#0c080b', s.x === 0 ? 1 : -1, false);
    haze(0.16);
    // the water: dark, the shore's lights broken into streaks on it, the lighthouse's column
    const wg = x.createLinearGradient(0, horizon, 0, quay);
    wg.addColorStop(0, '#120c0e'); wg.addColorStop(1, '#070506');
    x.fillStyle = wg; x.fillRect(0, horizon, W, quay - horizon);
    for (let i = 0; i < W * 0.45; i++) {
      const y = horizon + 1 + Math.pow(d(), 1.7) * (quay - horizon - 3), len = 2 + d() * 9 * (1 + (y - horizon) / 50);
      x.fillStyle = `rgba(255,${(170 + d() * 40) | 0},${(90 + d() * 50) | 0},${0.03 + d() * 0.09})`; x.fillRect(d() * W, y, len, 0.7);
    }
    if (ls) for (let y = horizon + 1; y < quay; y += 2.2) { x.fillStyle = `rgba(255,226,180,${0.05 * (1 - (y - horizon) / (quay - horizon))})`; x.fillRect(Lx - 1 - d() * 3, y, 2 + d() * 6, 0.7); }
    // the quay, its edge catching the lamps; containers stacked on it
    x.fillStyle = '#0b0809'; x.fillRect(0, quay, W, H - quay); x.fillStyle = 'rgba(255,220,180,0.09)'; x.fillRect(0, quay, W, 0.8);
    const box = (bx, by, bw, bh, depth) => {
      const c = hex(BOX[Math.floor(r() * BOX.length)]), k = [0.45, 0.7, 1][depth];
      x.fillStyle = rgba(c.map((v) => Math.round(v * k)), 1); x.fillRect(bx, by, bw, bh);
      x.fillStyle = 'rgba(0,0,0,0.28)'; for (let cx = bx + 1; cx < bx + bw - 0.5; cx += 1.6 + depth * 0.4) x.fillRect(cx, by + 0.8, 0.5, bh - 1.6);
      x.fillStyle = 'rgba(255,220,180,0.07)'; x.fillRect(bx, by, bw, 0.6); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(bx, by + bh - 0.7, bw, 0.7);
      if (depth === 2) { x.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 1; i <= 4; i++) x.fillRect(bx + bw * i / 5, by + 1, 0.7, bh - 2); x.fillStyle = 'rgba(255,230,200,0.08)'; x.fillRect(bx + 2, by + 2, Math.min(10, bw * 0.3), 1); }
    };
    for (let at = -20; at < W; at += 20 + r() * 50) {
      const bw = r() < 0.5 ? 24 : 12, tiers = 1 + Math.floor(r() * 4), base = quay + 9 + r() * 6;
      for (let i = 0; i < tiers; i++) box(at, base - (i + 1) * 6, bw, 6, 0);
    }
    for (let at = -20; at < W; at += 30 + r() * 60) {
      const bw = r() < 0.5 ? 34 : 17, tiers = 1 + Math.floor(r() * 3), base = quay + 26 + r() * 10;
      for (let i = 0; i < tiers; i++) box(at, base - (i + 1) * 9, bw, 9, 1);
    }
    for (const s of strips) {
      lampPost(x, wx2, s.x + s.w * (0.25 + d() * 0.5), quay + 2 - d() * 20, 44);
      // up close: a stack of boxes right by the glass, their doors and lock rods, bollards at their feet
      const bw = s.w * (0.5 + r() * 0.15), bx = s.x === 0 ? s.x + s.w * 0.04 : s.x + s.w * 0.96 - bw, tiers = 5 + Math.floor(r() * 4);
      for (let i = 0; i < tiers; i++) box(bx, g0 + 6 - (i + 1) * 14, bw, 14, 2);
      wx2.fillStyle = 'rgba(255,180,100,0.05)'; wx2.fillRect(bx, g0 + 6 - tiers * 14, bw, tiers * 14);
      for (let i = 0; i < 3; i++) { const bx2 = s.x + s.w * (0.15 + i * 0.3) + d() * 4; x.fillStyle = '#080607'; x.fillRect(bx2, g0 - 6, 4, 6); x.fillRect(bx2 - 0.5, g0 - 7, 5, 1.5); }
    }
    // the great crane: its legs up close in the strips (the near layer), its boom across the band
    if (band) {
      const by = Math.max(14, band * 0.45);
      for (const s of strips) lattice(f, s.x === 0 ? s.x + s.w * 0.66 : s.x + s.w * 0.18, by, Math.min(7, s.w * 0.16), g0 - by, '#070506');
      lattice(f, 0, by, W, 7, '#070506', true);
      f.fillStyle = '#070506'; f.fillRect(0, by - 2, W, 2);
      for (let lx = W * (0.03 + r() * 0.03); lx < W; lx += W * (0.11 + r() * 0.06)) { glow(f, lx, by + 9, 7, P[0], 0.4); f.fillStyle = rgba(P[0], 0.9); f.fillRect(lx - 0.8, by + 8, 1.6, 1.6); }
      const tx = W * (0.25 + r() * 0.5); f.fillStyle = '#0a0709'; f.fillRect(tx, by + 7, 24, 9); f.fillStyle = 'rgba(255,206,150,0.45)'; f.fillRect(tx + 3, by + 10, 7, 3);
    }
    // movers: the lighthouse's beam swinging through the haze, glints on the water, and now and then a ship
    const BL = 200, BH = 30, beamR = document.createElement('canvas'), beamL = document.createElement('canvas');
    beamR.width = beamL.width = Math.ceil(BL * dpr); beamR.height = beamL.height = Math.ceil(BH * dpr);
    for (const [c, flip] of [[beamR, false], [beamL, true]]) {
      const b = c.getContext('2d'); b.setTransform(flip ? -dpr : dpr, 0, 0, dpr, flip ? c.width : 0, 0);
      const gr = b.createLinearGradient(0, 0, BL, 0); gr.addColorStop(0, 'rgba(255,236,200,0.5)'); gr.addColorStop(1, 'rgba(255,236,200,0)');
      b.fillStyle = gr; b.beginPath(); b.moveTo(0, BH / 2 - 1); b.lineTo(BL, 0); b.lineTo(BL, BH); b.lineTo(0, BH / 2 + 1); b.fill();
    }
    const lamp = sprite(10, [255, 236, 200], 0.8), glints = [];
    for (const s of strips) for (let i = 0; i < 14; i++) glints.push({ x: s.x + Math.random() * (s.w - 6), y: horizon + 2 + Math.random() * (quay - horizon - 6), w: 1 + Math.random() * 4, a: 0, rate: 0.5 + Math.random() * 2, ph: Math.random() * 6 });
    let ship = null, wait = 40 + Math.random() * 60, ang = Math.random() * 6.28, clock = 0;
    movers.push({
      step(dt) {
        clock += dt; ang = (ang + dt * 0.55) % 6.283;
        for (const gl of glints) gl.a = Math.sin(clock * gl.rate + gl.ph) * 0.5 + (Math.random() - 0.5) * 0.2;
        if (ship) { ship.x += ship.v * dt; if (ship.v > 0 ? ship.x > W + 20 : ship.x + ship.len < -20) { ship = null; wait = 90 + Math.random() * 120; } }
        else if ((wait -= dt) <= 0 && strips.length) {
          const ltr = Math.random() < 0.5, len = 110 + Math.random() * 60;
          ship = { x: ltr ? -len - 20 : W + 20, v: (ltr ? 1 : -1) * (10 + Math.random() * 6), len, y: horizon + (quay - horizon) * (0.25 + Math.random() * 0.2), wins: Array.from({ length: Math.floor(len / 5) }, () => Math.random() < 0.55) };
        }
      },
      back() {
        g.fillStyle = 'rgba(255,214,170,0.55)';
        for (const gl of glints) if (gl.a > 0.25) { g.globalAlpha = Math.min(1, gl.a); g.fillRect(gl.x, gl.y, gl.w, 0.7); }
        g.globalAlpha = 1;
        if (ship) for (const s of strips) {
          const a = Math.max(s.x, ship.x), b = Math.min(s.x + s.w, ship.x + ship.len);
          if (b <= a) continue;
          g.fillStyle = '#080607'; g.fillRect(a, ship.y - 5, b - a, 5);
          const bx = ship.x + ship.len * (ship.v > 0 ? 0.15 : 0.7), bx1 = Math.max(a, bx), bx2 = Math.min(b, bx + ship.len * 0.15);
          if (bx2 > bx1) g.fillRect(bx1, ship.y - 11, bx2 - bx1, 6);
          g.fillStyle = 'rgba(255,214,160,0.55)';
          ship.wins.forEach((lit, i) => { const wx0 = ship.x + 3 + i * 5; if (lit && wx0 >= a && wx0 + 1.5 <= b) g.fillRect(wx0, ship.y - 3.5, 1.5, 1); });
          const mx = ship.x + ship.len * 0.5;
          if (mx >= a && mx < b) { g.fillStyle = '#080607'; g.fillRect(mx, ship.y - 18, 0.8, 13); g.fillStyle = 'rgba(255,240,220,0.8)'; g.fillRect(mx - 0.4, ship.y - 19, 1.6, 1.6); }
        }
        if (!ls) return;
        // the beam: long through the haze when it points along the shore, a flare when it turns to face us
        const p = paint.find((q) => Lx >= q.x && Lx < q.x + q.w && Ly >= q.y && Ly < q.y + q.h);
        if (!p) return;
        const side = Math.cos(ang), face = Math.sin(ang), fogA = 0.5 + Math.min(1, wx.fog + 0.18) * 0.6;
        const room = side > 0 ? p.x + p.w - Lx : Lx - p.x, len = Math.min(room, BL * Math.abs(side)), bh = BH * (0.35 + 0.65 * Math.abs(side));
        g.globalCompositeOperation = 'lighter';
        if (len > 2) {
          g.globalAlpha = Math.min(1, Math.abs(side) * 0.8 * fogA * (face > 0 ? 1 : 0.6));
          g.drawImage(side > 0 ? beamR : beamL, side > 0 ? 0 : beamR.width - len * dpr, 0, len * dpr, beamR.height, side > 0 ? Lx : Lx - len, Ly - 1.5 - bh / 2, len, bh);
        }
        g.globalAlpha = 0.25 + Math.max(0, face) ** 8 * 0.75; g.drawImage(lamp, Lx - 10, Ly - 11.5, 20, 20);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      },
    });
  }

  // Tar Beach: up on the roofs. The skyline across the way (megatowers, two depths of towers), roofs stepping down
  // toward the glass with parapets, bulkheads with a lit door, vents and skylights, a big water tank close in each
  // strip, the near parapet; a rooftop sign seen from behind, its bulbs chasing.
  function tarbeach({ x, wx2, near, r, d, tod, haze, tower }) {
    const f = near(), P = DISTRICTS.tarbeach.palette.map(hex);
    farBlocks(x, d, tod, H * 0.36, H * 0.12);
    haze(0.5);
    megas(x, r, d, tod, [0.08, 0.1], 0.75);
    haze(0.22);
    for (let at = -20; at < W; at += 12 + r() * 32) tower(at, 18 + r() * 42, H * (0.22 + r() * 0.24), '#0d0a0e', 0.06, 2, 0);
    haze(0.12);
    for (let at = -30; at < W; at += 22 + r() * 46) tower(at, 26 + r() * 52, H * (0.34 + r() * 0.16), '#09080b', 0.1, 3, 1);
    haze(0.05);
    // the streets' light welling up between the roofs
    for (let at = W * d() * 0.1; at < W; at += 80 + d() * 140) glow(x, at, H * (0.6 + d() * 0.08), 50 + d() * 60, [255, 168, 80], 0.08);
    // a water tank on its stand: barrel of staves, hoops, a cone of a lid, legs and bracing, a ladder
    const tank = (c, tx, base, tw, col, depth) => {
      const th = tw * 1.05, legs = tw * 0.55, top = base - legs - th;
      c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 0.6 + depth * 0.3;
      c.fillRect(tx + tw * 0.08, base - legs, 1 + depth * 0.4, legs); c.fillRect(tx + tw * 0.92 - 1, base - legs, 1 + depth * 0.4, legs); c.fillRect(tx + tw * 0.5 - 0.5, base - legs, 1, legs);
      c.beginPath(); c.moveTo(tx + tw * 0.08, base - legs); c.lineTo(tx + tw * 0.5, base); c.lineTo(tx + tw * 0.92, base - legs); c.moveTo(tx + tw * 0.08, base); c.lineTo(tx + tw * 0.5, base - legs); c.lineTo(tx + tw * 0.92, base); c.stroke();
      c.fillRect(tx - 1, base - legs - 1.5, tw + 2, 1.5);
      c.fillRect(tx, top, tw, th);
      c.beginPath(); c.moveTo(tx - 1, top); c.lineTo(tx + tw / 2, top - tw * 0.32); c.lineTo(tx + tw + 1, top); c.fill();
      c.fillRect(tx + tw / 2 - 0.5, top - tw * 0.32 - 3, 1, 3);
      if (!depth) return;
      c.fillStyle = 'rgba(0,0,0,0.3)'; for (let sx = tx + 2; sx < tx + tw - 1; sx += 2.4) c.fillRect(sx, top + 1, 0.5, th - 2);
      for (let hy = top + th * 0.12; hy < top + th; hy += th / 6) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(tx, hy, tw, 1); c.fillStyle = 'rgba(255,215,170,0.07)'; c.fillRect(tx, hy - 0.5, tw, 0.5); }
      c.fillStyle = 'rgba(255,200,150,0.1)'; c.fillRect(tx + tw - 2, top, 2, th); c.fillStyle = 'rgba(255,200,150,0.05)'; c.beginPath(); c.moveTo(tx + tw / 2, top - tw * 0.32); c.lineTo(tx + tw + 1, top); c.lineTo(tx + tw / 2, top); c.fill(); // the city's glow down one side
      c.fillStyle = col; for (let ly = top - 2; ly < base; ly += 3) c.fillRect(tx - 3, ly, 2.5, 0.6);
      c.fillRect(tx - 3, top - 2, 0.6, base - top + 2); c.fillRect(tx - 0.5, top - 2, 0.6, base - top + 2);
    };
    // the roofs, three rows stepping down toward us
    for (let row = 0; row < 3; row++) {
      const col = ['#0c090c', '#09070a', '#070507'][row], base = H * (0.55 + row * 0.07);
      for (let at = -40 + r() * 30; at < W; at += 50 + r() * 120) {
        const w = 40 + r() * 110, top = base + r() * H * 0.035;
        x.fillStyle = col; x.fillRect(at, top, w, H - top);
        x.fillStyle = `rgba(255,220,180,${0.05 + row * 0.02})`; x.fillRect(at, top, w, 1); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(at, top + 1, w, 1.2);
        for (let c = at + 4; c < at + w - 6; c += 7) if (d() < 0.35 * tod.lit) { x.fillStyle = rgba(windowTone(d()), 0.12 + d() * 0.22); x.fillRect(c, top + 5 + row, 3 + row, 2.5 + row); }
        if (d() < 0.4) { // a bulkhead, its door lit
          const bx = at + w * (0.1 + d() * 0.6), bw = 8 + row * 4, bh = 7 + row * 3;
          x.fillStyle = col; x.fillRect(bx, top - bh, bw, bh); x.fillStyle = 'rgba(255,220,180,0.05)'; x.fillRect(bx, top - bh, bw, 0.7);
          if (d() < 0.6) { x.fillStyle = 'rgba(255,206,150,0.55)'; x.fillRect(bx + bw * 0.3, top - bh * 0.8, bw * 0.3, bh * 0.8); glow(x, bx + bw * 0.45, top - bh * 0.4, 10 + row * 4, [255, 190, 120], 0.12); }
        }
        if (d() < 0.35) tank(x, at + w * (0.5 + d() * 0.3), top, 7 + row * 4, col, row ? 1 : 0);
        if (d() < 0.4) { const vx = at + d() * w; x.fillStyle = col; x.fillRect(vx, top - 4 - row, 3 + row, 4 + row); x.beginPath(); x.arc(vx + 1.5 + row / 2, top - 4 - row, 1.8 + row * 0.6, Math.PI, 0); x.fill(); }
        if (d() < 0.3) { const sx = at + d() * (w - 12); x.fillStyle = `rgba(255,200,140,${0.05 + d() * 0.06})`; x.beginPath(); x.moveTo(sx, top - 0.5); x.lineTo(sx + 10, top - 0.5); x.lineTo(sx + 8, top - 3); x.lineTo(sx + 2, top - 3); x.fill(); }
        if (d() < 0.25) { const ax = at + d() * w; x.fillStyle = col; x.fillRect(ax, top - 12 - d() * 10, 0.8, 14 + row * 2); }
      }
    }
    // up close in each strip: a big tank on its stand, the near parapet along the bottom
    for (const s of strips) {
      const tw = s.w * (0.55 + r() * 0.12), tx = s.x === 0 ? s.x + s.w * 0.14 : s.x + s.w * 0.86 - tw, base = H * (0.62 + r() * 0.03);
      f.fillStyle = '#060405'; f.fillRect(s.x, base, s.w, H - base); // the roof we look across from, its edge lit
      f.fillStyle = 'rgba(255,220,180,0.09)'; f.fillRect(s.x, base, s.w, 1);
      tank(f, tx, base, tw, '#050406', 2);
      // string lights from the tank's stand to a pole, warm bulbs on a sagging wire
      const ax = tx + tw * 0.5, ay = base - tw * 0.4, bxp = s.x === 0 ? s.x + s.w * 0.96 : s.x + s.w * 0.04, by2 = base - 18;
      f.fillStyle = '#060405'; f.fillRect(bxp - 0.5, by2, 1, base - by2);
      f.strokeStyle = 'rgba(10,8,8,0.9)'; f.lineWidth = 0.5; f.beginPath(); f.moveTo(ax, ay); f.quadraticCurveTo((ax + bxp) / 2, Math.max(ay, by2) + 12, bxp, by2); f.stroke();
      for (let k = 1; k < 7; k++) {
        const t = k / 7, bx = (1 - t) * (1 - t) * ax + 2 * t * (1 - t) * (ax + bxp) / 2 + t * t * bxp, byy = (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * (Math.max(ay, by2) + 12) + t * t * by2;
        glow(f, bx, byy + 1, 5, P[0], 0.3); f.fillStyle = rgba(P[0], 0.9); f.fillRect(bx - 0.6, byy + 0.4, 1.3, 1.3);
        wx2.fillStyle = rgba(P[0], 0.05); wx2.fillRect(bx - 1, base + 2, 2, 30);
      }
      // a bulkhead on our roof, its door open on a lit stair, the light falling across the tar
      const bw = s.w * 0.42, bx = s.x === 0 ? s.x + s.w * 0.5 : s.x + s.w * 0.08, bh = 26, bt = H * 0.79 - bh;
      glow(f, bx + bw * 0.45, bt + bh, s.w * 0.9, [255, 180, 110], 0.12);
      f.fillStyle = '#070506'; f.fillRect(bx, bt, bw, bh); f.fillRect(bx - 2, bt - 2, bw + 4, 2.5);
      f.fillStyle = 'rgba(255,220,180,0.08)'; f.fillRect(bx - 2, bt - 2, bw + 4, 0.7);
      f.fillStyle = 'rgba(255,206,150,0.6)'; f.fillRect(bx + bw * 0.3, bt + 7, bw * 0.34, bh - 7);
      f.fillStyle = 'rgba(40,26,18,0.55)'; f.fillRect(bx + bw * 0.3, bt + 7, bw * 0.34, 3);
      f.fillStyle = 'rgba(255,200,140,0.12)'; f.beginPath(); f.moveTo(bx + bw * 0.3, bt + bh); f.lineTo(bx + bw * 0.64, bt + bh); f.lineTo(bx + bw * 0.9, bt + bh + 14); f.lineTo(bx + bw * 0.1, bt + bh + 14); f.fill();
      wx2.fillStyle = 'rgba(255,190,120,0.12)'; wx2.fillRect(bx + bw * 0.2, bt + bh, bw * 0.6, 20);
      for (let k = 0; k < 2; k++) { const sx = s.x + s.w * (0.2 + k * 0.4) + r() * 4, sy = base + 30 + r() * 40; f.fillStyle = `rgba(255,200,140,${0.06 + r() * 0.06})`; f.beginPath(); f.moveTo(sx, sy); f.lineTo(sx + 12, sy); f.lineTo(sx + 9, sy - 4); f.lineTo(sx + 3, sy - 4); f.fill(); } // skylights
      const py = H * 0.86 + r() * 6;
      f.fillStyle = '#060405'; f.fillRect(s.x, py, s.w, H - py);
      f.fillStyle = 'rgba(255,220,180,0.1)'; f.fillRect(s.x, py, s.w, 1); f.fillStyle = 'rgba(0,0,0,0.5)'; f.fillRect(s.x, py + 1, s.w, 2);
      f.fillStyle = 'rgba(255,215,170,0.025)'; for (let y = py + 6; y < H; y += 4) f.fillRect(s.x, y, s.w, 0.5); // brick courses
      wx2.fillStyle = 'rgba(255,190,120,0.06)'; wx2.fillRect(s.x, py + 1, s.w, 3); // the wet coping
    }
    // the rooftop sign in one strip, seen from behind: its frame, the glow its face throws up, bulbs along the top
    const bulbs = [], ss = strips[strips.length > 1 ? 1 : 0];
    if (ss) {
      const sw = ss.w * 0.9, sx = ss.x + ss.w * 0.05, sy = H * (0.47 + r() * 0.03), sh = 16;
      glow(x, sx + sw / 2, sy - 8, sw * 0.9, [255, 180, 110], 0.12);
      x.fillStyle = '#070507'; x.fillRect(sx, sy, sw, 1.5); x.fillRect(sx, sy + sh, sw, 1.5);
      for (let px = sx; px <= sx + sw; px += sw / 4) x.fillRect(px, sy, 1, sh + 18);
      x.strokeStyle = '#070507'; x.lineWidth = 0.6; x.beginPath(); for (let px = sx; px < sx + sw - 1; px += sw / 4) { x.moveTo(px, sy); x.lineTo(px + sw / 4, sy + sh); } x.stroke();
      for (let bx = sx + 1.5, i = 0; bx < sx + sw - 1; bx += 3, i++) bulbs.push({ x: bx, y: sy - 2, i, shows: false });
      wx2.fillStyle = 'rgba(255,190,120,0.1)'; wx2.fillRect(sx, sy + sh + 2, sw, 40);
    }
    // a neon on the tower across the way
    const ns = strips[0];
    if (ns) signs.push(sign(ns.x + ns.w * (ns.x === 0 ? 0.62 : 0.22), H * (0.3 + r() * 0.08), Math.min(13, Math.max(9, ns.w * 0.12)), 50 + r() * 40, NEON[Math.floor(r() * NEON.length)], r));
    const lit = rgba(P[0], 0.95), dim = rgba(P[1], 0.22);
    movers.push({
      ready() { for (const b of bulbs) b.shows = shows(b.x, b.y); },
      back(t) { // the bulbs chase along the frame
        const k = Math.floor(t / 180);
        for (const b of bulbs) { if (b.shows) { g.fillStyle = (b.i + k) % 4 === 0 ? lit : dim; g.fillRect(b.x, b.y, 1.4, 1.4); } }
      },
    });
  }
  const PAINT = { backhaul, stacks, coldline, tarbeach };

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
    for (const m of movers) m.step?.(dt);
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
    // the district's movers, behind its near layer and then over it
    for (const m of movers) m.back?.(t, tod);
    if (front) blit(front);
    for (const m of movers) m.over?.(t, tod);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const fogK = Math.min(1, wx.fog + DISTRICTS[district].fog);
    for (const s of signs) { g.globalAlpha = s.level * tod.sign * (1 - fogK * 0.35); g.drawImage(s.img, s.x, s.y, s.w, s.h); }
    // wet: the signs and lamps smear on the walls and the street while it rains
    if (wx.rain > 0.02) { g.globalAlpha = Math.min(1, wx.rain * 1.1) * (0.5 + tod.sign * 0.5); g.globalCompositeOperation = 'lighter'; blit(wet); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1;
    if (flash > 0) fill(`rgba(200,190,240,${flash * 0.07})`);
    // haze: smog hangs low, fog swallows everything
    const fog = g.createLinearGradient(0, 0, 0, H), [hr, hg, hb] = tod.haze;
    fog.addColorStop(0, `rgba(30,22,26,${0.15 + fogK * 0.45})`); fog.addColorStop(0.7, `rgba(${hr},${hg},${hb},${0.1 + fogK * 0.55})`); fog.addColorStop(1, `rgba(20,14,12,${0.2 + fogK * 0.4})`);
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
    const t0 = performance.now();
    step(dt); draw(t);
    frameMs += performance.now() - t0; frames++;
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
    // Look out on another district (casing.mjs districtOf: an open one, else the Sprawl). Drawn again only on a change.
    district(id) { const k = DISTRICTS[id] ? id : 'sprawl'; if (k === district) return; district = k; if (on && W) build(); },
    get districtId() { return district; },
    get weather() { return name; },
    // What a frame costs (the JS of step and draw, averaged), for review.
    get stats() { return { frames, ms: frames ? frameMs / frames : 0 }; },
  };
}
