// Levels (dB) for round 2's attacks in the pick (virussound.mjs TRIM has the style round's four), measured through
// renderBoard() to the same marks: a medium hit −17 LUFS (momentary max), a crit −13, blocked −25, evaded −26.
// Scramble at today's blind (−22), Patch at today's patch (−25), Replicate between them (−23).
export const LEVELS = {
  cipher: { level: -1.2, crit: -1.3, blocked: -0.2, evaded: 1.2 },
  ring: { level: -1.3, crit: -1.4, blocked: 1.1, evaded: 2.9 },
  frost: { level: -1.1, crit: -1.5, blocked: -6.3, evaded: 1.1 },
  erase: { level: -0.8, crit: -1.7, blocked: 1.6, evaded: 4.1 },
  crumble: { level: -1.2, crit: -1.3, blocked: -3.1, evaded: 1.9 },
  scramble: { level: -1.4, crit: -1.5, blocked: 2.4, evaded: 4.9 },
  thorn: { level: -1.2, crit: -1.5, blocked: 2.5, evaded: 4.1 },
  strobe: { level: 0.2, crit: -2.2, blocked: 1.5, evaded: 3.8 },
  copy: { level: -1.3, crit: -1.3, blocked: -4.5, evaded: 2 },
  scan: { level: -1, crit: -1.6, blocked: 0.6, evaded: 1.8 },
  plate: { level: -2.4, crit: -0.4, blocked: -1.1, evaded: 2.8 },
  ledger: { level: -1.4, crit: -1.4, blocked: -2.1, evaded: 0.1 },
  mask: { level: -1.7, crit: -1.1, blocked: 4.1, evaded: 7.4 },
  byte: { level: 3.1, crit: -3.8, blocked: -2.2, evaded: 4.1 },
  lash: { level: -1, crit: -1.6, blocked: 0.8, evaded: 1.1 },
  blind: { level: -5.2 },
  replicate: { level: -4.5 },
  patch: { level: -3.3 },
};
