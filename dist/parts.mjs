// What a wild virus is made of (docs/parts-plan.md, phase P1): a basic part (or two copies of it), the family's
// signature part most of the time, and 0 to 2 third parts, 2 to 4 parts in all. data.mjs createVirus builds it from
// this roll; strains, bosses, fixtures and forced genes keep their own shapes.
//
//   basic      one of the family's open basics (FAMILIES[f].parts, pool 'basic', and the Pulse Node), free: each is
//              pressure-matched to the Pulse Node (families.mjs pressureOf's count, held in parts.test.mjs)
//   signature  levels 1–2 always (it teaches the family); then by PARTS.signature. Without it, a second third part
//              takes its slot, free, and only one that doesn't refer to the signature (a spec's sig flag: no Lockbox,
//              Mutex, Mirror or Idle Timer then)
//   thirds     drawn by genes.mjs rollGenome from the family's open pool within the budget (from level 3), struck when
//              they break a compatibility rule
//   strangers  a fight never holds more than one part you've never met (research 0), Pulse Node and signature aside,
//              and a fight with one is never 4 parts
//   lever      from PARTS.lever, exactly one third whose rule makes the default move the wrong one (genes.mjs lever)
//
// Every number a playtest might move is one named entry in PARTS (`developer parts` shows and sets them at runtime).
import { rollGenome, compatible, GENES, MECH_GENES } from './genes.mjs';

