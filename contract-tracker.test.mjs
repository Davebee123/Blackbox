// The map's contract tracker (view.mjs contractTracker, trackedJobs): the contracts you hold, under the threat rail,
// each with its name, whose it is and its progress; a click centres the map on its server and selects it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, command, hooks } from './dist/combat.mjs';
import { initMail, openContracts, offer, xpOf, MAIL } from './dist/mail.mjs';
import { mapMarkup, trackedJobs } from './dist/view.mjs';

let clock = 1_700_000_000_000;
hooks.now = () => clock;
// A level-12 character with the board open and one traced server.
function setup() {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level: 12, xp: 0 } };
  command(s, 'developer location ransomware');
  const loc = s.locations[0];
  initMail(s, clock); s.mail.boardOpen = true; s.mail.offers = []; s.mail.jobs = []; s.mail.story = 99;
  return { s, loc };
}
const tracker = (html) => html.match(/<section class="ctrack"[\s\S]*?<\/section>/)?.[0] || '';
const rows = (html) => [...tracker(html).matchAll(/<button type="button" class="ct-row[^"]*"[\s\S]*?<\/button>/g)].map((m) => m[0]);
const unesc = (x) => x.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('no contracts, no tracker', () => {
  const { s } = setup();
  assert.equal(tracker(mapMarkup(s)), '');
  assert.deepEqual(trackedJobs(s), []);
});

test('only the contracts you hold: not the board, not the delivered ones', () => {
  const { s, loc } = setup();
  s.mail.jobs.push(
    { id: 1, type: 'kill', family: 'ransomware', count: 5, got: 3, level: 12, from: 'Halcyon Mutual · Claims', reward: { credits: 90, xp: 40 } },
    { id: 2, type: 'takeover', loc: loc.id, from: 'Halcyon Mutual · Claims', reward: { credits: 200 } },
    { id: 3, type: 'item', loc: loc.id, file: 'ledger.db', from: 'wick · LOWLIGHT', faction: 'halcyon', reward: { credits: 60 } },
    { id: 4, type: 'kill', family: 'ransomware', count: 2, got: 2, level: 12, from: 'Halcyon Mutual · Claims', reward: { credits: 10 }, done: true },
  );
  offer(s, clock);
  assert.ok(s.mail.offers.length, 'something on the board');
  const html = mapMarkup(s);
  assert.equal(rows(html).length, 3, 'three held, the delivered one and the offer left out');
  assert.deepEqual(trackedJobs(s).map((j) => j.id), openContracts(s).map((c) => c.id));
  assert.match(tracker(html), new RegExp(`Contracts<small>3/${MAIL.take}</small>`), 'the kicker counts them against the hand');
  // Its name, who it's for and its progress, on the row itself.
  const [kill, take, item] = rows(html);
  assert.match(kill, /<b>Kill 5 Ransomware viruses, Lv 8\+<\/b>/);
  assert.match(kill, /Halcyon Mutual · Claims/);
  assert.match(kill, /ct-say">3\/5 viruses killed</, 'a count as its numbers and words, not pips');
  assert.match(take, new RegExp(`Take over ${loc.name}`));
  assert.match(take, /ct-say">Vault shut</, 'anything else as its few words');
  assert.match(item, /<b>Recover ledger\.db<\/b>/);
  assert.match(item, /wick · LOWLIGHT/);
  assert.match(item, new RegExp(`In the vault on ${loc.name}`));
  // Delivered: it leaves the map.
  s.mail.jobs[0].done = true;
  assert.equal(rows(mapMarkup(s)).length, 2);
});

test('a long count is a bar and n/N; a done one turns in at a click, in green', () => {
  const { s } = setup();
  s.mail.jobs.push({ id: 1, type: 'kill', family: 'ransomware', count: 12, got: 9, level: 12, from: 'Halcyon Mutual · Claims', reward: { credits: 90 } });
  let [row] = rows(mapMarkup(s));
  assert.match(row, /<span class="ct-bar"><i style="width:75%"><\/i><\/span><small class="ct-n">9\/12<\/small>/);
  s.mail.jobs[0].got = 12;
  [row] = rows(mapMarkup(s));
  assert.match(row, /class="ct-row ready/);
  assert.match(row, /<span class="ct-turn">Turn in<\/span>/);
  assert.match(row, /data-command="mail deliver 1"/, 'a click turns it in');
  assert.match(fs.readFileSync('dist/style.css', 'utf8'), /\.ct-row\.ready \{[^}]*var\(--ready\)/, 'a green border');
});

test('a click centres the map on its server and selects it; with no server, it opens in Mail', () => {
  const { s, loc } = setup();
  s.mail.jobs.push(
    { id: 1, type: 'takeover', loc: loc.id, from: 'Halcyon Mutual · Claims', reward: { credits: 200 } },
    { id: 2, type: 'kill', family: 'ransomware', count: 4, got: 0, level: 12, from: 'Halcyon Mutual · Claims', reward: { credits: 90 } },
    { id: 3, type: 'bounty', name: 'GRAVEMIND', from: 'Halcyon Mutual · Claims', reward: { credits: 90 } },
  );
  const [take, kill, bounty] = rows(mapMarkup(s));
  assert.match(take, new RegExp(`data-locate="${loc.id}"`), 'its server, through the map\'s Locate');
  assert.doesNotMatch(take, /data-go=/);
  assert.match(kill, /data-go="mail:j2"/, 'no server: its letter in Mail');
  assert.match(bounty, /data-locate="sprawl"/, 'a bounty lives in SPRAWL-00');
  // The selected server's contract is lit.
  assert.match(rows(mapMarkup(s, loc.id))[0], /class="ct-row on"/);
  assert.doesNotMatch(rows(mapMarkup(s, 'server'))[0], /ct-row on/);
});

test('its tooltip reads in the house grammar: the name, its kind, its progress, its pay as icons, then the answer muted', () => {
  const { s, loc } = setup();
  s.mail.jobs.push(
    { id: 1, type: 'kill', family: 'ransomware', count: 5, got: 3, level: 12, from: 'Halcyon Mutual · Claims', reward: { credits: 90, standing: 2 } },
    { id: 2, type: 'item', loc: loc.id, file: 'ledger.db', from: 'wick · LOWLIGHT', reward: { credits: 60 } },
  );
  const tips = rows(mapMarkup(s)).map((r) => unesc(r.match(/title="([^"]*)"/)[1]));
  const [kill, item] = s.mail.jobs;
  assert.equal(tips[0], `Kill 5 Ransomware viruses, Lv 8+: Contract for Halcyon Mutual · Claims. 3 of 5 viruses killed.\n▸ Open it in Mail.`);
  assert.equal(tips[1], `Recover ledger.db: Contract for wick · LOWLIGHT. In the vault on ${loc.name}.\n▸ Show it on the map.`);
  for (const t of tips) {
    const [body, answer] = t.split('\n');
    assert.doesNotMatch(body, /;/, 'no semicolon chains');
    assert.ok(answer.startsWith('▸ ') && answer.split(' ').length <= 11, 'one short answer on its own line');
    assert.doesNotMatch(body, /Pays|credits/, 'the pay is icons, not words');
  }
  const pay = rows(mapMarkup(s))[0].match(/<template class="tt-more">(.*?)<\/template>/)[1];
  assert.match(pay, /class="rw "[^>]*title="Credits">.*<b>90<\/b>/, 'credits as an icon chip');
  assert.match(pay, /title="Halcyon standing">.*<b>\+2<\/b>/, 'standing as an icon chip');
});

test('amber for the work, never teal: teal is only ever you', () => {
  const { s, loc } = setup();
  s.mail.jobs.push({ id: 1, type: 'takeover', loc: loc.id, from: 'Halcyon Mutual · Claims', reward: { credits: 200 } }, { id: 2, type: 'kill', family: 'ransomware', count: 2, got: 2, level: 12, from: 'Halcyon Mutual · Claims', reward: { credits: 9 } });
  assert.doesNotMatch(tracker(mapMarkup(s, loc.id)), /class="[^"]*\byou\b/, 'no teal class on the tracker');
  const css = fs.readFileSync('dist/style.css', 'utf8');
  const rules = [...css.matchAll(/^[^{}\n]*\.(?:ct-|ctrack)[^{]*\{[^}]*\}/gm)].map((m) => m[0]);
  assert.ok(rules.length > 10, 'the tracker has its rules');
  for (const r of rules) assert.doesNotMatch(r, /--you/, r);
});
