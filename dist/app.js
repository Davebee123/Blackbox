// BLACKBOX browser shell: modules, command line, clock, save, sound.
import { CONFIG, ABILITIES, FAMILIES, xpToNext } from './data.mjs';
const FAMILY_NAMES = Object.fromEntries(Object.entries(FAMILIES).map(([k, f]) => [k, f.name]));
import { keyMap, hackerOf, classOf, cycleLength, fresh, restore, command, advance, active, alive, part, intents, suggestions, idleRegen, tickServices, topUpCost, defender, maxSignal, inSync } from './combat.mjs';
import * as V from './view.mjs';
import { createArt } from './virus-art.mjs';
import { createFeel } from './feel.mjs';
import { createShell } from './shell.mjs';
import { play, runSuggestions, nextActions, currentLocation, signalNow } from './run.mjs';
import { tickNetwork, degradedLeft, fmtLeft } from './invasion.mjs';
import { nextPayIn, boardOpen, storyAt } from './mail.mjs';
import { logComms, commsOf, unseen, unseenAlert, seeAll } from './comms.mjs';
import { nextTip, markSeen } from './tips.mjs';
import { createRain } from './rain.mjs';
import { createWindow } from './window.mjs';
import { createIntro } from './intro.mjs';
import { SALVAGE_COSTS, autoPay } from './salvage.mjs';
import { relockLeft } from './rogue.mjs';

const SAVE_KEY = 'blackbox-v6';
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const playtest = params.get('playtest');

// ---------- state ----------
let campaign = load();
let module = playtest === 'story' ? 'mail' : 'map';
let selected = null;
let mapSel = 'server';
let mailSel = null; // the open item on the Mail page: 'l<id>' a letter, 'j<id>' a contract
let history = [];
let historyIndex = -1;
let suggestionList = [];
let suggestionIndex = -1;
let noticeTimer = 0;
let dirty = true;
let archView = null; // archetype shown on the Loadout page (defaults to the equipped one)
let loadoutTab = 'protocols'; // Loadout page: 'protocols', 'skills' or 'talents'
let compileFocus = null; // the recipe picked on the Craft page's Protocols card (null: any)

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

const shown = () => campaign;

// ---------- art ----------
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canMove = () => campaign.settings.motion && !reducedMotion.matches;
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
// A hit lands on the timeline too: a burst in the part's Now cell (gold, bigger on a crit;
// a small white one when it only breaks a chit).
function impact(id, crit = false, chit = false) {
  if (!canMove()) return;
  const cell = document.querySelector(row(id))?.children[1];
  if (!cell) return;
  // Fixed on the page, so the board re-rendering this cycle doesn't cut it short.
  const r = cell.getBoundingClientRect();
  const b = document.createElement('i');
  b.className = 'fx-impact' + (crit ? ' crit' : chit ? ' chit' : '');
  b.style.left = r.left + r.width / 2 + 'px';
  b.style.top = r.top + r.height / 2 + 'px';
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 600);
}
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
    const cell = document.querySelector(row(id))?.children[1];
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
function hideSpoils() {
  document.body.classList.remove('fight-over'); const el = $('spoils'); if (el) { el.hidden = true; el.innerHTML = ''; } }

