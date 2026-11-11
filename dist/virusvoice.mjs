// Virus attack sounds in a fight (docs/ability-sounds-plan.md "Virus attacks", round 4): which of a batch's events play
// which attack's sound (virussound.mjs, the pick) in place of today's voice, and when each lands. app.js react() asks
// here, moves the batch's numbers by `shift`, and plays each voice with its chip's strike (fire) or on its beat.
//   One sound an attack a batch: the biggest hit on you at full level, each other attack's first hit at OTHERS (up to
//   MAX in all); the rest keep their flash and buzz and stay quiet.
//   The number lands on the strike's impact: every event from the virus's first strike on waits `shift` ms, so no
//   strike has to land before it could get there.
import { OWN_PLAN, attackOf } from './virussound.mjs';
import { STRIKE_PLAN, STRIKES, chipTheme } from './chipfx.mjs';

export const OTHERS = 0.4, MAX = 4, SHIFT_CAP = 1000;
const RANK = { charge: 3, crit: 2, beat: 1, hit: 0 };
const SPENT = ['server-hit', 'evaded', 'blocked', 'encrypt', 'blind', 'spawn']; // what a part's attack going off can say

// What an event sounds like, or null (it keeps today's voice): { key, result, power, kind } with kind 'hit' (a hit on
// you), 'miss' (blocked, evaded) or 'other' (what isn't a hit on you).
//   ctx: partOf(id) → the part · packed(part): its name is hidden, so it lashes · max: your max (a hit's size)
export function voiceOf(e, { partOf, packed = () => false, max = 100 } = {}) {
  if (!e || e.who) return null; // a crewmate's stays as it is
  const p = e.source ? partOf(e.source) : null, theme = themeOf(p, packed), strike = attackOf(theme);
  switch (e.type) {
    case 'server-hit':
      if (!p || e.dot) return null;
      return { key: strike, result: e.tell ? 'charge' : e.crit ? 'crit' : p.lien || p.broadcast || p.beat ? 'beat' : 'hit', power: Math.max(0, Math.min(1, ((e.amount || 0) / (max || 100)) * 5)), kind: 'hit' };
    case 'evaded': return p ? { key: strike, result: 'evaded', power: 0.3, kind: 'miss' } : null;
    case 'blocked': return p && !e.shield && !e.answered && !e.tell && !e.badblock ? { key: strike, result: 'blocked', power: 0.3, kind: 'miss' } : null;
    case 'encrypt': return p ? { key: 'encrypt', result: 'hit', power: 0.3, kind: 'other' } : null;
    case 'blind': return p ? { key: 'blind', result: 'hit', power: 0.3, kind: 'other' } : null;
    case 'spawn': return p && !e.booted ? { key: 'replicate', result: 'hit', power: 0.3, kind: 'other' } : null;
    case 'patch': return e.target ? { key: e.tell ? 'seal' : 'patch', result: 'hit', power: 0.3, kind: 'other' } : null;
    case 'heal': return e.target ? { key: 'patch', result: 'hit', power: 0.3, kind: 'other' } : null;
    case 'phase': return e.tell && !e.act && !e.enrage ? { key: 'cast', result: 'hit', power: 0.3, kind: 'other' } : null;
    default: return null;
  }
}
// The theme whose strike a part's chip throws (null: none, or its name is hidden: the ghost and the lash).
export const themeOf = (p, packed = () => false) => { const th = p && !packed(p) ? chipTheme(p.name) : null; return STRIKES.has(th) ? th : null; };
// What today plays for it, when its own sound can't (the samples aren't in, the voices are capped).
export const todayOf = (e, v) => ({ 'server-hit': e.crit ? 'hurtcrit' : 'hurt', evaded: 'evade', blocked: 'interrupt', encrypt: 'encrypt', blind: 'blind', patch: 'patch', heal: 'patch', phase: 'hurt' })[e.type] || (v?.kind === 'hit' ? 'hurt' : null);

