// Scripts (docs/roguelite.md 11): one-shot programs you carry from breach to breach, like a potion or a scroll. They
// were CVEs, relics that lasted a breach; the best of them became scripts. You carry up to SCRIPT.slots (Archive, a
// captured backup subsystem, adds slots). In a fight, `script <n> [part]` (or its button on the tray) runs one: it
// takes no cycle, and one script a fight. They drop rarely (a vault, an elite, the hunter, the Resident), a bounty
// pays one, and brokers sell them for tokens. A script you find with every slot full stays where it was.
//
// Where they live: the campaign keeps them on s.camp.scripts (they persist, like gear); a playtest breach, which has
// no campaign, on s.breach.scripts. giveScript is the one way in, for anything that hands one over (a broker, a
// drop, a bounty, and LOWLIGHT's room or a dead drop once the world has them).
import { emit, warn, heal, hit, alive, part, livingParts, soonestAttacker, attackers, defender, scaled, usable, active, finish, virusIntegrity } from './combat.mjs';
import { tellCallOff } from './tells.mjs';

export const SCRIPT = { slots: 3, rarity: { common: 60, uncommon: 30, rare: 10 }, price: { common: 35, uncommon: 55, rare: 85 } };
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const pctOf = (s, k) => Math.max(1, Math.round(defender(s).max * k));
// target: 'part' when it takes the part you name (the soonest attacker when you name none).
// use(s, p): does it, and returns false when there was nothing for it to do (the script is kept).
export const SCRIPTS = {
  sasser: { name: 'Sasser', rarity: 'common', text: 'Restores 20% of your max Signal.', use: (s) => { const d = defender(s); if (d.integrity >= d.max) return false; heal(s, pctOf(s, 0.2), 'Sasser restores', { lift: true }); } },
  krack: { name: 'KRACK', rarity: 'common', text: 'Shields you for 20% of your max Signal.', use: (s) => { const e = s.encounter, n = pctOf(s, 0.2); e.shield = Math.max(e.shield || 0, n); emit(s, 'status', `KRACK shields you for ${n}.`, { mark: 'shield' }); } },
  shellshock: { name: 'Shellshock', rarity: 'common', text: 'Delays the attack that lands soonest by 3 cycles.', use: (s) => { const p = soonestAttacker(s); if (!p?.attack || p.attack.due >= 900) return false; p.attack.due += 3; emit(s, 'interrupt', `Shellshock: the ${p.name}'s ${p.attack.name} is delayed ${cyc(3)}.`, { target: p.id }); } },
  spectre: { name: 'Spectre', rarity: 'common', text: 'Exposes every part for 2 cycles.', use: (s) => { const e = s.encounter; for (const p of livingParts(s)) p.exposedUntil = Math.max(p.exposedUntil || 0, e.cycle + 1); emit(s, 'status', 'Spectre Exposes every part for 2 cycles.', { mark: 'exposed' }); } },
  bluekeep: { name: 'BlueKeep', rarity: 'uncommon', text: 'Breaks 1 ◆ on every part.', use: (s) => { const xs = livingParts(s).filter((p) => p.armor > 0); if (!xs.length) return false; for (const p of xs) { p.armor--; if (!p.armor) p.patchAt = s.encounter.cycle + 3; } emit(s, 'armor', `BlueKeep breaks 1 ◆ on ${xs.length === 1 ? `the ${xs[0].name}` : `${xs.length} parts`}.`, {}); } },
  slowloris: { name: 'Slowloris', rarity: 'uncommon', text: 'Delays every attack by 2 cycles.', use: (s) => { const xs = attackers(s).filter((p) => p.attack.due < 900); if (!xs.length) return false; for (const p of xs) p.attack.due += 2; emit(s, 'interrupt', `Slowloris: every attack is delayed ${cyc(2)}.`, {}); } },
  conficker: { name: 'Conficker', rarity: 'uncommon', text: 'Makes every skill on your bar ready now.', use: (s) => { const e = s.encounter, xs = usable(s).filter((id) => e.readyAt[id] > e.cycle); if (!xs.length) return false; for (const id of xs) delete e.readyAt[id]; emit(s, 'proc', `Conficker: ${xs.length === 1 ? 'a skill is' : `${xs.length} skills are`} ready.`, {}); } },
  mirai: { name: 'Mirai', rarity: 'uncommon', target: 'part', text: 'Sends 3 helpers at the target, each dealing 6 damage every cycle for 4 cycles.', use: (s, p) => { const e = s.encounter, n = scaled(s, 6); for (let i = 0; i < 3; i++) e.helpers.push({ target: p.id, damage: n, left: 4, synced: false }); emit(s, 'status', `Mirai sends 3 helpers at the ${p.name}, dealing ${n} every cycle for 4 cycles.`, { target: p.id, mark: 'helper' }); } },
  ripple20: { name: 'Ripple20', rarity: 'rare', text: 'Calls off every tell a part is winding up.', use: (s) => (tellCallOff(s, 'Ripple20') ? undefined : false) },
  meltdown: { name: 'Meltdown', rarity: 'rare', target: 'part', text: 'Deals damage to the target equal to 30% of its max Integrity, through armor. It counts toward calling off a charge.', use: (s, p) => { const e = s.encounter, was = e.commanding; e.commanding = { id: 'meltdown', at: e.cycle, target: p.id }; hit(s, p, Math.round(p.max * 0.3), { by: 'Meltdown', pierce: true }); e.commanding = was; } },
};
for (const [id, x] of Object.entries(SCRIPTS)) x.id = id;
export const TIER = { common: 'stock', uncommon: 'tuned', rare: 'custom' }; // a script's rarity in the item colours

