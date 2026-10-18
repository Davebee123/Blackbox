// Faction gear (faction-gear.mjs, docs/loot-plan.md Faction gear): implicits, one fixed line in a faction's mark on the
// items a faction gives, and the five faction pieces, assembled at a hub from three parts that only feuds give. And the
// feud's rep: +4 a runner, +6 for the win, never a loss with anyone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation, addItem, loaded, gearFx, fxFire, selectEncounter, part, damageMultiplier, takenMult, UNIQUES, implicitText, effectLine, rollDrop, uniqueFrom, REWARD_SOURCES } from './dist/combat.mjs';
import { IMPLICITS, IMPLICIT, implicitValue, withImplicit, rollItem, uniqueItem, seeded, BASES, STATS, STASH_CAP } from './dist/gear.mjs';
import { deal, eventsOf, tickEvents, FEUD } from './dist/events.mjs';
import { PIECES, PARTS, partsOf, heldPiece, pieceState, assemble, isFactionPiece, pendingClaims, appraisedOf, cleanStacks } from './dist/faction-gear.mjs';
import { FACTIONS, rep } from './dist/factions.mjs';
import { deliverGoods } from './dist/store.mjs';
import { sendGood, tickMarket } from './dist/market.mjs';
import { vaultItem } from './dist/run.mjs';
import { isPiece } from './dist/sets.mjs';
import { CONFIG } from './dist/data.mjs';
import { checkItems, fxList, fxText } from './dist/content.mjs';
import ITEMS from './dist/content/items.mjs';
import { itemTipMarkup, hudMarkup, collectionMarkup, hubOptions, hubTerminalMarkup, hubBanner, mapMarkup } from './dist/view.mjs';
import { glyphMarkup, shapeOf, PIECE_SHAPES, asymmetric, GLYPH_W, GLYPH_H } from './dist/protocol-glyphs.mjs';

CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;
const F5 = ['halcyon', 'kestrel', 'glassjaw', 'lantern', 'nullchoir'];
// A world with the board open, two traced servers and the hubs asked for (events2.test.mjs's).
const world = ({ level = 20, hubs = [] } = {}) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = Object.fromEntries(hubs.map((f) => [f, true]));
  s.market = { pressure: {}, transfers: [], serial: 0, event: 'calm', eventUntil: Infinity, at: null };
  s.director = { next: 9e9, n: 0, last: null, r: 1 };
  return s;
};
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null, lockHp: 0 });
  for (let i = 0; i < 20 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null, lockHp: 0 }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
// A feud between two given rivals, dealt on the director's dice.
const feudOf = (s, a, b) => {
  let ev; for (let i = 0; i < 40 && !(ev?.sides.includes(a) && ev.sides.includes(b)); i++) { s.events = []; ev = deal(s, 'feud'); }
  assert.deepEqual([...ev.sides].sort(), [a, b].sort());
  ev.bar = 0.5;
  return ev;
};
// Win a feud for f: two runners from even.
const winFeud = (s, f, other) => {
  const ev = feudOf(s, f, other), m = s.serial;
  command(s, `event fight ${ev.id} ${f}`); win(s); command(s, `event fight ${ev.id}`); win(s);
  assert.ok(!eventsOf(s).includes(ev), `won: ${s.logs.filter((x) => x.id > m && /warn/.test(x.type)).map((x) => x.message).join(' | ')}`);
  return ev;
};
const reps = (s) => Object.fromEntries(Object.keys(FACTIONS).map((f) => [f, rep(s, f)]));
const wear = (s, it) => { const x = addItem(s, it); command(s, 'load ' + x.id); assert.ok(loaded(s).some((y) => y.id === x.id), 'loaded'); return x; };

