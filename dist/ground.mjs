// The floor under the rooms map (docs/ui.md "The stage"): the floor's material, a texture with no landmarks, drawn in
// the map's own SVG under its links and rooms, in the floor's structure colour. It keeps clear of every room and link,
// fades out toward the map's edges, and pans and zooms with the map. A texture has no place of its own, so it suits any
// layout (a picture of the floor did not: its landmarks fell under rooms).
const H = (x, y, k = 0) => { const n = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return n - Math.floor(n); };
// Each floor's material: (column, row) of a tile -> [character, alpha] or null.
export const MATERIALS = {
  1: (x, y) => (x % 3 === 0 && y % 2 === 0 && H(x, y) < 0.32 ? (H(x, y, 1) < 0.15 ? ['▪', 0.3] : ['.', 0.16]) : null), // the Sprawl: far windows
  2: (x, y) => (y % 3 === 0 && H(Math.floor(x / 5), y) < 0.35 ? ['=', 0.16] : null), // Backhaul: sleepers
  3: (x, y) => (x % 6 === 0 ? ['│', 0.08] : y % 2 === 0 && H(x, y) < 0.05 ? ['▪', 0.3] : null), // the Stacks: racks, a status light
  4: (x, y) => { const w = Math.sin(x * 0.35 + y * 1.7) + Math.sin(x * 0.11 + y * 0.6); return y % 2 === 0 && w > 1.2 ? [w > 1.6 ? '~' : '-', 0.17] : null; }, // Coldline: swell
  5: (x, y) => ((x + (y % 2) * 2) % 4 === 0 && y % 2 === 0 ? ['+', 0.11] : null), // Deep Core: grating
  6: (x, y) => (x % 4 === 0 && y % 2 === 0 ? ['.', 0.14] : null), // Kernel Space: the plane's dots
  7: (x, y) => (H(x, y) < 0.08 ? [H(x, y, 2) < 0.5 ? '.' : ',', 0.15] : null), // the Sink: sediment
  8: (x, y) => { const g = H(Math.floor(x / 3), y), b = Math.sin(y * 0.9 + Math.sin(x * 0.05) * 1.5); return g < 0.4 ? [b > 0.3 ? '▒' : b > -0.4 ? '░' : '.', b > 0.3 ? 0.1 : 0.08] : null; }, // Bedrock: stone grain
};
export const TILE = { cols: 60, rows: 24, cw: 7.4, ch: 12.8, fs: 11 };

// The tile's characters, grouped by alpha: [{ a, rows: [string] }] (spaces where nothing is drawn).
export function tileOf(floor) {
  const M = MATERIALS[floor]; if (!M) return [];
  const by = new Map();
  for (let y = 0; y < TILE.rows; y++) for (let x = 0; x < TILE.cols; x++) {
    const m = M(x, y); if (!m) continue;
    if (!by.has(m[1])) by.set(m[1], Array.from({ length: TILE.rows }, () => Array(TILE.cols).fill(' ')));
    by.get(m[1])[y][x] = m[0];
  }
  return [...by].map(([a, rows]) => ({ a, rows: rows.map((r) => r.join('')) }));
}

// The SVG: a pattern of the tile, masked clear of rooms (boxes w x h around each centre) and links (segments), fading
// out from the map's middle. id keeps the wide and tall maps' patterns apart.
export function groundSvg(floor, { id, rooms, links, box, cx, cy, rx, ry }) {
  const groups = tileOf(floor); if (!groups.length) return '';
  const W = TILE.cols * TILE.cw, Ht = TILE.rows * TILE.ch;
  const text = groups.map((g) => `<text fill-opacity="${g.a}" style="white-space:pre">${g.rows.map((r, y) => `<tspan x="0" y="${((y + 0.8) * TILE.ch).toFixed(1)}">${r}</tspan>`).join('')}</text>`).join('');
  const holes = rooms.map((p) => `<rect x="${(p.x - box.w / 2).toFixed(1)}" y="${(p.y - box.h / 2).toFixed(1)}" width="${box.w}" height="${box.h}" rx="10"/>`).join('')
    + links.map(([p, q]) => `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`).join('');
  return `<defs><pattern id="fpg-p-${id}" width="${W}" height="${Ht}" patternUnits="userSpaceOnUse" class="fp-ground-tile">${text}</pattern>`
    + `<radialGradient id="fpg-f-${id}" cx="${cx}" cy="${cy}" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${cx} ${cy}) scale(${rx} ${ry}) translate(${-cx} ${-cy})"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>`
    + `<mask id="fpg-m-${id}" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000"><rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#fpg-f-${id})"/><g fill="#000" stroke="#000" stroke-width="${box.link}" stroke-linecap="round">${holes}</g></mask></defs>`
    + `<rect class="fp-ground" x="-4000" y="-4000" width="8000" height="8000" fill="url(#fpg-p-${id})" mask="url(#fpg-m-${id})" aria-hidden="true"/>`;
}
