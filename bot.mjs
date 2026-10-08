// A scripted player from a fresh save to a target level, through the real commands (play/command),
// on a simulated clock. It checks the loop holds together: what you fight, how XP arrives, how long
// each level takes, and where it runs dry. A policy, not a person: it plays the planner from
// balance.mjs, explores every room, takes every file but bait, and opens every vault. It plays by
// the current rules: it frees memory by detaching finished servers, waits out the reconnect timer,
// jacks in to invasions that reach the wall, and installs relays on servers it takes over.
// node bot.mjs [class] [targetLevel] [seed]
import { topUpCost, installBlock, tickServices, fresh, command, resolveCycle, active, hooks, hackerLevel, idleRegen, maxSignal, addLocation, finish, loaded, rigOf, stashItem, slotCount, loadedOn } from './dist/combat.mjs';
import { RARITY_ORDER, SLOT_KINDS, groupOf, SERVICES } from './dist/gear.mjs';
import { play, layoutOf, currentLocation, signalNow, takeable, CORE, residentBonus } from './dist/run.mjs';
import { relockLeft, relocks } from './dist/rogue.mjs';
import { joinCost, memoryCost, isLive } from './dist/memory.mjs';
import { items } from './dist/hidden.mjs';
import { procOf, procIn } from './dist/root.mjs';
import { sweepPuzzle, sweepFile } from './dist/forensics.mjs';
import { eventsOf, CARDS } from './dist/events.mjs';
import { BUILDINGS, buildBlock } from './dist/outpost.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { tickPlay } from './dist/progression.mjs';
import { offers, openContracts, heldCount, ready, MAIL } from './dist/mail.mjs';
import { POLICIES } from './balance.mjs';
import { CONFIG, STRAINS, FAMILIES, GUARDS, power } from './dist/data.mjs';

