// BLACKBOX browser shell: modules, command line, clock, save, sound.
import { CONFIG, ABILITIES, FAMILIES, xpToNext } from './data.mjs';
const FAMILY_NAMES = Object.fromEntries(Object.entries(FAMILIES).map(([k, f]) => [k, f.name]));
import { parse, validate, hooks, stepCycle, keyMap, hackerOf, classOf, cycleLength, fresh, restore, command, advance, active, alive, part, intents, suggestions, idleRegen, tickServices, topUpCost, defender, maxSignal, inSync } from './combat.mjs';
import * as V from './view.mjs';
import { SHAPES, render as ascii3d } from './ascii3d.mjs';
import { createArt } from './virus-art.mjs';
import { createFeel } from './feel.mjs';
import { createShell } from './shell.mjs';
import { play, runSuggestions, nextActions, currentLocation, signalNow, crewWander } from './run.mjs';
import { tickNetwork, degradedLeft, fmtLeft } from './invasion.mjs';
import { consortiumOf, alertsOf } from './consortium.mjs';
import { nextPayIn, boardOpen, storyAt } from './mail.mjs';
import { hubsOf, hubFound, hubTraceOf, FACTIONS } from './factions.mjs';
import { WARES } from './market.mjs';
import { logComms, commsOf, unseen, unseenAlert, seeAll, markDone, pruneComms, clearComms, clearOne } from './comms.mjs';
import { nextTip, markSeen } from './tips.mjs';
import { createRain } from './rain.mjs';
import { createWindow } from './window.mjs';
import { createIntro } from './intro.mjs';
import { SALVAGE_COSTS, autoPay } from './salvage.mjs';
import { relockLeft } from './rogue.mjs';
import { createHitFx } from './hitfx.mjs';
import { online, simOn } from './presence.mjs';
import { matesOf } from './crew.mjs';

const SAVE_KEY = 'blackbox-v6';
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const playtest = params.get('playtest');

// ---------- state ----------
let campaign = load();
if (params.has('dev')) Object.defineProperty(window, '__bb', { get: () => campaign }); // dev only: the live state, for tests
let module = playtest === 'story' ? 'mail' : 'map';
let selected = null;
let mapSel = 'server';
let nag = {}; // when the pager last shook for an alert, and the breach last pinged
let wasCooling = new Set(); // abilities on cooldown at the last render (the tray flashes the ones that come back)
let mapView = 'mine'; // the Map: 'mine' (your network) or 'consortium' (the merged servers)
let mailSel = null; // the open item on the Mail page: 'l<id>' a letter, 'j<id>' a contract
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
  if (playtest) {
    const s = fresh();
    if (['breaker', 'bastion', 'infiltrator', 'operator'].includes(params.get('cls'))) s.loadout.archetype = params.get('cls'); // ?playtest=cryptjack&cls=infiltrator
    command(s, `encounter ${/^[a-z]+$/.test(playtest) ? playtest : 'cryptjack'}`); // any fixture or strain
    if (!s.encounter) command(s, 'encounter cryptjack');
    command(s, 'engage');
    s.encounter.paused = true;
    return s;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    const s = restore(raw);
    if (!raw) s.rng = newRng(); // crits and drops differ from game to game
    return s;
  } catch {
    const s = fresh();
    s.rng = newRng();
    return s;
  }
}
function newRng() { return (Math.random() * 2 ** 32) >>> 0; }
let saveTimer = 0;
function save() {
  if (playtest) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(campaign)); } catch { /* storage unavailable: play continues unsaved */ }
  }, 250);
}

