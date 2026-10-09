// The world, first slice (docs/world.md W0: world.mjs, room.mjs, room-view.mjs, content/room.mjs): LOWLIGHT's back
// room after every breach (wick's line by priority, a lead, the board's news), the world turn with dig in and its
// pressure rules, dead drops from leads, and the campaign save's v3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, command, hackerLevel, gainXp } from './dist/combat.mjs';
import { seeded } from './dist/gear.mjs';
import { xpToNext } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import { nodeList, act, breachHooks, fight, generateMap, DIG } from './dist/breach.mjs';
import { CAMPAIGN, SERVERS, SERVER, FRAGMENTS, newCampaign, migrate, launch, leave, recOf, statusOf, held, cardFor } from './dist/campaign.mjs';
import { WORLD, worldTurn, modsFor, openServers, cleanRuleHolds, pressured, digGene, distance } from './dist/world.mjs';
import { ROOM, debriefOf, factsOf, pickLine, freshRoom, roomSentence } from './dist/room.mjs';
import { campaignMarkup, campUi } from './dist/campaign-view.mjs';
import { roomMarkup } from './dist/room-view.mjs';
import { breachMarkup } from './dist/breach-view.mjs';

function camp(cls = 'breaker', seed = 7) {
  const s = fresh();
  s.rng = seed * 99991;
  s.profile = { handle: 'tester', pwLen: 6, since: 0 };
  command(s, `archetype ${cls}`);
  newCampaign(s, { seed });
  return s;
}
const toLevel = (s, n) => { while (hackerLevel(s) < n) gainXp(s, xpToNext(hackerLevel(s)), 'test'); };
// A breach played to its end without its fights: the result, the rewrites a capture keeps (every subsystem, unless
// stock), where a loss stood, and the run's stats. Returns the breach (its report holds the room's visit).
function finish(s, id, result, { stock = 0, stats = {}, at = null } = {}) {
  const rec = recOf(s, id), b = launch(s, id, { from: rec.checkpoint && !rec.captured ? 'checkpoint' : 'start' });
  if (!b) return null;
  b.result = result;
  b.stats = { rests: 1, landed: 0, elites: 0, skips: 0, low: 1, ...stats };
  b.mods = ['pry-bar', 'overcommit', 'x']; b.cves = [];
  if (result === 'won') b.rewrites = Object.fromEntries(SERVER[id].subsystems.flat().slice(stock).map((sub) => [sub, { id: 'slushfund', tier: 1 }]));
  if (at) b.at = at; else if (result !== 'won') b.at = nodeList(b.map).find((n) => n.act === 0 && n.row === 0).id;
  breachHooks.over(s, result);
  leave(s);
  return b;
}
const snapshot = (s) => JSON.parse(JSON.stringify({ world: s.camp.world, room: s.camp.room }));

// ---------- the world turn ----------
test('the world waits for your second capture, then the author you hit digs in on its nearest open server', () => {
  const s = camp();
  finish(s, 'sprawl-00', 'won');
  assert.equal(s.camp.world.turn, 0, 'SPRAWL-00, the tutorial: no turn');
  assert.deepEqual(s.camp.world.moves, {});
  toLevel(s, 4);
  const b = finish(s, 'coldstore-3', 'won');
  assert.equal(s.camp.world.turn, 1);
  assert.deepEqual(s.camp.world.moves['depot-7'], { kind: 'digin', author: 'tollgate', gene: 'ward', turn: 1 }, "TOLLGATE's nearest open server, the just-opened depot");
  assert.ok(b.report.visit.news.some((n) => n.text === 'TOLLGATE dug in at REPO-DEPOT-7. Every elite and gate carries Ward.' && n.at === 'depot-7'));
  assert.ok(b.report.visit.lead, "the first turn always brings wick's lead");
  assert.match(b.report.visit.lead.text, /^the others noticed you\./);
  assert.equal(distance('coldstore-3', 'depot-7'), 1);
  // Its gene: a signature part for the server's body, open at its level.
  assert.equal(digGene('tollgate', SERVER['depot-7']), 'ward');
  assert.equal(digGene('tollgate', SERVER['tripmine-yard'], () => 0.99), 'mutexlock');
  assert.equal(digGene('swarmline', SERVER['pier-5']), 'twin');
  assert.equal(digGene('nullchoir', SERVER['mirror-12']), 'mimic');
  for (const srv of SERVERS) { const g = digGene(srv.author, srv); if (g) assert.ok(GENES[g].parts?.[srv.family] || GENES[g].mutation, `${srv.id}: ${g}`); }
});