export const PARTS = {
  on: true, // the roll (off: every wild virus is built as before the parts plan; golden.test.mjs compares that builder)
  gentle: 3, // below this level: two parts, the signature, no third (and no mutation: combat.mjs encounterVirus)
  pulse: 2 / 3, // a gentle fight's basic is the Pulse Node this often
  signature: [[1, 1], [3, 0.7], [10, 0.55], [20, 0.45]], // the share of fights that bring the signature, from each level
  count: [[1, [1, 0, 0]], [3, [0.3, 0.7, 0]], [8, [0.15, 0.7, 0.15]], [16, [0.1, 0.6, 0.3]], [31, [0.1, 0.5, 0.4]]], // shares of 2, 3 and 4 parts
  elite: 3, // an elite brings at least this many
  duplicate: [[1, 0], [10, 0.1], [16, 1 / 8], [31, 1 / 6]], // a fight of 3 or more parts doubles its basic this often
  copy: 0.6, // each copy of a doubled basic: this share of one's Integrity and damage
  bulk: [[1, 1], [3, 1.06]], // a fight's total Integrity, as a share of its family's two core parts', whatever its part count
  armor: [[1, 1], [14, 0.5]], // by level: the share of its family's ◆ (the Pulse Node's, the signature's and a third's) a rolled fight is held to (0: each part wears its own)
  // A third part's weight in the roll, by gene (1 when it isn't named; a native's floor weight goes on top). The Mimic
  // at 4 (3 in P1): in about half the Ghostroot fights, as before P1, since going quiet on its beat is where reading
  // tells pays most (P2's three new Ghostroot thirds and the floor-2 natives' ×3 had taken it to 44–49%). The Cold
  // Store at 0.5: its late thaw stretches a fight past what a kit without a shield can hold (over 200 wilds at level 30
  // the Warden's swarm kit lost 8.8 points more than its rotation on its fights, 4.1 on fights with no P2 part). The
  // Tripwire at 1.5: P2's three new Ransomware thirds took it from 30% of Ransomware fights at level 30 to 20% (28% now),
  // and quieting a loud part is a key the Bastions carry. The Zip Bomb at 0.5: in two families' pools and the cheapest
  // rule, it was in a third of the fights at every level past 5, over every floor's natives. The Damper at 0: built, on
  // the Worm's list for its playtest page, its Codex card and the room probes, but it rolls only once its own families
  // (the Cryptominer and the Wiper) come with P3 (on the Worm the harness measured it free: -1.8 points a fight).
  // The mechanics list's twenty (docs/mechanics-list.md) at PARTS.mech: 0, as the Damper. They're built, with their
  // playtest pages, Codex cards and probes, but a wild virus rolls none until the designer has played one and kept it
  // (give it its own weight here). At 0.5 they came in about 40% of wild fights from level 10, and the kits', crew,
  // pace and sets balance tests moved with them. `developer parts mech 0.5` rolls them all for a session.
  weight: { mimic: 4, coldstore: 0.5, tripwire: 1.5, zipbomb: 0.5, damper: 0 },
  mech: 0,
  carve: 1, // the share of the thirds' Integrity that comes out of the basic's and the signature's (0: thirds come on top)
  thirdMax: 1.15, // a third part's Integrity never grows past this share of its own (the basic and the signature take the rest)
  // Damage profiles (GAME_RULES.md "Viruses"): every family deals the same over a typical fight at its
  // level, and only the shape differs. The budget is the average of the three families' pre-P1 fights (the Pulse Node
  // and the signature) over PARTS.horizon cycles, in data.mjs nominal's units before the level's damage scale
  // (data.mjs profileBudget), times PARTS.budget; each family splits it into three shapes, its pre-P1 fight's split over
  // a typical fight (10 cycles):
  //   steady  regular hits (the Pulse Node, the basics, the thirds' small hits, the Replicator's fragments)
  //   ramp    damage that grows the longer the fight runs (the Encryptor's stacks): it starts lower and climbs
  //   burst   big hits a cut can stop, and what comes with them (the Scrambler's hit and its Scramble)
  // A rolled fight's parts share their family's profile out by role (PARTS.roles). A role with no part to carry it
  // moves onto the basic: the ramp as a Ratchet (its own stack, one step more every few cycles the basic lives, gone
  // when it breaks), the burst as the basic's hits taking the Scrambler's (its hit and, on the Scrambler's clock, its Scramble).
  profile: { ransomware: { steady: 0.5, ramp: 0.5, burst: 0 }, worm: { steady: 1, ramp: 0, burst: 0 }, ghostroot: { steady: 0.33, ramp: 0, burst: 0.67 } },
  horizon: [[1, 10], [40, 9], [50, 8]], // a typical fight's length by level, in cycles (balance.mjs's wild fights before P1, every subclass: 9.7 at 10, 10.5 at 18, 10.3 at 30, 8.4 at 50)
  budget: 1, // the shared budget's scale (1: the three pre-P1 fights' average)
  // Each part's shape (a part not named: steady if it attacks). A shape its family's profile hasn't is steady there.
  roles: { encryptor: 'ramp', scrambler: 'burst', accumulator: 'burst' },
  ratchet: { from: null, every: null }, // a Ratchet's first step and its beat (null: the Encryptor's first Encrypt and interval)
  burstHit: 1, // the share of the Scrambler's hit a basic carrying the burst takes on
  fast: 0.5, // a part that hits every cycle or two (a Strobe) takes this share of its role's lift (Block takes the same off every hit)
  steadyCarry: true, // a fight with nothing steady: its basic (a Buffer, an Obfuscator) takes its family's Surge
  scrambleCarry: true, // …and its Scramble with it (on the Scrambler's clock)
  pressure: [0.85, 2.5], // a role's parts scale to its share within this range (what's left over goes onto the other attackers)
  cap: 1.3, // …but no single hit past this many of its family's Pulse Node's: past it, the part hits more often instead
  hit: [[1, 1]], // every rolled fight's hits, by level, on top of the pressure share-out
  budgetFrom: 3, // the thirds' budget opens here (2 points, as level 4's)
  // Floors and natives (docs/parts-plan.md P2). A native is a third part first met on one floor (genes.mjs floor). A
  // fight's floor is its server's; a fight with no server (home, SPRAWL-00's strays, a sim) is your floor's, the
  // deepest whose band holds its level (data.mjs floorFor).
  floor: 3, // a native's weight in the roll on its own floor (×, on top of PARTS.weight); elsewhere ×1 once its level allows it
  native: { elite: true, rare: true }, // elites and ★ rare spawns always bring one of their floor's natives (none open there: the nearest floor above's)
  rare: { min: 3, budget: 2 }, // a ★ rare spawn brings at least this many parts, and this many more budget points for its thirds
  kestrel: { floor: 3, share: 0.5 }, // from this floor, this share of guard posts and ICE bring Kestrel's Idle Timer (data.mjs GUARDS)
  lever: 6, // from this level an ordinary fight carries exactly one lever (docs/puzzle-levers.md 5): wild rolls here, guards a Zip Bomb (data.mjs GUARDS) or the Sentinel's seal
};
// A level's value on a step table [[level, value], …]: the last step it has reached.
export const along = (pts, level) => pts.reduce((v, [L, x]) => (level >= L ? x : v), pts[0][1]);
export const signatureShare = (level) => along(PARTS.signature, level);
// A part's shape in its family's profile: 'steady', 'ramp' or 'burst' (null: it doesn't attack).
export function roleOf(spec, family) {
  if (!spec?.attack) return null;
  const r = PARTS.roles[spec.id] || 'steady', prof = PARTS.profile[family] || {};
  return prof[r] > 0 ? r : 'steady';
}
// A Ratchet (a ramp with no Encryptor to carry it, on the basic): a stack like the Encryptor's, one more step every
// `every` cycles from cycle `from` while its part lives. Its total over `until` cycles per point of a step (data.mjs nominal's count: each step ticks from the next cycle):
export const ratchetSpan = (from, every, until = 20) => { let n = 0; for (let c = from; c <= until; c += every) n += until - c; return n; };
// Its stack on cycle `cycle` (combat.mjs cycleStart deals it; the board shows it).
export const heatOf = (p, cycle) => { const r = p?.ratchet; return r && cycle > r.from ? r.amount * (Math.floor((cycle - r.from - 1) / r.every) + 1) : 0; };

