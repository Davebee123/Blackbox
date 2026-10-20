// What fights in a server's rooms (docs/servers.md 4, phase R0): attack sets for the three families, three new bodies
// (the Trojan, the Cryptominer and the Wiper), and the rules every room fight shares (an elite's enrage, a Lab's
// overheat, a Mailhub's spam). It installs the room hooks in combat.mjs (hooks.roomHit, roomBroke, roomCycle,
// roomLanded, roomIntents), which only ever act on a fight flagged e.rooms (floorplan.mjs), so nothing here touches
// the old game's fights.
//
// Attack sets (4.1): every virus rolls one when it spawns: when each part fires first, how often, and which leads.
// Sets are named, so they're learnable. A set keeps its family's pressure (the damage over the first 20 cycles, by
// pressureOf, stays within 5% of the Standard set's: SET_SCALE evens it out), and each part's first attack moves by up
// to a cycle either way on top (seeded jitter, never onto cycle 1). Authors weight the sets they favour.
//
// The bodies are kept out of FAMILIES (data.mjs ROOM_FAMILIES), so the old game never rolls them.
//   Trojan       Don't hit the box. The Courier drops a hit and delivers Packages (one is on the board when the fight
//                opens); while the Loader lives, any damage to a Package unpacks it into two Droppers, and an unopened
//                one unpacks on its own 5 cycles after delivery. The Loader redeploys a broken Courier 4 cycles later at
//                half its Integrity, as often as it breaks: the Loader is the real target. Once the Loader is broken, the
//                Courier stays down and a Package is an inert box: break it for a Payload Box.
//   Cryptominer  Let it cook, or vent it. The Rig's Hash ramps every time it lands, and it heats up every cycle (faster
//                once the Cooler is broken, and every Hash lands 50% harder then). At 100 heat it overheats: it stops
//                hashing and burns itself until it breaks. Its ticks vent (ramp and heat back to nothing). Break the
//                Rig first and the Cooler falls back on it (combat.mjs fallback): it takes over the Hash, climb and heat as
//                they were, and runs it uncooled (25 a cycle). Whichever part is left hashing cooks.
//   Wiper        Hold your big key. The Degausser's Wipe hits and takes a key off your bar: your strongest ready skill
//                (Targeted) or the one you used last (Rolling). Key 1 and SIGINT are never wiped.
import { hooks, emit, alive, part, livingParts, attackers, defender, hit, usable, readyIn, strikeWith, virusIntegrity } from './combat.mjs';
import { ROOM_FAMILIES, FAMILIES, ABILITIES, CONFIG } from './data.mjs';