// ---------- implicits ----------
test('the five implicits: a mechanic each in its faction\'s voice, a minor rule\'s strength growing with item level; a piece carries its own a quarter stronger', async () => {
  assert.deepEqual(Object.keys(IMPLICITS).sort(), [...F5].sort());
  const at = (f) => [10, 30, 50].map((L) => implicitValue(f, L));
  assert.deepEqual(at('halcyon'), [18, 26, 34], 'Claims: the share of a big hit paid back');
  assert.deepEqual(at('kestrel'), [12, 17, 23], 'Appraisal: more damage to the appraised part');
  assert.deepEqual(at('glassjaw'), [10, 14, 18], 'Glass Jaw: more damage above 75%');
  assert.deepEqual(at('lantern'), [4, 5, 7], 'Clean Signal: a stack\'s damage');
  assert.deepEqual(at('nullchoir'), [28, 36, 44], 'Chorus: the copy\'s share');
  for (const f of F5) for (const L of [10, 30, 50]) assert.ok(Math.abs(implicitValue(f, L, IMPLICIT.piece) - 1.25 * implicitValue(f, L)) <= 1, `${f} Lv ${L}: a piece's, a quarter more`);
  // Written as effect blocks, every kind in the vocabulary, none of them a set's kind (sets read every worn effect block).
  const { FX_DO } = await import('./dist/content.mjs');
  const { SETS } = await import('./dist/sets.mjs');
  const setKinds = new Set();
  const walk = (x) => { if (x && typeof x === 'object') { if (typeof x.do === 'string') setKinds.add(x.do); Object.values(x).forEach(walk); } };
  walk(SETS); for (const u of Object.values(UNIQUES)) if (isPiece(u.id)) { walk(u.effect); walk(u.green); }
  const words = /cryptjack|keylogger|hashrat|tracer|bouncer|sentinel|resident|relay-king|golden parachute/i;
  for (const [f, d] of Object.entries(IMPLICITS)) {
    assert.ok(d.name && d.text(10) && !words.test(d.text(10)), `${f}: named, a general line`);
    for (const fx of d.fx) { assert.ok(FX_DO[fx.do], `${fx.do}: in the vocabulary`); if (fx.do !== 'damage%') assert.ok(!setKinds.has(fx.do), `${fx.do}: no set kind`); }
  }
});

test('implicits roll only where a faction gives the item; never on a unique, a set piece or a Zero-day', () => {
  const r = seeded(4);
  const plain = rollItem(r, { level: 20, rarity: 'tuned' }), marked = rollItem(r, { level: 20, rarity: 'tuned', faction: 'kestrel' });
  assert.equal(plain.implicit, undefined, 'no faction: no implicit');
  assert.equal(marked.implicit, 'kestrel');
  assert.equal(marked.implicitValue, implicitValue('kestrel', 20));
  assert.equal(rollItem(r, { level: 20, zeroDay: 'rootkit', faction: 'glassjaw' }).implicit, undefined, 'a Zero-day: none');
  const u = uniqueItem(UNIQUES['root-of-trust'], 50, r);
  assert.equal(withImplicit(u, 'halcyon'), u, 'a unique: none');
  const setPiece = Object.values(UNIQUES).find((x) => isPiece(x.id));
  assert.equal(uniqueItem(setPiece, setPiece.level, r).implicit, undefined, 'a set piece: none');
  for (const id of Object.keys(UNIQUES).filter((id) => !isFactionPiece(id))) assert.equal(uniqueItem(UNIQUES[id], UNIQUES[id].level, seeded(1)).implicit, undefined, id);
  // Kills, vaults with no owner, Halcyon's store and the hubs' Shops.
  const s = world({ level: 30, hubs: ['glassjaw'] });
  let drops = 0;
  for (let i = 0; i < 400; i++) { const it = rollDrop(s, { kind: 'home', tier: 'rare' }, 30); if (it) { drops++; assert.equal(it.implicit, undefined, 'a kill: none'); } }
  assert.ok(drops > 100);
  const loc = { seed: 77, depth: 2, level: 20, family: 'worm' };
  assert.equal(vaultItem(loc).implicit, undefined, 'an unclaimed server\'s vault: none');
  for (const f of ['kestrel', 'lantern']) { const v = vaultItem({ ...loc, faction: f }); if (!v.unique) assert.equal(v.implicit, f, `${f}'s server's vault`); }
  const n = s.stash.length;
  deliverGoods(s, 'crate', 30);
  assert.equal(s.stash.at(-1).implicit, 'halcyon', 'Halcyon\'s sealed item (its store)');
  sendGood(s, 'glassjaw', 'crate', 'Sealed item', 100, 30, 1000);
  tickMarket(s, 1000 + 24 * 3600000);
  assert.equal(s.stash.length, n + 2);
  assert.equal(s.stash.at(-1).implicit, 'glassjaw', 'a hub\'s sealed item lands with its faction\'s');
});

