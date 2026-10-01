# Phase 1 — shell, layout and proportions

Source of truth: `blackbox_ui_asset_bundle/README.md`, then `references/blackbox_master_reference.jpeg` and the bundled implementation contract. This package supersedes the earlier cyan reference.

Completed:
- Imported the supplied tokens, frames, patterns, icons, textures and view templates. Source references are kept out of the public runtime directory.
- Replaced the accumulated combat-layout overrides with one amber layout stylesheet.
- Moved navigation, server health and utilities into the shell header. Server assets/details remain accessible through the health disclosure and Files module.
- Matched the three-column composition: roughly 27% virus/intel, 55% combat state/action, 17% events, with gutters.
- Moved Origin Trace into the encounter, and the existing player-action controls below the combat controls. Commands and all six abilities span the bottom.
- Applied the supplied panel framing, base textures, logo and palette, including the existing animated virus renderer.

Validation:
- All 34 existing combat, tutorial and UI-helper checks pass.
- Desktop checks at 1536×864, 1366×768 and 1280×720 show no required combat scrolling or panel overlap. One-pixel frame-corner overhang is intentional.
- Checked command submission/history, a live Scan action, persistent intel, pause/resume, Home/Files navigation, server details, and tutorial entry/exit in the unsaved playtest fixture.
- Checked a 390px narrow layout for horizontal overflow.

Expected differences at this checkpoint:
- Core is still a separate gameplay target. Do not relabel it as aggregate Virus Integrity until the subsystem model is implemented and tested.
- The existing incoming cast card remains; local subsystem timers, player cancel control, and cast/cooldown ability overlays are later phases.
- 3D is the existing visualization, not the completed three-tab system. Schematic and Signature must be functional, not placeholder controls.
- Intel still shows the two actual engine discoveries. Loot and weakness entries require corresponding game state; do not invent results to match the mockup.
- Events use the existing four recent cards. Count, clearing and collapse/minimize behavior remain for phase 4.
- Fine icon treatment, signature labels and texture/glow tuning remain for phase 5.

Stop here for the screenshot review requested in section 15 of the implementation contract. This is a local review checkpoint, not a completed redesign or a production publication.
