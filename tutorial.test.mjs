import test from 'node:test';
import assert from 'node:assert/strict';
import { beginTutorial, submitTutorial, tickTutorial, continueTutorial, LESSONS } from './dist/tutorial.mjs';
import { CONFIG } from './dist/data.mjs';
// These tests check exact numbers: no crits (gear.test.mjs covers them).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)

const settings = { sound: false, motion: true };
const runCycle = (t) => { for (let i = 0; i < 20 && ['running', 'live'].includes(t.phase); i++) tickTutorial(t, 500); };

test('every lesson can be completed in order and ends in victory', () => {
  const t = beginTutorial(settings);
  for (let i = 0; i < LESSONS.length - 1; i++) {
    submitTutorial(t, LESSONS[i].command);
    assert.equal(t.phase, 'running', `lesson ${i + 1}: ${t.error}`);
    runCycle(t);
    assert.equal(t.phase, 'review', `lesson ${i + 1} should pause for review`);
    continueTutorial(t);
  }
  submitTutorial(t, LESSONS.at(-1).command);
  assert.equal(t.phase, 'live');
  for (let i = 0; i < 200 && t.phase === 'live'; i++) {
    if (!t.state.encounter.lastAttack && !t.state.encounter.queue) submitTutorial(t, 'spike pulse');
    tickTutorial(t, CONFIG.cycleMs / 5);
  }
  assert.equal(t.phase, 'complete');
  assert.equal(t.state.encounter.phase, 'victory');
});

test('the wrong command is refused without advancing', () => {
  const t = beginTutorial(settings);
  submitTutorial(t, 'scan');
  assert.equal(t.phase, 'ready');
  assert.match(t.error, /spike encryptor/);
});

test('lesson 3 breaks the Encryptor before it patches, and its attack stops', () => {
  const t = beginTutorial(settings);
  for (let i = 0; i < 3; i++) { submitTutorial(t, LESSONS[i].command); runCycle(t); if (i < 2) continueTutorial(t); }
  const enc = t.state.encounter.virus.parts.find((p) => p.id === 'encryptor');
  assert.equal(enc.integrity, 0);
  assert.ok(!t.state.encounter.virus.parts.find((p) => p.id === 'encryptor').attack || !t.state.encounter.virus.parts.find((p) => p.id === 'encryptor').integrity);
});
