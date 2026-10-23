// Profile: who you are to everyone else on the net, the way `finger` shows a Unix login. Your handle, a banner
// (gamertag art, 4 rows of 24), a title earned by a deed, a one-line .plan, your class levels, the best pieces
// you hold, your faction marks and your stickers. Simulated hackers (presence.mjs) have one too, worked out
// from their handle: the same person every time, and nothing saved.
//
// Saved on s.profile (handle, pwLen and since were already there): banner (a preset's id, or your own rows),
// title (the one you show: undefined until you pick, null for none), plan, titles (earned, in order), deeds
// (counts the log feeds: feuds, couriers, hunts) and seen (the last log serial read). An older save starts empty.
import { emit, warn, UNIQUES, WORLD_SOURCES, hooks } from './combat.mjs';
import { ARCHETYPES, BOSSES } from './data.mjs';
import { FACTIONS, FACTION_IDS, rep, REP_TIERS, hubFound } from './factions.mjs';
import { PIECES } from './faction-gear.mjs';
import { SETS, piecesOf, isPiece } from './sets.mjs';
import { PRESENCE, profileOf as simOf, online, simOn, whereText } from './presence.mjs';
import { uniqueItem, seeded } from './gear.mjs';
import { tickAchievements, rewardStickers, bannersOf, pointsOf, shownAchievements, achievements, DEED_STICKERS } from './achievements.mjs';
import { masteredN } from './mastery.mjs';

