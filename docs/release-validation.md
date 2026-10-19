# Release validation — File Bridge v3, 2026-10-19

Local candidate; no commit, push or deployment.

## Current evidence

- Complete Node suite: 262 tests pass, zero failures, with TEMP/TMP redirected to artifacts/test-tmp in the checkout. Retired operation/bundle/normalization acceptance tests were replaced with strict v3 acceptance/rejection tests; connection persistence, corrupt-handle recovery, folder-only reset, polling gates and approval/content protections remain covered.
- File Bridge tests cover all 62 catalog sounds, all eight roles in both worlds, explicit sounds, literal chromatic notes/rests, edit preservation, multi-phrase songs and 3/4, unknown fields/aliases/default rejection, ID correlation, path safety before reads, missing/truncated companions, fresh submissionVersion, approval races, stale revision refusal, applied/rejected non-replay and forced approval reads despite unchanged metadata.
- Real on-disk directory roundtrip in an isolated checkout artifact folder: five context files exported, companion-first/root-last publication, pending receipt, companion-only correction, changed receipt, explicit application and exact note/state readback. This exercises native Node filesystem I/O through File System Access-compatible handles, not a new OS folder permission grant in a browser.
- Generated context ownership/cross references and guide contents anchors are checked. Every complete JSON example in the guide validates through the actual compiler. Shipped capabilities.json matches the generator. Both manual locales contain one current bridge section, with old instructions removed from Projects/Export.
- Codex in-app browser at http://127.0.0.1:8766/: refreshed app, Russian and English guide sections and connected-folder descriptions inspected; contents navigation reached the updated section. The existing language preference was restored. User music, playback, folder connection and audio inputs were not changed.

## Remaining acceptance

No fresh external-model composition run, native OS-folder permission/selection regression, mobile viewport, Safari/iOS, audible listening, audio export or public-site deployment verification was performed for this change. Prompt structure and technical validation cannot guarantee an external model's musical quality or compliance.

## Update an existing connection

Reload the updated HALO page and choose Update Files. The five exported files now share version 3. Old operation/bundle/alias requests are unsupported and never automatically migrated. Submit a fresh strict halo-score under an unused ID. Folder refresh does not alter the browser composition.

## Production packaging

Run node --test tests/*.test.cjs, then sh scripts/package-pages.sh with a new output directory. The package includes index.html, runtime sources, local CC0 assets/rights, docs, portable examples, license and public capabilities.json. Development tests, instructions and artifacts stay excluded. Relative script, documentation and asset paths support repository-subpath GitHub Pages. No new runtime dependency, backend, CDN or mandatory build step was introduced.

Publication needs separate authorization; after publishing repeat browser tool discovery, folder approval and playback against the public HTTPS site.
