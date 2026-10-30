// Achievements (dist/achievements.mjs, dist/achievements-view.mjs): one system for the titles and stickers, a table of
// achievements by category, each checked against state the game already keeps or noted as a fight ends, and an old
// save keeping everything it had.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, emit, command, selectEncounter, finish, active, SAVE_VERSION } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { BOSSES, ARCHETYPES, DAEMONS } from './dist/data.mjs';
import { SETS, piecesOf } from './dist/sets.mjs';
import { FACTION_IDS } from './dist/factions.mjs';
import { PIECES } from './dist/faction-gear.mjs';
import { titles, myProfile, stickersOf, tickProfile, fingerOf, stickerById, REWARD_BANNERS, setBanner } from './dist/profile.mjs';
import { achievements, CATEGORIES, POINTS, achOf, earned, tickAchievements, fightOver, achievementsRestore, pointsOf, totalPoints, shownAchievements, achById, bannersOf } from './dist/achievements.mjs';
import { achievementsMarkup, achRow } from './dist/achievements-view.mjs';
import { systemMarkup } from './dist/view.mjs';
import { profileMarkup } from './dist/profile-view.mjs';
import { logComms } from './dist/comms.mjs';
import { tickChannel, channelOf } from './dist/channel.mjs';

const me = () => { const s = fresh(); s.tutorialCompleted = true; s.profile = { handle: 'dana', pwLen: 6, since: 1_700_000_000_000 }; s.hackers = { breaker: { level: 12, xp: 0 } }; return s; };
const got = (s) => Object.keys(achOf(s).got);
const since = (s, first) => s.logs.filter((e) => e.id > first);
// A won fight's end, as the engine hands it over (combat.mjs finish → fightOver).
const won = (s, e = {}) => fightOver(s, { cycle: 6, virus: { name: 'X', family: 'ransomware', parts: [], ...(e.virus || {}) }, ...e, metrics: { attackDamage: 5, ...(e.metrics || {}) } }, 'victory');

test('the table: 60 to 90 of them in eight categories, WoW points, names that read as titles, rules in one sentence', () => {
  const all = achievements();
  assert.ok(all.length >= 60 && all.length <= 100, `${all.length} achievements`);
  assert.equal(new Set(all.map((a) => a.id)).size, all.length, 'ids are unique');
  assert.deepEqual(CATEGORIES.map((c) => c.name), ['Combat', 'Exploration', 'Collection', 'Factions', 'Classes', 'Daemons', 'Co-op', 'Feats']);
  for (const c of CATEGORIES) assert.ok(all.filter((a) => a.cat === c.id).length >= 4, `${c.name} has a few`);
  for (const a of all) {
    assert.ok(CATEGORIES.some((c) => c.id === a.cat), a.id);
    assert.ok(POINTS.includes(a.pts), `${a.id}: ${a.pts} points`);
    // The name is the tooltip's title (app.js ttShow bolds "Name: rest"): no colon or full stop, 40 characters at most.
    assert.match(a.name, /^[^:.\n]{2,40}$/, a.id);
    assert.ok(!/hack|breach|intru|keyhole|way in|backdoor|exploit/i.test(a.name), `${a.name}: no intrusion metaphors`);
    // One sentence, sentence case, numerals, no semicolons or colon chains.
    assert.match(a.rule, /^[A-Z].*\.$/, a.id);
    assert.ok(!/;/.test(a.rule) && (a.rule.match(/:/g) || []).length <= 1, `${a.id}: ${a.rule}`);
    assert.ok(!/\b(two|three|four|five|ten|twenty)\b/.test(a.rule), `${a.id}: numerals, not words`);
    if (a.hidden) assert.match(a.hint || '', /^[A-Z].{5,60}\.$/, `${a.id}: a hidden one has a one-line hint`);
  }
  assert.ok(all.filter((a) => a.hidden).length >= 2, 'some are hidden');
  assert.ok(all.filter((a) => a.progress).length >= 20, 'a mix: milestones with progress');
  assert.ok(all.filter((a) => a.cat === 'feat').length >= 6, 'and feats');
  assert.ok(!all.some((a) => /\b(today|this week|event ends|limited|before)\b/i.test(a.rule)), 'nothing time-limited');
});

