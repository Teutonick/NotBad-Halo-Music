### Implemented — 2026-10-16: File Bridge and Integration Mode Switcher

- Dual agent integration modes in AI / Agents tab: **WebMCP** and **File Bridge**, persisted in `localStorage['halo-agent-bridge-mode']`.
- **File Bridge (`src/file-bridge.js`):** Desktop Chrome and Edge native `window.showDirectoryPicker` integration without servers, polyfills, or external libraries. Fully static on GitHub Pages.
- Automatic context export into `HALO-Bridge/`: `AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, and read-only `project-state.json`.
- Strict incoming request protocol via `requests/*.json` and `responses/*.result.json`:
  - No silent auto-apply: requests are validated, revision-checked, and presented in the UI with explicit «Apply Changes» and «Reject» buttons.
  - Required fields: `requestId`, `schemaVersion: 1`, `baseRevision`, and allowlisted operations array (`track.patch`, `phrase.patch`, `master.patch`, `project.replace`, `composition.replace`, `visual.patch`).
  - Stale revisions rejected (`CONFLICT_REVISION_MISMATCH`), repeated request reprocessing prohibited.
  - Public static `capabilities.json` added at repository root for external HTTP inspection.

# PROJECT_MAP.md — NotBad Halo Music Constructor architecture and roadmap

### Implemented — 2026-10-16: external agents, WebMCP Site Tools and File Bridge

- HALO is controlled by external agents such as Codex, Antigravity, Bionic, Claude. The fourth **AI / Agents** tab provides an integration mode switcher between WebMCP and File Bridge. Embedded chat, provider/model/endpoint/key controls and LLM clients were removed.
- `src/site-tools.js` registers ten WebMCP tools over the internal musical API: context, capabilities, state, batch validation/preview/application, Undo/Redo, playback and portable project export.
- `src/file-bridge.js` manages local folder synchronization via desktop Chrome/Edge `window.showDirectoryPicker`.
- Registry v2 retains the complete built-in catalog, metadata for 130 local recordings, defaults, resolved notes, roles, bounds, FX/master, composition and visual limits. Track 09 PCM, recordings, device IDs and capture permissions are not exposed. External agents control their own model/data policies; HALO has no LLM connection or key storage.
- Supported: exact MIDI, 4/8-bar phrases, 4/4, eight core roles, bounded arrangements, FX/master and existing visual modes. Unsupported: 3/4, per-note duration/velocity, acoustic analysis, orbit reordering/arbitrary geometry. GitHub Pages remains zero-build with relative classic scripts.




### Implemented — 2026-10-15: compact workspace and input window

- Universal persisted workspace fold retains transport; separate Track 09 fold hides advanced controls while keeping mode, primary actions, waveform and steps. `src/live-loop.js` groups existing controls without changing timing.
- Static `audioInputWindow` uses the existing draggable/keyboard window manager; local preferences allow its position/order/open state. Microphone/device controls are shared across all three modes. Latency uses HaloControls mouse scrubbing (0–200 ms), keyboard editing and hidden spinners. Closing the panel does not stop monitoring. No dependency, project schema or asset-path changes.


### Latest implemented update — 2026-10-15: PITCH and selected device inputs

- Track 09 adds PITCH beside LOOP/SLICE: one trimmed 40 ms–8 s window, explicit recorded root C2–C6, diatonic 16-step melody with rests, octave −1/0/+1, bounded ±24-semitone resampling, existing sound/FX/cycle controls, phrase-local persistence and export. No automatic root detection or independent time stretching.
- `src/live-loop.js` shares the PITCH note scheduler between live/offline contexts; `src/song-ui.js` and `src/export.js` pass each phrase key. GENERATE/RANDOM/RESET preserve source root and trim. Captures in PITCH are limited to eight seconds; section transitions finalize the take in the outgoing phrase.
- New classic local `src/audio-input.js` owns microphone/instrument audioinput selection, permission probes, direct input listening, exact device constraints, local device preferences and capture cleanup. All three modes accept import or selected input recording; monitoring is explicit and does not auto-start on reload. Input IDs stay out of project/share state.
- HTTPS/localhost and OS/browser-visible audio inputs are required. Recording is mono through the existing ScriptProcessor pipeline; no system-output/ASIO/MIDI/channel-selector support is claimed. Physical input devices, listening/latency and Safari/iOS still need hardware acceptance. Static relative-script GitHub Pages support remains intact; no external assets or dependencies.
- See `docs/regression-pitch-input-2026-10-15.md` for checks and limitations. Bilingual guide, engine registry, API, READMEs and changelog synchronized.


### Latest implemented update — 2026-10-15: phrase-owned Track 09 and shared restart

- `src/project.js` validates optional `liveLoop` settings and bounded local PCM IDs; snapshots, autosave, arrangement and independent duplicates preserve treatment without sharing mutable settings. Existing repeated phrase references intentionally share edits.
- `src/live-loop.js` keeps an immutable local PCM library, restores only a phrase's layers and reconnects mixer nodes when the AudioContext changes. Undo/current-track clear preserve other phrase references; workspace reset clears the library. Legacy global audio is adopted only by the active phrase at startup. Unreferenced PCM remains until full reset.
- `src/song-ui.js` selects Track 09 at section boundaries on the same audio timestamp as the eight instruments. All listed sample edits request the authoritative phrase restart; with Instant Restart disabled, loop/window/pitch/reverse edits wait for the next 4/8-bar phrase boundary.
- `src/export.js` renders each phrase's layer references and treatment at its own song position. JSON/share links carry no PCM and cannot transfer recordings to another browser. Missing local layers are silent.
- Regression evidence and browser/device limitations: `docs/regression-2026-10-15.md`. Static relative-script deployment remains unchanged; no dependencies, backend or external assets added.


### Latest documentation update — 2026-10-14: bilingual product showcase

- README is now a concise English product showcase with a matching `README.ru.md`, prominent live-demo link, six implemented differentiators and focused run/privacy guidance. Detailed engineering material remains in the existing documentation package.
- Fresh `screenshot.png` and `assets/readme/halo-orbit.gif` capture the actual local COSMIC + DRIFT interface. The silent GIF uses forward/reverse playback for a continuous visual loop; it is not evidence of seamless audio export.
- Capture: isolated desktop Chromium, 1440×900 screenshot and 1120×700 source frames; no page errors during capture. Loopback preview was unavailable even after escalation, so capture used the supported direct-file startup. No listening, mobile/Safari or deployed-site validation claimed. Relative README assets preserve static hosting; runtime behavior and capabilities are unchanged.

### Latest implemented update — 2026-10-15: Track 09 Pattern Randomizer & Reset, Snow-White 9th Orbit, Sequencer Pad Styling & UI Binding Fixes

- **Slice Count & Pattern Preset Selectors (`src/live-loop.js`):**
  - Resolved UI event delegation issue where slice count buttons (`4`, `8`, `16`) and pattern presets (`BEAT`, `CHRONO`, `SHUFFLE`, `ARP`) remained inactive due to mismatched element IDs. Replaced ID lookups with resilient container-scoped query selectors (`querySelectorAll('[data-slice-count]')` and `querySelectorAll('[data-slice-pattern]')`).
  - Added support for both `'arp'` and `'arpeggio'` identifiers in pattern preset generator.
- **Unified 16-Step Pad Styling (`index.html`):**
  - Upgraded 16-step sequencer pad appearance from drab default button styles into cosmic dark-teal glass pads (`background: rgba(13, 26, 44, 0.75)`, border `rgba(99, 210, 198, 0.3)`, downbeat indicator pips on steps 1, 5, 9, 13, and real-time glowing playhead synchronization).
- **Pattern Area Randomizer & Reset (`🎲 RAND` & `↺ RESET`):**
  - Added dedicated `🎲 RAND` button to generate organic chop grooves (`randomizeSlicePattern(count)`) anchoring step 0 to chop 0 while musically varying syncopations and rests.
  - Added `↺ RESET` button to instantly restore the default foundational `BEAT` groove preset.
- **Snow-White 9th Orbit (`#ffffff`):**
  - Switched the outer 9th orbit rendering on the universe canvas from cyan to snow-white (`#ffffff`), producing high-contrast elegance against the dark space background and colored orbits 01–08.
- **Automated Verification & Docs Sync:**
  - Added unit test suite in `tests/live-loop.test.cjs` covering `randomizeSlicePattern`, preset patterns, and slice count clamping (162/162 tests passing).
  - In-app User Manual Section 14 updated in Russian and English (`index.html`).
  - `docs/engine-capabilities.md` and `docs/agent-api-specification.md` synchronized.

### Previous implemented update — 2026-10-15: Track 09 SLICE Mode (transient slicing & 16-step sequencer), Teenage Engineering-inspired sampling, full SOUND & FX shaping, GENERATE re-grooving, and visual 9th orbit

- **Track 09 SLICE Mode & Transient Chopping (`src/live-loop.js`):**
  - Added dual mode switcher in Track 09 header: `[ ◈ LOOP ]` (classic continuous looper) and `[ ✂ SLICE ]` (transient-based rhythmic chopper).
  - Algorithmic transient detection (`detectTransients`): analyzes local RMS energy rise (ODF) in sliding 1024-sample windows (~23ms) with refractory distance constraint (min 50ms) to slice audio on perceptual acoustic attacks into **4, 8, or 16** chops rather than fixed musical pitch.
  - Automatic fallback to uniform slicing grid for smooth ambient textures and continuous drones without distinct transients.
  - Interactive waveform rendering with vertical slice demarcation lines, numbered badge chips, and click-to-audition chops.
- **16-Step Slice Sequencer & Groove Presets (`src/live-loop.js`):**
  - Interactive 16-step sequencer grid organized into four quarter-note beats with active step playhead indication.
  - Tap any step to cycle chop index (1..N) or rest (`—`).
  - Pre-programmed musical groove presets: `BEAT` (dance foundation on beats & syncopations), `CHRONO` (chronological 1..N order), `SHUFFLE` (syncopated groove bounce), `ARP` (ascending/descending chop cascade).
  - Monophonic Voice Choke: retriggering any slice immediately chokes the previous voice with a 5ms anti-click ramp, eliminating overlapping tail muddiness and unwanted volume summing.
- **Complete Synthesizer Voice Strip (SOUND) & Spatial FX for Track 09:**
  - `CHARACTER`: 12 dB/oct resonant Lowpass/Bandpass filter (80–14000 Hz, Q 0.7–4.0).
  - `DURATION`: Decay/release envelope (0.05s staccato to full slice length).
  - `DENSITY`: Step trigger probability mask (20–100%) preserving rhythmic groove anchors.
  - `LEVEL`, `PAN`, and independent polymeter controls (`CYCLE` 4–32 steps, `STEP` 1/16, 1/8, 1/4, `OFFSET` 0..15).
  - Studio FX sends: `REVERB`, `DELAY` with instant BPM-synced division pills (`1/16`, `1/8`, `1/8D`, `1/4`), and stereo `CHORUS`.
- **Accompaniment Re-Grooving via `GENERATE` (`Создать`):**
  - Clicking `GENERATE` invokes `HaloLiveLoop.randomizeSlice(seed)`, organically re-mixing the slice pattern, filter cutoff, envelope decay, and FX sends to blend the user's custom sample seamlessly into the generative ensemble.
- **Visual 9th Orbit & Interactive Canvas (`index.html` & `src/effects.js`):**
  - Renders an outer 9th orbit when Track 09 contains audio (`hasAudio()`).
  - Neon cyan/teal palette (`#63d2c6`), dedicated phase sweep, comet trails in CLASSIC, COSMIC, and HYPER modes, and glowing nucleus pulse on audio triggers (`window.HaloPulse(8, time)`).
  - Displays slice marker positions along the orbit ring in `PHRASE` motion mode (`getSlicePhraseSteps()`).
  - Touch/click on the 9th orbit toggles Mute/Unmute state.
- **Test Suite & Documentation Synchronization:**
  - Expanded unit tests in `tests/live-loop.test.cjs` covering transient slicing, pattern presets, tick scheduling, choke group, and offline export (all 161 tests passing).
  - In-app User Manual Section 14 updated in Russian and English (`index.html`).
  - `docs/engine-capabilities.md` and `docs/agent-api-specification.md` synchronized.

### Previous implemented update — 2026-10-15: Track 09 Instant Restart (immediate sample tweaks vs quantized global phrase & voices restart), Pitch & Reverse, and UX layout refinements

- **Track 09 Instant Restart Engine (`src/live-loop.js` & `index.html`):**
  - Integrated `⚡ INSTANT RESTART` button in the Track 09 header next to `#loopStatusBadge`.
  - **Sample parameter changes (`Pitch`, `Reverse`, `Sample Start` / waveform drag / `trimStart`):** Immediately restarts only Track 09 sample playback without disturbing generative synthesis voices 01–08 or changing phrase position, with a 40ms debounce timer for smooth continuous slider scrub.
  - **Loop length and cycle boundaries (`BARS` 1, 2, 4, 8 / `trimEnd`):** Restarts playback strictly quantized to the nearest upcoming quarter-note beat (`absStep % 4 === 0`) or bar downbeat, restarting the **entire musical phrase, all instruments (tracks 01–08), and musical bars** in total synchronization with Track 09 via `window.HaloRetriggerPhrase(true)` and `songUI.onPhraseRestart()`.
- **Terminology & Aesthetic Unification:**
  - Reverted Russian localization of "Overdub" from literal "Наложение" back to standard product and musical term "Overdub".
  - Unified button gradients in Track 09 and song docking to cosmic cyan-dark blue radial gradient, eliminating unintended reddish color stop tints.
- **Pitch-Shifting & Audio Buffer Reverse (`src/live-loop.js`):**
  - Live and offline pitch-shifting slider (-12..+12 semitones, `playbackRate = 2^(pitch / 12)`).
  - Reverse audio playback toggle (`⇄ REV`) with full PCM channel mirroring and inverted trim calculation (`totalDur - (offsetSec + trimStart * winDur + playDur)`).
- **Control Layout & Input Refinements (`index.html`):**
  - Removed browser numeric spinners (`▲▼`) from the `LATENCY` input field (`-webkit-appearance: none; appearance: textfield`).
  - Repositioned `MUTE` and `SOLO` buttons from the right auxiliary block to sit cleanly underneath the `BARS [ 1 ] [ 2 ] [ 4 ] [ 8 ]` selector buttons.
- **Documentation & 157 Passing Tests:**
  - In-app User Manual Section 14 updated in Russian and English.
  - `docs/engine-capabilities.md` and `docs/agent-api-specification.md` synchronized.
  - Test suite in `tests/live-loop.test.cjs` and `tests/app.test.cjs` expanded with 157 tests passing.

### Previous implemented update — 2026-10-14: Track 09 (Live Loop, microphone recording, live overdubbing, and IndexedDB storage)

- **Track 09 — Live Loop Engine (`src/live-loop.js`):**
  - Added an optional 9th audio track (`09 — LIVE LOOP`) running as an independent audio layer synchronized with HALO’s authoritative Web Audio transport clock (`currentTime`), master tempo (BPM 30–200), and bar boundaries.
  - Preserves the core 8-orbit generative synthesis and modal harmony architecture: Tracks 01–08 remain dedicated to algorithmic voice generation, while Track 09 functions as a free audio layer for live vocals, guitar, acoustic instruments, or external sample loops without scale restrictions.
  - **IndexedDB Storage (`halo-live-loop-v1`):** Audio recordings and layer PCM arrays reside 100% locally on the user's device in IndexedDB (`audio-layers` and `settings` stores). Audio data is **not** serialized into project JSON files (`snapshotProject()`) and does **not** bloat `#loop=` or `#song=` URL share tokens.
  - **Live Microphone Recording & Feedback Protection:**
    - Live mic input capture via `navigator.mediaDevices.getUserMedia` with sample-accurate Float32Array PCM chunk collection matching `AudioContext.sampleRate`.
    - Direct mic monitoring is disabled by default (`monitor: false`) to prevent acoustic feedback howl through open laptop/desktop speakers, accompanied by in-app headphone recommendations.
    - Bar-quantized count-in pre-roll: recording waits for the next bar boundary and automatically records for the selected bar count (1, 2, 4, or 8 bars), then immediately transitions into looping playback.
    - Hardware latency compensation (`latencyMs`, default 40ms, range 0–200ms) trims input buffer delay for tight rhythmic synchronization.
  - **Non-Destructive Live Overdub & Undo:**
    - New takes are stacked as independent layer objects in IndexedDB without destructive bounce.
    - Multi-layer summation with automatic soft-limiting headroom (`buildCompositeBuffer`, 0.98 peak normalization ceiling) prevents clipping.
    - `Undo (↺)` removes the last overdub take, instantly restoring the previous composite audio buffer.
  - **Audio File Import:**
    - Supports WAV, MP3, and browser-supported audio files with device safety limits (max 50 MB, max 120s) and friendly localized toast warnings.
  - **Interactive Waveform Display & Trimming:**
    - Canvas 2D waveform renderer with teal bars (`#63d2c6`), dashed vertical bar dividers, and real-time playhead.
    - Non-destructive `trimStart` (0..95%) and `trimEnd` (5..100%) sliders.
  - **Dedicated Mixer Strip:**
    - Level (0..100%), Pan (-100..100%), Reverb Send (0..100%), Delay Send (0..100%), Mute, Solo.
    - Routes into shared master reverb, 1/8 tempo-synced delay, and master EQ / peak limiter.
    - Keyboard shortcut: `'9'` toggles Track 09 Mute.
  - **Export Parity:**
    - Both Phrase and Full Song offline WAV and MP3 exports automatically render Track 09 when active and unmuted.
  - **Dock UI Integration (`src/song-ui.js`):**
    - Added 3rd tab (`🎙`) to `.song-dock` alongside Instruments (`‹ ≋`) and Composition (`▤ ›`).
    - Swapping tabs displays the dedicated Live Loop panel in place of the track tiles or song arrangement cards while maintaining full transport and dock card height responsiveness.
  - **Documentation & Tests:**
    - User Manual (`index.html`) Section 14 added in Russian and English with hotkey documentation.
    - `docs/engine-capabilities.md` and `docs/agent-api-specification.md` synchronized with Track 09 capabilities.
    - 151 passing Node tests across the test suite, including dedicated test suite `tests/live-loop.test.cjs`.

### Previous implemented update — 2026-10-14: Cyrillic typography whitespace fix, background playback engine, and deployment workflow

- **Cyrillic Localization Whitespace Preservation & Font Stack Modernization:**
  - Diagnosed and fixed the "eaten spaces" issue in Russian UI and User Guide (`#guideModal`): DOM text nodes had their leading and trailing whitespace stripped by `translate()` in `src/i18n.js` when running through fallback substitution.
  - Added explicit leading/trailing whitespace preservation across all translation paths in `src/i18n.js`.
  - Excluded `#guideModal` from dynamic DOM `TreeWalker` translation in `setup()`, preventing redundant re-translation of pre-translated Russian and English guide trees.
  - Modernized `font-family` stack in `index.html` to `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` with font smoothing (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale`), providing crisp and readable Cyrillic glyphs across all operating systems without external runtime dependencies or CDNs.
  - Added unit test coverage in `tests/i18n.test.cjs` validating whitespace preservation on arbitrary strings and dictionary matches.
  - Resolved GitHub CodeQL code scanning alert #1 (`js/bad-tag-filter` / CWE-116): replaced `<script>` RegExp extraction in `tests/app.test.cjs` with safe, deterministic `indexOf` substring slicing.

- **Background Playback Engine & Toolbar Toggle (`#bgAudio`):**
  - Added a dedicated background playback toggle button in `.top-actions` (top-right header) right next to `#visualOnly` (`Visuals only`) with an intuitive SVG icon featuring a browser window with an acoustic note and radiated sound waves.
  - When enabled (`clean.ui.backgroundAudio = true`), the `visibilitychange` listener does not pause playback or suspend the `AudioContext` when the browser tab loses focus, the window is minimized, or the user switches applications.
  - **Adaptive Lookahead Scheduling (`schedule()`):** Browsers (Chromium, Firefox, Safari) throttle background tab timers (`setInterval`) down to 1000ms. HALO's scheduler dynamically expands its lookahead window from `0.16s` (48 ticks) to `1.5s` (192 ticks) whenever `document.hidden && backgroundAudio` is true, keeping the browser's hardware audio buffer continuously populated without dropouts or skipped notes.
  - State is fully persisted in `localStorage` under `ui.backgroundAudio` with 100% backward compatibility for existing autosaves.
  - Full RU/EN localization for button titles, accessible labels, and status toasts (`Background playback enabled` / `Фоновое воспроизведение включено`).
- **Robust GitHub Pages Deployment Workflow (`.github/workflows/deploy.yml`):**
  - Resolved GitHub Pages deployment timeouts on large audio asset syncs by increasing `actions/deploy-pages@v4` timeout to 20 minutes (`timeout: 1200000`).
  - Added manual `workflow_dispatch` trigger enabling 1-click manual re-deployments directly from the GitHub repository Actions tab.
- **Documentation & Specifications Synchronization:**
  - Updated Section 11 of the in-app User Manual (`index.html`) in both Russian and English.
  - Synchronized `docs/engine-capabilities.md` with Section 10 covering Background Playback Engine mechanics and deployment specifications.
  - Synchronized `docs/agent-api-specification.md` with `system.setBackgroundAudio` and `system.setVisualOnly` operations.
- **Verification:** 147 passing Node tests across the test suite, including new unit tests for preferences persistence and live background audio toggling / hidden tab behavior. Preserves zero-build static deployment on GitHub Pages.

### Previous implemented update — 2026-10-14: third orbit visualization mode (HYPER) with 8 distinct dynamic comet signatures

- **Third Orbit Visualization Mode (HYPER / "ГИПЕР"):**
  - Added a third visual comet trail mode cycling alongside `CLASSIC` and `COSMIC`: `CLASSIC` → `COSMIC` → `HYPER` → `CLASSIC`.
  - Implemented 8 radically distinct, bright, and hyper-dynamic procedural special effect signatures for each of the 8 track slots in `src/effects.js`:
    - **Track 0 (GLASS / Pulse):** *Plasma Lightning Bolt* — high-frequency jagged electric discharge arcs, Tesla coil branches, blinding white-hot core, and radial electric nova blast on audio pulse.
    - **Track 1 (TIDAL / Accent):** *Chromatic Vortex Ribbons* — 3D braided counter-rotating undulating wave ribbons, iridescent ladder cross-struts, and chromatic rippling wave crests.
    - **Track 2 (ROOT / Percussion):** *Seismic Shock Diamonds* — supersonic Mach shock diamonds, heavy compression barrier contours, cross-braces, and sonic boom blast cones.
    - **Track 3 (EMBER / Texture):** *Solar Flare Firestorm* — swirling coronal magnetic loops, convective fire plumes, incandescent ember sparks, and CME solar flare eruptions.
    - **Track 4 (RAIN / Bass):** *Cyberpunk Laser Grid* — quantized digital oscilloscope waveform, holographic directional chevrons, and digital targeting matrix sweeps.
    - **Track 5 (VEIL / Melody):** *Celestial Mandala Spiral* — logarithmic rotating spiral galaxy arms, sacred constellation node web, and 8-pointed starbursts.
    - **Track 6 (MOSS / Arpeggio):** *Prismatic Crystal Shards* — tumbling 3D faceted geometric crystals with specular highlights, rainbow dispersion rays, and crystal detonation bursts.
    - **Track 7 (AURA / Harmony):** *Hyperspace Warp Tunnel* — 3D-perspective receding warp rings, tachyon hyper-speed streaks, billowing dimensional sails, and warp singularity jump flashes.
  - Enhanced WebGL2 fragment shader with hyper-nebula cosmic shimmer and warp rays when `richness > 1.5`.
  - Maintained full Canvas 2D fallback, mobile quality tier scaling (`small`), and strict reduced-motion invariance (no strobe/jitter, zero wall-clock dependency).
  - Persisted `effectMode` in localStorage preferences (0, 1, 2) with 100% backward compatibility for legacy `richEffects` boolean.
  - Added bilingual RU/EN localization (`HYPER` / `ГИПЕР`, toasts, button titles) and synchronized in-app User Manual (`index.html`), `docs/engine-capabilities.md`, and `docs/agent-api-specification.md`.
- **Verification:** 145 passing Node tests across the test suite, verifying `hyperStyles`, `drawHyper`, Canvas state balance, reduced-motion invariance, `effectMode` preferences, and app cycling. Preserves zero-build static deployment on GitHub Pages.

### Previous implemented update — 2026-10-14: cycle and step randomization in GENERATE, 24-key Circle of Fifths with parallel Major/Minor modes, and documentation sync

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
- **Verification:** 143 passing Node tests across the test suite, verifying constraint checking, cycle randomization corridors, 24-key relative and fifth transitions, mode toggle, and project validation. Preserves zero-build static deployment on GitHub Pages.

### Previous implemented update — 2026-10-14: bilingual User Manual, Engine Capability Registry, Universal Agent API Specification, and mandatory documentation sync rule

- **Interactive in-app User Manual (`#guideModal`):**
  - Added a dedicated `#guideBtn` in `.top-actions` (top-right of header) displaying `ИНСТРУКЦИЯ` / `GUIDE` with an SVG book icon, title tooltip, and responsive styling.
  - Built an exhaustive 13-section manual in full Russian (`.guide-lang-ru`) and English (`.guide-lang-en`): Philosophy & Product Promise, Sound Worlds (Ambient vs Reactor), 8 Fixed Musical Roles, Voice Parameters & Normalized Corridors, Spatial FX & Rhythmic Delay, Master Transport & Track Polymeter, Circle of Fifths Harmony, Phrases & Step Grid, Song Arranger & Narrative Arc, Master Section & Spatial Stage, Visual Orbits & Worlds, Storage / Export / Sharing, and Keyboard Shortcuts.
  - Interactive navigation: sticky Table of Contents on desktop, responsive horizontal scroll chips on mobile/narrow viewports (<=700px), smooth scrolling to section anchors, active TOC link highlighting, backdrop click dismiss, dedicated close button, and Escape key dismissal.
  - Synchronized dynamically with the app's `RU/EN` toggle button without reload.
- **Exhaustive Engine Capability Registry (`docs/engine-capabilities.md`):**
  - Created a complete technical ground-truth reference documenting all 8 track slots (`GLASS`..`AURA`), 8 fixed roles (`pulse`..`harmony`), 30 Ambient procedural synth patches, 32 Reactor presets (130 CC0 PCM samples with hashes and pinned provenance), parameter conversion math (0..100 to Web Audio Hz/seconds/gain), 3-band Master EQ (-9..+9 dB), peak limiter dynamics, Circle of Fifths Aeolian transposition, 4/8-bar phrase bounds, and 56-bar composition limits.
- **Historical Universal Agent API Specification v1.1 (superseded by the current external-agent contract in `docs/agent-api-specification.md`):**
  - Adapted the draft ТЗ v1.0 into an architecturally sound, production-ready specification aligned with HALO's actual codebase. Reconciled misconceptions (exact 8 roles, CC0 sample banks, Aeolian harmony, relative 16-step grid).
  - Defined machine-readable Capability Registry schema, project state inspection, declarative JSON operations (`track.*`, `phrase.*`, `composition.*`, `master.*`, `visual.*`), optimistic concurrency revision tracking, atomic commits, shadow preview audio pipeline, and client-side zero-backend AI Composer architecture.
- **Mandatory Documentation Synchronization Rule:**
  - Added Rule 13 to `AGENTS.md` and updated the working procedure and Definition of Done: any functional expansion, parameter update, or engine feature strictly mandates updating the User Manual (`index.html`) in both RU and EN, the Engine Capabilities registry (`docs/engine-capabilities.md`), and the Agent API specification (`docs/agent-api-specification.md`).
- **Verification:** 142 passing Node tests across the test suite, including new unit tests for guide button, modal open/close, language toggle synchronization, anchor verification in RU/EN, and Escape key dismissal. Preserves zero-build static deployment on GitHub Pages.

### Previous implemented update — 2026-10-14: compact BPM input, cleaner transport phrase caption, and muted brand prefix

- **Compact BPM input:** resized the BPM input field by ~2x (width 40px, centered text, snug padding) so that 3 digits (e.g. 100, 200, 72) fit cleanly and comfortably without excessive empty space across both desktop and mobile viewports.
- **Cleaner transport phrase caption:** removed the redundant "Фраза: " / "Phrase: " prefix under the Play button, cleanly showing the phrase label directly (e.g. "Фраза1", "Куплет", or custom user name).
- **Muted brand prefix styling:** styled the "NotBad" prefix in the topbar brand link with `var(--muted)` (`#8c9bb8`), visually matching the subtitle ("Конструктор музыки" / "MUSIC CONSTRUCTOR") below it and giving visual prominence to "HALO".
- **Verification:** 141 passing Node tests across the test suite, preserving all layout, responsive styling, and zero-build static GitHub Pages deployment.

### Previous implemented update — 2026-10-14: musical loop generation, protected anchors, role corridors, register tiering and organic surprise

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
- **Verification:** 141 passing Node tests across the test suite, verifying constraint checking, deterministic scheduling, sample bounds, mask variety (>10), parameter ranges, and register consistency. GitHub Pages static zero-build compatibility preserved.

### Previous implemented update — 2026-10-14: transport repeat button and dual-mode phrase/composition looping

- **Relocated repeat button:** moved from the bottom of the screen into the transport control bar right next to the BPM input (`#transportRepeat`) with a clean loop arrow SVG glyph and active state glow styling.
- **Dual-mode loop control:**
  - **Instruments panel:** toggles phrase looping (`phraseRepeat`). Enabled by default (`true`). When disabled, playback plays through the phrase cycle (e.g. 64 or 128 steps) and stops gracefully at the phrase boundary on the audio clock via `env.finish(time)`.
  - **Composition panel:** toggles whole composition repeat (`song.repeat`). Disabled by default (`false`). When enabled, wraps back to section 0 upon reaching the end of the composition.
- **Separate state persistence:** phrase repeat is stored independently in `localStorage['halo-phrase-repeat']` and autosave preference snapshot (`clean.ui.phraseRepeat`), while composition repeat is stored in `song.repeat` within `halo-composition-v1` and portable JSON. Toggling one mode never alters the state of the other.
- **Bilingual RU/EN accessibility:** active aria-label, title tooltips (`Repeat phrase · ON/OFF` / `Повтор фразы · ВКЛ/ВЫКЛ`), and `.active` visual classes adapt dynamically when switching between Instruments and Composition tabs.
- **Verification:** 141 passing Node tests across the test suite, including new unit tests for independent state toggling in Instruments and Composition modes, boundary audio-clock stopping when phrase repeat is disabled, and markup/style verification. GitHub Pages static zero-build compatibility preserved.

### Previous implemented update — 2026-10-14: dedicated phrase rename icon, unified confirm dialog, and strict Spacebar play/pause

- **Phrase title edit click area:** clicking anywhere on the phrase card or phrase title now selects/cues the phrase during playback or in pause. Inline renaming is exclusively initiated by a dedicated pencil icon button (`✎` / `Rename phrase`), eliminating accidental inline rename triggers when clicking cards to switch or drag phrases.
- **Unified custom confirm dialog (`#confirmModal`):** replaced native browser `window.confirm` for both phrase deletion from composition and workspace reset with a custom translucent modal dialog matching the app's visual style. Features bilingual RU/EN titles and descriptions, distinct danger button styling for destructive actions, keyboard focus trapping, Escape key cancellation, and backdrop click dismiss.
- **Space key transport binding:** Spacebar (`code === 'Space' || key === ' ' || key === 'Spacebar'`) calls `e.preventDefault()` and strictly executes `togglePlay()`. It bypasses browser synthetic click dispatch on previously focused buttons, range sliders, or other interactive elements, ensuring reliable Play/Pause toggling while preserving standard text entry in text inputs and textareas.
- **Verification:** 139 passing Node tests across the test suite, including new unit tests for pencil icon vs title click, section removal confirmation cancel/confirm, Space key preventDefault and play toggling without clicking focused buttons, text input space typing passthrough, and custom confirm modal DOM/resolution logic. Zero runtime dependencies/CDNs added; full GitHub Pages static compatibility preserved.

### Previous implemented update — 2026-10-14: bounded shared inputs and phrase names

- Audited numeric controls, legacy pattern storage, project/composition import, autosave and share fragments. Existing strict control ranges/schema allowlists retained. Shared tokens now enforce base64url alphabet/length, strict single recognized fragment parameter and percent decoding; unpacked streams cancel above 512 KiB before JSON parsing. Stale async URL replies are ignored before state loading. Unknown query variables do not configure the app. AUTO key jumps are constant-time; seeds wrap within the validated bound.
- Optional allowlisted phrase `label`: 1–10 Unicode letters/numbers, no spaces, markup or special characters. IDs are safe integers ≤1,000,000. New records display their sequential ID; repeats share names. Name click opens an inline input, Enter saves / Escape or blur cancels; background/keyboard card selection still cues playback. Transport displays the edited/current phrase name. Custom text uses textContent only.
- Chromium editor uses only its custom scrollbar (standard scrollbar styling was overriding arrow removal); unsupported browsers retain thin native fallback. Verified: 135 Node tests pass, including compressed expansion cancellation, strict URL parsing, schema/key injection rejection, unsafe numerics, phrase names and linked identity. In-app browser at 987×904 confirmed invalid-name rejection, valid inline rename, transport caption, scrollbar buttons display:none, no horizontal page overflow and a clean console. No dependencies/backend/CDN or commit; security tests are bounded-input regression evidence, not certification.

### Latest implemented update — 2026-10-14: continuous panel playback and composition repeat

- Instruments returns to the sounding phrase and loops it on the shared audio clock; Composition resumes its selected section without reloading/stopping. Whole-song REPEAT is optional, defaults off, and is allowlisted in version-1 JSON/local state; offline export remains one pass. First-use visual mode is PHRASE, saved validated view still takes precedence.
- Rocker icons/arrows remain on one line. Editor uses a narrow rounded themed scrollbar with no arrow buttons. Static classic-script deployment and eight voices remain unchanged. Verified: 129 Node tests pass; browser confirmed Play stays active across both panel switches, REPEAT toggles, one repeat button, themed thin scrollbar and no horizontal page overflow; console clean. Full-song wrap covered by deterministic scheduler tests; no listening or physical-device acceptance claimed.

**Status:** prototype with procedural ambient and sample-backed rock banks, versioned local motif/ensemble generation, fixed musical roles with compatible same-world timbres, localized UI and persisted preferences, 2026-10-14. This document distinguishes **CURRENT** implementation from **TARGET** design. It is the shared product/engineering map for future Codex sessions.

### Latest implemented update — 2026-10-14: authored-verse development and varied generator ensembles

- **GENERATE:** existing role-affinity timbre/motif randomization now also selects 4–6 active slots with bass/melody anchors; masks change between generations. Independent optional reverb/delay/chorus sends stay in 0–50%, with smaller role-specific sends for bass/drums; delay divisions remain musical. Master settings/cycles persist. The explicit user request supersedes the former preserve-mute generation behavior; new generation clears exact pitch/timing material and updates the selected/sounding phrase.
- **Arranger:** `src/arranger.js` treats input as the first verse, preserving that snapshot completely. Eight sections: intro / verse / chorus / verse 2 / chorus / bridge / chorus / outro (4/8/8/8/8/8/8/4 = 56 bars). Chorus instances share one phrase. Leading active melodic part anchors identity. Same-seed/key/world/instruments and existing role/motif/ensemble plans develop support; chorus fills gaps, bridge uses alternate-bar answers, Verse 2 changes accompaniment, slow voices retain breathing room. Dormant suitable accompaniment may enter derived parts. Silent input is rejected with RU/EN guidance.
- **Pitch/persistence:** optional allowlisted `noteEvents` and `noteTranspose` extend the existing version-1 track schema. Frames preserve exact hook pitches despite rhythm changes, repeat at manual phrase length and follow key changes. Muted manual parts retain timing/pitches in snapshots. Old files without frames retain prior behavior. Autosaves bounded at 256 KiB; composition JSON stays bounded at 512 KiB including note data; local script cache tags updated.
- **Validation:** tests exercise first-verse equality, immutable source, exact leading pitches for both worlds/4–8 bars/keys, expanded vs sparse support, independent Verse 2/bridge and shared chorus, FX/activity variation, explicit-note validation/serialization/mute/repeat/transpose and live/offline scheduling. Musical appeal still requires listening; automated event preservation is not audible acceptance. No assets/dependencies/backend/CDN or commit.

### Previous implemented update — 2026-10-14: audio-clock phrase cueing

- Card title/background selects a phrase without switching panel views. While playing, the last chosen section is queued until the current 4/8-bar phrase boundary (not the end of every repeat in the section). Scheduled lookahead events remain authoritative; if a boundary is already scheduled, the next safe phrase boundary is used.
- The scheduler maps the continuing absolute transport into the target section, without closing/suspending the audio context or replacing the scheduler. Later sections follow composition order. Queued choice is transient, indicated by dashed card border and localized Next status; paused selection loads immediately and retains Composition.
- Tests cover no load/stop on live selection, replacement of cues, phrase-vs-section boundaries, missed scheduling intervals, final unscheduled boundary and paused selection. Source song JSON/offline arrangement remains unchanged by live navigation. Verified: 122 Node tests pass; in-app browser confirmed pending selection and the target becoming current while Play stayed active and Composition stayed visible. Console clean. Test playback paused afterwards; no listening/device acceptance claimed. No commit.

### Previous implemented update — 2026-10-14: compact card headers and aligned rocker

- Header brand now reads **NotBad HALO** without spaces between letters. EQ/stereo captions and values share a single line; long localized captions truncate within their column on narrow screens.
- Phrase title, drag grip and delete action share one header row. Cards are shorter. The dock uses grid columns; its rocker height follows the visible card/track area, so it stays inside the instrument zone on wide screens and aligns exactly with phrase cards in Composition.
- Static paths, audio, project schema and saved musical data unchanged. Verified in the in-app browser at 763×904, 1202×904 and 390×844: rocker/card bounds match exactly (108 px in Composition; 88 px on wide Instruments), header controls remain inside cards, localized EQ captions stay within their columns, and there is no horizontal page overflow. Console clean; 119 Node tests pass. No commit.

### Previous implemented update — 2026-10-14: composition card interaction and side rocker

- **Implemented:** no tab-button row or separate phrase-action toolbar. The lower panel has a compact left-side Instruments/Composition rocker. Self-contained cards expose drag grip, delete, linked repeat, independent variation and in-card repeat counter. Title/background now select or queue the phrase in Composition; Instruments is opened explicitly via the rocker (see latest cueing update). Trailing + adds the current phrase and ✧ rebuilds the arrangement.
- **Implemented:** shared pointer drag for mouse/touch with capture, target highlighting, bounded edge scrolling and cancellation; Alt+Left/Right on a grip moves its section and restores keyboard focus. Selection follows the same section; phrase references and saved musical data retain their existing semantics.
- **Layout:** default editor anchors above transport, respecting manual placement. Composition hides phrase/grid overlays without changing their saved settings. Promotion folds when it would overlap transport. Lower panel height is bounded below the upper menu and scrolls vertically on short screens; card strip scrolls internally for long songs.
- **Verified:** 119 Node tests pass. In-app browser on `http://127.0.0.1:8766/`: real pointer reorder and in-card repeats; wide/phone/compact viewports (1440×900, 390×844, 320×568); editor above transport; no page horizontal overflow or card-control bounds violations in measured views; no console errors/warnings during checked interactions. Mouse coordinates at phone size do not establish physical touch/Safari/iOS acceptance. Audio processing and composition format unchanged in this design patch; no audible review claimed.
- **Deployment:** local classic scripts/styles only, no assets/dependencies/CDN/backend; existing static GitHub Pages path retained. No commit.

### Previous implemented update — 2026-10-14: phrase-based composition arranger

- **Implemented:** `src/song.js` owns version-1 bounded `Phrase` snapshots (existing validated project schema), `Section` references/repeats/fades and ordered `Composition` settings. `src/composition.js` retains its existing loop/key responsibilities. No generator version migration.
- **Implemented:** `src/song-ui.js` switches only the lower track area between Instruments and Composition, retaining the right editor. Autoassembly creates 4/8/8/8/8/4-bar narrative from the current 4/8-bar source, preserving seed/key/patches and user mutes. Chorus repeats share a phrase; Create variation deep-copies it. Sections can be opened, added, reordered, removed and repeated.
- **Implemented:** shared Web Audio scheduler handles composition boundaries; repeated phrases use the same phrase-relative absolute clock. Arrangement masks source events and voices rather than generating replacement notes; intro/bridge/outro add bounded reverb space and reduce delay sends. Intro/outro ramp master gain and note intensity; orbit brightness follows section activity/fades without controlling audio or switching worlds.
- **Persistence/deployment:** separate validated `halo-composition-v1` localStorage record, portable `halo-composition` JSON, compact `#song=` links and full composition WAV/native-conditional MP3 export. Old loop import/export stays supported. Limits: one sound world, 32 phrases, 32 sections, 128 bars, 512 KiB JSON; share URL limited to 24,000 characters. Relative classic scripts preserve GitHub Pages and direct-file loading, with no new assets, dependencies or server.
- **Known limits:** editing via the explicit Instruments rocker stops composition preview; selecting a card now queues it without stopping playback. No automatic pitch variation, saved-phrase library, arbitrary section titles or automatic visual-scene choreography. Fade tails end at the composition export boundary. Browser link length/support varies.
- **Verified:** 117 passing Node tests, including automated reference, independence, four/eight-bar source preservation, boundary/fade, validation, isolated DOM and offline scheduling contracts. **Pending:** real-browser visual/console check, audible review, desktop/mobile sizing, Safari/iOS and physical devices. Browser bridge failed trust initialization; supported fallback and loopback HTTP verification timed out, including outside sandbox. No visual or listening acceptance claimed.

### Previous implemented update — 2026-10-14: Circle of Fifths neighboring key switching and H A L O header capitalization

- **Circle of Fifths harmonic proximity (`src/composition.js`, `index.html`):**
  - Confirmed and mathematically validated that `HaloComposition.keys` is strictly arranged along the Circle of Fifths (`D, A, E, B, F♯, C♯, G♯, D♯, A♯, F, C, G`), where every step is an ascending perfect fifth (+7 semitones modulo 12).
  - Added native `prevKey()` method to `HaloComposition` to step directly to the counter-clockwise neighbor (-1 fifth / subdominant minor).
  - Constrained automatic loop boundary key modulations (`autoKey`) to step strictly to adjacent neighboring keys on the Circle of Fifths (`(key + 1) % 12`), ensuring peaceful and harmonious modulations with at most 1 accidental difference.
  - Linked manual `keyNext` and `keyPrev` button clicks to `queueAutosave()` so key adjustments persist across page refreshes.
  - Added automated test in `tests/composition.test.cjs` verifying 12-key fifth cycle continuity and adjacent neighbor step guarantees for both manual and automatic transitions.
- **Top header branding (`index.html`):**
  - Updated brand title link in the header from "NotBad Halo" to "NotBad H A L O" in uppercase letters as requested.

### Previous implemented update — 2026-10-13: doubled instrument base volume, compact editor without scrollbar, and SHARE hash cleanup

- **Audio loudness boost without clipping (`src/audio.js`):**
  - Doubled the base instrument volume multiplier from 2 to 4 (`t.level / 100 * 4`).
  - At default 50% master volume, the overall audible loudness now equals the previous 100% volume level (+6 dB output).
  - Downstream master compressor (-1 dBFS threshold, 20:1 ratio, 2ms attack, 80ms release) and 32-bit float internal summing prevent any digital clipping or harsh distortion even when tracks and master volume are maxed.
- **Compacted instrument settings editor (`index.html`):**
  - Removed redundant "COMPATIBLE SOUNDS" ("СОВМЕСТИМЫЕ ЗВУКИ") label text above the bank select dropdown.
  - Reduced slider typography size to 8px and compressed slider vertical margins and gaps, cutting slider height by more than half.
  - Tightened preset buttons, cycle controls, and panel padding so the full editor fits comfortably within the viewport without vertical scrollbars.
- **Client-side share hash cleanup (`index.html`):**
  - On loading a project from a URL share link (`#loop=...`), `window.history.replaceState` clears the hash from the browser address bar after applying state.
  - Prevents unintended re-application of the shared preset on accidental browser refresh (F5).
- **Validation:**
  - 106 Node tests passing across all test suites (`tests/*.test.cjs`).

### Previous implemented update — 2026-10-13: shared FX buses (Reverb, Delay, Chorus) and instrument FX editor

- **Shared FX buses architecture (`src/audio.js`):**
  - Implemented three shared FX send/return buses in Web Audio graph with per-instrument send levels across all eight voices:
    - **Reverb (Пространство):** Shared stereo convolver tail with gentle highpass (140 Hz) and lowpass damping (7500 Hz) filters on wet return (~0.20 gain) to prevent low-end mud. Bidirectionally synchronized with the per-instrument `space` parameter.
    - **Delay (Музыкальное эхо):** BPM-synced delay bus with 4 discrete tap lines (`1/16`, `1/8`, `1/8 dotted`, `1/4`) calculated as `(60 / tempo) * mult`. Each tap feeds a 3400 Hz damping lowpass filter and bounded feedback gain (0.36) back into its delay line, returning through `delayWet` (0.52 gain) to master. Per-instrument send gain and dynamic tap routing based on `delayTime`.
    - **Chorus (Объём и движение):** Dual modulated delay lines (Left 18ms, Right 24ms) driven by quadrature sine LFOs (0.65 Hz / 0.82 Hz, ~2.4ms depth) with stereo panners (-0.7 / +0.7) and `chorusWet` return (0.50 gain) into master. Per-instrument send gain.
  - Delay taps and LFOs are guarded by `if (ctx.createDelay)` for testing resilience and progressive enhancement.
  - Added `HaloAudio.setTempo(bpm, at)` to smoothly ramp delay tap delay times on tempo changes.
  - Offline export in `src/export.js` passes project tempo into `HaloAudio.create` for sample-accurate delay synchronization.
- **Instrument settings editor UI (`index.html`):**
  - Added a `.editor-modes` tab bar with `SOUND` and `FX` mode toggle buttons (`#modeSound`, `#modeFx`).
  - Pane switcher toggles between `#paneSound` (character, duration, space, density, presence) and `#paneFx` (Reverb send, Delay send, Delay time division selector `1/16` / `1/8` / `1/8D` / `1/4`, Chorus send).
  - Bidirectional synchronization between `fxReverb` and `space` sliders and labels.
  - Supported relative pointer scrubbing via `HaloControls.install` on all FX sliders.
- **Persistence & serialization (`src/project.js`):**
  - Serializes, validates, and roundtrips `delay` (0–100, default 0), `delayTime` (`['1/16', '1/8', '1/8d', '1/4']`, default `'1/8'`), and `chorus` (0–100, default 0) per track.
  - Seamlessly handles legacy project files and autosaves with safe defaults.
  - Encodes and decodes within client-side URL share tokens (`#loop=...`).
- **Full RU/EN localization (`src/i18n.js`):**
  - Localized tab names (`SOUND` / `ЗВУК`, `FX` / `FX`), labels (`REVERB` / `РЕВЕРБЕРАЦИЯ`, `DELAY` / `ДИЛЭЙ`, `DELAY TIME` / `ВРЕМЯ ЭХА`, `CHORUS` / `ХОРУС`), setting hints, and descriptions.
- **Validation:**
  - 106 Node tests passing across `tests/app.test.cjs`, `tests/project.test.cjs`, `tests/i18n.test.cjs`, `tests/roles.test.cjs`, and `tests/sounds.test.cjs`.

### Previous implemented update — 2026-10-13: client-side static URL loop sharing via SHARE button

- Added a `SHARE` button to the PROJECT controls group (`SAVE`, `LOAD`, `MP3`, `WAV`, `SHARE`).
- Enables sharing loops directly via URL hash fragments (`#loop=<token>`) without any backend or external server, preserving zero-build static GitHub Pages hosting under `/<repository>/`.
- `HaloProject.encodeShare(project)` compresses the full composition snapshot using native Web Streams `CompressionStream('deflate-raw')` and URL-safe base64 encoding into a compact token (~780 characters).
- `HaloProject.decodeShare(token, sounds)` decompresses via `DecompressionStream('deflate-raw')` and validates through `HaloProject.validate()`.
- On clicking `SHARE`, the link is copied to the clipboard with toast feedback and fallback prompt; address bar hash is updated via `history.replaceState`.
- On loading the site with `#loop=` or on hash change, the shared project state is restored automatically while playback remains strictly paused awaiting user gesture.
- Localized in Russian (`ПОДЕЛИТЬСЯ`) and English (`SHARE`).
- Pure unit tests in `tests/project.test.cjs` and integration test in `tests/app.test.cjs`. 80 Node tests pass.

### Previous implemented update — 2026-10-13: schematic instrument role glyphs

- Replaced abstract concentric circles on each of the eight instrument cards with theme-matching schematic vector drawings:
  - 01 Pulse: audio transient impulse response with dynamic peak and rhythmic accent dot.
  - 02 Accent: 4-pointed geometric accent spark with core and fine corner sparks.
  - 03 Percussion: hi-hat cymbal pair with center rod and side rhythmic acoustic ticks.
  - 04 Texture: floating horizontal atmospheric drift stream lines with ambient particle dots.
  - 05 Bass: deep low-frequency sine wave with sub-harmonic contour and axis guide.
  - 06 Melody: beamed eighth notes with angled note heads and melodic contour.
  - 07 Arpeggio: ascending stepped sequence staircase ladder with note heads and grid guides.
  - 08 Harmony: four-note chord stack embraced by a musical brace with resonance ray.
- Minimal graphic execution: light 1.4px stroke weights, currentColor inheritance from track's `--tone`, responsive downscaling to 24-26px on mobile.
- `src/roles.js` exports `glyphs` and `glyph(roleOrTrack)`. Tests in `tests/roles.test.cjs` verify distinct SVGs across all roles. 78 Node tests pass.

### Previous implemented update — 2026-10-13: bounded controls and independent EQ boosts

- `src/controls.js` centralizes strict short decimal parsing, step checks, bounded snapping and pointer scrubbing for numeric controls and the numeric grid selector. All five instrument sliders, master volume, EQ, stage width, BPM, cycle length/offset/grid validate before changing state. Rejects empty/nonfinite/exponential/hex/injected/oversized/off-grid text; invalid edits restore the prior UI value. Dynamic offset limits follow cycle length. File and autosave parsing now rejects excessive character length before allocating UTF-8 buffers, while preserving 64 KiB byte limits and schema allowlists.
- Mouse drag right/up increases, left/down decreases. Pointer capture, cancellation, dead zone and click suppression isolate gestures. Sliders retain absolute click selection and touch/native keyboard operation. BPM drag uses 1 BPM increments, typed input 0.01. Exact/manual disabled fields stay disabled. Sound-bank/file selectors retain their standard interactions.
- Instrument preset buttons now use two wrapping columns; cycle fields and sound selector retain 44px targets, BPM has more room. Twelve caption-only native delayed tooltip definitions support RU/EN and keyboard focus, with no icon clutter. Small-screen cycle layout wraps at 360px.
- Removed global gain compensation based on the largest EQ boost. Chain is master volume → unity gain → 120 Hz shelf / 1 kHz peak / 6 kHz shelf → near-peak compressor (-1 dB, knee 0, ratio 20, attack 2ms, release 80ms) → output. EQ ramps remain 50ms and ±9dB. This avoids unconditional suppression of unrelated bands; peak compression can still affect a very loud mix, and is not a brickwall clipping guarantee. Live and offline use the same engine. Reference: [Web Audio compressor specification](https://www.w3.org/TR/webaudio-1.0/#DynamicsCompressorNode).
- Validation: 100 Node tests passed, including overflow/injection/step/cancel/pointer tests, all UI field handlers, persisted dragged offset, localized hints and ±9dB bass boost retaining neutral other-band/unity-gain settings. Static local script/subpath regression passes. Browser bootstrap was unavailable and supported fallback localhost navigation timed out after an escalated preview launch; no new visual, listening or device acceptance is claimed. No new dependencies/assets/backend/CDN.

### Previous implemented update — 2026-10-13: fixed roles and compatible sounds

- `src/roles.js` adds eight stable musical operators, preset engine/compatibility/affinity metadata, native defaults for both worlds and generator 3. It adapts the unchanged generator-2 motif/ensemble library rather than replacing it. Role behavior is independent of timbre; Bass/Arpeggio are mono, Melody has a three-note live budget, Harmony four. Texture permits long layers. Short sampled pitched sounds may be selected as percussion. The manual chooser filters compatibility; GENERATE restricts choices to same-world role affinity. No new sounds or dependencies.
- A common transport/eight-role panel replaces bank names as track identities. Both worlds retain independent settings. RU/EN cycle controls support length 4–32, grid multiplier 1/2/4 and offset; one audio clock drives their absolute phase and shared harmony. PHRASE previews show the current window; IN TIME uses track periods. Geometry and decorative timing do not schedule audio.
- Generator 1/2 playback remains supported. Generator 3 persists canonical role, sequence and generated/exact mode, plus current phrase `startStep` in project format 1. Exact manual steps bypass generated cycles; export uses absolute position and warmup. Arbitrary polymetric windows need not loop seamlessly. Existing note editor remains timing-only.
- Validation: 93 Node tests passed, including all compatible timbres/keys, affinity bounds, voice cleanup, 7/9-step cycles, preview/export parity and legacy/persistence checks. Fresh localhost browser navigation timed out; this change has no fresh visual, audible or physical-device acceptance. Relative classic scripts preserve direct-file/Pages architecture; no build/backend/CDN. See [track roles](docs/track-roles.md).

### Previous implemented update — 2026-10-13: motifs, ensembles and instrument/orbit matrix

- **Local music generation:** `src/phrases.js` contains 140 original motif-family definitions across 14 actual musical roles, plus ten ensemble profiles per world. All 30 AMBIENT patches and 32 REACTOR presets are covered. Families describe rhythmic hit groups, chord-degree contours for pitched roles and role-specific register/voicing rules. Shared minor-scale progressions connect the ensemble; bass and rhythm guitar retain independent attacks. Four-bar endings add fills/rests and melodic resolution; eight-bar phrases answer the first four and resolve the harmony on bar eight. This is a local rule-based library, not a trained neural network, song transcription or remote service. Details and matrix documentation: [docs/phrase-library.md](docs/phrase-library.md).
- **Orbit/instrument separation:** fixed eight `name` IDs remain physical tracks/orbits. The new allowlisted `instrument` field chooses any of the active world's eight banks on any orbit; presets and musical roles resolve from that bank/patch. The editor exposes an instrument selector and current ensemble/motif in RU/EN. Native and alternative placements are equally allowed by two 8×8 matrices; a symmetric 14×14 role matrix classifies layer/support/contrast combinations. Duplicate roles share candidate activity and `1/sqrt(count)` gain headroom. Mutes are excluded from neither the arrangement count nor lane ordering, so muting never changes other parts. No forced mute or forbidden combination; cross-world bank mixing remains absent.
- **Clock/audio/visuals:** bounded 256-plan caches and per-plan density caches reuse motifs. Positive generated density leaves at least one event per phrase; zero density and mute remain silent; exact manual steps still bypass generated density. Live scheduling, PHRASE markers, IN TIME's 64/128-step cycle and offline rendering use the same rules and role accents. Decorative geometry/colors remain tied to the orbit. Kick/bass remain near stereo center when relocated; existing ramps, voice bounds, guitar tails, master EQ and volume apply. Existing 160 ms scheduler lookahead can finish already scheduled events after a control change. No visual callback owns audio timing.
- **Persistence/compatibility:** portable project format stays version 1 with optional per-track `instrument` and `generator` enums. New compositions use generator 2; old files without metadata restore native instrument IDs and generator 1, retaining previous musical results. GENERATE explicitly upgrades voices and retains the approved patch/tuning randomization in 20–100%; selecting another instrument upgrades that voice. Local phrase-step saves include both identifiers. Exact timing editing remains implemented; pitch-per-step editing is not. The version-2 catalog/algorithm must not be silently changed for saved compositions; future redesigns need another generator version. Assignments/headroom are derived, not recursively serialized.
- **Pages/provenance:** one small local classic script added before `sounds.js`; relative script paths and cache versions preserve zero-build static deployment under the repository subpath. No new media, sound asset, model weights, CDN, account, backend, API key or runtime dependency. Existing CC0 recordings/rights are unchanged; newly authored motifs require no external musical-source license.
- **Validation:** fresh Node suite checks catalog coverage and ten families per role, all instrument/orbit placements, 4/8-bar development, note diversity with unchanged patches, minor-scale and recorded-root bounds across every key, positive/zero density, mute independence, role layering/pan headroom, legacy restoration, project allowlists, source-only local script initialization, repository-subpath URLs, editor/world/autosave restoration, live eight-bar scheduler wiring and offline note/velocity parity. 82 Node tests pass and `git diff --check` is clean. Preview requests to `http://127.0.0.1:8766/` still time out outside sandbox; fresh browser layout, actual audio render/listening and physical Safari/iOS acceptance remain unverified. Source tests do not establish perceived musical quality.

### Earlier implemented update — 2026-10-13: sample-backed REACTOR


- **Sample-backed REACTOR (supersedes its initial procedural engines):** all 32 existing preset IDs now resolve to local CC0 recordings. `src/samples.js` loads four allowlisted classic-script PCM packs only for REACTOR and decodes reusable buffers per AudioContext; `src/audio.js` schedules nearest-note BufferSources and applies the existing bounded amp/filter/envelope routing. Procedural guitar/piano/synth/tom/metal engines were removed; missing recordings fail explicitly before nodes are allocated. AMBIENT retains its original synthesis. There are 130 recordings (~24.06 MiB packs / ~18.04 MiB WAV bytes), not 32 separately recorded instruments: 28 Big Rusty Drums strikes, 28 direct and 14 distorted electric guitar takes across 14 roots, 25 picked/fingered bass notes, 13 upright-piano notes and 22 sampled synth tones. Guitar/keyboard resampling stays within five semitones of a recording in generated paths; bass stays within the original two articulations' shared 26–45 note range through octave folds, preserving pitch classes and syncopation (nearest bass note within six semitones).
- **Provenance/deployment:** `assets/reactor/manifest.json` contains every source URL, author, rights evidence, pinned Git revision or piano archive hash, original file, source/converted WAV hash and local pack entry. Source CC0 texts and readmes are retained in `assets/reactor/rights/`; `assets/reactor/README.md` explains conversion, shared-preset recordings and finite sustain limits. Only public-domain/CC0 audio is included, with no mandatory attribution, payment, NC or redistribution condition. Developer importer uses Python/Git/FFmpeg/7-Zip; deployment remains zero-build, classic local scripts, no backend or CDN. WAV payloads are embedded in local scripts to preserve file opening as well as repository-subpath Pages URLs. Mono 32 kHz/16-bit excerpts have bounded leading trim, 20 Hz highpass, normalized peaks and tail fade; no endless sample loops. Initial bandwidth/decoding and memory cost need real-device acceptance.
- **Loading/export/UI:** live AMBIENT→REACTOR waits until recordings are ready, then queues the existing bar-boundary change; loading can be cancelled and failures keep the current world playing. Paused world selection may preload local scripts; Play resumes the audio context by user gesture and waits for decode before any notes. Retry reuses successful loads. WAV/conditional MP3 export uses the same recorded bank in its OfflineAudioContext. PROJECT replaces the file-group SAVE heading; buttons read SAVE/LOAD, with MP3/WAV unchanged; RU equivalents and loading/failure messages are provided.
- **Validation for this update:** Node checks verify all imported PCM/hashes/CC0 evidence, coverage of generated pitch ranges, context-specific caching and decoder retry, exclusive sample scheduling for all 32 presets, loading cancellation/error preservation, existing musical/storage contracts and localized menu labels. Browser/audio-render checks are recorded after completion below; tests do not establish listening quality or physical Safari/iOS acceptance.
- **Completed verification:** 55 Node tests pass and `git diff --check` is clean. Chromium over `http://127.0.0.1:8766/` loaded/decoded the final 130 recordings, switched a playing AMBIENT session into REACTOR after readiness, and displayed PROJECT/SAVE/LOAD/MP3/WAV in EN and their RU equivalents. Actual sampled WAV: 4 bars at 100 BPM, stereo 44.1 kHz, 9.6 s, peak 0.06122 and no clipped PCM samples at 50% master. Observed browser viewport for this update was 763×904; the viewport API did not apply the requested 390×844 override, so renewed phone-size acceptance is not claimed. The browser URL policy blocked direct `file://` navigation; no bypass was attempted. Local-script packaging and repository-subpath URL resolution are tested, but direct-file browser acceptance remains unverified here. Physical Safari/iOS and listening acceptance remain pending.

Initial REACTOR implementation below is historical; the sample-backed update above is authoritative for its current audio source.

- **REACTOR musical setup:** user-approved expansion beyond relaxation adds an independent rock/keyboards world. Stable eight internal slot IDs preserve old files; `src/sounds.js` resolves banks by allowlisted `setup` and exposes display roles KICK/SNARE/METAL/TOMS/BASS/RIFF/LEAD/KEYS. AMBIENT's 30 patches/rules remain unchanged; REACTOR has 32 distinct original procedural patches, including two piano approximations and two synths. No samples, external sound assets, dependencies, CDN or proprietary music are included.
- **Composition/audio:** shared 16th-note Web Audio transport remains authoritative. REACTOR uses a D/D/B♭/C root cycle (transposed by existing minor-key controls), aligned syncopated bass/power-chord guitar, fixed snare backbeats, last-bar tom fills, alternate-bar lead answers and optional keyboard arpeggios. Regeneration changes seeded pitched choices while keeping drum anchors. `src/audio.js` adds bounded Karplus–Strong strings, additive piano, electric bass, detuned synth, metallic partials, tom bodies and normalized waveshaping with DC filtering and a post-drive cabinet lowpass; event gain remains after distortion. No visual callback triggers sound.
- **Switching/storage:** right-side AMBIENT/REACTOR button queues a switch to a scheduler bar boundary, cancels on repeated click, or switches immediately when paused. Old voices receive a short release at the boundary. Absolute transport step is retained; setup tempo/phrase grouping can change. Existing 160 ms lookahead means visual/theme state may update slightly before the audible boundary. Each world retains musical settings, seed/key, both auto flags, raw manual timing and edit draft. Scene/motion/graphics, locale, master volume and window positions are shared. Autosave keeps only two validated, nonrecursive inactive snapshots. Portable version-1 JSON adds an optional allowlisted `setup`; absent means AMBIENT, and sound IDs must match the selected bank. Export renders the active bank. Rock phrase saves use a separate legacy key to avoid overwriting the ambient legacy pattern.
- **Visuals/deployment:** orbit positions, sizes and speeds are preserved. REACTOR supplies a graphite/ember shader and CSS fallback, warm track colors and eight bounded metallic/electric Canvas trail signatures. Reduced-motion decoration stays deterministic. Button and new patch/role/status labels support RU/EN. Changed local script URLs carry a version query to prevent mixed cached scripts after deployment; relative paths preserve direct-file and GitHub Pages loading.
- **Validation:** 47 passing Node tests cover all 32 new audio paths with finite scheduling, voice bounds and cleanup; aligned riffs/backbeats/fills, transposition/mutes/manual timing, project bank validation, inactive snapshot allowlisting, two-world draft/setting restoration and audio-clock switching. Browser checks cover Chromium startup, keyboard sound selection, switching/restoration/reload and 1440×900 and 390×844 viewport layouts, plus playback on a temporary Canvas-only fixture. Actual REACTOR WAV at 100 BPM: 4 bars, 9.6 s, stereo 44.1 kHz, peak 0.06686, no clipped PCM samples (50% master, default Attack piano selection). This is render evidence, not listening acceptance or a general loudness/performance guarantee. Physical Safari/iOS and auditory guitar/piano acceptance remain unverified.

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
| `src/audio.js` | Web Audio synthesis/sample playback, track routing, effects and bounded event lifecycle |
| `src/samples.js` / `assets/reactor/` | Lazy local CC0 recording packs, per-context decoding and source/rights inventory |
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
- Each slot has a dedicated role: AMBIENT has 30 procedural patches, REACTOR has 32 sample-backed presets; sound selection is independent of visual identity. Character, duration, space, density and level are per-track settings.
- **4/4**, 16 subdivisions per bar, four-bar chord cycle: Dm7 → Bbmaj7 → Fmaj7 → Cadd9.
- Tempo choices: 60/72/84 BPM. Each track has its own existing step pattern, note density, level, and timbre selection.
- A deterministic `variant` affects note choices and note probabilities. Full project serialization does not exist.
- Orbit speed ratios and visual phase offsets create layered motion. **These are not independently looping audio patterns or polymetric meters.**
- Three visual mappings: Orbit, Bloom, Current. Changing scenes does not rewrite the music.

### Current technical limitations

- Audio and sound/composition rules are extracted and tested; transport, state, UI and visuals still live in the HTML entry. This is not the complete target architecture.
- AMBIENT sounds are original procedural approximations. REACTOR uses local sample packs with provenance; arbitrary external sample loading and AudioWorklet instruments remain absent. The compact bank has finite excerpts, limited dynamics and mono playback; it is not a full professional sampler library.
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

**Status: AMBIENT procedural banks and the REACTOR CC0 subset are implemented; additional arbitrary sample universes remain planned.** The eight slots now have dedicated banks with 30 procedural patches in total. Adopt the compact jam-machine principle of **track role → dedicated sound bank → simple tuning**, inspired by [OP-Z track organization](https://teenage.engineering/guides/op-z/tracks). Preserve HALO's calm character and existing object identities; create original sounds and interactions.

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

2026-10-13 — REACTOR rhythm and guitar correction: RIFF/LEAD retain the recording's natural envelope (original tails up to 30 seconds), with a 60 ms smooth release on the next event. Duration no longer gates guitar notes; mute/world switching still release sound. GENERATE changes rhythmic steps for all eight slots and all 32 presets; snare backbeats and bass/riff alignment remain anchored. Removed hardcoded single-bar tom/crash and alternate-bar lead restrictions. METAL/TOMS may fire in every bar; density and mute remain authoritative, exact manual steps still bypass generation. Shared scheduler, preview and offline export use the same deterministic patterns. CC0 inventory/hashes rebuilt from cached original recordings; local packs now 65.47 MiB / 49.10 MiB WAV payload. Longer samples increase first-load and decode memory costs. No runtime dependency or external asset request added. Automated regressions cover consecutive generation across all presets, 4/8-bar coverage, preview parity, natural guitar duration, transposition and retrigger release. Listening and physical Safari/iOS acceptance remain pending.

Verification for the correction: 58 Node tests passed; after strengthening the actual GENERATE-button test to start from saved manual steps, all 14 app tests passed again. git diff --check passed. Chromium at the existing localhost preview loaded/decoded the expanded bank and started REACTOR; transport advanced across multiple phrases, pause worked, and captured error/warning logs were empty. No new mobile/Safari or listening acceptance is claimed.

2026-10-13 — REACTOR regeneration follow-up: replaced the cyclic one-sixteenth shift with deterministic seeded selection of hit positions and alternating hit counts. Every consecutive seed produces a different rhythm shape for every preset, not a rotation. Snare retains steps 4/12, kick retains step 0; matching bass/riff presets share a seed lane. Density, exact manual steps and mute semantics remain unchanged. Patterns repeat until explicit generation or AUTO PATTERN; within-bar templates still repeat across the phrase, with independently seeded density skips. A bounded 256-entry rhythm cache avoids rebuilding patterns in audio/visual calls. Added a regression rejecting all 16 cyclic rotations across 32 presets and consecutive seeds, alongside 4/8-bar preview/audio parity. 58 Node tests pass. No audio assets or orbit geometry changed.

2026-10-13 — Independent REACTOR BASS/RIFF rhythms: removed their shared generation lane. Every track now has its own seeded hit selection, including seed 1; rhythm guitar uses one extra candidate attack for its articulation, so default bass/riff templates are not identical. Pitch selection and shared transport/harmony are preserved. Exact saved manual patterns remain authoritative; GENERATE clears them as before. PHRASE motion still maps all bodies to the common phrase clock, but scheduled attacks and note markers are independent. 59 Node tests pass, including all 16 bass/riff preset combinations across 128 seeds, deterministic repeatability, preview/audio parity and existing anti-rotation tests. No audio assets, runtime dependencies or scene geometry changed.

2026-10-13 — Master strip, EQ and stereo stage:
- The full-width responsive transport card groups circular Play/Pause, master volume, BPM, a three-band EQ and stereo width. It wraps on narrow screens; it retains all eight instrument cards and the existing world geometry. The small SVG is a schematic preview of the three gain settings, not a spectrum analyzer or measured frequency response. Controls and accessible labels support RU/EN.
- Historical master chain (superseded by the controls/EQ update above): volume → boost headroom trim → 120 Hz low shelf → 1 kHz peaking (Q 0.7) → 6 kHz high shelf → existing compressor → output. Gains are bounded to ±9 dB, default neutral; changes use 50 ms ramps. Positive boosts reserve headroom by trimming the largest positive band gain; this is conservative gain management, not a brickwall limiter or a guarantee against clipping in arbitrary mixes.
- Eight StereoPanner nodes give fixed independent positions scaled by 0–100% width (default 35%, maximum |pan| 0.7). Kick/bass stay close to center, other instruments spread farther. Width 0 centers direct instrument signals; the existing stereo reverb remains diffuse. If StereoPanner is absent, playback falls back to the unpanned route. Visual positions never own audio panning or timing.
- EQ/width are shared master settings across AMBIENT/REACTOR, autosaved through the allowlisted project.mix object and included in portable version-1 project files and offline WAV/conditional MP3 export. Older files get flat EQ and 35% width. Bounds/types are checked on import; unknown fields are discarded.
- REACTOR kick event gain increased from 0.065 to 0.14; snare/toms to 0.11. Recorded drums use a 3 ms attack. Instrument levels remain user-controlled, guitar tails and ambient voice gains are preserved. This addresses low drum presence at the event level; listening acceptance remains pending.
- Validation: 65 Node tests pass, covering master filter/ramp/headroom routing, independent bounded pan positions, centered/fallback routing, stronger drum gain, config bounds/legacy defaults, autosave restoration, shared world settings, export parity and RU/EN. git diff --check passes. Local browser validation was attempted with scripts/preview.ps1 at 127.0.0.1:8766, including restarting the identified preview listener outside sandbox, but HTTP/browser requests timed out. No new visual, rendered-audio, mobile or physical Safari/iOS acceptance is claimed. Relative local scripts and zero-build Pages deployment are preserved; no assets, CDN or dependencies added.

2026-10-13 — Full manual GENERATE randomization: pressing GENERATE clears exact manual steps, increments the composition seed, chooses a different patch within each of the eight slot banks and regenerates character, duration, density, level and space as deterministic integer values in 20–100%, avoiding the previous value. It preserves per-track mute, setup, geometry, BPM, harmony, master volume, EQ and width. Applies to both AMBIENT and REACTOR. Existing active-node gain/filter/send changes use the ramped audio.update path; new patches take effect on subsequent scheduled notes. Already scheduled lookahead events can still finish. Tiles and any open editor/draft refresh; results autosave and serialize with existing project settings. AUTO PATTERN remains rhythm/seed-only, so it does not unexpectedly remix patch/levels every loop. Guitar duration retains its existing natural-tail semantics. Button tooltip and generation message support RU/EN. 67 Node tests pass, including bank isolation, no zero levels, all five parameter bounds, mute/master preservation and restore for both worlds. Browser/listening validation remains unverified in this update; the preceding localhost timeout remains a known environment limitation. No dependencies/assets or deployment path changes.

2026-10-13 — Gain calibration and compact world switch:
- All track gains now have a fixed internal ×2 calibration (+6.02 dB), applied both on audio-engine creation and smooth live updates, including wet sends. UI track/master percentages and stored files are unchanged. With the same composition/EQ, a new 50% master supplies the old 100% master signal into the existing master processing; silence/mute remain zero. Offline export shares the same engine calibration. This is not a promise of perceived loudness on every device or unclipped arbitrary maximum mixes; the existing compressor and EQ headroom remain in place.
- Master strip band captions are LOW/MID/HIGH and STAGE (RU: НИЗ/СЕРЕДИНА/ВЕРХ/СЦЕНА), without frequency suffixes and with nowrap. Frequencies remain 120 Hz / 1 kHz / 6 kHz; accessible control labels remain descriptive.
- Setup switch is a transparent original SVG mini-orbit near the upper-right edge, with two fine rings, a glowing core, a satellite and the destination setup name. Static decoration avoids new animation work; responsive placement moves below the wrapped top controls on narrow screens. Focus outline, keyboard/button semantics, busy state, eight tracks and audio-clock world-switch behavior are retained.
- Verification: 68 Node tests pass, including half-master feed parity, full track-level updates, mute silence, short RU/EN captions and existing switching/export contracts. git diff --check passes. The preview endpoint still timed out when requested outside sandbox (normal sandbox request was socket-blocked), so fresh browser layout/listening acceptance is not claimed. No dependencies, third-party graphics, assets or deployment path changes; no commits.


UI refinement (2026-10-15): frameless window actions share the top-right edge; Track 09 minimization is visible only on its page. LOOP/SLICE/PITCH share 26 px buttons, compact selects and sliders, aligned parameter grids and thin arrow-free scrollbars. PITCH octave and actions share one row. The input button is labeled AUDIO INPUT / MIC (localized). Musical settings and timing are unchanged.

Track 09 UI: RECORD is red; orange OVERDUB sits beside recording/Loop in the primary actions. All range controls use the master-volume/EQ accent style. PITCH recorded root is grouped with melody octave in advanced settings (hidden when minimized). Audio semantics are unchanged.


Audio input fix (2026-10-15): enumerate selectable nonempty device IDs before stopping the permission probe; preserve the exposed list if a browser later hides IDs, and avoid probing again only after a successful permission probe in the current session. Hardware stays released after the probe. Local controller state adds accessReady, lastError {stage,name,constraint}, and fileContext; the input window reports errors and console diagnostics include operation/error codes without device IDs/labels. For repeated file:// permission prompts, use scripts/preview.ps1 and localhost:8766; persistent permission remains browser-controlled. No automatic monitoring or permissions on reload.

The first ENABLE INPUTS action always probes capture permission; a named system default alone is insufficient. Diagnostic console entries are readable JSON strings.

- README guitar showcase: `assets/readme/halo-guitar-en.gif` and `halo-guitar-ru.gif` are original silent EN browser captures at 1280×900. REACTOR/HYPER/PHRASE, minimized LOOP and floating input window; no active instrument recording is depicted. No runtime dependencies, sound imports or deployment path changes.


Track 09 SOLO smoothly silences the eight core voices without changing their mute states or levels; disabling SOLO restores them. Offline export honors this gate too. SLICE advanced settings expose TRIM START/END and automatically rebuild slices on trim changes. With Instant Restart off, live playback retains the previous slices until the next phrase cycle; with it on, the new slices apply at the shared phrase restart.


DELETE sits at the right of the recording/import row. SLICE/PITCH expose CYCLE 4/8/16/32 and STEP 1/16, 1/8, 1/4 beside the pattern grid (16 cells; CYCLE 32 repeats them twice). DURATION selects a fraction of natural slice/sample-window playback length, accounting for pitch; PITCH is no longer capped at one step. Rests let notes ring; a new trigger gently chokes the previous voice. PITCH remains bounded by the phrase end in live/offline playback. No slice time stretching is introduced.
