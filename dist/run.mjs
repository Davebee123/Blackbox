// Runs: exploring a traced location as a small file system with Unix commands.
// Pure like the combat engine: state in, events out.
import { vaultConfig, bankConfig, CONFIGS } from './configs.mjs';
import { vaultFilter, addFilter, filterLine } from './filters.mjs';
import { vxName, hasVx, vaultHarvester, bankHarvester, harvesterName, collect, vaultPlan, planName, learnPlan } from './outpost.mjs';
import { CONFIG, FAMILIES, GUARDS, QUIRKS, MONTHS, SKILLS, SERVER, XP, DAEMON_DROPS } from './data.mjs';
import { sweepFile, showSweep, sweepCommand } from './forensics.mjs';
import { isWild, relocks, rogueLayout, rogueSpawns, rogueMotd, liveRogue, ROGUE, relockLeft, clock } from './rogue.mjs';
import { findLocation, closest, command, selectEncounter, active, emit, warn, hackerLevel, addLead, addLocation, disconnect, hooks, maxSignal, classOf, equippedSkills, hasTalent, serverLevel, gainXp, gainServerXp, addItem, gearStat, xpFor, gainCode, learnBlueprint, learnDaemon, UNIQUES, effectLine } from './combat.mjs';
import { ZERO_DAYS, RARITIES, LOOT, uniqueItem, rollItem, seeded, statLine, itemLabel, SERVICES, SERVICE_SOURCES, MATERIALS, codeOf, vaultCode } from './gear.mjs';
import { jackIn, developerNetwork } from './invasion.mjs';
import { contractTakeover, bankCargo, wantedBy, title as contractTitle } from './mail.mjs';
import { hiddenNodes, locate, flagged, bankRoute, hiddenLead, spawnHidden, HIDDEN, routed } from './hidden.mjs';
import { SPRAWL, zoneOf, zoneRooms } from './zone.mjs';
import { STATION, dropOf, dropFile, broadcast } from './station.mjs';
import { crewCommand } from './crew.mjs';
import { presenceCommand, at, simOn, PRESENCE, online } from './presence.mjs';
import { consortiumCommand, isGround, arrive, memberServers } from './consortium.mjs';
import { isLive, joinCost, liveCount, memoryCap, memoryCommand } from './memory.mjs';
import { strikeServer } from './factions.mjs';
import { owned, procIn, procOf, rootFileInfo, rootFiles, rootOf, CACHE_FILE, STASH_DIR, STASH_FILE } from './root.mjs';
export { zoneOf, zoneRooms };

const since = (s, first) => s.logs.filter((e) => e.id > first);
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');

// ---------- layouts ----------
// Each location uses one template. Every template has one guard, one locked
// directory, a password to find, a cache of credits, a salvage item and a
// trace record that leads one layer deeper.
export const LAYOUTS = {
  relay: {
    '/': { dirs: ['logs', 'relay'], files: ['readme.txt'] },
    '/logs': { dirs: [], files: ['access.log', 'auth.bak'] },
    '/relay': { dirs: ['vault'], files: ['cache.dat'], guard: 'watchdog' },
    '/relay/vault': { dirs: [], files: ['payload.bin', 'signal.trc'], locked: true },
  },
  mailhub: {
    '/': { dirs: ['mail', 'spool'], files: ['motd.txt'] },
    '/mail': { dirs: [], files: ['ops.eml', 'spam.eml'] },
    '/spool': { dirs: ['vault'], files: ['queue.log', 'queue.dat'], guard: 'sentinel' },
    '/spool/vault': { dirs: [], files: ['payload.bin', 'signal.trc'], locked: true },
  },
  mirror: {
    '/': { dirs: ['public', 'private'], files: ['index.txt'] },
    '/public': { dirs: [], files: ['notes.txt', 'mirror.dat'] },
    '/private': { dirs: ['admin'], files: ['ledger.dat'], guard: 'watchdog' },
    '/private/admin': { dirs: ['vault'], files: ['todo.txt', 'keys.bak'] },
    '/private/admin/vault': { dirs: [], files: ['payload.bin', 'signal.trc'], locked: true },
  },
  // Backup server: three month logs, three keys, only the latest works. The Shredder eats your pack.
  archive: {
    '/': { dirs: ['backups', 'srv'], files: ['readme.md'] },
    '/backups': { dirs: [], files: ['jan.log', 'feb.log', 'mar.log', 'old.dat'] },
    '/srv': { dirs: ['vault'], files: ['stock.dat'], guard: 'shredder' },
    '/srv/vault': { dirs: [], files: ['payload.bin', 'signal.trc'], locked: true },
  },
  // Research lab: /tmp is a honeypot. Read before you pull.
  lab: {
    '/': { dirs: ['bin', 'tmp', 'lab'], files: ['notice.txt'] },
    '/bin': { dirs: [], files: ['login.sh'] },
    '/tmp': { dirs: [], files: ['bait.dat', 'scratch.txt'] },
    '/lab': { dirs: ['vault'], files: ['samples.dat'], guard: 'crawler' },
    '/lab/vault': { dirs: [], files: ['payload.bin', 'signal.trc'], locked: true },
  },
};

// The rogue server lives in zone.mjs (mail.mjs needs it too); its layout joins the rest here.
LAYOUTS.sprawl = SPRAWL;
const ZONE_FAMILIES = ['ransomware', 'worm', 'ghostroot'];
// Fill empty folders whose timer is up. Each spawn is a plain virus of a home family at your level,
// up to CONFIG.zone.maxLevel: past that, the fights worth having are on the servers you trace. Below
// level 3 no Ghostroot (it's veiled): your first fights show you what's coming (Slay the Spire).
export function zoneSpawns(s, now = clock()) {
  const z = zoneOf(s);
  for (const room of zoneRooms()) {
    const sp = z.spawns[room];
    if (sp?.alive || (sp && sp.respawnAt > now)) continue;
    const n = ++z.serial;
    const pool = hackerLevel(s) < 3 ? ZONE_FAMILIES.filter((f) => f !== 'ghostroot') : ZONE_FAMILIES;
    const family = pool[(n + room.length) % pool.length];
    const lvl = Math.min(CONFIG.zone.maxLevel, Math.max(1, hackerLevel(s) + (n % 4 === 0 ? 1 : 0))); // a starter area: never past CONFIG.zone.maxLevel
    z.spawns[room] = { alive: true, family, level: lvl, seed: (z.seed * 97 + n * 131) >>> 0, name: `${FAMILIES[family].name.toLowerCase()}-${String(1000 + ((n * 7919) % 9000)).slice(-4)}` };
  }
  return z.spawns;
}
export const liveSpawns = (s) => Object.values(s.zone?.spawns || {}).filter((x) => x.alive).length;

// Quirks add rooms on top of the template.
const QUIRK_ROOMS = {
  nest: { '/nest': { dirs: [], files: ['brood.dat', 'shed.log'], guard: 'crawler' } },
  hidden: { '/.ghost': { dirs: [], files: ['stash.dat', '.key'] } },
};

