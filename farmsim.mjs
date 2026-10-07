// Crew balance in the crew dungeon (KESSLER-FARM-00): scripted players, like balance.mjs, but a crew.
// Its own module: it loads run.mjs (connect, cd, the farm's rooms), whose hooks change how a bare sim
// fight in balance.mjs runs. node farmsim.mjs [levels…] prints a table of crews: a full one (tank, healer,
// two damage), and the same without its tank, its healer, its SIGINTs or a damage dealer, and smaller
// crews. The bosses are crew bosses (raid.mjs): docs/bosses.md has what each role does in each phase.
import { fresh, command, resolveCycle, active, addItem, hooks, subOf } from './dist/combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS, chaseStat } from './dist/gear.mjs';
import { SUBS } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { play } from './dist/run.mjs';
import { openFarm } from './dist/rogue.mjs';
import { matesOf } from './dist/crew.mjs';
import { RAID } from './dist/raid.mjs';

// The crew dungeon (KESSLER-FARM-00): you (a subclass, played by the planner) and a sim crew, everyone in
// the same rarity with their subclass's stats (the crew's gear: crew.mjs makeMate). Per seed: the packs,
// then each boss, up to `tries` tries each, everyone rested before a try. Returns, over the boss fights:
// wins and tries (and by boss: wins, tries, average cycles, seeds it was cleared in), the seeds where all
// three fell, your Signal lost in the wins, the lowest anyone in the crew got (a lost try counts as 0), the
// share of fights where someone dipped under 40%, and the share of the Sysop's cycles spent on a heal.
// bots: RAID.bots switches for a crew that ignores a mechanic ({ interrupt: false }: nobody uses SIGINT).
// only: just that boss (the others are cleared by hand), for a quick look.
const HEALS = new Set(['patch', 'multicast', 'heartbeat', 'scrub', 'rollback', 'rebalance', 'hot-standby']);
export function farmScore(you, crew, level, { seeds = 12, rarity = 'tuned', mates = rarity, bots = {}, only = null, tries: most = 4 } = {}) {
  const cls = SUBS[you].cls, was = hooks.now, st = { tries: 0, wins: 0, lost: [], low: [], heals: 0, cycles: 0, fightCycles: [], by: {}, cleared: 0 };
  const botsWere = { ...RAID.bots };
  Object.assign(RAID.bots, bots);
  let t = 1.7e12; hooks.now = () => t;
  try {
    for (let seed = 1; seed <= seeds; seed++) {
      const s = fresh(); s.seed = seed; s.rng = seed * 99; s.tutorialCompleted = true;
      s.hackers = { [cls]: { level, xp: 0 } }; s.loadout.archetype = cls; s.loadout.sub = { [cls]: you };
      for (let k = 0; k < protocolSlots(level); k++) command(s, 'load ' + addItem(s, rollItem(seeded(seed * 100 + k), { level, rarity, group: SLOT_KINDS[k], stat: chaseStat(SUBS[you].chase, k, rarity) })).id);
      const loc = openFarm(s);
      play(s, 'crew sim ' + crew.join(' '));
      for (const x of s.crewSim) x.rarity = mates;
      const back = () => { if (!s.run) { s.server.integrity = s.server.max; s.signal = null; s.lockouts = {}; for (const l of s.locations) l.lockUntil = 0; play(s, 'connect kessler'); } };
      const fight = (room, boss) => {
        back();
        s.run.integrity = s.run.max; for (const c of Object.values(s.run.crew || {})) delete c.signal; // rested
        play(s, 'cd /'); play(s, 'cd ' + room); if (s.run?.cwd !== room) return false; play(s, 'attack');
        let low = 1, n = 0;
        for (; n < 80 && active(s); n++) {
          command(s, planner(s) || 'hold');
          for (const m of [s, ...matesOf(s).filter((m) => m.encounter && m.run.integrity > 0)]) if (subOf(m) === 'sysop') { st.cycles += boss ? 1 : 0; if (boss && HEALS.has(m.encounter.queue?.ability)) st.heals++; }
          resolveCycle(s);
          for (const x of [s, ...matesOf(s).filter((m) => m.encounter)]) if (x.run) low = Math.min(low, Math.max(0, x.run.integrity) / x.run.max);
        }
        const r = s.reports.at(-1), won = r.result === 'victory';
        if (boss) { const b = (st.by[boss] ||= { wins: 0, tries: 0, cycles: 0, cleared: 0 }); b.tries++; b.cycles += n; if (won) b.wins++; }
        if (boss) { st.tries++; if (won) { st.wins++; st.lost.push(100 - (100 * r.endIntegrity) / (s.run?.max || 1)); } st.low.push(won ? low : 0); st.fightCycles.push(n); }
        return won;
      };
      play(s, 'connect kessler');
      // Each boss: up to `most` tries (only: just that one boss; the ones before it are cleared by hand).
      const go = (room, boss) => { if (only && only !== boss) { const sp = loc.spawns?.[room]; if (sp) { sp.alive = false; sp.respawnAt = t + 1e12; } return; } let won = false; for (let i = 0; i < most && !(won = fight(room, boss)); i++); if (won) st.by[boss].cleared++; };
      for (let i = 0; i < 4 && !fight('/intake'); i++);
      go('/intake/racks', 'foreman');
      for (let i = 0; i < 4 && !fight('/cooling'); i++);
      go('/cooling/loop', 'heatsink');
      back(); play(s, 'cd /'); play(s, 'unlock ledger ' + loc.password);
      go('/ledger/core', 'coldwallet');
      if (!only && ['foreman', 'heatsink', 'coldwallet'].every((b) => loc.spawns[{ foreman: '/intake/racks', heatsink: '/cooling/loop', coldwallet: '/ledger/core' }[b]]?.alive === false)) st.cleared++;
      t += 1e9; // the bosses are back
    }
  } finally { hooks.now = was; Object.assign(RAID.bots, botsWere); }
  const avg = (xs) => (xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : 0);
  return { by: st.by, cleared: st.cleared, seeds, wins: st.wins, tries: st.tries, lost: avg(st.lost), low: 100 * avg(st.low), dips: (100 * st.low.filter((x) => x < 0.4).length) / st.low.length, heals: st.cycles ? (100 * st.heals) / st.cycles : null, cycles: avg(st.fightCycles) };
}

