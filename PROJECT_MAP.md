# PROJECT_MAP.md — HALO architecture and roadmap

**Status:** v0.1 prototype, October 2026. This document distinguishes **CURRENT** implementation from **TARGET** design. It is the shared product/engineering map for future Codex sessions.

## 1. North star

HALO is a **musical constructor of closed universes**. Eight instruments orbit, intersect, pulse, and evolve within one shared musical timebase. Users create calm compositions through direct manipulation of the world. The geometry is rich enough that repeated loops are not immediately obvious; the sound remains coherent, gentle, and intentionally musical.

**Experience formula:** eight voices + one pulse + bounded harmonic rules + multiple visual worlds + nearly invisible controls.

**Avoid becoming:** an ordinary step sequencer with fancy wallpaper, a complex DAW, a random-noise physics toy, or a passive meditation screensaver.

## 2. Current repository (implemented)

| File | Responsibility |
| --- | --- |
| `index.html` | Complete zero-dependency v0.1 application: HTML, CSS, JavaScript, embedded GLSL shader |
| `README.md` | Public introduction, setup, controls, current features |
| `AGENTS.md` | Development constraints and verification rules |
| `PROJECT_MAP.md` | This architecture/roadmap document |
| `screenshot.png` / `screenshot-mobile.png` | Desktop and mobile visual references |
| `LICENSE` | MIT license |

### Current runtime subsystems inside `index.html`

- **State:** `instruments`, `scene`, `tempo`, `variant`, `playing`, `pulses`.
- **Composition:** `chords`, `noteForTrack`, per-track `pattern` arrays, seeded `random01` variations.
- **Transport:** `tick`, `schedule`, `getMasterBeat`, `togglePlay`; audio lookahead scheduled from Web Audio time.
- **Synthesis:** `initAudio`, `osc`, `synth`, `envelope`, `createReverb`; four oscillator-based sound families and shared master chain.
- **Visual scenes:** `position`, `draw`, `resize`, WebGL2 nebula shader, Canvas 2D trails, orbits, particles, and hit testing.
- **UI:** `tiles`, `openEditor`, transport/tempo/scene/evolve buttons, keyboard and pointer handlers.

### Current musical behavior

- **8 track slots**; initial active tracks: Glass, Tidal, Root, Ember, Rain.
- Available synth kinds: Bell, Pad, Bass, Pluck.
- **4/4**, 16 subdivisions per bar, four-bar chord cycle: Dm7 → Bbmaj7 → Fmaj7 → Cadd9.
- Tempo choices: 60/72/84 BPM. Each track has its own existing step pattern, note density, level, and timbre selection.
- A deterministic `variant` affects note choices and note probabilities. Full project serialization does not exist.
- Orbit speed ratios and visual phase offsets create layered motion. **These are not independently looping audio patterns or polymetric meters.**
- Three visual mappings: Orbit, Bloom, Current. Changing scenes does not rewrite the music.

### Current technical limitations

- All implementation is in one HTML file; not modular or unit tested.
- Synth timbres are basic; no sample library or AudioWorklet-based instruments.
- Mute prevents future triggers but currently scheduled notes and reverb tails can remain audible.
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

| Milestone | Deliverable | Acceptance |
| --- | --- | --- |
| **M0 — Stabilize** | Source extraction, event/state boundaries, reproducible local launch | Existing eight voices, three scenes, Play, tempo, and editor still work |
| **M1 — Save a universe** | Versioned JSON preset, local save/load, URL import/export | Same seed/settings restore the same note/event structure |
| **M2 — Play the geometry** | Orbit gestures, musical mapping, undo/reset | Users modify at least two parameters in-scene without opening an inspector |
| **M3 — Better music** | New voice presets, envelope/effects improvements, phrasing | Pleasant default mix, no clicks, bounded volume, believable long listening |
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

These are target criteria, **not** claims of completed testing.

## 8. First task to give Codex

**Goal:** migrate the monolithic v0.1 `index.html` into focused ES modules while preserving the exact visible and audible behavior.

**Required outputs:** a minimal static entry page, separated state/transport/composition/synth/visual/UI modules, deterministic logic tests, refreshed documentation, and a brief manual smoke-test report.

**Constraints:** no new audio features, new visual themes, React/Vue, backend, runtime CDN, or forced build step. Keep GitHub Pages compatibility. Do not change the eight-track defaults, current chord cycle, or control scheme.

**Follow-up task after M0:** implement versioned preset export/import and reproducible URL sharing (M1) before enlarging the synthesizer or GPU renderer.
