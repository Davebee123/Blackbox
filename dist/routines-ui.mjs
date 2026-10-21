// The Program tab's hands (routines-view.mjs draws it): drag a chip onto a handler's slot, drag a handler by its grip
// to reorder, or use the dropdown on each chip (a phone's way). Each command names the virus whose routine is open
// (the editor's data-rt-body). Every change is a program command, so the terminal,
// the buttons and the drops all go through one place (routines.mjs programCommand).
//   run(text)     app.js's command runner
//   openProgram() app.js: the Loadout page on its Program tab (the Codex's "+ handler": its command picks the part's virus)
export function wireRoutines({ run, openProgram }) {
  const zone = (el) => el?.closest?.('[data-rt-drop]');
  const fits = (what, z) => {
    const [kind] = what.split(':'), [zk] = z.dataset.rtDrop.split(':');
    if (kind === 'row') return zk !== 'add';
    return zk === 'add' || zk === 'row' || zk === kind;
  };
  const rowOf = (z) => Number(z.closest('[data-rt-drop^="row:"]')?.dataset.rtDrop.split(':')[1] ?? z.dataset.rtDrop.split(':')[1]);
  const prog = (el) => `program ${el.closest?.('[data-rt-body]')?.dataset.rtBody || ''}`.trim();
  let dragging = null;
  document.addEventListener('dragstart', (e) => {
    const d = e.target.closest?.('[data-rt-drag]');
    if (!d) return;
    dragging = d.dataset.rtDrag;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragging);
    d.classList.add('rt-dragging');
    document.body.classList.add('rt-drag-' + dragging.split(':')[0]);
  });
  document.addEventListener('dragend', (e) => {
    e.target.closest?.('[data-rt-drag]')?.classList.remove('rt-dragging');
    for (const k of ['when', 'do', 'target', 'row']) document.body.classList.remove('rt-drag-' + k);
    for (const z of document.querySelectorAll('.rt-over')) z.classList.remove('rt-over');
    dragging = null;
  });
  document.addEventListener('dragover', (e) => {
    const z = zone(e.target);
    if (!z || !dragging || !fits(dragging, z)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    for (const x of document.querySelectorAll('.rt-over')) if (x !== z) x.classList.remove('rt-over');
    z.classList.add('rt-over');
  });
  document.addEventListener('dragleave', (e) => { const z = zone(e.target); if (z && !z.contains(e.relatedTarget)) z.classList.remove('rt-over'); });
  document.addEventListener('drop', (e) => {
    const z = zone(e.target), what = dragging || e.dataTransfer.getData('text/plain');
    if (!z || !what || !fits(what, z)) return;
    e.preventDefault();
    z.classList.remove('rt-over');
    const [kind, ...rest] = what.split(':'), id = rest.join(':'), [zk] = z.dataset.rtDrop.split(':');
    const p = prog(z);
    if (kind === 'row') { const to = rowOf(z); if (Number(id) !== to) run(`${p} move ${Number(id) + 1} ${to + 1}`); return; }
    if (zk === 'add') return run(kind === 'when' ? `${p} add ${id}` : kind === 'do' ? `${p} add always ${id}` : `${p} add always spike ${id}`);
    run(`${p} set ${rowOf(z) + 1} ${kind} ${id}`);
  });
  document.addEventListener('change', (e) => {
    const sel = e.target.closest?.('select[data-rt-set]');
    if (sel) run(`${prog(sel)} set ${sel.dataset.rtSet} ${sel.value}`);
  });
  document.addEventListener('click', (e) => {
    const g = e.target.closest?.('[data-rt-goto]');
    if (!g) return;
    run(g.dataset.rtGoto);
    openProgram();
  });
}
