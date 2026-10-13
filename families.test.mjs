// What fights in a server's rooms (docs/servers.md 4, families.mjs): attack sets for the Ransomware, the Worm and the
// Ghostroot (and the new bodies' two each), each its own timing at the same pressure; the Trojan's Packages and Loader;
// the Cryptominer's ramp, heat, burnout and vent; the Wiper's Wipe. They stay out of FAMILIES, so the old game never
// rolls them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, hit, part, livingParts, command, resolveCycle, attackers, readyIn, usable, active, toIntent } from './dist/combat.mjs';
import { CONFIG, FAMILIES, ROOM_FAMILIES, ABILITIES, createVirus } from './dist/data.mjs';
import { seeded } from './dist/gear.mjs';
import * as FP from './dist/floorplan.mjs';
import { ATTACK_SETS, SET_SCALE, pressureOf, rollSet, applySet, BODY } from './dist/families.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
function roomFight({ family = 'ransomware', set = 'standard', cls = 'breaker', level = 10, author = 'tollgate' } = {}) {
  const s = fresh();
  s.rng = 99;
  FP.outfit(s, { cls, level, gearSeed: 2 });
  FP.startRooms(s, { seed: 5, kind: 'Mirror', size: 'medium', level });
  FP.connect(s);
  const R = s.rooms, room = FP.roomList(s).find((r) => r.kind === 'process');
  Object.assign(room, { family, set, third: null, author });
  R.at = room.id; R.screen = null;
  FP.fight(s, room);
  s.run.integrity = s.run.max = 5000; R.fightFrom = 5000;
  s.encounter.hardened = 0;
  return s;
}
const hold = (s, n = 1) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
const strike = (s, p, n) => hit(s, p, n, { pierce: true, server: true });

// ---------- attack sets ----------
test('every family has two or more attack sets, each with its own timing', () => {
  for (const fam of ['ransomware', 'worm', 'ghostroot', 'trojan', 'cryptominer', 'wiper']) {
    const sets = Object.entries(ATTACK_SETS[fam]);
    assert.ok(sets.length >= 2, fam);
    const sig = (x) => JSON.stringify(Object.entries(x.parts).map(([id, a]) => [id, a.first, a.interval, a.deliver, a.ramp, a.amount, a.mult, a.spawns]).concat([x.heat || 1]));
    assert.equal(new Set(sets.map(([, x]) => sig(x))).size, sets.length, `${fam}: no two sets alike`);
  }
  // The doc's table (4.1): Lockout leads with the Encryptor on cycle 2; Bloom replicates every 3 from 2; Ambush's Pulse
  // comes every 3 from 2.
  assert.deepEqual(ATTACK_SETS.ransomware.lockout.parts.encryptor, { interval: 4, first: 2 });
  assert.deepEqual(ATTACK_SETS.worm.bloom.parts.replicator, { interval: 3, first: 2 });
  assert.deepEqual(ATTACK_SETS.ghostroot.ambush.parts.pulse, { interval: 3, first: 2, mult: 0.75 });
});

test('a set changes the plan, not the difficulty: its pressure over 20 cycles is within 5% of its Standard\'s', () => {
  for (const [fam, sets] of Object.entries(ATTACK_SETS)) {
    const std = pressureOf(fam, Object.keys(sets)[0]);
    for (const id of Object.keys(sets)) {
      const p = pressureOf(fam, id) * SET_SCALE[fam][id];
      assert.ok(Math.abs(p / std - 1) <= 0.05, `${fam} ${id}: ${p} vs ${std}`);
    }
  }
  // On a built virus the scale is in its amounts: a Hammer's Surge hits harder than a Standard's, less often.
  const std = roomFight({ set: 'standard' }), ham = roomFight({ set: 'hammer' });
  assert.ok(part(ham, 'pulse').attack.amount > part(std, 'pulse').attack.amount);
  assert.ok(part(ham, 'pulse').attack.interval > part(std, 'pulse').attack.interval);
});

