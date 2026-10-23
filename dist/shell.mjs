// BLACKBOX immersive shell: the screen around the game.
// A CRT (scanlines, glow, a rolling refresh band), a boot sequence that reads
// your state back to you, a status line, a block cursor, key clicks, and
// a tear across the backdrop when something big hits you (screenfx.mjs). Pure presentation: no rules live here.
// Everything that moves is skipped when Motion is off; `shell plain` turns it all off.

import { powerOn } from './poweron.mjs';
import { bootScript } from './boots.mjs';
import { bootOf } from './terminal.mjs';

const BOOTED_KEY = 'blackbox-booted';
const SPARK = '▁▂▃▄▅▆▇█';
const PATHS = { map: '~/map', server: '/srv', vault: '~/protocols', loadout: '/etc/loadout', daemons: '/etc/daemons', system: '/sys', net: '~/net', combat: '/proc/intrusion' };

export function createShell({ getState, isOn, canMove, tick, sound, tear }) {
  const $ = (id) => document.getElementById(id);
  let traffic = Array.from({ length: 16 }, () => 0.2 + Math.random() * 0.2);
  let energy = 0;
  let booting = false;
  let caretKey = '';
  let lastModule = null;

  // ---------- boot ----------
  // The boot reads your server back to you, so it's a status report as well as a mood. Which look plays is yours
  // (System → Terminal: terminal.mjs bootOf); its lines are boots.mjs's.
  function boot(force = false) {
    if (!isOn() || !canMove()) return;
    try { if (!force && sessionStorage.getItem(BOOTED_KEY)) return; sessionStorage.setItem(BOOTED_KEY, '1'); } catch { /* storage blocked: boot every load */ }
    // The monitor comes on first (poweron.mjs); the boot lines run once a key starts it.
    $('boot').hidden = false;
    booting = true; // tips and the like hold off from the power-up on
    powerOn({ sound, reducedMotion: () => !canMove() }).then(() => bootLinesRun(bootOf(getState())));
  }
  // A look played on its own (System → Terminal's Preview): no power-up first. Motion off shows it still, all at once.
  function preview(id) {
    if (booting) return;
    bootLinesRun(id || bootOf(getState()), !canMove());
  }
  function bootLinesRun(id = 'stock', still = false) {
    const el = $('boot');
    const script = bootScript(getState(), id);
    el.className = `boot ${script.cls}${still ? ' still' : ''}`;
    if (script.fc) el.style.setProperty('--fc', script.fc); else el.style.removeProperty('--fc');
    el.dataset.boot = script.id;
    el.innerHTML = `<pre></pre><small>${matchMedia('(pointer: coarse)').matches ? 'tap' : 'any key'} to skip</small>`;
    el.hidden = false;
    booting = true;
    const pre = el.querySelector('pre');
    let i = 0;
    const done = () => {
      if (!booting) return;
      booting = false;
      clearTimeout(boot.t);
      clearTimeout(boot.fix);
      clearInterval(boot.count);
      el.classList.add('out');
      const app = $('app');
      if (!still) { app.classList.remove('power-on'); void app.offsetWidth; app.classList.add('power-on'); }
      setTimeout(() => { el.hidden = true; el.className = 'boot'; el.style.removeProperty('--fc'); delete el.dataset.boot; app.classList.remove('power-on'); }, still ? 0 : 420);
      removeEventListener('keydown', done, true);
      removeEventListener('pointerdown', done, true);
    };
    addEventListener('keydown', done, true);
    addEventListener('pointerdown', done, true);
    // One step as it ends up (still, or skipped to), or as it comes in: a garbled line settles once, a count runs up.
    const put = (l, now) => {
      if (l.art) { const d = document.createElement('div'); d.className = 'boot-art m'; d.textContent = l.art.join('\n'); pre.appendChild(d); return; }
      const row = l.same && pre.lastElementChild ? pre.lastElementChild : pre.appendChild(document.createElement('div'));
      row.className = l.c || '';
      const text = l.count != null ? `${l.t}${l.count}${l.unit || ''}` : l.t || ' ';
      if (now || (l.garble == null && l.count == null)) { row.textContent = text; return; }
      if (l.garble != null) {
        row.textContent = l.garble;
        row.classList.add('gl');
        boot.fix = setTimeout(() => { row.textContent = text; row.classList.remove('gl'); }, Math.round((l.ms ?? 160) * 0.75));
        return;
      }
      const frames = 8, by = Math.max(1, Math.ceil(l.count / frames));
      let n = 0;
      row.textContent = `${l.t}0K`;
      boot.count = setInterval(() => { n = Math.min(l.count, n + by); row.textContent = n >= l.count ? text : `${l.t}${n}K`; if (n >= l.count) clearInterval(boot.count); }, Math.max(20, Math.floor(((l.ms ?? 160) * 0.8) / frames)));
    };
    if (still) {
      for (const l of script.steps) put(l, true);
      boot.t = setTimeout(done, 2400);
      return;
    }
    const next = () => {
      if (!booting) return;
      if (i >= script.steps.length) { boot.t = setTimeout(done, script.hold); return; }
      const l = script.steps[i++];
      put(l, false);
      tick?.(); // the boot lines tick in (heard only once audio is allowed)
      boot.t = setTimeout(next, l.ms ?? (l.c === 'h' ? 260 : 70 + Math.random() * 90));
    };
    boot.t = setTimeout(next, 250);
  }

  // ---------- glitches ----------
  // A big moment tears the backdrop (screenfx.mjs): the interface itself never moves.
  function glitch(big = false) {
    if (!isOn() || !canMove()) return;
    tear?.(big);
  }

  function react(events) {
    for (const e of events) {
      // A tear only for the big moments (a crit on you is app.js's, on its beat); an ordinary hit lands on your bar.
      if ((e.type === 'server-hit' && e.crit && !tear) || ['trap', 'intrusion'].includes(e.type)) { glitch(false); energy += 0.6; }
      else if (['server-hit', 'encrypt', 'blind'].includes(e.type)) energy += 0.4;
      else if (['crashed', 'disconnected'].includes(e.type)) { glitch(true); energy += 1.5; }
      else if (['damage', 'broken', 'resolved', 'net', 'net-good', 'loot'].includes(e.type)) energy += 0.15;
    }
  }

  // ---------- module change: a refresh sweep and headings that decode ----------
  function onModule(name) {
    if (name === lastModule) return;
    lastModule = name;
    if (!isOn() || !canMove()) return;
    const sweep = $('crt-sweep');
    sweep.classList.remove('go'); void sweep.offsetWidth; sweep.classList.add('go');
    const ws = $('workspace');
    ws.classList.remove('refresh'); void ws.offsetWidth; ws.classList.add('refresh');
    requestAnimationFrame(() => document.querySelectorAll('#page-view h1, #page-view .card > h2').forEach((h, k) => k < 10 && decode(h)));
  }
  const GLYPHS = '!<>-_\\/[]{}=+*^?#0123456789ABCDEF';
  function decode(el) {
    if (el.children.length || !el.textContent.trim()) return;
    const text = el.textContent;
    let f = 0;
    const frames = 12;
    const step = () => {
      if (!el.isConnected || el.textContent.length !== text.length) return;
      const upto = Math.floor((f / frames) * text.length);
      el.textContent = text.split('').map((ch, i) => (i < upto || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (++f <= frames) setTimeout(step, 24); else el.textContent = text;
    };
    step();
  }

  // ---------- body classes: on/off and how much danger you're in ----------
  function apply(module) {
    const s = getState();
    const on = isOn();
    document.body.classList.toggle('shell-on', on);
    // How much danger you're in shows on the screen's edge (screenfx.mjs, Low Signal).
    document.body.classList.toggle('in-fight', on && s.encounter?.phase === 'active');
    $('statusline').hidden = !on;
    if (on) status(module);
  }

  // ---------- status line ----------
  function status(module) {
    const s = getState();
    const e = s.encounter;
    let where;
    if (e?.phase === 'active') where = `<b class="sl-alert">▲ INTRUSION</b> ${esc(e.virus.name)} · cycle ${e.cycle}${e.paused ? ' · paused' : ''}`;
    else if (s.run) where = `<b class="sl-you">ssh</b> ${esc(s.profile?.handle || 'rookie')}@${esc(s.run.loc)}:${esc(s.run.cwd)}`;
    else if (e?.phase === 'alert') where = `${PATHS[module] || '~'} · <b class="sl-alert">intrusion waiting at the gate</b>`;
    else where = PATHS[module] || '~';
    const rx = Math.round(traffic.at(-1) * 2400 + 80);
    const t = new Date();
    const clock = [t.getHours(), t.getMinutes(), t.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    const html = `<span class="sl-host">▌blackbox</span><span class="sl-tty">tty1</span><span class="sl-where">${where}</span>`
      + `<span class="sl-right"><span class="sl-spark" title="Traffic">${traffic.map((v) => SPARK[Math.min(7, Math.floor(v * 8))]).join('')}</span><span class="sl-rx">rx ${rx >= 1000 ? (rx / 1000).toFixed(1) + 'k' : rx}/s</span><span class="sl-clock">${clock}</span></span>`;
    const el = $('statusline');
    if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; }
  }

  // Once a second: traffic drifts (busier in a fight) and the clock ticks.
  function second(module) {
    if (!isOn()) return;
    const s = getState();
    const base = s.encounter?.phase === 'active' ? 0.45 : s.run ? 0.35 : 0.18;
    const v = Math.max(0.03, Math.min(0.99, base + (Math.random() - 0.5) * 0.25 + energy * 0.3));
    energy *= 0.5;
    traffic = [...traffic.slice(1), v];
    status(module);
  }

  // ---------- block cursor ----------
  // The real caret is hidden; a block sits where it would be. Checked every
  // frame so it follows history, Tab completion and hotkeys too.
  function caret() {
    const input = $('command-input');
    const c = $('caret');
    if (!input || !c) return;
    const at = input.selectionStart ?? input.value.length;
    const key = input.value + '|' + at + '|' + input.scrollLeft;
    if (key === caretKey) return;
    const typing = caretKey && caretKey.split('|')[0] !== input.value;
    caretKey = key;
    $('caret-pad').textContent = input.value.slice(0, at);
    c.style.transform = `translate(${-input.scrollLeft}px, -50%)`;
    if (typing) { c.classList.add('typing'); clearTimeout(caret.t); caret.t = setTimeout(() => c.classList.remove('typing'), 500); }
  }

  // New terminal lines type themselves in (the last few, staggered).
  function typeIn(list, added) {
    if (!isOn() || !canMove() || !list || added <= 0) return;
    const kids = [...list.children].slice(-Math.min(added, 6));
    kids.forEach((li, i) => { li.classList.add('typed'); li.style.animationDelay = i * 70 + 'ms'; });
  }

  function mount() { /* key sounds live in sound.mjs now (see app.js) */ }

  return { mount, boot, preview, glitch, react, onModule, apply, second, caret, typeIn, get booting() { return booting; } };
}

const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
