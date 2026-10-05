import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, materialsOf } from './dist/combat.mjs';
import { compilePayload, deployPayload, resolveStrike, builtOf, flyingOf, PAYLOAD, forecastStrike } from './dist/payload.mjs';
import { rep, captured, donationOf, donate, hostile, shopOf } from './dist/factions.mjs';
import { quote, trade, tickMarket } from './dist/market.mjs';
import { tickPayloads } from './dist/payload.mjs';
import { HUBS, tickHubs, tickRetake, collect, bankOf, retakeOf, lockedDown, heldOf } from './dist/hubs.mjs';

const T0 = 1_000_000_000_000;
const open = () => {
  const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.server.credits = 50000;
  Object.assign(materialsOf(s), { cipher: 200, worm: 200, kernel: 200, exploit: 20 });
  s.salvage = Array.from({ length: 60 }, () => ({ name: 'Scrap', virus: 't', seed: 0 }));
  return s;
};
const strike = (s, kind, f, at) => { compilePayload(s, kind); const p = builtOf(s).at(-1); p.power = 999; deployPayload(s, p.id, f, at); return resolveStrike(s, flyingOf(s).at(-1), at); };
const take = (s, f) => { strike(s, 'wiper', f, Date.now()); return strike(s, 'backdoor', f, Date.now()); };
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};

test('a Backdoor only takes a hub that is offline; capture makes its owner deeply hostile', () => {
  const s = open();
  compilePayload(s, 'backdoor');
  assert.equal(forecastStrike(s, builtOf(s)[0], 'kestrel'), 'blocked', 'not while it is up');
  builtOf(s)[0].power = 999;
  deployPayload(s, builtOf(s)[0].id, 'kestrel');
  assert.equal(resolveStrike(s, flyingOf(s)[0], Date.now()), 'blocked');
  assert.ok(!captured(s, 'kestrel'));
  const r0 = rep(s, 'kestrel');
  strike(s, 'wiper', 'kestrel', Date.now());
  const r1 = rep(s, 'kestrel');
  assert.ok(r1 < r0);
  assert.equal(strike(s, 'backdoor', 'kestrel', Date.now()), 'breach');
  assert.ok(captured(s, 'kestrel'));
  assert.equal(rep(s, 'kestrel'), r1 + PAYLOAD.captureHit);
  assert.ok(rep(s, 'kestrel') < 0, 'hostility has depth');
});

test('never Halcyon’s; two hubs at most', () => {
  const s = open();
  compilePayload(s, 'backdoor');
  deployPayload(s, builtOf(s)[0].id, 'halcyon');
  assert.equal(flyingOf(s).length, 0);
  builtOf(s).length = 0;
  take(s, 'kestrel'); take(s, 'lantern');
  assert.equal(heldOf(s).length, 2);
  strike(s, 'wiper', 'nullchoir', Date.now());
  compilePayload(s, 'backdoor');
  deployPayload(s, builtOf(s).at(-1).id, 'nullchoir');
  assert.ok(!captured(s, 'nullchoir'));
});

test('a held hub: no spread, shop at cost and unlocked, earns over time, collect it', () => {
  const s = open();
  take(s, 'kestrel');
  const q = quote(s, 'kestrel', 'kernel');
  assert.ok(q.buy - q.sell <= 1, 'true price both ways');
  assert.ok(!shopOf(s, 'kestrel').some((g) => g.locked));
  assert.ok(!hostile(s, 'kestrel'), 'you can trade at your own hub');
  s.hubs.kestrel.captured.bankAt = T0;
  tickHubs(s, T0 + 3 * 3600000);
  const bank = bankOf(s, 'kestrel');
  assert.ok(bank > 0);
  tickHubs(s, T0 + 100 * 3600000);
  assert.ok(bankOf(s, 'kestrel') <= HUBS.bankHours * 1000, 'it holds a day at most');
  const c0 = s.server.credits, b = bankOf(s, 'kestrel');
  collect(s, 'kestrel');
  assert.equal(s.server.credits, c0 + b);
  assert.equal(bankOf(s, 'kestrel'), 0);
});

test('retaliation: a retake swarm comes; break it and the hub holds', () => {
  const s = open();
  take(s, 'kestrel');
  tickRetake(s, 1000, false, T0); tickRetake(s, 1000, false, T0 + HUBS.firstMs);
  const r = retakeOf(s);
  assert.ok(r && r.f === 'kestrel');
  for (let i = 0; i < r.total; i++) { command(s, 'hub defend kestrel'); win(s); }
  assert.equal(retakeOf(s), null);
  assert.ok(captured(s, 'kestrel') && !lockedDown(s, 'kestrel'));
});