test('every check runs on a fresh state, a restored one and an empty object without throwing, and none is earned at the start', () => {
  for (const s of [fresh(), restore(JSON.parse(JSON.stringify(fresh()))), me(), { logs: [], serial: 0 }]) {
    for (const a of achievements()) {
      assert.doesNotThrow(() => a.has(s), a.id);
      if (a.progress) { const p = a.progress(s); assert.ok(Array.isArray(p) && p[1] > 0 && p[0] >= 0 && p[0] <= p[1], a.id); }
    }
  }
  const s = me();
  assert.deepEqual(tickAchievements(s), [], 'a new hacker has none');
  assert.deepEqual(got(s), []);
  assert.doesNotThrow(() => fightOver(s, null, 'victory'));
  assert.doesNotThrow(() => fightOver(s, { metrics: {}, virus: { parts: null } }, 'victory'), 'a fight end never breaks on an achievement');
});

test('one system: every title and every sticker is an achievement\'s reward, earned by the same deed', () => {
  const all = achievements();
  for (const t of titles()) assert.equal(all.filter((a) => a.reward?.title === t.id).length, 1, `${t.name} comes from one achievement`);
  // A hacker who has done everything a sticker is for: each of their stickers is some achievement's reward.
  const s = me();
  s.standing = Object.fromEntries(FACTION_IDS.map((f) => [f, 80]));
  s.collection = Object.fromEntries(Object.keys(SETS).flatMap((id) => piecesOf(id)).map((u) => [u, 1]));
  s.floors = { reached: 8 };
  s.dex.won = Object.fromEntries(Object.keys(BOSSES).map((b) => [b, 1]));
  tickProfile(s);
  const stickers = stickersOf(s).map((x) => x.id), rewards = new Set(all.map((a) => a.reward?.sticker).filter(Boolean));
  assert.ok(stickers.length >= 40);
  for (const id of stickers) assert.ok(rewards.has(id), `${id} is a reward`);
  for (const id of rewards) assert.ok(stickerById(id), `${id} can be shown before it's earned`);
  // And every title the deeds give went to the hacker with its achievement.
  for (const id of ['uncrowner', 'repossessor', 'lastnote', 'farmhand', 'lairborn', 'matched', 'deepwalker', 'of-kestrel']) assert.ok(myProfile(s).titles.includes(id), id);
});

test('earning: one quiet pager line that opens it, a #net line, the title it brings, and never twice', () => {
  const s = me();
  s.dex.won = { relayking: 1 };
  channelOf(s); // #net is listening from here
  const first = s.serial;
  tickProfile(s);
  const ev = since(s, first).filter((e) => e.type !== 'logged'); // the collection log's line (collection.mjs) comes too
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, 'achievement');
  assert.equal(ev[0].message, 'Achievement: Uncrowned.');
  const [c] = logComms(s, ev);
  assert.deepEqual([c.label, c.beep, c.go], ['Achievement', false, 'achieve:c-relayking'], 'a pager line, no beep, it opens the achievement');
  assert.ok(myProfile(s).titles.includes('uncrowner'), 'its reward: the title');
  assert.ok(earned(s, 'c-relayking'));
  tickChannel(s, 1000);
  const line = channelOf(s).lines.find((l) => l.kind === 'feat');
  assert.equal(line.text, 'earned [Uncrowned] and is now Uncrowner.');
  tickProfile(s);
  assert.equal(since(s, ev[0].id).filter((e) => e.type === 'achievement').length, 0, 'earned once');
  // Several at once: one line, and #net names the one that brought the title.
  s.floors.reached = 5; s.loadout.sub = { breaker: 'demolitionist' };
  tickProfile(s);
  tickChannel(s, 1000);
  assert.equal(channelOf(s).lines.filter((l) => l.kind === 'feat').at(-1).text, 'earned [Core Sample] and is now Deepwalker.');
  assert.equal(pointsOf(s), ['c-relayking', 'x-floor-2', 'x-floor-3', 'x-floor-4', 'x-floor-5', 'cl-sub'].reduce((n, id) => n + achById(id).pts, 0));
});

