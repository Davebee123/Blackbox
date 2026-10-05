// Hit effects on the fight board: when a command lands, it lands on the part itself, in the
// shooter's colour (yours teal, a crewmate's violet): a flash, a slash across it, a jolt. A crit
// slashes twice, harder; a broken armor chit flashes it white; a miss shakes it. (How much is the
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
    Object.assign(el.style, style);
    el.innerHTML = html;
    layer.appendChild(el);
    setTimeout(() => el.remove(), ms);
  };

  // row: the part's board row. who: 'you' or a crewmate's handle. kind: 'you' | 'crew'.
  // result: 'hit' | 'crit' | 'chit' | 'miss'.
  // The strike lands on the part itself: its cell flashes in the shooter's colour, a slash cuts
  // across it (a crit: two, crossing, harder), and the cell jolts. A broken chit flashes it white;
  // a miss only shakes it.
  function strike(row, { kind, result }) {
    if (!row?.isConnected || !canMove()) return;
    const f = frame(), name = row.querySelector('.bname');
    if (!name) return;
    const n = local(f, name.getBoundingClientRect());
    const slashes = result === 'crit' ? '<b></b><b class="x2"></b>' : result === 'hit' ? '<b></b>' : '';
    add(`fx-smash ${kind} ${result}`, { left: n.l + 'px', top: n.t + 'px', width: n.w + 'px', height: n.h + 'px' }, slashes, result === 'crit' ? 750 : 560);
    name.classList.remove('fx-jolt', 'crit', 'miss'); void name.offsetWidth;
    name.classList.add('fx-jolt'); if (result === 'crit' || result === 'miss') name.classList.add(result);
    setTimeout(() => name.classList.remove('fx-jolt', 'crit', 'miss'), 500);
  }
  return { strike };
}
