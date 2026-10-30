// Daemons (daemons.mjs, data.mjs DAEMONS): many and weaker, five bands of eight, an item level each and no versions;
// only invasions drop them (35% your kill, 50% an intercept, 15% the wall, a capture always, with pity); slots 2,
// +1 at 15, 30 and 45, Operators +1; the wall priced in code; and old saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, restore, selectEncounter, part, syncServer, daemonSlots, gainDaemon, daemonLevel } from './dist/combat.mjs';
import { DAEMONS, DAEMON_DROP, DAEMON_BANDS as BANDS, bandDaemons, daemonN, daemonBand, codeUnit, CONFIG, power } from './dist/data.mjs';
import { rollDaemon, daemonText } from './dist/daemons.mjs';
import { tickNetwork, daemonChance, daemonDrop, bountyOf } from './dist/invasion.mjs';
import { tierCost, fwOf, TIERS } from './dist/firewall.mjs';
import { layoutOf, fileInfo } from './dist/run.mjs';
import { GOODS } from './dist/store.mjs';
import { FACTIONS } from './dist/factions.mjs';
import { REWARDS } from './dist/content.mjs';
import { play } from './dist/run.mjs';
import { daemonsMarkup, daemonUi, spoilsOf } from './dist/view.mjs';
import STORY from './dist/content/story.mjs';

CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const MIN = 60000;
const code = (s) => ['cipher', 'worm', 'kernel'].reduce((n, k) => n + (s.materials?.[k] || 0), 0);
const owned = (s) => Object.keys(s.daemonLv || {}).filter((id) => s.daemonLv[id] > 0);

// Two servers at a level, a wall pinned at fw, the clock at 0 (invasion-kinds.test.mjs's world).
function world({ level = 8, fw = 0 } = {}) {
  const s = fresh();
  command(s, 'developer location worm');
  command(s, 'developer location ransomware');
  command(s, 'developer level ' + level); // after the finds, so the level-4 breadcrumb doesn't add a third
  for (const l of s.locations) Object.assign(l, { level, depth: 1, runs: 1 }); // connected: they send invasions
  s.hidden = []; // just the two: no unknown servers behind them (floors.mjs links each to its ?s)
  s.firewall = { pin: fw, plus: 0, frag: 0, defragUntil: 0 };
  syncServer(s);
  s.server.integrity = s.server.max;
  s.clock = 0;
  tickNetwork(s, 0);
  s.net.seq = 1;
  return s;
}
const wait = (s, ms) => { for (let t = 0; t < ms; t += 5000) { s.clock += Math.min(5000, ms - t); tickNetwork(s, s.clock); } };
const invade = (s, kind) => { play(s, 'developer invade ' + kind); if (s.invasion) { s.invasion.mutation = null; for (const u of s.invasion.queue) u.mutation = null; } };
function win(s) {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  const last = s.encounter.virus.parts[0];
  last.integrity = 1;
  command(s, 'spike ' + last.id);
  return resolveCycle(s);
}

test('about forty daemons, eight a band, each one line with its number, a cooldown or a trigger, and no versions', () => {
  const ids = Object.keys(DAEMONS);
  assert.ok(ids.length >= 36 && ids.length <= 44, `${ids.length} daemons`);
  for (let b = 1; b <= BANDS.length; b++) assert.equal(bandDaemons(b).length, 8, `band ${b}`);
  const names = new Set();
  for (const id of ids) {
    const d = DAEMONS[id];
    assert.ok(d.name && !names.has(d.name), `${id}: a name of its own`); names.add(d.name);
    assert.ok(d.rule.includes('{n}') && d.rule.length < 120, `${id}: one line, with its number`);
    assert.ok(!!d.cd !== !!d.on, `${id}: a cooldown or a trigger`);
    assert.ok(d.n > 0 && !('v' in d) && !/\bv[23]\b/.test(d.rule), `${id}: no versions`);
  }
  // The old ten are the first bands, weaker: about half to two thirds of what they were.
  const was = { sweeper: 10, mirror: 12, spider: 4, mender: 8, canary: 15, cron: 8, snapshot: 8 };
  for (const [id, n] of Object.entries(was)) assert.ok(DAEMONS[id].n >= n / 2 && DAEMONS[id].n <= (2 * n) / 3 + 0.01, `${id}: ${DAEMONS[id].n} of ${n}`);
  for (const id of ['sweeper', 'mirror', 'spider', 'mender', 'fuzzer', 'stall', 'canary', 'snapshot']) assert.equal(DAEMONS[id].band, 1);
  for (const id of ['cron', 'watchman']) assert.equal(DAEMONS[id].band, 2);
});

