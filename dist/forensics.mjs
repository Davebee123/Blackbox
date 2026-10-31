// Log sweep: a short detective puzzle on runs. About half the servers you find keep an
// incident file in their root, and which kind is fixed per server:
//   breach.log     who broke in?        (logins: time, service, result, user, address)
//   transfer.log   what was stolen?     (transfers: time, direction, size, file, peer)
//   ps.snapshot    which one is it?     (processes: pid, parent, user, cpu, command)
// cat it for a one-screen log, a question and three suspects. Click lines to light up
// everything that shares a value (an address, a file, a command), filter the noise, then
// name your answer (`sweep <answer>`). A right answer pushes the lead toward the next server;
// wrong answers cost nothing but shrink it. Skipping changes nothing.
//
// Each kind has three tricks, by floor (1, 2, 3+): the obvious one, a decoy, and one that
// needs the note at the top of the log. The log comes from the server's seed: the same every
// visit, different everywhere.
import { emit, warn, addLead, gainXp, xpFor } from './combat.mjs';
import { contractDid } from './mail.mjs';
import { routed } from './hidden.mjs';
import { seeded } from './gear.mjs';
import { SWEEP_FILES, sweepFor } from './logsweep.mjs';
export { SWEEP_FILES, sweepFor };

export const SWEEP = { share: 0.5, rewards: [40, 25, 15, 10], xpShare: 1 }; // a sweep pays a kill's XP (a Sweep contract pays its own on top)

const pick = (r, a) => a[Math.floor(r() * a.length)];

export const sweepTier = (loc) => Math.min(3, Math.max(1, loc.depth || 1));

// Which incident file this server keeps, if any (fixed per server).
export function sweepKind(loc) {
  if (!loc || loc.zone || loc.rogue) return null;
  const r = seeded((loc.seed || 1) * 43 + 11);
  if (r() >= SWEEP.share) return null;
  return pick(r, ['auth', 'auth', 'exfil', 'proc']);
}
export const sweepFile = (loc) => SWEEP_FILES[sweepKind(loc)] || null;

// The puzzle for a server (null if it keeps no incident file).
export function sweepPuzzle(loc) {
  const kind = sweepKind(loc);
  return kind ? sweepFor(loc, kind) : null;
}
const state = (loc) => (loc.state.sweep ||= { tries: 0, solved: null });

// cat <incident file>: the sweep appears in the terminal.
export function showSweep(s, loc) {
  const p = sweepPuzzle(loc), st = state(loc);
  if (!p) return;
  emit(s, 'net-sweep', `${p.file}: ${p.question}`, { location: loc.id, sweep: { ...p, answer: st.solved ? p.answer : null, solved: st.solved } });
}

// sweep <answer>
export function sweepCommand(s, loc, arg) {
  const p = loc && sweepPuzzle(loc);
  if (!p) return warn(s, 'Nothing to sweep here.');
  const st = state(loc);
  if (!arg) return showSweep(s, loc);
  if (st.solved) return emit(s, 'net-out', `Already swept: ${st.solved}.`);
  if (!p.suspects.includes(arg)) return emit(s, 'net-err', `sweep: ${arg} isn't one of the suspects (${p.suspects.join(', ')}).`);
  if (arg !== p.answer) {
    st.tries++;
    return emit(s, 'net-err', `${arg}: it doesn't fit. Look again.`);
  }
  st.solved = arg;
  const amount = SWEEP.rewards[Math.min(st.tries, SWEEP.rewards.length - 1)];
  emit(s, 'net-good', `SWEPT: ${arg}${st.tries ? '' : ', first read'}.`);
  addLead(s, loc.deeper || loc.family, routed(s, amount), 'Log sweep: ', loc); // a route file: one of its ? neighbours (floors.mjs)
  gainXp(s, xpFor(s, loc.level || 1, SWEEP.xpShare * amount / SWEEP.rewards[0]), 'log sweep', 'intel'); // guessing pays less, like the lead
  contractDid(s, 'sweeps');
}
