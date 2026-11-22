// The save keys (bench.mjs): which save a page reads and writes. Split out so a page that is no bench loads none of
// the bench itself (app.js imports bench.mjs only on a bench or with ?dev).
export const SAVE_KEY = 'blackbox-v6'; // the real game's save
export const DEMO_KEY = 'blackbox-demo'; // the demo build's (demo.mjs): a demo and a dev build never share a save
export const BENCH_PREFIX = 'blackbox-bench-';
// A bench's name: letters, digits and dashes (up to 32), lower case. Anything else is no bench.
export const benchName = (v) => (typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/i.test(v) ? v.toLowerCase() : null);
export const benchKey = (name) => BENCH_PREFIX + benchName(name);
// The page's save: { key, bench }. A bench never reads or writes the real save. A playtest page has no bench (it is
// never saved at all). The demo has its own save and no benches.
export function pageSave(search, demo = null) {
  if (demo) return { key: DEMO_KEY, bench: null };
  const p = new URLSearchParams(search), playtest = p.get('playtest');
  const bench = playtest ? null : benchName(p.get('bench'));
  return bench ? { key: benchKey(bench), bench } : { key: SAVE_KEY, bench: null };
}
// A bench's level curve (?curve=<percent>, 0 to 20): power's compounding rate on that page only (data.mjs
// CONFIG.powerPerLevel), or null for the game's. Gear rolled after it (bench <class> <level>) is on that curve.
export const benchCurve = (search) => { const v = new URLSearchParams(search).get('curve'), n = Number(v); return v != null && v !== '' && n >= 0 && n <= 20 ? n / 100 : null; };
