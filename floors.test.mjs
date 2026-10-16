// Floors (docs/servers.md 5, R3; floors.mjs): eight floors and their bands, each floor's diagram from the network's seed
// (servers, links, the entry, exits, hubs, a lair), exits down and back up, tracing along a floor's links, invasions by
// floor, and an older save's layers moved onto floors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION, addLocation, hackerOf, addLead } from './dist/combat.mjs';
import { CONFIG, FLOORS, SERVER, bandOf, floorFor, layerOf, gradeFor } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsFor } from './dist/netrooms.mjs';
import { floorGraph, floorsOf, graphOf, neighbours, locAt, hiddenAt, hiddenNear, exitOpen, canDescend, descend, floorFit, FLOOR, waypointOf, waypoints } from './dist/floors.mjs';
import { hiddenNodes, hiddenLead, HIDDEN, pickOrigin, connectedTo } from './dist/hidden.mjs';
import { tickNetwork, travelMs } from './dist/invasion.mjs';
import { mapLayout, mapMarkup } from './dist/view.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const mk = (level = 1, netSeed = 977) => { const s = fresh(); s.tutorialCompleted = true; s.netSeed = netSeed; hackerOf(s).level = level; return s; };
const adj = (g, id) => g.links.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0]));
const servers = (g) => Object.values(g.nodes).filter((x) => x.kind === 'server' || x.kind === 'lair');
const win = (s) => { for (let i = 0; i < 30 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };

test('eight floors, each a band of about six levels, The Sprawl to Bedrock, level 50 the cap', () => {
  assert.equal(FLOORS.length, 8);
  assert.deepEqual(FLOORS.map((f) => f.band), [[1, 8], [7, 14], [13, 20], [19, 26], [25, 32], [31, 38], [37, 44], [43, 50]]);
  assert.deepEqual(FLOORS.map((f) => f.name), ['The Sprawl', 'Backhaul', 'The Stacks', 'Coldline', 'Deep Core', 'Kernel Space', 'The Sink', 'Bedrock']);
  for (let n = 2; n <= 8; n++) assert.equal(bandOf(n)[0] - bandOf(n - 1)[0], 6, 'each floor starts six levels under the last');
  assert.equal(bandOf(8)[1], SERVER.maxLevel);
  assert.deepEqual([1, 6, 7, 13, 19, 25, 31, 37, 43, 50].map(floorFor), [1, 1, 2, 3, 4, 5, 6, 7, 8, 8], 'your floor: the deepest band your level has reached');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => SERVER.locationLevel(n, 0)), FLOORS.map((f) => f.band[0]), 'the near side at the band\'s floor');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => SERVER.locationLevel(n, 1)), FLOORS.map((f) => f.band[1]), 'the far side at its top');
  assert.equal(SERVER.keepUp(30, 2), 14, 'what keeps up with you tops out at its floor\'s band');
  assert.deepEqual([1, 2, 3, 4, 8].map(gradeFor), [1, 2, 2, 3, 3], 'deeper floors send bigger grades');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(layerOf), [1, 2, 3, 3, 4, 4, 5, 5], 'content\'s old layers read by the band\'s middle');
});

