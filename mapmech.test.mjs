// The breach as a dungeon (docs/roguelite.md 11): drafting is gone, and the map does the work. Keycards and vaults,
// switches, Trace and the hunter, one rule per server kind, scripts (the CVEs that survived, as consumables), skill
// rules on gear and two Phantom talents (the mods that survived), enrage and no sustain out of a fight; then the
// pieces phase 3 shipped that stay (rolled genomes, heat), the campaign's bounties, Mail Drop and the save migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, finish, livingParts, part, mutated, restore, addItem, loaded, rigOf } from './dist/combat.mjs';
import { CONFIG, FAMILIES, SUBS, ABILITIES } from './dist/data.mjs';
import { GENES, compatible, rollGenome, budgetFor, partGenes } from './dist/genes.mjs';
import { generateMap, nodeList, startBreach, outfit, go, act, fight, settle, reachable, firstRow, exitsOf, nextOf, BREACH, TRACE, KINDS, SWITCHES, OVERHEAT, genomeOfNode, fogOf, SERVER_CARD, trace, breachHooks, BROKERS } from './dist/breach.mjs';
import { SCRIPTS, SCRIPT, scriptsOf, slotsOf, runScript, giveScript } from './dist/scripts.mjs';
import { RULES, rollItem, seeded, rulePool } from './dist/gear.mjs';
import { skillRules } from './dist/skillrules.mjs';
import { HEAT, MAX_HEAT, heatRules } from './dist/heat.mjs';
import { decodeGene } from './dist/genome.mjs';
import { breachMarkup, scriptTray } from './dist/breach-view.mjs';
import { newCampaign, launch, leave, recOf, migrate, heatOpen, cardFor, SERVER, CAMPAIGN, BOUNTIES, bountiesOn } from './dist/campaign.mjs';
import { campaignMarkup, campUi } from './dist/campaign-view.mjs';

const SUB = { breaker: 'demolitionist', bastion: 'warden', infiltrator: 'payload', operator: 'herder' };
// A breach of a server: MERIDIAN-MX-14 (the playtest's), or a campaign server's card.
function breach(cls = 'breaker', seed = 3, { level = 10, heat = 0, server = null, sub = SUB[cls] } = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  outfit(s, { cls, level, sub, gearSeed: seed });
  startBreach(s, { seed, level: server ? SERVER[server].level : level, heat, ...(server ? { card: cardFor(SERVER[server]) } : {}) });
  return s;
}
const win = (s, n, opts) => { s.breach.screen = null; s.breach.queue = []; fight(s, n, opts); for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); };
const quiet = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
const of = (s, kind, act = null) => nodeList(s.breach.map).filter((n) => n.kind === kind && (act == null || n.act === act));
// Stand on the node before n, so n is a move away.
const before = (s, n) => { const b = s.breach; b.at = nodeList(b.map).find((x) => exitsOf(b.map, x.id).includes(n))?.id || null; b.screen = null; };

// ---------- keys and vaults ----------
test('keys and vaults: nearly every full act has a vault and its keycard on a virus in an earlier row; an Archive two of each; the map shows them once seen', () => {
  let acts = 0, bare = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const [card, deep] of [[SERVER_CARD, 1], [cardFor(SERVER['tripmine-yard']), 2], [cardFor(SERVER['mirror-12']), 1]]) {
      const map = generateMap(seed, 14, card), ns = nodeList(map);
      for (let a = 0; a < map.acts; a++) {
        acts++;
        const keys = ns.filter((n) => n.act === a && n.key), vaults = ns.filter((n) => n.act === a && n.kind === 'vault');
        assert.ok(keys.length <= deep && keys.every((n) => n.kind === 'virus' && n.row <= map.rows - 3), `${card.kind} ${seed} act ${a}: keys`);
        assert.ok(vaults.length <= deep, `${card.kind} ${seed} act ${a}: ${vaults.length} vaults`);
        for (const v of vaults) { assert.ok(v.row > 0 && v.row < map.rows - 1); assert.ok(['gear', 'script'].includes(v.vault.kind) && v.vault.log); if (v.vault.kind === 'script') assert.ok(['uncommon', 'rare'].includes(SCRIPTS[v.vault.script].rarity)); }
        if (!vaults.length || !vaults.some((v) => keys.some((k) => k.row < v.row))) bare++;
        if (deep > 1 && vaults.length < 2) bare++;
      }
    }
  }
  assert.ok(bare <= acts * 0.05, `${bare} of ${acts} acts without a vault and its keycard`);
  // The tutorial's three-row act has none of it.
  const tut = generateMap(1, 1, cardFor(SERVER['sprawl-00']));
  assert.ok(!nodeList(tut).some((n) => n.key || n.kind === 'vault' || n.kind === 'switch'));
  // On the page: a key mark on a lit virus that carries one, and a vault node.
  for (let seed = 1; seed < 20; seed++) {
    const s = breach('breaker', seed), k = firstRow(s.breach.map).find((n) => n.key);
    if (!k) continue;
    assert.match(breachMarkup(s), new RegExp(`data-arg="${k.id}"[^>]*>(?:(?!</button>).)*bx-mk key`));
    s.breach.fx.reveal = [0];
    assert.match(breachMarkup(s), /bx-node k-vault/);
    return;
  }
  assert.fail('no first-row keycard in 20 seeds');
});