// Closing the tab saves at once: nothing in flight is lost (or undone) with the page.
addEventListener('pagehide', () => { if (playtest) return; clearTimeout(saveTimer); try { localStorage.setItem(SAVE_KEY, JSON.stringify(campaign)); } catch { /* storage unavailable */ } });

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
function strikes(events) {
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
  for (const { e, result } of hits.values()) pendingStrikes.push(() => hitfx.strike(partRow(e.target), { who: e.who || 'you', initials: initials(e.who || campaign.profile?.handle || 'you'), kind: e.who ? 'crew' : 'you', result }));
}
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
  introOn = true;
  intro.run().then(({ handle, pwLen }) => {
    introOn = false;
    campaign.profile = { handle, pwLen, since: Date.now() };
    save();
    dirty = true;
    cache.clear();
    go('map', true);
    feel.add('pager', '#pager');
    notice('New mail: wick has written to you.');
  });
}
const shell = createShell({ getState: () => campaign, isOn: shellOn, canMove: () => canMove(), tick: () => feel.key('char') });
shell.mount();
const row = (id) => `.board [data-target="${id}"]`;
const MINE = '.hud-bar.mine';

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
  el.innerHTML = V.spoilsMarkup(head, rows, xp, ended === 'run' && campaign.run ? 'Back to the run' : 'Back to the map');
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
function leaveFight() { const to = ended === 'run' && campaign.run ? 'net' : 'map'; ended = null; go(to); }
// The gain card: a pull pops a one-row card that fades on its own; a jack-out shows everything
// banked and waits for Enter (or a click, or the next command).
let gainTimer = 0;
function showGain(kicker, name, rows, toast) {
  const el = $('gain');
  if (!el) return;
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
function hideGain() { clearTimeout(gainTimer); const el = $('gain'); if (el && !el.hidden) { el.hidden = true; el.innerHTML = ''; } }
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
  const fx = canMove();
  if (events.some((e) => e.type === 'engage')) { barsBefore = null; hideSpoils(); fightFrom = events.find((e) => e.type === 'engage').id; }
  if (won) { const batch = [...campaign.logs.filter((e) => e.id >= fightFrom && e.id < events[0].id && e.type === 'loot'), ...events.filter((e) => e.id >= won.id || e.type === 'loot')]; setTimeout(() => { if (ended) { document.body.classList.add('fight-over'); showSpoils(batch); } }, 900); }
  // Crewmates' events (crew.mjs). Their turns play a beat apart, so their hits sound like yours.
  // When the virus hits everyone at once, the hits show on each row, and only one of them sounds.
  strikes(events);
  let hurtVoiced = events.some((e) => e.type === 'server-hit' && !e.who);
  // A part's attack: its row lunges and the attack's name comes off it, once per part per batch.
  const lunged = new Set();
  for (const e of events) {
    if (!e.source || lunged.has(e.source) || !['server-hit', 'evaded', 'blocked', 'encrypt', 'blind'].includes(e.type) || !active(campaign)) continue;
    lunged.add(e.source);
    const p = part(campaign, e.source);
    if (p && fxLevel() !== 'minimal') feel.add('strike', row(e.source), p.attack?.name ? p.attack.name.toUpperCase() : null, { floatAt: `${row(e.source)} > .bcell:nth-child(2)` });
  }
  for (const e of events) {
    if (e.who) {
      const mate = `.pmate[data-mate="${e.who}"]`; // their line under your Signal (HUD)
      if (e.type === 'server-hit') {
        art.hit(e.source, 'attack');
        feel.add(e.crit ? 'hurtcrit' : 'hurt', mate, `${e.crit ? 'CRIT ' : ''}−${e.amount}`, { amount: e.amount, silent: hurtVoiced, noEdge: true });
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
        art.hit(e.target, e.crit ? 'crit' : 'hit');
        const pm = part(campaign, e.target)?.max || 50, big = Math.min(1, e.amount / pm);
        const size = (1 + big * 0.9 + (e.crit ? 0.35 : 0)) * (mate ? 0.8 : 1);
        // On the part itself: calm flashes its name line; full, its whole cell (with the strike). The number rises off it.
        const at = full ? `${row(e.target)} > .bcell:first-child` : `${row(e.target)} .part-top`;
        const look = { amount: e.amount, size, noFlash: lvl === 'minimal' || (mate && !full), quiet: mate && !full, floatAt: `${row(e.target)} > .bcell:first-child` };
        if (e.crit) feel.add('crit', at, `CRIT −${e.amount}`, look); else feel.add('hit', at, `−${e.amount}`, look);
        if (fx && full) feel.add(() => { juice.punch(0.4 + big + (e.crit ? 0.6 : 0)); juice.sparks(e.target, e.crit ? 10 : 4 + Math.round(big * 6), e.crit ? 'crit' : ''); });
        else if (fx && lvl === 'calm' && e.crit && !mate) feel.add(() => juice.punch(0.6 + big));
        if (fx && !mate && e.crit) feel.add(() => juice.nudge(4.5)); // only a crit nudges the screen
        if (!mate) { sideFx('.brow.byou', row(e.target), 'you'); holdYou(); }
        break;
      }
      case 'broken': {
        // It stays on the board a moment and dissolves into bits before it joins the broken list.
        const bp = part(campaign, e.target);
        if (bp && canMove()) { Object.defineProperty(bp, '_dyingUntil', { value: Date.now() + DISSOLVE_MS, writable: true, configurable: true, enumerable: false }); setTimeout(() => { dirty = true; }, DISSOLVE_MS + 50); pendingStrikes.push(() => hitfx.dissolve(partRow(e.target))); }
      }
        art.hit(e.target, 'break'); flash(e.message); feel.add('break', '.hud-bar.enemy', 'BROKEN'); if (selected === e.target) selected = null; break;
      case 'server-hit': {
        art.hit(e.source, 'attack');
        const dm = defender(campaign).max || 100, frac = e.amount / dm, size = 1 + Math.min(1, frac * 5) * 0.8;
        const big = e.crit || frac >= 0.15; // only a big hit shakes the screen and flashes its edge
        if (e.crit) { flash('CRITICAL HIT'); feel.add('hurtcrit', MINE, `CRIT −${e.amount}`, { amount: e.amount, frac, size: size + 0.3 }); } else feel.add('hurt', MINE, `−${e.amount}`, { amount: e.amount, frac, size, noEdge: !big });
        holdThem(); sideFx(row(e.source), MINE, 'them');
        if (fx && big) feel.add(() => juice.quake(frac, e.crit));
        break;
      }
      case 'drop': feel.add('pickup', null); if (['tuned', 'custom', 'zeroday'].includes(e.rarity)) notice(e.message); break;
      case 'miss': feel.add('miss', e.target ? row(e.target) : '.bnow', 'MISS'); break;
      case 'evaded': feel.add('evade', MINE, 'EVADED'); break;
      case 'gear': feel.add('good', null); if (e.gains?.length) showGain('Deconstructed', e.name || '', e.gains, false); break;
      case 'code': if (!won) feel.add('pickup', null); break;
      case 'service': feel.add('good', null); break;
      case 'service-done': feel.add('unlock', null); notice(e.message); break;
      // Invasions: one line each, and only when something changes.
      case 'invader': notice(e.message); break;
      case 'wall-siege': feel.add('interrupt', '#meter-integrity', 'SIEGE'); notice(e.message); break;
      case 'jack-in': feel.add('jackin', null); shell.glitch?.(); break;
      case 'run-start': feel.add('jackin', null); shell.glitch?.(); break;
      case 'jacked-out': feel.add('hangup', null); if (e.gains?.length) { const name = e.message.match(/^JACKED OUT of (.+?)\. Banked/)?.[1] || ''; setTimeout(() => showGain('Banked', name, e.gains, false), 350); } break;
      case 'station': feel.numbers(); break; // LANTERN on the radio (the pager carries the text)
      case 'wall-breach': feel.add('hurt', '#meter-integrity', 'BREACH'); notice(e.message, true); ledRing(); break;
      case 'invasion-cleared': if (!won) { feel.add(e.blocked ? 'good' : 'win', MINE); notice(e.message); } break;
      case 'degraded': flash('REBOOTED · DEGRADED'); notice(e.message, true); if (module === 'combat') setTimeout(() => { if (!active(campaign)) go('map'); }, 1800); break;
      case 'rebooted': feel.add('unlock', MINE); notice(e.message); break;
      case 'encrypt': art.hit(e.source, 'attack'); flash('ENCRYPTED'); feel.add('encrypt', MINE, `+${e.amount}/cycle`); break;
      case 'encrypted': feel.add('drain', MINE, `−${e.amount}`); break;
      case 'decrypted': flash('DECRYPTED'); feel.add('unlock', MINE, 'KEY'); break;
      case 'blind': flash('SCRAMBLED'); feel.add('blind', '.board', null); break;
      case 'scrambled': flash('SCRAMBLED'); feel.add('hurt', MINE, `−${e.amount}`, { amount: e.amount, frac: e.amount / (defender(campaign).max || 100), size: 1.3 }); break;
      case 'armor': { const lvl = fxLevel(); art.hit(e.target, 'chit'); feel.add('chit', `${row(e.target)} .part-top`, 'CRACKED', { size: 1.1, noFlash: lvl === 'minimal', floatAt: `${row(e.target)} > .bcell:first-child` }); if (fx && lvl !== 'minimal') feel.add(() => { juice.shatter(e.target); if (lvl === 'full') juice.punch(0.35); }); if (fx && !e.who) feel.add(() => juice.nudge(1.5)); break; }
      case 'patch': feel.add('patch', row(e.target), e.adapt ? 'ADAPTS +◆' : '+◆'); break;
      case 'reroute': feel.add('patch', row(e.target), `+${e.amount} REROUTED`); if (e.from) art.hit(e.target, 'attack'); break;
      case 'xp': feel.add('cycle', null, `+${e.amount} XP`); break;
      case 'status': if (e.mark) markFx(e, false); break;
      case 'fast-kill': feel.add('good', null); break;
      case 'codex': feel.add('mark', '.hud-bar.enemy', 'DECODED', { noFlash: true }); break;
      case 'level-up': case 'server-level': {
        if (won) break;
        const [t, ...rest] = e.message.split('. ');
        levelUp(t.replace(/\.$/, ''), rest.join('. '));
        feel.add('win', null);
        break;
      }
      case 'heal': feel.add('good', MINE, e.amount ? `+${e.amount}` : null); break;
      case 'blocked': feel.add('interrupt', MINE, 'BLOCKED'); break;
      case 'trap': flash('CANARY TRIPPED'); feel.add('hurt', null, `−${e.amount}`); break;
      case 'interrupt': feel.add('interrupt', row(e.target), 'DELAYED'); break;
      case 'warning': feel.add('nope', '#command-form'); break;
      case 'scan': art.hit(e.target); flash(e.message.split('.')[0].toUpperCase()); feel.add('good', row(e.target), 'WEAK'); break;
      case 'proc': feel.add('good', null); break;
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
      case 'bought': feel.add('pickup', null); notice(e.message); break;
      case 'relay': feel.add('jackin', null); notice(e.message); break;

      case 'synced': feel.add(e.surprise ? 'surprise' : 'sync', row(e.target) || '.bnow', e.surprise ? 'SURPRISE' : 'SYNCED'); if (fx) feel.add(() => juice.punch(0.5)); break;
      case 'boost': feel.add('unlock', '.net-signal', `+${e.amount}`); break;
      case 'crafted': feel.add('pickup', null); notice(e.message); break;
      case 'fleet': case 'fleet-siege': feel.add('prewarn', null); break;
      case 'infest': feel.add('prewarn', null); break;
      case 'fleet-hit': feel.add('good', null); notice(e.message); break;
      case 'fleet-broken': flash('SWARM BROKEN'); feel.add('win', null); notice(e.message); break;
      case 'config': feel.add('unlock', null); notice(e.message); break;
      case 'architecture': flash('REBUILT'); feel.add('win', null); notice(e.message); break;
      case 'outpost-up': feel.add('unlock', null); notice(e.message); break;
      case 'harvester': feel.add('pickup', null); notice(e.message); break;
      case 'harvest': feel.add('pickup', null); break;
      case 'outpost-siege': case 'consortium-siege': case 'consortium-raid': case 'consortium-roam': feel.add('prewarn', null); break;
      case 'outpost-fell': flash('OUTPOST LOST'); feel.add('lose', null); break;
      case 'outpost-held': feel.add('good', null); notice(e.message); break;
      case 'takeover': flash('TAKEN OVER'); feel.add('win', null); notice(e.message); break;
      case 'victory':
        flash('NEUTRALIZED');
        feel.add('win', '.hud');
        // Let the last break land, then show what the fight gave you.
        ending = true; hideTip(false); ended = e.mode || 'home';
        setTimeout(() => { ending = false; }, 900);
        break;
      case 'crashed': flash(e.mode === 'run' ? 'SIGNAL LOST' : 'SERVER CRASHED'); feel.add('lose', MINE); if (e.invader && !active(campaign)) notice(e.message, true); break;
      case 'disconnected': feel.add('lose', null); notice(e.message, true); setTimeout(() => go('map'), 1600); break;
    }
    if (e.type === 'located') { notice(e.message); mapSel = e.location; }
  }
  const after = barWas();
  if (fx && barsBefore && after) { const b = barsBefore; feel.add(() => { juice.trail('.hud-bar.enemy', b.enemy, after.enemy); juice.trail(MINE, b.mine, after.mine); }); }
  barsBefore = after;
  pagerReact(events);
  shell.react(events);
  if (events.length) dirty = true;
}