test('a lost retake locks the hub down: no income until you clear it, never lost', () => {
  const s = open();
  take(s, 'kestrel');
  tickRetake(s, 1000, false, T0); tickRetake(s, 1000, false, T0 + HUBS.firstMs);
  tickRetake(s, 1000, false, T0 + HUBS.firstMs + HUBS.travelMs);
  tickRetake(s, HUBS.siegeMs + 1, false, T0 + HUBS.firstMs + HUBS.travelMs + 1);
  assert.ok(lockedDown(s, 'kestrel'));
  assert.ok(captured(s, 'kestrel'), 'still yours');
  s.hubs.kestrel.captured.bank = 0; s.hubs.kestrel.captured.bankAt = T0;
  tickHubs(s, T0 + 5 * 3600000);
  assert.equal(bankOf(s, 'kestrel'), 0);
  command(s, 'hub clear kestrel'); win(s);
  assert.ok(!lockedDown(s, 'kestrel'));
});

test('donations: inflated by how deep you are, +5 each, never past Neutral; no drift back', () => {
  const s = open();
  s.standing.nullchoir = -30;
  const deep = donationOf(s, 'nullchoir');
  s.standing.nullchoir = 0;
  const shallow = donationOf(s, 'nullchoir');
  assert.ok(deep.credits > 3 * shallow.credits * 0.9, 'about 4× at −30 against 1.1× at 0');
  s.standing.nullchoir = -30;
  donate(s, 'nullchoir');
  assert.equal(rep(s, 'nullchoir'), -25);
  s.standing.nullchoir = 22;
  donate(s, 'nullchoir');
  assert.equal(rep(s, 'nullchoir'), 24, 'stops short of trust');
  donate(s, 'nullchoir');
  assert.equal(rep(s, 'nullchoir'), 24);
  s.standing.lantern = -20;
  tickHubs(s, T0); tickHubs(s, T0 + 48 * 3600000); tickRetake(s, 1000, false, T0 + 48 * 3600000);
  assert.equal(rep(s, 'lantern'), -20, 'rep never comes back on its own');
});

test('hitting a faction’s rival wins it back', () => {
  const s = open();
  s.standing.kestrel = -20;
  strike(s, 'exfil', 'nullchoir', Date.now()); // NULL CHOIR is Kestrel's rival
  assert.equal(rep(s, 'kestrel'), -20 + Math.round(-PAYLOAD.rep.breach * 0.5));
});

test('no dodging by logging off: retakes gather and travel on real time, and stop the income; the siege waits for you', () => {
  const s = open();
  take(s, 'kestrel');
  s.hubs.kestrel.captured.bankAt = T0;
  tickRetake(s, 1000, false, T0);
  // Away for a day: one long gap, as on reload (dt is capped; the clock isn't).
  tickRetake(s, 1000, false, T0 + 24 * 3600000);
  assert.ok(retakeOf(s), 'it came while you were away');
  tickRetake(s, 1000, false, T0 + 24 * 3600000 + HUBS.travelMs);
  assert.equal(retakeOf(s).state, 'siege');
  assert.ok(!lockedDown(s, 'kestrel'), 'never locked down while away');
  tickHubs(s, T0 + 30 * 3600000);
  const b = bankOf(s, 'kestrel');
  tickHubs(s, T0 + 40 * 3600000);
  assert.equal(bankOf(s, 'kestrel'), b, 'nothing earned while it sits at the hub');
});

test('a fight against a retake left open freezes nothing in your favour', () => {
  const s = open();
  take(s, 'kestrel');
  tickRetake(s, 1000, false, T0); tickRetake(s, 1000, false, T0 + HUBS.firstMs);
  command(s, 'hub defend kestrel');
  s.hubs.kestrel.captured.bank = 0; s.hubs.kestrel.captured.bankAt = T0;
  tickRetake(s, 1000, false, T0 + 10 * 3600000);
  tickHubs(s, T0 + 10 * 3600000);
  assert.equal(bankOf(s, 'kestrel'), 0, 'no income with a retake out');
  assert.equal(retakeOf(s).state, 'siege', 'it still arrives');
});

test('no round-trip profit at a held hub (no spread)', () => {
  const s = open();
  take(s, 'kestrel');
  tickMarket(s, T0); s.market.event = 'calm';
  for (const w of ['kernel', 'cipher', 'exploit', 'salvage']) {
    const c0 = s.server.credits;
    trade(s, 'buy', 'kestrel', w, 40, T0);
    const spent = c0 - s.server.credits;
    const n0 = materialsOf(s)[w] ?? s.salvage.length;
    materialsOf(s)[w] = (materialsOf(s)[w] || 0) + 40; if (w === 'salvage') for (let i = 0; i < 40; i++) s.salvage.push({ name: 'x' });
    trade(s, 'sell', 'kestrel', w, 40, T0);
    const t = s.market.transfers.at(-1);
    assert.ok(t.credits <= spent, `${w}: sold for ${t.credits}, bought for ${spent}`);
    assert.ok(n0 >= 0);
  }
});

test('a payload that reaches a hub you took meanwhile stands down', () => {
  const s = open();
  compilePayload(s, 'exfil');
  deployPayload(s, builtOf(s)[0].id, 'kestrel', T0);
  take(s, 'kestrel');
  const r0 = rep(s, 'kestrel'), n = builtOf(s).length;
  tickPayloads(s, T0 + 3600000);
  assert.equal(rep(s, 'kestrel'), r0);
  assert.equal(builtOf(s).length, n + 1, 'back in your hold');
});
