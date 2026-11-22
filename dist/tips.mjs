// First-time tips: the game's only tutorial. The screens show names, numbers and state; the
// first time you meet something, a tip points at it and says how it works, once. One tip at a
// time; fight tips pause the fight until you close them. Seen tips live in settings, so a
// reset game doesn't repeat them (System → Replay tips does). wick narrates them all, in his lowercase.
//
// Each tip: id · page (a module, or '*' for any) · at (a CSS selector; the tip waits until it's
// on screen) · when (optional: state it needs) · text · pause (fight tips) · under (optional:
// sit clear of this container, so the thing it explains stays in view) · clear (optional: what else it never covers,
// the buttons it names; app.js placeTip).
import { keyMap } from './combat.mjs';
import { ARCHETYPES, SYNC } from './data.mjs';
import { GENES } from './genes.mjs';
import { rivalOf, wickLine } from './rivals.mjs';
import { ROOM_RULES } from './families.mjs';
import { hackerLevel, loadedOn, classOf } from './combat.mjs';
const spare = (s) => (s.stash || []).some((it) => !loadedOn(s, it.id)); // something you could load

const home = (s) => s.encounter?.mode !== 'run';
// Your home server has an intrusion at its gate (view.mjs gateOf).
const atGate = (s) => { const e = s.encounter; return !!((e && e.mode !== 'run' && !e.invader && (e.phase === 'alert' || e.phase === 'active')) || s.gate); };

// ---------- the rooms tour: your first server ----------
// A short guided tour of a server's room map (the Run tab), a step at a time, each pointing at the thing to do and
// moving on when you do it (click it, or type its command): walk into a room, a virus's card, then Jack out once
// you've won a fight. A cache, the hunter and the rest room get their step the first time you meet them (SPRAWL-00,
// where you start, has none). Got it closes a step, Skip tour ends them all, and tips off stops it. The tour is kept on the save (s.tour), so it shows
// once a save. Each step: mark(s) is taken as it shows, done(s, mark) says you did it,
// also is another click that does it (the room you came from, Leave it).
const visitOf = (s) => (s.rooms?.at ? s.rooms : null);
const hereKind = (s) => s.rooms?.at && s.rooms.graph.rooms[s.rooms.at]?.kind;
const movesOf = (s) => s.rooms?.stats?.moves || 0;
const TOUR_STEPS = [
  { id: 'tour-walk', at: '.fp-room.reach', clear: '.fp-room.reach, .fp-room.here', when: (s) => !!visitOf(s) && !s.rooms.screen, mark: movesOf, done: (s, m) => movesOf(s) > m,
    text: 'click a room beside yours to walk there. the number on its corner is the integrity it costs.' },
  { id: 'tour-engage', at: '#fp-pop [data-rooms="engage"], #fp-pop [data-rooms="assist"]', also: '.fp-room.reach', after: ['tour-walk'], when: (s) => s.rooms?.screen?.kind === 'virus', done: (s) => s.rooms?.screen?.kind !== 'virus',
    text: 'something\'s living in there. engage (or help, beside a runner), or click the room you came from to back out.' },
  { id: 'tour-cache', at: '#fp-pop [data-rooms="pull"]', also: '#fp-pop [data-fp-pop-close]', after: ['tour-walk'], when: (s) => hereKind(s) === 'cache' && !s.rooms.screen,
    mark: (s) => `${s.rooms.at}:${s.rooms.taken[s.rooms.at] ?? ''}`, done: (s, m) => `${s.rooms?.at}:${s.rooms?.taken[s.rooms?.at] ?? ''}` !== m,
    text: 'that\'s a cache of credits and code. one in four is bait, and its card says which.' },
  { id: 'tour-hunter', at: '.fp-hunt:not(.out)', after: ['tour-walk'], when: (s) => !!visitOf(s) && !s.rooms.screen, mark: movesOf, done: (s, m) => movesOf(s) > m,
    text: 'that\'s the hunter: it moves when you walk or wait, and this says when.', more: (s) => (classOf(s) === 'infiltrator' ? 'if it reaches you, slip past it or fight it.' : 'if it reaches you, you fight it.') },
  { id: 'tour-rest', at: '#fp-pop [data-rooms="rest"]:not([disabled])', also: '#fp-pop [data-fp-pop-close]', after: ['tour-walk'], when: (s) => hereKind(s) === 'rest',
    mark: (s) => s.rooms.at, done: (s, m) => !!s.rooms?.visit?.rested || s.rooms?.at !== m,
    text: 'rest here once a visit for some integrity back. the hunter never comes in.' },
  { id: 'tour-jackout', at: '.fp-acts [data-rooms="jackout"]:not([disabled])', when: (s) => !!visitOf(s) && !s.rooms.screen && (s.rooms.stats?.won || 0) > 0, done: (s) => !s.rooms?.at,
    text: 'you collect items while navigating new servers. jacking out saves the visit and banks them. lose all your integrity first and the visit is undone.' },
];
export const TOUR = TOUR_STEPS.map((t) => ({ ...t, page: 'rooms', tour: true }));
export const tourIds = TOUR.map((t) => t.id);
// How far along the tour is: the steps done or skipped, of all of them (the tip's 2/6).
export const tourDone = (s) => tourIds.filter((id) => s.tour?.[id]).length;
// Skip tour: every step done, none shows again on this save.
export function skipTour(s) { s.tour ||= {}; for (const id of tourIds) s.tour[id] = 1; }

