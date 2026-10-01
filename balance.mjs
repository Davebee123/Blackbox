// Class balance by level: one scripted player per class, at points along the level curve.
// Scripted policies, not people: they check the numbers are in the same league, not that it's fun.
import fs from 'node:fs';
import { fresh, selectEncounter, command, resolveCycle, active, livingParts, attackers, readyIn, intents, alive, part, defender, toIntent, previewDamage, ignoresArmor, addItem, maxSignal, syncServer } from './dist/combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS } from './dist/gear.mjs';
import { ARCHETYPES, SERVER, skillOrder, LOADOUT } from './dist/data.mjs';

const ok = (s, text) => !toIntent(s, text).error;
// Try commands in order; the first one that's valid right now wins.
const first = (s, list) => list.find((c) => c && ok(s, c)) || null;
const landingNow = (s) => intents(s).filter((i) => i.col === 0 && !i.hidden);
// The part to work on: the one whose (visible) attack lands soonest; hidden ones count as due in 2.
const dueOf = (s, p) => (intents(s).find((i) => i.source === p.id && !i.hidden)?.col ?? (p.attack ? 2 : 9));
const soonest = (s) => attackers(s).sort((a, b) => dueOf(s, a) - dueOf(s, b) || b.max - a.max)[0] || livingParts(s)[0];
const bare = (p) => alive(p) && !p.armor;
const HITS = ['zero-day', 'shatter', 'retaliate', 'opening', 'segfault', 'overload', 'backdoor', 'reclaim', 'kill-process', 'spike'];
// A command that breaks this part right now, if there is one.
// Flicker: the Shade is out of phase on odd cycles; a player hits something else then.
const phasedOut = (s, p) => p.phase && s.encounter.cycle % 2 === 1;
function killNow(s, p) {
  if (phasedOut(s, p)) return null;
  for (const id of HITS) {
    const text = id + ' ' + p.id;
    if (!ok(s, text)) continue;
    if ((bare(p) || ignoresArmor(s, id)) && previewDamage(s, id, p) >= p.integrity) return text;
  }
  return null;
}
const armored = (s) => livingParts(s).filter((p) => p.armor > 0);
const burnsOn = (s, p) => s.encounter.burns.filter((b) => b.target === p.id).length;
const helpersOn = (s, p) => s.encounter.helpers.filter((h) => h.target === p.id).length;

