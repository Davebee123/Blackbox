// Presentation only: each boss's own body for virus-art.mjs, built from its primitives (orb, tube, ring, box, disc) as
// a cloud of 3D points tagged by part. A model wears what its fight is about: its own parts are its regions, by id, so
// a Gavel lights when the Gavel is hit and a Frame dissolves when it breaks. A part that joins mid-fight (a buyer, a
// second Demand, a Camera) is modelled from the start and drawn once it is on the board.
//
// Space: x to the right, y down, z away from you. Regions: a part's id; k.B the basic part; k.S(side) the special one;
// 'body' the armor shell; 'frag1'..'frag3' the living fragments; '#camera1'.. the nth living part of a role.

// Which body a boss wears. The Resident's is by its server's family: the oldest orphan there.
export const BOSS_SHAPE = {
  relayking: 'crownmast', repoman: 'towhook', choir: 'organ', foreman: 'hardhat', heatsink: 'fins', coldwallet: 'vault',
  centrifuge: 'centrifuge', shakedown: 'ransomclock', shouldersurfer: 'lurker', recursion: 'stack', nightdesk: 'desk', byzantine: 'domes', camswarm: 'cameras',
  'nb-deadbolt': 'deadbolt', 'nb-tripmine': 'mine', 'nb-hashlord': 'crowncube', 'nb-backorifice': 'skull', 'nb-patchday': 'quilt', 'nb-floodwall': 'dam',
  'nb-mirrorshade': 'shades', 'nb-sleepwalker': 'walker', 'nb-echolalia': 'horn',
};
export const RESIDENT_SHAPE = { worm: 'cobra', ransomware: 'strongbox', ghostroot: 'elder' };
export const bossShape = (v) => (v?.boss === 'resident' ? RESIDENT_SHAPE[v.art] || RESIDENT_SHAPE[v.family] : BOSS_SHAPE[v?.boss]) || null;

// How each body attacks (virus-art.mjs STRIKES): its plain parts' move, and its special part's.
export const BOSS_STRIKES = {
  crownmast: { core: 'strike', limb: 'shock' }, // the worm darts; the crown broadcasts
  towhook: { core: 'volley', limb: 'lash' }, // the case spits; the hook swings
  organ: { core: 'shock', limb: 'beam' }, // the pipes sound; the voices pour out
  hardhat: { core: 'headbutt', limb: 'rake' }, // the hat comes down; the fists drag
  fins: { core: 'pulse', limb: 'grind' }, // the pipes throb; the fan grinds
  vault: { core: 'shock', limb: 'grind' }, // the door booms; the wheel spins up
  centrifuge: { core: 'headbutt', limb: 'grind' }, // the Gavel comes down; the Rotor spins up
  ransomclock: { core: 'stab', limb: 'shock' }, // the knives jab; the clock rings
  lurker: { core: 'rake', limb: 'beam' }, // the fingers drag; the eye sweeps you
  stack: { core: 'volley', limb: 'pulse' }, // a frame throws; main() swells
  desk: { core: 'volley', limb: 'pulse' }, // the traders throw slips; the Desk throbs
  domes: { core: 'beam', limb: 'shock' }, // a Node's message sweeps you
  cameras: { core: 'beam', limb: 'swarm' }, // a lens sweeps you; the Hive swarms
  deadbolt: { core: 'pulse', limb: 'headbutt' }, // the turn throbs; the bolt slams
  mine: { core: 'pulse', limb: 'shock' }, // the plate throbs; the prongs blast rings
  crowncube: { core: 'volley', limb: 'grind' }, // the core spits; the cube grinds
  skull: { core: 'headbutt', limb: 'lash' }, // the skull butts; the worm whips
  quilt: { core: 'pulse', limb: 'stab' }, // a patch throbs; the tools jab
  dam: { core: 'shock', limb: 'spill' }, // the wheel booms; the sluices pour
  shades: { core: 'phase', limb: 'beam' }, // the node blinks to the glass; the lenses glare
  walker: { core: 'phase', limb: 'rake' }, // the cell blinks; the arms drag
  horn: { core: 'pulse', limb: 'shock' }, // the throat throbs; the echoes ring out
  cobra: { core: 'strike', limb: 'lash' }, // the head darts; the hood whips
  strongbox: { core: 'pulse', limb: 'snap' }, // the dial throbs; the clamps snap
  elder: { core: 'phase', limb: 'stab' }, // the node blinks to the glass; the roots spear out
};

const TAU = Math.PI * 2;

