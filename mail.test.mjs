import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, tickServices } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { boardOpen, MAIL, STORY_LENGTH, standing, tierOf, openContracts, offers, heldCount, ready, tickMail, retainer, offer, indemnity } from './dist/mail.mjs';
import { HIDDEN, hiddenNodes, flagged, items } from './dist/hidden.mjs';
import { storeOf, LINE } from './dist/store.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;

const T0 = 1_000_000;
hooks.now = () => T0;
const job = (s) => openContracts(s).find((j) => j.story !== undefined) || openContracts(s)[0];
// Win whatever fight is running: every part on 1 Integrity, no armor, no attacks.
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const killInSprawl = (s, room) => {
  if (!s.run) { if (s.zone) s.zone.lockUntil = 0; play(s, 'connect sprawl'); } // skip the reconnect wait (rogue.mjs relockMs)
  play(s, 'cd ' + room);
  play(s, 'attack');
  win(s);
  play(s, 'cd /');
};
const deliver = (s, j = job(s)) => command(s, `mail deliver ${j.id}`);
// Beat a location's guard and open its vault; you're left standing next to the vault.
const takeOver = (s, loc) => {
  if (s.run) play(s, 'jack out');
  play(s, 'connect ' + loc.id);
  const layout = layoutOf(loc);
  const guardDir = Object.keys(layout).find((k) => layout[k].guard);
  const vault = Object.keys(layout).find((k) => layout[k].locked);
  play(s, 'cd ' + guardDir);
  if (s.encounter?.phase === 'alert' || active(s)) win(s);
  play(s, 'cd ' + vault.slice(0, vault.lastIndexOf('/')));
  play(s, `unlock vault ${loc.password}`);
  return vault;
};
// Straight to the end of the storyline, with the board open.
const contractor = () => {
  const s = fresh();
  s.mail.story = STORY_LENGTH;
  s.mail.jobs = [];
  s.standing.halcyon = 30;
  s.mail.nextOfferAt = T0;
  return s;
};

test('a new game opens with LOWLIGHT’s welcome and the first job; the board and store stay shut', () => {
  const s = fresh();
  assert.equal(s.mail.list.length, 1);
  assert.equal(s.mail.list[0].read, false);
  const j = job(s);
  assert.equal(j.type, 'kill');
  assert.equal(j.where, 'sprawl');
  assert.equal(standing(s), MAIL.startStanding);
  assert.equal(tierOf(s).name, 'Probation');
  tickServices(s, T0 + 60 * 60 * 1000);
  assert.equal(offers(s).length, 0);
  assert.match(command(s, 'buy relay').at(-1).message, /opens to contractors/);
});