test('a room\'s set is fixed by the seed; a virus fights to its set, a cycle of jitter at most, never on cycle 1', () => {
  // Fixed by the server's seed.
  const a = FP.generate(21, { size: 'large', kind: 'Mailhub', level: 10, floor: 2, author: 'tollgate' }), b = FP.generate(21, { size: 'large', kind: 'Mailhub', level: 10, floor: 2, author: 'tollgate' });
  for (const id of Object.keys(a.rooms)) assert.equal(a.rooms[id].set, b.rooms[id].set);
  // Its timing, as written, and with the room's jitter.
  for (const fam of ['ransomware', 'worm', 'ghostroot']) for (const [id, set] of Object.entries(ATTACK_SETS[fam])) {
    const v = createVirus('random', 7, { family: fam, threat: 19, run: true, genes: [], mutation: null });
    applySet(v, id);
    for (const [pid, x] of Object.entries(set.parts)) { const p = v.parts.find((q) => q.id === pid); assert.equal(p.attack.interval, x.interval); assert.equal(p.attack.due, x.first, `${fam} ${id} ${pid}`); }
    for (let k = 0; k < 20; k++) {
      const w = createVirus('random', 7, { family: fam, threat: 19, run: true, genes: [], mutation: null });
      applySet(w, id, seeded(k + 1));
      for (const [pid, x] of Object.entries(set.parts)) { const due = w.parts.find((q) => q.id === pid).attack.due; assert.ok(Math.abs(due - x.first) <= 1 && due >= 2, `${fam} ${id}: ${due}`); }
    }
  }
  // Authors weight sets: TOLLGATE leans on Lockout and Hammer, NULL CHOIR on Lockstep.
  const count = (author) => { const r = seeded(77), n = {}; for (let i = 0; i < 3000; i++) { const id = rollSet('ransomware', author, r); n[id] = (n[id] || 0) + 1; } return n; };
  const tg = count('tollgate'), nc = count('nullchoir');
  assert.ok(tg.lockout > tg.lockstep && tg.hammer > tg.lockstep);
  assert.ok(nc.lockstep > nc.lockout);
});

test('the same family can be a different fight: two sets land their attacks on different cycles', () => {
  const landed = (set) => { const s = roomFight({ set }), out = []; for (let c = 1; c <= 12 && active(s); c++) { const first = s.serial; command(s, 'hold'); resolveCycle(s); for (const e of s.logs.filter((x) => x.id > first && ['server-hit', 'encrypt'].includes(x.type) && ['pulse', 'encryptor'].includes(x.source))) out.push(`${e.source}@${c}`); } return out.join(' '); };
  assert.notEqual(landed('standard'), landed('lockout'));
});

test('the new bodies stay out of the old game\'s families', () => {
  for (const id of ['trojan', 'cryptominer', 'wiper']) { assert.equal(FAMILIES[id], undefined); assert.ok(ROOM_FAMILIES[id]); }
});

// ---------- the Trojan ----------
test('the Trojan: the Courier delivers Packages; while the Loader lives, any damage unpacks one into two Droppers', () => {
  const s = roomFight({ family: 'trojan', set: 'express' }), e = s.encounter, courier = part(s, 'courier');
  assert.ok(courier.deliver, 'the Courier delivers');
  assert.equal(courier.deliver.interval, 3);
  for (const p of attackers(s)) p.attack.due = 999;
  courier.deliver.due = e.cycle;
  hold(s);
  const box = livingParts(s).find((p) => p.pkg);
  assert.ok(box, 'a Package on the board');
  assert.equal(box.kind, 'fragment');
  assert.equal(box.ticks, undefined, 'Packages carry no ticks');
  assert.equal(box.pkg.opensAt, e.cycle - 1 + BODY.package.opens, 'it unpacks 5 cycles after delivery');
  // A hit on it, while the Loader lives: two Droppers.
  strike(s, box, 1);
  assert.equal(box.integrity, 0);
  const drops = livingParts(s).filter((p) => p.id.startsWith('dropper'));
  assert.equal(drops.length, 2);
  assert.ok(drops.every((d) => d.attack?.name === 'Spray' && d.attack.interval === 2));
  // Left alone, one unpacks on its own.
  courier.deliver.due = e.cycle;
  hold(s);
  const box2 = livingParts(s).find((p) => p.pkg);
  for (let i = 0; i < BODY.package.opens && !box2.unpacked; i++) hold(s);
  assert.ok(box2.unpacked, 'it unpacked on its own');
  // At most 3 on the board.
  for (const d of livingParts(s).filter((p) => p.id.startsWith('dropper'))) d.integrity = 0;
  const loader = part(s, 'loader');
  for (let i = 0; i < 4; i++) { courier.deliver.due = e.cycle; hold(s); for (const b of livingParts(s).filter((p) => p.pkg)) b.pkg.opensAt = 999; }
  assert.equal(livingParts(s).filter((p) => p.pkg).length, BODY.package.cap);
  // The Loader breaks: every Package is an inert box, and breaking one opens a Payload Box.
  strike(s, loader, loader.integrity);
  const inert = livingParts(s).filter((p) => p.pkg);
  assert.ok(inert.every((b) => b.pkg.inert));
  strike(s, inert[0], inert[0].integrity);
  assert.ok(!livingParts(s).some((p) => p.id.startsWith('dropper')), 'no Droppers from an inert box');
  assert.ok(s.logs.some((x) => x.type === 'loot' && /Payload Box/.test(x.message)));
  assert.ok(e.roomsLoot.credits > 0);
});