// You (a Demolitionist) and crews of two to four: [crewmates, RAID.bots switches].
export const CREWS = {
  'Warden + Sysop (4)': [['warden', 'sysop', 'payload']],
  'no tank (4)': [['sysop', 'payload', 'herder']],
  'no healer (4)': [['warden', 'payload', 'herder']],
  'no SIGINT (4)': [['warden', 'sysop', 'payload'], { interrupt: false }],
  'one damage (4)': [['warden', 'sysop', 'sysop']],
  'Warden + Sysop (3)': [['warden', 'sysop']],
  'Sysop (3)': [['sysop', 'payload']],
  'Warden (3)': [['warden', 'payload']],
  'Sysop (2)': [['sysop']],
};
// The table (markdown) of every crew at these levels, 20 seeds each: each boss's wins over tries, the seeds
// where all three fell within four tries each, and the pressure on the crew.
export function farmTable(levels = [18, 30], seeds = 20, crews = CREWS) {
  let md = '| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n';
  for (const L of levels) for (const [name, [crew, bots]] of Object.entries(crews)) {
    const r = farmScore('demolitionist', crew, L, { seeds, bots });
    const b = (id) => (r.by[id] ? `${r.by[id].wins}/${r.by[id].tries}` : '–');
    md += `| ${L} | ${name} | ${b('foreman')} | ${b('heatsink')} | ${b('coldwallet')} | ${r.cleared}/${r.seeds} | ${r.low.toFixed(0)}% | ${r.dips.toFixed(0)}% | ${r.heals == null ? '–' : r.heals.toFixed(0) + '%'} | ${r.cycles.toFixed(1)} |\n`;
  }
  return md;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const levels = process.argv.slice(2).map(Number);
  console.log(farmTable(levels.length ? levels : undefined));
}
