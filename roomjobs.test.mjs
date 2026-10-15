// Room addresses and room contracts (docs/servers.md 9.9, GAME_RULES.md "Room addresses" and "Mail and contracts"):
// every room has a grid address (C2) from where it sits on its server, stable and unique, on every chip (an unknown
// room's too, never its kind), in its card, ls and map, and `go`/`cd` take it. The room contracts (mail.mjs ROOM_JOBS):
// Install (an item carried to an address and installed there; a disconnect loses it and fails the job, a jack out
// keeps it), Break Encryptors before they Encrypt, Map without resting, Catch an Exfil, and a vault file past the
// Tracker. One waits on the board at a time, outside the five, with no clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, selectEncounter } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { addrsOf, byAddr, sweepRooms } from './dist/address.mjs';
import { roomsFor, rogueGraph, sprawlGraph, farmGraph, addRootSocket, addStash } from './dist/netrooms.mjs';
import { ROGUE } from './dist/rogue.mjs';
import { initMail, roomOffer, ROOM_JOBS, MAIL, offers, openContracts, ready, progress, title, tickMail, rewardLine } from './dist/mail.mjs';
import { roomsMarkup, fpUi, labelOf, pickRoom } from './dist/floorplan-view.mjs';
import { mailMarkup, mapMarkup } from './dist/view.mjs';
import { sizeOf } from './dist/sockets.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
// Win a fight without letting anything land: every part's next move pushed far off (its attack kept, so an Encryptor is still one).
const winClean = (s) => { for (let i = 0; i < 40 && active(s); i++) { for (const p of s.encounter.virus.parts) { Object.assign(p, { armor: 0, integrity: Math.min(p.integrity, 1) }); if (p.attack) p.attack.due = s.encounter.cycle + 50; } const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); } };
const win = (s) => { for (let i = 0; i < 40 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const lose = (s) => { s.run.integrity = 1; for (let i = 0; i < 60 && active(s); i++) { for (const p of s.encounter.virus.parts) if (p.attack) { p.attack.amount = 999; p.attack.effect = 'damage'; } command(s, 'hold'); resolveCycle(s); } };
// A level-12 character with the board open and one traced server (a ransomware one by default).
function setup({ level = 12, family = 'ransomware' } = {}) {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level, xp: 0 } };
  command(s, `developer location ${family}`);
  const loc = s.locations[0]; loc.lockUntil = 0;
  initMail(s, clock); s.mail.boardOpen = true; s.mail.offers = []; s.mail.jobs = s.mail.jobs.filter((j) => j.story === undefined); s.mail.story = 99;
  return { s, loc };
}
const take = (s, kind) => { s.mail.offers = []; const o = roomOffer(s, clock, kind); assert.ok(o, `a ${kind} offer`); command(s, `mail accept ${o.id}`); return openContracts(s).find((c) => c.id === o.id); };
// Stand in a room as if you'd walked there (its fight, if any, beaten through the real verbs).
const reach = (s, id) => {
  const R = s.rooms;
  if (R.at === id) return;
  const nb = FP.neighbours(R.graph, id).find((x) => x !== R.graph.core) || FP.neighbours(R.graph, id)[0];
  R.at = nb; R.screen = null; R.visit.walked[nb] = true; R.seen[nb] = 'kind';
  FP.go(s, id);
  if (R.screen?.kind === 'virus' || R.screen?.kind === 'hunter') FP.act(s, 'engage');
  if (active(s)) win(s); // what held it (or the hunter on you), beaten
};
const said = (ev) => ev.map((e) => e.message).join('\n');

