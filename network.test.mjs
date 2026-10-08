// Networks (network.mjs, docs/networks.md): every network's signature comes from its seed. Determinism, the native
// drop rates and their pity, the slow solo routes (the Listening Post, darknet listings), the native boss in its lair,
// the lean of families, strains, events and code, the v36 migration, the markup that shows it, what each native
// unique does, and that native uniques keep the class bands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, active, addItem, loaded, restore, SAVE_VERSION, UNIQUES, selectEncounter, syncServer, damageMultiplier, fxAnswer, hit, finish, patchDelay } from './dist/combat.mjs';
import { play, connect, currentLocation, layoutOf } from './dist/run.mjs';
import { CONFIG, BOSSES, NATIVE_BOSSES, STRAINS, variantFor, STRAIN_NATIVE, BOSS_LOOT, TELL } from './dist/data.mjs';
import { uniqueItem, seeded, RULES, MATERIALS } from './dist/gear.mjs';
import { NETWORK, NATIVE_POOL, signature, sigOf, memberSeed, netOf, fightNet, nativeRoll, nativeChance, awayChance, named, biasCode, leanPick, eventMult, lairOf, openLair, networkRestore, networkLines, homeName, darknetPick } from './dist/network.mjs';
import { deal, eventsOf, CARDS } from './dist/events.mjs';
import { rogueSpawns, ROGUE } from './dist/rogue.mjs';
import { networkCardMarkup, itemTipMarkup, consortiumMarkup, collectionMarkup, mapMarkup } from './dist/view.mjs';
import { serversOf } from './dist/consortium.mjs';
import { BASES } from './dist/gear.mjs';

const at = (level, netSeed = 4242) => { const s = fresh(); s.netSeed = netSeed; s.hackers = { breaker: { level, xp: 0 } }; syncServer(s); s.server.integrity = s.server.max; return s; };
const wear = (s, id, level = 30) => { const it = addItem(s, uniqueItem(UNIQUES[id], level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); return it; };
const fight = (s, key = 'cryptjack', level = 30, over = {}) => { selectEncounter(s, key, 7, { level, mutation: null, ...over }); command(s, 'engage'); s.encounter.hardened = 0; return s; };
const finishOff = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 }); const p = s.encounter.virus.parts[0]; p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); };

test('the seed fully decides the signature: same seed, same network; 3 to 5 natives, one from each band', () => {
  for (let k = 1; k <= 200; k++) {
    const seed = k * 7919 + 13, a = signature(seed), b = signature(seed);
    assert.deepEqual(a, b);
    assert.ok(a.uniques.length >= 3 && a.uniques.length <= 5, `${seed}: ${a.uniques.length} natives`);
    assert.equal(new Set(a.uniques).size, a.uniques.length, 'distinct');
    for (const [lo, hi] of NETWORK.bands) assert.ok(a.uniques.some((id) => UNIQUES[id].level >= lo && UNIQUES[id].level <= hi), `${seed}: one in ${lo}–${hi}`);
    assert.ok([a.order[0], a.order[1]].includes(STRAINS[a.strain].lineage), 'its native strain is its lead or second family');
    assert.ok(NATIVE_BOSSES.includes(a.boss));
    assert.equal(new Set(a.events).size, 2);
    assert.ok(['cipher', 'worm', 'kernel'].includes(a.code.rich) && ['salvage', 'exploit'].includes(a.code.extra));
  }
  // A different seed is a different network (nearly always: compare a hundred).
  const keys = new Set(Array.from({ length: 100 }, (_, i) => JSON.stringify(signature(i + 1).uniques) + signature(i + 1).boss + signature(i + 1).strain));
  assert.ok(keys.size >= 95, `${keys.size} distinct of 100`);
  // A simulated member's comes from their handle; no seed, no network.
  assert.deepEqual(sigOf(fresh(), 'nyx'), signature(memberSeed('nyx')));
  assert.equal(signature(0), null);
  assert.equal(sigOf(fresh(), 'you'), null, 'a bare engine state has no network');
});