test('the world turn is deterministic per seed: the same choices make the same world, and saving changes nothing', () => {
  const play = (seed) => {
    const s = camp('operator', seed), rr = seeded(seed * 31);
    for (let i = 0; i < 40; i++) {
      const open = SERVERS.filter((x) => ['open', 'held'].includes(statusOf(s, x.id)));
      const x = open[Math.floor(rr() * open.length)];
      toLevel(s, Math.min(25, x.level));
      finish(s, x.id, rr() < 0.65 ? 'won' : rr() < 0.8 ? 'out' : 'lost', { stock: rr() < 0.3 ? 1 : 0 });
    }
    return s;
  };
  const a = play(11), b = play(11), c = play(12);
  assert.deepEqual(snapshot(a), snapshot(b));
  assert.notDeepEqual(snapshot(a).world, snapshot(c).world, 'another seed, another world');
  assert.ok(a.camp.world.turn > 10);
  // Time only passes when you breach: a hundred saves and loads leave the world as it was.
  let t = a;
  for (let i = 0; i < 100; i++) { t = restore(JSON.parse(JSON.stringify(t))); migrate(t); }
  assert.deepEqual(snapshot(t), snapshot(a));
});

test('pressure rules over long campaigns: at most 2, one a server, never held/SPRAWL-00/checkpoint/lost-on, never after a loss, always a clean open server', () => {
  let turns = 0, moves = 0, watches = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = camp(['breaker', 'bastion', 'infiltrator', 'operator'][seed % 4], seed), rr = seeded(seed * 7 + 1);
    for (let i = 0; i < 70; i++) {
      const can = SERVERS.filter((x) => ['open', 'held'].includes(statusOf(s, x.id)));
      if (!can.length) break;
      // Mostly the frontier, sometimes a dug-in server, sometimes a re-image.
      const open = can.filter((x) => statusOf(s, x.id) === 'open'), pool = open.length && rr() < 0.8 ? open : can;
      const x = pool[Math.floor(rr() * pool.length)];
      toLevel(s, Math.min(25, x.level));
      const result = rr() < 0.6 ? 'won' : rr() < 0.85 ? 'lost' : 'out';
      if (result !== 'won' && x.gates && rr() < 0.4 && !held(s, x.id)) recOf(s, x.id).checkpoint = { gate: 1, rewrites: {} }; // a gate beaten on the way
      const before = { ...s.camp.world.moves }, was = held(s, x.id), ck = Object.fromEntries(SERVERS.map((y) => [y.id, !!recOf(s, y.id).checkpoint])), turn0 = s.camp.world.turn;
      finish(s, x.id, result);
      const w = s.camp.world;
      if (w.turn > turn0) turns++;
      const fresh = Object.keys(w.moves).filter((k) => !before[k]);
      moves += fresh.length; watches += Object.keys(w.watch).length;
      assert.ok(pressured(s) <= WORLD.pressure, `seed ${seed}: ${pressured(s)} under pressure`);
      assert.ok(cleanRuleHolds(s), `seed ${seed} breach ${i}: no clean open server (${openServers(s).map((y) => y.id)})`);
      assert.ok(fresh.length <= 1, 'one move a turn');
      if (result !== 'won' || was) assert.equal(fresh.length, 0, `seed ${seed}: a move after a ${was ? 're-image' : result}`);
      for (const k of fresh) {
        assert.ok(!held(s, k) && !SERVER[k].tutorial, `${k}: never on a held server or SPRAWL-00`);
        assert.ok(!ck[k], `${k}: never on a server with a checkpoint`);
        assert.equal(SERVER[k].author, SERVER[x.id].author, 'only the author you hit answers');
        assert.equal(statusOf(s, k), 'open');
      }
      for (const [k, m] of Object.entries(w.moves)) { assert.ok(!held(s, k), `${k}: a move on a held server`); assert.ok(GENES[m.gene]); }
      assert.ok(w.events.length <= WORLD.events && w.events.filter((e) => e.kind === 'drop').length <= 1);
      assert.equal(new Set(w.events.map((e) => e.at)).size, w.events.length, 'one event a server');
      assert.ok(w.news.length <= WORLD.news);
    }
  }
  assert.ok(turns > 1000 && moves > 80 && watches > 0, `${turns} turns, ${moves} moves, ${watches} watches`);
});

