// Skill rules (docs/roguelite.md 11): the rule affixes that change how one skill plays. They were drafted mods in
// phase 3; drafting is gone, and the best of them roll on blues and yellows like any rule (gear.mjs RULES, the
// entries with a skill). A rule rolls only for its own class (rollItem's cls), so a Breaker never finds a Hook rule,
// and only where the caller names a class: the breach campaign. The old game's rolls are unchanged.
//
// What they do lives here: a few patch a skill's fields for the length of a fight (patchRules / unpatchRules, laid
// on by breach.mjs when a fight starts and taken off when it ends: the global data is never changed for good), the
// rest act on what the fight emits (onEvent, through combat.mjs hooks.emitted) or after the command they change
// (afterCommand, through hooks.commanded).
import { ABILITIES } from './data.mjs';
import { part, alive, livingParts, hit, emit, powerOf, scaled, classOf, loaded } from './combat.mjs';
import { RULES } from './gear.mjs';

const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
// The skill rules your loaded gear carries, for your class: { ruleId: value } (the best roll of each, once).
export function skillRules(s) {
  const out = {}, cls = classOf(s);
  for (const it of loaded(s)) {
    const r = it.rule && RULES[it.rule];
    if (!r?.skill || r.cls !== cls) continue;
    out[it.rule] = Math.max(out[it.rule] ?? 0, it.ruleValue ?? 0);
  }
  return out;
}
const has = (s, id) => s.encounter?.rules?.[id] != null;
const V = (s, id) => s.encounter?.rules?.[id] ?? 0;

// The fields a patching rule changed, as they were: put back when the fight ends.
let saved = null;
export function unpatchRules() {
  if (!saved) return;
  for (const [skill, was] of Object.entries(saved)) for (const [k, v] of Object.entries(was)) { if (v === undefined) delete ABILITIES[skill][k]; else ABILITIES[skill][k] = v; }
  saved = null;
}
// A fight starts: the rules in force for it (e.rules), and the patching ones laid on.
export function patchRules(s) {
  unpatchRules();
  const e = s.encounter, rules = skillRules(s);
  if (e) e.rules = rules;
  saved = {};
  for (const [id, v] of Object.entries(rules)) {
    const r = RULES[id], a = ABILITIES[r.skill];
    if (!a || !r.patch) continue;
    const was = (saved[r.skill] ||= {});
    for (const [k, x] of Object.entries({ ...r.patch(v), ...(r.short ? { short: r.short(v) } : {}) })) { if (!(k in was)) was[k] = a[k]; a[k] = x; }
  }
}
function delay(s, p, n, by) {
  if (!alive(p) || !p.attack || p.attack.due >= 900) return;
  p.attack.due += n;
  emit(s, 'interrupt', `${by}: the ${p.name}'s ${p.attack.name} is delayed ${cyc(n)}.`, { target: p.id });
}
const chitsIn = (ev) => { const m = /loses (\d+) ◆/.exec(ev.message); return m ? Number(m[1]) : /two ◆ broken/.test(ev.message) ? 2 : /◆ broken/.test(ev.message) ? 1 : 0; };
// What the fight says happened: Aftershock on ◆ Crack breaks, Reflective ACL on a hit your shield absorbs whole.
export function onEvent(s, ev) {
  const e = s.encounter;
  if (!e?.rules || e.phase !== 'active') return;
  if (ev.type === 'armor' && ev.target && has(s, 'aftershock')) {
    const n = chitsIn(ev), p = part(s, ev.target);
    if (n && /^Crack: /.test(ev.message) && alive(p)) hit(s, p, Math.round(V(s, 'aftershock') * powerOf(s)) * n, { by: 'Aftershock', pierce: true });
  }
  if (ev.type === 'blocked' && has(s, 'reflective-acl') && /^Shield absorbs/.test(ev.message) && e.shield > 0 && ev.source) {
    const p = part(s, ev.source);
    if (alive(p)) hit(s, p, Math.round((ev.amount * V(s, 'reflective-acl')) / 100), { by: 'Reflective ACL', pierce: true });
  }
}
// After your command resolves: what the rule on that skill adds.
export function afterCommand(s, { id, target, auto }) {
  const e = s.encounter;
  if (!e?.rules || auto === 'daemon' || e.phase !== 'active') return;
  const t = target && part(s, target.id || target);
  const mine = (r) => has(s, r) && RULES[r].skill === id;
  if (mine('zero-click')) { for (const p of livingParts(s)) { p.exposedUntil = Math.max(p.exposedUntil || 0, e.cycle + 1); if (p !== t) hit(s, p, scaled(s, V(s, 'zero-click')), { by: 'Zero Click', mine: true }); } emit(s, 'status', 'Zero Click Exposes every part for 2 cycles.', { mark: 'exposed' }); }
  if (mine('backpressure') && alive(t)) delay(s, t, 1, 'Backpressure');
  if (mine('snare') && alive(t)) delay(s, t, 1, 'Snare');
  if (mine('long-poll') && alive(t)) for (const x of e.burns.filter((y) => y.target === t.id)) { if (!alive(t)) break; hit(s, t, x.damage, { by: `Long Poll (${x.name})`, dot: true }); }
}
