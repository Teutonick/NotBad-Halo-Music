## 2026-10-22 — Non-sticky workstation actions, 30% spacing reduction and scrollbar arrow cleanup

- Changed `.workspace-window-actions` position from `sticky` to `relative`, allowing the collapse (`#workstationToggle`) and Track 09 minimization buttons to scroll naturally with the workstation content instead of remaining fixed/pinned over panel controls.
- Adjusted top and bottom offsets around the window action buttons (`margin: 0 0 6px;`), reducing visual clearances by ~30% (~12px from upper border and 6px bottom margin).
- Styled window action buttons with a subdued background (`rgba(16,28,43,.75)`), matching the `AUDIO INPUT / MIC` button aesthetic.
- Removed native scrollbar arrow buttons across WebKit/Blink by replacing direct `scrollbar-width: thin` with custom `::-webkit-scrollbar` styling and hiding all `::-webkit-scrollbar-button` variants, leaving only the minimalist rounded slider thumb.
- Added regression tests for relative positioning, toggle function, reduced spacing, and scrollbar button suppression. All 344 tests pass.

## 2026-10-21 — Top-aligned promo disclosure tab and responsive menu shift

- Vertically aligned the left-edge project promotion rail to match the upper boundary of the `.music-controls` menu blocks (`PHRASE`, `KEY`, `FILE`).
- Expanding the promotion disclosure card smoothly slides the adjacent menu blocks to the right by its expansion width (230px) using GPU-accelerated transitions (`transition: transform .3s ease`).
- Collapsing the card restores menu blocks to their original left position in complete synchrony.
- Added automated integration tests covering the menu shift on expand and collapse. All 342 tests pass.

## 2026-10-21 — External-score recovery and borrowed built-in timbres

Added shared draft preflight and an optional Node host gate which writes a new checked file only on success. HALO accepts unambiguous root-voice arrangements with repeat/sections by preserving them as one-phrase compositions. JSON/MCP/File Bridge can borrow known role-compatible timbres across worlds; track.soundWorld preserves source identity through manual controls, storage, history, export and sample preparation. The editor displays the imported sound while native selection/GENERATE retain the current world palette. Ambiguous arrangements and musical/security checks remain strict.

## 2026-10-21 — Compact File Bridge reference layout

Packed reference JSON into bounded, readable records (480 characters per line) and compacted symbolic forms/glossary layout. The guide owns the single copy of request forms; capabilities.json retains its formal schema and a guide link. Score exports preserve expanded objects and compact note/step arrays, including incremental state sync. Parsed catalog/schema/music data and receiver behavior remain unchanged. Reload HALO and choose Update Files.

## 2026-10-21 — File Bridge symbolic authoring forms

Added schema-derived request and voice forms at the beginning of the agent guide and in capabilities.json. Creative values remain typed slots; music is authored per task. Rephrased exported agent guidance and corrective receipts as affirmative actions, preserving all receiver and approval checks. Updated both manual locales and contract references.

## 2026-10-21 — Centered panel fold controls

## 2026-10-21 — File Bridge owns synchronization

- Removed agent revision/submission-counter duties; one task ID now carries probe then score. HALO merges independent edits and sends overlapping/missing-baseline proposals to human review, including in auto-apply mode. Changed projects require renewed review. Musical/schema/path validation and WebMCP are preserved.


Centered the shared bottom-panel action group and widened its buttons to 76×30 px with clear borders and hover feedback. Replaced the expand arrow with a symmetric double upward chevron; retained collapse/minimize symbols and Track 09-only minimization. Verified six states in isolated Edge Chromium at 1600×1000 and 390×844: button-group centers match the viewport center, no page errors. No audio, persistence or API changes.

## 2026-10-20 — English agent instructions and undecorated JSON keys

Translated all five agent-context documents to English; retained Russian only as parenthesized glossary translations inside values. Removed translated/decorated timing and terminology property names. Added recursive key checks and a language/translation allowlist check across the complete generated package. Six workflows, musical duration review and score semantics are unchanged. Full regression remains paused.

## 2026-10-20 — Six composer workflows and one vocabulary

Added scoped edit/phraseId routing for note/timbre changes while retaining other phrases, with shared-repeat clarification. Added mandatory duration-intent review without density rejection or filler notes. All five context files share canonical uppercase terms with Russian translations; guide prose is now Russian and literal JSON identifiers remain unchanged. BRIDGE_ROOT distinguishes the connected folder from the ROOT slot. No engine or score semantics changed; full regression remains paused.

## 2026-10-20 — Tolerant File Bridge data syntax

Root and companion readers accept comments, trailing commas, single quotes, simple unquoted keys/values, code fences and unambiguous missing commas. No eval, invented data or source rewriting; duplicate keys and incomplete syntax fail. Musical/revision/path/approval checks stay strict. Canonical exports/schema stay JSON. Raw file bytes still identify the approval proposal.

## 2026-10-20 — File Bridge contract audit

Separated workflow-only guide, canonical JSON Schema in capabilities, unique instrument registry and normalized whole-composition state. Removed internal project fields from agent snapshots and ambiguous “Fix STATE/RECEIPT” wording. Qualified ambient hat IDs as rain-hat/moss-hat without changing engine sounds. Distinguished accepted MIDI 0..127 from acoustic playback registers. Full live-model regression is paused; use the manual candidate after reloading and Update Files.

## 2026-10-20 — Five-workflow File Bridge and verified folder preflight

Rebuilt the composer guide around five user intents. Added same-format probe/ready exchange before composing, full normalized current score projection while keeping internal data in HALO, and atomic per-phrase parameter patches under one approval. Explicitly discloses generated-cycle projection limits and refuses unrepresentable exports. Agent never writes responses or substitutes folders. Existing replace/edit remain accepted; reload/update the connected context before using new modes. No new runtime dependencies or server.

## 2026-10-20 — Explicit receipt checks in the copyable agent prompt

The RU/EN user prompt now explicitly asks for format/event-position preflight, reading the exact matching receipt and correcting error/help/instructionForAgent under the same unfinished ID, at most twice. Terminal/pending statuses take precedence over ok:false repair; missing delivery remains unconfirmed under guide limits. The guide repeats the error fields to read. Step diagnostics now distinguish fractional values, out-of-phrase positions and duplicates with the precise notes/steps path and received value; integer-grid guidance never rounds authored events. Input format and musical timing are unchanged.


## 2026-10-20 — Snapshot recovery and actionable bar gaps

Refresh snapshot exports live state and forces request/companion/receipt bytes to be reread, including same-size/mtime corrections. It never rewrites baseRevision, applies a score or replays a terminal ID. UI confirms the exported revision and explicitly requires agent reconciliation of an unfinished conflicting request. Removed the obsolete “reconcile revision and apply” promise and the generic suggestion to clear files for every format error. PART_BAR_GAP now supplies the missing absoluteStep ranges and distinguishes first-bar density from later-bar coverage; intentional rests remain advisory. No automatic filler, transposition or format inference.



## 2026-10-20 — File Bridge timing terminology

Added a compact shared bar/measure–beat–step glossary, phrase-local indexing, bar-boundary ranges and exact time formulas. Synchronized exported context, RU/EN hints/manual and prompt wording. At 120 BPM eight 4/4 bars are 16 seconds. Preserved intentional rests and exact notes; no playback/validation behavior change. Reload HALO and Update Files.


## 2026-10-20 — File Bridge five-step model regression

Added an opt-in isolated Luna low composer run: Christmas loop, developed song, tempo/meter/key recasting, new pirate-inspired score and non-destructive percussion mute. Real disk files and production receiver; evaluator never authors the submitted music. Protocol and musical-structure assertions, bounded file tools, failure evidence and explicit diagnostic continuation are separate from listening acceptance. No runtime dependencies or engine behavior changes.


## 2026-10-20 — Compact File Bridge composer guide

Reduced the exported guide from 20,155 to 7,882 characters. Retained field types, all timbres and bounded delivery; removed JSON templates, musical teaching, mandatory bar audits and the seven-state script. Optional references and RU/EN manual are synchronized. Receiver validation and musical diagnostics remain unchanged. Reload HALO and Update Files.

- Put the exact format field, complete non-submittable structure template and field-type table first in the composer guide; export the same template in capabilities.json. No ready-made notes or valid silent example.
- Clarified one object/one sound per role, actual numeric event arrays and exclusion of lyrics, composition prose and internal audit plans. Missing-format guidance explains the complete shape; tempo calculations use the selected BPM.
- Regression checks reproduce the NYE descriptive document, refuse format-only repair and unchanged templates, and validate correctly filled typed events at 30 BPM (64 seconds for eight 4/4 bars). No external model acceptance is claimed.

## 2026-10-19 — Evidence before musical claims

- Removed ready-made scores from the agent package; require actual per-bar event and duration checks before publication. New user musical changes require new IDs; receipt statuses never act as approval commands.
- Added scoreAudit to review/pending/applied receipts and a localized expandable bar table. PART_BAR_GAP exposes long melodic/accompaniment gaps even while percussion continues; intentional rests remain allowed. Fixed contradictory retry instructions on rejected receipts.
- Documented the external file-tool enforcement boundary; no Bionic adapter integration or musical-quality/listening certification.

## 2026-10-19 — File Bridge v3

- Replaced competing bridge formats with strict halo-score, verified fixed root/paths and seven sequential states. Flat requests and ID--role companions only; removed operation envelopes, bundle folders, aliases, ignored metadata, creation sound defaults and automatic revision rebasing.
- Separated physical slots, roles, banks and timbres. Added linked contents, file ownership and complete protocol reference; synchronized RU/EN manual and repository agent rules.
- Reload HALO and Update Files. Old requests require new v3 scores. WebMCP and portable project formats remain separate.

