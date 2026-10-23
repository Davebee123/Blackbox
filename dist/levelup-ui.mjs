// The level-up on the page (levelup-view.mjs has the markup): when it comes up, where it sits, how long it stays and
// its sounds (existing ones only: the level's win, a cycle tick per [ OK ] line). app.js makes one, pushes each
// level-up event to it, calls tick() every frame and dismiss() on Enter or Esc.
//   A level-up never comes up during a fight or over a card that waits for you (calm()): it waits, and comes up at the
//   next calm moment (after a won fight, once you have left it). A fight that starts while it is up sends it away.
//   Nothing goes over the fight board: the host (#levelup) sits outside the fight view, under the top bar (docked over
//   the prompt on a phone), and only ever while no fight is up.
import { levelUpSummary, firmwareMarkup } from './levelup-view.mjs';

const STAY = 12000; // how long it stays up once the flash is done (Continue, Enter, Esc or × close it sooner)
const FLASH = 900, STEP = 120; // the progress line's run, then one [ OK ] line every STEP ms
export function createLevelUpUi({ calm, fighting, feel, keys = () => [], motion = () => true }) {
  const host = document.getElementById('levelup');
  let queue = [], up = null, timer = 0, sounds = [];
  const clear = () => { clearTimeout(timer); sounds.forEach(clearTimeout); sounds = []; };
  // Where it sits: under the top bar; on a phone, docked over the prompt's box.
  function place() {
    const form = document.getElementById('command-form')?.getBoundingClientRect(), bar = document.querySelector('.topbar')?.getBoundingClientRect();
    // It zooms with the screen (uiscale.mjs, --ui): its top and bottom are in its own zoomed px.
    const z = parseFloat(document.documentElement?.style?.getPropertyValue?.('--ui')) || 1; // app.js sets it on the page
    const set = (k, v) => host.style.setProperty(k, Math.round(v / z) + 'px');
    if (form && form.width) set('--lu-bottom', innerHeight - form.top + 8);
    if (bar) set('--lu-top', bar.bottom + 10);
  }
  function hide(now = false) {
    clear();
    if (!up) return;
    up = null;
    if (now || !motion()) { host.hidden = true; host.innerHTML = ''; return; }
    host.classList.add('out');
    timer = setTimeout(() => { host.hidden = true; host.innerHTML = ''; host.classList.remove('out'); }, 400);
  }
  const stay = (ms) => { clearTimeout(timer); timer = setTimeout(() => hide(), ms); };
  function play() {
    const sum = levelUpSummary(queue, keys());
    queue = [];
    if (!sum) return;
    clear();
    host.className = `levelup lu-b${sum.preview ? ' preview' : ''}`;
    host.innerHTML = firmwareMarkup(sum);
    place();
    host.hidden = false;
    void host.offsetWidth; host.classList.add('show');
    up = { sum };
    feel.add('win', null);
    const n = sum.items.length;
    if (motion()) for (let i = 0; i < n; i++) sounds.push(setTimeout(() => up && feel.add('cycle', null), FLASH + (i + 1) * STEP));
    stay(STAY + (motion() ? FLASH + n * STEP : 0));
  }
  // Reading it holds it up; leaving it lets it go a little later.
  host?.addEventListener('pointerenter', () => { if (up) clearTimeout(timer); });
  host?.addEventListener('pointerleave', () => { if (up) stay(3000); });
  host?.addEventListener('click', (e) => { if (e.target.closest('[data-lu-close], [data-module]')) hide(); });
  addEventListener('resize', () => { if (up) place(); });
  return {
    push(e) { if (e) queue.push(e); },
    // Every frame: up at the next calm moment, away when a fight comes up.
    tick() {
      if (up && fighting()) hide(true);
      else if (!up && queue.length && calm()) play();
    },
    // Enter on an empty line or Esc: true when it took one away.
    dismiss() { if (!up) return false; hide(); return true; },
    showing: () => !!up,
    reset() { queue = []; hide(true); },
    pending: () => queue.length,
  };
}
