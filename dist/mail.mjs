// Mail: letters, contracts and the Halcyon retainer. Pure like the combat engine: state in, events out.
//
// The story: Halcyon Mutual, a cyber-insurance giant, pays hacker crews to fight a turf war
// against the rival crews that keep hitting its clients, and doesn't ask how. You are an
// initiate of one of those crews, LOWLIGHT. Halcyon pays a retainer every 30 minutes while your
// standing with it holds. Contracts raise standing; a crash on your own server lowers it, and
// so does work for Halcyon's competitors (GLASSJAW, off the books).
//
// The board: up to ten offers at a time, arriving and expiring at uneven intervals. You take up
// to six; only a taken contract counts. Dropping one costs nothing. The storyline's jobs sit
// beside the board and don't count toward the six.
//
// Contract types: kill (N of a family, or anything in the Sprawl), bounty (one named process in
// a SPRAWL-00 room), takeover (take a server over: its vault, then its Resident), materials (hand over code), item (a
// file in a server's vault: open it, bank the file, deliver it), and since R1 (GAME_RULES.md "Contracts") rooms (clear N
// rooms on a server, first clears) and map (map a server: every room cleared). A takeover or item contract can point at
// a server you haven't found: a relay on its neighbour flags it, and you trace it yourself
// (see hidden.mjs). Contracts pay credits.
//
// Activity contracts (ACTIVITY), wrapping what the game already has, each from its level: grind (many kills of one
// virus family), solve (N puzzle boards, or one of a named kind), decode (N parts researched a tier), sweeps (N log
// sweeps), interrupt (N attacks answered), root (the next Root level on a server you hold) and hold (an invasion
// stopped). contractDid counts them.
//
// XP (WoW's quests): a fixed amount, set when it's posted: its kind's baseline in kills' worth (BASE, from what the job
// asks), times its size (SIZE: a job that counts something pays more for more of it, 15 kills more than 5), times the
// level curve (MAIL.xp) at the level it was posted (contractXp). It comes on top of what the work pays on its own.
//
// Room contracts (ROOM_JOBS): install (carry Halcyon's item to a room's grid address on a server and install it there;
// lose your Signal while it's in your pack and it's gone, the job with it), defuse (break N Encryptors before they
// Encrypt), sweep (one visit, every room but the Core, no rest), exfil (catch an Exfil) and heist (a vault's file past a
// Tracker). No clock: one waits on the board at a time until you take it, outside the five.
import { FAMILIES, ROOM_FAMILIES, CONFIG, STRAINS, along, killXp } from './data.mjs';
import { ROOT } from './root.mjs';
import { PUZZLES } from './puzzles.mjs';
import { LOOT, MATERIALS, rollItem, seeded } from './gear.mjs';
import { emit, warn, hackerLevel, serverLevel, gainXp, deedXpFor, materialsOf, rand, hooks, addLocation, giveUnique, rollDrop, addItem, setDeliver } from './combat.mjs';
import { zoneOf, zoneRooms } from './zone.mjs';
import { hiddenNodes, hiddenNode, syncFlags, items, flagged, spawnHidden } from './hidden.mjs';
import { hiddenNear } from './floors.mjs';
import STORY_TEXT from './content/story.mjs';
import CONTRACT_TEXT from './content/contracts.mjs';
import { fill } from './content.mjs';
import { FACTIONS, changeRep, rippleRep, hostile, captured, rivalServers, hubsOf, hubFound } from './factions.mjs';
import { addrsOf, sweepRooms } from './address.mjs';
import { arcTick, arcTitle, arcProgress, arcReady, arcDelivered, arcTake } from './arcs.mjs';

export const MAIL = {
  periodMs: 30 * 60 * 1000, // the retainer pays every 30 minutes, offline too
  boardAfterMs: 60 * 60 * 1000, // a storyline job marked boardAfterHour (the named process, the first takeover), held this long, opens the board anyway
  maxPeriods: 16, // up to 8 hours of it builds up while you're away
  offers: 10, // offers on the board at once
  take: 6, // contracts you can hold at once (storyline jobs don't count)
  offerEvery: [1 * 60 * 1000, 3 * 60 * 1000], // a new offer arrives somewhere in here (2 min on average)
  burst: 0.15, // sometimes two arrive together
  offerLife: [15 * 60 * 1000, 15 * 60 * 1000], // an offer nobody takes is gone after 15 minutes
  crashHit: 10, // standing lost when your server crashes
  offBooksHit: 8, // standing lost for doing GLASSJAW's work
  offBooksPay: 2.5, // GLASSJAW pays for the risk: 2.5x the credits, 1.5x the XP and a protocol (offBooksXp, delivered)
  offBooksXp: 1.5,
  offBooksChance: 0.2,
  factionShare: 0.5, // of the rest of the board, once the hubs are up: other factions' work
  factionPay: 1.2, // they pay a little better than Halcyon, in credits and their own rep (no Halcyon standing)
  startStanding: 10,
  roomEvery: [8 * 60 * 1000, 20 * 60 * 1000], // a room contract arrives somewhere in here after the last one was taken
  xp: [[1, 3], [5, 8], [10, 13], [20, 13], [30, 11]], // the level curve: a contract's baseline (BASE × SIZE, kills' worth) times this, by the level it was posted at (straight between its points)
};

export { FACTIONS }; // the factions live in factions.mjs now (Halcyon is the first of them)
// Standing with Halcyon sets the retainer (L = server level) and what its store will sell you.
export const TIERS = [
  { min: 0, name: 'Suspended', pay: () => 0 },
  { min: 1, name: 'Probation', pay: (L) => 5 + L },
  { min: 25, name: 'Contractor', pay: (L) => 10 + 2 * L },
  { min: 50, name: 'Trusted', pay: (L) => 15 + 3 * L },
  { min: 75, name: 'Preferred', pay: (L) => 20 + 4 * L },
];
// The rival crews, by the viruses they run.
export const CREWS = { ransomware: 'TOLLGATE', worm: 'SWARMLINE', ghostroot: 'PALEMASK', cryptominer: 'GLASSJAW', wiper: 'TOLLGATE', botnet: 'SWARMLINE', logicbomb: 'TOLLGATE' };

// Who writes to you (content/story.mjs, edited in editor.html).
const SENDERS = new Proxy({}, { get: (_, k) => STORY_TEXT.contacts?.[k] || String(k) });
const now = () => hooks.now?.() ?? Date.now();
export const standing = (s, f = 'halcyon') => (s.standing ||= { halcyon: MAIL.startStanding })[f] ?? 0;
export const tierOf = (s) => [...TIERS].reverse().find((t) => standing(s) >= t.min) || TIERS[0];
export const tierIndex = (s) => TIERS.indexOf(tierOf(s));
export const nextTier = (s) => TIERS.find((t) => t.min > standing(s)) || null;
export const retainer = (s) => tierOf(s).pay(serverLevel(s));
export const unread = (s) => (s.mail?.list || []).filter((m) => !m.read).length;
export const cargo = (s) => (s.cargo ||= []);
export const jobs = (s) => s.mail?.jobs || [];
export const offers = (s) => s.mail?.offers || [];
export const openContracts = (s) => jobs(s).filter((j) => !j.done);
export const doneContracts = (s) => jobs(s).filter((j) => j.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)); // newest first
export const heldCount = (s) => openContracts(s).filter((j) => j.story === undefined && !j.chain).length; // a floor's chain (arcs.mjs) doesn't count either
export const findJob = (s, id) => [...jobs(s), ...offers(s)].find((j) => j.id === id) || null;
export const boardOpen = (s) => !!s.mail?.boardOpen || (s.mail?.story || 0) >= STORY.length;

export function initMail(s, at = now()) {
  if (s.mail?.jobs) return s.mail;
  if (s.mail) return migrateMail(s, at);
  s.mail = { list: [], next: 1, story: 0, jobs: [], offers: [], nextOfferAt: null };
  s.standing ||= { halcyon: MAIL.startStanding };
  s.retainer ||= { at };
  s.cargo ||= [];
  postStory(s, at);
  return s.mail;
}
// v20 saves kept contracts inside letters. Open ones become held jobs; the board starts fresh.
function migrateMail(s, at) {
  const m = s.mail;
  m.jobs = []; m.offers = []; m.nextOfferAt = m.story >= STORY.length ? at : null;
  for (const l of m.list) {
    const c = l.contract;
    if (!c) continue;
    delete l.contract;
    if (c.done) continue;
    m.jobs.push({ ...c, id: l.id, from: l.from, subject: l.subject, body: l.body, reward: { ...c.reward } });
    l.job = l.id;
  }
  return m;
}

// A letter about the game itself (a save migration's word: combat.mjs restore), from a contact by key (wick).
export function systemLetter(s, { from, subject, body }, at = now()) {
  if (!s.mail?.list) return null;
  return letter(s, { from: SENDERS[from], subject, body, system: true }, at);
}
export function letter(s, msg, at = now()) {
  const m = { id: s.mail.next++, at, read: false, ...msg };
  s.mail.list.unshift(m);
  // Keep the inbox short: old letters whose job is finished go first.
  while (s.mail.list.length > 14) {
    const old = [...s.mail.list].reverse().find((x) => !x.job || findJob(s, x.job)?.done || !findJob(s, x.job));
    if (!old) break;
    s.mail.list.splice(s.mail.list.indexOf(old), 1);
  }
  return m;
}

