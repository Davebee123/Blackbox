import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addLocation } from './dist/combat.mjs';
import { graphOf } from './dist/floors.mjs';
import { boardMarkup, hudMarkup, trayMarkup, mapMarkup, mapLayout } from './dist/view.mjs';
import { CONFIG } from './dist/data.mjs';
import { FRESH as __FRESH } from './dist/combat.mjs';
__FRESH.bonus = 0; // exact XP checks: the Fresh bonus has its own tests (phase2.test.mjs)
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1; // mechanics tests use the parts' base numbers
CONFIG.enemyRamp = 0;
CONFIG.salvageChance = 1;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 }; // and no level-gap scaling (combat.test.mjs tests it)

const start = (id = 'cryptjack') => { const s = fresh(); s.hackers = { breaker: { level: 50, xp: 0 } }; selectEncounter(s, id, 7, { level: 6 }); command(s, 'engage'); return s; };

test('each part row shows its attack in the column where it lands', () => {
  const s = start();
  const row = (id) => boardMarkup(s).split('data-target="').find((r) => r.startsWith(id + '"'));
  const cells = (id) => row(id).split('class="bcell').slice(2);
  assert.match(cells('pulse')[2], /Surge/, 'lands on cycle 3');
  assert.match(cells('encryptor')[3], /Encrypt/, 'lands on cycle 4');
  assert.doesNotMatch(cells('pulse')[0], /intent/);
  assert.match(row('encryptor'), /◆◆/, 'its two armor chits');
});

test('the HUD shows the virus and your health side by side', () => {
  const s = start();
  assert.match(hudMarkup(s), /Your server/);
  assert.match(hudMarkup(s), new RegExp(`class="vname"><strong>${s.encounter.virus.name}</strong>`), 'the virus\'s name labels its bar');
});

test('the attack landing now is marked red on the timeline and its part', () => {
  const s = start();
  resolveCycle(s);
  resolveCycle(s);
  assert.match(boardMarkup(s), /intent now/);
  assert.match(boardMarkup(s), /bpart\s+now/);
});

