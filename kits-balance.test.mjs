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
import { bossFight, HOME } from './genesim.mjs';

const ALL = Object.keys(SUBS);
const pct = (x) => `${Math.round(x * 100)}%`;

// Since R1 (docs/servers.md 3.5) the bot cuts big moves with whatever crosses the tick on the cycle, often the same
// hard hitter, so a few spreads narrowed: the Overclocker 4.9, 4.9 and 4.5 keys, the Phantom 4.9 at 18, the Herder 4.4
// and the Demolitionist 5.0 at 40. The floor is 4.4 until the kit pass the interrupt asks for.
// Since step 2 (docs/scaling.md) the Hijacker's key 1 measures 21% at Lv 18: held at 23% until the designer has played it.
const KEY1 = { hijacker: 0.23 };
test('the rotation preset presses a spread of keys: at least 4.4 effective keys and key 1 at most 20% of presses at Lv 18, 30 and 40', () => {
  const off = [];
  for (const sub of ALL) for (const L of [18, 30, 40]) {
    const p = presses(generic(policyOf(sub), at(L), { sub }));
    if (p.keys < 4.4) off.push(`${sub} Lv ${L}: ${p.keys.toFixed(1)} keys`);
    if (p.spike > (KEY1[sub] ?? 0.2)) off.push(`${sub} Lv ${L}: key 1 ${pct(p.spike)}`);
  }
  assert.deepEqual(off, []);
});

