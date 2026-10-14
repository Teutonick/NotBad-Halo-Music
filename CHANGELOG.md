# Changelog

## 2026-10-14 — Bilingual product README and live orbital preview

- Replaced the long README with a focused English showcase and matching Russian edition, highlighting existing musical roles, sonic worlds, local generation, arrangement and export.
- Added a real-app looping orbital GIF and refreshed the desktop screenshot. No engine, controls, dependencies or project format changes.


## 2026-10-14 — Cycle and step randomization in GENERATE, 24-key Circle of Fifths with parallel Major/Minor modes, and documentation sync

- **Cycle and Step Randomization in GENERATE ("СОЗДАТЬ"):**
  - Integrated `CYCLE` (length `4..32`) and `STEP` (division `1/16`, `1/8`, `1/4`) into the GENERATE button (`randomizeTrack` in `src/sounds.js`) with musical restraint ("без фанатизма").
  - Anchor rhythm roles (`Pulse`, `Accent`, `Bass`) remain locked to the standard 16-step grid (1/16) in 80–85% of seeds, preserving groove stability and foundation.
  - Textural and polyphonic voices (`Arpeggio`, `Percussion`, `Texture`, `Harmony`) explore organic polymeter (`6, 8, 12, 14, 32` steps and `1/8`, `1/4` divisions) with subtle phase offsets (`0..min(4, length-1)` on Arpeggio/Percussion with 20% probability).
  - Manual step editing continues to override cycle playback and density until cleared.
- **24-Key Circle of Fifths with Parallel Major & Minor Modes:**
  - Expanded key structure from 12 minor keys to **24 tonal centers** (12 minor and 12 parallel major keys) in `src/composition.js`.
  - Arranged as a continuous Hamiltonian cycle alternating relative pairs (0 accidentals difference / identical 7 diatonic pitch classes) and perfect fifth modulations (strictly 1 accidental difference):
    `D MINOR ↔ F MAJOR → C MAJOR ↔ A MINOR → E MINOR ↔ G MAJOR → D MAJOR ↔ B MINOR → F♯ MINOR ↔ A MAJOR → E MAJOR ↔ C♯ MINOR → G♯ MINOR ↔ B MAJOR → F♯ MAJOR ↔ D♯ MINOR → A♯ MINOR ↔ C♯ MAJOR → G♯ MAJOR ↔ F MINOR → C MINOR ↔ D♯ MAJOR → A♯ MAJOR ↔ G MINOR (→ D MINOR)`.
  - Added direct relative mode toggle (`composition.toggleMode()`): clicking the key name `#keyName` in the header or inspector instantly flips between parallel minor and major.
  - Implemented pure diatonic major scale triad and seventh chord construction (`majorScale = [0,2,4,5,7,9,11]`, Imaj7, IVmaj7, V7, iiim7) in `src/phrases.js`, `src/roles.js`, and `src/sounds.js`.
  - Maintained smooth neighborly modulation in `AUTO KEY` with $(K + 1) \pmod{24}$, stepping strictly to adjacent circle neighbors.
  - Updated project validation and decoding bounds to accept `key: 0..23`.
- **Documentation & User Manual Synchronization:**
  - Synchronized Sections 6 and 7 in both Russian and English within the in-app User Manual (`index.html`).
  - Updated `docs/engine-capabilities.md` with the 24-key table, relative pair formulas, major scale intervals, and cycle randomization corridor profiles.
  - Updated `docs/agent-api-specification.md` with `totalKeys: 24`, `transport.toggleMode`, `transport.setKey` range `0..23`, and `phrase.generate` sequence fields.

## 2026-10-14 — Bilingual User Manual, Engine Capability Registry, Universal Agent API Specification, and mandatory documentation sync rule

- **Interactive in-app User Manual (`#guideModal`):**
  - Added dedicated header button `#guideBtn` (`ИНСТРУКЦИЯ` / `GUIDE`) with book SVG icon and bilingual tooltips.
  - Built exhaustive 13-section manual in Russian (`.guide-lang-ru`) and English (`.guide-lang-en`) covering Philosophy, Sound Worlds (Ambient vs Reactor), 8 Musical Roles, Voice Parameters, Spatial FX, Master Transport & Polymeter, Aeolian Circle of Fifths Harmony, Phrases & Step Grid, Song Arranger & 56-bar narrative, Master Section & Spatial Stage, Visual Orbits & Worlds, Storage/Export/Sharing, and Hotkeys.
  - Implemented responsive Table of Contents: sticky sidebar on desktop, horizontal chip bar on mobile (<=700px), smooth anchor scrolling, backdrop click dismiss, dedicated close button, and Escape key dismissal.
  - Connected live to language toggle (`RU/EN`) without page reload.
