# PROJECT_MAP.md — HALO architecture and roadmap

**Status:** prototype with procedural sound banks, 2026-10-12. This document distinguishes **CURRENT** implementation from **TARGET** design. It is the shared product/engineering map for future Codex sessions.

## 1. North star

HALO is an **unobtrusive relaxation constructor**. Eight voices orbit, intersect, pulse, and evolve within one shared musical timebase. Users gently shape a soundscape without musical expertise or the demands of a professional instrument. The geometry is rich enough that repeated loops are not immediately obvious; the sound remains coherent, gentle, and intentionally musical.

**Experience formula:** eight voices + one pulse + bounded harmonic rules + multiple visual worlds + nearly invisible controls.

**Avoid becoming:** an ordinary step sequencer with fancy wallpaper, a complex DAW, a random-noise physics toy, or a passive meditation screensaver.

## 2. Current repository (implemented)

| File | Responsibility |
| --- | --- |
| `index.html` | Static entry, inline UI/transport/visuals and embedded GLSL shader |
| `src/sounds.js` | Eight procedural patch banks, harmony and trigger rules |
| `src/audio.js` | Web Audio synthesis, track routing, effects and bounded event lifecycle |
| `tests/` | Node pure-rule, audio-contract and fake-DOM integration tests |
| `.nojekyll` | Direct GitHub Pages static asset publishing |
| `README.md` | Public introduction, setup, controls, current features |
| `AGENTS.md` | Development constraints and verification rules |
| `PROJECT_MAP.md` | This architecture/roadmap document |
| `CHANGELOG.md` | Short dated record of significant changes and their impact |
| `screenshot.png` / `screenshot-mobile.png` | Desktop and mobile visual references |
| `LICENSE` | MIT license |

### Current runtime subsystems inside `index.html`

- **State:** `instruments`, `scene`, `tempo`, `variant`, `playing`, `pulses`.
- **Composition:** `src/sounds.js` owns `chords`, `notesFor`, `shouldTrigger`, seeded `random01` and patch banks; per-track patterns remain in the entry page.
- **Transport:** `tick`, `schedule`, `getMasterBeat`, `togglePlay`; audio lookahead scheduled from Web Audio time.
- **Synthesis:** `src/audio.js` owns oscillator/noise patches, envelopes, filters, per-track sends, master compression and cleanup; `initAudio`/`synth` in the entry page delegate to it.
- **Visual scenes:** `position`, `draw`, `resize`, WebGL2 nebula shader, Canvas 2D trails, orbits, particles, and hit testing.
- **UI:** `tiles`, `openEditor`, transport/tempo/scene/evolve buttons, keyboard and pointer handlers.

### Current musical behavior

- **8 track slots**; initial active tracks: Glass, Tidal, Root, Ember, Rain.
- Each slot has a dedicated role and procedural patches (30 total); sound selection is independent of visual identity. Character, duration, space, density and level are per-track settings.
- **4/4**, 16 subdivisions per bar, four-bar chord cycle: Dm7 → Bbmaj7 → Fmaj7 → Cadd9.
- Tempo choices: 60/72/84 BPM. Each track has its own existing step pattern, note density, level, and timbre selection.
- A deterministic `variant` affects note choices and note probabilities. Full project serialization does not exist.
- Orbit speed ratios and visual phase offsets create layered motion. **These are not independently looping audio patterns or polymetric meters.**
- Three visual mappings: Orbit, Bloom, Current. Changing scenes does not rewrite the music.

### Current technical limitations

- Audio and sound/composition rules are extracted and tested; transport, state, UI and visuals still live in the HTML entry. This is not the complete target architecture.
- Sounds are original procedural approximations, not recordings of acoustic instruments. External sample loading, asset manifests and AudioWorklet instruments are not implemented.
- Mute ramps track output to silence and prevents future triggers; existing shared reverb tails decay naturally. Sound/duration selection applies to future events; character and space update smoothly on existing routing.
- No persist/share/export, per-step orbit editing, arbitrary custom tempo, or user-designed scales/progressions.
- Pause, browser backgrounding, and tempo changes need systematic cross-browser timing tests.
- WebGL2 is optional, but GPU performance adaptation and reduced-motion handling need work.

