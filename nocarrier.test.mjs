// Losing a fight (dist/nocarrier.mjs): the board holds on the hit, NO CARRIER's static covers the screen, the map
// comes up under it, and only then the Disconnected card (the designer: "you go to the map screen prematurely").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A stand-in for the page: a host that takes children, and the window's listeners.
function page() {
  const kids = [], listeners = {};
  const host = { append: (el) => { kids.push(el); el.remove = () => kids.splice(kids.indexOf(el), 1); } };
  globalThis.document = { createElement: () => ({ className: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, classList: { add(c) { this.owner.className += ` ${c}`; } } }) };
  const make = globalThis.document.createElement;
  globalThis.document.createElement = () => { const el = make(); el.classList.owner = el; return el; };
  globalThis.addEventListener = (t, fn) => { listeners[t] = fn; };
  globalThis.removeEventListener = (t) => { delete listeners[t]; };
  return { host, kids, listeners };
}

test('the beats come in order: hold on the board, static, the map under it, the static clears, then the card', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { noCarrier, NC } = await import('./dist/nocarrier.mjs');
  const { host, kids } = page(), log = [];
  noCarrier(host, { where: 'VANTA-SINK-36', onSwap: () => log.push('map'), onDone: () => log.push('card') });
  t.mock.timers.tick(NC.hold - 1);
  assert.equal(kids.length, 0, 'the board shows, still, on the hit');
  t.mock.timers.tick(1);
  assert.equal(kids.length, 1);
  assert.match(kids[0].innerHTML, /NO CARRIER/);
  assert.match(kids[0].innerHTML, /VANTA-SINK-36/);
  assert.deepEqual(log, [], 'nothing moves under the static yet');
  t.mock.timers.tick(NC.swap - NC.hold);
  assert.deepEqual(log, ['map'], 'the map comes up under the static');
  assert.equal(kids.length, 1);
  t.mock.timers.tick(NC.clear - NC.swap);
  assert.match(kids[0].className, /nc-out/);
  t.mock.timers.tick(NC.done - NC.clear);
  assert.equal(kids.length, 0);
  assert.deepEqual(log, ['map', 'card'], 'the card shows once the static is gone');
  assert.ok(NC.hold >= 500 && NC.done <= 3200, 'a moment on the hit, and the whole of it short');
});

test('a click or a key during the static skips to the card, once', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { noCarrier, NC } = await import('./dist/nocarrier.mjs');
  const { host, kids, listeners } = page(), log = [];
  noCarrier(host, { onSwap: () => log.push('map'), onDone: () => log.push('card') });
  t.mock.timers.tick(NC.hold);
  listeners.keydown({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(log, ['map']);
  t.mock.timers.tick(NC.done);
  assert.deepEqual(log, ['map', 'card']);
  assert.equal(kids.length, 0);
  assert.equal(listeners.keydown, undefined, 'the page has its keys back');
});

test('app.js: a disconnect plays NO CARRIER, holds the screen on the board, and nothing else jumps to the map first', () => {
  const app = readFileSync('dist/app.js', 'utf8');
  assert.match(app, /case 'disconnected':[\s\S]{0,400}lossHold = true;\s*noCarrier\(/);
  assert.match(app, /onSwap: \(\) => \{ lossHold = false; go\('map'\); \}, onDone: \(\) => lossCard\(e\)/);
  assert.match(app, /function render\(force = false\) \{\n  if \(lossHold\) return;/);
  assert.doesNotMatch(app, /e\.type === 'disconnected'\) && !campaign\.roomsPlay\) go\('map'/, 'roomsDone must not jump to the map on a disconnect');
  assert.match(readFileSync('dist/index.html', 'utf8'), /href="nocarrier\.css"/);
});
