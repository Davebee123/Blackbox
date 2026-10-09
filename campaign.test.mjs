// The breach campaign (docs/roguelite.md phase 2: campaign.mjs, campaign-view.mjs, campaignsim.mjs): its own save, a
// connected map by layer, outputs on later breaches, checkpoints, re-imaging, bounties, the unlock pool, the Archive,
// and the bot reaching level 10 with every class.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, restore, command, hackerLevel, gainXp, active, SAVE_VERSION } from './dist/combat.mjs';
import { BOSSES, GUARDS } from './dist/data.mjs';
import { AUTHORS } from './dist/authors.mjs';
import { REWRITES, SUBSYSTEMS } from './dist/rewrites.mjs';
import { CVES, modPool, rollDraft } from './dist/drafts.mjs';
import { seeded } from './dist/gear.mjs';
import { nodeList, reachable, firstRow, act, breachHooks, allPaths } from './dist/breach.mjs';
import { CAMPAIGN, CAMPAIGN_KEY, SERVERS, SERVER, LAYERS, FRAGMENTS, BOUNTIES, newCampaign, statusOf, outputsFor, launch, leave, recOf, archiveOf, bountiesOn, actsFor, cardFor } from './dist/campaign.mjs';
import { campaignMarkup, archiveMarkup, campUi } from './dist/campaign-view.mjs';
import { breachMarkup } from './dist/breach-view.mjs';
import { runCampaign, report } from './campaignsim.mjs';
import { CLASSES } from './breachsim.mjs';

function camp(cls = 'breaker', seed = 7) {
  const s = fresh();
  s.rng = seed * 99991;
  s.profile = { handle: 'tester', pwLen: 6, since: 0 };
  command(s, `archetype ${cls}`);
  newCampaign(s, { seed });
  return s;
}
// Hold a server with these rewrites, as a capture would leave it.
function hold(s, id, rewrites = {}) { const r = recOf(s, id); r.captured = true; r.wins = (r.wins || 0) + 1; r.rewrites = rewrites; return r; }
const toLevel = (s, n) => { while (hackerLevel(s) < n) gainXp(s, 100000, 'test'); };

// ---------- the save ----------
test('save: its own key, a round trip through JSON and restore keeps the whole campaign', () => {
  assert.notEqual(CAMPAIGN_KEY, 'blackbox-v6', 'never the old save');
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /const KEY = CAMP \? CP\.CAMPAIGN_KEY : SAVE_KEY;/);
  assert.ok(!/localStorage\.(get|set)Item\(SAVE_KEY/.test(app), 'every save goes through KEY, so the campaign never writes the old one');
  const s = camp('bastion', 3);
  hold(s, 'sprawl-00', { ledger: { id: 'slushfund', tier: 1 } });
  s.camp.archive.push('sprawl-00'); s.camp.pool.push('bluekeep'); s.camp.breaches = 4;
  recOf(s, 'vanta-07').checkpoint = { gate: 1, rewrites: { sshd: { id: 'forgedkeys', tier: 2 } } };
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.camp, s.camp);
  assert.equal(back.version, SAVE_VERSION);
  assert.equal(back.loadout.archetype, 'bastion');
  assert.deepEqual(back.stash.map((x) => x.id), s.stash.map((x) => x.id), 'the issued kit comes back');
  // A breach in progress saves and comes back too, map and all.
  const t = camp('operator', 4);
  launch(t, 'sprawl-00');
  const u = restore(JSON.parse(JSON.stringify(t)));
  assert.equal(u.breach.card.id, 'sprawl-00');
  assert.deepEqual(Object.keys(u.breach.map.nodes).sort(), Object.keys(t.breach.map.nodes).sort());
});

test('a new campaign: level 1, a white protocol in every slot, the tutorial open, nothing held, tips off', () => {
  const s = camp('infiltrator');
  assert.equal(hackerLevel(s), 1);
  assert.ok(s.stash.length >= 4 && s.stash.every((x) => x.rarity === 'stock'));
  assert.equal(statusOf(s, 'sprawl-00'), 'open');
  assert.ok(SERVERS.filter((x) => x.id !== 'sprawl-00').every((x) => statusOf(s, x.id) !== 'open'));
  assert.equal(s.settings.tips, false);
  assert.deepEqual(s.camp.pool, CAMPAIGN.startCves);
});

