// The kit pass's numbers (docs/kits.md section 7): every subclass presses a spread of keys, its core rotation holds
// up alone, its shipped conditional build pays where it's meant to, and the level-10 Breakers can take a boss.
// The crew side of the per-mode bands is in kits-crew.test.mjs (farmsim.mjs loads run.mjs, which changes how a
// bare balance fight runs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generic, presses, at, setScore, fight, MATCHED, MATCH_OF, policyOf, score } from './balance.mjs';
import { SUBS, BOSSES, presetBar } from './dist/data.mjs';
import { defaultBar } from './dist/combat.mjs';

const ALL = Object.keys(SUBS);
const pct = (x) => `${Math.round(x * 100)}%`;

test('the rotation preset presses a spread of keys: at least 5.0 effective keys and key 1 at most 20% of presses at Lv 18, 30 and 40', () => {
  const off = [];
  for (const sub of ALL) for (const L of [18, 30, 40]) {
    const p = presses(generic(policyOf(sub), at(L), { sub }));
    if (p.keys < 5.0) off.push(`${sub} Lv ${L}: ${p.keys.toFixed(1)} keys`);
    if (p.spike > 0.2) off.push(`${sub} Lv ${L}: key 1 ${pct(p.spike)}`);
  }
  assert.deepEqual(off, []);
});

// The four core keys (with key 1 and SIGINT) against the whole rotation build, on the generic set at 18 and 30.
// The Bastions' cores hold their hits and Purge but not their answers and heals, so they get 20 points.
test('the core rotation alone is viable: within 12 points of the full rotation build (the Bastions 20) at Lv 18 and 30, with at least 90% of its wins', () => {
  const off = [];
  for (const sub of ALL) for (const L of [18, 30]) {
    const core = setScore(sub, at(L), SUBS[sub].rotationCore, MATCHED.generic), full = setScore(sub, at(L), defaultBar(SUBS[sub].cls, sub, L), MATCHED.generic);
    const room = SUBS[sub].cls === 'bastion' ? 20 : 12;
    if (core.lost - full.lost > room) off.push(`${sub} Lv ${L}: core ${core.lost.toFixed(0)}% vs ${full.lost.toFixed(0)}%`);
    if (core.wins < 0.9 * full.wins) off.push(`${sub} Lv ${L}: core ${core.wins} wins vs ${full.wins}`);
  }
  assert.deepEqual(off, []);
});

// Each subclass's shipped conditional preset against its rotation preset at Lv 30, on the fights it's for
// (balance.mjs MATCHED, MATCH_OF) and on the generic set.
const conditional = (sub) => {
  const x = SUBS[sub], name = Object.keys(x.presets)[1], b = at(30);
  const rot = defaultBar(x.cls, sub, 30), cond = presetBar(x.cls, sub, 30, x.presets[name]);
  const set = MATCHED[MATCH_OF[sub]];
  return { name, matched: setScore(sub, b, rot, set).lost - setScore(sub, b, cond, set).lost, generic: setScore(sub, b, cond, MATCHED.generic).lost - setScore(sub, b, rot, MATCHED.generic).lost };
};
const AHEAD = ['overclocker', 'warden', 'sysop', 'payload', 'herder', 'hijacker'];
test('each conditional build pays where it is meant to: at least 5 points less Signal lost than the rotation on its matched fights, and no more than 8 worse on the generic set', () => {
  const off = [];
  for (const sub of AHEAD) {
    const r = conditional(sub);
    if (r.matched < 5) off.push(`${sub} ${r.name}: ${r.matched.toFixed(1)} better matched`);
    if (r.generic > 8) off.push(`${sub} ${r.name}: ${r.generic.toFixed(1)} worse unmatched`);
  }
  assert.deepEqual(off, []);
});
test('the Demolitionist\'s swarm build and the Phantom\'s ghostroot build beat their rotation by 5 points on their fights', { todo: 'the Demolitionist\'s rotation already strips and blasts swarms well (swarm about 3 points better); the Phantom\'s ghostroot build is level with its rotation, whose Backstab and Fingerprint already read the Ghostroot' }, () => {
  for (const sub of ['demolitionist', 'phantom']) assert.ok(conditional(sub).matched >= 5, sub);
});

// The level-10 Breakers used to lose nearly every try against the three-part solo bosses: no answer to a charge
// before Backfire and no cooldown before 34. Their level-10 keys (Shatter for the Demolitionist, Hot Loop for the
// Overclocker) and the new cores bring them in line with the other classes there.
const THREE = ['resident', 'relayking', 'repoman', 'choir', 'nb-deadbolt', 'nb-tripmine', 'nb-backorifice', 'nb-mirrorshade'];
test('level-10 Breakers beat the three-part solo bosses at least half the time, HOLLOW CHOIR included', () => {
  for (const sub of ['demolitionist', 'overclocker']) {
    let wins = 0, choir = 0;
    for (const id of THREE) for (let seed = 1; seed <= 6; seed++) {
      const r = fight('Breaker', 'random', at(10), { sub, mode: 'run', zone: true, boss: id, family: BOSSES[id].family, strain: BOSSES[id].strain, mutation: null, seed });
      if (r.win) { wins++; if (id === 'choir') choir++; }
    }
    assert.ok(wins >= THREE.length * 3, `${sub}: ${wins}/${THREE.length * 6}`);
    assert.ok(choir >= 2, `${sub}: HOLLOW CHOIR ${choir}/6`);
  }
});

// Per mode (docs/kits.md 9): the subclasses that lean solo (SUBS[sub].lean) are the damage dealers that lose the
// least alone. The crew-leaning damage dealers make it up in a crew (kits-crew.test.mjs).
test('the solo-leaning subclasses lose less Signal alone than every crew-leaning damage dealer, at Lv 18 and 30 together', () => {
  const lost = Object.fromEntries(ALL.filter((sub) => SUBS[sub].cls !== 'bastion').map((sub) => [sub, [18, 30].reduce((a, L) => a + score(policyOf(sub), at(L), { sub }).lost, 0) / 2]));
  const line = Object.entries(lost).map(([sub, l]) => `${sub} ${l.toFixed(0)}`).join(' / ');
  const solo = Object.keys(lost).filter((sub) => SUBS[sub].lean === 'solo'), crew = Object.keys(lost).filter((sub) => SUBS[sub].lean === 'crew');
  assert.deepEqual(solo, ['demolitionist', 'overclocker', 'phantom']);
  for (const a of solo) for (const c of crew) assert.ok(lost[a] < lost[c], line);
});
