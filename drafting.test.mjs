// Roguelite phase 3 (docs/roguelite.md 9.3): drafting that rewards skill, rolled genomes on breach nodes, heat 1 to 8,
// the wider pool and the leaner loot. The structure here; the bots' measurements (skill against luck, seed variance,
// the card table, loot by level) at the end, with breachsim.mjs printing the full tables.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, finish, livingParts, part, mutated, hackerLevel, gainXp, restore } from './dist/combat.mjs';
import { CONFIG, ABILITIES, FAMILIES } from './dist/data.mjs';
import { GENES, compatible, rollGenome, GENE_COUNT, budgetFor, partGenes } from './dist/genes.mjs';
import { generateMap, nodeList, startBreach, outfit, go, act, fight, settle, reachable, visible, firstRow, nextOf, BREACH, BROKERS, genomeOfNode, recompilable, fogOf, SERVER_CARD } from './dist/breach.mjs';
import { MODS, CVES, TAGS, rollDraft, modPool, cvePool, cveWorks, buildTags, linksOf, kitCounts, DRAFT, patchMods, unpatchMods } from './dist/drafts.mjs';
import { HEAT, MAX_HEAT, heatRules } from './dist/heat.mjs';
import { REWRITES, SUBSYSTEMS } from './dist/rewrites.mjs';
import { seeded } from './dist/gear.mjs';
import { decodeGene } from './dist/genome.mjs';
import { AUTHORS } from './dist/authors.mjs';
import { breachMarkup } from './dist/breach-view.mjs';
import { newCampaign, launch, leave, recOf, migrate, heatOpen, statusOf, CAMPAIGN, HEAT_UNLOCKS, outputsFor, bountiesOn, SERVERS } from './dist/campaign.mjs';
import { campaignMarkup, campUi } from './dist/campaign-view.mjs';
import { breachHooks } from './dist/breach.mjs';
import { skillGap, seedVariance, cardTable } from './breachsim.mjs';

const CRIT = CONFIG.enemyCrit;
const SUB = { breaker: 'demolitionist', bastion: 'warden', infiltrator: 'payload', operator: 'herder' };
function breach(cls = 'breaker', seed = 3, opts = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  outfit(s, { cls, level: opts.level || 10, sub: SUB[cls], gearSeed: seed });
  startBreach(s, { seed, level: opts.level || 10, heat: opts.heat || 0 });
  return s;
}
const win = (s, n) => { s.breach.screen = null; s.breach.queue = []; fight(s, n); for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); };

// ---------- reward kinds on the map ----------
test('the map: every fight node shows what its draft offers, each act shows every kind, and the draft keeps the promise', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const map = generateMap(seed, 10), fights = nodeList(map).filter((n) => n.kind === 'virus' || n.kind === 'elite');
    for (const n of fights) assert.ok(['mod', 'cve', 'gear'].includes(n.reward), `${seed} ${n.id}`);
    for (const n of fights.filter((x) => x.kind === 'elite')) assert.equal(n.reward, 'cve', 'an elite offers CVEs');
    for (let a = 0; a < 3; a++) assert.deepEqual([...new Set(fights.filter((n) => n.act === a).map((n) => n.reward))].sort(), ['cve', 'gear', 'mod'], `seed ${seed} act ${a}`);
    assert.ok(!fights.some((n) => n.act === 0 && n.rare), 'no rare mark on the perimeter');
  }
  // Gear is a chase: a sixth of the fights promise it.
  const all = Array.from({ length: 40 }, (_, i) => nodeList(generateMap(i + 1, 10))).flat().filter((n) => n.reward);
  const share = all.filter((n) => n.reward === 'gear').length / all.length;
  assert.ok(share > 0.1 && share < 0.3, `gear ${Math.round(share * 100)}%`);
  // The draft after a fight is its promise; a rare mark puts a yellow in it.
  const s = breach('operator', 4), b = s.breach;
  for (const k of ['mod', 'cve', 'gear']) {
    const n = nodeList(b.map).find((x) => x.kind === 'virus' && x.reward === k) || nodeList(b.map).find((x) => x.kind === 'virus');
    n.reward = k; n.rare = k === 'cve';
    win(s, n);
    assert.equal(b.screen.kind, 'draft');
    assert.ok(b.screen.cards.every((c) => c.kind === k), `${k}: ${b.screen.cards.map((c) => c.kind)}`);
    if (k === 'cve') assert.ok(b.screen.cards.some((c) => c.rarity === 'custom'), 'the rare mark keeps its promise');
  }
  // On the page: a reward pill on each lit fight node, and the promise on the draft's kicker.
  const t = breach('breaker', 5), html = breachMarkup(t);
  for (const n of firstRow(t.breach.map)) assert.match(html, new RegExp(`data-arg="${n.id}"[^>]*>.*?bx-rw rw-${n.reward}`));
  assert.match(html, /bx-peek-card[\s\S]*bx-rw rw-/);
});

