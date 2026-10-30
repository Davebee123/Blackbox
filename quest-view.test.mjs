// The quest window (quest-view.mjs, docs/threads.md 7, GAME_RULES.md "Threads"): a thread as an intercepted
// transmission. Its dialogue over the map (Incoming, the sender's mark, a new quest's opening line resolving out of
// noise once, the steps as a printed job with the ones ahead encrypted), its page in Mail, and its reward card as a
// signed receipt; every ask type and state; developer thread preview; nothing to switch; a calm stylesheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, command, resolveCycle, active, hooks } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import * as TH from './dist/threads.mjs';
import { floorsOf } from './dist/floors.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { mailMarkup, systemMarkup } from './dist/view.mjs';
import { offerMarkup, threadPanel, threadReader } from './dist/threads-view.mjs';
import * as QV from './dist/quest-view.mjs';
import { RIVAL } from './dist/rivals.mjs';
RIVAL.chance = 0; // a rival rolls at connect (rivals.mjs): these walks are scripted (rivals.test.mjs plays them)

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;

function setup(level = 12, { floors = 2, n1 = 3, n2 = 5 } = {}) {
  const s = fresh(); s.tutorialCompleted = true;
  const arch = s.loadout.archetype;
  floorsOf(s).reached = floors;
  s.hackers = { [arch]: { level: 6, xp: 0 } };
  for (let i = 0; i < n1; i++) command(s, 'developer location worm');
  s.hackers[arch].level = 10; for (let i = 0; i < n2; i++) command(s, 'developer location ransomware');
  s.hackers[arch].level = level;
  return s;
}
const locOf = (s, id) => s.locations.find((l) => l.id === id) || s.threads.servers.find((l) => l.id === id);
const win = (s) => { for (let i = 0; i < 60 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const walk = (s, id) => {
  for (let k = 0; k < 60 && s.rooms.at !== id; k++) {
    const path = FP.pathTo(s.rooms.graph, s.rooms.at, id, (x) => x !== s.rooms.graph.core || FP.coreOpen(s));
    assert.ok(path, `a way to ${id}`);
    FP.go(s, path[1]);
    for (let r = 0; r < 4 && ['virus', 'hunter', 'rival'].includes(s.rooms.screen?.kind); r++) { FP.act(s, 'engage'); if (active(s)) win(s); } // a rival fights two or three in a row
    s.run.integrity = s.run.max;
  }
  assert.equal(s.rooms.at, id);
};
const connect = (s, loc) => { if (s.run) play(s, 'jack out'); clock += 60000; loc.lockUntil = 0; play(s, 'connect ' + loc.id); assert.ok(s.run); };
const begin = (s, chain) => {
  const loc = locOf(s, s.run.loc);
  TH.developerThread(s, chain);
  const st = TH.startHere(s, loc);
  walk(s, st.room);
  FP.act(s, 'talk');
  return { t: TH.activeThreads(s).at(-1), loc, st };
};
const PANEL = /<div class="pz-panel th-panel q-panel k-\w+ m-\w+[^"]*" id="th-panel" data-th-n="\d+" role="dialog"[\s\S]*class="pz-card th-card q-card"[\s\S]*data-th-close/;

test('one quest window for everyone: no setting, no command, no ?quest=, no other look', () => {
  const s = setup();
  assert.doesNotMatch(systemMarkup(s), /Quest window|quest next/);
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /params\.get\('quest'\)|questCommand|data-thp-style/);
  assert.equal(QV.questStyle, undefined);
  for (const gone of ['panelCurrent', 'readerCurrent', 'rewardCurrent']) assert.equal(QV[gone], undefined, gone);
  const css = readFileSync(new URL('./dist/quest.css', import.meta.url), 'utf8') + readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8') + readFileSync(new URL('./dist/floorplan.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.qb-|\.qc-|\.th-step|\.th-item|\.th-lines|\.th-head/, 'the other looks\' styles are gone');
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /<link rel="stylesheet" href="quest.css">[\s\S]*id="th-preview"/);
});

