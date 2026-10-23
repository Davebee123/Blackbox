// Achievements: what you've done, kept for good, the way World of Warcraft keeps them. One system for every reward
// the profile used to hand out on its own: each title (profile.mjs titles) and each sticker (profile.mjs stickersOf)
// is now the reward of an achievement, earned by the same deed as before. Rewards are cosmetic only: a title, a
// sticker, a banner preset for your card, or a casing colourway (casing.mjs). Nothing here touches a fight's numbers.
//
// Each achievement: { id, cat, name, rule, pts (5, 10, 25 or 50), group?, hidden? (??? and its hint until earned),
// hint?, progress? (s → [n, of]), has (s → bool), reward? { title, sticker, banner, casing } }.
//
// How they're checked (cheap): every second (invasion.mjs tickNetwork → profile.mjs tickProfile → tickAchievements)
// only the ones not yet earned, each a look at state that is already kept. What a fight does that the state doesn't
// keep (a feat in one fight, a count of elites) is noted when the fight ends (combat.mjs finish → fightOver), on
// s.achievements, and earned on the next tick. Nothing is time-limited and nothing can be missed for good.
//
// Saved on s.achievements = { got: { id: when earned }, n: { counters }, flags: { feat ids done }, pins: [ids],
// seen (the last log serial read) }. An older save gets everything it has already done on load (achievementsRestore):
// every title and sticker it holds keeps its achievement, quietly, and one pager line says how many.
import { emit, warn, hooks, defender, classOf } from './combat.mjs';
import { ARCHETYPES, BOSSES, SUBS, DAEMONS, FLOORS } from './data.mjs';
import { FACTIONS, FACTION_IDS, REP_TIERS, hubFound } from './factions.mjs';
import { PIECES } from './faction-gear.mjs';
import { SETS, piecesOf } from './sets.mjs';
import { titleById, myProfile } from './profile.mjs';
import { masteredN, keyOnesN, kitBest } from './mastery.mjs';

const clock = () => hooks.now?.() ?? Date.now();
export const POINTS = [5, 10, 25, 50];
export const CATEGORIES = [
  { id: 'combat', name: 'Combat' },
  { id: 'explore', name: 'Exploration' },
  { id: 'collect', name: 'Collection' },
  { id: 'faction', name: 'Factions' },
  { id: 'class', name: 'Classes' },
  { id: 'daemon', name: 'Daemons' },
  { id: 'coop', name: 'Co-op' },
  { id: 'feat', name: 'Feats' },
];
// What a fight counts toward (fightOver) and what the log does (tickAchievements).
const COUNTERS = ['elites', 'daemon', 'crew', 'contracts', 'takeovers'];
// The few stickers an achievement brings of its own (the rest come from profile.mjs stickersOf, as before).
const AMBER = '#f1b92f';

export function achOf(s) {
  const A = (s.achievements ||= {});
  A.got ||= {}; A.flags ||= {}; A.pins ||= []; A.n ||= {};
  for (const k of COUNTERS) A.n[k] ||= 0;
  if (A.seen == null) A.seen = 0; // a new game reads its log from the start (an older save's restore starts it at now)
  return A;
}
export const earned = (s, id) => !!s?.achievements?.got?.[id];

// ---------- the reads (state the game already keeps) ----------
const won = (s, boss) => (s.dex?.won?.[boss] || 0) > 0;
const wins = (s) => Object.values(s.dex?.kills || {}).reduce((a, n) => a + (n || 0), 0);
const uniques = (s) => Object.keys(s.collection || {}).length;
const setDone = (s, id) => piecesOf(id).length > 0 && piecesOf(id).every((p) => s.collection?.[p]);
const mappedN = (s) => (s.locations || []).filter((l) => l.floorplan?.mapped && !l.member).length;
const takenN = (s) => Math.max(s.achievements?.n?.takeovers || 0,(s.locations || []).filter((l) => l.takenOver && !l.member).length);
const floor = (s) => s.floors?.reached || 1;
const top = (s, f) => (s.standing?.[f] ?? -1) >= REP_TIERS[4];
const level = (s, c) => s.hackers?.[c]?.level || 0;
// A class's subclass, read without touching the save (combat.mjs subOf makes a class's record on first look).
const picked = (s, c) => { const x = s.loadout?.sub?.[c]; return SUBS[x]?.cls === c && level(s, c) >= 10 ? x : null; };
const daemonsN = (s) => Object.keys(DAEMONS).filter((id) => (s.daemonLv?.[id] || 0) > 0).length;
const deeds = (s) => s.profile?.deeds || {};
const titled = (s, id) => (s.profile?.titles || []).includes(id);
const titleHas = (s, id) => titled(s, id) || !!titleById(id)?.has(s);
const flag = (id) => (s) => !!s.achievements?.flags?.[id];
const count = (k) => (s) => s.achievements?.n?.[k] || 0;
const of = (n, N) => [Math.min(n, N), N];
const natives = () => Object.keys(BOSSES).filter((k) => BOSSES[k].native);
const CROWNS = ['relayking', 'repoman', 'foreman', 'heatsink', 'coldwallet'];
const FARM = ['foreman', 'heatsink', 'coldwallet'];

