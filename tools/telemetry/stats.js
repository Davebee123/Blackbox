// The numbers the page shows, from the stored events (worker.js; tested in telemetry.test.mjs). Each event: { id, v, k,
// t, p (play ms so far), L (level), ...its own fields }.
const median = (xs) => { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };
export const LEVELS = [5, 10, 14];

export function stats(events) {
  const by = new Map();
  for (const e of events) (by.get(e.id) || by.set(e.id, []).get(e.id)).push(e);
  const plays = [], to = Object.fromEntries(LEVELS.map((L) => [L, []])), stopAt = {}, lastScreen = {}, bosses = {}, disconnects = {};
  let finished = 0;
  for (const evs of by.values()) {
    evs.sort((a, b) => a.t - b.t);
    plays.push(Math.max(...evs.map((e) => e.p || 0)));
    for (const L of LEVELS) { const hit = evs.find((e) => (e.L || 0) >= L); if (hit) to[L].push(hit.p || 0); }
    const top = Math.max(...evs.map((e) => e.L || 0));
    stopAt[top] = (stopAt[top] || 0) + 1;
    const close = evs.findLast((e) => e.k === 'close');
    if (close) lastScreen[close.screen || '?'] = (lastScreen[close.screen || '?'] || 0) + 1;
    if (evs.some((e) => e.k === 'done')) finished++;
  }
  for (const e of events.filter((x) => x.k === 'boss')) {
    const id = e.boss || 'unknown', b = (bosses[id] ||= { won: 0, lost: 0, cyc: [], hps: [] });
    if (e.won) b.won++; else b.lost++;
    b.cyc.push(e.cycles || 0); if (e.won) b.hps.push(e.hp || 0);
  }
  for (const b of Object.values(bosses)) { b.cycles = median(b.cyc); b.hp = median(b.hps); delete b.cyc; delete b.hps; }
  for (const e of events.filter((x) => x.k === 'disconnect')) { const k = e.by || e.where || '?'; disconnects[k] = (disconnects[k] || 0) + 1; }
  return { installs: by.size, medianPlay: median(plays), finished, hoursTo: Object.fromEntries(LEVELS.map((L) => [L, median(to[L])])), stopAt, lastScreen, bosses, disconnects };
}
