// Guild: a lasting group you lead (simulated members until there's a server). Its members can be
// invited into your crew, and it holds territory: servers you've taken over or rogue servers you
// claim for it. Guild territory is shared ground: guildmates turn up in its folders (presence.mjs),
// and a fight in a folder they're in, they join (crew.mjs guests). Nowhere else is shared, so
// nobody outside the guild can take your kills.
export const GUILD = { max: 50, nameMax: 24 };

export const guildOf = (s) => s.guild || null;
export const isGuildmate = (s, h) => !!s.guild?.members?.includes(h);
export const territory = (s) => s.guild?.territory || [];
export const isTerritory = (s, loc) => !!loc && territory(s).some((t) => t.id === loc.id);

// `guild`, `guild create <name>`, `guild invite <handle>`, `guild kick <handle>`, `guild leave`,
// `guild claim <server>`, `guild unclaim <server>`. folders(loc) lists a server's folders (run.mjs).
export function guildCommand(s, rest, { emit, warn, pool, findLoc, folders }) {
  const [verbRaw = '', ...more] = rest.split(' ').filter(Boolean);
  const verb = verbRaw.toLowerCase();
  const arg = verb === 'create' ? more.join(' ') : more.join(' ').toLowerCase(); // only a name keeps its case
  const g = guildOf(s);
  if (!verb) {
    if (!g) return emit(s, 'info', 'No guild. guild create <name>');
    return emit(s, 'info', `${g.name}: ${g.members.length + 1} members (${['you', ...g.members].join(', ')}). Territory: ${g.territory.length ? g.territory.map((t) => t.name).join(', ') : 'none (guild claim <server>)'}.`);
  }
  if (verb === 'create') {
    if (g) return warn(s, `You're already in ${g.name}. guild leave first.`);
    const name = arg.trim().slice(0, GUILD.nameMax);
    if (!name) return warn(s, 'guild create <name>');
    s.guild = { name, members: [], territory: [] };
    return emit(s, 'info', `Guild ${name} founded. Invite people from the people panel, or guild invite <handle>.`);
  }
  if (!g) return warn(s, 'No guild. guild create <name>');
  if (verb === 'leave') { s.guild = null; return emit(s, 'info', `You left ${g.name}. It's gone (you led it).`); }
  if (verb === 'invite') {
    if (!pool.includes(arg)) return warn(s, `No hacker called ${arg}.`);
    if (g.members.includes(arg)) return warn(s, `${arg} is already in ${g.name}.`);
    if (g.members.length + 1 >= GUILD.max) return warn(s, `${g.name} is full.`);
    g.members.push(arg);
    return emit(s, 'info', `${arg} joins ${g.name}.`); // simulated: everyone says yes
  }
  if (verb === 'kick') {
    if (!g.members.includes(arg)) return warn(s, `${arg} isn't in ${g.name}.`);
    g.members = g.members.filter((x) => x !== arg);
    return emit(s, 'info', `${arg} is out of ${g.name}.`);
  }
  if (verb === 'claim' || verb === 'unclaim') {
    const loc = findLoc(arg);
    if (!loc) return warn(s, `No server called "${arg}". (On a run, guild claim with no name claims this one.)`);
    if (verb === 'unclaim') {
      if (!isTerritory(s, loc)) return warn(s, `${loc.name} isn't ${g.name}'s.`);
      g.territory = g.territory.filter((t) => t.id !== loc.id);
      return emit(s, 'info', `${loc.name} is yours alone again.`);
    }
    if (isTerritory(s, loc)) return warn(s, `${loc.name} is already ${g.name}'s.`);
    if (!loc.takenOver && !loc.rogue) return warn(s, `Only a server you've taken over, or a rogue server, can be guild territory.`);
    g.territory.push({ id: loc.id, name: loc.name, folders: folders(loc) });
    return emit(s, 'info', `${loc.name} is now ${g.name} territory: guildmates come and go there, and join fights in the folder they're in.`, { location: loc.id });
  }
  return warn(s, 'guild, guild create <name>, guild invite <handle>, guild kick <handle>, guild leave, guild claim <server>, guild unclaim <server>');
}
