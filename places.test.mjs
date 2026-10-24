// Place sounds (places.mjs): which floor's or hub's bed plays for a given state, a fight's family idle, which events
// carry a family's attack and break one-shots, the crossfade on a change of place, and the settings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FLOORS } from './dist/data.mjs';
import { FACTIONS } from './dist/factions.mjs';
import { FLOOR_BEDS, HUB_BEDS, FAMILY_SOUNDS, soundOf, LEVEL, FADE, CHIP, LOOP_PAD, LOOP_SECONDS, seal, placeOf, familyCues, realAttack, runFloor, createPlaces } from './dist/places.mjs';

// ---------- states ----------
const loc = (id, floor) => ({ id, name: id.toUpperCase(), slot: `f${floor}s3`, depth: floor });
const base = () => ({ locations: [loc('kessler', 2), loc('vault', 5)], server: { integrity: 100, max: 100 }, run: null, encounter: null });
const onRun = (s, id = 'kessler') => Object.assign(s, { run: { loc: id, integrity: 80, max: 80 } });
const pulse = { id: 'pulse', name: 'Pulse Node' }, special = { id: 'encryptor', name: 'Encryptor' }, frag = { id: 'frag1', name: 'Fragment 1', kind: 'fragment' };
const fight = (s, family = 'ransomware', mode = 'run', extra = {}) => Object.assign(s, { encounter: { phase: 'active', mode, virus: { family, parts: [pulse, special, frag] }, ...extra } });

test('every floor, hub and family file ships in dist/sfx as Ogg, and is credited', () => {
  assert.deepEqual(Object.keys(FLOOR_BEDS).map(Number), FLOORS.map((_, i) => i + 1), 'a bed for each of the eight floors');
  assert.deepEqual(Object.keys(HUB_BEDS).sort(), Object.keys(FACTIONS).filter((f) => FACTIONS[f].hub).sort(), 'a bed for each faction hub');
  assert.deepEqual(Object.keys(FAMILY_SOUNDS).sort(), ['crawler', 'cryptominer', 'exfil', 'ghostroot', 'ice', 'ransomware', 'trojan', 'wiper', 'worm']);
  const files = [...Object.values(FLOOR_BEDS), ...Object.values(HUB_BEDS), ...Object.values(FAMILY_SOUNDS).flatMap((f) => Object.values(f))];
  const credits = fs.readFileSync('dist/sfx/CREDITS.md', 'utf8');
  let total = 0;
  for (const f of files) {
    assert.match(f, /\.ogg$/);
    const buf = fs.readFileSync(`dist/sfx/${f}`);
    assert.equal(buf.subarray(0, 4).toString(), 'OggS', `${f} is an Ogg file`);
    assert.ok(buf.includes('vorbis'), `${f} is Vorbis`);
    assert.ok(credits.includes(f.split('/')[1].replace('.ogg', '').replace(/-(idle|attack|break)$/, '')), `${f} credited`);
    total += buf.length;
  }
  assert.ok(total < 2.5 * 1024 * 1024, `modest: ${Math.round(total / 1024)} KB`);
  for (const dir of ['floors', 'hubs', 'families', 'bodies']) assert.deepEqual(fs.readdirSync(`dist/sfx/${dir}`).sort(), files.filter((f) => f.startsWith(dir + '/')).map((f) => f.split('/')[1]).sort(), `nothing extra in ${dir}/`);
});

