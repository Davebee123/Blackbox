// Reading a fight (dist/fightread.mjs): the tell chips' tooltips, your gear's conditional rules lit on the HUD when
// they hold, and what a part does by its research (??? until decoded, research.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, livingParts, knowsPart, codexKey, UNIQUES, syncServer } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { RULES, uniqueItem, seeded } from './dist/gear.mjs';
import { tellsOf, tellStart } from './dist/tells.mjs';
import { boardMarkup, hudMarkup, forecast } from './dist/view.mjs';
import { tellTip, gearLive, cycleGear, partTip, partCue, partRead, partLinks } from './dist/fightread.mjs';
import { tellIntents } from './dist/tells.mjs';

Object.assign(CONFIG, { enemyCrit: 0, misses: false });
const at = (level = 12) => { const s = fresh(); s.hackers = { breaker: { level, xp: 0 } }; syncServer(s); s.server.integrity = s.server.max = 5000; return s; };
// A fight with no seed given is the family's Pulse Node and signature (the parts roll, dist/parts.mjs, would pick its
// basic); a seed given rolls the virus as the game does (the searches below look for a third part that way).
const engage = (s, { level = 12, family = 'ransomware', seed, set = null } = {}) => {
  selectEncounter(s, 'random', seed ?? 7, { level, family, mutation: null, ...(seed == null ? { basic: 'pulse' } : {}) });
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
  Object.assign(t, { part: partId, told: true, said: e.cycle, next: e.cycle + n, n: t.kind === 'charge' ? p.attack.n || 0 : null, after: 999, opened: null });
  return t;
}
const chipOf = (s) => { const i = tellIntents(s)[0]; return { i, tip: tellTip(s, i, i.col) }; };
const lines = (tip) => tip.split('\n');

