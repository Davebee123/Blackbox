#!/usr/bin/env node
// The test runner: `npm test` before a commit, `npm run test:full` for everything.
//
// Nine files are the game's balance and pacing simulations (SLOW, below). They hold about 40 of the ~1,370 tests but
// about 90% of the time the suite takes. A plain `npm test` still runs every other file, and it runs a slow file too
// whenever anything that file loads has changed since the base (origin/main, or --base <ref>): the file itself or any
// module it imports, directly or through other modules, plus the uncommitted work in the tree. So a change that
// could move a simulation's numbers always runs that simulation, and one that can't (a tooltip, a stylesheet, the
// map page) skips it. The import graph is read from the source, so a new import is followed with nothing to update.
//
//   node scripts/test.mjs            the fast files, and the slow files the changes reach
//   node scripts/test.mjs --full     every file
//   node scripts/test.mjs --fast     the fast files only (a quick check while working; not for a commit)
//   node scripts/test.mjs --base <ref>   compare with another ref (an agent's worktree: --base main)
//   node scripts/test.mjs --list     say what would run, and why, without running it
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Each takes a minute or more on its own; together about 90% of the suite's time (scripts/test.mjs --list shows them).
export const SLOW = ['loop.test.mjs', 'natives.test.mjs', 'sets-balance.test.mjs', 'kits-crew.test.mjs', 'presses.test.mjs', 'balance.test.mjs', 'genesim.test.mjs', 'kits-balance.test.mjs', 'farm.test.mjs'];

// Every module a file loads, as paths from the root: static imports, re-exports and import('...') with a literal
// start (a query string or template tail is dropped). Packages and node: built-ins are not followed.
const SPEC = /(?:\bimport\s[^'"`;]*?from\s*|\bexport\s[^'"`;]*?from\s*|\bimport\s*\(\s*|\bimport\s+)(['"`])(\.{1,2}\/[^'"`?$]+)/g;
export function importsOf(file, root = ROOT) {
  const src = readFileSync(join(root, file), 'utf8'), out = new Set();
  for (const m of src.matchAll(SPEC)) {
    const p = relative(root, resolve(root, dirname(file), m[2]));
    if (existsSync(join(root, p))) out.add(p);
  }
  return [...out];
}
// A file and everything it reaches.
export function closureOf(file, root = ROOT, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const f of importsOf(file, root)) closureOf(f, root, seen);
  return seen;
}
// What changed since the base: its commits on this branch, plus the tree's uncommitted and untracked files.
function changedSince(base) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  let from = base;
  try { from = git('merge-base', 'HEAD', base)[0]; } catch { return null; } // no such ref: run everything
  return new Set([...git('diff', '--name-only', from), ...git('ls-files', '--others', '--exclude-standard')]);
}
// The plan: which files run, and for each slow one, why or why not.
export function plan({ mode = 'auto', changed = null, root = ROOT } = {}) {
  const all = readdirSync(root).filter((f) => f.endsWith('.test.mjs')).sort();
  const fast = all.filter((f) => !SLOW.includes(f)), slow = all.filter((f) => SLOW.includes(f)), why = {};
  let run = slow;
  if (mode === 'fast') { run = []; for (const f of slow) why[f] = 'skipped (--fast)'; }
  else if (mode === 'auto' && changed) {
    run = slow.filter((f) => {
      const hit = [...closureOf(f, root)].find((x) => changed.has(x));
      why[f] = hit ? `runs: ${hit} changed` : 'skipped: nothing it loads changed';
      return !!hit;
    });
  } else for (const f of slow) why[f] = mode === 'full' ? 'runs (--full)' : 'runs (no base to compare with)';
  return { files: [...fast, ...run], fast, slow, why };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), at = args.indexOf('--base');
  const mode = args.includes('--full') ? 'full' : args.includes('--fast') ? 'fast' : 'auto';
  const base = at >= 0 ? args[at + 1] : 'origin/main';
  const changed = mode === 'auto' ? changedSince(base) : null;
  const p = plan({ mode, changed });
  console.log(`# ${p.fast.length} fast files${mode === 'auto' ? `, compared with ${base}` : ''}`);
  for (const f of p.slow) console.log(`#   ${f}: ${p.why[f]}`);
  if (args.includes('--list')) process.exit(0);
  const r = spawnSync(process.execPath, ['--test', ...p.files], { cwd: ROOT, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