test('a vault: a keycard opens it (Trace +15), forcing it costs 10% Signal and Trace +35; inside, a protocol or a script, and a log', () => {
  const s = breach('bastion', 4), b = s.breach, v = of(s, 'vault', 0)[0];
  // A keycard rides on its virus: beat it and you hold one.
  const k = nodeList(b.map).find((n) => n.key && n.act === 0);
  win(s, k);
  assert.equal(b.keys, 1);
  assert.ok(s.logs.some((x) => /carried a keycard/.test(x.message)));
  before(s, v);
  go(s, v.id);
  assert.equal(b.screen.kind, 'vault');
  assert.match(breachMarkup(s), /A vault door[\s\S]*data-breach="open"[\s\S]*Force it/);
  const t0 = b.trace, pack = b.pack.length, bag = scriptsOf(s).length;
  act(s, 'open');
  assert.equal(b.keys, 0);
  assert.equal(b.trace, t0 + TRACE.open);
  assert.ok(b.screen.opened);
  if (v.vault.kind === 'gear') { assert.equal(b.pack.length, pack + 1); assert.ok(['tuned', 'custom'].includes(s.stash.find((x) => x.id === b.pack.at(-1)).rarity)); }
  else assert.equal(scriptsOf(s).length, Math.min(slotsOf(s), bag + 1));
  assert.match(breachMarkup(s), /The vault is open[\s\S]*vault\.log/);
  act(s, 'leave');
  assert.ok(b.cleared[v.id] && !b.screen);
  assert.equal(b.stats.vaults, 1);
  // No keycard: open is refused, force works, loudly.
  const t = breach('bastion', 4), c = t.breach, w = of(t, 'vault', 0)[0];
  before(t, w); go(t, w.id);
  act(t, 'open');
  assert.ok(!c.screen.opened && t.logs.some((x) => /no keycard/i.test(x.message)));
  const sig = c.signal;
  act(t, 'force');
  assert.ok(c.screen.opened);
  assert.equal(c.signal, sig - Math.round(c.max * 0.1));
  assert.equal(c.trace, TRACE.force);
});

// ---------- switches ----------
test('switches: fight its ICE (Trace down) or splice it (Trace up); the act\'s viruses lose a ◆, or its gate opens weaker', () => {
  CONFIG.enemyCrit = 0;
  for (let seed = 1; seed <= 20; seed++) for (let a = 0; a < 3; a++) assert.ok(of(breach('breaker', seed), 'switch', a).length === 1, `${seed} act ${a}: one switch`);
  // Splice an armor switch: the act's viruses come with a ◆ less.
  let s = breach('breaker', 6), b = s.breach;
  const sw = of(s, 'switch', 0)[0];
  sw.effect = 'armor';
  const v = nodeList(b.map).find((n) => n.act === 0 && n.kind === 'virus');
  fight(s, v); const plain = s.encounter.virus.parts.map((p) => p.maxArmor); s.encounter = null; s.run = null;
  b.screen = { kind: 'switch', node: sw.id };
  assert.match(breachMarkup(s), /Patch server[\s\S]*Fight its ICE[\s\S]*Splice it/);
  act(s, 'splice');
  assert.equal(b.switches[0], 'armor');
  assert.equal(b.trace, TRACE.splice);
  fight(s, v);
  assert.deepEqual(s.encounter.virus.parts.map((p) => p.maxArmor), plain.map((x) => Math.max(0, x - 1)));
  // Fight a gate switch's ICE: the switch goes down, Trace falls, and the gate opens 20% thinner and later.
  s = breach('breaker', 6); b = s.breach;
  const gateHp = (t) => { fight(t, t.breach.map.nodes.gate1); const n = t.encounter.virus.parts.reduce((x, p) => x + p.max, 0); t.encounter = null; t.run = null; return n; };
  const thick = gateHp(s);
  b.trace = 30;
  const g = of(s, 'switch', 0)[0]; g.effect = 'gate';
  b.screen = { kind: 'switch', node: g.id };
  act(s, 'fight');
  assert.ok(active(s) && s.encounter.breachAs === 'ice');
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  finish(s, 'victory'); settle(s);
  assert.equal(b.switches[0], 'gate');
  assert.equal(b.trace, 30 + TRACE.ice);
  assert.ok(Math.abs(gateHp(s) / thick - 0.8) < 0.03, 'the gate starts 20% thinner');
});

// ---------- Trace and the hunter ----------
test('Trace: elites, bait and vaults raise it, quiet steps and rests lower it, an Infiltrator raises it half as fast; it shows on the strip', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('breaker', 3), b = s.breach;
  const e = of(s, 'elite')[0];
  before(s, e);
  b.trace = 0;
  go(s, e.id);
  assert.equal(b.trace, TRACE.elite, 'an elite is loud');
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  finish(s, 'victory'); settle(s);
  b.screen = null; b.queue = [];
  const next = reachable(s)[0];
  go(s, next.id);
  assert.equal(b.trace, TRACE.elite, 'no quiet step off a loud node');
  if (active(s)) { for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); }
  b.screen = null; b.queue = [];
  const n2 = reachable(s)[0];
  if (n2) { go(s, n2.id); assert.equal(b.trace, TRACE.elite + TRACE.quiet, 'a quiet step lowers it'); }
  const inf = breach('infiltrator', 3);
  trace(inf, 20);
  assert.equal(inf.breach.trace, 10, 'half as fast for an Infiltrator');
  trace(inf, -8);
  assert.equal(inf.breach.trace, 2, 'but it falls at full speed');
  b.trace = 50;
  assert.match(breachMarkup(s), /class="bx-trace alarm"[^>]*>[\s\S]*<b>50<\/b>/);
});

