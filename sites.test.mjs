// Quest sites (docs/sites.md, GAME_RULES.md "Quest sites"): the Settlement run. sites.mjs (dealing, the clock, the lock
// landing, the win, unmounting), its fights through netrooms.mjs (the Core's lock, open from the start) and its screens
// (sites-view.mjs: the map node, the card, the threat rail).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, findLocation, materialsOf } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { floorsOf } from './dist/floors.mjs';
import { rep } from './dist/factions.mjs';
import { mapMarkup, threatsOf } from './dist/view.mjs';
import { RIVAL } from './dist/rivals.mjs';
import { SITE, CREWS, dealRig, dealRack, dealRunner, dealSite, tickSites, siteServers } from './dist/sites.mjs';
import { castOf, raiseStanding, standingOf, tierOf, runnersOf, stateOf } from './dist/runners.mjs';
import { knowsCodebase, CODEBASE_SHOPS } from './dist/sockets.mjs';
import { hiddenNodes } from './dist/hidden.mjs';
import { STAMPS } from './dist/receipts.mjs';
import { tickChannel, channelLines } from './dist/channel.mjs';
import { keptReceipts } from './dist/receipts.mjs';
RIVAL.chance = 0;

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;

function setup(level = 6) {
  const s = fresh(); s.tutorialCompleted = true;
  const arch = s.loadout.archetype;
  floorsOf(s).reached = 1;
  s.hackers = { [arch]: { level: 6, xp: 0 } };
  for (let i = 0; i < 4; i++) command(s, 'developer location worm');
  s.hackers[arch].level = level;
  return s;
}
const win = (s) => { for (let i = 0; i < 60 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const walk = (s, id) => {
  for (let k = 0; k < 60 && s.rooms.at !== id; k++) {
    const path = FP.pathTo(s.rooms.graph, s.rooms.at, id, (x) => x !== s.rooms.graph.core || FP.coreOpen(s));
    assert.ok(path, `a way to ${id}`);
    FP.go(s, path[1]);
    if (s.rooms.screen?.kind === 'virus' || s.rooms.screen?.kind === 'hunter') FP.act(s, 'engage');
    if (active(s)) win(s);
    s.run.integrity = s.run.max;
  }
  assert.equal(s.rooms.at, id);
};
const connect = (s, loc) => { clock += 60000; loc.lockUntil = 0; const ev = play(s, 'connect ' + loc.id); assert.ok(s.run, ev.map((e) => e.message).join(' ')); return ev; };

test('a rig mounts beside a server of yours on your floor: a crew, an institution, its trades and the run’s clock', () => {
  const s = setup(6);
  const loc = dealRig(s);
  assert.ok(loc, 'a rig');
  assert.equal(findLocation(s, loc.id), loc, 'connect finds it');
  assert.ok(!s.locations.includes(loc), 'off your network: no invasions, no tracing, no takeover');
  assert.ok(CREWS.includes(loc.site.crew));
  assert.equal(loc.site.inst, 'Tenements Board', 'floor 1’s living institution');
  assert.equal(loc.site.faction, 'halcyon');
  assert.equal(loc.depth, 1);
  const target = findLocation(s, loc.site.target);
  assert.ok(target && !target.rogue, 'aimed at a tame server you located');
  assert.equal(loc.level, target.level, 'its target’s level');
  const near = s.locations.filter((l) => !l.rogue && (l.level || 1) <= 8).map((l) => Math.abs((l.level || 1) - 6)).sort((a, b) => a - b);
  assert.ok(Math.abs(target.level - 6) <= near[2], 'among the three nearest your level');
  assert.ok(loc.site.left >= SITE.rig.ms[0] && loc.site.left <= SITE.rig.ms[1]);
  assert.equal(dealRig(s), null, 'one up at a time');
  assert.equal(s.logs.findLast((e) => e.type === 'site').phase, 'up');
});

test('the director deals one after its logged-on time, from level 5; nothing while you’re lower', () => {
  const low = setup(4);
  tickSites(low, 3 * 3600000);
  assert.equal(siteServers(low).length, 0);
  const s = setup(6);
  tickSites(s, SITE.firstMs[1] + 1000);
  assert.equal(siteServers(s).length, 1);
});

test('the clock runs out: the lock lands, the table +1, the rig unmounts; nothing else is lost', () => {
  const s = setup(6);
  const loc = dealRig(s), t0 = s.table ?? 84, c0 = s.server.credits, h0 = rep(s, 'halcyon');
  tickSites(s, loc.site.left - 1000);
  assert.equal(loc.site.state, 'up');
  tickSites(s, 2000);
  assert.equal(loc.site.state, 'landed');
  assert.ok(Math.abs((s.table - t0) - SITE.rig.table) < 0.01, 'its trades orphan');
  assert.match(s.logs.findLast((e) => e.type === 'site').message, /lock landed on the Tenements Board: \d+ trades orphaned\. Process table \+1\./);
  assert.equal(siteServers(s).length, 0, 'it unmounts');
  assert.equal(s.server.credits, c0);
  assert.equal(rep(s, 'halcyon'), h0);
});

test('break the lock: its Core is open from the start, an elite; 3 Exploits and +12 with the institution’s faction; home, the pack banked', () => {
  const s = setup(6);
  const loc = dealRig(s), x0 = materialsOf(s).exploit || 0, h0 = rep(s, 'halcyon');
  connect(s, loc);
  assert.equal(FP.coreOpen(s), true, 'no vault key needed');
  const core = loc.floorplan.graph.core;
  const path = FP.pathTo(s.rooms.graph, s.rooms.at, core, () => true);
  walk(s, path.at(-2));
  FP.go(s, core);
  if (s.rooms.screen?.kind === 'virus') FP.act(s, 'engage');
  assert.ok(active(s));
  assert.match(s.encounter.virus.name, /^THE LOCK · /);
  assert.ok(s.encounter.virus.elite, 'an elite');
  win(s);
  assert.equal(loc.site.state, 'won');
  assert.equal(materialsOf(s).exploit, x0 + SITE.rig.exploits);
  assert.equal(rep(s, 'halcyon'), h0 + SITE.rig.rep);
  assert.match(s.logs.findLast((e) => e.type === 'site').message, /settles: \d+ trades closed\. The lock comes apart: \+3 Exploits\./);
  tickSites(s, 1000);
  assert.equal(s.run, null, 'the rig unmounts under you: home');
  assert.equal(siteServers(s).length, 0);
});

test('its clock waits while you fight on it', () => {
  const s = setup(6);
  const loc = dealRig(s);
  connect(s, loc);
  const fight = Object.values(loc.floorplan.graph.rooms).find((r) => r.kind === 'process');
  const path = FP.pathTo(s.rooms.graph, s.rooms.at, fight.id, () => true);
  for (const id of path.slice(1)) { FP.go(s, id); if (s.rooms.screen?.kind === 'virus') FP.act(s, 'engage'); if (active(s)) break; }
  assert.ok(active(s), 'in a fight on the rig');
  const left = loc.site.left;
  tickSites(s, 60000);
  assert.equal(loc.site.left, left);
});

test('on the map: the rig in the threat’s red with its clock, a red aim at its target; its card; its row on the rail', () => {
  const s = setup(6);
  const loc = dealRig(s);
  const map = mapMarkup(s, loc.id, 'mine', { side: true });
  assert.match(map, new RegExp(`class="mnode site site-rig f-target[^"]*" data-select="${loc.id}"`));
  assert.match(map, /class="sr-fg"/, 'a ring of the time left');
  assert.match(map, /class="mlink[^"]* saim/, 'the aim at its target');
  assert.match(map, /Settlement run/);
  assert.match(map, /data-command="connect [a-z]+-rig-\d+"/);
  assert.match(map, /table <b>\+1<\/b>/);
  const row = threatsOf(s).find((r) => r.sel === loc.id);
  assert.equal(row.name, 'The Tenements Board');
  assert.equal(row.left, loc.site.left);
});

test('a rack mounts beside a server of yours: Kessler hardware, its trades older than the floor, its Core sealed', () => {
  const s = setup(6);
  const loc = dealRack(s);
  assert.match(loc.name, /^KESSLER-RACK-\d\d$/);
  assert.equal(findLocation(s, loc.id), loc);
  const host = findLocation(s, loc.site.host);
  assert.ok(host && !host.rogue);
  assert.equal(loc.level, host.level);
  assert.ok(loc.site.era >= 3, 'an older layer than floor 1');
  assert.ok(loc.site.year < 2086, 'before floor 1 mounted');
  assert.ok(loc.site.left >= SITE.rack.ms[0] && loc.site.left <= SITE.rack.ms[1]);
  connect(s, loc);
  assert.equal(FP.coreOpen(s), false, 'nothing to take over');
});

test('open the cage: a NULL CHOIR order’s worth of components, three receipts for your commission, Kestrel +6; home', () => {
  const s = setup(6);
  const loc = dealRack(s), c0 = s.components || 0, r0 = keptReceipts(s).length, k0 = rep(s, 'kestrel');
  connect(s, loc);
  const g = loc.floorplan.graph, vault = g.vaults[0], guard = Object.values(g.rooms).find((r) => r.kind === 'guard' && r.key === vault);
  walk(s, guard.id);
  walk(s, vault);
  FP.act(s, 'open');
  assert.equal(loc.site.state, 'won');
  assert.ok((s.components || 0) >= c0 + SITE.rack.components(loc.level), 'Kessler hardware: components (its fights drop some too)');
  assert.equal(keptReceipts(s).length, r0 + SITE.rack.receipts);
  assert.ok(keptReceipts(s).slice(-3).every((x) => Number(x.date.slice(-4)) < 2086), 'from before floor 1 mounted');
  assert.equal(rep(s, 'kestrel'), k0 + SITE.rack.rep);
  assert.equal(FP.coreOpen(s), false, 'still sealed');
  assert.doesNotMatch(s.logs.slice(-12).map((e) => e.message).join('\n'), /The Core unseals/);
  tickSites(s, 1000);
  assert.equal(s.run, null, 'pulled back: home, the pack banked');
  assert.equal(siteServers(s).length, 0);
});

test('a rack’s clock runs out: back to cold storage, nothing lost, nothing on the table', () => {
  const s = setup(6);
  const loc = dealRack(s), t0 = s.table ?? 84;
  tickSites(s, loc.site.left + 1000);
  assert.equal(loc.site.state, 'closed');
  assert.equal(s.table ?? 84, t0);
  assert.match(s.logs.findLast((e) => e.type === 'site' && e.phase === 'closed').message, /Kestrel pulls KESSLER-RACK-\d\d back to cold storage\./);
  assert.ok(!siteServers(s).includes(loc), 'gone');
});

test('the kinds come in turn', () => {
  const s = setup(6);
  const a = dealSite(s);
  tickSites(s, a.site.left + 1000);
  const b = dealSite(s);
  assert.notEqual(a.site.kind, b.site.kind);
});

test('a rack on the map: the director’s violet with its clock, a dashed link to its host; its card; its row', () => {
  const s = setup(6);
  const loc = dealRack(s);
  const map = mapMarkup(s, loc.id, 'mine', { side: true });
  assert.match(map, new RegExp(`class="mnode site site-rack f-target[^"]*" data-select="${loc.id}"`));
  assert.match(map, /class="mlink[^"]* slink/);
  assert.match(map, /Rack pull/);
  assert.match(map, /The cage/);
  assert.ok(map.includes(`>${loc.site.c}<`), 'its era');
  const row = threatsOf(s).find((r) => r.sel === loc.id);
  assert.equal(row.name, 'Rack pull');
});

