// Phase 2 of the pre-multiplayer review: a world with a direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, active, addLocation, hackerOf } from './dist/combat.mjs';
import { CONFIG, SERVER, THREAT_STEPS } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { offer, contractKill, openContracts, title as contractTitle } from './dist/mail.mjs';
import { rogueSpawns } from './dist/rogue.mjs';
import { graphOf, locAt, slotNode } from './dist/floors.mjs';

const at = (L) => { const s = fresh(); hackerOf(s).level = L; return s; };
const win = (s) => { command(s, 'engage'); for (let n = 0; n < 200 && active(s); n++) { s.server.integrity = s.server.max; if (s.run) s.run.integrity = s.run.max; command(s, planner(s) || 'hold'); resolveCycle(s); } };
const leadFrom = (L, mob) => {
  const s = at(L);
  s.run = { loc: 'sprawl', cwd: '/', integrity: 999, max: 999, pack: [], visited: ['/'] };
  selectEncounter(s, 'random', 5, { mode: 'run', room: '/tmp', level: mob, zone: true });
  win(s);
  return s.reports.at(-1).lead;
};

test('grey kills trace nothing: lead falls with the level gap like XP', () => {
  assert.equal(leadFrom(12, 12), CONFIG.leadBase);
  assert.equal(leadFrom(12, 7), Math.round(CONFIG.leadBase * 0.5));
  assert.equal(leadFrom(15, 3), 0);
});

test('a server found on your floor sits at its slot\'s level, inside the floor\'s band', () => {
  const s = at(12);
  for (let i = 0; i < 4; i++) addLocation(s, 'worm', SERVER.floorFor(12));
  assert.ok(s.locations.every((l) => l.depth === 2 && l.level >= 7 && l.level <= 14 && l.level === slotNode(s, l.slot).level));
});

test('kill contracts count kills within 4 levels of where they were posted, and pay XP at that level', () => {
  const s = at(12);
  s.mail = { offers: [], jobs: [], next: 1, boardOpen: true };
  let o; for (let i = 0; i < 50 && (!o || o.type !== 'kill'); i++) { s.mail.offers = []; o = offer(s, 0); }
  assert.equal(o.type, 'kill'); assert.equal(o.level, 12);
  s.mail.offers = []; s.mail.jobs.push(o); // taken
  const c = openContracts(s).find((x) => x.id === o.id);
  contractKill(s, { family: c.family, zone: false, level: 5 });
  assert.equal(c.got, 0, 'a grey kill does not count');
  contractKill(s, { family: c.family, zone: false, level: 8 });
  assert.equal(c.got, 1);
  assert.match(contractTitle(s, c), /Lv 8\+/);
});

test('SPRAWL-00 eases you in: the first armor step lands at level 5, and its viruses follow you to level 5', () => {
  assert.equal(THREAT_STEPS.armor[0].threat, SERVER.threat(5));
  assert.equal(CONFIG.zone.maxLevel, 5);
});

test('the first rogue server is a Nest of the family that traced it, and it keeps up with you inside its floor\'s band', () => {
  const s = at(4);
  const g = graphOf(s, 1), side = g.order.filter((id) => g.nodes[id].d > 1 && !g.nodes[id].main && g.nodes[id].level <= 7);
  addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const nest = addLocation(s, 'ghostroot', 1, null, side.find((id) => !locAt(s, id))); // off the main road: a floor's road is never rogue
  assert.equal(nest.rogue?.kind, 'nest'); assert.equal(nest.family, 'ghostroot');
  hackerOf(s).level = 7; rogueSpawns(s, nest, 0);
  assert.equal(nest.level, 7);
  hackerOf(s).level = 20; for (const sp of Object.values(nest.spawns)) sp.alive = false, sp.respawnAt = 0;
  rogueSpawns(s, nest, 1);
  assert.equal(nest.level, 8, 'floor 1 tops out at 8');
});