const isBasic = (spec) => spec.id === 'pulse' || spec.pool === 'basic';
export const basicsOf = (body, level = 99) => body.parts.filter((p) => isBasic(p) && (p.from || 1) <= level);
export const thirdsOf = (body, level = 99) => body.parts.filter((p) => p.pool === 'third' && (p.from || 1) <= level);
const pick = (rand, xs) => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))];
// A third's weight in the roll: its own (PARTS.weight), times PARTS.floor on the floor it's native to.
export const nativeFloor = (gene) => GENES[gene]?.floor || null;
export const floorWeight = (gene, floor) => (floor && nativeFloor(gene) === floor ? PARTS.floor : 1);
export const weightOf = (gene, floor = null) => (PARTS.weight[gene] ?? (MECH_GENES.has(gene) ? PARTS.mech : 1)) * floorWeight(gene, floor);
// A mechanics-list gene rolls (a wild fight, a breach node, a server room) only while PARTS.mech is above 0.
export const mechRolls = (gene) => !MECH_GENES.has(gene) || PARTS.mech > 0;
const pickBy = (rand, xs, w) => { let x = rand() * xs.reduce((n, y) => n + w(y), 0); for (const y of xs) if ((x -= w(y)) < 0) return y; return xs.at(-1); };
const pickShare = (rand, shares) => { let x = rand() * shares.reduce((a, b) => a + b, 0); for (let i = 0; i < shares.length; i++) if ((x -= shares[i]) < 0) return i; return shares.length - 1; };

