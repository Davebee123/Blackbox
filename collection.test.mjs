// The collection log (collection.mjs keeps the slots, collection-log.mjs builds the log, collection-view.mjs the Ledger).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, UNIQUES } from './dist/combat.mjs';
import { STRAINS, BOSSES } from './dist/data.mjs';
import { syncSlots, collectionRestore, homeOfUnique, entryOfSlot } from './dist/collection.mjs';
import { logOf, logTotals, syncCollection } from './dist/collection-log.mjs';
import { collectionPageMarkup } from './dist/collection-view.mjs';
import { tickProfile, myProfile } from './dist/profile.mjs';
import { achOf, earned, tickAchievements } from './dist/achievements.mjs';
import { logComms } from './dist/comms.mjs';

const me = () => { const s = fresh(); s.tutorialCompleted = true; s.profile = { handle: 'dana', pwLen: 6, since: 1_700_000_000_000 }; s.hackers = { breaker: { level: 12, xp: 0 } }; return s; };
const events = (s, type, first) => s.logs.filter((e) => e.type === type && e.id > first);

test('the log: families to floors and elsewhere, no daemons, every slot counted once, nothing yours at the start', () => {
  const log = logOf(me()), all = log.flatMap((g) => g.rows);
  assert.deepEqual(log.map((g) => g.id), ['family', 'strain', 'guard', 'boss', 'floor', 'other']);
  assert.ok(all.length >= 50, `${all.length} entries`);
  for (const e of all) {
    const keys = e.sections.flatMap((x) => x.slots.map((y) => y.key));
    assert.equal(new Set(keys).size, keys.length, `${e.key}: a slot once`);
    assert.equal(e.total, keys.length);
    assert.equal(e.have, 0, `${e.key}: empty at the start`);
    assert.ok(e.sections.every((x) => ['unique', 'set', 'mastered', 'beaten', 'feat'].includes(x.kind)), 'daemons have their own log');
  }
  assert.equal(logTotals(log).have, 0);
  // Every unique but a network's own has a place, under its sources.
  const placed = new Set(all.flatMap((e) => e.sections.flatMap((x) => x.slots.map((y) => y.key))));
  for (const u of Object.values(UNIQUES)) if ((u.sources || []).some((x) => x.kind !== 'native')) assert.ok(placed.has(u.id), `${u.id} is in the log`);
  // A strain: its parts to master, and beating it. A boss: beating it.
  const strain = all.find((e) => e.key === 'strain:keylogger'), boss = all.find((e) => e.key === 'boss:relayking');
  assert.ok(strain.sections.some((x) => x.kind === 'mastered') && strain.sections.some((x) => x.kind === 'beaten'));
  assert.ok(boss.sections.find((x) => x.kind === 'beaten').slots[0].key === 'w:relayking');
  assert.ok(boss.sections.find((x) => x.kind === 'feat').slots.some((x) => x.ach === 'c-relayking'), 'its achievement is its feat');
});

test('a slot fills the first time: stamped with the date, one quiet pager line that opens its entry, never twice', () => {
  const s = me(), first = s.serial || 0;
  s.research = { 'keylogger:hook': 60 };
  s.dex.kills = { keylogger: 1 };
  s.dex.won = { relayking: 1 };
  const got = syncSlots(s, 5000);
  assert.deepEqual(got.map(([k]) => k).sort(), ['b:keylogger', 'm:keylogger:hook', 'w:relayking']);
  assert.equal(s.collection['m:keylogger:hook'], 5000);
  const ev = events(s, 'logged', first);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].message, `Collection: ${STRAINS.keylogger.name} beaten, ${BOSSES.relayking.name} beaten, a part mastered.`);
  const [c] = logComms(s, ev);
  assert.deepEqual([c.label, c.beep, c.go], ['Collection', false, 'log:strain:keylogger']);
  assert.deepEqual(syncSlots(s, 6000), [], 'never twice');
  assert.equal(s.collection['m:keylogger:hook'], 5000, 'the first date stays');
  // A unique's line opens the entry that drops it.
  assert.equal(entryOfSlot('w:choir'), 'boss:choir');
  assert.equal(homeOfUnique('crown-packet'), 'boss:relayking');
});

test('an older save: what it has done is stamped quietly, once, from before the log', () => {
  const old = me();
  old.research = { 'ransomware:pulse': 60, 'ransomware:encryptor': 40 };
  old.dex.kills = { keylogger: 3, ransomware: 9 };
  old.dex.won = { repoman: 1 };
  delete old.collection;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.collection['m:ransomware:pulse'], 1);
  assert.equal(s.collection['b:keylogger'], 1);
  assert.equal(s.collection['w:repoman'], 1);
  assert.equal(s.collection['m:ransomware:encryptor'], undefined, 'not mastered yet');
  assert.equal(s.collection['b:ransomware'], undefined, 'a family is not a strain');
  const lines = s.logs.filter((e) => e.type === 'logged');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].message, 'Collection: 3 from your record.');
  const n = s.logs.length;
  collectionRestore(s);
  assert.equal(s.logs.length, n, 'safe to run twice');
});

test('an entry filled: its stamp, the achievement and its title; uniques still count only uniques', () => {
  const s = me();
  const e = logOf(s).flatMap((g) => g.rows).filter((x) => x.total).sort((a, b) => a.total - b.total)[0];
  for (const x of e.sections.flatMap((y) => y.slots)) {
    if (x.kind === 'feat') achOf(s).got[x.ach] = 1;
    else (s.collection ||= {})[x.key] = 1;
  }
  syncCollection(s, 7000);
  assert.ok(s.collection['full:' + e.key], `${e.key} is full`);
  tickAchievements(s);
  assert.ok(earned(s, 'k-log-entry'), 'Full Page');
  assert.ok(myProfile(s).titles.includes('thorough'));
  assert.ok(!earned(s, 'k-collector') || Object.keys(s.collection).filter((k) => UNIQUES[k]).length >= 25, 'the log\'s other slots are not uniques');
  // tickProfile runs it every second once the log is loaded.
  const t = me(); t.dex.won = { relayking: 1 };
  tickProfile(t);
  assert.ok(t.collection['w:relayking']);
});

test('the Ledger: tabs, the index with counts and bars, ??? with a hint, the date it first came', () => {
  const s = me();
  s.floors = { reached: 1 };
  const id = Object.values(UNIQUES).find((u) => (u.sources || []).some((x) => x.kind === 'vault' && x.layer === 1)).id;
  s.collection = { [id]: new Date(2026, 5, 25).getTime() };
  const h = collectionPageMarkup(s, 'floor:1');
  assert.match(h, /data-codex-tab="log" aria-selected="true" class="on">Collection <small>1\/\d+<\/small>/);
  assert.match(h, /data-log="floor:1" aria-current="true"/);
  assert.match(h, /class="lg-bar thin"/);
  assert.match(h, new RegExp(`${UNIQUES[id].name}</b>.*?<time>Jun 25</time>`));
  assert.match(h, /<b class="unk">\?\?\?<\/b><small class="lg-hint">Lv \d+ · Vaults<\/small>/);
  assert.ok(!/undefined|NaN|null/.test(h.replace(/data-[a-z-]+="[^"]*"/g, '')), 'no holes');
});