### 2026-10-19 — Stop on the actual File Bridge receipt

The exported guide anchors request and response paths to the absolute connected folder, reads the receipt immediately and waits only for absent/stale responses. It forbids shell delay commands and delegated waiting/reviewer loops. With a built-in wait tool there are at most three reads, 4–5 seconds apart; without one, only one immediate reread before reporting unconfirmed delivery. Matching applied/rejected receipts terminate the workflow before generic errors or freshness checks; appliedRevision does not require submissionVersion. Empty scoreReport is a complete diagnostic result, not a missing report. No runtime protocol change; host reviewer behavior and external-agent compliance are outside HALO's control. Reload HALO and Update Files to refresh the connected guide.

### 2026-10-19 — Connected promotion card and coffee tab

- Fixed overlapping vertical titles and detached coffee badges: card and rail now use one content-aware height and aligned donation footers. The outer coffee toggles the panel; only the inner Donate link opens YooMoney.
- Tall workstations leave the promotion intact in the free left column; narrow layouts reserve room above the scrollable workstation. Product/locale changes recalculate size.

### 2026-10-19 — A musical brief is enough for File Bridge

The RU/EN example prompt now asks for music and checked delivery without score-format names, request paths or filenames. The exported AGENT_GUIDE.md owns unused request naming, delivery to the connected folder, bar-by-bar self-checks, deliberate tempo selection, receipt correlation and bounded checks (4–5 seconds apart, at most three checks per submission). Pending approval requires reviewing every scoreReport item: repair accidental musical omissions within two total correction rounds, or explain intentional rests/repetition. Final replies must reflect the saved score and fresh receipt; validation is not artistic completion or listening evidence. No automatic music rewriting or new runtime dependencies. Reload HALO and Update Files to refresh the connected guide; agent compliance remains dependent on the external model.

### 2026-10-19 — Donation link in project promotion

- Added a subdued warm-orange bilingual “Donate ☕” link below the project card and a decorative coffee disclosure at the bottom of the folded rail, both opening the supplied YooMoney page in a new tab.

### 2026-10-19 — Tolerant score acceptance

The browser-only File Bridge score adapter handles `bpm` → `tempo`, `timeSignature` → `meter`, role ID case/whitespace, sound ID case/whitespace/prefixes, unordered events, exact duplicates and same-step chord notes. Conflicting aliases and structural/API fields remain errors. Unknown non-structural fields on score, phrase, section and voice objects are ignored and reported; root `duration` is metadata, while voice `duration` remains a validated 0–100 timbre control. Role/slot routing and compatible sound resolution remain automatic. Unknown or incompatible sounds, invalid MIDI/polyphony/steps, unsafe file references and revision conflicts remain strict. Legacy operations and WebMCP retain their existing validation.

`scoreReport` in the pending receipt and review panel separates repairs from advisory warnings: no sounding parts, enabled empty parts, disabled/zero-level parts with events, no new events in the second half, identical melody halves and identical rhythms across at least three sounding parts. Diagnostics inspect event structure, including each song phrase; sound tails and artistic intention are not inferred. Intentional repetition/silence is allowed. HALO never fills missing bars or changes authored tempo/pitches to improve a score. Audition before approval; these heuristics do not certify musical or audio quality. Retained generated parts in edit mode are excluded from authored-event coverage checks. Compatible default sounds, when omitted for new music, are explicitly reported. Refresh connected context files after reloading HALO.

### 2026-10-19 — Composer owns orchestration

The File Bridge guide now includes the complete instrument palette with exact sound IDs, timbre names, natural parts and other supported roles. It asks the agent to choose instruments and author original notes; default timbres are a compatibility fallback. The syntax sample is explicitly not a finished composition. No synthesis, generator or score-parser behavior changed.

### 2026-10-19 — Simple File Bridge scores

File Bridge now accepts `halo-score`: named musical roles and note tuples, with automatic compatible sounds, bank/slot routing and transaction construction. New music uses replace; edit preserves unmentioned parts. The short agent guide is sufficient; catalogs and legacy operations are optional. Human approval, revision/content checks and existing API compatibility remain. Reload HALO and use Update Files in the connected folder. See [score protocol](docs/agent-api-specification.md).

## 2026-10-19 — File Bridge instructions and guide layout

Agent instructions now default to JSON files directly in HALO-created requests/, with request-prefixed companions published before the root request. No directory creation is needed; denied file writes stop with a path report. Existing bundle support is unchanged. Bilingual safety/background notes sit inside the scrollable manual body, after its header. Refresh a connected folder with Update Files to receive the revised AGENT_GUIDE.md.

- 2026-10-18: Added the by FLX header credit and aligned the visible terms portrait to the right edge.

- 2026-10-18: Strengthened Filexa fading toward the orbits, with earlier fade and reduced opacity on narrow windows.

### 2026-10-18 — Filexa backdrop

- Added a mirrored, softly faded local Filexa portrait at the left beneath the orbits and controls; responsive height and static Pages packaging.

## 2026-10-18 — Include terms portrait in Pages package

- Fixed the static Pages package to copy assets/filexa-terms.webp, which was omitted from the assets allowlist and caused a production 404.

## 2026-10-18 — Filexa portrait in first-use terms

- Added the supplied static portrait to the right third of the first-use terms dialog; bilingual terms occupy the left two-thirds and scroll independently.
- The portrait is decorative and static, served as local WebP. Existing language switching and acceptance controls remain in the text column.

## 2026-10-18 — Removed Filexa header animation

- Removed the Filexa character from the header and removed its CSS animation/filter code and lifecycle script. Its asset folders remain unused in the repository.
- Styled the first-use terms dialog scrollbar as a thin native-color track without system arrow buttons.

## 2026-10-18 — Initial Filexa header experiment (superseded)

- Tried a layered animated Filexa in the header, then removed it after review. Current placement is a static portrait in the first-use terms dialog.

## 2026-10-18 — Production repository preparation

- Removed temporary diagnostic artifacts and consolidated historical acceptance reports into `docs/release-validation.md`; preserved music fixtures under `examples/ai/`.
- Pages now runs regression tests and uploads an explicit static package instead of the full repository. Added ignore rules for generated evidence and package output; refreshed bridge script cache versions.

## 2026-10-18 — Reliable File Bridge submissions

- Unified folder/flat polling, tracked companion changes, added explicit pending/applied/error/rejected responses and approval-time snapshot checks; applied/rejected IDs, including legacy rejection receipts, remain terminal across reconnects.
- Shortened folder-agent guide, corrected key recipes, versioned the deduplicated instruments context as v2; retained full eight-track scoring and file-tool-aware modular writes without conflating WebMCP budgets.
- Matched WebMCP schemas to actual operations, reserved layout space for the default PHRASE panel and corrected the stopped-song caption. Synchronized bilingual manual and API/capabilities docs. No backend, assets or dependencies added.

## [Unreleased] - 2026-10-18

### Added
- **Modular Multi-File Requests & Folder Bundles for Full 8-Track Scoring (`src/file-bridge.js`, `docs/`, `tests/`):**
  - **Eliminated AI Tool-Calling Truncation Crashes:** Resolved fatal JSON parser errors (`Unterminated string in JSON at position ~2158`) that external AI models encountered when attempting to score all 8 voices note-by-note into a single monolithic string argument.
  - **Folder Bundles (`requests/<requestId>/`):** External agents can create subdirectories in `requests/` containing `manifest.json` (or `request.json` / `<bundle>.json`) alongside companion track files (`track-0.json` ... `track-7.json`). HALO automatically discovers folder bundles via `handle.kind === 'directory'`, resolves all relative companion files within that directory, and presents a single unified proposal in the web UI.
  - **Operation-Level & Track-Level Modular Companion Files:** Supported `{ op: 'track.patch', trackIndex: 5, file: 'track-5.json' }` and `project.replace` with `tracks: [{ file: 'track-0.json' }, ...]`, as well as multi-part request splitting via `parts: ['drums.json', 'melody.json']`.
  - **Path Traversal Security Guards:** Path traversal attacks (`..`, absolute paths with `/` or drive letters `C:`) are strictly prohibited and safely rejected with `INVALID_FILE_PATH`.
  - **Tolerant Companion Defaults:** Track companion files automatically default to `on: true`, `generator: 3`, `instrument = name`, and `exact = true` when steps or notes are supplied.
  - **Recursive Bundle Cleanup:** `resetLocalChanges` recursively deletes both request files and bundle subdirectories (`recursive: true`).
  - **Comprehensive Automated Test Suite:** Added 6 new unit tests in `tests/file-bridge.test.cjs` covering operation companion files, modular 8-track orchestration, parts array expansion, security guard rejection, bundle scanning, and companion file filtering (all 26 tests passing).

### Fixed
- **Double Scrollbar Elimination in Agent Panel (`index.html`):** Removed nested `max-height` and `overflow: auto` from `.agent-panel`, ensuring the panel expands naturally in the vertical layout and inherits the single shared scrollbar of `.bottom`, eliminating the inner double scrollbar.

## [Unreleased] - 2026-10-17

### Added
- **Compact Token Budget Directive (< 1.5 KB) & Resilient Track Defaults (`src/file-bridge.js`, `src/project.js`, `docs/`):**
  - **Tool-Calling String Buffer Guard:** Resolved fatal `Error: Unterminated string in JSON at position ...` crashes that occurred in external AI harnesses (Cursor, Claude Code, LiteLLM) when agents generated massive requests. Added prominent *Mandatory Token Budget Directive* in `AGENT_GUIDE.md` directing models to keep requests under 1.5 KB by targeting only key solo/bass tracks and leaving remaining tracks to engine-generated defaults.
  - **Compact Canonical Example 2:** Refactored Recipe/Example 2 (Holiday 8-Bar Jingle) from 3.5 KB to a concise ~1.2 KB payload with single-line note event groupings.
  - **Tolerant Track Defaults in `src/project.js`:** `project.validate` now defaults omitted `steps` to `[]`, omitted `on` to `true`, and missing numeric controls (`density`, `character`, `duration`, `space`) to `50` (or `30` for `space`), preventing unexpected validation rejections when external agents pass compact track representations.
