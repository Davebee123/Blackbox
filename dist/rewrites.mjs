// Rewrites (docs/roguelite.md 3): each subsystem you clear on a breach is rewritten. Pick 1 of 2. Its Now half
// applies for the rest of this breach; its Output is what the server does for you once it's captured (phase 0
// shows it on the capture card; the campaign, campaign.mjs, runs it on later breaches). Tier I from a virus, tier II from an
// elite or from clearing the same subsystem twice.
//
// Phase 0's server, MERIDIAN-MX-14 (a Mailhub, TOLLGATE's), runs six subsystems, two an act.
export const SUBSYSTEMS = {
  smtpd: { act: 0, rewrites: ['maildrop', 'spamcannon'], about: 'the mail daemon' },
  sshd: { act: 0, rewrites: ['jumphost', 'forgedkeys'], about: 'remote logins' },
  cron: { act: 1, rewrites: ['warmstart', 'nightlybuild'], about: 'scheduled jobs' },
  ledger: { act: 1, rewrites: ['pricefix', 'slushfund'], about: 'the accounts' },
  backup: { act: 2, rewrites: ['restorepoint', 'archive'], about: 'snapshots' },
  kmod: { act: 2, rewrites: ['kernelhook', 'memorymap'], about: 'kernel modules' },
};
// output: [tier I, tier II], in tooltip grammar. now: what it does this breach. apply(b, s): the Now, on the breach
// state (breach.mjs reads b.fx); a returned string is a screen to show next ('cve' or 'mod': a draft of those).
export const REWRITES = {
  maildrop: { sub: 'smtpd', name: 'Mail Drop', output: ['Drops 1 more protocol, blue or better, each time you capture a server.', 'Drops 1 more protocol, yellow, each time you capture a server.'], now: 'Grants you 30 tokens.', apply: (b) => { b.tokens += 30; } },
  spamcannon: { sub: 'smtpd', name: 'Spam Cannon', output: ['Viruses on servers linked to it start with 15% less Integrity.', 'Viruses on servers linked to it start with 25% less Integrity.'], now: 'The act 1 gate starts with 10% less Integrity.', apply: (b) => { b.fx.gateHp = Math.min(b.fx.gateHp ?? 1, 0.9); } },
  jumphost: { sub: 'sshd', name: 'Jump Host', output: ['You can breach servers two links past this one, before they are revealed.', 'You can breach servers three links past this one, before they are revealed.'], now: 'Your next move can go to any node in the next row.', apply: (b) => { b.fx.jump = (b.fx.jump || 0) + 1; } },
  forgedkeys: { sub: 'sshd', name: 'Forged Keys', output: ['Every breach starts with a pick of 1 of 3 CVEs.', 'Every breach starts with a pick of 1 of 3 CVEs, with rare odds doubled.'], now: 'Drafts 1 of 3 CVEs now.', apply: () => 'cve' },
  warmstart: { sub: 'cron', name: 'Warm Start', output: ['Every fight on a breach starts with every virus attack 1 cycle later.', 'Every fight on a breach starts with every virus attack 1 cycle later, and your SIGINT ready.'], now: 'Every fight on this breach starts with every virus attack 1 cycle later.', apply: (b) => { b.fx.warm = true; } },
  nightlybuild: { sub: 'cron', name: 'Nightly Build', output: ['Gives you 1 more draft reroll each act.', 'Gives you 2 more draft rerolls each act.'], now: 'Gives you 2 draft rerolls now.', apply: (b) => { b.rerolls += 2; } },
  pricefix: { sub: 'ledger', name: 'Price Fix', output: ['Brokers charge 25% less.', 'Brokers charge 40% less.'], now: 'The next broker charges half price.', apply: (b) => { b.fx.halfPrice = true; } },
  slushfund: { sub: 'ledger', name: 'Slush Fund', output: ['Every breach starts with 40 tokens.', 'Every breach starts with 80 tokens.'], now: 'Grants you 40 tokens.', apply: (b) => { b.tokens += 40; } },
  restorepoint: { sub: 'backup', name: 'Restore Point', output: ['Once per breach, when your Signal would drop to 0, it drops to 1 and you restore 25%.', 'Once per breach, when your Signal would drop to 0, it drops to 1 and you restore 40%.'], now: 'Restores 25% of your Signal.', apply: (b) => { b.signal = Math.min(b.max, b.signal + Math.round(b.max * 0.25)); } },
  archive: { sub: 'backup', name: 'Archive', output: ['At the start of each breach, drafts 1 of the mods you ended your last breach with.', 'At the start of each breach, drafts 2 of the mods you ended your last breach with.'], now: 'Drafts 1 of 3 mods now.', apply: () => 'mod' },
  kernelhook: { sub: 'kmod', name: 'Kernel Hook', output: ['Drafts offer 4 cards.', "Drafts offer 4 cards, gates' drafts too."], now: 'Drafts offer 4 cards for the rest of this breach.', apply: (b) => { b.fx.kernelHook = true; } },
  memorymap: { sub: 'kmod', name: 'Memory Map', output: ['Increases your max Signal by 10% on breaches.', 'Increases your max Signal by 15% on breaches.'], now: 'Increases your max Signal by 10% for the rest of this breach.', apply: (b) => { b.fx.memory = 0.1; const add = Math.round(b.max * 0.1); b.max += add; b.signal += add; } },
};
for (const [id, r] of Object.entries(REWRITES)) r.id = id;
// The capture card's line for a subsystem: its rewrite and output at its tier, or stock.
export function outputLine(sub, held) {
  const r = held && REWRITES[held.id];
  return r ? { sub, name: r.name + (held.tier > 1 ? ' II' : ''), text: r.output[Math.min(1, held.tier - 1)] } : { sub, name: 'stock', text: 'Not rewritten. It does nothing for you.' };
}