test('the pool: 27 native uniques across every slot and levels 5–40, each native to a fair share of networks', () => {
  assert.equal(NATIVE_POOL.length, 27);
  const slots = new Set(NATIVE_POOL.map((id) => BASES[UNIQUES[id].base].slot));
  assert.deepEqual([...slots].sort(), ['exploit', 'implant', 'proxy', 'script', 'shell']);
  assert.ok(Math.min(...NATIVE_POOL.map((id) => UNIQUES[id].level)) === 5 && Math.max(...NATIVE_POOL.map((id) => UNIQUES[id].level)) === 40);
  for (const id of NATIVE_POOL) assert.ok(UNIQUES[id].effect, `${id} changes how a fight plays`);
  const count = Object.fromEntries(NATIVE_POOL.map((id) => [id, 0]));
  for (let k = 1; k <= 2000; k++) for (const id of signature(k * 104729).uniques) count[id]++;
  for (const [id, n] of Object.entries(count)) assert.ok(n >= 0.08 * 2000 && n <= 0.4 * 2000, `${id} is native to ${n} of 2000 networks`);
});

test('native drops: about ten times as likely on their home network, pity like a boss, one you lack first, and nothing from grey kills', () => {
  const s = at(30);
  const home = sigOf(s, 'you').uniques.filter((id) => UNIQUES[id].level <= 32);
  assert.ok(home.length >= 2);
  // Home: the chance a kill drops one, rising by NETWORK.pity for every kill without one.
  assert.equal(nativeChance(s, 'you'), NETWORK.home);
  s.netPity = { [String(s.netSeed)]: 50 };
  assert.ok(Math.abs(nativeChance(s, 'you') - (NETWORK.home + 50 * NETWORK.pity)) < 1e-12);
  s.netPity = {};
  let homeDrops = 0, awayDrops = 0, homeKills = 0;
  const got = {};
  for (let i = 0; i < 60000; i++) { const it = nativeRoll(s, 'you', 30); homeKills++; if (it) { homeDrops++; got[it.unique] = (got[it.unique] || 0) + 1; s.collection = {}; s.netNamed = {}; } }
  // Away: the same natives, heard of, from fights on nobody's network (SPRAWL-00, the trunk). No pity there.
  const t = at(30);
  t.netNamed = Object.fromEntries(home.map((id) => [id, true]));
  t.netSeed = 99; // a network these aren't native to
  const mine = new Set(sigOf(t, 'you').uniques);
  const wanted = home.filter((id) => !mine.has(id));
  const awayGot = {};
  for (let i = 0; i < 200000; i++) { const it = nativeRoll(t, null, 30); if (it) { awayDrops++; awayGot[it.unique] = (awayGot[it.unique] || 0) + 1; } }
  // Per unique, without pity at home (its base rate) and with it (what a player sees): about ten times as often at home.
  const baseHome = NETWORK.home / home.length, perHome = homeDrops / home.length / homeKills;
  const perAway = wanted.reduce((n, id) => n + (awayGot[id] || 0), 0) / wanted.length / 200000;
  assert.ok(baseHome / perAway > 6 && baseHome / perAway < 16, `base home ${baseHome.toExponential(2)} vs away ${perAway.toExponential(2)} a kill each`);
  assert.ok(perHome > baseHome, `pity lifts it: ${perHome.toExponential(2)}`);
  const own = Object.entries(got).filter(([id]) => home.includes(id)).reduce((n, [, k]) => n + k, 0);
  assert.ok(own >= 0.9 * homeDrops, `home drops are nearly all its own natives (${own} of ${homeDrops})`);
  // One you lack comes first.
  const u = at(30);
  const ids = sigOf(u, 'you').uniques.filter((id) => UNIQUES[id].level <= 32);
  u.collection = { [ids[0]]: 1 };
  u.netPity = { [String(u.netSeed)]: 1e6 }; // a drop for sure
  assert.notEqual(nativeRoll(u, 'you', 30).unique, ids[0]);
  assert.equal(u.netPity[String(u.netSeed)], 0, 'a drop resets the pity');
  // A grey kill rolls nothing.
  u.netPity = { [String(u.netSeed)]: 1e6 };
  assert.equal(nativeRoll(u, 'you', 30, 1, 15), null);
  // Its own dice: the game's rolls don't move.
  const v = at(30), rng = v.rng;
  for (let i = 0; i < 100; i++) nativeRoll(v, 'you', 30);
  assert.equal(v.rng, rng);
  assert.ok(mine.size >= 3);
});

