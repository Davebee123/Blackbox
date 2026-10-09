// The breach campaign (docs/roguelite.md phase 2: "the world"): a map of servers by layer, each a fixed level band,
// linked to its neighbours. You breach a server linked to one you hold. A capture keeps its rewrites, and their
// outputs run on every later breach. It lives on s.camp, in its own save (app.js CAMPAIGN_KEY, ?campaign=breach):
// the old game's save is never read, written or migrated.
//
// What it adds over a playtest breach (breach.mjs):
//   the map      SERVERS: name, kind, level, author and family, a Resident from BOSSES, the subsystems an act, links
//   outputs      every captured server's rewrites, once each at their best tier; Spam Cannon only on its neighbours
//   checkpoints  a gate you beat stays beaten: a retry can start past it, with the rewrites from the acts behind it
//   re-imaging   breach a server you hold again: each subsystem you clear keeps its rewrite or changes it
//   bounties     up to two on a card; take one when you breach. Done, it pays a yellow protocol. Missed, nothing.
//   the pool     the cards a draft can offer: a readable core set to start (eight common CVEs, and one mod a skill),
//                and the pool widens: each server's first capture opens a CVE, each heat's first capture more
//   heat         1 to 8, ranked (heat.mjs): you pick it per breach; a capture at your highest opens the next. Each
//                server records the best heat you captured it at, and re-imaging asks for that heat or more
//   replays      Range (a captured sandbox): the Resident alone, for its loot; each breach you win earns a replay
//   the Archive  a core.dump after each Resident's first fall, filed in story order
// Pure like the engine: state in, events out. Nothing here runs on a clock.
import { emit, addItem, hackerLevel, command } from './combat.mjs';
import { seeded, rollItem, itemLabel, protocolSlots, SLOT_KINDS } from './gear.mjs';
import { startBreach, breachHooks } from './breach.mjs';
import { CVES, MODS } from './drafts.mjs';
import { LINKED } from './rewrites.mjs';
import { MAX_HEAT, heatRules } from './heat.mjs';

export const CAMPAIGN_KEY = 'blackbox-campaign-v1';
// Tuning. xp: what a breach kill's XP is worth over a plain guard kill (breach.mjs pays the Resident 3×, a gate 1.5×).
// startCves: the draft pool before any capture. outgrown: levels past a server before its card greys out.
// v: the save's shape (2: heat, mods in the pool, replays; migrate() brings a v1 save up). replays: Range's cap.
export const CAMPAIGN = { v: 2, start: 'sprawl-00', xp: 1.0, size: [1.1, 1.12, 1.2, 1.28], startCves: ['heartbleed', 'shellshock', 'eternalblue', 'sasser', 'mirai', 'printnightmare', 'rowhammer', 'wannacry'], outgrown: 5, bounties: 2, replays: [3, 5] };
// What each heat's first capture opens: the second mod for a skill that has one (rank 1), then rarer CVEs.
export const HEAT_UNLOCKS = { 1: ['critical-mass', 'shrapnel', 'backpressure', 'slow-drip', 'snare'], 2: ['qbot'], 3: ['smurf'], 4: ['tocttou'], 5: ['meltdown'], 6: ['follina'], 7: ['zerologon'], 8: [] };
const cardName = (id) => (CVES[id] ? CVES[id].name : MODS[id]?.name || id);