export const PROFILE = { rows: 4, cols: 24, plan: 60 };
const clock = () => hooks.now?.() ?? Date.now();
export function hash(text, n = 0) {
  let h = 2166136261 ^ n;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- banners ----------
// Twelve presets, computing and radio things, each at most 4 rows of 24 (profile.test.mjs checks).
export const BANNERS = {
  crt: { name: 'CRT', rows: [
    '  .------------------.  ',
    '  | >_               |  ',
    "  '------------------'  ",
    '       _/______\\_       ',
  ] },
  reel: { name: 'Tape reel', rows: [
    '   .--.          .--.   ',
    '  ( () )========( () )  ',
    "   '--'  \\_  _/  '--'   ",
    '          [==]          ',
  ] },
  circuit: { name: 'Circuit', rows: [
    '  o--.   ______   .--o  ',
    "     '--|      |--'     ",
    '  o-----| 1101 |-----o  ',
    "        '------'        ",
  ] },
  moth: { name: 'Moth', rows: [
    '   .--.    \\/    .--.   ',
    "  (    '-.(  ).-'    )  ",
    "   '--.-'  ||  '-.--'   ",
    "       '   ''   '       ",
  ] },
  ghost: { name: 'Ghost', rows: [
    "         .-''-.         ",
    '        /      \\        ',
    '       |        |       ',
    "       '^^'^^'^^'       ",
  ] },
  lantern: { name: 'Lantern', rows: [
    '          _/\\_          ',
    '         [____]         ',
    '         | () |         ',
    "         '===='         ",
  ] },
  floppy: { name: 'Floppy', rows: [
    '      .----------.      ',
    '      | [____]  o|      ',
    '      |  ______  |      ',
    "      '-|______|-'      ",
  ] },
  mast: { name: 'Radio mast', rows: [
    '      (( \\  |  / ))     ',
    '         --(o)--        ',
    '           /|\\          ',
    '          / | \\         ',
  ] },
  wave: { name: 'Carrier wave', rows: [
    '    _     _     _     _ ',
    '   / \\   / \\   / \\   /  ',
    '  /   \\_/   \\_/   \\_/   ',
    '  ~~~~~~~~~~~~~~~~~~~~  ',
  ] },
  cassette: { name: 'Cassette', rows: [
    '  .------------------.  ',
    '  |  ( o )    ( o )  |  ',
    '  |    __________    |  ',
    "  '---/__________\\---'  ",
  ] },
  keys: { name: 'Keyboard', rows: [
    ' .--------------------. ',
    ' |[][][][][][][][][][]| ',
    ' |[__][][][][][][][__]| ',
    " '--------------------' ",
  ] },
  stars: { name: 'Constellation', rows: [
    '   *         .     *    ',
    '      .--*----.         ',
    "  *--'         '--*   . ",
    '        .    *          ',
  ] },
};
export const BANNER_IDS = Object.keys(BANNERS);
// Six more, each the reward of an achievement (achievements.mjs): yours to pick once it's earned.
export const REWARD_BANNERS = {
  crown: { name: 'Crown', rows: [
    '    .  /\\  /\\  /\\  .    ',
    '      /  \\/  \\/  \\      ',
    '     |  ()  ()  () |    ',
    "     '=============='   ",
  ] },
  vault: { name: 'Vault door', rows: [
    '  .------------------.  ',
    '  |   .--.   [####]  |  ',
    '  |  ( -+- ) [####]  |  ',
    "  '---'--'-----------'  ",
  ] },
  hydra: { name: 'Pandemonium', rows: [
    '  [o_o]  [o_o]  [o_o]   ',
    '     \\     |     /      ',
    '      \\----+----/       ',
    '         [ ps ]         ',
  ] },
  mesh: { name: 'The grid', rows: [
    ' o---o---o---o---o---o  ',
    ' |\\ /|\\ /|\\ /|\\ /|\\ /|  ',
    ' | X | X | X | X | X |  ',
    ' o---o---o---o---o---o  ',
  ] },
  keyone: { name: 'Key one', rows: [
    "  .---.        )))      ",
    '  |###|==o   ))) )))    ',
    "  '---'   ---------->   ",
    '    <[##]===   [ 1 ]    ',
  ] },
  bedrock: { name: 'Bedrock', rows: [
    '  ____________________  ',
    ' /_/_/_/_/_/_/_/_/_/_/  ',
    ' |_|_|_|_|_|_|_|_|_|_|  ',
    ' ~~~~~~~~ F8 ~~~~~~~~~  ',
  ] },
};
export const REWARD_BANNER_IDS = Object.keys(REWARD_BANNERS);
export const anyBanner = (id) => BANNERS[id] || REWARD_BANNERS[id] || null;
// Your own: printable ASCII only, at most PROFILE.rows rows of PROFILE.cols. Trailing spaces and blank rows at
// either end are trimmed. Returns { rows } or { error }.
export function checkBanner(text) {
  const rows = String(text ?? '').replace(/\r\n?/g, '\n').split('\n').map((r) => r.replace(/\s+$/, ''));
  while (rows.length && !rows[0].trim()) rows.shift();
  while (rows.length && !rows.at(-1).trim()) rows.pop();
  if (!rows.length) return { error: 'Draw something first.' };
  if (rows.some((r) => /[^\x20-\x7e]/.test(r))) return { error: 'Plain keyboard characters only.' };
  if (rows.length > PROFILE.rows) return { error: `${PROFILE.rows} rows at most.` };
  if (rows.some((r) => r.length > PROFILE.cols)) return { error: `${PROFILE.cols} characters a row at most.` };
  return { rows };
}
export const bannerRows = (b) => (Array.isArray(b) ? b : anyBanner(b)?.rows || BANNERS.crt.rows);

// ---------- titles ----------
// Earned by deeds, never bought. lv: about the class level a simulated hacker could have it by.
const won = (s, boss) => (s.dex?.won?.[boss] || 0) > 0;
const natives = () => Object.keys(BOSSES).filter((k) => BOSSES[k].native);
const setsDone = (s) => Object.keys(SETS).filter((id) => piecesOf(id).length && piecesOf(id).every((p) => s.collection?.[p]));
const mapped = (s) => (s.locations || []).filter((l) => l.floorplan?.mapped).length;
const CLASS_TITLE = { breaker: 'the Hammer', bastion: 'the Wall', infiltrator: 'the Quiet', operator: 'the Conductor' };
// A list built on first use: factions.mjs and data.mjs may still be loading when this module is (an import cycle through combat.mjs).
let TITLE_LIST = null;
export const titles = () => (TITLE_LIST ||= [
  { id: 'patient', name: 'the Patient', rule: 'Win a fight that ran 20 cycles or more.', lv: 3, has: (s) => (s.reports || []).some((r) => r.result === 'victory' && r.cycles >= 20) },
  { id: 'uncrowner', name: 'Uncrowner', rule: 'Beat RELAY-KING.', lv: 4, has: (s) => won(s, 'relayking') },
  { id: 'repossessor', name: 'Repossessor', rule: 'Beat REPO MAN.', lv: 8, has: (s) => won(s, 'repoman') },
  { id: 'lastnote', name: 'of the Last Note', rule: 'Silence the HOLLOW CHOIR.', lv: 10, has: (s) => won(s, 'choir') },
  { id: 'couriersbane', name: "Courier's Bane", rule: 'Intercept 10 couriers.', lv: 8, has: (s) => deeds(s).couriers >= 10 },
  { id: 'tracker', name: 'Tracker', rule: 'Collect 5 bounty hunts.', lv: 9, has: (s) => deeds(s).hunts >= 5 },
  { id: 'feudbreaker', name: 'Feudbreaker', rule: 'Win 5 feuds.', lv: 12, has: (s) => deeds(s).feuds >= 5 },
  { id: 'mapper', name: 'Mapper', rule: 'Map 20 servers.', lv: 10, has: (s) => mapped(s) >= 20 },
  { id: 'farmhand', name: 'Farmhand', rule: "Beat KESSLER-FARM-00's three: THE FOREMAN, HEATSINK and COLDWALLET.", lv: 12, has: (s) => ['foreman', 'heatsink', 'coldwallet'].every((b) => won(s, b)) },
  { id: 'lairborn', name: 'Lair-born', rule: 'Beat a lair boss.', lv: 12, has: (s) => natives().some((b) => won(s, b)) },
  { id: 'assembler', name: 'the Assembler', rule: 'Assemble a faction piece.', lv: 14, has: (s) => Object.values(PIECES).some((u) => s.collection?.[u.id]) },
  { id: 'matched', name: 'the Matched', rule: 'Find every piece of a set.', lv: 14, has: (s) => setsDone(s).length > 0 },
  { id: 'collector', name: 'Collector', rule: 'Find 25 uniques.', lv: 16, has: (s) => Object.keys(s.collection || {}).length >= 25 },
  { id: 'deepwalker', name: 'Deepwalker', rule: 'Reach floor 5.', lv: 20, has: (s) => (s.floors?.reached || 1) >= 5 },
  { id: 'virtuoso', name: 'the Virtuoso', rule: 'Reach Mastery 3 with 5 abilities.', lv: 40, has: (s) => masteredN(s) >= 5 },
  ...FACTION_IDS.map((f) => ({ id: 'of-' + f, name: `of ${FACTIONS[f].short}`, rule: `Reach ${FACTIONS[f].tiers[4]} with ${FACTIONS[f].name}.`, lv: 16, faction: f, has: (s) => (s.standing?.[f] ?? -1) >= REP_TIERS[4] })),
  ...Object.keys(CLASS_TITLE).map((c) => ({ id: 'max-' + c, name: CLASS_TITLE[c], rule: `Take a ${ARCHETYPES[c].name} to level 50.`, lv: 50, cls: c, has: (s) => (s.hackers?.[c]?.level || 0) >= 50 })),
]);
export const titleById = (id) => titles().find((t) => t.id === id) || null;

export function myProfile(s) {
  const p = (s.profile ||= {});
  p.titles ||= [];
  p.deeds ||= { feuds: 0, couriers: 0, hunts: 0 };
  if (p.plan == null) p.plan = '';
  if (p.banner == null) p.banner = 'crt';
  return p;
}
const deeds = (s) => myProfile(s).deeds;
export const handleOf = (s) => s.profile?.handle || 'rookie';
// The title you show: the one you picked, else the first you earned.
export function shownTitle(s) {
  const p = myProfile(s);
  if (p.title === null) return null;
  const id = p.title && p.titles.includes(p.title) ? p.title : p.titles[0];
  return titleById(id);
}

// Every second (invasion.mjs tickNetwork): the deeds in the log since last time, then the achievements
// (achievements.mjs), which hand out the titles: a new title comes with its achievement's pager line. A first look
// at an older save starts from now.
export function tickProfile(s) {
  const p = myProfile(s);
  if (p.seen == null) p.seen = s.serial || 0;
  for (const e of s.logs || []) {
    if (e.id <= p.seen || e.type !== 'world-event-won') continue;
    if (e.card === 'feud' && e.winner) p.deeds.feuds++;
    if (e.card === 'courier' || e.card === 'lantern') p.deeds.couriers++;
    if (e.card === 'hunt' || e.card === 'returning') p.deeds.hunts++;
  }
  p.seen = s.serial || 0;
  tickAchievements(s);
  p.seen = s.serial || 0;
}

// ---------- stickers ----------
// Marks you earn and keep: a faction's top tier, a set completed, a floor reached (from 2), a lair boss beaten, and a
// few an achievement brings. Each is the reward of an achievement (achievements.mjs), earned by the same deed.
export function stickersOf(s) {
  const out = [];
  for (const f of FACTION_IDS) if ((s.standing?.[f] ?? -1) >= REP_TIERS[4]) out.push({ id: 'f-' + f, kind: 'faction', label: FACTIONS[f].tiers[4], color: FACTIONS[f].color, glyph: 'f-' + f, tip: `${FACTIONS[f].tiers[4]} with ${FACTIONS[f].name}` });
  for (const id of setsDone(s)) out.push({ id: 'set-' + id, kind: 'set', label: SETS[id].name, color: '#7ee787', glyph: 'item', tip: `Every piece of ${SETS[id].name}` });
  for (let n = 2; n <= (s.floors?.reached || 1); n++) out.push({ id: 'floor-' + n, kind: 'floor', label: `F${n}`, color: '#9aa7b4', glyph: 'node', tip: `Reached floor ${n}` });
  for (const b of natives().filter((k) => won(s, k))) out.push({ id: 'lair-' + b, kind: 'lair', label: BOSSES[b].name, color: '#ff8a5c', glyph: 'kill', tip: `Beat ${BOSSES[b].name} in its lair` });
  // And every sticker an achievement you've earned brought (achievements.mjs), its own few among them: kept for good,
  // so standing that slips later takes nothing back.
  const have = new Set(out.map((x) => x.id));
  return out.concat(rewardStickers(s).filter((id) => !have.has(id)).map(stickerById).filter(Boolean));
}

// Any sticker by its id, earned or not (an achievement's reward shows it before you have it).
export function stickerById(id) {
  const m = String(id).match(/^(f|set|floor|lair)-(.+)$/);
  if (DEED_STICKERS[id]) return { id, kind: 'deed', ...DEED_STICKERS[id] };
  if (!m) return null;
  const [, k, x] = m;
  if (k === 'f' && FACTIONS[x]) return { id, kind: 'faction', label: FACTIONS[x].tiers[4], color: FACTIONS[x].color, glyph: id, tip: `${FACTIONS[x].tiers[4]} with ${FACTIONS[x].name}` };
  if (k === 'set' && SETS[x]) return { id, kind: 'set', label: SETS[x].name, color: '#7ee787', glyph: 'item', tip: `Every piece of ${SETS[x].name}` };
  if (k === 'floor') return { id, kind: 'floor', label: `F${x}`, color: '#9aa7b4', glyph: 'node', tip: `Reached floor ${x}` };
  if (k === 'lair' && BOSSES[x]) return { id, kind: 'lair', label: BOSSES[x].name, color: '#ff8a5c', glyph: 'kill', tip: `Beat ${BOSSES[x].name} in its lair` };
  return null;
}

// ---------- the card ----------
// Faction marks: each faction you've met, its tier (0–4).
const tierOf = (r) => { let i = 0; REP_TIERS.forEach((m, k) => { if (r >= m) i = k; }); return i; };
const met = (s, f) => f === 'halcyon' || hubFound(s, f) || (s.locations || []).some((l) => l.faction === f) || (s.standing?.[f] ?? FACTIONS[f].start) !== FACTIONS[f].start; // its hub, a server of its, or rep that moved
// Your best few pieces: faction pieces, then set pieces, then the other uniques, highest level first; one of each.
function bestPieces(s, n = 4) {
  const rank = (it) => (Object.values(PIECES).some((u) => u.id === it.unique) ? 0 : isPiece(it.unique) ? 1 : 2);
  const seen = new Set();
  return (s.stash || []).filter((it) => it.unique).sort((a, b) => rank(a) - rank(b) || b.level - a.level).filter((it) => !seen.has(it.unique) && seen.add(it.unique)).slice(0, n);
}
// finger <handle>: you, or a simulated hacker. Null: nobody by that name.
export function fingerOf(s, handle) {
  const me = handleOf(s);
  if (!handle || handle === me) {
    const p = myProfile(s), t = shownTitle(s);
    return {
      handle: me, you: true, banner: bannerRows(p.banner), title: t?.name || null, plan: p.plan,
      classes: Object.entries(s.hackers || {}).filter(([c, h]) => ARCHETYPES[c] && h.level >= 1).sort((a, b) => b[1].level - a[1].level).map(([c, h]) => ({ cls: c, level: h.level })),
      pieces: bestPieces(s), marks: FACTION_IDS.filter((f) => met(s, f)).map((f) => ({ f, tier: tierOf(rep(s, f)) })),
      stickers: stickersOf(s), since: p.since || null, where: 'on your server',
      points: pointsOf(s), achievements: shownAchievements(s), got: s.achievements?.got || {}, // achievements.mjs: your points, and the few you pinned or earned last
    };
  }
  if (!PRESENCE.pool.includes(handle) || !(simOn(s) || (s.channel?.lines || []).some((l) => l.from === handle))) return null;
  return simCard(s, handle);
}

// ---------- simulated hackers ----------
// A voice from the handle: lower case or not, terse or chatty, how they end a line, and an emoticon now and then.
const EMOTES = ['', '', ':)', ':p', '^^', 'o/', ':D', '<3'];
export function voiceOf(h) {
  return { lower: hash(h, 51) < 0.6, terse: hash(h, 52) < 0.45, end: ['', '', '.', '...', '!'][Math.floor(hash(h, 53) * 5)], emote: EMOTES[Math.floor(hash(h, 54) * EMOTES.length)] };
}
// A line in their voice. text: [chatty, terse] or one string; n: a counter, so the emoticon comes now and then.
export function voice(h, text, n = 0) {
  const v = voiceOf(h);
  let t = Array.isArray(text) ? (v.terse ? text[1] ?? text[0] : text[0]) : text;
  t = t.replace(/[.!]+$/, '');
  if (v.lower) t = t.split(/(\[[^\]]*\])/).map((x) => (x.startsWith('[') ? x : x.replace(/\b[A-Z][a-z]/g, (m) => m.toLowerCase()))).join(''); // names in capitals and [item links] keep theirs
  if (/[\w\]]$/.test(t)) t += v.end; // a question, or an emoticon, ends itself
  if (v.emote && hash(h, 60 + n) < 0.35) t += ' ' + v.emote;
  return t;
}
// Uniques that drop out in the world at or under a level (what a hacker could have found).
export const worldUniques = (level) => Object.values(UNIQUES).filter((u) => u.level <= level && !u.faction && (u.sources || []).some((x) => WORLD_SOURCES.includes(x.kind)));
const PLANS = [
  (x) => [`${x.cls} ${x.level}. ask me about ${x.boss}.`, `${x.cls} ${x.level}. ${x.boss}?`],
  () => ['farming KESSLER-FARM-00 until something drops.', 'farm. farm. farm.'],
  (x) => [`looking for a crew. ${x.cls}, evenings.`, `lf crew. ${x.cls}.`],
  (x) => [`still no [${x.want}]. one day.`, `[${x.want}] or bust.`],
  () => ['do not page me mid-fight.', 'busy. always.'],
  (x) => [`mapping ${x.room} one room at a time.`, `mapping ${x.room}.`],
  () => ['the wall holds. mostly.', 'wall holds.'],
  (x) => [`${x.faction} owes me a favour.`, `${x.faction} owes me.`],
];
// A simulated hacker's title: one a hacker of their level could have earned (most from level 4 have one).
export function simTitle(h) {
  const L = simOf(h).level, can = titles().filter((t) => t.lv <= L && !t.cls);
  return L >= 4 && hash(h, 45) < 0.8 && can.length ? can[Math.floor(hash(h, 46) * can.length)] : null;
}
// A simulated hacker's card, from the handle alone (and their place, if they're on).
export function simCard(s, h) {
  const p = simOf(h), r = seeded(Math.floor(hash(h, 40) * 2 ** 31));
  const cls = p.cls, others = Object.keys(ARCHETYPES).filter((c) => c !== cls);
  const classes = [{ cls, level: p.level }];
  if (p.level >= 6) classes.push({ cls: others[Math.floor(hash(h, 43) * others.length)], level: Math.max(1, Math.floor(p.level * (0.2 + hash(h, 44) * 0.5))) });
  const title = simTitle(h);
  const pool = worldUniques(p.level), pieces = [];
  for (let i = 0; i < 2 && pool.length; i++) { const u = pool[Math.floor(hash(h, 47 + i) * pool.length)]; if (!pieces.some((x) => x.unique === u.id)) pieces.push({ ...uniqueItem(u, p.level, r), id: `${h}-${i}` }); }
  const facs = FACTION_IDS.filter((f, i) => hash(h, 70 + i) < 0.5).slice(0, 3);
  const boss = p.level >= 10 ? 'the HOLLOW CHOIR' : p.level >= 8 ? 'REPO MAN' : 'RELAY-KING';
  const want = worldUniques(Math.min(50, p.level + 4)).filter((u) => !pieces.some((x) => x.unique === u.id));
  const plan = voice(h, PLANS[Math.floor(hash(h, 48) * PLANS.length)]({ cls: ARCHETYPES[cls].name, level: p.level, boss, want: want[Math.floor(hash(h, 49) * want.length)]?.name || 'a unique', room: 'SPRAWL-00', faction: FACTIONS[facs[0] || 'lantern'].short }));
  const here = online(s).find((x) => x.handle === h);
  return {
    handle: h, you: false, banner: BANNERS[BANNER_IDS[Math.floor(hash(h, 41) * BANNER_IDS.length)]].rows, title: title?.name || null, plan,
    classes, pieces, marks: facs.map((f, i) => ({ f, tier: Math.min(4, 1 + Math.floor(hash(h, 80 + i) * (1 + p.level / 8))) })),
    stickers: (title?.faction ? [{ id: 'f-' + title.faction, kind: 'faction', label: FACTIONS[title.faction].tiers[4], color: FACTIONS[title.faction].color, glyph: 'f-' + title.faction, tip: `${FACTIONS[title.faction].tiers[4]} with ${FACTIONS[title.faction].name}` }] : [])
      .concat(p.level >= 12 ? [{ id: 'floor-2', kind: 'floor', label: 'F2', color: '#9aa7b4', glyph: 'node', tip: 'Reached floor 2' }] : []),
    since: null, where: here ? whereText(here.place) : 'offline',
    // Their achievement points (a hacker of their level's, from the handle) and the one behind their title.
    points: 5 * Math.round((p.level * 7 + hash(h, 90) * 60) / 5), achievements: title ? achievements().filter((a) => a.reward?.title === title.id).slice(0, 1) : [],
  };
}

