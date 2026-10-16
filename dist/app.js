// BLACKBOX browser shell: modules, command line, clock, save, sound.
import { CONFIG, ABILITIES, FAMILIES, xpToNext, spikeOf } from './data.mjs';
const FAMILY_NAMES = Object.fromEntries(Object.entries(FAMILIES).map(([k, f]) => [k, f.name]));
import { selectEncounter, partKey, parse, validate, hooks, stepCycle, keyMap, hackerOf, classOf, cycleLength, fresh, restore, command, advance, active, alive, part, intents, suggestions, idleRegen, tickServices, topUpCost, defender, maxSignal, inSync } from './combat.mjs';
import * as V from './view.mjs';
import { SHAPES, render as ascii3d } from './ascii3d.mjs';
import { createArt } from './virus-art.mjs';
import { codexPageMarkup, codexEntry } from './codex-view.mjs';
import { createFeel } from './feel.mjs';
import { createShell } from './shell.mjs';
import { play, runSuggestions, nextActions, currentLocation, signalNow, crewWander } from './run.mjs';
import { tickNetwork, degradedLeft, fmtLeft } from './invasion.mjs';
import { consortiumOf, alertsOf } from './consortium.mjs';
import { nextPayIn, boardOpen, storyAt, openContracts, ready } from './mail.mjs';
import { hubsOf, hubFound, hubTraceOf, FACTIONS } from './factions.mjs';
import { WARES } from './market.mjs';
import { logComms, commsOf, unseen, unseenAlert, seeAll, markDone, pruneComms, clearComms, clearOne } from './comms.mjs';
import { nextTip, markSeen } from './tips.mjs';
import { createRain } from './rain.mjs';
import { createWindow } from './window.mjs';
import { createIntro } from './intro.mjs';
import { autoPay } from './salvage.mjs';
import { relockLeft } from './rogue.mjs';
import { createHitFx } from './hitfx.mjs';
import { plan as dmgPlan, queueAfter, absorbOf } from './dmgfx.mjs';
import { createLash } from './lash.mjs';
import { online, simOn } from './presence.mjs';
import { matesOf } from './crew.mjs';
import { tickPlay, behindOf } from './progression.mjs';
import * as BR from './breach.mjs';
import { breachMarkup, breachFocusY, bxUi, bxToggle, scriptTray } from './breach-view.mjs';
import * as CP from './campaign.mjs';
import { campaignMarkup, archiveMarkup, campUi } from './campaign-view.mjs';
import { roomMarkup } from './room-view.mjs';
import { patchRules } from './skillrules.mjs';
import { runScript, scriptsOf, SCRIPTS } from './scripts.mjs';
import * as FP from './floorplan.mjs';
import { roomsMarkup, fillClocks, popOf, pickRoom, closePop } from './floorplan-view.mjs';
import { createPuzzleFx, panelRoom, closePanel, openPanel, pzUi } from './puzzle-view.mjs';
import { PUZZLES } from './puzzles.mjs';

const SAVE_KEY = 'blackbox-v6';
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const playtest = params.get('playtest');
// The breach campaign (campaign.mjs, ?campaign=breach): its own save under its own key. The old game's save is never
// read, written or migrated from here, and the old game's systems (map, mail, server, hubs, invasions, timers) sit out.
const CAMP = !playtest && params.get('campaign') === 'breach';
const KEY = CAMP ? CP.CAMPAIGN_KEY : SAVE_KEY;

// ---------- state ----------
let campaign = load();
if (params.has('dev')) Object.defineProperty(window, '__bb', { get: () => campaign }); // dev only: the live state, for tests
let module = playtest === 'story' ? 'mail' : playtest === 'breach' ? 'breach' : playtest === 'rooms' ? 'rooms' : CAMP ? 'campaign' : 'map';
let selected = null;
let mapSel = 'server';
let nag = {}; // when the pager last shook for an alert, and the breach last pinged
let wasCooling = new Set(); // abilities on cooldown at the last render (the tray flashes the ones that come back)
let mapView = 'mine'; // the Map: 'mine' (your network) or 'consortium' (the merged servers)
let mailSel = null; // the open item on the Mail page: 'l<id>' a letter, 'j<id>' a contract
let codexSel = null, codexIdx = false; // the Codex tab: the entry open ('family:worm'), and the phone's index unfolded
let history = [];
let historyIndex = -1;
let suggestionList = [];
let suggestionIndex = -1;
let noticeTimer = 0;
let dirty = true;
let archView = null; // archetype shown on the Loadout page (defaults to the equipped one)
let loadoutTab = 'protocols'; // Loadout page: 'protocols' or 'skills' (skills and talents)
let compileFocus = null; // (old) the recipe picked on the Craft page's Protocols card
let craftUi = { cat: null, pick: null }; // the Craft page: the category, and the recipe in it

function load() {
  // The campaign: its save, or a fresh state that the first launch (handle, class) turns into a campaign.
  if (CAMP) {
    try {
      const raw = JSON.parse(localStorage.getItem(CP.CAMPAIGN_KEY));
      if (raw?.camp) {
        const s = restore(raw);
        if (s.camp) { CP.migrate(s); if (active(s) && s.breach) patchRules(s); return s; } // a fight you left: your gear's skill rules back on
      }
    } catch { /* a broken campaign save: start over */ }
    const s = fresh();
    s.rng = newRng();
    s.netSeed = newRng() || 1;
    return s;
  }
  if (playtest === 'run') {
    const s = fresh();
    command(s, `developer location ${['ransomware', 'worm', 'ghostroot'].includes(params.get('family')) ? params.get('family') : 'ransomware'}`);
    if (params.get('template')) s.locations[0].template = params.get('template');
    if (params.get('depth')) s.locations[0].depth = Number(params.get('depth')) || 1;
    play(s, 'connect ' + s.locations[0].id);
    return s;
  }
  // From the content editor: a test save at a story beat (editor.html, "Play from here").
  if (playtest === 'story') {
    const s = fresh();
    s.tutorialCompleted = true;
    s.profile = { handle: params.get('handle') || 'tester', pwLen: 6, since: Date.now() };
    storyAt(s, params.get('beat'));
    return s;
  }
  // The roguelite prototype (breach.mjs): ?playtest=breach&class=operator&level=10&sub=hijacker&seed=7. One breach of
  // MERIDIAN-MX-14 on a fresh campaign that is never saved: a real save is not read, touched or migrated.
  if (playtest === 'breach') {
    const s = fresh();
    s.rng = newRng();
    s.tutorialCompleted = true;
    s.profile = { handle: params.get('handle') || 'tester', pwLen: 6, since: Date.now() };
    const cls = ['breaker', 'bastion', 'infiltrator', 'operator'].includes(params.get('class') || params.get('cls')) ? params.get('class') || params.get('cls') : 'breaker';
    const lv = Math.max(1, Math.min(50, Number(params.get('level')) || 10));
    BR.outfit(s, { cls, level: lv, sub: params.get('sub') || params.get('subclass'), gearSeed: Number(params.get('seed')) || 0 });
    BR.startBreach(s, { seed: Number(params.get('seed')) || (newRng() % 100000) + 1, level: lv, heat: Math.max(0, Math.min(8, Number(params.get('heat')) || 0)) });
    return s;
  }
  // The rooms playtest (floorplan.mjs, docs/servers.md R0): one server as a room graph, on a fresh character that is
  // never saved. ?playtest=rooms&class=…&level=…&kind=Mailhub|Relay|Mirror|Archive|Lab&seed=…&size=small|medium|large
  // &boss=a|b|c&hunter=patrol|track&author=…&sub=…. The clocks run ten times as fast.
  if (playtest === 'rooms') {
    const s = fresh();
    s.rng = newRng();
    s.tutorialCompleted = true;
    s.profile = { handle: params.get('handle') || 'tester', pwLen: 6, since: Date.now() };
    const cls = ['breaker', 'bastion', 'infiltrator', 'operator'].includes(params.get('class') || params.get('cls')) ? params.get('class') || params.get('cls') : 'breaker';
    const lv = Math.max(1, Math.min(50, Number(params.get('level')) || 10));
    const kind = FP.KIND_IDS.find((k) => k.toLowerCase() === String(params.get('kind') || '').toLowerCase()) || 'Mailhub';
    const size = ['small', 'medium', 'large'].includes(params.get('size')) ? params.get('size') : 'medium';
    const seed = Number(params.get('seed')) || (newRng() % 100000) + 1;
    FP.outfit(s, { cls, level: lv, sub: params.get('sub') || params.get('subclass'), gearSeed: seed });
    FP.startRooms(s, { seed, size, kind, level: lv, floor: Math.max(1, Number(params.get('floor')) || 2), author: params.get('author') || null, hunter: ['patrol', 'track'].includes(params.get('hunter')) ? params.get('hunter') : null, boss: params.get('boss') || 'a', speed: 10 });
    FP.connect(s);
    return s;
  }
  if (playtest) {
    const s = fresh();
    if (['breaker', 'bastion', 'infiltrator', 'operator'].includes(params.get('cls'))) s.loadout.archetype = params.get('cls'); // ?playtest=cryptjack&cls=infiltrator
    const lv = Number(params.get('level')); // ?playtest=random&level=12: that level, and the virus at it (tells scale with it)
    if (lv >= 1 && lv <= 50) s.hackers = { [s.loadout.archetype]: { level: lv, xp: 0 } };
    // ?playtest=random&level=12&family=ransomware&seed=2: that family, that seed (a Mutex, a Lockbox, a Mirror on the board)
    const fam = params.get('family'), seed = Number(params.get('seed')) >>> 0;
    if (playtest === 'random' && (fam || seed)) selectEncounter(s, 'random', seed || 1, { ...(lv >= 1 && lv <= 50 ? { level: lv } : {}), ...(/^[a-z]+$/.test(fam || '') ? { family: fam } : {}), mutation: null });
    else command(s, `encounter ${/^[a-z]+$/.test(playtest) ? playtest : 'cryptjack'}`); // any fixture or strain
    if (!s.encounter) command(s, 'encounter cryptjack');
    command(s, 'engage');
    s.encounter.paused = true;
    return s;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    const s = restore(raw);
    if (!raw) { s.rng = newRng(); s.netSeed = newRng() || 1; } // crits and drops differ from game to game, and every network has its own signature (network.mjs)
    return s;
  } catch {
    const s = fresh();
    s.rng = newRng();
    s.netSeed = newRng() || 1;
    return s;
  }
}
function newRng() { return (Math.random() * 2 ** 32) >>> 0; }
let saveTimer = 0;
function save() {
  if (playtest) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(campaign)); } catch { /* storage unavailable: play continues unsaved */ }
  }, 250);
}

// Closing the tab saves at once: nothing in flight is lost (or undone) with the page.
addEventListener('pagehide', () => { if (playtest || (CAMP && !campaign.camp)) return; clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(campaign)); } catch { /* storage unavailable */ } });

const shown = () => campaign;

// ---------- art ----------
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canMove = () => campaign.settings.motion && !reducedMotion.matches;
// How much moves on the fight board (System: Effects). One visual per event, on the thing it's about:
//   calm (default): the number and the bar say how much, the shooter's avatar lunge says who, the
//     part's name flashes; crew hits are quieter than yours. Breaks, wins and big hurts stay big.
//   full: also the impact burst in the Now cell, sparks, the whole row flashing, a punch on the virus.
//   minimal: numbers and bars only.
const fxLevel = () => (['full', 'minimal'].includes(campaign.settings.effects) ? campaign.settings.effects : 'calm');
// Hit effects (hitfx.mjs): when a command lands, it lands on the part's own cell in the shooter's
// colour (flash, slash, jolt); a crit slashes twice; a miss shakes it; a broken chit flashes it white.
const hitfx = createHitFx(document.getElementById('board'), { canMove: () => canMove() });
const partRow = (id) => document.querySelector(`#board .bpart[data-target="${CSS.escape(id)}"]`);
const initials = (h) => (h || '').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'YO'; // as on the board (view.mjs)
// Only commands: burns, helpers and other ticks ("Inject: …") don't strike. Crack's chits do.
const ticked = (e) => /^[A-Z][\w-]*( [A-Z][\w-]*)*: /.test(e.message) && !e.message.startsWith('Crack: ');
function strikes(events, delayOf = () => 0) {
  if (module !== 'combat' || fxLevel() === 'minimal') return;
  const hits = new Map(); // who>part → the strongest result this batch
  const rank = { miss: 0, hit: 1, crit: 2, chit: 3 };
  for (const e of events) {
    const result = e.type === 'damage' ? (e.crit ? 'crit' : 'hit') : e.type === 'miss' ? 'miss' : e.type === 'armor' ? 'chit' : null;
    if (!result || !e.target || ticked(e)) continue;
    const key = (e.who || 'you') + '>' + e.target, was = hits.get(key);
    if (!was || rank[result] > rank[was.result]) hits.set(key, { e, result });
  }
  // Played once the board has redrawn (rows can shift as commands change), from render().
  // Each lands with its own number (dmgfx.mjs: a cycle's hits come one after another).
  for (const { e, result } of hits.values()) pendingStrikes.push(() => later(delayOf(e), () => hitfx.strike(partRow(e.target), { who: e.who || 'you', initials: initials(e.who || campaign.profile?.handle || 'you'), kind: e.who ? 'crew' : 'you', result })));
}
const later = (ms, f) => (ms > 0 ? setTimeout(f, ms) : f());
let pendingStrikes = [];
const DISSOLVE_MS = 1000; // a broken part's last moment on the board

const art = createArt({
  getState: shown,
  canMove: () => canMove(),
  getSelected: () => selected,
  getNowSources: () => {
    const s = shown();
    return new Set(active(s) ? intents(s, 1).filter((i) => !i.hidden).map((i) => i.source) : []);
  },
});
art.attach($('virus-canvas'));
// The Codex tab's art: the fight board's renderer on a sample virus of the entry (codex.mjs sampleOf), standing still.
let codexArtVirus = null;
const codexArt = createArt({
  getState: () => (codexArtVirus ? { encounter: { virus: codexArtVirus, phase: 'idle', paused: true, cycle: 2 } } : null),
  canMove: () => canMove(),
  getSelected: () => null,
  getNowSources: () => new Set(),
});
// After the Codex page draws: its art on the new canvas, and focus back on the row (or the fold) that had it.
function codexDrawn(focusKey) {
  const c = $('cx-canvas');
  if (c) { codexArtVirus = codexEntry(campaign, c.closest('[data-entry]')?.dataset.entry)?.art || null; codexArt.attach(c); }
  if (focusKey && !document.activeElement?.closest?.('[data-codex], [data-codex-fold]')) {
    const el = focusKey === 'fold' ? document.querySelector('[data-codex-fold]') : [...document.querySelectorAll(`.cx-index [data-codex="${CSS.escape(focusKey)}"]`)].find((x) => x.getClientRects().length);
    el?.focus({ preventScroll: true });
  }
}
document.addEventListener('click', (e) => {
  const row = e.target.closest?.('[data-codex]');
  if (row) { codexSel = row.dataset.codex; codexIdx = false; if (module !== 'codex') go('codex'); else { dirty = true; $('page-view').scrollTop = 0; } return; }
  if (e.target.closest?.('[data-codex-fold]')) { codexIdx = !codexIdx; dirty = true; }
});
// The index by keyboard: ↑ and ↓ walk its rows (Tab reaches them too), Enter or Space opens one.
document.addEventListener('keydown', (e) => {
  const row = e.target.closest?.('.cx-index [data-codex]');
  if (!row || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const rows = [...document.querySelectorAll('.cx-index [data-codex]')].filter((x) => x.getClientRects().length), i = rows.indexOf(row);
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
  e.preventDefault();
  rows[to]?.focus();
});

// ---------- events → feedback ----------
// A breach: a ring fires out of the pager's lamp (twice, a beat apart), so you notice it.
function ledRing() {
  const led = $('pager-led');
  if (!led || campaign.settings.motion === false) return;
  const r = led.getBoundingClientRect();
  for (const delay of [0, 280]) setTimeout(() => { const d = document.createElement('div'); d.className = 'led-ring'; d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 950); }, delay);
}
function flash(text) {
  const el = $('stage-flash');
  el.textContent = text;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => (el.textContent = ''), 1600);
}
const feel = createFeel({ settings: () => campaign.settings, reducedMotion: () => !campaign.settings.motion || reducedMotion.matches });
// A puzzle room's board: what a move did, played over it once it renders (puzzle-view.mjs), its sounds on their beats.
const pzFx = createPuzzleFx({ canMove: () => canMove(), sound: (sign, ms) => { feel.beat(ms); feel.add(sign, null); feel.beat(0); } });
// The immersive shell (CRT, boot, status line). `?shell=plain` or `shell plain` turns it off.
const shellParam = params.get('shell');
const shellOn = () => (shellParam || campaign.settings.shell || 'immersive') !== 'plain';
const rain = createRain({ canMove: () => canMove() });
// The window behind the monitor (casing on, Window setting on): the slum outside, and its weather.
const outside = createWindow({ canMove: () => canMove(), onThunder: (d) => feel.thunder(d), onWeather: (_, w) => { outsideRain = w.rain; feel.rain(outsideRain); } });
let outsideRain = 0, outsideShown = false, lastVols = '';
// First launch (or after Reset game): log in, then Halcyon's transmission.
const intro = createIntro({ key: (k) => feel.key(k), sound: (v) => { feel.add(v, null); feel.flush(); }, reducedMotion: () => !canMove() });
let introOn = false;
function firstLogin() {
  if (CAMP) return firstCampaign();
  introOn = true;
  intro.run().then(({ handle, pwLen }) => {
    campaign.profile = { handle, pwLen, since: Date.now() };
    return pickClass();
  }).then(() => {
    introOn = false;
    save();
    dirty = true;
    cache.clear();
    go('map', true);
    feel.add('pager', '#pager');
    notice('New mail: wick has written to you.');
  });
}
// The campaign's first launch: log in, a short transmission (no mail: the story is in /core), pick a class, and the
// map opens on SPRAWL-00.
const CAMPAIGN_LETTER = (handle) => [
  `${handle},`,
  'Halcyon Mutual insures half the servers on this net. Something keeps getting into them, and every breach is a claim we pay.',
  'You will take them back one server at a time. Start with SPRAWL-00. Each server you hold makes the next one easier.',
  'Whatever the Resident leaves in /core is yours to read. We would prefer you didn\'t.',
];
function firstCampaign() {
  introOn = true;
  intro.run({ letter: CAMPAIGN_LETTER }).then(({ handle, pwLen }) => {
    campaign.profile = { handle, pwLen, since: Date.now() };
    return pickClass();
  }).then(() => {
    introOn = false;
    CP.newCampaign(campaign, { seed: newRng() || 1 });
    save();
    dirty = true;
    cache.clear();
    go('campaign', true);
    feel.add('pager', null);
    notice('SPRAWL-00 is open. Breach it.');
  });
}
// Your first class: four cards, pick one (switching stays free for a while; see LOADOUT.trialUntil).
function pickClass() {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'class-pick';
    el.innerHTML = V.classPickMarkup(campaign);
    document.body.append(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick-class]');
      if (!b) return;
      command(campaign, `archetype ${b.dataset.pickClass}`);
      feel.add('unlock', null);
      el.remove();
      done();
    });
  });
}
const shell = createShell({ getState: () => campaign, isOn: shellOn, canMove: () => canMove(), tick: () => feel.key('char') });
shell.mount();
const row = (id) => `.board [data-target="${id}"]`;
const MINE = '.hud-bar.mine';
const BAR = MINE + ' .bigbar'; // where a number on you rises: off your bar, clear of the Signal figure

