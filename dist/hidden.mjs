// The hidden network: the unknown servers along your floors' links (floors.mjs, docs/servers.md 5.3).
//
// Every server on a floor links to its neighbours on that floor's diagram. A linked server you haven't located shows
// as ? with its link (a hidden node: s.hidden, one per slot, its id h<n>): a neighbour of a server you've found, or of
// an entry you've reached (SPRAWL-00's on floor 1). Its trace fills to 100% to locate it, and then it's an ordinary
// server with its own ? neighbours. Going deeper is taking an exit (floors.mjs descend).
//
// Its trace comes from rooms: each first clear of a fight room on a server linked to it (+10%), its vault's trace
// record (+50%), SPRAWL-00's strays (a kill traces one of its ?s, as the old family leads did), a trace injector (+30%),
// an invader from it beaten (+40%; your wall stopping one, +10%), and kills of its family once a relay has pinged it.
// Invaders can set out from a ? and come in through the server it hangs off ("an unknown server past X").
//
// Relays: an item you install on a server you've taken over. It pings that server's ? neighbours (their family shows);
// the one carrying a contract's signal is flagged.
import { FAMILIES, CONFIG, xpScale } from './data.mjs';
import { emit, warn, rand, addLocation, materialsOf, hackerLevel } from './combat.mjs';
import { MATERIALS } from './gear.mjs';
import { SALVAGE_COSTS, settle, spend, canAfford } from './salvage.mjs';
import { isLive } from './memory.mjs';
import { quietAtRoot } from './root.mjs';
import { targetedHidden, contractLocated } from './mail.mjs';
import { addHidden, neighbours, slotNode, hiddenNear, floorsOf, locAt } from './floors.mjs';

export const HIDDEN = {
  invaderShare: 0.4, // chance an invader comes from a hidden node (when there is one)
  winLead: 40, // jack in and beat an invader from a hidden node
  blockLead: 10, // your wall stops one
  killLead: 12, // a kill of a flagged node's family
  routeLead: 50, // the relay's route file, banked
  recordLead: 50, // a vault's trace record (signal.trc), banked
  firstClear: 20, // each first clear of a fight room on a server linked to it
  opens: true, // a Mapped server, or a rogue one cleared, traces the ? servers linked to it the rest of the way
  shown: 8, // unknown servers in the leads list at once: the most worth chasing
};

// (The Route Logger service that made route files count for more went with services in R2: the Relay program is its job, R4.)
export const routeBoost = () => 1;
export const routed = (s, n) => Math.round(n * routeBoost(s));
export const hiddenNodes = (s) => { floorsOf(s); return (s.hidden ||= []); };
export const hiddenNode = (s, id) => hiddenNodes(s).find((n) => n.id === id) || null;
export const visible = () => true; // a ? shows with its link from the moment it's linked to something you've found
// The leads list: flagged first, then the most traced, then the newest; at most HIDDEN.shown.
export const shownHidden = (s) => hiddenNodes(s).filter(visible)
  .sort((a, b) => flagged(s, b) - flagged(s, a) || b.lead - a.lead || +b.id.slice(1) - +a.id.slice(1))
  .slice(0, HIDDEN.shown);
const locOf = (s, id) => s.locations.find((l) => l.id === id);
// Where a ? hangs off, in words: a server's name, or SPRAWL-00.
export const viaName = (s, n) => (n?.via === CONFIG.zone.id ? CONFIG.zone.name : locOf(s, n?.via)?.name || 'the network');

// A found server's ? neighbours: every unlocated server slot linked to its slot (called from addLocation).
export function spawnHidden(s, loc) {
  if (!loc?.slot) return;
  for (const id of neighbours(s, loc.slot)) { const h = addHidden(s, slotNode(s, id), loc.id); if (h && loc.relay) h.pinged = true; }
}

// Turn a hidden node into a found location at its slot. Contracts aimed at it follow it (addLocation).
export function locate(s, n) {
  if (!hiddenNodes(s).includes(n)) return null;
  return addLocation(s, n.family, n.depth, n.via, n.slot);
}