export function layoutOf(loc) {
  if (loc?.rogue) return rogueLayout(loc); // a rogue server: folders of live viruses, no vault
  const base = LAYOUTS[loc?.template] || LAYOUTS.relay;
  const extra = QUIRK_ROOMS[loc?.quirk];
  let out = iced(loc, base);
  if (extra) out = Object.assign({ ...out, '/': { ...out['/'], dirs: [...out['/'].dirs, ...Object.keys(extra).map((k) => k.slice(1))] } }, extra);
  out = withDrop(loc, out);
  // A vault holds a code cache, and maybe a protocol, a blueprint, a daemon, source (layer 2+), a
  // harvester or a config: fixed by its seed (LOOT.vault*). Your first server's has a protocol and a blueprint.
  const vault = Object.keys(out).find((k) => out[k].locked && !out[k].drop);
  // Contracts plant files in vaults too (see mail.mjs).
  if (vault && loc) out = { ...out, [vault]: { ...out[vault], files: [...out[vault].files, ...(hasKit(loc) ? ['kit.bin'] : []), ...(hasBlueprint(loc) ? ['blueprint.bp'] : []), ...(hasDaemon(loc) ? ['daemon.exe'] : []), ...(sourceOf(loc) ? [sourceOf(loc) + '.src'] : []), ...(hasVx(loc) ? [vxName(loc)] : []), ...(vaultPlan(loc) ? ['plan.pln'] : []), ...(vaultConfig(loc) ? [vaultConfig(loc) + '.cfg'] : []), ...(vaultFilter(loc) ? ['filter.flt'] : [])] } };
  // About half the found servers keep an incident file at the root (a Log sweep, see forensics.mjs).
  const incident = sweepFile(loc);
  if (incident && out['/'] && !out['/'].files.includes(incident)) out = { ...out, '/': { ...out['/'], files: [...out['/'].files, incident] } };
  // Root access (root.mjs): a rotated cache at the root, and from Root 2 a /root with a stash.
  const rf = rootFiles(loc);
  if (rf.cache && out['/'] && !out['/'].files.includes(CACHE_FILE)) out = { ...out, '/': { ...out['/'], files: [...out['/'].files, CACHE_FILE] } };
  if (rf.stash && out['/'] && !out[STASH_DIR]) out = { ...out, '/': { ...out['/'], dirs: [...out['/'].dirs, STASH_DIR.slice(1)] }, [STASH_DIR]: { dirs: [], files: [STASH_FILE] } };
  // Contracts and relays plant files too (see mail.mjs, hidden.mjs): in the vault unless they say where.
  for (const f of loc?.extraFiles || []) {
    const dir = f.dir || vault;
    if (out[dir] && !out[dir].files.includes(f.name)) out = { ...out, [dir]: { ...out[dir], files: [...out[dir].files, f.name] } };
  }
  return out;
}
// A numbers-station dead drop (station.mjs): a locked /drop at the root while it's up.
function withDrop(loc, out) {
  if (!dropOf(loc) || !out['/']) return out;
  const name = STATION.dir.slice(1);
  return { ...out, '/': { ...out['/'], dirs: [...out['/'].dirs, name] }, [STATION.dir]: { dirs: [], files: [...STATION.files], locked: true, drop: true } };
}
// ICE: on layer 2 and deeper, about half the servers swap their Watchdog or Sentinel for ICE
// (fixed by the seed): a Watchdog becomes a Tracer, a Sentinel a Bouncer.
const ICE = { watchdog: 'tracer', sentinel: 'bouncer' };
export const iceOf = (loc) => ((loc?.depth || 1) >= 2 && seeded((loc.seed || 1) * 29 + 11)() < 0.5);
function iced(loc, base) {
  if (!iceOf(loc)) return base;
  const out = { ...base };
  for (const [k, d] of Object.entries(base)) if (ICE[d.guard]) out[k] = { ...d, guard: ICE[d.guard] };
  return out;
}
// Some vaults (10%, fixed per location) hold a daemon; half a protocol, a quarter a blueprint.
export const hasDaemon = (loc) => seeded(loc.seed * 13 + 5)() < DAEMON_DROPS.vault;
export const hasKit = (loc) => !!loc.starter || seeded(loc.seed * 41 + 7)() < LOOT.vaultKit;
export const hasBlueprint = (loc) => !!loc.starter || seeded(loc.seed * 43 + 9)() < LOOT.vaultBlueprint;
// The protocol waiting in a location's vault: the same every time you look.
export const levelOf = (loc) => loc.level || SERVER.locationLevel(1, loc.depth || 1);
// A vault always holds one item, white or better (LOOT.vault), fixed by its seed. A gold is a
// unique that drops from vaults this deep.
export function vaultItem(loc) {
  const r = seeded(loc.seed * 7 + 3), level = levelOf(loc), depth = loc.depth || 1;
  const w = LOOT.vault, total = Object.values(w).reduce((a, b) => a + b, 0);
  let x = r() * total, rarity = 'stock';
  for (const [k, v] of Object.entries(w)) if ((x -= v) < 0) { rarity = k; break; }
  if (rarity === 'zeroday') {
    const pool = Object.values(UNIQUES).filter((u) => u.level <= level + 2 && (u.sources || []).some((src) => src.kind === 'vault' && (src.layer || 1) <= depth));
    if (pool.length) return uniqueItem(pool[Math.floor(r() * pool.length)], level, r);
    rarity = 'custom';
  }
  return { ...rollItem(r, { level, rarity }), from: loc.family };
}
// Source in deeper vaults: a Zero-day protocol to compile, or a special service to install.
const SOURCES = [...Object.keys(ZERO_DAYS).filter((z) => !ZERO_DAYS[z].chase), ...SERVICE_SOURCES];
export const sourceOf = (loc) => ((loc.depth || 1) >= 2 && seeded(loc.seed * 47 + 13)() < LOOT.vaultSource ? SOURCES[loc.seed % SOURCES.length] : null);
const sourceName = (id) => (ZERO_DAYS[id] ? ZERO_DAYS[id].name : SERVICES[id].name);

const hiddenName = (name) => name.startsWith('.');
const guardName = (loc, path) => GUARDS[layoutOf(loc)[path]?.guard]?.name.toLowerCase() || 'guard';

const FLAVOR = {
  ransomware: 'payout routing for the ransom crews.',
  worm: 'spawn farm. every replica checks in here before it goes out.',
  ghostroot: 'mask templates are kept here. nobody traces us twice.',
};

// The password is a word plus two digits; mailhub splits it across two files.
const passWord = (loc) => loc.password.replace(/\d+$/, '');
const passDigits = (loc) => loc.password.match(/\d+$/)[0];

