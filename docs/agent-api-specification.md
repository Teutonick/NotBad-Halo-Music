### File Bridge submission protocol — 2026-10-18

This section supersedes earlier instructions about silence or immediate termination.
The recommended long-score path is `requests/<requestId>/`: complete companion JSON files first, read them back, then write `manifest.json` last. Bound **each file-tool call** to the external agent harness limit. Large individual files can be completed with bounded append/edit calls; complete compositions can reference multiple track/phrase files. File Bridge does not impose a universal 1.5 KB file limit or restrict the agent to two tracks. WebMCP payloads are a separate transport and say nothing about file-tool truncation. Engine transactions remain bounded to 512 KiB and 256 operations; file submission additionally bounds the total root plus unique companion UTF-8 content to 512 KiB.

HALO reads each referenced companion once per scan and tracks its content together with the root. Companion-only corrections, including missing/truncated-file recovery, trigger validation without touching the manifest. One proposal awaits review at a time. Changes while pending invalidate that snapshot and require review again; approval also checks the files and the project revision before applying. Applied and rejected request IDs do not replay across reconnects; use a new ID for new work. An ID is 1..128 ASCII letters, digits, hyphens or underscores. Legacy flat requests, aliases and parts remain supported.

`responses/<requestId>.result.json` has these explicit lifecycle states:

| status | ok | Meaning |
| --- | --- | --- |
| `pending_approval` | true | Validated snapshot; `applied:false`, baseRevision/currentRevision; not yet applied |
| `applied` | true | Applied; `applied:true`, appliedRevision/currentRevision |
| `error` | false | Validation/application error; error, help, instructionForAgent and currentRevision |
| `rejected` | false | Human rejected this request; respect the decision |

After submitting, wait 4–5 seconds and read the response. End the composition turn on **explicit** pending_approval acknowledgement and invite approval; applied is a completed mutation. Fix an error at most twice, then report it. No response is **unconfirmed**, not successful: check page/folder connection or a previous pending proposal; do not wait indefinitely for human approval. Poll timing is best effort and can slow when a browser is suspended. A stale base revision is rebased only to prepare a review; errors in the rebased content are returned directly. A revision change after review is not silently rebased at application.

`instruments.json` context schemaVersion **2** has one `sounds` registry. Each sound has `id` (`<world>:<canonicalId>`), `instrument`, `canonicalId`, setups, compatibleRoles/affinityRoles and noteRange. `tracks[].soundsBySetup`, `tracks[].compatibleSounds`, and `soundWorlds.<setup>.soundIds` contain references to those IDs. Use `canonicalId` (without world prefix) as the request's sound field. Portable musical projects and transactions remain version 1. The other four context files retain their existing versions. All five files are refreshed when connecting or pressing Update Files.

Recipe keys come from the engine table: C major is index **2**, source offset **-2**; D minor is index **0**, offset **0**. Set noteTranspose to that **offset** for literal MIDI. Write notes across all requested bars (8-bar 4/4: 0..127; 8-bar 3/4: 0..95). Exactly eight slots remain available; mutes are explicit, not assumed. `project.patch` is present in WebMCP inputSchema as well as capabilities; the tool schema derives its operation enum from the actual API.

No backend, new runtime dependency, external audio service or new permission is introduced. Default application remains human-confirmed. The folder protocol is application-specific JSON, not MCP-over-files.

# HALO External Agent API, WebMCP Site Tools and File Bridge

Implemented contract — 2026-10-16. Internal engine source of truth: `src/agent.js`, `src/site-tools.js`, `src/file-bridge.js`, `src/song-ui.js`. This replaces the former embedded AI Composer proposal and client. HALO performs no LLM inference or provider connection.

## Integration Modes

The AI / Agents tab provides an integration mode switcher saved in `localStorage['halo-agent-bridge-mode']`:
1. **WebMCP (Browser Site Tools):** Uses native `document.modelContext.registerTool` for browsers/agents with direct in-app WebMCP connections (e.g. Codex in-app browser).
2. **File Bridge (Local Folder HALO-Bridge):** Uses desktop Chrome and Edge native `window.showDirectoryPicker` to connect to a local folder, export the technical engine passport and project state, and process agent requests from `requests/` with user confirmation.

## External-agent workflow

