// The hosted game: dist/ bundled into one minified script and one stylesheet (node scripts/build.mjs [out], default
// build/). dist/ stays the source and runs as plain ES modules (node serve.mjs); this is only what Pages serves.
// - app.js and everything it imports → app-<hash>.js at the root (import.meta.url there still finds sfx/). Its three
//   dynamic imports (the window, the bench, the effects playtest) become static there (EAGER), so they evaluate at load
//   (cheap: functions and small tables). Left dynamic, esbuild wraps every module they reach (104) in a lazy closure,
//   compiled on the main thread at boot; split into chunks, they'd load as more requests.
// - index.html's stylesheets, in their order → one style-<hash>.css (minified; url()s left as written: every sheet sits
//   at dist/'s root).
// - Every other file but the code and the editor (dev only) is copied as it is: samples, music, ui/, the favicon.
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir, rm, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'dist');
const CODE = new Set(['.mjs', '.js', '.css']);
const SKIP = new Set(['editor.html']);
// app.js's import('./x.mjs') → Promise.resolve(the module, imported statically).
export const EAGER = { name: 'eager', setup(b) {
  b.onLoad({ filter: /[\\/]dist[\\/]app\.js$/ }, async ({ path }) => {
    const src = await readFile(path, 'utf8'), mods = [];
    const code = src.replace(/\bimport\('(\.\/[\w-]+\.mjs)'\)/g, (_, m) => `Promise.resolve(__eager${mods.push(m) - 1})`);
    return { contents: code + mods.map((m, i) => `\nimport * as __eager${i} from '${m}';`).join(''), loader: 'js' }; // last: they evaluate after app.js's own imports, as before
  });
} };
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

export async function buildGame(out = join(ROOT, 'build')) {
  out = resolve(out);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const js = await build({
    entryPoints: { app: join(SRC, 'app.js') }, bundle: true, format: 'esm', target: 'esnext',
    minify: true, sourcemap: 'linked', outdir: out, entryNames: '[name]-[hash]',
    legalComments: 'none', charset: 'utf8', metafile: true, logLevel: 'warning', plugins: [EAGER],
  });
  const entry = Object.entries(js.metafile.outputs).find(([, o]) => o.entryPoint)[0];
  const script = relative(out, resolve(ROOT, entry));

  let html = await readFile(join(SRC, 'index.html'), 'utf8');
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">\n?/g)];
  if (!sheets.length || !html.includes('<script type="module" src="app.js"></script>')) throw new Error('index.html: no stylesheets or app.js script found');
  const css = (await Promise.all(sheets.map((m) => readFile(join(SRC, m[1]), 'utf8')))).join('\n');
  const { code: cssMin } = await transform(css, { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8' });
  const style = `style-${hash(cssMin)}.css`;
  await writeFile(join(out, style), cssMin);

  let first = true;
  html = html.replace(/<link rel="stylesheet" href="[^"]+">\n?/g, () => (first ? ((first = false), `<link rel="stylesheet" href="${style}">\n`) : ''));
  html = html.replace('<script type="module" src="app.js"></script>', `<script type="module" src="${script}"></script>`);
  await writeFile(join(out, 'index.html'), html);

  const copy = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const from = join(dir, e.name), to = join(out, relative(SRC, from));
      if (e.isDirectory()) { await copy(from); continue; }
      if (CODE.has(extname(e.name)) || SKIP.has(relative(SRC, from)) || e.name === 'index.html' && dir === SRC) continue;
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
    }
  };
  await copy(SRC);
  return { out, script, style, sheets: sheets.length, outputs: js.metafile.outputs };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await buildGame(process.argv[2]);
  const kb = (f) => ((r.outputs[relative(ROOT, join(r.out, f))]?.bytes ?? 0) / 1024).toFixed(0);
  console.log(`${relative(ROOT, r.out)}/: ${r.script} (${kb(r.script)} KB), ${r.style} (${r.sheets} sheets)`);
}