// The lairs (network.mjs: one native boss a network, its sticker profile.mjs's lair-<id>).
const LAIR_NAMES = { 'nb-deadbolt': 'Bolt Cutter', 'nb-tripmine': 'Defused', 'nb-hashlord': 'Hash Collision', 'nb-backorifice': 'Port Closed', 'nb-patchday': 'Out of Band', 'nb-floodwall': 'Spillway', 'nb-mirrorshade': 'Seven Years', 'nb-sleepwalker': 'Wake-up Call', 'nb-echolalia': 'Last Word' };
// The floors from 2 (their sticker floor-<n>). Floor 5 also gives Deepwalker, floor 8 the matte casing.
const FLOOR_ACH = { 2: ['Down the Line', 5], 3: ['Stacked', 10], 4: ['Cold Open', 10], 5: ['Core Sample', 25], 6: ['Ring Zero', 25], 7: ['Sinker', 25], 8: ['Rock Bottom', 50] };
const FACTION_ACH = { halcyon: 'Preferred Customer', glassjaw: 'Inner Circle', kestrel: 'Key Account', lantern: 'On the Signal', nullchoir: 'Cantor' };
const CLASS_ACH = { breaker: 'Wrecking Ball', bastion: 'Five Nines', infiltrator: 'Ghost Protocol', operator: 'Orchestrated' };
// Sets worth more: the deep ones (floors 6 to 8 and the crew dungeon's).
const BIG_SETS = new Set(['deeparchive', 'bedrock', 'mesh']);
export const DEED_STICKERS = {
  'a-solo': { label: 'Solo', color: AMBER, glyph: 'kill', tip: 'Beat a crew elite alone' },
  'a-noexc': { label: '0 exceptions', color: AMBER, glyph: 'config', tip: 'A clean routine' },
  'a-chain': { label: 'Chain', color: AMBER, glyph: 'chain', tip: 'Every part in one cycle' },
  'a-thread': { label: '<5%', color: AMBER, glyph: 'signal', tip: 'Won by a thread' },
  'a-mastery': { label: 'Mastery 3', color: AMBER, glyph: 'mastered', tip: 'An ability at Mastery 3' },
  'a-kit': { label: 'Repertoire', color: AMBER, glyph: 'mastered', tip: 'A whole kit at Mastery 3' },
};