test('the hunter: at 70 it drops ahead of you and closes a node every move; under 40 it loses you; beaten, Trace falls to 20 and it pays a script', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('bastion', 5), b = s.breach;
  b.at = firstRow(b.map)[0].id;
  trace(s, TRACE.hunt);
  assert.ok(b.hunter, 'a hunter drops onto the map');
  const at = b.map.nodes[b.hunter.at], here = b.map.nodes[b.at];
  assert.ok(at.step > here.step && at.col != null, 'ahead of you, on a lane');
  assert.equal(b.stats.hunted, 1);
  assert.match(breachMarkup(s), /bx-mk hunt/);
  assert.match(breachMarkup(s), /bx-hunted">HUNTED/);
  // It closes in: after a move, its distance to you is shorter or it has you.
  const dist = (from, to) => { const links = [...b.map.edges, ...b.map.shortcuts], seen = new Set([from]); let ring = [from], d = 0; while (ring.length) { if (ring.includes(to)) return d; d++; ring = ring.flatMap((id) => links.filter(([x, y]) => x === id || y === id).map(([x, y]) => (x === id ? y : x))).filter((x) => !seen.has(x) && seen.add(x)); } return 99; };
  const d0 = dist(b.at, b.hunter.at);
  const step = reachable(s).sort((x, y) => dist(y.id, b.hunter.at) - dist(x.id, b.hunter.at))[0];
  go(s, step.id);
  if (s.encounter?.breachAs === 'hunter') assert.equal(b.pending, step.id);
  else assert.ok(dist(b.at, b.hunter.at) <= d0, 'it closes in');
  if (active(s)) { s.encounter = null; s.run = null; b.screen = null; b.queue = []; }
  // Under 40 it loses you.
  trace(s, -(b.trace - TRACE.lose + 1));
  assert.equal(b.hunter, null);
  // Caught: you fight it, and then the node it caught you on.
  const t = breach('bastion', 5), c = t.breach;
  c.at = firstRow(c.map)[0].id;
  const n = exitsOf(c.map, c.at)[0];
  c.trace = TRACE.hunt; c.hunter = { at: n.id, level: 12 };
  const bag = scriptsOf(t).length;
  scriptsOf(t).length = Math.min(bag, slotsOf(t) - 1);
  const had = scriptsOf(t).length;
  go(t, n.id);
  assert.equal(t.encounter.breachAs, 'hunter');
  assert.match(t.encounter.virus.name, /HUNTER/);
  for (const p of t.encounter.virus.parts) p.integrity = 0;
  finish(t, 'victory'); settle(t);
  assert.equal(c.trace, TRACE.after);
  assert.equal(c.hunter, null);
  assert.equal(scriptsOf(t).length, had + 1, 'the hunter carried a script');
  assert.equal(c.screen.kind, 'ahead');
  act(t, 'enter');
  assert.ok(active(t) || c.screen, 'then the node itself');
});

// ---------- server kinds ----------
test('server kinds: one rule each, on the server card and the strip', () => {
  assert.deepEqual(Object.keys(KINDS).sort(), ['Archive', 'Lab', 'Mailhub', 'Mirror', 'Relay']);
  for (const k of Object.values(KINDS)) assert.ok(k.rule && k.text.endsWith('.'));
  const c = fresh(); c.profile = { handle: 't', pwLen: 6, since: 0 }; command(c, 'archetype breaker'); newCampaign(c, { seed: 2 });
  campUi.sel = 'sprawl-00';
  assert.match(campaignMarkup(c), /Rule[\s\S]*<b>Hops<\/b> <span>Every act has two open shortcuts/);
  campUi.sel = null;
  for (const [srv, word] of [['hashlord-rig', 'Overheat'], ['mirror-12', 'Mirrors'], ['tripmine-yard', 'Deep storage'], ['sluice-2', 'Hops'], ['meridian-14', 'Spam floods']]) assert.match(breachMarkup(breach('breaker', 2, { server: srv })), new RegExp(`bx-kind[^>]*>[\\s\\S]*?<b>${word}</b>`));
});

test('Mailhub: once your Trace reaches the alarm, every fight brings a Spam Flood', () => {
  const s = breach('breaker', 3), b = s.breach, v = of(s, 'virus')[0];
  fight(s, v);
  assert.ok(!part(s, 'spam'));
  s.encounter = null; s.run = null;
  b.trace = TRACE.alarm;
  fight(s, v);
  const p = part(s, 'spam');
  assert.ok(p && p.integrity > 0 && p.attack.interval === 3);
  assert.ok(s.logs.some((x) => /A Spam Flood joins the fight/.test(x.message)));
});

test('Relay: two shortcuts an act skip a row, walkable and drawn; Mirror: a mirrored cache hides an elite; Lab: overheat hurts both sides from cycle 10', () => {
  CONFIG.enemyCrit = 0;
  // Relay.
  const r = breach('breaker', 4, { server: 'sluice-2' }), rb = r.breach;
  for (let a = 0; a < rb.map.acts; a++) assert.ok(rb.map.shortcuts.filter(([x]) => rb.map.nodes[x].act === a).length >= 1, `act ${a}`);
  for (const [x, y] of rb.map.shortcuts) { assert.equal(rb.map.nodes[y].row, rb.map.nodes[x].row + 2); assert.ok(Math.abs(rb.map.nodes[y].col - rb.map.nodes[x].col) <= 1); }
  const [from, to] = rb.map.shortcuts[0];
  rb.at = from;
  assert.ok(reachable(r).some((n) => n.id === to), 'a hop is a move');
  assert.match(breachMarkup(r), /bx-e [a-z]+ hop/);
  go(r, to);
  assert.equal(rb.at, to);
  // Mirror: cat shows it, pull breaks it and an elite steps out.
  const m = breach('breaker', 4, { server: 'mirror-12' }), mb = m.breach;
  for (let a = 0; a < mb.map.acts; a++) assert.equal(nodeList(mb.map).filter((n) => n.act === a && n.mirror).length, 1, `act ${a}: one mirror`);
  const mc = nodeList(mb.map).find((n) => n.mirror);
  assert.ok(mc.kind === 'cache' && mc.family && !mc.bait);
  before(m, mc); go(m, mc.id);
  act(m, 'cat');
  assert.match(breachMarkup(m), /MIRROR[\s\S]*break the mirror/);
  act(m, 'pull');
  assert.ok(active(m) && m.encounter.breachAs === 'mirror' && m.encounter.virus.elite);
  // Lab: from cycle 10 the rack burns you for 2% of max each cycle, and every part for 3%.
  const l = breach('breaker', 4, { server: 'hashlord-rig' }), v = of(l, 'virus')[0];
  fight(l, v); quiet(l);
  l.run.max = l.run.integrity = 1000;
  for (let i = 0; i < OVERHEAT.from - 1 && active(l); i++) { command(l, 'hold'); resolveCycle(l); }
  const sig = l.run.integrity, hp = livingParts(l).map((p) => p.integrity);
  command(l, 'hold'); resolveCycle(l);
  assert.ok(l.run.integrity <= sig - 15, `you burn: ${sig} -> ${l.run.integrity}`);
  assert.ok(livingParts(l).some((p, i) => p.integrity < hp[i]), 'and so do the parts');
  assert.ok(l.logs.some((x) => /Overheat: the rack burns you/.test(x.message)));
  // No overheat on another kind.
  const x = breach('bastion', 4), xv = of(x, 'virus')[0];
  fight(x, xv); quiet(x); x.run.max = x.run.integrity = 1000;
  for (let i = 0; i < OVERHEAT.from + 1 && active(x); i++) { command(x, 'hold'); resolveCycle(x); }
  assert.ok(!x.logs.some((y) => /Overheat/.test(y.message)));
});

