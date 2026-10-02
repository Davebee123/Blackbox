// Comms: the pager's memory. World events (mail, the board, contracts, money, the network) become
// short pager entries, kept on the save so what happened while you were away is still there.
// Pure: events in, entries out. The pager itself (the top-bar widget and its list) lives in
// view.mjs and app.js.

export const COMMS = { keep: 40 };

// Filters on the list, and which kinds sit under each.
export const GROUPS = { Contracts: ['offer', 'ready'], Mail: ['mail'], Network: ['net', 'alert'], Money: ['paid', 'standing', 'store'] };
export const groupOf = (kind) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(kind)) || 'Network';

// event type → { kind, label, from, beep }. beep: whether the pager beeps (quiet ones only light up).
const MAP = {
  mail: (e) => ({ kind: 'mail', label: 'Mail', from: e.from || 'Mail', text: e.subject || e.message.replace(/^New mail from [^:]+: /, ''), go: e.letter ? `mail:l${e.letter}` : 'mail', beep: true }),
  board: (e) => ({ kind: 'offer', label: 'Offer', from: 'Halcyon board', text: e.message.replace(/^New offers? on the board: /, ''), go: e.offer ? `mail:j${e.offer}` : 'mail', beep: true }),
  'contract-ready': (e) => ({ kind: 'ready', label: 'Ready', from: 'Contract', text: e.message.replace(/^Contract ready: /, ''), go: e.contract ? `mail:j${e.contract}` : 'mail', beep: true }),
  'contract-done': (e) => ({ kind: 'paid', label: 'Paid', from: 'Halcyon Mutual', text: e.message.replace(/^DELIVERED: /, ''), go: 'mail', beep: false }),
  retainer: (e) => ({ kind: 'paid', label: 'Retainer', from: 'Halcyon Mutual', text: e.message.replace(/^Halcyon retainer: /, ''), go: 'mail', beep: true }),
  'standing-up': (e) => ({ kind: 'standing', label: 'Standing', from: 'Halcyon Mutual', text: e.message, go: 'mail', beep: false }),
  'standing-down': (e) => ({ kind: 'standing', label: 'Standing', from: 'Halcyon Mutual', text: e.message, go: 'mail', beep: true }),
  store: () => ({ kind: 'store', label: 'Store', from: 'Agency stock', text: 'New stock at the Halcyon store.', go: 'store', beep: false }),
  flagged: (e) => ({ kind: 'net', label: 'Flagged', from: 'Relay', text: e.message.replace(/^Relay on /, ''), go: e.hidden ? `map:${e.hidden}` : 'map', beep: true }),
  relay: (e) => ({ kind: 'net', label: 'Relay', from: 'Relay', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: false }),
  located: (e) => ({ kind: 'net', label: 'Located', from: 'Trace', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: true }),
  takeover: (e) => ({ kind: 'net', label: 'Taken', from: 'Network', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: false }),
  invader: (e) => ({ kind: 'net', label: 'Invader', from: 'Wall', text: e.message, go: 'map:invader', beep: true }),
  'wall-siege': (e) => ({ kind: 'alert', label: 'Siege', from: 'Wall', text: e.message, go: 'jack', beep: true }),
  'outpost-siege': (e) => ({ kind: 'alert', label: 'Siege', from: 'Outpost', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: true, alert: true }),
  'outpost-fell': (e) => ({ kind: 'alert', label: 'Lockdown', from: 'Outpost', text: e.message.replace(/^LOCKDOWN: /, ''), go: e.location ? `map:${e.location}` : 'map', beep: true }),
  'outpost-held': (e) => ({ kind: 'net', label: 'Held', from: 'Outpost', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: false }),
  fleet: (e) => ({ kind: 'alert', label: 'Swarm', from: 'Network', text: e.message.replace(/^SWARM: /, ''), go: 'map:fleet', beep: true, alert: true }),
  'fleet-siege': (e) => ({ kind: 'alert', label: 'Swarm', from: 'Outpost', text: e.message, go: 'map:fleet', beep: true, alert: true }),
  'fleet-broken': (e) => ({ kind: 'net', label: 'Broken', from: 'Swarm', text: e.message.replace(/^SWARM BROKEN\. /, ''), go: e.location ? `map:${e.location}` : 'map', beep: false }),
  infest: (e) => ({ kind: 'net', label: 'Infested', from: 'Outpost', text: e.message.replace(/^INFESTED: /, ''), go: e.location ? `map:${e.location}` : 'map', beep: true }),
  harvest: (e) => ({ kind: 'paid', label: 'Harvest', from: 'Outpost', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: false }),
  station: (e) => ({ kind: 'net', label: 'Station', from: 'LANTERN', text: e.message, go: e.location ? `map:${e.location}` : 'map', beep: true }),
  'consortium-invite': (e) => ({ kind: 'net', label: 'Invite', from: 'Consortium', text: e.message.replace(/ consortium accept, or consortium decline\.$/, ''), go: 'people:consortium', beep: true }),
  'consortium-merged': (e) => ({ kind: 'net', label: 'Merged', from: 'Consortium', text: e.message.replace(/ See the Map\.$/, ''), go: 'map:consortium', beep: false }),
  'consortium-tier': (e) => ({ kind: 'net', label: 'Consortium', from: 'Consortium', text: e.message, go: 'map:consortium', beep: true }),
  'consortium-lockdown': (e) => ({ kind: 'alert', label: 'Lockdown', from: 'Consortium', text: e.message.replace(/^LOCKDOWN: /, ''), go: e.location ? `map:${e.location}` : 'map:consortium', beep: true }),
  'consortium-raid': (e) => ({ kind: 'alert', label: 'Invader', from: 'Consortium', text: e.message, go: 'people:consortium', beep: true }),
  'consortium-roam': (e) => ({ kind: 'alert', label: 'Trunk', from: 'Consortium', text: e.message, go: 'map:roamer', beep: true }),
  'consortium-crash': (e) => ({ kind: 'alert', label: 'Crash', from: 'Consortium', text: e.message, go: e.location ? `map:${e.location}` : 'map:consortium', beep: true }),
  'consortium-siege': (e) => ({ kind: 'alert', label: 'Siege', from: 'Consortium', text: e.message, go: e.location ? `map:${e.location}` : 'map:consortium', beep: true }),
  'wall-breach': (e) => ({ kind: 'alert', label: 'Breach', from: 'Wall', text: e.message, go: 'jack', beep: true, alert: true }),
};

export const commsOf = (s) => (s.comms ||= []);
export const unseen = (s) => commsOf(s).filter((c) => !c.seen).length;
export const unseenAlert = (s) => commsOf(s).some((c) => !c.seen && c.kind === 'alert');

// Log what's pager-worthy from a batch of events. Returns the new entries (newest last).
export function logComms(s, events, now = Date.now()) {
  const list = commsOf(s);
  const added = [];
  for (const e of events) {
    const f = MAP[e.type];
    if (!f) continue;
    const c = { id: (s.commsSeq = (s.commsSeq || 0) + 1), t: now, seen: false, ...f(e) };
    // Restocks and offers come often: fold a repeat into the last unseen line instead of stacking.
    const last = list[0];
    if (last && !last.seen && c.kind === 'store' && last.kind === 'store') { last.t = now; continue; }
    list.unshift(c);
    added.push(c);
  }
  if (list.length > COMMS.keep) list.length = COMMS.keep;
  return added;
}
export function seeAll(s) { for (const c of commsOf(s)) c.seen = true; }
