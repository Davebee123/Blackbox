// Crew balance in the crew dungeon (KESSLER-FARM-00): scripted players, like balance.mjs, but a crew.
// Its own module: it loads run.mjs (connect, cd, the farm's rooms), whose hooks change how a bare sim
// fight in balance.mjs runs. node farmsim.mjs [levels…] prints a table of crews with and without a
// Sysop and a Warden.
import { fresh, command, resolveCycle, active, addItem, hooks, subOf } from './dist/combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS, chaseStat } from './dist/gear.mjs';
import { SUBS } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { play } from './dist/run.mjs';
import { openFarm } from './dist/rogue.mjs';
import { matesOf } from './dist/crew.mjs';

// The crew dungeon (KESSLER-FARM-00): you (a subclass, played by the planner) and a sim crew, everyone in
// the same rarity with their subclass's stats (the crew's gear: crew.mjs makeMate). Per seed: the packs,
// then each boss, up to 4 tries each, everyone rested before a try. Returns, over the boss fights: wins
// and tries, your Signal lost in the wins, the lowest anyone in the crew got (a lost try counts as 0), the
// share of fights where someone dipped under 40%, and the share of the Sysop's cycles spent on a heal.
const HEALS = new Set(['patch', 'multicast', 'heartbeat', 'scrub', 'rollback', 'rebalance', 'hot-standby']);
export function farmScore(you, crew, level, { seeds = 12, rarity = 'tuned', mates = rarity } = {}) {
  const cls = SUBS[you].cls, was = hooks.now, st = { tries: 0, wins: 0, lost: [], low: [], heals: 0, cycles: 0, fightCycles: [] };
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
        if (boss) { st.tries++; if (won) { st.wins++; st.lost.push(100 - (100 * r.endIntegrity) / (s.run?.max || 1)); } st.low.push(won ? low : 0); st.fightCycles.push(n); }
        return won;
      };
      play(s, 'connect kessler');
      for (let i = 0; i < 4 && !fight('/intake'); i++);
      for (let i = 0; i < 4 && !fight('/intake/racks', true); i++);
      for (let i = 0; i < 4 && !fight('/cooling'); i++);
      for (let i = 0; i < 4 && !fight('/cooling/loop', true); i++);
      back(); play(s, 'cd /'); play(s, 'unlock ledger ' + loc.password);
      for (let i = 0; i < 4 && !fight('/ledger/core', true); i++);
      t += 1e9; // the bosses are back
    }
  } finally { hooks.now = was; }
  const avg = (xs) => (xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : 0);
  return { wins: st.wins, tries: st.tries, lost: avg(st.lost), low: 100 * avg(st.low), dips: (100 * st.low.filter((x) => x < 0.4).length) / st.low.length, heals: st.cycles ? (100 * st.heals) / st.cycles : null, cycles: avg(st.fightCycles) };
}

// You (a Demolitionist) and crews of three and four, with and without a healer and a tank.
export const CREWS = {
  'none (3)': ['payload', 'herder'], 'Sysop (3)': ['sysop', 'payload'], 'Warden (3)': ['warden', 'payload'], 'Warden + Sysop (3)': ['warden', 'sysop'],
  'none (4)': ['payload', 'herder', 'hijacker'], 'Sysop (4)': ['sysop', 'payload', 'herder'], 'Warden (4)': ['warden', 'payload', 'herder'], 'Warden + Sysop (4)': ['warden', 'sysop', 'payload'],
};
// The table (markdown) of every crew at these levels, 20 seeds each.
export function farmTable(levels = [18, 30], seeds = 20) {
  let md = '| Level | Crew | Boss wins | Your Signal lost | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |\n|---|---|---:|---:|---:|---:|---:|---:|\n';
  for (const L of levels) for (const [name, crew] of Object.entries(CREWS)) {
    const r = farmScore('demolitionist', crew, L, { seeds });
    md += `| ${L} | ${name} | ${r.wins}/${r.tries} | ${r.lost.toFixed(0)}% | ${r.low.toFixed(0)}% | ${r.dips.toFixed(0)}% | ${r.heals == null ? '–' : r.heals.toFixed(0) + '%'} | ${r.cycles.toFixed(1)} |\n`;
  }
  return md;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const levels = process.argv.slice(2).map(Number);
  console.log(farmTable(levels.length ? levels : undefined));
}