// A runner you've met: the network's cast (runners.mjs), one of them helped once.
const metRunner = (s) => { s.netSeed = 4242; const r = castOf(s)[0]; raiseStanding(s, r.handle, 1, 'a room'); return r; };

test('a runner’s trade: only for a runner you’ve met, on the server their trade froze on; no clock', () => {
  const s = setup(6);
  assert.equal(dealRunner(s), null, 'no one met, no trade');
  const r = metRunner(s);
  tickChannel(s, 0); // the channel reads what's logged after it opens
  const loc = dealRunner(s);
  assert.ok(loc);
  assert.equal(loc.site.handle, r.handle);
  assert.equal(loc.site.what, stateOf(s, r).trade.what, 'their trade, as their card says');
  assert.match(loc.name, /^[A-Z]+-LEDGER-\d\d$/);
  assert.match(loc.site.receipt.id, /^TRD-\d\d-\d{7}$/);
  assert.equal(loc.site.total, undefined, 'no clock');
  assert.ok(dealRig(s), 'beside a clocked one');
  assert.equal(dealRunner(s), null, 'one at a time');
  tickSites(s, 30 * 60000);
  assert.ok(siteServers(s).includes(loc), 'it waits while they are on the net');
  tickChannel(s, 1000);
  assert.match(channelLines(s).map((x) => x.text).join('\n'), new RegExp(`found it\\. ${loc.name}`, 'i'), 'they ask on #net');
});