test('claimjack is capped at level 4 and unmutated, wears down to v1 after two losses, and the board opens after an hour regardless', async () => {
  const { tickMail, boardOpen, MAIL } = await import('./dist/mail.mjs');
  const { storyAt } = await import('./dist/mail.mjs');
  const s = at(9);
  storyAt(s, 'claimjack', 0);
  const j = openContracts(s).find((c) => c.name === 'claimjack-0412');
  assert.ok(j, 'posted');
  const sp = s.zone.spawns[j.room];
  assert.ok(sp.level <= 4); assert.ok(sp.calm); assert.equal(sp.grade, 2);
  assert.ok(!boardOpen(s));
  tickMail(s, MAIL.boardAfterMs - 1000); assert.ok(!boardOpen(s));
  tickMail(s, MAIL.boardAfterMs + 1000); assert.ok(boardOpen(s), 'open after an hour on it');
  const { play } = await import('./dist/run.mjs');
  for (let k = 0; k < 2; k++) {
    s.run = { loc: 'sprawl', cwd: j.room, integrity: 1, max: 100, pack: [], visited: ['/'] };
    play(s, 'attack');
    assert.equal(s.encounter.virus.mutation, null);
    for (let n = 0; n < 60 && active(s); n++) { command(s, 'hold'); resolveCycle(s); }
  }
  assert.ok(s.zone.spawns[j.room].alive && !s.zone.spawns[j.room].grade, 'still there, back to v1');
});

test('a v2 invader is blocked at its level +2, a v3 at +4', async () => {
  const { strength } = await import('./dist/invasion.mjs');
  assert.equal(strength(10, null, 2), strength(12));
  assert.equal(strength(10, null, 3), strength(14));
});

test('a floor\'s finds stay on it: the floor bounds them, and a full floor spills to the next', async () => {
  const { FIND_CAP } = await import('./dist/combat.mjs');
  const s = at(5);
  for (let i = 0; i < FIND_CAP + 4; i++) addLocation(s, 'worm', 1);
  assert.equal(s.locations.length, FIND_CAP + 4, 'nothing drops off the map');
  assert.ok(s.locations.every((l) => l.slot));
  assert.equal(s.locations.filter((l) => l.depth === 1).length, 10, 'floor 1 holds ten');
  assert.equal(new Set(s.locations.map((l) => l.slot)).size, s.locations.length, 'one a slot');
});

