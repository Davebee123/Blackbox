// Room addresses (docs/servers.md 9.9): every room's short grid address, a column letter and a row number (C2), from
// where it sits on its server's graph (as the desktop map draws it: x left to right, y top to bottom). No imports, so
// mail.mjs and floorplan.mjs can both use it.
//
// The origin never moves, so an address is the room's for good: columns count from the leftmost room (never right of
// the entry), rows from the top one, padded to the row above the spine on a generated server (the rooms added later,
// Root 4's and a Grid's socket and Root 2's Stash, sit beside the spine or the Core, so never above it or left of the
// entry). No two rooms share a cell; a clash would take a letter (C2b).
const colName = (n) => (n < 26 ? String.fromCharCode(65 + n) : colName(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26)));
const ADDRS = new WeakMap();
export function addrsOf(g) {
  const rooms = Object.values(g?.rooms || {}), had = ADDRS.get(g);
  if (had && had.n === rooms.length) return had.map;
  const x0 = Math.min(0, ...rooms.map((r) => r.x)), y0 = Math.min(...rooms.map((r) => r.y), ...(g.sockets != null ? [-1] : []));
  const map = {}, used = new Set();
  for (const r of [...rooms].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))) {
    const base = `${colName(r.x - x0)}${r.y - y0 + 1}`;
    let a = base;
    for (let k = 1; used.has(a); k++) a = base + String.fromCharCode(97 + k);
    used.add(a); map[r.id] = a;
  }
  if (g) ADDRS.set(g, { n: rooms.length, map });
  return map;
}
// A room by its address, as typed (c2, C2), or null.
export function byAddr(g, text) {
  const a = String(text || '').trim().toUpperCase(), m = addrsOf(g);
  return /^[A-Z]+\d+[A-Z]?$/.test(a) ? Object.keys(m).find((id) => m[id].toUpperCase() === a) || null : null;
}
// The rooms you can reach from the entry without going through the Core (a no-rest map job's rooms; where a
// contract's item can go).
export function sweepRooms(g) {
  const links = [...(g.links || []), ...(g.hops || [])], seen = new Set([g.entry]), q = [g.entry];
  while (q.length) { const id = q.shift(); for (const [a, b] of links) { const x = a === id ? b : b === id ? a : null; if (x && !seen.has(x) && x !== g.core) { seen.add(x); q.push(x); } } }
  return [...seen];
}