export const TIPS = [
  ...TOUR, // first, on the rooms page: the tour of your first server (above)
  // ---------- anywhere ----------
  // Your first protocol: Loadout → the Protocols tab → Load. Three short steps, each pointing at the next click.
  { id: 'protocol', page: '*', at: '.modules [data-module="loadout"]', when: (s, m) => m !== 'loadout' && spare(s), text: 'you\'ve got a protocol sitting idle. open loadout to equip it. you can only equip at home, off a run and out of a fight.' },
  { id: 'protocol-tab', page: 'loadout', at: '[data-ltab="protocols"][aria-selected="false"]', when: (s) => spare(s), text: 'your protocols are on this tab.' },
  { id: 'protocol-home', page: 'loadout', at: '.inv-btn.load[disabled]', when: (s) => !!s.run || s.encounter?.phase === 'active', text: 'you can only equip at home. jack out, finish any fight, then come back and hit load.' },
  { id: 'protocol-load', page: 'loadout', at: '.inv-btn.load:not([disabled])', text: 'hit load. every protocol you load adds its stats to yours, every fight.' },
  { id: 'top-up', page: '*', at: '#meter-integrity .meter-buy', text: 'integrity refills on its own at home, and the clock says how long. hit + to buy it back now with credits.' },
  { id: 'routines', page: '*', at: '.modules [data-module="loadout"]', when: (s, m) => m !== 'loadout' && hackerLevel(s) >= 5, text: 'from level 5, when the timer runs out, your program moves for you. set it up on loadout → program.' },
  { id: 'level', page: '*', at: '#whoami', when: (s) => hackerLevel(s) >= 2, text: 'that\'s you: your handle, your class and its level. each level to 6 makes you 6% stronger. past that your gear carries you, and some levels unlock new skills.' },

  // ---------- map ----------
  // Your first move: the one tip on the opening map. It stays until you connect.
  { id: 'map-start', page: 'map', at: '.mnode.zone .mhex', clear: '.map-pop', when: (s) => !s.rooms, done: (s) => !!s.rooms, text: 'that\'s sprawl-00. nobody owns it, and strays roam all over it. click it and connect.' },
  // Your server and its gate wait for the first intrusion; the ? servers, for the first trace on one.
  { id: 'map-server', page: 'map', at: '.mnode.server', when: atGate, joins: ['map-intrusion'], text: 'that\'s your server. it sits above the net, and anything attacking it shows up beside it.' },
  // ---------- the rooms (the Run tab) ----------
  { id: 'socket', page: 'rooms', at: '.fp-room.k-socket', text: 'this is a socket room. clear its guard once and you can build here. a program in a socket changes this server\'s rules, and only this server\'s.' },
  // A server's takeover path, the first time you see each step: the vault, its key, the sealed Core.
  { id: 'room-vault', page: 'rooms', at: '.fp-room.k-vault', text: 'this is the vault, where the server keeps its files. the elite on the guard post has the key, or you force it and pay in integrity.' },
  { id: 'room-core', page: 'rooms', at: '.fp-room.k-core', text: 'this is the core, where the resident lives. it stays sealed till the vault\'s open. beat it and the server\'s yours.' },
  { id: 'room-elite', page: 'rooms', at: '.fp-room.k-elite', text: `this is an elite room. its virus is tougher and has one more tell, and it enrages from cycle ${ROOM_RULES.enrage.elite}.` },
  { id: 'room-thread', page: 'rooms', at: '.fp-quest.m-start', text: 'someone in here has work for you. walk in and talk. threads you take are tracked in mail.' },
  { id: 'run-signal', page: 'rooms', at: '.fp-sig.mid, .fp-sig.low', after: ['tour-walk'], text: 'your integrity\'s getting thin. at 0 you\'re home and this visit is undone.', more: (s) => (Object.values(s.rooms?.graph?.rooms || {}).some((r) => r.kind === 'rest') ? 'find a rest room or jack out.' : 'jack out to keep what you carry.') },
  { id: 'run-rival', page: 'rooms', at: '.fp-rvstat', lead: (s) => (rivalOf(s) ? wickLine(s, rivalOf(s)) : ''), text: 'they\'re racing you to the vault. if they reach you, you fight the lot. beat them and their pack is yours.' },
  { id: 'exfil', page: 'rooms', at: '.fp-exfil', text: 'an exfil\'s uploading a stolen archive off this server, and it runs from you. corner it and break its uplink before the upload finishes.' },
  // A puzzle room's board, the first time you see each one (puzzle-view.mjs). One go a board: played to its end, it refills in two hours.
  { id: 'pz-quarantine', page: 'rooms', at: '.pz-panel.k-quarantine .pz-well', text: 'after each firewall you place, the worm copies into the marked node. wall it in early, against an edge. every node it never reaches pays this server\'s code.' },
  { id: 'pz-chase', page: 'rooms', at: '.pz-panel.k-chase .pz-well', text: 'the tracker always moves the same way: sideways toward you, then up or down. it never goes around a wall, so lead it into one. red rooms are where it\'d catch you.' },
  { id: 'pz-cascade', page: 'rooms', at: '.pz-panel.k-cascade .pz-well', text: 'push a node past 3 and it discharges too, which can set off a chain. find the tap that brings down half the rack.' },
  { id: 'pz-sweep', page: 'rooms', at: '.pz-panel.k-sweep .pz-well', text: 'a ping says how many steps to the cache, counting across and down. the faint ring is every cell at that distance. dig where the rings cross.' },
  { id: 'map-intrusion', page: 'map', at: '.mnode.intrusion', text: 'something\'s waiting at your gate. select it and hit engage when you\'re ready. it sits there till you do.' },
  { id: 'map-exit', page: 'map', at: '.mnode.exit', text: 'this is the way down to the next floor. it sits beside a server you located. go down from that server\'s card. the floor below runs higher-level servers.' },
  { id: 'map-origin', page: 'map', at: '.mnode.loc', text: 'you found a server. select it and connect. its ring fills as you explore it.' },
  { id: 'map-memory', page: 'map', at: '.mem-join', text: 'these pips are your free memory: how many more servers your network holds. the blinking one is what this server would take. detach a server to free one.' },
  { id: 'map-invader', page: 'map', at: '.mnode.invader[data-select="invader"]', text: 'an invasion\'s heading home. once it gets there it eats your integrity until you intercept it. the longer it sits, the bigger its bounty.' },
  { id: 'map-breach', page: 'map', at: '.mnode.invader.breach', text: 'a breach eats integrity every minute. jack in and fight it yourself, and it counts as a full kill.' },
  { id: 'map-contract', page: 'map', at: '.mnode.job', text: 'a contract points here. open the vault for the file you were sent for, or beat the resident in /core and take the server.' },
  { id: 'pager', page: '*', at: '#pager .led.on', text: 'this is your pager. mail, offers, finished contracts, your retainer and news off the net land here. click it for the list.' },
  { id: 'mail', page: '*', at: '.modules [data-module="mail"]', when: (s, m) => m !== 'mail' && (s.mail?.list || []).some((x) => !x.read), text: 'you\'ve got mail. your crew, lowlight and halcyon mutual send you contracts here.' },

  // ---------- mail ----------
  { id: 'mail-standing', page: 'mail', at: '.standing', text: 'this shows your standing with halcyon mutual. they pay you a retainer every 30 minutes, and more as it grows. contracts raise it.' },
  { id: 'mail-contract', page: 'mail', at: '.contract', text: 'a contract tracks itself as you play. when it\'s done, deliver it here and get paid.' },
  { id: 'mail-board', page: 'mail', at: '.mlist.mboard', text: 'this is halcyon\'s board. offers come and go on their own, and you can hold three at a time. only the ones you take count.' },
  { id: 'hub-shop', page: 'hub', at: '.hub-win .shop-shelf .ptile', text: 'every hub has a shop with its faction\'s own goods. better rep opens more of the shelf and trims the price.' },
  { id: 'store-codebases', page: 'hub', at: '.hub-win .shop-cbs', text: 'these are codebases. buy one once and you can build its program in any socket you\'ve cleared.' },
  // ---------- hub sessions ----------
  { id: 'hub-menu', page: 'hub', at: '.hub-row', text: 'you\'re on a faction hub. click a line or type its number to open that window: its market, its work, its payloads and more.' },
  // The market, one step per tip in the order you meet it: rows, ▲/▼, the news, then the ticket.
  { id: 'hub-market', page: 'hub', at: '.mk-wares .mk-row', text: 'each row shows how many of a ware you hold, what this hub pays for one (sell) and what it charges (buy). click a ware to trade it.' },
  { id: 'hub-compare', page: 'hub', at: '.mk-wares .mk-d', text: '▲ means this hub pays more than the average hub, ▼ less. prices differ hub to hub, so sell where a ware\'s ▲ and buy where it\'s cheap.' },
  { id: 'hub-news', page: 'hub', at: '.mk-tags .tag', text: 'this shows what this hub always wants, and any market card moving its prices now. hover one to see which.' },
  { id: 'hub-slider', page: 'hub', at: '.mk-ticket input[data-mk-n]', text: 'drag for how many. each one you sell drops this hub\'s price a little and each one you buy raises it, so a big order gets a worse price per unit.' },
  { id: 'hub-preview', page: 'hub', at: '.mk-ticket .mk-prev', text: 'this is your order before you place it: the total, the price per unit, and how it stacks up against the same order elsewhere. amber means it\'s better here.' },
  { id: 'hub-go', page: 'hub', at: '.mk-ticket .mk-go', text: 'orders take the minutes next to ⇄ to arrive, and relays cut that down. prices you\'ve pushed drift back over a few hours.' },
  { id: 'hub-xfers', page: 'hub', at: '.mk-xfers', text: 'these are your orders in transit. → is outgoing and pays when it lands. ← is incoming. each bar fills as its order arrives.' },
  { id: 'store-chase', page: 'hub', at: '.hub-win .shop-rail', text: 'these are this faction\'s own protocols, each with a signature rule. better rep opens the higher tiers.' },
  { id: 'map-drop', page: 'map', at: '.mnode.drop', text: 'something\'s happening on this server. its card says what, and how long you\'ve got.' },
  { id: 'map-rogue', page: 'map', at: '.mnode.rogue', text: 'this is a rogue server. nobody\'s ever taken it. viruses hold its rooms and come back a few minutes after you kill them.' },
  { id: 'map-build', page: 'map', at: '.prog-row', text: 'this row shows the server\'s sockets and the programs built in them. clear a socket room on a run, then build in it from its pop-up here. a program only works on the server it\'s built on.' },
  { id: 'map-owned', page: 'map', at: '.mnode.loc.owned', text: 'this one\'s yours now. put a relay on it from its card to ping the unknown servers next to it.' },
  { id: 'map-hidden', page: 'map', at: '.mnode.hidden', when: (s) => (s.hidden || []).some((n) => n.lead > 0), text: 'this is an unknown server. clear the servers linked to it to trace it: first clears, mapped servers and vault trace records all count. once a relay flags it, kills count too.' },

  // ---------- fight ----------
  // Your first fight: one pause, not four. The board, the keys, armor and the Sync Window are
  // clicked through as steps of one tip, each pointing at its own thing; each still shows alone
  // if it turns up later.
  { id: 'fight-timeline', page: 'combat', pause: true, at: '.board .bnow', under: '#board', when: (s) => s.encounter?.phase === 'active', joins: ['fight-keys', 'fight-ticks', 'fight-armor', 'sync'], text: 'this is the combat console halcyon installed to fight viruses. it shows their structure and attacks. the "now" column shows what happens during this cycle. each column to the right is a cycle in the future. you move first, and then the virus attacks back.' },
  { id: 'fight-keys', page: 'combat', pause: true, at: '#tray', under: '.command-dock', when: (s) => s.encounter?.phase === 'active', text: 'to attack, pick a skill (its number or a click), then click a part. or type it: the skill, then the part. if the timer runs out, you hit the last part you targeted again.' },
  // The interrupt (interrupt.mjs): the ticks, and a tick spent for nothing.
  { id: 'fight-ticks', page: 'combat', pause: true, at: '.board .ptick', under: '#board', when: (s) => s.encounter?.phase === 'active', text: 'notice these ticks on the virus parts? push a part past one during the current cycle and the part\'s attack is canceled. each mark works once.' },
  // From your second fight: Overload on the bare part is the first fight's obvious play.
  { id: 'fight-wasted', page: 'combat', pause: true, at: '.board .ptick.spent', under: '#board', when: (s) => s.encounter?.phase === 'active' && (s.encounter.metrics?.wasted || 0) > 0 && (s.pace?.kills || 0) > 0, text: 'you crossed that tick with no attack due, so it\'s spent for nothing. save the big hits for the cycle an attack lands.' },
  { id: 'fight-armor', page: 'combat', pause: true, at: '.board .chits', under: '#board', text: 'see the ◆? that\'s armor. each hit knocks one off and does nothing else. chip it bare with the small stuff, then hit it hard.' },
  { id: 'sync', page: 'combat', at: '#sync-win', pause: true, text: 'the bar under now fills as the cycle runs. hit enter inside the bright window and you deal 10% more.', more: (s) => `as ${/^[AEIOU]/.test(ARCHETYPES[classOf(s)].name) ? 'an' : 'a'} ${ARCHETYPES[classOf(s)].name.toLowerCase()}, it also ${SYNC[classOf(s)].rule.replace(/^./, (c) => c.toLowerCase())}` },
  { id: 'fight-patch', page: 'combat', pause: true, at: '.board .intent.patch', under: '#board', text: 'a part with no ◆ left grows one back five cycles later, unless you break it first.' },
  // Bosses: the ♛ part's ticks start acts (interrupt.mjs rule a).
  { id: 'fight-crown', page: 'combat', pause: true, at: '.board .tag.crown', under: '#board', text: 'the ♛ part is the boss. push it past a mark and it starts its next act, and the fight changes.' },
  // The Resident's act 1 (acts.mjs backlash): the Return chip, on your first Resident.
  { id: 'fight-backlash', page: 'combat', pause: true, at: '.board .intent.lash', under: '#board', text: 'see the ↩? that\'s the resident\'s beat. hit a part on that cycle and it hits you back. shield up then, or hit something with no attack.' },
  // Levers (docs/puzzle-levers.md): an elite's clash, then a plain fight's one lever, from level 6.
  { id: 'fight-clash', page: 'combat', pause: true, at: '.board .tag.clash', under: '#board', text: 'this elite\'s two rules pull against each other, so answering one makes the other harder. hover ⇄ for the pull and the answer.' },
  { id: 'fight-lever', page: 'combat', pause: true, at: '.board .bpart.lever', under: '#board', text: 'this part has a rule that makes your usual move the wrong one. read the red tag on its row before you hit.' },
  { id: 'fight-objective', page: 'combat', pause: true, at: '.phase-strip .ps-obj', text: 'this fight has an objective. hover it to see what it wants. meet it and the loot rolls again, with half again the xp.' },
  { id: 'fight-cracked', page: 'combat', pause: true, at: '#hud .cracked-cells', text: 'these are cracked cells. your next heals lose this much. purge, scrub, rollback or rotate keys clears them.' },
  { id: 'fight-status', page: 'combat', at: '#hud .hud-status .st', when: (s) => s.encounter?.phase === 'active', text: 'effects on you show here. hover one for what it does and how long it lasts.' },
  { id: 'fight-miss', page: 'combat', at: '#board', when: (s) => (s.encounter?.metrics?.misses || 0) > 0, text: 'you missed. a miss deals no damage, and the cooldown\'s still spent. enemies above your level make you miss more often.' },
  { id: 'fight-daemon', page: 'combat', at: '.board .intent.daemon:not(.cron)', under: '#board', text: 'that\'s your daemon. it acts on its own cooldown, in the cycle where its chip sits, on top of your own move.' },
  { id: 'fight-proc', page: 'combat', pause: true, at: '#tray .lit', text: 'a skill lit up. it only works for a cycle or two after something happens, so use it while it glows.' },


  // ---------- loadout ----------
  { id: 'loadout-status', page: 'loadout', at: '.sk-status', text: 'your skills put this status on parts. hover it to see what it does.' },
  { id: 'loadout-bar', page: 'loadout', at: '.cls-toolkit', text: 'your keys live in the toolkit (t). drag an ability onto a key, or tap it and then a key. key 1 is your basic attack.' },
  { id: 'loadout-classes', page: 'loadout', at: '.arch-tabs', text: 'there are four classes, and each one levels up on its own. you can switch between them at home.' },
  { id: 'loadout-talents', page: 'loadout', at: '.cls-tree', when: (s) => hackerLevel(s) >= 10, text: 'from level 10 a talent tier opens every six levels in your subclass\'s tree. pick one of its three. changing picks at home is free.' },
  // Your program (routines.mjs): the handler editor on Loadout → Program.
  { id: 'program-editor', page: 'loadout', at: '.rt-editor', text: 'when the timer runs out, your program moves. pick a virus, then a ready-made routine, or drag when, do and target chips onto a handler. the first that fits fires, else the rotation.' },

  // ---------- daemons ----------
  { id: 'daemons', page: 'loadout', at: '.daemon-slots', text: 'daemons come from invasions. a slotted one fights beside you, on its own cooldown or when its moment comes. a higher-level copy replaces the one you have.' },
  // The Codex tab, once there's something in it: your first decoded part (and never mid-fight).
  { id: 'codex', page: '*', at: '.modules [data-module="codex"]', when: (s, m) => m !== 'codex' && s.encounter?.phase !== 'active' && Object.values(s.research || {}).some((n) => n > 0), text: 'you decoded your first part. the codex keeps each part\'s research: break it, cut it and answer its tells to learn its rule.' },
];