test('veiled parts hide their timers until their armor is gone; a part with broken armor shows cracks and when it patches', () => {
  const s = start('ghostroot');
  assert.match(boardMarkup(s), /Veiled: hides its timers/);
  command(s, 'crack scrambler');
  resolveCycle(s);
  command(s, 'spike pulse');
  resolveCycle(s);
  assert.doesNotMatch(boardMarkup(s), /Veiled: hides its timers/);
  assert.match(boardMarkup(s), /◆ patch/);
  assert.match(boardMarkup(s), /bpart[^"]*cracked/, 'broken armor shows as cracks');
  assert.doesNotMatch(boardMarkup(s), /bare/i);
});

test('tray shows cooldown and queued states', () => {
  const s = start();
  command(s, 'overload pulse');
  assert.match(trayMarkup(s), /class="ability[^"]*queued"/);
  resolveCycle(s);
  assert.match(trayMarkup(s), /cooling\s+[^"]*" data-ability="overload"[^]*?ready in 2 cycles[^]*?class="cd"[^>]*>2</);
});

test('a mutation is a tag, its rule on hover (and in a first-time tip); the gate card is just the virus and Engage', async () => {
  const { TIPS } = await import('./dist/tips.mjs');
  const s = start('splinter');
  assert.match(hudMarkup(s), /data-mut="regenerative" title="[^"]*patches its ◆ back 1 cycle sooner/);
  assert.doesNotMatch(hudMarkup(s), /<p class="mutation-rule"/);
  assert.ok(TIPS.some((t) => t.id === 'mut-regenerative' && /1 cycle sooner/.test(t.text)));
  const h = fresh();
  selectEncounter(h, 'splinter', 1);
  assert.match(mapMarkup(h, 'intrusion'), /At the gate/);
  assert.match(mapMarkup(h, 'intrusion'), /Engage/);
  assert.doesNotMatch(mapMarkup(h, 'intrusion'), /Neutralize it/);
});

test('the map shows a floor: home above it, SPRAWL-00 its entry, found servers at their places, the intrusion beside home', () => {
  const s = fresh();
  selectEncounter(s, 'cryptjack', 1);
  command(s, 'developer location worm');
  command(s, 'developer location ransomware');
  const { nodes, links, floor } = mapLayout(s);
  assert.equal(floor, 1);
  const home = nodes.find((n) => n.id === 'server'), zone = nodes.find((n) => n.kind === 'zone');
  assert.ok(home && zone && home.y < Math.min(...nodes.filter((n) => n !== home).map((n) => n.y)), 'home above the floor');
  assert.ok(nodes.some((n) => n.kind === 'intrusion'));
  assert.equal(nodes.filter((n) => n.kind === 'location').length, 2);
  assert.ok(nodes.filter((n) => n.kind === 'exit').every((n) => n.open), 'the way down shows only once a server beside it is found');
  assert.ok(links.every((l) => nodes.some((n) => n.id === l.from) && nodes.some((n) => n.id === l.to)));
});

test('a server on another floor shows on its own floor\'s map, and selecting it shows that floor', () => {
  const s = fresh();
  command(s, 'developer location worm');
  s.floors.reached = 2;
  const g = graphOf(s, 2), two = addLocation(s, 'worm', 2, null, g.order[0]);
  assert.equal(two.depth, 2);
  assert.ok(!mapLayout(s, 1).nodes.some((n) => n.id === two.id), 'floor 1 shows floor 1');
  assert.ok(mapLayout(s, 2).nodes.some((n) => n.id === two.id), 'floor 2 shows it');
  assert.match(mapMarkup(s, two.id), /aria-label="Floor 2, Backhaul"/, 'selecting it shows its floor');
});

test('unknown servers linked to one you found show as ? with their trace', () => {
  const s = fresh();
  command(s, 'developer location ghostroot');
  const h = s.hidden.find((x) => x.depth === 1);
  h.lead = 50;
  assert.ok(mapLayout(s).nodes.some((x) => x.kind === 'hidden' && x.hidden === h), 'on the map');
  assert.match(mapMarkup(s, h.id), /Unknown server · floor 1/);
  assert.match(mapMarkup(s, h.id), /50% traced/);
});

test('the Now header shows the cycle number', () => {
  const s = start();
  assert.match(boardMarkup(s), /Now <small class="cyc">cycle 1<\/small>/);
  resolveCycle(s);
  assert.match(boardMarkup(s), /cycle 2/);
});

test('run skills (Spoof, Tap) take no slot: the tray leaves them out, and equipping one says it\'s typed on runs', async () => {
  const { trayMarkup } = await import('./dist/view.mjs');
  const { fresh, command, equippedSkills } = await import('./dist/combat.mjs');
  const s = fresh();
  s.loadout.archetype = 'infiltrator';
  s.loadout.sub = { infiltrator: 'phantom' };
  s.hackers = { infiltrator: { level: 30, xp: 0 } };
  s.loadout.equipped.phantom = ['inject', 'spoof'];
  assert.deepEqual(equippedSkills(s, 'infiltrator'), ['inject']);
  s.loadout.equipped.phantom = ['inject'];
  assert.match(command(s, 'equip spoof').at(-1).message, /run skill/);
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.doesNotMatch(trayMarkup(s), /Spoof/);
});

test('a win writes what it gave you into the log: damage taken, XP (one line; the server has no XP of its own), salvage; no lead (leads come from rooms since floors)', () => {
  const s = fresh();
  selectEncounter(s, 'cryptjack', 7, { level: 1 });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  command(s, 'spike pulse');
  resolveCycle(s);
  command(s, 'spike encryptor');
  const events = resolveCycle(s);
  assert.equal(s.encounter.phase, 'victory');
  const text = events.map((e) => e.message).join('\n');
  assert.match(text, /neutralized in 2 cycles\. Nothing got through/);
  assert.match(text, /\+30 XP/);
  assert.doesNotMatch(text, /Server \+30 XP/, 'no second line for the server');
  assert.equal(s.serverXp, undefined, 'the server has no XP: its level is your highest class level');
  assert.match(text, /Component recovered/);
  assert.doesNotMatch(text, /lead|traced/i, 'a home kill traces nothing');
});

test('the spoils card lists what a won fight gave you', async () => {
  const { spoilsOf } = await import('./dist/view.mjs');
  const lines = spoilsOf([
    { type: 'loot' }, { type: 'loot' }, { type: 'victory' },
    { type: 'xp', amount: 30 }, { type: 'code', gains: { cipher: 2 } },
    { type: 'drop', message: 'X dropped a file.', pack: true }, { type: 'level-up', level: 4 },
  ]).map((l) => l.text + (l.pack ? ' (pack)' : ''));
  const { spoilsMarkup } = await import('./dist/view.mjs');
  const html = spoilsMarkup({ name: 'CRYPTJACK', level: 1, family: 'Ransomware', cycles: 2, damage: 0, clean: true }, spoilsOf([{ type: 'xp', amount: 30 }, { type: 'loot' }]), { level: 1, from: 0, to: 0.3 });
  assert.match(html, /CRYPTJACK/);
  assert.match(html, /\+30/);
  assert.deepEqual(lines, ['2 components', '+30 XP', '+2 Cipher code', 'Drop (pack)', 'Level 4']);
});

test('Status in the HUD: timed effects on you with the cycles they have left (Momentum, buffs, Scrambled)', async () => {
  const { statusSpans, boardMarkup, hudMarkup } = await import('./dist/view.mjs');
  const { fresh, selectEncounter, command } = await import('./dist/combat.mjs');
  const s = fresh();
  s.loadout.archetype = 'breaker';
  selectEncounter(s, 'cryptjack', 7, { level: 3 });
  command(s, 'engage');
  assert.deepEqual(statusSpans(s), [], 'nothing running');
  assert.match(hudMarkup(s), /nothing on you/);
  assert.doesNotMatch(boardMarkup(s, null), /bstatus/, 'no Status row on the board');
  const e = s.encounter;
  e.momentum = { stacks: 2, until: e.cycle + 1 };
  e.scrambleUntil = e.cycle + 2;
  const spans = statusSpans(s);
  assert.deepEqual(spans.map((x) => [x.name, x.cycles, x.kind]), [['Momentum', 2, 'you'], ['Scrambled', 3, 'hot']]);
  assert.equal(spans[0].value, '+20% ×2');
  assert.match(hudMarkup(s), /class="st you" data-tip="\+20% ×2 · 2 cycles left[^"]*"[^>]*>Momentum<\/span>/, 'the name, the rest in the tooltip');
});

test('the forecast: what your command will cost a part, and what the virus will cost you, before the cycle resolves', async () => {
  const { forecast, boardMarkup, hudMarkup } = await import('./dist/view.mjs');
  const { previewDamage } = await import('./dist/combat.mjs');
  const s = fresh();
  selectEncounter(s, 'cryptjack', 7, { level: 3 });
  command(s, 'engage');
  const e = s.encounter;
  const [a, b] = e.virus.parts;
  a.armor = 1;
  command(s, 'spike ' + a.id);
  assert.equal(forecast(s).parts[a.id] || 0, 0, 'an armored part: the hit only breaks a chit');
  assert.equal(forecast(s).chits[a.id], 1, 'and that chit blinks');
  assert.match(boardMarkup(s, null), /<b class="going">◆<\/b>/);
  s.loadout.archetype = 'infiltrator'; s.hackers = { infiltrator: { level: 3, xp: 0 } };
  e.queue = { ability: 'tag', target: a.id, text: 'tag ' + a.id };
  assert.equal(forecast(s).chits[a.id] || 0, 1, 'Tag hits for 10 (docs/kits.md): on armor it breaks a chit');
  e.queue = { ability: 'keepalive', target: a.id, text: 'keepalive ' + a.id };
  assert.equal(forecast(s).chits[a.id] || 0, 0, 'Keepalive doesn\'t hit: no chit breaks');
  e.queue = { ability: 'crack', target: a.id, text: 'crack ' + a.id };
  a.armor = 2; a.maxArmor = 2;
  assert.equal(forecast(s).chits[a.id], 2, 'Crack strips two');
  e.queue = { ability: 'spike', target: a.id, text: 'spike ' + a.id };
  a.armor = 1;
  a.armor = 0;
  assert.equal(forecast(s).parts[a.id], previewDamage(s, 'spike', a));
  assert.match(boardMarkup(s, null), /class="loss"/);
  for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
  b.attack.due = e.cycle; b.attack.effect = 'damage';
  e.chits = 0; e.shield = 0;
  assert.ok(forecast(s).you > 0, 'an attack landing this cycle costs you');
  assert.match(hudMarkup(s), /hud-bar mine[^]*class="loss"/);
  e.chits = 1;
  assert.equal(forecast(s).you, e.encrypt || 0, 'an armor chit takes the hit');
});

test('a server card shows its sockets and the programs it runs (no outpost card, no Build panel)', async () => {
  const { mapMarkup } = await import('./dist/view.mjs');
  const { play } = await import('./dist/run.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  const l = s.locations[0];
  l.lockUntil = 0;
  play(s, `connect ${l.id}`); play(s, 'jack out');
  const sock = Object.values(l.floorplan.graph.rooms).find((x) => x.kind === 'socket');
  l.floorplan.programs = { [sock.id]: 'harvester' };
  const html = mapMarkup(s, l.id, 'mine', { pop: true });
  assert.match(html, /Sockets 0\/\d/);
  assert.match(html, /Harvester/);
  assert.doesNotMatch(html, /data-build-open=|Building slots/);
});

test('what you type changes the expected damage on the board before you press Enter', async () => {
  const { forecast } = await import('./dist/view.mjs');
  const s = fresh();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) p.armor = 0;
  const p = s.encounter.virus.parts[0];
  command(s, `spike ${p.id}`);
  const queued = forecast(s).parts[p.id];
  const typed = forecast(s, { ability: 'overload', target: p.id, ok: true }).parts[p.id];
  assert.ok(typed > queued, `${typed} vs ${queued}`);
  assert.equal(forecast(s, { ability: 'overload', target: p.id, ok: false }).parts[p.id], queued, 'one that would not go through changes nothing');
});

test('the chit forecast knows a heavy hit breaks two', async () => {
  const { forecast } = await import('./dist/view.mjs');
  const s = fresh();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  const p = s.encounter.virus.parts.find((x) => x.armor > 0);
  p.armor = 3;
  assert.equal(forecast(s, { ability: 'spike', target: p.id, ok: true }).chits[p.id], 1);
  assert.equal(forecast(s, { ability: 'overload', target: p.id, ok: true }).chits[p.id], 2);
});

// "It seems like I'm missing Overload a lot": a hit on a part that still wears ◆ breaks one (two for a heavy hit) and
// deals no damage. The tray says so before you fire: a ◆ on each damaging key armor would take whole, read off the
// ability data and the hit rule (combat.mjs armorTakes), never on the skills that break or ignore ◆.
test('the ◆ badge: on a damaging key armor would absorb, aimed at an armored part; never on Crack and the armor breakers', async () => {
  const { armorTakes } = await import('./dist/combat.mjs');
  // A Demolitionist, picked: since level 10 no longer plays a default subclass, its line's keys need the pick.
  const s = fresh(); s.hackers = { breaker: { level: 50, xp: 0 } }; command(s, 'subclass demolitionist'); selectEncounter(s, 'cryptjack', 7, { level: 6 }); command(s, 'engage');
  const enc = part(s, 'encryptor');
  enc.armor = enc.maxArmor = 3;
  const key = (html, id) => html.split('<button').find((k) => k.includes(`data-ability="${id}"`)).split('</button>')[0];
  const html = trayMarkup(s, 'encryptor');
  assert.match(key(html, 'overload'), /class="armd" title="Armor takes this hit: it breaks 2 ◆ and deals no damage\. Crack it first\."/, 'Overload is a heavy hit: two ◆');
  assert.match(key(html, 'spike'), /class="armd" title="Armor takes this hit: it breaks 1 ◆/);
  assert.match(key(html, 'flood'), /class="armd"/, 'Flood doubles only on a bare part: on ◆ it is absorbed like any hit');
  for (const id of ['crack', 'shaped-charge', 'thermal-runaway', 'rm-rf', 'logic-bomb']) assert.doesNotMatch(key(html, id), /armd/, `${id}: breaks ◆, or no hit now`);
  // The rule behind it: piercers, strippers and the skills that break 2 ◆ on armor never count; a bare part never does.
  for (const id of ['backdoor', 'zero-day', 'side-channel', 'crack', 'shaped-charge', 'fork-bomb', 'rate-limit', 'reclaim', 'chain-reaction', 'bit-rot', 'inject', 'harden']) assert.equal(armorTakes(s, id, enc), 0, id);
  assert.equal(armorTakes(s, 'overload', enc), 2);
  assert.equal(armorTakes(s, 'exploit', enc), 1);
  enc.armor = 1;
  assert.equal(armorTakes(s, 'overload', enc), 1, 'one ◆ left: one to break');
  enc.armor = 0;
  assert.equal(armorTakes(s, 'overload', enc), 0);
  assert.doesNotMatch(key(trayMarkup(s, 'encryptor'), 'overload'), /armd/, 'a bare part: Overload lands');
  // No part selected: the key's own target (the last part you hit, else the soonest attacker), as Enter would fire it.
  const pulse = part(s, 'pulse');
  pulse.armor = pulse.maxArmor = 2;
  s.encounter.lastAttack = 'spike pulse';
  assert.match(key(trayMarkup(s), 'overload'), /armd/, 'aimed at the Pulse Node, which wears ◆');
  // Queued: the queued target, and the board's Now chip carries the same ◆.
  enc.armor = 2;
  command(s, 'overload encryptor');
  assert.match(key(trayMarkup(s, 'pulse'), 'overload'), /breaks 2 ◆/, 'the queued target, not the selection');
  assert.match(boardMarkup(s, null), /<div class="intent mine"[^>]*>overload encryptor<span class="armd" title="Armor takes this hit/);
  command(s, 'crack encryptor');
  assert.doesNotMatch(boardMarkup(s, null).match(/<div class="intent mine"[^]*?<\/div>/)[0], /armd/, 'Crack queued: no badge');
});
