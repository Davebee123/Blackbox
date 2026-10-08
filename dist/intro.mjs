// First launch: log in to a terminal somebody set up for you, then a transmission from Halcyon.
//
// 1. Login. A bare tty asks for a handle and a password. The handle becomes your name on the
//    prompt; the password is never kept (only its length, so later boots can echo the stars).
// 2. The transmission. The screen drops out, an encrypted channel opens, and Halcyon Mutual's
//    Office of Loss Prevention tells you why the box exists and that wick will write to you.
//
// createIntro({ key, sound, reducedMotion }) → { run(state) → Promise<{ handle, pwLen }> }

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const HANDLE = /^[a-z0-9_.-]{2,16}$/;

export const letter = (handle) => [
  `${handle},`,
  'This terminal was set up for you last night. Don\'t go looking for the purchase order. There isn\'t one.',
  'Halcyon Mutual insures half the servers on this net. Something keeps getting into them, and every breach is a claim we pay.',
  'We don\'t hire people like you. We pay the people who do. One of them, who goes by wick, will write to you. Check your mail once you\'re in.',
  'Keep this box standing. We read every claim.',
];

export function createIntro({ key = () => {}, sound = () => {}, reducedMotion = () => false } = {}) {
  let el;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 60) : ms));

  function mount() {
    el = document.createElement('div');
    el.id = 'intro';
    el.className = 'boot intro';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Log in');
    el.innerHTML = '<pre class="intro-tty"></pre>';
    document.body.appendChild(el);
    return el.querySelector('pre');
  }
  const line = (pre, text, cls = '') => { const d = document.createElement('div'); d.className = cls; d.textContent = text || ' '; pre.appendChild(d); key('char'); return d; };

  // One prompt line with a real input on it. Resolves with what was typed.
  function ask(pre, label, { secret = false, check } = {}) {
    return new Promise((resolve) => {
      const row = document.createElement('div');
      row.className = 'intro-ask';
      row.innerHTML = `<label>${esc(label)}</label><span class="intro-field"><input ${secret ? 'type="password"' : 'type="text"'} autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32"></span>`;
      pre.appendChild(row);
      const input = row.querySelector('input');
      const keep = () => setTimeout(() => input.isConnected && document.activeElement !== input && input.focus(), 0);
      input.addEventListener('blur', keep);
      input.addEventListener('input', () => key('char'));
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Backspace') key('back');
        if (e.key !== 'Enter') return;
        e.preventDefault();
        key('enter');
        const v = secret ? input.value : input.value.trim().toLowerCase();
        const why = check?.(v);
        if (why) { const bad = line(pre, `${label} ${secret ? '•'.repeat(v.length) : v}`, 'dim'); pre.insertBefore(bad, row); pre.insertBefore(line(pre, why, 'h'), row); input.value = ''; input.focus(); return; }
        input.removeEventListener('blur', keep);
        row.querySelector('.intro-field').textContent = secret ? '•'.repeat(v.length) : v;
        resolve(v);
      });
      input.focus();
    });
  }

  async function type(target, text, speed = 16) {
    if (reducedMotion()) { target.textContent = text; return; }
    target.textContent = '';
    for (let i = 0; i < text.length; i++) {
      if (target.dataset.skip) { target.textContent = text; return; }
      target.textContent += text[i];
      if (i % 3 === 0) key('char');
      await sleep(text[i] === '.' || text[i] === ',' ? speed * 6 : speed);
    }
  }

  // opts.letter: the transmission's paragraphs for a handle (the campaign brings its own).
  async function run(opts = {}) {
    const pre = mount();
    await sleep(350);
    line(pre, 'BLACKBOX/OS 0.9.4 · tty1', 'b');
    await sleep(160);
    line(pre, `provisioned ${new Date(Date.now() - 9 * 3600e3).toUTCString().replace(' GMT', '')} UTC`);
    await sleep(120);
    line(pre, 'owner ........................ (unassigned)');
    await sleep(120);
    line(pre, 'halcyon-mdm: remote enrollment complete', 'y');
    await sleep(120);
    line(pre, 'this terminal has not been logged in to');
    line(pre, '');
    await sleep(300);
    const handle = await ask(pre, 'blackbox login:', { check: (v) => (HANDLE.test(v) ? null : 'login: 2–16 letters, numbers, dots, dashes or underscores.') });
    const pw = await ask(pre, 'password:', { secret: true, check: (v) => (v.length >= 4 ? null : 'password: at least 4 characters.') });
    await sleep(200);
    const v = line(pre, 'verifying');
    for (let i = 0; i < 3; i++) { await sleep(260); v.textContent += ' .'; key('char'); }
    v.textContent += ' ok';
    await sleep(200);
    line(pre, `welcome, ${handle}. last login: never.`, 'y');
    await sleep(380);
    line(pre, '1 transmission waiting. channel: encrypted.', 'h');
    await sleep(900);
    await transmission(handle, opts.letter || letter);
    el.classList.add('out');
    await sleep(420);
    el.remove();
    return { handle, pwLen: pw.length };
  }

  // The transmission: static, a decode bar, then the letter types out. Click or Enter finishes it.
  async function transmission(handle, paras0 = letter) {
    el.classList.add('rx');
    sound('pager');
    const box = document.createElement('div');
    box.className = 'intro-rx';
    box.innerHTML = `<div class="rx-static"></div>
      <div class="rx-card">
        <header><span class="rx-kicker">Incoming · encrypted</span><span class="rx-bar"><i></i></span></header>
        <div class="rx-meta" hidden><div><b>From</b>Halcyon Mutual · Office of Loss Prevention</div><div><b>To</b>${esc(handle)}@blackbox</div><div><b>Re</b>your terminal</div></div>
        <div class="rx-body"></div>
        <footer hidden><span class="rx-sig">— Loss Prevention, Desk 7</span><button type="button" class="btn primary rx-ack">Acknowledge</button></footer>
      </div>`;
    el.appendChild(box);
    await sleep(900);
    box.querySelector('.rx-bar').classList.add('done');
    await sleep(700);
    box.querySelector('.rx-kicker').textContent = 'Halcyon Mutual · decrypted';
    box.querySelector('.rx-meta').hidden = false;
    key('enter');
    const body = box.querySelector('.rx-body');
    let skip = false;
    const finish = (e) => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; skip = true; body.querySelectorAll('p').forEach((p) => { p.dataset.skip = '1'; }); };
    addEventListener('keydown', finish, true);
    box.addEventListener('pointerdown', finish);
    const paras = paras0(handle);
    for (const text of paras) {
      const p = document.createElement('p');
      body.appendChild(p);
      if (skip) { p.textContent = text; continue; }
      await type(p, text);
      await sleep(skip ? 0 : 320);
    }
    removeEventListener('keydown', finish, true);
    const foot = box.querySelector('footer');
    foot.hidden = false;
    const ack = foot.querySelector('.rx-ack');
    ack.focus();
    await new Promise((resolve) => {
      ack.addEventListener('click', resolve, { once: true });
      ack.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); resolve(); } });
    });
    key('enter');
  }

  return { run };
}
