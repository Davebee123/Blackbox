// Phase 2 of the pre-multiplayer review: a world with a direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, active, addLocation, hackerOf } from './dist/combat.mjs';
import { CONFIG, SERVER, THREAT_STEPS } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { offer, contractKill, openContracts, title as contractTitle } from './dist/mail.mjs';
import { rogueSpawns } from './dist/rogue.mjs';

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

test('kills trace your own layer, inside its band', () => {
  const s = at(12);
  for (let i = 0; i < 4; i++) addLocation(s, 'worm', SERVER.layerFor(12));
  assert.ok(s.locations.every((l) => l.depth === 2 && l.level === 12));
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

test('the first rogue server is a Nest of the family that traced it, and it keeps up with you inside its band', () => {
  const s = at(4);
  addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const nest = addLocation(s, 'ghostroot', 1);
  assert.equal(nest.rogue?.kind, 'nest'); assert.equal(nest.family, 'ghostroot');
  hackerOf(s).level = 7; rogueSpawns(s, nest, 0);
  assert.equal(nest.level, 7);
  hackerOf(s).level = 20; for (const sp of Object.values(nest.spawns)) sp.alive = false, sp.respawnAt = 0;
  rogueSpawns(s, nest, 1);
  assert.equal(nest.level, 9, 'layer 1 tops out at 9');
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

test('never-connected finds are capped at ten: the oldest drops off the map', async () => {
  const { FIND_CAP } = await import('./dist/combat.mjs');
  const s = at(5);
  for (let i = 0; i < FIND_CAP + 4; i++) addLocation(s, 'worm', 1);
  assert.equal(s.locations.filter((l) => l.fresh).length, FIND_CAP);
});

test('root access: log rotations bring a process and a cache; clearing them raises Root, which pays off', async () => {
  const R = await import('./dist/root.mjs');
  const { play, layoutOf, fileInfo } = await import('./dist/run.mjs');
  const { liveCount } = await import('./dist/memory.mjs');
  const { outpostPorts } = await import('./dist/outpost.mjs');
  const { effLevel } = await import('./dist/firewall.mjs');
  const { tickServices, hooks } = await import('./dist/combat.mjs');
  const s = at(8);
  const loc = addLocation(s, 'worm', 1); loc.detached = false; delete loc.fresh; loc.takenOver = true;
  assert.equal(R.rootOf(loc), 1);
  const used = liveCount(s);
  tickServices(s, 0); // arms the first rotation
  assert.equal(loc.root.nextAt, R.ROOT.firstMs);
  tickServices(s, R.ROOT.firstMs);
  const p = R.procOf(loc, R.ROOT.firstMs + 1);
  assert.ok(p && p.room !== '/', 'a process moved in');
  assert.ok(layoutOf(loc)['/'].files.includes(R.CACHE_FILE), 'and a rotated cache');
  assert.equal(fileInfo(loc, '/', R.CACHE_FILE).kind, 'credits');
  // Clear it: Root 2, and /root opens.
  hooks.now = () => R.ROOT.firstMs + 1;
  s.run = { loc: loc.id, cwd: p.room, integrity: 999, max: 999, pack: [], visited: ['/'] };
  play(s, 'attack'); assert.equal(s.encounter.process, loc.id);
  win(s);
  assert.equal(R.rootOf(loc), 2);
  assert.ok(layoutOf(loc)['/root'], '/root opens at Root 2');
  // Root 3: off your memory; Root 4: a port; Root 5: firewall +3.
  const fw = effLevel(s, 0, null, loc), ports = outpostPorts(s, loc);
  loc.root.level = 3; assert.equal(liveCount(s), used - 1);
  loc.root.level = 4; assert.equal(outpostPorts(s, loc), ports + 1);
  loc.root.level = 5; assert.equal(effLevel(s, 0, null, loc), fw + 3);
  delete hooks.now;
});

test('Fresh: the first XP of a kind other than fighting that you haven\'t earned in 20 minutes of play pays half again (up to a kill); nothing fades', async () => {
  const { gainXp, FRESH } = await import('./dist/combat.mjs');
  const { killXp } = await import('./dist/data.mjs');
  const s = at(10); s.pace = { kills: 0, ms: 0 };
  const k = killXp(10), xp = () => hackerOf(s).xp;
  let x = xp(); gainXp(s, k, 'a kill', 'fight'); assert.equal(xp() - x, k, 'fighting is the default: no bonus');
  x = xp(); gainXp(s, k, 'a sweep', 'intel'); assert.equal(xp() - x, k + Math.round(k * FRESH.bonus), 'stepping away from it: fresh');
  x = xp(); gainXp(s, k, 'another sweep', 'intel'); assert.equal(xp() - x, k, 'again: plain, never less');
  x = xp(); gainXp(s, Math.round(k / 4), 'a trickle', 'build'); assert.equal(xp() - x, Math.round(k / 4), 'under half a kill: never fresh');
  s.pace.ms += FRESH.gapMs;
  x = xp(); gainXp(s, 4 * k, 'a vault', 'intel'); assert.equal(xp() - x, 5 * k, '20 minutes on: fresh again, capped at a kill');
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

test('Phase 3: elites are crew rooms (a blue at least); Hardened halves the first hit; Null Route dodges one attack; uniques sit near a yellow', async () => {
  const { rollDrop } = await import('./dist/combat.mjs');
  const { RARITY_ORDER, ITEM_SCALE } = await import('./dist/gear.mjs');
  const { SKILLS, ABILITIES } = await import('./dist/data.mjs');
  const s = at(12);
  for (let i = 0; i < 20; i++) { const it = rollDrop(s, { kind: 'rogue', elite: true, rolls: 3 }, 12); assert.ok(it && RARITY_ORDER.indexOf(it.rarity) >= RARITY_ORDER.indexOf('tuned'), 'never under a blue'); }
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
  assert.equal(DECODE_XP, 2);
  const r = at(10); r.firewall = { level: 60, frag: 0, defragUntil: 0, hardenUntil: 0 };
  tickNetwork(r, T); tickNetwork(r, T + 3 * 3600000);
  assert.ok(Math.abs(r.rested - 3 * killXp(10)) <= 2, `three safe hours: three kills banked (${r.rested})`);
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

test('the map shows at most HIDDEN.shown unknown servers: flagged and most traced first', async () => {
  const { shownHidden, HIDDEN, hiddenNodes } = await import('./dist/hidden.mjs');
  const { fresh } = await import('./dist/combat.mjs');
  const s = fresh();
  for (let i = 1; i <= 20; i++) hiddenNodes(s).push({ id: 'h' + i, family: 'worm', via: 'x', depth: 2, level: 1, lead: i === 3 ? 60 : 0, pinged: true, signal: 1 });
  hiddenNodes(s).push({ id: 'h21', family: 'worm', via: 'x', depth: 2, level: 1, lead: 0, pinged: false, signal: 1 });
  const shown = shownHidden(s);
  assert.equal(shown.length, HIDDEN.shown);
  assert.equal(shown[0].id, 'h3', 'the most traced leads');
  assert.equal(shown[1].id, 'h20', 'then the newest ping');
  assert.ok(!shown.some((n) => n.id === 'h21'), 'never one you have not heard of');
});

test('review fixes: elites can drop a unique; rested pays whole XP only', async () => {
  const { rollDrop, fresh: f2, UNIQUES } = await import('./dist/combat.mjs');
  const { ELITE } = await import('./dist/data.mjs');
  const s = f2();
  let uniques = 0;
  for (let i = 0; i < 400; i++) { const it = rollDrop(s, { kind: 'rogue', id: 'pit', elite: true }, 12); if (it?.unique || UNIQUES[it?.id]) uniques++; }
  assert.ok(uniques > 0 && uniques < 400 * ELITE.unique * 3, `elite uniques in 400 kills: ${uniques}`);
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
  assert.match(collectionMarkup(s), new RegExp(`Collection · 1/${Object.keys(UNIQUES).length}`));
  assert.match(collectionMarkup(s), /\?\?\?/, 'the rest are still unknown');
  const old = f2(); old.stash = [{ ...uniqueItem(u, 3, () => 0.5), id: 'g1' }]; delete old.collection;
  assert.ok(restore(JSON.parse(JSON.stringify(old))).collection[u.id], 'what an old save holds counts');
});