// ---------- no dead offers, pity, kinds ----------
test('no dead offers: mods for your bar, CVEs that want what your build makes; the rare pity rises and resets', () => {
  for (const cls of ['breaker', 'bastion', 'infiltrator', 'operator']) {
    const s = breach(cls, 2), bar = ['spike', ...s.breach && Object.values(MODS).filter((m) => m.cls === cls).map((m) => m.skill)];
    const build = buildTags(s);
    for (const id of modPool(s)) { assert.equal(MODS[id].cls, cls); }
    for (const id of cvePool(s)) { const c = CVES[id]; assert.ok(!c.wants.length || c.wants.some((t) => build.makes[t] > 0), `${cls}: ${id} wants ${c.wants}`); }
    assert.ok(bar.length);
  }
  // A Breaker makes no burns and no helpers: Thermite and Qbot are never offered to it. An Infiltrator gets Thermite.
  const brk = breach('breaker', 2), inf = breach('infiltrator', 2);
  assert.ok(!cvePool(brk).includes('thermite') && !cvePool(brk).includes('qbot'));
  assert.ok(cvePool(inf).includes('thermite'));
  // Ripple20 needs SIGINT: not below level 10.
  const low = breach('breaker', 2, { level: 6 });
  assert.ok(!cveWorks(low, 'ripple20') && cveWorks(brk, 'ripple20'));
  // Pity: every draft without a rare adds to the next one's odds; one with a rare resets them.
  const s = breach('operator', 6), b = s.breach;
  let seen = 0;
  for (let i = 0; i < 40; i++) { const before = b.rareBoost || 0, cards = rollDraft(s, seeded(i + 9), 'virus', { act: 0 }); if (cards.some((c) => c.rarity === 'custom')) { assert.equal(b.rareBoost, 0); seen++; } else assert.equal(b.rareBoost, before + DRAFT.rareStep); }
  assert.ok(seen >= 3, `${seen} drafts showed a rare`);
});

test('tags: every card names what it makes and wants; your kit makes its class\'s own; a card lights up where it meets the build', () => {
  for (const c of [...Object.values(MODS), ...Object.values(CVES)]) for (const t of [...c.makes, ...c.wants]) assert.ok(TAGS[t], `${c.id}: ${t}`);
  assert.ok(Object.values(MODS).filter((m) => m.makes.length || m.wants.length).length >= 38, 'nearly every mod is tagged');
  const inf = breach('infiltrator', 3), op = breach('operator', 3);
  assert.ok(kitCounts(inf).burn >= 3 && !kitCounts(inf).helper, 'an Infiltrator makes burns');
  assert.ok(kitCounts(op).helper >= 3, 'an Operator makes helpers');
  // Thermite wants burns or helpers: lit for both, by more than one link.
  assert.ok(linksOf(inf, { kind: 'cve', id: 'thermite' }).n >= 2);
  assert.ok(linksOf(op, { kind: 'cve', id: 'thermite' }).tags.some((x) => x.tag === 'helper' && x.on));
  // A make lights when a card you hold wants it: TOCTTOU wants delays, so Backpressure's delay lights for a Bastion who holds it.
  const bas = breach('bastion', 3);
  assert.ok(!linksOf(bas, { kind: 'mod', id: 'backpressure' }).tags.find((x) => x.tag === 'delay').on);
  bas.breach.cves.push('tocttou');
  assert.ok(linksOf(bas, { kind: 'mod', id: 'backpressure' }).tags.find((x) => x.tag === 'delay').on);
  // On the page: chips, lit ones marked, a link count on the kicker, and the build line over the draft.
  inf.breach.screen = { kind: 'draft', title: 'Draft', draft: 'cve', cards: [{ kind: 'cve', id: 'thermite', rarity: 'tuned' }, { kind: 'cve', id: 'log4shell', rarity: 'tuned' }] };
  const html = breachMarkup(inf);
  assert.match(html, /class="bx-build"[\s\S]*bx-tag m on[^>]*>burn ×\d/);
  assert.match(html, /bx-link[^>]*>×\d/);
  assert.match(html, /bx-tag w on[^>]*>◂ burn/);
});

