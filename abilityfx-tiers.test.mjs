// Mastery tiers and break finishers (dist/abilityfx.mjs, its table dist/abilityfx-table.mjs TIER_UP, TIERS, FINISHERS):
// every row resolves at tiers 1 to 3 (1 is the row itself), richer at each, the hand-made tier 3s do what they say, and
// every effect rule holds at every tier: gone by CAP and ending unseen, never resting over a key's label, your bar's
// numbers or the crew window, your bar's effects off the parts' names, coloured by who and how it hit, lighter on
// calm, nothing at all with Motion or Screen effects off. A finisher plays on the winning break only, on that part's
// row only, within FIN_CAP. The same measured page as abilityfx.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES, TIERS, TIER_UP, FINISHERS, SUB_FINISHERS, MOTIONS, PARTICLES, FIN_MOTIONS, CAP, FIN_CAP, TIER_MAX, tierRecipe, recipeOf, layout, finisherLayout, finisherOf, finisherBreak, boxAt, keyAt, overlaps, rect, createAbilityFx } from './dist/abilityfx.mjs';
import { finishersOf } from './dist/abilityfx-playtest.mjs';
import { ARCHETYPES, SUBS, SPIKE } from './dist/data.mjs';
import { fresh, command, resolveCycle, active, selectEncounter, livingParts } from './dist/combat.mjs';