// ---------- the map ----------
test('map: links go both ways, every server is reachable from SPRAWL-00, and each layer holds its level band', () => {
  for (const x of SERVERS) for (const l of x.links) assert.ok(SERVER[l]?.links.includes(x.id), `${x.id} <-> ${l}`);
  const seen = new Set(['sprawl-00']), todo = ['sprawl-00'];
  while (todo.length) for (const l of SERVER[todo.pop()].links) if (!seen.has(l)) { seen.add(l); todo.push(l); }
  assert.equal(seen.size, SERVERS.length, 'connected');
  for (const L of LAYERS) {
    const xs = SERVERS.filter((x) => x.layer === L.n);
    assert.ok(xs.length >= 3, `layer ${L.n} has a handful of servers`);
    for (const x of xs) assert.ok(x.level >= L.band[0] && x.level <= L.band[1], `${x.id} lv ${x.level} in ${L.band}`);
    // Each layer is reachable from the one before it.
    if (L.n > 1) assert.ok(xs.some((x) => x.links.some((l) => SERVER[l].layer === L.n - 1)), `layer ${L.n} links back`);
  }
  assert.ok(Math.max(...SERVERS.map((x) => x.level)) >= 20, 'up to level 20 and past it');
  for (const x of SERVERS) {
    assert.ok(BOSSES[x.resident], `${x.id}: a Resident from BOSSES`);
    assert.ok(AUTHORS[x.author], `${x.id}: an author`);
    if (!x.tutorial) assert.equal(x.subsystems.length, actsFor(x.level), `${x.id}: its acts by level`);
    for (const sub of x.subsystems.flat()) assert.ok(SUBSYSTEMS[sub], sub);
    assert.equal(new Set(x.subsystems.flat()).size, x.subsystems.flat().length, `${x.id}: each subsystem once`);
    for (const pair of x.gates || []) for (const g of pair) assert.ok(GUARDS[g], g);
    assert.equal((x.gates || []).length >= x.subsystems.length - 1, true, `${x.id}: a gate after every act but the last`);
    assert.ok(FRAGMENTS.some((f) => f.server === x.id), `${x.id}: a core.dump`);
  }
});

test('fog and discovery: unknown until adjacent; a capture opens its links, and the next ring shows as unknown', () => {
  const s = camp();
  assert.equal(statusOf(s, 'vanta-07'), 'fog');
  assert.equal(statusOf(s, 'pier-5'), 'hidden');
  assert.match(campaignMarkup(s), /cp-node st-fog/);
  assert.ok(!/PIER-5/.test(campaignMarkup(s)), 'a hidden server is not drawn');
  hold(s, 'sprawl-00');
  assert.equal(statusOf(s, 'vanta-07'), 'open');
  assert.equal(statusOf(s, 'coldstore-3'), 'open');
  assert.equal(statusOf(s, 'pier-5'), 'fog');
  assert.equal(launch(s, 'meridian-14'), null, 'out of reach');
  // Jump Host on a held server reaches two links past it.
  hold(s, 'vanta-07', { sshd: { id: 'jumphost', tier: 1 } });
  assert.equal(statusOf(s, 'chapel-0'), 'open');
});

// ---------- breaches by level ----------
test('breaches scale with level: SPRAWL-00 a short tutorial, one act early, two from 6, three from 10', () => {
  const s = camp();
  let b = launch(s, 'sprawl-00');
  assert.equal(b.map.acts, 1); assert.equal(b.map.rows, 3);
  assert.ok(!nodeList(b.map).some((n) => n.kind === 'gate' || n.kind === 'elite'));
  assert.equal(b.map.nodes.core.boss, 'relayking');
  assert.ok(allPaths(b.map).every((p) => p.at(-1) === 'core'));
  assert.ok(nodeList(b.map).filter((n) => ['virus', 'elite'].includes(n.kind)).every((n) => n.level === 1), 'viruses at the server level');
  // Level 1: only the mods for the skills on your bar (Key 1 and Overload), and no second mods before heat opens them.
  assert.deepEqual(modPool(s), ['pry-bar', 'overcommit']);
  leave(s); s.breach = null;
  for (const id of ['sprawl-00', 'vanta-07', 'coldstore-3', 'depot-7']) hold(s, id);
  b = launch(s, 'pier-5'); assert.equal(b.map.acts, 2); assert.ok(b.map.nodes.gate1 && !b.map.nodes.gate2);
  s.breach = null;
  b = launch(s, 'meridian-14'); assert.equal(b.map.acts, 3); assert.ok(b.map.nodes.gate2);
  assert.equal(b.map.nodes.core.boss, 'nb-deadbolt');
});