test('addresses: a column letter and a row number from where the room sits, the same every time, unique on every server', () => {
  for (let seed = 1; seed <= 80; seed++) {
    for (const size of ['small', 'medium', 'large']) {
      const g = FP.generate(seed, { size, kind: FP.KIND_IDS[seed % 5], level: 12, floor: 3 });
      const a = addrsOf(g), list = Object.values(a);
      assert.equal(list.length, Object.keys(g.rooms).length);
      assert.equal(new Set(list).size, list.length, `seed ${seed} ${size}: unique`);
      for (const x of list) assert.match(x, /^[A-Z]\d{1,2}$/, 'a letter and a row, short');
      assert.deepEqual(addrsOf(FP.generate(seed, { size, kind: FP.KIND_IDS[seed % 5], level: 12, floor: 3 })), a, 'from the graph: the same every time');
      for (const [id, x] of Object.entries(a)) assert.equal(byAddr(g, x.toLowerCase()), id, 'typed back, any case');
    }
  }
  for (let seed = 1; seed <= 60; seed++) {
    for (const g of [rogueGraph({ seed, level: 10, rogue: { kind: ['nest', 'pit', 'gauntlet'][seed % 3] } })]) { const l = Object.values(addrsOf(g)); assert.equal(new Set(l).size, l.length); }
  }
  for (const g of [sprawlGraph(), farmGraph()]) { const l = Object.values(addrsOf(g)); assert.equal(new Set(l).size, l.length); }
  // Rooms added later (Root 4's socket, Root 2's Stash) never move an address.
  const { s, loc } = setup();
  const R = roomsFor(s, loc), before = { ...addrsOf(R.graph) };
  loc.takenOver = true;
  addStash(loc); addRootSocket(loc);
  const after = addrsOf(R.graph);
  assert.ok(Object.keys(after).length > Object.keys(before).length, 'rooms were added');
  for (const [id, x] of Object.entries(before)) assert.equal(after[id], x, `${id} keeps ${x}`);
  assert.equal(new Set(Object.values(after)).size, Object.keys(after).length);
});

test('addresses show on every chip, an unknown room\'s too (only ? and its address: never its kind), in the card, ls and map; go and cd take them', () => {
  const { s, loc } = setup();
  play(s, 'connect ' + loc.id);
  const R = s.rooms, g = R.graph, A = addrsOf(g);
  const html = roomsMarkup(s);
  const unknown = FP.roomList(s).filter((x) => FP.seenOf(s, x.id) === 'shape');
  assert.ok(unknown.length >= 2);
  for (const x of unknown) {
    const chip = html.match(new RegExp(`<g class="fp-room[^"]*" data-room="${x.id}"[\\s\\S]*?</g>(?=<g class="fp-room|<path class="fp-route|<g class="fp-bits|</svg>)`))[0];
    assert.match(chip, new RegExp(`<g class="fp-addr"><rect[^>]*/><text[^>]*>${A[x.id]}</text></g>`), `${x.id}: its address`);
    assert.match(chip, /k-fog/);
    assert.doesNotMatch(chip, new RegExp(`k-${x.kind}\\b|fp-icon|fp-name|${x.path}`), 'nothing about what it is');
    assert.match(chip, /title="Unknown room[\n"]/, 'its tooltip: still only what you know');
  }
  const here = g.rooms[R.at];
  assert.match(html, new RegExp(`data-room="${here.id}"[\\s\\S]*?class="fp-addr"><rect[^>]*/><text[^>]*>${A[here.id]}<`), 'a known chip too');
  // The card: its title carries the address.
  fpUi.sel = unknown[0].id; fpUi.selAt = `${R.visits}:${R.at}:${R.visit.moves}:${R.stats.fights}`;
  assert.match(roomsMarkup(s), new RegExp(`<span class="fp-at">${A[unknown[0].id]}</span> · unknown</h2><h1>Unknown room</h1>`), 'the card: its address on its kicker');
  fpUi.sel = null;
  // ls and map.
  const ls = said(play(s, 'ls'));
  assert.match(ls, new RegExp(`^${A[here.id]}  Entry  \\[entry\\]`));
  for (const x of FP.exits(s)) assert.match(ls, new RegExp(`\\n\\d+  ${A[x.id]}  \\?  \\[\\?\\]`));
  const map = said(play(s, 'map'));
  for (const x of unknown) assert.match(map, new RegExp(`\\? ${A[x.id]}  \\?`), 'an unknown room: ? and its address');
  // go and cd take an address, any case; one you can't see yet says only that.
  const next = FP.exits(s)[0];
  play(s, `go ${A[next.id].toLowerCase()}`);
  assert.equal(R.at, next.id, 'go c2');
  if (R.screen) play(s, 'back');
  const far = unknown.find((x) => !FP.neighbours(g, R.at).includes(x.id) && x.id !== R.at && x.id !== g.core);
  if (far) { play(s, `cd ${A[far.id]}`); assert.ok(R.at !== g.entry || R.screen, 'cd walks there through the rooms you have seen'); }
  if (R.screen) play(s, 'back');
  const hidden = FP.roomList(s).find((x) => !FP.seenOf(s, x.id));
  if (hidden) assert.match(said(play(s, `cd ${A[hidden.id]}`)), /not on your map yet/);
});

