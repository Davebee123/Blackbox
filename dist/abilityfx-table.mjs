// The ability effects table (abilityfx.mjs plays it): every ability a player can fire → what its effect is made of.
// One row an ability; key 1 (id `spike`) by its class's own word (data.mjs SPIKE: bash, ban, poke, ping); `<id>:tick`
// for a burn's later ticks (`burn:tick` for any burn without one of its own). abilityfx.mjs DELIBERATE lists what is
// left on the plain strike, and why.
//
// What a row says (ms are from when the effect reaches where it plays; the travel from your key or your bar to it
// comes first and is the engine's, by distance):
//   label   what the playtest page calls it
//   on      'part' (default: the part's name cell) | 'you' (your own bar: heals, shields, buffs)
//   at      'chip': on the part's attack chip in the timeline (interrupts, delays, a seized attack), else its name cell
//   motion  how the piece moves (abilityfx.mjs MOTIONS)
//             travels: swing (a hammer) · punch (a ram) · dart (a needle) · wave (echoes) · bolt (a jagged line) ·
//                      walk (a helper; count: how many) · fly (any piece: spin, turn along its path, through) ·
//                      all (a copy to every part)
//             where it plays (a streak from your key or bar takes it there first): none (particles only) · blast
//                      (frames) · mark (a sign on the part: drop, spin, collapse) · slash (a cut across) · clamp (two
//                      halves closing in) · stamp (a sign on your bar) · shell (brackets closing round your bar) ·
//                      sweep (a piece running along your bar; reverse) · wall (bricks on your bar)
//   art     the piece: lines of ASCII; frames: several in turn every fms ms (loop: over and over)
//   size    its font size (px)
//   land    ms after it arrives that it lands (its number shows then); dur: ms after it arrives that it is gone
//   tone    'steel': all of it in steel (armor: ◆ breaking, a ◆ of yours)
//   chars   flame and rise characters (default 1s and 0s; Purge's *, Thermal Runaway's ^ and ~)
//   burst   what flies where it lands: { style (abilityfx.mjs PARTICLES), n, per (more per the hit's share of the
//           part's max), full (bold only), steel (in steel) }
// Teal: you. A crit goes gold-white, a hit on ◆ throws steel, a crewmate's violet. Keep it monospace ASCII (box
// drawing and ◆ ◇ are fine), 10–22 px.

const b = (style, n, per = 0, more = {}) => ({ style, n, per, ...more });

// ---------- the pieces ----------
export const ART = {
  hammer: [' ___', '|###|', '|###|==========o', '|___|'],
  ram: [' ┌──────┐', '<┤██████├═══', ' └──────┘'],
  needle: ['──────────>'],
  bolt: ['──>'],
  ping: [')))'],
  echo: ['((('],
  bot: [['[o_o]', "/' '\\"], ['[o_o]', ' | | ']],
  bot1: [['[o]', '/ \\'], ['[o]', '| |']],
  clockbot: [['  @  ', '[o_o]', "/' '\\"], ['  @  ', '[o_o]', ' | | ']],
  blast: [['       ', '   *   ', '       '], [' \\ | / ', '-- # --', ' / | \\ '], [' .  :  . ', '-- ### --', " '  :  ' "]],
  morph: [['o'], ['O'], ['0'], ['@']],
  wave: [' .~~~. ', '~~~~~~~'],
  crosshair: ['  |  ', '-( )-', '  |  '],
  stack: ['[=]', '[=]', '[=]'],
  hook: [' |', ' |', '_J'],
  pot: ['(\\_/)'],
  heartbeat: ['__/\\_'],
};

