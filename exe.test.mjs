// .exe builds (dist/exe.mjs, GAME_RULES.md "Viruses"): from floor 4 a wild virus's part can come as its .exe, the same
// part with its rule harder or bent. The roll, the builds' rules in a fight, and the board's red .exe.
import test from 'node:test';
import assert from 'node:assert/strict';
import './dist/families.mjs'; // the Cryptominer's and the Wiper's rules (the Rig's heat, the Wipe)
import { fresh, selectEncounter, command, resolveCycle, part, livingParts, hit, timersHidden, active } from './dist/combat.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { floorWeight, PARTS } from './dist/parts.mjs';
import { CLASHES } from './dist/genes.mjs';
import { mimicLands, tellsOf } from './dist/tells.mjs';
import { FAMILIES, CONFIG, createVirus, FLOORS } from './dist/data.mjs';
import { EXE, exeShare, rollExe } from './dist/exe.mjs';
import { boardMarkup } from './dist/view.mjs';
import { partRead } from './dist/fightread.mjs';

const fight = (level, family, { basic = 'pulse', genes = [], exe = [] } = {}) => {
  const s = fresh(); s.metAll = true; s.hackers = { [s.loadout.archetype]: { level, xp: 0 } };
  selectEncounter(s, 'random', 77, { level, family, basic, genes, exe, mutation: null, quiet: true });
  command(s, 'engage');
  s.encounter.soft = 1;
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 99;
  return s;
};
const step = (s, text = 'hold') => { command(s, text); return resolveCycle(s); };
const FAMS = ['ransomware', 'worm', 'ghostroot', 'cryptominer', 'wiper'];

test('every build is a real basic or third, and says what it changes', () => {
  const ids = new Set(Object.values(FAMILIES).flatMap((f) => f.parts.map((p) => p.id)));
  for (const [id, b] of Object.entries(EXE)) {
    assert.ok(ids.has(id), `${id} is a part`);
    assert.ok(['stronger', 'different'].includes(b.kind), id);
    assert.match(b.what, /^[A-Z].*\.$/, `${id}: a whole sentence`);
  }
  const kinds = Object.values(EXE).map((b) => b.kind);
  assert.ok(kinds.filter((k) => k === 'different').length >= 5, 'a mix: some bend the rule, not only turn it up');
});

test('the roll: none above floor 4, more each floor down, and an elite there brings at least one', () => {
  assert.equal(exeShare(3), 0);
  assert.ok(exeShare(4) > 0 && exeShare(8) > exeShare(4));
  const count = (floor, opts = {}) => {
    let n = 0;
    for (let seed = 1; seed <= 200; seed++) { const L = FLOORS[floor - 1].band[0] + 2, v = createVirus('random', seed, { family: FAMS[seed % 5], threat: L + 9, floor, ...opts }); n += v.parts.some((p) => p.exe) ? 1 : 0; }
    return n;
  };
  assert.equal(count(3), 0, 'floor 3: none');
  const f4 = count(4), f8 = count(8);
  assert.ok(f4 > 15 && f8 > f4, `floor 4 ${f4}, floor 8 ${f8} of 200`);
  let elites = 0, able = 0;
  for (let seed = 1; seed <= 200; seed++) { const v = createVirus('random', seed, { family: FAMS[seed % 5], threat: 30, floor: 4, elite: true }); if (v.parts.some((p) => EXE[p.id] || (p.copy && EXE[p.id.slice(0, -1)]))) { able++; elites += v.parts.some((p) => p.exe) ? 1 : 0; } }
  assert.equal(elites, able, 'every elite from floor 4 that has a part with a build');
  // A part you've never met never comes as its .exe.
  assert.deepEqual(rollExe({ ids: ['lockbox', 'buffer'], floor: 8, rand: () => 0, met: (i) => i === 1 }), ['buffer']);
  assert.deepEqual(rollExe({ ids: ['lockbox'], floor: 8, rand: () => 0.99, met: () => false, sure: true }), []);
});

test('Repeater.exe: a volley of three, each at 80%; the board draws its .exe red, with what it changes', () => {
  const a = fight(30, 'worm', { basic: 'repeater' }), b = fight(30, 'worm', { basic: 'repeater', exe: ['repeater'] });
  const p0 = part(a, 'repeater'), p = part(b, 'repeater');
  assert.equal(p.name, 'Repeater.exe');
  assert.equal(p.taps, 3);
  assert.ok(Math.abs(p.attack.amount - Math.round(p0.attack.amount * 0.8)) <= 1);
  assert.match(boardMarkup(b), /<span class="pexe" title="[^"]*A harder build of the Repeater\.[^"]*">\.exe<\/span>/);
  assert.equal(EXE.pulse, undefined, 'the Pulse Node stays the plain one');
});

