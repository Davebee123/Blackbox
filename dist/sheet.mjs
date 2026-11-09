// The one sheet (docs/phone-plan.md): a panel that comes up from the bottom at one of three heights, peek (a line and
// its main action), half and full. Drag it down or tap outside it to close; Escape closes it too. One at a time:
// opening another replaces it. Its buttons are ordinary data- commands; the page's click handlers run them.
// `through`: no scrim, and the page under it still takes taps (a map's card: a tap on the map picks another server
// or walks; the page's own handlers shut it).
export const HEIGHTS = ['peek', 'half', 'full'];

export function sheetMarkup(html, { height = 'peek', label = '', through = false } = {}) {
  const h = HEIGHTS.includes(height) ? height : 'peek';
  return `${through ? '' : '<div class="sh-scrim" data-sheet-close></div>'}<section class="sh-panel h-${h}" role="dialog" aria-modal="${!through}"${label ? ` aria-label="${label.replace(/"/g, '&quot;')}"` : ''}><div class="sh-grab" aria-hidden="true"><i></i></div><div class="sh-body">${html}</div></section>`;
}

let el = null, onClose = null, drag = null, key = null;
export const sheetOpen = () => !!el && !el.hidden;
export const sheetKey = () => (sheetOpen() ? key : null);

// Opens the sheet with html in it. `id` names what it shows (a second open of the same id is the caller's toggle).
// `closed(why)` runs once when it goes: why.replaced is true when another sheet took its place.
export function openSheet(html, { height = 'peek', label = '', id = null, closed = null, through = false } = {}) {
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
  if (sheetOpen() && onClose) { const f = onClose; onClose = null; f({ replaced: true, by: id }); }
  el.innerHTML = sheetMarkup(html, { height, label, through });
  el.classList.toggle('through', through);
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
  key = null;
  const f = onClose;
  onClose = null;
  f?.({ replaced: false }); // before it empties: what it borrowed from the page goes home first
  el.innerHTML = '';
}