// ---------- the table ----------
export const RECIPES = {
  // ----- everyone -----
  spike: { label: 'Spike', motion: 'dart', art: ['───>'], size: 12, land: 0, dur: 380, burst: [b('spark', 4, 3)] },
  sigint: { label: 'SIGINT', at: 'chip', motion: 'slash', art: ['^C'], size: 14, land: 90, dur: 560, burst: [b('spark', 5, 0)] },
  'burn:tick': { label: 'A burn ticks', motion: 'none', size: 11, land: 0, dur: 380, burst: [b('flame', 6, 6), b('ember', 2, 2)] },

  // ----- Breaker -----
  bash: { label: 'Bash', motion: 'punch', art: ART.ram, size: 13, land: 110, dur: 540, burst: [b('shock', 8, 8), b('bits', 7, 10)] },
  overload: { label: 'Overload', motion: 'bolt', size: 15, land: 0, dur: 600, burst: [b('bits', 14, 18), b('shock', 8, 8), b('flash', 1, 0, { full: true })] },
  flood: { label: 'Flood', motion: 'fly', art: ART.wave, size: 13, land: 0, dur: 520, burst: [b('splash', 12, 10), b('shock', 6, 6)] },
  exploit: { label: 'Exploit', motion: 'mark', art: ART.crosshair, size: 13, land: 80, dur: 620, burst: [b('spark', 3, 2)] },
  crack: { label: 'Crack', motion: 'mark', art: ['<◆>'], tone: 'steel', size: 16, land: 120, dur: 520, burst: [b('shards', 12, 0, { steel: true })] },
  shatter: { label: 'Shatter', motion: 'fly', art: ['◇'], spin: 540, size: 18, land: 0, dur: 520, burst: [b('shards', 16, 10), b('shock', 6, 6)] },
  segfault: { label: 'Segfault', motion: 'fly', art: ['0x0'], size: 13, land: 0, dur: 560, burst: [b('glitch', 12, 8), b('bits', 6, 8)] },
  'fork-bomb': { label: 'Fork Bomb', motion: 'all', art: [':|:'], size: 12, land: 0, dur: 520, burst: [b('shards', 5, 0, { steel: true }), b('spark', 2, 0)] },
  'thermal-runaway': { label: 'Thermal Runaway', motion: 'none', chars: '^~', grow: true, size: 13, land: 0, dur: 760, burst: [b('flame', 46, 0), b('ember', 6, 0)] },
  brace: { label: 'Brace', on: 'you', motion: 'shell', art: ['{', '}'], size: 20, land: 120, dur: 640, burst: [b('spark', 4, 0)] },
  sudo: { label: 'Sudo', on: 'you', motion: 'sweep', art: ['# sudo'], size: 12, land: 0, dur: 600, burst: [b('dust', 6, 0)] },
  'zero-day': { label: 'Zero-day', motion: 'fly', art: ['<0>'], spin: 360, size: 18, land: 0, dur: 640, burst: [b('flash', 1, 0), b('bits', 20, 16), b('shock', 10, 8), b('ring', 3, 0)] },
  // Demolitionist
  backfire: { label: 'Backfire', motion: 'fly', art: ['(*)'], size: 14, land: 0, dur: 560, burst: [b('flash', 1, 0, { full: true }), b('bits', 14, 12), b('shock', 6, 6)] },
  'bit-rot': { label: 'Bit Rot', motion: 'mark', art: ['%#%'], size: 14, land: 80, dur: 640, burst: [b('glitch', 12, 0), b('drip', 6, 0)] },
  'chain-reaction': { label: 'Chain Reaction', motion: 'fly', art: ['o-o-o'], turn: true, size: 12, land: 0, dur: 560, burst: [b('bits', 12, 14), b('ring', 2, 0)] },
  'debris-field': { label: 'Debris Field', on: 'you', motion: 'stamp', art: ['.:◇:.'], size: 14, land: 80, dur: 620, burst: [b('shards', 8, 0)] },
  'logic-bomb': { label: 'Logic Bomb', motion: 'fly', art: ['{!}'], size: 14, land: 160, dur: 640, burst: [b('flash', 1, 0), b('bits', 18, 14), b('shock', 10, 6)] },
  'rm-rf': { label: 'rm -rf', on: 'you', motion: 'sweep', art: ['rm -rf'], size: 12, land: 0, dur: 600, burst: [b('dust', 8, 0)] },
  'shaped-charge': { label: 'Shaped Charge', motion: 'mark', art: ['[==]'], size: 14, land: 160, dur: 600, burst: [b('flash', 1, 0), b('shards', 14, 0, { steel: true }), b('shock', 8, 0)] },
  // Overclocker
  'fault-injection': { label: 'Fault Injection', motion: 'dart', art: ['──x──>'], size: 12, land: 0, dur: 520, burst: [b('glitch', 8, 6), b('spark', 3, 0)] },
  'hot-loop': { label: 'Hot Loop', motion: 'fly', art: ['@'], spin: 720, size: 18, land: 0, dur: 520, burst: [b('ring', 2, 0), b('spark', 5, 4)] },
  overvolt: { label: 'Overvolt', motion: 'bolt', twice: true, size: 14, land: 0, dur: 640, burst: [b('bits', 10, 12), b('shock', 6, 6)] },
  'stack-smash': { label: 'Stack Smash', motion: 'fly', art: ART.stack, size: 11, land: 0, dur: 560, burst: [b('bits', 12, 12), b('shock', 8, 6)] },
  'thermal-throttle': { label: 'Thermal Throttle', motion: 'fly', art: ['>~>'], turn: true, size: 14, land: 0, dur: 600, chars: '~^', burst: [b('flame', 14, 10), b('shock', 4, 4)] },
  'turbo-boost': { label: 'Turbo Boost', on: 'you', motion: 'sweep', art: ['>>>>'], size: 13, land: 0, dur: 520, burst: [b('spark', 6, 0)] },
  vent: { label: 'Vent', on: 'you', motion: 'none', chars: '~', size: 12, land: 0, dur: 640, burst: [b('rise', 16, 0)] },

  // ----- Bastion -----
  ban: { label: 'Ban', motion: 'swing', art: ART.hammer, size: 12, land: 120, dur: 520, burst: [b('shock', 10, 8), b('dust', 5, 4), b('flash', 1, 0, { full: true })] },
  'rate-limit': { label: 'Rate Limit', motion: 'clamp', art: ['>|', '|<'], size: 16, land: 120, dur: 560, burst: [b('shock', 8, 8), b('spark', 3, 0)] },
  firewall: { label: 'Firewall', on: 'you', motion: 'wall', size: 11, land: 0, dur: 820, burst: [b('flame', 30, 0)] },
  retaliate: { label: 'Retaliate', motion: 'fly', art: ['<=='], turn: true, size: 14, land: 0, dur: 520, burst: [b('shock', 10, 8), b('bits', 8, 10)] },
  suspend: { label: 'Suspend', at: 'chip', motion: 'mark', art: ['||'], size: 16, land: 80, dur: 620, burst: [b('spark', 3, 0)] },
  patch: { label: 'Patch', on: 'you', motion: 'stamp', art: ['[+]'], size: 15, land: 80, dur: 620, burst: [b('rise', 10, 0, { chars: '+' })] },
  throttle: { label: 'Throttle', at: 'chip', motion: 'mark', art: ['=[X]='], size: 13, land: 100, dur: 620, burst: [b('spark', 4, 0)] },
  purge: { label: 'Purge', motion: 'none', chars: '*+', size: 13, land: 0, dur: 760, burst: [b('flame', 40, 0), b('ember', 6, 0), b('siphon', 5, 0)] },
  harden: { label: 'Harden', on: 'you', motion: 'stamp', art: ['◆'], tone: 'steel', size: 20, land: 80, dur: 620, burst: [b('shards', 6, 0, { steel: true })] },
  reclaim: { label: 'Reclaim', motion: 'fly', art: ['<+>'], size: 14, land: 0, dur: 640, burst: [b('bits', 8, 10), b('siphon', 8, 6)] },
  quarantine: { label: 'Quarantine', motion: 'clamp', art: ['[', ']'], wide: true, size: 22, land: 140, dur: 640, burst: [b('spark', 4, 0)] },
  failover: { label: 'Failover', motion: 'all', art: ['<<'], size: 13, land: 0, dur: 520, burst: [b('shock', 4, 4), b('spark', 2, 0)] },
  // Warden
  reject: { label: 'Reject', motion: 'fly', art: ['[X]'], size: 13, land: 0, dur: 520, burst: [b('shock', 10, 6), b('spark', 3, 0)] },
  blowback: { label: 'Blowback', motion: 'fly', art: ['<~~'], turn: true, size: 14, land: 0, dur: 560, burst: [b('shock', 10, 10), b('bits', 10, 12)] },
  bulkhead: { label: 'Bulkhead', on: 'you', motion: 'shell', art: ['[|', '|]'], size: 18, land: 120, dur: 640, burst: [b('spark', 4, 0)] },
  'circuit-breaker': { label: 'Circuit Breaker', on: 'you', motion: 'stamp', art: ['-/ -'], size: 15, land: 80, dur: 620, burst: [b('spark', 6, 0)] },
  dmz: { label: 'DMZ', on: 'you', motion: 'shell', art: ['|:', ':|'], size: 18, land: 120, dur: 640, burst: [b('dust', 4, 0)] },
  honeypot: { label: 'Honeypot', on: 'you', motion: 'stamp', art: ART.pot, size: 14, land: 80, dur: 620, burst: [b('dust', 6, 0)] },
  // Sysop
  checksum: { label: 'Checksum', motion: 'fly', art: ['[ok]'], size: 12, land: 0, dur: 600, burst: [b('spark', 4, 4), b('siphon', 4, 0)] },
  heartbeat: { label: 'Heartbeat', on: 'you', motion: 'sweep', art: ART.heartbeat, size: 14, land: 0, dur: 620, burst: [b('rise', 6, 0, { chars: '+' })] },
  'hot-standby': { label: 'Hot Standby', on: 'you', motion: 'stamp', art: ['[1]'], size: 15, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  'maintenance-window': { label: 'Maintenance Window', on: 'you', motion: 'stamp', art: ['|=|'], size: 15, land: 80, dur: 620, burst: [b('rise', 6, 0, { chars: '+' })] },
  multicast: { label: 'Multicast', motion: 'all', art: ['+'], size: 15, land: 0, dur: 560, burst: [b('rise', 10, 0, { chars: '+' }), b('spark', 2, 0)] },
  rebalance: { label: 'Rebalance', on: 'you', motion: 'sweep', art: ['= ='], size: 14, land: 0, dur: 600, burst: [b('rise', 6, 0, { chars: '+' })] },
  revoke: { label: 'Revoke', motion: 'fly', art: ['-X-'], size: 14, land: 0, dur: 560, burst: [b('shock', 6, 6), b('drip', 5, 0)] },
  rollback: { label: 'Rollback', on: 'you', motion: 'sweep', art: ['<<'], reverse: true, size: 15, land: 0, dur: 600, burst: [b('rise', 6, 0, { chars: '+' })] },
  scrub: { label: 'Scrub', on: 'you', motion: 'sweep', art: ['~~~'], size: 14, land: 0, dur: 600, burst: [b('rise', 8, 0, { chars: '+' })] },

  // ----- Infiltrator -----
  poke: { label: 'Poke', motion: 'dart', art: ART.needle, size: 12, land: 0, dur: 420, burst: [b('spark', 4, 3), b('shock', 3, 2, { full: true })] },
  inject: { label: 'Inject', motion: 'none', size: 14, land: 0, dur: 760, burst: [b('flame', 56, 0), b('ember', 10, 0)] },
  'inject:tick': { label: 'Inject tick', motion: 'none', size: 11, land: 0, dur: 420, burst: [b('flame', 7, 6), b('ember', 2, 2)] },
  tag: { label: 'Tag', motion: 'mark', art: ['[#]'], drop: true, size: 14, land: 80, dur: 620, burst: [b('spark', 3, 0)] },
  // The id is the game's; what it does: a hit that goes straight through ◆.
  backdoor: { label: 'Backdoor', motion: 'dart', art: ['===>'], through: true, size: 13, land: 0, dur: 460, burst: [b('spark', 5, 4), b('shock', 4, 4)] },
  detonate: { label: 'Detonate', motion: 'blast', frames: ART.blast, fms: 100, size: 15, land: 0, dur: 700, burst: [b('bits', 18, 22), b('shock', 10, 8), b('flame', 12, 0, { full: true })] },
  keepalive: { label: 'Keepalive', motion: 'mark', art: ['(+)'], size: 14, land: 80, dur: 640, burst: [b('ring', 2, 0), b('ember', 6, 0)] },
  opening: { label: 'Opening', motion: 'dart', art: ['──────>>'], size: 14, land: 0, dur: 520, burst: [b('shock', 8, 8), b('bits', 10, 12)] },
  propagate: { label: 'Propagate', motion: 'all', art: ['~'], size: 14, land: 0, dur: 620, burst: [b('flame', 10, 0)] },
  'null-route': { label: 'Null Route', on: 'you', motion: 'stamp', art: ['(/)'], size: 16, land: 80, dur: 620, burst: [b('dust', 6, 0)] },
  implant: { label: 'Rootkit Implant', motion: 'mark', art: ['[:]'], size: 13, land: 80, dur: 700, burst: [b('ember', 8, 0), b('flame', 14, 0)] },
  // Payload
  fuzz: { label: 'Fuzz', motion: 'fly', art: ['?!?'], size: 13, land: 0, dur: 620, burst: [b('glitch', 10, 6), b('flame', 12, 0)] },
  'irq-storm': { label: 'IRQ Storm', motion: 'all', art: ['!'], size: 16, land: 0, dur: 520, burst: [b('spark', 4, 0), b('flame', 4, 0)] },
  'logic-trap': { label: 'Logic Trap', on: 'you', motion: 'stamp', art: ['[?]'], size: 15, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  outbreak: { label: 'Outbreak', motion: 'all', art: ['*'], size: 15, land: 0, dur: 640, burst: [b('flame', 10, 0)] },
  polymorph: { label: 'Polymorph', motion: 'fly', frames: ART.morph, fms: 70, loop: true, size: 17, land: 0, dur: 620, burst: [b('flame', 18, 0), b('spark', 3, 0)] },
  skim: { label: 'Skim', motion: 'none', chars: '10', size: 12, land: 0, dur: 700, burst: [b('flame', 26, 0), b('siphon', 7, 0)] },
  thrash: { label: 'Thrash', motion: 'mark', art: ['@@'], spin: 360, size: 15, land: 80, dur: 620, burst: [b('flame', 12, 0), b('spark', 3, 0)] },
  wormable: { label: 'Wormable', motion: 'fly', art: ['~~o'], turn: true, size: 14, land: 0, dur: 640, burst: [b('flame', 20, 0)] },
  // Phantom
  backstab: { label: 'Backstab', motion: 'fly', art: ['-|==>'], turn: true, size: 14, land: 0, dur: 520, burst: [b('spark', 5, 4), b('bits', 8, 10)] },
  fingerprint: { label: 'Fingerprint', motion: 'mark', art: ['(@)'], size: 15, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  'log-wipe': { label: 'Log Wipe', on: 'you', motion: 'sweep', art: ['####'], reverse: true, size: 13, land: 0, dur: 600, burst: [b('dust', 8, 0)] },
  'rotate-keys': { label: 'Rotate Keys', on: 'you', motion: 'stamp', art: ['<->'], spin: 180, size: 16, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  'shadow-copy': { label: 'Shadow Copy', on: 'you', motion: 'stamp', art: ['[o][o]'], size: 13, land: 80, dur: 620, burst: [b('dust', 6, 0)] },
  'side-channel': { label: 'Side Channel', motion: 'dart', art: ['·········>'], size: 12, land: 0, dur: 460, burst: [b('spark', 4, 3)] },
  unmask: { label: 'Unmask', motion: 'mark', art: ['{o.o}'], size: 14, land: 80, dur: 620, burst: [b('spark', 4, 0), b('bits', 6, 8)] },
  vanish: { label: 'Vanish', on: 'you', motion: 'stamp', art: ['. . .'], size: 15, land: 80, dur: 620, burst: [b('dust', 10, 0)] },

  // ----- Operator -----
  ping: { label: 'Ping', motion: 'wave', art: ART.ping, size: 18, land: 0, dur: 460, burst: [b('ring', 3, 1), b('shock', 4, 4, { full: true })] },
  deploy: { label: 'Deploy', motion: 'walk', frames: ART.bot, fms: 110, loop: true, size: 13, land: 0, dur: 520, burst: [b('spark', 4, 0)] },
  hook: { label: 'Hook', motion: 'mark', art: ART.hook, drop: true, size: 13, land: 90, dur: 620, burst: [b('spark', 4, 0)] },
  spawn: { label: 'Spawn', motion: 'walk', frames: ART.bot1, fms: 100, loop: true, size: 12, land: 0, dur: 500, burst: [b('spark', 3, 0)] },
  botnet: { label: 'Botnet', motion: 'walk', frames: ART.bot1, count: 3, fms: 100, loop: true, size: 12, land: 0, dur: 520, burst: [b('spark', 5, 0)] },
  jam: { label: 'Jam', at: 'chip', motion: 'mark', art: ['###'], size: 14, land: 80, dur: 620, burst: [b('glitch', 8, 0)] },
  'kill-switch': { label: 'Kill Switch', motion: 'all', art: ['[!]'], size: 13, land: 0, dur: 560, burst: [b('bits', 6, 6), b('flash', 1, 0, { full: true })] },
  'garbage-collect': { label: 'Garbage Collect', motion: 'all', art: ['[x]'], size: 13, land: 0, dur: 540, burst: [b('dust', 4, 0), b('spark', 2, 0)] },
  fork: { label: 'Fork', on: 'you', motion: 'stamp', art: ['-<'], size: 18, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  barrier: { label: 'Barrier', on: 'you', motion: 'shell', art: ['[=', '=]'], size: 16, land: 120, dur: 640, burst: [b('spark', 4, 0)] },
  reroute: { label: 'Reroute', motion: 'walk', frames: ART.bot1, count: 2, fms: 100, loop: true, size: 12, land: 0, dur: 500, burst: [b('spark', 4, 0)] },
  'cron-storm': { label: 'Cron Storm', motion: 'all', art: ['@'], spin: 360, size: 15, land: 0, dur: 560, burst: [b('bits', 6, 6), b('spark', 2, 0)] },
  // Herder
  crontab: { label: 'Crontab', motion: 'walk', frames: ART.clockbot, fms: 110, loop: true, size: 12, land: 0, dur: 560, burst: [b('ring', 2, 0)] },
  'fan-out': { label: 'Fan-out', motion: 'all', art: ['[o]'], size: 12, land: 0, dur: 560, burst: [b('spark', 2, 0)] },
  'load-shed': { label: 'Load Shed', on: 'you', motion: 'shell', art: ['[o', 'o]'], size: 15, land: 120, dur: 640, burst: [b('spark', 4, 0)] },
  malloc: { label: 'Malloc', on: 'you', motion: 'stamp', art: ['[++]'], size: 15, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  mesh: { label: 'Mesh', motion: 'all', art: ['-+-'], size: 13, land: 0, dur: 560, burst: [b('ring', 1, 0), b('spark', 2, 0)] },
  nohup: { label: 'nohup', motion: 'fly', art: ['&'], spin: 360, size: 17, land: 0, dur: 560, burst: [b('bits', 8, 10), b('spark', 3, 0)] },
  'oom-kill': { label: 'OOM Kill', on: 'you', motion: 'none', chars: '+x', size: 12, land: 0, dur: 640, burst: [b('rise', 14, 0)] },
  // Hijacker
  blackhole: { label: 'Blackhole', at: 'chip', motion: 'mark', art: ['(O)'], collapse: true, size: 18, land: 80, dur: 620, burst: [b('dust', 6, 0)] },
  'cache-poison': { label: 'Cache Poison', motion: 'fly', art: ['x_x'], size: 13, land: 0, dur: 620, burst: [b('drip', 8, 0), b('spark', 3, 2)] },
  'echo-cancel': { label: 'Echo Cancel', motion: 'wave', art: ART.echo, size: 17, land: 0, dur: 460, burst: [b('ring', 2, 0), b('shock', 4, 4)] },
  hijack: { label: 'Hijack', at: 'chip', motion: 'clamp', art: ['>[', ']<'], size: 15, land: 120, dur: 620, burst: [b('spark', 4, 0)] },
  replay: { label: 'Replay', motion: 'fly', art: ['|>>'], turn: true, size: 14, land: 0, dur: 560, burst: [b('ring', 2, 0), b('shock', 6, 8)] },
  sniff: { label: 'Sniff', motion: 'dart', art: ['· · · ·>'], size: 12, land: 0, dur: 520, burst: [b('spark', 4, 3), b('dust', 3, 0)] },
  'spoofed-ack': { label: 'Spoofed ACK', at: 'chip', motion: 'mark', art: ['ACK'], size: 13, land: 80, dur: 620, burst: [b('spark', 4, 0)] },
  takeover: { label: 'Takeover', at: 'chip', motion: 'mark', art: ['<@>'], spin: 360, size: 15, land: 80, dur: 640, burst: [b('spark', 4, 0), b('ring', 1, 0)] },
};
