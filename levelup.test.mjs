// The level-up prototypes (dist/levelup-view.mjs, dist/levelup-ui.mjs, dist/levelup.css): three ways to show a level
// beside the current banner, switched by ?levelup=a|b|c or developer levelup. Each lists every unlock the banner
// lists, each row's detail in its tooltip; none comes up during a fight or over a card that waits for you, and
// nothing goes over the fight board. The current banner stays the default.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, command, gainXp, levelUpPreview, hackerOf, barKeys } from './dist/combat.mjs';
import { xpToNext, ARCHETYPES } from './dist/data.mjs';
import { levelUpLines, systemMarkup } from './dist/view.mjs';
import { LEVELUP_IDS, levelUpStyle, levelUpSummary, gainItem, broadcastMarkup, firmwareMarkup, cornerMarkup, plateMarkup, bigDigits, KINDS, A_WIDTH, luCalm } from './dist/levelup-view.mjs';
import { createLevelUpUi } from './dist/levelup-ui.mjs';

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

test('the current banner stays the default; ?levelup= on the page, then the saved setting, switch it', () => {
  assert.deepEqual(LEVELUP_IDS, ['current', 'a', 'b', 'c']);
  assert.equal(levelUpStyle(fresh().settings), 'current', 'a fresh save keeps the banner');
  assert.equal(levelUpStyle({ levelup: 'b' }), 'b');
  assert.equal(levelUpStyle({ levelup: 'b' }, 'c'), 'c', 'the page wins');
  assert.equal(levelUpStyle({ levelup: 'zz' }, 'nope'), 'current', 'anything else is the banner');
  assert.equal(fresh().settings.levelup, undefined, 'nothing new on a save');
});

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

