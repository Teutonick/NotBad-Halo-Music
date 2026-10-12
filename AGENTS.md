# AGENTS.md — HALO development instructions

These instructions apply to every change in this repository, including work performed by Codex or another coding agent.

## Product definition

HALO is an **unobtrusive relaxation constructor**: users shape a calm soundscape through **eight simultaneous voices**, without needing musical expertise or learning a professional instrument. The experience should be effortless, visually immersive, and aurally calm.

**Product promise:** *Complex to look at. Simple to touch. Harmonious to hear.*

Treat the repository's actual code as the source of truth for what is implemented; treat `PROJECT_MAP.md` as the intended direction. Never describe roadmap items as shipped features.

## Non-negotiable design rules

1. **Sound quality outranks visual spectacle.** Prefer warmth, space, restrained dynamics, and intentional silence. Avoid harsh peaks, excessive density, and tiring repetition.
2. **One authoritative musical transport.** Eight tracks share BPM, bar position, and a musical clock. Per-track rhythmic cycles may differ, but note events must remain deterministically related to this transport.
3. **Never schedule notes from `requestAnimationFrame`, CSS animations, or visual object collisions.** Schedule ahead using Web Audio time (`AudioContext.currentTime`). Visuals may respond to scheduled events but must never own timing.
4. **Musical complexity can be hidden visually, not broken.** Use phase offsets, nested paths, smooth modulation, and non-periodic-looking decorative motion while keeping harmony and quantization coherent.
5. **The world is the interface.** Favor gestures on objects/orbits over permanent controls, menus, inspector panels, or mixer metaphors. Advanced controls may exist but should stay unobtrusive.
6. **Exactly eight track slots in the core concept.** Keep mute/solo, sound identity, pattern, level, and visual identity per track separable. Do not confuse eight tracks with eight unique synthesis engines.
7. **Visual worlds must preserve the composition.** Switching Orbit/Bloom/Current changes representation, not transport phase, notes, tempo, mute state, or instrument parameters.
8. **Progressive enhancement.** Audio must function without WebGL2. Prefer Canvas 2D fallback, device-appropriate quality scaling, and reduced-motion support.
9. **Privacy and simplicity by default.** No account, analytics, tracking, API keys, or backend. Do not add runtime dependencies or CDNs without a concrete documented need.
10. **Do not overbuild.** Prefer small, testable changes that preserve the zero-build static deployment path wherever possible.
11. **GitHub Pages is mandatory.** Every feature must work as a static project site under `/<repository>/`, without a backend, mandatory build step, runtime CDN, secrets, or server rewrites. Use relative asset/module/sample paths and locally hosted assets. Verify deployment compatibility when changing paths or loading behavior.
12. **Sound provenance is mandatory.** Use original procedural synthesis or external sounds with verified CC0/public-domain status only. Reject paid permissions, required attribution, non-commercial restrictions, and redistribution restrictions. Free or royalty-free alone is insufficient. Record each imported sound's source URL, author, rights evidence, and local filename before inclusion; never copy proprietary OP-Z sounds.

## Current implementation (2026-10-12)

- `index.html` contains markup/styles, transport, state, visuals and UI. `src/sounds.js` owns patch banks/harmonic rules; `src/audio.js` owns synthesis and audio routing. Classic local scripts preserve direct file opening and GitHub Pages.
- Eight track objects have dedicated roles with 30 original procedural patches across the banks, plus character/duration/space tuning. External sample banks are not implemented.
- DRIFT keeps original trajectories; IN TIME maps musical steps to aligned orbits via `src/motion.js`. Visual accents consume scheduled audio timestamps; render code never triggers notes.
- Musical scheduling uses a 16-step-per-bar grid and four repeating chords: Dm7, Bbmaj7, Fmaj7, Cadd9.
- Three visual modes exist: Orbit, Bloom, Current; different visual velocities do **not** yet constitute true musical polymeter.
- Node tests cover sound rules, audio contracts and app wiring using fakes; audible and real-device acceptance remains required. No persistence, recording, direct orbit note editor or PWA is implemented.

Do not introduce a framework or bundler merely to refactor. ES modules and a minimal local static server are enough for the first extraction; GitHub Pages must continue to work.

## Desired architecture (incremental, not assumed to exist)

