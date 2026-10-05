// BLACKBOX immersive shell: the screen around the game.
// A CRT (scanlines, glow, a rolling refresh band), a boot sequence that reads
// your state back to you, a status line, a block cursor, key clicks, and
// glitches when something hits you. Pure presentation: no rules live here.
// Everything that moves is skipped when Motion is off; `shell plain` turns it all off.

const BOOTED_KEY = 'blackbox-booted';
const SPARK = '▁▂▃▄▅▆▇█';
const PATHS = { map: '~/map', server: '/srv', vault: '~/protocols', loadout: '/etc/loadout', daemons: '/etc/daemons', system: '/sys', net: '~/net', combat: '/proc/intrusion' };

export function createShell({ getState, isOn, canMove, tick }) {
  const $ = (id) => document.getElementById(id);
  let traffic = Array.from({ length: 16 }, () => 0.2 + Math.random() * 0.2);
  let energy = 0;
  let booting = false;
  let caretKey = '';
  let lastModule = null;

  // ---------- boot ----------
  // The boot reads your server back to you, so it's a status report as well as a mood.
  function bootLines(s) {
    const dots = (label, value, ok = 'ok') => `${label} ${'.'.repeat(Math.max(2, 26 - label.length))} ${value}${ok ? `  [ ${ok} ]` : ''}`;
    const cls = s.loadout?.archetype || 'breaker';
    const lvl = s.hackers?.[cls]?.level || 1;
    const lines = [
      { t: 'BLACKBOX/OS 0.9.4 · tty1', c: 'b' },
      { t: dots('memory check', '640K') },
      { t: dots('credits', `${s.server.credits}`, 'ok') },
      { t: dots('integrity', `${s.server.integrity}/${s.server.max}`, s.server.integrity / s.server.max <= 0.25 ? 'crit' : 'ok'), c: s.server.integrity / s.server.max <= 0.25 ? 'h' : '' },
      { t: dots(`loading kit: ${cls}`, `lv ${lvl}`) },
      { t: dots('origins traced', String(s.locations?.length || 0), '') },
      { t: dots('services', `${Object.keys(s.services || {}).length} running`, s.install ? 'installing' : 'ok') },
    ];
    const who = s.profile?.handle || 'rookie';
    if (s.run) lines.push({ t: `resuming session: ssh ${who}@${s.run.loc}`, c: 'y' });
    if (s.encounter?.phase === 'alert') lines.push({ t: `!! intrusion at the gate: ${s.encounter.virus.name}`, c: 'h' });
    else if (s.encounter?.phase === 'active') lines.push({ t: `!! live intrusion: ${s.encounter.virus.name}, cycle ${s.encounter.cycle}`, c: 'h' });
    lines.push({ t: '' }, { t: `login: ${who}`, c: 'y' }, { t: `password: ${'•'.repeat(s.profile?.pwLen || 8)}` }, { t: `last login: ${new Date().toDateString()} from 127.0.0.1` });
    return lines;
  }

  function boot(force = false) {
    if (!isOn() || !canMove()) return;
    try { if (!force && sessionStorage.getItem(BOOTED_KEY)) return; sessionStorage.setItem(BOOTED_KEY, '1'); } catch { /* storage blocked: boot every load */ }
    const el = $('boot');
    const lines = bootLines(getState());
    el.innerHTML = `<pre></pre><small>${matchMedia('(pointer: coarse)').matches ? 'tap' : 'any key'} to skip</small>`;
    el.hidden = false;
    booting = true;
    const pre = el.querySelector('pre');
    let i = 0;
    const done = () => {
      if (!booting) return;
      booting = false;
      clearTimeout(boot.t);
      el.classList.add('out');
      const app = $('app');
      app.classList.remove('power-on'); void app.offsetWidth; app.classList.add('power-on');
      setTimeout(() => { el.hidden = true; el.classList.remove('out'); app.classList.remove('power-on'); }, 420);
      removeEventListener('keydown', done, true);
      removeEventListener('pointerdown', done, true);
    };
    addEventListener('keydown', done, true);
    addEventListener('pointerdown', done, true);
    const next = () => {
      if (!booting) return;
      if (i >= lines.length) { boot.t = setTimeout(done, 380); return; }
      const l = lines[i++];
      const row = document.createElement('div');
      row.className = l.c || '';
      row.textContent = l.t || ' ';
      pre.appendChild(row);
      tick?.(); // the boot lines tick in (heard only once audio is allowed)
      boot.t = setTimeout(next, l.c === 'h' ? 260 : 70 + Math.random() * 90);
    };
    boot.t = setTimeout(next, 250);
  }

  // ---------- glitches ----------
  function glitch(big = false) {
    if (!isOn() || !canMove()) return;
    const w = $('app');
    const cls = big ? 'glitch-big' : 'glitch';
    w.classList.remove('glitch', 'glitch-big'); void w.offsetWidth; w.classList.add(cls);
    const crt = $('crt');
    crt.classList.remove('static'); void crt.offsetWidth; crt.classList.add('static');
    clearTimeout(glitch.t);
    glitch.t = setTimeout(() => { w.classList.remove(cls); crt.classList.remove('static'); }, big ? 650 : 260);
  }

  function react(events) {
    for (const e of events) {
      // A screen-wide glitch only for the big moments; an ordinary hit lands on your bar (app.js).
      if ((e.type === 'server-hit' && e.crit) || ['trap', 'intrusion'].includes(e.type)) { glitch(false); energy += 0.6; }
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
    const hp = s.run ? s.run.integrity / s.run.max : s.server.integrity / s.server.max;
    document.body.classList.toggle('hp-warn', on && hp <= 0.5 && hp > 0.25);
    document.body.classList.toggle('hp-crit', on && hp <= 0.25);
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

  return { mount, boot, glitch, react, onModule, apply, second, caret, typeIn, get booting() { return booting; } };
}

const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
