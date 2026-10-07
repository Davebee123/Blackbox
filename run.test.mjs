import test from 'node:test';
import { HIDDEN, hiddenNodes } from './dist/hidden.mjs';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part } from './dist/combat.mjs';
import { play, connect, currentLocation } from './dist/run.mjs';
import * as runMod from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { codeOf, vaultCode } from './dist/gear.mjs';
import { FRESH as __FRESH } from './dist/combat.mjs';
__FRESH.bonus = 0; // exact XP checks: the Fresh bonus has its own tests (phase2.test.mjs)
// These tests check exact numbers: no crits (gear.test.mjs covers them).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 }; // and no level-gap scaling (combat.test.mjs tests it)

const say = (s, t) => play(s, t);
const located = (family = 'ransomware') => {
  const s = fresh();
  command(s, `developer location ${family}`);
  return s;
};
const onRun = () => {
  const s = located();
  connect(s, s.locations[0].id);
  return s;
};
// Leave one part on 1 Integrity with no armor, then break it.
const finishOff = (s, id) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  part(s, id).integrity = 1;
  command(s, 'spike ' + id);
  resolveCycle(s);
};
const winFight = (s) => {
  command(s, 'engage');
  finishOff(s, s.encounter.virus.parts[0].id);
};

test('every home victory gives a lead; four plain kills of one family locate it', () => {
  const s = fresh();
  for (let i = 0; i < 3; i++) {
    command(s, 'encounter cryptjack');
    command(s, 'engage');
    finishOff(s, 'pulse');
  }
  assert.equal(s.locations.length, 0, 'not after three');
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  finishOff(s, 'pulse');
  assert.equal(s.locations.length, 1);
  assert.equal(s.locations[0].family, 'ransomware');
});

test('connect starts a run with full Signal and parks the home intrusion', () => {
  const s = located();
  command(s, 'encounter splinter');
  connect(s, s.locations[0].id);
  assert.equal(s.run.integrity, CONFIG.maxSignal);
  assert.equal(s.encounter, null);
  say(s, 'jack out');
  assert.equal(s.encounter.virus.name, 'SPLINTER');
});

test('ls lists, cd moves and costs Signal, cat reads', () => {
  const s = onRun();
  const listing = say(s, 'ls').find((e) => e.type === 'net-ls').message;
  assert.match(listing, /relay\/\s+\[guarded\]/);
  say(s, 'cd logs');
  assert.equal(s.run.cwd, '/logs');
  assert.equal(s.run.integrity, CONFIG.maxSignal - CONFIG.cdCost);
  const file = say(s, 'cat access.log').find((e) => e.type === 'net-file').message;
  assert.match(file, new RegExp(currentLocation(s).password));
  say(s, 'cd ..');
  assert.equal(s.run.cwd, '/');
});

test('look and go work as aliases', () => {
  const s = onRun();
  assert.ok(say(s, 'look').some((e) => e.type === 'net-ls'));
  say(s, 'go logs');
  assert.equal(s.run.cwd, '/logs');
});

test('a guarded directory starts a fight on your Signal, not the server', () => {
  const s = onRun();
  say(s, 'cd relay');
  assert.equal(s.encounter.mode, 'run');
  assert.equal(s.encounter.phase, 'alert');
  assert.match(say(s, 'cat cache.dat').at(-1).message, /watchdog/i);
  command(s, 'engage');
  const before = s.run.integrity;
  s.encounter.cycle = part(s, 'sentry').attack.due;
  resolveCycle(s);
  assert.ok(s.run.integrity < before);
  assert.equal(s.server.integrity, 100);
  assert.match(say(s, 'ls').at(-1).message, /Fight it first/);
});

test('backing off a guard before engaging cancels it', () => {
  const s = onRun();
  say(s, 'cd relay');
  say(s, 'cd ..');
  assert.equal(s.encounter, null);
  assert.equal(s.run.cwd, '/');
});

test('beating the guard opens the directory for good', () => {
  const s = onRun();
  say(s, 'cd relay');
  winFight(s);
  assert.equal(s.encounter.phase, 'victory');
  assert.ok(currentLocation(s).state.cleared['/relay']);
  assert.ok(say(s, 'pull cache.dat').some((e) => e.type === 'net-good'));
});

test('the vault needs the password from the log; wrong guesses cost Signal', () => {
  const s = onRun();
  say(s, 'cd relay');
  winFight(s);
  assert.match(say(s, 'cd vault').at(-1).message, /locked/);
  const sig = s.run.integrity;
  say(s, 'unlock vault wrong');
  assert.equal(s.run.integrity, sig - 3);
  say(s, `unlock vault ${currentLocation(s).password}`);
  say(s, 'cd vault');
  assert.equal(s.run.cwd, '/relay/vault');
});

