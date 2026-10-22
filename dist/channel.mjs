// #net, the public channel: the net talking to itself, like a MUD's gossip line or WoW's General. Every line comes
// from real game state: the director's events as they're dealt, move and end (a feud's line names its real winner),
// your feats (a unique found, a title, a level), the faction contacts speaking for their side, and while `online sim`
// is on the simulated hackers (presence.mjs), whose chatter follows where they are, their class and level and what
// is up on the net (an item they found is a real one at their level). Nothing here beeps or goes to the pager.
//
// Pacing, on logged-on time (tickNetwork): a line every CHANNEL.everyMs, news at once, a reaction a few seconds
// after something happens, and nothing at all when there's nothing true to say. Its own dice (mulberry32 on
// s.channel.r, like the director's): the game's rng never moves. s.channel = { lines (the last CHANNEL.keep), next,
// seen (the last log serial read), queue (reactions waiting), feuds (the last few results), said, r, n }.
import { hooks, UNIQUES, hackerLevel } from './combat.mjs';
import { ARCHETYPES, BOSSES, FAMILIES } from './data.mjs';
import { FACTIONS, FACTION_IDS, hubFound, rep, REP_TIERS } from './factions.mjs';
import { online, simOn } from './presence.mjs';
import { handleOf, shownTitle, simTitle, voice, worldUniques, hash, titleById } from './profile.mjs';
import { pieceOf } from './faction-gear.mjs';
import { achById } from './achievements.mjs';

export const CHANNEL = { keep: 80, everyMs: [20000, 90000], reactMs: [3000, 12000], say: 120, liveMs: 5 * 60000, feuds: 4 };
const clock = () => hooks.now?.() ?? Date.now();

