// The one way out to the speakers. Every bus in the game (effects, room tone, music, the street, places, the cold
// open) meets here, and a limiter holds their sum under full scale; on their own they summed past it and clipped.
const outs = new WeakMap(); // AudioContext → the limiter's input
export function outputOf(ctx) {
  if (!ctx.createDynamicsCompressor) return ctx.destination; // a stand-in context (tests)
  if (!outs.has(ctx)) {
    const g = ctx.createGain(), lim = ctx.createDynamicsCompressor();
    g.gain.value = 0.9;
    lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
    g.connect(lim).connect(ctx.destination);
    outs.set(ctx, g);
  }
  return outs.get(ctx);
}
