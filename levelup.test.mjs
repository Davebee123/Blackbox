// The level-up (dist/levelup-view.mjs, dist/levelup-ui.mjs, dist/levelup.css): a firmware update under the top bar. It
// lists every unlock the level brings, each row's detail in its tooltip; it never comes up during a fight or over a
// card that waits for you, and nothing goes over the fight board. The old banner and the prototypes' switch are gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fresh, gainXp, levelUpPreview, barKeys } from './dist/combat.mjs';
import { xpToNext, ARCHETYPES } from './dist/data.mjs';
import { systemMarkup } from './dist/view.mjs';
import * as LV from './dist/levelup-view.mjs';
import { createLevelUpUi } from './dist/levelup-ui.mjs';

const { levelUpSummary, gainItem, firmwareMarkup, bigDigits, KINDS, luCalm } = LV;
const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const at = (cls, level, sub = null) => { const s = fresh(); s.loadout.archetype = cls; s.hackers = { [cls]: { level, xp: 0 } }; if (sub) s.loadout.sub = { [cls]: sub }; return s; };
// Every kind of unlock: skills (3), protocol bases and the kit talent (5), a floor (7), the subclass to pick and SIGINT
// and a talent point (10), the Implant slot and a daemon slot (15), a protocol slot (30), the capstone point (45) and
// its second rank (50); a picked subclass's edge (10); server memory (off for now: its words, by hand).
function everyKind() {
  const s = at('breaker', 1);
  const evs = [3, 5, 7, 10, 15, 30, 45, 50].map((L) => levelUpPreview(s, L));
  evs.push(levelUpPreview(at('breaker', 10, 'demolitionist'), 10));
  evs.push({ ...levelUpPreview(s, 12), gains: ['server memory +1'] });
  return evs;
}

test('a preview is the level-up gainXp logs at that level, and changes nothing', () => {
  const s = at('breaker', 9), before = JSON.stringify(s);
  const p = levelUpPreview(s, 10);
  assert.equal(JSON.stringify(s), before, 'the save is as it was');
  gainXp(s, xpToNext(9), 'test');
  const up = s.logs.findLast((e) => e.type === 'level-up');
  for (const k of ['level', 'arch', 'unlocked', 'gains', 'next', 'server']) assert.deepEqual(p[k], up[k], k);
  assert.equal(up.arch, 'breaker', 'the event names its class');
  assert.ok(p.preview && !up.preview);
});

