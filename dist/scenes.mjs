// Transmissions (GAME_RULES.md "Transmissions"): a scene is a conversation with a contact over the map, in the quest
// window's look (scenes-view.mjs). Its content is content/scenes.mjs. Pure: the save in, what was said out.
//   s.scenes: { seen: [ids], queue: [{ id, args }], now: { id, args, node, heard: [node ids], said: [{ who, text, step }], step } }
// queueScene starts one (or queues it behind the one playing); choose answers; skip closes it. A scene plays once.
// The chain starts at the first login: later scenes play only for a save that heard the welcome (never on an old
// save or a bench).
import SCENES from './content/scenes.mjs';
export { SCENES };

const T = (s) => (s.scenes ||= { seen: [], queue: [], now: null });
export const fill = (text, args = {}) => String(text).replace(/\{(\w+)\}/g, (m, k) => (args[k] != null ? String(args[k]) : m));
export const sceneNow = (s) => s.scenes?.now || null;
export const heardWelcome = (s) => !!s.scenes && (s.scenes.seen.includes('welcome') || s.scenes.now?.id === 'welcome');

function open(s, q) {
  const def = SCENES[q.id];
  const now = { id: q.id, args: q.args || {}, node: 'start', heard: ['start'], said: [], step: 0 };
  for (const l of def.nodes.start.lines || []) now.said.push({ who: def.who, text: fill(l, now.args), step: 0 });
  T(s).now = now;
}
// Start a scene (once ever), or queue it behind the one playing. Returns whether it was taken.
export function queueScene(s, id, args = {}) {
  const t = T(s);
  if (!SCENES[id] || t.seen.includes(id) || t.now?.id === id || t.queue.some((q) => q.id === id)) return false;
  if (t.now) t.queue.push({ id, args }); else open(s, { id, args });
  return true;
}
// The choices on screen now: { n, label, end }, in order (a node you've heard is gone).
export function choicesOf(s) {
  const now = sceneNow(s);
  if (!now) return [];
  const def = SCENES[now.id], node = def.nodes[now.node];
  return (node.ask || []).map((id) => ({ id, node: def.nodes[id] })).filter((x) => x.node && (x.node.end || !now.heard.includes(x.id)))
    .map((x, i) => ({ n: i + 1, id: x.id, label: fill(x.node.q, now.args), end: !!x.node.end }));
}
function finish(s) {
  const t = T(s);
  if (t.now && !t.seen.includes(t.now.id)) t.seen.push(t.now.id);
  t.now = null;
  if (t.queue.length) open(s, t.queue.shift());
}
// Answer with choice n (1-based). Returns { go } when the answer ends the scene somewhere (a page), {} when it ends
// it, the scene going on otherwise; null for no such choice.
export function choose(s, n) {
  const now = sceneNow(s), c = choicesOf(s).find((x) => x.n === n);
  if (!now || !c) return null;
  const def = SCENES[now.id], node = def.nodes[c.id];
  if (node.end) { const go = node.end === true ? null : fill(node.end, now.args); finish(s); return go ? { go } : {}; }
  now.step++;
  now.said.push({ who: 'you', text: c.label, step: now.step });
  for (const l of node.lines || []) now.said.push({ who: def.who, text: fill(l, now.args), step: now.step });
  now.node = c.id;
  now.heard.push(c.id);
  return { more: true };
}
// Close it (Esc, ×): it counts as heard.
export function skip(s) { if (sceneNow(s)) finish(s); }
// developer scene <id>: play it again.
export function replay(s, id) {
  if (!SCENES[id]) return false;
  const t = T(s);
  t.seen = t.seen.filter((x) => x !== id);
  if (t.now?.id === id) t.now = null;
  return queueScene(s, id, id === 'first-server' ? firstServerArgs(s) : {});
}
// The first server you locate: wick tells you what it is (only on a save that heard the welcome).
export const firstServerArgs = (s) => { const l = (s.locations || []).find((x) => x.starter) || (s.locations || []).find((x) => !x.rogue && !x.zone); return l ? { server: l.name, level: l.level || 1, id: l.id } : { server: 'SPRAWL-00', level: 1, id: 'sprawl' }; };
export function onFirstServer(s, loc) { if (heardWelcome(s)) queueScene(s, 'first-server', { server: loc.name, level: loc.level || 1, id: loc.id }); }