test('every unlock the banner lists is a row in all three, with its detail in a tooltip', () => {
  const evs = everyKind(), sum = levelUpSummary(evs);
  const kinds = new Set(sum.items.map((it) => it.kind));
  for (const k of Object.keys(KINDS)) assert.ok(kinds.has(k), `a ${k} row`);
  // Each gain of each level, as the banner words it, is a row.
  for (const e of evs) for (const g of e.gains) assert.ok(sum.items.some((it) => it.label === gainItem(g, e).label), g);
  const marks = { a: broadcastMarkup(sum, { who: 'dana', time: '01:32' }), b: firmwareMarkup(sum), c: cornerMarkup(sum) };
  for (const [id, h] of Object.entries(marks)) {
    for (const it of sum.items) {
      assert.ok(plain(h).includes(it.label.slice(0, 20)), `${id}: ${it.label}`);
      assert.match(h, new RegExp(`class="lu-row k-${it.kind}"[^>]*title="[^"]+: [^"]+"`), `${id}: ${it.kind} has a Name: sentence tooltip`);
    }
    assert.doesNotMatch(h, /undefined|NaN|\[object/, id);
    assert.ok(h.includes('data-module="loadout"'), `${id}: a way to the Loadout`);
  }
  // The banner's own lines: what the level brings, the power line and the server's Integrity, and the next level.
  const one = levelUpPreview(at('breaker', 9), 10), lines = levelUpLines(one), s1 = levelUpSummary([one]);
  assert.ok(lines.at(-1).ghost && s1.next && s1.next.level === one.next.level, 'the next level that brings something');
  assert.ok(s1.items.some((it) => it.kind === 'power' && it.value === '+4%') && s1.items.some((it) => it.kind === 'integrity' && it.value === String(one.server)));
  for (const h of [broadcastMarkup(s1), firmwareMarkup(s1), cornerMarkup(s1)]) assert.ok(plain(h).includes(`${one.next.level}`) && plain(h).includes('Protocol bases +4'), 'the ghost line');
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
  // Labels are sentence case and short: the detail lives in the tooltip.
  for (const it of sum.items) assert.ok(it.label.length <= 24 && /^[A-Z]/.test(it.label) && !/^[A-Z ]{6,}$/.test(it.label.replace('SIGINT', 'Sigint')), it.label);
});

test('a: the broadcast\'s ASCII frame keeps its width on every line, and fits a phone', () => {
  for (const evs of [everyKind(), [levelUpPreview(at('breaker', 9), 10)], [levelUpPreview(at('operator', 49), 50)]]) {
    const h = broadcastMarkup(levelUpSummary(evs), { who: 'dana' });
    const lines = [...h.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => plain(m[1]));
    assert.ok(lines.length >= 3);
    for (const l of lines) assert.equal(l.length, A_WIDTH + 2, l);
    assert.match(lines[0], /^┌─ LV /); assert.match(lines.at(-1), /^└─.*┘$/);
    for (const l of lines.slice(1, -1)) assert.match(l, /^│ \+ .* │$/);
  }
  assert.ok((A_WIDTH + 2) * 0.6 * 11.5 <= 358, 'at 11.5px mono it fits a 390px phone with its gutters');
});

test('b: the level in big digits, each a 3 by 5 dot font; c: the plate rolls from the old level to the new', () => {
  const big = bigDigits(10).split('\n');
  assert.equal(big.length, 5);
  assert.equal(plain(big[0]).length, 14, 'two digits of three double-width dots and a gap');
  assert.match(firmwareMarkup(levelUpSummary([levelUpPreview(at('breaker', 9), 10)])), /v9 → <b>v10<\/b>/);
  assert.equal(plateMarkup(9, 10), '<small>LV</small><b class="lv-roll"><span class="lv-old">9</span><span class="lv-new">10</span></b>');
});

test('never during a fight, and never over a card that waits for you', () => {
  assert.equal(luCalm({}), true);
  for (const k of ['fighting', 'ended', 'spoils', 'gainModal', 'booting']) assert.equal(luCalm({ [k]: true }), false, k);
});

// A stand-in page for levelup-ui.mjs: the host, the casing's plate and lamps, the prompt and the top bar.
function fakePage() {
  const el = (id) => ({ id, hidden: true, innerHTML: '', className: '', dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, offsetWidth: 1, classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); } }, addEventListener() {}, getBoundingClientRect: () => ({ left: 20, right: 1420, top: 760, bottom: 800, width: 1400, height: 40 }) });
  const els = { 'lu-proto': el('lu-proto'), 'lv-plate': el('lv-plate'), 'command-form': el('command-form') }, lamps = el('lamps'), bar = el('bar');
  bar.getBoundingClientRect = () => ({ left: 0, right: 1440, top: 0, bottom: 64, width: 1440, height: 64 });
  globalThis.document = { getElementById: (id) => els[id] || null, querySelector: (q) => (q === '#casing .lamps' ? lamps : q === '.topbar' ? bar : null) };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.addEventListener = () => {};
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900;
  return { host: els['lu-proto'], plate: els['lv-plate'], lamps };
}
test('the prototypes wait for the fight\'s end, go when a fight comes up, and only the casing shows the plate', () => {
  for (const st of ['a', 'b', 'c']) {
    const { host, plate, lamps } = fakePage();
    let fighting = true, cards = false;
    const sounds = [];
    const ui = createLevelUpUi({ style: () => st, feel: { add: (k) => sounds.push(k) }, calm: () => !fighting && !cards, fighting: () => fighting, level: () => 10, motion: () => false });
    ui.push(levelUpPreview(at('breaker', 9), 10));
    for (let i = 0; i < 5; i++) ui.tick();
    assert.ok(host.hidden && !ui.showing() && ui.pending() === 1, `${st}: nothing during the fight`);
    fighting = false; cards = true; ui.tick();
    assert.ok(host.hidden, `${st}: nor over the spoils`);
    cards = false; ui.tick();
    assert.ok(!host.hidden && ui.showing() && host.className.includes(`lu-${st}`), `${st}: up once it is calm`);
    assert.ok(host.innerHTML.includes('Subclass') && host.innerHTML.includes('SIGINT'));
    assert.equal(sounds[0], 'win', 'the level\'s own sound, nothing new');
    assert.ok(sounds.every((k) => ['win', 'cycle'].includes(k)));
    assert.ok(host.style['--lu-bottom'] && host.style['--lu-top'], 'docked to the prompt and the top bar');
    assert.equal(plate.hidden, st !== 'c', `${st}: the casing's plate is c's alone`);
    if (st === 'c') assert.match(plate.innerHTML, /LV.*10/);
    fighting = true; ui.tick();
    assert.ok(host.hidden && !ui.showing(), `${st}: a fight sends it away`);
    fighting = false; ui.push(levelUpPreview(at('breaker', 10), 11)); ui.tick();
    assert.ok(ui.dismiss() && host.hidden, `${st}: Enter or Esc takes it away`);
    assert.equal(ui.dismiss(), false);
    void lamps;
  }
});

