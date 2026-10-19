# AGENTS.md — NotBad Halo Music Constructor development instructions

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
9. **Privacy and simplicity by default.** Project inputs must be bounded and allowlisted; BPM is 30–200. No account, analytics, tracking, API keys, or backend. Do not add runtime dependencies or CDNs without a concrete documented need.
10. **Do not overbuild.** Prefer small, testable changes that preserve the zero-build static deployment path wherever possible.
11. **GitHub Pages is mandatory.** Every feature must work as a static project site under `/<repository>/`, without a backend, mandatory build step, runtime CDN, secrets, or server rewrites. Use relative asset/module/sample paths and locally hosted assets. Verify deployment compatibility when changing paths or loading behavior.
12. **Sound provenance is mandatory.** Use original procedural synthesis or external sounds with verified CC0/public-domain status only. Reject paid permissions, required attribution, non-commercial restrictions, and redistribution restrictions. Free or royalty-free alone is insufficient. Record each imported sound's source URL, author, rights evidence, and local filename before inclusion; never copy proprietary OP-Z sounds.
13. **Documentation and API synchronization is mandatory.** Any functional expansion, parameter change, new synthesis feature, sequencer enhancement, or capability update strictly requires simultaneous updating and synchronization of:
    - The in-app User Manual (`index.html`) in both Russian and English, maintaining theoretical rigor and product terminology;
    - The comprehensive engine capabilities package (`docs/engine-capabilities.md`);
    - The Agent API format and capabilities specification (`docs/agent-api-specification.md`).
    Never introduce engine or interface capabilities without updating these documentation packages.

## Current implementation (2026-10-14)

- Generator 3 uses eight fixed role operators in `src/roles.js`, compatible manual timbres and world-affinity randomization. It preserves the generator-2 motif/ensemble library and legacy generator-1/2 projects. Optional per-track cycles share absolute transport time; role polyphony is enforced by audio. See `docs/track-roles.md`.
- `index.html` contains markup/styles, transport, state, visuals and UI. `src/sounds.js` resolves patches and legacy musical rules; `src/phrases.js` owns original version-2 motifs, ensemble harmony and compatibility matrices; `src/audio.js` owns synthesis and audio routing. Classic local scripts preserve direct file opening and GitHub Pages.
- Eight stable orbit/track IDs are separate from instrument identity. Any of the current world's eight banks can occupy any orbit, including duplicates. AMBIENT has 30 original procedural patches; REACTOR has 32 presets backed by 130 local CC0 recordings. `src/samples.js` loads/decodes local classic-script PCM packs; source authors, pinned URLs, rights evidence and hashes are recorded in `assets/reactor/manifest.json` and `rights/`. Character/duration/space tuning remains per track. Arbitrary external sample loading and cross-world bank mixing are absent.
- DRIFT keeps original trajectories; IN TIME maps musical steps to aligned orbits; PHRASE maps a 4/8-bar (64/128-step) cycle to one revolution and previews seeded note/skip markers via `src/motion.js`. Visual accents consume scheduled audio timestamps; render code never triggers notes.
- `src/composition.js` owns independent pattern/key boundary decisions and version-1 local pattern validation. Generated choices repeat per 4/8-bar loop by default; only explicit generation or enabled AUTO PATTERN changes them. AUTO KEY is separate. Saved exact steps disable AUTO PATTERN and bypass density; mute remains authoritative.
- Musical scheduling uses a shared 16-step-per-bar grid. Generator 2 has ten original motif families per each of 14 actual musical roles and ten ensembles per world, shared minor-key harmony and 4/8-bar development. Duplicate roles share candidate activity/headroom; bass/kick stay near stereo center independent of orbit. Version-1 project format adds allowlisted `instrument` and `generator` track fields; old files default to generator 1 and native banks. GENERATE explicitly enables generator 2 and also randomizes patches/tuning in 20–100%. Saved exact timing stays authoritative; pitch editing is absent. Playback/export waits for recordings, with no procedural fallback on failure. See `docs/phrase-library.md`; do not silently change existing generator versions.
- Three visual modes exist: Orbit, Bloom, Current; different visual velocities do **not** yet constitute true musical polymeter.
- Optional COSMIC adds eight bounded procedural comet signatures in `src/effects.js` and a WebGL nebula enhancement. CLASSIC preserves the prior graphics; effects must remain audio-independent, bounded, and available with Canvas fallback.
- Node tests cover sound rules, audio contracts and app wiring using fakes; audible and real-device acceptance remains required. Versioned local phrase-step saving and PHRASE grid editing are implemented; portable version-1 project import/export and local WAV rendering exist; MP3 is native-codec-conditional. Cloud sharing, direct orbit editing and PWA remain absent.

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
8. **Update docs in the same change.** Every major or consequential change to behavior, audio, controls, architecture, dependencies, sound assets, compatibility, or deployment must update `PROJECT_MAP.md` with the resulting state, decisions, and known limitations; update `README.md` when user-facing features or instructions change; and strictly update the in-app bilingual User Manual (`index.html`), the Engine Capabilities registry (`docs/engine-capabilities.md`), and the Agent API specification (`docs/agent-api-specification.md`) whenever functionality or parameters change. Add a short dated entry to `CHANGELOG.md` describing what changed and its impact. Distinguish planned, implemented, and verified behavior; a major product change does not automatically imply a major version release.

