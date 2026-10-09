// LOWLIGHT's back room (docs/world.md 2, first slice W0): after every breach the room opens. wick says one line about
// the breach you just played, picked from its debrief by priority, and a lead when the world turn put a dead drop on
// the map. The board carries what moved on the network. Pure: the campaign's state in, the visit out.
//
// State on s.camp.room:
//   visit   the last visit: { turn, id, result, where, wick: { key, id, text } | null, lead: { text, at } | null, news }
//   seen    line ids already said (a set is said in order and starts over once it runs out)
//   took    rewrites you've captured with, for wick's first-time lines
import ROOM from './content/room.mjs';
import { SERVER, FRAGMENTS } from './campaign.mjs';
import { BOSSES } from './data.mjs';
import { AUTHORS } from './authors.mjs';
import { rowSub } from './breach.mjs';

export { ROOM };
export const freshRoom = () => ({ visit: null, seen: [], took: [] });
// wick's word for a server.
export const nickOf = (id) => ROOM.names[id] || SERVER[id]?.name.toLowerCase() || id;

// ---------- the debrief ----------
// The facts of a breach that just ended (breach.mjs state and campaign.mjs's report), before the room reads them.
// where: how far a loss got (act1, gate1, act2, gate2, act3, core), or the gate a jack-out stood on.
export function debriefOf(s, b, report = {}) {
  const c = s.camp, id = b.campaign.id, srv = SERVER[id], result = b.result;
  const here = b.map?.nodes?.[b.at];
  const where = !here ? 'act1' : here.kind === 'boss' ? 'core' : here.kind === 'gate' ? `gate${here.act + 1}` : `act${here.act + 1}`;
  let streak = 0;
  for (const x of [...(c.history || [])].reverse()) { if (x.id !== id) continue; if (x.result === 'won') break; streak++; }
  const subs = srv.subsystems.flat(), rw = c.servers?.[id]?.rewrites || {};
  const st = b.stats || {};
  return {
    result, id, where, streak,
    first: result === 'won' && !b.campaign.reimage && !b.campaign.replay,
    reimage: result === 'won' && !!b.campaign.reimage && !b.campaign.replay,
    replay: !!b.campaign.replay, checkpoint: b.campaign.checkpoint || 0,
    heat: b.heat || 0, opened: report.heat || 0,
    stock: result === 'won' && !b.campaign.replay ? subs.filter((x) => !rw[x]) : [],
    rests: st.rests ?? 0, drafts: (b.mods?.length || 0) + (b.cves?.length || 0), elites: st.elites || 0, skips: st.skips || 0,
    digin: b.card?.world?.digin?.author || null,
    rewrites: result === 'won' ? Object.values(b.rewrites || {}).map((x) => x.id) : [],
    lostOn: result === 'won' ? null : id,
  };
}
// The facts wick has lines for, most important first (docs/world.md 2.4): 1 a Resident's first fall, 4 a loss by
// where it ended, 5 a choice you made in the run, 6 a rewrite the first time you take it. Priorities 2 (a world event
// resolved), 3 (contracts and bounties) and 7 (heat, in the Claims desk's voice) come with standing and the Claims
// desk (W1). vars fill the line's blanks.
export function factsOf(s, d) {
  const srv = SERVER[d.id], c = s.camp;
  const vars = { name: nickOf(d.id), resident: (srv.residentName || BOSSES[srv.resident]?.name || 'the resident').toLowerCase(), author: (AUTHORS[d.digin || srv.author]?.name || '').toLowerCase(), heat: d.heat, sub: d.stock[0] || '' };
  const out = [], add = (pri, key) => out.push({ pri, key, vars });
  if (d.first) add(1, `first.${d.id}`);
  if (d.result !== 'won') {
    if (d.streak >= 3) add(4, 'streak');
    add(4, d.result === 'out' ? 'out' : `lost.${d.where}`);
  } else {
    if (d.digin) add(5, 'dugin');
    if (d.opened) add(5, 'hot');
    if (d.checkpoint) add(5, 'checkpoint');
    if (d.stock.length) add(5, 'stock');
    if (!d.replay && d.rests === 0) add(5, 'norest');
    if (!d.replay && d.drafts <= 2) add(5, 'lean');
    if (d.elites >= 2) add(5, 'elites');
    if (d.skips >= 3) add(5, 'skipped');
    if (d.reimage) add(5, 'reimage');
    if (d.replay) add(5, 'replay');
    const took = new Set(c.room?.took || []);
    for (const rw of d.rewrites) if (!took.has(rw)) add(6, `rw.${rw}`);
  }
  return out.sort((a, b) => a.pri - b.pri);
}
const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
// A person's line: the most important fact it has a line for, the first of that set it hasn't said (a set that has run
// out starts over). Nothing fits, nothing said. Marks the line seen.
export function pickLine(room, person, facts) {
  const lines = ROOM[person] || {};
  for (const f of facts) {
    const set = lines[f.key];
    if (!set?.length) continue;
    const ids = set.map((_, i) => `${person}.${f.key}.${i}`);
    let i = ids.findIndex((x) => !room.seen.includes(x));
    if (i < 0) { room.seen = room.seen.filter((x) => !ids.includes(x)); i = 0; }
    room.seen.push(ids[i]);
    return { key: f.key, id: ids[i], pri: f.pri, text: fill(set[i], f.vars) };
  }
  return null;
}
// wick's lead for a dead drop: which side of the server it's on, by the row it waits in.
export function leadLine(room, e, first = false) {
  const srv = SERVER[e.at], card = { subsystems: srv.subsystems, rows: srv.rows };
  const vars = { name: nickOf(e.at), sub: rowSub(0, Math.min(e.row, (srv.rows || 4) - 2), card) || srv.subsystems[0][0] };
  const set = ROOM.leads[first ? 'first' : 'drop'], ids = set.map((_, i) => `lead.${first ? 'first' : 'drop'}.${i}`);
  let i = ids.findIndex((x) => !room.seen.includes(x));
  if (i < 0) { room.seen = room.seen.filter((x) => !ids.includes(x)); i = 0; }
  room.seen.push(ids[i]);
  return { text: fill(set[i], vars), at: e.at };
}
// The sentence at the top of the room: the last story beat whose fragment you hold.
export function roomSentence(s) {
  const have = new Set(s.camp?.archive || []);
  return [...ROOM.rooms].reverse().find((r) => r.after === null || have.has(r.after))?.text || '';
}
// After a breach: the visit the room shows, from the debrief and the world turn's news and lead. Remembers the
// rewrites you captured with.
export function visitAfter(s, d, turn = { news: [], lead: null }) {
  const room = (s.camp.room ||= freshRoom());
  const wick = pickLine(room, 'wick', factsOf(s, d));
  const lead = turn.lead ? leadLine(room, turn.lead, s.camp.world?.turn === 1) : null;
  if (d.result === 'won') for (const rw of d.rewrites) if (!room.took.includes(rw)) room.took.push(rw);
  room.visit = { turn: s.camp.world?.turn || 0, id: d.id, result: d.result, where: d.where, wick, lead, news: turn.news || [] };
  if (room.seen.length > 200) room.seen = room.seen.slice(-200);
  return room.visit;
}
// What the room says about the breach you came back from, for its header: "after REPO-DEPOT-7 · lost at gate 2".
export function afterLine(v) {
  if (!v) return '';
  const name = SERVER[v.id]?.name || v.id;
  const how = v.result === 'won' ? 'captured' : v.result === 'out' ? `jacked out at ${v.where.replace(/(\d)/, ' $1')}` : v.where === 'core' ? 'lost at the Resident' : /^gate/.test(v.where) ? `lost at ${v.where.replace(/(\d)/, ' $1')}` : `lost in act ${v.where.slice(3)}`;
  return `after ${name} · ${how}`;
}
export const dropFragments = () => FRAGMENTS.filter((f) => f.drop);
