// Rewrites (docs/roguelite.md 3, 11): each subsystem you clear on a breach is rewritten. Pick 1 of 2 or 3. A rewrite
// has no effect on the breach you pick it in: it is what the server does for you once it's captured, its Output (the
// capture card shows it; the campaign, campaign.mjs, runs it on later breaches). Tier I from a virus, tier II from an
// elite or from clearing the same subsystem twice.
//
// Phase 0's server, MERIDIAN-MX-14 (a Mailhub, TOLLGATE's), runs six subsystems, two an act. Phase 3 adds dns (a
// Relay's), syslog (a Mirror's) and sandbox (a Lab's), and a third rewrite to sshd and ledger: 20 rewrites over nine
// subsystems. A subsystem with three offers all three.
export const SUBSYSTEMS = {
  smtpd: { act: 0, rewrites: ['maildrop', 'spamcannon'], about: 'the mail daemon' },
  sshd: { act: 0, rewrites: ['jumphost', 'forgedkeys', 'serviceaccount'], about: 'remote logins' },
  dns: { act: 0, rewrites: ['zonetransfer', 'sinkhole'], about: 'name lookups' },
  cron: { act: 1, rewrites: ['warmstart', 'nightlybuild'], about: 'scheduled jobs' },
  ledger: { act: 1, rewrites: ['pricefix', 'slushfund', 'bountyboard'], about: 'the accounts' },
  syslog: { act: 1, rewrites: ['audittrail', 'listeningpost'], about: 'the logs' },
  backup: { act: 2, rewrites: ['restorepoint', 'archive'], about: 'snapshots' },
  kmod: { act: 2, rewrites: ['kernelhook', 'memorymap'], about: 'kernel modules' },
  sandbox: { act: 2, rewrites: ['testbed', 'range'], about: 'the malware cage' },
};
// Rewrites that act on the servers linked to their own (campaign.mjs outputsFor), not on every breach.
export const LINKED = ['spamcannon', 'sinkhole', 'testbed'];
// output: [tier I, tier II], in tooltip grammar. breach.mjs (applyOutputs) and campaign.mjs read them.
export const REWRITES = {
  maildrop: { sub: 'smtpd', name: 'Mail Drop', output: ['Mails you a script each time you capture a server.', 'Mails you an uncommon or rare script each time you capture a server.'] },
  spamcannon: { sub: 'smtpd', name: 'Spam Cannon', output: ['Viruses on servers linked to it start with 15% less Integrity.', 'Viruses on servers linked to it start with 25% less Integrity.'] },
  jumphost: { sub: 'sshd', name: 'Jump Host', output: ['You can breach servers two links past this one, before they are revealed.', 'You can breach servers three links past this one, before they are revealed.'] },
  forgedkeys: { sub: 'sshd', name: 'Forged Keys', output: ['Every breach starts with a keycard.', 'Every breach starts with 2 keycards.'] },
  warmstart: { sub: 'cron', name: 'Warm Start', output: ['Every fight on a breach starts with every virus attack 1 cycle later.', 'Every fight on a breach starts with every virus attack 1 cycle later, and your SIGINT ready.'] },
  nightlybuild: { sub: 'cron', name: 'Nightly Build', output: ['Lowers your Trace by 15 at every gate on breaches.', 'Lowers your Trace by 30 at every gate on breaches.'] },
  pricefix: { sub: 'ledger', name: 'Price Fix', output: ['Brokers charge 25% less.', 'Brokers charge 40% less.'] },
  slushfund: { sub: 'ledger', name: 'Slush Fund', output: ['Every breach starts with 40 tokens.', 'Every breach starts with 80 tokens.'] },
  restorepoint: { sub: 'backup', name: 'Restore Point', output: ['Once per breach, when your Signal would drop to 0, it drops to 1 and you restore 25%.', 'Once per breach, when your Signal would drop to 0, it drops to 1 and you restore 40%.'] },
  archive: { sub: 'backup', name: 'Archive', output: ['Gives you 1 more script slot.', 'Gives you 2 more script slots.'] },
  kernelhook: { sub: 'kmod', name: 'Kernel Hook', output: ['The Resident starts with 1 ◆ less on every part on breaches.', 'The Resident starts with 1 ◆ less on every part and 10% less Integrity on breaches.'] },
  memorymap: { sub: 'kmod', name: 'Memory Map', output: ['Increases your max Signal by 10% on breaches.', 'Increases your max Signal by 15% on breaches.'] },
  // Phase 3.
  serviceaccount: { sub: 'sshd', name: 'Service Account', output: ['Lets you jack out at any defrag on a breach, keeping your pack.', 'Lets you jack out at any defrag on a breach, keeping your pack, and banks your pack at every elite.'] },
  zonetransfer: { sub: 'dns', name: 'Zone Transfer', output: ['You read 1 row further on breaches.', 'You read 2 rows further on breaches.'] },
  sinkhole: { sub: 'dns', name: 'Sinkhole', output: ['Viruses on servers linked to it roll only genes you have decoded.', 'Viruses on servers linked to it roll only genes you have decoded, with 1 budget point less.'] },
  bountyboard: { sub: 'ledger', name: 'Bounty Board', output: ['Server cards post 1 more bounty.', 'Server cards post 1 more bounty, and a met bounty pays twice.'] },
  audittrail: { sub: 'syslog', name: 'Audit Trail', output: ['Node cards on breaches name every gene and its rule, decoded or not.', 'Node cards on breaches name every gene and its rule, decoded or not, and show each virus\'s tells.'] },
  listeningpost: { sub: 'syslog', name: 'Listening Post', output: ['Residents drop their uniques 50% more often on breaches.', 'Residents drop their uniques twice as often on breaches.'] },
  testbed: { sub: 'sandbox', name: 'Testbed', output: ['Viruses on servers linked to it roll 1 more gene point, and gear on their breaches drops 2 levels higher.', 'Viruses on servers linked to it roll 1 more gene point, and gear on their breaches drops 3 levels higher.'] },
  range: { sub: 'sandbox', name: 'Range', output: ['This server\'s card offers Replay: its Resident alone, for its loot. Each breach you win earns a replay, up to 3.', 'This server\'s card offers Replay: its Resident alone, for its loot. Each breach you win earns a replay, up to 5.'] },
};
for (const [id, r] of Object.entries(REWRITES)) r.id = id;
// The capture card's line for a subsystem: its rewrite and output at its tier, or stock.
export function outputLine(sub, held) {
  const r = held && REWRITES[held.id];
  return r ? { sub, name: r.name + (held.tier > 1 ? ' II' : ''), text: r.output[Math.min(1, held.tier - 1)] } : { sub, name: 'stock', text: 'Not rewritten. It does nothing for you.' };
}
