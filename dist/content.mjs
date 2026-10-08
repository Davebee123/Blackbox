// Written content: the story beats and the contract templates (dist/content/*.mjs, edited in
// editor.html). This module knows what each kind of text can say ({blanks}), fills them in, and
// checks a draft for mistakes. mail.mjs uses it in the game; the editor and content.test.mjs use
// the checker.

// The blanks each kind of text can use. The game fills them; anything else shows up as typed.
export const COMMON = { handle: 'your handle (the name you logged in with)', crewName: 'your crew: LOWLIGHT' };
export const JOB_VARS = {
  none: {},
  kill: { count: 'how many to kill', family: 'the family, lower case (worm), or "stray" for any', crew: 'the crew that runs that family (SWARMLINE)' },
  bounty: { name: 'the named virus (claimjack-0412)', family: 'its family, lower case', room: 'the SPRAWL-00 folder it sits in' },
  materials: { amount: 'how many units', material: 'the code, lower case (worm code)' },
  takeover: { server: 'the server to take (KESSLER-RELAY-22), or "any server you have traced"', owner: 'who runs it (KESSLER)', crew: 'the crew it belongs to' },
  'takeover-unknown': {},
  item: { file: 'the file name (policy.db)', label: 'what it is, lower case (a stolen policy database)', Label: 'the same, capitalised', server: 'the server it sits on' },
  'item-unknown': { file: 'the file name', label: 'what it is, lower case', Label: 'the same, capitalised' },
};
// Story beats also know the server you took over in the Turf job.
export const STORY_VARS = { took: 'the server you took over (once you have one)' };
export const JOB_TYPES = ['none', 'kill', 'bounty', 'materials', 'takeover', 'item'];
export const JOB_NAMES = { none: 'Letter only', kill: 'Kill viruses', bounty: 'Bounty: one named virus', materials: 'Hand over code', takeover: 'Take over a server', item: 'Recover a file' };
// Contract templates: one list of variants per side. GLASSJAW only offers some kinds.
export const CONTRACT_KINDS = {
  kill: { name: 'Kill viruses', sides: ['halcyon', 'glassjaw'] },
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
      if (j.type === 'bounty' && !/^[a-z0-9.-]+$/i.test(j.name || '')) say(where, b.id, 'A bounty needs a virus name (letters, numbers, dashes).');
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
  crit: 'When you land a critical strike',
  break: 'When you break a part',
  start: 'When a fight starts',
  struck: 'When an attack lands on you',
  always: 'Always (a stat bonus)',
  disconnect: 'When your Signal hits 0 on a run',
  answer: 'When you answer a tell',
  custom: 'Custom rule',
};
// Each condition reads after "when" or "while" in the effect's sentence: "Increases your damage by 50% when the target is below half Integrity."
export const FX_IF = {
  '': 'Always',
  'target-below-half': 'the target is below half Integrity',
  'target-bare': 'the target has no armor',
  'target-winding': "the target's attack lands this cycle or next",
  'target-tagged': 'the target is Tagged',
  'target-burning': 'the target is burning',
  synced: 'you fire in a Sync Window',
  'even-cycle': 'the cycle is even',
  'odd-cycle': 'the cycle is odd',
  'below-half': 'you are below half health',
  'below-20': 'you are below 20% health',
  crit: 'the hit is a critical strike',
  'target-telling': 'the target is winding up a tell',
  'target-signature': "the target is the virus's signature part",
  'any-tell': 'a part is winding up a tell',
  charged: 'the attack is a tell landing',
  'target-open': 'the target is Open (a tell you answered)',
  'target-locked': 'the target is behind a Mutex lock or a Lockbox ward',
  'target-loud': 'the target has gone loud (a Tripwire set off, a Bricker\'s rage)',
  'target-fragment': 'the target is a fragment',
  moment: "the skill's moment is on the board",
};
// What each block does, which "when" it fits, and what it needs (value, stat). label: the effect, a verb phrase in the
// tooltip style ("heals you for X"); fxText adds its trigger and condition after it. own: the label already says when.
export const FX_DO = {
  'damage%': { when: ['hit'], label: 'increases your damage by X%', value: true },
  'damage+': { when: ['hit'], label: 'adds X damage to your hits', value: true },
  'crit%': { when: ['hit'], label: 'increases your critical strike chance by X%', value: true },
  'force-crit': { when: ['start'], label: 'makes your first hit in each fight a critical strike', own: true },
  chit: { when: ['start'], label: 'grants you 1 ◆' },
  refund: { when: ['break', 'answer'], label: 'reduces all your cooldowns by X cycles', value: true },
  'refund-skill': { when: ['break', 'crit'], label: 'resets the cooldown of the skill you used' },
  heal: { when: ['break', 'crit', 'answer'], label: 'heals you for X', value: true },
  shield: { when: ['start', 'answer'], label: 'shields you for X', value: true },
  'break-hit': { when: ['break'], label: 'deals X damage to the part winding up a tell, or else to the next part to attack,', value: true },
  shatter: { when: ['hit'], label: 'makes each hit on an armored part break 2 ◆' },
  'tell-hits': { when: ['always'], label: 'makes each of your hits count as two against a tell' },
  'leech-x': { when: ['crit'], label: 'makes Leech heal X times as much', value: true },
  halve: { when: ['struck'], label: 'halves the damage of an attack that lands on you', own: true },
  'crit-normal': { when: ['struck'], label: 'turns a critical strike against you into a normal hit', own: true },
  'restore%': { when: ['struck'], label: 'heals you for X% of your max health', value: true },
  'stat-x2': { when: ['always'], label: 'doubles one of your stats', stat: true },
  'skill-cd': { when: ['always'], label: "reduces one skill's cooldown by X cycles (never under 1)", value: true, skill: true },
  jackout: { when: ['disconnect'], label: 'jacks you out with your pack instead of losing it' },
  'burn-grow': { when: ['custom'], label: 'makes each of your burns deal X more damage every time it ticks', value: true },
  'dot%': { when: ['custom'], label: 'increases the damage of your burns and helpers by X%', value: true },
  'echo-full': { when: ['custom'], label: 'makes your Echoes deal full damage' },
  'encrypt-half': { when: ['custom'], label: 'halves how fast encryption stacks on you' },
  'sync-wide': { when: ['custom'], label: 'makes Sync Windows 50% wider' },
  'blind-short': { when: ['custom'], label: 'makes Scrambles on you last 1 cycle less' },
  'patch-slow': { when: ['custom'], label: 'makes parts take X cycles longer to patch their ◆ back', value: true },
  'burn-jump': { when: ['custom'], label: 'moves the burns on a part you break to the next part, with the damage they had left' },
  // Native uniques (network.mjs): the tells and the part rules.
  'read-hit': { when: ['answer'], label: 'deals X damage to a part when you answer its tell', value: true, own: true },
  'break-open': { when: ['break'], label: 'leaves the next part to attack Open for X cycles', value: true },
  'warn-early': { when: ['custom'], label: 'announces tells X cycles earlier', value: true },
  'open-long': { when: ['custom'], label: 'keeps a part Open X cycles longer after you answer its tell', value: true },
  'lock-crush': { when: ['custom'], label: 'makes your hits count X% more against a Mutex lock or a Lockbox ward', value: true },
  'mimic-turn': { when: ['custom'], label: "turns the Mimic's playback on the Mimic instead of you, at X% of its damage", value: true },
  'no-reboot': { when: ['custom'], label: 'stops a twin you break from rebooting' },
  'seal-proof': { when: ['custom'], label: 'keeps your ◆ and shield when a seal lands, and stops it from Corrupting you' },
  'rule-amp': { when: ['custom'], label: 'increases the effect of your blue and yellow rules by X%', value: true },
  'quiet-trip': { when: ['custom'], label: 'keeps a Tripwire you break quiet' },
  'cast-short': { when: ['custom'], label: "shortens a compiled cast's effect by X cycles", value: true },
  'no-after': { when: ['custom'], label: 'stops a tell that lands from taking a skill offline, Corrupting you or leaving you Hung' },
  'decoy-pass': { when: ['custom'], label: "lets your commands through the Decoy's mirror at X% of their damage, and nothing bounces back", value: true },
};
export const FX_SCALE = { '': 'flat', cycles: 'for each cycle the fight has lasted', contracts: 'for each contract you hold', broken: 'for each part broken this fight', reads: 'for each tell you answered this fight' };
export const FX_LIMIT = { '': 'every time', fight: 'once per fight', run: 'once per run', cooldown: 'then a real-time cooldown' };
// A unique can lean toward a class: it drops three times as often for that class (combat.mjs uniqueFrom).
export const CLASSES = { '': 'Any class', breaker: 'Breaker', bastion: 'Bastion', infiltrator: 'Infiltrator', operator: 'Operator',
  demolitionist: 'Breaker: Demolitionist', overclocker: 'Breaker: Overclocker', warden: 'Bastion: Warden', sysop: 'Bastion: Sysop',
  payload: 'Infiltrator: Payload', phantom: 'Infiltrator: Phantom', herder: 'Operator: Herder', hijacker: 'Operator: Hijacker' }; // a subclass lean: three times as likely for it, twice for its class