export function hiddenLead(s, n, amount, why = '') {
  if (!n || amount <= 0 || !hiddenNodes(s).includes(n)) return;
  n.lead = Math.min(100, n.lead + amount);
  const known = n.pinged || n.seen;
  emit(s, 'lead', `${why}Unknown ${known ? `${FAMILIES[n.family]?.name.toLowerCase() || ''} ` : ''}server past ${viaName(s, n)}: ${n.lead}%.`, { family: known ? n.family : null, hidden: n.id });
  if (n.lead >= 100) locate(s, n);
}
// A place's trace along its links (floors.mjs hiddenNear): every ? linked to it, or one (one: the most traced, so they
// come one at a time; then its family's, then the lowest level). Returns the nodes it moved.
export function traceNear(s, loc, amount, why = '', { one = false, family = null } = {}) {
  const near = hiddenNear(s, loc);
  if (!near.length || amount <= 0) return [];
  const pick = one ? [[...near].sort((a, b) => b.lead - a.lead || (b.family === family) - (a.family === family) || a.level - b.level)[0]] : near;
  for (const n of pick) hiddenLead(s, n, amount, why);
  return pick;
}
// SPRAWL-00's strays and an invader beaten trace one ? like the old family leads: CONFIG.leadBase a kill, falling with
// the level gap like XP (nothing from a grey kill), half again from the hot strain.
export const leadOf = (s, level, hot = false) => Math.round(CONFIG.leadBase * Math.min(1, xpScale(level - hackerLevel(s))) * (hot ? 1.5 : 1));

// A kill of a family: flagged nodes of that family get closer (you're reading their traffic).
export function huntKill(s, family) {
  for (const n of hiddenNodes(s).filter((x) => x.family === family && x.pinged)) hiddenLead(s, n, HIDDEN.killLead, 'Signal: '); // a relay next to it hears every kill of its family
}

// Relays -------------------------------------------------------------------------------------
export const items = (s) => (s.items ||= { relay: 0, cracker: 0, injector: 0 });
export const flagged = (s, n) => !!n.pinged && targetedHidden(s, n.id);

export function installRelay(s, id) {
  const loc = locOf(s, id);
  if (!loc) return warn(s, 'No such server.');
  if (!loc.takenOver) return warn(s, `Take ${loc.name} over first. A relay needs a server whose vault you have opened.`);
  if (loc.relay) return warn(s, `${loc.name} already runs a relay.`);
  if (!items(s).relay) return warn(s, 'You have no relay. Halcyon sells them.');
  items(s).relay--;
  loc.relay = true;
  spawnHidden(s, loc);
  const near = hiddenNear(s, loc, { junction: false });
  for (const n of near) n.pinged = true;
  emit(s, 'relay', `Relay up on ${loc.name}. It pings ${near.length} unknown ${near.length === 1 ? 'server' : 'servers'} nearby.`, { location: loc.id });
  syncFlags(s);
}

// Flag contract targets a relay can hear, and leave a route file on the relay's server.
export function syncFlags(s) {
  for (const n of hiddenNodes(s)) {
    // A relay on any server linked to it pings it, and keeps its route files.
    const via = (n.slot ? neighbours(s, n.slot).map((id) => locAt(s, id)).find((l) => l?.relay) : null) || locOf(s, n.via);
    if (via?.relay) n.pinged = true;
    // Every server a relay pings leaves a route file on the relay's server; a contract's target is flagged too.
    if (!n.pinged || n.routed || !via) continue;
    n.routed = true;
    const wanted = flagged(s, n);
    (via.extraFiles ||= []).push({ dir: '/', name: `ping-${n.id}.trc`, label: 'a relay route file', kind: 'route', hidden: n.id, text: [wanted ? 'relay log: a signal that matches the contract, one hop out.' : 'relay log: a signal one hop out.', 'pull it and bank it to trace most of the route.'] });
    emit(s, 'flagged', wanted ? `Relay on ${via.name}: one unknown server carries the contract's signal. It's flagged on the map.` : `Relay on ${via.name}: a route file to an unknown server (ping-${n.id}.trc in /).`, { hidden: n.id });
  }
}

// A route file banked on jack-out.
export function bankRoute(s, f) {
  const n = hiddenNode(s, f.hidden);
  if (n) hiddenLead(s, n, routed(s, HIDDEN.routeLead), 'Route file: ');
}

// Items used from the map --------------------------------------------------------------------
export function useItem(s, text) {
  const [, what, id] = text.match(/^use (cracker|injector) (\S+)$/) || [];
  if (!what) return warn(s, 'usage: use cracker <server> or use injector <unknown server>');
  if (!items(s)[what]) return warn(s, `You have no ${what === 'cracker' ? 'key cracker' : 'trace injector'}.`);
  if (what === 'cracker') {
    const loc = locOf(s, id);
    if (!loc) return warn(s, 'No such server.');
    if (loc.passwordKnown) return warn(s, `You already have ${loc.name}'s vault key.`);
    items(s).cracker--;
    loc.passwordKnown = true;
    return emit(s, 'net-good', `Key cracker: ${loc.name}'s vault key is ${loc.password}.`, { location: loc.id });
  }
  const n = hiddenNode(s, id);
  if (!n || !visible(n)) return warn(s, 'Pick an unknown server on the map.');
  items(s).injector--;
  hiddenLead(s, n, routed(s, 30), 'Trace injector: ');
}