// ---------- the bodies (level 6 scale, like FAMILIES) ----------
Object.assign(ROOM_FAMILIES, {
  trojan: {
    name: 'Trojan', stem: 'TROJAN', threatens: 'Signal', art: 'worm', opens: 4, code: 'worm',
    summary: "The Courier delivers Packages, and one is already on the board. While the Loader lives, any damage to a Package unpacks it into two Droppers, an unopened one unpacks on its own 5 cycles after delivery, and a broken Courier is redeployed 4 cycles later at half its Integrity. Break the Loader and the Courier stays down, and the Packages are inert boxes.",
    parts: [
      { id: 'courier', name: 'Courier', integrity: 34, armor: 1, loot: 'Courier Packet', special: true, attack: { name: 'Drop', effect: 'damage', amount: 10, interval: 5, first: 3 }, deliver: { interval: 3, first: 2 } },
      { id: 'loader', name: 'Loader', integrity: 30, armor: 2, loot: 'Loader Stub' },
    ],
  },
  cryptominer: {
    name: 'Cryptominer', stem: 'XMRIG', threatens: 'Signal', art: 'ransomware', opens: 6, code: 'cipher',
    summary: 'The Rig hashes every 2 cycles, 2 harder each time it lands, and heats up every cycle. At 100 heat it overheats: it stops hashing and burns itself every cycle until it breaks. Break the Cooler and it heats two and a half times as fast, and every Hash lands 50% harder. Break the Rig first and the Cooler takes over its Hash, uncooled.',
    parts: [
      { id: 'rig', name: 'Rig', integrity: 44, armor: 1, loot: 'ASIC Die', special: true, attack: { name: 'Hash', effect: 'damage', amount: 4, interval: 2, first: 2, ramp: 2 } },
      { id: 'cooler', name: 'Cooler', integrity: 26, armor: 1, loot: 'Heat Pipe', fallback: 'rig' }, // break the Rig first and the Cooler takes over its Hash, uncooled (Fallback)
    ],
  },
  wiper: {
    name: 'Wiper', stem: 'SHAMOON', threatens: 'Signal', art: 'ransomware', opens: 10, code: 'cipher',
    summary: "The Eraser zeroes your Signal. The Degausser's Wipe hits and takes a key off your bar for a few cycles: it can't be pressed, and its cooldown stands still. Key 1 and SIGINT are never wiped.",
    parts: [
      { id: 'eraser', name: 'Eraser', integrity: 34, armor: 1, loot: 'Zero Block', attack: { name: 'Zero', effect: 'damage', amount: 12, interval: 4, first: 3 } },
      { id: 'degausser', name: 'Degausser', integrity: 38, armor: 2, loot: 'Degauss Coil', special: true, attack: { name: 'Wipe', effect: 'damage', amount: 6, interval: 5, first: 4, wipe: 'strongest', wipeFor: 3 } },
    ],
  },
  // The Exfil (floorplan.mjs, EXFIL-####): a process smuggling a stolen archive off a rogue server. A runner, not a
  // fighter: it flees room to room, and once caught its upload completes after 6 cycles. Its Uplink carries the
  // upload, its Archive what it stole. Never rolled anywhere (runner: the Codex's own row).
  exfil: {
    name: 'Exfil', stem: 'EXFIL', threatens: 'Signal', art: 'worm', opens: 1, code: 'worm', runner: true,
    summary: 'A process uploading a stolen archive off the server. It runs from you; corner it and break its Uplink before the upload finishes.',
    parts: [
      { id: 'uplink', name: 'Uplink', integrity: 16, armor: 0, loot: 'Uplink Socket', attack: { name: 'Backchannel', effect: 'damage', amount: 4, interval: 2, first: 2 } },
      { id: 'archive', name: 'Archive', integrity: 20, armor: 1, loot: 'Archive Index', special: true, attack: { name: 'Checksum', effect: 'damage', amount: 5, interval: 3, first: 3 } },
    ],
  },
});
export const BODY = {
  package: { integrity: 16, opens: 5, cap: 3, opening: 1 }, // a Trojan's Package: unpacks 5 cycles after delivery, at most 3 on the board, 1 there when the fight opens
  redeploy: { in: 4, at: 0.5 }, // the Loader redeploys a broken Courier 4 cycles later at half its max Integrity, bare (its ◆ patch back on the usual clock), while it stands
  dropper: { integrity: 14, amount: 2, interval: 2 }, // two from each unpacked Package (2: was 5 before a fight opened on a Package, which kept the Trojan's pressure in line)
  payload: { credits: [12, 24] }, // a Payload Box from an inert Package
  heat: { cooled: 10, hot: 25, at: 100, burn: 0.12, hard: 1.5 }, // the Rig's heat a cycle (Cooler alive, broken), overheat, its burnout, Hash once the Cooler is gone
  loader: 2, // a Loader's tick delays the Courier's next delivery this many cycles
};
// Which families a server's author writes (4.5), and from what level each opens.
export const OPENS = { ransomware: 1, worm: 1, ghostroot: 1, trojan: 4, cryptominer: 6, wiper: 10 };
export const AUTHOR_FAMILIES = {
  tollgate: ['ransomware', 'cryptominer', 'wiper'],
  swarmline: ['worm', 'trojan'],
  palemask: ['ghostroot'],
  nullchoir: ['ghostroot'],
  glassjaw: ['ransomware', 'worm', 'ghostroot', 'cryptominer', 'wiper'],
  lantern: ['worm', 'trojan'],
};
export const familyName = (id) => FAMILIES[id]?.name || ROOM_FAMILIES[id]?.name || id;

