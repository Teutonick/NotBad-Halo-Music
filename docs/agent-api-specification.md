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
2. **Batch Protocol:** Every request requires `requestId`, `schemaVersion: 1`, `baseRevision`, and an allowlisted operations array. Reprocessing processed batches is prohibited; stale revisions are rejected with `CONFLICT_REVISION_MISMATCH`.
3. **Allowlist & Privacy:** Only valid HALO operations (`track.patch`, `phrase.patch`, `master.patch`, `project.replace`, `composition.replace`, `visual.patch`) are accepted in `requests/`. No scripts, external URLs, or OS commands. `project-state.json` is strictly read-only.
4. **Desktop Chrome/Edge Native API:** File Bridge relies on `window.showDirectoryPicker({ mode: 'readwrite' })` without server dependencies or external libraries. Works statically on GitHub Pages.
5. **Zero Localhost, Zero CLI, and Zero Background Execution:** HALO is a 100% static client-side web application. There is **NO backend server, NO local HTTP daemon, NO CLI tool (`halo`), and NO localhost ports** (`localhost:3000`, `3001`, `8080`, `5173`, etc.). External agents are strictly prohibited from executing `curl`, `netstat`, `where.exe halo`, `node`, `npm`, `python`, or port scans to ping or run HALO.
6. **Asynchronous Human-in-the-Loop & Immediate Turn Termination:** Results in `responses/` are written **only after the human user reviews the changes and clicks «Apply Changes» in the browser UI**. Because human review takes time, the response will NEVER appear synchronously during the agent's turn. Agents must NEVER block, sleep, or poll waiting for `responses/`. Once the request is written to `requests/`, the agent must immediately terminate its turn and notify the user.

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

Track fields: `instrument` (bank), `sound` (catalog ID), `generator`, `on`, `steps`, `exact`, `sequence`, `noteEvents`, `noteTranspose`, `level`, `density`, `character`, `duration`, `space`, `delay`, `delayTime`, `chorus`. Canonical slot names (`GLASS`..`AURA`) remain fixed, but intuitive aliases (`BASS`, `KEYS`, `LEAD`, `RIFF`, `PERC`, `KICK`, `SNARE`, `BELL`, etc.) and cross-bank preset auto-detection are automatically resolved. Patch objects replace each supplied field; supply the full `sequence`, `mix`, `liveLoop` or note list rather than nested partial objects. Resetting local changes or calling `resetProject()` resets the baseline project revision counter to `revision: 1`. Changing bars requires compatible steps/events in the same transaction. Repeated sections reference the same phrase; create a new phrase ID for an independent variation.

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
- **Canonical Structure:** Intro (sparse, atmosphere/bells, no heavy bass) → Verse (groove and bass enter, harmonic foundation) → Chorus (peak dynamic, all voices active, leading melodic hook, bright character 60..80) → Verse 2 (rhythmic/melodic variation) → Bridge (contrasting harmony or texture) → Outro (dissolving elements, fade: "out").
- **Phrases Limit:** Maximum 15 unique phrases per composition. Repeating phrases across sections uses `repeats: 1..8` and shared phrase IDs.

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
  - `↺ Reset Changes` (`resetLocalChanges`): Clears `requests/` and `responses/` files, resets error counters and pending queue, clears dirty localStorage project keys (`halo-pattern-v1`, `notbad-halo-autosave-v1`, `halo-composition-v1`), restores clean default project state from the server/defaults, and re-syncs all 5 context files. Requires human confirmation via the internal modal dialog (`window.HaloConfirm`).
  - `✕ Disconnect` (`disconnect`): Stops polling, clears in-memory handle, and removes saved handle from IndexedDB. Requires human confirmation via the internal modal dialog (`window.HaloConfirm`).
- **In-UI Error Recovery Suggestion:** When a command fails or displays an error in the bridge UI, an explicit suggestion prompt is shown: *"Если ошибка не уходит, сбросьте локальные изменения и попросите нейросеть повторить запрос."* with a 1-click button `[↺ Сбросить локальные изменения]` that triggers the confirmed reset.
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
- **Anti-Hallucination Guard against Localhost/CLI Loops:** External models often mistake client-side Web Audio file bridges for fullstack server-backed applications. If a user prompt instructs an agent to *"write request and verify that the response confirms application"*, agents must not interpret this as a synchronous command to poll `responses/` or run local servers. Because human review in the web UI is required before a response can be generated, the response does not exist during the agent's turn. Agents must write the request, report completion, and end the turn immediately without polling, curling localhost, or launching browsers.
- **Token Budget & Compact Batch Directive:** When communicating with LLM tool-calling harnesses (e.g. Bionic, Qwen, Antigravity), generating massive monolithic 8-track `project.replace` objects with extensive note arrays easily exceeds tool-call string buffers, causing JSON truncation crashes (`Unterminated string in JSON at position ~3400`). Agents should compose using concise batches (< 1.5 KB) via `project.patch` (setting tempo/bars/key) and targeted `track.patch` operations for key melodic and harmonic voices. Unpatched voices remain active in their harmonious defaults.

Visual modes ORBIT/BLOOM/CURRENT, DRIFT/IN TIME/PHRASE and CLASSIC/COSMIC/HYPER are editable. Core slot radius is fixed `(135+24*i)*responsiveScale`; orbit reorder/radius/speed/phase/direction controls are not implemented. PHRASE markers follow actual musical events. 3/4 waltz and 6/8 rocking swing are fully implemented natively on transport and step grids. Arbitrary orbit reordering remains unsupported.

## Privacy, authorization and limits

All commands refer to one actual project state and the original audio transport. Invocation of a mutating tool authorizes the existing write gate; registration alone changes no music. This is not an origin security sandbox or an additional user-consent dialog. External agents/browser permissions determine access. Inputs remain strictly validated and size-bounded. Undo/Redo retain ten session transactions and reject later conflicting manual changes; history is not persisted across reloads.

HALO issues no model/network requests and stores no agent credentials. Reading exposes notes, settings, built-in sound metadata and local Track 09 reference IDs, never raw recordings, PCM, waveforms, input-device IDs or capture controls. Agents are responsible for their own text/context processing and must not claim acoustic analysis from parameter metadata. No new synthesis engine, samples, external audio generator or sound download is added.

## Verification

See [WebMCP acceptance record](regression-webmcp-2026-10-16.md). Native Site Tools were discovered and called by Codex on the real local app, composing a new original G-major eight-bar score. This is not a mock model response. Public Pages still needs deployment of this change; the current published build has no tools. The page-context fallback was removed; current Windows acceptance is recorded separately in regression-webmcp-windows-2026-10-16.md. Physical mobile and Safari/iOS remain untested.

History loading may normalize the selected phrase master/Track 09 metadata. Undo/Redo compares against the actual canonical state returned by that load, and still rejects later manual edits. See the Windows regression report for the verified cross-format round trip.