test('Install: the item waits in your stash, goes in your pack on its server, installs only in its room (by address, unknown when taken); jacking out keeps it', () => {
  const { s, loc } = setup();
  const c = take(s, 'install');
  const g = roomsFor(s, loc).graph;
  assert.equal(c.addr, addrsOf(g)[c.room]);
  assert.match(title(s, c), new RegExp(`^Install an? .+ at ${c.addr} on ${loc.name}$`));
  assert.ok(!['entry', 'core', 'stash'].includes(g.rooms[c.room].kind) && sweepRooms(g).includes(c.room), 'a room you can reach');
  assert.equal(FP.known({ rooms: loc.floorplan }, c.room), false, 'its room is one you have never been in');
  assert.match(progress(s, c).text, /In your stash/);
  assert.match(rewardLine(s, c), /credits · \d+ Indemnity · \d+ XP · Halcyon \+7/);
  // On another server, it stays home.
  play(s, 'connect sprawl');
  assert.ok(!s.run.pack.some((f) => f.kind === 'payload'));
  play(s, 'jack out'); clock += 60000;
  play(s, 'connect ' + loc.id);
  assert.ok(s.run.pack.some((f) => f.kind === 'payload' && f.contract === c.id), 'in your pack on its server');
  assert.match(progress(s, c).text, new RegExp(`In your pack. Install it at ${c.addr}`));
  // The map marks its room (drawn as unknown: the mark and the address, not what it is).
  s.rooms.seen[c.room] ||= 'shape';
  assert.match(roomsMarkup(s), new RegExp(`data-room="${c.room}"[\\s\\S]*?class="fp-addr job"><rect[^>]*/><text[^>]*>${c.addr}</text><use href="#fp-i-contract"`), 'its address amber, with the contract mark');
  // Not here: it says where.
  assert.match(said(play(s, 'install')), new RegExp(`goes in ${c.addr}, not here`));
  assert.ok(!ready(s, c));
  // Jack out: it comes home with you, and back in the pack next time.
  play(s, 'jack out'); clock += 60000;
  assert.equal(c.carry, 'stash');
  assert.ok(openContracts(s).includes(c), 'the job keeps');
  play(s, 'connect ' + loc.id);
  assert.ok(s.run.pack.some((f) => f.contract === c.id));
  // In its room: the card's Install button, and `install` does it.
  reach(s, c.room);
  assert.equal(s.rooms.at, c.room);
  assert.match(roomsMarkup(s), /data-rooms="install"[^>]*>Install/);
  const ev = play(s, 'install');
  assert.match(said(ev), new RegExp(`installed at ${c.addr}`));
  assert.ok(ready(s, c));
  assert.ok(!s.run.pack.some((f) => f.kind === 'payload'), 'out of your pack');
  assert.match(said(play(s, 'install')), /nothing here|Clear the socket|No such|build/i, 'nothing more to install');
  const credits = s.server.credits;
  command(s, `mail deliver ${c.id}`);
  assert.ok(c.done && s.server.credits > credits, 'delivered, paid');
});