// ---------- attack sets (4.1) ----------
// parts: per part id, its attack's first cycle and interval (and an amount multiplier, mult; a scramble's cycles,
// amount; a replicate's spawns), deliver (the Courier's), ramp (the Rig's), heat (the Rig's heat rate), wipe (the
// Degausser's: what it takes, for how long). lead: the part that leads. by: the authors that favour it.
export const ATTACK_SETS = {
  ransomware: {
    standard: { name: 'Standard', lead: 'pulse', by: [], parts: { pulse: { interval: 4, first: 3 }, encryptor: { interval: 5, first: 4 } } },
    lockout: { name: 'Lockout', lead: 'encryptor', by: ['tollgate'], parts: { pulse: { interval: 5, first: 5 }, encryptor: { interval: 4, first: 2 } } },
    hammer: { name: 'Hammer', lead: 'pulse', by: ['tollgate', 'glassjaw'], parts: { pulse: { interval: 6, first: 4, mult: 1.5 }, encryptor: { interval: 5, first: 3 } } },
    lockstep: { name: 'Lockstep', lead: 'both', by: ['nullchoir'], parts: { pulse: { interval: 4, first: 3 }, encryptor: { interval: 4, first: 5 } } },
  },
  worm: {
    standard: { name: 'Standard', lead: 'replicator', by: [], parts: { pulse: { interval: 4, first: 4 }, replicator: { interval: 4, first: 3 } } },
    bloom: { name: 'Bloom', lead: 'replicator', by: ['swarmline'], parts: { pulse: { interval: 5, first: 5 }, replicator: { interval: 3, first: 2 } } },
    wave: { name: 'Wave', lead: 'pulse', by: ['swarmline', 'lantern'], parts: { pulse: { interval: 4, first: 3 }, replicator: { interval: 6, first: 4, spawns: 2 } } },
  },
  ghostroot: {
    standard: { name: 'Standard', lead: 'scrambler', by: [], parts: { pulse: { interval: 4, first: 3 }, scrambler: { interval: 4, first: 2 } } },
    ambush: { name: 'Ambush', lead: 'pulse', by: ['palemask'], parts: { pulse: { interval: 3, first: 2, mult: 0.75 }, scrambler: { interval: 6, first: 5, amount: 3 } } },
    flicker: { name: 'Flicker', lead: 'both', by: ['nullchoir', 'palemask'], parts: { pulse: { interval: 4, first: 4 }, scrambler: { interval: 4, first: 2 } } },
  },
  trojan: {
    express: { name: 'Express', lead: 'courier', by: ['swarmline'], parts: { courier: { interval: 5, first: 3, deliver: { interval: 3, first: 2 } } } },
    freight: { name: 'Freight', lead: 'courier', by: ['lantern'], parts: { courier: { interval: 3, first: 3, deliver: { interval: 4, first: 2 } } } },
  },
  cryptominer: {
    cold: { name: 'Cold rig', lead: 'rig', by: ['tollgate'], heat: 0.8, parts: { rig: { interval: 2, first: 2, ramp: 3 } } },
    hot: { name: 'Hot rig', lead: 'rig', by: ['glassjaw'], heat: 1.4, parts: { rig: { interval: 2, first: 2, ramp: 1 } } },
  },
  wiper: {
    targeted: { name: 'Targeted', lead: 'degausser', by: ['tollgate'], parts: { eraser: { interval: 4, first: 3 }, degausser: { interval: 5, first: 4, amount: 6, wipe: 'strongest', wipeFor: 3 } } },
    rolling: { name: 'Rolling', lead: 'degausser', by: ['glassjaw'], parts: { eraser: { interval: 4, first: 3 }, degausser: { interval: 3, first: 2, amount: 4, wipe: 'last', wipeFor: 2 } } },
  },
};
const STANDARD = { ransomware: 'standard', worm: 'standard', ghostroot: 'standard', trojan: 'express', cryptominer: 'cold', wiper: 'targeted' };
export const setsOf = (family) => ATTACK_SETS[family] || null;
const bodyOf = (family) => FAMILIES[family] || ROOM_FAMILIES[family];
// A part's attack under a set (its spec with the set's timing on top).
function underSet(spec, x = {}) {
  const a = { ...spec.attack, interval: x.interval ?? spec.attack.interval, first: x.first ?? spec.attack.first };
  if (x.mult) { a.amount *= x.mult; if (a.hit) a.hit *= x.mult; }
  if (x.amount != null) a.amount = x.amount;
  if (x.ramp != null) a.ramp = x.ramp;
  return a;
}
// Pressure: the damage a set lands in its first 20 cycles if nothing were broken, from its family's core parts. A hit
// is its amount; an Encrypt drains its amount every cycle from its landing to cycle 20; a fragment gnaws its damage for
// 4 cycles (and a Replicate's Splice hit); a Scramble its hit, and a cycle of your own static per cycle scrambled; a
// Package unpacks into two Droppers that spray for 4 cycles; the Rig's Hash climbs by its ramp.
export function pressureOf(family, setId, cycles = 20, amounts = null) {
  const set = ATTACK_SETS[family]?.[setId], body = bodyOf(family);
  if (!set || !body) return 0;
  let n = 0;
  for (const spec of body.parts.filter((p) => p.attack && p.pool !== 'third')) {
    const x = set.parts[spec.id] || {}, a = { ...underSet(spec, x), ...(amounts?.[spec.id] || {}) };
    let k = 0;
    for (let c = a.first; c <= cycles; c += a.interval, k++) {
      if (a.effect === 'damage') n += a.amount + (a.ramp ? k * a.ramp : 0);
      if (a.effect === 'encrypt') n += a.amount * (cycles - c + 1);
      if (a.effect === 'replicate') n += (a.hit || 0) + (x.spawns || 1) * CONFIG.fragmentDamage * 4;
      if (a.effect === 'scramble') n += (a.hit || 0) + a.amount * 3;
    }
    const d = x.deliver || spec.deliver;
    if (d) for (let c = d.first; c <= cycles - BODY.package.opens; c += d.interval) n += 2 * BODY.dropper.amount * 2;
    if (d && family === 'trojan') n += BODY.package.opening * 2 * BODY.dropper.amount * 2; // the Package on the board when it opens
  }
  return n;
}
// The scale each set's damage takes so its pressure matches its family's Standard (4.1: "same pressure, different timing").
export const SET_SCALE = {};
for (const [fam, sets] of Object.entries(ATTACK_SETS)) {
  const std = pressureOf(fam, STANDARD[fam]);
  SET_SCALE[fam] = Object.fromEntries(Object.keys(sets).map((id) => [id, std / Math.max(1, pressureOf(fam, id))]));
}
// A set for a virus, by its author's taste: Standard (or a body's first) twice as often as a set nobody favours, a
// favoured set three times. r: the room's dice.
export function rollSet(family, author, r) {
  const sets = ATTACK_SETS[family];
  if (!sets) return null;
  const w = Object.entries(sets).map(([id, x]) => [id, x.by.includes(author) ? 3 : id === STANDARD[family] ? 2 : 1]);
  let roll = r() * w.reduce((a, [, v]) => a + v, 0);
  for (const [id, v] of w) if ((roll -= v) < 0) return id;
  return w[0][0];
}
// Lay a set on a built virus (its parts' amounts already at its level): timing, the scale that keeps its pressure, and
// the seeded jitter on each part's first attack. jitter: the room's dice (null: none, the Standard rhythm as written).
export function applySet(v, setId, jitter = null) {
  const sets = ATTACK_SETS[v.family], set = sets?.[setId];
  if (!set) return v;
  const k = SET_SCALE[v.family][setId] || 1, body = bodyOf(v.family);
  for (const p of v.parts) {
    const spec = body.parts.find((x) => x.id === p.id);
    const x = set.parts[p.id];
    if (!spec || !p.attack || !spec.attack) { // (a basic's carried Surge, parts.mjs PARTS.steadyCarry, keeps its share-out's size)
      if (x?.deliver) p.deliver = { ...x.deliver }; continue; }
    const base = spec.attack, a = p.attack;
    const scale = (x?.mult || 1) * k;
    const levelOf = (field) => (base[field] ? a[field] / base[field] : 1); // what the level and the room's size did to it
    if (x?.amount != null && base.effect === 'scramble') a.amount = x.amount; // a scramble's amount is its cycles
    else if (x?.amount != null) a.amount = Math.max(1, Math.round(x.amount * levelOf('amount') * k));
    else if (['damage', 'encrypt'].includes(a.effect) && scale !== 1) a.amount = Math.max(1, Math.round(a.amount * scale));
    if (a.hit && scale !== 1) a.hit = Math.max(1, Math.round(a.hit * scale));
    if (x?.ramp != null && a.ramp) { a.rampBy = Math.max(1, Math.round((a.rampBy || 1) * (x.ramp / base.ramp))); a.ramp = x.ramp; }
    if (x?.interval) a.interval = x.interval;
    const first = x?.first ?? base.first;
    a.due = first;
    if (x?.wipe) { a.wipe = x.wipe; a.wipeFor = x.wipeFor; }
    if (x?.spawns) a.spawns = x.spawns;
    if (x?.deliver) p.deliver = { ...x.deliver };
  }
  if (jitter) jitterFirst(v, jitter);
  for (const p of v.parts) if (p.deliver) p.deliver.due = p.deliver.first;
  // A Trojan opens with a Package already delivered (so the boxes are never optional), unpacking on the usual clock.
  if (v.family === 'trojan' && !v.parts.some((p) => p.pkg)) for (let k = 0; k < BODY.package.opening; k++) addPackage(v, 0, true);
  if (set.heat) v.heatRate = set.heat;
  v.attackSet = setId;
  return v;
}
// Each part's first attack (and a Courier's first delivery) moved by up to a cycle either way, never onto cycle 1.
export function jitterFirst(v, r) {
  for (const p of v.parts) {
    if (p.attack && p.attack.due < 900) p.attack.due = Math.max(2, p.attack.due + Math.floor(r() * 3) - 1);
    if (p.deliver) { p.deliver.first = Math.max(2, p.deliver.first + Math.floor(r() * 3) - 1); p.deliver.due = p.deliver.first; }
  }
  return v;
}
export const setName = (family, id) => ATTACK_SETS[family]?.[id]?.name || null;