// ---------- juice: how hits, broken shields and hurts land ----------
// All fixed on the page (the board re-renders every cycle and would cut them short). Motion off: none.
const juice = {
  // A chunk of a health bar that lingers white, then drains: you see exactly how much went.
  trail(sel, from, to) {
    const bar = document.querySelector(sel + ' .bigbar');
    if (!bar || from <= to) return;
    const r = bar.getBoundingClientRect();
    const t = document.createElement('i');
    t.className = 'fx-trail' + (sel === MINE ? ' mine' : '');
    t.style.left = r.left + 1 + (r.width - 2) * to + 'px';
    t.style.top = r.top + 1 + 'px';
    t.style.height = r.height - 2 + 'px';
    t.style.width = Math.max(2, (r.width - 2) * (from - to)) + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1000);
  },
  // A punch on the virus picture: a quick squash and a white frame, harder for bigger hits.
  punch(power) {
    const st = document.querySelector('.virus-stage');
    if (!st) return;
    st.style.setProperty('--punch', power.toFixed(2));
    st.classList.remove('fx-punch'); void st.offsetWidth; st.classList.add('fx-punch');
  },
  // Sparks off the hit part's row, flying away from the impact.
  sparks(id, n, cls = '') {
    const cell = document.querySelector(row(id))?.children[0];
    if (!cell) return;
    const r = cell.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 60;
      sp.className = 'fx-spark ' + cls;
      sp.style.left = r.left + r.width / 2 + 'px';
      sp.style.top = r.top + r.height / 2 + 'px';
      sp.style.setProperty('--tx', Math.cos(a) * d + 'px');
      sp.style.setProperty('--ty', Math.sin(a) * d * 0.6 + 'px');
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
  },
  // A shield chit shatters: the diamond that just went hollow throws shards, and a crack flashes across the row.
  shatter(id) {
    const rowEl = document.querySelector(row(id));
    const chits = rowEl?.querySelector('.chits');
    const p = part(campaign, id);
    if (!chits || !p) return;
    const r = chits.getBoundingClientRect(), w = r.width / Math.max(1, p.maxArmor);
    const x = r.left + w * (p.armor + 0.5), y = r.top + r.height / 2;
    const glyphs = ['◆', '◇', '▴', '▾', '·', '◆'];
    for (let i = 0; i < 9; i++) {
      const sh = document.createElement('i');
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6, d = 26 + Math.random() * 46;
      sh.className = 'fx-shard';
      sh.textContent = glyphs[i % glyphs.length];
      sh.style.left = x + 'px'; sh.style.top = y + 'px';
      sh.style.setProperty('--tx', Math.cos(a) * d + 'px');
      sh.style.setProperty('--ty', Math.sin(a) * d + 40 * Math.random() + 'px');
      sh.style.setProperty('--rot', (Math.random() - 0.5) * 540 + 'deg');
      document.body.appendChild(sh);
      setTimeout(() => sh.remove(), 800);
    }
    const ring = document.createElement('i');
    ring.className = 'fx-crackring'; ring.style.left = x + 'px'; ring.style.top = y + 'px';
    document.body.appendChild(ring); setTimeout(() => ring.remove(), 500);
    rowEl.classList.remove('fx-crack'); void rowEl.offsetWidth; rowEl.classList.add('fx-crack');
    setTimeout(() => rowEl.classList.remove('fx-crack'), 500);
  },
  // A Mutex's lock took a hit (view.mjs guardMarks): the slice it lost lingers on the part's bar and drains (a..b: where
  // on the bar, 0-1). Broken whole: the segment shatters into steel shards instead.
  lockDrain(id, a, b, broke) {
    const bar = document.querySelector(row(id) + ' .part-bar');
    if (!bar || b <= a) return;
    const r = bar.getBoundingClientRect();
    if (!r.width) return;
    const t = document.createElement('i');
    t.className = 'fx-trail lock';
    t.style.left = r.left + r.width * a + 'px'; t.style.top = r.top - 1 + 'px'; t.style.height = r.height + 2 + 'px';
    t.style.width = Math.max(2, r.width * (b - a)) + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1000);
    if (!broke) return;
    const y = r.top + r.height / 2, glyphs = ['▰', '▱', '/', '◆', '▪', '\\'];
    for (let i = 0; i < 10; i++) {
      const sh = document.createElement('i');
      const x = r.left + r.width * (a + (b - a) * Math.random()), ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7, d = 18 + Math.random() * 40;
      sh.className = 'fx-shard steel';
      sh.textContent = glyphs[i % glyphs.length];
      sh.style.left = x + 'px'; sh.style.top = y + 'px';
      sh.style.setProperty('--tx', Math.cos(ang) * d + 'px');
      sh.style.setProperty('--ty', Math.sin(ang) * d + 30 * Math.random() + 'px');
      sh.style.setProperty('--rot', (Math.random() - 0.5) * 540 + 'deg');
      document.body.appendChild(sh);
      setTimeout(() => sh.remove(), 800);
    }
    const ring = document.createElement('i');
    ring.className = 'fx-crackring steel'; ring.style.left = r.left + r.width * a + 'px'; ring.style.top = y + 'px';
    document.body.appendChild(ring); setTimeout(() => ring.remove(), 500);
  },
  // Your hit landed: a small, quick shake of the screen (px), bigger for bigger hits and crits.
  nudge(px) {
    const ws = $('workspace');
    if (!ws || ws.classList.contains('fx-quake')) return; // a hurt's jolt wins
    ws.style.setProperty('--nudge', px.toFixed(1) + 'px');
    ws.classList.remove('fx-nudge'); void ws.offsetWidth; ws.classList.add('fx-nudge');
    setTimeout(() => ws.classList.remove('fx-nudge'), 220);
  },
  // You got hit: the whole screen jolts, harder the bigger the bite, with a split-colour glitch.
  quake(frac, crit) {
    const ws = $('workspace');
    if (!ws) return;
    ws.style.setProperty('--quake', (2 + Math.min(1, frac * 4) * 8 + (crit ? 4 : 0)).toFixed(1) + 'px');
    ws.classList.remove('fx-quake'); void ws.offsetWidth; ws.classList.add('fx-quake');
    setTimeout(() => ws.classList.remove('fx-quake'), 500);
    const mine = document.querySelector(MINE);
    if (mine) { mine.classList.remove('fx-split'); void mine.offsetWidth; mine.classList.add('fx-split'); setTimeout(() => mine.classList.remove('fx-split'), 450); }
  },
};
// A virus attack on you lashes at the screen (lash.mjs): from the part on the render (or its row on the
// board) into your Signal bar. Effects minimal or Motion off: none, a soft edge instead.
const lash = createLash();
function lashFrom(id) {
  const a = id ? art.anchor(id) : null;
  if (a) return a;
  const r = id ? partRow(id)?.querySelector('.bname')?.getBoundingClientRect() : null;
  return r?.width ? { x: r.left + r.width * 0.5, y: r.top + r.height / 2, chars: (part(campaign, id)?.name || '').replace(/\W/g, '') + '#%*+=' } : null;
}
function lashAt(e, mode, frac = 0, heavy = false) {
  const full = fxLevel() === 'full', big = heavy || frac >= 0.15;
  lash.lash({ from: mode === 'tick' ? null : lashFrom(e.source), bar: document.querySelector(MINE + ' .bigbar'), power: Math.min(1, frac * 5), heavy, mode, full, onImpact: mode === 'hit' && big ? () => juice.quake(frac, heavy) : null });
}
const LASH_TRAVEL = 140; // ms: a hit's number shows as the lash lands, not as it leaves the part
let cueAt = 0; // when the last damage number queued lands (performance.now() ms)
// A part's bar steps down hit by hit (the designer: "each instance of damage tick separately on the enemy component bar"):
// while a batch's numbers play out, each damaged part's bar and HP read what it had before that hit, and drop as its
// number lands. held: part id → the HP shown now; every render re-applies it until the batch has played out.
const held = new Map();
function applyHeld() {
  if (!campaign.encounter?.virus) { held.clear(); return; }
  const parts = campaign.encounter.virus.parts;
  for (const p of parts) {
    const row = document.querySelector(`#board .bpart[data-target="${CSS.escape(p.id)}"]`);
    if (!row) continue;
    const hp = held.has(p.id) ? held.get(p.id) : p.integrity;
    const bar = row.querySelector('.part-bar > span'), txt = row.querySelector('.part-hp');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (hp / (p.max || 1)) * 100))}%`;
    if (txt) txt.textContent = `${hp}/${p.max}`;
  }
  // The virus's total in the HUD follows its parts.
  const now = parts.reduce((n, p) => n + (held.has(p.id) ? held.get(p.id) : p.integrity), 0), max = parts.reduce((n, p) => n + p.max, 0) || 1;
  const big = document.querySelector('#hud .hud-bar.enemy .bigbar > span'), num = document.querySelector('#hud .hud-bar.enemy .bar-top > span:last-child');
  if (big) big.style.width = `${Math.max(0, Math.min(100, (now / max) * 100))}%`;
  if (num) num.innerHTML = `${now}<small>/${max}</small>`;
}
// Hold the bars of every part this batch damages at their HP before it, then step each one at its hit's beat.
function stepBars(events, delayOf) {
  const hits = events.filter((e) => e.type === 'damage' && e.target && e.hp != null && campaign.encounter?.virus?.parts.some((p) => p.id === e.target));
  if (!hits.length) return;
  const seen = new Set();
  for (const e of hits) if (!seen.has(e.target)) { seen.add(e.target); if (!held.has(e.target)) held.set(e.target, e.hp + (e.amount || 0)); }
  const last = new Map(hits.map((e) => [e.target, e]));
  for (const e of hits) setTimeout(() => {
    held.set(e.target, e.hp);
    if (last.get(e.target) === e) held.delete(e.target); // its last hit this batch: the bar is the real one again
    applyHeld();
  }, delayOf(e));
  applyHeld();
}
// Health bars as they were before this batch (so a trail can show what went).
const barWas = () => {
  const e = campaign.encounter;
  if (!e) return null;
  const all = e.virus.parts, max = all.reduce((n, p) => n + p.max, 0), d = defender(campaign);
  return { enemy: max ? all.reduce((n, p) => n + p.integrity, 0) / max : 0, mine: d.max ? d.integrity / d.max : 0 };
};
let barsBefore = null;

// Events → one consistent signature each (see feel.mjs). Effects fire after the next render.
// The spoils card: what a won fight gave you, in front of the dead virus.
let fightFrom = 0; // log serial when the fight started
function showSpoils(events) {
  const el = $('spoils');
  const rows = V.spoilsOf(events);
  const e = campaign.encounter;
  if (!rows.length || !e) return hideSpoils();
  const gained = events.filter((x) => x.type === 'xp').reduce((n, x) => n + x.amount, 0);
  const leveled = events.some((x) => x.type === 'level-up');
  const h = hackerOf(campaign), need = xpToNext(h.level);
  const to = need ? Math.min(1, h.xp / need) : 1;
  const xp = { level: h.level, from: leveled ? 0 : Math.max(0, (h.xp - gained) / (need || 1)), to };
  const head = { name: e.virus.name, level: e.virus.level, family: FAMILY_NAMES[e.virus.family] || '', cycles: e.cycle, damage: e.metrics.attackDamage, clean: !e.metrics.attackDamage };
  el.innerHTML = V.spoilsMarkup(head, rows, xp, ended === 'breach' ? 'Back to the breach' : ended === 'rooms' ? 'Back to the server' : ended === 'run' && campaign.run ? 'Back to the run' : 'Back to the map');
  el.hidden = false;
  // Each line lands with a small tick; names decode from noise first.
  const motion = campaign.settings.motion !== false;
  el.querySelectorAll('[style*="--i"]').forEach((node) => {
    const i = Number(node.style.getPropertyValue('--i')) || 0;
    setTimeout(() => {
      if (el.hidden) return;
      const k = node.className;
      feel.add(/k-item|k-daemon|k-blueprint/.test(k) ? 'pickup' : /sp-level/.test(k) ? 'unlock' : 'cycle', null);
      if (motion) node.querySelectorAll('[data-decode]').forEach(decode);
    }, 260 + i * 110);
  });
  if (motion) decode(el.querySelector('.sp-name'));
}
// Scramble a label, then let it settle left to right.
function decode(node) {
  if (!node) return;
  const final = node.dataset.decode, glyphs = '#%&*+=/<>?01ABCDEFX';
  let t = 0;
  const step = () => {
    t++;
    node.textContent = [...final].map((c, j) => (c === ' ' || j < t * 1.6 ? c : glyphs[(j * 7 + t * 13) % glyphs.length])).join('');
    if (t * 1.6 < final.length) setTimeout(step, 28);
    else node.textContent = final;
  };
  step();
}
// After a won fight: back where you came from (the run, or the map).
function leaveFight() { const to = ended === 'breach' ? 'breach' : ended === 'rooms' || campaign.rooms ? 'rooms' : ended === 'run' && campaign.run ? 'net' : CAMP ? 'campaign' : 'map'; ended = null; go(to); }
// ---------- the rooms playtest (floorplan.mjs) ----------
// A button on the rooms page: a move on the map, or the room's verb. A fight starts paused on the Fight page.
function roomsClick(verb, arg) {
  feel.key('click');
  if ($('notice').classList.contains('sticky')) notice(''); // a long one (ls, map) goes with your next move
  roomsDone(FP.act(campaign, verb, arg, { pause: true }));
}
function roomsDone(events) {
  if (campaign.encounter?.rooms && active(campaign) && !campaign.encounter.paused && events.some((e) => e.type === 'engage')) campaign.encounter.paused = true;
  react(events);
  const warning = events.findLast((e) => e.type === 'warning');
  if (warning) notice(warning.message, true);
  if (events.some((e) => e.type === 'engage') && active(campaign)) { go('combat'); notice('Fight paused. Any order starts it.'); }
  else if (events.some((e) => e.type === 'jacked-out' || e.type === 'disconnected') && !campaign.roomsPlay) go('map', true); // the network: home is the map
  else if (module !== 'rooms' && !active(campaign)) go('rooms', true);
  save(); // the network's rooms are on your save (the playtest's never are: save skips it)
  dirty = true;
}
// What happens on the server goes up as a notice (there's no tty on the page): the last few lines of a batch (a move, a
// respawn, a fight's end), ls and map in full. A step or a fight starting says nothing: the map and the pop-up show it.
const ROOMS_SAY = ['rooms', 'rooms-good', 'rooms-bad', 'rooms-out', 'jacked-out'];
function roomsSay(events) {
  const said = events.filter((e) => ROOMS_SAY.includes(e.type));
  if (!said.length) return;
  const out = said.findLast((e) => e.type === 'rooms-out');
  if (out) return notice(out.message, false, null, true);
  notice(said.slice(-3).map((e) => e.message).join(' '), said.some((e) => e.type === 'rooms-bad'));
}
// The pop-up (floorplan-view.mjs): a room you've seen opens it; ×, Esc or the map's background closes it.
document.addEventListener('click', (e) => {
  if (campaign.rooms && e.target.closest?.('#notice.sticky') && !e.target.closest('button')) { notice(''); return; }
  if (module !== 'rooms' || !campaign.rooms) return;
  // A puzzle room's board (puzzle-view.mjs): × or Close puts it away, Play on the room's card brings it back, the
  // sweep's Ping and Dig switch what a click on a cell does.
  if (e.target.closest?.('[data-pz-close]')) { closePanel(campaign); feel.key('click'); dirty = true; return; }
  if (e.target.closest?.('[data-pz-open]')) { openPanel(); closePop(campaign); feel.key('click'); dirty = true; return; }
  const mode = e.target.closest?.('[data-pz-mode]');
  if (mode && !mode.disabled) { pzUi.mode = mode.dataset.pzMode; feel.key('click'); dirty = true; return; }
  const t = e.target.closest?.('[data-fp-sel]');
  if (t) { pickRoom(campaign, t.dataset.fpSel); feel.key('click'); dirty = true; return; }
  const bg = e.target.closest?.('.fp-map') && !e.target.closest('.fp-pop, .pz-panel, [data-rooms], [data-fp-sel], [data-fp-zoom]');
  if ((e.target.closest?.('[data-fp-pop-close]') || bg) && popOf(campaign)) { closePop(campaign); dirty = true; }
});
// The chase's keys: the arrows move, space waits (not while you type).
const CHASE_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'wait' };
document.addEventListener('keydown', (e) => {
  const g = e.target.closest?.('[data-rooms]');
  if (g && (e.key === 'Enter' || e.key === ' ') && g.tagName !== 'BUTTON') { e.preventDefault(); roomsClick(g.dataset.rooms, g.dataset.arg); return; }
  const t = e.target.closest?.('[data-fp-sel]');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickRoom(campaign, t.dataset.fpSel); dirty = true; }
  if (module === 'rooms' && campaign.rooms && CHASE_KEYS[e.key] && !e.target.closest?.('input, textarea, button') && panelRoom(campaign)?.kind === 'chase' && !document.querySelector('#pz-panel.pz-busy')) { e.preventDefault(); roomsClick('play', CHASE_KEYS[e.key]); return; }
  if (e.key === 'Escape' && module === 'rooms' && campaign.rooms && panelRoom(campaign) && !gainOpen()) { closePanel(campaign); dirty = true; return; }
  if (e.key === 'Escape' && module === 'rooms' && campaign.rooms && popOf(campaign)) { closePop(campaign); dirty = true; }
});
// Put the pop-up beside its room: right, left, below or above, the first side where it fits whole on screen without
// covering the room (on a phone it spans the map, so below or above). Measured again only when the room, the map's
// size or the card's size changes, so a scroll or a redraw never moves it.
let fpPopAt = null;
function placeRoomsPop() {
  const pop = $('fp-pop');
  if (!pop) { fpPopAt = null; return; }
  const box = pop.parentElement, id = pop.dataset.pop;
  const tile = [...box.querySelectorAll(`.fp-room[data-room="${CSS.escape(id)}"] .fp-body`)].map((t) => t.getBoundingClientRect()).find((r) => r.width > 0); // the chip itself: its pulsing ring and badges move
  if (!tile) { pop.style.visibility = 'hidden'; return; }
  const c = box.getBoundingClientRect(), t = { l: tile.left - c.left, t: tile.top - c.top, r: tile.right - c.left, b: tile.bottom - c.top };
  pop.style.maxHeight = '';
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const key = [id, Math.round(c.width), Math.round(c.height), Math.round(t.l), Math.round(t.t), w, h].join('|');
  if (fpPopAt?.key === key) { pop.style.left = fpPopAt.left; pop.style.top = fpPopAt.top; pop.style.maxHeight = fpPopAt.maxHeight; pop.style.visibility = 'visible'; return; }
  const m = 8, gap = 12, W = c.width, H = c.height;
  // What you can see of the map: on a phone the strip sticks over its top and the prompt over its bottom.
  const hud = box.parentElement.querySelector('.fp-hud')?.getBoundingClientRect(), form = $('command-form')?.getBoundingClientRect();
  const seeTop = Math.max(m, (hud && getComputedStyle(box.parentElement.querySelector('.fp-hud')).position === 'sticky' ? hud.bottom : 0) - c.top + m);
  const seeBot = Math.min(H - m, Math.min(innerHeight, form && form.top > 0 ? form.top : innerHeight) - c.top - m);
  const clampX = (x) => Math.max(m, Math.min(W - w - m, x)), clampY = (y, lo, hi) => Math.max(lo, Math.min(hi - h, y));
  const sides = (lo, hi) => [
    { left: t.r + gap, top: clampY(t.t - 10, lo, hi), ok: t.r + gap + w <= W - m && h <= hi - lo },
    { left: t.l - gap - w, top: clampY(t.t - 10, lo, hi), ok: t.l - gap - w >= m && h <= hi - lo },
    { left: clampX((t.l + t.r) / 2 - w / 2), top: t.b + gap, ok: t.b + gap + h <= hi },
    { left: clampX((t.l + t.r) / 2 - w / 2), top: t.t - gap - h, ok: t.t - gap - h >= lo },
  ];
  // Of the sides that fit, the one that hides the fewest other rooms you've seen (ties: right, left, below, above).
  const tiles = [...box.querySelectorAll('.fp-room:not(.shape) .fp-body')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => ({ l: r.left - c.left, t: r.top - c.top, r: r.right - c.left, b: r.bottom - c.top }));
  const hides = (x) => tiles.filter((r) => !(x.left + w <= r.l || x.left >= r.r || x.top + h <= r.t || x.top >= r.b)).length;
  const best = (list) => list.filter((x) => x.ok).map((x) => ({ ...x, n: hides(x) })).sort((p, q) => p.n - q.n)[0];
  let at = best(sides(seeTop, seeBot)) || best(sides(m, H - m));
  if (!at) { // no side holds it whole: the roomiest of below and above, and the card scrolls
    const below = H - m - (t.b + gap), above = t.t - gap - m;
    const room = Math.max(120, Math.max(below, above));
    pop.style.maxHeight = room + 'px';
    at = { left: clampX((t.l + t.r) / 2 - w / 2), top: below >= above ? t.b + gap : Math.max(m, t.t - gap - Math.min(h, room)) };
  }
  pop.style.left = Math.round(at.left) + 'px'; pop.style.top = Math.round(at.top) + 'px'; pop.style.visibility = 'visible';
  const fresh = fpPopAt?.id !== id;
  fpPopAt = { key, id, left: pop.style.left, top: pop.style.top, maxHeight: pop.style.maxHeight };
  if (fresh) { const r = pop.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) pop.scrollIntoView({ block: 'nearest' }); }
}
addEventListener('resize', () => { if (module === 'rooms') { applyFpZoom(); placeRoomsPop(); } });
// The room map zooms and pans like the network map: the wheel zooms around the cursor (up to 4×), a drag pans, a
// double-click on the map's background (or ⤢) fits the server again. One zoom for each way the map stands (wide and
// tall); kept here, not on the save, and put back after every redraw.
const fpZoom = { wide: { k: 1, cx: 0, cy: 0 }, tall: { k: 1, cx: 0, cy: 0 } };
const fpZoomOf = (svg) => fpZoom[svg.classList.contains('tall') ? 'tall' : 'wide'];
function applyFpZoom() {
  for (const svg of $('page-view')?.querySelectorAll('.fp-svg') || []) {
    const z = fpZoomOf(svg), [x, y, w, h] = baseVb(svg);
    if (z.k <= 1) { z.k = 1; svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); svg.classList.remove('zoomed'); continue; }
    const zw = w / z.k, zh = h / z.k;
    z.cx = Math.max(x + zw / 2, Math.min(x + w - zw / 2, z.cx));
    z.cy = Math.max(y + zh / 2, Math.min(y + h - zh / 2, z.cy));
    svg.setAttribute('viewBox', `${z.cx - zw / 2} ${z.cy - zh / 2} ${zw} ${zh}`);
    svg.classList.add('zoomed');
  }
}
function fpZoomReset() { fpZoom.wide.k = 1; fpZoom.tall.k = 1; applyFpZoom(); placeRoomsPop(); }
document.addEventListener('wheel', (e) => {
  const svg = e.target.closest?.('.fp-svg');
  if (!svg) return;
  e.preventDefault();
  const z = fpZoomOf(svg), [x, y, w, h] = baseVb(svg);
  if (z.k <= 1) { z.cx = x + w / 2; z.cy = y + h / 2; }
  const p = svgPoint(svg, e), k0 = z.k, k = Math.max(1, Math.min(4, k0 * (e.deltaY < 0 ? 1.25 : 1 / 1.25)));
  z.cx = p.x + (z.cx - p.x) * (k0 / k);
  z.cy = p.y + (z.cy - p.y) * (k0 / k);
  z.k = k;
  applyFpZoom(); placeRoomsPop();
}, { passive: false });
let fpDrag = null;
document.addEventListener('pointerdown', (e) => {
  const svg = e.target.closest?.('.fp-svg');
  if (svg && fpZoomOf(svg).k > 1 && e.button === 0) { const z = fpZoomOf(svg); fpDrag = { z, x: e.clientX, y: e.clientY, cx: z.cx, cy: z.cy, moved: false, scale: svg.getScreenCTM().a }; }
});
document.addEventListener('pointermove', (e) => {
  if (!fpDrag) return;
  const dx = e.clientX - fpDrag.x, dy = e.clientY - fpDrag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) fpDrag.moved = true;
  if (!fpDrag.moved) return;
  fpDrag.z.cx = fpDrag.cx - dx / fpDrag.scale;
  fpDrag.z.cy = fpDrag.cy - dy / fpDrag.scale;
  applyFpZoom(); placeRoomsPop();
});
document.addEventListener('pointerup', () => { if (fpDrag?.moved) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 0); } fpDrag = null; });
document.addEventListener('dblclick', (e) => { if (e.target.closest?.('.fp-svg') && !e.target.closest('[data-rooms], [data-fp-sel]')) fpZoomReset(); });
document.addEventListener('click', (e) => { if (e.target.closest?.('[data-fp-zoom]')) fpZoomReset(); });
// ---------- a breach (breach.mjs) ----------
// A button on the breach page: a move on the map, or the screen's verb. A fight starts paused on the Fight page.
function breachClick(verb, arg) {
  if (verb === 'again') { const u = new URL(location.href); u.searchParams.delete('seed'); location.href = u.toString(); return; }
  const n = arg != null && /^-?\d+$/.test(arg) ? Number(arg) : arg;
  if (verb !== 'equip') bxUi.pack = false; // the pack's pop-over stays up only while you equip from it
  feel.key('click');
  breachDone(verb === 'go' ? BR.go(campaign, n, { pause: true }) : BR.act(campaign, verb, n));
}
function breachDone(events) {
  if (campaign.encounter?.breach && active(campaign) && !campaign.encounter.paused && events.some((e) => e.type === 'engage')) campaign.encounter.paused = true;
  react(events);
  const warning = events.findLast((e) => e.type === 'warning');
  if (warning) notice(warning.message, true);
  else { const last = events.findLast((e) => /^breach/.test(e.type) || e.type === 'intrusion'); if (last && module !== 'breach') notice(last.message); }
  if (events.some((e) => e.type === 'engage') && active(campaign)) { go('combat'); notice('Fight paused. Any order starts it.'); }
  else if (module !== 'breach' && !active(campaign)) go('breach', true);
  dirty = true;
}
// The campaign page (campaign-view.mjs): pick a server, take a bounty, breach; and the end card's way back.
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-camp]');
  if (!b || b.disabled || !CAMP) return;
  const verb = b.dataset.camp, arg = b.dataset.arg || '';
  feel.key('click');
  if (verb === 'sel') { campUi.sel = arg; dirty = true; if (matchMedia('(max-width: 900px)').matches) requestAnimationFrame(() => document.querySelector('.cp-side')?.scrollIntoView({ block: 'start', behavior: 'smooth' })); return; }
  if (verb === 'bounty') { const [id, k] = arg.split(':'); campUi.bounty[id] = campUi.bounty[id] === k ? null : k; dirty = true; return; }
  if (verb === 'heat') { const [id, d] = arg.split(':'); campUi.heat[id] = Math.max(CP.heatFloor(campaign, id), Math.min(CP.heatOpen(campaign), heatPick(id) + Number(d))); dirty = true; return; }
  if (verb === 'breach') {
    const [id, from] = arg.split(':');
    if (campaign.breach && !campaign.breach.result) return go('breach');
    if (campaign.breach) CP.leave(campaign);
    const first = campaign.serial, br = CP.launch(campaign, id, { from, bounty: campUi.bounty[id] || null, heat: heatPick(id) });
    const ev = campaign.logs.filter((x) => x.id > first);
    if (!br) { const w = ev.findLast((x) => x.type === 'warning'); return notice(w?.message || 'Out of reach.', true); }
    campUi.bounty[id] = null; bxUi.pack = false; bxUi.log = false; bxUi.seen.clear();
    feel.add('channel', null);
    save(); go('breach'); notice(ev.find((x) => x.type === 'breach')?.message || '');
    return;
  }
  // After a breach, the room (room-view.mjs): wick, the board. A server named there opens its card on the map.
  if (verb === 'leave') { const id = campaign.breach?.campaign?.id; CP.leave(campaign); if (id) campUi.sel = id; save(); go('room'); }
  if (verb === 'show') { if (CP.SERVER[arg]) campUi.sel = arg; go('campaign'); }
});
// The heat a server's card is set to: what you picked, else the floor a re-image asks for.
function heatPick(id) { return Math.max(CP.heatFloor(campaign, id), Math.min(CP.heatOpen(campaign), campUi.heat[id] ?? CP.heatFloor(campaign, id))); }
// The breach strip's Pack pop-over and the tty: a click toggles them; a click elsewhere or Esc closes the pack.
document.addEventListener('click', (e) => {
  const t = e.target.closest?.('[data-bx-ui]');
  if (t) { bxToggle(t.dataset.bxUi, campaign); feel.key('click'); dirty = true; return; }
  if (bxUi.pack && !e.target.closest?.('.bx-pop')) { bxUi.pack = false; dirty = true; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bxUi.pack) { bxUi.pack = false; dirty = true; } });
// Keep the map where it was across redraws; when you move, bring your row into view.
let bxAt;
function breachScroll(keep) {
  const sc = $('bx-scroll');
  if (!sc) return;
  const at = campaign.breach?.at || null;
  if (at !== bxAt || keep == null) { bxAt = at; const y = breachFocusY(campaign); sc.style.scrollBehavior = 'auto'; sc.scrollTop = Math.max(0, y - sc.clientHeight * 0.35); sc.style.scrollBehavior = ''; }
  else sc.scrollTop = keep;
  // On a phone the page scrolls, not the map: when a node opens a screen, bring it up under the run strip.
  const key = campaign.breach?.result || campaign.breach?.screen?.kind || null;
  if (key !== bxScreen) {
    bxScreen = key;
    const side = document.querySelector('.bx-side'), hud = document.querySelector('.bx-hud');
    if (key && side && matchMedia('(max-width: 900px)').matches) { side.style.scrollMarginTop = `${(hud?.offsetHeight || 0) + 8}px`; side.scrollIntoView({ block: 'start' }); }
  }
}
let bxScreen = null;
// The gain card: a pull pops a one-row card that fades on its own; a jack-out shows everything
// banked and waits for Enter (or a click, or the next command).
let gainTimer = 0;
// Rewards land in one place: a centred card (a toast for small things). A card already up queues the next.
let gainQueue = [];
function showGain(kicker, name, rows, toast) {
  const el = $('gain');
  if (!el) return;
  if (gainOpen()) { gainQueue.push([kicker, name, rows, toast]); return; } // never over a card that waits for Enter
  clearTimeout(gainTimer);
  el.className = `gain${toast ? ' toast' : ''}`;
  el.innerHTML = V.gainMarkup(kicker, name, rows, !toast);
  el.hidden = false;
  const motion = campaign.settings.motion !== false;
  el.querySelectorAll('.sp-row').forEach((node, i) => setTimeout(() => {
    if (el.hidden) return;
    if (!toast) feel.add(/k-item|k-daemon|k-blueprint/.test(node.className) ? 'pickup' : 'cycle', null);
    if (motion) node.querySelectorAll('[data-decode]').forEach(decode);
  }, 260 + i * 110));
  if (toast) gainTimer = setTimeout(() => { el.classList.add('out'); gainTimer = setTimeout(hideGain, 400); }, 2600);
}
// A reward outside a fight: the event's own line, plus whatever XP and Fresh came with it in the same batch.
function rewardCard(kicker, e, events, toast = false) {
  const name = e.location ? campaign.locations?.find((l) => l.id === e.location)?.name || '' : '';
  const rows = [{ label: String(e.message || '').replace(/^[A-Z ]+: /, '').replace(/\.$/, ''), qty: '', kind: 'found', text: e.message || '' }, ...V.spoilsOf(events.filter((x) => ['xp', 'fresh', 'code'].includes(x.type) && x.id > e.id - 6))];
  showGain(kicker, name, rows, toast);
}
// Losing a run: what took you out, what it cost, and when you can go back.
function lossCard(e) {
  const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.ceil((ms % 60000) / 1000) % 60).padStart(2, '0')}`;
  const max = maxSignal(campaign), sig = signalNow(campaign), need = Math.ceil(max * CONFIG.zone.minSignal);
  const rows = [
    { kind: 'lost', label: e.by ? `Taken out by ${e.by}` : (e.reason || 'Signal lost'), qty: '', text: 'Signal lost' },
    ...(e.lost ? [{ kind: 'lost', label: 'Unbanked files', qty: `−${e.lost}`, text: `${e.lost} files lost` }] : []),
    ...(e.failed || []).map((t) => ({ kind: 'lost', label: `Contract failed: ${t}`, qty: '', text: `Contract failed: ${t}` })), // an Install job's item went with the pack (mail.mjs)
  ];
  // One clock: you can go back once both the reconnect wait and your Signal allow it, so the later of the two.
  const wait = Math.max(e.relockMs || 0, sig < need ? ((need - sig) / (CONFIG.signalRest * max)) * 60000 : 0);
  if (wait > 0) rows.push({ kind: 'time', label: 'Reconnection possible in', qty: clock(wait), text: `Reconnection possible in ${clock(wait)}` });
  showGain('Disconnected', e.where || '', rows, false);
  $('gain').classList.add('loss');
}
function hideGain() { clearTimeout(gainTimer); const el = $('gain'); if (el && !el.hidden) { el.hidden = true; el.innerHTML = ''; } const next = gainQueue.shift(); if (next) setTimeout(() => showGain(...next), 120); }
const gainOpen = () => { const el = $('gain'); return el && !el.hidden && !el.classList.contains('toast'); };
function hideSpoils() {
  document.body.classList.remove('fight-over'); const el = $('spoils'); if (el) { el.hidden = true; el.innerHTML = ''; } }

