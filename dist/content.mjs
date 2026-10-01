// Written content: the story beats and the contract templates (dist/content/*.mjs, edited in
// editor.html). This module knows what each kind of text can say ({blanks}), fills them in, and
// checks a draft for mistakes. mail.mjs uses it in the game; the editor and content.test.mjs use
// the checker.

// The blanks each kind of text can use. The game fills them; anything else shows up as typed.
export const COMMON = { handle: 'your handle (the name you logged in with)', crewName: 'your crew: LOWLIGHT' };
export const JOB_VARS = {
  none: {},
  kill: { count: 'how many to kill', family: 'the family, lower case (worm), or "stray" for any', crew: 'the crew that runs that family (SWARMLINE)' },
  bounty: { name: 'the named process (claimjack-0412)', family: 'its family, lower case', room: 'the SPRAWL-00 folder it sits in' },
  materials: { amount: 'how many units', material: 'the code, lower case (worm code)' },
  takeover: { server: 'the server to take (KESSLER-RELAY-22), or "any server you have traced"', owner: 'who runs it (KESSLER)', crew: 'the crew it belongs to' },
  'takeover-unknown': {},
  item: { file: 'the file name (policy.db)', label: 'what it is, lower case (a stolen policy database)', Label: 'the same, capitalised', server: 'the server it sits on' },
  'item-unknown': { file: 'the file name', label: 'what it is, lower case', Label: 'the same, capitalised' },
};
// Story beats also know the server you took over in the Turf job.
export const STORY_VARS = { took: 'the server you took over (once you have one)' };
export const JOB_TYPES = ['none', 'kill', 'bounty', 'materials', 'takeover', 'item'];
export const JOB_NAMES = { none: 'Letter only', kill: 'Kill processes', bounty: 'Bounty: one named process', materials: 'Hand over code', takeover: 'Take over a server', item: 'Recover a file' };
// Contract templates: one list of variants per side. GLASSJAW only offers some kinds.
export const CONTRACT_KINDS = {
  kill: { name: 'Kill processes', sides: ['halcyon', 'glassjaw'] },
  bounty: { name: 'Bounty', sides: ['halcyon'] },
  materials: { name: 'Hand over code', sides: ['halcyon', 'glassjaw'] },
  takeover: { name: 'Take over a known server', sides: ['halcyon'] },
  'takeover-unknown': { name: 'Take over an unknown server', sides: ['halcyon'] },
  item: { name: 'Recover a file (known server)', sides: ['halcyon', 'glassjaw'] },
  'item-unknown': { name: 'Recover a file (unknown server)', sides: ['halcyon', 'glassjaw'] },
};
export const SIDES = { halcyon: 'Halcyon (on the books)', glassjaw: 'GLASSJAW (off the books)' };
export const REWARDS = { credits: 'Credits', indemnity: 'Indemnity', standing: 'Standing', xp: 'XP (kills’ worth)', relay: 'Relays', blueprint: 'A blueprint', daemon: 'A daemon' };