- **Engine Capability Registry (`docs/engine-capabilities.md`):**
  - Documented complete technical reference for all 8 tracks (`GLASS`..`AURA`), 8 fixed roles, 30 Ambient patches, 32 Reactor presets (130 CC0 PCM samples with SHA-256 hashes and pinned provenance), parameter conversion math, 3-band Master EQ (-9..+9 dB), peak limiter dynamics, and composition limits.
- **Universal Agent API Specification v1.1 (`docs/agent-api-specification.md`):**
  - Adapted ТЗ v1.0 into an architecturally sound specification reconciled with HALO's actual codebase.
  - Specified Capability Registry schema, project state inspection, declarative JSON operations (`track.*`, `phrase.*`, `composition.*`, `master.*`, `visual.*`), optimistic concurrency revision tracking, atomic commits, shadow preview pipeline, and client-side zero-backend AI Composer architecture.
- **Mandatory Documentation Synchronization Rule:**
  - Added Rule 13 to `AGENTS.md` and updated step 8 and Definition of Done: any functional expansion or engine change strictly requires updating the User Manual (`index.html`) in RU/EN, `docs/engine-capabilities.md`, and `docs/agent-api-specification.md`.

## 2026-10-14 — Compact BPM input, cleaner transport phrase caption, and muted brand prefix

- Compacted the BPM input box by approximately 2x (to 40px width with centered text) so that 3 digits fit neatly and compactly without excessive empty space.
- Removed the redundant "Фраза: " / "Phrase: " label prefix from the transport caption under the Play button, displaying simply the clean phrase name (e.g. "Фраза1", "Куплет", or custom user name).
- Styled the "NotBad" prefix in the topbar brand header with `var(--muted)` to match the color and tone of the subtitle ("Конструктор музыки" / "MUSIC CONSTRUCTOR") below it, accentuating "HALO" as the primary title.

## 2026-10-14 — Musical loop generation: protected anchors, role corridors, register tiering and organic surprise

- **Protected anchors & accent-weighted density:**
  - Preserved downbeat step 0 for foundation rhythm roles (`pulse`, `bass`, `kick`) whenever `density > 0`, eliminating hollow, broken bar openings.
  - Anchored bar downbeats (`step % 16 === 0`) at `density >= 35` for rhythmic foundation voices.
  - Implemented accent-weighted density thinning: notes with high motif accent (`>= 0.85`) receive higher survival weight (`1.25x`), keeping the core musical motif intact as density decreases, while off-beat 16th syncopations and ghost hits thin out first (`0.82x`).
  - At `density >= 100`, all candidate notes fire. Seed-based pseudo-random syncopations preserve natural organic variation, breathing room, and human feel.
- **Role-aware parameter corridors & wildcard chaos:**
  - Replaced uniform blind random sampling (`20..100%`) in `randomizeTrack` with role-specific acoustic corridors: punchy low-space bass/kick, tucked transient percussion, gentle ambient textures, shimmering articulated arpeggios, and prominent singing leads.
  - Introduced deterministic wildcard serendipity: ~16% of tracks receive an expanded range (`[20, 100]`), allowing occasional unexpected timbres, dramatic staccatos, or wide spatial washes without breaking mix stability or test contracts.
- **Acoustic register & frequency separation:**
  - Separated Melody and Arpeggio registers in `src/roles.js`: Arpeggio occupies the mid-register (`pitch + 12`), while Melody sings in the upper register (`pitch + 24`), ending unison clashing and providing clean voice leading alongside bass (`pitch - 12`) and harmony pads (`chord`).
- **Curated vibe archetypes in arrangement:**
  - Enhanced `randomizeArrangement` with 5 stylistic archetypes (Driving Heartbeat, Lush Atmosphere, Floating Half-time without kick, Syncopated Groove, and Arp Motion).
  - Guarantees foundation (Bass), lead narrative (Melody), harmonic glue (Pad/Texture), and rhythmic engine, while varying across 16+ distinct active voice masks and musical sends (0–50%).