- `src/core/` — app state, transport, event scheduling, composition, deterministic seeds, serialization.
- `src/audio/` — synthesis voices, master chain, effects, voice management.
- `src/visual/` — world renderer interface, shader resources, Canvas fallback, quality tiers.
- `src/ui/` — gestures, track controls, overlays, accessibility.
- `src/data/` — instrument presets and sample universes.
- `tests/` — pure timing, harmony, and persistence tests.

Keep render, transport, composition, and audio synthesis independently testable. Avoid circular module imports and implicit globals. Introduce a versioned data schema before introducing saved presets.

## Technical guardrails

- Schedule notes ahead on the audio clock with bounded lookahead and safe behavior after pause/resume, background suspension, and tempo changes.
- Use controlled gain ramps for mutes and parameter updates; avoid audible pops, clipping, DC offsets, and unbounded overlapping oscillator nodes.
- Keep deterministic musical choices based on a stored seed plus musical position. Decorative randomness may be independent, but must not silently alter the composition.
- Clean up timers, audio nodes, GPU resources, event listeners, and animation loops when replaced or disabled.
- A shader failure must not prevent playback. A missing audio permission must not break the visual interface.
- Make touch targets usable on phones; avoid essential hover-only or right-click-only features. Provide keyboard/focus alternatives and semantic labels.
- Respect `prefers-reduced-motion`. Avoid strobing, rapid flashes, and unexpected high-volume output.
- Prefer broadly supported APIs (Web Audio, Canvas 2D, WebGL2). Treat WebGPU as an optional enhancement, not a baseline dependency.
- Never copy proprietary visual assets, sound samples, or UI from OP-Z, Playtonik, or other products. They are references for interaction principles only.

## Working procedure for agents

1. **Inspect first.** Read `README.md`, `PROJECT_MAP.md`, and relevant actual source files. Identify what exists versus what is proposed.
2. **State scope.** Before a significant change, explain the intended behavior, affected modules, risks, and how it will be verified.
3. **Keep changes focused.** One feature or refactor objective per change. Avoid unrelated visual, audio, and architecture rewrites in the same patch.
4. **Preserve a playable build.** Every completed change must leave Play, transport, eight tracks, and the three scenes functional.
5. **Test where possible.** Add pure-function unit tests for musical timing, note selection, seeds, and serialization. Manually test actual audible output when automated audio verification is unavailable.
6. **Check desktop and mobile.** Validate Chrome/Chromium and, when available, Safari/iOS. Verify startup by user gesture, resizing, pause/resume, and WebGL fallback.
   For local browser checks, run `./scripts/preview.ps1` and use `http://127.0.0.1:8766/`. If Windows sandbox blocks sockets, request the standard execution escalation for the loopback preview server. Prefer the supported current browser API when a legacy adapter fails; do not bypass browser URL policy or security controls. Reload after edits; record console results and actual viewport/device coverage.
7. **Report clearly.** Summarize changed files, behavior, validation performed, limitations, and next recommended step. Do not claim to have listened to audio or tested a device unless you actually did.
8. **Update docs in the same change.** Every major or consequential change to behavior, audio, controls, architecture, dependencies, sound assets, compatibility, or deployment must update `PROJECT_MAP.md` with the resulting state, decisions, and known limitations; update `README.md` when user-facing features or instructions change. Add a short dated entry to `CHANGELOG.md` describing what changed and its impact. Distinguish planned, implemented, and verified behavior; a major product change does not automatically imply a major version release.

## Definition of done (for each feature)

- The experience remains musically coherent and usable without a tutorial.
- No regression in the eight-track transport or harmony.
- No console errors or unhandled promise rejections in supported paths.
- No audible click when toggling, no dangerous gain spikes, and no runaway CPU/GPU work.
- Functional keyboard, pointer, and touch interactions for relevant controls.
- Mobile layout and fallback behavior are considered.
- Documentation accurately reflects what was shipped.
- Significant changes are recorded in project documentation and the short changelog; GitHub Pages compatibility and imported sound provenance are accounted for.

## Earlier refactor recommendation

**Refactor v0.1 into small ES modules without changing the musical results or the visual composition.** Extract app state, scheduler, harmony/composition, synth, worlds, and UI handlers. Preserve an easy static run/deploy path; document any requirement for serving ES modules over HTTP. Add pure unit tests for deterministic harmony and step scheduling. Do not add new sound engines, frameworks, or visual effects in this first task.

This is an optional prerequisite, not a requirement to delay the approved sound-bank direction in `PROJECT_MAP.md`. Keep extraction and audio feature patches focused and independently reviewable. Do not commit changes unless the user explicitly authorizes it.
