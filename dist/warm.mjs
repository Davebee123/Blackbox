// The loading screen's warm-ups (docs/performance-plan.md "The loading screen"): what the first minutes would otherwise
// build at a bad moment, done while the Horizon (poweron.mjs) comes on. Each step yields before the next, so none
// holds the screen for long.
//   samples   the sample bank (sound.mjs BANK): fetched and decoded, so the first sounds after the key are the samples
//   textures  the abilities' hall and noises, the fight music's reverb (sound.mjs warmTextures)
//   chip defs the chip effects' filters (chipfx.mjs DEFS)
// Not warmed: the fonts (none ship: the system's own), the stage's still layer (a few ms, rebuilt for every fight).
//
// warmGame({ audio, progress }) → Promise when every step is done; progress(0-1) as they go. audio false (Sound off):
// no samples or textures.
import { createSound } from './sound.mjs';
import { warmDefs } from './chipfx.mjs';

const BANK_SHARE = 0.85; // of the progress: the samples are most of the wait
const breath = () => new Promise((ok) => setTimeout(ok, 0));
const timed = async (name, fn) => { const t = performance.now(); await fn(); performance.measure?.(`warm:${name}`, { start: t, end: performance.now() }); };

export async function warmGame({ audio = true, progress = () => {} } = {}) {
  const sound = audio ? createSound() : null;
  let bank = audio ? 0 : 1, rest = 0;
  const tell = () => progress(Math.min(1, bank * BANK_SHARE + rest * (1 - BANK_SHARE)));
  const samples = sound ? timed('samples', () => sound.warmBank((p) => { bank = p; tell(); })) : Promise.resolve();
  // the rest while the samples come in
  await breath();
  if (sound) await timed('textures', async () => { for (let i = 0, more = true; more; i++) { more = sound.warmTextures(i); rest = (i + 1) / 4; tell(); await breath(); } });
  await timed('defs', () => warmDefs());
  rest = 1; tell();
  await samples;
  bank = 1; tell();
}