// ---------- the storyline: five initiate jobs, then the board opens ----------
// The story beats are written in content/story.mjs (editor.html). Each is a letter, maybe with a
// job, and a trigger: it arrives once the beat before it is done (its job delivered, or at once if
// it had none), and not before its level or its delay.
const STORY = STORY_TEXT.beats || [];
const crewOf = (fam) => CREWS[fam] || 'an unlicensed crew';
const lower = (x) => String(x || '').toLowerCase();
// A SPRAWL-00 folder's room, by its name on the room map (netrooms.mjs: its rooms keep their folders as path0).
export const sprawlRoom = (s, path) => Object.values(zoneOf(s).floorplan?.graph.rooms || {}).find((r) => r.path0 === path)?.path || path;
// The blanks a letter or contract can use, from its job.
function jobVars(s, j = {}) {
  const loc = j.loc && s.locations.find((l) => l.id === j.loc);
  const took = s.locations.find((l) => l.id === s.mail?.took) || s.locations.find((l) => l.takenOver);
  const label = j.label || '';
  return {
    handle: s.profile?.handle || 'rookie', crewName: 'LOWLIGHT', took: took?.name || 'the server you took over',
    count: j.count, family: j.family ? lower(FAMILIES[j.family]?.name) : 'stray', crew: j.family ? crewOf(j.family) : 'the crews',
    name: j.name, room: j.room ? sprawlRoom(s, j.room) : j.room, amount: j.amount, material: j.material ? lower(MATERIALS[j.material]?.name) : undefined,
    server: loc?.name || (j.any ? 'any server you have traced' : 'a server you haven’t found yet'), owner: loc?.owner,
    file: j.file, label, Label: label ? label[0].toUpperCase() + label.slice(1) : '', strain: j.strain ? STRAINS[j.strain]?.name : undefined,
    addr: j.addr, virus: j.virus ? lower(familyName(j.virus)) : undefined, root: j.root,
    boards: j.type === 'solve' ? (j.kind ? `a ${PUZZLES[j.kind]?.name} board` : `${j.count} puzzle boards`) : undefined,
    logs: j.type === 'sweeps' ? (j.count === 1 ? 'a server\'s incident log' : `${j.count} servers' incident logs`) : undefined,
  };
}
// Turn a written beat into a letter and its job.
function beatLetter(s, beat, k) {
  const job = beat.job ? JSON.parse(JSON.stringify(beat.job)) : null;
  if (job?.type === 'item' && job.near === 'took') {
    // The file sits on an unknown server linked to the one you took over (or, with none left, on its floor).
    const took = s.locations.find((l) => l.id === s.mail.took) || s.locations.find((l) => l.takenOver);
    if (took) spawnHidden(s, took);
    let near = took ? hiddenNear(s, took, { junction: false }) : []; // linked to it: a relay on it can flag it
    if (!near.length && took) near = hiddenNear(s, took);
    if (!near.length) near = hiddenNodes(s).filter((n) => n.depth === (took?.depth || 1) && s.locations.some((l) => l.id === n.via));
    const n = near.find((x) => x.family === job.family) || near[0] || null;
    job.hidden = n?.id || null; job.loc = null;
    delete job.near;
  }
  if (job?.type === 'kill' && job.where === undefined) job.where = job.family ? undefined : 'sprawl';
  const vars = jobVars(s, job || {});
  const msg = { from: SENDERS[beat.from], subject: fill(beat.subject, vars), body: (beat.body || []).map((p) => fill(p, vars)) };
  return { ...msg, job: job ? { ...job, reward: { credits: 0, ...(beat.reward || {}) }, beat: beat.id, story: k } : null };
}
export const STORY_LENGTH = STORY.length;

// Post the next beat if its trigger allows; otherwise it waits (tickMail tries again).
function postStory(s, at = now(), force = false) {
  const m = s.mail;
  m.posted ||= STORY.slice(0, m.story || 0).map((b) => b.id); // saves from before the editor
  const k = STORY.findIndex((b) => !m.posted.includes(b.id));
  if (k < 0) { m.waiting = false; return null; }
  const beat = STORY[k];
  if (m.waiting !== 'armed') { m.waitFrom = at; m.waiting = 'armed'; }
  if (!force && beat.when?.level && hackerLevel(s) < beat.when.level) return null;
  if (!force && beat.when?.delay && at < m.waitFrom + beat.when.delay * 60000) return null;
  m.waiting = false;
  m.posted.push(beat.id);
  m.story = (m.story || 0) + 1;
  const { job, ...msg } = beatLetter(s, beat, k);
  const l = letter(s, msg, at);
  if (job) {
    const j = { id: l.id, from: msg.from, subject: msg.subject, body: msg.body, got: 0, at, ...job };
    j.xpFixed = true; j.reward.xp = contractXp(hackerLevel(s), j); // like the board's: its kind and size, at your level
    m.jobs.push(j);
    l.job = j.id;
    arm(s, j);
  }
  if (beat.opensBoard && !m.boardOpen) { m.boardOpen = true; for (let i = 0; i < 3; i++) offer(s, at); m.nextOfferAt = at + gap(s); postSides(s, at); }
  // A letter with no job doesn't hold the story up: the next beat is on its way.
  if (!job) m.waiting = STORY.some((b) => !m.posted.includes(b.id)) ? 'armed' : false, m.waitFrom = at;
  return l;
}
// The editor's "Play from here": a test save at a beat, with what the story has given you by then
// (a traced server, the one you took over, the open board), the beat's letter waiting in Mail.
export function storyAt(s, id, at = now()) {
  const k = Math.max(0, STORY.findIndex((b) => b.id === id));
  const before = STORY.slice(0, k);
  const level = Math.max(1, ...STORY.slice(0, k + 1).map((b) => b.when?.level || 1));
  s.hackers = { [s.loadout?.archetype || 'breaker']: { level, xp: 0 } };
  s.mail = { list: [], next: 1, story: k, posted: before.map((b) => b.id), jobs: [], offers: [], nextOfferAt: null, boardOpen: before.some((b) => b.opensBoard) };
  s.standing ||= { halcyon: MAIL.startStanding };
  s.standing.halcyon = Math.max(s.standing.halcyon, MAIL.startStanding + before.reduce((n, b) => n + (b.reward?.standing || 0), 0));
  s.retainer = { at }; s.cargo ||= [];
  if (!s.locations.length) addLocation(s, 'worm', 1);
  if (before.some((b) => b.job?.type === 'takeover')) { const loc = s.locations[0]; loc.takenOver = true; s.mail.took = loc.id; if (before.some((b) => b.reward?.relay)) items(s).relay += 1; }
  if (s.mail.boardOpen) { for (let i = 0; i < 3; i++) offer(s, at); s.mail.nextOfferAt = at + gap(s); postSides(s, at); }
  return postStory(s, at, true);
}
// A beat waiting on a level or a delay: post it when it's ready.
function storyTick(s, at) {
  const m = s.mail;
  if (!m.waiting) return;
  const l = postStory(s, at);
  if (l) emit(s, 'mail', `New mail from ${l.from}: ${l.subject}.`, { letter: l.id, from: l.from, subject: l.subject });
}

// ---------- targets ----------
// A takeover or item contract points at a found server you haven't taken over, or at an unknown
// server one hop past one you've found (you'll need a relay to flag it, then trace it yourself).
const targeted = (s) => new Set([...jobs(s), ...offers(s)].filter((j) => !j.done).flatMap((j) => [j.loc, j.hidden]).filter(Boolean));
function pickTarget(s) {
  const busy = targeted(s);
  const found = s.locations.filter((l) => !l.takenOver && !l.rogue && !busy.has(l.id)); // a rogue server can't be taken
  const hid = hiddenNodes(s).filter((n) => !busy.has(n.id) && s.locations.some((l) => l.id === n.via));
  // Unknown servers next to one of your relays (or one you could put a relay on) come first.
  const near = hid.filter((n) => s.locations.find((l) => l.id === n.via)?.takenOver);
  const pool = near.length && rand(s) < 0.7 ? near.map((n) => ({ hidden: n.id })) : [...found.map((l) => ({ loc: l.id })), ...hid.map((n) => ({ hidden: n.id }))];
  return pool.length ? pool[Math.floor(rand(s) * pool.length)] : null;
}
export const targetedHidden = (s, id) => openContracts(s).some((j) => j.hidden === id && !j.loc);

