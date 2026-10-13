# PROJECT_MAP.md — NotBad Halo Music Constructor architecture and roadmap

**Status:** prototype with procedural sound banks, localized UI and persisted preferences, 2026-10-13. This document distinguishes **CURRENT** implementation from **TARGET** design. It is the shared product/engineering map for future Codex sessions.

### Implemented update — 2026-10-13

- Upper-right maximize-style button enables persisted visual-only mode: CSS hides interface, overlays and promotion while Canvas skips bar/beat text. Audio/world geometry/composition and editor visibility state are preserved. Captured pointer interaction restores UI without muting a voice; Escape restores focus to the button. Music shortcuts are ignored while hidden. This is interface immersion, not a browser Fullscreen API request. RU/EN covers accessible button/tooltip; older saves show UI by default.
- Nebula shader now receives orbit `origin` and `worldScale` from the Canvas world, with the WebGL Y-axis conversion and device-size-independent scale. Continuous rotated Cartesian noise replaces direct `atan` angle sampling, eliminating its ±π branch-cut seam. Angular sine decorations remain periodic. Cloud brightness fades near the world bounds, while CSS fallback glow/vignette share world center variables. Visual changes do not alter transport, notes or saved composition.
- Local `favicon.svg` recreates the original header orbit emblem. Static head metadata includes canonical public URL, search description, Open Graph/Twitter preview using the existing original screenshot, and WebApplication JSON-LD; descriptions and OG locale follow RU/EN. No external assets are introduced; crawler/indexing results are not claimed.
- PHRASE guide is now a fourth floating window, with a grip and focusable keyboard movement header. Default placement is 14px above bottom transport; dragged/restored positions take priority, clamp on resize and persist in localStorage together with window order. Older three-window preferences remain compatible. Hidden windows retain their positions until reopened. Play has a nonshrinking square footprint through responsive changes.
- Responsive control layout measures the header and menu, retaining a 14px gap below the complete brand/link area and placing the phrase guide below the menu. Wide-window promotions follow the introductory text; narrow/short-window promotions fold beyond the left edge with rotating vertical titles, an accessible disclosure button and an 8-second collapse timer.
- Workspace reset asks for confirmation, cancels pending autosaves, clears localStorage for the current origin, and reloads defaults. Cancellation/storage failure keeps the current workspace; reset must not re-save old state during page unload. RU/EN covers the button, prompt and failure message. Live saved user data is not deleted during browser QA; reset behavior is tested against fake storage.
- `src/i18n.js`: RU/EN interface, dynamic transport/editor/status labels and accessibility text. Primary browser language selects Russian for `ru`, English otherwise; the visual panel switch and saved locale take priority on subsequent visits. Track/product brand names and standard audio formats retain their names.
- `src/products.js`: four local text cards linking Privacy Detector Agent, Video Wallpaper, Filexa and AI360. Rotation is 15 seconds, paused on hover, focus or hidden page; manual next button and current card are saved. No remote media or analytics.
- Master volume 0–100%, default 50%, controls the complete master output with a gain ramp. Stored in autosave and project JSON, applied to offline export; older files without this field load at 50%.
- Header links the [public site](https://teutonick.github.io/NotBad-Halo-Music/), [source repository](https://github.com/Teutonick/NotBad-Halo-Music) and [other projects](https://tnick.cc).
- All current and future configurations must persist in bounded, validated localStorage. Every new feature and description must support RU/EN. Fonts, pictures, media and third-party libraries must be original or verified freely redistributable, with documented provenance; paid, restrictive or separately acquired licensing is prohibited.

Promotion reference: [Wallpaper AuthorProjects.cs](https://github.com/Teutonick/NotBad-Video-Wallpaper/blob/main/windows/src/AuthorProjects.cs), its `MainWindow.xaml.cs` timer behavior, [Privacy AuthorProjects.cs](https://github.com/Teutonick/NotBad-Privacy-Detector-Agent/blob/main/src/PrivacyAudit/Services/AuthorProjects.cs), and the Privacy README for its scanner description. Text is adapted into both locales; no proprietary visuals or sounds are copied.

Validation: Node tests cover locale fallback, dynamic labels, volume bounds, older project compatibility and preference roundtrip. Chromium in-app browser checks both locales, editor text, product links, volume/language restoration and desktop/mobile layout. Native MP3 remains browser-dependent; no physical Safari/iOS or listening validation is claimed.

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
| `src/i18n.js` | Browser locale selection and RU/EN text/accessibility translation |
| `src/products.js` | Localized author product descriptions and fixed external links |
| `src/preferences.js` / `src/project.js` | Validated local preferences and portable project schema |
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
- Local phrase-step saving and portable project JSON import/export exist; BPM is editable from 30–200. Cloud sharing, direct orbit editing and custom progressions remain absent. Minor-key transposition follows the circle of fifths.
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

- **2026-10-12 — Four-bar phrase view:** motion now cycles DRIFT → IN TIME → PHRASE. PHRASE maps one shared revolution to 64 steps / four bars of the harmonic cycle, with a rotating playhead, cardinal bar labels, phrase/bar/beat counter and per-track note markers. Filled markers use the same `shouldTrigger` decisions as audio; hollow markers distinguish skipped candidates, and faint dots mark subdivisions. Muted tracks preview the enabled pattern without producing sound. Notes may vary in later phrases according to the existing position-based seed; this is a phrase view, not newly implemented phrase storage or queued clip launching.
- **Phrase verification:** twelve Node checks pass, including 64-step wrapping, preview/audio rule parity for all 30 patches, muted previews and alternate silent bars. Browser rendering/playback UI checked at desktop and phone-size viewports with console inspection. Geometry is a display of the existing transport, not a clock source. A recent setting change can differ from already scheduled notes during the existing ~160 ms lookahead; audible output latency and physical-device acceptance remain unverified.

- **2026-10-12 — Optional cosmic graphics:** added CLASSIC/COSMIC, independent of scene/motion/audio, defaulting to CLASSIC for an immediate return to the prior appearance. `src/effects.js` draws eight signatures (prism, ribbons, pressure wake, sparks, droplets, silk, spores, helix) with additive Canvas blending, a bounded glow pass and subtle note-driven rings. Optional WebGL2 richness uniform adds flowing nebula light; Canvas effects remain available without WebGL2. No new render loops, retained particles, dependencies or assets.
- **Graphics budgets and validation:** trail sampling/decorations capped at 44/18 desktop, 22/9 narrow-screen, 12/4 reduced-motion; reduced mode disables time-based ornament modulation, extra pulse rings and extra shader light. Original baseline motion remains a known reduced-motion limitation. Fourteen Node checks pass, including finite geometry, balanced Canvas state, reduced workloads and audio independence of the graphics toggle. Live browser checks cover CLASSIC rollback, COSMIC, all eight enabled voices, three scenes and motion modes, desktop and 390×844 screenshots, with no returned console warnings/errors. These checks do not establish maximum GPU use, sustained FPS, battery behavior or physical-device/Safari acceptance.

- **2026-10-13 — Fixed loops and independent automation:** generated rhythmic positions, melody choices, probability decisions and velocities repeat over the selected 4/8 bars by default. NEW PATTERN changes seed/rhythm explicitly; AUTO PATTERN advances once per loop boundary. Circle-of-fifths minor-key previous/next controls and AUTO KEY are independent. Automatic key choices use a separate deterministic sequence and cannot be influenced by enabling pattern evolution. Scheduler retains recent per-loop snapshots so lookahead does not overwrite earlier loop decisions; pitched voices transpose together, unpitched percussion does not.
- **2026-10-13 — Eight-bar phrase editing/save:** PHRASE supports 64/128 steps and corresponding bar divisions. EDIT provides eight voice tabs and a sixteenth-note grid, with draft/cancel/save and keyboard labels. Exact saved events bypass generated density/rest rules but obey mute. SAVE validates and writes schema version 1 to `halo-pattern-v1` localStorage before applying state; it switches AUTO PATTERN off while leaving AUTO KEY independent. Records restore length, steps, sound selections, seed and key on the same origin; other audio/visual settings and auto flags are not persisted. Failed writes retain the draft. Manual generation or enabling AUTO PATTERN replaces manual timing in memory; disk state changes only on a subsequent save. This is partial M1 timing persistence, not full composition export or cloud sync.
- **Validation/limits:** Node checks cover fixed loops, automation independence, cached boundary decisions, transposition, 8-bar wrap, exact manual hits and schema rejection. Browser checks saved an eighth-bar step, verified AUTO PATTERN off/AUTO KEY retained, and restored it plus A minor after reload. Mobile uses horizontal grid scrolling with 44px-high step targets; physical-touch/Safari and listening acceptance remain unverified. Existing bounded lookahead still applies to manual edits. Switching phrase length immediately regroups the shared clock; 4-bar saved timing repeats in 8 bars, while 8-bar timing is cropped for 4-bar playback without deleting saved data.
- **Final checks (2026-10-13):** 22 Node tests pass, including identical default event/pitch sequences across complete loops and save-failure retention. Live eight-bar automatic playback advanced through multiple phrases and changed key with no console warnings/errors returned; save/reload and 390×844 editor layout verified. Preview left paused with restored eight-bar timing, A minor and both automatic modes off. Git diff whitespace check passed; no commit or publishing was performed.

- **2026-10-13 — NotBad rebrand and portable projects:** renamed to NotBad Halo Music Constructor. `src/project.js` validates version-1 settings-only JSON (64 KiB, 4/8 bars, eight known unique voices, bounded finite values and steps), with explicit field copying and no audio/assets or executable content. SAVE FILE captures exact current-loop events; LOAD FILE validates before applying, stops/closes existing audio, resets transport and leaves automatic modes off. BPM supports 30–200 with two decimals; sliders and saved-pattern input are bounded.
- **2026-10-13 — Local audio rendering:** added stereo PCM WAV offline export with one warm-up loop and one exact output loop. Source/voice stealing now respects scheduled event time for offline rendering. Native WebCodecs MP3 support is checked first; the tested browser does not support it and receives an explicit WAV alternative. No third-party LGPL encoder was included, no backend or CDN added. Confirmed actual JSON download/import and 8-bar WAV at 200 BPM (9.6 seconds, stereo 44.1 kHz, nonzero samples, measured PCM peak ~0.047); listening and seamless-loop auditory acceptance remain unverified.
- **2026-10-13 — Window and visual layout:** target world scale increased 1.5× with viewport limits. Voice and phrase editors share a stacking manager outside the shell stacking context; opening/clicking raises them, grips drag with pointer capture, and movement/resize is clamped. NEW PATTERN regenerates the active edit draft. Browser confirmed changed grid, voice z-index above earlier phrase window, and grip-driven repositioning. No assertion of universal layout/security acceptance: phone/landscape viewport checks and malformed-input tests provide bounded evidence.

- **2026-10-13 — Full browser-profile autosave and compact menu:** added `src/preferences.js` validation and a coalesced 250 ms localStorage snapshot covering project settings, raw manual patterns (including retained 8-bar data), seeds, both auto flags, scene/motion/graphics, selected voice, open EDIT draft/tab and dragged positions. Restore is bounded to 64 KiB and preserves generated-vs-manual identity. No identity/account or cookies: scope is browser profile/site origin. Footer question-mark opens a draggable explanation with continued-use agreement and storage errors. Playback restores paused; no audio/telemetry is saved or uploaded.
- **Defaults and controls:** first visit uses COSMIC + DRIFT; existing saved preferences override defaults. Compact labeled PATTERN/KEY/SAVE groups replace the ungrouped buttons; current key sits between arrows. Both auto buttons read AUTO RANDOM within their respective groups. Scene selection is hidden outside DRIFT and its shader mode is neutral in synchronized modes; the chosen DRIFT scene is retained for return.
- **Validation:** 27 tests pass. Browser reload restored BPM 88.5, COSMIC/PHRASE, independent key auto mode, and a modified unsaved eighth-bar EDIT step; scene control was hidden outside DRIFT. Phone viewport layout and storage explanation checked; console returned no warning/error entries. JSON/audio/window features from the prior change remain in place; MP3 remains native-codec-conditional and unavailable in the tested browser. No commit or publication.