// ---------- pacing ----------
// Tips never pile up. A map, room or menu tip (calm) shows at most once a screen visit, and CALM_MS after the last one
// closed (pace.quiet). A fight tip about what the fight opened with (opening) shows only while the fight is paused
// (room and breach fights open paused until your first order), once a fight (pace.told); it waits for a later fight
// otherwise. A fight tip about what arrives mid-fight (MID) pauses the fight as it lands. Tour steps and urgent tips
// skip the pacing.
export const CALM_MS = 120_000;
const MID = new Set(['fight-wasted', 'fight-patch', 'fight-tell', 'fight-cast', 'fight-seal', 'fight-mimic', 'fight-lock', 'fight-fuse',
  'fight-bin', 'fight-cracked', 'fight-status', 'fight-miss', 'fight-proc', 'fight-scrape']);
export function paceOf(t, page) {
  if (t.tour || t.urgent) return 'free';
  if (page === 'combat' && (t.page === 'combat' || t.pause)) return MID.has(t.id) ? 'mid' : 'opening';
  return 'calm';
}

// The next tip to show on this page, or null. `visible(selector)` says whether an element is on
// screen (the browser passes a DOM check; tests pass their own). pace: { quiet, told } from the app (above).
export function nextTip(s, page, visible, pace = {}) {
  if (s.settings?.tips === false) return null;
  const seen = s.settings?.seen || {};
  for (const t of TIPS) {
    if (seenOf(s, t.id)) continue;
    if (t.after?.some((id) => !seenOf(s, id))) continue; // a tour step waits for the one before it
    if (t.page !== '*' && t.page !== page) continue;
    const kind = paceOf(t, page);
    if (kind === 'calm' && pace.quiet) continue;
    if (kind === 'opening' && (!s.encounter?.paused || pace.told)) continue;
    if (t.when && !t.when(s, page)) continue;
    if (!visible(t.at)) continue;
    // lead and more: a sentence before or after that depends on you (your class, the rival on you).
    const own = (x) => (x.more || x.lead ? { ...x, text: [x.lead?.(s), x.text, x.more?.(s)].filter(Boolean).join(' ') } : x);
    if (!t.joins) return own(t);
    const more = t.joins.map((id) => TIPS.find((x) => x.id === id))
      .filter((x) => x && !seen[x.id] && (!x.when || x.when(s, page)) && visible(x.at)).map(own);
    return more.length ? { ...own(t), steps: [own(t), ...more], covers: more.map((x) => x.id) } : own(t);
  }
  return null;
}
// Seen: a tip with your settings (a new game keeps them), a tour step on the save itself (s.tour: once a save).
const isTour = (id) => tourIds.includes(id);
export const seenOf = (s, id) => !!(isTour(id) ? s.tour?.[id] : s.settings?.seen?.[id]);
// A tip that waits for you (done, no mark: map-start) is seen once you've done it, shown or not: connect from
// anywhere and the opening pointer never comes back.
export function settleTips(s) {
  if (!s?.settings) return;
  for (const t of TIPS) if (t.done && !t.mark && !seenOf(s, t.id) && t.done(s)) markSeen(s, t.id);
}
export function markSeen(s, id) {
  if (isTour(id)) { (s.tour ||= {})[id] = 1; return; }
  s.settings.seen ||= {};
  s.settings.seen[id] = 1;
}
