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
import { hackerLevel } from './combat.mjs';

const home = (s) => s.encounter?.mode !== 'run';

export const TIPS = [
  // ---------- anywhere ----------
  { id: 'degraded', page: '*', at: '#integrity-note.degraded', text: 'Your server crashed and rebooted at half Integrity. For the next 10 minutes your wall is down, installs are paused and the server earns no XP.' },
  { id: 'code', page: '*', at: '.modules [data-module="server"]', when: (s, m) => m !== 'server' && Object.values(s.materials || {}).some((n) => n > 0), text: 'You picked up code. Your server uses it to build services, which you can do on the Server page.' },
  { id: 'protocol', page: '*', at: '.modules [data-module="loadout"]', when: (s, m) => m !== 'loadout' && (s.stash || []).length > 0, text: 'A protocol dropped. You can load it into a slot on the Loadout page.' },
  { id: 'top-up', page: '*', at: '#meter-signal .meter-buy', text: 'Your Signal rests back on its own at home, slowly. Click + to pay credits and fill it now.' },
  { id: 'repair', page: '*', at: '#meter-integrity .meter-buy', text: 'Your server rests back on its own, slowly. Click + to pay credits and repair it now.' },
  { id: 'level', page: '*', at: '#whoami', when: (s) => hackerLevel(s) >= 2, text: 'This is you: your handle, the class you play and its level. Each level makes you 4% stronger, and some unlock new skills.' },

  // ---------- map ----------
  { id: 'map-server', page: 'map', at: '.mnode.server', text: 'This is your server. Intrusions arrive at its gate, and the places they came from appear around it once you trace them.' },
  { id: 'map-zone', page: 'map', at: '.mnode.zone', text: 'This is a rogue server. Viruses gather in its folders. Connect, find them with ls and cd, and attack the ones you want to fight.' },
  { id: 'net-sweep', page: 'net', at: '.sweep:not(.past):not(.solved)', text: 'Click a line to light up every line it shares a source with, and filter out the noise. A right answer pushes your lead toward the next server; a wrong one only shrinks the push.' },
  { id: 'net-hostile', page: 'net', at: '.term .tok.virus', text: 'A virus is running in this folder. Click it, or type attack, when you are ready. It comes back a while after you kill it.' },
  { id: 'map-intrusion', page: 'map', at: '.mnode.intrusion', text: 'An intrusion is waiting at your gate. Select it and press Engage when you are ready; nothing happens until you do.' },
  { id: 'map-lead', page: 'map', at: '.mnode.lead', text: 'This is a lead. Each kill of this family adds 25%, and your class\'s backtrace adds more. At 100% you find where they came from.' },
  { id: 'map-origin', page: 'map', at: '.mnode.loc', text: 'You traced a server. Select it and press Connect: first it shows the memory it takes to join your network, then you jack in. Its ring fills as you explore it.' },
  { id: 'map-memory', page: 'map', at: '.mem-join', text: 'These pips are your memory: how many servers your network holds. The pulsing one is what this server would take. Detach a server you are done with to free one.' },
  { id: 'map-invader', page: 'map', at: '.mnode.invader', text: 'An invasion is heading for your wall. How strong your Firewall is decides whether it is blocked, contested, or breaks through.' },
  { id: 'map-outpost', page: 'map', when: (s) => (s.locations || []).some((l) => l.outpost?.h), at: '.outpost .lvl-bar', text: 'This outpost fills while you are away, up to its cap. Connect to the server to collect what it has gathered.' },
  { id: 'map-besieged', page: 'map', when: (s) => (s.locations || []).some((l) => l.outpost?.siege), at: '.mnode.besieged', text: 'Natives are sieging this outpost. Defend it before the timer runs out, or they take it back and the servers past it are cut off.' },
  { id: 'map-lockdown', page: 'map', when: (s) => (s.locations || []).some((l) => l.outpost?.lockdown), at: '.mnode.locked', text: 'This outpost is in lockdown: no harvesting for a while, but its stockpile is safe. Retake it with a fight to end it sooner.' },
  { id: 'map-fleet', page: 'map', when: (s) => !!s.fleet, at: '.mnode.fleet', text: 'A swarm is coming for one of your outposts. Each fight kills one of its processes: intercept them on the way, or defend when they land. Any still there when the siege runs out take the outpost.' },
  { id: 'map-breach', page: 'map', at: '.mnode.invader.breach', text: 'A breach takes some of your Integrity every minute. You can jack in to fight it yourself, and it counts as a full kill.' },
  { id: 'map-contract', page: 'map', at: '.mnode.job', text: 'A contract points at this server. Open its vault to take it over, or to find the file you were sent for.' },
  { id: 'pager', page: '*', at: '#pager .led.on', text: 'This is your pager. New mail, offers, finished contracts, the retainer and anything moving on the network land here. Click it for the list.' },
  { id: 'mail', page: '*', at: '.modules [data-module="mail"]', when: (s, m) => m !== 'mail' && (s.mail?.list || []).some((x) => !x.read), text: 'You have mail. Your crew, LOWLIGHT, and Halcyon Mutual send you contracts here.' },

  // ---------- mail ----------
  { id: 'mail-standing', page: 'mail', at: '.standing', text: 'This is your standing with Halcyon Mutual. It pays you a retainer every 30 minutes, and more as your standing grows. Contracts raise it, and a crash on your own server lowers it.' },
  { id: 'mail-contract', page: 'mail', at: '.contract', text: 'A contract keeps track of itself while you play. When it is ready, deliver it here to get paid.' },
  { id: 'mail-board', page: 'mail', at: '.mlist.mboard', text: 'This is Halcyon\'s board. Offers come and go on their own, and you can take up to three at a time. Only a contract you have taken counts.' },
  { id: 'store', page: '*', at: '.modules [data-module="store"]', when: (s, m) => m !== 'store', text: 'Halcyon\'s store is open. Its own line is always there, and other agencies\' stock changes through the day.' },
  { id: 'store-plans', page: 'store', at: '.plan-shelf', text: 'Plans for harvesters and outpost modules. Buy one once and you can craft that kind on the Craft page for good.' },
  { id: 'store-chase', page: 'store', at: '.ptile.chase', text: 'These are Halcyon\'s own protocols. They cost Indemnity, which only contracts pay, and your standing decides which ones you can buy.' },
  { id: 'map-drop', page: 'map', at: '.mnode.drop', text: 'LANTERN read out a dead drop on this server. It closes soon.' },
  { id: 'map-rogue', page: 'map', at: '.mnode.rogue', text: 'This is a rogue server: wild, never taken over. Viruses sit in its folders and come back a few minutes after you kill them.' },
  { id: 'map-infest', page: 'map', when: (s) => (s.locations || []).some((l) => l.outpost?.infest), at: '.outpost .tag.warn', text: 'Viruses moved into this outpost. Clear them for a bonus to its stockpile, or ignore them: they move on and cost you nothing.' },
  { id: 'map-install', page: 'map', at: '.op-rack', text: 'These are the harvesters in your rack. Install one and this server becomes an outpost. How many outposts run at once is the Outposts count on your server card.' },
  { id: 'map-owned', page: 'map', at: '.mnode.loc.owned', text: 'This server is yours now. Put a relay on it from its card, and it pings the unknown servers next to it.' },
  { id: 'map-hidden', page: 'map', at: '.mnode.hidden', text: 'An unknown server. Beating what it sends at you traces it, and so does a vault\'s trace record. Once a relay flags it, kills of its family and the route file count too.' },

  // ---------- fight ----------
  { id: 'fight-timeline', page: 'combat', pause: true, at: '.board .bnow', under: '#board', when: (s) => s.encounter?.phase === 'active', text: 'This is the timeline. Each attack sits in the column of the cycle where it lands. When you enter a command it runs first, and the cycle turns.' },
  { id: 'fight-keys', page: 'combat', pause: true, at: '#tray', under: '.command-dock', when: (s) => s.encounter?.phase === 'active', text: 'These are your skills. Press a number, click a part to target it, then press Enter. If you wait, you Spike the last part you hit.' },
  { id: 'fight-armor', page: 'combat', pause: true, at: '.board .chits', under: '#board', text: 'These diamonds are armor chits. A hit on an armored part breaks one chit and does no damage, so strip them with small hits and save your big one.' },
  { id: 'sync', page: 'combat', at: '#sync-win', pause: true, text: 'This is the Sync Window. Fire your command while the cycle bar is inside it for 10% more damage and a bonus of your class. It moves every cycle.' },
  { id: 'fight-patch', page: 'combat', pause: true, at: '.board .intent.patch', under: '#board', text: 'A part with no armor left patches one chit back five cycles later, unless you break it first.' },
  { id: 'fight-veiled', page: 'combat', pause: true, at: '.board .intent.hidden', under: '#board', text: 'This part hides when it will hit. Strip its armor or Tag it to see its timer.' },
  { id: 'fight-encrypt', page: 'combat', pause: true, at: '.board .intent.crypt', under: '#board', text: 'Encryption damages you every cycle and grows each time it lands. It stops when you break the Encryptor.' },
  { id: 'fight-status', page: 'combat', at: '#hud .hud-status .st', when: (s) => s.encounter?.phase === 'active', text: 'Everything on you right now lands here, in the Status column. Hover one to see what it does and how many cycles it has left.' },
  { id: 'fight-miss', page: 'combat', at: '#board', when: (s) => (s.encounter?.metrics?.misses || 0) > 0, text: 'You missed. A miss does no damage but still uses the cooldown, and enemies above your level make you miss more often.' },
  { id: 'fight-daemon', page: 'combat', at: '.board .intent.daemon:not(.cron)', under: '#board', text: 'That is your daemon. It acts on its own cooldown, in the cycle where its chip sits, on top of whatever you do.' },
  { id: 'fight-proc', page: 'combat', pause: true, at: '#tray .lit', text: 'A skill lit up. It only works for a cycle or two after something happens, so use it while it glows.' },
  { id: 'fight-cron', page: 'combat', at: '.board .intent.cron', under: '#board', text: 'Your Cron Job service runs every third cycle and hits the attacker that will land soonest.' },
  ...Object.entries({
    keylogger: 'This is a Keylogger. A wide Sync Window opens every cycle: only commands fired inside it hurt the Logger, and three fired outside it come back as a Dump.',
    hashrat: 'This is a Hashrat. While its Miner lives, your cooldowns run at half speed. The Miner never attacks: kill it first.',
    floodgate: 'This is a Floodgate. Its Flooder hits every cycle, a little harder each time. Any delay resets it.',
    leech: 'This is a Leech. Its Tap heals the most damaged part by what it bites, and clears a burn from it.',
    sleeper: 'This is a Sleeper. It does nothing until you hit it or cycle 6. Set up first: when it wakes, its Alarm lands at once.',
    patchwork: 'This is a Patchwork. Its Patcher heals the most damaged part every 3 cycles. Kill the Patcher first, or finish a part between patches.',
    flicker: 'This is a Flicker. Its Shade is only there on even cycles: on odd ones your hits pass through. Hit the Shade when it is in phase.',
    extortion: 'This is an Extortion. The Demand winds up a big Deadline. Hit it hard in the 2 cycles before it lands and the Deadline is called off.',
    echo: 'This is an Echo. While the Echo lives, every hit you take repeats a cycle later at half. It never attacks, so it is easy to leave. Don\'t.',
    bricker: 'This is a Bricker. Its parts hit half again as hard below half Integrity. Save your burst and take each part down in one go.',
    overrun: 'This is an Overrun. Its fragments bite harder every cycle they live. Clear them while they are young, or kill the Hive.',
    bouncer: 'This is Bouncer ICE. Its Keyring re-arms the Gate to full armor every 4 cycles. Break the Keyring first, or kill the Gate between re-arms.',
    tracer: 'This is Tracer ICE. Its Trace-back hits harder every cycle the fight lasts. Don\'t play it slow.',
  }).filter(([id]) => STRAINS[id] || GUARDS[id]).map(([id, text]) => ({ id: 'strain-' + id, page: 'combat', pause: true, at: `.tag-strain[data-strain="${id}"]`, text })),
  ...Object.entries(MUTATIONS).map(([id, m]) => ({ id: 'mut-' + id, page: '*', pause: true, at: `.tag-mut[data-mut="${id}"]`, text: `This virus is ${m.name}. ${m.rule}` })),
  ...Object.entries(QUIRKS).map(([id, q]) => ({ id: 'quirk-' + id, page: '*', at: `.tag-quirk[data-quirk="${id}"]`, text: `This location has the ${q.name} quirk. ${q.rule}` })),

  // ---------- runs ----------
  { id: 'net-signal', page: 'net', at: '.net-signal', text: 'Signal is your health on a run. Each move costs 1 and guards hit it. If it reaches 0 you are thrown home and lose your pack.' },
  { id: 'net-names', page: 'net', at: '.term .ls .tok', text: 'Click a name to open it or read it. Use pull to copy a file into your pack.' },
  { id: 'net-guarded', page: 'net', at: '.term .tag-guarded', text: 'This folder is guarded. Going in starts a fight, and the guard\'s hits cost Signal.' },
  { id: 'net-locked', page: 'net', at: '.term .tag-locked', text: 'This folder is locked. The password is in a file somewhere on this node; type unlock, the folder and the password.' },
  { id: 'net-pack', page: 'net', at: '.net-pack', when: (s) => (s.run?.pack.length || 0) > 0, text: 'Files you pull wait in your pack. Jack out to bank them and keep them.' },

  // ---------- server ----------
  { id: 'server-ports', page: 'server', at: '.server-head', text: 'Your server runs services in its service slots. Each one costs code from the viruses you kill, and takes real time to install.' },
  { id: 'server-wall', page: 'server', at: '.wall-card', text: 'Your wall meets invasions sent from the places you found. A Firewall service makes it hold more.' },
  { id: 'server-queue', page: 'server', at: '.install', text: 'Installs run one at a time in real time. They keep going while you fight, go on runs, or close the game.' },
  { id: 'server-blueprints', page: 'server', at: '.blueprint-card', text: 'You can only build a service once you have its blueprint. Blueprints wait in vaults, and a kill drops one now and then.' },

  // ---------- protocols ----------
  { id: 'protocols-slots', page: 'loadout', at: '.loadout-protocols .ptiles', text: 'Each slot takes one kind of protocol: Exploit, Proxy, Shell, Script or Implant. The stats of everything you load add up.' },
  { id: 'protocols-compile', page: 'craft', at: '.compile-card.open', text: 'You found a recipe, so you can compile protocols. Pick one of your recipes and the protocol comes out at your level.' },
  { id: 'protocols-zeroday', page: 'loadout', at: '.gitem.r-zeroday', text: 'This is a Zero-day. It has a special effect on top of its stats, and you can run one of each kind.' },

  // ---------- craft ----------
  { id: 'craft-plans', page: 'craft', at: '.plan-lock', text: 'A dimmed row needs its plan first. Your first vault holds the Siphon plan; Halcyon sells the rest, and some vaults hold one.' },
  { id: 'craft-modules', page: 'craft', at: '.craft-sec[data-sec="modules"]', when: (s) => (s.plans || []).some((id) => ['pipeline', 'storage', 'node', 'ids', 'lure'].includes(id)), text: 'Modules you craft go into your stock (×n on the row). Install them from an outpost\'s card on the map.' },

  // ---------- loadout ----------
  { id: 'loadout-status', page: 'loadout', at: '.status-line .status', text: 'This is the status this class puts on parts with its skills. Hover it to see what it does. Any class benefits from it.' },
  { id: 'loadout-bar', page: 'loadout', at: '.keybar', text: 'This is your skill bar. Everyone has the first three, and you choose up to five class skills as they unlock.' },
  { id: 'loadout-classes', page: 'loadout', at: '.arch-tabs', text: 'There are four classes, and each one levels on its own. You can switch between them at home.' },
  { id: 'loadout-talents', page: 'loadout', at: '.ttree', when: (s) => hackerLevel(s) >= 10, text: 'From level 10 you earn a talent point every other level. Ranks add small bonuses, and each tier asks you to pick one of two. You can change picks at home for free.' },

  // ---------- daemons ----------
  { id: 'daemons', page: 'loadout', at: '.daemon-slots', text: 'Daemons are programs you find on runs. A slotted daemon fights beside you on its own cooldown, and finding the same one again upgrades it.' },
  { id: 'server-arch', page: 'server', when: (s) => !s.architecture, at: '.arch-card:not(.locked)', text: 'Your server is big enough to choose what it is built around. Each architecture is a trade: pick the one that fits how you play. You can rebuild later for credits.' },
  { id: 'map-mods', page: 'map', at: '.mods .mod.add', text: 'A module you crafted, ready for this outpost\'s ports. It bends how the outpost works; take it out and it goes back to your stock for another outpost.' },
  { id: 'server-config', page: 'server', when: (s) => (s.configsOwned || []).length > 0, at: '.cfg-row', text: 'You crafted a config. Configs change how a service works rather than how strong it is, and you can swap them freely between fights.' },
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
    return t;
  }
  return null;
}
export function markSeen(s, id) {
  s.settings.seen ||= {};
  s.settings.seen[id] = 1;
}