test('a contract\'s protocol carries the implicit of the faction it was for; the storyline\'s none', () => {
  const s = fresh(); s.hackers = { breaker: { level: 20, xp: 0 } };
  const job = (extra) => ({ id: 900 + (s.mail.jobs || []).length, type: 'materials', material: 'worm', amount: 1, got: 0, level: 20, reward: { credits: 10, drop: true }, from: 'x', subject: 'x', ...extra });
  s.mail.story = 99; s.materials = { worm: 9 };
  for (const [extra, want] of [[{ faction: 'kestrel' }, 'kestrel'], [{ faction: 'glassjaw', offBooks: true }, 'glassjaw'], [{ faction: 'halcyon' }, 'halcyon'], [{}, 'halcyon'], [{ story: 3 }, undefined]]) {
    const c = job(extra); s.mail.jobs = [c];
    command(s, `mail deliver ${c.id}`);
    assert.ok(c.done, JSON.stringify(extra));
    assert.equal(s.stash.at(-1).implicit, want, JSON.stringify(extra));
  }
});

// A fight with nothing due on a run of 1000 Signal; the test sets what lands, and when (deep-uniques.test.mjs's).
function fight(s, level = 30) {
  s.run = { loc: 'x', cwd: '/', integrity: 1000, max: 1000, pack: [], visited: ['/'] };
  selectEncounter(s, 'cryptjack', 7, { level, mutation: null, mode: 'run' });
  command(s, 'engage');
  const e = s.encounter; e.virus.tells = null; e.hardened = 0; e.virus.weakKnown = false;
  for (const p of e.virus.parts) { p.armor = 0; p.maxArmor = 0; if (p.attack) p.attack.due = 999; }
  return e;
}
const pulse = (s) => part(s, 'pulse');
// One attack from the Pulse Node this cycle, of this size; what it took.
function landed(s, amount) {
  const e = s.encounter, p = pulse(s), mark = s.serial;
  Object.assign(p.attack, { amount, due: e.cycle, interval: 999 });
  command(s, 'hold'); resolveCycle(s);
  return s.logs.filter((x) => x.id > mark && x.type === 'server-hit' && x.source === 'pulse').reduce((n, x) => n + x.amount, 0);
}
const quiet = (s, n = 1) => { for (let i = 0; i < n; i++) { command(s, 'hold'); resolveCycle(s); } };
test('each implicit does what it says: Claims, Appraisal, Glass Jaw, Clean Signal, Chorus', () => {
  const L = 30, vet = () => { const x = fresh(); x.hackers = { breaker: { level: L, xp: 0 } }; return x; };
  const item = (f, slot = 'proxy', level = L) => rollItem(seeded(9), { level, rarity: 'stock', slot, faction: f });
  const v = (f) => implicitValue(f, L);
  // Claims: a hit over 15% of your max is a claim, a share of it healed two cycles later; a smaller one is not.
  { const a = vet(); wear(a, item('halcyon')); fight(a);
    const n = landed(a, 300);
    assert.ok(n > 150, `a big hit: ${n}`);
    assert.equal(pendingClaims(a).length, 1); assert.equal(pendingClaims(a)[0].amount, Math.round((n * v('halcyon')) / 100));
    assert.match(hudMarkup(a), /class="claim"/, 'pending on the Signal bar');
    const was = a.run.integrity; quiet(a, 2);
    assert.equal(a.run.integrity - was, Math.round((n * v('halcyon')) / 100), 'paid back');
    assert.ok(a.logs.some((x) => x.type === 'heal' && /^Claims pays out \+\d+/.test(x.message) && x.gear));
    assert.equal(pendingClaims(a).length, 0);
    landed(a, 60); assert.equal(pendingClaims(a).length, 0, 'a small hit: no claim'); }
  // Appraisal: a break appraises the next part to attack: its timer shows, its next hit on its row, more damage to it until it breaks.
  { const a = vet(); wear(a, item('kestrel')); const e = fight(a);
    e.virus.parts.push({ ...structuredClone(e.virus.parts.find((p) => p.id !== 'pulse')), id: 'spare', name: 'Spare' }); // a third part
    const others = e.virus.parts.filter((p) => p.id !== 'pulse');
    others.forEach((p, i) => { p.attack ||= { name: 'Ping', effect: 'damage', amount: 20, interval: 4 }; p.attack.due = e.cycle + 3 + i; p.integrity = p.max = 900; });
    const [next, later] = others;
    pulse(a).integrity = 1; command(a, 'spike pulse'); resolveCycle(a);
    assert.equal(appraisedOf(a)?.part, next.id, 'the next to attack');
    assert.ok(next.seenUntil >= next.attack.due, 'its timer shows');
    assert.ok(Math.abs(damageMultiplier(a, next, { mine: true }) / damageMultiplier(a, later, { mine: true }) - (1 + v('kestrel') / 100)) < 1e-9, 'more to it than to the others');
    assert.ok(a.logs.some((x) => /^Appraisal: the .+ is appraised\. Its next hit: \d+\./.test(x.message) && x.target === next.id));
    next.integrity = 1; command(a, 'spike ' + next.id); resolveCycle(a);
    assert.equal(appraisedOf(a)?.part, later.id, 'broken: the next one is appraised'); }
  // Glass Jaw: more damage above 75%, more taken below 25%, nothing between.
  { const a = vet(); wear(a, item('glassjaw')); fight(a); const p = pulse(a);
    const dmg = () => fxFire(a, 'hit', { target: p, do: 'damage%' }, false).reduce((n, x) => n + x.value, 0);
    assert.equal(dmg(), v('glassjaw'), 'above 75%'); assert.equal(takenMult(a, p), 1);
    a.run.integrity = 500; assert.equal(dmg(), 0); assert.equal(takenMult(a, p), 1, 'between: nothing');
    a.run.integrity = 200; assert.ok(Math.abs(takenMult(a, p) - (1 + Math.round(v('glassjaw') / 2) / 100)) < 1e-9, 'below 25%: more taken'); }
  // Clean Signal: a stack each cycle no attack lands, up to 3, on your skills; an attack that lands clears it.
  { const a = vet(); wear(a, item('lantern')); fight(a); const p = pulse(a), base = damageMultiplier(a, p, { mine: true });
    const seen = []; for (let i = 0; i < 4; i++) { quiet(a); seen.push(cleanStacks(a)); }
    assert.deepEqual(seen, [1, 2, 3, 3]);
    assert.ok(Math.abs(damageMultiplier(a, p, { mine: true }) / base - (1 + (3 * v('lantern')) / 100)) < 1e-9, 'three stacks on your skills');
    landed(a, 40); assert.equal(cleanStacks(a), 0, 'a hit clears it');
    assert.ok(a.logs.some((x) => /^Clean Signal lost\./.test(x.message))); }
  // Chorus: the same damaging skill twice in a row, and the second hits again for its share; a different one between, none.
  { const a = vet(); wear(a, item('nullchoir')); const e = fight(a); const p = pulse(a); p.integrity = p.max = 99999;
    const copies = () => a.logs.filter((x) => x.type === 'damage' && /Chorus/.test(x.message)).length;
    command(a, 'spike pulse'); resolveCycle(a); assert.equal(copies(), 0, 'once: nothing');
    command(a, 'spike pulse'); resolveCycle(a); assert.equal(copies(), 1, 'twice in a row: the copy');
    command(a, 'spike pulse'); resolveCycle(a); assert.equal(copies(), 1, 'the pair is answered: a third starts the next');
    command(a, 'spike pulse'); resolveCycle(a); assert.equal(copies(), 2); void e; }
  // The lines read as the tooltip shows them.
  for (const f of F5) assert.equal(implicitText(item(f)), IMPLICITS[f].text(v(f)));
});