test('nothing over the fight board: the host is outside the fight view, docked to the prompt or the top bar', () => {
  const html = read('./dist/index.html');
  const fight = html.slice(html.indexOf('<section id="combat-view"'), html.indexOf('<section id="page-view"'));
  assert.ok(!/lu-proto|lv-plate/.test(fight), 'not in the fight view');
  assert.match(html, /<\/div>\n<!-- The level-up prototypes[^\n]*-->\n<div id="lu-proto" class="lu-proto" role="status" aria-live="polite" hidden><\/div>/);
  assert.match(html, /<link rel="stylesheet" href="levelup\.css">/);
  // The plate sits in the casing's lamp cluster, on the bezel.
  const casing = html.slice(html.indexOf('<div id="casing">'), html.indexOf('<!-- finger <handle>'));
  assert.match(casing, /<div class="lamps" aria-label="Status lamps">\s*<span class="lv-plate" id="lv-plate" title="Your level" hidden><\/span>/);
  const css = strip(read('./dist/levelup.css')).replace(/@keyframes [\w-]+ \{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, '').replace(/@media [^{]+\{/g, '');
  for (const m of css.matchAll(/([^{}@]+)\{[^}]*\}/g)) for (const sel of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
    if (/^(from|to|\d+%)/.test(sel)) continue;
    assert.ok(/^(\.no-motion )?(\.lu-|#casing \.(lv-plate|lamps\.lu-chase)|\.lv-roll|\.roll \.lv-roll|\.lv-plate|body\.cased \.lu-c)/.test(sel), `${sel}: only the prototypes and the casing`);
    assert.doesNotMatch(sel, /\.board|#board|#combat-view|\.app\b|\.workspace|#hud/, sel);
  }
  // Where it sits comes only from the prompt's and the top bar's boxes (levelup-ui.mjs place).
  for (const st of ['a', 'b', 'c']) assert.match(css, new RegExp(`\\.lu-proto\\.lu-${st} \\{[^}]*var\\(--lu-(left|right|top|bottom)`));
  assert.doesNotMatch(css, /inset: 0|position: absolute; inset/, 'never a full-screen cover');
  // No canvas, no new sounds, no rain.
  const js = read('./dist/levelup-ui.mjs') + read('./dist/levelup-view.mjs');
  assert.doesNotMatch(js, /canvas|Pixi|new Audio|createSound|\.play\(/);
  for (const m of js.matchAll(/feel\.add\('(\w+)'/g)) assert.ok(['win', 'cycle'].includes(m[1]), m[1]);
});

test('app.js: a prototype takes the level-up event and waits; the banner path is as it was; the dev switch', () => {
  const app = read('./dist/app.js');
  assert.match(app, /case 'level-up': \{\n\s+if \(luStyle\(\) !== 'current'\) \{ lu\.push\(e\); break; \}[^\n]*\n\s+if \(won\) break;\n[^\n]*\n\s+levelUp\(e\.message/, 'the banner keeps its own path');
  assert.match(app, /params\.get\('levelup'\)/);
  assert.match(app, /\/\^developer levelup\( \|\$\)\/\.test\(text\)\) return levelUpCommand/);
  assert.match(app, /function boFree\(\) \{ return !introOn && !lu\.showing\(\) && !lu\.pending\(\)/, 'the subclass breakout waits its turn');
  // The System page carries the switch in developer mode only.
  const s = fresh();
  assert.doesNotMatch(systemMarkup(s), /developer levelup/);
  assert.match(systemMarkup(s, { levelup: 'b' }), /data-run="developer levelup next"[^>]*>Level-up: Firmware update</);
  assert.match(systemMarkup(s, { levelup: 'b' }), /data-run="developer levelup preview all"/);
  // Rules and the README say how to switch.
  for (const f of ['./GAME_RULES.md', './README.md']) { const t = read(f); assert.match(t, /\?levelup=a\|b\|c/, f); assert.match(t, /developer levelup preview/, f); }
});

test('every class and level reads: no level-up row is empty or unnamed', () => {
  for (const cls of Object.keys(ARCHETYPES)) for (let L = 2; L <= 50; L++) {
    const sum = levelUpSummary([levelUpPreview(at(cls, L - 1), L)], barKeys(at(cls, L)));
    for (const it of sum.items) assert.ok(it.label && it.value && it.tip && KINDS[it.kind], `${cls} ${L}: ${JSON.stringify(it)}`);
    assert.ok(!sum.items.some((it) => it.kind === 'skill' && !it.id), `${cls} ${L}: every skill row knows its skill`);
  }
  void hackerOf; void command;
});