test('Install: losing your Signal with the item in your pack loses it, and the contract fails (it can come round again)', () => {
  const { s, loc } = setup();
  const c = take(s, 'install');
  play(s, 'connect ' + loc.id);
  const fight = FP.roomList(s).find((x) => x.kind === 'process' && FP.isUp(s, x));
  const R = s.rooms, nb = FP.neighbours(R.graph, fight.id)[0];
  R.at = nb; R.screen = null; FP.go(s, fight.id);
  play(s, 'engage');
  lose(s);
  assert.equal(s.run, null, 'disconnected');
  assert.ok(!openContracts(s).includes(c), 'the job is gone');
  assert.ok(s.logs.some((e) => e.type === 'warning' && /Contract failed: Install .* went down with your Signal/.test(e.message)));
  assert.deepEqual(s.logs.findLast((e) => e.type === 'disconnected').failed, [title(s, c)], 'the Disconnected card lists it');
  s.mail.offers = [];
  assert.equal(roomOffer(s, clock, 'install')?.type, 'install', 'offered again');
});

test('Install and build share the verb: `install <program>` still builds in a socket; `plant` is only ever the item', () => {
  const { s, loc } = setup();
  play(s, 'connect ' + loc.id);
  const R = s.rooms, sock = FP.roomList(s).find((x) => x.kind === 'socket');
  reach(s, sock.id);
  assert.equal(R.at, sock.id);
  assert.match(said(play(s, 'install')), /Harvester|socket/, 'no item: the Build list');
  assert.match(said(play(s, 'plant')), /carry nothing to install/);
});

test('Break Encryptors before they Encrypt: a clean break counts, one after its Encrypt landed does not', () => {
  const { s } = setup();
  const c = take(s, 'defuse');
  assert.equal(title(s, c), 'Break 3 Encryptors before they Encrypt');
  const fightOne = (seed, landFirst) => {
    selectEncounter(s, 'cryptjack', seed, { level: 8 });
    command(s, 'engage');
    const enc = s.encounter.virus.parts.find((p) => p.attack?.effect === 'encrypt');
    if (landFirst) { enc.attack.due = s.encounter.cycle + 1; for (const p of s.encounter.virus.parts) if (p !== enc) p.attack = null; for (let i = 0; i < 3 && !enc.encrypted; i++) { command(s, 'hold'); resolveCycle(s); } assert.ok(enc.encrypted, 'its Encrypt landed'); }
    winClean(s);
  };
  fightOne(11, false);
  assert.equal(c.got, 1);
  fightOne(12, true);
  assert.equal(c.got, 1, 'too late');
  fightOne(13, false); fightOne(14, false);
  assert.ok(ready(s, c));
  assert.match(progress(s, c).text, /3\/3 broken before they Encrypt/);
});

test('Map without resting: one visit, every room but the Core stood in with nothing live, no rest; a rest or a jack out starts it again', () => {
  const { s, loc } = setup({ level: 30 });
  loc.level = 10;
  const c = take(s, 'sweep');
  assert.equal(c.loc, loc.id);
  assert.equal(title(s, c), `Map ${loc.name} without resting`);
  play(s, 'connect ' + loc.id);
  const R = s.rooms, need = sweepRooms(R.graph);
  assert.ok(!need.includes(R.graph.core), 'not the Core');
  const rest = need.find((id) => R.graph.rooms[id].kind === 'rest');
  for (const id of need.slice(0, 3)) reach(s, id);
  assert.match(progress(s, c).text, /\d+\/\d+ rooms this visit, no rest/);
  if (rest) { reach(s, rest); s.run.integrity = Math.floor(s.run.max / 2); play(s, 'rest'); assert.match(progress(s, c).text, /rested this visit/); }
  else R.visit.rested = true;
  for (const id of need) reach(s, id);
  assert.ok(!ready(s, c), 'a rest spoils the visit');
  play(s, 'jack out'); clock += 60000;
  play(s, 'connect ' + loc.id);
  assert.match(progress(s, c).text, new RegExp(`1/${need.length} rooms this visit`), 'a new visit starts again');
  for (const id of need) { if (s.run) { s.run.integrity = s.run.max; reach(s, id); } }
  assert.ok(ready(s, c), 'every room, no rest');
  assert.ok(c.reward.drop, 'it pays a protocol');
});

