// The firewall: what meets every threat that comes for your server. Linear and yours to build:
//   level      upgraded a step at a time with credits and Cipher code; it never grows by itself
//   fragments  every threat it meets fragments it (a 16-block grid); each 4 fragmented blocks
//              cost it a level. Defrag restores it, running weaker for a few minutes meanwhile.
//   hardening  harden.sh (a hub-shop consumable): +3 levels for 8 hours.
// Its effective level is what it blocks outright: an invader at or under it bounces.
import { emit, warn, hooks, serverLevel } from './combat.mjs';
import { CONFIG, power } from './data.mjs';
import { items } from './hidden.mjs';

export const FIREWALL = {
  blocks: 16, // the grid
  perLevel: 4, // fragmented blocks per level lost
  frag: { blocked: 1, siege: 2, breach: 3 }, // blocks fragmented by a threat it meets
  defragMs: 3 * 60000, defragLoss: 2, // a defrag's time, and the levels it runs down meanwhile
  harden: { plus: 3, ms: 8 * 3600000 },
  maxLevel: 60,
};
// To go from level L to L+1.
export const upgradeCost = (L) => ({ credits: 30 + 20 * L, cipher: 2 + L });

const clock = () => hooks.now?.() ?? Date.now();
// Old saves had a wall from the server's level and the Firewall service's version: start the
// firewall where that wall blocked, so nobody loses ground.
function startLevel(s) {
  const v = s.services?.firewall || 0, k = v ? [1, 1.2, 1.45][v - 1] : 0.75, rating = power(serverLevel(s)) * k;
  let blocks = 1;
  for (let L = 1; L <= FIREWALL.maxLevel; L++) if (rating >= power(L) * CONFIG.invasion.block) blocks = L;
  return blocks;
}
export const fwOf = (s) => (s.firewall ||= { level: startLevel(s), frag: 0, defragUntil: 0, hardenUntil: 0 });

export const fragLevels = (s) => Math.floor(fwOf(s).frag / FIREWALL.perLevel);
export const defragging = (s, at = clock()) => fwOf(s).defragUntil > at;
export const hardenLeft = (s, at = clock()) => Math.max(0, fwOf(s).hardenUntil - at);
// What it blocks outright right now.
export function effLevel(s, at = clock()) {
  const f = fwOf(s);
  return Math.max(0, f.level - fragLevels(s) - (defragging(s, at) ? FIREWALL.defragLoss : 0) + (hardenLeft(s, at) ? FIREWALL.harden.plus : 0));
}

// A threat met it: fragment.
export function fragment(s, outcome) {
  const f = fwOf(s);
  f.frag = Math.min(FIREWALL.blocks, f.frag + (FIREWALL.frag[outcome] || 0));
}
// The clock: a defrag that's done leaves it whole.
export function tickFirewall(s, at = clock()) {
  const f = fwOf(s);
  if (f.defragUntil && at >= f.defragUntil) {
    f.defragUntil = 0; f.frag = 0;
    emit(s, 'firewall', `Defrag done: firewall back to level ${effLevel(s, at)}.`);
  }
}

export function firewallCommand(s, text, at = clock()) {
  const f = fwOf(s);
  if (text === 'firewall upgrade') {
    if (f.level >= FIREWALL.maxLevel) return warn(s, 'Your firewall is at its highest level.');
    const c = upgradeCost(f.level), have = s.materials?.cipher || 0;
    if (s.server.credits < c.credits || have < c.cipher) return warn(s, `Level ${f.level + 1} takes ${c.credits} credits and ${c.cipher} Cipher code.`);
    s.server.credits -= c.credits; s.materials.cipher -= c.cipher;
    f.level++;
    return emit(s, 'firewall', `Firewall level ${f.level}.`);
  }
  if (text === 'defrag' || text === 'firewall defrag') {
    if (defragging(s, at)) return warn(s, 'Already defragmenting.');
    if (!f.frag) return warn(s, 'Nothing to defragment.');
    f.defragUntil = at + FIREWALL.defragMs;
    return emit(s, 'firewall', `Defragmenting: ${FIREWALL.defragMs / 60000} minutes, ${FIREWALL.defragLoss} levels down meanwhile.`);
  }
  if (text === 'firewall harden') {
    if (!items(s).harden) return warn(s, 'You have no hardening script. Hub shops sell harden.sh.');
    items(s).harden--;
    f.hardenUntil = Math.max(at, f.hardenUntil) + FIREWALL.harden.ms;
    return emit(s, 'firewall', `harden.sh: firewall +${FIREWALL.harden.plus} levels for ${Math.round(hardenLeft(s, at) / 3600000)} hours.`);
  }
  return warn(s, 'firewall upgrade · firewall defrag · firewall harden');
}
