// Invasions, fewer and bigger (invasion.mjs): the pacing, the kinds and their warnings, the bounty in code that
// grows while it sits at HOME, the streak, captures (a sure daemon) and the invasion-only uniques.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, restore, syncServer, uniqueFrom, UNIQUES, SAVE_VERSION, endInvasion } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork, KINDS, BOUNTY, STREAK, CHAMPION, QUIRKED, AWAY, bountyOf, tellOf, capture, captureChance, invasionUniques, streakMult } from './dist/invasion.mjs';
import { CONFIG, ELITE, codeUnit } from './dist/data.mjs';
import { logComms } from './dist/comms.mjs';
import { threatsOf } from './dist/view.mjs';

CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const MIN = 60000;
const I = CONFIG.invasion;
const code = (s) => ['cipher', 'worm', 'kernel'].reduce((n, k) => n + (s.materials?.[k] || 0), 0);
const bountyPaid = (s) => s.logs.filter((e) => /^Bounty: \+/.test(e.message)).reduce((n, e) => n + Object.values(e.gains).reduce((a, b) => a + b, 0), 0);

// Two found servers (a worm and a ransomware one) at a level, the clock at 0.
// The network has already sent one, so what comes next can be any kind.
function world({ level = 8, services = { raid: 1 } } = {}) {
  const s = fresh();
  command(s, 'developer location worm');
  command(s, 'developer location ransomware');
  command(s, 'developer level ' + level); // after the finds, so the level-4 breadcrumb doesn't add a third
  for (const l of s.locations) Object.assign(l, { level, depth: 1, runs: 1 }); // connected: they send invasions
  s.hidden = []; // just the two: no unknown servers behind them (floors.mjs links each to its ?s)
  s.services = { ...services };
  syncServer(s);
  s.server.integrity = s.server.max;
  s.clock = 0;
  tickNetwork(s, 0);
  s.net.seq = 1;
  return s;
}
function wait(s, ms) {
  const out = [];
  for (let t = 0; t < ms; t += 5000) { s.clock += Math.min(5000, ms - t); out.push(...tickNetwork(s, s.clock)); }
  return out;
}
// One invasion of a kind, at HOME now. Plain: no mutation, no quirk.
function invade(s, kind) {
  const ev = play(s, 'developer invade ' + kind);
  if (s.invasion && kind !== 'hoard') { s.invasion.mutation = null; for (const u of s.invasion.queue) u.mutation = null; }
  return ev;
}
// Win the fight you're in, in one cycle.
function win(s) {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  const last = s.encounter.virus.parts[0];
  last.integrity = 1;
  command(s, 'spike ' + last.id);
  return resolveCycle(s);
}

// Whatever reaches HOME, gone at once (as if you'd killed it): the clock for the next one starts.
function clear(s) { if (s.invasion && s.invasion.state !== 'travel') endInvasion(s, null); }

test('pacing: the first a few minutes after your first find, then one every 20-30 minutes online; away 2-4 hours', () => {
  assert.deepEqual(I.everyMs, [20 * MIN, 30 * MIN]);
  assert.equal(I.firstMs, 3 * MIN);
  assert.deepEqual(AWAY.everyMs, [2 * 3600000, 4 * 3600000]);
  const s = world();
  s.net.next = 0;
  wait(s, 5000 + 2 * MIN + 5000);
  clear(s);
  assert.ok(s.net.next >= 20 * MIN && s.net.next <= 30 * MIN, `the next in 20-30 minutes (${s.net.next / MIN})`);
  // Over five logged-on hours, each one stopped as it arrives: about 10-15 of them.
  const n0 = s.logs.filter((e) => e.type === 'invader').length;
  for (let m = 0; m < 5 * 60; m++) { wait(s, MIN); clear(s); }
  const n = s.logs.filter((e) => e.type === 'invader').length - n0;
  assert.ok(n >= 9 && n <= 15, `${n} in five hours`);
});

test('every invasion asks for you: an alert on the pager when it sets out and when it reaches HOME', () => {
  const s = world({ level: 1 });
  s.net.next = 0;
  const ev = wait(s, 5000 + 6 * MIN);
  assert.ok(ev.some((e) => e.type === 'wall-breach'), 'even a level-1 one reaches HOME');
  assert.ok(!ev.some((e) => e.type === 'invasion-cleared'), 'nothing stops it on its own');
  assert.ok(logComms(s, ev.filter((e) => e.type === 'wall-breach')).some((c) => c.alert && c.beep && c.from === 'HOME'));
});

