// Glyphs: the game's icon set. One line-drawn 16×16 icon per thing (stats, skill verbs, services,
// daemons, materials, contracts, crafted items), in the same hand as the spoils card. Stroke
// only, so every icon takes its colour from the text around it (rarity, verb, state).
//
// glyph(name, cls?) → an inline <svg>. Unknown names fall back to a plain square chip.

const P = {
  // Deconstruct: a bin.
  scrap: '<path d="M2.5 4.5h11M6.5 4.5V2.5h3v2M4 4.5l.8 9h6.4l.8-9M6.8 7v4.5M9.2 7v4.5"/>',
  // ---------- protocol stats ----------
  damage: '<path d="M9.5 1.5 3.5 9h4l-1 5.5 6-7.5h-4z"/>',
  crit: '<circle cx="8" cy="8" r="2"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2 2M10.6 10.6l2 2M12.6 3.4l-2 2M5.4 10.6l-2 2"/>',
  critDamage: '<path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z"/>',
  accuracy: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".6"/>',
  echo: '<path d="M6 5.5a3.5 3.5 0 0 1 0 5M9 3.5a6.5 6.5 0 0 1 0 9M12 1.8a9 9 0 0 1 0 12.4"/><circle cx="3" cy="8" r="1"/>',
  payload: '<path d="M8 1.8c2.8 3.6 4.2 5.8 4.2 7.9a4.2 4.2 0 0 1-8.4 0C3.8 7.6 5.2 5.4 8 1.8z"/>',
  signal: '<path d="M2.5 13.5v-2M5.5 13.5v-4.5M8.5 13.5v-7M11.5 13.5V3"/>',
  regen: '<circle cx="8" cy="8" r="6"/><path d="M8 5v6M5 8h6"/>',
  reduction: '<path d="M8 1.8 13 3.8v4c0 3.2-2.3 5.3-5 6.4-2.7-1.1-5-3.2-5-6.4v-4z"/>',
  evasion: '<path d="M2 12.5c4.5 0 4-9 8.5-9H14M11.5 1l2.5 2.5L11.5 6"/><path d="M2 8h2" stroke-dasharray="1 1.5"/>',
  sanitize: '<path d="M2 3h12L9.2 8.8v4.7l-2.4-1.2V8.8z"/>',
  leech: '<path d="M8 13.5S2 10 2 6.2a3 3 0 0 1 6-.9 3 3 0 0 1 6 .9C14 10 8 13.5 8 13.5z"/>',
  clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',
  stealth: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><path d="M2.5 13.5 13.5 2.5"/>',
  sync: '<path d="M1.5 8h2.5l2-4.5 3 9 2-4.5h3.5"/>',
  scavenge: '<circle cx="7" cy="7" r="4.5"/><path d="m10.3 10.3 4.2 4.2"/>',
  integrity: '<rect x="2.5" y="3" width="11" height="4" rx="1"/><rect x="2.5" y="9" width="11" height="4" rx="1"/><path d="M5 5h.01M5 11h.01"/>',
  shield: '<path d="M8 1.8 13 3.8v4c0 3.2-2.3 5.3-5 6.4-2.7-1.1-5-3.2-5-6.4v-4z"/><path d="M8 4.5v7"/>',
  countermeasures: '<path d="M13 5H5.5a3 3 0 0 0 0 6H10"/><path d="M10.5 2.5 13 5l-2.5 2.5"/>',
  trace: '<circle cx="8" cy="8" r="6"/><path d="M8 8 12.2 3.8"/><path d="M8 4.5a3.5 3.5 0 0 1 3.5 3.5" opacity=".6"/>',
  // ---------- skill verbs ----------
  hit: '<path d="M8 1.5l1.3 3.7 3.9-.8-2.3 3.2 2.9 2.7-3.9.2L8 14.5l-1.9-4-3.9-.2 2.9-2.7-2.3-3.2 3.9.8z"/>',
  burn: '<path d="M8 14.5c-2.8 0-4.6-2-4.6-4.4 0-2.6 2.2-3.9 2.6-6.6 1.6.9 2.2 2.4 2.2 3.6.9-.5 1.5-1.4 1.6-2.4 1.6 1.4 2.8 3.4 2.8 5.4 0 2.4-1.8 4.4-4.6 4.4z"/>',
  stun: '<path d="M8 8.5a1.2 1.2 0 1 1 1.2-1.2 2.6 2.6 0 0 1-2.6 2.6A3.8 3.8 0 0 1 2.8 6.1 5 5 0 0 1 7.8 1.1a6.2 6.2 0 0 1 6.2 6.2"/>',
  debuff: '<path d="M8 2v11M3.5 8.5 8 13l4.5-4.5"/>',
  heal: '<path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z"/>',
  buff: '<path d="M8 14V3M3.5 7.5 8 3l4.5 4.5"/>',
  util: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>',
  run: '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="m4.5 6.5 2 1.5-2 1.5M8 10.5h3.5"/>',
  // ---------- services ----------
  firewall: '<rect x="1.5" y="3" width="13" height="10" rx="1"/><path d="M1.5 6.3h13M1.5 9.7h13M5.5 3v3.3M10.5 3v3.3M8 6.3v3.4M3.5 9.7V13M12.5 9.7V13"/>',
  tarpit: '<path d="M4 1.5h8M4 14.5h8M5 1.5c0 4 6 3 6 6.5s-6 2.5-6 6.5M11 1.5c0 4-6 3-6 6.5s6 2.5 6 6.5"/>',
  raid: '<ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/>',
  kernel: '<rect x="4" y="4" width="8" height="8" rx="1"/><rect x="6.3" y="6.3" width="3.4" height="3.4"/><path d="M6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5M1.5 6H4M1.5 10H4M12 6h2.5M12 10h2.5"/>',
  scrubber: '<path d="M8 1.8 13 3.8v4c0 3.2-2.3 5.3-5 6.4-2.7-1.1-5-3.2-5-6.4v-4z"/><path d="m5.5 8 1.8 1.8L10.8 6"/>',
  hotpatch: '<path d="M10.5 1.5a3.5 3.5 0 0 0-3.3 4.6L2 11.3a1.6 1.6 0 0 0 2.3 2.3l5.2-5.2a3.5 3.5 0 0 0 4.6-3.3l-2 2-1.8-.5-.5-1.8z"/>',
  counter: '<path d="M13 5H5.5a3 3 0 0 0 0 6H10"/><path d="M10.5 2.5 13 5l-2.5 2.5"/>',
  honeypot: '<path d="M5 2.5h6M4.5 4.5c-1.5 1-2 2.6-2 4.3 0 3 2.5 5.2 5.5 5.2s5.5-2.2 5.5-5.2c0-1.7-.5-3.3-2-4.3z"/><path d="M5.5 8.5h5" stroke-dasharray="1.2 1.2"/>',
  sandbox: '<path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z"/><path d="M2 4.8 8 8l6-3.2M8 8v6.5"/>',
  uplink: '<path d="M8 8v6.5M5.5 14.5h5"/><circle cx="8" cy="7" r="1.2"/><path d="M5.2 4.2a4 4 0 0 0 0 5.6M10.8 4.2a4 4 0 0 1 0 5.6M3 2a7 7 0 0 0 0 10M13 2a7 7 0 0 1 0 10"/>',
  buildfarm: '<path d="M1.5 14.5V8l4 2.5V8l4 2.5V2.5h5v12z"/><path d="M11.5 5h1.5"/>',
  router: '<circle cx="3.5" cy="8" r="1.8"/><circle cx="12.5" cy="3.5" r="1.8"/><circle cx="12.5" cy="12.5" r="1.8"/><path d="M5.3 8h3l2.6-3.4M8.3 8l2.6 3.4"/>',
  scheduler: '<rect x="1.5" y="3" width="13" height="11.5" rx="1.5"/><path d="M1.5 6.5h13M5 1.5V4M11 1.5V4M5 9.5h2M9 9.5h2M5 12h2"/>',
  cron: '<circle cx="8" cy="8.5" r="5.5"/><path d="M8 5.5v3l2 1.5M5 1.5h6"/>',
  snapshot: '<rect x="1.5" y="4" width="13" height="9.5" rx="1.5"/><circle cx="8" cy="8.7" r="2.6"/><path d="M5.5 4 6.8 2h2.4l1.3 2"/>',
  // ---------- crafted things and loot ----------
  protocol: '<rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5M1.5 6H4M1.5 10H4M12 6h2.5M12 10h2.5"/>',
  booster: '<rect x="2" y="4.5" width="11" height="7" rx="1.2"/><path d="M13 7v2h1.2V7zM7.5 5.5 5.5 8.3h3l-2 2.7"/>',
  config: '<path d="M2 4h7M12 4h2M2 12h2M7 12h7M2 8h3M8 8h6"/><circle cx="10.5" cy="4" r="1.5"/><circle cx="5.5" cy="12" r="1.5"/><circle cx="6.5" cy="8" r="1.5"/>',
  siphon: '<path d="M2 2.5h12L9.5 8v4l-3 2.5V8z"/>',
  scraper: '<path d="M2.5 13.5 9 7M6.5 3.5c2.5-1.6 5.7-1.2 7.5.8-2.4-.5-4.5.4-5.8 1.9M9.5 6.5l1.5-1.5"/>',
  tap: '<path d="M2 5.5h6.5a3 3 0 0 1 3 3v1M5 3.5h3M6.5 3.5v2"/><path d="M11.5 12.5c0 .8-.4 1.5-1 1.5s-1-.7-1-1.5c0-.6 1-2 1-2s1 1.4 1 2z"/>',
  blueprint: '<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M2 6.5h12M6.5 2v12"/><path d="M9 9.5h3M9 11.5h2" opacity=".7"/>',
  daemon: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="1.6"/><path d="M8 2.5V1M8 15v-1.5M13.5 8H15M1 8h1.5"/>',
  source: '<path d="M5.5 2.5c-2 0-2 1.5-2 3S2 8 2 8s1.5.5 1.5 2.5 0 3 2 3M10.5 2.5c2 0 2 1.5 2 3S14 8 14 8s-1.5.5-1.5 2.5 0 3-2 3"/>',
  salvage: '<path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z"/><path d="M2 4.8 8 8l6-3.2M8 8v6.5"/>',
  // ---------- materials and currency ----------
  cipher: '<circle cx="5" cy="8" r="3"/><path d="M8 8h6.5M12 8v2.5M14.5 8v2"/>',
  worm: '<path d="M1.5 10c1.5-3 3-3 4.3 0s2.8 3 4.2 0 2.9-3 4.5 0"/><circle cx="14" cy="9.3" r=".6"/>',
  exploit: '<path d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.5L8 11.3 4.1 13.5l.9-4.5-3.3-3 4.4-.5z"/>',
  credits: '<circle cx="8" cy="8" r="6"/><path d="M10 5.8A2.6 2.6 0 0 0 8 5c-1.4 0-2.5 1.3-2.5 3S6.6 11 8 11a2.6 2.6 0 0 0 2-.8M8 3.5v1.5M8 11v1.5"/>',
  indemnity: '<circle cx="8" cy="6.5" r="4.5"/><path d="M5.5 10.2 4.5 14.5 8 13l3.5 1.5-1-4.3"/><path d="m6.3 6.5 1.2 1.2 2.2-2.2"/>',
  // ---------- contracts ----------
  kill: '<circle cx="8" cy="8" r="5.5"/><path d="M8 1v4M8 11v4M1 8h4M11 8h4"/>',
  contract: '<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/><path d="M5.5 9.5l1.8 1.8 3.4-3.6"/>',
  bounty: '<path d="M4 7.5a4 4 0 1 1 8 0v2.5l-1.3 1v2.5H5.3V11L4 10z"/><circle cx="6.3" cy="7.5" r="1"/><circle cx="9.7" cy="7.5" r="1"/>',
  takeover: '<path d="M3.5 14.5V2"/><path d="M3.5 2.5h9l-2 3 2 3h-9"/>',
  materials: '<path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z"/><path d="M5 3.2l6 3.3v2.8"/>',
  item: '<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3M5.5 8.5h5M5.5 11h3.5"/>',
  // ---------- daemons ----------
  sweeper: '<path d="M11 1.5 7 8.5M3.5 9.5l5 2.5-1.5 2.5c-2-.3-4-1.5-5-3.5z"/>',
  fuzzer: '<path d="M1.5 8h1.5l1-3 1.5 6 1.5-8 1.5 10 1.5-7 1.5 4 1-2h1.5"/>',
  tracer: '<circle cx="8" cy="8" r="6"/><path d="M8 8 12.2 3.8"/><circle cx="10.5" cy="10.5" r=".8"/>',
  mender: '<path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z"/>',
  spider: '<circle cx="8" cy="8.5" r="2.5"/><path d="M5.8 7 2 4.5M5.6 9 1.5 9.5M6 10.5 3 13.5M10.2 7 14 4.5M10.4 9l4.1.5M10 10.5l3 3M8 6V2"/>',
  mirror: '<path d="M8 1.5v13M6 3.5 1.5 12.5H6zM10 3.5l4.5 9H10z"/>',
  watchman: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  canary: '<path d="M4 11.5c-1.5-3 .5-7 4.5-7 2 0 3 1 3.5 2l2.5.5-2.5 1c0 3-2.5 5-6 5-1 0-1.5-.5-2-1.5zM4 11.5 1.5 13"/><circle cx="10" cy="6.5" r=".6"/>',
  // ---------- misc ----------
  relay: '<path d="M8 8v6.5M5.5 14.5h5"/><circle cx="8" cy="7" r="1.2"/><path d="M5.2 4.2a4 4 0 0 0 0 5.6M10.8 4.2a4 4 0 0 1 0 5.6"/>',
  cracker: '<circle cx="5" cy="8" r="3"/><path d="M8 8h6.5M12 8v2.5M14.5 8v2"/><path d="M4 7l2 2" />',
  injector: '<path d="m10.5 1.5 4 4M12.5 3.5 5 11l-2 .5.5-2L11 2M9.5 5l1.5 1.5M2.5 13.5l2-2"/>',
  repair: '<path d="M10.5 1.5a3.5 3.5 0 0 0-3.3 4.6L2 11.3a1.6 1.6 0 0 0 2.3 2.3l5.2-5.2a3.5 3.5 0 0 0 4.6-3.3l-2 2-1.8-.5-.5-1.8z"/>',
  crate: '<path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z"/><path d="M2 4.8 8 8l6-3.2M8 8v6.5"/>',
  harvester: '<path d="M2 2.5h12L9.5 8v4l-3 2.5V8z"/>',
  architecture: '<path d="M1.5 14.5h13M3 14.5V7M13 14.5V7M1.5 7 8 2l6.5 5M6 14.5v-4h4v4"/>',
  module: '<rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 5h6v6H5z"/>',
  pipeline: '<path d="M1.5 5.5h7a3 3 0 0 1 3 3v6M1.5 9.5h5.5a.5.5 0 0 1 .5.5v4.5"/>',
  storage: '<ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9"/>',
  node: '<rect x="1.5" y="3" width="13" height="10" rx="1"/><path d="M1.5 6.3h13M1.5 9.7h13M5.5 3v3.3M10.5 3v3.3M8 6.3v3.4"/>',
  ids: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  spike: '<path d="M8 1.5 10 8l-2 6.5L6 8z"/><path d="M3 8h10"/>',
  // Faction marks: Halcyon's shield, GLASSJAW's cracked jaw, Kestrel's wings, LANTERN's lamp, NULL CHOIR's null.
  'f-halcyon': '<path d="M8 1.8 13 3.8v4c0 3.2-2.3 5.3-5 6.4-2.7-1.1-5-3.2-5-6.4v-4z"/><path d="M5 8.5h6"/>',
  'f-glassjaw': '<path d="M2.5 6c2 4.5 9 4.5 11 0"/><path d="M4.5 6.6v1.6M7 7.2v2M9.5 7.2v2M12 6.6v1.6"/><path d="M8.5 1.5 7 4l2 1-1.5 2"/>',
  'f-kestrel': '<path d="M1.5 9.5c3-3.5 4.5-3.5 6.5 0 2-3.5 3.5-3.5 6.5 0"/><path d="M8 9.5v3.5"/>',
  'f-lantern': '<path d="M6 2.5h4M5.5 4h5l1 7h-7z"/><path d="M6.5 11v2.5h3V11M8 6.2v2.6"/>',
  'f-nullchoir': '<circle cx="8" cy="8" r="5.8"/><path d="M3.9 12.1 12.1 3.9"/>',
  // Memory: a chip with pins.
  memory: '<rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 2v2M8 2v2M10 2v2M6 12v2M8 12v2M10 12v2M2 6h2M2 10h2M12 6h2M12 10h2"/>',
  // Honeytoken: a jar with a drip, bait for trouble.
  lure: '<path d="M5 3.5h6M5.5 3.5v1.5c-1.5.8-2.5 2.3-2.5 4 0 2.5 2.2 4.5 5 4.5s5-2 5-4.5c0-1.7-1-3.2-2.5-4V3.5"/><path d="M8 7v2.5"/>',
};

export const GLYPHS = P;
export function glyph(name, cls = '') {
  return `<svg class="glyph${cls ? ' ' + cls : ''}" viewBox="0 0 16 16" aria-hidden="true">${P[name] || '<rect x="3" y="3" width="10" height="10" rx="1.5"/>'}</svg>`;
}