// ---------- outputs ----------
test('outputs: a held server\'s rewrites run on later breaches, each once at its best tier; Spam Cannon only next door', () => {
  const s = camp();
  hold(s, 'sprawl-00', { ledger: { id: 'slushfund', tier: 1 }, smtpd: { id: 'spamcannon', tier: 1 } });
  hold(s, 'coldstore-3', { smtpd: { id: 'maildrop', tier: 1 }, backup: { id: 'restorepoint', tier: 2 } });
  hold(s, 'vanta-07', { sshd: { id: 'forgedkeys', tier: 1 }, cron: { id: 'warmstart', tier: 1 } });
  hold(s, 'pier-5', { ledger: { id: 'slushfund', tier: 2 }, kmod: { id: 'memorymap', tier: 1 } });
  const out = outputsFor(s, 'vanta-07');
  assert.equal(out.slushfund, 2, 'the best tier counts, once');
  assert.equal(out.spamcannon, 1, 'SPRAWL-00 links to VANTA-07');
  assert.equal(outputsFor(s, 'depot-7').spamcannon, undefined, 'SPRAWL-00 does not link to REPO-DEPOT-7');
  const b = launch(s, 'vanta-07');
  assert.equal(b.tokens, 80, 'Slush Fund II');
  assert.equal(b.fx.memory, 0.1);
  assert.equal(b.fx.restore, 0.4, 'Restore Point II');
  assert.equal(b.fx.thin, 0.15);
  assert.equal(b.fx.maildrop, 1);
  assert.ok(b.fx.warm);
  assert.equal(b.screen?.kind, 'draft', 'Forged Keys: a CVE pick before the first node');
  assert.ok(b.screen.cards.every((c) => c.kind === 'cve' && s.camp.pool.includes(c.id)), 'from the pool only');
  assert.deepEqual(reachable(s), [], 'the pick comes first');
  act(s, 'pick', 0);
  assert.deepEqual(reachable(s).map((n) => n.id).sort(), firstRow(b.map).map((n) => n.id).sort());
  // A fight starts thinner on a breach next to a Spam Cannon.
  const n = firstRow(b.map)[0];
  act(s, 'go', n.id);
  assert.ok(active(s));
  assert.ok(s.encounter.virus.parts.every((p) => p.integrity === p.max));
});

test('Restore Point: once a breach, a blow that would end you leaves you at 1 and restores a share', async () => {
  const { hooks } = await import('./dist/combat.mjs');
  const s = camp();
  hold(s, 'sprawl-00', { ledger: { id: 'slushfund', tier: 1 } });
  hold(s, 'coldstore-3', { backup: { id: 'restorepoint', tier: 1 } });
  const b = launch(s, 'vanta-07');
  act(s, 'go', firstRow(b.map)[0].id);
  const d = s.run;
  d.integrity = 10;
  const dealt = hooks.lastBlow(s, d, 50);
  d.integrity -= dealt;
  assert.equal(d.integrity, 1 + Math.round(d.max * 0.25));
  assert.equal(hooks.lastBlow(s, d, 500), null, 'once a breach');
});

// ---------- the unlock pool, bounties, re-imaging, the Archive ----------
test('a capture: the record, the unlock, the links it opens, the fragment; a bounty met opens a card in the pool', () => {
  const s = camp('operator', 11);
  hold(s, 'sprawl-00');
  const k = bountiesOn(s, 'vanta-07')[0];
  assert.ok(k && bountiesOn(s, 'vanta-07').length <= 2);
  assert.equal(bountiesOn(s, 'sprawl-00').length, 0, 'the tutorial posts none');
  const b = launch(s, 'vanta-07', { bounty: k });
  b.rewrites = { sshd: { id: 'jumphost', tier: 1 } };
  b.stats = { rests: 0, landed: 0, elites: 1, skips: 0, low: 1 };
  const stash = s.stash.length, pool = s.camp.pool.length + s.camp.mods.length;
  b.result = 'won';
  breachHooks.over(s, 'won');
  const rec = recOf(s, 'vanta-07');
  assert.ok(rec.captured);
  assert.deepEqual(rec.rewrites, { sshd: { id: 'jumphost', tier: 1 } });
  assert.ok(s.camp.pool.includes('bluekeep'), 'VANTA-RELAY-07 opens BlueKeep');
  assert.equal(b.report.unlock.id, 'bluekeep');
  assert.ok(b.report.revealed.includes('PIER-5'));
  assert.equal(b.dump.server, 'vanta-07');
  assert.ok(s.camp.archive.includes('vanta-07'));
  assert.ok(b.report.bounty.done);
  assert.equal(s.stash.length, stash, 'no more gear: the designer found a breach gave too much');
  assert.equal(s.camp.pool.length + s.camp.mods.length, pool + 2, 'BlueKeep, and the bounty\'s card');
  assert.equal(rec.paid, 1);
  assert.match(breachMarkup(s), /CAPTURED[\s\S]*bounty[\s\S]*Paid[\s\S]*BlueKeep/);
  assert.match(breachMarkup(s), /data-camp="leave"/);
  // A missed bounty costs nothing; the drafts can't offer a CVE you haven't opened.
  leave(s);
  const c = launch(s, 'coldstore-3', { bounty: bountiesOn(s, 'coldstore-3')[0] });
  for (let i = 0; i < 40; i++) for (const card of rollDraft(s, seeded(i), 'elite', { act: 0, level: 4 })) if (card.kind === 'cve') assert.ok(s.camp.pool.includes(card.id), card.id);
  c.result = 'lost';
  breachHooks.over(s, 'lost');
  assert.equal(c.report.bounty.done, false);
  assert.ok(!recOf(s, 'coldstore-3').captured);
});