test('Lockbox.exe caps its partner at 15% a cycle, Mutex.exe relocks in 2, Zip Bomb.exe fuses in 1', () => {
  const s = fight(22, 'ransomware', { genes: ['ward'], exe: ['lockbox'] }), enc = part(s, 'encryptor');
  enc.armor = 0; enc.patchAt = 99;
  const hp = enc.integrity, r = hit(s, enc, 999, { mine: true });
  assert.equal(hp - enc.integrity, Math.max(1, Math.round(enc.max * 0.15)), `capped (${r.dealt})`);
  assert.match(partRead(s, s.encounter.virus, part(s, 'lockbox')).does, new RegExp(`at most ${Math.round(enc.max * 0.15)} Integrity a cycle`));
  const m = fight(22, 'ransomware', { genes: ['mutexlock'], exe: ['mutex'] }), e2 = part(m, 'encryptor');
  e2.armor = 0; e2.patchAt = 99;
  assert.ok(e2.lockHp > 0, 'locked');
  hit(m, e2, e2.lockHp * 3, { mine: true });
  assert.equal(e2.lockAt, m.encounter.cycle + 2);
  const z = fight(22, 'ransomware', { genes: ['zipbomb'], exe: ['zipbomb'] }), zb = part(z, 'zipbomb');
  zb.integrity = 1; zb.armor = 0;
  const c0 = z.encounter.cycle;
  step(z, 'spike zipbomb');
  assert.equal(zb.fuseAt, c0 + 1, 'a 1-cycle fuse');
});

test('Limiter.exe caps every part while it stands; Front End.exe fronts bare', () => {
  const s = fight(22, 'ransomware', { genes: ['limiter'], exe: ['limiter'] }), enc = part(s, 'encryptor'), lim = part(s, 'limiter');
  enc.armor = 0; enc.patchAt = 99;
  const hp = enc.integrity;
  hit(s, enc, 999, { mine: true });
  assert.equal(hp - enc.integrity, Math.max(1, Math.round(enc.max * lim.limit)), 'capped by the Limiter.exe');
  lim.integrity = 0;
  const hp2 = enc.integrity, cap = Math.round(enc.max * lim.limit);
  hit(s, enc, cap * 3, { mine: true });
  assert.ok(hp2 - enc.integrity > cap, 'broken, the cap is gone');
  const f = fight(22, 'ghostroot', { genes: ['frontend'], exe: ['frontend'] }), fe = part(f, 'frontend'), sc = part(f, 'scrambler');
  fe.armor = 0; fe.patchAt = 99; sc.armor = 0; sc.patchAt = 99;
  const scHp = sc.integrity, feHp = fe.integrity;
  step(f, 'spike scrambler');
  assert.equal(sc.integrity, scHp, 'bare, it still takes the hit');
  assert.ok(fe.integrity < feHp);
});

test('Hotspot.exe: a burn sets it off; Obfuscator.exe: Tag reveals nothing', () => {
  const s = fight(22, 'ransomware', { genes: ['hotspot'], exe: ['hotspot'] }), h = part(s, 'hotspot'), pulse = part(s, 'pulse');
  pulse.attack.due = s.encounter.cycle + 3;
  hit(s, h, 3, { dot: true });
  assert.equal(h.hotAt, s.encounter.cycle, 'the burn set it off');
  const g = fight(22, 'ghostroot', { basic: 'obfuscator', exe: ['obfuscator'] }), sc = part(g, 'scrambler');
  sc.taggedUntil = g.encounter.cycle + 5;
  assert.ok(timersHidden(g, sc), 'Tagged, its timers still hide');
});

test('Tripwire.exe: loud parts attack 2 cycles sooner; C2 Node.exe: fragments gnaw 100% harder', () => {
  const s = fight(22, 'ransomware', { genes: ['tripwire'], exe: ['tripwire'] }), pulse = part(s, 'pulse'), tw = part(s, 'tripwire');
  pulse.attack.due = s.encounter.cycle + 4;
  const due = pulse.attack.due, interval = pulse.attack.interval;
  tw.armor = 0; tw.integrity = 1;
  hit(s, tw, 50, { mine: true });
  assert.ok(pulse.loud);
  assert.equal(pulse.attack.due, due - 2);
  assert.equal(pulse.attack.interval, Math.max(2, interval - 2));
  const w = fight(22, 'worm', { genes: ['c2'], exe: ['c2'] });
  assert.equal(part(w, 'c2').gnaw, 1);
  assert.ok(CONFIG.c2.gnaw < 1);
});