test('the Trojan\'s ticks: the Courier\'s cancel a delivery due now, the Loader\'s delay the next by 2', () => {
  const s = roomFight({ family: 'trojan', set: 'freight' }), e = s.encounter, courier = part(s, 'courier'), loader = part(s, 'loader');
  for (const p of attackers(s)) p.attack.due = 999;
  courier.armor = 0; loader.armor = 0;
  courier.deliver.due = e.cycle;
  courier.integrity = Math.floor(courier.max / 2) + 2;
  strike(s, courier, 4);
  assert.equal(courier.deliver.due, e.cycle + courier.deliver.interval, 'the delivery is cancelled');
  hold(s);
  assert.ok(!livingParts(s).some((p) => p.pkg), 'nothing delivered');
  const due = courier.deliver.due;
  loader.integrity = Math.floor(loader.max / 2) + 2;
  strike(s, loader, 4);
  assert.equal(courier.deliver.due, due + BODY.loader, 'the Loader\'s tick delays it 2 cycles');
});

// ---------- the Cryptominer ----------
test('the Cryptominer: its Hash ramps, its heat climbs, and at 100 it overheats and burns itself out', () => {
  const s = roomFight({ family: 'cryptominer', set: 'cold' }), e = s.encounter, v = e.virus, rig = part(s, 'rig');
  s.run.integrity = 5000;
  const a = rig.attack, first = s.serial;
  hold(s, 6);
  const hashes = s.logs.filter((x) => x.id > first && x.type === 'server-hit' && x.source === 'rig').map((x) => x.amount);
  assert.ok(hashes.length >= 2);
  assert.ok(hashes[1] > hashes[0], `it ramps: ${hashes}`);
  assert.equal(v.heat, Math.round(BODY.heat.cooled * ATTACK_SETS.cryptominer.cold.heat) * 6, 'heat a cycle while the Cooler lives');
  for (let i = 0; i < 20 && !v.overheated; i++) hold(s);
  assert.ok(v.overheated, 'it overheats');
  assert.ok(e.cycle >= 11 && e.cycle <= 15, `a cold rig burns out around cycle 13 (${e.cycle})`);
  assert.equal(a.due, 999, 'it stops hashing');
  const was = rig.integrity;
  hold(s);
  assert.ok(rig.integrity <= was - Math.round(rig.max * BODY.heat.burn) + 1, 'it burns itself');
  // A hot rig burns out sooner, and a broken Cooler heats it faster and makes every Hash 50% harder.
  const h = roomFight({ family: 'cryptominer', set: 'hot' });
  for (let i = 0; i < 20 && !h.encounter.virus.overheated; i++) hold(h);
  assert.ok(h.encounter.cycle <= 9, `a hot rig around cycle 8 (${h.encounter.cycle})`);
  const c = roomFight({ family: 'cryptominer', set: 'cold' }), amt = part(c, 'rig').attack.amount;
  strike(c, part(c, 'cooler'), 999);
  assert.equal(part(c, 'rig').attack.amount, Math.round(amt * BODY.heat.hard));
  hold(c);
  assert.equal(c.encounter.virus.heat, Math.round(BODY.heat.hot * ATTACK_SETS.cryptominer.cold.heat));
});

