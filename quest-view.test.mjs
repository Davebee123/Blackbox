// The quest window's three directions (quest-view.mjs, docs/threads.md 7, GAME_RULES.md "Threads"): a thread's
// dialogue over the map, its page in Mail and its reward card drawn as a transmission (a), a case file (b) or a job
// ticket (c), switched by ?quest=, the Quest window setting or `quest`; the current look the default; every ask type
// and state in each; developer thread preview; nothing in the CSS moves, rains or turns teal.
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

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const STYLES = ['a', 'b', 'c'];

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
    if (s.rooms.screen?.kind === 'virus' || s.rooms.screen?.kind === 'hunter') FP.act(s, 'engage');
    if (active(s)) win(s);
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
const withStyle = (s, st, fn) => { s.settings.quest = st; try { return fn(); } finally { s.settings.quest = 'current'; } };
// What each direction always draws, whatever the moment: its own card, the close, the lines.
const LOOK = {
  a: { panel: /q-panel q-a[\s\S]*class="pz-card th-card q-card qa-card"/, reader: /th-read q-a/, reward: /qa-receipt[\s\S]*Receipt/ },
  b: { panel: /q-panel q-b[\s\S]*qb-file[\s\S]*qb-tab[\s\S]*qb-face/, reader: /th-read q-b[\s\S]*qb-stamp/, reward: /qb-reward[\s\S]*qb-stamp s-closed">Closed/ },
  c: { panel: /q-panel q-c[\s\S]*qc-ticket[\s\S]*qc-no">#\d{4}/, reader: /th-read q-c qc-ticket/, reward: /qc-ticket qc-done[\s\S]*resolved/ },
};

test('the setting: current by default; quest a|b|c|current|next (by letter or name) on the save; ?quest= wins on its page; the System page names it', () => {
  const s = fresh();
  assert.equal(QV.questStyle(s), 'current');
  assert.match(QV.questCommand(s, 'b'), /case file/);
  assert.equal(s.settings.quest, 'b');
  QV.questCommand(s, 'job ticket'); assert.equal(QV.questStyle(s), 'c');
  QV.questCommand(s, 'next'); assert.equal(QV.questStyle(s), 'current');
  QV.questCommand(s, 'next'); assert.equal(QV.questStyle(s), 'a');
  assert.match(QV.questCommand(s, 'z'), /^quest: current, a, b, c\.$/);
  assert.match(QV.questCommand(s, ''), /Quest window: transmission\./);
  QV.QUEST.forced = 'c';
  try {
    assert.equal(QV.questStyle(s), 'c');
    assert.match(QV.questCommand(s, 'b'), /keeps \?quest=c/);
    assert.match(systemMarkup(s), /data-run="quest next"[^>]*>Quest window: job ticket</);
  } finally { QV.QUEST.forced = null; }
  s.settings.quest = 'current';
  assert.match(systemMarkup(s), />Quest window: current</);
});

test('every ask type and every state, in each direction: talk, goto, escort, a temporary server\'s logs and kill switch, a choice; offered, under way, at its turn-in, its reward (developer thread preview)', () => {
  const s = setup();
  for (const chain of QV.PREVIEW.chains) {
    for (const [stage] of QV.PREVIEW.stages) {
      const p = QV.previewOf(s, chain, stage);
      assert.ok(p, `${chain} ${stage}`);
      assert.equal(p.m.steps.length, p.c.steps.length);
      for (const st of ['current', ...STYLES]) {
        s.settings.quest = st;
        const html = QV.previewMarkup(s, { chain, stage });
        assert.match(html, /class="thp"[\s\S]*data-thp-stage="offer"[\s\S]*data-thp-style="c"/, 'the preview\'s own tabs');
        assert.doesNotMatch(html, / data-(run|rooms|go|command)=| data-th-(close|later|offer)\b| id="th-panel"/, 'nothing in it acts on the game');
        assert.doesNotMatch(html, /\{\w+(\.\w+)?\}|undefined|NaN/, `${chain} ${stage} ${st}: every place filled`);
      }
      s.settings.quest = 'current';
      // The renderers themselves, with their real buttons.
      const ctx = { ...p.ctx, age: 0 };
      for (const st of STYLES) {
        if (p.said) assert.match(QV.panelQ(st, p.said, p.m, ctx), LOOK[st].panel, `${chain} ${stage} ${st}`);
        if (stage === 'progress') assert.match(QV.readerQ(st, p.m, '<button class="btn">Track</button>'), LOOK[st].reader);
        if (stage === 'reward') {
          const r = QV.rewardQ(st, p.m, p.items);
          assert.match(r, LOOK[st].reward);
          assert.equal((r.match(/data-run="thread take \d"/g) || []).length, 3, 'pick one of three');
          assert.match(r, /data-th-later/);
        }
      }
    }
  }
  // Each ask kind is in the preview: talk, goto, escort, temp (logs and kill), and a choice at a turn-in.
  const kinds = new Set(QV.PREVIEW.chains.flatMap((c) => QV.previewOf(s, c, 'offer').c.steps.map((x) => (x.kind === 'temp' ? `temp:${x.goal}` : x.kind))));
  for (const k of ['talk', 'goto', 'escort', 'temp:logs', 'temp:kill']) assert.ok(kinds.has(k), k);
  const no = QV.previewOf(s, 'night-operator', 'turnin');
  for (const st of STYLES) assert.match(QV.panelQ(st, no.said, no.m, no.ctx), /data-rooms="talk" data-arg="1"[\s\S]*Hand it over[\s\S]*data-arg="2"[\s\S]*Sell it to GLASSJAW/, `${st}: the choice`);
  // The step under way carries its progress (an escort's file, a temporary server's logs).
  assert.match(QV.previewOf(s, 'night-operator', 'progress').m.steps.find((x) => x.now).text, /payroll\.db: 72%/);
  assert.match(QV.previewOf(s, 'mirror', 'progress').m.steps.find((x) => x.now).text, /1\/2\.$/);
});

test('the directions\' marks: a\'s first line resolves out of noise and the steps ahead stay encrypted, signed at the end; b\'s steps ahead redacted, stamped Open then Closed; c\'s [ ] lines tick to [x]', () => {
  const s = setup();
  const p = QV.previewOf(s, 'restore-point', 'offer'), ctx = { ...p.ctx, age: 0 };
  const a = QV.panelQ('a', p.said, p.m, ctx);
  assert.match(a, /qa-dec[^>]*><span class="qa-noise" aria-hidden="true">[^<]+<\/span><span class="qa-txt">&gt; restore 4471/, 'the first line, under its noise');
  assert.match(a, /Incoming/);
  assert.equal((a.match(/qa-enc/g) || []).length, 2, 'two steps ahead, encrypted');
  assert.doesNotMatch(a, /\?\?\?/);
  const noise = QV.noise('a b', 3);
  assert.equal(noise.length, 3); assert.equal(noise[1], ' ', 'the noise keeps the spaces, so it wraps as the line does');
  const b = QV.panelQ('b', p.said, p.m, ctx);
  assert.match(b, /qb-stamp s-open">Open/);
  assert.equal((b.match(/class="qb-bar"/g) || []).length, 2, 'two steps ahead, redacted');
  assert.match(b, /<pre class="qb-face" aria-hidden="true">/);
  const c = QV.panelQ('c', p.said, p.m, ctx);
  assert.match(c, /<li class="done ticked"><span class="qc-box" aria-hidden="true">\[x\]<\/span><span>Hear out the stalled restore job\.<\/span>/);
  assert.equal((c.match(/\[ \]/g) || []).length, 3);
  assert.match(c, /qc-reward[\s\S]*pick 1 of 3/);
  const r = QV.previewOf(s, 'restore-point', 'reward');
  assert.match(QV.rewardQ('a', r.m, r.items), /qa-sign"[^>]*><span>signed<\/span><b>restore job 4471<\/b><code>[0-9A-F]{4}·[0-9A-F]{4}<\/code>/);
  assert.equal((QV.rewardQ('c', r.m, r.items).match(/\[x\]/g) || []).length, 4);
  // A faction's mark in its own colour where a faction is in the thread (The Night Operator: Kestrel).
  const n = QV.previewOf(s, 'night-operator', 'offer');
  for (const st of STYLES) assert.match(QV.panelQ(st, n.said, n.m, n.ctx), /class="q-mark q-f" style="--fc:#8fd46b" title="Kestrel Underwriting"/);
  // Re-rendered mid-arrival, it resumes there; once settled it is drawn still.
  assert.match(QV.panelQ('a', p.said, p.m, { ...ctx, age: 900 }), /style="--age:900ms"/);
  assert.match(QV.panelQ('a', p.said, p.m, { ...ctx, age: 99999 }), /q-panel q-a k-talk q-settled/);
  const ui = {};
  assert.equal(QV.ageOf(ui, 5, 1000), 0); assert.equal(QV.ageOf(ui, 5, 1700), 700); assert.equal(QV.ageOf(ui, 6, 1800), 0);
});

test('live, in each direction: a one-off talk from its start to its reward (the dialogue over the map, its page in Mail, the last lines, the reward card); set aside; done', () => {
  for (const st of STYLES) {
    const s = setup();
    connect(s, s.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
    const { t } = begin(s, 'talk');
    s.settings.quest = st;
    let html = roomsMarkup(s);
    assert.match(html, LOOK[st].panel, `${st}: the dialogue`);
    assert.match(html, /id="th-panel" data-th-n="\d+"[\s\S]*data-th-close/);
    assert.match(html, /Tell Rho on [A-Z]+-[A-Z]+-\d+ I&#39;m not coming back\./);
    assert.equal(TH.objectiveOf(s, t).startsWith('Find RHO on '), true);
    let mail = mailMarkup(s, t.id);
    assert.match(mail, LOOK[st].reader);
    assert.match(mail, /data-run="thread track t\d+"[\s\S]*data-run="thread abandon t\d+"/, 'Track, On map, Set aside');
    if (st === 'c') assert.match(mail, /\[x\]<\/span><span>Hear them out\.[\s\S]*\[ \]<\/span><span>Find RHO on /);
    play(s, `thread abandon ${t.id}`);
    mail = mailMarkup(s, t.id);
    assert.match(mail, /data-run="thread resume t\d+">Pick it up/);
    assert.match(mail, { a: /qa-state">Set aside/, b: /qb-stamp s-aside">Set aside/, c: /qc-state s-set-aside">set aside/ }[st]);
    play(s, `thread resume ${t.id}`);
    // The turn-in: Rho, on another server.
    connect(s, locOf(s, t.places.to.loc));
    walk(s, t.places.to.room);
    FP.act(s, 'talk');
    assert.equal(t.state, 'done');
    html = threadPanel(s, { closed: null });
    assert.match(html, /Thanks\. I&#39;d stopped waiting\./);
    assert.match(html, { a: /Last transmission[\s\S]*qa-sign/, b: /qb-stamp s-closed">Closed/, c: /qc-state s-resolved">resolved[\s\S]*done ticked/ }[st]);
    const card = offerMarkup(s);
    assert.match(card, LOOK[st].reward);
    assert.equal((card.match(/data-run="thread take \d"/g) || []).length, 3);
    play(s, 'thread take 1');
    mail = threadReader(s, t);
    assert.match(mail, /Rho stopped waiting\./, 'the lore line');
    assert.match(mail, /<span class="tag dim">took<\/span>/);
  }
});

test('live, the other asks: a goto, an escort with its file\'s Integrity, a temporary server\'s build log and process log (the sweep drawn as before)', () => {
  const s = setup();
  connect(s, s.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
  const { t } = begin(s, 'night-operator');
  for (const st of STYLES) withStyle(s, st, () => assert.match(threadReader(s, t), /Fight to the payroll file on /, `${st}: the goto under way`));
  connect(s, locOf(s, t.places.file.loc));
  walk(s, t.places.file.room);
  assert.equal(TH.stepOf(t).kind, 'escort');
  for (const st of STYLES) withStyle(s, st, () => assert.match(threadReader(s, t), /Carry payroll\.db to the night desk on [^<]+ payroll\.db: \d+%\./, `${st}: the escort, its Integrity`));
  // A temporary server's logs: a log's dialogue (no thread moment), the sweep through view.mjs.
  const s2 = setup();
  connect(s2, s2.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
  const { t: t2 } = begin(s2, 'temp');
  const tl = locOf(s2, t2.temps.site);
  connect(s2, tl);
  walk(s2, tl.temp.logs.build);
  FP.act(s2, 'read');
  for (const st of STYLES) withStyle(s2, st, () => assert.match(roomsMarkup(s2), new RegExp(`q-panel q-${st} k-log[\\s\\S]*build\\.log`)));
  walk(s2, tl.temp.logs.sweep);
  FP.act(s2, 'read');
  for (const st of STYLES) withStyle(s2, st, () => assert.match(roomsMarkup(s2), new RegExp(`q-panel q-${st} k-sweep[\\s\\S]*ps\\.snapshot[\\s\\S]*class="[^"]*sweep`)));
  for (const st of STYLES) withStyle(s2, st, () => assert.match(threadReader(s2, t2), /Read [A-Z]+-\d+&#39;s logs\. \d\/2\./));
});

test('the current look is unchanged when nothing is picked', () => {
  const s = setup();
  connect(s, s.locations.find((l) => !l.rogue && (l.depth || 1) === 2));
  const { t } = begin(s, 'talk');
  const html = roomsMarkup(s);
  assert.match(html, /<div class="pz-panel th-panel k-talk" id="th-panel"/);
  assert.doesNotMatch(html, /q-panel|qa-|qb-|qc-/);
  assert.match(mailMarkup(s, t.id), /<section class="card mread th-read"><h2>session · m\.kade<\/h2>/);
});

test('the stylesheet: teal never (teal is you), no canvas, nothing that moves or rains, still with Motion off and reduced motion', () => {
  const css = readFileSync(new URL('./dist/quest.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const js = readFileSync(new URL('./dist/quest-view.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /--you|teal|#7fd1c7|127, 209, 199/);
  assert.doesNotMatch(js, /<canvas|getContext|pixi/i);
  for (const kf of css.match(/@keyframes [\w-]+ \{.*\}/g)) assert.doesNotMatch(kf, /transform|translate|rotate|top:|left:|margin/, `${kf.slice(0, 30)}: nothing shifts`);
  assert.match(css, /\.no-motion \.q-panel \*[^{]*\{ animation: none !important; \}/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.q-panel \*[^{]*\{ animation: none !important; \}/);
  assert.doesNotMatch(css, /infinite/, 'nothing loops');
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /<link rel="stylesheet" href="quest.css">[\s\S]*id="th-preview"/);
});