const A = (id, cat, name, rule, pts, more = {}) => ({ id, cat, name, rule, pts, ...more });
let LIST = null;
// Built on first use: data.mjs and factions.mjs may still be loading when this module is (the import cycle through combat.mjs).
const listed = () => (LIST ||= [ // the list as written; achievements() (below, with the window's and the desk's rewards) is what the game reads
  // ---------- Combat ----------
  A('c-win-100', 'combat', 'Process Killer', 'Win 100 fights.', 10, { progress: (s) => of(wins(s), 100), reward: { casing: 'beige' } }),
  A('c-patient', 'combat', 'Long Uptime', 'Win a fight that ran 20 cycles or more.', 10, { has: (s) => titleHas(s, 'patient') || flag('c-patient')(s), reward: { title: 'patient' } }),
  A('c-elites', 'combat', 'Big Game', 'Beat 25 ◆ CREW elites.', 10, { progress: (s) => of(count('elites')(s), 25) }),
  A('c-relayking', 'combat', 'Uncrowned', 'Beat RELAY-KING.', 10, { has: (s) => titleHas(s, 'uncrowner'), reward: { title: 'uncrowner' } }),
  A('c-repoman', 'combat', 'Repossessed', 'Beat REPO MAN.', 10, { has: (s) => titleHas(s, 'repossessor'), reward: { title: 'repossessor' } }),
  A('c-choir', 'combat', 'Dead Air', 'Silence the HOLLOW CHOIR.', 25, { hidden: true, hint: 'Something on the net is singing.', has: (s) => titleHas(s, 'lastnote'), reward: { title: 'lastnote' } }),
  A('c-crowns', 'combat', 'Every Crown', 'Beat RELAY-KING, REPO MAN, THE FOREMAN, HEATSINK and COLDWALLET.', 25, { progress: (s) => of(CROWNS.filter((b) => won(s, b)).length, CROWNS.length), reward: { banner: 'crown' } }),
  A('c-lairborn', 'combat', 'Lair-born', 'Beat a lair boss.', 10, { group: 'Lairs', has: (s) => titleHas(s, 'lairborn'), reward: { title: 'lairborn' } }),
  ...Object.entries(LAIR_NAMES).map(([b, name]) => A('c-' + b, 'combat', name, `Beat ${BOSSES[b].name} in its lair.`, 10, { group: 'Lairs', has: (s) => won(s, b), reward: { sticker: 'lair-' + b } })),
  // ---------- Exploration ----------
  A('x-mapped', 'explore', 'Cartographer', 'Map a server.', 5, { has: (s) => mappedN(s) >= 1 }),
  A('x-mapper', 'explore', 'Mapper', 'Map 20 servers.', 25, { progress: (s) => of(mappedN(s), 20), has: (s) => titleHas(s, 'mapper'), reward: { title: 'mapper' } }),
  A('x-taken', 'explore', 'Change of Hands', 'Take over a server.', 10, { has: (s) => takenN(s) >= 1 }),
  A('x-taken-10', 'explore', 'Landlord', 'Take over 10 servers.', 25, { progress: (s) => of(takenN(s), 10) }),
  A('x-hubs', 'explore', 'Five Points', 'Find every faction hub.', 10, { progress: (s) => of(FACTION_IDS.filter((f) => hubFound(s, f)).length, FACTION_IDS.length) }),
  A('x-threads', 'explore', 'Loose Ends', 'Finish 5 threads.', 10, { progress: (s) => of((s.threads?.list || []).filter((t) => t.state === 'done').length, 5) }),
  ...Object.entries(FLOOR_ACH).map(([n, [name, pts]]) => A('x-floor-' + n, 'explore', name, `Reach floor ${n}, ${FLOORS[n - 1].name}.`, pts, { group: 'Floors', has: (s) => floor(s) >= Number(n) || (n === '5' && titled(s, 'deepwalker')), reward: { sticker: 'floor-' + n, ...(n === '5' ? { title: 'deepwalker' } : {}), ...(n === '8' ? { casing: 'matte' } : {}) } })),
  // ---------- Collection ----------
  A('k-first', 'collect', 'Gold Star', 'Find a unique.', 5, { has: (s) => uniques(s) >= 1 }),
  A('k-collector', 'collect', 'Collector', 'Find 25 uniques.', 25, { progress: (s) => of(uniques(s), 25), has: (s) => titleHas(s, 'collector'), reward: { title: 'collector' } }),
  A('k-curator', 'collect', 'Curator', 'Find 100 uniques.', 50, { progress: (s) => of(uniques(s), 100), reward: { banner: 'vault' } }),
  A('k-assembler', 'collect', 'Assembled', 'Assemble a faction piece.', 10, { has: (s) => titleHas(s, 'assembler'), reward: { title: 'assembler' } }),
  A('k-pieces', 'collect', 'Five of a Kind', 'Assemble all 5 faction pieces.', 50, { progress: (s) => of(Object.values(PIECES).filter((u) => s.collection?.[u.id]).length, Object.keys(PIECES).length) }),
  A('k-matched', 'collect', 'Matched', 'Find every piece of a set.', 10, { has: (s) => titleHas(s, 'matched'), reward: { title: 'matched' } }),
  ...Object.values(SETS).filter((x) => !x.tier).map((x) => A('k-set-' + x.id, 'collect', x.name, `Find every piece of ${x.name}.`, BIG_SETS.has(x.id) ? 25 : 10, { group: 'Sets', progress: (s) => of(piecesOf(x.id).filter((p) => s.collection?.[p]).length, piecesOf(x.id).length), has: (s) => setDone(s, x.id), reward: { sticker: 'set-' + x.id } })),
  // ---------- Factions ----------
  ...FACTION_IDS.map((f) => A('f-' + f, 'faction', FACTION_ACH[f], `Reach ${FACTIONS[f].tiers[4]} with ${FACTIONS[f].name}.`, 25, { has: (s) => top(s, f) || titled(s, 'of-' + f), reward: { title: 'of-' + f, sticker: 'f-' + f, casing: f } })),
  A('f-couriers', 'faction', "Courier's Bane", 'Intercept 10 couriers.', 10, { progress: (s) => of(deeds(s).couriers || 0, 10), has: (s) => titleHas(s, 'couriersbane'), reward: { title: 'couriersbane' } }),
  A('f-hunts', 'faction', 'Tracker', 'Collect 5 bounty hunts.', 10, { progress: (s) => of(deeds(s).hunts || 0, 5), has: (s) => titleHas(s, 'tracker'), reward: { title: 'tracker' } }),
  A('f-feuds', 'faction', 'Feudbreaker', 'Win 5 feuds.', 25, { progress: (s) => of(deeds(s).feuds || 0, 5), has: (s) => titleHas(s, 'feudbreaker'), reward: { title: 'feudbreaker' } }),
  A('f-contracts', 'faction', 'On Retainer', 'Deliver 25 contracts.', 10, { progress: (s) => of(count('contracts')(s), 25) }),
  // ---------- Classes ----------
  A('cl-sub', 'class', 'Specialist', 'Pick a subclass.', 5, { has: (s) => Object.keys(ARCHETYPES).some((c) => picked(s, c)) }),
  A('cl-ten', 'class', 'Polyglot', 'Take all 4 classes to level 10.', 25, { progress: (s) => of(Object.keys(ARCHETYPES).filter((c) => level(s, c) >= 10).length, Object.keys(ARCHETYPES).length) }),
  ...Object.keys(CLASS_ACH).map((c) => A('cl-' + c, 'class', CLASS_ACH[c], `Take ${/^[AEIOU]/.test(ARCHETYPES[c].name) ? 'an' : 'a'} ${ARCHETYPES[c].name} to level 50.`, 50, { progress: (s) => of(level(s, c), 50), has: (s) => titleHas(s, 'max-' + c), reward: { title: 'max-' + c } })),
  // Ability mastery (mastery.mjs): an ability's effect at its third tier. A handful, never one an ability.
  A('cl-mastery', 'class', 'Second Nature', 'Reach Mastery 3 with an ability.', 10, { group: 'Mastery', has: (s) => masteredN(s) >= 1, reward: { sticker: 'a-mastery' } }),
  A('cl-mastery-5', 'class', 'Muscle Memory', 'Reach Mastery 3 with 5 abilities.', 25, { group: 'Mastery', progress: (s) => of(masteredN(s), 5), has: (s) => masteredN(s) >= 5 || titled(s, 'virtuoso'), reward: { title: 'virtuoso' } }),
  A('cl-mastery-keys', 'class', 'First Principles', 'Reach Mastery 3 with Bash, Ban, Poke and Ping.', 25, { group: 'Mastery', progress: (s) => of(keyOnesN(s), 4), reward: { banner: 'keyone' } }),
  A('cl-mastery-kit', 'class', 'Full Repertoire', 'Reach Mastery 3 with key 1, the core and every skill of one subclass.', 50, { group: 'Mastery', progress: (s) => kitBest(s), reward: { sticker: 'a-kit' } }),
  ...Object.values(SETS).filter((x) => x.tier).map((x) => A('cl-set-' + x.id, 'class', x.name, `Find every piece of ${x.name}.`, 25, { group: 'Tier sets', progress: (s) => of(piecesOf(x.id).filter((p) => s.collection?.[p]).length, piecesOf(x.id).length), has: (s) => setDone(s, x.id), reward: { sticker: 'set-' + x.id } })),
  // ---------- Daemons ----------
  A('d-ten', 'daemon', 'Process Table', 'Find 10 daemons.', 10, { progress: (s) => of(daemonsN(s), 10) }),
  A('d-all', 'daemon', 'Pandemonium', 'Find every daemon.', 50, { progress: (s) => of(daemonsN(s), Object.keys(DAEMONS).length), reward: { banner: 'hydra' } }),
  A('d-slots', 'daemon', 'Full House', 'Slot 4 daemons at once.', 10, { has: (s) => (s.daemons || []).filter((id) => (s.daemonLv?.[id] || 0) > 0).length >= 4 }),
  A('d-acts', 'daemon', 'Background Process', 'Your daemons act 500 times.', 10, { progress: (s) => of(count('daemon')(s), 500) }),
  A('d-feat', 'daemon', 'Unattended', 'Win a fight in which your daemons act 10 times.', 10, { has: flag('d-feat') }),
  // ---------- Co-op ----------
  A('o-crew', 'coop', 'Party Line', 'Win a fight with a crewmate beside you.', 5, { has: (s) => count('crew')(s) >= 1 }),
  A('o-full', 'coop', 'Full Stack', 'Win a fight with a crew of 3 beside you.', 10, { has: flag('o-full') }),
  A('o-dropin', 'coop', 'Drop-in', 'Win a fight a consortium member dropped into.', 10, { has: flag('o-dropin') }),
  A('o-farm', 'coop', 'Farmhand', 'Beat the 3 crew bosses of KESSLER-FARM-00.', 25, { progress: (s) => of(FARM.filter((b) => won(s, b)).length, 3), has: (s) => titleHas(s, 'farmhand'), reward: { title: 'farmhand' } }),
  A('o-grid', 'coop', 'On the Grid', 'Reach Grid with a consortium of 12 servers.', 25, { progress: (s) => of(s.consortium ? (s.consortium.members || []).length + 1 : 0, 12), reward: { banner: 'mesh' } }),
  // ---------- Feats (one fight, one visit) ----------
  A('t-untouched', 'feat', 'Untouchable', 'Win a fight of 8 cycles or more without taking damage.', 10, { has: flag('t-untouched'), reward: { casing: 'smoked' } }),
  A('t-cuts', 'feat', 'Short Circuit', 'Interrupt 3 moves in one fight.', 10, { has: flag('t-cuts') }),
  A('t-read', 'feat', 'Open Book', 'Read every tell in a fight in which 4 or more were said.', 25, { has: flag('t-read') }),
  A('t-chain', 'feat', 'Chain Reaction', 'Break every part of a virus of 3 parts or more in one cycle.', 25, { hidden: true, hint: 'Some things are better all at once.', has: flag('t-chain'), reward: { sticker: 'a-chain' } }),
  A('t-program', 'feat', 'Zero Exceptions', 'Win a fight with a routine you made that never threw an exception.', 25, { has: flag('t-program'), reward: { sticker: 'a-noexc' } }),
  A('t-solo', 'feat', 'Lone Wolf', 'Beat a ◆ CREW elite with no crew beside you.', 25, { has: flag('t-solo'), reward: { sticker: 'a-solo' } }),
  A('t-norest', 'feat', 'No Rest', 'Map a server on a visit in which you never rest.', 25, { has: (s) => (s.locations || []).some((l) => l.floorplan?.mapped && l.floorplan.mappedRest === false) }),
  A('t-thread', 'feat', 'By a Thread', 'Win a fight with under 5% of your health left.', 10, { hidden: true, hint: 'Closer than it looked.', has: flag('t-thread'), reward: { sticker: 'a-thread' } }),
].map((a) => ({ ...a, has: a.has || ((s) => { const [n, N] = a.progress(s); return n >= N; }) })));
export const achById = (id) => achievements().find((a) => a.id === id) || null;
export const pointsOf = (s) => achievements().reduce((n, a) => n + (earned(s, a.id) ? a.pts : 0), 0);
export const totalPoints = () => achievements().reduce((n, a) => n + a.pts, 0);
// A check never breaks the tick: a read that throws counts as not yet.
const holds = (a, s) => { try { return !!a.has(s); } catch { return false; } };
export const progressOf = (a, s) => { try { return a.progress ? a.progress(s) : null; } catch { return null; } };
// What an achievement gives, as words (its tooltip, the pager).
export function rewardText(a) {
  const r = a.reward || {}, out = [];
  if (r.title) out.push(`the title ${titleById(r.title)?.name}`);
  if (r.sticker) out.push('a sticker');
  if (r.banner) out.push('a banner');
  if (r.casing) out.push('a casing colourway');
  if (r.district) out.push(`the window district ${DISTRICT_NAMES[r.district] || r.district}`);
  if (r.prop) out.push(`a desk prop, the ${PROP_NAMES[r.prop] || r.prop}`);
  out.push(...terminalRewardWords(a.id)); // a boot sequence, a prompt, a cursor: the block at the end of this file
  return out.length ? `Rewards ${out.length > 1 ? `${out.slice(0, -1).join(', ')} and ${out.at(-1)}` : out[0]}.` : '';
}
// The deed stickers you've earned (profile.mjs stickersOf adds them to the rest).
export const deedStickers = (s) => achievements().filter((a) => a.reward?.sticker && DEED_STICKERS[a.reward.sticker] && earned(s, a.id)).map((a) => ({ id: a.reward.sticker, kind: 'deed', ...DEED_STICKERS[a.reward.sticker] }));
// Every sticker an earned achievement brought, by id (profile.mjs stickersOf keeps them for good; casing.mjs's decals).
export const rewardStickers = (s) => achievements().filter((a) => a.reward?.sticker && earned(s, a.id)).map((a) => a.reward.sticker);
// The reward banners you've earned (profile.mjs: they join the twelve presets in your editor).
export const bannersOf = (s) => achievements().filter((a) => a.reward?.banner && earned(s, a.id)).map((a) => a.reward.banner);
// Your most recent, or the ones you pinned (up to 3): the profile card's row.
export const PIN_MAX = 3;
export function shownAchievements(s, n = PIN_MAX) {
  const A = s.achievements;
  if (!A) return [];
  const pins = (A.pins || []).filter((id) => A.got?.[id] && achById(id));
  const recent = Object.entries(A.got || {}).filter(([id]) => achById(id) && !pins.includes(id)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return [...pins, ...recent].slice(0, n).map(achById);
}

// ---------- the window's districts and the desk's props ----------
// Cosmetic rewards for the window behind the monitor (window.mjs DISTRICTS: casing.mjs districtOpen) and the props on
// the desk (casing.mjs PROPS), added to achievements already in the list above. Kept in a block of their own: the
// list's lines stay as they are, and achievements() is the list with these rewards added (the same objects every call).
export const DECOR_REWARDS = {
  'x-floor-2': { district: 'backhaul' }, // Down the Line: the line to the rail yards
  'x-mapper': { district: 'stacks' }, // Mapper: twenty servers mapped, and the towers they run in
  'f-lantern': { district: 'coldline' }, // On the Signal: LANTERN's harbour and its lighthouse
  'c-crowns': { district: 'tarbeach' }, // Every Crown: up on the roofs
  'c-patient': { prop: 'mug' }, // Long Uptime: a long night
  't-program': { prop: 'duck' }, // Zero Exceptions: rubber-duck debugging
  'x-hubs': { prop: 'keycard' }, // Five Points: a keycard for every hub
  't-untouched': { prop: 'cactus' }, // Untouchable: nothing gets near it
  'k-collector': { prop: 'floppies' }, // Collector: a stack of disks
  't-thread': { prop: 'die' }, // By a Thread: luck
};
const DISTRICT_NAMES = { backhaul: 'Backhaul', stacks: 'The Stacks', coldline: 'Coldline', tarbeach: 'Tar Beach' };
const PROP_NAMES = { mug: 'coffee mug', duck: 'rubber duck', keycard: 'keycard', cactus: 'cactus', floppies: 'floppy stack', die: 'lucky die' };
let DECORATED = null;
export const achievements = () => (DECORATED ||= listed().map((a) => (DECOR_REWARDS[a.id] ? { ...a, reward: { ...a.reward, ...DECOR_REWARDS[a.id] } } : a)));

// ---------- earning ----------
// Mark them earned and hand out their rewards (a title joins your titles: profile.mjs). quiet: no pager line.
function grant(s, list, when) {
  const S = achOf(s), p = myProfile(s);
  for (const a of list) {
    if (S.got[a.id]) continue;
    S.got[a.id] = when;
    const r = a.reward || {};
    if (r.title && !p.titles.includes(r.title)) p.titles.push(r.title);
  }
}
// Every second: what the log said since last time (contracts delivered, servers taken over), then any achievement
// now earned. One quiet pager line for all of them (comms.mjs), and a line on #net (channel.mjs). Returns the new ones.
export function tickAchievements(s, now = clock()) {
  const S = achOf(s);
  for (const e of s.logs || []) {
    if (e.id <= S.seen) continue;
    if (e.type === 'contract-done') S.n.contracts++;
    if (e.type === 'takeover') S.n.takeovers++;
  }
  S.seen = s.serial || 0;
  if (S.record) { const n = S.record; delete S.record; S.seen = emit(s, 'achievement', `Achievements: ${n} earned from your record.`, { achievements: [], record: n }).id; }
  const fresh = achievements().filter((a) => !S.got[a.id] && holds(a, s));
  if (!fresh.length) return [];
  grant(s, fresh, now);
  const names = fresh.map((a) => a.name), titles = fresh.map((a) => a.reward?.title).filter(Boolean);
  S.seen = emit(s, 'achievement', `Achievement${fresh.length > 1 ? 's' : ''}: ${names.join(', ')}.`, { achievements: fresh.map((a) => a.id), titles }).id;
  return fresh;
}
// The engine's hand-off when a fight ends (combat.mjs finish): its counts, and the feats one fight can do. It only
// writes s.achievements, and a read that throws never stops the fight's end.
export function fightOver(s, e, result) {
  try { noteFight(s, e, result); } catch { /* an achievement is never worth a fight */ }
}
function noteFight(s, e, result) {
  if (s.who || !e?.metrics || !e.virus) return;
  const S = achOf(s), m = e.metrics, F = S.flags;
  if (result !== 'victory') return;
  if (e.virus.elite) S.n.elites++;
  S.n.daemon += m.daemon || 0;
  const party = e.party || 1, guests = (e.guests || []).length;
  if (party > 1) S.n.crew++;
  if (party - guests >= 4) F['o-full'] = 1;
  if (guests) F['o-dropin'] = 1;
  if ((m.daemon || 0) >= 10) F['d-feat'] = 1;
  if (e.cycle >= 20) F['c-patient'] = 1;
  if (!m.attackDamage && e.cycle >= 8) F['t-untouched'] = 1;
  if ((m.cuts || 0) >= 3) F['t-cuts'] = 1;
  const said = Object.values(m.tells || {}).reduce((n, x) => n + (x.said || 0), 0);
  if (e.cleanRead && said >= 4) F['t-read'] = 1;
  if (e.virus.elite && party === 1) F['t-solo'] = 1;
  const d = defender(s);
  if (d?.max && d.integrity > 0 && d.integrity / d.max < 0.05) F['t-thread'] = 1;
  // A routine you made or confirmed for this virus (routines.mjs confirmed), that fired and never threw.
  const body = e.virus.strain || e.virus.family, key = picked(s, classOf(s)) || classOf(s);
  if ((m.program || 0) >= 5 && s.programs?.by?.[key]?.routines?.[body]?.confirmed && !Object.keys(e.program?.thrown || {}).length) F['t-program'] = 1;
  // Every part (fragments aside) broken in the fight's last cycle, 3 or more of them.
  const parts = e.virus.parts.filter((p) => p.kind !== 'fragment');
  if (parts.length >= 3) {
    const last = new Set();
    for (let i = (s.logs || []).length - 1; i >= 0; i--) {
      const ev = s.logs[i];
      if ((e.serial0 != null && ev.id <= e.serial0) || ev.cycle !== e.cycle) break;
      if (ev.type === 'broken' && !ev.c2 && !ev.who) last.add(ev.target);
    }
    if (parts.every((p) => last.has(p.id))) F['t-chain'] = 1;
  }
}

// ---------- old saves ----------
// On load (combat.mjs restore). A save from before achievements: everything it has already done is earned now,
// quietly (its titles and stickers among them), and the next tick says how many in one line. A save that has them:
// every title it holds has its achievement (no loss either way).
export function achievementsRestore(s) {
  const had = !!s.achievements, S = achOf(s), now = clock();
  if (!had) {
    S.seen = s.serial || 0; // its log so far is counted below, from what it holds
    S.n.contracts = (s.mail?.jobs || []).filter((j) => j.done).length;
    S.n.takeovers = (s.locations || []).filter((l) => l.takenOver && !l.member).length;
    const done = achievements().filter((a) => holds(a, s));
    if (done.length) { grant(s, done, now); S.record = done.length; }
    return;
  }
  const owed = achievements().filter((a) => !S.got[a.id] && a.reward?.title && titled(s, a.reward.title));
  if (owed.length) grant(s, owed, now);
}

// ---------- commands ----------
// achievements, achieve pin <name|id>, achieve unpin <name|id>. (The page is the System tab's Achievements.)
const find = (q) => { const w = String(q || '').toLowerCase().trim(); return achievements().find((a) => a.id === w || a.name.toLowerCase() === w) || null; };
export function achieveCommand(s, raw) {
  const words = String(raw).trim().split(/\s+/), verb = (words[1] || '').toLowerCase(), rest = words.slice(2).join(' ');
  const S = achOf(s), all = achievements();
  if (!verb) return emit(s, 'info', `Achievements: ${all.filter((a) => S.got[a.id]).length} of ${all.length}, ${pointsOf(s)} points.`);
  if (verb === 'pin' || verb === 'unpin') {
    const a = find(rest);
    if (!a) return warn(s, `No achievement called ${rest || 'that'}.`);
    if (verb === 'unpin') { S.pins = S.pins.filter((id) => id !== a.id); return emit(s, 'info', `Unpinned ${a.name}.`); }
    if (!S.got[a.id]) return warn(s, `${a.name} isn't earned yet.`);
    S.pins = [a.id, ...S.pins.filter((id) => id !== a.id)].slice(0, PIN_MAX);
    return emit(s, 'info', `Pinned ${a.name} to your card.`);
  }
  return warn(s, 'achievements, achieve pin <name>, achieve unpin <name>');
}
// developer achieve <id|all|reset>: grant one, all, or start over (dev only, app.js gates it).
export function developerAchieve(s, what) {
  const S = achOf(s);
  if (what === 'reset') { s.achievements = null; achOf(s); return emit(s, 'info', 'Developer: achievements cleared.'); }
  const list = what === 'all' ? achievements() : [find(what)].filter(Boolean);
  if (!list.length) return warn(s, `developer achieve <${achievements().slice(0, 3).map((a) => a.id).join('|')}|…|all|reset>`);
  grant(s, list, clock());
  emit(s, 'achievement', `Achievement${list.length > 1 ? 's' : ''}: ${list.length > 3 ? `${list.length} granted` : list.map((a) => a.name).join(', ')}.`, { achievements: list.map((a) => a.id), titles: list.map((a) => a.reward?.title).filter(Boolean) });
}

// ---------- Terminal cosmetics (terminal.mjs): boot sequences, prompts and cursors ----------
// A block of its own, so the list above merges cleanly. Each reward rides on an achievement above, reused as it is:
// achievement id → { boot, prompt, cursor } (terminal.mjs BOOT_LOOKS, PROMPTS, CURSORS name them). Built on first use, like
// the list (factions.mjs may still be loading when this module is).
let TERMINAL = null;
export const terminalRewards = () => (TERMINAL ||= {
  'c-patient': { boot: 'bios' },
  't-thread': { boot: 'glitch' },
  't-norest': { boot: 'minimal' },
  ...Object.fromEntries(FACTION_IDS.map((f) => ['f-' + f, { boot: 'f-' + f, prompt: 'root' }])),
  'k-matched': { prompt: 'title' },
  't-cuts': { prompt: 'arrow' },
  't-program': { prompt: 'lambda' },
  'cl-sub': { prompt: 'powerline' },
  'x-mapped': { cursor: 'underline' },
  'd-ten': { cursor: 'beam' },
});
export const terminalReward = (id) => terminalRewards()[id] || null;
// The achievements that bring a look (kind: boot, prompt or cursor), and the words an achievement's tooltip adds.
export const terminalFrom = (kind, look) => achievements().filter((a) => terminalReward(a.id)?.[kind] === look);
function terminalRewardWords(id) {
  const t = terminalReward(id) || {};
  return [t.boot && 'a boot sequence', t.prompt && 'a prompt', t.cursor && 'a cursor'].filter(Boolean);
}
