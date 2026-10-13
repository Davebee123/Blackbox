// A virus attack lashing at your screen, in place of a plain red flash (the designer: "1s and 0s and the
// virus lashing out at the screen"). The attacking part throws a tendril of its own characters (the ones
// the render panel draws it in, or its row on the board) across the screen into your Signal bar; where it
// lands, 1s and 0s burst and fall, and the screen glitches for a moment (scanlines, a colour split, a few
// torn rows). Bigger hits throw more and last longer; a crit or a charge (a tell landing) whips harder:
// more strands, white-hot, a heavier glitch. Encryption is lighter and different: hex scrambles over your
// bar and locks shut, no tendril (the Encryptor's own attack throws a tendril of hex first).
//
// About half a second, on a layer of its own that takes no input. Effects full: the whole thing; calm: one
// strand, fewer bits, no full-screen glitch; minimal or Motion off: none (app.js flashes a soft edge
// instead). Look only.

import { glyph } from './glyphs.mjs';

// What a lash is made of. power: 0–1, the hit's share of your max (scaled up: a fifth of your max is 1);
// heavy: a crit or a charge; mode: 'hit' | 'encrypt' (the Encryptor's attack) | 'tick' (encryption eating you).
export function sizeOf({ power = 0.3, heavy = false, mode = 'hit', full = false } = {}) {
  const p = Math.max(0, Math.min(1, power));
  if (mode === 'tick') return { strands: 0, bits: 0, rain: 0, glitch: 0, locks: full ? 6 : 4, travel: 0, life: 520 };
  if (mode === 'encrypt') return { strands: 1, bits: 0, rain: 0, glitch: 0, locks: full ? 6 : 4, travel: 160, life: 420 };
  const strands = (heavy ? 2 : 1) + (full ? 1 : 0);
  const bits = Math.round((10 + p * 26 + (heavy ? 18 : 0)) * (full ? 1 : 0.55));
  const rain = full ? Math.round(4 + p * 8 + (heavy ? 6 : 0)) : 0;
  const glitch = full ? Math.round(240 + p * 120 + (heavy ? 140 : 0)) : 0;
  const travel = heavy ? 120 : 160 - Math.round(p * 30); // ms for the tip to reach you: bigger is faster
  const life = Math.round(320 + p * 120 + (heavy ? 120 : 0)); // ms each character of it stays
  return { strands, bits, rain, glitch, locks: 0, travel, life };
}

const HEX = '0123456789ABCDEF';
const pick = (s) => s[Math.floor(Math.random() * s.length)];
const bit = () => (Math.random() < 0.5 ? '0' : '1');
const LOCK = glyph('lock');