The user asks an external agent (Codex, Antigravity, Bionic, Claude) to compose or edit music.
- In **WebMCP mode**: The agent discovers Site Tools, calls `halo_get_context`, reads catalog/roles/state/notes, composes original parts, validates a batch, inspects its preview, applies it and reads back the result.
- In **File Bridge mode**: HALO exports `AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, and `project-state.json` into the connected `HALO-Bridge/` folder. The agent reads `project-state.json` and rule files, writes a request JSON into `requests/request-*.json`. HALO discovers the request, validates it, and displays an explicit confirmation banner. Upon user approval, HALO applies the transaction, writes `responses/request-*.result.json`, and updates `project-state.json`.

There is no mood-preset planner or automatic inference/repair client in HALO. Manual editing remains available.

## Strict File Bridge Rules

1. **No Silent Auto-Apply by Default:** Incoming commands from `requests/` are never applied automatically without user confirmation. HALO shows the proposed changes and provides «Apply Changes» and «Reject» actions.
2. **Batch Protocol & Continuous Auto-Sync:** Every request requires `requestId`, `schemaVersion: 1`, `baseRevision`, and an allowlisted operations array. Reprocessing processed batches is prohibited. HALO continuously synchronizes `project-state.json` to disk every 1.5s whenever project revisions advance. Stale revisions are automatically rebased by HALO if incoming operations apply cleanly without conflicts (`rebased: true`), badging the card in the web UI. If an unresolvable conflict occurs, the UI error card provides a 1-click `[⚡ Rebase & Retry]` action that refreshes disk state and re-checks the folder.
3. **Allowlist & Privacy:** Only valid HALO operations (`track.patch`, `phrase.patch`, `master.patch`, `project.replace`, `composition.replace`, `visual.patch`) are accepted in `requests/`. No scripts, external URLs, or OS commands. `project-state.json` is strictly read-only.
4. **Desktop Chrome/Edge Native API:** File Bridge relies on `window.showDirectoryPicker({ mode: 'readwrite' })` without server dependencies or external libraries. Works statically on GitHub Pages.
5. **Zero Localhost, Zero CLI, and Zero Background Execution:** HALO is a 100% static client-side web application. There is **NO backend server, NO local HTTP daemon, NO CLI tool (`halo`), and NO localhost ports** (`localhost:3000`, `3001`, `8080`, `5173`, etc.). External agents are strictly prohibited from executing `curl`, `netstat`, `where.exe halo`, `node`, `npm`, `python`, or port scans to ping or run HALO.

## Automatic discovery and WebMCP lifecycle

`HaloBrowserTools.install(internalAPI, environment)` runs at workspace initialization. It uses `document.modelContext.registerTool(descriptor,{signal})`; no legacy navigator adapter is used. Each descriptor includes JSON input schema, description, annotations and execute. Native execution returns MCP text content containing JSON `{ok:true,result}` or `{ok:false,error}` with `isError:true`. Validation itself returns `{valid:false,error}` for an invalid transaction. AbortController removes owned registrations on ordinary page teardown; BFCache pagehide preserves them.

Primary references: [Chrome imperative WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), [WebMCP proposal](https://github.com/webmachinelearning/webmcp).

## Tools

| Tool | Arguments | Result / effect |
| --- | --- | --- |
| `halo_get_context` | `{}` | State, catalog/capabilities, resolved musical events, history counts, agent instructions |
| `halo_get_capabilities` | `{}` | Actual registry v2, sound/sample metadata and limits |
| `halo_get_state` | `{}` | `{revision,project,visual}` |
| `halo_validate_operations` | `{transaction}` | Validity/error; no mutation |
| `halo_preview_operations` | `{transaction}` | Before/after copies, visual copies and playback policy; no audio audition |
| `halo_apply_operations` | `{transaction}` | Validated real project update and session history |
| `halo_undo`, `halo_redo` | `{}` | Conflict-checked previous/next agent transaction |
| `halo_playback` | `{playing:boolean}` | Actual playing flag; `AUDIO_GESTURE_REQUIRED` if browser activation has not occurred |
| `halo_export_project` | `{}` | `{filename,project}`; external agent saves the portable object, no forced download |

The browser may decorate tool names in discovery. Use the returned names. Musical edits load paused; native tools do not grant microphone permission or override audio policy. Autosave uses existing local project persistence. Preview is a non-mutating diff; user/agent review happens outside an embedded chat.

## Connection Transports

1. **WebMCP:** Supported via `document.modelContext.registerTool`. For local Chrome testing open `chrome://flags/#enable-webmcp-testing`, select Enabled, relaunch and reopen HALO.
2. **File Bridge:** Supported via `window.showDirectoryPicker({ mode: 'readwrite' })`. User chooses a local `HALO-Bridge` folder; HALO writes context and monitors `requests/` / `responses/`.

