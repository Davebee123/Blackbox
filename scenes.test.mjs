// Transmissions (dist/scenes.mjs, scenes-view.mjs): a conversation with a contact over the map, played once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, addLocation, hackerOf } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { addLead } from './dist/combat.mjs';
import * as SC from './dist/scenes.mjs';
import { sceneMarkup } from './dist/scenes-view.mjs';

const mk = () => { const s = fresh(); s.tutorialCompleted = true; s.netSeed = 977; hackerOf(s).level = 1; return s; };

test('every scene is whole: a start, each choice a node, each node said or an end', () => {
  for (const [id, def] of Object.entries(SC.SCENES)) {
    assert.ok(def.who && def.nodes.start?.lines?.length, id);
    for (const [k, n] of Object.entries(def.nodes)) {
      assert.ok(n.end || n.lines?.length, `${id}.${k} says something or ends`);
      if (k !== 'start') assert.ok(n.q, `${id}.${k} has its question`);
      for (const a of n.ask || []) assert.ok(def.nodes[a], `${id}.${k} → ${a}`);
      assert.ok(n.end || (n.ask || []).some((a) => def.nodes[a].end) || (n.ask || []).length, `${id}.${k} leads somewhere`);
    }
  }
});

test('the welcome: wick opens, a question you asked is gone, an answer ends it where it says', () => {
  const s = mk();
  assert.ok(SC.queueScene(s, 'welcome'));
  assert.equal(SC.sceneNow(s).said.length, 2);
  assert.deepEqual(SC.choicesOf(s).map((c) => c.id), ['lowlight', 'halcyon', 'begin']);
  assert.deepEqual(SC.choose(s, 1), { more: true });
  const said = SC.sceneNow(s).said;
  assert.equal(said[2].who, 'you');
  assert.equal(said[2].text, "Who's LOWLIGHT?");
  assert.deepEqual(SC.choicesOf(s).map((c) => c.id), ['halcyon', 'begin']);
  SC.choose(s, 1);
  assert.deepEqual(SC.choicesOf(s).map((c) => c.id), ['begin'], 'both asked: only the way on is left');
  SC.choose(s, 1);
  assert.deepEqual(SC.choose(s, 1), { go: 'mail' }, 'Open my mail goes to Mail');
  assert.equal(SC.sceneNow(s), null);
  assert.ok(s.scenes.seen.includes('welcome'));
  assert.equal(SC.queueScene(s, 'welcome'), false, 'once');
  assert.equal(SC.choose(s, 1), null);
});

test('your first server located brings wick\'s second transmission, only on a save that heard the welcome', () => {
  const old = mk();
  for (let i = 0; i < 8 && !old.locations.length; i++) addLead(old, 'worm', CONFIG.leadBase, '', { id: CONFIG.zone.id });
  assert.equal(SC.sceneNow(old), null, 'an old save or a bench: no scene');
  const s = mk();
  SC.queueScene(s, 'welcome');
  for (let i = 0; i < 8 && !s.locations.length; i++) addLead(s, 'worm', CONFIG.leadBase, '', { id: CONFIG.zone.id });
  assert.equal(SC.sceneNow(s).id, 'welcome', 'it waits behind the one playing');
  SC.skip(s);
  const now = SC.sceneNow(s), loc = s.locations[0];
  assert.equal(now.id, 'first-server');
  assert.ok(now.said[0].text.includes(loc.name) && now.said[0].text.includes('level 1'));
  const show = SC.choicesOf(s).find((c) => c.id === 'show');
  assert.deepEqual(SC.choose(s, show.n), { go: `map:${loc.id}` });
});

test('the window: the portrait, your answers marked, only the newest exchange arrives, numbered choices', () => {
  const s = mk();
  assert.equal(sceneMarkup(s), '');
  SC.queueScene(s, 'welcome');
  let html = sceneMarkup(s);
  assert.ok(html.includes('q-face') && html.includes('sc-first') && html.includes('data-scene-pick="3"') && html.includes('data-scene-skip'));
  assert.equal((html.match(/sc-new/g) || []).length, 2);
  SC.choose(s, 2);
  html = sceneMarkup(s);
  assert.ok(!html.includes('sc-first'));
  assert.equal((html.match(/sc-new/g) || []).length, 3, 'your answer and its two lines');
  assert.equal((html.match(/sc-you/g) || []).length, 1);
  assert.ok(!/#[0-9a-f]{6}/i.test(html), 'no colours of its own');
});

test('developer scene plays one again', () => {
  const s = mk();
  SC.queueScene(s, 'welcome'); SC.skip(s);
  assert.ok(SC.replay(s, 'welcome'));
  assert.equal(SC.sceneNow(s).id, 'welcome');
  assert.equal(SC.replay(s, 'nope'), false);
});