test('the bed: the floor on the map, the run\'s floor (and a fight\'s on it), a hub\'s while its session shows; home has none', () => {
  const s = base();
  assert.deepEqual(placeOf(s), { bed: null, family: null }, 'home (any screen but the map): the home bed only');
  for (let n = 1; n <= 8; n++) assert.equal(placeOf(s, { map: n }).bed, FLOOR_BEDS[n], `the map on floor ${n}`);
  assert.equal(placeOf(s, { hub: 'lantern', map: 3 }).bed, HUB_BEDS.lantern, 'a hub takes over from the floor');
  assert.equal(placeOf(s, { hub: 'nobody' }).bed, null, 'no such hub: nothing');
  onRun(s);
  assert.equal(runFloor(s), 2);
  assert.equal(placeOf(s).bed, FLOOR_BEDS[2], 'on a run: its server\'s floor, whatever the screen');
  assert.equal(placeOf(s, { map: 7 }).bed, FLOOR_BEDS[2], 'the run\'s floor, not the map\'s');
  fight(s, 'worm');
  assert.deepEqual(placeOf(s, { map: 7 }), { bed: FLOOR_BEDS[2], family: 'worm' }, 'a fight on the run: the floor, and the family under it');
  assert.equal(placeOf(s, { hub: 'halcyon' }).bed, HUB_BEDS.halcyon);
  onRun(s, 'vault');
  assert.equal(placeOf(s).bed, FLOOR_BEDS[5]);
  onRun(s, 'sprawl');
  assert.equal(placeOf(s).bed, FLOOR_BEDS[1], 'SPRAWL-00 is floor 1');
  s.run.loc = 'breach';
  assert.equal(placeOf(s).bed, null, 'a run off the network (a breach): no floor');
  const home = fight(base(), 'ghostroot', 'home');
  assert.deepEqual(placeOf(home, { map: 4 }), { bed: null, family: 'ghostroot' }, 'a fight at home: the home bed, with the family');
  const noSlot = base(); noSlot.locations.push({ id: 'member', depth: 6 }); onRun(noSlot, 'member');
  assert.equal(placeOf(noSlot).bed, FLOOR_BEDS[6], 'a server with no slot goes by its depth');
});

test('the family idle: only in a live fight, each body its own set, every other guard the ICE\'s', () => {
  for (const f of ['ransomware', 'worm', 'ghostroot', 'cryptominer', 'trojan', 'wiper', 'exfil', 'crawler']) assert.equal(placeOf(fight(base(), f)).family, f);
  for (const f of ['watchdog', 'tracer']) assert.equal(placeOf(fight(base(), f)).family, 'ice', `${f}: the ICE's set`);
  assert.equal(placeOf(fight(base(), null)).family, null, 'a virus with no family: the current sounds');
  const s = fight(base(), 'worm'); s.encounter.phase = 'alert';
  assert.equal(placeOf(s).family, null, 'not before the fight starts');
  s.encounter.phase = 'won';
  assert.equal(placeOf(s).family, null, 'nor after it ends');
});

test('the attack one-shot: a real attack from a part, not chip damage; once a batch', () => {
  const parts = [pulse, special, frag];
  const hit = (amount, x = {}) => ({ type: 'server-hit', source: 'pulse', amount, atk: 'Surge', ...x });
  assert.ok(realAttack(hit(14), parts, 100), 'a Surge for 14 of 100');
  assert.ok(!realAttack(hit(CHIP * 100 - 1), parts, 100), 'under CHIP of your bar: chip');
  assert.ok(realAttack(hit(2, { crit: true }), parts, 100), 'a crit always counts');
  assert.ok(realAttack(hit(3, { tell: 'charge' }), parts, 100), 'a tell always counts');
  assert.ok(!realAttack(hit(30, { source: 'frag1', atk: 'Gnaw' }), parts, 100), 'a fragment gnawing: chip');
  assert.ok(!realAttack(hit(30, { atk: 'Surge echo' }), parts, 100), 'an echo: chip');
  assert.ok(!realAttack(hit(30, { bounce: true }), parts, 100), 'a bounce: chip');
  assert.ok(realAttack({ type: 'encrypt', source: 'encryptor', amount: 4 }, parts), 'an Encrypt landing');
  assert.ok(!realAttack({ type: 'encrypted', amount: 4 }, parts), 'the encryption\'s tick every cycle: not an attack');
  assert.ok(realAttack({ type: 'blind', source: 'encryptor' }, parts), 'a Scramble landing');
  assert.ok(!realAttack({ type: 'scrambled', amount: 9 }, parts), 'your own attack turned on you: not theirs');
  assert.ok(!realAttack(hit(30, { source: 'nobody' }), parts), 'no such part');
  const s = onRun(fight(base(), 'ransomware'));
  const a = hit(20), b = hit(20), chip = hit(1), gnaw = hit(9, { source: 'frag1' }), mate = hit(40, { who: 'm1' });
  let cues = familyCues(s, [gnaw, chip, mate, a, b]);
  assert.deepEqual([...cues.entries()], [[a, { family: 'ransomware', kind: 'attack' }]], 'the first real one only; chip, a gnaw and a hit on a crewmate have none');
  assert.equal(familyCues(s, [hit(5)]).size, 1, 'a run measures by your Signal (5 of 80)');
  assert.equal(familyCues(s, [hit(3)]).size, 0);
});

