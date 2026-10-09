// Campaign sim (docs/roguelite.md 9.1, phase 2): a bot plays the breach campaign from level 1, one class at a time, the
// way a sensible player would. It breaches the lowest open server it hasn't captured; when that one is more than a
// level over it, it re-images the deepest server it holds for XP first (and for better rewrites). A failed breach
// retries from its checkpoint. It takes the first bounty on a card, spends talents as it levels, and fights, drafts and
// walks the map like breachsim.mjs's bot.
//   node campaignsim.mjs [maxBreaches=80] [seeds=2]   pacing per class: breaches per level, win rate by level, deaths
import { fresh, command, hackerLevel, hackerOf, stashItem, rigOf } from './dist/combat.mjs';
import { spendTalents } from './dist/breach.mjs';
import { newCampaign, launch, leave, statusOf, SERVERS, held, recOf, bountiesOn, CAMPAIGN } from './dist/campaign.mjs';
import { SLOT_KINDS } from './dist/gear.mjs';
import { playOut, better, CLASSES } from './breachsim.mjs';

// The subclass a sensible player picks at 10 for breaches (breachsim.mjs: Payload wins far more breaches than Phantom,
// Herder more than Hijacker).
export const PICK = { breaker: 'demolitionist', bastion: 'warden', infiltrator: 'payload', operator: 'herder' };
// How long a breach takes a person, roughly: a cycle every 5 seconds (an order fires the cycle at once; you think
// between), and 20 seconds a node to read it and decide.
export const PACE = { cycle: 5, node: 20 };

// The bot's next breach: [server id, { from, bounty }].
export function nextTarget(s, { margin = 1 } = {}) {
  const L = hackerLevel(s);
  // A wall: lost there three breaches running. A player tries another open server, or farms one it holds, and comes
  // back to the wall every fourth breach.
  const streak = (id) => { let n = 0; for (const x of [...(s.camp.history || [])].reverse()) { if (x.id !== id) continue; if (x.result === 'won') break; n++; } return n; };
  const open = SERVERS.filter((x) => statusOf(s, x.id) === 'open').sort((a, b) => (streak(a.id) >= 3) - (streak(b.id) >= 3) || a.level - b.level);
  const target = open[0] && streak(open[0].id) >= 3 && SERVERS.some((x) => held(s, x.id) && x.level <= L) && streak(open[0].id) % 4 !== 3 ? null : open[0];
  const mine = SERVERS.filter((x) => held(s, x.id) && x.level <= L).sort((a, b) => b.level - a.level)[0];
  // Too far over you, and something you hold is close to your level: farm it first.
  const pick = target && (target.level <= L + margin || !mine) ? target : mine || target || open[0];
  if (!pick) return null;
  const rec = recOf(s, pick.id);
  return [pick.id, { from: rec.checkpoint && !rec.captured ? 'checkpoint' : 'start', bounty: bountiesOn(s, pick.id)[0] || null }];
}
// Put the best of the stash on: the bot keeps its rig up to date between breaches.
// Returns how many slots it upgraded.
function gearUp(s) {
  let n = 0;
  for (const it of [...(s.stash || [])].sort((a, b) => (b.level || 0) - (a.level || 0))) {
    if (!SLOT_KINDS.includes(it.group) || rigOf(s).includes(it.id)) continue;
    if (better(s, it)) { command(s, 'load ' + it.id); n++; }
  }
  return n;
}

// One class's campaign: until it reaches level `to` or runs out of breaches.
export function runCampaign({ cls = 'breaker', seed = 1, to = 20, max = 80, trace = false } = {}) {
  const s = fresh();
  s.rng = (seed * 2654435761 + cls.length * 131) >>> 0;
  s.profile = { handle: 'bot', pwLen: 6, since: 0 };
  command(s, `archetype ${cls}`);
  newCampaign(s, { seed });
  const log = [], reached = {};
  let minutes = 0;
  for (let i = 0; i < max && hackerLevel(s) < to; i++) {
    spendTalents(s, { sub: PICK[cls] });
    gearUp(s);
    const t = nextTarget(s);
    if (!t) break;
    const [id, opts] = t, srv = SERVERS.find((x) => x.id === id), lv = hackerLevel(s);
    const b = launch(s, id, opts);
    if (!b) break;
    const rig = rigOf(s).join(',');
    const r = playOut(s);
    const row = { n: i + 1, id, server: srv.level, level: lv, after: hackerLevel(s), result: b.result, won: b.result === 'won', fights: r.fights, cycles: r.cycles, nodes: r.nodes, from: opts.from, reimage: !!b.campaign.reimage, banked: b.banked.length, diedAt: b.result === 'lost' ? `${b.map.nodes[b.at]?.kind}@act${(b.map.nodes[b.at]?.act ?? 0) + 1}` : null, xp: b.xp };
    minutes += (r.cycles * PACE.cycle + r.nodes * PACE.node) / 60;
    row.minutes = minutes;
    for (let l = lv + 1; l <= hackerLevel(s); l++) reached[l] ||= { breaches: i + 1, minutes };
    log.push(row);
    if (trace) console.log(`${String(row.n).padStart(3)} ${srv.name.padEnd(15)} lv${String(srv.level).padStart(2)} you ${lv}→${row.after} ${row.result}${row.diedAt ? ' ' + row.diedAt : ''}${row.reimage ? ' (re-image)' : ''}${row.from === 'checkpoint' ? ' (checkpoint)' : ''}`);
    leave(s);
    // Loot (the designer: "WAY too much loot per run"): what this breach banked, and the slots it upgraded, in the
    // breach (playOut equips as it goes) or after it.
    gearUp(s);
    row.upgrades = rigOf(s).filter((x, k) => x && x !== rig.split(',')[k]).length;
  }
  return { cls, seed, level: hackerLevel(s), xp: hackerOf(s).xp, log, reached, held: SERVERS.filter((x) => held(s, x.id)).length, state: s };
}

