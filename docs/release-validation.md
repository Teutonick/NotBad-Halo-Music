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