test('Catch an Exfil: an Exfil\'s archive recovered on any rogue server', () => {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level: 12, xp: 0 } };
  initMail(s, clock); s.mail.boardOpen = true; s.mail.offers = []; s.mail.jobs = []; s.mail.story = 99;
  assert.equal(roomOffer(s, clock, 'exfil'), null, 'no rogue server, no offer');
  let loc = null;
  for (let i = 0; i < 60 && !loc; i++) { (s.net ||= {}).rogueDry = ROGUE.pity; command(s, 'developer location worm'); const l = s.locations.at(-1); if (l.rogue && !l.farm && !l.lair) loc = l; }
  loc.lockUntil = 0;
  const c = take(s, 'exfil');
  assert.equal(title(s, c), 'Catch an Exfil');
  play(s, 'connect ' + loc.id);
  for (const sp of Object.values(loc.spawns)) Object.assign(sp, { alive: false, respawnAt: null });
  const R = s.rooms, far = FP.neighbours(R.graph, R.at)[0];
  R.visit.exfil = { at: far, seed: 4242, name: 'EXFIL-4242', state: 'loose', seen: true, cornered: true };
  assert.ok(!ready(s, c));
  FP.go(s, far); // walk into its room: caught
  assert.ok(active(s) && s.encounter.rooms.as === 'exfil', 'the Exfil fight');
  win(s);
  assert.equal(R.visit.exfil.state, 'down');
  assert.ok(ready(s, c), 'archive recovered');
});

test('A vault file past the Tracker: banked from a visit it never reached you; if it did, the file goes back to the vault', () => {
  const { s } = setup();
  const loc = s.locations[0];
  // A medium Mirror on layer 2: a Tracker sleeps in its den.
  for (let seed = 1; seed < 200; seed++) { loc.seed = seed; if (sizeOf(loc).id !== 'small') break; }
  Object.assign(loc, { template: 'mirror', depth: 2, floorplan: null });
  const g = roomsFor(s, loc).graph;
  assert.equal(g.hunter, 'track');
  const c = take(s, 'heist');
  assert.equal(c.loc, loc.id);
  assert.match(title(s, c), new RegExp(`^Recover ${c.file.replace('.', '\\.')} past the Tracker$`));
  play(s, 'connect ' + loc.id);
  const R = s.rooms, vault = g.vaults[0];
  R.visit.keys.push(vault);
  reach(s, vault);
  play(s, 'open');
  if (!s.run.pack.some((f) => f.name === c.file)) play(s, 'pull');
  assert.ok(s.run.pack.some((f) => f.kind === 'contract' && f.name === c.file), 'in your pack');
  // The Tracker reached you: flagged, back in the vault.
  R.visit.caught = true;
  assert.match(progress(s, c).text, /Tracker reached you/);
  play(s, 'jack out'); clock += 60000;
  assert.ok(!ready(s, c));
  assert.ok(s.logs.some((e) => /flagged\. It goes back to the vault/.test(e.message || '')));
  // Again, unseen.
  play(s, 'connect ' + loc.id);
  reach(s, vault);
  play(s, 'pull');
  assert.ok(s.run.pack.some((f) => f.name === c.file), 'back in the vault for another try');
  assert.equal(!!s.rooms.visit.caught, false);
  play(s, 'jack out');
  assert.ok(ready(s, c), 'banked unseen');
  command(s, `mail deliver ${c.id}`);
  assert.ok(c.done);
});