test('re-imaging: breach a server you hold again; what you clear can keep its rewrite or change it, the rest stays', () => {
  const s = camp();
  hold(s, 'sprawl-00', { ledger: { id: 'slushfund', tier: 2 }, smtpd: { id: 'maildrop', tier: 1 } });
  s.camp.archive.push('sprawl-00');
  const b = launch(s, 'sprawl-00');
  assert.deepEqual(b.prior, { ledger: { id: 'slushfund', tier: 2 }, smtpd: { id: 'maildrop', tier: 1 } });
  // The rewrite screen marks what it runs now; keeping it keeps the better tier.
  const n = nodeList(b.map).find((x) => x.sub === 'ledger' && x.kind === 'virus');
  b.screen = { kind: 'rewrite', sub: 'ledger', tier: 1, options: SUBSYSTEMS.ledger.rewrites, was: { id: 'slushfund', tier: 2 }, node: n.id };
  assert.match(breachMarkup(s), /Runs now · II[\s\S]*Keep/);
  act(s, 'pick', SUBSYSTEMS.ledger.rewrites.indexOf('slushfund'));
  assert.deepEqual(b.rewrites.ledger, { id: 'slushfund', tier: 2 });
  b.rewrites.ledger = { id: 'pricefix', tier: 1 };
  b.result = 'won';
  breachHooks.over(s, 'won');
  assert.deepEqual(recOf(s, 'sprawl-00').rewrites, { ledger: { id: 'pricefix', tier: 1 }, smtpd: { id: 'maildrop', tier: 1 } }, 'uncleared smtpd keeps its rewrite');
  assert.equal(b.report.reimaged, true);
  assert.equal(b.dump, null, 'its core.dump is already in the Archive');
});

test('checkpoints: a gate you beat holds; a retry starts past it with the rewrites from the acts behind it', () => {
  const s = camp();
  for (const id of ['sprawl-00', 'vanta-07']) hold(s, id);
  toLevel(s, 6);
  let b = launch(s, 'pier-5');
  b.rewrites = { sshd: { id: 'forgedkeys', tier: 2 }, ledger: { id: 'slushfund', tier: 1 } };
  b.cleared.gate1 = true;
  breachHooks.gate(s, b.map.nodes.gate1);
  b.rewrites.cron = { id: 'warmstart', tier: 1 }; // act 2's: lost with the run
  b.result = 'lost';
  breachHooks.over(s, 'lost');
  const rec = recOf(s, 'pier-5');
  assert.deepEqual(rec.checkpoint, { gate: 1, rewrites: { sshd: { id: 'forgedkeys', tier: 2 }, ledger: { id: 'slushfund', tier: 1 } } });
  assert.equal(b.report.checkpoint, 1);
  leave(s);
  campUi.sel = 'pier-5';
  assert.match(campaignMarkup(s), /data-arg="pier-5:checkpoint"[^>]*>Breach from gate 1/);
  assert.match(campaignMarkup(s), /Checkpoint · gate 1/);
  b = launch(s, 'pier-5', { from: 'checkpoint' });
  assert.equal(b.at, 'gate1');
  assert.deepEqual(b.rewrites, rec.checkpoint.rewrites);
  assert.deepEqual(b.mods, []); assert.deepEqual(b.cves, []);
  assert.ok(reachable(s).length >= 2 && reachable(s).every((n) => n.act === 1 && n.row === 0), 'act 2 is next');
  assert.ok(b.map.nodes.gate1 && b.cleared.gate1);
  // Capturing clears it; from the start ignores it.
  leave(s); s.breach = null;
  assert.equal(launch(s, 'pier-5', { from: 'start' }).at, null);
  s.breach.result = 'won';
  breachHooks.over(s, 'won');
  assert.equal(recOf(s, 'pier-5').checkpoint, null);
});