test('where a fight is: your servers and home are yours, a member\'s are theirs, SPRAWL-00 and the trunk nobody\'s', () => {
  const s = at(10);
  command(s, 'developer location worm');
  const loc = s.locations[0];
  assert.equal(netOf(s, loc), 'you');
  assert.equal(netOf(s, { member: 'nyx' }), 'nyx');
  assert.equal(netOf(s, { trunk: true }), null);
  assert.equal(netOf(s, { id: 'sprawl', zone: true }), null);
  fight(s, 'cryptjack', 10);
  assert.equal(fightNet(s), 'you', 'a home fight is on your network');
  s.encounter = null;
  play(s, 'connect sprawl');
  play(s, 'cd ' + layoutOf(currentLocation(s))['/'].dirs[0]);
  play(s, 'attack');
  assert.equal(fightNet(s), null, 'SPRAWL-00 belongs to nobody');
});

test('the solo routes: a Listening Post tunes to a native you have heard named; darknet listings name one and sell it', () => {
  const s = at(24);
  const foreign = NATIVE_POOL.find((id) => !sigOf(s, 'you').uniques.includes(id) && UNIQUES[id].level <= 24);
  // No post, or not named yet: nothing to tune to.
  command(s, 'developer location ransomware');
  const loc = s.locations[0];
  loc.takenOver = true; loc.buildings = ['post', 'post'];
  play(s, 'listen ' + foreign);
  assert.notEqual(s.listen, foreign, 'a native you have not heard of stays ???');
  s.netNamed = { [foreign]: true };
  play(s, 'listen ' + foreign);
  assert.equal(s.listen, foreign);
  assert.equal(awayChance(s, foreign), NETWORK.awayEach * (1 + NETWORK.listenAway * 2), 'two posts: five times its away rate');
  // A darknet listing: it picks the one you listen for, names it, and sells it for credits and Exploits.
  const d = at(24, 777);
  assert.equal(darknetPick(d, 24) !== null, true);
  const ev = deal(d, 'darknet');
  assert.ok(ev && ev.unique && named(d, ev.unique), 'the listing names it');
  assert.ok(!sigOf(d, 'you').uniques.includes(ev.unique), 'it is foreign');
  play(d, `event buy ${ev.id}`);
  assert.ok(!d.collection?.[ev.unique], 'no credits, no sale');
  d.server.credits = 10000; d.materials.exploit = 5;
  play(d, `event buy ${ev.id}`);
  assert.ok(d.collection[ev.unique], 'bought');
  assert.equal(d.server.credits, 10000 - NETWORK.darknet.credits(24));
  assert.equal(d.materials.exploit, 5 - NETWORK.darknet.exploits);
  assert.ok(!eventsOf(d).some((e) => e.id === ev.id), 'the listing closes');
  const it = d.stash.find((x) => x.unique === ev.unique);
  assert.ok(it.home?.name, 'it carries its home network');
});

