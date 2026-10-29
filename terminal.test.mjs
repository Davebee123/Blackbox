// Terminal cosmetics (dist/terminal.mjs, dist/boots.mjs, dist/terminal-view.mjs, dist/terminal.css, the boot runner in
// dist/shell.mjs): boot sequences, prompt formats and cursor styles, each from an achievement. The stock look is
// today's exactly, and nothing here changes how the command line takes what you type.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, restore } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { FACTIONS, FACTION_IDS } from './dist/factions.mjs';
import { achievements, achById, earned, developerAchieve, rewardText, terminalRewards } from './dist/achievements.mjs';
import { BOOT_LOOKS, PROMPTS, CURSORS, bootIds, PROMPT_IDS, CURSOR_IDS, bootOf, promptOf, cursorOf, promptLabel, promptText, lookOpen, lookFrom, openLooks, rootFaction } from './dist/terminal.mjs';
import { bootScript, bootLength, garble, FACTION_MARKS, FACTION_VOICE } from './dist/boots.mjs';
import { terminalPageMarkup } from './dist/terminal-view.mjs';
import { achRow } from './dist/achievements-view.mjs';
import { systemMarkup } from './dist/view.mjs';
import { createShell } from './dist/shell.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const me = () => { const s = fresh(); s.tutorialCompleted = true; s.profile = { handle: 'dana', pwLen: 6 }; s.hackers = { breaker: { level: 12, xp: 0 } }; return s; };
const said = (out) => out.map((e) => e.message).join(' ');
const warned = (out) => out.some((e) => e.type === 'warning');
const grant = (s, id) => developerAchieve(s, id);
const run = (ms) => { for (let t = 0; t < ms; t += 10) mock.timers.tick(10); }; // timers set by timers, as they come due
const visible = (b) => b.steps.filter((l) => !l.same);
// The screen's rows once a boot has played: a mark, a line, a count at its end, a line written into the one above.
const endsUp = (b) => b.steps.reduce((rows, l) => { const t = l.art ? l.art.join('\n') : l.count != null ? `${l.t}${l.count}${l.unit}` : l.t || ' '; if (l.same && rows.length) rows[rows.length - 1] = t; else rows.push(t); return rows; }, []);

test('the stock look is today\'s: the boot, the prompt and the cursor, on a new, an old and a played save', () => {
  for (const s of [fresh(), restore(JSON.parse(JSON.stringify(fresh()))), me()]) {
    assert.equal(bootOf(s), 'stock'); assert.equal(promptOf(s), 'stock');
    assert.deepEqual(cursorOf(s), { shape: 'block', blink: true });
    assert.deepEqual(openLooks(s, 'boot'), ['stock']); assert.deepEqual(openLooks(s, 'prompt'), ['stock']); assert.deepEqual(openLooks(s, 'cursor'), ['block']);
  }
  const s = me();
  assert.deepEqual(promptLabel(s), { cls: 'prompt', html: '<span>dana@blackbox:~$</span>' }, 'the prompt app.js always drew');
  assert.deepEqual(promptLabel(fresh()), { cls: 'prompt', html: '<span>rookie@blackbox:~$</span>' });
  // The stock boot, line for line as it was: your server read back to you.
  const b = bootScript(s, 'stock');
  assert.deepEqual(b.steps.slice(0, 4).map((l) => l.t), ['BLACKBOX/OS 0.9.4 · tty1', 'memory check .............. 640K  [ ok ]', 'credits ................... 0  [ ok ]', 'integrity ................. 100/100  [ ok ]']);
  assert.ok(b.steps.every((l) => l.ms == null && !l.art && l.garble == null), 'at the pace it always had (shell.mjs)');
  assert.deepEqual(b.steps.slice(-4).map((l) => l.t.replace(/last login: .*/, 'last login')), ['', 'login: dana', 'password: ••••••', 'last login']);
  assert.equal(b.hold, 380);
  assert.equal(bootScript(s, 'nonsense').id, 'stock', 'an unknown look is stock');
  // index.html and style.css: the prompt, the input and the caret ship as they were.
  const html = read('./dist/index.html');
  assert.match(html, /<label for="command-input" class="prompt"><span>rookie@blackbox:~\$<\/span><\/label>/);
  assert.match(html, /<input id="command-input" aria-label="Command" autocapitalize="off" spellcheck="false" maxlength="160"><span class="caret" id="caret" aria-hidden="true"><span id="caret-pad"><\/span><i><\/i><\/span>/);
  assert.match(read('./dist/style.css'), /\.caret i \{ display: inline-block; width: 0\.6em; height: 1\.1em;[^}]*animation: caret-blink 1\.06s steps\(1\) infinite; \}/);
  // terminal.css: every rule is for a look you picked (a class or data a stock look never carries), or System → Terminal.
  for (const m of strip(read('./dist/terminal.css')).replace(/@media [^{]+\{/g, '').matchAll(/([^{}]+)\{[^}]*\}/g)) {
    for (const sel of m[1].split(',').map((x) => x.trim()).filter(Boolean)) assert.match(sel, /\.boot-art|\.gl\b|\.boot-minimal|\.still|\.boot pre div:last-child::after|\.pf-|data-shape|data-steady|\.tm-|\.ach-rw-term/, sel);
  }
});