// ---------- after a fight ----------
// No Victory screen: the log carries what the fight gave you. Enter on an empty line (or any
// page button) moves on: back to the run, or the map.
let ended = null; // 'home' | 'run' once a fight is over and you're still looking at it
let ending = false; // the last break is landing

// ---------- notices ----------
// A level-up gets its own banner, on any screen.
function levelUp(title, text) {
  $('levelup-title').textContent = title;
  $('levelup-text').textContent = text;
  const el = $('levelup');
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(levelUp.t);
  levelUp.t = setTimeout(() => { el.hidden = true; }, 3200);
}
function notice(text, bad = false, suggest = null) {
  const el = $('notice');
  el.textContent = text;
  // A typo's best guess: click it to run it (or, ending in a space, to fill the prompt).
  if (suggest) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tok act suggest'; b.dataset.prefill = suggest; b.textContent = suggest.trim(); el.append(' ', b); }
  el.classList.toggle('bad', bad);
  el.hidden = !text;
  clearTimeout(noticeTimer);
  if (text) noticeTimer = setTimeout(() => (el.hidden = true), 4000);
}

// ---------- commands ----------
const NAV = ['map', 'combat', 'net', 'server', 'craft', 'loadout', 'daemons', 'system'];
const ALIAS = { vault: 'loadout', gear: 'loadout', protocols: 'loadout', stash: 'loadout', inventory: 'loadout', crafting: 'craft', workbench: 'craft', build: 'craft', services: 'server', ports: 'server', wall: 'server', talents: 'loadout', skills: 'loadout', archetypes: 'loadout', home: 'map', trace: 'map', leads: 'map', logs: 'system', settings: 'system', fight: 'combat', run: 'net' };