test('the storyline: kills, code, a named process, a takeover, then a ledger on a server you have to trace', () => {
  const s = fresh();
  for (const room of ['/tmp', '/srv', '/net']) killInSprawl(s, room);
  assert.ok(ready(s, job(s)));
  const credits = s.server.credits;
  deliver(s);
  assert.equal(s.server.credits, credits + 60);
  assert.equal(indemnity(s), 1, 'contracts pay Indemnity too');
  assert.equal(standing(s), MAIL.startStanding + 3);
  assert.ok(!(s.stash || []).some((it) => it.unique === 'wicks-old-toolkit'), "wick's toolkit waits for claimjack");
  // code
  let j = job(s);
  assert.equal(j.type, 'materials');
  s.materials.worm = 0;
  assert.match(command(s, `mail deliver ${j.id}`).at(-1).message, /Not done yet/);
  s.materials.worm = 5;
  deliver(s);
  assert.equal(s.materials.worm, 3);
  // the named process
  j = job(s);
  assert.equal(j.type, 'bounty');
  assert.equal(s.zone.spawns['/var/log'].name, j.name);
  assert.equal(s.zone.spawns['/var/log'].grade, 2, 'claimjack is an elite');
  assert.ok(!boardOpen(s), 'no board yet');
  killInSprawl(s, '/var/log');
  deliver(s);
  assert.ok((s.stash || []).some((it) => it.unique === 'wicks-old-toolkit'), "claimjack pays wick's toolkit");
  // take over any server you've traced (Halcyon doesn't point one out)
  j = job(s);
  assert.ok(boardOpen(s) && offers(s).length >= 3, 'the board opens with the turf letter');
  assert.equal(j.type, 'takeover');
  assert.equal(s.locations.length, 0, 'no server was handed to you');
  play(s, 'jack out');
  command(s, 'developer location ransomware');
  const home = s.locations[0];
  takeOver(s, home);
  play(s, 'jack out');
  assert.ok(ready(s, j));
  deliver(s);
  assert.equal(items(s).relay, 1, 'Halcyon sends a relay');
  // the ledger: its server is one hop past the one you took, and nobody says which
  j = job(s);
  assert.equal(j.type, 'item');
  const n = hiddenNodes(s).find((x) => x.id === j.hidden);
  assert.equal(n.via, home.id);
  assert.ok(!flagged(s, n));
  command(s, `relay ${home.id}`);
  assert.ok(flagged(s, n), 'the relay flags the signal');
  // hunt it: the relay's route file, then kills of its family
  play(s, 'connect ' + home.id);
  const route = home.extraFiles.find((f) => f.kind === 'route');
  play(s, 'pull ' + route.name);
  play(s, 'jack out');
  assert.equal(n.lead, HIDDEN.routeLead);
  while (hiddenNodes(s).includes(n)) {
    s.zone.spawns['/tmp'] = { alive: true, family: n.family, level: 1, seed: 7 + n.lead, name: 'x-0001' };
    killInSprawl(s, '/tmp');
    play(s, 'jack out');
  }
  const loc = s.locations.find((l) => l.id === j.loc);
  assert.ok(loc, 'traced: the contract follows it');
  assert.equal(loc.parent, home.id);
  const vault = takeOver(s, loc);
  play(s, 'cd ' + vault);
  play(s, 'pull claims.db');
  assert.ok(!ready(s, j), 'not until it is banked');
  play(s, 'jack out');
  assert.ok(ready(s, j));
  const daemons = Object.keys(s.daemonsOwned).length;
  deliver(s, j);
  assert.equal(Object.keys(s.daemonsOwned).length, daemons + 1);
  assert.equal(s.mail.story, STORY_LENGTH);
  assert.match(s.mail.list[0].subject, /Contractor/);
  assert.equal(tierOf(s).name, 'Contractor');
  assert.equal(offers(s).length, 3, 'the board opens');
});

test('the board: offers arrive at uneven times up to five and expire; take three, count only what you took', () => {
  const s = contractor();
  const times = [];
  for (let t = T0; t < T0 + 3 * 60 * 60 * 1000 && times.length < 12; t += 30 * 1000) {
    const n = offers(s).length;
    tickMail(s, t);
    if (offers(s).length > n) times.push(t);
    if (offers(s).length === MAIL.offers) offers(s).splice(0, 2); // somebody else takes them
  }
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.ok(new Set(gaps).size > 3, 'not on a fixed clock');
  // expiry
  const s2 = contractor();
  tickMail(s2, T0);
  assert.ok(offers(s2).length > 0);
  const first = offers(s2)[0];
  tickMail(s2, first.expiresAt + 1);
  assert.ok(!offers(s2).includes(first), 'an untaken offer runs out');
  // taking
  const s3 = contractor();
  for (let i = 0; i < 5; i++) offer(s3, T0);
  const kill = offers(s3).find((o) => o.type === 'kill') || offer(s3, T0);
  s3.zone = null;
  for (const o of [...offers(s3)].slice(0, 3)) command(s3, `mail accept ${o.id}`);
  assert.equal(heldCount(s3), 3);
  const fourth = offers(s3)[0];
  assert.match(command(s3, `mail accept ${fourth.id}`).at(-1).message, /already hold 3/);
  const held = openContracts(s3)[0];
  command(s3, `mail drop ${held.id}`);
  assert.equal(heldCount(s3), 2);
  assert.equal(standing(s3), 30, 'dropping is free');
  if (!openContracts(s3).includes(kill)) assert.equal(kill.got, 0, 'an offer you did not take counts nothing');
});

test('the retainer pays every 30 minutes by standing tier, up to 8 hours of it; none while suspended', () => {
  const s = fresh();
  const pay = retainer(s);
  const c0 = s.server.credits;
  tickMail(s, T0 + MAIL.periodMs - 1);
  assert.equal(s.server.credits, c0);
  tickMail(s, T0 + MAIL.periodMs);
  assert.equal(s.server.credits, c0 + pay);
  tickMail(s, T0 + MAIL.periodMs * 100);
  assert.equal(s.server.credits, c0 + pay + pay * MAIL.maxPeriods, 'capped');
  s.standing.halcyon = 0;
  tickMail(s, T0 + MAIL.periodMs * 101);
  assert.equal(s.server.credits, c0 + pay + pay * MAIL.maxPeriods, 'suspended pays nothing');
});