// Since R1 (docs/servers.md 2.8) respawns are what rotations were: Root counts the respawned fight rooms you clear on a
// server you hold (5 for Root 2, 15, 30, 50), and a server on rooms never rotates.
test('root access: respawned fight rooms cleared on a server you hold raise Root, which pays off', async () => {
  const R = await import('./dist/root.mjs');
  const FP = await import('./dist/floorplan.mjs');
  const { play } = await import('./dist/run.mjs');
  const { liveCount } = await import('./dist/memory.mjs');
  const { rootClear } = await import('./dist/netrooms.mjs');
  const { tickServices } = await import('./dist/combat.mjs');
  const s = at(8);
  const loc = addLocation(s, 'worm', 1); loc.detached = false; delete loc.fresh; loc.takenOver = true;
  assert.equal(R.rootOf(loc), 1);
  assert.deepEqual(R.ROOT.need.slice(2), [5, 15, 30, 50]);
  play(s, 'connect ' + loc.id);
  tickServices(s, R.ROOT.firstMs + 1);
  assert.equal(R.procOf(loc), null, 'no log rotation on rooms: its rooms respawn instead');
  const Rm = s.rooms, g = Rm.graph, room = Object.values(g.rooms).find((x) => x.kind === 'process');
  const clearIt = () => { delete Rm.down[room.id]; Rm.at = FP.neighbours(g, room.id)[0]; Rm.screen = null; FP.go(s, room.id); FP.act(s, 'engage'); win(s); FP.settle(s); s.run.integrity = s.run.max; };
  clearIt();
  assert.equal(loc.root?.cleared || 0, 0, 'a first clear is progress, not Root');
  for (let k = 0; k < 5; k++) clearIt();
  assert.equal(R.rootOf(loc), 2, 'five respawned rooms cleared: Root 2');
  const stash = Object.values(g.rooms).find((x) => x.kind === 'stash');
  assert.ok(stash && FP.neighbours(g, g.core).includes(stash.id), 'a stash room opens by the Core');
  Rm.at = stash.id; Rm.screen = null;
  const before = s.run.pack.length;
  FP.act(s, 'pull');
  assert.equal(s.run.pack.length, before + 1, 'its code into your pack');
  assert.equal(FP.cacheFull(s, stash), false, 'and it fills again later');
  // Root 3: off your memory, no invasions; Root 4: one more socket room, by the Core and open; Root 5: rare spawns twice as often.
  const held = liveCount(s); // (its kills' leads may have found more servers by now)
  loc.root.level = 3; assert.equal(liveCount(s), held - 1);
  const sockets = () => Object.values(g.rooms).filter((x) => x.kind === 'socket');
  const n = sockets().length;
  loc.root.cleared = R.ROOT.need[4] - 1;
  rootClear(s, loc);
  assert.equal(R.rootOf(loc), 4);
  const extra = sockets().find((x) => x.extra === 'root');
  assert.equal(sockets().length, n + 1, 'Root 4: a socket room');
  assert.ok(extra && FP.neighbours(g, g.core).includes(extra.id) && Rm.cleared[extra.id], 'beside the Core, open from the start');
  rootClear(s, loc);
  assert.equal(sockets().length, n + 1, 'only the one');
  loc.root.level = 5; assert.equal(FP.WORLD.rare(s), 2);
});

test('Fresh: the first XP of a kind other than fighting that you haven\'t earned in 20 minutes of play pays half again (up to a kill scaled like deeds); nothing fades', async () => {
  const { gainXp, FRESH, freshCap } = await import('./dist/combat.mjs');
  const { killXp, deedScale, climbStretch, DEED } = await import('./dist/data.mjs');
  const s = at(10); s.pace = { kills: 0, ms: 0 };
  const k = killXp(10), xp = () => hackerOf(s).xp;
  let x = xp(); gainXp(s, k, 'a kill', 'fight'); assert.equal(xp() - x, k, 'fighting is the default: no bonus');
  x = xp(); gainXp(s, k, 'a sweep', 'intel'); assert.equal(xp() - x, k + Math.round(k * FRESH.bonus), 'stepping away from it: fresh');
  x = xp(); gainXp(s, k, 'another sweep', 'intel'); assert.equal(xp() - x, k, 'again: plain, never less');
  x = xp(); gainXp(s, Math.round(k / 4), 'a trickle', 'build'); assert.equal(xp() - x, Math.round(k / 4), 'under half a kill: never fresh');
  s.pace.ms += FRESH.gapMs;
  x = xp(); gainXp(s, 4 * k, 'a vault', 'intel'); assert.equal(xp() - x, 6 * k, '20 minutes on: fresh again, half again (a deed is under its cap)');
  // The cap: a kill's worth times deedScale (DEED.share x the level's stretch), the scale deeds pay on.
  assert.equal(freshCap(10), k * deedScale(10));
  assert.ok(Math.abs(deedScale(10) - DEED.share * climbStretch(10)) < 1e-9 && deedScale(10) > 4, `about 5 kills at level 10 (${deedScale(10).toFixed(2)})`);
  s.pace.ms += FRESH.gapMs;
  x = xp(); gainXp(s, 30 * k, 'a big haul', 'intel'); assert.equal(xp() - x, 30 * k + Math.round(freshCap(10)), 'a gain past twice the cap: the cap');
  x = xp(); gainXp(s, k, 'contract', null, 'breakin'); assert.equal(xp() - x, k, 'contracts: no bonus');
  assert.ok(s.xpMix.intel > s.xpMix.fight && s.xpMix.breakin === k, 'the mix tallies what it counted as');
});

