// Rule text with its key facts in white (dist/ruletext.mjs), and the Skills and talents page's detail panel that shows
// it (skills-page.test.mjs has the rest of the page). Loads view.mjs, whose imports
// install the network's fight hooks, so it runs on its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleHtml } from './dist/ruletext.mjs';
import { ARCHETYPES, SUBS, ABILITIES, SYNC } from './dist/data.mjs';
import { SKILL_TEXT } from './dist/lore.mjs';
import { fresh, command } from './dist/combat.mjs';
import { loadoutMarkup, classPickMarkup } from './dist/view.mjs';

const lit = (html) => [...html.matchAll(/<b class="hi">(.*?)<\/b>/g)].map((m) => m[1]);
const plain = (html) => html.replace(/<\/?b[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

test('the key facts of a rule are lit: numbers with what they count, multipliers, all its ◆', () => {
  const shaped = 'Blows the casing off the target, breaking all its ◆ at once. The target lashes out, and its next attack comes 1 cycle sooner, so use it while that attack is still far off. Against a target with no armor, deals 30 damage instead.';
  assert.deepEqual(lit(ruleHtml(shaped)), ['all its ◆', '1 cycle sooner', '30 damage']);
  assert.deepEqual(lit(ruleHtml('Deals 15 damage and leaves the target Exposed for 2 cycles.')), ['15 damage', 'Exposed', '2 cycles']);
  assert.deepEqual(lit(ruleHtml('Increases all damage you deal by 3% per rank.')), ['3% per rank']);
  assert.deepEqual(lit(ruleHtml('The target takes 25% more damage until it attacks.')), ['25% more damage']);
  assert.deepEqual(lit(ruleHtml('Strikes back for twice the damage, up to 60. Usable once per fight.')), ['twice', 'up to 60', 'once per fight']);
  assert.deepEqual(lit(ruleHtml('[30 damage], ×3 vs a charge')), ['30 damage', '×3']);
  assert.deepEqual(lit(ruleHtml('Deals double damage to a target with no armor.')), ['double damage']);
  assert.deepEqual(lit(ruleHtml('Grants 2 Momentum for 3 cycles. A critical strike resets it.')), ['2 Momentum', '3 cycles', 'critical strike']);
});

test('the highlighter leaves the noise alone: levels, ranks, names with digits, "1 of 3"', () => {
  assert.deepEqual(lit(ruleHtml('Rank 2 (level 50): unlocks at Lv 30 on key 9.')), []);
  assert.deepEqual(lit(ruleHtml('The C2 Node and SH1 slot, 1 of 3 picked.')), []);
  assert.deepEqual(lit(ruleHtml('Hits the last part you attacked.')), [], 'no numbers, no facts');
  // A burn or a shield is lit where it is first named, not every time.
  assert.deepEqual(lit(ruleHtml('Every burn on the target ticks now, and the burn lasts longer.')), ['burn']);
});

test('the highlighter escapes the text, and only adds the marks', () => {
  const html = ruleHtml('<script>"x" & \'y\' deal 5 damage</script>');
  assert.equal(html, '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39; deal <b class="hi">5 damage</b>&lt;/script&gt;');
  assert.equal(ruleHtml(''), '');
  assert.equal(ruleHtml(null), '');
  // Every rule in the game reads the same with its marks taken off, and none is left without a fact it should have.
  const rules = [];
  for (const [k, a] of Object.entries(ARCHETYPES)) {
    rules.push(a.passive.rule, SYNC[k].rule, ...a.spec.map((x) => x.rule));
    for (const x of a.skills) rules.push(SKILL_TEXT[x.id]?.desc || ABILITIES[x.id]?.desc || x.rule, ABILITIES[x.id]?.short || '');
    for (const x of Object.values(a.subs)) rules.push(x.edge.rule, ...x.fillers.flat().map((n) => n.rule), ...x.talents.flat().map((n) => n.rule), ...(x.capstones || []).flatMap((c) => c.rules));
  }
  for (const r of rules) assert.equal(plain(ruleHtml(r)), r);
  for (const r of rules.filter((r) => /\d+ damage/.test(r))) assert.ok(lit(ruleHtml(r)).some((x) => /\d+ damage/.test(x)), r);
});

const breaker = (level, sub = null) => {
  const s = fresh();
  command(s, `developer level ${level}`);
  if (sub) command(s, `subclass breaker ${sub}`);
  return s;
};
// The detail panel: the one place on the Skills and talents page a rule is written out, with its facts lit.
const panelOf = (html) => html.match(/<aside class="sk-panel[^"]*"[^>]*>([\s\S]*?)<\/aside>/)?.[1] || '';

test('the Skills and talents page draws its rule text through the highlighter, in its detail panel', () => {
  const s = breaker(12, 'demolitionist');
  const shaped = panelOf(loadoutMarkup(s, 'breaker', 'skills', { sel: 's:shaped-charge' }));
  assert.match(shaped, /<p class="sk-rule">[^]*<b class="hi">all its ◆<\/b>/);
  assert.match(shaped, /<b class="hi">1 cycle sooner<\/b>/);
  assert.match(shaped, /<b class="hi">\d+ damage<\/b>/, 'the scaled number, lit');
  for (const p of shaped.matchAll(/<p class="sk-rule">(.*?)<\/p>/gs)) assert.doesNotMatch(p[1], /<(?!\/?b[ >])/, 'nothing but the marks inside');
  const node = SUBS.demolitionist.fillers[0][0];
  assert.match(panelOf(loadoutMarkup(s, 'breaker', 'skills', { sel: 't:' + node.id })), /<p class="sk-rule">[^<]*<b class="hi">/, 'the tree’s rules too');
  assert.match(panelOf(loadoutMarkup(s, 'breaker', 'skills', { sel: 'r:edge' })), /<p class="sk-rule">[^<]*<b class="hi">/, 'and the edge');
  assert.match(loadoutMarkup(s, 'breaker', 'skills'), /<span class="tag stag status sk-status" title="Exposed: [^"<]*"/, 'a tooltip stays plain text');
  assert.match(classPickMarkup(), /<small>[^<]*<b class="hi">/, 'and the class picker’s');
});