test('a crash on your own server costs Halcyon standing, but a breach alone never suspends you', () => {
  const crash = (s) => {
    command(s, 'encounter cryptjack'); command(s, 'engage');
    s.server.integrity = 1;
    for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = s.encounter.cycle;
    for (let i = 0; i < 3 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  };
  const s = fresh();
  s.standing.halcyon = 30;
  crash(s);
  assert.equal(standing(s), 30 - MAIL.crashHit);
  const t = fresh();
  t.standing.halcyon = 4;
  crash(t);
  assert.equal(standing(t), 1);
});

test('GLASSJAW pays more (no Indemnity) but doing its work costs Halcyon standing', () => {
  const s = contractor();
  s.standing.halcyon = 40;
  let o;
  for (let i = 0; i < 400 && !o; i++) { const x = offer(s, T0); if (x.offBooks && x.type === 'materials') o = x; }
  assert.ok(o);
  assert.equal(o.reward.indemnity, 0);
  s.mail.offers = [o];
  command(s, `mail accept ${o.id}`);
  s.materials[o.material] = 99;
  command(s, `mail deliver ${o.id}`);
  assert.equal(standing(s), 40 - MAIL.offBooksHit);
  assert.ok(standing(s, 'glassjaw') > 0);
});

test('the hidden network: invaders from servers you haven’t found, traced back when you beat them', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const found = s.locations[0];
  const near = hiddenNodes(s).filter((n) => n.via === found.id);
  assert.equal(near.length, HIDDEN.perServer);
  assert.ok(near.every((n) => n.depth === 2 && n.lead === 0 && !n.pinged));
  const share = HIDDEN.invaderShare;
  HIDDEN.invaderShare = 1;
  s.firewall = { level: 0, frag: 0, defragUntil: 0, hardenUntil: 0 }; // nothing blocks it at the wall
  play(s, 'developer invade');
  HIDDEN.invaderShare = share;
  const inv = s.invasion;
  assert.ok(inv.hidden);
  assert.equal(inv.level, found.level, 'it comes at the level of the server it routes through');
  assert.equal(inv.grade || 1, 1, 'and that server\'s layer');
  assert.match(inv.fromName, /unknown server past/);
  const n = hiddenNodes(s).find((x) => x.id === inv.hidden);
  play(s, 'jack in');
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  win(s);
  assert.ok(n.lead >= HIDDEN.winLead, 'beating it traces most of the way back');
  assert.equal(s.invasion, null);
});

test('a vault’s trace record puts part of a trace on one of the server’s hidden neighbours', () => {
  const s = fresh();
  command(s, 'developer location ransomware');
  const loc = s.locations[0];
  const before = hiddenNodes(s).filter((n) => n.via === loc.id).map((n) => n.id);
  const vault = takeOver(s, loc);
  play(s, 'cd ' + vault);
  play(s, 'pull signal.trc');
  play(s, 'jack out');
  assert.equal(s.locations.length, 1, 'no server located outright');
  assert.deepEqual(hiddenNodes(s).filter((n) => before.includes(n.id)).map((n) => n.lead).sort((a, b) => b - a)[0], HIDDEN.recordLead);
});

test('the store: Halcyon’s line, chase protocols for Indemnity by tier, and agency stock that turns over', () => {
  const s = contractor();
  tickServices(s, T0);
  const st = storeOf(s);
  assert.equal(st.slots.length, 4);
  assert.ok(st.slots.every((x) => x.agency && x.price > 0 && x.qty > 0));
  s.server.credits = 10000;
  command(s, 'buy relay');
  assert.equal(items(s).relay, 1);
  // chase: Contractor can buy Deductible, not Subrogation
  assert.match(command(s, 'buy deductible').at(-1).message, /costs 30 Indemnity/);
  s.indemnity = 100;
  command(s, 'buy deductible');
  assert.equal(s.indemnity, 70);
  const it = s.stash.at(-1);
  assert.equal(it.zeroDay, 'deductible');
  assert.equal(it.rarity, 'indemnified');
  assert.match(command(s, 'buy subrogation').at(-1).message, /Trusted/);
  // agency stock
  const slot = st.slots[0];
  command(s, 'buy ' + slot.key);
  assert.ok(slot.qty >= 0);
  const keys = st.slots.map((x) => x.key).join();
  tickServices(s, T0 + 3 * 60 * 60 * 1000);
  assert.notEqual(st.slots.map((x) => x.key).join(), keys, 'the shelves turn over');
  assert.equal(LINE.find((x) => x.id === 'deductible').tier, 2);
});