// A skill's effect landing: the word on the part (or on you), its own flash and sound.
const MARK_WORD = { exposed: 'EXPOSED', tagged: 'TAGGED', hooked: 'HOOKED', throttled: 'THROTTLED', quarantined: 'QUARANTINED', burn: 'BURNING', helper: 'HELPER', shield: 'SHIELD' };
function markFx(e, mate) {
  const sign = ['burn', 'helper', 'shield', 'buff'].includes(e.mark) ? e.mark : 'mark';
  const word = MARK_WORD[e.mark] || (ABILITIES[e.ability]?.name || 'BUFF').toUpperCase();
  const lvl = fxLevel();
  if (e.target) feel.add(sign, `${row(e.target)} .part-top`, word, { noFlash: lvl === 'minimal', quiet: mate, silent: mate, floatAt: `${row(e.target)} > .bcell:nth-child(2)` });
  else feel.add(sign, MINE, word, { noFlash: lvl === 'minimal' });
}

function react(events) {
  const won = events.find((e) => e.type === 'victory');
  // The wall stopping a weak invasion is quiet: a log line and a pager entry, no sound or float (invasion.mjs).
  const hush = !active(campaign) && events.some((e) => e.type === 'invasion-cleared' && e.quiet);
  const fx = canMove();
  if (events.some((e) => e.type === 'engage')) { barsBefore = null; hideSpoils(); fightFrom = events.find((e) => e.type === 'engage').id; }
  if (won) { const batch = [...campaign.logs.filter((e) => e.id >= fightFrom && e.id < events[0].id && (e.type === 'loot' || e.type === 'xp' || e.type === 'fresh')), ...events.filter((e) => e.id >= won.id || e.type === 'loot')]; setTimeout(() => { if (ended) { document.body.classList.add('fight-over'); showSpoils(batch); } }, 900); }
  // Every damage instance gets its own number, with an icon for its source, one after another in the order
  // they resolved (dmgfx.mjs). Effects minimal or Motion off: all at once, stacked.
  const lvl0 = fxLevel(), stack = !fx || lvl0 === 'minimal', lashing = fx && lvl0 !== 'minimal';
  const split = dmgPlan(events, {
    partName: (id) => part(campaign, id)?.name,
    attackName: (id) => part(campaign, id)?.attack?.name,
    skillName: (id) => (id === 'spike' ? spikeOf(classOf(campaign)).name : ABILITIES[id]?.name),
  }, { stagger: !stack, start: queueAfter(cueAt - performance.now()) });
  if (split.count && !stack) cueAt = performance.now() + split.total;
  if (!stack) stepBars(events, split.delay); // the bars drop with the numbers, one hit at a time
  const artHit = (id, kind) => feel.add(() => art.hit(id, kind)); // the render reacts on the event's beat
  // Crewmates' events (crew.mjs). Their turns play a beat apart, so their hits sound like yours.
  // When the virus hits everyone at once, the hits show on each row, and only one of them sounds.
  strikes(events, split.delay);
  let hurtVoiced = events.some((e) => e.type === 'server-hit' && !e.who);
  // A part's attack: its row lunges and the attack's name comes off it, once per part per batch.
  const lunged = new Set();
  for (const e of events) {
    if (!e.source || lunged.has(e.source) || !['server-hit', 'evaded', 'blocked', 'encrypt', 'blind'].includes(e.type) || !active(campaign)) continue;
    lunged.add(e.source);
    const p = part(campaign, e.source);
    feel.beat(split.delay(e));
    if (p && fxLevel() !== 'minimal') feel.add('strike', row(e.source), p.attack?.name ? p.attack.name.toUpperCase() : null, { floatAt: `${row(e.source)} > .bcell:nth-child(2)` });
  }
  for (const e of events) {
    feel.beat(split.delay(e));
    const f = split.of(e), src = f ? { kind: f.kind + (f.at === 'you' ? ' at-you' : '') + (f.hostile ? ' hostile' : ''), icon: f.icon, label: f.label } : null;
    if (e.who) {
      const mate = `.pmate[data-mate="${e.who}"]`; // their line under your Signal (HUD)
      if (e.type === 'server-hit') {
        artHit(e.source, 'attack');
        feel.add(e.crit ? 'hurtcrit' : 'hurt', mate, f?.text || `−${e.amount}`, { amount: e.amount, silent: hurtVoiced, noEdge: true, src, stack });
        hurtVoiced = true;
        continue;
      }
      if (e.type === 'evaded' || e.type === 'blocked') { feel.add('evade', mate, e.type === 'evaded' ? 'EVADED' : 'BLOCKED', { silent: true }); continue; }
      if (e.type === 'status' && e.mark && e.target) { markFx(e, true); continue; } // what they put on a part shows, quietly
      if (!['damage', 'broken', 'miss'].includes(e.type)) continue; // the rest is theirs: the log has it
    }
    switch (e.type) {
      case 'damage': {
        const lvl = fxLevel(), full = lvl === 'full', mate = !!e.who;
        artHit(e.target, e.crit ? 'crit' : 'hit');
        const pm = part(campaign, e.target)?.max || 50, big = Math.min(1, e.amount / pm);
        const size = (1 + big * 0.9 + (e.crit ? 0.35 : 0)) * (mate ? 0.8 : 1);
        // On the part itself: calm flashes its name line; full, its whole cell (with the strike). The number rises off
        // it, with its source's icon (a burn's flame, a helper's, Spike's, a crit's star).
        const at = full ? `${row(e.target)} > .bcell:first-child` : `${row(e.target)} .part-top`;
        const look = { amount: e.amount, size, noFlash: lvl === 'minimal' || (mate && !full), quiet: mate && !full, floatAt: `${row(e.target)} > .bcell:first-child`, src, stack };
        feel.add(e.crit ? 'crit' : 'hit', at, f?.text || `−${e.amount}`, look);
        // A Mutex's lock took some of it (combat.mjs hit: e.shield): the lock's number beside what got through (all of
        // it: the number above is the lock's), and the slice it lost drains off its bar, or the segment shatters.
        const ab = e.shield && e.amount ? absorbOf(e, { partName: (id) => part(campaign, id)?.name }) : null;
        if (ab) feel.add('absorb', at, ab.text, { ...look, noFlash: true, silent: mate, size: size * 0.85, src: { kind: 'shield', icon: ab.icon, label: ab.label } });
        if (e.shield && fx && lvl !== 'minimal') {
          const pm2 = part(campaign, e.target)?.max || 1, before = (e.hp ?? 0) + e.amount, a = Math.max(0, before - e.lockWas) / pm2;
          feel.add(() => juice.lockDrain(e.target, a, Math.min(1, a + e.shield / pm2), e.shield >= e.lockWas));
        }
        if (fx && full) feel.add(() => { juice.punch(0.4 + big + (e.crit ? 0.6 : 0)); juice.sparks(e.target, e.crit ? 10 : 4 + Math.round(big * 6), e.crit ? 'crit' : ''); });
        else if (fx && lvl === 'calm' && e.crit && !mate) feel.add(() => juice.punch(0.6 + big));
        if (fx && !mate && e.crit) feel.add(() => juice.nudge(4.5)); // only a crit nudges the screen
        if (!mate) { sideFx('.brow.byou', row(e.target), 'you'); holdYou(); }
        break;
      }
      case 'broken': {
        // It stays on the board a moment and dissolves into bits before it joins the broken list.
        const bp = part(campaign, e.target);
        // (It waits for the number of the hit that broke it.)
        const wait = split.delay(e);
        if (bp && canMove()) { Object.defineProperty(bp, '_dyingUntil', { value: Date.now() + wait + DISSOLVE_MS, writable: true, configurable: true, enumerable: false }); setTimeout(() => { dirty = true; }, wait + DISSOLVE_MS + 50); pendingStrikes.push(() => later(wait, () => hitfx.dissolve(partRow(e.target)))); }
      }
        artHit(e.target, 'break'); feel.add(() => flash(e.message)); feel.add('break', '.hud-bar.enemy', 'BROKEN'); if (selected === e.target) selected = null; break;
      case 'server-hit': {
        artHit(e.source, 'attack');
        const dm = defender(campaign).max || 100, frac = e.amount / dm, size = 1 + Math.min(1, frac * 5) * 0.8;
        const heavy = !!(e.crit || e.tell); // a crit or a charge whips harder (lashAt: a big one shakes the screen)
        // Effects full or calm: the part lashes at your screen, and the number shows as it lands. Else a soft edge.
        if (lashing) { feel.add(() => lashAt(e, 'hit', frac, heavy)); feel.beat(split.delay(e) + LASH_TRAVEL); }
        if (e.crit) feel.add(() => flash('CRITICAL HIT'));
        feel.add(e.crit ? 'hurtcrit' : 'hurt', MINE, f?.text || `−${e.amount}`, { amount: e.amount, frac, size: size + (e.crit ? 0.3 : 0), src, stack, noEdge: lashing, softEdge: !lashing, noFlash: lashing, floatAt: BAR, x: 0.5 });
        holdThem(); sideFx(row(e.source), MINE, 'them');
        break;
      }
      case 'drop': feel.add('pickup', null); if (['tuned', 'custom', 'zeroday'].includes(e.rarity) && !active(campaign) && !won && !ended && !campaign.breach) rewardCard('Found', e, [e], true); break; // a breach shows its own pack
      case 'miss': feel.add('miss', e.target ? row(e.target) : '.bnow', 'MISS'); break;
      case 'evaded': feel.add('evade', MINE, 'EVADED'); break;
      case 'gear': feel.add('good', null); if (e.gains?.length) showGain('Deconstructed', e.name || '', e.gains, false); break;
      case 'code': if (!won && !hush) feel.add('pickup', null); break;
      case 'service': feel.add('good', null); break;
      case 'service-done': feel.add('unlock', null); rewardCard('Installed', e, events, true); break;
      // Invasions: one line each, and only when something changes.
      case 'invader': if (!e.quiet) notice(e.message); break;
      case 'wall-scout': feel.add('interrupt', '#meter-integrity', 'SCOUT'); notice(e.message); break;
      case 'sabotage': feel.add('hurt', '#meter-integrity', 'SABOTAGE'); notice(e.message, true); break;
      case 'theft': case 'wall-mapped': feel.add('lose', null); notice(e.message, true); break;
      case 'wall-siege': feel.add('interrupt', '#meter-integrity', 'SIEGE'); notice(e.message); break;
      case 'jack-in': feel.add('jackin', null); shell.glitch?.(); break;
      case 'run-start': feel.add('jackin', null); shell.glitch?.(); break;
      case 'jacked-out': feel.add('hangup', null); if (e.gains?.length) { const name = e.message.match(/JACKED OUT of (.+?)\. Banked/)?.[1] || ''; setTimeout(() => showGain('Banked', name, e.gains, false), 350); } break;
      case 'rooms-good': if (e.gains?.length) { feel.add('pickup', null); showGain('Pulled', '', e.gains, true); } break; // a vault's files into your pack (netrooms.mjs)
      case 'puzzle': feel.add(() => pzFx.move(e)); break; // a move on a puzzle room's board: it plays over the board once drawn
      case 'puzzle-end': { // how a puzzle room's board went: a card like a reward's, once the move has played (a lost chase is a fight instead)
        if (e.fight) { flash('CAUGHT'); break; }
        const rows = [...e.rows, ...V.spoilsOf(events.filter((x) => ['xp', 'fresh', 'level-up'].includes(x.type) && x.id < e.id))];
        feel.beat(canMove() ? 700 : 0); feel.add(e.won ? 'win' : 'pzfail', null); feel.beat(0);
        setTimeout(() => showGain(e.head, PUZZLES[e.kind]?.name || '', rows, false), canMove() ? 800 : 0);
        break;
      }
      case 'world-event': if (e.card === 'courier') feel.numbers(); break; // LANTERN on the radio (the pager carries the text)
      case 'wall-breach': feel.add('hurt', '#meter-integrity', 'BREACH'); notice(e.message, true); ledRing(); break;
      case 'invasion-cleared': if (!won && !e.quiet && !e.lost) { feel.add(e.blocked ? 'good' : 'win', MINE); notice(e.message); } break;
      case 'degraded': flash('REBOOTED · DEGRADED'); notice(e.message, true); if (module === 'combat') setTimeout(() => { if (!active(campaign)) go('map'); }, 1800); break;
      case 'rebooted': feel.add('unlock', MINE); notice(e.message); break;
      // The Encryptor's attack: a tendril of hex, and locks over your bar; each tick of it after: the locks only.
      case 'encrypt': artHit(e.source, 'attack'); flash('ENCRYPTED'); if (lashing) { feel.add(() => lashAt(e, 'encrypt')); feel.beat(split.delay(e) + LASH_TRAVEL); } feel.add('encrypt', MINE, f?.text || `+${e.amount}/cycle`, { src, stack, noEdge: lashing, softEdge: !lashing, noFlash: lashing, floatAt: BAR, x: 0.5 }); break;
      case 'encrypted': if (lashing) feel.add(() => lashAt(e, 'tick')); feel.add('drain', MINE, f?.text || `−${e.amount}`, { src, stack, noFlash: lashing, floatAt: BAR, x: 0.5 }); break;
      case 'decrypted': flash('DECRYPTED'); feel.add('unlock', MINE, 'KEY'); break;
      case 'blind': flash('SCRAMBLED'); feel.add('blind', '.board', null); break;
      case 'scrambled': { const frac = e.amount / (defender(campaign).max || 100); flash('SCRAMBLED'); if (lashing) { feel.add(() => lashAt(e, 'hit', frac)); feel.beat(split.delay(e) + LASH_TRAVEL); } feel.add('hurt', MINE, f?.text || `−${e.amount}`, { amount: e.amount, frac, size: 1.3, src, stack, noEdge: lashing, softEdge: !lashing, noFlash: lashing, floatAt: BAR, x: 0.5 }); break; }
      case 'armor': { const lvl = fxLevel(); artHit(e.target, 'chit'); if (e.lock === 'broke') { feel.add('absorb', `${row(e.target)} .part-top`, 'LOCK BROKEN', { size: 1.1, floatAt: `${row(e.target)} > .bcell:first-child` }); break; } /* a Mutex's lock: its segment shatters (lockDrain, with the hit) */ feel.add('chit', `${row(e.target)} .part-top`, 'CRACKED', { size: 1.1, noFlash: lvl === 'minimal', floatAt: `${row(e.target)} > .bcell:first-child` }); if (fx && lvl !== 'minimal') feel.add(() => { juice.shatter(e.target); if (lvl === 'full') juice.punch(0.35); }); if (fx && !e.who) feel.add(() => juice.nudge(1.5)); break; }
      case 'patch': feel.add('patch', row(e.target), e.adapt ? 'ADAPTS +◆' : '+◆'); break;
      case 'reroute': feel.add('patch', row(e.target), `+${e.amount} REROUTED`, { src }); if (e.from) artHit(e.target, 'attack'); break;
      case 'xp': if (!hush) feel.add('cycle', null, `+${e.amount} XP`); break;
      case 'status': if (e.mark) markFx(e, false); break;
      case 'fast-kill': feel.add('good', null); break;
      case 'fresh': feel.add('good', null, `FRESH +${e.amount}`); break; // stepping away from fighting paid half again
      case 'codex': feel.add('mark', '.hud-bar.enemy', 'DECODED', { noFlash: true }); break;
      // Part research reaching a tier (research.mjs): a small float on the part; 100% flashes too.
      case 'research': feel.add('mark', `${row(e.target)} .part-top`, `RESEARCH ${e.tier}`, { noFlash: true, floatAt: `${row(e.target)} > .bcell:first-child` }); break;
      case 'mastered': flash('MASTERED'); feel.add('good', `${row(e.target)} .part-top`, 'MASTERED', { floatAt: `${row(e.target)} > .bcell:first-child` }); break;
      case 'level-up': {
        if (won) break;
        // One banner for every track: what the level brings, and the next level that brings something.
        levelUp(e.message.split('. ')[0].replace(/\.$/, ''), V.levelUpLines(e), (e.unlocked || []).some((id) => id !== 'edge')); // a new skill: a way to Loadout
        feel.add('win', null);
        break;
      }
      case 'behind-on': feel.add('good', null, 'BEHIND +50% XP'); break;
      case 'heal': if (e.target) feel.add('patch', row(e.target), f?.text, { src, stack }); else feel.add('good', MINE, f?.text || null, { src, stack, floatAt: BAR, x: 0.5 }); break; // a part patched: on it
      case 'blocked': if (e.shield) { feel.add('shield', MINE, f?.text || null, { src, stack, noFlash: true, floatAt: BAR, x: 0.5 }); break; } feel.add('interrupt', e.tell && e.source ? row(e.source) : MINE, e.tell && e.answered ? 'CALLED OFF' : 'BLOCKED'); break;
      case 'trap': flash('CANARY TRIPPED'); feel.add('hurt', null, `−${e.amount}`); break;
      case 'interrupt': feel.add('interrupt', row(e.target), f?.text || (e.tell ? 'STOPPED' : 'DELAYED'), { src }); break;
      case 'telegraph': if (e.source) feel.add('prewarn', row(e.source), e.name || (e.message.match(/ ([A-Z][A-Z' -]{2,})[. ]/) || [])[1] || null); break; // a tell (tells.mjs) or a crew boss's mechanic, announced
      case 'warning': feel.add('nope', '#command-form'); break;
      case 'phase': flash(e.enrage ? 'ENRAGED' : e.message.split('.')[0]); feel.add('hurt', null); break; // a boss changes phase (combat.mjs bossPhases)
      case 'scan': art.hit(e.target); flash(e.message.split('.')[0].toUpperCase()); feel.add('good', row(e.target), 'WEAK'); break;
      case 'proc': feel.add('good', null); break;
      // Tells (tells.mjs): a read pays (the part Open, or a skill ready again); one that lands bites back.
      case 'read': flash(e.open ? 'READ · OPEN' : 'READ'); feel.add('good', e.target ? row(e.target) : MINE, e.open ? 'OPEN +50%' : 'READY'); break;
      case 'read-xp': feel.add('good', null, `READ +${e.amount} XP`); break;
      case 'locked': feel.add('nope', MINE, 'OFFLINE'); break;
      case 'hung': flash('HUNG'); feel.add('nope', MINE, 'HUNG'); break;
      case 'resolved': feel.add(e.auto === 'daemon' ? 'daemon' : 'cycle', e.auto === 'daemon' ? '.byou' : '.bnow'); break;
      case 'hold': feel.add('cycle', '.bnow'); break;
      case 'loot': break; // the break already said it
      case 'net-good': feel.add(/unlocked|forced/.test(e.message) ? 'unlock' : /^pulled/.test(e.message) ? 'pickup' : 'good', null); if (e.gain) showGain('Pulled', '', [e.gain], true); break;
      case 'located': case 'upgrade': feel.add('unlock', null); break;
      case 'lead': case 'loadout': feel.add('good', null); break;
      case 'intrusion': feel.add('hurt', null); break;
      // Mail: contracts and the Halcyon retainer.
      // Mail, the board, contracts ready, the retainer and flags go to the pager (see pagerReact).
      case 'contract-done': feel.add('unlock', null); showGain('Contract delivered', e.name || '', e.gains || [], false); break;
      case 'standing-down': feel.add('nope', null); break;
      case 'contract-taken': feel.add('good', null); notice(e.message); break;
      case 'bought': feel.add('pickup', null); rewardCard('Bought', e, events, true); break;
      case 'relay': feel.add('jackin', null); notice(e.message); break;

      case 'synced': feel.add(e.surprise ? 'surprise' : 'sync', row(e.target) || '.bnow', `${e.surprise ? 'SURPRISE' : 'SYNCED'}${e.bonus ? ' · ' + e.bonus.toUpperCase() : ''}`); if (fx) feel.add(() => juice.punch(0.5)); break;
      case 'boost': feel.add('unlock', '.net-signal', `+${e.amount}`); break;
      case 'crafted': feel.add('pickup', null); rewardCard('Crafted', e, events, true); break;
      case 'fleet': case 'fleet-siege': feel.add('prewarn', null); break;
      case 'infest': feel.add('prewarn', null); break;
      case 'fleet-hit': feel.add('good', null); notice(e.message); break;
      case 'fleet-broken': flash('SWARM BROKEN'); feel.add('win', null); notice(e.message); break;
      case 'config': feel.add('unlock', null); notice(e.message); break;
      case 'program': feel.add(e.off ? 'click' : 'unlock', null); if (!e.off) flash('INJECTED'); break;
      case 'harvester': feel.add('pickup', null); rewardCard('Compiled', e, events, true); break;
      case 'harvest': feel.add('pickup', null); break;
      case 'consortium-siege': case 'consortium-raid': case 'consortium-roam': feel.add('prewarn', null); break;
      case 'outpost-held': feel.add('good', null); notice(e.message); break;
      case 'takeover': flash('TAKEN OVER'); feel.add('win', null); rewardCard('Taken over', e, events); break;
      case 'root': feel.add('unlock', null); rewardCard(`Root ${e.root}`, e, events); break;
      case 'streak': feel.add('win', null); rewardCard('Streak', e, events); break;
      case 'rotation': feel.add(e.rare ? 'prewarn' : 'good', null); break;
      case 'victory':
        flash(campaign.encounter?.rooms?.as === 'exfil' ? 'ARCHIVE RECOVERED' : 'NEUTRALIZED');
        feel.add('win', '.hud');
        // Let the last break land, then show what the fight gave you.
        ending = true; hideTip(false); ended = e.mode || 'home'; endedAt = performance.now();
        setTimeout(() => { ending = false; }, 900);
        break;
      case 'crashed': flash(e.mode === 'run' || e.mode === 'breach' || e.mode === 'rooms' ? 'SIGNAL LOST' : 'SERVER CRASHED'); feel.add('lose', MINE); if (e.invader && !active(campaign)) notice(e.message, true); if (e.mode === 'breach') { hideTip(false); setTimeout(() => go('breach'), 1600); } if (e.mode === 'rooms') { hideTip(false); setTimeout(() => { if (!active(campaign)) go('rooms'); }, 1600); } break;
      case 'cut': feel.add('good', e.target ? `#board .bpart[data-target="${CSS.escape(e.target)}"]` : null, f?.text || (e.phase ? 'PHASE' : e.vent ? 'VENTED' : e.delay ? 'DELAYED' : 'INTERRUPTED'), { src }); break;
      case 'escaped': flash('UPLOAD COMPLETE'); feel.add('nope', null); hideTip(false); setTimeout(() => { if (!active(campaign) && campaign.rooms) go('rooms', true); }, 1600); break; // a runner got away (the Exfil's upload completed): back to the rooms
      case 'floor': flash(`FLOOR ${e.floor}`); notice(e.message); break; // floors.mjs: you took an exit
      case 'tick-wasted': feel.add('chip', e.target ? `#board .bpart[data-target="${CSS.escape(e.target)}"]` : null, '−tick'); break;
      case 'disconnected': feel.add('lose', null); hideTip(false); tipWait = performance.now() + 5000; setTimeout(() => { go('map'); lossCard(e); }, 1600); break; // a card like a win's, and no tip over it
    }
    if (e.type === 'located') { notice(e.message); mapSel = e.location; }
    if (typeof e.floor === 'number' && ['floor', 'info', 'located'].includes(e.type)) { mapFloor = e.floor; mapZoom.k = 1; } // floors.mjs: the floor you went to, or asked the map for
    // A conditional rule of your gear that fired (combat.mjs: e.gear): its chip on the HUD flashes, and its name floats
    // off what it touched, the part it hit or your bar, on the event's own beat.
    if (e.gear?.length && !e.who) e.gear.forEach((g, k) => feel.add('gear', `#hud .gfx[data-fx="${CSS.escape(g.id)}"]`, k ? null : e.gear.map((x) => x.name).join(' · '), { floatAt: e.type === 'damage' && e.target ? `${row(e.target)} .part-top` : BAR, x: e.type === 'damage' ? 0.3 : 0.5 }));
  }
  feel.beat(0);
  const after = barWas();
  if (fx && barsBefore && after) { const b = barsBefore; feel.add(() => { juice.trail('.hud-bar.enemy', b.enemy, after.enemy); juice.trail(MINE, b.mine, after.mine); }); }
  barsBefore = after;
  pagerReact(events);
  shell.react(events);
  // XP earned away from a fight (a vault, a sweep, a dead drop, a decode, a first craft): a quick card.
  const carded = events.some((e) => ['takeover', 'root', 'streak', 'contract-done', 'crafted', 'bought', 'harvester', 'service-done'].includes(e.type));
  const xpOut = !won && !ended && !active(campaign) && !carded && events.filter((e) => e.type === 'xp');
  if (campaign.rooms) roomsSay(events); // the rooms playtest has no tty: what happens on the server goes up as a notice
  if (xpOut?.length) { const why = String(xpOut[0].message.split('·')[1] || '').trim().replace(/\.$/, ''); showGain(why ? why[0].toUpperCase() + why.slice(1) : 'XP', '', V.spoilsOf(events.filter((x) => ['xp', 'fresh', 'code', 'level-up'].includes(x.type))), !events.some((x) => x.type === 'level-up')); }
  if (events.length) dirty = true;
}

// ---------- after a fight ----------
// No Victory screen: the log carries what the fight gave you. Enter on an empty line (or any
// page button) moves on: back to the run, or the map.
let ended = null; // 'home' | 'run' once a fight is over and you're still looking at it
let endedAt = 0; // when it ended: an Enter typed in the moment after a win doesn't skip its spoils card
let ending = false; // the last break is landing

// ---------- notices ----------
// A level-up gets its own banner, on any screen: a privilege escalation, read off the terminal. The level as a
// big readout, the class beside it, each thing the level brings as its own +line, the next level ghosted under
// them, and a bar that drains while it stays up.
function levelUp(title, text, skill = false) {
  const m = String(title).match(/LEVEL (\d+)\s*(.*)$/i), lv = m ? m[1] : '', cls = m ? m[2] : title;
  const lines = Array.isArray(text) ? text : [{ text }];
  const gains = lines.filter((l) => !l.ghost).flatMap((l) => l.text.split(' · ')).filter(Boolean);
  const next = lines.find((l) => l.ghost);
  const ms = skill ? 7000 : 5000, el = $('levelup');
  el.innerHTML = `<div class="lu-head"><span>uid=0 · privileges escalated</span><span class="lu-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>`
    + `<div class="lu-body"><div class="lu-num"><small>LVL</small><b>${V.esc(lv)}</b></div><div class="lu-who"><b>${V.esc(cls)}</b><ul class="lu-list">${gains.map((g, i) => `<li style="--i:${i}">${V.esc(g)}</li>`).join('')}</ul></div></div>`
    + (next ? `<p class="lu-next">next · ${V.esc(next.text)}</p>` : '')
    + (skill ? '<button type="button" class="btn small primary lu-go" data-module="loadout">See it on Loadout</button>' : '')
    + `<div class="lu-timer" style="--ms:${ms}ms"></div>`;
  el.setAttribute('aria-label', `Level ${lv} ${cls}: ${gains.join(', ')}`);
  el.style.setProperty('--lu-ms', ms + 'ms');
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(levelUp.t);
  levelUp.t = setTimeout(() => { el.hidden = true; }, ms);
}
function notice(text, bad = false, suggest = null, sticky = false) {
  const el = $('notice');
  el.textContent = text;
  // A typo's best guess: click it to run it (or, ending in a space, to fill the prompt).
  if (suggest) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tok act suggest'; b.dataset.prefill = suggest; b.textContent = suggest.trim(); el.append(' ', b); }
  el.classList.toggle('bad', bad);
  el.classList.toggle('sticky', !!sticky);
  el.hidden = !text;
  clearTimeout(noticeTimer);
  if (text && !sticky) noticeTimer = setTimeout(() => (el.hidden = true), 4000); // sticky (help): stays until the next notice or command
}

// ---------- commands ----------
const NAV = ['map', 'combat', 'net', 'server', 'craft', 'loadout', 'daemons', 'codex', 'system', 'campaign', 'room', 'archive'];
const ALIAS = { vault: 'loadout', gear: 'loadout', protocols: 'loadout', stash: 'loadout', inventory: 'loadout', crafting: 'craft', workbench: 'craft', build: 'craft', services: 'server', ports: 'server', wall: 'server', talents: 'loadout', skills: 'loadout', archetypes: 'loadout', home: 'map', trace: 'map', leads: 'map', logs: 'system', settings: 'system', bestiary: 'codex', fight: 'combat', run: 'net' };

function run(raw) {
  let text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  aimPreview = null; // the command is going in: the board shows the real aim again
  if (!text) return;
  if (!$('notice').hidden) notice(''); // a sticky notice (help) goes with the next command
  history = [text, ...history.filter((h) => h !== text)].slice(0, 40);
  historyIndex = -1;
  // A server you found but never connected: typing connect asks first, on its map card.
  const join = text.match(/^connect (\S+)(?: (?:loud|\+loud|\+hot))?$/);
  const found = join && campaign.locations?.find((l) => (l.id === join[1] || l.name.toLowerCase() === join[1]) && l.fresh && l.detached);
  if (found && memYes !== found.id) { mapSel = found.id; mapPop = true; V.setMemAsk(found.id); go('map'); dirty = true; return; }
  // Hub sessions: connect <hub> opens one; inside it, a number or a word picks from its menu.
  const dial = text.match(/^(?:connect|dial) (halcyon|glassjaw|kestrel|lantern|nullchoir)$/);
  if (dial && V.hubOptions(campaign, dial[1]).length) return openHub(dial[1]);
  if (dial && hubsOf(campaign).length && !hubFound(campaign, dial[1])) { notice(`${dial[1].toUpperCase()}: hub not located yet (${hubTraceOf(campaign, dial[1])}%).`, true); return; }
  if (hubShown() && !active(campaign)) {
    const opts = V.hubOptions(campaign, hubSel);
    if (/^\d$/.test(text)) { const n = Number(text); if (n === 0) return closeHub(); if (opts[n - 1]) return pickHub(opts[n - 1].key, text); hubEcho(text); hubLines.push({ cls: 'warn', html: `${text}: no such option` }, menuLine); dirty = true; return; }
    if (['disconnect', 'exit', 'bye', 'logout', 'quit'].includes(text)) return closeHub();
    const o = opts.find((x) => x.key === text || x.label.toLowerCase() === text);
    if (o) return pickHub(o.key, text);
    if (['help', 'menu', 'ls', '?'].includes(text)) { hubEcho(text); hubLines.push(menuLine); dirty = true; return; }
  }
  // A server's rooms (floorplan.mjs): ls, cd, map and the room's verbs, out of a fight. On the playtest jacking out
  // mid-fight isn't one; on the network it's the emergency escape (run.mjs play), and the verbs go through play too.
  if (campaign.rooms) {
    FP.settle(campaign); // a fight that ended: your Signal back on the server, and gear loads again
    if (text === 'jack out' && active(campaign) && campaign.roomsPlay) return notice('No jacking out mid-fight. Win it, or lose the pack.', true);
    const sm = text.match(/^(?:script (\d)|run ([a-z0-9]+))(?: (\S+))?$/);
    if (sm && active(campaign) && campaign.encounter?.rooms) {
      const bag = scriptsOf(campaign), i = sm[1] ? Number(sm[1]) - 1 : bag.findIndex((id) => id === sm[2] || SCRIPTS[id].name.toLowerCase() === sm[2]);
      const first = campaign.serial, ok = runScript(campaign, i < 0 ? 99 : i, sm[3] ? campaign.encounter.virus.parts.find((p) => alive(p) && (p.id === sm[3] || partKey(campaign, p) === sm[3]))?.id : selected);
      const ev = campaign.logs.filter((e) => e.id > first);
      react(ev);
      const w = ev.findLast((e) => e.type === 'warning');
      if (w) notice(w.message, true); else if (ok) notice(ev.filter((e) => e.type !== 'rooms-cmd').map((e) => e.message).join(' '));
      dirty = true; return;
    }
    if (text === 'help' && !campaign.roomsPlay) return notice('Click a room, or type go <room> (go elite 2). Also: ls, map, wait, back, engage, cat, pull, open, force, rest, slip, pack, jack out. In a fight: 1 is your plain hit, 2 to 0 your skills, - is SIGINT, script <n> runs a script, jack out is the emergency escape.', false, null, true);
    if (text === 'help') return notice('Click a room, or type go <room> (go elite 2). Also: ls, map, wait, back, engage, cat, pull, open, force, rest, slip, jack out, connect, developer bossrule a|b|c. In a fight: 1 is your plain hit, 2 to 0 your skills, - is SIGINT, script <n> runs a script.', false, null, true);
    if (!active(campaign) && campaign.roomsPlay) { const ev = FP.roomsCommand(campaign, text); if (ev) return roomsDone(ev); }
  }
  // A breach (breach.mjs): ls, cd, tree and the screen's verbs, out of a fight. Jacking out mid-fight isn't one.
  if (campaign.breach) {
    BR.settle(campaign); // a fight that ended: your Signal back on the breach, and gear loads again
    if (text === 'jack out' && active(campaign)) return notice('No jacking out mid-fight on a breach. Win it, or lose the pack.', true);
    // A script (scripts.mjs): script <n> [part], or run <name> [part]. One a fight, and it takes no cycle.
    const sm = text.match(/^(?:script (\d)|run ([a-z0-9]+))(?: (\S+))?$/);
    if (sm && active(campaign) && campaign.encounter?.breach) {
      const bag = scriptsOf(campaign), i = sm[1] ? Number(sm[1]) - 1 : bag.findIndex((id) => id === sm[2] || SCRIPTS[id].name.toLowerCase() === sm[2]);
      const first = campaign.serial, ok = runScript(campaign, i < 0 ? 99 : i, sm[3] ? campaign.encounter.virus.parts.find((p) => alive(p) && (p.id === sm[3] || partKey(campaign, p) === sm[3]))?.id : selected);
      const ev = campaign.logs.filter((e) => e.id > first);
      react(ev);
      const w = ev.findLast((e) => e.type === 'warning');
      if (w) notice(w.message, true); else if (ok) notice(ev.filter((e) => e.type !== 'breach-cmd').map((e) => e.message).join(' '));
      save(); dirty = true; return;
    }
    if (!active(campaign)) { const ev = BR.breachCommand(campaign, text); if (ev) return breachDone(ev); }
    if (/^(equip|unequip) /.test(text) && !active(campaign) && !(campaign.breach.screen?.kind === 'defrag' && campaign.breach.screen.reslot)) return notice('Your bar changes only at a defrag (Re-slot).', true);
  }
  // Developer commands are for tests and ?dev / playtest pages, not the real game (a crashed
  // server's reboot excepted: the engine points you to it).
  if (/^(developer( |$)|online sim$|crew sim( |$))/.test(text) && !params.has('dev') && !playtest && !(text === 'developer reboot' && shown().server.integrity <= 0)) text = 'developer-off'; // dev only (the co-op sims too, until real multiplayer): the engine answers it as an unknown command

  // Ability names win over page names during a fight ("trace" is both).
  const fighting = active(shown());
  const page = ALIAS[text] || text;
  // Daemons live on the Loadout page now (a tab beside Protocols).
  if (page === 'daemons' && !(fighting && ABILITIES[text])) { loadoutTab = 'daemons'; return go('loadout'); }
  if (NAV.includes(page) && !(fighting && ABILITIES[text])) { if (page === 'loadout') loadoutTab = text === 'talents' || text === 'skills' ? 'skills' : 'protocols'; return go(page); }
  if (text === 'shell' || text.startsWith('shell ')) return shellCommand(text.slice(6).trim());
  if (text === 'casing on' || text === 'casing off') { campaign.settings.casing = text === 'casing on'; save(); dirty = true; return; }
  if (text === 'tips on' || text === 'tips off' || text === 'tips replay') {
    if (text === 'tips replay') { campaign.settings.seen = {}; campaign.settings.tips = true; }
    else campaign.settings.tips = text === 'tips on';
    hideTip(false); save(); dirty = true;
    return notice(text === 'tips replay' ? 'Tips will show again as you meet things.' : `Tips ${campaign.settings.tips ? 'on' : 'off'}.`);
  }
  if (/^effects( (full|calm|minimal|next))?$/.test(text)) { const order = ['calm', 'full', 'minimal'], w = text.split(' ')[1]; campaign.settings.effects = !w || w === 'next' ? order[(order.indexOf(fxLevel()) + 1) % 3] : w; save(); dirty = true; return notice(`Effects: ${fxLevel()}.`); }
  if (text === 'music on' || text === 'music off') { campaign.settings.music = text === 'music on'; save(); dirty = true; return notice(`Music ${text.slice(6)}.${campaign.settings.sound ? '' : ' (Sound is off.)'}`); }
  if (text === 'radio on' || text === 'radio off') { campaign.settings.radio = text === 'radio on'; save(); dirty = true; return notice(`Radio chatter ${text.slice(6)}.${campaign.settings.sound ? '' : ' (Sound is off.)'}`); }
  if (text === 'radio test') return feel.radioTest();
  if (text === 'sidebar on' || text === 'sidebar off') { campaign.settings.sidebar = text === 'sidebar on'; save(); dirty = true; return notice(`Crew window ${text.slice(8)}.`); }
  if (text === 'map names hover' || text === 'map names on') { campaign.settings.mapNames = text.endsWith('hover') ? 'hover' : 'on'; save(); dirty = true; return notice(text.endsWith('hover') ? 'Map names show on hover.' : 'Map names always show.'); }
  if (text === 'window on' || text === 'window off') { campaign.settings.window = text === 'window on'; save(); dirty = true; return notice(`Window ${text.slice(7)}.`); }
  if (text.startsWith('weather')) { const w = text.split(' ')[1]; outside.force(w === 'auto' ? null : w); return notice(`Weather: ${w && w !== 'auto' ? w : 'follows the clock'}.`); }
  if (text === 'reset game' || text === 'new game') return resetGame();
  if (text === 'help' && !CAMP) return notice('In a fight, key 1 is your plain hit, keys 2 to 0 fire your skills, - is SIGINT, hold skips a move and now ends the cycle at once. On a run, use ls, cd, cat, pull, unlock, attack and jack out. For gear, use load, unload, compile, deconstruct and craft. For your server, use install, uninstall, firewall upgrade|defrag|harden and filter equip. On the net, use connect, relay, detach and mail. The pages are map, mail, server, craft, loadout and system. Change the screen with shell immersive|plain|boot, and start over with reset game.', false, null, true);
  if (text.startsWith("'") || text.startsWith('say ')) return notice('Chat arrives with co-op. For now it is just you and the virus.');
  // The campaign: fights, your gear, skills and talents. The old game's commands (connect, mail, install…) sit out.
  if (CAMP && !fighting && !/^(load|unload|equip|unequip|talent|untalent|respec|subclass|archetype|loadout|preset|deconstruct|scan|codex|collection|hold|now)\b/.test(text)) {
    if (text === 'help') return notice('On the campaign map, pick a server and breach it. On a breach, use ls, cd <n>, tree and the screen\'s verbs (pick, cat, pull, rest, reslot, buy, patch, service, open, force, fight, splice, leave, choose). In a breach fight, script <n> runs one of your scripts. In a fight, key 1 is your plain hit, keys 2 to 0 fire your skills and - is SIGINT. For gear and skills, use load, unload, equip and unequip. The pages are campaign, room, loadout, archive and system.', false, null, true);
    return notice(`${text.split(' ')[0]}: not on the campaign. Type help.`, true);
  }

  const wasAlert = campaign.encounter?.phase === 'alert';
  const queuedBefore = campaign.encounter?.queue;
  let events = play(campaign, /^(consortium|guild)\b/.test(text) ? raw.trim() : text); // a consortium's name keeps its capitals
  react(events);
  const warning = events.findLast((e) => e.type === 'warning');
  // In a fight, an order you enter goes now: the cycle turns without waiting out the bar.
  const e = campaign.encounter;
  if (fighting && !warning && active(campaign) && !e.paused && e.queue && e.queue !== queuedBefore) { const more = command(campaign, 'now'); react(more); events = [...events, ...more]; }
  if (warning) notice(warning.message, true, warning.suggest);
  else {
    // Rewards have their card; the corner keeps warnings and plain status (never "Server +N XP").
    const info = events.some((e) => e.type === 'contract-done') ? null : events.findLast((e) => ['info', 'repair', 'daemon-set', 'service'].includes(e.type) && !e.serverXp);
    if (info) notice(info.message);
  }
  // (a connect or hang-up has its own sound, so the channel change stays quiet)
  if ((wasAlert || events.some((e) => e.type === 'jack-in' || e.type === 'engage')) && active(campaign)) go('combat', events.some((e) => e.type === 'jack-in'));
  else if (events.some((e) => e.type === 'run-start')) go('net', true);
  else if (events.some((e) => e.type === 'jacked-out')) go('map', true);
  else if (campaign.rooms && module !== 'rooms' && !ended && !events.some((e) => e.type === 'victory') && events.some((e) => e.type.startsWith('rooms') && e.type !== 'rooms-out')) go('rooms', true); // a move typed from another page (a win stays on its kill screen)
  else if (campaign.run && module !== 'net' && !events.some((e) => e.type === 'victory') && events.some((e) => e.type.startsWith('net'))) go('net'); // a win stays on its kill screen (the folder listing waits in the terminal)
  else if (text.startsWith('encounter ') && campaign.encounter?.phase === 'alert') { mapSel = 'intrusion'; go('map'); }
  save();
  dirty = true;
}

// Start over: a fresh level-1 server and level-1 classes. Settings stay. Asks twice.
function resetGame() {
  const now = Date.now();
  if (!(resetGame.armed > now)) {
    resetGame.armed = now + 10000;
    return notice('This wipes your server, class levels, locations, loot and upgrades (settings stay). Do it again within 10 seconds to confirm.', true);
  }
  resetGame.armed = 0;
  $('levelup').hidden = true;
  ended = null;
  const settings = campaign.settings;
  campaign = fresh();
  campaign.settings = settings;
  campaign.rng = newRng();
  campaign.netSeed = newRng() || 1; // a new game, a new network
  history = [];
  historyIndex = -1;
  mapSel = 'server';
  archView = null;
  selected = null;
  campUi.sel = null; campUi.bounty = {};
  if (!playtest) try { if (CAMP) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(campaign)); } catch { /* storage unavailable */ }
  go(CAMP ? 'campaign' : 'map');
  firstLogin();
}

function shellCommand(arg) {
  if (arg === 'boot' || arg === 'reboot') { if (!shellOn()) return notice('The plain shell has no boot screen. Type shell immersive.', true); if (!canMove()) return notice('Motion is off, so the boot screen is skipped.', true); return shell.boot(true); }
  const to = ['plain', 'off'].includes(arg) ? 'plain' : ['immersive', 'on'].includes(arg) ? 'immersive' : !arg || arg === 'toggle' ? (shellOn() ? 'plain' : 'immersive') : null;
  if (!to) return notice('usage: shell [immersive|plain|boot]', true);
  campaign.settings.shell = to;
  save();
  dirty = true;
  notice(to === 'plain' ? 'Shell: plain.' : 'Shell: immersive. Type shell plain to turn it off.');
}

function go(name, quiet = false) {
  aimPreview = null;
  // Halcyon's store is its hub's Shop now: anything that asks for the store opens that.
  if (name === 'store' && boardOpen(campaign)) { hubSel = 'halcyon'; hubOpen = true; hubLines = [...V.hubBanner(campaign, 'halcyon').slice(0, -1), menuLine]; hubWin = 'shop'; V.setOrder(null); name = 'hub'; }
  if (name === 'daemons') { loadoutTab = 'daemons'; name = 'loadout'; } // a Loadout tab now
  // Contextual tabs only exist while there is something there.
  if (name === 'combat' && !active(campaign) && !(campaign.encounter && campaign.encounter.mode === 'run')) name = 'map';
  if (name === 'net' && (!campaign.run || campaign.run.breach || campaign.run.rooms)) name = campaign.breach ? 'breach' : campaign.rooms ? 'rooms' : 'map';
  if (campaign.roomsPlay && name === 'map') name = 'rooms'; // the rooms playtest: its server is the page
  if (name === 'rooms' && !campaign.rooms) name = 'map';
  if (CAMP && ['map', 'mail', 'server', 'craft', 'store', 'consortium', 'hub', 'net'].includes(name)) name = 'campaign'; // the old game's pages sit out
  if (!CAMP && ['campaign', 'room', 'archive'].includes(name)) name = 'map';
  if (campaign.breach && (CAMP ? ['campaign', 'room'].includes(name) && !campaign.breach.result : name === 'map')) name = 'breach'; // a live breach is the page
  if (name === 'breach' && !campaign.breach) name = CAMP ? 'campaign' : 'map';
  // Stepping away from a live fight pauses it; coming back picks it up again.
  const leaving = module === 'combat' && name !== 'combat' && active(campaign) && !campaign.encounter.paused;
  if (leaving) { campaign.encounter.paused = true; campaign.encounter.autoPaused = true; notice('Fight paused.'); }
  if (name === 'combat' && active(campaign) && campaign.encounter.autoPaused) { campaign.encounter.paused = false; campaign.encounter.autoPaused = false; }
  if (name !== module && !quiet) feel.add('channel', null);
  if (name !== 'combat') hideSpoils();
  if (gainOpen()) hideGain();
  if (name !== 'hub') { hubOpen = false; hubWin = null; }
  const moved = name !== module;
  module = name;
  selected = null;
  document.querySelectorAll('.modules button').forEach((b) => b.setAttribute('aria-current', b.dataset.module === name ? 'page' : 'false'));
  dirty = true;
  render(true);
  if (moved) $('page-view').scrollTop = 0; // a new page opens at its top
  shell.onModule(name);
  $('command-input').focus();
}

// Fill the prompt the way a hotkey would; the player still presses Enter.
const touch = () => matchMedia('(pointer: coarse)').matches;
// The phone layout draws a floor on its side (view.mjs mapLayout): the way down at the bottom.
const portraitQ = matchMedia('(max-width: 900px)');
V.setMapPortrait(portraitQ.matches);
portraitQ.addEventListener?.('change', (e) => { if (V.setMapPortrait(e.matches)) dirty = true; });
function prepare(abilityId) {
  const a = ABILITIES[abilityId];
  const s = shown();
  const input = $('command-input');
  if (!a) return;
  let text = abilityId;
  if (a.target === 'command') text += ' ';
  if (a.target === 'schedule') text += ' 2 ';
  if (a.target === 'part') text += selected && alive(part(s, selected)) ? ` ${partKey(s, part(s, selected))}` : ' ';
  if (a.target === 'attack') text += selected && part(s, selected)?.attack && alive(part(s, selected)) ? ` ${partKey(s, part(s, selected))}` : '';
  input.value = text;
  if (!touch()) input.focus(); // on a phone, focusing pops the keyboard over the board
  updateSuggestions();
}

// ---------- suggestions ----------
function updateSuggestions() {
  const input = $('command-input');
  const s = shown();
  const text = input.value;
  previewAim(s, text);
  const exploring = s === campaign && campaign.run && !active(campaign);
  suggestionList = text.trim() ? (exploring ? runSuggestions(s, text) : suggestions(s, text)).filter((x) => x !== text.trim()).slice(0, 8) : [];
  suggestionIndex = -1;
  const box = $('suggestions');
  box.hidden = !suggestionList.length;
  box.innerHTML = suggestionList.map((x, i) => `<button type="button" role="option" data-suggestion="${V.esc(x)}" aria-selected="${i === suggestionIndex}">${V.esc(x)}</button>`).join('');
}

// As you type a command that names a part, your avatar moves to that part before you press Enter
// (view.mjs boardMarkup). Parsed the way Enter would; one that wouldn't go through (on cooldown,
// not lit, …) shows as a warning instead, the reason on hover.
let aimPreview = null;
let hubSel = 'halcyon'; // the faction hub you're connected to
// A hub session: a terminal like any server's (its transcript lives here), and the window a
// menu choice opened beside it.
let hubOpen = false, hubWin = null, hubLines = [];
const menuLine = { cls: 'hub-menu', menu: true };
function openHub(f) {
  hubSel = f; hubWin = null; hubOpen = true;
  hubLines = [...V.hubBanner(campaign, f).slice(0, -1), menuLine];
  go('hub');
}
function closeHub() { hubOpen = false; hubWin = null; V.setOrder(null); if (module === 'hub') go('map'); else dirty = true; }
function hubEcho(text) { hubLines.push({ cls: 'you', html: V.esc(text) }); }
// A menu pick opens its window; it isn't echoed into the session (the menu already says what it is).
function pickHub(key) {
  hubWin = key || null; V.setOrder(null); feel.key('click'); dirty = true;
}
// The market's order ticket: which ware, Sell or Buy, how many (the slider). Dragging updates the
// ticket's numbers in place, and the page doesn't redraw under your pointer until you let go.
let mkOrder = null, mkDrag = false;
function setMkOrder(o) { mkOrder = o; V.setOrder(o); dirty = true; }
function ticketLive() {
  if (!mkOrder) return;
  const k = V.ticketNumbers(campaign, mkOrder.f, mkOrder.w, mkOrder.side, mkOrder.n);
  if (!k.max) return;
  const set = (key, v) => { const el = document.querySelector(`[data-mk-out="${key}"]`); if (el) el.textContent = v; };
  set('n', k.n); set('n2', k.n); set('total', k.total); set('each', k.each); set('vs', k.vs); set('after', k.after);
  document.querySelector('[data-mk-out="vs"]')?.classList.toggle('up', k.vsUp);
  const go = document.querySelector('.mk-go'); if (go) go.dataset.command = k.cmd;
}
document.addEventListener('input', (e) => { if (e.target.matches?.('[data-mk-n]') && mkOrder) { mkOrder.n = Number(e.target.value) || 1; ticketLive(); } });
document.addEventListener('pointerdown', (e) => { if (e.target.matches?.('[data-mk-n]')) mkDrag = true; });
addEventListener('pointerup', () => { if (mkDrag) { mkDrag = false; dirty = true; } });
document.addEventListener('change', (e) => { if (e.target.matches?.('[data-mk-n]')) { mkDrag = false; dirty = true; } });
// The map's Show picker (All · Mine · Targets · Threats).
// The map's Show picker: its own listener, ahead of the map's, so opening and closing always work.
// The summary toggles it; Show all clears; a click anywhere else (or Esc) closes it.
document.addEventListener('click', (e) => {
  const pick = e.target.closest?.('details.map-pick');
  if (e.target.closest?.('[data-mapfilter-toggle]')) { e.preventDefault(); mapPickOpen = !pick?.open; if (pick) pick.open = mapPickOpen; dirty = true; return; }
  if (e.target.closest?.('[data-mapfilter-clear]')) { mapFilter = []; mapPickOpen = false; dirty = true; return; }
  if (!pick && (mapPickOpen || document.querySelector('details.map-pick[open]'))) { mapPickOpen = false; document.querySelectorAll('details.map-pick[open]').forEach((d) => (d.open = false)); dirty = true; }
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('details.map-pick[open]')) { mapPickOpen = false; document.querySelectorAll('details.map-pick[open]').forEach((d) => (d.open = false)); dirty = true; } });
document.addEventListener('change', (e) => {
  const k = e.target.dataset?.mapfilterCheck;
  if (k) { mapFilter = e.target.checked ? [...new Set([...mapFilter, k])] : mapFilter.filter((x) => x !== k); mapPickOpen = true; dirty = true; }
});
const hubShown = () => hubOpen && module === 'hub';
function previewAim(s, text) {
  const key = () => aimPreview && aimPreview.target + aimPreview.ok + aimPreview.ability;
  const was = key();
  aimPreview = null;
  if (module === 'combat' && active(s) && text.trim()) {
    const intent = parse(s, text.trim().replace(/\s(last|late)$/, '')); // "… last" only changes when it goes
    if (intent?.target) { const why = validate(s, intent); aimPreview = { target: intent.target, ability: intent.ability, ok: !why, why: why || '', text: text.trim() }; }
  }
  if (key() !== was) dirty = true; // a different ability changes what the board expects it to do
}

// ---------- map zoom ----------
// The wheel zooms around the cursor (up to 5×), a drag pans, a double-click (or ⤢) zooms out.
// Kept here, not on the save: it's a view. Re-applied after every map render.
const mapZoom = { k: 1, cx: 0, cy: 0 };
const mapSvg = () => $('page-view')?.querySelector('.map-svg');
const baseVb = (svg) => svg.dataset.vb.split(' ').map(Number);
// Put the card beside the selected node: to its right, or its left when there's no room.
let popAt = null; // the last spot: a redraw puts the card straight back there, so it never moves
// Anchored to the node's hit circle (its rings and labels change size), and measured again only
// when the selection, the zoom or the canvas changes.
function placeMapPop() {
  const pop = $('map-pop'), canvas = pop?.closest('.map-canvas'), node = canvas?.querySelector('.mnode.selected .mhit');
  if (!pop) return;
  if (!node) { pop.style.visibility = 'hidden'; return; }
  const c = canvas.getBoundingClientRect();
  const key = [mapSel, mapZoom.k, mapZoom.cx, mapZoom.cy, Math.round(c.width), Math.round(c.height)].join('|');
  if (popAt?.key === key) { pop.style.left = popAt.left; pop.style.top = popAt.top; pop.style.visibility = 'visible'; return; }
  const n = node.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, gap = 14;
  if (!n.width) return;
  const cx = n.left + n.width / 2 - c.left, cy = n.top + n.height / 2 - c.top, r = n.width / 2;
  let left = cx + r + gap;
  if (left + w > c.width - 8) left = cx - r - gap - w;
  left = Math.max(8, Math.min(c.width - w - 8, left));
  const top = Math.max(8, Math.min(c.height - h - 8, cy - 40));
  pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(top) + 'px'; pop.style.visibility = 'visible';
  popAt = { key, left: pop.style.left, top: pop.style.top };
}
function applyMapZoom() {
  const svg = mapSvg();
  if (!svg) return;
  const [x, y, w, h] = baseVb(svg);
  const fix = () => { const a = svg.getScreenCTM()?.a; if (a) { svg.style.setProperty('--z', a); if (V.setMapScale(a)) dirty = true; } placeMapPop(); }; // a new scale: labels re-sort who fits // text keeps its size on screen, at any width or zoom
  if (mapZoom.k <= 1) { mapZoom.k = 1; svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); svg.classList.remove('zoomed'); return fix(); }
  const zw = w / mapZoom.k, zh = h / mapZoom.k;
  mapZoom.cx = Math.max(x + zw / 2, Math.min(x + w - zw / 2, mapZoom.cx));
  mapZoom.cy = Math.max(y + zh / 2, Math.min(y + h - zh / 2, mapZoom.cy));
  svg.setAttribute('viewBox', `${mapZoom.cx - zw / 2} ${mapZoom.cy - zh / 2} ${zw} ${zh}`);
  svg.classList.add('zoomed');
  fix();
}
const svgPoint = (svg, e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
document.addEventListener('wheel', (e) => {
  const svg = e.target.closest?.('.map-svg');
  if (!svg) return;
  e.preventDefault();
  const [x, y, w, h] = baseVb(svg);
  if (mapZoom.k <= 1) { mapZoom.cx = x + w / 2; mapZoom.cy = y + h / 2; }
  const p = svgPoint(svg, e), k0 = mapZoom.k, k = Math.max(1, Math.min(5, k0 * (e.deltaY < 0 ? 1.25 : 1 / 1.25)));
  mapZoom.cx = p.x + (mapZoom.cx - p.x) * (k0 / k);
  mapZoom.cy = p.y + (mapZoom.cy - p.y) * (k0 / k);
  mapZoom.k = k;
  applyMapZoom();
}, { passive: false });
let mapDrag = null;
document.addEventListener('pointerdown', (e) => {
  const svg = e.target.closest?.('.map-svg');
  if (svg && mapZoom.k > 1 && e.button === 0) mapDrag = { x: e.clientX, y: e.clientY, cx: mapZoom.cx, cy: mapZoom.cy, moved: false, scale: svg.getScreenCTM().a };
});
document.addEventListener('pointermove', (e) => {
  if (!mapDrag) return;
  const dx = e.clientX - mapDrag.x, dy = e.clientY - mapDrag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) mapDrag.moved = true;
  if (!mapDrag.moved) return;
  mapZoom.cx = mapDrag.cx - dx / mapDrag.scale;
  mapZoom.cy = mapDrag.cy - dy / mapDrag.scale;
  applyMapZoom();
});
document.addEventListener('pointerup', () => { if (mapDrag?.moved) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 0); } mapDrag = null; });
document.addEventListener('dblclick', (e) => { if (e.target.closest?.('.map-svg')) { mapZoom.k = 1; applyMapZoom(); } });
document.addEventListener('click', (e) => { if (e.target.closest?.('[data-map-zoom]')) { mapZoom.k = 1; applyMapZoom(); } });