test('the same implicit on several items counts once, at its best; different factions\' all count', () => {
  const a = fresh(); a.hackers = { breaker: { level: 40, xp: 0 } };
  wear(a, rollItem(seeded(1), { level: 20, rarity: 'stock', slot: 'proxy', faction: 'lantern' }));
  wear(a, rollItem(seeded(2), { level: 40, rarity: 'stock', slot: 'shell', faction: 'lantern' }));
  wear(a, rollItem(seeded(3), { level: 40, rarity: 'stock', slot: 'exploit', faction: 'glassjaw' }));
  const imps = gearFx(a).filter((x) => x.implicit);
  assert.deepEqual(imps.filter((x) => x.implicit === 'lantern').map((x) => x.fx.value), [implicitValue('lantern', 40)], 'once, the best');
  assert.equal(imps.filter((x) => x.implicit === 'glassjaw').length, 2, 'GLASSJAW\'s two blocks, once');
  fight(a, 40); quiet(a, 3);
  assert.equal(cleanStacks(a), 3, 'three stacks, not six');
});

test('an implicit shows as its faction\'s mark: a line in the hover card, a mark on the glyph', () => {
  const s = fresh(); s.hackers = { breaker: { level: 20, xp: 0 } };
  const it = addItem(s, rollItem(seeded(2), { level: 20, rarity: 'tuned', faction: 'lantern' }));
  const tip = itemTipMarkup(s, it.id);
  assert.match(tip, new RegExp(`class="impl" style="--fc:${FACTIONS.lantern.color}" title="LANTERN">`), 'its line in its colour');
  assert.match(glyphMarkup(it), /class="pg-fm" style="--fc:#ffb347"/, 'its mark on the glyph');
  const plain = addItem(s, rollItem(seeded(2), { level: 20, rarity: 'tuned' }));
  assert.doesNotMatch(itemTipMarkup(s, plain.id), /class="impl"/);
  assert.doesNotMatch(glyphMarkup(plain), /pg-fm/);
});