## Definition of done (for each feature)

- The experience remains musically coherent and usable without a tutorial.
- No regression in the eight-track transport or harmony.
- No console errors or unhandled promise rejections in supported paths.
- No audible click when toggling, no dangerous gain spikes, and no runaway CPU/GPU work.
- Functional keyboard, pointer, and touch interactions for relevant controls.
- Mobile layout and fallback behavior are considered.
- Documentation accurately reflects what was shipped, and the User Manual and Agent API specifications remain 100% synchronized with actual engine capabilities.
- Significant changes are recorded in project documentation and the short changelog; GitHub Pages compatibility and imported sound provenance are accounted for.

## Earlier refactor recommendation

**Refactor v0.1 into small ES modules without changing the musical results or the visual composition.** Extract app state, scheduler, harmony/composition, synth, worlds, and UI handlers. Preserve an easy static run/deploy path; document any requirement for serving ES modules over HTTP. Add pure unit tests for deterministic harmony and step scheduling. Do not add new sound engines, frameworks, or visual effects in this first task.

This is an optional prerequisite, not a requirement to delay the approved sound-bank direction in `PROJECT_MAP.md`. Keep extraction and audio feature patches focused and independently reviewable. Do not commit changes unless the user explicitly authorizes it.

## Current local preferences

Default to COSMIC + DRIFT on first use, but restore validated existing preferences. Scene selection is exclusive to DRIFT. Keep PATTERN and KEY auto-random settings independent. Coalesce full state autosaves in localStorage; retain edit drafts and manual timing, validate size/schema before restore, and fail without losing in-memory work when storage is unavailable. Explain localStorage honestly in the footer information window; do not claim cookies, account identity, cloud sync or legal-compliance certification. Playback remains user-gesture gated after reload.

All current and new user configurations must be persisted in localStorage, including locale and master volume. Every new feature, description, message and accessible label must support both RU and EN; primary browser Russian selects RU, unsupported/unknown language selects EN, and explicit saved choice takes priority. Master volume defaults to 50%, with smooth live gain changes and parity in project files/offline export.

Keep the full header/link area clear of the control menu. Product promotion belongs below the introductory text on wide screens and behind a vertical disclosure at the left edge when that text is hidden. Disclosure is temporary, not a persisted composition setting. Workspace reset requires the app's localized confirmation, clears origin localStorage and reloads defaults; prevent autosave from restoring the discarded state during unload. Test reset using isolated/fake storage, not the user's live composition.

PHRASE controls are a floating window above the bottom transport by default; preserve saved manual placement and support pointer/keyboard movement. Keep the Play button circular across viewport changes. Maintain local original favicon and accurate public-site/search/social metadata without promising crawler indexing or adding remote media.

Decorative backgrounds must share the world center and scale across viewport changes. Avoid nonperiodic texture sampling from raw polar angle, which introduces a ±π seam. Keep shader and CSS fallback centers aligned without affecting audio transport.

Visual-only mode hides UI and drawn labels without changing music, geometry or editor state. Persist it, provide click/tap-anywhere and Escape recovery, and consume the restoring pointer event so it cannot toggle a voice or hidden control.

Do not introduce fonts, images, media or third-party libraries that require paid, restrictive or separately acquired licensing. Use original resources or verified freely redistributable resources, documenting provenance and terms. Product promotion must stay unobtrusive, localized, text-only and free of tracking or unsolicited external resource loading.

## Autonomous HALO Bridge Interaction Protocol

When the user mentions, links, or points to a HALO folder (such as `temp/`, `HALO-Bridge/`, or any directory containing `AGENT_GUIDE.md` / `project-state.json`) and asks to compose, modify, or arrange music in HALO — even with a brief prompt like *"Вот папка от HALO, сочини новогодний джингл на 8 тактов"*:

