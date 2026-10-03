// Hit effects on the fight board: when a command lands, the shooter's avatar (the initials on the
// part's left rail, view.mjs) lunges at the part, and a band of their colour sweeps along its
// Integrity bar from the right (the way it drains) back toward them, and the avatar pulses as it
// arrives. A miss shakes the avatar;
// breaking an armor chit flashes it white.
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
  const add = (cls, style, text = '') => {
    const el = document.createElement('span');
    el.className = cls;
    Object.assign(el.style, style);
    el.textContent = text;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 700);
  };

  // row: the part's board row. who: 'you' or a crewmate's handle. kind: 'you' | 'crew'.
  // result: 'hit' | 'crit' | 'chit' | 'miss'.
  function strike(row, { who, initials, kind, result }) {
    if (!row?.isConnected || !canMove()) return;
    const f = frame(), name = row.querySelector('.bname'), bar = row.querySelector('.part-bar');
    if (!name) return;
    // From the shooter's own avatar in the rail if it's still there, else the rail's middle.
    const own = row.querySelector(`.aim[data-who="${CSS.escape(who)}"]`);
    const a = own ? local(f, own.getBoundingClientRect()) : null, n = local(f, name.getBoundingClientRect());
    const at = a ? { left: a.l + 'px', top: a.t + 'px' } : { left: n.l - 32 + 'px', top: n.t + n.h / 2 - 12 + 'px' };
    add(`fx-av ${kind} ${result}`, at, initials);
    if (bar && result !== 'miss') {
      const b = local(f, bar.getBoundingClientRect());
      add(`fx-sweep ${kind}${result === 'crit' ? ' crit' : ''}`, { left: b.l + 'px', top: b.t - 2 + 'px', width: b.w + 'px', height: b.h + 4 + 'px' });
      // The sweep reaches the avatar: it pulses, as if it took that chunk.
      setTimeout(() => add(`fx-av ${kind} catch`, at, initials), 330);
    }
  }
  return { strike };
}
