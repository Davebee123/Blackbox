// Hit effects on the fight board: when a command lands, the shooter's avatar (the initials on the
// part's left rail, view.mjs) lunges at the part: that's who did it. A crit lunges harder, a broken
// armor chit flashes it white, a miss shakes it. (How much is the number and the bar: app.js.)
// say(): a crewmate's command floating up from their avatar as it goes off.
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
    const f = frame(), name = row.querySelector('.bname');
    if (!name) return;
    // From the shooter's own avatar in the rail if it's still there, else the rail's middle.
    const own = row.querySelector(`.aim[data-who="${CSS.escape(who)}"]`);
    const a = own ? local(f, own.getBoundingClientRect()) : null, n = local(f, name.getBoundingClientRect());
    const at = a ? { left: a.l + 'px', top: a.t + 'px' } : { left: n.l - 32 + 'px', top: n.t + n.h / 2 - 12 + 'px' };
    add(`fx-av ${kind} ${result}`, at, initials);
  }
  // A few words floating up (what a crewmate just did): inside a part's Now cell at its left edge
  // (the damage number rises at the right), or above an element (place: 'above').
  function say(el, text, kind = 'crew', place = 'cell') {
    if (!el?.isConnected) return;
    const f = frame(), r = local(f, el.getBoundingClientRect());
    const node = document.createElement('span');
    node.className = `fx-say ${kind}`;
    node.textContent = text;
    // Several at one spot in quick succession stack, one line under the other.
    const key = `${Math.round(r.l)}:${Math.round(r.t)}`, n = [...layer.querySelectorAll('.fx-say')].filter((x) => x.dataset.k === key).length;
    node.dataset.k = key;
    Object.assign(node.style, place === 'above' ? { left: r.l + 'px', top: r.t - 16 - n * 14 + 'px' } : { left: r.l + 8 + 'px', top: r.t + 6 + n * 15 + 'px' });
    layer.appendChild(node);
    setTimeout(() => node.remove(), 1300);
  }
  return { strike, say };
}