test('the native boss: a lair turns up at level 8 with three finds, its boss in /core, its drops its network\'s natives at BOSS_LOOT odds with pity', () => {
  const s = at(7);
  for (const f of ['ransomware', 'worm', 'ghostroot']) command(s, 'developer location ' + f);
  openLair(s);
  assert.equal(lairOf(s), null, 'not before level 8');
  s.hackers.breaker.level = 18;
  openLair(s);
  const lair = lairOf(s), g = sigOf(s, 'you'), B = BOSSES[g.boss];
  assert.ok(lair && lair.lair === g.boss && lair.name === B.lair && lair.rogue.kind === 'lair');
  assert.ok(ROGUE.kinds.lair, 'a kind of its own, never rolled');
  const sp = rogueSpawns(s, lair, Date.now());
  assert.equal(sp['/core'].boss, g.boss);
  assert.ok(sp['/outer'].family === B.family && sp['/den'].family === B.family);
  // Fight it: a miss raises the next kill's chance, a kill names every native of the network.
  const was = BOSS_LOOT.chance;
  try {
    BOSS_LOOT.chance = -1;
    connect(s, 'lair');
    play(s, 'cd core'); play(s, 'attack');
    assert.equal(s.encounter.virus.boss, g.boss);
    assert.equal(s.encounter.virus.name.includes(B.name) || s.encounter.virus.name === B.name, true);
    finishOff(s);
    assert.equal(s.pity['lair:you'], 1);
    for (const id of g.uniques) assert.ok(named(s, id), `${id} is named`);
    assert.ok(lair.spawns['/core'].respawnAt - Date.now() > NETWORK.lairMs - 60000, 'back in an hour');
    BOSS_LOOT.chance = 1;
    lair.spawns['/core'] = null; lair.lockUntil = 0;
    play(s, 'jack out'); lair.lockUntil = 0;
    connect(s, 'lair'); play(s, 'cd core'); play(s, 'attack');
    const before = (s.stash || []).length;
    finishOff(s);
    const dropped = s.stash.slice(before).find((x) => x.unique && g.uniques.includes(x.unique));
    assert.ok(dropped, 'a native of its network');
    assert.equal(s.pity['lair:you'], 0);
  } finally { BOSS_LOOT.chance = was; }
  // Every template has its own tells: a family boss its own set, a strain boss its strain's, under its name.
  for (const id of NATIVE_BOSSES) {
    const v = at(18);
    selectEncounter(v, 'random', 5, { mode: 'run', room: '/core', level: 18, zone: true, family: BOSSES[id].family, boss: id, strain: BOSSES[id].strain, mutation: null });
    v.run = { loc: 'x', cwd: '/', integrity: 500, max: 500, pack: [], visited: ['/'] };
    v.encounter.soft = 1;
    command(v, 'engage');
    const names = v.encounter.virus.tells.list.map((t) => t.name);
    assert.ok(names.length >= 3, `${id}: ${names}`);
    if (BOSSES[id].charge) assert.ok(names.includes(BOSSES[id].charge), `${id} renames its strain's charge`);
    if (BOSSES[id].third && 18 >= 8 && id !== 'nb-tripmine') assert.ok(v.encounter.virus.parts.some((p) => p.id === BOSSES[id].third), `${id} brings its ${BOSSES[id].third}`);
  }
});

test('the lean: families, the native strain, the favoured events and the rich code all lean the network\'s way', () => {
  const s = at(20), g = sigOf(s, 'you');
  // Families: the lead family about three times the third's.
  const n = { ransomware: 0, worm: 0, ghostroot: 0 };
  for (let i = 0; i < 6000; i++) n[leanPick(s, 'you', (i + 0.5) / 6000)]++;
  assert.ok(n[g.order[0]] > 2.5 * n[g.order[2]], JSON.stringify(n));
  // Strains: the native one STRAIN_NATIVE times as likely as each of its family's others.
  const fam = STRAINS[g.strain].lineage;
  const c = {};
  for (let seed = 1; seed <= 6000; seed++) { const { strain } = variantFor(fam, 30, 3, seed, g.strain); if (strain) c[strain] = (c[strain] || 0) + 1; }
  const others = Object.entries(c).filter(([k]) => k !== g.strain).map(([, v]) => v);
  assert.ok(c[g.strain] > 3 * Math.max(...others), JSON.stringify(c));
  // Plain, it's even (no native passed: the old rolls).
  assert.deepEqual(variantFor(fam, 30, 3, 77), variantFor(fam, 30, 3, 77, null));
  // Events: its two favoured cards weigh more.
  for (const k of Object.keys(CARDS)) assert.equal(eventMult(s, k), g.events.includes(k) ? NETWORK.eventBoost : 1);
  // Code: a share of every other code comes as its rich code; the total stays.
  const other = ['cipher', 'worm', 'kernel'].find((k) => k !== g.code.rich);
  let moved = 0, total = 0;
  for (let i = 0; i < 100; i++) { const out = biasCode(s, 'you', { [other]: 3 }); moved += out[g.code.rich] || 0; total += Object.values(out).reduce((a, b) => a + b, 0); }
  assert.equal(total, 300);
  assert.ok(Math.abs(moved - 300 * NETWORK.codeShare) <= 1, `${moved} of 300 moved`);
  // A Pit on your network leans toward your lead family.
  command(s, 'developer location worm');
  const pit = s.locations[0];
  Object.assign(pit, { rogue: { kind: 'pit' }, template: 'rogue', spawns: {}, serial: 0, level: 20 });
  const fams = { ransomware: 0, worm: 0, ghostroot: 0 };
  for (let k = 0; k < 300; k++) { pit.spawns = {}; for (const sp of Object.values(rogueSpawns(s, pit, 0))) fams[sp.family]++; }
  assert.ok(fams[g.order[0]] > fams[g.order[2]], JSON.stringify(fams));
});

