// The board's floor motion (docs/ui.md "The stage"): how a chip's name arrives when the timeline turns, by floor. The
// chips themselves, their colours, icons and telegraphs never change; only the moment they come in does.
//   type   (the Sink, Bedrock: the old ledgers) a new chip types its name in, a caret ahead of it.
//   flap   (Backhaul, Coldline: the departure boards) a new chip's letters spin and settle; a chip moving up a column
//          flaps its letters once.
// app.js turnTimeline calls arrive and move; nothing runs with Motion off.
export const BOARD_MOTION = { 2: 'flap', 4: 'flap', 7: 'type', 8: 'type' };
export const motionOf = (floor) => BOARD_MOTION[floor] || null;

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const rnd = () => CHARS[Math.floor(Math.random() * CHARS.length)];
const later = (ms) => new Promise((r) => setTimeout(r, ms));
// The label on show: the name, or its three-letter code where the name won't fit.
const labelOf = (el) => [...(el?.querySelectorAll('b, i.code') || [])].find((x) => x.offsetWidth > 0) || null;

// A chip's name split into one span a letter (so each can flip), its text kept.
function letters(b) {
  const text = b.textContent;
  b.textContent = '';
  return [...text].map((ch) => { const s = document.createElement('span'); s.className = 'bfx-ch'; s.textContent = ch; b.appendChild(s); return { s, ch }; });
}
function flip(s, ch) { s.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.08)', offset: 0.5 }, { transform: 'scaleY(1)' }], { duration: 130 }); setTimeout(() => { s.textContent = ch; }, 65); }

export async function arrive(el, kind, delay = 0) {
  const b = labelOf(el); if (!b || !kind) return;
  const small = el.querySelector('small'), text = b.textContent;
  if (kind === 'type') {
    b.textContent = ''; if (small) small.style.visibility = 'hidden';
    const caret = document.createElement('i'); caret.className = 'bfx-caret'; b.after(caret);
    await later(delay);
    for (const ch of text) { if (!el.isConnected) return; b.textContent += ch; await later(ch === ' ' ? 30 : 36 + Math.random() * 26); }
    caret.remove(); if (small) small.style.visibility = '';
    return;
  }
  const ls = letters(b);
  ls.forEach(({ s }) => (s.textContent = ' '));
  if (small) small.style.visibility = 'hidden';
  await later(delay);
  await Promise.all(ls.map(async ({ s, ch }, i) => { await later(i * 50); for (let k = 2 + Math.floor(Math.random() * 3); k > 0; k--) { flip(s, rnd()); await later(130); } flip(s, ch); }));
  if (small) small.style.visibility = '';
}

export function move(el, kind) {
  const b = kind === 'flap' ? labelOf(el) : null; if (!b) return;
  letters(b).forEach(({ s, ch }, i) => setTimeout(() => flip(s, ch), i * 30));
}

// ---------- the spoils, the floor's way ----------
// A won fight's card (app.js showSpoils) arrives as the floor would show it: the Sprawl's lines flicker on like a sign,
// Backhaul's letters flip in, Coldline's card surfaces, Bedrock's lines type in. Other floors keep the card's own way in.
export const SPOILS_MOTION = { 1: 'flicker', 2: 'flap', 4: 'surface', 8: 'type' };
const FLICKER = [{ opacity: 0 }, { opacity: 0.8, offset: 0.1 }, { opacity: 0, offset: 0.2 }, { opacity: 0.6, offset: 0.35 }, { opacity: 0.1, offset: 0.45 }, { opacity: 1, offset: 0.6 }, { opacity: 1 }];
// The leaf texts of a line, in reading order (what types or flips).
const textsOf = (r) => [...r.querySelectorAll('*')].filter((x) => !x.children.length && x.textContent.trim() && !/sp-bar|sp-was|sp-now|ico/.test(x.className));
async function typeLeaf(x) { const text = x.textContent; x.textContent = ''; x.style.visibility = ''; const caret = document.createElement('i'); caret.className = 'bfx-caret'; x.after(caret); for (const c of text) { if (!x.isConnected) return; x.textContent += c; await later(18 + Math.random() * 14); } caret.remove(); }
async function flapLeaf(x) {
  x.style.visibility = '';
  const ls = letters(x); ls.forEach(({ s }) => (s.textContent = ' '));
  await Promise.all(ls.map(async ({ s, ch }, i) => { await later(Math.min(i * 22, 400)); for (let k = 1 + Math.floor(Math.random() * 2); k > 0; k--) { flip(s, rnd()); await later(120); } flip(s, ch); }));
}
export async function spoilsIn(el, floor) {
  const kind = SPOILS_MOTION[floor]; if (!kind || !el) return;
  const card = el.querySelector('.sp-card'), lines = [...el.querySelectorAll('.sp-head, .sp-xp, .sp-level, .sp-row, .sp-go')];
  lines.forEach((r) => { r.style.animation = 'none'; r.style.opacity = '0'; });
  if (kind === 'surface') card?.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' });
  for (const [i, r] of lines.entries()) {
    await later(i ? 150 : 120);
    if (!el.isConnected || el.hidden) return;
    r.style.opacity = '1';
    if (kind === 'flicker') r.animate(FLICKER, 380);
    else if (kind === 'surface') r.animate([{ transform: 'translateY(10px)', opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { transform: 'none', opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 420, easing: 'ease-out' });
    else { const xs = textsOf(r); xs.forEach((x) => (x.style.visibility = 'hidden')); for (const x of xs) await (kind === 'type' ? typeLeaf(x) : flapLeaf(x)); }
  }
}