test('the break one-shot: a part of the family breaking, the last one too; not other fights', () => {
  const s = fight(base(), 'ghostroot', 'home');
  const br = { type: 'broken', target: 'pulse' }, br2 = { type: 'broken', target: 'encryptor', who: 'm1' };
  assert.deepEqual([...familyCues(s, [br, br2]).values()], [{ family: 'ghostroot', kind: 'break' }], 'once a batch');
  assert.equal(familyCues(s, [br2]).size, 1, 'a part a crewmate breaks still breaks');
  s.encounter.phase = 'won';
  assert.equal(familyCues(s, [br]).size, 1, 'the batch that wins the fight keeps its break');
  s.encounter.phase = 'alert';
  assert.equal(familyCues(s, [br]).size, 0);
  assert.equal(familyCues(fight(base(), 'cryptominer'), [br]).size, 1, 'a room body breaks with its own set');
  assert.equal(familyCues(fight(base(), null), [br]).size, 0, 'no family: the current break only');
  assert.equal(familyCues(base(), [br]).size, 0, 'no fight');
});

// ---------- the player, on a pretend AudioContext ----------
function fakeAudio() {
  const log = [];
  const param = (v) => ({ value: v, ramps: [], cancelScheduledValues() {}, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x, t) { this.ramps.push([x, t]); this.value = x; }, setTargetAtTime() {} });
  const node = () => ({ connect(n) { return n; }, disconnect() {} });
  const ctx = {
    state: 'suspended', currentTime: 10, destination: node(), listeners: [],
    addEventListener(k, f) { if (k === 'statechange') this.listeners.push(f); },
    unlock() { this.state = 'running'; for (const f of this.listeners) f(); },
    createGain() { return { ...node(), gain: param(1) }; },
    createBufferSource() { const s = { ...node(), started: null, stopped: false, start(t, off) { s.started = [t, off]; }, stop() { s.stopped = true; } }; log.push(s); return s; },
    decodeAudioData: async (ab) => { const sr = 44100, n = ab.n; const ch = [new Float32Array(n), new Float32Array(n)]; return { sampleRate: sr, length: n, duration: n / sr, numberOfChannels: 2, getChannelData: (c) => ch[c], url: ab.url }; },
  };
  const fetched = [];
  // a decoded file: the loop, its pads, and a few ms more at the end (as Chromium's Vorbis decoder hands back)
  const fetchFn = async (href) => { const f = href.replace(/^.*\/sfx\//, ''); fetched.push(f); return { ok: true, arrayBuffer: async () => ({ n: Math.round(44100 * ((LOOP_SECONDS[f.split('/')[0]] || 1) + 2 * LOOP_PAD + 0.013)), url: href }) }; };
  return { ctx, log, fetched, fetchFn };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

test('nothing loads or plays before audio is unlocked, with Sound off, or with Places at 0', async () => {
  const A = fakeAudio(), P = createPlaces(() => A.ctx, { fetchFn: A.fetchFn });
  P.set({ on: true, bed: FLOOR_BEDS[3], family: null });
  await settle();
  assert.deepEqual(A.fetched, [], 'locked: nothing fetched');
  A.ctx.unlock(); await settle();
  assert.deepEqual(A.fetched, [FLOOR_BEDS[3]], 'the first click or key: it loads, lazily, and plays');
  assert.equal(P.playing().bed, FLOOR_BEDS[3]);
  P.set({ on: false }); await settle();
  assert.equal(P.playing().bed, null, 'Sound off: it fades away');
  const B = fakeAudio(); B.ctx.unlock();
  const Q = createPlaces(() => B.ctx, { fetchFn: B.fetchFn });
  Q.volumes({ places: 0 });
  Q.set({ on: true, bed: FLOOR_BEDS[1], family: 'worm' }); await settle();
  assert.deepEqual(B.fetched, [], 'Places at 0: off, nothing fetched');
  Q.volumes({ places: 0.5 }); await settle();
  assert.deepEqual(B.fetched.sort(), [FAMILY_SOUNDS.worm.idle, FLOOR_BEDS[1]].sort(), 'turned up: the bed and the family idle');
  Q.shot('worm', 'attack'); Q.set({ on: false }); Q.shot('worm', 'break'); await settle();
  assert.ok(!B.fetched.includes(FAMILY_SOUNDS.worm.break), 'no one-shot with Sound off');
});

test('a change of floor crossfades over FADE; loops play between the pads; each file is decoded once', async () => {
  const A = fakeAudio(); A.ctx.unlock();
  const shots = [];
  const P = createPlaces(() => A.ctx, { fetchFn: A.fetchFn, clip: (buf, gain) => shots.push([buf.url.replace(/^.*\/sfx\//, ''), gain]) });
  P.set({ on: true, bed: FLOOR_BEDS[1] }); await settle();
  const first = A.log[0];
  assert.equal(first.loop, true, 'a Web Audio loop, not an <audio loop>');
  assert.equal(first.loopStart, LOOP_PAD);
  assert.ok(Math.abs(first.loopEnd - (LOOP_PAD + LOOP_SECONDS.floors)) < 1e-9, 'between the pads, by the loop\'s length, not the file\'s');
  assert.deepEqual(first.started, [10, LOOP_PAD]);
  P.set({ bed: FLOOR_BEDS[2] }); await settle();
  assert.equal(P.playing().bed, FLOOR_BEDS[2]);
  assert.equal(A.log.length, 2, 'the new floor started');
  P.set({ bed: FLOOR_BEDS[1] }); await settle();
  assert.equal(A.fetched.filter((f) => f === FLOOR_BEDS[1]).length, 1, 'back to floor 1: decoded once, from the cache');
  P.set({ bed: FLOOR_BEDS[1] }); await settle();
  assert.equal(A.log.length, 3, 'the same place again: nothing restarts');
  P.set({ family: 'ransomware' }); await settle();
  assert.equal(P.playing().family, FAMILY_SOUNDS.ransomware.idle);
  P.shot('ransomware', 'attack'); P.shot('ransomware', 'break'); P.shot('nonesuch', 'attack'); await settle();
  assert.deepEqual(shots, [[FAMILY_SOUNDS.ransomware.attack, LEVEL.shot], [FAMILY_SOUNDS.ransomware.break, LEVEL.shot]], 'one-shots through the effects chain; none for other families');
  P.set({ family: null }); await settle();
  assert.equal(P.playing().family, null, 'the fight over: the idle fades');
});

test('the crossfade\'s gain ramps: out to 0 and in to the level, both over FADE; ducking dips and recovers', async () => {
  const A = fakeAudio(); A.ctx.unlock();
  const gains = [];
  const mk = A.ctx.createGain.bind(A.ctx);
  A.ctx.createGain = () => { const g = mk(); gains.push(g); return g; };
  const P = createPlaces(() => A.ctx, { fetchFn: A.fetchFn });
  P.set({ on: true, bed: FLOOR_BEDS[4], family: 'ghostroot' }); await settle();
  // gains: [out, bed gain, bed duck, family gain, family duck] (the order they're made in)
  const bedIn = gains.find((g) => g.gain.ramps.some(([v]) => v === LEVEL.floor));
  const famIn = gains.find((g) => g.gain.ramps.some(([v]) => v === LEVEL.family));
  assert.ok(bedIn && famIn, 'each fades in to its own level');
  assert.deepEqual(bedIn.gain.ramps.at(-1), [LEVEL.floor, 10 + FADE]);
  P.set({ bed: HUB_BEDS.kestrel }); await settle();
  assert.deepEqual(bedIn.gain.ramps.at(-1), [0, 10 + FADE], 'the floor fades out over FADE');
  const hubIn = gains.find((g) => g.gain.ramps.some(([v]) => v === LEVEL.hub));
  assert.deepEqual(hubIn.gain.ramps.at(-1), [LEVEL.hub, 10 + FADE], 'the hub fades in over FADE, at the same time');
  P.duck();
  const ducks = gains.filter((g) => g.gain.ramps.length >= 2 && g.gain.ramps.at(-1)[0] === 1);
  assert.ok(ducks.length >= 2, 'the bed and the idle dip and come back');
  assert.ok(ducks.some((g) => g.gain.ramps.at(-2)[0] < 0.5), 'the family idle dips furthest');
});

test('a loop\'s seam: its first few ms blend in from the decoder\'s own continuation past its end', () => {
  const sr = 1000, pad = Math.round(LOOP_PAD * sr), n = 6 * sr, len = pad + n + pad + 13;
  const d = Float32Array.from({ length: len }, (_, i) => Math.sin((2 * Math.PI * 30 * i) / n) + (i >= pad + n ? 0.01 : 0)); // periodic, the pad decoded a little differently
  const buf = { sampleRate: sr, length: len, numberOfChannels: 1, getChannelData: () => d };
  const before = d[pad + 45];
  seal(buf, 6);
  assert.equal(d[pad], d[pad + n], 'the sample after the loop\'s end is the one the decoder had there');
  assert.ok(Math.abs(d[pad + 1] - d[pad + n + 1]) < 0.001, 'and it eases back to the loop over a few ms');
  assert.equal(d[pad + 45], before, 'past the blend, untouched');
  assert.equal(seal(buf, null), buf, 'a one-shot is left alone');
});

test('the System page has a Places slider beside the others, 80 by default', async () => {
  const { fresh } = await import('./dist/combat.mjs');
  const { systemMarkup, volumesOf } = await import('./dist/view.mjs');
  const s = fresh();
  assert.equal(volumesOf(s).places, 0.8);
  const html = systemMarkup(s);
  assert.deepEqual([...html.matchAll(/data-volume="(\w+)"/g)].map((m) => m[1]), ['music', 'ambience', 'places', 'sfx']);
  s.settings.volume = { places: 0 };
  assert.equal(volumesOf(s).places, 0);
  assert.equal(volumesOf(s).music, 0.8, 'the others keep their defaults');
});

// The designer heard Ghostroot alone: half the fights on Ransomware and Worm servers were bodies with no set (a
// Cryptominer, a Trojan, a Crawler nest, a guard). Every fight a server's rooms make now carries one.
test('every body a server room fights has a set: the families, the room bodies, the Crawler and the ICE', async () => {
  const { ROOM_FAMILIES, GUARDS, FAMILIES } = await import('./dist/data.mjs');
  await import('./dist/families.mjs');
  for (const f of [...Object.keys(FAMILIES), ...Object.keys(ROOM_FAMILIES), ...Object.keys(GUARDS)]) assert.ok(soundOf(f), `${f} has a set`);
  assert.equal(soundOf('crawler'), 'crawler');
  for (const g of Object.keys(GUARDS).filter((x) => x !== 'crawler')) assert.equal(soundOf(g), 'ice', `${g}: the ICE's set`);
  assert.equal(soundOf('nonesuch'), null);
});
