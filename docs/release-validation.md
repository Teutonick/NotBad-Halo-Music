## Instrument-aware composer context — 2026-10-19

291 Node tests pass with repository-local TEMP/TMP. The generated guide is checked against every instrument registry entry, including timbre name, pitched/unpitched status and natural/other supported roles. Every advertised sound is accepted by the authoritative engine validator in a suitable authored part. A separate apply/context readback test proves that authored chromatic melody notes and rests are preserved in both sound worlds, independently of generated motifs. These checks establish notation/routing, not audible quality or a fresh external model's artistic performance. No new browser, listening or device acceptance is claimed for this instruction/catalog revision. Parser, synthesis and GENERATE behavior are unchanged.

## Composer score validation — 2026-10-19

- 288 Node tests pass with TEMP/TMP redirected to the checkout. New checks cover the exact guide example, all eight roles in both worlds, aggregated errors, 3/4 and song references/limits, edit preservation, companion-path security, approval races, terminal non-replay and applied project readback. The short guide revision is refreshed with project state.
- Native Chrome, desktop: isolated fixture with actual HALO Agent/File Bridge modules and the real File Bridge panel passed score submission → pending_approval → Apply Changes → applied. The canonical eight-bar score selected bell/round/shaker/air automatically; the in-memory folder readback matched the applied project. RU and EN score preview/prompt rendering were checked. This used a test project and File System Access-compatible in-memory handles; it does not establish a fresh native OS-folder or external-model run.
- Full app's first-use terms were not accepted for this test; the isolated fixture did not touch user storage, HALO projects, microphone or playback. No listening-quality, Safari/iOS/mobile, public deployment or external-model acceptance is claimed.
- Reload the updated HALO and Update Files before testing an external agent in a fresh conversation. A previously failed operation file is not migrated/applied automatically. No commit or deployment was performed.

# Release validation — 2026-10-18

Local candidate; not committed, pushed or deployed.

- Node suite: 270 tests passed, zero failures. Covers transport, serialization, WebMCP schemas, File Bridge validation, revision handling, companion-only corrections, approval snapshots and terminal receipts.
- Native Chrome: folder reconnect, truncated companion recovery, explicit pending acknowledgement, keyboard approval and applied readback passed. Both original scored examples were applied: eight-bar holiday loop and 72-bar adventure arrangement. Adventure note readback matched the submitted score; non-repeating song reached its final section and stopped.
- Desktop and 390×844 emulated viewport: PHRASE placement checked. Observed bridge diagnostics contained no console errors. Legacy rejection receipt handling has unit coverage.
- Listening quality, physical mobile/Safari, offline audio export and post-deployment public-site acceptance remain open. Starting transport is not evidence of listening quality.

## Production packaging

Run `node --test tests/*.test.cjs`, then `sh scripts/package-pages.sh` from a clean checkout. The destination must not already exist. The script copies runtime sources, local reactor assets including rights evidence, documentation, portable examples, license and public capabilities into `_site/`. It excludes tests, agent instructions, Git metadata, screenshots, development scripts and diagnostic artifacts. No build tool or runtime dependency is required; direct static use remains supported.

GitHub Pages performs the same tests and packaging before upload. Relative paths support the repository subpath. Changed bridge scripts carry updated cache query versions. Publish only after reviewing the candidate; then repeat tool discovery, folder approval and playback on the published HTTPS site.

Temporary screenshots, WAV exports, logs, connected regression folders and historical diagnostic reports are excluded from the repository. Durable score fixtures remain in `examples/ai/`; these are original compositions using existing HALO sounds.
