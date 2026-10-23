// Terminal cosmetics: how the screen boots, what the prompt says and how the cursor looks. Rewards from
// achievements (achievements.mjs terminalRewards, a block of its own), cosmetic only: nothing here touches a rule, a
// number or how the command line takes what you type.
//   boot    the lines after the power-up (boots.mjs scripts them): Stock (today's, the default), POST, one a faction
//           at its top tier, Corrupted, Minimal.
//   prompt  the home prompt: Stock (<handle>@blackbox:~$, the default), root@<faction>#, <handle>@<title>:~$, >, λ,
//           and a two-line one. Runs, breaches, hubs and fights keep their own (they carry where you are).
//   cursor  the immersive shell's cursor: block (the default), underline or beam, blinking or steady.
// Saved on s.cosmetics (beside the casing's): { boot, prompt, cursor, steady }. An older save has none of them and
// shows the stock look. A look you haven't earned never shows, even if the save names it.
import { emit, warn } from './combat.mjs';
import { earned, terminalFrom } from './achievements.mjs';
import { FACTIONS, FACTION_IDS } from './factions.mjs';
import { titleById } from './profile.mjs';
import { ARCHETYPES } from './data.mjs';

// ---------- the looks ----------
// Names and tooltips in sentence case: "Name: what it is." (the tooltip's title is the name).
const factionBoot = (f) => ({ name: FACTIONS[f].short, faction: f, tip: `${FACTIONS[f].name}'s mark, and a line in its voice.` });
let LOOKS = null; // built on first use (factions.mjs may still be loading when this module is)
export const BOOT_LOOKS = () => (LOOKS ||= {
  stock: { name: 'Stock', tip: 'Your server read back to you, line by line.' },
  bios: { name: 'POST', tip: 'A memory count, the devices, a row of OK.' },
  ...Object.fromEntries(FACTION_IDS.map((f) => ['f-' + f, factionBoot(f)])),
  glitch: { name: 'Corrupted', tip: 'Garbled lines that settle one by one.' },
  minimal: { name: 'Minimal', tip: 'A cursor and one line.' },
});
export const PROMPTS = {
  stock: { name: 'Stock', tip: 'Your handle at the box.' },
  root: { name: 'Root', tip: 'Root at a faction you stand highest with.' },
  title: { name: 'Titled', tip: 'Your handle at the title you show.' },
  arrow: { name: 'Arrow', tip: 'A bare arrow.' },
  lambda: { name: 'Lambda', tip: 'A bare lambda.' },
  powerline: { name: 'Two-line', tip: 'Your handle, class and level over the prompt.' },
};
export const CURSORS = {
  block: { name: 'Block', tip: 'A solid block.' },
  underline: { name: 'Underline', tip: 'A bar under the next character.' },
  beam: { name: 'Beam', tip: 'A thin upright line.' },
};
export const bootIds = () => Object.keys(BOOT_LOOKS());
export const PROMPT_IDS = Object.keys(PROMPTS);
export const CURSOR_IDS = Object.keys(CURSORS);
const TABLE = { boot: () => BOOT_LOOKS(), prompt: () => PROMPTS, cursor: () => CURSORS };
const STOCK = { boot: 'stock', prompt: 'stock', cursor: 'block' };

// What brings a look (achievements), and whether it's yours. The stock ones are everyone's.
export const lookFrom = (kind, id) => (id === STOCK[kind] ? [] : terminalFrom(kind, id));
export const lookOpen = (s, kind, id) => !!TABLE[kind]()[id] && (id === STOCK[kind] || lookFrom(kind, id).some((a) => earned(s, a.id)));
export const openLooks = (s, kind) => Object.keys(TABLE[kind]()).filter((id) => lookOpen(s, kind, id));
// The look shown (read only: a view never writes the save). A choice you no longer hold falls back to stock.
const chosen = (s, kind, key = kind) => { const id = s.cosmetics?.[key]; return id && lookOpen(s, kind, id) ? id : STOCK[kind]; };
export const bootOf = (s) => chosen(s, 'boot');
export const promptOf = (s) => chosen(s, 'prompt');
export const cursorOf = (s) => ({ shape: chosen(s, 'cursor'), blink: s.cosmetics?.steady !== true });

