// Floor jobs: each floor's fixed chain of contracts (WoW's zone storyline), between the board's random offers. A floor's
// chain opens once you've reached that floor and Halcyon's board is open (the LOWLIGHT storyline's initiate jobs are
// done), and carries that storyline on: wick's read of the claims ledger, followed down the floors.
//
//   chains   content/contracts.mjs `floors`: a chain a floor (its title, who sends it, why, its lore line) of 4–6 steps.
//            One step is open at a time; delivering it posts the next as a letter. Never on the board, never timed,
//            never dropped, and never counted toward the contracts you can hold (MAIL.take), like the storyline's jobs.
//   steps    each wraps an existing activity as a contract (mail.mjs runs it): map, rooms, takeover, item, install,
//            sweep, heist (past the Tracker) and bounty (a named process in SPRAWL-00, floor 1 only), plus two of its
//            own, polled here: puzzle (win a puzzle board on the server) and lair (beat the floor's lair boss).
//   targets  fixed by the floor's diagram (floors.mjs), so every save of a network gets the same ones: the landing
//            server, a server along the main road (never a rogue server or the lair) by its place from the entry, the
//            first main-road server with a Tracker from there (a Mirror, an Archive or a Lab), or the lair. A target
//            you haven't located yet is the ? at its slot, or further out: the step says how many links past what
//            you've found, and becomes the plain contract once you locate it.
//   rewards  credits, Halcyon standing (or the sender's rep) and contract XP, all paid by mail.mjs's delivery (the same
//            XP helper as the board's). A step marked pick offers one of three items at your level (WoW's quest
//            reward): the last step's are yellows, one rarity over a contract's blue; a middle step's are blues. Never
//            a unique or a set piece.
// State: s.arcs = { [floor]: { step, at, done, doneAt, titles }, offers: [{ floor, step, items }] }. The jobs themselves
// are mail jobs (s.mail.jobs) marked chain: <floor>, step: <k>, slot: <the target's slot>.
import { emit, warn, hackerLevel, hooks, addItem, classOf, subOf } from './combat.mjs';
import { BOSSES, SUBS, defaultSub } from './data.mjs';
import { seeded, rollItem, itemLabel } from './gear.mjs';
import { graphOf, locAt, hiddenAt, neighbours, floorName, reached, serverSlot } from './floors.mjs';
import { lairBoss, NETWORK } from './network.mjs';
import { addrsOf, sweepRooms } from './address.mjs';
import { zoneOf, zoneRooms } from './zone.mjs';
import { letter, arm, boardOpen, openContracts, title, CREWS, minutesOf, contractXp } from './mail.mjs';
import { FACTIONS } from './factions.mjs';
import { fill } from './content.mjs';
import STORY_TEXT from './content/story.mjs';
import CONTRACT_TEXT from './content/contracts.mjs';

export const ARC = {
  rarity: { last: 'custom', mid: 'tuned' }, // a pick's three: the last step's a rarity over a contract's item (a blue), a middle step's a blue
  stats: ['damage', 'crit', 'signal', 'restore', 'clock', 'payload'], // what the three lean to: yours first, then two others
  trackers: ['mirror', 'archive', 'lab'], // server kinds with a Tracker (floorplan.mjs KINDS): a heist's target
  own: ['puzzle', 'lair'], // step kinds this module runs (polled); every other kind is a mail.mjs contract type
};
export const CHAINS = Object.fromEntries((CONTRACT_TEXT.floors || []).map((c) => [c.floor, c]));
export const chainOf = (n) => CHAINS[n] || null;
export const arcsOf = (s) => (s.arcs ||= { offers: [] });
export const arcOffer = (s) => s.arcs?.offers?.[0] || null;
const nowOf = () => hooks.now?.() ?? Date.now();
const mix = (...xs) => xs.reduce((h, x) => (Math.imul(h ^ (x >>> 0), 2654435761) + 0x9e3779b9) >>> 0, 0x5eed) || 1;
const shuffled = (r, xs) => xs.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const locById = (s, id) => (s.locations || []).find((l) => l.id === id) || null;
const from = (c) => (c.faction && c.faction !== 'halcyon' ? FACTIONS[c.faction].name : STORY_TEXT.contacts?.[c.from] || c.from);