test('the bounty grows while it sits at HOME, up to triple', () => {
  const s = world();
  invade(s, 'raider');
  const inv = s.invasion, base = inv.bounty, u = codeUnit(inv.level);
  assert.equal(inv.state, 'breach');
  assert.equal(bountyOf(s).code, inv.family === 'worm' ? 'worm' : 'cipher', 'its family\'s code');
  assert.equal(bountyOf(s).now, base * u, 'a unit of code at its level for each point');
  assert.equal(bountyOf(s).max, base * (1 + BOUNTY.cap) * u, 'visible before the fight: what it can grow to');
  wait(s, 4 * MIN);
  assert.equal(bountyOf(s).now, (base + Math.floor(base * BOUNTY.grow * 4)) * u, 'a quarter of the base a minute');
  wait(s, 20 * MIN);
  assert.equal(bountyOf(s).now, base * (1 + BOUNTY.cap) * u, 'capped');
  play(s, 'jack in');
  win(s);
  assert.equal(bountyPaid(s), base * (1 + BOUNTY.cap) * u, 'paid on your kill');
});

test('the streak: each stop in a row pays 10% more (up to 50%), leaves no capture, and a chip to 1 leaves it be', () => {
  const s = world();
  const caps = () => s.logs.filter((e) => /capture/i.test(e.message || '')).length;
  for (let i = 0; i < 10; i++) { invade(s, 'raider'); s.invasion.queue = []; play(s, 'jack in'); win(s); } // (no brood: one fight each)
  assert.equal(s.net.streak, 10);
  assert.equal(caps(), 0, 'stops in a row no longer leave a capture (invasions supply daemons already)');
  assert.equal(STREAK.capture, undefined);
  assert.equal(streakMult(s), 1 + STREAK.step * STREAK.max, '+50% at most');
  // It chips you to 1 and no further: nothing crashes, and the streak stands.
  invade(s, 'raider');
  s.server.integrity = 1;
  wait(s, 2 * MIN);
  assert.equal(s.server.integrity, 1);
  assert.equal(s.net.streak, 10);
});

test('a pack: three, one fight each, the bounty at the end', () => {
  const s = world();
  invade(s, 'pack');
  const inv = s.invasion;
  assert.equal(inv.kind, 'pack');
  assert.equal(inv.queue.length, KINDS.pack.size - 1);
  assert.match(tellOf(s), /pack of 3/);
  const bounty = inv.bounty;
  for (let i = 0; i < 2; i++) { play(s, 'jack in'); win(s); assert.equal(s.invasion, inv, 'the next steps up'); }
  assert.equal(bountyPaid(s), 0, 'nothing paid yet');
  play(s, 'jack in');
  win(s);
  assert.equal(s.invasion, null);
  assert.ok(bountyPaid(s) >= bounty * codeUnit(8));
});

test('a pair: two viruses from two of your servers, arriving together', () => {
  const s = world();
  invade(s, 'pair');
  const inv = s.invasion;
  assert.equal(inv.queue.length, 1);
  assert.notEqual(inv.queue[0].family, inv.family, 'one from each server');
  const second = inv.queue[0].family;
  play(s, 'jack in'); win(s);
  assert.equal(s.invasion.family, second, 'the other one steps up');
  play(s, 'jack in'); win(s);
  assert.equal(s.invasion, null);
});

test('a champion: elite-grade (the tells for elites apply), a level over its server, sized for one, and a capture (a sure daemon)', () => {
  const s = world();
  invade(s, 'champion');
  const inv = s.invasion;
  assert.equal(inv.level, 8 + KINDS.champion.lvl);
  assert.match(inv.name, /^CHAMPION /);
  assert.ok(bountyOf(s).capture, 'the capture shows before the fight');
  play(s, 'jack in');
  const v = s.encounter.virus;
  assert.ok(v.elite && v.champion, 'elite-grade, marked as a champion');
  assert.ok(CHAMPION.hp <= ELITE.hp, 'no bigger than an elite');
  const ev = win(s);
  assert.ok(ev.some((e) => e.daemon && /leaves a capture/.test(e.message)));
  assert.equal(Object.keys(s.daemonLv).length, 1, 'a daemon, every time');
  assert.equal(Object.values(s.daemonLv)[0], inv.level, 'at the champion\'s level');
});

test('no saboteur since R2: no services to shut off; asked for, one comes as a raider; scouts and thieves are gone', () => {
  const s = world();
  invade(s, 'saboteur');
  assert.equal(s.invasion.kind, 'raider', 'nothing to shut off');
  assert.ok(!s.logs.some((e) => e.type === 'sabotage'));
  assert.equal(KINDS.scout, undefined);
  assert.equal(KINDS.thief, undefined);
});

