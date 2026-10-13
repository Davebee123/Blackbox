// Reading a fight (dist/fightread.mjs): the tell chips' tooltips, your gear's conditional rules lit on the HUD when
// they hold, and what a decoded part does (??? until the codex knows it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, livingParts, knowsPart, codexKey, UNIQUES, syncServer } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { RULES, uniqueItem, seeded } from './dist/gear.mjs';
import { tellsOf, tellStart } from './dist/tells.mjs';
import { boardMarkup, hudMarkup } from './dist/view.mjs';
import { tellTip, gearLive, cycleGear, partTip, partCue, partRead } from './dist/fightread.mjs';
import { tellIntents } from './dist/tells.mjs';

Object.assign(CONFIG, { enemyCrit: 0, misses: false });
const at = (level = 12) => { const s = fresh(); s.hackers = { breaker: { level, xp: 0 } }; syncServer(s); s.server.integrity = s.server.max = 5000; return s; };
const engage = (s, { level = 12, family = 'ransomware', seed = 7, set = null } = {}) => {
  selectEncounter(s, 'random', seed, { level, family, mutation: null });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  if (set) { const v = s.encounter.virus; v.tells = null; v.tellSet = set; v.extraTells = 4; tellStart(s); }
  return s;
};
const fight = (o = {}) => engage(at(o.level), o);
const wear = (s, it) => { const x = addItem(s, it); command(s, 'load ' + x.id); assert.ok(loaded(s).some((y) => y.id === x.id), `${it.name} loaded`); return x; };
const rule = (id, value = RULES[id].value?.[1]) => ({ kind: 'protocol', side: 'hacker', group: 'script', base: 'one-liner', rarity: RULES[id].tier === 'minor' ? 'tuned' : 'custom', level: 20, stats: { signal: 1 }, affixes: [], zeroDay: null, unique: null, name: RULES[id].name, rule: id, ruleValue: value });
const quiet = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
// One tell (by id) said now on a part, landing in n cycles; the rest stay quiet.
function tell(s, id, partId, n = 2) {
  const T = tellsOf(s), e = s.encounter;
  for (const t of T.list) { t.told = false; t.after = 999; }
  const t = T.list.find((x) => x.id === id);
  assert.ok(t, `${id} is one of its tells (${T.list.map((x) => x.id)})`);
  const p = part(s, partId);
  if (t.kind === 'charge') p.attack.due = e.cycle + n;
  Object.assign(t, { part: partId, told: true, said: e.cycle, next: e.cycle + n, n: t.kind === 'charge' ? p.attack.n || 0 : null, wound: 0, hitBy: [], after: 999, opened: null, early: null,
    need: t.kind === 'charge' ? Math.max(1, Math.round(T.tier.share * p.max)) : t.kind === 'cast' ? T.tier.castHits : 0 });
  return t;
}
const chipOf = (s) => { const i = tellIntents(s)[0]; return { i, tip: tellTip(s, i, i.col) }; };
const lines = (tip) => tip.split('\n');

