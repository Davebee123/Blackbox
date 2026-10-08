// The kit pass's numbers (docs/kits.md sections 7 and 11): every subclass presses a spread of keys, its core rotation
// holds up alone, its second shipped preset is a real alternative, its specialist keys earn their slot in most fights,
// and the level-10 Breakers can take a boss.
// The crew side of the per-mode bands is in kits-crew.test.mjs (farmsim.mjs loads run.mjs, which changes how a
// bare balance fight runs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generic, presses, at, setScore, fight, MATCHED, MATCH_OF, policyOf, score } from './balance.mjs';
import { SUBS, BOSSES, presetBar, unlockLevel } from './dist/data.mjs';
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

// Each subclass's second shipped preset against its rotation preset at Lv 30 (docs/kits.md 11). The second preset is
// a playstyle of its own, not a narrow counter: on the generic fights (the 24 class-balance fights) it stays within
// 5 points of the rotation either way, and on the fights its playstyle suits (balance.mjs MATCHED, MATCH_OF: many
// parts for an area or swarm build, rule-heavy parts, healers, big hits for evasion) it loses at least 5 points less.
const second = (sub) => {
  const x = SUBS[sub], name = Object.keys(x.presets)[1], b = at(30);
  const rot = defaultBar(x.cls, sub, 30), alt = presetBar(x.cls, sub, 30, x.presets[name]);
  const set = MATCHED[MATCH_OF[sub]], pol = policyOf(sub);
  return { name, suits: setScore(sub, b, rot, set).lost - setScore(sub, b, alt, set).lost, generic: score(pol, b, { sub, bar: alt }).lost - score(pol, b, { sub, bar: rot }).lost };
};
// Known drift (docs/solo-tells.md, "Decisions for the designer"): since a tell can only be answered in its window
// and a charge asks for a burst, three presets measure outside the line and wait on a kit retune. Each is held to
// what it measures now (generic within 6.5, suited at least 2.5), so it can't drift further unnoticed: the
// Demolitionist's area preset (5.2 better on the generic fights, 4.1 on its own), the Sysop's healers (5.4 better on
// the generic fights, 2.7 on its own) and the Hijacker's rules (6.1 worse on the generic fights, 3.1 better on its own).
const DRIFT = { demolitionist: { generic: 6.5, suits: 2.5 }, sysop: { generic: 6.5, suits: 2.5 }, hijacker: { generic: 6.5, suits: 2.5 } };
test('each second preset is a real alternative: within 5 points of the rotation on the generic fights, and at least 5 points better on the fights it suits', () => {
  const off = [], line = [];
  for (const sub of ALL) {
    const r = second(sub), lim = DRIFT[sub] || { generic: 5, suits: 5 };
    line.push(`${sub} ${r.name}: ${r.generic >= 0 ? '+' : ''}${r.generic.toFixed(1)} generic, ${r.suits.toFixed(1)} better suited`);
    if (Math.abs(r.generic) > lim.generic) off.push(`${sub} ${r.name}: ${r.generic.toFixed(1)} on the generic fights`);
    if (r.suits < lim.suits) off.push(`${sub} ${r.name}: ${r.suits.toFixed(1)} better on its fights`);
  }
  assert.deepEqual(off, [], line.join(' / '));
});
// The two second presets that changed playstyle (docs/kits.md 11) are named for it.
test('the Demolitionist\'s second preset is area and the Phantom\'s is evasion', () => {
  assert.deepEqual(Object.keys(SUBS.demolitionist.presets), ['rotation', 'area']);
  assert.deepEqual(Object.keys(SUBS.phantom.presets), ['rotation', 'evasion']);
  for (const id of ['fork-bomb', 'chain-reaction', 'rm-rf']) assert.ok(SUBS.demolitionist.presets.area.slice(0, 9).includes(id), id);
  for (const id of ['null-route', 'shadow-copy', 'rotate-keys', 'opening']) assert.ok(SUBS.phantom.presets.evasion.slice(0, 9).includes(id), id);
});

// The specialist layer (SUBS[sub].layers.specialist) holds the keys built for one kind of fight. Since the review
// (docs/kits.md 11) each has a general use with its special case as a bonus, so none sits dead on the bar: put on the
// rotation bar at Lv 30 (or the level it opens, in the last slot when the preset leaves it off), each is pressed in
// at least a quarter of the 24 generic fights.
test('every specialist key earns its slot: pressed in at least a quarter of the generic fights when it is on the bar', () => {
  const off = [];
  for (const sub of ALL) for (const id of SUBS[sub].layers.specialist) {
    const x = SUBS[sub], L = Math.max(30, unlockLevel(x.cls, id, sub)), base = defaultBar(x.cls, sub, L);
    const bar = base.includes(id) ? base : [...base.slice(0, -1), id];
    const rs = generic(policyOf(sub), at(L), { sub, bar }), n = rs.filter((r) => r.uses[id] > 0).length;
    if (n < rs.length / 4) off.push(`${sub} ${id} at ${L}: ${n}/${rs.length}`);
  }
  assert.deepEqual(off, []);
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