// Taking a contract sets things up in the world: the named process, the planted file, the flags.
export function arm(s, j) {
  // "Take over any server": one you already hold counts.
  if (j.type === 'takeover' && j.any && !j.took) { const mine = s.locations.find((l) => l.takenOver); if (mine) { j.took = mine.id; s.mail.took = mine.id; } }
  if (j.type === 'bounty') {
    const z = zoneOf(s);
    // Never RELAY-KING's /net/relay: on rooms it's SPRAWL-00's Core, sealed until level 3 (netrooms.mjs).
    const rooms = zoneRooms().filter((r) => r !== '/net/relay' && !(s.encounter?.zone && s.encounter.room === r) && !z.spawns[r]?.bounty);
    const room = j.room && rooms.includes(j.room) ? j.room : rooms[Math.floor(rand(s) * rooms.length)] || zoneRooms()[0];
    j.room = room;
    // Two levels above the level it was posted at; a story bounty can set its own step and cap (claimjack: one up, never above 4) and come unmutated.
    if (!j.spawnSet) { j.level = Math.min(j.maxLevel || Infinity, CONFIG.zone.maxLevel + 2, (j.level ?? hackerLevel(s)) + (j.plus ?? 2)); j.spawnSet = true; }
    z.spawns[room] = { alive: true, family: j.family, level: j.level, seed: (z.seed * 97 + j.id * 977) >>> 0, name: j.name, bounty: true, ...(j.grade ? { grade: j.grade } : {}), ...(j.calm ? { calm: true } : {}) }; // a story bounty can be an elite (grade 2+)
  }
  if ((j.type === 'item' || j.type === 'heist') && j.loc) plant(s, j);
  if (j.type === 'install' && s.run?.rooms && s.run.loc === j.loc) contractConnect(s, s.locations.find((l) => l.id === j.loc)); // taken on its server: in your pack at once
  syncFlags(s);
}
function plant(s, j) {
  const loc = s.locations.find((l) => l.id === j.loc);
  if (loc && !(loc.extraFiles || []).some((f) => f.name === j.file)) (loc.extraFiles ||= []).push({ name: j.file, label: j.label, text: j.text });
}
function disarm(s, j) {
  const loc = s.locations.find((l) => l.id === j.loc);
  if (loc?.extraFiles && (j.type === 'item' || j.type === 'heist')) loc.extraFiles = loc.extraFiles.filter((f) => f.name !== j.file);
  if (j.type === 'install' && s.run?.pack) s.run.pack = s.run.pack.filter((f) => !(f.kind === 'payload' && f.contract === j.id)); // dropped: its item goes with it
  if (j.type === 'bounty') { const sp = zoneOf(s).spawns[j.room]; if (sp?.name === j.name) delete sp.bounty; }
}

// ---------- the board ----------
const pick = (s, list) => list[Math.floor(rand(s) * list.length)];
const between = (s, [lo, hi]) => Math.round(lo + rand(s) * (hi - lo));
const gap = (s) => between(s, MAIL.offerEvery);
const CODES = ['cipher', 'worm', 'kernel'];

// A side to pick (WoW's Aldor or Scryers), telegraphed: when the board opens, KESTREL and NULL CHOIR
// (rivals of each other) both make an offer that waits on the board. Take one and the other is gone;
// delivering it pays that faction's rep, and the ripple turns its rival against you.
export const SIDES = [['kestrel', 'nullchoir'], ['nullchoir', 'kestrel']];
function postSides(s, at) {
  if (s.mail.sidesPosted) return;
  s.mail.sidesPosted = true;
  for (const [f, against] of SIDES) s.mail.offers.push({ id: s.mail.next++, from: FACTIONS[f].name, got: 0, at, expiresAt: at + 10 * 365 * 24 * 3600000, type: 'side', faction: f, against,
    subject: `${FACTIONS[f].short} wants an answer`, body: [`${FACTIONS[f].short} and ${FACTIONS[against].short} are at war. Pick ${FACTIONS[f].short} and gain 20 rep with them, but ${FACTIONS[against].short} will not forget it.`, 'Take this and the other offer is gone.'],
    reward: { credits: 0, standing: 0, rep: 20 } });
}
export function offer(s, at = now()) {
  const L = hackerLevel(s);
  const off = standing(s) >= 10 && rand(s) < MAIL.offBooksChance;
  // Once the hubs are up, about half the board is other factions' work (not ones that hate you).
  const others = hubsOf(s).length ? ['kestrel', 'lantern', 'nullchoir'].filter((f) => hubFound(s, f) && !hostile(s, f) && !captured(s, f)) : []; // only factions whose hub you've found send work
  const faction = off ? 'glassjaw' : others.length && rand(s) < MAIL.factionShare ? pick(s, others) : 'halcyon';
  const theirs = faction !== 'halcyon' && faction !== 'glassjaw';
  const rivals = theirs ? rivalServers(s, faction).filter((l) => !targeted(s).has(l.id)) : [];
  const target = rivals.length && rand(s) < 0.6 ? { loc: pick(s, rivals).id } : pickTarget(s);
  // Named processes live in SPRAWL-00: posted only while it's still your level (it tops out at CONFIG.zone.maxLevel).
  const roomsAt = roomsTarget(s), mapAt = mapTarget(s);
  const rootAt = rootTarget(s), logs = unswept(s);
  const acts = Object.keys(ACTIVITY).filter((k) => L >= ACTIVITY[k].from && (k !== 'root' || rootAt) && (k !== 'sweeps' || logs.length) && (k !== 'hold' || tracedOf(s).length));
  const kinds = (off ? ['materials', 'item', 'kill', 'rooms'] : ['kill', 'kill', 'bounty', 'bounty', 'materials', 'takeover', 'item', 'item', 'rooms', 'rooms', 'map', ...acts]).filter((k) => (target || !['takeover', 'item'].includes(k)) && (k !== 'bounty' || L <= CONFIG.zone.maxLevel + 2) && (k !== 'rooms' || roomsAt) && (k !== 'map' || mapAt));
  // Strain contracts (RuneScape Slayer): once strains are open at your level, a quarter of the board.
  const strainsOpen = Object.keys(STRAINS).filter((k) => STRAINS[k].from <= L && L >= CONFIG.zone.maxLevel + 2);
  const type = !off && strainsOpen.length && rand(s) < 0.25 ? 'strain' : pick(s, kinds);
  const fam = pick(s, Object.keys(CREWS));
  const pay = (base, per) => Math.round((base + per * L) * (off ? MAIL.offBooksPay : theirs ? MAIL.factionPay : 1));
  const hit = off ? { standing: -MAIL.offBooksHit } : {};
  const repFor = (n) => (theirs ? { standing: 0, rep: n } : {}); // other factions pay in their own rep
  const T = CONTRACT_TEXT;
  let j;
  if (type === 'strain') {
    const count = 3 + (L >= 15 ? 1 : 0) + (L >= 30 ? 1 : 0);
    j = { type, strain: pick(s, strainsOpen), count, reward: { credits: pay(40, 6), standing: 5, ...repFor(5) } };
  } else if (type === 'kill') {
    const count = 3 + (L >= 10 ? 1 : 0) + (L >= 30 ? 1 : 0);
    j = { type, family: fam, count, reward: { credits: pay(30, 5), standing: 5, ...hit, ...repFor(5) } };
  } else if (type === 'bounty') {
    const name = `${pick(s, T.bountyNames?.length ? T.bountyNames : ['lapsejack'])}-${String(1000 + Math.floor(rand(s) * 9000))}`;
    j = { type, family: fam, name, reward: { credits: pay(40, 6), standing: 5, ...repFor(5) } };
  } else if (type === 'materials') {
    const m = pick(s, CODES), amount = 2 + Math.floor(L / 8);
    j = { type, material: m, amount, reward: { credits: pay(35, 6), standing: 5, ...hit, ...repFor(5) } };
  } else if (type === 'rooms') {
    const count = 4 + Math.floor(L / 10);
    j = { type, loc: roomsAt.id, count, reward: { credits: pay(35, 6), standing: 5, ...hit, ...repFor(5) } };
  } else if (type === 'map') {
    j = { type, loc: mapAt.id, reward: { credits: pay(60, 10), standing: 7, ...repFor(7) } };
  } else if (type === 'takeover') {
    j = { type, ...target, reward: { credits: pay(60, 10), standing: 8, ...repFor(8) } };
  } else if (ACTIVITY[type]) {
    j = { type, ...ACTIVITY[type].job(s, L, { rootAt, logs }), reward: { credits: pay(35, 6), standing: 5, ...repFor(5) } };
  } else {
    const f = pick(s, T.files?.length ? T.files : [{ file: 'policy.db', label: 'a stolen policy database', line: 'binary: policy records.' }]);
    j = { type, ...target, file: f.file, label: f.label, text: [f.line, off ? 'GLASSJAW wants it. Halcyon wants it more.' : 'pull it and bank it, then deliver it from Mail.'],
      reward: { credits: pay(50, 8), standing: 6, ...hit, ...repFor(6) } };
  }
  // Its XP, fixed now (its kind and size at this level). GLASSJAW's work is worth the standing it costs: more XP, and a protocol on delivery.
  j.xpFixed = true; j.reward.xp = contractXp(L, j);
  if (off) { j.reward.xp = Math.round(j.reward.xp * MAIL.offBooksXp); j.reward.drop = true; }
  // Halcyon sends a relay with one server job at a time, while you have none.
  if (faction === 'halcyon' && !off && ['takeover', 'item'].includes(type) && !items(s).relay && ![...openContracts(s), ...offers(s)].some((c) => c.reward?.relay)) j.reward.relay = 1;
  // The words: a variant from content/contracts.mjs, for this kind and side.
  const kind = ['takeover', 'item'].includes(type) && !j.loc ? type + '-unknown' : type;
  const side = off ? 'glassjaw' : 'halcyon';
  const variants = T[kind]?.[side]?.length ? T[kind][side] : T[kind]?.halcyon || [{ subject: kind, body: [''] }];
  const v = pick(s, variants);
  const vars = jobVars(s, j);
  const from = theirs ? FACTIONS[faction].name : v.from ? SENDERS[v.from] : off ? SENDERS.glassjaw : pick(s, [SENDERS.claims, SENDERS.claims, SENDERS.wick]);
  j = { subject: fill(v.subject, vars), body: (v.body || []).map((p) => fill(p, vars)).filter(Boolean), ...j };
  const o = { id: s.mail.next++, from, got: 0, at, level: L, expiresAt: at + between(s, MAIL.offerLife), ...j };
  if (off) o.offBooks = true;
  o.faction = faction;
  s.mail.offers.push(o);
  return o;
}