// ---------- what you carry ----------
// Your slots: the campaign's (Archive adds one, two at tier II), or the playtest breach's.
export const scriptHooks = { slots: null }; // campaign.mjs: Archive's extra slots, from your network
export const slotsOf = (s) => SCRIPT.slots + (scriptHooks.slots?.(s) || 0);
export function scriptsOf(s) {
  if (s.camp) return (s.camp.scripts ||= []);
  if (s.breach) return (s.breach.scripts ||= []);
  return [];
}
// A line in the breach's tty too, when there is one.
function log(s, type, text) {
  const b = s.breach;
  if (b?.log) { b.log.push(text); if (b.log.length > 40) b.log.shift(); }
  return emit(s, type, text);
}
// Hand a script over: it goes in a free slot, or (every slot full) stays where it was. Returns true if you took it.
export function giveScript(s, id, why = 'Script: ') {
  const x = SCRIPTS[id], bag = scriptsOf(s);
  if (!x) return false;
  if (bag.length >= slotsOf(s)) { log(s, 'breach-bad', `${x.name} stays behind: your ${slotsOf(s)} script slots are full.`); return false; }
  bag.push(id);
  log(s, 'breach-good', `${why}${x.name}. ${x.text}`);
  return true;
}
// A random script: by rarity (SCRIPT.rarity), never under floor ('uncommon' or 'rare').
export function rollScript(r, floor = null) {
  const order = ['common', 'uncommon', 'rare'], lo = floor ? order.indexOf(floor) : 0;
  const w = Object.entries(SCRIPT.rarity).filter(([k]) => order.indexOf(k) >= lo), total = w.reduce((n, [, v]) => n + v, 0);
  let x = r() * total, rarity = w[0][0];
  for (const [k, v] of w) if ((x -= v) < 0) { rarity = k; break; }
  const ids = Object.keys(SCRIPTS).filter((id) => SCRIPTS[id].rarity === rarity);
  return ids[Math.floor(r() * ids.length)];
}
// A stall's scripts: n of them, no two alike (brokers; LOWLIGHT's room can stock from it too).
export function scriptStock(r, n = 3, floor = null) {
  const out = [];
  for (let i = 0; i < 20 && out.length < n; i++) { const id = rollScript(r, floor); if (!out.includes(id)) out.push(id); }
  return out;
}
export const priceOf = (id) => SCRIPT.price[SCRIPTS[id].rarity];

// ---------- running one ----------
// Why you can't run a script now, or null.
export function scriptBlock(s, i) {
  const e = s.encounter, id = scriptsOf(s)[i];
  if (!active(s) || !e?.breach) return 'Scripts run in a breach fight.';
  if (!id) return `No script in slot ${i + 1}.`;
  if (e.scriptUsed) return 'One script a fight: you ran one already.';
  return null;
}
// Run the script in slot i (0-based), at a part you name (by id) or the soonest attacker. Takes no cycle.
export function runScript(s, i, target = null) {
  const why = scriptBlock(s, i);
  if (why) { warn(s, why); return false; }
  const bag = scriptsOf(s), x = SCRIPTS[bag[i]], e = s.encounter;
  const p = x.target === 'part' ? (target && alive(part(s, target)) ? part(s, target) : soonestAttacker(s) || livingParts(s)[0]) : null;
  if (x.target === 'part' && !p) { warn(s, `${x.name} needs a part to aim at.`); return false; }
  log(s, 'breach-cmd', `run ${x.id}${p ? ` ${p.id}` : ''}`);
  if (x.use(s, p) === false) { warn(s, `${x.name} would do nothing now. You keep it.`); return false; }
  bag.splice(i, 1);
  e.scriptUsed = x.id;
  (s.breach.stats ||= {}).scripts = (s.breach.stats.scripts || 0) + 1;
  if (virusIntegrity(s).current === 0) finish(s, 'victory'); // it broke the last part
  return true;
}
// What a script's chip says, for the tray, the strip and a stall.
export const scriptTip = (id) => `${SCRIPTS[id].name} · ${SCRIPTS[id].rarity} script: ${SCRIPTS[id].text}`;
