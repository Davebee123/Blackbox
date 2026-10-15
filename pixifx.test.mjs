// GPU effects (dist/pixifx.mjs, GAME_RULES.md "GPU effects"): a PixiJS layer over the fight that only ever adds to the
// board's own effects. Off (the setting, Motion, Effects minimal) or not yet loaded, every call is a no-op and nothing
// loads; app.js loads it on a fight's first beat, never statically; the System page has its switch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createPixiFx } from './dist/pixifx.mjs';
import { fresh } from './dist/combat.mjs';
import { systemMarkup } from './dist/view.mjs';

test('off or unloaded, every effect is a no-op: nothing draws, nothing loads, nothing throws', async () => {
  const fx = createPixiFx({ enabled: () => false, host: {} });
  const r = { left: 10, top: 10, width: 200, height: 30, right: 210, bottom: 40 };
  fx.hit(50, 20, { power: 0.5, kind: 'crit' }); fx.burn(r, 0.5, 0.2); fx.shatter(r); fx.chit(20, 20, true); fx.cut(r); fx.hurt(r, 0.2, true); fx.encrypt(r); fx.clear();
  assert.equal(fx.live(), false);
  assert.equal(fx.count(), 0);
  assert.equal(await fx.warm(), null, 'off: it never loads the library');
});

test('the library is vendored (MIT) and loaded only by pixifx.mjs, dynamically', () => {
  assert.ok(existsSync('./dist/vendor/pixi.min.mjs') && existsSync('./dist/vendor/pixi.LICENSE'));
  assert.match(readFileSync('./dist/vendor/pixi.min.mjs', 'utf8').slice(0, 200), /PixiJS - v8\.\d+\.\d+[\s\S]*MIT License/);
  const mod = readFileSync('./dist/pixifx.mjs', 'utf8'), app = readFileSync('./dist/app.js', 'utf8');
  assert.match(mod, /await import\('\.\/vendor\/pixi\.min\.mjs'\)/, 'loaded on first use');
  assert.doesNotMatch(mod, /^import .*pixi/m);
  assert.doesNotMatch(app, /vendor\/pixi/, 'never from app.js');
  assert.match(app, /createPixiFx\(\{ enabled: \(\) => campaign\.settings\.gpu !== false && canMove\(\) && fxLevel\(\) !== 'minimal' \}\)/, 'gated on the setting, Motion and Effects');
  assert.match(app, /if \(\/\^gpu\( \(on\|off\)\)\?\$\/\.test\(text\)\)/, 'the gpu command');
  const css = readFileSync('./dist/style.css', 'utf8').match(/#pixi-fx \{[^}]*\}/)?.[0] || '';
  assert.match(css, /pointer-events: none/, 'it never takes input');
  assert.match(css, /z-index: 48/, 'above the lash (46), under the numbers (50) and tooltips');
});

test('System: GPU effects on by default, a switch beside Effects, greyed out with Motion off or Effects minimal', () => {
  const s = fresh();
  assert.match(systemMarkup(s), /data-run="gpu off" aria-pressed="true" [^>]*>GPU effects on<\/button>/);
  s.settings.gpu = false;
  assert.match(systemMarkup(s), /data-run="gpu on" aria-pressed="false" [^>]*>GPU effects off<\/button>/);
  s.settings.motion = false;
  assert.match(systemMarkup(s), /data-run="gpu on" aria-pressed="false" disabled /);
  s.settings.motion = true; s.settings.effects = 'minimal';
  assert.match(systemMarkup(s), /data-run="gpu on" aria-pressed="false" disabled /);
});
