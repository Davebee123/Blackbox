// What pays what (docs/pays.md P2): each activity's own thing at its old value (dist/pays.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, addLocation } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { EXPLOIT_CHANCE, vaultCode } from './dist/gear.mjs';
import { WARES } from './dist/market.mjs';
import { WORTH, codeCredits, asExploits, asComponents } from './dist/pays.mjs';
import { deal, zeroCode, strayCredits, courierPay, FEUD } from './dist/events.mjs';
import { gauntletCredits } from './dist/rogue.mjs';
import { waveParts, cardCredits } from './dist/runcards.mjs';
import { RIVAL } from './dist/rivals.mjs';
import { mapMarkup } from './dist/view.mjs';

let clock = 1_700_000_000_000;
hooks.now = () => clock;
RIVAL.chance = 0;

const world = (level = 12) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  s.director = { next: 9e9, n: 0, last: null };
  return s;
};

test('the wares keep the market\'s base prices: what moves between them keeps its value', () => {
  assert.equal(WORTH.code, WARES.cipher.base);
  assert.equal(WORTH.exploit, WARES.exploit.base);
  assert.equal(WORTH.salvage, WARES.salvage.base);
  assert.equal(codeCredits(3), 42);
  assert.equal(asExploits(140), 1); assert.equal(asExploits(10), 1, 'at least one');
  assert.equal(asComponents(93), 13);
});

test('P2 at level 20: caches, the Gauntlet and a stray cache in credits; the Exfil in Exploits; a surge in components', () => {
  assert.equal(gauntletCredits(20), 60 + 240 + 14 * 8, 'its code as credits');
  assert.equal(strayCredits(20), 140 + 14 * 11, 'half a courier\'s credits and half a vault\'s code');
  assert.equal(asExploits(CONFIG.exfil.credits * (4 + 10)), 1, '10 Stashes: an Exploit');
  assert.equal(waveParts(20), Math.round(cardCredits(20) / 3 / 7), 'a wave: a third of a cache in components');
  assert.equal(zeroCode({ level: 20 }), 2 * vaultCode(20), 'Patient zero: two code caches');
  assert.ok(EXPLOIT_CHANCE.elite > EXPLOIT_CHANCE.home && EXPLOIT_CHANCE.guard > EXPLOIT_CHANCE.elite, 'elites and guards drop Exploits more often');
  assert.equal(courierPay(20), 280, 'what a courier carried, now in its item\'s rarity');
  assert.equal(RIVAL.rarity, 'custom');
});

test('cards lead with their own thing; standing and gear follow, smaller', () => {
  const s = world();
  const c = deal(s, 'courier');
  const m = mapMarkup(s, c.loc);
  assert.doesNotMatch(m.slice(m.indexOf('evc-courier'), m.indexOf('</section>', m.indexOf('evc-courier'))), /title="\d+ credits"/, 'a courier: no credits, its Custom protocol');
  assert.match(m, /title="A Custom protocol"/);
  const t = world(), b = deal(t, 'bounty'), bm = mapMarkup(t, b.loc);
  assert.match(bm, /class="evc-pay"><span class="evc-rw" title="\d+ credits">.*<span class="evc-rw sec" title="Halcyon \+2 rep">/s, 'credits first, standing after, smaller');
  assert.equal(FEUD.rep, 10, 'a feud\'s win pays standing');
});