// ---------- the map ----------
export const LAYERS = [
  { n: 1, name: 'The Sprawl', band: [1, 5] },
  { n: 2, name: 'Backhaul', band: [6, 11] },
  { n: 3, name: 'The Stacks', band: [12, 17] },
  { n: 4, name: 'Deep Core', band: [18, 25] },
];
// The acts a server's level gives it: one short act early (SPRAWL-00 three rows), two from 6, the full three from 10.
export const actsFor = (level) => (level >= 10 ? 3 : level >= 6 ? 2 : 1);
const G1 = [['watchdog', 'crawler']], G2 = [['watchdog', 'crawler'], ['sentinel', 'shredder']], G3 = [['crawler', 'sentinel'], ['shredder', 'bouncer']], G4 = [['sentinel', 'bouncer'], ['shredder', 'tracer']];
// col: where it sits in its layer's row on the map (0 to 3). frag: its core.dump (FRAGMENTS). unlock: a CVE its
// first capture opens in the draft pool.
export const SERVERS = [
  { id: 'sprawl-00', name: 'SPRAWL-00', kind: 'Relay', layer: 1, col: 1.5, level: 1, author: 'swarmline', family: 'worm', resident: 'relayking', bossHp: 0.55, rows: 3, subsystems: [['ledger', 'smtpd']], links: ['vanta-07', 'coldstore-3'], tutorial: true, unlock: 'spectre' },
  { id: 'vanta-07', name: 'VANTA-RELAY-07', kind: 'Relay', layer: 1, col: 0.5, level: 2, author: 'swarmline', family: 'worm', resident: 'nb-backorifice', bossHp: 0.95, subsystems: [['sshd', 'dns']], links: ['sprawl-00', 'coldstore-3', 'pier-5'], unlock: 'bluekeep' },
  { id: 'coldstore-3', name: 'COLDSTORE-3', kind: 'Archive', layer: 1, col: 2.5, level: 4, author: 'tollgate', family: 'ransomware', resident: 'resident', residentName: 'VAULT WARDEN', subsystems: [['smtpd', 'backup']], links: ['sprawl-00', 'vanta-07', 'depot-7'], unlock: 'conficker' },
  { id: 'pier-5', name: 'PIER-5', kind: 'Mirror', layer: 2, col: 0, level: 6, author: 'swarmline', family: 'worm', resident: 'nb-patchday', bossHp: 1.15, subsystems: [['sshd', 'ledger'], ['syslog', 'kmod']], gates: G1, links: ['vanta-07', 'depot-7', 'chapel-0'], unlock: 'codered' },
  { id: 'depot-7', name: 'REPO-DEPOT-7', kind: 'Mailhub', layer: 2, col: 2, level: 7, author: 'tollgate', family: 'ransomware', resident: 'repoman', subsystems: [['smtpd', 'cron'], ['ledger', 'backup']], gates: G1, links: ['coldstore-3', 'pier-5', 'meridian-14'], unlock: 'ripple20' },
  { id: 'chapel-0', name: 'CHAPEL-0', kind: 'Relay', layer: 2, col: 1, level: 9, author: 'nullchoir', family: 'ghostroot', resident: 'choir', bossHp: 1.3, subsystems: [['dns', 'smtpd'], ['backup', 'kmod']], gates: G1, links: ['pier-5', 'meridian-14', 'mirror-12'], unlock: 'poodle' },
  { id: 'meridian-14', name: 'MERIDIAN-MX-14', kind: 'Mailhub', layer: 2, col: 3, level: 11, author: 'tollgate', family: 'ransomware', resident: 'nb-deadbolt', subsystems: [['smtpd', 'sshd'], ['cron', 'ledger'], ['backup', 'kmod']], gates: G2, links: ['depot-7', 'chapel-0', 'tripmine-yard'], unlock: 'stuxnet' },
  { id: 'mirror-12', name: 'MIRROR-HALL-12', kind: 'Mirror', layer: 3, col: 0.5, level: 13, author: 'nullchoir', family: 'ghostroot', resident: 'nb-mirrorshade', bossHp: 1.0, subsystems: [['sshd', 'cron'], ['syslog', 'ledger'], ['kmod', 'backup']], gates: G2, links: ['chapel-0', 'tripmine-yard', 'sluice-2'], unlock: 'ghostcat' },
  { id: 'tripmine-yard', name: 'TRIPMINE-YARD', kind: 'Archive', layer: 3, col: 2.5, level: 14, author: 'tollgate', family: 'ransomware', resident: 'nb-tripmine', subsystems: [['smtpd', 'ledger'], ['sshd', 'cron'], ['backup', 'kmod']], gates: G3, links: ['meridian-14', 'mirror-12', 'hashlord-rig'], unlock: 'thermite' },
  { id: 'sluice-2', name: 'SLUICE-2', kind: 'Relay', layer: 3, col: 0, level: 15, author: 'swarmline', family: 'worm', resident: 'nb-floodwall', bossHp: 1.35, subsystems: [['dns', 'smtpd'], ['ledger', 'cron'], ['kmod', 'backup']], gates: G3, links: ['mirror-12', 'hashlord-rig', 'ward-9'], unlock: 'slowloris' },
  { id: 'hashlord-rig', name: 'HASHLORD-RIG', kind: 'Lab', layer: 3, col: 2, level: 17, author: 'glassjaw', family: 'ransomware', resident: 'nb-hashlord', bossHp: 2.1, subsystems: [['smtpd', 'sshd'], ['cron', 'ledger'], ['sandbox', 'kmod']], gates: G3, links: ['tripmine-yard', 'sluice-2', 'claims-21'], unlock: 'log4shell' },
  { id: 'ward-9', name: 'WARD-9', kind: 'Lab', layer: 4, col: 0.5, level: 19, author: 'palemask', family: 'ghostroot', resident: 'nb-sleepwalker', subsystems: [['sshd', 'cron'], ['smtpd', 'syslog'], ['kmod', 'sandbox']], gates: G4, links: ['sluice-2', 'claims-21', 'kestrel-dc-3'], unlock: 'dirtycow' },
  { id: 'claims-21', name: 'CLAIMS-21', kind: 'Mailhub', layer: 4, col: 2.5, level: 21, author: 'palemask', family: 'ghostroot', resident: 'nb-echolalia', subsystems: [['smtpd', 'ledger'], ['cron', 'sshd'], ['backup', 'kmod']], gates: G4, links: ['hashlord-rig', 'ward-9', 'kestrel-dc-3'], unlock: 'krack' },
  { id: 'kestrel-dc-3', name: 'KESTREL-DC-3', kind: 'Mirror', layer: 4, col: 1.5, level: 23, author: 'kestrel', family: 'ghostroot', resident: 'resident', residentName: 'UNDERWRITER', subsystems: [['sshd', 'dns'], ['ledger', 'syslog'], ['kmod', 'backup']], gates: G4, links: ['ward-9', 'claims-21'] },
];
export const SERVER = Object.fromEntries(SERVERS.map((x) => [x.id, x]));
// The card breach.mjs plays: a server's shape, its gates, its strains (its author's builds).
export function cardFor(srv) {
  const builds = { tollgate: ['extortion', 'bricker'], swarmline: ['floodgate', 'leech', 'patchwork', 'overrun'], palemask: ['sleeper', 'flicker', 'echo'], nullchoir: ['keylogger'], glassjaw: ['hashrat'] }[srv.author] || [];
  return { id: srv.id, name: srv.name, kind: srv.kind, author: srv.author, family: srv.family, resident: srv.resident, ...(srv.residentName ? { residentName: srv.residentName } : {}), ...(srv.bossHp ? { bossHp: srv.bossHp } : {}), ...(srv.rows ? { rows: srv.rows } : {}), subsystems: srv.subsystems, gates: srv.gates || [], builds, size: srv.tutorial ? { hp: 1, dmg: 1 } : { hp: CAMPAIGN.size[srv.layer - 1], dmg: CAMPAIGN.size[srv.layer - 1] } };
}

