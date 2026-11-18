// Jacking out mid-fight (combat.mjs startLeave): two cycles under fire, only defence fires, cancellable, and the
// server counts it as a disconnect on the reconnect wait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, relockWait, defends, leavingIn } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import { boardMarkup, fleeKey } from './dist/view.mjs';
import * as FP from './dist/floorplan.mjs';

function inFight() {
  const s = fresh();
  s.tutorialCompleted = true;
  command(s, 'developer location ransomware');
  const l = s.locations[0];
  l.lockUntil = 0;
  play(s, `connect ${l.id}`);
  for (let i = 0; i < 20 && !active(s); i++) {
    const room = FP.roomList(s).find((x) => ['process', 'guard'].includes(x.kind) && !s.rooms.cleared?.[x.id]);
    FP.go(s, room.id); FP.act(s, 'engage');
  }
  assert.ok(active(s) && s.encounter.mode === 'run');
  s.run.integrity = s.run.max = 100000; // nothing ends it early
  return { s, l };
}

test('jack out mid-fight takes two cycles under fire, then banks the pack and waits like a disconnect', () => {
  const { s, l } = inFight();
  const e = s.encounter;
  play(s, 'jack out');
  resolveCycle(s); // your turn: the jack out starts
  assert.ok(active(s) && e.leaving, 'still in the fight');
  assert.equal(leavingIn(s), CONFIG.jackOut.cycles - 1 || 1);
  assert.match(boardMarkup(s), /class="intent leave"/, 'the count on your row');
  assert.match(fleeKey(s), /data-command="stay"/, 'the key calls it off');
  const hp = e.virus.parts.map((p) => p.integrity).join();
  e.lastAttack = `spike ${e.virus.parts.find((p) => p.integrity > 0).id}`;
  play(s, 'spike');
  resolveCycle(s); // an attack doesn't fire, nor does auto-repeat
  assert.equal(e.virus.parts.map((p) => p.integrity).join(), hp, 'no hits while going');
  assert.ok(active(s));
  resolveCycle(s);
  assert.ok(!s.run, 'home');
  assert.equal(l.deaths, 1, 'counted as a disconnect');
  assert.ok(l.lockUntil - Date.now() > relockWait(0) + 5000, 'a disconnect\'s wait');
});

test('jack out again (or stay) calls it off', () => {
  const { s } = inFight();
  play(s, 'jack out');
  resolveCycle(s);
  assert.ok(s.encounter.leaving);
  play(s, 'jack out');
  assert.equal(s.encounter.leaving, null);
  for (let i = 0; i < 3; i++) resolveCycle(s);
  assert.ok(active(s) || s.run, 'still on the run');
});

test('only defence fires while going', () => {
  assert.ok(defends('firewall') && defends('patch') && defends('brace') && defends('suspend') && defends('harden'));
  assert.ok(!defends('spike') && !defends('reclaim') && !defends('throttle') && !defends('inject'));
  const { s } = inFight();
  play(s, 'jack out');
  resolveCycle(s);
  s.encounter.queue = { ability: 'brace', text: 'brace' }; // a breaker's defence (off a new player's bar)
  resolveCycle(s);
  assert.ok(s.encounter.metrics.actions.brace, 'a defence fires');
});
