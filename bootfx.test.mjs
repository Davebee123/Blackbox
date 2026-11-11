// A fight coming up (dist/bootfx.mjs): the screen boots into it, the virus first (the designer's pick, Centre stage).
// Leaving a won one: Channel cut, the page folding to a teal line and the next opening out of it. Connecting to a
// server: Carrier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOT, TUBE_ON, VIRUS_ON, CHROME_LOW, HANGUP, hangupLines, bootLines, CUT, CONNECT, carrierLine, carrierReach } from './dist/bootfx.mjs';

test('the virus comes on before anything of yours, and it is all over in a little over two seconds', () => {
  for (const k of ['console', 'chrome', 'you', 'youBar', 'board', 'log', 'prompt', 'tray']) assert.ok(BOOT.virus < BOOT[k] && BOOT.enemy < BOOT[k], k);
  assert.ok(BOOT.black < BOOT.virus);
  assert.equal(BOOT.flash, undefined, 'no flash');
  for (const k of ['you', 'board', 'log', 'prompt', 'tray']) assert.ok(BOOT[k] + TUBE_ON.at(-1)[0] <= BOOT.done, k);
  assert.ok(BOOT.done <= 2200);
});

test('nothing blinks (the designer: less flashing): a panel only brightens, your chrome never goes out', () => {
  const rising = (pts) => pts.every(([, v], i) => !i || v >= pts[i - 1][1]);
  for (const [name, pts] of [['TUBE_ON', TUBE_ON], ['VIRUS_ON', VIRUS_ON]]) {
    assert.equal(pts[0][1], 0, name);
    assert.equal(pts.at(-1)[1], 1, name);
    assert.ok(rising(pts), `${name} only brightens`);
  }
  assert.ok(CHROME_LOW > 0 && CHROME_LOW < 0.5);
  const src = readFileSync('./dist/bootfx.mjs', 'utf8');
  assert.ok(!/bootfx-flash/.test(src), 'no white flash');
  assert.ok(!/brightness\(2/.test(src), 'nothing flares past 1.4× brightness');
});

test('the console checks your bar, class and keys, then names the virus in red', () => {
  const lines = bootLines({ bar: 'Your server', hp: '100/100', cls: 'Breaker', level: '1', keys: ['Bash', 'Overload'], virus: 'CRYPTJACK', paused: true });
  assert.deepEqual(lines.map((l) => l.text), [
    'BLACKBOX MODEL 7 · cold boot',
    'your server ...... 100/100',
    'class ............ breaker lv 1',
    'key 1 bash ....... ok',
    'key 2 overload ... ok',
    'proc/intrusion ... CRYPTJACK',
    'cycle clock ...... paused',
    '> ready_',
  ]);
  assert.deepEqual(lines.filter((l) => l.hot).map((l) => l.text), ['proc/intrusion ... CRYPTJACK']);
  assert.equal(bootLines({ keys: ['a', 'b', 'c', 'd', 'e', 'f'] }).filter((l) => l.text.startsWith('key ')).length, 4);
});

test('leaving a won fight is quick: the page folds, the next one opens out of the line, then your room rings', () => {
  assert.ok(CUT.cut <= CUT.swap && CUT.swap <= CUT.open);
  assert.ok(CUT.open < CUT.ring && CUT.open + CUT.openFor <= CUT.done);
  assert.ok(CUT.done <= 900);
});

test('connecting is one eased move: the line lands, the circle opens, the entry rings as it settles', () => {
  const C = CONNECT;
  assert.ok(C.wire < C.land && C.dimFor <= C.openFor);
  assert.ok(C.land + C.openFor * 0.8 <= C.ring && C.ring <= C.land + C.openFor, 'the ring comes as the circle closes on the edge');
  assert.ok(C.ring + C.ringFor <= C.done && C.done <= 1800);
});

test('the line runs from the edge of HOME to just short of the node; none when they touch', () => {
  const l = carrierLine({ x: 100, y: 100 }, { x: 100, y: 400 }, 26, 6);
  assert.deepEqual([l.x, l.y, l.len], [100, 126, 268]);
  assert.ok(Math.abs(l.angle - Math.PI / 2) < 1e-9);
  assert.equal(carrierLine({ x: 0, y: 0 }, { x: 300, y: 0 }).angle, 0);
  assert.equal(carrierLine({ x: 0, y: 0 }, { x: 30, y: 0 }, 26, 6), null);
});

test('the circle opens as far as the page\'s farthest corner', () => {
  assert.equal(carrierReach({ x: 0, y: 0 }, 300, 400), 500);
  assert.equal(carrierReach({ x: 300, y: 400 }, 300, 400), 500);
  assert.equal(carrierReach({ x: 150, y: 200 }, 300, 400), 250);
});

test('jacking out is the dial-up backwards: the rooms go dark toward yours, the readout, then the map and your server ringed', () => {
  const H = HANGUP;
  assert.ok(H.lock < H.out && H.out < H.black && H.black < H.name && H.name < H.lines && H.lines < H.map && H.map < H.mark);
  assert.ok(H.chrome + TUBE_ON.at(-1)[0] <= H.done && H.mark + 400 <= H.done + 200);
  assert.ok(H.done <= 1800, 'quicker than the dial-up');
  assert.deepEqual(hangupLines({ name: 'KESSLER-MIRROR-50', banked: 3 }).map((l) => l.text), [
    'ath0 kessler-mirror-50 ... ok',
    'carrier ................. dropped',
    'pack .................... 3 banked',
    'HOME_',
  ]);
  assert.equal(hangupLines({ name: 'X' })[2].text, 'pack .................... empty');
  assert.deepEqual(hangupLines({ name: 'X' }).filter((l) => l.you).map((l) => l.text), ['HOME_']);
});
