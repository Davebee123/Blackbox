// Payloads: viruses you write to hit a faction hub. You compile one (code, salvage, credits; an
// Exploit arms it), deploy it at a hub, and it uploads like a file transfer. When it arrives it
// executes on its own against the hub's defence:
//   blocked  (under 70% of the defence): nothing gets through, the hub notices;
//   siege    (70–100%): half a job;
//   breach   (100% and up): the whole job.
// Exfil pulls credits and the code the hub hoards. Wiper knocks the hub offline for hours: its
// shop and market shut, and the other hubs pay more for what it was buying. Either way its
// owner's rep drops (its rivals warm to you), and every strike puts the hub on alert: its
// defence climbs, then eases back over the hours.
// Backdoor takes a hub for you, but only one that's offline when it executes: Wiper first, then
// get a Backdoor in before it comes back up. A hub you hold: see hubs.mjs.
import { emit, warn, materialsOf, hackerLevel, hooks } from './combat.mjs';
import { FACTIONS, hubsOf, changeRep, captured, hubFound } from './factions.mjs';
import { HUB_CONDITION, CONDITIONS, travelMs } from './market.mjs';
import { seeded } from './gear.mjs';

const now = () => hooks.now?.() ?? Date.now();

export const PAYLOADS = {
  exfil: { name: 'Exfil', about: 'Pulls credits and the code a hub hoards.', code: 'cipher' },
  wiper: { name: 'Wiper', about: 'Knocks a hub offline. Its market shuts, and the other hubs pay more for what it buys.', code: 'worm' },
  backdoor: { name: 'Backdoor', about: 'Takes an offline hub for you.', code: 'kernel' },
};
export const PAYLOAD = {
  on: false, // switched off for now (to be revisited): no Payloads line at hubs, no payload command, nothing in flight moves
  credits: (L) => 60 + 10 * L, code: 10, salvage: 3, // to compile
  power: (L) => 10 + 2 * L, armed: 1.5, // an Exploit makes it half again as strong
  defence: (hubLevel) => 12 + 2 * hubLevel, alertStep: 0.25, alertEaseMs: 6 * 3600000, // each strike +25% defence; one step eases every 6 hours
  swing: 0.2, // each run rolls ±20%
  bands: { siege: 0.7, breach: 1 },
  rep: { blocked: -3, siege: -6, breach: -10 },
  exfil: { credits: (hubLevel) => 50 + 12 * hubLevel, code: (hubLevel) => 6 + Math.floor(hubLevel / 2) },
  wiperMs: 4 * 3600000, // breach: offline 4 hours (siege: half that); the market's wiperBoost is what the others pay meanwhile
  maxBuilt: 3,
  captureHit: -40, // what taking its hub costs you with its owner
  maxHeld: 2, // hubs you can hold at once (never Halcyon's)
};
export const heldHubs = (s) => Object.keys(s.hubs || {}).filter((f) => captured(s, f));

const payOf = (s) => (s.payloads ||= { built: [], flying: [], serial: 0, last: null });
const hubState = (s, f) => (s.hubs ||= {})[f];
export const alertOf = (s, f, at = now()) => {
  const h = hubState(s, f); if (!h?.alert) return 0;
  const eased = Math.floor((at - (h.alertAt || at)) / PAYLOAD.alertEaseMs);
  return Math.max(0, h.alert - eased);
};
export const offline = (s, f, at = now()) => (hubState(s, f)?.offlineUntil || 0) > at;
export const defenceOf = (s, f, at = now()) => Math.round(PAYLOAD.defence(FACTIONS[f].hub.level) * (1 + PAYLOAD.alertStep * alertOf(s, f, at)));
export const builtOf = (s) => payOf(s).built;
export const flyingOf = (s) => payOf(s).flying;
export const lastStrike = (s) => payOf(s).last;
// What a payload would most likely do against a hub right now (before the run's roll).
export function forecastStrike(s, p, f, at = now()) {
  if (p.kind === 'backdoor' && !offline(s, f, at)) return 'blocked';
  const r = p.power / defenceOf(s, f, at);
  return r >= PAYLOAD.bands.breach ? 'breach' : r >= PAYLOAD.bands.siege ? 'siege' : 'blocked';
}

export function compilePayload(s, kind, armed = false) {
  const P = PAYLOADS[kind];
  if (!P) return warn(s, `Payloads: ${Object.keys(PAYLOADS).join(', ')}.`);
  if (!hubsOf(s).length) return warn(s, 'Payloads need a target. Faction hubs open with the contract board.');
  const m = payOf(s), mats = materialsOf(s), L = hackerLevel(s), credits = PAYLOAD.credits(L);
  if (m.built.length >= PAYLOAD.maxBuilt) return warn(s, `You can hold ${PAYLOAD.maxBuilt} payloads. Deploy one first.`);
  if (s.server.credits < credits) return warn(s, `A ${P.name} costs ${credits} credits.`);
  if ((mats[P.code] || 0) < PAYLOAD.code) return warn(s, `A ${P.name} takes ${PAYLOAD.code} ${P.code} code.`);
  if ((s.salvage || []).length < PAYLOAD.salvage) return warn(s, `A ${P.name} takes ${PAYLOAD.salvage} salvage.`);
  if (armed && (mats.exploit || 0) < 1) return warn(s, 'Arming it takes an Exploit.');
  s.server.credits -= credits; mats[P.code] -= PAYLOAD.code; s.salvage.splice(0, PAYLOAD.salvage);
  if (armed) mats.exploit -= 1;
  const p = { id: ++m.serial, kind, level: L, armed: !!armed, power: Math.round(PAYLOAD.power(L) * (armed ? PAYLOAD.armed : 1)) };
  m.built.push(p);
  emit(s, 'payload-built', `Compiled ${P.name} #${p.id}: power ${p.power}${armed ? ', armed' : ''}.`, { payload: p.id });
}