test('jack out banks the pack; a pulled signal file leads deeper', () => {
  const s = onRun();
  const loc = currentLocation(s);
  say(s, 'cd relay');
  winFight(s);
  say(s, 'pull cache.dat');
  say(s, `unlock vault ${loc.password}`);
  say(s, 'cd vault');
  say(s, 'pull payload.bin');
  say(s, 'pull signal.trc');
  const credits = s.server.credits;
  const code = codeOf(loc.family), packed = s.run.pack.filter((p) => p.kind === 'code' && p.material === code).reduce((a, p) => a + p.amount, 0);
  assert.ok(packed >= vaultCode(loc.level || 1), 'the vault payload is a cache of code');
  say(s, 'jack out');
  assert.equal(s.run, null);
  const base = Math.round(CONFIG.cacheCredits * (loc.quirk === 'hoard' ? 1 + CONFIG.hoardBonus : 1));
  assert.equal(s.server.credits, credits + base + Math.round(base * 0.25), 'a clean job (vault opened, low trace) pays a quarter more');
  assert.ok(s.logs.some((e) => e.type === 'clean-job'));
  assert.equal(s.materials[code], packed, 'banked on jack-out');
  const deeper = hiddenNodes(s).find((n) => n.via === loc.id && n.family === loc.deeper);
  assert.ok(deeper && deeper.lead >= HIDDEN.recordLead, 'the trace to a layer-2 node moves on');
  assert.ok(!s.locations.some((l) => l.depth === 2), 'not located outright');
  assert.ok(loc.state.taken['/relay/cache.dat']);
});

test('losing all Signal disconnects you, loses the pack and spares the server', () => {
  const s = onRun();
  say(s, 'cd relay');
  command(s, 'engage');
  s.run.pack.push({ path: '/x', name: 'x', kind: 'credits', amount: 99 });
  s.run.integrity = 1;
  s.encounter.cycle = part(s, 'sentry').attack.due;
  resolveCycle(s);
  assert.equal(s.run, null);
  assert.equal(s.server.integrity, 100);
  assert.equal(s.server.credits, CONFIG.startingCredits);
  assert.ok(s.logs.some((e) => e.type === 'disconnected'));
});

test('home intrusions wait while you are out', () => {
  const s = onRun();
  assert.match(command(s, 'encounter cryptjack').at(-1).message, /jack out/);
});

test('multi-step paths work like Unix', () => {
  const s = onRun();
  say(s, 'cd logs');
  say(s, 'cd ../relay');
  assert.equal(s.run.cwd, '/relay');
  say(s, 'cd ..');
  assert.match(say(s, 'cd relay/vault').at(-1).message, /guarded/);
  assert.match(say(s, 'cat logs/access.log').at(-1).message, new RegExp(currentLocation(s).password));
  say(s, 'cd /logs');
  assert.equal(s.run.cwd, '/logs');
});

test('coming home finds no intrusion waiting: fights are on the rogue server now', () => {
  const s = onRun();
  say(s, 'jack out');
  assert.equal(s.encounter, null);
});

test('the rogue server: viruses sit in its folders; attack one for a home-style kill; it comes back later', async () => {
  const { zoneSpawns, liveSpawns } = await import('./dist/run.mjs');
  const { hooks } = await import('./dist/combat.mjs');
  const s = fresh();
  hooks.now = () => 1000;
  say(s, 'connect sprawl');
  assert.equal(s.run.loc, 'sprawl');
  assert.equal(liveSpawns(s), 6, 'every folder has a virus');
  say(s, 'cd tmp');
  const ls = say(s, 'ls').find((e) => e.type === 'net-ls');
  const virus = ls.entries.find((x) => x.kind === 'virus');
  assert.ok(virus, 'the folder shows its virus');
  say(s, 'attack');
  assert.equal(s.encounter.phase, 'active');
  assert.ok(s.encounter.zone);
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  command(s, 'spike ' + s.encounter.virus.parts[0].id); resolveCycle(s);
  const events = (command(s, 'spike ' + s.encounter.virus.parts[1].id), resolveCycle(s));
  assert.ok(events.some((e) => e.type === 'victory'));
  assert.ok(events.some((e) => e.type === 'xp'), 'XP right away');
  assert.ok(s.leadProgress[s.encounter.virus.family] > 0, 'a lead toward its origin');
  assert.equal(liveSpawns(s), 5);
  zoneSpawns(s, 1000 + CONFIG.zone.respawnMs + 1);
  assert.equal(liveSpawns(s), 6, 'it came back');
  hooks.now = null;
});

test('Signal carries between connections and rests back up; too weak and you cannot connect', async () => {
  const { idleRegen, maxSignal } = await import('./dist/combat.mjs');
  const s = fresh();
  s.signal = 10;
  assert.match(say(s, 'connect sprawl').at(-1).message, /too weak/);
  for (let i = 0; i < 30; i++) idleRegen(s, 1000);
  assert.ok(s.signal - 10 >= Math.floor(maxSignal(s) * CONFIG.signalRest / 2) - 1, 'rests back at home');
  idleRegen(s, 2 * 60000);
  assert.ok(s.signal >= Math.ceil(maxSignal(s) * CONFIG.zone.minSignal));
  say(s, 'connect sprawl');
  assert.equal(s.run.integrity, s.signal ?? maxSignal(s));
  s.run.integrity = 40;
  say(s, 'jack out');
  assert.equal(s.signal, 40);
});