test('the board: one room contract waits at a time, outside the five, with no clock; each from its level; a stale one leaves', () => {
  const { s, loc } = setup({ level: 3 });
  assert.equal(roomOffer(s, clock), null, 'none below level 4');
  s.hackers = { [s.loadout.archetype]: { level: 4, xp: 0 } };
  for (let i = 0; i < 20; i++) { s.mail.offers = []; const o = roomOffer(s, clock); assert.equal(o?.type, 'defuse', 'at 4: only the Encryptors'); }
  s.hackers = { [s.loadout.archetype]: { level: 12, xp: 0 } };
  const kinds = new Set();
  for (let i = 0; i < 60; i++) { s.mail.offers = []; kinds.add(roomOffer(s, clock)?.type); }
  assert.ok(kinds.has('install') && kinds.has('sweep') && kinds.has('defuse'));
  assert.ok(!kinds.has('heist') && !kinds.has('exfil'), 'no Tracker server, no rogue server: not offered');
  // On the board: it arrives on its own, waits past any offer's life, never counts toward the five, and there's one.
  s.mail.offers = []; s.mail.nextRoomAt = null; s.mail.nextOfferAt = null;
  let t = clock;
  for (; t < clock + 30 * 60000 && !offers(s).some((o) => o.waits); t += 30000) tickMail(s, t);
  const w = offers(s).find((o) => o.waits);
  assert.ok(w, 'a room contract arrived');
  for (let k = 0; k < 6; k++) { t += 20 * 60000; tickMail(s, t); }
  assert.ok(offers(s).includes(w), 'still there an hour and more later');
  assert.equal(offers(s).filter((o) => o.waits).length, 1, 'one at a time');
  assert.ok(offers(s).filter((o) => !o.waits && o.type !== 'side').length <= MAIL.offers);
  assert.doesNotMatch(mailMarkup(s, 'j' + w.id), new RegExp(`${w.subject}[\\s\\S]{0,400}expires in`), 'no clock on it');
  // Its server gone: it leaves the board.
  if (w.loc) { s.locations = s.locations.filter((l) => l.id !== w.loc); tickMail(s, t + 1000); assert.ok(!offers(s).includes(w), 'stale: gone'); }
  assert.ok(Object.keys(ROOM_JOBS).every((k) => ROOM_JOBS[k].from >= 4));
});

test('room contracts and addresses keep through a save: the job, its item in your pack, the visit\'s tally, every address', () => {
  const { s, loc } = setup();
  const c = take(s, 'install');
  take(s, 'defuse');
  play(s, 'connect ' + loc.id);
  const before = { ...addrsOf(loc.floorplan.graph) };
  const back = restore(JSON.parse(JSON.stringify(s)));
  const L = back.locations.find((l) => l.id === loc.id), j = back.mail.jobs.find((x) => x.id === c.id);
  assert.deepEqual(addrsOf(L.floorplan.graph), before);
  assert.equal(j.addr, c.addr); assert.equal(j.room, c.room); assert.equal(j.carry, 'pack');
  assert.ok(back.run.pack.some((f) => f.kind === 'payload' && f.contract === c.id));
  assert.ok(back.mail.jobs.some((x) => x.type === 'defuse'));
  assert.match(mapMarkup(back, L.id, 'net'), new RegExp(`Install an? [^<]* at ${c.addr}`), 'the server card lists it');
  assert.match(mapMarkup(back, L.id, 'net'), /In your pack/, 'with its progress');
});

