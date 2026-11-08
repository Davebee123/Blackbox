import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { offer, mailCommand } from './dist/mail.mjs';
import { shopOf } from './dist/store.mjs';
import { FACTIONS, FACTION_IDS, rep, repTier, changeRep, hubsOf, buyFrom, claimServer, strikeServer, REP_FLOOR, commissionOf, stanceLine } from './dist/factions.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true }; s.server.credits = 5000; return s; };

test('five factions, each with a colour, an icon, tiers, allies and rivals; hubs open with the board', async () => {
  const { GLYPHS } = await import('./dist/glyphs.mjs');
  assert.equal(FACTION_IDS.length, 5);
  for (const f of FACTION_IDS) {
    assert.match(FACTIONS[f].color, /^#[0-9a-f]{6}$/i);
    assert.ok(GLYPHS['f-' + f], `icon for ${f}`);
    assert.equal(FACTIONS[f].tiers.length, 4, 'four tiers, shown as four pips');
  }
  assert.equal(hubsOf(fresh()).length, 0, 'not before the board opens');
  assert.equal(hubsOf(open()).length, 5);
});

test('rep ripples: helping one costs you with its rivals and warms its allies', () => {
  const s = open();
  const k0 = rep(s, 'kestrel'), n0 = rep(s, 'nullchoir'), h0 = rep(s, 'halcyon');
  changeRep(s, 'kestrel', 20, 'test');
  assert.equal(rep(s, 'kestrel'), k0 + 20);
  assert.equal(rep(s, 'nullchoir'), Math.max(REP_FLOOR, n0 - 10), 'its rival loses half, never under 1');
  assert.equal(rep(s, 'halcyon'), h0 + 5, 'its ally gains a quarter');
  assert.equal(repTier(s, 'kestrel').name, 'Client');
  changeRep(s, 'nullchoir', -500, 'test');
  assert.equal(rep(s, 'nullchoir'), 1, 'one scale, 1 to 100: no Hostile');
  assert.equal(repTier(s, 'nullchoir').i, 0);
});

test('a hub’s Shop: tier-gated, delivered by file transfer; never shut by rep', async () => {
  const { transfersOf, tickMarket } = await import('./dist/market.mjs');
  const { items } = await import('./dist/hidden.mjs');
  const s = open();
  const ids = (f) => shopOf(s, f).tools.map((t) => t.id);
  assert.ok(!ids('kestrel').includes('daemon') && !ids('nullchoir').includes('daemon'), 'no daemon images: only invasions drop daemons');
  assert.ok(shopOf(s, 'kestrel').codebases.find((x) => x.id === 'snare').locked, 'the Snare codebase takes the second tier');
  assert.ok(!ids('kestrel').some((id) => ['cipher', 'worm', 'kernel', 'exploit', 'salvage'].includes(id)), 'wares trade on the market');
  const c0 = s.server.credits, r0 = items(s).relay || 0;
  buyFrom(s, 'kestrel', 'relay');
  assert.ok(s.server.credits < c0);
  assert.equal(items(s).relay || 0, r0, 'not yet: it’s in transfer');
  const t = transfersOf(s).at(-1);
  assert.equal(t.side, 'good');
  tickMarket(s, t.landsAt);
  assert.equal(items(s).relay, r0 + 1, 'landed');
  s.standing.kestrel = 1;
  const c1 = s.server.credits;
  command(s, 'buy kestrel relay');
  assert.ok(s.server.credits < c1, 'the bottom tier still trades');
});

test('faction servers: some traced servers belong to a faction; a takeover takes it from them, at no rep', () => {
  const s = open();
  s.net = { nested: true }; // past the guaranteed early Nest
  const loc = addLocation(s, 'worm', 1); addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const target = s.locations.at(-1);
  claimServer(s, target, 0.01); // force it
  assert.ok(target.faction && target.faction !== 'halcyon');
  const f = target.faction, r0 = rep(s, f);
  strikeServer(s, target, 'takeover');
  assert.equal(rep(s, f), r0, 'rep comes from contracts and receipts only');
  assert.equal(target.faction, undefined, 'it isn’t theirs any more');
  assert.ok(loc);
});

test('faction contracts: posted by the faction, paid in its rep', () => {
  const s = open();
  let o = null;
  for (let i = 0; i < 60 && !o; i++) { const x = offer(s); if (['kestrel', 'lantern', 'nullchoir'].includes(x.faction)) o = x; }
  assert.ok(o, 'other factions post work once the hubs are up');
  assert.ok(o.reward.rep > 0 && !o.reward.standing);
  assert.equal(o.from, FACTIONS[o.faction].name);
  if (o.type === 'materials') {
    mailCommand(s, `mail accept ${o.id}`);
    s.materials[o.material] = 99;
    const r0 = rep(s, o.faction);
    mailCommand(s, `mail deliver ${o.id}`);
    assert.equal(rep(s, o.faction), r0 + o.reward.rep);
  }
});

test('faction hubs are found: Halcyon’s is known; another’s trace grows from its servers (located, cleared) to 100%', async () => {
  const { hubsOf, hubFound, hubTraceOf, hubTrace, clearedFor, HUB_TRACE, rep } = await import('./dist/factions.mjs');
  const { restore } = await import('./dist/combat.mjs');
  const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.server.credits = 5000;
  assert.deepEqual(hubsOf(s).map((h) => h.faction), ['halcyon'], 'only your employer’s at first');
  assert.match(command(s, 'market sell lantern worm 1').at(-1).message, /haven't located/);
  const loc = { name: 'LANTERN-BOX', faction: 'lantern', state: { cleared: {} } };
  hubTrace(s, 'lantern', HUB_TRACE.server, 'located: ');
  assert.equal(hubTraceOf(s, 'lantern'), HUB_TRACE.server);
  const r0 = rep(s, 'lantern');
  clearedFor(s, loc);
  assert.equal(rep(s, 'lantern'), r0, 'a clear traces the hub, no rep');
  assert.equal(hubTraceOf(s, 'lantern'), HUB_TRACE.server + HUB_TRACE.cleared);
  for (let i = 0; i < 3 && !hubFound(s, 'lantern'); i++) clearedFor(s, loc);
  assert.ok(hubFound(s, 'lantern'));
  assert.deepEqual(hubsOf(s).map((h) => h.faction), ['halcyon', 'lantern']);
  // A save the old load step marked all-found keeps only the hubs it actually traced.
  const old = fresh(); old.version = 27; old.mail = { boardOpen: true, list: [], jobs: [], offers: [] }; old.hubs = { halcyon: {}, glassjaw: {}, kestrel: {}, lantern: {}, nullchoir: {} };
  old.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true }; old.hubLead = { lantern: 100, kestrel: 40 };
  const r = restore(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(hubsOf(r).map((h) => h.faction), ['halcyon', 'lantern']);
  // And loading again never finds hubs on its own.
  const again = restore(JSON.parse(JSON.stringify(r)));
  assert.deepEqual(hubsOf(again).map((h) => h.faction), ['halcyon', 'lantern']);
});

test('commissions: Halcyon to start; switch at a found hub out of a fight; it sets the retainer and the stance', async () => {
  const { retainer, retainerWith } = await import('./dist/mail.mjs');
  const s = open();
  assert.equal(commissionOf(s), 'halcyon');
  assert.equal(stanceLine(s), 'Holds with Halcyon');
  s.standing.lantern = 60;
  assert.ok(retainerWith(s, 'lantern') > retainer(s), 'a higher tier pays more');
  const ev = command(s, 'commission lantern');
  assert.equal(commissionOf(s), 'lantern');
  assert.equal(stanceLine(s), 'Settles with LANTERN');
  assert.equal(retainer(s), retainerWith(s, 'lantern'));
  assert.equal(ev.filter((e) => /^wick:/.test(e.message)).length, 1, 'one wick line a switch');
  delete s.hubFound.kestrel;
  command(s, 'commission kestrel');
  assert.equal(commissionOf(s), 'lantern', 'only at a hub you have found');
});

test('an old save: rep under 1 comes back as 1, safely twice', async () => {
  const { restore } = await import('./dist/combat.mjs');
  const old = fresh(); old.standing = { halcyon: 0, nullchoir: -40, kestrel: 30 };
  const r = restore(JSON.parse(JSON.stringify(old)));
  assert.deepEqual([r.standing.halcyon, r.standing.nullchoir, r.standing.kestrel], [1, 1, 30]);
  const again = restore(JSON.parse(JSON.stringify(r)));
  assert.deepEqual([again.standing.halcyon, again.standing.nullchoir], [1, 1]);
});