export function channelOf(s) {
  const c = (s.channel ||= { lines: [], next: null, queue: [], feuds: [], said: {}, n: 0 });
  c.lines ||= []; c.queue ||= []; c.feuds ||= []; c.said ||= {};
  if (c.seen == null) c.seen = s.serial || 0; // a first look at an older save: from now on, not its whole log
  return c;
}
export const muted = (s) => s.settings?.channel === false;
function roll(s) {
  const c = channelOf(s);
  let t = (c.r = ((c.r ?? ((s.seed || 1) ^ 0x2f6b9e31)) + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (s, xs) => xs[Math.floor(roll(s) * xs.length)];
const between = (s, [lo, hi]) => lo + Math.floor(roll(s) * (hi - lo));

// A line: { id, t, kind (wire | contact | sim | you | feat), from, text, title?, faction?, items? }.
function post(s, line) {
  const c = channelOf(s);
  const l = { id: ++c.n, t: clock(), ...line };
  c.lines.push(l);
  if (c.lines.length > CHANNEL.keep) c.lines.splice(0, c.lines.length - CHANNEL.keep);
  return l;
}
const wire = (s, text, extra = {}) => post(s, { kind: 'wire', from: 'wire', text, ...extra });
// A simulated hacker's line, in their voice, with their title.
function simSay(s, h, text, extra = {}) {
  const c = channelOf(s);
  return post(s, { kind: 'sim', from: h, title: simTitle(h)?.name || null, text: voice(h, text, c.n), ...extra });
}
function later(s, h, text, extra = {}) { channelOf(s).queue.push({ in: between(s, CHANNEL.reactMs), from: h, text, ...extra }); }

// ---------- names ----------
const placeName = (s, id) => (s.locations || []).find((l) => l.id === id)?.name || 'the net';
const short = (f) => FACTIONS[f]?.short || f;
const fam = (f) => FAMILIES[f]?.name.toLowerCase() || 'virus';
const WARE = { cipher: 'Cipher code', worm: 'Worm code', kernel: 'Kernel code', salvage: 'components' };
const clsName = (c) => ARCHETYPES[c]?.name || c;
const room = (folder) => hooks.sprawlRoomName?.(folder) || folder;
const sims = (s) => (simOn(s) ? online(s) : []);
const you = (s) => handleOf(s);

// ---------- the contacts (view.mjs VOICE: who answers at each hub) ----------
// Each speaks for its side: after a feud it was in (won or lost, never at you), and now and then by your tier.
export const CONTACTS = {
  halcyon: {
    who: 'concierge@halcyon',
    won: (x) => `${x.loser} lost the ${x.loc} feud. Claims are open as usual.`, lost: (x) => `${x.loc} went to ${x.winner}. Halcyon will be back.`, thanks: (x) => `Thank you, ${x.you}.`,
    tier: [['The clearing house is open as usual.'], ['Contractors: keep your claim numbers ready.'], ['Good to see the contractors busy.', 'Bounties pay within one business cycle.'], ['Trusted contractors get first look at the board.'], ['Preferred clients: the clearing house is at your disposal.']],
  },
  glassjaw: {
    who: '—@glassjaw',
    won: (x) => `${x.loc} is ours. ${x.loser} can file a complaint.`, lost: (x) => `${x.loc}. Noted.`, thanks: (x) => `${x.you} was useful.`,
    tier: [['Quiet on this line.'], ["Don't know you. Don't need to."], ['Quiet work pays.'], ['Partners hear about the good jobs first.'], ['Whatever happens tonight, it never happened.']],
  },
  kestrel: {
    who: 'helpdesk@kestrel',
    won: (x) => `Ticket closed: ${x.loc} stays with Kestrel. ${x.loser} has been notified.`, lost: (x) => `${x.loc} lost to ${x.winner}. Reopening next quarter.`, thanks: (x) => `Thanks to ${x.you}.`,
    tier: [['Scheduled maintenance tonight. Expect delays.'], ['Ticket queue is long tonight.'], ['All racks green.', 'Clients: tickets are moving.'], ['Accounts: priority routing is on.'], ['Key accounts, a human is standing by. Really.']],
  },
  lantern: {
    who: 'ops@lantern',
    won: (x) => `${x.loc} is on our frequency now. ${x.loser} lost the signal.`, lost: (x) => `${x.winner} has ${x.loc}. For now.`, thanks: (x) => `${x.you}, loud and clear.`,
    tier: [['…static.'], ['Numbers at the top of the hour. Listen first.'], ['Regulars know the dial.'], ['Confidants, the next drop is a good one.'], ["Signal's strong tonight."]],
  },
  nullchoir: {
    who: 'vesper@nullchoir',
    won: (x) => `${x.loser} lost the ${x.loc} feud.${x.again ? ' Again.' : ''}`, lost: (x) => `${x.winner} got ${x.loc}. We sing louder next time.`, thanks: (x) => `${x.you} sang with us.`,
    tier: [['The choir is rehearsing.'], ['Corporate smell on this channel tonight.'], ["The choir's listening."], ['Choir, keep the corporate servers honest.'], ['Cantors lead tonight.']],
  },
};
const tierOf = (s, f) => { const r = rep(s, f); let i = 0; REP_TIERS.forEach((m, k) => { if (r >= m) i = k; }); return i; };
const contact = (s, f, text) => post(s, { kind: 'contact', from: CONTACTS[f].who, faction: f, text });
const known = (s, f) => f === 'halcyon' || hubFound(s, f);

// ---------- news: what the log says happened ----------
const NEWS = {
  'world-event': (s, e) => {
    const at = placeName(s, e.location), ev = (s.events || []).find((x) => x.id === e.event);
    if (!ev && !['leak', 'choir'].includes(e.card)) return null; // over before the channel heard of it
    if (e.card === 'courier') return wire(s, ev.unique ? `Word is a courier through ${at} is carrying [${UNIQUES[ev.unique].name}].` : `A courier was seen heading for ${at}.`, ev.unique ? { items: [UNIQUES[ev.unique].name] } : {});
    if (e.card === 'bounty') return contact(s, 'halcyon', ev.boss ? `REPO MAN is loose on ${at}. The claims department has posted a bounty.` : `Bounty posted on ${ev.name}, last seen on ${at}.`);
    if (e.card === 'choir') return wire(s, `Something is singing on ${at}. The HOLLOW CHOIR.`);
    if (e.card === 'outbreak') { reactAll(s, 0.5, (h) => [`${fam(ev.family)} everywhere. double code though`, `${fam(ev.family)} everywhere`]); return wire(s, `A ${fam(ev.family)} outbreak is spreading. Kills drop double code.`); }
    if (e.card === 'leak') return wire(s, `Somebody dumped a vault key for ${at}.`);
    if (e.card === 'darknet') return wire(s, `A broker is listing [${UNIQUES[ev.unique]?.name}] on a darknet channel.`, { items: [UNIQUES[ev.unique]?.name] });
    if (e.card === 'feud') { reactAll(s, 0.4, (h, x) => [`${short(ev.sides[x.n % 2])} vs ${short(ev.sides[(x.n + 1) % 2])} over ${at}. who's pushing ${short(ev.sides[x.n % 2])}?`, `${at} feud. going ${short(ev.sides[x.n % 2])}`]); return wire(s, `${short(ev.sides[0])} and ${short(ev.sides[1])} are fighting over ${at}.`); }
    if (e.card === 'hunt') return ev.hunter === 'kestrel' && known(s, 'kestrel') ? contact(s, 'kestrel', `Open ticket on ${ev.name}, last seen on ${at}. It moves every five minutes.`) : wire(s, `${short(ev.hunter)} is hunting ${ev.name}. Last seen on ${at}.`);
    if (e.card === 'shock') return wire(s, ev.mult > 1 ? `${short(ev.hub)} is paying ${ev.mult} times the usual for ${WARE[ev.ware]}.` : `${WARE[ev.ware]} is going cheap at ${short(ev.hub)}.`);
    if (e.card === 'counter') return known(s, ev.foe) ? contact(s, ev.foe, `Sending ${ev.name} at ${at}. Nothing personal.`) : wire(s, `${short(ev.foe)} sent a runner at ${at}.`);
    if (e.card === 'returning') return wire(s, `${ev.name} is back on ${at}.`);
    if (e.card === 'lantern') return known(s, 'lantern') ? contact(s, 'lantern', `Our own courier is crossing ${at}. Catch it if you can.`) : wire(s, `A LANTERN courier is crossing ${at}.`);
    if (e.card === 'zero') return wire(s, `The ${fam(ev.family)} outbreak's source is on ${at}.`);
    return null; // a spotter at your wall is yours alone
  },
  'world-event-hop': (s, e) => { const ev = (s.events || []).find((x) => x.id === e.event); return ev ? wire(s, `${ev.name} hopped to ${placeName(s, e.location)}. Level ${ev.level} now.`) : null; },
  'world-event-end': (s, e) => ended(s, e, false),
  'world-event-won': (s, e) => ended(s, e, true),
  collected: (s, e) => {
    const name = UNIQUES[e.unique]?.name;
    if (!name) return null;
    reactOne(s, 0.7, (h) => [`nice [${name}]`, `[${name}]! jealous`, `grats on [${name}]`][Math.floor(hash(h, 7) * 3)], { items: [name] });
    return post(s, { kind: 'feat', from: you(s), title: shownTitle(s)?.name || null, text: `found [${name}].`, items: [name] });
  },
  'level-up': (s, e) => {
    const cls = clsName(s.loadout?.archetype), L = e.level;
    if (!L) return null;
    reactOne(s, 0.5, (h) => [`gz ${you(s)}`, `grats on ${L}`, `${cls} ${L} already? nice`][Math.floor(hash(h, 8) * 3)]);
    return L % 10 === 0 || L === 50 ? post(s, { kind: 'feat', from: you(s), title: shownTitle(s)?.name || null, text: `reached ${cls} ${L}.` }) : null;
  },
  title: (s, e) => {
    const t = titleById(e.titles?.at(-1));
    if (!t) return null;
    reactOne(s, 0.5, () => `${t.name}, nice`);
    return post(s, { kind: 'feat', from: you(s), title: t.name, text: `is now ${t.name}.` });
  },
  // An achievement (achievements.mjs): its name in brackets, and the title it brought. Your record on an old save says nothing.
  achievement: (s, e) => {
    const xs = (e.achievements || []).map(achById).filter(Boolean);
    if (!xs.length || e.record) return null;
    // Several at once: the one that brought a title speaks for them (its name and that title), else the last.
    const a = xs.findLast((x) => x.reward?.title) || xs.at(-1), t = titleById(a.reward?.title);
    reactOne(s, 0.5, (h) => [`gz on [${a.name}]`, `[${a.name}]! nice`, `grats ${you(s)}`][Math.floor(hash(h, 9) * 3)], { achs: [a.name] });
    return post(s, { kind: 'feat', from: you(s), title: t?.name || shownTitle(s)?.name || null, text: t ? `earned [${a.name}] and is now ${t.name}.` : `earned [${a.name}].`, achs: [a.name] });
  },
};
// A card that ended: a feud's result names its real winner (and who lost twice running), a hunt that got away, a
// bounty or courier you took.
function ended(s, e, yours) {
  const at = placeName(s, e.location);
  if (e.card === 'feud') {
    if (!e.sides) return null; // a runner beaten mid-feud: the feud goes on
    const c = channelOf(s), [w, l] = e.winner ? [e.winner, e.sides.find((x) => x !== e.winner)] : [null, null];
    const again = !!l && c.feuds.at(-1)?.loser === l;
    c.feuds.push({ sides: e.sides, winner: w, loser: l, loc: at, yours: yours ? w : null });
    if (c.feuds.length > CHANNEL.feuds) c.feuds.shift();
    if (!w) return wire(s, `The ${at} feud ended even.`);
    const x = { winner: short(w), loser: short(l), loc: at, again, you: you(s) };
    if (yours) reactOne(s, 0.4, () => [`gg on ${at}`, `gg ${you(s)}`]);
    else reactOne(s, 0.3, () => [`there goes ${at}`, `gg ${short(w)}`]);
    if (known(s, w)) return contact(s, w, CONTACTS[w].won(x) + (yours ? ' ' + CONTACTS[w].thanks(x) : ''));
    if (known(s, l)) return contact(s, l, CONTACTS[l].lost(x));
    return wire(s, `${x.winner} won the ${at} feud. ${x.loser} pulls back.`);
  }
  if (e.card === 'outbreak') return wire(s, `The ${fam(e.family)} outbreak is burning out.`);
  if (e.card === 'shock') return wire(s, `${short(e.hub)}'s price for ${WARE[e.ware]} is back to normal.`);
  if (!yours) return ['hunt', 'returning', 'bounty', 'courier', 'choir'].includes(e.card) && e.name ? wire(s, e.card === 'hunt' || e.card === 'returning' ? `${e.name} got away.` : `${e.name} moved on from ${at}.`) : null;
  if (e.card === 'bounty') return contact(s, 'halcyon', `Bounty on ${e.name} paid out to ${you(s)}.`);
  if (e.card === 'hunt' || e.card === 'returning') return known(s, 'kestrel') ? contact(s, 'kestrel', `Ticket closed. ${you(s)} collected on ${e.name}.`) : wire(s, `${you(s)} collected the bounty on ${e.name}.`);
  if (e.card === 'courier') return wire(s, `${e.name}'s dead drop changed hands.`);
  if (e.card === 'choir') return wire(s, `The HOLLOW CHOIR went quiet. ${you(s)} did that.`);
  return null;
}
// Sim hackers react a few seconds later: one of them (reactOne), or each online with a chance (reactAll, two at most).
function reactOne(s, p, text, extra) { const on = sims(s); if (on.length && roll(s) < p) { const h = pick(s, on).handle; later(s, h, text(h), extra); } }
function reactAll(s, p, text) { let n = 0; for (const x of sims(s)) if (n < 2 && roll(s) < p / 2) later(s, x.handle, text(x.handle, { n: n++ })); }

// ---------- ambient: a line every so often, only what's true ----------
// What a sim hacker might say, from where they are, their class and level, and what's up on the net.
const BOSS_TALK = [['relayking', 3], ['repoman', 8], ['choir', 10], ['foreman', 7], ['heatsink', 7], ['coldwallet', 7]];
const phaseLine = (k) => { const ph = BOSSES[k].phases?.[0]; if (!ph) return `${BOSSES[k].name} hits hard. bring a ${clsName('bastion')}`; const at = Math.round(ph.at * 100); return ph.do?.includes('rearm') ? `${BOSSES[k].name} re-arms at ${at}%. save something for it` : `${BOSSES[k].name} speeds up at ${at}%. don't panic`; };
const SOURCE = { sprawl: 'in SPRAWL-00', vault: 'out of a vault', guard: 'off a guard', rogue: 'on a rogue server', rare: 'off a ★ rare', thread: 'finishing a thread', puzzle: 'off a puzzle board' };
function simLine(s) {
  const on = sims(s);
  if (!on.length) return null;
  const recent = new Set(channelOf(s).lines.slice(-4).filter((l) => l.kind === 'sim').map((l) => l.from)), fresh = on.filter((y) => !recent.has(y.handle)); // someone who hasn't just spoken
  const x = pick(s, fresh.length ? fresh : on), h = x.handle, L = x.level, need = pick(s, Object.keys(ARCHETYPES).filter((c) => c !== x.cls)), opts = [];
  const live = (s.events || []).filter((ev) => ev.loc || ev.card === 'outbreak' || ev.card === 'shock');
  if (L >= 7) opts.push(() => { const l = simSay(s, h, [`anyone farming KESSLER? need a ${clsName(need)}`, `KESSLER? need ${clsName(need)}`], { lfg: need }); answer(s, l, need); return l; });
  if (x.place.kind === 'sprawl') opts.push(() => { const l = simSay(s, h, x.place.fighting ? [`elite up in ${room(x.place.folder)}. need a ${clsName(need)}`, `${room(x.place.folder)} elite. ${clsName(need)}?`] : [`${room(x.place.folder)} is busy tonight`, `${room(x.place.folder)} is packed`], x.place.fighting ? { lfg: need } : {}); if (x.place.fighting) answer(s, l, need); return l; });
  if (x.place.kind === 'run') opts.push(() => simSay(s, h, ['on a run, back in ten', 'on a run']));
  if (x.place.kind === 'rogue') opts.push(() => simSay(s, h, ["rogue server. signal's bad", 'rogue server. brb']));
  if (x.place.kind === 'home') opts.push(() => simSay(s, h, ['fixing my wall. back soon', 'wall stuff']));
  if (x.place.kind === 'consortium') opts.push(() => simSay(s, h, [`holding ${x.place.locName} for the consortium`, `on ${x.place.locName}`]));
  const pool = worldUniques(L);
  if (pool.length) opts.push(() => { const u = pick(s, pool), src = SOURCE[(u.sources || []).find((y) => SOURCE[y.kind])?.kind] || 'today'; return simSay(s, h, [`finally got [${u.name}] ${src}`, `[${u.name}] ${src}`], { items: [u.name] }); });
  const piece = FACTION_IDS.map(pieceOf).filter((u) => u && u.level <= L);
  if (piece.length && L >= 12) opts.push(() => { const u = pick(s, piece); return simSay(s, h, [`assembled [${u.name}] at last`, `[${u.name}] assembled`], { items: [u.name] }); });
  const bosses = BOSS_TALK.filter(([, at]) => L >= at);
  if (bosses.length) opts.push(() => simSay(s, h, phaseLine(pick(s, bosses)[0])));
  for (const ev of live.slice(0, 2)) {
    const at = placeName(s, ev.loc);
    if (ev.card === 'feud') opts.push(() => simSay(s, h, [`${short(ev.sides[0])} at ${Math.round((ev.bar ?? 0.5) * 100)}% on ${at}. who's in?`, `${at}: ${Math.round((ev.bar ?? 0.5) * 100)}% ${short(ev.sides[0])}`]));
    if (ev.card === 'hunt') opts.push(() => simSay(s, h, [`${ev.name} is level ${ev.level} now. still out there`, `${ev.name}, level ${ev.level}`]));
    if (ev.card === 'outbreak') opts.push(() => simSay(s, h, [`still ${fam(ev.family)} everywhere`, `${fam(ev.family)}. so much ${fam(ev.family)}`]));
    if (ev.card === 'shock') opts.push(() => simSay(s, h, ev.mult > 1 ? [`${short(ev.hub)} paying ${ev.mult}x for ${WARE[ev.ware]}. selling everything`, `selling ${WARE[ev.ware]} at ${short(ev.hub)}`] : [`${WARE[ev.ware]} going cheap at ${short(ev.hub)}. buying`, `cheap ${WARE[ev.ware]} at ${short(ev.hub)}`]));
    if (ev.card === 'courier' || ev.card === 'bounty') opts.push(() => simSay(s, h, [`anyone after ${ev.name}?`, `${ev.name}?`]));
  }
  const prev = channelOf(s).lines.at(-1);
  if (prev?.kind === 'sim' && prev.from !== h) opts.push(() => simSay(s, h, [`o/ ${prev.from}`, `o/`]));
  return pick(s, opts)();
}
// An LFG line: sometimes someone online in that class answers.
function answer(s, line, need) {
  const who = sims(s).filter((y) => y.cls === need && y.handle !== line.from);
  if (who.length && roll(s) < 0.4) { const y = pick(s, who); later(s, y.handle, [`${line.from} i can come. ${clsName(need)} ${y.level}`, `${clsName(need)} ${y.level} here`]); }
}
// The wire on what's up: once every CHANNEL.liveMs a card, at most.
function liveLine(s) {
  const c = channelOf(s), t = clock();
  const ev = (s.events || []).find((e) => (t - (c.said[e.id] || 0)) >= CHANNEL.liveMs && ['feud', 'hunt', 'courier', 'bounty', 'outbreak', 'shock', 'returning'].includes(e.card));
  if (!ev) return null;
  for (const k of Object.keys(c.said)) if (!(s.events || []).some((e) => String(e.id) === k)) delete c.said[k]; // cards that are gone
  c.said[ev.id] = t;
  const at = placeName(s, ev.loc);
  if (ev.card === 'feud') { const lead = (ev.bar ?? 0.5) >= 0.5 ? 0 : 1, pct = Math.round((lead ? 1 - (ev.bar ?? 0.5) : ev.bar ?? 0.5) * 100); return wire(s, `${short(ev.sides[lead])} holds ${pct}% of ${at}.`); }
  if (ev.card === 'hunt') return wire(s, `${ev.name} is on ${at}, level ${ev.level}.${ev.next ? ` Next stop ${placeName(s, ev.next)}.` : ''}`);
  if (ev.card === 'outbreak') return wire(s, `The ${fam(ev.family)} outbreak is still spreading.`);
  if (ev.card === 'shock') return wire(s, `${short(ev.hub)} still pays ${ev.mult}× the usual for ${WARE[ev.ware]}.`);
  return wire(s, `${ev.name} is still on ${at}.`);
}
// A contact now and then: about the last feud its side was in, else a line for your tier with it.
function contactLine(s) {
  const fs = FACTION_IDS.filter((f) => known(s, f));
  if (!fs.length) return null;
  const f = pick(s, fs), C = CONTACTS[f], last = [...channelOf(s).feuds].reverse().find((x) => x.sides.includes(f) && x.winner);
  if (last && roll(s) < 0.4) return contact(s, f, last.winner === f ? `${last.loc} still holds.${last.yours === f ? ` ${C.thanks({ you: you(s) })}` : ''}` : `Still thinking about ${last.loc}.`);
  return contact(s, f, pick(s, C.tier[tierOf(s, f)]));
}
function ambient(s) {
  if (!s.tutorialCompleted) return null;
  const r = roll(s), order = sims(s).length && r < 0.65 ? [simLine, liveLine, contactLine] : r < 0.8 ? [liveLine, contactLine] : [contactLine];
  const c = channelOf(s);
  for (const f of order) {
    const l = f(s);
    if (!l) continue;
    if (c.lines.slice(-13, -1).some((x) => x.text === l.text)) { c.lines.pop(); continue; } // not the same line twice in a while
    return l;
  }
  return null;
}

// Every second or so (invasion.mjs tickNetwork), on logged-on time.
export function tickChannel(s, dt) {
  const c = channelOf(s);
  for (const e of s.logs || []) if (e.id > c.seen && !e.who) NEWS[e.type]?.(s, e); // a crewmate's own lines aren't news
  c.seen = s.serial || 0;
  for (const q of c.queue) q.in -= dt;
  const due = c.queue.filter((q) => q.in <= 0);
  c.queue = c.queue.filter((q) => q.in > 0);
  const on = new Set(sims(s).map((x) => x.handle));
  for (const q of due) if (on.has(q.from)) simSay(s, q.from, q.text, { ...(q.items ? { items: q.items } : {}), ...(q.achs ? { achs: q.achs } : {}) });
  if (c.next == null) c.next = between(s, CHANNEL.everyMs);
  c.next -= dt;
  if (c.next > 0) return;
  c.next = between(s, CHANNEL.everyMs);
  ambient(s);
}

// say <text> (or 'text): your line, with your handle and title. A sim hacker you name answers now and then.
export function say(s, raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return { error: 'Say what?' };
  if (/[^\x20-\x7e]/.test(text)) return { error: 'Plain keyboard characters only.' };
  if (text.length > CHANNEL.say) return { error: `${CHANNEL.say} characters a line at most.` };
  const line = post(s, { kind: 'you', from: you(s), title: shownTitle(s)?.name || null, text });
  for (const x of sims(s)) if (new RegExp(`\\b${x.handle.replace(/[^\w]/g, '\\$&')}\\b`, 'i').test(text) && roll(s) < 0.8) later(s, x.handle, [`hey ${you(s)}`, `${you(s)}: what's up`, x.place.kind === 'sprawl' ? `busy in ${room(x.place.folder)}, one sec` : 'one sec'][Math.floor(roll(s) * 3)]);
  return { line };
}
export const channelLines = (s) => channelOf(s).lines;