test('every boot renders: words on every line, as long as stock\'s or shorter, what waits for you said', () => {
  const s = me();
  const stock = bootLength(bootScript(s, 'stock'));
  assert.ok(stock >= 1800 && stock <= 2000, `stock runs about 1.9 s (${stock})`);
  assert.ok(bootIds().length >= 5, 'stock and at least 4 more');
  for (const id of bootIds()) {
    const b = bootScript(s, id);
    assert.equal(b.id, id);
    assert.ok(bootLength(b) <= stock, `${id}: ${bootLength(b)} ms, no longer than stock`);
    assert.ok(b.steps.length >= 1 && b.steps.some((l) => /\w/.test(l.t || '')), id);
    for (const l of b.steps) assert.ok(l.art || typeof l.t === 'string', `${id}: a line or a mark`);
    assert.ok(b.steps.every((l) => l.ms == null || (l.ms >= 0 && l.ms <= 700)), id);
  }
  // A run to resume and an intrusion at the gate: every look but Minimal says so, in the threat's red.
  const w = me();
  w.encounter = { phase: 'alert', virus: { name: 'LOCKJAW' } };
  for (const id of bootIds().filter((x) => x !== 'minimal')) assert.ok(bootScript(w, id).steps.some((l) => l.c === 'h' && /LOCKJAW/.test(l.t)), id);
  // POST: the memory counts up to 640K, the devices answer OK, your server's integrity among them.
  const bios = bootScript(s, 'bios');
  assert.ok(bios.steps.some((l) => l.count === 640 && l.unit === 'K OK'));
  assert.ok(bios.steps.filter((l) => /\[ OK \]$/.test(l.t)).length >= 4);
  assert.ok(bios.steps.some((l) => /srv0 .*integrity 100\/100/.test(l.t)));
  const low = me(); low.server.integrity = 10;
  assert.ok(bootScript(low, 'bios').steps.some((l) => l.c === 'h' && /\[ CRIT \]/.test(l.t)), 'a server in trouble shows red');
  // A faction's: its mark in ASCII, its colour only on the mark, its name and top tier, a line in its voice.
  for (const f of FACTION_IDS) {
    const b = bootScript(s, 'f-' + f);
    assert.equal(b.fc, FACTIONS[f].color);
    assert.equal(b.cls, 'boot-faction');
    assert.deepEqual(b.steps[0], { art: FACTION_MARKS[f], c: 'm', ms: 300 });
    assert.ok(FACTION_MARKS[f].length >= 3 && FACTION_MARKS[f].every((r) => /^[\x20-\x7e]{1,14}$/.test(r)), `${f}: plain ASCII, small`);
    assert.ok(b.steps.some((l) => l.t === `${FACTIONS[f].name} · ${FACTIONS[f].tiers[4]}`));
    assert.ok(b.steps.some((l) => l.t === FACTION_VOICE[f]));
    assert.match(FACTION_VOICE[f], /^[A-Z][^:;]{8,60}\.$/, `${f}: one or two short sentences`);
  }
  assert.equal(new Set(Object.values(FACTION_MARKS).map((m) => m.join('\n'))).size, FACTION_IDS.length, 'a mark each');
  // Corrupted: each garbled line settles into itself; garbled the same way every time, the same length (nothing jumps).
  const g = bootScript(s, 'glitch');
  const gl = g.steps.filter((l) => l.garble != null);
  assert.ok(gl.length >= 3);
  for (const l of gl) { assert.notEqual(l.garble, l.t); assert.equal([...l.garble].length, [...l.t].length); assert.equal(l.garble, garble(l.t)); }
  assert.ok(g.steps.some((l) => /recovered/.test(l.t || '')), 'and says what it fixed');
  // Minimal: the cursor alone, then one line.
  const m = bootScript(s, 'minimal');
  assert.equal(visible(m).length, 1);
  assert.equal(m.steps.at(-1).t, 'dana@blackbox ready');
});