test('the Cryptominer\'s ticks vent it: ramp and heat back to nothing, and an overheated rig hashes again', () => {
  const s = roomFight({ family: 'cryptominer', set: 'hot' }), e = s.encounter, v = e.virus, rig = part(s, 'rig');
  hold(s, 4);
  assert.ok(rig.attack.step > 0 && v.heat > 0);
  rig.armor = 0;
  rig.integrity = Math.floor(rig.max / 2) + 2;
  strike(s, rig, 4);
  assert.equal(rig.attack.step, 0, 'ramp back to 4');
  assert.equal(v.heat, 0, 'heat back to 0');
  assert.ok(s.logs.some((x) => x.type === 'cut' && x.vent));
  for (let i = 0; i < 20 && !v.overheated; i++) hold(s);
  rig.integrity = Math.floor(rig.max / 4) + 2;
  strike(s, rig, 4);
  assert.equal(v.overheated, false);
  assert.ok(rig.attack.due < 900, 'hashing again');
});

// ---------- the Wiper ----------
test('the Wiper: a Targeted Wipe takes your strongest ready key for 3 cycles; never key 1 or SIGINT', () => {
  const s = roomFight({ family: 'wiper', set: 'targeted' }), e = s.encounter, deg = part(s, 'degausser');
  for (const p of attackers(s)) p.attack.due = 999;
  deg.attack.due = e.cycle;
  const ready = usable(s).filter((id) => !['spike', 'sigint'].includes(id) && readyIn(s, id) === 0);
  const strongest = ready.sort((a, b) => (ABILITIES[b].damage || 0) - (ABILITIES[a].damage || 0) || (ABILITIES[b].cooldown || 0) - (ABILITIES[a].cooldown || 0))[0];
  hold(s);
  assert.ok(e.wiped?.[strongest] >= e.cycle, `${strongest} wiped`);
  assert.equal(e.wiped[strongest], e.cycle - 1 + 3);
  assert.ok(toIntent(s, `${strongest} ${livingParts(s)[0].id}`).error, 'it can\'t be pressed');
  assert.ok(!e.wiped.spike && !e.wiped.sigint);
  hold(s, 3);
  assert.ok(!(e.wiped[strongest] >= e.cycle), 'back after 3 cycles');
});

test('the Wiper: a Rolling Wipe takes the key you used last, and its cooldown stands still; the Degausser\'s tick cancels a Wipe', () => {
  const s = roomFight({ family: 'wiper', set: 'rolling' }), e = s.encounter, deg = part(s, 'degausser');
  for (const p of attackers(s)) p.attack.due = 999;
  const key = usable(s).find((id) => !['spike', 'sigint'].includes(id) && ABILITIES[id].cooldown >= 3 && !toIntent(s, `${id} eraser`).error);
  command(s, `${key} eraser`); resolveCycle(s);
  const left = readyIn(s, key);
  assert.ok(left > 0, 'cooling');
  deg.attack.due = e.cycle;
  hold(s);
  assert.ok(e.wiped?.[key] >= e.cycle, `${key}, the key used last, is wiped`);
  assert.equal(readyIn(s, key), left - 1 + 2, 'its cooldown stood still for the 2 cycles');
  // The tick: the Wipe due now is cancelled.
  const t = roomFight({ family: 'wiper', set: 'targeted' }), te = t.encounter, d2 = part(t, 'degausser');
  for (const p of attackers(t)) p.attack.due = 999;
  d2.armor = 0; d2.attack.due = te.cycle;
  d2.integrity = Math.floor(d2.max / 2) + 2;
  strike(t, d2, 4);
  hold(t);
  assert.ok(!Object.keys(te.wiped || {}).length, 'no Wipe');
});