test('every unlock is a row, with its detail in a tooltip; the power line, the Integrity and the next level follow', () => {
  const evs = everyKind(), sum = levelUpSummary(evs);
  const kinds = new Set(sum.items.map((it) => it.kind));
  for (const k of Object.keys(KINDS)) assert.ok(kinds.has(k), `a ${k} row`);
  for (const e of evs) for (const g of e.gains) assert.ok(sum.items.some((it) => it.label === gainItem(g, e).label), g);
  const h = firmwareMarkup(sum);
  for (const it of sum.items) {
    assert.ok(plain(h).includes(it.label), it.label);
    assert.match(h, new RegExp(`class="lu-row k-${it.kind}"[^>]*title="[^"]+: [^"]+"`), `${it.kind} has a Name: sentence tooltip`);
  }
  assert.doesNotMatch(h, /undefined|NaN|\[object/);
  assert.ok(h.includes('data-module="loadout"') && h.includes('data-lu-close'), 'Loadout and Continue');
  const one = levelUpPreview(at('breaker', 9), 10), s1 = levelUpSummary([one]), h1 = plain(firmwareMarkup(s1));
  assert.ok(s1.items.some((it) => it.kind === 'power' && it.value === '+4%') && s1.items.some((it) => it.kind === 'integrity' && it.value === String(one.server)));
  assert.ok(s1.next && s1.next.level === one.next.level && h1.includes('v11 · Protocol bases +4'), 'the next level that brings something');
  assert.match(h1, /Firmware update · breaker\.rom/);
  assert.match(firmwareMarkup(s1), /v9 → <b>v10<\/b>/);
  assert.equal((h1.match(/\[ OK \]/g) || []).length, s1.items.length, '[ OK ] per unlock');
});

test('the tooltips read in the game\'s voice: Name, then plain sentences with the real numbers', () => {
  const sum = levelUpSummary(everyKind(), [['3', 'flood']]);
  for (const it of sum.items) {
    assert.match(it.tip, /^[^:.\n]{2,40}: [A-Z]/, it.tip);
    assert.ok(/\.$/.test(it.tip), `${it.tip} ends a sentence`);
    assert.doesNotMatch(it.tip, /;|\b(keyhole|way in|backdoor)\b/i, it.tip);
  }
  const g = (kind) => sum.items.find((it) => it.kind === kind);
  assert.match(g('floor').tip, /^Backhaul: Floor 2\. Its viruses are level 7 to 14\.$/);
  assert.match(g('subclass').tip, /Demolitionist or Overclocker/);
  assert.match(g('edge').tip, /^Overkill: When your hit breaks a part/);
  assert.match(g('kit').tip, /^Overclocked Core: Increases all damage you deal by 6%/);
  assert.equal(g('skill').value, 'key 3', 'a new skill shows the key it went on');
  assert.equal(g('sigint').value, 'key -');
  assert.equal(sum.items.find((it) => it.label === 'Talent point').value, '+4', 'counted kinds add up (10, 10 with a subclass, 30, 50)');
  for (const it of sum.items) assert.ok(it.label.length <= 24 && /^[A-Z]/.test(it.label), it.label);
});

test('the level in big digits: a 3 by 5 dot font, each dot two characters wide', () => {
  const big = bigDigits(10).split('\n');
  assert.equal(big.length, 5);
  assert.equal(plain(big[0]).length, 14, 'two digits of three double-width dots and a gap');
  assert.equal(bigDigits(7).split('\n').length, 5);
});

test('never during a fight, and never over a card that waits for you', () => {
  assert.equal(luCalm({}), true);
  for (const k of ['fighting', 'ended', 'spoils', 'gainModal', 'booting']) assert.equal(luCalm({ [k]: true }), false, k);
});

// A stand-in page for levelup-ui.mjs: the host, the prompt and the top bar.
function fakePage() {
  const el = (id) => ({ id, hidden: true, innerHTML: '', className: '', dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, offsetWidth: 1, classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); } }, addEventListener() {}, getBoundingClientRect: () => ({ left: 20, right: 1420, top: 760, bottom: 800, width: 1400, height: 40 }) });
  const els = { levelup: el('levelup'), 'command-form': el('command-form') }, bar = el('bar');
  bar.getBoundingClientRect = () => ({ left: 0, right: 1440, top: 0, bottom: 64, width: 1440, height: 64 });
  globalThis.document = { getElementById: (id) => els[id] || null, querySelector: (q) => (q === '.topbar' ? bar : null) };
  globalThis.addEventListener = () => {};
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900;
  return { host: els.levelup };
}
test('it waits for the fight\'s end and the spoils, goes when a fight comes up, and Enter or Esc takes it away', () => {
  const { host } = fakePage();
  let fighting = true, cards = false;
  const sounds = [];
  const ui = createLevelUpUi({ feel: { add: (k) => sounds.push(k) }, calm: () => !fighting && !cards, fighting: () => fighting, motion: () => false });
  ui.push(levelUpPreview(at('breaker', 9), 10));
  for (let i = 0; i < 5; i++) ui.tick();
  assert.ok(host.hidden && !ui.showing() && ui.pending() === 1, 'nothing during the fight');
  fighting = false; cards = true; ui.tick();
  assert.ok(host.hidden, 'nor over the spoils');
  cards = false; ui.tick();
  assert.ok(!host.hidden && ui.showing() && host.className.startsWith('levelup lu-b'), 'up once it is calm');
  assert.ok(host.innerHTML.includes('Subclass') && host.innerHTML.includes('SIGINT') && host.innerHTML.includes('[ OK ]'));
  assert.equal(sounds[0], 'win', 'the level\'s own sound, nothing new');
  assert.ok(sounds.every((k) => ['win', 'cycle'].includes(k)));
  assert.ok(host.style['--lu-bottom'] && host.style['--lu-top'], 'under the top bar, or over the prompt on a phone');
  fighting = true; ui.tick();
  assert.ok(host.hidden && !ui.showing(), 'a fight sends it away');
  fighting = false; ui.push(levelUpPreview(at('breaker', 10), 11)); ui.tick();
  assert.ok(ui.dismiss() && host.hidden, 'Enter or Esc takes it away');
  assert.equal(ui.dismiss(), false);
});