// A stand-in page for shell.mjs's boot: #boot, #app, the window's key and pointer listeners.
function fakePage() {
  const on = {};
  const node = (tag) => {
    const e = { tagName: tag, children: [], className: '', textContent: '', dataset: {}, hidden: true, offsetWidth: 1, style: { p: {}, setProperty(k, v) { this.p[k] = v; }, removeProperty(k) { delete this.p[k]; } } };
    e.classList = { add: (...c) => { e.className = [...new Set([...e.className.split(' ').filter(Boolean), ...c])].join(' '); }, remove: (...c) => { e.className = e.className.split(' ').filter((x) => x && !c.includes(x)).join(' '); }, contains: (c) => e.className.split(' ').includes(c) };
    e.appendChild = (ch) => { e.children.push(ch); return ch; };
    Object.defineProperty(e, 'lastElementChild', { get: () => e.children.at(-1) || null });
    Object.defineProperty(e, 'innerHTML', { set(v) { e._html = v; e.children = []; e.pre = v.includes('<pre>') ? node('pre') : null; }, get: () => e._html });
    e.querySelector = (q) => (q === 'pre' ? e.pre : null);
    return e;
  };
  const els = { boot: node('div'), app: node('div') };
  els.boot.className = 'boot';
  globalThis.document = { getElementById: (id) => els[id] || null, createElement: node };
  globalThis.addEventListener = (t, f) => (on[t] ||= new Set()).add(f);
  globalThis.removeEventListener = (t, f) => on[t]?.delete(f);
  globalThis.matchMedia = () => ({ matches: false });
  const key = (k = 'a') => [...(on.keydown || [])].forEach((f) => f({ type: 'keydown', key: k }));
  return { boot: els.boot, lines: () => els.boot.pre.children.map((c) => c.textContent), key, listening: () => (on.keydown?.size || 0) + (on.pointerdown?.size || 0) };
}
const shellFor = (s, { motion = true } = {}) => { const ticks = []; const sh = createShell({ getState: () => s, isOn: () => true, canMove: () => motion, tick: () => ticks.push(1), sound: () => {} }); return { sh, ticks }; };

