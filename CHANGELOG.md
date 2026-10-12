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