// The report: per class, breaches and minutes to 5, 10, 15 and 20, win rate by level band, and where runs die.
export function report(runs) {
  const by = {};
  for (const r of runs) (by[r.cls] ||= []).push(r);
  const out = [];
  for (const [cls, rs] of Object.entries(by)) {
    const avg = (f) => { const xs = rs.map(f).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
    const at = (l, k) => avg((r) => r.reached[l]?.[k]);
    const all = rs.flatMap((r) => r.log);
    const band = (lo, hi) => { const xs = all.filter((x) => x.level >= lo && x.level <= hi); return xs.length ? `${Math.round((xs.filter((x) => x.won).length / xs.length) * 100)}% of ${xs.length}` : '-'; };
    const deaths = {};
    for (const x of all) if (x.diedAt) deaths[x.diedAt.replace(/@.*/, '')] = (deaths[x.diedAt.replace(/@.*/, '')] || 0) + 1;
    const perLevel = {};
    for (let l = 1; l < 20; l++) { const a = at(l, 'breaches'), b2 = at(l + 1, 'breaches'); if (a != null && b2 != null) perLevel[l] = +(b2 - a).toFixed(1); }
    const lootOf = (lo, hi) => { const xs = all.filter((x) => x.level >= lo && x.level <= hi); return xs.length ? { banked: xs.reduce((n, x) => n + (x.banked || 0), 0) / xs.length, upgrades: xs.reduce((n, x) => n + (x.upgrades || 0), 0) / xs.length } : null; };
    const loot = { '1-5': lootOf(1, 5), '6-10': lootOf(6, 10), '11-15': lootOf(11, 15), '16+': lootOf(16, 99) };
    out.push({ cls, loot, to5: at(5, 'breaches'), to10: at(10, 'breaches'), to15: at(15, 'breaches'), to20: at(20, 'breaches'), min10: at(10, 'minutes'), min20: at(20, 'minutes'), winLow: band(1, 5), winMid: band(6, 10), winHigh: band(11, 15), winTop: band(16, 25), win: Math.round((all.filter((x) => x.won).length / all.length) * 100), deaths, perLevel, level: avg((r) => r.level), held: avg((r) => r.held), breaches: avg((r) => r.log.length) });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const max = Number(process.argv[2]) || 80, seeds = Number(process.argv[3]) || 2, trace = process.argv.includes('trace');
  const runs = [];
  for (const cls of CLASSES) for (let seed = 1; seed <= seeds; seed++) runs.push(runCampaign({ cls, seed, max, trace }));
  const f = (x, d = 0) => (x == null ? '  -' : x.toFixed(d).padStart(4));
  console.log('class        to5  to10 to15 to20  min10 min20  win  1-5        6-10       11-15      16+        deaths');
  for (const r of report(runs)) console.log(`${r.cls.padEnd(12)} ${f(r.to5)} ${f(r.to10)} ${f(r.to15)} ${f(r.to20)}  ${f(r.min10)}  ${f(r.min20)}  ${String(r.win).padStart(3)}%  ${r.winLow.padEnd(10)} ${r.winMid.padEnd(10)} ${r.winHigh.padEnd(10)} ${r.winTop.padEnd(10)} ${Object.entries(r.deaths).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const r of report(runs)) console.log(`${r.cls.padEnd(12)} breaches per level: ${Object.entries(r.perLevel).map(([l, n]) => `${l}:${n}`).join(' ')}`);
  for (const r of report(runs)) console.log(`${r.cls.padEnd(12)} loot per breach (banked, upgrades): ${Object.entries(r.loot).filter(([, x]) => x).map(([k, x]) => `${k} ${x.banked.toFixed(1)}, ${x.upgrades.toFixed(1)}`).join(' · ')}`);
}
