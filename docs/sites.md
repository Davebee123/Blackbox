# Quest sites: places the director mounts

**Status.** Prototyped and picked with the designer (November 2026), not built. RimWorld's quest sites and Starsector's
derelicts: the floor keeps its fixed servers, and short-lived places turn up at their edges.

## The rule

- **The director deals a site** (docs/director.md): a temporary server mounted on your floor, beside a server you've
  located. About one an hour of logged-on time, one up at a time, on the director's dice. It takes its place's level.
  Built on threads' temporary servers (threads.mjs `spawnTemp`).
- **The look is the *Temporary frame*** (picked over a docked rack and a chart fix): threads' hexagon in the director's
  violet, a ring of the time left, a dashed link to the server it hangs off. Its card is an event card's shell.
- **One goal pays the site.** Its fights pay as usual on the way. Missing one costs nothing; a site you're on when it
  closes sends you home with your pack banked.
- **Gear is the main reward everywhere.** A site's fights and its goal drop gear at the usual odds. On top, each site
  pays **its own thing** (what you'd go there for) and, where the lore names an owner, **fixed standing**. No site pays
  a share of everything: XP comes from its fights, as anywhere.

## The three

| Site | Who | Clock | Goal | Pays | Standing |
|---|---|---|---|---|---|
| **Rack pull** · `KESSLER-RACK-nn` | Kestrel, which owns Kessler's hardware (lore.md 2), brings a rack back from cold storage before it scraps it | 30–35 min | Open the cage; its guard holds the key | 2 filters (Custom 1 in 4); 3 receipts dated to the rack's era (*C+3*), stamped like a vault's | Kestrel +6 |
| **Settlement run** · `<CREW>-RIG-nn` | TOLLGATE, SWARMLINE or PALEMASK lock a living institution's run as it passes a server (a red aim at it) | 18–20 min, the run's | Break the lock, an elite in the Core, before the run settles | 3 Exploits (the crew's lock, taken apart) | The institution's faction +12 |
| **A runner's trade** | A runner you've met reaches the floor of their frozen trade (runners.md, *Someone's money*) and traces the server it froze on | None | Beat its Resident, the orphan holding it, with them beside you | The runner: a standing tier, a codebase they know, a lead (a server traced) | — |

- **Settlement runs by floor:** the Tenements Board (1), Harrow Street Credit Union (2), Corvid Exchange (3), the
  City Treasury's tax rolls (4 down). Their faction: Halcyon, LANTERN (its oldest listener), Kestrel (its insured
  lots), Halcyon.
- **A lock that lands** (the run settles first): its trades orphan, the process table +1 (docs/init-table.md), a Log
  line (*412 trades orphaned*). Nothing else.
- **A runner's trade ends on their stamp:** their faction's (*Settle* for LANTERN's), shown on the receipt. It replaces
  today's off-screen *came through* line for a runner you've met.
- **Voices** (#net): `facilities@kestrel` *Rack 4 will close at the end of this cycle. Please collect your belongings.*
  · LANTERN *Four. One. Two. Harrow Street settles in eighteen minutes. TOLLGATE on the line.* · the runner,
  lowercase: *found it. HARROW-LEDGER-22, floor 2. my mother's house sale. could use a hand*
- **Log lines:** *MOUNTED on floor 2: KESSLER-RACK-04.* · *STAGED on floor 2: TOLLGATE-RIG-31.* · *marrow found
  their trade on floor 2: HARROW-LEDGER-22.* Each is a row in the map's left column while it's up.

## Why you'd go

Each site is the best place for one thing, so the player picks by what they need:

| You need | Go |
|---|---|
| Gear | Anywhere: every fight, vault and goal drops it |
| Your wall's gear | A rack pull (today a filter is 1 vault in 7) |
| A faction piece | Rack pulls and takeovers (receipts) |
| Exploits | Settlement runs, the Exfil, elites |
| One faction's standing | Settlement runs, defence calls, feuds |
| A crewmate, a codebase without the rep | A runner's trade |

**Value.** Every site is worth about the same: 30 minutes of play at your level (a level's XP over its minutes in
`CLIMB`; credits at the economy's 0.08 a point of XP, econ.mjs). Its own thing is sized against the usual way to get it
when it's built, so none is a trap or a must.

## Open

- **Sinks.** A thing is only worth chasing if it's spent: components buy nothing yet and Exploits only medium programs.
  Patches (economy.md 2) spend both.
- **What pays what** (market.md) as its own sheet: the map above for every activity, gear general.
- **How often.** About one an hour is a start; set it once the designer has played them.
