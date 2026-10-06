// The firewall (firewall.mjs): a level you build, fragmentation, defrag, hardening.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { FIREWALL, fwOf, effLevel, fragment, tickFirewall, upgradeCost } from './dist/firewall.mjs';
import { wallBands } from './dist/invasion.mjs';
import { items } from './dist/hidden.mjs';

const MIN = 60000;
const at = (t) => { hooks.now = () => t; };

test('it starts at level 1 and only goes up when you pay for it', () => {
  const s = fresh();
  assert.equal(fwOf(s).level, 1);
  command(s, 'developer server 20');
  assert.equal(effLevel(s), 1, 'a higher server level adds nothing');
  const c = upgradeCost(1);
  s.server.credits = c.credits; s.materials = { cipher: c.cipher };
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).level, 2);
  assert.equal(s.server.credits, 0); assert.equal(s.materials.cipher, 0);
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).level, 2, 'not without the price');
  assert.equal(wallBands(s).blocks, 2, 'it blocks its own level');
});

test('an old save starts the firewall where its wall blocked', () => {
  const s = fresh();
  command(s, 'developer server 10');
  s.services = { firewall: 3 };
  delete s.firewall;
  assert.equal(fwOf(s).level, 17, 'a v3 Firewall on a level-10 server blocked up to level 17');
});

test('threats fragment it, a level per 4 blocks; a defrag runs weaker, then restores it', () => {
  const s = fresh(); at(0);
  fwOf(s).level = 10;
  fragment(s, 'breach'); fragment(s, 'siege');
  assert.equal(fwOf(s).frag, 5);
  assert.equal(effLevel(s, 0), 9);
  command(s, 'defrag', 0);
  assert.equal(effLevel(s, 1000), 9 - FIREWALL.defragLoss, 'weaker while it runs');
  at(FIREWALL.defragMs);
  tickFirewall(s, FIREWALL.defragMs);
  assert.equal(fwOf(s).frag, 0);
  assert.equal(effLevel(s, FIREWALL.defragMs), 10);
  for (let i = 0; i < 20; i++) fragment(s, 'breach');
  assert.equal(fwOf(s).frag, FIREWALL.blocks, 'never past the grid');
  hooks.now = null;
});

test('harden.sh: +3 levels for 8 hours, one script each', () => {
  const s = fresh(); at(0);
  fwOf(s).level = 4;
  command(s, 'firewall harden', 0);
  assert.equal(effLevel(s, 0), 4, 'no script, no hardening');
  items(s).harden = 1;
  command(s, 'firewall harden', 0);
  assert.equal(items(s).harden, 0);
  assert.equal(effLevel(s, 7 * 60 * MIN), 7);
  assert.equal(effLevel(s, 8 * 60 * MIN + 1), 4, 'and then it wears off');
  hooks.now = null;
});