test('item level: a daemon drops at the invasion\'s level and its number grows with it, like a protocol\'s', () => {
  assert.equal(daemonN('sweeper', 1), DAEMONS.sweeper.n);
  assert.equal(daemonN('sweeper', 30), Math.round(DAEMONS.sweeper.n * power(30)));
  assert.ok(daemonN('sweeper', 40) > daemonN('sweeper', 20));
  assert.match(daemonText('mender', 26), new RegExp(`Heals you for ${daemonN('mender', 26)}\\.`));
  // In a fight: the same Sweeper, a higher level, a bigger hit.
  const hitAt = (L) => {
    const s = fresh();
    s.hackers = { breaker: { level: 30, xp: 0 } };
    gainDaemon(s, 'sweeper', L); s.daemons = ['sweeper'];
    selectEncounter(s, 'cryptjack', 7, { level: 30 });
    command(s, 'engage');
    for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null, integrity: 900, max: 900, attack: null });
    part(s, 'pulse').attack = { name: 'x', effect: 'damage', amount: 0, interval: 99, due: 99 };
    command(s, 'hold'); resolveCycle(s);
    return 900 - part(s, 'pulse').integrity;
  };
  assert.ok(hitAt(30) > hitAt(10), `${hitAt(30)} > ${hitAt(10)}`);
});

test('one copy each: a better one replaces yours, a duplicate or a lower one scraps for code', () => {
  const s = fresh();
  assert.equal(gainDaemon(s, 'drill', 20, { family: 'worm' }), 'new');
  assert.equal(daemonLevel(s, 'drill'), 20);
  const w0 = s.materials.worm || 0;
  assert.equal(gainDaemon(s, 'drill', 18, { family: 'worm' }), 'scrap');
  assert.equal(daemonLevel(s, 'drill'), 20, 'yours stays');
  assert.equal(s.materials.worm - w0, codeUnit(18), 'the lower copy: a unit of its family\'s code at its level');
  assert.equal(gainDaemon(s, 'drill', 20, { family: 'worm' }), 'scrap', 'the same level: a duplicate');
  assert.equal(gainDaemon(s, 'drill', 24, { family: 'ransomware' }), 'better');
  assert.equal(daemonLevel(s, 'drill'), 24);
  assert.ok(s.materials.cipher >= codeUnit(20), 'the old copy scraps');
  s.daemons = ['drill', 'drill'];
  command(s, 'daemon slot drill');
  assert.match(s.logs.at(-1).message, /already slotted/, 'one copy of a daemon slotted at a time');
});

