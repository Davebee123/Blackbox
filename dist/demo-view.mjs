// The demo's cards (docs/demo-plan.md Phase 1): the telemetry question, asked once after your first jack out, and the
// end-of-demo card, which opens when the last floor's chain is delivered and ends play. The end card's words come with
// Phase 5; this is its frame.
import { BOSSES } from './data.mjs';
import { UNIQUES, hackerLevel } from './combat.mjs';
import { LINKS, version } from './demo.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (ms) => { const m = Math.floor((ms || 0) / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const link = (href, label, tip) => (href ? `<a class="btn" href="${esc(href)}" target="_blank" rel="noopener" title="${esc(tip)}">${label}</a>` : `<button type="button" class="btn" disabled title="${esc(`${tip}\nNot linked yet.`)}">${label}</button>`);

export function askMarkup() {
  const tip = 'Play data\nWhen you play, the levels you reach, the bosses you fight and where you disconnect, under a random id. Never your handle.\nYou can turn it off in Settings.';
  return `<section class="card tm-ask" role="dialog" aria-label="Play data"><h2 title="${esc(tip)}">Play data</h2><p class="svc-line">Share anonymous play data to help tune the demo?</p>
    <div class="row"><button type="button" class="btn primary" data-tm="yes">Share</button><button type="button" class="btn" data-tm="no">No thanks</button></div></section>`;
}

// What the run came to: { ms, level, bosses, uniques }.
export function endStats(s) {
  return {
    ms: s.pace?.ms || 0, level: hackerLevel(s),
    bosses: Object.entries(s.dex?.won || {}).filter(([id, n]) => n > 0 && BOSSES[id]).length,
    uniques: Object.keys(s.collection || {}).filter((k) => UNIQUES[k]).length,
  };
}
export function endMarkup(s) {
  const x = endStats(s);
  const stat = (k, v) => `<div class="de-stat"><b>${esc(v)}</b><small>${k}</small></div>`;
  return `<section class="card demo-end" role="dialog" aria-label="End of the demo"><h2>End of the demo <small>${esc(version())}</small></h2>
    <div class="de-stats">${stat('played', clock(x.ms))}${stat('level', x.level)}${stat('bosses down', x.bosses)}${stat('uniques', x.uniques)}</div>
    <div class="row">${link(LINKS.itch, 'Follow on itch.io', 'Follow on itch.io: Hear when the full game opens.')}${link(LINKS.discord, 'Discord', 'Discord: Talk to the developer and other players.')}<button type="button" class="btn" data-backup="feedback" title="Feedback: Download a report and open the Discord to send it.">Feedback</button><button type="button" class="btn" data-backup="export" title="Export save: Keep your save, to carry into the full game.">Export save</button></div></section>`;
}
