// GPU effects on the fight board (PixiJS, dist/vendor/pixi.min.mjs, MIT): one transparent canvas over the whole
// screen, above the lash and under the damage numbers (style.css #pixi-fx), that never takes input. It draws what
// the DOM effects only hint at: sparks off a hit at the bar's edge, a burn's embers rising off the bar, a broken part
// shattering into pixels with an RGB split, a ◆ chit's diamond shards, an interrupt's shockwave, the virus's hit on
// you tearing glitch bands across the screen, Encrypt's locks closing on your bar.
// Look only: it reads the board's rectangles when an effect fires and keeps nothing of the game. Loaded on first
// use, only while System: GPU effects is on (app.js); until it loads, or if WebGL fails, live() is false and the
// board keeps its DOM effects. The ticker runs only while something is on screen.

const MAX = 900; // particles alive at once: past this a new burst is thinned, never the frame rate

// The palette: style.css's tokens, read once (teal is only ever you: an interrupt you made, nothing the virus does).
function palette() {
  const css = getComputedStyle(document.documentElement), v = (k, d) => css.getPropertyValue(k).trim() || d;
  const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? parseInt(c.slice(1), 16) : 0xffffff);
  return { amber: hex(v('--amber', '#f1b92f')), next: hex(v('--next', '#ffd85c')), bright: hex(v('--bright', '#fff2c8')), hot: hex(v('--hot', '#ff5b3d')), you: hex(v('--you', '#7fd1c7')), steel: hex(v('--steel', '#86b6c6')), daemon: hex(v('--daemon', '#c3a6ff')), burn: 0xff8c3d, ember: 0xffb347, glitch: 0x9fe8ff };
}
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

