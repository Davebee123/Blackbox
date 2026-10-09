// Campaign sim (docs/roguelite.md 9.1, phase 2): a bot plays the breach campaign from level 1, one class at a time, the
// way a sensible player would. It breaches the lowest open server it hasn't captured; when that one is more than a
// level over it, it re-images the deepest server it holds for XP first (and for better rewrites). A failed breach
// retries from its checkpoint. It takes the first bounty on a card, spends talents as it levels, and fights, drafts and
// walks the map like breachsim.mjs's bot.
// The world (world.mjs, docs/world.md 6.4): the bot follows wick's leads (a dead drop on a server near its level is its
// next breach, when it has a script slot free) and skips a server under pressure half the time when a clean one is as
// close. Each breach records what the world did: new events, servers under pressure, the clean-server rule, and any
// move after a loss.
//   node campaignsim.mjs [maxBreaches=80] [seeds=2] [--world on|off]   pacing per class: breaches per level, win rate
//   by level, deaths, loot, and the world's numbers
import { fresh, command, hackerLevel, hackerOf, stashItem, rigOf } from './dist/combat.mjs';
import { spendTalents } from './dist/breach.mjs';
import { newCampaign, launch, leave, statusOf, SERVERS, SERVER, held, recOf, bountiesOn, CAMPAIGN, outgrown } from './dist/campaign.mjs';
import { WORLD, moveOn, eventOn, pressured, cleanRuleHolds } from './dist/world.mjs';
import { scriptsOf, slotsOf } from './dist/scripts.mjs';
import { SLOT_KINDS, seeded } from './dist/gear.mjs';
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
  let pick = target && (target.level <= L + margin || !mine) ? target : mine || target || open[0];
  if (!pick) return null;
  // The world: a lead from wick is the next breach, when the drop sits on a server near the bot's level and the bot
  // has a free script slot for what it holds.
  const drop = scriptsOf(s).length < slotsOf(s) && SERVERS.find((x) => eventOn(s, x.id) && ['open', 'held'].includes(statusOf(s, x.id)) && x.level <= L + margin && x.level >= L - WORLD.near && !outgrown(s, x));
  if (drop) pick = drop;
  // A server under pressure: half the time, a clean open server as close to the bot's level goes first.
  else if (moveOn(s, pick.id) && seeded((s.camp.seed * 7919 + s.camp.breaches * 104729) >>> 0)() < 0.5) {
    const clean = open.filter((x) => !moveOn(s, x.id) && x.level <= Math.max(L + margin, pick.level) && streak(x.id) < 3)[0];
    if (clean) pick = clean;
  }
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
export function runCampaign({ cls = 'breaker', seed = 1, to = 20, max = 80, trace = false, sub = null } = {}) {
  const s = fresh();
  s.rng = (seed * 2654435761 + cls.length * 131) >>> 0;
  s.profile = { handle: 'bot', pwLen: 6, since: 0 };
  command(s, `archetype ${cls}`);
  newCampaign(s, { seed });
  const log = [], reached = {};
  let minutes = 0;
  for (let i = 0; i < max && hackerLevel(s) < to; i++) {
    spendTalents(s, { sub: sub || PICK[cls] });
    gearUp(s);
    const t = nextTarget(s);
    if (!t) break;
    const [id, opts] = t, srv = SERVERS.find((x) => x.id === id), lv = hackerLevel(s);
    const b = launch(s, id, opts);
    if (!b) break;
    const rig = rigOf(s).join(',');
    const before = { events: new Set((s.camp.world?.events || []).map((e) => e.id)), moves: { ...(s.camp.world?.moves || {}) }, under: !!b.card.world?.digin, drop: !!b.card.world?.drop };
    const r = playOut(s);
    const row = { n: i + 1, id, server: srv.level, level: lv, after: hackerLevel(s), result: b.result, won: b.result === 'won', fights: r.fights, cycles: r.cycles, nodes: r.nodes, from: opts.from, reimage: !!b.campaign.reimage, banked: b.banked.length, diedAt: b.result === 'lost' ? `${b.map.nodes[b.at]?.kind}@act${(b.map.nodes[b.at]?.act ?? 0) + 1}` : null, xp: b.xp };
    // What the world did after this breach.
    const w = s.camp.world || { events: [], moves: {} };
    row.world = {
      turned: (w.turn || 0) > 0, fresh: w.events.filter((e) => !before.events.has(e.id)).length, live: w.events.length, pressured: pressured(s), clean: cleanRuleHolds(s),
      moved: Object.keys(w.moves).filter((k) => !before.moves[k]).length, under: before.under, drop: before.drop, pulled: !!b.dropped,
    };
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
    // A real upgrade (docs/roguelite.md 9.3): a rarity step, or 3 item levels or more, in a slot.
    const RANK = { stock: 1, tuned: 2, custom: 3, zeroday: 4, indemnified: 4 }, was = rig.split(',');
    row.real = rigOf(s).filter((x, k) => { const a = stashItem(s, was[k]), c = x && stashItem(s, x); return c && x !== was[k] && (!a || RANK[c.rarity] > RANK[a.rarity] || c.level >= a.level + 3); }).length;
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
    const lootOf = (lo, hi) => { const xs = all.filter((x) => x.level >= lo && x.level <= hi); return xs.length ? { banked: xs.reduce((n, x) => n + (x.banked || 0), 0) / xs.length, upgrades: xs.reduce((n, x) => n + (x.upgrades || 0), 0) / xs.length, real: xs.reduce((n, x) => n + (x.real || 0), 0) / xs.length } : null; };
    const loot = { '1-5': lootOf(1, 5), '6-10': lootOf(6, 10), '11-15': lootOf(11, 15), '16+': lootOf(16, 99) };
    out.push({ cls, loot, to5: at(5, 'breaches'), to10: at(10, 'breaches'), to15: at(15, 'breaches'), to20: at(20, 'breaches'), min10: at(10, 'minutes'), min20: at(20, 'minutes'), winLow: band(1, 5), winMid: band(6, 10), winHigh: band(11, 15), winTop: band(16, 25), win: Math.round((all.filter((x) => x.won).length / all.length) * 100), deaths, perLevel, level: avg((r) => r.level), held: avg((r) => r.held), breaches: avg((r) => r.log.length) });
  }
  return out;
}

