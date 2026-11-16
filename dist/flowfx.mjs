// Dashes that flow along a trace, run by the graphics card. A dash-offset animation repaints the whole map every frame
// on the main thread; here each straight piece is a dashed line, longer than the piece by one period, clipped to it and
// slid along it by one period (a transform, so the compositor runs it). A curve is a few such pieces, their dashes in
// phase across the joins. Pure markup: the class names carry the stroke, the dash and the speed (CSS), so a
// container's class turns the motion off (style.css `.flow-run`).
const r1 = (v) => Math.round(v * 10) / 10;

// pts: the trace as points; cls: the class(es) on each dashed line; period: dash plus gap, in map units; wrap: a class
// on the group; id: a prefix for the clips, one per svg (a clip in a hidden twin of the map doesn't clip).
export function flowSvg(pts, cls, period, { wrap = '', id: idp = 'f' } = {}) {
  let s = 0, out = '';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = r1(Math.hypot(b.x - a.x, b.y - a.y));
    if (L < 0.1) continue;
    const deg = Math.round((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI * 100) / 100, id = `flc-${idp}-${Math.round(a.x)}-${Math.round(a.y)}-${Math.round(deg)}-${Math.round(L)}`; // the same piece twice in one svg is the same clip
    out += `<g transform="translate(${r1(a.x)} ${r1(a.y)}) rotate(${deg})" clip-path="url(#${id})"><clipPath id="${id}"><rect x="0" y="-8" width="${L}" height="16"/></clipPath>`
      + `<line class="${cls} flow-run" x1="${-period}" y1="0" x2="${L}" y2="0" style="--p:${period}px;stroke-dashoffset:${r1(s % period)}"/></g>`;
    s += L;
  }
  return `<g class="flow${wrap ? ' ' + wrap : ''}" aria-hidden="true">${out}</g>`;
}
// A quadratic curve as n straight pieces.
export function quadPts(p, c, q, n = 8) {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return { x: u * u * p.x + 2 * u * t * c.x + t * t * q.x, y: u * u * p.y + 2 * u * t * c.y + t * t * q.y }; });
}
// Animations started on something the browser hasn't laid out yet (a map just drawn, or moved into one) run on the
// main thread for good. Two frames later, start them again where they are, so the graphics card takes them.
export function settle(anims) {
  if (anims.length) requestAnimationFrame(() => requestAnimationFrame(() => anims.forEach((a) => { if (a.playState !== 'running') return; const t = a.currentTime; a.cancel(); a.currentTime = t; a.play(); })));
}