test('Combat: a boss beaten, a hundred fights won and elites counted as fights end', () => {
  const s = me();
  s.dex.kills = { ransomware: 60, worm: 39 };
  tickAchievements(s);
  assert.ok(!earned(s, 'c-win-100'));
  assert.deepEqual(achById('c-win-100').progress(s), [99, 100]);
  s.dex.kills.worm++;
  for (let i = 0; i < 25; i++) won(s, { virus: { elite: true }, party: 2 });
  tickAchievements(s);
  for (const id of ['c-win-100', 'c-elites']) assert.ok(earned(s, id), id);
  s.dex.won = { 'nb-deadbolt': 1 };
  tickAchievements(s);
  for (const id of ['c-lairborn', 'c-nb-deadbolt']) assert.ok(earned(s, id), id);
});

test('Exploration: floors, a server Mapped and taken over (the log counts each takeover)', () => {
  const s = me();
  s.floors = { reached: 3 };
  s.locations = [{ id: 'a', name: 'A', floorplan: { mapped: 1 }, takenOver: true }];
  tickAchievements(s);
  for (const id of ['x-floor-2', 'x-floor-3', 'x-mapped', 'x-taken']) assert.ok(earned(s, id), id);
  assert.ok(!earned(s, 'x-floor-4'));
  for (let i = 0; i < 10; i++) emit(s, 'takeover', 'TAKEN OVER.', { location: 'b' + i });
  tickAchievements(s);
  assert.ok(earned(s, 'x-taken-10'), 'ten takeovers, counted from the log');
});

test('Collection: a set completed brings its sticker and the Matched title', () => {
  const s = me();
  const set = Object.values(SETS).find((x) => !x.tier);
  s.collection = Object.fromEntries(piecesOf(set.id).map((u) => [u, 1]));
  tickAchievements(s);
  for (const id of ['k-first', 'k-matched', 'k-set-' + set.id]) assert.ok(earned(s, id), id);
  assert.ok(stickersOf(s).some((x) => x.id === 'set-' + set.id));
  s.collection[Object.values(PIECES)[0].id] = 1;
  tickAchievements(s);
  assert.ok(earned(s, 'k-assembler'));
});

test('Factions: a faction\'s top tier, and contracts delivered as the log says', () => {
  const s = me();
  s.standing = { kestrel: 75 };
  for (let i = 0; i < 25; i++) emit(s, 'contract-done', 'DELIVERED: x.', { contract: i });
  tickAchievements(s);
  for (const id of ['f-kestrel', 'f-contracts']) assert.ok(earned(s, id), id);
  assert.ok(myProfile(s).titles.includes('of-kestrel'));
});

test('Classes: a subclass picked, every class to 10, a tier set', () => {
  const s = me();
  s.hackers = Object.fromEntries(Object.keys(ARCHETYPES).map((c) => [c, { level: 10, xp: 0 }]));
  s.loadout.sub = { breaker: 'demolitionist' };
  tickAchievements(s);
  for (const id of ['cl-sub', 'cl-ten']) assert.ok(earned(s, id), id);
  const tier = Object.values(SETS).find((x) => x.tier);
  s.collection = Object.fromEntries(piecesOf(tier.id).map((u) => [u, 1]));
  tickAchievements(s);
  assert.ok(earned(s, 'cl-set-' + tier.id));
  s.loadout.sub = { breaker: 'warden' };
  assert.ok(!achById('cl-sub').has({ ...s, loadout: { sub: { breaker: 'warden' } } }), 'a subclass of another class is no pick');
});

test('Daemons: ten found, four slotted, and what they do in fights', () => {
  const s = me();
  const ids = Object.keys(DAEMONS).slice(0, 10);
  s.daemonLv = Object.fromEntries(ids.map((id) => [id, 5]));
  s.daemons = ids.slice(0, 4);
  won(s, { metrics: { daemon: 12 } });
  tickAchievements(s);
  for (const id of ['d-ten', 'd-slots', 'd-feat']) assert.ok(earned(s, id), id);
  assert.deepEqual(achById('d-acts').progress(s), [12, 500]);
});

test('Co-op: a fight won with a crew, a full crew, a consortium member dropping in', () => {
  const s = me();
  won(s, { party: 2 });
  tickAchievements(s);
  assert.ok(earned(s, 'o-crew'));
  assert.ok(!earned(s, 'o-full'));
  won(s, { party: 4 });
  won(s, { party: 3, guests: ['kilo'] });
  tickAchievements(s);
  for (const id of ['o-full', 'o-dropin']) assert.ok(earned(s, id), id);
});