## 3. Target architecture (not yet implemented)

Suggested eventual layout (add incrementally rather than introducing everything at once):

- `index.html` — small app entry point and markup.
- `styles/` — layout, interaction, and responsive styles.
- `src/main.js` — initialization and lifecycle.
- `src/core/transport.js` — authoritative beat/step clock, tempo, pause/resume.
- `src/core/sequencer.js` — per-track event patterns, quantization, probabilities.
- `src/core/harmony.js` — key, scale, chords, voice leading, melodic constraints.
- `src/core/state.js` — validated in-memory composition state.
- `src/core/presets.js` — versioned JSON serialization, seed, migration, URL share state.
- `src/audio/engine.js` — AudioContext and signal routing.
- `src/audio/instruments.js` — interchangeable synthesized voice types.
- `src/audio/effects.js` — envelopes, delay, reverb, compression, level safety.
- `src/visual/worlds.js` — scene abstraction; Orbit/Bloom/Current mappings.
- `src/visual/renderer.js` — animation lifecycle, Canvas 2D, optional WebGL2.
- `src/visual/quality.js` — device performance tiers and reduced-motion support.
- `src/ui/controls.js` — transport and accessibility.
- `src/ui/gestures.js` — direct manipulation of tracks and orbital paths.
- `src/data/` — instrument and example universe presets.
- `tests/` — timing, harmony, pattern, and serialization tests.

**Boundary:** composition defines *what* notes happen; transport defines *when*; audio defines *how they sound*; visuals define *how they appear*; UI defines *how the user shapes them*.

## 4. Musical model (target)

### Global transport

One BPM, one monotonic musical position, one authoritative `AudioContext` clock. Default 4/4 and 16th-note grid. All events are quantized and scheduled ahead; visuals use the same published musical position for synchronization. Any free-running ambient animation is decorative only.

### Eight tracks

Each track should eventually have: stable ID, name/color, enabled state, instrument/preset ID, level, pattern length, steps/events, density/probability, octave/register, phrase/seed, and visual mapping. Distinguish **track** from **synth patch**.

### Approved sound-bank direction (2026-10-12)

