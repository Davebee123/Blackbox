// The content editor: story beats, contract templates and their lists, saved into dist/content/
// through serve.mjs. Templates start every new piece with working text to overwrite. The checker
// (content.mjs) runs as you type; Play from here opens the game at a beat on a test save.
import { check, checkItems, fxText, fill, beatVars, JOB_VARS, COMMON, JOB_TYPES, JOB_NAMES, CONTRACT_KINDS, SIDES, REWARDS, FX_WHEN, FX_IF, FX_DO, FX_SCALE, FX_LIMIT, SOURCE_KINDS } from './content.mjs';
import { BASES, STATS, SLOTS, RARITIES, uniqueItem, statLine, seeded } from './gear.mjs';
import { STRAINS, GUARDS } from './data.mjs';
const ROGUE = { kinds: { nest: { name: 'Nest' }, pit: { name: 'Pit' }, gauntlet: { name: 'Gauntlet' } } }; // (rogue.mjs pulls in the whole engine)
import { zoneRooms } from './zone.mjs';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clone = (x) => JSON.parse(JSON.stringify(x));
const FAMILIES = { ransomware: 'Ransomware', worm: 'Worm', ghostroot: 'Ghostroot' };
const CREWS = { ransomware: 'TOLLGATE', worm: 'SWARMLINE', ghostroot: 'PALEMASK' };
const CODES = { cipher: 'Cipher code', worm: 'Worm code', kernel: 'Kernel code' };

let story = null, contracts = null, items = null, saved = '', sel = { kind: 'beat', i: 0 }, menuOpen = false, lastField = null, sampleSeed = 1;

