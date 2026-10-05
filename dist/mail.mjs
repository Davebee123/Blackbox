// Mail: letters, contracts and the Halcyon retainer. Pure like the combat engine: state in, events out.
//
// The story: Halcyon Mutual, a cyber-insurance giant, pays hacker crews to fight a turf war
// against the rival crews that keep hitting its clients, and doesn't ask how. You are an
// initiate of one of those crews, LOWLIGHT. Halcyon pays a retainer every 30 minutes while your
// standing with it holds. Contracts raise standing; a crash on your own server lowers it, and
// so does work for Halcyon's competitors (GLASSJAW, off the books).
//
// The board: up to five offers at a time, arriving and expiring at uneven intervals. You take up
// to three; only a taken contract counts. Dropping one costs nothing. The storyline's jobs sit
// beside the board and don't count toward the three.
//
// Contract types: kill (N of a family, or anything in the Sprawl), bounty (one named process in
// a Sprawl folder), takeover (open a server's vault), materials (hand over code), item (a file
// in a server's vault: pull it, bank it, deliver it). A takeover or item contract can point at
// a server you haven't found: a relay on its neighbour flags it, and you trace it yourself
// (see hidden.mjs). Contracts pay credits and Indemnity, Halcyon's store scrip.
import { FAMILIES } from './data.mjs';
import { MATERIALS } from './gear.mjs';
import { emit, warn, hackerLevel, serverLevel, gainXp, xpFor, learnBlueprint, learnDaemon, materialsOf, rand, hooks, addLocation, giveUnique } from './combat.mjs';
import { zoneOf, zoneRooms } from './zone.mjs';
import { hiddenNodes, hiddenNode, syncFlags, items, flagged, spawnHidden } from './hidden.mjs';
import STORY_TEXT from './content/story.mjs';
import CONTRACT_TEXT from './content/contracts.mjs';
import { fill } from './content.mjs';
import { FACTIONS, changeRep, rippleRep, hostile, captured, rivalServers, hubsOf } from './factions.mjs';

export const MAIL = {
  periodMs: 30 * 60 * 1000, // the retainer pays every 30 minutes, offline too
  maxPeriods: 16, // up to 8 hours of it builds up while you're away
  offers: 5, // offers on the board at once
  take: 3, // contracts you can hold at once (storyline jobs don't count)
  offerEvery: [2 * 60 * 1000, 9 * 60 * 1000], // a new offer arrives somewhere in here (5 min on average)
  burst: 0.15, // sometimes two arrive together
  offerLife: [18 * 60 * 1000, 45 * 60 * 1000], // an offer nobody takes is gone after this long
  crashHit: 10, // standing lost when your server crashes
  offBooksHit: 8, // standing lost for doing GLASSJAW's work
  offBooksPay: 1.6,
  offBooksChance: 0.2,
  factionShare: 0.5, // of the rest of the board, once the hubs are up: other factions' work
  factionPay: 1.2, // they pay a little better than Halcyon, in credits and their own rep (no Indemnity)
  startStanding: 10,
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
export const CREWS = { ransomware: 'TOLLGATE', worm: 'SWARMLINE', ghostroot: 'PALEMASK' };

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
export const indemnity = (s) => s.indemnity || 0;
export const jobs = (s) => s.mail?.jobs || [];
export const offers = (s) => s.mail?.offers || [];
export const openContracts = (s) => jobs(s).filter((j) => !j.done);
export const doneContracts = (s) => jobs(s).filter((j) => j.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)); // newest first
export const heldCount = (s) => openContracts(s).filter((j) => j.story === undefined).length;
export const findJob = (s, id) => [...jobs(s), ...offers(s)].find((j) => j.id === id) || null;
export const boardOpen = (s) => !!s.mail?.boardOpen || (s.mail?.story || 0) >= STORY.length;

export function initMail(s, at = now()) {
  if (s.mail?.jobs) return s.mail;
  if (s.mail) return migrateMail(s, at);
  s.mail = { list: [], next: 1, story: 0, jobs: [], offers: [], nextOfferAt: null };
  s.standing ||= { halcyon: MAIL.startStanding };
  s.retainer ||= { at };
  s.cargo ||= [];
  s.indemnity ||= 0;
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
    m.jobs.push({ ...c, id: l.id, from: l.from, subject: l.subject, body: l.body, reward: { indemnity: 0, ...c.reward } });
    l.job = l.id;
  }
  s.indemnity ||= 0;
  return m;
}

