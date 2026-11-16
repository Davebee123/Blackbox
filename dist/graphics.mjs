// The Graphics settings (docs/performance-plan.md "Settings"): what costs looks, as a preset or row by row. Each row
// is read by the effect it switches (app.js wires them): the virus picture (virus-art.mjs rate), ambient motion
// (.no-ambient on the body), a part's dissolve (hitfx.mjs dissolveMode), the chips' +1 column (chipfx.mjs), the
// tether's glow (.tether-steady) and the Screen effects level (screenfx.mjs, its own setting, s.settings.screenFx).
// s.settings.graphics = { auto, virus, ambient, dissolve, chips, tether }; auto: the device picks (a phone Balanced,
// a desktop Quality), applied on every load. Reads state; changes only s.settings.

export const GFX = {
  virus: ['still', 'slow', 'full'], // drawn still, at 8 frames a second, or at 25
  dissolve: ['fade', 'fewer', 'all'], // hitfx.mjs dissolveMode
  frameMs: { full: 40, slow: 125, still: 250 }, // virus-art.mjs: the least time between two frames
};
export const PRESETS = {
  quality: { virus: 'full', ambient: true, dissolve: 'all', chips: true, tether: true, screenFx: 'medium' },
  balanced: { virus: 'slow', ambient: true, dissolve: 'fewer', chips: true, tether: false, screenFx: 'medium' },
  performance: { virus: 'still', ambient: false, dissolve: 'fade', chips: false, tether: false, screenFx: 'subtle' },
};
const ROWS = ['virus', 'ambient', 'dissolve', 'chips', 'tether'];
export const autoPreset = (phone) => (phone ? 'balanced' : 'quality');

// The rows in force, each falling back to Quality's.
export function graphicsOf(s) {
  const g = s?.settings?.graphics || {}, q = PRESETS.quality;
  return {
    auto: g.auto !== false,
    virus: GFX.virus.includes(g.virus) ? g.virus : q.virus,
    ambient: typeof g.ambient === 'boolean' ? g.ambient : q.ambient,
    dissolve: GFX.dissolve.includes(g.dissolve) ? g.dissolve : q.dissolve,
    chips: typeof g.chips === 'boolean' ? g.chips : q.chips,
    tether: typeof g.tether === 'boolean' ? g.tether : q.tether,
  };
}
const screenFxOf = (s) => s?.settings?.screenFx || 'medium';
const matches = (s, k) => { const g = graphicsOf(s); return ROWS.every((r) => PRESETS[k][r] === g[r]) && PRESETS[k].screenFx === screenFxOf(s); };
// The preset the rows match (Auto while auto holds), or 'custom'.
export function presetOf(s, phone = false) {
  if (graphicsOf(s).auto && matches(s, autoPreset(phone))) return 'auto';
  return Object.keys(PRESETS).find((k) => matches(s, k)) || 'custom';
}
// After the Screen effects level changes by its own command: Auto lets go if the level is no longer its preset's.
export function settle(s, phone = false) {
  if (!graphicsOf(s).auto || matches(s, autoPreset(phone))) return false;
  s.settings.graphics = { ...graphicsOf(s), auto: false };
  return true;
}

// A save from before the Graphics settings: Auto, unless it chose a Screen effects level of its own (then its rows
// stay at Quality's and its level stays). Keyed on the field, so it is safe to run twice.
export function migrateGraphics(s) {
  const set = s?.settings;
  if (!set || set.graphics) return false;
  const own = set.screenFx && set.screenFx !== 'medium';
  const { screenFx, ...rows } = PRESETS.quality;
  set.graphics = { auto: !own, ...rows };
  return true;
}
// Auto: the device's preset, written into the rows (and the Screen effects level). On load, and when picked.
export function applyAuto(s, phone) {
  const g = graphicsOf(s);
  if (!g.auto) return false;
  return pick(s, autoPreset(phone), true);
}
function pick(s, name, auto) {
  const { screenFx, ...rows } = PRESETS[name];
  const set = (s.settings ||= {}), before = JSON.stringify([set.graphics, set.screenFx]);
  set.graphics = { auto, ...rows };
  set.screenFx = screenFx;
  return JSON.stringify([set.graphics, set.screenFx]) !== before;
}
// One row, by hand: the preset becomes whichever the rows now match.
export function setRow(s, row, value) {
  const g = graphicsOf(s);
  delete g.auto;
  (s.settings ||= {}).graphics = { auto: false, ...g, [row]: value };
}

const NAMES = { virus: 'Virus picture', ambient: 'Ambient motion', dissolve: 'Part dissolve', chips: 'Chip effects at +1', tether: 'Breathing tether' };
export const PRESET_NAMES = { auto: 'Auto', quality: 'Quality', balanced: 'Balanced', performance: 'Performance', custom: 'Custom' };
// `graphics auto|quality|balanced|performance`, `graphics virus full|slow|still`, `graphics dissolve all|fewer|fade`,
// `graphics ambient|chips|tether on|off`. Returns the notice to show, or null when it isn't a graphics command.
export function graphicsCommand(s, text, { phone = false } = {}) {
  const m = String(text).trim().toLowerCase().match(/^graphics(?: (.+))?$/);
  if (!m) return null;
  const arg = (m[1] || '').trim();
  if (arg === 'auto') { (s.settings ||= {}).graphics = { ...graphicsOf(s), auto: true }; applyAuto(s, phone); return `Graphics: Auto (${PRESET_NAMES[autoPreset(phone)]}).`; }
  if (PRESETS[arg]) { pick(s, arg, false); return `Graphics: ${PRESET_NAMES[arg]}.`; }
  const r = arg.match(/^(virus|dissolve|ambient|chips|tether) (\w+)$/);
  if (r && (r[1] === 'virus' || r[1] === 'dissolve') && GFX[r[1]].includes(r[2])) { setRow(s, r[1], r[2]); return `${NAMES[r[1]]}: ${r[2]}.`; }
  if (r && ['ambient', 'chips', 'tether'].includes(r[1]) && ['on', 'off'].includes(r[2])) { setRow(s, r[1], r[2] === 'on'); return `${NAMES[r[1]]}: ${r[2]}.`; }
  return 'graphics auto|quality|balanced|performance, graphics virus full|slow|still, graphics dissolve all|fewer|fade, or graphics ambient|chips|tether on|off';
}