// A server with first clears left for a rooms job (yours, rogue or not, SPRAWL-00 aside), and one to map: a traced
// server not Mapped yet, never a rogue server's (they keep up with you).
const busyLoc = (s) => new Set([...jobs(s), ...offers(s)].filter((j) => !j.done).map((j) => j.loc).filter(Boolean));
const roomsLeft = (l) => { const R = l.floorplan; return R ? Object.values(R.graph.rooms).filter((x) => !R.cleared[x.id] && counted(x)).length : 6; };
function roomsTarget(s) { const busy = busyLoc(s), pool = (s.locations || []).filter((l) => !l.member && !l.farm && !busy.has(l.id) && !(l.fresh && l.detached) && roomsLeft(l) >= 4); return pool.length ? pool[Math.floor(rand(s) * pool.length)] : null; }
function mapTarget(s) { const busy = busyLoc(s), pool = (s.locations || []).filter((l) => !l.rogue && !l.member && !busy.has(l.id) && !(l.fresh && l.detached) && !l.floorplan?.mapped); return pool.length ? pool[Math.floor(rand(s) * pool.length)] : null; }

// ---------- activity contracts ----------
// Each from its level, posted only when there's something to do it on. job: what it asks, at level L.
//   grind      many kills of one virus family open at your level (families.mjs OPENS), 4 levels under at most
//   solve      N puzzle boards won, or one of a kind a server you've traced has (PUZZLES)
//   decode     N parts researched a tier (research.mjs: decoded, its rule, mastered)
//   sweeps     a log sweep, or two: posted while a thread's temporary server has a process log unswept
//   interrupt  N attacks answered: a cast stopped, a charge or a seal blocked (tells.mjs)
//   root       the next Root level on a server you hold (root.mjs ROOT.need)
//   hold       an invasion stopped, at your wall or by you (invasion.mjs)
// (Rooms n/N and the families open at a level come through hooks: floorplan.mjs, which imports this module.)
const counted = (x) => (hooks.counted ? hooks.counted(x) : !x.nook && !x.optional), familyName = (id) => (FAMILIES[id] || ROOM_FAMILIES[id])?.name || id;
const puzzleKindsHeld = (s) => [...new Set(tracedOf(s).flatMap((l) => Object.values(roomsOfLoc(s, l)?.graph?.rooms || {}).map((x) => x.kind)).filter((k) => PUZZLES[k]))];
export const ACTIVITY = {
  grind: { from: 3, job: (s, L) => ({ virus: pick(s, hooks.familiesAt?.(L) || Object.keys(FAMILIES)), count: 12 + 2 * Math.floor(L / 5) }) },
  decode: { from: 2, job: (s, L) => ({ count: 2 + Math.floor(L / 15) }) },
  solve: { from: 4, job: (s, L) => { const named = puzzleKindsHeld(s); return named.length && rand(s) < 0.4 ? { kind: pick(s, named), count: 1 } : { count: 2 + (L >= 20 ? 1 : 0) }; } },
  sweeps: { from: 4, job: (s, L, { logs }) => ({ count: Math.min(2, logs.length) }) },
  hold: { from: 5, job: () => ({ count: 1 }) },
  root: { from: 5, job: (s, L, { rootAt: l }) => { const r = l.root || { level: 1, cleared: 0 }; return { loc: l.id, root: r.level + 1, fights: Math.max(1, ROOT.need[r.level + 1] - (r.cleared || 0)) }; } },
  interrupt: { from: 10, job: (s, L) => ({ count: 6 + Math.floor(L / 10) }) },
};
// A server you hold with a Root level still to reach (and no root job on it), and the logs waiting to be swept: a
// thread's temporary server's process log (threads.mjs; the old file system's incident files count too, forensics.mjs).
const heldLoc = (l) => !!l.takenOver && !l.rogue && !l.member && !l.zone && !l.trunk;
function rootTarget(s) { const busy = busyLoc(s), pool = (s.locations || []).filter((l) => heldLoc(l) && (l.root?.level || 1) < ROOT.max && !busy.has(l.id)); return pool.length ? pick(s, pool) : null; }
const unswept = (s) => (s.locations || []).filter((l) => l.temp?.sweep && !l.temp.sweep.solved);
// One more of an activity (contractDid's what: solve, decode, sweeps, interrupt, hold); arg: the puzzle kind a Solve
// job may name. A crewmate's state (s.who) never counts.
export function contractDid(s, what, arg = null) {
  if (!s?.mail?.jobs || s.who) return;
  for (const c of openContracts(s)) {
    if (c.type !== what || c.got >= c.count || (c.kind && c.kind !== arg)) continue;
    c.got++;
    if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
  }
}
// A room cleared for the first time (netrooms.mjs): rooms jobs on that server count it.
export function contractRooms(s, loc) {
  for (const c of openContracts(s)) {
    if (c.type !== 'rooms' || c.loc !== loc.id || c.got >= c.count) continue;
    c.got++;
    if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
  }
}
// A server Mapped (netrooms.mjs): its map job is done.
export function contractMapped(s, loc) {
  for (const c of openContracts(s)) {
    if (c.type !== 'map' || c.loc !== loc.id || c.got) continue;
    c.got = 1;
    emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
  }
}