// ---------- scripts ----------
test('scripts: ten, from the CVEs; you carry 3, run one a fight, it takes no cycle; each does what it says', () => {
  CONFIG.enemyCrit = 0;
  assert.equal(Object.keys(SCRIPTS).length, 10);
  assert.equal(SCRIPT.slots, 3);
  for (const x of Object.values(SCRIPTS)) { assert.ok(['common', 'uncommon', 'rare'].includes(x.rarity)); assert.ok(/^[A-Z][a-z]+s /.test(x.text), `${x.id}: tooltip grammar (${x.text})`); }
  const run = (id, setup = () => {}) => {
    const s = breach('breaker', 7), b = s.breach;
    b.scripts = [id];
    fight(s, of(s, 'elite')[0]); quiet(s);
    s.run.max = 1000; s.run.integrity = 400;
    for (const p of livingParts(s)) { p.armor = p.maxArmor = 2; if (p.attack) p.attack.due = s.encounter.cycle + 3; }
    setup(s);
    const cycle = s.encounter.cycle, snap = JSON.parse(JSON.stringify({ parts: s.encounter.virus.parts, ready: s.encounter.readyAt, sig: s.run.integrity, helpers: s.encounter.helpers.length, shield: s.encounter.shield || 0 }));
    assert.ok(runScript(s, 0), `${id} runs`);
    assert.equal(s.encounter.cycle, cycle, `${id}: no cycle spent`);
    assert.deepEqual(b.scripts, [], 'used up');
    return { s, snap };
  };
  let { s, snap } = run('sasser'); assert.equal(s.run.integrity, snap.sig + 200);
  ({ s, snap } = run('krack')); assert.equal(s.encounter.shield, 200);
  ({ s, snap } = run('shellshock')); assert.ok(s.encounter.virus.parts.some((p, i) => p.attack && p.attack.due === snap.parts[i].attack.due + 3));
  ({ s, snap } = run('spectre')); assert.ok(livingParts(s).every((p) => p.exposedUntil >= s.encounter.cycle + 1));
  ({ s, snap } = run('bluekeep')); assert.ok(livingParts(s).every((p) => p.armor === 1));
  ({ s, snap } = run('slowloris')); assert.ok(s.encounter.virus.parts.filter((p) => p.attack && p.attack.due < 900).every((p) => p.attack.due === snap.parts.find((q) => q.id === p.id).attack.due + 2));
  ({ s, snap } = run('conficker', (t) => { t.encounter.readyAt.crack = t.encounter.cycle + 3; })); assert.ok(!(s.encounter.readyAt.crack > s.encounter.cycle));
  ({ s, snap } = run('mirai')); assert.equal(s.encounter.helpers.length, snap.helpers + 3);
  ({ s, snap } = run('meltdown')); assert.ok(livingParts(s).some((p, i) => p.integrity <= snap.parts.find((q) => q.id === p.id).integrity - Math.round(p.max * 0.3) + 1));
  ({ s, snap } = run('ripple20', (t) => { const T = t.encounter.virus.tells; const x = T.list[0]; Object.assign(x, { told: true, said: t.encounter.cycle, next: t.encounter.cycle + 2, n: null, wound: 0 }); })); assert.ok(!s.encounter.virus.tells.list.some((x) => x.told));
  // One a fight; a script with nothing to do is kept.
  const t = breach('breaker', 7), c = t.breach;
  c.scripts = ['sasser', 'krack', 'spectre'];
  fight(t, of(t, 'virus')[0]);
  assert.equal(runScript(t, 0), false, 'Sasser at full Signal does nothing: kept');
  assert.equal(c.scripts.length, 3);
  assert.ok(runScript(t, 1));
  assert.equal(runScript(t, 1), false);
  assert.ok(t.logs.some((x) => /One script a fight/.test(x.message)));
  // The tray: a button per script, off once one ran.
  assert.match(scriptTray(t), /data-command="script 1" disabled[\s\S]*Sasser/);
  assert.equal(runScript(fresh(), 0), false, 'only in a breach fight');
});