// ---------- templates: every new piece starts as working text ----------
const BEAT_TEMPLATES = {
  none: { from: 'wick', subject: 'word from the crew', body: ['{handle}. Quick one.', 'Write what happens next here. Each blank line starts a new paragraph.'] },
  kill: { from: 'wick', subject: 'pest control', body: ['{crew} keeps leaving {family} processes on the net.', 'Kill {count} of them. Anywhere you find them.'], job: { type: 'kill', family: 'worm', count: 4 }, reward: { credits: 80, indemnity: 1, standing: 3, xp: 1 } },
  bounty: { from: 'claims', subject: 'Flagged process', body: ['A process called {name} has been seen in SPRAWL-00, in {room}.', 'It is tougher than the strays. Neutralize it.'], job: { type: 'bounty', family: 'ghostroot', name: 'lapse-0101', room: '/tmp' }, reward: { credits: 100, indemnity: 2, standing: 3, xp: 2 } },
  materials: { from: 'claims', subject: 'Sample request', body: ['Our actuaries need fresh {material}.', 'Send {amount} units.'], job: { type: 'materials', material: 'cipher', amount: 3 }, reward: { credits: 90, indemnity: 1, standing: 3, xp: 1 } },
  takeover: { from: 'claims', subject: 'A change of hands', body: ['We would like another server to change hands.', 'Pick any server you have traced, get past its guard and open its vault.'], job: { type: 'takeover', any: true }, reward: { credits: 150, indemnity: 3, standing: 4, xp: 3 } },
  item: { from: 'wick', subject: 'lost and found', body: ['Somebody walked off with {label}: {file}.', 'Its signal is near {took}. Put a relay up, trace the server, pull the file and bank it.'], job: { type: 'item', near: 'took', family: 'ransomware', file: 'lost.db', label: 'a lost database', text: ['binary: describe what the file is when the player cats it.', 'pull it and bank it, then deliver it from Mail.'] }, reward: { credits: 150, indemnity: 4, standing: 4, xp: 3 } },
};
const VARIANT_TEMPLATE = (kind, side) => ({ subject: side === 'glassjaw' ? 'A quiet job' : 'New work', body: [`Write it here. Blanks: ${Object.keys(JOB_VARS[kind]).map((k) => `{${k}}`).join(' ') || '(none for this kind)'}.`] });
const newId = (base) => { let n = 1, id = base; while (story.beats.some((b) => b.id === id)) id = `${base}-${++n}`; return id; };
const slug = (t) => String(t || 'beat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'beat';

// ---------- loading and saving ----------
async function load() {
  const t = Date.now();
  story = clone((await import(`./content/story.mjs?t=${t}`)).default);
  contracts = clone((await import(`./content/contracts.mjs?t=${t}`)).default);
  items = clone((await import(`./content/items.mjs?t=${t}`)).default);
  saved = snapshot();
  render();
}
const snapshot = () => JSON.stringify([story, contracts, items]);
const allChecks = () => [...check(story, contracts), ...checkItems(items, BASES, STATS)];
const dirty = () => snapshot() !== saved;
async function save() {
  const bad = allChecks().filter((x) => x.bad);
  try {
    for (const [name, data] of [['story', story], ['contracts', contracts], ['items', items]]) {
      const r = await fetch(`/__content/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error(await r.text());
    }
    saved = snapshot();
    status(bad.length ? `Saved, with ${bad.length} ${bad.length === 1 ? 'mistake' : 'mistakes'} to fix` : 'Saved', bad.length ? 'bad' : '');
    return true;
  } catch {
    status('Could not save. Run node serve.mjs (restart it if it was running before this update).', 'bad');
    return false;
  }
}
function status(text, cls = '') { const el = $('status'); el.textContent = text; el.className = 'ed-status ' + cls; }
function touched() {
  status(dirty() ? 'Unsaved changes' : 'Saved', dirty() ? 'dirty' : '');
  renderNav(); renderSide();
}

// ---------- the nav ----------
const issuesFor = (id) => allChecks().filter((x) => x.id === id);
function renderNav() {
  const all = allChecks();
  const badIds = new Set(all.filter((x) => x.bad).map((x) => x.id));
  const cur = (k, i) => (sel.kind === k && sel.i === i ? 'true' : 'false');
  const beats = story.beats.map((b, i) => `<li><button type="button" class="ed-item" data-sel="beat:${i}" aria-current="${cur('beat', i)}"><span class="n">${i + 1}</span><span class="t">${esc(b.subject || '(no subject)')}</span><span class="k${badIds.has(b.id) ? ' warn' : ''}">${badIds.has(b.id) ? '!' : esc(b.opensBoard ? 'board' : b.job?.type || 'letter')}</span></button></li>`).join('');
  const kinds = Object.entries(CONTRACT_KINDS).map(([k, x]) => {
    const n = x.sides.reduce((a, side) => a + (contracts[k]?.[side]?.length || 0), 0);
    const bad = x.sides.some((side) => badIds.has(`${k}/${side}`));
    return `<li><button type="button" class="ed-item" data-sel="contract:${k}" aria-current="${cur('contract', k)}"><span class="n">${n}</span><span class="t">${esc(x.name)}</span><span class="k${bad ? ' warn' : ''}">${bad ? '!' : ''}</span></button></li>`;
  }).join('');
  const list = (k, label, n) => `<li><button type="button" class="ed-item" data-sel="${k}:0" aria-current="${cur(k, 0)}"><span class="n">${n}</span><span class="t">${label}</span><span class="k${badIds.has(k) ? ' warn' : ''}">${badIds.has(k) ? '!' : ''}</span></button></li>`;
  $('nav').innerHTML = `<h3>Story</h3><ol>${beats}</ol>
    <div class="ed-new"><button type="button" class="btn small" id="new-beat" aria-expanded="${menuOpen}">+ New beat</button>${menuOpen ? `<div class="ed-menu" role="menu">${JOB_TYPES.map((t) => `<button type="button" role="menuitem" data-new="${t}">${esc(JOB_NAMES[t])}<small>${esc(newHint[t])}</small></button>`).join('')}</div>` : ''}</div>
    <h3>Contract templates</h3><ul>${kinds}</ul>
    <h3>Uniques · ${items.uniques.length}</h3><ul>${items.uniques.map((u, i) => [u, i]).sort((a, b) => a[0].level - b[0].level).map(([u, i]) => `<li><button type="button" class="ed-item" data-sel="unique:${i}" aria-current="${cur('unique', i)}"><span class="n">${u.level}</span><span class="t" style="color:var(--r-zeroday)">${esc(u.name || '(unnamed)')}</span><span class="k${badIds.has(u.id) ? ' warn' : ''}">${badIds.has(u.id) ? '!' : esc(SLOTS[BASES[u.base]?.slot]?.name || '')}</span></button></li>`).join('')}</ul>
    <div class="ed-new"><button type="button" class="btn small" id="new-unique" aria-expanded="${uMenu}">+ New unique</button>${uMenu ? `<div class="ed-menu" role="menu">${Object.entries(UNIQUE_TEMPLATES).map(([k, t]) => `<button type="button" role="menuitem" data-new-unique="${k}">${esc(t.label)}<small>${esc(t.hint)}</small></button>`).join('')}</div>` : ''}</div>
    <h3>Lists</h3><ul>${list('contacts', 'Contacts', Object.keys(story.contacts).length)}${list('files', 'Files to recover', contracts.files.length)}${list('bountyNames', 'Bounty names', contracts.bountyNames.length)}</ul>`;
  const n = all.filter((x) => x.bad).length;
  $('issues-btn').textContent = n ? `${n} ${n === 1 ? 'mistake' : 'mistakes'}` : 'No mistakes';
  $('issues-btn').classList.toggle('has', n > 0);
}
const newHint = { none: 'A letter that moves the story on', kill: 'Kill N processes of a family', bounty: 'One named process in SPRAWL-00', materials: 'Hand over N units of code', takeover: 'Open the vault of any traced server', item: 'Pull a file from an unknown server' };

// ---------- forms ----------
const field = (label, html, hint = '') => `<label class="ed-f"><span>${label}</span>${html}${hint ? `<small class="ed-hint">${hint}</small>` : ''}</label>`;
const input = (path, value, attrs = '') => `<input data-path="${path}" value="${esc(value ?? '')}" ${attrs}>`;
const num = (path, value, attrs = '') => `<input type="number" data-path="${path}" data-num value="${value ?? ''}" ${attrs}>`;
const select = (path, value, opts) => `<select data-path="${path}">${Object.entries(opts).map(([k, v]) => `<option value="${esc(k)}" ${String(value ?? '') === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
const text = (path, paras, cls = '') => `<textarea data-path="${path}" data-paras class="${cls}" spellcheck="true">${esc((paras || []).join('\n\n'))}</textarea>`;
const chips = (vars) => `<div class="ed-chips">${Object.entries(vars).map(([k, v]) => `<button type="button" class="ed-chip" data-blank="${k}" title="${esc(v)}">{${k}}</button>`).join('')}</div>`;
const contactOpts = (extra = {}) => ({ ...extra, ...story.contacts });

function beatForm(i) {
  const b = story.beats[i], p = `beats.${i}`, j = b.job || { type: 'none' }, r = b.reward || {};
  const jobFields = {
    none: '<p class="ed-hint">No job: the next beat follows on its own (after its level and delay, if it has them).</p>',
    kill: `<div class="ed-row">${field('How many', num(p + '.job.count', j.count, 'min="1"'))}${field('Which', select(p + '.job.family', j.family || '', { '': 'Any, in SPRAWL-00', ...FAMILIES }), 'A family counts kills of it anywhere.')}</div>`,
    bounty: `<div class="ed-row">${field('Process name', input(p + '.job.name', j.name))}${field('Family', select(p + '.job.family', j.family, FAMILIES))}${field('SPRAWL-00 folder', select(p + '.job.room', j.room, Object.fromEntries(zoneRooms().map((x) => [x, x]))))}</div>`,
    materials: `<div class="ed-row">${field('Code', select(p + '.job.material', j.material, CODES))}${field('Units', num(p + '.job.amount', j.amount, 'min="1"'))}</div>`,
    takeover: '<p class="ed-hint">Any server the player has traced. Whichever they take becomes {took} for later beats.</p>',
    item: `<div class="ed-row">${field('File name', input(p + '.job.file', j.file))}${field('What it is', input(p + '.job.label', j.label), 'Lower case: “a stolen ledger”.')}${field('Server family', select(p + '.job.family', j.family, FAMILIES))}</div>
      ${field('What cat shows', text(p + '.job.text', j.text, 'short'), 'An unknown server next to the one you took over holds it. A relay flags it; the player traces it.')}`,
  }[j.type] || '';
  return `<h1>Beat ${i + 1}</h1><p class="lede">A letter, maybe with a job. It arrives once the beat before it is done.</p>
    <div class="ed-acts"><button type="button" class="btn primary" data-act="play">Play from here</button><button type="button" class="btn" data-act="up" ${i ? '' : 'disabled'}>Move up</button><button type="button" class="btn" data-act="down" ${i < story.beats.length - 1 ? '' : 'disabled'}>Move down</button><button type="button" class="btn" data-act="dup">Duplicate</button><button type="button" class="btn danger" data-act="del">Delete</button></div>
    <section class="ed-sec"><h2>Letter</h2>
      <div class="ed-row">${field('From', select(p + '.from', b.from, contactOpts()))}${field('Subject', input(p + '.subject', b.subject))}</div>
      ${field('Text', text(p + '.body', b.body), 'A blank line starts a new paragraph. Click a blank to insert it.')}${chips(beatVars(b))}
    </section>
    <section class="ed-sec"><h2>Job</h2><div class="ed-row">${field('Type', select(p + '.job.type', j.type, JOB_NAMES))}</div>${jobFields}</section>
    ${b.job ? `<section class="ed-sec"><h2>Reward</h2><div class="ed-row">${['credits', 'indemnity', 'standing', 'xp', 'relay'].map((k) => field(REWARDS[k], num(`${p}.reward.${k}`, r[k], 'min="0" step="any"'))).join('')}</div>
      <div class="ed-row">${field('A unique item', select(p + '.reward.item', r.item || '', { '': 'None', ...Object.fromEntries(items.uniques.map((u) => [u.id, `${u.name} (lv ${u.level})`])) }), 'Given at the player\'s level when they deliver.')}</div>
      <div class="ed-row">${['blueprint', 'daemon'].map((k) => `<label class="ed-check"><input type="checkbox" data-path="${p}.reward.${k}" ${r[k] ? 'checked' : ''}> ${REWARDS[k]}</label>`).join('')}</div></section>` : ''}
    <section class="ed-sec"><h2>Arrives</h2><div class="ed-row">${field('Not before level', num(p + '.when.level', b.when?.level, 'min="1" max="50" placeholder="any"'))}${field('Minutes after the beat before', num(p + '.when.delay', b.when?.delay, 'min="0" placeholder="0"'))}</div>
      <label class="ed-check"><input type="checkbox" data-path="${p}.opensBoard" ${b.opensBoard ? 'checked' : ''}> This beat opens the contract board and the Halcyon store</label></section>
    <section class="ed-sec"><h2>Id</h2>${field('Beat id', input(p + '.id', b.id), 'Saves remember which beats they have seen by id. Change it only before anyone has played it.')}</section>`;
}

function contractForm(k) {
  const kind = CONTRACT_KINDS[k];
  const sides = kind.sides.map((side) => {
    const list = (contracts[k] ||= {})[side] ||= [];
    const vars = { ...COMMON, ...JOB_VARS[k] };
    const rows = list.map((v, n) => {
      const p = `contracts.${k}.${side}.${n}`;
      return `<div class="ed-variant"><div class="ed-row">${field('Subject', input(p + '.subject', v.subject))}${field('From', select(p + '.from', v.from || '', contactOpts({ '': side === 'glassjaw' ? 'GLASSJAW (default)' : 'Halcyon or wick (default)' })))}</div>
        ${field('Text', text(p + '.body', v.body, 'short'))}${chips(vars)}
        <div class="ed-acts"><button type="button" class="btn small" data-act="vdup" data-at="${k}.${side}.${n}">Duplicate</button><button type="button" class="btn small danger" data-act="vdel" data-at="${k}.${side}.${n}">Delete</button></div></div>`;
    }).join('');
    return `<section class="ed-sec"><h2>${esc(SIDES[side])} · ${list.length}</h2>${rows || '<p class="ed-hint">No variants yet.</p>'}<button type="button" class="btn small" data-act="vnew" data-at="${k}.${side}">+ Variant</button></section>`;
  }).join('');
  return `<h1>${esc(kind.name)}</h1><p class="lede">Contracts on the board are generated; this is what they say. The game picks one variant at random each time. More variants, more variety.</p>${sides}`;
}

function listForm(kind) {
  if (kind === 'contacts') {
    const used = new Set([...story.beats.map((b) => b.from), ...Object.values(CONTRACT_KINDS).length ? Object.keys(CONTRACT_KINDS).flatMap((k) => Object.values(contracts[k] || {}).flat().map((v) => v.from)) : [], 'wick', 'claims', 'glassjaw']);
    const rows = Object.entries(story.contacts).map(([id, name]) => `<div class="ed-list-row"><input value="${esc(id)}" disabled title="The id letters refer to"><input data-contact="${esc(id)}" value="${esc(name)}"><button type="button" class="btn small danger" data-act="cdel" data-at="${esc(id)}" ${used.has(id) ? 'disabled title="In use"' : ''}>Delete</button></div>`).join('');
    return `<h1>Contacts</h1><p class="lede">Who writes to the player. The id on the left is what beats use; the name on the right is what the inbox shows. wick, claims and glassjaw are built in.</p>
      <section class="ed-sec">${rows}<div class="ed-list-row"><input id="cnew-id" placeholder="new id (lower case)"><input id="cnew-name" placeholder="Name as shown in Mail"><button type="button" class="btn small" data-act="cnew">Add</button></div></section>`;
  }
  if (kind === 'files') {
    const rows = contracts.files.map((f, n) => `<div class="ed-list-row three">${input(`contracts.files.${n}.file`, f.file, 'placeholder="file.db"')}${input(`contracts.files.${n}.label`, f.label, 'placeholder="what it is"')}${input(`contracts.files.${n}.line`, f.line, 'placeholder="what cat shows"')}<button type="button" class="btn small danger" data-act="fdel" data-at="${n}">Delete</button></div>`).join('');
    return `<h1>Files to recover</h1><p class="lede">Recover-a-file contracts pick one of these. File name, what it is (lower case, it fills {label}), and what the player sees when they cat it.</p><section class="ed-sec">${rows}<button type="button" class="btn small" data-act="fnew">+ File</button></section>`;
  }
  return `<h1>Bounty names</h1><p class="lede">Bounty contracts name their process with one of these plus a number (lapsejack-4821).</p>
    <section class="ed-sec">${field('One per line', `<textarea data-path="contracts.bountyNames" data-lines class="short">${esc(contracts.bountyNames.join('\n'))}</textarea>`)}</section>`;
}

function renderForm() {
  const f = $('form');
  f.innerHTML = sel.kind === 'unique' ? (items.uniques[sel.i] ? uniqueForm(sel.i) : '<p class="quiet">No uniques yet.</p>') : sel.kind === 'beat' ? (story.beats[sel.i] ? beatForm(sel.i) : '<p class="quiet">No beats yet. Add one from the list.</p>') : sel.kind === 'contract' ? contractForm(sel.i) : listForm(sel.kind);
  f.scrollTop = 0;
}

// ---------- the preview ----------
// Sample values, so the preview reads like the game.
function sampleVars(job = {}) {
  const fam = job.family || ['worm', 'ransomware', 'ghostroot'][sampleSeed % 3];
  return { handle: 'dave', crewName: 'LOWLIGHT', took: 'KESSLER-RELAY-22', count: job.count ?? 4, family: job.type === 'kill' && !job.family ? 'stray' : FAMILIES[fam].toLowerCase(), crew: job.type === 'kill' && !job.family ? 'the crews' : CREWS[fam],
    name: job.name || `${contracts.bountyNames[sampleSeed % contracts.bountyNames.length] || 'rider'}-4821`, room: job.room || '/tmp', amount: job.amount ?? 3, material: CODES[job.material || 'worm'].toLowerCase(),
    server: job.any ? 'any server you have traced' : 'VANTA-MIRROR-41', owner: 'VANTA', file: job.file || contracts.files[sampleSeed % contracts.files.length]?.file, label: job.label || contracts.files[sampleSeed % contracts.files.length]?.label || '',
    get Label() { return this.label ? this.label[0].toUpperCase() + this.label.slice(1) : ''; } };
}
const letterCard = (from, subject, body, extra = '') => `<section class="card mread"><h2>${esc(from)}</h2><h1>${esc(subject)}</h1><div class="mbody">${(body || []).filter((x) => String(x).trim()).map((l) => `<p>${esc(l)}</p>`).join('')}</div>${extra}</section>`;
function jobLine(b) {
  const j = b.job; if (!j) return b.opensBoard ? '<div class="ed-job">Opens the contract board and the store.</div>' : '';
  const what = { kill: `Kill ${j.count} ${j.family ? FAMILIES[j.family] : ''} processes${j.family ? '' : ' in SPRAWL-00'}`, bounty: `Kill ${j.name} (${j.room})`, materials: `Deliver ${j.amount} ${CODES[j.material]}`, takeover: 'Take over a server', item: `Recover ${j.file}` }[j.type] || '';
  const r = b.reward || {};
  const pay = [r.credits && `${r.credits} credits`, r.indemnity && `${r.indemnity} Indemnity`, r.standing && `+${r.standing} standing`, r.xp && `${r.xp}× XP`, r.relay && `${r.relay} relay`, r.blueprint && 'a blueprint', r.daemon && 'a daemon'].filter(Boolean).join(' · ');
  return `<div class="ed-job"><b>${esc(what)}</b><br>${esc(pay || 'No reward')}${b.opensBoard ? '<br>Opens the contract board and the store.' : ''}</div>`;
}
function renderSide() {
  const side = $('side');
  let issues = [], preview = '';
  if (sel.kind === 'unique' && items.uniques[sel.i]) {
    const u = items.uniques[sel.i];
    issues = issuesFor(u.id);
    preview = uniquePreview(u);
  } else if (sel.kind === 'beat' && story.beats[sel.i]) {
    const b = story.beats[sel.i], v = sampleVars(b.job || {});
    issues = issuesFor(b.id);
    const when = [b.when?.level && `not before level ${b.when.level}`, b.when?.delay && `${b.when.delay} min after the beat before`].filter(Boolean).join(', ');
    preview = `<h3>In Mail</h3><p class="ed-sample">Sample: handle “dave”${when ? ` · arrives ${esc(when)}` : ''}</p>${letterCard(story.contacts[b.from] || b.from, fill(b.subject, v), (b.body || []).map((x) => fill(x, v)), jobLine(b))}`;
  } else if (sel.kind === 'contract') {
    const k = sel.i;
    issues = CONTRACT_KINDS[k].sides.flatMap((side) => issuesFor(`${k}/${side}`));
    preview = CONTRACT_KINDS[k].sides.map((side) => {
      const list = contracts[k]?.[side] || [];
      if (!list.length) return '';
      const vv = list[sampleSeed % list.length], v = sampleVars({ type: k.replace('-unknown', ''), family: null, ...(k === 'kill' ? { family: ['worm', 'ransomware', 'ghostroot'][sampleSeed % 3] } : {}) });
      const from = vv.from ? story.contacts[vv.from] : side === 'glassjaw' ? story.contacts.glassjaw : story.contacts.claims;
      return `<h3>${esc(SIDES[side])} · variant ${(sampleSeed % list.length) + 1} of ${list.length}</h3>${letterCard(from, fill(vv.subject, v), (vv.body || []).map((x) => fill(x, v)))}`;
    }).join('') + '<button type="button" class="btn small" data-act="reroll">Another sample</button>';
  } else {
    issues = issuesFor(sel.kind);
  }
  const all = allChecks();
  const list = (xs) => `<ul class="ed-issues">${xs.map((x) => `<li class="${x.bad ? '' : 'warn'}"><b>${esc(x.where)}</b>${esc(x.msg)}${x.id && !issues.includes(x) ? ` <button type="button" class="btn small" data-goto="${esc(x.id)}">Show</button>` : ''}</li>`).join('')}</ul>`;
  side.innerHTML = `${issues.length ? `<h3>Here</h3>${list(issues)}` : '<p class="ed-ok">Nothing wrong here.</p>'}${preview}
    ${all.length > issues.length ? `<h3>Everywhere else</h3>${list(all.filter((x) => !issues.includes(x)))}` : ''}`;
}
function render() { renderNav(); renderForm(); renderSide(); touched(); }


// ---------- uniques ----------
let uMenu = false;
const STAT_NAME = (k) => STATS[k]?.name || k;
const STAT_OPTS = Object.fromEntries(Object.keys(STATS).filter((k) => STATS[k].side !== 'server').map((k) => [k, STATS[k].name]));
const fmtRange = (v) => (Array.isArray(v) ? `${v[0]}–${v[1]}` : v ?? '');
// Templates: each starts as a working unique to change.
const UNIQUE_TEMPLATES = {
  plain: { label: 'Big numbers, no effect', hint: 'A simple early unique', u: { base: 'proof-of-concept', level: 3, primary: { damage: [9, 11], signal: 12 }, secondary: { crit: 4 } } },
  hit: { label: 'Bonus damage on a condition', hint: 'When you hit a part, if …', u: { base: 'weaponized-exploit', level: 8, primary: { damage: [13, 16] }, secondary: { crit: 4 }, effect: { when: 'hit', if: 'target-below-half', do: 'damage%', value: 30 } } },
  start: { label: 'Something at the start of each fight', hint: 'A chit, or a guaranteed first crit', u: { base: 'socks-tunnel', level: 8, primary: { signal: 65, reduction: 2 }, effect: { when: 'start', do: 'chit' } } },
  struck: { label: 'When you get hit', hint: 'Halve it, restore, once per fight or run', u: { base: 'tty-upgrade', level: 10, primary: { signal: 32, regen: 2 }, effect: { when: 'struck', if: 'below-20', do: 'restore%', value: 25, limit: 'run' } } },
  stat: { label: 'A stat that doubles', hint: 'While a condition holds', u: { base: 'cron-job', level: 8, primary: { damage: 6, signal: 22 }, secondary: { evasion: 4 }, effect: { when: 'always', if: 'even-cycle', do: 'stat-x2', stat: 'evasion' } } },
  tradeoff: { label: 'Huge numbers with a downside', hint: 'GLASSJAW style', u: { base: 'weaponized-exploit', level: 10, primary: { damage: [20, 24] }, downside: { reduction: -2 } } },
};
function newUnique(kind) {
  const t = clone(UNIQUE_TEMPLATES[kind].u);
  let n = 1, id = 'new-unique';
  while (items.uniques.some((u) => u.id === id)) id = `new-unique-${++n}`;
  items.uniques.push({ id, name: 'New Unique', ...t, sources: [{ kind: 'sprawl' }], flavour: 'One line of flavour.' });
  sel = { kind: 'unique', i: items.uniques.length - 1 };
  uMenu = false;
  render();
  $('form').querySelector('[data-path$=".name"]')?.select();
}
function uniqueAct(what, at) {
  const u = items.uniques[sel.i];
  if (what === 'dup') { const c = clone(u); c.id = u.id + '-copy'; c.name = u.name + ' (copy)'; items.uniques.push(c); sel.i = items.uniques.length - 1; }
  if (what === 'del' && confirmDelete(`“${u.name}”`)) { items.uniques.splice(sel.i, 1); sel.i = Math.max(0, sel.i - 1); }
  if (what === 'base') { const b = BASES[u.base]; u.primary = {}; for (const [k, v] of Object.entries(b.primary)) u.primary[k] = Array.isArray(v) ? v.map((x) => Math.round(x * 1.3 * (1 + 0.04 * (u.level - b.level)))) : Math.round(v * 1.3 * (1 + 0.04 * (u.level - b.level)) * 10) / 10; }
  if (what === 'stat-add') { const part = (u[at] ||= {}); const k = Object.keys(STAT_OPTS).find((x) => !(x in part)); part[k] = at === 'downside' ? -1 : 1; }
  if (what === 'stat-del') { const [part, k] = at.split(':'); delete u[part][k]; if (!Object.keys(u[part]).length) delete u[part]; }
  if (what === 'fx-add') u.effect = { when: 'hit', do: 'damage%', value: 20 };
  if (what === 'fx-del') delete u.effect;
  if (what === 'src-add') (u.sources ||= []).push({ kind: 'sprawl' });
  if (what === 'src-del') u.sources.splice(+at, 1);
  render();
}
// A stat row: renaming the stat moves its value.
function onStatRow(el) {
  const u = items.uniques[sel.i], part = el.dataset.kv, key = el.dataset.key;
  if (el.tagName === 'SELECT') { const v = u[part][key]; delete u[part][key]; u[part][el.value] = v; renderForm(); }
  else { const m = el.value.match(/(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)/); u[part][key] = m ? [Number(m[1]), Number(m[2])] : Number(el.value) || 0; }
  touched();
}
const statRows = (u, part) => Object.entries(u[part] || {}).map(([k, v]) => `<div class="ed-list-row"><select data-kv="${part}" data-key="${k}">${Object.entries(STAT_OPTS).map(([x, n]) => `<option value="${x}" ${x === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><input data-kv="${part}" data-key="${k}" value="${esc(fmtRange(v))}" title="A number, or a range like 9–11"><button type="button" class="btn small danger" data-act="u-stat-del" data-at="${part}:${k}">Remove</button></div>`).join('');
const sourceIds = (kind) => ({
  strain: Object.fromEntries(Object.entries(STRAINS).map(([k, x]) => [k, `${x.name} (from lv ${x.from})`])),
  guard: Object.fromEntries(Object.entries(GUARDS).map(([k, x]) => [k, x.name + (x.ice ? ' ICE' : '')])),
  rogue: { '': 'Any rogue server', ...Object.fromEntries(Object.entries(ROGUE.kinds).map(([k, x]) => [k, x.name])) },
  story: Object.fromEntries(story.beats.map((b) => [b.id, b.subject])),
  contract: { takeover: 'A takeover contract', glassjaw: 'A GLASSJAW job' },
}[kind]);
function uniqueForm(i) {
  const u = items.uniques[i], p = `items.uniques.${i}`, fx = u.effect, b = BASES[u.base];
  const baseOpts = Object.fromEntries(Object.entries(BASES).map(([k, x]) => [k, `${SLOTS[x.slot].name}: ${x.name} (lv ${x.level})`]));
  const doOpts = fx ? Object.fromEntries(Object.entries(FX_DO).filter(([, d]) => d.when.includes(fx.when)).map(([k, d]) => [k, d.label])) : {};
  const d = fx && FX_DO[fx.do];
  const fxHtml = fx ? `<div class="ed-row">${field('When', select(p + '.effect.when', fx.when, FX_WHEN))}${field('If', select(p + '.effect.if', fx.if || '', FX_IF))}${field('Does', select(p + '.effect.do', fx.do, doOpts))}</div>
      <div class="ed-row">${d?.value ? field('X', num(p + '.effect.value', fx.value, 'min="0" step="any"')) : ''}${d?.stat ? field('Which stat', select(p + '.effect.stat', fx.stat || '', { '': 'Pick one', ...STAT_OPTS })) : ''}${d?.value ? field('Scales', select(p + '.effect.scale', fx.scale || '', FX_SCALE)) : ''}${fx.scale ? field('Up to', num(p + '.effect.cap', fx.cap, 'min="0" step="any" placeholder="no cap"')) : ''}</div>
      <div class="ed-row">${field('How often', select(p + '.effect.limit', fx.limit || '', FX_LIMIT))}${fx.limit === 'cooldown' ? field('Minutes', num(p + '.effect.cooldown', fx.cooldown, 'min="1"')) : ''}</div>
      ${field('Wording (optional)', input(p + '.effect.text', fx.text, `placeholder="${esc(fxText(fx, STAT_NAME))}"`), 'Leave empty to use the generated line shown above the box.')}
      <button type="button" class="btn small danger" data-act="u-fx-del">Remove the effect</button>`
    : '<p class="ed-hint">No effect: just numbers. Early uniques are often like this.</p><button type="button" class="btn small" data-act="u-fx-add">+ Effect</button>';
  const srcs = (u.sources || []).map((src, n) => {
    const ids = sourceIds(src.kind);
    return `<div class="ed-row">${field('From', select(`${p}.sources.${n}.kind`, src.kind, SOURCE_KINDS))}${ids ? field('Which', select(`${p}.sources.${n}.id`, src.id || '', ids)) : ''}${['vault', 'rogue'].includes(src.kind) ? field('From layer', num(`${p}.sources.${n}.layer`, src.layer, 'min="1" max="6" placeholder="1"')) : ''}<div class="ed-f"><span>&nbsp;</span><button type="button" class="btn small danger" data-act="u-src-del" data-at="${n}">Remove</button></div></div>`;
  }).join('');
  return `<h1 style="color:var(--r-zeroday)">${esc(u.name || 'Unique')}</h1><p class="lede">A gold Zero-day: fixed name, stats and effect. Its numbers grow when it drops at a higher level; its downside doesn't.</p>
    <div class="ed-acts"><button type="button" class="btn" data-act="u-dup">Duplicate</button><button type="button" class="btn danger" data-act="u-del">Delete</button></div>
    <section class="ed-sec"><h2>Identity</h2><div class="ed-row">${field('Name', input(p + '.name', u.name))}${field('Id', input(p + '.id', u.id), 'Saves remember items by id.')}</div>
      <div class="ed-row">${field('Base', select(p + '.base', u.base, baseOpts))}${field('Level', num(p + '.level', u.level, 'min="1" max="60"'), 'It can drop from 2 levels below this.')}</div>
      ${field('Flavour', input(p + '.flavour', u.flavour), 'One line, shown on hover.')}</section>
    <section class="ed-sec"><h2>Primary stats</h2><p class="ed-hint">${b ? `${esc(b.name)} gives ${esc(Object.entries(b.primary).map(([k, v]) => `${fmtRange(v)} ${STAT_NAME(k)}`).join(', '))} at level ${b.level}. A unique is usually about ×1.3.` : ''}</p>${statRows(u, 'primary')}
      <div class="ed-acts"><button type="button" class="btn small" data-act="u-stat-add" data-at="primary">+ Stat</button><button type="button" class="btn small" data-act="u-base">Fill from base ×1.3</button></div></section>
    <section class="ed-sec"><h2>Secondary stats</h2>${statRows(u, 'secondary') || '<p class="ed-hint">None.</p>'}<div class="ed-acts"><button type="button" class="btn small" data-act="u-stat-add" data-at="secondary">+ Stat</button></div></section>
    <section class="ed-sec"><h2>Downside</h2>${statRows(u, 'downside') || '<p class="ed-hint">None. Use negative numbers.</p>'}<div class="ed-acts"><button type="button" class="btn small" data-act="u-stat-add" data-at="downside">+ Downside</button></div></section>
    <section class="ed-sec"><h2>Effect</h2>${fx ? `<p class="ed-sample" style="margin:0 0 10px;color:var(--r-zeroday)">${esc(fxText(fx, STAT_NAME))}</p>` : ''}${fxHtml}</section>
    <section class="ed-sec"><h2>Drops from</h2>${srcs || '<p class="ed-hint">Nowhere yet.</p>'}<div class="ed-acts"><button type="button" class="btn small" data-act="u-src-add">+ Source</button></div>
      <p class="ed-hint">Kills and vaults roll a gold about every 5–6 hours of play, then pick a unique that drops there. A strain's own unique also has a 1 in 200 chance per kill of that strain. Story and contract sources give it as a reward.</p></section>`;
}
// How it looks in the game, at its own level and found 10 levels later.
function uniquePreview(u) {
  if (!BASES[u.base]) return '';
  const tile = (L) => {
    let it;
    try { it = uniqueItem(u, L, seeded(sampleSeed)); } catch { return ''; }
    const stats = Object.entries(it.stats).filter(([k]) => STATS[k]).map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}">${esc(statLine({ [k]: v }))}</span>`).join(' · ');
    return `<li class="ptile stash r-zeroday"><span class="ptile-slot">${esc(SLOTS[BASES[u.base].slot].name)}</span><b class="iname r-zeroday" title="${esc(u.flavour || '')}">${esc(u.name)} v${L}</b><small>${stats}</small>${u.effect ? `<small class="zd">${esc(fxText(u.effect, STAT_NAME))}</small>` : ''}</li>`;
  };
  return `<h3>On the Loadout page</h3><ul class="ptiles">${tile(u.level)}${tile(u.level + 10)}</ul><p class="ed-sample">At its own level, and found 10 levels later. ${esc(u.flavour || '')}</p>`;
}

// ---------- editing ----------
function setPath(path, value) {
  const keys = path.split('.');
  let o = keys[0] === 'contracts' ? contracts : keys[0] === 'items' ? items : story;
  if (keys[0] === 'contracts' || keys[0] === 'items') keys.shift();
  for (let n = 0; n < keys.length - 1; n++) o = o[keys[n]] ??= /^\d+$/.test(keys[n + 1]) ? [] : {};
  const last = keys.at(-1);
  if (value === undefined || value === '' || value === null) delete o[last]; else o[last] = value;
}
function onInput(e) {
  const el = e.target;
  const path = el.dataset.path;
  if (el.dataset.contact) { story.contacts[el.dataset.contact] = el.value; return touched(); }
  if (el.dataset.kv) return onStatRow(el);
  if (!path) return;
  let v = el.type === 'checkbox' ? el.checked || undefined : el.value;
  if (el.dataset.num !== undefined) v = el.value === '' ? undefined : Number(el.value);
  if (el.dataset.paras !== undefined) v = el.value.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (el.dataset.lines !== undefined) v = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
  if (el.dataset.range !== undefined) { const m = el.value.match(/(-?[\d.]+)\s*[-–to]+\s*(-?[\d.]+)/); v = m ? [Number(m[1]), Number(m[2])] : el.value.trim() === '' ? undefined : Number(el.value); if (Number.isNaN(v)) return; }
  // Changing a beat's job type: start it from that type's template.
  const m = path.match(/^beats\.(\d+)\.job\.type$/);
  if (m) {
    const b = story.beats[+m[1]];
    if (v === 'none') { delete b.job; delete b.reward; }
    else { b.job = clone(BEAT_TEMPLATES[v].job); b.reward ||= clone(BEAT_TEMPLATES[v].reward); }
    renderForm();
    return touched();
  }
  setPath(path, v);
  // A unique's effect: picking "when" narrows "does"; picking a source kind clears its id.
  const fx = path.match(/^items\.uniques\.(\d+)\.effect\.(when|do|limit)$/);
  if (fx) { const e = items.uniques[+fx[1]].effect; if (fx[2] === 'when') { if (!FX_DO[e.do]?.when.includes(e.when)) e.do = Object.keys(FX_DO).find((k) => FX_DO[k].when.includes(e.when)); if ((/^target-/.test(e.if || '') && e.when !== 'hit') || (e.if === 'crit' && e.when !== 'break')) delete e.if; } renderForm(); return touched(); }
  if (/^items\.uniques\.\d+\.sources\.\d+\.kind$/.test(path)) { const src = items.uniques[sel.i].sources[+path.split('.')[4]]; delete src.id; delete src.layer; renderForm(); return touched(); }
  if (/^items\.uniques\.\d+\.(base|level)$/.test(path)) { renderForm(); return touched(); }
  if (/\.when\.\w+$/.test(path) && sel.kind === 'beat') { const b = story.beats[sel.i]; if (b.when && !Object.keys(b.when).length) delete b.when; }
  if (/\.id$/.test(path)) renderNav();
  touched();
}
function act(name, at) {
  const b = story.beats;
  if (name === 'play') return save().then((ok) => ok && window.open(`./?playtest=story&beat=${encodeURIComponent(b[sel.i].id)}`, 'blackbox-test'));
  if (name === 'up' || name === 'down') { const i = sel.i, k = name === 'up' ? i - 1 : i + 1; [b[i], b[k]] = [b[k], b[i]]; sel.i = k; }
  if (name === 'dup') { const c = clone(b[sel.i]); c.id = newId(c.id); b.splice(sel.i + 1, 0, c); sel.i++; }
  if (name === 'del' && confirmDelete(`beat “${b[sel.i].subject}”`)) { b.splice(sel.i, 1); sel.i = Math.max(0, sel.i - 1); }
  if (name === 'vnew') { const [k, side] = at.split('.'); ((contracts[k] ||= {})[side] ||= []).push(VARIANT_TEMPLATE(k, side)); }
  if (name === 'vdup') { const [k, side, n] = at.split('.'); contracts[k][side].splice(+n + 1, 0, clone(contracts[k][side][+n])); }
  if (name === 'vdel') { const [k, side, n] = at.split('.'); contracts[k][side].splice(+n, 1); }
  if (name === 'fnew') contracts.files.push({ file: 'new.dat', label: 'a new file', line: 'binary: what it is.' });
  if (name === 'fdel') contracts.files.splice(+at, 1);
  if (name === 'cdel') delete story.contacts[at];
  if (name === 'cnew') {
    const id = slug($('cnew-id').value).replace(/-/g, ''), nm = $('cnew-name').value.trim();
    if (!id || !nm || story.contacts[id]) return status(story.contacts[id] ? `There is already a contact “${id}”.` : 'A new contact needs an id and a name.', 'bad');
    story.contacts[id] = nm;
  }
  if (name === 'reroll') { sampleSeed++; return renderSide(); }
  if (name.startsWith('u-')) return uniqueAct(name.slice(2), at);
  render();
}
const confirmDelete = (what) => window.confirm(`Delete ${what}? (You can still close the editor without saving to undo it.)`);
function newBeat(type) {
  const t = clone(BEAT_TEMPLATES[type]);
  const at = sel.kind === 'beat' ? sel.i + 1 : story.beats.findIndex((b) => b.opensBoard) + 1 || story.beats.length;
  story.beats.splice(at, 0, { id: newId(slug(t.subject)), ...t });
  sel = { kind: 'beat', i: at };
  menuOpen = false;
  render();
  $('form').querySelector('[data-path$=".subject"]')?.select();
}
function gotoId(id) {
  const i = story.beats.findIndex((b) => b.id === id), u = items.uniques.findIndex((x) => x.id === id);
  if (u >= 0) sel = { kind: 'unique', i: u };
  else if (i >= 0) sel = { kind: 'beat', i };
  else if (id.includes('/')) sel = { kind: 'contract', i: id.split('/')[0] };
  else sel = { kind: id, i: 0 };
  render();
}

// ---------- wiring ----------
$('nav').addEventListener('click', (e) => {
  const s = e.target.closest('[data-sel]');
  if (s) { const [kind, i] = s.dataset.sel.split(':'); sel = { kind, i: kind === 'beat' || kind === 'unique' ? +i : kind === 'contract' ? i : 0 }; menuOpen = uMenu = false; return render(); }
  if (e.target.closest('#new-beat')) { menuOpen = !menuOpen; uMenu = false; return renderNav(); }
  if (e.target.closest('#new-unique')) { uMenu = !uMenu; menuOpen = false; return renderNav(); }
  const nu = e.target.closest('[data-new-unique]');
  if (nu) return newUnique(nu.dataset.newUnique);
  const n = e.target.closest('[data-new]');
  if (n) newBeat(n.dataset.new);
});
for (const pane of ['form', 'side']) $(pane).addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a) return act(a.dataset.act, a.dataset.at);
  const g = e.target.closest('[data-goto]');
  if (g) return gotoId(g.dataset.goto);
  const c = e.target.closest('[data-blank]');
  if (c && lastField && document.body.contains(lastField)) {
    const ins = `{${c.dataset.blank}}`, s0 = lastField.selectionStart ?? lastField.value.length;
    lastField.setRangeText(ins, s0, lastField.selectionEnd ?? s0, 'end');
    lastField.focus();
    lastField.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
$('form').addEventListener('input', onInput);
$('form').addEventListener('focusin', (e) => { if (e.target.matches('textarea, input:not([type=number]):not([type=checkbox])')) lastField = e.target; });
$('save').addEventListener('click', save);
$('issues-btn').addEventListener('click', () => { const first = allChecks().find((x) => x.bad); if (first?.id) gotoId(first.id); else renderSide(); });
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } if (e.key === 'Escape' && (menuOpen || uMenu)) { menuOpen = uMenu = false; renderNav(); } });
window.addEventListener('beforeunload', (e) => { if (story && dirty()) { e.preventDefault(); e.returnValue = ''; } });
load().catch((err) => status('Could not load the content: ' + err.message, 'bad'));