test('v36: a save from before networks gets a seed from its own, the same every time; v34 and v35 saves load', () => {
  const old = fresh();
  Object.assign(old, { version: 35, seed: 31337, profile: { handle: 'kilo', pwLen: 6, since: 1 } });
  delete old.netSeed;
  const a = restore(structuredClone(old)), b = restore(structuredClone(old));
  assert.equal(a.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 36);
  assert.ok(a.netSeed > 0);
  assert.equal(a.netSeed, b.netSeed, 'deterministic');
  assert.deepEqual(sigOf(a, 'you'), sigOf(b, 'you'));
  const other = restore({ ...structuredClone(old), seed: 31338 });
  assert.notEqual(other.netSeed, a.netSeed, 'another save, another network');
  const v34 = restore({ ...structuredClone(old), version: 34 });
  assert.equal(v34.version, SAVE_VERSION, 'a v34 save loads (it used to start over)');
  assert.ok(v34.netSeed);
  // A save that already has one keeps it.
  const kept = restore({ ...structuredClone(a) });
  assert.equal(kept.netSeed, a.netSeed);
  const c = fresh(); networkRestore(c, 35); assert.ok(c.netSeed);
});

test('show it: the Network card, the member cards and map, the native tooltip, the collection', () => {
  const s = at(24);
  const g = sigOf(s, 'you');
  let html = networkCardMarkup(s, 'you');
  // Nothing is told: the strain, the events and the riches are ??? until you've found them by playing there.
  assert.ok(html.includes(g.name) && !html.includes(STRAINS[g.strain].name) && !html.includes('lean-bar') && !html.includes('% a kill'));
  assert.equal((html.match(/Not seen or named yet/g) || []).length, g.uniques.length, 'every native ??? until seen or named');
  s.netIntel = { you: { fam: { [g.order[0]]: 3 }, strains: { [g.strain]: 2 }, events: {}, rich: 8 } };
  s.netNamed = { [g.uniques[0]]: true };
  html = networkCardMarkup(s, 'you');
  assert.ok(html.includes(UNIQUES[g.uniques[0]].name), 'named shows by name');
  assert.ok(html.includes('lean-bar') && html.includes(STRAINS[g.strain].name) && html.includes(MATERIALS[g.code.rich].short));
  // The Server page carries it.
  play(s, 'network');
  assert.ok(s.logs.at(-1).message.includes(g.name));
  // A native's tooltip names its home network.
  const it = addItem(s, { ...uniqueItem(UNIQUES[g.uniques[0]], 24, seeded(2)), home: homeName(s, g.uniques[0]) });
  const tip = itemTipMarkup(s, it.id);
  assert.ok(tip.includes('Native · ' + g.name), tip);
  // The collection lists your network's natives and no others you haven't met.
  const coll = collectionMarkup(s);
  const foreign = NATIVE_POOL.filter((id) => !g.uniques.includes(id));
  assert.ok(coll.includes('Native · ' + g.name));
  assert.ok(foreign.every((id) => !coll.includes(UNIQUES[id].name)));
  // A consortium: each member's network on its member row, its card on the map, and `network <member>`.
  play(s, 'consortium create Test Net');
  play(s, 'consortium invite nyx');
  const page = consortiumMarkup(s);
  const ng = sigOf(s, 'nyx');
  assert.ok(page.includes('cm-net') && page.includes(ng.name), 'the member row names their network');
  const map = mapMarkup(s, 'member-nyx', 'consortium', { side: false, pop: true });
  assert.ok(map.includes(ng.name), "the map's member node and card name it");
  assert.ok(!networkCardMarkup(s, 'nyx').includes(STRAINS[ng.strain].name), 'a member network is ??? until you play on it');
  s.netIntel.nyx = { fam: {}, strains: { [ng.strain]: 2 }, events: {}, rich: 0 };
  assert.ok(networkCardMarkup(s, 'nyx').includes(STRAINS[ng.strain].name));
  play(s, 'network nyx');
  assert.ok(s.logs.at(-1).message.includes(ng.name));
  // Their lair is on their network.
  assert.ok(serversOf(s, 'nyx').some((l) => l.lair === ng.boss), 'nyx brings a lair');
  assert.equal(networkLines(s, 'nyx').length, 5);
});