test('slots: 2 at the start, +1 at 15, 30 and 45; Operators +1', () => {
  const at = (L, cls = 'breaker') => { const s = fresh(); s.loadout.archetype = cls; s.hackers = { [cls]: { level: L, xp: 0 } }; return daemonSlots(s); };
  assert.deepEqual([1, 14, 15, 29, 30, 44, 45, 50].map((L) => at(L)), [2, 2, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual([1, 15, 45].map((L) => at(L, 'operator')), [3, 4, 6]);
});

test('band pools: an invasion drops its band\'s daemons, now and then an earlier band\'s, never a later one\'s', () => {
  const s = fresh();
  s.rng = 12345;
  for (let i = 0; i < 200; i++) assert.equal(DAEMONS[rollDaemon(s, 5)].band, 1, 'band 1 has nothing earlier');
  const bands = Array.from({ length: 2000 }, () => DAEMONS[rollDaemon(s, 42)].band);
  assert.equal(daemonBand(42), 5);
  assert.ok(bands.every((b) => b <= 5));
  const own = bands.filter((b) => b === 5).length / bands.length;
  assert.ok(Math.abs(own - (1 - DAEMON_DROP.earlier)) < 0.04, `its own band ${Math.round(own * 100)}%`);
  for (let b = 1; b < 5; b++) assert.ok(bands.includes(b), `band ${b} sometimes`);
  assert.equal(daemonBand(7), 2); assert.equal(daemonBand(16), 3); assert.equal(daemonBand(26), 4); assert.equal(daemonBand(38), 5);
  const mid = Array.from({ length: 500 }, () => DAEMONS[rollDaemon(s, 20)].band);
  assert.ok(mid.every((b) => b <= 3) && mid.filter((b) => b === 3).length > 300);
});

test('drop odds by how it was stopped: your kill 35%, an intercept 50%, the wall 15%, a capture always; each miss raises the next', () => {
  const s = fresh();
  assert.equal(daemonChance(s, 'you'), 0.35);
  assert.equal(daemonChance(s, 'intercept'), 0.5);
  assert.equal(daemonChance(s, 'wall'), 0.15);
  assert.equal(daemonChance(s, 'capture'), 1);
  // Bad-luck protection: a miss raises the next chance, a drop resets it.
  s.rng = 7;
  const inv = { level: 12, family: 'worm' };
  let misses = 0;
  while (!daemonDrop(s, inv, 'wall')) { misses++; assert.equal(s.pity.daemon, misses); assert.ok(daemonChance(s, 'wall') > 0.15); }
  assert.equal(s.pity.daemon, 0, 'reset by a drop');
  assert.equal(owned(s).length, 1);
  assert.equal(daemonLevel(s, owned(s)[0]), 12, 'at the invasion\'s level');
  // Over many stops at the wall, about one in five leaves one (15% and the pity); never a long dry run.
  const t = fresh(); t.rng = 99;
  let got = 0, dry = 0, worst = 0;
  for (let i = 0; i < 600; i++) { if (daemonDrop(t, inv, 'wall')) { got++; worst = Math.max(worst, dry); dry = 0; } else dry++; }
  assert.ok(got / 600 > 0.18 && got / 600 < 0.3, `${got} in 600`);
  assert.ok(worst <= 17, `at most ${worst} misses in a row: 15% + 5% a miss reaches 100% by 17`);
});

test('the wall: a block rolls 15% for a daemon; your kill 35%; a champion always leaves one, at its level', () => {
  const s = world({ fw: 40 });
  s.pity = { daemon: 99 }; // a sure roll, to see where it lands
  s.net.next = 0;
  wait(s, 5000 + 5 * MIN);
  assert.equal(s.invasion, null, 'stopped at the wall');
  assert.equal(owned(s).length, 1, 'a block can leave a daemon');
  assert.equal(daemonLevel(s, owned(s)[0]), 8);
  const c = world();
  invade(c, 'champion');
  assert.ok(bountyOf(c).capture);
  play(c, 'jack in');
  const ev = win(c);
  const drop = ev.find((e) => e.type === 'drop' && e.daemon);
  assert.ok(drop && /leaves a capture/.test(drop.message), 'a champion leaves a sure daemon');
  assert.equal(drop.level, 9, 'at its level (a level over its server)');
  assert.equal(c.pity.daemon || 0, 0);
  // The win card shows it: its name, level and line.
  const row = spoilsOf(ev).find((r) => r.kind === 'daemon');
  assert.ok(row && row.label === `${DAEMONS[drop.daemon].name} lv 9` && row.sub === daemonText(drop.daemon, 9), JSON.stringify(row));
  // The code bounty rides on the same card.
  assert.ok(spoilsOf(ev).some((r) => r.kind === 'code' && /code/.test(r.label)));
});

test('only invasions drop daemons: no vault daemon.exe, no kill or guard drops, no shop, agency or contract daemons', () => {
  // Vaults: what held daemon.exe holds backup.bin, a second code cache.
  let backups = 0;
  for (let seed = 1; seed < 300; seed++) {
    const loc = { id: 'x' + seed, seed, level: 10, depth: 1, family: 'worm', template: 'relay', password: 'pass-' + seed, owner: 'ops', deeper: 'ransomware', state: { cleared: {}, unlocked: {}, taken: {} } };
    const lay = layoutOf(loc), files = Object.values(lay).flatMap((d) => d.files || []);
    assert.ok(!files.includes('daemon.exe'));
    if (files.includes('backup.bin')) { backups++; const v = Object.keys(lay).find((k) => lay[k].files.includes('backup.bin')); assert.equal(fileInfo(loc, v, 'backup.bin').kind, 'code'); }
  }
  assert.ok(backups > 10, `${backups} vaults hold a backup cache`);
  // Kills: hundreds of them, no daemon.
  const s = fresh();
  s.hackers = { breaker: { level: 20, xp: 0 } };
  for (let i = 0; i < 300; i++) {
    selectEncounter(s, 'random', i + 1, { level: 20 });
    command(s, 'engage');
    win(s);
    if (active(s)) break;
  }
  assert.equal(owned(s).length, 0, 'home kills drop none');
  // Shops, the agencies' stock and contracts.
  assert.ok(!GOODS.daemon, 'no daemon image in the agency stock');
  for (const f of Object.values(FACTIONS)) assert.ok(!f.shop.includes('daemon'), `${f.name} sells none`);
  assert.ok(!('daemon' in REWARDS), 'a contract cannot pay one');
  assert.ok(!JSON.stringify(STORY).includes('"daemon"'), 'nor can the storyline');
});

test('the wall is priced in code: tiers from +3, in units of what invasions pay; no signatures anywhere', () => {
  const B = 12, u = codeUnit(B);
  for (let t = 1; t <= TIERS; t++) assert.equal(tierCost(t, B).sigs, undefined);
  assert.equal(tierCost(4, B).worm - Math.ceil(4 * (1 + B / 10)), 2 * u, '+4: two units more of each code');
  const all = Array.from({ length: TIERS }, (_, i) => tierCost(i + 1, B)).reduce((n, c) => n + c.cipher + c.worm + c.kernel, 0);
  const raider = { kind: 'raider', bounty: 2, level: B + 2, family: 'worm' };
  const per = bountyOf(fresh(), raider).now;
  assert.ok(all / per > 25, `a full wall is a long code goal: ${all} code, ${Math.round(all / per)} raiders' bounties`);
  const s = fresh();
  fwOf(s).pin = B;
  assert.equal(s.sigs, undefined, 'a new save has none');
});

test('the Daemons tab: your party and its slots, the bench, and every daemon on the roster with ??? for the unfound', () => {
  const s = fresh();
  gainDaemon(s, 'sweeper', 6); gainDaemon(s, 'drill', 18);
  s.daemons = ['drill'];
  Object.assign(daemonUi, { view: 'party', sel: null, cycle: 1 });
  const html = daemonsMarkup(s);
  assert.match(html, /Party<small>1\/2<\/small>/);
  assert.match(html, /data-dmn-sel="drill"[^>]*>[\s\S]*?<b>Drill<\/b><small>Lv 18 · /);
  assert.match(html, /<aside class="dm-panel" aria-label="Drill">[\s\S]*<p class="dm-does">/, 'with nothing picked, the panel shows the first of your party');
  assert.ok(html.slice(html.indexOf('<p class="dm-does">')).replace(/<[^>]+>/g, '').startsWith(daemonText('drill', 18)), 'what it does at its level');
  assert.match(html, /Slot 3 · level 15/, 'another slot at level 15');
  assert.match(html, /aria-label="Bench"[\s\S]*data-dmn-sel="sweeper"/);
  daemonUi.view = 'roster';
  const roster = daemonsMarkup(s);
  assert.match(roster, /Levels 1–6<small>1\/8<\/small>/);
  assert.match(roster, /Levels 16–25<small>1\/8<\/small>/);
  assert.equal((roster.match(/<span class="dm-rn">\?\?\?<\/span>/g) || []).length, Object.keys(DAEMONS).length - 2, 'the rest are ???');
  assert.ok(!roster.includes('Breakpoint'), 'an undiscovered daemon keeps its name');
  daemonUi.view = 'party';
});

test('in a fight: the Airbag shields at the start, the Breakpoint lands on a cut, the Lifeline holds you at 1, the Leash slows an Exfil', () => {
  const setup = (id, L = 20) => {
    const s = fresh();
    s.hackers = { breaker: { level: L, xp: 0 } }; s.loadout.sub = { breaker: 'demolitionist' };
    gainDaemon(s, id, L); s.daemons = [id];
    selectEncounter(s, 'cryptjack', 7, { level: L });
    return s;
  };
  const a = setup('airbag');
  command(a, 'engage');
  assert.equal(a.encounter.shield, daemonN('airbag', 20));
  // Lifeline: a hit that would take you to 0 leaves you at 1, then it heals.
  const l = setup('lifeline');
  command(l, 'engage');
  l.server.integrity = 10;
  for (const p of l.encounter.virus.parts) if (p.attack) { p.attack.amount = 500; p.attack.due = l.encounter.cycle; p.attack.tell = null; }
  l.encounter.virus.tells = null;
  command(l, 'hold'); resolveCycle(l);
  assert.ok(l.logs.some((e) => /Lifeline: holds you at 1/.test(e.message)), 'held');
  assert.ok(l.logs.some((e) => e.type === 'heal' && /Lifeline/.test(e.message)), 'and healed');
  // Leash: only in an Exfil fight, a cycle more on the upload.
  const x = setup('leash');
  x.encounter.objective = { kind: 'exfil', n: 6 }; x.encounter.rooms = { size: 'exfil' };
  command(x, 'engage');
  assert.equal(x.encounter.objective.n, 7);
  // Daemons never set off daemons: a Domino's hit that breaks a part doesn't set off another Domino.
  const m = setup('domino');
  command(m, 'engage');
  for (const p of m.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 1, max: 100, attack: p.attack ? { ...p.attack, due: 99 } : null });
  m.encounter.virus.tells = null;
  command(m, 'spike ' + m.encounter.virus.parts[0].id); resolveCycle(m);
  assert.ok(m.logs.filter((e) => /^Domino:/.test(e.message)).length <= 1, 'one Domino for your break');
});

test('old saves: versioned daemons become levels from their version and yours; signatures become code; slots follow the new rule', () => {
  const old = fresh();
  old.hackers = { breaker: { level: 20, xp: 0 } };
  delete old.daemonLv;
  old.daemonsOwned = { sweeper: 1, cron: 3, watchman: 2, tracer: 1 };
  old.daemons = ['cron', 'sweeper'];
  old.sigs = 10;
  old.materials = { cipher: 0, worm: 0, kernel: 0, exploit: 0 };
  command(old, 'developer location worm');
  Object.assign(old.locations[0], { level: 14, runs: 1 }); // connected: the wall's base follows it
  const r = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(r.daemonsOwned, undefined, 'the old field is gone');
  assert.deepEqual(r.daemonLv, { sweeper: 16, cron: 20, watchman: 18, stall: 16 }, 'v3 your level, v2 two under, v1 four under (the Tracer was the Stall)');
  assert.deepEqual(r.daemons, ['cron', 'sweeper'], 'slotted ones stay slotted');
  assert.equal(daemonSlots(r), 3, 'a level-20 save: 2, +1 at 15');
  assert.equal(r.sigs, undefined, 'no signatures');
  const each = Math.ceil((10 * codeUnit(14 - 2)) / 3);
  assert.deepEqual([r.materials.cipher, r.materials.worm, r.materials.kernel], [each, each, each], 'ten signatures: ten units of code at the wall\'s base, split three ways');
  assert.ok(r.logs.some((e) => /Signatures are gone/.test(e.message)));
  assert.ok(r.logs.some((e) => /levels now, not versions/.test(e.message)));
});
