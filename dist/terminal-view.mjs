// System → Terminal (terminal.mjs): the boot, the prompt and the cursor. Pure functions of state. Each look shows as
// itself; its name and what brings it are its tooltip. Locked ones are dim, with a lock.
import { glyph } from './glyphs.mjs';
import { BOOT_LOOKS, PROMPTS, CURSORS, bootIds, PROMPT_IDS, CURSOR_IDS, lookOpen, lookFrom, bootOf, promptOf, cursorOf, promptText } from './terminal.mjs';
import { garble, FACTION_MARKS } from './boots.mjs';
import { FACTIONS } from './factions.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// "Name: what it is. Comes with <achievement>." (a hidden one stays hidden until it's earned).
function tipOf(s, kind, id, look) {
  const from = lookFrom(kind, id), open = lookOpen(s, kind, id);
  const names = from.filter((a) => !a.hidden || s.achievements?.got?.[a.id]).map((a) => a.name);
  const comes = !from.length ? '' : names.length ? ` Comes with ${names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0]}.` : ' Comes with a hidden achievement.';
  return `${look.name}: ${look.tip}${open && !from.length ? '' : comes}`;
}
function option(s, kind, id, look, on, sample) {
  const open = lookOpen(s, kind, id), tip = esc(tipOf(s, kind, id, look));
  const body = `<span class="tm-sample" aria-hidden="true">${sample}</span><span class="tm-name">${esc(look.name)}</span>`;
  return open
    ? `<button type="button" class="tm-opt" data-tm-${kind}="${id}" data-run="terminal ${kind} ${id}" aria-pressed="${on}" title="${tip}">${body}</button>`
    : `<span class="tm-opt locked" data-tm-${kind}="${id}" title="${tip}">${body}${glyph('lock')}</span>`;
}

// A boot's first look, as it reads on the screen.
function bootSample(s, id) {
  const L = BOOT_LOOKS()[id];
  if (L.faction) return `<span class="tm-mark" style="--fc:${FACTIONS[L.faction].color}">${esc(FACTION_MARKS[L.faction].slice(1, 4).join('\n'))}</span>`;
  const line = { stock: 'BLACKBOX/OS 0.9.4 · tty1\nmemory check .... 640K', bios: 'Model 7 BIOS 4.07\nMemory test: 640K OK', glitch: `${garble('BLACKBOX/OS 0.9.4')}\nfsck: 3 blocks recovered`, minimal: `${s.profile?.handle || 'rookie'}@blackbox ready` }[id] || '';
  return `<span class="tm-lines">${esc(line)}${id === 'minimal' ? '<i class="tm-cur"></i>' : ''}</span>`;
}
function promptSample(s, id) {
  const t = promptText(s, id);
  return Array.isArray(t) ? `<span class="tm-p two"><span>${esc(t[0])}</span><span>${esc(t[1])}</span></span>` : `<span class="tm-p">${esc(t)}</span>`;
}

export function terminalPageMarkup(s) {
  const boot = bootOf(s), prompt = promptOf(s), cur = cursorOf(s), plain = s.settings?.shell === 'plain';
  const boots = bootIds().map((id) => option(s, 'boot', id, BOOT_LOOKS()[id], boot === id, bootSample(s, id))).join('');
  const prompts = PROMPT_IDS.map((id) => option(s, 'prompt', id, PROMPTS[id], prompt === id, promptSample(s, id))).join('');
  const cursors = CURSOR_IDS.map((id) => option(s, 'cursor', id, CURSORS[id], cur.shape === id, `<span class="tm-p">$ ls<i class="tm-cur" data-shape="${id}"${cur.blink ? '' : ' data-steady'}></i></span>`)).join('');
  return `<div class="tm-page">
    <section class="card tm-card"><h2>Boot</h2><div class="tm-opts tm-boots">${boots}</div>
      <div class="row"><button type="button" class="btn" data-run="terminal preview" title="${esc(`Preview: ${BOOT_LOOKS()[boot].name}, as it plays after the power-up.`)}">Preview</button></div></section>
    <section class="card tm-card"><h2>Prompt</h2><div class="tm-opts tm-prompts">${prompts}</div></section>
    <section class="card tm-card"><h2>Cursor</h2>${plain ? `<p class="cs-note">${esc('Shell plain. The cursor is the browser\'s.')}</p>` : ''}<div class="tm-opts tm-cursors">${cursors}</div>
      <div class="row"><button type="button" class="btn" data-run="terminal blink ${cur.blink ? 'off' : 'on'}" aria-pressed="${cur.blink}" title="${esc('Blink: the cursor blinks while it waits. Motion off keeps it steady.')}">Blink ${cur.blink ? 'on' : 'off'}</button></div></section>
  </div>`;
}
