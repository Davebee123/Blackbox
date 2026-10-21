// Routines on screen (routines.mjs is the model): the Loadout's Program tab (the viruses you've met down the left; the
// picked one's routine: its presets, its handler stack, the chips for its parts, the rails) and the program's marks on
// the fight board (its next move ghosted on the part it will hit; a part that's yours to play in the exception colour).
// Show it, don't explain it (docs/style-guide.md 0): chips with icons, RAM as cells, the rules in tooltips. app.js
// wires the drag and drop (routines-ui.mjs).
import { glyph } from './glyphs.mjs';
import { ABILITIES } from './data.mjs';
import { said, active, hackerLevel } from './combat.mjs';
import { entries } from './codex.mjs';
import { ROUTINES, LOCKED, EXCEPTION, confirmed, TARGETS, unlocked, programsOf, programName, routineOf, focusBody, bodyName, bodyDecoded, isBody, handlerRows, ramFor, ramUsed, barSkills, palette, presetsFor, presetNow, whenLabel, whenTip, whenIcon, whenRam, isLong, parseWhen, refName, live, preview, exceptionsOf, wholeFight } from './routines.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pips = (n, cls = '') => `<span class="rt-pips${cls ? ' ' + cls : ''}" aria-label="${n} RAM">${Array.from({ length: n }, () => '<i></i>').join('')}</span>`;
const takesPart = (id) => !['none', 'aggro'].includes(ABILITIES[id]?.target);
const skillName = (s, id) => (id === 'spike' ? said(s, 'spike').replace(/^./, (c) => c.toUpperCase()) : ABILITIES[id]?.name || id);
const verbOf = (id) => ABILITIES[id]?.verb || 'hit';
const BODY_GROUPS = ['family', 'strain', 'guard', 'runner'];

// ---------- chips ----------
function whenChip(s, id, { drag = true, open = true, extra = '', short = false } = {}) {
  const w = parseWhen(id), ram = whenRam(id), label = short && w?.kind === 'part' ? w.def.short : whenLabel(id);
  const tip = open ? `${whenTip(id)} RAM ${ram}.` : `${whenTip(id)} Research ${w?.def.tier} on the ${refName(w?.ref)} opens it.`;
  return `<span class="rt-chip rt-when${open ? '' : ' locked'}"${drag && open ? ` draggable="true" data-rt-drag="when:${esc(id)}"` : ''} title="${esc(tip)}">${glyph(open ? whenIcon(id) : 'lock')}<b>${esc(label)}</b>${pips(ram)}${extra}</span>`;
}
function doChip(s, x, { drag = true } = {}) {
  const long = isLong(s, x.id);
  return `<span class="rt-chip rt-do verb-${esc(verbOf(x.id))}"${drag ? ` draggable="true" data-rt-drag="do:${esc(x.id)}"` : ''} title="${esc(`${skillName(s, x.id)}: ${ABILITIES[x.id]?.short || ''}${long ? ' A long cooldown: the rotation never fires it, a handler can (+1 RAM).' : ''}`)}">${x.key ? `<kbd>${esc(x.key)}</kbd>` : ''}${glyph(verbOf(x.id), 'verb-' + verbOf(x.id))}<b>${esc(skillName(s, x.id))}</b>${long ? '<small class="rt-long">⟳6+</small>' : ''}</span>`;
}
const targetChip = (id, { drag = true } = {}) => `<span class="rt-chip rt-tgt"${drag ? ` draggable="true" data-rt-drag="target:${esc(id)}"` : ''} title="${esc(TARGETS[id].tip)}">${glyph(TARGETS[id].icon)}<b>${esc(TARGETS[id].label)}</b></span>`;