- **Vibrant first-launch preset:**
  - Initialized default active voices in `index.html` to include Pulse (0), Shaker (2), Bass (4), Melody (5), Arpeggio (6), and Harmony pad (7), so first-time users hear an immediate, polished, rhythmic soundscape upon pressing Play.

## 2026-10-14 — Relocate REPEAT to transport panel with dual-mode phrase/composition looping

- Moved the REPEAT button from the bottom of the screen to the transport panel directly adjacent to BPM as a stylish icon button with an intuitive loop symbol.
- Implemented independent dual-mode repeat behavior:
  - In Instruments mode (`mode === false`): controls phrase repeat (`phraseRepeat`), looping the current phrase (default: ON / `true`). When disabled, playback plays through the phrase cycle and gracefully finishes at the phrase boundary on the audio clock.
  - In Composition mode (`mode === true`): controls full composition repeat (`song.repeat`), looping through all sections continuously (default: OFF / `false`).
- Maintained completely independent persistence: phrase repeat persists in `halo-phrase-repeat` and autosave UI preferences, while composition repeat persists in `halo-composition-v1` and portable composition JSON.
- Added full bilingual RU/EN labels and tooltips (`Повтор фразы` / `Repeat phrase`, `Повтор всей композиции` / `Repeat entire composition`, with `· ВКЛ/ВЫКЛ` / `· ON/OFF` status).

## 2026-10-14 — Dedicated phrase rename icon, unified confirm dialog, and strict Spacebar play/pause

- Reduced the click area for renaming phrases: clicking phrase cards or titles now reliably selects/cues phrases without accidental inline rename triggers; renaming is activated via a dedicated pencil icon (✎).
- Replaced native browser `window.confirm` for phrase deletion from composition and workspace reset with a unified, styled modal dialog matching the app's translucent design, complete with bilingual RU/EN support, focus trapping, danger button styling, and Escape/backdrop dismissal.
- Bound the Space key strictly to Play/Pause toggle with `preventDefault()`, eliminating accidental activation of the last clicked button or slider, while preserving normal space typing in text inputs and textareas.

## 2026-10-14 — Bound shared input and name phrases

- Strict URL token/fragment checks and streaming decompression limits; safe bounded phrase IDs/names, numeric seed rollover and constant-time harmony jumps.
- Inline phrase naming, sequential phrase numbers, transport phrase caption and custom scrollbar without native arrow buttons.

## 2026-10-14 — Continuous phrase/composition playback

- Panel switching preserves playback: Instruments loops the current phrase, Composition follows sections. Optional persisted REPEAT restarts the full composition.
- PHRASE is the first-use view; compact aligned rocker and narrow themed editor scrollbar.

## 2026-10-14 — Develop the authored verse and vary generated ensembles

- GENERATE now changes active voices and restrained per-track FX (0–50%), retaining bass/melody anchors and master/cycle settings.
- Replaced event-thinning arrangements with role/ensemble-based development: intact first verse, developed accompaniment, independent second verse/bridge, three linked choruses, intro/outro; main event pitches are retained.
- Added bounded optional note frames to version-1 files and expanded bounded autosave capacity, preserving muted exact material and older projects. No backend or new dependency.

## 2026-10-14 — Queue phrase selection during composition playback

- Card clicks keep Composition visible and queue the selected phrase after the current phrase cycle, with last-click-wins behavior and localized pending indication.
- Audio context and scheduler continue; paused selection remains immediate. Live navigation does not alter the saved arrangement or offline export order.

## 2026-10-14 — Compact headers and aligned panel rocker

- Removed spaces in HALO branding, put EQ captions/values on one line, and moved phrase names onto the drag/delete header row.
- Shortened phrase cards and aligned the two side-switch buttons to the visible card/track area in both panel modes, including wide screens.

## 2026-10-14 — Composition cards and side rocker

- Replaced tab/action rows with a side rocker and card-local +/×/variation/repeat controls; added pointer drag and Alt+arrow keyboard reordering.
- Bounded short-screen panels, hid phrase overlays during Composition and kept default editor/promotion clear of transport.
- Verified 119 Node tests and in-app browser pointer/layout checks at 1440×900, 390×844 and 320×568. Physical touch/Safari/iOS and listening remain unverified.