// ---------- the bodies' rules ----------
const scaleOf = (v) => v.hpPower || 1;
const nextId = (v, stem) => { let n = 1; while (v.parts.some((p) => p.id === `${stem}${n}`)) n++; return `${stem}${n}`; };
function fragment(v, id, name, hp, extra = {}) {
  const p = { id, name, kind: 'fragment', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, attack: null, exposedUntil: 0, lastDamaged: 0, boosted: false, ...extra };
  v.parts.push(p);
  return p;
}
// A Package on the board, delivered on this cycle (it unpacks BODY.package.opens later, unless it's inert).
function addPackage(v, cycle, loader) {
  const id = nextId(v, 'pkg'), hp = Math.max(1, Math.round(BODY.package.integrity * scaleOf(v) * (v.roomHp || 1)));
  return fragment(v, id, `Package ${id.slice(3)}`, hp, { pkg: { opensAt: cycle + BODY.package.opens, inert: !loader } });
}
// A Courier delivers a Package (at most BODY.package.cap on the board).
function deliver(s, p) {
  const e = s.encounter, v = e.virus;
  p.deliver.due = e.cycle + p.deliver.interval;
  const boxes = livingParts(s).filter((x) => x.pkg);
  if (boxes.length >= BODY.package.cap) return emit(s, 'info', `The ${p.name} has no room for another Package. ${BODY.package.cap} are on the board.`, { source: p.id });
  const loader = livingParts(s).some((x) => x.id === 'loader'), box = addPackage(v, e.cycle, loader), n = box.id.slice(3);
  emit(s, 'spawn', loader ? `The ${p.name} delivers Package ${n}. It unpacks in ${BODY.package.opens} cycles, or the moment anything damages it while the Loader lives.` : `The ${p.name} delivers Package ${n}. With the Loader broken, it's an inert box.`, { source: p.id, target: box.id });
}
// The Loader redeploys a broken Courier: back at half its max Integrity, bare (a ◆ patches back on the usual clock), its
// Drop and its deliveries on their own clocks again (a Mirror's twin reboot, but as often as it breaks, while the
// Loader stands).
const redeployOf = (s) => (s.encounter?.virus?.family === 'trojan' ? s.encounter.virus.parts.find((x) => x.id === 'courier' && !alive(x) && x.redeployAt != null) || null : null);
function redeploy(s, p) {
  const e = s.encounter, d = p.redeploy || {};
  p.redeployAt = null;
  Object.assign(p, { integrity: Math.max(1, Math.round(p.max * BODY.redeploy.at)), armor: 0, patchAt: e.cycle + CONFIG.patchDelay, redeploys: (p.redeploys || 0) + 1 });
  if (p.attack) p.attack.due = e.cycle + 2;
  if (d.deliver) p.deliver = { ...d.deliver, due: e.cycle + 1 + d.deliver.interval };
  emit(s, 'patch', `The Loader REDEPLOYS the ${p.name} at ${p.integrity}/${p.max}. Break the Loader and it stays down.`, { target: p.id, reboot: true, redeploy: true });
}
// A Package unpacks: it leaves the board, and two Droppers take its place.
function unpack(s, box, why) {
  const e = s.encounter, v = e.virus;
  box.integrity = 0; box.unpacked = true; box.attack = null;
  const hp = Math.max(1, Math.round(BODY.dropper.integrity * scaleOf(v) * (v.roomHp || 1))), dmg = Math.max(1, Math.round(BODY.dropper.amount * (v.power || 1) * (v.roomDmg || 1)));
  const ids = [];
  for (let k = 0; k < 2; k++) { const id = nextId(v, 'dropper'); ids.push(id); fragment(v, id, `Dropper ${id.slice(7)}`, hp, { attack: { name: 'Spray', effect: 'damage', amount: dmg, interval: BODY.dropper.interval, due: e.cycle + 1 } }); }
  emit(s, 'spawn', `${box.name} unpacks${why ? ` ${why}` : ''}. Two Droppers spray ${dmg} every ${BODY.dropper.interval} cycles.`, { source: box.id, target: ids[0], unpacked: true });
  return 'gone';
}
// The Rig vents: its ramp and heat back to nothing (and back to hashing if it had overheated).
function vent(s, p) {
  const e = s.encounter, v = e.virus;
  if (p.attack) p.attack.step = 0;
  const was = v.heat || 0;
  v.heat = 0;
  if (v.overheated) { v.overheated = false; if (p.attack) p.attack.due = e.cycle + p.attack.interval; }
  emit(s, 'cut', `VENTED. You take the ${p.name} across a tick: its Hash drops back to ${p.attack ? p.attack.amount : 0}, and its heat from ${was} to 0.`, { target: p.id, vent: true });
}
// What a tick does on a part whose body has its own verb (interrupt.mjs): vent, or delay the next delivery.
// The part hashing: the Rig, or the Cooler once it has failed over.
const hasherOf = (s) => (s.encounter?.virus?.family === 'cryptominer' ? livingParts(s).find((x) => x.id === 'rig' || (x.tookOver === 'rig' && x.attack)) || null : null);
hooks.tickVerb = (s, p) => (s.encounter.virus.family === 'cryptominer' && p === hasherOf(s) ? 'vent' : s.encounter.virus.family === 'trojan' && p.id === 'loader' ? 'delay' : 'cancel');
hooks.tickDo = (s, p, verb) => {
  if (verb === 'vent') return vent(s, p);
  if (verb === 'delay') {
    const c = livingParts(s).find((x) => x.deliver), down = redeployOf(s);
    if (!c && down) { down.redeployAt += BODY.loader; return emit(s, 'cut', `DELAYED. You take the ${p.name} across a tick: it redeploys the ${down.name} ${BODY.loader} cycles later.`, { target: p.id, delay: true }); }
    if (!c) return emit(s, 'tick-wasted', `The ${p.name} crosses a tick, but nothing is left to deliver.`, { target: p.id, wasted: true });
    c.deliver.due += BODY.loader;
    emit(s, 'cut', `DELAYED. You take the ${p.name} across a tick: the ${c.name}'s next delivery comes ${BODY.loader} cycles later.`, { target: p.id, delay: true });
  }
};
// The strongest skill ready on your bar (never key 1 or SIGINT), or the one you used last.
function wipeTarget(s, how) {
  const e = s.encounter, skip = (id) => ['spike', 'sigint'].includes(id) || !ABILITIES[id];
  if (how === 'last') return e.lastSkill && !skip(e.lastSkill) && usable(s).includes(e.lastSkill) ? e.lastSkill : null;
  const ready = usable(s).filter((id) => !skip(id) && readyIn(s, id) === 0 && !(e.wiped?.[id] >= e.cycle));
  return ready.sort((a, b) => (ABILITIES[b].damage || 0) - (ABILITIES[a].damage || 0) || (ABILITIES[b].cooldown || 0) - (ABILITIES[a].cooldown || 0))[0] || null;
}
function wipe(s, p, atk) {
  const e = s.encounter, id = wipeTarget(s, atk.wipe), n = atk.wipeFor || 3;
  if (!id) return emit(s, 'status', `${atk.name} finds no key to take.`, { source: p.id });
  const until = e.cycle + n;
  // It can't be pressed while wiped, and its cooldown stands still: a skill cooling carries the cycles it had left.
  e.readyAt[id] = e.readyAt[id] > e.cycle ? e.readyAt[id] + n : until + 1;
  (e.wiped ||= {})[id] = until;
  (e.locked ||= {})[id] = until;
  emit(s, 'locked', `${atk.name} lands. ${ABILITIES[id].name} is WIPED off your bar for ${n} cycles.`, { source: p.id, ability: id, cycles: n, wiped: true });
}