test('arriving in a directory lists it automatically', () => {
  const s = onRun();
  assert.ok(say(s, 'cd logs').some((e) => e.type === 'net-ls' && e.entries.some((x) => x.name === 'access.log')));
});

test('next actions offer only what makes sense here', async () => {
  const { nextActions } = await import('./dist/run.mjs');
  const s = onRun();
  const labels = () => nextActions(s).map((a) => a.label);
  assert.ok(labels().includes('cat readme.txt'));
  assert.ok(labels().includes('cd relay'));
  say(s, 'cat readme.txt');
  assert.ok(!labels().includes('cat readme.txt'));
  say(s, 'cd relay');
  assert.deepEqual(labels(), ['engage WATCHDOG', 'cd ..']);
  winFight(s);
  assert.ok(labels().includes('pull cache.dat'));
  assert.ok(nextActions(s).some((a) => a.prefill === 'unlock vault '));
});

test('tree and pack print into the terminal', () => {
  const s = onRun();
  assert.match(say(s, 'tree').at(-1).message, /relay\/\s+\[guarded\]/);
  assert.match(say(s, 'pack').at(-1).message, /empty/);
});

test('guard fights show your Signal in the HUD', async () => {
  const { hudMarkup } = await import('./dist/view.mjs');
  const s = onRun();
  say(s, 'cd relay');
  command(s, 'engage');
  assert.match(hudMarkup(s), /Your Signal/);
  assert.match(hudMarkup(s), new RegExp(`${s.run.integrity}<small>/${s.run.max}`));
});

test('jack out mid-fight is an emergency escape that keeps the pack', () => {
  const s = onRun();
  s.run.pack.push({ path: '/x', name: 'x', kind: 'credits', amount: 7 });
  say(s, 'cd relay');
  command(s, 'engage');
  say(s, 'jack out');
  resolveCycle(s);
  assert.equal(s.run, null);
  assert.equal(s.server.credits, CONFIG.startingCredits + 7);
  assert.equal(s.locations[0].state.cleared['/relay'], undefined);
});


// ---------- templates, depth, upgrades ----------
const withTemplate = (template, depth = 1, extra = {}) => {
  const s = fresh();
  command(s, 'developer location worm');
  Object.assign(s.locations[0], { template, depth, quirk: null, level: 1 + 3 * (depth - 1) }, extra);
  connect(s, s.locations[0].id);
  return s;
};
const clear = (s) => { command(s, 'engage'); finishOff(s, s.encounter.virus.parts.at(-1).id); };

test('locations rotate through templates', () => {
  const s = fresh();
  for (const f of ['worm', 'ransomware', 'ghostroot']) command(s, `developer location ${f}`);
  for (const f of ['worm', 'ransomware']) command(s, `developer location ${f}`);
  // rogue servers take no turn in the rotation
  assert.deepEqual(s.locations.filter((l) => !l.rogue).map((l) => l.template), ['relay', 'mailhub', 'mirror', 'archive', 'lab'].slice(0, s.locations.filter((l) => !l.rogue).length));
  assert.ok(s.locations.filter((l) => l.rogue).every((l) => l.template === 'rogue'));
});

test('mailhub: the password is split across the mail and the guarded spool log', () => {
  const s = withTemplate('mailhub');
  const loc = currentLocation(s);
  const word = loc.password.replace(/\d+$/, ''), digits = loc.password.match(/\d+$/)[0];
  say(s, 'cd mail');
  const mail = say(s, 'cat ops.eml').at(-1).message;
  assert.match(mail, new RegExp(word));
  assert.doesNotMatch(mail, new RegExp(loc.password));
  say(s, 'cd ../spool');
  assert.equal(s.encounter.virus.name, 'SENTINEL');
  clear(s);
  assert.match(say(s, 'cat queue.log').at(-1).message, new RegExp(digits));
  say(s, `unlock vault ${loc.password}`);
  say(s, 'cd vault');
  assert.equal(s.run.cwd, '/spool/vault');
});

test('mirror: two credit files, the password is behind the guard', () => {
  const s = withTemplate('mirror');
  const loc = currentLocation(s);
  say(s, 'cd public');
  say(s, 'pull mirror.dat');
  say(s, 'cd ../private');
  clear(s);
  say(s, 'pull ledger.dat');
  say(s, 'cd admin');
  assert.match(say(s, 'cat todo.txt').at(-1).message, new RegExp(loc.password));
  say(s, `unlock vault ${loc.password}`);
  say(s, 'cd vault');
  say(s, 'pull payload.bin');
  assert.equal(s.run.pack.filter((p) => !p.path.includes('#')).length, 3);
  assert.ok(s.run.pack.some((p) => p.kind === 'code' && p.path.includes('#code')), 'the guard dropped code');
});

