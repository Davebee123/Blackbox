// The demo build (docs/demo-plan.md Phase 1): floors 1–2, capped at level 14. DEMO is null in the game; a build made with
// `node scripts/build.mjs build --demo` writes BUILD below, and every demo rule reads DEMO. A leaf module: data.mjs
// imports it, so it imports nothing.
export const DEMO_BUILD = { floor: 2, level: 14, version: '0.1' };
const BUILD = null; // scripts/build.mjs --demo makes this DEMO_BUILD (defined above it, so it is set when read)
export let DEMO = BUILD;
export const setDemo = (d) => { DEMO = d || null; }; // tests only: the demo's rules on a dev page

// The designer's links, in one place. Empty until they exist: a button with no link says so in its tooltip.
export const LINKS = {
  discord: 'https://discord.gg/KyBUKuDRF', // the Discord server's feedback channel invite (https://discord.gg/…): the Feedback button opens it
  telemetry: '', // the telemetry Worker's URL (https://blackbox-telemetry.<account>.workers.dev): tools/telemetry/
  itch: 'https://matzahboy.itch.io/blackbox', // the itch.io page: the end card's follow
};

export const version = () => (DEMO ? `demo ${DEMO.version}` : 'dev');
// The level XP stops at, and the deepest floor content is dealt on (the game's own without a demo).
export const levelCap = (full) => (DEMO ? Math.min(full, DEMO.level) : full);
export const floorCap = (full) => (DEMO ? Math.min(full, DEMO.floor) : full);
