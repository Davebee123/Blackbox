// Drafts on a breach (docs/roguelite.md 4): mods, CVEs and gear, drafted 1 of 3 after a fight. Phase 3 of the
// roguelite redesign: the randomness supplies material, and skill turns it into a win.
//
//   tags      every mod and CVE says which mechanics it makes and which it wants (TAGS: ◆ strips, burns, helpers,
//             shields, critical strikes, breaks, delays, tells, heals). Your kit makes some from the start (the skills
//             on your bar). A card's tag that meets your build lights up on its tile: synergy is shown, not explained.
//   no dead   a mod only rolls for a skill on your bar, a CVE only when your build makes something it wants (◆ and
//             breaks count when a skill of yours makes them on purpose; every build meets tells), gear only for slots
//             you have.
//   rarity    common, uncommon, rare (white, blue, yellow), by act. Every draft without a rare raises the next one's
//             rare odds (the pity), and showing one resets them.
//   kinds     a fight node shows ahead of time what its draft offers (breach.mjs n.reward: mod, CVE or gear), and
//             the draft keeps that promise. A draft nothing promised mixes kinds.
//   +         a defrag (or NULL CHOIR's stall) recompiles a mod to its + version: the second of its two values.
//
// A mod changes how one skill on your bar works, for this breach only. Some are field patches on ABILITIES, laid on
// while a breach runs and taken off when it ends (patchMods / unpatchMods): the global data is never changed for
// good. The rest act on what the fight emits (onEvent, through combat.mjs hooks.emitted) or after the command they
// change (afterCommand, through hooks.commanded).
// A CVE lasts the whole breach. Most are effect blocks (cveFx, through combat.mjs hooks.extraFx, read like a
// unique's effect); the others react to the fight's events too.
import { ABILITIES } from './data.mjs';
import { part, alive, livingParts, soonestAttacker, heal, hit, emit, powerOf, scaled, usable, defender, equippedSkills, classOf, stretchBurns, addBurn, injectTick, on, attackers, hackerLevel } from './combat.mjs';
import { rollItem, RARITIES, itemLabel, statLine } from './gear.mjs';
import { overclockMult } from './tells.mjs';

// ---------- tags ----------
// The mechanics cards make and want. word: the chip's text. tip: what it means, for the chip's hover.
export const TAGS = {
  strip: { word: '◆ strip', tip: 'Breaking ◆.' },
  burn: { word: 'burn', tip: 'Burns: damage every cycle.' },
  helper: { word: 'helper', tip: 'Helpers: processes that strike for you.' },
  shield: { word: 'shield', tip: 'Shields and halved hits.' },
  crit: { word: 'crit', tip: 'Critical strikes and Exposed parts.' },
  break: { word: 'break', tip: 'Breaking parts.' },
  delay: { word: 'delay', tip: 'Delaying attacks.' },
  tell: { word: 'tell', tip: 'Tells: answering them, or letting them land.' },
  heal: { word: 'heal', tip: 'Restoring Signal.' },
};
// What every build makes: Key 1 breaks ◆, every fight breaks parts, and every virus has tells.
export const EVERY_BUILD = ['strip', 'break', 'tell'];