test('native effects: Open, locks and wards, the Tripwire, twins, reads, after-effects, the Mimic, rules', () => {
  const was = { baseCrit: CONFIG.baseCrit, enemyCrit: CONFIG.enemyCrit, misses: CONFIG.misses };
  Object.assign(CONFIG, { baseCrit: 0, enemyCrit: 0, misses: false });
  try {
    // Null Byte: +35% on an Open part.
    const a = at(30); wear(a, 'null-byte'); fight(a);
    const p = part(a, 'pulse'), plain = damageMultiplier(a, p, { mine: true });
    p.openUntil = a.encounter.cycle + 1;
    assert.ok(Math.abs(damageMultiplier(a, p, { mine: true }) / plain - 1.35 * TELL.open.mult) < 1e-9);
    // Keyjam: +40% on a part behind a lock.
    const b = at(30); wear(b, 'keyjam'); fight(b);
    const enc = part(b, 'encryptor'), base = damageMultiplier(b, enc, { mine: true });
    enc.lockHp = 10;
    assert.ok(Math.abs(damageMultiplier(b, enc, { mine: true }) / base - 1.4) < 1e-9);
    // Quiet Wire: a Tripwire you break stays quiet.
    const c = at(30); wear(c, 'quiet-wire'); fight(c, 'random', 30, { family: 'ransomware' });
    const tw = c.encounter.virus.parts.find((x) => x.deadman) || (() => { const x = { ...part(c, 'pulse'), id: 'tripwire', name: 'Tripwire', deadman: true, attack: null, integrity: 1, armor: 0 }; c.encounter.virus.parts.push(x); return x; })();
    Object.assign(tw, { integrity: 1, armor: 0 });
    command(c, 'spike ' + tw.id); resolveCycle(c);
    assert.ok(!c.encounter.virus.parts.some((x) => x.loud), 'nothing went loud');
    // Split Brain: a twin you break can't reboot.
    const d = at(30); wear(d, 'split-brain'); fight(d, 'random', 30, { family: 'worm' });
    const mirror = d.encounter.virus.parts.find((x) => x.twin);
    if (mirror) { Object.assign(mirror, { integrity: 1, armor: 0 }); command(d, 'spike ' + mirror.id); resolveCycle(d); assert.ok(!mirror.rebootAt, 'no reboot'); }
    // Ping of Death: the part you read takes 10.
    const e = at(30); wear(e, 'ping-of-death'); fight(e);
    const q = part(e, 'encryptor'); Object.assign(q, { armor: 0 });
    const hp = q.integrity; fxAnswer(e, q);
    assert.equal(hp - q.integrity, 10);
    // Rubber Hose: +6 damage a read, up to 30.
    const f = at(38); wear(f, 'rubber-hose', 38); fight(f, 'cryptjack', 38);
    const fp = part(f, 'encryptor'); Object.assign(fp, { armor: 0, integrity: 9999, max: 9999 });
    const dealt = (reads) => { f.encounter.metrics.reads = reads; const was = fp.integrity; hit(f, fp, 20, { mine: true, pierce: true }); return was - fp.integrity; };
    const full = dealt(7) - dealt(0);
    assert.ok(full >= 25 && full <= 40, `+30 before the multipliers: ${full}`);
    assert.equal(dealt(9), dealt(7), 'capped');
    assert.ok(dealt(2) < dealt(4));
    // Sandman: tells that land leave nothing behind (no key offline, no Corrupted, no Hung).
    const left = (sand) => {
      let after = 0;
      for (let k = 0; k < 6; k++) {
        const g = at(36); if (sand) wear(g, 'sandman', 36);
        selectEncounter(g, 'random', 40 + k, { level: 36, mutation: null }); command(g, 'engage');
        for (let n = 0; n < 14 && active(g); n++) { command(g, 'hold'); resolveCycle(g); if (g.encounter.corrupt || g.encounter.hung || Object.keys(g.encounter.locked || {}).length) after++; }
      }
      return after;
    };
    assert.equal(left(true), 0, 'nothing behind');
    assert.ok(left(false) > 0, 'without it, something stays behind');
    // Mirror Maze: on the Decoy's beat your command goes through at half.
    const mz = (maze) => {
      const x = at(40); if (maze) wear(x, 'mirror-maze', 40);
      fight(x, 'random', 40, { family: 'ghostroot' });
      const dec = x.encounter.virus.parts.find((q) => q.reflect);
      if (!dec) { x.encounter.virus.parts.push({ ...part(x, 'pulse'), id: 'decoy', name: 'Decoy', reflect: 4, attack: null }); }
      x.encounter.cycle = 8;
      const tgt = part(x, 'pulse'); Object.assign(tgt, { armor: 0, integrity: 9999, max: 9999 });
      const was = tgt.integrity; hit(x, tgt, 40, { mine: true }); return was - tgt.integrity;
    };
    assert.equal(mz(false), 0, 'mirrored');
    assert.ok(mz(true) > 0, 'through');
    // Policy Engine: rules count half again.
    const h = at(20);
    const blue = addItem(h, { kind: 'protocol', side: 'hacker', group: 'proxy', base: 'open-proxy', rarity: 'tuned', level: 20, stats: { signal: 1 }, affixes: [], zeroDay: null, unique: null, name: 'Rule', rule: 'stack-canary', ruleValue: 4 });
    command(h, 'load ' + blue.id);
    wear(h, 'policy-engine', 20);
    fight(h, 'cryptjack', 20);
    assert.equal(h.encounter.shield, 6, 'Stack Canary 4 → 6');
    // Lockpick: hits count double against a lock.
    const k = at(30); wear(k, 'lockpick'); fight(k);
    const lk = part(k, 'encryptor');
    Object.assign(lk, { armor: 0, lockHp: 40, lockMax: 40 });
    k.encounter.virus.parts.push({ ...part(k, 'pulse'), id: 'mutex', name: 'Mutex', lock: 'encryptor', attack: null, integrity: 50 });
    hit(k, lk, 10, { mine: true, by: 'test', pierce: true });
    assert.ok(lk.lockHp <= 40 - 20 + 1, `lock ${lk.lockHp}`);
    // Kill Chain: a break leaves the next part Open.
    const m = at(30); wear(m, 'kill-chain'); fight(m);
    const pm = part(m, 'pulse'); Object.assign(pm, { integrity: 1, armor: 0 });
    command(m, 'spike pulse'); resolveCycle(m);
    assert.ok(part(m, 'encryptor').openUntil >= m.encounter.cycle - 1, 'the Encryptor is open');
  } finally { Object.assign(CONFIG, was); }
});