// The models. Each takes the kit virus-art.mjs builds with: its primitives and animations, the part roles (B, S), the
// virus's own random (r, jit) and the virus. The fight's window is wide and short (about 70 by 20 characters), so
// a model is too: within 48 up and down, out to 120 across, in bold masses.
export const BOSS_BUILD = {
  // RELAY-KING: a crown on a relay drum, broadcasting; the worm coils round the drum.
  crownmast(k) {
    const { tube, orb, path, loop, flat, anim, orbit, spin, B, S } = k;
    tube([0, 46, 0], [0, 6, 0], 21, 14, 'body'); loop(0, 46, 0, 25, 2.4, 'body'); loop(0, 24, 0, 19, 1.6, 'body');
    // The worm: a turn and a half up the drum, its lower coil the basic part, its upper the special.
    const coil = (t) => [Math.cos(t * TAU * 1.5 + 2.4) * (36 - t * 16), 40 - t * 30, Math.sin(t * TAU * 1.5 + 2.4) * (36 - t * 16)];
    const pts = Array.from({ length: 25 }, (_, i) => coil(i / 24)), wave = anim({ k: 'breathe', c: [0, 24, 0], amp: 0.04, speed: 1.6 });
    path(pts.slice(0, 13), 8, 7, B, wave); path(pts.slice(12), 7, 5.5, S(1), wave);
    orb(...coil(1), 9, 8, 9, S(1), wave, 0.32);
    // The crown, and its broadcast.
    const crown = spin([0, -12, 0], 0.4, 'y');
    tube([0, -4, 0], [0, -16, 0], 30, 32, 'relay', crown); flat(0, -4, 0, 30, 'relay', crown, 4.4);
    for (let i = 0; i < 5; i++) { const th = (i / 5) * TAU, x = Math.cos(th), z = Math.sin(th); tube([x * 31, -16, z * 31], [x * 37, -43, z * 37], 7.5, 0.6, 'relay', crown); orb(x * 37, -44, z * 37, 4, 4, 4, 'relay', crown, 0.6); }
    for (let i = 0; i < 2; i++) loop(0, -10, 0, 64 + i * 30, 1.2, 'relay', anim({ k: 'ripple', c: [0, -10, 0], amp: 0.1, speed: 2.4, phase: i * 1.6 }));
    for (let n = 1; n <= 3; n++) orb(70, 42 - n * 9, 0, 7, 6, 7, 'frag' + n, orbit([0, 0, 0], 0.5 + n * 0.14, 0), 0.5);
  },

  // REPO MAN: a tow hook on its jib, and the ledger case it has come to take. Liens hang off the jib.
  towhook(k) {
    const { tube, box, arc, anim, B, S, has } = k;
    tube([-118, -14, 0], [26, -44, 0], 4.5, 3.5, 'body');
    box(26, -43, 0, 8, 5, 7, 'body', 0, 3.5);
    const hang = anim({ k: 'swing', c: [26, -40, 0], amp: 0.05, speed: 0.9 });
    tube([26, -38, 0], [26, -18, 0], 5.5, 5.5, S(), hang);
    arc([13, -18, 0], 13, 0, Math.PI, 5.5, S(), hang, 12);
    tube([0, -18, 0], [0, -30, 0], 5.5, 0.6, S(), hang);
    // The case: its handle on the hook, the Ledger its lid, a clasp its lock.
    arc([13, 2, 0], 16, Math.PI, TAU, 3, 'body', 0, 10, 13);
    box(13, 26, 0, 48, 19, 10, 'body', 0, 5);
    const lid = has('ledger') ? 'ledger' : 'body';
    box(13, 4, 0, 49, 3.5, 11, lid, 0, 4);
    for (const x of [-20, 46]) box(x, 26, -11, 5, 19, 1.5, lid, 0, 3.2); // its straps
    box(13, 13, -12, 8, 6, 2, B, anim({ k: 'breathe', c: [13, 13, -12], amp: 0.12, speed: 3 }), 2.6);
    [[-98, 22, 0], [-70, 30, 1.3], [-42, 18, 2.6]].forEach(([x, len, ph]) => {
      const y = -14 - ((x + 118) / 144) * 30 + 4, t = anim({ k: 'swing', c: [x, y, 0], amp: 0.22, speed: 1.5, phase: ph });
      tube([x, y, 0], [x, y + len, 0], 0.9, 0.9, 'body', t); box(x, y + len + 7, 0, 6, 7, 1.2, has('lockbox') ? 'lockbox' : 'body', t, 2.8);
    });
  },

  // HOLLOW CHOIR: organ pipes over a wind chest, a hollow mask to either side to sing your commands back.
  organ(k) {
    const { tube, orb, box, loop, anim, B, S, has } = k;
    for (let i = 0; i < 9; i++) {
      const d = Math.abs(i - 4), x = (i - 4) * 18, z = d * d * 0.8, top = -46 + d * 9;
      tube([x, 34, z], [x, top, z], 6.5, 6.5, d % 2 ? S(i < 4 ? -1 : 1) : 'body');
      box(x, 20, z - 7, 4.4, 2.2, 1, 'body', 0, 2.2); // its mouth
    }
    box(0, 41, 5, 82, 6, 13, B, anim({ k: 'breathe', c: [0, 41, 5], amp: 0.03, speed: 1.4 }), 5);
    // The voices: the first is the Mimic; the second joins at half.
    const mask = (x, region, ph) => {
      const bob = anim({ k: 'bob', amp: 2.5, speed: 1.1, phase: ph });
      loop(x, 0, -10, 16, 2.6, region, bob, Math.PI / 2, 21);
      for (const s of [-1, 1]) orb(x + s * 6.5, -7, -10, 3.4, 2.6, 2, region, bob, 0.7);
      loop(x, 9, -10, 5, 1.8, region, bob, Math.PI / 2, 6.5);
    };
    mask(-104, has('mimic') ? 'mimic' : 'body', 0);
    mask(104, has('mimic') ? 'mimic2' : 'body', 1.6);
  },

  // THE FOREMAN: a hard hat and a lamp over a slab of a torso, a fist on each long arm.
  hardhat(k) {
    const { tube, ring, orb, box, dome, path, anim, sway, B, S } = k;
    box(0, 22, 0, 34, 22, 15, 'body', 0, 5);
    orb(0, -18, 0, 18, 16, 16, 'body');
    box(0, -16, -15, 13, 3, 2, B, anim({ k: 'breathe', c: [0, -16, -15], amp: 0.1, speed: 2.4 }), 2.6); // the visor
    dome(0, -24, 0, 25, 22, 23, 'body', 0, 0.17);
    ring(0, -24, 0, 28, 2, 'body');
    box(0, -24, -29, 13, 1.6, 7, 'body', 0, 3); // the peak
    path(Array.from({ length: 9 }, (_, i) => { const th = (i / 8) * Math.PI; return [0, -24 - Math.sin(th) * 23, -Math.cos(th) * 24]; }), 2.8, 2.8, 'body');
    orb(0, -36, -20, 5.5, 5.5, 4.5, B, anim({ k: 'breathe', c: [0, -36, -20], amp: 0.22, speed: 3.4 }), 0.4); // the lamp
    for (const side of [-1, 1]) {
      const a = sway([side * 36, 6, 0], 0.06, 1.3, side);
      orb(side * 40, 6, 0, 12, 10, 11, 'body', a, 0.28);
      tube([side * 42, 8, 0], [side * 72, 14, -4], 8, 7, S(side), a);
      tube([side * 72, 14, -4], [side * 88, 32, -12], 7, 8, S(side), a);
      box(side * 90, 37, -14, 11, 10, 10, S(side), a, 4);
    }
    for (const [n, x] of [[1, -58], [2, 58], [3, -118]]) box(x, 40, -22, 7, 7, 7, 'frag' + n, anim({ k: 'bob', amp: 1.2, speed: 1.5 + n * 0.3 }), 3.4);
  },

  // HEATSINK: a comb of fins on a plate, heat pipes through them, the heat coming off the top.
  fins(k) {
    const { tube, orb, box, path, anim, orbit, B, S } = k;
    box(0, 42, 0, 92, 4.5, 16, 'body', 0, 5);
    for (let i = 0; i < 9; i++) box(-80 + i * 20, 10, 0, 4.4, 28, 9, 'body', 0, 4.4);
    const throb = anim({ k: 'breathe', c: [0, 12, -12], amp: 0.03, speed: 2.6 });
    for (const y of [0, 24]) { tube([-98, y, -12], [98, y, -12], 4.6, 4.6, B, throb); for (const s of [-1, 1]) orb(s * 100, y, -12, 7, 7, 7, B, throb, 0.5); }
    for (const s of [-1, 1]) tube([s * 100, 0, -12], [s * 100, 24, -12], 4.6, 4.6, B, throb);
    for (let i = 0; i < 8; i++) { const x = -70 + i * 20; path(Array.from({ length: 7 }, (_, j) => [x + (j % 2 ? 4 : -4), -20 - j * 4.4, 0]), 2.6, 1.4, S(i % 2 ? -1 : 1), anim({ k: 'rise', amp: 3, freq: 0.3, speed: 3.4, phase: i })); }
    for (let n = 1; n <= 3; n++) orb(112, 30 - n * 14, 0, 6, 6, 6, 'frag' + n, orbit([0, 0, 0], 0.5 + n * 0.12, 0), 0.6);
  },

  // COLDWALLET: a round vault door, its wheel turning, in a doorway hung with ice.
  vault(k) {
    const { tube, orb, box, disc, loop, anim, spin, B, S, r } = k;
    disc(0, 0, -6, 38, 'body');
    const hum = anim({ k: 'breathe', c: [0, 0, 0], amp: 0.015, speed: 1.6 });
    loop(0, 0, -8, 42, 4.6, B, hum, Math.PI / 2);
    for (let i = 0; i < 8; i++) { const th = (i / 8) * TAU + 0.39; orb(Math.cos(th) * 34, Math.sin(th) * 34, -9, 4, 4, 2.8, B, hum, 0.65); }
    const wheel = spin([0, 0, -18], 0.6);
    loop(0, 0, -18, 22, 2.8, S(), wheel, Math.PI / 2);
    for (let i = 0; i < 5; i++) { const th = (i / 5) * TAU; tube([0, 0, -18], [Math.cos(th) * 22, Math.sin(th) * 22, -18], 3.2, 3.2, S(i % 2 ? -1 : 1), wheel); }
    orb(0, 0, -22, 8, 8, 5, S(), wheel, 0.34);
    for (const y of [-22, 22]) box(-52, y, -2, 6, 8, 7, 'body', 0, 3.4);
    box(0, -46, 0, 100, 2.6, 9, 'body', 0, 4.4); box(0, 46, 0, 100, 2.6, 9, 'body', 0, 4.4);
    // Ice: long off the lintel to either side of the door, and rising off the sill.
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x = s * (58 + i * 12 + (r() - 0.5) * 4), len = 18 + r() * 22; tube([x, -44, -8], [x, -44 + len, -8], 4.6, 0.3, 'body'); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = s * (64 + i * 13 + (r() - 0.5) * 4), len = 10 + r() * 16; tube([x, 44, -8], [x, 44 - len, -8], 4.4, 0.3, 'body'); }
  },

  // CENTRIFUGE: a rotor of sample tubes on its drum, the auctioneer's Gavel beside it. Its buyers wait across from it.
  centrifuge(k) {
    const { tube, orb, box, disc, flat, arc, loop, anim, spin, sway } = k;
    const rot = spin([0, 0, 0], 2, 'y');
    tube([0, -18, 0], [0, 24, 0], 6.5, 6.5, 'rotor');
    orb(0, -19, 0, 13, 8, 13, 'rotor', rot, 0.28);
    for (let i = 0; i < 4; i++) { const th = (i / 4) * TAU + 0.5, x = Math.cos(th), z = Math.sin(th); tube([x * 10, -17, z * 10], [x * 42, -15, z * 42], 3.8, 3.8, 'rotor', rot); tube([x * 38, -15, z * 38], [x * 56, 9, z * 56], 8.5, 7, 'rotor', rot); orb(x * 57, 11, z * 57, 7, 7, 7, 'rotor', rot, 0.5); }
    tube([0, 24, 0], [0, 44, 0], 50, 60, 'body'); flat(0, 24, 0, 50, 'body', 0, 4.4); loop(0, 24, 0, 51, 2, 'body');
    // The Gavel: a mallet that rocks on its handle's end, over its block.
    const rock = anim({ k: 'swing', c: [128, 12, 0], amp: 0.2, speed: 2 });
    tube([128, 12, 0], [99, -20, 0], 4, 4, 'gavel', rock);
    tube([84, -6, 0], [112, -36, 0], 12, 12, 'gavel', rock);
    for (const [x, y] of [[84, -6], [112, -36]]) orb(x, y, 0, 12, 12, 12, 'gavel', rock, 0.4);
    tube([84, 30, 0], [84, 38, 0], 17, 17, 'body'); flat(84, 30, 0, 17, 'body'); tube([84, 38, 0], [84, 46, 0], 6, 10, 'body');
    // The buyers: PALEMASK's Veil, SWARMLINE's Mirror, TOLLGATE's Lockbox.
    tube([-128, -44, 0], [-92, -44, 0], 2.2, 2.2, 'veil');
    for (let i = 0; i < 7; i++) { const x = -126 + i * 5.4; tube([x, -44, 0], [x, -18 + (i % 2) * 5, 0], 1.6, 0.8, 'veil', sway([x, -44, 0], 0.16, 1.4, i)); }
    disc(-96, 6, 0, 11, 'mirror'); loop(-96, 6, 0, 13, 2, 'mirror', 0, Math.PI / 2); tube([-96, 19, 0], [-96, 28, 0], 2.4, 2.4, 'mirror');
    box(-120, 36, 0, 11, 9, 9, 'lockbox', 0, 3.4); arc([-120, 27, 0], 7, Math.PI, TAU, 2.4, 'lockbox', 0, 8, 9);
  },

  // SHAKEDOWN: the Collector is an alarm clock running down, on its Lockbox; a knife pins each Demand.
  ransomclock(k) {
    const { tube, ring, orb, box, disc, dome, anim, spin } = k;
    disc(0, -4, -6, 29, 'collector');
    for (const z of [-7, 0, 7]) ring(0, -4, z, 32, 1.4, 'collector', 0, Math.PI / 2);
    for (let i = 0; i < 12; i++) { const th = (i / 12) * TAU; orb(Math.cos(th) * 25, -4 + Math.sin(th) * 25, -9, i % 3 ? 1.6 : 3.2, i % 3 ? 1.6 : 3.2, 2, 'collector', 0, 0.9); }
    tube([0, -4, -11], [0, -27, -11], 2.6, 1.2, 'collector', spin([0, -4, -11], 0.9));
    tube([0, -4, -11], [14, -4, -11], 3, 1.6, 'collector', spin([0, -4, -11], 0.075));
    orb(0, -4, -12, 4.4, 4.4, 3, 'collector', 0, 0.6);
    for (const s of [-1, 1]) { dome(s * 24, -33, 0, 14, 11, 14, 'collector', anim({ k: 'swing', c: [s * 24, -33, 0], amp: 0.05, speed: 22, phase: s }), 0.24); tube([s * 20, -26, 0], [s * 24, -34, 0], 2, 2, 'collector'); }
    tube([0, -46, 0], [0, -36, 0], 1.6, 1.6, 'collector', anim({ k: 'swing', c: [0, -46, 0], amp: 0.6, speed: 18 }));
    box(0, 38, 0, 26, 8, 13, 'lockbox', 0, 4.4);
    orb(0, 38, -14, 4.4, 4.4, 2.4, 'lockbox', 0, 0.6);
    for (const s of [-1, 1]) tube([s * 14, 22, 0], [s * 18, 30, 0], 3, 3, 'lockbox');
    // The Demands: a note each, a knife through it. The second comes in act 2.
    const note = (s, region) => {
      const flap = anim({ k: 'swing', c: [s * 80, -8, 0], amp: 0.05, speed: 1.3, phase: s });
      box(s * 80, 16, 0, 17, 22, 1.4, region, flap, 3.4);
      tube([s * 80, -38, -18], [s * 80, -20, -9], 3.6, 3.6, region, flap); // the grip
      box(s * 80, -18, -8, 8, 1.6, 3, region, flap, 2.6);
      tube([s * 80, -17, -7], [s * 80, 2, 1], 3.4, 0.5, region, flap);
    };
    note(-1, 'demand'); note(1, 'demand2');
  },

  // SHOULDER SURFER: a head over the top of your screen, one lens, its fingers on the edge.
  lurker(k) {
    const { tube, orb, box, dome, loop, anim, sway } = k;
    const peer = anim({ k: 'bob', amp: 2.5, speed: 0.8 });
    dome(0, 14, 8, 38, 56, 26, 'body', peer, 0.16);
    orb(0, -12, -20, 12, 12, 5, 'logger', anim({ k: 'breathe', c: [0, -12, -20], amp: 0.16, speed: 1.7 }), 0.28);
    loop(0, -12, -21, 18, 2.6, 'logger', peer, Math.PI / 2);
    box(0, 31, -20, 108, 17, 3, 'body', 0, 5.4);
    box(0, 13, -20, 110, 2, 5, 'body', 0, 3.6);
    // The hands: its Scrambler the left, its Pulse Node the right.
    for (const [s, region] of [[-1, 'scrambler'], [1, 'pulse']]) for (let j = 0; j < 4; j++) {
      const x = s * (56 + j * 10), a = sway([x, 12, -14], 0.04, 2.2, j * 0.9 + s);
      tube([x, 12, -8], [x, 7, -27], 4.2, 4.2, region, a);
      tube([x, 7, -27], [x, 26 - (j % 3) * 2, -29], 4.2, 3.2, region, a);
    }
    for (let i = 0; i < 13; i++) box(-90 + i * 15, 37, -24, 5, 5, 1, 'body', 0, 3); // the keys it reads
  },

  // RECURSION: a tunnel of frames, each inside the last and nearer you, main() at the far end of it.
  stack(k) {
    const { tube, orb, anim, v } = k;
    const frames = v.parts.filter((p) => p.frame != null && p.integrity > 0).sort((a, b) => a.frame - b.frame);
    const at = (i) => { const w = Math.max(14, 104 - i * 15), h = Math.max(7, 46 - i * 6.5), z = 40 - i * 15; return [[-w, -h, z], [w, -h, z], [w, h, z], [-w, h, z]]; };
    frames.forEach((p, i) => {
      const c = at(i), ripple = anim({ k: 'bob', amp: 1.6, speed: 1.8, phase: -i * 0.8 }), rr = i ? 3.4 : 4.6;
      for (let j = 0; j < 4; j++) {
        tube(c[j], c[(j + 1) % 4], rr, rr, p.id, ripple);
        orb(...c[j], rr + 1.6, rr + 1.6, rr + 1.6, p.id, ripple, 0.6);
        if (i < frames.length - 1) tube(c[j], at(i + 1)[j], 0.9, 0.9, p.id, ripple); // what it calls
      }
      if (!i) orb(0, 0, 40, 13, 10, 8, p.id, anim({ k: 'breathe', c: [0, 0, 40], amp: 0.14, speed: 2 }), 0.3);
    });
    if (!frames.length) orb(0, 0, 0, 10, 10, 10, 'body');
  },

  // NIGHT DESK: a desk under a banker's lamp and a thin moon; the Teller's grille, the Clearing's spike of slips.
  desk(k) {
    const { tube, box, dome, flat, path, anim, add } = k;
    box(0, 14, 0, 94, 3, 21, 'desk', 0, 4.6);
    for (const s of [-1, 1]) { box(s * 66, 32, 0, 26, 15, 19, 'desk', 0, 5); for (const y of [24, 33, 42]) box(s * 66, y, -20, 8, 1.2, 1, 'desk', 0, 2.6); }
    box(0, 26, 15, 40, 9, 1.5, 'desk', 0, 4.6);
    // The lamp.
    const glow = anim({ k: 'breathe', c: [-50, -24, -6], amp: 0.05, speed: 1.2 });
    flat(-70, 10, -6, 10, 'desk'); tube([-70, 10, -6], [-70, -16, -6], 2.4, 2.4, 'desk');
    path([[-70, -16, -6], [-66, -27, -6], [-56, -31, -6]], 2.4, 2.4, 'desk');
    dome(-48, -22, -6, 24, 12, 11, 'desk', glow, 0.2);
    // The Clearing: slips on a spike. The Teller: a grille.
    tube([0, 10, -8], [0, -34, -8], 1.6, 0.4, 'clearing'); flat(0, 10, -8, 9, 'clearing');
    for (let i = 0; i < 5; i++) flat(i % 2 ? 2 : -2, 5 - i * 6.5, -8, 13 - (i % 2) * 2, 'clearing', anim({ k: 'bob', amp: 0.8, speed: 1.4, phase: i }), 2.8);
    for (const y of [-34, 10]) tube([40, y, 6], [90, y, 6], 2.6, 2.6, 'teller');
    for (let i = 0; i < 7; i++) tube([40 + i * 8.33, -34, 6], [40 + i * 8.33, 10, 6], i % 6 ? 1.7 : 2.6, i % 6 ? 1.7 : 2.6, 'teller');
    path([[52, -34, 6], [56, -44, 6], [74, -44, 6], [78, -34, 6]], 2.2, 2.2, 'teller');
    // The moon: what is left of a disc when a second one is taken out of it.
    for (let x = -16; x <= 16; x += 2.2) for (let y = -16; y <= 16; y += 2.2) if (Math.hypot(x, y) <= 15 && Math.hypot(x - 8, y + 3) > 13.5) add(-112 + x, -32 + y, 14, 0, 0, -1, 'body', 0);
  },

  // BYZANTINE: three domed towers that vote, messages passing between them.
  domes(k) {
    const { tube, ring, orb, anim, orbit } = k;
    const at = [['nodea', -80, 12], ['nodeb', 80, 12], ['nodec', 0, -26]];
    for (const [id, x, z] of at) {
      tube([x, 46, z], [x, 16, z], 18, 17, id);
      for (const y of [44, 18]) ring(x, y, z, 19.5, 1, id);
      for (let j = 0; j < 6; j++) { const th = (j / 6) * TAU; tube([x + Math.cos(th) * 18.5, 38, z + Math.sin(th) * 18.5], [x + Math.cos(th) * 18.5, 26, z + Math.sin(th) * 18.5], 2, 2, id); } // its windows
      orb(x, 0, z, 22, 19, 22, id, anim({ k: 'breathe', c: [x, 0, z], amp: 0.03, speed: 1.6 }), 0.18);
      tube([x, -14, z], [x, -40, z], 8, 0.5, id);
      orb(x, -44, z, 3.6, 3.6, 3.6, id, 0, 0.7);
    }
    // Messages on the wire.
    for (let i = 0; i < 3; i++) { const [, x0, z0] = at[i], [, x1, z1] = at[(i + 1) % 3]; tube([x0, 32, z0], [x1, 32, z1], 1, 1, 'body'); }
    for (let i = 0; i < 6; i++) orb(52, 32, 0, 3.4, 3.4, 3.4, 'body', orbit([0, 32, 0], (i % 2 ? -1 : 1) * (0.9 + i * 0.13), 0), 0.8);
  },

  // CAMSWARM: a hive with one great lens under its C2 mast, and the Cameras it grows, each panning on its arm.
  cameras(k) {
    const { tube, orb, disc, path, loop, anim, has } = k;
    orb(0, 6, 0, 30, 24, 26, 'hive', anim({ k: 'breathe', c: [0, 6, 0], amp: 0.03, speed: 1.8 }));
    loop(0, 6, -27, 13, 3, 'hive', 0, Math.PI / 2); orb(0, 6, -28, 6, 6, 3, 'hive', anim({ k: 'breathe', c: [0, 6, -28], amp: 0.25, speed: 2.2 }), 0.5);
    const mast = has('c2') ? 'c2' : 'body', sweep = anim({ k: 'sweep', c: [0, -40, 0], amp: 0.8, speed: 0.9 });
    tube([0, -16, 0], [0, -40, 0], 3.4, 2.4, mast);
    disc(0, -40, -4, 10, mast, sweep); tube([0, -40, -4], [0, -40, -15], 2, 0.6, mast, sweep);
    orb(0, 39, 0, 11, 8, 11, 'pulse', anim({ k: 'breathe', c: [0, 39, 0], amp: 0.14, speed: 2.6 }), 0.3);
    // A camera on its arm, side on: the housing, and the hood its lens looks out of.
    const cam = (x, y, ang, region, size = 1, ph = 0) => {
      const d = [Math.cos(ang), Math.sin(ang)], at = (u) => [x + d[0] * u * size, y + d[1] * u * size, 0];
      const pan = anim({ k: 'swing', c: [x, y, 0], amp: 0.2, speed: 0.9 + ph * 0.17, phase: ph });
      path([[Math.sign(x) * 26, 2, 0], [x * 0.72, y - 15 * size, 0], [x, y - 6 * size, 0]], 2.4, 2.4, region);
      tube(at(-13), at(11), 7, 7, region, pan);
      tube(at(11), at(19), 7.6 * size, 9.6 * size, region, pan);
      orb(...at(-13), 7, 7, 7, region, pan, 0.5);
    };
    cam(-50, -24, Math.PI - 0.5, 'hive', 0.8, 0); cam(50, -24, 0.5, 'hive', 0.8, 1);
    [[-88, 8, Math.PI - 0.3], [88, 8, 0.3], [-120, -18, Math.PI - 0.45], [120, -18, 0.45]].forEach(([x, y, ang], i) => cam(x, y, ang, '#camera' + (i + 1), 1, i + 2));
    [[-42, 40], [42, 40], [-64, 31]].forEach(([x, y], i) => orb(x, y, -6, 6, 7.5, 6, 'frag' + (i + 1), anim({ k: 'breathe', c: [x, y, -6], amp: 0.12, speed: 4 + i }), 0.5));
  },

  // DEADBOLT: a lock on its plate, the bolt working in and out of the strike, a chain across.
  deadbolt(k) {
    const { ring, orb, box, anim, spin, B, S, has } = k;
    box(-58, 0, 0, 34, 44, 7, 'body', 0, 5.2);
    for (const [x, y] of [[-84, -36], [-32, -36], [-84, 36], [-32, 36]]) orb(x, y, -8, 3.4, 3.4, 2.4, 'body', 0, 0.7);
    for (const z of [-9, -12]) ring(-58, -14, z, 17, 1.6, 'body', 0, Math.PI / 2);
    const turn = spin([-58, -14, -15], 0.5);
    box(-58, -14, -15, 3.6, 13, 2.6, B, turn, 2.6); orb(-58, -14, -16, 6, 6, 3.4, B, turn, 0.5);
    const shoot = anim({ k: 'slide', amp: 9, speed: 1.1 });
    box(20, 22, 0, 46, 10, 7.5, S(), shoot, 4.4);
    for (const x of [-6, 14]) box(x, 22, -8.5, 1.6, 10, 1, S(), shoot, 3.2);
    box(-58, 22, -8.5, 24, 13, 1.6, 'body', 0, 3.8);
    // The strike: a keeper on the jamb the bolt throws into.
    box(110, 22, 0, 4, 22, 10, 'body', 0, 4.2);
    for (const y of [8, 36]) box(96, y, 0, 12, 3, 9, 'body', 0, 3.8);
    box(118, 0, 0, 3, 46, 7, 'body', 0, 5.2);
    const chain = has('mutex') ? 'mutex' : has('lockbox') ? 'lockbox' : 'body';
    for (let i = 0; i < 15; i++) { const t = i / 14; ring(-80 + t * 196, -38 + Math.sin(t * Math.PI) * 15, -9, 5.4, 1, chain, 0, i % 2 ? Math.PI / 2 : 0.3); }
  },

  // TRIPMINE: a mine on its plate between two posts, beams crossed over it.
  mine(k) {
    const { tube, ring, orb, flat, anim, B, S, has } = k;
    tube([0, 28, 0], [0, 45, 0], 46, 52, 'body');
    flat(0, 28, 0, 46, 'body', 0, 3.6); ring(0, 37, 0, 51, 1.6, 'body');
    const press = anim({ k: 'bob', amp: 1.6, speed: 2.8 });
    tube([0, 19, 0], [0, 28, 0], 19, 19, B, press); flat(0, 19, 0, 19, B, press);
    orb(0, 10, 0, 6.5, 6.5, 6.5, B, anim({ k: 'breathe', c: [0, 10, 0], amp: 0.3, speed: 5 }), 0.45);
    for (let i = 0; i < 6; i++) { const th = (i / 6) * TAU + 0.3, x = Math.cos(th) * 34, z = Math.sin(th) * 34; tube([x, 28, z], [x * 1.12, 8, z * 1.12], 3.6, 0.6, S(i % 2 ? -1 : 1)); orb(x * 1.12, 6, z * 1.12, 3, 3, 3, S(i % 2 ? -1 : 1), 0, 0.9); }
    const wire = has('tripwire') ? 'tripwire' : 'body';
    for (const s of [-1, 1]) {
      tube([s * 106, 46, 0], [s * 106, -46, 0], 3.6, 3, 'body'); flat(s * 106, 46, 0, 11, 'body');
      for (const y of [-40, -18, 4]) orb(s * 106, y, -4, 5, 5, 5, wire, 0, 0.55);
    }
    [[-40, 4], [4, -40], [-18, -18]].forEach(([a, b], i) => tube([-106, a, -4], [106, b, -4], 1.1, 1.1, wire, anim({ k: 'bob', amp: 0.7, speed: 9 + i, phase: i })));
  },

  // HASHLORD: the miner's cube in a crown, on a throne of rigs, the Pool Lock chained across it.
  crowncube(k) {
    const { tube, orb, box, arc, path, anim, spin, B, S, has } = k;
    box(0, 0, 0, 21, 21, 21, S(1), spin([0, 0, 0], 0.9, 'y'), 4.6);
    orb(0, 0, 0, 11, 11, 11, B, anim({ k: 'breathe', c: [0, 0, 0], amp: 0.14, speed: 2.4 }));
    const crown = spin([0, -30, 0], -0.5, 'y');
    tube([0, -26, 0], [0, -33, 0], 22, 23, B, crown);
    for (let i = 0; i < 5; i++) { const th = (i / 5) * TAU, x = Math.cos(th), z = Math.sin(th); tube([x * 22, -33, z * 22], [x * 27, -47, z * 27], 6.5, 0.5, B, crown); }
    // The throne: rigs in two tiers, a post at each end.
    box(0, 30, 0, 40, 5, 24, 'body', 0, 5.2); box(0, 42, 0, 72, 5, 28, 'body', 0, 5.2);
    for (const s of [-1, 1]) { tube([s * 86, 46, 0], [s * 86, -12, 0], 5, 4, 'body'); orb(s * 86, -17, 0, 7, 7, 7, s < 0 ? 'body' : 'miner2', spin([s * 86, -17, 0], -1.4, 'y'), 0.45); }
    box(86, -30, 0, 9, 9, 9, 'miner2', spin([86, -30, 0], -1.4, 'y'), 3.4); // the Chain Fork's second Miner
    const lock = has('poollock') ? 'poollock' : has('lockbox') ? 'lockbox' : 'body';
    box(0, 28, -30, 11, 9, 3.5, lock, 0, 3.2); arc([0, 19, -30], 7, Math.PI, TAU, 2.6, lock, 0, 8, 9);
    for (const s of [-1, 1]) path(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [s * (10 + t * 74), 24 - t * 30 + Math.sin(t * Math.PI) * 14, -30 + t * 28]; }), 2.4, 2.4, lock);
  },

  // BACK ORIFICE: a longhorn's skull, the worm in and out of its eyes.
  skull(k) {
    const { tube, ring, orb, path, anim, orbit, B, S } = k;
    const nod = anim({ k: 'bob', amp: 1.6, speed: 0.9 });
    orb(0, -18, 0, 31, 22, 25, 'body', nod, 0.16);
    tube([0, -6, -8], [0, 38, -20], 19, 10.5, 'body', nod);
    orb(0, 41, -21, 11.5, 6.5, 7.5, 'body', nod, 0.3);
    for (const s of [-1, 1]) {
      ring(s * 15, -14, -21, 9.5, 2, 'body', nod, Math.PI / 2);
      orb(s * 15, -14, -19, 6, 6, 3.4, B, anim({ k: 'breathe', c: [s * 15, -14, -19], amp: 0.25, speed: 2.2 }), 0.42);
      ring(s * 5, 39, -28.5, 3, 1, 'body', nod, Math.PI / 2);
      path([[s * 26, -24, 0], [s * 54, -31, 2], [s * 82, -29, 0], [s * 104, -37, -6], [s * 114, -47, -10]], 10, 0.8, 'body', nod);
    }
    // The worm: out of one eye, under the jaw, in at the other.
    const wave = anim({ k: 'wave', amp: 2, freq: 0.08, speed: 2.4 });
    path(Array.from({ length: 21 }, (_, i) => { const t = i / 20, th = Math.PI * (1 - t), b = Math.sin(t * Math.PI); return [Math.cos(th) * 15 * (1 + 1.6 * b), -14 + b * 44, -25 - b * 12]; }), 4.8, 4.8, S(), wave);
    for (let n = 1; n <= 3; n++) orb(64, 34 - n * 10, 0, 5, 5, 5, 'frag' + n, orbit([0, 10, 0], 0.7 + n * 0.2, 0), 0.7);
  },

  // PATCH TUESDAY: a body of mismatched plates, patched and stitched, a tool for each hand.
  quilt(k) {
    const { tube, orb, box, arc, anim, sway, B, S } = k;
    const bob = anim({ k: 'bob', amp: 1.4, speed: 1.1 });
    box(-18, 8, 0, 23, 24, 15, 'body', bob, 4.8);
    orb(24, 12, 2, 27, 24, 18, 'body', bob, 0.18);
    box(4, -30, -2, 18, 12, 12, 'body', bob, 4.4);
    for (const x of [-4, 12]) orb(x, -30, -15, 3.4, 3.4, 2, B, bob, 0.8); // its eyes
    // Patches, proud of the plates, and the stitches down the seam.
    const patch = anim({ k: 'breathe', c: [0, 6, -18], amp: 0.03, speed: 2.2 });
    box(-24, 2, -16.5, 10, 10, 1.2, B, patch, 2.8); box(32, 18, -17.5, 9, 9, 1.2, B, patch, 2.8);
    for (let i = 0; i < 4; i++) { const y = -12 + i * 12; tube([1, y, -17], [11, y + 8, -17], 1.4, 1.4, 'body', bob); tube([11, y, -17], [1, y + 8, -17], 1.4, 1.4, 'body', bob); }
    // The wrench, and the driver.
    const wr = sway([48, 2, 0], 0.1, 1.4, 0);
    tube([48, 2, 0], [86, -20, -6], 5.4, 4.6, S(1), wr);
    arc([96, -27, -6], 12, 2.0, 6.9, 4.2, S(1), wr, 10);
    const dr = sway([-40, 0, 0], 0.1, 1.7, 2);
    tube([-40, 0, 0], [-68, -14, -6], 5.4, 5.4, S(-1), dr);
    tube([-68, -14, -6], [-84, -22, -8], 8, 8, S(-1), dr);
    tube([-84, -22, -8], [-116, -38, -10], 2.8, 1.6, S(-1), dr);
    for (const [x, d] of [[-26, -5], [4, 0], [34, 5]]) { tube([x, 32, 0], [x + d, 42, 0], 6, 5, 'body'); box(x + d, 44, -3, 9, 3, 9, 'body', 0, 3.8); }
  },

  // FLOODWALL: a dam, its sluices pouring into the pool, the gate wheel on the crest.
  dam(k) {
    const { tube, ring, box, anim, spin, B, S } = k;
    const zOf = (x) => (x * x) / 260 - 14;
    for (let i = -6; i <= 6; i++) { const x = i * 15; box(x, -2, zOf(x), 7.8, 28, 5, 'body', 0, 4.8); }
    for (let i = -6; i < 6; i++) tube([i * 15, -30, zOf(i * 15)], [(i + 1) * 15, -30, zOf((i + 1) * 15)], 4.2, 4.2, 'body');
    // The wheel.
    const wheel = spin([0, -38, -18], 0.8);
    ring(0, -38, -18, 10, 2, B, wheel, Math.PI / 2);
    for (let i = 0; i < 4; i++) { const th = (i / 4) * TAU; tube([0, -38, -18], [Math.cos(th) * 10, -38 + Math.sin(th) * 10, -18], 2, 2, B, wheel); }
    // The sluices: three falls, and the pool they make.
    for (const [x, side] of [[-52, -1], [0, 1], [52, 1]]) {
      const z = zOf(x) - 7;
      box(x, -8, z, 9, 2.4, 3, 'body', 0, 3);
      for (let j = 0; j < 6; j++) tube([x - 7.5 + j * 3, -6, z], [x - 12 + j * 4.8, 44, z - 14], 2, 1.6, S(side), anim({ k: 'wave', amp: 1.4, freq: 0.3, speed: 6 + j }));
    }
    for (let i = 0; i < 4; i++) ring(0, 45, -24, 34 + i * 20, 1.1, 'body', anim({ k: 'ripple', c: [0, 45, -24], amp: 0.05, speed: 2.4, phase: i * 0.9 }));
    for (let n = 1; n <= 3; n++) box((n - 2) * 26 + 26, 42, -48, 6, 3, 6, 'frag' + n, anim({ k: 'bob', amp: 2, speed: 2, phase: n }), 3.2);
  },

  // MIRRORSHADE: a hooded head behind mirrored lenses, roots trailing from its collar.
  shades(k) {
    const { tube, orb, disc, dome, loop, anim, sway, B, S, has, r } = k;
    const bob = anim({ k: 'bob', amp: 2, speed: 0.9 });
    dome(0, -4, 18, 46, 42, 26, 'body', bob, 0.15, 2.0);
    orb(0, 6, 0, 27, 29, 19, 'body', bob, 0.2);
    // The lenses: the Mimic, while it has one.
    const lens = (s) => (has('mimic') ? 'mimic' : S(s));
    for (const s of [-1, 1]) {
      disc(s * 23, -6, -24, 17, lens(s), bob);
      loop(s * 23, -6, -24, 19, 2.6, lens(s), bob, Math.PI / 2);
      tube([s * 42, -9, -22], [s * 47, -11, 14], 2.4, 2.4, 'body', bob);
    }
    tube([-5, -10, -25], [5, -10, -25], 2.6, 2.6, 'body', bob);
    orb(0, -31, -18, 4.6, 4.6, 3, B, anim({ k: 'breathe', c: [0, -31, -18], amp: 0.3, speed: 2.6 }), 0.5);
    loop(0, 33, 0, 25, 2.4, 'body', bob);
    const grow = (from, ang, len, thick, depth, side, a) => {
      const to = [from[0] + Math.sin(ang) * len, Math.min(47, from[1] + Math.cos(ang) * len), from[2] + (r() - 0.5) * 8];
      tube(from, to, thick, Math.max(0.5, thick * 0.6), S(side), a);
      if (depth > 0) for (let j = 0; j < 2; j++) grow(to, ang + (j ? 1 : -1) * (0.2 + r() * 0.3), len * 0.75, thick * 0.65, depth - 1, side, a);
    };
    for (let i = 0; i < 6; i++) { const f = i / 5 - 0.5, x = f * 44; grow([x, 34, 0], f * 2.9, 26, 3.4, 1, f < 0 ? -1 : 1, sway([x, 34, 0], 0.08, 0.7 + r() * 0.4, i * 1.7)); }
  },

  // SLEEPWALKER: a cocoon up and walking, arms out ahead of it, asleep under its cap.
  walker(k) {
    const { tube, ring, orb, box, path, anim, sway, B, S } = k;
    const breathe = anim({ k: 'breathe', c: [0, 2, 0], amp: 0.04, speed: 0.8 });
    orb(0, 2, 0, 17, 23, 17, 'body', breathe, 0.19);
    for (let i = 0; i < 4; i++) { const y = -12 + i * 9.5; ring(0, y, 0, Math.sqrt(Math.max(0.05, 1 - ((y - 2) / 23) ** 2)) * 18, 1, 'body', breathe, 0.15 * ((i % 3) - 1)); }
    orb(2, 2, -15.5, 8, 11, 4, B, anim({ k: 'breathe', c: [2, 2, -15.5], amp: 0.2, speed: 0.8 }), 0.34); // the Cell
    orb(4, -30, 0, 13, 12, 12, 'body', 0, 0.22);
    const cap = sway([2, -38, 0], 0.08, 1, 0);
    path([[4, -37, 0], [-6, -45, 0], [-20, -45, 0], [-29, -37, 0], [-31, -29, 0]], 11, 2, 'body', cap);
    orb(-31, -25, 0, 5, 5, 5, 'body', cap, 0.55);
    for (const s of [-1, 1]) {
      const a = anim({ k: 'bob', amp: 1.4, speed: 1.6, phase: s });
      tube([6, -11 + s * 3, s * 13], [36, -13 + s * 3, s * 15], 5.6, 5, S(s), a);
      tube([36, -13 + s * 3, s * 15], [64, -11 + s * 3, s * 15], 5, 4.4, S(s), a);
      orb(69, -11 + s * 3, s * 15, 6.4, 5.6, 6, S(s), a, 0.45);
      const leg = anim({ k: 'swing', c: [0, 22, s * 8], amp: 0.3, speed: 1.6, phase: s > 0 ? 0 : Math.PI });
      tube([0, 22, s * 8], [2, 43, s * 8], 6.4, 5.4, 'body', leg);
      box(7, 45, s * 8, 9, 3, 5, 'body', leg, 3.2);
    }
    // What it dreams: three Zs going up behind it.
    [[-62, -22, 11], [-88, -37, 15], [-122, -48, 20]].forEach(([x, y, w], i) => {
      const a = anim({ k: 'bob', amp: 2, speed: 1, phase: i });
      tube([x, y, 0], [x + w, y, 0], 1.7, 1.7, 'body', a); tube([x + w, y, 0], [x, y + w * 0.8, 0], 1.7, 1.7, 'body', a); tube([x, y + w * 0.8, 0], [x + w, y + w * 0.8, 0], 1.7, 1.7, 'body', a);
    });
  },

  // ECHOLALIA: a horn that says it again, each echo smaller than the last.
  horn(k) {
    const { tube, orb, box, arc, add, anim, B, S } = k;
    // The bell, flaring from its throat.
    for (let t = 0; t <= 1.001; t += 0.04) {
      const x = -70 + t * 72, R = 6 + 38 * t * t, y = 8 - t * 10;
      for (let th = 0; th < TAU; th += Math.max(0.09, 2.6 / R)) add(x, y + Math.sin(th) * R, Math.cos(th) * R, -0.55, Math.sin(th), Math.cos(th), 'body', 0);
    }
    for (const x of [2, 4]) for (let th = 0; th < TAU; th += 0.06) add(x, -2 + Math.sin(th) * 45, Math.cos(th) * 45, 0.3, Math.sin(th), Math.cos(th), 'body', 0);
    orb(-72, 8, 0, 9, 9, 9, B, anim({ k: 'breathe', c: [-72, 8, 0], amp: 0.22, speed: 2.2 }), 0.35);
    tube([-76, 12, 0], [-84, 34, 0], 5, 5, 'body');
    box(-62, 42, 0, 36, 5, 20, 'body', 0, 5);
    tube([-26, 40, 0], [-12, 40, 0], 2, 2, 'body'); tube([-12, 40, 0], [-12, 30, 0], 2, 2, 'body', anim({ k: 'swing', c: [-12, 40, 0], amp: 0.6, speed: 3 }));
    // The echoes: each one further out, and less of it.
    [[34, 0.62, 3.2], [56, 0.46, 2.6], [76, 0.34, 2], [94, 0.24, 1.6], [110, 0.16, 1.2]].forEach(([R, half, rr], i) => {
      const a = anim({ k: 'breathe', c: [4, -2, 0], amp: 0.05, speed: 2.6, phase: -i * 1.1 });
      arc([4, -2, 0], R, -half, half, rr, S(i % 2 ? -1 : 1), a, 10);
      arc([4, -2, 0], R, -half, half, rr, S(i % 2 ? -1 : 1), a, 10, R, 'xz');
    });
  },

  // The worm's Resident: an old cobra reared over its coils, hood spread.
  cobra(k) {
    const { tube, orb, path, torus, anim, sway, orbit, B, S } = k;
    [[62, 38, 10], [44, 24, 9.5], [27, 11, 9]].forEach(([R, y, rr]) => torus(0, y, 0, R, rr, B, anim({ k: 'breathe', c: [0, y, 0], amp: 0.025, speed: 1.2 })));
    const rear = sway([20, 6, 0], 0.06, 0.9, 0);
    path([[20, 6, 0], [24, -8, -4], [14, -22, -8], [4, -32, -12], [0, -38, -18]], 9.5, 7.5, 'body', rear);
    for (const s of [-1, 1]) { orb(s * 17 + 6, -20, -9, 19, 20, 5, S(s), rear, 0.19); }
    orb(0, -39, -25, 11, 8.5, 14, 'body', rear, 0.24);
    for (const s of [-1, 1]) { orb(s * 6.5, -42, -35, 2.8, 2.8, 1.8, B, rear, 0.9); tube([s * 4.5, -34, -37], [s * 5.5, -22, -41], 2.4, 0.4, B, rear); }
    path([[58, 40, 16], [86, 32, 14], [100, 14, 12], [96, -4, 10]], 8, 2.4, B, sway([58, 40, 16], 0.12, 5, 1)); // its rattle
    for (let n = 1; n <= 3; n++) orb(84, 2 - n * 12, 0, 6, 6, 6, 'frag' + n, orbit([0, 0, 0], 0.5 + n * 0.14, 0), 0.6);
  },

  // The ransomware's Resident: a safe grown legs, its dial for a face, a clamp on each chain.
  strongbox(k) {
    const { tube, ring, orb, box, disc, arc, anim, sway, spin, B, S, has } = k;
    box(0, 2, 0, 44, 27, 22, 'body', 0, 5.2);
    arc([0, -25, 0], 22, Math.PI, TAU, 5.5, 'body', sway([0, -25, 0], 0.03, 0.8, 0), 12, 17);
    // The door: its dial, its handle.
    box(0, 2, -23, 36, 21, 1.2, 'body', 0, 4.2);
    disc(-13, 2, -26, 13, B, anim({ k: 'breathe', c: [-13, 2, -26], amp: 0.06, speed: 2.6 }));
    ring(-13, 2, -27, 15, 1.8, B, 0, Math.PI / 2);
    tube([-13, 2, -28], [-13, -10, -28], 2, 1, B, spin([-13, 2, -28], 0.7));
    const lever = has('lockbox') ? 'lockbox' : 'body';
    tube([20, -8, -26], [20, 12, -26], 3, 3, lever); orb(20, 12, -27, 4.4, 4.4, 3.4, lever, 0, 0.6);
    for (const y of [-14, 18]) box(42, y, -23, 3, 5, 3, 'body', 0, 2.8);
    for (const s of [-1, 1]) {
      // A chain to a clamp.
      const c = sway([s * 44, -12, -6], 0.1, 1.2, s);
      for (let i = 0; i < 7; i++) { const t = i / 6; ring(s * (48 + t * 42), -12 - t * 20 + Math.sin(t * Math.PI) * 9, -8 - t * 6, 5.4, 1.1, S(s), c, i % 2 ? Math.PI / 2 : 0.3); }
      arc([s * 104, -34, -14], 12, s > 0 ? -2.3 : 0.84, s > 0 ? 2.3 : 5.44, 4.2, S(s), c, 12);
      for (let i = 0; i < 3; i++) {
        const z = -14 + i * 14, a = sway([s * 42, 24, z], 0.14, 2.2, i + s);
        tube([s * 42, 22, z], [s * 68, 14, z + 4], 5, 4, 'body', a);
        tube([s * 68, 14, z + 4], [s * 78, 46, z + 2], 4, 1.6, 'body', a);
      }
    }
  },

  // The ghostroot's Resident: an old shard in a cage of its own rings, antlered above, rooted wide below.
  elder(k) {
    const { tube, ring, orb, anim, sway, orbit, B, S, r, jit } = k;
    const bob = anim({ k: 'bob', amp: 2.4, speed: 0.7 });
    orb(0, -14, 0, 17, 30, 13, 'body', bob, 0.18);
    orb(9, -24, 5, 9, 15, 8, 'body', bob, 0.28); orb(-9, -4, -4, 8, 17, 7, 'body', bob, 0.28);
    orb(0, -14, -10, 6, 8, 4.4, B, anim({ k: 'breathe', c: [0, -14, -10], amp: 0.3, speed: 1.4 }), 0.45);
    for (let i = 0; i < 3; i++) ring(0, -12, 0, 44 + i * 5, 1, 'body', orbit([0, -12, 0], (i % 2 ? -1 : 1) * (0.3 + i * 0.12), 0.25 + i * 0.22), 0.25 + i * 0.22);
    const grow = (from, ang, len, thick, depth, region, a, dir) => {
      const to = [from[0] + Math.sin(ang) * len, Math.max(-47, Math.min(47, from[1] + dir * Math.cos(ang) * len)), from[2] + (r() - 0.5) * 10];
      tube(from, to, thick, Math.max(0.5, thick * 0.6), region, a);
      if (depth <= 0) return;
      const forks = 1 + (r() < 0.75 ? 1 : 0);
      for (let j = 0; j < forks; j++) grow(to, ang + (j ? 1 : -1) * (0.25 + r() * 0.4) * (forks > 1 ? 1 : r() < 0.5 ? -1 : 1), len * (0.7 + r() * 0.16), thick * 0.64, depth - 1, region, a, dir);
    };
    for (let i = 0; i < 7; i++) { const f = i / 6 - 0.5, side = f < 0 ? -1 : 1, x = f * 28; grow([x, 14, (r() - 0.5) * 8], f * 2.7 + (r() - 0.5) * 0.2, jit(14 + Math.abs(f) * 46), 3.8, 2 + (Math.abs(f) > 0.2 ? 1 : 0), S(side), sway([x, 14, 0], 0.08, 0.5 + r() * 0.4, i * 1.7), 1); }
    for (let i = 0; i < 4; i++) { const f = i / 3 - 0.5, x = f * 20; grow([x, -38, 0], f * 2.6, jit(22), 2.8, 1, 'body', sway([x, -38, 0], 0.04, 0.5, i), -1); }
  },
};

