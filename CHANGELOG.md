# Changelog

Keep entries short and dated. Record significant changes and their impact in the same patch; mark plans separately from implemented behavior. Link detailed decisions and limitations in [PROJECT_MAP.md](PROJECT_MAP.md).

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