test('dig in shows on the node and the card, and changes that server\'s elites and gates, nothing else', () => {
  const s = camp();
  finish(s, 'sprawl-00', 'won');
  toLevel(s, 7);
  finish(s, 'coldstore-3', 'won');
  campUi.sel = 'depot-7';
  const html = campaignMarkup(s);
  assert.match(html, /class="cp-w"[^>]*>dug in · (ward|\?\?\?)</, 'the node carries the dug in chip');
  assert.match(html, /World<\/span>[\s\S]*TOLLGATE dug in\. Every elite and gate carries (Ward|a part behaviour you haven&#39;t seen)\./, 'the card\'s World row');
  assert.match(html, /drops 1 level higher[\s\S]*\+10%/, 'what it pays');
  campUi.sel = null;
  // The breach carries the world; with the world off, the same seed gives today's card and map byte for byte.
  const b = launch(s, 'depot-7');
  assert.deepEqual(b.card.world.digin, { author: 'tollgate', gene: 'ward' });
  const elites = nodeList(b.map).filter((n) => n.kind === 'elite');
  assert.ok(elites.length >= 2);
  for (const n of elites) { assert.equal(n.third, 'ward'); assert.equal(n.author, 'tollgate'); assert.ok(n.genes.includes('ward')); }
  const plain = generateMap(b.map.seed, b.level, cardFor(SERVER['depot-7']));
  for (const n of nodeList(plain)) if (n.kind !== 'elite' && b.map.nodes[n.id].kind !== 'drop') assert.deepEqual(b.map.nodes[n.id], n, `${n.id}: only elites change`);
  assert.equal(b.fx.gearLevel, DIG.itemLevel, 'pays like a heat rank: gear a level higher');
  assert.equal(b.fx.unique, DIG.unique);
  // The gate: its guard, plus the gene's part, guarding the guard's signature part.
  fight(s, b.map.nodes.gate1);
  const v = s.encounter.virus, box = v.parts.find((p) => p.dug);
  assert.ok(box && box.ward && v.parts.some((p) => p.id === box.ward), 'a Lockbox wards the guard');
  assert.ok(v.genes.some((g) => g.id === 'ward'));
  assert.match(breachMarkup(s) + JSON.stringify(s.breach.log), /dug in/);
  s.encounter = null; s.run = null; s.breach = null;
  WORLD.on = false;
  try {
    const c = launch(s, 'depot-7');
    assert.equal(c.card.world, undefined);
    assert.deepEqual(c.card, cardFor(SERVER['depot-7']));
    assert.ok(!nodeList(c.map).some((n) => n.dug || n.kind === 'drop'));
    assert.equal(modsFor(s, 'depot-7'), null);
  } finally { WORLD.on = true; s.breach = null; }
});

// ---------- dead drops ----------
test('dead drops come only from wick\'s leads, wait 3 breaches, and pay a pool card and wick\'s note when pulled', () => {
  let seen = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s = camp('bastion', seed), rr = seeded(seed);
    const leads = new Map();
    for (let i = 0; i < 30; i++) {
      const can = SERVERS.filter((x) => ['open', 'held'].includes(statusOf(s, x.id)) && !(x.tutorial && held(s, x.id)));
      const x = can.sort((a, b) => a.level - b.level)[Math.floor(rr() * Math.min(3, can.length))];
      toLevel(s, Math.min(25, x.level));
      const ids = new Set(s.camp.world.events.map((e) => e.id));
      const b = finish(s, x.id, rr() < 0.7 ? 'won' : 'lost');
      const fresh = s.camp.world.events.filter((e) => !ids.has(e.id));
      if (b.report.visit.lead) leads.set(s.camp.world.turn, b.report.visit.lead);
      for (const e of fresh) { seen++; assert.equal(e.kind, 'drop'); assert.equal(leads.get(e.turn)?.at, e.at, 'every drop is a lead wick gave'); assert.equal(e.pips, WORLD.pips); }
      for (const e of s.camp.world.events) assert.ok(s.camp.world.turn - e.turn < WORLD.pips, 'a drop goes cold after 3 breaches');
    }
  }
  assert.ok(seen >= 12, `${seen} drops`);
  // Pull one: the card joins the pool at the breach's end (even a loss), the note goes in the Archive, the drop goes.
  const s = camp();
  finish(s, 'sprawl-00', 'won');
  toLevel(s, 4);
  finish(s, 'coldstore-3', 'won');
  const e = s.camp.world.events[0];
  assert.ok(e, 'the first turn left a drop');
  toLevel(s, SERVER[e.at].level);
  const b = launch(s, e.at), n = nodeList(b.map).find((x) => x.kind === 'drop');
  assert.ok(n && n.act === 0 && n.row === e.row && n.path === '/perimeter/drop', 'a drop/ node in act 1, the row the lead named');
  assert.ok(nodeList(b.map).some((x) => x.kind === 'elite') && nodeList(b.map).some((x) => x.kind === 'term'), 'the act keeps its elite and its terminal');
  assert.equal(n.frag, 'drop-1');
  const card = n.card;
  assert.ok(card && !s.camp.pool.includes(card));
  b.screen = { kind: 'drop', node: n.id, read: false };
  act(s, 'cat');
  assert.match(breachMarkup(s), /if you&#39;re reading this you followed a lead/);
  act(s, 'pull');
  b.result = 'lost'; b.at = n.id; b.stats ||= { rests: 0, landed: 0, elites: 0, skips: 0, low: 1 };
  breachHooks.over(s, 'lost');
  assert.ok(s.camp.pool.includes(card) || s.camp.mods.includes(card), 'the card is in the pool');
  assert.ok(s.camp.archive.includes('drop-1'));
  assert.ok(!s.camp.world.events.some((x) => x.id === e.id), 'the drop is gone');
  assert.match(breachMarkup(s), /drop<\/span><b>[^<]+<\/b><span>Joins your draft pool/);
  leave(s);
  assert.equal(FRAGMENTS.filter((f) => f.drop).length, 2, 'the first two of the dead-drop thread');
  for (const f of FRAGMENTS.filter((x) => x.drop)) { assert.ok(f.lines.at(-1) === '— w' && f.lines.every((l) => l === l.toLowerCase() || l === '— w')); }
});

// ---------- the room ----------
test('wick picks the most important fact it has a line for, never repeats until a set runs out, and says nothing when nothing fits', () => {
  const s = camp();
  const d = (o) => ({ result: 'won', id: 'pier-5', where: 'core', streak: 0, first: false, reimage: false, replay: false, checkpoint: 0, heat: 0, opened: 0, stock: [], rests: 1, drafts: 3, elites: 0, skips: 0, digin: null, rewrites: [], lostOn: null, ...o });
  const room = freshRoom(), say = (o) => pickLine(room, 'wick', factsOf(s, d(o)))?.text || null;
  assert.equal(say({ first: true, stock: ['kmod'], rewrites: ['maildrop'] }), "patch tuesday's down. that pier won't ship another update.", '1: a first fall beats everything');
  assert.equal(say({ result: 'lost', where: 'gate1', streak: 3 }), 'pier-5 will wait. the others won\'t mind you.', '4: three running beats where');
  assert.equal(say({ result: 'lost', where: 'gate1' }), 'gate 1 holds. it\'ll keep.');
  assert.equal(say({ result: 'lost', where: 'gate1' }), "pier-5's first gate is still up. so are you.", 'the next line of the set');
  assert.equal(say({ result: 'lost', where: 'gate1' }), 'gate 1 holds. it\'ll keep.', 'a set that ran out starts over');
  assert.equal(say({ result: 'out', where: 'gate1' }), 'you jacked out with the pack. smart or scared, it spends the same.');
  assert.equal(say({ result: 'lost', where: 'core' }), 'you met patch tuesday. now you know what it does.');
  assert.equal(say({ reimage: true, digin: 'swarmline', stock: ['kmod'] }), 'swarmline dug in on pier-5. you dug them out.', '5: a choice, the dig in first');
  assert.equal(say({ reimage: true, stock: ['kmod'] }), "kmod's still stock on pier-5.");
  assert.equal(say({ reimage: true, rewrites: ['spamcannon'] }), 'same box, new furniture.', '5 before 6');
  assert.equal(say({ reimage: true, rests: 1, rewrites: ['spamcannon'], drafts: 3 }), 'pier-5 runs your way again.');
  s.camp.room.took = [];
  const room2 = freshRoom();
  assert.equal(pickLine(room2, 'wick', factsOf(s, { ...d({ rewrites: ['spamcannon'] }), reimage: false, first: false }))?.text, 'loud mail. the neighbours are going to read every one.', '6: a rewrite the first time');
  s.camp.room.took = ['spamcannon'];
  assert.equal(pickLine(freshRoom(), 'wick', factsOf(s, d({ rewrites: ['spamcannon'] }))), null, 'nothing fits: wick says nothing');
  // About 60 lines across priorities 1, 4, 5 and 6, lower case, short, one sentence or two.
  const lines = Object.values(ROOM.wick).flat();
  assert.ok(lines.length >= 55 && lines.length <= 80, `${lines.length} lines`);
  for (const l of [...lines, ...Object.values(ROOM.leads).flat()]) { assert.equal(l, l.toLowerCase(), l); assert.ok(l.length <= 90, l); }
  for (const srv of SERVERS) assert.ok(ROOM.wick[`first.${srv.id}`] && ROOM.names[srv.id], srv.id);
});

test('the room after a breach: the end card goes back to the room, which shows wick, the lead and the board\'s news', () => {
  const s = camp();
  assert.match(roomMarkup(s), /wick says nothing\.[\s\S]*Nothing moved\./, 'before any breach');
  assert.equal(roomSentence(s), 'The radiator knocks. A chair is pulled out for you.');
  const b = launch(s, 'sprawl-00');
  b.result = 'won'; b.rewrites = {}; b.stats = { rests: 1, landed: 0, elites: 0, skips: 0, low: 1 };
  breachHooks.over(s, 'won');
  assert.match(breachMarkup(s), /data-camp="leave">Back to the room</);
  leave(s);
  let html = roomMarkup(s);
  assert.match(html, /after SPRAWL-00 · captured/);
  assert.match(html, /relay king off the air/);
  assert.match(html, /Someone left the Claims terminal logged in/);
  toLevel(s, 4);
  finish(s, 'coldstore-3', 'won');
  html = roomMarkup(s);
  assert.match(html, /vault warden&#39;s down\. read the spool twice\./);
  assert.match(html, /the others noticed you\.[\s\S]*data-camp="show" data-arg="[a-z0-9-]+"[^>]*>On map</, 'the lead, with a way to the map');
  assert.match(html, /TOLLGATE dug in at <button type="button" class="rm-srv" data-camp="show" data-arg="depot-7"/, 'news links to the server');
  assert.match(html, /data-module="campaign">Map</);
  // The map: the room's marker above layer 1.
  assert.match(campaignMarkup(s), /class="cp-room" data-module="room"/);
});

// ---------- the save ----------
test('save: v1 and v2 campaigns migrate in place to v3 (the world and the room), and a v3 save round-trips', () => {
  for (const from of [1, 2]) {
    const s = camp();
    finish(s, 'sprawl-00', 'won');
    delete s.camp.world; delete s.camp.room; s.camp.v = from;
    if (from === 1) { delete s.camp.mods; delete s.camp.heat; delete s.camp.heatCleared; delete s.camp.replays; }
    const back = restore(JSON.parse(JSON.stringify(s)));
    migrate(back);
    assert.equal(back.camp.v, 3);
    assert.equal(CAMPAIGN.v, 3);
    assert.deepEqual(back.camp.world, { turn: 0, moves: {}, watch: {}, events: [], news: [], drops: 0 }, 'the world starts quiet');
    assert.deepEqual(back.camp.room.took, ['slushfund'], 'what you hold counts as taken');
    assert.equal(back.camp.room.visit, null);
    migrate(back);
    assert.equal(back.camp.v, 3, 'migrating twice changes nothing');
  }
  const s = camp();
  finish(s, 'sprawl-00', 'won'); toLevel(s, 4); finish(s, 'coldstore-3', 'won'); finish(s, 'depot-7', 'lost');
  const back = restore(JSON.parse(JSON.stringify(s)));
  migrate(back);
  assert.deepEqual(back.camp, s.camp);
  assert.ok(back.camp.world.turn >= 2 && back.camp.room.visit.result === 'lost');
});
