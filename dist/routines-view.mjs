// Routines on screen (routines.mjs is the model): the Loadout's Program tab (the handler stack, the chips, the rails)
// and the program's marks on the fight board (its next move ghosted on the part it will hit, an exception's mark and
// its hand-back button). Show it, don't explain it (docs/style-guide.md 0): chips with icons, RAM as pips, the rules
// in tooltips. app.js wires the drag and drop (routines-ui.mjs).
import { glyph } from './glyphs.mjs';
import { ABILITIES } from './data.mjs';
import { said, active } from './combat.mjs';
import { ROUTINES, TARGETS, programsOf, programOf, programName, handlerRows, ramFor, ramUsed, barSkills, palette, whenLabel, whenTip, whenIcon, whenRam, isLong, parseWhen, refName, live, preview, exceptionsOf } from './routines.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pips = (n, cls = '') => `<span class="rt-pips${cls ? ' ' + cls : ''}" aria-label="${n} RAM">${Array.from({ length: n }, () => '<i></i>').join('')}</span>`;
const takesPart = (id) => !['none', 'aggro'].includes(ABILITIES[id]?.target);
const skillName = (s, id) => (id === 'spike' ? said(s, 'spike').replace(/^./, (c) => c.toUpperCase()) : ABILITIES[id]?.name || id);
const verbOf = (id) => ABILITIES[id]?.verb || 'hit';

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