// The world's numbers (docs/world.md 6.4), over every breach once the world has turned: new events a breach (mean and
// most), live events, servers under pressure (most, and how many breaches end with 0, 1 or 2), the clean-server rule,
// moves after a loss (never), dead drops placed and pulled, and the win rate on pressured breaches against clean ones.
export function worldReport(runs) {
  const all = runs.flatMap((r) => r.log).filter((x) => x.world?.turned);
  if (!all.length) return null;
  const n = all.length, sum = (f) => all.reduce((k, x) => k + f(x), 0);
  const win = (xs) => (xs.length ? Math.round((xs.filter((x) => x.won).length / xs.length) * 100) : null);
  const under = all.filter((x) => x.world.under), clean = all.filter((x) => !x.world.under);
  const by = [0, 1, 2].map((k) => all.filter((x) => x.world.pressured === k).length);
  // The same comparison on first tries at an uncaptured server, by how far over the bot it was (re-images and drops on
  // easy servers would flatter the clean side).
  const fresh = all.filter((x) => !x.reimage && x.from === 'start'), gap = (x) => Math.max(-2, Math.min(2, x.server - x.level));
  const bands = [-2, -1, 0, 1, 2].map((g) => { const u = fresh.filter((x) => gap(x) === g && x.world.under), c = fresh.filter((x) => gap(x) === g && !x.world.under); return { g, under: win(u), nu: u.length, clean: win(c), nc: c.length }; }).filter((x) => x.nu >= 3 && x.nc >= 3);
  return {
    breaches: n, events: sum((x) => x.world.fresh) / n, eventsMax: Math.max(...all.map((x) => x.world.fresh)), liveMax: Math.max(...all.map((x) => x.world.live)),
    pressureMax: Math.max(...all.map((x) => x.world.pressured)), pressureMean: sum((x) => x.world.pressured) / n, pressureBy: by,
    clean: sum((x) => (x.world.clean ? 1 : 0)) / n, afterLoss: all.filter((x) => !x.won).reduce((k, x) => k + x.world.moved, 0),
    moves: sum((x) => x.world.moved) / n, drops: sum((x) => x.world.drop ? 1 : 0), pulled: sum((x) => (x.world.pulled ? 1 : 0)),
    winUnder: win(under), winClean: win(clean), under: under.length, bands,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const nums = process.argv.slice(2).filter((x) => /^\d+$/.test(x)).map(Number);
  const max = nums[0] || 80, seeds = nums[1] || 2, trace = process.argv.includes('trace');
  const wi = process.argv.indexOf('--world');
  if (wi > 0) WORLD.on = process.argv[wi + 1] !== 'off';
  console.log(`world ${WORLD.on ? 'on' : 'off'}`);
  const runs = [];
  for (const cls of CLASSES) for (let seed = 1; seed <= seeds; seed++) runs.push(runCampaign({ cls, seed, max, trace }));
  const f = (x, d = 0) => (x == null ? '  -' : x.toFixed(d).padStart(4));
  console.log('class        to5  to10 to15 to20  min10 min20  win  1-5        6-10       11-15      16+        deaths');
  for (const r of report(runs)) console.log(`${r.cls.padEnd(12)} ${f(r.to5)} ${f(r.to10)} ${f(r.to15)} ${f(r.to20)}  ${f(r.min10)}  ${f(r.min20)}  ${String(r.win).padStart(3)}%  ${r.winLow.padEnd(10)} ${r.winMid.padEnd(10)} ${r.winHigh.padEnd(10)} ${r.winTop.padEnd(10)} ${Object.entries(r.deaths).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const r of report(runs)) console.log(`${r.cls.padEnd(12)} breaches per level: ${Object.entries(r.perLevel).map(([l, n]) => `${l}:${n}`).join(' ')}`);
  for (const r of report(runs)) console.log(`${r.cls.padEnd(12)} loot per breach (banked, swaps, real upgrades): ${Object.entries(r.loot).filter(([, x]) => x).map(([k, x]) => `${k} ${x.banked.toFixed(1)}, ${x.upgrades.toFixed(1)}, ${x.real.toFixed(2)}`).join(' · ')}`);
  const w = worldReport(runs);
  if (w) {
    console.log(`world: ${w.breaches} breaches after the first turn · new events ${w.events.toFixed(2)} a breach (most ${w.eventsMax}) · live events most ${w.liveMax} · dead drops met ${w.drops}, pulled ${w.pulled}`);
    console.log(`world: pressure most ${w.pressureMax}, mean ${w.pressureMean.toFixed(2)} (breaches ending with 0/1/2: ${w.pressureBy.join('/')}) · new moves ${w.moves.toFixed(2)} a breach · clean open server ${Math.round(w.clean * 100)}% · moves after a loss ${w.afterLoss}`);
    console.log(`world: win rate under pressure ${w.winUnder ?? '-'}% of ${w.under}, clean ${w.winClean ?? '-'}% · first tries by server level over yours: ${w.bands.map((x) => `${x.g >= 0 ? '+' : ''}${x.g} ${x.under}% of ${x.nu} vs ${x.clean}% of ${x.nc}`).join(' · ')}`);
  }
}