test('quirks: a Hoard invasion is Armored and pays half again; a Nest one brings a brood', () => {
  const s = world();
  invade(s, 'hoard');
  assert.equal(s.invasion.mutation, 'armored');
  assert.equal(s.invasion.bounty, Math.round(KINDS.raider.bounty * QUIRKED.hoard));
  const n = world();
  invade(n, 'nest');
  assert.equal(n.invasion.queue.length, 1, 'one more behind it');
});

test('away: invasions keep coming while you are logged off', () => {
  const s = world();
  const T0 = 1_800_000_000_000;
  s.net.wall = T0;
  tickNetwork(s, T0 + 48 * 3600000);
  const kinds = s.logs.filter((e) => e.type === 'invader').map((e) => e.message);
  assert.ok(kinds.length >= 1);
});

test('captures: an invasion-only unique, with pity; never anywhere else', () => {
  assert.equal(invasionUniques().length, 3);
  for (const u of invasionUniques()) assert.ok(u.sources.every((x) => x.kind === 'invasion'));
  const s = world({ level: 30 });
  s.pity = { invasion: 0 };
  const c0 = captureChance(s);
  s.rng = 1;
  let uniques = 0;
  for (let i = 0; i < 60; i++) { const it = capture(s, 30, 'Test: '); if (it?.unique) uniques++; }
  assert.ok(uniques >= 6, `a few uniques (${uniques})`);
  s.pity.invasion = 3;
  assert.ok(captureChance(s) > c0, 'pity raises the chance');
  // The world's drop tables never give them.
  for (const kind of ['sprawl', 'vault', 'guard', 'rogue', 'home']) for (let i = 0; i < 200; i++) assert.ok(!invasionUniques().some((u) => u.id === uniqueFrom(s, { kind }, 30)?.id));
});

test('invasions: lists what is coming, what it does and what it pays', () => {
  const s = world();
  invade(s, 'champion');
  const out = play(s, 'invasions').map((e) => e.message).join('\n');
  assert.match(out, /Champion: CHAMPION/);
  assert.match(out, /Kill it for \d+ (Cipher|Worm) code/);
  assert.match(out, /daemon comes with your kill/);
  assert.match(out, /Streak 0/);
  assert.equal(threatsOf(s)[0].sel, 'invader');
});

test('saves from v32 load with their invasion as a raider, and nothing of signatures', () => {
  const s = world();
  invade(s, 'raider');
  const old = JSON.parse(JSON.stringify(s));
  old.version = 32;
  for (const k of ['kind', 'queue', 'size', 'bounty', 'grown', 'push', 'quiet', 'cracked']) delete old.invasion[k];
  delete old.sigs;
  const r = restore(old);
  assert.equal(r.version, SAVE_VERSION);
  assert.ok(SAVE_VERSION >= 33);
  assert.equal(r.invasion.kind, 'raider');
  assert.deepEqual(r.invasion.queue, []);
  assert.equal(r.invasion.bounty, KINDS.raider.bounty);
  assert.equal(r.sigs, undefined, 'signatures are gone');
});

test('the firewall is gone: an old save gets its tiers back as credits and code, its filters as components; safe to run twice', () => {
  const s = world({ level: 12 });
  invade(s, 'raider');
  const old = JSON.parse(JSON.stringify(s));
  old.firewall = { plus: 2, frag: 3, defragUntil: 0 };
  old.filters = { held: [{ kind: 'filter', rarity: 'tuned', level: 10, name: 'Packet Filter', stats: { strength: 2 } }, { kind: 'filter', rarity: 'custom', level: 10, name: 'Deep Filter of Tar', stats: { strength: 3, tarpit: 20 } }], on: [0] };
  Object.assign(old.invasion, { kind: 'scout', state: 'watch', mapLeft: MIN, push: 5 });
  old.net.mark = 3;
  const credits = old.server.credits, comps = old.components || 0;
  const r = restore(old);
  assert.equal(r.firewall, undefined);
  assert.equal(r.filters, undefined);
  assert.equal(r.server.credits, credits + (25 + 6 * 10) * 1 + (25 + 6 * 10) * 2, 'tiers +1 and +2 at a base of 10');
  assert.equal(r.components, comps + 2 + 3, 'a Tuned and a Custom filter, scrapped');
  assert.equal(r.invasion.kind, 'raider');
  assert.equal(r.invasion.state, 'breach');
  assert.equal(r.invasion.push, undefined);
  assert.equal(r.net.mark, undefined);
  const again = restore(JSON.parse(JSON.stringify(r)));
  assert.equal(again.server.credits, r.server.credits, 'once');
  assert.equal(again.components, r.components);
});