test('the generator: the same seed draws the same floors; each its shape, its servers, linked, levels rising to the exit, exits, hubs and a lair', () => {
  for (const seed of [1, 977, 31337]) {
    for (let n = 1; n <= 8; n++) {
      const g = floorGraph(seed, n), F = FLOORS[n - 1];
      assert.deepEqual(JSON.parse(JSON.stringify(g)), JSON.parse(JSON.stringify(floorGraph(seed, n))), 'deterministic');
      const sv = servers(g);
      assert.equal(sv.length, F.servers, `floor ${n}: ${F.servers} servers`);
      assert.equal(g.exits.length, F.exits, `floor ${n}: its exits`);
      // Everything hangs together, from the entry.
      const seen = new Set([g.entry]), q = [g.entry];
      while (q.length) for (const y of adj(g, q.shift())) if (!seen.has(y)) { seen.add(y); q.push(y); }
      assert.equal(seen.size, Object.keys(g.nodes).length, `floor ${n}: connected`);
      // Levels inside the band, rising with the distance from the entry; the entry's neighbours at its floor, the exits' at its top.
      for (const x of sv) assert.ok(x.level >= F.band[0] && x.level <= F.band[1], `floor ${n}: ${x.id} lv ${x.level}`);
      assert.ok(adj(g, g.entry).some((id) => g.nodes[id].level === F.band[0]), 'the near side at the band\'s floor');
      for (const ex of g.exits) assert.ok(adj(g, ex).some((id) => g.nodes[id].level >= F.band[1] - 1), 'the exit\'s neighbours near its top');
      const byD = sv.reduce((m, x) => ((m[x.d] ||= []).push(x.level), m), {});
      const avg = Object.keys(byD).map(Number).sort((a, b) => a - b).map((d) => byD[d].reduce((a, b) => a + b, 0) / byD[d].length);
      assert.ok(avg[0] < avg.at(-1), `floor ${n}: levels rise away from the entry`);
      // The main road to an exit is never a rogue server or the lair; the lair from floor 2.
      assert.equal(!!g.lair, n >= 2, `floor ${n}: a lair from floor 2`);
      if (g.lair) assert.ok(!g.nodes[g.lair].main, 'the lair is off the main road');
      assert.equal(g.nodes[g.entry].zone, n === 1, 'floor 1\'s entry is SPRAWL-00');
      assert.deepEqual(Object.keys(g.hubs).sort(), Object.entries(FLOOR.hubs).filter(([, f]) => f === n).map(([h]) => h).sort(), `floor ${n}: its hubs`);
      assert.equal(!!g.farm, n === 1, 'KESSLER-FARM-00 hangs off floor 1');
    }
  }
  assert.notDeepEqual(floorGraph(1, 2).nodes, floorGraph(2, 2).nodes, 'another network, another floor');
});

test('tracing along a floor\'s links: SPRAWL-00\'s ? servers from the start, its strays trace them, a first clear on a server traces the ones linked to it, Mapped the rest', () => {
  const s = mk(1);
  const g = graphOf(s, 1);
  const first = hiddenNear(s, { id: CONFIG.zone.id });
  assert.deepEqual(first.map((h) => h.slot).sort(), adj(g, g.entry).sort(), 'SPRAWL-00\'s neighbours show as ? from the start');
  assert.ok(first.every((h) => h.level === g.nodes[h.slot].level && h.depth === 1));
  assert.equal(s.locations.length, 0);
  // Strays: a kill traces one ? (the most traced), CONFIG.leadBase a kill.
  for (let i = 0; i < 4; i++) addLead(s, 'worm', CONFIG.leadBase, '', { id: CONFIG.zone.id });
  assert.equal(s.locations.length, 1, 'four strays: one server, at its slot');
  const loc = s.locations[0];
  assert.ok(adj(g, g.entry).includes(loc.slot) && loc.depth === 1 && loc.level === g.nodes[loc.slot].level, 'its level is its slot\'s');
  assert.ok(!hiddenAt(s, loc.slot), 'no longer a ?');
  for (const id of adj(g, loc.slot)) if (g.nodes[id].kind === 'server') assert.ok(hiddenAt(s, id) || locAt(s, id), 'its neighbours show as ?');
  // A first clear on it traces every ? linked to it (through the entry too: a junction).
  const near = hiddenNear(s, loc), before = near.map((h) => h.lead);
  loc.lockUntil = 0;
  play(s, `connect ${loc.id}`);
  const R = s.rooms, room = Object.values(R.graph.rooms).find((r) => r.kind === 'process' && FP.neighbours(R.graph, r.id).includes(R.graph.entry));
  FP.go(s, room.id);
  if (s.rooms.screen?.kind === 'virus') FP.act(s, 'engage');
  win(s);
  assert.ok(R.cleared[room.id], 'cleared');
  near.forEach((h, i) => assert.ok(!hiddenNodes(s).includes(h) || h.lead >= Math.min(100, before[i] + HIDDEN.firstClear), `+${HIDDEN.firstClear}% on ${h.slot}`));
  // Mapped: every ? linked to it, the rest of the way.
  play(s, 'jack out');
  const ids = hiddenNear(s, loc).map((h) => h.slot);
  s.rooms = R; FP.WORLD.mapped?.(s);
  s.rooms = null;
  for (const id of ids) assert.ok(locAt(s, id), `${id} located by Mapped`);
});

