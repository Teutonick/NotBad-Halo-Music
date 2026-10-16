# External-agent / WebMCP acceptance — 2026-10-16

## Environment and scope

Real HALO classic-script app served from this checkout at `http://127.0.0.1:8766/` using Python's static HTTP server (the command used by `scripts/preview.ps1`; PowerShell is unavailable on this Mac). This preview is a development tool, not a product service. Codex used its enabled ChatGPT in-app browser through the supported browser API. No mouse/keyboard emulation, injected page commands, custom browser/CDP runner, model endpoint, fixture server or API key was used for this acceptance.

## Actual native browser results

- Browser discovered all **ten real Site Tools** automatically before any interaction with the Agents panel. The native `document.modelContext` registration path reported available.
- Called `halo_get_context`: read real current state, 62 built-in sounds (30 AMBIENT / 32 REACTOR), role policies, MIDI/key mapping, FX/master controls, unsupported features and metadata for 130 local CC0 recordings. No audio content was returned.
- Codex wrote a **new original eight-bar G-major jingle at 108 BPM**, using built-in AMBIENT timbres and explicit notes. This is a new score, not the earlier F-major fixture. Harmony: G → Em → C → D7 → G → Am → D7 → G. A bell theme/response, lifted second half and spaced tonic ending; rounded bass, harp figures, soft organ chords and restrained pulse/wood/shaker. Texture silent. No motif/ensemble generator or ready-made music was used.
- Submitted one `project.replace` batch, validated successfully, inspected before/after preview, applied, Undo and Redo all returned success. The returned project matched the submitted score. Exported via `halo_export_project` and saved its actual returned object to `artifacts/webmcp/new-year-jingle.halo.json`.
- Reloaded the app: the saved eight bars, G major, 108 BPM, explicit parts and master settings survived local autosave. Native tools re-registered on the new document.
- Applied a subsequent `track.patch` changing only sixth-track reverb: all other tracks and master were identical; Undo restored the complete score. A BPM 201 transaction returned `{valid:false,error:"Invalid numeric value"}` without mutation.
- Playback initially stalled on browser AudioContext activation. Added a guard before requesting audio startup when `navigator.userActivation.hasBeenActive` is false. Re-tested through real `halo_playback`: returned promptly `{playing:false,reason:"AUDIO_GESTURE_REQUIRED"}`. No claim of audible listening or successful transport audio output. User Play remains required in this environment; no browser-policy bypass was attempted.
- Final local page error/warning log was empty. Desktop screenshot at 1280×720: `artifacts/webmcp/agents.png`. Information panel contains no input, select or textarea. A 390×844 CSS viewport check returned clientWidth = scrollWidth = 390; panel fields = 0. Viewport override reset. This is not physical-mobile/Safari acceptance.

## Published site — separate result

Opened `https://teutonick.github.io/NotBad-Halo-Music/`. Native discovery returned **No WebMCP tools available**; published script URLs still included the former `ai-composer.js` / `ai-composer-ui.js` build. This change has **not** been committed, pushed or deployed. Updated public end-to-end acceptance remains pending deployment; local success is not reported as published success.

## Page-context fallback — separate result

The current Codex browser documents `playwright.evaluate` as **read-only page scope**. It exposes DOM snapshots rather than arbitrary live page-global execution. Therefore an end-to-end call to `window.HaloSiteTools.callTool` / `window.HaloAgentAPI` is unavailable in this browser integration. No mouse/keyboard substitute or alternate security bypass was used. Automated tests cover fallback discovery, preview without mutation, batch application, export, Undo/Redo, stale/invalid input, cancellation and native-registration failure. This does not count as live fallback acceptance. An agent with genuine authorized page-JavaScript execution can use the documented bridge.

## Automated and static checks

`node --test tests/*.test.cjs`: **208 passed, 0 failed**. Includes actual saved score portability/scale/exactness, native/fallback contracts, current-vs-legacy registration, abort/BFCache lifecycle, audio-activation guard and existing musical/transport/persistence tests. `git diff --check` clean. New runtime scripts use only relative classic-script paths; no dependencies, external samples or deployment rewrites added. Musical engine and imported sound provenance unchanged. RU/EN manual, README, PROJECT_MAP, engine registry, API specification and changelog synchronized.

Not tested: Safari/iOS, physical touch devices, native Chrome separate connector (not available), audible quality and actual playback after user activation. Session Undo history intentionally does not survive reload. Browser WebMCP is evolving and requires both a capable browser and agent.
