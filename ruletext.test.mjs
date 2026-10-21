// Rule text with its key facts in white (dist/ruletext.mjs), and the Skills and talents page that shows it: the
// subclass row over the page, the class alone until you pick, a subclass to preview. Loads view.mjs, whose imports
// install the network's fight hooks, so it runs on its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleHtml } from './dist/ruletext.mjs';
import { ARCHETYPES, SUBS, ABILITIES, SYNC } from './dist/data.mjs';
import { SKILL_TEXT } from './dist/lore.mjs';
import { fresh, command, subOf, subPicked } from './dist/combat.mjs';
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
const card = (html, name) => html.match(new RegExp(`<li class="skill [^"]*"[^>]*><div class="skill-top"><b>(?:(?!</li>).)*?${name}</b>(?:(?!</li>).)*</li>`, 's'))?.[0] || '';

test('the Skills and talents page draws its rule text through the highlighter', () => {
  const s = breaker(12, 'demolitionist');
  const html = loadoutMarkup(s, 'breaker', 'skills');
  const shaped = card(html, 'Shaped Charge');
  assert.match(shaped, /<b class="hi">all its ◆<\/b>/);
  assert.match(shaped, /<b class="hi">1 cycle sooner<\/b>/);
  assert.match(shaped, /<b class="hi">\d+ damage<\/b>/, 'the scaled number, lit');
  for (const p of html.matchAll(/<div class="skill-foot"><p>(.*?)<\/p>/gs)) assert.doesNotMatch(p[1], /<(?!\/?b[ >])/, 'nothing but the marks inside');
  assert.match(html, /<span class="trule">[^<]*<b class="hi">/, 'the tree’s rules too');
  assert.match(html, /title="[^"<]*Breaks all ◆/, 'a tooltip stays plain text');
  assert.match(classPickMarkup(), /<small>[^<]*<b class="hi">/, 'and the class picker’s');
});

