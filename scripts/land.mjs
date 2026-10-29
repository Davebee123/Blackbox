#!/usr/bin/env node
// Landing: put this branch on main, tested against the main it lands on (CLAUDE.md "Landing").
//
//   node scripts/land.mjs           merge origin/main in, run npm test's plan on the merged tree, push it to main
//   node scripts/land.mjs --full    run every test file instead (scripts/test.mjs --full)
//   node scripts/land.mjs --dry     everything but the pushes
//
// It stops, saying why, on uncommitted work, a merge conflict (left in the tree: resolve it, commit, run it again),
// both sides raising SAVE_VERSION since they split, or a failing test. The tests' output goes to a log beside the
// system's temp files; the console gets its totals and its failing lines. If main moves while the tests run, git
// refuses the push and it starts over from the fetch, so what lands is always what was tested.
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TRIES = 5; // main moving under us this many times in a row means something else is wrong

// SAVE_VERSION as written in combat.mjs's source, or null where it can't be read.
export const saveVersionOf = (src) => Number(/export const SAVE_VERSION = (\d+)/.exec(src || '')?.[1]) || null;
// Both sides raised SAVE_VERSION since they split: two migrations claim one number, and a merge can't settle which.
export const saveClash = ({ base, ours, theirs }) => base != null && ours > base && theirs > base;

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const versionAt = (ref) => { try { return saveVersionOf(git('show', `${ref}:dist/combat.mjs`)); } catch { return null; } };
const stop = (why) => { console.error(`land: ${why}`); process.exit(1); };

function land({ full = false, dry = false } = {}) {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch === 'HEAD') stop('not on a branch. Check out your branch first.');
  if (existsSync(join(ROOT, '.git', 'MERGE_HEAD'))) stop('a merge is in progress. Resolve it and commit, then land again.');
  if (git('status', '--porcelain', '--untracked-files=no')) stop('uncommitted changes. Commit them (npm test first), then land again.');
  for (let i = 1; i <= TRIES; i++) {
    git('fetch', '--quiet', 'origin', 'main');
    const base = git('merge-base', 'HEAD', 'origin/main');
    if (base !== git('rev-parse', 'origin/main')) {
      const v = { base: versionAt(base), ours: versionAt('HEAD'), theirs: versionAt('origin/main') };
      if (saveClash(v)) stop(`both sides raised SAVE_VERSION (yours ${v.ours}, main's ${v.theirs}, ${v.base} where you split). Merge origin/main yourself, renumber yours to ${v.theirs + 1} after main's (its restore runs after main's), commit, then land again.`);
      console.log(`land: merging origin/main into ${branch}`);
      if (tryGit('merge', '--no-edit', 'origin/main').status !== 0) {
        const files = git('diff', '--name-only', '--diff-filter=U');
        stop(`merge conflicts, left in the tree:\n${files}\nResolve each keeping both sides' intent (ask the designer where they collide in design), commit, then land again.`);
      }
    }
    const log = join(tmpdir(), `land-${branch.replace(/[^\w.-]+/g, '-')}.log`);
    console.log(`land: testing the merged tree (${full ? 'every file' : "npm test's plan against origin/main"}); the log is ${log}`);
    const t = spawnSync(process.execPath, [join(ROOT, 'scripts', 'test.mjs'), ...(full ? ['--full'] : ['--base', 'origin/main'])], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 });
    const out = `${t.stdout || ''}${t.stderr || ''}`;
    writeFileSync(log, out);
    for (const line of out.split('\n')) if (/^# (tests|pass|fail|todo) |^not ok /.test(line)) console.log(line.slice(0, 200));
    if (t.status !== 0) stop(`tests failed (the log is ${log}). Fix them on ${branch}, commit, then land again.`);
    if (dry) return console.log('land: --dry, so nothing was pushed.');
    const pushed = tryGit('push', 'origin', 'HEAD:main');
    if (pushed.status === 0) {
      if (branch !== 'main') tryGit('push', '-u', 'origin', 'HEAD'); // the branch shows it landed
      return console.log(`land: ${branch} is on main (${git('rev-parse', '--short', 'HEAD')}).`);
    }
    if (!/\[rejected\]|non-fast-forward|fetch first/.test(pushed.stderr)) stop(`the push failed:\n${pushed.stderr.trim()}`);
    console.log(`land: main moved while the tests ran; starting over (${i}/${TRIES}).`);
  }
  stop(`main moved ${TRIES} times in a row. Check what is landing, then try again.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) land({ full: process.argv.includes('--full'), dry: process.argv.includes('--dry') });