// ---------- mods ----------
// skill: the skill it changes. v: [value, + value] (the + version is the second). patch(v): ABILITIES fields while
// held. text(v), short(v): the tooltip and the key's short line. makes, wants: its tags. alt: a second mod for a
// skill that has one, opened by heat in the campaign (campaign.mjs).
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
export const MODS = {
  // Breaker: strips, critical strikes, Momentum.
  'pry-bar': { cls: 'breaker', skill: 'spike', name: 'Pry Bar', rarity: 'common', makes: ['strip'], v: [35, 40], patch: (v) => ({ damage: v }), short: (v) => `${v} damage`, text: (v) => `Bash deals ${v} damage.` },
  overcommit: { cls: 'breaker', skill: 'overload', name: 'Overcommit', rarity: 'uncommon', makes: ['crit'], wants: ['crit'], v: [4, 2], patch: () => ({ damage: 60 }), short: (v) => `60 damage; ${v} Signal`, text: (v) => `Overload deals 60 damage and costs you ${v} Signal. A critical strike refunds the Signal.` },
  'critical-mass': { cls: 'breaker', skill: 'overload', name: 'Critical Mass', rarity: 'rare', alt: true, makes: ['crit'], wants: ['strip'], v: [50, 55], patch: (v) => ({ damage: v }), short: (v) => `${v}; crits a bare part`, text: (v) => `Overload deals ${v} damage, and is a critical strike against a target with no armor.` },
  undertow: { cls: 'breaker', skill: 'flood', name: 'Undertow', rarity: 'uncommon', makes: ['delay'], wants: ['strip'], v: [1, 2], short: (v) => `38, ×2 bare; delays ${v}`, text: (v) => `Flood also delays the target's next attack by ${cyc(v)} when the target has no armor.` },
  'zero-click': { cls: 'breaker', skill: 'exploit', name: 'Zero Click', rarity: 'uncommon', makes: ['crit'], v: [4, 6], short: (v) => `15 damage; ${v} to all, Exposes all`, text: (v) => `Exploit also deals ${v} damage to every other part, and Exposes every part.` },
  aftershock: { cls: 'breaker', skill: 'crack', name: 'Aftershock', rarity: 'uncommon', makes: ['strip'], v: [6, 9], short: (v) => `Breaks 3 ◆; ${v} each`, text: (v) => `Crack also deals ${v} damage to the target for each ◆ it breaks.` },
  shrapnel: { cls: 'breaker', skill: 'crack', name: 'Shrapnel', rarity: 'common', alt: true, makes: ['strip'], v: [2, 3], short: (v) => `Breaks 3 ◆; ${v} on the rest`, text: (v) => `Crack also breaks ${v} ◆ on every other armored part.` },
  fragmentation: { cls: 'breaker', skill: 'shatter', name: 'Fragmentation', rarity: 'rare', makes: ['strip'], wants: ['strip'], v: [1, 2], short: (v) => `Shards break ${v} ◆`, text: (v) => `Shatter's shards also hit armored parts, breaking ${v} ◆ on each.` },
  'breaching-charge': { cls: 'breaker', skill: 'shaped-charge', name: 'Breaching Charge', rarity: 'uncommon', makes: ['crit', 'strip'], v: [2, 3], patch: () => ({ provoke: 0 }), short: (v) => `Breaks all ◆; Exposes ${v}`, text: (v) => `Shaped Charge no longer provokes the target, and Exposes it for ${cyc(v)}.` },
  'positive-feedback': { cls: 'breaker', skill: 'hot-loop', name: 'Positive Feedback', rarity: 'uncommon', wants: ['crit'], v: [1, 2], short: (v) => `22; +${v} Momentum on a crit`, text: (v) => `Hot Loop grants ${v} more Momentum when it lands a critical strike.` },
  'arc-flash': { cls: 'breaker', skill: 'overvolt', name: 'Arc Flash', rarity: 'uncommon', makes: ['tell', 'strip'], v: [14, 17], patch: (v) => ({ hits: 3, hit: v }), short: (v) => `Strikes 3 times for ${v}`, text: (v) => `Overvolt strikes the target 3 times for ${v} damage each.` },
  // Bastion: shields, delays, heals.
  'ban-hammer': { cls: 'bastion', skill: 'spike', name: 'Ban Hammer', rarity: 'common', makes: ['shield'], v: [5, 8], short: (v) => `25 damage; shield ${v}`, text: (v) => `Ban also shields you for ${v}.` },
  'token-bucket': { cls: 'bastion', skill: 'rate-limit', name: 'Token Bucket', rarity: 'uncommon', makes: ['shield'], v: [30, 45], patch: (v) => ({ damage: v }), short: (v) => `${v} damage; 2 attacks`, text: (v) => `Rate Limit Throttles the target's next 2 attacks${v < 45 ? `, but deals ${45 - v} less damage` : ''}.` },
  backpressure: { cls: 'bastion', skill: 'rate-limit', name: 'Backpressure', rarity: 'common', alt: true, makes: ['delay', 'shield'], v: [1, 2], short: (v) => `45 damage; delays ${v}`, text: (v) => `Rate Limit also delays the target's next attack by ${cyc(v)}.` },
  'reflective-acl': { cls: 'bastion', skill: 'firewall', name: 'Reflective ACL', rarity: 'rare', wants: ['shield'], v: [1.5, 2], short: () => 'Shield 16; reflects', text: (v) => `When your shield absorbs a whole hit, it deals ${v > 1.5 ? 'twice' : 'one and a half times'} that hit back to the part that dealt it.` },
  'deep-scan': { cls: 'bastion', skill: 'purge', name: 'Deep Scan', rarity: 'uncommon', makes: ['heal', 'burn'], v: [4, 6], patch: (v) => ({ drain: v }), short: (v) => `Burn 6 ×4; heals ${v}`, text: (v) => `Purge heals you for ${v} with each tick instead of 2, and brings back a skill a tell knocked offline.` },
  'grudge-match': { cls: 'bastion', skill: 'retaliate', name: 'Grudge Match', rarity: 'uncommon', wants: ['tell', 'shield'], v: [2, 3], patch: (v) => ({ window: v }), short: (v) => `Returns 2×; ${v} cycles`, text: (v) => `Retaliate stays usable for ${cyc(v)} after you are hit.` },
  counterweight: { cls: 'bastion', skill: 'reject', name: 'Counterweight', rarity: 'common', makes: ['delay'], v: [1, 2], short: (v) => `28 damage; delays ${v}`, text: (v) => `Reject also delays the target's next attack by ${cyc(v)}.` },
  'cold-storage': { cls: 'bastion', skill: 'suspend', name: 'Cold Storage', rarity: 'uncommon', makes: ['shield', 'delay'], v: [10, 15], short: (v) => `Delays 2; shield ${v}`, text: (v) => `Suspend also shields you for ${v}.` },
  'parity-bit': { cls: 'bastion', skill: 'checksum', name: 'Parity Bit', rarity: 'uncommon', makes: ['heal'], v: [18, 20], patch: (v) => ({ share: 0.5, damage: v }), short: (v) => `${v} damage, heals 50%`, text: (v) => `Checksum heals you for half the damage it deals, but deals ${24 - v} less damage.` },
  scavenger: { cls: 'bastion', skill: 'reclaim', name: 'Scavenger', rarity: 'uncommon', makes: ['heal'], wants: ['burn'], v: [1, 1.25], short: () => '35 damage; heals all', text: (v) => `Reclaim heals you for ${v > 1 ? '125% of' : 'all'} the damage it deals to a burning target.` },
  // Infiltrator: burns.
  needle: { cls: 'infiltrator', skill: 'spike', name: 'Needle', rarity: 'common', wants: ['burn'], v: [6, 9], short: (v) => `25, +${v} on a burn`, text: (v) => `Poke deals ${v} more damage to a burning target, and makes its burns last 1 cycle longer.` },
  'viral-load': { cls: 'infiltrator', skill: 'inject', name: 'Viral Load', rarity: 'rare', makes: ['burn'], v: [3, 5], patch: (v) => ({ grow: v }), short: (v) => `Burn 20 ×4, +${v} a tick`, text: (v) => `Inject's burn deals ${v} more damage each time it ticks.` },
  'slow-drip': { cls: 'infiltrator', skill: 'inject', name: 'Slow Drip', rarity: 'common', alt: true, makes: ['burn'], v: [14, 16], patch: (v) => ({ ticks: 8, tick: v }), short: (v) => `Burn ${v} ×8`, text: (v) => `Inject burns for 8 cycles, but deals ${v} damage a tick.` },
  persistence: { cls: 'infiltrator', skill: 'backdoor', name: 'Persistence', rarity: 'uncommon', wants: ['burn'], v: [1, 2], short: (v) => `24 through ◆; burns +${v}`, text: (v) => `Backdoor also makes every burn on the target last ${cyc(v)} longer.` },
  'long-poll': { cls: 'infiltrator', skill: 'keepalive', name: 'Long Poll', rarity: 'uncommon', wants: ['burn'], v: [1, 2], short: (v) => `Burns tick ${v + 1} times now`, text: (v) => `Keepalive makes every burn on the target tick ${v > 1 ? 'three times' : 'twice'} now.` },
  'tracking-pixel': { cls: 'infiltrator', skill: 'tag', name: 'Tracking Pixel', rarity: 'uncommon', wants: ['break', 'burn'], v: [4, 6], patch: (v) => ({ cycles: v }), short: (v) => `Tags ${v}; moves on a break`, text: (v) => `When a Tagged part breaks, Tag moves to the part whose attack lands soonest${v > 4 ? ', and Tag lasts 6 cycles' : ''}.` },
  'lateral-movement': { cls: 'infiltrator', skill: 'wormable', name: 'Lateral Movement', rarity: 'rare', makes: ['burn'], v: [1, 2], short: (v) => `Spreads to ${v + 1} at once`, text: (v) => `Wormable spreads to ${v === 1 ? 'one more part' : `${v} more parts`} at once.` },
  'chain-detonation': { cls: 'infiltrator', skill: 'detonate', name: 'Chain Detonation', rarity: 'uncommon', makes: ['burn'], wants: ['burn'], v: [3, 4], short: (v) => `Burns go off; Inject ${v}`, text: (v) => `Detonate leaves a fresh Inject on the target, burning for ${cyc(v)}.` },
  'side-load': { cls: 'infiltrator', skill: 'fingerprint', name: 'Side Load', rarity: 'common', wants: ['burn'], makes: ['crit'], v: [2, 4], short: (v) => `15 damage; Tags ${v}`, text: (v) => `Fingerprint also Tags the target for ${cyc(v)}.` },
  'ghost-route': { cls: 'infiltrator', skill: 'null-route', name: 'Ghost Route', rarity: 'uncommon', makes: ['delay'], v: [1, 2], short: (v) => `Next attack misses; delays ${v}`, text: (v) => `Null Route also delays the attack that lands soonest by ${cyc(v)}.` },
  // Operator: helpers.
  'ping-flood': { cls: 'operator', skill: 'spike', name: 'Ping Flood', rarity: 'common', wants: ['helper'], v: [1, 2], short: () => '25 damage; helpers strike', text: (v) => `Ping makes each helper on the target strike ${v > 1 ? 'twice' : 'once'} now.` },
  daemonize: { cls: 'operator', skill: 'deploy', name: 'Daemonize', rarity: 'rare', makes: ['helper'], v: [10, 13], patch: (v) => ({ helper: v, ticks: 40 }), short: (v) => `Helper: ${v} until done`, text: (v) => `Deploy's helper deals ${v} damage each cycle and stays for the rest of the fight.` },
  'barbed-hook': { cls: 'operator', skill: 'hook', name: 'Barbed Hook', rarity: 'uncommon', wants: ['helper', 'burn'], v: [6, 8], patch: (v) => ({ damage: 10, cycles: v }), short: (v) => `10 damage; Hooked ${v}`, text: (v) => `Hook keeps the target Hooked for ${v} cycles.` },
  snare: { cls: 'operator', skill: 'hook', name: 'Snare', rarity: 'common', alt: true, makes: ['delay'], v: [0, 10], patch: (v) => ({ damage: v }), short: (v) => `${v} damage; delays 1`, text: (v) => `Hook also delays the target's next attack by 1 cycle${v ? '' : ', but deals no damage'}.` },
  clone: { cls: 'operator', skill: 'spawn', name: 'Clone', rarity: 'uncommon', makes: ['helper'], v: [7, 9], patch: (v) => ({ helpers: 2, helper: v }), short: (v) => `2 helpers: ${v} ×3`, text: (v) => `Spawn sends 2 helpers${v > 7 ? `, dealing ${v} damage each cycle` : ''}.` },
  'zombie-swarm': { cls: 'operator', skill: 'botnet', name: 'Zombie Swarm', rarity: 'uncommon', makes: ['helper'], v: [3, 4], patch: (v) => ({ helpers: v }), short: (v) => `${v} helpers; strike now`, text: (v) => `Botnet's helpers each strike once as they arrive, for half their damage${v > 3 ? ', and it sends 4' : ''}.` },
  'broadcast-storm': { cls: 'operator', skill: 'fan-out', name: 'Broadcast Storm', rarity: 'uncommon', wants: ['helper'], v: [2, 3], short: (v) => `A helper each; Hooks ${v}`, text: (v) => `Fan-Out also Hooks every part for ${cyc(v)}.` },
  disown: { cls: 'operator', skill: 'nohup', name: 'Disown', rarity: 'common', makes: ['helper'], v: [10, 12], patch: (v) => ({ damage: 0, helper: v, ticks: 3 }), short: (v) => `Helper: ${v} ×3`, text: (v) => `Nohup deals no damage, but its helper deals ${v} damage every cycle for 3 cycles.` },
  'syn-cookie': { cls: 'operator', skill: 'sniff', name: 'SYN Cookie', rarity: 'common', makes: ['delay'], v: [10, 18], patch: (v) => ({ damage: v }), short: (v) => `${v} damage; delays 1`, text: (v) => `Sniff also delays the target's next attack by 1 cycle${v < 18 ? `, but deals ${18 - v} less damage` : ''}.` },
  loopback: { cls: 'operator', skill: 'replay', name: 'Loopback', rarity: 'uncommon', makes: ['shield'], v: [0.5, 0.75], short: () => 'Its own attack; shields', text: (v) => `Replay also shields you for ${v > 0.5 ? 'three quarters' : 'half'} of the damage it deals.` },
  'dead-drop': { cls: 'operator', skill: 'kill-switch', name: 'Dead Drop', rarity: 'rare', makes: ['helper'], wants: ['helper'], v: [4, 6], short: (v) => `Cash in; leaves ${v} ×2`, text: (v) => `Kill Switch leaves a helper on each part it hits, dealing ${v} damage every cycle for 2 cycles.` },
};
for (const [id, m] of Object.entries(MODS)) { m.id = id; m.makes ||= []; m.wants ||= []; }
// A mod's value: its + value once recompiled (b.plus).
export const plusOf = (b, id) => !!b?.plus?.includes(id);
export const modV = (b, id) => MODS[id].v[plusOf(b, id) ? 1 : 0];
export const modText = (id, plus = false) => MODS[id].text(MODS[id].v[plus ? 1 : 0]);
export const modName = (id, plus = false) => MODS[id].name + (plus ? '+' : '');

