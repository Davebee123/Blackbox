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
// The Skills and talents page writes its rules only in tooltips, plain text (the highlighter is for cards with room).
test('the Skills and talents page keeps its rules in plain-text tooltips; the class picker lights its facts', () => {
  const s = breaker(12, 'demolitionist');
  const html = loadoutMarkup(s, 'breaker', 'skills');
  assert.doesNotMatch(html, /class="hi"/);
  assert.match(html, /title="Shaped Charge: [^"<]*all its ◆/);
  assert.match(html, /<span class="tag stag status sk-status" title="Exposed: [^"<]*"/, 'a tooltip stays plain text');
  assert.match(classPickMarkup(), /<small>[^<]*<b class="hi">/, 'and the class picker’s');
});