- **Zero-Prompt Autonomous Directives & Canonical Recipes (`src/file-bridge.js`, `docs/`):**
  - **Zero-Prompt-Engineering Autonomous Directives:** Users never need to formulate elaborate technical prompts. Providing just a folder path and a brief creative prompt (e.g. *"напиши новогодний луп-джингл"* or *"сочини композицию по мотивам OST пираты карбиского моря"*) triggers autonomous mapping via the *Prompt-to-Architecture Decision Matrix* in `AGENT_GUIDE.md` (selecting between `project.patch` vs `composition.replace`, `ambient` vs `reactor`, `4/4` vs `3/4`, key, and instrumentation).
  - **The Full-Span Duration Principle:** Added explicit guidelines in `AGENT_GUIDE.md` and `music-rules.json` (`fullPhraseCoverageWarning`, `fullPhraseCoverageRule`) explaining that 8-bar phrases require steps spanning `0..127` in 4/4 and `0..95` in 3/4. Restricting steps to `0..15` leaves bars 2–8 completely silent.
  - **Canonical Recipes A & B:** Added ready-to-use recipes in `AGENT_GUIDE.md`:
    - *Recipe A (Holiday / New Year 8-Bar Jingle):* C Major (`key: 0`), 96 BPM, 8 bars in `ambient`. VEIL (track 5, `bell`) plays the festive melody across steps 0..112; RAIN (track 4, `round`) plays bass roots across steps 0..120; ROOT (track 2, `shaker`) provides eighth-note sleigh bell groove; AURA (track 7, `wind`) plays 4-note chord pads on downbeats (0, 32, 64, 96, 112).
    - *Recipe B (Epic Cinematic / Pirates of the Caribbean):* D Minor (`key: 14`), 104 BPM, 8 bars per phrase in 3/4 (96-step 6/8 pirate swing) in `reactor`. Phrases: Intro (`dark-piano` Dm chords), Verse (`pick-bass`, `palm-guitar`, `octave-lead` galloping theme), Chorus (`singing-lead`, `power-guitar`, full rock drums), Outro (fade out). Arrangement: `intro` (x1) -> `verse` (x2) -> `chorus` (x2) -> `verse2` (x1) -> `chorus` (x2) -> `outro` (x1, `fade: "out"`). Strictly allowlisted section names: `["intro", "verse", "verse2", "chorus", "bridge", "outro", "phrase"]`.

### Fixed
- **Double Scrollbar Elimination in Agent Panel (`index.html`):** Removed `max-height: min(440px, 50vh)`, `min-height: 180px`, `overflow: auto`, `overscroll-behavior: contain`, and `.agent-panel.filebridge-mode` styles from `.agent-panel`. The panel now expands naturally in the vertical flow, inheriting the single shared scrollbar of `.bottom` in exact alignment with `.live-loop-panel`.

