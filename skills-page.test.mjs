// Loadout → Skills and talents (dist/skills-view.mjs, docs/class-page.md): the class page in its three states, its
// tooltips, the tree spent on the page, the once-only subclass prompt, the Toolkit, and old saves that played a
// default subclass. Loads view.mjs, whose imports install the network's fight hooks, so it runs on its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARCHETYPES, SUBS, SUBCLASS, LOADOUT, TREE, defaultSub, presetBar, skillOrder, lineOf } from './dist/data.mjs';
import { fresh, command, restore, subOf, subPicked, subWaiting, subPrompted, edge, kitOf, knownSkills, equippedSkills, talentPoints, pointsSpent, picksOf, ranksOf, capPickOf, SAVE_VERSION } from './dist/combat.mjs';
import { loadoutMarkup, toolkitMarkup, subPromptDue } from './dist/view.mjs';
import { play } from './dist/run.mjs';

const at = (cls, level, sub = null) => {
  const s = fresh();
  command(s, `archetype ${cls}`);
  command(s, `developer level ${level}`);
  if (sub) command(s, `subclass ${cls} ${sub}`);
  return s;
};
const page = (s, view) => loadoutMarkup(s, view, 'skills');
const card = (html) => html.slice(html.indexOf('<div class="cls">')); // the page without the class row and tabs
const cmds = (html) => [...html.matchAll(/data-command(?:-alt)?="([^"]+)"/g)].map((m) => m[1]);
const titles = (html) => [...html.matchAll(/title="([^"]*)"/g)].map((m) => m[1]);
const runs = (s, c) => { const t = JSON.parse(JSON.stringify(s)); const ev = command(t, c); return ev.at(-1)?.type !== 'warning' ? null : ev.at(-1).message; };