test('tell tooltips: the tell\'s name, then what happens if it lands (with its number), then how to stop it and its window; nothing else', () => {
  // A charge: its damage, the after-effect at this tier, and the burst (or ◆) in its window.
  const s = fight({ level: 17 });
  quiet(s);
  const t = tell(s, 'overcharge', 'pulse', 1);
  const { i, tip } = chipOf(s);
  assert.equal(lines(tip).length, 2, tip);
  assert.match(lines(tip)[0], new RegExp(`^Overcharge: Deals ${i.amount} damage to you\\. Leaves you Corrupted and Hung, and your last skill offline for 2 cycles\\.$`));
  assert.match(lines(tip)[1], new RegExp(`^Deal ${t.need} to the Pulse Node, or break 2 ◆ on it\\. Window: next cycle\\.$`));
  // Full Disk: the Encrypt and the burst on top.
  const f = fight(); quiet(f); tell(f, 'fulldisk', 'encryptor', 2);
  assert.match(chipOf(f).tip, /^Full Disk: Adds \d+ to your encryption, and a burst of \d+ damage a cycle for 3 cycles\./);
  assert.match(chipOf(f).tip, /Window: in 2 cycles\.$/);
  // A cast: SIGINT, or its hits, over its two-cycle window.
  const c = fight(); quiet(c); tell(c, 'extortion', 'encryptor', 2);
  assert.match(chipOf(c).tip, /^Double Extortion: Every attack deals 35% more damage for 4 cycles\./);
  assert.match(chipOf(c).tip, /\nSIGINT, or hit the Encryptor twice\. Window: from next cycle until it lands in 2 cycles\.$/);
  // A seal, the Mimic, and the breach's Overclock and Lock.
  const se = fight({ set: ['fulldisk', 'extortion', 'overcharge', 'keyrotation'] }); quiet(se); tell(se, 'keyrotation', 'encryptor', 2);
  const armor = part(se, 'encryptor').armor;
  assert.match(chipOf(se).tip, new RegExp(`^Key Rotation: Re-arms the Encryptor to ${part(se, 'encryptor').maxArmor + 1} ◆, and every stripped part gets 1 ◆ back\\.[^\\n]*\\nStrip its ${armor} ◆ before it lands in 2 cycles\\.$`));
  const oc = fight({ set: ['fulldisk', 'overclock', 'lock'] }); quiet(oc); tell(oc, 'overclock', 'pulse', 1);
  assert.match(chipOf(oc).tip, /^Overclock: Every part takes double damage and every attack comes 1 cycle sooner, for 2 cycles\.\nSIGINT, or hit the Pulse Node twice\. Window: now until it lands next cycle\.$/);
  const lk = fight({ set: ['fulldisk', 'overclock', 'lock'] }); quiet(lk); tell(lk, 'lock', 'encryptor', 2);
  assert.equal(chipOf(lk).tip, 'Lock: Locks the first command you fire after it for 3 cycles, key 1 included.\nBreak the Encryptor before it lands in 2 cycles, or feed it a skill that is cooling anyway.');
  let mi = null;
  for (let seed = 1; seed < 40 && !mi; seed++) { const x = fight({ family: 'ghostroot', seed }); if (x.encounter.virus.parts.some((p) => p.mimic)) mi = x; }
  quiet(mi); tell(mi, 'mimic', mi.encounter.virus.parts.find((p) => p.mimic).id, 2);
  assert.equal(chipOf(mi).tip, 'Mimic: Plays the command you fire then back at you, its whole direct hit.\nFire no direct hit on its beat (in 2 cycles): a debuff, a strip, a burn or a shield.');
  // The chip and its tooltip don't say the same thing twice: the chip has the kind and NOW / in N; the tooltip the window.
  const html = boardMarkup(s, null);
  const chip = html.match(/<div class="intent tell[^>]*>([\s\S]*?)<\/div><\/div>/)[1].replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(chip, /Window/);
  assert.doesNotMatch(tip, /Charged|NOW|in 1\b/);
});

test('in a server room, a tell\'s tooltip offers its part\'s next interrupt tick as the way to stop it', () => {
  const s = fight();
  quiet(s);
  tell(s, 'fulldisk', 'encryptor', 2);
  s.encounter.rooms = { room: 'r', kind: 'Relay' };
  part(s, 'encryptor').ticks = [{ at: 0.5, spent: false }, { at: 0.25, spent: false }];
  assert.match(chipOf(s).tip, /or break 2 ◆ on it, or take it under 50% the cycle it lands\. Window: in 2 cycles\.$/);
  part(s, 'encryptor').ticks[0].spent = true;
  assert.match(chipOf(s).tip, /take it under 25% the cycle it lands/);
  s.encounter.cutBudget = 0;
  assert.doesNotMatch(chipOf(s).tip, /take it under/, 'no interrupts left this fight');
});

test('the gear row: only your equipped rules that wait on a condition, each lit exactly while it holds', () => {
  // Nothing equipped: no row.
  const none = fight();
  assert.deepEqual(gearLive(none), []);
  assert.doesNotMatch(hudMarkup(none), /hud-gear/);
  // Clock Skew lights on odd cycles and only then; Interrupt Handler when a part winds up a tell (on that part);
  // Null Deref on a part with no armor; Signature Scan on the signature part. Stack Canary waits on nothing: not listed.
  const s = at();
  ['clock-skew', 'interrupt-handler', 'null-deref', 'signature-scan'].forEach((id, k) => wear(s, { ...rule(id), group: ['exploit', 'script', 'proxy', 'shell'][k] }));
  engage(s);
  const g = (id) => gearLive(s).find((x) => x.id === 'rule:' + id);
  assert.deepEqual(gearLive(s).map((x) => x.id).sort(), ['rule:clock-skew', 'rule:interrupt-handler', 'rule:null-deref', 'rule:signature-scan']);
  assert.equal(s.encounter.cycle % 2, 1, 'a fight starts on cycle 1');
  assert.ok(g('clock-skew').lit, 'odd cycle: lit');
  assert.match(g('clock-skew').tip, /^Clock Skew: Increases your critical strike chance by \d+% when the cycle is odd\.\nLive now\.$/);
  command(s, 'hold'); resolveCycle(s);
  assert.ok(!g('clock-skew').lit, 'even cycle: dim');
  assert.match(hudMarkup(s), /class="gfx k-cycle" data-fx="rule:clock-skew"/);
  command(s, 'hold'); resolveCycle(s);
  assert.match(hudMarkup(s), /class="gfx k-cycle lit" data-fx="rule:clock-skew"/);
  // Interrupt Handler: dim with no tell, lit on the part winding one up.
  for (const t of tellsOf(s).list) t.told = false;
  assert.ok(!g('interrupt-handler').lit);
  tell(s, 'fulldisk', 'encryptor', 2);
  assert.ok(g('interrupt-handler').lit);
  assert.deepEqual(g('interrupt-handler').parts, ['encryptor']);
  assert.equal(g('interrupt-handler').kind, 'tell');
  // Null Deref: the parts with no ◆. Signature Scan: the Encryptor.
  for (const p of livingParts(s)) p.armor = 1;
  assert.ok(!g('null-deref').lit);
  part(s, 'pulse').armor = 0;
  assert.deepEqual(g('null-deref').parts, ['pulse']);
  assert.deepEqual(g('signature-scan').parts, ['encryptor']);
  // The board marks the parts a lit rule holds on, and the columns a cycle rule is live in.
  const html = boardMarkup(s, null);
  assert.match(html, /data-target="pulse"[\s\S]*?class="gpart" title="Null Deref: live on the Pulse Node now\."/);
  assert.match(html, /data-target="encryptor"[\s\S]*?class="gpart" title="(Interrupt Handler and Signature Scan|Signature Scan and Interrupt Handler): live on the Encryptor now\."/);
  const odd = s.encounter.cycle % 2 === 1;
  assert.deepEqual(cycleGear(s, s.encounter.cycle), odd ? ['Clock Skew'] : []);
  assert.deepEqual(cycleGear(s, s.encounter.cycle + 1), odd ? [] : ['Clock Skew']);
  assert.match(html, new RegExp(`class="gcyc" title="Clock Skew: live on cycle ${s.encounter.cycle + (odd ? 0 : 1)}\\."`));
  // Not worn, not shown.
  const t = at(); wear(t, rule('null-deref')); engage(t);
  assert.deepEqual(gearLive(t).map((x) => x.id), ['rule:null-deref']);
  const u = at(); wear(u, rule('stack-canary')); engage(u);
  assert.deepEqual(gearLive(u), [], 'a rule that waits on nothing is not on the row');
});

test('the gear row: a Sync Window effect lights when you fire in the window, health conditions on your health, and a once-a-fight rule shows spent', () => {
  const s = at();
  wear(s, uniqueItem(UNIQUES['logger-spool'], 20, seeded(3)));
  wear(s, { ...rule('safe-mode'), group: 'proxy' });
  engage(s);
  const g = (pre) => gearLive(s).find((x) => x.id.includes(pre));
  assert.equal(g('logger-spool').kind, 'sync');
  assert.ok(!g('logger-spool').lit);
  s.encounter.synced = true;
  assert.ok(g('logger-spool').lit, 'fired in the window');
  assert.match(hudMarkup(s), /data-if="synced"/, 'app.js lights it while the bar is in the window');
  assert.ok(!g('safe-mode').lit, 'at full health');
  s.server.integrity = 100;
  assert.ok(g('safe-mode').lit, 'below half');
  s.encounter.once['fx:rule:safe-mode'] = true;
  assert.ok(g('safe-mode').spent && !g('safe-mode').lit);
  assert.match(g('safe-mode').tip, /\nSpent this fight\.$/);
});

test('a conditional rule that fires names itself on the hit: a crit from Clock Skew carries its name for the float', () => {
  const s = at();
  CONFIG.baseCrit = 0;
  try {
    wear(s, rule('clock-skew', 100));
    engage(s);
    for (const p of livingParts(s)) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 999, max: 999 });
    quiet(s);
    assert.equal(s.encounter.cycle % 2, 1);
    command(s, 'spike pulse');
    const odd = resolveCycle(s).find((e) => e.type === 'damage' && e.target === 'pulse');
    assert.ok(odd.crit, 'odd cycle: Clock Skew makes it a crit');
    assert.deepEqual(odd.gear, [{ id: 'rule:clock-skew', name: 'Clock Skew' }]);
    command(s, 'spike pulse');
    const even = resolveCycle(s).find((e) => e.type === 'damage' && e.target === 'pulse');
    assert.ok(!even.crit && !even.gear, 'even cycle: a plain hit, nothing named');
  } finally { delete CONFIG.baseCrit; }
});