## Internal API and batch protocol

Methods:

- `getCapabilities()` → registry version 2: actual sound banks, all 130 built-in recording metadata entries (no PCM), eight role policies, startup defaults, keys/scales, bounds, FX/master routing, visual writable fields, Track 09 limitations, composition schema.
- `getProjectState()` → `{revision,project,visual}`. Revision changes when canonical musical/visual state changes.
- `getContext()` → `{state,capabilities,music,history}`. `music` contains resolved per-step MIDI events, actual selected-patch voice policies and generated bar harmony for each phrase. `history` exposes undo/redo counts.
- `isEnabled()`, `setEnabled(boolean)`; explicit tool invocations enable writes. The gate is an accident guard, not a security boundary for page scripts.
- Async `setPlayback({playing:boolean})` → actual `{playing,reason?}`; browser gesture rules apply.
- `previewOperations(request)` → `{baseRevision,before,after,visualBefore,visualAfter,playback}` on copies; `validateOperations(request)` → `{valid,error?}`.
- Async `applyOperations(request)`, `undo()`, `redo()` → fresh state. History is bounded, conflict-checked, session-only; later manual musical edits prevent blind history overwrites.

Requests use `{schemaVersion:1,baseRevision,operations:[...]}`, at most 256 operations / 512 KiB. Unknown project/track/event fields (including invented time signatures or per-note velocity) are rejected rather than silently stripped. Supported operations only:

| Operation | Payload |
| --- | --- |
| `track.patch` | `trackIndex:0..7`, `phraseId` required for songs, `values` from the track allowlist |
| `phrase.patch` | `phraseId` required for songs, `values:{bars?,startStep?,seed?,key?,liveLoop?,timeSignature?,setup?,world?,soundWorld?}` |
| `project.patch` | `values:{setup?,world?,soundWorld?,bars?,startStep?,timeSignature?,tempo?,masterVolume?,mix?,seed?,key?,liveLoop?}` |
| `master.patch` | `values:{tempo?,masterVolume?,mix?}`; song and phrase masters update together |
| `project.replace`, `composition.replace` | `project`: complete valid version-1 musical project/composition (partial replacements or `values` objects are gracefully handled as project patches) |
| `visual.patch` | `values:{scene?,motion?,effects?}`; enums from registry; scene changes require DRIFT |

Track fields: `instrument` (bank), `sound` (catalog ID), `generator`, `on`, `steps`, `exact`, `sequence`, `noteEvents`, `noteTranspose`, `level`, `density`, `character`, `duration`, `space`, `delay`, `delayTime`, `chorus`. Track `name` and `role` are permanent read-only slot identifiers (0..7) and are strictly prohibited in `track.patch.values` (passing them throws `UNKNOWN_FIELD`). Canonical slot names (`GLASS`..`AURA`) remain fixed, but intuitive aliases (`BASS`, `KEYS`, `LEAD`, `RIFF`, `PERC`, `KICK`, `SNARE`, `BELL`, etc.) and cross-bank preset auto-detection are automatically resolved. Patch objects replace each supplied field; supply the full `sequence`, `mix`, `liveLoop` or note list rather than nested partial objects. Resetting local changes or calling `resetProject()` resets the baseline project revision counter to `revision: 1`. Changing bars requires compatible steps/events in the same transaction. Repeated sections reference the same phrase; create a new phrase ID for an independent variation.

## Real musical constraints

Supported meters: **4/4** (16 steps/bar: 64 steps in 4 bars, 128 steps in 8 bars) and **3/4** (12 steps/bar: 4 bars = 3/4 waltz with 48 steps; 8 bars = 6/8 rocking pirate swing with 96 steps). Eighths are steps 0,2,4,...; pauses are absent steps. BPM 30–200, normalized controls 0–100, EQ −9..9 dB, width 0–100. Sequence length 4–32, stepLength 1/2/4, offset 0..length−1; exact steps bypass density/cycle generation. Up to **15 phrases** (`MAX_PHRASES = 15`), up to 32 sections, 128 total bars; duration = bars×240/BPM.