// ---------- room contracts ----------
// No clock: one waits on the board at a time (it doesn't count toward the five), from its level, until you take it; a
// new one comes MAIL.roomEvery after. Halcyon's work. Each kind once at a time (none you already hold).
//   install  Halcyon's item (content/contracts.mjs installs), for a room's grid address on a traced server (often one you
//            haven't been in yet: the address is the point). It waits in your stash and goes in your pack when you
//            connect to that server; install it in that room (`install`, or the room card's button). Jacking out
//            brings it home; losing your Signal with it in the pack loses it, and the job fails.
//   defuse   break N Encryptors (ransomware's) before they land an Encrypt, in any fight. A cut Encrypt never landed.
//   sweep    one visit to a server at or under your level, small or medium: stand in every room but the Core (and any
//            only the Core leads to) with nothing live in it, and never rest (no rest room, no Defrag Bay). Jack out
//            and the next visit starts again.
//   exfil    catch an Exfil on any rogue server: break its Uplink before its upload lands.
//   heist    a file planted in the vault of a server with a Tracker: bank it from a visit the Tracker never reached
//            you. If it did, the file is flagged and goes back to the vault for another try.
export const ROOM_JOBS = { defuse: { from: 4 }, install: { from: 5 }, exfil: { from: 6 }, sweep: { from: 8 }, heist: { from: 8 } };
const ROOM_FROM = Math.min(...Object.values(ROOM_JOBS).map((j) => j.from));
const INSTALLS = [{ file: 'canary.ko', label: 'a Halcyon canary' }, { file: 'tap.so', label: 'a logging tap' }, { file: 'patch.sh', label: 'a patch script' }];
const tracedOf = (s) => (s.locations || []).filter((l) => !l.rogue && !l.member && !l.farm && !l.lair && !l.zone && !(l.fresh && l.detached));
const roomsOfLoc = (s, l) => { try { return l.floorplan || hooks.roomsFor?.(s, l) || null; } catch { return null; } };
const plainRogueLoc = (l) => !!l.rogue && ['nest', 'pit', 'gauntlet'].includes(l.rogue.kind) && !l.occupied && !l.lair && !l.farm;
function roomJob(s, kind) {
  const L = hackerLevel(s), pay = (base, per) => Math.round(base + per * L), busy = busyLoc(s), T = CONTRACT_TEXT;
  const free = tracedOf(s).filter((l) => !busy.has(l.id));
  if (kind === 'install') {
    const pool = free.map((l) => ({ l, R: roomsOfLoc(s, l) })).filter((x) => x.R?.graph);
    if (!pool.length) return null;
    const { l, R } = pick(s, pool), g = R.graph, ok = sweepRooms(g).filter((id) => id !== g.entry && !['stash', 'core'].includes(g.rooms[id].kind) && !g.rooms[id].extra);
    if (!ok.length) return null;
    const room = pick(s, ok), it = pick(s, T.installs?.length ? T.installs : INSTALLS);
    return { type: kind, loc: l.id, room, addr: addrsOf(g)[room], file: it.file, label: it.label, carry: 'stash', reward: { credits: pay(55, 9), standing: 7, ...(rand(s) < 1 / 3 ? { drop: true } : {}) } };
  }
  if (kind === 'defuse') return { type: kind, count: 3 + (L >= 20 ? 1 : 0), reward: { credits: pay(40, 7), standing: 6 } };
  if (kind === 'exfil') return (s.locations || []).some(plainRogueLoc) ? { type: kind, reward: { credits: pay(45, 7), standing: 6 } } : null;
  if (kind === 'sweep') {
    const pool = free.filter((l) => (l.level || 1) <= L).map((l) => ({ l, R: roomsOfLoc(s, l) })).filter((x) => x.R?.graph && ['small', 'medium'].includes(x.R.size));
    if (!pool.length) return null;
    const { l, R } = pick(s, pool), k = R.size === 'medium' ? 1.3 : 1;
    return { type: kind, loc: l.id, size: R.size, reward: { credits: Math.round(pay(70, 11) * k), standing: 8, drop: true } };
  }
  if (kind === 'heist') {
    const pool = free.filter((l) => { const g = roomsOfLoc(s, l)?.graph; return g?.hunter === 'track' && g.vaults?.[0]; });
    if (!pool.length) return null;
    const l = pick(s, pool), f = pick(s, T.files?.length ? T.files : [{ file: 'policy.db', label: 'a stolen policy database', line: 'binary: policy records.' }]);
    return { type: kind, loc: l.id, file: f.file, label: f.label, text: [f.line, 'past the Tracker: bank it from a visit it never reached you.'], reward: { credits: pay(65, 10), standing: 8, ...(rand(s) < 0.5 ? { drop: true } : {}) } };
  }
  return null;
}
// One room contract on the board: a kind open at your level (want: that kind only), or null when none fits now.
export function roomOffer(s, at = now(), want = null) {
  const L = hackerLevel(s), held = new Set(openContracts(s).map((c) => c.type));
  const kinds = Object.keys(ROOM_JOBS).filter((k) => L >= ROOM_JOBS[k].from && !held.has(k) && (!want || k === want)).sort(() => rand(s) - 0.5);
  for (const kind of kinds) {
    const j = roomJob(s, kind);
    if (!j) continue;
    const v = pick(s, CONTRACT_TEXT[kind]?.halcyon?.length ? CONTRACT_TEXT[kind].halcyon : [{ subject: kind, body: [''] }]), vars = jobVars(s, j);
    j.xpFixed = true; j.reward.xp = contractXp(L, j);
    const o = { id: s.mail.next++, from: v.from ? SENDERS[v.from] : SENDERS.claims, got: 0, at, level: L, expiresAt: at + 10 * 365 * 24 * 3600000, waits: true, faction: 'halcyon',
      subject: fill(v.subject, vars), body: (v.body || []).map((p) => fill(p, vars)).filter(Boolean), ...j };
    s.mail.offers.push(o);
    return o;
  }
  return null;
}
// A waiting offer whose target is gone (its server lost, its Tracker gone) leaves the board.
function roomJobOk(s, o) {
  if (!o.loc) return o.type !== 'exfil' || (s.locations || []).some(plainRogueLoc);
  const l = tracedOf(s).find((x) => x.id === o.loc), g = l && roomsOfLoc(s, l)?.graph;
  return !!g && (o.type !== 'install' || !!g.rooms[o.room]) && (o.type !== 'heist' || g.hunter === 'track');
}
// The item you carry for this room (an Install job's label), or null.
export function payloadFor(s, loc, room) {
  const c = openContracts(s).find((x) => x.type === 'install' && !x.got && x.loc === loc.id && x.room === room?.id);
  return c && s.run?.pack?.some((f) => f.kind === 'payload' && f.contract === c.id) ? c.label : null;
}
// Connected to a server: an Install job's item goes from your stash into your pack.
export function contractConnect(s, loc) {
  for (const c of openContracts(s)) {
    if (c.type !== 'install' || c.got || c.loc !== loc.id || !s.run || s.run.pack.some((f) => f.kind === 'payload' && f.contract === c.id)) continue;
    s.run.pack.push({ path: `#payload-${c.id}`, name: c.file, kind: 'payload', contract: c.id, label: c.label, loc: loc.id });
    c.carry = 'pack';
    emit(s, 'rooms-good', `${cap(c.label)} is in your pack. Install it at ${c.addr}.`, { contract: c.id });
  }
}
// Jacked out with it (run.mjs bank): back in your stash for the next run.
export function payloadHome(s, f) {
  const c = openContracts(s).find((x) => x.id === f.contract);
  if (c && !c.got) { c.carry = 'stash'; emit(s, 'info', `${cap(c.label)} goes back in your stash for next time.`, { contract: c.id }); }
}
// Disconnected (combat.mjs disconnect, past Deadman's Switch): an item in the pack is lost, and its job fails. It can
// come round again later.
// Returns the failed jobs' titles (the Disconnected card lists them).
export function contractPackLost(s, run) {
  const failed = [];
  for (const f of (run?.pack || []).filter((x) => x.kind === 'payload')) {
    const c = openContracts(s).find((x) => x.id === f.contract);
    if (!c) continue;
    s.mail.jobs.splice(s.mail.jobs.indexOf(c), 1);
    failed.push(title(s, c));
    emit(s, 'warning', `Contract failed: ${title(s, c)}. ${cap(c.label)} went down with your Signal.`, { contract: c.id, failed: true });
  }
  return failed;
}
// `install` (or `plant`) in a room on a server you carry an item for: undefined if you carry none for this server or
// you named a program (install <program> builds); true when it's said its piece.
export function contractInstall(s, loc, room, arg = null) {
  const mine = openContracts(s).filter((c) => c.type === 'install' && !c.got && c.loc === loc.id && s.run?.pack?.some((f) => f.kind === 'payload' && f.contract === c.id));
  const named = (c) => !arg || [c.file, c.file.split('.')[0], c.label, c.label.replace(/^an? /, '')].some((x) => x.toLowerCase() === String(arg).toLowerCase());
  const want = mine.filter(named);
  if (!want.length) return undefined;
  const c = want.find((x) => x.room === room.id);
  if (!c) { warn(s, `${cap(want[0].label)} goes in ${want[0].addr}, not here (${addrsOf(s.rooms.graph)[room.id]}).`); return true; }
  s.run.pack = s.run.pack.filter((f) => !(f.kind === 'payload' && f.contract === c.id));
  c.got = 1; c.carry = 'done';
  emit(s, 'rooms-good', `${cap(c.label)} installed at ${c.addr}.`, { contract: c.id });
  emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
  return true;
}
// An Encryptor broken before it encrypted you (combat.mjs).
export function contractDefuse(s) {
  if (!s.mail?.jobs) return;
  for (const c of openContracts(s)) {
    if (c.type !== 'defuse' || c.got >= c.count) continue;
    c.got++;
    if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
  }
}
// An Exfil's archive recovered (netrooms.mjs).
export function contractExfil(s) {
  for (const c of openContracts(s)) if (c.type === 'exfil' && !c.got) { c.got = 1; emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id }); }
}
const rested = (R) => !!R?.visit?.rested || Object.keys(R?.visit?.bays || {}).length > 0;
// You stood in a room clear (floorplan.mjs): a sweep of this server is done when this visit has stood in every room
// but the Core, and never rested.
export function contractStood(s, loc, R) {
  for (const c of openContracts(s)) {
    if (c.type !== 'sweep' || c.got || c.loc !== loc.id || rested(R)) continue;
    if (sweepRooms(R.graph).every((id) => R.visit?.stood?.[id])) { c.got = 1; emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id }); }
  }
}
// The rooms a job marks on its server's map (an Install's room, a heist's vault), with the job's title.
// fights: the live viruses in the rooms you know on it ({ id, family, zone, name, level, strain, encrypts, core,
// server }, netrooms.mjs): a kill, strain or bounty job marks the rooms whose virus would count, a defuse job the ones
// with an Encryptor, a takeover the Core. Several jobs on one room read as one line.
export function roomMarks(s, loc, fights = []) {
  const out = {}, add = (id, c) => { if (id) out[id] = out[id] ? `${out[id]}; ${title(s, c)}` : title(s, c); };
  for (const c of openContracts(s).filter((x) => x.loc === loc.id)) {
    if (c.type === 'install' && !c.got) add(c.room, c);
    if (c.type === 'heist' && !ready(s, c)) add(loc.floorplan?.graph.vaults?.[0], c);
  }
  for (const f of fights) {
    for (const c of wantedBy(s, f)) add(f.id, c);
    if (f.encrypts) for (const c of openContracts(s)) if (c.type === 'defuse' && c.got < c.count) add(f.id, c);
    if (f.core && f.server && !loc.takenOver) for (const c of openContracts(s)) if (c.type === 'takeover' && !ready(s, c) && (c.any || c.loc === loc.id)) add(f.id, c);
  }
  return out;
}
// The jobs on a server and how far along each is (the room page's strip).
export const jobsOn = (s, loc) => openContracts(s).filter((c) => c.loc === loc.id).map((c) => ({ id: c.id, title: title(s, c), text: progress(s, c).text, ready: ready(s, c) }));
const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : '');