// ---------- the hooks (combat.mjs), room fights only ----------
hooks.roomHit = (s, p, was, dealt, opts) => {
  const e = s.encounter;
  // A Package hit while the Loader lives unpacks, whatever hit it.
  if (p.pkg && !p.pkg.inert && livingParts(s).some((x) => x.id === 'loader')) return unpack(s, p, `as ${opts.by || 'your hit'} lands on it`);
  if (p.pkg && p.integrity <= 0 && p.pkg.inert) {
    const [lo, hi] = BODY.payload.credits, n = lo + ((e.seed + e.cycle * 7) % (hi - lo + 1));
    (e.roomsLoot ||= { credits: 0 }).credits += n;
    emit(s, 'loot', `${p.name} breaks open: a Payload Box, ${n} credits.`, { target: p.id, credits: n });
  }
  return null;
};
hooks.roomBroke = (s, p) => {
  const e = s.encounter, v = e.virus;
  if (v.family === 'trojan' && p.id === 'loader') {
    for (const box of livingParts(s).filter((x) => x.pkg)) box.pkg.inert = true;
    const down = redeployOf(s);
    if (down) down.redeployAt = null;
    emit(s, 'status', `With the Loader broken, every Package is an inert box. Break one for a Payload Box.${down ? ` The ${down.name} stays down.` : ''}`, { target: p.id });
  }
  // The Courier breaks while the Loader stands: it's redeployed BODY.redeploy.in cycles later.
  if (v.family === 'trojan' && p.id === 'courier' && livingParts(s).some((x) => x.id === 'loader')) {
    p.redeployAt = e.cycle + BODY.redeploy.in;
    p.redeploy = { deliver: p.deliver ? { ...p.deliver } : p.redeploy?.deliver || null };
    emit(s, 'status', `The Loader will redeploy the ${p.name} in ${BODY.redeploy.in} cycles at half its Integrity. Break the Loader before then and it stays down.`, { target: p.id });
  }
  if (v.family === 'cryptominer' && p.id === 'cooler') {
    const rig = livingParts(s).find((x) => x.id === 'rig');
    if (rig?.attack) { rig.attack.amount = Math.max(1, Math.round(rig.attack.amount * BODY.heat.hard)); rig.attack.rampBy = Math.max(1, Math.round((rig.attack.rampBy || 1) * BODY.heat.hard)); }
    emit(s, 'status', `With the Cooler broken, the Rig heats up ${BODY.heat.hot} a cycle, and every Hash lands 50% harder.`, { target: p.id });
  }
  if (p.deliver) p.deliver = null;
};
hooks.roomLanded = (s, p, atk) => {
  if (atk.wipe) wipe(s, p, atk);
  if (atk.effect === 'replicate' && atk.spawns > 1 && !atk.extra) for (let k = 1; k < atk.spawns; k++) strikeWith(s, p, { ...atk, hit: 0, extra: true, spawns: 1 });
};
hooks.roomIntents = (s, columns) => {
  const e = s.encounter, out = [];
  for (const p of livingParts(s)) {
    if (p.deliver) for (let due = p.deliver.due; due - e.cycle < columns; due += p.deliver.interval) if (due - e.cycle >= 0) out.push({ source: p.id, name: 'Deliver', effect: 'deliver', amount: 0, col: due - e.cycle, hidden: false, kind: p.kind });
    if (p.pkg && !p.pkg.inert && p.pkg.opensAt - e.cycle >= 0 && p.pkg.opensAt - e.cycle < columns) out.push({ source: p.id, name: 'Unpack', effect: 'unpack', amount: 2, col: p.pkg.opensAt - e.cycle, hidden: false, kind: p.kind });
  }
  // A broken Courier's redeploy sits on the Loader's row (the Courier has none while it's down).
  const down = redeployOf(s);
  if (down && livingParts(s).some((x) => x.id === 'loader') && down.redeployAt - e.cycle >= 0 && down.redeployAt - e.cycle < columns) out.push({ source: 'loader', name: 'Redeploy', effect: 'redeploy', amount: Math.max(1, Math.round(down.max * BODY.redeploy.at)), col: down.redeployAt - e.cycle, hidden: false, kind: 'system' });
  return out;
};
// The end of a room fight's cycle: deliveries and unpacking, a Rig's heat, an elite's enrage, a Lab's overheat.
export const ROOM_RULES = {
  enrage: { elite: 9, first: 1.5, step: 1.25, every: 3 }, // an elite still up at cycle 9 hits 50% harder, then a quarter more every 3 (docs/servers.md 8.2)
  overheat: { from: 10, you: 0.02, parts: 0.03 }, // a Lab: from the 10th cycle the rack burns you and every part
};
hooks.roomCycle = (s) => {
  const e = s.encounter, v = e.virus;
  const down = redeployOf(s);
  if (down && down.redeployAt <= e.cycle) { if (livingParts(s).some((x) => x.id === 'loader')) redeploy(s, down); else down.redeployAt = null; }
  for (const p of livingParts(s).filter((x) => x.deliver && x.deliver.due <= e.cycle)) deliver(s, p);
  for (const box of livingParts(s).filter((x) => x.pkg && !x.pkg.inert && x.pkg.opensAt <= e.cycle)) unpack(s, box, 'on its own');
  const rig = hasherOf(s);
  // The Cooler took over the Hash this cycle (combat.mjs fallback): it runs it uncooled, with the climb and the heat
  // the Rig had (an overheated rig stays overheated).
  if (rig && rig.id !== 'rig' && !rig.uncooled) {
    rig.uncooled = true;
    if (v.overheated) rig.attack.due = 999;
    emit(s, 'status', `The ${rig.name} runs the Hash uncooled: it heats up ${BODY.heat.hot} a cycle until it overheats.`, { target: rig.id });
  }
  if (rig) {
    const cooler = livingParts(s).some((x) => x.id === 'cooler' && x !== rig);
    if (!v.overheated) {
      v.heat = Math.min(BODY.heat.at, (v.heat || 0) + Math.round((cooler ? BODY.heat.cooled : BODY.heat.hot) * (v.heatRate || 1)));
      if (v.heat >= BODY.heat.at) { v.overheated = true; if (rig.attack) rig.attack.due = 999; emit(s, 'phase', `The ${rig.name} OVERHEATS. It stops hashing and burns itself every cycle until it breaks.`, { target: rig.id }); }
    } else hit(s, rig, Math.max(1, Math.round(rig.max * BODY.heat.burn)), { by: 'Burnout', pierce: true, server: true });
  }
  const R = ROOM_RULES.enrage;
  if (e.enrageAt && e.cycle >= e.enrageAt && (e.cycle - e.enrageAt) % R.every === 0) {
    const k = e.enraged ? R.step : R.first;
    e.enraged = (e.enraged || 0) + 1;
    for (const p of attackers(s)) { const a = p.attack; if (a.amount && a.effect !== 'scramble') a.amount = Math.round(a.amount * k); if (a.hit) a.hit = Math.round(a.hit * k); }
    emit(s, 'warning', `${v.name} ENRAGES: its attacks deal ${Math.round((k - 1) * 100)}% more.`, {});
  }
  if (e.rooms.kind === 'Lab' && e.cycle >= ROOM_RULES.overheat.from && virusIntegrity(s).current > 0) {
    const d = defender(s), you = Math.min(d.integrity, Math.max(1, Math.round(d.max * ROOM_RULES.overheat.you)));
    d.integrity -= you;
    for (const p of livingParts(s)) hit(s, p, Math.max(1, Math.round(p.max * ROOM_RULES.overheat.parts)), { by: 'Overheat', pierce: true, server: true });
    emit(s, 'server-hit', `Overheat: the rack burns you for ${you}, and every part with you. Signal ${d.integrity}/${d.max}.`, { amount: you, atk: 'Overheat' });
  }
};
// What a room body's part says under its name on the board (view.mjs partTags), as [text, tip, kind].
export function bodyTags(s, p) {
  const e = s.encounter, v = e?.virus, out = [];
  if (!v || !alive(p)) return out;
  if (p.pkg) out.push(p.pkg.inert ? ['inert', 'An inert box: break it for a Payload Box.', ''] : [`opens ${Math.max(0, p.pkg.opensAt - e.cycle)}`, `Unpacks into two Droppers at the end of cycle ${p.pkg.opensAt}, or the moment anything damages it while the Loader lives.`, 'hot']);
  if (p.id === 'loader' && v.family === 'trojan') { const down = redeployOf(s); out.push(down ? [`redeploys in ${Math.max(0, down.redeployAt - e.cycle)}`, `It redeploys the ${down.name} at the end of cycle ${down.redeployAt}, at half its Integrity. Break the Loader before then and the ${down.name} stays down. Its ticks delay the redeploy by ${BODY.loader} cycles.`, 'hot'] : ['loader', `While it lives, any damage to a Package unpacks it, and a broken Courier is redeployed ${BODY.redeploy.in} cycles later at half its Integrity. Its ticks delay the next delivery by ${BODY.loader} cycles.`, 'hot']); }
  if (p === hasherOf(s)) out.push([v.overheated ? 'overheated' : `heat ${v.heat || 0}/${BODY.heat.at}`, v.overheated ? 'It burns itself every cycle until it breaks. Venting it starts it hashing again.' : `At ${BODY.heat.at} it overheats: it stops hashing and burns itself until it breaks. Its ticks vent it: heat and ramp back to nothing.`, v.overheated ? 'you' : 'hot']);
  if (p.attack?.wipe) out.push([p.attack.wipe === 'last' ? 'wipes your last skill' : 'wipes your strongest', p.attack.wipe === 'last' ? `Its Wipe takes the skill you used last off your bar for ${p.attack.wipeFor} cycles.` : `Its Wipe takes your strongest ready skill off your bar for ${p.attack.wipeFor} cycles.`, 'hot']);
  return out;
}