export function createLash() {
  let layer = null;
  const ground = () => {
    if (!layer?.isConnected) { layer = document.createElement('div'); layer.id = 'lash'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); }
    return layer;
  };
  const put = (cls, style, html, ms) => {
    const el = document.createElement('span');
    el.className = cls;
    for (const [k, v] of Object.entries(style)) if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
    if (html) el.innerHTML = html;
    ground().appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  };

  // A strand: characters along a bent, wavering curve from the part to where it lands, appearing tip-first
  // in turn so it reads as a whip travelling at you.
  function strand(a, b, chars, spec, k, heavy, mode) {
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist, ny = dx / dist; // across the line
    const bend = (k % 2 ? -1 : 1) * (0.1 + Math.random() * 0.18) * dist * (k ? 1.4 : 1);
    const cx = a.x + dx * 0.45 + nx * bend, cy = a.y + dy * 0.45 + ny * bend;
    const n = Math.max(12, Math.min(heavy ? 90 : 64, Math.round(dist / (heavy ? 9 : 12))));
    const phase = Math.random() * Math.PI * 2, wave = 5 + Math.random() * 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const w = Math.sin(t * Math.PI * 3 + phase) * wave * Math.sin(t * Math.PI);
      const x = u * u * a.x + 2 * u * t * cx + t * t * b.x + nx * w, y = u * u * a.y + 2 * u * t * cy + t * t * b.y + ny * w;
      // The part's own characters near it, more 1s and 0s toward the tip (hex for encryption).
      const ch = mode === 'encrypt' ? pick(HEX) : t < 0.55 && chars ? pick(chars) : Math.random() < 0.8 ? bit() : pick('#%@*');
      const tip = t > 0.82;
      put(`lash-ch${heavy ? ' heavy' : ''}${mode === 'encrypt' ? ' enc' : ''}${tip ? ' lash-head' : ''}`, {
        left: x + 'px', top: y + 'px', '--t': t.toFixed(2), animationDelay: Math.round(t * spec.travel + k * 25) + 'ms',
        '--life': spec.life + 'ms', '--jx': (Math.random() - 0.5) * 10 + 'px', '--jy': (Math.random() * 10 + 4) + 'px',
      }, ch === '<' ? '&lt;' : ch === '&' ? '&amp;' : ch, spec.travel + spec.life + 120);
    }
  }

  // Where it lands: 1s and 0s burst off your bar and fall away.
  function burst(b, spec, heavy) {
    for (let i = 0; i < spec.bits; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5, d = 20 + Math.random() * (heavy ? 90 : 60);
      put(`lash-bit${heavy ? ' heavy' : ''}`, {
        left: b.x + (Math.random() - 0.5) * 30 + 'px', top: b.y + 'px', animationDelay: spec.travel + Math.round(Math.random() * 60) + 'ms',
        '--tx': Math.cos(a) * d + 'px', '--ty': Math.sin(a) * d * 0.6 + 'px', '--fall': 40 + Math.random() * 80 + 'px',
        '--d': 480 + Math.round(Math.random() * 220) + 'ms',
      }, bit(), spec.travel + 900);
    }
  }

  // Full: a few columns of 1s and 0s fall down the screen, and the screen glitches.
  function screen(spec, heavy) {
    const W = innerWidth, H = innerHeight;
    for (let i = 0; i < spec.rain; i++) {
      const len = 5 + Math.floor(Math.random() * 8);
      put('lash-rain', {
        left: Math.round(Math.random() * W) + 'px', top: Math.round(Math.random() * H * 0.35) + 'px',
        animationDelay: spec.travel + Math.round(Math.random() * 120) + 'ms', '--fall': Math.round(H * (0.15 + Math.random() * 0.25)) + 'px',
      }, Array.from({ length: len }, bit).join('<br>'), spec.travel + 900);
    }
    if (!spec.glitch) return;
    const g = put(`lash-glitch${heavy ? ' heavy' : ''}`, { animationDelay: spec.travel + 'ms', '--g': spec.glitch + 'ms' }, '', spec.travel + spec.glitch + 60);
    for (let i = 0; i < (heavy ? 6 : 3); i++) {
      const tear = document.createElement('i');
      tear.style.top = Math.round(Math.random() * 96) + '%';
      tear.style.height = 3 + Math.round(Math.random() * (heavy ? 16 : 9)) + 'px';
      tear.style.setProperty('--tx', (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * (heavy ? 40 : 22)) + 'px');
      g.appendChild(tear);
    }
  }

  // Encryption: hex scrambles across your bar, then each one locks.
  function locks(bar, spec, delay) {
    const r = bar.getBoundingClientRect();
    for (let i = 0; i < spec.locks; i++) {
      const el = put('lash-lock', { left: r.left + ((i + 0.5) / spec.locks) * r.width + 'px', top: r.top + r.height / 2 + 'px', animationDelay: delay + 'ms', '--life': spec.life + 'ms' }, pick(HEX) + pick(HEX), delay + spec.life + 200);
      let n = 0;
      const flick = setInterval(() => {
        if (!el.isConnected || ++n > 5) { clearInterval(flick); if (el.isConnected) { el.innerHTML = LOCK; el.classList.add('shut'); } return; }
        el.textContent = pick(HEX) + pick(HEX);
      }, Math.max(30, Math.round((delay + spec.life * 0.4) / 6)));
    }
  }

  function jolt(bar, cls, ms) {
    if (!bar) return;
    bar.classList.remove(cls); void bar.offsetWidth; bar.classList.add(cls);
    setTimeout(() => bar.classList.remove(cls), ms);
  }

  // from: { x, y, chars } on the page (the part on the render, or its row), or null (encryption ticking);
  // bar: your Signal bar's element; onImpact(): when the tip lands (the screen shake, app.js).
  function lash({ from = null, bar, power = 0.3, heavy = false, mode = 'hit', full = false, onImpact = null }) {
    if (!bar) return 0;
    const r = bar.getBoundingClientRect();
    if (!r.width) return 0;
    const spec = sizeOf({ power, heavy, mode, full });
    const b = { x: r.left + r.width * (0.3 + Math.random() * 0.5), y: r.top + r.height / 2 };
    if (from && spec.strands) for (let k = 0; k < spec.strands; k++) strand(from, b, from.chars || '', spec, k, heavy, mode);
    const at = from ? spec.travel : 0;
    if (mode === 'hit') { burst(b, spec, heavy); screen(spec, heavy); }
    if (spec.locks) locks(bar, spec, at);
    setTimeout(() => { jolt(bar, mode === 'hit' ? 'fx-lashed' : 'fx-locked', 420); onImpact?.(); }, at);
    return at + spec.life;
  }
  return { lash };
}
