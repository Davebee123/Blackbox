// The profile card (profile.mjs): banners, titles from deeds, the .plan, finger on you and on a simulated hacker, old saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, emit, hooks, UNIQUES, SAVE_VERSION } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { PRESENCE, profileOf as simOf } from './dist/presence.mjs';
import { BANNERS, BANNER_IDS, PROFILE, checkBanner, setBanner, titles, titleById, tickProfile, myProfile, shownTitle, fingerOf, stickersOf, simCard, simTitle, voice } from './dist/profile.mjs';
import { logComms } from './dist/comms.mjs';
import { profileMarkup } from './dist/profile-view.mjs';

const me = () => { const s = fresh(); s.tutorialCompleted = true; s.profile = { handle: 'dana', pwLen: 6, since: 1_700_000_000_000 }; s.hackers = { breaker: { level: 14, xp: 0 }, bastion: { level: 6, xp: 0 } }; return s; };
const earned = (s) => myProfile(s).titles;

test('banners: twelve presets, each at most 4 rows of 24 plain characters', () => {
  assert.equal(BANNER_IDS.length, 12);
  for (const [id, b] of Object.entries(BANNERS)) {
    assert.ok(b.rows.length <= PROFILE.rows, id);
    for (const r of b.rows) { assert.ok(r.length <= PROFILE.cols, `${id}: ${r}`); assert.match(r, /^[\x20-\x7e]*$/, id); }
    assert.deepEqual(checkBanner(b.rows.join('\n')).rows.length > 0, true, `${id} passes its own check`);
  }
});

test('your own banner: validated and trimmed', () => {
  assert.deepEqual(checkBanner('\n  /\\_/\\   \n ( o.o )\n\n').rows, ['  /\\_/\\', ' ( o.o )'], 'blank rows and trailing spaces go');
  assert.match(checkBanner('a\nb\nc\nd\ne').error, /4 rows/);
  assert.match(checkBanner('x'.repeat(25)).error, /24 characters/);
  assert.ok(checkBanner('x'.repeat(24)).rows);
  assert.match(checkBanner('héllo').error, /Plain/);
  assert.match(checkBanner('a\tb').error, /Plain/);
  assert.match(checkBanner('   \n  ').error, /Draw/);
  const s = me();
  setBanner(s, ' >_ dana\n[____]');
  assert.deepEqual(myProfile(s).banner, [' >_ dana', '[____]']);
  setBanner(s, 'x'.repeat(30));
  assert.deepEqual(myProfile(s).banner, [' >_ dana', '[____]'], 'a bad drawing changes nothing');
  play(s, 'banner moth');
  assert.equal(myProfile(s).banner, 'moth');
  assert.ok(play(s, 'banner skull').some((e) => e.type === 'warning'), 'only the presets by name');
  assert.deepEqual(fingerOf(s).banner, BANNERS.moth.rows);
});

test('titles come only from their deeds, one pager line, and you pick the one to show', () => {
  const s = me();
  tickProfile(s);
  assert.deepEqual(earned(s), [], 'a fresh hacker has none');
  s.reports = [{ result: 'victory', cycles: 19 }, { result: 'crashed', cycles: 40 }];
  tickProfile(s);
  assert.deepEqual(earned(s), [], '19 cycles is not patient, and a loss is not a win');
  s.reports.push({ result: 'victory', cycles: 20 });
  const first = s.serial;
  tickProfile(s);
  assert.deepEqual(earned(s), ['patient']);
  const ev = s.logs.filter((e) => e.id > first);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, 'achievement', 'a title is an achievement\'s reward (achievements.mjs): its line says the achievement');
  assert.deepEqual([ev[0].achievements, ev[0].titles], [['c-patient'], ['patient']]);
  const [c] = logComms(s, ev);
  assert.equal(c.label, 'Achievement');
  assert.equal(c.go, 'achieve:c-patient', 'it opens the achievement');
  assert.equal(c.beep, false, 'a small pager moment: a line, no beep');
  assert.equal(shownTitle(s).id, 'patient', 'shown until you pick another');
  tickProfile(s);
  assert.equal(s.serial, ev[0].id, 'earned once');
  // Feuds: only a feud won counts (a runner beaten mid-feud has no winner).
  for (let i = 0; i < 4; i++) emit(s, 'world-event-won', 'won', { card: 'feud', sides: ['halcyon', 'glassjaw'], winner: 'halcyon' });
  for (let i = 0; i < 6; i++) emit(s, 'world-event-won', 'beat a runner', { card: 'feud', name: 'Halcyon vs GLASSJAW' });
  tickProfile(s);
  assert.ok(!earned(s).includes('feudbreaker'), 'four feuds');
  emit(s, 'world-event-won', 'won', { card: 'feud', sides: ['halcyon', 'glassjaw'], winner: 'halcyon' });
  tickProfile(s);
  assert.ok(earned(s).includes('feudbreaker'), 'five');
  // A faction's top tier, a boss, a floor.
  s.standing = { halcyon: 74, kestrel: 75 };
  s.dex.won = { repoman: 1 };
  s.floors = { reached: 5 };
  tickProfile(s);
  for (const id of ['of-kestrel', 'repossessor', 'deepwalker']) assert.ok(earned(s).includes(id), id);
  assert.ok(!earned(s).includes('of-halcyon'), '74 is not the top tier');
  // Pick: only an earned one; off shows none.
  assert.ok(play(s, 'title collector').some((e) => e.type === 'warning'), 'not earned');
  play(s, 'title feudbreaker');
  assert.equal(shownTitle(s).name, 'Feudbreaker');
  play(s, 'title of kestrel');
  assert.equal(shownTitle(s).id, 'of-kestrel');
  play(s, 'title off');
  assert.equal(shownTitle(s), null);
  for (const t of titles()) { assert.ok(t.rule.endsWith('.'), t.id); assert.ok(!/hack|breach|exploit|intru|crack/i.test(t.name), `${t.name}: no intrusion words`); }
});