test('deeper layers have tougher guards and bigger caches', async () => {
  const { fileInfo } = await import('./dist/run.mjs');
  const s1 = withTemplate('relay', 1), s3 = withTemplate('relay', 3);
  say(s1, 'cd relay'); say(s3, 'cd relay');
  assert.equal(s3.encounter.virus.threat - s1.encounter.virus.threat, 2 * CONFIG.depthThreat);
  assert.ok(fileInfo(currentLocation(s3), '/relay', 'cache.dat').amount > fileInfo(currentLocation(s1), '/relay', 'cache.dat').amount);
});

test('archive: three month logs, only the latest key works; the Shredder hits your Signal hard', () => {
  const s = withTemplate('archive', 1, { month: 'feb' });
  const loc = currentLocation(s);
  assert.match(say(s, 'cat readme.md').at(-1).message, /last rotation: feb/);
  say(s, 'cd backups');
  assert.match(say(s, 'cat feb.log').at(-1).message, new RegExp(loc.password));
  assert.doesNotMatch(say(s, 'cat jan.log').at(-1).message, new RegExp(loc.password + '$'));
  say(s, 'pull old.dat');
  say(s, 'cd ../srv');
  assert.equal(s.encounter.virus.name, 'SHREDDER');
  command(s, 'engage');
  part(s, 'pulse').attack = null;
  s.encounter.cycle = part(s, 'encryptor').attack.due;
  const sig = s.run.integrity;
  command(s, 'hold');
  const events = resolveCycle(s);
  assert.ok(events.some((e) => e.type === 'server-hit'));
  assert.ok(s.run.integrity < sig);
  assert.equal(s.run.pack.length, 1, 'your pack is safe: only damage threatens you');
});

test('lab: pulling the honeypot costs Signal; reading it first warns you', () => {
  const s = withTemplate('lab');
  say(s, 'cd tmp');
  const before = s.run.integrity;
  const ev = say(s, 'pull bait.dat');
  assert.ok(ev.some((e) => e.type === 'trap'));
  assert.equal(s.run.integrity, before - CONFIG.trapSignal);
  assert.equal(s.run.pack.length, 0);
  const t = withTemplate('lab');
  say(t, 'cd tmp');
  say(t, 'cat bait.dat');
  const { nextActions } = runMod;
  assert.ok(!nextActions(t).some((a) => a.cmd === 'pull bait.dat'));
  say(t, 'cd ../lab');
  assert.equal(t.encounter.virus.name, 'CRAWLER');
});

test('hidden quirk: a dot directory only shows with ls -a and holds the key', () => {
  const s = withTemplate('relay', 1, { quirk: 'hidden' });
  const loc = currentLocation(s);
  assert.doesNotMatch(say(s, 'ls').at(-1).message, /\.ghost/);
  assert.match(say(s, 'ls -a').at(-1).message, /\.ghost/);
  say(s, 'cd .ghost');
  assert.match(say(s, 'cat .key').at(-1).message, new RegExp(loc.password));
  say(s, 'pull stash.dat');
  assert.equal(s.run.pack.length, 1);
});

test('nest quirk adds an optional Crawler room; hoard pays more with armored guards', () => {
  const s = withTemplate('relay', 1, { quirk: 'nest' });
  say(s, 'cd nest');
  assert.equal(s.encounter.virus.name, 'CRAWLER');
  const h = withTemplate('relay', 1, { quirk: 'hoard' });
  say(h, 'cd relay');
  assert.equal(h.encounter.virus.mutation, 'armored');
  assert.equal(runMod.fileInfo(currentLocation(h), '/relay', 'cache.dat').amount, Math.round(CONFIG.cacheCredits * (1 + CONFIG.hoardBonus)));
});

test('every location gets its family quirk', async () => {
  const s = fresh();
  s.net = { nested: true }; // past the guaranteed early Nest
  for (const f of ['ransomware', 'worm', 'ghostroot']) command(s, `developer location ${f}`);
  assert.deepEqual(s.locations.map((l) => l.quirk), ['hoard', 'nest', 'hidden']);
});

test('talent tree: points come from levels, ranks open the tiers, swapping is free, refunds keep it valid', async () => {
  const { picksOf, ranksOf, tierState, pointsSpent, talentPoints, kitOf } = await import('./dist/combat.mjs');
  const s = fresh();
  assert.equal(talentPoints(s), 0);
  assert.match(command(s, 'talent add overclocked').at(-1).message, /Talents start at level 10/);
  command(s, 'developer level 18'); // points at 10, 12, 14, 16, 18
  assert.equal(talentPoints(s), 5);
  // The tree is your subclass's: its first row, then its second.
  const [[a, b], [c]] = kitOf(s).fillers;
  assert.match(command(s, 'talent 1 a').at(-1).message, /needs 3 points/);
  command(s, `talent add ${a.id}`);
  command(s, `talent add ${a.id}`);
  command(s, `talent add ${b.id}`);
  assert.match(command(s, `talent add ${a.id}`).at(-1).message, new RegExp(`${a.name} 3/3`));
  assert.match(command(s, `talent add ${a.id}`).at(-1).message, /max rank/);
  assert.equal(tierState(s, 'breaker', 0), 'open');
  command(s, 'talent 1 a');
  command(s, 'talent 1 b');
  assert.deepEqual(picksOf(s, 'breaker'), [1], 'swapping is free');
  assert.equal(pointsSpent(s, 'breaker'), 5);
  assert.match(command(s, `talent add ${c.id}`).at(-1).message, /No free talent points/);
  command(s, `talent remove ${b.id}`);
  assert.match(command(s, `talent remove ${a.id}`).at(-1).message, /Deeper picks depend/);
  assert.equal(talentPoints(s, 'bastion'), 0, 'each class levels on its own');
  command(s, 'talent reset breaker');
  assert.deepEqual(picksOf(s, 'breaker'), []);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.match(command(s, `talent add ${a.id}`).at(-1).message, /at home/);
});

