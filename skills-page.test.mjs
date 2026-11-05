// Loadout → Skills and talents (dist/skills-view.mjs): one card and a detail panel, no subclass before level 10, the
// choice on the page from 10 until you pick (there is no default subclass in play), and old saves that played one.
// Loads view.mjs, whose imports install the network's fight hooks, so it runs on its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPES, SUBS, SUBCLASS, LOADOUT, TREE, defaultSub, presetBar, skillOrder, lineOf } from './dist/data.mjs';
import { fresh, command, restore, subOf, subPicked, subWaiting, subPrompted, edge, kitOf, knownSkills, equippedSkills, talentPoints, pointsSpent, picksOf, ranksOf, capPickOf, SAVE_VERSION } from './dist/combat.mjs';
import { loadoutMarkup, skillDetailMarkup, subPromptDue } from './dist/view.mjs';
import { play } from './dist/run.mjs';

const at = (cls, level, sub = null) => {
  const s = fresh();
  command(s, `archetype ${cls}`);
  command(s, `developer level ${level}`);
  if (sub) command(s, `subclass ${cls} ${sub}`);
  return s;
};
const page = (s, view, ui) => loadoutMarkup(s, view, 'skills', ui);
const PANEL = /<aside class="sk-panel[^"]*"[^>]*>[\s\S]*?<\/aside>/g;
const panelOf = (html) => html.match(PANEL)?.[0] || '';
const card = (html) => html.replace(PANEL, '');
const keysOf = (html) => [...new Set([...card(html).matchAll(/data-sk="([^"]+)"/g)].map((m) => m[1]))];
const names = (cls) => Object.values(ARCHETYPES[cls].subs).flatMap((x) => [x.name, x.edge.name]);

test('the page: the class emblem and the subclass with its level, then Bar, Skills and Talents, and the detail panel', () => {
  const s = at('breaker', 30, 'demolitionist');
  const html = page(s, 'breaker', { sel: 's:shaped-charge' });
  assert.match(html, /<section class="card sk-card"><header class="sk-head"><pre class="sk-emblem" aria-hidden="true">/);
  assert.match(html, /<div class="sk-id"><h2>Breaker<\/h2><h1>Demolitionist<\/h1>\s*<div class="sk-lv"><b>Lv 30<\/b><span class="lvl-bar"/);
  assert.match(html, /<h3>Bar<\/h3>[\s\S]*<h3>Skills<small>\d+\/15<\/small><\/h3>[\s\S]*<h3>Talents<small>\d+\/21<\/small><\/h3>/, 'the three sections, in order');
  assert.match(html, /<span class="sk-chips-h">Breaker · Lv 1–7<\/span>[\s\S]*<span class="sk-chips-h">Demolitionist · Lv 10–38<\/span>/, 'skills by line: the core, then the subclass');
  assert.match(html, /<small>Passive<\/small><b>Momentum<\/b>[\s\S]*<small>Sync<\/small>[\s\S]*<small>Kit talent<\/small>[\s\S]*<small>Edge<\/small><b>Overkill<\/b>/, 'the roots as chips');
  assert.match(html, /<div class="sk-tree">/);
  assert.match(html, /<span class="tag you">key \d<\/span>/, 'the panel: the key it is on');
  assert.match(panelOf(html), /<small>Demolitionist skill<\/small><h2>Shaped Charge<\/h2>/);
  assert.match(panelOf(html), /⟳ 5/, 'its cooldown');
  assert.match(panelOf(html), /<h3>Works with<\/h3>[\s\S]*Debris Field[\s\S]*Cluster Charge/, 'what works with it, from the real text: a skill that names it and a talent that does');
  // A tier's side: the other side is in the panel too.
  const t1 = SUBS.demolitionist.talents[0];
  const tier = panelOf(page(s, 'breaker', { sel: 't:' + t1[1].id }));
  assert.match(tier, new RegExp(`<small>Tier 1</small><h2>${t1[1].name}</h2>`));
  assert.match(tier, new RegExp(`<div class="sk-alt"><small>(Or|Instead of)</small><b>${t1[0].name}</b>`));
  // Nothing picked yet: the panel explains your first key.
  assert.match(panelOf(page(s, 'breaker')), new RegExp(`<h2>${ARCHETYPES.breaker.skills.find((x) => x.id === equippedSkills(s, 'breaker')[0]).name}</h2>`));
  // The subclasses: yours, the other to look at (with Switch), and the class alone.
  assert.match(html, /<nav class="sk-subnav" aria-label="Subclass"><button type="button" data-arch="breaker\/core" aria-pressed="false">Breaker core<\/button><button type="button" data-arch="breaker\/demolitionist" aria-pressed="true">Demolitionist<i class="sk-yours" title="Yours"><\/i><\/button><button type="button" data-arch="breaker\/overclocker" aria-pressed="false">Overclocker<\/button><\/nav>/);
  const other = page(s, 'breaker/overclocker');
  assert.match(other, /<h1>Overclocker <span class="tag preview">Preview<\/span><\/h1>/);
  assert.match(other, /data-command="subclass breaker overclocker" title="Switch to Overclocker">Switch<\/button>/);
  assert.match(other, /class="sk-chip preview" data-sk="s:segfault"/, 'its skills are never shown as yours');
  assert.doesNotMatch(card(other), /data-command="(?:talent|equip|unequip) breaker/, 'a preview changes nothing');
  for (const key of keysOf(other).filter((x) => /^s:/.test(x) && SUBS.overclocker.skills.includes(x.slice(2)) && !SUBS.demolitionist.skills.includes(x.slice(2)))) assert.doesNotMatch(panelOf(page(s, 'breaker/overclocker', { sel: key })), /data-command=/, `${key}: nothing to equip from a preview`);
  for (const n of [...SUBS.overclocker.fillers.flat(), ...SUBS.overclocker.talents.flat()]) assert.doesNotMatch(panelOf(page(s, 'breaker/overclocker', { sel: 't:' + n.id })), /data-command=/, `${n.id}: nor to spend`);
  assert.doesNotMatch(page(s, 'breaker/core'), /class="sk-tree"|Overkill/, 'the class alone: no tree, no edge');
});

test('the rule text is only in the detail panel: the card is names, numbers and state, and the facts are lit only there', () => {
  for (const [cls, a] of Object.entries(ARCHETYPES)) {
    for (const level of [3, 8, 10, 30, 50]) {
      for (const pick of [null, ...Object.keys(a.subs)]) {
        if (pick && level < SUBCLASS.from) continue;
        const s = at(cls, level, pick);
        for (const view of [cls, `${cls}/core`, ...Object.keys(a.subs).map((x) => `${cls}/${x}`)]) {
          const base = page(s, view);
          for (const key of keysOf(base)) {
            const html = page(s, view, { sel: key }), where = `${cls} ${level} ${pick} ${view} ${key}`;
            assert.doesNotMatch(html, /undefined|NaN|\[object/, where);
            assert.doesNotMatch(card(html), /class="hi"/, `${where}: no highlight outside the panel`);
            assert.doesNotMatch(card(html), /class="sk-rule"/, `${where}: no rule text on the card`);
            assert.match(panelOf(html), /<h2>[^<]+<\/h2>/, `${where}: the panel explains it`);
            assert.equal(skillDetailMarkup(s, view, key), panelOf(html).replace(/^<aside[^>]*>|<\/aside>$/g, ''), `${where}: the hover panel is the same as the picked one`);
          }
        }
      }
    }
  }
  // Highlights do show in the panel.
  const s = at('breaker', 30, 'demolitionist');
  assert.match(panelOf(page(s, 'breaker', { sel: 's:shaped-charge' })), /<b class="hi">/);
  // Before a pick, the subclass on show: only its panel lights anything.
  const t = page(at('breaker', 10), 'breaker/overclocker', { sel: 's:segfault' });
  assert.doesNotMatch(card(t), /class="hi"/);
  assert.match(panelOf(t), /class="sk-rule"/);
});

test('no subclass UI before level 10: no subclass, edge, presets or tree, for any class', () => {
  for (const cls of Object.keys(ARCHETYPES)) {
    for (const level of [1, 5, 9]) {
      const s = at(cls, level), html = page(s, cls), where = `${cls} ${level}`;
      for (const n of names(cls)) assert.ok(!html.includes(n), `${where}: ${n}`);
      assert.doesNotMatch(html, /[Ss]ubclass|sk-choose|sk-subnav|class="sk-tree"|class="sk-presets"|<small>Edge/, where);
      assert.equal(subPromptDue(s), false, where);
      assert.equal(subWaiting(s, cls), false, where);
      for (const key of keysOf(html)) assert.doesNotMatch(page(s, cls, { sel: key }), /[Ss]ubclass/, `${where} ${key}`);
      // A subclass view asked for (an old link) still shows the class alone.
      for (const sub of Object.keys(ARCHETYPES[cls].subs)) assert.equal(page(s, `${cls}/${sub}`), html, `${where} ${sub}`);
    }
  }
});

test('from level 10 with no pick, a class plays its core alone (no default subclass), and the page says choose', () => {
  for (const cls of Object.keys(ARCHETYPES)) {
    const s = at(cls, 22), d = defaultSub(cls);
    assert.equal(subOf(s), null, cls);
    assert.equal(kitOf(s), null, cls);
    assert.ok(!edge(s, cls), `${cls}: not the default's edge`);
    assert.deepEqual(knownSkills(s, cls), ARCHETYPES[cls].core, cls);
    assert.ok(equippedSkills(s, cls).every((id) => !SUBS[d].skills.includes(id)), `${cls}: no default-subclass key`);
    const [A, B] = Object.values(ARCHETYPES[cls].subs), html = page(s, cls), core = page(s, `${cls}/core`);
    assert.match(html, new RegExp(`<h2>${ARCHETYPES[cls].name} · Choose a subclass</h2><h1>${A.name}</h1>`), `${cls}: it opens on the first subclass`);
    assert.match(html, new RegExp(`class="btn primary sk-choose" data-command="subclass ${cls} ${A.id}"[^>]*>Choose ${A.name}</button>`), cls);
    assert.match(page(s, `${cls}/${B.id}`), new RegExp(`data-command="subclass ${cls} ${B.id}"[^>]*>Choose ${B.name}</button>`), `${cls}: and the other`);
    assert.match(html, /class="sk-tree"/, `${cls}: its tree, to look at`);
    assert.doesNotMatch(html, /data-command="talent|class="sk-presets"|<i class="sk-yours"/, `${cls}: nothing to spend or keep before the pick`);
    assert.match(html, /<b>\d+ free<\/b><span class="sk-ptbar">/, `${cls}: its points, waiting for the tree`);
    for (const n of names(cls)) assert.ok(!card(core).includes(n) || core.includes(`>${n}</button>`), `${cls}: the core view shows only the nav's ${n}`);
    assert.doesNotMatch(core, /class="sk-tree"|sk-choose/, `${cls}: the core alone`);
    assert.doesNotMatch(loadoutMarkup(s, cls, 'skills'), /Skills and talents · \d+ free/, 'nothing to spend yet');
  }
});

test('the choice: the page brings you to it once, at 10, home and out of a fight; choosing picks', () => {
  const s = at('breaker', 9);
  assert.equal(subPromptDue(s), false);
  command(s, 'developer level 10');
  assert.equal(subPromptDue(s), true, 'at 10 with no pick');
  for (const k of ['demolitionist', 'overclocker']) {
    const html = page(s, `breaker/${k}`);
    for (const x of lineOf(SUBS[k])) assert.match(html, new RegExp(`data-sk="s:${x.id}"`), `${k} ${x.id}`);
    for (const n of [...SUBS[k].fillers.flat(), ...SUBS[k].talents.flat(), ...SUBS[k].capstones]) assert.match(html, new RegExp(`data-sk="t:${n.id}"`), n.id);
    assert.match(html, new RegExp(`<b>${SUBS[k].edge.name}</b>`), `${k}: its edge`);
    assert.doesNotMatch(html, /undefined|NaN|\[object/, k);
  }
  assert.match(page(s, 'breaker/overclocker', { sel: `t:${SUBS.overclocker.talents[0][0].id}` }), /<div class="sk-alt"><small>Or<\/small>/, 'an OR choice shows its other side');
  // Not in a fight, not on a run.
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.equal(subPromptDue(s), false, 'never over a fight');
  assert.match(page(s, 'breaker'), /disabled title="Between fights">Choose Demolitionist/);
  const r = at('breaker', 10);
  play(r, 'connect sprawl');
  assert.equal(subPromptDue(r), false, 'it waits until you are home');
  play(r, 'jack out');
  assert.equal(subPromptDue(r), true);
  // Once: after it has brought you to the page, the page waits.
  subPrompted(r, 'breaker');
  assert.equal(subPromptDue(r), false);
  assert.ok(subWaiting(r, 'breaker'));
  assert.match(page(r, 'breaker'), /sk-choose/);
  // Choosing applies the pick.
  command(r, 'subclass breaker overclocker');
  assert.equal(subOf(r), 'overclocker');
  assert.ok(subPicked(r));
  assert.deepEqual(equippedSkills(r, 'breaker'), presetBar('breaker', 'overclocker', 10, SUBS.overclocker.presets.rotation), 'the pick\'s bar: its rotation at your level');
  assert.doesNotMatch(page(r, 'breaker'), /sk-choose|Choose a subclass/);
  assert.match(page(r, 'breaker'), /<h1>Overclocker<\/h1>/);
  assert.match(page(r, 'breaker/demolitionist'), /data-command="subclass breaker demolitionist"[^>]*>Switch</, 'the other has Switch');
  command(r, 'subclass breaker demolitionist');
  assert.equal(subOf(r), 'demolitionist');
  // Another class past 10 with no pick: its own page asks; the one in use decides when the page brings you there.
  const o = at('operator', 12);
  command(o, 'archetype breaker');
  assert.equal(subPromptDue(o), false, 'the class in use is below 10');
  assert.match(page(o, 'operator'), /data-command="subclass operator herder"[^>]*>Choose Herder</);
});

test('every control is reachable from the new page: keys, presets, ranks, OR picks, capstones, reset, Switch, Use', () => {
  const s = at('breaker', 46, 'demolitionist');
  const k = SUBS.demolitionist, html = page(s, 'breaker');
  // Presets: use, and save the bar.
  assert.match(html, /<button type="button" class="sk-preset" data-command="loadout use area" aria-pressed="false"/);
  assert.match(html, /<button type="button" class="sk-preset on" disabled aria-pressed="true"[^>]*>rotation</, 'the one your bar follows, lit');
  assert.match(html, /data-prefill="loadout save "[^>]*>\+ save bar</);
  // A key: unequip, or move it to another key.
  const on = equippedSkills(s, 'breaker')[0];
  const onP = page(s, 'breaker', { sel: 's:' + on });
  assert.match(onP, new RegExp(`data-command="unequip breaker ${on}">Unequip<`));
  assert.match(onP, new RegExp(`data-command="equip breaker ${on} 3"`), 'move it to key 3');
  // A skill off the bar: put it on a key (the bar is full, so Equip is off and the keys swap it in).
  const off = knownSkills(s, 'breaker').find((id) => !equippedSkills(s, 'breaker').includes(id));
  const offP = page(s, 'breaker', { sel: 's:' + off });
  assert.match(offP, /class="btn primary" disabled title="All 9 keys are full[^"]*">Equip</);
  assert.match(offP, new RegExp(`data-command="equip breaker ${off} 0"`));
  command(s, `unequip breaker ${on}`);
  assert.match(page(s, 'breaker', { sel: 's:' + off }), new RegExp(`data-command="equip breaker ${off}">Equip<`));
  // Talents: a rank to add and take back, an OR pick to swap, the capstone, reset.
  command(s, 'talent reset breaker');
  const [a] = k.fillers[0];
  assert.match(page(s, 'breaker', { sel: 't:' + a.id }), new RegExp(`data-command="talent breaker add ${a.id}"[^>]*>\\+ Rank<`));
  for (let i = 0; i < 3; i++) command(s, `talent breaker add ${a.id}`);
  assert.match(page(s, 'breaker', { sel: 't:' + a.id }), new RegExp(`data-command="talent breaker remove ${a.id}"[^>]*>− Rank<`));
  const [t0, t1] = k.talents[0];
  assert.match(page(s, 'breaker', { sel: 't:' + t1.id }), new RegExp(`data-command="talent breaker 1 b">Pick<`));
  command(s, 'talent breaker 1 b');
  assert.deepEqual(picksOf(s, 'breaker'), [1]);
  assert.match(page(s, 'breaker', { sel: 't:' + t0.id }), /data-command="talent breaker 1 a">Swap to this</, 'the other side of an OR, to swap to');
  assert.match(page(s, 'breaker'), /data-command="talent reset breaker"[^>]*>Reset</);
  // The capstone: picked with its own point (at 45), above 15 spent.
  const b = at('breaker', 50, 'demolitionist');
  for (const [i, row] of TREE.entries()) {
    if (row.kind === 'filler') for (const n of k.fillers[row.row]) for (let r = 0; r < 3 && pointsSpent(b, 'breaker') < talentPoints(b, 'breaker'); r++) command(b, `talent breaker add ${n.id}`);
    if (row.kind === 'choice') command(b, `talent breaker ${row.tier + 1} a`);
    void i;
  }
  assert.match(page(b, 'breaker', { sel: 't:' + k.capstones[1].id }), /data-command="talent breaker capstone b">Pick</);
  command(b, 'talent breaker capstone b');
  assert.equal(capPickOf(b, 'breaker'), 1);
  // Switch, and Use another class.
  assert.match(page(s, 'breaker/overclocker'), /data-command="subclass breaker overclocker"/);
  assert.match(page(s, 'bastion'), /<button type="button" class="btn small arch-use" data-command="archetype bastion"[^>]*>Use Bastion</, 'Use, at the end of the class row');
  // Every item on the card opens a panel; every command in it runs.
  const all = page(s, 'breaker');
  for (const key of keysOf(all)) {
    const html = page(s, 'breaker', { sel: key });
    for (const m of panelOf(html).matchAll(/data-command="([^"]+)"/g)) {
      const t = JSON.parse(JSON.stringify(s));
      const ev = command(t, m[1]);
      assert.notEqual(ev.at(-1)?.type, 'warning', `${key}: ${m[1]}: ${ev.at(-1)?.message}`);
    }
  }
  // In a fight: no key or talent changes on the page, only what it is.
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const fight = page(s, 'breaker', { sel: 's:' + off });
  assert.doesNotMatch(fight, /data-command="(?:equip|unequip|talent|loadout use)/);
  assert.match(fight, /Between fights/);
});

test('an old save whose class is past 10 with no pick loads cleanly: the default\'s keys and points come back, and the choice waits', () => {
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
  assert.equal(subPromptDue(t), true, 'the page asks');
  assert.match(page(t, 'breaker'), /sk-choose/);
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
    for (const v of ['bastion', 'bastion/core', 'bastion/sysop']) assert.doesNotMatch(page(s, v), /undefined|NaN|\[object/, `${level} ${v}`);
  }
  void LOADOUT;
});

test('a ranks row has its own − and + beside its pips, the same commands as the panel, off with the same reasons', () => {
  const s = at('bastion', 14, 'warden');
  const html = card(page(s, 'warden'));
  const rows = [...html.matchAll(/<span class="sk-tnw">([\s\S]*?)<\/span><\/span>/g)].map((m) => m[1]);
  assert.ok(rows.length >= 2, 'each ranks node gets the steps');
  const first = rows[0], id = first.match(/data-sk="t:([^"]+)"/)[1];
  const plus = first.match(/<button type="button" class="sk-sb" data-command="(talent \S+ add [^"]+)"/);
  assert.ok(plus, '+ adds a rank while points are free');
  assert.match(plus[1], new RegExp(`add ${id}$`));
  assert.match(first, /class="sk-sb" disabled aria-label="Take a rank back from [^"]+" title="No ranks to take back">−<\/button>/, '− is off with no ranks');
  const panel = panelOf(page(s, 'warden', { sel: 't:' + id }));
  assert.ok(panel.includes(`data-command="${plus[1]}"`), 'the row and the panel run the same command');
  command(s, plus[1]);
  const after = card(page(s, 'warden')).match(/<span class="sk-tnw">([\s\S]*?)<\/span><\/span>/)[1];
  assert.match(after, new RegExp(`data-command="talent \\S+ remove ${id}"[^>]*>−</button>`), '− takes a rank back once there is one');
  // Looking at another class's tree, it is read only: no steps.
  assert.doesNotMatch(card(page(s, 'breaker')), /sk-sb/);
});
