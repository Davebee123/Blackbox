// The run's backdrop: faint amber 1s and 0s falling in the margins either side of the terminal, like data streaming past
// while you're tapped into someone else's server. It speeds up and brightens as your Signal falls,
// and runs hot when a guard has you. One canvas behind the page, re-attached after a render.
// Motion off: none.

export function createRain({ canMove }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'rain';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const CELL = 16;
  let cols = [], w = 0, h = 0, last = 0, mood = { tension: 0, hot: false }, on = false;

  function size() {
    const r = canvas.parentElement?.getBoundingClientRect();
    if (!r || !r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (Math.round(r.width * dpr) === canvas.width && Math.round(r.height * dpr) === canvas.height) return;
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.ceil(w / CELL);
    cols = Array.from({ length: n }, (_, i) => cols[i] || { y: Math.random() * h, v: 0.4 + Math.random() * 0.9, len: 6 + Math.floor(Math.random() * 16), gap: Math.random() < 0.7 });
  }

  function frame(t) {
    if (!on) return;
    requestAnimationFrame(frame);
    if (t - last < 45) return; // about 22 frames a second: it's texture, not an effect
    const dt = Math.min(120, t - last);
    last = t;
    size();
    if (!w) return;
    // Fade what's there (the canvas stays transparent, so the panel shows through).
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${0.06 + mood.tension * 0.03})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `12px 'IBM Plex Mono', ui-monospace, monospace`;
    ctx.textAlign = 'center';
    const speed = (1 + mood.tension * 0.9) * dt * 0.06;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      c.y += c.v * speed * CELL * 0.12;
      if (c.y - c.len * CELL > h) { c.y = -Math.random() * h * 0.5; c.v = 0.4 + Math.random() * 0.9; c.gap = Math.random() < 0.7 - mood.tension * 0.15; }
      if (c.gap) continue;
      const x = i * CELL + CELL / 2;
      const row = Math.floor(c.y / CELL);
      const bit = (row * 7 + i * 13 + Math.floor(t / 180)) % 3 === 0 ? '1' : '0';
      // The head: brightest. Hot (a guard on you) turns it red.
      ctx.fillStyle = mood.hot ? 'rgba(230, 120, 60, 0.4)' : `rgba(214, 154, 34, ${0.3 + mood.tension * 0.15})`;
      ctx.fillText(bit, x, row * CELL);
      // A flicker now and then further up the stream.
      if (Math.random() < 0.03) { ctx.fillStyle = 'rgba(126, 83, 17, 0.35)'; ctx.fillText(Math.random() < 0.5 ? '1' : '0', x, (row - 2 - Math.floor(Math.random() * c.len)) * CELL); }
    }
  }

  return {
    // Put the canvas behind the run page (call after every render; cheap when nothing changed).
    mount(panel) {
      if (!panel || !canMove()) { this.stop(); return; }
      if (canvas.parentElement !== panel) { panel.prepend(canvas); size(); }
      if (!on) { on = true; last = 0; requestAnimationFrame(frame); }
    },
    stop() { on = false; canvas.remove(); if (w) ctx.clearRect(0, 0, w, h); },
    // tension 0–1 (Signal lost), hot: a guard fight is waiting or running.
    mood(m) { mood = m; },
  };
}
