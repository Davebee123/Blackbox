// Situational skills: the moment on the board each one is built for (docs/skills.md). The tray lights a key
// whose moment is on the board right now and says what it is in a word or two, so the bar reads the fight with
// you. The planners (dist/classes/*.mjs) answer the same moments on their own terms.
import { livingParts, alive, part, defender, momentumStacks, helpersOn, burnsOn, intents, active } from './combat.mjs';
import { tellOn } from './tells.mjs';

const parts = (s) => livingParts(s);
const frags = (s) => parts(s).filter((p) => p.kind === 'fragment').length;
const told = (s, kind) => parts(s).find((p) => tellOn(s, p, kind));
const low = (s, share) => { const d = defender(s); return d && d.integrity < d.max * share; };
const charging = (s, lag = 3) => intents(s).find((i) => i.tell === 'charge' && i.col <= lag);
const loud = (s) => parts(s).some((p) => p.loud || (p.enrage && p.integrity < p.max / 2)) || s.encounter.virus.buffs?.loud >= s.encounter.cycle;
const rule = (s) => parts(s).some((p) => p.lock || p.ward || p.deadman || p.reflect || p.mimic);
const dirty = (s) => { const e = s.encounter; return !!(e.corrupt || e.encrypt || e.burst || e.scrambleUntil >= e.cycle); };

// id → (s) => a short label when its moment is on the board, else null.
export const SITUATIONS = {
  sigint: (s) => (told(s, 'cast') ? 'cast' : null),
  segfault: (s) => (parts(s).some((p) => tellOn(s, p, 'charge') && !(p.armor > 0)) ? 'charging ×3' : null),
  backstab: (s) => (parts(s).some((p) => tellOn(s, p) && !(p.armor > 0)) ? 'busy: crit' : null),
  overvolt: (s) => (told(s, 'cast') ? 'stops a cast' : null),
  'thermal-runaway': (s) => (told(s, 'cast') ? 'melts a cast' : null),
  'fork-bomb': (s) => (frags(s) ? 'fragments' : null),
  'garbage-collect': (s) => (frags(s) ? 'fragments' : null),
  multicast: (s) => (frags(s) >= 2 ? 'fragments' : null),
  dmz: (s) => (parts(s).some((p) => p.attack?.effect === 'replicate' && p.attack.due <= s.encounter.cycle) ? 'no spawn' : frags(s) >= 2 ? 'fragments' : charging(s, 0) ? 'charge now' : intents(s).filter((i) => i.col === 0 && (i.effect === 'damage' || i.hit)).length >= 2 ? 'pile-up' : null),
  'shaped-charge': (s) => (told(s, 'seal') ? 'seal' : parts(s).some((p) => p.armor >= 3) ? 'thick ◆' : null),
  'bit-rot': (s) => (told(s, 'seal') ? 'seal' : null),
  'cache-poison': (s) => (told(s, 'seal') ? 'seal' : parts(s).some((p) => p.attack?.effect === 'heal' || (p.patchAt != null && p.patchAt - s.encounter.cycle <= 1)) ? 'repairs' : null),
  'logic-bomb': (s) => (parts(s).some((p) => p.twin && alive(part(s, p.twin))) ? 'twins' : parts(s).some((p) => p.deadman) ? 'tripwire' : null),
  sudo: (s) => (rule(s) ? 'part rule' : null),
  'zero-day': (s) => (parts(s).some((p) => p.lockHp > 0 || parts(s).some((x) => x.ward === p.id)) ? 'locked' : null),
  'thermal-throttle': (s) => (momentumStacks(s) >= 2 ? `heat ×${momentumStacks(s)}` : null),
  'stack-smash': (s) => (parts(s).some((p) => !(p.armor > 0) && p.exposedUntil >= s.encounter.cycle) ? 'Exposed ×2' : null),
  brace: (s) => (charging(s, 0) ? 'charge now' : null),
  'turbo-boost': (s) => (low(s, 0.5) ? 'free' : null),
  suspend: (s) => (parts(s).some((p) => { const t = tellOn(s, p, 'charge'); return t && p.attack && t.n === (p.attack.n || 0); }) ? 'drain charge' : null),
  bulkhead: (s) => (charging(s, 1) ? 'charge' : null),
  quarantine: (s) => (told(s, 'cast') ? 'stops a cast' : null),
  throttle: (s) => (loud(s) ? 'loud' : charging(s, 1) ? 'halve charge' : null),
  heartbeat: (s) => (charging(s, 1) ? 'charge' : null),
  scrub: (s) => (dirty(s) ? 'cleanse' : null),
  purge: (s) => (s.encounter.corrupt || s.encounter.encrypt ? 'cleanse' : null),
  rollback: (s) => (Object.values(s.encounter.virus.buffs || {}).some((u) => u >= s.encounter.cycle) ? 'undo cast' : s.encounter.corrupt ? 'cleanse' : null),
  failover: (s) => (low(s, 0.4) ? 'low' : null),
  'oom-kill': (s) => (low(s, 0.45) && s.encounter.helpers.length ? 'low' : null),
  skim: (s) => (low(s, 0.6) ? 'low' : null),
  'irq-storm': (s) => (parts(s).some((p) => tellOn(s, p) && burnsOn(s, p).length) ? 'hits tells' : null),
  implant: (s) => (parts(s).some((p) => p.attack?.effect === 'heal' || p.attack?.siphon || tellOn(s, p, 'cast')?.does === 'grow') ? 'no heals' : null),
  polymorph: (s) => (parts(s).some((p) => p.armor > 0) ? 'through ◆' : null),
  'kill-switch': (s) => (parts(s).some((p) => tellOn(s, p) && helpersOn(s, p).length) ? 'hits tells' : null),
  reroute: (s) => (told(s, 'cast') && s.encounter.helpers.length >= 2 ? 'stops a cast' : null),
  hijack: (s) => (parts(s).some((p) => tellOn(s, p) && ['charge', 'cast'].includes(tellOn(s, p).kind) && helpersOn(s, p).length) ? 'steal' : null),
  jam: (s) => (parts(s).some((p) => { const t = tellOn(s, p, 'charge'); return t && p.attack && t.n === (p.attack.n || 0) && helpersOn(s, p).length; }) ? 'jam charge' : null),
  'spoofed-ack': (s) => (parts(s).some((p) => { const t = tellOn(s, p, 'charge'); return t && p.attack && t.n === (p.attack.n || 0); }) ? 'drain charge' : null),
  replay: (s) => (told(s, 'charge') ? 'charge ×2' : null),
  blackhole: (s) => (parts(s).some((p) => tellOn(s, p, 'charge') && helpersOn(s, p).length) ? 'eat charge' : null),
  barrier: (s) => (low(s, 0.5) && intents(s).some((i) => i.col === 0 && helpersOn(s, part(s, i.source)).length) ? 'shield' : null),
  fork: (s) => (parts(s).reduce((n, p) => n + (p.armor || 0), 0) >= 3 ? '◆ splits' : null),
  'log-wipe': (s) => (parts(s).some((p) => p.mimic) ? 'mimic' : null),
  'null-route': (s) => (charging(s, 0) ? 'charge now' : null),
  'shadow-copy': (s) => (charging(s, 0) ? 'charge now' : null),
  harden: (s) => (charging(s, 0) ? 'charge now' : null),
};
// The moment this key is built for, if it's on the board now (a fight on, tells or not).
export function situationOf(s, id) {
  if (!active(s) || !SITUATIONS[id]) return null;
  try { return SITUATIONS[id](s); } catch { return null; }
}
export const hasSituation = (id) => !!SITUATIONS[id];