test('each build reads its own numbers: research and the Codex are the part\'s (its id stays)', () => {
  for (const [fam, gene, id] of [['ransomware', 'ward', 'lockbox'], ['worm', 'twin', 'mirror'], ['ghostroot', 'decoymirror', 'decoy'], ['ransomware', 'idletimer', 'idletimer']]) {
    const s = fight(22, fam, { genes: [gene], exe: [id] }), p = part(s, id);
    assert.ok(p, `${id} keeps its id`);
    assert.ok(p.name.endsWith('.exe'));
  }
  assert.equal(part(fight(22, 'ghostroot', { genes: ['decoymirror'], exe: ['decoy'] }), 'decoy').reflect, 3);
  assert.equal(part(fight(22, 'worm', { genes: ['twin'], exe: ['mirror'] }), 'replicator').rebootMax, 2);
});

// Batch 2: the signatures and the rest of the thirds.
const dueNow = (s, p) => { for (const x of livingParts(s)) if (x.attack) x.attack.due = 99; p.attack.due = s.encounter.cycle; };

test('Replicator.exe hatches two; Encryptor.exe leaves your encryption on, a step lighter each cycle', () => {
  const w = fight(22, 'worm', { exe: ['replicator'] });
  dueNow(w, part(w, 'replicator')); step(w);
  assert.equal(livingParts(w).filter((x) => x.kind === 'fragment').length, 2);
  const s = fight(22, 'ransomware', { exe: ['encryptor'] }), en = part(s, 'encryptor');
  dueNow(s, en); step(s); dueNow(s, en); step(s);
  const stack = s.encounter.encrypt;
  assert.ok(stack >= 2 * en.attack.amount, 'two Encrypts on');
  assert.ok(stack > 0);
  Object.assign(en, { armor: 0, integrity: 1, patchAt: 99 });
  step(s, 'spike encryptor');
  assert.equal(s.encounter.drain, en.attack.amount, 'broken, it drains');
  assert.equal(s.encounter.encrypt, stack - en.attack.amount, 'one step lighter after the tick');
});

test('Scrambler.exe backfires at full; Rig.exe blows at 100 heat and vents; Degausser.exe wipes two', () => {
  const g = fight(22, 'ghostroot', { exe: ['scrambler'] });
  dueNow(g, part(g, 'scrambler')); step(g);
  assert.equal(g.encounter.scrambleSelf, 1);
  const c = fight(22, 'cryptominer', { exe: ['rig'] }), rig = part(c, 'rig');
  for (const x of livingParts(c)) if (x.attack) x.attack.due = 99;
  c.encounter.virus.heat = 95;
  step(c);
  assert.equal(c.encounter.virus.heat, 0, 'vented');
  assert.equal(rig.fuseAt, c.encounter.cycle, 'its fuse lit, for next cycle');
  const hp = c.server.integrity, rhp = rig.integrity;
  step(c);
  assert.ok(rig.fused && c.server.integrity < hp && rig.integrity < rhp, 'the blast hits both sides');
  const w = fight(30, 'wiper', { exe: ['degausser'] });
  dueNow(w, part(w, 'degausser')); step(w);
  assert.equal(Object.keys(w.encounter.wiped || {}).length, 2);
});

test('Prism.exe: a cut stops only that hit; Damper.exe drops two kinds; Cold Store.exe thaws harder', () => {
  const g = fight(22, 'ghostroot', { basic: 'prism', exe: ['prism'] }), pr = part(g, 'prism');
  assert.ok(pr.cutOne && pr.taps === 3);
  const w = fight(30, 'wiper', { genes: ['damper'], exe: ['damper'] }), d = part(w, 'damper');
  assert.ok(d.damperKind2 && d.damperKind2 !== d.damperKind);
  const s = fight(30, 'ransomware', { genes: ['coldstore'], exe: ['coldstore'] }), cs = part(s, 'coldstore');
  for (const x of livingParts(s)) if (x.attack) x.attack.due = 99;
  const armor = cs.armor, T = cs.thawAt;
  while (s.encounter.cycle <= T && active(s)) step(s);
  assert.ok(cs.thawed);
  assert.equal(cs.armor, armor + 1, 'one more ◆');
  assert.equal(cs.attack.due, T + 1, 'its Chill the next cycle');
});

