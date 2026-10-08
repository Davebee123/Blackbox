// The hidden network: the servers one hop past the ones you've found.
//
// Every server you find is wired to two you haven't found yet, one layer deeper. They don't
// show on the map. Invaders can set out from them and come in through the server they hang off
// ("origin unknown, via X"). A hidden node shows as a "?" once you have a lead on it, or once a
// relay on its neighbour pings it.
//
// Leads toward a hidden node come from invaders out of it (a win at the wall is worth a lot,
// a block a little), from kills of its family once a relay has flagged it for a contract, and
// from the route file a relay leaves on its own server. At 100% the node is located: it becomes
// an ordinary location. A vault's trace record locates one outright.
//
// Relays: an item you install on a server you've taken over. It pings that server's hidden
// neighbours; the one carrying a contract's signal is flagged.
import { FAMILIES, SERVER } from './data.mjs';
import { emit, warn, rand, addLocation, hackerLevel, serviceValue } from './combat.mjs';
import { isLive } from './memory.mjs';
import { quietAtRoot } from './root.mjs';
import { targetedHidden, contractLocated } from './mail.mjs';
import { leanPick, netOf } from './network.mjs';

export const HIDDEN = {
  perServer: 2,
  invaderShare: 0.4, // chance an invader comes from a hidden node (when there is one)
  winLead: 40, // jack in and beat an invader from a hidden node
  blockLead: 10, // your wall stops one
  killLead: 12, // a kill of a flagged node's family
  routeLead: 50, // the relay's route file, banked
  recordLead: 35, // a vault's trace record, banked: part of a trace, not the server
  shown: 8, // unknown servers on the map and the leads list at once: the most worth chasing
};

// Trace is three rules: kills trace your own layer; route files (relay pings, vault trace records,
// injectors, log sweeps) trace the next one; relays reveal what's next door and its family.
// The Route Logger service makes every route file count for more.
export const routeBoost = (s) => 1 + serviceValue(s, 'uplink') / 100;
export const routed = (s, n) => Math.round(n * routeBoost(s));
export const hiddenNodes = (s) => (s.hidden ||= []);
export const hiddenNode = (s, id) => hiddenNodes(s).find((n) => n.id === id) || null;
export const visible = (n) => n.pinged || n.lead > 0;
// What the map shows: flagged first, then the most traced, then the newest ping; at most HIDDEN.shown.
export const shownHidden = (s) => hiddenNodes(s).filter(visible)
  .sort((a, b) => flagged(s, b) - flagged(s, a) || b.lead - a.lead || +b.id.slice(1) - +a.id.slice(1))
  .slice(0, HIDDEN.shown);
const locOf = (s, id) => s.locations.find((l) => l.id === id);

// A found server gets its hidden neighbours (called from addLocation).
export function spawnHidden(s, loc) {
  const fams = Object.keys(FAMILIES);
  const have = hiddenNodes(s).filter((n) => n.via === loc.id).length;
  for (let i = have; i < HIDDEN.perServer; i++) {
    const family = i === 0 && loc.deeper ? loc.deeper : leanPick(s, netOf(s, loc), rand(s)); // the network's lean (network.mjs)
    s.hiddenSeq = (s.hiddenSeq || 0) + 1;
    hiddenNodes(s).push({ id: 'h' + s.hiddenSeq, family, via: loc.id, depth: (loc.depth || 1) + 1, level: SERVER.locationLevel(hackerLevel(s), (loc.depth || 1) + 1), lead: 0, pinged: !!loc.relay, signal: 1 + Math.floor(rand(s) * 5) });
  }
}

// Turn a hidden node into a found location. Contracts aimed at it follow it.
export function locate(s, n) {
  const list = hiddenNodes(s);
  if (!list.includes(n)) return null;
  list.splice(list.indexOf(n), 1);
  const loc = addLocation(s, n.family, n.depth, n.via);
  loc.level = Math.max(loc.level || 1, n.level);
  contractLocated(s, n, loc);
  return loc;
}

export function hiddenLead(s, n, amount, why = '') {
  if (!n || amount <= 0) return;
  n.lead = Math.min(100, n.lead + amount);
  const via = locOf(s, n.via);
  emit(s, 'lead', `${why}Unknown ${FAMILIES[n.family].name.toLowerCase()} server past ${via?.name || 'the network'}: ${n.lead}%.`, { family: n.family, hidden: n.id });
  if (n.lead >= 100) locate(s, n);
}

// A kill of a family: flagged nodes of that family get closer (you're reading their traffic).
export function huntKill(s, family) {
  for (const n of hiddenNodes(s).filter((x) => x.family === family && x.pinged)) hiddenLead(s, n, HIDDEN.killLead, 'Signal: '); // a relay next to it hears every kill of its family
}

// Relays -------------------------------------------------------------------------------------
export const items = (s) => (s.items ||= { relay: 0, cracker: 0, injector: 0, harden: 0 });
export const flagged = (s, n) => !!n.pinged && targetedHidden(s, n.id);

export function installRelay(s, id) {
  const loc = locOf(s, id);
  if (!loc) return warn(s, 'No such server.');
  if (!loc.takenOver) return warn(s, `Take ${loc.name} over first: a relay needs a server whose vault you've opened.`);
  if (loc.relay) return warn(s, `${loc.name} already runs a relay.`);
  if (!items(s).relay) return warn(s, 'You have no relay. Halcyon sells them.');
  items(s).relay--;
  loc.relay = true;
  spawnHidden(s, loc);
  const near = hiddenNodes(s).filter((n) => n.via === loc.id);
  for (const n of near) n.pinged = true;
  emit(s, 'relay', `Relay up on ${loc.name}. It pings ${near.length} unknown ${near.length === 1 ? 'server' : 'servers'} nearby.`, { location: loc.id });
  syncFlags(s);
}

// Flag contract targets a relay can hear, and leave a route file on the relay's server.
export function syncFlags(s) {
  for (const n of hiddenNodes(s)) {
    const via = locOf(s, n.via);
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

// Pick an invader's origin: a found server, or (sometimes) a hidden one behind it.
// Only servers attached to your network send them (memory.mjs): detach one and it can't find you.
export function pickOrigin(s) {
  const hid = hiddenNodes(s).filter((n) => locOf(s, n.via) && isLive(s, locOf(s, n.via)));
  if (hid.length && rand(s) < HIDDEN.invaderShare) return { hidden: hid[Math.floor(rand(s) * hid.length)] };
  const tame = s.locations.filter((l) => !l.rogue && isLive(s, l) && !quietAtRoot(l)); // rogue servers never send invaders; Root 3 servers have gone quiet
  if (!tame.length) return hid.length ? { hidden: hid[Math.floor(rand(s) * hid.length)] } : {};
  return { loc: tame[Math.floor(rand(s) * tame.length)] };
}
export const levelOfHidden = (n) => Math.min(SERVER.maxLevel, n.level);
