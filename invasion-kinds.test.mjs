// Invasions, fewer and bigger (invasion.mjs): the pacing, the kinds and their warnings, the silent
// block, signatures (the wall's currency), the bounty that grows while contested, the streak,
// captures and the invasion-only uniques, and the lighter upkeep.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, restore, syncServer, uniqueFrom, UNIQUES, SAVE_VERSION } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork, KINDS, BOUNTY, STREAK, SCOUT, THIEF, CHAMPION, PACK_PUSH, QUIRKED, AWAY, bountyOf, tellOf, pushOf, ratioOf, outcome, capture, captureChance, invasionUniques, streakMult } from './dist/invasion.mjs';
import { CONFIG, ELITE } from './dist/data.mjs';
import { fwOf } from './dist/firewall.mjs';
import { vaultFilter, filtersOf } from './dist/filters.mjs';
import { logComms } from './dist/comms.mjs';
import { invaderStatus, wallMarkup, threatsOf } from './dist/view.mjs';

CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const MIN = 60000;
const I = CONFIG.invasion;

// Two found servers (a worm and a ransomware one) at a level, a firewall level, the clock at 0.
// The network has already sent one, so what comes next can be any kind.
function world({ level = 8, fw = 0, services = { raid: 1, firewall: 1 } } = {}) {
  const s = fresh();
  command(s, 'developer level ' + level);
  command(s, 'developer location worm');
  command(s, 'developer location ransomware');
  for (const l of s.locations) Object.assign(l, { level, depth: 1 });
  s.services = { ...services };
  s.firewall = { pin: fw, plus: 0, frag: 0, defragUntil: 0, hardenUntil: 0 };
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
// One invasion of a kind, at the wall now (a thief only sets out). Plain: no mutation, no quirk.
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
const outpost = (s) => {
  const o = s.locations[0];
  o.takenOver = true;
  command(s, `developer outpost ${o.id}`);
  o.outpost.stock = { code: 6, credits: 80 };
  return o;
};

test('pacing: the first a few minutes after your first find, then one every 20-30 minutes online; open ports 8-12; away 2-4 hours', () => {
  assert.deepEqual(I.everyMs, [20 * MIN, 30 * MIN]);
  assert.equal(I.firstMs, 3 * MIN);
  assert.deepEqual(AWAY.everyMs, [2 * 3600000, 4 * 3600000]);
  const s = world({ fw: 40 });
  s.net.next = 0;
  wait(s, 5000 + 2 * MIN + 5000); // out, and stopped quietly at a strong wall
  assert.equal(s.invasion, null);
  assert.ok(s.net.next >= 20 * MIN && s.net.next <= 30 * MIN, `the next in 20-30 minutes (${s.net.next / MIN})`);
  // Over five logged-on hours with a wall that stops everything: about 10-15 of them.
  const n0 = s.logs.filter((e) => e.type === 'invader').length;
  wait(s, 5 * 60 * MIN);
  const n = s.logs.filter((e) => e.type === 'invader').length - n0;
  assert.ok(n >= 9 && n <= 15, `${n} in five hours`);
  command(s, 'open ports');
  assert.ok(s.net.next <= 30 * MIN * I.open.pace, 'open ports: 8-12 minutes');
});

test('the wall handles weak invasions quietly: no alert, no beep, a pager entry and a little pay', () => {
  const s = world({ fw: 30 });
  s.net.next = 0;
  const ev = wait(s, 5000 + 6 * MIN);
  const out = ev.find((e) => e.type === 'invader'), done = ev.find((e) => e.type === 'invasion-cleared');
  assert.ok(out.quiet, 'it sets out quietly');
  assert.match(out.message, /will stop it/);
  assert.ok(done.quiet && done.blocked, 'and is stopped quietly');
  assert.ok(!ev.some((e) => ['wall-siege', 'wall-breach', 'wall-scout', 'sabotage'].includes(e.type)), 'nothing asks for you');
  const comms = logComms(s, ev).filter((c) => c.from === 'Wall');
  assert.ok(comms.length >= 1 && comms.every((c) => !c.beep && !c.alert), 'pager entries, without a beep');
  assert.ok(comms.some((c) => c.label === 'Blocked'));
  assert.ok(s.sigs >= 1, 'a block pays signatures');
  assert.equal(s.net.streak, 1, 'and counts toward the streak');
  assert.equal(fwOf(s).frag, 0, 'and fragments nothing');
  // One that gets through is loud: an alert on the pager.
  const t = world({ fw: 0 });
  invade(t, 'raider');
  const loud = t.logs.filter((e) => ['invader', 'wall-breach'].includes(e.type));
  assert.ok(loud.every((e) => !e.quiet));
  assert.ok(logComms(t, loud).some((c) => c.alert && c.beep), 'a breach asks for your attention');
});

test('the bounty grows while it sits contested, up to triple, and the growth is yours only if you kill it', () => {
  const s = world();
  invade(s, 'raider');
  const inv = s.invasion, base = inv.bounty;
  assert.equal(inv.state, 'breach');
  assert.equal(bountyOf(s).now, base);
  assert.equal(bountyOf(s).max, base * (1 + BOUNTY.cap), 'visible before the fight: what it can grow to');
  wait(s, 4 * MIN);
  assert.equal(bountyOf(s).now, base + Math.floor(base * BOUNTY.grow * 4), 'a quarter of the base a minute');
  wait(s, 20 * MIN);
  assert.equal(bountyOf(s).now, base * (1 + BOUNTY.cap), 'capped');
  play(s, 'jack in');
  const before = s.sigs || 0;
  win(s);
  assert.equal(s.sigs - before, base * (1 + BOUNTY.cap), 'paid on your kill');
  // The wall wearing one down pays only the base: no growth.
  const w = world({ level: 6, fw: 1 });
  invade(w, 'raider');
  assert.equal(w.invasion.state, 'siege');
  const b = w.invasion.bounty;
  wait(w, 15 * MIN);
  assert.equal(w.invasion, null, 'ground down');
  assert.equal(w.sigs, b, 'the base, nothing grown');
});

test('the streak: each stop in a row pays 10% more (up to 50%), every fifth drops a capture, a crash ends it', () => {
  const s = world({ fw: 40 });
  const items = () => (s.stash || []).length + filtersOf(s).length;
  const got = [];
  for (let i = 0; i < STREAK.capture; i++) {
    const had = items();
    s.net.next = 0;
    wait(s, 5000);
    for (let t = 0; t < 20 && s.invasion; t++) wait(s, MIN);
    got.push(items() - had);
  }
  assert.equal(s.net.streak, 5);
  assert.deepEqual(got.slice(0, 4), [0, 0, 0, 0]);
  assert.equal(got[4], 1, 'the fifth in a row leaves a capture');
  assert.equal(streakMult(s), 1 + STREAK.step * STREAK.max, '+50% at most');
  // A breach that crashes you ends it.
  s.firewall.pin = 0;
  invade(s, 'raider');
  s.server.integrity = 1;
  wait(s, 2 * MIN);
  assert.ok(s.degraded);
  assert.equal(s.net.streak, 0);
  assert.ok(s.logs.some((e) => /streak of 5 ended/.test(e.message)));
});

test('a pack: three that count 4 levels higher at the wall until it thins; one fight each, the bounty at the end', () => {
  const s = world();
  invade(s, 'pack');
  const inv = s.invasion;
  assert.equal(inv.kind, 'pack');
  assert.equal(inv.queue.length, KINDS.pack.size - 1);
  assert.equal(pushOf(inv), PACK_PUSH * 2);
  assert.match(tellOf(s), /pack of 3/);
  const bounty = inv.bounty;
  for (let i = 0; i < 2; i++) { play(s, 'jack in'); win(s); assert.equal(s.invasion, inv, 'the next steps up'); }
  assert.equal(pushOf(inv), 0, 'the last one alone');
  assert.equal(s.sigs || 0, 0, 'nothing paid yet');
  play(s, 'jack in');
  win(s);
  assert.equal(s.invasion, null);
  assert.ok(s.sigs >= bounty);
});

test('a pair: two viruses from two of your servers, arriving together', () => {
  const s = world();
  invade(s, 'pair');
  const inv = s.invasion;
  assert.equal(inv.queue.length, 1);
  assert.notEqual(inv.queue[0].family, inv.family, 'one from each server');
  assert.equal(pushOf(inv), PACK_PUSH);
  const second = inv.queue[0].family;
  play(s, 'jack in'); win(s);
  assert.equal(s.invasion.family, second, 'the other one steps up');
  play(s, 'jack in'); win(s);
  assert.equal(s.invasion, null);
});

test('a champion: elite-grade (the tells for elites apply), a level over its server, sized for one, and a capture', () => {
  const s = world();
  invade(s, 'champion');
  const inv = s.invasion;
  assert.equal(inv.level, 8 + KINDS.champion.lvl);
  assert.equal(pushOf(inv), KINDS.champion.push);
  assert.match(inv.name, /^CHAMPION /);
  assert.ok(bountyOf(s).capture, 'the capture shows before the fight');
  play(s, 'jack in');
  const v = s.encounter.virus;
  assert.ok(v.elite && v.champion, 'elite-grade, marked as a champion');
  assert.ok(CHAMPION.hp < ELITE.hp, 'smaller than a crew elite');
  const items = (s.stash || []).length + filtersOf(s).length;
  const ev = win(s);
  assert.ok(ev.some((e) => /leaves a capture/.test(e.message)));
  assert.ok((s.stash || []).length + filtersOf(s).length > items);
  assert.ok(wallMarkup(s).includes('Firewall'));
});

test('a saboteur: through the wall, it shuts off a service until you kill it; nothing installs meanwhile', () => {
  const s = world({ services: { router: 2, buildfarm: 1, uplink: 1 } });
  invade(s, 'saboteur');
  const inv = s.invasion;
  assert.equal(inv.service, 'router', 'the best service you run');
  assert.match(tellOf(s), /Edge Router/);
  assert.equal(s.services.router, undefined, 'shut off');
  assert.ok(s.logs.some((e) => e.type === 'sabotage'));
  play(s, 'install buildfarm');
  assert.match(s.logs.at(-1).message, /Get rid of it first/);
  play(s, 'jack in');
  win(s);
  assert.equal(s.services.router, 2, 'back on, at its version');
  // Blocked at the wall, it does nothing.
  const t = world({ fw: 40, services: { router: 1 } });
  invade(t, 'saboteur');
  assert.equal(t.services.router, 1);
});

test('a thief: it heads for an outpost\'s stores; intercept it on the way, or it takes half', () => {
  const s = world();
  const o = outpost(s);
  invade(s, 'thief');
  const inv = s.invasion;
  assert.equal(inv.target, o.id);
  assert.notEqual(inv.from, o.id, 'from another of your servers');
  assert.equal(inv.state, 'travel');
  assert.ok(inv.total >= 2 * MIN * KINDS.thief.travel, 'a long road: time to catch it');
  assert.ok(invaderStatus(s).intercept, 'the card offers Intercept');
  wait(s, inv.total + 5000);
  assert.equal(s.invasion, null);
  assert.equal(Math.floor(o.outpost.stock.credits), 80 * (1 - THIEF.take));
  assert.ok(s.logs.some((e) => e.type === 'theft'));
  // Intercepted, nothing goes.
  const t = world();
  const p = outpost(t);
  invade(t, 'thief');
  wait(t, MIN);
  play(t, 'intercept');
  assert.ok(active(t));
  const ev = win(t);
  assert.ok(ev.some((e) => /before it reached/.test(e.message)));
  assert.equal(p.outpost.stock.credits, 80);
  assert.ok(t.sigs >= KINDS.thief.bounty);
  // Only a thief is caught on the way.
  const u = world();
  play(u, 'developer invade raider');
  u.invasion.state = 'travel'; u.invasion.left = MIN;
  play(u, 'intercept');
  assert.match(u.logs.at(-1).message, /Only a thief/);
});

test('a scout: unless your wall clears it, it maps the wall for 5 minutes; kill it, or the next counts 3 levels higher', () => {
  const s = world();
  invade(s, 'scout');
  assert.equal(s.invasion.state, 'watch');
  const hp = s.server.integrity;
  wait(s, SCOUT.mapMs + 5000);
  assert.equal(s.server.integrity, hp, 'it never chips');
  assert.equal(s.invasion, null);
  assert.equal(s.net.mark, SCOUT.mark);
  s.net.next = 0;
  wait(s, 5000);
  assert.equal(s.invasion.marked, SCOUT.mark, 'the next one is marked');
  assert.ok(pushOf(s.invasion) >= SCOUT.mark);
  assert.match(tellOf(s), /scout mapped your wall/);
  assert.equal(s.net.mark, 0, 'once');
  // Killed in time, no mark.
  const t = world();
  invade(t, 'scout');
  play(t, 'jack in');
  win(t);
  assert.ok(!t.net.mark);
  // A wall that clears its server by 3 levels swats it quietly.
  const u = world({ fw: 14 });
  invade(u, 'scout');
  assert.equal(u.invasion, null);
  assert.ok(u.logs.some((e) => e.type === 'invasion-cleared' && e.quiet));
});

test('quirks: a Hoard invasion is Armored and pays half again; a Nest one brings a brood; a Hidden one counts 2 higher', () => {
  const s = world();
  invade(s, 'hoard');
  assert.equal(s.invasion.mutation, 'armored');
  assert.equal(s.invasion.bounty, Math.round(KINDS.raider.bounty * QUIRKED.hoard));
  const n = world();
  invade(n, 'nest');
  assert.equal(n.invasion.queue.length, 1, 'one more behind it');
  const g = world();
  command(g, 'developer location ghostroot');
  g.locations.at(-1).level = 8;
  invade(g, 'hidden');
  assert.equal(g.invasion.quirk, 'hidden');
  assert.equal(pushOf(g.invasion), QUIRKED.hiddenPush);
});

test('fragmentation comes from events: contested cracks a block, a breach two, chip and hits nothing; an upgrade clears it', () => {
  const s = world({ level: 6, fw: 1 });
  invade(s, 'raider');
  assert.equal(s.invasion.state, 'siege');
  assert.equal(fwOf(s).frag, 1);
  const b = world();
  invade(b, 'raider');
  assert.equal(fwOf(b).frag, 2);
  wait(b, 10 * MIN);
  assert.ok(b.server.integrity < b.server.max, 'it chipped');
  assert.equal(fwOf(b).frag, 2, 'and the chip wore nothing more');
});

test('away: no thieves or scouts while you are logged off', () => {
  const s = world({ fw: 40 });
  outpost(s);
  const T0 = 1_800_000_000_000;
  s.net.wall = T0;
  tickNetwork(s, T0 + 48 * 3600000);
  const kinds = s.logs.filter((e) => e.type === 'invader').map((e) => e.message);
  assert.ok(kinds.length >= 4);
  assert.ok(!kinds.some((m) => /^(THIEF|SCOUT)/.test(m)));
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
  // Custom filters only come from invasions now: a vault's is Tuned at best.
  for (let seed = 1; seed < 400; seed++) { const f = vaultFilter({ seed, level: 20 }); if (f) assert.notEqual(f.rarity, 'custom'); }
});

test('invasions: lists what is coming, what it does and what it pays', () => {
  const s = world();
  invade(s, 'champion');
  const out = play(s, 'invasions').map((e) => e.message).join('\n');
  assert.match(out, /Champion: CHAMPION/);
  assert.match(out, /signatures/);
  assert.match(out, /capture comes with your kill/);
  assert.match(out, /Streak 0/);
  assert.equal(threatsOf(s)[0].sel, 'invader');
});

test('saves from v32 load with their invasion as a raider and no signatures', () => {
  const s = world();
  invade(s, 'raider');
  const old = JSON.parse(JSON.stringify(s));
  old.version = 32;
  for (const k of ['kind', 'queue', 'size', 'bounty', 'grown', 'push', 'quiet', 'cracked']) delete old.invasion[k];
  delete old.sigs;
  const r = restore(old);
  assert.equal(r.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 34);
  assert.equal(r.invasion.kind, 'raider');
  assert.deepEqual(r.invasion.queue, []);
  assert.equal(r.invasion.bounty, KINDS.raider.bounty);
  assert.equal(r.sigs, 0);
  assert.ok(Number.isFinite(ratioOf(r, r.invasion)));
  assert.equal(outcome(ratioOf(r, r.invasion)), 'breach');
});

test('the wall follows the network: +0 contests a raider from your strongest server, +2 blocks it, +5 a champion, +6 a pack', async () => {
  const { fwOf: fw, baseOf, BASE_GAP } = await import('./dist/firewall.mjs');
  const verdict = (plus, kind) => {
    const s = world({ level: 12 });
    delete s.firewall.pin;
    fw(s).plus = plus;
    assert.equal(baseOf(s), 12 - BASE_GAP);
    invade(s, kind);
    for (const u of [s.invasion, ...(s.invasion?.queue || [])]) if (u) u.grade = 1;
    return s.invasion ? outcome(ratioOf(s, s.invasion)) : 'blocked';
  };
  assert.equal(verdict(0, 'raider'), 'siege');
  assert.equal(verdict(2, 'raider'), 'blocked');
  assert.notEqual(verdict(4, 'champion'), 'blocked');
  assert.equal(verdict(5, 'champion'), 'blocked');
  assert.notEqual(verdict(5, 'pack'), 'blocked');
  assert.equal(verdict(6, 'pack'), 'blocked');
  // developer wall pins the base for testing, and lets it go again.
  const s = world();
  play(s, 'developer wall 3');
  assert.equal(baseOf(s), 3);
  play(s, 'developer wall off');
  assert.equal(baseOf(s), 8 - BASE_GAP);
});
