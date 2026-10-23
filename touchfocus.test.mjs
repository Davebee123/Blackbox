// On a touch screen nothing but a tap on the prompt itself may focus it: a focused input pops the phone's keyboard
// over the fight (the designer: "when in combat on my phone, it's always bringing up the keyboard"). Every place in
// app.js that puts the cursor on the prompt goes through focusPrompt(), which skips touch; the one exception is a
// printable key typed outside a field, which only a physical keyboard sends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('app.js focuses the prompt only through focusPrompt(), which skips touch screens', () => {
  const src = readFileSync('dist/app.js', 'utf8');
  const direct = src.split('\n').filter((l) => /\$\('command-input'\)\.focus\(|input\.focus\(/.test(l));
  assert.equal(direct.length, 2, direct.join('\n'));
  assert.ok(direct.some((l) => /const focusPrompt = \(\) => \{ if \(touch\(\) \|\| lastPointer === 'touch'/.test(l)), 'the helper skips touch');
  assert.ok(direct.some((l) => /e\.key\.length === 1/.test(l)), 'a printable key typed outside a field');
});