// ---------- rendering ----------
const cache = new Map();
function put(id, html) {
  if (cache.get(id) === html) return;
  cache.set(id, html);
  const el = $(id);
  const open = [...el.querySelectorAll('details')].map((d) => d.open); // re-renders keep what you opened
  const kept = new Map([...el.querySelectorAll('[data-keep]')].map((k) => [k.dataset.keep, k.scrollTop])); // and where you scrolled
  el.innerHTML = html;
  el.querySelectorAll('details').forEach((d, i) => { if (open[i]) d.open = true; });
  for (const k of el.querySelectorAll('[data-keep]')) if (kept.get(k.dataset.keep)) k.scrollTop = kept.get(k.dataset.keep);
}

function renderMeters() {
  const srv = campaign.server;
  const h = hackerOf(campaign), cls = classOf(campaign);
  $('level-label').textContent = V.className(cls);
  $('level-value').textContent = 'Lv ' + h.level;
  $('level-fill').style.width = (h.level >= 50 ? 100 : (h.xp / V.xpNeeded(h.level)) * 100) + '%';
  $('meter-level').title = `${V.className(cls)} level ${h.level} of 50${h.level < 50 ? ` · ${h.xp}/${V.xpNeeded(h.level)} XP to level ${h.level + 1}` : ' (max)'}. Each class levels on its own; every level adds 4% power.`;
  // Top centre: who you are (handle · class · level), the class's XP as a thin bar under it.
  $('who-handle').textContent = campaign.profile?.handle || 'rookie';
  $('who-class').textContent = V.className(cls);
  $('who-lv').textContent = h.level;
  $('who-fill').style.width = (h.level >= 50 ? 100 : (h.xp / V.xpNeeded(h.level)) * 100) + '%';
  const behind = behindOf(campaign)?.on; // Behind: the XP bar turns amber while kills pay +50% on a level running long
  $('whoami').classList.toggle('behind', !!behind);
  $('whoami').title = `${h.level >= 50 ? 'max' : `${h.xp}/${V.xpNeeded(h.level)} XP`}${behind ? ' · Behind: kills +50% XP until the next level' : ''}`;
  const pct = (srv.integrity / srv.max) * 100;
  $('integrity-fill').style.width = pct + '%';
  $('integrity-value').textContent = srv.integrity;
  $('meter-integrity').classList.toggle('critical', pct <= 25);
  const inv = campaign.invasion;
  const onIt = inv && active(campaign) && campaign.encounter.invader === inv.id; // no chip while you fight it
  const note = campaign.degraded ? `DEGRADED ${fmtLeft(degradedLeft(campaign))}` : onIt ? '' : inv?.state === 'breach' ? 'BREACH' : inv?.state === 'siege' ? 'SIEGE' : '';
  $('integrity-note').hidden = !note;
  $('meter-integrity').classList.toggle('noted', !!note);
  $('integrity-note').textContent = note;
  $('integrity-note').className = 'meter-note ' + (campaign.degraded ? 'degraded' : inv?.state || '');
  $('meter-integrity').classList.toggle('breaching', !campaign.degraded && !onIt && inv?.state === 'breach'); // a breach: the meter itself flashes
  // Click a meter that isn't full to pay for the rest (topUp in data.mjs); the hover says what it costs.
  const meterBuy = (el, cmd, cost, base) => {
    const can = !!cost && !active(campaign);
    if (can) { el.dataset.command = cmd; el.setAttribute('role', 'button'); el.tabIndex = 0; } else { delete el.dataset.command; el.removeAttribute('role'); el.removeAttribute('tabindex'); }
    el.title = base + (can ? ` Click to fill it now: ${cost} credits.` : '');
  };
  {
    const missing = srv.max - srv.integrity, mins = Math.ceil(missing / (CONFIG.restRegen * srv.max));
    meterBuy($('meter-integrity'), 'repair', srv.integrity > 0 ? topUpCost(campaign, 'server') : 0,
      `Server Integrity ${srv.integrity}/${srv.max}. At 0 the server crashes and reboots at half, degraded for 10 minutes.${missing > 0 && srv.integrity > 0 ? ` Rests back to full in about ${mins} min.` : ''}`);
  }
  $('vault-value').textContent = srv.credits;
  // Signal: your health out on the net. At home it rests back; on a run the run's own header shows it.
  {
    const sig = campaign.run ? campaign.run.integrity : signalNow(campaign), max = campaign.run ? campaign.run.max : maxSignal(campaign);
    const f = max ? sig / max : 0, need = CONFIG.zone.minSignal;
    const m = $('meter-signal');
    m.hidden = !!campaign.run || active(campaign) || !!campaign.breach || !!campaign.rooms; // a fight has its own bars, a breach and the rooms their own page
    $('signal-value').textContent = sig;
    const lit = Math.ceil(f * 5 - 1e-9);
    m.querySelectorAll('.sig-bars i').forEach((b, i) => b.classList.toggle('on', i < lit));
    m.classList.toggle('weak', f < need);
    m.classList.toggle('resting', !campaign.run && !active(campaign) && sig < max);
    const mins = Math.ceil((max - sig) / (CONFIG.signalRest * max));
    // Resting: a clock to full (to connect, while too weak for it), so a low meter says when, not just "slowly".
    const resting = !campaign.run && !active(campaign) && sig < max;
    const goal = f < need ? Math.ceil(max * need) : max, secs = Math.max(0, Math.ceil(((goal - sig) / (CONFIG.signalRest * max)) * 60));
    const eta = $('signal-eta');
    eta.hidden = !resting;
    if (resting) { eta.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; eta.title = f < need ? 'Time until you have enough Signal to connect' : 'Time until Signal is full'; }
    meterBuy(m, 'top up', campaign.run ? 0 : topUpCost(campaign, 'signal'),
      `Signal ${sig}/${max}: your health out on the net. ${sig < max ? `Rests back to full in about ${mins} min at home.${f < need ? ` You need ${Math.ceil(max * need)} to connect.` : ''}` : 'Full.'}`);
  }
  const s = shown();
  // On a run, Signal lives in the prompt, the net header and the combat HUD.
  // Fight and Run tabs appear only while there is a fight or a run.
  $('tab-combat').hidden = !active(campaign);
  $('tab-net').hidden = !campaign.run || !!campaign.run.breach || !!campaign.run.rooms;
  $('tab-breach').hidden = !campaign.breach;
  document.body.classList.toggle('rooms-page', !!campaign.rooms && module === 'rooms'); // its notices pop up mid-screen
  $('tab-rooms').hidden = !campaign.rooms;
  $('tab-rooms').textContent = campaign.roomsPlay ? 'Server' : 'Run'; // on the network a server's rooms are your run (the Server tab is your home server)
  document.body.classList.toggle('rooms-mode', !!campaign.roomsPlay); // the rooms playtest: the old game's tabs and meters step aside
  $('tab-campaign').hidden = !CAMP;
  $('tab-archive').hidden = !CAMP;
  $('tab-room').hidden = !CAMP;
  document.body.classList.toggle('breach-mode', !!campaign.breach); // a breach playtest: the campaign's tabs and meters step aside
  document.body.classList.toggle('campaign-mode', CAMP); // the breach campaign: the old game's tabs, meters and pager step aside
  document.body.classList.toggle('ctx-tabs', active(campaign) || !!campaign.run);
  $('combat-dot').hidden = !active(campaign) || module === 'combat';
  const unreadMail = (campaign.mail?.list || []).filter((m) => !m.read).length;
  $('mail-count').hidden = !unreadMail;
  $('mail-count').textContent = unreadMail;
  const readyN = openContracts(campaign).filter((c) => ready(campaign, c)).length; // a contract to hand in: a check by Mail
  $('mail-ready').hidden = !readyN;
  $('mail-ready').title = `${readyN} contract${readyN === 1 ? '' : 's'} ready to deliver`;
  $('tab-store').hidden = true; // Halcyon's store lives in its hub (connect halcyon → Shop)
  // Craft shows up once there's something to make (WoW/FFXIV unlock UI as you go): a recipe, a plan, a config or filter source.
  const craftable = (campaign.recipes || []).length || (campaign.plans || []).length || (campaign.filterRecipes || []).length || (campaign.harvesters || []).length;
  document.querySelector('[data-module="craft"]').hidden = !craftable && module !== 'craft';
  $('tab-consortium').hidden = !consortiumOf(campaign) && !campaign.consortiumInvite;
  fitTopbar();
  const need = alertsOf(campaign).length + (campaign.consortiumInvite && !consortiumOf(campaign) ? 1 : 0);
  $('con-count').hidden = !need;
  $('con-count').textContent = need;
  if (module === 'loadout' && loadoutTab === 'daemons') V.sawTab(campaign, 'daemons'); // daemons are a Loadout tab
  if (module === 'loadout' && loadoutTab !== 'daemons') V.sawTab(campaign, 'skills'); // new skills: seen once you open Loadout
  for (const t of ['loadout', 'craft']) {
    if (module === t && !(t === 'loadout' && loadoutTab === 'daemons')) V.sawTab(campaign, t); // you're looking at it
    const n = V.newOn(campaign, t) + (t === 'loadout' ? V.newOn(campaign, 'daemons') + V.newOn(campaign, 'skills') : 0), el = $('new-' + t);
    el.hidden = !n;
    el.textContent = n;
    el.title = `${n} new`;
  }
  $('sound').textContent = 'Sound';
  $('sound').setAttribute('aria-pressed', String(campaign.settings.sound));
  feel.ambience(!!campaign.settings.sound);
  const vols = V.volumesOf(campaign);
  if (JSON.stringify(vols) !== lastVols) { lastVols = JSON.stringify(vols); feel.volumes(vols); }
  feel.soundtrack({ on: !!campaign.settings.sound, music: campaign.settings.music !== false, radio: campaign.settings.radio !== false, mood: active(campaign) ? 'fight' : campaign.run ? 'run' : 'home' });
  $('speed').textContent = `${cycleLength(campaign) / 1000}s cycle`;
  $('speed').title = `Speed: ${campaign.settings.speed || 'normal'}. Click for relaxed (12s) / normal (8s) / fast (5s). Rules count cycles, so balance never changes.`;
  $('motion').textContent = 'Motion';
  $('haptics').hidden = !feel.canBuzz();
  casing();
  pagerUi();
  peopleUi();
  $('haptics').setAttribute('aria-pressed', String(!!campaign.settings.haptics));
  $('motion').setAttribute('aria-pressed', String(campaign.settings.motion));
  document.body.classList.toggle('no-motion', !campaign.settings.motion);
  document.body.dataset.fx = fxLevel(); // Effects: style.css quiets what moves on the board (a tether's snap) at minimal
}