test('you learn a network by playing it: its native strain after two kills, a favoured event after it comes up twice, its riches once its code leans', async () => {
  const { noteKill, noteEvent, knowsStrain, knowsEvent, knowsRich, biasCode, intelOf, INTEL } = await import('./dist/network.mjs');
  const s = at(12);
  const g = sigOf(s, 'you');
  const e = { mode: 'home', virus: { family: STRAINS[g.strain].lineage, strain: g.strain } };
  assert.ok(!knowsStrain(s, 'you'));
  noteKill(s, e);
  assert.ok(!knowsStrain(s, 'you'));
  noteKill(s, e);
  assert.ok(knowsStrain(s, 'you'));
  assert.equal(intelOf(s, 'you').fam[STRAINS[g.strain].lineage], 2);
  assert.match(s.logs.at(-1).message, /You notice .* turns up often on/);
  const card = g.events[0];
  noteEvent(s, card);
  assert.ok(!knowsEvent(s, card));
  noteEvent(s, card);
  assert.ok(knowsEvent(s, card));
  const other = ['cipher', 'worm', 'kernel'].find((k) => k !== g.code.rich);
  for (let i = 0; i < 40 && !knowsRich(s, 'you'); i++) biasCode(s, 'you', { [other]: 5 });
  assert.ok(knowsRich(s, 'you') && intelOf(s, 'you').rich >= INTEL.rich);
});

test('a guard or a boss beaten on your network never breaks the Network card', async () => {
  const { noteKill, intelOf } = await import('./dist/network.mjs');
  const s = at(12);
  noteKill(s, { mode: 'home', virus: { family: 'sentinel' } });
  intelOf(s, 'you').fam.watchdog = 3; // a save from before the fix
  noteKill(s, { mode: 'home', virus: { family: 'worm' } });
  const html = networkCardMarkup(s, 'you');
  assert.ok(html.includes('lean-bar') && !html.includes('undefined'));
  assert.ok(networkLines(s, 'you').every((l) => !l.includes('undefined')));
});