// ---------- targets ----------
// The floor's main road, from the entry out (floors.mjs marks it: never a rogue server or the lair).
function road(s, n) {
  const g = graphOf(s, n);
  return Object.values(g.nodes).filter((x) => x.main && serverSlot(x)).sort((a, b) => a.d - b.d || a.place - b.place);
}
// The slot a step points at (null: SPRAWL-00's bounty). Steps of a chain go to different servers where the road allows.
export function slotFor(s, n, step) {
  const g = graphOf(s, n), steps = chainOf(n)?.steps || [], k0 = steps.indexOf(step);
  const used = new Set(steps.slice(0, Math.max(0, k0)).map((x) => slotFor(s, n, x)).filter(Boolean));
  const R = road(s, n), k = Math.max(0, Math.min(R.length - 1, step.k || 0)), free = (xs) => xs.find((x) => !used.has(x.id)) || xs[0];
  if (step.at === 'land') return (neighbours(s, g.entry).map((id) => g.nodes[id]).filter(serverSlot).sort((a, b) => a.place - b.place)[0] || R[0])?.id || null;
  if (step.at === 'road') return free([...R.slice(k), ...R.slice(0, k).reverse()])?.id || null;
  if (step.at === 'track') { const t = (x) => ARC.trackers.includes(x.template); return free([...R.slice(k).filter(t), ...R.slice(0, k).reverse().filter(t)])?.id || slotFor(s, n, { at: 'road', k }); }
  if (step.at === 'lair') return g.lair || R.at(-1)?.id || null;
  return null;
}
// A target not located yet: the located server nearest it on the floor's links, and how many links past it.
function frontier(s, slot) {
  const seen = new Set([slot]), q = [[slot, 0]];
  while (q.length) {
    const [id, d] = q.shift(), l = d ? locAt(s, id) : null;
    if (l) return { loc: l, hops: d };
    for (const x of neighbours(s, id)) if (!seen.has(x)) { seen.add(x); q.push([x, d + 1]); }
  }
  return null;
}
const where = (s, c) => {
  if (c.loc) return locById(s, c.loc)?.name || 'a server';
  const f = c.slot && frontier(s, c.slot);
  return f ? `the server ${f.hops > 1 ? `${f.hops} links ` : ''}past ${f.loc.name}` : `a server on ${floorName(c.chain)}`;
};
const bossOf = (s) => BOSSES[lairBoss(s, 'you')]?.name || 'the lair boss';

// ---------- posting a step ----------
function pay(s, n, step) {
  const c = chainOf(n), k = c.steps.indexOf(step), r = step.reward || {}, L = hackerLevel(s), mine = !c.faction || c.faction === 'halcyon';
  const [base, per] = r.credits || [40, 6];
  return { credits: Math.round(base + per * L), standing: mine ? r.rep || 0 : 0, ...(mine ? {} : { rep: r.rep || 0 }), ...(r.pick ? { pick: k >= c.steps.length - 1 ? ARC.rarity.last : ARC.rarity.mid } : {}) }; // pick: the three's rarity
}
function post(s, n, k, at) {
  const c = chainOf(n), step = c.steps[k];
  const job = { type: step.kind, chain: n, step: k, slot: slotFor(s, n, step) };
  if (step.kind === 'bounty') {
    // A SPRAWL-00 room picked from the chain, not the save's dice: a floor job never moves the board's timing.
    const z = zoneOf(s), rooms = zoneRooms().filter((r) => r !== '/net/relay' && !z.spawns[r]?.bounty && !(s.encounter?.zone && s.encounter.room === r));
    Object.assign(job, { name: step.name, family: step.family || 'ransomware', plus: step.plus ?? 1, room: step.room || rooms[mix(n, k, z.seed || 1) % Math.max(1, rooms.length)], ...(step.grade ? { grade: step.grade } : {}) });
  }
  if (step.kind === 'rooms') job.count = step.count || 4;
  if (step.kind === 'item' || step.kind === 'heist') Object.assign(job, { file: step.file, label: step.label, text: [step.line, step.kind === 'heist' ? 'past the Tracker: bank it from a visit it never reached you.' : 'pull it and bank it, then deliver it from Mail.'].filter(Boolean) });
  if (step.kind === 'install') Object.assign(job, { file: step.file, label: step.label, carry: 'stash' });
  const loc = job.slot && locAt(s, job.slot);
  if (loc) job.loc = loc.id;
  else if (job.slot && hiddenAt(s, job.slot)) job.hidden = hiddenAt(s, job.slot).id;
  const vars = varsOf(s, { ...job, chain: n });
  const msg = { from: from(c), subject: fill(step.subject, vars), body: (step.body || []).map((p) => fill(p, vars)) };
  const l = letter(s, msg, at);
  const j = { id: l.id, ...msg, got: 0, at, faction: c.faction || 'halcyon', ...job, reward: pay(s, n, step) };
  j.minutes = minutesOf(j); j.reward.xp = contractXp(hackerLevel(s), j); // fixed now, as the board's are (mail.mjs MINUTES)
  l.job = j.id;
  s.mail.jobs.push(j);
  if (j.type === 'bounty') arm(s, j);
  setup(s, j);
  const A = arcsOf(s);
  A[n] = { ...(A[n] || {}), step: k, at: A[n]?.at ?? at, titles: A[n]?.titles || [] };
  return l;
}
function varsOf(s, j) {
  const loc = j.loc && locById(s, j.loc), label = j.label || '';
  return { handle: s.profile?.handle || 'rookie', server: where(s, j), floor: floorName(j.chain), owner: loc?.owner || 'a crew', crew: CREWS[loc?.family] || 'its crew',
    file: j.file, label, Label: label ? label[0].toUpperCase() + label.slice(1) : '', name: j.name, count: j.count, boss: bossOf(s) };
}
// A step's target located: the plain contract from here (its install room, its file planted, a map already done).
function setup(s, c) {
  if (c.ok) return;
  if (c.type === 'bounty') { c.ok = true; return; }
  const loc = c.loc ? locById(s, c.loc) : c.slot ? locAt(s, c.slot) : null;
  if (!loc) { const h = c.slot && hiddenAt(s, c.slot); if (h) c.hidden = h.id; return; }
  c.loc = loc.id; delete c.hidden;
  const R = loc.floorplan || (() => { try { return hooks.roomsFor?.(s, loc); } catch { return null; } })();
  if (c.type === 'heist' && R?.graph && R.graph.hunter !== 'track') c.type = 'item'; // no Tracker after all: a plain recovery
  if (c.type === 'install') {
    const g = R?.graph;
    if (!g) return; // its rooms come with the first connect
    const ok = sweepRooms(g).filter((id) => id !== g.entry && !['stash', 'core'].includes(g.rooms[id].kind) && !g.rooms[id].extra);
    const room = ok[mix(c.chain, c.step, loc.seed || 1) % Math.max(1, ok.length)] || g.entry;
    Object.assign(c, { room, addr: addrsOf(g)[room] });
  }
  if (c.type === 'rooms') {
    const left = R?.graph ? Object.values(R.graph.rooms).filter((x) => !R.cleared?.[x.id] && !x.nook && !x.optional).length : c.count;
    c.count = Math.max(1, Math.min(c.count, left));
    if (!left) c.got = c.count;
  }
  if (c.type === 'map' && R?.mapped) c.got = 1;
  c.ok = true;
  arm(s, c);
}

