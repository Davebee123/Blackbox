// Ability effects (dist/abilityfx.mjs, its table dist/abilityfx-table.mjs): every ability a player can fire has a row
// (DELIBERATE lists any left on the plain strike), the effect starts at the ability's key in the tray however it was
// fired (at your bar only when that key isn't on screen; a crewmate's at their bar in the crew window), travels to
// where it plays and lands with its number. Nothing plays at Screen
// effects off or with Motion off, the layer takes no input and is hidden from screen readers, every piece is gone
// within CAP (1.2 s, travel included) and ends unseen, a piece may cross a part's name, ◆ or Integrity only for its own
// moment, it never stops over a key's label or your bar's numbers, and your bar's effects never touch a part's name.
// Checked on a roomy board and a dense one, from the key and with no key on screen (from your bar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES, MOTIONS, PARTICLES, TRAVELS, CAP, TRAVEL, DELIBERATE, keyOf, keyFor, tickKey, recipeOf, idOfName, originOf, levelOf, countOf, layout, travelOf, boxAt, keyAt, overlaps, rect, createAbilityFx } from './dist/abilityfx.mjs';
import { groupsOf, abilityOfKey } from './dist/abilityfx-playtest.mjs';
import { SPIKE, ABILITIES } from './dist/data.mjs';

