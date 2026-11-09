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
  function strike(row, { kind, result, word = 'MISS' }) {
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
    // A miss: a big MISS (or RESISTED) stamped across the part, so you can't overlook it.
    if (result === 'miss') add(`fx-miss ${kind}`, { left: n.l + n.w * 0.5 + 'px', top: n.t + n.h / 2 + 'px' }, word, 1100);
    jolt(row, result);
  }
  // The part's name brightens as a hit lands (light only, it never moves): a strike's, or an ability effect's
  // (abilityfx.mjs) when it lands.
  function jolt(row, result = 'hit') {
    const name = row?.isConnected && canMove() && row.querySelector('.bname');
    if (!name) return;
    name.classList.remove('fx-jolt', 'crit', 'miss'); void name.offsetWidth;
    name.classList.add('fx-jolt'); if (result === 'crit' || result === 'miss') name.classList.add(result);
    setTimeout(() => name.classList.remove('fx-jolt', 'crit', 'miss'), 500);
  }
  // A part broken: its row dissolves (style.css .dying) while 1s and 0s rise off it and scatter, and its name and
  // health break up letter by letter: each one flickers into a 1 or a 0, then drifts up and fades. The letters are
  // copies on this layer (the row's own are hidden while it dies), so the board redrawing doesn't cut them short.
  function letters(row, f) {
    const top = row.querySelector('.part-top');
    if (!top) return;
    const walk = document.createTreeWalker(top, NodeFilter.SHOW_TEXT), range = document.createRange();
    let n = 0;
    for (let node = walk.nextNode(); node && n < 60; node = walk.nextNode()) {
      const cs = getComputedStyle(node.parentElement), font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      for (let i = 0; i < node.length && n < 60; i++) {
        const ch = node.data[i];
        if (!ch.trim()) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const b = local(f, range.getBoundingClientRect());
        if (!b.w) continue;
        const el = document.createElement('span');
        el.className = 'fx-letter';
        el.textContent = ch;
        Object.assign(el.style, { left: b.l + b.w / 2 + 'px', top: b.t + b.h / 2 + 'px', font, color: cs.color });
        layer.appendChild(el);
        const turn = 60 + Math.random() * 360, go = turn + 140 + Math.random() * 260; // when it turns to a bit, when it lets go
        const t0 = performance.now(), flick = setInterval(() => { if (performance.now() - t0 > turn) el.textContent = Math.random() < 0.5 ? '0' : '1'; }, 70);
        const an = el.animate([
          { transform: 'translate(-50%, -50%)', opacity: 1, offset: 0 },
          { transform: 'translate(-50%, -50%)', opacity: 1, color: 'var(--bright)', offset: turn / (go + 700) },
          { transform: 'translate(-50%, -50%)', opacity: 1, color: 'var(--amber)', offset: go / (go + 700) },
          { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 30}px), calc(-50% - ${24 + Math.random() * 40}px))`, opacity: 0, color: 'var(--dim)', offset: 1 },
        ], { duration: go + 700, easing: 'ease-out', fill: 'forwards' });
        an.finished.then(() => { clearInterval(flick); el.remove(); }, () => {}); // in step with slow motion
        n++;
      }
    }
  }
  function dissolve(row) {
    if (!row?.isConnected || !canMove()) return;
    const f = frame(), r = local(f, row.getBoundingClientRect());
    letters(row, f);
    // The row itself becomes a block of 1s and 0s where it stood: each one blinks in, flickers, then drifts up and fades.
    const cw = 9, chh = 13, cols = Math.max(1, Math.floor(r.w / cw)), lines = Math.max(1, Math.floor(r.h / chh));
    const step = Math.max(1, Math.ceil((cols * lines) / 170)); // never more than ~170 of them
    for (let k = 0; k < cols * lines; k += step) {
      const c = k % cols, l = Math.floor(k / cols);
      const el = document.createElement('span');
      el.className = 'fx-letter fx-cell';
      el.textContent = Math.random() < 0.5 ? '0' : '1';
      Object.assign(el.style, { left: r.l + (c + 0.5) * (r.w / cols) + 'px', top: r.t + (l + 0.5) * (r.h / lines) + 'px' });
      layer.appendChild(el);
      const appear = 20 + Math.random() * 180, go = appear + 200 + Math.random() * 300, end = go + 500 + Math.random() * 300;
      const flick = setInterval(() => { if (Math.random() < 0.35) el.textContent = el.textContent === '0' ? '1' : '0'; }, 80);
      const an = el.animate([
        { transform: 'translate(-50%, -50%)', opacity: 0, offset: 0 },
        { transform: 'translate(-50%, -50%)', opacity: 0, offset: appear / end },
        { transform: 'translate(-50%, -50%)', opacity: 0.9, color: 'var(--bright)', offset: Math.min(0.99, (appear + 50) / end) },
        { transform: 'translate(-50%, -50%)', opacity: 0.75, color: 'var(--amber)', offset: go / end },
        { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 24}px), calc(-50% - ${18 + Math.random() * 36}px))`, opacity: 0, color: 'var(--dim)', offset: 1 },
      ], { duration: end, easing: 'ease-out', fill: 'forwards' });
      an.finished.then(() => { clearInterval(flick); el.remove(); }, () => {});
    }
  }
  return { strike, dissolve, jolt };
}
