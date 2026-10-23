// The level-up (GAME_RULES.md "Levels"): a firmware update flashed on the screen. A compact panel under the top bar
// (over the prompt on a phone): an amber kicker strip, the level in big phosphor digits beside the flash's progress
// line, then [ OK ] per unlock as the flash finishes, the next level that brings something, and Continue (Enter).
// It lists what the level brings on every track: each gain of the level, the power line, the server's Integrity and the
// next level. Each row's detail is its tooltip (Name: sentence), never on the row. Pure markup builders: no DOM
// (levelup-ui.mjs puts it on the page).
import { ABILITIES, ARCHETYPES, SUBS, FLOORS, CANTRIPS, CONFIG } from './data.mjs';
import { kitTalent, specRule } from './combat.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const andList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0] || '');
const basesTip = (names) => `Protocol bases: ${andList(names)} ${names.length === 1 ? 'starts' : 'start'} to drop.`;
const archOf = (e) => (ARCHETYPES[e.arch] ? e.arch : Object.keys(ARCHETYPES).find((a) => new RegExp(`^LEVEL \\d+ ${ARCHETYPES[a].name}\\b`, 'i').test(e.message || '')) || 'breaker');

// The kinds of unlock. Counted kinds add up when several levels come at once.
export const KINDS = {
  skill: {}, sigint: {}, subclass: {}, edge: {}, talent: { count: true }, capstone: {}, slot: { count: true },
  bases: { count: true }, floor: {}, kit: {}, daemon: { count: true }, memory: { count: true }, power: {}, integrity: {},
};
const skillRule = (arch, id) => ARCHETYPES[arch]?.skills.find((x) => x.id === id)?.rule || String(ABILITIES[id]?.help || '').replace(/^[^—]*— /, '') || '';
const skillId = (arch, name, ids) => [...ids, ...Object.keys(ABILITIES)].find((id) => (ARCHETYPES[arch]?.skills.find((x) => x.id === id)?.name || ABILITIES[id]?.name || CANTRIPS.find((c) => c.id === id)?.name) === name);

// One gain of a level (combat.mjs levelUpGains' words) as a row: { kind, label, value, tip, n }.
// keys: [[key, skill id]] (combat.mjs barKeys), so a new skill shows the key it went on.
export function gainItem(g, e, keys = []) {
  const arch = archOf(e), A = ARCHETYPES[arch], sub = e.sub && SUBS[e.sub] ? e.sub : null;
  let m;
  if (g === 'a subclass to pick') { const subs = Object.values(A.subs).map((x) => x.name); return { kind: 'subclass', label: 'Subclass', value: 'pick one', tip: `Subclass: Choose ${subs.join(' or ')} on the Loadout. Until you do, you play the ${A.name} core.` }; }
  if (sub && g === SUBS[sub].edge.name) return { kind: 'edge', label: g, value: 'edge', tip: `${g}: ${SUBS[sub].edge.rule}` };
  if (g === 'a talent point') return { kind: 'talent', label: 'Talent point', value: '+1', n: 1, tip: 'Talent point: Spend it on the Loadout, under Skills and talents.' };
  if (/^a capstone point/.test(g)) return { kind: 'capstone', label: 'Capstone point', value: '+1', tip: 'Capstone point: Pick one of your subclass\'s two capstones on the Loadout.' };
  if (g === "your capstone's second rank") return { kind: 'capstone', label: 'Capstone', value: 'rank 2', tip: 'Capstone: Your capstone reaches rank 2.' };
  if (/^a protocol slot \(Implant\)/.test(g)) return { kind: 'slot', label: 'Implant slot', value: '+1', n: 1, tip: 'Implant slot: You load one more protocol, an Implant. Implants start to drop.' };
  if (g === 'a protocol slot') return { kind: 'slot', label: 'Protocol slot', value: '+1', n: 1, tip: 'Protocol slot: You load one more protocol.' };
  if ((m = g.match(/^new protocol bases: (.+)$/))) { const names = m[1].split(', '); return { kind: 'bases', label: 'Protocol bases', value: `+${names.length}`, n: names.length, names, tip: basesTip(names) }; }
  if ((m = g.match(/^(.+) \(floor (\d+)\)$/))) { const f = FLOORS[Number(m[2]) - 1]; return { kind: 'floor', label: m[1], value: `floor ${m[2]}`, tip: `${m[1]}: Floor ${m[2]}. Its viruses are level ${f?.band[0]} to ${f?.band[1]}.` }; }
  if ((m = g.match(/^(.+) in your kit$/))) return { kind: 'kit', label: m[1], value: 'kit', tip: `${m[1]}: ${specRule(kitTalent(arch))} Part of your kit.` };
  if (g === 'a daemon slot') return { kind: 'daemon', label: 'Daemon slot', value: '+1', n: 1, tip: 'Daemon slot: One more daemon runs on your server.' };
  if (/^server memory \+1$/.test(g)) return { kind: 'memory', label: 'Server memory', value: '+1', n: 1, tip: 'Server memory: One more server fits on your network.' };
  const id = skillId(arch, g, e.unlocked || []), key = keys.find(([, x]) => x === id)?.[0] || (id === 'sigint' ? '-' : null);
  return { kind: id === 'sigint' ? 'sigint' : 'skill', id, label: g, value: key ? `key ${key}` : 'skill', tip: `${g}: ${skillRule(arch, id) || 'A new skill.'}${key ? ` Key ${key}.` : ''}` };
}