// ---------- the levers ----------
test('recompile: a defrag (or NULL CHOIR) turns a mod into its + version; Zerologon rests and recompiles', () => {
  const s = breach('bastion', 3), b = s.breach;
  b.mods = ['grudge-match', 'ban-hammer'];
  const d = nodeList(b.map).find((n) => n.kind === 'defrag');
  b.screen = { kind: 'defrag', node: d.id };
  assert.match(breachMarkup(s), /data-breach="recompile"/);
  act(s, 'recompile');
  assert.ok(b.screen.recompile);
  assert.match(breachMarkup(s), /Grudge Match <span class="bx-arrow">→<\/span> <span class="you">Grudge Match\+/);
  act(s, 'plus', 'grudge-match');
  assert.deepEqual(b.plus, ['grudge-match']);
  assert.equal(b.screen, null);
  assert.deepEqual(recompilable(b), ['ban-hammer']);
  patchMods(b.mods, b.plus);
  assert.equal(ABILITIES.retaliate.window, 3, 'the + value is on');
  unpatchMods();
  // A new mod on the same skill replaces it, + and all.
  b.screen = { kind: 'draft', cards: [{ kind: 'mod', id: 'grudge-match', rarity: 'tuned' }] };
  // Zerologon: rest, then recompile on the same defrag.
  b.cves.push('zerologon'); b.signal = 10;
  b.screen = { kind: 'defrag', node: d.id };
  act(s, 'rest');
  assert.ok(b.signal > 10 && b.screen?.recompile, 'rested, and the recompile is up');
  act(s, 'plus', 0);
  assert.deepEqual(b.plus.sort(), ['ban-hammer', 'grudge-match']);
  // NULL CHOIR recompiles for tokens; LANTERN shows an act; GLASSJAW sells a reroll.
  const t = breach('operator', 3), c = t.breach;
  c.mods = ['clone']; c.tokens = 500;
  const br = nodeList(c.map).find((n) => n.kind === 'broker');
  for (const id of ['nullchoir', 'lantern', 'glassjaw']) {
    c.screen = { kind: 'broker', node: br.id, faction: id, stock: [] };
    if (id === 'nullchoir') { act(t, 'service'); assert.ok(c.screen.recompile); act(t, 'service', 'clone'); assert.deepEqual(c.plus, ['clone']); }
    if (id === 'lantern') { act(t, 'service'); assert.ok(c.fx.reveal.length, 'an act revealed'); assert.ok(nodeList(c.map).filter((n) => n.act === c.fx.reveal[0]).every((n) => visible(t, n))); }
    if (id === 'glassjaw') { const r = c.rerolls; act(t, 'service'); assert.equal(c.rerolls, r + 1); }
    assert.ok(c.screen.served);
  }
  assert.ok(c.tokens < 500);
  assert.equal(BROKERS.nullchoir.service.id, 'recompile');
});

