// A fight coming up (dist/bootfx.mjs): the screen boots into it, the virus first (the designer's pick, Centre stage).
// Leaving a won one: Channel cut, the page folding to a teal line and the next opening out of it. Connecting to a
// server: Handshake, the dial-up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOT, TUBE_ON, VIRUS_ON, CHROME_LOW, HANGUP, hangupLines, bootLines, CUT, CONNECT, DIM, decoded, connectLines } from './dist/bootfx.mjs';

test('the virus comes on before anything of yours, and it is all over in a little over two seconds', () => {
  for (const k of ['console', 'chrome', 'you', 'youBar', 'board', 'log', 'prompt', 'tray']) assert.ok(BOOT.virus < BOOT[k] && BOOT.enemy < BOOT[k], k);
  assert.ok(BOOT.black < BOOT.virus);
  assert.equal(BOOT.flash, undefined, 'no flash');
  for (const k of ['you', 'board', 'log', 'prompt', 'tray']) assert.ok(BOOT[k] + TUBE_ON.at(-1)[0] <= BOOT.done, k);
  assert.ok(BOOT.done <= 2200);
});

test('nothing blinks (the designer: less flashing): a panel only brightens, the map only dims, your chrome never goes out', () => {
  const rising = (pts) => pts.every(([, v], i) => !i || v >= pts[i - 1][1]);
  for (const [name, pts] of [['TUBE_ON', TUBE_ON], ['VIRUS_ON', VIRUS_ON]]) {
    assert.equal(pts[0][1], 0, name);
    assert.equal(pts.at(-1)[1], 1, name);
    assert.ok(rising(pts), `${name} only brightens`);
  }
  assert.ok(DIM.every(([, v], i) => !i || v <= DIM[i - 1][1]), 'DIM only dims');
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

test('connecting dials in order: the lock, the dim with no flash, the name, then the rooms outward, then your chrome', () => {
  const C = CONNECT;
  assert.ok(C.lock < C.ping && C.ping < C.dim && C.dim < C.black && C.black < C.name && C.name < C.lines && C.lines < C.fly);
  assert.ok(C.fly < C.strip && C.strip < C.rooms && C.rooms < C.chrome && C.chrome + TUBE_ON.at(-1)[0] <= C.done);
  assert.ok(C.dim + DIM.at(-1)[0] <= C.black, 'the dim is over by the black');
  assert.ok(DIM.every(([, v]) => v <= 1) && DIM.at(-1)[1] < 0.3, 'it only ever dims');
  assert.ok(C.done <= 2400);
});

test('the name decodes from noise to itself', () => {
  assert.equal(decoded('KESSLER-MIRROR-50', 17), 'KESSLER-MIRROR-50');
  assert.notEqual(decoded('KESSLER-MIRROR-50', 0), 'KESSLER-MIRROR-50');
  assert.equal(decoded('KESSLER-MIRROR-50', 8).slice(0, 8), 'KESSLER-');
});

test('the dial readout names the server, its level and rooms, and ends on your CONNECT', () => {
  const lines = connectLines({ name: 'KESSLER-MIRROR-50', level: '10', rooms: 8 });
  assert.deepEqual(lines.map((l) => l.text), [
    'dial kessler-mirror-50 ... ring',
    'carrier ................. 33.6k',
    'handshake ............... ok',
    'lv 10 ................... 8 rooms',
    'CONNECT_',
  ]);
  assert.deepEqual(lines.filter((l) => l.you).map((l) => l.text), ['CONNECT_']);
  assert.equal(connectLines({ name: 'X' })[3].text, 'server .................. up');
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
