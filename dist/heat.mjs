// Heat (docs/roguelite.md 6.3): ranked difficulty, picked per breach. Each rank keeps the ones under it and adds one
// clear modifier, and pays for it: an item level on the gear a breach drops (up to +5), rare odds and XP. The
// campaign (campaign.mjs) opens the next rank when you capture any server at your highest one, and records the best
// heat you captured each server at; re-imaging a server asks for that heat or more. Data only, read by breach.mjs.
export const HEAT = [
  null,
  { n: 1, name: 'Loud', text: 'Every fight has 15% more Integrity and hits 10% harder.' },
  { n: 2, name: 'Hardened ICE', text: 'Gates bring one more tell.' },
  { n: 3, name: 'Rotation', text: 'Every act has one more elite.' },
  { n: 4, name: 'Thin pipe', text: 'Defrag restores 20% of your Signal instead of 35%.' },
  { n: 5, name: 'Audit', text: 'Breaches start with your Trace at 30.' },
  { n: 6, name: 'Fog of war', text: 'You read 1 row ahead (an Infiltrator 2).' },
  { n: 7, name: 'Tripwire', text: 'Your Trace rises 50% faster.' },
  { n: 8, name: 'Hardened Resident', text: 'The Resident has 25% more Integrity and re-arms every part at 80%.' },
];
export const MAX_HEAT = HEAT.length - 1;
// What a rank pays: item levels on the gear a breach drops, rare odds (points: a yellow over a blue), XP.
export const HEAT_PAY = { itemLevel: 1, itemCap: 5, rare: 3, xp: 0.25 };
// The modifiers in force at a heat, as switches (breach.mjs reads them).
export function heatRules(heat = 0) {
  const h = Math.max(0, Math.min(MAX_HEAT, heat | 0));
  return {
    heat: h,
    loud: h >= 1, gateTell: h >= 2, moreElites: h >= 3, rest: h >= 4 ? 0.2 : null, audit: h >= 5 ? 30 : 0, fog: h >= 6 ? 1 : null, tripwire: h >= 7 ? 1.5 : 1, resident: h >= 8,
    itemLevel: Math.min(HEAT_PAY.itemCap, h * HEAT_PAY.itemLevel), rare: h * HEAT_PAY.rare, xp: 1 + h * HEAT_PAY.xp,
  };
}
// The ranks in force, for a card or a strip: [{ n, name, text }].
export const heatList = (heat = 0) => HEAT.slice(1, Math.max(0, Math.min(MAX_HEAT, heat)) + 1);
// What a rank pays, in a sentence.
export const heatPay = (heat) => (heat > 0 ? `Gear drops ${Math.min(HEAT_PAY.itemCap, heat)} ${heat === 1 ? 'level' : 'levels'} higher, yellows drop ${heat * HEAT_PAY.rare} points more often, and kills pay ${Math.round(heat * HEAT_PAY.xp * 100)}% more XP.` : 'No modifiers.');