- **File Bridge Context Package, exact=true Auto-Promotion, startStep Alignment & 5s Verification Loop (`src/file-bridge.js`, `src/agent.js`, `capabilities.json`, `docs/`):**
  - **Automatic `exact = true` Promotion in `track.patch`:** Resolved `EXACT_REQUIRED: manual steps modification requires exact=true` occurring when external AI agents supply custom rhythmic `steps` or `noteEvents` via `track.patch` without explicitly specifying `"exact": true`. When `steps` or `noteEvents` are supplied in `track.patch.values` on a Generator 3 track and `exact` is omitted, HALO automatically sets `t.exact = true`, immediately playing the custom pattern without throwing validation errors. Explicitly setting `exact: false` while supplying steps continues to enforce the requirement.
  - **Automatic `startStep` Phrase Alignment on `bars` Modification:** Resolved `Invalid phrase position` which previously crashed batches when projects in active playback (`startStep: 64`) were patched with `bars: 8` (`64 % 128 !== 0`). When `bars` is modified via `project.patch` or `phrase.patch` and `startStep` is omitted, HALO automatically aligns `startStep` to the new phrase boundary (`Math.floor(startStep / maxSteps) * maxSteps`).
  - **5-Second Verification Loop & Error Self-Correction:** Updated `AGENT_GUIDE.md` and `AGENTS.md` specifying a 4-step workflow: after writing `requests/<requestId>.json`, agents wait 4 to 5 seconds and inspect `responses/<requestId>.result.json`. If an error result exists (`"ok": false`), the agent reads `"error"`, `"help"`, and `"instructionForAgent"`, self-corrects the batch, and rewrites the request (up to 2 retries). If no error result exists, the proposal is valid and queued for human approval in the HALO web UI.
  - **Cross-Referenced Documentation Package:** All 5 technical context files (`AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, `project-state.json`) now include mutual cross-references and a unified manifest table explaining document purposes and usage workflows.
  - **Read-Only vs Mutable Field Segregation:** Explicitly resolved `UNKNOWN_FIELD: unexpected field(s) [role] in track.patch` by formalizing that track `role` and `name` are permanent read-only slot identities (slots 0..7) and are strictly prohibited in `track.patch.values`. Added `readOnlyProhibited` declarations in `capabilities.json`, `trackPatchRules` warnings in `instruments.json`, `fieldAccess` read-only notices in `project-state.json`, and an upfront `CRITICAL DIRECTIVE: Read-Only vs Mutable Fields` section in `AGENT_GUIDE.md`.
  - **8-Voice Role & Polyphony Matrix Table:** Added a comprehensive architecture table in `AGENT_GUIDE.md` detailing all 8 voice slots (`trackIndex: 0..7`), canonical names, roles, strict polyphony limits (mono bass/arp, duo lead, 4-note chord harmony, empty notes percussion), register bounds, and recommended presets for both `ambient` and `reactor` setups.
  - **Actionable Self-Correcting Error Guidance:** Enhanced `generateErrorGuidance` for `UNKNOWN_FIELD`, `EXACT_REQUIRED`, and `Invalid phrase position` to provide immediate, actionable remediation instructions.
  - **Unit Tests & Documentation:** Added comprehensive automated test coverage in `tests/agent.test.cjs` and `tests/file-bridge.test.cjs` verifying exact=true auto-promotion, startStep alignment, mutual references, Cyrillic-free AI instructions, schema segregation, and error guidance. Synchronized `docs/engine-capabilities.md`, `docs/agent-api-specification.md`, and `PROJECT_MAP.md`.
- **File Bridge Continuous State Auto-Sync & Smart Auto-Rebase Tolerance (`src/file-bridge.js`):**
  - **Continuous Auto-Sync of `project-state.json`:** Eliminates recurring `CONFLICT_REVISION_MISMATCH` errors when external agents compose music. HALO tracks `lastSyncedRevision` and automatically writes the latest snapshot to `project-state.json` every 1.5s whenever internal project revisions change (e.g. from UI tempo, volume, mute, or preset changes).
  - **Automatic Rebase Tolerance:** If an incoming request was generated based on an older revision, HALO validates the operations against the current revision. If clean and conflict-free, the request is automatically rebased (`rebased: true`), badged in the UI as `✓ Ревизия согласована (${originalBaseRevision} → ${currentRevision})`, and queued for human approval instead of being rejected.
  - **1-Click `[⚡ Согласовать ревизию]` / `[⚡ Rebase & Retry]` Button:** Added to the error card to immediately flush the latest state, clear error caches, and re-evaluate pending requests.
  - **Unit Tests & Documentation:** Added comprehensive test suite in `tests/file-bridge.test.cjs` covering continuous sync, rebase validation, checkFolder auto-rebase, and retry actions. Synchronized bilingual user guide (`index.html`), `docs/engine-capabilities.md`, `docs/agent-api-specification.md`, and `PROJECT_MAP.md`.

### Fixed
- **File Bridge Folder-Only Reset, slicePoints Allowlist, Unified Scrolling & Connection Diagnostics (`src/file-bridge.js`, `src/agent.js`, `src/project.js`, `index.html`):**
  - **Folder-Only Reset (`resetLocalChanges` in `src/file-bridge.js`):** Resolved critical issue where clicking «Сбросить изменения» in File Bridge duplicated «RESET WORKSPACE» by clearing browser `localStorage` and wiping the active composition. `resetLocalChanges` now strictly operates on the connected folder: it removes files in `requests/` and `responses/`, resets error counters/caches, and re-syncs the active in-browser project snapshot to the 5 context files on disk without modifying `localStorage` or resetting the user's tracks. Updated button label to «↺ Очистить запросы» / «Clear Folder Requests» and clarified confirmation dialog in RU and EN.
  - **`UNKNOWN_FIELD: [slicePoints]` Resolution (`src/agent.js`, `src/project.js`):** Added `'slicePoints'` to the allowlisted fields of `liveLoop.settings` in `src/agent.js` and `capabilities.track09`, and added `slicePoints` validation to `liveLoop(value)` in `src/project.js`. This prevents crashes during project snapshotting, file bridge export, and schema validation when Track 09 slices are interactively adjusted.
  - **Double Scrollbar Removal (`index.html`):** Removed nested `max-height: min(500px, 60vh)` and `overflow: auto` from `.agent-panel` and `.agent-panel.filebridge-mode`, unifying scrolling with `.bottom` matching Track 09 (`.live-loop-panel`) and eliminating inner scrollbars.
  - **Folder Connection Resilience & Visible Diagnostics (`src/file-bridge.js`):** Resolved issue where folder connection stalled after creating empty `requests/` and `responses/` directories with no visible feedback when an error occurred in `syncAllContext()`. Added visible error banners in `updateView()` when `!s.connected && s.error` with monospace error text and actionable guidance, along with comprehensive `[HALO File Bridge]` browser console logging across connection, synchronization, and folder polling.
- **Live Loop Sequencer Pad Reset & Relative Duration Sustain (`src/live-loop.js`):**
  - **Sequencer Pad Step Reset (`#sliceSeqGrid`):** Right-clicking (`contextmenu`) or long-pressing (>450ms) on any of the 16 pattern pads in `SLICE` or `PITCH` modes resets the step to rest (`-1`, displayed as `—`), removes active styling, flags the pattern as `'custom'`, and suppresses context menus and ghost clicks. Keyboard shortcuts (`Delete`, `Backspace`, `0`) also clear the focused pad.
  - **Natural Slice Duration & Rest Sustain Hold:** Slices followed by rests now sustain their natural sliced audio length instead of decaying prematurely. The audio envelope maintains peak volume (`1.0`) until `holdEnd = atTime + gateDur - releaseDur` with a quick anti-click release (`6-25ms`) immediately preceding the next boundary, allowing slices to ring out naturally when not choked by subsequent steps.
  - **Relative Duration Scaling (5% – 100%):** The `DURATION` slider now scales playback length proportionally relative to each slice's natural duration (`slice.duration / rate * durFraction`) rather than clamping all slices to an arbitrary flat cutoff.
  - **Monophonic Voice Choking:** When a new active slice triggers before the previous slice has finished, the previous voice is choked smoothly in 4ms (`cancelScheduledValues` / `linearRampToValueAtTime(0.0001, atTime + 0.004)`), eliminating overlapping voice phase distortion while maintaining full sustain into empty steps.
  - **PITCH Mode Parity:** Extended relative duration scaling, sustain hold, and anti-click release curves to pitch-shifted slices in `schedulePitch`.
  - **Synchronized Offline Export:** Updated `renderPhraseOffline` in `src/live-loop.js` to mirror relative duration scaling, sustain hold, and voice choking in rendered audio exports.
- **Arranger 3/4 & 6/8 Meter Assembly & AudioContext Closed Guard (`src/arranger.js`, `src/song.js`, `src/song-ui.js`, `src/live-loop.js`):**
  - Resolved `INVALID_STEPS: steps for track "GLASS" must be unique integers between 0 and 47` occurring when building compositions («Собрать композицию») with 3/4 meter (3/4 waltz and 6/8 pirate swing):
    - `src/arranger.js` now dynamically calculates steps per bar (`spb = timeSignature === '3/4' ? 12 : 16`), bounding 4-bar intro/outro steps strictly to 0..47 (`p.bars * spb = 48`) instead of hardcoding 16 steps per bar (which retained and generated steps up to 63).
    - Preserved `timeSignature` throughout `develop(kind)`, `Arranger.build()`, and `Song.validate()` at the root of `halo-composition`.
    - Updated note pitch calculations in `arranger.js` to use `spb` and forward `timeSignature` to `sounds.notesFor(...)`.
    - Fixed `visualGain(step)` in `src/song-ui.js` to compute phrase step bounds dynamically per phrase's time signature.
  - Resolved console warnings `Connecting nodes after the context has been closed is not useful`:
    - `updateMixerNodes(at)` in `src/live-loop.js` now explicitly checks `activeAudio.ctx.state !== 'closed'` before creating or connecting mixer and delay send nodes.
- **File Bridge Directory Handle Hardening & Reconnect Crash (`src/file-bridge.js`):**
  - Resolved `dirHandle.getDirectoryHandle is not a function` error when clicking «🔓 Возобновить доступ к «...»» ("Reconnect"):
    - Added `asDirectoryHandle(obj)` validation helper verifying that `getDirectoryHandle` and `getFileHandle` are native functions.
    - Protected `storeDirectoryHandle` and `retrieveStoredDirectory`: corrupt or plain serialized objects without methods are safely rejected and automatically purged from IndexedDB (`clearStoredDirectory`).
    - In `doRestore()`, invalid handles are purged from storage and `state.savedDirectory` is set to `null`, preventing the UI from showing an unusable Reconnect button.
    - In `connect(handle)`, guarded handle validity: on any exception, explicitly resets `state.connected = false; dirHandle = null;` and stops `pollInterval`, eliminating the false "● Папка подключена" badge with an error banner beneath it.
    - In `btnReconnect.onclick`, checks `targetHandle`: if invalid or missing `requestPermission`, gracefully falls back to `showDirectoryPicker`.
- **AI Token Budget & Compact Batch Directive (`src/file-bridge.js`, `capabilities.json`):**
  - Resolved `Error: Unterminated string in JSON at position 3471 (line 1 column 3472)` and `position 3410`:
    - LLM tool-calling harnesses (such as Bionic/Qwen) buffer tool-call arguments into single-line strings. When models generate monolithic 8-track `project.replace` objects with hundreds of note events, the output string exceeds ~3500 chars and gets truncated.
    - Added **CRITICAL TOKEN BUDGET & COMPACT BATCH DIRECTIVE** in `AGENT_GUIDE.md`: instructs external agents to compose concise requests (< 1.5 KB) using `project.patch` (setting tempo/bars/key) and targeted `track.patch` calls for key melodic and bass voices.
    - Corrected Example 3 in `AGENT_GUIDE.md` with valid ambient sound IDs (`air`, `string`, `marimba`, `wind` instead of non-existent `pad`, `piano`, `pluck`, `drone`).
    - Added Example 4 in `AGENT_GUIDE.md` showing how to compose a festive holiday jingle in under 1 KB using `project.patch` + `track.patch`.
    - Added `project.patch` to operations in `generateCapabilities()` and `capabilities.json`.
- **UI Prompt Synchronization (`src/file-bridge.js`):**
  - Updated the example prompt in the File Bridge UI in Russian and English to replace `"и проверь, что ответ в responses/ подтвердил применение"` with `"и заверши работу, чтобы я мог подтвердить изменения в HALO"`, strictly aligning with the asynchronous Human-in-the-Loop protocol.
- **Revision Mismatch on Reset, project.patch & Bank Aliases (`src/agent.js`, `src/file-bridge.js`, `src/project.js`):**
  - Resolved `CONFLICT_REVISION_MISMATCH: expected revision 13, request was based on 1` after clicking «Сбросить локальные изменения»: `resetProject()` in `src/agent.js` now resets the internal revision accumulator `revision = 0; last = '';`, guaranteeing that a fresh/reset project baseline always begins at `revision: 1`.
  - Added `project.patch` as an allowlisted operation across agent capabilities, preview, and apply pipeline, and added tolerance for partial `project.replace` (treating `values` or omitted tracks gracefully as project patches instead of throwing `MISSING_PAYLOAD`).
  - Added automatic bank/slot alias mapping (`BASS`, `KEYS`, `LEAD`, `RIFF`, `PERC`, `KICK`, `SNARE`, `BELL`, etc.) and cross-bank sound auto-detection in `src/project.js`, allowing LLMs to reference roles intuitively without validation failures.
  - In `src/file-bridge.js`, `resetLocalChanges()` now fully purges `processedContent`, `processedIds`, and `appliedIds`, and populating `state.pending` clears stale error banners immediately.
- **Sound & Vibe Setup Availability and Error Self-Correction (`src/sounds.js`, `src/roles.js`, `src/project.js`, `src/agent.js`, `src/file-bridge.js`):**
  - Resolved issue where an external AI was unable to self-correct upon encountering `INVALID_SOUND: sound "reactor-dry-kick" is not available for slot "GLASS" in world "ambient"`:
    - Added explicit `setups` array on all presets and exposed `soundsBySetup` in `instruments.json` to clearly communicate vibe-dependent instrument catalogs. Supported future multi-setup instruments (`setups: ['ambient', 'reactor']`).
    - Added support for `setup`, `world`, and `soundWorld` aliases across project parsing and composition validation.
    - Supported setup auto-inference (automatically resolving `setup = 'reactor'` if `setup` is omitted but reactor sounds are present) and automatic prefix stripping.
    - Enhanced error messages with contextual `help` and actionable `instructionForAgent` directing the model to switch setups or choose available sounds.
    - Added file-modification retry detection in File Bridge: when an agent overwrites a failed request file in `requests/`, HALO automatically re-evaluates the modified file, removes stale error `.result.json` files, and queues the valid proposal for human approval.
- **Reset Local Changes Crash & Infinite Canvas Render Loop (`src/agent.js`, `index.html`, `src/file-bridge.js`):**
  - Resolved `Uncaught Error: Invalid numeric value` occurring during File Bridge «↺ Сбросить изменения» ("Reset Local Changes"): `agent.resetProject()` now explicitly outputs `startStep: 0` and preserves Generator 3 role and sequence metadata instead of overriding tracks with generator 1.
  - Hardened `applyProjectState()` in `index.html` to guarantee `step` and `frozenBeat` always evaluate to finite numbers (`0` when `startStep` is omitted or undefined), preventing `frozenBeat = NaN`.
  - Guarded `phraseWindowStart()`, `snapshotProject()`, and `getMasterBeat()` against non-finite beats, eliminating `NaN` propagation to `HaloProject.capture()` and `validate()`.
  - Protected `draw()` animation loop in `index.html` with finite coordinate validation before calling `ctx.createRadialGradient()` and wrapped frame rendering in a `try...catch...finally` block, ensuring `requestAnimationFrame` never dies and orbit visual rendering remains resilient.
  - Enhanced localStorage cleanup in `resetLocalChanges()` to clear `'halo-pattern-v1-reactor'` alongside ambient and composition keys.

### Added
- **Interactive Waveform Slice Dragging & Auditioning (`src/live-loop.js`):**
  - **Slice Boundary Divider Dragging:** Hovering over a slice boundary divider or badge in `SLICE` mode highlights the divider (`#b6fff8`, width 2px) and changes the cursor to `col-resize`. Dragging smoothly adjusts `slices[k-1].endSec` and `slices[k].startSec` with minimum duration clamping (`MIN_SLICE_DUR = 0.025s`), updates `settings.slicePoints` normalized coordinates, persists cuts to IndexedDB, and auditions the adjusted slice on release.
  - **Slice Strip Dragging:** Dragging inside a slice strip shifts both start and end timestamps together along the timeline within adjacent bounds.
  - **Slice Reconstruction Parity:** `rebuildSlices()` utilizes `settings.slicePoints` to reconstruct slices, preserving custom user edits across loop cycles, phrase switches, and offline audio exports.
- **Waveform Drag & Drop Audio File Import Zone (`src/live-loop.js`, `index.html`):**
  - **Drag & Drop Dropzone:** The waveform card (`.loop-waveform-card`) and canvas wrap are now an active Drag & Drop zone. Dragging files over the area activates `.is-dragover` with a cyan glowing border (`#63d2c6`), box shadow, and dashed drop box on the canvas.
  - **Strict Format Validation:** `isSupportedAudioFile(file)` verifies MIME types and file extensions, accepting only WAV, MP3, OGG, FLAC, M4A, AAC, and WEBA/WEBM audio files. Dropping unsupported formats (PDF, images, documents, executables) triggers a localized explanatory toast: *"Неподдерживаемый формат. Принимаются аудиофайлы: WAV, MP3, OGG, FLAC, M4A, AAC"*.
  - **Tap-to-Import:** Tapping or clicking the empty waveform canvas directly opens the file picker dialog to import audio files.
  - **Exported API:** Added `getSlicePoints()`, `setSlicePoints()`, `isSupportedAudioFile()`, and `clearAllLayers()` to `HaloLiveLoop`.
- **AI File Bridge Anti-Hallucination & Zero-Execution Protocol (`AGENT_GUIDE.md`, `src/file-bridge.js`, `AGENTS.md`, `.agents/rules/halo-bridge.md`, `docs/agent-api-specification.md`, `index.html`):**
  - Formally prohibited AI models from hallucinating local HTTP servers, localhost ports (3000, 3001, 8080, 5173), non-existent CLI tools (`halo`), or executing background terminal commands (`curl`, `netstat`, `where.exe halo`, `node`, `npm`, `python`).
  - Prohibited external agents from attempting browser automation or URL opening.
  - Enforced a strict linear 3-step sequence: 1) Read context; 2) Compose and self-validate batch in-memory; 3) Write to `requests/<requestId>.json` and terminate turn immediately.
  - Clarified that request execution is strictly Human-in-the-Loop: results in `responses/` are generated asynchronously only after the user reviews and clicks "Approve" in the web UI. Agents must never block, sleep, or poll for response files during request generation.