function letter(s, msg, at = now()) {
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
// The blanks a letter or contract can use, from its job.
function jobVars(s, j = {}) {
  const loc = j.loc && s.locations.find((l) => l.id === j.loc);
  const took = s.locations.find((l) => l.id === s.mail?.took) || s.locations.find((l) => l.takenOver);
  const label = j.label || '';
  return {
    handle: s.profile?.handle || 'rookie', crewName: 'LOWLIGHT', took: took?.name || 'the server you took over',
    count: j.count, family: j.family ? lower(FAMILIES[j.family]?.name) : 'stray', crew: j.family ? crewOf(j.family) : 'the crews',
    name: j.name, room: j.room, amount: j.amount, material: j.material ? lower(MATERIALS[j.material]?.name) : undefined,
    server: loc?.name || (j.any ? 'any server you have traced' : 'a server you haven’t found yet'), owner: loc?.owner,
    file: j.file, label, Label: label ? label[0].toUpperCase() + label.slice(1) : '',
  };
}
// Turn a written beat into a letter and its job.
function beatLetter(s, beat, k) {
  const job = beat.job ? JSON.parse(JSON.stringify(beat.job)) : null;
  if (job?.type === 'item' && job.near === 'took') {
    // The file sits on an unknown server next to the one you took over.
    const took = s.locations.find((l) => l.id === s.mail.took) || s.locations.find((l) => l.takenOver);
    if (took && !hiddenNodes(s).some((n) => n.via === took.id)) spawnHidden(s, took); // all traced already: new ones
    const near = took ? hiddenNodes(s).filter((n) => n.via === took.id) : [];
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
    const j = { id: l.id, from: msg.from, subject: msg.subject, body: msg.body, got: 0, ...job };
    m.jobs.push(j);
    l.job = j.id;
    arm(s, j);
  }
  if (beat.opensBoard && !m.boardOpen) { m.boardOpen = true; for (let i = 0; i < 3; i++) offer(s, at); m.nextOfferAt = at + gap(s); }
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
  s.retainer = { at }; s.cargo ||= []; s.indemnity ||= 0;
  if (!s.locations.length) addLocation(s, 'worm', 1);
  if (before.some((b) => b.job?.type === 'takeover')) { const loc = s.locations[0]; loc.takenOver = true; s.mail.took = loc.id; if (before.some((b) => b.reward?.relay)) items(s).relay += 1; }
  if (s.mail.boardOpen) { for (let i = 0; i < 3; i++) offer(s, at); s.mail.nextOfferAt = at + gap(s); }
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
function arm(s, j) {
  // "Take over any server": one you already hold counts.
  if (j.type === 'takeover' && j.any && !j.took) { const mine = s.locations.find((l) => l.takenOver); if (mine) { j.took = mine.id; s.mail.took = mine.id; } }
  if (j.type === 'bounty') {
    const z = zoneOf(s);
    const rooms = zoneRooms().filter((r) => !(s.encounter?.zone && s.encounter.room === r) && !z.spawns[r]?.bounty);
    const room = j.room && rooms.includes(j.room) ? j.room : rooms[Math.floor(rand(s) * rooms.length)] || zoneRooms()[0];
    j.room = room;
    j.level ||= hackerLevel(s) + 2;
    z.spawns[room] = { alive: true, family: j.family, level: j.level, seed: (z.seed * 97 + j.id * 977) >>> 0, name: j.name, bounty: true, ...(j.grade ? { grade: j.grade } : {}) }; // a story bounty can be an elite (grade 2+)
  }
  if (j.type === 'item' && j.loc) plant(s, j);
  syncFlags(s);
}
function plant(s, j) {
  const loc = s.locations.find((l) => l.id === j.loc);
  if (loc && !(loc.extraFiles || []).some((f) => f.name === j.file)) (loc.extraFiles ||= []).push({ name: j.file, label: j.label, text: j.text });
}
function disarm(s, j) {
  const loc = s.locations.find((l) => l.id === j.loc);
  if (loc?.extraFiles && j.type === 'item') loc.extraFiles = loc.extraFiles.filter((f) => f.name !== j.file);
  if (j.type === 'bounty') { const sp = zoneOf(s).spawns[j.room]; if (sp?.name === j.name) delete sp.bounty; }
}

// ---------- the board ----------
const pick = (s, list) => list[Math.floor(rand(s) * list.length)];
const between = (s, [lo, hi]) => Math.round(lo + rand(s) * (hi - lo));
const gap = (s) => between(s, MAIL.offerEvery);
const CODES = ['cipher', 'worm', 'kernel'];

export function offer(s, at = now()) {
  const L = hackerLevel(s);
  const off = standing(s) >= 10 && rand(s) < MAIL.offBooksChance;
  // Once the hubs are up, about half the board is other factions' work (not ones that hate you).
  const others = hubsOf(s).length ? ['kestrel', 'lantern', 'nullchoir'].filter((f) => !hostile(s, f) && !captured(s, f)) : [];
  const faction = off ? 'glassjaw' : others.length && rand(s) < MAIL.factionShare ? pick(s, others) : 'halcyon';
  const theirs = faction !== 'halcyon' && faction !== 'glassjaw';
  const rivals = theirs ? rivalServers(s, faction).filter((l) => !targeted(s).has(l.id)) : [];
  const target = rivals.length && rand(s) < 0.6 ? { loc: pick(s, rivals).id } : pickTarget(s);
  const kinds = (off ? ['materials', 'item', 'kill'] : ['kill', 'kill', 'bounty', 'bounty', 'materials', 'takeover', 'item', 'item']).filter((k) => target || !['takeover', 'item'].includes(k));
  const type = pick(s, kinds);
  const fam = pick(s, Object.keys(CREWS));
  const pay = (base, per) => Math.round((base + per * L) * (off ? MAIL.offBooksPay : theirs ? MAIL.factionPay : 1));
  const ind = (n) => (off || theirs ? 0 : n + Math.floor(L / 12));
  const hit = off ? { standing: -MAIL.offBooksHit } : {};
  const repFor = (n) => (theirs ? { standing: 0, rep: n } : {}); // other factions pay in their own rep
  const T = CONTRACT_TEXT;
  let j;
  if (type === 'kill') {
    const count = 3 + (L >= 10 ? 1 : 0) + (L >= 30 ? 1 : 0);
    j = { type, family: fam, count, reward: { credits: pay(30, 5), indemnity: ind(1), standing: 5, xp: 1.5, ...hit, ...repFor(5) } };
  } else if (type === 'bounty') {
    const name = `${pick(s, T.bountyNames?.length ? T.bountyNames : ['lapsejack'])}-${String(1000 + Math.floor(rand(s) * 9000))}`;
    j = { type, family: fam, name, reward: { credits: pay(40, 6), indemnity: ind(2), standing: 5, xp: 2, ...repFor(5) } };
  } else if (type === 'materials') {
    const m = pick(s, CODES), amount = 2 + Math.floor(L / 8);
    j = { type, material: m, amount, reward: { credits: pay(35, 6), indemnity: ind(1), standing: 5, xp: 1, ...hit, ...repFor(5) } };
  } else if (type === 'takeover') {
    j = { type, ...target, reward: { credits: pay(60, 10), indemnity: ind(4), standing: 8, xp: 3, ...repFor(8) } };
  } else {
    const f = pick(s, T.files?.length ? T.files : [{ file: 'policy.db', label: 'a stolen policy database', line: 'binary: policy records.' }]);
    j = { type, ...target, file: f.file, label: f.label, text: [f.line, off ? 'GLASSJAW wants it. Halcyon wants it more.' : 'pull it and bank it, then deliver it from Mail.'],
      reward: { credits: pay(50, 8), indemnity: ind(3), standing: 6, xp: 2.5, ...hit, ...repFor(6) } };
  }
  // The words: a variant from content/contracts.mjs, for this kind and side.
  const kind = ['takeover', 'item'].includes(type) && !j.loc ? type + '-unknown' : type;
  const side = off ? 'glassjaw' : 'halcyon';
  const variants = T[kind]?.[side]?.length ? T[kind][side] : T[kind]?.halcyon || [{ subject: kind, body: [''] }];
  const v = pick(s, variants);
  const vars = jobVars(s, j);
  const from = theirs ? FACTIONS[faction].name : v.from ? SENDERS[v.from] : off ? SENDERS.glassjaw : pick(s, [SENDERS.claims, SENDERS.claims, SENDERS.wick]);
  j = { subject: fill(v.subject, vars), body: (v.body || []).map((p) => fill(p, vars)).filter(Boolean), ...j };
  const o = { id: s.mail.next++, from, got: 0, at, expiresAt: at + between(s, MAIL.offerLife), ...j };
  if (off) o.offBooks = true;
  o.faction = faction;
  s.mail.offers.push(o);
  return o;
}

// ---------- progress ----------
// A kill anywhere: { family, zone, bounty (spawn name) }.
export function contractKill(s, { family, zone, bounty: tag }) {
  for (const c of openContracts(s)) {
    if (c.type === 'kill' && c.got < c.count && (c.where === 'sprawl' ? zone : !c.family || c.family === family)) {
      c.got++;
      if (c.got === c.count) emit(s, 'contract-ready', `Contract ready: ${title(s, c)}. Deliver it from Mail.`, { contract: c.id });
    }
    if (c.type === 'bounty' && !c.got && tag === c.name) { c.got = 1; emit(s, 'contract-ready', `${c.name} is down. Contract ready: deliver it from Mail.`, { contract: c.id }); }
  }
}
// A vault opened: the server is yours.
export function contractTakeover(s, loc) {
  if (loc.takenOver) return;
  loc.takenOver = true;
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
  const c = openContracts(s).find((x) => x.type === 'item' && x.file === f.name && x.loc === f.loc);
  cargo(s).push({ contract: c?.id ?? null, name: f.name, label: f.label });
  if (c) emit(s, 'contract-ready', `Contract ready: ${f.label} banked. Deliver it from Mail.`, { contract: c.id });
}
// Your own server crashed: Halcyon notices. (A breach alone never suspends you: that takes GLASSJAW.)
export function standingCrash(s) {
  if (!s.mail) return;
  changeStanding(s, 'halcyon', -Math.min(MAIL.crashHit, standing(s) - 1), 'Halcyon logged the breach');
}
function changeStanding(s, f, delta, why) {
  if (!delta) return;
  const before = tierOf(s).name;
  s.standing[f] = Math.max(0, Math.min(100, standing(s, f) + delta));
  if (f !== 'halcyon') return;
  const after = tierOf(s).name;
  emit(s, delta < 0 ? 'standing-down' : 'standing-up', `${why}: Halcyon standing ${delta > 0 ? '+' : ''}${delta} (${standing(s)}, ${after}).${after !== before ? ` ${delta > 0 ? 'Promoted' : 'Dropped'} to ${after}.` : ''}`, { standing: standing(s) });
  rippleRep(s, 'halcyon', delta); // Halcyon's friends and enemies notice (factions.mjs)
}

export function ready(s, c) {
  if (c.done || !jobs(s).includes(c)) return false;
  if (c.type === 'kill') return c.got >= c.count;
  if (c.type === 'bounty') return !!c.got;
  if (c.type === 'takeover') return c.any ? !!c.took : !!s.locations.find((l) => l.id === c.loc)?.takenOver;
  if (c.type === 'materials') return (materialsOf(s)[c.material] || 0) >= c.amount;
  if (c.type === 'item') return cargo(s).some((x) => x.contract === c.id);
  return false;
}
const locName = (s, id) => s.locations.find((l) => l.id === id)?.name || null;
export function title(s, c) {
  if (c.type === 'kill') return c.where === 'sprawl' ? `Kill ${c.count} processes in SPRAWL-00` : `Kill ${c.count} ${FAMILIES[c.family]?.name || ''} processes`;
  if (c.type === 'bounty') return `Kill ${c.name}`;
  if (c.type === 'takeover') return c.any ? 'Take over a server' : `Take over ${locName(s, c.loc) || 'an unknown server'}`;
  if (c.type === 'materials') return `Deliver ${c.amount} ${MATERIALS[c.material].name}`;
  if (c.type === 'item') return `Recover ${c.file}`;
  return 'Contract';
}
// Where an unknown target stands: not heard yet, flagged (with its trace), or found.
function hunt(s, c) {
  const n = hiddenNode(s, c.hidden);
  if (!n) return { text: 'Signal lost', part: 0 };
  if (!flagged(s, n)) return { text: 'Not flagged yet: put a relay on a server next to it', part: 0 };
  return { text: `Flagged past ${locName(s, n.via)} · traced ${n.lead}%`, part: 0.1 + 0.3 * (n.lead / 100) };
}
// What's left to do, in a few words, and how far along it is (0–1).
export function progress(s, c) {
  if (c.done) return { text: 'Delivered', part: 1 };
  if (c.type === 'kill') return { text: `${c.got}/${c.count} neutralized`, part: c.got / c.count };
  if (c.type === 'bounty') return { text: c.got ? 'Neutralized' : c.room ? `In SPRAWL-00, ${c.room}` : 'Somewhere in SPRAWL-00', part: c.got ? 1 : 0 };
  if (c.type === 'takeover') {
    if (c.any) return c.took ? { text: `${locName(s, c.took)} is yours`, part: 1 } : { text: s.locations.length ? 'Open the vault of any server you have traced' : 'Trace a server first', part: 0 };
    if (!c.loc) return hunt(s, c);
    const l = s.locations.find((x) => x.id === c.loc);
    return { text: l?.takenOver ? 'Vault opened' : l && Object.keys(l.state.cleared).length ? 'Guard beaten; vault still locked' : 'Guard up', part: l?.takenOver ? 1 : l && Object.keys(l.state.cleared).length ? 0.7 : 0.45 };
  }
  if (c.type === 'materials') { const have = materialsOf(s)[c.material] || 0; return { text: `${Math.min(have, c.amount)}/${c.amount} in stock`, part: Math.min(1, have / c.amount) }; }
  if (c.type === 'item') {
    if (ready(s, c)) return { text: 'Banked', part: 1 };
    if (!c.loc) return hunt(s, c);
    const inPack = s.run?.pack.some((f) => f.kind === 'contract' && f.name === c.file);
    return { text: inPack ? 'In your pack: jack out to bank it' : `In the vault on ${locName(s, c.loc)}`, part: inPack ? 0.85 : 0.5 };
  }
  return { text: '', part: 0 };
}
export const rewardLine = (s, c) => [
  `${c.reward.credits} credits`,
  c.reward.indemnity ? `${c.reward.indemnity} Indemnity` : '',
  c.reward.xp ? `${xpFor(s, hackerLevel(s), c.reward.xp)} XP` : '',
  c.reward.standing > 0 ? `Halcyon +${c.reward.standing}` : c.reward.standing < 0 ? `Halcyon ${c.reward.standing}` : '',
  c.reward.rep && c.faction ? `${FACTIONS[c.faction].short} +${c.reward.rep}` : '',
  c.reward.relay ? 'a relay' : '', c.reward.blueprint ? 'a blueprint' : '', c.reward.daemon ? 'a daemon' : '',
].filter(Boolean).join(' · ');

// ---------- commands ----------
export function mailCommand(s, text, at = now()) {
  initMail(s, at);
  const [, word, arg] = text.match(/^mail(?: (\w+))?(?: (\d+))?$/) || [];
  if (!word) return emit(s, 'info', `Mail: ${unread(s)} unread. Contracts: ${heldCount(s)}/${MAIL.take} taken, ${offers(s).length} on the board. Halcyon standing ${standing(s)} (${tierOf(s).name}), ${indemnity(s)} Indemnity; retainer ${retainer(s)} credits every 30 minutes.`);
  const id = Number(arg);
  if (word === 'read') { const l = s.mail.list.find((m) => m.id === id); if (l) l.read = true; return; }
  if (word === 'accept') {
    const o = offers(s).find((x) => x.id === id);
    if (!o) return warn(s, 'That offer is gone.');
    if (heldCount(s) >= MAIL.take) return warn(s, `You already hold ${MAIL.take} contracts. Deliver or drop one first.`);
    s.mail.offers.splice(s.mail.offers.indexOf(o), 1);
    delete o.expiresAt;
    s.mail.jobs.push(o);
    arm(s, o);
    return emit(s, 'contract-taken', `Taken: ${title(s, o)}.`, { contract: o.id });
  }
  const c = jobs(s).find((x) => x.id === id);
  if (!c || c.done) return warn(s, 'No such contract.');
  if (word === 'drop') {
    if (c.story !== undefined) return warn(s, 'LOWLIGHT jobs can’t be dropped. Take your time with it.');
    disarm(s, c);
    s.mail.jobs.splice(s.mail.jobs.indexOf(c), 1);
    return emit(s, 'info', `Dropped: ${title(s, c)}. Nobody holds it against you.`);
  }
  if (word !== 'deliver') return warn(s, 'Try mail accept, mail deliver or mail drop.');
  if (!ready(s, c)) return warn(s, `Not done yet: ${progress(s, c).text}.`);
  if (c.type === 'materials') materialsOf(s)[c.material] -= c.amount;
  if (c.type === 'item') { cargo(s).splice(cargo(s).findIndex((x) => x.contract === c.id), 1); disarm(s, c); }
  c.done = true;
  c.doneAt = at;
  // Delivered ones stay for the Completed list: every LOWLIGHT job, and the last 15 others.
  const keep = new Set(s.mail.jobs.filter((x) => x.done && x.story === undefined).slice(-15));
  s.mail.jobs = s.mail.jobs.filter((x) => !x.done || x.story !== undefined || keep.has(x));
  s.server.credits += c.reward.credits;
  s.indemnity = indemnity(s) + (c.reward.indemnity || 0);
  emit(s, 'contract-done', `DELIVERED: ${title(s, c)}. +${c.reward.credits} credits${c.reward.indemnity ? `, +${c.reward.indemnity} Indemnity` : ''}.`, { contract: c.id, credits: c.reward.credits });
  if (c.reward.xp) gainXp(s, xpFor(s, hackerLevel(s), c.reward.xp), 'contract');
  if (c.reward.standing) changeStanding(s, 'halcyon', c.reward.standing, c.offBooks ? 'Halcyon heard about the GLASSJAW job' : 'Contract delivered');
  if (c.offBooks) changeRep(s, 'glassjaw', 5, 'GLASSJAW job delivered', { ripple: false }); // Halcyon's hit is the standing above
  if (c.reward.rep && c.faction) changeRep(s, c.faction, c.reward.rep, 'Contract delivered');
  if (c.reward.relay) { items(s).relay += c.reward.relay; emit(s, 'drop', 'Halcyon sent a relay. Install it on a server you’ve taken over (its map card).'); }
  if (c.reward.blueprint) learnBlueprint(s, 'Halcyon bonus: ');
  if (c.reward.daemon) learnDaemon(s, 'LOWLIGHT bonus: ');
  if (c.reward.item) giveUnique(s, c.reward.item, `${c.story !== undefined ? 'LOWLIGHT' : 'Contract'} reward: `);
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
  storyTick(s, at);
  if (!boardOpen(s)) return;
  // Offers nobody took run out.
  const before = m.offers.length;
  m.offers = m.offers.filter((o) => o.expiresAt > at);
  let added = 0;
  if (m.nextOfferAt == null) m.nextOfferAt = at;
  while (m.offers.length < MAIL.offers && at >= m.nextOfferAt && added < MAIL.offers) {
    offer(s, at);
    added++;
    m.nextOfferAt = rand(s) < MAIL.burst ? m.nextOfferAt : at + gap(s);
  }
  if (m.offers.length >= MAIL.offers && at >= m.nextOfferAt) m.nextOfferAt = at + gap(s);
  if (added) emit(s, 'board', added === 1 ? `New offer on the board: ${m.offers.at(-1).subject}.` : `${added} new offers on the board.`, { offer: m.offers.at(-1).id });
  else if (m.offers.length !== before) emit(s, 'board-expired', 'An offer on the board expired.', { quiet: true });
}
export const nextPayIn = (s, at = now()) => Math.max(0, (s.retainer?.at ?? at) + MAIL.periodMs - at);