test('the loadout page: Protocols (stash left, slots right), then Skills and talents, picks locked during a fight', async () => {
  const { loadoutMarkup } = await import('./dist/view.mjs');
  const s = fresh();
  let html = loadoutMarkup(s, 'breaker');
  assert.match(html, /data-ltab="protocols" aria-selected="true">Protocols<.*data-ltab="skills"[^>]*>Skills and talents/s, 'Protocols first, then skills and talents together');
  assert.match(html, /class="loadout-protocols"><section class="card stash-card"><h2>Stash · .*<h2>Protocols · Breaker/s, 'the stash, then the slots and stats');
  assert.match(loadoutMarkup(s, 'operator'), /Protocols belong to the class in use/, 'another class: no protocol slots to change');
  html = loadoutMarkup(s, 'operator', 'skills');
  assert.match(html, /<h1>Operator<\/h1><div class="class-xp"><b>Lv 1<\/b>/, 'level and XP under the class name');
  assert.match(html, /Level 22/, 'later skills show the level they unlock at');
  assert.match(html, /class="ttree"/, 'the tree sits beside the skills');
  assert.match(html, /0 free<\/b> · 0\/\d+ spent · 0 earned/, 'the tree shows its points, no explanation');
  command(s, 'archetype operator');
  command(s, 'developer level 18');
  assert.match(loadoutMarkup(s, 'operator', 'skills'), /data-command="talent operator add [a-z-]+"/);
  assert.match(loadoutMarkup(s, 'operator', 'skills'), /data-command="unequip operator deploy"/);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  html = loadoutMarkup(s, 'operator', 'skills');
  assert.doesNotMatch(html, /data-command="talent/);
  assert.match(html, /At home/);
});

test('levels: each class starts at 1 with Spike and one skill; skills and cantrips unlock by level', async () => {
  const { keyMap, hackerLevel, equippedSkills, knownSkills } = await import('./dist/combat.mjs');
  const s = fresh();
  assert.equal(hackerLevel(s), 1);
  assert.deepEqual(Object.values(keyMap(s)), ['spike', 'overload']);
  command(s, 'developer level 3');
  assert.deepEqual(Object.values(keyMap(s)), ['spike', 'overload', 'flood']);
  command(s, 'developer level 5');
  assert.deepEqual(Object.values(keyMap(s)), ['spike', 'overload', 'flood', 'exploit']);
  command(s, 'developer level 7');
  assert.ok(Object.values(keyMap(s)).includes('crack'), 'Crack, the armor stripper, at level 7');
  // From 10 the subclass's line (the default one until you pick): its skills come at SUBCLASS.unlocks.
  const { SUBCLASS } = await import('./dist/data.mjs');
  const { kitOf } = await import('./dist/combat.mjs');
  command(s, 'developer level 10');
  const line = kitOf(s).skills;
  assert.match(command(s, `equip ${line[1]}`).at(-1).message, new RegExp(`level ${SUBCLASS.unlocks[1]}`));
  command(s, 'developer level 22');
  assert.equal(equippedSkills(s, 'breaker').length, 7, 'bar full by level 22');
  const extra = knownSkills(s, 'breaker').find((id) => !equippedSkills(s, 'breaker').includes(id));
  assert.ok(extra, 'past seven, you choose what to equip');
  assert.match(command(s, `equip ${extra}`).at(-1).message, /slots are full/);
  command(s, `unequip ${line[0]}`); command(s, `equip ${extra}`);
  assert.ok(equippedSkills(s, 'breaker').includes(extra));
  command(s, 'archetype sysadmin');
  assert.equal(hackerLevel(s), 1, 'a new class starts at level 1');
  assert.deepEqual(Object.values(keyMap(s)), ['spike', 'rate-limit']);
});

test('XP: fights, vaults and new locations level you up; the server gets every point, plus banked loot', async () => {
  const { hackerOf } = await import('./dist/combat.mjs');
  const { XP, killXp, xpToNext } = await import('./dist/data.mjs');
  const s = withTemplate('relay');
  const loc = currentLocation(s);
  assert.equal(hackerOf(s).xp, Math.round(killXp(1) * XP.newLocation), 'first run on a location');
  say(s, 'cd relay'); clear(s);
  say(s, `unlock vault ${loc.password}`);
  assert.ok(hackerOf(s).xp > 0 || hackerOf(s).level > 1, 'a guard and a vault give XP');
  say(s, 'pull cache.dat');
  const before = s.serverXp;
  say(s, 'jack out');
  assert.ok(s.serverXp > before, 'banking loot feeds the server');
  const sx = s.serverXp;
  let earned = 0;
  for (let i = 0; i < 4; i++) {
    command(s, 'encounter random'); command(s, 'engage'); s.encounter.queue = null;
    const mark = s.serial;
    finishOff(s, s.encounter.virus.parts.at(-1).id);
    earned += s.logs.filter((e) => e.type === 'xp' && e.id > mark).reduce((n, e) => n + e.amount, 0); // the kill, and a first decode
  }
  assert.equal(s.serverXp - sx, earned, 'every XP a hacker earns, the server earns too');
  assert.ok(xpToNext(18) > 10 * xpToNext(1), 'the climb gets longer');
});

test('intrusions come in at your level; enemies far below you give little XP', async () => {
  const { xpFor } = await import('./dist/combat.mjs');
  const s = fresh();
  command(s, 'encounter random 5');
  const low = s.encounter.virus.threat;
  assert.equal(s.encounter.virus.mutation, null, 'no mutations at level 1');
  s.encounter = null;
  command(s, 'developer level 20');
  command(s, 'encounter random 5');
  assert.ok(s.encounter.virus.threat > low + 5);
  assert.equal(xpFor(s, 10), 0, 'ten levels below: nothing');
  assert.ok(xpFor(s, 23) > xpFor(s, 20), 'above you: a little more');
});

test('saves from before the skill rework start each class on the new kit, and old daemon rules go', async () => {
  const { restore, equippedSkills, knownSkills } = await import('./dist/combat.mjs');
  const s = fresh();
  s.version = 18;
  s.hackers = { breaker: { level: 25, xp: 0 } };
  s.loadout.equipped = { breaker: ['overload', 'sudo', 'pass-the-hash', 'memory-leak', 'bypass'] };
  s.daemons = [{ name: 'warden', trigger: { type: 'attack', part: 'any' }, command: 'interrupt $', on: true }];
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(equippedSkills(r, 'breaker'), knownSkills(r, 'breaker').slice(0, 7), 'the kit as it unlocks, its subclass line included');
  assert.deepEqual(equippedSkills(r, 'breaker').slice(0, 4), ['overload', 'flood', 'exploit', 'crack']);
  assert.deepEqual(r.daemons, []);
  assert.deepEqual(r.daemonsOwned, {});
});

test('Signal boosters are retired: no crafting (top up instead); one you still carry works on a run', () => {
  const s = fresh();
  s.salvage = Array.from({ length: 4 }, () => ({ name: 'Pulse Kernel' }));
  say(s, 'craft booster');
  assert.equal(s.items?.booster || 0, 0, 'nothing crafted');
  assert.equal(s.salvage.length, 4, 'nothing spent');
  s.items = { ...(s.items || {}), booster: 1 };
  say(s, 'connect sprawl');
  s.run.integrity = 5;
  say(s, 'boost');
  assert.equal(s.run.integrity, Math.min(s.run.max, 5 + Math.ceil(s.run.max * CONFIG.booster.restore)));
  assert.equal(s.items.booster, 0);
});

test('top up: pay to fill Signal or the server now; less missing costs less; not on a run', async () => {
  const { topUpCost, topUpPrice, maxSignal } = await import('./dist/combat.mjs');
  const s = fresh();
  s.server.credits = 200; // you start with none
  s.signal = Math.floor(maxSignal(s) / 2);
  const half = topUpCost(s, 'signal');
  assert.ok(half >= 1 && half <= topUpPrice(s, 'signal'));
  s.signal = 0;
  assert.equal(topUpCost(s, 'signal'), topUpPrice(s, 'signal'));
  const credits = s.server.credits;
  say(s, 'top up');
  assert.equal(s.signal, null, 'full again');
  assert.equal(s.server.credits, credits - topUpPrice(s, 'signal'));
  s.server.integrity = s.server.max - 10;
  const c2 = s.server.credits;
  say(s, 'repair');
  assert.equal(s.server.integrity, s.server.max);
  assert.ok(c2 - s.server.credits >= 1 && c2 - s.server.credits < topUpPrice(s, 'server'));
  // Can't afford it all: you get what you can pay for.
  s.signal = 0; s.server.credits = 2;
  say(s, 'top up');
  assert.ok(s.signal > 0 && s.signal < maxSignal(s) && s.server.credits <= 2);
  // On a run it's a booster or a store patch instead.
  s.signal = null;
  say(s, 'connect sprawl');
  s.run.integrity = 10;
  assert.match(say(s, 'top up').at(-1).message, /Top up at home/);
});

test('typos during a guard fight stay on the fight screen, out of the run terminal', async () => {
  const { netTranscript } = await import('./dist/view.mjs');
  const s = fresh();
  say(s, 'connect sprawl');
  say(s, 'cd ' + Object.keys(s.zone.spawns)[0].slice(1));
  say(s, 'attack');
  command(s, 'engage');
  command(s, 'spikefrag2');
  assert.ok(s.logs.some((e) => e.type === 'warning' && e.fight), 'the fight still gets its warning');
  say(s, 'jack out');
  say(s, 'pusle');
  const term = netTranscript(s);
  assert.doesNotMatch(term, /spikefrag2/);
});

test('the run terminal shows one folder at a time; history shows the whole run', async () => {
  const { netTranscript } = await import('./dist/view.mjs');
  const s = fresh();
  say(s, 'connect sprawl');
  say(s, 'cat motd.txt');
  assert.match(netTranscript(s), /SPRAWL-00\. nobody runs this box/);
  const room = Object.keys(s.zone.spawns)[0].slice(1);
  say(s, 'cd ' + room);
  let term = netTranscript(s);
  assert.doesNotMatch(term, /nobody runs this box/, 'the last folder is gone');
  assert.match(term, /data-run="history">earlier</, 'one click brings it back');
  say(s, 'history');
  term = netTranscript(s);
  assert.match(term, /nobody runs this box/);
  assert.doesNotMatch(term, /earlier</);
  say(s, 'cd ..');
  assert.doesNotMatch(netTranscript(s), /nobody runs this box/, 'a new folder starts over');
});

test('did you mean: typos in a fight and on a run suggest the likely command', async () => {
  const { parse } = await import('./dist/combat.mjs');
  const { netTranscript } = await import('./dist/view.mjs');
  const s = fresh();
  (await import('./dist/combat.mjs')).selectEncounter(s, 'splinter', 3, { level: 3 });
  command(s, 'engage');
  assert.equal(parse(s, 'spike pusle').suggest, 'spike pulse');
  assert.equal(parse(s, 'spikepulse').suggest, 'spike pulse');
  assert.equal(parse(s, 'pusle').suggest, 'spike pulse', 'just a part: Spike it');
  assert.equal(parse(s, 'xyzzy').suggest, null, 'no wild guesses');
  command(s, 'spike pusle');
  assert.equal(s.logs.at(-1).suggest, 'spike pulse');
  const t = fresh();
  say(t, 'connect sprawl');
  say(t, 'cat mtod.txt');
  assert.equal(t.logs.at(-1).suggest, 'cat motd.txt');
  assert.match(netTranscript(t), /data-prefill="cat motd.txt"/);
});

test('a fight you win on a run lists the folder again, and the fight carries the file’s name', async () => {
  const { hooks } = await import('./dist/combat.mjs');
  const s = fresh();
  hooks.now = () => 1000;
  say(s, 'connect sprawl');
  say(s, 'cd tmp');
  const file = say(s, 'ls').find((e) => e.type === 'net-ls').entries.find((x) => x.kind === 'virus').name.replace(/\.exe$/, '');
  say(s, 'attack ' + file);
  assert.equal(s.encounter.virus.name, file.toUpperCase());
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  command(s, 'spike ' + s.encounter.virus.parts[0].id); resolveCycle(s);
  const events = (command(s, 'spike ' + s.encounter.virus.parts[1].id), resolveCycle(s));
  const list = events.filter((e) => e.type === 'net-ls').at(-1);
  assert.ok(list, 'the folder is listed again');
  assert.ok(!list.entries.some((x) => x.kind === 'virus'), 'without the virus you just beat');
  hooks.now = null;
});

test('a virus that counts for a contract is marked in the listing; others are not', async () => {
  const { hooks } = await import('./dist/combat.mjs');
  const s = fresh();
  hooks.now = () => 1000;
  s.mail = { ...(s.mail || {}), list: [], offers: [], jobs: [] };
  say(s, 'connect sprawl');
  say(s, 'cd tmp');
  const v = () => say(s, 'ls').find((e) => e.type === 'net-ls').entries.find((x) => x.kind === 'virus');
  assert.equal(v().jobs.length, 0, 'no contract: no marker');
  s.mail.jobs.push({ id: 77, from: 'LOWLIGHT', subject: 'x', type: 'kill', where: 'sprawl', count: 3, got: 0, reward: { credits: 1 } });
  assert.equal(v().jobs.length, 1, 'any SPRAWL-00 kill counts');
  s.mail.jobs[0].got = 3;
  assert.equal(v().jobs.length, 0, 'a finished count stops marking');
  const fam = v().tags[0];
  const other = ['worm', 'ransomware', 'ghostroot'].find((f) => f !== fam);
  s.mail.jobs.push({ id: 78, from: 'Halcyon', subject: 'y', type: 'kill', family: other, count: 2, got: 0, reward: { credits: 1 } });
  assert.equal(v().jobs.length, 0, 'another family does not count');
  hooks.now = null;
});

test('pull all: every file waiting in the folder goes into your pack in one go', () => {
  const s = onRun();
  const loc = currentLocation(s);
  say(s, 'cd relay');
  winFight(s);
  say(s, `unlock vault ${loc.password}`);
  say(s, 'cd vault');
  const waiting = s.run.cwd && say(s, 'ls').find((e) => e.type === 'net-ls').entries.filter((x) => x.pull).length;
  assert.ok(waiting >= 2, 'a vault has several files');
  const before = s.run.pack.length;
  say(s, 'pull all');
  assert.equal(s.run.pack.length - before, waiting);
  assert.ok(!say(s, 'ls').find((e) => e.type === 'net-ls').entries.some((x) => x.pull), 'nothing left to pull');
  assert.match(say(s, 'pull all').at(-1).message, /Nothing here to pull/);
});

test('a server’s file count only counts its own files: dead drops and route files don’t push it past the total', () => {
  const s = located();
  const loc = s.locations[0], files = runMod.takeable(loc);
  loc.state.taken[files[0]] = true;
  loc.state.taken['/var/spool/drop/a.enc'] = true; // a dead drop's file
  loc.state.taken['/ping-h1.trc'] = true; // a relay's route file
  assert.equal(runMod.takenOf(loc), 1);
  for (const f of files) loc.state.taken[f] = true;
  assert.equal(runMod.takenOf(loc), files.length);
});

test('a relay’s pinged neighbours get route files and count kills of their family, contract or not', async () => {
  const { installRelay, items, hiddenNodes, huntKill } = await import('./dist/hidden.mjs');
  const s = located('worm');
  const loc = s.locations[0]; loc.takenOver = true; items(s).relay = 1;
  installRelay(s, loc.id);
  const near = hiddenNodes(s).filter((n) => n.via === loc.id);
  assert.ok(near.length && near.every((n) => n.pinged));
  assert.deepEqual((loc.extraFiles || []).filter((f) => f.kind === 'route').map((f) => f.hidden).sort(), near.map((n) => n.id).sort());
  const n = near[0], was = n.lead;
  huntKill(s, n.family);
  assert.equal(n.lead, was + 12);
});

test('every server but an outpost makes you wait 30 seconds before reconnecting', async () => {
  const { CONFIG } = await import('./dist/data.mjs');
  const s = located();
  const loc = s.locations[0];
  connect(s, loc.id); play(s, 'jack out');
  assert.match(play(s, 'connect ' + loc.id).at(-1).message, /Reconnect in \d+s/);
  assert.equal(s.run, null);
  loc.lockUntil = 0;
  loc.takenOver = true; loc.buildings = ['siphon']; loc.outpost = { stock: {} }; // an outpost: no wait
  connect(s, loc.id); play(s, 'jack out');
  connect(s, loc.id);
  assert.ok(s.run, 'an outpost takes you straight back');
  assert.equal(CONFIG.relockMs, 30000);
});

test('trace: moves, pulls and wrong passwords raise it; at 100 a hunter comes and blocks jack out until beaten', async () => {
  const { TRACE } = await import('./dist/run.mjs');
  const s = onRun();
  const loc = currentLocation(s);
  say(s, 'cd relay');
  assert.equal(s.run.trace, TRACE.cd, 'a move');
  winFight(s);
  const t0 = s.run.trace;
  assert.ok(t0 > TRACE.cd, 'a guard fight is loud');
  say(s, 'unlock vault nope');
  assert.equal(s.run.trace, t0 + TRACE.wrong, 'a wrong password');
  s.run.trace = 100 - TRACE.cd;
  say(s, `unlock vault ${loc.password}`);
  say(s, 'cd vault');
  assert.ok(s.run.hunter && s.encounter?.hunter, 'traced: the hunter is on you');
  say(s, 'jack out');
  assert.ok(s.run, 'no jacking out while hunted');
  winFight(s);
  assert.ok(!s.run.hunter);
  assert.equal(s.run.trace, TRACE.after);
  say(s, 'jack out');
  assert.equal(s.run, null);
  assert.ok(!s.logs.some((e) => e.type === 'clean-job'), 'not clean: you were traced');
});

test('attack <name> matches in any case: attack relay-king finds RELAY-KING.exe', async () => {
  const { KING_ROOM, zoneSpawns } = await import('./dist/run.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 4, xp: 0 } };
  zoneSpawns(s);
  say(s, 'connect sprawl'); say(s, 'cd net'); say(s, 'cd relay');
  assert.equal(s.run.cwd, KING_ROOM);
  say(s, 'attack relay-king');
  assert.ok(s.encounter, 'the fight starts');
  assert.ok(!s.logs.some((e) => /No relay-king here/.test(e.message)));
});

test('protocols: stash items and slots share a data-kind, so hovering an item lights its slot', async () => {
  const { protocolGearMarkup } = await import('./dist/view.mjs');
  const { rollItem } = await import('./dist/gear.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 14, xp: 0 } };
  let seed = 3; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const it = rollItem(rand, { level: 10 }); it.id = 'hv1'; s.stash.push(it);
  const html = protocolGearMarkup(s);
  const kind = html.match(/class="inv-row [^"]*" data-kind="([a-z]+)">/)[1];
  assert.match(html, new RegExp(`<ul class="inv slots">.*data-kind="${kind}"`, 's'));
});