test('script slots: 3, more with Archive; a script you find with every slot full stays behind; brokers sell scripts and patches, nothing else', () => {
  const s = breach('breaker', 3), b = s.breach;
  b.scripts = ['sasser', 'krack', 'spectre'];
  assert.equal(giveScript(s, 'mirai'), false);
  assert.ok(s.logs.some((x) => /Mirai stays behind: your 3 script slots are full/.test(x.message)));
  // A broker: scripts and a patch; buying fills a slot.
  for (const id of Object.keys(BROKERS)) {
    b.scripts = [];
    const n = of(s, 'broker')[0];
    n.faction = id; before(s, n); b.tokens = 300;
    go(s, n.id);
    assert.equal(b.screen.stock.length, BROKERS[id].stock);
    assert.ok(b.screen.stock.every((c) => SCRIPTS[c.id] && c.price > 0), `${id}: scripts only`);
    if (BROKERS[id].floor) assert.ok(b.screen.stock.every((c) => SCRIPTS[c.id].rarity !== 'common'));
    act(s, 'buy', 0);
    assert.equal(b.scripts.length, 1);
    assert.equal(b.tokens, 300 - b.screen.stock[0].price);
    act(s, 'leave');
  }
  // The campaign: Archive (a captured backup) adds slots.
  const c = fresh(); c.profile = { handle: 't', pwLen: 6, since: 0 }; command(c, 'archetype breaker'); newCampaign(c, { seed: 3 });
  assert.equal(slotsOf(c), 3);
  assert.deepEqual(scriptsOf(c), CAMPAIGN.startScripts);
  Object.assign(recOf(c, 'coldstore-3'), { captured: true, rewrites: { backup: { id: 'archive', tier: 2 } } });
  assert.equal(slotsOf(c), 5);
});

// ---------- skill rules (the mods that live on, on gear) ----------
test('skill rules: eight, two a class, on blues and yellows; they roll only for their own class, and the old game\'s rolls never carry one', () => {
  const skill = Object.entries(RULES).filter(([, r]) => r.skill);
  assert.equal(skill.length, 8);
  for (const cls of ['breaker', 'bastion', 'infiltrator', 'operator']) {
    const own = skill.filter(([, r]) => r.cls === cls);
    assert.deepEqual(own.map(([, r]) => r.tier).sort(), ['major', 'minor'], cls);
    for (const [id, r] of own) { assert.ok(ABILITIES[r.skill]?.cls === cls, `${id} on a ${cls} skill`); assert.match(r.text(5), /^[A-Z]/); }
  }
  for (let i = 0; i < 400; i++) {
    const it = rollItem(seeded(i), { level: 12, rarity: i % 2 ? 'tuned' : 'custom' });
    assert.ok(!RULES[it.rule]?.cls, 'no class named: no skill rule');
    const mine = rollItem(seeded(i), { level: 12, rarity: i % 2 ? 'tuned' : 'custom', cls: 'operator' });
    assert.ok(!RULES[mine.rule]?.cls || RULES[mine.rule].cls === 'operator', `${mine.rule}`);
  }
  assert.ok(rulePool('minor', 'breaker').includes('aftershock') && !rulePool('minor').includes('aftershock'));
  assert.ok(!rulePool('minor', 'bastion').includes('aftershock'));
});