test('every ask type and every state: talk, goto, escort, a temporary server\'s logs and kill switch, a choice; offered, under way, at its turn-in, its reward (developer thread preview)', () => {
  const s = setup();
  for (const chain of QV.PREVIEW.chains) {
    for (const [stage] of QV.PREVIEW.stages) {
      const p = QV.previewOf(s, chain, stage);
      assert.ok(p, `${chain} ${stage}`);
      assert.equal(p.m.steps.length, p.c.steps.length);
      const html = QV.previewMarkup(s, { chain, stage });
      assert.match(html, /class="thp"[\s\S]*data-thp-stage="offer"[\s\S]*data-thp-chain/, 'the preview\'s own tabs');
      assert.doesNotMatch(html, / data-(run|rooms|go|command)=| data-th-(close|later|offer)\b| id="th-panel"|data-thp-style/, 'nothing in it acts on the game');
      assert.doesNotMatch(html, /\{\w+(\.\w+)?\}|undefined|NaN/, `${chain} ${stage}: every place filled`);
      if (p.said) assert.match(QV.questPanel(p.said, p.m, { ...p.ctx, age: 0 }), PANEL, `${chain} ${stage}`);
      if (stage === 'progress') assert.match(QV.questReader(p.m, '<button class="btn">Track</button>'), /th-read q-read[\s\S]*qa-job/);
      if (stage === 'reward') {
        const r = QV.questReward(p.m, p.items);
        assert.match(r, /qa-receipt[\s\S]*Receipt[\s\S]*signed/);
        assert.equal((r.match(/data-run="thread take \d"/g) || []).length, 3, 'pick one of three');
        assert.match(r, /data-th-later/);
      }
    }
  }
  const kinds = new Set(QV.PREVIEW.chains.flatMap((c) => QV.previewOf(s, c, 'offer').c.steps.map((x) => (x.kind === 'temp' ? `temp:${x.goal}` : x.kind))));
  for (const k of ['talk', 'goto', 'escort', 'temp:logs', 'temp:kill']) assert.ok(kinds.has(k), k);
  const no = QV.previewOf(s, 'night-operator', 'turnin');
  assert.match(QV.questPanel(no.said, no.m, no.ctx), /Last transmission[\s\S]*data-rooms="talk" data-arg="1"[\s\S]*Hand it over[\s\S]*data-arg="2"[\s\S]*Sell it to GLASSJAW/, 'the choice');
  assert.match(QV.previewOf(s, 'night-operator', 'progress').m.steps.find((x) => x.now).text, /payroll\.db: 72%/);
  assert.match(QV.previewOf(s, 'mirror', 'progress').m.steps.find((x) => x.now).text, /1\/2\.$/);
});