// The fields a mod changed, as they were: put back when the breach ends (or before the next one patches).
let saved = null;
export function unpatchMods() {
  if (!saved) return;
  for (const [skill, was] of Object.entries(saved)) for (const [k, v] of Object.entries(was)) { if (v === undefined) delete ABILITIES[skill][k]; else ABILITIES[skill][k] = v; }
  saved = null;
}
// Lay the held mods on (after taking any old ones off). plus: the ids recompiled to +.
export function patchMods(mods, plus = []) {
  unpatchMods();
  saved = {};
  for (const id of mods || []) {
    const m = MODS[id], a = m && ABILITIES[m.skill];
    if (!a) continue;
    const v = m.v[plus.includes(id) ? 1 : 0];
    const was = (saved[m.skill] ||= {});
    for (const [k, x] of Object.entries({ ...(m.patch ? m.patch(v) : {}), short: m.short(v) })) { if (!(k in was)) was[k] = a[k]; a[k] = x; }
  }
}
export const modOn = (s, id) => !!s.breach?.mods?.includes(id) && !!s.encounter?.breach;
// The mods your class can draft now: its skills on your bar, not held already, in the pool (the campaign's unlocks:
// alt mods open with heat). The playtest offers every one.
export const modPool = (s) => {
  const bar = equippedSkills(s, classOf(s)), b = s.breach, open = b?.pool?.mods;
  return Object.values(MODS).filter((m) => m.cls === classOf(s) && (m.skill === 'spike' || bar.includes(m.skill)) && !b?.mods?.includes(m.id) && (!m.alt || !open || open.includes(m.id))).map((m) => m.id);
};

