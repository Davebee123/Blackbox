// Boot sequences: the lines the screen shows after the power-up (poweron.mjs), as data. shell.mjs plays them; the
// player picks one on System → Terminal (terminal.mjs). Pure functions of state: no DOM, no clock, no dice (stock's
// line pace is shell.mjs's, as it always was).
//
// bootScript(s, id) → { id, cls, fc?, steps: [step], hold } where a step is
//   { t, c?, ms? }          a line (c: b bright, h threat, y you, m a faction's mark), then ms before the next
//                           (none: stock's own pace, 70–160 ms, 260 after a threat line)
//   { art: [rows], c: 'm' } the faction's mark, rows of ASCII in its colour (fc)
//   { t, garble, ms }       shown garbled first, then the line itself once, before the next (still: the line only)
//   { t, count, unit, ms }  a number that counts up to count (still: the number)
//   { t, same: true }       written into the line above instead of a new one
// hold: how long the last line stays before the screen opens. Every look is as long as stock's or shorter.
import { FACTIONS } from './factions.mjs';

const dots = (label, value, ok = 'ok') => `${label} ${'.'.repeat(Math.max(2, 26 - label.length))} ${value}${ok ? `  [ ${ok} ]` : ''}`;
const who = (s) => s.profile?.handle || 'rookie';
const crit = (s) => s.server.integrity / s.server.max <= 0.25;
// What's waiting for you (a run to resume, an intrusion): every look but Minimal says it, as stock does.
function waiting(s) {
  const out = [];
  if (s.run) out.push({ t: `resuming session: ssh ${who(s)}@${s.run.loc}`, c: 'y' });
  if (s.encounter?.phase === 'alert') out.push({ t: `!! intrusion at the gate: ${s.encounter.virus.name}`, c: 'h' });
  else if (s.encounter?.phase === 'active') out.push({ t: `!! live intrusion: ${s.encounter.virus.name}, cycle ${s.encounter.cycle}`, c: 'h' });
  return out;
}
const login = (s) => [{ t: '' }, { t: `login: ${who(s)}`, c: 'y' }, { t: `password: ${'•'.repeat(s.profile?.pwLen || 8)}` }];

// Stock: your server read back to you (today's boot, line for line).
function stock(s) {
  const cls = s.loadout?.archetype || 'breaker';
  const lvl = s.hackers?.[cls]?.level || 1;
  const lines = [
    { t: 'BLACKBOX/OS 0.9.4 · tty1', c: 'b' },
    { t: dots('memory check', '640K') },
    { t: dots('credits', `${s.server.credits}`, 'ok') },
    { t: dots('integrity', `${s.server.integrity}/${s.server.max}`, crit(s) ? 'crit' : 'ok'), c: crit(s) ? 'h' : '' },
    { t: dots(`loading kit: ${cls}`, `lv ${lvl}`) },
    { t: dots('origins traced', String(s.locations?.length || 0), '') },
    { t: dots('programs', `${(s.locations || []).reduce((n, l) => n + Object.keys(l.floorplan?.programs || {}).length, 0)} running`, 'ok') },
  ];
  lines.push(...waiting(s), ...login(s), { t: `last login: ${new Date().toDateString()} from 127.0.0.1` });
  return { steps: lines, hold: 380 };
}

// POST: a BIOS splash. The memory counts up, the devices answer, then the login.
function bios(s) {
  const dev = (id, what, ok = 'OK') => `${id}  ${what} ${'.'.repeat(Math.max(2, 30 - what.length))} [ ${ok} ]`;
  const slotted = (s.daemons || []).filter((id) => (s.daemonLv?.[id] || 0) > 0).length;
  return {
    steps: [
      { t: 'Model 7 BIOS 4.07 · BLACKBOX/OS 0.9.4', c: 'b', ms: 120 },
      { t: 'Memory test: ', count: 640, unit: 'K OK', ms: 340 },
      { t: '', ms: 40 },
      { t: dev('ide0', 'boot disk'), ms: 80 },
      { t: dev('tty1', 'amber phosphor 80x25'), ms: 80 },
      { t: dev('net0', `${s.locations?.length || 0} origins traced`), ms: 80 },
      { t: dev('srv0', `integrity ${s.server.integrity}/${s.server.max}`, crit(s) ? 'CRIT' : 'OK'), c: crit(s) ? 'h' : '', ms: crit(s) ? 220 : 80 },
      { t: dev('dmn0', `${slotted} ${slotted === 1 ? 'daemon' : 'daemons'} slotted`), ms: 80 },
      ...waiting(s).map((l) => ({ ...l, ms: 220 })),
      { t: '', ms: 40 }, { t: `login: ${who(s)}`, c: 'y', ms: 120 },
    ],
    hold: 360,
  };
}