// ---------- the clock ----------
// mail.mjs tickMail: open the chains of the floors you've reached, settle targets you've located, and check the steps
// this module runs.
export function arcTick(s, at = nowOf()) {
  if (!s.mail?.jobs || !s.mail.list || !boardOpen(s)) return; // a mail state with no letters (a test's) has nowhere to post
  const A = arcsOf(s);
  for (let n = 1; n <= reached(s); n++) {
    if (!chainOf(n) || A[n]) continue;
    const l = post(s, n, 0, at);
    emit(s, 'mail', `New mail from ${l.from}: ${l.subject}.`, { letter: l.id, from: l.from, subject: l.subject, chain: n });
  }
  for (const c of openContracts(s).filter((x) => x.chain)) {
    setup(s, c);
    if (c.got || !c.ok || !ARC.own.includes(c.type)) continue;
    if (c.type === 'puzzle' ? puzzleWon(s, c) : lairDown(s, c)) { c.got = 1; emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id }); }
  }
}
// A puzzle board on its server won since the step was posted (floorplan.mjs finishPuzzle: puzzles[room] { at, won }).
function puzzleWon(s, c) {
  const loc = locById(s, c.loc), R = s.run?.loc === c.loc && s.rooms?.puzzles ? s.rooms : loc?.floorplan;
  return Object.values(R?.puzzles || {}).some((p) => p?.won && (p.at || 0) >= c.at);
}
// The lair's boss beaten since (rogue.mjs rogueKill: its Core's spawn down, back NETWORK.lairMs after it fell).
function lairDown(s, c) {
  const sp = locById(s, c.loc)?.spawns?.['/core'];
  return !!sp && !sp.alive && sp.respawnAt != null && sp.respawnAt - NETWORK.lairMs >= c.at;
}