## 2026-10-14 — Phrase-based composition arranger

- Added localized Instruments/Composition lower-panel views, deterministic source-loop arrangement, linked repeats and independent variations; right instrument editor remains available.
- Added ordered sections, repeat counts, local persistence, validated JSON/share links, audio-clock transitions, fades and whole-composition offline export. Old loop files remain supported; static GitHub Pages requires no backend or new dependency.
- Model/DOM/export contracts verified automatically; real-browser layout, audible and device acceptance remain pending because browser/loopback access failed.

## 2026-10-14 — Circle of Fifths neighboring key switching and H A L O header capitalization

- Circle of Fifths harmonic proximity for key changes (`src/composition.js`, `index.html`):
  - Verified that `HaloComposition.keys` is strictly ordered by ascending perfect fifths (`D, A, E, B, F♯, C♯, G♯, D♯, A♯, F, C, G`), conforming mathematically to the Circle of Fifths (each neighbor step = +7 semitones modulo 12).
  - Added native `prevKey()` method to `HaloComposition` to step counter-clockwise to the subdominant neighbor (-1 step on Circle of Fifths).
  - Updated `autoKey` loop transitions in `HaloComposition` to advance strictly to adjacent neighboring keys on the Circle of Fifths (`(key + 1) % 12`), ensuring smooth harmonic modulations differing by at most 1 accidental.
  - Linked manual `keyNext` and `keyPrev` buttons to `queueAutosave()` so key adjustments persist to localStorage immediately.
  - Added comprehensive unit test in `tests/composition.test.cjs` validating Circle of Fifths ordering and adjacent neighbor transitions for both manual and automatic key switching.
- Header capitalization (`index.html`):
  - Updated brand link text in the top header from "NotBad Halo" to "NotBad H A L O" in uppercase letters as requested.

## 2026-10-13 — Doubled instrument base volume, compact editor without scrollbar, and SHARE hash cleanup

- Doubled base instrument volume multiplier in `src/audio.js` (`* 4` instead of `* 2`):
  - At default 50% master volume, playback output now matches the volume previously achieved at 100% master volume.
  - The downstream master compressor (-1 dBFS threshold, 20:1 ratio, 2ms attack) continues to provide clean peak protection against digital clipping distortion.
- Redesigned and compacted the instrument settings editor (`.editor`):
  - Removed the redundant "COMPATIBLE SOUNDS" ("СОВМЕСТИМЫЕ ЗВУКИ") label above the sound family dropdown.
  - Reduced slider typography size to 8px and compressed slider vertical margins and gaps, cutting slider height by more than half.
  - Tightened preset buttons, cycle controls, and panel padding so the full editor fits comfortably within the viewport without vertical scrollbars.
- Cleaned URL hash on shared link import:
  - After loading and restoring a shared loop via `#loop=...`, `window.history.replaceState` removes the hash from the browser address bar.
  - Prevents accidental re-application of the initial shared preset on subsequent browser refreshes (F5).
- Updated tests in `tests/sounds.test.cjs`, `tests/app.test.cjs`, and `tests/i18n.test.cjs`. All 106 tests pass.

## 2026-10-13 — Shared FX buses (Reverb, Delay, Chorus) with instrument sends

- Added three shared FX effect return buses in Web Audio routing with individual send levels for each of the eight instruments:
  - Reverb (Пространство): stereo convolver with subtle highpass (140 Hz) and damping lowpass (7500 Hz) filters on wet return (~0.20 gain) for lush spatial depth without low-end mud; unified bidirectionally with the existing per-instrument `space` parameter.
  - Delay (Музыкальное эхо): BPM-synced delay bus with 4 selectable rhythmic taps (`1/16`, `1/8`, `1/8 dotted`, `1/4`), bounded feedback gain (0.36) through a 3400 Hz damping lowpass filter into a master wet return (0.52 gain). Per-instrument send level (0–100%) and delay time division selector.
  - Chorus (Объём и движение): dual modulated delay lines (Left 18ms, Right 24ms) modulated by dual quadrature sine LFOs (0.65 Hz / 0.82 Hz, ~2.4ms depth) with wide stereo panning (-0.7 / +0.7) and gentle wet return (0.50 gain) for rich shimmer and stereo width. Per-instrument send level (0–100%).
