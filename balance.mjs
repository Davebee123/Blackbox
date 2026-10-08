// Class balance by level: one scripted player per class, at points along the level curve.
// Scripted policies, not people: they check the numbers are in the same league, not that it's fun.
import fs from 'node:fs';
import { fresh, selectEncounter, command, resolveCycle, active, livingParts, attackers, readyIn, intents, alive, part, defender, toIntent, previewDamage, ignoresArmor, addItem, maxSignal, syncServer, UNIQUES } from './dist/combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS, chaseStat, uniqueItem } from './dist/gear.mjs';
import { ARCHETYPES, SERVER, skillOrder, LOADOUT, STRAINS, SUBS, SUBCLASS, defaultSub, TELL, BOSSES } from './dist/data.mjs';

import { planner, soonest } from './dist/planner.mjs';

export const POLICIES = {
  'Spike only': (s) => 'spike ' + soonest(s).id,
  Breaker: planner,
  Bastion: planner,
  Infiltrator: planner,
  Operator: planner,
};
const CLASS = { Breaker: 'breaker', Bastion: 'bastion', Infiltrator: 'infiltrator', Operator: 'operator', 'Spike only': 'breaker' };

// Points on the curve: hacker level, deepest guard layer, and whether the tree is filled. The server's
// level is the class's (your highest class level); the home-fight services are gone (filters and tiers
// do that job, and these fights are all on your Signal).
export const BRACKETS = [
  { name: 'Lv 1', level: 1, server: 1, depth: 1 },
  { name: 'Lv 10', level: 10, server: 10, depth: 1 },
  { name: 'Lv 18', level: 18, server: 18, depth: 2 },
  { name: 'Lv 30', level: 30, server: 30, depth: 2 },
  { name: 'Lv 50', level: 50, server: 50, depth: 3 },
];