test('subclass row: before level 10 the page is the class alone, and a subclass is a preview you cannot pick yet', () => {
  const s = breaker(8);
  const html = loadoutMarkup(s, 'breaker', 'skills');
  assert.match(html, /<nav class="sub-tabs"[^>]*><button type="button" class="sub-tab on" data-arch="breaker\/core" aria-pressed="true"><b>Breaker<\/b>/, 'the class alone, first and on show');
  assert.match(html, /data-arch="breaker\/demolitionist"/);
  assert.match(html, /data-arch="breaker\/overclocker"/);
  assert.match(html, /<h1>Breaker<\/h1><\/div>\s*<div class="tpoints"/, 'the tree is the class’s, not a subclass’s');
  assert.doesNotMatch(html, /Demolitionist ·|Overkill|Shaped Charge|class="ttier/, 'nothing of a subclass on it');
  assert.match(html, /<b>Subclass<\/b><small>Lv 10<\/small>/, 'the bar’s next key is the subclass’s');
  const peek = loadoutMarkup(s, 'breaker/demolitionist', 'skills');
  assert.match(peek, /class="sub-tab on" data-arch="breaker\/demolitionist"/);
  assert.match(peek, /<span class="tag preview">Preview<\/span>/);
  assert.match(peek, /class="card ttree-card preview"/);
  assert.match(peek, /<button type="button" class="btn small" disabled title="Unlocks at level 10">Pick<\/button>/);
  assert.match(card(peek, 'Shaped Charge'), /class="skill locked preview subskill"/);
  assert.match(card(peek, 'Shaped Charge'), />Level 12</, 'its level, with no subclass name in front');
  assert.doesNotMatch(peek, /data-command="(?:talent|equip) breaker/, 'a preview changes nothing');
});

test('subclass row: from level 10 a class that has not picked opens on the class alone, and its preview can be picked', () => {
  const s = breaker(12);
  assert.equal(subPicked(s), false);
  assert.equal(subOf(s), 'demolitionist', 'the mechanics: an unpicked class plays its default subclass');
  const html = loadoutMarkup(s, 'breaker', 'skills');
  assert.match(html, /class="sub-tab on" data-arch="breaker\/core"/);
  assert.doesNotMatch(html, /tag you">yours/, 'no subclass is yours');
  assert.match(html, /<b>Not picked<\/b>/);
  assert.doesNotMatch(html, /<li class="skill [^"]*"[^>]*><div class="skill-top"><b>(?:(?!<\/li>).)*Shaped Charge/s, 'its library is the core');
  assert.match(html, /<li class="slot on from-sub" title="Demolitionist skill: yours until you pick a subclass\. [^"]*"><kbd>\d<\/kbd><b><svg(?:(?!<\/li>).)*<\/svg>Shaped Charge<\/b>/s, 'a bar key from the default subclass says where it comes from');
  const peek = loadoutMarkup(s, 'breaker/demolitionist', 'skills');
  assert.match(peek, /<span class="tag preview">Preview<\/span>/);
  assert.match(peek, /<button type="button" class="btn small primary" data-command="subclass breaker demolitionist" title="Pick Demolitionist">Pick<\/button>/);
  assert.doesNotMatch(peek, /data-command="talent breaker/, 'its tree is read-only until you pick');
  assert.match(card(peek, 'Shaped Charge'), /class="skill locked preview subskill"/, 'its skills are not shown as yours');
});

test('subclass row: a picked subclass is yours, the page opens on it, and the other is a preview to switch to', () => {
  const s = breaker(12, 'overclocker');
  const html = loadoutMarkup(s, 'breaker', 'skills');
  assert.match(html, /class="sub-tab on" data-arch="breaker\/overclocker" aria-pressed="true"><b>Overclocker<\/b><small>[^<]*<\/small><span class="tag you">yours<\/span>/);
  assert.doesNotMatch(html, /tag preview/);
  assert.match(html, /<h1>Overclocker<\/h1>/);
  assert.match(html, /data-command="talent breaker add [a-z-]+"/, 'its tree is yours to spend');
  const other = loadoutMarkup(s, 'breaker/demolitionist', 'skills');
  assert.match(other, /data-command="subclass breaker demolitionist" title="Switch to Demolitionist">Switch<\/button>/);
  assert.match(other, /<h1>Demolitionist <span class="tag preview">Preview<\/span><\/h1>/);
  assert.match(loadoutMarkup(s, 'breaker/core', 'skills'), /<b>Overclocker<\/b><span class="trule">/, 'the class alone names the subclass you picked');
  assert.match(loadoutMarkup(s, 'breaker/core', 'skills'), new RegExp(`<span class="trule">${SUBS.overclocker.edge.name}</span>`), 'with its edge');
});

test('every class draws every view of the page at every stage: the class alone, each subclass, picked or not', () => {
  for (const [cls, a] of Object.entries(ARCHETYPES)) {
    for (const level of [3, 10, 30]) {
      for (const pick of [null, ...Object.keys(a.subs)]) {
        if (pick && level < 10) continue;
        const s = fresh();
        command(s, `archetype ${cls}`);
        command(s, `developer level ${level}`);
        if (pick) command(s, `subclass ${cls} ${pick}`);
        for (const view of [cls, `${cls}/core`, ...Object.keys(a.subs).map((x) => `${cls}/${x}`)]) {
          const at = `${cls} ${level} ${pick} ${view}`, html = loadoutMarkup(s, view, 'skills');
          assert.doesNotMatch(html, /undefined|NaN|\[object/, at);
          assert.equal((html.match(/class="sub-tab on"/g) || []).length, 1, `${at}: one tab on show`);
          const sub = view.split('/')[1], peek = !!sub && sub !== 'core' && sub !== pick;
          assert.equal(/class="tag preview"/.test(html), peek, `${at}: Preview on a subclass that isn't yours, and only there`);
          assert.equal(/data-command="talent /.test(html), !peek && !!pick && sub !== 'core', `${at}: talents to spend only in your own subclass's tree`);
        }
      }
    }
  }
});