For generator 3 set `exact:true` for manual notes. Each `{step,notes:[MIDI]}` must reference a step, be unique, and contain at most four notes, additionally limited by role/sample register and role maxNotes. Set `noteTranspose` to the key's **offset**, not its index, for literal MIDI pitches. Bass is mono; arpeggio is mono and short. Empty note lists on unpitched percussion still trigger its sound. No per-note velocity, duration, swing/microtiming or independent chromatic-score engine is added. No acoustic listening/analysis is claimed by the planner.

### Authored Meter Catalogs and Pattern Generation
- **3/4 Waltz (`catalog3_4_waltz`, 4 bars = 48 steps):** Authentic "Boom-Chak-Chak" orchestration (kick & bass on downbeat 1 / step 0; snare, claps, keys & chords on afterbeats 2 and 3 / steps 4 and 8; lyrical flowing melodies). Accents: step 0 (vel 0.88), steps 4 & 8 (vel 0.78).
- **6/8 Pirate Swing (`catalog6_8_swing`, 8 bars = 96 steps):** Swashbuckling Hans Zimmer compound pirate groove (two compound beats on steps 0 and 6, heavy backbeat on 6, rolling eighths `[0, 2, 4, 6, 8, 10]`, dactylic gallop riffs `[0, 3, 4, 6, 9, 10]`). Accents: step 0 (vel 0.90), step 6 (vel 0.86).
- **Polymetric Cycles in GENERATE:** Adaptive corridors `cycleProfiles3_4` and `cycleProfiles6_8` (12, 6, 24, 9 steps with 3-beat hemiola for waltz; 12, 6, 24, 8 steps with 2-against-3 cross-rhythm for 6/8 swing). Dotted delay `1/8d` prioritized in 6/8.

### Phrase vs. Full Composition Policy & Canonical Form
- **Default (Single Phrase):** Without explicit user request for a song or full composition, agents work exclusively with individual 4- or 8-bar phrases/loops via `track.patch` or `project.replace`.
- **Full Composition (`composition.replace`):** Generated only when the user explicitly asks for a full song, composition, or multi-section arrangement ("песня", "полная композиция", "аранжировка").
- **Canonical Structure:** Intro (sparse, atmosphere/bells, no heavy bass) → Verse (groove and bass enter, harmonic foundation) → Chorus (peak dynamic, all voices active, leading melodic hook, bright character 60..80) → Verse 2 (rhythmic/melodic variation) → Bridge (contrasting harmony or texture) → Outro (dissolving elements, fade: "out"). Allowed section names: `["intro", "verse", "verse2", "chorus", "bridge", "outro", "phrase"]`.
- **Phrases Limit:** Maximum 15 unique phrases per composition. Repeating phrases across sections uses `repeats: 1..8` and shared phrase IDs.

### Zero-Prompt-Engineering Autonomous Directives & Canonical Recipes
When the user gives a brief creative task without technical parameters (e.g. *"напиши новогодний луп-джингл"* or *"сочини композицию по мотивам OST пираты карбиского моря"*):
- **Decision Matrix:**
  - Brief "loop" / "jingle" / "riff" / "beat" → Single phrase via `project.patch` (tempo, bars, key) + `track.patch` on melody/bass/percussion.
  - Brief "composition" / "OST" / "song" / "soundtrack" → Full multi-phrase structure via `composition.replace`.
  - Peaceful / meditative / holiday / cosmic theme → `setup: "ambient"`, 70..96 BPM, C Major (`key: 0`).
  - Epic / cinematic / rock / adventure / pirate theme → `setup: "reactor"`, 104..130 BPM, D Minor (`key: 14`), `timeSignature: "3/4"` (6/8 pirate swing).
- **The Full-Span Duration Principle:**
  - 4-bar phrase (4/4) = 64 steps total (0..63).
  - 8-bar phrase (4/4) = 128 steps total (0..127).
  - 4-bar phrase (3/4 Waltz) = 48 steps total (0..47).
  - 8-bar phrase (6/8 Pirate Swing) = 96 steps total (0..95).
  Writing steps only within 0..15 leaves bars 2–8 completely silent. Agents must distribute notes and rhythmic steps across the entire span.