test('the Archive: fragments in story order whatever order you find them, thread counts, the rest only as a count', () => {
  const s = camp();
  s.camp.archive = ['meridian-14', 'sprawl-00', 'coldstore-3'];
  const a = archiveOf(s);
  assert.deepEqual(a.found.map((f) => f.server), ['sprawl-00', 'coldstore-3', 'meridian-14']);
  assert.deepEqual(a.found.map((f) => f.order), [...a.found.map((f) => f.order)].sort((x, y) => x - y));
  assert.equal(a.missing, FRAGMENTS.length - 3);
  assert.deepEqual(a.threads.find((t) => t.thread === 'LOWLIGHT'), { thread: 'LOWLIGHT', have: 1, of: 3 });
  const html = archiveMarkup(s);
  assert.ok(html.indexOf('SPRAWL-00') < html.indexOf('COLDSTORE-3') && html.indexOf('COLDSTORE-3') < html.indexOf('MERIDIAN-MX-14'));
  assert.match(html, /\d+ still out there/);
  assert.ok(!html.includes(FRAGMENTS.find((f) => f.server === 'kestrel-dc-3').lines[1]), 'a missing fragment never shows');
  for (const f of FRAGMENTS) assert.ok(f.lines.length >= 3 && f.n >= 1 && f.n <= f.of, f.id);
});

// ---------- the pages ----------
test('the card: Resident and Collection, subsystems by act, best result, bounties to take, outputs once held', () => {
  const s = camp();
  hold(s, 'sprawl-00', { ledger: { id: 'slushfund', tier: 1 } });
  campUi.sel = 'coldstore-3';
  let html = campaignMarkup(s);
  assert.match(html, /<h1>COLDSTORE-3<\/h1>/);
  assert.match(html, /VAULT WARDEN/);
  assert.match(html, /0\/2[\s\S]*30% a kill/, 'its Collection');
  assert.match(html, /\/perimeter <b>smtpd, backup<\/b>/);
  assert.match(html, /Conficker/, 'what its first capture opens');
  assert.match(html, /Slush Fund/, 'what your network brings to it');
  assert.equal((html.match(/data-camp="bounty"/g) || []).length, 2);
  assert.match(html, /data-camp="breach" data-arg="coldstore-3:start"[^>]*>Breach</);
  campUi.sel = 'sprawl-00';
  html = campaignMarkup(s);
  assert.match(html, />Re-image</);
  assert.match(html, /Output <small>1\/2/);
  campUi.sel = null;
});

test('the breach page: while you pick a node, the lit nodes show beside the map as cards you can click', () => {
  const s = camp();
  const b = launch(s, 'sprawl-00');
  const html = breachMarkup(s);
  const lit = firstRow(b.map);
  assert.equal((html.match(/class="bx-peek-card/g) || []).length, lit.length);
  for (const n of lit) assert.match(html, new RegExp(`bx-peek-card k-virus" data-breach="go" data-arg="${n.id}"`));
  assert.match(html, /lv 1<\/span><\/span><b>Worm<\/b>/);
  assert.match(html, /SPRAWL-00/);
  assert.ok(!/MERIDIAN/.test(html));
});

// ---------- the bot ----------
test('campaignsim: every class reaches level 10 from level 1 within a bounded number of breaches', { timeout: 600000 }, () => {
  const runs = CLASSES.map((cls) => runCampaign({ cls, seed: 1, to: 10, max: 30 }));
  for (const r of runs) {
    assert.ok(r.level >= 10, `${r.cls} reached ${r.level} in ${r.log.length} breaches`);
    assert.ok(r.log.length <= 26, `${r.cls}: ${r.log.length} breaches to level 10`);
    assert.ok(r.reached[2].breaches <= 2, `${r.cls}: the first level comes fast`);
  }
  const rep = report(runs);
  for (const r of rep) assert.ok(r.win >= 40, `${r.cls} wins ${r.win}% of its breaches`); // campaignsim.mjs prints the full table
  // Loot is a chase (the designer: "WAY too much loot per run"): one to three items banked a breach, and past the first
  // few levels a real upgrade every two or three breaches, not every node.
  const all = runs.flatMap((r) => r.log), mid = all.filter((x) => x.level >= 6);
  const banked = all.reduce((n, x) => n + x.banked, 0) / all.length, ups = mid.reduce((n, x) => n + x.upgrades, 0) / Math.max(1, mid.length);
  assert.ok(banked >= 0.5 && banked <= 3, `${banked.toFixed(2)} items banked a breach`);
  assert.ok(ups >= 0.15 && ups <= 0.8, `${ups.toFixed(2)} upgrades a breach from level 6`);
});
