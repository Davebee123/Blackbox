// INIT's table (docs/init-table.md): one count a save, *process table at N%*, 70 to 95. Logged-on time fills it, your
// play empties it, and each band pays from its edge to its end. Pure: the save in, numbers out (the caller emits).
//   s.table   the count, made on first use (TABLE.start)
//   full(s)   0 at 88% (Full's edge) to 1 at 95%     clear(s)  0 at 80% (Clear's edge) to 1 at 70%
// The bands' effects read these two: the orphan share (floorplan.mjs), orphan XP (combat.mjs payKill), Break-ins and
// Intel XP (gainXp), trash, elite and rare loot odds (rollOnce), vaults (netrooms.mjs takeVault), ★ rare spawns and
// the elites' orphan add (floorplan.mjs). It never moves a price.
export const TABLE = {
  start: 84, min: 70, max: 95,
  perHour: 2, // logged-on time fills it (orphans pile up); nothing moves while you're logged off
  orphan: 0.08, mapped: 1, contract: 2, // what your play frees: an orphan broken, a server Mapped, an Orphans contract delivered
  cancel: 8, // a cancel round at 95%: LANTERN cancels the oldest accounts (a Log line; the crisis comes later)
  full: [88, 95], clear: [80, 70], // each band's edge, then its end
  share: { between: 1 / 8, full: 1 / 3, clear: 1 / 20 }, // the orphans' share of plain fight rooms' respawns, at a band's end
  orphanXp: 0.25, // Full: orphan kills
  intelXp: 0.25, // Clear: Break-ins and Intel
  trashItems: 0.5, // Full: trash rolls a white or blue this much more often
  clearOdds: 0.4, // Clear: blue and yellow odds on elites, ★ rare spawns and vaults
  rare: 1, // Clear: ★ rare spawns this much more often
};
const clamp = (n) => Math.max(TABLE.min, Math.min(TABLE.max, n));
const ramp = (n, [edge, end]) => Math.max(0, Math.min(1, (n - edge) / (end - edge)));
export const countOf = (s) => (Number.isFinite(s?.table) ? s.table : TABLE.start);
export const shownCount = (s) => Math.round(countOf(s));
export const full = (s) => ramp(countOf(s), TABLE.full);
export const clear = (s) => ramp(countOf(s), TABLE.clear);
export const bandOf = (s) => (full(s) > 0 ? 'full' : clear(s) > 0 ? 'clear' : 'between');
// Moves the count by d (clamped); true when it reached 95% and a cancel round took its 8 off.
export function moveTable(s, d) {
  s.table = clamp(countOf(s) + d);
  if (s.table < TABLE.max) return false;
  s.table = clamp(s.table - TABLE.cancel);
  return true;
}
// Logged-on time only (invasion.mjs tickNetwork's dt).
export const tickTable = (s, dt) => (dt > 0 ? moveTable(s, (TABLE.perHour * dt) / 3600000) : false);
// The orphans' share of plain strays: 1 in 8 between, toward 1 in 3 across Full and 1 in 20 across Clear.
export function orphanShare(s) {
  const { between, full: f, clear: c } = TABLE.share;
  return between + (f - between) * full(s) + (c - between) * clear(s);
}
// The bands' multipliers, each 1 outside its band.
export const orphanXpMult = (s) => 1 + TABLE.orphanXp * full(s);
export const intelXpMult = (s) => 1 + TABLE.intelXp * clear(s);
export const trashItemMult = (s) => 1 + TABLE.trashItems * full(s);
export const clearOddsMult = (s) => 1 + TABLE.clearOdds * clear(s);
export const rareMult = (s) => 1 + TABLE.rare * clear(s);
// The Readout's tooltip (WoW's grammar): its name, its kind, what the band does now, the answer muted.
export const ORPHAN_TIP = 'Orphan\nA trade still waiting for its other side.\nBreaking it frees a slot.';
export function tableTip(s) {
  const n = shownCount(s), f = full(s), c = clear(s), pct = (x) => `${Math.round(x * 100)}%`;
  const now = f > 0 ? `Full: orphans are 1 stray in ${Math.round(1 / orphanShare(s))}, orphan kills pay +${pct(TABLE.orphanXp * f)} XP, trash drops whites and blues ${(1 + TABLE.trashItems * f).toFixed(2)}× as often, and elites bring an orphan along.`
    : c > 0 ? `Clear: orphans are 1 stray in ${Math.round(1 / orphanShare(s))}, Break-ins and Intel pay +${pct(TABLE.intelXp * c)} XP, elites, ★ rare spawns and vaults drop blues and yellows ${(1 + TABLE.clearOdds * c).toFixed(2)}× as often, and ★ rare spawns turn up ${(1 + TABLE.rare * c).toFixed(2)}× as often.`
    : 'Between the bands: orphans are 1 stray in 8, and the net runs as it is.';
  return `INIT's table\nProcess table at ${n}%\n${now}\nTime logged on fills it; orphans broken, servers Mapped and Orphans contracts empty it.`;
}
