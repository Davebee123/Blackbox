// The rogue server (the starting zone): no guard, no vault, just folders where viruses sit.
// Kept apart from run.mjs so mail.mjs can place contract targets here without an import cycle.
import { CONFIG } from './data.mjs';

export const SPRAWL = {
  '/': { dirs: ['net', 'tmp', 'var', 'srv'], files: ['motd.txt'] },
  '/net': { dirs: ['relay'], files: ['routes.txt'] },
  '/net/relay': { dirs: [], files: [] },
  '/tmp': { dirs: [], files: [] },
  '/var': { dirs: ['log'], files: [] },
  '/var/log': { dirs: [], files: ['syslog'] },
  '/srv': { dirs: [], files: ['junk.dat'] },
};
export const zoneRooms = () => Object.keys(SPRAWL).filter((p) => p !== '/');
// The zone lives beside your traced locations (s.zone), never among them.
export function zoneOf(s) {
  s.zone ||= { id: CONFIG.zone.id, name: CONFIG.zone.name, zone: true, template: 'sprawl', family: 'worm', deeper: 'ransomware', owner: 'NOBODY', password: 'none00', seed: 4242, depth: 0, quirk: null, month: 'jan', state: { cleared: {}, unlocked: {}, taken: {} }, runs: 0, spawns: {}, serial: 0 };
  return s.zone;
}
