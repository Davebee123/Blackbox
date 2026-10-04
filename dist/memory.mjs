// Server memory: how many servers your network holds at once. Every server you find takes a slot
// (rogue ones too); when memory is full, a new find arrives detached: on the map, not on your
// network. Attaching or detaching a server costs credits, more for a higher-level one, the same
// every time (no penalty for swapping back). Detaching freezes that server and everything found
// through it: no runs, no harvesting, no sieges, timers stopped. Attach it again and it picks up
// where it was. Harvester slots (bandwidth) still decide how many outposts run.
import { emit, warn, serverLevel, active } from './combat.mjs';

export const MEMORY = {
  base: 4, // slots at server level 1
  per: 5, // one more every this many server levels
  cost: (level) => 25 + 5 * Math.max(1, level), // credits to attach or detach
};

export const memoryCap = (s) => MEMORY.base + Math.floor(serverLevel(s) / MEMORY.per);
const byId = (s, id) => (s.locations || []).find((l) => l.id === id);
// On your network: attached itself, and every server it was found through too.
export function isLive(s, loc) {
  for (let l = loc, n = 0; l && n < 50; l = l.parent ? byId(s, l.parent) : null, n++) if (l.detached) return false;
  return true;
}
export const liveCount = (s) => (s.locations || []).filter((l) => isLive(s, l)).length;
export const memoryCost = (loc) => MEMORY.cost(loc.level || 1);
// A server and everything found through it.
export function branchOf(s, loc) {
  const out = [loc];
  for (let i = 0; i < out.length; i++) for (const l of s.locations || []) if (l.parent === out[i].id && !out.includes(l)) out.push(l);
  return out;
}
// What attaching would add: the servers in its branch that would be live again.
function wouldAdd(s, loc) {
  loc.detached = false;
  const n = branchOf(s, loc).filter((l) => isLive(s, l)).length;
  loc.detached = true;
  return n;
}

// When a server is found: if memory is full, it arrives detached.
export function onFound(s, loc) {
  if (liveCount(s) > memoryCap(s)) {
    loc.detached = true;
    emit(s, 'info', `Memory full (${memoryCap(s)}): ${loc.name} is on the map, detached. Detach another server to make room, or level your server.`, { location: loc.id });
  }
}

export function memoryCommand(s, verb, id, now = Date.now()) {
  const loc = byId(s, id) || (s.locations || []).find((l) => l.name.toLowerCase() === id);
  if (!loc) return warn(s, `usage: ${verb} <server>`);
  if (active(s) || s.run) return warn(s, 'Jack out and finish your fight first.');
  const price = memoryCost(loc);
  if (verb === 'detach') {
    if (loc.detached) return warn(s, `${loc.name} is already detached.`);
    if (s.server.credits < price) return warn(s, `Detaching ${loc.name} costs ${price} credits; you have ${s.server.credits}.`);
    s.server.credits -= price;
    loc.detached = true;
    const frozen = branchOf(s, loc).length - 1;
    return emit(s, 'info', `${loc.name} detached for ${price} credits${frozen ? `, with the ${frozen} ${frozen === 1 ? 'server' : 'servers'} found through it` : ''}. Frozen as it was. Memory ${liveCount(s)}/${memoryCap(s)}.`, { location: loc.id });
  }
  if (!loc.detached && isLive(s, loc)) return warn(s, `${loc.name} is already attached.`);
  if (!isLive(s, byId(s, loc.parent) || {})) { let up = byId(s, loc.parent); while (up && !up.detached) up = byId(s, up.parent); return warn(s, `${loc.name} is frozen with the server it hangs off: attach ${up?.name || 'that one'} first.`); }
  const add = wouldAdd(s, loc);
  if (liveCount(s) + add > memoryCap(s)) return warn(s, `Not enough memory: ${loc.name} needs ${add}, ${memoryCap(s) - liveCount(s)} free. Detach something first.`);
  if (s.server.credits < price) return warn(s, `Attaching ${loc.name} costs ${price} credits; you have ${s.server.credits}.`);
  s.server.credits -= price;
  loc.detached = false;
  // Unfreeze: its outposts' clocks start again from now (nothing is made while frozen).
  for (const l of branchOf(s, loc)) if (l.outpost && isLive(s, l)) l.outpost.at = now;
  emit(s, 'info', `${loc.name} attached for ${price} credits. Memory ${liveCount(s)}/${memoryCap(s)}.`, { location: loc.id });
}