test('Feats: one fight\'s tricks, noted by the engine as the fight ends (a real fight, through finish)', () => {
  const s = me();
  selectEncounter(s, 'cryptjack', 1, { level: 1 });
  command(s, 'engage');
  assert.ok(active(s));
  const e = s.encounter;
  assert.ok(e.serial0 >= 0, 'the fight knows where its log starts');
  e.cycle = 9;
  for (const p of e.virus.parts) { p.integrity = 0; emit(s, 'broken', `${p.name} BROKEN.`, { target: p.id }); }
  finish(s, 'victory');
  tickAchievements(s);
  assert.ok(earned(s, 't-untouched'), 'nothing got through in 9 cycles');
  assert.equal(earned(s, 't-chain'), e.virus.parts.filter((p) => p.kind !== 'fragment').length >= 3, 'every part in the last cycle');
  // The rest, from what the fight's metrics say.
  const t = me();
  won(t, { metrics: { cuts: 3 } });
  won(t, { virus: { elite: true } });
  won(t, { cleanRead: true, metrics: { tells: { a: { said: 2, read: 2 }, b: { said: 2, read: 2 } } } });
  t.server.integrity = 2; won(t);
  tickAchievements(t);
  for (const id of ['t-cuts', 't-solo', 't-read', 't-thread']) assert.ok(earned(t, id), id);
  // A routine you made, that fired and never threw.
  t.programs = { by: { breaker: { routines: { ransomware: { confirmed: true, handlers: [] } } } } };
  won(t, { metrics: { program: 4 } });
  tickAchievements(t);
  assert.ok(!earned(t, 't-program'), 'it has to fire 5 times');
  won(t, { metrics: { program: 6 }, program: { thrown: { 'part:x': 3 } } });
  tickAchievements(t);
  assert.ok(!earned(t, 't-program'), 'an exception spoils it');
  won(t, { metrics: { program: 6 } });
  tickAchievements(t);
  assert.ok(earned(t, 't-program'));
  // A loss counts for nothing (and is never held against you).
  const u = me();
  fightOver(u, { cycle: 30, virus: { elite: true, parts: [] }, metrics: { attackDamage: 0, cuts: 5 } }, 'crashed');
  assert.deepEqual(u.achievements.flags, {});
  // No Rest: the visit that Mapped it never rested.
  u.locations = [{ id: 'a', floorplan: { mapped: 1, mappedRest: true } }];
  tickAchievements(u);
  assert.ok(!earned(u, 't-norest'));
  u.locations.push({ id: 'b', floorplan: { mapped: 2, mappedRest: false } });
  tickAchievements(u);
  assert.ok(earned(u, 't-norest'));
});

test('an old save keeps every title and sticker it has, and gets their achievements on load, quietly', () => {
  const s = restore(JSON.parse(JSON.stringify(me()))); // a save as the game writes it (its network and floors' seeds set)
  delete s.achievements; // from before achievements
  s.profile.titles = ['uncrowner', 'patient'];
  s.profile.title = 'patient';
  s.floors.reached = 3;
  s.standing = { lantern: 80 };
  delete s.achievements;
  const before = stickersOf(s).map((x) => x.id);
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(r.profile.titles.slice(0, 2), ['uncrowner', 'patient'], 'titles kept, in order');
  assert.equal(r.profile.title, 'patient', 'the one shown stays');
  assert.deepEqual(stickersOf(r).map((x) => x.id), before, 'stickers kept');
  for (const id of ['c-relayking', 'c-patient', 'x-floor-2', 'x-floor-3', 'f-lantern']) assert.ok(earned(r, id), id);
  assert.ok(myProfile(r).titles.includes('of-lantern'), 'a title it had the deed for');
  const first = r.serial;
  tickProfile(r);
  const ev = since(r, first);
  assert.equal(ev.length, 1, 'one line for the whole record');
  assert.match(ev[0].message, /^Achievements: \d+ earned from your record\.$/);
  tickChannel(r, 1000);
  assert.ok(!channelOf(r).lines.some((l) => /record/.test(l.text)), '#net says nothing about it');
  // Loading it again changes nothing, and a title with no achievement yet (a save mid-way) gets it.
  const again = restore(JSON.parse(JSON.stringify(r)));
  assert.deepEqual(again.achievements.got, r.achievements.got);
  again.profile.titles.push('tracker');
  achievementsRestore(again);
  assert.ok(earned(again, 'f-hunts'));
});