function run(raw) {
  let text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  aimPreview = null; // the command is going in: the board shows the real aim again
  if (!text) return;
  history = [text, ...history.filter((h) => h !== text)].slice(0, 40);
  historyIndex = -1;
  // A server you found but never connected: typing connect asks first, on its map card.
  const join = text.match(/^connect (\S+)$/);
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
  // Developer commands are for tests and ?dev / playtest pages, not the real game (a crashed
  // server's reboot excepted: the engine points you to it).
  if (/^developer( |$)/.test(text) && !params.has('dev') && !playtest && !(text === 'developer reboot' && shown().server.integrity <= 0)) text = 'developer-off'; // the engine answers it as an unknown command

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
  if (text === 'help') return notice('Fight: spike and your class\'s skills (keys 1–8), hold, now. Runs: ls, cd, cat, pull, unlock, jack out. Protocols: load, unload, scrap, compile. Services: install, uninstall, cancel install. Wall: jack in (fight the invasion at your wall). Pages: map, server, protocols, loadout, daemons, system. Screen: shell immersive|plain|boot. Start over: reset game.');
  if (text.startsWith("'") || text.startsWith('say ')) return notice('Chat arrives with co-op. For now it is just you and the virus.');

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
    const info = events.some((e) => e.type === 'contract-done') ? null : events.findLast((e) => ['info', 'repair', 'daemon-set', 'gear', 'drop', 'service', 'service-done', 'code'].includes(e.type));
    if (info) notice(info.message);
  }
  // (a connect or hang-up has its own sound, so the channel change stays quiet)
  if ((wasAlert || events.some((e) => e.type === 'jack-in' || e.type === 'engage')) && active(campaign)) go('combat', events.some((e) => e.type === 'jack-in'));
  else if (events.some((e) => e.type === 'run-start')) go('net', true);
  else if (events.some((e) => e.type === 'jacked-out')) go('map', true);
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
  history = [];
  historyIndex = -1;
  mapSel = 'server';
  archView = null;
  selected = null;
  if (!playtest) try { localStorage.setItem(SAVE_KEY, JSON.stringify(campaign)); } catch { /* storage unavailable */ }
  go('map');
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
  if (name === 'net' && !campaign.run) name = 'map';
  // Stepping away from a live fight pauses it; coming back picks it up again.
  const leaving = module === 'combat' && name !== 'combat' && active(campaign) && !campaign.encounter.paused;
  if (leaving) { campaign.encounter.paused = true; campaign.encounter.autoPaused = true; notice('Fight paused.'); }
  if (name === 'combat' && active(campaign) && campaign.encounter.autoPaused) { campaign.encounter.paused = false; campaign.encounter.autoPaused = false; }
  if (name !== module && !quiet) feel.add('channel', null);
  if (name !== 'combat') hideSpoils();
  if (gainOpen()) hideGain();
  if (name !== 'hub') { hubOpen = false; hubWin = null; }
  module = name;
  selected = null;
  document.querySelectorAll('.modules button').forEach((b) => b.setAttribute('aria-current', b.dataset.module === name ? 'page' : 'false'));
  dirty = true;
  render(true);
  shell.onModule(name);
  $('command-input').focus();
}

