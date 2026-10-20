// BLACKBOX place sounds: where you are, as a quiet loop under the music, and the virus you're fighting.
//   FLOORS    each floor of the network has its own bed (The Sprawl's back street, Backhaul's cable duct, …). It
//             plays while the map shows that floor, and on a run or a fight on one of its servers. Home (every
//             other screen) keeps the room tone and the home music, with no bed of its own.
//   HUBS      each faction's hub has its own bed while its session is open. It takes over from the floor's.
//   FAMILIES  in a fight with a Ransomware, a Worm or a Ghostroot, the family's idle loop sits very quietly under
//             the fight; its attack one-shot lands with a real attack on you (with the hurt, not instead of it),
//             and its break one-shot with a part breaking (with the break). Chip damage (a fragment gnawing, an
//             echo, a hit that bounces back, any hit under CHIP of your bar) only has the hurt.
// The files are in dist/sfx/floors, hubs and families (Ogg Vorbis, synthesized; see sfx/CREDITS.md). They load
// the first time they're wanted, never at start-up, and each is decoded once. Loops play from Web Audio buffers,
// so they repeat without a gap; a change of place crossfades over FADE seconds. Nothing plays before audio is
// unlocked by a click or a key (the power-on screen does that), with Sound off, or with the Places slider at 0.
import { CONFIG } from './data.mjs';
import { active, findLocation } from './combat.mjs';
import { floorOfSlot } from './floors.mjs';

export const FLOOR_BEDS = {
  1: 'floors/floor-1-sprawl-r2-a.ogg', // The Sprawl
  2: 'floors/floor-2-backhaul-r2.ogg', // Backhaul
  3: 'floors/floor-3-stacks-r2-b.ogg', // The Stacks
  4: 'floors/floor-4-coldline-b.ogg', // Coldline
  5: 'floors/floor-5-deep-core.ogg', // Deep Core
  6: 'floors/floor-6-kernel-space-b.ogg', // Kernel Space
  7: 'floors/floor-7-the-sink.ogg', // The Sink
  8: 'floors/floor-8-bedrock-b.ogg', // Bedrock
};
export const HUB_BEDS = {
  halcyon: 'hubs/hub-halcyon.ogg',
  glassjaw: 'hubs/hub-glassjaw.ogg',
  kestrel: 'hubs/hub-kestrel.ogg',
  lantern: 'hubs/hub-lantern.ogg',
  nullchoir: 'hubs/hub-null-choir-a.ogg',
};
const fam = (id) => ({ idle: `families/${id}-idle.ogg`, attack: `families/${id}-attack.ogg`, break: `families/${id}-break.ogg` });
export const FAMILY_SOUNDS = { ransomware: fam('ransomware-b-press'), worm: fam('worm-a-insect'), ghostroot: fam('ghostroot-a-whisper') };

// Levels. The files sit at −23 LUFS (loops) and −16 LUFS (one-shots); the music plays at about −35 in the mix.
// A bed sits several dB under the music, a family's idle further down still (texture, not a cue).
export const LEVEL = { floor: 0.11, hub: 0.12, family: 0.05, shot: 0.5 };
export const FADE = 2; // seconds: a change of place crossfades
export const LOOP_PAD = 0.05; // seconds of wrap-around each loop file carries before and after the loop (render.mjs)
// How long each kind of loop is. A loop plays from LOOP_PAD to LOOP_PAD + its length, never to the file's end: a
// browser's Vorbis decoder can hand back a few ms more than the file holds at the end (Chromium does).
export const LOOP_SECONDS = { floors: 20, hubs: 15, families: 6 };
export const loopOf = (url) => LOOP_SECONDS[String(url).split('/')[0]] || null;
export const CHIP = 0.05; // a hit under this share of your bar is chip damage: no attack one-shot
// While a game sound plays, the beds dip so they never mask it: the bed to DUCK.bed, a family idle to DUCK.family.
export const DUCK = { bed: 0.6, family: 0.35, back: 0.9 };

