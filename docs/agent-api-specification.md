# HALO External Agent API and WebMCP Site Tools

Implemented contract — 2026-10-16. Source of truth: `src/agent.js`, `src/site-tools.js`, `src/song-ui.js`. This replaces the former embedded AI Composer proposal and client. HALO performs no LLM inference or provider connection.

## External-agent workflow

The user asks Codex to open HALO and compose or edit music. The agent discovers Site Tools, calls `halo_get_context`, reads real catalog/roles/state/notes, composes original parts, validates a batch, inspects its preview, applies it and reads back the result. Corrections are made by the external agent using returned validation errors. There is no mood-preset planner or automatic inference/repair client in HALO. No manual JSON exchange is required; structured arguments travel through browser tools. Manual editing remains available.

The AI / Agents tab is informational and bilingual: native availability, external-agent example and page-context fallback. No provider, endpoint, model, token, chat or connect controls.

## Automatic discovery and lifecycle

`HaloBrowserTools.install(HaloAgentAPI, environment)` runs at workspace initialization regardless of the selected tab. It prefers `document.modelContext.registerTool(descriptor,{signal})`; older `navigator.modelContext.registerTool` is used only if present. Each descriptor includes JSON input schema, description, annotations and execute. Native execution returns MCP text content containing JSON `{ok:true,result}` or `{ok:false,error}` with `isError:true`. Validation itself returns `{valid:false,error}` for an invalid transaction. Registration errors are caught and shown in status; fallback remains available. AbortController removes owned registrations on ordinary page teardown; BFCache pagehide preserves them. Other site tools are never cleared. No browser feature is simulated or security policy bypassed.

Primary references: [Chrome imperative WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), [WebMCP proposal](https://github.com/webmachinelearning/webmcp). Browser/agent support is required; ordinary browsers still play HALO without WebMCP.

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

## Page-context fallback

With actual page JavaScript access, use `window.HaloSiteTools.listTools()` and `await window.HaloSiteTools.callTool(name,args)`. Results are the unwrapped data (native execution adds the content envelope). `getStatus()`, `ready`, `subscribe(fn)` and `dispose()` expose bridge lifecycle. Direct `window.HaloAgentAPI` also remains available; call `setEnabled(true)` before direct writes. Read-only DOM evaluation does not provide this capability. No separate service, backend, extension, API key or runtime network dependency is required.

Example agent-side page-context transaction (not a manual user step):

```js
const bridge = window.HaloSiteTools;
const {revision} = await bridge.callTool('halo_get_state');
const transaction = {schemaVersion:1, baseRevision:revision, operations:[
  {op:'track.patch', trackIndex:5, values:{space:40}}
]};
const check = await bridge.callTool('halo_validate_operations',{transaction});
if (!check.valid) throw Error(check.error);
await bridge.callTool('halo_preview_operations',{transaction});
await bridge.callTool('halo_apply_operations',{transaction});
```

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
| `phrase.patch` | `phraseId` required for songs, `values:{bars?,startStep?,seed?,key?,liveLoop?}` |
| `master.patch` | `values:{tempo?,masterVolume?,mix?}`; song and phrase masters update together |
| `project.replace`, `composition.replace` | `project`: complete valid version-1 musical project/composition |
| `visual.patch` | `values:{scene?,motion?,effects?}`; enums from registry; scene changes require DRIFT |

Track fields: `instrument` (bank), `sound` (catalog ID), `generator`, `on`, `steps`, `exact`, `sequence`, `noteEvents`, `noteTranspose`, `level`, `density`, `character`, `duration`, `space`, `delay`, `delayTime`, `chorus`. Slot names/roles remain fixed. Patch objects replace each supplied field; supply the full `sequence`, `mix`, `liveLoop` or note list rather than nested partial objects. Changing bars requires compatible steps/events in the same transaction. Repeated sections reference the same phrase; create a new phrase ID for an independent variation.

## Real musical constraints

Only **4/4**, 4/8-bar phrases, 16 steps/bar. Eighths are steps 0,2,4,...; pauses are absent steps. BPM 30–200, normalized controls 0–100, EQ −9..9 dB, width 0–100. Sequence length 4–32, stepLength 1/2/4, offset 0..length−1; exact steps bypass density/cycle generation. Up to 32 phrases/sections, 128 total bars; duration = bars×240/BPM.

For generator 3 set `exact:true` for manual notes. Each `{step,notes:[MIDI]}` must reference a step, be unique, and contain at most four notes, additionally limited by role/sample register and role maxNotes. Set `noteTranspose` to the key's **offset**, not its index, for literal MIDI pitches. Bass is mono; arpeggio is mono and short. Empty note lists on unpitched percussion still trigger its sound. No per-note velocity, duration, swing/microtiming or independent chromatic-score engine is added. No acoustic listening/analysis is claimed by the planner.

Visual modes ORBIT/BLOOM/CURRENT, DRIFT/IN TIME/PHRASE and CLASSIC/COSMIC/HYPER are editable. Core slot radius is fixed `(135+24*i)*responsiveScale`; orbit reorder/radius/speed/phase/direction controls are not implemented. PHRASE markers follow actual musical events. Requests for a true waltz or arbitrary orbit rearrangement receive an honest limitation/alternative rather than false success.

## Privacy, authorization and limits

All commands refer to one actual project state and the original audio transport. Invocation of a mutating tool authorizes the existing write gate; registration alone changes no music. This is not an origin security sandbox or an additional user-consent dialog. External agents/browser permissions determine access. Inputs remain strictly validated and size-bounded. Undo/Redo retain ten session transactions and reject later conflicting manual changes; history is not persisted across reloads.

HALO issues no model/network requests and stores no agent credentials. Reading exposes notes, settings, built-in sound metadata and local Track 09 reference IDs, never raw recordings, PCM, waveforms, input-device IDs or capture controls. Agents are responsible for their own text/context processing and must not claim acoustic analysis from parameter metadata. No new synthesis engine, samples, external audio generator or sound download is added.

## Verification

See [WebMCP acceptance record](regression-webmcp-2026-10-16.md). Native Site Tools were discovered and called by Codex on the real local app, composing a new original G-major eight-bar score. This is not a mock model response. Public Pages still needs deployment of this change; the current published build has no tools. The fallback has automated contract coverage but no live end-to-end verification in the current read-only page-evaluation environment. Physical mobile and Safari/iOS remain untested.
