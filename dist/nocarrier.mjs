// Losing a fight, felt: the board holds a moment on the hit that took you out, then the monitor drops to static with
// NO CARRIER over it (the line a modem printed when the call dropped). Under the static the screen swaps to the map,
// and the static clears onto the Disconnected card (app.js lossCard). A click or a key skips to the card.
// No canvas: a CSS layer over the screen (nocarrier.css), gone before the card shows. With motion off the static
// is one still frame, held shorter.

// When each beat comes, in ms from the hit that took you out.
export const NC = {
  hold: 800, // the board, still, on the last hit
  swap: 2000, // the page under the static becomes the map
  clear: 2500, // the static starts to clear
  done: 2850, // the static is gone: the card shows
  still: { hold: 500, swap: 900, clear: 1200, done: 1300 }, // motion off
};

export function noCarrier(host, { where = '', motion = true, onSwap = () => {}, onDone = () => {} } = {}) {
  const t = motion ? NC : NC.still, timers = [];
  let el = null, swapped = false, finished = false;
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const swap = () => { if (!swapped) { swapped = true; onSwap(); } };
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    removeEventListener('pointerdown', skip, true); removeEventListener('keydown', skip, true);
    swap(); el?.remove(); onDone();
  };
  const clear = () => { swap(); el?.classList.add('nc-out'); at(t.done - t.clear, finish); };
  // Skipping: once the static is up, a click or a key goes straight to the card (it doesn't reach the page).
  function skip(e) { if (!el) return; e.preventDefault(); e.stopPropagation(); timers.forEach(clearTimeout); timers.length = 0; clear(); }
  at(t.hold, () => {
    el = document.createElement('div');
    el.className = `nocarrier${motion ? '' : ' still'}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<i class="nc-noise" aria-hidden="true"></i><i class="nc-roll" aria-hidden="true"></i><div class="nc-msg"><b>NO CARRIER</b>${where ? `<small>${where.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)}</small>` : ''}</div>`;
    host.append(el);
    addEventListener('pointerdown', skip, true); addEventListener('keydown', skip, true);
  });
  at(t.swap, swap);
  at(t.clear, clear);
  return { skip: finish };
}