- **Recipe A (Holiday / New Year 8-Bar Jingle):** C Major (`key: 0`), 96 BPM, 8 bars in `ambient`. VEIL (track 5, `bell`) plays the festive melody across steps 0..112; RAIN (track 4, `round`) plays bass roots across steps 0..120; ROOT (track 2, `shaker`) provides eighth-note sleigh bell groove; AURA (track 7, `wind`) plays 4-note chord pads on downbeats (0, 32, 64, 96, 112).
- **Recipe B (Epic Cinematic / Pirates of the Caribbean):** D Minor (`key: 14`), 104 BPM, 8 bars per phrase in 3/4 (96-step 6/8 pirate swing) in `reactor`. Phrases: Intro (`dark-piano` Dm chords), Verse (`pick-bass`, `palm-guitar`, `octave-lead` galloping theme), Chorus (`singing-lead`, `power-guitar`, full rock drums), Outro (fade out). Arrangement: `intro` (x1) -> `verse` (x2) -> `chorus` (x2) -> `verse2` (x1) -> `chorus` (x2) -> `outro` (x1, `fade: "out"`).

### Sound Worlds: AMBIENT vs. REACTOR
- Switching is controlled via top-level `"setup": "ambient" | "reactor"` in `project.replace` or every phrase of `composition.replace`. All phrases in a composition must share the same sound world.
- **Aliases & Auto-Inference:** `setup`, `world`, and `soundWorld` are interchangeable aliases. If `setup` is omitted but reactor presets are present in `project.replace`, the engine automatically resolves `setup = 'reactor'`. World prefixes (e.g. `reactor-dry-kick` vs `dry-kick`) are automatically normalized.
- **Setup & Vibe Sound Availability:** Sounds and motifs are strictly vibe-dependent. `instruments.json` provides `vibeAndSetupPolicy`, `canonicalId`, `setups: [...]`, and role-level `soundsBySetup: { ambient: [...], reactor: [...] }`. Every sound declares an explicit `setups` array (`['ambient']`, `['reactor']`, or multi-setup `['ambient', 'reactor']`) supporting multi-setup availability on the engine level.
- **`ambient`:** 100% procedural real-time Web Audio synthesis (pure sines, FM, filtered noise). Meditative, ethereal, cosmic vibe. Recommended tempo 60..85 BPM, spacious reverb (`space`: 35..80%).
- **`reactor`:** 32 organic presets backed by 130 authentic CC0 acoustic and electric instrument recordings (drums, overdriven bass, guitars, acoustic piano, brass). Driving, punchy rock vibe. Recommended tempo 90..140 BPM, focused mix (`space`: 10..30%).
- Instruments from any bank may be assigned to any voice, but global acoustic environment and default styling follow `setup`.
- **Error Self-Correction & File Modification Retry:** On validation failures (such as `INVALID_SOUND`), `responses/<requestId>.result.json` provides an informative `help` explanation and an actionable `instructionForAgent`. If an agent rewrites or modifies the failed request file in `requests/`, File Bridge automatically detects the change, purges stale error files, clears error state, and queues the new valid proposal into `state.pending` for human approval.

