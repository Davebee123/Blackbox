// A player's character for co-op (docs/coop.md): what a guest sends the host on join, and what the host sends back
// about itself so the guest can draw it as a crewmate. Only what a fight reads: class, levels, loadout (bar, talents,
// presets, subclass), the protocols loaded for the class, daemons, routines and part research. Nothing personal: the
// handle is the only name in it.
import { fresh, classOf, hackerLevel, loaded, rigOf, bindRooms } from './combat.mjs';
import { handleOf } from './profile.mjs';

export const CHAR_V = 1;
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

export function characterOf(s) {
  const cls = classOf(s);
  const items = loaded(s, cls);
  return {
    v: CHAR_V,
    name: handleOf(s),
    cls,
    level: hackerLevel(s, cls),
    hackers: clone(s.hackers || {}),
    loadout: clone(s.loadout),
    stash: clone(items),
    rig: rigOf(s, cls).slice(),
    daemons: clone(s.daemons || []),
    daemonLv: clone(s.daemonLv || {}),
    programs: clone(s.programs || null),
    research: clone(s.research || {}),
    geneCodex: clone(s.geneCodex || {}),
    met: clone(s.met || {}),
    metAll: !!s.metAll,
  };
}

// A full player state from a character: what the host fights beside, and what the guest's screen draws for each
// other player. Its own log and Signal are set by whoever seats it.
export function playerFrom(char) {
  const m = fresh();
  m.profile = { handle: char.name };
  m.hackers = clone(char.hackers) || { [char.cls]: { level: char.level, xp: 0 } };
  m.hackers[char.cls] ||= { level: char.level, xp: 0 };
  m.loadout = clone(char.loadout) || m.loadout;
  m.loadout.archetype = char.cls;
  m.stash = clone(char.stash) || [];
  m.gear = { rigs: { [char.cls]: (char.rig || []).slice() } };
  m.nextItem = 1 + Math.max(0, ...m.stash.map((it) => Number(String(it.id).replace(/\D/g, '')) || 0));
  m.daemons = clone(char.daemons) || [];
  m.daemonLv = clone(char.daemonLv) || {};
  if (char.programs) m.programs = clone(char.programs);
  m.research = clone(char.research) || {};
  m.geneCodex = clone(char.geneCodex) || {};
  m.met = clone(char.met) || {};
  if (char.metAll) m.metAll = true;
  m.tutorialCompleted = true;
  return bindRooms(m);
}

// A short line for the roster: "nyx, Sysop 12".
export const charLine = (c, name = (k) => k) => `${c.name}, ${name(c)} ${c.level}`;