// ---------- what plays where ----------
// The floor a server stands on: SPRAWL-00 is floor 1's entry; a located server's slot names its floor; a server
// with no slot (a member's, an occupation) goes by its depth.
export function floorOfLoc(loc) {
  if (!loc) return null;
  if (loc.zone || loc.id === CONFIG.zone.id) return 1;
  const n = floorOfSlot(loc.slot) || loc.depth || null;
  return n && FLOOR_BEDS[n] ? n : null;
}
// The floor a run (and a fight on it) is on, or null when it's none of the network's floors (a breach, a playtest).
export function runFloor(s) {
  if (!s?.run) return null;
  const loc = s.run.loc === CONFIG.zone.id ? { zone: true } : findLocation({ locations: [], ...s }, s.run.loc);
  return floorOfLoc(loc);
}
// The family whose sounds a fight carries: one of FAMILY_SOUNDS (a rooms-engine family or a boss without one: null).
export const fightFamily = (s) => (active(s) && FAMILY_SOUNDS[s.encounter.virus?.family] ? s.encounter.virus.family : null);

// What should be playing. view: { hub: the faction whose session is open and showing (or null), map: the floor the
// map shows (or null when the map isn't the screen, or shows the consortium) }.
// Returns { bed, family }: the bed's file (or null), and the fighting family (or null).
export function placeOf(s, view = {}) {
  const family = fightFamily(s);
  if (view.hub && HUB_BEDS[view.hub]) return { bed: HUB_BEDS[view.hub], family };
  const fight = active(s) ? s.encounter : null;
  let floor = null;
  if (fight && fight.mode !== 'home') floor = runFloor(s) || (fight.zone ? 1 : null);
  else if (!fight && s.run) floor = runFloor(s);
  else if (!fight && view.map) floor = view.map;
  return { bed: FLOOR_BEDS[floor] || null, family };
}

// Which events in one batch carry a family one-shot, in a fight with one of FAMILY_SOUNDS: a real attack from one of
// its parts (the attack), and a part breaking (the break). One of each a batch at most, so a burst of hits doesn't
// pile them up. A hit on a crewmate has no attack one-shot (a part a crewmate breaks still has its break).
// Returns a Map of event → { family, kind }.
export function familyCues(s, events, max = null) {
  const out = new Map(), e0 = s.encounter, family = e0 && e0.phase !== 'alert' && FAMILY_SOUNDS[e0.virus?.family] ? e0.virus.family : null;
  if (!family) return out; // (the batch that wins a fight ends it: its last break still counts)
  const parts = s.encounter.virus.parts || [];
  const bar = max || (s.encounter.mode === 'run' ? s.run?.max : s.server?.max) || 100;
  let attack = false, broke = false;
  for (const e of events || []) {
    if (!broke && e.type === 'broken' && parts.some((p) => p.id === e.target)) { broke = true; out.set(e, { family, kind: 'break' }); continue; }
    if (!attack && !e.who && realAttack(e, parts, bar)) { attack = true; out.set(e, { family, kind: 'attack' }); }
  }
  return out;
}
// A part's attack that lands on you for real: a hit (a crit, a tell, or at least CHIP of your bar), or an Encrypt
// or a Scramble landing. Not a fragment's gnaw, an echo, a bounce, the per-cycle encryption tick or a raid's burn.
export function realAttack(e, parts, bar = 100) {
  if (!e?.source || !['server-hit', 'encrypt', 'blind'].includes(e.type)) return false;
  const p = parts.find((x) => x.id === e.source);
  if (!p || p.kind === 'fragment') return false;
  if (e.type !== 'server-hit') return true;
  if (e.bounce || e.raid || / echo$/.test(e.atk || '')) return false;
  return !!(e.crit || e.tell || (e.amount || 0) >= CHIP * bar);
}