test('part tooltips: ??? and how to decode it until the codex knows the part, then what it does and how to answer it, and a cue on its row', () => {
  let s = null;
  for (let seed = 1; seed < 20 && !s; seed++) { const x = fight({ seed }); if (x.encounter.virus.parts.some((p) => p.lock)) s = x; }
  const v = s.encounter.virus, mutex = part(s, 'mutex'), enc = part(s, 'encryptor');
  assert.ok(!knowsPart(s, v, mutex));
  assert.equal(partTip(s, v, mutex), 'Mutex: ???\nBreak one to decode what it does.');
  assert.equal(partCue(s, v, mutex), null, 'no cue before it is decoded');
  let html = boardMarkup(s, null);
  assert.match(html, /<div class="bcell bname" title="Mutex: \?\?\?\nBreak one to decode what it does\.">/);
  assert.doesNotMatch(html, /class="pcue"/);
  s.codex = { [codexKey(v, mutex)]: true };
  assert.equal(partTip(s, v, mutex), `Mutex: Locks the Encryptor behind a ${enc.lockMax} shield that takes every hit first. While the Mutex stands, the lock comes back ${CONFIG.mutex.every} cycles after you break it.\nBreak the Mutex first, or break the lock and finish the Encryptor within ${CONFIG.mutex.every} cycles.`);
  html = boardMarkup(s, null);
  assert.match(html, /<span class="pcue" data-link="encryptor">[\s\S]*?locks Encryptor<\/span>/);
  // The rest of the board's parts read from what they are.
  const r = (p) => partRead(s, v, p);
  assert.match(r(enc).does, /^Encrypts you every \d+ cycles\. Each Encrypt adds \d+ damage a cycle until it breaks\./);
  assert.match(r(part(s, 'pulse')).does, /^Hits you for \d+ every 4 cycles\./);
});

