// Spinning ASCII wireframes for item tooltips: a shape per kind of protocol, rotated over time and
// drawn into a character grid (nearer edges in denser characters, corners as @). Pure: give it a
// shape and a time, get the text back; app.js redraws it every frame while the tooltip is up.
const cube = () => {
  const v = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
  const e = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if ([0, 1, 2].filter((k) => v[i][k] !== v[j][k]).length === 1) e.push([i, j]);
  return { v, e };
};
const prism = (n, h = 0.9, r = 1) => {
  const v = [], e = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; v.push([Math.cos(a) * r, -h, Math.sin(a) * r], [Math.cos(a) * r, h, Math.sin(a) * r]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; e.push([i * 2, j * 2], [i * 2 + 1, j * 2 + 1], [i * 2, i * 2 + 1]); }
  return { v, e };
};
const bipyramid = (n, top, bottom, r = 0.8) => {
  const v = [[0, top, 0], [0, -bottom, 0]], e = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; v.push([Math.cos(a) * r, 0, Math.sin(a) * r]); }
  for (let i = 0; i < n; i++) { const k = 2 + i, nx = 2 + ((i + 1) % n); e.push([0, k], [1, k], [k, nx]); }
  return { v, e };
};
export const SHAPES = {
  exploit: bipyramid(4, 1.7, 0.6, 0.75), // a spike
  proxy: bipyramid(4, 1.1, 1.1, 1.1), // a relay diamond
  shell: cube(), // a hardened box
  script: prism(6, 0.8, 1.05), // a stacked prism
  filter: prism(8, 0.35, 1.2), // a disc (firewall filters)
};

// The grid for a shape at time t (ms): w × h characters.
export function render(shape, t, w = 30, h = 13) {
  const grid = Array.from({ length: h }, () => Array(w).fill(' ')), depth = Array.from({ length: h }, () => Array(w).fill(-9));
  const ay = t / 1400, ax = 0.45 + Math.sin(t / 2600) * 0.25;
  const pts = shape.v.map(([x, y, z]) => {
    let X = x * Math.cos(ay) + z * Math.sin(ay), Z = -x * Math.sin(ay) + z * Math.cos(ay), Y = y;
    const Y2 = Y * Math.cos(ax) - Z * Math.sin(ax), Z2 = Y * Math.sin(ax) + Z * Math.cos(ax);
    return [w / 2 + X * w * 0.27, h / 2 - Y2 * h * 0.3, Z2];
  });
  const put = (x, y, z, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || z < depth[y][x]) return; depth[y][x] = z; grid[y][x] = c; };
  const ch = (z) => (z > 0.5 ? '#' : z > -0.2 ? '*' : z > -0.8 ? '+' : '.');
  for (const [a, b] of shape.e) {
    const [x0, y0, z0] = pts[a], [x1, y1, z1] = pts[b], n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) { const k = i / n, z = z0 + (z1 - z0) * k; put(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z, ch(z)); }
  }
  for (const [x, y, z] of pts) put(x, y, z + 0.01, '@');
  return grid.map((r) => r.join('')).join('\n');
}