// gearRule: 'rarity' (the highest rarity, then the highest level) or 'stats' (what an item adds: its Damage
// as a share of your hit, its Signal as a share of your max, small weights for the rest, 3% for an effect).
// trace: per-level records for the progression measures (docs/progression.md): fights, wins, rest, XP by
// kind, drops, gold repeats, upgrades and their size, what is worn at each level, and how long uniques stay on.
export function simulate({ cls = 'breaker', target = 10, seed = 7, netSeed = null, cycleSec = 12, cmdSec = 3, log = false, contracts = true, spend = 'none', gearRule = 'rarity', trace = false, capHours = 72 } = {}) {
  let t = 1_700_000_000_000;
  hooks.now = () => t;
  const s = fresh();
  s.seed = seed; s.rng = seed * 2654435761 >>> 0;
  s.netSeed = (netSeed ?? (seed * 40503 + 977)) >>> 0; // its network's signature (network.mjs): a seed of its own, or one from the play seed
  s.tutorialCompleted = true;
  s.loadout.archetype = cls;
  const policy = POLICIES[cls[0].toUpperCase() + cls.slice(1)];
  const stats = { fights: {}, wins: 0, losses: 0, xp: {}, levelAt: { 1: 0 }, runs: 0, vaults: 0, events: {}, crashes: 0, mins: 0, drops: {}, firstAt: {}, bountyLosses: 0, did: { run: 0, rogue: 0, sprawl: 0, sprawlOverLevel: 0 } };
  const seen = new Set(), losses = {};
  // The ledger: what came in, by where it came from (positive changes only; the bot spends nothing but code on contracts).
  const purse = () => ({ credits: s.server.credits, code: ['cipher', 'worm', 'kernel'].reduce((n, k) => n + (s.materials?.[k] || 0), 0), exploit: s.materials?.exploit || 0, salvage: (s.salvage || []).length });
  const ledger = (stats.ledger = {}), byLevel = (stats.byLevel = {});
  const book = (why, fn) => { const a = purse(); const r = fn(); const b = purse(); for (const k in a) if (b[k] > a[k]) { const row = (ledger[why] ||= {}); row[k] = (row[k] || 0) + b[k] - a[k]; } return r; };
  const wait = (sec) => book('idle', () => { for (let left = sec; left > 0; left -= 30) { const d = Math.min(30, left) * 1000; t += d; idleRegen(s, d); for (const e of [...tickNetwork(s, t), ...tickServices(s, t)]) note(e); } });
  const per = (stats.per = {}), here = () => (per[hackerLevel(s)] ||= { fights: 0, wins: 0, rest: 0, xp: {}, drops: {}, gold: 0, goldDup: 0, effectDrops: 0, upgrades: [], effectUps: 0 });
  const seenZd = new Set();
  let collected = null;
  const note = (e) => {
    stats.events[e.type] = (stats.events[e.type] || 0) + 1;
    if (trace && e.type === 'collected') collected = e.unique;
    if (trace && e.type === 'behind') { const h = here(); h.behind = (h.behind || 0) + e.amount; }
    if (trace && e.type === 'xp') { const x = here().xp, k = e.kind || 'other'; x[k] = (x[k] || 0) + e.amount; }
    if (trace && e.type === 'drop' && e.item) {
      const h = here(), it = e.item; h.drops[it.rarity] = (h.drops[it.rarity] || 0) + 1;
      if (it.unique || it.zeroDay) { h.gold++; h.effectDrops++; const dup = it.unique ? collected !== it.unique : seenZd.has(it.zeroDay); if (dup) h.goldDup++; if (it.zeroDay) seenZd.add(it.zeroDay); }
      else if (it.rule) h.effectDrops++;
      collected = null;
    }
    if (e.type === 'drop' && (e.item || e.rarity)) { const r = e.rarity || e.item.rarity; stats.drops[r] = (stats.drops[r] || 0) + 1; stats.firstAt[r] ??= Math.round((t - 1_700_000_000_000) / 60000); }
    if (e.type === 'xp') { const why = (e.message.split('·')[1] || 'other').trim().replace(/[0-9]+/g, '#').replace(/ on .*/, '').replace(/\.$/, ''); stats.xp[why] = (stats.xp[why] || 0) + e.amount; }
  };
  const say = (text) => { const ev = play(s, text) || []; ev.forEach(note); t += cmdSec * 1000; return ev; };
  const lvlCheck = () => { const L = hackerLevel(s); for (let l = 2; l <= L; l++) if (stats.levelAt[l] == null) { stats.levelAt[l] = Math.round((t - 1_700_000_000_000) / 60000); byLevel[l] = JSON.parse(JSON.stringify(ledger)); if (trace) { const g = loaded(s), spike = 25 * power(l); (stats.worn_at ||= {})[l] = { uniques: g.filter((x) => x.unique).length, effects: g.filter(effectOf).length, slots: g.length, dmg: Math.round((g.reduce((n, x) => n + (x.stats.damage || 0), 0) / spike) * 100) / 100, sig: Math.round((g.reduce((n, x) => n + (x.stats.signal || 0), 0) / maxSignal(s)) * 100) / 100 }; } if (log) console.log(`level ${l} at ${stats.levelAt[l]} min`); } };
  const fightKey = () => { const v = s.encounter.virus; return (v.strain ? STRAINS[v.strain].name : (FAMILIES[v.family] || GUARDS[v.family]).name) + (v.grade > 1 ? ` v${v.grade}` : ''); };
  const fight = () => {
    if (!s.encounter || (s.encounter.phase !== 'alert' && !active(s))) return; // a finished fight still on screen
    if (s.encounter.phase === 'alert') command(s, 'engage');
    const key = fightKey(), where = s.run?.loc, v = s.encounter.virus, at = trace ? here() : null;
    if (at) at.fights++;
    stats.fights[key] = (stats.fights[key] || 0) + 1;
    // The fight mix by your level: grey (10+ levels under you) vs strains and ICE (the fights with a rule).
    const mix = ((stats.mix ||= {})[hackerLevel(s)] ||= { fights: 0, grey: 0, special: 0 });
    mix.fights++; if (v.level - hackerLevel(s) <= -10) { mix.grey++; const k = (s.encounter.mode) + (s.encounter.zone ? ":zone" : "") + (s.encounter.wild ? ":wild" : "") + (s.encounter.outpost ? ":outpost" : "") + (s.encounter.infest ? ":infest" : "") + (s.encounter.fleet ? ":fleet" : "") + (s.encounter.invader ? ":inv" : "") + (s.run?.loc ? ":" + s.run.loc : ""); (stats.greyBy ||= {})[k] = ((stats.greyBy ||= {})[k] || 0) + 1; } if (v.strain || ['tracer', 'bouncer'].includes(v.family)) mix.special++;
    for (let n = 0; n < 80 && active(s); n++) {
      const text = policy(s) || 'hold';
      if (s.encounter.sync && s.encounter.virus.parts.some((p) => p.syncOnly && p.integrity > 0)) s.encounter.synced = text !== 'hold';
      // Infiltrator Surprise: a player fires into the first cycle's blue window.
      if (s.encounter?.sync?.surprise) s.encounter.synced = text !== 'hold';
      (command(s, text) || []).forEach(note);
      (resolveCycle(s) || []).forEach(note);
      t += cycleSec * 1000;
    }
    if (active(s)) finish(s, 'defeat');
    const r = s.reports.at(-1);
    if (r?.result === 'victory') { stats.wins++; if (at) at.wins++; } else { stats.losses++; if (where) losses[where + '@' + hackerLevel(s)] = (losses[where + '@' + hackerLevel(s)] || 0) + 1; if (openContracts(s).some((c) => c.type === 'bounty' && c.name === v.name)) stats.bountyLosses++; if (log) console.log('lost to', key); }
    if (s.encounter && !active(s)) command(s, '');
    lvlCheck();
  };
  const restUp = () => { // rest until Signal is full and the server mostly repaired (or pay for it)
    if (spend !== 'none' && !s.run && !active(s)) {
      const before = s.server.credits;
      if (topUpCost(s, 'signal') && s.server.credits >= topUpCost(s, 'signal') + 50) command(s, 'top up');
      if (s.server.integrity > 0 && s.server.integrity < s.server.max * 0.8 && s.server.credits >= topUpCost(s, 'server') + 50) command(s, 'repair');
      (stats.spent ||= {}).topup = (stats.spent.topup || 0) + before - s.server.credits;
    }
    let n = 0; const t0 = t; while ((signalNow(s) < maxSignal(s) || s.server.integrity < s.server.max * 0.3) && n++ < 400) wait(10);
    stats.restMins = (stats.restMins || 0) + (t - t0) / 60000;
    if (trace) here().rest += (t - t0) / 60000;
    if (s.server.integrity <= 0) { stats.crashes++; command(s, 'reboot'); }
  };
  // Gear like a player: the best item in each slot (rarity, then level); deconstruct the rest.
  const effectOf = (it) => !!(it.unique || it.zeroDay || it.rule);
  const hitNow = () => 25 * power(hackerLevel(s)) + loaded(s).reduce((n, x) => n + (x.stats.damage || 0), 0);
  const W = { crit: 0.004, critDamage: 0.001, accuracy: 0.002, echo: 0.004, payload: 0.001, regen: 0.01, reduction: 0.01, evasion: 0.004, sanitize: 0.001, restore: 0.001, leech: 0.005, clock: 0.002, stealth: 0.001, sync: 0.001, scavenge: 0.0005 };
  const worth = (it, hit = hitNow(), sig = maxSignal(s)) => (it.stats.damage || 0) / hit + (it.stats.signal || 0) / sig + Object.entries(it.stats).reduce((n, [k, v]) => n + (W[k] || 0) * v, 0) + (effectOf(it) ? 0.03 : 0);
  const value = gearRule === 'stats' ? (it) => worth(it) : (it) => RARITY_ORDER.indexOf(it.rarity) * 100 + it.level;
  const judged = new Set(), wornSince = {};
  // An upgrade: a drop that beats the weakest item in its slot by the rule. Its size: the larger of the Damage
  // it adds as a share of your hit and the Signal it adds as a share of your max.
  const judge = (it, old) => {
    if (!trace || judged.has(it.id)) return;
    judged.add(it.id);
    if (old && value(it) <= value(old)) return;
    const hit = hitNow(), sig = maxSignal(s), d = (k) => (it.stats[k] || 0) - (old?.stats[k] || 0);
    here().upgrades.push(Math.round(Math.max(d('damage') / hit, d('signal') / sig) * 1000) / 10);
    if (effectOf(it) && !(old && effectOf(old))) here().effectUps++;
  };
  const wear = () => {
    if (!trace) return;
    const on = new Set(loaded(s).filter((x) => x.unique).map((x) => x.id)), L = hackerLevel(s), now = t;
    for (const id of on) wornSince[id] ??= { L, t: now };
    for (const [id, w] of Object.entries(wornSince)) if (!on.has(id)) { (stats.worn ||= []).push({ levels: L - w.L, mins: Math.round((now - w.t) / 60000) }); delete wornSince[id]; }
  };
  const gearUp = () => {
    if (s.run || active(s)) return;
    for (const it of [...(s.stash || [])].filter((x) => !loadedOn(s, x.id))) { const kind = groupOf(it), slots = SLOT_KINDS.slice(0, slotCount(s)).map((k, i) => (k === kind ? i : -1)).filter((i) => i >= 0); if (!slots.length) continue; const w = slots.map((i) => rigOf(s)[i] && stashItem(s, rigOf(s)[i])).sort((a, b) => (a ? value(a) : -1) - (b ? value(b) : -1))[0]; judge(it, w || null); }
    for (const it of [...(s.stash || [])].sort((a, b) => value(b) - value(a))) {
      if (loadedOn(s, it.id)) continue;
      const kind = groupOf(it);
      const slots = SLOT_KINDS.slice(0, slotCount(s)).map((k, i) => (k === kind ? i : -1)).filter((i) => i >= 0);
      if (!slots.length) { command(s, 'deconstruct ' + it.id); continue; }
      const worst = slots.map((i) => [i, rigOf(s)[i] && stashItem(s, rigOf(s)[i])]).sort((a, b) => (a[1] ? value(a[1]) : -1) - (b[1] ? value(b[1]) : -1))[0];
      if (!worst[1]) command(s, 'load ' + it.id);
      else if (value(it) > value(worst[1])) { command(s, 'unload ' + worst[1].id); command(s, 'load ' + it.id); }
      else command(s, 'deconstruct ' + it.id);
    }
    for (const it of [...(s.stash || [])]) if (!loadedOn(s, it.id)) command(s, 'deconstruct ' + it.id);
    wear();
  };
  const homeFight = () => { if (!s.run && s.encounter && s.encounter.mode !== 'run') fight(); };
  // Has this server anything left (a guard up, the vault shut, files not taken)? And is it done with:
  // nothing left, no outpost, relay or contract on it?
  // (A LANTERN dead drop needs the broadcast's key: the bot doesn't listen, so it doesn't count.)
  // A Resident that just beat it waits until it calms down (6 hours), like a player would.
  const pending = (loc) => { for (const [d, x] of Object.entries(layoutOf(loc))) { if (x.guard && !loc.state.cleared[d] && !(d === CORE && residentBonus(loc, t) > 0)) return true; if (x.locked && !x.drop && !loc.state.unlocked[d]) return true; } return takeable(loc).some((f) => !loc.state.taken[f] && !/bait/.test(f)); };
  const finished = (loc) => (loc.rogue ? (loc.level || 1) < hackerLevel(s) - 3 : !pending(loc) && !(loc.takenOver && procOf(loc, t))) && isLive(s, loc) && !loc.buildings?.length && !openContracts(s).some((c) => c.loc === loc.id); // a relay has done its pinging: fine to detach
  // A fresh find needs memory: detach the lowest finished server until it fits (or give up).
  const makeRoom = (loc) => {
    if (!loc.fresh || !loc.detached) return true;
    while (!joinCost(s, loc).fits) {
      const old = s.locations.filter(finished).sort((a, b) => (a.level || 1) - (b.level || 1))[0];
      if (!old || s.server.credits < memoryCost(old)) return false;
      const c = s.server.credits; command(s, 'detach ' + old.id); stats.detaches = (stats.detaches || 0) + 1; (stats.spent ||= {}).detach = (stats.spent.detach || 0) + c - s.server.credits;
    }
    return true;
  };
  const runLoc = (loc) => {
    if (relocks(loc) && relockLeft(loc, t)) return false;
    if (!makeRoom(loc)) return false;
    say(`connect ${loc.id}`);
    if (!s.run) return false;
    stats.runs++;
    if (loc.rogue) {
      for (const room of Object.keys(layoutOf(loc)).filter((p) => p !== '/')) { if (!s.run) break; say(`cd ${room}`); say('attack'); fight(); if (s.run) say('cd /'); }
    } else {
      const L = layoutOf(loc), dirs = Object.keys(L).sort((a, b) => a.split('/').length - b.split('/').length);
      if (!L[CORE] && Object.values(L).some((x) => x.locked)) { L[CORE] = { dirs: [], files: [] }; dirs.push(CORE); } // the core opens with the vault: go there last
      for (const d of dirs) {
        if (!s.run) break;
        if (L[d].locked && !loc.state.unlocked[d]) { say(`cd ${d.slice(0, d.lastIndexOf('/')) || '/'}`); say(`unlock ${d.split('/').pop()} ${loc.password}`); }
        if (d === CORE && (residentBonus(loc, t) > 0 || s.run.integrity < s.run.max * 0.7)) continue; // the Resident: fresh, and on a good Signal
        say(`cd ${d}`);
        if (s.encounter?.mode === 'run') fight();
        if (s.run && procIn(loc, d, t)) { say('attack'); fight(); stats.procs = (stats.procs || 0) + 1; } // a log rotation's process (root.mjs)
        if (!s.run || s.run.cwd !== d) continue;
        for (const f of L[d].files || []) if (!/bait/.test(f) && !loc.state.taken[(d === '/' ? '' : d) + '/' + f]) say(`pull ${f}`);
        if (s.encounter?.hunter) fight(); // traced: the hunter came (run.mjs TRACE)
        // A log sweep (forensics.mjs): a player reads it and works it out; the bot gets it on the
        // second try 70% of the time and gives up otherwise.
        if (d === '/' && sweepFile(loc) && !loc.state.sweep?.solved && !sweeps[loc.id]) {
          sweeps[loc.id] = true; const p = sweepPuzzle(loc);
          say(`cat ${sweepFile(loc)}`); t += 60000;
          if (p && rnd() < 0.7) { const wrong = p.suspects.find((x) => x !== p.answer); if (wrong) say(`sweep ${wrong}`); say(`sweep ${p.answer}`); stats.sweeps = (stats.sweeps || 0) + 1; }
        }
        if (L[d].locked) stats.vaults++;
      }
    }
    leave();
    seen.add(loc.id);
    if (loc.takenOver && !loc.relay && items(s).relay) command(s, 'relay ' + loc.id);
    return true;
  };
  // SPRAWL-00 is worth a player's time while its kills still pay at least half (5 levels over its cap).
  const sprawlWorth = () => hackerLevel(s) <= CONFIG.zone.maxLevel + 5;
  const sprawl = () => {
    if (s.zone && relockLeft(s.zone, t)) return false;
    say('connect sprawl');
    if (!s.run) return false;
    const named = (p) => (s.zone?.spawns?.[p]?.bounty ? 0 : 1); // a contract's named target first
    const rooms = Object.keys(layoutOf(currentLocation(s))).filter((p) => p !== '/').sort((a, b) => named(a) - named(b));
    const grey = !sprawlWorth(); // outgrown: only the contract's named target
    for (const room of rooms) { if (!s.run || s.run.integrity < s.run.max * 0.5) break; if (grey && !s.zone?.spawns?.[room]?.bounty) continue; if (stats.bountyLosses >= 2 && s.zone?.spawns?.[room]?.bounty) continue; say(`cd ${room}`); if (/no hostile|empty|nothing/i.test(JSON.stringify(say('attack')))) { say('cd /'); continue; } fight(); if (s.run) say('cd /'); }
    leave();
    return true;
  };
  // An invasion at the wall: jack in and fight it (unless it's far over your level).
  const invasion = () => {
    const inv = s.invasion;
    if (!inv || inv.state === 'travel' || s.run || active(s) || inv.level > hackerLevel(s) + 3) return false;
    const key = inv.id + ':' + (inv.mine || 0); // a pack or pair is a fight per virus: count tries per virus
    if ((tries[key] || 0) >= 2) return false; // lost to it twice: leave it to the wall, like a player would
    tries[key] = (tries[key] || 0) + 1;
    (play(s, 'jack in') || []).forEach(note);
    fight();
    stats.invasions = (stats.invasions || 0) + 1;
    return true;
  };
  // Leaving a run: a hunter on your trace has to be beaten first (run.mjs TRACE). If the fight
  // runs past the bot's cap, it gives up on the run like a player pulling the plug.
  const leave = () => {
    if (s.encounter?.hunter) fight();
    if (s.run?.hunter) { s.encounter = null; s.run.hunter = false; }
    if (s.run) say('jack out');
  };
  const taken = {}, tries = {}, sweeps = {};
  let seedRnd = (seed * 2654435761) >>> 0; const rnd = () => ((seedRnd = (Math.imul(seedRnd, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const mailWork = () => book('contracts', () => {
    if (!contracts || s.run || active(s)) return;
    for (const c of openContracts(s)) {
      if (ready(s, c)) say('mail deliver ' + c.id);
      else if (c.story === undefined && t - (taken[c.id] ?? t) > 90 * 60000) say('mail drop ' + c.id);
    }
    for (const o of [...offers(s)].filter((o) => !o.offBooks && (['kill', 'materials'].includes(o.type) || o.loc || (o.type === 'bounty' && stats.bountyLosses < 2)))) {
      if (heldCount(s) >= MAIL.take) break;
      say('mail accept ' + o.id); taken[o.id] = t;
    }
  });
  // Events (events.mjs): the bot goes after half the couriers and bounties it sees.
  const heard = {};
  const deadDrop = () => {
    if (!CONFIG.leadBase) return false; // a SPRAWL-only run (loop.test.mjs) stays in SPRAWL
    const ev = eventsOf(s).find((e) => e.card === 'courier' && heard[e.id] === undefined); // bounties are two levels up: the bot leaves them
    if (!ev) return false;
    heard[ev.id] = rnd() < 0.5;
    if (!heard[ev.id] || s.run || active(s)) return false;
    say(`event fight ${ev.id}`);
    if (!active(s)) return false;
    fight();
    stats.drops2 = (stats.drops2 || 0) + 1;
    return true;
  };
  let guard = 0, tickAt = t;
  while (hackerLevel(s) < target && guard++ < 20000 && t - 1_700_000_000_000 < capHours * 3600000) {
    book('home', homeFight);
    // The world's clock catches up after each thing it did, in 30-second steps (a logged-on player's
    // ticks: one big jump would play out as time away, with rested XP and away-pace invasions).
    for (let at = Math.max(tickAt, t - 6 * 3600000) + 30000; at <= t; at += 30000) for (const e of [...tickNetwork(s, at), ...tickServices(s, at)]) note(e);
    tickAt = t;
    if (book('invasion', invasion)) continue;
    if (book('runs', deadDrop)) continue;
    tickPlay(s, t - 1_700_000_000_000 - (s.pace?.ms || 0)); // the bot's whole session is active play (Fresh and Behind use it)
    mailWork();
    if (spend === 'all' && !s.run && !active(s) && !s.install) { // build: the cheapest service you can install
      for (const id of Object.keys(SERVICES)) if (!installBlock(s, id)) { const c = s.server.credits; command(s, 'install ' + id); (stats.spent ||= {}).services = (stats.spent.services || 0) + c - s.server.credits; break; }
    }
    if (spend === 'all' && !s.run && !active(s)) { // and a building on a server it holds (outpost.mjs): producers first, the cheapest that fits
      const order = Object.keys(BUILDINGS).sort((x, y) => (BUILDINGS[x].kind === 'producer' ? 0 : 1) - (BUILDINGS[y].kind === 'producer' ? 0 : 1) || BUILDINGS[x].cost.credits - BUILDINGS[y].cost.credits);
      outer: for (const l of s.locations.filter((x) => x.takenOver && !x.build)) for (const id of order) if (!buildBlock(s, l, id, t)) { const c = s.server.credits; command(s, `outpost build ${l.id} ${id}`, t); (stats.spent ||= {}).buildings = (stats.spent.buildings || 0) + c - s.server.credits; break outer; }
    }
    book('deconstruct', gearUp);
    restUp();
    const L = hackerLevel(s);
    const open = (l) => (isLive(s, l) || l.fresh) && !(relocks(l) && relockLeft(l, t));
    const todo = s.locations.filter((l) => !l.rogue && !l.takenOver && open(l) && pending(l) && l.level <= L + 2).sort((a, b) => a.level - b.level)[0];
    const rot = s.locations.filter((l) => procOf(l, t) && open(l) && procOf(l, t).level <= L + 3 && (losses[l.id + '@' + L] || 0) < 2).sort((a, b) => procOf(b, t).level - procOf(a, t).level)[0];
    const rogue = s.locations.filter((l) => l.rogue && !l.farm && open(l) && l.level <= L + 2 && l.level >= L - 3 && (losses[l.id + '@' + L] || 0) < 2).sort((a, b) => b.level - a.level)[0];
    const hunt = contracts && stats.bountyLosses < 2 && openContracts(s).some((c) => c.type === 'bounty' && !c.got);
    let did = false;
    if (hunt) { did = book('sprawl', sprawl); if (did) stats.did.sprawl++; }
    if (!did && todo) { did = book('runs', () => runLoc(todo)); if (did) stats.did.run++; }
    if (!did && rot) { did = book('rotation', () => runLoc(rot)); if (did) stats.did.rotation = (stats.did.rotation || 0) + 1; }
    if (!did && rogue) { did = book('rogue', () => runLoc(rogue)); if (did) stats.did.rogue++; }
    // SPRAWL-00 once you've outgrown it is grey: a player waits out a reconnect timer instead.
    if (!did && sprawlWorth()) { did = book('sprawl', sprawl); if (did) stats.did.sprawl++; }
    if (!did) { const w = t; wait(15); stats.waitMins = (stats.waitMins || 0) + (t - w) / 60000; } // nothing open: the reconnect timers are running
    lvlCheck();
  }
  if (trace) { const L = hackerLevel(s); for (const w of Object.values(wornSince)) (stats.wornOpen ||= []).push({ levels: L - w.L, mins: Math.round((t - w.t) / 60000) }); }
  stats.mins = Math.round((t - 1_700_000_000_000) / 60000);
  stats.killsPerHour = Math.round(stats.wins / (stats.mins / 60));
  stats.gear = loaded(s).map((it) => `${it.rarity}:${it.name} v${it.level}`);
  stats.level = hackerLevel(s);
  stats.locations = s.locations.map((l) => `${l.name} L${l.depth} lv${l.level}${l.rogue ? ' rogue ' + l.rogue.kind : ''}`);
  stats.mail = (s.mail || []).length;
  stats.credits = s.server.credits;
  delete hooks.now;
  return { s, stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cls = 'breaker', target = '10', seed = '7', cycleSec = '12', cmdSec = '3'] = process.argv.slice(2);
  const { stats } = simulate({ cls, target: +target, seed: +seed, cycleSec: +cycleSec, cmdSec: +cmdSec, log: true });
  console.log(JSON.stringify(stats, null, 1));
}
