// The power-up (the Horizon): the monitor comes on (a line of light opens into the screen), a horizon of
// light spreads across it, the black box stands on it, the name settles low on the screen, and the screen waits for a
// key. While the game warms up (warm.mjs) the box's outline draws itself round, clockwise from its top left (the
// *Trace*); once it closes, the box's light leaks out round the edges and the prompt follows. The first key (or tap)
// while it's still coming on lands the picture at once; the prompt still waits for the outline. The next key starts.
// A warm-up that runs long never holds the prompt past WAIT_MAX: the outline closes and the rest goes on behind.
// Then the login (first launch) or the boot lines follow.
//
// powerOn({ sound, reducedMotion, warm }) → Promise that resolves when the player starts. warm(progress) → Promise:
// the warm-ups, reporting 0-1 as they go (none: the outline closes at once).

export const WAIT_MAX = 6000; // ms from power-on that the prompt can wait for the warm-ups
const SETTLE = 2600; // ms the Horizon takes to come on
const BOX_AT = 1100, GLOW_AT = 1500; // ms: the box shows (the outline draws from then), its light leaks out (no earlier)
const LEAK = 1000; // ms from the light leaking out to the prompt
const EDGE_MS = 160; // ms for the outline to draw one whole side

export function powerOn({ sound = () => {}, reducedMotion = () => false, warm = null } = {}) {
  const still = reducedMotion();
  const tap = matchMedia('(pointer: coarse)').matches;
  const el = document.createElement('div');
  el.className = `poweron loading${still ? ' still' : ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'BLACKBOX');
  el.innerHTML = `<div class="po-flash" aria-hidden="true"></div>
    <div class="po-stage">
      <div class="po-haze" aria-hidden="true"></div>
      <div class="po-horizon" aria-hidden="true"></div>
      <div class="po-box" aria-hidden="true"><b></b><i class="po-edge t"></i><i class="po-edge r"></i><i class="po-edge b"></i><i class="po-edge l"></i></div>
      <h1 class="po-word">BLACKBOX</h1>
      <p class="po-sub">Model 7 · OS 0.9.4</p>
      <p class="po-press">${tap ? 'Tap to start' : 'Press any key'}</p>
    </div>`;
  document.body.appendChild(el);
  const t0 = performance.now();
  // The outline: each side's share of the progress, drawn in order (a side waits for the one before it).
  const edges = [...el.querySelectorAll('.po-edge')], fill = [0, 0, 0, 0];
  let drawn = 0; // when the outline's last scheduled stroke ends (performance.now())
  const trace = (p) => {
    const now = performance.now();
    let at = Math.max(now, drawn, still ? now : t0 + BOX_AT); // a side starts once the one before it ends, and not before the box shows
    edges.forEach((e, i) => {
      const f = Math.min(1, Math.max(0, p * 4 - i));
      if (f <= fill[i]) return;
      const ms = still ? 0 : Math.round((f - fill[i]) * EDGE_MS);
      e.style.transition = still ? 'none' : `transform ${ms}ms linear ${Math.round(at - now)}ms`;
      e.style.transform = i % 2 ? `scaleY(${f})` : `scaleX(${f})`;
      fill[i] = f; at += ms; drawn = at;
    });
    return Math.max(0, drawn - now);
  };
  return new Promise((resolve) => {
    let settled = still, lit = false, ready = false, closing = false, leak = 0;
    const tryReady = () => { if (!ready && settled && lit) { ready = true; el.classList.add('ready'); } };
    const settle = setTimeout(() => { settled = true; tryReady(); }, still ? 0 : SETTLE);
    const lightUp = () => { clearTimeout(leak); lit = true; tryReady(); };
    // The outline closes (the warm-ups are done, or WAIT_MAX passed); then the light leaks out and the prompt follows.
    const close = () => {
      if (closing) return;
      closing = true; clearTimeout(cap);
      const drawing = trace(1);
      setTimeout(() => {
        const glow = still || el.classList.contains('skip') ? 0 : Math.max(0, GLOW_AT - (performance.now() - t0));
        el.style.setProperty('--glow-at', `${glow}ms`);
        el.classList.replace('loading', 'loaded');
        if (still || el.classList.contains('skip')) lightUp(); else leak = setTimeout(lightUp, glow + LEAK);
      }, drawing);
    };
    const cap = setTimeout(close, WAIT_MAX);
    if (warm) Promise.resolve().then(() => warm((p) => { if (!closing) trace(p); })).catch(() => {}).then(close);
    else close();
    const go = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (!ready) { el.classList.add('skip'); clearTimeout(settle); settled = true; if (el.classList.contains('loaded')) lightUp(); return; } // the picture lands; the prompt waits for the outline
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
