// The talent tiers' save migration (docs/builds.md, *Talent tiers*). Before them a subclass's tree was three ranked rows
// (s.loadout.ranks[sub]: { id: rank }) and three tiers of two (s.loadout.picks[sub]: [0|1] a tier). Now it is six tiers
// of three (s.loadout.tiers[sub]). A talent that survives into a tier is picked there; the rest of the tiers wait.
import { SUBS, LOADOUT } from './data.mjs';

// The old trees' ids, a row each: the ranked rows and the two-way tiers (the old migrations read them too).
export const LEGACY_TREES = {
  demolitionist: { ranked: ['armor-cracker blast-radius', 'overclocked shrapnel', 'failsafe deep-burn'], picks: ['cluster-charge exposed-wiring', 'cascade-failure meltdown', 'total-overkill scorched-earth'] },
  overclocker: { ranked: ['heat-sink chain-exploit', 'exploit-kit core-voltage', 'heat-spreader liquid-cooling'], picks: ['hair-trigger feedback-loop', 'core-dump burn-in', 'unsafe-mode critical-heat'] },
  warden: { ranked: ['reverse-shell deep-buffer', 'hardened-kernel stateful-firewall', 'vendetta token-bucket'], picks: ['tarpit deep-packet-inspection', 'counterflow write-protect', 'uptime kernel-panic'] },
  sysop: { ranked: ['patch-notes fan-out', 'reserve-pool redundancy', 'tick-rate hardened-kernel'], picks: ['service-pack ping-flood', 'critical-path redistribute', 'overcommit loopback'] },
  payload: { ranked: ['heap-spray persistent-tag', 'shaped-charge backchannel', 'low-profile virulence'], picks: ['supercookie polymorphic', 'contagion assassinate', 'superspreader persistence'] },
  phantom: { ranked: ['cold-open recon', 'pivot onion-routing', 'low-profile log-rotation'], picks: ['fast-hands blind-spot', 'kill-chain ghost-route', 'deep-cover tracking-pixel'] },
  herder: { ranked: ['thread-pool node-pool', 'wide-area dead-mans-switch', 'load-balancer gc-tuning'], picks: ['big-process long-running', 'hive hydra', 'zombie-process supervisor'] },
  hijacker: { ranked: ['thread-pool kernel-hook', 'ack-flood cold-storage', 'load-balancer packet-capture'], picks: ['long-jam loopback', 'double-agent crosstalk', 'full-duplex kill-chain'] },
};
// Old talents that live on under a new name.
const RENAMED = { hijacker: { 'kill-chain': 'handoff' }, payload: { polymorphic: 'long-fuse' } };
const where = (sub, id) => { for (const [i, row] of (SUBS[sub]?.tiers || []).entries()) { const j = row.findIndex((n) => n.id === id); if (j >= 0) return [i, j]; } return null; };
// Keyed on the old fields: it converts them and deletes them, so a second run finds nothing to do. An old pick wins its
// tier over a ranked node; among ranked nodes the most ranks win.
export function tiersRestore(s) {
  const L = s.loadout;
  if (!L || (!L.picks && !L.ranks)) return;
  L.tiers ||= {};
  for (const sub of new Set([...Object.keys(L.picks || {}), ...Object.keys(L.ranks || {})])) {
    if (!SUBS[sub] || L.tiers[sub]) continue;
    const old = LEGACY_TREES[sub], got = [], weight = [];
    const take = (id, w) => { const at = where(sub, RENAMED[sub]?.[id] || id); if (at && !(weight[at[0]] >= w)) { got[at[0]] = at[1]; weight[at[0]] = w; } };
    for (const [id, n] of Object.entries(L.ranks?.[sub] || {})) if (n > 0) take(id, n);
    (L.picks?.[sub] || []).forEach((k, i) => { const id = (k === 0 || k === 1) && old?.picks[i]?.split(' ')[k]; if (id) take(id, 9); });
    if (got.length) L.tiers[sub] = Array.from({ length: SUBS[sub].tiers.length }, (_, i) => got[i] ?? null);
  }
  delete L.picks;
  delete L.ranks;
}
// The pick a bot takes in each tier (0, 1 or 2; the plain one where none is named), by subclass: plain, but for the few
// picks that keep a bot in its band (balance.mjs score, each tier's picks against the plain one): the Demolitionist's
// Recursion at 50, the Overclocker's Cold Plate at 50, the Hijacker's Port Mirror from 10.
export const BOT_PICKS = { demolitionist: [0, 0, 0, 0, 0, 1], overclocker: [0, 0, 0, 0, 2], hijacker: [1] };
// The tiers a bot or a test takes at a level: picks[i] where given, else the subclass's bot pick, else the plain one,
// each tier once open.
export const botTiers = (level, picks = null, sub = null) => LOADOUT.tiers.map((l, i) => (level >= l ? (picks || BOT_PICKS[sub] || [])[i] ?? 0 : null));