// ---------- the pieces ----------
test('five faction pieces: one a faction, feuds their only source, modest, each its own glyph and its faction\'s implicit a quarter stronger', () => {
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad).map((x) => x.msg), []);
  assert.deepEqual(Object.keys(PIECES).sort(), [...F5].sort());
  const words = /cryptjack|keylogger|hashrat|tracer|bouncer|sentinel|resident|relay-king|golden parachute|break.?in|keyhole|breach|intru/i;
  for (const f of F5) {
    const u = PIECES[f];
    assert.deepEqual(u.sources, [{ kind: 'feud' }], `${u.name}: feuds only`);
    assert.ok(fxList(u).length === 1 && fxText(fxList(u)), `${u.name}: one signature effect`);
    assert.ok(!words.test(fxText(fxList(u))) && !words.test(u.flavour), `${u.name}: general`);
    assert.ok(PIECE_SHAPES[u.id] && asymmetric(PIECE_SHAPES[u.id].rows).length === 0 && PIECE_SHAPES[u.id].rows.every((r) => r.length === GLYPH_W) && PIECE_SHAPES[u.id].rows.length <= GLYPH_H, `${u.name}: its own glyph`);
    for (const L of [10, 30, 50]) {
      const it = uniqueItem(u, L, seeded(3));
      assert.equal(shapeOf(it), PIECE_SHAPES[u.id]);
      assert.equal(it.implicit, f);
      assert.equal(it.implicitValue, implicitValue(f, L, IMPLICIT.piece), `${u.name} Lv ${L}: its implicit, stronger`);
      // A good blue's stats: its slot's best base at its level, a yellow's at most (as a unique's), never past it.
      const slot = BASES[u.base].slot, main = slot === 'exploit' ? 'damage' : 'signal';
      const base = uniqueItem({ ...u, primary: {}, secondary: {} }, L, seeded(3)).stats[main];
      assert.ok(it.stats[main] >= base * 0.95 && it.stats[main] <= base * 1.1, `${u.name} Lv ${L}: ${it.stats[main]} against a base's ${base}`);
    }
  }
  // Not in any drop table: kills, elites, couriers, listening.
  const s = fresh(); s.hackers = { breaker: { level: 50, xp: 0 } };
  for (const kind of ['sprawl', 'vault', 'guard', 'rogue', 'home', 'feud']) for (let i = 0; i < 30; i++) assert.ok(!isFactionPiece(uniqueFrom(s, { kind, rare: true }, 50)?.id), kind);
  for (const f of F5) assert.ok(PIECES[f].sources.every((src) => REWARD_SOURCES.includes(src.kind)), 'a reward: nothing to listen for');
});

