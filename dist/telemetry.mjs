// Opt-in telemetry (docs/demo-plan.md Phase 1, step 6): the demo asks once, after your first jack out, and sends nothing
// until you say yes. A random install id, never the handle. app.js sends the queue to the Worker (tools/telemetry/,
// demo.mjs LINKS.telemetry) with sendBeacon when the page hides or the queue fills; no timer runs.
//
// s.telemetry = { on: true | false | null (not asked), id }. Every event: { k (its kind), t (when), p (play ms, s.pace),
// L (your level), ...its own fields }. The kinds: start, close (len: this session's play ms, screen: the last page),
// level, boss (boss: its id, won, cycles, hp: Integrity left), disconnect (where, by), done (the demo finished).
import { hackerLevel } from './combat.mjs';
import { DEMO, version } from './demo.mjs';

export const FLUSH_AT = 20; // events queued before a send
const queue = [];
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
export const telemetryOf = (s) => (s.telemetry ||= { on: null, id: null });
export const askable = (s) => !!DEMO && telemetryOf(s).on == null;
export const isOn = (s) => !!DEMO && telemetryOf(s).on === true;
export function setTelemetry(s, on) {
  const t = telemetryOf(s);
  t.on = !!on;
  if (on && !t.id) t.id = rid();
  if (!on) queue.length = 0;
  return t;
}
export function track(s, k, fields = {}) {
  if (!isOn(s)) return null;
  const ev = { k, t: Date.now(), p: Math.round(s.pace?.ms || 0), L: hackerLevel(s), ...fields };
  queue.push(ev);
  return ev;
}
export const due = () => queue.length >= FLUSH_AT;
// The batch to send, emptying the queue: { id, v, events } or null.
export function drain(s) {
  if (!isOn(s) || !queue.length) return null;
  return { id: telemetryOf(s).id, v: version(), events: queue.splice(0) };
}
// What the game's events mean here (app.js react): a level reached, a disconnect.
export function observe(s, events) {
  for (const e of events) {
    if (e.type === 'level-up') track(s, 'level', { level: e.level });
    else if (e.type === 'disconnected') track(s, 'disconnect', { where: e.where || '', by: e.by || '' });
  }
}
// A boss fight's end (combat.mjs hooks.fightOver).
export function bossOver(s, e, result, integrity) {
  if (!e?.virus?.boss) return null;
  return track(s, 'boss', { boss: e.virus.boss, won: result === 'victory', cycles: e.cycle || 0, hp: Math.max(0, Math.round(integrity || 0)) });
}