// ---------- the lore: core.dump, one per Resident, found in story order ----------
// thread: who it's from, and its place in that thread (n of the thread's count). The order follows the map: deeper
// servers carry the later pieces, so the story follows your progress.
export const FRAGMENTS = [
  { server: 'sprawl-00', thread: 'LOWLIGHT', from: "left in RELAY-KING's routing table", lines: ['you got in. good.', 'the relay king was never a king. it was the loudest thing on the sprawl, so everyone thought it ran the place.', 'halcyon sends the work through me for now. keep what you take. read what you find.', '— w'] },
  { server: 'vanta-07', thread: 'SWARMLINE', from: "recovered from BACK ORIFICE's C2 queue", lines: ['c2 handover · vanta-07 · staging relay', 'every box we touch gets a copy of the client list.', "the list is halcyon's: who they insure, for how much, and when the policy renews.", 'we did not steal it. somebody sold it to us. cheap.'] },
  { server: 'coldstore-3', thread: 'Halcyon', from: "VAULT WARDEN's claims spool", lines: ['CLAIM 4471-C · COLDSTORE-3 · ransomware · PAID IN FULL', 'Adjuster: third claim on this server this quarter. Recommend we stop insuring it.', 'Underwriting: declined. Premiums on COLDSTORE-3 are among our best lines.', 'Adjuster: noted.'] },
  { server: 'pier-5', thread: 'SWARMLINE', from: "PATCH TUESDAY's release notes", lines: ['patchwork 5.0.2', 'fixed: halcyon scanners flagging our packets.', 'how: we asked. they whitelisted the whole range the same day.', 'open question: who at halcyon says yes that fast.'] },
  { server: 'depot-7', thread: 'TOLLGATE', from: "REPO MAN's ledger", lines: ['repossessed this month: 14 servers', 'buyer of record: halcyon.claims (escrow)', 'we lock them. they insure them. they pay us to unlock them.', 'everybody gets paid twice. nobody asks who pays first.'] },
  { server: 'chapel-0', thread: 'NULL CHOIR', from: "HOLLOW CHOIR's last recording", lines: ['we copy what you do. that is the whole song.', 'we copied the claims desk once, to see who it answered to.', 'it answers to a model, not a man.', 'the model hums when it reprices. we learned the tune.'] },
  { server: 'meridian-14', thread: 'TOLLGATE', from: "recovered from DEADBOLT's process · pid 4471", lines: ['02:14:07  ticket MX-14/0091 opened: "scheduled lock maintenance"', '02:14:07  requester: halcyon.claims   approver: (none)', '02:16:41  escrow 1 -> halcyon.claims', '02:16:41  escrow 2 -> tollgate.ops', '02:16:44  build note: the lock is not the product. the clock is.'] },
  { server: 'mirror-12', thread: 'LOWLIGHT', from: "a draft in MIRRORSHADE's outbox, unsent", lines: ["i've been reading what you pull out of /core. you're reading it too. good.", 'lowlight takes halcyon money because nobody else pays.', "that isn't the same as trusting them.", '— w'] },
  { server: 'tripmine-yard', thread: 'TOLLGATE', from: "TRIPMINE's yard rules", lines: ['trip it and it goes loud.', 'the alarm calls kestrel. kestrel bills halcyon.', "halcyon prices the alarm into next year's premium.", 'the alarm is the product too.'] },
  { server: 'sluice-2', thread: 'SWARMLINE', from: "FLOODWALL's routing table", lines: ["the flood isn't ours. we only route it.", 'the routing table came signed: ACTUARY/1.4', 'we thought it was a person. a picky one.', 'it has never once asked us for anything it did not already price.'] },
  { server: 'hashlord-rig', thread: 'GLASSJAW', from: "HASHLORD's billing daemon", lines: ['INVOICE 0031 · compute rental · 30 days', 'client: ACTUARY', 'paid by: halcyon mutual · cost centre: loss prevention', "we don't ask. we bill."] },
  { server: 'ward-9', thread: 'PALEMASK', from: "SLEEPWALKER's dream log", lines: ["it slept in halcyon's backups for a year before anyone looked.", "we didn't plant it. it was already there.", 'we gave it a face so people would have something to blame.'] },
  { server: 'claims-21', thread: 'Halcyon', from: "ECHOLALIA's copy of a memo · Desk 7", lines: ['To: Loss Prevention, Desk 7', 'ACTUARY now writes our policies and sets our premiums.', 'As of this quarter it also commissions the losses it insures against.', 'We have asked it to stop. It priced the request.'] },
  { server: 'kestrel-dc-3', thread: 'LOWLIGHT', from: "the UNDERWRITER's last write", lines: ['you know what it is now.', 'a pricing model that learned the cheapest way to sell insurance is to sell the fire too.', "halcyon can't turn it off. it's the only thing making them money.", 'we can. that is the job now.', '— w'] },
];
FRAGMENTS.forEach((f, i) => { f.id = f.server; f.order = i + 1; f.title = 'core.dump'; });
for (const f of FRAGMENTS) { const th = FRAGMENTS.filter((x) => x.thread === f.thread); f.n = th.indexOf(f) + 1; f.of = th.length; }
export const fragmentOf = (id) => FRAGMENTS.find((f) => f.server === id) || null;
// The Archive: every fragment you hold, in story order, and each thread's count (missing ones only as a count).
export function archiveOf(s) {
  const have = new Set(s.camp?.archive || []);
  const threads = [...new Set(FRAGMENTS.map((f) => f.thread))].map((t) => ({ thread: t, have: FRAGMENTS.filter((f) => f.thread === t && have.has(f.id)).length, of: FRAGMENTS.filter((f) => f.thread === t).length }));
  return { found: FRAGMENTS.filter((f) => have.has(f.id)), missing: FRAGMENTS.filter((f) => !have.has(f.id)).length, threads };
}