// ---------- CVEs ----------
// fx: an effect block (content.mjs), or a list of them, read like a unique's. The rest react to events (onEvent) or
// to the breach. needs: 'sigint' (a CVE that only works with SIGINT on your bar).
export const CVES = {
  heartbleed: { name: 'Heartbleed', rarity: 'common', wants: ['strip'], makes: ['heal'], text: 'Heals you for 1 each time you break a ◆.' },
  shellshock: { name: 'Shellshock', rarity: 'common', makes: ['delay'], text: 'Delays the attack that lands soonest by 1 cycle at the start of each fight against an elite.' },
  eternalblue: { name: 'EternalBlue', rarity: 'common', makes: ['crit'], needs: 'hits', fx: { when: 'start', do: 'force-crit' }, text: 'Makes your first hit each fight a critical strike.' },
  sasser: { name: 'Sasser', rarity: 'common', wants: ['tell'], makes: ['heal'], text: 'Restores 6% of your Signal after a fight where no tell landed.' },
  mirai: { name: 'Mirai', rarity: 'common', wants: ['break'], fx: { when: 'break', do: 'break-hit', value: 8 }, text: 'Deals 8 damage to the part winding up a tell, or else to the next part to attack, when you break a part.' },
  rowhammer: { name: 'Rowhammer', rarity: 'common', wants: ['strip'], text: 'Deals 6 damage to a part when you break its last ◆.' },
  wannacry: { name: 'WannaCry', rarity: 'common', makes: ['heal'], text: 'Restores 5% of your Signal and pays you 10 tokens after every fight.' },
  printnightmare: { name: 'PrintNightmare', rarity: 'common', wants: ['break'], makes: ['heal'], fx: { when: 'break', do: 'heal', value: 2 }, text: 'Heals you for 2 when you break a part.' },
  bluekeep: { name: 'BlueKeep', rarity: 'uncommon', text: 'The Resident starts with 1 ◆ less on every part.' },
  conficker: { name: 'Conficker', rarity: 'uncommon', wants: ['tell'], fx: { when: 'answer', do: 'refund', value: 1 }, text: 'Reduces all your cooldowns by 1 cycle when you answer a tell, and readies your longest one when a tell lands on you.' },
  codered: { name: 'Code Red', rarity: 'uncommon', wants: ['tell'], needs: 'hits', fx: { when: 'hit', do: 'damage%', value: 20, if: 'any-tell' }, text: 'Increases your damage by 20% while a part is winding up a tell. Doubles that while the virus is Overclocked.' },
  stuxnet: { name: 'Stuxnet', rarity: 'uncommon', makes: ['crit', 'strip'], text: 'Breaks 1 ◆ on each part carrying a virus\'s rolled genes at the start of each fight, and Exposes it for 2 cycles.' },
  slowloris: { name: 'Slowloris', rarity: 'uncommon', makes: ['delay'], text: 'Delays every virus attack by 1 cycle on every 3rd cycle.' },
  ghostcat: { name: 'Ghostcat', rarity: 'uncommon', wants: ['tell'], makes: ['heal'], fx: { when: 'answer', do: 'heal', value: 8 }, text: 'Heals you for 8 when you answer a tell.' },
  thermite: { name: 'Thermite', rarity: 'uncommon', wants: ['burn', 'helper'], fx: { when: 'custom', do: 'dot%', value: 12 }, text: 'Increases the damage of your burns and helpers by 12%.' },
  log4shell: { name: 'Log4Shell', rarity: 'uncommon', wants: ['burn'], fx: { when: 'hit', do: 'damage%', value: 20, if: 'target-burning' }, text: 'Increases your damage by 20% against a burning target.' },
  spectre: { name: 'Spectre', rarity: 'uncommon', wants: ['strip'], makes: ['crit'], fx: { when: 'hit', do: 'crit%', value: 20, if: 'target-bare' }, text: 'Increases your critical strike chance by 20% against a target with no armor.' },
  dirtycow: { name: 'Dirty COW', rarity: 'uncommon', wants: ['burn', 'break'], makes: ['burn'], text: 'Copies the burns on a part you break to the part whose attack lands soonest, each with 1 cycle more.' },
  krack: { name: 'KRACK', rarity: 'uncommon', wants: ['tell'], makes: ['shield'], fx: { when: 'answer', do: 'shield', value: 16 }, text: 'Shields you for 16 when you answer a tell.' },
  qbot: { name: 'Qbot', rarity: 'uncommon', wants: ['helper'], text: 'Makes each helper you send strike once as it arrives, for a quarter of its damage.' },
  smurf: { name: 'Smurf', rarity: 'uncommon', wants: ['shield'], text: 'Deals 20 damage to the part that dealt a hit your shield absorbs whole.' },
  tocttou: { name: 'TOCTTOU', rarity: 'uncommon', wants: ['delay'], makes: ['shield'], text: 'Throttles a part whose attack you delay, halving that attack.' },
  poodle: { name: 'POODLE', rarity: 'rare', text: 'Drafts offer 1 more card.' },
  ripple20: { name: 'Ripple20', rarity: 'rare', wants: ['tell'], makes: ['shield'], needs: 'sigint', text: 'Readies SIGINT and shields you for 12 each time a tell lands on you.' },
  zerologon: { name: 'Zerologon', rarity: 'rare', makes: ['heal'], text: 'Defrag nodes give you both rest and recompile, and rest restores 10% more of your Signal.' },
  meltdown: { name: 'Meltdown', rarity: 'rare', wants: ['crit'], fx: { when: 'hit', do: 'crit%', value: 15 }, text: 'Increases your critical strike chance by 15%. Each critical strike costs you 1 Signal.' },
  follina: { name: 'Follina', rarity: 'rare', wants: ['break'], fx: { when: 'break', do: 'refund', value: 2 }, text: 'Reduces all your cooldowns by 2 cycles when you break a part.' },
};
for (const [id, c] of Object.entries(CVES)) { c.id = id; c.makes ||= []; c.wants ||= []; }
// A card's rarity, in the draft's colours: common white, uncommon blue, rare yellow.
export const CVE_TIER = { common: 'stock', uncommon: 'tuned', rare: 'custom' };
const TIER_OF = CVE_TIER;
export const cveOn = (s, id) => !!s.breach?.cves?.includes(id);

// The effect blocks your CVEs lay on a breach fight (combat.mjs uniqueFx, through hooks.extraFx).
export function cveFx(s) {
  if (!s.breach || !s.encounter?.breach) return null;
  const out = [];
  for (const id of s.breach.cves || []) {
    const c = CVES[id];
    for (const fx of [c?.fx || []].flat()) out.push({ it: { name: c.name }, name: c.name, fx, id: 'cve:' + id });
    if (id === 'codered' && overclockMult(s) > 1) out.push({ it: { name: c.name }, name: c.name, fx: { when: 'hit', do: 'damage%', value: 20 }, id: 'cve:codered2' });
  }
  return out;
}