test('rows take no room until they land: the panel grows a row at a time, never an empty block', () => {
  const css = strip(read('./dist/levelup.css'));
  const kf = css.match(/@keyframes lu-b-row \{ from \{([^}]*)\}/)?.[1] || '';
  assert.match(kf, /max-height: 0/); assert.match(kf, /padding-top: 0/);
  assert.match(css, /\.levelup\.show \.lu-b-list li, \.levelup\.show \.lu-b-next \{ animation: lu-b-row [^;]* both;/, 'held at no height until its delay');
  assert.match(css, /\.levelup\.show \.lu-b-list \{ animation: lu-b-pad [^;]* both;/, 'and the empty list has no padding');
  assert.doesNotMatch(css, /\.lu-b-list li[^{]*\{[^}]*opacity: 0[^}]*\}/, 'never a row that waits invisible but takes its room');
});

test('nothing over the fight board: the host is outside the fight view, docked under the top bar or over the prompt', () => {
  const html = read('./dist/index.html');
  const fight = html.slice(html.indexOf('<section id="combat-view"'), html.indexOf('<section id="page-view"'));
  assert.ok(!/levelup/.test(fight), 'not in the fight view');
  assert.match(html, /<!-- The level-up \(levelup-ui\.mjs\)[^\n]*-->\n<div id="levelup" class="levelup" role="status" aria-live="polite" hidden><\/div>/);
  assert.match(html, /<link rel="stylesheet" href="levelup\.css">/);
  assert.doesNotMatch(html, /lu-proto|lv-plate/, 'no prototype hosts, no plate on the casing');
  const css = strip(read('./dist/levelup.css')).replace(/@keyframes [\w-]+ \{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, '').replace(/@media [^{]+\{/g, '');
  for (const m of css.matchAll(/([^{}@]+)\{[^}]*\}/g)) for (const sel of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
    assert.ok(/^(\.no-motion )?\.levelup\b/.test(sel), `${sel}: only the level-up`);
    assert.doesNotMatch(sel, /\.board|#board|#combat-view|\.app\b|\.workspace|#hud|#casing|\.lamp/, sel);
  }
  assert.match(css, /\.levelup \{[^}]*position: fixed;[^}]*top: var\(--lu-top/);
  assert.match(css, /\.levelup \{ top: auto; bottom: var\(--lu-bottom/);
  assert.doesNotMatch(css, /inset: 0/, 'never a full-screen cover');
  const style = strip(read('./dist/style.css'));
  assert.doesNotMatch(style, /\.levelup|lu-head|lu-timer|levelup-in/, 'the old banner\'s rules are gone');
  const js = read('./dist/levelup-ui.mjs') + read('./dist/levelup-view.mjs');
  assert.doesNotMatch(js, /canvas|Pixi|new Audio|createSound|\.play\(/);
  for (const m of js.matchAll(/feel\.add\('(\w+)'/g)) assert.ok(['win', 'cycle'].includes(m[1]), m[1]);
});

test('app.js: every level-up goes to the firmware update and waits; the old banner and the switch are gone; preview stays', () => {
  const app = read('./dist/app.js');
  assert.match(app, /case 'level-up': lu\.push\(e\); break;/);
  assert.doesNotMatch(app, /function levelUp\(|levelUpLines|privileges escalated|luStyle|params\.get\('levelup'\)|settings\.levelup/);
  assert.match(app, /\/\^developer levelup\( \|\$\)\/\.test\(text\)\) return levelUpCommand/);
  assert.match(app, /const m = arg\.match\(\/\^preview\(\?: \(\\d\+\|all\)\)\?\$\/\);/, 'only preview [level|all]');
  assert.match(app, /function boFree\(\) \{ return !introOn && !lu\.showing\(\) && !lu\.pending\(\)/, 'the subclass breakout waits its turn');
  // Developer commands stay behind ?dev (the gate turns them into developer-off before they reach levelUpCommand).
  assert.ok(app.indexOf("text = 'developer-off'") < app.indexOf('return levelUpCommand'));
  assert.doesNotMatch(systemMarkup(fresh()), /levelup|Level-up/, 'no Level-up setting');
  assert.ok(!('levelUpStyle' in LV) && !('broadcastMarkup' in LV) && !('cornerMarkup' in LV), 'the prototypes are gone');
  assert.ok(!existsSync(new URL('./dist/levelup-proto.mjs', import.meta.url)));
  for (const f of ['./GAME_RULES.md', './README.md']) { const t = read(f); assert.match(t, /developer levelup preview/, f); assert.doesNotMatch(t, /\?levelup=|level-up banner|prototypes? \(a\)|Casing moment/i, f); }
});

test('every class and level reads: no level-up row is empty or unnamed', () => {
  for (const cls of Object.keys(ARCHETYPES)) for (let L = 2; L <= 50; L++) {
    const sum = levelUpSummary([levelUpPreview(at(cls, L - 1), L)], barKeys(at(cls, L)));
    for (const it of sum.items) assert.ok(it.label && it.value && it.tip && KINDS[it.kind], `${cls} ${L}: ${JSON.stringify(it)}`);
    assert.ok(!sum.items.some((it) => it.kind === 'skill' && !it.id), `${cls} ${L}: every skill row knows its skill`);
  }
});
