// The death recap on the Disconnected card: what took your Signal to 0, at a glance. The Signal you ended each of the
// fight's last cycles on (a strip of bars, the last one empty), the hits that did it (a row each, the same attack
// summed, the biggest lit, the last one marked, a tell's icon on a charge you could have cut) and what you took,
// healed and shielded over that span. Built once as the fight ends (combat.mjs disconnect; breach.mjs and
// floorplan.mjs lose) from the fight's own log (s.logs, since its engage) and the Signal it notes each cycle
// (combat.mjs noteSignal, e.fxs.sig: the last 7). It rides the disconnected event or the loss record; nothing else
// is kept. Only yours: a crewmate's events (who) don't count. Pure.
import { floatOf } from './dmgfx.mjs';
import { glyph } from './glyphs.mjs';

export const RECAP = { cycles: 6, rows: 4 };
// A tell's icon, as its chip on the board wears it (view.mjs tellChip), and its answer in one short line.
export const TELL_ICON = { charge: 'event-warning', cast: 'interrupt', seal: 'event-lock', mimic: 'scan', lock: 'event-lock' };
const ANSWER = {
  charge: (p) => `Cut ${p ? `the ${p}` : 'its part'} on its cycle to call it off.`,
  cast: () => 'SIGINT or a cut in its window interrupts it.',
  seal: (p) => `Strip ${p ? `the ${p}` : 'its part'} before it lands.`,
  mimic: () => 'Fire no direct hit on its beat.',
  lock: () => 'Feed it a cooldown.',
};
const HURT = new Set(['attack', 'crit', 'spike', 'reflect', 'encrypt']); // dmgfx kinds that are damage on you

// s: the state as the fight ends, its encounter still on. → { cycles, from, end, max, bars, rows, kill, took, healed,
// shielded } or null. bars: [{ c, from, to, took, healed }], oldest first, the last ending where you did (0).
// rows: [{ name, part, kind, icon, amount, n, crits, tell, last, top }], biggest first, at most RECAP.rows (the one
// with the last hit always among them). kill: the last hit itself { name, part, amount, kind, tell }.
export function deathRecap(s, n = RECAP.cycles) {
  const e = s?.encounter, v = e?.virus;
  if (!v || !e.metrics) return null;
  const d = e.mode === 'run' ? s.run : s.server, max = Math.max(1, d?.max || e.metrics.startIntegrity || 1), end = e.cycle || 0;
  const logs = s.logs || [];
  let i = logs.length;
  while (i-- > 0 && !(logs[i].type === 'engage' && !logs[i].who)); // the fight's start (gone off the log: all of it is this fight)
  const from = Math.max(i >= 0 ? logs[i].cycle : -Infinity, end - n + 1);
  const evs = logs.slice(i + 1).filter((x) => !x.who && x.cycle >= from && x.cycle <= end);
  const P = (id) => (id && v.parts.find((p) => p.id === id)) || null;
  const tellOf = (id) => { const t = id && v.tells?.list?.find((x) => x.id === id); return t ? { kind: t.kind, name: t.name } : null; };
  const took = {}, healed = {}, hits = [];
  let shielded = 0;
  for (const x of evs) {
    if ((x.type === 'heal' && !x.target) || x.type === 'regen') { if (x.amount > 0) healed[x.cycle] = (healed[x.cycle] || 0) + x.amount; continue; }
    if (x.type === 'blocked' && x.shield && x.amount > 0) { shielded += x.amount; continue; }
    if (x.type === 'encrypt' || !(x.amount > 0)) continue; // a stack added, not a hit
    const f = floatOf(x, { partName: (id) => P(id)?.name, attackName: (id) => P(id)?.attack?.name });
    if (!f || f.at !== 'you' || !HURT.has(f.kind)) continue;
    const name = x.atk || (x.type === 'encrypted' ? (x.corrupt ? 'Corruption' : 'Encryption') : x.type === 'scrambled' ? 'Scramble' : x.bounce ? 'Bounced back' : P(x.source)?.attack?.name || 'Attack');
    hits.push({ c: x.cycle, name, part: P(x.source)?.name || '', source: x.source || '', kind: f.kind, icon: f.icon, amount: x.amount, crit: !!x.crit, tell: x.tell ? tellOf(x.tell) : null });
    took[x.cycle] = (took[x.cycle] || 0) + x.amount;
  }
  // The same attack from the same part is one row, summed (encryption every cycle, a part's three hits).
  const groups = new Map(), keyOf = (h) => `${h.source}|${h.name}|${h.kind === 'crit' ? 'attack' : h.kind}`;
  for (const h of hits) {
    const k = keyOf(h);
    const g = groups.get(k) || { name: h.name, part: h.part, kind: h.kind, icon: h.icon, amount: 0, n: 0, crits: 0, tell: null, last: false, top: false, big: 0 };
    g.amount += h.amount; g.n++; if (h.crit) g.crits++; if (h.tell) g.tell = h.tell;
    if (h.amount >= g.big) { g.big = h.amount; g.kind = h.kind; g.icon = h.icon; } // its icon: its biggest hit's (a crit's star)
    groups.set(k, g);
  }
  const lastHit = hits.at(-1) || null;
  if (lastHit) groups.get(keyOf(lastHit)).last = true;
  let rows = [...groups.values()].sort((a, b) => b.amount - a.amount);
  if (rows.length > RECAP.rows) { const keep = rows.slice(0, RECAP.rows); if (!keep.some((r) => r.last)) keep[RECAP.rows - 1] = rows.find((r) => r.last); rows = keep; }
  if (rows.length > 1) rows[0].top = true;
  rows = rows.map(({ big, ...r }) => r);
  // The strip: the Signal at the end of each cycle, noted as it closed; the last is where you ended. A cycle the
  // fight didn't note (a fight from an older save) is worked back from the next one.
  const was = e.fxs?.sig || {}, clamp = (x) => Math.max(0, Math.min(max, Math.round(x)));
  const bars = [];
  let to = clamp(d?.integrity ?? 0);
  for (let c = end; c >= from; c--) {
    const back = was[c - 1] != null ? clamp(was[c - 1]) : clamp(to + (took[c] || 0) - (healed[c] || 0));
    bars.unshift({ c, from: back, to, took: took[c] || 0, healed: healed[c] || 0 });
    to = back;
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    cycles: bars.length, from, end, max, bars, rows,
    kill: lastHit && { name: lastHit.name, part: lastHit.part, amount: lastHit.amount, kind: lastHit.kind, tell: lastHit.tell },
    took: sum(took), healed: sum(healed), shielded,
  };
}