test('firsts pay once: a recipe crafted, a service installed, a trade at a hub', async () => {
  const { firstTime, FRESH } = await import('./dist/combat.mjs');
  const b = FRESH.bonus; FRESH.bonus = 0;
  const s = at(6), xp = () => hackerOf(s).xp;
  let x = xp(); firstTime(s, 'filter-frag', 'first filter'); assert.ok(xp() > x);
  x = xp(); firstTime(s, 'filter-frag', 'first filter'); assert.equal(xp(), x, 'never twice');
  FRESH.bonus = b;
});

test('kill contracts pay at the level of the kills that filled them, and count as fights; bounties stay in SPRAWL\'s range', async () => {
  const s = at(12);
  s.mail = { offers: [], jobs: [], next: 1, boardOpen: true };
  for (let i = 0; i < 80; i++) { s.mail.offers = []; const o = offer(s, 0); assert.notEqual(o.type, 'bounty', 'no named processes past SPRAWL\'s levels'); }
  let o; for (let i = 0; i < 50 && (!o || o.type !== 'kill'); i++) { s.mail.offers = []; o = offer(s, 0); }
  s.mail.offers = []; s.mail.jobs.push(o);
  for (let i = 0; i < o.count; i++) contractKill(s, { family: o.family, zone: false, level: 9 });
  assert.equal(Math.round(o.lvSum / o.lvN), 9);
});

test('breadcrumb: a server traced by level 4, and wick points you at a vault at 5', async () => {
  const { gainXp, xpToNext } = await import('./dist/combat.mjs').then(async (m) => ({ ...m, xpToNext: (await import('./dist/data.mjs')).xpToNext }));
  const s = at(3); s.locations = [];
  gainXp(s, xpToNext(3), 'test');
  assert.equal(hackerOf(s).level, 4);
  assert.ok(s.locations.some((l) => !l.rogue), 'traced one');
  gainXp(s, xpToNext(4), 'test');
  assert.ok(s.logs.some((e) => e.type === 'breadcrumb'), 'wick pages you');
});

test('Phase 3: every v2 virus is Linked; Rerouting is no longer rolled; no strain goes inert', async () => {
  const { ROLLED_MUTATIONS, STRAINS } = await import('./dist/data.mjs');
  const { part } = await import('./dist/combat.mjs');
  assert.ok(!ROLLED_MUTATIONS.includes('rerouting'));
  const s = at(10);
  selectEncounter(s, 'cryptjack', 3, { level: 10, grade: 2, mutation: null }); command(s, 'engage');
  const pulse = part(s, 'pulse'), enc = part(s, 'encryptor'); pulse.integrity = 1; pulse.armor = 0;
  command(s, 'spike pulse'); resolveCycle(s);
  assert.ok(enc.attack.hit > 0, 'the Encryptor took on part of the Pulse');
  for (const id of ['echo', 'hashrat', 'keylogger']) assert.ok(STRAINS[id].parts.every((p) => p.attack), `${id}: every part can hurt you`);
});

test('Phase 3: elites are crew rooms (better loot than trash, no sure drop); Hardened halves the first hit; Null Route dodges one attack; uniques sit near a yellow', async () => {
  const { rollDrop } = await import('./dist/combat.mjs');
  const { RARITY_ORDER, ITEM_SCALE } = await import('./dist/gear.mjs');
  const { SKILLS, ABILITIES } = await import('./dist/data.mjs');
  const s = at(12);
  const count = (elite) => { let items = 0, blues = 0; for (let i = 0; i < 3000; i++) { const it = rollDrop(s, { kind: 'rogue', elite }, 12); if (it) { items++; if (RARITY_ORDER.indexOf(it.rarity) >= RARITY_ORDER.indexOf('tuned')) blues++; } } return { items, blues }; };
  const el = count(true), tr = count(false);
  assert.ok(el.items > 2 * tr.items && el.blues > tr.blues, `elite ${JSON.stringify(el)} vs trash ${JSON.stringify(tr)}`);
  assert.ok(el.items < 3000 * 0.25, 'no guaranteed blue: most elite kills drop nothing');
  assert.equal(SKILLS.hardened, 1);
  assert.equal(ABILITIES['null-route'].cooldown, 6);
  assert.equal(ABILITIES['zero-day'].damage, 65);
  assert.equal(ITEM_SCALE.unique, 0.5);
});

