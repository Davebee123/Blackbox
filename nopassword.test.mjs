// No password fields anywhere in the game: the intro's login draws its password as dots in a text field
// (dist/intro.mjs .intro-secret), because a browser's password manager offers to save a type="password" field's
// value later (the designer saw Chrome's "Save password?" pop up as a fight started).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('no type="password" input in dist, and the intro masks its password with .intro-secret', () => {
  for (const f of readdirSync('dist').filter((x) => /\.(mjs|js|html)$/.test(x))) {
    assert.doesNotMatch(readFileSync(`dist/${f}`, 'utf8'), /type=["']password["']|type\s*=\s*['"]password['"]|\.type\s*=\s*['"]password/, f);
  }
  assert.match(readFileSync('dist/intro.mjs', 'utf8'), /class="intro-secret"/);
  assert.match(readFileSync('dist/style.css', 'utf8'), /\.intro-secret \{[^}]*-webkit-text-security: disc/);
});