test('levers: an elite pays a reroll, a skip pays tokens, a broker\'s stock leans to your build', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('infiltrator', 7), b = s.breach, r0 = b.rerolls;
  win(s, nodeList(b.map).find((n) => n.kind === 'elite'));
  assert.equal(b.rerolls, r0 + 1);
  assert.ok(b.screen.cards.every((c) => c.kind === 'cve'));
  const t0 = b.tokens;
  act(s, 'skip');
  assert.equal(b.tokens, t0 + DRAFT.skip);
  // Over many stalls, the stock links with the build more than a plain draft of the same kind does.
  let stall = 0, plain = 0;
  for (let i = 0; i < 30; i++) {
    const t = breach('infiltrator', 20 + i), c = t.breach, n = nodeList(c.map).find((x) => x.kind === 'broker');
    c.at = nodeList(c.map).find((x) => x.step === n.step - 1 && nextOf(c.map, x.id).includes(n)).id;
    n.faction = 'lantern';
    go(t, n.id);
    stall += t.breach.screen.stock.filter((x) => x.kind === 'cve').reduce((k, x) => k + linksOf(t, x).n, 0);
    plain += rollDraft(t, seeded(i), 'cve', { act: n.act }).slice(0, 2).reduce((k, x) => k + linksOf(t, x).n, 0);
  }
  assert.ok(stall > plain, `stall ${stall} plain ${plain}`);
});

// ---------- rolled genomes ----------
test('genomes: sampled breach viruses obey the mutation cap (one wild, two elite), the budget and the compatibility rules', () => {
  let wild = 0, mutated1 = 0, elites = 0;
  for (let seed = 1; seed <= 60; seed++) for (const level of [3, 6, 10, 14, 19, 24]) {
    const map = generateMap(seed, level);
    for (const n of nodeList(map).filter((x) => x.genes)) {
      const muts = n.genes.filter((id) => GENES[id].mutation), parts3 = n.genes.filter((id) => GENES[id].parts);
      const elite = n.kind === 'elite';
      assert.ok(muts.length <= (elite ? 2 : 1), `${seed} ${n.id}: ${n.genes}`);
      assert.ok(parts3.length <= 1, 'one third part');
      assert.ok(n.genes.every((id) => GENES[id].opens <= n.level), 'open at its level');
      const cost = n.genes.reduce((k, id) => k + GENES[id].cost, 0);
      assert.ok(cost <= Math.max(0, budgetFor(n.level, { elite }) + BREACH.geneBonus), `${n.id} costs ${cost}`);
      const core = FAMILIES[n.family].parts.filter((p) => p.pool !== 'third').flatMap((p) => partGenes(p));
      assert.deepEqual(compatible([...core, ...n.genes]), [], `${n.genes}`);
      if (n.level < 4) assert.deepEqual(n.genes, [], 'the body only, under level 4');
      if (!elite) { wild++; if (muts.length) mutated1++; } else elites++;
    }
  }
  assert.ok(mutated1 > wild * 0.15, 'mutations show up');
  assert.ok(elites > 50);
  // Two seeds, two different genomes: fights stop being memorizable.
  const a = nodeList(generateMap(1, 12)).filter((n) => n.genes).map((n) => n.genes.join('+'));
  assert.ok(new Set(a).size >= 3, a);
});

test('genomes: a mutation lives on a part, and breaking that part ends the rule; the node shows its genes as chips', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('breaker', 3), b = s.breach;
  const n = nodeList(b.map).find((x) => x.kind === 'virus');
  Object.assign(n, { genes: ['hasty', 'armored'], third: null, muts: ['hasty', 'armored'] });
  fight(s, n);
  const v = s.encounter.virus;
  assert.equal(v.mutations.length, 2);
  for (const m of v.mutations) assert.ok(part(s, m.part).carries.includes(m.id));
  assert.notEqual(v.mutations[0].part, v.mutations[1].part, 'two mutations, two parts');
  assert.ok(mutated(s, 'hasty') && mutated(s, 'armored'));
  assert.ok(v.genes.some((g) => g.id === 'hasty' && g.src === 'rolled'));
  const carrier = part(s, v.mutations.find((m) => m.id === 'armored').part), other = livingParts(s).find((p) => p !== carrier);
  const armor = other.maxArmor;
  carrier.integrity = 1; carrier.armor = 0;
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 999;
  command(s, `spike ${carrier.id}`); resolveCycle(s);
  assert.equal(carrier.integrity, 0);
  assert.ok(!mutated(s, 'armored'), 'the rule ends with its part');
  assert.equal(other.maxArmor, armor - 1, 'the extra ◆ goes');
  assert.ok(s.logs.some((x) => /carried Armored\. The rule ends with it/.test(x.message)));
  // The node card: ??? for a gene you've never met, its name once you have.
  const t = breach('breaker', 3), m = reachable(t)[0];
  Object.assign(m, { genes: ['ward'], third: 'ward', muts: [] });
  assert.match(breachMarkup(t), /gchip g-rolled unknown/);
  t.geneCodex = {}; decodeGene(t, 'ward');
  assert.match(breachMarkup(t), /gchip g-rolled[^"]*"[^>]*>[\s\S]*?ward/);
  // Bosses keep their hand-written genes: the Resident rolls none.
  assert.ok(!generateMap(5, 10).nodes.core.genes);
});

