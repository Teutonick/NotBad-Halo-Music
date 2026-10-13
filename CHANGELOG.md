# Changelog

## 2026-10-13 — Visuals-only mode

- Added upper-right maximize-style button to hide UI and labels while visuals/music continue.
- Click/tap anywhere or Escape restores controls without changing voices or open editors; preference persists locally and supports RU/EN.

## 2026-10-13 — Seamless centered background

- Removed the nebula's angular noise seam with continuous texture coordinates.
- Aligned shader center/scale and CSS fallback glow with the orbit world; softened clouds outside the sphere.
- Preserved musical timing and composition.

## 2026-10-13 — Floating phrase guide and site metadata

- Moved PHRASE controls above the bottom transport; added pointer/keyboard movement, window stacking and persisted position.
- Prevented Play from shrinking into an oval at narrow widths and reserved footer space.
- Added original SVG favicon, canonical/search/social metadata and WebApplication JSON-LD with RU/EN descriptions.

## 2026-10-13 — Responsive promotion and workspace reset

- Fixed header/menu overlap with measured spacing; phrase controls follow menu height.
- Moved wide-screen promotion below the introductory text; narrow/short screens show rotating vertical titles at the left edge, with temporary expansion for 8 seconds.
- Added localized workspace reset beside autosave help: confirmation, full origin localStorage clearing and default reload, with guarded autosaves and safe failure behavior.

Keep entries short and dated. Record significant changes and their impact in the same patch; mark plans separately from implemented behavior. Link detailed decisions and limitations in [PROJECT_MAP.md](PROJECT_MAP.md).

## 2026-10-13 — Localization, volume and other projects

- Added browser-selected RU/EN and a saved manual language switch, including editors, messages and accessibility labels.
- Added master volume, default 50%, persisted in autosave/project files and applied to offline export.
- Added discreet localized product cards with 15-second rotation and hover/focus pause, plus homepage, GitHub and author links.
- Required localStorage persistence and RU/EN for all future settings/features; reinforced original/free-resource licensing policy.
- Kept zero-build GitHub Pages deployment; no external assets or runtime libraries added.

## 2026-10-12 — Product direction and documentation

- Defined HALO as an unobtrusive relaxation constructor.
- Approved eight sound roles, dedicated banks, and simple tuning as planned work; current four synth families remain unchanged.
- Required original synthesis or verified CC0/public-domain sound assets with per-file provenance.
- Made GitHub Pages compatibility mandatory; added README publishing, update, verification, and rollback instructions.
- Required project documentation and concise changelog updates for all significant changes.
- Documentation only: no runtime changes, imported sounds, audio/device testing, or deployment.

## 2026-10-12 — Procedural sound banks

- Added eight role-specific banks with three original synthesized patches each (24 sounds); audible defaults now reflect their roles.
- Added character, duration and space tuning, ramped mutes/sends, bounded voice events and source cleanup.
- Added keyboard editor access and a scrollable compact editor; retained eight slots, shared harmony/clock and three worlds.
- Extracted sound rules and audio into local scripts; added `.nojekyll` and seven passing Node checks.
- External CC0 samples remain planned. Audio listening, real-browser/mobile checks and Pages deployment are unverified.

## 2026-10-12 — Browser verification workflow

- Added a loopback-only PowerShell/Python preview command and documented Codex HTTP browser checks, sandbox socket errors, and legacy adapter limitations.
- Restored access through the current in-app browser API and an approved local server outside sandbox; no browser security settings were changed.
- Checked playback UI startup, pause/resume, eight editors/24 sound selectors, tuning controls and desktop/phone-size layout; no warning/error console entries were returned during the checks.
- These are interface checks, not a listening assessment, physical-phone/Safari test or Pages deployment.

## 2026-10-12 — In-time motion and drum options

- Kept DRIFT; added IN TIME aligned orbits, a common event axis and bar/beat readout. Visual accents now wait for scheduled audio time.
- Added Punch kick to ROOT, snare/clap/hat to RAIN, and hat/tom to MOSS: 30 procedural patches across the same eight tracks.
- Drum patches have their own kick/backbeat/offbeat patterns; ROOT/RAIN/MOSS can form a simultaneous kit without replacing the original melodic patterns.
- Ten automated checks pass; browser UI checks performed. Actual listening, physical devices and output-latency alignment remain unverified.

## 2026-10-12 — Four-bar phrase visualization

- Added PHRASE alongside DRIFT and IN TIME: one revolution = four bars / 64 steps, with shared playhead and phrase/bar/beat counter.
- Added note, skipped-step and subdivision markers using the audio trigger rules; muted voices retain a dim preview.
- Existing playback, seeds and immediate quantized mute/unmute remain; no queued phrase-launch behavior was added.
- Twelve automated checks pass; browser viewport/console checks performed. Listening and physical-device timing remain unverified.

## 2026-10-12 — Optional cosmic comet effects

- Added CLASSIC/COSMIC with eight individual trails, additive glow, subtle pulse rings and optional richer WebGL nebula light; CLASSIC restores the prior graphics.
- Added bounded desktop/mobile/reduced-motion tiers without new audio behavior, dependencies or retained particles.
- Adjusted phone header to keep graphics, motion and scene controls usable.
- Fourteen tests pass; live browser rollback/scene/motion and desktop/mobile viewport checks returned no console errors. Sustained performance and physical devices remain unverified.

## 2026-10-13 — Fixed loops, key controls and phrase editing

- Made generated 4/8-bar loops repeat by default; added explicit NEW PATTERN and independent AUTO PATTERN/AUTO KEY switches.
- Added circle-of-fifths minor-key controls and eight-bar phrase visualization.
- Added per-voice sixteenth-note EDIT with local schema-v1 save/reload; saving disables AUTO PATTERN and preserves the separate AUTO KEY setting.
- Verified persistence and automation controls in the browser; exact timings override generated density/rests. Full composition export, physical devices and listening remain unverified.
- Validation: 22 tests and diff check pass; eight-bar automatic playback, reload restoration and phone-size editor checked without returned console warnings/errors.

## 2026-10-13 — NotBad projects, exports and floating editors

- Rebranded to NotBad Halo Music Constructor; added validated settings-only JSON SAVE FILE / LOAD FILE for 4/8-bar projects.
- Added browser-only WAV export and native-codec-conditional MP3; the tested browser needs WAV. No backend or third-party codec added.
- Added bounded manual BPM 30–200; hardened numeric, schema and file-size inputs.
- Enlarged world with viewport caps; added editor grips, dragging, focus stacking and NEW PATTERN draft refresh.
- Verified actual JSON roundtrip, nonempty stereo WAV, grid refresh and window movement; listening, physical devices and full security audit remain unverified.

## 2026-10-13 — Full autosave and grouped controls

- Added validated browser-profile localStorage autosave/restore, including settings, modes, manual steps, editor drafts and window positions; footer ? explains usage and continued-use agreement.
- Defaulted first visits to COSMIC + DRIFT; hid scene control outside DRIFT.
- Compacted menu into PATTERN / KEY / SAVE with independent AUTO RANDOM controls and centered key label.
- 27 tests pass; live reload restored settings/draft, and phone-size layout checked without console errors. No cookies, tracking, backend or commit.