- **File Bridge Toolbar Controls & Reset Local Changes (`src/file-bridge.js`, `src/agent.js`):** Added a dedicated «↺ Сбросить изменения» ("↺ Reset Changes") button to the File Bridge toolbar. It clears `requests/` and `responses/` files, resets error counters, clears dirty localStorage project keys (`halo-pattern-v1`, `notbad-halo-autosave-v1`, `halo-composition-v1`), restores clean default project state from the server/defaults, and re-syncs all 5 context files.
- **Internal Modal Dialog Confirmation (`src/file-bridge.js`, `index.html`):** Both «✕ Отключить» ("✕ Disconnect") and «↺ Сбросить изменения» ("↺ Reset Changes") require user confirmation via HALO's internal modal dialog (`window.HaloConfirm`), preventing accidental project wipes or disconnections.
- **In-UI Error Recovery Directive & Action (`src/file-bridge.js`):** When a command error occurs or is displayed in the bridge UI, an explicit suggestion prompt is shown: *"Если ошибка не уходит, сбросьте локальные изменения и попросите нейросеть повторить запрос."* with a 1-click button `[↺ Сбросить локальные изменения]` that triggers the confirmed reset.
- **100% English AI Directives & Schemas (`temp/AGENT_GUIDE.md`, `src/file-bridge.js`, `music-rules.json`):** Translated all AI guidelines, rules, error explanations, and composition canons into clean, idiomatic English without Russian text, optimizing prompt parsing and tool execution reliability for LLM agents (Antigravity, Bionic, Codex, Claude).
- **AI Agent Anti-Looping Circuit Breaker & Error Guidance (`src/file-bridge.js`):** Tracked `consecutiveErrors` per session; upon 3 consecutive validation failures, HALO injects an explicit `CRITICAL STOP DIRECTIVE` instructing external LLMs (Codex, Antigravity, Bionic, Claude) to immediately cease parameter guessing and retry loops, and formulate a clarifying question for the user instead.
- **Actionable Error Diagnostics (`src/agent.js`, `src/file-bridge.js`):** Included contextual `help` and `instructionForAgent` in `responses/<requestId>.result.json`. Replaced vague `UNKNOWN_PARAMETER` with precise field-level diagnostics `UNKNOWN_FIELD: unexpected field(s) [...] in <path>. Allowed fields: [...]`.
- **Project & Preset Schema Tolerances (`src/agent.js`, `src/project.js`):**
  - Accepted format alias `'halo-project'` alongside `'notbad-halo-project'`.
  - Accepted operations payload under either `o.project` or `o.composition` for both `project.replace` and `composition.replace`.
  - Automatically stripped sound world prefixes from preset names (e.g. `'ambient-bell'` → `'bell'`).
  - Tolerated top-level metadata in `halo-composition` (`setup`, `timeSignature`, `bars`, `name`, `title`, `label`), automatically inheriting them to child phrases.
  - Added descriptive `INVALID_TRACKS_COUNT` validation explaining that `project.replace` requires all 8 tracks `[GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]`, recommending `track.patch` for partial edits.
- **Toast Notification Placement Polish (`index.html`):** Repositioned `#toast` popup from `top: 90px` to `top: clamp(160px, 36vh, 38vh)` with backdrop blur and high z-index, hovering above the universe center and eliminating overlap with top toolbar buttons (`FILE SAVE LOAD MP3 WAV SHARE`). Removed hardcoded inline `style.top` override in motion toggle.
- **Authentic 3/4 Waltz & 6/8 Pirate Swing Pattern Generation (`src/phrases.js`, `src/sounds.js`):** Authored two world-standard rhythmic motif catalogs: `catalog3_4_waltz` (4 bars = 48 steps) and `catalog6_8_swing` (8 bars = 96 steps) with 10 authentic, mutually orchestrated rhythmic patterns per role across all 14 roles.
  - 3/4 Waltz features classic "Boom-Chak-Chak" orchestration (kick & bass on downbeat 1, chords & snare on afterbeats 2 and 3, lyrical cascading melodies) and metric dynamic accents (.88 / .78).
  - 6/8 Pirate Swing features swashbuckling compound groove (two compound beats on steps 0 and 6, heavy backbeat on 6, rolling eighths `[0, 2, 4, 6, 8, 10]`, dactylic gallop riffs `[0, 3, 4, 6, 9, 10]`, and dynamic accents .90 / .86).
  - Added meter-adaptive polymetric cycle profiles `cycleProfiles3_4` and `cycleProfiles6_8` (12, 6, 24, 9, 8 steps) and dotted delay `1/8d` prioritization.
  - Fully synchronized «СОЗДАТЬ» (GENERATE), transport, roles, `index.html` (both RU and EN manuals), `docs/engine-capabilities.md`, `docs/agent-api-specification.md`, `src/file-bridge.js`, and `temp/` folder artifacts. All 224 automated unit tests pass cleanly.
- **File Bridge Directory Persistence (`src/file-bridge.js`):** Connected folder handles are securely remembered across page reloads in browser IndexedDB (`halo-file-bridge-v1` / `handles` / `last-directory`). Reconnection restores automatically if permission was retained, or in a single click via «🔓 Reconnect «[Folder]»» without reopening the file picker, alongside «📁 Choose other» and «✕ Forget».
- **Composition Safety Limit (`src/song.js`):** Added engine-level hard cap of **maximum 15 unique phrases** (`MAX_PHRASES = 15`) and 32 sections (`MAX_SECTIONS = 32`) to prevent runaway memory/loop states.
- **Agent API Canon for Compositions:** Enriched agent guidelines and capabilities specification (`docs/agent-api-specification.md`, `AGENT_GUIDE.md`): HALO defaults to single phrases/loops, but can construct complete multi-section arrangements (*Intro → Verse → Chorus → Verse 2 → Bridge → Outro*) with section repeats when explicitly requested.
- **Sound World Switching API Guidance:** Clarified `setup: 'ambient' | 'reactor'` differentiation in agent documentation (pure procedural synthesis vs 130 authentic CC0 acoustic/electric recordings).
- Support for **3/4** and **6/8** musical time signatures: 4 bars in 3/4 mode corresponds to a 3/4 waltz (48 steps, 3 quarter beats), while 8 bars in 3/4 mode corresponds to a 6/8 rocking pirate swing (96 steps, 2 compound beats).
- UI meter toggles on PHRASE control group and PHRASE floating guide.
- Adaptive 12-column pattern step editor with beat borders for 3/4 and 6/8.
- Full documentation and bilingual in-app User Manual synchronization.

## 2026-10-16 — File Bridge and Integration Mode Switcher

