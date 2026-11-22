// The demo's telemetry (docs/demo-plan.md Phase 1, step 6): a Cloudflare Worker on the free tier with a D1 database.
//   POST /      a batch from the game (telemetry.mjs: { id, v, events }), stored a row an event
//   GET /stats  the numbers, as JSON (stats below)
//   GET /       a page that reads them back
// With a STATS_KEY secret, /stats and the page need ?key=<it>. Nothing here knows a handle.
import { stats } from './stats.js';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type' };
const MAX_EVENTS = 200, KINDS = new Set(['start', 'close', 'level', 'boss', 'disconnect', 'done']);
const clip = (x, n = 64) => String(x ?? '').slice(0, n);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method === 'POST') return store(req, env);
    if (env.STATS_KEY && url.searchParams.get('key') !== env.STATS_KEY) return new Response('Not found', { status: 404 });
    if (url.pathname === '/stats') {
      const { results } = await env.DB.prepare('SELECT id, v, k, t, p, L, data FROM events ORDER BY t').all();
      return Response.json(stats(results.map((r) => ({ ...r, ...JSON.parse(r.data || '{}') }))), { headers: CORS });
    }
    if (url.pathname === '/') return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};

async function store(req, env) {
  let b = null;
  try { b = JSON.parse(await req.text()); } catch { /* not JSON */ }
  if (!b || !/^[0-9a-f]{16}$/.test(b.id || '') || !Array.isArray(b.events)) return new Response('Bad batch', { status: 400, headers: CORS });
  const rows = b.events.slice(0, MAX_EVENTS).filter((e) => KINDS.has(e?.k) && Number.isFinite(e.t)).map((e) => {
    const { k, t, p, L, id: _id, v: _v, ...rest } = e; // id and v are the batch's
    for (const key of Object.keys(rest)) if (typeof rest[key] === 'string') rest[key] = clip(rest[key]);
    return env.DB.prepare('INSERT INTO events (id, v, k, t, p, L, data) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(b.id, clip(b.v, 16), k, Math.round(t), Math.round(p) || 0, Math.round(L) || 0, JSON.stringify(rest).slice(0, 512));
  });
  if (rows.length) await env.DB.batch(rows);
  return new Response(null, { status: 204, headers: CORS });
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BLACKBOX demo</title>
<style>body{margin:0;padding:16px;background:#090603;color:#e9d9b0;font:14px ui-monospace,Menlo,monospace}h1{font-size:16px;color:#f1b92f}h2{font-size:13px;color:#8f7748;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.1em}
table{border-collapse:collapse}td,th{padding:3px 12px 3px 0;text-align:left;border-bottom:1px solid rgba(241,185,47,.2)}th{color:#8f7748;font-weight:400}b{color:#f1b92f}.bar{display:inline-block;height:8px;background:#f1b92f;vertical-align:middle}</style></head>
<body><h1>BLACKBOX demo · play data</h1><div id="out">Loading…</div><script>
const h=(ms)=>ms==null?'–':(ms/3600000).toFixed(1)+' h',key=new URLSearchParams(location.search).get('key');
fetch('stats'+(key?'?key='+encodeURIComponent(key):'')).then(r=>r.json()).then(s=>{
const rows=(o,f)=>Object.entries(o).map(f).join('');
document.getElementById('out').innerHTML=
'<h2>Players</h2><table><tr><th>installs</th><td><b>'+s.installs+'</b></td></tr><tr><th>median play</th><td><b>'+h(s.medianPlay)+'</b></td></tr><tr><th>finished</th><td><b>'+s.finished+'</b></td></tr></table>'+
'<h2>Hours to level (median)</h2><table>'+rows(s.hoursTo,([L,ms])=>'<tr><th>'+L+'</th><td>'+h(ms)+'</td></tr>')+'</table>'+
'<h2>Where players stop (last level)</h2><table>'+rows(s.stopAt,([L,n])=>'<tr><th>'+L+'</th><td><span class="bar" style="width:'+(n*12)+'px"></span> '+n+'</td></tr>')+'</table>'+
'<h2>Last screen</h2><table>'+rows(s.lastScreen,([k,n])=>'<tr><th>'+k+'</th><td>'+n+'</td></tr>')+'</table>'+
'<h2>Bosses</h2><table><tr><th>boss</th><th>won</th><th>lost</th><th>cycles</th><th>Integrity left</th></tr>'+rows(s.bosses,([id,b])=>'<tr><th>'+id+'</th><td>'+b.won+'</td><td>'+b.lost+'</td><td>'+b.cycles+'</td><td>'+b.hp+'</td></tr>')+'</table>'+
'<h2>Disconnects</h2><table>'+rows(s.disconnects,([k,n])=>'<tr><th>'+k+'</th><td>'+n+'</td></tr>')+'</table>';
}).catch(()=>{document.getElementById('out').textContent='No data.';});
</script></body></html>`;
