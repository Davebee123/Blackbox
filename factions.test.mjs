import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { offer, mailCommand } from './dist/mail.mjs';
import { FACTIONS, FACTION_IDS, rep, repTier, changeRep, hubsOf, shopOf, buyFrom, claimServer, strikeServer, OWNED } from './dist/factions.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.server.credits = 5000; return s; };

test('five factions, each with a colour, an icon, tiers, allies and rivals; hubs open with the board', async () => {
  const { GLYPHS } = await import('./dist/glyphs.mjs');
  assert.equal(FACTION_IDS.length, 5);
  for (const f of FACTION_IDS) {
    assert.match(FACTIONS[f].color, /^#[0-9a-f]{6}$/i);
    assert.ok(GLYPHS['f-' + f], `icon for ${f}`);
    assert.equal(FACTIONS[f].tiers.length, 5);
  }
  assert.equal(hubsOf(fresh()).length, 0, 'not before the board opens');
  assert.equal(hubsOf(open()).length, 5);
});

test('rep ripples: helping one costs you with its rivals and warms its allies', () => {
  const s = open();
  const k0 = rep(s, 'kestrel'), n0 = rep(s, 'nullchoir'), h0 = rep(s, 'halcyon');
  changeRep(s, 'kestrel', 20, 'test');
  assert.equal(rep(s, 'kestrel'), k0 + 20);
  assert.equal(rep(s, 'nullchoir'), n0 - 10, 'its rival loses half');
  assert.equal(rep(s, 'halcyon'), h0 + 5, 'its ally gains a quarter');
  assert.equal(repTier(s, 'kestrel').name, 'Client');
});

test('a hub’s goods: tier-gated, limited stock, delivered by file transfer; shut when hostile', async () => {
  const { transfersOf, tickMarket } = await import('./dist/market.mjs');
  const { items } = await import('./dist/hidden.mjs');
  const s = open();
  const daemon = shopOf(s, 'kestrel').find((g) => g.id === 'daemon');
  assert.ok(daemon.locked, 'a daemon image takes Client');
  assert.ok(!shopOf(s, 'kestrel').some((g) => ['cipher', 'worm', 'kernel', 'exploit', 'salvage', 'signal', 'repair'].includes(g.id)), 'wares trade on the market; heals are Halcyon’s');
  const c0 = s.server.credits, r0 = items(s).relay || 0;
  buyFrom(s, 'kestrel', 'relay');
  assert.ok(s.server.credits < c0);
  assert.equal(shopOf(s, 'kestrel').find((g) => g.id === 'relay').left, 2);
  assert.equal(items(s).relay || 0, r0, 'not yet: it’s in transfer');
  const t = transfersOf(s).at(-1);
  assert.equal(t.side, 'good');
  tickMarket(s, t.landsAt);
  assert.equal(items(s).relay, r0 + 1, 'landed');
  command(s, 'market buy kestrel injector');
  assert.equal(transfersOf(s).at(-1).good, 'injector', 'market buy takes goods too');
  s.standing.kestrel = 0;
  const c1 = s.server.credits;
  assert.match(command(s, 'buy kestrel relay').at(-1).message, /won’t trade/);
  assert.equal(s.server.credits, c1);
});

test('faction servers: some traced servers belong to a faction; opening the vault takes it from them', () => {
  const s = open();
  const loc = addLocation(s, 'worm', 1); addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const target = s.locations.at(-1);
  claimServer(s, target, 0.01); // force it
  assert.ok(target.faction && target.faction !== 'halcyon');
  const f = target.faction, r0 = rep(s, f);
  strikeServer(s, target, 'takeover');
  assert.equal(rep(s, f), r0 - OWNED.takeoverHit, 'hostility has depth: rep goes under zero');
  assert.equal(target.faction, undefined, 'it isn’t theirs any more');
  assert.ok(loc);
});

test('faction contracts: posted by the faction, paid in its rep (no Indemnity)', () => {
  const s = open();
  let o = null;
  for (let i = 0; i < 60 && !o; i++) { const x = offer(s); if (['kestrel', 'lantern', 'nullchoir'].includes(x.faction)) o = x; }
  assert.ok(o, 'other factions post work once the hubs are up');
  assert.ok(o.reward.rep > 0 && !o.reward.indemnity && !o.reward.standing);
  assert.equal(o.from, FACTIONS[o.faction].name);
  if (o.type === 'materials') {
    mailCommand(s, `mail accept ${o.id}`);
    s.materials[o.material] = 99;
    const r0 = rep(s, o.faction);
    mailCommand(s, `mail deliver ${o.id}`);
    assert.equal(rep(s, o.faction), r0 + o.reward.rep);
  }
});