Added dual agent integration modes (WebMCP and File Bridge) to the AI / Agents tab, selectable via a switcher and saved in `localStorage['halo-agent-bridge-mode']`.
- **Dock Tabs & Hint Layout Alignment (`index.html`):** Shifted `.hint` left padding to 46px (`44px` on mobile <= 700px) aligning directly with Column 2 (Track 01) so the 4 workstation mode buttons never overlap or run over the instruction text ("НАЖМИТЕ НА ГОЛОС..."). Refined button min-height to 25px and gap to 3px for balanced vertical proportions.
- **Canvas Stability & Idempotent Resize:** Eliminated orbit flickering and micro-refresh on track toggling or UI button clicks by making resize() strictly idempotent and replacing synthetic window resize events with targeted layout recalculation.
- **Mode Switcher Polish:** Active mode button adopts high-contrast light styling (`#e8f7f5` background, `#071822` text, white border, soft glow); inactive button remains translucent dark.
- **Concise WebMCP Guidance:** Streamlined in-app panel to concise enablement steps (`chrome://flags/#enable-webmcp-testing`), explicitly emphasizing support exclusively on platforms featuring embedded browsers with WebMCP (e.g., Codex).
- **File Bridge Window Layout (`src/file-bridge.js`, `index.html`):** Increased agent panel max/min height in File Bridge mode (`max-height: min(500px, 60vh); min-height: 280px;`) and dynamic dock tab stretching so synchronization controls (`⟳`, `⯈`, `✕`, status, and pending request banner) fit comfortably without clipping.
- **File Bridge (`src/file-bridge.js`):** Integrates desktop Chrome and Edge native File System Access API (`window.showDirectoryPicker`) without external dependencies or backends.
- **Dynamic Agent Context Exporter:** Exports five live context files to `HALO-Bridge/`: `AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, and `project-state.json`.
- **Strict User Review Gate:** Incoming agent commands in `requests/` are validated against schema, limits, and base revision, and presented in the UI with explicit «Apply Changes» and «Reject» buttons. No silent auto-application by default.
- **Queue and Idempotency:** Results written to `responses/<requestId>.result.json`. Stale revisions and repeated requests rejected.
- Added public static `capabilities.json` at repository root for GitHub Pages static inspection.

## 2026-10-16 — WebMCP-only agent access

Removed page-context command fallback, exposed API instance and legacy navigator registration. Simplified RU/EN availability and added Chrome flag guidance plus two step-by-step client cases with honest verification status. Fixed false Redo conflicts after history-load normalization; manual changes still block conflicting history. Windows native acceptance is recorded separately.

## 2026-10-16 — External browser agents / WebMCP

Replaced the embedded AI client with automatic browser-native Site Tools over HaloAgentAPI. AI / Agents now reports compatibility and external-agent instructions, with no provider, model, token or chat controls. Batch validation/preview/application, session Undo/Redo, playback request and portable project export share existing project state. Page-context fallback was subsequently removed (see above); no service or runtime dependency added. Native Codex browser composition verified locally; public deployment and live fallback acceptance remain distinct pending checks. See docs/regression-webmcp-2026-10-16.md.

## 2026-10-16 — AI Composer vertical workflow (superseded above)

Added optional OpenRouter/existing-local-model connection, natural-language musical planning, bounded command repair, local audition, reviewed application and session history. Expanded the live capability registry, protected targeted edits and kept user audio local. Original eight-bar control jingle saved from HALO. Cloud/model quality acceptance is separate from fixture-based UI verification; 4/4 and fixed orbit limits remain.

# Changelog

### 2026-10-15 — Compact editors

- Added universal transport-only folding and an independent compact Track 09 view for LOOP/SLICE/PITCH.
- Moved microphone/device controls to a smaller draggable, keyboard-movable INPUT window; latency supports mouse scrubbing without spinners. Local view state persists across reloads; playback timing stays unchanged.


## 2026-10-15 — Track 09 PITCH and microphone/instrument input selection

- Add PITCH: one unsliced sample played as a phrase-key melody, explicit root note/octave, 16 note/rest steps, bounded trim and transposition, common sound/FX and live/offline parity.
- All three modes support audio-file import, selected microphone/USB/line recording and explicit input monitoring. Device preferences remain local; permission is never requested automatically.
- Preserve phrase isolation and synchronized restart; bound PITCH takes to eight seconds and finalize outgoing takes before composition transitions. Add permission/device lifecycle and sampler regression coverage; update RU/EN guide and technical specifications.


## 2026-10-15 — Phrase-owned Track 09 and synchronized restart

- Preserve Track 09 processing and local audio references through arrangement, independent variations, autosave and project JSON; Undo/clear no longer remove another phrase's audio.
- Restart all nine voices, bars and phrase position together for BARS, trim boundaries, Pitch, Reverse and Sample Start. Without Instant Restart, sample edits wait for the next phrase cycle.
- Render each song phrase's own Track 09; reconnect audio routing after loading phrases. PCM remains local and is not embedded in files/links.
- Synchronize RU/EN guide, capability registry and API specification; expand full-project regression coverage.


## 2026-10-15 — Track 09: Pattern Randomizer & Reset, Snow-White 9th Orbit, Sequencer Pad Styling & UI Binding Fixes

- **Slice Count & Pattern Preset Buttons (`src/live-loop.js`):**
  - Resolved event binding issue where slice count buttons (`4`, `8`, `16`) and pattern presets (`BEAT`, `CHRONO`, `SHUFFLE`, `ARP`) failed to switch. Replaced fragile ID lookups with resilient container-scoped `querySelectorAll('[data-slice-count]')` and `querySelectorAll('[data-slice-pattern]')`.
  - Added support for both `'arp'` and `'arpeggio'` identifiers in pattern preset generator.
- **Unified 16-Step Pad Styling (`index.html`):**
  - Restyled 16-step sequencer pads from plain default buttons into cosmic dark-teal glass buttons matching the workstation aesthetic (`background: rgba(13, 26, 44, 0.75)`, teal borders, anchor beat indicators on steps 1, 5, 9, 13, and glowing real-time playhead).
- **Pattern Area Randomizer & Reset (`🎲 RAND` & `↺ RESET`):**
  - Added dedicated `🎲 RAND` button to algorithmically generate rhythmic chop grooves via `randomizeSlicePattern(count)`, anchoring step 0 to chop 0 and distributing syncopations and musical rests.
  - Added `↺ RESET` button to instantly revert the sequencer to the foundational `BEAT` groove preset.
- **Snow-White 9th Orbit (`#ffffff`):**
  - Updated 9th orbit on the main canvas (`#universe`) from cyan to snow-white (`#ffffff`), providing clear visual contrast against the deep starfield and colored orbits 01–08.
- **Automated Verification & Docs Sync:**
  - Added unit test suite in `tests/live-loop.test.cjs` covering `randomizeSlicePattern`, preset patterns, and slice count clamping (162/162 tests passing).
  - Updated User Manual in Russian and English (`index.html`), `docs/engine-capabilities.md`, `docs/agent-api-specification.md`, and `PROJECT_MAP.md`.

## 2026-10-15 — Track 09: SLICE Mode (transient slicing & 16-step sequencer), Teenage Engineering-inspired sampling, full SOUND & FX shaping, GENERATE re-grooving, and visual 9th orbit

- **SLICE Mode & Perceptual Transient Detection (`src/live-loop.js`):**
  - Added dual mode switcher in Track 09 header: `[ ◈ LOOP ]` (classic continuous looper) and `[ ✂ SLICE ]` (rhythmic transient chopper).
  - Transient detection algorithm (`detectTransients`): analyzes local RMS energy rise (ODF) in sliding 1024-sample frames (~23ms) with refractory distance window (min 50ms) to slice recordings into **4, 8, or 16** chops on actual sound attacks rather than musical pitch.
  - Automatic fallback to uniform divisions for continuous ambient sounds without sharp attacks.
  - Interactive waveform with slice boundary lines, numbered badges, and click-to-audition chops.
- **16-Step Slice Sequencer & Groove Presets (`src/live-loop.js`):**
  - 16-step interactive sequencer pad grid divided into four quarter-note beats with live playhead highlight.
  - Tap any step to cycle chop index (1..N) or rest (`—`).
  - Instant groove pattern presets: `BEAT` (dance foundation on beats & syncopations), `CHRONO` (chronological 1..N order), `SHUFFLE` (syncopated groove bounce), `ARP` (ascending/descending chop cascade).
  - Monophonic Voice Choke: retriggering any slice instantly silences the previous slice with a clean 5ms anti-click ramp, eliminating phase clashes, muddiness, and uncontrolled volume accumulation.
- **Synthesizer Voice Strip (SOUND) & Spatial FX for Track 09:**
  - `CHARACTER`: 12 dB/oct resonant Lowpass/Bandpass filter (80–14000 Hz, Q 0.7–4.0).
  - `DURATION`: Decay/release envelope (0.05s staccato to full slice length).
  - `DENSITY`: Step trigger probability mask (20–100%) preserving rhythmic groove anchors.
  - `LEVEL`, `PAN`, and independent polymeter controls (`CYCLE` 4–32 steps, `STEP` 1/16, 1/8, 1/4, `OFFSET` 0..15).
  - Studio FX sends: `REVERB`, `DELAY` with instant BPM-synced division pills (`1/16`, `1/8`, `1/8D`, `1/4`), and stereo `CHORUS`.
- **Accompaniment Re-Grooving via `GENERATE` (`Создать`):**
  - Clicking `GENERATE` calls `HaloLiveLoop.randomizeSlice(seed)`, organically re-mixing the slice pattern, filter cutoff, envelope decay, and FX sends to blend the user's custom sample seamlessly into the generative ensemble.
- **Visual 9th Orbit & Interactive Canvas (`index.html` & `src/effects.js`):**
  - Renders an outer 9th orbit when Track 09 contains audio (`hasAudio()`).
  - Neon cyan/teal palette (`#63d2c6`), dedicated phase sweep, comet trails in CLASSIC, COSMIC, and HYPER modes, and glowing nucleus pulse on audio triggers (`window.HaloPulse(8, time)`).
  - Displays slice marker positions along the orbit ring in `PHRASE` motion mode (`getSlicePhraseSteps()`).
  - Touch/click on the 9th orbit toggles Mute/Unmute state.