// ---------- synergy ----------
// What a skill makes, read off its fields and its tooltip.
export function skillMakes(id) {
  const a = ABILITIES[id], out = new Set();
  if (!a) return out;
  const help = a.help || '';
  if (a.strip || a.chits || /◆/.test(help)) out.add('strip');
  if (a.verb === 'burn' && a.tick && !a.helper) out.add('burn');
  if (a.helper) out.add('helper');
  if (a.shield || a.guard || a.verb === 'shield') out.add('shield');
  if (/critical/i.test(help) || a.status === 'exposed') out.add('crit');
  if ((a.delay || a.verb === 'stun') && id !== 'sigint') out.add('delay');
  if (a.heal || a.drain || a.lifesteal || a.verb === 'heal' || id === 'checksum') out.add('heal');
  if (id === 'sigint' || a.counts || a.hits) out.add('tell');
  return out;
}
// Your kit: how many skills on your bar make each tag, and the class's own (a Breaker lives by its strips, an
// Infiltrator by its burns, an Operator by its helpers, a Bastion by its shields). Every build makes ◆, breaks and
// tells once over.
const hasSigint = (s) => hackerLevel(s) >= 10; // SIGINT comes at 10 (data.mjs UNLOCKS)
export const HITTERS = ['breaker', 'bastion'];
export const CLASS_TAGS = { breaker: ['strip', 'break'], bastion: ['shield'], infiltrator: ['burn'], operator: ['helper'] };
export function kitCounts(s) {
  const out = Object.fromEntries(EVERY_BUILD.map((t) => [t, 1]));
  for (const id of [...equippedSkills(s, classOf(s)), ...(hasSigint(s) ? ['sigint'] : [])]) for (const t of skillMakes(id)) out[t] = (out[t] || 0) + 1;
  for (const t of CLASS_TAGS[classOf(s)] || []) out[t] = (out[t] || 0) + 1;
  return out;
}
export const kitTags = (s) => new Set(Object.keys(kitCounts(s)));
export const cardDef = (c) => (c.kind === 'mod' ? MODS[c.id] : c.kind === 'cve' ? CVES[c.id] : null);
// Your build: what it makes (the kit, held mods and CVEs) and what it wants (held cards), each with a count.
export function buildTags(s) {
  const b = s.breach, makes = { ...kitCounts(s) }, wants = {};
  for (const id of b?.mods || []) { for (const t of MODS[id].makes) makes[t] = (makes[t] || 0) + 1; for (const t of MODS[id].wants) wants[t] = (wants[t] || 0) + 1; }
  for (const id of b?.cves || []) { for (const t of CVES[id].makes) makes[t] = (makes[t] || 0) + 1; for (const t of CVES[id].wants) wants[t] = (wants[t] || 0) + 1; }
  return { makes, wants };
}
// A card against your build: each of its tags, lit when it meets something (a want your build makes, a make one
// of your cards wants), and how many links it has. Universal makes (◆, breaks, tells) light a want but count half.
export function linksOf(s, c, build = buildTags(s)) {
  const d = cardDef(c);
  if (!d) return { tags: [], n: 0 };
  const tags = [];
  let n = 0;
  for (const t of d.wants) { const has = build.makes[t] || 0, on = has > 0; tags.push({ tag: t, side: 'wants', on, count: has }); if (on) n += has <= 1 ? 0.5 : Math.min(3, has - 1); }
  for (const t of d.makes) { if (d.wants.includes(t)) continue; const w = build.wants[t] || 0; tags.push({ tag: t, side: 'makes', on: w > 0, count: w }); n += Math.min(2, w); }
  return { tags, n };
}
// A CVE that works with your build: it wants something the build makes (or wants nothing), and has what it needs.
export function cveWorks(s, id, build = buildTags(s)) {
  const c = CVES[id];
  if (c.needs === 'sigint' && !hasSigint(s)) return false;
  // A card on your hits (not your burns or helpers): a Breaker's or a Bastion's.
  if (c.needs === 'hits' && !HITTERS.includes(classOf(s))) return false;
  return !c.wants.length || c.wants.some((t) => build.makes[t] >= (EVERY_BUILD.includes(t) && t !== 'tell' ? 2 : 1));
}
// The CVEs a draft can offer: not held, open in the pool (the campaign's unlocks), and working with your build.
export function cvePool(s, build = buildTags(s)) {
  const b = s.breach, open = b?.pool?.cves;
  return Object.values(CVES).filter((c) => !b.cves.includes(c.id) && (!open || open.includes(c.id)) && cveWorks(s, c.id, build)).map((c) => c.id);
}