// A handler's slot: the chip, a drop zone, and a dropdown over it (the phone's way, and the keyboard's).
function slot(kind, i, chip, options, value, disabled = false) {
  const sel = disabled ? '' : `<select class="rt-sel" data-rt-set="${i + 1} ${kind}" aria-label="${esc(kind.toUpperCase())} for handler ${i + 1}">${options.map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<span class="rt-slot rt-s-${kind}${disabled ? ' off' : ''}" data-rt-drop="${kind}:${i}"><span class="rt-kind">${kind === 'when' ? 'WHEN' : kind === 'do' ? 'DO' : 'TARGET'}</span>${chip}${sel}</span>`;
}
const ramCells = (used, budget) => `<span class="rt-cells">${Array.from({ length: budget }, (_, k) => `<i class="${k < used ? 'on' : ''}"></i>`).join('')}</span>`;

// ---------- the Program tab ----------
// Below level 5: one locked card, your level against the one it opens at.
function lockedMarkup(s) {
  const lv = hackerLevel(s), need = ROUTINES.unlockLevel;
  return `<section class="card rt-locked" title="${esc(LOCKED)}"><h2>Program</h2><h1>${glyph('lock')}${esc(LOCKED)}</h1>
    <span class="rt-lv" aria-label="Level ${lv} of ${need}">${Array.from({ length: need }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}<b>Lv ${lv}/${need}</b></span></section>`;
}
// The viruses you've met, the Codex's way (families, strains, guards, the Exfil); a met one you haven't decoded greyed.
function virusList(s, body) {
  const groups = entries(s).filter((g) => BODY_GROUPS.includes(g.id)).map((g) => ({ ...g, rows: g.rows.filter((r) => r.known && isBody(r.id)) })).filter((g) => g.rows.length);
  const row = (r) => {
    const n = routineOf(s, r.id).handlers.length, pre = presetsFor(s, r.id).find((p) => p.id === presetNow(s, r.id)), dec = bodyDecoded(s, r.id);
    const own = confirmed(s, r.id), state = pre ? pre.name : n ? `${n} handler${n === 1 ? '' : 's'}` : own ? 'Rotation' : 'no routine';
    const tip = `${r.name}: ${pre ? `${pre.name}, ` : ''}${n ? `${n} handler${n === 1 ? '' : 's'}` : own ? 'the rotation, confirmed' : 'no routine, the rotation plays'}. RAM ${ramUsed(s, r.id)} of ${ramFor(s, r.id)}.${dec ? '' : ' Research its parts in fights to open their chips.'}`;
    return `<li><button type="button" class="rt-v${r.id === body ? ' on' : ''}${dec ? '' : ' dim'}${own ? ' set' : ''}" data-command="program ${esc(r.id)}" aria-current="${r.id === body}" title="${esc(tip)}"><span class="rt-v-ico" aria-hidden="true">${glyph(r.icon)}</span><span class="rt-v-name">${esc(r.name)}</span><small class="rt-v-state">${esc(state)}</small><small class="rt-v-ram">${ramUsed(s, r.id)}/${ramFor(s, r.id)}</small></button></li>`;
  };
  const list = groups.map((g) => `<li class="rt-vg"><h3 class="rt-label">${esc(g.name)}</h3><ul>${g.rows.map(row).join('')}</ul></li>`).join('');
  return `<section class="card rt-viruses"><h2>Viruses</h2>${list ? `<ul class="rt-vlist">${list}</ul>` : `<p class="rt-empty" title="Meet a virus in a fight and its routine opens here.">${glyph('lock')}???</p>`}</section>`;
}
// The ready-made routines for a virus: the rotation alone, then its presets; the one the stack is now lit.
function presetRow(s, body) {
  const R = routineOf(s, body), now = presetNow(s, body), empty = !R.handlers.length, own = confirmed(s, body);
  const chip = (id, name, icon, tip, on, hs = []) => `<button type="button" class="rt-pre${on ? ' on' : ''}" data-command="program ${esc(body)} preset ${esc(id)}" aria-pressed="${on}" title="${esc(`${tip}${hs.length ? ` ${hs.map((h) => `${whenLabel(h.when)} → ${skillName(s, h.do)}${takesPart(h.do) ? ` → ${TARGETS[h.target].label}` : ''}`).join('; ')}.` : ''}`)}">${glyph(icon)}<b>${esc(name)}</b>${hs.length ? pips(hs.reduce((n, h) => n + whenRam(h.when) + (isLong(s, h.do) ? 1 : 0), 0)) : ''}</button>`;
  const list = [chip('rotation', 'Rotation', 'cron', `No handlers: your ${programName(s)} rotation plays it.`, empty && own), ...presetsFor(s, body).map((p) => chip(p.id, p.name, p.icon, p.tip, p.id === now, p.handlers))].join('');
  const undo = R.undo ? `<button type="button" class="btn small rt-undo" data-command="program ${esc(body)} undo" title="Bring back the handlers you had before">↶ Undo</button>` : '';
  const mark = !empty && !now ? '<span class="rt-pre-own" title="Your own stack: a preset replaces it, and Undo brings it back">edited</span>' : '';
  const ok = own ? '' : `<button type="button" class="btn small rt-confirm" data-command="program ${esc(body)} confirm" title="${esc(`Make this routine yours as it stands. Until you do (or pick a preset, or change a handler), the rotation plays ${bodyName(body)} and nothing is left to you. Once it's yours, a part it doesn't cover shows ${EXCEPTION.label} · ${EXCEPTION.phrase}.`)}">Confirm</button>`;
  return `<div class="rt-presets" role="group" aria-label="Ready-made routines">${list}${mark}${undo}${ok}</div>`;
}
export function programMarkup(s) {
  if (!unlocked(s)) return lockedMarkup(s);
  const P = programsOf(s), body = focusBody(s), rows = handlerRows(s, body), budget = ramFor(s, body), used = ramUsed(s, body);
  const pal = palette(s, body), bar = barSkills(s);
  const whenOpts = [...pal.glob.filter((x) => x.open).map((x) => x.id), ...pal.muts.map((x) => x.id), ...pal.parts.flatMap((p) => p.chips.filter((c) => c.open).map((c) => c.id))].map((id) => [id, whenLabel(id)]);
  const doOpts = bar.map((x) => [x.id, `${x.key} ${skillName(s, x.id)}`]);
  const tgtOpts = Object.keys(TARGETS).map((id) => [id, TARGETS[id].label]);
  const ramBar = `<div class="rt-ram" title="${esc(`RAM: ${used} of ${budget} in use. Each virus's routine has its own. Your class level gives it: ${ROUTINES.ram[0]} at level 1, ${ROUTINES.ram[1]} at 50.`)}"><span class="rt-label">RAM</span>${ramCells(used, budget)}<b>${used}/${budget}</b></div>`;
  const list = rows.map((r) => {
    const h = r.h, x = bar.find((b) => b.id === h.do) || { id: h.do, key: '' };
    const state = !r.fits ? 'over' : !r.open ? 'shut' : !r.onBar ? 'shut' : '';
    const why = !r.fits ? 'Out of RAM: it sits out.' : !r.open ? 'Its WHEN chip needs research.' : !r.onBar ? 'Its skill is not on your bar.' : '';
    const noTgt = !takesPart(h.do);
    return `<li class="rt-h${state ? ' ' + state : ''}" data-rt-drop="row:${r.i}"${why ? ` title="${esc(why)}"` : ''}>
      <span class="rt-grip" draggable="true" data-rt-drag="row:${r.i}" title="Drag to reorder" aria-hidden="true">⋮⋮</span><span class="rt-n">${r.i + 1}</span>
      ${slot('when', r.i, whenChip(s, h.when, { drag: false, open: r.open }), whenOpts.some(([v]) => v === h.when) ? whenOpts : [[h.when, whenLabel(h.when)], ...whenOpts], h.when)}
      ${slot('do', r.i, doChip(s, x, { drag: false }), doOpts.some(([v]) => v === h.do) ? doOpts : [[h.do, skillName(s, h.do)], ...doOpts], h.do)}
      ${slot('target', r.i, noTgt ? '<span class="rt-chip rt-tgt none"><b>—</b></span>' : targetChip(h.target, { drag: false }), tgtOpts, h.target, noTgt)}
      <span class="rt-cost" title="${esc(`${r.ram} RAM`)}">${pips(r.ram, r.fits ? '' : 'over')}</span>
      <button type="button" class="rt-x" data-command="program ${esc(body)} remove ${r.i + 1}" aria-label="Remove handler ${r.i + 1}" title="Remove">×</button></li>`;
  }).join('');
  const rot = `<li class="rt-h rt-rot" title="${esc(`When no handler fits: your ${programName(s)} rotation, the priorities the balance bots play. It never fires a cooldown of ${ROUTINES.long} or more.`)}"><span class="rt-grip" aria-hidden="true"></span><span class="rt-n">⟳</span><span class="rt-chip rt-when rot">${glyph('cron')}<b>else</b></span><span class="rt-chip rt-do rot">${glyph('chain')}<b>${esc(programName(s))} rotation</b></span></li>`;
  const add = `<li class="rt-h rt-add" data-rt-drop="add"><button type="button" class="btn small" data-command="program ${esc(body)} add" ${used + 1 > budget ? `disabled title="Out of RAM"` : 'title="A new handler: every cycle, key 1, the soonest attacker. Drop chips on it."'}>+ Handler</button><span class="rt-drop-hint">${glyph('item')}</span></li>`;
  const stack = `<section class="card rt-stack"><div class="thead"><div><h2>${esc(programName(s))} program</h2><h1>${esc(bodyName(body))}</h1></div>
      <div class="settings-grid rt-power"><button type="button" class="btn small" data-command="program ${P.on ? 'off' : 'on'}" aria-pressed="${P.on}" title="${esc(P.on ? 'On: when the timer runs out, your program moves.' : 'Off: when the timer runs out, you repeat your last hit.')}">Program</button></div></div>
    ${ramBar}${presetRow(s, body)}
    <ol class="rt-list" aria-label="Handlers, checked top to bottom">${list}${add}${rot}</ol></section>`;
  // The chips you can drag in: yours, the fight's, then this virus's parts you've met with their chips by research tier.
  const partRow = (p) => `<li class="rt-prow"><span class="rt-pname" title="${esc(`${p.name}: research ${p.n}`)}">${glyph('part')}${esc(p.name)}</span><span class="rt-pchips">${p.chips.map((c) => whenChip(s, c.id, { open: c.open, short: true })).join('')}</span></li>`;
  const chips = `<section class="card rt-palette"><h2>Chips</h2>
    <div class="rt-group"><h3 class="rt-label">WHEN</h3><div class="rt-row">${pal.glob.filter((x) => x.open).map((x) => whenChip(s, x.id)).join('')}${pal.muts.map((x) => whenChip(s, x.id)).join('')}</div>
      ${pal.parts.length ? `<ul class="rt-parts">${pal.parts.map(partRow).join('')}</ul>` : `<p class="rt-empty" title="Fight it to research its parts. Each tier opens more chips.">${glyph('lock')}???</p>`}</div>
    <div class="rt-group"><h3 class="rt-label">DO</h3><div class="rt-row">${bar.map((x) => doChip(s, x)).join('')}</div></div>
    <div class="rt-group"><h3 class="rt-label">TARGET</h3><div class="rt-row">${Object.keys(TARGETS).map((id) => targetChip(id)).join('')}</div></div></section>`;
  const jo = P.rails.jackOut;
  const railsCard = `<section class="card rt-rails"><h2>Rails</h2>
    <div class="rt-rail"><span class="rt-label" title="On a run, crossing this Signal line jacks you out with your pack.">Auto jack-out</span><span class="rt-seg" role="group" aria-label="Auto jack-out">${ROUTINES.jackOut.map((v) => `<button type="button" class="btn small" data-command="program jackout ${v || 'off'}" aria-pressed="${jo === v}">${v ? v + '%' : 'Off'}</button>`).join('')}</span></div>
    <div class="rt-rail"><span class="rt-label" title="A walk stops before an elite, a boss, the Resident or a vault guard, and waits for you.">Stop before danger</span><span class="settings-grid"><button type="button" class="btn small" data-command="program danger ${P.rails.danger ? 'off' : 'on'}" aria-pressed="${P.rails.danger}">${glyph('ids')}Elites, bosses</button></span></div></section>`;
  return `<div class="rt-editor" data-rt-body="${esc(body)}">${virusList(s, body)}<div class="rt-main">${stack}</div><div class="rt-side">${chips}${railsCard}</div></div>`;
}