// ---------- commands ----------
// finger [handle], plan [text|clear], titles, title <name>|off, banner [<preset>|list]. raw: as typed (a plan keeps its capitals).
export function setPlan(s, text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (/[^\x20-\x7e]/.test(t)) return warn(s, 'Plain keyboard characters only.');
  if (t.length > PROFILE.plan) return warn(s, `A plan is ${PROFILE.plan} characters at most.`);
  myProfile(s).plan = t;
  emit(s, 'info', t ? `Plan: ${t}` : 'Plan cleared.');
}
export function setBanner(s, b) {
  if (typeof b === 'string' && !b.includes('\n') && BANNERS[b]) { myProfile(s).banner = b; return emit(s, 'info', `Banner: ${BANNERS[b].name}.`); }
  if (typeof b === 'string' && REWARD_BANNERS[b]) { // an achievement's banner: yours once it's earned
    if (!bannersOf(s).includes(b)) return warn(s, `${REWARD_BANNERS[b].name} comes with an achievement you haven't earned yet.`);
    myProfile(s).banner = b;
    return emit(s, 'info', `Banner: ${REWARD_BANNERS[b].name}.`);
  }
  const c = checkBanner(b);
  if (c.error) return warn(s, c.error);
  myProfile(s).banner = c.rows;
  emit(s, 'info', 'Banner saved.');
}
export function setTitle(s, id) {
  const p = myProfile(s), want = String(id).toLowerCase();
  if (want === 'off' || want === 'none') { p.title = null; return emit(s, 'info', 'No title shown.'); }
  const t = titles().find((x) => x.id === want || x.name.toLowerCase() === want || x.name.toLowerCase().replace(/^(the|of) /, '') === want);
  if (!t) return warn(s, `No title called ${id}. titles lists yours.`);
  if (!p.titles.includes(t.id)) return warn(s, `Not earned yet. ${t.rule}`);
  p.title = t.id;
  emit(s, 'info', `Title: ${t.name}.`);
}
export function profileCommand(s, raw) {
  const text = raw.trim(), word = text.split(/\s+/)[0].toLowerCase(), rest = text.slice(word.length).trim(), low = rest.toLowerCase();
  if (word === 'finger') {
    const h = low || handleOf(s), f = fingerOf(s, h);
    if (!f) return warn(s, `finger: ${h}: no such user.`);
    return emit(s, 'finger', `Login: ${f.handle}${f.title ? ` · ${f.title}` : ''} · ${f.classes.map((c) => `${ARCHETYPES[c.cls].name} ${c.level}`).join(', ')} · ${f.where}.${f.plan ? ` Plan: ${f.plan}` : ' No plan.'}`, { finger: f.handle });
  }
  if (word === 'plan') {
    if (!rest) return emit(s, 'info', myProfile(s).plan ? `Plan: ${myProfile(s).plan}` : 'No plan. plan <text>');
    return setPlan(s, low === 'clear' ? '' : rest);
  }
  if (word === 'titles') {
    const p = myProfile(s), t = shownTitle(s);
    return emit(s, 'info', p.titles.length ? `Titles: ${p.titles.map((id) => (id === t?.id ? `${titleById(id).name} (shown)` : titleById(id).name)).join(', ')}.` : 'No titles yet. They come from deeds.');
  }
  if (word === 'title') return rest ? setTitle(s, low) : emit(s, 'info', shownTitle(s) ? `Title: ${shownTitle(s).name}.` : 'No title shown.');
  if (word === 'banner') {
    if (!rest || low === 'list') return emit(s, 'info', `Banners: ${[...BANNER_IDS, ...bannersOf(s)].join(', ')}. banner <name>`);
    if (!anyBanner(low)) return warn(s, `No banner called ${low}. banner list`);
    return setBanner(s, low);
  }
  return null;
}