// Pick an invader's origin: a server you've connected to, or (sometimes) a ? behind one (docs/servers.md 5.3: what
// you've connected to sets what comes at you). Only servers attached to your network send them (memory.mjs).
export const connectedTo = (l) => !!l && ((l.runs || 0) > 0 || !!l.takenOver);
// A ? sends one through a server it's linked to that you've connected to: that one becomes the server it hangs off.
const throughOf = (s, n) => (n.slot ? neighbours(s, n.slot).map((id) => locAt(s, id)) : [locOf(s, n.via)]).find((l) => l && !l.zone && s.locations.includes(l) && isLive(s, l) && connectedTo(l)) || null;
const sendFrom = (s, n) => { const v = throughOf(s, n); if (v) n.via = v.id; return { hidden: n }; };
export function pickOrigin(s) {
  const hid = hiddenNodes(s).filter((n) => throughOf(s, n));
  if (hid.length && rand(s) < HIDDEN.invaderShare) return sendFrom(s, hid[Math.floor(rand(s) * hid.length)]);
  const tame = s.locations.filter((l) => !l.rogue && isLive(s, l) && !quietAtRoot(l) && connectedTo(l)); // rogue servers never send invaders; Root 3 servers have gone quiet
  if (!tame.length) return hid.length ? sendFrom(s, hid[Math.floor(rand(s) * hid.length)]) : {};
  return { loc: tame[Math.floor(rand(s) * tame.length)] };
}
export const levelOfHidden = (n) => Math.min(50, n.level);

// Crafting a relay (the Craft page, `relay craft`): once a contract has paid you the Relay plan (s.plans). Credits, Kernel
// code and components. (It was outpost.mjs's; outposts are gone, relays stay until the Relay program comes, R4.)
export const RELAY_CRAFT = { credits: 60, code: 6, material: 'kernel' };
export const knowsRelay = (s) => (s.plans || []).includes('relay');
export const relayCost = () => ({ credits: RELAY_CRAFT.credits, code: { [RELAY_CRAFT.material]: RELAY_CRAFT.code }, salvage: SALVAGE_COSTS.relay() });
export const canBuildRelay = (s) => { const c = relayCost(s); return knowsRelay(s) && s.server.credits >= c.credits && (materialsOf(s)[RELAY_CRAFT.material] || 0) >= RELAY_CRAFT.code && canAfford(s, c.salvage); };
export function craftRelay(s, payText = null) {
  if (!knowsRelay(s)) return warn(s, 'You don\'t have the Relay plan. Some Halcyon contracts pay it.');
  const c = relayCost(s), k = RELAY_CRAFT.material, have = materialsOf(s);
  if (s.server.credits < c.credits || (have[k] || 0) < RELAY_CRAFT.code) return warn(s, `A relay costs ${c.credits} credits, ${RELAY_CRAFT.code} ${MATERIALS[k].name} and ${c.salvage.any} components.`);
  const pay = settle(s, c.salvage, payText);
  if (typeof pay === 'string') return warn(s, `Relay: ${pay.replace(/salvage/g, 'components')}`);
  spend(s, pay);
  s.server.credits -= c.credits;
  have[k] -= RELAY_CRAFT.code;
  items(s).relay += 1;
  emit(s, 'harvester', `Crafted a relay (${items(s).relay} in your kit). Install it from a server you've taken over.`, { relay: true });
}
// The Relay plan (a Halcyon contract's bonus): learn it once; again, 2 components.
export function learnRelayPlan(s, why = '') {
  s.plans ||= [];
  if (s.plans.includes('relay')) { s.salvage ||= []; for (let i = 0; i < 2; i++) s.salvage.push({ name: ['Pulse Kernel', 'Signal Key'][i], virus: 'plan', seed: 0 }); return emit(s, 'info', `${why}the Relay plan, already known: +2 components.`); }
  s.plans.push('relay');
  emit(s, 'drop', `${why}the Relay plan. You can craft relays on the Craft page.`, { plan: 'relay' });
}
