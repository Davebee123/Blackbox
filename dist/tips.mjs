// First-time tips: the game's only tutorial. The screens show names, numbers and state; the
// first time you meet something, a tip points at it and says how it works, once. One tip at a
// time; fight tips pause the fight until you close them. Seen tips live in settings, so a
// reset game doesn't repeat them (System → Replay tips does).
//
// Each tip: id · page (a module, or '*' for any) · at (a CSS selector; the tip waits until it's
// on screen) · when (optional: state it needs) · text · pause (fight tips) · under (optional:
// sit below this container instead, so the thing it explains stays in view).
import { keyMap } from './combat.mjs';
import { MUTATIONS, QUIRKS, STRAINS, GUARDS } from './data.mjs';
import { hackerLevel, loadedOn } from './combat.mjs';
const spare = (s) => (s.stash || []).some((it) => !loadedOn(s, it.id)); // something you could load
import { retakeOf } from './hubs.mjs';

const home = (s) => s.encounter?.mode !== 'run';

export const TIPS = [
  // ---------- anywhere ----------
  { id: 'degraded', page: '*', at: '#integrity-note.degraded', text: 'Your server crashed and rebooted at half Integrity. For the next 10 minutes your wall is down, installs are paused and the server earns no XP.' },
  { id: 'code', page: '*', at: '.modules [data-module="server"]', when: (s, m) => m !== 'server' && Object.values(s.materials || {}).some((n) => n > 0), text: 'Kills drop code. Spend it on the Server page to build services.' },
  // Your first protocol: Loadout → the Protocols tab → Load. Three short steps, each pointing at the next click.
  { id: 'protocol', page: '*', at: '.modules [data-module="loadout"]', when: (s, m) => m !== 'loadout' && spare(s), text: 'You have a protocol to equip. Open Loadout. You can only equip at home, not on a run or mid-fight.' },
  { id: 'protocol-tab', page: 'loadout', at: '[data-ltab="protocols"][aria-selected="false"]', when: (s) => spare(s), text: 'Your protocols are on this tab.' },
  { id: 'protocol-home', page: 'loadout', at: '.inv-btn.load[disabled]', when: (s) => !!s.run || s.encounter?.phase === 'active', text: 'You can only equip protocols at home. Jack out (and finish any fight) first, then come back and Load it.' },
  { id: 'protocol-load', page: 'loadout', at: '.inv-btn.load:not([disabled])', text: 'Click Load to equip it. Every protocol you load adds its stats to yours, in every fight.' },
  { id: 'top-up', page: '*', at: '#meter-signal .meter-buy', text: 'Signal refills on its own at home, and the clock shows how long. Click + to refill it now for credits.' },
  { id: 'repair', page: '*', at: '#meter-integrity .meter-buy', text: 'Your server repairs on its own. Click + to repair it now for credits.' },
  { id: 'level', page: '*', at: '#whoami', when: (s) => hackerLevel(s) >= 2, text: 'This is you: your handle, the class you play and its level. Each level makes you 4% stronger, and some unlock new skills.' },

  // ---------- map ----------
  { id: 'map-server', page: 'map', at: '.mnode.server', text: 'This is your server. Viruses that attack it show up next to it. Kill enough of one family and you find the server that sent them.' },
  { id: 'map-zone', page: 'map', at: '.mnode.zone', text: 'This is a rogue server. Viruses gather in its folders. Connect, find them with ls and cd, and attack the ones you want to fight.' },
  { id: 'net-sweep', page: 'net', at: '.sweep:not(.past):not(.solved)', text: 'Click a line to light up every line it shares a source with, and filter out the noise. A right answer pushes your lead toward the next server. A wrong one only shrinks the push.' },
  { id: 'net-hostile', page: 'net', at: '.term .tok.virus', text: 'A virus is running in this folder. Click it, or type attack, when you are ready. It comes back a while after you kill it.' },
  { id: 'map-intrusion', page: 'map', at: '.mnode.intrusion', text: 'An intrusion is waiting at your gate. Select it and press Engage when you are ready. Nothing happens until you do.' },
  { id: 'map-lead', page: 'map', at: '.mnode.lead', text: 'This is a lead. Each kill of this family fills it. At 100% you find the server that sent them.' },
  { id: 'map-origin', page: 'map', at: '.mnode.loc', text: 'You found a server. Select it and press Connect to hack in. It takes memory while it is on your network. Its ring fills as you explore it.' },
  { id: 'map-memory', page: 'map', at: '.mem-join', text: 'These pips are your free memory. They show how many more servers your network can hold. The blinking one is what this server takes. Detach a server you are done with to get one back.' },
  { id: 'map-invader', page: 'map', at: '.mnode.invader[data-select="invader"]', text: 'An invasion is heading for your wall. How strong your Firewall is decides whether it is blocked, contested, or breaks through.' },
  { id: 'map-outpost', page: 'map', when: (s) => (s.locations || []).some((l) => l.takenOver && l.buildings?.length), at: '.outpost .op-store', text: 'What your buildings make piles up here while you are away, up to what the server can store. Connect to the server to collect it.' },
  { id: 'map-besieged', page: 'map', when: (s) => s.fleet?.state === 'siege', at: '.mnode.besieged', text: 'A swarm is at this outpost, and it makes nothing meanwhile. Defend it before the timer runs out, or it goes into lockdown. Its stockpile stays yours.' },
  { id: 'map-lockdown', page: 'map', when: (s) => (s.locations || []).some((l) => l.outpost?.lockdown), at: '.mnode.locked', text: 'This outpost is in lockdown. It harvests nothing for a while, but its stockpile is safe. Retake it with a fight to end it sooner.' },
  { id: 'map-fleet', page: 'map', when: (s) => !!s.fleet, at: '.mnode.fleet', text: 'A swarm is coming for one of your outposts. Each fight kills one virus. Intercept the swarm on the way, or defend once it lands. Any left when its timer runs out put the outpost in lockdown.' },
  { id: 'map-contested', page: 'map', at: '.mnode.invader.siege[data-select="invader"]', text: 'Your wall is wearing this invasion down, but it costs you Integrity. Jack in to finish it now, or raise the wall to block it next time.' },
  { id: 'map-breach', page: 'map', at: '.mnode.invader.breach', text: 'A breach takes some of your Integrity every minute. You can jack in to fight it yourself, and it counts as a full kill.' },
  { id: 'map-hub-swarm', page: 'map', when: (s) => !!retakeOf(s), at: '.mnode.hub.yours.threat', text: 'The old owner is sending viruses to take this hub back. The timer is under its name. The hub earns nothing until you beat them, one fight per virus.' },
  { id: 'map-hub-lockdown', page: 'map', when: (s) => !retakeOf(s), at: '.mnode.hub.yours.threat', text: 'This hub is in lockdown. It earns nothing until you retake it with one fight. It is still yours, and stays yours.' },
  { id: 'map-member-raid', page: 'map', at: '.mnode.member.besieged', text: 'A member\'s outpost is under invasion. Select it and Defend for a bounty. Left alone, it may hold or go into lockdown, at no cost to you.' },
  { id: 'map-contract', page: 'map', at: '.mnode.job', text: 'A contract points at this server. Open its vault and beat the Resident in /core to take it over, or open the vault to find the file you were sent for.' },
  { id: 'pager', page: '*', at: '#pager .led.on', text: 'This is your pager. New mail, offers, finished contracts, the retainer and anything moving on the network land here. Click it for the list.' },
  { id: 'mail', page: '*', at: '.modules [data-module="mail"]', when: (s, m) => m !== 'mail' && (s.mail?.list || []).some((x) => !x.read), text: 'You have mail. Your crew, LOWLIGHT, and Halcyon Mutual send you contracts here.' },

  // ---------- mail ----------
  { id: 'mail-standing', page: 'mail', at: '.standing', text: 'This is your standing with Halcyon Mutual. It pays you a retainer every 30 minutes, and more as your standing grows. Contracts raise it, and a crash on your own server lowers it.' },
  { id: 'mail-contract', page: 'mail', at: '.contract', text: 'A contract counts as you play. When it is done, deliver it here to get paid.' },
  { id: 'mail-board', page: 'mail', at: '.mlist.mboard', text: 'This is Halcyon\'s board. Offers come and go on their own, and you can take up to three at a time. Only a contract you have taken counts.' },
  { id: 'store', page: 'hub', at: '.hub-win .store-page', text: 'Halcyon\'s store is its hub\'s Shop. Its own line is always there, and other agencies\' stock changes through the day.' },
  { id: 'hub-shop', page: 'hub', at: '.hub-win .ptiles.stash .ptile', text: 'Every hub has a Shop: that faction\'s own goods. Better rep unlocks more of the shelf and trims the price.' },
  { id: 'store-plans', page: 'hub', at: '.plan-shelf', text: 'These are plans for harvesters and outpost modules. Buy one once and you can craft that kind on the Craft page for good.' },
  // ---------- hub sessions ----------
  { id: 'hub-menu', page: 'hub', at: '.hub-row', text: 'You are connected to a faction hub. Pick a line (click it, or type its number) to open that window, such as its market, its work or payloads.' },
  // The market, one step per tip in the order you meet it: rows, ▲/▼, the news, then the ticket.
  { id: 'hub-market', page: 'hub', at: '.mk-wares .mk-row', text: 'Each row shows how many of a ware you hold, what this hub pays you for one (Sell here) and what it charges (Buy here). Click a ware to trade it.' },
  { id: 'hub-compare', page: 'hub', at: '.mk-wares .mk-d', text: '▲ means this hub pays more than the average hub, and ▼ means it pays less. Prices differ from hub to hub, so sell where a ware is ▲ and buy where it is cheap.' },
  { id: 'hub-news', page: 'hub', at: '.mk-tags .tag', text: 'This shows what this hub wants and today\'s news across the net. They push some wares up and others down. Hover one to see which.' },
  { id: 'hub-slider', page: 'hub', at: '.mk-ticket input[data-mk-n]', text: 'Drag to pick how many. Every one you sell lowers this hub\'s price a little (every one you buy raises it), so a big order gets less for each.' },
  { id: 'hub-preview', page: 'hub', at: '.mk-ticket .mk-prev', text: 'This is your order before you place it. It shows the total, the price for each, and how that compares to the same order elsewhere. Amber means it is better here.' },
  { id: 'hub-go', page: 'hub', at: '.mk-ticket .mk-go', text: 'Orders take the minutes shown on ⇄ to arrive. Relays make that shorter. Prices you moved drift back over a few hours.' },
  { id: 'hub-xfers', page: 'hub', at: '.mk-xfers', text: 'These are your orders on the way. → is going out (credits on landing), ← is coming in. The bar fills as each lands.' },
  { id: 'hub-payloads', page: 'hub', at: '.pay-compile', text: 'Payloads are viruses you write to hit this hub. Exfil steals credits and code, Wiper knocks it offline, Backdoor takes an offline hub. Each strike costs rep with it.' },
  { id: 'store-chase', page: 'hub', at: '.ptile.chase', text: 'These are Halcyon\'s own protocols. They cost Indemnity, which only contracts pay, and your standing decides which ones you can buy.' },
  { id: 'map-drop', page: 'map', at: '.mnode.drop', text: 'Something is happening on this server. Its card says what, and how long you have to act.' },
  { id: 'map-rogue', page: 'map', at: '.mnode.rogue', text: 'This is a rogue server. Nobody has ever taken it over. Viruses sit in its folders and come back a few minutes after you kill them.' },
  { id: 'map-build', page: 'map', at: '.op-build-open', text: 'Build on a server you hold. Each building takes one of its slots and some of your bandwidth, costs credits, code and salvage, and builds in real time. What it makes piles up while you are away.' },
  { id: 'map-owned', page: 'map', at: '.mnode.loc.owned', text: 'This server is yours now. Put a relay on it from its card, and it pings the unknown servers next to it.' },
  { id: 'map-hidden', page: 'map', at: '.mnode.hidden', text: 'This is an unknown server. Beat the viruses it sends at you to trace it. A vault\'s trace record traces it too. Once a relay flags it, kills of any virus from its family count as well.' },

  // ---------- fight ----------
  // Your first fight: one pause, not four. The board, the keys, armor and the Sync Window are
  // clicked through as steps of one tip, each pointing at its own thing; each still shows alone
  // if it turns up later.
  { id: 'fight-timeline', page: 'combat', pause: true, at: '.board .bnow', under: '#board', when: (s) => s.encounter?.phase === 'active', joins: ['fight-keys', 'fight-armor', 'sync'], text: 'This board shows the virus\'s attacks. The Now column is this cycle, and each column to the right is one cycle later. Each cycle you get one move, and it happens before the attacks in Now hit you.' },
  { id: 'fight-keys', page: 'combat', pause: true, at: '#tray', under: '.command-dock', when: (s) => s.encounter?.phase === 'active', text: 'To make your move, type a skill and a part, like spike pulse, then press Enter. Or press a skill\'s number, click a part, and press Enter. If the timer runs out first, you Spike the last part you hit.' },
  { id: 'fight-armor', page: 'combat', pause: true, at: '.board .chits', under: '#board', text: 'The ◆ next to a part is armor. A hit on an armored part removes one ◆ and does no damage, so clear the armor with your weaker skills before using your strongest one.' },
  { id: 'sync', page: 'combat', at: '#sync-win', pause: true, text: 'The bar under Now fills as the cycle runs. Press Enter while it is inside the bright window and your move does 10% more damage, plus a bonus for your class.' },
  { id: 'fight-patch', page: 'combat', pause: true, at: '.board .intent.patch', under: '#board', text: 'A part with no ◆ left gets one back five cycles later, unless you break it first.' },
  { id: 'fight-veiled', page: 'combat', pause: true, at: '.board .intent.hidden', under: '#board', text: 'This part hides when it will hit. Remove its ◆ to see its timer.' },
  { id: 'fight-encrypt', page: 'combat', pause: true, at: '.board .intent.crypt', under: '#board', text: 'Encryption damages you every cycle and grows each time it lands. It stops when you break the Encryptor.' },
  { id: 'fight-status', page: 'combat', at: '#hud .hud-status .st', when: (s) => s.encounter?.phase === 'active', text: 'Effects on you show here. Hover one to see what it does and how long it lasts.' },
  { id: 'fight-miss', page: 'combat', at: '#board', when: (s) => (s.encounter?.metrics?.misses || 0) > 0, text: 'You missed. A miss does no damage but still uses the cooldown, and enemies above your level make you miss more often.' },
  { id: 'fight-daemon', page: 'combat', at: '.board .intent.daemon:not(.cron)', under: '#board', text: 'That is your daemon. It acts on its own cooldown, in the cycle where its chip sits, on top of whatever you do.' },
  { id: 'fight-proc', page: 'combat', pause: true, at: '#tray .lit', text: 'A skill lit up. It only works for a cycle or two after something happens, so use it while it glows.' },
  { id: 'fight-cron', page: 'combat', at: '.board .intent.cron', under: '#board', text: 'Your Cron Job service runs every third cycle and hits the attacker that will land soonest.' },
  ...Object.entries({
    keylogger: 'This is a Keylogger. Only moves made inside the Sync Window hurt the Logger. Three moves outside it come back at you as a Dump.',
    hashrat: 'This is a Hashrat. While its Miner lives, your cooldowns run at half speed. The Miner never attacks, so kill it first.',
    floodgate: 'This is a Floodgate. Its Flooder hits every cycle, a little harder each time. Any delay resets it.',
    leech: 'This is a Leech. Its Tap heals the most damaged part by what it bites, and clears a burn from it.',
    sleeper: 'This is a Sleeper. It does nothing until you hit it or cycle 6. Set up first: when it wakes, its Alarm lands at once.',
    patchwork: 'This is a Patchwork. Its Patcher heals the most damaged part every 3 cycles. Kill the Patcher first, or finish a part between patches.',
    flicker: 'This is a Flicker. Its Shade is only there on even cycles. On odd cycles your hits pass through it.',
    extortion: 'This is an Extortion. The Demand winds up a big Deadline. Hit it hard in the 2 cycles before it lands and the Deadline is called off.',
    echo: 'This is an Echo. While the Echo lives, every hit you take repeats a cycle later at half. Kill it early.',
    bricker: 'This is a Bricker. Each part hits 30% harder once it drops below half health. Finish a part quickly once you start on it.',
    overrun: 'This is an Overrun. Its fragments bite harder every cycle they live. Clear them while they are young, or kill the Hive.',
    bouncer: 'This is Bouncer ICE. Its Keyring re-arms the Gate to full armor every 4 cycles. Break the Keyring first, or kill the Gate between re-arms.',
    tracer: 'This is Tracer ICE. Its Trace-back hits harder every cycle the fight lasts, so finish it fast.',
  }).filter(([id]) => STRAINS[id] || GUARDS[id]).map(([id, text]) => ({ id: 'strain-' + id, page: 'combat', pause: true, at: `.tag-strain[data-strain="${id}"]`, text })),
  ...Object.entries(MUTATIONS).map(([id, m]) => ({ id: 'mut-' + id, page: '*', pause: true, at: `.tag-mut[data-mut="${id}"]`, text: `This virus is ${m.name}. ${m.rule}` })),
  ...Object.entries(QUIRKS).map(([id, q]) => ({ id: 'quirk-' + id, page: '*', at: `.tag-quirk[data-quirk="${id}"]`, text: `This location has the ${q.name} quirk. ${q.rule}` })),

  // ---------- runs ----------
  { id: 'net-signal', page: 'net', at: '.net-signal', text: 'Signal is your health while connected. Each cd costs 1, and hits in a fight cost more. At 0 you are sent home and lose the files you picked up here.' },
  { id: 'net-trace', page: 'net', at: '.net-trace.hot', text: 'Trace is how loud you have been here. At 100 a hunter comes for you, and you cannot jack out until it is down.' },
  { id: 'net-names', page: 'net', at: '.term .ls .tok', text: 'Click a name to open it or read it. Use pull to copy a file into your pack.' },
  { id: 'net-guarded', page: 'net', at: '.term .tag-guarded', text: 'This folder is guarded. Going in starts a fight, and the guard\'s hits cost Signal.' },
  { id: 'net-locked', page: 'net', at: '.term .tag-locked', text: 'This folder is locked. The password is in a file somewhere on this node. Type unlock, the folder and the password.' },
  { id: 'net-pack', page: 'net', at: '.net-pack', when: (s) => (s.run?.pack.length || 0) > 0, text: 'Files you pull wait in your pack. Jack out to bank them and keep them.' },

  // ---------- server ----------
  { id: 'server-ports', page: 'server', at: '.server-head', text: 'Your server runs services in its service slots. Each one costs code from the viruses you kill, and takes real time to install.' },
  { id: 'server-wall', page: 'server', at: '.wall-card .fw-lv', text: 'Your firewall stops invasions up to its level. Servers on your network send them, even while you are away. Amber or red up top means one of them can get past.' },
  { id: 'fw-upgrade', page: 'server', at: '.fw-up', text: 'Your firewall keeps up with the servers on your network by itself. An upgrade buys a margin on top, up to +6, for credits and code.' },
  { id: 'fw-frag', page: 'server', at: '.fw-grid i.frag', text: 'Each invasion breaks some blocks. Every 4 broken blocks cost a level. Defrag repairs them for credits, and the wall is weaker while it runs.' },
  { id: 'server-queue', page: 'server', at: '.install', text: 'Installs run one at a time in real time. They keep going while you fight, go on runs, or close the game.' },
  { id: 'server-blueprints', page: 'server', at: '.blueprint-card', text: 'You can only build a service once you have its blueprint. Blueprints wait in vaults, and a kill drops one now and then.' },

  // ---------- protocols ----------
  { id: 'protocols-slots', page: 'loadout', at: '.loadout-protocols .ptiles', text: 'Each slot takes one kind of protocol: Exploit, Proxy, Shell, Script or Implant. The stats of everything you load add up.' },
  { id: 'protocols-compile', page: 'craft', at: '.compile-card.open', text: 'You found a recipe, so you can compile protocols. Pick one of your recipes and the protocol comes out at your level.' },
  { id: 'protocols-zeroday', page: 'loadout', at: '.gitem.r-zeroday', text: 'This is a Zero-day. It has a special effect on top of its stats, and you can run one of each kind.' },

  // ---------- craft ----------
  { id: 'craft-plans', page: 'craft', at: '.craft-cats .craft-cat', text: 'Only what you know shows here. New recipes come as blueprints: viruses drop them, vaults hold them, and Halcyon sells plans.' },
  { id: 'craft-modules', page: 'craft', at: '.craft-cat[data-craft-cat="modules"]', when: (s) => (s.plans || []).some((id) => ['pipeline', 'storage', 'node', 'ids', 'lure'].includes(id)), text: 'Modules you craft go into your stock (×n on the row). Install them from an outpost\'s card on the map.' },

  // ---------- loadout ----------
  { id: 'loadout-status', page: 'loadout', at: '.status-line .status', text: 'Your skills put this status on parts. Hover it to see what it does.' },
  { id: 'loadout-bar', page: 'loadout', at: '.keybar', text: 'This is your skill bar. Everyone has the first three, and you choose up to five class skills as they unlock.' },
  { id: 'loadout-classes', page: 'loadout', at: '.arch-tabs', text: 'There are four classes, and each one levels on its own. You can switch between them at home.' },
  { id: 'loadout-talents', page: 'loadout', at: '.ttree', when: (s) => hackerLevel(s) >= 10, text: 'From level 10 you earn a talent point every other level. Ranks add small bonuses, and each tier asks you to pick one of two. You can change picks at home for free.' },

  // ---------- daemons ----------
  { id: 'daemons', page: 'loadout', at: '.daemon-slots', text: 'Daemons are programs you find on runs. A slotted daemon fights beside you on its own cooldown, and finding the same one again upgrades it.' },
  { id: 'server-arch', page: 'server', when: (s) => !s.architecture, at: '.arch-card:not(.locked)', text: 'Your server is big enough to choose what it is built around. Each architecture is a trade, so pick the one that fits how you play. You can rebuild later for credits.' },
  { id: 'map-mods', page: 'map', at: '.mods .mod.add', text: 'A module you crafted, ready for this outpost\'s ports. It bends how the outpost works. Take it out and it goes back to your stock for another outpost.' },
];

// The next tip to show on this page, or null. `visible(selector)` says whether an element is on
// screen (the browser passes a DOM check; tests pass their own).
export function nextTip(s, page, visible) {
  if (s.settings?.tips === false) return null;
  const seen = s.settings?.seen || {};
  for (const t of TIPS) {
    if (seen[t.id]) continue;
    if (t.page !== '*' && t.page !== page) continue;
    if (t.when && !t.when(s, page)) continue;
    if (!visible(t.at)) continue;
    if (!t.joins) return t;
    const more = t.joins.map((id) => TIPS.find((x) => x.id === id))
      .filter((x) => x && !seen[x.id] && (!x.when || x.when(s, page)) && visible(x.at));
    return more.length ? { ...t, steps: [t, ...more], covers: more.map((x) => x.id) } : t;
  }
  return null;
}
export function markSeen(s, id) {
  s.settings.seen ||= {};
  s.settings.seen[id] = 1;
}
