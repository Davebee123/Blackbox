import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, materialsOf } from './dist/combat.mjs';
import { compilePayload, deployPayload, tickPayloads, resolveStrike, builtOf, flyingOf, defenceOf, alertOf, offline, forecastStrike, PAYLOAD } from './dist/payload.mjs';
import { trade, priceOf, travelMs } from './dist/market.mjs';
import { rep, buyFrom } from './dist/factions.mjs';

const T0 = 1_000_000_000_000;
const open = () => {
  const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.server.credits = 5000;
  Object.assign(materialsOf(s), { cipher: 50, worm: 50, exploit: 2 });
  s.salvage = Array.from({ length: 20 }, () => ({ name: 'Scrap', virus: 't', seed: 0 }));
  return s;
};

test('compiling costs credits, code and salvage; an Exploit arms it; you hold three at most', () => {
  const s = open();
  compilePayload(s, 'exfil');
  assert.equal(builtOf(s).length, 1);
  assert.equal(materialsOf(s).cipher, 50 - PAYLOAD.code);
  assert.equal(s.salvage.length, 20 - PAYLOAD.salvage);
  compilePayload(s, 'wiper', true);
  assert.equal(materialsOf(s).exploit, 1);
  assert.ok(builtOf(s)[1].power > builtOf(s)[0].power);
  compilePayload(s, 'exfil'); compilePayload(s, 'exfil');
  assert.equal(builtOf(s).length, 3);
});

test('a payload travels, then lands on its own: breach pays out, the hub goes on alert, its rep drops', () => {
  const s = open();
  compilePayload(s, 'exfil', true);
  const p = builtOf(s)[0];
  p.power = 999; // sure to breach
  const c0 = s.server.credits, k0 = materialsOf(s).kernel || 0, r0 = rep(s, 'kestrel'), d0 = defenceOf(s, 'kestrel', T0);
  deployPayload(s, p.id, 'kestrel', T0);
  assert.equal(flyingOf(s).length, 1);
  tickPayloads(s, T0 + travelMs(s, 'kestrel') - 1);
  assert.equal(s.server.credits, c0, 'still in flight');
  tickPayloads(s, T0 + travelMs(s, 'kestrel'));
  assert.equal(flyingOf(s).length, 0);
  assert.ok(s.server.credits > c0);
  assert.ok(materialsOf(s).kernel > k0, 'Kestrel hoards Kernel code');
  assert.equal(rep(s, 'kestrel'), r0 + PAYLOAD.rep.breach);
  assert.equal(alertOf(s, 'kestrel', T0 + travelMs(s, 'kestrel')), 1);
  assert.ok(defenceOf(s, 'kestrel', T0 + travelMs(s, 'kestrel')) > d0);
  assert.equal(alertOf(s, 'kestrel', T0 + travelMs(s, 'kestrel') + PAYLOAD.alertEaseMs), 0, 'eases back');
});

test('weak payloads are blocked; forecasts read the band', () => {
  const s = open();
  compilePayload(s, 'exfil');
  const p = builtOf(s)[0];
  p.power = 1;
  assert.equal(forecastStrike(s, p, 'nullchoir', T0), 'blocked');
  const c0 = s.server.credits;
  deployPayload(s, p.id, 'nullchoir', T0);
  assert.equal(resolveStrike(s, flyingOf(s)[0], T0 + 1), 'blocked');
  assert.equal(s.server.credits, c0);
  p.power = 999;
  assert.equal(forecastStrike(s, p, 'nullchoir', T0), 'breach');
});

test('a Wiper knocks a hub offline: its shop and market shut, the others pay more for what it buys', () => {
  const s = open();
  compilePayload(s, 'wiper');
  const p = builtOf(s)[0]; p.power = 999;
  const before = priceOf(s, 'halcyon', 'kernel');
  deployPayload(s, p.id, 'kestrel', T0);
  resolveStrike(s, flyingOf(s)[0], Date.now());
  assert.ok(offline(s, 'kestrel'));
  const c0 = s.server.credits;
  buyFrom(s, 'kestrel', 'signal');
  assert.equal(s.server.credits, c0, 'shop shut');
  trade(s, 'sell', 'kestrel', 'cipher', 1);
  assert.equal(materialsOf(s).cipher, 50, 'market shut');
  assert.ok(priceOf(s, 'halcyon', 'kernel') > before, 'Kestrel’s Kernel demand moves elsewhere');
  compilePayload(s, 'wiper');
  deployPayload(s, builtOf(s)[0].id, 'kestrel');
  assert.equal(builtOf(s).length, 1, 'can’t hit a hub that’s already down');
});

test('commands route', () => {
  const s = open();
  command(s, 'payload compile exfil');
  assert.equal(builtOf(s).length, 1);
  command(s, `payload deploy ${builtOf(s)[0].id} lantern`);
  assert.equal(flyingOf(s).length, 1);
});
