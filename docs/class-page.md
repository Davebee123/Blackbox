# The class page and the Toolkit

The designer's picks for Loadout → Skills and talents, built in `dist/skills-view.mjs` (it replaced the card and
detail panel, and the four-step subclass breakout). The prototype stays on the `wip/class-page` branch
(`design/proto/class-page.html`).

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
| 1–9 | All three columns; both subclasses dimmed hard (~15%), each marked **Level 10**; "Subclass at level 10" over the card |
| 10+, no pick | Both subclasses lit, a **Choose** button on each; "Choose a subclass" over the card |
| Picked | Yours wide and marked **Yours**; the other folded to a greyed strip (icon, name, roles, edge, ability icons) with **Switch** |

Talent ranks and picks are spent on the tree itself: a click adds a rank or picks (the same `talent` commands and
rules), a right-click takes a rank back. Reset sits in the top bar. The first time you're home at 10+ with no pick,
the game brings you here once ("Choose your subclass.").

## The Toolkit (key T; never "spellbook")

An overlay over the game: the class's core abilities and cantrips on the left page, your subclass's on the
right, each with its icon, name, and kind · cooldown (locked: dim, "Level n"). The bar along its foot: the keys, the
slots that open later, and the preset chips (rotation, area, + save). **Drag an ability onto a key** (one on another key
swaps); drag it off to clear. On a phone: tap an ability, then tap a key (a key's ability tapped twice comes off).
Keys change between fights, as now. T works anywhere but a text field; on an empty prompt only as a capital, since a
lower-case t starts commands. A mastered ability's effect tier is picked on its Toolkit entry.

## Decided since

- The eight subclass icons stay as they are for now.
- The Toolkit also opens from the fight tray: a small quiet button past the last key (the way in on a phone). In a
  fight it shows the abilities, keys frozen and no presets; the fight runs on and its keys still work. Esc closes it.
