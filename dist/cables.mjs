// Cables: fiber-optic lines over the fight board, from each command or attack due this cycle to
// what it's aimed at (your command and each crewmate's → the part; the virus's attacks → you, the
// crew, or whoever draws fire). When something fires, a pulse of light runs down its cable and
// strikes the target. Look only: the board stays the source of truth. Each cable leaves its pill on the right and
// arcs over the +1 column into the target's row.
//
// The SVG sits beside #board (so a board re-render doesn't wipe a pulse in flight) and is sized
// to it; points are measured from the DOM and divided by the screen's scale, so the monitor
// casing's transform doesn't throw them off.
const NS = 'http://www.w3.org/2000/svg';

export function createCables(board, { canMove = () => true } = {}) {
  const host = board.parentElement;
  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'cables';
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<defs><filter id="cable-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="lines"></g><g class="pulses"></g>';
  host.appendChild(svg);
  const lines = svg.querySelector('.lines'), pulses = svg.querySelector('.pulses');
  let specs = [];

  // Where the board sits in its parent, and the screen's scale (casing transform).
  function frame() {
    const scale = board.getBoundingClientRect().width / (board.offsetWidth || 1) || 1;
    svg.style.left = board.offsetLeft + 'px'; svg.style.top = board.offsetTop + 'px';
    svg.style.width = board.offsetWidth + 'px'; svg.style.height = board.offsetHeight + 'px';
    svg.setAttribute('viewBox', `0 0 ${board.offsetWidth} ${board.offsetHeight}`);
    return { box: board.getBoundingClientRect(), scale };
  }
  const local = (f, r) => ({ l: (r.left - f.box.left) / f.scale, r: (r.right - f.box.left) / f.scale, t: (r.top - f.box.top) / f.scale, b: (r.bottom - f.box.top) / f.scale });

  // A cable from a pill's right edge, arcing out over the +1 column and back into the target
  // row's Now cell: the further apart the rows, the wider the arc. `lane` spreads cables that
  // share a target.
  function path(f, fromEl, toEl, lane = 0) {
    const a = local(f, fromEl.getBoundingClientRect());
    const cell = toEl.querySelector(':scope > .bcell:nth-child(2)') || toEl;
    const b = local(f, cell.getBoundingClientRect()), row = local(f, toEl.getBoundingClientRect());
    const sx = a.r, sy = (a.t + a.b) / 2, ex = b.r - 3, ey = (row.t + row.b) / 2;
    const bulge = 22 + Math.min(70, Math.abs(sy - ey) * 0.35) + lane * 9;
    return `M${sx},${sy} C${sx + bulge},${sy} ${ex + bulge},${ey} ${ex},${ey}`;
  }

  // specs: [{ from: element, to: element, kind: 'you' | 'crew' | 'virus' | 'hot' }]
  function draw(next = specs) {
    specs = next.filter((x) => x.from?.isConnected && x.to?.isConnected);
    const f = frame();
    const lanes = new Map();
    lines.innerHTML = specs.map((x) => {
      const key = x.to.dataset.target || x.to.dataset.mate || 'you';
      const lane = lanes.get(key) || 0; lanes.set(key, lane + 1);
      const d = path(f, x.from, x.to, lane);
      return `<path class="cable ${x.kind}" d="${d}"/><path class="cable-core ${x.kind}" d="${d}"/>`;
    }).join('');
  }

  // A pulse down the cable from `from` to `to`: a bright packet, then a spark where it lands.
  function pulse(from, to, kind = 'you', ms = 220) {
    if (!from?.isConnected || !to?.isConnected) return;
    const f = frame();
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', path(f, from, to));
    p.setAttribute('class', `pulse-path ${kind}`);
    pulses.appendChild(p);
    const len = p.getTotalLength();
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '3.2');
    dot.setAttribute('class', `pulse-dot ${kind}`);
    dot.setAttribute('filter', 'url(#cable-glow)');
    pulses.appendChild(dot);
    const end = p.getPointAtLength(len);
    const done = () => {
      dot.remove();
      const spark = document.createElementNS(NS, 'circle');
      spark.setAttribute('cx', end.x); spark.setAttribute('cy', end.y); spark.setAttribute('r', '3');
      spark.setAttribute('class', `pulse-spark ${kind}`);
      pulses.appendChild(spark);
      setTimeout(() => { spark.remove(); p.remove(); }, 380);
    };
    if (!canMove()) { done(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - k) * (1 - k);
      const pt = p.getPointAtLength(e * len);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      if (k < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  }

  board.addEventListener('scroll', () => draw());
  addEventListener('resize', () => draw());
  return { draw, pulse, clear: () => { specs = []; lines.innerHTML = ''; } };
}
