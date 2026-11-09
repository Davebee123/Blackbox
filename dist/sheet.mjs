// The one sheet (docs/phone-plan.md): a panel that comes up from the bottom at one of three heights, peek (a line and
// its main action), half and full. Drag it down or tap outside it to close; Escape closes it too. One at a time:
// opening another replaces it. Its buttons are ordinary data- commands; the page's click handlers run them.
export const HEIGHTS = ['peek', 'half', 'full'];

export function sheetMarkup(html, { height = 'peek', label = '' } = {}) {
  const h = HEIGHTS.includes(height) ? height : 'peek';
  return `<div class="sh-scrim" data-sheet-close></div><section class="sh-panel h-${h}" role="dialog" aria-modal="true"${label ? ` aria-label="${label.replace(/"/g, '&quot;')}"` : ''}><div class="sh-grab" aria-hidden="true"><i></i></div><div class="sh-body">${html}</div></section>`;
}

let el = null, onClose = null, drag = null, key = null;
export const sheetOpen = () => !!el && !el.hidden;
export const sheetKey = () => (sheetOpen() ? key : null);

// Opens the sheet with html in it. `id` names what it shows (a second open of the same id is the caller's toggle).
export function openSheet(html, { height = 'peek', label = '', id = null, closed = null } = {}) {
  if (!el) {
    el = document.createElement('div');
    el.id = 'sheet';
    el.className = 'sheet-root';
    document.body.append(el);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-close]')) closeSheet(); });
    // Drag down from the grab bar or the sheet's top to close it; a short drag springs back.
    el.addEventListener('pointerdown', (e) => {
      const p = e.target.closest('.sh-panel');
      if (!p || !(e.target.closest('.sh-grab') || p.querySelector('.sh-body').scrollTop <= 0 && e.clientY - p.getBoundingClientRect().top < 56)) return;
      drag = { y: e.clientY, p, id: e.pointerId, dy: 0 };
    });
    addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dy = Math.max(0, e.clientY - drag.y);
      drag.p.style.transform = drag.dy ? `translateY(${drag.dy}px)` : '';
    });
    const end = () => {
      if (!drag) return;
      const { p, dy } = drag;
      drag = null;
      if (dy > Math.min(120, p.offsetHeight / 3)) closeSheet(); else p.style.transform = '';
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen()) closeSheet(); });
  }
  if (sheetOpen() && onClose) { const f = onClose; onClose = null; f(); }
  el.innerHTML = sheetMarkup(html, { height, label });
  el.hidden = false;
  key = id;
  onClose = closed;
  return el.querySelector('.sh-body');
}

// The body of the open sheet, to redraw in place (null when shut).
export const sheetBody = () => (sheetOpen() ? el.querySelector('.sh-body') : null);

export function closeSheet() {
  if (!el || el.hidden) return;
  el.hidden = true;
  el.innerHTML = '';
  key = null;
  const f = onClose;
  onClose = null;
  f?.();
}
