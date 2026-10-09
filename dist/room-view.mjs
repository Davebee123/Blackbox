// LOWLIGHT's back room (room.mjs): one page, no windows (docs/world.md 2.6). The room's sentence, wick's line and
// lead, and the board's news. docs/ui.md tokens: teal is you and yours (the room is yours), amber is what you click.
// Standing, the Claims desk and the fence come in W1, so the board shows only news.
import { esc } from './view.mjs';
import { SERVER } from './campaign.mjs';
import { roomSentence, afterLine } from './room.mjs';
import { WORLD } from './world.mjs';

const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
// A line that names a server: the server's name becomes a link to its card on the map.
const linked = (text, at) => {
  const srv = at && SERVER[at];
  if (!srv || !text.includes(srv.name)) return esc(text);
  const [a, ...b] = text.split(srv.name);
  return `${esc(a)}<button type="button" class="rm-srv" data-camp="show" data-arg="${esc(at)}" title="${esc(`${srv.name} on the map.`)}">${esc(srv.name)}</button>${esc(b.join(srv.name))}`;
};

export function roomMarkup(s) {
  if (!s.camp) return '<section class="card"><h2>Room</h2><h1>No campaign</h1></section>';
  const room = s.camp.room || {}, v = room.visit, w = s.camp.world || { news: [] };
  const lead = v?.lead;
  const wick = `<section class="card rm-card rm-wick" aria-label="wick">
      <h2><span class="ico" ${icon('command')}></span>wick <small>LOWLIGHT</small></h2>
      ${v?.wick ? `<p class="rm-say">${esc(v.wick.text)}</p>` : '<p class="rm-say rm-quiet">wick says nothing.</p>'}
      ${lead ? `<div class="rm-lead"><p class="rm-say">${esc(lead.text)}</p><button type="button" class="btn small" data-camp="show" data-arg="${esc(lead.at)}" title="${esc(`${SERVER[lead.at]?.name}: its card on the map.`)}">On map</button></div>` : ''}
    </section>`;
  const now = (v?.news || []), older = (w.news || []).filter((n) => n.turn < (v?.turn || 0)).slice(-3).sort((a, b) => b.turn - a.turn); // newest turn first, each turn in its own order
  const line = (n, cls = '') => `<li class="${cls}">${linked(n.text, n.at)}</li>`;
  const board = `<section class="card rm-card rm-board" aria-label="board">
      <h2><span class="ico" ${icon('pulse-node')}></span>board <small>${WORLD.on && w.turn ? `turn ${w.turn}` : 'the network'}</small></h2>
      ${now.length ? `<ul class="rm-news">${now.map((n) => line(n)).join('')}</ul>` : '<p class="rm-quiet">Nothing moved.</p>'}
      ${older.length ? `<h3 class="bx-sec">Earlier</h3><ul class="rm-news old">${older.map((n) => line(n, 'old')).join('')}</ul>` : ''}
    </section>`;
  return `<div class="rm">
    <header class="rm-top"><div class="rm-k"><b>LOWLIGHT · back room</b>${v ? `<span>${esc(afterLine(v))}</span>` : ''}</div><p class="rm-sentence">${esc(roomSentence(s))}</p></header>
    ${wick}${board}
    <div class="row acts rm-go"><button type="button" class="btn primary" data-module="campaign">Map</button></div>
  </div>`;
}