// ---------- the Program tab ----------
export function programMarkup(s) {
  const P = programsOf(s), prog = programOf(s), rows = handlerRows(s, prog), budget = ramFor(s), used = ramUsed(s, prog);
  const pal = palette(s), bar = barSkills(s);
  const whenOpts = [...pal.glob.filter((x) => x.open).map((x) => x.id), ...pal.muts.map((x) => x.id), ...pal.parts.flatMap((p) => p.chips.filter((c) => c.open).map((c) => c.id))].map((id) => [id, whenLabel(id)]);
  const doOpts = bar.map((x) => [x.id, `${x.key} ${skillName(s, x.id)}`]);
  const tgtOpts = Object.keys(TARGETS).map((id) => [id, TARGETS[id].label]);
  const ramBar = `<div class="rt-ram" title="${esc(`RAM: ${used} of ${budget} in use. Your class level gives it: ${ROUTINES.ram[0]} at level 1, ${ROUTINES.ram[1]} at 50.`)}"><span class="rt-label">RAM</span><span class="rt-cells">${Array.from({ length: budget }, (_, k) => `<i class="${k < used ? 'on' : ''}"></i>`).join('')}</span><b>${used}/${budget}</b></div>`;
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
      <button type="button" class="rt-x" data-command="program remove ${r.i + 1}" aria-label="Remove handler ${r.i + 1}" title="Remove">×</button></li>`;
  }).join('');
  const rot = `<li class="rt-h rt-rot" title="${esc(`When no handler fits: your ${programName(s)} rotation, the priorities the balance bots play. It never fires a cooldown of ${ROUTINES.long} or more.`)}"><span class="rt-grip" aria-hidden="true"></span><span class="rt-n">⟳</span><span class="rt-chip rt-when rot">${glyph('cron')}<b>else</b></span><span class="rt-chip rt-do rot">${glyph('chain')}<b>${esc(programName(s))} rotation</b></span></li>`;
  const add = `<li class="rt-h rt-add" data-rt-drop="add"><button type="button" class="btn small" data-command="program add" ${used + 1 > budget ? `disabled title="Out of RAM"` : 'title="A new handler: every cycle, key 1, the soonest attacker. Drop chips on it."'}>+ Handler</button><span class="rt-drop-hint">${glyph('item')}</span></li>`;
  const stack = `<section class="card rt-stack"><div class="thead"><div><h2>Program</h2><h1>${esc(programName(s))}</h1></div>
      <div class="settings-grid rt-power"><button type="button" class="btn small" data-command="program ${P.on ? 'off' : 'on'}" aria-pressed="${P.on}" title="${esc(P.on ? 'On: when the timer runs out, your program moves.' : 'Off: when the timer runs out, you repeat your last hit.')}">Program</button></div></div>
    ${ramBar}
    <ol class="rt-list" aria-label="Handlers, checked top to bottom">${list}${add}${rot}</ol></section>`;
  // The chips you can drag in: yours, the fight's, then each part you've met with its chips by research tier.
  const partRow = (p) => `<li class="rt-prow"><span class="rt-pname" title="${esc(`${p.name}: research ${p.n}`)}">${glyph('part')}${esc(p.name)}<small>${esc(p.body)}</small></span><span class="rt-pchips">${p.chips.map((c) => whenChip(s, c.id, { open: c.open, short: true })).join('')}</span></li>`;
  const chips = `<section class="card rt-palette"><h2>Chips</h2>
    <div class="rt-group"><h3 class="rt-label">WHEN</h3><div class="rt-row">${pal.glob.filter((x) => x.open).map((x) => whenChip(s, x.id)).join('')}${pal.muts.map((x) => whenChip(s, x.id)).join('')}</div>
      ${pal.parts.length ? `<ul class="rt-parts">${pal.parts.map(partRow).join('')}</ul>` : `<p class="rt-empty" title="Fight viruses to research their parts. Each tier opens more chips.">${glyph('lock')}???</p>`}</div>
    <div class="rt-group"><h3 class="rt-label">DO</h3><div class="rt-row">${bar.map((x) => doChip(s, x)).join('')}</div></div>
    <div class="rt-group"><h3 class="rt-label">TARGET</h3><div class="rt-row">${Object.keys(TARGETS).map((id) => targetChip(id)).join('')}</div></div></section>`;
  const jo = P.rails.jackOut;
  const railsCard = `<section class="card rt-rails"><h2>Rails</h2>
    <div class="rt-rail"><span class="rt-label" title="On a run, crossing this Signal line jacks you out with your pack.">Auto jack-out</span><span class="rt-seg" role="group" aria-label="Auto jack-out">${ROUTINES.jackOut.map((v) => `<button type="button" class="btn small" data-command="program jackout ${v || 'off'}" aria-pressed="${jo === v}">${v ? v + '%' : 'Off'}</button>`).join('')}</span></div>
    <div class="rt-rail"><span class="rt-label" title="A walk stops before an elite, a boss, the Resident or a vault guard, and waits for you.">Stop before danger</span><span class="settings-grid"><button type="button" class="btn small" data-command="program danger ${P.rails.danger ? 'off' : 'on'}" aria-pressed="${P.rails.danger}">${glyph('ids')}Elites, bosses</button></span></div></section>`;
  return `<div class="rt-editor"><div class="rt-side">${stack}${railsCard}</div>${chips}</div>`;
}

// ---------- the board ----------
// The program's next move, ghosted, in your row's Now cell; or the exception, with its hand-back button.
export function progNow(s) {
  if (!live(s) || !active(s) || s.encounter.queue) return null;
  const d = preview(s);
  if (!d) return null;
  if (d.hold) return `<div class="intent mine prog exc" data-k="you@${s.encounter.cycle}" title="${esc(`Exception: ${d.exceptions.map((x) => x.name).join(', ')}. Your program holds. Type a command, or hand control back.`)}"><b>EXCEPTION</b></div>`;
  const by = d.handler >= 0 ? `handler ${d.handler + 1}` : 'rotation';
  return `<div class="intent mine prog ghost" data-k="you@${s.encounter.cycle}" data-at="${esc(d.target || '')}" title="${esc(`Your program's next move (${by}). Type anything to override it this cycle.`)}">⟳ ${esc(said(s, d.text))}</div>`;
}
// Under your name while an exception holds the program: the key that hands control back.
export function progBack(s) {
  if (!live(s) || !active(s) || !exceptionsOf(s).length) return '';
  return `<button type="button" class="rt-back" data-command="program resume" title="Hand control back to your program for what's on the board now"><kbd>${esc(ROUTINES.key)}</kbd>⟳ back</button>`;
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
// On a part's row: the ghosted command it's about to take, or the exception's mark.
export function progOnPart(s, p) {
  if (!live(s) || !active(s)) return '';
  const xs = exceptionsOf(s).filter((x) => x.part === p.id);
  if (xs.length) return `<div class="intent prog exc-mark" title="${esc(`Exception: ${xs.map((x) => x.name).join(', ')}. Your program has no handler for it. Play it by hand.`)}">!</div>`;
  const d = s.encounter.queue ? null : preview(s);
  if (!d || d.hold || d.target !== p.id) return '';
  const [id] = d.text.split(' ');
  return `<div class="intent prog ghost-on" title="${esc(`Your program's next move: ${said(s, d.text)}.`)}">⟳ ${esc(skillName(s, id))}</div>`;
}
export const progExc = (s, p) => !!live(s) && active(s) && exceptionsOf(s).some((x) => x.part === p.id);