// The kit's extras, built on virus-art.mjs's add and tube: a tube along a run of points, an arc of one (upright, or level in
// 'xz'), a dome (a bowl when its height is negative), a level disc, a torus round the y axis, a closed loop (level, or
// tilted up to face you).
export function bossKit(k) {
  const { add, tube } = k;
  const path = (pts, r0, r1, region, a = 0) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1), len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]) || 1;
      tube(pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, region, a, Math.min(1, 2.6 / len) * Math.max(0.5, len / 40));
    }
  };
  const arc = (c, R, t0, t1, rr, region, a = 0, n = 10, ry = R, plane = 'xy') => path(Array.from({ length: n + 1 }, (_, i) => { const th = t0 + ((t1 - t0) * i) / n, u = Math.sin(th) * ry; return [c[0] + Math.cos(th) * R, c[1] + (plane === 'xy' ? u : 0), c[2] + (plane === 'xy' ? 0 : u)]; }), rr, rr, region, a);
  const dome = (cx, cy, cz, rx, ry, rz, region, a = 0, step = 0.2, to = Math.PI / 2) => {
    for (let u = 0; u < TAU; u += step) for (let w = 0.12; w <= to; w += step) {
      const ex = Math.cos(u) * Math.sin(w), ey = -Math.cos(w), ez = Math.sin(u) * Math.sin(w);
      add(cx + rx * ex, cy + ry * ey, cz + rz * ez, ex / rx, ey / ry, ez / rz, region, a);
    }
  };
  const flat = (cx, cy, cz, R, region, a = 0, gap = 3.2) => {
    for (let rr = 0; rr <= R; rr += gap) for (let th = 0; th < TAU; th += rr ? 2.6 / rr : 7) add(cx + Math.cos(th) * rr, cy, cz + Math.sin(th) * rr, 0.25 * Math.cos(th), -1, 0.25 * Math.sin(th), region, a);
  };
  const torus = (cx, cy, cz, R, rr, region, a = 0) => {
    for (let th = 0; th < TAU; th += 2.8 / R) for (let ph = 0; ph < TAU; ph += 2.8 / rr) {
      const nx = Math.cos(th) * Math.cos(ph), ny = Math.sin(ph), nz = Math.sin(th) * Math.cos(ph);
      add(cx + Math.cos(th) * R + nx * rr, cy + ny * rr, cz + Math.sin(th) * R + nz * rr, nx, ny, nz, region, a);
    }
  };
  const loop = (cx, cy, cz, R, rr, region, a = 0, tilt = 0, ry = R) => {
    const n = Math.max(8, Math.ceil((TAU * Math.max(R, ry)) / 6));
    path(Array.from({ length: n + 1 }, (_, i) => { const th = (i / n) * TAU, u = Math.sin(th) * ry; return [cx + Math.cos(th) * R, cy + u * Math.sin(tilt), cz + u * Math.cos(tilt)]; }), rr, rr, region, a);
  };
  const has = (id) => k.v.parts.some((p) => p.id === id);
  return { ...k, path, arc, dome, flat, torus, loop, has };
}