// Fill the prompt the way a hotkey would; the player still presses Enter.
function prepare(abilityId) {
  const a = ABILITIES[abilityId];
  const s = shown();
  const input = $('command-input');
  if (!a) return;
  let text = abilityId;
  if (a.target === 'command') text += ' ';
  if (a.target === 'schedule') text += ' 2 ';
  if (a.target === 'part') text += selected && alive(part(s, selected)) ? ` ${selected}` : ' ';
  if (a.target === 'attack') text += selected && part(s, selected)?.attack && alive(part(s, selected)) ? ` ${selected}` : '';
  input.value = text;
  input.focus();
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
  el.innerHTML = html;
  el.querySelectorAll('details').forEach((d, i) => { if (open[i]) d.open = true; });
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
  $('whoami').title = `${h.level >= 50 ? 'max' : `${h.xp}/${V.xpNeeded(h.level)} XP`}`;
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
    m.hidden = !!campaign.run || active(campaign); // a fight has its own bars
    $('signal-value').textContent = sig;
    const lit = Math.ceil(f * 5 - 1e-9);
    m.querySelectorAll('.sig-bars i').forEach((b, i) => b.classList.toggle('on', i < lit));
    m.classList.toggle('weak', f < need);
    m.classList.toggle('resting', !campaign.run && !active(campaign) && sig < max);
    const mins = Math.ceil((max - sig) / (CONFIG.signalRest * max));
    meterBuy(m, 'top up', campaign.run ? 0 : topUpCost(campaign, 'signal'),
      `Signal ${sig}/${max}: your health out on the net. ${sig < max ? `Rests back to full in about ${mins} min at home.${f < need ? ` You need ${Math.ceil(max * need)} to connect.` : ''}` : 'Full.'}`);
  }
  const s = shown();
  // On a run, Signal lives in the prompt, the net header and the combat HUD.
  // Fight and Run tabs appear only while there is a fight or a run.
  $('tab-combat').hidden = !active(campaign);
  $('tab-net').hidden = !campaign.run;
  document.body.classList.toggle('ctx-tabs', active(campaign) || !!campaign.run);
  $('combat-dot').hidden = !active(campaign) || module === 'combat';
  const unreadMail = (campaign.mail?.list || []).filter((m) => !m.read).length;
  $('mail-count').hidden = !unreadMail;
  $('mail-count').textContent = unreadMail;
  $('tab-store').hidden = true; // Halcyon's store lives in its hub (connect halcyon → Shop)
  $('tab-consortium').hidden = !consortiumOf(campaign) && !campaign.consortiumInvite;
  fitTopbar();
  const need = alertsOf(campaign).length + (campaign.consortiumInvite && !consortiumOf(campaign) ? 1 : 0);
  $('con-count').hidden = !need;
  $('con-count').textContent = need;
  if (module === 'loadout' && loadoutTab === 'daemons') V.sawTab(campaign, 'daemons'); // daemons are a Loadout tab
  for (const t of ['loadout', 'craft']) {
    if (module === t && !(t === 'loadout' && loadoutTab === 'daemons')) V.sawTab(campaign, t); // you're looking at it
    const n = V.newOn(campaign, t) + (t === 'loadout' ? V.newOn(campaign, 'daemons') : 0), el = $('new-' + t);
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
let mapPickOpen = false; // whether the picker's menu is open (it survives redraws)
let leadsOpen = false; // a run's Leads panel (the run header's toggle)
let memYes = null; // the found server you just said yes to (its connect goes through)
addEventListener('resize', () => { dirty = true; applyMapZoom(); });
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
    put('board', V.boardMarkup(s, selected, aimPreview));
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
  } else if (combatLike) {
    put('page-view', V.mapMarkup(campaign, mapSel, mapView, { side: false, pop: mapPop, filter: mapFilter, list: mapList, sort: mapSort, pickOpen: mapPickOpen }));
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
    const pages = { map: (x) => V.mapMarkup(x, mapSel, mapView, { side: false, pop: mapPop, filter: mapFilter, list: mapList, sort: mapSort, pickOpen: mapPickOpen }), loadout: (x) => V.loadoutMarkup(x, archView, loadoutTab), craft: (x) => V.craftMarkup(x, craftUi), mail: (x) => V.mailMarkup(x, mailSel), store: (x) => V.storeMarkup(x, Date.now()), consortium: (x) => V.consortiumMarkup(x, Date.now()), hub: (x) => V.hubTerminalMarkup(x, hubSel, hubLines, hubWin, Date.now()), server: (x) => V.serverMarkup(x, Date.now()), daemons: V.daemonsMarkup, system: V.systemMarkup };
    if (!(module === 'hub' && mkDrag)) put('page-view', (pages[module] || pages.map)(campaign)); // not while you drag a ticket's slider
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
  put('tray', netTray ? V.netTrayMarkup(nextActions(campaign)) : V.trayMarkup(s));
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
  const cased = shellOn() && campaign.settings.casing !== false, win = cased && campaign.settings.window !== false;
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
  }
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
  const now = Date.now();
  // Active play time, for kills an hour (System page): the tab is open and you've touched it in the last 2 minutes.
  const dt = Math.min(5000, now - lastTick); lastTick = now;
  if (!document.hidden && now - lastInput < 120000 && !playtest) (campaign.pace ||= { kills: 0, ms: 0 }).ms += dt;
  const hp = campaign.server.integrity;
  const events = [...tickNetwork(campaign, now), ...tickServices(campaign, now)];
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
  tip = { t, paused: false };
  $('tip-text').textContent = t.text;
  $('tip').hidden = false;
  if (t.pause && active(campaign) && !campaign.encounter.paused) { campaign.encounter.paused = true; tip.paused = true; dirty = true; }
  placeTip();
  const box = $('tip');
  box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
}
function placeTip() {
  if (!tip) return;
  const el = document.querySelector(tip.t.at);
  if (!el || !onScreen(tip.t.at)) return hideTip(false); // it'll come back when its thing does
  document.querySelectorAll('.tip-target').forEach((x) => { if (x !== el) x.classList.remove('tip-target'); });
  el.classList.add('tip-target');
  const box = $('tip'), r = el.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
  // Under a container (the board): the thing it explains stays in view; the arrow still points at it.
  const u = (tip.t.under && document.querySelector(tip.t.under)?.getBoundingClientRect()) || r;
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
  if (seen) { markSeen(campaign, tip.t.id); save(); }
  if (tip.paused && active(campaign) && campaign.encounter.paused) { campaign.encounter.paused = false; dirty = true; }
  document.querySelectorAll('.tip-target').forEach((x) => x.classList.remove('tip-target'));
  $('tip').hidden = true;
  tip = null;
  tipWait = performance.now() + 700; // a breath before the next one
}
$('tip-ok').addEventListener('click', () => { hideTip(true); $('command-input').focus(); });
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
    // Resting between fights, plus any Hot-patcher, by the wall clock: a hidden tab or a closed
    // game (up to 8 hours) catches up.
    const away = Math.min(8 * 3600000, Math.max(0, wall - (campaign.restAt ?? wall)));
    campaign.restAt = wall;
    if (idleRegen(campaign, away)) { dirty = true; save(); }
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
  const cost = SALVAGE_COSTS[id](Number(n) || 0);
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
  if (tip && !e.target.closest('#tip') && e.target.closest(tip.t.at)) hideTip(true);
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
    if (cmd.classList.contains('ability')) { $('command-input').value = cmd.dataset.command; $('command-input').focus(); return; }
    return run(cmd.dataset.command);
  }
  const loc = e.target.closest('[data-locate]');
  if (loc) { pendingLocate = loc.dataset.locate === '__sel' ? mapSel : loc.dataset.locate; mapList = false; mapSel = pendingLocate; mapPop = true; if (module !== 'map') go('map'); dirty = true; return; }
  const cc = e.target.closest('[data-craft-cat]');
  if (cc) { craftUi = { cat: cc.dataset.craftCat, pick: null }; dirty = true; return; }
  const cp = e.target.closest('[data-craft-pick]');
  if (cp) { craftUi = { ...craftUi, pick: cp.dataset.craftPick }; dirty = true; return; }
  const ml = e.target.closest('[data-maplist]');
  if (ml) { mapList = ml.dataset.maplist === '1'; dirty = true; return; }
  const ms = e.target.closest('[data-msort]');
  if (ms) { mapSort = ms.dataset.msort; dirty = true; return; }
  const mf = e.target.closest('[data-mapfilter]');
  if (mf) { mapFilter = mf.dataset.mapfilter === 'all' ? [] : [mf.dataset.mapfilter]; dirty = true; return; }
  if (e.target.closest('[data-mapfilter-toggle]')) { e.preventDefault(); mapPickOpen = !mapPickOpen; dirty = true; return; }
  if (e.target.closest('[data-mapfilter-clear]')) { mapFilter = []; dirty = true; return; }
  if (mapPickOpen && !e.target.closest('.map-pick')) { mapPickOpen = false; dirty = true; }
  const mv = e.target.closest('[data-mapview]');
  if (mv) { mapView = mv.dataset.mapview; mapSel = 'server'; feel.add('channel', null); dirty = true; return; }
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
  const direct = e.target.closest('[data-run]');
  if (direct) { run(direct.dataset.run); $('command-input').focus(); return; }
  const pre = e.target.closest('[data-prefill]');
  if (pre) {
    const v = pre.dataset.prefill;
    if (v.endsWith(' ')) { $('command-input').value = v; $('command-input').focus(); updateSuggestions(); } else run(v);
    return;
  }
  const ability = e.target.closest('[data-ability]');
  if (ability) return prepare(ability.dataset.ability);
  const target = e.target.closest('[data-target]');
  if (target && !target.disabled) {
    selected = selected === target.dataset.target ? null : target.dataset.target;
    const input = $('command-input');
    const [word] = input.value.trim().split(' ');
    if (selected && ABILITIES[word] && ABILITIES[word].target !== 'none') input.value = `${word} ${selected}`;
    input.focus();
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
  if (e.target.closest('[data-map-pop-close]') || (e.target.closest('.map-svg') && !e.target.closest('.mnode'))) { if (mapPop) { mapPop = false; dirty = true; } }
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
    if (tip) { hideTip(true); return; } // Enter closes a tip first
    // Empty Enter in a fight: stop waiting and resolve this cycle now.
    if (active(campaign) && !campaign.encounter.paused) { react(command(campaign, 'now')); save(); dirty = true; }
    else if (module === 'combat' && ended) leaveFight();
    return;
  }
  run(value);
});

