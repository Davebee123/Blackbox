// The window's districts (window.mjs), as data: the casing's picker and the achievements read them without loading
// the window itself, which only a desktop asks for (app.js).
// The signs' tubes: rose, sodium peach, amber and a pale warm white. Never the player's teal, a threat's red or a
// daemon's violet.
export const NEON = ['#e8707f', '#ffa860', '#f1b92f', '#f2dcb8'];
// The districts: their name, a line on what you see, the lights each one adds (warm, like the signs: never teal,
// violet or a threat's red) and how much fog it keeps of its own (a harbour's). The Sprawl is the default and always
// open; the rest come with achievements (casing.mjs DISTRICT_FROM).
export const DISTRICTS = {
  sprawl: { name: 'The Sprawl', tip: 'Stacked towers, fire escapes and neon down a wet street.', palette: NEON, fog: 0 },
  backhaul: { name: 'Backhaul', tip: 'Rail yards: floodlight masts, signal gantries and catenary, and now and then a slow train\'s lit windows.', palette: ['#f1b92f', '#f2dcb8', '#ffa860'], fog: 0.04 },
  stacks: { name: 'The Stacks', tip: 'Server towers: rack-faced blocks with tiny blinking status lights, cooling stacks venting steam.', palette: ['#f1b92f', '#f2dcb8', '#ffa860', '#e8707f'], fog: 0.02 },
  coldline: { name: 'Coldline', tip: 'The harbour: cranes, container stacks, black water, fog, and a lighthouse sweeping far off.', palette: ['#f1b92f', '#f2dcb8', '#ffa860'], boxes: ['#4a2e22', '#4a3c24', '#33302a', '#3d2a2c', '#2e2c28', '#46381f'], fog: 0.18 },
  tarbeach: { name: 'Tar Beach', tip: 'Up on the roofs: water tanks close by, bulkheads and a sign\'s bulbs, the skyline across the way.', palette: ['#ffd9a0', '#f1b92f', '#ffa860'], fog: 0.03 },
};
export const DISTRICT_IDS = Object.keys(DISTRICTS);
