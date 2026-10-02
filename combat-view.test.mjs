import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part } from './dist/combat.mjs';
import { boardMarkup, hudMarkup, trayMarkup, mapMarkup, mapLayout } from './dist/view.mjs';
import { CONFIG } from './dist/data.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1; // mechanics tests use the parts' base numbers
CONFIG.enemyRamp = 0;
CONFIG.salvageChance = 1;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)

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
  assert.match(hudMarkup(s), /Virus/);
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
  assert.match(boardMarkup(s), /timers stay hidden/);
  command(s, 'crack scrambler');
  resolveCycle(s);
  command(s, 'spike pulse');
  resolveCycle(s);
  assert.doesNotMatch(boardMarkup(s), /timers stay hidden/);
  assert.match(boardMarkup(s), /◆ patch/);
  assert.match(boardMarkup(s), /bpart[^"]*cracked/, 'broken armor shows as cracks');
  assert.doesNotMatch(boardMarkup(s), /bare/i);
});

test('tray shows cooldown and queued states', () => {
  const s = start();
  command(s, 'overload pulse');
  assert.match(trayMarkup(s), /ability\s+queued/);
  resolveCycle(s);
  assert.match(trayMarkup(s), /cooling\s+[^"]*" data-ability="overload"[^]*?2 cycles/);
});

test('a mutation is a tag, its rule on hover (and in a first-time tip); the gate card is just the virus and Engage', async () => {
  const { TIPS } = await import('./dist/tips.mjs');
  const s = start('splinter');
  assert.match(hudMarkup(s), /data-mut="regenerative" title="[^"]*patches its armor after 1 cycle/);
  assert.doesNotMatch(hudMarkup(s), /<p class="mutation-rule"/);
  assert.ok(TIPS.some((t) => t.id === 'mut-regenerative' && /after 1 cycle/.test(t.text)));
  const h = fresh();
  selectEncounter(h, 'splinter', 1);
  assert.match(mapMarkup(h, 'intrusion'), /At the gate/);
  assert.match(mapMarkup(h, 'intrusion'), /Engage/);
  assert.doesNotMatch(mapMarkup(h, 'intrusion'), /Neutralize it/);
});

test('the map puts the server at the centre and origins around it', () => {
  const s = fresh();
  selectEncounter(s, 'cryptjack', 1);
  command(s, 'developer location worm');
  command(s, 'developer location ransomware');
  const { nodes, links } = mapLayout(s);
  assert.deepEqual(nodes.find((n) => n.id === 'server'), { id: 'server', kind: 'server', x: 0, y: 0, angle: 0, r: 0 });
  assert.ok(nodes.some((n) => n.kind === 'intrusion'));
  assert.equal(nodes.filter((n) => n.kind === 'location').length, 2);
  assert.ok(links.every((l) => nodes.some((n) => n.id === l.from) && nodes.some((n) => n.id === l.to)));
});

test('deeper layers branch from the node that pointed to them', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const root = s.locations[0];
  s.locations.push({ ...root, id: 'deep-1', name: 'DEEP-1', depth: 2, parent: root.id, state: { cleared: {}, unlocked: {}, taken: {} } });
  const { nodes, links } = mapLayout(s);
  const a = nodes.find((n) => n.id === root.id), b = nodes.find((n) => n.id === 'deep-1');
  assert.ok(b.r > a.r);
  assert.ok(links.some((l) => l.from === root.id && l.to === 'deep-1'));
});

test('leads in progress show as ghost nodes', () => {
  const s = fresh();
  s.leadProgress.ghostroot = 50;
  assert.ok(mapLayout(s).nodes.some((n) => n.kind === 'lead' && n.family === 'ghostroot'));
  assert.match(mapMarkup(s, 'lead-ghostroot'), /Ghostroot · 50%/);
});

test('the Now header shows the cycle number', () => {
  const s = start();
  assert.match(boardMarkup(s), /Now <small class="cyc">cycle 1<\/small>/);
  resolveCycle(s);
  assert.match(boardMarkup(s), /cycle 2/);
});

test('the tray shows a run skill (Spoof) as "on runs" in a fight', async () => {
  const { trayMarkup } = await import('./dist/view.mjs');
  const { fresh, command } = await import('./dist/combat.mjs');
  const s = fresh();
  s.loadout.archetype = 'infiltrator';
  s.hackers = { infiltrator: { level: 30, xp: 0 } };
  s.loadout.equipped.infiltrator = ['inject', 'spoof'];
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.match(trayMarkup(s), /Spoof<\/span><span class="state">on runs/);
});

test('a win writes what it gave you into the log: damage taken, XP, server XP, salvage, lead', () => {
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
  assert.match(text, /Server \+30 XP/);
  assert.match(text, /Cipher Seed recovered/);
  assert.match(text, /Ransomware lead/);
});

test('the spoils card lists what a won fight gave you', async () => {
  const { spoilsOf } = await import('./dist/view.mjs');
  const lines = spoilsOf([
    { type: 'loot' }, { type: 'loot' }, { type: 'victory' },
    { type: 'xp', amount: 30 }, { type: 'code', gains: { cipher: 2 } },
    { type: 'drop', message: 'X dropped a blueprint.', pack: true }, { type: 'level-up', level: 4 },
  ]).map((l) => l.text + (l.pack ? ' (pack)' : ''));
  const { spoilsMarkup } = await import('./dist/view.mjs');
  const html = spoilsMarkup({ name: 'CRYPTJACK', level: 1, family: 'Ransomware', cycles: 2, damage: 0, clean: true }, spoilsOf([{ type: 'xp', amount: 30 }, { type: 'loot' }]), { level: 1, from: 0, to: 0.3 });
  assert.match(html, /CRYPTJACK/);
  assert.match(html, /\+30/);
  assert.deepEqual(lines, ['2 salvage', '+30 XP', '+2 Cipher code', 'Blueprint (pack)', 'Level 4']);
});

test('the Status row: timed effects on you as bars over the cycles they last (Momentum, buffs, blind)', async () => {
  const { statusSpans, boardMarkup } = await import('./dist/view.mjs');
  const { fresh, selectEncounter, command } = await import('./dist/combat.mjs');
  const s = fresh();
  s.loadout.archetype = 'breaker';
  selectEncounter(s, 'cryptjack', 7, { level: 3 });
  command(s, 'engage');
  assert.deepEqual(statusSpans(s), [], 'nothing running: no row');
  assert.doesNotMatch(boardMarkup(s, null), /bstatus/);
  const e = s.encounter;
  e.momentum = { stacks: 2, until: e.cycle + 1 };
  e.blindUntil = e.cycle + 2;
  const spans = statusSpans(s);
  assert.deepEqual(spans.map((x) => [x.name, x.cycles, x.kind]), [['Momentum', 2, 'you'], ['Blinded', 3, 'hot']]);
  assert.equal(spans[0].value, '+20% ×2');
  assert.match(boardMarkup(s, null), /class="sbar you" style="grid-column: 1 \/ span 2"/);
});
