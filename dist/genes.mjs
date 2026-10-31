// The gene library (docs/genome.md). A virus is a body (its family) plus genes, and a crew wrote it (authors.mjs).
// Every family, strain, third part, mutation, tell and guard rule in the game is a gene here, so the codex, `scan`
// and the compatibility rules read one shape. This module is data with no imports: data.mjs builds viruses from it.
//
// A gene:
//   name, adj     its name, and the adjective a virus named for it takes (WARDED CRYPTJACK)
//   cat           attack (what a part does when its attack lands), part (a part whose life or death changes a
//                 rule), defence (how a part takes damage), rule (a whole-virus modifier), tell (a move announced
//                 on the timeline; tells.mjs)
//   axis, role    the habit of yours it punishes (AXES), as the primary punishment there or an amplifier
//   beat          'global' (it punishes every direct hit on its cycle) or 'part' (a beat on one part), or none
//   cost, opens   its weight in budget points (1 light to 3 heavy) and the lowest virus level that brings it
//   does, telegraph, answer, implicit   what it does, how you see it coming, what answers it, and the line an
//                 item would carry from it (phase 2: implicits)
//   suits         the bodies and authors that write it (a signature gene of an author in authors.mjs)
//   decode        how the codex decodes it: 'part' (break a part that carries it), 'tell' (read it), 'kills'
//                 (beat two viruses that carry it)
//   carried(p)    true for a part (a built part, or its spec) that carries it
//   parts         a third part's spec, by family (data.mjs FAMILIES pulls them into their pools)
//   mutation      a passive rule a wild virus rolls as its mutation (data.mjs MUTATIONS)
//   bot           how the planner answers it (planner.mjs, tells.mjs): focus, quiet, strip, window, delay, switch
//   lever         a part whose rule makes the default move the wrong one (docs/puzzle-fights.md 3, docs/puzzle-levers.md):
//                 'beat' (the Mimic, the Decoy), 'last' (the Tripwire, the Zip Bomb, the Hotspot), 'first' (the Lockbox,
//                 the Mutex, the C2 Node, the Packer), 'together' (the Mirror and its twin). A wild roll carries one from level 6 (parts.mjs PARTS.lever)
//   counter       the gene ACTUARY brings when this one is beaten often (phase 5)
// New genes (Exfiltrate, SYN Flood, Front End…) join this table with the same shape. Breach nodes roll genomes from
// these (rollGenome, below): their third parts and mutations, from the author's toolkit by the budget (budgetFor).

// icon: its glyph (glyphs.mjs); colour: its chips' colour.
export const AXES = {
  burst: { name: 'Burst', punishes: 'standing in front of big hits', icon: 'damage', colour: '#ff5b3d' },
  attrition: { name: 'Attrition', punishes: 'letting damage build up over time', icon: 'burn', colour: '#ff9f43' },
  feedback: { name: 'Feedback', punishes: 'firing a direct hit at the wrong time', icon: 'mirror', colour: '#b8a6ff' },
  tempo: { name: 'Tempo', punishes: 'leaning on cooldowns and long skills', icon: 'sync', colour: '#6fb6ff' },
  sustain: { name: 'Sustain', punishes: 'slow kills', icon: 'payload', colour: '#7bd389' },
  shell: { name: 'Shell', punishes: 'single big hits on one part', icon: 'shield', colour: '#f1b92f' },
  order: { name: 'Order', punishes: 'killing parts in the wrong order', icon: 'pipeline', colour: '#e07bd0' },
  clock: { name: 'Clock', punishes: 'long fights', icon: 'clock', colour: '#ffd85c' },
  fog: { name: 'Fog', punishes: 'not knowing what is coming', icon: 'stealth', colour: '#9fb0c8' },
  swarm: { name: 'Swarm', punishes: 'ignoring adds', icon: 'spider', colour: '#8fd46b' },
  pierce: { name: 'Pierce', punishes: 'stacking shields, ◆ and heals', icon: 'spike', colour: '#e8908a' }, // not teal: teal is only ever you (docs/style-guide.md)
};
// icon: the glyph a gene you haven't seen shows (??? and its category: so you know it's a part behaviour, say).
export const CATS = {
  attack: { name: 'Attack types', one: 'attack type', icon: 'hit' },
  part: { name: 'Part behaviours', one: 'part behaviour', icon: 'module' },
  defence: { name: 'Defences', one: 'defence', icon: 'reduction' },
  rule: { name: 'Passive rules', one: 'passive rule', icon: 'config' },
  tell: { name: 'Tells', one: 'tell', icon: 'signal' },
};

