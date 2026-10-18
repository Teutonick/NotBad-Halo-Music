# Performance audit — 2026-10-18

## Supplied evidence

Chrome trace: `Trace-20261018T210009.json.gz`, 82,835 events. Renderer main thread (pid 24736, tid 24740), observed event span 15.48 seconds. `Commit`: 82 events, summed duration 13,522 ms; largest 206.0 ms. `FunctionCall`: 634 ms; `RunMicrotasks`: 512 ms; `FireAnimationFrame`: 490 ms. These categories nest and MUST NOT be added together. Commit duration includes rendering pipeline work/waits and is not a direct GPU utilization measurement. The capture supports a major rendering-pipeline bottleneck, not proof that folder polling caused WebGL context loss. Screenshot separately shows CONTEXT_LOST_WEBGL. Task Manager aggregates multiple Chrome processes and cannot isolate HALO.

## Code findings and changes

- Connected bridge previously scanned every 1.5 seconds after leaving the integration panel. It now gates automatic scans on File Bridge selection and page visibility. A scan already running may finish. Manual actions stay explicit.
- Unchanged responses and manifest/companions were reread every scan; metadata-based text caches and submission/receipt caches now avoid repeated text reads, engine validation and receipt parsing. Metadata retrieval/directory enumeration still occur while active. Caches are bounded and reset across connections. Native File System Access offers no portable directory revision in this implementation; lastModified+size is only an idle hint. Approval forces fresh complete reads and revision validation.
- Project context was already revision-gated. Revision-only reads now avoid an additional deep clone, but discovering a revision still serializes validated in-memory state. Event-driven revisions need a separate complete audit of all mutation paths to preserve stale-write protection.
- WebMCP has no folder scan loop and remains callable independently of the selected panel.
- Translation previously rescanned the full body after each observed DOM mutation. It now visits affected connected subtrees, coalescing overlapping scopes; explicit language changes still translate the whole page.
- Large dock surfaces and nested cards no longer apply repeated backdrop blur to continuously changing full-screen canvases. Geometry and sound scheduling are unchanged.

## Verification

Node regression: 279/279 passing with repository-local TEMP/TMP. Includes automatic-scan pause, hidden-page gate, explicit manual scan, metadata read reuse and forced approval-time companion verification even when metadata is unchanged. Existing full-score real-directory and companion correction regressions pass. Static asset paths are unchanged; no dependencies added.

Live in-app browser: reload, File Bridge/WebMCP panel switching, Play/Pause and RU/EN dynamic labels checked; warning/error logs empty for that session. Master volume was already 0%, so no audible acceptance is claimed. Real connected-folder browser verification remains pending. No controlled before/after FPS or trace comparison, Safari/iOS, physical mobile, or GPU context-loss recovery acceptance yet.


Picker reproduction: the in-app browser logs `waiting for directory picker` but no `connect() called`; the visible panel stays waiting. This localizes the outstanding live check before folder export/scanning. It does not establish the browser host root cause. Picker errors/cancellation now appear inline, and scripts have explicit cache version updates. A native Chrome/Edge folder check remains required.

Final live picker result: `AbortError: Failed to execute showDirectoryPicker on Window: The user aborted a request.` No connect log followed. The error is now visible inline; this does not distinguish a host abort from user cancellation. Idle scans also suppress unchanged UI notifications to avoid cloning the pending score on every tick.