- Updated instrument settings editor with a tabbed mode switcher (`SOUND` / `FX`):
  - In `SOUND` mode, existing character, duration, space, density, and presence controls are displayed.
  - In `FX` mode, Reverb send, Delay send, Delay time division selector (`1/16`, `1/8`, `1/8D`, `1/4`), and Chorus send controls are displayed.
  - Smooth live parameter adjustment via pointer scrubbing and standard slider interaction.
  - Reverb send and Sound Space sliders stay in sync bidirectionally.
- Audio transport synchronization: `HaloAudio.setTempo` smoothly ramps delay tap times when BPM changes; offline WAV/MP3 rendering passes tempo into `HaloAudio.create` for sample-accurate tempo-synced delay in export.
- Project persistence and share compatibility: `HaloProject` serializes, validates, encodes and decodes `delay`, `delayTime`, and `chorus` per track, maintaining backward compatibility with legacy projects and autosaves (defaults to 0 / '1/8' / 0).
- Full RU/EN localization: `FX`, `REVERB` / `РЕВЕРБЕРАЦИЯ`, `DELAY` / `ДИЛЭЙ`, `DELAY TIME` / `ВРЕМЯ ЭХА`, `CHORUS` / `ХОРУС`, plus descriptions and tooltips in both languages.
- Unit and integration tests in `tests/app.test.cjs`, `tests/project.test.cjs`, and `tests/i18n.test.cjs`. All 106 tests pass.

## 2026-10-13 — Client-side static URL loop sharing via SHARE button

- Added a `SHARE` button to the end of the `PROJECT` controls button group in the UI.
- Implemented client-side project encoding and decoding without a backend, fully compatible with static GitHub Pages hosting:
  - Generates a compact URL hash fragment (`#loop=<token>`) using standard browser `CompressionStream('deflate-raw')` / `DecompressionStream('deflate-raw')` and URL-safe base64.
  - The token is ~780 characters, fitting comfortably within URL and browser limits.
  - Clicking `SHARE` copies the shareable URL to the clipboard and shows a localized toast notification.
  - Opening the link or navigating hashes dynamically decodes and applies the exact loop configuration (tempo, key, seed, setup, world, tracks, mutes, mix, master volume, and manual/generated step sequences).
  - Playback remains strictly paused on load until explicit user gesture, adhering to audio context security standards.
- Full RU/EN localization: `SHARE` / `ПОДЕЛИТЬСЯ`, tooltips and status toasts.
- Added pure unit tests in `tests/project.test.cjs` and integration test in `tests/app.test.cjs`. All 80 tests pass.

## 2026-10-13 — Schematic role glyphs on instrument cards

- Replaced abstract concentric circles on the eight instrument cards with light, schematic vector drawings matching each role's musical theme:
  - Pulse: audio impulse response / heartbeat transient waveform with accent dot.
  - Accent: 4-pointed dynamic accent burst star with core and spark dots.
  - Percussion: hi-hat cymbal pair with center rod and side rhythmic ticks.
  - Texture: undulating atmospheric drift layers with ambient particle accents.
  - Bass: deep sub-frequency sine wave with sub-harmonic contour and baseline.
  - Melody: beamed eighth notes with tilted heads and soaring melodic line.
  - Arpeggio: stepped staircase sequence ladder with note markers on each step.
  - Harmony: four-note chord stack united by a musical chord brace and resonance ray.
- Vector graphics use light `1.4px` line weights, inherit track tone colors via `currentColor`, and scale down cleanly on mobile screens (`26px`/`24px`).
- Exported `HaloRoles.glyphs` and `HaloRoles.glyph(track)` helper; added pure unit tests in `tests/roles.test.cjs`. All 78 tests pass.

## 2026-10-13 — Input bounds, pointer adjustment and EQ correction

- Added bounded mouse adjustment of numeric fields, strict range/step validation and early oversized project/autosave rejection. Kept native keyboard/touch and saved settings.
- Instrument buttons wrap into two columns; cycle/BPM controls have more room. Added twelve localized delayed caption tooltips.
- Removed EQ boost compensation that attenuated the whole mix. Retuned master compression to near-peak protection, shared by playback and export. 100 Node tests pass; fresh browser/audio acceptance is limited by localhost timeout.

