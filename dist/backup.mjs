// Save backup and the feedback report (docs/demo-plan.md Phase 1, steps 4 and 5). Pure: app.js does the download, the
// file picker and the reload. Settings → Export save writes the save as a file; Import save reads one back through
// restore, refusing a save from a newer build. The report is what a tester attaches in the Discord.
import { restore, SAVE_VERSION, hackerLevel, classOf } from './combat.mjs';
import { ARCHETYPES } from './data.mjs';
import { version } from './demo.mjs';

const day = (now) => new Date(now).toISOString().slice(0, 10);
const handleOf = (s) => String(s?.profile?.handle || 'rookie').toLowerCase().replace(/[^a-z0-9_-]+/g, '') || 'rookie';
export const exportName = (s, now = Date.now()) => `blackbox-${handleOf(s)}-${day(now)}.json`;
export const reportName = (s, now = Date.now()) => `blackbox-report-${handleOf(s)}-${day(now)}.json`;
export const exportText = (s) => JSON.stringify(s);

// Who a save is: { handle, level, cls } for the import's question.
export const whoOf = (s) => ({ handle: s?.profile?.handle || 'rookie', level: hackerLevel(s), cls: ARCHETYPES[classOf(s)]?.name || '' });

// A file's text as a save: { ok, raw, save, who } or { ok: false, why }.
export function readSave(text) {
  let raw = null;
  try { raw = JSON.parse(text); } catch { /* not JSON */ }
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.version) || !raw.loadout) return { ok: false, why: "That file isn't a BLACKBOX save." };
  if (raw.version > SAVE_VERSION) return { ok: false, why: `That save comes from a newer build (save ${raw.version}; this one reads up to ${SAVE_VERSION}).` };
  if (raw.version < 6) return { ok: false, why: 'That save is too old to read.' };
  let save = null;
  try { save = restore(raw); } catch { /* broken */ }
  if (!save || save.version !== SAVE_VERSION) return { ok: false, why: "That save couldn't be read." };
  return { ok: true, raw, save, who: whoOf(save) };
}

// The feedback report: the build, the device, where you are, the last 100 log lines and the save.
// env: { browser, screen, now }.
export function reportOf(s, { browser = '', screen = '', now = Date.now() } = {}) {
  return {
    version: version(), save: SAVE_VERSION, at: new Date(now).toISOString(), browser, screen,
    level: hackerLevel(s), cls: classOf(s), floor: s.floors?.reached || 1,
    log: (s.logs || []).slice(-100).map((e) => `${e.type}: ${typeof e.message === 'string' ? e.message : ''}`),
    state: s,
  };
}