test('the page: categories with totals, earned with a date, progress in amber, hidden ones as ??? with a hint, rules in tooltips', () => {
  const s = me();
  s.dex.won = { relayking: 1 };
  s.dex.kills = { worm: 12 };
  tickAchievements(s);
  const html = achievementsMarkup(s, { cat: 'combat' });
  for (const c of CATEGORIES) assert.ok(html.includes(`data-ach-cat="${c.id}"`), c.id);
  assert.match(html, /data-ach="c-relayking"[^>]*title="Uncrowned: Beat RELAY-KING\. 10 points\. Rewards the title Uncrowner\. Earned /);
  assert.match(html, /class="ach-row got"/);
  assert.match(html, /class="ach-row part"[^>]*data-ach="c-win-100"/);
  assert.match(html, /<small>12\/100<\/small>/);
  assert.match(html, /data-ach="c-choir" title="\?\?\?: Something on the net is singing\."/);
  assert.ok(!html.includes('Dead Air'), 'a hidden name stays hidden');
  assert.match(html, /<h3 class="ach-group">Lairs<\/h3>/);
  assert.match(achievementsMarkup(s, {}), /<h2>Achievements<\/h2>/, 'the summary');
  assert.match(achRow(s, achById('c-relayking'), 'c-relayking'), /ach-row got focus/, 'the one a pager line opened is lit');
  // On the System page, a tab beside Settings.
  assert.match(systemMarkup(s), /data-stab="achievements"/);
  assert.match(systemMarkup(s, { tab: 'achievements', ach: { cat: 'feat' } }), /<h2>Feats<\/h2>/);
  // A view never writes the save.
  const t = me(), snap = JSON.stringify(t);
  achievementsMarkup(t, { cat: 'class' }); systemMarkup(t, { tab: 'achievements' });
  assert.equal(JSON.stringify(t), snap);
});

test('the card: your points and the ones you pinned or earned last; pin and unpin by name', () => {
  const s = me();
  s.dex.won = { relayking: 1, repoman: 1 };
  s.floors = { reached: 2 };
  tickAchievements(s);
  const f = fingerOf(s);
  assert.equal(f.points, pointsOf(s));
  assert.equal(f.achievements.length, 3);
  assert.ok(play(s, 'achieve pin uncrowned').some((e) => e.type === 'info'));
  assert.equal(shownAchievements(s)[0].id, 'c-relayking');
  assert.ok(play(s, 'achieve pin dead air').some((e) => e.type === 'warning'), 'only an earned one');
  const html = profileMarkup(s, 'dana');
  assert.match(html, /class="pf-pts"[^>]*>.*<b>\d+<\/b>/);
  assert.match(html, /data-go="achieve:c-relayking"/);
  play(s, 'achieve unpin uncrowned');
  assert.deepEqual(achOf(s).pins, []);
  assert.match(play(s, 'achievements').at(-1).message, /^Achievements: \d+ of \d+, \d+ points\.$/);
  assert.ok(totalPoints() > pointsOf(s));
});

test('a banner is an achievement\'s reward: dim until earned, then yours to pick', () => {
  const s = me();
  setBanner(s, 'crown');
  assert.equal(myProfile(s).banner, 'crt', 'not earned yet');
  assert.match(profileMarkup(s, 'dana', { tab: 'banner' }), /pf-preset locked/);
  s.dex.won = Object.fromEntries(['relayking', 'repoman', 'choir', 'foreman', 'heatsink', 'coldwallet'].map((b) => [b, 1]));
  tickAchievements(s);
  assert.ok(bannersOf(s).includes('crown'));
  setBanner(s, 'crown');
  assert.equal(myProfile(s).banner, 'crown');
  assert.deepEqual(fingerOf(s).banner, REWARD_BANNERS.crown.rows);
  for (const b of Object.values(REWARD_BANNERS)) for (const r of b.rows) assert.ok(r.length <= 24 && /^[\x20-\x7e]*$/.test(r), r);
});