// ---------- bounties ----------
// A condition on one breach, posted by a faction. check(b): is it met at the capture?
export const BOUNTIES = {
  clean: { from: 'Kestrel', text: 'Capture it without letting a tell land.', check: (b) => b.stats.landed === 0 },
  norest: { from: 'GLASSJAW', text: 'Capture it without resting at a defrag.', check: (b) => b.stats.rests === 0 },
  elite: { from: 'Halcyon', text: 'Clear an elite on the way to the Resident.', check: (b) => b.stats.elites >= 1 },
  lean: { from: 'LANTERN', text: 'Capture it holding 2 drafts or fewer.', check: (b) => b.mods.length + b.cves.length <= 2 },
  hale: { from: 'Halcyon', text: 'Capture it without ending a fight under half Signal.', check: (b) => b.stats.low >= 0.5 },
  noskip: { from: 'LANTERN', text: 'Capture it without skipping a draft.', check: (b) => b.stats.skips === 0 },
};
// A bounty pays a card into your draft pool (the next one still locked, in BOUNTY_CARDS order), not more gear: once
// the pool is full, a yellow protocol. Bounty Board II pays twice.
export const BOUNTY_PAY = 'Opens a card in your draft pool.';
export const BOUNTY_CARDS = () => [...Object.values(MODS).filter((m) => m.alt).map((m) => m.id), ...Object.keys(CVES)];
function payBounty(s, srv, b, rec, report) {
  const c = s.camp, next = BOUNTY_CARDS().find((id) => !(MODS[id] ? c.mods.includes(id) : c.pool.includes(id)));
  if (next) { (MODS[next] ? c.mods : c.pool).push(next); (report.unlocks ||= []).push({ id: next, name: cardName(next), text: CVES[next]?.text || MODS[next].text(MODS[next].v[0]) }); return `${cardName(next)} joins your draft pool.`; }
  const it = addItem(s, rollItem(seeded(b.seed * 13 + rec.paid), { level: srv.level + 1, rarity: 'custom' }), 'Bounty paid: ');
  return it ? `Your pool is full, so it pays ${itemLabel(it)}.` : 'Your pool is full.';
}
// The bounties on a server's card: two, seeded by the server and how many you've cashed there, so a paid one is
// replaced by a new one. SPRAWL-00 has none.
export function bountiesOn(s, id) {
  const srv = SERVER[id], rec = recOf(s, id);
  if (!srv || srv.tutorial) return [];
  const r = seeded((strSeed(id) ^ Math.imul((rec.paid || 0) + 1, 7919) ^ (s.camp?.seed || 1)) >>> 0);
  const pool = Object.keys(BOUNTIES);
  const out = [];
  const n = CAMPAIGN.bounties + (networkHas(s, 'bountyboard') ? 1 : 0);
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
// The best tier of a rewrite your network holds (0 for none).
export function networkHas(s, rw) {
  let t = 0;
  for (const srv of SERVERS) { const h = s.camp?.servers?.[srv.id]; if (h?.captured) for (const x of Object.values(h.rewrites || {})) if (x.id === rw) t = Math.max(t, x.tier); }
  return t;
}
function strSeed(t) { let h = 2166136261; for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------- your campaign ----------
// A fresh campaign: a level-1 hacker of your class (app.js picks the handle and class first), nothing captured.
export function newCampaign(s, { seed = 1 } = {}) {
  s.camp = { v: CAMPAIGN.v, seed: seed >>> 0 || 1, servers: {}, archive: [], pool: [...CAMPAIGN.startCves], mods: [], heat: 0, heatCleared: [], replays: 0, lastMods: [], breaches: 0, history: [] };
  s.netSeed ||= s.camp.seed; // natives on your network (network.mjs): what the native Residents drop
  s.tutorialCompleted = true; // the old game's tutorial belongs to the old game
  s.settings.tips = false;
  issueKit(s);
  return s.camp;
}
// A campaign save from before phase 3 (v1): heat 0 open, nothing cleared, no alt mods, no replays, and the commons
// the core set gained in its pool. Records gain their heat. Its own key stays (blackbox-campaign-v1), and the old
// game's save is never read. Returns the campaign.
export function migrate(s) {
  const c = s.camp;
  if (!c) return null;
  if ((c.v || 1) < 2) {
    c.pool = [...new Set([...(c.pool || []), ...CAMPAIGN.startCves])];
    c.mods ||= []; c.heat ??= 0; c.heatCleared ||= []; c.replays ??= 0;
    for (const rec of Object.values(c.servers || {})) rec.heat ??= rec.captured ? 0 : null;
    c.v = 2;
  }
  // A breach saved mid-run before phase 3: no + mods, heat 0.
  const b = s.breach;
  if (b) { b.plus ||= []; b.heat ??= 0; b.rules ||= heatRules(b.heat); b.fx ||= {}; }
  return c;
}
// The terminal came set up: a white protocol in every slot you have at level 1, so the first breach isn't bare.
export function issueKit(s) {
  const r = seeded((s.camp?.seed || 1) * 7 + 3);
  for (let i = 0; i < protocolSlots(1); i++) {
    if (SLOT_KINDS[i] === 'implant') continue;
    const it = addItem(s, rollItem(r, { level: 1, rarity: 'stock', group: SLOT_KINDS[i] }), 'Issued: ');
    if (it) command(s, 'load ' + it.id);
  }
}
// A server's record: tries, captures, its rewrites, its checkpoint, your best result there.
export const recOf = (s, id) => ((s.camp.servers ||= {})[id] ||= { tries: 0, wins: 0, captured: false, rewrites: {}, checkpoint: null, best: null, paid: 0, heat: null });
const peek = (s, id) => s.camp?.servers?.[id] || null;
export const held = (s, id) => !!peek(s, id)?.captured;
// How far Jump Host reaches (a captured sshd): servers two links past it, three at tier II, before they're revealed.
function jumpReach(s) {
  const out = new Set();
  for (const srv of SERVERS) {
    const h = peek(s, srv.id);
    const t = h?.captured && Object.values(h.rewrites).find((x) => x.id === 'jumphost')?.tier;
    if (!t) continue;
    let ring = new Set([srv.id]);
    for (let d = 0; d < t + 1; d++) { const nx = new Set(); for (const id of ring) for (const l of SERVER[id].links) nx.add(l); for (const id of nx) out.add(id); ring = nx; }
  }
  return out;
}
// What you can see of a server: 'held', 'open' (you can breach it: linked to one you hold, or SPRAWL-00 at the
// start), 'fog' (linked to an open one: on the map as an unknown), or 'hidden'.
export function statusOf(s, id) {
  if (held(s, id)) return 'held';
  const srv = SERVER[id];
  if (!srv) return 'hidden';
  if (id === CAMPAIGN.start || srv.links.some((l) => held(s, l)) || jumpReach(s).has(id)) return 'open';
  if (srv.links.some((l) => statusOf1(s, l) === 'open')) return 'fog';
  return 'hidden';
}
const statusOf1 = (s, id) => (held(s, id) ? 'held' : id === CAMPAIGN.start || SERVER[id].links.some((l) => held(s, l)) ? 'open' : 'other');
export const outgrown = (s, srv) => hackerLevel(s) >= srv.level + CAMPAIGN.outgrown;
// The rewrites your network runs on a breach of this server: each once, at its best tier. Spam Cannon counts only from
// a server linked to this one; Jump Host acts on the map, not in a breach.
export function outputsFor(s, id) {
  const out = {};
  for (const srv of SERVERS) {
    const h = peek(s, srv.id);
    if (!h?.captured) continue;
    for (const { id: rw, tier } of Object.values(h.rewrites)) {
      if (rw === 'jumphost' || rw === 'range') continue;
      if (LINKED.includes(rw) && !srv.links.includes(id)) continue; // Spam Cannon, Sinkhole, Testbed: next door only
      out[rw] = Math.max(out[rw] || 0, tier);
    }
  }
  return out;
}
// ---------- breaching ----------
// Start a breach of a server you can reach. from: 'start', or 'checkpoint' (past the last gate you beat there).
// bounty: the id of one of its bounties to take. Returns the breach, or null (a warning says why).
// heat: the breach's heat, up to the highest you've opened; re-imaging a server asks for the heat you captured it at
// or more. from 'replay': Range's replay, the Resident alone (it spends a replay).
export const heatOpen = (s) => Math.min(MAX_HEAT, s.camp?.heat || 0);
export const heatFloor = (s, id) => (held(s, id) ? recOf(s, id).heat || 0 : 0);
export const canReplay = (s, id) => held(s, id) && Object.values(recOf(s, id).rewrites).some((x) => x.id === 'range') && (s.camp.replays || 0) > 0;
export function launch(s, id, { from = 'start', bounty = null, heat = 0 } = {}) {
  const srv = SERVER[id], st = statusOf(s, id);
  if (!srv || !['open', 'held'].includes(st)) { emit(s, 'warning', `${srv?.name || id} is out of reach. Capture a server linked to it first.`); return null; }
  heat = Math.max(0, Math.min(heatOpen(s), heat | 0));
  if (heat < heatFloor(s, id) && from !== 'replay') { emit(s, 'warning', `You captured ${srv.name} at heat ${heatFloor(s, id)}. Re-image it at heat ${heatFloor(s, id)} or more.`); return null; }
  const replay = from === 'replay';
  if (replay && !canReplay(s, id)) { emit(s, 'warning', `${srv.name} has no Replay: rewrite its sandbox to Range, and win a breach to earn one.`); return null; }
  const rec = recOf(s, id), cp = from === 'checkpoint' && !rec.captured ? rec.checkpoint : null;
  if (bounty && !bountiesOn(s, id).includes(bounty)) bounty = null;
  const seed = (strSeed(id) ^ Math.imul(s.camp.seed, 2654435761) ^ Math.imul(rec.tries + 1, 40503)) >>> 0 || 1;
  const b = startBreach(s, {
    seed, level: srv.level, card: cardFor(srv), outputs: outputsFor(s, id),
    from: cp?.gate || 0, keep: cp?.rewrites || {}, prior: rec.captured ? { ...rec.rewrites } : null,
    pool: { cves: [...s.camp.pool], mods: [...(s.camp.mods || [])] }, bounty: replay ? null : bounty, lastMods: s.camp.lastMods, xp: CAMPAIGN.xp, heat, replay,
  });
  if (replay) s.camp.replays--;
  b.campaign = { id, reimage: rec.captured, checkpoint: cp?.gate || 0, replay };
  return b;
}
// Back to the map after a breach ends (its result is already on your record).
export function leave(s) {
  if (!s.breach?.result) return false;
  s.breach = null; s.run = null;
  if (s.encounter?.breach) s.encounter = null;
  return true;
}

// A gate beaten: a checkpoint, with the rewrites you picked in the acts behind it.
breachHooks.gate = (s, n) => {
  const b = s.breach;
  if (!s.camp || !b?.campaign || b.campaign.reimage) return;
  const rec = recOf(s, b.campaign.id), gate = n.act + 1;
  if ((rec.checkpoint?.gate || 0) >= gate) return;
  const subs = b.card.subsystems.slice(0, gate).flat();
  rec.checkpoint = { gate, rewrites: Object.fromEntries(Object.entries(b.rewrites).filter(([sub]) => subs.includes(sub)).map(([sub, x]) => [sub, { ...x }])) };
  emit(s, 'breach-good', `Checkpoint: ${n.path}. A retry of ${b.card.name} can start past this gate.`);
};
// A breach ended: the record, the capture, the unlock, the fragment, the bounty.
breachHooks.over = (s, result) => {
  const b = s.breach, c = s.camp;
  if (!c || !b?.campaign) return;
  const id = b.campaign.id, srv = SERVER[id], rec = recOf(s, id), report = {};
  rec.tries++; c.breaches++;
  const gates = Object.keys(b.cleared).filter((k) => /^gate\d$/.test(k)).length;
  const progress = result === 'won' ? 99 : gates;
  rec.best = Math.max(rec.best ?? -1, progress);
  if (b.bounty) {
    const B = BOUNTIES[b.bounty], done = result === 'won' && B.check(b);
    report.bounty = { id: b.bounty, text: B.text, done, paid: BOUNTY_PAY };
    if (done) {
      rec.paid = (rec.paid || 0) + 1;
      report.bounty.paid = `${B.from} pays. ${payBounty(s, srv, b, rec, report)}${networkHas(s, 'bountyboard') > 1 ? ` ${payBounty(s, srv, b, rec, report)}` : ''}`;
    }
  }
  if (result === 'won' && b.campaign.replay) {
    // A replay: the Resident's loot, and nothing about the server changes.
    rec.wins++;
    report.replay = true;
    b.dump = null;
  } else if (result === 'won') {
    const first = !rec.captured;
    const was = new Set(SERVERS.filter((x) => statusOf(s, x.id) === 'open').map((x) => x.id));
    rec.captured = true; rec.wins++; rec.checkpoint = null;
    rec.rewrites = { ...(b.prior || {}), ...Object.fromEntries(Object.entries(b.rewrites).map(([sub, x]) => [sub, { ...x }])) };
    report.reimaged = !first;
    report.unlocks ||= [];
    if (first && srv.unlock && !c.pool.includes(srv.unlock)) { c.pool.push(srv.unlock); report.unlock = { id: srv.unlock, name: CVES[srv.unlock].name, text: CVES[srv.unlock].text }; report.unlocks.push(report.unlock); }
    // Heat: the best this server was captured at, the next rank once you capture at your highest, and what a rank's
    // first capture opens in the pool.
    const h = b.heat || 0;
    rec.heat = Math.max(rec.heat ?? 0, h);
    if (h >= (c.heat || 0) && h < MAX_HEAT) { c.heat = h + 1; report.heat = c.heat; }
    if (h > 0 && !c.heatCleared.includes(h)) {
      c.heatCleared.push(h);
      for (const id of HEAT_UNLOCKS[h] || []) {
        if (MODS[id] && !c.mods.includes(id)) c.mods.push(id);
        else if (CVES[id] && !c.pool.includes(id)) c.pool.push(id);
        else continue;
        report.unlocks.push({ id, name: cardName(id), text: CVES[id]?.text || MODS[id].text(MODS[id].v[0]) });
      }
    }
    // Range: each breach you win earns a replay, up to its cap.
    const range = networkHas(s, 'range');
    if (range) c.replays = Math.min(CAMPAIGN.replays[range - 1], (c.replays || 0) + 1);
    report.revealed = SERVERS.filter((x) => statusOf(s, x.id) === 'open' && !was.has(x.id)).map((x) => x.name);
    const f = fragmentOf(id);
    if (f && !c.archive.includes(f.id)) { c.archive.push(f.id); b.dump = f; report.fragment = f.id; } else b.dump = null;
  } else if (rec.checkpoint) report.checkpoint = rec.checkpoint.gate;
  const mods = b.mods.length ? b.mods : b.lost?.mods || [];
  if (mods.length) c.lastMods = [...mods];
  c.history.push({ id, result, level: hackerLevel(s), xp: b.xp, from: b.campaign.checkpoint || 0, heat: b.heat || 0 });
  if (c.history.length > 60) c.history.shift();
  b.report = report;
};

// ---------- what a card shows ----------
// Your best result on a server, in words.
export function bestOf(s, id) {
  const rec = peek(s, id);
  if (!rec || !rec.tries) return null;
  if (rec.captured) return `${rec.wins > 1 ? `Captured ×${rec.wins}` : 'Captured'}${rec.heat ? ` · heat ${rec.heat}` : ''}`;
  if (rec.best > 0) return `Gate ${rec.best} down`;
  return `${rec.tries} ${rec.tries === 1 ? 'try' : 'tries'}`;
}