// The crew: a narrow side column on every page while you have a crew (none when solo).
// (`sidebar off` hides it.)
const crewOn = () => campaign.settings.sidebar !== false && matesOf(campaign).length > 0;
const sidebarOn = () => crewOn();
let crewWin = { x: null, y: 96, collapsed: false };
try { crewWin = { ...crewWin, ...JSON.parse(localStorage.getItem('bb-crewwin') || '{}') }; } catch { /* storage unavailable */ }
const saveCrewWin = () => { try { localStorage.setItem('bb-crewwin', JSON.stringify(crewWin)); } catch { /* storage unavailable */ } };
// Pinned at the top left of the page area, just inside it.
function placeCrewWin() {
  const el = $('crewwin'), area = $('page-view');
  if (!el || el.hidden || !area) return;
  const r = area.getBoundingClientRect();
  el.style.left = r.left + 12 + 'px';
  el.style.top = r.top + 12 + 'px';
}
function renderCrewWin(s, docked) {
  const on = false; // the crew lives in the side column now (kept for narrow screens later)
  $('crewwin').hidden = !on;
  if (!on) return;
  put('crewwin', V.crewWindowMarkup(s, { preview: aimPreview, collapsed: crewWin.collapsed }));
  placeCrewWin();
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-cw-toggle]')) { crewWin.collapsed = !crewWin.collapsed; saveCrewWin(); dirty = true; } });
addEventListener('resize', () => placeCrewWin());
// The map's selection card pops up beside the node you clicked.
let mapPop = false;
let mapList = false, mapSort = 'status', pendingLocate = null; // the map's List mode (MOO2's planets list), its sort column, and a Locate waiting for the map to draw
let mapFilter = []; // the map's Show picker: any of mine · targets · threats (none = all; the rest dims)
let mapFloor = null; // the floor the map shows (floors.mjs): the floor panel's pick; a selection on another floor shows that one
let mapPickOpen = false; // whether the picker's menu is open (it survives redraws)
let leadsOpen = false; // a run's Leads panel (the run header's toggle)
let memYes = null; // the found server you just said yes to (its connect goes through)
addEventListener('resize', () => { dirty = true; applyMapZoom(); });
// A page's markup, or, if drawing it throws, a card with the error to copy into a bug report.
function pageOrError(draw) {
  try { return draw(); } catch (err) {
    console.error(err);
    const text = `${module}: ${err?.message || err}\n${String(err?.stack || '').split('\n').slice(1, 6).join('\n')}`;
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    return `<section class="card page-error"><h2>This page hit an error</h2><p class="svc-line">The rest of the game still works. Send this text with your bug report.</p><pre>${esc(text)}</pre><div class="row"><button type="button" class="btn primary" data-module="map">Back to the map</button></div></section>`;
  }
}
const fitBoard = { key: null }; // the fight whose board went dense (render)
function render(force = false) {
  if (force) cache.clear();
  renderMeters();
  shell.apply(module);
  const combatLike = module === 'combat';
  const s = shown();
  const hasFight = !!s.encounter;
  $('combat-view').hidden = !(combatLike && hasFight);
  $('page-view').hidden = combatLike && hasFight;
  // The sidebar: every page, fights too (wide screens; `sidebar off` hides it).
  const side = sidebarOn();
  document.body.classList.toggle('with-sidebar', side);
  const ph = active(campaign) ? V.phaseOf(campaign) : null;
  for (const k of ['you', 'them', 'wait']) document.body.classList.toggle('phase-' + k, ph === k);
  $('sidebar').hidden = !side;
  if (side) put('sidebar', `<section class="crewwin docked">${V.crewWindowMarkup(s, { preview: aimPreview })}</section>`);
  renderCrewWin(s, side);
  if (combatLike && hasFight) {
    put('hud', V.hudMarkup(s, { party: !side, preview: aimPreview }));
    flyStatuses(s);
    // A new cycle: remember where every chip was, so the board can move them instead of jumping.
    const cycleKey = s.encounter.virus.id + ':' + s.encounter.cycle;
    const turned = shownCycle && shownCycle !== cycleKey && shownCycle.startsWith(s.encounter.virus.id + ':') && canMove();
    const before = turned ? chipSnapshot() : null;
    put('board', (active(s) && s.encounter.paused ? '<div class="pause-strip" role="status">PAUSED · ANY ORDER RESUMES</div>' : '') + V.boardMarkup(s, selected, aimPreview));
    if (held.size) applyHeld(); // a batch still playing: its bars hold until each hit lands
    $('board').classList.toggle('is-paused', !!(active(s) && s.encounter.paused));
    // Every part on screen: if the rows overflow the board, tighten them (style.css .dense) for the rest of the fight.
    { const bd = $('board'), key = s.encounter.virus.id; if (fitBoard.key !== key) { fitBoard.key = key; bd.classList.remove('dense'); } if (!bd.classList.contains('dense') && bd.scrollHeight > bd.clientHeight + 2) bd.classList.add('dense'); }
    for (const f of pendingStrikes.splice(0)) f();
    if (before) turnTimeline(before);
    cycleChanged(s);
    setBand(s);
    const logBefore = cache.get('log');
    put('log', V.logMarkup(s));
    if (cache.get('log') !== logBefore) {
      if (logBefore !== undefined) shell.typeIn($('log'), s.logs.length - (render.logLen ?? s.logs.length));
      $('log').scrollTop = $('log').scrollHeight;
    }
    render.logLen = s.logs.length;
  } else if (combatLike && campaign.rooms) {
    return go('rooms', true); // a room fight that's over: back to the server
  } else if (combatLike && (campaign.breach || CAMP)) {
    return go(campaign.breach ? 'breach' : 'campaign', true); // a breach fight that's over: back to its page, never the old map
  } else if (combatLike) {
    put('page-view', V.mapMarkup(campaign, mapSel, mapView, { side: false, pop: mapPop, filter: mapFilter, list: mapList, sort: mapSort, pickOpen: mapPickOpen, floor: mapFloor }));
    applyMapZoom();
  } else if (module === 'net') {
    const before = cache.get('page-view');
    const lines = $('term')?.children.length;
    put('page-view', V.netMarkup(campaign, { leads: leadsOpen }));
    if (cache.get('page-view') !== before && $('term')) {
      if (lines !== undefined && before !== undefined) shell.typeIn($('term'), $('term').children.length - lines);
      $('term').scrollTop = $('term').scrollHeight;
    }
  } else {
    const pages = { rooms: (x) => roomsMarkup(x), campaign: (x) => campaignMarkup(x), room: (x) => roomMarkup(x), archive: (x) => archiveMarkup(x), breach: (x) => breachMarkup(x), map: (x) => V.mapMarkup(x, mapSel, mapView, { side: false, pop: mapPop, filter: mapFilter, list: mapList, sort: mapSort, pickOpen: mapPickOpen, floor: mapFloor }), loadout: (x) => V.loadoutMarkup(x, archView, loadoutTab), craft: (x) => V.craftMarkup(x, craftUi), mail: (x) => V.mailMarkup(x, mailSel), store: (x) => V.storeMarkup(x, Date.now()), consortium: (x) => V.consortiumMarkup(x, Date.now()), hub: (x) => V.hubTerminalMarkup(x, hubSel, hubLines, hubWin, Date.now()), server: (x) => V.serverMarkup(x, Date.now()), daemons: V.daemonsMarkup, codex: (x) => codexPageMarkup(x, codexSel, codexIdx), system: V.systemMarkup };
    // A page that throws shows what broke (and a way back) instead of stopping every render after it.
    const keep = module === 'breach' ? $('bx-scroll')?.scrollTop : null;
    const focusRoom = module === 'rooms' ? document.activeElement?.closest?.('.fp-room')?.dataset.room : null; // a redraw keeps a focused room focused
    const focusCx = module === 'codex' ? document.activeElement?.closest?.('[data-codex], [data-codex-fold]') : null; // and a Codex row its focus
    const focusCxKey = focusCx ? (focusCx.dataset.codex ?? 'fold') : null;
    if (!(module === 'hub' && mkDrag)) put('page-view', pageOrError(() => (pages[module] || pages.map)(campaign))); // not while you drag a ticket's slider
    if (focusRoom && !document.activeElement?.closest?.('.fp-room')) [...$('page-view').querySelectorAll(`.fp-room[data-room="${CSS.escape(focusRoom)}"][tabindex]`)].find((t) => t.getBoundingClientRect().width)?.focus({ preventScroll: true });
    if (module === 'breach') breachScroll(keep);
    if (module === 'codex') codexDrawn(focusCxKey);
    if (module === 'rooms') { applyFpZoom(); fillClocks($('page-view')); placeRoomsPop(); pzFx.mounted(); } // the countdowns tick in place: the markup only changes with the server
    // The Mail page opens the first unread item by itself: showing it in full counts as reading it.
    if (module === 'mail') { const o = $('page-view').querySelector('.mrow.open.unread'); if (o) { const k = o.dataset.mail, id = k[0] === 'l' ? k.slice(1) : campaign.mail?.list?.find((m) => m.job === Number(k.slice(1)))?.id; if (id != null) { command(campaign, 'mail read ' + id); save(); dirty = true; } } }
    if (module === 'hub' && $('hubterm')) {
      const grew = hubLines.length - (render.hubLen ?? 0);
      if (grew > 0) shell.typeIn($('hubterm'), grew);
      render.hubLen = hubLines.length;
      $('hubterm').scrollTop = $('hubterm').scrollHeight;
    } else render.hubLen = 0;
    if (module === 'map' || !pages[module]) {
      // Locate: centre on the node and zoom in (3×), then draw as usual.
      const node = pendingLocate && $('page-view').querySelector(`.mnode[data-select="${CSS.escape(pendingLocate)}"]`);
      if (node) { const m = node.getAttribute('transform')?.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/); if (m) { mapZoom.k = 3; mapZoom.cx = Number(m[1]); mapZoom.cy = Number(m[2]); } }
      if (pendingLocate && (node || module === 'map')) pendingLocate = null;
      applyMapZoom();
    }
  }
  if (module === 'net' && campaign.run) {
    rain.mount($('page-view'));
    rain.mood({ tension: Math.max(0, 1 - campaign.run.integrity / campaign.run.max), hot: campaign.encounter?.mode === 'run' });
  } else rain.stop();
  const netTray = module === 'net' && !!campaign.run;
  $('tray').hidden = !(combatLike || netTray);
  $('tray').classList.toggle('net-tray', netTray);
  put('tray', netTray ? V.netTrayMarkup(nextActions(campaign)) : V.trayMarkup(s) + scriptTray(s));
  // An ability that just came off cooldown flashes once.
  const cooling = new Set([...document.querySelectorAll('#tray .ability.cooling[data-ability]')].map((b) => b.dataset.ability));
  for (const b of document.querySelectorAll('#tray .ability.ready[data-ability]')) if (wasCooling.has(b.dataset.ability)) b.classList.add('just-ready');
  wasCooling = cooling;
  applySideMarks();
  showArmed();
  renderPrompt();
  placeTip();
  dirty = false;
}

