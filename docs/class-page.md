# The class page and the Toolkit

The designer's picks for Loadout → Skills and talents (replacing skills-view.mjs's card and panel, and the subclass
breakout). Prototype: `design/proto/class-page.html` (serve the repo root; `?v=lvl1a`, `early`, `choose`, `regular`,
`book`). It renders the Breaker with the real data; the build does every class.

## The page: one card of the whole class

- **Top bar:** level and XP, talent points free (hidden at 0), and the **Toolkit** button (key T).
- **Three columns:** the subclass A · the class · the subclass B.
  - **Center:** the class's ASCII emblem (class-emblems.mjs), its name and role tags; its four core abilities; its
    passive, sync bonus and kit talent.
  - **Each subclass:** its icon (`ui/icons/sub-<id>.svg`), name, role tags; its edge; its eleven abilities (icon tile,
    name, unlock level on a locked one); its talent tree (ranks as diamond pips, a picked side lit amber, an OR between a
    tier's two).
- **No bar section.** An ability on a key carries the key as a teal badge on its corner.
- **No detail panel.** Every ability, talent, edge and passive's rule is its tooltip (WoW grammar, docs/style-guide.md).

## Its states

| Level | The page |
|---|---|
| 1–9 | All three columns; both subclasses dimmed hard (~15%), each marked **Level 10**; "Subclass at level 10" over the card (`?v=lvl1a`) |
| 10+, no pick | Both subclasses lit, a **Choose** button on each; "Choose a subclass" over the card (`?v=choose`) |
| Picked | Yours wide and marked **Yours**; the other folded to a greyed strip (icon, name, roles, edge, ability icons) with **Switch** (`?v=regular`) |

Talent ranks and picks are spent on the tree itself (click a node; the same commands and rules as today).

## The Toolkit (key T; never "spellbook")

An overlay over the game (`?v=book`): the class's core abilities and cantrips on the left page, your subclass's on the
right, each with its icon, name, and kind · cooldown (locked: dim, "Level n"). The bar along its foot: the keys, the
slots that open later, and the preset chips (rotation, area, + save). **Drag an ability onto a key** (one on another key
swaps); drag it off to clear. On a phone: tap an ability, then tap a key. Keys change between fights, as now.

## Not decided yet

- The subclass icons are drafts; the designer has not kept them (Demolitionist and Herder may be redrawn).
- Where the Toolkit opens from in a fight (the tray), if anywhere.