// ---------- what mail.mjs asks of a chain's job ----------
// Its title, while its target isn't located or for a kind of its own (null: mail.mjs's own).
export function arcTitle(s, c) {
  if (ARC.own.includes(c.type)) return c.type === 'puzzle' ? `Win a puzzle board on ${where(s, c)}` : `Beat ${bossOf(s)} on ${where(s, c)}`;
  if (c.ok || c.type === 'bounty') return null;
  const w = where(s, c);
  return { map: `Map ${w}`, rooms: `Clear ${c.count} rooms on ${w}`, takeover: `Take over ${w}`, install: `Install ${c.label} on ${w}`, sweep: `Map ${w} without resting`, item: `Recover ${c.file}`, heist: `Recover ${c.file} past the Tracker` }[c.type] || null;
}
export function arcProgress(s, c) {
  if (!c.ok && c.type !== 'bounty') {
    const h = c.slot && hiddenAt(s, c.slot), f = c.slot && frontier(s, c.slot);
    if (h) return { text: `Locate it: the ? past ${f?.loc.name || 'a server you know'}, traced ${h.lead}%`, part: 0.1 * (h.lead / 100) };
    if (c.loc && c.type === 'install') return { text: `Connect to ${where(s, c)} for its room`, part: 0.05 };
    return { text: f ? `${f.hops} links past ${f.loc.name}: trace your way there` : `Somewhere on ${floorName(c.chain)}`, part: 0 };
  }
  if (c.type === 'puzzle') return c.got ? { text: 'Board won', part: 1 } : { text: `Any puzzle room on ${where(s, c)}`, part: 0.3 };
  if (c.type === 'lair') return c.got ? { text: `${bossOf(s)} beaten`, part: 1 } : { text: `In the Core of ${where(s, c)}`, part: 0.3 };
  return null;
}
export const arcReady = (s, c) => ARC.own.includes(c.type) && !!c.got;

// Delivered (mail.mjs mailCommand): the step's title kept for the chain's page, its pick of three, and the next step.
export function arcDelivered(s, c, at = nowOf()) {
  const A = arcsOf(s), n = c.chain, ch = chainOf(n), st = (A[n] ||= { step: c.step, at, titles: [] });
  (st.titles ||= [])[c.step] = title(s, c);
  const step = ch?.steps[c.step];
  const last = !ch || c.step >= ch.steps.length - 1;
  if (step?.reward?.pick) {
    A.offers.push({ floor: n, step: c.step, last, items: pickOf(s, n, c.step, last) });
    emit(s, 'arc-offer', `${ch.title}: pick your reward.`, { chain: n });
  }
  if (last) {
    st.done = true; st.doneAt = at;
    emit(s, 'arc-done', `${ch?.title || 'Floor job'}, done. ${ch?.lore || ''}`.trim(), { chain: n });
    return null;
  }
  const l = post(s, n, c.step + 1, at);
  emit(s, 'mail', `New mail from ${l.from}: ${l.subject}.`, { letter: l.id, from: l.from, subject: l.subject, chain: n });
  return l;
}

// ---------- the reward: one of three ----------
// At your level, each a different slot; the first leans to your class and the stat your subclass chases. Yellows on a
// chain's last step, blues on a middle one: rolled as rarities, so never a unique or a set piece.
export function pickOf(s, n, k, last) {
  const r = seeded(mix(s.floors?.seed || 1, n, k, 77)), L = hackerLevel(s), cls = classOf(s);
  const sub = subOf(s) || defaultSub(cls), mine = SUBS[sub]?.chase?.[0] || 'damage';
  const stats = [mine, ...shuffled(r, ARC.stats.filter((x) => x !== mine)).slice(0, 2)];
  const slots = shuffled(r, ['exploit', 'proxy', 'shell', 'script', ...(L >= 15 ? ['implant'] : [])]).slice(0, 3);
  return stats.map((stat, i) => {
    const it = rollItem(r, { level: L, rarity: last ? ARC.rarity.last : ARC.rarity.mid, stat, slot: slots[i], ...(i === 0 ? { cls } : {}) });
    it.name = it.name.replace(/\b(\w+) \1\b/g, '$1');
    return it;
  });
}
// mail take <n>: the item you picked from the reward waiting first, into your stash.
export function arcTake(s, n) {
  const A = arcsOf(s), o = A.offers[0];
  if (!o) return warn(s, 'No reward waiting.');
  const it = o.items[Number(n) - 1];
  if (!it) return warn(s, `Pick 1 to ${o.items.length}.`);
  const ch = chainOf(o.floor), got = addItem(s, it, `${ch?.title || 'Floor job'}: `);
  A.offers.shift();
  const st = A[o.floor];
  if (st && got) (st.took ||= [])[o.step] = itemLabel(got);
  emit(s, 'arc-reward', `${ch?.title || 'Floor job'}: reward taken.`, { chain: o.floor, item: got?.id || null, name: got ? itemLabel(got) : '' });
  return got;
}
