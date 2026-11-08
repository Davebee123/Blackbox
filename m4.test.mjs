import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork, ratioOf, travelMs } from './dist/invasion.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const T0 = 1_000_000;
hooks.now = () => T0;
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 30 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, "spike " + p.id); resolveCycle(s); }
};
const takeOver = (s, loc) => {
  play(s, 'connect ' + loc.id);
  const layout = layoutOf(loc);
  const guardDir = Object.keys(layout).find((k) => layout[k].guard);
  const vault = Object.keys(layout).find((k) => layout[k].locked);
  play(s, 'cd ' + guardDir);
  if (s.encounter?.phase === 'alert' || active(s)) win(s);
  play(s, 'cd ' + vault.slice(0, vault.lastIndexOf('/')));
  play(s, `unlock vault ${loc.password}`);
  // The Resident in /core (run.mjs): beat it to take the server, then come back to the vault.
  play(s, 'cd /core');
  if (s.encounter?.phase === 'alert' || active(s)) win(s);
  play(s, 'cd ' + vault.slice(0, vault.lastIndexOf('/')));
  play(s, 'cd vault');
};
const withFirewall = () => { const s = fresh(); s.services = { firewall: 1, tarpit: 1, honeypot: 1, hotpatch: 1 }; return s; };
const FILTER_BAY = 120; // a v1 service's credits (the retired VERSIONS table)

test('configs are gone (a save that owned one gets its credits back), and the wall is three knobs', async () => {
  const { restore, SAVE_VERSION } = await import('./dist/combat.mjs');
  const s = withFirewall();
  Object.assign(s, { version: 29, configsOwned: ['stateful', 'triage'], configsKnown: ['stateful', 'triage', 'beacon'], configs: { firewall: 'stateful' } });
  s.services = { ...s.services, tarpit: 2, honeypot: 1 };
  const credits = s.server.credits;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  assert.deepEqual(t.configsOwned, []); assert.deepEqual(t.configsKnown, [], 'configs are gone, Triage too');
  assert.deepEqual(t.configs, {});
  assert.ok(!t.services.tarpit && !t.services.honeypot);
  const { CRAFT_REFUND } = await import('./dist/progression.mjs');
  assert.equal(t.server.credits, credits + 2 * 250 + 2 * FILTER_BAY + CRAFT_REFUND.filter(1), 'stateful and triage refunded, and (v34) the Filter Bay and the Hot-patcher come back as what they cost, the filter recipe one taught as credits (v47)');
  const stats = t.filters.held.map((f) => Object.keys(f.stats));
  assert.ok(stats.some((k) => k.includes('tarpit')) && stats.some((k) => k.includes('evasion')), 'each retired service comes back as a filter');
});

// Payloads, held hubs and swarms are cut (docs/factions-plan.md 10): a held hub is paid out once, with wick's letter.
test('a save that holds a hub is paid out once in credits, with a letter, and loads twice the same', async () => {
  const { HUB_PAYOUT } = await import('./dist/store.mjs');
  const s = fresh();
  command(s, 'mail');
  (s.hubs ||= {}).kestrel = { id: 'hub-kestrel', faction: 'kestrel', stock: {}, restockAt: 0, captured: { at: 0, bank: 40, wall: { level: 9 } }, offlineUntil: 5 };
  s.payloads = { built: [{ id: 1, kind: 'exfil', level: 3, power: 16 }], flying: [], serial: 1, last: null };
  s.fleet = { id: 'fl1', hub: 'kestrel' }; s.net.retakeAt = 9;
  const credits = s.server.credits, letters = s.mail.list.length;
  const back = restore(JSON.parse(JSON.stringify({ ...s, version: 59 })));
  const pay = 40 + HUB_PAYOUT.hours * HUB_PAYOUT.income(4) + HUB_PAYOUT.payload(3);
  assert.equal(back.server.credits, credits + pay, 'its bank, a day of its income, the payload at cost');
  assert.equal(back.mail.list.length, letters + 1);
  assert.match(back.mail.list[0].subject, /sold it back/);
  assert.ok(!back.hubs.kestrel.captured && !('offlineUntil' in back.hubs.kestrel) && !back.payloads && !back.fleet && back.net.retakeAt === undefined);
  const again = restore(JSON.parse(JSON.stringify(back)));
  assert.equal(again.server.credits, back.server.credits, 'keyed on the field: no second payout');
});

test('a v24 save loads with configs and no fleet', () => {
  const s = fresh();
  delete s.configs; delete s.fleet;
  const back = restore(JSON.parse(JSON.stringify({ ...s, version: 24 })));
  assert.equal(back.version, SAVE_VERSION);
  assert.deepEqual(back.configs, {});
  assert.ok(!back.fleet);
});

test('services, outposts and architecture are gone (R2): their commands say where the choices went, and a held server stores nothing while you are away', () => {
  const s = withFirewall();
  command(s, 'install router');
  assert.match(s.logs.at(-1).message, /Services are gone/);
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  command(s, `outpost ${a.id}`);
  assert.match(s.logs.at(-1).message, /Outposts are gone/);
  command(s, 'developer server 20');
  command(s, 'architecture fortress');
  assert.match(s.logs.at(-1).message, /architecture is gone/);
  assert.equal(s.architecture ?? null, null);
  s.net.next = 1e12;
  tickNetwork(s, T0);
  const before = JSON.stringify(s.materials);
  tickNetwork(s, T0 + 60 * 60000);
  assert.equal(JSON.stringify(s.materials), before, 'nothing produces on its own: programs pay as you clear rooms');
  assert.ok(!a.outpost && !a.buildings);
});
