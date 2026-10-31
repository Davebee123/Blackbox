// .exe builds (GAME_RULES.md "Viruses", docs/parts-plan.md P5). From floor 4 a wild virus's part can come as its .exe
// build: the same part with its rule turned harder ('stronger') or bent a new way ('different'). One part, one rule: an
// .exe changes the rule it has, never adds a second. Its id stays, so research and the Codex are the part's own; its
// name gains .exe (*Lockbox.exe*), drawn red on the board. No imports: data.mjs builds them (createVirus), combat.mjs
// and fightread.mjs read the per-part numbers each build sets, falling back to CONFIG's.

// The roll: from EXE_ROLL.floor, each part with a build here comes as its .exe this often, by floor (a fight's floor is
// its server's). An elite or a ★ rare spawn from that floor brings at least one. A part you've never met never comes as
// its .exe: the stranger is the lesson.
export const EXE_ROLL = { floor: 4, share: [[4, 0.15], [5, 0.2], [6, 0.25], [7, 0.3], [8, 0.35]], sure: true };

const hit = (p, k) => { if (p.attack) p.attack.amount = Math.max(1, Math.round(p.attack.amount * k)); };
const partner = (p, parts, id) => parts.find((x) => x.id === p[id]);

// Each build: kind, what it changes (the tooltip on its red .exe, after "A harder build of the <part>."), and apply
// (the built part, every part of the virus).
export const EXE = {
  // The basics. The Pulse Node has none: it stays the plain one (the designer, October 31, 2026).
  accumulator: { kind: 'stronger', what: 'Its Discharge comes every 4 cycles, not 5.', apply: (p) => { if (p.attack) p.attack.interval = Math.max(2, p.attack.interval - 1); } },
  strobe: { kind: 'different', what: 'Each Tick deals more than the last. A delay starts the climb over.', apply: (p) => { if (p.attack) { p.attack.ramp = 1; p.attack.rampBy = Math.max(1, Math.round(p.attack.amount * 0.12)); p.attack.step = 0; } } },
  repeater: { kind: 'stronger', what: 'Its volley is three hits, not two, each at 80%.', apply: (p) => { p.taps = 3; hit(p, 0.8); } },
  buffer: { kind: 'stronger', what: 'It shields every 2 cycles, not 3.', apply: (p) => { if (p.buffer) p.buffer = { ...p.buffer, every: 2 }; } },
  cipherblock: { kind: 'stronger', what: 'It deals 50% more for each Encrypt on you, not 25%.', apply: (p) => { p.cipher = 0.5; } },
  fanin: { kind: 'stronger', what: 'It deals 100% more for each fragment, not 50%.', apply: (p) => { p.fanin = 1; } },
  obfuscator: { kind: 'different', what: 'Tag reveals nothing while it stands.', apply: () => {} },
  // The thirds.
  lockbox: { kind: 'stronger', what: 'Its ward caps the partner at 15% a cycle, not 25%.', apply: (p, parts) => { const t = partner(p, parts, 'ward'); if (t) t.wardShare = 0.15; } },
  mirror: { kind: 'stronger', what: 'A twin reboots twice, not once.', apply: (p, parts) => { p.rebootMax = 2; const t = partner(p, parts, 'twin'); if (t) t.rebootMax = 2; } },
  decoy: { kind: 'stronger', what: 'It bends every 3 cycles, not 4.', apply: (p) => { p.reflect = 3; p.reflectOff = 0; } },
  zipbomb: { kind: 'stronger', what: 'Its fuse burns 1 cycle, not 2.', apply: (p) => { p.fuseIn = 1; } },
  hotspot: { kind: 'different', what: 'Burns and helpers set it off too.', apply: () => {} },
  mutex: { kind: 'stronger', what: 'A broken lock returns 2 cycles later, not 4.', apply: (p, parts) => { const t = partner(p, parts, 'lock'); if (t) t.relock = 2; } },
  c2: { kind: 'stronger', what: 'Fragments deal 100% more while it stands, not 50%.', apply: (p) => { p.gnaw = 1; } },
  idletimer: { kind: 'stronger', what: 'Every part re-arms at 4 cycles, not 5.', apply: (p) => { p.idle = Math.max(3, (p.idle || 5) - 1); } },
  frontend: { kind: 'different', what: 'It fronts its partner while it stands, ◆ or not.', apply: () => {} },
  backlog: { kind: 'stronger', what: 'Its Ack cools your skill 3 cycles longer, not 2.', apply: (p) => { p.backlog = (p.backlog || 2) + 1; } },
  limiter: { kind: 'different', what: 'Its cap holds every part of the virus while it stands.', apply: () => {} },
  spare: { kind: 'stronger', what: 'It boots at 90% of the signature\'s max, not 60%.', apply: (p) => { if (p.spare) p.spare = { ...p.spare, at: 0.9 }; } },
  tripwire: { kind: 'stronger', what: 'Loud parts attack 2 cycles sooner, not 1.', apply: (p) => { p.loudSooner = 2; } },
  scraper: { kind: 'stronger', what: 'It gains up to 4 ◆ from what it takes, not 2.', apply: (p) => { p.scrape = (p.scrape || 2) * 2; } },
  badblock: { kind: 'stronger', what: 'Cracked heals lose up to 20% of your max, not 10%.', apply: (p) => { p.badblock = (p.badblock || 0.1) * 2; } },
};

// A share on its floor (none above EXE_ROLL.floor).
export const exeShare = (floor) => (floor >= EXE_ROLL.floor ? EXE_ROLL.share.reduce((v, [f, x]) => (floor >= f ? x : v), 0) : 0);

// Make a built part its .exe build: its own numbers, a name with .exe. The id stays the part's.
export function makeExe(p, parts, id = p.id) {
  const b = EXE[id];
  if (!b || p.exe) return false;
  p.exe = id;
  p.name += '.exe';
  b.apply(p, parts);
  return true;
}

// Which of a rolled virus's parts come as their .exe: ids is each part's build id (a doubled basic's copy carries its
// basic's), met(i) whether you've met part i, sure an elite or rare spawn (at least one), rand its own stream.
export function rollExe({ ids, floor, rand, met = () => true, sure = false }) {
  const share = exeShare(floor);
  if (!share) return [];
  const can = [...new Set(ids.filter((id, i) => EXE[id] && met(i)))];
  const out = can.filter(() => rand() < share);
  if (sure && EXE_ROLL.sure && !out.length && can.length) out.push(can[Math.min(can.length - 1, Math.floor(rand() * can.length))]);
  return out;
}