test('Sinkhole and Testbed shape the roll: only decoded genes, or one more point', () => {
  const r = () => seeded(7);
  const known = new Set(['hasty']);
  for (let i = 0; i < 30; i++) for (const id of rollGenome({ rand: seeded(i), level: 14, family: 'ransomware', known })) assert.equal(id, 'hasty');
  const pts = (bonus) => Array.from({ length: 40 }, (_, i) => genomeOfNode(seeded(i), 9, 'worm', 'swarmline', false, false, { bonus }).genes.reduce((k, id) => k + GENES[id].cost, 0)).reduce((a, x) => a + x, 0);
  assert.ok(pts(1) > pts(0));
  assert.ok(r);
});

// ---------- heat ----------
test('heat: eight ranks, each one clear modifier; the breach and the page show it', () => {
  assert.equal(MAX_HEAT, 8);
  for (let h = 1; h <= 8; h++) { assert.ok(HEAT[h].name && HEAT[h].text.endsWith('.')); }
  const r = heatRules(8);
  assert.ok(r.loud && r.gateTell && r.moreElites && r.rest === 0.2 && r.audit && r.fog === 1 && r.shortList && r.resident);
  assert.equal(heatRules(3).rest, null);
  // Rotation: one more elite an act.
  const elites = (h) => Array.from({ length: 20 }, (_, i) => nodeList(generateMap(i + 1, 10, SERVER_CARD, { heat: h })).filter((n) => n.kind === 'elite').length).reduce((a, x) => a + x, 0);
  assert.ok(elites(3) >= elites(0) + 40, `${elites(0)} -> ${elites(3)}`);
  // Audit: no reroll, a skip pays nothing. Fog of war: 1 row. Short list: a card fewer. Thin pipe: 20% rest.
  const s = breach('breaker', 4, { heat: 8 }), b = s.breach;
  assert.equal(b.rerolls, 0);
  assert.equal(fogOf(s), 1);
  const n = nodeList(b.map).find((x) => x.kind === 'virus');
  win(s, n);
  assert.equal(b.screen.cards.length, DRAFT.cards - 1);
  const t0 = b.tokens; act(s, 'skip'); assert.equal(b.tokens, t0, 'Audit');
  // Loud: bigger fights. Hardened ICE: a gate's extra tell. Hardened Resident: bigger, and a re-arm at 80%.
  const cold = breach('breaker', 4);
  fight(cold, nodeList(cold.breach.map).find((x) => x.id === n.id));
  const hot = breach('breaker', 4, { heat: 1 });
  fight(hot, nodeList(hot.breach.map).find((x) => x.id === n.id));
  assert.ok(hot.encounter.virus.parts[0].max > cold.encounter.virus.parts[0].max);
  const g = breach('breaker', 4, { heat: 2 });
  fight(g, g.breach.map.nodes.gate1);
  assert.ok(g.encounter.virus.tellSet.includes('lock') && g.encounter.virus.extraTells === 1);
  const R = breach('breaker', 4, { heat: 8 });
  fight(R, R.breach.map.nodes.core);
  assert.equal(R.encounter.virus.phases[0].at, 0.8);
  // The strip shows heat with its modifiers on hover; the end card names it.
  assert.match(breachMarkup(s), /bx-heat" title="Heat 8: Loud\.[^"]*Hardened Resident/);
  // Rewards: rare odds and item levels.
  assert.ok(b.fx.rareOdds === 24 && b.fx.gearLevel === 5);
});

// ---------- the campaign: heat, the pool, the save ----------
function camp(cls = 'breaker', seed = 7) {
  const s = fresh();
  s.rng = seed * 99991;
  s.profile = { handle: 'tester', pwLen: 6, since: 0 };
  command(s, `archetype ${cls}`);
  newCampaign(s, { seed });
  return s;
}
test('campaign heat: a capture at your highest opens the next, records the server\'s best, and opens cards; re-imaging asks for that heat', () => {
  const s = camp();
  assert.equal(heatOpen(s), 0);
  let b = launch(s, 'sprawl-00', { heat: 3 });
  assert.equal(b.heat, 0, 'no higher than what is open');
  b.result = 'won'; breachHooks.over(s, 'won');
  assert.equal(heatOpen(s), 1);
  assert.equal(b.report.heat, 1);
  leave(s);
  b = launch(s, 'vanta-07', { heat: 1 });
  assert.equal(b.heat, 1);
  b.result = 'won'; breachHooks.over(s, 'won');
  assert.equal(heatOpen(s), 2);
  assert.equal(recOf(s, 'vanta-07').heat, 1);
  for (const id of HEAT_UNLOCKS[1]) assert.ok(s.camp.mods.includes(id) || s.camp.pool.includes(id), id);
  assert.ok(b.report.unlocks.some((u) => u.id === 'critical-mass'));
  leave(s);
  assert.equal(launch(s, 'vanta-07', { heat: 0 }), null, 'a re-image asks for heat 1 or more');
  assert.ok(launch(s, 'vanta-07', { heat: 2 }));
  leave(s); s.breach = null;
  // The card: a heat picker with the modifiers in force, and the server's best.
  campUi.sel = 'vanta-07'; campUi.heat['vanta-07'] = 2;
  const html = campaignMarkup(s);
  assert.match(html, /data-camp="heat" data-arg="vanta-07:-1"/);
  assert.match(html, /cp-heat-mod[^>]*><b>2<\/b>Hardened ICE/);
  assert.match(html, /Re-image · heat 2/);
  assert.match(html, /cp-mark heat[^>]*>H1/);
  campUi.sel = null; campUi.heat = {};
});

test('the pool: a readable core set to start, captures and heat widen it; second mods wait for heat', () => {
  const s = camp('infiltrator');
  assert.deepEqual(s.camp.pool, CAMPAIGN.startCves);
  assert.ok(CAMPAIGN.startCves.every((id) => CVES[id].rarity === 'common'));
  assert.deepEqual(s.camp.mods, []);
  for (const id of ['vanta-07', 'coldstore-3', 'pier-5', 'depot-7', 'chapel-0', 'meridian-14']) {
    const b = launch(s, id); if (!b) { recOf(s, id).captured = true; continue; }
    b.result = 'won'; breachHooks.over(s, 'won'); leave(s);
  }
  assert.ok(s.camp.pool.length >= CAMPAIGN.startCves.length + 5);
  // Every CVE is reachable: a start card, a server's first capture, a heat, or a bounty.
  const sources = new Set([...CAMPAIGN.startCves, ...Object.values(HEAT_UNLOCKS).flat(), ...SERVERS.map((x) => x.unlock).filter(Boolean)]);
  for (const id of Object.keys(CVES)) assert.ok(sources.has(id), `${id} has a way into the pool`);
  for (const m of Object.values(MODS).filter((x) => x.alt)) assert.ok(sources.has(m.id), `${m.id} opens with heat`);
});

test('the save: a v1 campaign migrates in place (its own key), a breach in flight gains its new fields', () => {
  const s = camp();
  s.camp.v = 1; delete s.camp.mods; delete s.camp.heat; delete s.camp.heatCleared; delete s.camp.replays;
  s.camp.pool = ['heartbleed', 'bluekeep'];
  recOf(s, 'sprawl-00').captured = true; delete recOf(s, 'sprawl-00').heat;
  launch(s, 'vanta-07');
  delete s.breach.plus; delete s.breach.rules; delete s.breach.heat;
  const back = restore(JSON.parse(JSON.stringify(s)));
  migrate(back);
  assert.equal(back.camp.v, 2);
  assert.deepEqual(back.camp.mods, []);
  assert.equal(back.camp.heat, 0);
  assert.ok(back.camp.pool.includes('bluekeep') && CAMPAIGN.startCves.every((id) => back.camp.pool.includes(id)));
  assert.equal(recOf(back, 'sprawl-00').heat, 0);
  assert.deepEqual(back.breach.plus, []);
  assert.equal(back.breach.heat, 0);
  assert.ok(breachMarkup(back));
});

test('rewrites: the new nine-subsystem catalogue does what its Now says', () => {
  const s = breach('breaker', 3), b = s.breach;
  const pick = (id) => { const r = REWRITES[id]; b.screen = { kind: 'rewrite', sub: r.sub, tier: 1, options: SUBSYSTEMS[r.sub].rewrites }; b.at ||= firstRow(b.map)[0].id; act(s, 'pick', SUBSYSTEMS[r.sub].rewrites.indexOf(id)); };
  b.pack = ['x'];
  pick('serviceaccount'); assert.deepEqual([b.pack, b.banked.at(-1)], [[], 'x'], 'Service Account banks now');
  pick('zonetransfer'); assert.ok(b.fx.reveal.includes(0));
  pick('audittrail'); assert.ok(b.fx.audit);
  pick('listeningpost'); assert.ok(b.fx.eliteMore);
  pick('testbed'); assert.equal(b.fx.gearLevel, 2);
  pick('bountyboard'); assert.equal(b.bounty, 'norest');
  pick('range'); assert.ok(b.fx.nextMore);
  pick('sinkhole'); assert.ok(b.gen.sinkhole);
  assert.ok(nodeList(b.map).filter((n) => n.act === 0 && n.genes && !b.cleared[n.id] && n.id !== b.at).every((n) => n.genes.length === 0), 'nothing decoded: the act rolls bodies only');
});

// ---------- the bots: skill against luck ----------
// The fight tests above turn enemy crits off; the bots play the game as it ships (CRIT, read at load).
// breachsim.mjs skill / cards / variance print the full tables (docs/roguelite.md 9.3 has them). These are smaller
// samples on fixed seeds, with bands, so the test holds the shape: drafting matters, reading the tags beats luck, a
// seed doesn't decide the run, and no card runs away with it. The Bastion is left out: its Warden wins at ceiling.
test('skill: drafting matters, and the smart drafter (tags) beats the random one at the same heat', { timeout: 600000 }, () => {
  CONFIG.enemyCrit = CRIT;
  const r = skillGap({ classes: ['breaker', 'infiltrator', 'operator'], policies: ['none', 'random', 'smart'], runs: 32, heat: 2 });
  assert.ok(r.random.all - r.none.all >= 0.12, `drafting is worth ${Math.round((r.random.all - r.none.all) * 100)} points`);
  assert.ok(r.smart.all - r.random.all >= 0.06, `smart ${Math.round(r.smart.all * 100)}% against random ${Math.round(r.random.all * 100)}%`);
  for (const cls of ['breaker', 'operator']) assert.ok(r.smart[cls] > r.random[cls], `${cls}: smart ${r.smart[cls]} random ${r.random[cls]}`);
});

test('seed variance: the smart bot\'s per-seed outcomes are bounded; few seeds are lost every time', { timeout: 600000 }, () => {
  CONFIG.enemyCrit = CRIT;
  const v = seedVariance({ classes: ['operator', 'infiltrator'], seeds: 12, reps: 3, heat: 2 });
  assert.ok(v.lostAlways <= 0.4, `${Math.round(v.lostAlways * 100)}% of seeds always lost`);
  assert.ok(v.sd <= 0.45, `per-seed sd ${v.sd.toFixed(2)}`);
});

test('the card table: no card runs away with a breach, and none is a trap', { timeout: 600000 }, () => {
  CONFIG.enemyCrit = CRIT;
  const { games } = skillGap({ classes: ['breaker', 'infiltrator', 'operator'], policies: ['random'], runs: 120, heat: 2, keep: true });
  const rows = cardTable(games, { min: 20 });
  assert.ok(rows.length >= 15, `${rows.length} cards with enough picks`);
  // Wide bands for a small sample (the full table, at about 50 picks a card, is in docs/roguelite.md 9.3).
  for (const x of rows) assert.ok(x.edge <= 0.35 && x.edge >= -0.35, `${x.cls} ${x.id}: edge ${Math.round(x.edge * 100)}`);
});
