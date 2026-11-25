// No password fields anywhere in the game: a browser's password manager offers to save a type="password" field's value
// later (the designer saw Chrome's "Save password?" pop up as a fight started). The intro's password types itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('no type="password" input in dist, and the intro asks only for a handle', () => {
  for (const f of readdirSync('dist').filter((x) => /\.(mjs|js|html)$/.test(x))) {
    assert.doesNotMatch(readFileSync(`dist/${f}`, 'utf8'), /type=["']password["']|type\s*=\s*['"]password['"]|\.type\s*=\s*['"]password/, f);
  }
  const intro = readFileSync('dist/intro.mjs', 'utf8');
  assert.equal((intro.match(/await ask\(/g) || []).length, 1, 'one prompt: the handle');
  assert.match(intro, /line\(pre, 'password: '\)/, 'the password line types itself');
});