test('each boot plays on the screen, ends by itself, and a key skips it; Motion off shows it still', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const s = me();
    for (const id of bootIds()) {
      const pg = fakePage(), { sh, ticks } = shellFor(s), b = bootScript(s, id);
      sh.preview(id);
      assert.ok(sh.booting && !pg.boot.hidden && pg.boot.dataset.boot === id, `${id} is up`);
      assert.match(pg.boot.className, new RegExp(`^boot ${b.cls}$`));
      assert.equal(pg.boot.style.p['--fc'], b.fc, `${id}: its accent, or none`);
      run(bootLength(b) + 200 * b.steps.length);
      assert.ok(!sh.booting, `${id} ends by itself`);
      assert.deepEqual(pg.lines(), endsUp(b), `${id}: every line as it ends up`);
      assert.equal(ticks.length, b.steps.length, `${id}: one tick a line, the sound the boot always had`);
      run(500);
      assert.ok(pg.boot.hidden && pg.boot.className === 'boot' && !pg.boot.style.p['--fc'] && pg.listening() === 0, `${id}: the screen opens and lets go of the keys`);
      // Skipped: the first key ends it, as the stock boot always did.
      const pg2 = fakePage(), { sh: sh2 } = shellFor(s);
      sh2.preview(id);
      run(300);
      pg2.key();
      assert.ok(!sh2.booting, `${id}: a key skips it`);
      run(500);
      assert.ok(pg2.boot.hidden && pg2.listening() === 0);
    }
    // Motion off: every line at once, as it ends up (no count, no garble), no ticks, and a key closes it.
    for (const id of ['bios', 'glitch', 'f-glassjaw', 'minimal']) {
      const pg = fakePage(), { sh, ticks } = shellFor(s, { motion: false }), b = bootScript(s, id);
      sh.preview(id);
      assert.match(pg.boot.className, / still$/);
      assert.equal(pg.boot.pre.children.length, visible(b).length, `${id}: all at once`);
      assert.ok(!pg.boot.pre.children.some((c) => /\bgl\b/.test(c.className)), 'nothing garbled');
      assert.equal(ticks.length, 0);
      pg.key();
      mock.timers.tick(10);
      assert.ok(pg.boot.hidden, `${id}: a key closes it at once`);
    }
    // A corrupted line shows garbled first, then settles.
    const pg = fakePage(), { sh } = shellFor(s), g = bootScript(s, 'glitch');
    sh.preview('glitch');
    run(260);
    assert.equal(pg.lines()[0], g.steps[0].garble);
    assert.match(pg.boot.pre.children[0].className, /\bgl\b/);
    run(160);
    assert.equal(pg.lines()[0], g.steps[0].t);
    pg.key();
  } finally { mock.timers.reset(); }
});