test('Phase 4: a hot strain every 4 hours (the same for everyone), first decodes pay, rested XP banks while you are safely away', async () => {
  const { tickServices, hotStrain, HOT, DECODE_XP } = await import('./dist/combat.mjs');
  const { tickNetwork } = await import('./dist/invasion.mjs');
  const { killXp, STRAINS } = await import('./dist/data.mjs');
  const a = at(12), b = at(12), T = 1_800_000_000_000;
  tickServices(a, T); tickServices(b, T + 1000);
  assert.ok(STRAINS[hotStrain(a, T)], 'a strain open at your level runs hot');
  assert.equal(hotStrain(a, T), hotStrain(b, T + 1000), 'everyone sees the same one');
  assert.equal(HOT.everyMs, 4 * 3600000);
  assert.equal(DECODE_XP, 1, 'a first decode pays one kill (it was two, and paid half the XP of levels 1–5)');
  const { xpToNext } = await import('./dist/data.mjs');
  const r = at(10); r.firewall = { pin: 60, plus: 0, frag: 0, defragUntil: 0 };
  tickNetwork(r, T); tickNetwork(r, T + 8 * 3600000);
  assert.ok(Math.abs(r.rested / (0.05 * xpToNext(10)) - 1) < 0.01, `a safe night away (8 hours): 5% of the level banked (${r.rested}, ${(r.rested / killXp(10)).toFixed(1)} kills)`);
});

test('Rested is World of Warcraft\'s rule: 5% of a level every 8 hours safely away, of the level you are on, up to 1.5 levels; kills spend it at double', async () => {
  const { tickNetwork } = await import('./dist/invasion.mjs');
  const { xpToNext, RESTED, restedCap, restedGain } = await import('./dist/data.mjs');
  const { gainXp } = await import('./dist/combat.mjs');
  assert.deepEqual(RESTED, { share: 0.05, everyMs: 8 * 3600000, cap: 1.5 });
  const T = 1_800_000_000_000, safe = (s) => { s.firewall = { pin: 60, plus: 0, frag: 0, defragUntil: 0 }; return s; };
  // A day away: three nights' worth, 15% of the level (the day is played out a minute at a time).
  const a = safe(at(20)); tickNetwork(a, T); tickNetwork(a, T + 24 * 3600000);
  assert.ok(Math.abs(a.rested / (0.15 * xpToNext(20)) - 1) < 0.01, `a day: 15% of level 20 (${a.rested})`);
  // Past a day nothing is played out, but it still banks: 4 days is 12 eight-hour blocks, 60% of a level.
  const b = safe(at(20)); tickNetwork(b, T); tickNetwork(b, T + 4 * 24 * 3600000);
  assert.ok(Math.abs(b.rested / (0.6 * xpToNext(20)) - 1) < 0.01, `four days: 60% of level 20 (${b.rested})`);
  // Ten days fill it, and it stops at 1.5 levels.
  const c = safe(at(20)); tickNetwork(c, T); tickNetwork(c, T + 14 * 24 * 3600000);
  assert.equal(c.rested, restedCap(20)); assert.equal(restedCap(20), Math.round(1.5 * xpToNext(20)));
  // (the last few minutes before you came back are online time: tickNetwork's own step)
  // It banks shares of the level you're on when it banks: higher levels bank more.
  assert.ok(restedGain(40, 8 * 3600000) > restedGain(20, 8 * 3600000));
  assert.equal(Math.round(restedGain(30, 8 * 3600000)), Math.round(0.05 * xpToNext(30)));
  // A crash away banks nothing while it lasts.
  const d = safe(at(20)); tickNetwork(d, T); d.degraded = { until: null, ms: 1e12 }; tickNetwork(d, T + 8 * 3600000);
  assert.ok(!(d.rested > 0), `crashed: nothing banked (${d.rested})`);
  // Spent the way it always was: a kill pays double until it runs out (the spend is payKill's; here the bank is kept whole).
  gainXp(c, 1, 'x', 'fight'); assert.equal(c.rested, restedCap(20), 'only kills spend it');
});