// A faction at its top tier: its mark in ASCII (its colour the only accent), its name and tier, one line in its voice.
export const FACTION_MARKS = {
  halcyon: [' .-------. ', ' |       | ', ' |  ===  | ', '  \\     /  ', "   '---'   "],
  glassjaw: ['       /    ', '      /_    ', ' \\     /  / ', '  \\_|_|_|_/ ', "   '-----'  "],
  kestrel: ['  .-.   .-.  ', ' /   \\ /   \\ ', '/     V     \\', '      |      ', '      |      '],
  lantern: ['   _.-._   ', '  [_____]  ', '  |  |  |  ', '  |  |  |  ', "  '-----'  "],
  nullchoir: ['    .---. / ', '   /    //\\ ', '  |    //  |', '   \\  //  / ', "   /'---'   "],
};
export const FACTION_VOICE = {
  halcyon: 'Coverage confirmed. This terminal is a covered asset.',
  glassjaw: 'Nobody logged this boot. Keep it that way.',
  kestrel: 'Rack 14, slot 3. Uptime is the only policy we keep.',
  lantern: 'You are on the signal now. Keep listening.',
  nullchoir: 'No masters on this box. Sing loud.',
};
function faction(s, f) {
  const F = FACTIONS[f];
  return {
    fc: F.color,
    steps: [
      { art: FACTION_MARKS[f], c: 'm', ms: 300 },
      { t: `${F.name} · ${F.tiers[4]}`, c: 'b', ms: 160 },
      { t: FACTION_VOICE[f], ms: 380 },
      { t: dots('integrity', `${s.server.integrity}/${s.server.max}`, crit(s) ? 'crit' : 'ok'), c: crit(s) ? 'h' : '', ms: 110 },
      ...waiting(s).map((l) => ({ ...l, ms: 220 })),
      { t: '', ms: 40 }, { t: `login: ${who(s)}`, c: 'y', ms: 120 },
    ],
    hold: 380,
  };
}

// Corrupted: each line comes in garbled and settles into itself once, then the disk check says what it fixed.
// Garbled the same way every time (every third letter), in a dimmer ink: nothing flashes.
const NOISE = '#%&$@!?▒░';
export const garble = (t) => [...t].map((ch, i) => (ch !== ' ' && ch !== '.' && (i * 7 + t.length) % 3 === 0 ? NOISE[(i * 5 + t.length) % NOISE.length] : ch)).join('');
function glitch(s) {
  const g = (t, ms = 170, c = '') => ({ t, garble: garble(t), ms, c });
  return {
    steps: [
      g('BLACKBOX/OS 0.9.4 · tty1', 200, 'b'),
      g(dots('memory check', '640K')),
      g(dots('credits', `${s.server.credits}`, 'ok')),
      { ...g(dots('integrity', `${s.server.integrity}/${s.server.max}`, crit(s) ? 'crit' : 'ok'), crit(s) ? 260 : 170), c: crit(s) ? 'h' : '' },
      { t: 'fsck: 3 blocks recovered', ms: 200 },
      { t: dots('image check', 'clean'), ms: 140 },
      ...waiting(s).map((l) => ({ ...l, ms: 220 })),
      { t: '', ms: 40 }, { t: `login: ${who(s)}`, c: 'y', ms: 120 },
    ],
    hold: 380,
  };
}

// Minimal: the cursor on its own a moment, then one line.
function minimal(s) {
  return { steps: [{ t: '', ms: 620 }, { t: `${who(s)}@blackbox ready`, same: true, ms: 0 }], hold: 700 };
}

export function bootScript(s, id = 'stock') {
  const f = /^f-(\w+)$/.exec(id)?.[1];
  const make = f && FACTIONS[f] ? (x) => faction(x, f) : { bios, glitch, minimal }[id] || stock;
  const look = make === stock ? 'stock' : id;
  return { id: look, cls: `boot-${f ? 'faction' : look}`, ...make(s) };
}
// How long a boot runs, in ms, from the first line to the screen opening (stock's lines at their average pace).
export const BOOT_START = 250, STOCK_PACE = 115, THREAT_PACE = 260;
export const bootLength = (b) => BOOT_START + b.steps.reduce((n, l) => n + (l.ms ?? (l.c === 'h' ? THREAT_PACE : STOCK_PACE)), 0) + b.hold;