const R = (s) => { const [l, t, w, h] = s.split(',').map(Number); return rect(l, t, w, h); };
const hud = { bar: R('63,131,478,14'), nums: R('63,99,478,26') };
const tray = Array.from({ length: 11 }, (_, i) => R(`${47 + i * 109.5},725,103,84`));
const crewWin = { name: R('63,158,60,14'), cls: R('130,158,90,12'), bar: R('63,176,300,4'), nums: R('370,170,50,12') };
const roomy = () => {
  const parts = [
    { row: R('47,363,786,68'), cell: R('85,364,201,67'), name: R('91,383,189,21'), bar: R('91,408,189,5'), chip: R('560,382,120,30') },
    { row: R('47,431,786,68'), cell: R('85,432,201,67'), name: R('91,451,189,21'), bar: R('91,476,189,5'), chip: null },
  ];
  return { parts, keep: [...parts.map((p) => p.name), R('91,320,28,18')] };
};
const dense = () => {
  const parts = [
    { row: R('47,381,786,84'), cell: R('85,382,201,83'), name: R('91,389,189,36'), bar: R('91,429,189,5'), tags: R('91,438,189,20'), chip: R('286,415,120,30') },
    { row: R('47,465,786,68'), cell: R('85,466,201,67'), name: R('91,485,189,21'), bar: R('91,510,189,5'), chip: null },
    { row: R('47,533,786,69'), cell: R('85,534,201,68'), name: R('91,541,189,21'), bar: R('91,566,189,5'), tags: R('91,575,189,20'), chip: R('386,560,120,30') },
  ];
  return { parts, keep: [...parts.flatMap((p) => [p.name, p.tags].filter(Boolean)), R('91,328,28,20')] };
};
const single = () => { const b = roomy(); return { parts: [b.parts[0]], keep: [b.parts[0].name, R('91,320,28,18')] }; };
const pad = (q) => ({ l: q.l - 1, t: q.t - 1, r: q.r + 1, b: q.b + 1 });
const geoOf = (b, i, key = tray[3], mate = null) => ({ keep: b.keep.map(pad), originKeep: [pad(hud.nums), ...tray.map(pad), pad(crewWin.name), pad(crewWin.cls), pad(crewWin.nums)], mine: { ...hud }, key, mate, parts: b.parts, part: b.parts[i] });
const seeded = (n) => () => ((n = (n * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
function* shown(el, steps = 40) {
  for (let i = 0; i <= steps; i++) { const k = keyAt(el, i / steps); if (k.o > 0.02) yield { i, ms: el.delay + (el.dur * i) / steps, box: boxAt(el, k), k }; }
}
const KEYS = Object.keys(RECIPES);

test('every row resolves at tiers 1 to 3: tier 1 is the row, 2 and 3 the generic upgrade and its own overrides', () => {
  assert.equal(TIER_MAX, 3);
  for (const k of KEYS) {
    assert.equal(tierRecipe(k, 1), RECIPES[k], `${k}: tier 1 is the row itself`);
    for (const [ask, want] of [[0, 1], [-2, 1], ['x', 1], [9, 3], [2.4, 2]]) assert.equal(tierRecipe(k, ask), tierRecipe(k, want), `${k} at ${ask}`);
    let before = RECIPES[k];
    for (const t of [2, 3]) {
      const r = tierRecipe(k, t);
      assert.ok(Object.isFrozen(r) && r.tier === t && tierRecipe(k, t) === r, `${k} ${t}: built once, frozen`);
      assert.equal(r.label, RECIPES[k].label);
      assert.ok(MOTIONS[r.motion], `${k} ${t}: motion`);
      for (const b of r.burst) assert.ok(PARTICLES[b.style], `${k} ${t}: ${b.style}`);
      for (const B of r.beats) { assert.ok(MOTIONS[B.motion], `${k} ${t}: beat ${B.motion}`); assert.ok((B.at || 0) + B.dur <= 900, `${k} ${t}: a short beat`); for (const line of [...(B.art || []), ...(B.frames || []).flat()]) assert.match(line, /^[\x20-\x7e─┌┐└┘┤├═█◆◇·]*$/); }
      assert.ok(r.size >= 10 && r.size <= 22 && r.dur <= 840 && (r.land || 0) < r.dur, `${k} ${t}: size and length as a row's`);
      for (const line of [...(r.art || []), ...(r.frames || []).flat()]) assert.match(line, /^[\x20-\x7e─┌┐└┘┤├═█◆◇·]*$/, `${k} ${t}: ${line}`);
      // Richer: at least as many of every burst entry as the tier below, and TIER_UP's own on top.
      const n = (x) => x.burst.reduce((a, b) => a + b.n + (b.per || 0), 0);
      assert.ok(n(r) > n(before), `${k} ${t}: more particles than tier ${t - 1}`);
      for (const add of TIER_UP[t].add) assert.ok(r.burst.some((b) => b.style === add.style && b.n === add.n), `${k} ${t}: ${add.style}`);
      before = r;
    }
    assert.ok(tierRecipe(k, 3).burst.some((b) => b.style === 'glint'), `${k}: tier 3 leaves its glint`);
  }
  // The hand-made ones are rows, and cover each class's key 1 and two or three of its most iconic.
  for (const k of Object.keys(TIERS)) assert.ok(RECIPES[k], `${k} is a row`);
  for (const cls of Object.keys(SPIKE)) assert.ok(TIERS[SPIKE[cls].word]?.[2] && TIERS[SPIKE[cls].word]?.[3], `${cls}'s key 1`);
  for (const ids of [['overload', 'zero-day'], ['firewall', 'quarantine'], ['inject', 'detonate'], ['deploy', 'botnet']]) for (const id of ids) assert.ok(TIERS[id][3], id);
  assert.equal(recipeOf('nothing'), null); assert.equal(tierRecipe('nothing', 3), null);
});

// Every row at tiers 2 and 3 on every board, part and start (its key, no key, a crewmate's), at both levels, as a hit
// and a crit and on ◆.
const variants = (fn) => {
  for (const [name, board] of [['roomy', roomy()], ['dense', dense()], ['single', single()]]) for (let i = 0; i < board.parts.length; i++) for (const origin of ['key', 'no key', 'crew']) {
    const g = geoOf(board, i, origin === 'key' ? tray[3] : null, origin === 'crew' ? crewWin.bar : null);
    for (const k of KEYS) for (const tier of [2, 3]) for (const lvl of ['full', 'calm']) for (const opt of [{}, { crit: true, power: 1, result: 'crit' }, { result: 'chit', power: 0 }]) {
      const r = tierRecipe(k, tier);
      if (origin === 'crew' && r.on === 'you') continue;
      const plan = layout(r, g, { lvl, rnd: seeded(5), origin: k.endsWith(':tick') ? 'here' : origin === 'crew' ? 'crew' : 'key', ...(origin === 'crew' ? { kind: 'crew' } : {}), ...opt });
      assert.ok(plan?.els.length, `${name} ${k} ${tier}`);
      fn({ name, board, i, g, k, r, tier, lvl, plan, origin, opt });
    }
  }
};

test('every rule holds at every tier: gone by CAP and unseen, never resting over the tray, your numbers or the crew window, and coloured by who and how', () => {
  let still = 0, checked = 0;
  variants(({ name, board, i, g, k, r, tier, lvl, plan, origin, opt }) => {
    const tag = `${name} part ${i} ${k} tier ${tier} ${lvl} from ${origin}`;
    assert.ok(plan.dur <= CAP, `${tag}: ${plan.dur} ms`);
    assert.ok(plan.impact >= 0 && plan.impact < plan.dur, tag);
    if (origin === 'crew') assert.ok(plan.els.every((el) => /\bcrew\b/.test(el.cls)), `${tag}: a crewmate's in violet`);
    else if (opt.crit) assert.ok(plan.els.every((el) => /\bcrit\b/.test(el.cls)), `${tag}: a crit gold-white`);
    for (const el of plan.els) {
      assert.equal(el.keys[el.keys.length - 1].o, 0, `${tag} ${el.cls}: ends unseen`);
      assert.equal(el.keys[el.keys.length - 1].at, 1, tag);
      assert.ok(el.delay + el.dur <= plan.dur + 0.01 && el.delay >= 0, tag);
      let prev = null;
      for (const p of shown(el, 30)) {
        checked++;
        if (prev && prev.i === p.i - 1 && Math.hypot(p.box.l - prev.box.l, p.box.t - prev.box.t) + Math.abs(p.box.r - p.box.l - (prev.box.r - prev.box.l)) < 0.05) {
          still++;
          const hit = g.originKeep.find((q) => overlaps(p.box, q));
          assert.ok(!hit, `${tag} ${el.cls} "${el.text}": at rest over ${JSON.stringify(hit)} at ${Math.round(p.ms)} ms`);
        }
        // Your bar's effects never on a part's name (but the streak on its way from the key).
        if (r.on === 'you' && !/\bstreak\b/.test(el.cls)) assert.ok(!board.keep.some((q) => overlaps(p.box, q)), `${tag}: ${el.cls} on a part's name`);
        prev = p;
      }
    }
  });
  assert.ok(checked > 100000 && still > 1000, `${checked} points, ${still} at rest`);
});

test('each tier is richer than the one below on bold, still lighter on calm, and lands on the part as tier 1 does', () => {
  for (const [name, board] of [['roomy', roomy()], ['dense', dense()]]) for (let i = 0; i < board.parts.length; i++) {
    const g = geoOf(board, i), part = board.parts[i];
    for (const k of KEYS) {
      const o = { origin: k.endsWith(':tick') ? 'here' : 'key' };
      const count = (t, lvl) => layout(tierRecipe(k, t), g, { lvl, rnd: seeded(3), ...o }).els.length;
      assert.ok(count(1, 'full') < count(2, 'full') && count(2, 'full') < count(3, 'full'), `${name} ${k}: ${count(1, 'full')} < ${count(2, 'full')} < ${count(3, 'full')}`);
      for (const t of [2, 3]) assert.ok(count(t, 'calm') <= count(t, 'full'), `${name} ${k} ${t}: calm is lighter`);
      for (const t of [2, 3]) {
        const r = tierRecipe(k, t), plan = layout(r, g, { rnd: seeded(9), ...o });
        const where = r.on === 'you' ? hud.bar : r.at === 'chip' && part.chip ? part.chip : r.motion === 'all' ? null : { l: part.cell.l, t: part.row.t, r: part.cell.r, b: part.row.b };
        for (const q of where ? [where] : board.parts.map((p) => p.name)) assert.ok(plan.els.some((el) => [...shown(el)].some(({ ms, box }) => ms >= plan.impact - 10 && ms <= plan.impact + 260 && overlaps(box, q))), `${name} ${k} ${t}: lands on ${JSON.stringify(q)}`);
      }
    }
  }
});

test('the hand-made tier 3s: Ban\'s crack, Bash\'s afterimages and quake, Poke\'s three needles, Ping\'s echo off every part, Overload\'s forks', () => {
  const b = dense(), g = geoOf(b, 0), part = b.parts[0], P = (k, t, more = {}) => layout(tierRecipe(k, t), g, { rnd: seeded(4), origin: 'key', ...more });
  const glint = (plan) => plan.els.filter((el) => /\bglint\b/.test(el.cls));
  // The lingering mark: under 300 ms, after the impact.
  for (const k of KEYS) for (const el of glint(P(k, 3, { origin: k.endsWith(':tick') ? 'here' : 'key' }))) assert.ok(el.dur < 300, `${k}: its glint lingers ${el.dur} ms`);
  assert.equal(glint(P('ban', 2)).length, 0, 'tier 2 has none');
  assert.equal(glint(P('ban', 3, { lvl: 'calm' })).length, 0, 'calm: no flourish');
  // Ban: a crack on its bar line, glowing under 300 ms, from its impact; tier 2's heavier hammer slams deeper.
  const ban = P('ban', 3), scar = ban.els.find((el) => /\bscar\b/.test(el.cls));
  assert.ok(scar && scar.dur < 300 && Math.abs(scar.delay - ban.impact) < 1, 'Ban leaves a crack as it lands');
  const sb = boxAt(scar, keyAt(scar, 0.5));
  assert.ok(sb.t < (part.bar.t + part.bar.b) / 2 && sb.b > (part.bar.t + part.bar.b) / 2 && sb.l > part.name.l && sb.r < part.name.r, `on the part's bar line: ${JSON.stringify(sb)}`);
  assert.ok(Math.min(...tierRecipe('ban', 2) && P('ban', 2).els[0].keys.map((k) => k.r)) < Math.min(...P('ban', 1).els[0].keys.map((k) => k.r)), 'a deeper slam');
  assert.equal(P('ban', 3, { lvl: 'calm' }).els.filter((el) => /\bscar\b/.test(el.cls)).length, 0, 'calm: no beats');
  // Bash: afterimages behind the ram (2 at tier 3), gone by the time it lands; a quake along the part's bar.
  const bash = P('bash', 3), echoes = bash.els.filter((el) => el.text === bash.els[0].text && /\becho\b/.test(el.cls));
  assert.equal(echoes.length, 2, 'two afterimages');
  for (const el of echoes) assert.ok(el.delay + el.dur <= bash.impact + 1, 'gone as it lands');
  const quake = bash.els.filter((el) => /\bquake\b/.test(el.cls));
  assert.ok(quake.length >= 4 && quake.every((el) => [...shown(el)].every(({ box }) => box.t < part.bar.b + 6 && box.b > part.bar.t - 6)), 'the quake runs along the bar');
  // Poke: three needles, a beat apart.
  const needles = P('poke', 3).els.filter((el) => el.text === RECIPES.poke.art[0]);
  const d = needles.map((el) => el.delay);
  assert.ok(needles.length === 3 && d[0] === 0 && d[1] > 0 && Math.abs(d[2] - 2 * d[1]) < 0.01, `three, a beat apart: ${d}`);
  // Ping: rings at every other part on the board, a beat after it lands.
  const ping = P('ping', 3);
  for (const q of b.parts.slice(1)) assert.ok(ping.els.some((el) => /\bring\b/.test(el.cls) && el.delay > ping.impact + 60 && [...shown(el)].some(({ box }) => overlaps(box, q.name))), `an echo off ${JSON.stringify(q.name)}`);
  assert.ok(layout(tierRecipe('ping', 3), geoOf(single(), 0), { rnd: seeded(4) }).els.some((el) => /\bring\b/.test(el.cls) && el.delay > 100), 'alone on the board: it echoes off the part itself');
  // Overload: forks on to the other parts as the bolt arrives (two short ones with no other part).
  const over = P('overload', 3), forks = over.els.filter((el) => /\bfork\b/.test(el.cls));
  for (const q of b.parts.slice(1)) assert.ok(forks.some((el) => [...shown(el)].some(({ box }) => overlaps(box, { l: q.name.l - 40, t: q.name.t - 20, r: q.name.r + 40, b: q.name.b + 20 }))), 'a fork reaches another part');
  assert.ok(forks.every((el) => el.delay >= over.travel * 0.8), 'forks light as it arrives');
  assert.ok(layout(tierRecipe('overload', 3), geoOf(single(), 0), { rnd: seeded(4) }).els.some((el) => /\bfork\b/.test(el.cls)));
  assert.equal(P('overload', 2).els.filter((el) => /\bfork\b/.test(el.cls)).length, 0);
  // Inject: brighter fire (more white-hot flames), and cinders at tier 3; Detonate goes off twice; Botnet's swarm grows.
  const hot = (t) => { const els = P('inject', t).els.filter((el) => /\bflame\b/.test(el.cls)); return els.filter((el) => /\bhot\b/.test(el.cls)).length / els.length; };
  assert.ok(hot(1) < hot(2) && hot(2) < hot(3), `hotter: ${hot(1).toFixed(2)} ${hot(2).toFixed(2)} ${hot(3).toFixed(2)}`);
  assert.ok(P('inject', 3).els.some((el) => /\bcinder\b/.test(el.cls)));
  assert.equal(P('detonate', 3).els.filter((el) => el.frames?.length === 3).length, 2, 'two blasts');
  assert.equal(P('botnet', 3).els.filter((el) => el.frames).length, 5);
  assert.equal(P('deploy', 3).els.filter((el) => el.frames).length, 2);
  // Tier 3's particles burn brighter, under any tint.
  assert.ok(P('bash', 3).els.some((el) => /\bbright\b/.test(el.cls)) && !P('bash', 2).els.some((el) => /\bbright\b/.test(el.cls)));
  const css = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  assert.ok(css.indexOf('.afx.bright') > 0 && css.indexOf('.afx.bright') < css.indexOf('.afx.crit {') && css.indexOf('.afx.scar') < css.indexOf('.afx.crew {'), 'a crit, a crewmate\'s and ◆ still colour it');
  for (const rule of css.match(/\.afx[^{]*\{[^}]*\}/g)) assert.doesNotMatch(rule, /background|backdrop|filter|mix-blend/, rule);
});

test('break finishers: one a class, varied by its subclasses; on the part\'s row only, within 900 ms, ending unseen', () => {
  assert.deepEqual(Object.keys(FINISHERS), Object.keys(ARCHETYPES));
  assert.equal(FIN_CAP, 900);
  for (const [cls] of Object.entries(FINISHERS)) {
    assert.equal(finisherOf(cls), FINISHERS[cls]);
    assert.ok(FIN_MOTIONS[FINISHERS[cls].motion], cls);
    for (const sub of Object.keys(ARCHETYPES[cls].subs)) assert.equal(finisherOf(cls, sub).sub, sub, `${cls} ${sub}`);
  }
  assert.equal(finisherOf('breaker', 'warden'), FINISHERS.breaker, 'another class\'s subclass changes nothing');
  assert.equal(finisherOf('nobody'), null);
  assert.deepEqual(Object.keys(SUB_FINISHERS).sort(), Object.keys(SUBS).sort(), 'every subclass varies its class\'s');
  assert.equal(finishersOf().length, 4 + Object.keys(SUBS).length, 'the playtest fires every one');
  const kinds = { breaker: /\bshard\b/, bastion: /\bseal\b/, infiltrator: /^p bit/, operator: /\bart\b/ };
  for (const [name, board] of [['roomy', roomy()], ['dense', dense()], ['single', single()]]) for (let i = 0; i < board.parts.length; i++) {
    const g = geoOf(board, i), row = board.parts[i].row, others = board.parts.filter((_, j) => j !== i).map((p) => p.row);
    for (const [cls, sub] of finishersOf()) for (const lvl of ['full', 'calm']) for (const kind of ['you', 'crew']) {
      const F = finisherOf(cls, sub), plan = finisherLayout(F, g, { lvl, rnd: seeded(2), kind }), tag = `${name} ${i} ${cls} ${sub} ${lvl} ${kind}`;
      assert.ok(plan?.els.length > 3, tag);
      assert.ok(plan.dur <= FIN_CAP, `${tag}: ${plan.dur} ms`);
      assert.ok(plan.els.some((el) => kinds[cls].test(el.cls)), `${tag}: its own kind of piece`);
      if (kind === 'crew') assert.ok(plan.els.every((el) => /\bcrew\b/.test(el.cls)), tag);
      for (const el of plan.els) {
        assert.equal(el.keys[el.keys.length - 1].o, 0, `${tag}: ends unseen`);
        for (const { box, ms } of shown(el, 30)) {
          assert.ok(box.l >= row.l - 0.5 && box.r <= row.r + 0.5 && box.t >= row.t - 0.5 && box.b <= row.b + 0.5, `${tag} ${el.cls} "${el.text}" at ${Math.round(ms)} ms: off its row ${JSON.stringify(box)}`);
          assert.ok(!others.some((q) => overlaps({ l: box.l + 0.6, t: box.t + 0.6, r: box.r - 0.6, b: box.b - 0.6 }, q)), `${tag}: on another part's row`);
        }
      }
      if (lvl === 'calm') assert.ok(plan.els.length <= finisherLayout(F, g, { lvl: 'full', rnd: seeded(2) }).els.length, `${tag}: lighter on calm`);
    }
  }
  assert.equal(finisherLayout(FINISHERS.breaker, { ...geoOf(roomy(), 0), part: null }), null, 'no part row: none');
  assert.equal(finisherLayout(FINISHERS.breaker, geoOf(roomy(), 0), { lvl: null }), null);
  // The subclass variations show: the Demolitionist's blast, the Warden's word, the Herder's herd, the Hijacker's <@>.
  const g = geoOf(roomy(), 0), els = (cls, sub) => finisherLayout(finisherOf(cls, sub), g, { rnd: seeded(1) }).els;
  assert.ok(els('breaker', 'demolitionist').some((el) => el.frames?.length === 3) && !els('breaker').some((el) => el.frames));
  assert.ok(els('bastion', 'warden').some((el) => el.text === '[ DENIED ]') && els('bastion').some((el) => el.text === '[ SEALED ]'));
  assert.equal(els('operator', 'herder').filter((el) => el.frames).length, 6);
  assert.ok(els('operator', 'hijacker').some((el) => el.text === '<@>'));
});

test('a finisher fires on the fight-winning break only: the last part broken before the victory, and only yours', () => {
  const ev = (type, x = {}) => ({ id: Math.random(), type, message: '', ...x });
  const a = ev('broken', { target: 'a' }), b = ev('broken', { target: 'b' }), win = ev('victory');
  assert.equal(finisherBreak([a, ev('damage', { target: 'b' }), b, win]), b, 'the last break before the win');
  assert.equal(finisherBreak([a, b]), null, 'a break that doesn\'t win the fight: none');
  assert.equal(finisherBreak([a, win, b]), a);
  assert.equal(finisherBreak([a, ev('broken', { target: 'f', c2: true }), win]), a, 'fragments dropping with a C2 node aside');
  assert.equal(finisherBreak([ev('broken', { target: 'a', who: 'nyx' }), win]), null, 'a crewmate\'s winning break keeps the plain dissolve');
  assert.equal(finisherBreak([win]), null); assert.equal(finisherBreak(null), null);
  // In a real fight: every break but the last plays no finisher, and the batch that wins holds the last break.
  const s = fresh();
  selectEncounter(s, 'cryptjack', 3, { level: 4 });
  command(s, 'engage');
  const fins = [];
  let breaks = 0;
  for (let n = 0; n < 80 && active(s); n++) {
    const p = livingParts(s)[0];
    const batch = [...command(s, `spike ${p.id}`), ...resolveCycle(s)];
    breaks += batch.filter((e) => e.type === 'broken' && !e.c2).length;
    const f = finisherBreak(batch);
    if (f) fins.push(f);
  }
  assert.equal(s.reports.at(-1).result, 'victory');
  assert.ok(breaks >= 2, `${breaks} parts broken`);
  assert.equal(fins.length, 1, 'one finisher in the fight');
  assert.equal(fins[0].id, s.logs.filter((e) => e.type === 'broken' && !e.c2).at(-1).id, 'on its last break');
  // app.js: on that break the finisher plays in place of the dissolve's bits; any other break dissolves as before.
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /const fin = module === 'combat' \? finisherBreak\(events\) : null;/);
  assert.match(app, /if \(!\(e === fin && finisher\(e\)\)\) hitfx\.dissolve\(partRow\(e\.target\)\);/);
  assert.match(app, /abilityfx\.finish\(cls, heroLevel\(campaign, cls\) >= SUBCLASS\.from \? sub : null, partRow\(e\.target\)\)/, 'your class, your subclass once you have one');
});

test('on the page: a tier plays as asked, a finisher on the row; both on the hidden layer, gone on time, nothing with Motion or Screen effects off', () => {
  const timers = [], was = globalThis.setTimeout;
  globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length; };
  try {
    const { fx, row } = fakePage({});
    for (const k of KEYS) for (const tier of [2, 3]) assert.ok(fx.play(k, RECIPES[k].on === 'you' ? null : row, { origin: k.endsWith(':tick') ? 'here' : 'key', tier }), `${k} ${tier}`);
    const p3 = fx.plan('ban', row, { ability: 'spike', tier: 3 }), p1 = fx.plan('ban', row, { ability: 'spike' });
    assert.ok(p3.els.length > p1.els.length && p3.els.some((el) => /\bscar\b/.test(el.cls)), 'tier 3 Ban on the page');
    for (const cls of Object.keys(FINISHERS)) assert.ok(fx.finish(cls, null, row), cls);
    assert.equal(fx.finish('breaker', null, null), false, 'no row: none');
    assert.equal(fx.layer().attrs['aria-hidden'], 'true');
    assert.ok(timers.every((t) => t.ms <= CAP + 60), `every removal by ${CAP + 60} ms`);
    for (const t of timers) t.f();
    assert.equal(fx.layer().children.length, 0, 'nothing stays behind');
    for (const [motion, level] of [[false, 'full'], [true, 'minimal']]) {
      const off = fakePage({ motion, level });
      assert.equal(off.fx.play('ban', off.row, { tier: 3 }), false);
      assert.equal(off.fx.finish('bastion', 'warden', off.row), false);
      assert.equal(off.fx.layer(), null);
    }
  } finally { globalThis.setTimeout = was; }
  // app.js: yours plays at your tier (a crewmate's at 1), its burn's ticks too, and the playtest previews any tier.
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /const afxTier = \(e, id\) => \(e\.who \|\| !id \? 1 : masteryTier\(campaign, classOf\(campaign\), id\)\);/);
  assert.equal((app.match(/tier: afxTier\(/g) || []).length, 3, 'the effect, its plan and its burn\'s ticks');
  assert.match(app, /tier: who \? 1 : tier,/);
  const pt = readFileSync(new URL('./dist/abilityfx-playtest.mjs', import.meta.url), 'utf8');
  assert.match(pt, /seg\('Mastery', \[\[1, 'tier 1'\], \[2, 'tier 2'\], \[3, 'tier 3'\]\], ui\.tier\)/);
  assert.match(pt, /<h3>Break finishers<\/h3>/);
});

function fakePage({ motion = true, level = 'full' }) {
  const el = (tag, box = rect(0, 0, 0, 0)) => ({
    tag, children: [], attrs: {}, style: {}, className: '', textContent: '', isConnected: true, box, classList: { contains: () => false },
    setAttribute(k, v) { this.attrs[k] = String(v); }, appendChild(c) { this.children.push(c); c.parent = this; return c; },
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); },
    getBoundingClientRect() { const b = this.box; return { left: b.l, top: b.t, width: b.r - b.l, height: b.b - b.t, right: b.r, bottom: b.b }; },
    animate() { return {}; }, sel: {}, querySelector(s) { return this.sel[s] || null; }, querySelectorAll(s) { return this.all?.[s] || []; },
  });
  const b = roomy();
  const board = el('div', rect(46, 211, 788, 481));
  board.offsetWidth = 788;
  const you = el('div', R('47,295,786,68'));
  you.sel = { '.bname b': el('b', b.keep[b.keep.length - 1]) };
  const rows = b.parts.map((p) => { const r = el('button', p.row); r.sel = { '.bname': el('div', p.cell), '.part-top': el('span', p.name), '.part-bar': el('span', p.bar) }; r.all = { '.intent': [] }; return r; });
  board.sel = { '.brow.byou': you };
  board.all = { '.bpart': rows };
  const keys = tray.map((q) => el('button', q)), bar = el('div', hud.bar), nums = el('div', hud.nums);
  globalThis.document = { createElement: (t) => el(t), body: el('body') };
  const fx = createAbilityFx(board, { canMove: () => motion, level: () => level, mineBar: () => bar, mineNums: () => nums, keyEl: (id) => (id === 'spike' ? keys[0] : keys[3]), keys: () => keys, mateBars: () => [], crewText: () => [] });
  return { fx, row: rows[0] };
}
