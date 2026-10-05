// Hit effects on the fight board: when a command lands, it lands on the part itself: its cell
// flashes and jolts, and a burst of 1s and 0s flies out (amber, a crewmate's violet). A crit bursts
// bigger in gold-white; a broken armor chit throws white bits; a miss shakes it. (How much is the
// number and the bar: app.js.)
//
// The effects live on a layer beside #board, not in it: the board redraws every step of a cycle,
// which would cut them short. Points are measured from the DOM and divided by the screen's scale,
// so the monitor casing's transform doesn't throw them off. Look only.
export function createHitFx(board, { canMove = () => true } = {}) {
  const layer = document.createElement('div');
  layer.id = 'hitfx';
  layer.setAttribute('aria-hidden', 'true');
  board.parentElement.appendChild(layer);

  function frame() {
    const scale = board.getBoundingClientRect().width / (board.offsetWidth || 1) || 1;
    Object.assign(layer.style, { left: board.offsetLeft + 'px', top: board.offsetTop + 'px', width: board.offsetWidth + 'px', height: board.offsetHeight + 'px' });
    return { box: layer.getBoundingClientRect(), scale }; // measured from the layer itself, wherever it landed
  }
  const local = (f, r) => ({ l: (r.left - f.box.left) / f.scale, t: (r.top - f.box.top) / f.scale, w: r.width / f.scale, h: r.height / f.scale });
  const add = (cls, style, html = '', ms = 700) => {
    const el = document.createElement('span');
    el.className = cls;
    for (const [k, v] of Object.entries(style)) if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
    el.innerHTML = html;
    layer.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };

  // row: the part's board row. who: 'you' or a crewmate's handle. kind: 'you' | 'crew'.
  // result: 'hit' | 'crit' | 'chit' | 'miss'.
  // The strike lands on the part itself: its cell flashes and jolts, and a burst of 1s and 0s
  // flies out of it (in your colour, a crewmate's in violet; a crit: more, bigger, gold-white).
  // A broken chit throws a few white bits; a miss only shakes it.
  const BITS = { hit: 16, crit: 28, chit: 8, miss: 0 };
  function strike(row, { kind, result }) {
    if (!row?.isConnected || !canMove()) return;
    const f = frame(), name = row.querySelector('.bname');
    if (!name) return;
    const n = local(f, name.getBoundingClientRect());
    add(`fx-smash ${kind} ${result}`, { left: n.l + 'px', top: n.t + 'px', width: n.w + 'px', height: n.h + 'px' }, '', 600);
    const cx = n.l + n.w * 0.4, cy = n.t + n.h / 2, reach = result === 'crit' ? 120 : 85;
    for (let i = 0; i < BITS[result]; i++) {
      const a = Math.random() * Math.PI * 2, d = reach * (0.35 + Math.random() * 0.65);
      add(`fx-bit ${kind} ${result}`, {
        left: cx + (Math.random() - 0.5) * n.w * 0.3 + 'px', top: cy + 'px',
        '--tx': Math.cos(a) * d + 'px', '--ty': Math.sin(a) * d * 0.7 + 'px',
        '--r': (Math.random() - 0.5) * 120 + 'deg', '--s': (0.7 + Math.random() * 0.6).toFixed(2),
        '--d': (0.45 + Math.random() * 0.35).toFixed(2) + 's',
      }, Math.random() < 0.5 ? '0' : '1', 900);
    }
    name.classList.remove('fx-jolt', 'crit', 'miss'); void name.offsetWidth;
    name.classList.add('fx-jolt'); if (result === 'crit' || result === 'miss') name.classList.add(result);
    setTimeout(() => name.classList.remove('fx-jolt', 'crit', 'miss'), 500);
  }
  return { strike };
}