// ---------- the board ----------
const excLabel = `<strong>${EXCEPTION.label}</strong><span> · ${EXCEPTION.phrase}</span>`;
// In a Now cell, only the word (the full label sits on the part's tag line, the log and a boss fight's header).
const excMark = (cls, tip, k = '') => `<div class="intent prog ${cls}"${k} title="${esc(`${EXCEPTION.label} · ${EXCEPTION.phrase}. ${tip}`)}"><strong>${EXCEPTION.label}</strong></div>`;
// The program's next move, ghosted, in your row's Now cell; or, when all that's left is yours, that it's yours.
export function progNow(s) {
  if (!live(s) || !active(s) || s.encounter.queue) return null;
  const d = preview(s);
  if (!d) return null;
  if (d.hold) return excMark('mine exc', d.whole ? EXCEPTION.fight : `${EXCEPTION.tip} Nothing fires when the timer runs out.`, ` data-k="you@${s.encounter.cycle}"`);
  const by = d.handler >= 0 ? `handler ${d.handler + 1}` : 'rotation';
  return `<div class="intent mine prog ghost" data-k="you@${s.encounter.cycle}" data-at="${esc(d.target || '')}" title="${esc(`Your program's next move (${by}). Type anything to override it this cycle.`)}">⟳ ${esc(said(s, d.text))}</div>`;
}
// A boss, a lair's boss, a Resident or a crew boss: one mark on the fight's header, the whole fight is yours.
export function progFight(s) {
  if (!live(s) || !active(s) || !wholeFight(s)) return '';
  return `<span class="tag rt-exc-tag" title="${esc(EXCEPTION.fight)}">${excLabel}</span>`;
}
// The part the program will hit: its target (for the aim pip and the ghost on its row).
export function progTarget(s) {
  if (!live(s) || !active(s) || s.encounter.queue) return null;
  const d = preview(s);
  return d && !d.hold ? d.target || null : null;
}
export function progText(s) {
  const d = live(s) && active(s) && !s.encounter.queue ? preview(s) : null;
  return d && !d.hold ? '⟳ ' + said(s, d.text) : null;
}
// On a part's row: the ghosted command it's about to take, or the exception's mark (that part is yours to play).
export function progOnPart(s, p) {
  if (!live(s) || !active(s)) return '';
  const x = exceptionsOf(s).find((y) => y.part === p.id);
  if (x) return excMark('exc-mark', excTip(x));
  const d = s.encounter.queue ? null : preview(s);
  if (!d || d.hold || d.target !== p.id) return '';
  const [id] = d.text.split(' ');
  return `<div class="intent prog ghost-on" title="${esc(`Your program's next move: ${said(s, d.text)}.`)}">⟳ ${esc(skillName(s, id))}</div>`;
}
const excTip = (x) => (x.kind === 'tell' ? `${EXCEPTION.tip} Its ${x.tell} is on the board.` : EXCEPTION.tip);
// On a part's tag line (beside FALLBACK, SHIELDS …): the full label, when that part is yours to play.
export function progTag(s, p) {
  if (!live(s) || !active(s)) return '';
  const x = exceptionsOf(s).find((y) => y.part === p.id);
  return x ? `<span class="tag rt-exc-tag" title="${esc(excTip(x))}">${excLabel}</span>` : '';
}
export const progExc = (s, p) => !!live(s) && active(s) && exceptionsOf(s).some((x) => x.part === p.id);