// Talents as a player would have them: a point at 10 and every 2 levels after (LOADOUT), spent in a
// fixed order (rank up a row's first node, take the tier's choice, move down). `tree: 'full'` maxes it.
const fillOrder = (F) => [[F[0][0].id, 3], ['c0'], [F[1][0].id, 3], [F[1][1].id, 1], ['c1'], [F[2][0].id, 3], [F[2][1].id, 2], ['c2'], [F[0][1].id, 3], [F[1][1].id, 2], [F[2][1].id, 1]];
export function build(s, cls, b, opts) {
  s.loadout.archetype = cls;
  s.hackers = { [cls]: { level: b.level, xp: 0 } };
  // From SUBCLASS.from a subclass (opts.sub, else the class's default): its skill line and tree.
  const sub = b.level >= SUBCLASS.from ? opts.sub || defaultSub(cls) : null, key = sub || cls, kit = SUBS[sub];
  if (sub) s.loadout.sub = { [cls]: sub };
  if (!kit) { /* no tree before the subclass */ }
  else if (b.tree === 'full') { s.loadout.picks[key] = [0, 0, 0]; s.loadout.ranks[key] = Object.fromEntries(kit.fillers.flat().map((n) => [n.id, 3])); }
  else {
    let left = b.level < LOADOUT.talentFrom ? 0 : Math.floor((b.level - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1;
    const ranks = {}, picks = [];
    for (const [id, n] of fillOrder(kit.fillers)) {
      if (left <= 0) break;
      if (!n) { picks[+id[1]] = (opts.picks || [0, 0, 0])[+id[1]]; left--; } else { const k = Math.min(n, left); ranks[id] = (ranks[id] || 0) + k; left -= k; }
    }
    s.loadout.picks[key] = picks; s.loadout.ranks[key] = ranks;
  }
  if (opts.picks) s.loadout.picks[key] = opts.picks;
  if (opts.ranks) s.loadout.ranks[key] = opts.ranks;
  if (opts.extra) s.loadout.equipped[key] = [...skillOrder(cls).slice(0, 4), opts.extra];
  if (opts.bar) s.loadout.equipped[key] = [...opts.bar]; // a bar of your own (the press-diversity test puts each unlock on it)
  // Protocols: a Tuned one in every open slot at the bracket's level, except an implant slot below
  // the level implants start to drop (item level 15). From the subclass, each carries the stat its
  // player chases (the subclass's `chase` list in turn: Restore for a Sysop, Payload for a burn or
  // helper class), as a player would build; a white has no affix to carry one. Services: the bracket's set.
  if (!opts.noGear) {
    const rarity = opts.rarity || 'tuned';
    for (let i = 0; i < protocolSlots(b.level); i++) {
      if (SLOT_KINDS[i] === 'implant' && b.level < 15) continue;
      const stat = opts.randomGear ? undefined : chaseStat(kit?.chase, i, rarity);
      const it = addItem(s, rollItem(seeded(b.level * 100 + i + (opts.gearSeed || 0) * 7919), { level: b.level, rarity, group: SLOT_KINDS[i], stat }));
      command(s, 'load ' + it.id);
    }
  }
  // Uniques in place of the blue in their slot (opts.uniques: ids), at the bracket's level: the native-unique check
  // (network.test.mjs) loads each one this way.
  for (const id of opts.uniques || []) { const it = addItem(s, uniqueItem(UNIQUES[id], b.level, seeded(b.level * 7 + 3))); command(s, 'load ' + it.id); }
  syncServer(s);
  s.server.integrity = s.server.max;
}

export function fight(policy, key, b, opts = {}) {
  const s = fresh();
  const cls = CLASS[policy];
  build(s, cls, b, opts);
  s.rng = ((opts.seed ?? 42) * 2654435761 + key.length) >>> 0; // crits and rolls: seeded, so runs repeat
  const guard = opts.mode === 'run';
  if (guard) s.run = { loc: 'sim', cwd: '/', integrity: maxSignal(s), max: maxSignal(s), pack: [], visited: ['/'] };
  const startHp = guard ? s.run.max : s.server.max; // health lost is a share of your own max
  selectEncounter(s, key, opts.seed ?? 42, opts.zone ? { mode: 'run', room: '/sim', level: b.level + (opts.levelUp || 0), zone: true, family: opts.family, grade: opts.grade, strain: opts.strain, ...(opts.mutation !== undefined ? { mutation: opts.mutation } : {}), ...(opts.elite ? { elite: true } : {}), ...(opts.boss ? { boss: opts.boss } : {}) } : guard ? { mode: 'run', room: '/sim', level: SERVER.locationLevel(b.level, opts.depth || 1) } : {});
  if (s.encounter) s.encounter.soft = 1; // measure the class, not SPRAWL's mercy for new players (CONFIG.zone.starterHit)
  command(s, 'engage');
  const uses = {};
  for (let n = 0; n < 80 && active(s); n++) {
    const text = POLICIES[policy](s) || 'hold';
    uses[text.split(' ')[0]] = (uses[text.split(' ')[0]] || 0) + 1;
    command(s, text);
    // Against a Keylogger a player has to fire on the beat; the sim always does (its window opens every cycle).
    if (s.encounter?.sync && s.encounter.virus.parts.some((p) => p.syncOnly && p.integrity > 0)) s.encounter.synced = text !== 'hold';
    // Infiltrator Surprise: a player fires into the first cycle's blue window.
    if (s.encounter?.sync?.surprise) s.encounter.synced = text !== 'hold';
    resolveCycle(s);
  }
  // A fight still going after 80 cycles is a stalemate: count it as a loss.
  const r = s.reports.at(-1) || { result: 'stalemate', cycles: 80, endIntegrity: defender(s).integrity };
  const clean = r.result === 'victory' && !r.attackDamage;
  return { win: r.result === 'victory', clean, cycles: r.cycles, lostPct: Math.round(((startHp - r.endIntegrity) / startHp) * 100), uses, tells: r.tells || null, startHp };
}

// A bracket's fights: 20 random home intrusions at that server level, plus every guard at the deepest layer.
export function score(policy, b, opts = {}) {
  const runs = [
    ...Array.from({ length: 20 }, (_, i) => fight(policy, 'random', b, { ...opts, seed: i + 1, mode: 'run', zone: true })),
    ...['watchdog', 'sentinel', 'crawler', 'shredder'].map((g) => fight(policy, g, b, { ...opts, mode: 'run', depth: b.depth })),
  ];
  const uses = {};
  for (const r of runs) for (const [k, v] of Object.entries(r.uses)) uses[k] = (uses[k] || 0) + v;
  const avg = (xs) => xs.reduce((a, c) => a + c, 0) / xs.length;
  return { wins: runs.filter((r) => r.win).length, total: runs.length, clean: runs.filter((r) => r.clean).length, lost: avg(runs.map((r) => r.lostPct)), cycles: avg(runs.map((r) => r.cycles)), uses };
}

// The fights that should hurt: every strain open at this level, grade 2 wilds, and wilds 2 levels up.
export const strainsAt = (level) => Object.keys(STRAINS).filter((k) => STRAINS[k].from <= level);

// ---------- kits (docs/kits.md): presets, press shares and the sets each build is for ----------
// A bracket at any level (the deepest layer of the nearest one).
export const at = (L) => ({ ...BRACKETS.filter((x) => x.level <= L).at(-1), name: 'Lv ' + L, level: L, server: L });
export const policyOf = (sub) => { const c = SUBS[sub].cls; return c[0].toUpperCase() + c.slice(1); };
// Press shares of a set of fights (holds left out), and effective keys: one over the sum of squared shares,
// Spike and SIGINT included (docs/progression.md).
export function presses(rs) {
  const uses = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.uses || {})) if (k !== 'hold') uses[k] = (uses[k] || 0) + v;
  const total = Object.values(uses).reduce((a, n) => a + n, 0) || 1;
  const share = Object.fromEntries(Object.entries(uses).map(([k, v]) => [k, v / total]));
  return { share, keys: 1 / Object.values(share).reduce((a, x) => a + x * x, 0), spike: share.spike || 0 };
}
// The class-balance fights (score) as a list, for press shares: 20 wilds and the four guards.
export function generic(policy, b, opts = {}) {
  return [...Array.from({ length: 20 }, (_, i) => fight(policy, 'random', b, { ...opts, seed: i + 1, mode: 'run', zone: true })), ...['watchdog', 'sentinel', 'crawler', 'shredder'].map((g) => fight(policy, g, b, { ...opts, mode: 'run', depth: b.depth }))];
}
// The fights each shipped conditional build is for (docs/kits.md section 4, "For"), and a generic set of wilds.
const bossFight = (id) => ({ boss: id, family: BOSSES[id].family, strain: BOSSES[id].strain });
const many = (n, f) => Array.from({ length: n }, (_, i) => f(i));
export const MATCHED = {
  swarm: [...many(6, (i) => ({ family: 'worm', seed: 10 * i })), { strain: 'overrun', seed: 100 }, { guard: 'crawler', seed: 1 }, bossFight('relayking'), bossFight('nb-backorifice')],
  rules: [...many(4, (i) => ({ family: 'ransomware', seed: 10 * i + 3 })), ...many(2, (i) => ({ family: 'ghostroot', seed: 10 * i + 5 })), bossFight('nb-deadbolt'), bossFight('nb-tripmine'), bossFight('nb-mirrorshade')],
  healers: [{ strain: 'patchwork', seed: 300 }, { strain: 'patchwork', seed: 310 }, { strain: 'leech', seed: 400 }, { strain: 'leech', seed: 410 }, bossFight('nb-patchday'), ...many(4, (i) => ({ family: 'worm', seed: 10 * i + 7 }))],
  ghostroot: [...many(6, (i) => ({ family: 'ghostroot', seed: 10 * i + 1 })), bossFight('choir'), bossFight('nb-mirrorshade')],
  hijack: [{ strain: 'patchwork', seed: 300 }, { strain: 'leech', seed: 400 }, bossFight('nb-patchday'), ...many(3, (i) => ({ family: 'ghostroot', seed: 10 * i + 5 })), bossFight('nb-mirrorshade'), { strain: 'echo', seed: 500 }, bossFight('nb-echolalia')],
  evasion: [...many(4, (i) => ({ elite: true, seed: 10 * i + 2 })), { strain: 'bricker', seed: 600 }, { strain: 'extortion', seed: 610 }, { strain: 'floodgate', seed: 620 }, bossFight('nb-deadbolt'), bossFight('nb-tripmine'), bossFight('relayking')],
  guards: ['watchdog', 'sentinel', 'crawler', 'shredder', 'bouncer', 'tracer'].flatMap((g) => [{ guard: g, seed: 1 }, { guard: g, seed: 11 }]),
  generic: [...many(4, (i) => ({ family: 'ransomware', seed: 10 * i + 9 })), ...many(4, (i) => ({ family: 'ghostroot', seed: 10 * i + 9 })), { family: 'worm', seed: 909 }, { family: 'worm', seed: 919 }],
};
// Which set a subclass's shipped conditional build is for.
export const MATCH_OF = { demolitionist: 'swarm', overclocker: 'rules', warden: 'swarm', sysop: 'healers', payload: 'swarm', phantom: 'evasion', herder: 'swarm', hijacker: 'hijack' };
// The solo band per subclass (docs/kits.md 9: per mode, per subclass), in Signal lost on the class-balance fights.
// A subclass leans solo or crew (SUBS[sub].lean). The Bastions lean crew and pay for it alone in pace, not Signal:
// their kills are slow (about twice as many cycles a fight), and they heal or shield it back, so they may sit
// under the band's floor. Every subclass stays under its ceiling.
export const soloBand = (sub) => (sub && SUBS[sub].cls === 'bastion' ? [0, 50] : [15, 50]);
// Average Signal lost (capped at 100) playing a bar over a set, each fight on `seeds` seeds.
export function setScore(sub, b, bar, set, seeds = [1, 2]) {
  const pol = policyOf(sub), rs = [];
  for (const f of set) for (const sd of seeds) {
    const { guard, seed = 0, ...rest } = f;
    rs.push(guard ? fight(pol, guard, b, { sub, bar, seed: seed + sd, mode: 'run', depth: b.depth }) : fight(pol, 'random', b, { sub, bar, mode: 'run', zone: true, mutation: null, ...rest, seed: seed + sd }));
  }
  return { lost: rs.reduce((a, r) => a + Math.min(100, r.lostPct), 0) / rs.length, wins: rs.filter((r) => r.win).length, total: rs.length, rs };
}
export function hardScore(policy, b, opts = {}) {
  const runs = [
    ...strainsAt(b.level).map((strain, i) => fight(policy, 'random', b, { ...opts, seed: 100 + i, mode: 'run', zone: true, strain })),
    ...Array.from({ length: 6 }, (_, i) => fight(policy, 'random', b, { ...opts, seed: 200 + i, mode: 'run', zone: true, grade: 2 })),
    ...Array.from({ length: 6 }, (_, i) => fight(policy, 'random', b, { ...opts, seed: 300 + i, mode: 'run', zone: true, levelUp: 2 })),
  ];
  const avg = (xs) => xs.reduce((a, c) => a + c, 0) / xs.length;
  return { wins: runs.filter((r) => r.win).length, total: runs.length, clean: runs.filter((r) => r.clean).length, lost: avg(runs.map((r) => Math.min(100, r.lostPct))), cycles: avg(runs.map((r) => r.cycles)) };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const classes = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
  let md = '# BLACKBOX class balance by level\n\nOne scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.2 from 30); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.\n\n';
  md += '| Bracket | Spike, no gear | ' + ['Spike only', ...classes].join(' | ') + ' |\n|---|---:|' + ['x', ...classes].map(() => '---:').join('|') + '|\n';
  const summary = {};
  for (const b of BRACKETS) {
    const cells = ['Spike only', ...classes].map((p) => {
      const r = score(p, b);
      (summary[p] ||= []).push(r);
      return `${r.wins}/${r.total} · ${r.clean} clean · ${r.lost.toFixed(0)}% · ${r.cycles.toFixed(1)}c`;
    });
    const ng = score('Spike only', b, { noGear: true });
    md += `| ${b.name} | ${ng.wins}/${ng.total} · ${ng.clean} clean · ${ng.lost.toFixed(0)}% · ${ng.cycles.toFixed(1)}c | ${cells.join(' | ')} |\n`;
  }
  md += '\nCells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.\n\n## The hard slice\n\nEvery strain open at the level, six grade 2 wilds and six wilds two levels up.\n\n| Bracket | ' + classes.join(' | ') + ' |\n|---|' + classes.map(() => '---:').join('|') + '|\n';
  for (const b of BRACKETS) md += `| ${b.name} | ${classes.map((p) => { const r = hardScore(p, b); return `${r.wins}/${r.total} · ${r.lost.toFixed(0)}% · ${r.cycles.toFixed(1)}c`; }).join(' | ')} |\n`;
  // Every subclass, from the level you pick one: the class columns above play each class's default.
  const subs = Object.entries(CLASS).filter(([p]) => p !== 'Spike only').flatMap(([p, cls]) => Object.keys(ARCHETYPES[cls].subs).map((sub) => [p, sub]));
  md += '\n## By subclass\n\nThe same fights for each of the eight subclasses (blues and the bracket\'s talents; the bar is the core four and the line\'s first three). Cells: health lost · wins.\n\n| Bracket | ' + subs.map(([, sub]) => SUBS[sub].name).join(' | ') + ' |\n|---|' + subs.map(() => '---:').join('|') + '|\n';
  for (const b of BRACKETS.filter((x) => x.level >= SUBCLASS.from)) md += `| ${b.name} | ${subs.map(([p, sub]) => { const r = score(p, b, { sub }); return `${r.lost.toFixed(0)}% · ${r.wins}/${r.total}`; }).join(' | ')} |\n`;
  // Tells: the same fights, by a bot that reads them and one that plays as if it can't (TELL.bots.answer false).
  md += '\n## Tells: reading them or not\n\nThe same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.\n\n| Bracket | ' + subs.map(([, sub]) => SUBS[sub].name).join(' | ') + ' | Average gap |\n|---|' + subs.map(() => '---:').join('|') + '|---:|\n';
  for (const b of BRACKETS.filter((x) => x.level >= SUBCLASS.from && x.level <= 30)) {
    const read = subs.map(([p, sub]) => score(p, b, { sub }));
    TELL.bots.answer = false;
    const blind = subs.map(([p, sub]) => score(p, b, { sub }));
    TELL.bots.answer = true;
    const gap = read.reduce((n, r, i) => n + blind[i].lost - r.lost, 0) / read.length;
    md += `| ${b.name} | ${read.map((r, i) => `${r.lost.toFixed(0)}% · ${blind[i].lost.toFixed(0)}% (${r.wins} · ${blind[i].wins})`).join(' | ')} | ${gap.toFixed(1)} |\n`;
  }
  md += '\nTarget (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.\n\n## Skill use at level 50\n\n';
  for (const p of classes) {
    const u = summary[p].at(-1).uses, total = Object.values(u).reduce((a, c) => a + c, 0);
    md += `- **${p}:** ${Object.entries(u).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / total) * 100)}%`).join(' · ')}\n`;
  }
  // Unlockables: level 50, each swapped into the fifth slot.
  const top = BRACKETS.at(-1);
  md += '\n## Unlockable skills (level 50, whole tree)\n\nEach one swapped into the fifth slot. Change vs the first five.\n\n| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |\n|---|---|---:|---:|---:|---:|---:|\n';
  for (const p of classes) {
    const cls = CLASS[p], base = summary[p].at(-1);
    for (const id of skillOrder(cls, defaultSub(cls)).slice(5)) {
      if (['tap', 'brute-login'].includes(id)) continue;
      const r = score(p, top, { extra: id });
      md += `| ${p} | ${ARCHETYPES[cls].skills.find((x) => x.id === id).name} | ${r.wins}/${r.total} | ${r.lost.toFixed(0)}% | ${(r.lost - base.lost >= 0 ? '+' : '') + (r.lost - base.lost).toFixed(0)} | ${r.cycles.toFixed(1)} | ${(r.cycles - base.cycles >= 0 ? '+' : '') + (r.cycles - base.cycles).toFixed(1)} |\n`;
    }
  }
  // Every full-tree build: all ranks + each combination of choices.
  md += '\n## Every maxed build (level 50, all ranks)\n\n| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |\n|---|---|---:|---|---:|\n';
  for (const p of classes) {
    const cls = CLASS[p], a = SUBS[defaultSub(cls)];
    const rows = [];
    for (let m = 0; m < 8; m++) { const picks = [m & 1, (m >> 1) & 1, (m >> 2) & 1]; const r = score(p, top, { picks }); rows.push({ name: picks.map((x, i) => a.talents[i][x].name).join(' / '), ...r }); }
    rows.sort((x, y) => x.lost - y.lost);
    const [best, worst] = [rows[0], rows.at(-1)];
    md += `| ${p} | ${best.name} | ${best.lost.toFixed(0)}% · ${best.cycles.toFixed(1)} | ${worst.name} | ${worst.lost.toFixed(0)}% · ${worst.cycles.toFixed(1)} |\n`;
  }
  // The crew dungeon (farmsim.mjs, loaded last: run.mjs's hooks change how a bare sim fight runs).
  const { farmTable } = await import('./farmsim.mjs');
  md += '\n## Crews in the farm (KESSLER-FARM-00)\n\nYou (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass\'s stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone\'s SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.\n\n' + farmTable();
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/BALANCE.md', md);
  console.log(md);
}