test('Phase 4: strain contracts count only their strain, and every fifth in a row pays double', async () => {
  const { SLAYER } = await import('./dist/mail.mjs');
  const s = at(14);
  s.mail = { offers: [], jobs: [], next: 1, boardOpen: true };
  let o; for (let i = 0; i < 200 && (!o || o.type !== 'strain'); i++) { s.mail.offers = []; o = offer(s, 0); }
  assert.equal(o.type, 'strain');
  s.mail.offers = []; s.mail.jobs.push(o);
  contractKill(s, { family: 'worm', zone: true, level: 14, strain: null });
  assert.equal(o.got, 0, 'a plain kill does not count');
  for (let i = 0; i < o.count; i++) contractKill(s, { family: 'worm', zone: true, level: 14, strain: o.strain });
  assert.equal(o.got, o.count);
  s.slayer = { streak: SLAYER.every - 1 };
  const credits = s.server.credits, pay = o.reward.credits;
  command(s, 'mail deliver ' + o.id);
  assert.equal(s.server.credits - credits, 2 * pay, 'the fifth pays double');
});

test('Phase 4: when the board opens, KESTREL and NULL CHOIR each ask you to pick a side; taking one withdraws the other', async () => {
  const { storyAt, offers } = await import('./dist/mail.mjs');
  const { rep } = await import('./dist/factions.mjs');
  const s = at(8);
  storyAt(s, 'ledger', 0); // past the turf job: the board is open
  const sides = offers(s).filter((o) => o.type === 'side');
  assert.equal(sides.length, 2);
  const k = sides.find((o) => o.faction === 'kestrel');
  const before = { k: rep(s, 'kestrel'), n: rep(s, 'nullchoir') };
  command(s, 'mail accept ' + k.id);
  assert.ok(!offers(s).some((o) => o.type === 'side'), 'the other side is gone');
  command(s, 'mail deliver ' + k.id);
  assert.ok(rep(s, 'kestrel') > before.k && rep(s, 'nullchoir') < before.n, 'one up, its rival down');
});

test('the leads list shows at most HIDDEN.shown unknown servers: flagged and most traced first', async () => {
  const { shownHidden, HIDDEN, hiddenNodes } = await import('./dist/hidden.mjs');
  const { fresh } = await import('./dist/combat.mjs');
  const s = fresh();
  hiddenNodes(s).length = 0; // (SPRAWL-00's own ?s aside)
  for (let i = 1; i <= 20; i++) hiddenNodes(s).push({ id: 'h' + i, family: 'worm', via: 'x', depth: 2, level: 1, lead: i === 3 ? 60 : 0, pinged: true, signal: 1 });
  const shown = shownHidden(s);
  assert.equal(shown.length, HIDDEN.shown);
  assert.equal(shown[0].id, 'h3', 'the most traced leads');
  assert.equal(shown[1].id, 'h20', 'then the newest');
});