- **161 Unit Tests Passing & Documentation Synchronization:**
  - Added unit test coverage for transient slicing, pattern presets, tick scheduling, choke group, and offline export in `tests/live-loop.test.cjs` (161/161 tests passing).
  - User Manual Section 14 updated in Russian and English (`index.html`).
  - `docs/engine-capabilities.md` and `docs/agent-api-specification.md` fully synchronized.

## 2026-10-15 — Track 09: Instant Restart (immediate sample tweaks vs quantized loop boundaries), Pitch & Reverse, and UX layout refinements

- **Instant Restart Engine (`⚡ INSTANT RESTART` in `src/live-loop.js` & `index.html`):**
  - Added toggleable `Instant Restart` button in the Track 09 header directly adjacent to the status badge.
  - Dual-mode retriggering logic when active:
    - **Sample tweaks (`Pitch`, `Reverse`, `Sample Start` / waveform drag / `trimStart`):** Immediately restarts sample playback without waiting for loop boundary or desynchronizing tracks 01–08, with 40ms debounce on continuous sliders.
    - **Loop length & cycle boundaries (`BARS` 1, 2, 4, 8 / `trimEnd`):** Quantizes retriggering strictly to the nearest upcoming beat (`absStep % 4 === 0`) or bar downbeat, restarting the **entire phrase, all instruments (tracks 01–08), and musical bars** in total synchronization with Track 09 via `window.HaloRetriggerPhrase(true)` and `songUI.onPhraseRestart()`.
- **Terminology & Aesthetic Unification:**
  - Reverted Russian localization of "Overdub" from literal "Наложение" back to standard product and musical term "Overdub".
  - Unified button gradients in Track 09 and song docking to cosmic cyan-dark blue radial gradient, removing unintended reddish color stop tints.
- **Pitch-Shifting & Audio Buffer Reverse (`src/live-loop.js`):**
  - Added `PITCH` slider (-12..+12 semitones) adjusting `playbackRate = 2^(pitch / 12)` in real time and offline export.
  - Added `⇄ REV` toggle generating an inverted PCM buffer (`getReversedBuffer`), accurately recalculating trim start offsets (`totalDur - (offsetSec + trimStart * winDur + playDur)`) for reverse playback within the selected window.
- **Input Styling & Control Layout Refinements (`index.html`):**
  - Stripped browser up/down number spin buttons (`▲▼`) from `LATENCY` input field (`-webkit-appearance: none; appearance: textfield`).
  - Relocated `MUTE` and `SOLO` buttons from the right auxiliary block directly under the `BARS [ 1 ] [ 2 ] [ 4 ] [ 8 ]` selector buttons.
- **Documentation & Test Synchronization:**
  - Updated in-app User Manual Section 14 in both Russian and English (`index.html`).
  - Updated `docs/engine-capabilities.md` and `docs/agent-api-specification.md`.
  - Added comprehensive test coverage in `tests/live-loop.test.cjs` and `tests/app.test.cjs` (157 passing tests).

## 2026-10-15 — Track 09 UX refinement: MIX slider alignment, simplified view switches, and audio timeline scrubbing

- **MIX Channel Strip Alignment (`index.html` & `src/live-loop.js`):**
  - Resolved CSS grid misalignment in the Track 09 mixer panel where the `MIX` title previously occupied the first grid column and forced the `DELAY` slider to wrap to row 2 beneath it.
  - Added `.loop-sliders-grid` wrapper beneath the `.loop-group-title`, aligning all four sliders (`LEVEL`, `PAN`, `REVERB`, `DELAY`) evenly in a single horizontal row with consistent baselines and column widths (2x2 on mobile).
- **Simplified Dock Switch Tabs (`src/song-ui.js`):**
  - Removed directional chevron arrows (`‹` and `›`) from view switch buttons in `.song-tabs`, rendering clean glyphs `≋` (Instruments), `▤` (Composition), and `🎙` (Track 09 Live Loop) to reflect direct view switching.
- **Audio Timeline Drag & Scrub with Mini-Overview (`src/live-loop.js`):**
  - Implemented true composition scrubbing and timeline dragging for long audio files (> loop duration).
  - Added `offsetSec` position tracking allowing users to drag the audio waveform horizontally across the loop window with 1:1 tactile responsiveness.
  - Sliced high-resolution waveform rendering: the main canvas displays the active loop window with bar divisions (1..N) and clear beat transients rather than compressing the entire long track into the width.
  - Top Mini-Overview Strip: slim miniature overview showing the entire track with a highlighted box showing the loop window's position. Clicking or dragging the overview allows macro jumping across the full file.
  - Updated playback scheduling (`schedulePlayback`) and offline rendering (`renderOffline`) to accurately start playback from `offsetSec + trimStart * loopDur`.
  - Added unit test coverage for `offsetSec` navigation and offline rendering in `tests/live-loop.test.cjs`.

## 2026-10-14 — Track 09: Live Loop layer, microphone recording, non-destructive overdub, and offline export parity

- **Independent Audio Layer (`Track 09 — LIVE LOOP`):**
  - Integrated an optional 9th audio track running alongside the 8 generative synthesis orbits, synchronized to HALO's authoritative Web Audio transport clock (`AudioContext.currentTime`).
  - Freed from modal pitch and scale constraints: users can record voice, acoustic instruments, percussion, or load custom loops while the generative orbits provide harmonic context.
  - Quantized loop lengths (1, 2, 4, 8 bars) aligning tightly to bar boundaries, tempo (30–200 BPM), and musical playback.
- **Microphone Capture & Safe Jamming:**
  - Quantized live recording starting on the next bar boundary with visual pre-roll count-in.
  - Safe acoustic feedback prevention: microphone monitoring is disabled by default (`monitor: false`) with explicit UI guidance recommending headphones.
  - Hardware latency compensation with user-adjustable calibration (default 40ms) ensuring recorded takes lock onto the rhythmic grid.
- **Non-Destructive Live Overdub & Waveform Editing:**
  - Live Overdub allows recording new layers on top of existing playback without destructive mixing.
  - Stacked layer management with single-click Undo (`Отменить слой`) to pop the most recent take.
  - Composite buffer rendering with automatic peak ceiling normalization (0.98) to prevent clipping.
  - Interactive teal waveform visualization (`#63d2c6`) with musical bar dividers, animated playhead, and trim markers (`trimStart`, `trimEnd`).
- **Audio File Import & Resource Safety:**
  - Browser-decoded audio file import (WAV, MP3, OGG, FLAC, AAC, etc.) with guardrails: 50 MB file size limit and 120-second duration ceiling with localized, user-friendly toast alerts.
- **Mixer Channel Strip & Transport Parity:**
  - Full dedicated mixer channel strip: Level, Pan, Reverb Send (routed into convolver), Delay Send (routed into 1/8 stereo tape delay), Mute, and Solo.
  - Routed directly into the master bus through Master EQ and Limiter.
  - Global keyboard shortcut `9` toggles Track 09 mute state.
  - Complete parity in offline WAV / MP3 export (phrase and full song arrangement rendering).
- **Client-Side Privacy & IndexedDB Storage (`halo-live-loop-v1`):**
  - Audio layers are persisted locally in browser IndexedDB as PCM buffers, keeping audio off the ~5MB `localStorage` limit.
  - Strict privacy: user audio never touches a server or external network, and is excluded from project JSON (`snapshotProject()`) and URL share hashes to prevent bloat.
  - Resetting the workspace or clearing loop data cleanly purges IndexedDB records.
- **Unified 3-Dock Interface (`src/song-ui.js` & `index.html`):**
  - Upgraded bottom dock tabs with a third button (`🎙` Live Loop) alongside `‹ ≋` (Instruments) and `▤ ›` (Composition).
  - 4-step guided workflow header (Подготовка / Запись / Повтор / Наложение), circular action buttons, and responsive touch controls.
- **Documentation, API & Test Coverage:**
  - Added Section 14 to in-app User Manual (`index.html`) in Russian and English.
  - Updated `docs/engine-capabilities.md` (Section 11) and `docs/agent-api-specification.md` (Section 7).
  - Updated `PROJECT_MAP.md`.
  - Added unit test suite in `tests/live-loop.test.cjs` covering storage, buffer mixing, non-destructive undo, peak normalization, and offline scheduling (151 total passing tests).

## 2026-10-14 — Cyrillic typography whitespace fix and modernized font stack

- **DOM Localization Whitespace Preservation (`src/i18n.js`):**
  - Resolved root cause of "eaten spaces" in Russian localization where DOM text nodes adjacent to inline HTML tags (`<strong>`, `<em>`, `<span>`, `<code>`) had their leading and trailing whitespace stripped by `translate()`.
  - Added explicit preservation of leading and trailing whitespace (`lead` and `trail`) across all translation branches (dictionary matches and fallback substitutions).
  - Excluded `#guideModal` from dynamic `TreeWalker` translation in `setup()`, preventing redundant re-translation and keyword mutations in the already localized bilingual markup.