export function fileInfo(loc, path, name) {
  const rooted = rootFileInfo(loc, path, name, codeOf(loc.family));
  if (rooted) return rooted;
  const fam = FAMILIES[loc.family].name;
  const deeper = FAMILIES[loc.deeper].name;
  const cash = Math.round(CONFIG.cacheCredits * (1 + CONFIG.depthLoot * ((loc.depth || 1) - 1)) * (loc.quirk === 'hoard' ? 1 + CONFIG.hoardBonus : 1));
  const owner = loc.owner.toLowerCase();
  const month = loc.month || 'mar';
  const credits = (amount, what) => ({ kind: 'credits', size: '6k', amount, text: [`binary: ${what}, about ${amount} credits.`, 'pull it to take it.'] });
  // The vault's payload: a cache of the family's code (materials for your server's services).
  const code = codeOf(loc.family);
  const payload = { kind: 'code', size: '48k', material: code, amount: vaultCode(levelOf(loc)), text: [`binary: ${vaultCode(levelOf(loc))} ${MATERIALS[code].name.toLowerCase()}, lifted from the ${fam.toLowerCase()} that hit you.`, 'pull it and bank it: services on your server are built from code.'] };
  const signal = { kind: 'deeper', size: '3k', family: loc.deeper, text: [`trace record: this node forwards to a ${deeper.toLowerCase()} node one layer deeper.`, 'pull it and bank it: part of the trace to that node.'] };
  const files = {
    sprawl: {
      '/motd.txt': { kind: 'text', size: '1k', text: ['SPRAWL-00. nobody runs this box and everybody uses it.', 'stray processes gather in the folders. they come back after you kill them.', 'what you trace from them leads to the servers that sent them.'] },
      '/net/routes.txt': { kind: 'text', size: '2k', text: ['0.0.0.0/0 via ??? (unknown)', 'every route out of here ends at somebody\'s server.'] },
      '/var/log/syslog': { kind: 'text', size: '31k', text: ['kernel: process spawned without parent', 'kernel: process spawned without parent', 'kernel: process spawned without parent', '(the log goes on like this)'] },
      '/srv/junk.dat': { kind: 'text', size: '4k', text: ['binary junk. nothing worth pulling.'] },
    },
    relay: {
      '/readme.txt': { kind: 'text', size: '1k', text: [`// ${loc.name} — maintained by ${loc.owner}`, `// ${FLAVOR[loc.family]} keys and takings sit in /relay/vault.`, '// the watchdog on /relay stays up. no exceptions.', '// if you are reading this you are not supposed to be here.'] },
      '/logs/access.log': { kind: 'text', size: '14k', text: ['03:12:07 conn from 10.7.0.4 ... dropped', '03:12:44 watchdog: sweep ok', `03:13:02 auth ok  user=${owner}  vault pass=${loc.password}`, '03:13:05 /relay/vault opened', '03:19:51 conn from 10.7.0.9 ... dropped'] },
      '/logs/auth.bak': { kind: 'text', size: '2k', text: ['# auth config backup', '# rotated last cycle. old hashes only.', 'a7f3c9e1d0b2...  (useless now)'] },
      '/relay/cache.dat': credits(cash, 'cached payment tokens'),
      '/relay/vault/payload.bin': payload,
      '/relay/vault/signal.trc': signal,
    },
    mailhub: {
      '/motd.txt': { kind: 'text', size: '1k', text: [`${loc.name} mail hub. ${FLAVOR[loc.family]}`, 'reminder: vault keys are split. half in ops mail, half in the spool log.', 'the sentinel watches /spool. do not poke it.'] },
      '/mail/ops.eml': { kind: 'text', size: '3k', text: [`from: ${owner}@${loc.id}`, 'subject: vault rotation', `new key starts with "${passWord(loc)}". the rest is in the spool log like always.`] },
      '/mail/spam.eml': { kind: 'text', size: '9k', text: ['subject: YOU HAVE WON 5000 CREDITS', 'click here to claim. (you did not win.)'] },
      '/spool/queue.log': { kind: 'text', size: '22k', text: ['job 4471 queued ... sent', `job 4472 key suffix ${passDigits(loc)} ... applied`, 'job 4473 queued ... sent', 'hint: unlock takes the whole key, word then digits.'] },
      '/spool/queue.dat': credits(cash, 'queued payouts'),
      '/spool/vault/payload.bin': payload,
      '/spool/vault/signal.trc': signal,
    },
    mirror: {
      '/index.txt': { kind: 'text', size: '1k', text: [`${loc.name} public mirror.`, `${FLAVOR[loc.family]}`, 'nothing to see here. really.'] },
      '/public/notes.txt': { kind: 'text', size: '2k', text: [`${owner}: moved my notes into /private/admin. the watchdog guards /private now.`] },
      '/public/mirror.dat': credits(Math.round(cash / 2), 'mirrored tokens'),
      '/private/ledger.dat': credits(cash, 'a payout ledger'),
      '/private/admin/todo.txt': { kind: 'text', size: '1k', text: ['- rotate the watchdog', `- vault pass is ${loc.password}, change it soon`, '- stop writing passwords in todo lists'] },
      '/private/admin/keys.bak': { kind: 'text', size: '4k', text: ['old keys. all revoked.', 'b0b1b2... revoked', 'c3c4c5... revoked'] },
      '/private/admin/vault/payload.bin': payload,
      '/private/admin/vault/signal.trc': signal,
    },
    archive: {
      '/readme.md': { kind: 'text', size: '1k', text: [`${loc.name} backup archive. ${FLAVOR[loc.family]}`, `vault key rotates monthly. last rotation: ${month}. older keys are dead.`, 'the shredder on /srv eats anything it catches you carrying.'] },
      ...Object.fromEntries(MONTHS.map((m, i) => [`/backups/${m}.log`, { kind: 'text', size: '8k', text: [`== ${m} rotation ==`, `vault key: ${m === month ? loc.password : decoy(loc, i + 1)}`, m === month ? 'status: current' : 'status: rotated'].slice(0, 2) }])),
      '/backups/old.dat': credits(Math.round(cash / 2), 'an old payout backup'),
      '/srv/stock.dat': credits(cash, 'payment stock'),
      '/srv/vault/payload.bin': payload,
      '/srv/vault/signal.trc': signal,
    },
    lab: {
      '/notice.txt': { kind: 'text', size: '1k', text: [`${loc.name} lab. ${FLAVOR[loc.family]}`, 'rule 1: stop leaving logins in /bin.', 'rule 2: /tmp is a honeypot. copy anything out of it and the canary calls home.'] },
      '/bin/login.sh': { kind: 'text', size: '1k', text: ['#!/bin/sh', `# PASS=${loc.password}   (todo: move to env)`, 'exec lab-shell "$@"'] },
      '/tmp/bait.dat': { kind: 'trap', size: '6k', text: ['binary: canary token dressed up as a payout.', 'it phones home the moment it is copied. leave it.'] },
      '/tmp/scratch.txt': { kind: 'text', size: '1k', text: ['whoever keeps pulling bait.dat: that is the point of it.'] },
      '/lab/samples.dat': credits(cash, 'sample bounties'),
      '/lab/vault/payload.bin': payload,
      '/lab/vault/signal.trc': signal,
    },
  };
  const extras = {
    '/nest/brood.dat': { kind: 'item', size: '12k', item: 'Brood sample', text: ['binary: a live worm brood, sealed.', 'pull it to take it. good salvage.'] },
    '/nest/shed.log': { kind: 'text', size: '2k', text: ['the crawler sheds a fragment every few cycles.', 'kill the brood first or the fragments bleed you.'] },
    '/.ghost/stash.dat': credits(cash, 'a ghost stash'),
    '/.ghost/.key': { kind: 'text', size: '1k', text: [`vault key, kept where plain ls won't show it: ${loc.password}`] },
  };
  const full = join(path, name);
  if (path === STATION.dir && dropOf(loc)) return dropFile(loc, name);
  if (loc.rogue) return full === '/motd.txt' ? { kind: 'text', size: '1k', text: rogueMotd(loc) } : null;
  if (sweepFile(loc) && full === '/' + sweepFile(loc)) return { kind: 'sweep', size: '9k', text: ['an incident log. cat it to sweep it.'] };
  if (name === 'kit.bin' && layoutOf(loc)[path]?.locked) {
    const item = vaultItem(loc);
    return { kind: 'gear', size: '32k', item, text: [`binary: ${itemLabel(item)}, ${item.unique ? 'a Zero-day' : `a ${RARITIES[item.rarity].name.toLowerCase()} ${item.group || 'item'}`}.`, `${statLine(item.stats)}.${item.zeroDay ? ' ' + ZERO_DAYS[item.zeroDay].effect : ''}${item.unique ? ' ' + effectLine(item) : ''}`, 'pull it to take it. load it at home.'] };
  }
  const vaultPath = Object.keys(layoutOf(loc)).find((k) => layoutOf(loc)[k].locked && !layoutOf(loc)[k].drop);
  const planted = loc.extraFiles?.find((f) => f.name === name && (f.dir || vaultPath) === path);
  if (planted) return { kind: planted.kind || 'contract', size: planted.kind === 'route' ? '6k' : '40k', label: planted.label, hidden: planted.hidden, text: planted.text };
  if (name.endsWith('.cfg') && vaultConfig(loc) + '.cfg' === name && layoutOf(loc)[path]?.locked) {
    const id = vaultConfig(loc), c = CONFIGS[id];
    return { kind: 'config', size: '18k', config: id, text: [`config source: ${c.name}, for a ${c.service === 'hotpatch' ? 'Hot-patcher' : c.service[0].toUpperCase() + c.service.slice(1)}.`, c.rule, 'bank it, then craft it at home (Craft page).'] };
  }
  if (hasVx(loc) && name === vxName(loc) && layoutOf(loc)[path]?.locked) {
    const h = vaultHarvester(loc);
    return { kind: 'harvester', size: '220k', harvester: h, text: [`package: a native ${fam.toLowerCase()} process, sealed for transport.`, `${harvesterName(h)}. Installed on a server you own, it harvests while you're away.`, 'pull it and bank it.'] };
  }
  if (name === 'filter.flt' && vaultFilter(loc) && layoutOf(loc)[path]?.locked) { const f = vaultFilter(loc); return { kind: 'filter', size: '24k', filter: f, text: [`firewall filter: ${f.name} (${RARITIES[f.rarity].name.toLowerCase()}, lv ${f.level}).`, `${filterLine(f)}.`, 'bank it, then put it in your firewall at home (Server page).'] }; }
  if (name === 'plan.pln' && vaultPlan(loc) && layoutOf(loc)[path]?.locked) return { kind: 'plan', size: '48k', plan: vaultPlan(loc), text: [`plan: ${planName(vaultPlan(loc))}.`, 'bank it to learn it, then craft it at home (Craft page).'] };
  if (name === 'daemon.exe' && layoutOf(loc)[path]?.locked) return { kind: 'daemon', size: '96k', text: ['binary: a daemon, a small program that fights beside you.', 'bank it to keep it.'] };
  if (name === 'blueprint.bp' && layoutOf(loc)[path]?.locked) return { kind: 'blueprint', size: '64k', text: ['blueprint: plans for a service or a protocol recipe.', 'bank it to learn it.'] };
  if (name.endsWith('.src') && sourceOf(loc) + '.src' === name) {
    const id = sourceOf(loc);
    return ZERO_DAYS[id]
      ? { kind: 'source', size: '120k', zeroDay: id, text: [`source: ${ZERO_DAYS[id].name}, a Zero-day protocol.`, ZERO_DAYS[id].effect, 'bank it, then compile it at home (Craft page).'] }
      : { kind: 'source', size: '120k', zeroDay: id, text: [`source: ${SERVICES[id].name}, a special service.`, SERVICES[id].about, 'bank it, then install it on your server (Server page).'] };
  }
  const info = (files[loc.template] || files.relay)[full] || extras[full];
  // The hidden quirk leaves one hint in the first file at the root.
  if (info && loc.quirk === 'hidden' && path === '/' && name === layoutOf(loc)['/'].files[0]) return { ...info, text: [...info.text, '// ghosts keep their stash where plain ls can\'t see. (ls -a)'] };
  return info;
}

// Wrong keys in the archive: same word, different digits.
function decoy(loc, k) {
  const d = Number(passDigits(loc));
  return passWord(loc) + String(10 + ((d - 10 + k * 17) % 89));
}

// How many of those you've banked (dead drops, route and contract files don't count toward it).
export const takenOf = (loc) => takeable(loc).filter((f) => loc.state.taken[f]).length;
export function takeable(loc) {
  const out = [];
  for (const [dir, d] of Object.entries(layoutOf(loc))) if (!d.drop) for (const f of d.files) if (!['text', 'trap', 'sweep'].includes(fileInfo(loc, dir, f).kind)) out.push(join(dir, f));
  return out;
}

// Resolve a Unix-style path (absolute, relative, with .. and .) against the current directory.
export function join(path, name) {
  const parts = name.startsWith('/') ? [] : path.split('/').filter(Boolean);
  for (const seg of name.split('/').filter(Boolean)) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return '/' + parts.join('/');
}

export const currentLocation = (s) => (s.run?.loc === CONFIG.zone.id ? zoneOf(s) : findLocation(s, s.run?.loc));
const inPack = (s, full) => s.run.pack.some((p) => p.path === full);
const guarded = (loc, path) => !!layoutOf(loc)[path]?.guard && !loc.state.cleared[path];
// A guard the Infiltrator slipped past this run doesn't stop you there (it's back next run).
const watching = (s, loc, path) => guarded(loc, path) && !s.run?.slipped?.includes(path);
// Infiltrator Ghost: slip past a guard without a fight (1 a run, 3 with Leaked Creds).
export const slipsLeft = (s) => (s.run && classOf(s) === 'infiltrator' ? (hasTalent(s, 'leaked-creds') ? CONFIG.slip.leakedCreds : CONFIG.slip.perRun) - (s.run.slips || 0) : 0);
function slip(s) {
  const e = s.encounter;
  if (classOf(s) !== 'infiltrator') return err(s, 'slip is the Infiltrator\'s: only they get past a guard unseen.');
  if (!(e?.mode === 'run' && e.phase === 'alert' && !e.zone)) return err(s, 'Nothing to slip past. Walk into a guarded folder first.');
  if (slipsLeft(s) <= 0) return err(s, 'No slips left this run.');
  const dir = e.room;
  s.encounter = null;
  s.run.slips = (s.run.slips || 0) + 1;
  (s.run.slipped ||= []).push(dir);
  const n = slipsLeft(s);
  emit(s, 'net-good', `SLIPPED past the ${e.virus.name}. It never saw you. ${n ? `${n} slip${n === 1 ? '' : 's'} left this run.` : 'No slips left this run.'}`);
  ls(s);
}
const locked = (loc, path) => !!layoutOf(loc)[path]?.locked && !loc.state.unlocked[path];

