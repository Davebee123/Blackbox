# Rivals

Named runners, one per crew, who race you to a server's vault and fight you trainer-style. **Built** (October 2026,
`dist/rivals.mjs`, GAME_RULES.md "Rivals"): KUDZU, ESCROW and HUSH, lean. CANTOR waits for floor 3+.

**ESCROW's lineup, for now:** the Wiper and the Cryptominer aren't families yet (docs/parts-plan.md P3), so it fields
TOLLGATE's built ransomware: a Ransomware virus, the Hashrat (the Cryptominer's build to be) and the Bricker. Swap them
in when P3 lands. KUDZU's Hot spare is the Spare part; wick's lines past the ones below are new and want the
designer's pass.

## Roster

| Rival | Crew | In a line | Lineup | Counter-pick (reads your last fight) |
|---|---|---|---|---|
| **KUDZU** | SWARMLINE | Cheerful, too friendly, lower case with "!!". Every loss is pruning. | Worms and trojans: spares, twins, floods | Burst one down → **Patcher**. Spread hits → **Hot spare**. Slow single target → **Flood ramp** |
| **ESCROW** | TOLLGATE | Polite and formal. Invoices you for your time. | Ransomware, Wiper, Cryptominer: armor on a clock | Burst → **Mutex lock**. Slow or burns → **Deadline**. Small strips → **Ward** |
| **HUSH** | PALEMASK | Never speaks. Quotes your own last command back at you. | Ghostroots: veiled, mirrored | Read every tell → **Veil**. Big hits → **Decoy mirror**. Helpers → **Phase shift** |
| **CANTOR** (later, floor 3+) | NULL CHOIR | Mocking, keeps time. | Keyloggers, Mimics, Sync locks | The next Mimic beats on the skill you opened with most |

Rival lines: KUDZU *"hiii again!! brought friends"* · ESCROW *"Invoice 0417. Your time is billable."* · HUSH *"> spike enc"*
(your own) · CANTOR *"Again. From the top."*

wick:
- KUDZU: *kudzu. you beat it on two. it's been practising.* · *it saw you burst the first one. it brought a patcher.* ·
  *vault and pack both. good night.*
- ESCROW: *escrow's here. it bills by the cycle. don't pay.* · *you made escrow wait last time. it brought a deadline.*
- HUSH: *hush is on this one. you won't see it till it's next to you.* · *it's quoting you again. read the board, not the
  chat.*
- CANTOR: *the choir sent cantor. it plays back what you lead with. lead small.*

**GLASSJAW gets no rival.** It's a broker working against Halcyon, not a turf crew. It sells the rivals your fight logs:
the in-world reason for the counter-pick and their memory, at no rule cost.

## Rules

- **On a run.** At most one rival per server, rolled like the Exfil. It walks a room for each of your moves, by the
  shortest route to the vault, and needs no key. Its chip shows through the fog, and so does the vault it's after.
- **Aggro.** When it reaches your room it pulls you into the fight. No step back.
- **The fight.** 2 viruses on floors 1–2, 3 from floor 3, one after another, one level over you. Your Signal carries;
  your cooldowns reset between fights.
- **Counter-pick.** Between fights it adds one part, read from how you won the last one. One change only, always shown
  before you engage.
- **Stakes.** First to the vault takes its files. Beat the rival and you take its pack too, with any vault it opened.
- **Losing.** The rival disappears with its pack. This mechanic accepts the loss aversion.
- **Got away.** If it opens the vault and you never meet it, the files go with it.
- **Memory.** It remembers your record and your last meeting (*meeting 3*, 1–1), and wick has a line.

## The look (picked)

Red for the rival and its viruses, amber for the loot, teal for you; the crew's colour only on its byline.

1. **Map:** a red ring and a name tab on its room (beside YOU when it reaches you), its whole route as a red dotted
   trace, its lineup as virus chips under its room, and the race on the vault: your rooms to it in teal, its in red.
2. **Challenge:** the room's pop-up card: name, crew and level, your record, its line, the lineup as numbered rows,
   the stakes (the vault + its pack) as amber icons, wick's line, and Engage only.
3. **Between fights:** a card over the board: the lineup rail (beaten ones struck), what you did → the part it adds
   (*3 cycles → Patcher*), your Signal, wick's line, Engage.
4. **End:** the spoils card where every win's goes: XP, then one list under two heads, the vault and its pack.