- **Modernized Cyrillic Font Stack (`index.html`):**
  - Updated global `font-family` stack to `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` with font smoothing (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale`) for sharp, readable Cyrillic glyphs across Windows (Segoe UI/Inter), Apple (San Francisco), Android (Roboto), and Linux.
- **Test Coverage & Security:**
  - Expanded `tests/i18n.test.cjs` with tests specifically validating that leading and trailing whitespace is preserved across phrases, dictionary entries, and untranslated content.
  - Resolved GitHub CodeQL code scanning alert #1 (`js/bad-tag-filter` / CWE-116): replaced regular expression matching `/<script>([\s\S]*?)<\/script>/g` in `tests/app.test.cjs` with deterministic substring extraction (`indexOf` and `slice`), eliminating incomplete tag filter warnings.

## 2026-10-14 — Background playback engine with adaptive lookahead, and GitHub Actions 20-minute deployment workflow

- **Background Playback Engine & UI (`#bgAudio`):**
  - Added background playback toggle button in the top-right toolbar next to `#visualOnly` with custom SVG window and audio note icon.
  - Enabled continuous, uninterrupted music playback when the browser tab is hidden, minimized, or switched away.
  - Implemented adaptive lookahead scheduling (`schedule()`): when `document.hidden && backgroundAudio`, lookahead dynamically expands from `0.16s` (48 ticks) to `1.5s` (192 ticks) to prevent audio starvation caused by browser timer throttling (which slows background timers down to 1000ms).
  - Persisted background audio preference in `localStorage` with full RU/EN localization and status toasts (`Background playback enabled` / `Фоновое воспроизведение включено`).
- **GitHub Pages Deployment Workflow (`.github/workflows/deploy.yml`):**
  - Created `.github/workflows/deploy.yml` with a 20-minute CDN propagation timeout (`timeout: 1200000`) for `actions/deploy-pages@v4` to resolve deployment timeouts on large audio assets.
  - Added manual `workflow_dispatch` trigger for 1-click manual deployment directly from the GitHub Actions tab.
- **Documentation & Test Coverage:**
  - Synchronized in-app User Manual (`index.html`) Section 11 in Russian and English.
  - Added Section 10 to `docs/engine-capabilities.md` and updated `docs/agent-api-specification.md`.
  - Added comprehensive test coverage in `tests/preferences.test.cjs` and `tests/app.test.cjs`, with 147 passing tests.

## 2026-10-14 — Third orbit visualization mode (HYPER) with 8 distinct dynamic comet signatures

- **Third Orbit Visualization Mode (HYPER / "ГИПЕР"):**
  - Added a third visual comet trail mode cycling alongside `CLASSIC` and `COSMIC`: `CLASSIC` → `COSMIC` → `HYPER` → `CLASSIC`.
  - Created 8 radically distinct, bright, and hyper-dynamic procedural special effect signatures for each of the 8 track slots in `src/effects.js`:
    - **Track 0 (GLASS / Pulse):** *Plasma Lightning Bolt* — high-frequency jagged electric discharge arcs, Tesla coil branches, blinding white-hot core, and radial electric nova blast on audio pulse.
    - **Track 1 (TIDAL / Accent):** *Chromatic Vortex Ribbons* — 3D braided counter-rotating undulating wave ribbons, iridescent ladder cross-struts, and chromatic rippling wave crests.
    - **Track 2 (ROOT / Percussion):** *Seismic Shock Diamonds* — supersonic Mach shock diamonds, heavy compression barrier contours, cross-braces, and sonic boom blast cones.
    - **Track 3 (EMBER / Texture):** *Solar Flare Firestorm* — swirling coronal magnetic loops, convective fire plumes, incandescent ember sparks, and CME solar flare eruptions.
    - **Track 4 (RAIN / Bass):** *Cyberpunk Laser Grid* — quantized digital oscilloscope waveform, holographic directional chevrons, and digital targeting matrix sweeps.
    - **Track 5 (VEIL / Melody):** *Celestial Mandala Spiral* — logarithmic rotating spiral galaxy arms, sacred constellation node web, and 8-pointed starbursts.
    - **Track 6 (MOSS / Arpeggio):** *Prismatic Crystal Shards* — tumbling 3D faceted geometric crystals with specular highlights, rainbow dispersion rays, and crystal detonation bursts.
    - **Track 7 (AURA / Harmony):** *Hyperspace Warp Tunnel* — 3D-perspective receding warp rings, tachyon hyper-speed streaks, billowing dimensional sails, and warp singularity jump flashes.
  - Refined comet trails with a narrower, sleek tapered background bloom (`0.72x`), smooth tip dissolve to zero width/alpha (`Math.pow(1 - f, 1.3..1.6)`), and an organic serpentine traveling wave along the orbit (`snake`) anchored to the comet head without jitter.
  - Enhanced WebGL2 fragment shader with hyper-nebula cosmic shimmer and warp rays when `richness > 1.5`.
  - Maintained full Canvas 2D fallback, mobile quality tier scaling (`small`), and strict reduced-motion invariance (no strobe/jitter, zero wall-clock dependency).
  - Persisted `effectMode` in localStorage preferences (0, 1, 2) with 100% backward compatibility for legacy `richEffects` boolean.
  - Added bilingual RU/EN localization (`HYPER` / `ГИПЕР`, toasts, button titles) and synchronized in-app User Manual (`index.html`), `docs/engine-capabilities.md`, and `docs/agent-api-specification.md`.


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


UI refinement (2026-10-15): frameless window actions share the top-right edge; Track 09 minimization is visible only on its page. LOOP/SLICE/PITCH share 26 px buttons, compact selects and sliders, aligned parameter grids and thin arrow-free scrollbars. PITCH octave and actions share one row. The input button is labeled AUDIO INPUT / MIC (localized). Musical settings and timing are unchanged.

Track 09 UI: RECORD is red; orange OVERDUB sits beside recording/Loop in the primary actions. All range controls use the master-volume/EQ accent style. PITCH recorded root is grouped with melody octave in advanced settings (hidden when minimized). Audio semantics are unchanged.

- Track 09 minimize/expand icon is a plain thin square outline, vertically centered beside the workspace fold line in the same 18 px button height.


Audio input fix (2026-10-15): enumerate selectable nonempty device IDs before stopping the permission probe; preserve the exposed list if a browser later hides IDs, and avoid probing again when named inputs are already available. Hardware stays released after the probe. Local controller state adds accessReady, lastError {stage,name,constraint}, and fileContext; the input window reports errors and console diagnostics include operation/error codes without device IDs/labels. For repeated file:// permission prompts, use scripts/preview.ps1 and localhost:8766; persistent permission remains browser-controlled. No automatic monitoring or permissions on reload.

- Audio access always performs its first permission probe even if the browser exposes a named default input. Console errors are printed as readable JSON text.

- Added bilingual “Bring your guitar / Используй свою гитару” README sections and original live UI GIFs: REACTOR, HYPER, PHRASE, compact Track 09 LOOP with input settings open. No new audio assets or engine changes.

- Re-recorded both guitar README previews in English with verified active REACTOR (warm palette), HYPER/PHRASE and compact LOOP/input window.


Track 09 SOLO smoothly silences the eight core voices without changing their mute states or levels; disabling SOLO restores them. Offline export honors this gate too. SLICE advanced settings expose TRIM START/END and automatically rebuild slices on trim changes. With Instant Restart off, live playback retains the previous slices until the next phrase cycle; with it on, the new slices apply at the shared phrase restart.


DELETE sits at the right of the recording/import row. SLICE/PITCH expose CYCLE 4/8/16/32 and STEP 1/16, 1/8, 1/4 beside the pattern grid (16 cells; CYCLE 32 repeats them twice). DURATION selects a fraction of natural slice/sample-window playback length, accounting for pitch; PITCH is no longer capped at one step. Rests let notes ring; a new trigger gently chokes the previous voice. PITCH remains bounded by the phrase end in live/offline playback. No slice time stretching is introduced.

## 2026-10-18 — First-use terms
- Added required localized risk/rights/privacy terms with versioned local acceptance and a pre-acceptance WebMCP gate. Browser permissions remain separate; lawful liability limits are preserved.


### File Bridge input and receipt audit — 2026-10-18

File Bridge accepts track fields directly on an operation or inside values, digit-string indices 0..7 and ID case/whitespace variants. Conflicting values and musical constraints remain errors. The response submissionVersion covers the manifest and companion contents; after a correction wait for a fresh receipt before diagnosing an old error again.

Normalization is File Bridge only; WebMCP and core musical validation retain their strict contract. Use canonical `{op:"track.patch",trackIndex:5,values:{...}}`; a companion contains the values object. Keep one request ID and manifest for corrections. Write companions first and manifest last. Flat references resolve beside the manifest, bundle references inside the bundle; renaming files requires updating references. Slot/role diagnostics identify the track and distinguish role, exact flag and sound compatibility errors. No new dependency or deployment step.


## 2026-10-18 — Integration and rendering performance

- Pause automatic folder scans outside the visible File Bridge panel and on hidden browser pages; retain explicit refresh/check.
- Cache unchanged file text by metadata, submission validation and response parsing, with mandatory fresh approval-time content checks.
- Avoid full project snapshot cloning for revision-only reads, whole-page translation on small DOM changes and nested dock backdrop filters.
- Existing project revision detection still compares serialized in-memory state; no audible or FPS acceptance is claimed.

- Show folder-picker waiting/cancellation/errors in both languages instead of silently suppressing AbortError; update script cache versions. Idle scans no longer clone unchanged pending proposals.


2026-10-18: The collapsed workspace toggle now displays an upward arrow; expanded mode retains the minimize line. A localized Report a bug link to the repository’s `/issues/new` form appears immediately left of Reset workspace, opening a separate tab with noopener/noreferrer. No issue is submitted automatically; no engine or Agent API operations changed.


## 2026-10-18 — Compact File Bridge context

Consolidated duplicated instructions and role sound indexes across five context files; removed the derived score from state export. Preserved musical recommendations, all sounds/roles, operation validation and approval flow. Context-only schema updates: instruments 3, project-state 2; refresh exported folders with Update Files.

Context schema versions after consolidation: capabilities 2, instruments 3, music-rules 2, project-state 2; request schemaVersion remains 1.