test('Mimic.exe on a hold plays back your last command; the plain Mimic copies nothing', () => {
  for (const exe of [true, false]) {
    const s = fight(22, 'ghostroot', { genes: ['mimic'], exe: exe ? ['mimic'] : [] }), m = part(s, 'mimic'), pulse = part(s, 'pulse');
    for (const x of livingParts(s)) if (x.attack) x.attack.due = 99;
    pulse.armor = 0; pulse.patchAt = 99;
    s.encounter.cmdLog = [{ id: 'spike', cycle: s.encounter.cycle - 1, target: 'pulse' }];
    s.encounter.lastCmd = { id: 'hold', cycle: s.encounter.cycle };
    const t = tellsOf(s).list.find((x) => x.kind === 'mimic');
    assert.ok(t, 'its beat');
    const hp = s.server.integrity;
    assert.doesNotThrow(() => mimicLands(s, t, m));
    assert.equal(s.server.integrity < hp, exe, exe ? 'the .exe plays key 1 back' : 'nothing to copy');
  }
});

test('the lever builds: Twin Rig.exe, Recycle Bin.exe, Packer.exe and Mimic.exe carry theirs', () => {
  assert.equal(part(fight(22, 'cryptominer', { genes: ['twinrig'], exe: ['twinrig'] }), 'twinrig').twinBonus, 3);
  assert.ok(part(fight(30, 'wiper', { genes: ['recyclebin'], exe: ['recyclebin'] }), 'recyclebin').binCool);
  for (const [gene, id] of [['packer', 'packer'], ['mimic', 'mimic']]) assert.equal(part(fight(22, 'ghostroot', { genes: [gene], exe: [id] }), id).name, `${EXE[id] && id === 'packer' ? 'Packer' : 'Mimic'}.exe`);
});

test('echoes: a floor\'s natives come back four floors down, weighted up, always as their .exe', () => {
  assert.equal(floorWeight('zipbomb', 1), PARTS.floor);
  assert.equal(floorWeight('zipbomb', 5), PARTS.echo.weight);
  assert.equal(floorWeight('zipbomb', 4), 1);
  let seen = 0, exe = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const v = createVirus('random', seed, { family: 'ransomware', threat: 36, floor: 5 }), z = v.parts.find((p) => p.id === 'zipbomb' || p.id === 'hotspot');
    if (z) { seen++; exe += z.exe ? 1 : 0; }
  }
  assert.ok(seen > 10 && exe === seen, `floor 5: ${seen} Zip Bombs and Hotspots, ${exe} as .exe`);
});

test('from floor 6 an elite\'s clash comes as its .exe builds', () => {
  const PART = { zipbomb: 'zipbomb', mimic: 'mimic', tripwire: 'tripwire', ward: 'lockbox', decoymirror: 'decoy' }; // a clash's genes as parts (its tells have none)
  let n = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const v = createVirus('random', seed, { family: FAMS[seed % 3], threat: 40, floor: 6, elite: true }), c = CLASHES.find((x) => x.id === v.clash);
    for (const p of c ? v.parts.filter((x) => [PART[c.a], PART[c.b]].includes(x.id)) : []) { assert.ok(p.exe, `${v.name}: ${p.name}`); n++; }
  }
  assert.ok(n > 20, `${n} clash parts checked`);
});

test('an .exe part broken: one more component, and its Codex card names the build from then on', () => {
  const s = fight(22, 'ransomware', { genes: ['ward'], exe: ['lockbox'] }), lb = part(s, 'lockbox');
  s.met = { ransomware: true }; s.research['ransomware:lockbox'] = 15;
  assert.doesNotMatch(codexPageMarkup(s, 'family:ransomware'), /cxp-exe/, 'hidden until you break one');
  const was = s.components || 0;
  Object.assign(lb, { armor: 0, integrity: 1, patchAt: 99 });
  for (const x of livingParts(s)) if (x.attack) x.attack.due = 99;
  step(s, 'spike lockbox');
  assert.ok((s.components || 0) >= was + 1);
  assert.equal(s.exeSeen?.lockbox, true);
  assert.match(codexPageMarkup(s, 'family:ransomware'), /cxp-exe[^>]*><span class="pexe">\.exe<\/span> Floor 4\+: Its ward caps/);
});
