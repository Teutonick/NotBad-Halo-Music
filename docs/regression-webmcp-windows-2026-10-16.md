# Windows Codex WebMCP acceptance — 2026-10-16

Real HALO at http://127.0.0.1:8766/ served by the user. Current Codex in-app browser on Windows, 1280×720. The older browser-use adapter failed its trust check; the supported current browser API connected successfully. All musical reading/writing below used native WebMCP discovery and invocation, with no page-global execution, DOM-injected commands or keyboard/mouse music editing. UI clicks were used only to inspect the bilingual instructions.

## Verified after the WebMCP-only edits

- Ten native tools discovered after reload, using document.modelContext. Read real context and eight-role limits.
- Composed a new explicit eight-bar C-major score at 112 BPM, master 45%, seven active voices and silent texture. Original bell phrase/answer, bass, harmony, arpeggio and quiet percussion. Chords C–Am–F–G–C–F–G–C. No generator/motif import; reused only current compatible built-in patch identities.
- Validation returned valid:true. Preview returned eight bars and a readback proved no mutation.
- Applied project.replace to real HALO. Readback: eight bars, eight tracks, 112 BPM. Export object exactly matched applied project. Saved actual exported object as artifacts/webmcp/new-year-windows.halo.json.
- Initial run found Redo falsely conflicting after Undo normalized the loaded composition’s selected phrase master and empty Track 09 metadata. Fixed history to remember the canonical returned state after Undo/Redo; regression test also confirms subsequent manual edits still conflict.
- Repeated full test after reload: apply → Undo → Redo → Undo succeeded. Redo project exactly matched applied jingle. Final composition JSON exactly matched the composition captured at the beginning of this repeated test (differences: []). The initial run had already normalized phrase 1 master/empty Track 09 metadata; this is retained. Music notes/arrangement were restored. Restored composition selects its first section rather than the previously selected seventh phrase.
- BPM 201 returned valid:false / Invalid numeric value. Pause returned playing:false. Did not start audio or listen; this is API/score acceptance, not audible-quality acceptance.
- RU and EN AI / Agents panels inspected in the real browser: available status, Chrome flag, both ordered client cases, prompts and explicit unverified-client wording. Returned locale to RU. Screenshot: artifacts/webmcp/agents-windows-ru.png. Panel uses existing vertical scrolling; pre-existing manually placed PHRASE overlay can overlap it. No panel-placement change in this patch.
- Browser warning/error log: empty at final inspection.
- node --test tests/*.test.cjs: 209 passed, 0 failed. git diff --check: clean.

## Removed interfaces and boundaries

No public window.HaloSiteTools command dispatcher, window.HaloAgentAPI instance or legacy navigator.modelContext adapter. Musical API stays internal; bridge lifecycle/status remains internal for the panel. Unsupported browsers retain manual music use. Relative local classic scripts, zero-build GitHub Pages deployment and sound assets unchanged. No commit or deployment.

Claude, Antigravity and Bionic procedures are theoretical pending actual discovery/invocation in their browser connections. No client-specific setup menu or universal support claimed. Safari/iOS, physical mobile, new mobile viewport checks, public deployment, actual audio playback and listening were not tested in this run.