const R = (s) => { const [l, t, w, h] = s.split(',').map(Number); return rect(l, t, w, h); };
// The page as it was measured (page pixels, the board's scale 1): your bar and its numbers in the HUD, the tray's keys,
// and the board: a roomy two-part fight (one part showing an attack chip) and a dense three-part one with tags.
const hud = { bar: R('63,131,478,14'), nums: R('63,99,478,26') };
const tray = Array.from({ length: 11 }, (_, i) => R(`${47 + i * 109.5},725,103,84`));
// The crew window under your Signal: a crewmate's line, its name and class, its bar and its numbers.
const crewWin = { name: R('63,158,60,14'), cls: R('130,158,90,12'), bar: R('63,176,300,4'), nums: R('370,170,50,12') };
const roomy = () => {
  const you = { row: R('47,295,786,68'), cell: R('85,296,201,67'), now: R('286,296,134,67') };
  const parts = [
    { row: R('47,363,786,68'), cell: R('85,364,201,67'), name: R('91,383,189,21'), bar: R('91,408,189,5'), chip: R('560,382,120,30') },
    { row: R('47,431,786,68'), cell: R('85,432,201,67'), name: R('91,451,189,21'), bar: R('91,476,189,5'), chip: null },
  ];
  return { you, parts, keep: [...parts.map((p) => p.name), R('91,320,28,18')] };
};
const dense = () => {
  const you = { row: R('47,295,786,86'), cell: R('85,296,201,85'), now: R('286,296,134,85') };
  const parts = [
    { row: R('47,381,786,84'), cell: R('85,382,201,83'), name: R('91,389,189,36'), bar: R('91,429,189,5'), tags: R('91,438,189,20'), chip: R('286,415,120,30') },
    { row: R('47,465,786,68'), cell: R('85,466,201,67'), name: R('91,485,189,21'), bar: R('91,510,189,5'), chip: null },
    { row: R('47,533,786,69'), cell: R('85,534,201,68'), name: R('91,541,189,21'), bar: R('91,566,189,5'), tags: R('91,575,189,20'), chip: R('386,560,120,30') },
  ];
  return { you, parts, keep: [...parts.flatMap((p) => [p.name, p.tags].filter(Boolean)), R('91,328,28,20')] };
};
const pad = (q) => ({ l: q.l - 1, t: q.t - 1, r: q.r + 1, b: q.b + 1 });
const geoOf = (b, i, key = tray[3], mate = null) => ({ keep: b.keep.map(pad), originKeep: [pad(hud.nums), ...tray.map(pad), pad(crewWin.name), pad(crewWin.cls), pad(crewWin.nums)], mine: { ...hud }, key, mate, parts: b.parts, part: b.parts[i] });
const seeded = (n) => () => ((n = (n * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const ev = (type, x = {}) => ({ id: 1, type, message: '', ...x });
// Every point of a piece's motion where it shows (opacity over 0), with the ms it shows at.
function* shown(el, steps = 40) {
  for (let i = 0; i <= steps; i++) { const k = keyAt(el, i / steps); if (k.o > 0.02) yield { i, ms: el.delay + (el.dur * i) / steps, box: boxAt(el, k), k }; }
}
// Every recipe on every board, every part, from the key and from the bar, at both levels, as a hit, a crit, a hit on ◆
// and a crewmate's.
const variants = (fn, { seeds = [1, 7] } = {}) => {
  for (const [name, board] of [['roomy', roomy()], ['dense', dense()]]) for (let i = 0; i < board.parts.length; i++) for (const origin of ['key', 'no key', 'crew']) {
    const g = geoOf(board, i, origin === 'key' ? tray[3] : null, origin === 'crew' ? crewWin.bar : null);
    for (const [k, r] of Object.entries(RECIPES)) for (const lvl of ['full', 'calm']) for (const opt of [{}, { crit: true, power: 1, result: 'crit' }, { result: 'chit', power: 0 }, { kind: 'crew' }]) for (const seed of seeds) {
      if (origin === 'crew' && r.on === 'you') continue; // a crewmate's heal or shield is on their bar, not yours
      const plan = layout(r, g, { lvl, rnd: seeded(seed), origin: k.endsWith(':tick') ? 'here' : origin === 'crew' ? 'crew' : 'key', ...(origin === 'crew' ? { kind: 'crew' } : {}), ...opt });
      assert.ok(plan?.els.length, `${name} ${k}`);
      fn({ name, board, i, g, k, r, lvl, plan, origin });
    }
  }
};

test('every ability a player can fire has a row: key 1 by each class\'s word, every class and subclass skill, SIGINT; a burn\'s tick has one', () => {
  const missing = [];
  for (const id of Object.keys(ABILITIES)) {
    if (DELIBERATE[id]) continue;
    for (const cls of Object.keys(SPIKE)) if (!recipeOf(keyFor(id, cls))) missing.push(`${id} (${cls})`);
  }
  assert.deepEqual(missing, [], 'every ability resolves to a row (or a listed deliberate fallback)');
  for (const [id, why] of Object.entries(DELIBERATE)) assert.ok(why.length > 10 && !RECIPES[id], `${id}: left on the plain strike, and why`);
  assert.deepEqual(Object.fromEntries(Object.keys(SPIKE).map((c) => [c, keyFor('spike', c)])), { breaker: 'bash', bastion: 'ban', infiltrator: 'poke', operator: 'ping' });
  assert.equal(keyFor('spike', 'nobody'), 'spike', 'an unknown class: the generic key 1');
  // Every command fired names its ability (combat.mjs resolved), whoever fired it.
  for (const id of ['spike', 'crack', 'firewall', 'sigint', 'deploy', 'detonate', 'quarantine']) assert.equal(keyOf(ev('resolved', { ability: id, target: 'p', auto: false }), 'bastion'), keyFor(id, 'bastion'));
  assert.equal(keyOf(ev('resolved', { ability: 'inject', auto: 'program' }), 'infiltrator'), 'inject');
  // A burn's tick: its own row, else any burn's; not a helper's hit, not a hit by name.
  assert.equal(tickKey(ev('damage', { target: 'p', amount: 20, src: 'burn', via: 'Inject' })), 'inject:tick');
  assert.equal(tickKey(ev('damage', { target: 'p', amount: 20, src: 'burn', via: 'Inject (Surprise)' })), 'inject:tick');
  assert.equal(tickKey(ev('damage', { target: 'p', amount: 6, src: 'burn', via: 'Purge' })), 'burn:tick');
  assert.equal(tickKey(ev('damage', { target: 'p', amount: 12, src: 'helper', via: 'Helper' })), null);
  assert.equal(keyOf(ev('damage', { target: 'p', amount: 25, skill: 'spike' }), 'bastion'), null, 'the hit itself is not the trigger: the command is');
  assert.equal(recipeOf('hold'), null); assert.equal(recipeOf('constructor'), null);
  assert.equal(idOfName('Inject (Surprise)'), 'inject');
  // Every row is complete: a known motion and particles, a piece where the motion needs one, short, monospace.
  for (const [k, r] of Object.entries(RECIPES)) {
    assert.ok(r.label, `${k}: a label`);
    assert.ok(MOTIONS[r.motion], `${k}: motion ${r.motion}`);
    for (const b of r.burst || []) assert.ok(PARTICLES[b.style], `${k}: ${b.style}`);
    if (['swing', 'punch', 'dart', 'wave', 'mark', 'clamp', 'stamp', 'shell', 'sweep'].includes(r.motion)) assert.ok(r.art?.length || r.frames?.length, `${k}: art`);
    if (['clamp', 'shell'].includes(r.motion)) assert.equal(r.art.length, 2, `${k}: two halves`);
    if (['walk', 'blast'].includes(r.motion)) assert.ok(r.frames?.length > 1, `${k}: frames`);
    if (['stamp', 'shell', 'sweep', 'wall'].includes(r.motion)) assert.equal(r.on, 'you', `${k}: on your bar`);
    assert.ok((r.land || 0) >= 0 && (r.land || 0) < r.dur && r.dur <= 840, `${k}: lands before it ends, short (${r.dur} ms)`);
    assert.ok(r.size >= 10 && r.size <= 22, `${k}: size ${r.size}`);
    for (const line of [...(r.art || []), ...(r.frames || []).flat()]) assert.match(line, /^[\x20-\x7e─┌┐└┘┤├═█◆◇·]*$/, `${k}: plain ASCII (and box drawing): ${line}`);
    const id = k.split(':')[0];
    assert.ok(ABILITIES[id] || Object.values(SPIKE).some((s) => s.word === id) || k === 'burn:tick', `${k} is an ability (or key 1's word)`);
  }
  // Heals, shields and buffs play on your bar; interrupts and delays on the part's attack.
  for (const [id, a] of Object.entries(ABILITIES)) {
    const r = RECIPES[keyFor(id, 'bastion')];
    if (['heal', 'shield', 'buff'].includes(a.verb) && a.target === 'none' && !['multicast', 'mesh'].includes(id)) assert.equal(r.on, 'you', `${id} on your bar`); // Multicast and Mesh reach the parts
    if (a.target === 'attack' && a.verb === 'stun') assert.ok(r.at === 'chip' || id === 'quarantine', `${id} on its attack`);
  }
  assert.equal(RECIPES.sigint.at, 'chip', 'SIGINT cuts the attack chip');
  assert.equal(RECIPES.sigint.motion, 'slash');
  assert.equal(RECIPES.crack.tone, 'steel', 'Crack shatters the ◆ in steel');
  // The playtest page lists every row, grouped by class and subclass.
  const groups = groupsOf(), listed = new Set(groups.flatMap((g) => g.keys));
  assert.deepEqual(Object.keys(RECIPES).filter((k) => !listed.has(k)), []);
  assert.ok(groups.some((g) => g.title === 'Breaker · Demolitionist') && groups.some((g) => g.title === 'Operator · Hijacker'));
  assert.equal(abilityOfKey('ban'), 'spike'); assert.equal(abilityOfKey('inject:tick'), 'inject');
});

test('it starts at the ability\'s key in the tray however it was fired, and at your bar only when that key isn\'t on screen', () => {
  // Every fire source: from the tray, typed, the timer's auto-repeat, a routine, a daemon, a crewmate; key 1 and SIGINT too.
  for (const x of [{ auto: false }, { auto: true }, { auto: 'program' }, { auto: 'daemon' }]) for (const ability of ['crack', 'spike', 'sigint', 'firewall']) {
    assert.equal(originOf(ev('resolved', { ability, target: 'p', ...x })), 'key', `${ability} ${JSON.stringify(x)}`);
  }
  // A crewmate's, however they fired it: their own bar in the crew window.
  for (const auto of [false, true, 'program']) assert.equal(originOf(ev('resolved', { ability: 'spike', target: 'p', who: 'nyx', auto })), 'crew');
  assert.equal(originOf(ev('damage', { target: 'p', amount: 20, src: 'burn', via: 'Inject' })), 'here', 'a burn\'s tick plays where it burns');
  // Laid out: from the key's middle when it's on screen, else from your bar.
  const g = geoOf(roomy(), 0), keyMid = { x: (g.key.l + g.key.r) / 2, y: g.key.t + (g.key.b - g.key.t) * 0.35 }, barMid = { x: (hud.bar.l + hud.bar.r) / 2, y: (hud.bar.t + hud.bar.b) / 2 };
  // How far where it starts is from a point (0 when its first box holds it).
  const startOf = (plan) => { const el = plan.els[0]; return boxAt(el, el.keys[0]); };
  const near = (q, p, d = 6) => Math.hypot(Math.max(q.l - p.x, 0, p.x - q.r), Math.max(q.t - p.y, 0, p.y - q.b)) < d;
  for (const k of ['ban', 'bash', 'poke', 'ping', 'spike', 'sigint', 'crack', 'inject', 'deploy', 'zero-day', 'firewall', 'patch', 'brace']) {
    const fromKey = layout(RECIPES[k], g, { origin: 'key', rnd: seeded(2) }), noKey = layout(RECIPES[k], { ...g, key: null }, { origin: 'key', rnd: seeded(2) });
    assert.equal(fromKey.from, 'key'); assert.equal(noKey.from, 'bar');
    assert.ok(near(startOf(fromKey), keyMid, 14), `${k} from its key: ${JSON.stringify(startOf(fromKey))}`);
    assert.ok(fromKey.travel >= TRAVEL.min && fromKey.travel <= TRAVEL.max, `${k}: ${fromKey.travel} ms on the way`);
    assert.equal(fromKey.impact, fromKey.travel + (RECIPES[k].land || 0), `${k}: it lands its land after it arrives`);
    if (RECIPES[k].on !== 'you') assert.ok(near(startOf(noKey), barMid, 14), `${k} with no key on screen, from your bar: ${JSON.stringify(startOf(noKey))}`);
  }
  // A crewmate's starts at the middle of their bar in the crew window, in their violet; the crew window out of sight:
  // your bar.
  const mateMid = { x: (crewWin.bar.l + crewWin.bar.r) / 2, y: (crewWin.bar.t + crewWin.bar.b) / 2 };
  for (const k of ['ban', 'bash', 'poke', 'ping', 'crack', 'inject', 'deploy', 'sigint']) {
    const fromMate = layout(RECIPES[k], { ...g, mate: crewWin.bar }, { origin: 'crew', kind: 'crew', rnd: seeded(2) });
    assert.equal(fromMate.from, 'crew');
    assert.ok(near(startOf(fromMate), mateMid, 14), `${k} from the crewmate's bar: ${JSON.stringify(startOf(fromMate))}`);
    assert.ok(fromMate.els.every((el) => /\bcrew\b/.test(el.cls)), `${k}: in their violet`);
    const hidden = layout(RECIPES[k], { ...g, mate: null }, { origin: 'crew', kind: 'crew', rnd: seeded(2) });
    assert.equal(hidden.from, 'bar', `${k}: the crew window out of sight`);
    assert.ok(near(startOf(hidden), barMid, 14), `${k}: from your bar`);
  }
  // Your bar's own effects come from the key too: a streak to the bar first, then they play there.
  for (const k of ['firewall', 'patch', 'brace', 'harden']) {
    const plan = layout(RECIPES[k], g, { origin: 'key', rnd: seeded(2) });
    assert.ok(plan.travel > 0 && plan.els.some((el) => /\bstreak\b/.test(el.cls)), `${k}: a streak from the key`);
    // With no key on screen they start on the bar itself: no travel.
    assert.equal(layout(RECIPES[k], { ...g, key: null }, { origin: 'key' }).travel, 0, k);
  }
  // A burn's tick plays where it burns: no travel.
  assert.equal(layout(RECIPES['inject:tick'], g, { origin: 'here' }).travel, 0);
  // Travel by distance, within its bounds.
  assert.equal(travelOf({ x: 0, y: 0 }, { x: 10, y: 0 }), 0);
  assert.equal(travelOf({ x: 0, y: 0 }, { x: 100, y: 0 }), TRAVEL.min);
  assert.equal(travelOf({ x: 0, y: 0 }, { x: 0, y: 2000 }), TRAVEL.max);
  // app.js: every fired ability from its key; no record of how it was queued any more.
  const appSrc = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /const origin = originOf\(e\);/);
  assert.doesNotMatch(appSrc, /queuedFrom|trayPick|noteQueued/);
  // On the page: the key on screen (key 1's, SIGINT's), or none: the bar.
  const { fx, row } = fakePage({});
  assert.equal(fx.play('ban', row, { ability: 'spike' }).from, 'key');
  assert.equal(fx.play('sigint', row, { ability: 'sigint' }).from, 'key');
  assert.equal(fx.play('ban', row, { ability: 'spike', noKey: true }).from, 'bar', 'the playtest\'s fallback preview');
  const bare = fakePage({ noKeys: true });
  assert.equal(bare.fx.play('ban', bare.row, { ability: 'spike' }).from, 'bar', 'no key in the tray for it (or no tray on screen): your bar');
  // On the page: a crewmate's from their bar in the crew window; theirs out of sight (collapsed, or not their bar): yours.
  assert.equal(fx.play('ban', row, { ability: 'spike', who: 'nyx', origin: 'crew', kind: 'crew' }).from, 'crew');
  assert.equal(fx.play('ban', row, { ability: 'spike', who: 'kade', origin: 'crew', kind: 'crew' }).from, 'bar');
  assert.equal(bare.fx.play('ban', bare.row, { ability: 'spike', who: 'nyx', origin: 'crew', kind: 'crew' }).from, 'bar', 'no crew window: your bar');
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /origin: c\.origin, ability: e\.ability, who: e\.who \|\| null/, 'app.js says whose it is');
  // A crewmate's class (for key 1's word): matesOf gives the crewmates' own states.
  assert.match(app, /const m = matesOf\(campaign\)\.find\(\(x\) => x\.who === who\); return m \? classOf\(m\) : null;/);
});

test('an ability that misses, or has no effect to play, keeps the plain strike; a hit no effect took still strikes', () => {
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(after\.some\(\(x\) => x\.type === 'miss'\)\) continue; \/\/ a miss: the strike's MISS says it/);
  assert.match(app, /if \(result !== 'miss' && taken\.has\(key\)\) continue; \/\/ its ability effect plays there instead\n\s+pendingStrikes\.push\(\(\) => later\(delayOf\(e\), plainStrike\(e, result\)\)\);/);
  assert.match(app, /if \(!played && strike\) later\(land, strike\);/, 'an effect that can\'t play: the strike on the number\'s beat');
  // No part on the board, or no bar of yours on screen: no layout.
  const g = geoOf(roomy(), 0);
  assert.equal(layout(RECIPES.ban, { ...g, part: null }), null);
  assert.equal(layout(RECIPES.firewall, { ...g, mine: null }), null);
});

test('Screen effects off or Motion off: nothing; subtle and medium: lighter than bold; bigger hits and crits throw more', () => {
  assert.equal(levelOf({ level: 'minimal', motion: true }), null);
  assert.equal(levelOf({ level: 'full', motion: false }), null);
  assert.equal(levelOf({ level: 'calm', motion: false }), null);
  assert.equal(levelOf({ level: 'calm' }), 'calm');
  assert.equal(levelOf({ level: 'full' }), 'full');
  const g = geoOf(roomy(), 0);
  for (const r of Object.values(RECIPES)) assert.equal(layout(r, g, { lvl: null }), null);
  const b = { n: 10, per: 10 }, flourish = { n: 1, full: true };
  assert.ok(countOf(b, { lvl: 'calm' }) < countOf(b, { lvl: 'full' }));
  assert.equal(countOf(flourish, { lvl: 'calm' }), 0, 'no flourishes on calm');
  assert.equal(countOf(b, { lvl: null }), 0);
  assert.ok(countOf(b, { power: 0.9 }) > countOf(b, { power: 0.1 }));
  assert.ok(countOf(b, { crit: true }) > countOf(b));
  for (const [k, r] of Object.entries(RECIPES)) {
    const full = layout(r, g, { lvl: 'full', rnd: seeded(3) }).els.length, calm = layout(r, g, { lvl: 'calm', rnd: seeded(3) }).els.length;
    assert.ok(calm <= full, `${k}: calm ${calm} ≤ full ${full}`);
  }
  // On the page: Motion off or effects off plays nothing and puts nothing on the page.
  for (const [motion, level] of [[false, 'full'], [true, 'minimal']]) {
    const { fx, row } = fakePage({ motion, level });
    assert.equal(fx.play('ban', row), false);
    assert.equal(fx.play('firewall', null), false);
    assert.equal(fx.layer(), null, 'no layer, nothing on it');
  }
  const { fx, row } = fakePage({ motion: true, level: 'full' });
  assert.ok(fx.play('ban', row));
  assert.ok(fx.layer().children.length > 3);
  assert.equal(fx.play('hold', row), false, 'no row: no effect (app.js strikes instead)');
});

test('the layer is hidden from screen readers and takes no input; its pieces have no background; nothing on the page moves', () => {
  const { fx, row } = fakePage({});
  assert.ok(fx.play('firewall', null) && fx.play('ban', row, { origin: 'key', ability: 'spike' }));
  assert.equal(fx.layer().id, 'abilityfx');
  assert.equal(fx.layer().attrs['aria-hidden'], 'true');
  const css = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  assert.match(css, /#abilityfx \{[^}]*position: fixed[^}]*pointer-events: none/);
  assert.match(css, /\.afx \{[^}]*pointer-events: none/);
  assert.match(css, /\.no-motion #abilityfx \{ display: none; \}/);
  for (const rule of css.match(/\.afx[^{]*\{[^}]*\}/g)) assert.doesNotMatch(rule, /background|backdrop|filter|mix-blend/, rule);
  // Teal is yours; a crewmate's violet, a hit on ◆ steel (docs/ui.md).
  assert.match(css, /\.afx \{[^}]*color: var\(--you\)/);
  assert.match(css, /\.afx\.crew \{[^}]*var\(--daemon\)/);
  assert.match(css, /\.afx\.chit \{[^}]*var\(--steel\)/);
  // The page itself is never touched: the module only writes to its own layer.
  const src = readFileSync(new URL('./dist/abilityfx.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /board\.(classList|style)|row\.(classList|style)|bar\.(classList|style)|canvas|PIXI/i);
  assert.doesNotMatch(src + readFileSync(new URL('./dist/abilityfx-table.mjs', import.meta.url), 'utf8'), /keyhole|way in/i);
});

test('whatever crosses a part\'s name, ◆ or Integrity is gone within the effect (1.2 s at most, travel included), and nothing stays behind', () => {
  let over = 0, checked = 0;
  const long = new Set();
  variants(({ name, board, i, k, r, lvl, plan, origin }) => {
    assert.ok(plan.dur <= CAP && CAP <= 1200, `${k}: ${plan.dur} ms`);
    if (plan.dur > 1000) long.add(k);
    for (const el of plan.els) {
      const tag = `${name} part ${i} ${k} ${lvl} from ${origin} ${el.cls} "${el.text}"`;
      assert.ok(el.delay + el.dur <= plan.dur + 0.01, `${tag}: ends by the effect's end`);
      assert.equal(el.keys[el.keys.length - 1].o, 0, `${tag}: ends unseen`);
      assert.equal(el.keys[el.keys.length - 1].at, 1, tag);
      for (const { ms, box } of shown(el)) {
        checked++;
        const hit = board.keep.find((q) => overlaps(box, q));
        if (!hit) continue;
        over++;
        assert.ok(ms <= plan.dur, `${tag}: over a name at ${ms} ms, after the effect`);
      }
    }
  }, { seeds: [1] });
  assert.ok(checked > 50000 && over > 1000, `checked ${checked} points, ${over} of them over a name`);
  // Most are under a second; the long trips (from the tray to the top part) may take up to CAP.
  assert.ok(long.size < Object.keys(RECIPES).length / 2, `over 1 s: ${[...long].join(', ')}`);
});

test('in flight it may cross anything for a moment, but it never stops over a key\'s label in the tray or your bar\'s numbers', () => {
  let still = 0;
  variants(({ name, i, k, lvl, plan, origin, g }) => {
    for (const el of plan.els) {
      let prev = null;
      for (const p of shown(el, 60)) {
        if (prev && prev.i === p.i - 1) {
          const moved = Math.hypot(p.box.l - prev.box.l, p.box.t - prev.box.t) + Math.abs(p.box.r - p.box.l - (prev.box.r - prev.box.l));
          if (moved < 0.05) {
            still++;
            const hit = g.originKeep.find((q) => overlaps(p.box, q));
            assert.ok(!hit, `${name} part ${i} ${k} ${lvl} from ${origin} ${el.cls} "${el.text}": at rest over ${JSON.stringify(hit)} at ${Math.round(p.ms)} ms`);
          }
        }
        prev = p;
      }
    }
  }, { seeds: [3] });
  assert.ok(still > 1000, `${still} points at rest checked`);
});

test('a part\'s effect lands on the part (its name cell, or its attack chip), your bar\'s on your bar, at impact', () => {
  for (const board of [roomy(), dense()]) for (let i = 0; i < board.parts.length; i++) for (const origin of ['key', 'no key']) {
    const g = geoOf(board, i, origin === 'key' ? tray[3] : null), part = board.parts[i];
    for (const [k, r] of Object.entries(RECIPES)) {
      const plan = layout(r, g, { rnd: seeded(9), origin: k.endsWith(':tick') ? 'here' : 'key' });
      const where = r.on === 'you' ? hud.bar : r.at === 'chip' && part.chip ? part.chip : r.motion === 'all' ? null : { l: part.cell.l, t: part.row.t, r: part.cell.r, b: part.row.b };
      const targets = where ? [where] : board.parts.map((p) => p.name);
      for (const q of targets) {
        const on = plan.els.some((el) => [...shown(el)].some(({ ms, box }) => ms >= plan.impact - 10 && ms <= plan.impact + 260 && overlaps(box, q)));
        assert.ok(on, `${k} on part ${i} from ${origin}: reaches ${JSON.stringify(q)} at ${plan.impact} ms`);
      }
    }
    // Ban's hammer head lands on the bar's line, over the middle of the name cell.
    const plan = layout(RECIPES.ban, g, { rnd: seeded(5), origin: 'key' }), hammer = plan.els[0], end = boxAt(hammer, keyAt(hammer, plan.impact / hammer.dur));
    assert.ok(Math.abs(end.b - (part.bar.t + part.bar.b) / 2) < 4 && end.l < (part.name.l + part.name.r) / 2 && end.l > part.name.l, JSON.stringify(end));
  }
  // Firewall builds on your bar: its courses over the bar itself, end to end; your bar's effects never on the board.
  const g = geoOf(roomy(), 0);
  const wall = layout(RECIPES.firewall, g, { rnd: seeded(5), origin: 'key' }).els.filter((e) => /wall/.test(e.cls));
  assert.ok(wall.length >= 2);
  for (const w of wall) { const b = boxAt(w, keyAt(w, 0.5)); assert.ok(b.l >= hud.bar.l - 1 && b.r <= hud.bar.r + 1 && b.r - b.l > (hud.bar.r - hud.bar.l) * 0.9 && b.b <= hud.bar.b + 6 && b.t >= hud.nums.b, JSON.stringify(b)); } // under your bar's numbers, a little past the bar's foot
  for (const [k, r] of Object.entries(RECIPES)) {
    if (r.on !== 'you') continue;
    for (const gg of [g, { ...g, key: null }]) for (const el of layout(r, gg, { rnd: seeded(4), origin: 'key' }).els) for (const { box } of shown(el)) {
      if (/\bstreak\b/.test(el.cls)) continue; // in flight from the key
      assert.ok(!g.keep.some((q) => overlaps(box, q)), `${k}: ${el.cls} on a part's name`);
    }
  }
});

test('effects land on time: on the page it starts early (or part-way in) so it lands with its number', () => {
  const g = geoOf(roomy(), 1);
  for (const [k, r] of Object.entries(RECIPES)) {
    const plan = layout(r, g, { rnd: seeded(5), origin: 'key' });
    assert.ok(plan.impact >= 0 && plan.impact < plan.dur, k);
    for (const el of plan.els) assert.ok(el.delay + el.dur <= plan.dur + 0.01, k);
  }
  const crit = layout(RECIPES.ban, g, { crit: true, result: 'crit', rnd: seeded(5) }), mate = layout(RECIPES.ban, g, { kind: 'crew', rnd: seeded(5) }), chit = layout(RECIPES.ban, g, { result: 'chit', rnd: seeded(5) });
  assert.ok(crit.els.every((e) => /\bcrit\b/.test(e.cls)));
  assert.ok(mate.els.every((e) => /\bcrew\b/.test(e.cls)));
  assert.ok(chit.els.some((e) => /\bchit\b/.test(e.cls)) && !/\bchit\b/.test(chit.els[0].cls), 'the shock off ◆ is steel, the hammer stays yours');
  // The page shifts every piece so the impact falls at landIn (and fires onImpact then).
  const timers = [], was = globalThis.setTimeout;
  globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length; };
  try {
    const { fx, row } = fakePage({});
    let at = null;
    const plan = fx.play('ban', row, { origin: 'key', ability: 'spike', landIn: 900, onImpact: () => (at = 'hit') });
    const impactTimer = timers.find((t) => Math.abs(t.ms - 900) < 1);
    assert.ok(plan && impactTimer, 'onImpact at landIn');
    impactTimer.f(); assert.equal(at, 'hit');
    // Its plan without playing it: app.js waits a batch's numbers that long (afxLead), so it is seen from its key.
    assert.equal(fx.plan('ban', row, { ability: 'spike' }).impact, plan.impact);
    const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
    assert.match(app, /start: Math\.max\(queueAfter\(cueAt - performance\.now\(\)\), stack \? 0 : afxLead\(events\)\)/);
    const late = fx.play('ban', row, { origin: 'key', ability: 'spike', landIn: 50 });
    assert.ok(late, 'a number already due: it starts partly through');
  } finally { globalThis.setTimeout = was; }
});

test('on the page: a part\'s attack chip is its attack (or tell), not a routine\'s cue or your command beside it', () => {
  const { fx, row } = fakePage({});
  const chip = fx.measure(row).part.chip, want = roomy().parts[0].chip;
  assert.deepEqual(chip, rect(want.l - 46, want.t - 211, want.r - want.l, want.b - want.t), 'measured in the board\'s pixels');
});

test('on the page: every piece is taken off the layer once its effect is over', () => {
  const timers = [], was = globalThis.setTimeout;
  globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length; };
  try {
    const { fx, row } = fakePage({ motion: true, level: 'full' });
    for (const k of Object.keys(RECIPES)) assert.ok(fx.play(k, RECIPES[k].on === 'you' ? null : row, { origin: 'key', ability: abilityOfKey(k) }), k);
    const layer = fx.layer();
    assert.ok(layer.children.length > 300);
    assert.ok(timers.every((t) => t.ms <= CAP + 60), `every removal by ${CAP + 60} ms: ${Math.max(...timers.map((t) => t.ms))}`);
    for (const t of timers) t.f();
    assert.equal(layer.children.length, 0, 'nothing stays behind');
  } finally { globalThis.setTimeout = was; }
});

// A page just big enough for createAbilityFx: a board, its rows, your bar, the tray, and elements that remember what's
// put on them.
function fakePage({ motion = true, level = 'full', noKeys = false }) {
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
  const you = el('div', b.you.row);
  you.sel = { '.bname': el('div', b.you.cell), '.bcell:nth-child(2)': el('div', b.you.now), '.bname b': el('b', b.keep[b.keep.length - 1]) };
  const rows = b.parts.map((p) => { const r = el('button', p.row); r.sel = { '.bname': el('div', p.cell), '.part-top': el('span', p.name), '.part-bar': el('span', p.bar) }; r.all = { '.intent': p.chip ? [Object.assign(el('div', rect(300, p.row.t + 5, 90, 30)), { sel: {} }), Object.assign(el('div', p.chip), { sel: { '.ico': el('span') } })] : [] }; return r; }); // a cue chip first, then its attack
  board.sel = { '.brow.byou': you };
  board.all = { '.bpart': rows };
  const keys = tray.map((q) => el('button', q)), bar = el('div', hud.bar), nums = el('div', hud.nums);
  globalThis.document = { createElement: (t) => el(t), body: el('body') };
  const fx = createAbilityFx(board, { canMove: () => motion, level: () => level, mineBar: () => bar, mineNums: () => nums, keyEl: (id) => (noKeys ? null : id === 'spike' ? keys[0] : keys[3]), keys: () => (noKeys ? [] : keys), mateBars: (who) => (noKeys || who !== 'nyx' ? [] : [el('span', crewWin.bar)]), crewText: () => (noKeys ? [] : [el('b', crewWin.name), el('small', crewWin.nums)]) });
  return { fx, row: rows[0] };
}
