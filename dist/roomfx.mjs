// A room's verb on the rooms map, played over its chip (app.js; the sound is feel.mjs's, timed to match).
// Vault (the *Dial*): the dial on its icon turns and clicks three times, the doors part with light behind them, and its
// files fly into your Pack one by one.
// Drawn in a fixed layer over the page from boxes read once at the start: transforms and opacity only, nothing left
// running after. Screen effects off, Motion off or reduced motion: none (app.js doesn't call it).
const FILE = '<svg viewBox="0 0 14 17" width="14" height="17"><path d="M1 1h8l4 4v11H1z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.4"/><path d="M9 1v4h4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const DIAL = '<svg style="display:block;overflow:visible" viewBox="8 8 8 8" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="var(--rfx-fill)"/><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16"/></svg>';
// The Dial's beats, in ms (sound.mjs RECIPES.vault keeps the same ones).
export const VAULT = { turn: 240, turns: 3, open: 720, files: 980, gap: 150, fly: 560 };

const ease = 'cubic-bezier(.2,.7,.2,1)';
const div = (cls, css, html = '') => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css); d.innerHTML = html; return d; };
const shown = (els) => els.map((e) => [e, e.getBoundingClientRect()]).find(([, r]) => r.width > 0);

// The Pack takes a file: a little bump (found fresh: a redraw may have replaced it).
const bump = () => { for (const p of document.querySelectorAll('#page-view .fp-packstat')) p.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: ease }); };

export function playVault(room, n = 1) {
  const chip = shown([...document.querySelectorAll(`#page-view .fp-room[data-room="${CSS.escape(room)}"]`)]);
  if (!chip) return;
  const [g] = chip, body = g.querySelector('.fp-body'), r = body?.getBoundingClientRect(), icon = g.querySelector('.fp-icon')?.getBoundingClientRect(), pack = shown([...document.querySelectorAll('#page-view .fp-packstat')])?.[1];
  if (!r?.width) return;
  // The chip's own colours (gold, or teal while you stand in it): its edge for the doors and the dial, its fill under it.
  const cs = getComputedStyle(body), hue = /^(rgb|#)/.test(cs.stroke) ? cs.stroke : '#ffe066', fill = /^(rgb|#)/.test(cs.fill) ? cs.fill : '#2e2613';
  const w = (parseFloat(cs.strokeWidth) || 3) * (r.width / (body.getBBox().width || r.width)); // its edge on screen, centred on the outline
  const layer = div('rfx', { left: `${r.left - w / 2}px`, top: `${r.top - w / 2}px`, width: `${r.width + w}px`, height: `${r.height + w}px`, color: hue });
  layer.style.setProperty('--rfx-fill', fill); layer.style.setProperty('--rfx-w', `${w}px`);
  const doorL = div('rfx-door l', {}), doorR = div('rfx-door r', {}), glow = div('rfx-glow', {});
  layer.append(glow, doorL, doorR);
  let dial = null;
  if (icon?.width) {
    // The icon's dial sits at its middle, a third of its width across.
    const s = icon.width / 3;
    dial = div('rfx-dial', { left: `${icon.left - r.left + w / 2 + icon.width / 2 - s / 2}px`, top: `${icon.top - r.top + w / 2 + icon.height / 2 - s / 2}px`, width: `${s}px`, height: `${s}px` }, DIAL);
    layer.append(dial);
  }
  document.body.append(layer);
  const A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: ease, ...o });
  let a = 0;
  if (dial) [70, -50, 110].forEach((d, i) => { const from = a; a += d; A(dial, [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${a}deg)` }], { duration: 170, delay: i * VAULT.turn }); });
  A(doorL, [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)', opacity: 0.8 }, { transform: 'translateX(-7px)', opacity: 0 }], { duration: 1300, delay: VAULT.open });
  A(doorR, [{ transform: 'translateX(0)' }, { transform: 'translateX(7px)', opacity: 0.8 }, { transform: 'translateX(7px)', opacity: 0 }], { duration: 1300, delay: VAULT.open });
  if (dial) A(dial, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: VAULT.open + 300 });
  A(glow, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 1400, delay: VAULT.open });
  const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 - 6 }, to = pack ? { x: pack.left + pack.width / 2, y: pack.top + pack.height / 2 } : { x: from.x, y: from.y - 60 };
  const files = Math.max(1, Math.min(4, n));
  for (let i = 0; i < files; i++) {
    const f = div('rfx-file', {}, FILE), dx = to.x - from.x;
    document.body.append(f);
    f.animate([
      { transform: `translate(${from.x}px, ${from.y}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${from.x + dx * 0.25}px, ${from.y - 40}px) scale(1.1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(.6)`, opacity: 0.9, offset: 0.92 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(.3)`, opacity: 0 },
    ], { duration: VAULT.fly, delay: VAULT.files + i * VAULT.gap, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'both' }).finished.then(() => { f.remove(); bump(); }, () => f.remove());
  }
  setTimeout(() => layer.remove(), VAULT.open + 1500);
}
