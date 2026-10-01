# BLACKBOX UI Asset Bundle

This is a drop-in visual handoff package for Codex.

## Source of truth

**`references/blackbox_master_reference.jpeg` is the approved visual target.**

Codex should match that image as closely as possible. Supporting mockups are secondary only.

## What is actually included

This ZIP contains actual reusable assets, not just descriptions:

- the approved master UI reference
- supporting generated UI mockups
- exact crops of major master-reference regions
- 27 reusable SVG icons
- reusable SVG panel/button/timer frames
- subtle PNG grime, scratch, grid, and vignette textures
- JSON and CSS design tokens
- reusable component CSS
- functional Schematic and Signature view templates
- implementation contract and original asset manifest
- prototype/UI refactor documents
- asset map JSON

## Folder guide

- `references/` – approved reference plus supporting generated screenshots
- `references/crops/` – exact crops for header, virus, Intel, subsystems, action, events, command, abilities
- `icons/` – reusable SVG iconography
- `textures/` – subtle raster overlays
- `frames/` – scalable SVG border/frame assets
- `patterns/` – hazard stripes and corner brackets
- `tokens/` – exact color/glow/type/spacing tokens
- `components/` – reusable CSS and component hierarchy
- `views/` – Schematic/Signature functional template assets
- `docs/` – Codex implementation documents
- `asset-map.json` – programmatic index

## Codex instruction

1. Open the master reference first.
2. Read `docs/blackbox_ui_implementation_contract.txt`.
3. Read `docs/blackbox_ui_asset_manifest.txt`.
4. Import/use this bundle rather than recreating common icons/textures from scratch.
5. Use the tokens as the starting theme.
6. Match desktop layout before responsive adaptation.
7. Keep 3D / Schematic / Signature functionally distinct.
8. Keep Events toggleable.
9. Keep Server HP in the shell chrome.
10. Keep Origin Trace in the encounter area.
11. Use subsystem timers locally; do not make the user watch a distant global cycle timer.
12. Bottom ability cards must show casting and cooldown progress MMO-style.

## Important note

The master/reference images are raster design references. The icons, frames, patterns, tokens and textures in this bundle are reusable implementation assets recreated specifically for the BLACKBOX UI. They are intended to make Codex's implementation more deterministic while preserving the approved look.
