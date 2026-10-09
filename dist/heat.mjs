// Heat (docs/roguelite.md 6.3): ranked difficulty, picked per breach. Each rank keeps the ones under it and adds one
// clear modifier, and pays for it: an item level on drafted and dropped gear (up to +5), rare odds and XP. The
// campaign (campaign.mjs) opens the next rank when you capture any server at your highest one, and records the best
// heat you captured each server at; re-imaging a server asks for that heat or more. Data only, read by breach.mjs.
export const HEAT = [
  null,
  { n: 1, name: 'Loud', text: 'Every fight has 15% more Integrity and hits 10% harder.' },
  { n: 2, name: 'Hardened ICE', text: 'Gates bring one more tell.' },
  { n: 3, name: 'Rotation', text: 'Every act has one more elite.' },
  { n: 4, name: 'Thin pipe', text: 'Defrag restores 20% of your Signal instead of 30%.' },
  { n: 5, name: 'Audit', text: 'Breaches start with no reroll, and a skipped draft pays nothing.' },
  { n: 6, name: 'Fog of war', text: 'You read 1 row ahead (an Infiltrator 2).' },
  { n: 7, name: 'Short list', text: 'Drafts offer 1 card fewer.' },
  { n: 8, name: 'Hardened Resident', text: 'The Resident has 25% more Integrity and re-arms every part at 80%.' },
];
export const MAX_HEAT = HEAT.length - 1;
// What a rank pays: item levels on drafted and dropped gear, rare odds (points), XP.
export const HEAT_PAY = { itemLevel: 1, itemCap: 5, rare: 3, xp: 0.25 };
// The modifiers in force at a heat, as switches (breach.mjs reads them).
export function heatRules(heat = 0) {
  const h = Math.max(0, Math.min(MAX_HEAT, heat | 0));
  return {
    heat: h,
    loud: h >= 1, gateTell: h >= 2, moreElites: h >= 3, rest: h >= 4 ? 0.2 : null, audit: h >= 5, fog: h >= 6 ? 1 : null, shortList: h >= 7, resident: h >= 8,
    itemLevel: Math.min(HEAT_PAY.itemCap, h * HEAT_PAY.itemLevel), rare: h * HEAT_PAY.rare, xp: 1 + h * HEAT_PAY.xp,
  };
}
// The ranks in force, for a card or a strip: [{ n, name, text }].
export const heatList = (heat = 0) => HEAT.slice(1, Math.max(0, Math.min(MAX_HEAT, heat)) + 1);
// What a rank pays, in a sentence.
export const heatPay = (heat) => (heat > 0 ? `Gear drops ${Math.min(HEAT_PAY.itemCap, heat)} ${heat === 1 ? 'level' : 'levels'} higher, rare cards come ${heat * HEAT_PAY.rare} points more often, and kills pay ${Math.round(heat * HEAT_PAY.xp * 100)}% more XP.` : 'No modifiers.');