test('levels 1–9: all three columns, both subclasses dimmed and marked Level 10, nothing to choose or spend', () => {
  for (const cls of Object.keys(ARCHETYPES)) for (const level of [1, 5, 9]) {
    const s = at(cls, level), html = page(s, cls), where = `${cls} ${level}`;
    assert.match(html, /<p class="cls-ban dim">Subclass at level 10<\/p>/, where);
    assert.match(html, /<div class="cls-card early">/, where);
    for (const k of Object.values(ARCHETYPES[cls].subs)) assert.match(html, new RegExp(`<section class="cls-col cls-sub off" data-sub="${k.id}">[\\s\\S]*?<span class="cls-lv10">Level 10</span>`), `${where} ${k.id}`);
    assert.doesNotMatch(html, /data-command="(subclass|talent)/, where);
    assert.equal(subWaiting(s, cls), false, where);
    assert.equal(subPromptDue(s), false, where);
  }
});

test('10+ with no pick: both lit with Choose; the class plays its core alone (no default subclass)', () => {
  for (const cls of Object.keys(ARCHETYPES)) {
    const s = at(cls, 22), d = defaultSub(cls), html = page(s, cls);
    assert.equal(subOf(s), null, cls);
    assert.equal(kitOf(s), null, cls);
    assert.ok(!edge(s, cls), `${cls}: not the default's edge`);
    assert.deepEqual(knownSkills(s, cls), ARCHETYPES[cls].core, cls);
    assert.ok(equippedSkills(s, cls).every((id) => !SUBS[d].skills.includes(id)), `${cls}: no default-subclass key`);
    assert.match(html, /<p class="cls-ban">Choose a subclass<\/p>/, cls);
    for (const k of Object.values(ARCHETYPES[cls].subs)) assert.match(html, new RegExp(`<section class="cls-col cls-sub" data-sub="${k.id}">[\\s\\S]*?data-command="subclass ${cls} ${k.id}">Choose</button>`), `${cls} ${k.id}`);
    assert.doesNotMatch(html, /data-command="talent/, `${cls}: no tree to spend in`);
    assert.match(html, /<span class="cls-pts"[^>]*><b>\d+<\/b> talent points<\/span>/, `${cls}: its points wait for the tree`);
  }
  const s = at('breaker', 10);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.match(page(s, 'breaker'), /disabled title="Between fights">Choose</, 'never mid-fight');
});

test('picked: yours wide and marked Yours, the other folded with Switch; keys as teal badges; every control runs', () => {
  const s = at('breaker', 30, 'demolitionist'), html = page(s, 'breaker');
  assert.match(html, /<div class="cls-card reg">\s*<section class="cls-col cls-sub mine" data-sub="demolitionist">[\s\S]*<span class="cls-yours">Yours<\/span>/);
  assert.match(html, /<aside class="cls-fold" data-sub="overclocker">[\s\S]*data-command="subclass breaker overclocker">Switch<\/button><\/aside><\/div><\/div>/, 'the other, folded last, with Switch');
  assert.match(html, /<pre class="sk-emblem" aria-hidden="true">[\s\S]*<h2>Breaker<\/h2>/, 'the class in the middle, its emblem and name');
  for (const [i, id] of equippedSkills(s, 'breaker').entries()) assert.match(html, new RegExp(`<button type="button" class="cls-ab on" data-toolkit="breaker"[^>]*>(?:(?!</button>).)*<span class="cls-k">${LOADOUT.keys[i]}</span><b>[^<]+</b></button>`, 's'), `${id} on key ${LOADOUT.keys[i]}`);
  for (const c of cmds(html)) assert.equal(runs(s, c), null, c);
  assert.ok(cmds(html).some((c) => /^talent breaker add /.test(c)), 'ranks to add, on the tree itself');
  // A tier pick, a swap, a rank back, the capstone.
  const k = SUBS.demolitionist, [a] = k.fillers[0];
  for (let i = 0; i < 3; i++) command(s, `talent breaker add ${a.id}`);
  let h = page(s, 'breaker');
  assert.match(h, new RegExp(`data-tn="${k.talents[0][1].id}" data-command="talent breaker 1 b"`));
  assert.match(h, new RegExp(`data-tn="${a.id}" data-command-alt="talent breaker remove ${a.id}"`), 'a full row: right-click takes a rank back');
  command(s, 'talent breaker 1 b');
  h = page(s, 'breaker');
  assert.match(h, new RegExp(`class="cls-tn pick" data-tn="${k.talents[0][1].id}" aria-disabled="true"`));
  assert.match(h, new RegExp(`data-tn="${k.talents[0][0].id}" data-command="talent breaker 1 a"[^>]*title="[^"]*▸ Click to swap to it\\."`), 'the other side swaps');
  assert.match(h, /data-command="talent reset breaker"[^>]*>Reset</);
  assert.deepEqual(picksOf(s, 'breaker'), [1]);
  const b = at('breaker', 50, 'demolitionist');
  for (const row of TREE) {
    if (row.kind === 'filler') for (const n of k.fillers[row.row]) for (let r = 0; r < 3 && pointsSpent(b, 'breaker') < talentPoints(b, 'breaker'); r++) command(b, `talent breaker add ${n.id}`);
    if (row.kind === 'choice') command(b, `talent breaker ${row.tier + 1} a`);
  }
  assert.match(page(b, 'breaker'), /data-command="talent breaker capstone b"/);
  command(b, 'talent breaker capstone b');
  assert.equal(capPickOf(b, 'breaker'), 1);
  // In a fight: nothing on the page changes keys, talents or subclasses.
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const f = page(s, 'breaker');
  assert.doesNotMatch(f, /data-command="(talent|subclass|equip|unequip)/);
  assert.match(f, /title="[^"]*" data-tt-kind="[^"]*" data-tt-state="muted\|Between fights\."/);
  // Another class you aren't playing: its own page, Use on the class row.
  assert.match(page(s, 'bastion'), /class="btn small arch-use" data-command="archetype bastion"/);
});

test('every rule is a tooltip in WoW grammar; the card is names, icons and state', () => {
  for (const [cls, a] of Object.entries(ARCHETYPES)) for (const level of [3, 10, 30, 50]) for (const pick of [null, ...Object.keys(a.subs)]) {
    if (pick && level < SUBCLASS.from) continue;
    const s = at(cls, level, pick), html = page(s, cls), where = `${cls} ${level} ${pick}`;
    assert.doesNotMatch(html, /undefined|NaN|\[object/, where);
    assert.doesNotMatch(html, /class="hi"|<p class="sk-rule"|sk-panel/, `${where}: no rule text on the card`);
    for (const t of titles(card(html)).filter((x) => !/^\d|XP$/.test(x))) assert.match(t, /^[^:\n]{2,40}: [A-Z+\-\d"']/, `${where}: "${t.slice(0, 60)}"`);
    for (const x of a.core) assert.match(html, /data-tt-kind="(Hit|Burn|Stun|Debuff|Shield|Heal|Buff|Utility) · /, `${where}: ${x} has its kind line`);
  }
});

test('the subclass prompt: due once at 10 when home and out of a fight; a pick or the prompt itself ends it', () => {
  const s = at('breaker', 9);
  assert.equal(subPromptDue(s), false);
  command(s, 'developer level 10');
  assert.equal(subPromptDue(s), true, 'at 10 with no pick');
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.equal(subPromptDue(s), false, 'never over a fight');
  const r = at('breaker', 10);
  play(r, 'connect sprawl');
  assert.equal(subPromptDue(r), false, 'it waits until you are home');
  play(r, 'jack out');
  assert.equal(subPromptDue(r), true);
  subPrompted(r, 'breaker');
  assert.equal(subPromptDue(r), false, 'once a class');
  assert.ok(subWaiting(r, 'breaker'), 'the choice still waits on the page');
  command(r, 'subclass breaker overclocker');
  assert.equal(subOf(r), 'overclocker');
  assert.ok(subPicked(r));
  assert.deepEqual(equippedSkills(r, 'breaker'), presetBar('breaker', 'overclocker', 10, SUBS.overclocker.presets.rotation), 'the pick\'s bar: its rotation at your level');
  const o = at('operator', 12);
  command(o, 'archetype breaker');
  assert.equal(subPromptDue(o), false, 'the class in use decides');
});

test('the Toolkit: core and cantrips left, the subclass right, the bar and presets along its foot; keys move between fights', () => {
  const s = at('breaker', 30, 'demolitionist'), html = toolkitMarkup(s, 'breaker');
  assert.match(html, /<section class="tk" role="dialog" aria-modal="true" aria-label="Toolkit">/);
  assert.doesNotMatch(html, /[Ss]pellbook/);
  const [left, right] = html.split('<div class="tk-pg">').slice(1);
  for (const x of ARCHETYPES.breaker.core) assert.match(left, new RegExp(`data-tk-skill="${x}" draggable="true"`), x);
  assert.match(left, /<b>Bash<\/b>[\s\S]*<b>SIGINT<\/b>/, 'the cantrips, fixed to their keys');
  assert.match(right, /<p class="tk-kick">Demolitionist<\/p>/);
  for (const x of lineOf(SUBS.demolitionist)) assert.ok(right.includes(`data-tk-skill="${x.id}"`) || x.level > 30, x.id);
  assert.match(right, /<small>Level 34<\/small>/, 'a locked one: its level');
  const keys = [...html.matchAll(/class="tk-slot[^"]*" data-tk-key="(\w)" data-tk-skill="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(keys.map(([, x]) => x), equippedSkills(s, 'breaker'), 'the bar, key by key');
  assert.match(html, /data-command="loadout use area"[^>]*>area</);
  assert.match(html, /data-prefill="loadout save "/);
  // What a drop runs: onto an empty key, onto another key (swaps), and off the bar.
  const [k2, x2] = keys[0], [k3, x3] = keys[1];
  command(s, `equip breaker ${x3} ${k2}`);
  assert.deepEqual(equippedSkills(s, 'breaker').slice(0, 2), [x3, x2], 'a key\'s ability on another key swaps');
  command(s, `unequip breaker ${x3}`);
  assert.ok(!equippedSkills(s, 'breaker').includes(x3), 'off the bar');
  void k3;
  // A closed key says when it opens; before a pick the right page waits; in a fight nothing moves.
  assert.match(toolkitMarkup(at('breaker', 12), 'breaker'), /<li class="tk-slot closed" title="Key 0: opens at level 30\."><kbd>0<\/kbd><small>Lv 30<\/small><\/li>[\s\S]*/);
  assert.match(toolkitMarkup(at('breaker', 12), 'breaker'), /<p class="tk-none">Choose a subclass<\/p>/);
  assert.match(toolkitMarkup(at('breaker', 5), 'breaker'), /<p class="tk-none">Level 10<\/p>/);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const f = toolkitMarkup(s, 'breaker');
  assert.doesNotMatch(f, /draggable="true"|data-command="loadout use/);
  assert.match(f, /<span class="tk-busy">Between fights<\/span>/);
});

test('the old four-step breakout is gone; app.js wires the prompt, key T and the drags', () => {
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8'), css = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  const view = readFileSync(new URL('./dist/skills-view.mjs', import.meta.url), 'utf8');
  for (const [name, src] of [['app.js', app], ['style.css', css], ['skills-view.mjs', view]]) assert.doesNotMatch(src, /breakoutMarkup|breakoutDue|#breakout|\.bo-|data-bo-|\bbo = /, name);
  assert.match(app, /notice\('Choose your subclass\.'\)/);
  assert.match(app, /if \(e\.key !== 't' && e\.key !== 'T'\) return;/);
  assert.match(app, /run\(`equip \$\{tk\.arch\} \$\{id\} \$\{key\}`\)/);
  assert.match(app, /run\(`unequip \$\{tk\.arch\} \$\{id\}`\)/);
});

test('an old save whose class is past 10 with no pick loads cleanly: the default\'s keys and points come back, and the page asks for a pick', () => {
  // A v45 save: a Breaker at 22 that never picked played the Demolitionist: its bar, its tree, a preset, its program.
  const s = fresh();
  s.hackers = { breaker: { level: 22, xp: 0 }, bastion: { level: 30, xp: 0 } };
  s.loadout.sub = { bastion: 'warden' }; // a class that did pick keeps everything
  const demo = ['crack', 'shatter', 'flood', 'overload', 'shaped-charge', 'fork-bomb', 'exploit', 'logic-bomb'];
  s.loadout.equipped = { demolitionist: demo, warden: presetBar('bastion', 'warden', 30, SUBS.warden.presets.rotation) };
  s.loadout.follow = { demolitionist: null, warden: 'rotation' };
  s.loadout.ranks = { demolitionist: { 'armor-cracker': 3, 'blast-radius': 1 }, warden: { [SUBS.warden.fillers[0][0].id]: 2 } };
  s.loadout.picks = { demolitionist: [0], warden: [1] };
  s.loadout.presets = { demolitionist: { rotation: { shipped: true }, area: { shipped: true }, mine: ['crack', 'shatter'] } };
  s.loadout.cooling = { demolitionist: ['shaped-charge'] };
  s.programs = { by: { demolitionist: { routines: { worm: { handlers: [{ when: 'always', do: 'crack', target: 'lowest' }] } } } } };
  s.version = 45;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  assert.equal(t.loadout.archetype, 'breaker');
  assert.equal(subOf(t), null, 'no subclass: the default is gone');
  assert.deepEqual(equippedSkills(t, 'breaker'), ['crack', 'flood', 'overload', 'exploit'], 'its core keys stay, in order; the Demolitionist\'s go');
  assert.equal(t.loadout.equipped.demolitionist, undefined);
  assert.equal(t.loadout.ranks.demolitionist, undefined, 'the points it spent in the default\'s tree come back');
  assert.equal(t.loadout.picks.demolitionist, undefined);
  assert.equal(t.loadout.cooling.demolitionist, undefined);
  assert.equal(pointsSpent(t, 'breaker'), 0);
  assert.equal(talentPoints(t, 'breaker'), 7, 'every point it earned, free for the tree it picks');
  assert.deepEqual(t.loadout.presets.demolitionist.mine, ['crack', 'shatter'], 'a preset it saved waits for a pick');
  assert.ok(t.programs.by.breaker.routines.worm, 'the routines it wrote are the class\'s now');
  assert.equal(subPromptDue(t), true, 'the page asks for a pick');
  assert.match(page(t, 'breaker'), /data-command="subclass breaker demolitionist">Choose</);
  // The class that picked: as it was.
  assert.equal(subOf(t, 'bastion'), 'warden');
  assert.deepEqual(t.loadout.equipped.warden, s.loadout.equipped.warden);
  assert.deepEqual(ranksOf({ ...t, loadout: { ...t.loadout, archetype: 'bastion' } }, 'bastion'), s.loadout.ranks.warden);
  assert.deepEqual(t.loadout.picks.warden, [1]);
  // Picking the old default gives it a fresh tree and its rotation bar; its saved preset is there.
  command(t, 'subclass demolitionist');
  assert.equal(pointsSpent(t, 'breaker'), 0);
  assert.deepEqual(equippedSkills(t, 'breaker'), presetBar('breaker', 'demolitionist', 22, SUBS.demolitionist.presets.rotation));
  assert.match(command(t, 'loadout use mine').at(-1).message, /Bar set from mine/);
  // A bar the player trimmed stays trimmed; a key a default skill held goes back to a core skill that was off the bar.
  const u = fresh();
  u.hackers = { infiltrator: { level: 12, xp: 0 } };
  u.loadout.archetype = 'infiltrator';
  u.loadout.equipped = { phantom: ['inject', 'null-route', 'tag'] };
  u.version = 45;
  const v = restore(JSON.parse(JSON.stringify(u)));
  assert.deepEqual(equippedSkills(v, 'infiltrator'), ['inject', 'tag', 'backdoor']);
  // A class below 10 is untouched.
  const w = fresh();
  w.hackers = { breaker: { level: 8, xp: 0 } };
  w.loadout.equipped = { breaker: ['overload', 'crack'] };
  w.version = 45;
  assert.deepEqual(equippedSkills(restore(JSON.parse(JSON.stringify(w))), 'breaker'), ['overload', 'crack']);
  assert.equal(subPromptDue(restore(JSON.parse(JSON.stringify(w)))), false);
});

test('a class at 10 that never picks: the level-up says so, its bar holds the core, and every view draws', () => {
  const s = at('bastion', 9);
  command(s, 'developer level 10');
  const up = s.logs.findLast((e) => e.type === 'level-up');
  assert.match(up.message, /Choose a subclass: Warden \(subclass warden\) or Sysop \(subclass sysop\)\. Until you do, you play the Bastion core\./);
  assert.ok(up.gains.includes('a subclass to pick'));
  assert.ok(equippedSkills(s, 'bastion').every((id) => ARCHETYPES.bastion.core.includes(id)));
  assert.deepEqual(skillOrder('bastion', subOf(s)), ARCHETYPES.bastion.core);
  for (let level = 10; level <= 50; level += 8) {
    command(s, `developer level ${level}`);
    assert.doesNotMatch(page(s, 'bastion'), /undefined|NaN|\[object/, `${level}`);
    assert.doesNotMatch(toolkitMarkup(s, 'bastion'), /undefined|NaN|\[object/, `${level}: the Toolkit`);
  }
  void LOADOUT;
});
