// Ability mastery (dist/mastery.mjs): every ability you fire in a fight counts on the save, per class; at its
// thresholds its effect reaches tier 2 and tier 3 (abilityfx.mjs tierRecipe). Only your own fired uses count (typed,
// the tray's, the timer's auto-repeat, your routine's), never a daemon's or a crewmate's; the tier you choose persists;
// the tray's tooltip and the Skills page say where it stands; a handful of achievements reward it, cosmetically.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, command, resolveCycle, active, restore, selectEncounter, livingParts } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { ABILITIES, ARCHETYPES, SUBS, SPIKE, isRunSkill } from './dist/data.mjs';
import { MASTERY, TIERS_N, thresholdsOf, masteryList, masterable, kitOf, usesOf, earnedTier, tierOf, noteUse, progressOf, masteryLine, masteredN, keyOnesN, kitBest } from './dist/mastery.mjs';
import { RECIPES, keyFor, tierRecipe } from './dist/abilityfx.mjs';
import { trayMarkup, loadoutMarkup, skillDetailMarkup } from './dist/view.mjs';
import { achievements, achById, tickAchievements, earned, bannersOf } from './dist/achievements.mjs';
import { myProfile, REWARD_BANNERS, stickerById, titles } from './dist/profile.mjs';
import { matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';

const at = (cls, level) => { const s = fresh(); command(s, `archetype ${cls}`); command(s, `developer level ${level}`); return s; };
const fight = (s, seed = 3) => { selectEncounter(s, 'cryptjack', seed, { level: 4 }); command(s, 'engage'); return s; };
const target = (s) => livingParts(s)[0].id;

test('thresholds by how often an ability can fire: key 1 and the staples 100 and 1000, the rotation 75 and 750, the rare ones lower', () => {
  assert.equal(TIERS_N, 3);
  assert.deepEqual(thresholdsOf('spike'), [null, 0, 100, 1000]);
  assert.deepEqual(thresholdsOf('crack'), [null, 0, 100, 1000]);
  assert.deepEqual(thresholdsOf('overload'), [null, 0, 75, 750]);
  assert.deepEqual(thresholdsOf('sigint'), [null, 0, 40, 400]);
  assert.deepEqual(thresholdsOf('zero-day'), [null, 0, 20, 200], 'once a fight');
  assert.deepEqual(thresholdsOf('takeover'), [null, 0, 20, 200], '12 cycles');
  assert.ok(MASTERY.bands.every((b) => b.at[1] === b.at[0] * 10), 'tier 2 a tenth of the way');
  for (const cls of Object.keys(ARCHETYPES)) {
    const list = masteryList(cls);
    assert.ok(list.includes('spike') && list.includes('sigint') && ARCHETYPES[cls].core.every((id) => list.includes(id)), cls);
    assert.ok(list.length >= 25 && list.every((id) => masterable(id, cls) && RECIPES[keyFor(id, cls)] && !isRunSkill(id)), `${cls}: every ability with an effect`);
    for (const id of list) { const t = thresholdsOf(id); assert.ok(t[2] >= 20 && t[3] <= 1000 && t[3] > t[2], `${cls} ${id}`); }
    for (const sub of Object.keys(ARCHETYPES[cls].subs)) assert.ok(kitOf(cls, sub).length >= 10 && kitOf(cls, sub).includes('spike'), `${cls} ${sub}'s kit`);
  }
  assert.equal(masterable('spoof', 'infiltrator'), false, 'run skills never fire in a fight');
});

test('only your own fired uses in a fight count: typed, from the tray, auto-repeat; not a refused one, a daemon\'s or a crewmate\'s', () => {
  const s = fight(at('bastion', 6));
  assert.equal(usesOf(s, 'bastion', 'spike'), 0);
  command(s, `spike ${target(s)}`); resolveCycle(s);
  assert.equal(usesOf(s, 'bastion', 'spike'), 1, 'key 1, under its class (Ban)');
  resolveCycle(s); // nothing queued: the timer's auto-repeat fires it again
  assert.equal(usesOf(s, 'bastion', 'spike'), 2, 'the auto-repeat is yours too');
  command(s, `rate-limit ${target(s)}`); resolveCycle(s);
  assert.equal(usesOf(s, 'bastion', 'rate-limit'), 1);
  const was = usesOf(s, 'bastion', 'rate-limit');
  command(s, `rate-limit ${target(s)}`); resolveCycle(s); // on cooldown: refused, never fired
  assert.equal(usesOf(s, 'bastion', 'rate-limit'), was, 'a command that failed is no use');
  assert.deepEqual(Object.keys(s.mastery.uses), ['bastion'], 'per class');
  // A daemon's, a crewmate's state (s.who), an ability with no effect: nothing.
  noteUse(s, 'spike', 'daemon', 'bastion');
  noteUse({ ...s, who: 'nyx', mastery: s.mastery }, 'spike', false, 'bastion');
  noteUse(s, 'spoof', false, 'infiltrator');
  assert.equal(usesOf(s, 'bastion', 'spike'), 2);
  assert.equal(usesOf(s, 'infiltrator', 'spoof'), 0);
  // A crew fight: your count is your own resolved commands; the crewmates' never reach your save.
  const c = fresh();
  c.hackers = { breaker: { level: 5, xp: 0 } };
  play(c, 'crew sim bastion operator'); play(c, 'connect sprawl'); play(c, 'cd var'); play(c, 'attack');
  for (let n = 0; n < 60 && active(c); n++) { command(c, planner(c) || 'hold'); resolveCycle(c); }
  assert.equal(c.reports.at(-1).result, 'victory');
  const mine = c.logs.filter((e) => e.type === 'resolved' && e.ability && !e.who && e.auto !== 'daemon');
  assert.ok(c.logs.some((e) => e.type === 'resolved' && e.who), 'the crew fired too');
  const counted = Object.values(c.mastery.uses.breaker).reduce((a, n) => a + n, 0);
  assert.equal(counted, mine.filter((e) => masterable(e.ability, 'breaker')).length, 'only yours');
  assert.deepEqual(Object.keys(c.mastery.uses), ['breaker'], 'nothing under the crew\'s classes');
  assert.ok(matesOf(c).every((m) => !m.mastery), 'the crewmates count nothing either');
  // The engine notes it where the command fires (combat.mjs useAbility), after its checks.
  const src = readFileSync(new URL('./dist/combat.mjs', import.meta.url), 'utf8');
  assert.match(src, /e\.metrics\.actions\[id\] = \(e\.metrics\.actions\[id\] \|\| 0\) \+ 1;\n  noteUse\(s, id, auto, classOf\(s\)\);/);
});

test('tiers by uses; the tier you choose persists through a save, and choosing your highest follows you up', () => {
  const s = at('infiltrator', 20);
  const set = (id, n) => { play(s, `developer mastery ${id} ${n}`); };
  assert.equal(earnedTier(s, 'infiltrator', 'inject'), 1);
  set('inject', 74); assert.equal(earnedTier(s, 'infiltrator', 'inject'), 1);
  set('inject', 75); assert.equal(earnedTier(s, 'infiltrator', 'inject'), 2);
  set('inject', 750); assert.equal(earnedTier(s, 'infiltrator', 'inject'), 3);
  assert.equal(tierOf(s, 'infiltrator', 'inject'), 3, 'by default the highest');
  // Choose tier 2; it holds through a save and a load.
  const said = play(s, 'mastery inject 2');
  assert.match(said.at(-1).message, /Inject: its effect plays at tier 2\./);
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(tierOf(back, 'infiltrator', 'inject'), 2, 'the choice persists');
  assert.deepEqual(back.mastery.pick, { infiltrator: { inject: 2 } });
  // A tier not unlocked yet is refused; key 1 by its class's word; another class's by its name.
  set('poke', 99);
  assert.match(play(s, 'mastery poke 2').at(-1).message, /Poke reaches tier 2 at 100 uses \(99 so far\)\./);
  assert.equal(tierOf(s, 'infiltrator', 'spike'), 1);
  set('poke', 100); play(s, 'mastery poke 1');
  assert.equal(tierOf(s, 'infiltrator', 'spike'), 1);
  play(s, 'mastery poke 2'); // its highest: back to the default
  assert.equal(s.mastery.pick.infiltrator.spike, undefined);
  set('poke', 1000); assert.equal(tierOf(s, 'infiltrator', 'spike'), 3, 'and it follows you up');
  play(s, 'mastery breaker crack 1');
  assert.equal(tierOf(s, 'breaker', 'crack'), 1);
  assert.match(play(s, 'mastery nonsense 2').at(-1).message, /No ability called nonsense/);
  assert.match(play(s, 'mastery inject').at(-1).message, /Inject: Mastery 3 · mastered\. Its effect plays at tier 2\./);
  assert.match(play(s, 'mastery').at(-1).message, /^Mastery \(Infiltrator\): .*Inject 3 · mastered/);
  // An older save has none: every ability at tier 1.
  const old = restore(JSON.parse(JSON.stringify(fresh())));
  assert.equal(tierOf(old, 'breaker', 'spike'), 1);
  assert.equal(progressOf(old, 'breaker', 'overload').next, 75);
  // The tier a recipe plays at exists for every one you can master.
  for (const cls of Object.keys(ARCHETYPES)) for (const id of masteryList(cls)) for (const t of [1, 2, 3]) assert.ok(tierRecipe(keyFor(id, cls), t), `${cls} ${id} ${t}`);
});

test('the tray\'s tooltip and the Skills page say where it stands, in WoW tooltip grammar', () => {
  const s = at('bastion', 12);
  const tip = (id) => trayMarkup(s).match(new RegExp(`data-ability="${id}" title="([^"]*)"`))?.[1] || '';
  assert.match(tip('spike'), /\nMastery 1 · 0\/100$/, 'key 1 (Ban): a line of its own');
  play(s, 'developer mastery ban 340');
  assert.match(tip('spike'), /\nMastery 2 · 340\/1000$/);
  play(s, 'developer mastery rate-limit 900');
  assert.match(tip('rate-limit'), /\nMastery 3 · mastered$/);
  assert.equal(masteryLine(s, 'bastion', 'spike'), 'Mastery 2 · 340/1000');
  // app.js lights the line in its tooltip card (teal, its own line).
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /\.replace\(\/\\n\(Mastery \[1-3\] · \[\^\\n\]\*\)\/g, '<span class="tt-mastery">\$1<\/span>'\)/);
  // The Skills page: pips on every chip and key you have, its tier lit; the panel: the line, its bar and the tiers.
  const page = loadoutMarkup(s, 'bastion', 'skills', { sel: 'k:spike' });
  assert.match(page, /data-sk="k:spike"[^>]*>.*?<span class="sk-mt" aria-label="Mastery 2 of 3"><i class="on"><\/i><i class="on"><\/i><i><\/i><\/span><\/button>/);
  assert.match(page, /class="sk-chip eq" data-sk="s:rate-limit"[^>]*>.*?<span class="sk-mt" aria-label="Mastery 3 of 3">/);
  assert.doesNotMatch(page, /class="sk-chip locked"[^>]*>(?:(?!<\/button>).)*sk-mt/, 'no pips on a skill you don\'t have yet');
  const panel = skillDetailMarkup(s, 'bastion', 'k:spike');
  assert.match(panel, /<p class="sk-mline">Mastery 2 · 340\/1000<\/p><span class="sk-mbar" aria-hidden="true"><i style="width:34\.0%"><\/i><\/span>/);
  assert.match(panel, /<button type="button" class="sk-tier" data-command="mastery bastion spike 1" aria-pressed="false" title="Play its effect at tier 1">1<\/button><button type="button" class="sk-tier on" disabled aria-pressed="true" title="Its effect plays at tier 2">2<\/button><button type="button" class="sk-tier locked" disabled aria-pressed="false" title="Tier 3 at 1000 uses">3<\/button>/);
  play(s, 'mastery bastion spike 1');
  assert.match(skillDetailMarkup(s, 'bastion', 'k:spike'), /class="sk-tier on" disabled aria-pressed="true" title="Its effect plays at tier 1">1</);
  // A skill you don't have yet says nothing of mastery.
  const low = at('bastion', 1);
  assert.doesNotMatch(skillDetailMarkup(low, 'bastion', 's:retaliate'), /sk-mastery/);
  assert.match(skillDetailMarkup(low, 'bastion', 's:retaliate'), /<h2>Retaliate<\/h2>/);
  // Another class's page reads that class's count.
  play(s, 'developer mastery ban 0');
  assert.match(skillDetailMarkup(s, 'breaker', 'k:spike'), /Mastery 1 · 0\/100/);
});

