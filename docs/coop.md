# Co-op, peer to peer (feasibility prototype)

The question: can two players share a run and its fights with no server, each keeping their own save? This is the
smallest real thing that answers it. Developer mode only (`?dev`, or a test bench), behind the `coop` command and the
Co-op card on Settings → Dev. A visible entry would read as a finished feature; it is not one yet. GAME_RULES.md
(Co-op, peer to peer) has the rules.

## Try it

- **Two tabs, one browser:** open `/?bench=a&as=demolitionist&level=10` and `/?bench=b&as=sysop&level=10`, type
  `coop host` in the first and `coop join <code>` in the second (the room code shows in the Co-op panel).
- **Two machines:** `coop` opens the panel. The host clicks *Make invite code* and sends it; the guest pastes it,
  clicks *Make reply code* and sends that back; the host pastes it and clicks *Connect*.
- Then the host connects to a server and the guest follows. Out of a run, `coop swap` (*Go to <name>'s network*) makes
  the guest the host. Tests: coop.test.mjs (links, handshake), coop-fight.test.mjs, coop-run.test.mjs.

## Shape

- **Host-authoritative.** The inviter hosts. Their browser runs the session's world: their network, their run, every
  fight's simulation. The guest's browser sends commands and draws what the host sends.
- **Saves stay apart.** On join the guest sends their **character** (`coop-char.mjs characterOf`): handle, class,
  subclass, level, loadout (bar, talents, presets), the protocols loaded for that class, daemons and their levels,
  routines, part research. The host seats it as a crewmate in place of a sim bot (crew.mjs plays a crewmate as a full
  player state). The seat lives off the host's save (`s._coop`, not enumerable), so nothing of the guest's is ever
  written to the host's save.
- **Rewards** are rolled and applied by the guest's own game, on the guest's own save, from what the host sends: the
  kill (level, family, elite, boss, party size, XP base) and each cache the party takes. The guest's XP is the party
  share at the guest's own level; drops and code roll on the guest's own dice. Neither game touches the other's save.

## What is shared

| Shared | Not shared |
|---|---|
| The run: which server, which room. The host moves the party; the guest follows | Home, market, mail |
| Fights: both act every cycle | Loadout: edited on the guest's own save out of a fight, then re-sent |

**Rooms.** The host leads: moving, doors, keys, vaults, puzzles, rests and caches are the host's. A cache or stash the
host takes drops a share for the guest too: credits and code of a cache's size, rolled on the guest's dice. A rest
heals the guest's Signal by the same share as the host's. Walking costs only the host's Signal. A vault's files go in
the host's pack.

## Perspective

The views draw "you" as the save's owner. The guest's game builds a **view state** from each host snapshot
(`coop.mjs viewOf`): a shallow copy of the guest's own save (settings, stash, bar, research, handle) with the host's
world put in: the run, its server, and the fight, where the encounter is the guest's own crewmate encounter (queue,
cooldowns, buffs) on the host's virus and clock. The other players come back as crewmates (`s._coopMates`): the host
under their handle, plus any bots. Log lines are remapped: the guest's own lines lose their name, the host's gain
theirs. The page swaps its live state for the view state while the host is on a run, and saves the real save, never
the view. One pure remap leaves the view functions alone, and Node tests can check it directly.

## Cycles with two humans

A cycle resolves when every human in the fight has a command queued, or when the cycle timer runs out. A human with
no command falls back as the timer does solo: their routine (if on), else auto-repeat. Turn order is unchanged
(strippers first; ties: the host, then the crew).

## Disconnects

- The guest drops (closed, or 10 seconds silent): their crewmate turns bot (the planner plays it) for the rest of the
  fight, then leaves.
- The host drops: the guest's game drops the view and goes home with a short message. Rewards already applied stay.
- No reconnect in the prototype.

## Visiting each other's networks

"Go to <guest>'s network" swaps host, only out of a run. The old guest's game becomes the host (their network, their
servers), the old host joins as their guest.

## Transport

`coop-net.mjs`, one small interface (a link: `send`, `close`, `onmessage`, `onclose`):
- **In memory** for Node tests.
- **BroadcastChannel**: two tabs in one browser, a 6-letter room code.
- **WebRTC data channel**, signalled by copy and paste: the invite code is the host's offer (deflated, base64url), the
  guest pastes it and gets a reply code, the host pastes that. Public STUN only (`stun:stun.l.google.com:19302`); some
  networks (symmetric NAT, strict firewalls) need a TURN relay, which needs a server.

Only game state and the character cross the wire. No email, no account, nothing else of the save.

## Later: friends between sessions

No hosted world: authority stays in the host's browser. Between sessions, friends reach each other through **records**
(docs/runners.md *Friends*): each player posts their own, peer to peer or through a small mailbox, and a friend shows
up in your world as a runner. The same mailbox can hand out room codes and a TURN relay, so invites stop being copy and
paste. Reconnects come from a host-side checkpoint of the run. Rewards between friends stay trusted.

**What records are for** (proposed, November 2026). A seed matters only if friends want what's on it; build legends
give it that (docs/legends.md).

- **Visits.** A friend connects to your network from your record while you're away (a member's servers, made real) and
  farms its lair for its legends. Each server they trace there comes back to you as a lead, with a letter.
- **Hires.** Your character joins their Runners list; the planner plays your loadout and routines. Their fight log
  comes back: what your build beat, what killed it. No XP or loot: nothing runs while you're away.
- **The ladder.** Your record carries your deepest flash rank and the build that cleared it (*nyx, rank 7, Warden with
  Stress Test*), so friends see a ladder that names whose network a legend drops on.
- **Remnants by fight.** Places come from each player's seed, so a remnant keys to a fight: a friend's crash against
  CAMSWARM leaves a dead runner room in your CAMSWARM lair, with their rig and last log, never the routine that won.
- **Live co-op's payoff:** crossover lairs (docs/networks.md).
- **Trading:** later (docs/legends.md).