test('review fixes: elites can drop a unique; rested pays whole XP only', async () => {
  const { rollDrop, fresh: f2, UNIQUES } = await import('./dist/combat.mjs');
  const { LOOT } = await import('./dist/gear.mjs');
  const s = f2();
  // An elite's gold is any world unique up to its level, even where none is written to drop; trash's falls back to a yellow.
  const was = { ...LOOT.odds.elite }, wasT = { ...LOOT.odds.trash };
  Object.assign(LOOT.odds.elite, { zeroday: 1 }); Object.assign(LOOT.odds.trash, { zeroday: 1 });
  try {
    const it = rollDrop(s, { kind: 'home', elite: true }, 12);
    assert.ok(it?.unique && UNIQUES[it.unique].level <= 14 && UNIQUES[it.unique].sources.some((x) => ['sprawl', 'vault', 'guard', 'rogue'].includes(x.kind)), `an elite's world unique: ${it?.unique}`);
    assert.equal(rollDrop(s, { kind: 'home' }, 12).rarity, 'custom', 'trash where no unique drops: a yellow');
  } finally { Object.assign(LOOT.odds.elite, was); Object.assign(LOOT.odds.trash, wasT); }
  const r = f2();
  r.rested = 0.5;
  command(r, 'encounter cryptjack'); command(r, 'engage');
  for (const p of r.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1 });
  for (let n = 0; n < 10 && active(r); n++) { command(r, 'spike ' + r.encounter.virus.parts.find((p) => p.integrity > 0).id); resolveCycle(r); }
  assert.ok(Object.values(r.hackers).every((h) => Number.isInteger(h.xp)), 'no fractional XP');
  assert.equal(r.rested, 0.5, 'the fraction waits');
});

test('trying classes: until a class reaches LOADOUT.trialUntil, switching to a fresh class carries your level', async () => {
  const { fresh: f2, command: cmd, hackerLevel, classOf } = await import('./dist/combat.mjs');
  const { LOADOUT } = await import('./dist/data.mjs');
  const s = f2();
  s.hackers = { breaker: { level: 3, xp: 40 } };
  cmd(s, 'archetype bastion');
  assert.equal(classOf(s), 'bastion');
  assert.equal(hackerLevel(s), 3, 'level came along');
  assert.equal(s.hackers.bastion.xp, 40);
  assert.equal(hackerLevel(s, 'breaker'), 1);
  s.hackers.bastion.level = LOADOUT.trialUntil;
  cmd(s, 'archetype operator');
  assert.equal(hackerLevel(s), 1, 'past the trial, classes level on their own');
  assert.equal(hackerLevel(s, 'bastion'), LOADOUT.trialUntil);
});

test('collection log: a unique counts the first time you get one; the card hides until then', async () => {
  const { fresh: f2, addItem, UNIQUES, restore } = await import('./dist/combat.mjs');
  const { uniqueItem } = await import('./dist/gear.mjs');
  const { collectionMarkup } = await import('./dist/view.mjs');
  const s = f2();
  assert.equal(collectionMarkup(s), '', 'nothing to show yet');
  const u = Object.values(UNIQUES).find((x) => x.sources?.[0]?.kind === 'sprawl');
  addItem(s, uniqueItem(u, 3, () => 0.5));
  assert.ok(s.collection[u.id]);
  assert.ok(s.logs.some((e) => e.type === 'collected'));
  addItem(s, uniqueItem(u, 3, () => 0.5));
  assert.equal(s.logs.filter((e) => e.type === 'collected').length, 1, 'once');
  assert.match(collectionMarkup(s), new RegExp(`Collection · 1/${Object.values(UNIQUES).filter((x) => !x.sources?.some((src) => src.kind === 'native')).length}`)); // native uniques count once they're yours to chase (network.mjs)
  assert.match(collectionMarkup(s), /\?\?\?/, 'the rest are still unknown');
  const old = f2(); old.stash = [{ ...uniqueItem(u, 3, () => 0.5), id: 'g1' }]; delete old.collection;
  assert.ok(restore(JSON.parse(JSON.stringify(old))).collection[u.id], 'what an old save holds counts');
});