test('the transmission: Incoming with the sender\'s mark, only a new quest\'s opening line decrypts (once), the steps ahead dim hex, the last lines and the receipt signed', () => {
  const s = setup();
  const p = QV.previewOf(s, 'restore-point', 'offer'), ctx = { ...p.ctx, age: 0 };
  const a = QV.questPanel(p.said, p.m, ctx);
  assert.match(a, /m-open[\s\S]*Incoming/);
  assert.match(a, /qa-dec[^>]*><span class="qa-noise" aria-hidden="true">[^<]+<\/span><span class="qa-txt">&gt; restore 4471/, 'the first line, under its noise');
  assert.equal((a.match(/qa-dec/g) || []).length, 1, 'one line decrypts');
  assert.equal((a.match(/class="qa-t qa-enc" role="img" aria-label="Not yet"/g) || []).length, 2, 'two steps ahead, encrypted');
  assert.match(a.match(/qa-enc[^>]*>([^<]+)</)[1], /^([0-9a-f]{2} )+[0-9a-f]{2}$/, 'hex in pairs');
  assert.doesNotMatch(a, /\?\?\?/);
  // Nothing else decrypts: a step's talk, the last lines, a log.
  const t = QV.previewOf(s, 'restore-point', 'turnin');
  assert.doesNotMatch(QV.questPanel(t.said, t.m, t.ctx), /qa-dec|qa-noise/);
  assert.doesNotMatch(QV.questPanel({ ...p.said, at: 2 }, p.m, ctx), /qa-dec|qa-noise/);
  assert.doesNotMatch(QV.questPanel({ ...p.said, kind: 'log', at: null }, null, ctx), /qa-dec|qa-noise/);
  const noise = QV.noise('a b', 3);
  assert.equal(noise.length, 3); assert.equal(noise[1], ' ', 'the noise keeps the spaces, so it wraps as the line does');
  // It plays once: a re-render while it plays carries it on (never over); after that it is drawn still.
  assert.match(QV.questPanel(p.said, p.m, { ...ctx, age: 900 }), /style="--age:900ms"/);
  const settled = QV.questPanel(p.said, p.m, { ...ctx, age: QV.QUEST.settle + 1 });
  assert.match(settled, /q-panel k-talk m-open q-settled"/);
  assert.doesNotMatch(settled, /--age/);
  const ui = {};
  assert.equal(QV.ageOf(ui, 5, 1000), 0); assert.equal(QV.ageOf(ui, 5, 1700), 700); assert.equal(QV.ageOf(ui, 6, 1800), 0);
  const r = QV.previewOf(s, 'restore-point', 'reward');
  assert.match(QV.questReward(r.m, r.items), /qa-sign"[^>]*><span>signed<\/span><b>restore job 4471<\/b><code>[0-9A-F]{4}·[0-9A-F]{4}<\/code>/);
  const n = QV.previewOf(s, 'night-operator', 'offer');
  assert.match(QV.questPanel(n.said, n.m, n.ctx), /class="q-mark q-f" style="--fc:#8fd46b" title="Kestrel Underwriting"/, 'a faction\'s mark in its own colour');
});

test('live: a one-off talk from its start to its reward (the dialogue over the map, its page in Mail, set aside, the last lines, the receipt, done)', () => {
  const s = setup();
  connect(s, s.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
  const { t } = begin(s, 'talk');
  let html = roomsMarkup(s);
  assert.match(html, PANEL);
  assert.match(html, /m-open[\s\S]*Incoming[\s\S]*qa-dec/);
  assert.match(html, /Tell Rho on [A-Z]+-[A-Z]+-\d+ I&#39;m not coming back\./);
  let mail = mailMarkup(s, t.id);
  assert.match(mail, /th-read q-read[\s\S]*session · m\.kade[\s\S]*Last Call/);
  assert.match(mail, /✓<\/span><span class="qa-t">Hear them out\.[\s\S]*▸<\/span><span class="qa-t">Find RHO on /);
  assert.match(mail, /data-run="thread track t\d+"[\s\S]*data-run="thread abandon t\d+"/, 'Track, On map, Set aside');
  play(s, `thread abandon ${t.id}`);
  mail = mailMarkup(s, t.id);
  assert.match(mail, /qa-state">Set aside[\s\S]*data-run="thread resume t\d+">Pick it up/);
  play(s, `thread resume ${t.id}`);
  connect(s, locOf(s, t.places.to.loc));
  walk(s, t.places.to.room);
  FP.act(s, 'talk');
  assert.equal(t.state, 'done');
  html = threadPanel(s, { closed: null });
  assert.match(html, /m-close[\s\S]*Last transmission[\s\S]*Thanks\. I&#39;d stopped waiting\.[\s\S]*qa-sign/);
  assert.doesNotMatch(html, /qa-dec/);
  const card = offerMarkup(s);
  assert.match(card, /qa-receipt[\s\S]*Last Call[\s\S]*Rho stopped waiting\.[\s\S]*signed/);
  assert.equal((card.match(/data-run="thread take \d"/g) || []).length, 3);
  play(s, 'thread take 1');
  mail = threadReader(s, t);
  assert.match(mail, /Rho stopped waiting\.[\s\S]*signed[\s\S]*<span class="tag dim">took<\/span>/);
});

test('live: the other asks: a goto, an escort with its file\'s Integrity, a temporary server\'s build log and process log (the sweep drawn as before)', () => {
  const s = setup();
  connect(s, s.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
  const { t } = begin(s, 'night-operator');
  assert.match(threadReader(s, t), /▸<\/span><span class="qa-t">Fight to the payroll file on /, 'the goto under way');
  connect(s, locOf(s, t.places.file.loc));
  walk(s, t.places.file.room);
  assert.equal(TH.stepOf(t).kind, 'escort');
  assert.match(threadReader(s, t), /Carry payroll\.db to the night desk on [^<]+ payroll\.db: \d+%\./, 'the escort, its Integrity');
  const s2 = setup();
  connect(s2, s2.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
  const { t: t2 } = begin(s2, 'temp');
  const tl = locOf(s2, t2.temps.site);
  connect(s2, tl);
  walk(s2, tl.temp.logs.build);
  FP.act(s2, 'read');
  assert.match(roomsMarkup(s2), /q-panel k-log m-log[\s\S]*Log ·[\s\S]*build\.log/);
  walk(s2, tl.temp.logs.sweep);
  FP.act(s2, 'read');
  assert.match(roomsMarkup(s2), /q-panel k-sweep m-log[\s\S]*ps\.snapshot[\s\S]*class="[^"]*sweep/);
  assert.match(threadReader(s2, t2), /Read [A-Z]+-\d+&#39;s logs\. \d\/2\./);
});

test('the stylesheet is calm: teal never, no canvas, nothing that moves, loops or rains; the decrypt only on an opening; still with Motion off and reduced motion; the hex dim', () => {
  const css = readFileSync(new URL('./dist/quest.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const js = readFileSync(new URL('./dist/quest-view.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /--you|teal|#7fd1c7|127, 209, 199/);
  assert.doesNotMatch(js, /<canvas|getContext|pixi/i);
  for (const kf of css.match(/@keyframes [\w-]+ \{.*\}/g)) assert.doesNotMatch(kf, /transform|translate|rotate|scale|top:|left:|margin/, `${kf.slice(0, 30)}: nothing shifts`);
  assert.doesNotMatch(css, /infinite/, 'nothing loops');
  for (const r of css.match(/[^}]*animation: qa-(noise|txt)[^}]*\}/g)) assert.match(r, /^\s*\.q-panel\.m-open /, 'the decrypt only on a new quest\'s opening');
  assert.match(css, /\.no-motion \.q-panel \*, \.q-panel\.q-settled \* \{ animation: none !important; \}/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.q-panel \* \{ animation: none !important; \} \}/);
  assert.match(css, /\.qa-noise \{[^}]*clip-path: inset\(0 0 0 100%\)/, 'still, the noise is gone');
  assert.match(css, /\.qa-enc \{[^}]*color: var\(--dim\); opacity: 0\.7/, 'the hex dim');
  assert.doesNotMatch(css, /\.q-read [^{]*\{[^}]*animation/, 'Mail\'s page never animates');
});
