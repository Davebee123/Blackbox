// Damage numbers, one per source (the designer: "make sure individual sources of damage are shown
// separately, especially burn/spike"). When a cycle resolves, every damage instance gets its own number,
// never a merged one: your command's hit, each crit, each burn tick (by burn), each helper or daemon hit,
// damage turned back on the virus, your shield soaking a hit, a heal, encryption eating you, each virus
// attack on you, an interrupt. Each carries an icon for its kind (glyphs.mjs) and says its source in its
// tooltip ("Inject burn −20"). They land one after another in resolution order, a beat apart (STAGGER),
// faster when many are queued so a big cycle plays out in about two seconds; the timeline keeps running.
// Pure: app.js turns the plan into floats (feel.mjs). Look only.

// kind → its icon (a glyphs.mjs name) and what the tooltip calls it. The colour is style.css .fx-float.k-*.
export const KINDS = {
  hit: { icon: 'hit', name: 'Hit' }, // your command's hit (a starburst), and the extra hits it sets off
  spike: { icon: 'spike', name: 'Spike' }, // Spike, your plain hit; a charge (a tell) landing on you
  crit: { icon: 'critDamage', name: 'Crit' }, // bigger and gold on a part, hot on you
  burn: { icon: 'burn', name: 'Burn' }, // a tick of damage over time (the flame)
  helper: { icon: 'daemon', name: 'Helper' }, // a helper's or a daemon's hit
  reflect: { icon: 'countermeasures', name: 'Reflected' }, // damage turned back or rerouted
  shield: { icon: 'shield', name: 'Shield' }, // your shield soaking a hit
  heal: { icon: 'heal', name: 'Heal' },
  encrypt: { icon: 'lock', name: 'Encryption' }, // encryption on you
  interrupt: { icon: 'cut', name: 'Interrupt' }, // you cut an attack
  attack: { icon: 'claw', name: 'Attack' }, // a virus part's attack on you
};

// The beat between two numbers, in seconds: 0.45 for a pair, a little less for each one more, never under
// 0.25, and never so long that the last one lands more than `cap` after the first.
export const STAGGER = { first: 0.45, step: 0.03, floor: 0.25, cap: 2.2, wait: 0.6 };
export function gapFor(n) {
  if (n < 2) return 0;
  const g = Math.max(STAGGER.floor, STAGGER.first - STAGGER.step * (n - 2));
  return Math.min(g, STAGGER.cap / (n - 1));
}

const minus = (n) => `−${n}`;
const on = (label, where) => (where ? `${label} on ${where}` : label);
// The kind a hit on a part is: a crit first (whatever made it), then where it came from.
function partKind(e) {
  if (e.crit) return 'crit';
  if (e.src === 'burn') return 'burn';
  if (e.src === 'helper' || e.src === 'daemon') return 'helper';
  if (e.src === 'reflect' || e.skill === 'blowback') return 'reflect';
  if (e.skill === 'spike' && !e.via) return 'spike';
  return 'hit';
}