// A batch's voices.
//   delay(e): when its number shows, ms from now (dmgfx.mjs plan) · lashing: the lash is drawn (Screen effects on,
//   Motion on), so a hit's number waits `lashTravel` for it · chipNow(partId): a chip of that part's is in Now on the
//   board, so its attack going off is drawn from it · sound: Sound is on (off: the timing only, no voices).
// → { list, voiced, shift, from, delay }
//   list: [{ e, src, key, result, power, plan, mode, gain, land }] in order. mode 'chip': its theme's strike flies from
//   its chip and lands at `land` · 'lash': the lash leaves at land − plan.impact · 'beat': nothing to time it, on its
//   beat (its wind-up before it where there's room). gain 0: quiet (it keeps its flash and buzz).
//   voiced: the events whose own voice stays quiet · shift: how long the numbers wait (ms), from event id `from` on ·
//   delay(e): when its number shows now.
export function voices(events, { delay = () => 0, lashing = false, lashTravel = OWN_PLAN.lash.impact, chipNow = () => false, sound = true, ...ctx } = {}) {
  const hitBy = new Set(events.filter((e) => e.type === 'server-hit' && e.source && !e.who).map((e) => e.source));
  const list = [], spent = new Set(), waits = (e) => (lashing && (e.type === 'server-hit' || e.type === 'encrypt') ? lashTravel : 0);
  for (const e of events) {
    const v = voiceOf(e, ctx);
    if (!v) continue;
    const src = e.source || e.target, first = SPENT.includes(e.type) && !spent.has(src), p = e.source ? ctx.partOf(e.source) : null, theme = themeOf(p, ctx.packed);
    if (SPENT.includes(e.type)) spent.add(src);
    // A blocked or evaded attack sounds only as its chip goes off; a note beside a hit that landed keeps today's voice.
    if (v.kind === 'miss' && (!first || hitBy.has(src) || !chipNow(src))) continue;
    const flown = first && chipNow(src) && !e.bounce && !e.fuse; // its chip goes off this batch
    const own = v.key === 'replicate' ? 'copy' : v.key === 'blind' ? 'scramble' : v.key === 'encrypt' ? 'lock' : null; // the strike what isn't a hit rides
    const rides = v.kind === 'other' ? own : theme; // the strike that times it: its theme's, or the one what isn't a hit rides
    const mode = flown && lashing && theme && rides === theme ? 'chip' : v.key === 'lash' && lashing && e.type === 'server-hit' ? 'lash' : 'beat';
    const plan = mode === 'chip' ? STRIKE_PLAN[theme] : OWN_PLAN[v.key] || STRIKE_PLAN[own || theme] || { impact: 0 };
    list.push({ e, src, ...v, plan, mode, gain: 1, wait: waits(e) });
  }
  // The numbers wait for the slowest strike to get there.
  const chips = list.filter((x) => x.mode === 'chip');
  const shift = Math.min(SHIFT_CAP, Math.max(0, ...chips.map((x) => x.plan.impact - delay(x.e) - x.wait)));
  const from = chips.length ? Math.min(...chips.map((x) => x.e.id)) : null;
  const delayed = (e) => delay(e) + (from != null && shift && e.id >= from ? shift : 0);
  for (const x of list) x.land = delayed(x.e) + x.wait;
  // One sound an attack: the biggest hit leads, every other attack's first hit follows quietly; what isn't a hit, once.
  const hits = list.filter((x) => x.kind === 'hit'), lead = hits.reduce((a, x) => (!a || RANK[x.result] > RANK[a.result] || (RANK[x.result] === RANK[a.result] && x.power > a.power) ? x : a), null);
  const seen = new Set(lead ? [lead.key] : []);
  let n = lead ? 1 : 0;
  for (const x of list) {
    if (x === lead) continue;
    // (A part that hit you and scrambled you in one go: its hit speaks for both.)
    if (seen.has(x.key) || n >= MAX || (x.kind === 'other' && x.e.source && hits.some((h) => h.src === x.src && x.key !== 'replicate'))) { x.gain = 0; continue; }
    seen.add(x.key); n++;
    if (x.kind === 'hit') x.gain = OTHERS;
  }
  return { list, voiced: new Set(sound ? list.map((x) => x.e) : []), shift, from, delay: delayed };
}