// One planner for every class: finish what you can, answer what lands now, strip, then finish.
// Commands a class doesn't have are skipped, so each class plays its own kit.
function planner(s) {
  const now = landingNow(s);
  // Encrypted: the Encryptor holds the key, so it's the next threat whatever its timer says.
  const key = (s.encounter.encrypt > 0 && livingParts(s).find((p) => p.attack?.effect === 'encrypt')) || livingParts(s).find((p) => p.rearm) || (livingParts(s).some((p) => p.kind === 'fragment') && livingParts(s).find((p) => p.attack?.effect === 'replicate')); // a Bouncer's Keyring; a Replicator that keeps spawning
  const t0 = key || soonest(s);
  const t = phasedOut(s, t0) ? livingParts(s).find((p) => !phasedOut(s, p)) || t0 : t0;
  const d = defender(s);
  // 0. A lit proc is free damage: use it.
  const lit = first(s, ['shatter ' + t.id, 'retaliate ' + t.id, 'opening ' + t.id]);
  if (lit && bare(t)) return lit;
  // 1. Break a part that's about to fire, or a bare part before it patches.
  const urgent = [...new Set(now.map((i) => part(s, i.source)))].filter(alive);
  for (const p of [...urgent, ...livingParts(s).filter(bare)]) {
    const k = killNow(s, p);
    if (k) return k;
    const queued = s.encounter.helpers.filter((h) => h.target === p.id).reduce((n, h) => n + h.damage * h.left, 0);
    if (bare(p) && queued >= p.integrity && ok(s, 'kill-switch')) return 'kill-switch';
  }
  // 2. Something lands now that we can't break: answer it.
  const big = now.filter((i) => (i.effect !== 'damage' || i.amount >= 6) && !part(s, i.source)?.phase).sort((a, b) => b.amount - a.amount)[0]; // a Shade in phase: hit it instead
  if (big) {
    const answer = first(s, [
      big.effect === 'damage' && s.encounter.chits === 0 && 'harden',
      'suspend ' + big.source,
      helpersOn(s, part(s, big.source)) && 'jam ' + big.source,
      big.effect === 'damage' && 'firewall',
      big.effect === 'damage' && 'null-route',
      'quarantine ' + big.source,
      big.effect === 'damage' && 'throttle ' + big.source,
      big.effect === 'damage' && 'brace',
      big.effect === 'damage' && helpersOn(s, part(s, big.source)) && 'barrier ' + big.source,
    ]);
    if (answer) return answer;
  }
  // 2b. Heavy encryption: purge it. Low health: patch, or hit back with what you're missing.
  if (s.encounter.encrypt >= 6 && ok(s, 'purge ' + t.id)) return 'purge ' + t.id;
  if (d.integrity < d.max * 0.5) { const h = first(s, ['patch', 'failover', 'reclaim ' + t.id]); if (h) return h; }
  // 3. Work on the next threat: strip its armor with small or spread hits, then finish.
  if (t.armor > 0) {
    return first(s, [
      killNow(s, t),
      armored(s).length >= 2 && 'fork-bomb',
      armored(s).length >= 2 && 'garbage-collect',
      t.armor >= 2 && 'crack ' + t.id,
      t.armor >= 2 && 'botnet ' + t.id,
      burnsOn(s, t) < 3 && 'inject ' + t.id,
      'thermal-runaway ' + t.id,
      'deploy ' + t.id,
      'hook ' + t.id,
      'backdoor ' + t.id,
      'spike ' + t.id,
    ]);
  }
  return first(s, [
    killNow(s, t),
    t.integrity > 40 && readyIn(s, 'overload') <= 1 && (t.patchAt == null || t.patchAt > s.encounter.cycle + 1) && 'exploit ' + t.id,
    burnsOn(s, t) >= 2 && 'detonate ' + t.id,
    t.integrity > 30 && 'tag ' + t.id,
    burnsOn(s, t) < 3 && 'inject ' + t.id,
    'segfault ' + t.id, 'overload ' + t.id, 'backdoor ' + t.id, 'reclaim ' + t.id, 'kill-process ' + t.id,
    'deploy ' + t.id, 'thermal-runaway ' + t.id, 'sudo', 'spike ' + t.id,
  ]);
}

export const POLICIES = {
  'Spike only': (s) => 'spike ' + soonest(s).id,
  Breaker: planner,
  Bastion: planner,
  Infiltrator: planner,
  Operator: planner,
};
const CLASS = { Breaker: 'breaker', Bastion: 'bastion', Infiltrator: 'infiltrator', Operator: 'operator', 'Spike only': 'breaker' };

// Points on the curve: hacker level, server level, deepest guard layer, and whether the tree is filled.
// Services: what a player who installs defensive services as they go would run by then (versions gate at server 10 and 25).
export const BRACKETS = [
  { name: 'Lv 1', level: 1, server: 1, depth: 1, services: {} },
  { name: 'Lv 10', level: 10, server: 10, depth: 1, services: { raid: 1 } },
  { name: 'Lv 18', level: 18, server: 18, depth: 2, services: { raid: 1, kernel: 1 } },
  { name: 'Lv 30', level: 30, server: 30, depth: 2, tree: 'half', services: { raid: 2, kernel: 1, hotpatch: 1, scrubber: 1 } },
  { name: 'Lv 50', level: 50, server: 50, depth: 3, tree: 'full', services: { raid: 3, kernel: 2, hotpatch: 2, scrubber: 2, counter: 2, cron: 1 } },
];