test('their Resident, open from the start, with them beside you: a tier, a codebase, a lead; then their stamp', () => {
  const s = setup(6);
  const r = metRunner(s), loc = dealRunner(s), t0 = tierOf(standingOf(s, r.handle)).i, leads0 = hiddenNodes(s).filter((n) => n.lead >= 100).length;
  const cb = (CODEBASE_SHOPS[r.faction] || []).map(([id]) => id).find((id) => !knowsCodebase(s, id));
  connect(s, loc);
  assert.equal(FP.coreOpen(s), true);
  const core = loc.floorplan.graph.core, path = FP.pathTo(s.rooms.graph, s.rooms.at, core, () => true);
  walk(s, path.at(-2));
  FP.go(s, core);
  if (s.rooms.screen?.kind === 'virus') FP.act(s, 'engage');
  assert.ok(active(s));
  assert.ok(s.guests?.some((g) => g.name === r.handle && g.helper), 'they fight beside you');
  win(s);
  assert.equal(loc.site.state, 'won');
  assert.equal(tierOf(standingOf(s, r.handle)).i, Math.min(3, t0 + 1), 'up a tier');
  if (cb) assert.ok(knowsCodebase(s, cb), 'a codebase of their faction’s');
  assert.equal(runnersOf(s).known[r.handle].settled, loc.site.n, 'that trade is settled with them');
  const S = STAMPS[r.faction];
  assert.match(s.logs.findLast((e) => e.type === 'site').message, new RegExp(`^${loc.site.receipt.id}, \\w[\\w ]* by ${r.handle}: `));
  assert.equal(s.logs.findLast((e) => e.type === 'site').stamp, S.done);
  tickSites(s, 1000);
  assert.equal(s.run, null, 'home, the pack banked');
  assert.equal(dealRunner(s), null, 'not the same trade again');
});

test('a runner’s trade on the map: paper white, their diamond under it; its card with the receipt and their stamp', () => {
  const s = setup(6);
  const r = metRunner(s), loc = dealRunner(s);
  const map = mapMarkup(s, loc.id, 'mine', { side: true });
  assert.match(map, new RegExp(`class="mnode site site-runner f-target[^"]*" data-select="${loc.id}"`));
  assert.match(map, /class="rdiamond"/);
  assert.match(map, new RegExp(`${r.handle}’s trade|${r.handle}'s trade`));
  assert.ok(map.includes(loc.site.receipt.id));
  assert.ok(map.includes(`>${STAMPS[r.faction].verb}<`), 'their stamp');
  assert.match(map, />Help</);
  assert.equal(threatsOf(s).find((x) => x.sel === loc.id).name, `${r.handle}'s trade`);
});