// ---------- commands ----------

export const RUN_COMMANDS = ['split', 'link', 'goto', 'regroup', 'unlink', 'history', 'ls', 'cd', 'cat', 'pull', 'unlock', 'jack', 'look', 'go', 'pwd', 'tree', 'pack', 'help', 'spoof', 'slip', 'tap', 'attack', 'boost', 'sweep'];
const equipped = (s, id) => equippedSkills(s, classOf(s)).includes(id);
const onceUsed = (s, id) => (s.run.used ||= {})[id];

// Infiltrator Spoof: once per run, the next guarded folder you enter doesn't start a fight.
// Inside you can read and pull one file; the guard stays and you can't go deeper.
// Rotating Proxies talent: two spoofs per run.
const canCloak = (s) => equipped(s, 'spoof') && (s.run.cloaks || 0) < (hasTalent(s, 'rotating-proxies') ? 2 : 1) && s.run.cloak !== 'armed' && !(s.run.cloak && s.run.cloak.startsWith('/') && s.run.cloak === s.run.cwd);
const cloakedIn = (s, dir) => s.run?.cloak === dir;

function prompt(s) {
  return `${currentLocation(s).id}:${s.run.cwd}$`;
}

function echo(s, text) {
  s.run.lastEcho = emit(s, 'net-cmd', `[${s.run.integrity}] ${prompt(s)} ${text}`).id;
}
const out = (s, lines, type = 'net-out') => emit(s, type, Array.isArray(lines) ? lines.join('\n') : lines);
const err = (s, text, detail = {}) => emit(s, 'net-err', text, detail);
// A typo'd name: the error plus "did you mean" (clickable in the terminal).
const near = (s, text, word, names, cmd) => { const n = closest(word, names); return err(s, n ? `${text} Did you mean ${n}?` : text, n ? { suggest: `${cmd} ${n}` } : {}); };