// ---------- events ----------
// What a breach's mods and CVEs do when the fight says something happened (combat.mjs emit, through
// hooks.emitted). Nothing they do here sets anything else off: one reaction per event.
const landedTells = (e) => Object.values(e.metrics?.tells || {}).reduce((n, x) => n + x.landed, 0);
const chitsIn = (ev) => { const m = /loses (\d+) ◆/.exec(ev.message); return m ? Number(m[1]) : /two ◆ broken/.test(ev.message) ? 2 : /◆ broken/.test(ev.message) ? 1 : 0; };
const has = (s, id) => s.breach.mods.includes(id);
const V = (s, id) => modV(s.breach, id);
// Delay a part's next attack (a mod or a CVE): TOCTTOU throttles it.
function delay(s, p, n, by) {
  if (!alive(p) || !p.attack || p.attack.due >= 900) return;
  p.attack.due += n;
  emit(s, 'interrupt', `${by}: the ${p.name}'s ${p.attack.name} is delayed ${n === 1 ? '1 cycle' : `${n} cycles`}.`, { target: p.id });
  delayed(s, p);
}
function delayed(s, p) {
  if (cveOn(s, 'tocttou') && alive(p) && p.attack) p.throttledUntil = Math.max(p.throttledUntil || 0, p.attack.due);
}
const shieldUp = (s, n, by) => { const e = s.encounter, amount = scaled(s, n); e.shield = Math.max(e.shield || 0, amount); emit(s, 'status', `${by} shields you for ${amount}.`, { mark: 'shield' }); };
export function onEvent(s, ev) {
  const e = s.encounter, b = s.breach;
  if (!e?.breach || e.phase !== 'active' && ev.type !== 'engage') return;
  // Your command, as it resolves: what the mods on it do before it hits.
  if (ev.type === 'resolved' && ev.ability && ev.auto !== 'daemon') {
    const p = ev.target && part(s, ev.target);
    e.breachCmd = { id: ev.ability, target: ev.target, cycle: e.cycle, hit: false, hp: p?.integrity ?? 0, helpers: e.helpers.length, burning: !!p && e.burns.some((x) => x.target === p.id), on: e.helpers.filter((h) => alive(part(s, h.target))).map((h) => h.target) };
    if (ev.ability === 'overload' && has(s, 'overcommit')) { const d = defender(s); const n = Math.min(V(s, 'overcommit'), d.integrity - 1); if (n > 0) { d.integrity -= n; emit(s, 'status', `Overcommit costs you ${n} Signal. Signal ${d.integrity}/${d.max}.`, { amount: n, ability: 'overload' }); } }
    if (ev.ability === 'overload' && has(s, 'critical-mass') && alive(p) && (on(s, p, 'exposed') || (V(s, 'critical-mass') && !(p.armor > 0)))) e.nextCrit = true;
    if (ev.ability === 'backdoor' && has(s, 'persistence') && alive(p)) { const n = V(s, 'persistence'), burns = e.burns.filter((x) => x.target === p.id); for (const x of burns) x.left += n; if (burns.length) emit(s, 'status', `Persistence: ${burns.length === 1 ? 'the burn' : `${burns.length} burns`} on the ${p.name} ${burns.length === 1 ? 'lasts' : 'last'} ${n === 1 ? '1 cycle' : `${n} cycles`} longer.`, { target: p.id, mark: 'burn' }); }
    if (ev.ability === 'keepalive' && has(s, 'long-poll') && alive(p)) for (let k = 0; k < V(s, 'long-poll'); k++) for (const x of e.burns.filter((y) => y.target === p.id)) { if (!alive(p)) break; hit(s, p, x.damage, { by: `Long Poll (${x.name})`, dot: true }); }
    if (ev.ability === 'purge' && has(s, 'deep-scan')) { const off = Object.entries(e.locked || {}).filter(([, until]) => until >= e.cycle).map(([id]) => id)[0]; if (off) { delete e.locked[off]; e.readyAt[off] = Math.min(e.readyAt[off] || 0, e.cycle + 1); emit(s, 'proc', `Deep Scan brings ${ABILITIES[off]?.name || off} back online.`, { ability: off }); } }
    return;
  }
  // The first damage your command does to its target (no "By: " in front: not a burn, a helper or a spill).
  if (ev.type === 'damage' && e.breachCmd && !e.breachCmd.hit && ev.target === e.breachCmd.target && e.breachCmd.cycle === e.cycle && !/^[A-Z][\w() -]*: /.test(ev.message)) {
    e.breachCmd.hit = true;
    const p = part(s, ev.target);
    if (e.breachCmd.id === 'flood' && has(s, 'undertow') && alive(p) && !(p.armor > 0)) delay(s, p, V(s, 'undertow'), 'Undertow');
    if (e.breachCmd.id === 'hot-loop' && has(s, 'positive-feedback') && ev.crit && e.momentum) { const n = V(s, 'positive-feedback'); e.momentum.stacks = Math.min(3, e.momentum.stacks + n); e.momentum.until = Math.max(e.momentum.until, e.cycle + 2); if (e.bkMomentum) e.bkMomentum = { ...e.momentum }; emit(s, 'status', `Positive Feedback: +${n} Momentum (${e.momentum.stacks}).`, { mark: 'buff' }); }
  }
  // A critical strike of yours: Meltdown's price.
  if (ev.type === 'damage' && ev.crit && cveOn(s, 'meltdown')) { const d = defender(s); if (d.integrity > 1) d.integrity -= 1; }
  if (ev.type === 'proc' && ev.ability === 'overload' && has(s, 'overcommit') && /critical/.test(ev.message)) heal(s, V(s, 'overcommit'), 'Overcommit refunds');
  if (ev.type === 'status' && ev.ability === 'rate-limit' && has(s, 'token-bucket')) { const p = part(s, ev.target); if (alive(p) && p.attack) p.throttledUntil = Math.max(p.throttledUntil || 0, p.attack.due + p.attack.interval); }
  // A delay of yours (a skill's own): TOCTTOU.
  if (ev.type === 'interrupt' && ev.target) delayed(s, part(s, ev.target));
  // Your shield absorbed a whole hit: Reflective ACL and Smurf.
  if (ev.type === 'blocked' && /^Shield absorbs/.test(ev.message) && e.shield > 0 && ev.source) {
    const p = part(s, ev.source);
    if (alive(p) && has(s, 'reflective-acl')) hit(s, p, Math.round(ev.amount * V(s, 'reflective-acl')), { by: 'Reflective ACL', pierce: true });
    if (alive(p) && cveOn(s, 'smurf')) hit(s, p, scaled(s, 20), { by: 'Smurf', pierce: true });
  }
  // ◆ you break.
  if (ev.type === 'armor' && ev.target) {
    const n = chitsIn(ev), p = part(s, ev.target);
    if (n && /^Crack: /.test(ev.message) && has(s, 'aftershock') && alive(p)) hit(s, p, Math.round(V(s, 'aftershock') * powerOf(s)) * n, { by: 'Aftershock', pierce: true });
    if (n && cveOn(s, 'heartbleed')) heal(s, n, 'Heartbleed');
    if (n && cveOn(s, 'rowhammer') && alive(p) && !(p.armor > 0) && ev.left === 0) hit(s, p, scaled(s, 6), { by: 'Rowhammer', pierce: true });
  }
  // A part you broke.
  if (ev.type === 'broken' && !ev.c2) {
    const p = part(s, ev.target);
    if (p && p.kind !== 'fragment') {
      if (has(s, 'tracking-pixel') && p.taggedUntil >= e.cycle) { const q = soonestAttacker(s, p.id); if (alive(q) && q !== p) { q.taggedUntil = Math.max(q.taggedUntil || 0, p.taggedUntil); q.tagBoost = p.tagBoost || 0; emit(s, 'status', `Tracking Pixel moves Tag to the ${q.name}.`, { target: q.id, mark: 'tagged' }); } }
      if (cveOn(s, 'dirtycow')) { const q = soonestAttacker(s, p.id), burns = e.burns.filter((x) => x.target === p.id && x.left > 0); if (alive(q) && q !== p && burns.length) { for (const x of burns) addBurn(e, { ...x, target: q.id, left: x.left + 1 }); emit(s, 'status', `Dirty COW copies ${burns.length === 1 ? 'a burn' : `${burns.length} burns`} to the ${q.name}.`, { target: q.id, mark: 'burn' }); } }
    }
  }
  // A fight starts.
  if (ev.type === 'engage') {
    if (cveOn(s, 'shellshock') && b.map.nodes[e.breach]?.kind === 'elite') { const q = soonestAttacker(s); if (q) delay(s, q, 1, 'Shellshock'); }
    if (cveOn(s, 'bluekeep') && b.map.nodes[e.breach]?.kind === 'boss') { for (const q of livingParts(s)) { if (q.maxArmor > 0) { q.maxArmor--; q.armor = Math.min(q.armor, q.maxArmor); } } emit(s, 'status', `BlueKeep: every part of ${e.virus.name} starts with 1 ◆ less.`, {}); }
    if (cveOn(s, 'stuxnet')) for (const q of livingParts(s).filter((x) => x.rolled || x.carries?.length)) { if (q.armor > 0) { q.armor--; if (!q.armor) q.patchAt = e.cycle + 3; } q.exposedUntil = Math.max(q.exposedUntil || 0, e.cycle + 1); emit(s, 'status', `Stuxnet breaks 1 ◆ on the ${q.name} and Exposes it.`, { target: q.id, mark: 'exposed' }); }
    e.breachLanded = 0;
  }
  // Once a cycle, on your turn: Slowloris.
  if ((ev.type === 'resolved' || ev.type === 'hold') && cveOn(s, 'slowloris') && e.cycle % 3 === 0 && e.slowAt !== e.cycle) { e.slowAt = e.cycle; for (const q of attackers(s)) if (q.attack.due < 900 && q.attack.due > e.cycle) { q.attack.due += 1; delayed(s, q); } emit(s, 'interrupt', 'Slowloris: every attack is delayed 1 cycle.', {}); }
  // A tell that landed on you (tells.mjs tallies it): Conficker and Ripple20.
  if (e.metrics?.tells && (cveOn(s, 'conficker') || cveOn(s, 'ripple20'))) {
    const landed = landedTells(e);
    if (landed > (e.breachLanded || 0)) {
      e.breachLanded = landed;
      if (cveOn(s, 'ripple20')) { delete e.readyAt.sigint; shieldUp(s, 12, 'Ripple20'); emit(s, 'proc', 'Ripple20: SIGINT is ready.', { ability: 'sigint' }); }
      if (cveOn(s, 'conficker')) { const id = usable(s).filter((x) => x !== 'sigint' && e.readyAt[x] > e.cycle).sort((a, c) => e.readyAt[c] - e.readyAt[a])[0]; if (id) { delete e.readyAt[id]; emit(s, 'proc', `Conficker: ${ABILITIES[id].name} is ready.`, { ability: id }); } }
    }
  }
}
// After your command resolves (combat.mjs hooks.commanded): what the mods on it add, and Qbot.
export function afterCommand(s, { id, target, res, auto }) {
  const e = s.encounter, b = s.breach, cmd = e?.breachCmd;
  if (!e?.breach || !b || auto === 'daemon' || e.phase !== 'active') return;
  const t = target && part(s, target.id || target);
  const mine = (m) => b.mods.includes(m) && MODS[m].skill === id && MODS[m].cls === classOf(s);
  if (mine('zero-click')) { for (const p of livingParts(s)) { p.exposedUntil = Math.max(p.exposedUntil || 0, e.cycle + 1); if (p !== t && alive(p)) hit(s, p, scaled(s, V(s, 'zero-click')), { by: 'Zero Click', mine: true }); } emit(s, 'status', 'Zero Click Exposes every part for 2 cycles.', { mark: 'exposed' }); }
  if (mine('shrapnel')) for (const p of livingParts(s).filter((x) => x !== t && x.armor > 0)) hit(s, p, 1, { by: 'Shrapnel', chits: V(s, 'shrapnel') });
  if (mine('fragmentation')) for (const p of livingParts(s).filter((x) => x !== t && x.armor > 0)) hit(s, p, 1, { by: 'Fragmentation', chits: V(s, 'fragmentation') });
  if (mine('breaching-charge') && alive(t)) t.exposedUntil = Math.max(t.exposedUntil || 0, e.cycle + V(s, 'breaching-charge') - 1);
  if (mine('ban-hammer')) shieldUp(s, V(s, 'ban-hammer'), 'Ban Hammer');
  if (mine('backpressure') && alive(t)) delay(s, t, V(s, 'backpressure'), 'Backpressure');
  if (mine('counterweight') && alive(t)) delay(s, t, V(s, 'counterweight'), 'Counterweight');
  if (mine('cold-storage')) shieldUp(s, V(s, 'cold-storage'), 'Cold Storage');
  if (mine('scavenger') && res?.dealt && cmd?.burning) heal(s, Math.max(1, Math.round(res.dealt * (V(s, 'scavenger') - 0.5))), 'Scavenger');
  if (mine('needle') && alive(t) && cmd?.burning) { hit(s, t, scaled(s, V(s, 'needle')), { by: 'Needle', pierce: true }); if (alive(t)) stretchBurns(s, t, 1, 'Needle'); }
  if (mine('lateral-movement') && alive(t)) {
    const src = e.burns.find((x) => x.id === 'wormable' && x.target === t.id);
    if (src) {
      const inj = e.burns.find((x) => x.id === 'inject' && x.target === t.id && x.left > 0);
      const to = livingParts(s).filter((x) => x !== t && !e.burns.some((y) => y.id === 'wormable' && y.target === x.id)).sort((x, y) => (x.attack?.due ?? 99) - (y.attack?.due ?? 99)).slice(0, V(s, 'lateral-movement'));
      for (const p of to) { e.burns.push({ ...src, target: p.id, spreads: false }); if (inj) addBurn(e, { ...inj, target: p.id }); }
      if (to.length) emit(s, 'status', `Lateral Movement: Wormable spreads to ${to.length === 1 ? 'a part' : `${to.length} parts`} at once.`, { mark: 'burn' });
    }
  }
  if (mine('chain-detonation') && alive(t)) { const n = V(s, 'chain-detonation'), dmg = scaled(s, injectTick(s)); addBurn(e, { id: 'inject', target: t.id, damage: dmg, grow: 0, left: n, name: 'Inject', drain: 0, synced: false }); emit(s, 'status', `Chain Detonation leaves an Inject on the ${t.name}: ${dmg} every cycle for ${n} cycles.`, { target: t.id, mark: 'burn' }); }
  if (mine('side-load') && alive(t)) { t.taggedUntil = Math.max(t.taggedUntil || 0, e.cycle + V(s, 'side-load') - 1); emit(s, 'status', `Side Load Tags the ${t.name}.`, { target: t.id, mark: 'tagged' }); }
  if (mine('ghost-route')) { const q = soonestAttacker(s); if (q) delay(s, q, V(s, 'ghost-route'), 'Ghost Route'); }
  if (mine('ping-flood') && alive(t)) for (const h of e.helpers.filter((x) => x.target === t.id)) for (let k = 0; k < V(s, 'ping-flood') && alive(t); k++) hit(s, t, h.damage, { by: 'Ping Flood', dot: true });
  if (mine('snare') && alive(t)) delay(s, t, 1, 'Snare');
  if (mine('zombie-swarm') && cmd) for (const h of e.helpers.slice(cmd.helpers)) { const p = part(s, h.target); if (alive(p)) hit(s, p, Math.max(1, Math.round(h.damage / 2)), { by: 'Zombie Swarm', dot: true }); }
  if (mine('broadcast-storm')) { for (const p of livingParts(s)) p.hookedUntil = Math.max(p.hookedUntil || 0, e.cycle + V(s, 'broadcast-storm') - 1); emit(s, 'status', 'Broadcast Storm Hooks every part.', { mark: 'hooked' }); }
  if (mine('syn-cookie') && alive(t)) delay(s, t, 1, 'SYN Cookie');
  if (mine('loopback') && cmd && t) { const dealt = Math.max(0, cmd.hp - t.integrity); if (dealt) shieldUp(s, Math.round(dealt * V(s, 'loopback') / Math.max(0.01, powerOf(s))), 'Loopback'); }
  if (mine('dead-drop') && cmd) { const dmg = scaled(s, V(s, 'dead-drop')); const hitParts = [...new Set(cmd.on)].map((x) => part(s, x)).filter(alive); for (const p of hitParts) e.helpers.push({ target: p.id, damage: dmg, left: 2, synced: false }); if (hitParts.length) emit(s, 'status', `Dead Drop leaves ${hitParts.length === 1 ? 'a helper' : `${hitParts.length} helpers`}, dealing ${dmg} every cycle for 2 cycles.`, { mark: 'helper' }); }
  // Qbot: every helper this command sent strikes once at once.
  if (cveOn(s, 'qbot') && cmd && e.helpers.length > cmd.helpers && id !== 'dead-drop') for (const h of e.helpers.slice(cmd.helpers)) { const p = part(s, h.target); if (alive(p)) hit(s, p, Math.max(1, Math.round(h.damage / 4)), { by: 'Qbot', dot: true }); }
}
// After a fight: Sasser and WannaCry. Returns [Signal restored, tokens paid].
export function afterFightCves(s, e) {
  let healed = 0;
  if (cveOn(s, 'sasser') && !landedTells(e)) { const d = defender(s), n = Math.min(d.max - d.integrity, Math.round(d.max * 0.06)); if (n > 0) { d.integrity += n; healed = n; } }
  if (cveOn(s, 'wannacry')) { const d = defender(s), n = Math.min(d.max - d.integrity, Math.round(d.max * 0.05)); if (n > 0) { d.integrity += n; healed += n; } }
  return [healed, cveOn(s, 'wannacry') ? 10 : 0];
}