const A = (x) => x?.attack || null;
export const GENES = {
  // ---------- attack types ----------
  surge: { name: 'Surge', adj: 'Surging', cat: 'attack', axis: 'burst', role: 'primary', cost: 1, opens: 1, decode: 'part', suits: 'Every body',
    does: 'Deals a plain heavy hit every 3 to 5 cycles.', telegraph: 'Its cell on the timeline shows the damage after your Block.', answer: 'Break or delay the part. Block, ◆, shields, Brace, Bulkhead and Throttle soften the hit.',
    implicit: 'Deals more damage to its family\'s parts and takes less from them.', carried: () => false }, // the plain hit: partGenes gives it to a damage part that carries nothing else
  encrypt: { name: 'Encrypt', adj: 'Encrypting', cat: 'attack', axis: 'attrition', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'Encrypts you. Each stack deals damage to you every cycle until the Encryptor breaks. A ◆ on you blocks one Encrypt.', telegraph: 'Its cell on the timeline, then an Encrypted status on you.', answer: 'Break the Encryptor. Purge, Scrub and Rollback clear the encryption.',
    implicit: 'Encryption on you stacks slower.', carried: (p) => A(p)?.effect === 'encrypt', counter: 'badsectors' },
  replicate: { name: 'Replicate', adj: 'Replicating', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Worm, the Crawler, SWARMLINE',
    does: 'Spawns a fragment that deals damage to you every cycle. Holds up to 3 fragments at once.', telegraph: 'Its cell on the timeline, then fragments on the board.', answer: 'Break the Replicator. Fork Bomb, Garbage Collect, Multicast, DMZ and Spike clear fragments.',
    implicit: 'More damage on fragments and adds.', carried: (p) => A(p)?.effect === 'replicate' && !p.overrun, counter: 'c2' },
  scramble: { name: 'Scramble', adj: 'Scrambling', cat: 'attack', axis: 'feedback', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Ghostroot, PALEMASK',
    does: 'Deals damage to you and Scrambles you for 2 cycles. While you are Scrambled, each of your attacks may hit you instead, at half damage. A ◆ on you blocks it.', telegraph: 'Its cell on the timeline, then a Scrambled status on you.', answer: 'Fire quiet commands while Scrambled. Scrub cleanses it.',
    implicit: 'Scrambled hits on you deal less.', carried: (p) => A(p)?.effect === 'scramble', bot: { quiet: 'scrambled' } },
  // The parts plan's P3 families' signatures (docs/parts-plan.md, families.mjs).
  hash: { name: 'Hash', adj: 'Hashing', cat: 'attack', axis: 'clock', role: 'primary', cost: 3, opens: 9, decode: 'part', suits: 'the Cryptominer, GLASSJAW',
    does: 'The Rig\'s Hash lands every 2 cycles, dealing more each time, and the Rig heats up every cycle. At 100 heat it overheats and burns itself until it breaks.', telegraph: 'A heat tag on its row, and its Hash climbing on the timeline.', answer: 'Let it cook while you break the rest, then burst it. A hit across its tick vents it.',
    implicit: 'Hashes on you climb slower.', carried: (p) => !!p.hash, bot: { focus: 'cook' } },
  wipe: { name: 'Wipe', adj: 'Wiping', cat: 'attack', axis: 'tempo', role: 'primary', cost: 3, opens: 19, decode: 'part', suits: 'the Wiper, TOLLGATE',
    does: 'Deals damage to you and takes your strongest ready key off your bar for 3 cycles. Its cooldown stands still. Key 1 and SIGINT are never wiped.', telegraph: 'Its cell on the timeline, then a WIPED key on your bar.', answer: 'Fire your big key before the Wipe lands.',
    implicit: 'Wiped keys come back a cycle sooner.', carried: (p) => !!A(p)?.wipe, bot: { fire: 'strongest' } },
  // Priority 3's floor 2 bodies (docs/content.md 5, families.mjs).
  volley: { name: 'Volley', adj: 'Swarming', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'the Botnet, SWARMLINE',
    does: 'The C&C\'s Volley fires every Zombie at once, so it shrinks as they break. Breaking the C&C scatters the rest and ends the fight, and the kill pays 0.6. Clearing every Zombie first makes it pay 1.5.', telegraph: 'The Zombie count on the C&C, and its Volley on the timeline.', answer: 'Farm the Zombies while your Signal holds, else break the C&C.',
    implicit: 'Volleys on you lose a Zombie\'s share.', carried: (p) => !!p.cnc, bot: { focus: 'cnc' } },
  payload: { name: 'Payload', adj: 'Armed', cat: 'part', axis: 'feedback', role: 'primary', cost: 3, opens: 12, decode: 'part', suits: 'the Logic Bomb, TOLLGATE',
    does: 'Its fuse burns down with hits on it, your commands\' in Contact and every hit in Timed, which winds back up a cycle. Its ticks burn 2 more. At 0 it detonates for 35% of your max Signal, and its loot is gone.', telegraph: 'A fuse tag on its row.', answer: 'Land few big hits in Contact, one a cycle in Timed.',
    implicit: 'Detonations on you deal less.', carried: (p) => !!p.payload },
  // Their levers (lever 'together', 'recover'): neither asks for a kill order.
  twinrig: { name: 'Twin rig', adj: 'Twinned', lever: 'together', cat: 'part', axis: 'order', role: 'primary', cost: 3, opens: 9, decode: 'part', suits: 'the Cryptominer, GLASSJAW', sig: true,
    does: 'A second Rig that shares the Rig\'s heat. When one Rig breaks while the other stands, the other takes its climb on top of its own.', telegraph: 'A heat tether between the two Rigs.', answer: 'Bring both down close together.',
    implicit: 'A twin rig inherits less of the climb.', carried: (p) => !!p.twinrig, bot: { focus: 'pair' },
    parts: { cryptominer: { id: 'twinrig', name: 'Twin Rig', integrity: 18, armor: 1, loot: 'Riser Card', twinrig: true, from: 9, pool: 'third', sig: true, attack: { name: 'Hash', effect: 'damage', amount: 2, interval: 2, first: 3, ramp: 0.5 } } } },
  recyclebin: { name: 'Recycle bin', adj: 'Binned', lever: 'recover', cat: 'part', axis: 'tempo', role: 'amplifier', cost: 2, opens: 19, decode: 'part', suits: 'the Wiper, TOLLGATE', sig: true,
    does: 'Holds the key the Wipe takes. Push it past a tick while it holds one and the key comes back, ready.', telegraph: 'The held key\'s name on its row.', answer: 'After a Wipe, cross one of its ticks.',
    implicit: 'Binned keys come back with a cycle off their cooldown.', carried: (p) => !!p.bin, bot: { focus: 'bin' },
    parts: { wiper: { id: 'recyclebin', name: 'Recycle Bin', integrity: 24, armor: 1, loot: 'Bin Liner', bin: true, from: 19, pool: 'third', sig: true } } },
  floodramp: { name: 'Flood ramp', adj: 'Flooding', cat: 'attack', axis: 'attrition', role: 'primary', cost: 3, opens: 6, decode: 'part', suits: 'Worm, SWARMLINE (the Floodgate)',
    does: 'Attacks every cycle, dealing 1 more damage each time. Any delay resets it.', telegraph: 'A cell on every cycle, its number climbing.', answer: 'Delay it, or break the Flooder. Suspend, Quarantine, Jam, Spoofed ACK and the Stall daemon delay it.',
    implicit: 'Ramping attacks on you grow slower.', carried: (p) => !!A(p)?.ramp && !p.hash && !p.twinrig, bot: { delay: true } },
  siphon: { name: 'Siphon', adj: 'Siphoning', cat: 'attack', axis: 'sustain', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Worm, SWARMLINE (the Leech)',
    does: 'Heals the most damaged part for the damage its hit deals. Removes 1 burn from that part.', telegraph: 'Its cell on the timeline, marked siphon.', answer: 'Shrink its hit with shields, Block or Throttle, or break it. Implant keeps a part from being healed.',
    implicit: 'Heals a virus part gets are smaller.', carried: (p) => !!A(p)?.siphon, counter: 'antivirussweep' },
  mend: { name: 'Mend', adj: 'Mending', cat: 'attack', axis: 'sustain', role: 'primary', cost: 3, opens: 3, decode: 'part', suits: 'Worm, SWARMLINE (the Patchwork)',
    does: 'Heals the most damaged part every 3 cycles.', telegraph: 'Its cell on the timeline, marked heal.', answer: 'Break the mender first, or burst a part between heals. Implant and Cache Poison spoil the heal.',
    implicit: 'Heals a virus part gets are smaller.', carried: (p) => A(p)?.effect === 'heal', counter: 'antivirussweep' },
  deadline: { name: 'Deadline', adj: 'Extorting', cat: 'attack', axis: 'burst', role: 'primary', cost: 2, opens: 6, decode: 'part', suits: 'Ransomware, TOLLGATE (the Extortion)',
    does: 'Winds up a big hit. Dealing enough damage to its part in the 2 cycles before it lands calls it off.', telegraph: 'Its cell shows the threshold and the damage you have dealt.', answer: 'Burst or burn the part during the window.',
    implicit: 'Damage you deal counts more toward wind-up thresholds.', carried: (p) => !!A(p)?.windup },
  escalation: { name: 'Escalation', adj: 'Escalating', cat: 'attack', axis: 'clock', role: 'primary', cost: 2, opens: 1, decode: 'part', suits: 'ICE, Kestrel (the Tracer)',
    does: 'Deals more damage every cycle the fight goes on.', telegraph: 'The number on its cell climbs.', answer: 'Break its part early.',
    implicit: 'Attacks that grow with time grow slower on you.', carried: (p) => !!A(p)?.grow },
  hivebrood: { name: 'Hive brood', adj: 'Brooding', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 11, decode: 'part', suits: 'Worm, SWARMLINE (the Overrun)',
    does: 'Spawns fragments whose bite deals 1 more damage every cycle they live.', telegraph: 'Its cell on the timeline, and each fragment\'s bite on its row.', answer: 'Clear fragments young, or break the Hive.',
    implicit: 'More damage on fragments and adds.', carried: (p) => !!p.overrun },

  // ---------- part behaviours ----------
  ward: { name: 'Ward', adj: 'Warded', lever: 'first', cat: 'part', axis: 'shell', role: 'primary', cost: 2, opens: 3, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'While the ward stands, its partner loses at most 25% of its max Integrity each cycle. The ward holds the damage past the cap, and when it breaks, half of what it holds lands on the partner at once.', telegraph: 'The damage it holds, in your colour, and a ghost on the partner\'s bar of where half of it would leave it.', answer: 'Break the ward the cycle half of what it holds finishes the partner, first if you burst, or chip under the cap. Lockpick, Keyjam, Sudo and Zero-day get through it.',
    implicit: 'Your hits get through a ward\'s cap more.', carried: (p) => !!p.ward, bot: { focus: 'first' }, counter: 'mutexlock',
    parts: { ransomware: { id: 'lockbox', name: 'Lockbox', integrity: 16, armor: 0, loot: 'Lock Pin', ward: 'encryptor', from: 3, pool: 'third', sig: true } } },
  mutexlock: { name: 'Mutex lock', adj: 'Locked', lever: 'first', cat: 'part', axis: 'shell', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'While the Mutex stands, its partner wears a shield of 25% of the partner\'s max Integrity. A broken shield returns 4 cycles later.', telegraph: 'A lock tag on the partner, then a countdown to the relock.', answer: 'Break the Mutex, or burst through one lock. Lockpick, Thermal Throttle and Sudo get through it.',
    implicit: 'Locks take more from you.', carried: (p) => !!p.lock, bot: { focus: 'first' }, counter: 'limiter',
    parts: { ransomware: { id: 'mutex', name: 'Mutex', integrity: 18, armor: 1, loot: 'Mutex Handle', lock: 'encryptor', from: 8, pool: 'third', sig: true } } },
  tripwire: { name: 'Tripwire', adj: 'Wired', lever: 'last', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 16, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'When broken while other parts stand, the others go loud for the rest of the fight, both ways. Loud parts deal 25% more damage and attack 1 cycle sooner, and they take 40% more damage and drop their ◆.', telegraph: 'A tripwire tag. When your move would break it, the others\' attacks at their loud numbers and their ◆ falling.', answer: 'Break it last, or first when you can finish the rest before their attacks add up. Quiet Wire, Logic Bomb and Sudo keep it quiet, and Throttle silences a loud part.',
    implicit: 'Loud parts hit you less.', carried: (p) => !!p.deadman, bot: { focus: 'last' }, counter: 'zipbomb',
    parts: { ransomware: { id: 'tripwire', name: 'Tripwire', integrity: 18, armor: 1, loot: 'Trip Coil', deadman: true, from: 16, pool: 'third', attack: { name: 'Ping', effect: 'damage', amount: 3, interval: 3, first: 3 } } } },
  twin: { name: 'Twin', adj: 'Twinned', lever: 'together', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 3, decode: 'part', suits: 'Worm, SWARMLINE',
    does: 'A twin broken while the other stands reboots 3 cycles later at 40% Integrity. Reboots only once.', telegraph: 'A Reboot chip on the board.', answer: 'Break both close together. Split Brain and Logic Bomb stop the reboot.',
    implicit: 'A twin reboots with less.', carried: (p) => !!p.twin, bot: { focus: 'together' }, counter: 'spare',
    parts: { worm: { id: 'mirror', name: 'Mirror', integrity: 18, armor: 1, loot: 'Mirror Shard', twin: 'replicator', from: 3, pool: 'third', sig: true, attack: { name: 'Splice', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  c2: { name: 'C2 command', adj: 'Commanded', lever: 'first', cat: 'part', axis: 'swarm', role: 'amplifier', cost: 2, opens: 8, decode: 'part', suits: 'Worm, SWARMLINE',
    does: 'Fragments deal 50% more damage while the C2 Node stands. When it breaks, every fragment drops.', telegraph: 'A commands-fragments tag.', answer: 'Break it once fragments are up.',
    implicit: 'More damage on a part that commands others.', carried: (p) => !!p.command, bot: { focus: 'first' },
    parts: { worm: { id: 'c2', name: 'C2 Node', integrity: 18, armor: 1, loot: 'C2 Beacon', command: true, from: 8, pool: 'third', attack: { name: 'Beacon', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  decoymirror: { name: 'Decoy mirror', adj: 'Mirrored', lever: 'beat', cat: 'part', axis: 'feedback', role: 'amplifier', beat: 'global', cost: 2, opens: 4, decode: 'part', suits: 'Ghostroot, PALEMASK',
    does: 'Every 4 cycles, bends your command at one part onto the part it points at, and the pointer moves each beat. Pointing at itself, half of a hit bounces back at you. Hides where it points while it wears ◆.', telegraph: 'A Bend chip in its column, and a dashed red tether to where it points once its ◆ is stripped or it is Tagged.', answer: 'Fire on its beat when it points at a part you want hit, else a shield, a buff or an area command. Mirror Maze and Sudo get through.',
    implicit: 'Bounces and mirrors hit you less.', carried: (p) => !!p.reflect, bot: { quiet: 'beat' }, counter: 'phaseshift',
    parts: { ghostroot: { id: 'decoy', name: 'Decoy', integrity: 18, armor: 1, veiled: true, loot: 'Decoy Shell', reflect: 4, from: 4, pool: 'third' } } },
  mimic: { name: 'Mimic', adj: 'Mimicking', lever: 'beat', cat: 'part', axis: 'feedback', role: 'amplifier', beat: 'global', cost: 3, opens: 8, decode: 'part', suits: 'Ghostroot, NULL CHOIR',
    does: 'Every 4 cycles, copies the command you fire and turns it on you. A hit hits you, a strip strips your ◆, and a burn burns you. A debuff Throttles you, a shield or buff goes to it, and a heal heals the virus. SIGINT or a stun Hangs you.', telegraph: 'Its beat chip is always on the board, and says what your command would copy.', answer: 'On its beat, fire what is cheapest to have copied, or hold, or break it. Reflector, Log Wipe and Sudo also beat it.',
    implicit: 'Playback on you deals less.', carried: (p) => !!p.mimic, bot: { quiet: 'beat' }, counter: 'handshake',
    parts: { ghostroot: { id: 'mimic', name: 'Mimic', integrity: 18, armor: 1, veiled: true, loot: 'Mimic Mask', mimic: true, from: 8, pool: 'third' } } },
  // The parts plan's first wave (docs/parts-plan.md P1): third parts for levels 1 to 12. sig: it refers to the
  // signature part, so a fight without its signature never rolls it (parts.mjs).
  zipbomb: { name: 'Zip bomb', adj: 'Fused', lever: 'last', cat: 'part', axis: 'burst', role: 'primary', cost: 2, opens: 5, floor: 1, decode: 'part', suits: 'Ransomware, Worm, TOLLGATE',
    does: 'When broken, lights a 2-cycle fuse. The blast deals 20% of your max health to you. It also takes 20% of each virus part\'s own max and a ◆ from each. A shield or ◆ absorbs your share. Ending the fight puts the fuse out.', telegraph: 'A fuse chip on its row that counts down 2, 1, and the blast\'s bite as a ghost on every other bar.', answer: 'Break it last, or early when its blast breaks a part and a shield or ◆ is up when the fuse runs out.',
    implicit: 'Fuses on you deal less.', carried: (p) => !!p.fuse, bot: { focus: 'last' },
    parts: { ransomware: { id: 'zipbomb', plan: 1, name: 'Zip Bomb', integrity: 14, armor: 0, loot: 'Fuse Wire', fuse: true, from: 5, pool: 'third' }, worm: { id: 'zipbomb', plan: 1, name: 'Zip Bomb', integrity: 14, armor: 0, loot: 'Fuse Wire', fuse: true, from: 5, pool: 'third' } } },
  hotspot: { name: 'Hotspot', adj: 'Heated', lever: 'last', cat: 'part', axis: 'burst', role: 'amplifier', cost: 1, opens: 6, floor: 1, decode: 'part', suits: 'Ransomware, Ghostroot',
    does: 'When your command hits it, the virus\'s next attack 2 or more cycles away becomes a charge. Burns and helpers do not set it off.', telegraph: 'An amber glow on its row, then a charge chip on the attack it powers up.', answer: 'Hit it with burns and helpers. Command hits are safe when the charge lands on a part you can cut.',
    implicit: 'Charges a hit of yours sets off deal less.', carried: (p) => !!p.hotspot, bot: { quiet: 'part' },
    parts: { ransomware: { id: 'hotspot', plan: 1, name: 'Hotspot', integrity: 14, armor: 0, loot: 'Thermal Pad', hotspot: true, from: 6, pool: 'third' }, ghostroot: { id: 'hotspot', plan: 1, name: 'Hotspot', integrity: 14, armor: 0, loot: 'Thermal Pad', hotspot: true, from: 6, pool: 'third' } } },
  idletimer: { name: 'Idle timer', adj: 'Idling', cat: 'part', axis: 'shell', role: 'amplifier', cost: 2, opens: 9, floor: 2, decode: 'part', suits: 'Ransomware, the Cryptominer', sig: true,
    does: 'Counts the cycles since your commands last hit the signature part. At 5, every part re-arms to full ◆.', telegraph: 'Countdown pips on the signature\'s row, and a chip at 2 left.', answer: 'Hit the signature at least every 4 cycles, or break the timer.',
    implicit: 'Idle timers count one cycle longer.', carried: (p) => !!p.idle, bot: { focus: 'partner' },
    parts: { ransomware: { id: 'idletimer', plan: 1, name: 'Idle Timer', integrity: 20, armor: 1, loot: 'Timer Crystal', idle: 5, from: 9, pool: 'third', sig: true } } },
  frontend: { name: 'Front end', adj: 'Fronted', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 10, floor: 2, decode: 'part', suits: 'Ghostroot, Ransomware, PALEMASK',
    does: 'While it wears ◆, your single-target commands at its partner hit the Front End instead. Burns, helpers and hits on every part are not redirected.', telegraph: 'A tether from its partner that bends your hit onto it.', answer: 'Strip its ◆ first, or hit every part. Burns and helpers reach its partner.',
    implicit: 'Your hits bend onto a front end less.', carried: (p) => !!p.front, bot: { strip: true },
    parts: { ghostroot: { id: 'frontend', plan: 1, name: 'Front End', integrity: 22, armor: 1, veiled: true, loot: 'Proxy Card', front: true, from: 10, pool: 'third' }, ransomware: { id: 'frontend', plan: 1, name: 'Front End', integrity: 22, armor: 1, loot: 'Proxy Card', front: true, from: 10, pool: 'third' } } },
  backlog: { name: 'Backlog', adj: 'Backlogged', cat: 'part', axis: 'tempo', role: 'primary', cost: 2, opens: 12, floor: 2, decode: 'part', suits: 'Worm, the Cryptominer',
    does: 'When its Ack lands, the skill you fired that cycle cools down 2 cycles longer.', telegraph: 'A SYN mark on its cell.', answer: 'On its cycle, fire a skill with no cooldown, or one you can spare.',
    implicit: 'A backlog adds one cycle less to your cooldowns.', carried: (p) => !!p.backlog, bot: { quiet: 'cooldown' },
    parts: { worm: { id: 'backlog', plan: 1, name: 'Backlog', integrity: 20, armor: 1, loot: 'Queue Slab', backlog: 2, from: 12, pool: 'third', attack: { name: 'Ack', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  // The parts plan's second wave (docs/parts-plan.md P2): floors 3 and 4. floor: the floor a native is first met on,
  // and weighted on (parts.mjs PARTS.floor); a third with no floor is no floor's native.
  limiter: { name: 'Limiter', adj: 'Capped', cat: 'defence', axis: 'shell', role: 'primary', cost: 3, opens: 13, floor: 3, decode: 'part', suits: 'Ransomware, the Wiper, TOLLGATE',
    does: 'No single hit takes more than 20% of its max Integrity. Damage past the cap is lost.', telegraph: 'A cap line on its bar and a cap tag with the most one hit can take.', answer: 'Use many small hits. Burns, helpers, Purge\'s ticks, Overvolt\'s two strikes and Shatter\'s shards count.',
    implicit: 'Caps let more of your hits through.', carried: (p) => !!p.limit, bot: { focus: 'last' },
    parts: { ransomware: { id: 'limiter', plan: 2, name: 'Limiter', integrity: 24, armor: 1, loot: 'Clamp Diode', limit: 0.2, from: 13, pool: 'third', attack: { name: 'Ping', effect: 'damage', amount: 3, interval: 3, first: 3 } } } },
  spare: { name: 'Spare', adj: 'Spared', cat: 'part', axis: 'order', role: 'primary', cost: 1, opens: 14, floor: 3, decode: 'part', suits: 'Worm, Ghostroot, SWARMLINE', sig: true,
    does: 'Sleeps under 3 ◆, off the timeline. When the signature part breaks, the Spare boots 2 cycles later with 60% of the signature\'s max Integrity and its attack, and drops its ◆.', telegraph: 'A standby tag on a dim row, then a Boot chip 2 cycles ahead.', answer: 'Pay for its ◆ asleep, or its Integrity once booted.',
    implicit: 'Spares and reboots come back with less Integrity.', carried: (p) => !!p.spare, bot: { focus: 'asleep' },
    parts: { worm: { id: 'spare', plan: 2, name: 'Spare', integrity: 2, armor: 0, loot: 'Standby Board', spare: { in: 2, at: 0.6, armor: 3 }, from: 14, pool: 'third', sig: true }, ghostroot: { id: 'spare', plan: 2, name: 'Spare', integrity: 2, armor: 0, veiled: true, loot: 'Standby Board', spare: { in: 2, at: 0.6, armor: 3 }, from: 14, pool: 'third', sig: true } } },
  scraper: { name: 'Scraper', adj: 'Scraping', cat: 'attack', axis: 'pierce', role: 'primary', cost: 3, opens: 19, floor: 4, decode: 'part', suits: 'Ransomware, the Wiper, TOLLGATE',
    does: 'When its Scrape lands, it removes your shield, your ◆ and your timed buffs, and gains up to 2 ◆ from what it takes.', telegraph: 'A takes-buffs mark on its cell.', answer: 'Buff after it lands, not before. Null Route makes it miss.',
    implicit: 'Scrapes take fewer of your buffs.', carried: (p) => !!p.scrape, bot: { quiet: 'buff' },
    parts: { ransomware: { id: 'scraper', plan: 2, name: 'Scraper', integrity: 22, armor: 1, loot: 'Burr Blade', scrape: 2, from: 19, pool: 'third', attack: { name: 'Scrape', effect: 'damage', amount: 4, interval: 4, first: 3 } } } },
  packer: { name: 'Packer', adj: 'Packed', lever: 'first', cat: 'rule', axis: 'fog', role: 'amplifier', cost: 1, opens: 20, decode: 'part', suits: 'Ghostroot, the Cryptominer, LANTERN',
    does: 'While it stands, each rolled part shows as a Packed part. Its name, tags and rule are hidden, and its attack reads ???. The virus\'s rolled rules show as ???, even ones your Codex knows.', telegraph: 'Packed parts and ??? chips that unpack when it breaks.', answer: 'Scan before you engage, or break the Packer.',
    implicit: 'Packed rules unpack when you scan.', carried: (p) => !!p.packer, bot: { focus: 'first' },
    parts: { ghostroot: { id: 'packer', plan: 2, name: 'Packer', integrity: 20, armor: 1, veiled: true, loot: 'Shrink Wrap', packer: true, from: 20, pool: 'third' } } },
  badblock: { name: 'Bad block', adj: 'Cracked', cat: 'attack', axis: 'pierce', role: 'primary', cost: 3, opens: 21, floor: 4, decode: 'part', suits: 'Ghostroot, the Wiper, GLASSJAW',
    does: 'When its Bad Write lands, your next heals lose up to 10% of your max health. Purge, Scrub, Rollback and Rotate Keys clear it, as they clear Corrupted.', telegraph: 'Cracked cells on your Signal bar.', answer: 'Heal before it lands, clear it, or shield instead of healing.',
    implicit: 'Bad blocks eat less of your heals.', carried: (p) => !!p.badblock, bot: { quiet: 'heal' },
    parts: { ghostroot: { id: 'badblock', plan: 2, name: 'Bad Block', integrity: 22, armor: 1, veiled: true, loot: 'Cracked Platter', badblock: 0.1, from: 21, pool: 'third', attack: { name: 'Bad Write', effect: 'damage', amount: 4, interval: 4, first: 3 } } } },
  damper: { name: 'Damper', adj: 'Damped', cat: 'defence', axis: 'shell', role: 'primary', cost: 1, opens: 23, decode: 'part', suits: 'the Cryptominer, the Wiper, GLASSJAW',
    does: 'While it wears ◆, it is immune to one kind of damage, shown on its tag. The kind is burns, helpers or area hits, and that kind still breaks its ◆.', telegraph: 'The kind it drops, crossed out, on its tag.', answer: 'Strip its ◆ first, then use anything.',
    implicit: 'The kind a damper drops gets through in part.', carried: (p) => !!p.damper, bot: { strip: true },
    parts: { worm: { id: 'damper', plan: 2, name: 'Damper', integrity: 26, armor: 2, loot: 'Damping Coil', damper: true, from: 23, pool: 'third' } } },
  coldstore: { name: 'Cold store', adj: 'Frozen', cat: 'part', axis: 'burst', role: 'primary', cost: 2, opens: 24, floor: 4, decode: 'part', suits: 'Ransomware, the Wiper, TOLLGATE',
    does: 'Starts frozen for 5 cycles, off the timeline and immune to damage. Once it thaws, its Chill deals damage to you every 5 cycles.', telegraph: 'A frosted row with a thaw bar, and a Thaw chip on the cycle it joins.', answer: 'Break the others while it is frozen. Save a shield for its thaw.',
    implicit: 'Frozen parts thaw with less Integrity.', carried: (p) => !!p.frozen, bot: { focus: 'thaw' },
    parts: { ransomware: { id: 'coldstore', plan: 2, name: 'Cold Store', integrity: 30, armor: 1, loot: 'Frost Cell', frozen: 5, from: 24, pool: 'third', attack: { name: 'Chill', effect: 'damage', amount: 10, interval: 5, first: 7 } } } },
  // The mechanics list (docs/mechanics-list.md): twenty components for the designer to play, built lean. Each part's
  // spec carries `mech`, and mechanics.mjs holds its whole rule. sig: its rule reads what the signature does to you (the
  // Encryptor's Encrypt, the Scrambler's Scramble), so it rolls only beside it (parts.mjs).
  exposed: { name: 'Exposed', adj: 'Probing', cat: 'attack', axis: 'burst', role: 'amplifier', cost: 2, opens: 4, decode: 'part', suits: 'Ransomware, Ghostroot (the Last Stand)',
    does: 'When its Probe lands, you are Exposed, and your next incoming hit deals 50% more. Then it clears. A ◆ on you blocks it.', telegraph: 'An Exposed status on you.', answer: 'Take the next hit on a ◆ or a shield.',
    implicit: 'Exposed hits on you deal less.', carried: (p) => p.mech === 'exposed',
    parts: { ransomware: { id: 'prober', plan: 3, name: 'Prober', integrity: 16, armor: 0, loot: 'Probe Tip', mech: 'exposed', from: 4, pool: 'third', attack: { name: 'Probe', effect: 'damage', amount: 3, interval: 3, first: 2 } }, ghostroot: { id: 'prober', plan: 3, name: 'Prober', integrity: 16, armor: 0, veiled: true, loot: 'Probe Tip', mech: 'exposed', from: 4, pool: 'third', attack: { name: 'Probe', effect: 'damage', amount: 3, interval: 3, first: 2 } } } }, // the Ghostroot's: the Last Stand's, to spread
  lag: { name: 'Latency', adj: 'Lagging', cat: 'attack', axis: 'clock', role: 'amplifier', cost: 2, opens: 7, decode: 'part', suits: 'Worm, Ghostroot (the Desync)',
    does: 'When its Jitter lands, you lag for 2 cycles, and your command lands after the virus acts. It lags you only in a solo fight.', telegraph: 'A Lag status on you.', answer: 'Cut and race before it lands.',
    implicit: 'Lag on you runs shorter.', carried: (p) => p.mech === 'lag',
    parts: { worm: { id: 'jitter', plan: 3, name: 'Jitter', integrity: 18, armor: 1, loot: 'Jitter Buffer', mech: 'lag', from: 7, pool: 'third', attack: { name: 'Jitter', effect: 'damage', amount: 3, interval: 4, first: 3 } }, ghostroot: { id: 'jitter', plan: 3, name: 'Jitter', integrity: 18, armor: 1, veiled: true, loot: 'Jitter Buffer', mech: 'lag', from: 7, pool: 'third', attack: { name: 'Jitter', effect: 'damage', amount: 3, interval: 4, first: 3 } } } }, // the Ghostroot's: the Desync's, to spread (parts.mjs PARTS.spread)
  leak: { name: 'Leak', adj: 'Leaking', cat: 'attack', axis: 'feedback', role: 'primary', cost: 2, opens: 9, decode: 'part', suits: 'Ransomware, Worm (the Doomsday)',
    does: 'When its Drip lands, you leak for 3 cycles, and every command you fire costs 3% of your max health. Holding is free.', telegraph: 'A Leak status on you.', answer: 'Hold, or fire only what counts.',
    implicit: 'Leaks cost you less.', carried: (p) => p.mech === 'leak',
    parts: { ransomware: { id: 'leaker', plan: 3, name: 'Leaker', integrity: 18, armor: 1, loot: 'Drip Valve', mech: 'leak', from: 9, pool: 'third', attack: { name: 'Drip', effect: 'damage', amount: 3, interval: 4, first: 3 } }, worm: { id: 'leaker', plan: 3, name: 'Leaker', integrity: 18, armor: 1, loot: 'Drip Valve', mech: 'leak', from: 9, pool: 'third', attack: { name: 'Drip', effect: 'damage', amount: 3, interval: 4, first: 3 } } } }, // the Worm's: the Doomsday's, to spread (parts.mjs PARTS.spread)
  sandboxed: { name: 'Sandboxed', adj: 'Sandboxing', cat: 'attack', axis: 'tempo', role: 'amplifier', cost: 2, opens: 11, decode: 'part', suits: 'Ghostroot',
    does: 'When its Contain lands, you are Sandboxed for 1 cycle, and only quiet commands fire. Strips, burns, helpers, shields and buffs still go, and direct hits don\'t.', telegraph: 'A Sandboxed status on you.', answer: 'Finish what needs a direct hit before it lands.',
    implicit: 'Sandboxes on you run shorter.', carried: (p) => p.mech === 'sandbox',
    parts: { ghostroot: { id: 'sandbox', plan: 3, name: 'Sandbox', integrity: 18, armor: 1, veiled: true, loot: 'Sandbox Shell', mech: 'sandbox', from: 11, pool: 'third', attack: { name: 'Contain', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  stunned: { name: 'Stunned', adj: 'Stunning', cat: 'attack', axis: 'tempo', role: 'primary', cost: 2, opens: 12, decode: 'part', suits: 'Ghostroot',
    does: 'When its Jolt lands, you are Stunned, and your next command doesn\'t fire. A ◆ on you takes the hit and breaks instead.', telegraph: 'A Stunned status on you.', answer: 'Wear a ◆ when it lands.',
    implicit: 'Stuns on you land less often.', carried: (p) => p.mech === 'stunner',
    parts: { ghostroot: { id: 'stunner', plan: 3, name: 'Stunner', integrity: 18, armor: 1, veiled: true, loot: 'Jolt Coil', mech: 'stunner', from: 12, pool: 'third', attack: { name: 'Jolt', effect: 'damage', amount: 3, interval: 5, first: 3 } } } },
  junk: { name: 'Junk process', adj: 'Junking', cat: 'attack', axis: 'tempo', role: 'amplifier', cost: 2, opens: 14, decode: 'part', suits: 'Worm',
    does: 'When its Junk lands, a dead key takes one of your bar\'s keys. Firing that key clears it, and that is your command for the cycle.', telegraph: 'A Junk process status on you, and a dead key on your bar.', answer: 'Clear it when the key matters.',
    implicit: 'Junk clears easier.', carried: (p) => p.mech === 'junk',
    parts: { worm: { id: 'junker', plan: 3, name: 'Junker', integrity: 20, armor: 1, loot: 'Junk Page', mech: 'junk', from: 14, pool: 'third', attack: { name: 'Junk', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  predator: { name: 'Predator', adj: 'Hunting', cat: 'part', axis: 'attrition', role: 'amplifier', cost: 2, opens: 6, decode: 'part', suits: 'Ransomware', sig: true,
    does: 'While you\'re Encrypted or Corrupted, it attacks every cycle instead of every 3.', telegraph: 'A hunting mark on its row, and a cell on every cycle.', answer: 'Cleanse, or break it.',
    implicit: 'A predator\'s hits deal less.', carried: (p) => p.mech === 'predator',
    parts: { ransomware: { id: 'predator', plan: 3, name: 'Predator', integrity: 20, armor: 1, loot: 'Fang Chip', mech: 'predator', from: 6, pool: 'third', sig: true, attack: { name: 'Bite', effect: 'damage', amount: 3, interval: 3, first: 3 } } } },
  opportunist: { name: 'Opportunist', adj: 'Lurking', cat: 'part', axis: 'fog', role: 'amplifier', cost: 2, opens: 8, decode: 'part', suits: 'Ghostroot', sig: true,
    does: 'Asleep, off the timeline, until you carry any debuff. Then it wakes for good and attacks.', telegraph: 'A sleeping mark on its row, then WAKES in the log.', answer: 'Break it while it sleeps, or keep clean.',
    implicit: 'An opportunist\'s first hit deals less.', carried: (p) => p.mech === 'opportunist',
    parts: { ghostroot: { id: 'opportunist', plan: 3, name: 'Opportunist', integrity: 20, armor: 1, veiled: true, loot: 'Lurk Sensor', mech: 'opportunist', from: 8, pool: 'third', sig: true, attack: { name: 'Pounce', effect: 'damage', amount: 4, interval: 3, first: 999 } } } },
  feeder: { name: 'Feeder', adj: 'Feeding', cat: 'part', axis: 'sustain', role: 'primary', cost: 2, opens: 10, decode: 'part', suits: 'Ransomware, Ghostroot', sig: true,
    does: 'At the end of each cycle, heals the most damaged part by 2% of that part\'s max for each debuff you carry.', telegraph: 'A feeding mark on its row, and the heal in the log.', answer: 'Cleanse, or kill faster than it feeds.',
    implicit: 'Feeding heals less.', carried: (p) => p.mech === 'feeder',
    parts: { ransomware: { id: 'feeder', plan: 3, name: 'Feeder', integrity: 20, armor: 1, loot: 'Feed Tube', mech: 'feeder', from: 10, pool: 'third', sig: true }, ghostroot: { id: 'feeder', plan: 3, name: 'Feeder', integrity: 20, armor: 1, veiled: true, loot: 'Feed Tube', mech: 'feeder', from: 10, pool: 'third', sig: true } } },
  punisher: { name: 'Punisher', adj: 'Punishing', cat: 'part', axis: 'burst', role: 'amplifier', cost: 2, opens: 13, decode: 'part', suits: 'Ghostroot',
    does: 'When you\'re Hung or Stunned and lose a command, it gets a free extra attack that cycle.', telegraph: 'A punish mark on its row.', answer: 'Answer the tells and stuns that would hang you.',
    implicit: 'Punishing hits deal less.', carried: (p) => p.mech === 'punisher',
    parts: { ghostroot: { id: 'punisher', plan: 3, name: 'Punisher', integrity: 20, armor: 1, veiled: true, loot: 'Punch Card', mech: 'punisher', feed: 'stunned', from: 13, pool: 'third', attack: { name: 'Punish', effect: 'damage', amount: 4, interval: 4, first: 3 } } } },
  harvester: { name: 'Harvester', adj: 'Reaping', cat: 'attack', axis: 'burst', role: 'amplifier', cost: 2, opens: 15, decode: 'part', suits: 'Ransomware',
    does: 'Its Reap consumes all your Corrupted for an extra hit of 4% of your max for each cycle it had left.', telegraph: 'A reaping mark on its row.', answer: 'Cleanse Corrupted before it lands.',
    implicit: 'Reaped hits deal less.', carried: (p) => p.mech === 'harvester',
    parts: { ransomware: { id: 'harvester', plan: 3, name: 'Harvester', integrity: 20, armor: 1, loot: 'Reaper Blade', mech: 'harvester', feed: 'volatile', from: 15, pool: 'third', attack: { name: 'Reap', effect: 'damage', amount: 3, interval: 4, first: 4 } } } },
  volatile: { name: 'Volatile', adj: 'Volatile', cat: 'attack', axis: 'pierce', role: 'amplifier', cost: 2, opens: 17, decode: 'part', suits: 'Ransomware',
    does: 'When its Unstable lands, you are Corrupted for 2% of your max every cycle for 3 cycles. Cleansing it deals what it had left at once.', telegraph: 'A volatile mark on its row and a Corrupted status on you.', answer: 'Let it run out, or cleanse with a shield up.',
    implicit: 'Volatile bursts deal less.', carried: (p) => p.mech === 'volatile',
    parts: { ransomware: { id: 'volatile', plan: 3, name: 'Volatile', integrity: 20, armor: 1, loot: 'Unstable Cell', mech: 'volatile', from: 17, pool: 'third', attack: { name: 'Unstable', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  amplifier: { name: 'Amplifier', adj: 'Amplified', cat: 'part', axis: 'burst', role: 'amplifier', cost: 2, opens: 5, decode: 'part', suits: 'Worm',
    does: 'Each cycle it boosts the next attack of another part, in turn. That attack deals 50% more.', telegraph: 'A boosts mark naming the part, and the boosted number on its cell.', answer: 'Break the boosted part first, or the Amplifier.',
    implicit: 'Boosted attacks deal less.', carried: (p) => p.mech === 'amplifier',
    parts: { worm: { id: 'amplifier', plan: 3, name: 'Amplifier', integrity: 18, armor: 1, loot: 'Gain Stage', mech: 'amplifier', from: 5, pool: 'third' } } },
  bodyguard: { name: 'Bodyguard', adj: 'Guarded', cat: 'part', axis: 'shell', role: 'primary', cost: 2, opens: 9, decode: 'part', suits: 'Worm',
    does: 'At the end of each cycle, shields the part your command hit for 15% of that part\'s max. The shield takes only your commands.', telegraph: 'A shield on the part you hit.', answer: 'Switch targets, or break the Bodyguard first.',
    implicit: 'Guard shields are smaller.', carried: (p) => p.mech === 'bodyguard', bot: { switch: true },
    parts: { worm: { id: 'bodyguard', plan: 3, name: 'Bodyguard', integrity: 22, armor: 1, loot: 'Guard Plate', mech: 'bodyguard', from: 9, pool: 'third' } } },
  vendetta: { name: 'Vendetta', adj: 'Vengeful', cat: 'part', axis: 'order', role: 'amplifier', cost: 2, opens: 11, decode: 'part', suits: 'Worm',
    does: 'While it stands, each other part you break makes the rest hit 20% harder for the rest of the fight.', telegraph: 'A damage mark on its row that climbs with each break.', answer: 'Break the Vendetta first.',
    implicit: 'Vendetta adds less.', carried: (p) => p.mech === 'vendetta', bot: { focus: 'first' },
    parts: { worm: { id: 'vendetta', plan: 3, name: 'Vendetta', integrity: 20, armor: 1, loot: 'Grudge File', mech: 'vendetta', from: 11, pool: 'third' } } },
  thorns: { name: 'Thorns', adj: 'Thorned', cat: 'part', axis: 'feedback', role: 'amplifier', cost: 2, opens: 7, decode: 'part', suits: 'Worm',
    does: 'Each command that hits it leaves you Corrupted, a stack of 1% of your max a cycle for 3 cycles. Burns and helpers don\'t.', telegraph: 'A thorns mark on its row.', answer: 'Use burns and helpers on it.',
    implicit: 'Thorns corrupt you less.', carried: (p) => p.mech === 'thorns',
    parts: { worm: { id: 'thorns', plan: 3, name: 'Thorns', integrity: 20, armor: 1, loot: 'Thorn Mesh', mech: 'thorns', from: 7, pool: 'third', attack: { name: 'Prick', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  countdown: { name: 'Countdown', adj: 'Counting', cat: 'part', axis: 'clock', role: 'primary', cost: 3, opens: 13, decode: 'part', suits: 'Worm',
    does: 'Counts the commands you fire. At 10, every part attacks at once, and the count starts over. Holding doesn\'t count.', telegraph: 'A counter on its row.', answer: 'Hold to stall it, or break it.',
    implicit: 'Countdowns count longer.', carried: (p) => p.mech === 'countdown', bot: { focus: 'first' },
    parts: { worm: { id: 'countdown', plan: 3, name: 'Countdown', integrity: 22, armor: 1, loot: 'Tick Counter', mech: 'countdown', from: 13, pool: 'third' } } },
  backtrace: { name: 'Backtrace', adj: 'Tracing', cat: 'part', axis: 'swarm', role: 'amplifier', cost: 2, opens: 16, decode: 'part', suits: 'Ransomware, Ghostroot, Worm (the Junkyard)', sig: true,
    does: 'Each cycle, each status you carry adds a stack. At 5 stacks, it calls in a fragment, and the stacks start over.', telegraph: 'A trace counter on its row.', answer: 'Cleanse, or break it.',
    implicit: 'Traces build slower.', carried: (p) => p.mech === 'backtrace',
    parts: { ransomware: { id: 'backtrace', plan: 3, name: 'Backtrace', integrity: 20, armor: 1, loot: 'Trace Log', mech: 'backtrace', from: 16, pool: 'third', sig: true }, ghostroot: { id: 'backtrace', plan: 3, name: 'Backtrace', integrity: 20, armor: 1, veiled: true, loot: 'Trace Log', mech: 'backtrace', from: 16, pool: 'third', sig: true }, worm: { id: 'backtrace', plan: 3, name: 'Backtrace', integrity: 20, armor: 1, loot: 'Trace Log', mech: 'backtrace', from: 16, pool: 'third', sig: true } } }, // the Worm's: the Junkyard's, to spread
  swap: { name: 'Swap', adj: 'Swapping', cat: 'part', axis: 'order', role: 'amplifier', cost: 2, opens: 18, decode: 'part', suits: 'Ghostroot',
    does: 'When its Pass lands, you are Throttled for 2 cycles. While it stands, your next command hit moves your Throttled, Exposed or Corrupted onto the part it hits.', telegraph: 'A Throttled status on you.', answer: 'Pass it onto the part whose attack you want weak.',
    implicit: 'Swapped debuffs stay on the part longer.', carried: (p) => p.mech === 'swap',
    parts: { ghostroot: { id: 'swap', plan: 3, name: 'Swap', integrity: 20, armor: 1, veiled: true, loot: 'Swap File', mech: 'swap', from: 18, pool: 'third', attack: { name: 'Pass', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  turncoat: { name: 'Turncoat', adj: 'Turning', cat: 'part', axis: 'attrition', role: 'primary', cost: 2, opens: 10, decode: 'part', suits: 'Ghostroot',
    does: 'Below half your Signal, it changes stance, and its Turn Scrambles you for 2 cycles.', telegraph: 'Its mark reads scrambles now below half.', answer: 'Heal to stay over half, or break it first.',
    implicit: 'Turned hits on you deal less.', carried: (p) => p.mech === 'turncoat',
    parts: { ghostroot: { id: 'turncoat', plan: 3, name: 'Turncoat', integrity: 20, armor: 1, veiled: true, loot: 'Turn Key', mech: 'turncoat', from: 10, pool: 'third', attack: { name: 'Turn', effect: 'damage', amount: 3, interval: 3, first: 3 } } } },
  keyring: { name: 'Keyring', adj: 'Keyed', cat: 'part', axis: 'shell', role: 'primary', beat: 'part', cost: 2, opens: 1, decode: 'part', suits: 'ICE, Kestrel (the Bouncer)',
    does: 'Re-arms its partner to full ◆ every 4 cycles, up to 3 times. If the partner breaks first, the Keyring takes over its attack.', telegraph: 'A re-arm chip on the board.', answer: 'Break the partner between re-arms. Break the Keyring first when the partner\'s ◆ is too thick.',
    implicit: 'Re-armed ◆ come back one fewer.', carried: (p) => !!p.rearm, bot: { focus: 'partner' } },
  cycletax: { name: 'Cycle tax', adj: 'Taxing', cat: 'part', axis: 'tempo', role: 'primary', cost: 2, opens: 5, decode: 'part', suits: 'Ransomware, GLASSJAW (the Hashrat)',
    does: 'While it stands, your cooldowns tick down only every other cycle. It attacks only when it is the last part left.', telegraph: 'A tax status on you.', answer: 'Break it. Clock Speed and skills with short cooldowns soften the tax.',
    implicit: 'Clock Speed fills faster while you\'re taxed or slowed.', carried: (p) => !!p.tax, counter: 'synflood' },

  // ---------- defences ----------
  veil: { name: 'Veil', adj: 'Veiled', cat: 'defence', axis: 'fog', role: 'primary', cost: 1, opens: 1, decode: 'part', suits: 'Ghostroot, the Sentinel, PALEMASK, NULL CHOIR',
    does: 'Hides its timers while it wears ◆.', telegraph: 'Grey cells and a veiled tag.', answer: 'Strip its ◆ or Tag it. Side Channel, Unmask and the Actuarial Model also reveal its timers.',
    implicit: 'Veiled timers show a cycle or two ahead anyway.', carried: (p) => !!p.veiled, counter: 'dormant' },
  phaseshift: { name: 'Phase shift', adj: 'Phasing', cat: 'defence', axis: 'feedback', role: 'primary', beat: 'part', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, PALEMASK (the Flicker)',
    does: 'Goes out of phase on odd cycles. While it is out of phase, every hit passes through it, and 15% of your command\'s damage comes back to you.', telegraph: 'Its row greys on odd cycles.', answer: 'Hit it on even cycles.',
    implicit: 'Out-of-phase bounces deal less.', carried: (p) => !!p.phase, bot: { even: true } },
  synclock: { name: 'Sync lock', adj: 'Synced', cat: 'defence', axis: 'tempo', role: 'primary', beat: 'part', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, NULL CHOIR (the Keylogger)',
    does: 'Takes damage only from commands fired in a Sync Window. A window opens every cycle while it stands.', telegraph: 'A Sync Window on every cycle bar.', answer: 'Fire in the window. Metronome and Logger Spool reward it.',
    implicit: 'The Sync Window is wider against it.', carried: (p) => !!p.syncOnly, bot: { window: true } },

  // ---------- passive rules ----------
  armored: { name: 'Armored', adj: 'Armored', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 2, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, TOLLGATE',
    does: 'Every part has 1 more ◆.', telegraph: 'An armored tag and the extra ◆.', answer: 'Break ◆ fast with Crack, Rate Limit or Fork. Polymorph and other hits that ignore armor go through.',
    implicit: 'Your strips break one more ◆ on its parts now and then.', counter: 'adaptive' },
  regenerative: { name: 'Regenerative', adj: 'Regenerating', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 1, opens: 4, decode: 'kills', mutation: true, suits: 'Worm, SWARMLINE',
    does: 'A part with no armor patches its ◆ back 1 cycle sooner.', telegraph: 'A regenerative tag and the patch cell.', answer: 'Strip a part only when you can finish it. Sticky Bit, Rowhammer and Bit Rot slow the patch.',
    implicit: 'Its parts patch later.' },
  hasty: { name: 'Hasty', adj: 'Hasty', cat: 'rule', axis: 'clock', role: 'primary', cost: 2, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, SWARMLINE, GLASSJAW',
    does: 'Every attack comes 1 cycle sooner and repeats 1 cycle faster. Its parts have 10% less Integrity.', telegraph: 'A hasty tag.', answer: 'Race it, or delay it.',
    implicit: 'Attacks that came sooner deal less.', counter: 'ransomtimer' },
  adaptive: { name: 'Adaptive', adj: 'Adaptive', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 1, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, NULL CHOIR, ACTUARY',
    does: 'A part your commands hit 3 cycles in a row adapts, gaining 1 ◆ at the end of that cycle.', telegraph: 'An adapting tag shows 1 cycle ahead.', answer: 'Switch targets for a cycle, or finish it on the third hit.',
    implicit: 'Adapting needs one more cycle in a row.', bot: { switch: true } },
  linked: { name: 'Linked', adj: 'Linked', cat: 'rule', axis: 'order', role: 'amplifier', cost: 1, opens: 1, decode: 'kills', suits: 'Every v2 and v3 virus',
    does: 'When a part breaks, a third of its attack damage passes to the next surviving part.', telegraph: 'A rerouted tag shows the added damage.', answer: 'Choose your kill order.',
    implicit: 'Rerouted hits deal less of the extra.' },
  echo: { name: 'Echo', adj: 'Echoing', cat: 'rule', axis: 'attrition', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Ghostroot, PALEMASK (the Echo)',
    does: 'While the Echo stands, every damage attack that gets through to you repeats 1 cycle later at half damage.', telegraph: 'Echo cells on the timeline.', answer: 'Break the Echo. Shields and Block shrink what repeats.',
    implicit: 'Echoes on you deal less.', carried: (p) => !!p.echo },
  dormant: { name: 'Dormant', adj: 'Dormant', cat: 'rule', axis: 'fog', role: 'primary', cost: 2, opens: 10, decode: 'part', suits: 'Ghostroot, PALEMASK (the Sleeper)',
    does: 'Its attacks wait off the timeline until you hit it or cycle 6 begins. On waking, it sounds an Alarm.', telegraph: 'A dormant tag, then WAKES in the log.', answer: 'Open with something big, or set up before it wakes.',
    implicit: 'A dormant virus\'s first attack deals less.', carried: (p) => !!A(p)?.alarm },
  rage: { name: 'Rage', adj: 'Raging', cat: 'rule', axis: 'burst', role: 'amplifier', cost: 2, opens: 9, decode: 'kills', suits: 'Ransomware, TOLLGATE (the Bricker)',
    does: 'Each part deals 30% more damage once it drops below half Integrity.', telegraph: 'The rage shows on its cell.', answer: 'Take each part from healthy to broken in one burst.',
    implicit: 'More damage on a part above half.', carried: (p) => !!p.enrage },
  keystrokedump: { name: 'Keystroke dump', adj: 'Logging', cat: 'rule', axis: 'feedback', role: 'primary', cost: 2, opens: 4, decode: 'part', suits: 'Ghostroot, NULL CHOIR (the Keylogger), LANTERN',
    does: 'Logs every command fired outside a Sync Window. At 3 logs, the Logger\'s Dump lands the next cycle. The Logger also Dumps every 6 cycles.', telegraph: 'The log count on the Logger, and the Dump cell.', answer: 'Fire in the window, or break the Logger.',
    implicit: 'Out-of-sync commands log only every other time.', carried: (p) => !!A(p)?.dump, bot: { window: true } },

  // ---------- tells (tells.mjs): each TELLS entry in data.mjs names its gene ----------
  overcharge: { name: 'Overcharge', adj: 'Overcharged', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 1, opens: 1, decode: 'tell', suits: 'Every body, and every named build\'s own charge',
    does: 'Charges its part\'s next attack to deal much more damage.', telegraph: 'A charge chip on its part\'s row that shows NOW in its window.', answer: 'Cut its part on its cycle. Suspend, Jam, Spoofed ACK and Segfault also answer it, and ◆, shields, Brace and Bulkhead soften it.',
    implicit: 'Charged hits on you deal less.' },
  fulldisk: { name: 'Full Disk', adj: 'Full', cat: 'tell', axis: 'attrition', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Ransomware',
    does: 'Charges its Encrypt with a burst of encryption for 3 cycles.', telegraph: 'A charge chip on the Encryptor.', answer: 'Cut the Encryptor on its cycle. If it lands, Purge, Scrub or Rollback clears the encryption.',
    implicit: 'Encryption on you stacks slower.' },
  massmailer: { name: 'Mass Mailer', adj: 'Mailing', cat: 'tell', axis: 'swarm', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Worm, the Crawler',
    does: 'Charges its Replicate to hatch 2 fragments.', telegraph: 'A charge chip on the Replicator.', answer: 'Cut the Replicator on its cycle, or cast DMZ.',
    implicit: 'More damage on fragments and adds.' },
  possession: { name: 'Possession', adj: 'Possessed', cat: 'tell', axis: 'feedback', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Ghostroot',
    does: 'Charges its Scramble to last 2 cycles longer.', telegraph: 'A charge chip on the Scrambler.', answer: 'Cut the Scrambler on its cycle, or Scrub the Scramble off.',
    implicit: 'Scrambled hits on you deal less.' },
  batteringram: { name: 'Battering Ram', adj: 'Ramming', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'ICE (the Bouncer)',
    does: 'Charges its part\'s attack to deal much more damage. Its part wears ◆, so a cut has to get through them.', telegraph: 'A charge chip that asks for 2 ◆.', answer: 'Cut its part on its cycle, past its ◆.',
    implicit: 'Charged hits on you deal less.' },
  hotfix: { name: 'Hotfix', adj: 'Hotfixed', cat: 'tell', axis: 'sustain', role: 'amplifier', cost: 2, opens: 3, decode: 'tell', suits: 'Worm (the Patchwork and the Leech)',
    does: 'Charges its heal to heal far more.', telegraph: 'A charge chip on the healer.', answer: 'Cut its part on its cycle. Implant and Cache Poison spoil the heal.',
    implicit: 'Heals a virus part gets are smaller.' },
  doubleextortion: { name: 'Double Extortion', adj: 'Extorting', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Ransomware',
    does: 'Compiles a cast that makes every attack deal 35% more damage for 4 cycles.', telegraph: 'A Compiling… cell that shows NOW in its window.', answer: 'Interrupt it with SIGINT, or two hits on its part in its window. Quarantine, Overvolt, Thermal Runaway, Hijack, Reroute, Kill Switch and IRQ Storm also interrupt it.',
    implicit: 'Casts on the virus run shorter.' },
  selfupdate: { name: 'Self-Update', adj: 'Updating', cat: 'tell', axis: 'sustain', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Worm',
    does: 'Compiles a cast that increases every part\'s Integrity by a quarter of what it has left.', telegraph: 'A Compiling… cell.', answer: 'Interrupt it the same way as Double Extortion.',
    implicit: 'Casts on the virus run shorter.' },
  persistence: { name: 'Persistence', adj: 'Persistent', cat: 'tell', axis: 'clock', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Ghostroot, every guard (as Call Home)',
    does: 'Compiles a cast that makes every attack repeat 1 cycle faster for 4 cycles.', telegraph: 'A Compiling… cell.', answer: 'Interrupt it the same way as Double Extortion.',
    implicit: 'Casts on the virus run shorter.' },
  rekey: { name: 'Re-key', adj: 'Re-keyed', cat: 'tell', axis: 'shell', role: 'amplifier', cost: 2, opens: 6, decode: 'tell', suits: 'Elites, bosses and the Sentinel',
    does: 'When the seal lands, each ◆ its part still wears gives 1 ◆ back to every part, never past a part\'s max.', telegraph: 'A Sealing cell that shows the ◆ it will hand out.', answer: 'Strip its part before it lands, as far as it pays. Bit Rot, Cache Poison and Write Blocker also beat it.',
    implicit: 'Seals that land leave more of your ◆ and shield.', bot: { strip: true } },
};
for (const [id, g] of Object.entries(GENES)) { g.id = id; g.beat ||= null; g.bot ||= null; g.lever ||= null; }
// The parts plan's P3 (docs/parts-plan.md): the Cryptominer and the Wiper carry these natives, as their first family
// has them (unveiled). The Damper is theirs alone.
const CARRY = { cryptominer: ['idletimer', 'backlog', 'damper'], wiper: ['limiter', 'scraper', 'badblock', 'damper', 'coldstore'], botnet: ['idletimer', 'backlog', 'spare'], logicbomb: ['idletimer', 'frontend', 'backlog'] };
for (const [fam, ids] of Object.entries(CARRY)) for (const id of ids) { const { veiled, ...spec } = Object.values(GENES[id].parts)[0]; GENES[id].parts[fam] = spec; }
delete GENES.damper.parts.worm;
export const GENE_IDS = Object.keys(GENES);
// The mechanics list's genes (a third-part spec with `mech`): they roll only while PARTS.mech is above 0 (parts.mjs).
export const MECH_GENES = new Set(GENE_IDS.filter((id) => Object.values(GENES[id].parts || {}).some((x) => x.mech)));

// The genes a part carries: what its spec or its flags say, and Surge for a plain damage attacker that carries
// nothing else. Genes that sit on a part beside its attack (Veil, Rage) come with it.
const SHARED = ['veil', 'rage'];
export function partGenes(p) {
  if (!p || p.kind === 'fragment') return [];
  const out = GENE_IDS.filter((id) => GENES[id].carried?.(p));
  const own = out.filter((id) => !SHARED.includes(id)); // a Tripwire's Ping or a Mirror's Splice belongs to its gene
  if (!own.length && A(p)?.effect === 'damage') out.unshift('surge');
  return out;
}

// ---------- the compatibility rules (docs/genome.md 5.3) ----------
// Hard exclusions, on top of the rules (some name genes that phase 3 brings).
export const EXCLUDE = [['synclock', 'clockglitch'], ['twin', 'spare'], ['dormant', 'honeypot']];
export const NO_BOSS = ['ransomtimer'];
// Global beats may cover at most one cycle in this many.
export const BEAT_SPAN = 4;
// Rules 1 and 2 on a genome (gene ids, duplicates allowed: a second Decoy is a second beat), and the hard
// exclusions. Tells don't count toward rule 1 (the designer's decision: the tell system keeps them apart). Burst is
// exempt from rule 1 (the spike cap bounds it). Returns the broken rules as sentences, or [] when it's legal.
export function compatible(genes, { boss = false } = {}) {
  const out = [], list = genes.filter((id) => GENES[id]);
  const axes = {};
  for (const id of list) {
    const g = GENES[id];
    if (g.cat === 'tell' || g.axis === 'burst') continue;
    (axes[g.axis] ||= { primary: 0, amplifier: 0, ids: [] })[g.role]++;
    axes[g.axis].ids.push(g.name);
  }
  for (const [axis, n] of Object.entries(axes)) if (n.primary > 1 || n.amplifier > 1) out.push(`It carries ${n.ids.join(', ')} on ${AXES[axis].name}, where one punishment and one amplifier are allowed.`);
  const beats = list.filter((id) => GENES[id].beat);
  if (beats.length > 1) out.push(`It carries ${beats.length} beats (${beats.map((id) => GENES[id].name).join(', ')}), where one is allowed.`);
  for (const [a, b] of EXCLUDE) if (genes.includes(a) && genes.includes(b)) out.push(`${GENES[a]?.name || a} never rolls with ${GENES[b]?.name || b}.`);
  if (boss) for (const id of NO_BOSS) if (genes.includes(id)) out.push(`${GENES[id]?.name || id} never goes on a boss.`);
  return out;
}

// ---------- clashes (docs/puzzle-levers.md 4, docs/puzzle-fights.md P3) ----------
// An elite carries two levers whose answers pull against each other (parts.mjs rollParts). a, b: a third part's gene,
// or a tell kind ('seal', 'cast': the family's own, tells.mjs plannedTells brings it first). pull and answer: its tag's
// tooltip on the board (view.mjs).
export const CLASHES = [
  { id: 'blastseal', a: 'zipbomb', b: 'seal', name: 'Blast and seal', pull: 'The blast strips a ◆ from every part, and the seal re-arms them by the ◆ left on its part.', answer: 'Break the Zip Bomb a cycle before the seal lands.' },
  { id: 'beatcast', a: 'mimic', b: 'cast', name: 'Beat and cast', pull: 'SIGINT on the beat Hangs you, and the cast can land on the beat.', answer: 'SIGINT the cast a cycle early, cut its part twice, or let it land.' },
  { id: 'loudheld', a: 'tripwire', b: 'ward', name: 'Loud and held', pull: 'The Lockbox drops half of what it held on its partner, and loud parts take 40% more.', answer: 'Trip the wire, then break the Lockbox into its loud partner.' },
  { id: 'beatheld', a: 'mimic', b: 'ward', name: 'Beat and held', pull: 'Big hits fill the Lockbox fastest, and big hits are what the Mimic copies.', answer: 'Fill the Lockbox between beats.' },
  { id: 'bentwire', a: 'decoymirror', b: 'tripwire', name: 'Bent wire', pull: 'On its beat the Decoy can bend your hit onto the Tripwire.', answer: 'Fire on the beat only when you mean to trip it.' },
];

// ---------- the budget (GAME_RULES.md "Rules and authors"), for phase 3's rolled genes ----------
// Points a wild virus spends on rolled genes at a level and grade. The body and its tells are free. Breach nodes roll
// by it (rollGenome); the old game's wild viruses still roll one third part or strain and maybe one mutation (data.mjs).
export const BUDGET = { wild: [[1, 0], [4, 2], [8, 4], [13, 5], [17, 6], [25, 7], [33, 8]], grade: { 2: 1, 3: 2 }, elite: 3, champion: 2 };
export function budgetFor(level, { grade = 1, elite = false, champion = false } = {}) {
  const base = BUDGET.wild.reduce((n, [L, pts]) => (level >= L ? pts : n), 0);
  return base + (BUDGET.grade[grade] || 0) + (elite ? BUDGET.elite : 0) + (champion ? BUDGET.champion : 0);
}

// ---------- the roll (GAME_RULES.md "Side modes"), for breach nodes (breach.mjs) ----------
// How many genes a wild virus rolls at a level (an elite one more), and how many of them may be mutations (rule
// genes): one on a wild virus, two on an elite (the designer's cap). A third part is a gene too, and a body has room
// for one.
export const GENE_COUNT = [[1, 0], [4, 1], [8, 2], [25, 3]];
export const MUTATION_CAP = { wild: 1, elite: 2 };
// Weights by author: a signature gene 3, the rest of its toolkit 1, anything else 0.1 (any author can surprise you).
export const ROLL_WEIGHT = { signature: 3, toolkit: 1, other: 0.1 };
// Roll a genome: gene ids drawn by weight from the genes open at the level that fit the budget, struck when they break
// a compatibility rule (eight tries a draw), until the count or the budget runs out. Rolled genes today are the
// third parts a body can grow (genes.mjs parts) and the mutations (mutation: true): every one is wired in play.
//   rand        the roll's own stream (so it never moves the game's other dice)
//   family      the body: only its third parts can roll; core, its body's genes (for the compatibility rules)
//   signature, toolkit   the author's (authors.mjs)
//   elite       +3 points, one more gene, two mutations; bonus: points on top (Testbed)
//   known       a set of gene ids: roll only these (Sinkhole: genes you've decoded)
//   count, slots, mutations, allow, weigh   a wild virus's parts roll (parts.mjs): that many genes, room for that many
//               third parts, mutations or not, a test each gene must pass ((id, picked) → true), and each gene's weight
export function rollGenome({ rand, level, family, core = [], signature = [], toolkit = [], elite = false, bonus = 0, known = null, count = null, slots = 1, mutations = true, allow = null, weigh = null } = {}) {
  let budget = budgetFor(level, { elite }) + bonus;
  count ??= GENE_COUNT.reduce((n, [L, k]) => (level >= L ? k : n), 0) + (elite && level >= 4 ? 1 : 0);
  const cap = elite ? MUTATION_CAP.elite : MUTATION_CAP.wild;
  const weight = weigh || ((id) => (signature.includes(id) ? ROLL_WEIGHT.signature : toolkit.includes(id) ? ROLL_WEIGHT.toolkit : ROLL_WEIGHT.other));
  let pool = GENE_IDS.filter((id) => { const g = GENES[id]; if (g.opens > level || (known && !known.has(id))) return false; return (mutations && g.mutation) || (g.parts?.[family] && (g.parts[family].from || 1) <= level); });
  const picked = [];
  while (picked.length < count && budget > 0) {
    const fits = pool.filter((id) => GENES[id].cost <= budget && !(GENES[id].parts && picked.filter((x) => GENES[x].parts).length >= slots) && !(GENES[id].mutation && picked.filter((x) => GENES[x].mutation).length >= cap) && (!allow || allow(id, picked)));
    let got = null;
    for (let t = 0; t < 8 && fits.length && !got; t++) {
      const total = fits.reduce((n, id) => n + weight(id), 0);
      let x = rand() * total, id = fits[fits.length - 1];
      for (const f of fits) if ((x -= weight(f)) < 0) { id = f; break; }
      if (compatible([...core, ...picked, id]).length) { fits.splice(fits.indexOf(id), 1); pool = pool.filter((y) => y !== id); } else got = id;
    }
    if (!got) break;
    picked.push(got); budget -= GENES[got].cost; pool = pool.filter((y) => y !== got);
  }
  return picked;
}

// ---------- the sim switch (genesim.mjs) ----------
// The planner answers every gene it has a rule for. A gene in `ignore` it plays as if it weren't there: the
// per-gene version of TELL.bots.answer.
export const GENE_BOTS = { ignore: new Set() };
export const ignores = (id) => GENE_BOTS.ignore.size > 0 && GENE_BOTS.ignore.has(id);
