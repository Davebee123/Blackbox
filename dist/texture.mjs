// Textures built sample by sample (noise, static, crackle, a reverb's tail) sound the way they were made: at
// TEXTURE_RATE. A recipe written per sample (hold a value 6 samples, smooth it by half each sample) changes with the rate
// it runs at, and the game's sounds were tuned on a 192 kHz output; at 48 kHz the same code gave a darker reverb and
// coarser static. texture() runs the recipe at TEXTURE_RATE and resamples the result to the context's rate, keeping
// what is audible of it. It costs only at build time; nothing per sample is added to what plays.
export const TEXTURE_RATE = 192000;

// A buffer of `channels` × `seconds` at ctx's rate. fill(data, sr, channel) writes the recipe at rate sr into data (a
// Float32Array of sr × seconds samples). wrap: the buffer loops (or starts anywhere), so its ends filter into each other.
// The buffer's `kept` is the share of the recipe's level that is audible at ctx's rate (an RMS ratio, 1 when nothing is
// resampled): a convolver normalizes its response over the whole band, so a reverb built from this plays its tail at
// `kept` (reverbGain) to sound as it did.
export function texture(ctx, channels, seconds, fill, { wrap = true } = {}) {
  const to = ctx.sampleRate, from = Math.max(to, TEXTURE_RATE), n = Math.max(1, Math.floor(from * seconds)), m = Math.max(1, Math.floor(to * seconds));
  const out = ctx.createBuffer(channels, m, to);
  let pin = 0, pout = 0;
  for (let c = 0; c < channels; c++) {
    const src = new Float32Array(n), dst = out.getChannelData(c);
    fill(src, from, c);
    if (from === to) dst.set(src.subarray(0, m));
    else resample(src, dst, from / to, wrap);
    for (let i = 0; i < n; i++) pin += src[i] * src[i];
    for (let i = 0; i < m; i++) pout += dst[i] * dst[i];
  }
  // RMS over each one's own length: the level the convolver's normalization sees, at its own rate.
  out.kept = from === to || !pin ? 1 : Math.sqrt((pout / m) / (pin / n));
  return out;
}
// A reverb's level to sound as built at TEXTURE_RATE (see texture's `kept`).
export const reverbGain = (buf) => buf?.kept ?? 1;

// Windowed-sinc decimation by R (> 1): a low-pass at 0.92 of the output's Nyquist, eight of its zero crossings either
// side, a Blackman window, the kernel tabled at 512 sub-sample phases.
const tables = new Map();
function kernel(R) {
  const key = R.toFixed(6);
  if (tables.has(key)) return tables.get(key);
  const P = 512, W = Math.ceil(8 * R), fc = 0.46 / R, taps = 2 * W + 1, tab = new Float32Array((P + 1) * taps);
  for (let p = 0; p <= P; p++) {
    const frac = p / P;
    for (let i = -W; i <= W; i++) {
      const x = i - frac, s = x === 0 ? 1 : Math.sin(2 * Math.PI * fc * x) / (2 * Math.PI * fc * x), u = (x + W) / (2 * W);
      const win = u <= 0 || u >= 1 ? 0 : 0.42 - 0.5 * Math.cos(2 * Math.PI * u) + 0.08 * Math.cos(4 * Math.PI * u);
      tab[p * taps + i + W] = 2 * fc * s * win;
    }
  }
  const k = { P, W, taps, tab };
  tables.set(key, k);
  return k;
}
function resample(src, dst, R, wrap) {
  const { P, W, taps, tab } = kernel(R), n = src.length;
  for (let j = 0; j < dst.length; j++) {
    const t = j * R, k0 = Math.floor(t), row = Math.round((t - k0) * P) * taps;
    let acc = 0;
    if (k0 - W >= 0 && k0 + W < n) for (let i = 0; i < taps; i++) acc += src[k0 - W + i] * tab[row + i];
    else for (let i = 0; i < taps; i++) { let k = k0 - W + i; if (wrap) k = ((k % n) + n) % n; else if (k < 0 || k >= n) continue; acc += src[k] * tab[row + i]; }
    dst[j] = acc;
  }
}