## 2026-10-13 — Universal roles and polymetric cycles

- Added eight fixed musical roles and a shared transport/instrument panel for AMBIENT and REACTOR. Sound compatibility governs manual selection; role/world affinity governs GENERATE. Native defaults retain the existing 62 presets.
- Generator 3 preserves the motif/ensemble library while enforcing role registers and mono/three/four-note voice limits. Optional independent cycle lengths, grid speed and offsets share the audio clock and harmony.
- Saved role/cycle/exact-mode metadata and absolute phrase position; preserved generator 1/2 restoration. Preview and offline export follow the same phase. Added 9 role regressions; 93 total Node tests pass. Fresh browser/audio acceptance remains outstanding.

## 2026-10-13 — Local phrases, ensembles and free instrument assignment

- Added generator 2 with ten original motif families for each of 14 musical roles and ten ensembles per AMBIENT/REACTOR world. Generates coherent 4/8-bar note/rhythm development locally without a neural service, model download, new sound assets or dependencies.
- Separated instrument bank from the eight stable orbit IDs. The editor now allows any same-world bank on any orbit and shows the current ensemble/motif. Compatibility matrices permit duplicates with shared activity/headroom; relocated bass/kick stay near center.
- Persisted allowlisted instrument/generator identifiers across project files, autosaves and phrase-step saves. Old projects retain legacy music until explicit regeneration; live scheduling, preview and export share the new phrases. Added catalog, note-range, matrix, persistence, scheduling, export and RU/EN regressions. Listening/browser/device acceptance remains separate.

## 2026-10-13 — CC0 recordings and compact PROJECT menu

- Replaced REACTOR procedural instruments with 130 local CC0 recordings covering its 32 presets; actual drums, electric guitar/bass, upright piano and sampled synth timbres. Preserved preset IDs and documented source authors, pinned downloads, rights evidence and checksums. Some presets share recordings with different processing.
- Lazy classic-script PCM packs preserve direct file opening and GitHub Pages. Playback/export wait for sample decoding; failed loading is explicit and retryable, without a synthesis substitute. Bass octave folds stay in the recorded range while keeping the riff pitch classes.
- Renamed the file group to PROJECT and its buttons to SAVE/LOAD; MP3/WAV are unchanged. RU/EN labels and loading states are covered. No commit or publication.

## 2026-10-13 — REACTOR rock and keyboards world

- Added a second musical setup: 32 original procedural patches across eight dedicated rock/keyboard roles, aligned bass/guitar riffs, sparse fills and lead answers; two piano and two synth variants replace the secondary guitar layer.
- Right-side world switch changes the background, colors and electric trails while preserving orbit geometry. Playback switches at a bar boundary; both worlds retain separate musical settings and drafts. Project files and local audio export identify the active setup; older files remain ambient-compatible. RU/EN and relative, versioned local scripts are included.
- Automated and Chromium checks plus a real non-clipping WAV render establish technical behavior. Realistic sound/listening acceptance and physical Safari/iOS testing remain pending. No commit or publication.

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

- 2026-10-13: Fixed REACTOR GENERATE rhythms and all-bar METAL/TOMS coverage; RIFF/LEAD retain original recorded tails and release smoothly on retrigger. Added regressions; larger CC0 guitar bank (~65.47 MiB total packs).

- 2026-10-13: Replaced REACTOR pattern rotation with seeded rhythmic reconstruction; tests reject rotated copies for every preset while preserving backbeats and bass/riff alignment.

- 2026-10-13: Decoupled REACTOR BASS/RIFF rhythmic generation, including initial patterns. Added all-preset, 128-seed independence regression; harmony remains shared.

- 2026-10-13: Added responsive master transport card with three-band EQ, settings curve and stereo width. EQ/width persist in projects/autosaves and offline exports; strengthened REACTOR kick/snare/tom event gains. Added routing, persistence, export and localization tests.

- 2026-10-13: GENERATE now randomizes every slot's patch and five tuning controls in 20–100%, preserving mutes and master settings. Added deterministic bank/bounds and two-world persistence regressions; RU/EN tooltip/message updated.

- 2026-10-13: Doubled internal track gain for half-master parity with the previous full-master signal. Shortened EQ/stage captions and replaced the setup card with an upper-right SVG mini-orbit; added gain/mute and localization checks.