export const SOURCE_KINDS = { sprawl: 'SPRAWL-00 kills', strain: 'Kills of a strain', guard: 'A guard or ICE', vault: 'Vaults', rogue: 'A rogue server', story: 'A story beat (reward)', contract: 'A contract (reward)', store: "Halcyon's store", boss: 'A boss (RELAY-KING, a Resident, REPO MAN, the Hollow Choir, the KESSLER-FARM-00 three)', farm: 'KESSLER-FARM-00 packs (rogue.mjs)', invasion: 'Invasion captures (invasion.mjs: champions and streaks)', native: 'Native to a network (network.mjs: about ten times as likely on its home network, its lair boss, the Listening Post and darknet listings)' };

// One sentence for an effect, in the tooltip style: the effect first (a third-person verb), then when it happens.
// "Increases your damage by 25% when you fire in a Sync Window." "Heals you for 6 when you land a critical strike."
const FX_TRIGGER = { crit: 'when you land a critical strike', break: 'when you break a part', start: 'at the start of each fight', struck: 'when an attack lands on you', disconnect: 'when your Signal hits 0 on a run', answer: 'when you answer a tell' };
export function fxText(fx, statName = (k) => k) {
  if (!fx?.do) return '';
  if (fx.text) return fx.text;
  const d = FX_DO[fx.do];
  let what = (d?.label || fx.do).replace('X', fx.value ?? 'X').replace(/\b1 cycles\b/, '1 cycle');
  if (fx.do === 'stat-x2') what = `doubles your ${statName(fx.stat)}`;
  if (fx.do === 'skill-cd') what = `reduces the cooldown of ${statName(fx.skill)} by ${fx.value} ${fx.value === 1 ? 'cycle' : 'cycles'}`;
  const scale = fx.scale ? ` ${FX_SCALE[fx.scale]}` : '';
  const cap = fx.cap ? `, up to ${fx.do === 'damage%' || fx.do === 'crit%' ? fx.cap + '%' : fx.cap}` : '';
  // The trigger, and its condition after it. A few pairs read better as one clause.
  let when = d?.own ? '' : FX_TRIGGER[fx.when] || '';
  let cond = fx.if ? FX_IF[fx.if] : '';
  if (fx.when === 'break' && fx.if === 'crit') { when = 'when you break a part with a critical strike'; cond = ''; }
  if (fx.when === 'break' && fx.if === 'target-fragment') { when = 'when you break a fragment'; cond = ''; }
  if (fx.when === 'struck' && fx.if === 'charged') { if (d?.own) what = what.replace('an attack', 'a tell'); else when = 'when a tell lands on you'; cond = ''; }
  const tail = [when, cond && (when || d?.own ? `while ${cond}` : `when ${cond}`)].filter(Boolean).join(' ');
  if (!tail) what = what.replace(/,$/, '');
  const limit = fx.limit === 'cooldown' ? ` Works again ${fx.cooldown || 60} minutes later.` : fx.limit === 'fight' ? ' Works once per fight.' : fx.limit === 'run' ? ' Works once per run.' : '';
  const t = `${what}${scale}${cap}${tail ? ' ' + tail : ''}.${limit}`;
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
      if (d?.skill && !fx.skill) say(where, u.id, 'Pick which skill cools down faster.');
      if (fx.if && FX_IF[fx.if] === undefined) say(where, u.id, `Unknown condition "${fx.if}".`);
      if (fx.if === 'crit' && fx.when !== 'break') say(where, u.id, '"It was a crit" only works with "when you break a part".');
      if (/^target-/.test(fx.if || '') && !(fx.when === 'hit' || (fx.when === 'break' && fx.if === 'target-fragment'))) say(where, u.id, 'Target conditions only work with "when you hit a part" (and "the target is a fragment" with "when you break a part").');
      if (fx.limit === 'cooldown' && !(fx.cooldown > 0)) say(where, u.id, 'A cooldown needs minutes.');
      if (fx.limit === 'run' && fx.when === 'start') say(where, u.id, '"Once per run" with "when a fight starts" fires on the first fight only.', false);
    }
    if (u.lean && !CLASSES[u.lean]) say(where, u.id, `Unknown class "${u.lean}" to lean toward.`);
    if (!(u.sources || []).length) say(where, u.id, 'No sources: it can never drop.', false);
    for (const src of u.sources || []) if (!SOURCE_KINDS[src.kind]) say(where, u.id, `Unknown source "${src.kind}".`);
  }
  return out;
}