test('at launch the boot you picked plays after the power-up, and the stock one by default (shell.mjs, app.js)', () => {
  const src = read('./dist/shell.mjs');
  assert.match(src, /powerOn\(\{ sound, reducedMotion: \(\) => !canMove\(\) \}\)\.then\(\(\) => bootLinesRun\(bootOf\(getState\(\)\)\)\)/);
  assert.match(src, /function boot\(force = false\) \{\n    if \(!isOn\(\) \|\| !canMove\(\)\) return;/, 'skipped with Motion off, as it always was');
  assert.doesNotMatch(src, /sound\('(?!jackin)/, 'no new sounds');
  const app = read('./dist/app.js');
  assert.match(app, /if \(text === 'terminal preview' \|\| text\.startsWith\('terminal preview '\)\) return bootPreview/);
  assert.match(app, /if \(!lookOpen\(campaign, 'boot', id\)\) return notice/, 'a locked boot isn\'t previewed');
});

test('locked looks can\'t be chosen, and the unlocks follow achievements', () => {
  const s = me();
  const R = terminalRewards();
  for (const [id, r] of Object.entries(R)) {
    assert.ok(achById(id), `${id} is an achievement`);
    for (const [kind, look] of Object.entries(r)) assert.ok({ boot: BOOT_LOOKS(), prompt: PROMPTS, cursor: CURSORS }[kind][look], `${id}: ${kind} ${look}`);
  }
  for (const [kind, ids] of [['boot', bootIds()], ['prompt', PROMPT_IDS], ['cursor', CURSOR_IDS]]) {
    for (const id of ids.slice(1)) {
      assert.ok(lookFrom(kind, id).length >= 1, `${kind} ${id} comes with an achievement`);
      const out = play(s, `terminal ${kind} ${id}`);
      assert.ok(warned(out), `${kind} ${id} is locked`);
      assert.match(said(out), /comes with/);
      assert.notEqual(s.cosmetics?.[kind], id);
    }
  }
  assert.deepEqual(s.cosmetics || {}, {}, 'nothing chosen');
  // A save that names a look you don't hold shows stock (and never the locked one).
  const t = me(); t.cosmetics = { boot: 'bios', prompt: 'lambda', cursor: 'beam' };
  assert.equal(bootOf(t), 'stock'); assert.equal(promptOf(t), 'stock'); assert.equal(cursorOf(t).shape, 'block');
  // Earning the achievement opens it, for good.
  grant(t, 'c-patient'); grant(t, 't-program'); grant(t, 'd-ten');
  assert.ok(earned(t, 'c-patient'));
  assert.equal(bootOf(t), 'bios'); assert.equal(promptOf(t), 'lambda'); assert.equal(cursorOf(t).shape, 'beam');
  // Each one, by its achievement.
  const pairs = [['boot', 'bios', 'c-patient'], ['boot', 'glitch', 't-thread'], ['boot', 'minimal', 't-norest'], ['prompt', 'title', 'k-matched'], ['prompt', 'arrow', 't-cuts'], ['prompt', 'lambda', 't-program'], ['prompt', 'powerline', 'cl-sub'], ['cursor', 'underline', 'x-mapped'], ['cursor', 'beam', 'd-ten'],
    ...FACTION_IDS.flatMap((f) => [['boot', 'f-' + f, 'f-' + f], ['prompt', 'root', 'f-' + f]])];
  for (const [kind, id, ach] of pairs) {
    const x = me();
    assert.ok(!lookOpen(x, kind, id));
    grant(x, ach);
    assert.ok(lookOpen(x, kind, id), `${ach} opens ${kind} ${id}`);
    const out = play(x, `terminal ${kind} ${id}`);
    assert.ok(!warned(out), said(out));
    assert.equal(kind === 'boot' ? bootOf(x) : kind === 'prompt' ? promptOf(x) : cursorOf(x).shape, id);
    // A faction's boot only with its own top tier.
    if (kind === 'boot' && id.startsWith('f-')) for (const g of FACTION_IDS.filter((g) => 'f-' + g !== id)) assert.ok(!lookOpen(x, 'boot', 'f-' + g));
  }
  // By name too, and back to stock (which leaves nothing on the save).
  const y = me(); grant(y, 'f-glassjaw');
  assert.ok(!warned(play(y, 'terminal boot glassjaw')));
  assert.equal(bootOf(y), 'f-glassjaw');
  play(y, 'terminal boot stock');
  assert.equal(y.cosmetics.boot, undefined);
  // The rewards show on the achievement: its tooltip's words and a chip by name.
  assert.match(rewardText(achById('c-patient')), /a boot sequence/);
  assert.match(rewardText(achById('f-kestrel')), /a casing colourway, a boot sequence and a prompt\.$/);
  assert.match(rewardText(achById('x-mapped')), /^Rewards a cursor\.$/);
  const z = me(); grant(z, 'c-patient');
  assert.match(achRow(z, achById('c-patient')), /<b>POST boot<\/b>/);
  // Reused achievements only: the table and its points are as they were.
  assert.equal(achievements().filter((a) => R[a.id]).length, Object.keys(R).length);
});

test('every prompt format renders, escaped, one line high, and the input stays exactly as it was', () => {
  const s = me();
  developerAchieve(s, 'all');
  s.standing = { halcyon: 80, glassjaw: 90, kestrel: 76, lantern: 75, nullchoir: 75 };
  s.profile.titles = ['uncrowner', 'lastnote']; s.profile.title = 'lastnote';
  assert.equal(rootFaction(s), 'glassjaw', 'the faction you stand highest with');
  assert.deepEqual(PROMPT_IDS.map((id) => promptText(s, id)), ['dana@blackbox:~$', 'root@glassjaw#', 'dana@last-note:~$', '>', 'λ', ['.-[dana]-[breaker 12]-[~]', "'-$"]]);
  s.profile.title = null;
  assert.equal(promptText(s, 'title'), 'dana@blackbox:~$', 'no title shown: the box');
  for (const id of PROMPT_IDS) {
    const L = promptLabel(s, id);
    assert.equal(L.cls, id === 'stock' ? 'prompt' : `prompt pf-${id}`);
    assert.ok(!/\b(run|acting|hub)\b/.test(L.cls), 'never a run\'s or a fight\'s class');
    assert.match(L.html, /^<span[ >]/);
    assert.ok(play(s, `terminal prompt ${id}`).every((e) => e.type !== 'warning'));
  }
  const odd = me(); odd.profile.handle = '<b>&'; developerAchieve(odd, 'all');
  for (const id of PROMPT_IDS) assert.ok(!/<b>&/.test(promptLabel(odd, id).html), `${id} escapes`);
  // app.js: only the home prompt takes the format; a run, a breach, a hub and a fight keep theirs.
  const app = read('./dist/app.js');
  const fn = app.slice(app.indexOf('function renderPrompt()'), app.indexOf('// The Now band'));
  assert.equal((fn.match(/promptLabel\(/g) || []).length, 1);
  assert.match(fn, /\} else \{\n[^\n]*\n    const P = promptLabel\(campaign\);\n    el\.className = P\.cls;\n    el\.innerHTML = P\.html;/);
  for (const was of ["el.className = 'prompt acting'", "el.className = 'prompt hub'", "el.className = 'prompt run ' + V.signalLevel(r)"]) assert.ok(fn.includes(was), was);
  assert.doesNotMatch(fn, /command-input'\)\.(focus|blur|value|disabled|readOnly)|addEventListener/, 'the input is never touched');
  // The touch-screen rule stands: focusPrompt skips touch, and the only direct focus is a printable key.
  const direct = app.split('\n').filter((l) => /\$\('command-input'\)\.focus\(|input\.focus\(/.test(l));
  assert.equal(direct.length, 2);
  assert.ok(direct.some((l) => /const focusPrompt = \(\) => \{ if \(touch\(\) \|\| lastPointer === 'touch'/.test(l)));
  // The same height: terminal.css never sizes the command line, and the two-line one fits in the input's height.
  const css = strip(read('./dist/terminal.css'));
  assert.doesNotMatch(css, /#command-form|#command-input|\.prompt-row|\.command-dock/);
  const two = css.match(/\.prompt\.pf-powerline \.p-two \{([^}]*)\}/)?.[1] || '';
  assert.match(two, /line-height: 14px/);
  assert.ok(2 * 14 <= 16 * 1.2 + 22, 'two 14px lines within the input\'s 11px padding and its line');
  assert.doesNotMatch(css, /\.prompt[^{]*\{[^}]*[\s;{](height|min-height|padding[\w-]*|margin[\w-]*)\s*:/, 'no prompt rule adds height');
});

test('cursor styles apply on the caret only, blink or steady, and the input keeps its own caret rules', () => {
  const s = me(); developerAchieve(s, 'all');
  for (const id of CURSOR_IDS) { play(s, `terminal cursor ${id}`); assert.equal(cursorOf(s).shape, id); }
  play(s, 'terminal blink off'); assert.equal(cursorOf(s).blink, false); assert.equal(s.cosmetics.steady, true);
  play(s, 'terminal blink on'); assert.equal(cursorOf(s).blink, true); assert.equal(s.cosmetics.steady, undefined);
  assert.ok(warned(play(s, 'terminal blink maybe')));
  // Blink is everyone's: a steady cursor is a comfort, not a reward.
  const f = me(); assert.ok(!warned(play(f, 'terminal blink off'))); assert.equal(cursorOf(f).blink, false);
  const css = strip(read('./dist/terminal.css'));
  assert.match(css, /\.caret\[data-shape='underline'\] i \{ height: 0\.14em;/);
  assert.match(css, /\.caret\[data-shape='beam'\] i \{ width: 2px; \}/);
  assert.match(css, /\.caret\[data-steady\] i \{ animation: none; \}/);
  const app = read('./dist/app.js');
  assert.match(app, /const c = \$\('caret'\), cur = cursorOf\(campaign\);\n  if \(cur\.shape === 'block'\) delete c\.dataset\.shape; else c\.dataset\.shape = cur\.shape;\n  if \(cur\.blink\) delete c\.dataset\.steady; else c\.dataset\.steady = '';/, 'the block carries nothing: stock');
  // Motion off and reduced motion still stop it (style.css, as before).
  assert.match(read('./dist/style.css'), /\.no-motion \.caret i/);
});

test('System → Terminal: yours to pick, the rest dim and locked with what brings each, Preview, and nothing written', () => {
  const s = me();
  assert.match(systemMarkup(s), /data-stab="terminal"/, 'a tab on the System page');
  const html = systemMarkup(s, { tab: 'terminal' });
  assert.deepEqual(s.cosmetics, undefined, 'a view never writes the save');
  assert.match(html, /<h2>Boot<\/h2>/); assert.match(html, /<h2>Prompt<\/h2>/); assert.match(html, /<h2>Cursor<\/h2>/);
  assert.match(html, /data-run="terminal preview"[^>]*>Preview<\/button>/);
  assert.match(html, /data-run="terminal blink off" aria-pressed="true"[^>]*>Blink on<\/button>/);
  for (const [kind, ids] of [['boot', bootIds()], ['prompt', PROMPT_IDS], ['cursor', CURSOR_IDS]]) {
    const stock = ids[0];
    assert.match(html, new RegExp(`<button type="button" class="tm-opt" data-tm-${kind}="${stock}" data-run="terminal ${kind} ${stock}" aria-pressed="true"`));
    for (const id of ids.slice(1)) {
      assert.match(html, new RegExp(`<span class="tm-opt locked" data-tm-${kind}="${id}" title="[^"]*Comes with [^"]+\\."`), `${kind} ${id} locked`);
      assert.doesNotMatch(html, new RegExp(`data-run="terminal ${kind} ${id}"`), `${kind} ${id} can't be clicked`);
    }
  }
  assert.match(html, /data-tm-boot="glitch" title="Corrupted: [^"]*Comes with a hidden achievement\."/, 'a hidden one stays hidden');
  developerAchieve(s, 'all');
  const all = terminalPageMarkup(s);
  assert.doesNotMatch(all, /tm-opt locked/);
  for (const f of FACTION_IDS) assert.match(all, new RegExp(`data-tm-boot="f-${f}"[^>]*>[^]*?--fc:${FACTIONS[f].color}`));
  // The words: "Name: what it is." in sentence case, no intrusion metaphors, no teal (the player's) in the picker.
  for (const L of [...Object.values(BOOT_LOOKS()), ...Object.values(PROMPTS), ...Object.values(CURSORS)]) {
    assert.match(L.name, /^[^:.\n]{2,20}$/); assert.match(L.tip, /^[A-Z][^:;]*\.$/, L.tip);
    assert.ok(!/keyhole|way in|backdoor|hack|breach|intru/i.test(L.name + L.tip), L.name);
  }
  for (const v of Object.values(FACTION_VOICE)) assert.ok(!/keyhole|way in|backdoor/i.test(v));
  assert.doesNotMatch(read('./dist/terminal.css'), /--you|#7fd1c7/, 'teal is only ever the player');
  // The faction colour is an accent only: the mark, nowhere else.
  for (const m of strip(read('./dist/terminal.css')).matchAll(/([^{}]+)\{([^}]*var\(--fc[^}]*)\}/g)) assert.match(m[1], /\.boot-art|\.tm-mark/, m[1]);
});

test('GAME_RULES.md says it, and README.md maps it', () => {
  const md = read('./GAME_RULES.md');
  assert.match(md, /System → \*\*Terminal\*\*/);
  for (const w of ['POST', 'Corrupted', 'Minimal', 'Two-line', 'Underline', 'Beam', '`terminal preview']) assert.ok(md.includes(w), w);
  assert.match(read('./README.md'), /\| `dist\/terminal\.mjs`/);
});