// ---------- the card ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const pct = (x, max) => `${Math.round((Math.max(0, x) / max) * 1000) / 10}%`;
function hitTip(r) {
  const who = r.part ? `The ${r.part}'s ${r.name}` : r.name;
  const out = [`${who} dealt you ${r.amount}${r.n > 1 ? ` over ${r.n} hits` : ''}.`];
  if (r.crits) out.push(r.crits === 1 && r.n === 1 ? 'It was a critical strike.' : `${r.crits} ${r.crits === 1 ? 'was a critical strike' : 'were critical strikes'}.`);
  if (r.tell) out.push(`${r.tell.name} is a ${r.tell.kind === 'lock' ? 'lock' : r.tell.kind}. ${(ANSWER[r.tell.kind] || ANSWER.charge)(r.part)}`);
  if (r.last) out.push(`${r.n > 1 ? 'Its last hit' : 'It'} took your Signal to 0.`);
  return out.join(' ');
}
// The recap as a block for a card (app.js lossCard over the gain card's rows; the breach's and the rooms' loss cards).
export function recapMarkup(r) {
  if (!r?.bars?.length) return '';
  const span = cyc(r.cycles);
  const bars = r.bars.map((b, i) => {
    const lost = Math.max(0, b.from - b.to), tip = `Cycle ${b.c}: Signal ${b.to}/${r.max}.${b.took ? ` You took ${b.took}` : ''}${b.took && b.healed ? ` and healed ${b.healed}` : b.healed ? ` You healed ${b.healed}` : ''}${b.took || b.healed ? '.' : ''}`;
    return `<span class="rc-bar${i === r.bars.length - 1 ? ' end' : ''}" title="${esc(tip)}"><i class="rc-lost" style="height:${pct(lost, r.max)};bottom:${pct(b.to, r.max)}"></i><i class="rc-kept" style="height:${pct(b.to, r.max)}"></i></span>`;
  }).join('');
  const start = r.bars[0].from;
  const rows = r.rows.map((x) => `<li class="rc-hit k-${esc(x.kind)}${x.top ? ' top' : ''}${x.last ? ' last' : ''}" title="${esc(hitTip(x))}">${glyph(x.icon, 'rc-ico')}<span class="rc-name"><b>${esc(x.name)}</b>${x.part ? `<small>${esc(x.part)}</small>` : ''}</span>${x.tell ? `<span class="rc-tell t-${esc(x.tell.kind)}" ${icon(TELL_ICON[x.tell.kind] || TELL_ICON.charge)}></span>` : ''}${x.n > 1 ? `<span class="rc-n">×${x.n}</span>` : ''}${x.last ? '<span class="tag hot rc-last">Last</span>' : ''}<b class="rc-dmg">−${x.amount}</b></li>`).join('');
  const tile = (k, label, val, tip) => `<span class="rc-tot k-${k}${val ? '' : ' none'}" title="${esc(tip)}"><i>${label}</i><b>${!val ? 0 : k === 'took' ? `−${val}` : k === 'healed' ? `+${val}` : val}</b></span>`;
  const aria = `Last ${span}: Signal ${start} to ${r.bars.at(-1).to}, took ${r.took}${r.kill ? `, last hit ${r.kill.name} for ${r.kill.amount}` : ''}`;
  return `<div class="recap" role="group" aria-label="${esc(aria)}">
    <div class="rc-strip" title="${esc(`Your Signal at the end of each of the last ${span}.`)}"><span class="rc-k">Last ${span}</span><span class="rc-bars" style="--n:${r.bars.length}">${bars}</span><span class="rc-ends"><b>${start}</b>→<b class="rc-zero">${r.bars.at(-1).to}</b></span></div>
    ${rows ? `<ul class="rc-hits">${rows}</ul>` : ''}
    <div class="rc-tots">${tile('took', 'Taken', r.took, `Damage you took over the last ${span}.`)}${tile('healed', 'Healed', r.healed, `Signal you healed over the last ${span}.`)}${tile('shielded', 'Shielded', r.shielded, `Damage your shields absorbed over the last ${span}.`)}</div></div>`;
}