// One or more level-ups that came together (a big XP gain, developer level) as one moment:
// { level, from, cls, items (gains, then power and Integrity), next: { level, text, tip }, skill (a way to the Loadout) }.
export function levelUpSummary(events, keys = []) {
  const evs = [].concat(events).filter((e) => e && e.level);
  if (!evs.length) return null;
  const last = evs.at(-1), arch = archOf(last), items = [];
  for (const e of evs) for (const g of e.gains || []) {
    const it = gainItem(g, e, keys), same = KINDS[it.kind].count && items.find((x) => x.kind === it.kind && x.label === it.label);
    if (same) { same.n += it.n; same.value = `+${same.n}`; if (it.names) { same.names = [...same.names, ...it.names]; same.tip = basesTip(same.names); } }
    else items.push({ ...it });
  }
  const pct = Math.round(CONFIG.powerPerLevel * 100) * evs.length, srv = evs.findLast((e) => e.server)?.server;
  items.push({ kind: 'power', label: 'Power', value: `+${pct}%`, tip: `Power: Your skills deal ${pct}% more damage, and your server's Integrity grows with them.` });
  if (srv) items.push({ kind: 'integrity', label: 'Integrity', value: String(srv), tip: `Integrity: Your server's Integrity is now ${srv}.` });
  const nx = last.next, nItems = nx ? nx.gains.map((g) => gainItem(g, { ...last, level: nx.level })) : [];
  const short = (it) => (['skill', 'sigint', 'floor', 'kit', 'edge'].includes(it.kind) ? it.label : `${it.label} ${it.value}`);
  return {
    level: last.level, from: evs[0].level - 1, cls: ARCHETYPES[arch]?.name || '', arch, items,
    next: nx ? { level: nx.level, text: nItems.map(short).join(' · '), tip: `Level ${nx.level}: ${nItems.map((it) => `${short(it)}.`).join(' ')}` } : null,
    skill: evs.some((e) => (e.unlocked || []).some((id) => id !== 'edge')) || items.some((x) => ['subclass', 'talent', 'capstone'].includes(x.kind)),
    preview: evs.some((e) => e.preview),
  };
}
const row = (it, i, inner) => `<li class="lu-row k-${it.kind}" data-lu="${i}" title="${esc(it.tip)}" style="--i:${i}">${inner}</li>`;
const ariaOf = (sum) => `Level ${sum.level} ${sum.cls}: ${sum.items.map((it) => `${it.label} ${it.value}`).join(', ')}${sum.next ? `. Next, level ${sum.next.level}: ${sum.next.text}` : ''}`;

const FONT = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
// The level as a 3×5 dot font, each dot two characters wide (a square on a mono line): lit dots █, unlit ones faint.
export function bigDigits(n) {
  const ds = String(n).split('').filter((d) => FONT[d]);
  return [0, 1, 2, 3, 4].map((r) => ds.map((d) => FONT[d].slice(r * 3, r * 3 + 3).split('').map((b) => (b === '1' ? '██' : '<i>██</i>')).join('')).join('  ')).join('\n');
}
// The panel. Its rows (and the next line) take no room until each lands, so it grows a row at a time as the flash
// finishes: never an empty block waiting to fill. Continue and Loadout are there from the start.
export function firmwareMarkup(sum) {
  if (!sum) return '';
  const rom = `${sum.cls.toLowerCase()}.rom`;
  return `<div class="lu-b-head"><span>Firmware update · ${esc(rom)}</span><button type="button" class="lu-x" data-lu-close aria-label="Close">×</button></div>`
    + `<div class="lu-b-top"><pre class="lu-b-big" aria-hidden="true">${bigDigits(sum.level)}</pre><div class="lu-b-flash"><span class="lu-b-ver">v${sum.from} → <b>v${sum.level}</b> <small>${esc(sum.cls)}</small></span><span class="lu-b-bar" aria-hidden="true"><i></i></span><span class="lu-b-pct" aria-hidden="true">100%</span></div></div>`
    + `<ul class="lu-b-list" aria-label="${esc(ariaOf(sum))}">${sum.items.map((it, i) => row(it, i, `<span class="lu-ok">[ OK ]</span><span class="lu-k">${esc(it.label)}</span><b class="lu-v">${esc(it.value)}</b>`)).join('')}</ul>`
    + (sum.next ? `<p class="lu-b-next" title="${esc(sum.next.tip)}" style="--i:${sum.items.length}"><span>next</span> v${sum.next.level} · ${esc(sum.next.text)}</p>` : '')
    + `<div class="lu-b-acts">${sum.skill ? '<button type="button" class="btn small" data-module="loadout">Loadout</button>' : ''}<button type="button" class="btn small primary" data-lu-close>Continue <kbd>Enter</kbd></button></div>`;
}

// When the level-up may come up: never during a fight, and not over a card that waits for you (the spoils of a won
// fight, a card that waits for Enter, the boot screen, the subclass breakout). It waits for the next calm moment.
export const luCalm = ({ fighting = false, ended = false, spoils = false, gainModal = false, booting = false } = {}) => !fighting && !ended && !spoils && !gainModal && !booting;