$('command-input').addEventListener('input', updateSuggestions);
$('command-input').addEventListener('keydown', (e) => {
  const input = e.currentTarget;
  if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') feel.key(e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'back' : 'char');
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
  if (/^[1-8]$/.test(e.key) && !input.value.trim()) {
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
  if (e.key === 'Escape' && mapPop && module === 'map') { mapPop = false; dirty = true; }
});

// Typing anywhere goes to the prompt.
document.addEventListener('keydown', (e) => {
  if (e.target === $('command-input') || e.target.closest?.('[data-select]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length === 1 && !/input|textarea/i.test(e.target.tagName)) $('command-input').focus();
});

if (playtest) document.title = 'BLACKBOX · playtest';
go(active(campaign) ? 'combat' : campaign.run ? 'net' : playtest === 'story' ? 'mail' : 'map');
// No intrusion waits at the gate any more: you go to the rogue server to find fights.
if (campaign.encounter?.phase === 'alert' && campaign.encounter.mode === 'home' && !campaign.encounter.invader) campaign.encounter = null;
{ const done = [...tickNetwork(campaign, Date.now()), ...tickServices(campaign, Date.now())]; if (done.length) { react(done); save(); } } // installs that finished (or Degraded mode that ran out) while you were away
if (!playtest) { if (!campaign.profile) firstLogin(); else shell.boot(); }
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