// One event → its number, or null if it isn't a damage instance. ctx (all optional): partName(id),
// attackName(id) (a part's attack), skillName(id).
// → { kind, icon, text, label, at: 'part' | 'you', target, join, hostile }
//   join: shows with the number before it (the virus hitting each crewmate at once).
//   hostile: on a part but good for the virus (it repaired, its attack grew): the virus's colour.
export function floatOf(e, ctx = {}) {
  const part = (id) => (id && ctx.partName?.(id)) || '';
  const atk = (id) => (id && ctx.attackName?.(id)) || 'Attack';
  const make = (kind, text, label, at, target = null, join = false) => ({ kind, icon: KINDS[kind].icon, text, label, at, target, join });
  switch (e.type) {
    case 'damage': {
      if (!e.target || typeof e.amount !== 'number') return null;
      const kind = partKind(e);
      const name = e.via || (e.skill && ctx.skillName?.(e.skill)) || (kind === 'spike' ? 'Spike' : 'Hit');
      const what = e.src === 'burn' ? `${name} burn` : e.src === 'daemon' ? `${name} daemon` : name;
      const label = `${what}${e.crit ? ' crit' : ''}${kind === 'reflect' ? ' (reflected)' : ''} ${minus(e.amount)}`;
      return make(kind, minus(e.amount), on(label, part(e.target)), 'part', e.target);
    }
    case 'server-hit': {
      if (!e.amount) return null;
      const kind = e.bounce ? 'reflect' : e.crit ? 'crit' : e.tell ? 'spike' : 'attack';
      const name = e.bounce ? 'Bounced back' : e.source ? atk(e.source) : 'Attack';
      const label = `${name}${e.crit ? ' crit' : e.tell ? ' charge' : ''} ${minus(e.amount)}`;
      return make(kind, minus(e.amount), label, 'you', e.source || null, !!e.who);
    }
    case 'scrambled': return e.amount ? make('attack', minus(e.amount), `Scramble ${minus(e.amount)}`, 'you', e.source || null) : null;
    case 'encrypted': return e.amount ? make('encrypt', minus(e.amount), `${e.corrupt ? 'Corruption' : 'Encryption'} ${minus(e.amount)}`, 'you', e.source || null) : null;
    case 'encrypt': return e.amount ? make('encrypt', `+${e.amount}/cycle`, `Encryption +${e.amount} a cycle`, 'you', e.source || null) : null;
    case 'heal':
      if (!e.amount) return null;
      return e.target ? { ...make('heal', `+${e.amount}`, on(`Repaired +${e.amount}`, part(e.target)), 'part', e.target), hostile: true } : make('heal', `+${e.amount}`, `Heal +${e.amount}`, 'you');
    case 'blocked': return e.shield && e.amount ? make('shield', String(e.amount), `Shield absorbs ${e.amount}`, 'you', e.source || null) : null;
    case 'reroute': return e.target && e.amount ? { ...make('reflect', `+${e.amount} REROUTED`, on(`Rerouted: its attack +${e.amount}`, part(e.target)), 'part', e.target), hostile: true } : null;
    case 'cut': {
      if (!e.target) return null;
      const word = e.phase ? 'PHASE' : e.vent ? 'VENTED' : e.delay ? 'DELAYED' : 'INTERRUPTED';
      return make('interrupt', word, on(`Interrupt: ${word.toLowerCase()}`, part(e.target)), 'part', e.target);
    }
    case 'interrupt': {
      if (!e.target) return null;
      const word = e.tell ? 'STOPPED' : 'DELAYED';
      return make('interrupt', word, on(`Interrupt: ${word.toLowerCase()}`, part(e.target)), 'part', e.target);
    }
  }
  return null;
}

// A batch of events (one resolution, in order) → each damage instance's number and when it lands.
// Every other event lands with the number before it (a BROKEN with the hit that broke the part).
// stagger false (Effects minimal, Motion off): everything at once, and the numbers stack instead.
// start (ms): when the first may land: a cycle plays out in steps (your turn, then your burns and helpers,
// then each attack: combat.mjs stepCycle), so a batch waits its turn behind the last one's numbers (queueAfter).
// → { floats: Map(id → float + { beat, delay }), count, gap (s), total (ms: when the last lands), of(e), delay(e) }
export function plan(events, ctx = {}, { stagger = true, start = 0 } = {}) {
  const floats = new Map();
  let beats = 0;
  for (const e of events) {
    const f = floatOf(e, ctx);
    if (!f) continue;
    if (!f.join || !beats) beats++;
    floats.set(e.id, f);
  }
  const gap = stagger ? gapFor(beats) : 0;
  const delays = new Map();
  let beat = -1, at = 0;
  for (const e of events) {
    const f = floats.get(e.id);
    if (f) {
      if (!f.join || beat < 0) beat++;
      at = (stagger ? Math.round(start) : 0) + Math.round(beat * gap * 1000);
      f.beat = beat;
      f.delay = at;
    }
    delays.set(e.id, at);
  }
  return { floats, count: beats, gap, total: at, of: (e) => floats.get(e.id) || null, delay: (e) => delays.get(e.id) ?? 0 };
}

// Where the next batch starts, given when the last batch's last number lands (ms from now; below 0: it has
// landed): a beat after it, so batches never print on top of each other, but never more than STAGGER.wait
// behind (the board has already moved on).
export function queueAfter(lastIn) {
  if (!(lastIn > -STAGGER.first * 1000)) return 0;
  return Math.max(0, Math.min(STAGGER.wait * 1000, lastIn + STAGGER.first * 1000 * 0.8));
}