test('the pieces\' signatures: Umbrella Policy\'s cover below half, Blank Check on the healthiest part, Carrier Wave\'s refund, Descant\'s burns and helpers, Mews\'s heal', () => {
  const L = 30, vet = () => { const x = fresh(); x.hackers = { breaker: { level: L, xp: 0 } }; return x; };
  const has = (id, when, what, ctx = {}) => { const a = vet(); wear(a, uniqueItem(UNIQUES[id], L, seeded(1))); fight(a); return { a, fx: fxFire(a, when, { ...ctx, do: what }, false) }; };
  { const { a, fx } = has('umbrella-policy', 'always', 'taken%'); assert.equal(fx.length, 0, 'not above half'); a.run.integrity = 400; assert.equal(fxFire(a, 'always', { do: 'taken%' }, false)[0].value, 6, 'below half: 6% less'); }
  { const { a } = has('blank-check', 'hit', 'damage%'); const big = (p) => fxFire(a, 'hit', { target: p, do: 'damage%' }, false).reduce((n, x) => n + x.value, 0);
    const ps = a.encounter.virus.parts; ps.forEach((p, i) => { p.integrity = 100 + i; }); a.run.integrity = 500; // under Glass Jaw's 75%
    assert.equal(big(ps.at(-1)), 15, 'the part with the most Integrity left: 15% more'); assert.equal(big(ps[0]), 0, 'any other: none'); }
  { const { fx } = has('carrier-wave', 'answer', 'refund'); assert.equal(fx[0].value, 1); }
  { const { fx } = has('descant', 'custom', 'dot%'); assert.equal(fx[0].value, 10); }
  { const { fx } = has('mews', 'crit', 'restore%'); assert.equal(fx[0].value, 2); }
  for (const f of F5) assert.ok(effectLine({ unique: PIECES[f].id }).length > 10, `${f}: its line`);
});

test('parts: a feud won gives one part of the piece of the side you backed; runners alone, a lost feud and the other side give none', () => {
  const s = world({ hubs: ['glassjaw', 'kestrel', 'lantern'] });
  // A runner beaten: no part yet.
  const ev = feudOf(s, 'glassjaw', 'lantern');
  command(s, `event fight ${ev.id} lantern`); win(s);
  assert.equal(partsOf(s, 'lantern'), 0, 'a runner: no part');
  command(s, `event fight ${ev.id}`); win(s);
  assert.equal(partsOf(s, 'lantern'), 1, 'the feud: a part');
  assert.equal(partsOf(s, 'glassjaw'), 0, 'the other side: none');
  assert.ok(!s.stash.some((it) => isFactionPiece(it.unique)), 'a part is no stash item');
  // Behind when time runs out: nothing.
  const b = feudOf(s, 'glassjaw', 'lantern');
  command(s, `event fight ${b.id} glassjaw`); win(s);
  b.bar = b.sides[0] === 'glassjaw' ? 0.3 : 0.7;
  FEUD.drift = [0, 0];
  try { tickEvents(s, FEUD.ms); } finally { FEUD.drift = [0.02, 0.05]; }
  assert.ok(!eventsOf(s).includes(b));
  assert.equal(partsOf(s, 'glassjaw'), 0, 'lost: no part');
  // Ahead when time runs out: the part.
  const c = feudOf(s, 'glassjaw', 'lantern');
  command(s, `event fight ${c.id} glassjaw`); win(s);
  c.bar = c.sides[0] === 'glassjaw' ? 0.6 : 0.4;
  FEUD.drift = [0, 0];
  try { tickEvents(s, FEUD.ms); } finally { FEUD.drift = [0.02, 0.05]; }
  assert.equal(partsOf(s, 'glassjaw'), 1, 'held at the end: the part');
});

