// Server architecture: at server level 20 you pick what your server is built around, like a
// Master of Orion 2 government. One at a time; switching later costs credits and happens between
// fights. Each is a trade, not an upgrade.
import { emit, warn, active, serverLevel } from './combat.mjs';

export const ARCHITECTURES = {
  fortress: { name: 'Fortress', rule: 'Raises your firewall by 5 levels. Your outposts produce 25% less.' },
  hub: { name: 'Hub', rule: 'Grants 2 more outpost bandwidth. Lowers your firewall by 3 levels.' },
  lab: { name: 'Lab', rule: 'Compiling protocols, buildings and relays costs 30% fewer credits. Natives notice your outposts 25% more often.' },
};
export const ARCH_LEVEL = 20;
export const ARCH_SWITCH = 1000; // credits to change once you've picked

export const archOf = (s) => (ARCHITECTURES[s.architecture] ? s.architecture : null);
export const isArch = (s, id) => archOf(s) === id;

// Multipliers the rest of the game asks for.
// Firewall levels it adds to your home wall (firewall.mjs wallBonus).
export const archWall = (s) => (isArch(s, 'fortress') ? 5 : isArch(s, 'hub') ? -3 : 0);
export const archYield = (s) => (isArch(s, 'fortress') ? 0.75 : 1);
export const archBandwidth = (s) => (isArch(s, 'hub') ? 2 : 0);
export const archNotice = (s) => (isArch(s, 'lab') ? 1.25 : 1);
export const archCredits = (s, n) => (isArch(s, 'lab') ? Math.round(n * 0.7) : n);

// architecture <fortress|hub|lab>
export function architectureCommand(s, text) {
  const id = text.split(' ')[1];
  if (!ARCHITECTURES[id]) return warn(s, `usage: architecture ${Object.keys(ARCHITECTURES).join('|')}`);
  if (serverLevel(s) < ARCH_LEVEL) return warn(s, `Your server picks an architecture at level ${ARCH_LEVEL}.`);
  if (active(s)) return warn(s, 'Change it between fights.');
  if (archOf(s) === id) return warn(s, `Your server is already a ${ARCHITECTURES[id].name}.`);
  const cost = archOf(s) ? ARCH_SWITCH : 0;
  if (s.server.credits < cost) return warn(s, `Rebuilding as a ${ARCHITECTURES[id].name} costs ${cost} credits.`);
  s.server.credits -= cost;
  s.architecture = id;
  emit(s, 'architecture', `Your server is now a ${ARCHITECTURES[id].name}${cost ? ` (−${cost} credits)` : ''}. ${ARCHITECTURES[id].rule}`);
}