// ---------- progress ----------
// A kill anywhere: { family, zone, bounty (spawn name) }.
// The open contracts a kill would count for (the same test as contractKill): for the marker on
// a virus or a guarded folder in a run's listing.
// Strain contracts: every fifth one in a row pays double and rolls for the strain's trophy; dropping one resets it.
export const SLAYER = { every: 5 };
// What a contract's XP counts as in the XP mix (combat.mjs gainXp): the activity behind it.
const CONTRACT_KIND = { puzzle: 'intel', lair: 'fight', side: null, strain: 'fight', kill: 'fight', bounty: 'fight', materials: 'fight', takeover: 'breakin', item: 'breakin', rooms: 'fight', map: 'breakin', install: 'breakin', defuse: 'fight', sweep: 'breakin', exfil: 'fight', heist: 'breakin', grind: 'fight', solve: 'intel', decode: 'intel', sweeps: 'intel', interrupt: 'fight', root: 'build', hold: 'fight' };
// A kill contract counts kills no more than 4 levels under the level it was posted at.
export const KILL_RANGE = 4;
const inRange = (c, level) => level == null || c.level == null || level >= c.level - KILL_RANGE;
export function wantedBy(s, { family, zone, name = null, level = null, strain = null, virus = family }) {
  return openContracts(s).filter((c) => (c.type === 'grind' && c.got < c.count && inRange(c, level) && c.virus === virus) || (c.type === 'strain' && c.got < c.count && strain === c.strain && inRange(c, level)) || (c.type === 'kill' && c.got < c.count && inRange(c, level) && (c.where === 'sprawl' ? zone : !c.family || c.family === family)) || (c.type === 'bounty' && !c.got && name && name === c.name));
}
export function contractKill(s, { family, zone, bounty: tag, level = null, strain = null, virus = family }) {
  for (const c of openContracts(s)) {
    if (c.type === 'grind' && c.got < c.count && inRange(c, level) && c.virus === virus) {
      c.got++;
      if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
    }
    if (c.type === 'strain' && c.got < c.count && strain === c.strain && inRange(c, level)) {
      c.got++;
      if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
    }
    if (c.type === 'kill' && c.got < c.count && inRange(c, level) && (c.where === 'sprawl' ? zone : !c.family || c.family === family)) {
      c.got++;
      if (level != null) { c.lvSum = (c.lvSum || 0) + level; c.lvN = (c.lvN || 0) + 1; } // it pays at the level of the kills that filled it
      if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
    }
    if (c.type === 'bounty' && !c.got && tag === c.name) { c.got = 1; emit(s, 'contract-ready', `${c.name} is down. Contract ready. Deliver it from Mail.`, { contract: c.id }); }
  }
}
// The Resident beaten (run.mjs /core): the server is yours.
export function contractTakeover(s, loc) {
  if (loc.takenOver) return;
  loc.takenOver = true;
  gainXp(s, deedXpFor(s, loc.level || 1, 1.5), `${loc.name} taken over`, 'breakin');
  emit(s, 'takeover', `${loc.name} TAKEN OVER. ${CREWS[loc.family] || loc.owner} just lost a server.`, { location: loc.id });
  for (const c of openContracts(s)) {
    if (c.type !== 'takeover') continue;
    if (c.any && !c.took) { c.took = loc.id; s.mail.took = loc.id; }
    if (c.any ? c.took === loc.id : c.loc === loc.id) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
  }
}
// An unknown server you traced: contracts aimed at it follow it there.
export function contractLocated(s, n, loc) {
  for (const j of [...jobs(s), ...offers(s)].filter((x) => !x.done && x.hidden === n.id)) {
    j.loc = loc.id;
    if (j.type === 'item' && jobs(s).includes(j)) plant(s, j);
    if (jobs(s).includes(j)) emit(s, 'info', `Located the flagged server: ${loc.name}. ${title(s, j)}.`, { contract: j.id });
  }
}
// A contract file banked on jack-out.
export function bankCargo(s, f) {
  const c = openContracts(s).find((x) => (x.type === 'item' || x.type === 'heist') && x.file === f.name && x.loc === f.loc);
  // Past the Tracker: a visit it reached you, the file is flagged. It goes back to the vault for another try.
  const loc = c?.type === 'heist' && s.locations.find((l) => l.id === f.loc);
  if (loc && loc.floorplan?.visit?.caught) {
    if (f.path && loc.state?.taken) delete loc.state.taken[f.path];
    return emit(s, 'warning', `The Tracker reached you: ${f.name} is flagged. It goes back to the vault on ${loc.name}.`, { contract: c.id });
  }
  cargo(s).push({ contract: c?.id ?? null, name: f.name, label: f.label });
  if (c) emit(s, 'contract-ready', `Contract ready: ${f.label} banked. Deliver it from Mail.`, { contract: c.id });
}
// Your own server crashed: Halcyon notices. (A breach alone never suspends you: that takes GLASSJAW.)
export function standingCrash(s) {
  if (!s.mail) return;
  changeStanding(s, 'halcyon', -Math.min(MAIL.crashHit, standing(s) - 1), 'Halcyon logged the breach');
}
export function changeStanding(s, f, delta, why) {
  if (!delta) return;
  const before = tierOf(s).name, was = standing(s, f);
  s.standing[f] = Math.max(0, Math.min(100, was + delta));
  delta = s.standing[f] - was; // capped at 100: nothing ripples
  if (f !== 'halcyon' || !delta) return;
  const after = tierOf(s).name;
  emit(s, delta < 0 ? 'standing-down' : 'standing-up', `${why}: Halcyon standing ${delta > 0 ? '+' : ''}${delta} (${standing(s)}, ${after}).${after !== before ? ` ${delta > 0 ? 'Promoted' : 'Dropped'} to ${after}.` : ''}`, { standing: standing(s) });
  rippleRep(s, 'halcyon', delta, { soft: true }); // Halcyon's friends and enemies notice, but never turn hostile over your day job (factions.mjs)
}

