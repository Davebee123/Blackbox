// First-time tips: the game's only tutorial. The screens show names, numbers and state; the
// first time you meet something, a tip points at it and says how it works, once. One tip at a
// time; fight tips pause the fight until you close them. Seen tips live in settings, so a
// reset game doesn't repeat them (System → Replay tips does).
//
// Each tip: id · page (a module, or '*' for any) · at (a CSS selector; the tip waits until it's
// on screen) · when (optional: state it needs) · text · pause (fight tips) · under (optional:
// sit below this container instead, so the thing it explains stays in view).
import { keyMap } from './combat.mjs';
import { MUTATIONS, QUIRKS, STRAINS, GUARDS, ARCHETYPES, SYNC } from './data.mjs';
import { hackerLevel, loadedOn, classOf } from './combat.mjs';
const spare = (s) => (s.stash || []).some((it) => !loadedOn(s, it.id)); // something you could load
import { retakeOf } from './hubs.mjs';

const home = (s) => s.encounter?.mode !== 'run';

// ---------- the rooms tour: your first server ----------
// A short guided tour of a server's room map (the Run tab), a step at a time, each pointing at the thing to do and
// moving on when you do it (click it, or type its command): walk into a room, a virus's card, then Jack out once
// you've won a fight. A cache, the hunter and the rest room get their step the first time you meet them (SPRAWL-00,
// where you start, has none), and Scan the first time a room next to you that scan reads is on the map. Got it
// closes a step, Skip tour ends them all, and tips off stops it. The tour is kept on the save (s.tour), so it shows
// once a save. Each step: mark(s) is taken as it shows, done(s, mark) says you did it,
// also is another click that does it (Step back, Leave it).
const visitOf = (s) => (s.rooms?.at ? s.rooms : null);
const hereKind = (s) => s.rooms?.at && s.rooms.graph.rooms[s.rooms.at]?.kind;
const movesOf = (s) => s.rooms?.stats?.moves || 0;
const scansOf = (s) => s.run?.scans || 0; // scans on this run (run.mjs scanRoom)
const TOUR_STEPS = [
  { id: 'tour-walk', at: '.fp-room.reach', when: (s) => !!visitOf(s) && !s.rooms.screen, mark: movesOf, done: (s, m) => movesOf(s) > m,
    text: 'Click a room with a number on its corner to walk in. The number is the Signal your first step costs.' },
  { id: 'tour-engage', at: '#fp-pop [data-rooms="engage"]', also: '#fp-pop [data-rooms="back"]', after: ['tour-walk'], when: (s) => s.rooms?.screen?.kind === 'virus', done: (s) => s.rooms?.screen?.kind !== 'virus',
    text: 'A virus holds this room. Engage to fight it, or Step back the way you came.' },
  // Scan: the first time a room next to you that scan reads is on the map, its chip's SCAN (floorplan-view.mjs; it shows
  // on hover, and while the step points at it). Walking into a room instead closes it too.
  { id: 'tour-scan', at: '.fp-scanbtn:not([aria-disabled])', also: '.fp-room.reach', after: ['tour-walk'], when: (s) => !!visitOf(s) && !!s.run?.rooms, mark: scansOf, done: (s, m) => scansOf(s) > m,
    text: 'Scan a room next to you to read its virus before you walk in.', more: (s) => (classOf(s) === 'infiltrator' ? 'As an Infiltrator, you scan free and read deeper.' : 'It costs 1 Signal.') },
  { id: 'tour-cache', at: '#fp-pop [data-rooms="pull"]', also: '#fp-pop [data-fp-pop-close]', after: ['tour-walk'], when: (s) => hereKind(s) === 'cache' && !s.rooms.screen,
    mark: (s) => `${s.rooms.at}:${s.rooms.taken[s.rooms.at] ?? ''}`, done: (s, m) => `${s.rooms?.at}:${s.rooms?.taken[s.rooms?.at] ?? ''}` !== m,
    text: 'A cache holds credits and code. One in four is bait, and its card says which: take it, or leave it.' },
  { id: 'tour-hunter', at: '.fp-hunt:not(.out)', after: ['tour-walk'], when: (s) => !!visitOf(s) && !s.rooms.screen, mark: movesOf, done: (s, m) => movesOf(s) > m,
    text: 'The hunter moves only when you walk or wait, and this shows when it moves next.', more: (s) => (classOf(s) === 'infiltrator' ? 'If it reaches you, slip past it or fight it.' : 'If it reaches you, you fight it.') },
  { id: 'tour-rest', at: '#fp-pop [data-rooms="rest"]:not([disabled])', also: '#fp-pop [data-fp-pop-close]', after: ['tour-walk'], when: (s) => hereKind(s) === 'rest',
    mark: (s) => s.rooms.at, done: (s, m) => !!s.rooms?.visit?.rested || s.rooms?.at !== m,
    text: 'Rest gives back some of your Signal, once a visit. The hunter never comes in here.' },
  { id: 'tour-jackout', at: '.fp-acts [data-rooms="jackout"]:not([disabled])', after: ['tour-engage'], when: (s) => !!visitOf(s) && !s.rooms.screen && (s.rooms.stats?.won || 0) > 0, done: (s) => !s.rooms?.at,
    text: 'Jack out to bank your pack and go home. The server takes you back 30 seconds later.' },
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
  { id: 'degraded', page: '*', at: '#integrity-note.degraded', text: 'Your server crashed and rebooted at half Integrity. For the next 10 minutes your wall is down, and any swarm at a hub you hold is paused.' },
  { id: 'code', page: '*', at: '.modules [data-module="server"]', when: (s, m) => m !== 'server' && Object.values(s.materials || {}).some((n) => n > 0), text: 'Kills drop code. You spend it on programs in a server\'s sockets and on your firewall\'s tiers.' },
  // Your first protocol: Loadout → the Protocols tab → Load. Three short steps, each pointing at the next click.
  { id: 'protocol', page: '*', at: '.modules [data-module="loadout"]', when: (s, m) => m !== 'loadout' && spare(s), text: 'You have a protocol to equip. Open Loadout to equip it. You can only equip at home, not on a run or in a fight.' },
  { id: 'protocol-tab', page: 'loadout', at: '[data-ltab="protocols"][aria-selected="false"]', when: (s) => spare(s), text: 'Your protocols are on this tab.' },
  { id: 'protocol-home', page: 'loadout', at: '.inv-btn.load[disabled]', when: (s) => !!s.run || s.encounter?.phase === 'active', text: 'You can only equip protocols at home. Jack out and finish any fight first, then come back and click Load.' },
  { id: 'protocol-load', page: 'loadout', at: '.inv-btn.load:not([disabled])', text: 'Click Load to equip it. Every protocol you load adds its stats to yours in every fight.' },
  { id: 'top-up', page: '*', at: '#meter-signal .meter-buy', text: 'Signal refills on its own at home, and the clock shows how long that takes. Click + to refill it now for credits.' },
  { id: 'repair', page: '*', at: '#meter-integrity .meter-buy', text: 'Your server repairs on its own. Click + to repair it now for credits.' },
  { id: 'level', page: '*', at: '#whoami', when: (s) => hackerLevel(s) >= 2, text: 'This is you: your handle, your class and its level. Each level makes you 4% stronger, and some levels unlock new skills.' },

  // ---------- map ----------
  { id: 'map-server', page: 'map', at: '.mnode.server', text: 'This is your server. It sits above the net, and viruses attacking it appear next to it.' },
  { id: 'map-zone', page: 'map', at: '.mnode.zone', text: 'This is SPRAWL-00, the rogue server where your work starts. Viruses gather in its folders. Each one you kill helps trace a hidden server linked to it.' },
  // ---------- the rooms (the Run tab) ----------
  { id: 'socket', page: 'rooms', at: '.fp-room.k-socket', text: 'This is a socket room. Clear its guard once and you can build here. A program in a socket changes this server\'s rules, and only this server\'s.' },
  { id: 'exfil', page: 'rooms', at: '.fp-exfil', text: 'An Exfil is uploading a stolen archive from this server, and it runs from you. Corner it and break its Uplink before the upload finishes.' },
  // A puzzle room's board, the first time you see each one (puzzle-view.mjs). One go a board: played to its end, it refills in two hours.
  { id: 'pz-quarantine', page: 'rooms', at: '.pz-panel.k-quarantine .pz-well', text: 'After each firewall you place, the worm copies into the marked node. Wall it in early, against an edge. Every node it never reaches pays this server\'s code.' },
  { id: 'pz-chase', page: 'rooms', at: '.pz-panel.k-chase .pz-well', text: 'The Tracker always moves the same way: sideways toward you, then up or down. It never goes around a wall, so lead it into one. Red rooms are where it would catch you.' },
  { id: 'pz-cascade', page: 'rooms', at: '.pz-panel.k-cascade .pz-well', text: 'A node pushed past 3 discharges too, and that can set off a chain. Find the tap that brings down half the rack.' },
  { id: 'pz-sweep', page: 'rooms', at: '.pz-panel.k-sweep .pz-well', text: 'A ping tells you how many steps away the cache is, counting across and down. The faint ring shows every cell at that distance. Dig where the rings cross.' },
  { id: 'net-sweep', page: 'net', at: '.sweep:not(.past):not(.solved)', text: 'Click a line to highlight every line from the same source. A right answer boosts your lead toward the next server. A wrong answer only makes the boost smaller.' },
  { id: 'net-hostile', page: 'net', at: '.term .tok.virus', text: 'A virus is running in this folder. Click it, or type attack, when you are ready. It comes back a while after you kill it.' },
  { id: 'map-intrusion', page: 'map', at: '.mnode.intrusion', text: 'An intrusion is waiting at your gate. Select it and press Engage when you are ready. Nothing happens until you do.' },
  { id: 'map-exit', page: 'map', at: '.mnode.exit', text: 'This is the way down to the next floor, beside a server you located. Go down from that server\'s card. The floor below has higher-level servers.' },
  { id: 'map-origin', page: 'map', at: '.mnode.loc', text: 'You found a server. Select it and press Connect to hack in. It uses memory while it\'s on your network, and its ring fills as you explore it.' },
  { id: 'map-memory', page: 'map', at: '.mem-join', text: 'These pips are your free memory: how many more servers your network can hold. The blinking pip is the one this server would take. Detach a server to free one.' },
  { id: 'map-invader', page: 'map', at: '.mnode.invader[data-select="invader"]', text: 'An invasion is heading for your wall. Your firewall\'s strength decides whether it is blocked, contested or breaks through.' },
  { id: 'map-contested', page: 'map', at: '.mnode.invader.siege[data-select="invader"]', text: 'Your wall is wearing this invasion down, but it costs you Integrity. Jack in to finish it now, or raise the wall to block it next time.' },
  { id: 'map-breach', page: 'map', at: '.mnode.invader.breach', text: 'A breach costs you some Integrity every minute. Jack in to fight it yourself, and it counts as a full kill.' },
  { id: 'map-hub-swarm', page: 'map', when: (s) => !!retakeOf(s), at: '.mnode.hub.yours.threat', text: 'This hub\'s old owner is sending viruses to reclaim it, and the timer is under its name. The hub earns nothing until you beat them, one fight per virus.' },
  { id: 'map-hub-lockdown', page: 'map', when: (s) => !retakeOf(s), at: '.mnode.hub.yours.threat', text: 'This hub is in lockdown and earns nothing until you retake it, which takes one fight. It stays yours in the meantime.' },
  { id: 'map-contract', page: 'map', at: '.mnode.job', text: 'A contract points at this server. Open its vault to find the file you were sent for, or beat the Resident in /core to take the server over.' },
  { id: 'pager', page: '*', at: '#pager .led.on', text: 'This is your pager. New mail, offers, finished contracts, your retainer and news from the network show up here. Click it to see the list.' },
  { id: 'mail', page: '*', at: '.modules [data-module="mail"]', when: (s, m) => m !== 'mail' && (s.mail?.list || []).some((x) => !x.read), text: 'You have mail. Your crew, LOWLIGHT and Halcyon Mutual send you contracts here.' },

  // ---------- mail ----------
  { id: 'mail-standing', page: 'mail', at: '.standing', text: 'This is your standing with Halcyon Mutual. It pays you a retainer every 30 minutes, and more as your standing grows. Contracts raise it, and a crash on your own server lowers it.' },
  { id: 'mail-contract', page: 'mail', at: '.contract', text: 'A contract tracks your progress as you play. When it\'s done, deliver it here to get paid.' },
  { id: 'mail-board', page: 'mail', at: '.mlist.mboard', text: 'This is Halcyon\'s board. Offers come and go on their own, and you can take up to three at a time. Only contracts you\'ve taken count.' },
  { id: 'store', page: 'hub', at: '.hub-win .store-page', text: 'Halcyon\'s store is its hub\'s Shop. Halcyon\'s own line is always in stock, and other agencies\' stock changes through the day.' },
  { id: 'hub-shop', page: 'hub', at: '.hub-win .ptiles.stash .ptile', text: 'Every hub has a Shop with that faction\'s own goods. Better rep unlocks more of the shelf and trims the price.' },
  { id: 'store-codebases', page: 'hub', at: '.plan-shelf', text: 'These are codebases. Buy one once and you can build its program in any socket you\'ve cleared.' },
  // ---------- hub sessions ----------
  { id: 'hub-menu', page: 'hub', at: '.hub-row', text: 'You\'re connected to a faction hub. Click a line or type its number to open that window: its market, its work, its payloads and more.' },
  // The market, one step per tip in the order you meet it: rows, ▲/▼, the news, then the ticket.
  { id: 'hub-market', page: 'hub', at: '.mk-wares .mk-row', text: 'Each row shows how many of a ware you hold, what this hub pays for one (Sell) and what it charges (Buy). Click a ware to trade it.' },
  { id: 'hub-compare', page: 'hub', at: '.mk-wares .mk-d', text: '▲ means this hub pays more than the average hub, and ▼ means it pays less. Prices differ from hub to hub, so sell where a ware is ▲ and buy where it is cheap.' },
  { id: 'hub-news', page: 'hub', at: '.mk-tags .tag', text: 'This shows what this hub wants and today\'s news across the net. News pushes some prices up and others down. Hover an item to see which.' },
  { id: 'hub-slider', page: 'hub', at: '.mk-ticket input[data-mk-n]', text: 'Drag to choose how many. Each one you sell lowers this hub\'s price a little, and each one you buy raises it, so a big order gets a worse price per unit.' },
  { id: 'hub-preview', page: 'hub', at: '.mk-ticket .mk-prev', text: 'This is your order before you place it: the total, the price per unit, and how it compares with the same order elsewhere. Amber means it\'s better here.' },
  { id: 'hub-go', page: 'hub', at: '.mk-ticket .mk-go', text: 'Orders take the minutes shown next to ⇄ to arrive, and relays make that shorter. Prices you\'ve moved drift back over a few hours.' },
  { id: 'hub-xfers', page: 'hub', at: '.mk-xfers', text: 'These are your orders in transit. → is outgoing and pays its credits when it lands. ← is incoming. Each bar fills as its order arrives.' },
  { id: 'hub-payloads', page: 'hub', at: '.pay-compile', text: 'Payloads are viruses you write to attack this hub. Exfil steals credits and code, Wiper knocks it offline, and Backdoor takes over an offline hub. Each one costs rep.' },
  { id: 'store-chase', page: 'hub', at: '.ptile.chase', text: 'These are Halcyon\'s own protocols. They cost Indemnity, which only contracts pay, and your standing decides which ones you can buy.' },
  { id: 'map-drop', page: 'map', at: '.mnode.drop', text: 'Something is happening on this server. Its card says what, and how long you have to act.' },
  { id: 'map-rogue', page: 'map', at: '.mnode.rogue', text: 'This is a rogue server: nobody has ever taken it over. Viruses sit in its folders and come back a few minutes after you kill them.' },
  { id: 'map-build', page: 'map', at: '.prog-row', text: 'These are its sockets and the programs in them. Clear a socket room on a run, then build in it from its pop-up. A program only works on its own server.' },
  { id: 'map-owned', page: 'map', at: '.mnode.loc.owned', text: 'This server is yours now. Put a relay on it from its card to ping the unknown servers next to it.' },
  { id: 'map-hidden', page: 'map', at: '.mnode.hidden', text: 'This is an unknown server. Clear the servers linked to it to trace it: first clears, Mapped servers and vault trace records all count. Once a relay flags it, kills count too.' },

  // ---------- fight ----------
  // Your first fight: one pause, not four. The board, the keys, armor and the Sync Window are
  // clicked through as steps of one tip, each pointing at its own thing; each still shows alone
  // if it turns up later.
  { id: 'fight-timeline', page: 'combat', pause: true, at: '.board .bnow', under: '#board', when: (s) => s.encounter?.phase === 'active', joins: ['fight-keys', 'fight-ticks', 'fight-cut', 'fight-armor', 'sync'], text: 'This board shows the virus\'s attacks. The Now column is this cycle, and each column to the right is one cycle later. Each cycle you get one move, and it happens before the attacks in Now hit you.' },
  { id: 'fight-keys', page: 'combat', pause: true, at: '#tray', under: '.command-dock', when: (s) => s.encounter?.phase === 'active', text: 'To make a move, type a skill and a part, then press Enter. Or press a skill\'s number, click a part and press Enter. If time runs out, key 1 hits your last target again.' },
  // The interrupt (interrupt.mjs): the ticks, what crossing one takes this cycle, and a tick spent for nothing.
  { id: 'fight-ticks', page: 'combat', pause: true, at: '.board .ptick', under: '#board', when: (s) => s.encounter?.phase === 'active', text: 'The two marks on each bar are ticks, at 50% and 25%. Push a part past a tick on the cycle its attack is due, and that attack is cancelled. Each tick works once a fight.' },
  { id: 'fight-cut', page: 'combat', pause: true, at: '.board .intent.cut', under: '#board', when: (s) => s.encounter?.phase === 'active', text: 'cut ▸ 9 in Now means 9 damage pushes that part past its next tick this cycle, which cancels its attack. With ◆ left it reads ◆1 + 9: the armor comes first.' },
  { id: 'fight-wasted', page: 'combat', pause: true, at: '.board .ptick.spent', under: '#board', when: (s) => (s.encounter?.metrics?.wasted || 0) > 0, text: 'You crossed that tick when no attack was due, so it\'s spent for nothing. Save big hits for the cycle an attack lands.' },
  { id: 'fight-armor', page: 'combat', pause: true, at: '.board .chits', under: '#board', text: 'The ◆ next to a part is armor. A hit on an armored part removes one ◆ but deals no damage, so strip the armor with weaker skills before using your strongest one.' },
  { id: 'sync', page: 'combat', at: '#sync-win', pause: true, text: 'The bar under Now fills as the cycle runs. Press Enter while it\'s inside the bright window, and your move deals 10% more damage.', more: (s) => `As ${/^[AEIOU]/.test(ARCHETYPES[classOf(s)].name) ? 'an' : 'a'} ${ARCHETYPES[classOf(s)].name}, it also ${SYNC[classOf(s)].rule.replace(/^./, (c) => c.toLowerCase())}` },
  { id: 'fight-patch', page: 'combat', pause: true, at: '.board .intent.patch', under: '#board', text: 'A part with no ◆ left grows one back five cycles later, unless you break it first.' },
  { id: 'fight-veiled', page: 'combat', pause: true, at: '.board .intent.hidden', under: '#board', text: 'This part hides when it will attack. Strip its ◆ to see its timer.' },
  { id: 'fight-encrypt', page: 'combat', pause: true, at: '.board .intent.crypt', under: '#board', text: 'Encryption damages you every cycle and grows each time it lands. It stops when you break the Encryptor.' },
  // Tells (tells.mjs): a part announces a move ahead, and the chip says what answers it.
  { id: 'fight-tell', page: 'combat', pause: true, at: '.board .intent.tell.t-charge', under: '#board', text: 'This part is charging a much bigger hit. Push it past a tick on the cycle the hit lands to call it off. The chip shows NOW on that cycle.' },
  { id: 'fight-cast', page: 'combat', pause: true, at: '.board .intent.tell.t-cast', under: '#board', text: 'This part is compiling a buff for the virus. During its last 2 cycles, SIGINT (the - key) stops it, and so does pushing the part past a tick.' },
  { id: 'fight-seal', page: 'combat', pause: true, at: '.board .intent.tell.t-seal', under: '#board', text: 'If this part still has ◆ when the seal lands, it gains an extra ◆, and every part you stripped gets one ◆ back. Strip it first.' },
  { id: 'fight-mimic', page: 'combat', pause: true, at: '.board .intent.tell.t-mimic', under: '#board', text: 'The Mimic copies the command you use that cycle and hits you with it. Use something that deals no damage then: a debuff, an armor strip, a burn or a shield.' },
  // The parts plan's board elements (docs/parts-plan.md P1): one tip each, the first time it shows.
  { id: 'fight-fuse', page: 'combat', pause: true, at: '.board .intent.fuse', under: '#board', text: 'A broken Zip Bomb\'s fuse is burning. When it runs out, it hits you for a fifth of your max. A ◆ or a shield takes it, and ending the fight first puts it out.' },
  { id: 'fight-front', page: 'combat', pause: true, at: '.board .tether.k-front', under: '#board', text: 'This tether bends your hits. While the Front End wears ◆, a command aimed at its partner lands on it. Strip its ◆, or use burns and helpers.' },
  { id: 'fight-idle', page: 'combat', pause: true, at: '.board .tag.idlepips', under: '#board', text: 'These pips count down. Each hit from your command on this part starts them over. At zero, every part re-arms to full ◆.' },
  { id: 'fight-volley', page: 'combat', pause: true, at: '.board .intent.tap', under: '#board', text: 'These hits are one volley, on back to back cycles. Cut it on its first hit and the rest goes too. A delay moves them all.' },
  { id: 'fight-buffer', page: 'combat', pause: true, at: '.board .lockseg.bufseg', under: '#board', text: 'This shield takes the hits from your commands first. Burns and helpers go under it. The Buffer puts it back every few cycles.' },
  { id: 'fight-hotspot', page: 'combat', pause: true, at: '.board .tag.hotspot', under: '#board', text: 'A hit from your command on this part charges the virus\'s next attack. Burns and helpers don\'t set it off.' },
  { id: 'fight-syn', page: 'combat', pause: true, at: '.board .intent.syn', under: '#board', text: 'When this lands, the skill you used that cycle cools down 2 cycles longer. Use a skill with no cooldown then.' },
  { id: 'fight-accum', page: 'combat', pause: true, at: '.board .tag.accum', under: '#board', text: 'This bar fills toward one big hit. Break the part before it is full, or have ◆ or a shield up when it lands.' },
  // The parts plan's P2 (floors 3 and 4): one tip for each new board element, the first time it shows.
  { id: 'fight-cap', page: 'combat', pause: true, at: '.board .tag.limcap', under: '#board', text: 'No single hit takes more than this off the part. Use many small hits: burns, helpers and quick skills.' },
  { id: 'fight-standby', page: 'combat', pause: true, at: '.board .tag.standby', under: '#board', text: 'This part sleeps until the signature part breaks, then boots with its attack. Break it while it sleeps.' },
  { id: 'fight-shunt', page: 'combat', pause: true, at: '.board .tether.k-shunt', under: '#board', text: 'Half of what this part takes moves along the tether to the Shunt. Break the Shunt first, or hit both.' },
  { id: 'fight-scrape', page: 'combat', pause: true, at: '.board .intent.scrape', under: '#board', text: 'When this lands, it takes your ◆ and what is left of your shield. Put them up after it lands, not before.' },
  { id: 'fight-packed', page: 'combat', pause: true, at: '.board .tag.packed', under: '#board', text: 'The Packer hides this part\'s rule. Break the Packer to read it, or scan the next one before you engage.' },
  { id: 'fight-cracked', page: 'combat', pause: true, at: '#hud .cracked-cells', text: 'Cracked cells: your next heals lose this much. Purge, Scrub, Rollback or Rotate Keys clears them.' },
  { id: 'fight-damper', page: 'combat', pause: true, at: '.board .tag.damper', under: '#board', text: 'While this part wears ◆, the crossed-out kind of hit deals it nothing. That kind still breaks ◆, so strip it first.' },
  { id: 'fight-frost', page: 'combat', pause: true, at: '.board .tag.frost', under: '#board', text: 'This part is frozen: nothing reaches it until the bar fills. Break the others now, and be ready when it thaws.' },
  { id: 'fight-status', page: 'combat', at: '#hud .hud-status .st', when: (s) => s.encounter?.phase === 'active', text: 'Effects on you show here. Hover one to see what it does and how long it lasts.' },
  { id: 'fight-miss', page: 'combat', at: '#board', when: (s) => (s.encounter?.metrics?.misses || 0) > 0, text: 'You missed. A miss deals no damage but still uses the cooldown. Enemies above your level make you miss more often.' },
  { id: 'fight-daemon', page: 'combat', at: '.board .intent.daemon:not(.cron)', under: '#board', text: 'That\'s your daemon. It acts on its own cooldown, in the cycle where its chip sits, on top of your own move.' },
  { id: 'fight-proc', page: 'combat', pause: true, at: '#tray .lit', text: 'A skill lit up. It only works for a cycle or two after something happens, so use it while it glows.' },
  { id: 'fight-cron', page: 'combat', at: '.board .intent.cron', under: '#board', text: 'Your Cron Job daemon runs every third cycle. It hits the part winding up a tell, or else the part whose attack lands soonest.' },
  ...Object.entries({
    keylogger: 'This is a Keylogger. Only moves made inside the Sync Window hurt the Logger. Three moves outside it come back at you as a Dump.',
    hashrat: 'This is a Hashrat. While its Miner lives, your cooldowns run at half speed. The Miner attacks only once it is the last part left, so break it first.',
    floodgate: 'This is a Floodgate. Its Flooder hits every cycle, a little harder each time. Any delay resets it.',
    leech: 'This is a Leech. Its Tap heals the most damaged part for what it bites, and removes a burn from it.',
    sleeper: 'This is a Sleeper. It does nothing until you hit it or cycle 6 begins. Set up first, because when it wakes, its Alarm lands at once.',
    patchwork: 'This is a Patchwork. Its Patcher heals the most damaged part every 3 cycles. Break the Patcher first, or finish a part between heals.',
    flicker: 'This is a Flicker. Its Shade is only there on even cycles. On odd cycles your hits pass through it.',
    extortion: 'This is an Extortion. The Demand winds up a big Deadline. Hit it hard in the 2 cycles before it lands and the Deadline is called off.',
    echo: 'This is an Echo. While the Echo lives, every hit you take repeats a cycle later at half damage. Break it early.',
    bricker: 'This is a Bricker. Each part hits 30% harder once it drops below half health. Finish a part quickly once you start on it.',
    overrun: 'This is an Overrun. Its fragments bite harder every cycle they live. Clear them while they are young, or break the Hive.',
    bouncer: 'Bouncer ICE: its Keyring re-arms the Gate every 4 cycles, and takes over the Gate\'s Ram if the Gate breaks first. Break the Gate between re-arms, then the Keyring.',
    tracer: 'This is Tracer ICE. Its Trace-back deals more damage every cycle the fight lasts, so finish it fast.',
  }).filter(([id]) => STRAINS[id] || GUARDS[id]).map(([id, text]) => ({ id: 'strain-' + id, page: 'combat', pause: true, at: `.tag-strain[data-strain="${id}"]`, text })),
  ...Object.entries(MUTATIONS).map(([id, m]) => ({ id: 'mut-' + id, page: '*', pause: true, at: `.tag-mut[data-mut="${id}"]`, text: `This virus is ${m.name}. ${m.rule}` })),
  ...Object.entries(QUIRKS).map(([id, q]) => ({ id: 'quirk-' + id, page: '*', at: `.tag-quirk[data-quirk="${id}"]`, text: `This location has the ${q.name} quirk. ${q.rule}` })),

  // ---------- runs ----------
  { id: 'net-signal', page: 'net', at: '.net-signal', text: 'Signal is your health while you\'re connected. Moving costs a little, and hits in a fight cost more. At 0 you\'re sent home and lose the files you picked up here.' },
  { id: 'net-trace', page: 'net', at: '.net-trace.hot', text: 'Trace is how loud you have been here. At 100 a hunter comes for you, and you cannot jack out until it is down.' },
  { id: 'net-names', page: 'net', at: '.term .ls .tok', text: 'Click a name to open it or read it. Use pull to copy a file into your pack.' },
  { id: 'net-guarded', page: 'net', at: '.term .tag-guarded', text: 'This folder is guarded. Going in starts a fight, and the guard\'s hits cost Signal.' },
  { id: 'net-locked', page: 'net', at: '.term .tag-locked', text: 'This folder is locked. Its password is in a file somewhere on this server. Type unlock, then the folder name and the password.' },
  { id: 'net-pack', page: 'net', at: '.net-pack', when: (s) => (s.run?.pack.length || 0) > 0, text: 'Files you pull wait in your pack. Jack out to bank them and keep them.' },

  // ---------- server ----------
  { id: 'server-level', page: 'server', at: '.hsv-top', text: 'Your server\'s level matches your highest class level. Its wall holds invasions back, and your codebases let you build programs on other servers.' },
  { id: 'server-wall', page: 'server', at: '.hsv-level', text: 'Your firewall stops invasions up to its level. Servers on your network send them, even while you\'re away. Amber or red at the top means one can get through.' },
  { id: 'fw-upgrade', page: 'server', at: '#hsv-panel [data-act="upgrade"]', text: 'Your firewall keeps up with the servers on your network on its own. An upgrade adds a margin on top, up to +6, for credits and code.' },
  { id: 'fw-frag', page: 'server', at: '.hsv-ring .blk.frag', text: 'Each invasion breaks some blocks, and every 4 broken blocks cost a level. Defrag repairs them for credits, but the wall is weaker while it runs.' },
  { id: 'server-blueprints', page: 'server', at: '.blueprint-card', text: 'You can only build a service once you have its blueprint. Blueprints wait in vaults, and a kill drops one now and then.' },

  // ---------- protocols ----------
  { id: 'protocols-slots', page: 'loadout', at: '.loadout-protocols .ptiles', text: 'Each slot takes one kind of protocol: Exploit, Proxy, Shell, Script or Implant. The stats of everything you load add together.' },
  { id: 'protocols-compile', page: 'craft', at: '.compile-card.open', text: 'You found a recipe, so you can compile protocols. Pick one of your recipes and you\'ll get the protocol at your level.' },
  { id: 'protocols-zeroday', page: 'loadout', at: '.gitem.r-zeroday', text: 'This is a Zero-day. It has a special effect on top of its stats. You can run one of each kind.' },

  // ---------- craft ----------
  { id: 'craft-plans', page: 'craft', at: '.craft-cats .craft-cat', text: 'Only recipes you know show here. New ones come as blueprints: viruses drop them, vaults hold them, and the Halcyon store sells sealed ones.' },

  // ---------- loadout ----------
  { id: 'loadout-status', page: 'loadout', at: '.sk-status', text: 'Your skills put this status on parts. Hover it to see what it does.' },
  { id: 'loadout-bar', page: 'loadout', at: '.sk-bar', text: 'This is your skill bar. Key 1 is your basic attack. Your class skills fill the other slots: seven at first, eight at level 22 and nine at 30.' },
  { id: 'loadout-classes', page: 'loadout', at: '.arch-tabs', text: 'There are four classes, and each one levels up separately. You can switch between them at home.' },
  { id: 'loadout-talents', page: 'loadout', at: '.sk-tree', when: (s) => hackerLevel(s) >= 10, text: 'From level 10 you earn a talent point every other level for your subclass\'s tree. Ranks add small bonuses, and each tier asks you to pick one of two. Changing picks at home is free.' },
  // Your program (routines.mjs): the handler editor on Loadout → Program.
  { id: 'program-editor', page: 'loadout', at: '.rt-editor', text: 'When the timer runs out, your program moves. Pick a virus, then a ready-made routine, or drag WHEN, DO and TARGET chips onto a handler. The first that fits fires, else the rotation.' },

  // ---------- daemons ----------
  { id: 'daemons', page: 'loadout', at: '.daemon-slots', text: 'Daemons come from invasions. A slotted daemon fights beside you, on its own cooldown or when its moment comes. A higher-level copy replaces the one you have.' },
  // The Codex tab, once there's something in it: your first decoded part (and never mid-fight).
  { id: 'codex', page: '*', at: '.modules [data-module="codex"]', when: (s, m) => m !== 'codex' && s.encounter?.phase !== 'active' && Object.values(s.research || {}).some((n) => n > 0), text: 'You decoded your first part. The Codex keeps each part\'s research: break it, cut it and answer its tells to learn its rule.' },
];

// The next tip to show on this page, or null. `visible(selector)` says whether an element is on
// screen (the browser passes a DOM check; tests pass their own).
export function nextTip(s, page, visible) {
  if (s.settings?.tips === false) return null;
  const seen = s.settings?.seen || {};
  for (const t of TIPS) {
    if (seenOf(s, t.id)) continue;
    if (t.after?.some((id) => !seenOf(s, id))) continue; // a tour step waits for the one before it
    if (t.page !== '*' && t.page !== page) continue;
    if (t.when && !t.when(s, page)) continue;
    if (!visible(t.at)) continue;
    const own = (x) => x.more ? { ...x, text: `${x.text} ${x.more(s)}` } : x; // more: a sentence that depends on you (your class)
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
export function markSeen(s, id) {
  if (isTour(id)) { (s.tour ||= {})[id] = 1; return; }
  s.settings.seen ||= {};
  s.settings.seen[id] = 1;
}