test('each runner beaten drops a protocol at your level with your side\'s implicit; the win\'s sealed item carries it too', () => {
  const s = world({ level: 24, hubs: ['glassjaw'] });
  const ev = feudOf(s, 'halcyon', 'glassjaw'), marked = () => s.stash.filter((x) => x.implicit);
  command(s, `event fight ${ev.id} glassjaw`); win(s);
  assert.equal(marked().length, 1, 'a protocol a runner (on top of what the kill rolls)');
  const it = marked()[0];
  assert.equal(it.implicit, 'glassjaw'); assert.equal(it.level, 24); assert.ok(['stock', 'tuned'].includes(it.rarity));
  assert.ok(s.logs.some((x) => x.type === 'drop' && x.item?.id === it.id && /dropped: /.test(x.message)));
  command(s, `event fight ${ev.id}`); win(s);
  assert.equal(marked().length, 3, 'the second runner\'s and the sealed item');
  assert.ok(marked().every((x) => x.implicit === 'glassjaw'));
  assert.equal(marked().at(-1).rarity, 'tuned', 'the sealed item: a blue');
});

test('assembling: three parts at the hub give the piece at your level; three more re-tune it to your level; never early', () => {
  const s = world({ level: 12, hubs: ['kestrel'] });
  const u = PIECES.kestrel;
  const mark = () => s.serial, warned = (m, re) => assert.ok(s.logs.some((x) => x.id > m && x.type === 'warning' && re.test(x.message)), String(re));
  s.factionParts = { kestrel: 2 };
  let m = mark(); assemble(s, 'kestrel'); warned(m, /takes 3 parts\. You hold 2/);
  assert.equal(heldPiece(s, 'kestrel'), null);
  s.factionParts.kestrel = 3;
  delete s.hubFound.kestrel; m = mark(); command(s, 'hub assemble kestrel'); warned(m, /once you have found it/);
  s.hubFound.kestrel = true;
  assert.ok(pieceState(s, 'kestrel').ready);
  command(s, 'hub assemble kestrel');
  const p = heldPiece(s, 'kestrel');
  assert.ok(p, 'assembled');
  assert.equal(p.unique, u.id); assert.equal(p.level, 12, 'at your level'); assert.equal(p.implicit, 'kestrel');
  assert.equal(partsOf(s, 'kestrel'), 0, 'the parts spent');
  assert.ok(s.collection[u.id], 'in the collection');
  // Re-tune: three more, at a higher level: the same item, grown.
  s.hackers.breaker.level = 31; s.factionParts.kestrel = 2;
  m = mark(); assemble(s, 'kestrel'); warned(m, /takes 3 parts/);
  s.factionParts.kestrel = 3;
  const id = p.id, was = { ...p.stats }, count = s.stash.length;
  command(s, 'load ' + id);
  command(s, 'hub assemble kestrel');
  assert.equal(s.stash.length, count, 'no new item');
  assert.equal(heldPiece(s, 'kestrel').id, id, 'the same item');
  assert.equal(p.level, 31); assert.equal(p.implicitValue, implicitValue('kestrel', 31, IMPLICIT.piece));
  assert.ok(Object.keys(was).every((k) => p.stats[k] >= was[k]) && p.stats.signal > was.signal, 'its stats grown');
  assert.ok(loaded(s).some((x) => x.id === id), 'still loaded');
  assert.equal(partsOf(s, 'kestrel'), 0);
  // At your level already: the parts stay.
  s.factionParts.kestrel = 3;
  m = mark(); assemble(s, 'kestrel'); warned(m, /already at your level/);
  assert.equal(partsOf(s, 'kestrel'), 3);
  // Broken down since: the next three assemble a fresh one; a full stash waits.
  s.stash = s.stash.filter((x) => x.id !== id);
  s.stash.push(...Array.from({ length: STASH_CAP - s.stash.length }, (_, i) => ({ ...rollItem(seeded(i), { level: 5 }), id: 'z' + i })));
  m = mark(); assemble(s, 'kestrel'); warned(m, /stash is full/);
  assert.equal(partsOf(s, 'kestrel'), 3, 'kept');
  s.stash.pop();
  assemble(s, 'kestrel');
  assert.equal(heldPiece(s, 'kestrel').level, 31);
});