// On a run the prompt itself carries Signal and where you are.
function renderPrompt() {
  const el = document.querySelector('.prompt');
  const r = campaign.run;
  if (active(campaign) && V.phaseOf(campaign) === 'them') {
    el.className = 'prompt acting';
    el.innerHTML = `<span>${V.esc(campaign.encounter.virus.name)} acts…</span>`;
  } else if (campaign.rooms) {
    const R = campaign.rooms, sig = FP.signalNow(campaign), here = FP.hereOf(campaign);
    el.className = 'prompt run ' + V.signalLevel({ integrity: sig, max: R.max });
    el.innerHTML = `<span class="p-sig">[${sig}/${R.max}]</span> <span class="p-loc">${V.esc(R.name || R.id)} ›</span> <span class="p-cwd">${V.esc(here ? here.path : 'outside')}</span>`;
    $('command-input').placeholder = active(campaign) ? '' : here ? 'go <room> · wait · ls' : campaign.roomsPlay ? 'connect' : '';
  } else if (campaign.breach) {
    const b = campaign.breach, sig = BR.signalOf(campaign), max = BR.maxOf(campaign);
    el.className = 'prompt run ' + V.signalLevel({ integrity: sig, max });
    el.innerHTML = `<span class="p-sig">[${sig}/${max}]</span> <span class="p-loc">${V.esc(BR.cardOf(campaign).id)}:</span><span class="p-cwd">${V.esc(BR.currentNode(campaign)?.path || '/')}$</span>`;
    $('command-input').placeholder = b.result ? '' : 'ls · cd <n> · tree';
  } else if (r) {
    el.className = 'prompt run ' + V.signalLevel(r);
    el.innerHTML = `<span class="p-sig">[${r.integrity}/${r.max}]</span> <span class="p-loc">${V.esc(currentLocation(campaign).id)}:</span><span class="p-cwd">${V.esc(r.cwd)}$</span>`;
    $('command-input').placeholder = '';
  } else if (hubShown()) {
    el.className = 'prompt hub';
    el.innerHTML = `<span>${V.esc(campaign.profile?.handle || 'rookie')}@${V.esc(V.hubHost(campaign, hubSel))}:~$</span>`;
  } else {
    el.className = 'prompt';
    el.innerHTML = `<span>${V.esc(campaign.profile?.handle || 'rookie')}@blackbox:~$</span>`;
    $('command-input').placeholder = '';
  }
}

// The Now band: every row's Now cell fills as the cycle runs, and turns red
// in the last 1.5 seconds when something is about to land on you.
function setBand(s) {
  const board = $('board');
  if (!board || !s.encounter) return;
  const e = s.encounter;
  board.style.setProperty('--elapsed', (active(s) ? (e.elapsedMs / cycleLength(s)) * 100 : 0).toFixed(1) + '%');
  const closing = active(s) && !e.paused && cycleLength(s) - e.elapsedMs <= 1500 && intents(s, 1).some((i) => i.col === 0 && !i.hidden);
  board.classList.toggle('closing', closing);
}

// When a cycle ends, attacks slide one column left and the Now band flashes,
// so you can see what moved. Skipped when Motion is off.
let shownCycle = null;
function cycleChanged(s) {
  const e = s.encounter, board = $('board');
  const key = e.virus.id + ':' + e.cycle;
  if (shownCycle === key) return;
  const first = shownCycle === null || !shownCycle.startsWith(e.virus.id + ':');
  shownCycle = key;
  if (first || !active(s) || !canMove()) return;
  const col = board.querySelector('.bhead .bcell:nth-child(3)');
  if (col) board.style.setProperty('--shift', col.getBoundingClientRect().width + 'px');
  board.classList.remove('shifted');
  void board.offsetWidth; // restart the animation
  board.classList.add('shifted');
  clearTimeout(cycleChanged.t);
  cycleChanged.t = setTimeout(() => board.classList.remove('shifted'), 450);
}

