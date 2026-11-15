// What a screen costs, measured in headless Chromium (docs/performance-plan.md). Serve the game first (node serve.mjs).
//   node tools/perf/phone-audit.mjs <label> <query> [idle|scroll|fight] [seconds] [step ...]
//   node tools/perf/phone-audit.mjs map '?playtest=story' idle 8 go:map
//   node tools/perf/phone-audit.mjs boss '?playtest=boss:resident&level=20' fight 12
//   DEVICE=desk node tools/perf/phone-audit.mjs boss '?playtest=boss:resident&level=20' fight 12
// DEVICE=phone (default): 412x839 at 2.625x, touch, the CPU slowed 4x (THROTTLE). DEVICE=desk: 1920x1080 at 2x, no slowing.
// Steps run after the load, before measuring: wait:<ms> | js:<code> | touch:x,y | go:<module> (map, mail, loadout, server,
// codex, rig, system...). Modes: idle (hands off), scroll (a thumb flicking the page), fight (every ready key pressed).
// DROP_RAF=<regex> drops animation-frame callbacks by function name (a knock-out: what a loop is worth).
// OUT=<file> writes everything as JSON. Prints: frames a second, the renderer's main thread by kind of work and by
// script entry point, long blocks, the animations running, canvases and layers. The graphics are software here, so
// read the main thread's numbers, not the GPU's; compare runs made the same day (the machine's speed drifts).
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [label, query = '', mode = 'idle', secsArg = '8', ...steps] = process.argv.slice(2);
const DESK = process.env.DEVICE === 'desk', SECS = +secsArg, HZ = 100, RATE = +(process.env.THROTTLE || (DESK ? 1 : 4)), PORT = process.env.PORT || 4173;
const VIEW = DESK ? { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 } : { viewport: { width: 412, height: 839 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' };
if (!label) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n')); process.exit(1); }
function threads(rootPid) {
  const all = fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d)), kids = new Map();
  for (const p of all) { try { const st = fs.readFileSync(`/proc/${p}/stat`, 'utf8'); const pp = +st.slice(st.lastIndexOf(')') + 2).split(' ')[1]; (kids.get(pp) || kids.set(pp, []).get(pp)).push(+p); } catch {} }
  const pids = [], q = [rootPid]; while (q.length) { const p = q.shift(); pids.push(p); q.push(...(kids.get(p) || [])); }
  const m = new Map();
  for (const p of pids) {
    let cmd = ''; try { cmd = fs.readFileSync(`/proc/${p}/cmdline`, 'utf8'); } catch { continue; }
    const type = (cmd.match(/--type=([\w-]+)/) || [, 'browser'])[1];
    let ts = []; try { ts = fs.readdirSync(`/proc/${p}/task`); } catch { continue; }
    for (const t of ts) { try { const st = fs.readFileSync(`/proc/${p}/task/${t}/stat`, 'utf8'); const name = st.slice(st.indexOf('(') + 1, st.lastIndexOf(')')); const f = st.slice(st.lastIndexOf(')') + 2).split(' '); m.set(`${p}/${t}`, { key: `${type} ${name.replace(/\d+$/, '#')}`, ticks: +f[11] + +f[12] }); } catch {} }
  }
  return m;
}
const TRACE = `${process.env.TMPDIR || '/tmp'}/phone-audit-${process.pid}.json`;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(VIEW);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  if (process.env.DROP_RAF) await ctx.addInitScript((re) => { const R = new RegExp(re), real = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => (R.test(cb.name || '(anon)') ? 0 : real(cb)); }, process.env.DROP_RAF);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  const tLoad = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/${query}`);
  const loadMs = Date.now() - tLoad;
  await page.waitForTimeout(3500);
  for (const s of steps) {
    const i = s.indexOf(':'), k = s.slice(0, i), v = s.slice(i + 1);
    if (k === 'wait') await page.waitForTimeout(+v);
    else if (k === 'js') await page.evaluate(v);
    else if (k === 'touch') { const [x, y] = v.split(',').map(Number); await page.touchscreen.tap(x, y); }
    else if (k === 'go') await page.evaluate((m) => document.querySelector(`.modules [data-module="${m}"]`).click(), v);
  }
  await page.waitForTimeout(2500);
  // layers
  let layers = []; await cdp.send('DOM.enable'); cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; }); await cdp.send('LayerTree.enable');
  await page.waitForTimeout(300);
  await browser.startTracing(page, { path: TRACE, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8.execute', 'blink', 'cc', 'toplevel'] });
  const a = threads(process.pid), t0 = Date.now(), end = t0 + SECS * 1000;
  let taps = 0;
  if (mode === 'scroll') {
    // a thumb flicking the page up and down
    const loop = (async () => { let dir = -1; while (Date.now() < end - 900) { await cdp.send('Input.synthesizeScrollGesture', { x: VIEW.viewport.width / 2, y: VIEW.viewport.height * 0.57, yDistance: dir * 700, speed: 1400, gestureSourceType: 'touch' }).catch(() => {}); dir = -dir; await page.waitForTimeout(250); } })();
    await loop;
  }
  while (Date.now() < end) {
    if (mode === 'fight' && (await page.evaluate(() => { const el = document.querySelector('.tray .ability.ready'); if (el) el.click(); return !!el; }))) taps++;
    await page.waitForTimeout(300);
  }
  const b = threads(process.pid), secs = (Date.now() - t0) / 1000;
  const info = await page.evaluate(() => {
    const anims = document.getAnimations().filter((x) => x.playState === 'running').map((x) => { const t = x.effect?.target, props = [...new Set((x.effect?.getKeyframes?.() || []).flatMap((k) => Object.keys(k)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))]; const it = x.effect?.getTiming?.() || {}; return { name: x.animationName || 'script', on: t ? (t.id ? '#' + t.id : (t.tagName || '').toLowerCase() + '.' + String(t.getAttribute?.('class') || '').split(' ').slice(0, 2).join('.')) + (x.effect.pseudoElement || '') : '?', props, forever: it.iterations === Infinity, shown: !!(t && t.getClientRects().length) }; });
    const canv = [...document.querySelectorAll('canvas')].map((c) => ({ id: c.id || c.className, w: c.width, h: c.height, shown: !!c.getClientRects().length && getComputedStyle(c).visibility !== 'hidden' }));
    return { anims, canv, dom: document.querySelectorAll('*').length, body: document.body.className, sheets: document.styleSheets.length, scrollH: Math.max(...[...document.querySelectorAll('#page-view, #workspace, main, body')].map((e) => e.scrollHeight)) };
  });
  await browser.stopTracing(); await browser.close();
  // per-thread CPU
  const cpu = new Map(); for (const [k, v] of b) { const d = v.ticks - (a.get(k)?.ticks || 0); if (d > 0) cpu.set(v.key, (cpu.get(v.key) || 0) + d); }
  const pct = (re) => +([...cpu].filter(([k]) => re.test(k)).reduce((s, [, v]) => s + v, 0) / HZ / secs * 100).toFixed(1);
  // trace
  const ev = JSON.parse(fs.readFileSync(TRACE)).traceEvents; fs.unlinkSync(TRACE);
  const tn = new Map(); for (const e of ev) if (e.name === 'thread_name') tn.set(e.pid + ':' + e.tid, e.args.name);
  const main = ev.filter((e) => tn.get(e.pid + ':' + e.tid) === 'CrRendererMain' && e.ph === 'X' && e.dur != null).sort((x, y) => x.ts - y.ts || y.dur - x.dur);
  const KIND = [[/^(FunctionCall|EvaluateScript|RunMicrotasks|TimerFire|FireAnimationFrame|EventDispatch|v8\.|V8\.(?!GC))/, 'script'], [/GC/, 'gc'], [/recalcStyle|UpdateLayoutTree|updateStyle|StyleInvalid/i, 'style'], [/performLayout|^Layout|InvalidateLayout/, 'layout'], [/PrePaint|CompositingInputs|^Paint|PaintArtifact|RunPaintLifecycle|PaintImage|Layerize/, 'paint'], [/Canvas|GetImageData|DoUpdateLayers/, 'canvas'], [/Commit|WaitForCommit/, 'commit'], [/ParseHTML/, 'parse'], [/HitTest/, 'hittest']];
  const kinds = {}, fns = new Map(); let busy = 0, long = 0, longMs = 0, worst = 0; const stack = [];
  for (const e of main) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    e.self = e.dur; if (stack.length) stack[stack.length - 1].self -= e.dur; else { busy += e.dur; if (e.dur > 50000) { long++; longMs += e.dur; } worst = Math.max(worst, e.dur); }
    stack.push(e);
  }
  for (const e of main) {
    const k = (KIND.find(([re]) => re.test(e.name)) || [, 'other'])[1]; kinds[k] = (kinds[k] || 0) + e.self;
    if (e.name === 'FunctionCall') { const d = e.args?.data || {}, key = `${d.functionName || '(anon)'} ${String(d.url || '').split('/').pop()}:${(d.lineNumber ?? 0) + 1}`; const r = fns.get(key) || { n: 0, d: 0 }; r.n++; r.d += e.dur; fns.set(key, r); }
  }
  const S = (main.length ? (main[main.length - 1].ts - main[0].ts) : SECS * 1e6) / 1e6;
  // frames the main thread produced (the trace's own count: the page isn't asked, so an idle page can rest)
  const ft = ev.filter((e) => e.name === 'BeginMainThreadFrame').map((e) => e.ts / 1000).sort((x, y) => x - y), iv = ft.slice(1).map((t, i) => t - ft[i]).sort((x, y) => x - y), pc = (p) => (iv.length ? iv[Math.min(iv.length - 1, Math.floor(iv.length * p))] : 0);
  info.frames = ft.length; info.p50 = pc(0.5); info.p95 = pc(0.95); info.max = iv[iv.length - 1] || 0; info.slow = iv.filter((x) => x > 34).length;
  const perS = (v) => +(v / 1000 / S).toFixed(1);
  const count = (name) => +(ev.filter((e) => e.name === name).length / S).toFixed(1);
  const lay = layers.map((l) => l.width * l.height), dpr2 = VIEW.deviceScaleFactor ** 2;
  const res = {
    label, query, mode, secs: +secs.toFixed(1), taps, loadMs, errs: errs.slice(0, 2), body: info.body,
    fps: +(info.frames / S).toFixed(1), frameP50: +info.p50.toFixed(0), frameP95: +info.p95.toFixed(0), frameMax: +info.max.toFixed(0), slowFrames: info.slow,
    mainBusy: perS(busy), kinds: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, perS(v)]).sort((x, y) => y[1] - x[1])), longTasks: long, longMs: +(longMs / 1000).toFixed(0), worstTask: +(worst / 1000).toFixed(0),
    entries: [...fns].sort((x, y) => y[1].d - x[1].d).slice(0, 12).map(([k, r]) => ({ fn: k, perS: +(r.n / S).toFixed(1), msPerS: perS(r.d), msEach: +(r.d / 1000 / r.n).toFixed(2) })),
    styleRecalcs: count('UpdateLayoutTree'), layouts: count('Layout'), paints: count('Paint'), rasterTasks: count('RasterTask'),
    cpu: { main: pct(/^renderer (chrome|headless)/), raster: pct(/^renderer ThreadPoolForeg/), compositor: pct(/^renderer Compositor/), audio: pct(/^renderer AudioOutputDevi/), rendererAll: pct(/^renderer /), gpuProc: pct(/^gpu-process /) },
    anims: info.anims, canvases: info.canv, dom: info.dom, scrollH: info.scrollH, layers: layers.length, layerMpx: +(lay.reduce((s, v) => s + v, 0) * dpr2 / 1e6).toFixed(1),
  };
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(res, null, 1));
  const an = new Map(); for (const x of info.anims.filter((y) => y.shown)) { const k = `${x.name} on ${x.on} [${x.props}]${x.forever ? ' forever' : ''}`; an.set(k, (an.get(k) || 0) + 1); }
  console.log(`== ${label} (${DESK ? 'desk' : 'phone'}, ${mode}${RATE > 1 ? `, CPU ${RATE}x slower` : ''}): ${res.fps} frames/s (95th ${res.frameP95} ms, worst ${res.frameMax}); main thread ${res.mainBusy} ms/s busy; blocks over 50 ms: ${res.longTasks} (${res.longMs} ms, worst ${res.worstTask})${errs.length ? '\n   PAGE ERROR ' + errs[0] : ''}`);
  console.log('   by kind (ms/s): ' + Object.entries(res.kinds).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`   a second: style passes ${res.styleRecalcs}, layouts ${res.layouts}, paints ${res.paints}, raster tasks ${res.rasterTasks}`);
  console.log(res.entries.slice(0, 8).map((e) => `   ${String(e.perS).padStart(6)}/s ${String(e.msPerS).padStart(6)} ms/s ${String(e.msEach).padStart(6)} ms each  ${e.fn}`).join('\n'));
  console.log('   animations: ' + ([...an].map(([k, n]) => (n > 1 ? n + '× ' : '') + k).join(' | ') || 'none'));
  console.log('   canvases: ' + (info.canv.map((c) => `${c.id} ${c.w}x${c.h}${c.shown ? '' : ' (hidden)'}`).join(', ') || 'none') + ` | elements ${res.dom}, layers ${res.layers} (${res.layerMpx} Mpx)`);
})();