// ---------- the player ----------
// getCtx: the shared AudioContext (sound.mjs context()), or null. clip(buffer, gain): plays a one-shot through the
// game's effects chain, so it follows the Effects slider. fetchFn and base are for tests.
export function createPlaces(getCtx, { clip = null, base = new URL('./sfx/', import.meta.url), fetchFn = (u) => fetch(u) } = {}) {
  let ctx = null, out = null, want = { on: false, bed: null, family: null };
  const vol = { places: 0.8 };
  const layers = { bed: null, family: null }; // each { url, src, gain, duck }
  const cache = new Map(); // url → Promise<AudioBuffer | null>
  const level = (which, url) => (which === 'family' ? LEVEL.family : url.startsWith('hubs/') ? LEVEL.hub : LEVEL.floor);
  const audible = () => want.on && vol.places > 0;

  function setup() {
    const c = getCtx?.() || null;
    if (c && c !== ctx) { ctx = c; out = null; ctx.addEventListener?.('statechange', () => { if (ctx.state === 'running') apply(); }); }
    if (!ctx || ctx.state !== 'running') return false; // not unlocked yet: the first click or key brings it here again
    if (!out) { out = ctx.createGain(); out.gain.value = vol.places / 0.8; out.connect(ctx.destination); }
    return true;
  }
  function load(url) {
    if (!cache.has(url)) {
      cache.set(url, Promise.resolve().then(() => fetchFn(new URL(url, base).href))
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => (b ? ctx.decodeAudioData(b) : null))
        .then((buf) => (/-(attack|break)\.ogg$/.test(url) ? buf : seal(buf, loopOf(url))))
        .catch(() => null));
    }
    return cache.get(url);
  }
  function ramp(param, to, secs) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + secs);
  }
  function fadeOut(l) {
    if (!l) return;
    l.gone = true;
    if (!l.src) return; // still loading: it never starts
    ramp(l.gain.gain, 0, FADE);
    const { src, gain, duck } = l;
    setTimeout(() => { try { src.stop(); } catch { /* already */ } src.disconnect(); gain.disconnect(); duck.disconnect(); }, FADE * 1000 + 100);
  }
  function start(which, url) {
    const l = { url, src: null, gain: null, duck: null, gone: false };
    load(url).then((buf) => {
      if (l.gone || !buf || layers[which] !== l || !setup()) return;
      const src = ctx.createBufferSource(), gain = ctx.createGain(), duck = ctx.createGain();
      src.buffer = buf; src.loop = true;
      src.loopStart = LOOP_PAD; src.loopEnd = Math.min(buf.duration, LOOP_PAD + (loopOf(url) || buf.duration - 2 * LOOP_PAD));
      gain.gain.value = 0; src.connect(gain).connect(duck).connect(out);
      src.start(ctx.currentTime, src.loopStart);
      Object.assign(l, { src, gain, duck });
      ramp(gain.gain, level(which, url), FADE);
    });
    return l;
  }
  function apply() {
    for (const which of ['bed', 'family']) {
      const url = audible() ? (which === 'bed' ? want.bed : FAMILY_SOUNDS[want.family]?.idle) || null : null;
      if ((layers[which]?.url || null) === url) continue;
      if (url && !setup()) continue; // wait for audio: nothing is fetched or started before it's unlocked
      fadeOut(layers[which]);
      layers[which] = url ? start(which, url) : null;
    }
  }

  return {
    // { on, bed, family }, from placeOf() and the Sound setting: call whenever they might have changed; it's cheap.
    set(next) { want = { ...want, ...next }; apply(); },
    // A family's one-shot ('attack' or 'break'), through the effects chain (with Sound on).
    shot(family, kind) {
      const url = FAMILY_SOUNDS[family]?.[kind];
      if (!url || !want.on || !clip || !setup()) return;
      load(url).then((buf) => { if (buf && want.on) clip(buf, LEVEL.shot); });
    },
    // A game sound is playing: the beds dip under it and come back.
    duck() {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      for (const which of ['bed', 'family']) {
        const d = layers[which]?.duck?.gain;
        if (!d) continue;
        d.cancelScheduledValues(t); d.setValueAtTime(d.value, t);
        d.linearRampToValueAtTime(which === 'family' ? DUCK.family : DUCK.bed, t + 0.03);
        d.linearRampToValueAtTime(1, t + 0.03 + DUCK.back);
      }
    },
    volumes(v = {}) {
      if (v.places == null) return;
      vol.places = v.places;
      if (out) out.gain.value = vol.places / 0.8;
      apply();
    },
    // For tests and the debug hook: what's playing (or loading), by file.
    playing() { return { bed: layers.bed?.url || null, family: layers.family?.url || null }; },
    loaded() { return [...cache.keys()]; },
  };
}

// Make a decoded loop seamless at its seam: the loop's first few ms are blended from the file's own continuation past
// the loop's end (the pad), so the sample after loopEnd that plays (the loop's start) is the one the decoder had there.
export function seal(buf, secs) {
  if (!buf || !buf.getChannelData || !secs) return buf;
  const sr = buf.sampleRate, pad = Math.round(LOOP_PAD * sr), n = Math.round(secs * sr), k = Math.min(pad, Math.round(0.04 * sr));
  if (pad + n + k > buf.length) return buf;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < k; i++) { const w = i / k; d[pad + i] = d[pad + i] * w + d[pad + n + i] * (1 - w); }
  }
  return buf;
}
