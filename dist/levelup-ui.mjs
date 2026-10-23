// The level-up prototypes on the page (levelup-view.mjs has the markup): when one comes up, where it sits, how long
// it stays, its sounds (existing ones only: the level's win, a cycle tick per line), and the casing's plate and lamps.
// app.js makes one, pushes each level-up event to it, calls tick() every frame and dismiss() on Enter or Esc.
//   A level-up never comes up during a fight or over a card that waits for you (calm()): it waits, as the banner does
//   after a won fight, and comes up at the next calm moment. A fight that starts while one is up sends it away.
//   Nothing goes over the fight board: the host (#lu-proto) sits outside the fight view, docked to the prompt (a, c)
//   or under the top bar (b), and only ever while no fight is up.
import { levelUpSummary, broadcastMarkup, firmwareMarkup, cornerMarkup, plateMarkup } from './levelup-view.mjs';

const STAY = { a: 11000, b: 12000, c: 9000 }; // how long each stays up once it has played in
export function createLevelUpUi({ style, calm, fighting, feel, who = () => 'rookie', keys = () => [], level = () => 1, motion = () => true }) {
  const host = document.getElementById('lu-proto'), plate = document.getElementById('lv-plate'), lamps = document.querySelector('#casing .lamps');
  let queue = [], up = null, timer = 0, sounds = [], rolling = 0;
  const clear = () => { clearTimeout(timer); sounds.forEach(clearTimeout); sounds = []; };
  // Where it sits: docked to the prompt's box (a above its left end, c above its right end, clear of a notice), or
  // under the top bar (b; on a phone b docks over the prompt too).
  function place(st) {
    const form = document.getElementById('command-form')?.getBoundingClientRect(), bar = document.querySelector('.topbar')?.getBoundingClientRect();
    const phone = matchMedia('(max-width: 900px)').matches, set = (k, v) => host.style.setProperty(k, Math.round(v) + 'px');
    if (form && form.width) { set('--lu-left', form.left); set('--lu-right', innerWidth - form.right); set('--lu-bottom', innerHeight - form.top + (st === 'c' && !phone ? 44 : 8)); }
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
  // The casing (c): the lamps chase in your colour, the plate rolls from the old level to the new one.
  function casingMoment(sum) {
    if (!plate) return;
    plate.innerHTML = plateMarkup(sum.from, sum.level);
    plate.classList.remove('roll'); lamps?.classList.remove('lu-chase'); void plate.offsetWidth;
    if (motion()) { plate.classList.add('roll'); lamps?.classList.add('lu-chase'); }
    clearTimeout(rolling);
    rolling = setTimeout(() => { rolling = 0; plate.classList.remove('roll'); lamps?.classList.remove('lu-chase'); syncPlate(true); }, 1900);
  }
  function syncPlate(force = false) {
    if (!plate) return;
    const on = style() === 'c';
    plate.hidden = !on;
    if (!on || rolling) return;
    const n = String(level());
    if (force || plate.dataset.n !== n) { plate.dataset.n = n; plate.innerHTML = `<small>LV</small><b class="lv-roll"><span class="lv-new">${n}</span></b>`; }
  }
  function play() {
    const st = style(), sum = levelUpSummary(queue, keys());
    queue = [];
    if (!sum || st === 'current') return;
    clear();
    const time = new Date().toTimeString().slice(0, 5);
    host.className = `lu-proto lu-${st}${sum.preview ? ' preview' : ''}`;
    host.innerHTML = st === 'a' ? broadcastMarkup(sum, { who: who(), time }) : st === 'b' ? firmwareMarkup(sum) : cornerMarkup(sum);
    place(st);
    host.hidden = false;
    void host.offsetWidth; host.classList.add('show');
    up = { st, sum };
    feel.add('win', null);
    // A tick per line as it lands: a's lines type in one after another, b's [ OK ] lines follow the flash.
    const n = sum.items.length, step = st === 'a' ? 140 : 120, from = st === 'a' ? 140 : st === 'b' ? 900 : 0;
    if (st !== 'c' && motion()) for (let i = 0; i < n; i++) sounds.push(setTimeout(() => up && feel.add('cycle', null), from + (i + 1) * step));
    if (st === 'c') casingMoment(sum);
    stay(STAY[st] + (motion() ? from + n * step : 0));
  }
  // Reading it holds it up; leaving it lets it go a little later.
  host?.addEventListener('pointerenter', () => { if (up) clearTimeout(timer); });
  host?.addEventListener('pointerleave', () => { if (up) stay(3000); });
  host?.addEventListener('click', (e) => { if (e.target.closest('[data-lu-close], [data-module]')) hide(); });
  addEventListener('resize', () => { if (up) place(up.st); });
  return {
    push(e) { if (e) queue.push(e); },
    // Every frame: up at the next calm moment, away when a fight comes up, and the casing's plate kept to your level.
    tick() {
      if (up && fighting()) hide(true);
      else if (!up && queue.length && calm()) play();
      syncPlate();
    },
    // Enter on an empty line or Esc: true when it took one away.
    dismiss() { if (!up) return false; hide(); return true; },
    showing: () => !!up,
    reset() { queue = []; hide(true); },
    pending: () => queue.length,
  };
}