// ---------- the prompt ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const handle = (s) => s.profile?.handle || 'rookie';
// The title you show (profile.mjs shownTitle, without writing the save), as a host name: "of the Last Note" → last-note.
function titleHost(s) {
  const p = s.profile || {}, have = p.titles || [];
  if (p.title === null) return null;
  const t = titleById(p.title && have.includes(p.title) ? p.title : have[0]);
  return t ? t.name.toLowerCase().replace(/^((of|the) )+/, '').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null;
}
// The faction for root@<faction>#: of those whose top tier you've earned, the one you stand highest with now.
export function rootFaction(s) {
  const mine = FACTION_IDS.filter((f) => earned(s, 'f-' + f));
  return mine.sort((a, b) => (s.standing?.[b] ?? 0) - (s.standing?.[a] ?? 0))[0] || null;
}
// A prompt's text: one line, or two for the two-line one ([top, bottom]).
export function promptText(s, id = promptOf(s)) {
  const who = handle(s);
  if (id === 'root') return `root@${rootFaction(s) || 'blackbox'}#`;
  if (id === 'title') return `${who}@${titleHost(s) || 'blackbox'}:~$`;
  if (id === 'arrow') return '>';
  if (id === 'lambda') return 'λ';
  if (id === 'powerline') {
    const c = s.loadout?.archetype || 'breaker';
    return [`.-[${who}]-[${(ARCHETYPES[c]?.name || c).toLowerCase()} ${s.hackers?.[c]?.level || 1}]-[~]`, "'-$"];
  }
  return `${who}@blackbox:~$`;
}
// The home prompt's label (app.js renderPrompt): its class and its markup. Stock is today's exactly.
export function promptLabel(s, id = promptOf(s)) {
  const t = promptText(s, id);
  if (id === 'stock') return { cls: 'prompt', html: `<span>${esc(t)}</span>` };
  if (Array.isArray(t)) return { cls: `prompt pf-${id}`, html: `<span class="p-two"><span class="p-l1">${esc(t[0])}</span><span class="p-l2">${esc(t[1])}</span></span>` };
  return { cls: `prompt pf-${id}`, html: `<span>${esc(t)}</span>` };
}

// ---------- commands ----------
// terminal, terminal boot <look>, terminal prompt <look>, terminal cursor <look>, terminal blink on|off.
// (terminal preview [look] is app.js's: it plays a boot on the screen.)
function find(kind, want) {
  const T = TABLE[kind](), w = String(want || '').toLowerCase();
  return Object.keys(T).find((id) => id === w || T[id].name.toLowerCase() === w || (T[id].faction && T[id].faction === w)) || null;
}
const lockedLine = (kind, id) => {
  const from = lookFrom(kind, id), shown = from.filter((a) => !a.hidden);
  const name = TABLE[kind]()[id].name;
  if (!from.length) return `${name} isn't yours yet.`;
  return `${name} comes with ${shown.length ? shown.map((a) => a.name).join(' or ') : 'a hidden achievement'}.`;
};
export function terminalCommand(s, raw) {
  const words = String(raw).trim().split(/\s+/), verb = (words[1] || '').toLowerCase(), rest = words.slice(2).join(' ');
  if (!verb) return emit(s, 'info', `Terminal: ${BOOT_LOOKS()[bootOf(s)].name} boot, ${PROMPTS[promptOf(s)].name} prompt, ${CURSORS[cursorOf(s).shape].name} cursor, ${cursorOf(s).blink ? 'blinking' : 'steady'}. terminal boot|prompt|cursor|blink`);
  if (verb === 'blink') {
    if (rest !== 'on' && rest !== 'off') return warn(s, 'terminal blink on|off');
    const C = (s.cosmetics ||= {});
    if (rest === 'on') delete C.steady; else C.steady = true;
    return emit(s, 'info', `Cursor: ${rest === 'on' ? 'blinking' : 'steady'}.`);
  }
  if (verb === 'boot' || verb === 'prompt' || verb === 'cursor') {
    const id = find(verb, rest);
    if (!id) return warn(s, `No ${verb} called ${rest || 'that'}. ${Object.values(TABLE[verb]()).map((x) => x.name).join(', ')}.`);
    if (!lookOpen(s, verb, id)) return warn(s, lockedLine(verb, id));
    const C = (s.cosmetics ||= {});
    if (id === STOCK[verb]) delete C[verb]; else C[verb] = id;
    return emit(s, 'info', `${verb === 'boot' ? 'Boot' : verb === 'prompt' ? 'Prompt' : 'Cursor'}: ${TABLE[verb]()[id].name}.`);
  }
  return warn(s, 'terminal boot <look>, terminal prompt <look>, terminal cursor <look>, terminal blink on|off, terminal preview');
}