test('contract marks: the rooms you know whose live virus a kill, strain or bounty job would count, an Encryptor for a defuse job, the Core for a takeover', () => {
  const { s, loc } = setup();
  play(s, 'connect ' + loc.id);
  const R = s.rooms, g = R.graph;
  for (const id of Object.keys(g.rooms)) R.seen[id] = 'kind';
  const marked = (html) => new Set([...html.matchAll(/<g class="fp-room[^"]*" data-room="([^"]+)"[\s\S]*?(?=<g class="fp-room|$)/g)].filter((m) => /class="fp-addr job"/.test(m[0])).map((m) => m[1]));
  assert.equal(marked(roomsMarkup(s)).size, 0, 'no job, no mark');
  const fights = FP.roomList(s).filter((r) => ['process', 'elite'].includes(r.kind) && !r.mirror && FP.isUp(s, r));
  assert.ok(fights.length >= 2, 'live viruses to mark');
  // A kill job for this server's family: every live one of it, and nothing else.
  s.mail.jobs.push({ id: 'k1', type: 'kill', family: 'ransomware', count: 3, got: 0, level: 12, reward: { credits: 1 } });
  const want = fights.filter((r) => FP.virusOf(s, r).family === 'ransomware').map((r) => r.id);
  assert.ok(want.length, 'a ransomware room');
  let m = marked(roomsMarkup(s));
  for (const id of want) assert.ok(m.has(id), `${id} is marked`);
  assert.ok(!m.has(g.entry), 'not the entry');
  const tip = roomsMarkup(s).match(new RegExp(`data-room="${want[0]}"[^>]*title="([^"]*)"`))[1];
  assert.match(tip, /Contract: Kill 3 Ransomware viruses, Lv 8\+\./, 'its tooltip names the job');
  // Done: the marks go.
  s.mail.jobs.at(-1).got = 3;
  assert.equal(marked(roomsMarkup(s)).size, 0, 'a finished count marks nothing');
  // A room you don't know isn't marked: its virus is fog.
  s.mail.jobs.at(-1).got = 0;
  R.seen[want[0]] = 'shape';
  assert.ok(!marked(roomsMarkup(s)).has(want[0]), 'fog stays fog');
  R.seen[want[0]] = 'kind';
  s.mail.jobs.pop();
  // A defuse job: the rooms with an Encryptor in them.
  take(s, 'defuse');
  const enc = fights.filter((r) => FP.virusOf(s, r).parts.some((p) => p.attack?.effect === 'encrypt')).map((r) => r.id);
  m = marked(roomsMarkup(s));
  assert.deepEqual([...m].filter((id) => fights.some((r) => r.id === id)).sort(), enc.sort());
  s.mail.jobs = s.mail.jobs.filter((c) => c.type !== 'defuse');
  // A takeover: the Core, while it isn't yours.
  s.mail.jobs.push({ id: 't1', type: 'takeover', loc: loc.id, reward: { credits: 1 } });
  assert.ok(marked(roomsMarkup(s)).has(g.core), 'the Core');
  loc.takenOver = true;
  assert.ok(!marked(roomsMarkup(s)).has(g.core), 'not once it is yours');
});

test('a fight room is named by the virus in it: on its plate (its stem and tag alone), its card and its tooltip; cleared, by its kind again', () => {
  const { s, loc } = setup();
  play(s, 'connect ' + loc.id);
  const R = s.rooms;
  for (const id of Object.keys(R.graph.rooms)) R.seen[id] = 'kind';
  const room = FP.roomList(s).find((r) => r.kind === 'process' && !r.mirror && FP.isUp(s, r));
  const elite = FP.roomList(s).find((r) => r.kind === 'elite' && !r.mirror && FP.isUp(s, r));
  const name = FP.virusName(s, room);
  assert.match(name, /^[A-Z][A-Z -]*-\d{4}$/, 'a virus name, not Process');
  assert.equal(labelOf(s, room), name);
  const chip = (html, id) => html.match(new RegExp(`data-room="${id}"[\\s\\S]*?(?=<g class="fp-room|$)`))[0];
  let html = roomsMarkup(s);
  assert.match(chip(html, room.id), new RegExp(`class="fp-name"[^>]*>${name.match(/\S+-\d{4}$/)[0]}</text>`), 'the plate: its stem and tag');
  assert.match(chip(html, room.id), new RegExp(`title="${name}: `));
  if (elite) {
    const en = FP.virusName(s, elite);
    assert.match(en, /^ELITE /);
    assert.match(chip(html, elite.id), new RegExp(`class="fp-name"[^>]*>${en.match(/\S+-\d{4}$/)[0]}</text>`), 'the elite chip says Elite already');
  }
  const ui = { sel: null, selAt: null, closed: null };
  pickRoom(s, room.id, ui);
  assert.match(roomsMarkup(s, ui).match(/<div class="map-pop fp-pop"[\s\S]*$/)[0], new RegExp(`<h1>${name}</h1>`), 'its card');
  // Beaten: no virus in it, so its kind names it.
  reach(s, room.id);
  assert.ok(!FP.isUp(s, room));
  assert.equal(labelOf(s, room), room.path);
  assert.match(chip(roomsMarkup(s), room.id), new RegExp(`class="fp-name"[^>]*>${room.path.toUpperCase()}</text>`));
});
