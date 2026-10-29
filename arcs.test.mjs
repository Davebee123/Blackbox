// Floor jobs (arcs.mjs): each floor's fixed chain of contracts, between the board's random ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks, addLocation, hackerLevel } from './dist/combat.mjs';
import { storyAt, tickMail, openContracts, doneContracts, heldCount, title, progress, ready, MAIL } from './dist/mail.mjs';
import { ARC, CHAINS, chainOf, slotFor, arcOffer, arcsOf } from './dist/arcs.mjs';
import { graphOf, locAt, slotNode } from './dist/floors.mjs';
import { FLOORS } from './dist/data.mjs';
import { mailMarkup } from './dist/view.mjs';
import { arcOfferMarkup } from './dist/arcs-view.mjs';
import { NETWORK } from './dist/network.mjs';

let T = 1_000_000;
hooks.now = () => T;
const chainJob = (s, n) => openContracts(s).find((c) => c.chain === n);
const boarded = () => { const s = fresh(7); storyAt(s, 'badge', T); tickMail(s, T); return s; };
// Locate a slot as a server (what tracing its ? to 100% does).
const locate = (s, id) => locAt(s, id) || addLocation(s, slotNode(s, id).family, Number(id.match(/^f(\d+)/)[1]), null, id);
// Finish whatever the open step of a chain needs, the quick way: its target located and its state set as play would.
function finish(s, n) {
  const c = chainJob(s, n);
  if (c.slot) locate(s, c.slot);
  tickMail(s, T);
  if (c.type === 'bounty' || c.type === 'map' || c.type === 'install' || c.type === 'sweep') c.got = 1;
  if (c.type === 'rooms') c.got = c.count;
  if (c.type === 'takeover') s.locations.find((l) => l.id === c.loc).takenOver = true;
  if (c.type === 'item' || c.type === 'heist') s.cargo.push({ contract: c.id, name: c.file, label: c.label });
  if (c.type === 'puzzle') { const l = s.locations.find((x) => x.id === c.loc); (l.floorplan ||= {}).puzzles = { p1: { won: true, at: T } }; }
  if (c.type === 'lair') { const l = s.locations.find((x) => x.id === c.loc); (l.spawns ||= {})['/core'] = { alive: false, respawnAt: T + NETWORK.lairMs }; }
  T += 1000; tickMail(s, T);
  assert.ok(ready(s, c), `${title(s, c)} is ready`);
  return c;
}

test('content: a chain for every floor, 4 to 6 steps, the last one a pick, the words in the house style', () => {
  for (let n = 1; n <= FLOORS.length; n++) {
    const c = chainOf(n);
    assert.ok(c, `floor ${n} has a chain`);
    assert.ok(c.steps.length >= 4 && c.steps.length <= 6, `${c.title}: ${c.steps.length} steps`);
    assert.ok(c.steps.at(-1).reward.pick, `${c.title}: its last step offers a pick`);
    assert.ok(c.title && c.reason && c.lore, `${c.title}: a title, a reason and a lore line`);
    const kinds = new Set(c.steps.map((x) => x.kind));
    assert.ok(kinds.size >= Math.min(4, c.steps.length - 1), `${c.title}: its steps vary (${[...kinds]})`);
    for (const st of c.steps) {
      assert.ok(['bounty', 'map', 'rooms', 'takeover', 'item', 'install', 'sweep', 'heist', ...ARC.own].includes(st.kind), st.kind);
      assert.ok(st.kind !== 'bounty' || n === 1, 'a named process lives in SPRAWL-00, on floor 1');
      assert.ok(st.kind !== 'lair' || n >= 2, 'lairs start on floor 2');
      const words = [st.subject, ...st.body, c.reason, c.lore, st.line || ''].join(' ');
      assert.doesNotMatch(words, /keyhole|backdoor|back door|way in\b/i, 'no intrusion metaphors');
      assert.doesNotMatch(words, /;/, 'no semicolon chains');
    }
  }
});

test('targets are fixed by the floor: the same slots every time, on the main road or the lair, different servers along a chain', () => {
  const s = boarded();
  for (const n of Object.keys(CHAINS).map(Number)) {
    const g = graphOf(s, n), slots = CHAINS[n].steps.map((st) => slotFor(s, n, st));
    assert.deepEqual(slots, CHAINS[n].steps.map((st) => slotFor(s, n, st)));
    for (const [k, id] of slots.entries()) {
      const st = CHAINS[n].steps[k];
      if (st.kind === 'bounty') { assert.equal(id, null); continue; }
      assert.ok(g.nodes[id], `${CHAINS[n].title} step ${k + 1}: a slot on floor ${n}`);
      assert.ok(st.kind === 'lair' ? id === g.lair : g.nodes[id].main || st.at === 'land', `${CHAINS[n].title} step ${k + 1} stays on the main road`);
    }
    const road = slots.filter((x, k) => x && CHAINS[n].steps[k].at === 'road');
    if (Object.values(g.nodes).filter((x) => x.main).length >= road.length) assert.equal(new Set(road).size, road.length, `${CHAINS[n].title}: its road steps go to different servers`);
  }
});

