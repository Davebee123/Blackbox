// Presentation only: the act break (docs/solo-bosses.md "The shape"), played when a boss's ♛ crosses into its next act
// (combat.mjs bossPhases' phase event, its act). The ♛'s tick bursts into red bits as the hit crosses it; after a
// breath the board's strip flares red and names the act, its letters pulling in from a blur, and fades out the same
// way; the boss's emote types out under its bar. The fight's clock holds for all of it (app.js). Each frame re-applies
// it, so the board's own redraws never wipe it.
export const ACT_BREAK = { gap: 1700, hold: 4200, fade: 700, emote: 1800, type: 30, bits: 34 };
export const actBreakMs = () => ACT_BREAK.gap + ACT_BREAK.hold + ACT_BREAK.fade;

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const bump = (t, len) => (t < 0 || t > len ? 0 : Math.sin((t / len) * Math.PI));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createActBreak({ motion }) {
  let run = 0;
  // The ♛'s tick, as it stands on the board now.
  const tickEl = (act) => [...document.querySelectorAll(`#board [data-target="${CSS.escape(act.part)}"] .ptick.phase`)].find((el) => Math.abs(parseFloat(el.style.left) - act.at * 100) < 0.5) || null;
  function burst(act) {
    const tick = tickEl(act);
    if (!tick) return;
    const r = tick.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, born = performance.now();
    tick.classList.add('act-flare');
    setTimeout(() => tick.classList.remove('act-flare'), 500);
    const bits = Array.from({ length: ACT_BREAK.bits }, () => {
      const el = document.createElement('span'), a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 190;
      el.className = 'act-bit';
      el.textContent = Math.random() < 0.5 ? '1' : '0';
      el.style.fontSize = `${10 + Math.random() * 8}px`;
      document.body.appendChild(el);
      return { el, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 700 + Math.random() * 600 };
    });
    const fly = () => {
      const t = (performance.now() - born) / 1000;
      let left = 0;
      for (const b of bits) {
        const k = (t * 1000) / b.life;
        if (k >= 1) { b.el.remove(); continue; }
        left++;
        b.el.style.left = `${x0 + b.vx * t}px`;
        b.el.style.top = `${y0 + b.vy * t + 260 * t * t}px`;
        b.el.style.opacity = String(1 - k * k);
      }
      if (left) requestAnimationFrame(fly);
    };
    requestAnimationFrame(fly);
  }
  // The strip: its card over the board's own strip (hidden under it), and the emote under the boss's bar.
  function frame(act, t, moving) {
    const { hold, fade } = ACT_BREAK;
    const strip = document.querySelector('#board .phase-strip');
    let card = strip?.querySelector('.act-card');
    if (strip && t < hold + fade) {
      if (!card) {
        strip.classList.add('act-on');
        strip.insertAdjacentHTML('beforeend', `<div class="act-card"><b class="ac-n">ACT ${act.n}</b><span class="ac-of">/ ${act.of}</span>${act.name ? `<b class="ac-name">${esc(act.name.toUpperCase())}</b>` : ''}</div>`);
        card = strip.querySelector('.act-card');
      }
      const inK = moving ? ease(t / 650) : 1, outK = moving ? 1 - ease((t - hold) / fade) : t < hold ? 1 : 0, flare = moving ? bump(t, 500) : 0, live = inK * outK;
      card.style.background = `color-mix(in srgb, var(--hot) ${Math.round(22 * live + 38 * flare)}%, var(--panel, transparent))`;
      card.style.boxShadow = `0 0 ${Math.round(24 * flare + 10 * live)}px color-mix(in srgb, var(--hot) ${Math.round(60 * (flare + 0.3 * live))}%, transparent)`;
      card.style.borderTopColor = `color-mix(in srgb, var(--hot) ${Math.round(100 * live)}%, transparent)`;
      card.querySelectorAll('b, span').forEach((el, i) => {
        const k = moving ? ease((t - 90 * i) / 650) : 1, o = k * outK;
        el.style.opacity = String(o);
        if (moving) { el.style.letterSpacing = `${0.22 + 0.5 * (1 - k) + 0.4 * (1 - outK)}em`; el.style.filter = `blur(${(1 - o) * 6}px)`; }
      });
    } else if (strip) { strip.classList.remove('act-on'); card?.remove(); }
    // The emote: the boss's own line, typed out, gone a moment after the strip.
    const hud = document.querySelector('.hud-bar.enemy');
    let em = hud?.querySelector('.act-emote');
    if (hud && act.emote && t < hold + ACT_BREAK.emote) {
      if (!em) {
        hud.classList.add('act-emoting');
        hud.insertAdjacentHTML('beforeend', `<p class="act-emote"><b>${esc(act.boss || '')}</b><span></span></p>`);
        em = hud.querySelector('.act-emote');
      }
      em.querySelector('span').textContent = moving ? act.emote.slice(0, Math.max(0, Math.floor((t - 250) / ACT_BREAK.type))) : act.emote;
      em.style.opacity = String(1 - ease((t - hold - ACT_BREAK.emote + 500) / 500));
    } else if (hud) { hud.classList.remove('act-emoting'); em?.remove(); }
    // The desktop's haptic: the boss's bar thumps once as the strip comes in.
    const bar = hud?.querySelector('.bigbar');
    if (bar && moving) { const b = bump(t, 260); bar.style.transform = b ? `scaleY(${1 + 0.35 * b})` : ''; bar.style.filter = b ? `brightness(${1 + 0.7 * b})` : ''; }
    return t < hold + Math.max(fade, ACT_BREAK.emote);
  }
  // act: the phase event's act ({ n, of, name, emote, part, at }), boss: its name.
  function play(act, boss) {
    const id = ++run, moving = motion(), a = { ...act, boss };
    document.querySelectorAll('.act-card, .act-emote').forEach((el) => el.remove()); // an act break still playing gives way
    document.querySelectorAll('.act-on, .act-emoting').forEach((el) => el.classList.remove('act-on', 'act-emoting'));
    if (moving && act.part && act.at != null) burst(act);
    const t0 = performance.now() + ACT_BREAK.gap;
    const step = () => {
      if (id !== run) return;
      const t = performance.now() - t0;
      if (t < 0 || frame(a, t, moving)) requestAnimationFrame(step);
      else frame(a, Infinity, moving);
    };
    requestAnimationFrame(step);
  }
  return { play };
}