// ---------- the timeline turning over ----------
// When a cycle resolves, the board shows the move instead of jumping: every chip slides one column
// left (FLIP: it starts where it was and eases to where it is now), what resolved this cycle fires
// (an attack flies at your bar, your command at its target, a patch clamps shut) and fades, and
// anything new drifts in from the right. Motion off skips all of it.
function chipSnapshot() {
  return [...$('board').querySelectorAll('[data-k]')].map((el) => ({ k: el.dataset.k, at: el.dataset.at || '', rect: el.getBoundingClientRect(), html: el.outerHTML, cls: el.className }));
}
function turnTimeline(before) {
  const board = $('board');
  const now = new Map([...board.querySelectorAll('[data-k]')].map((el) => [el.dataset.k, el]));
  const ease = 'cubic-bezier(.2,.75,.25,1)';
  for (const b of before) {
    const el = now.get(b.k);
    if (el) {
      const r = el.getBoundingClientRect();
      const dx = b.rect.left - r.left, dy = b.rect.top - r.top;
      if (Math.abs(dx) + Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 440, easing: ease });
      if (el.classList.contains('now') && !/\bnow\b/.test(b.cls)) el.animate([{ boxShadow: '0 0 0 0 rgba(255, 91, 61, 0.7)' }, { boxShadow: '0 0 0 6px rgba(255, 91, 61, 0)' }], { duration: 700, delay: 380, easing: 'ease-out' });
    } else fire(b);
  }
  const was = new Set(before.map((b) => b.k));
  for (const [k, el] of now) if (!was.has(k)) el.animate([{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 160, easing: 'ease-out', fill: 'backwards' });
  const cyc = board.querySelector('.bnow .cyc');
  if (cyc) cyc.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
}
// What resolved this cycle: a ghost of the chip plays out where it was.
function fire(b) {
  const g = document.createElement('div');
  g.className = 'fx-ghost';
  g.innerHTML = b.html;
  Object.assign(g.style, { left: b.rect.left + 'px', top: b.rect.top + 'px', width: b.rect.width + 'px', height: b.rect.height + 'px' });
  document.body.appendChild(g);
  const center = (el) => { const r = el?.getBoundingClientRect(); return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; };
  const from = { x: b.rect.left + b.rect.width / 2, y: b.rect.top + b.rect.height / 2 };
  let to = null, frames;
  if (/\bnow\b/.test(b.cls) && !/mine|daemon|patch/.test(b.cls)) to = center(document.querySelector('.hud-bar.mine .bigbar')); // an attack lands on you
  else if (/mine|daemon/.test(b.cls) && b.at) to = center(document.querySelector(`.board [data-target="${CSS.escape(b.at)}"] .part-bar`)); // your command hits its target
  if (to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    frames = [{ transform: 'none', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(1.12)', opacity: 1, filter: 'brightness(1.8)', offset: 0.2 }, { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0, filter: 'brightness(2)' }];
  } else frames = [{ transform: 'none', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(0.8)', opacity: 0 }];
  g.animate(frames, { duration: to ? 560 : 480, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = () => g.remove();
}

// ---------- the monitor casing ----------
// Desktop, immersive shell: the screen sits in a monitor whose bezel lamps show real state.
function casing() {
  // The monitor and its window only fit a desktop-sized screen (style.css, the casing media query).
  const roomy = matchMedia('(min-width: 1100px) and (min-height: 720px)').matches;
  const cased = shellOn() && campaign.settings.casing !== false, win = cased && roomy && campaign.settings.window !== false;
  const moved = document.body.classList.contains('cased') !== cased || document.body.classList.contains('window-on') !== win;
  document.body.classList.toggle('cased', cased);
  document.body.classList.toggle('window-on', win);
  outside.set(win);
  if (moved && win) outside.remeasure();
  if (win !== outsideShown || moved) { outsideShown = win; feel.rain(win ? outsideRain : 0); }
  feel.street(win);
  const s = campaign, e = s.encounter, gate = V.gateOf(s), inv = s.invasion;
  const lamp = (id, state, title) => { const el = $('lamp-' + id); el.className = 'lamp ' + (state || ''); el.title = title; };
  lamp('pwr', s.degraded ? 'hot' : 'on', s.degraded ? `Degraded · ${fmtLeft(degradedLeft(s))}` : 'Power');
  lamp('gate', gate ? (gate.phase === 'active' ? 'hot' : 'on') : e?.phase === 'active' ? 'hot' : '', gate ? `${gate.virus.name} at the gate` : 'Gate clear');
  lamp('wall', !inv ? '' : s.degraded ? 'low' : inv.state === 'breach' ? 'hot' : inv.state === 'siege' ? 'on' : 'low', inv ? `${inv.name}: ${inv.state === 'travel' ? 'on its way' : inv.state}` : 'Wall quiet');
  lamp('net', s.run ? 'you' : '', s.run ? `On a run: ${s.run.loc}` : 'Not connected');
  lamp('inst', s.install ? (s.degraded ? 'low' : 'on') : '', s.install ? 'Installing' : 'Install queue idle');
  lamp('dmn', s.daemons?.length ? 'you' : '', `${(s.daemons || []).length} daemons slotted`);
  $('knob-sound').classList.toggle('on', !!s.settings.sound);
  $('knob-sound').style.transform = `rotate(${s.settings.sound ? 40 : -40}deg)`;
  $('knob-speed').style.transform = `rotate(${{ relaxed: -60, normal: 0, fast: 60 }[s.settings.speed || 'normal']}deg)`;
  $('knob-speed').title = `Speed: ${s.settings.speed || 'normal'}`;
}
$('knob-sound').addEventListener('click', () => $('sound').click());
// Buttons press like hardware (with Sound on).
document.addEventListener('pointerdown', (e) => { if (e.button === 0 && e.target.closest('button, [data-command], [data-run], [data-target], .mnode, .knob')) feel.key('click'); });
$('knob-speed').addEventListener('click', () => $('speed').click());

// Per-frame updates that don't need a re-render.
function tickUi() {
  const s = shown();
  if (!active(s)) return;
  setBand(s);
  const bar = $('cyclebar'), cd = $('countdown');
  if (bar) bar.style.width = (s.encounter.elapsedMs / cycleLength(s)) * 100 + '%';
  // The Sync Window lights while the bar is inside it.
  const sw = $('sync-win');
  if (sw) {
    const live = !s.encounter.paused && inSync(s, s.encounter.elapsedMs / cycleLength(s));
    if (live !== sw.classList.contains('live')) { sw.classList.toggle('live', live); if (live) feel.key('click'); }
    // A gear rule that holds in a Sync Window (fightread.mjs gearLive) is lit while the bar is in it.
    for (const g of document.querySelectorAll('#hud .gfx[data-if="synced"]:not(.spent)')) g.classList.toggle('lit', live || !!s.encounter.synced);
  }
  ttTapTick();
  if (cd) cd.textContent = s.encounter.paused ? 'II' : Math.max(0, (cycleLength(s) - s.encounter.elapsedMs) / 1000).toFixed(1);
  // One warning per cycle when something is about to land on you.
  const left = cycleLength(s) - s.encounter.elapsedMs;
  const key = s.encounter.cycle + ':' + s.encounter.virus.id;
  if (!s.encounter.paused && left <= 1500 && prewarned !== key && intents(s, 1).some((i) => i.col === 0 && !i.hidden)) {
    prewarned = key;
    feel.add('prewarn', '.board .intent.now');
    feel.flush();
  }
}
let prewarned = '';

// Once a second: finish an install whose time is up, and move the Server page's progress bar.
// The bar and clock are patched in place so buttons (and their confirm clicks) survive.
let netSaved = 0;
let lastInput = Date.now(), lastTick = Date.now();
document.addEventListener('keydown', () => { lastInput = Date.now(); }, true);
document.addEventListener('pointerdown', () => { lastInput = Date.now(); }, true);
function services() {
  if (CAMP) return; // the campaign has no clock: nothing installs, rests or invades while you're away
  const now = Date.now();
  // Active play time, for kills an hour (System page): the tab is open and you've touched it in the last 2 minutes.
  const dt = Math.min(5000, now - lastTick); lastTick = now;
  if (!document.hidden && now - lastInput < 120000 && !playtest && !CAMP) tickPlay(campaign, dt); // and the clock of the level your class is on (Behind)
  const hp = campaign.server.integrity;
  const events = campaign.breach || campaign.roomsPlay ? [] : [...tickNetwork(campaign, now), ...tickServices(campaign, now)]; // a breach or rooms playtest has no network
  if (campaign.rooms) { const ev = FP.tick(campaign, now); if (ev.length) react(ev); if (module === 'rooms' || ev.length) dirty = true; } // respawn timers count down on the map
  if (events.length) { react(events); save(); }
  // A siege or breach took a bite: the meter says so.
  const bite = hp - campaign.server.integrity;
  if (bite > 0 && !events.some((e) => e.type === 'degraded')) feel.add('chip', '#meter-integrity', `−${bite}`);
  // An invader on the move, a siege or a breach, or Degraded mode: the map, the Server page and
  // the Integrity meter change a little every second.
  if (campaign.invasion || campaign.degraded) {
    dirty = true;
    if (now - netSaved > 10000) { netSaved = now; save(); }
  }
  if (module === 'mail' && $('pay-left')) $('pay-left').textContent = V.fmtTime(nextPayIn(campaign, now));
  // Offers and shelves count down: refresh those pages now and then.
  if ((module === 'mail' || module === 'store') && now - (services.page || 0) > 15000) { services.page = now; dirty = true; }
  const job = campaign.install;
  if (module !== 'server' || !job) return;
  const bar = document.querySelector('.install-bar span'), left = document.querySelector('.install-top span');
  if (bar) bar.style.width = Math.min(100, ((now - job.startedAt) / (job.doneAt - job.startedAt)) * 100) + '%';
  if (left) left.textContent = V.fmtTime(job.doneAt - now) + ' left';
}

// ---------- first-time tips ----------
// The game's only tutorial: the first time you meet something, a tip points at it, once.
// One at a time; fight tips pause the fight until you close them (Got it, Enter on an empty
// line, Esc, or clicking the thing it points at).
let tip = null;
let tipWait = 0;
function onScreen(sel) {
  const el = document.querySelector(sel);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}
function checkTips(now) {
  if (tip || ending || introOn || !$('levelup').hidden || shell.booting || playtest || now < tipWait) return;
  tipWait = now + 400;
  const t = nextTip(campaign, module, onScreen);
  if (!t) return;
  tip = { t, cur: t, step: 0, paused: false };
  showStep();
  $('tip').hidden = false;
  if (t.pause && active(campaign) && !campaign.encounter.paused) { campaign.encounter.paused = true; tip.paused = true; dirty = true; }
  placeTip();
  const box = $('tip');
  box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
}
// A tip with steps (your first fight): one pause, clicked through a step at a time, each step
// pointing at its own thing. Next, Enter or clicking the thing moves on; the last step closes it.
function showStep() {
  const steps = tip.t.steps;
  tip.cur = steps ? steps[tip.step] : tip.t;
  $('tip-text').textContent = tip.cur.text;
  $('tip-step').textContent = steps ? `${tip.step + 1}/${steps.length}` : '';
  $('tip-ok').textContent = steps && tip.step < steps.length - 1 ? 'Next' : 'Got it';
}
function advanceTip() {
  if (!tip) return;
  if (tip.t.steps && tip.step < tip.t.steps.length - 1) {
    tip.step++;
    showStep();
    placeTip();
    const box = $('tip');
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    return;
  }
  hideTip(true);
}
function placeTip() {
  if (!tip) return;
  const el = document.querySelector(tip.cur.at);
  if (!el || !onScreen(tip.cur.at)) return hideTip(false); // it'll come back when its thing does
  document.querySelectorAll('.tip-target').forEach((x) => { if (x !== el) x.classList.remove('tip-target'); });
  el.classList.add('tip-target');
  const box = $('tip'), r = el.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
  // Under a container (the board): the thing it explains stays in view; the arrow still points at it.
  const u = (tip.cur.under && document.querySelector(tip.cur.under)?.getBoundingClientRect()) || r;
  // Keep it on the screen: inside the monitor's picture when it sits in its casing, else the window.
  const scr = document.body.classList.contains('cased') ? document.querySelector('.app')?.getBoundingClientRect() : null;
  const pad = scr ? 28 : 12; // clear of the tube's darker edges
  const L = (scr ? scr.left : 0) + pad - 12, R = (scr ? scr.right : innerWidth) - pad + 12, T = (scr ? scr.top : 0) + pad - 12, B = scr ? scr.bottom : innerHeight;
  const below = u.bottom + 14 + h < B - 8;
  const cx = r.left + Math.min(r.width, 240) / 2;
  const left = Math.max(L + 12, Math.min(R - w - 12, cx - w / 2));
  box.style.left = left + 'px';
  box.style.top = (below ? u.bottom + 14 : Math.max(T + 12, u.top - h - 14)) + 'px';
  box.classList.toggle('above', !below);
  box.style.setProperty('--arrow', Math.max(16, Math.min(w - 16, cx - left)) + 'px');
}
function hideTip(seen) {
  if (!tip) return;
  if (seen) { for (const id of [tip.t.id, ...(tip.t.covers || [])]) markSeen(campaign, id); save(); }
  else if (tip.t.steps && tip.step > 0) { for (const x of tip.t.steps.slice(0, tip.step)) markSeen(campaign, x.id); save(); } // steps you read stay read
  if (tip.paused && active(campaign) && campaign.encounter.paused) { campaign.encounter.paused = false; dirty = true; }
  document.querySelectorAll('.tip-target').forEach((x) => x.classList.remove('tip-target'));
  $('tip').hidden = true;
  tip = null;
  tipWait = Math.max(tipWait, performance.now() + (seen ? 6000 : 400)); // one at a time, with room to play between
  tipWait = performance.now() + 700; // a breath before the next one
}
$('tip-ok').addEventListener('click', () => { advanceTip(); $('command-input').focus(); });
$('tip-off').addEventListener('click', () => { campaign.settings.tips = false; hideTip(true); notice('Tips off. Turn them back on on the System page.'); dirty = true; });
addEventListener('resize', () => placeTip());

// A status lands: its chip shows big over the board, then flies into its place in the Status
// column (centre of the HUD). Only chips that weren't there a moment ago; same fight only.
let statusSeen = { fight: null, names: new Set() };
const statusFlying = new Set();
function flyStatuses(s) {
  const fight = s.encounter?.virus?.id;
  const chips = [...document.querySelectorAll('#hud .hud-status .st')];
  for (const c of chips) if (statusFlying.has(c.textContent)) c.style.visibility = 'hidden'; // still on its way
  const names = new Set(chips.map((c) => c.textContent));
  const fresh = statusSeen.fight === fight ? chips.filter((c) => !statusSeen.names.has(c.textContent)) : [];
  statusSeen = { fight, names };
  if (!fresh.length || !canMove()) return;
  const board = $('board')?.getBoundingClientRect();
  if (!board) return;
  fresh.forEach((chip, i) => {
    const to = chip.getBoundingClientRect();
    const fly = chip.cloneNode(true);
    fly.removeAttribute('tabindex'); fly.removeAttribute('data-tip');
    fly.classList.add('st-fly');
    Object.assign(fly.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px' });
    document.body.appendChild(fly);
    chip.style.visibility = 'hidden';
    statusFlying.add(chip.textContent);
    const dx = board.left + board.width / 2 - (to.left + to.width / 2), dy = board.top + board.height * 0.42 - (to.top + to.height / 2);
    const anim = fly.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0 },
      { transform: `translate(${dx}px, ${dy}px) scale(2.4)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${dx}px, ${dy}px) scale(2.2)`, opacity: 1, offset: 0.5 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], { duration: 950, delay: i * 140, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'both' });
    anim.onfinish = () => { fly.remove(); statusFlying.delete(chip.textContent); const now = [...document.querySelectorAll('#hud .hud-status .st')].find((c) => c.textContent === chip.textContent); if (now) { now.style.visibility = ''; now.classList.add('st-land'); setTimeout(() => now.classList.remove('st-land'), 500); } };
  });
}

// A two-click confirm in progress: its button shows the question (re-applied after each redraw).
let confirmArm = null;
function showArmed() {
  if (!confirmArm || confirmArm.until < Date.now()) return;
  for (const b of document.querySelectorAll('[data-command][data-confirm]')) if (b.dataset.command === confirmArm.cmd) { b.textContent = confirmArm.ask; b.classList.add('armed'); }
}

// Who did it, to what: the actor's row lights in its side's colour and the target takes the mark.
// Your half of the cycle resolves the instant you press Enter: keep it lit long enough to see.
const hold = (key, ms) => { const e = campaign.encounter; if (e) Object.defineProperty(e, key, { value: Date.now() + ms, writable: true, configurable: true, enumerable: false }); setTimeout(() => { dirty = true; }, ms + 50); };
const holdYou = () => hold('_youUntil', 550), holdThem = () => hold('_themUntil', 300); // just long enough to see the hit land: then it's your move, and the board says so
// Marks outlive a board redraw: they're re-applied after each render until they expire.
let sideMarks = [];
function sideFx(from, to, side) {
  const until = performance.now() + (side === 'them' ? 1500 : 700);
  sideMarks = sideMarks.filter((m) => m.sel !== from && m.sel !== to);
  for (const sel of [from, to]) if (sel) sideMarks.push({ sel, side, until });
  applySideMarks();
}
function applySideMarks() {
  const now = performance.now();
  // The virus's marks go with its half: once it's your move, nothing of its stays lit.
  const theirs = active(campaign) && V.phaseOf(campaign) === 'them';
  sideMarks = sideMarks.filter((m) => m.until > now && (m.side !== 'them' || theirs));
  for (const el of document.querySelectorAll('.side-you:not(li), .side-them:not(li)')) if (!sideMarks.some((m) => el.matches(m.sel))) el.classList.remove('side-you', 'side-them');
  for (const m of sideMarks) document.querySelector(m.sel)?.classList.add('side-' + m.side);
}
// ---------- steps ----------
// A cycle plays out in turns: you (then each crewmate), then the virus, a beat apart (stepCycle in
// combat.mjs), so you can follow who did what. The virus's answer waits a little longer.
hooks.stepped = true;
const STEP_MS = { relaxed: 380, normal: 330, fast: 260 };
const VIRUS_BEAT = 4; // × a step: the virus's half (red) plays about 1.3 s before its first hit, not after it
let stepTimer = null;
function stepLoop() {
  const e = campaign.encounter;
  if (stepTimer || !active(campaign) || !e?.steps || e.paused) return;
  stepTimer = setTimeout(() => {
    stepTimer = null;
    const events = stepCycle(campaign);
    if (events.length) { react(events); save(); }
    dirty = true;
  }, (STEP_MS[campaign.settings?.speed] || STEP_MS.normal) * (e.steps.after && !e.steps.due ? VIRUS_BEAT : 1));
}

// ---------- clock ----------
let last = performance.now();
let lastSecond = 0, wanderTick = 0;
// Traffic on the map (view.mjs trafficMarkup): each dot runs its route on its own clock. A transfer
// sits at its share of the way; backbone traffic loops, the far end's colour on the way back.
function movePackets(at) {
  for (const d of document.querySelectorAll('.map-svg .mpkt')) {
    const path = d.ownerSVGElement?.querySelector(`[data-rid="${d.dataset.route}"]`);
    if (!path) continue;
    let p, back = !!d.dataset.rev;
    if (d.dataset.period) {
      // Hub-to-hub: each lap carries one of the route's shipments, from where it's cheap to where it pays.
      const k = at / +d.dataset.period + +d.dataset.phase, lap = Math.floor(k);
      const ships = d._ships ||= JSON.parse(d.dataset.ships || '[]'), sh = ships.length ? ships[lap % ships.length] : null;
      p = k - lap; back = sh ? !!sh.back : lap % 2 === 1;
      d._ship = sh && { ...sh, n: 4 + ((lap * 7 + ships.indexOf(sh) * 13) % 17) };
      d.style.color = back ? d.dataset.cb : d.dataset.ca;
    } else p = Math.max(0, Math.min(1, (at - +d.dataset.t0) / Math.max(1, +d.dataset.t1 - +d.dataset.t0)));
    const len = path.getTotalLength(), at0 = (back ? 1 - p : p) * len, pt = path.getPointAtLength(at0);
    // Which way it's heading: a step further along the route, in its direction of travel.
    const q = path.getPointAtLength(Math.max(0, Math.min(len, at0 + (back ? -1 : 1))));
    const ang = Math.atan2(q.y - pt.y, q.x - pt.x) * 180 / Math.PI;
    d.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    d.querySelector('.pk-dir')?.setAttribute('transform', `rotate(${ang.toFixed(0)})`);
  }
  if (pktHover) placePktTip();
}
// Hovering a moving file: a card with what it is, following it along its route.
let pktHover = null;
function pktTipData(d) {
  if (d.dataset.tip) return JSON.parse(d.dataset.tip);
  const sh = d._ship; if (!sh) return null;
  const fa = FACTIONS[d.dataset.fa]?.short, fb = FACTIONS[d.dataset.fb]?.short;
  return { icon: sh.w, what: WARES[sh.w].name, n: sh.n, from: sh.back ? fb : fa, to: sh.back ? fa : fb, lo: sh.lo, hi: sh.hi };
}
function placePktTip() {
  const { d, el } = pktHover;
  if (!d.isConnected) return hidePktTip();
  const data = pktTipData(d), key = JSON.stringify(data);
  if (key !== el.dataset.key) { el.innerHTML = V.packetTipMarkup(data); el.dataset.key = key; }
  const r = d.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right + 10))}px`;
  el.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, r.top - h / 2))}px`;
}
function hidePktTip() { if (!pktHover) return; pktHover.el.remove(); pktHover = null; }
document.addEventListener('mouseover', (e) => {
  const d = e.target.closest?.('.map-svg .mpkt');
  if (!d) return;
  if (pktHover?.d === d) return;
  hidePktTip();
  const el = document.createElement('div'); el.className = 'pkt-tip'; document.body.append(el);
  pktHover = { d, el }; placePktTip();
});
document.addEventListener('mouseout', (e) => { if (pktHover && e.target.closest?.('.mpkt') === pktHover.d && !pktHover.d.contains(e.relatedTarget)) hidePktTip(); });
function frame(now) {
  if (module === 'map') movePackets(Date.now());
  const delta = Math.min(1000, now - last);
  last = now;
  const wall = Date.now();
  if (active(campaign)) {
    campaign.restAt = wall;
    const events = advance(campaign, delta);
    if (events.length) { react(events); save(); }
  } else {
    // Resting between fights, plus any Self-healing filter, by the wall clock: a hidden tab or a closed
    // game (up to 8 hours) catches up.
    const away = Math.min(8 * 3600000, Math.max(0, wall - (campaign.restAt ?? wall)));
    campaign.restAt = wall;
    if (!CAMP && idleRegen(campaign, away)) { dirty = true; save(); }
  }
  stepLoop();
  if (dirty) render();
  else tickUi();
  feel.flush();
  checkTips(now);
  shell.caret();
  if (now - lastSecond >= 1000) {
    lastSecond = now; shell.second(module); services();
    if (simOn(campaign)) peopleUi(); // people move about (presence.mjs)
    if (pruneComms(campaign)) { save(); dirty = true; } // handled comms clear out after 5 minutes
    // Unanswered alerts shake the pager every 10 s; a breach pings every 15 s.
    const tickNow = Date.now();
    if (unseenAlert(campaign) && !commsOpen && tickNow - (nag.pager || 0) >= 10000) { nag.pager = tickNow; const p = $('pager'); p.classList.remove('fx-pager'); void p.offsetWidth; p.classList.add('fx-pager'); }
    const inv = campaign.invasion, breached = inv?.state === 'breach' && !campaign.degraded && !(active(campaign) && campaign.encounter.invader === inv.id);
    if (breached && tickNow - (nag.breach || 0) >= 15000) { nag.breach = tickNow; feel.add('prewarn', '#meter-integrity'); feel.flush(); }
    if (!breached) nag.breach = 0;
    if (module === 'consortium') dirty = true; // its timers count down
    // Crewmates off on their own move every few seconds (run.mjs crewWander).
    if (campaign.run && ++wanderTick % 4 === 0 && Object.values(campaign.run.crew || {}).some((c) => c.link !== 'you')) { const ev = crewWander(campaign); if (ev.length) react(ev); save(); dirty = true; }
    // A wild server's reconnect countdown (rogue.mjs relockMs) ticks on its card.
    if ([campaign.zone, ...(campaign.locations || [])].some((l) => l && relockLeft(l, wall - 1000))) dirty = true; // one more render as it ends
  }
  requestAnimationFrame(frame);
}

// ---------- wiring ----------
document.querySelector('.modules').addEventListener('click', (e) => {
  const b = e.target.closest('[data-module]');
  if (b) go(b.dataset.module);
});
// The salvage picker: crafting buttons with data-pay open it, so you choose which salvage pays.
let payState = null; // { cmd, key, title, pay }
function payOpen(btn) {
  const key = btn.dataset.pay, [id, n] = key.split(':');
  const cost = V.payCost(campaign, key);
  payState = { cmd: btn.dataset.command, key, title: btn.dataset.payTitle || 'Build', pay: autoPay(campaign, cost) || {} };
  payDraw();
}
function payDraw() {
  let el = $('pay');
  if (!payState) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'pay'; el.className = 'pay'; document.body.appendChild(el); }
  el.innerHTML = V.payMarkup(campaign, payState.key, payState.pay, payState.title);
  el.hidden = false;
}
document.addEventListener('click', (e) => {
  const pel = e.target.closest('#pay');
  if (payState && pel) {
    const st = e.target.closest('[data-pay-step]');
    if (st) { const k = st.dataset.payStep; payState.pay[k] = Math.max(0, (payState.pay[k] || 0) + Number(st.dataset.d)); feel.key('click'); payDraw(); return; }
    if (e.target.closest('[data-pay-cancel]')) { payState = null; payDraw(); return; }
    if (e.target.closest('[data-pay-go]')) { const c = `${payState.cmd} pay ${V.paySlugs(payState.pay)}`; payState = null; payDraw(); run(c); return; }
    if (e.target === pel) { payState = null; payDraw(); }
    return;
  }
}, true);
document.addEventListener('keydown', (e) => { if (payState && e.key === 'Escape') { payState = null; payDraw(); } });
document.addEventListener('click', (e) => {
  if (tip && !e.target.closest('#tip') && e.target.closest(tip.cur.at)) advanceTip();
  if (e.target.closest('[data-spoils-go]')) { if (ended) leaveFight(); else hideSpoils(); return; }
  if (e.target.closest('[data-gain-go]')) { hideGain(); return; }
  const pick = e.target.closest('[data-mk-pick]');
  if (pick) { const w = pick.dataset.mkPick; setMkOrder(mkOrder?.w === w && mkOrder.f === hubSel ? null : { f: hubSel, w, side: (w === 'salvage' ? campaign.salvage.length : campaign.materials?.[w] || 0) > 0 ? 'sell' : 'buy', n: 1 }); return; }
  const side = e.target.closest('[data-mk-side]');
  if (side && mkOrder) { setMkOrder({ ...mkOrder, side: side.dataset.mkSide, n: 1 }); return; }
  if (e.target.closest('.mk-go') && mkOrder) { const c = e.target.closest('.mk-go').dataset.command; setMkOrder({ ...mkOrder, n: 1 }); return run(c); }
  const payBtn = e.target.closest('[data-pay]');
  if (payBtn && !payBtn.disabled && !e.target.closest('#pay')) { payOpen(payBtn); return; }
  const cmd = e.target.closest('[data-command]');
  if (cmd && !cmd.disabled) {
    // Irreversible buttons (scrapping good gear) ask with a second click.
    // Armed by command, not by element: a redraw (the map card ticks every second) keeps it armed.
    if (cmd.dataset.confirm && !(confirmArm?.cmd === cmd.dataset.command && confirmArm.until > Date.now())) {
      confirmArm = { cmd: cmd.dataset.command, until: Date.now() + 4000, label: cmd.innerHTML, ask: cmd.dataset.confirm };
      showArmed();
      setTimeout(() => { confirmArm = null; dirty = true; }, 4050);
      return;
    }
    confirmArm = null;
    if (cmd.classList.contains('ability') && !cmd.classList.contains('script')) { $('command-input').value = cmd.dataset.command; $('command-input').focus(); return; } // a script runs at once: it takes no cycle
    return run(cmd.dataset.command);
  }
  const loc = e.target.closest('[data-locate]');
  if (loc) { pendingLocate = loc.dataset.locate === '__sel' ? mapSel : loc.dataset.locate; mapList = false; mapSel = pendingLocate; mapPop = true; if (module !== 'map') go('map'); dirty = true; return; }
  const cc = e.target.closest('[data-craft-cat]');
  if (cc) { craftUi = { ...craftUi, cat: cc.dataset.craftCat, pick: null }; dirty = true; return; }
  const cp = e.target.closest('[data-craft-pick]');
  if (cp) { craftUi = { ...craftUi, pick: cp.dataset.craftPick }; dirty = true; return; }
  const cs = e.target.closest('[data-craft-slot]');
  if (cs) { craftUi = { ...craftUi, slot: cs.dataset.craftSlot }; dirty = true; return; } // the slot a protocol compiles into
  const ml = e.target.closest('[data-maplist]');
  if (ml) { mapList = ml.dataset.maplist === '1'; dirty = true; return; }
  const ms = e.target.closest('[data-msort]');
  if (ms) { mapSort = ms.dataset.msort; dirty = true; return; }
  const mf = e.target.closest('[data-mapfilter]');
  if (mf) { mapFilter = mf.dataset.mapfilter === 'all' ? [] : [mf.dataset.mapfilter]; dirty = true; return; }
  const mv = e.target.closest('[data-mapview]');
  if (mv) { mapView = mv.dataset.mapview; mapSel = 'server'; feel.add('channel', null); dirty = true; return; }
  const fb = e.target.closest('[data-floor]');
  if (fb) { mapFloor = Number(fb.dataset.floor) || 1; mapSel = null; mapPop = false; mapList = false; mapZoom.k = 1; mapView = 'mine'; if (module !== 'map') go('map'); feel.add('channel', null); dirty = true; return; }
  if (e.target.closest('[data-leads]')) { leadsOpen = !leadsOpen; dirty = true; return; }
  const lt = e.target.closest('[data-ltab]');
  if (lt) { loadoutTab = lt.dataset.ltab; feel.add('channel', null); dirty = true; return; }
  const snd = e.target.closest('[data-sound]');
  if (snd) { feel.preview(snd.dataset.sound); return; }
  const tog = e.target.closest('[data-toggle]');
  if (tog) { $(tog.dataset.toggle).click(); return; }
  // Log sweep: light up an address (click again to clear), or filter the log.
  const flag = e.target.closest('[data-sweep-flag]');
  if (flag) {
    const a = flag.dataset.sweepFlag, f = V.sweepUi.flags;
    if (f.has(a)) f.delete(a); else f.set(a, [0, 1, 2].find((c) => ![...f.values()].includes(c)) ?? f.size % 3);
    feel.key('click'); dirty = true; return;
  }
  const stf = e.target.closest('[data-stash-filter]');
  if (stf) { V.stashUi.filter = stf.dataset.stashFilter; feel.key('click'); dirty = true; return; }
  const sf = e.target.closest('[data-sweep-filter]');
  if (sf) { V.sweepUi.filter = sf.dataset.sweepFilter; feel.key('click'); dirty = true; return; }
  const bx = e.target.closest('[data-breach]');
  if (bx && !bx.disabled) { breachClick(bx.dataset.breach, bx.dataset.arg); return; }
  const rm = e.target.closest('[data-rooms]');
  if (rm && !rm.disabled) { roomsClick(rm.dataset.rooms, rm.dataset.arg); return; }
  const direct = e.target.closest('[data-run]');
  if (direct) { run(direct.dataset.run); $('command-input').focus(); return; }
  const pre = e.target.closest('[data-prefill]');
  if (pre) {
    const v = pre.dataset.prefill;
    if (v.endsWith(' ')) { $('command-input').value = v; $('command-input').focus(); updateSuggestions(); } else run(v);
    return;
  }
  const ability = e.target.closest('[data-ability]');
  if (ability) { // tap a skill to pick it, tap it again to fire it (no keyboard needed)
    const cur = $('command-input').value.trim(), id = ability.dataset.ability;
    if (cur.split(' ')[0] === id && !['command', 'schedule'].includes(ABILITIES[id]?.target)) { $('command-input').value = ''; return run(cur); }
    return prepare(id);
  }
  const target = e.target.closest('[data-target]');
  if (target && !target.disabled) {
    selected = selected === target.dataset.target ? null : target.dataset.target;
    const input = $('command-input');
    const [word] = input.value.trim().split(' ');
    if (selected && ABILITIES[word] && ABILITIES[word].target !== 'none') input.value = `${word} ${partKey(campaign, part(campaign, selected))}`;
    if (!touch()) input.focus();
    dirty = true;
    return;
  }
  const sug = e.target.closest('[data-suggestion]');
  if (sug) { $('command-input').value = sug.dataset.suggestion + (ABILITIES[sug.dataset.suggestion]?.target === 'part' ? ' ' : ''); updateSuggestions(); $('command-input').focus(); return; }
  const arch = e.target.closest('[data-arch]');
  if (arch) { archView = arch.dataset.arch; dirty = true; return; }
  // A found server's Connect: ask (its card shows the memory it takes), then yes or cancel.
  const ask = e.target.closest('[data-mem-ask]');
  if (ask) { V.setMemAsk(ask.dataset.memAsk); dirty = true; return; }
  const yes = e.target.closest('[data-mem-yes]');
  if (yes) { const id = yes.dataset.memYes; V.setMemAsk(null); memYes = id; run('connect ' + id); memYes = null; dirty = true; return; }
  if (e.target.closest('[data-mem-no]')) { V.setMemAsk(null); dirty = true; return; }
  const node = e.target.closest('[data-select]');
  if (node) { if (node.dataset.select !== mapSel) V.setMemAsk(null); mapSel = node.dataset.select; mapPop = true; dirty = true; return; }
  // Clicking away (empty map, or the card's ×) closes the card and clears the selection too.
  if (e.target.closest('[data-map-pop-close]') || (e.target.closest('.map-svg') && !e.target.closest('.mnode'))) { if (mapPop || mapSel) { mapPop = false; mapSel = null; V.setMemAsk(null); dirty = true; } }
  const mail = e.target.closest('[data-mail]');
  if (mail) {
    mailSel = mail.dataset.mail;
    // A contract opens its letter too: reading one reads the other.
    const letter = mailSel[0] === 'l' ? mailSel.slice(1) : campaign.mail?.list?.find((m) => m.job === Number(mailSel.slice(1)))?.id;
    if (letter != null) { command(campaign, 'mail read ' + letter); save(); }
    dirty = true;
  }
});

$('command-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('command-input');
  const value = suggestionIndex >= 0 ? suggestionList[suggestionIndex] : input.value;
  input.value = '';
  $('suggestions').hidden = true;
  if (gainOpen()) hideGain(); // the Banked card goes with the next Enter, whatever it carries
  if (!value.trim()) {
    if (tip) { advanceTip(); return; } // Enter moves a tip on (or closes it) first
    // Empty Enter in a fight: stop waiting and resolve this cycle now.
    if (active(campaign) && !campaign.encounter.paused) { react(command(campaign, 'now')); save(); dirty = true; }
    else if (module === 'combat' && ended && !$('spoils').hidden && performance.now() - endedAt > 1200) leaveFight();
    return;
  }
  run(value);
});