// Fill {blanks}. Unknown ones are left as typed so they're easy to spot.
export const fill = (text, vars) => String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
export const blanksIn = (text) => [...String(text ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

// The blanks a story beat can use, given its job.
export const beatVars = (beat) => ({ ...COMMON, ...STORY_VARS, ...JOB_VARS[beat?.job?.type || 'none'] });

// Mistakes in a draft: [{ where, id, msg, bad }] (bad: true = the game can't use it; false = a warning).
export function check(story, contracts) {
  const out = [];
  const say = (where, id, msg, bad = true) => out.push({ where, id, msg, bad });
  const beats = story?.beats || [];
  const contacts = story?.contacts || {};
  const ids = new Set();
  beats.forEach((b, i) => {
    const where = `Beat ${i + 1}${b.subject ? `: ${b.subject}` : ''}`;
    if (!b.id || !/^[a-z0-9-]+$/.test(b.id)) say(where, b.id, 'Its id must be lower-case letters, numbers and dashes.');
    if (ids.has(b.id)) say(where, b.id, `Two beats share the id "${b.id}".`);
    ids.add(b.id);
    if (!contacts[b.from]) say(where, b.id, `Unknown sender "${b.from}". Add it under Contacts.`);
    if (!String(b.subject || '').trim()) say(where, b.id, 'It has no subject.');
    if (!(b.body || []).some((p) => String(p).trim())) say(where, b.id, 'Its letter is empty.');
    const vars = beatVars(b);
    for (const k of new Set([...blanksIn(b.subject), ...(b.body || []).flatMap(blanksIn)])) if (!vars[k]) say(where, b.id, `{${k}} isn't a blank this beat can use. It can use: ${Object.keys(vars).map((x) => `{${x}}`).join(' ')}.`);
    const j = b.job;
    if (j) {
      if (!JOB_TYPES.includes(j.type) || j.type === 'none') say(where, b.id, `Unknown job type "${j.type}".`);
      if (j.type === 'kill' && !(j.count >= 1)) say(where, b.id, 'A kill job needs a count of 1 or more.');
      if (j.type === 'materials' && !(j.amount >= 1)) say(where, b.id, 'A code job needs an amount of 1 or more.');
      if (j.type === 'bounty' && !/^[a-z0-9.-]+$/i.test(j.name || '')) say(where, b.id, 'A bounty needs a process name (letters, numbers, dashes).');
      if (j.type === 'item' && !/^[\w.-]+$/.test(j.file || '')) say(where, b.id, 'A file job needs a file name (like claims.db).');
      if (j.type === 'item' && !j.near) say(where, b.id, 'A file job needs to know where the file is.');
      if (j.type === 'item' && j.near === 'took' && !beats.slice(0, i).some((x) => x.job?.type === 'takeover')) say(where, b.id, 'This file is near "the server you took over", but no earlier beat has a takeover job.');
    }
    if (b.when?.level && !(b.when.level >= 1 && b.when.level <= 50)) say(where, b.id, 'Its level must be 1 to 50.');
    if (b.when?.delay && !(b.when.delay >= 0)) say(where, b.id, 'Its delay must be 0 or more minutes.');
    if (!b.job && !b.opensBoard && i === beats.length - 1) say(where, b.id, 'The last beat has no job, so the story waits here until you add another beat.', false);
  });
  if (!beats.some((b) => b.opensBoard)) say('Story', null, 'No beat opens the contract board, so the board and the Halcyon store never open.', false);
  for (const [k, kind] of Object.entries(CONTRACT_KINDS)) {
    for (const side of kind.sides) {
      const list = contracts?.[k]?.[side] || [];
      const where = `${kind.name} · ${SIDES[side]}`;
      if (!list.length) { say(where, `${k}/${side}`, 'No variants: the game has nothing to say for this one.'); continue; }
      list.forEach((v, n) => {
        const vars = { ...COMMON, ...JOB_VARS[k] };
        if (!String(v.subject || '').trim()) say(`${where} #${n + 1}`, `${k}/${side}`, 'It has no subject.');
        if (!(v.body || []).some((p) => String(p).trim())) say(`${where} #${n + 1}`, `${k}/${side}`, 'Its text is empty.');
        for (const b of new Set([...blanksIn(v.subject), ...(v.body || []).flatMap(blanksIn)])) if (!vars[b]) say(`${where} #${n + 1}`, `${k}/${side}`, `{${b}} isn't a blank here. It can use: ${Object.keys(vars).map((x) => `{${x}}`).join(' ') || 'none'}.`);
        if (v.from && !contacts[v.from]) say(`${where} #${n + 1}`, `${k}/${side}`, `Unknown sender "${v.from}".`);
      });
    }
  }
  if (!(contracts?.files || []).length) say('Contract files', 'files', 'File contracts need at least one file to recover.');
  for (const f of contracts?.files || []) if (!/^[\w.-]+$/.test(f.file || '') || !f.label) say('Contract files', 'files', `"${f.file || '(no name)'}" needs a file name and a label.`);
  if (!(contracts?.bountyNames || []).length) say('Bounty names', 'bountyNames', 'Bounties need at least one name.');
  return out;
}

// ---------- uniques (content/items.mjs) ----------
// A unique's effect is built from blocks: when it fires, an optional condition, what it does,
// and limits. The engine (combat.mjs) knows every block here; anything else is a custom effect.
export const FX_WHEN = {
  hit: 'When you hit a part',
  crit: 'When you crit',
  break: 'When you break a part',
  start: 'When a fight starts',
  struck: 'When an attack lands on you',
  always: 'Always (a stat bonus)',
  disconnect: 'When your Signal hits 0 on a run',
  custom: 'Custom rule',
};
export const FX_IF = {
  '': 'Always',
  'target-below-half': 'the target is below half Integrity',
  'target-bare': 'the target has no armor left',
  'target-winding': "the target's attack lands this cycle or next",
  synced: 'you fired in a Sync Window',
  'even-cycle': "it's an even cycle",
  'odd-cycle': "it's an odd cycle",
  'below-half': "you're below half health",
  'below-20': "you're below 20% health",
  crit: 'it was a crit',
};
// What each block does, which "when" it fits, and what it needs (value, stat).
export const FX_DO = {
  'damage%': { when: ['hit'], label: '+X% damage', value: true },
  'damage+': { when: ['hit'], label: '+X damage', value: true },
  'crit%': { when: ['hit'], label: '+X% crit chance', value: true },
  'force-crit': { when: ['start'], label: 'your first hit is a crit' },
  chit: { when: ['start'], label: 'start with an armor chit' },
  refund: { when: ['break'], label: 'all your cooldowns drop by X', value: true },
  'refund-skill': { when: ['break'], label: "that skill's cooldown comes back" },
  heal: { when: ['break', 'crit'], label: 'heal X', value: true },
  'leech-x': { when: ['crit'], label: 'Leech heals X times as much', value: true },
  halve: { when: ['struck'], label: 'the hit deals half' },
  'crit-normal': { when: ['struck'], label: 'a crit against you lands as a normal hit' },
  'restore%': { when: ['struck'], label: 'restore X% of your health', value: true },
  'stat-x2': { when: ['always'], label: 'one of its stats counts double', stat: true },
  jackout: { when: ['disconnect'], label: 'you jack out with your pack instead' },
  'burn-grow': { when: ['custom'], label: 'your burns grow +X a cycle', value: true },
  'dot%': { when: ['custom'], label: 'your burns and helpers deal +X%', value: true },
  'echo-full': { when: ['custom'], label: 'your Echoes hit for full damage' },
  'encrypt-half': { when: ['custom'], label: 'Encryption on you stacks half as fast' },
  'sync-wide': { when: ['custom'], label: 'Sync Windows are 50% wider' },
  'blind-short': { when: ['custom'], label: 'Blinds on you last one cycle less' },
};
export const FX_SCALE = { '': 'flat', cycles: 'per cycle the fight has lasted', contracts: 'per contract you hold', broken: 'per part broken this fight' };
export const FX_LIMIT = { '': 'every time', fight: 'once per fight', run: 'once per run', cooldown: 'then a real-time cooldown' };
export const SOURCE_KINDS = { sprawl: 'SPRAWL-00 kills', strain: 'Kills of a strain', guard: 'A guard or ICE', vault: 'Vaults', rogue: 'A rogue server', story: 'A story beat (reward)', contract: 'A contract (reward)', store: "Halcyon's store" };

// One line of plain text for an effect: "+25% damage when you fired in a Sync Window."
export function fxText(fx, statName = (k) => k) {
  if (!fx?.do) return '';
  if (fx.text) return fx.text;
  const d = FX_DO[fx.do];
  let what = (d?.label || fx.do).replace('X', fx.value ?? 'X');
  if (fx.do === 'stat-x2') what = `${statName(fx.stat)} counts double`;
  const scale = fx.scale ? ` ${FX_SCALE[fx.scale]}` : '';
  const cap = fx.cap ? ` (up to ${fx.do === 'damage%' || fx.do === 'crit%' ? '+' + fx.cap + '%' : '+' + fx.cap})` : '';
  const lead = { crit: 'On a crit', break: 'When you break a part', start: 'Each fight', struck: 'When an attack lands on you', disconnect: 'When your Signal hits 0 on a run' }[fx.when];
  const cond = fx.if ? (lead ? `, if ${FX_IF[fx.if]}` : ` when ${FX_IF[fx.if]}`) : '';
  const limit = fx.limit === 'cooldown' ? `. Rearms ${fx.cooldown || 60} minutes later` : fx.limit === 'fight' ? ', once per fight' : fx.limit === 'run' ? ', once per run' : '';
  const t = lead ? `${lead}${cond}: ${what}${scale}${cap}${limit}.` : `${what}${scale}${cap}${cond}${limit}.`;
  return t[0].toUpperCase() + t.slice(1);
}

// Mistakes in the uniques: [{ where, id, msg, bad }].
export function checkItems(items, bases, stats) {
  const out = [], say = (where, id, msg, bad = true) => out.push({ where, id, msg, bad });
  const ids = new Set();
  for (const u of items?.uniques || []) {
    const where = `Unique: ${u.name || u.id || '(unnamed)'}`;
    if (!u.id || !/^[a-z0-9-]+$/.test(u.id)) say(where, u.id, 'Its id must be lower-case letters, numbers and dashes.');
    if (ids.has(u.id)) say(where, u.id, `Two uniques share the id "${u.id}".`);
    ids.add(u.id);
    if (!String(u.name || '').trim()) say(where, u.id, 'It has no name.');
    if (!bases[u.base]) say(where, u.id, `Unknown base "${u.base}".`);
    if (!(u.level >= 1 && u.level <= 60)) say(where, u.id, 'Its level must be 1 to 60.');
    if (!Object.keys(u.primary || {}).length) say(where, u.id, 'It has no primary stats.');
    for (const part of ['primary', 'secondary', 'downside']) for (const k of Object.keys(u[part] || {})) if (!stats[k]) say(where, u.id, `Unknown stat "${k}" in ${part}.`);
    for (const k of Object.keys(u.downside || {})) if (!(u.downside[k] < 0)) say(where, u.id, `A downside should be negative (${k}).`, false);
    const fx = u.effect;
    if (fx) {
      const d = FX_DO[fx.do];
      if (!FX_WHEN[fx.when]) say(where, u.id, `Unknown "when": ${fx.when}.`);
      if (!d) say(where, u.id, `Unknown effect "${fx.do}".`);
      else if (!d.when.includes(fx.when)) say(where, u.id, `"${d.label}" can't fire "${(FX_WHEN[fx.when] || fx.when).toLowerCase()}". It fits: ${d.when.map((w) => FX_WHEN[w].toLowerCase()).join(', ')}.`);
      if (d?.value && !(Number(fx.value) > 0)) say(where, u.id, 'This effect needs a value above 0.');
      if (d?.stat && !stats[fx.stat]) say(where, u.id, 'Pick which stat counts double.');
      if (fx.if && FX_IF[fx.if] === undefined) say(where, u.id, `Unknown condition "${fx.if}".`);
      if (fx.if === 'crit' && fx.when !== 'break') say(where, u.id, '"It was a crit" only works with "when you break a part".');
      if (['target-below-half', 'target-bare', 'target-winding'].includes(fx.if) && fx.when !== 'hit') say(where, u.id, 'Target conditions only work with "when you hit a part".');
      if (fx.limit === 'cooldown' && !(fx.cooldown > 0)) say(where, u.id, 'A cooldown needs minutes.');
      if (fx.limit === 'run' && fx.when === 'start') say(where, u.id, '"Once per run" with "when a fight starts" fires on the first fight only.', false);
    }
    if (!(u.sources || []).length) say(where, u.id, 'No sources: it can never drop.', false);
    for (const src of u.sources || []) if (!SOURCE_KINDS[src.kind]) say(where, u.id, `Unknown source "${src.kind}".`);
  }
  return out;
}
