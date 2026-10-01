# Phase 2 — combat regions and bottom band

Source of truth: `blackbox_ui_asset_bundle/references/blackbox_master_reference.jpeg` and section 15 of the bundled implementation contract.

Completed:
- Aligned the virus/intel, combat/action, and events columns with the master reference. At 1536×864, the first two columns measure approximately 395px and 799px; Events measures 252px.
- Main combat content now ends at y=695, close to the reference's y≈700. The bottom command/ability band is 145px high rather than the previous oversized band.
- Separated the Events header from its list panel and added the count of currently displayed events. The header is not yet an expand/collapse control.
- Positioned the existing player action under Subsystems, with a supplied ability icon, description, progress bar, and timer/control column on the right.
- Moved keyboard hints into the prompt row and autocomplete directly above it. Suggestions no longer add layout height.
- Increased ability card space within the tighter band, with all six commands still visible.
- Anchored Abilities help beside the tray in combat and in other modules. Removed an invalid nested `:has()` fallback that could leave help over the action timer.
- Allowed narrow-screen action panels to grow for wrapped descriptions, preserving their bottom padding.

Validation:
- All 34 combat, tutorial and UI-helper tests passed after the phase 2 markup/JavaScript changes; subsequent adjustments were CSS and documentation only.
- Browser checks at 1536×864, 1366×768 and 1280×720 fit the combat regions and command band without required combat scrolling. One-pixel frame-corner overhang remains intentional. Events can scroll independently.
- Checked the 390px narrow layout: no horizontal overflow; a queued action with a wrapped description retains 13px beneath its progress bar.
- Exercised ability selection, target suggestions, Tab completion, Enter to queue, pause/resume, Up/Down history, help opening/closing, and Files/Combat navigation.
- Observed a real Overload resolve against Encryptor; its health and Events updated. The action icon follows the queued ability.
- No browser errors or warnings observed during the checked session. All browser testing used the unsaved CRYPTJACK playtest fixture.

Remaining differences from the approved reference:
- Combat still has the original separate Core. Aggregate Virus Integrity and the revised subsystem anatomy require the phase 3 engine/UI work; the current values have not been relabeled or faked.
- The existing enemy cast card remains above the two current subsystem rows. Local subsystem timers, the revised rows and Cancel control are not implemented yet.
- Schematic and Signature are not present as nonfunctional placeholders. Distinct working views remain for the next phases.
- Intel still reflects the two discoveries supported by the current engine. Discovery count, weakness/loot categories and their game data remain later work.
- Events count is the visible card count, capped at four; expand/collapse/minimize, Clear, timestamps and the longer event list remain later work.
- Most ability/subsystem symbols still use the current glyphs. Full supplied-icon treatment, casting/cooldown overlays and visual polish remain later phases.

Screenshot: `reference/blackbox_phase_2.jpg`.

Stop here for the screenshot review required after each phase. This is a local review checkpoint, not a completed redesign or production release.