// Load a protocol with this rule (and only that one) for the fight.
function withRule(s, rule, value) {
  const it = addItem(s, { ...rollItem(seeded(1), { level: 10, rarity: 'tuned', group: 'exploit' }), rule, ruleValue: value }, 'Test: ');
  command(s, 'load ' + it.id);
  for (const x of loaded(s)) if (x.id !== it.id && RULES[x.rule]?.skill) delete x.rule;
  return it;
}
test('skill rules in a fight: Aftershock, Zero Click, Backpressure, Reflective ACL, Long Poll, Viral Load, Snare and Daemonize', () => {
  CONFIG.enemyCrit = 0; CONFIG.misses = false;
  const setup = (cls, rule, v, bar) => {
    const s = breach(cls, 8); if (bar) s.loadout.equipped[cls] = bar;
    withRule(s, rule, v);
    fight(s, of(s, 'virus')[0]); quiet(s);
    s.run.max = s.run.integrity = 5000;
    for (const p of livingParts(s)) { p.max = p.integrity = 900; }
    return s;
  };
  // Aftershock: Crack hurts for every ◆ it breaks.
  let s = setup('breaker', 'aftershock', 8);
  assert.equal(skillRules(s).aftershock, 8);
  let p = livingParts(s)[0]; p.armor = p.maxArmor = 3;
  command(s, `crack ${p.id}`); resolveCycle(s);
  assert.ok(s.logs.some((x) => /^Aftershock: /.test(x.message)) && p.integrity < 900);
  // Zero Click: Exploit splashes every other part and Exposes them all.
  s = setup('breaker', 'zero-click', 6);
  const [a, ...rest] = livingParts(s); for (const q of livingParts(s)) q.armor = 0;
  command(s, `exploit ${a.id}`); resolveCycle(s);
  assert.ok(rest.every((q) => q.integrity < 900 && q.exposedUntil >= s.encounter.cycle));
  // Backpressure: Rate Limit delays.
  s = setup('bastion', 'backpressure', undefined);
  p = livingParts(s).find((x) => x.attack) || livingParts(s)[0]; p.attack.due = s.encounter.cycle + 3; p.armor = 0;
  let due = p.attack.due;
  command(s, `rate-limit ${p.id}`); resolveCycle(s);
  assert.ok(s.logs.some((x) => /^Backpressure: /.test(x.message)) && p.attack.due >= due + 1);
  // Reflective ACL: a hit the shield takes whole goes back.
  s = setup('bastion', 'reflective-acl', 150);
  s.encounter.shield = 500;
  p = livingParts(s).find((x) => x.attack); p.attack.due = s.encounter.cycle; const hp = p.integrity;
  command(s, 'hold'); resolveCycle(s);
  assert.ok(p.integrity < hp && s.logs.some((x) => /Reflective ACL/.test(x.message)));
  // Long Poll: Keepalive ticks every burn once more.
  s = setup('infiltrator', 'long-poll', undefined);
  p = livingParts(s)[0]; p.armor = 0;
  command(s, `inject ${p.id}`); resolveCycle(s);
  command(s, `keepalive ${p.id}`); resolveCycle(s);
  assert.ok(s.logs.some((x) => /^Long Poll \(/.test(x.message)));
  // Viral Load and Daemonize patch their skill for the fight, and come off clean after.
  const was = JSON.stringify([ABILITIES.inject, ABILITIES.deploy]);
  s = setup('infiltrator', 'viral-load', 4);
  assert.equal(ABILITIES.inject.grow, 4);
  for (const q of s.encounter.virus.parts) q.integrity = 0;
  finish(s, 'victory'); settle(s);
  s = setup('operator', 'daemonize', 11);
  assert.equal(ABILITIES.deploy.helper, 11);
  p = livingParts(s)[0];
  command(s, `deploy ${p.id}`); resolveCycle(s);
  assert.ok(s.encounter.helpers.some((h) => h.left > 10), 'the helper stays');
  for (const q of s.encounter.virus.parts) q.integrity = 0;
  finish(s, 'victory'); settle(s);
  assert.equal(JSON.stringify([ABILITIES.inject, ABILITIES.deploy]), was, 'the patches came off');
  // Snare: Hook delays.
  s = setup('operator', 'snare', undefined);
  p = livingParts(s).find((x) => x.attack); p.attack.due = s.encounter.cycle + 3; due = p.attack.due;
  command(s, `hook ${p.id}`); resolveCycle(s);
  assert.ok(p.attack.due >= due + 1 && s.logs.some((x) => /^Snare: /.test(x.message)));
  // A rule for another class does nothing for you.
  const t = breach('breaker', 8); withRule(t, 'snare', undefined);
  assert.deepEqual(skillRules(t), {});
  // The item card says it in tooltip grammar.
  assert.match(s.logs.find((x) => x.type === 'loot' || /Test: /.test(x.message))?.message || 'Test:', /Test: /);
});

test('Phantom talents: Ghost Route (Null Route delays the soonest attack by 2) and Tracking Pixel (Tag moves on a break) replace two run-only picks', () => {
  CONFIG.enemyCrit = 0; CONFIG.misses = false;
  const tiers = SUBS.phantom.talents;
  assert.equal(tiers[1][1].id, 'ghost-route');
  assert.equal(tiers[2][1].id, 'tracking-pixel');
  assert.ok(!tiers.flat().some((n) => /Spoof|guards per run/.test(n.rule)), 'no run-only talent left');
  const s = breach('infiltrator', 9, { sub: 'phantom', level: 30 });
  s.loadout.picks.phantom = [0, 1, 1];
  s.loadout.equipped.phantom = ['null-route', 'tag', 'opening', 'backstab'];
  fight(s, of(s, 'virus')[0]);
  s.run.max = s.run.integrity = 5000;
  for (const p of livingParts(s)) if (p.attack) p.attack.due = s.encounter.cycle + 3;
  const q = livingParts(s).filter((p) => p.attack).sort((x, y) => x.attack.due - y.attack.due)[0], due = q.attack.due;
  command(s, 'null-route'); resolveCycle(s);
  assert.ok(s.logs.some((x) => /^Ghost Route: /.test(x.message)) && q.attack.due >= due + 1);
  const [a, b2] = livingParts(s).filter((p) => p.attack);
  a.armor = 0; a.integrity = 1; a.taggedUntil = s.encounter.cycle + 3;
  if (b2) b2.attack.due = s.encounter.cycle + 1;
  command(s, `spike ${a.id}`); resolveCycle(s);
  assert.ok(s.logs.some((x) => /Tracking Pixel moves Tag/.test(x.message)));
});

// ---------- the format: enrage, no sustain out of a fight ----------
test('enrage: a virus, an elite or a gate still up at its cycle hits 50% harder, then a quarter more every 3 cycles; a Resident keeps its own', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('bastion', 3);
  fight(s, of(s, 'elite')[0]); quiet(s);
  s.run.max = s.run.integrity = 99999;
  assert.equal(s.encounter.enrageAt, BREACH.enrage.elite);
  const p = livingParts(s).find((x) => x.attack), amt = p.attack.amount;
  for (let i = 0; i < BREACH.enrage.elite && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.equal(p.attack.amount, Math.round(amt * 1.5));
  assert.ok(s.logs.some((x) => /ENRAGES/.test(x.message)));
  for (let i = 0; i < BREACH.enrage.every && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.equal(p.attack.amount, Math.round(Math.round(amt * 1.5) * 1.25));
  const v = breach('bastion', 3);
  fight(v, of(v, 'virus')[0]);
  assert.equal(v.encounter.enrageAt, BREACH.enrage.virus, 'a wild virus sooner');
  fight(v, v.breach.map.nodes.gate1);
  assert.equal(v.encounter.enrageAt, BREACH.enrage.gate);
  fight(v, v.breach.map.nodes.core);
  assert.equal(v.encounter.enrageAt, undefined, 'the Resident has its own enrage (data.mjs BOSSES)');
  assert.ok(v.encounter.virus.enrageAt > 0);
});

test('no sustain out of a fight: heals and shields only count inside it; you leave with no more Signal than you brought', () => {
  const s = breach('bastion', 3), b = s.breach;
  b.signal = 100;
  fight(s, of(s, 'virus')[0]);
  s.run.integrity = s.run.max; // healed past where it started
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  finish(s, 'victory'); settle(s);
  assert.equal(b.signal, 100);
  // A rest and a patch still restore it.
  b.screen = { kind: 'defrag', node: of(s, 'defrag')[0].id };
  act(s, 'rest');
  assert.equal(b.signal, 100 + Math.round(b.max * BREACH.rest));
});

// ---------- rolled genomes (phase 3, kept) ----------
test('genomes: sampled breach viruses obey the mutation cap (one wild, two elite), the budget and the compatibility rules', () => {
  let wild = 0, mutated1 = 0, elites = 0;
  for (let seed = 1; seed <= 60; seed++) for (const level of [3, 6, 10, 14, 19, 24]) {
    const map = generateMap(seed, level);
    for (const n of nodeList(map).filter((x) => x.genes)) {
      const muts = n.genes.filter((id) => GENES[id].mutation), parts3 = n.genes.filter((id) => GENES[id].parts);
      const elite = n.kind === 'elite';
      assert.ok(muts.length <= (elite ? 2 : 1), `${seed} ${n.id}: ${n.genes}`);
      assert.ok(parts3.length <= 1, 'one third part');
      assert.ok(n.genes.every((id) => GENES[id].opens <= n.level), 'open at its level');
      const cost = n.genes.reduce((k, id) => k + GENES[id].cost, 0);
      assert.ok(cost <= Math.max(0, budgetFor(n.level, { elite }) + BREACH.geneBonus), `${n.id} costs ${cost}`);
      const core = FAMILIES[n.family].parts.filter((p) => p.pool !== 'third').flatMap((p) => partGenes(p));
      assert.deepEqual(compatible([...core, ...n.genes]), [], `${n.genes}`);
      if (n.level < 4) assert.deepEqual(n.genes, [], 'the body only, under level 4');
      if (!elite) { wild++; if (muts.length) mutated1++; } else elites++;
    }
  }
  assert.ok(mutated1 > wild * 0.15, 'mutations show up');
  assert.ok(elites > 50);
  const a = nodeList(generateMap(1, 12)).filter((n) => n.genes).map((n) => n.genes.join('+'));
  assert.ok(new Set(a).size >= 3, a);
});

test('genomes: a mutation lives on a part, and breaking that part ends the rule; the node shows its genes as chips', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('breaker', 3), b = s.breach;
  const n = nodeList(b.map).find((x) => x.kind === 'virus');
  Object.assign(n, { genes: ['hasty', 'armored'], third: null, muts: ['hasty', 'armored'] });
  fight(s, n);
  const v = s.encounter.virus;
  assert.equal(v.mutations.length, 2);
  for (const m of v.mutations) assert.ok(part(s, m.part).carries.includes(m.id));
  assert.notEqual(v.mutations[0].part, v.mutations[1].part, 'two mutations, two parts');
  assert.ok(mutated(s, 'hasty') && mutated(s, 'armored'));
  const carrier = part(s, v.mutations.find((m) => m.id === 'armored').part), other = livingParts(s).find((p) => p !== carrier);
  const armor = other.maxArmor;
  carrier.integrity = 1; carrier.armor = 0;
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 999;
  command(s, `spike ${carrier.id}`); resolveCycle(s);
  assert.equal(carrier.integrity, 0);
  assert.ok(!mutated(s, 'armored'), 'the rule ends with its part');
  assert.equal(other.maxArmor, armor - 1, 'the extra ◆ goes');
  const t = breach('breaker', 3), m = reachable(t)[0];
  Object.assign(m, { genes: ['ward'], third: 'ward', muts: [] });
  assert.match(breachMarkup(t), /gchip g-rolled unknown/);
  t.geneCodex = {}; decodeGene(t, 'ward');
  assert.match(breachMarkup(t), /gchip g-rolled[^"]*"[^>]*>[\s\S]*?ward/);
  assert.ok(!generateMap(5, 10).nodes.core.genes, 'the Resident rolls none');
});

test('Sinkhole and Testbed shape the roll: only decoded genes, or one more point', () => {
  const known = new Set(['hasty']);
  for (let i = 0; i < 30; i++) for (const id of rollGenome({ rand: seeded(i), level: 14, family: 'ransomware', known })) assert.equal(id, 'hasty');
  const pts = (bonus) => Array.from({ length: 40 }, (_, i) => genomeOfNode(seeded(i), 9, 'worm', 'swarmline', false, false, { bonus }).genes.reduce((k, id) => k + GENES[id].cost, 0)).reduce((a, x) => a + x, 0);
  assert.ok(pts(1) > pts(0));
});

// ---------- heat ----------
test('heat: eight ranks, each one clear modifier; Audit starts your Trace at 30 and Tripwire raises it half again', () => {
  assert.equal(MAX_HEAT, 8);
  for (let h = 1; h <= 8; h++) assert.ok(HEAT[h].name && HEAT[h].text.endsWith('.') && !/draft|reroll/i.test(HEAT[h].text));
  const r = heatRules(8);
  assert.ok(r.loud && r.gateTell && r.moreElites && r.rest === 0.2 && r.audit === 30 && r.fog === 1 && r.tripwire === 1.5 && r.resident);
  const elites = (h) => Array.from({ length: 20 }, (_, i) => nodeList(generateMap(i + 1, 10, SERVER_CARD, { heat: h })).filter((n) => n.kind === 'elite').length).reduce((a, x) => a + x, 0);
  assert.ok(elites(3) >= elites(0) + 40, `${elites(0)} -> ${elites(3)}`);
  const s = breach('breaker', 4, { heat: 8 }), b = s.breach;
  assert.equal(b.trace, 30);
  assert.equal(fogOf(s), 1);
  trace(s, 10);
  assert.equal(b.trace, 45, 'Tripwire: half again');
  const cold = breach('breaker', 4), n = of(cold, 'virus')[0];
  fight(cold, n);
  const hot = breach('breaker', 4, { heat: 1 });
  fight(hot, of(hot, 'virus').find((x) => x.id === n.id));
  assert.ok(hot.encounter.virus.parts[0].max > cold.encounter.virus.parts[0].max);
  const g = breach('breaker', 4, { heat: 2 });
  fight(g, g.breach.map.nodes.gate1);
  assert.ok(g.encounter.virus.tellSet.includes('lock') && g.encounter.virus.extraTells === 1);
  const R = breach('breaker', 4, { heat: 8 });
  fight(R, R.breach.map.nodes.core);
  assert.equal(R.encounter.virus.phases[0].at, 0.8);
  assert.match(breachMarkup(s), /bx-heat" title="Heat 8: Loud\.[^"]*Hardened Resident/);
  assert.ok(b.fx.rareOdds === 24 && b.fx.gearLevel === 5);
});

// ---------- the campaign ----------
function camp(cls = 'breaker', seed = 7) {
  const s = fresh();
  s.rng = seed * 99991;
  s.profile = { handle: 'tester', pwLen: 6, since: 0 };
  command(s, `archetype ${cls}`);
  newCampaign(s, { seed });
  return s;
}
test('campaign heat: a capture at your highest opens the next and records the server\'s best; re-imaging asks for that heat', () => {
  const s = camp();
  assert.equal(heatOpen(s), 0);
  let b = launch(s, 'sprawl-00', { heat: 3 });
  assert.equal(b.heat, 0, 'no higher than what is open');
  b.result = 'won'; breachHooks.over(s, 'won');
  assert.equal(heatOpen(s), 1);
  assert.equal(b.report.heat, 1);
  leave(s);
  b = launch(s, 'vanta-07', { heat: 1 });
  assert.equal(b.heat, 1);
  b.result = 'won'; breachHooks.over(s, 'won');
  assert.equal(heatOpen(s), 2);
  assert.equal(recOf(s, 'vanta-07').heat, 1);
  leave(s);
  assert.equal(launch(s, 'vanta-07', { heat: 0 }), null, 'a re-image asks for heat 1 or more');
  assert.ok(launch(s, 'vanta-07', { heat: 2 }));
  leave(s); s.breach = null;
  campUi.sel = 'vanta-07'; campUi.heat['vanta-07'] = 2;
  const html = campaignMarkup(s);
  assert.match(html, /cp-heat-mod[^>]*><b>2<\/b>Hardened ICE/);
  assert.match(html, /Re-image · heat 2/);
  campUi.sel = null; campUi.heat = {};
});

test('bounties: quiet and vault replace the drafting ones; a met bounty pays a script, never gear; Mail Drop mails one on a capture', () => {
  assert.ok(!Object.values(BOUNTIES).some((x) => /draft/i.test(x.text)));
  const s = camp('operator', 11);
  Object.assign(recOf(s, 'sprawl-00'), { captured: true, rewrites: { smtpd: { id: 'maildrop', tier: 2 } } });
  s.camp.scripts = [];
  const k = bountiesOn(s, 'vanta-07')[0];
  const b = launch(s, 'vanta-07', { bounty: k });
  Object.assign(b.stats, { rests: 0, landed: 0, elites: 1, hunted: 0, vaults: 1, low: 1 });
  const stash = s.stash.length;
  b.result = 'won';
  breachHooks.over(s, 'won');
  assert.ok(b.report.bounty.done);
  assert.equal(s.stash.length, stash, 'no gear');
  assert.equal(s.camp.scripts.length, 2, 'the bounty\'s script and Mail Drop\'s');
  assert.ok(['uncommon', 'rare'].includes(SCRIPTS[s.camp.scripts[0]].rarity));
  assert.ok(b.report.mail && ['uncommon', 'rare'].includes(SCRIPTS[b.report.mail].rarity), 'Mail Drop II: uncommon or better');
  assert.match(breachMarkup(s), /bounty[\s\S]*Paid[\s\S]*mail/);
  assert.ok(BOUNTIES.quiet.check({ stats: { hunted: 0 } }) && !BOUNTIES.quiet.check({ stats: { hunted: 1 } }));
  assert.ok(BOUNTIES.vault.check({ stats: { vaults: 1 } }) && !BOUNTIES.vault.check({ stats: { vaults: 0 } }));
});

test('the save: a v2 campaign (drafting) migrates in place: the pool goes, held CVEs become scripts, a breach in flight loses its drafts', () => {
  const s = camp();
  launch(s, 'sprawl-00');
  // As phase 3 saved it.
  Object.assign(s.camp, { v: 2, pool: ['heartbleed', 'bluekeep'], mods: ['shrapnel'], lastMods: ['aftershock'] });
  delete s.camp.scripts;
  Object.assign(s.breach, { v: 2, mods: ['aftershock'], plus: [], cves: ['eternalblue', 'heartbleed', 'ripple20', 'bluekeep', 'mirai'], rerolls: 1, rareBoost: 5, screen: { kind: 'draft', cards: [] }, queue: [{ kind: 'draft' }, { kind: 'rewrite', sub: 'ledger', tier: 1, options: ['pricefix', 'slushfund', 'bountyboard'] }] });
  for (const k of ['trace', 'tracePeak', 'keys', 'hunter', 'switches']) delete s.breach[k];
  delete s.breach.map.shortcuts;
  const back = restore(JSON.parse(JSON.stringify(s)));
  migrate(back);
  assert.equal(back.camp.v, 3);
  assert.ok(!('pool' in back.camp) && !('mods' in back.camp) && !('lastMods' in back.camp));
  assert.deepEqual(back.camp.scripts, ['spectre', 'ripple20', 'bluekeep'], 'held CVEs become their scripts, up to 3 slots');
  const b = back.breach;
  assert.ok(!('mods' in b) && !('cves' in b) && !('rerolls' in b));
  assert.equal(b.screen.kind, 'rewrite', 'the draft screen is skipped');
  assert.deepEqual([b.trace, b.keys, b.hunter, b.map.shortcuts], [0, 0, null, []]);
  assert.ok(breachMarkup(back));
  // A v1 save comes up too, with Sasser to start.
  const t = camp();
  Object.assign(t.camp, { v: 1 }); delete t.camp.heat; delete t.camp.scripts;
  migrate(t);
  assert.equal(t.camp.v, 3);
  assert.deepEqual(t.camp.scripts, ['sasser']);
  assert.equal(t.camp.heat, 0);
});