// Talent picks for a filled tree: each tier's first choice (or `picks`), every rank (or `ranks`).
export function build(s, cls, b, opts) {
  s.loadout.archetype = cls;
  s.hackers = { [cls]: { level: b.level, xp: 0 } };
  let xp = 0; for (let l = 1; l < b.server; l++) xp += SERVER.xpToNext(l); s.serverXp = xp;
  const a = ARCHETYPES[cls];
  if (b.tree === 'full') { s.loadout.picks[cls] = [0, 0, 0]; s.loadout.ranks[cls] = Object.fromEntries(a.fillers.flat().map((n) => [n.id, 3])); }
  if (b.tree === 'half') { s.loadout.picks[cls] = [0]; s.loadout.ranks[cls] = Object.fromEntries(a.fillers[0].map((n) => [n.id, 3])); s.loadout.ranks[cls][a.fillers[1][0].id] = 3; }
  if (opts.picks) s.loadout.picks[cls] = opts.picks;
  if (opts.ranks) s.loadout.ranks[cls] = opts.ranks;
  if (opts.extra) s.loadout.equipped[cls] = [...skillOrder(cls).slice(0, 4), opts.extra];
  // Protocols: a Tuned one in every open slot at the bracket's level. Services: the bracket's set.
  if (!opts.noGear) {
    for (let i = 0; i < protocolSlots(b.level); i++) {
      const it = addItem(s, rollItem(seeded(b.level * 100 + i), { level: b.level, rarity: opts.rarity || 'tuned', group: SLOT_KINDS[i] }));
      command(s, 'load ' + it.id);
    }
    s.services = { ...b.services };
  }
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
  selectEncounter(s, key, opts.seed ?? 42, opts.zone ? { mode: 'run', room: '/sim', level: b.level, zone: true } : guard ? { mode: 'run', room: '/sim', level: SERVER.locationLevel(b.level, opts.depth || 1) } : {});
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
  return { win: r.result === 'victory', clean, cycles: r.cycles, lostPct: Math.round(((startHp - r.endIntegrity) / startHp) * 100), uses };
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

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const classes = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
  let md = '# BLACKBOX class balance by level\n\nOne scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 3 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Levels 30 and 50 include talents (30: two ranked nodes maxed and the first tier-1 choice; 50: the whole tree). Everyone loads a Tuned protocol in every open slot (4, 5 at 15, 6 at 30) at their level and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.\n\n';
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
  md += '\nCells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.\n\n## Skill use at level 50\n\n';
  for (const p of classes) {
    const u = summary[p].at(-1).uses, total = Object.values(u).reduce((a, c) => a + c, 0);
    md += `- **${p}:** ${Object.entries(u).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / total) * 100)}%`).join(' · ')}\n`;
  }
  // Unlockables: level 50, each swapped into the fifth slot.
  const top = BRACKETS.at(-1);
  md += '\n## Unlockable skills (level 50, whole tree)\n\nEach one swapped into the fifth slot. Change vs the first five.\n\n| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |\n|---|---|---:|---:|---:|---:|---:|\n';
  for (const p of classes) {
    const cls = CLASS[p], base = summary[p].at(-1);
    for (const id of skillOrder(cls).slice(5)) {
      if (['tap', 'brute-login'].includes(id)) continue;
      const r = score(p, top, { extra: id });
      md += `| ${p} | ${ARCHETYPES[cls].skills.find((x) => x.id === id).name} | ${r.wins}/${r.total} | ${r.lost.toFixed(0)}% | ${(r.lost - base.lost >= 0 ? '+' : '') + (r.lost - base.lost).toFixed(0)} | ${r.cycles.toFixed(1)} | ${(r.cycles - base.cycles >= 0 ? '+' : '') + (r.cycles - base.cycles).toFixed(1)} |\n`;
    }
  }
  // Every full-tree build: all ranks + each combination of choices.
  md += '\n## Every maxed build (level 50, all ranks)\n\n| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |\n|---|---|---:|---|---:|\n';
  for (const p of classes) {
    const cls = CLASS[p], a = ARCHETYPES[cls];
    const rows = [];
    for (let m = 0; m < 8; m++) { const picks = [m & 1, (m >> 1) & 1, (m >> 2) & 1]; const r = score(p, top, { picks }); rows.push({ name: picks.map((x, i) => a.talents[i][x].name).join(' / '), ...r }); }
    rows.sort((x, y) => x.lost - y.lost);
    const [best, worst] = [rows[0], rows.at(-1)];
    md += `| ${p} | ${best.name} | ${best.lost.toFixed(0)}% · ${best.cycles.toFixed(1)} | ${worst.name} | ${worst.lost.toFixed(0)}% · ${worst.cycles.toFixed(1)} |\n`;
  }
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/BALANCE.md', md);
  console.log(md);
}