function react(events) {
  const won = events.find((e) => e.type === 'victory');
  const fx = canMove();
  if (events.some((e) => e.type === 'engage')) { barsBefore = null; hideSpoils(); fightFrom = events.find((e) => e.type === 'engage').id; }
  if (won) { const batch = [...campaign.logs.filter((e) => e.id >= fightFrom && e.id < events[0].id && e.type === 'loot'), ...events.filter((e) => e.id >= won.id || e.type === 'loot')]; setTimeout(() => { if (ended) { document.body.classList.add('fight-over'); showSpoils(batch); } }, 900); }
  for (const e of events) {
    switch (e.type) {
      case 'damage': {
        art.hit(e.target, e.crit ? 'crit' : 'hit'); impact(e.target, e.crit);
        const pm = part(campaign, e.target)?.max || 50, big = Math.min(1, e.amount / pm);
        const size = 1 + big * 0.9 + (e.crit ? 0.35 : 0);
        if (e.crit) feel.add('crit', row(e.target), `CRIT −${e.amount}`, { amount: e.amount, size }); else feel.add('hit', row(e.target), `−${e.amount}`, { amount: e.amount, size });
        if (fx) feel.add(() => { juice.punch(0.4 + big + (e.crit ? 0.6 : 0)); juice.sparks(e.target, e.crit ? 10 : 4 + Math.round(big * 6), e.crit ? 'crit' : ''); });
        break;
      }
      case 'broken': art.hit(e.target, 'break'); flash(e.message); feel.add('break', '.hud-bar.enemy', 'BROKEN'); if (selected === e.target) selected = null; break;
      case 'server-hit': {
        art.hit(e.source, 'attack');
        const dm = defender(campaign).max || 100, frac = e.amount / dm, size = 1 + Math.min(1, frac * 5) * 0.8;
        if (e.crit) { flash('CRITICAL HIT'); feel.add('hurtcrit', MINE, `CRIT −${e.amount}`, { amount: e.amount, frac, size: size + 0.3 }); } else feel.add('hurt', MINE, `−${e.amount}`, { amount: e.amount, frac, size });
        if (fx) feel.add(() => juice.quake(frac, e.crit));
        break;
      }
      case 'drop': feel.add('pickup', null); if (['tuned', 'custom', 'zeroday'].includes(e.rarity)) notice(e.message); break;
      case 'miss': feel.add('miss', e.target ? row(e.target) : '.bnow', 'MISS'); break;
      case 'evaded': feel.add('evade', MINE, 'EVADED'); break;
      case 'gear': feel.add('good', null); break;
      case 'code': if (!won) feel.add('pickup', null); break;
      case 'service': feel.add('good', null); break;
      case 'service-done': feel.add('unlock', null); notice(e.message); break;
      // Invasions: one line each, and only when something changes.
      case 'invader': notice(e.message); break;
      case 'wall-siege': feel.add('interrupt', '#meter-integrity', 'SIEGE'); notice(e.message); break;
      case 'jack-in': feel.add('jackin', null); shell.glitch?.(); break;
      case 'run-start': feel.add('jackin', null); shell.glitch?.(); break;
      case 'jacked-out': feel.add('hangup', null); break;
      case 'station': feel.numbers(); break; // LANTERN on the radio (the pager carries the text)
      case 'wall-breach': feel.add('hurt', '#meter-integrity', 'BREACH'); notice(e.message, true); break;
      case 'invasion-cleared': if (!won) { feel.add(e.blocked ? 'good' : 'win', MINE); notice(e.message); } break;
      case 'degraded': flash('REBOOTED · DEGRADED'); notice(e.message, true); if (module === 'combat') setTimeout(() => { if (!active(campaign)) go('map'); }, 1800); break;
      case 'rebooted': feel.add('unlock', MINE); notice(e.message); break;
      case 'encrypt': art.hit(e.source, 'attack'); flash('ENCRYPTED'); feel.add('encrypt', MINE, `+${e.amount}/cycle`); break;
      case 'encrypted': feel.add('drain', MINE, `−${e.amount}`); break;
      case 'decrypted': flash('DECRYPTED'); feel.add('unlock', MINE, 'KEY'); break;
      case 'blind': flash('BLINDED'); feel.add('blind', '.board', null); break;
      case 'armor': art.hit(e.target, 'chit'); impact(e.target, false, true); feel.add('chit', row(e.target), 'CRACKED', { size: 1.1 }); if (fx) feel.add(() => { juice.shatter(e.target); juice.punch(0.35); }); break;
      case 'patch': feel.add('patch', row(e.target), '+◆'); break;
      case 'xp': feel.add('cycle', '#meter-level', `+${e.amount} XP`); break;
      case 'level-up': case 'server-level': {
        if (won) break;
        const [t, ...rest] = e.message.split('. ');
        levelUp(t.replace(/\.$/, ''), rest.join('. '));
        feel.add('win', e.type === 'level-up' ? '#meter-level' : null);
        break;
      }
      case 'heal': feel.add('good', MINE, e.amount ? `+${e.amount}` : null); break;
      case 'blocked': feel.add('interrupt', MINE, 'BLOCKED'); break;
      case 'trap': flash('CANARY TRIPPED'); feel.add('hurt', null, `−${e.amount}`); break;
      case 'interrupt': feel.add('interrupt', row(e.target), 'DELAYED'); break;
      case 'warning': feel.add('nope', '#command-form'); break;
      case 'scan': art.hit(e.target); flash(e.message.split('.')[0].toUpperCase()); feel.add('good', row(e.target), 'WEAK'); break;
      case 'trace': feel.add('good', MINE, '+trace'); break;
      case 'proc': feel.add('good', null); break;
      case 'resolved': feel.add(e.auto === 'daemon' ? 'daemon' : 'cycle', e.auto === 'daemon' ? '.byou' : '.bnow'); break;
      case 'hold': feel.add('cycle', '.bnow'); break;
      case 'loot': break; // the break already said it
      case 'net-good': feel.add(/unlocked|forced/.test(e.message) ? 'unlock' : /^pulled/.test(e.message) ? 'pickup' : 'good', null); break;
      case 'located': case 'upgrade': feel.add('unlock', null); break;
      case 'lead': case 'loadout': feel.add('good', null); break;
      case 'intrusion': feel.add('hurt', null); break;
      // Mail: contracts and the Halcyon retainer.
      // Mail, the board, contracts ready, the retainer and flags go to the pager (see pagerReact).
      case 'contract-done': feel.add('unlock', null); notice(e.message); break;
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
      case 'outpost-siege': feel.add('prewarn', null); break;
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
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return;
  history = [text, ...history.filter((h) => h !== text)].slice(0, 40);
  historyIndex = -1;

  // Ability names win over page names during a fight ("trace" is both).
  const fighting = active(shown());
  const page = ALIAS[text] || text;
  if (NAV.includes(page) && !(fighting && ABILITIES[text])) { if (page === 'loadout') loadoutTab = text === 'talents' ? 'talents' : text === 'skills' ? 'skills' : 'protocols'; return go(page); }
  if (text === 'shell' || text.startsWith('shell ')) return shellCommand(text.slice(6).trim());
  if (text === 'casing on' || text === 'casing off') { campaign.settings.casing = text === 'casing on'; save(); dirty = true; return; }
  if (text === 'tips on' || text === 'tips off' || text === 'tips replay') {
    if (text === 'tips replay') { campaign.settings.seen = {}; campaign.settings.tips = true; }
    else campaign.settings.tips = text === 'tips on';
    hideTip(false); save(); dirty = true;
    return notice(text === 'tips replay' ? 'Tips will show again as you meet things.' : `Tips ${campaign.settings.tips ? 'on' : 'off'}.`);
  }
  if (text === 'music on' || text === 'music off') { campaign.settings.music = text === 'music on'; save(); dirty = true; return notice(`Music ${text.slice(6)}.${campaign.settings.sound ? '' : ' (Sound is off.)'}`); }
  if (text === 'radio on' || text === 'radio off') { campaign.settings.radio = text === 'radio on'; save(); dirty = true; return notice(`Radio chatter ${text.slice(6)}.${campaign.settings.sound ? '' : ' (Sound is off.)'}`); }
  if (text === 'radio test') return feel.radioTest();
  if (text === 'window on' || text === 'window off') { campaign.settings.window = text === 'window on'; save(); dirty = true; return notice(`Window ${text.slice(7)}.`); }
  if (text.startsWith('weather')) { const w = text.split(' ')[1]; outside.force(w === 'auto' ? null : w); return notice(`Weather: ${w && w !== 'auto' ? w : 'follows the clock'}.`); }
  if (text === 'reset game' || text === 'new game') return resetGame();
  if (text === 'help') return notice('Fight: spike and your class\'s skills (keys 1–8), hold, now. Runs: ls, cd, cat, pull, unlock, jack out. Protocols: load, unload, scrap, compile. Services: install, uninstall, cancel install. Wall: jack in (fight the invader at your wall). Pages: map, server, protocols, loadout, daemons, system. Screen: shell immersive|plain|boot. Start over: reset game.');
  if (text.startsWith("'") || text.startsWith('say ')) return notice('Chat arrives with co-op. For now it is just you and the virus.');

  const wasAlert = campaign.encounter?.phase === 'alert';
  const queuedBefore = campaign.encounter?.queue;
  let events = play(campaign, text);
  react(events);
  const warning = events.findLast((e) => e.type === 'warning');
  // In a fight, an order you enter goes now: the cycle turns without waiting out the bar.
  const e = campaign.encounter;
  if (fighting && !warning && active(campaign) && !e.paused && e.queue && e.queue !== queuedBefore) { const more = command(campaign, 'now'); react(more); events = [...events, ...more]; }
  if (warning) notice(warning.message, true, warning.suggest);
  else {
    const info = events.find((e) => e.type === 'contract-done') || events.findLast((e) => ['info', 'repair', 'daemon-set', 'gear', 'drop', 'service', 'service-done', 'code'].includes(e.type));
    if (info) notice(info.message);
  }
  // (a connect or hang-up has its own sound, so the channel change stays quiet)
  if ((wasAlert || events.some((e) => e.type === 'jack-in' || e.type === 'engage')) && active(campaign)) go('combat', events.some((e) => e.type === 'jack-in'));
  else if (events.some((e) => e.type === 'run-start')) go('net', true);
  else if (events.some((e) => e.type === 'jacked-out')) go('map', true);
  else if (campaign.run && module !== 'net' && events.some((e) => e.type.startsWith('net'))) go('net');
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
  // Contextual tabs only exist while there is something there.
  if (name === 'combat' && !active(campaign) && !(campaign.encounter && campaign.encounter.mode === 'run')) name = 'map';
  if (name === 'net' && !campaign.run) name = 'map';
  // Stepping away from a live fight pauses it; coming back picks it up again.
  const leaving = module === 'combat' && name !== 'combat' && active(campaign) && !campaign.encounter.paused;
  if (leaving) { campaign.encounter.paused = true; campaign.encounter.autoPaused = true; notice('Fight paused.'); }
  if (name === 'combat' && active(campaign) && campaign.encounter.autoPaused) { campaign.encounter.paused = false; campaign.encounter.autoPaused = false; }
  if (name !== module && !quiet) feel.add('channel', null);
  if (name !== 'combat') hideSpoils();
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
  const exploring = s === campaign && campaign.run && !active(campaign);
  suggestionList = text.trim() ? (exploring ? runSuggestions(s, text) : suggestions(s, text)).filter((x) => x !== text.trim()).slice(0, 8) : [];
  suggestionIndex = -1;
  const box = $('suggestions');
  box.hidden = !suggestionList.length;
  box.innerHTML = suggestionList.map((x, i) => `<button type="button" role="option" data-suggestion="${V.esc(x)}" aria-selected="${i === suggestionIndex}">${V.esc(x)}</button>`).join('');
}

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
  // Uplink only means something during a home fight.
  const tracing = !s.run && s.encounter && s.encounter.mode !== 'run' && s.encounter.phase !== 'alert';
  $('uplink-label').parentElement.hidden = !tracing;
  if (tracing) {
    $('uplink-label').textContent = 'Uplink';
    $('uplink-value').textContent = s.encounter.trace + '%';
  }
  // Fight and Run tabs appear only while there is a fight or a run.
  $('tab-combat').hidden = !active(campaign);
  $('tab-net').hidden = !campaign.run;
  document.body.classList.toggle('ctx-tabs', active(campaign) || !!campaign.run);
  $('combat-dot').hidden = !active(campaign) || module === 'combat';
  const unreadMail = (campaign.mail?.list || []).filter((m) => !m.read).length;
  $('mail-count').hidden = !unreadMail;
  $('mail-count').textContent = unreadMail;
  $('tab-store').hidden = !boardOpen(campaign);
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
  $('haptics').setAttribute('aria-pressed', String(!!campaign.settings.haptics));
  $('motion').setAttribute('aria-pressed', String(campaign.settings.motion));
  document.body.classList.toggle('no-motion', !campaign.settings.motion);
}

function render(force = false) {
  if (force) cache.clear();
  renderMeters();
  shell.apply(module);
  const combatLike = module === 'combat';
  const s = shown();
  const hasFight = !!s.encounter;
  $('combat-view').hidden = !(combatLike && hasFight);
  $('page-view').hidden = combatLike && hasFight;
  if (combatLike && hasFight) {
    put('hud', V.hudMarkup(s));
    // A new cycle: remember where every chip was, so the board can move them instead of jumping.
    const cycleKey = s.encounter.virus.id + ':' + s.encounter.cycle;
    const turned = shownCycle && shownCycle !== cycleKey && shownCycle.startsWith(s.encounter.virus.id + ':') && canMove();
    const before = turned ? chipSnapshot() : null;
    put('board', V.boardMarkup(s, selected));
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
    put('page-view', V.mapMarkup(campaign, mapSel));
  } else if (module === 'net') {
    const before = cache.get('page-view');
    const lines = $('term')?.children.length;
    put('page-view', V.netMarkup(campaign));
    if (cache.get('page-view') !== before && $('term')) {
      if (lines !== undefined && before !== undefined) shell.typeIn($('term'), $('term').children.length - lines);
      $('term').scrollTop = $('term').scrollHeight;
    }
  } else {
    const pages = { map: (x) => V.mapMarkup(x, mapSel), loadout: (x) => V.loadoutMarkup(x, archView, loadoutTab), craft: (x) => V.craftMarkup(x, compileFocus), mail: (x) => V.mailMarkup(x, mailSel), store: (x) => V.storeMarkup(x, Date.now()), server: (x) => V.serverMarkup(x, Date.now()), daemons: V.daemonsMarkup, system: V.systemMarkup };
    put('page-view', (pages[module] || pages.map)(campaign));
  }
  if (module === 'net' && campaign.run) {
    rain.mount($('page-view'));
    rain.mood({ tension: Math.max(0, 1 - campaign.run.integrity / campaign.run.max), hot: campaign.encounter?.mode === 'run' });
  } else rain.stop();
  const netTray = module === 'net' && !!campaign.run;
  $('tray').hidden = !(combatLike || netTray);
  $('tray').classList.toggle('net-tray', netTray);
  put('tray', netTray ? V.netTrayMarkup(nextActions(campaign)) : V.trayMarkup(s));
  renderPrompt();
  placeTip();
  dirty = false;
}

// On a run the prompt itself carries Signal and where you are.
function renderPrompt() {
  const el = document.querySelector('.prompt');
  const r = campaign.run;
  if (r) {
    el.className = 'prompt run ' + V.signalLevel(r);
    el.innerHTML = `<span class="p-sig">[${r.integrity}/${r.max}]</span> <span class="p-loc">${V.esc(currentLocation(campaign).id)}:</span><span class="p-cwd">${V.esc(r.cwd)}$</span>`;
    $('command-input').placeholder = '';
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

// ---------- clock ----------
let last = performance.now();
let lastSecond = 0;
function frame(now) {
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
  if (dirty) render();
  else tickUi();
  feel.flush();
  checkTips(now);
  shell.caret();
  if (now - lastSecond >= 1000) {
    lastSecond = now; shell.second(module); services();
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
  const payBtn = e.target.closest('[data-pay]');
  if (payBtn && !payBtn.disabled && !e.target.closest('#pay')) { payOpen(payBtn); return; }
  const cmd = e.target.closest('[data-command]');
  if (cmd && !cmd.disabled) {
    // Irreversible buttons (scrapping good gear) ask with a second click.
    if (cmd.dataset.confirm && !(cmd.armed > Date.now())) { cmd.armed = Date.now() + 3000; cmd.dataset.label ||= cmd.textContent; cmd.textContent = cmd.dataset.confirm; setTimeout(() => { if (cmd.isConnected) cmd.textContent = cmd.dataset.label; }, 3000); return; }
    if (cmd.classList.contains('ability')) { $('command-input').value = cmd.dataset.command; $('command-input').focus(); return; }
    return run(cmd.dataset.command);
  }
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
  const node = e.target.closest('[data-select]');
  if (node) { mapSel = node.dataset.select; dirty = true; return; }
  const mail = e.target.closest('[data-mail]');
  if (mail) { mailSel = mail.dataset.mail; if (mailSel[0] === 'l') { command(campaign, 'mail read ' + mailSel.slice(1)); save(); } dirty = true; }
});

$('command-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('command-input');
  const value = suggestionIndex >= 0 ? suggestionList[suggestionIndex] : input.value;
  input.value = '';
  $('suggestions').hidden = true;
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
    return;
  }
  if (suggestionIndex >= 0 && e.key !== 'Enter') suggestionIndex = -1;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (!history.length) return;
    e.preventDefault();
    historyIndex = Math.max(-1, Math.min(history.length - 1, historyIndex + (e.key === 'ArrowUp' ? 1 : -1)));
    input.value = historyIndex < 0 ? '' : history[historyIndex];
    $('suggestions').hidden = true;
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
  const g = e.target.closest('[data-go]');
  if (!g) return;
  const [where, what] = g.dataset.go.split(':');
  setComms(false);
  if (where === 'mail') { if (what) mailSel = what; go('mail'); }
  else if (where === 'store') go('store');
  else if (where === 'map') { if (what) mapSel = what; go('map'); }
  else if (where === 'jack') run('jack in');
});
document.addEventListener('click', (e) => { if (commsOpen && !e.target.closest('#comms, #pager')) setComms(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && commsOpen) { setComms(false); } });

// The Craft page's protocol recipe picker.
document.addEventListener('change', (e) => {
  if (e.target.matches?.('[data-focus-select]')) { compileFocus = e.target.value || null; dirty = true; }
});

document.addEventListener('keydown', (e) => {
  const node = e.target.closest?.('[data-select]');
  if (node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mapSel = node.dataset.select; dirty = true; }
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