test('the plan: one line, 60 characters at most, as typed', () => {
  const s = me();
  play(s, 'plan Farming KESSLER until it Drops.');
  assert.equal(myProfile(s).plan, 'Farming KESSLER until it Drops.', 'capitals kept');
  const ok = 'x'.repeat(PROFILE.plan);
  play(s, 'plan ' + ok);
  assert.equal(myProfile(s).plan, ok);
  assert.ok(play(s, 'plan ' + ok + 'y').some((e) => e.type === 'warning'));
  assert.equal(myProfile(s).plan, ok, 'too long changes nothing');
  play(s, 'plan clear');
  assert.equal(myProfile(s).plan, '');
});

test('finger on you: banner, title, plan, classes, pieces, marks and stickers', () => {
  const s = me();
  s.standing = { halcyon: 30, kestrel: 80 };
  s.floors = { reached: 3 };
  s.dex.won = { 'nb-deadbolt': 1 };
  const u = Object.values(UNIQUES).find((x) => x.level <= 14 && !x.faction);
  s.stash.push({ kind: 'protocol', unique: u.id, name: u.name, level: 14, rarity: 'zeroday', stats: { damage: 5 }, id: 'g1' });
  tickProfile(s);
  play(s, 'plan back at nine');
  const out = play(s, 'finger');
  const f = out.find((e) => e.finger);
  assert.equal(f.finger, 'dana');
  assert.match(f.message, /^Login: dana · /);
  const card = fingerOf(s, 'dana');
  assert.deepEqual(card.classes.map((c) => [c.cls, c.level]), [['breaker', 14], ['bastion', 6]]);
  assert.deepEqual(card.pieces.map((p) => p.name), [u.name]);
  assert.ok(card.marks.some((m) => m.f === 'kestrel' && m.tier === 4));
  assert.deepEqual(stickersOf(s).map((x) => x.id), ['f-kestrel', 'floor-2', 'floor-3', 'lair-nb-deadbolt']);
  assert.equal(card.title, shownTitle(s).name);
  const html = profileMarkup(s, 'dana');
  for (const bit of ['pf-banner', 'pf-class', 'pglyph', 'pf-mark', 'pf-sticker', 'back at nine', 'data-pf-tab']) assert.ok(html.includes(bit), bit);
});

test('finger on a simulated hacker: a believable person, the same every time, only while they can be met', () => {
  const s = me();
  assert.ok(play(s, 'finger nyx').some((e) => e.type === 'warning'), 'nobody there without online sim');
  play(s, 'online sim');
  for (const h of PRESENCE.pool) {
    const a = simCard(s, h), b = fingerOf(s, h), p = simOf(h);
    assert.deepEqual(JSON.stringify(a), JSON.stringify(b), 'deterministic');
    assert.ok(BANNER_IDS.some((id) => BANNERS[id].rows === a.banner), 'a preset banner');
    assert.equal(a.classes[0].level, p.level);
    const t = simTitle(h);
    if (t) { assert.ok(t.lv <= p.level, `${h}: ${t.name} fits level ${p.level}`); assert.equal(a.title, t.name); }
    assert.ok(a.plan.length > 0 && a.plan.length <= 70, a.plan);
    for (const it of a.pieces) { assert.ok(UNIQUES[it.unique], it.name); assert.ok(UNIQUES[it.unique].level <= p.level); }
  }
  const out = play(s, 'finger nyx');
  assert.equal(out.find((e) => e.finger)?.finger, 'nyx');
  assert.ok(profileMarkup(s, 'nyx').includes('Add friend'));
  assert.ok(play(s, 'finger nobody-here').some((e) => e.type === 'warning'));
});

test('a voice: the same hacker always sounds the same; [item links] keep their capitals', () => {
  const h = PRESENCE.pool.find((x) => voice(x, 'Hello').startsWith('hello'));
  assert.ok(h, 'someone types in lower case');
  assert.equal(voice(h, 'Got [Boot Sector] in Process 3', 1), voice(h, 'Got [Boot Sector] in Process 3', 1));
  assert.ok(voice(h, 'Got [Boot Sector] in Process 3', 1).includes('[Boot Sector]'));
});

test('an old save loads: the new fields start empty, nothing to migrate', () => {
  const old = fresh();
  old.profile = { handle: 'veteran', pwLen: 8, since: 1_600_000_000_000 };
  old.hackers = { operator: { level: 30, xp: 0 } };
  delete old.channel;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.profile.handle, 'veteran');
  hooks.now = () => 1_800_000_000_000;
  try { tickNetwork(s, 1_800_000_000_000); tickNetwork(s, 1_800_000_001_000); } finally { hooks.now = null; }
  const p = myProfile(s);
  assert.deepEqual([p.plan, p.banner, p.titles], ['', 'crt', []]);
  assert.deepEqual(s.channel.lines, []);
  assert.equal(fingerOf(s).handle, 'veteran');
  assert.ok(titleById('max-operator'));
});