### 1. Strict 4-Step Execution Sequence (No Deviations)
1. **Read-only discovery**: Read only the connected folder's `AGENT_GUIDE.md`, including its current revision. For edits, inspect the target phrase in project-state.json too. For composition with `halo-score`, read the complete instrument palette and natural/compatible roles embedded in the guide; additional operation schemas are unnecessary. Advanced API references remain optional.
2. **In-memory score**: Use `format: "halo-score"`, current `baseRevision`, named key (e.g. `C major`), and role-keyed `voices` with `notes: [[step, MIDI, ...]]` or percussion `steps`. Choose sound explicitly from the guide for each authored part; compose original notes, accompaniment, rests and development. Automatic sound defaults are a compatibility fallback, not orchestration. Do not reuse generator motif fragments or the syntax example as the user's composition. Use `mode: "replace"` for new music (unmentioned roles silent), `mode: "edit"` to retain unmentioned parts; existing-song edits require `phraseId`. Songs use `phrases` and `sections` in this same notation. Do not mix score notation with operations, schemaVersion, instrument, slot indices or project/values wrappers.
3. **Publish files only**: Write `<folder>/requests/<requestId>.json` directly into HALO's existing requests/. Never create directories or requestId subfolders. If needed, finish/read back voice companions `<requestId>-track-5.json` containing the voice object, reference by basename through `file`, then publish the root JSON LAST. Keep file-tool calls within their harness budget; all eight voices may be scored. On denied file writes, report the exact path and stop rather than creating folders.
4. **5-second verification & self-correction loop**: Wait 4 to 5 seconds and check `<folder>/responses/<requestId>.result.json`:
   - If an error result exists (`"ok": false`), read `"error"`, `"help"`, and `"instructionForAgent"`, correct your batch in-memory, overwrite the request file, and verify again (up to 2 retries).
   - The user supplies only the connected folder and musical brief. Choose an unused request ID, publish directly to that folder, and check actual bar coverage/development before submission. Choose new-music tempo deliberately rather than blindly inheriting it.
   - On pending_approval inspect every scoreReport item: correct unintended omissions within the same two-retry budget; explain intentional silence/repetition without inventing excuses. Technical validation is not musical completion. Missing/stale receipts allow at most three checks 4–5 seconds apart per submission; after edits require a changed submissionVersion. Report actual tempo, declared bars, coverage/rests, warning decisions and fresh status; do not claim completion or listening without evidence.
   - Require `status: "pending_approval"` before reporting a validated proposal; `ok: true` alone does not distinguish pending from applied. `status: "applied"` confirms application; `status: "rejected"` means respect the decision. No response means unconfirmed: report it and ask the user to check the page/folder connection, never infer success. After explicit pending acknowledgement, notify the user to click "Approve" in HALO and end the composition turn. Browser regression explicitly requested by the user may exercise approval as part of its test.

### 2. Hard Negative Constraints (Bridge composition only)

Scope: the following prohibitions apply ONLY to external agents composing or arranging music through an already connected HALO Bridge folder. They do NOT apply to repository development, debugging, or browser regression/visual checks. For development and QA, use ./scripts/preview.ps1 and http://127.0.0.1:8766/ as specified above; opening browsers and running Node tests are allowed.
- **NO LOCALHOST, NO WEBSERVERS, NO PORTS**: HALO is 100% static, client-side, and runs in the user's browser. There is **NO backend server**, **NO local daemon**, **NO CLI tool**, and **NO localhost port** (no port 3000, 3001, 8080, 5173, etc.).
- **NEVER RUN SYSTEM/NETWORK COMMANDS**: DO NOT execute `curl`, `fetch`, `netstat`, `where.exe halo`, `node`, `npm`, `python`, or port scans to test, ping, or execute HALO. There is no `halo` CLI or runner.
- **NEVER LAUNCH BROWSERS OR OPEN URLS**: DO NOT launch Chrome, Edge, Playwright, or open `localhost` / `file://` URLs in browser tools. HALO is already open in the user's browser, connected to the folder via the native Web File System Access API.
- **DO NOT ENDLESSLY POLL FOR HUMAN APPROVAL**: Validation errors are written automatically to `responses/<requestId>.result.json` within 1.5–3 seconds. Only `status: "pending_approval"` confirms the validated batch is waiting for review; absence of a response is not success. Do not enter an infinite loop waiting for the human user to click "Approve" — exit and invite them to approve in HALO.