test('a floor chain opens with the board, sits outside the contracts you hold, and can’t be dropped', () => {
  const s = fresh(7);
  tickMail(s, T);
  assert.equal(chainJob(s, 1), undefined, 'not before the board opens');
  storyAt(s, 'badge', T);
  tickMail(s, T);
  const c = chainJob(s, 1);
  assert.ok(c, 'floor 1’s chain opens');
  assert.equal(c.type, 'bounty');
  assert.equal(heldCount(s), 0, 'it doesn’t count toward MAIL.take');
  assert.equal(chainJob(s, 2), undefined, 'floor 2’s waits until you reach it');
  command(s, `mail drop ${c.id}`);
  assert.ok(chainJob(s, 1), 'it can’t be dropped');
  // Hold three board contracts: the chain's step still arrives and still delivers.
  for (const o of s.mail.offers.filter((x) => x.type !== 'side').slice(0, MAIL.take)) command(s, `mail accept ${o.id}`);
  assert.equal(heldCount(s), Math.min(MAIL.take, heldCount(s)));
  const md = mailMarkup(s, `j${c.id}`, T);
  assert.match(md, /Floor jobs · 1/, 'its own section in Mail');
  assert.match(md, /class="mrow-f arc-f"[^>]*>1</, 'the floor’s number as its mark');
  assert.match(md, /qa-job/, 'its page is the quest window, its steps as a job');
  assert.match(md, /Kill pagenine-0909/);
});

test('a step not located yet says where it is, and becomes the plain contract once located', () => {
  const s = boarded();
  s.floors.reached = 2;
  const g = graphOf(s, 2), land = slotFor(s, 2, { at: 'land' });
  locate(s, land);
  T += 1000; tickMail(s, T);
  const c = chainJob(s, 2);
  assert.equal(c.type, 'install');
  assert.equal(c.loc, locAt(s, land).id, 'the landing server is located already');
  assert.match(title(s, c), new RegExp(`at [A-Z]\\d on ${locAt(s, land).name}`), 'an install with its room’s address');
  // Step 2: a road server further out, not located yet.
  finish(s, 2); command(s, `mail deliver ${c.id}`);
  const c2 = chainJob(s, 2);
  assert.equal(c2.step, 1);
  if (!locAt(s, c2.slot)) {
    assert.match(title(s, c2), /past /, `${title(s, c2)}: names the way there`);
    assert.equal(ready(s, c2), false);
    assert.ok(progress(s, c2).text.length);
    locate(s, c2.slot);
    T += 1000; tickMail(s, T);
  }
  assert.ok(c2.ok && c2.loc, 'located: its target is set');
  assert.match(title(s, c2), new RegExp(locAt(s, c2.slot).name));
  assert.ok(g.nodes[c2.slot].main);
});

test('a whole chain: credits, rep and contract XP each step, a pick of blues in the middle and yellows at the end', () => {
  const s = boarded();
  s.floors.reached = 2;
  locate(s, slotFor(s, 2, { at: 'land' }));
  T += 1000; tickMail(s, T);
  const rep0 = s.standing.lantern ?? 0;
  for (let k = 0; k < CHAINS[2].steps.length; k++) {
    const c = finish(s, 2), credits = s.server.credits, xp = s.hackers[s.loadout?.archetype || 'breaker'].xp, lv = hackerLevel(s);
    command(s, `mail deliver ${c.id}`);
    assert.ok(c.done, `step ${k + 1} delivered`);
    assert.equal(s.server.credits - credits, c.reward.credits, 'its credits');
    assert.ok(hackerLevel(s) > lv || s.hackers[s.loadout?.archetype || 'breaker'].xp > xp, 'its XP');
    const st = CHAINS[2].steps[k];
    if (st.reward.pick) {
      const o = arcOffer(s);
      assert.ok(o, 'a pick of three waits');
      assert.equal(o.items.length, 3);
      const last = k === CHAINS[2].steps.length - 1;
      for (const it of o.items) {
        assert.equal(it.rarity, last ? 'custom' : 'tuned', 'yellows at the end, blues in the middle');
        assert.ok(!it.unique && !it.set, 'never a unique or a set piece');
        assert.equal(it.level, hackerLevel(s), 'at your level');
      }
      assert.equal(new Set(o.items.map((x) => x.group || x.slot)).size, 3, 'three different slots');
      assert.match(arcOfferMarkup(s), /data-run="mail take 1"/);
      const want = o.items[1].name;
      command(s, 'mail take 2');
      assert.equal(arcOffer(s), null, 'taken');
      assert.equal(s.stash.at(-1).name, want, 'the one you picked, into your stash');
    } else assert.equal(arcOffer(s), null);
  }
  assert.ok(arcsOf(s)[2].done, 'the chain is done');
  assert.equal(chainJob(s, 2), undefined, 'nothing more opens on floor 2');
  assert.ok((s.standing.lantern ?? 0) > rep0, 'LANTERN rep for LANTERN’s chain');
  assert.equal(doneContracts(s).filter((c) => c.chain === 2).length, Math.min(CHAINS[2].steps.length, 16));
  T += 1000; tickMail(s, T);
  assert.equal(chainJob(s, 2), undefined, 'it never opens again');
});

test('a puzzle step counts a board won after it was posted, a lair step its boss beaten after', () => {
  const s = boarded();
  s.floors.reached = 5;
  const c = chainJob(s, 5) || (tickMail(s, T), chainJob(s, 5));
  assert.equal(c.type, 'puzzle');
  const loc = locate(s, c.slot);
  (loc.floorplan ||= {}).puzzles = { old: { won: true, at: c.at - 1 } };
  T += 1000; tickMail(s, T);
  assert.equal(ready(s, c), false, 'a board won before it was posted doesn’t count');
  loc.floorplan.puzzles.now = { won: true, at: T };
  T += 1000; tickMail(s, T);
  assert.ok(ready(s, c), 'one won since does');
});