test('tell tooltips: the tell\'s name, then what happens if it lands (with its number), then how to stop it and when; nothing else', () => {
  // A charge: its damage, the after-effect at this tier, and the cut on its cycle.
  const s = fight({ level: 17, set: ['fulldisk', 'extortion', 'overcharge'] });
  quiet(s);
  tell(s, 'overcharge', 'pulse', 1);
  const pa = part(s, 'pulse').armor;
  const { i, tip } = chipOf(s);
  assert.equal(lines(tip).length, 2, tip);
  assert.match(lines(tip)[0], new RegExp(`^Overcharge: Deals ${i.amount} damage to you\\. Leaves you Corrupted\\. Takes your last skill offline for 1 cycle\\.$`)); // R1: lighter after-effects (TELL.tiers)
  assert.equal(lines(tip)[1], `▸ Take the Pulse Node under 50% next cycle${pa ? `, past its ${pa} ◆` : ''}, or SIGINT it.`, 'the answer on its own ▸ line (app.js draws it muted)');
  // Full Disk: the Encrypt and the burst on top.
  const f = fight(); quiet(f); tell(f, 'fulldisk', 'encryptor', 2);
  assert.match(chipOf(f).tip, /^Full Disk: Adds \d+ to your encryption\. Deals a burst of \d+ damage to you every cycle for 3 cycles\./);
  assert.match(chipOf(f).tip, /\n▸ Take the Encryptor under 50% in 2 cycles(, past its \d+ ◆)?\.$/, 'below 17 SIGINT stops casts only');
  // A cast: SIGINT, or a cut, over its two-cycle window.
  const c = fight({ set: ['fulldisk', 'extortion'] }); quiet(c); tell(c, 'extortion', 'encryptor', 2);
  assert.match(chipOf(c).tip, /^Double Extortion: Every attack deals 35% more damage for 4 cycles\./);
  assert.match(chipOf(c).tip, / Can be interrupted from next cycle until it lands in 2 cycles\.\n▸ SIGINT it, or take the Encryptor under 50%\.$/);
  // A seal, the Mimic, and the breach's Overclock and Lock.
  const se = fight({ set: ['fulldisk', 'extortion', 'overcharge', 'keyrotation'] }); quiet(se); tell(se, 'keyrotation', 'encryptor', 2);
  const armor = part(se, 'encryptor').armor;
  assert.match(chipOf(se).tip, new RegExp(`^Key Rotation: Gives every part 1 ◆ back for each ◆ the Encryptor still wears when it lands, never past a part's max\\. That is ${armor} ◆ a part now, \\d+ in all\\.[^\\n]* Fails if the Encryptor wears no ◆\\.\\n▸ Strip its ${armor} ◆ before it lands in 2 cycles\\.$`));
  const oc = fight({ set: ['fulldisk', 'overclock', 'lock'] }); quiet(oc); tell(oc, 'overclock', 'pulse', 1);
  assert.match(chipOf(oc).tip, /^Overclock: For 2 cycles, every part takes double damage and every attack comes 1 cycle sooner\. Can be interrupted now until it lands next cycle\.\n▸ SIGINT it, or take the Pulse Node under 50%\.$/);
  const lk = fight({ set: ['fulldisk', 'overclock', 'lock'] }); quiet(lk); tell(lk, 'lock', 'encryptor', 2);
  assert.equal(chipOf(lk).tip, 'Lock: Locks the first command you fire after it for 3 cycles, key 1 included.\n▸ Break the Encryptor first, or feed it a skill already cooling.');
  let mi = null;
  for (let seed = 1; seed < 400 && !mi; seed++) { const x = fight({ family: 'ghostroot', seed }); if (x.encounter.virus.parts.some((p) => p.mimic)) mi = x; }
  quiet(mi); tell(mi, 'mimic', mi.encounter.virus.parts.find((p) => p.mimic).id, 2);
  assert.match(chipOf(mi).tip, /^Mimic: Beat, in 2 cycles\. Copies the command you fire then and turns it on you\.( Copies your [^:\n]+: [^\n]+\.)?\n▸ Fire what costs you least to have copied, or hold(, or take the Mimic under 50%)?\.$/);
  // The chip and its tooltip don't say the same thing twice: the chip has the kind and NOW / in N; the tooltip the rest.
  const html = boardMarkup(s, null);
  const chip = html.match(/<div class="intent tell[^>]*>([\s\S]*?)<\/div><\/div>/)[1].replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(chip, /Window/);
  assert.doesNotMatch(tip, /Charged|NOW|in 1\b/);
});

test('a tell\'s tooltip offers its part\'s next interrupt tick as the way to stop it, in every fight; with none left it says how to soften it', () => {
  const s = fight();
  quiet(s);
  tell(s, 'fulldisk', 'encryptor', 2);
  assert.ok(s.encounter.ticked, 'a home fight has ticks too');
  part(s, 'encryptor').ticks = [{ at: 0.5, spent: false }, { at: 0.25, spent: false }];
  assert.match(chipOf(s).tip, /\n▸ Take the Encryptor under 50% in 2 cycles/);
  part(s, 'encryptor').ticks[0].spent = true;
  assert.match(chipOf(s).tip, /Take the Encryptor under 25% in 2 cycles/);
  s.encounter.cutBudget = 0;
  assert.match(chipOf(s).tip, /\n▸ Soften it with ◆, a shield or Brace\. The Encryptor has no tick left\./, 'no interrupts left this fight');
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

test('part tooltips by research: ??? and how to decode it, then its attack and a cue on its row at 3, then what it does and how to answer it at 15', () => {
  let s = null;
  for (let seed = 1; seed < 400 && !s; seed++) { const x = fight({ seed }); if (x.encounter.virus.parts.some((p) => p.lock)) s = x; }
  const v = s.encounter.virus, mutex = part(s, 'mutex'), enc = part(s, 'encryptor');
  assert.ok(!knowsPart(s, v, mutex));
  assert.equal(partTip(s, v, mutex), 'Mutex: ???\nBreak one, cut it or answer its tell to decode it.');
  assert.equal(partCue(s, v, mutex), null, 'no cue before it is decoded');
  let html = boardMarkup(s, null);
  assert.match(html, /<div class="bcell bname" title="Mutex: \?\?\?\nBreak one, cut it or answer its tell to decode it\.">/);
  assert.doesNotMatch(html, /class="pcue"/);
  s.research = { [codexKey(v, mutex)]: 3 };
  assert.equal(partTip(s, v, mutex), 'Mutex: Has no attack of its own.\nResearch 15 to learn its rule and answer.', 'decoded: its attack, its rule waits');
  assert.match(boardMarkup(s, null), /<span class="pcue" data-link="encryptor">[\s\S]*?locks Encryptor<\/span>/, 'and its cue on its row');
  s.research = { [codexKey(v, mutex)]: 15 };
  assert.equal(partTip(s, v, mutex), `Mutex: Locks the Encryptor behind a shield that absorbs ${enc.lockMax} damage. The lock takes every hit first. While the Mutex stands, a broken lock returns ${CONFIG.mutex.every} cycles later.\n▸ Break the Mutex first, or burst through one lock.`, 'its mechanics, then its answer on its own ▸ line');
  html = boardMarkup(s, null);
  assert.match(html, /<span class="pcue" data-link="encryptor">[\s\S]*?locks Encryptor<\/span>/);
  // The rest of the board's parts read from what they are.
  const r = (p) => partRead(s, v, p);
  assert.match(r(enc).does, /^Encrypts you every \d+ cycles\. Each Encrypt deals \d+ damage to you every cycle until the Encryptor breaks\./);
  assert.match(r(part(s, 'pulse')).does, /^Deals \d+ damage to you every 4 cycles\./);
});

test('part reads stay true to the code: a Lockbox\'s cap, a Mirror\'s reboot, a Decoy\'s beat, a Keyring\'s partner, the rooms\' bodies', async () => {
  const { FAMILIES, GUARDS, ROOM_FAMILIES } = await import('./dist/data.mjs');
  await import('./dist/families.mjs');
  const spec = (xs) => xs.map((x) => ({ ...x, max: x.integrity, maxArmor: x.armor, kind: 'system' }));
  const body = (family, xs) => ({ family, parts: spec(xs) });
  const ran = body('ransomware', FAMILIES.ransomware.parts), lockbox = ran.parts.find((p) => p.ward);
  assert.match(partRead(null, ran, lockbox).does, new RegExp(`at most ${Math.round(38 * CONFIG.ward)} Integrity a cycle`));
  const worm = body('worm', FAMILIES.worm.parts);
  assert.match(partRead(null, worm, worm.parts.find((p) => p.twin)).does, /reboots 3 cycles later at 40% Integrity\. Reboots only once\./);
  const gr = body('ghostroot', FAMILIES.ghostroot.parts);
  assert.match(partRead(null, gr, gr.parts.find((p) => p.reflect)).does, /^Every 4 cycles, bends your command at one part onto the part it points at\. It points at another part each beat\. Pointing at itself, the command lands on the Decoy and 50% of a hit bounces back at you\./);
  const bo = body('bouncer', GUARDS.bouncer.parts.filter((x) => !x.kestrel)); // the Bouncer as it stands (Kestrel's Idle Timer joins half of them from floor 3)
  assert.equal(partRead(null, bo, bo.parts.find((p) => p.rearm)).cue.text, 're-arms Gate');
  for (const fam of ['trojan', 'cryptominer', 'wiper']) {
    const b = body(fam, (ROOM_FAMILIES[fam] || FAMILIES[fam]).parts);
    for (const p of b.parts) assert.ok(partRead(null, b, p).does.length > 20, `${fam} ${p.name}`);
  }
  const tro = body('trojan', ROOM_FAMILIES.trojan.parts);
  assert.match(partRead(null, tro, tro.parts.find((p) => p.id === 'loader')).does, /any damage to a Package unpacks it into two Droppers/);
});

// ---------- what protects what: the tethers between rows, the lock on its partner's bar ----------
const mutexFight = () => { for (let seed = 1; seed < 400; seed++) { const x = fight({ seed }); if (x.encounter.virus.parts.some((p) => p.lock)) return x; } };
const tethersOf = (html, kind) => [...html.matchAll(new RegExp(`<span class="(tether k-${kind}[^"]*)" data-links="([^"]*)"[^>]*title="([^"]*)">([\\s\\S]*?)</span>(?=<span class="tether|<span class="aim-pips|<span class="part-top)`, 'g'))].map((m) => ({ cls: m[1], links: m[2], tip: m[3], inner: m[4] }));
const segOf = (html, id) => { const row = html.split('data-target="').find((r) => r.startsWith(id + '"')) || ''; const m = row.match(/<i class="lockseg" data-lock="(\d+)" style="left:([\d.]+)%;width:([\d.]+)%"/); return m ? { lock: +m[1], left: +m[2], width: +m[3], row } : { row }; };

test('the Mutex\'s lock on the Encryptor\'s own bar: a segment as wide as the lock, drained by a hit, previewed on the lock; the hit\'s number says absorbed', async () => {
  const { floatOf } = await import('./dist/dmgfx.mjs');
  const s = mutexFight();
  quiet(s);
  const enc = Object.assign(part(s, 'encryptor'), { armor: 0, maxArmor: 0, integrity: 200, max: 200, lockHp: 50, lockMax: 50 });
  let seg = segOf(boardMarkup(s, null), 'encryptor');
  assert.equal(seg.lock, 50);
  assert.equal(seg.width, 25, 'the lock on the bar\'s scale: 50 of 200');
  assert.equal(seg.left, 75, 'over the end of the fill, where hits land first');
  assert.match(seg.row, /<i class="lockseg"[^>]*title="Shield 50\/50: \?\?\?\nBreak one Mutex to decode what it does\."><b class="lockpad">/, 'a padlock at its edge; ??? until the Mutex is decoded');
  // Typing a Spike at it: the blinking slice sits on the lock, and none on the Integrity.
  command(s, 'spike encryptor');
  const html = boardMarkup(s, null), row = segOf(html, 'encryptor').row;
  assert.match(row, /<i class="loss lockloss" style="left:75\.00%;width:[\d.]+%" title="−\d+ lock this cycle">/);
  assert.doesNotMatch(row.replace(/<i class="loss lockloss"[^>]*>/, ''), /<i class="loss"/, 'the Integrity isn\'t previewed: the lock takes it');
  const ev = resolveCycle(s), hitEv = ev.find((e) => e.type === 'damage' && e.target === 'encryptor');
  assert.equal(hitEv.amount, 0); assert.ok(hitEv.shield > 0); assert.equal(hitEv.lockWas, 50);
  assert.equal(enc.integrity, 200);
  seg = segOf(boardMarkup(s, null), 'encryptor');
  assert.equal(seg.lock, 50 - hitEv.shield, 'it drains');
  assert.equal(seg.width, ((50 - hitEv.shield) / 200) * 100);
  const f = floatOf(hitEv, { partName: () => 'Encryptor', skillName: () => 'Spike' });
  assert.deepEqual([f.kind, f.text, f.at], ['shield', `−${hitEv.shield} absorbed`, 'part'], 'the number is the lock\'s');
  // Decoded, the segment says whose it is.
  s.research = { [codexKey(s.encounter.virus, part(s, 'mutex'))]: 3 };
  assert.match(segOf(boardMarkup(s, null), 'encryptor').row, /title="Lock \d+\/50: the Mutex&#39;s shield on the Encryptor\. Every hit on it drains the lock first\."/);
});

test('a tether between the Mutex and the Encryptor: ? and ??? until decoded, glowing while the lock stands, ↻ N once it breaks, snapping and gone with the Mutex', () => {
  const s = mutexFight();
  quiet(s);
  const v = s.encounter.virus, enc = Object.assign(part(s, 'encryptor'), { armor: 0, maxArmor: 0, integrity: 200, max: 200, lockHp: 10, lockMax: 10 });
  let html = boardMarkup(s, null), ts = tethersOf(html, 'lock');
  const rows = v.parts.filter((p) => p.integrity > 0).map((p) => p.id), span = Math.abs(rows.indexOf('mutex') - rows.indexOf('encryptor')) + 1;
  assert.equal(ts.length, span, 'a piece on every row it spans');
  assert.ok(ts.every((t) => t.links === 'mutex encryptor' && /\bup\b/.test(t.cls) && /\bunk\b/.test(t.cls)), ts.map((t) => t.cls).join(' | '));
  assert.ok(ts.every((t) => t.tip === 'Mutex: ???\nSomething on it reaches the Encryptor. Break one to decode what it does.'));
  assert.equal(ts.filter((t) => /<b class="tt-node[^"]*">\?<\/b>/.test(t.inner)).length, 1, 'one node, with ? on it');
  assert.equal(ts.filter((t) => /tt-arm src/.test(t.inner)).length, 1); assert.equal(ts.filter((t) => /tt-arm dst/.test(t.inner)).length, 1);
  s.research = { [codexKey(v, part(s, 'mutex'))]: 3 };
  ts = tethersOf(boardMarkup(s, null), 'lock');
  assert.ok(ts.every((t) => !/\bunk\b/.test(t.cls)));
  assert.match(ts.find((t) => /tt-node/.test(t.inner)).inner, /<b class="tt-node[^"]*"><svg class="glyph tt-ico"/, 'decoded: its icon');
  assert.match(ts[0].tip, /^Mutex lock: the Encryptor wears a 10\/10 shield that takes every hit first\./);
  // Break the lock: grey, with the cycles until it relocks.
  command(s, 'overload encryptor'); resolveCycle(s);
  assert.equal(enc.lockHp, 0);
  ts = tethersOf(boardMarkup(s, null), 'lock');
  const n = enc.lockAt - s.encounter.cycle;
  assert.equal(n, CONFIG.mutex.every - 1);
  assert.ok(ts.every((t) => /\bdown\b/.test(t.cls)));
  assert.match(ts.find((t) => /tt-node/.test(t.inner)).inner, new RegExp(`<b class="tt-node[^"]*\\bclock"><span class="tt-count">↻${n}</span></b>`), 'the countdown is the node, mid-span');
  assert.match(ts[0].tip, new RegExp(`^Mutex lock: broken\\. The Mutex locks the Encryptor again in ${n} cycles\\.`));
  assert.doesNotMatch(segOf(boardMarkup(s, null), 'encryptor').row, /lockseg/, 'no segment while it is broken');
  // The Mutex breaks: while its row dissolves the tether snaps; then it's gone, and the lock with it for good.
  const mx = Object.assign(part(s, 'mutex'), { integrity: 0 });
  Object.defineProperty(mx, '_dyingUntil', { value: Date.now() + 600, writable: true, configurable: true, enumerable: false });
  ts = tethersOf(boardMarkup(s, null), 'lock');
  assert.ok(ts.length && ts.every((t) => /\bsnap\b/.test(t.cls)), 'it snaps as the Mutex dissolves');
  mx._dyingUntil = 0;
  html = boardMarkup(s, null);
  assert.doesNotMatch(html, /class="tether k-/);
  assert.match(html, /<i class="tether keep" hidden><\/i>/, "the gutter stays for the rest of the fight: the rows don't jump");
  assert.doesNotMatch(html, /lockseg/);
});

test('one visual language for every relation: a Lockbox\'s ward (and a cap line on its partner\'s bar), a Mirror\'s twin, a Keyring re-arming its Gate', () => {
  // The Lockbox, from level 3.
  let s = null;
  for (let seed = 1; seed < 400 && !s; seed++) { const x = fight({ level: 5, seed }); if (x.encounter.virus.parts.some((p) => p.ward)) s = x; }
  quiet(s);
  const enc = Object.assign(part(s, 'encryptor'), { armor: 0, maxArmor: 0, integrity: 100, max: 100 });
  let html = boardMarkup(s, null);
  const ward = tethersOf(html, 'ward');
  assert.ok(ward.length >= 2 && ward.every((t) => t.links === 'lockbox encryptor' && /\bup\b/.test(t.cls)));
  const cap = Math.round(100 * CONFIG.ward);
  assert.match(segOf(html, 'encryptor').row, new RegExp(`<i class="wardcap" data-left="${cap}" style="left:${100 - cap}\\.00%"`), 'the cap: the most it can lose this cycle');
  s.research = { [codexKey(s.encounter.virus, part(s, 'lockbox'))]: 3 };
  html = boardMarkup(s, null);
  assert.match(tethersOf(html, 'ward')[0].tip, new RegExp(`^Lockbox ward: the Encryptor loses at most ${cap} Integrity a cycle \\(${cap} left this cycle\\)\\.`));
  assert.match(html, new RegExp(`title="Ward cap: the Encryptor can lose ${cap} more this cycle`));
  // The forecast stops at the cap.
  command(s, 'overload encryptor');
  assert.ok(forecast(s).parts.encryptor <= cap, 'the preview stops at the cap');
  // The Mirror (worm, from level 3): twins, and a stub with the reboot countdown when one is down.
  let w = null;
  for (let seed = 1; seed < 400 && !w; seed++) { const x = fight({ level: 5, family: 'worm', seed }); if (x.encounter.virus.parts.some((p) => p.twin)) w = x; }
  quiet(w);
  const tw = tethersOf(boardMarkup(w, null), 'twin');
  assert.ok(tw.length >= 2 && tw.every((t) => t.links === 'mirror replicator' && /\bup\b/.test(t.cls)));
  const rep = part(w, 'replicator');
  Object.assign(rep, { armor: 0, maxArmor: 0, integrity: 1 });
  command(w, 'spike replicator'); resolveCycle(w);
  assert.ok(rep.integrity === 0 && rep.rebootAt, 'down, rebooting');
  const stub = tethersOf(boardMarkup(w, null), 'twin');
  assert.equal(stub.length, 1);
  assert.match(stub[0].cls, /\bstub\b/); assert.match(stub[0].cls, /\bdown\b/);
  assert.match(stub[0].inner, new RegExp(`↻${rep.rebootAt - w.encounter.cycle}<`));
  // The Bouncer's Keyring and its Gate: the re-arm countdown on the tether.
  const b = at(12); selectEncounter(b, 'bouncer', 3); command(b, 'engage');
  const k = part(b, 'encryptor'), n = (k.rearm - (b.encounter.cycle % k.rearm)) % k.rearm;
  const ra = tethersOf(boardMarkup(b, null), 'rearm');
  assert.ok(ra.length >= 2 && ra.every((t) => t.links === 'encryptor pulse' && /\bup\b/.test(t.cls)));
  assert.match(ra.find((t) => /tt-node/.test(t.inner)).inner, new RegExp(`↻${n}<`));
  assert.doesNotMatch(boardMarkup(b, null), /re-arms in/, 'the tether says it, not a tag');
  // partLinks reads the same.
  assert.deepEqual(partLinks(b).map((l) => [l.kind, l.from, l.to.join(), l.count]), [['rearm', 'encryptor', 'pulse', n]]);
});

test('the Trojan\'s redeploy and a fallback draw as tethers: Loader to Courier while both stand, a stub with ↻ N on the Loader while the Courier is down; a Brood to its Maw', async () => {
  const FP = await import('./dist/floorplan.mjs');
  const s = at(12);
  FP.outfit(s, { cls: 'breaker', level: 12, gearSeed: 2 });
  FP.startRooms(s, { seed: 5, kind: 'Mirror', size: 'medium', level: 12 });
  FP.connect(s);
  const room = FP.roomList(s).find((r) => r.kind === 'process');
  Object.assign(room, { family: 'trojan', set: 'express', pin: 'express', third: null, author: 'swarmline' });
  s.rooms.at = room.id; s.rooms.screen = null;
  FP.fight(s, room);
  s.run.integrity = s.run.max = 5000;
  quiet(s);
  const v = s.encounter.virus, courier = part(s, 'courier');
  let tt = tethersOf(boardMarkup(s, null), 'redeploy');
  assert.ok(tt.length >= 2 && tt.every((t) => t.links === 'loader courier' && /\bup\b/.test(t.cls)), 'Loader to Courier');
  assert.match(tt[0].tip, /^Loader: \?\?\?/, '??? until the Loader is decoded');
  s.research = { [codexKey(v, part(s, 'loader'))]: 15 };
  tt = tethersOf(boardMarkup(s, null), 'redeploy');
  assert.match(tt[0].tip, /^Loader redeploy: a Courier broken while the Loader stands comes back 4 cycles later at 50% Integrity, every time\./);
  Object.assign(courier, { armor: 0, integrity: 1 });
  command(s, 'spike courier'); resolveCycle(s);
  assert.equal(courier.integrity, 0);
  const stub = tethersOf(boardMarkup(s, null), 'redeploy');
  assert.equal(stub.length, 1);
  assert.match(stub[0].cls, /\bstub\b/); assert.match(stub[0].cls, /\bdown\b/);
  assert.match(stub[0].inner, new RegExp(`↻${courier.redeployAt - s.encounter.cycle}<`));
  assert.match(stub[0].tip, /^Loader redeploy: the Courier comes back in \d cycles at 50% Integrity, unless the Loader breaks first\.\n▸ Break the Loader before then\./);
  // The Redeploy chip on the Loader's row, and its tag.
  const html = boardMarkup(s, null);
  assert.match(html.split('data-target="loader"')[1].split('data-target=')[0], /title="Redeploy: \d+ hp the Courier comes back, unless the Loader is broken first"/, 'on the Loader\'s row');
  assert.match(html, /redeploys in \d/);
  assert.match(partRead(s, v, part(s, 'loader')).does, /Redeploys a broken Courier 4 cycles later at 50% Integrity, every time/);
  // A Crawler's Brood falls back on its Maw: a tether of its own, a fallback tag, and the read says it.
  const c = at(12); selectEncounter(c, 'crawler', 3); command(c, 'engage');
  const fb = tethersOf(boardMarkup(c, null), 'fallback');
  assert.ok(fb.length >= 2 && fb.every((t) => t.links === 'replicator pulse' && /\bup\b/.test(t.cls)));
  assert.match(boardMarkup(c, null), /title="Fallback: if the Maw breaks first, the Brood takes over its Bite\.">fallback</);
  const cv = c.encounter.virus;
  assert.match(partRead(c, cv, part(c, 'replicator')).does, /If the Maw breaks first, the Brood adds the Bite to its Brood\./);
  // A Bouncer's Keyring says it on its re-arm tether (no second tether to the same Gate), and the Patcher in its read.
  const b = at(12); selectEncounter(b, 'bouncer', 3); command(b, 'engage');
  b.research = { [codexKey(b.encounter.virus, part(b, 'encryptor'))]: 15 };
  assert.equal(tethersOf(boardMarkup(b, null), 'fallback').length, 0);
  assert.match(tethersOf(boardMarkup(b, null), 'rearm')[0].tip, /If the Gate breaks first, the Keyring takes over its Ram\./);
  const p = at(12); selectEncounter(p, 'patchwork', 3, { level: 12, mutation: null }); command(p, 'engage');
  assert.match(partRead(p, p.encounter.virus, part(p, 'patcher')).does, /If the Pulse Node breaks first, the Patcher drops its Patch and takes over the Surge\./);
});
