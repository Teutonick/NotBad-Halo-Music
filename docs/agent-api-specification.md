# HALO External Agent API, WebMCP Site Tools and File Bridge

## File Bridge — six-workflow contract, 2026-10-20

Agent context is English across all five files; Russian appears only in parenthesized glossary translations inside values. JSON keys are plain English identifiers, including timing.BAR and terminology.PHRASE. Six workflows and duration-intent review are preserved.

HALO now tolerates harmless request/companion presentation syntax (comments, trailing commas, single quotes, unquoted identifiers and unambiguous whitespace-separated missing commas). It parses data without eval or source rewriting; duplicate keys, incomplete data and all musical/revision violations still fail. Canonical JSON Schema and output JSON stay unchanged.

One strict halo-score format with modes probe/replace/edit/patch. A mandatory real ready exchange checks requests write and HALO responses read before composition; only HALO creates receipts. STATE now exposes only a directly accepted normalized score of ALL phrases/sections, without internal engine fields, with explicit materialization/unrepresentable-state disclosures. Atomic parameter patches target existing phrases and preserve every unmentioned field, note, timbre and arrangement reference under one approval/revision check. The workflow-only guide routes six ordinary user intents; capabilities.json owns requestSchema/format, instruments.json owns the unique canonical palette and explicit MIDI-versus-acoustic range semantics. No scored examples. [Complete contract](file-bridge-protocol.md) · [Validation](release-validation.md).

This adds no backend, dependencies or new WebMCP tool. Internal/API operations keep their separate schemas. Reload HALO and Update Files before using probe/patch; older receiver code cannot process them. Bionic/LM Studio filesystem access must be granted by that host, not inferred from a readable guide.

## Integration Modes

The AI / Agents tab provides an integration mode switcher saved in `localStorage['halo-agent-bridge-mode']`:
1. **WebMCP (Browser Site Tools):** Uses native `document.modelContext.registerTool` for browsers/agents with direct in-app WebMCP connections (e.g. Codex in-app browser).
2. **File Bridge (Local Folder HALO-Bridge):** Uses desktop Chrome and Edge native `window.showDirectoryPicker` to connect to a local folder, export the technical engine passport and project state, and process agent requests from `requests/` with user confirmation.

## External-agent workflow

The user asks an external agent (Codex, Antigravity, Bionic, Claude) to compose or edit music.
- In **WebMCP mode**: The agent discovers Site Tools, calls `halo_get_context`, reads catalog/roles/state/notes, composes original parts, validates a batch, inspects its preview, applies it and reads back the result.
- In **File Bridge mode**: follow the [file delivery contract](file-bridge-protocol.md#paths-and-delivery). Human approval is required by default; pending_approval is written before approval.

There is no mood-preset planner or automatic inference/repair client in HALO. Manual editing remains available.

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
- **Default (Single Phrase):** Without explicit user request for a song or full composition, agents work exclusively with individual 4- or 8-bar phrases/loops using voices in File Bridge, or track.patch/project.replace in WebMCP.
- **Full Composition (File Bridge phrases/sections; WebMCP composition.replace):** Generated only when the user explicitly asks for a full song, composition, or multi-section arrangement ("песня", "полная композиция", "аранжировка").
- **Canonical Structure:** Intro (sparse, atmosphere/bells, no heavy bass) → Verse (groove and bass enter, harmonic foundation) → Chorus (peak dynamic, all voices active, leading melodic hook, bright character 60..80) → Verse 2 (rhythmic/melodic variation) → Bridge (contrasting harmony or texture) → Outro (dissolving elements, fade: "out"). Allowed section names: `["intro", "verse", "verse2", "chorus", "bridge", "outro", "phrase"]`.
- **Phrases Limit:** Maximum 15 unique phrases per composition. Repeating phrases across sections uses `repeats: 1..8` and shared phrase IDs.

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

## Privacy, authorization and limits

All commands refer to one actual project state and the original audio transport. Invocation of a mutating tool authorizes the existing write gate; registration alone changes no music. This is not an origin security sandbox or an additional user-consent dialog. External agents/browser permissions determine access. Inputs remain strictly validated and size-bounded. Undo/Redo retain ten session transactions and reject later conflicting manual changes; history is not persisted across reloads.

HALO issues no model/network requests and stores no agent credentials. Reading exposes notes, settings, built-in sound metadata and local Track 09 reference IDs, never raw recordings, PCM, waveforms, input-device IDs or capture controls. Agents are responsible for their own text/context processing and must not claim acoustic analysis from parameter metadata. No new synthesis engine, samples, external audio generator or sound download is added.

## Verification

See [release validation](release-validation.md) for local WebMCP and File Bridge acceptance and remaining device/audio gates. The final changes have not been deployed; public-site acceptance must be repeated after publication.

History loading may normalize the selected phrase master/Track 09 metadata. Undo/Redo compares against the actual canonical state returned by that load, and still rejects later manual edits. See the Windows regression report for the verified cross-format round trip.

### First-use terms — 2026-10-18
A required RU/EN native modal covers hearing/feedback, visual discomfort, equipment, data loss, content rights, folder/device permissions, external AI and liability within applicable law. Checkbox and explicit acceptance are required; Escape/backdrop cannot dismiss it. Acceptance version 2026-10-18.1 and timestamp are localStorage-only, scoped to this browser origin/profile; unavailable storage means acceptance for this page session. Reset/clearing storage or changing terms version prompts again. WebMCP returns TERMS_NOT_ACCEPTED before acceptance. Permissions remain separately browser-controlled. HALO does not upload user content; external agents, intentional sharing and hosting technical logs are distinct. No legal enforceability or exhaustive risk guarantee is claimed.


### Integration performance — 2026-10-18

Automatic File Bridge scans run every 1.5 seconds only while the File Bridge panel is selected and the browser page is visible. Closing the panel pauses automatic folder I/O; reopening resumes on the next tick. A scan already in progress may finish. Manual refresh/check remains available. Keep this panel open while an external agent submits files; otherwise its acknowledgement will wait.

Project snapshots are written only when the project revision changes; full reference files are exported on connection or explicit refresh. Idle file reads use bounded caches keyed by filename, lastModified and size; unchanged submissions skip repeated engine validation and unchanged receipts skip repeated JSON parsing. Companion-only corrections remain supported. Approval always rereads the request and companions, compares the reviewed content and checks the project revision. Metadata is an optimization, not approval authority. Project revision discovery still validates/serializes the in-memory project to detect edits outside the API; it is not yet an event-driven revision counter. WebMCP remains on demand and independent of the folder panel.

The translator handles changed DOM subtrees instead of rescanning the body for each transport label change. Large dock panels avoid nested backdrop blur over animated canvases. Audio scheduling and orbit geometry are unchanged. No new runtime dependencies or server requirements; static GitHub Pages paths remain relative.

Folder selection now displays waiting status and inline cancellation/errors in RU/EN; the native picker is invoked with its window receiver. Hidden/collapsed panels also pause automatic scans. Script URLs carry a new static cache version.

Idle scans do not re-notify UI subscribers or clone unchanged pending scores.


2026-10-18: The collapsed workspace toggle now displays an upward arrow; expanded mode retains the minimize line. A localized Report a bug link to the repository’s `/issues/new` form appears immediately left of Reset workspace, opening a separate tab with noopener/noreferrer. No issue is submitted automatically; no engine or Agent API operations changed.

Context schema versions after consolidation: capabilities 2, instruments 3, music-rules 2, project-state 2; request schemaVersion remains 1.