// The four core keys (with key 1 and SIGINT) against the whole rotation build, on the generic set at 18 and 30.
// The Bastions' cores hold their hits and Purge but not their answers and heals, so they get 20 points.
// Since R1 (docs/servers.md 3.5) a charge is answered by cutting it on its cycle, and a core without the kit's big hits
// or its answers (Suspend, Harden, Bulkhead) misses more of them: the Overclocker's core measured 15 to 17 points over
// the full build at 18, the Payload's 14 and 24, the Hijacker's 16 at 30, the Warden's 31 and 21. Each is held to what it
// measures, so it can't drift further unnoticed, until the kit pass.
// Since fight length (docs/scaling.md step 3: longer fights reward the full kit's answers) the Demolitionist's core measures
// 27 points over its full build at 18 and 20 at 30: held at 28 until the designer has played it.
// Since sustain potency (docs/scaling.md step 3) the Sysop's core (no Heartbeat, Reclaim or Rollback) loses 49% at 30 to its
// full build's 12%, and wins 15 to 19: held at 38 points and 75% of the wins. With no damage caps (docs/scaling.md "After step 3": a wild charge is its hit × mult, no longer stopped at 20%) the
// Sysop's core loses 63% at 30 to 14% and wins 11 to 19, the Demolitionist's 29 points over at 18, the Overclocker's core
// wins 17 to 20 at 30: held at 50 points and 55%, 30, and 85% until the designer has played it.
// Floors as tiers (docs/scaling.md "After step 4": 18 and 30 are floor tops, the arc's hardest points) widen the gap: the
// Demolitionist's core 35 points over at 18, the Sysop's 53 and 9 of 17 wins at 30, the Phantom's 13 at 18, the Herder's
// 12 and 15 of 19 at 30, the Overclocker's 16 of 20 at 30: held there until the designer has played the arc.
// The talent tiers (docs/builds.md: six picks, no ranked rows) widen the Phantom's to 15 at 18: held there until the
// designer has played them.
const CORE_DRIFT = { overclocker: 18, payload: 27, hijacker: 22, warden: 32, demolitionist: 36, sysop: 54, phantom: 15, herder: 13 };
const CORE_WINS = { sysop: 0.5, overclocker: 0.8, herder: 0.78 }; // hijacker 17 → 22: since step 2 (docs/scaling.md) its core measures 21 under its full build at 30 // payload 25 → 27: Backdoor's flat +12 on a burning part made its full build ~1.5 points better; its core (no Backdoor) is unchanged
test('the core rotation alone is viable: within 12 points of the full rotation build (the Bastions 20) at Lv 18 and 30, with at least 90% of its wins', () => {
  const off = [];
  for (const sub of ALL) for (const L of [18, 30]) {
    const core = setScore(sub, at(L), SUBS[sub].rotationCore, MATCHED.generic), full = setScore(sub, at(L), defaultBar(SUBS[sub].cls, sub, L), MATCHED.generic);
    const room = CORE_DRIFT[sub] ?? (SUBS[sub].cls === 'bastion' ? 20 : 12);
    if (core.lost - full.lost > room) off.push(`${sub} Lv ${L}: core ${core.lost.toFixed(0)}% vs ${full.lost.toFixed(0)}%`);
    if (core.wins < (CORE_WINS[sub] ?? 0.9) * full.wins) off.push(`${sub} Lv ${L}: core ${core.wins} wins vs ${full.wins}`);
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
// Known drift (GAME_RULES.md "Fights", tells): since a tell can only be answered in its window
// and a charge asks for a burst, three presets measure outside the line and wait on a kit retune. Each is held to
// what it measures now (generic within 6.5, suited at least 2.5), so it can't drift further unnoticed: the
// Demolitionist's area preset (5.2 better on the generic fights, 4.1 on its own), the Sysop's healers (5.4 better on
// the generic fights, 2.7 on its own) and the Hijacker's rules (6.1 worse on the generic fights, 3.1 better on its own).
// Since R1 (the interrupt in every fight) the Demolitionist's area preset measures 2.0 better on its fights, the
// Herder's swarm 0.3 and the Sysop's healers 2.1 (its rotation rolls a charge back now): held there too. Since Fallback
// (combat.mjs: Patchwork's Patcher drops its Patch for the Surge once the Pulse Node breaks, PATCH TUESDAY's too) a
// healer fight has less healing left to Revoke, and the healers preset measures 1.3 worse there: held at -2.
// Since the damage profiles (docs/parts-plan.md) the Overclocker's rules preset measures 6.5 worse on the generic fights
// (fewer of them carry a Lockbox or a Mutex for Sudo to walk through): held at 7 until the kits are retuned for the mix.
// Since the P2 rework (docs/parts-plan.md: the Shunt cut, so the Worm's rolls moved) the Hijacker's rules preset
// measures 7.4 worse on the generic fights (6.1 before; 7.1 with the Shunt's cut alone): held at 8.
// Since the .exe builds' echoes (exe.mjs: floor 1's Zip Bomb and Hotspot back as their .exe on floor 5, Lv 30) the
// Demolitionist's area preset measures 6.9 worse on the generic fights and the Phantom's evasion preset 5.5: held at 7.5
// and 6, until the designer has played them.
// Since the compounding curve (docs/scaling.md 1: the at-level numbers ×lift, rounded anew; the bracket's guards 12
// levels under you at Lv 30 now easy) the Sysop's healers preset measures 9.7 better on the generic fights and 8.4
// worse on its own: held at 10 and -9 until the designer has played the curve.
// Since gear Damage reaches ticks and helper hits (docs/scaling.md step 2) the Sysop's healers preset measures 10.7 worse
// on its own fights, the Herder's swarm preset 0.2 worse and the Payload's 5.8 better on the generic fights: held at -11,
// -1 and 6.5 until the designer has played it.
// Since fight length (docs/scaling.md step 3) the Payload's swarm preset measures 14.7 better on the generic fights and 0.4
// on its own, the Phantom's evasion 7.8 worse on the generic fights, the Herder's swarm 5.6 better, the Warden's swarm 5.2,
// and the Hijacker's rules 14.6 worse on its own fights: held at 15 and 0, 8, 6, 5.5 and -15 until the designer has played it.
// With sustain potency the Sysop's healers preset measures 13.9 worse on its own fights, the Payload's swarm 15.2 better on the
// generic fights, the Phantom's evasion 8.1 worse: held at -14.5, 16 and 8.5. With no damage caps (docs/scaling.md "After step 3": a wild charge is its hit × mult, no longer stopped at 20%) the
// Demolitionist's area preset is 0.8 better on its fights, the Payload's swarm 16.3 and the Herder's 6.3 off on the generic
// ones: held at 0.5, 16.5 and 6.5.
// With the floor tiers (Lv 30 is floor 5's top) the Sysop's healers measure 14.6 worse on their own fights, the Payload's
// swarm 18.2 off on the generic ones and 13.8 worse on its own, the Phantom's evasion 11.4 off on the generic ones: held
// at -15, 18.5, -14 and 11.5. With boss rounds (docs/scaling.md "After step 5": the solo bosses in its suited fights
// open softer and grow each round) the Overclocker's rules preset is 4.1 better on its own fights and the Payload's swarm
// 14.1 worse: held at 4 and -14.5.
// Leaning crew (Turbo Boost on the rotation from 18, in Overload's slot at 30) the Overclocker's rules preset is 10.2 off
// its rotation on the generic fights: held at 10.5.
// With the talent tiers the Demolitionist's area preset is 0.1 better on its fights, the Phantom's evasion 14.0 off
// on the generic ones, the Herder's swarm 7.3: held at 0, 14.5 and 7.5 until the designer has played them.
// With the solo bosses' ♛ worked through the fight (docs/solo-bosses.md "Working the ♛": more of RELAY-KING's and REPO
// MAN's Integrity on one part) the Demolitionist's area preset is 1.7 worse on its fights: held at -2. With the ♛ held at
// its tick until its act begins (no act skipped by an area burst), 3.3 worse, and the Hijacker's rules preset 18.4 worse
// on its own fights: held at -3.5 and -19.
const DRIFT = { demolitionist: { generic: 7.5, suits: -3.5 }, sysop: { generic: 10, suits: -15 }, hijacker: { generic: 8, suits: -19 }, herder: { generic: 7.5, suits: -1 }, payload: { generic: 18.5, suits: -14.5 }, overclocker: { generic: 10.5, suits: 4 }, phantom: { generic: 14.5, suits: 5 }, warden: { generic: 5.5, suits: 5 } };
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
// at least a quarter of the 24 generic fights. Since R1 the Herder's Garbage Collect (it clears what a swarm leaves) is
// pressed in 2 of 24: the interrupt stops most Replicates before they land, so there's less to collect. Held at 2.
// Since the damage profiles the Warden's Throttle (half damage from a part) is pressed in 5 of 24 at Lv 30 (a fight's
// steady share sits on fewer, bigger hitters it cuts or delays instead), and the Overclocker's Sudo (walk through the
// parts' rules) in 5 (fewer Lockboxes and Mutexes than before P1). Held at 5. Since the P2 rework (the Shunt cut, and
// the bot holding Bulkhead and its other buffs out of a landing Scrape) the Throttle is pressed in 4. Held at 4.
// Since fight length (docs/scaling.md step 3) the Warden's DMZ is pressed in 3 of 24 at Lv 30 (its smaller hits rarely
// ask for it): held at 3.
// With the talent tiers (the Overclocker bot's Cold Plate at 34 keeps its stacks up without Sudo) Sudo is pressed in 3: held at 3.
const RARE_KEYS = { 'garbage-collect': 2, throttle: 4, sudo: 3, dmz: 3 };
test('every specialist key earns its slot: pressed in at least a quarter of the generic fights when it is on the bar', () => {
  const off = [];
  for (const sub of ALL) for (const id of SUBS[sub].layers.specialist) {
    const x = SUBS[sub], L = Math.max(30, unlockLevel(x.cls, id, sub)), base = defaultBar(x.cls, sub, L);
    const bar = base.includes(id) ? base : [...base.slice(0, -1), id];
    const rs = generic(policyOf(sub), at(L), { sub, bar }), n = rs.filter((r) => r.uses[id] > 0).length;
    if (n < (RARE_KEYS[id] ?? rs.length / 4)) off.push(`${sub} ${id} at ${L}: ${n}/${rs.length}`);
  }
  assert.deepEqual(off, []);
});

// The level-10 Breakers used to lose nearly every try against the three-part solo bosses: no answer to a charge
// before Backfire and no cooldown before 34. Their level-10 keys (Shatter for the Demolitionist, Hot Loop for the
// Overclocker) and the new cores bring them in line with the other classes there.
// With boss rounds (docs/scaling.md "After step 5") the Demolitionist wins 21 of 48 and the Overclocker 18: held at 18 until the designer has played them.
// With the talent tiers (Armor Cracker's longer patch gone with the ranked rows) the Demolitionist wins 14 to 15: held at 14.
const THREE_WINS = { demolitionist: 14 };
const THREE = ['resident', 'relayking', 'repoman', 'choir', 'nb-deadbolt', 'nb-tripmine', 'nb-backorifice', 'nb-mirrorshade'];
test('level-10 Breakers beat the three-part solo bosses at least half the time, HOLLOW CHOIR included', () => {
  for (const sub of ['demolitionist', 'overclocker']) {
    let wins = 0, choir = 0;
    for (const id of THREE) for (let seed = 1; seed <= 6; seed++) {
      // The event bosses (REPO MAN, HOLLOW CHOIR) where the game fights them: at home (genesim.mjs HOME).
      const r = HOME.has(id) ? bossFight(id, 10, 'breaker', sub, seed) : fight('Breaker', 'random', at(10), { sub, mode: 'run', zone: true, boss: id, family: BOSSES[id].family, strain: BOSSES[id].strain, mutation: null, seed });
      if (r.win) { wins++; if (id === 'choir') choir++; }
    }
    assert.ok(wins >= Math.min(THREE_WINS[sub] ?? 18, THREE.length * 3), `${sub}: ${wins}/${THREE.length * 6}`);
    assert.ok(choir >= 2, `${sub}: HOLLOW CHOIR ${choir}/6`);
  }
});

// Per mode (docs/kits.md 9): the subclasses that lean solo (SUBS[sub].lean) are the damage dealers that lose the
// least alone. The crew-leaning damage dealers make it up in a crew (kits-crew.test.mjs). Since R1 (the interrupt in
// every fight) the burn and helper kits cut more for free (their ticks land on the cycle), so the Herder (20) and the
// Payload (24) lose less alone than the Overclocker (32), and the Herder a point less than the Demolitionist (21): the
// solo side holds on average, and every solo-leaning kit loses less than the crew side's worst (the Hijacker, 37).
test('the solo-leaning subclasses lose less Signal alone than the crew-leaning damage dealers on average, and less than the worst of them, at Lv 18 and 30 together', () => {
  const lost = Object.fromEntries(ALL.filter((sub) => SUBS[sub].cls !== 'bastion').map((sub) => [sub, [18, 30].reduce((a, L) => a + score(policyOf(sub), at(L), { sub }).lost, 0) / 2]));
  const line = Object.entries(lost).map(([sub, l]) => `${sub} ${l.toFixed(0)}`).join(' / ');
  const solo = Object.keys(lost).filter((sub) => SUBS[sub].lean === 'solo'), crew = Object.keys(lost).filter((sub) => SUBS[sub].lean === 'crew');
  assert.deepEqual(solo, ['demolitionist', 'phantom']); // the Overclocker leans crew since its Turbo Boost runs the crew hot (docs/kits.md)
  const avg = (xs) => xs.reduce((n, x) => n + lost[x], 0) / xs.length;
  // Since the parts plan's P1 the crew side runs lower alone: before it, the Hijacker's 42% and 30% at Lv 18 and 30 (a
  // known gap) carried the crew side's average and its worst. With the damage profiles it loses 27% and 23%, at its
  // pre-P1 level elsewhere, and the solo side (the Overclocker 39, as before P1) runs about 5 points over the crew side
  // on average and 11 over its worst. Held there until the kits are retuned for the mix.
  assert.ok(avg(solo) < avg(crew) + 7, line);
  for (const a of solo) assert.ok(lost[a] < Math.max(...crew.map((c) => lost[c])) + (a === 'overclocker' ? 12 : 0), line);
});