export function connect(s, id) {
  const first = s.serial;
  const zone = id === CONFIG.zone.id || id === CONFIG.zone.name.toLowerCase();
  const loc = zone ? zoneOf(s) : findLocation(s, id) || [...s.locations, ...memberServers(s)].find((l) => l.name.toLowerCase() === id);
  const signal = signalNow(s);
  if (active(s)) warn(s, 'Finish the fight first.');
  else if (!s.run && signal < Math.ceil(maxSignal(s) * CONFIG.zone.minSignal)) warn(s, `Signal ${signal}/${maxSignal(s)}: too weak to connect. Let it rest back up to ${Math.ceil(maxSignal(s) * CONFIG.zone.minSignal)}.`);
  else if (s.run) warn(s, 'Already connected. Type jack out first.');
  else if (!loc) warn(s, `No server called "${id}" on your map.`);
  else if (s.server.integrity <= 0) warn(s, 'Your server crashed. Reboot before running.');
  else if (loc.fresh && loc.detached && !joinCost(s, loc).fits) warn(s, `${loc.name} needs ${joinCost(s, loc).add} memory; ${memoryCap(s) - liveCount(s)} free (${liveCount(s)}/${memoryCap(s)}). Detach something first.`);
  else if (!loc.fresh && (loc.detached || (s.locations.includes(loc) && !isLive(s, loc)))) warn(s, `${loc.name} is detached from your network. Attach it first (its map card).`);
  else if (relocks(loc) && relockLeft(loc)) warn(s, `${loc.name} is still tracing your last connection. Reconnect in ${relockLeft(loc)}s.`);
  else {
    // A found server joins your network as you connect (the game asks first: app.js).
    if (loc.fresh && loc.detached) memoryCommand(s, 'attach', loc.id);
    // A waiting home intrusion is parked for the run and comes back afterwards.
    if (s.encounter?.phase === 'alert' && s.encounter.mode !== 'run') s.parked = s.encounter;
    if (s.encounter && s.encounter.phase !== 'active') s.encounter = null;
    arrive(s, loc, fileInfo); // a member's server: its natives come back after a while (consortium.mjs)
    const firstVisit = !loc.runs && !zone;
    loc.runs++;
    if (zone) zoneSpawns(s);
    if (loc.rogue) rogueSpawns(s, loc);
    s.run = { loc: loc.id, cwd: '/', integrity: signal, max: maxSignal(s), pack: [], visited: ['/'] };
    // Your crew comes along, linked to you (they follow where you go). See the crew strip.
    s.run.crew = Object.fromEntries((s.crewSim || []).map((x) => [x.name, { cwd: '/', link: 'you' }]));
    const q = QUIRKS[loc.quirk];
    if (zone) emit(s, 'run-start', `CONNECTED to ${loc.name}, a rogue server. ${liveSpawns(s)} ${liveSpawns(s) === 1 ? 'virus' : 'viruses'} running.`, { location: loc.id });
    else if (loc.occupied) emit(s, 'run-start', `CONNECTED to ${loc.name}${loc.member ? `, ${loc.member}'s server` : ', your server'}, rebooting and occupied: ${liveRogue(loc)} ${liveRogue(loc) === 1 ? 'virus' : 'viruses'} in its folders. Clear them all to bring it back up.`, { location: loc.id });
    else if (loc.rogue) emit(s, 'run-start', `CONNECTED to ${loc.name}, a rogue server (${ROGUE.kinds[loc.rogue.kind].name}): ${ROGUE.kinds[loc.rogue.kind].rule} ${liveRogue(loc)} ${liveRogue(loc) === 1 ? 'virus' : 'viruses'} running.`, { location: loc.id });
    else emit(s, 'run-start', `CONNECTED to ${loc.name}${loc.member ? `, ${loc.member}'s server` : ''}${loc.depth > 1 ? ` (layer ${loc.depth})` : ''}.${rootOf(loc) ? ` Root ${rootOf(loc)}.` : ''}${procOf(loc) ? ` ${procOf(loc).rare ? '★' : '↻'} ${procOf(loc).name} in ${procOf(loc).room}.` : ''}${q ? ` ${q.name}: ${q.rule}` : ''}${loc.passwordKnown ? ` Vault key (Perfect Trace): ${loc.password}.` : ''}`, { location: loc.id });
    ls(s);
    if (!zone && !loc.member) collect(s, loc, 'Collected from ');
    if (firstVisit) gainXp(s, xpFor(s, levelOf(loc), XP.newLocation), `first run on ${loc.name}`, 'breakin');
  }
  return since(s, first);
}

// Signal carries between connections: what you left with, rested back up at home.
export const signalNow = (s) => Math.min(maxSignal(s), s.signal ?? maxSignal(s));

// ls is structured so the screen can make every name clickable.
const jobNames = (s, kill) => wantedBy(s, kill).map((c) => contractTitle(s, c));
function ls(s, all = false) {
  const loc = currentLocation(s);
  const here = layoutOf(loc)[s.run.cwd];
  if (all) s.run.showHidden = true;
  const show = (n) => s.run.showHidden || !hiddenName(n);
  const entries = [];
  if (s.run.cwd !== '/') entries.push({ kind: 'dir', name: '..', cmd: 'cd ..', tags: [] });
  // On the rogue server a live virus sits in the folder: attack it when you're ready.
  if (isWild(loc)) {
    const spawns = loc.zone ? zoneSpawns(s) : rogueSpawns(s, loc);
    const sp = spawns[s.run.cwd];
    if (sp?.alive) entries.push({ kind: 'virus', name: sp.name + '.exe', size: `lv${sp.level}`, cmd: `attack ${sp.name}`, tags: [...(sp.elite ? ['crew'] : []), FAMILIES[sp.family].name.toLowerCase()], jobs: jobNames(s, { family: sp.family, zone: true, name: sp.bounty ? sp.name : null, level: sp.level, strain: sp.strain }) });
  }
  // A server you own: the process its last log rotation brought in (root.mjs).
  const proc = procIn(loc, s.run.cwd);
  if (proc) entries.push({ kind: 'virus', name: proc.name + '.exe', size: `lv${proc.level}`, cmd: `attack ${proc.name}`, tags: [proc.rare ? 'rare' : 'rotation', FAMILIES[proc.family].name.toLowerCase()], jobs: jobNames(s, { family: proc.family, zone: true, level: proc.level, strain: proc.strain }) });
  for (const d of here.dirs.filter(show)) {
    const full = join(s.run.cwd, d);
    const tags = [guarded(loc, full) ? 'guarded' : '', locked(loc, full) ? 'locked' : ''].filter(Boolean);
    const hostile = isWild(loc) && loc.spawns?.[full]?.alive;
    // SPRAWL-00 is shared: who's in each folder (presence.mjs).
    const people = peopleIn(s, loc, full, true);
    // What's waiting in there counts for a contract: a guard you haven't beaten, or a rogue folder's virus.
    const g = guarded(loc, full) && layoutOf(loc)[full]?.guard, wild = hostile && loc.spawns[full];
    const jobs = g ? jobNames(s, { family: g, zone: false, level: levelOf(loc) }) : wild ? jobNames(s, { family: wild.family, zone: true, name: wild.bounty ? wild.name : null, level: wild.level, strain: wild.strain }) : [];
    entries.push({ kind: 'dir', name: d, cmd: locked(loc, full) ? `unlock ${d} ` : `cd ${d}`, tags: hostile ? [...tags, 'virus', ...(loc.spawns[full].elite ? ['crew'] : [])] : tags, people, jobs });
  }
  for (const f of here.files.filter(show)) {
    const info = fileInfo(loc, s.run.cwd, f);
    const full = join(s.run.cwd, f);
    if (loc.state.taken[full] || inPack(s, full)) continue; // pulled: it's gone from here (your pack has it)
    const read = s.run.read?.includes(full);
    const state = info.kind === 'sweep' ? (loc.state.sweep?.solved ? 'swept' : 'log') : loc.state.sprung?.[full] ? 'sprung' : info.kind === 'trap' ? (read ? 'canary' : 'pull') : loc.state.taken[full] ? 'banked' : inPack(s, full) ? 'in pack' : info.kind !== 'text' ? 'pull' : read ? 'read' : '';
    entries.push({ kind: 'file', name: f, size: info.size, cmd: `cat ${f}`, pull: state === 'pull' ? `pull ${f}` : null, tags: state ? [state] : [] });
  }
  const text = entries.map((e) => (e.kind === 'virus' ? `!  ${e.name.padEnd(14)}${e.size.padStart(4)}` : e.kind === 'dir' ? `d  ${e.name === '..' ? '..' : e.name + '/'}` : `-  ${e.name.padEnd(14)}${e.size.padStart(4)}`) + (e.tags.length ? '   [' + e.tags.join('] [') + ']' : '') + (e.jobs?.length ? '   [contract]' : '')).join('\n');
  const herePeople = peopleIn(s, loc, s.run.cwd, false);
  emit(s, 'net-ls', herePeople.length ? `${text}\nhere: ${herePeople.map((x) => x.handle).join(', ')}` : text, { entries, here: herePeople });
}

// Who's in a folder: your crew (always), plus anyone online in a shared place (SPRAWL-00, the
// consortium's ground). deep: or anywhere inside it, as ls shows next to a folder.
function peopleIn(s, loc, folder, deep) {
  const inside = (p) => p === folder || (deep && p.startsWith(folder === '/' ? '/' : folder + '/'));
  const crew = Object.entries(s.run?.crew || {}).filter(([, c]) => inside(c.cwd)).map(([handle, c]) => ({ handle, crew: true, linked: c.link === 'you' }));
  const key = loc.zone ? 'sprawl' : isGround(s, loc) ? loc.id : null;
  const others = key && simOn(s) ? at(s, key, folder, deep).filter((x) => !s.run?.crew?.[x.handle]).map((x) => ({ handle: x.handle, friend: x.friend, member: x.member, fighting: x.place.fighting })) : [];
  return [...crew, ...others];
}

function cd(s, arg, pulled = null) {
  const loc = currentLocation(s);
  if (!arg) return err(s, 'cd where? Try cd .. or one of the directories from ls.');
  const target = join(s.run.cwd, arg);
  if (!layoutOf(loc)[target]) return near(s, `cd: no such directory: ${arg}.`, arg, ['..', ...(layoutOf(loc)[s.run.cwd]?.dirs || [])], 'cd');
  if (target === s.run.cwd) return out(s, 'already here.');
  const up = (s.run.cwd + '/').startsWith(target === '/' ? '/' : target + '/');
  // Every directory on the way down must be passable.
  for (let p = target; p !== '/' && !up; p = p.slice(0, p.lastIndexOf('/')) || '/') {
    if (p !== target && watching(s, loc, p)) return err(s, `${p} is guarded. Clear it before going deeper.`);
    if (p !== target && locked(loc, p)) return err(s, `${p} is locked.`);
  }
  // Leaving a guarded directory before engaging backs you off the guard.
  if (s.encounter?.mode === 'run' && s.encounter.phase === 'alert') s.encounter = null;
  if (!up && locked(loc, target)) return err(s, `${arg}/ is locked. Type unlock ${arg.split('/').pop()} <password>.`);
  // Infiltrator Light footprint: going back where you've been is free.
  const free = classOf(s) === 'infiltrator' && s.run.visited.includes(target);
  if (!free) s.run.integrity = Math.max(0, s.run.integrity - CONFIG.cdCost);
  // Rig Regen: a little Signal back with every move.
  const rg = gearStat(s, 'regen', 'hacker');
  if (rg && s.run.integrity > 0) {
    s.run.regenAcc = (s.run.regenAcc || 0) + rg;
    const n = Math.floor(s.run.regenAcc);
    if (n) { s.run.regenAcc -= n; s.run.integrity = Math.min(s.run.max, s.run.integrity + n); }
  }
  if (s.run.cloak && s.run.cloak !== 'armed' && s.run.cloak !== 'spent' && s.run.cloak !== target) s.run.cloak = 'spent';
  s.run.cwd = target;
  // Crew linked to you come along; a move of your own breaks a link you had to someone.
  for (const c of Object.values(s.run.crew || {})) if (c.link === 'you') c.cwd = target;
  if (s.run.linkedTo && !pulled) { emit(s, 'net-out', `Link to ${s.run.linkedTo} dropped.`); s.run.linkedTo = null; }
  // The terminal starts over in each folder (from the cd that got you here); `history` shows the whole run.
  s.run.roomFrom = s.run.lastEcho;
  s.run.history = false;
  if (!s.run.visited.includes(target)) s.run.visited.push(target);
  if (s.run.integrity <= 0) return disconnect(s, 'Signal ran out');
  // Like a MUD room: arriving shows what's here.
  if (watching(s, loc, target) && s.run.cloak === 'armed') {
    s.run.cloak = target;
    emit(s, 'net-good', `CLOAKED. The ${guardName(loc, target)} doesn't see you. Read what you like and pull one file, then get out.`);
    ls(s);
  } else if (watching(s, loc, target)) selectEncounter(s, layoutOf(loc)[target].guard, loc.seed + target.length, { mode: 'run', room: target, level: levelOf(loc), ...(loc.quirk === 'hoard' ? { mutation: 'armored' } : {}) });
  else ls(s);
}

function cat(s, arg) {
  if (!arg) return err(s, 'cat what? Try a file from ls.');
  const loc = currentLocation(s);
  const full = join(s.run.cwd, arg);
  const dir = full.slice(0, full.lastIndexOf('/')) || '/';
  const name = full.split('/').pop();
  if (!layoutOf(loc)[dir]?.files.includes(name)) return near(s, `cat: ${arg}: no such file here.`, arg, layoutOf(loc)[s.run.cwd]?.files || [], 'cat');
  if (watching(s, loc, dir) && !cloakedIn(s, dir)) return err(s, `The ${guardName(loc, dir)} is watching. Deal with it first.`);
  s.run.read ||= [];
  if (!s.run.read.includes(full)) s.run.read.push(full);
  if (fileInfo(loc, dir, name).kind === 'sweep') return showSweep(s, loc);
  out(s, fileInfo(loc, dir, name).text, 'net-file');
}

// Every file still waiting in this folder, into your pack: the same checks as one pull each (a
// watching guard stops it, a spoof covers one file, a canary you've read is left where it is).
function pullable(s, loc) {
  const dir = s.run.cwd;
  return (layoutOf(loc)[dir]?.files || []).filter((f) => {
    const full = join(dir, f), info = fileInfo(loc, dir, f);
    if (!info || info.kind === 'text' || info.kind === 'sweep' || loc.state.taken[full] || inPack(s, full) || loc.state.sprung?.[full]) return false;
    return !(info.kind === 'trap' && s.run.read?.includes(full));
  });
}
export const pullableCount = (s) => (s.run ? pullable(s, currentLocation(s)).length : 0);
function pullAll(s) {
  const loc = currentLocation(s), files = pullable(s, loc);
  if (!files.length) return err(s, 'Nothing here to pull.');
  for (const f of files) {
    if (!s.run || s.run.cwd === undefined) break; // thrown out (a canary took the last of your Signal)
    const before = s.run.pack.length;
    pull(s, f);
    if (s.run && s.run.pack.length === before && !loc.state.sprung?.[join(s.run.cwd, f)]) break; // stopped (a guard, a spoof's one file)
  }
}

function pull(s, arg) {
  if (!arg) return err(s, 'pull what? Try a file marked [pull].');
  const loc = currentLocation(s);
  const full = join(s.run.cwd, arg);
  const dir = full.slice(0, full.lastIndexOf('/')) || '/';
  const name = full.split('/').pop();
  if (!layoutOf(loc)[dir]?.files.includes(name)) return near(s, `pull: ${arg}: no such file here.`, arg, layoutOf(loc)[s.run.cwd]?.files || [], 'pull');
  if (dir !== s.run.cwd) return err(s, `pull: be in ${dir} to pull ${name}.`);
  if (watching(s, loc, dir) && !cloakedIn(s, dir)) return err(s, `The ${guardName(loc, dir)} is watching. Deal with it first.`);
  if (cloakedIn(s, dir) && s.run.cloakPulled) return err(s, `The ${guardName(loc, dir)} stirs. One file is all the spoof covers: leave.`);
  const info = fileInfo(loc, dir, name);
  if (info.kind === 'text') return err(s, `${arg} is just text. cat it to read it.`);
  if (info.kind === 'sweep') return err(s, `${arg} is a log. cat it to sweep it.`);
  if (info.kind === 'trap') {
    if (loc.state.sprung?.[full]) return err(s, `${arg} already went off. It's worthless now.`);
    (loc.state.sprung ||= {})[full] = true;
    s.run.integrity = Math.max(0, s.run.integrity - CONFIG.trapSignal);
    emit(s, 'trap', `CANARY TRIPPED. ${arg} was bait: −${CONFIG.trapSignal} Signal (${s.run.integrity}/${s.run.max}).`, { amount: CONFIG.trapSignal });
    if (s.run.integrity <= 0) disconnect(s, 'Signal ran out');
    return;
  }
  if (loc.state.taken[full]) return err(s, `${arg} is already banked.`);
  if (inPack(s, full)) return err(s, `${arg} is already in your pack.`);
  s.run.pack.push({ path: full, name, ...info });
  if (cloakedIn(s, dir)) s.run.cloakPulled = true;
  emit(s, 'net-good', `pulled ${arg} into your pack. It is yours once you jack out.`, { gain: packGain(s.run.pack.at(-1)) });
}

// One pack file as a row for the gain card (app.js): { label, qty, kind, rarity, sub, text }.
// Same row shape as a fight's spoils (view.mjs spoilsOf), so the card looks the same.
export function packGain(f, credits = null) {
  const row = (label, qty, kind, extra = {}) => ({ label, qty, kind, pack: false, ...extra, text: qty ? `${qty} ${label}` : label });
  switch (f.kind) {
    case 'credits': return row('Credits', `+${credits ?? f.amount}`, 'credits');
    case 'item': return row(f.item, '', 'loot', { sub: 'salvage' });
    case 'gear': return row(itemLabel(f.item), '', 'item', { rarity: f.item.rarity, sub: statLine(f.item.stats) });
    case 'code': return row(MATERIALS[f.material]?.name || f.material, `+${f.amount}`, f.material === 'exploit' ? 'exploit' : 'code');
    case 'source': return row(`${sourceName(f.zeroDay)} source`, '', 'blueprint', { rarity: 'zeroday' });
    case 'blueprint': return row('Blueprint', '', 'blueprint', { sub: '???' });
    case 'daemon': return row('Daemon', '', 'daemon', { sub: '???' });
    case 'deeper': return row('Trace record', '', 'found');
    case 'harvester': return row(harvesterName(f.harvester), '', 'item', { rarity: 'custom' });
    case 'config': return row(`${CONFIGS[f.config]?.name || f.config} config`, '', 'blueprint', { rarity: 'custom' });
    case 'plan': return row(planName(f.plan), '', 'blueprint', { rarity: 'tuned' });
    case 'filter': return row(f.filter.name, '', 'item', { rarity: f.filter.rarity, sub: filterLine(f.filter) });
    default: return row(f.label || f.name, '', 'found');
  }
}

function unlock(s, rest) {
  const [dir, pass] = rest.split(' ');
  const loc = currentLocation(s);
  if (!dir || !pass) return err(s, 'usage: unlock <directory> <password>');
  const target = join(s.run.cwd, dir);
  if (!layoutOf(loc)[target]) return err(s, `unlock: no such directory: ${dir}`);
  if (!locked(loc, target)) return out(s, `${dir}/ isn't locked.`);
  if (guarded(loc, s.run.cwd)) return err(s, `The ${guardName(loc, s.run.cwd)} is watching. Deal with it first.`);
  const drop = layoutOf(loc)[target].drop;
  if (pass !== (drop ? dropOf(loc).pass : loc.password)) {
    s.run.integrity = Math.max(0, s.run.integrity - 3);
    err(s, `access denied. The failed attempt cost 3 Signal (${s.run.integrity}/${s.run.max}).`);
    if (s.run.integrity <= 0) disconnect(s, 'Signal ran out');
    return;
  }
  loc.state.unlocked[target] = true;
  if (drop) { out(s, `${dir}/ unlocked. The dead drop is yours.`, 'net-good'); return gainXp(s, xpFor(s, dropOf(loc)?.level || levelOf(loc), 1.5), 'dead drop cracked', 'intel'); } // LANTERN's puzzle
  out(s, `${dir}/ unlocked.`, 'net-good');
  gainXp(s, xpFor(s, levelOf(loc), XP.vault), 'vault cracked', 'breakin');
  if (loc.member) return out(s, `The vault is open, but ${loc.name} stays ${loc.member}'s.`); // a consortium member's: no takeover
  strikeServer(s, loc, 'takeover'); // a faction's server: a blow to it (factions.mjs)
  contractTakeover(s, loc);
}

// A Signal booster: half your Signal back, on the spot.
function boost(s) {
  const n = s.items?.booster || 0;
  if (!n) return err(s, 'boost: no Signal boosters left. Top up with credits at home.');
  if (s.run.integrity >= s.run.max) return out(s, 'Signal is already full.');
  s.items.booster = n - 1;
  const gain = Math.min(s.run.max - s.run.integrity, Math.ceil(s.run.max * CONFIG.booster.restore));
  s.run.integrity += gain;
  emit(s, 'boost', `SIGNAL BOOST +${gain} (${s.run.integrity}/${s.run.max}). ${s.items.booster} left.`, { amount: gain });
}

export function jackOut(s) {
  const loc = currentLocation(s);
  const pack = s.run.pack;
  let credits = 0;
  for (const f of pack) {
    loc.state.taken[f.path] = true;
    if (f.kind === 'credits') credits += f.amount;
    if (f.kind === 'item') s.salvage.push({ name: f.item, virus: loc.name, seed: loc.seed });
  }
  const gear = pack.filter((f) => f.kind === 'gear');
  const sources = pack.filter((f) => f.kind === 'source');
  const blueprints = pack.filter((f) => f.kind === 'blueprint');
  const daemons = pack.filter((f) => f.kind === 'daemon');
  const code = {};
  for (const f of pack.filter((x) => x.kind === 'code')) code[f.material] = (code[f.material] || 0) + f.amount;
  // Scavenge: more credits from what you bank.
  credits = Math.round(credits * (1 + gearStat(s, 'scavenge') / 100));
  s.server.credits += credits;
  const items = pack.filter((f) => f.kind === 'item').map((f) => f.item);
  // Banking loot feeds the server's level.
  const bankXp = Math.floor(credits / SERVER.xp.creditsPer) + SERVER.xp.item * (items.length + gear.length + sources.length + blueprints.length);
  s.signal = s.run.integrity;
  s.run = null;
  if (relocks(loc)) loc.lockUntil = clock() + ROGUE.relockMs;
  if (s.encounter?.mode === 'run') s.encounter = null;
  if (s.parked) { s.encounter = s.parked; s.parked = null; }
  if (s.gate && s.encounter?.phase !== 'alert') { s.encounter = s.gate; s.gate = null; }
  // The card: credits as one row (after Scavenge), everything else as it came.
  const banked = [...(credits ? [packGain({ kind: 'credits' }, credits)] : []), ...pack.filter((f) => f.kind !== 'credits' && f.kind !== 'code').map((f) => packGain(f)), ...Object.entries(code).map(([material, amount]) => packGain({ kind: 'code', material, amount }))];
  emit(s, 'jacked-out', `JACKED OUT of ${loc.name}. Banked: ${pack.length ? [credits ? credits + ' credits' : '', ...items, ...gear.map((f) => itemLabel(f.item)), ...Object.entries(code).map(([m, n]) => `${n} ${MATERIALS[m].name}`), ...sources.map((f) => sourceName(f.zeroDay) + ' source'), ...blueprints.map(() => 'a blueprint'), ...daemons.map(() => 'a daemon'), ...pack.filter((f) => f.kind === 'deeper').map(() => 'a trace record'), ...pack.filter((f) => f.kind === 'harvester').map((f) => harvesterName(f.harvester)), ...pack.filter((f) => f.kind === 'config').map((f) => CONFIGS[f.config].name + ' config source'), ...pack.filter((f) => f.kind === 'plan').map((f) => planName(f.plan)), ...pack.filter((f) => f.kind === 'filter').map((f) => f.filter.name), ...pack.filter((f) => f.kind === 'contract' || f.kind === 'route').map((f) => f.label)].filter(Boolean).join(', ') : 'nothing'}.`, { gains: banked });
  gainCode(s, code, 'Banked: ');
  for (const f of gear) addItem(s, f.item, 'Banked: ');
  for (const f of sources) {
    s.recipes ||= [];
    if (s.recipes.includes(f.zeroDay)) { for (let i = 0; i < 3; i++) s.salvage.push({ name: 'Source scraps', virus: loc.name, seed: loc.seed }); emit(s, 'info', `You already have ${sourceName(f.zeroDay)} source: +3 salvage.`); }
    else { s.recipes.push(f.zeroDay); emit(s, 'drop', ZERO_DAYS[f.zeroDay] ? `Source banked: you can compile ${ZERO_DAYS[f.zeroDay].name} at home (Craft page).` : `Source banked: you can install ${SERVICES[f.zeroDay].name} on your server (Server page).`, { recipe: f.zeroDay }); }
  }
  for (const f of pack.filter((x) => x.kind === 'harvester')) bankHarvester(s, f.harvester);
  for (const f of pack.filter((x) => x.kind === 'config')) bankConfig(s, f.config);
  for (const f of pack.filter((x) => x.kind === 'plan')) learnPlan(s, f.plan, 'Plan banked: ');
  for (const f of pack.filter((x) => x.kind === 'filter')) addFilter(s, f.filter, 'Filter banked: ');
  for (const f of blueprints) learnBlueprint(s, 'Blueprint banked: ');
  for (const f of daemons) learnDaemon(s, 'Daemon banked: ');
  for (const f of pack.filter((x) => x.kind === 'contract')) bankCargo(s, { name: f.name, label: f.label, loc: loc.id });
  gainServerXp(s, bankXp, 'loot banked');
  // A trace record moves the trace on one of this server's hidden neighbours (a flagged one
  // first, else the one it names): part of the way, not the server itself.
  for (const f of pack.filter((x) => x.kind === 'deeper')) {
    spawnHidden(s, loc);
    const near = hiddenNodes(s).filter((n) => n.via === loc.id);
    const n = near.find((x) => flagged(s, x)) || near.find((x) => x.family === f.family) || near[0];
    if (n) hiddenLead(s, n, routed(s, HIDDEN.recordLead), 'Trace record: ');
  }
  for (const f of pack.filter((x) => x.kind === 'route')) { bankRoute(s, f); if (loc.extraFiles) loc.extraFiles = loc.extraFiles.filter((x) => x.name !== f.name); }
}

// One entry point for everything the player types on the campaign.
// After a fight you win on a run: the folder you're in, listed again (what's left, one click away).
hooks.runWon = (s) => { if (s.run) ls(s); };

export function play(s, input) {
  const text = normalize(input);
  const [word, ...restWords] = text.split(' ');
  const rest = restWords.join(' ');
  if (word === 'connect') return connect(s, rest);
  if (word === 'crew') return crewCommand(s, rest); // simulated co-op (crew.mjs)
  if (word === 'consortium' || word === 'guild') return consortiumCommand(s, input.trim().replace(/^\S+\s*/, '')); // consortium.mjs (as typed: a name keeps its capitals)
  if (['online', 'who', 'friends', 'friend'].includes(word)) { const first = s.serial; presenceCommand(s, word, rest, emit, warn); return since(s, first); } // presence.mjs
  if (text === 'jack in' || text === 'defend') return jackIn(s);
  if (text === 'developer invade' || text === 'developer crash') return developerNetwork(s, text);
  if (text === 'developer station') { const first = s.serial; broadcast(s); return since(s, first); } // a numbers-station dead drop now
  const isRun = RUN_COMMANDS.includes(word) && !(word === 'jack' && rest !== 'out');
  if (!s.run || !isRun) return command(s, input);
  const first = s.serial;
  if (active(s)) {
    // Mid-fight, jack out is an emergency escape queued like any other command.
    if (word === 'jack') return command(s, 'jack out');
    warn(s, `${s.encounter.virus.name} is on you. Fight it first, or jack out.`);
    return since(s, first);
  }
  echo(s, text);
  if (word === 'ls' || word === 'look') ls(s, /(^| )-\w*a/.test(rest));
  else if (word === 'pwd') out(s, s.run.cwd);
  else if (word === 'history') s.run.history = true;
  else if (['split', 'link', 'goto', 'regroup', 'unlink'].includes(word)) crewMove(s, word, rest);
  else if (word === 'cd' || word === 'go') cd(s, rest);
  else if (word === 'cat') cat(s, rest);
  else if (word === 'pull') (rest === 'all' || rest === '*' ? pullAll(s) : pull(s, rest));
  else if (word === 'unlock') unlock(s, rest);
  else if (word === 'jack') jackOut(s);
  else if (word === 'tree') tree(s);
  else if (word === 'spoof') {
    if (!equipped(s, 'spoof')) err(s, 'spoof is an Infiltrator skill. Equip it on the Loadout page.');
    else if (!canCloak(s)) err(s, s.run.cloak === 'armed' ? 'Your spoof is already armed.' : 'No spoof left this run.');
    else { s.run.cloaks = (s.run.cloaks || 0) + 1; s.run.cloakPulled = false; s.run.cloak = 'armed'; out(s, 'spoof armed: the next guarded folder you enter won\'t start a fight.', 'net-good'); }
  }
  else if (word === 'slip') slip(s);
  else if (word === 'attack') attack(s, rest);
  else if (word === 'tap') tap(s);
  else if (word === 'boost') boost(s);
  else if (word === 'sweep') sweepCommand(s, currentLocation(s), rest);
  else if (word === 'pack') out(s, s.run.pack.length ? s.run.pack.map((f) => `${f.name.padEnd(14)} ${f.kind === 'credits' ? f.amount + ' credits' : f.kind === 'item' ? f.item : f.kind === 'gear' ? itemLabel(f.item) : f.kind === 'code' ? `${f.amount} ${MATERIALS[f.material].name}` : f.kind === 'source' ? sourceName(f.zeroDay) + ' source' : f.kind === 'blueprint' ? 'blueprint' : f.kind === 'daemon' ? 'daemon' : 'trace record (deeper node)'}`).concat('unbanked until you jack out.') : 'pack is empty.');
  else if (word === 'help') out(s, ['ls            what is here (ls -a shows hidden files)', 'cd <dir>      move (cd .. goes up)', 'cat <file>    read',
  'sweep <x>     answer an incident log (cat it first)', 'pull <file>   take it (banked when you jack out)', 'unlock <dir> <password>', 'tree          map of what you have seen', 'history       everything this run (the terminal shows one folder at a time)', 'pack          what you are carrying', 'jack out      go home', ...(equipped(s, 'spoof') ? ['spoof         slip past the next guard (once per run)'] : []), ...(classOf(s) === 'infiltrator' ? [`slip          walk past a guard without a fight (${slipsLeft(s)} left this run)`] : []), ...(equipped(s, 'tap') ? ['tap           show the whole map, guards and where the key is (once per run)'] : [])]);
  return since(s, first);
}

// ---------- the crew on a run (the crew strip) ----------
// Each crewmate has a folder. Linked to you, they follow you. Split, they look around on their own
// (crewWander). You can go to one, or link to one and follow them; regroup brings everyone back.
const crewList = (s) => Object.entries(s.run?.crew || {});
function crewMove(s, word, rest) {
  const crew = s.run.crew || {};
  const name = rest.trim();
  if (word === 'regroup') {
    if (!crewList(s).length) return err(s, 'No crew with you.');
    for (const c of Object.values(crew)) { c.cwd = s.run.cwd; c.link = 'you'; }
    s.run.linkedTo = null;
    return out(s, `${crewList(s).map(([n]) => n).join(' and ')} regroup${crewList(s).length === 1 ? 's' : ''} on you.`, 'net-good');
  }
  if (word === 'unlink') { if (s.run.linkedTo) { out(s, `Link to ${s.run.linkedTo} dropped.`); s.run.linkedTo = null; } return; }
  const all = name === 'all' && word === 'split';
  if (!all && !crew[name]) return err(s, `${name || '?'} isn't in your crew on this run.`);
  if (word === 'split') {
    for (const [n, c] of crewList(s)) if (all || n === name) c.link = null;
    return out(s, `${all ? 'The crew splits up' : `${name} splits off`} to look around.`);
  }
  if (word === 'goto') return crew[name].cwd === s.run.cwd ? out(s, `${name} is right here.`) : cd(s, crew[name].cwd);
  if (word === 'link') {
    s.run.linkedTo = name;
    crew[name].link = null; // they lead
    out(s, `Linked to ${name}: you follow where they go.`, 'net-good');
    if (crew[name].cwd !== s.run.cwd) cd(s, crew[name].cwd, name);
  }
}
// Split crewmates move on now and then (the app calls this every few seconds). One you're linked
// to pulls you along. They don't walk into a guard or a locked folder on their own.
export function crewWander(s) {
  if (!s.run || active(s) || s.encounter?.phase === 'alert') return [];
  const first = s.serial, loc = currentLocation(s), lay = layoutOf(loc);
  for (const [name, c] of crewList(s)) {
    if (c.link === 'you' || Math.random() < 0.4) continue;
    const here = lay[c.cwd] || lay['/'];
    const up = c.cwd === '/' ? [] : [c.cwd.slice(0, c.cwd.lastIndexOf('/')) || '/'];
    const down = (here.dirs || []).map((d) => join(c.cwd, d)).filter((p) => !guarded(loc, p) && !locked(loc, p) && !hiddenName(p.split('/').pop()));
    const options = [...down, ...down, ...up]; // a bias to go deeper
    if (!options.length) continue;
    c.cwd = options[Math.floor(Math.random() * options.length)];
    if (s.run.linkedTo === name) { out(s, `${name} pulls you to ${c.cwd}.`); cd(s, c.cwd, name); }
  }
  return since(s, first);
}
// Consortium members in this folder of the consortium's ground join a fight there (crew.mjs).
hooks.crewGuests = (s, room) => {
  const loc = currentLocation(s);
  if (!loc || !isGround(s, loc) || !simOn(s)) return [];
  return at(s, loc.id, room).map((x) => ({ cls: x.cls, name: x.handle, level: x.level }));
};

// The rogue server: attack the virus in this folder.
function attack(s, arg) {
  const loc = currentLocation(s);
  const proc = procIn(loc, s.run.cwd);
  if (proc) {
    if (arg && !proc.name.startsWith(arg.replace(/\.exe$/, ''))) return err(s, `No ${arg} here. This folder has ${proc.name}.exe.`);
    selectEncounter(s, 'random', proc.seed, { mode: 'run', room: s.run.cwd, level: proc.level, family: proc.family, zone: true, process: loc.id, name: proc.name.toUpperCase(), strain: proc.strain, grade: proc.grade });
    return command(s, 'engage');
  }
  if (!isWild(loc)) return err(s, 'Nothing here to attack. Guards start a fight when you walk in.');
  const sp = (loc.zone ? zoneSpawns(s) : rogueSpawns(s, loc))[s.run.cwd];
  if (!sp?.alive) return err(s, 'Nothing running in this folder. ls to look, cd to move.');
  if (arg && !sp.name.startsWith(arg.replace(/\.exe$/, ''))) return err(s, `No ${arg} here. This folder has ${sp.name}.exe.`);
  selectEncounter(s, 'random', sp.seed, { mode: 'run', room: s.run.cwd, level: sp.level, family: sp.family, zone: true, name: sp.bounty ? sp.name : sp.name.toUpperCase(), ...(loc.rogue ? { wild: loc.id, strain: sp.strain, grade: sp.grade, elite: sp.elite } : sp.grade ? { grade: sp.grade } : {}), ...(sp.calm ? { mutation: null } : {}) });
  command(s, 'engage');
}

// Infiltrator Tap: the whole map at once (once per run).
function tap(s) {
  const loc = currentLocation(s);
  if (!equipped(s, 'tap')) return err(s, 'tap is an Infiltrator skill. Equip it on the Loadout page.');
  if (onceUsed(s, 'tap')) return err(s, 'Tap is used up for this run.');
  s.run.used.tap = true;
  const lines = [];
  for (const [path, d] of Object.entries(layoutOf(loc))) {
    const tags = [d.guard ? (guarded(loc, path) ? `guard: ${GUARDS[d.guard].name.toUpperCase()}` : 'guard beaten') : '', d.locked ? (locked(loc, path) ? 'locked' : 'unlocked') : ''].filter(Boolean);
    const key = d.files.filter((f) => (fileInfo(loc, path, f).text || []).some((l) => l.includes(passDigits(loc)) || l.includes(passWord(loc))));
    lines.push(`${path}${tags.length ? '  [' + tags.join('] [') + ']' : ''}${key.length ? '  key in: ' + key.join(', ') : ''}`);
  }
  out(s, ['tap: full map of ' + loc.name, ...lines]);
}

function tree(s) {
  const loc = currentLocation(s);
  const lines = [];
  const walk = (path, depth) => {
    const seen = s.run.visited.includes(path);
    const tags = [guarded(loc, path) ? 'guarded' : '', locked(loc, path) ? 'locked' : ''].filter(Boolean);
    lines.push(`${'  '.repeat(depth)}${path === '/' ? '/' : path.split('/').pop() + '/'}${tags.length ? '  [' + tags.join('] [') + ']' : ''}${s.run.cwd === path ? '  <- you' : ''}${seen || path === '/' ? '' : '  (not visited)'}`);
    if (seen) for (const d of layoutOf(loc)[path].dirs) if (s.run.showHidden || !hiddenName(d) || s.run.visited.includes(join(path, d))) walk(join(path, d), depth + 1);
  };
  walk('/', 0);
  out(s, lines);
}

// The few actions that make sense right here, for the buttons under the prompt.
export function nextActions(s) {
  if (!s.run) return [];
  const loc = currentLocation(s);
  const here = layoutOf(loc)[s.run.cwd];
  if (s.encounter?.mode === 'run' && s.encounter.phase === 'alert') {
    return [{ label: `engage ${s.encounter.virus.name}`, cmd: 'engage', hot: true }, ...(slipsLeft(s) > 0 && !s.encounter.zone ? [{ label: 'slip past', cmd: 'slip', note: `${slipsLeft(s)} left` }] : []), { label: 'cd ..', cmd: 'cd ..', note: 'back off' }];
  }
  const acts = [];
  const proc = procIn(loc, s.run.cwd);
  if (proc) acts.push({ label: `attack ${proc.name}`, cmd: `attack ${proc.name}`, hot: true, note: proc.rare ? 'rare' : `lv ${proc.level}` });
  // A live virus in this folder (SPRAWL-00, a rogue server): the tray offers it first.
  const wild = isWild(loc) && (loc.zone ? zoneSpawns(s) : rogueSpawns(s, loc))[s.run.cwd];
  if (wild?.alive) acts.push({ label: `attack ${wild.name}`, cmd: `attack ${wild.name}`, hot: true, note: wild.elite ? 'crew' : `lv ${wild.level}` });
  const show = (n) => s.run.showHidden || !hiddenName(n);
  for (const f of here.files.filter(show)) {
    const full = join(s.run.cwd, f);
    const info = fileInfo(loc, s.run.cwd, f);
    const read = s.run.read?.includes(full);
    if (info.kind === 'sweep') { if (!loc.state.sweep?.solved) acts.push({ label: `cat ${f}`, cmd: `cat ${f}`, note: 'who broke in?' }); }
    else if (info.kind === 'trap') { if (!read && !loc.state.sprung?.[full]) acts.push({ label: `pull ${f}`, cmd: `pull ${f}`, hot: true }); }
    else if (info.kind !== 'text' && !loc.state.taken[full] && !inPack(s, full)) acts.push({ label: `pull ${f}`, cmd: `pull ${f}`, hot: true });
    else if (info.kind === 'text' && !read) acts.push({ label: `cat ${f}`, cmd: `cat ${f}` });
  }
  // Two or more files to take: one button for all of them, first.
  if (acts.filter((a) => a.cmd?.startsWith('pull ')).length >= 2) acts.unshift({ label: 'pull all', cmd: 'pull all', hot: true, note: `${acts.filter((a) => a.cmd?.startsWith('pull ')).length} files` });

  for (const d of here.dirs.filter(show)) {
    const full = join(s.run.cwd, d);
    if (locked(loc, full)) acts.push({ label: `unlock ${d} …`, prefill: `unlock ${d} `, note: 'needs a password' });
    else acts.push({ label: `cd ${d}`, cmd: `cd ${d}`, note: guarded(loc, full) ? 'guarded' : s.run.visited.includes(full) ? 'visited' : '' });
    if (guarded(loc, full) && canCloak(s)) acts.push({ label: 'spoof', cmd: 'spoof', note: 'sneak past once' });
  }
  if (equipped(s, 'tap') && !onceUsed(s, 'tap')) acts.push({ label: 'tap', cmd: 'tap', note: 'map it all' });
  if (s.run.cwd !== '/') acts.push({ label: 'cd ..', cmd: 'cd ..' });
  if (s.items?.booster && s.run.integrity < s.run.max) acts.push({ label: 'boost', cmd: 'boost', note: `+Signal · ${s.items.booster}`, hot: s.run.integrity < s.run.max * 0.3 });
  acts.push({ label: 'jack out', cmd: 'jack out', note: s.run.pack.length ? `bank ${s.run.pack.length}` : '' });
  return acts;
}

export function runSuggestions(s, input) {
  const text = input.toLowerCase().trimStart();
  const loc = currentLocation(s);
  const here = layoutOf(loc)[s.run.cwd];
  const [word, arg = ''] = text.split(/ (.*)/);
  if (text.includes(' ')) {
    if (word === 'cd') return ['..', ...here.dirs].filter((d) => d.startsWith(arg)).map((d) => 'cd ' + d);
    if (word === 'cat') return here.files.filter((f) => f.startsWith(arg)).map((f) => 'cat ' + f);
    if (word === 'pull') return [...('all'.startsWith(arg) && pullable(s, loc).length >= 2 ? ['pull all'] : []), ...here.files.filter((f) => fileInfo(loc, s.run.cwd, f).kind !== 'text' && f.startsWith(arg)).map((f) => 'pull ' + f)];
    if (word === 'ls') return ['-a'].filter((f) => f.startsWith(arg)).map((f) => 'ls ' + f);
    if (word === 'unlock') return here.dirs.filter((d) => locked(loc, join(s.run.cwd, d)) && d.startsWith(arg)).map((d) => `unlock ${d} `);
    return [];
  }
  return ['history', 'ls', 'ls -a', 'cd ', 'cat ', ...(canCloak(s) ? ['spoof'] : []), ...(equipped(s, 'tap') ? ['tap'] : []), ...(slipsLeft(s) > 0 ? ['slip'] : []), 'pull ', 'unlock ', 'jack out', 'tree', 'pack', 'help', 'engage'].filter((c) => c.startsWith(text));
}

export { guarded, locked };

// Emergency jack out from inside a guard fight (typed, or the wimpy daemon).
// A server's open folders, for who's where on the consortium's ground (presence.mjs).
hooks.foldersOf = (l) => Object.keys(layoutOf(l)).filter((p) => p !== '/' && !layoutOf(l)[p].locked);
hooks.jackOut = (s) => jackOut(s); // Deadman's Switch (combat.mjs)
hooks.flee = (s) => {
  if (!s.run) return;
  s.encounter.phase = 'fled';
  jackOut(s);
};

// Where a log rotation can put its process (root.mjs): any open folder but the root, the vault and /root.
hooks.procRooms = (loc) => Object.entries(layoutOf(loc)).filter(([d, x]) => d !== '/' && !x.locked && d !== STASH_DIR && !(x.guard && !loc.state?.cleared?.[d])).map(([d]) => d);