$('command-input').addEventListener('input', updateSuggestions);
$('command-input').addEventListener('keydown', (e) => {
  const input = e.currentTarget;
  if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') feel.key(e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'back' : 'char');
  // In a fight, ] and [ on an empty line cycle your target through the living parts (WoW's Tab targeting).
  if ((e.key === ']' || e.key === '[') && active(campaign) && !input.value.trim()) {
    e.preventDefault();
    const ids = campaign.encounter.virus.parts.filter((p) => p.integrity > 0).map((p) => p.id);
    if (!ids.length) return;
    const i = ids.indexOf(selected);
    selected = ids[(i + (e.key === ']' ? 1 : -1) + ids.length) % ids.length];
    dirty = true;
    return;
  }
  if (e.key === 'Tab') {
    if (!suggestionList.length) return;
    e.preventDefault();
    suggestionIndex = (suggestionIndex + (e.shiftKey ? -1 : 1) + suggestionList.length) % suggestionList.length;
    input.value = suggestionList[suggestionIndex];
    const pick = suggestionList;
    const keep = suggestionIndex;
    $('suggestions').innerHTML = pick.map((x, i) => `<button type="button" role="option" data-suggestion="${V.esc(x)}" aria-selected="${i === keep}">${V.esc(x)}</button>`).join('');
    suggestionIndex = -1;
    suggestionList = pick;
    suggestionIndex = keep;
    previewAim(shown(), input.value); // a completed command previews too
    return;
  }
  if (suggestionIndex >= 0 && e.key !== 'Enter') suggestionIndex = -1;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (!history.length) return;
    e.preventDefault();
    historyIndex = Math.max(-1, Math.min(history.length - 1, historyIndex + (e.key === 'ArrowUp' ? 1 : -1)));
    input.value = historyIndex < 0 ? '' : history[historyIndex];
    $('suggestions').hidden = true;
    previewAim(shown(), input.value);
    return;
  }
  if (e.key === 'Escape') { if (tip && !input.value) { hideTip(true); return; } input.value = ''; $('suggestions').hidden = true; return; }
  if (/^[0-9-]$/.test(e.key) && !input.value.trim() && keyMap(shown())[e.key]) { // 1 Spike, 2–9 and 0 your skills, - SIGINT
    e.preventDefault();
    prepare(keyMap(shown())[e.key]);
  }
});

$('sound').addEventListener('click', () => { campaign.settings.sound = !campaign.settings.sound; save(); dirty = true; });
$('speed').addEventListener('click', () => {
  const order = ['relaxed', 'normal', 'fast'];
  const next = order[(order.indexOf(campaign.settings.speed || 'normal') + 1) % order.length];
  react(command(campaign, 'speed ' + next));
  save(); dirty = true;
});
$('haptics').addEventListener('click', () => { campaign.settings.haptics = !campaign.settings.haptics; if (campaign.settings.haptics) navigator.vibrate?.(30); save(); dirty = true; });
$('motion').addEventListener('click', () => { campaign.settings.motion = !campaign.settings.motion; save(); dirty = true; });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && active(campaign) && !campaign.encounter.paused) {
    command(campaign, 'pause');
    campaign.encounter.autoPaused = true; // coming back to the Fight tab (or any order) resumes it
    save();
    dirty = true;
  }
});

// ---------- the pager ----------
// World events land on the pager: it beeps (quietly, and only for alerts mid-fight), its lamp
// blinks until you open it, and its screen scrolls the latest line. Open it for Comms, the list.
let commsOpen = false, commsFilter = 'all', pagerLine = '';
function pagerReact(events) {
  const added = logComms(campaign, events);
  if (!added.length) return;
  const alert = added.some((c) => c.alert);
  const fighting = active(campaign) && module === 'combat';
  if (alert || (!fighting && added.some((c) => c.beep))) feel.add('pager', '#pager', null, { alert });
  save();
}
function pagerUi() {
  const list = commsOf(campaign), last = list[0], n = unseen(campaign);
  const line = last ? `${last.label.toUpperCase()}: ${last.text}` : 'NO MESSAGES';
  if (line !== pagerLine) {
    pagerLine = line;
    $('pager-text').textContent = line;
    $('pager-lcd').classList.toggle('idle', !last);
    $('pager-lcd').classList.toggle('long', line.length > 30);
  }
  $('pager-led').className = `led${n ? ' on' : ''}${unseenAlert(campaign) ? ' alert' : ''}`;
  $('pager-count').textContent = n ? String(n) : '';
  $('pager').setAttribute('aria-expanded', String(commsOpen));
  $('comms').hidden = !commsOpen;
  if (commsOpen) put('comms', V.commsMarkup(campaign, commsFilter, Date.now()));
}
// People (presence.mjs): a button on the top bar with how many are online, and its panel.
let peopleOpen = false, peopleTab = 'friends';
function peopleUi() {
  const on = simOn(campaign);
  $('people').hidden = !on;
  if (!on) { peopleOpen = false; $('people-panel').hidden = true; return; }
  const list = online(campaign);
  $('people-count').textContent = String(list.length);
  $('people').classList.toggle('friends-on', list.some((x) => x.friend));
  $('people').setAttribute('aria-expanded', String(peopleOpen));
  $('people-panel').hidden = !peopleOpen;
  if (peopleOpen) put('people-panel', V.peopleMarkup(campaign, peopleTab));
}
$('people').addEventListener('click', (e) => { e.stopPropagation(); peopleOpen = !peopleOpen; if (peopleOpen) setComms(false); dirty = true; });
$('people-panel').addEventListener('click', (e) => {
  const t = e.target.closest('[data-ptab]');
  if (t) { e.stopPropagation(); peopleTab = t.dataset.ptab; dirty = true; return; }
  if (e.target.closest('[data-people-close]')) { e.stopPropagation(); peopleOpen = false; dirty = true; }
});
document.addEventListener('click', (e) => { if (e.target.closest('[data-people-open]')) { e.stopPropagation(); peopleOpen = true; peopleTab = 'online'; setComms(false); dirty = true; } }, true);
document.addEventListener('click', (e) => { if (peopleOpen && !e.target.closest('#people-panel, #people')) { peopleOpen = false; dirty = true; } });

function setComms(open) {
  commsOpen = open;
  if (open) { seeAll(campaign); save(); }
  dirty = true;
}
$('pager').addEventListener('click', (e) => { e.stopPropagation(); setComms(!commsOpen); });
$('comms').addEventListener('click', (e) => {
  e.stopPropagation();
  const f = e.target.closest('[data-cfilter]');
  if (f) { commsFilter = f.dataset.cfilter; dirty = true; return; }
  if (e.target.closest('[data-comms-close]')) { setComms(false); return; }
  if (e.target.closest('[data-comms-clear]')) { clearComms(campaign); save(); dirty = true; return; }
  const cl = e.target.closest('[data-cclear]');
  if (cl) { clearOne(campaign, Number(cl.dataset.cclear)); save(); dirty = true; return; }
  const dn = e.target.closest('[data-cdone]');
  if (dn) { markDone(campaign, Number(dn.dataset.cdone)); save(); dirty = true; return; }
  const g = e.target.closest('[data-go]');
  if (g?.dataset.cid) { markDone(campaign, Number(g.dataset.cid)); save(); } // opening it is handling it
  if (!g) return;
  setComms(false);
  goTo(g.dataset.go);
});
// The top bar stays on one line: when it would wrap (more tabs, a narrow screen, the monitor
// casing), it tightens a step at a time (style.css .fit-1 … .fit-4). Only re-measured when the
// tabs shown or the bar's width change.
let fitKey = '';
function fitTopbar() {
  const bar = document.querySelector('.topbar');
  if (!bar.clientWidth) return; // not laid out yet (the casing boots)
  const tabs = document.querySelector('.modules'), n = String([...tabs.children].filter((b) => !b.hidden).length);
  if (tabs.dataset.tabs !== n) tabs.dataset.tabs = n; // how many tabs show: a phone sizes them down from seven (style.css)
  // Refit when the tabs, the width, or what the bar holds changes (a breach adds a chip, the pager an alert):
  // the bar's height after the last fit is part of the key, so growing onto a second row refits it.
  const sig = () => [...document.querySelectorAll('.modules button')].map((b) => (b.hidden ? 0 : 1)).join('') + ':' + bar.clientWidth + ':' + bar.offsetHeight + ':' + ($('integrity-note')?.hidden ? 0 : $('integrity-note')?.textContent) + ':' + $('people')?.hidden;
  if (sig() === fitKey) return;
  // Wrapped: something starts below where something else ends.
  const wraps = () => { const kids = [...bar.children].filter((x) => !x.hidden && x.offsetHeight); return kids.some((a) => kids.some((b) => a.offsetTop >= b.offsetTop + b.offsetHeight)); };
  for (let i = 1; i <= 4; i++) bar.classList.remove('fit-' + i);
  for (let i = 1; i <= 4 && wraps(); i++) bar.classList.add('fit-' + i);
  fitKey = sig();
}
addEventListener('resize', () => { fitKey = ''; fitTopbar(); });
document.fonts?.ready.then(() => { fitKey = ''; fitTopbar(); });

// "where:what" from a pager entry or a button elsewhere: a page, and what to show on it.
function goTo(target) {
  const [where, what] = target.split(':');
  if (where === 'mail') { if (what) mailSel = what; go('mail'); }
  else if (where === 'store') go('store');
  else if (where === 'server') go('server');
  else if (where === 'craft') { craftUi = { cat: what || null, pick: null }; go('craft'); }
  else if (where === 'hub') openHub(what);
  else if (where === 'map') { if (what === 'consortium') { mapView = 'consortium'; mapSel = 'server'; } else if (what?.startsWith('con=')) { mapView = 'consortium'; mapSel = what.slice(4); } else if (what) { mapSel = what; mapPop = true; } go('map'); }
  else if (where === 'consortium' || where === 'people') { peopleOpen = false; go('consortium'); }
  else if (where === 'jack') run('jack in');
}
document.addEventListener('click', (e) => { const g = !e.target.closest('#comms') && e.target.closest('[data-go]'); if (g) { peopleOpen = false; goTo(g.dataset.go); } });
document.addEventListener('click', (e) => { if (commsOpen && !e.target.closest('#comms, #pager')) setComms(false); });
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-hub-opt]'), c = e.target.closest('[data-hub-close]');
  if (o) pickHub(o.dataset.hubOpt);
  else if (c) closeHub();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && commsOpen) { setComms(false); } });

// Craft sections you fold stay folded.
document.addEventListener('toggle', (e) => {
  const sec = e.target.closest?.('details[data-sec]');
  if (!sec) return;
  const shut = new Set(campaign.settings.craftShut || []);
  if (sec.open) shut.delete(sec.dataset.sec); else shut.add(sec.dataset.sec);
  campaign.settings.craftShut = [...shut];
  save();
}, true);
// The Craft page's protocol recipe picker.
document.addEventListener('change', (e) => {
  if (e.target.matches?.('[data-focus-select]')) { compileFocus = e.target.value || null; dirty = true; }
});

document.addEventListener('keydown', (e) => {
  const node = e.target.closest?.('[data-select]');
  if (node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mapSel = node.dataset.select; mapPop = true; dirty = true; }
  if (e.key === 'Escape' && (mapPop || mapSel) && module === 'map') { mapPop = false; mapSel = null; dirty = true; }
});

// Typing anywhere goes to the prompt.
document.addEventListener('keydown', (e) => {
  if (e.target === $('command-input') || e.target.closest?.('[data-select], [data-rooms], [data-fp-sel]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length === 1 && !/input|textarea/i.test(e.target.tagName)) $('command-input').focus();
});

if (playtest) document.title = playtest === 'breach' ? 'BLACKBOX · breach' : playtest === 'rooms' ? 'BLACKBOX · rooms' : 'BLACKBOX · playtest';
if (CAMP) document.title = 'BLACKBOX · campaign';
go(active(campaign) ? 'combat' : campaign.breach ? 'breach' : campaign.rooms ? 'rooms' : campaign.run ? 'net' : playtest === 'story' ? 'mail' : CAMP ? 'campaign' : 'map');
// No intrusion waits at the gate any more: you go to the rogue server to find fights.
if (campaign.encounter?.phase === 'alert' && campaign.encounter.mode === 'home' && !campaign.encounter.invader) campaign.encounter = null;
if (!campaign.breach && !campaign.roomsPlay && !CAMP) { const done = [...tickNetwork(campaign, Date.now()), ...tickServices(campaign, Date.now())]; if (done.length) { react(done); save(); } } // installs that finished (or Degraded mode that ran out) while you were away
if (!playtest) { if (!campaign.profile || (CAMP && !campaign.camp)) firstLogin(); else shell.boot(); }
requestAnimationFrame(frame);
window.blackbox = { get state() { return campaign; }, run };

// Volume sliders: heard live while you drag, saved when you let go.
document.addEventListener('input', (e) => {
  const r = e.target.closest?.('[data-volume]');
  if (!r) return;
  const v = { ...V.volumesOf(campaign), [r.dataset.volume]: Number(r.value) / 100 };
  feel.volumes(v);
  const label = document.querySelector(`[data-volume-val="${r.dataset.volume}"]`);
  if (label) label.textContent = r.value;
});
document.addEventListener('change', (e) => {
  const r = e.target.closest?.('[data-volume]');
  if (!r) return;
  campaign.settings.volume = { ...V.volumesOf(campaign), [r.dataset.volume]: Number(r.value) / 100 };
  if (r.dataset.volume === 'sfx' && campaign.settings.sound) feel.preview('good');
  if (r.dataset.volume === 'ambience' && campaign.settings.sound) feel.radioTest();
  save(); dirty = true;
});

// The logo goes to the Map (a plain click; it used to reload the page).
document.querySelector('.brand')?.addEventListener('click', (ev) => {
  if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return; // new tab/window still works
  ev.preventDefault();
  go('map');
});
// The meters that take a click (top up, repair) take Enter and Space too.
document.addEventListener('keydown', (e) => {
  const m = e.target.closest?.('.meter[data-command]');
  if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); m.click(); }
});

// Item hover cards (view.mjs itemTipMarkup): a protocol or filter's card beside it, its ASCII model
// spinning while it's up. Follows the row through redraws; goes when the pointer leaves it.
let ptip = null; // { ref, anchor, el, raf }
function showPtip(anchor) {
  hidePtip();
  const ref = anchor.dataset.ptip, html = V.itemTipMarkup(campaign, ref);
  if (!html) return;
  const el = document.createElement('div');
  el.className = 'ptip';
  el.innerHTML = html;
  document.body.appendChild(el);
  ptip = { ref, anchor, el, raf: 0 };
  placePtip();
  const pre = el.querySelector('.ptip-art'), shape = SHAPES[pre?.dataset.shape] || SHAPES.shell;
  const still = campaign.settings.motion === false;
  const step = (t) => {
    if (!ptip || ptip.el !== el) return;
    if (!ptip.anchor.isConnected) { const n = document.querySelector(`[data-ptip="${CSS.escape(ref)}"]`); if (n && n.matches(':hover')) { ptip.anchor = n; placePtip(); } else return hidePtip(); }
    if (pre) pre.textContent = ascii3d(shape, still ? 900 : t);
    if (!still) ptip.raf = requestAnimationFrame(step);
  };
  step(performance.now());
}
function placePtip() {
  const { anchor, el } = ptip, r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  const left = r.right + 12 + w < innerWidth ? r.right + 12 : Math.max(8, r.left - w - 12);
  el.style.left = left + 'px';
  el.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + 'px';
}
function hidePtip() { if (!ptip) return; cancelAnimationFrame(ptip.raf); ptip.el.remove(); ptip = null; }
document.addEventListener('mouseover', (e) => {
  const a = e.target.closest?.('[data-ptip]');
  if (!a || !a.dataset.ptip) return;
  if (ptip?.ref === a.dataset.ptip) { ptip.anchor = a; return; }
  showPtip(a);
});
document.addEventListener('mouseout', (e) => {
  const a = e.target.closest?.('[data-ptip]');
  if (a && ptip && !a.contains(e.relatedTarget) && !e.relatedTarget?.closest?.(`[data-ptip="${CSS.escape(ptip.ref)}"]`)) hidePtip();
});

// Themed hover tips: every title="" in the game shows in the game's own card instead of the browser's.
// The title moves to data-tt on first hover (so the browser's tip never shows) and the card follows the element.
// "Name: the rest" leads with the name in bold, like the item cards. Touch has no hover, so it is left alone.
const tt = { el: null, at: null, timer: 0 };
function ttHide() { clearTimeout(tt.timer); tt.at = null; if (tt.el) tt.el.hidden = true; }
function ttShow(anchor) {
  const text = anchor.dataset.tt;
  if (!text || !anchor.isConnected) return ttHide();
  if (!tt.el) { tt.el = document.createElement('div'); tt.el.className = 'tt'; tt.el.setAttribute('role', 'tooltip'); document.body.append(tt.el); }
  const m = text.match(/^([^:.\n]{2,40}): ([\s\S]+)$/);
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  tt.el.innerHTML = m ? `<b>${esc(m[1])}</b>${esc(m[2][0].toUpperCase() + m[2].slice(1))}` : esc(text);
  tt.el.hidden = false;
  const r = anchor.getBoundingClientRect(), w = tt.el.offsetWidth, h = tt.el.offsetHeight, pad = 8;
  let x = Math.min(Math.max(pad, r.left + r.width / 2 - w / 2), innerWidth - w - pad), y = r.bottom + 8;
  if (y + h > innerHeight - pad) y = Math.max(pad, r.top - h - 8);
  tt.el.style.left = x + 'px'; tt.el.style.top = y + 'px';
}
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;
  const a = e.target.closest?.('[title], [data-tt]');
  if (!a || a.closest('[data-ptip]') || a.matches('.mpkt')) return ttHide();
  if (a.hasAttribute('title')) { const t = a.getAttribute('title'); a.removeAttribute('title'); if (t) a.dataset.tt = t; }
  if (tt.at === a) return;
  ttHide(); tt.at = a;
  tt.timer = setTimeout(() => tt.at === a && ttShow(a), 280);
});
document.addEventListener('pointerout', (e) => { if (tt.at && !tt.at.contains(e.relatedTarget)) ttHide(); });
for (const ev of ['pointerdown', 'keydown', 'scroll', 'blur']) addEventListener(ev, ttHide, true);
// Touch has no hover: a tap on a fight's reading (a part's name cell, a tell chip, a gear chip) shows its card for a
// few seconds. The board redraws on the tap (it targets the part), so the card finds its element again by a selector.
let ttTap = null, ttTouch = false;
document.addEventListener('pointerdown', (e) => { ttTouch = e.pointerType === 'touch'; }, true);
document.addEventListener('click', (e) => {
  if (!ttTouch) return;
  const a = e.target.closest?.('#board .bname[title], #board .bname[data-tt], #board .intent.tell, #hud .gfx');
  if (!a) return;
  const row = a.closest('[data-target]'), sel = a.matches('.gfx') ? `#hud .gfx[data-fx="${CSS.escape(a.dataset.fx)}"]` : a.matches('.intent.tell') ? `#board .intent.tell[data-k="${CSS.escape(a.dataset.k || '')}"]` : row ? `#board .bpart[data-target="${CSS.escape(row.dataset.target)}"] .bname` : null;
  if (sel) { ttTap = { sel, until: performance.now() + 3500, at: null }; requestAnimationFrame(ttTapTick); }
});
function ttTapTick() {
  if (!ttTap) return;
  if (performance.now() > ttTap.until) { ttTap = null; return ttHide(); }
  const a = document.querySelector(ttTap.sel);
  if (!a || ttTap.at === a) return;
  if (a.hasAttribute('title')) { const t = a.getAttribute('title'); a.removeAttribute('title'); if (t) a.dataset.tt = t; }
  ttTap.at = a; tt.at = a; ttShow(a);
}
// A part's cue that names another part (a Mutex: "locks Encryptor"): hovering it lights the row it reaches.
document.addEventListener('pointerover', (e) => {
  // A tether between rows (view.mjs tethers) lights both ends.
  const c = e.target.closest?.('#board .pcue[data-link], #board .tether[data-links]');
  const ids = c ? (c.dataset.link ? [c.dataset.link] : c.dataset.links.split(' ')) : [];
  document.querySelectorAll('#board .bpart.linked').forEach((r) => { if (!ids.includes(r.dataset.target)) r.classList.remove('linked'); });
  for (const id of ids) document.querySelector(`#board .bpart[data-target="${CSS.escape(id)}"]`)?.classList.add('linked');
});