export function ready(s, c) {
  if (c.done || !jobs(s).includes(c)) return false;
  if (c.type === 'kill' || c.type === 'strain' || c.type === 'rooms') return c.got >= c.count;
  if (c.type === 'map') return !!c.got;
  if (c.type === 'bounty') return !!c.got;
  if (c.type === 'takeover') return c.any ? !!c.took : !!s.locations.find((l) => l.id === c.loc)?.takenOver;
  if (c.type === 'materials') return (materialsOf(s)[c.material] || 0) >= c.amount;
  if (c.type === 'item' || c.type === 'heist') return cargo(s).some((x) => x.contract === c.id);
  if (c.type === 'defuse') return c.got >= c.count;
  if (['install', 'sweep', 'exfil'].includes(c.type)) return !!c.got;
  if (c.type === 'root') { const l = s.locations.find((x) => x.id === c.loc); return !!l && heldLoc(l) && (l.root?.level || 1) >= c.root; }
  if (ACTIVITY[c.type]) return c.got >= c.count; // grind, solve, decode, sweeps, interrupt, hold
  if (c.type === 'side') return true; // picking a side is the whole job
  return c.chain ? arcReady(s, c) : false;
}
const locName = (s, id) => s.locations.find((l) => l.id === id)?.name || null;
export function title(s, c) {
  const own = c.chain && arcTitle(s, c); // a floor's chain: its target not located yet, or a kind of its own (arcs.mjs)
  if (own) return own;
  if (c.type === 'strain') return `Neutralize ${c.count} ${STRAINS[c.strain]?.name || ''}` + (c.level > KILL_RANGE + 1 ? `, Lv ${c.level - KILL_RANGE}+` : '');
  if (c.type === 'kill') return (c.where === 'sprawl' ? `Kill ${c.count} viruses in SPRAWL-00` : `Kill ${c.count} ${FAMILIES[c.family]?.name || ''} viruses`) + (c.level > KILL_RANGE + 1 ? `, Lv ${c.level - KILL_RANGE}+` : '');
  if (c.type === 'bounty') return `Kill ${c.name}`;
  if (c.type === 'rooms') return `Clear ${c.count} rooms on ${locName(s, c.loc) || 'a server'}`;
  if (c.type === 'map') return `Map ${locName(s, c.loc) || 'a server'}`;
  if (c.type === 'takeover') return c.any ? 'Take over a server' : `Take over ${locName(s, c.loc) || 'an unknown server'}`;
  if (c.type === 'materials') return `Deliver ${c.amount} ${MATERIALS[c.material].name}`;
  if (c.type === 'item') return `Recover ${c.file}`;
  if (c.type === 'side') return `Side with ${FACTIONS[c.faction].short}`;
  if (c.type === 'install') return `Install ${c.label} at ${c.addr} on ${locName(s, c.loc) || 'a server'}`;
  if (c.type === 'defuse') return `Break ${c.count} Encryptors before they Encrypt`;
  if (c.type === 'sweep') return `Map ${locName(s, c.loc) || 'a server'} without resting`;
  if (c.type === 'exfil') return 'Catch an Exfil';
  if (c.type === 'heist') return `Recover ${c.file} past the Tracker`;
  if (c.type === 'grind') return `Kill ${c.count} ${familyName(c.virus)} viruses` + (c.level > KILL_RANGE + 1 ? `, Lv ${c.level - KILL_RANGE}+` : '');
  if (c.type === 'solve') return c.kind ? `Solve a ${PUZZLES[c.kind]?.name || 'puzzle'} board` : `Solve ${c.count} puzzle boards`;
  if (c.type === 'decode') return `Decode ${c.count} parts`;
  if (c.type === 'sweeps') return c.count === 1 ? 'Sweep a server\'s log' : `Sweep ${c.count} servers' logs`;
  if (c.type === 'interrupt') return `Answer ${c.count} attacks`;
  if (c.type === 'root') return `Reach Root ${c.root} on ${locName(s, c.loc) || 'a server you hold'}`;
  if (c.type === 'hold') return 'Stop an invasion';
  return 'Contract';
}
// Where an unknown target stands: not heard yet, flagged (with its trace), or found.
function hunt(s, c) {
  const n = hiddenNode(s, c.hidden);
  if (!n) return { text: 'Signal lost', part: 0 };
  if (!flagged(s, n)) return { text: 'Not flagged yet. Put a relay on a server next to it.', part: 0 };
  return { text: `Flagged past ${locName(s, n.via)} · traced ${n.lead}%`, part: 0.1 + 0.3 * (n.lead / 100) };
}
// What's left to do, in a few words, and how far along it is (0–1); a job that counts also gives n of `of` (the map's tracker draws those as pips).
export function progress(s, c) {
  if (c.done) return { text: 'Delivered', part: 1 };
  const own = c.chain && arcProgress(s, c);
  if (own) return own;
  if (c.type === 'kill' || c.type === 'strain') return { text: `${c.got}/${c.count} viruses killed`, part: c.got / c.count, n: c.got, of: c.count };
  if (c.type === 'bounty') return { text: c.got ? 'Neutralized' : c.room ? `In SPRAWL-00, ${sprawlRoom(s, c.room)}` : 'Somewhere in SPRAWL-00', part: c.got ? 1 : 0 };
  if (c.type === 'rooms') return { text: `${c.got}/${c.count} rooms cleared`, part: c.got / c.count, n: c.got, of: c.count };
  if (c.type === 'map') {
    if (c.got) return { text: 'Mapped', part: 1 };
    const R = s.locations.find((x) => x.id === c.loc)?.floorplan, all = R ? Object.values(R.graph.rooms).filter(counted) : [], n = all.length, done = all.filter((x) => R.cleared[x.id]).length; // Rooms n/N, as the strip counts them
    return R ? { text: `Rooms ${done}/${n}`, part: n ? done / n : 0, n: done, of: n } : { text: 'Not connected yet', part: 0 };
  }
  if (c.type === 'takeover') {
    if (c.any) return c.took ? { text: `${locName(s, c.took)} is yours`, part: 1 } : { text: s.locations.length ? 'Open the vault of any server you have traced' : 'Trace a server first', part: 0 };
    if (!c.loc) return hunt(s, c);
    const l = s.locations.find((x) => x.id === c.loc);
    const R = l?.floorplan, vault = R?.graph.vaults[0] && R.opened[R.graph.vaults[0]];
    return { text: l?.takenOver ? 'Taken over' : vault ? 'Vault open: the Resident waits in the Core' : 'Vault shut', part: l?.takenOver ? 1 : vault ? 0.7 : 0.45 };
  }
  if (c.type === 'materials') { const have = materialsOf(s)[c.material] || 0; return { text: `${Math.min(have, c.amount)}/${c.amount} in stock`, part: Math.min(1, have / c.amount), n: Math.min(have, c.amount), of: c.amount }; }
  if (c.type === 'item') {
    if (ready(s, c)) return { text: 'Banked', part: 1 };
    if (!c.loc) return hunt(s, c);
    const inPack = s.run?.pack.some((f) => f.kind === 'contract' && f.name === c.file);
    return { text: inPack ? 'In your pack. Jack out to bank it.' : `In the vault on ${locName(s, c.loc)}`, part: inPack ? 0.85 : 0.5 };
  }
  if (c.type === 'side') return { text: `${FACTIONS[c.faction].short} +${c.reward.rep}, ${FACTIONS[c.against].short} turns against you`, part: 1 };
  if (c.type === 'install') return c.got ? { text: 'Installed', part: 1 } : c.carry === 'pack' && s.run?.loc === c.loc ? { text: `In your pack. Install it at ${c.addr}.`, part: 0.6 } : { text: `In your stash. It goes in your pack on ${locName(s, c.loc)}.`, part: 0.25 };
  if (c.type === 'defuse') return { text: `${c.got}/${c.count} broken before they Encrypt`, part: c.got / c.count, n: c.got, of: c.count };
  if (c.type === 'exfil') return c.got ? { text: 'Archive recovered', part: 1 } : { text: 'Any rogue server: break its Uplink before the upload lands', part: 0 };
  if (c.type === 'sweep') {
    if (c.got) return { text: 'Mapped without a rest', part: 1 };
    const l = s.locations.find((x) => x.id === c.loc), R = l?.floorplan, on = !!R?.at && s.run?.loc === c.loc;
    if (!on || !R) return { text: 'One visit: every room but the Core, nothing live, no rest', part: 0 };
    if (rested(R)) return { text: 'You rested this visit. Next visit starts again.', part: 0 };
    const all = sweepRooms(R.graph), n = all.filter((id) => R.visit?.stood?.[id]).length;
    return { text: `${n}/${all.length} rooms this visit, no rest`, part: n / all.length, n, of: all.length };
  }
  if (c.type === 'root') {
    const l = s.locations.find((x) => x.id === c.loc), r = l?.root || { level: 1, cleared: 0 }, need = ROOT.need[c.root] ?? 0;
    return (r.level || 1) >= c.root ? { text: `Root ${c.root}`, part: 1 } : { text: `${r.cleared || 0}/${need} fight rooms cleared again`, part: Math.min(1, (r.cleared || 0) / Math.max(1, need)) };
  }
  if (ACTIVITY[c.type]) {
    const what = { grind: 'viruses killed', solve: c.kind ? 'solved' : 'boards solved', decode: 'parts decoded', sweeps: 'logs swept', interrupt: 'attacks answered', hold: 'invasions stopped' }[c.type];
    return { text: `${c.got}/${c.count} ${what}`, part: c.got / c.count };
  }
  if (c.type === 'heist') {
    if (ready(s, c)) return { text: 'Banked', part: 1 };
    const l = s.locations.find((x) => x.id === c.loc), inPack = s.run?.loc === c.loc && s.run.pack.some((f) => f.kind === 'contract' && f.name === c.file), caught = s.run?.loc === c.loc && !!l?.floorplan?.visit?.caught;
    return { text: inPack ? (caught ? 'The Tracker reached you: it goes back on jack out' : 'In your pack. Jack out unseen.') : caught ? 'The Tracker reached you this visit' : `In the vault on ${locName(s, c.loc)}, past its Tracker`, part: inPack && !caught ? 0.85 : 0.4 };
  }
  return { text: '', part: 0 };
}
// A contract's XP: its kind's baseline in kills' worth (what the job asks: a takeover more than a few kills), times its
// size, times the level curve (MAIL.xp) at level L. A kind that counts something (kills, rooms, code, boards…) is small,
// medium or large by how many it asks (SIZE: from the first number medium, from the second large), ×1, ×2 or ×3.
export const BASE = {
  kill: 1.5, strain: 2, bounty: 2, materials: 1, rooms: 2, map: 3, takeover: 3, item: 2.5, side: 0,
  install: 3, defuse: 2.5, sweep: 4, exfil: 2.5, heist: 3.5,
  grind: 1.5, solve: 2, decode: 1.5, sweeps: 2, interrupt: 1.5, root: 3, hold: 2.5,
  puzzle: 2, lair: 4, // a floor job's own steps (arcs.mjs): a board won on its server, the floor's lair boss beaten
};
export const SIZE = {
  mult: [1, 2, 3],
  kill: [6, 12], strain: [6, 12], grind: [6, 12], rooms: [6, 10], materials: [4, 7], defuse: [4, 6],
  solve: [3, 5], decode: [3, 5], sweeps: [2, 3], interrupt: [8, 12], root: [6, 15],
};
const amountOf = (c) => (c.type === 'materials' ? c.amount : c.type === 'root' ? c.fights : c.count) || 0;
// 0 small, 1 medium, 2 large.
export const sizeOf = (c) => { const cut = SIZE[c.type]; return !cut ? 0 : amountOf(c) >= cut[1] ? 2 : amountOf(c) >= cut[0] ? 1 : 0; };
// The XP it pays, posted at level L (a sweep of a medium server 1.3 times a small one's).
export const contractXp = (L, c) => Math.round(killXp(L) * (BASE[c.type] ?? 2) * SIZE.mult[sizeOf(c)] * along(MAIL.xp, L) * (c.type === 'sweep' && c.size === 'medium' ? 1.3 : 1));
// Fixed when it was posted (reward.xp: marked xpFixed, or minutes when contracts paid minutes of farming); one from
// before either, its kind and size at the level it was posted.
export const xpOf = (s, c) => (c.xpFixed || c.minutes != null ? c.reward?.xp || 0 : Math.round(contractXp(c.level ?? hackerLevel(s), c) * (c.offBooks ? MAIL.offBooksXp : 1)));
export const rewardLine = (s, c) => [
  `${c.reward.credits} credits`,
  xpOf(s, c) ? `${xpOf(s, c)} XP` : '',
  c.reward.standing > 0 ? `Halcyon +${c.reward.standing}` : c.reward.standing < 0 ? `Halcyon ${c.reward.standing}` : '',
  c.reward.rep && c.faction ? `${FACTIONS[c.faction].short} +${c.reward.rep}` : '',
  c.reward.relay ? 'a relay' : '', c.reward.drop || c.reward.daemon ? 'a protocol, Tuned or better' : '', c.reward.pick ? 'a pick of three protocols' : '',
].filter(Boolean).join(' · ');