test('part reads stay true to the code: a Lockbox\'s cap, a Mirror\'s reboot, a Decoy\'s beat, a Keyring\'s partner, the rooms\' bodies', async () => {
  const { FAMILIES, GUARDS, ROOM_FAMILIES } = await import('./dist/data.mjs');
  await import('./dist/families.mjs');
  const spec = (xs) => xs.map((x) => ({ ...x, max: x.integrity, maxArmor: x.armor, kind: 'system' }));
  const body = (family, xs) => ({ family, parts: spec(xs) });
  const ran = body('ransomware', FAMILIES.ransomware.parts), lockbox = ran.parts.find((p) => p.ward);
  assert.match(partRead(null, ran, lockbox).does, new RegExp(`at most ${Math.round(38 * CONFIG.ward)} Integrity a cycle`));
  const worm = body('worm', FAMILIES.worm.parts);
  assert.match(partRead(null, worm, worm.parts.find((p) => p.twin)).does, /reboots at 40% 3 cycles later, once/);
  const gr = body('ghostroot', FAMILIES.ghostroot.parts);
  assert.match(partRead(null, gr, gr.parts.find((p) => p.reflect)).does, /^Every 4th cycle it mirrors your commands: they deal no damage, and 30% bounces back at you\./);
  const bo = body('bouncer', GUARDS.bouncer.parts);
  assert.equal(partRead(null, bo, bo.parts.find((p) => p.rearm)).cue.text, 're-arms Gate');
  for (const fam of ['trojan', 'cryptominer', 'wiper']) {
    const b = body(fam, ROOM_FAMILIES[fam].parts);
    for (const p of b.parts) assert.ok(partRead(null, b, p).does.length > 20, `${fam} ${p.name}`);
  }
  const tro = body('trojan', ROOM_FAMILIES.trojan.parts);
  assert.match(partRead(null, tro, tro.parts.find((p) => p.id === 'loader')).does, /any damage to a Package unpacks it into two Droppers/);
});