test('Deductible: the first attack that lands each fight does nothing', () => {
  const s = contractor();
  s.indemnity = 30;
  command(s, 'buy deductible');
  const it = s.stash.at(-1);
  command(s, 'load ' + it.id);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const hp = s.server.integrity;
  const p = s.encounter.virus.parts.find((x) => x.attack?.effect === 'damage');
  p.attack.due = s.encounter.cycle;
  command(s, 'hold'); const ev = resolveCycle(s);
  assert.ok(ev.some((e) => /Deductible/.test(e.message)));
  assert.equal(s.server.integrity, hp);
});

test('an old save keeps its open contracts and gets a hidden network', () => {
  const s = fresh();
  command(s, 'developer location worm');
  s.hidden = [];
  const l = s.mail.list[0];
  l.contract = { type: 'kill', where: 'sprawl', count: 3, got: 1, reward: { credits: 60, standing: 3 }, story: 0, id: l.id };
  delete l.job;
  s.mail = { list: [l], next: 2, story: 1, offerAt: null };
  s.version = 20;
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(r.mail.jobs.length, 1);
  assert.equal(r.mail.jobs[0].got, 1);
  assert.equal(hiddenNodes(r).length, HIDDEN.perServer);
});

test('Total Loss, the Preferred weapon: breaking a part hits every other part for a quarter of its max', () => {
  const s = contractor();
  s.indemnity = 100;
  assert.match(command(s, 'buy total-loss').at(-1).message, /Preferred/);
  s.standing.halcyon = 80;
  command(s, 'buy total-loss');
  const it = s.stash.at(-1);
  assert.equal(it.zeroDay, 'total-loss');
  assert.equal(it.group, 'exploit');
  command(s, 'load ' + it.id);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const [a, b] = s.encounter.virus.parts;
  for (const p of [a, b]) Object.assign(p, { armor: 0, attack: null });
  a.integrity = 1;
  b.integrity = b.max;
  command(s, 'spike ' + a.id); resolveCycle(s);
  assert.equal(b.integrity, b.max - Math.round(a.max * 0.25));
});

test('Mail lists delivered contracts and LOWLIGHT jobs under Completed, newest first', async () => {
  const { mailMarkup } = await import('./dist/view.mjs');
  const { doneContracts } = await import('./dist/mail.mjs');
  const s = fresh();
  const base = { from: 'Halcyon Mutual', subject: 'x', type: 'kill', family: 'worm', count: 1, reward: { credits: 1 } };
  s.mail = { ...(s.mail || {}), list: [], offers: [], jobs: [{ ...base, id: 1, done: true, doneAt: 10 }, { ...base, id: 2, done: true, doneAt: 20, story: 0 }, { ...base, id: 3 }] };
  assert.deepEqual(doneContracts(s).map((j) => j.id), [2, 1]);
  const html = mailMarkup(s);
  assert.match(html, /Completed · 2/);
  assert.match(html, /class="mlist mdone"/);
});

test('a letter that came with a contract shows once: as the contract, not again under Letters', async () => {
  const { mailMarkup } = await import('./dist/view.mjs');
  const s = fresh();
  const base = { from: 'Halcyon Mutual · Claims', type: 'materials', material: 'worm', amount: 2, reward: { credits: 1 } };
  s.mail = { ...(s.mail || {}), offers: [], list: [
    { id: 1, from: 'Halcyon Mutual · Claims', subject: 'Sample request', body: ['Send us two.'], job: 5, read: true },
    { id: 2, from: 'wick · LOWLIGHT', subject: 'a name on the list', body: ['hi'], job: 6, read: false },
    { id: 3, from: 'wick · LOWLIGHT', subject: 'just a letter', body: ['no job'], read: true },
  ], jobs: [{ ...base, id: 5, subject: 'Sample request', done: true, doneAt: 5 }, { ...base, id: 6, subject: 'a name on the list' }] };
  const html = mailMarkup(s);
  const letters = html.slice(html.indexOf('Letters'), html.indexOf('Completed'));
  assert.ok(!letters.includes('Sample request') && !letters.includes('a name on the list'), 'not listed twice');
  assert.ok(letters.includes('just a letter'));
  assert.match(html, /data-mail="j6"/);
  assert.match(html, /class="mrow unread[^"]*" data-mail="j6"/, 'its unread dot moves to the contract');
  assert.match(html, /Send us two\.|hi/, 'a contract reads as its letter');
});