// ---------- commands ----------
export function mailCommand(s, text, at = now()) {
  initMail(s, at);
  const [, word, arg] = text.match(/^mail(?: (\w+))?(?: (\d+))?$/) || [];
  if (!word) return emit(s, 'info', `Mail: ${unread(s)} unread. Contracts: ${heldCount(s)}/${MAIL.take} taken, ${offers(s).length} on the board. Halcyon standing ${standing(s)} (${tierOf(s).name}); retainer ${retainer(s)} credits every 30 minutes.`);
  const id = Number(arg);
  if (word === 'read') { const l = s.mail.list.find((m) => m.id === id); if (l) l.read = true; return; }
  if (word === 'take') return arcTake(s, id); // a floor job's reward: one of three (arcs.mjs)
  if (word === 'accept') {
    const o = offers(s).find((x) => x.id === id);
    if (!o) return warn(s, 'That offer is gone.');
    if (heldCount(s) >= MAIL.take) return warn(s, `You already hold ${MAIL.take} contracts. Deliver or drop one first.`);
    s.mail.offers.splice(s.mail.offers.indexOf(o), 1);
    if (o.type === 'side') s.mail.offers = s.mail.offers.filter((x) => x.type !== 'side'); // one side or the other
    delete o.expiresAt;
    s.mail.jobs.push(o);
    arm(s, o);
    return emit(s, 'contract-taken', `Taken: ${title(s, o)}.`, { contract: o.id });
  }
  const c = jobs(s).find((x) => x.id === id);
  if (!c || c.done) return warn(s, 'No such contract.');
  if (word === 'drop') {
    if (c.story !== undefined || c.chain) return warn(s, `${c.chain ? 'Floor' : 'LOWLIGHT'} jobs can’t be dropped. Take your time with it.`);
    if (c.type === 'strain' && s.slayer?.streak) { s.slayer.streak = 0; emit(s, 'info', 'Strain streak reset.'); }
    disarm(s, c);
    s.mail.jobs.splice(s.mail.jobs.indexOf(c), 1);
    return emit(s, 'info', `Dropped: ${title(s, c)}. Nobody holds it against you.`);
  }
  if (word !== 'deliver') return warn(s, 'Try mail accept, mail deliver or mail drop.');
  if (!ready(s, c)) return warn(s, `Not done yet: ${progress(s, c).text}.`);
  if (c.type === 'materials') materialsOf(s)[c.material] -= c.amount;
  if (c.type === 'item' || c.type === 'heist') { cargo(s).splice(cargo(s).findIndex((x) => x.contract === c.id), 1); disarm(s, c); }
  c.done = true;
  c.doneAt = at;
  // Delivered ones stay for the Completed list: every LOWLIGHT job, and the last 15 others.
  const keep = new Set(s.mail.jobs.filter((x) => x.done && x.story === undefined).slice(-15));
  s.mail.jobs = s.mail.jobs.filter((x) => !x.done || x.story !== undefined || keep.has(x));
  // A strain contract streak: every fifth in a row pays double and rolls for the strain's trophy.
  let fifth = false;
  if (c.type === 'strain') { const sl = (s.slayer ||= { streak: 0 }); sl.streak++; fifth = sl.streak % SLAYER.every === 0; if (fifth) { c.reward = { ...c.reward, credits: c.reward.credits * 2, xp: xpOf(s, c) * 2 }; c.xpFixed = true; } }
  s.server.credits += c.reward.credits;
  // What it paid, for the delivered card (app.js shows it in the middle of the screen). XP was fixed when it was
  // posted; a protocol it pays rolls at the level of the kills that filled it.
  const paidAt = c.lvN ? Math.round(c.lvSum / c.lvN) : c.level ?? hackerLevel(s);
  const xp = xpOf(s, c), fname = (f) => FACTIONS[f]?.short || f;
  const gains = [
    c.reward.credits && { label: 'Credits', qty: `+${c.reward.credits}`, kind: 'credits', text: `${c.reward.credits} credits` },
    xp && { label: 'XP', qty: `+${xp}`, kind: 'xp', text: `${xp} XP` },
    c.reward.standing && { label: `${fname('halcyon')} standing`, qty: `+${c.reward.standing}`, kind: 'found', text: `${c.reward.standing} standing` },
    c.offBooks && { label: `${fname('glassjaw')} rep`, qty: '+5', kind: 'found', text: '5 rep' },
    c.reward.rep && c.faction && { label: `${fname(c.faction)} rep`, qty: `+${c.reward.rep}`, kind: 'found', text: `${c.reward.rep} rep` },
    c.reward.relay && { label: 'Relay', qty: `×${c.reward.relay}`, kind: 'item', text: 'a relay' },
    c.reward.item && { label: 'Protocol', qty: '', kind: 'item', text: 'a protocol' },
    (c.reward.drop || c.reward.daemon) && { label: 'Protocol', qty: '', kind: 'item', text: 'a protocol' },
  ].filter(Boolean);
  emit(s, 'contract-done', `DELIVERED: ${title(s, c)}. +${c.reward.credits} credits.`, { contract: c.id, credits: c.reward.credits, gains, name: title(s, c) });
  if (xp) gainXp(s, xp, 'contract', null, CONTRACT_KIND[c.type] || 'fight'); // no Fresh bonus: it counts as the work behind it
  setDeliver(s); // set bonuses on a delivery (LOWLIGHT Kit: your Signal full, the next kill's XP up; sets.mjs)
  if (fifth) { emit(s, 'streak', `Streak ${s.slayer.streak}. ${title(s, c)} pays double.`, { streak: s.slayer.streak }); const it = rollDrop(s, { kind: 'rogue', strain: c.strain, rolls: 3, trophy: true }, paidAt); if (it) addItem(s, it, 'Streak reward: '); }
  if (c.reward.standing) changeStanding(s, 'halcyon', c.reward.standing, c.offBooks ? 'Halcyon heard about the GLASSJAW job' : 'Contract delivered');
  if (c.offBooks) changeRep(s, 'glassjaw', 5, 'GLASSJAW job delivered', { ripple: false }); // Halcyon's hit is the standing above
  if (c.reward.rep && c.faction) changeRep(s, c.faction, c.reward.rep, 'Contract delivered');
  if (c.reward.relay) { items(s).relay += c.reward.relay; emit(s, 'drop', 'Halcyon sent a relay. Install it on a server you’ve taken over (its map card).'); }
  // A protocol, Tuned or better (a contract that paid a daemon once pays this: daemons only come from invasions), with its
  // faction's implicit (gear.mjs IMPLICITS); the storyline's carries none.
  if (c.reward.drop || c.reward.daemon) { const r = seeded((c.id * 7919 + paidAt) >>> 0); addItem(s, rollItem(r, { level: paidAt, rarity: r() < LOOT.quest ? 'custom' : 'tuned', faction: c.story !== undefined ? null : c.offBooks ? 'glassjaw' : c.faction || 'halcyon' }), c.offBooks ? 'GLASSJAW paid in kind: ' : c.story !== undefined ? 'LOWLIGHT bonus: ' : 'Contract bonus: '); }
  if (c.reward.item) giveUnique(s, c.reward.item, `${c.story !== undefined ? 'LOWLIGHT' : 'Contract'} reward: `);
  for (const id of c.reward.items || []) giveUnique(s, id, `${c.story !== undefined ? 'LOWLIGHT' : 'Contract'} reward: `); // more than one (the Badge's beat: the Badge and wick's Old Toolkit rebuilt at your level)
  if (c.chain) arcDelivered(s, c, at); // a floor's chain: its pick of three, then its next step (arcs.mjs)
  if (c.story !== undefined) { s.mail.waiting = 'armed'; s.mail.waitFrom = at; const next = postStory(s, at); if (next) emit(s, 'mail', `New mail from ${next.from}: ${next.subject}.`, { letter: next.id, from: next.from, subject: next.subject }); }
}

// ---------- the clock: retainer and the board ----------
export function tickMail(s, at = now()) {
  if (!s.mail?.jobs) return;
  const r = (s.retainer ||= { at });
  const periods = Math.floor((at - r.at) / MAIL.periodMs);
  if (periods > 0) {
    r.at += periods * MAIL.periodMs;
    const n = Math.min(periods, MAIL.maxPeriods), pay = retainer(s) * n;
    if (pay > 0) {
      s.server.credits += pay;
      emit(s, 'retainer', `Halcyon retainer: +${pay} credits${n > 1 ? ` (${n} payments while you were away)` : ''}.`, { credits: pay });
    }
  }
  const m = s.mail;
  arcTick(s, at); // the floors' chains (arcs.mjs), once the board is open: the tick after the letter that opens it
  storyTick(s, at);
  if (!boardOpen(s)) {
    const stuck = m.jobs.find((j) => j.story !== undefined && !j.done && STORY.find((b) => b.id === j.beat)?.boardAfterHour);
    if (stuck) stuck.at ??= at;
    if (!stuck || at - stuck.at < MAIL.boardAfterMs) return;
    m.boardOpen = true;
    postSides(s, at);
    emit(s, 'mail', 'Halcyon opened its board to you, with other work while you finish this one.');
  }
  postSides(s, at); // once; a save whose board opened before sides existed gets them here
  // Offers nobody took run out.
  const before = m.offers.length;
  m.offers = m.offers.filter((o) => o.type === 'side' || (o.waits ? roomJobOk(s, o) : o.expiresAt > at)); // a side to pick waits, and a room contract (while its target stands)
  const onBoard = () => m.offers.filter((o) => o.type !== 'side' && !o.waits).length;
  let added = 0;
  if (m.nextOfferAt == null) m.nextOfferAt = at;
  while (onBoard() < MAIL.offers && at >= m.nextOfferAt && added < MAIL.offers) {
    offer(s, at);
    added++;
    m.nextOfferAt = rand(s) < MAIL.burst ? m.nextOfferAt : at + gap(s);
  }
  if (onBoard() >= MAIL.offers && at >= m.nextOfferAt) m.nextOfferAt = at + gap(s);
  // A room contract: one waits at a time, a while after the last was taken (or tried again later when none fits yet).
  if (hackerLevel(s) >= ROOM_FROM && !m.offers.some((o) => o.waits)) {
    m.nextRoomAt ??= at + between(s, MAIL.roomEvery);
    if (at >= m.nextRoomAt) { m.nextRoomAt = null; if (roomOffer(s, at)) added++; else m.nextRoomAt = at + between(s, MAIL.roomEvery); }
  }
  if (added) emit(s, 'board', added === 1 ? `New offer on the board: ${m.offers.at(-1).subject}.` : `${added} new offers on the board.`, { offer: m.offers.at(-1).id });
  else if (m.offers.length !== before) emit(s, 'board-expired', 'An offer on the board expired.', { quiet: true });
}
export const nextPayIn = (s, at = now()) => Math.max(0, (s.retainer?.at ?? at) + MAIL.periodMs - at);
