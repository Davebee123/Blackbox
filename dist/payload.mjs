// Payloads: viruses you write to hit a faction hub, the Starsector raid. You compile one (code,
// salvage, credits; an Exploit arms it), launch it at a hub, and it travels like a file transfer.
// When it lands it resolves on its own against the hub's defence:
//   blocked  (under 70% of the defence): nothing gets through, the hub notices;
//   siege    (70–100%): half a job;
//   breach   (100% and up): the whole job.
// Exfil pulls credits and the code the hub hoards. Wiper knocks the hub offline for hours: its
// shop and market shut, and the other hubs pay more for what it was buying. Either way its
// owner's rep drops (its rivals warm to you), and every strike puts the hub on alert: its
// defence climbs, then eases back over the hours.
import { emit, warn, materialsOf, hackerLevel, hooks } from './combat.mjs';
import { FACTIONS, hubsOf, changeRep } from './factions.mjs';
import { HUB_CONDITION, CONDITIONS, travelMs } from './market.mjs';
import { seeded } from './gear.mjs';

const now = () => hooks.now?.() ?? Date.now();

export const PAYLOADS = {
  exfil: { name: 'Exfil', about: 'Pulls credits and the code a hub hoards.', code: 'cipher' },
  wiper: { name: 'Wiper', about: 'Knocks a hub offline: its shop and market shut, the other hubs pay more for what it buys.', code: 'worm' },
};
export const PAYLOAD = {
  credits: (L) => 60 + 10 * L, code: 10, salvage: 3, // to compile
  power: (L) => 10 + 2 * L, armed: 1.5, // an Exploit makes it half again as strong
  defence: (hubLevel) => 12 + 2 * hubLevel, alertStep: 0.25, alertEaseMs: 6 * 3600000, // each strike +25% defence; one step eases every 6 hours
  swing: 0.2, // a landing rolls ±20%
  bands: { siege: 0.7, breach: 1 },
  rep: { blocked: -3, siege: -6, breach: -10 },
  exfil: { credits: (hubLevel) => 50 + 12 * hubLevel, code: (hubLevel) => 6 + Math.floor(hubLevel / 2) },
  wiperMs: 4 * 3600000, // breach: offline 4 hours (siege: half that); the market's wiperBoost is what the others pay meanwhile
  maxBuilt: 3,
};

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
// What a payload would most likely do against a hub right now (before the landing's roll).
export function forecastStrike(s, p, f, at = now()) {
  const r = p.power / defenceOf(s, f, at);
  return r >= PAYLOAD.bands.breach ? 'breach' : r >= PAYLOAD.bands.siege ? 'siege' : 'blocked';
}

export function compilePayload(s, kind, armed = false) {
  const P = PAYLOADS[kind];
  if (!P) return warn(s, `Payloads: ${Object.keys(PAYLOADS).join(', ')}.`);
  if (!hubsOf(s).length) return warn(s, 'Payloads need a target: faction hubs open with the contract board.');
  const m = payOf(s), mats = materialsOf(s), L = hackerLevel(s), credits = PAYLOAD.credits(L);
  if (m.built.length >= PAYLOAD.maxBuilt) return warn(s, `You can hold ${PAYLOAD.maxBuilt} payloads. Launch one first.`);
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

export function launchPayload(s, id, f, at = now()) {
  const m = payOf(s), p = m.built.find((x) => x.id === Number(id));
  if (!p) return warn(s, 'No payload by that number.');
  if (!FACTIONS[f] || !hubsOf(s).length) return warn(s, 'Launch at a faction hub.');
  if (offline(s, f, at)) return warn(s, `${FACTIONS[f].hub.name} is already offline.`);
  m.built.splice(m.built.indexOf(p), 1);
  const t = { ...p, f, sentAt: at, landsAt: at + travelMs(s, f) };
  m.flying.push(t);
  emit(s, 'payload-out', `${PAYLOADS[p.kind].name} #${p.id} away to ${FACTIONS[f].hub.name}: lands in ${Math.round((t.landsAt - at) / 60000)} min.`, { faction: f });
}

// The landing: power × a roll against the hub's defence (seeded by the payload: it doesn't move the game's dice).
export function resolveStrike(s, t, at = t.landsAt) {
  const f = t.f, F = FACTIONS[f], def = defenceOf(s, f, at);
  const roll = 1 + PAYLOAD.swing * (2 * seeded((t.id * 977 + t.sentAt) >>> 0)() - 1);
  const ratio = (t.power * roll) / def;
  const band = ratio >= PAYLOAD.bands.breach ? 'breach' : ratio >= PAYLOAD.bands.siege ? 'siege' : 'blocked';
  const share = band === 'breach' ? 1 : band === 'siege' ? 0.5 : 0;
  const h = hubState(s, f);
  h.alert = alertOf(s, f, at) + 1; h.alertAt = at;
  const got = [];
  if (share && t.kind === 'exfil') {
    const credits = Math.round(PAYLOAD.exfil.credits(F.hub.level) * share);
    s.server.credits += credits; got.push(`+${credits} credits`);
    const wants = Object.entries(CONDITIONS[HUB_CONDITION[f]].mult).filter(([w, x]) => x > 1 && w !== 'salvage').map(([w]) => w);
    const w = wants[0] || 'cipher', n = Math.max(1, Math.round(PAYLOAD.exfil.code(F.hub.level) * share));
    materialsOf(s)[w] = (materialsOf(s)[w] || 0) + n; got.push(`+${n} ${w}`);
  }
  if (share && t.kind === 'wiper') {
    h.offlineUntil = at + PAYLOAD.wiperMs * share;
    got.push(`offline ${Math.round((PAYLOAD.wiperMs * share) / 3600000)} h`);
  }
  const word = { blocked: 'Blocked', siege: 'Partial breach', breach: 'Breach' }[band];
  payOf(s).last = { id: t.id, kind: t.kind, f, band, got, at };
  emit(s, 'payload-' + band, `${PAYLOADS[t.kind].name} #${t.id} on ${F.hub.name}: ${word}.${got.length ? ' ' + got.join(', ') + '.' : ''}`, { faction: f, band });
  changeRep(s, f, PAYLOAD.rep[band], `Your ${PAYLOADS[t.kind].name} hit ${F.short}`);
  return band;
}

export function tickPayloads(s, at = now()) {
  const m = s.payloads; if (!m?.flying.length) return;
  for (const t of m.flying.filter((x) => at >= x.landsAt)) { m.flying.splice(m.flying.indexOf(t), 1); resolveStrike(s, t); }
}

export function payloadCommand(s, text, at = now()) {
  const [, verb, a, b] = text.split(' ');
  if (verb === 'compile') return compilePayload(s, a, b === 'exploit' || b === 'armed');
  if (verb === 'launch') return launchPayload(s, a, b, at);
  return warn(s, 'payload compile exfil|wiper [exploit] · payload launch <n> <faction>');
}