### File Bridge Directory Persistence & Control Actions
- `FileSystemDirectoryHandle` is persisted in IndexedDB (`halo-file-bridge-v1`).
- On page reload: if browser permission is retained (`queryPermission` returns `'granted'`), the bridge reconnects automatically without prompt.
- If re-confirmation is required by browser policy, the bridge displays the saved directory name with a 1-click `🔓 Reconnect` button, eliminating the need to browse folders on disk.
- **Control Toolbar Actions & Modal Dialog Confirmation:**
  - `⟳ Sync Files` (`syncFiles`): Re-writes all 5 technical context files (`AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, `project-state.json`).
  - `⯈ Check requests/` (`checkFolder`): Scans `requests/` for pending agent command batches.
  - `↺ Clear Requests` (`resetLocalChanges`): Safely cleans `requests/` and `responses/` files in the connected folder, resets error counters and pending queue, and re-syncs all 5 context files with the current in-browser project snapshot. Crucially, unlike the global `RESET WORKSPACE` action, it does NOT clear browser `localStorage` or reset the user's active composition/tracks. Requires human confirmation via the internal modal dialog (`window.HaloConfirm`).
  - `✕ Disconnect` (`disconnect`): Stops polling, clears in-memory handle, and removes saved handle from IndexedDB. Requires human confirmation via the internal modal dialog (`window.HaloConfirm`).
- **In-UI Error Recovery Suggestion:** When a command fails or displays an error in the bridge UI, an explicit suggestion prompt is shown: *"Если ошибка не уходит, очистите запросы папки и попросите нейросеть повторить запрос."* with a 1-click button `[↺ Очистить запросы]` that triggers the confirmed folder cleanup.
- **100% English AI Documentation:** All AI directives in `AGENT_GUIDE.md` and rule schemas in `music-rules.json` are maintained strictly in English to optimize comprehension and tool use by LLMs without linguistic ambiguity.

### Anti-Looping Circuit Breaker & Error Guidance Protocol
- **Error Response Schema (`responses/<requestId>.result.json`):**
  When a request fails validation, the result file contains:
  ```json
  {
    "ok": false,
    "requestId": "req-...",
    "error": "Error description...",
    "help": "Contextual parameter explanation...",
    "instructionForAgent": "Actionable step-by-step guidance...",
    "consecutiveErrors": 1
  }
  ```
- **Circuit Breaker (3 Consecutive Errors):**
  If an agent fails 3 times in a row (`consecutiveErrors >= 3`), HALO issues a `CRITICAL STOP DIRECTIVE` in both `error` and `instructionForAgent`:
  `CRITICAL STOP DIRECTIVE: 3 consecutive request failures detected. STOP YOUR RETRY LOOP IMMEDIATELY. Do not guess parameters or invent new schemas. Formulate a brief, helpful question to the human user explaining what you are trying to compose and asking them to confirm or clarify the tracks/instrument settings.`
- **Schema & Preset Tolerances:**
  - `format`: accepts `'halo-project'` as well as `'notbad-halo-project'`.
  - Operations payload: accepts either `o.project` or `o.composition` for both `project.replace` and `composition.replace`.
  - Preset names: world prefixes (e.g. `'ambient-bell'`) are automatically stripped to canonical sound IDs (`'bell'`).
  - Top-level composition metadata: `setup`, `timeSignature`, `bars`, `name`, `title`, `label` are tolerated and inherited to phrases if omitted.
  - Track count: `project.replace` requires all 8 tracks `[GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]`. If modifying fewer tracks, use `track.patch`.
  - Track roles & names: `role` and `name` are permanent slot identifiers fixed by `trackIndex: 0..7`; passing them inside `track.patch.values` throws `UNKNOWN_FIELD`.
  - Step editing & Generator 3: When `track.patch` supplies custom `steps` or `noteEvents`, HALO automatically sets `exact = true` if `exact` is omitted, ensuring custom patterns play without throwing `EXACT_REQUIRED`. Explicitly passing `exact: false` while supplying custom steps continues to enforce the requirement.
  - Phrase bars & startStep alignment: When `bars` is modified via `project.patch` or `phrase.patch` and `startStep` is omitted, HALO automatically aligns `startStep` to the new phrase boundary (`Math.floor(startStep / maxSteps) * maxSteps`), preventing `Invalid phrase position` errors during live playback loops.
- **Anti-Hallucination Guard against Localhost/CLI Loops:** External models often mistake client-side Web Audio file bridges for fullstack server-backed applications. HALO runs 100% in the user's browser with no local backend daemon, port, or CLI binary. Agents must not invoke `curl`, `netstat`, `node`, `npm`, `python`, `where.exe halo`, or launch browsers.
- **File tool write budgets:** Modular files bound individual agent write calls; limits depend on the harness. Publish the manifest last and require the explicit response described above.

### Modular Multi-File Requests & Full 8-Track Scoring Architecture
Agents can split complex multi-voice scores across multiple files, which HALO resolves automatically into a single atomic proposal in the UI:
1. **Folder Bundles (`requests/<requestId>/`):** The cleanest and recommended approach for scoring all 8 tracks with bounded file-writing calls. Create a subfolder in `requests/` containing `manifest.json` alongside companion track files:
   - `requests/req-001/manifest.json`: Root project envelope declaring tempo, bars, key, and references to companion files (`tracks: [{ file: "t0-pulse.json" }, { file: "t1-accent.json" }, ...]`).
   - `requests/req-001/t0-pulse.json` ... `t7-aura.json`: Individual track scoring files containing detailed 16th-note steps and chords.
   - HALO discovers directory handles in `requests/`, parses `manifest.json` (or `request.json` / `<bundle>.json`), and resolves all relative companion files within that subfolder.
2. **Operation-Level Companion Files:** Any atomic operation in `operations` can delegate its values to a companion file:
   `{ "op": "track.patch", "trackIndex": 5, "file": "veil-melody.json" }`.
3. **Multi-Part Operation Files:** A root request can assemble multiple modular JSON files using `"parts"`:
   `{ "requestId": "req-002", "schemaVersion": 1, "baseRevision": 1, "parts": ["drums.json", "harmony.json", "lead.json"] }`.
4. **Security & Validation Guardrails:**
   - Path traversal is strictly prohibited: any path containing `..`, absolute paths (starting with `/` or drive letters `C:`), or traversing outside the bundle/requests folder is rejected with `INVALID_FILE_PATH`.
   - Companion files in flat `requests/` (e.g. `req-001-t*.json` or files without root hallmarks) are safely skipped during polling to avoid premature false-positive validation errors.
   - Tolerant defaults: Companion track files automatically default to `on: true`, `generator: 3`, `instrument = name`, and `exact = true` when steps or notes are supplied.
5. **1-Click Atomic UI Approval & Cleanup:** HALO aggregates all companion files into one cohesive transaction in the web UI. Clicking «Apply Changes» commits all tracks atomically and generates `responses/<requestId>.result.json`. Clearing folder requests recursively purges both request files and bundle subdirectories.

Visual modes ORBIT/BLOOM/CURRENT, DRIFT/IN TIME/PHRASE and CLASSIC/COSMIC/HYPER are editable. Core slot radius is fixed `(135+24*i)*responsiveScale`; orbit reorder/radius/speed/phase/direction controls are not implemented. PHRASE markers follow actual musical events. 3/4 waltz and 6/8 rocking swing are fully implemented natively on transport and step grids. Arbitrary orbit reordering remains unsupported.

## Privacy, authorization and limits

All commands refer to one actual project state and the original audio transport. Invocation of a mutating tool authorizes the existing write gate; registration alone changes no music. This is not an origin security sandbox or an additional user-consent dialog. External agents/browser permissions determine access. Inputs remain strictly validated and size-bounded. Undo/Redo retain ten session transactions and reject later conflicting manual changes; history is not persisted across reloads.

HALO issues no model/network requests and stores no agent credentials. Reading exposes notes, settings, built-in sound metadata and local Track 09 reference IDs, never raw recordings, PCM, waveforms, input-device IDs or capture controls. Agents are responsible for their own text/context processing and must not claim acoustic analysis from parameter metadata. No new synthesis engine, samples, external audio generator or sound download is added.

## Verification

See [release validation](release-validation.md) for local WebMCP and File Bridge acceptance and remaining device/audio gates. The final changes have not been deployed; public-site acceptance must be repeated after publication.

History loading may normalize the selected phrase master/Track 09 metadata. Undo/Redo compares against the actual canonical state returned by that load, and still rejects later manual edits. See the Windows regression report for the verified cross-format round trip.

### First-use terms — 2026-10-18
A required RU/EN native modal covers hearing/feedback, visual discomfort, equipment, data loss, content rights, folder/device permissions, external AI and liability within applicable law. Checkbox and explicit acceptance are required; Escape/backdrop cannot dismiss it. Acceptance version 2026-10-18.1 and timestamp are localStorage-only, scoped to this browser origin/profile; unavailable storage means acceptance for this page session. Reset/clearing storage or changing terms version prompts again. WebMCP returns TERMS_NOT_ACCEPTED before acceptance. Permissions remain separately browser-controlled. HALO does not upload user content; external agents, intentional sharing and hosting technical logs are distinct. No legal enforceability or exhaustive risk guarantee is claimed.


### File Bridge input and receipt audit — 2026-10-18

File Bridge accepts track fields directly on an operation or inside values, digit-string indices 0..7 and ID case/whitespace variants. Conflicting values and musical constraints remain errors. The response submissionVersion covers the manifest and companion contents; after a correction wait for a fresh receipt before diagnosing an old error again.

Normalization is File Bridge only; WebMCP and core musical validation retain their strict contract. Use canonical `{op:"track.patch",trackIndex:5,values:{...}}`; a companion contains the values object. Keep one request ID and manifest for corrections. Write companions first and manifest last. Flat references resolve beside the manifest, bundle references inside the bundle; renaming files requires updating references. Slot/role diagnostics identify the track and distinguish role, exact flag and sound compatibility errors. No new dependency or deployment step.

Audit evidence, acceptance and limitations: [File Bridge audit](file-bridge-audit.md).
