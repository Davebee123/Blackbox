// Who writes the viruses (docs/genome.md section 4). Viruses are written, not grown: a crew builds one to take a
// server, with the tools it knows. Data with no imports; data.mjs gives every virus its author.
//
// An author:
//   name, faction  how it signs (the byline: WARDED CRYPTJACK-4821 v2 · TOLLGATE), and its faction in factions.mjs
//   crew           the family it writes as a crew (the three family crews the contract mail names, mail.mjs CREWS)
//   colour, style  its colour, and the sentence the scan card says about it
//   signature      its signature genes (genes.mjs), weighted three to one over the rest of its toolkit
//   toolkit        the rest of what it writes with (phase 3 rolls from these; some are genes phase 3 brings)
//   builds         today's strains it wrote (named builds: data.mjs STRAINS) and the guards it fields
//   bosses         the bosses it wrote (data.mjs BOSSES)
// Today the byline goes on: a family virus (its crew), a strain (its build's author), ICE and the Sentinel
// (Kestrel), a faction's server (that faction), a guard (its server's), and a boss (its author). SPRAWL-00's
// strays are nobody's. Sectors, rosters and ACTUARY's portfolio come in phases 3 and 5.
export const AUTHORS = {
  tollgate: { name: 'TOLLGATE', crew: 'ransomware', colour: '#ff9f43', style: 'TOLLGATE builds with locks and leverage. Everything is behind something, and something is on a clock.',
    signature: ['ward', 'mutexlock', 'deadline', 'rage', 'ransomtimer'], toolkit: ['tripwire', 'zipbomb', 'exfiltrate', 'ratecap', 'armored'], builds: ['extortion', 'bricker'], bosses: ['repoman', 'nb-deadbolt', 'nb-tripmine'] },
  swarmline: { name: 'SWARMLINE', crew: 'worm', colour: '#7bd389', style: 'SWARMLINE builds with numbers and spares. Whatever you break comes back or brings friends.',
    signature: ['twin', 'floodramp', 'mend', 'hotspare'], toolkit: ['c2', 'hivebrood', 'siphon', 'loadbalancer', 'botnetrecruit', 'antivirussweep', 'fork', 'regenerative', 'hasty'], builds: ['floodgate', 'leech', 'patchwork', 'overrun'], bosses: ['relayking', 'nb-backorifice', 'nb-patchday', 'nb-floodwall'] },
  palemask: { name: 'PALEMASK', crew: 'ghostroot', colour: '#b8a6ff', style: 'PALEMASK builds with misdirection, so you never quite see where the hit comes from.',
    signature: ['veil', 'decoymirror', 'phaseshift', 'echo', 'dormant'], toolkit: ['frontend', 'honeypot'], builds: ['sleeper', 'flicker', 'echo'], bosses: ['nb-sleepwalker', 'nb-echolalia'] },
  nullchoir: { name: 'NULL CHOIR', faction: 'nullchoir', colour: '#ff6f91', style: 'NULL CHOIR builds with rhythm and mockery. It copies you and makes you keep time.',
    signature: ['mimic', 'synclock', 'keystrokedump'], toolkit: ['veil', 'clockglitch', 'handshake', 'stateless', 'adaptive'], builds: ['keylogger'], bosses: ['choir', 'nb-mirrorshade'] },
  glassjaw: { name: 'GLASSJAW', faction: 'glassjaw', colour: '#e07bd0', style: 'GLASSJAW sells professional denial. It taxes your tools and blocks your favourites.',
    signature: ['cycletax', 'synflood', 'acl'], toolkit: ['exfiltrate', 'badsectors', 'stateless', 'ratecap', 'loadbalancer', 'watchdogtimer', 'hasty'], builds: ['hashrat'], bosses: ['nb-hashlord'] },
  lantern: { name: 'LANTERN', faction: 'lantern', colour: '#ffb347', style: 'LANTERN listens. Its builds bait you and hide their hand.',
    signature: ['honeypot', 'packed'], toolkit: ['keystrokedump', 'handshake', 'veil'], builds: [], bosses: [] },
  kestrel: { name: 'Kestrel', faction: 'kestrel', colour: '#8fd46b', style: 'Kestrel defends the door, and it writes the ICE that guards it.',
    signature: ['keyring', 'escalation', 'watchdogtimer'], toolkit: ['veil', 'batteringram'], builds: ['bouncer', 'tracer', 'sentinel'], bosses: [] },
  actuary: { name: 'ACTUARY', faction: 'halcyon', colour: '#6fb6ff', style: 'ACTUARY prices you, then raises the premium on what you\'re good at.', signature: [], toolkit: [], builds: [], bosses: [], later: true }, // phase 5
};
for (const [id, a] of Object.entries(AUTHORS)) a.id = id;
// The crew that writes a family's plain viruses.
export const crewOf = (family) => Object.keys(AUTHORS).find((id) => AUTHORS[id].crew === family) || null;
// The author of a named build (a strain) or a guard, if it has one of its own.
export const buildAuthor = (build) => Object.keys(AUTHORS).find((id) => AUTHORS[id].builds.includes(build)) || null;
export const bossAuthor = (boss) => Object.keys(AUTHORS).find((id) => AUTHORS[id].bosses.includes(boss)) || null;
// A faction's server: the faction writes what runs there, if it writes viruses at all.
export const factionAuthor = (faction) => Object.keys(AUTHORS).find((id) => AUTHORS[id].faction === faction && !AUTHORS[id].later) || null;
