// Configs: one per running service. Side-grades that change HOW a service works, not how big
// it is, so a maxed server still has choices to make.
//
// Getting one: config source (<id>.cfg) turns up in some vaults. Bank it and you know the config;
// craft it on the Craft page (credits, the service's code, salvage) and you own it. Set it on the
// Server page: swapping is instant and free, but only between fights.
import { emit, warn, active, materialsOf, serviceVersion } from './combat.mjs';
import { SERVICES, MATERIALS, seeded } from './gear.mjs';
import { settle, spend, splitPay } from './salvage.mjs';
import { archCredits } from './architecture.mjs';

export const CONFIGS = {
  // Firewall
  stateful: { service: 'firewall', name: 'Stateful', rule: 'Wall rating +20%. Invaders it stops leave nothing behind.' },
  reflective: { service: 'firewall', name: 'Reflective', rule: 'Invaders it stops drop their family\'s code as well.' },
  inspection: { service: 'firewall', name: 'Deep Inspection', rule: 'Invaders it stops add lead progress toward where they came from.' },
  adaptive: { service: 'firewall', name: 'Adaptive', rule: 'Wall rating +40% against the family that hits you most, −10% against the rest.' },
  // Tarpit
  sticky: { service: 'tarpit', name: 'Sticky', rule: 'Invaders crawl half again as slowly.' },
  toll: { service: 'tarpit', name: 'Toll', rule: 'Invaders reach your wall worn down to 80%.' },
  beacon: { service: 'tarpit', name: 'Beacon', rule: 'Invaders from unknown servers add lead as they pass. Swarms are seen coming sooner.' },
  // Honeypot
  tar: { service: 'honeypot', name: 'Tar', rule: 'A part whose attack misses you fires its next one a cycle later.' },
  sting: { service: 'honeypot', name: 'Sting', rule: 'A part whose attack misses you takes a hit back.' },
  // Hot-patcher
  triage: { service: 'hotpatch', name: 'Triage', rule: 'Double repair below half Integrity, half repair above it.' },
};
export const CONFIG_COST = { credits: 250, code: 15, salvage: 6 };
export const CONFIG_VAULT_CHANCE = 0.08;

export const known = (s) => (s.configsKnown ||= []);
export const owned = (s) => (s.configsOwned ||= []);
export const setOf = (s) => (s.configs ||= {});
// The config running on a service right now (only if the service runs).
export const configOn = (s, service) => (serviceVersion(s, service) ? setOf(s)[service] || null : null);
export const has = (s, id) => configOn(s, CONFIGS[id]?.service) === id;
export const forService = (service) => Object.keys(CONFIGS).filter((k) => CONFIGS[k].service === service);
export const codeFor = (id) => { const c = SERVICES[CONFIGS[id].service].code; return Array.isArray(c) ? c[0] : c; };

// The config source waiting in a location's vault, or null (fixed per location).
export function vaultConfig(loc) {
  if (loc.zone) return null;
  const r = seeded(loc.seed * 23 + 17);
  if (r() >= CONFIG_VAULT_CHANCE) return null;
  const ids = Object.keys(CONFIGS);
  return ids[Math.floor(r() * ids.length)];
}

export function bankConfig(s, id, why = 'Config source banked: ') {
  if (!CONFIGS[id]) return;
  if (known(s).includes(id)) {
    for (let i = 0; i < 2; i++) s.salvage.push({ name: 'Config scraps', virus: 'config', seed: 0 });
    return emit(s, 'info', `${why}${CONFIGS[id].name}, which you already know: +2 salvage.`);
  }
  known(s).push(id);
  emit(s, 'drop', `${why}${CONFIGS[id].name} for the ${SERVICES[CONFIGS[id].service].name}. Craft it on the Craft page.`, { config: id });
}

// config <service> <id|none> · craft config <id> [pay …]
export function configCommand(s, full) {
  const [text, payText] = splitPay(full);
  const words = text.split(' ');
  if (words[0] === 'craft') return craft(s, words[2], payText);
  const [, service, id] = words;
  if (!SERVICES[service]) return warn(s, 'usage: config <service> <config|none>');
  if (active(s)) return warn(s, 'Swap configs between fights.');
  if (!serviceVersion(s, service)) return warn(s, `${SERVICES[service].name} isn't running.`);
  if (!id || id === 'none') { delete setOf(s)[service]; return emit(s, 'config', `${SERVICES[service].name}: stock config.`, { service }); }
  if (!CONFIGS[id] || CONFIGS[id].service !== service) return warn(s, `${SERVICES[service].name} configs: ${forService(service).join(', ')}.`);
  if (!owned(s).includes(id)) return warn(s, `You don't have ${CONFIGS[id].name}. ${known(s).includes(id) ? 'Craft it on the Craft page.' : 'Find its source in a vault.'}`);
  setOf(s)[service] = id;
  emit(s, 'config', `${SERVICES[service].name} now runs ${CONFIGS[id].name}: ${CONFIGS[id].rule}`, { service, config: id });
}

function craft(s, id, payText) {
  if (!CONFIGS[id]) return warn(s, 'Craft which config?');
  if (s.run) return warn(s, 'Craft at home. Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (!known(s).includes(id)) return warn(s, `You don't know ${CONFIGS[id].name} yet. Its source turns up in vaults.`);
  if (owned(s).includes(id)) return warn(s, `You already have ${CONFIGS[id].name}.`);
  const c = { ...CONFIG_COST, credits: archCredits(s, CONFIG_COST.credits) }, m = materialsOf(s), code = codeFor(id);
  if (s.server.credits < c.credits || (m[code] || 0) < c.code) return warn(s, `${CONFIGS[id].name} costs ${c.credits} credits, ${c.code} ${MATERIALS[code].name} and ${c.salvage} salvage.`);
  const pay = settle(s, { any: c.salvage, need: [] }, payText);
  if (typeof pay === 'string') return warn(s, `${CONFIGS[id].name}: ${pay}`);
  s.server.credits -= c.credits;
  m[code] -= c.code;
  spend(s, pay);
  owned(s).push(id);
  emit(s, 'crafted', `Crafted ${CONFIGS[id].name}. Set it on the ${SERVICES[CONFIGS[id].service].name} (Server page).`, { config: id });
}

export const configCostLabel = (id) => `${CONFIG_COST.credits}c + ${CONFIG_COST.code} ${MATERIALS[codeFor(id)].name} + ${CONFIG_COST.salvage} salvage`;