// ---------- the draft ----------
// Rarity by act (white, blue, yellow): an elite moves 10 points from white to yellow. Every draft without a rare adds
// rareStep points to the next one's rare odds; showing a rare resets them. Heat adds its own (heat.mjs).
export const RARITY_BY_ACT = [[62, 30, 8], [50, 36, 14], [40, 40, 20]];
// reward: how often a fight node promises each kind. skip: tokens a skip pays.
// Gear is a chase, not a flood (the designer: "WAY too much loot per run"): a fight promises gear one time in six, a
// gate drafts mods and CVEs, and the Resident's gear draft is a breach's main gear moment.
export const DRAFT = { reward: { mod: 46, cve: 38, gear: 16 }, skip: 15, rareStep: 5, cards: 3, rareNode: 0.16 };
const RAR = ['stock', 'tuned', 'custom'];
const RANK = { stock: 0, tuned: 1, custom: 2 };
function rollRarity(r, act, { elite = false, floor = null, boost = 0 } = {}) {
  let [w, bl, y] = RARITY_BY_ACT[Math.min(2, act)];
  if (elite) { w -= 10; y += 10; }
  const k = Math.min(boost, Math.max(0, w - 5)); w -= k; y += k;
  if (floor === 'tuned') { bl += Math.max(0, w); w = 0; }
  if (floor === 'custom') return 'custom';
  const x = r() * (w + bl + y);
  return x < w ? 'stock' : x < w + bl ? 'tuned' : 'custom';
}
const pickFrom = (r, list) => list[Math.floor(r() * list.length)];
// A card of a rarity from a pool of ids, the nearest rarity when the pool has none of it.
function byRarity(r, ids, defs, want) {
  if (!ids.length) return null;
  for (const d of [0, -1, 1, -2, 2]) { const tier = RAR[RANK[want] + d]; const xs = ids.filter((id) => TIER_OF[defs[id].rarity] === tier); if (tier && xs.length) return pickFrom(r, xs); }
  return pickFrom(r, ids);
}
function cveCard(s, r, act, opts, taken, build) {
  const pool = cvePool(s, build).filter((id) => !taken.includes(id));
  const id = byRarity(r, pool, CVES, opts.rarity || rollRarity(r, act, opts));
  return id ? { kind: 'cve', id, rarity: CVE_TIER[CVES[id].rarity] } : null;
}
function modCard(s, r, act, opts, taken) {
  const pool = modPool(s).filter((id) => !taken.includes(id));
  const id = byRarity(r, pool, MODS, opts.rarity || rollRarity(r, act, opts));
  return id ? { kind: 'mod', id, rarity: CVE_TIER[MODS[id].rarity] } : null;
}
function gearCard(s, r, act, level, opts = {}) {
  const rarity = opts.rarity || rollRarity(r, act, opts);
  return { kind: 'gear', item: rollItem(r, { level: level + (s.breach?.fx?.gearLevel || 0), rarity }), rarity };
}
// A draft. kind: 'mod', 'cve' or 'gear' (what the node promised: every card that kind, as far as the pool goes),
// 'elite' (CVEs, rarer), 'gate' and 'boss' (gear blue or better), 'rare' (a sandbox: a yellow for sure, mixed kinds),
// 'virus' (nothing promised: mixed kinds, never three of one). A gate drafts mods and CVEs and one gear card, blue or
// better; the Resident drafts gear, blue or better. rare: one card yellow for sure (a node's rare mark).
export function rollDraft(s, r, kind, { act = 0, level = 10, count = DRAFT.cards, boost: extra = 0, rare = false } = {}) {
  const b = s.breach, cards = [], taken = [], build = buildTags(s);
  const boost = (b.rareBoost || 0) + extra + (b.fx?.rareOdds || 0);
  const push = (c) => { if (c && !cards.some((x) => x.id && x.id === c.id)) { cards.push(c); if (c.id) taken.push(c.id); return true; } return false; };
  const one = (k, o = {}) => (k === 'mod' ? modCard(s, r, act, { boost, ...o }, taken) : k === 'cve' ? cveCard(s, r, act, { boost, ...o }, taken, build) : gearCard(s, r, act, level, { boost, ...o }));
  if (kind === 'boss' || kind === 'stall') { for (let i = 0; i < count; i++) push(gearCard(s, r, act, level, { floor: 'tuned', boost, ...(rare && i === 0 ? { rarity: 'custom' } : {}) })); }
  else if (kind === 'gate') {
    // A gate: mods and CVEs, blue or better, and one gear card (what a breach you don't finish can still bank).
    if (rare) push(one(r() < 0.5 ? 'mod' : 'cve', { rarity: 'custom' }));
    for (let i = 0; i < 12 && cards.length < count - 1; i++) push(one(r() < 0.5 ? 'mod' : 'cve', { floor: 'tuned' }));
    for (let i = 0; i < 6 && cards.length < count; i++) push(gearCard(s, r, act, level, { floor: 'tuned', boost }));
  }
  else if (['mod', 'cve', 'gear', 'elite'].includes(kind)) {
    const k = kind === 'elite' ? 'cve' : kind, elite = kind === 'elite';
    if (rare) push(one(k, { rarity: 'custom' }));
    for (let i = 0; i < 12 && cards.length < count; i++) push(one(k, { elite, ...(elite && i === 0 && !rare ? { floor: 'tuned' } : {}) }));
    // The pool ran short (few mods at a low level): the rest are the other kinds.
    for (const other of ['mod', 'cve', 'gear'].filter((x) => x !== k)) for (let i = 0; i < 6 && cards.length < count; i++) push(one(other, { elite }));
  } else {
    const order = kind === 'rare' ? (r() < 0.5 ? ['cve', 'mod', 'gear'] : ['gear', 'mod', 'cve']) : null;
    if (kind === 'rare') push(one(order[0], { rarity: 'custom' }) || one(order[2], { rarity: 'custom' }));
    for (let i = 0; i < 20 && cards.length < count; i++) {
      const w = DRAFT.reward, x = r() * (w.mod + w.cve + w.gear);
      const k = x < w.mod ? 'mod' : x < w.mod + w.cve ? 'cve' : 'gear';
      // Never three of one kind when nothing promised it.
      if (cards.length >= 2 && cards.every((c) => c.kind === k)) continue;
      push(one(k));
    }
  }
  // Rare odds creep up until a draft shows one.
  b.rareBoost = cards.some((c) => c.rarity === 'custom') ? 0 : (b.rareBoost || 0) + DRAFT.rareStep;
  return cards.slice(0, count);
}
// What a card says, for the screen and the log. plus: a mod's + version.
export function cardText(c, plus = false) {
  if (c.kind === 'mod') { const m = MODS[c.id]; return { name: modName(c.id, plus), kicker: `Mod · ${ABILITIES[m.skill]?.name || m.skill}`, text: modText(c.id, plus) }; }
  if (c.kind === 'cve') { const v = CVES[c.id]; return { name: v.name, kicker: `CVE · ${v.rarity[0].toUpperCase() + v.rarity.slice(1)}`, text: v.text }; }
  return { name: c.item.name, kicker: `Gear · ${RARITIES[c.item.rarity]?.name || ''} ${c.item.group}`, text: statLine(c.item.stats), label: itemLabel(c.item) };
}