export function deployPayload(s, id, f, at = now()) {
  const m = payOf(s), p = m.built.find((x) => x.id === Number(id));
  if (!p) return warn(s, 'No payload by that number.');
  if (!FACTIONS[f] || !hubsOf(s).length) return warn(s, 'Deploy it at a faction hub.');
  if (!hubFound(s, f)) return warn(s, `You haven't located ${FACTIONS[f].short}'s hub yet.`);
  if (captured(s, f)) return warn(s, `${FACTIONS[f].hub.name} is yours.`);
  if (p.kind === 'backdoor' && f === 'halcyon') return warn(s, 'Halcyon’s clearing house can’t be taken.');
  if (p.kind === 'backdoor' && heldHubs(s).length >= PAYLOAD.maxHeld) return warn(s, `You can hold ${PAYLOAD.maxHeld} hubs.`);
  if (p.kind !== 'backdoor' && offline(s, f, at)) return warn(s, `${FACTIONS[f].hub.name} is already offline.`);
  m.built.splice(m.built.indexOf(p), 1);
  const t = { ...p, f, sentAt: at, landsAt: at + travelMs(s, f) };
  m.flying.push(t);
  emit(s, 'payload-out', `${PAYLOADS[p.kind].name} #${p.id} uploading to ${FACTIONS[f].hub.name}. It executes in ${Math.round((t.landsAt - at) / 60000)} min.`, { faction: f });
}

// The run: power × a roll against the hub's defence (seeded by the payload: it doesn't move the game's dice).
export function resolveStrike(s, t, at = t.landsAt) {
  const f = t.f, F = FACTIONS[f], def = defenceOf(s, f, at);
  const roll = 1 + PAYLOAD.swing * (2 * seeded((t.id * 977 + t.sentAt) >>> 0)() - 1);
  const ratio = (t.power * roll) / def, locked = t.kind === 'backdoor' && (!offline(s, f, at) || captured(s, f) || heldHubs(s).length >= PAYLOAD.maxHeld);
  const band = locked ? 'blocked' : ratio >= PAYLOAD.bands.breach ? 'breach' : ratio >= PAYLOAD.bands.siege ? 'siege' : 'blocked';
  const share = band === 'breach' ? 1 : band === 'siege' ? 0.5 : 0;
  const h = hubState(s, f);
  h.alert = alertOf(s, f, at) + 1; h.alertAt = at; h.grudgeAt = at; // a hostile owner answers strikes (hubs.mjs)
  const got = [];
  if (share && t.kind === 'exfil') {
    const credits = Math.round(PAYLOAD.exfil.credits(F.hub.level) * share);
    s.server.credits += credits; got.push(`+${credits} credits`);
    // Code the hub is short of. Exploits are rare: a hub that wants them gives one, never a code-sized pile.
    const wants = Object.entries(CONDITIONS[HUB_CONDITION[f]].mult).filter(([w, x]) => x > 1 && w !== 'salvage').map(([w]) => w);
    const w = wants[0] || 'cipher', n = w === 'exploit' ? 1 : Math.max(1, Math.round(PAYLOAD.exfil.code(F.hub.level) * share));
    materialsOf(s)[w] = (materialsOf(s)[w] || 0) + n; got.push(`+${n} ${w}`);
  }
  if (share && t.kind === 'wiper') {
    h.offlineUntil = at + PAYLOAD.wiperMs * share;
    got.push(`offline ${Math.round((PAYLOAD.wiperMs * share) / 3600000)} h`);
  }
  const taken = t.kind === 'backdoor' && band === 'breach';
  if (taken) { h.captured = { at, bank: 0, bankAt: at }; h.offlineUntil = 0; h.alert = 0; got.push('the hub is yours'); }
  const word = { blocked: 'Blocked', siege: 'Partial breach', breach: 'Breach' }[band];
  payOf(s).last = { id: t.id, kind: t.kind, f, band, got, at };
  emit(s, 'payload-' + band, `${PAYLOADS[t.kind].name} #${t.id} on ${F.hub.name}: ${word}.${got.length ? ' ' + got.join(', ') + '.' : ''}`, { faction: f, band });
  changeRep(s, f, taken ? PAYLOAD.captureHit : PAYLOAD.rep[band], taken ? `You took ${F.hub.name}` : `Your ${PAYLOADS[t.kind].name} hit ${F.short}`);
  return band;
}

export function tickPayloads(s, at = now()) {
  if (!PAYLOAD.on) return;
  const m = s.payloads; if (!m?.flying.length) return;
  for (const t of m.flying.filter((x) => at >= x.landsAt)) {
    m.flying.splice(m.flying.indexOf(t), 1);
    // You took the hub while it was on its way: it stands down and comes back to you.
    if (captured(s, t.f)) { const { f, sentAt, landsAt, ...p } = t; m.built.push(p); emit(s, 'info', `${PAYLOADS[t.kind].name} #${t.id} reached your own hub and stood down.`); continue; }
    resolveStrike(s, t);
  }
}

export function payloadCommand(s, text, at = now()) {
  if (!PAYLOAD.on) return warn(s, 'Payloads are switched off for now.');
  const [, verb, a, b] = text.split(' ');
  if (verb === 'compile') return compilePayload(s, a, b === 'exploit' || b === 'armed');
  if (verb === 'deploy' || verb === 'launch') return deployPayload(s, a, b, at);
  return warn(s, 'payload compile exfil|wiper|backdoor [exploit] · payload deploy <n> <faction>');
}