test('parts are shown, not told: three pips in the collection, the hub\'s Assemble tile and the feud card\'s reward', () => {
  const s = world({ level: 14, hubs: ['glassjaw', 'kestrel', 'lantern'] });
  addItem(s, uniqueItem(UNIQUES['root-of-trust'], 50, seeded(1))); // the collection shows once you have one
  s.factionParts = { lantern: 2 };
  const coll = collectionMarkup(s);
  assert.match(coll, /Faction pieces/);
  for (const f of F5) assert.ok(coll.includes(PIECES[f].name), `${f}'s piece listed`);
  const row = coll.slice(coll.indexOf(PIECES.lantern.name));
  assert.match(row, /class="part-pips" [^>]*title="2 of 3 parts"[^>]*><i class="on"><\/i><i class="on"><\/i><i><\/i><\/span>/, 'two of three pips');
  // The hub: Assemble in its menu with the pips, and the tile's button lit only with three.
  const opt = hubOptions(s, 'lantern').find((o) => o.key === 'piece');
  assert.ok(opt && /part-pips/.test(opt.meta));
  const tile = (f) => hubTerminalMarkup(s, f, hubBanner(s, f), 'piece');
  assert.match(tile('lantern'), /data-command="hub assemble lantern" disabled/);
  s.factionParts.lantern = 3;
  assert.match(tile('lantern'), /class="btn small primary" data-command="hub assemble lantern" >Assemble/);
  command(s, 'hub assemble lantern');
  assert.match(tile('lantern'), />Re-tune</, 'held at your level: nothing to re-tune yet');
  assert.match(collectionMarkup(s), /class="coll-piece on"/);
  // The feud card: each side's part as its reward, the next pip marked.
  const ev = feudOf(s, 'glassjaw', 'lantern');
  const card = mapMarkup(s, ev.loc);
  for (const f of ev.sides) assert.match(card, new RegExp(`class="evc-rw fd-part" style="--fc:${FACTIONS[f].color}" title="A part of ${PIECES[f].name}: `), `${f}'s part`);
  assert.match(card, /class="next"/);
  assert.match(card, /class="evc-rw fd-drop"/, 'a win\'s protocol with the side\'s mark');
});

// ---------- the feud's rep ----------
test('feud rep: +4 a runner beaten, +6 for the win (about +14 a good feud), its allies a quarter; nobody ever loses any', () => {
  assert.equal(FEUD.rep, 4); assert.equal(FEUD.bonusRep, 6);
  const s = world({ hubs: ['glassjaw', 'kestrel', 'nullchoir'] });
  const was = reps(s);
  winFeud(s, 'halcyon', 'glassjaw');
  assert.equal(rep(s, 'halcyon') - was.halcyon, 2 * 4 + 6, 'a good feud: +14');
  assert.equal(rep(s, 'kestrel') - was.kestrel, Math.round((4 + 6) * 0.25), 'Halcyon\'s ally: a quarter of a win and the bonus');
  for (const f of ['glassjaw', 'nullchoir', 'lantern']) assert.equal(rep(s, f), was[f], `${f}: no ripple, no loss`);
  // Every side, every pairing: no rep goes down.
  for (const [a, b] of [['glassjaw', 'halcyon'], ['nullchoir', 'kestrel'], ['kestrel', 'nullchoir'], ['nullchoir', 'halcyon']]) {
    const t = world({ hubs: ['glassjaw', 'kestrel', 'nullchoir'] }), w = reps(t);
    winFeud(t, a, b);
    for (const f of Object.keys(FACTIONS)) assert.ok(rep(t, f) >= w[f], `${a} over ${b}: ${f} never down`);
    assert.equal(rep(t, a) - w[a], Math.min(100, w[a] + 14) - w[a]);
    assert.equal(partsOf(t, a), 1);
  }
});