// The roll: { basic (its spec), dup (two copies), signature (true: it comes), thirds: [specs], strangers }.
//   rand    its own stream (never the virus's other dice)
//   seen    (spec, family) → true once you've met that part (combat.mjs: research above 0); null: every part counts as met
//   extra   genes the virus carries besides its body's (its mutation, Linked from v2): the thirds must fit beside them
//   floor   the fight's floor: its natives weigh PARTS.floor; rare: a ★ rare spawn (PARTS.rare)
export function rollParts({ family, body, level, rand, elite = false, rare = false, floor = null, seen = null, extra = [] }) {
  const met = (spec) => !seen || spec.id === 'pulse' || !!spec.special || seen(spec, family);
  const basics = basicsOf(body, level), pulse = basics.find((p) => p.id === 'pulse'), sig = body.parts.find((p) => p.special);
  if (level < PARTS.gentle && !elite) {
    const others = basics.filter((p) => p !== pulse); // a stranger basic comes alone: the Pulse Node and the signature are never strangers
    const basic = !others.length || rand() < PARTS.pulse ? pulse : pick(rand, others);
    return { basic, dup: false, signature: true, thirds: [], strangers: met(basic) ? 0 : 1 };
  }
  let n = 2 + pickShare(rand, along(PARTS.count, level));
  if (elite) n = Math.max(n, PARTS.elite);
  if (rare) n = Math.max(n, PARTS.rare.min);
  const weigh = (gene) => weightOf(gene, floor);
  let signature = rand() < signatureShare(level);
  let strangers = 0;
  const stranger = (spec) => !met(spec);
  // The basic: any open one (with no signature, one that attacks: something has to). A stranger basic always comes
  // with known parts.
  const basic = pick(rand, signature ? basics : basics.filter((p) => p.attack));
  if (stranger(basic)) strangers++;
  let dup = n >= 3 && !!basic.attack && rand() < along(PARTS.duplicate, level); // only a basic that attacks doubles
  const pool = thirdsOf(body, level).filter((spec) => weigh(spec.gene) > 0); // a third at weight 0 (the Damper, the mechanics list's) never rolls, even as the last pick left
  const thirds = [];
  const fits = (spec) => !thirds.includes(spec) && (!stranger(spec) || strangers < 1);
  // No signature: a third that doesn't refer to it takes its slot, free. None open: the signature comes after all.
  if (!signature) {
    const free = pool.filter((spec) => !spec.sig && fits(spec) && !compatible([...(body.core || []), ...extra, spec.gene]).length);
    if (free.length) { const t = pickBy(rand, free, (x) => weigh(x.gene)); thirds.push(t); if (stranger(t)) strangers++; } else signature = true; // (its basic attacks either way)
  }
  // The thirds in their own slots, by the budget (genes.mjs rollGenome): none, one or two.
  const slots = Math.max(0, n - 2 - (dup ? 1 : 0));
  if (slots && pool.length) {
    const byGene = new Map(pool.map((spec) => [spec.gene, spec]));
    const genes = rollGenome({ rand, level, family, core: [...(body.core || []), ...extra, ...thirds.map((t) => t.gene)], count: slots, slots, mutations: false, weigh, bonus: (level < 4 && level >= PARTS.budgetFrom ? 2 : 0) + (rare ? PARTS.rare.budget : 0), elite,
      allow: (id, picked) => { const spec = byGene.get(id); if (!spec || (spec.sig && !signature) || thirds.includes(spec)) return false; const sx = picked.filter((x) => stranger(byGene.get(x))).length; return !stranger(spec) || strangers + sx < 1; } });
    for (const id of genes) { const spec = byGene.get(id); thirds.push(spec); if (stranger(spec)) strangers++; }
  }
  // An elite or a ★ rare spawn always brings one of its floor's natives (PARTS.native): in place of its last third, in
  // a free slot, or in its doubled basic's.
  let forced = null;
  if (((elite && PARTS.native.elite) || (rare && PARTS.native.rare)) && floor && level >= PARTS.gentle) {
    const fits = (spec, others) => (!spec.sig || signature) && !compatible([...(body.core || []), ...extra, ...others.map((t) => t.gene), spec.gene]).length && (!stranger(spec) || others.filter(stranger).length + (stranger(basic) ? 1 : 0) < 1);
    // Its floor's natives that can come (none open, or none that fits: a Spare with no signature, say, the nearest
    // floor above's). One already rolled is enough.
    const room = 1 + (dup ? 1 : 0) + (signature ? 1 : 0) + thirds.length < n;
    const keep = room || !thirds.length ? thirds : thirds.slice(0, -1);
    for (let f = floor; f >= 1 && !forced; f--) {
      const natives = pool.filter((spec) => nativeFloor(spec.gene) === f);
      if (!natives.length) continue;
      if (thirds.some((t) => natives.includes(t))) { forced = thirds.find((t) => natives.includes(t)); break; }
      const ok = natives.filter((spec) => fits(spec, keep));
      if (!ok.length) continue;
      const t = pickBy(rand, ok, (x) => weigh(x.gene));
      if (!room && thirds.length) thirds.pop(); else if (!room && dup) dup = false;
      thirds.push(t); forced = t;
      strangers = thirds.filter(stranger).length + (stranger(basic) ? 1 : 0);
    }
  }
  // One lever a fight (docs/puzzle-levers.md 5): from PARTS.lever an ordinary fight carries exactly one part whose rule
  // makes the default move the wrong one (genes.mjs lever). None rolled: one comes in a free slot, else in the doubled
  // basic's, else on top (up to the most its level rolls), else in the last other third's, so the rolled kinds stay. Two or more: the
  // first stays, and each other is rolled again from the thirds that bring none (kept when none fits: below level 9
  // every third open is a lever, and a 4-part fight keeps its 4). Elites bring two that pull against each other (P3).
  let lever = null;
  if (!elite && level >= PARTS.lever) {
    const isLever = (spec) => !!GENES[spec.gene]?.lever && weigh(spec.gene) > 0;
    const most = 2 + along(PARTS.count, level).findLastIndex((x) => x > 0); // the most parts the level's count rolls
    const count = () => 1 + (dup ? 1 : 0) + (signature ? 1 : 0) + thirds.length;
    const ok = (spec, others) => !others.includes(spec) && (!spec.sig || signature) && !compatible([...(body.core || []), ...extra, ...others.map((t) => t.gene), spec.gene]).length && (!stranger(spec) || others.filter(stranger).length + (stranger(basic) ? 1 : 0) < 1);
    for (const t of thirds.filter(isLever).slice(1)) {
      const rest = thirds.filter((x) => x !== t), swap = pool.filter((spec) => !isLever(spec) && weigh(spec.gene) > 0 && ok(spec, rest));
      if (swap.length) thirds[thirds.indexOf(t)] = pickBy(rand, swap, (x) => weigh(x.gene));
    }
    lever = thirds.find(isLever) || null;
    if (!lever) {
      const room = count() < n || dup || count() < Math.max(n, most);
      const other = (t) => t !== forced && nativeFloor(t.gene) !== floor; // a floor's natives are its own: the lever spares them
      const drop = room ? null : thirds.findLast(other) || thirds.findLast((t) => t !== forced) || null, keep = thirds.filter((t) => t !== drop);
      const can = pool.filter((spec) => isLever(spec) && ok(spec, keep)); // none you've met, with a stranger already here: the stranger is the fight's lesson
      if (can.length) {
        lever = pickBy(rand, can, (x) => weigh(x.gene));
        if (drop) thirds[thirds.indexOf(drop)] = lever;
        else { if (count() >= n && dup) dup = false; thirds.push(lever); }
      }
    }
    strangers = thirds.filter(stranger).length + (stranger(basic) ? 1 : 0);
  }
  // A new kind's first fight has 2 or 3 parts, never 4.
  let total = 1 + (dup ? 1 : 0) + (signature ? 1 : 0) + thirds.length;
  if (strangers && total > 3) { const i = thirds.findLastIndex((t) => !stranger(t) && t !== forced && t !== lever); if (i >= 0) thirds.splice(i, 1); else dup = false; total--; }
  return { basic, dup, signature, thirds, strangers, native: forced || null, lever };
}
