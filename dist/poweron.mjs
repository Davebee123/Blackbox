// The power-up: the monitor comes on (a line of light opens into the screen), the mark rises behind its
// square, the name settles, and the screen waits for a key. The first key (or tap) while it's still
// coming on finishes it; the next one starts. Then the login (first launch) or the boot lines follow.
//
// powerOn({ sound, reducedMotion }) → Promise that resolves when the player starts.

export function powerOn({ sound = () => {}, reducedMotion = () => false } = {}) {
  const still = reducedMotion();
  const tap = matchMedia('(pointer: coarse)').matches;
  const el = document.createElement('div');
  el.className = `poweron${still ? ' still' : ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'BLACKBOX');
  el.innerHTML = `<div class="po-flash" aria-hidden="true"></div>
    <div class="po-stage">
      <span class="bb-logo po-logo" aria-hidden="true"></span>
      <h1 class="po-word">BLACKBOX</h1>
      <p class="po-sub">Model 7 · BLACKBOX/OS 0.9.4</p>
      <p class="po-press">${tap ? 'Tap to start' : 'Press any key to start'}</p>
    </div>`;
  document.body.appendChild(el);
  return new Promise((resolve) => {
    let ready = still;
    const settle = setTimeout(() => { ready = true; el.classList.add('ready'); }, still ? 0 : 2600);
    if (still) el.classList.add('ready');
    const go = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (!ready) { ready = true; clearTimeout(settle); el.classList.add('ready', 'skip'); return; }
      removeEventListener('keydown', go, true);
      removeEventListener('pointerdown', go, true);
      sound('jackin'); // the first key is also what lets the page play sound
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, still ? 0 : 520);
    };
    addEventListener('keydown', go, true);
    addEventListener('pointerdown', go, true);
  });
}