test('exits: lit from the start, taken once a server they hang off is located; the floor below opens at its landing server; back up is always open', () => {
  const s = mk(9);
  const g = graphOf(s, 1), ex = g.exits[0];
  const layout = mapLayout(s, 1);
  assert.ok(layout.nodes.some((n) => n.kind === 'exit' && n.id === ex && !n.open), 'the exit shows on the map before anything near it is found');
  assert.match(mapMarkup(s, ex), /Floor 2/);
  assert.match(mapMarkup(s, ex), /con-(red|orange|yellow|green|gray)">Lv 7<\/b>/, 'its card: the band below, coloured against your level');
  assert.equal(canDescend(s), false);
  assert.match(command(s, 'descend').map((e) => e.message).join(' '), /No way down yet/);
  const host = adj(g, ex)[0];
  addLocation(s, g.nodes[host].family, 1, null, host);
  assert.ok(exitOpen(s, ex) && canDescend(s), 'a server it hangs off, located: the way down is open');
  const ev = command(s, 'descend');
  assert.ok(ev.some((e) => e.type === 'floor' && e.floor === 2 && /FLOOR 2 · BACKHAUL · lv 7–14/.test(e.message)));
  assert.equal(floorsOf(s).reached, 2);
  const g2 = graphOf(s, 2), land = s.locations.find((l) => l.depth === 2);
  assert.ok(land && adj(g2, g2.entry).includes(land.slot), 'its landing server, beside the entry');
  assert.equal(land.level, 7, 'at the band\'s floor');
  assert.ok(!land.rogue, 'never a rogue server');
  assert.ok(hiddenNodes(s).some((h) => h.depth === 2), 'floor 2\'s ?s');
  // Back up, and down again: the floor panel, free.
  command(s, 'floor 1');
  assert.equal(floorsOf(s).at, 1);
  command(s, 'floor 2');
  assert.equal(floorsOf(s).at, 2);
  assert.match(command(s, 'floor 3').map((e) => e.message).join(' '), /isn't open to you yet/);
  assert.equal(mapLayout(s, 2).nodes.find((n) => n.kind === 'entry')?.floor, 2, 'floor 2\'s ▲ up-link');
  assert.match(mapMarkup(s, 'server', 'mine', { floor: 2 }), /class="fl-btn open on"[^>]*data-floor="2"/, 'the floor panel marks the floor on the map');
  assert.match(mapMarkup(s, 'server', 'mine', { floor: 2 }), /fl-btn next[^>]*disabled[^>]*><b class="fl-n">3<\/b><span class="fl-name">\?\?\?<\/span>/, 'the next floor dim, ??? until reached');
  // A tall screen draws the floor on its side: the same links, the way down below the entry.
  const wide = mapLayout(s, 1), tall = mapLayout(s, 1, true), at = (L, id) => L.nodes.find((n) => n.id === id);
  const floorLinks = (L) => L.links.filter((k) => k.from !== 'server').length; // (and home's line down to the entry)
  assert.equal(floorLinks(tall), floorLinks(wide));
  assert.ok(at(tall, ex).y > at(tall, CONFIG.zone.id).y && at(tall, 'server').y < at(tall, CONFIG.zone.id).y, 'home on top, SPRAWL-00, then the exit');
  // Bedrock has no way down.
  s.floors.reached = 8;
  assert.match(command(s, 'descend').map((e) => e.message).join(' '), /Bedrock\. Nothing below/);
});

test('waypoints: every floor you have reached is one, its landing server where you start it again; earned, never bought; only reached floors offered', () => {
  const s = mk(14);
  assert.deepEqual(waypoints(s), [1]);
  assert.equal(waypointOf(s, 1).id, CONFIG.zone.id, 'floor 1 starts at SPRAWL-00');
  assert.equal(waypointOf(s, 2), null, 'not before you get there');
  const g = graphOf(s, 1), host = adj(g, g.exits[0])[0];
  addLocation(s, g.nodes[host].family, 1, null, host);
  const credits = s.server.credits;
  const land = descend(s);
  assert.deepEqual(waypoints(s), [1, 2]);
  assert.equal(waypointOf(s, 2), land, 'the landing server is floor 2\'s waypoint');
  assert.equal(floorsOf(s).land[2], land.id);
  assert.equal(s.server.credits, credits, 'free');
  // Back up to floor 1 and the waypoint stays: the floor panel takes you down again, its ▲ card starts you there.
  command(s, 'floor 1');
  assert.match(command(s, 'floor 2').map((e) => e.message).join(' '), new RegExp(`Waypoint: ${land.name}`));
  assert.match(command(s, 'floors').map((e) => e.message).join(' '), new RegExp(`2  Backhaul .*◇ ${land.name}`));
  const up = mapLayout(s, 2).nodes.find((n) => n.kind === 'entry');
  const card = mapMarkup(s, up.id, 'mine', { floor: 2 });
  assert.match(card, new RegExp(`Waypoint</span><b class="fl-v">${land.name}</b>`));
  assert.match(card, new RegExp(`data-command="connect ${land.id}"[^>]*>Start here`));
  assert.match(mapMarkup(s, 'server', 'mine', { floor: 1 }), /fl-btn next[^>]*disabled[^>]*><b class="fl-n">3</, 'floor 3 is not offered');
  land.lockUntil = 0;
  play(s, `connect ${land.id}`);
  assert.equal(s.run?.loc, land.id, 'start there: connected to floor 2 from home');
});

test('hubs, lairs and the farm stand on their floors', () => {
  const s = mk(10);
  for (const [f, n] of Object.entries(FLOOR.hubs)) assert.ok(graphOf(s, n).hubs[f], `${f}'s hub on floor ${n}`);
  const g = graphOf(s, 2);
  const lair = addLocation(s, 'worm', 2, null, g.lair);
  assert.ok(lair.lair && lair.rogue?.kind === 'lair' && lair.depth === 2 && lair.slot === g.lair, 'a lair slot holds the network\'s lair');
  assert.equal(lair.level, g.nodes[g.lair].level, 'at its slot\'s level');
  assert.ok(lair.name.endsWith('-02'));
  const l3 = addLocation(s, 'worm', 3, null, graphOf(s, 3).lair);
  assert.ok(l3.lair && l3.id !== lair.id, 'one a floor');
  s.mail.boardOpen = true;
  assert.ok(mapLayout(s, 1).nodes.some((n) => n.kind === 'hub' && n.hub.faction === 'halcyon'), 'Halcyon\'s hub on floor 1, there from the start');
  s.floors.reached = 3;
  assert.ok(!mapLayout(s, 2).nodes.some((n) => n.kind === 'hub'), 'the others until found');
});

test('invasions by floor: only from servers you have connected to, at their level; 2 minutes on the road, a minute more a floor down; deeper floors send bigger grades', () => {
  const s = mk(20);
  assert.deepEqual([1, 2, 3, 5, 8].map((n) => travelMs(s, n) / 60000), [2, 3, 4, 6, 9]);
  const loc = addLocation(s, 'worm', 3, null, graphOf(s, 3).order[3]);
  s.clock = 0; tickNetwork(s, 0);
  assert.equal(connectedTo(loc), false);
  assert.deepEqual(pickOrigin(s), {}, 'a server you have only found sends nothing');
  for (let t = 0; t < 40; t++) { s.clock += 5000; tickNetwork(s, s.clock); }
  assert.equal(s.invasion, null);
  loc.runs = 1;
  assert.ok(connectedTo(loc));
  s.net.next = 0;
  for (let t = 0; t < 4 && !s.invasion; t++) { s.clock += 5000; tickNetwork(s, s.clock); }
  const inv = s.invasion;
  assert.ok(inv, 'connected: it sends them');
  assert.equal(inv.kind, 'raider', 'the first one is plain');
  assert.equal(inv.level, loc.level, 'at its level');
  assert.equal(inv.total, 4 * 60000, 'from floor 3: 4 minutes on the road');
  assert.equal(inv.grade, gradeFor(3), 'floor 3 sends v2s');
});

test('migration (v41): an older save\'s layers become floors, every server kept with its level, its rooms, its programs and its hold; unknown servers and leads carried', () => {
  const s = mk(24);
  s.version = 40;
  delete s.floors;
  s.hidden = [];
  const mkLoc = (family, layer, level, more = {}) => { const l = addLocation(s, family, 1); delete l.slot; Object.assign(l, { depth: layer, level, ...more }); return l; };
  s.locations = [];
  const a = mkLoc('worm', 1, 5, { takenOver: true, runs: 4 });
  const b = mkLoc('ransomware', 2, 12, { runs: 2 });
  const c = mkLoc('ghostroot', 3, 21, { runs: 1 });
  const d = mkLoc('worm', 2, 7, {});
  roomsFor(s, a); roomsFor(s, b);
  const sock = Object.values(a.floorplan.graph.rooms).find((r) => r.kind === 'socket');
  a.floorplan.programs = { [sock.id]: 'harvester' };
  const cleared = Object.keys(b.floorplan.cleared).length;
  s.hidden = [{ id: 'h77', family: 'worm', via: b.id, depth: 3, level: 18, lead: 60, pinged: true, signal: 3 }];
  s.leadProgress = { ransomware: 40, worm: 0, ghostroot: 0 };
  s.mail.jobs.push({ id: 991, type: 'item', hidden: 'h77', got: 0, reward: { credits: 1 } });
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  const A = t.locations.find((l) => l.id === a.id), B = t.locations.find((l) => l.id === b.id), Cc = t.locations.find((l) => l.id === c.id), D = t.locations.find((l) => l.id === d.id);
  assert.deepEqual([A, B, Cc, D].map((l) => l.level), [5, 12, 21, 7], 'every level kept');
  assert.deepEqual([A, B, Cc, D].map((l) => l.depth), [1, 2, 4, 2], 'each on the floor whose band holds its level (of two, nearer its old layer\'s)');
  for (const l of [A, B, Cc, D]) { assert.ok(l.slot && graphOf(t, l.depth).nodes[l.slot], `${l.name} on a slot`); assert.equal(locAt(t, l.slot), l); }
  assert.equal(new Set([A, B, Cc, D].map((l) => l.slot)).size, 4, 'one server a slot');
  assert.ok(A.takenOver && A.floorplan.programs[sock.id] === 'harvester', 'held, its program running');
  assert.equal(Object.keys(B.floorplan.cleared).length, cleared, 'its rooms as they were');
  assert.equal(t.floors.reached, 4, 'the deepest floor you have a server on is reached');
  for (const n of [2, 3, 4]) { const w = waypointOf(t, n); assert.ok(w && w.depth === n && neighbours(t, graphOf(t, n).entry).includes(w.slot), `floor ${n}: a waypoint beside its entry`); }
  const h = t.hidden.find((x) => x.id === 'h77');
  assert.ok(h && h.slot && h.lead === 60 && h.pinged && neighbours(t, B.slot).includes(h.slot), 'an unknown server keeps its trace, beside the server it hung off');
  assert.ok(t.mail.jobs.some((j) => j.hidden === 'h77'), 'its contract still points at it');
  assert.equal(t.leadProgress.ransomware, 0, 'a family lead became trace');
  assert.ok(t.hidden.some((x) => x.lead >= 40 && x.id !== 'h77'));
  assert.ok(t.mail.list.some((m) => /The net goes down now/.test(m.subject)), 'wick says so');
  assert.equal(floorFit(9, 1), 2, 'level 9 only fits floor 2');
  assert.equal(floorFit(7, 1), 1, 'level 7 from layer 1 stays on floor 1');
  assert.equal(floorFit(7, 2), 2, 'from layer 2, floor 2');
  // Loading it again changes nothing.
  const u = restore(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(u.locations.map((l) => [l.id, l.slot, l.depth, l.level]), t.locations.map((l) => [l.id, l.slot, l.depth, l.level]));
});
