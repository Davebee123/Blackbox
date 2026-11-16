// The class pick's border lights that run round the picked square (Infiltrator's Trace, Operator's Threads;
// style.css .pk-fx). They were `offset-path: border-box` animations, which run on the main thread every frame; these
// are transform keyframes along the same path, so the compositor runs them. The path is the box's rounded border,
// clockwise from the top edge's left end, at an even speed; it is rebuilt when the box changes size (the drawer opening).
// runBorder(fx, cls) → stop(). The lights are .pk-fx's first <i>s; style.css draws them and holds them still under
// reduced motion.
const RUNS = { infiltrator: [{ ms: 3600, delay: 0, turn: true }], operator: [0, -2500, -5000].map((delay) => ({ ms: 7500, delay, turn: false })) }; // turn: it rotates with the path

// Points round a w × h box with corners of radius r: [x, y, heading in degrees, distance from the start].
export function borderPath(w, h, r, steps = 6) {
  const pts = [[r, 0, 0, 0]];
  const arcs = [[w - r, r], [w - r, h - r], [r, h - r], [r, r]]; // each corner's centre, clockwise from the top right
  arcs.forEach(([cx, cy], k) => {
    const a0 = -90 + 90 * k, last = pts[pts.length - 1], ex = cx + r * Math.cos((a0 * Math.PI) / 180), ey = cy + r * Math.sin((a0 * Math.PI) / 180);
    pts.push([ex, ey, 90 * k, last[3] + Math.hypot(ex - last[0], ey - last[1])]); // the straight edge up to the corner
    for (let s = 1; s <= steps; s++) { const a = a0 + (90 * s) / steps, p = pts[pts.length - 1]; pts.push([cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180), a + 90, p[3] + (r * Math.PI) / 2 / steps]); }
  });
  return pts;
}

export function borderKeyframes(w, h, r, turn) {
  const pts = borderPath(w, h, r), len = pts[pts.length - 1][3];
  return pts.map(([x, y, a, d]) => ({ offset: d / len, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)${turn ? ` rotate(${a}deg)` : ''}` }));
}

export function runBorder(fx, cls) {
  if (!fx || !RUNS[cls] || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const lights = RUNS[cls].map((L, i) => ({ ...L, el: fx.children[i], anim: null }));
  let size = '';
  const ro = new ResizeObserver(([e]) => {
    const { width: w, height: h } = e.contentRect, key = `${w}x${h}`;
    if (!w || !h || key === size) return;
    size = key;
    const r = parseFloat(getComputedStyle(fx).borderTopLeftRadius) || 0;
    for (const L of lights) {
      const kf = borderKeyframes(w, h, Math.min(r, w / 2, h / 2), L.turn);
      if (L.anim) L.anim.effect.setKeyframes(kf);
      else L.anim = L.el.animate(kf, { duration: L.ms, delay: L.delay, iterations: Infinity, easing: 'linear' });
    }
  });
  ro.observe(fx);
  return () => { ro.disconnect(); for (const L of lights) L.anim?.cancel(); };
}