export function createPixiFx({ enabled = () => true, host = document.body } = {}) {
  let P = null, app = null, stage = null, tex = null, C = null, loading = null, failed = false, running = false;
  const parts = []; // { sp, x, y, vx, vy, g, drag, life, max, vr, s0, s1, a0, stretch, flicker }
  const shapes = []; // { g: Graphics, t, max, draw(g, k) }: rings, flashes, glitch bands
  const pool = [];

  async function load() {
    if (app || failed) return app;
    loading ||= (async () => {
      try {
        P = await import('./vendor/pixi.min.mjs');
        const a = new P.Application();
        await a.init({ backgroundAlpha: 0, resizeTo: window, antialias: true, autoDensity: true, resolution: Math.min(2, devicePixelRatio || 1), preference: 'webgl', autoStart: false, sharedTicker: false });
        a.canvas.id = 'pixi-fx';
        a.canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(a.canvas);
        C = palette();
        // Two textures: a crisp pixel (the board's 1s-and-0s look) and a soft glow for flashes and embers.
        const px = document.createElement('canvas'); px.width = px.height = 4;
        const c1 = px.getContext('2d'); c1.fillStyle = '#fff'; c1.fillRect(0, 0, 4, 4);
        const gl = document.createElement('canvas'); gl.width = gl.height = 64;
        const c2 = gl.getContext('2d'), grd = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
        c2.fillStyle = grd; c2.fillRect(0, 0, 64, 64);
        tex = { px: P.Texture.from(px), glow: P.Texture.from(gl) };
        tex.px.source.scaleMode = 'nearest';
        stage = a.stage;
        a.ticker.add((t) => step(Math.min(0.05, t.deltaMS / 1000)));
        app = a;
      } catch (err) {
        failed = true; // no WebGL (or the module didn't load): the DOM effects carry on
        console.warn('GPU effects off:', err?.message || err);
      }
      return app;
    })();
    return loading;
  }
  const live = () => !!app && enabled();
  const wake = () => { if (!running && app) { running = true; app.start(); } };
  function sleep() { running = false; app.stop(); app.render(); }

  function sprite(t) {
    const sp = pool.pop() || new P.Sprite();
    sp.texture = tex[t]; sp.anchor.set(0.5); sp.blendMode = 'add'; sp.rotation = 0; sp.visible = true; sp.alpha = 1;
    stage.addChild(sp);
    return sp;
  }
  // One particle. o: { t: 'px' | 'glow', color, size (px), size1, speed, ang, vx, vy, g (px/s²), drag, life, alpha, spin, stretch, flicker }
  function emit(x, y, o) {
    if (parts.length >= MAX) return;
    const sp = sprite(o.t || 'px'), base = o.t === 'glow' ? 64 : 4;
    sp.tint = o.color ?? 0xffffff;
    const s0 = (o.size ?? 4) / base, s1 = (o.size1 ?? o.size ?? 4) / base;
    const sp0 = o.speed ?? 0, ang = o.ang ?? 0;
    parts.push({ sp, x, y, vx: o.vx ?? Math.cos(ang) * sp0, vy: o.vy ?? Math.sin(ang) * sp0, g: o.g ?? 0, drag: o.drag ?? 0, life: o.life ?? 0.6, max: o.life ?? 0.6, vr: o.spin ?? 0, s0, s1, a0: o.alpha ?? 1, stretch: !!o.stretch, flicker: !!o.flicker });
    sp.rotation = o.rot ?? 0;
    wake();
  }
  function shape(max, draw) {
    const g = new P.Graphics();
    g.blendMode = 'add';
    stage.addChild(g);
    shapes.push({ g, t: 0, max, draw });
    wake();
  }
  function step(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { stage.removeChild(p.sp); pool.push(p.sp); parts.splice(i, 1); continue; }
      const k = 1 - p.life / p.max, d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const sp = p.sp, s = p.s0 + (p.s1 - p.s0) * k;
      sp.position.set(p.x, p.y);
      if (p.stretch) { const v = Math.hypot(p.vx, p.vy); sp.rotation = Math.atan2(p.vy, p.vx); sp.scale.set(s * (1 + v / 110), s * 0.55); } else { sp.rotation += p.vr * dt; sp.scale.set(s); }
      sp.alpha = p.a0 * (1 - k * k) * (p.flicker ? 0.55 + 0.45 * Math.random() : 1);
    }
    for (let i = shapes.length - 1; i >= 0; i--) {
      const sh = shapes[i];
      sh.t += dt;
      if (sh.t >= sh.max) { stage.removeChild(sh.g); sh.g.destroy(); shapes.splice(i, 1); continue; }
      sh.g.clear();
      sh.draw(sh.g, sh.t / sh.max);
    }
    if (!parts.length && !shapes.length) sleep();
  }
  const ease = (k) => 1 - (1 - k) ** 3;
  function ring(x, y, r0, r1, color, width, max = 0.35) {
    shape(max, (g, k) => g.circle(x, y, r0 + (r1 - r0) * ease(k)).stroke({ width: Math.max(0.5, width * (1 - k)), color, alpha: 1 - k }));
  }
  function flash(x, y, size, color, max = 0.18) {
    emit(x, y, { t: 'glow', color, size, size1: size * 1.4, life: max, alpha: 0.9 });
  }

  const api = {
    // Start loading (System: GPU effects on, a fight opening). Safe to call often.
    warm: () => (enabled() && !failed ? load() : Promise.resolve(null)),
    live,
    failed: () => failed,
    // A hit on a part, at the bar's edge where the damage came off. power 0..1 (its share of the part's Integrity).
    // kind: hit | spike | crit | helper | reflect (the number's colour). Crits throw streaks and a gold ring.
    hit(x, y, { power = 0.2, kind = 'hit', mate = false } = {}) {
      if (!live()) return void api.warm();
      const crit = kind === 'crit', color = crit ? C.next : kind === 'helper' ? C.daemon : kind === 'reflect' ? C.you : C.amber;
      const n = Math.round((6 + power * 22 + (crit ? 16 : 0)) * (mate ? 0.5 : 1));
      for (let i = 0; i < n; i++) {
        const up = Math.random() < 0.8, ang = up ? rnd(-Math.PI * 0.95, -Math.PI * 0.05) : rnd(0.2, Math.PI - 0.2);
        emit(x, y, { color: Math.random() < 0.3 ? C.bright : color, size: rnd(2.5, 5) * (crit ? 1.25 : 1), size1: 1, speed: rnd(140, 380) * (0.7 + power), ang, g: 620, drag: 2.2, life: rnd(0.3, 0.65), stretch: crit && i % 3 === 0 });
      }
      flash(x, y, 26 + power * 50 + (crit ? 40 : 0), crit ? C.next : color);
      if (crit) ring(x, y, 6, 70, C.next, 3, 0.32);
    },
    // A burn tick: embers off the filled part of the bar, drifting up and flickering.
    burn(rect, fill = 1, power = 0.1) {
      if (!live()) return void api.warm();
      const w = Math.max(8, rect.width * Math.max(0.02, fill)), n = Math.round(10 + power * 36);
      for (let i = 0; i < n; i++) {
        const x = rect.left + rnd(0, w), y = rect.top + rect.height / 2;
        emit(x, y, { color: Math.random() < 0.5 ? C.ember : C.burn, size: rnd(3, 5.5), size1: 1.5, vx: rnd(-30, 30), vy: rnd(-150, -50), g: -30, drag: 1.2, life: rnd(0.6, 1.1), flicker: true });
        if (i % 3 === 0) emit(x, y, { t: 'glow', color: C.burn, size: rnd(14, 24), size1: 6, vx: rnd(-20, 20), vy: rnd(-90, -40), drag: 1, life: rnd(0.4, 0.7), alpha: 0.5 });
      }
      emit(rect.left + w, rect.top + rect.height / 2, { t: 'glow', color: C.burn, size: 30 + power * 40, size1: 40, life: 0.22, alpha: 0.7 });
    },
    // A part broken: its row bursts into pixels from the centre out, a white flash, and an RGB split that jitters.
    shatter(rect, color) {
      if (!live() || !rect.width) return void api.warm();
      const c = color ?? C.amber, cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2, cell = Math.max(6, Math.sqrt((rect.width * rect.height) / 150));
      for (let y = rect.top + cell / 2; y < rect.bottom; y += cell) {
        for (let x = rect.left + cell / 2; x < rect.right; x += cell) {
          if (Math.random() < 0.25) continue;
          const dx = (x - cx) / (rect.width / 2 || 1), dy = (y - cy) / (rect.height / 2 || 1);
          emit(x + rnd(-2, 2), y + rnd(-2, 2), { color: pick([c, c, C.bright, C.amber, C.hot]), size: rnd(2.5, 6), size1: 1.5, vx: dx * rnd(80, 280) + rnd(-40, 40), vy: dy * rnd(40, 120) - rnd(80, 280), g: 760, drag: 0.9, life: rnd(0.65, 1.2), spin: rnd(-14, 14), rot: rnd(0, 3) });
        }
      }
      shape(0.16, (g, k) => g.rect(rect.left, rect.top, rect.width, rect.height).fill({ color: C.bright, alpha: 0.75 * (1 - k) }));
      shape(0.3, (g, k) => {
        const j = () => rnd(-8, 8) * (1 - k);
        for (let i = 0; i < 4; i++) {
          const y = rect.top + rnd(0, rect.height), h = rnd(2, Math.max(3, rect.height / 4));
          g.rect(rect.left + j() - 6, y, rect.width, h).fill({ color: C.hot, alpha: 0.45 * (1 - k) });
          g.rect(rect.left + j() + 6, y + 1, rect.width, h).fill({ color: C.glitch, alpha: 0.3 * (1 - k) });
        }
      });
      ring(cx, cy, 10, Math.max(rect.width * 0.6, 110), C.bright, 4, 0.42);
    },
    // A ◆ chit cracked: diamond shards (steel for a Mutex's lock) and a small ring.
    chit(x, y, steel = false) {
      if (!live()) return void api.warm();
      const color = steel ? C.steel : C.bright;
      for (let i = 0; i < 12; i++) emit(x, y, { color: i % 3 ? color : C.amber, size: rnd(3, 6), size1: 2, speed: rnd(90, 260), ang: rnd(-Math.PI * 0.95, -Math.PI * 0.05), g: 560, drag: 1.4, life: rnd(0.45, 0.8), rot: Math.PI / 4, spin: rnd(-10, 10) });
      ring(x, y, 3, 34, color, 2, 0.3);
      flash(x, y, 30, color, 0.15);
    },
    // You cut an attack (an interrupt): a teal shockwave off the part, and scan lines sweeping out across its row.
    cut(rect) {
      if (!live() || !rect.width) return void api.warm();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2, R = Math.max(rect.width * 0.55, 120);
      ring(cx, cy, 8, R, C.you, 4, 0.45);
      ring(cx, cy, 4, R * 0.6, C.bright, 2, 0.32);
      shape(0.35, (g, k) => {
        const half = (rect.width / 2) * ease(k);
        for (const dy of [-rect.height * 0.3, 0, rect.height * 0.3]) g.rect(cx - half, cy + dy - 1, half * 2, 2).fill({ color: C.you, alpha: 0.8 * (1 - k) });
      });
      for (let i = 0; i < 16; i++) emit(cx, cy, { color: i % 2 ? C.you : C.bright, size: rnd(2, 3.5), size1: 1, speed: rnd(160, 340), ang: rnd(0, Math.PI * 2), drag: 4, life: rnd(0.3, 0.5), stretch: true });
    },
    // The virus hit you: red sparks burst off your Signal bar, and glitch bands tear across the screen (more, longer and
    // wider for a crit or a charge). frac: the hit's share of your Signal.
    hurt(rect, frac = 0.1, heavy = false) {
      if (!live()) return void api.warm();
      const p = Math.min(1, frac * 5), n = Math.round(10 + p * 40 + (heavy ? 20 : 0));
      for (let i = 0; i < n; i++) {
        const x = rect.left + rnd(0, rect.width), y = rect.top + rect.height / 2;
        emit(x, y, { color: Math.random() < 0.25 ? C.bright : C.hot, size: rnd(2, 4.5), size1: 1, speed: rnd(80, 300) * (0.7 + p), ang: rnd(-Math.PI, 0), g: 700, drag: 1.6, life: rnd(0.35, 0.75) });
      }
      const bands = Math.round(2 + p * 4 + (heavy ? 3 : 0)), W = innerWidth, H = innerHeight;
      const rows = Array.from({ length: bands }, () => ({ y: rnd(0, H), h: rnd(2, 6 + p * 14 + (heavy ? 10 : 0)) }));
      shape(heavy ? 0.26 : 0.16, (g, k) => {
        for (const r of rows) {
          const off = rnd(-24, 24) * (1 - k);
          g.rect(off, r.y, W, r.h).fill({ color: C.hot, alpha: 0.22 * (1 - k) });
          g.rect(-off * 0.6, r.y + r.h * 0.5, W, Math.max(1, r.h * 0.4)).fill({ color: C.glitch, alpha: 0.14 * (1 - k) });
        }
      });
      flash(rect.left + rect.width / 2, rect.top + rect.height / 2, 60 + p * 120, C.hot, 0.2);
    },
    // Encrypt landed: lock-steel squares close in on your bar from all round it.
    encrypt(rect) {
      if (!live()) return void api.warm();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      for (let i = 0; i < 26; i++) {
        const a = rnd(0, Math.PI * 2), r = rnd(70, 150), x = cx + Math.cos(a) * r * 1.6, y = cy + Math.sin(a) * r * 0.5, life = rnd(0.35, 0.5);
        emit(x, y, { color: i % 4 ? C.steel : C.bright, size: rnd(3, 5), size1: 2, vx: (cx - x) / life, vy: (cy - y) / life, life, rot: Math.PI / 4 });
      }
      shape(0.5, (g, k) => g.rect(rect.left - 2, rect.top - 2, rect.width + 4, rect.height + 4).stroke({ width: 2, color: C.steel, alpha: k < 0.6 ? k / 0.6 : (1 - k) / 0.4 }));
    },
    // Everything off at once (the setting turned off, a page change).
    clear() {
      if (!app) return;
      for (const p of parts.splice(0)) { stage.removeChild(p.sp); pool.push(p.sp); }
      for (const sh of shapes.splice(0)) { stage.removeChild(sh.g); sh.g.destroy(); }
      if (running) sleep();
    },
    count: () => parts.length + shapes.length, // for tests and the dev hook
  };
  return api;
}