test('a handful of achievements, cosmetic: first tier 3, 5 of them, every key 1, a whole kit', () => {
  const ids = ['cl-mastery', 'cl-mastery-5', 'cl-mastery-keys', 'cl-mastery-kit'];
  for (const id of ids) { const a = achById(id); assert.ok(a && a.cat === 'class' && a.group === 'Mastery' && a.reward, id); }
  assert.equal(achievements().filter((a) => a.group === 'Mastery').length, 4, 'not one an ability');
  assert.ok(stickerById('a-mastery') && stickerById('a-kit'), 'their stickers can be shown');
  assert.ok(REWARD_BANNERS.keyone.rows.every((r) => r.length <= 24 && /^[\x20-\x7e]*$/.test(r)));
  assert.ok(titles().some((t) => t.id === 'virtuoso'));
  const s = at('breaker', 30);
  s.tutorialCompleted = true;
  tickAchievements(s);
  assert.ok(!ids.some((id) => earned(s, id)));
  play(s, 'developer mastery overload 750'); tickAchievements(s);
  assert.ok(earned(s, 'cl-mastery') && !earned(s, 'cl-mastery-5'));
  play(s, 'developer mastery all 1000'); tickAchievements(s);
  assert.equal(masteredN(s), masteryList('breaker').length);
  assert.ok(earned(s, 'cl-mastery-5') && myProfile(s).titles.includes('virtuoso'), 'the title the Virtuoso');
  assert.ok(earned(s, 'cl-mastery-kit'), 'a whole kit (key 1, the core, one subclass)');
  assert.deepEqual(kitBest(s), [kitOf('breaker', 'demolitionist').length, kitOf('breaker', 'demolitionist').length]);
  assert.ok(!earned(s, 'cl-mastery-keys'));
  assert.deepEqual(achById('cl-mastery-keys').progress(s), [1, 4]);
  for (const cls of ['bastion', 'infiltrator', 'operator']) { command(s, `archetype ${cls}`); play(s, 'developer mastery spike 1000'); }
  assert.equal(keyOnesN(s), 4);
  tickAchievements(s);
  assert.ok(earned(s, 'cl-mastery-keys') && bannersOf(s).includes('keyone'), 'the Key one banner');
  // Nothing in a fight changes with a tier: mastery.mjs reads nothing the fight's numbers use.
  const src = readFileSync(new URL('./dist/mastery.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /encounter|damage\(|hit\(/);
});