**Status: first procedural bank stage implemented; external sample banks remain planned.** The eight slots now have dedicated banks with 30 procedural patches in total. Adopt the compact jam-machine principle of **track role → dedicated sound bank → simple tuning**, inspired by [OP-Z track organization](https://teenage.engineering/guides/op-z/tracks). Preserve HALO's calm character and existing object identities; create original sounds and interactions.

The following table defines roles and candidate sounds. Current exact procedural patches are listed below; candidates do not imply included recordings. It does not reorder the existing slots (Glass, Tidal, Root, Ember, Rain, Veil, Moss, Aura).

| Track | Target role | Candidate bank sounds |
| --- | --- | --- |
| ROOT | Low foundation and soft pulse | Rounded bass, deep tone, muted kick |
| MOSS | Wooden percussion | Marimba, kalimba, wooden clicks |
| RAIN | Light rhythmic detail | Shaker, brushes, drops |
| EMBER | Plucked tones | Soft string, harp, warm pluck |
| GLASS | Ringing accents | Bells, vibraphone, glass tones |
| TIDAL | Harmonic bed | Airy pad, organ, slow chords |
| VEIL | Sustained textures | Bowed tones, drones, soft ensemble |
| AURA | Environmental atmosphere | Wind, water, rustle, quiet field recordings |

**Implemented patch banks:** GLASS: Soft bell / Vibes / Crystal; TIDAL: Air pad / Soft organ / Warm tide; ROOT: Round bass / Deep tone / Soft kick; EMBER: Soft string / Harp glow / Warm pluck; RAIN: Shaker / Brush / Drops; VEIL: Bowed veil / Low drone / Ensemble; MOSS: Marimba / Kalimba / Wood click; AURA: Wind / Water hush / Rustle. All are original oscillator/noise synthesis, including environmental textures.

- Keep exactly eight tracks, colors, and Orbit/Bloom/Current. Track role, selected bank sound, synthesis/sample engine, level, pattern, and visual identity are distinct state fields.
- Start with small curated banks. Use original synthesis and verified CC0/public-domain samples; synthesis remains available if samples fail to load.
- The small object editor offers sound selection and **character, duration, space**, alongside density and presence. Map character to suitable timbre controls, duration to a bounded envelope, and space to a controlled effect send. Parameter mappings can differ by sound; do not expose a permanent mixer.
- Pitched sounds follow shared harmony and appropriate registers. Unpitched percussion and environmental recordings use role-specific event rules instead of arbitrary chord transposition. No triggering from visual collisions or animation frames.
- Host samples locally, load only required resources, and bound decoded-buffer memory, polyphony, and effect tails. Bank changes must not reset the transport; loading failure must leave playback usable and communicate the fallback.
- Keep default output restrained. Verify all-eight-track gain headroom, cleanup, and smooth sound/parameter transitions; actual listening is required before claiming audio quality.

**Rights gate:** original procedural synthesis or externally sourced CC0/public-domain recordings only. Reject payment/permission requirements, attribution obligations, non-commercial limitations, and restrictions on redistribution inside the app. “Free” and “royalty-free” alone do not qualify. Freesound is a discovery source, not a blanket-approved library: verify every selected file. Before importing, record local filename, source URL, author, rights status, and saved rights evidence in an asset manifest. Do not assume a library's code license covers its sounds. References: [CC0](https://creativecommons.org/publicdomain/zero/1.0/), [Freesound FAQ](https://freesound.org/help/faq/).

**First implementation scope:** dedicated roles, small sound banks, and simple timbre tuning; only extract code needed to keep this change testable. Save/share, orbit editing, new visual effects, and additional track slots are separate work. Validate deterministic harmony/event rules, sample loading/failure, bounded voice lifecycle, switching without clicks, keyboard/touch controls, mobile layout, and static project-path deployment. Record performed checks and untested devices explicitly.

### Controlled complexity

- Start with a small, consonant chord vocabulary; broaden harmony only with musical constraints.
- Support different loop lengths or subdivisions per track later (**true polymeter/polyrhythm**), while sharing the same global transport.
- Use seeded generation for reproducibility; do not let animation frame timing affect selected notes.
- Prefer tasteful voice leading, dynamic range limits, and space between events over random note floods.
- Default composition must sound balanced with no manual mixing.

### Visual-to-musical interaction (target UX)

- Tap a body → enable/select its voice; long-press or drag → manipulate its behavior.
- Drag along a closed orbit → change rhythmic events or note probability with musical quantization.
- Change orbit size, shape, proximity, or interaction → map to a clearly defined parameter (density, register, timbre, or send), with smooth interpolation.
- Keep results reversible and explainable by subtle feedback, **without turning the main view into a control panel**.
- Use phase shifts, Lissajous-like nested trajectories, trails, interference, depth, and gentle shader noise to avoid an obvious visual loop. Never use arbitrary animation timing to trigger sound.

## 5. Visual direction

**Mood:** mysterious, celestial, weightless, premium, almost tactile. Deep navy/black space, restrained bioluminescent colors, bloom, soft depth, glass-like highlights, slow particles, and elegant motion.

**Three initial worlds:**

1. **Orbit** — nested closed elliptical trajectories, luminous bodies, harmonic resonance.
2. **Bloom** — organic petals, radial interference, growing and fading light structures.
3. **Current** — flowing closed paths, wave distortions, currents, and trails.

All worlds render the **same** composition state and musical phase. Target desktop smoothness without sacrificing mobile battery. Provide quality tiers and an accessible reduced-motion mode. Avoid high-frequency strobing and unreadable controls.

## 6. Milestones (priority order)

The approved immediate priority is the sound-bank direction above (M3), with focused stabilization/extraction where needed. The original milestone IDs remain for reference; persistence and a full refactor are not prerequisites for beginning sound-bank work. The initial documentation update changed no runtime behavior. The subsequent implementation completes only the procedural bank/tuning portion of M3; sample banks and listening acceptance remain open.

| Milestone | Deliverable | Acceptance |
| --- | --- | --- |
| **M0 — Stabilize** | Source extraction, event/state boundaries, reproducible local launch | Existing eight voices, three scenes, Play, tempo, and editor still work |
| **M1 — Save a universe** | Versioned JSON preset, local save/load, URL import/export | Same seed/settings restore the same note/event structure |
| **M2 — Play the geometry** | Orbit gestures, musical mapping, undo/reset | Users modify at least two parameters in-scene without opening an inspector |
| **M3 — Sound roles and banks** | Eight dedicated roles, curated synthesis/CC0 banks, character/duration/space tuning | Balanced mix, smooth transitions, bounded resources, per-asset rights evidence, shared transport preserved |
| **M4 — Richer worlds** | Higher-quality scenes, adaptive rendering, accessibility | Audio unchanged across scenes; mobile fallback works smoothly |
| **M5 — Publish/share** | PWA/offline, curated presets, public static hosting | Works offline after installation; compositions can be shared by link |
| **M6 — Creator features** | Optional WAV export, MIDI, deeper editing | Advanced features are optional and never clutter the default UI |

## 7. Quality gates

- **Musical:** no drift between tracks during a 10-minute playback check; scene changes do not alter notes, tempo, or step phase.
- **Audio:** no clipping or sharp clicks under normal interaction; polyphony and effect tails remain bounded.
- **Interaction:** Play works only after user gesture where required; touch and keyboard control remain functional.
- **Graphics:** WebGL2 failure degrades gracefully; no unbounded particle growth or duplicate render loops; mobile has a lower-cost path.
- **Reproducibility:** presets serialize composition state with schema version and generation seed; visuals may differ cosmetically but music does not.
- **Maintenance:** pure musical logic covered by tests; no undocumented background services or secret keys.
- **Hosting:** every completed feature works on GitHub Pages under `/<repository>/`, without a backend, mandatory build step, runtime CDN, secrets, or server rewrites. Assets/modules/samples use relative paths and are hosted in the repository. Test actual Pages deployment when available; a local static check alone does not prove publication.
- **Documentation:** every major or consequential behavior, architecture, audio, asset, compatibility, or deployment change updates PROJECT_MAP, user-facing README instructions where applicable, and a short dated CHANGELOG entry in the same patch. Describe impact, verified checks, and known limits; proposals remain marked as planned.

These are target criteria, **not** claims of completed testing.

## 8. Earlier refactor recommendation

**Goal:** migrate the monolithic v0.1 `index.html` into focused ES modules while preserving the exact visible and audible behavior.

**Required outputs:** a minimal static entry page, separated state/transport/composition/synth/visual/UI modules, deterministic logic tests, refreshed documentation, and a brief manual smoke-test report.

**Constraints:** no new audio features, new visual themes, React/Vue, backend, runtime CDN, or forced build step. Keep GitHub Pages compatibility. Do not change the eight-track defaults, current chord cycle, or control scheme.

This earlier sequence is superseded by the approved sound-bank priority in section 4. M1 remains planned; avoid bundling full extraction, persistence, sound-bank development, and visual changes into a single patch.

## 9. Decision and change record

- **2026-10-12 — Product direction:** position HALO as a relaxation constructor; approve eight distinct sound roles, dedicated banks, and simple tuning. These are targets; the runnable v0.1 is unchanged.
- **2026-10-12 — Asset and hosting boundaries:** require original synthesis or verified CC0/public-domain sounds and static GitHub Pages compatibility. README now contains initial publishing, updating, verification, and rollback instructions.
- **2026-10-12 — Documentation policy:** significant changes must be reflected here and in a short CHANGELOG; update README for user-visible impact. Documentation inspection does not establish audio, device, or production acceptance.

- **2026-10-12 — Procedural bank implementation:** added 24 original patches across eight roles, character/duration/space tuning, ramped track mutes including canvas toggles, keyboard editor access, scrollable controls, and focused audio/composition extraction. Shared clock, initial active slots, chord cycle and visual worlds remain; the audible defaults change because roles now use dedicated sounds.
- **Validation:** seven Node tests pass (`node --test tests/sounds.test.cjs tests/app.test.cjs`), covering harmony/determinism, patch lifecycle and parameter extremes with fake Web Audio, static script paths, fake-DOM editor/scenes and pause/resume/late-tick wiring. `git diff --check` passes. Browser connection failed; local-file browser navigation was denied by URL policy. No listening, real-browser/mobile visual acceptance, ten-minute timing run, actual Pages deployment, commit or publication was performed.
- **Known remaining limits:** CC0 samples and sample-loading/failure handling remain planned; no external sounds were imported. Four tracked events per voice plus short stolen-event release tails; compressor and conservative gains are not a proof of absence of audible clipping. Existing CSS reduced-motion support does not yet stop decorative Canvas/WebGL motion. Full modular extraction and persistence remain future work.
- **2026-10-12 — Browser access recovered:** current in-app Browser/Computer Use API works with a loopback HTTP server outside the Windows socket-restricted sandbox. The earlier legacy adapter reported an unavailable trusted native bridge; `file://` was independently denied by browser URL policy. No security policy or plugin files were altered. Added `scripts/preview.ps1` and README/AGENTS instructions for repeatable checks.
- **Live browser coverage:** checked Play UI startup, pause/resume, Orbit/Bloom/Current switching, eight editors and 24 sound selectors, character/duration/space controls, desktop 1440×900 and phone-size 390×844 screenshots. Console returned no warning/error entries during these interactions. These checks supersede the earlier browser-access limitation, but do not establish audible quality, physical-touch behavior, Safari/iOS support, ten-minute transport stability, or actual Pages publishing. Preview left paused at `http://127.0.0.1:8766/`; temporary viewport override reset.

- **2026-10-12 — Musical motion and drums:** added an independent DRIFT/IN TIME switch. IN TIME uses regular unrotated elliptical paths with a common right-hand axis; a voice completes a turn between its pattern steps, crossing that axis at each potential event. Bar/beat is drawn at the axis. Actual light accents consume audio timestamps at playback time, fixing the former lookahead-early flashes. Probability-skipped and alternate-bar-silent events can still cross without a light accent. Scene/motion switches do not schedule or change notes; synchronized geometry is shared across the three scene backgrounds.
- **Drum banks:** ROOT adds Punch kick (quarter-note steps 0/4/8/12); RAIN adds Dry snare and Clap (4/12) and Closed hat (2/6/10/14); MOSS adds Closed hat and Low tom (6/14). Kick/snare/hat can run simultaneously on ROOT/RAIN/MOSS, with MOSS enabled. Patch-specific patterns override the original track pattern only while that patch is selected. All six additions are original synthesis; no external assets. Banks now contain 30 patches total (4 ROOT, 6 RAIN, 5 MOSS, 3 each elsewhere).
- **Validation:** ten Node tests cover harmony, trigger rules, all patch audio contracts, lifecycle cleanup, app wiring and musical-axis crossings over 100 bars. Browser checks cover the new motion control and drum selectors; real listening and hardware-output latency alignment remain unverified. Audio output remains on the shared Web Audio transport; display accents are frame-limited (30/40 FPS), not sample-accurate visuals.
