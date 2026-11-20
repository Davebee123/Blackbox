// What pays what (docs/pays.md): P2, each activity's own thing at its old value, and P3, the director reacting to the
// ticker's wants (dist/pays.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks, addLocation } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { floorsOf } from './dist/floors.mjs';
import { EXPLOIT_CHANCE, vaultCode } from './dist/gear.mjs';
import { WARES } from './dist/market.mjs';
import { WORTH, REACT, wanted, wants, reactMult, codeCredits, asExploits, asComponents } from './dist/pays.mjs';
import { deal, CARDS, CHAIN, zeroAt, zeroCode, outbreakReact, runCardRoll, strayCredits, courierPay, FEUD } from './dist/events.mjs';
import { dealSite, tickSites } from './dist/sites.mjs';
import { exfilChance } from './dist/netrooms.mjs';
import { gauntletCredits } from './dist/rogue.mjs';
import { waveParts, cardCredits } from './dist/runcards.mjs';
import { RIVAL } from './dist/rivals.mjs';
import { mapMarkup } from './dist/view.mjs';

let clock = 1_700_000_000_000;
hooks.now = () => clock;
RIVAL.chance = 0;

// A live ticker card raising one ware at a hub (ticker.mjs's shape: { id, card, moves, left, ms, wait? }).
const card = (s, ware, mult = 1.6, more = {}) => { (s.ticker ||= { live: [], next: 9e9, n: 0, last: null }).live.push({ id: s.ticker.live.length + 1, card: 'auction', moves: [{ hub: 'glassjaw', ware, mult }], left: 9e9, ms: 9e9, ...more }); };
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

test('reacting reads the live cards: a ware a card raises, not one it lowers, nor a leaked card still waiting', () => {
  const s = world();
  assert.equal(wanted(s).size, 0);
  card(s, 'salvage', 0.7);
  card(s, 'exploit', 1.8, { wait: 60000 });
  assert.equal(wanted(s).size, 0, 'a fall, and a card still leaking');
  card(s, 'kernel', 1.5);
  assert.deepEqual([...wanted(s)], ['kernel']);
  assert.ok(wants(s, 'kernel') && !wants(s, 'worm'));
  assert.equal(reactMult(s, 'kernel'), REACT);
  assert.equal(reactMult(s, 'worm'), 1);
});

test('an outbreak of the wanted code\'s family comes twice as often; its Patient zero in half the kills', () => {
  const s = world();
  assert.equal(outbreakReact(s), 1);
  card(s, 'kernel');
  assert.ok(outbreakReact(s) > 1 && outbreakReact(s) < REACT, 'the deck\'s Outbreak weighs more by the family\'s share');
  assert.equal(zeroAt(s, 'ghostroot'), Math.ceil(CHAIN.zero.at / 2));
  assert.equal(zeroAt(s, 'worm'), CHAIN.zero.at);
  // The family: ghostroot twice as often as it would be (an even lean: a third, now a half).
  let ghost = 0, plain = 0;
  for (let i = 0; i < 600; i++) {
    const t = world(); t.netSeed = 0; t.director.r = i * 7919;
    const u = world(); u.netSeed = 0; u.director.r = i * 7919;
    card(t, 'kernel');
    if (CARDS.outbreak.make(t).family === 'ghostroot') ghost++;
    if (CARDS.outbreak.make(u).family === 'ghostroot') plain++;
  }
  assert.ok(ghost > plain * 1.3, `${ghost} against ${plain}`);
});

test('the surge among run cards twice as often while components are wanted; on the director\'s card dice', () => {
  const count = (want) => {
    const s = world(20);
    if (want) card(s, 'salvage');
    let n = 0;
    for (let i = 0; i < 2000; i++) { s.director.lastCard = null; const c = runCardRoll(s, null); if (c?.kind === 'surge') n++; }
    return n;
  };
  const plain = count(false), react = count(true);
  assert.ok(react > plain * 1.3 && react < plain * 1.7, `surges ${react} against ${plain} (a third, now a half)`);
});

test('the Exfil\'s roll doubles while Exploits are wanted', () => {
  const s = world();
  assert.equal(exfilChance(s), CONFIG.exfil.chance);
  card(s, 'exploit');
  assert.equal(exfilChance(s), CONFIG.exfil.chance * REACT);
});

test('a Settlement run while Exploits are wanted, a Rack pull while components are: dealt first, out of turn', () => {
  const setup = () => {
    const s = fresh(); s.tutorialCompleted = true;
    const arch = s.loadout.archetype;
    floorsOf(s).reached = 1;
    s.hackers = { [arch]: { level: 6, xp: 0 } };
    for (let i = 0; i < 4; i++) command(s, 'developer location worm');
    return s;
  };
  const s = setup(), a = dealSite(s);
  assert.equal(a.site.kind, 'rig', 'the first in turn');
  tickSites(s, a.site.left + 1000);
  card(s, 'exploit');
  const b = dealSite(s);
  assert.equal(b.site.kind, 'rig', 'a rig again: Exploits are wanted');
  const t = setup();
  card(t, 'salvage');
  assert.equal(dealSite(t).site.kind, 'rack', 'a rack first: components are wanted');
});
