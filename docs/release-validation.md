# Release validation — File Bridge, 2026-10-20

## 2026-10-21 — Compact reference records and event tuples

334/334 Node tests and 12 JSON Schema syntax checks pass with checkout-local TEMP/TMP. Reference JSON round-trips to the complete generated data. Tests check every exported line against 480 characters and 768 UTF-8 bytes, separate all 62 catalog records, ensure the guide owns the only symbolic forms, and preserve all 128 authored melody events through expanded-object export and receiver reimport. Both full-context and incremental-state exports use the same score serializer. git diff --check passes. Logs: artifacts/bridge-compact-full.log and artifacts/bridge-compact-schema.log.

| File | Previous lines | Compact lines |
| --- | ---: | ---: |
| AGENT_GUIDE.md | 241 | 139 |
| capabilities.json | 1105 | 149 |
| instruments.json | 1812 | 103 |
| music-rules.json | 88 | 17 |
| Reference total | 3246 | 408 |
| project-state.json (separate test snapshot) | 351 | 173 |

The complete reference package is 408 lines; the desired 100–200 total remains an optimization target. Schema, catalog and musical/approval metadata were preserved. Reference bytes decreased from 96,370 to 68,299; line reduction does not establish proportional token savings. Reference maximum line lengths are 479/477/477/465 characters respectively; measured UTF-8 maxima are 515/515/519/509 bytes. The 480-character layout budget is selected locally, not a measured Bionic/model limit. Actual snapshot size depends on the composition. No external-model rerun, browser/device QA, listening review or connected-folder writes were performed. Reload HALO and choose Update Files.

## 2026-10-21 — Symbolic authoring forms and affirmative guidance

332/332 Node tests pass with checkout-local TEMP/TMP; 12 canonical JSON Schema syntax checks pass. New regression fills all five schema-derived request forms and both voice forms with test-only data and submits them to the real receiver. It checks literal guide/template agreement, symbolic creative values, early structure placement and affirmative wording across all five generated files. Existing tests preserve terminal receipts, human approval, conflicts, original notes and intentional rests. Root capabilities.json matches the generator. git diff --check passes. Logs: artifacts/bridge-authoring-full.log and artifacts/bridge-authoring-schema.log.

Both in-app manual locales and the protocol/capability/API documents describe the forms. This change adds authoring guidance and changes corrective wording; receiver/schema acceptance and audio behavior remain unchanged. No live model rerun, browser/device QA, listening review or connected-folder writes were performed. Reload HALO and choose Update Files to export the revised context.

## 2026-10-21 — File Bridge synchronization ownership

- Node suite: 331 tests passed after adding task-baseline, independent merge, same-value concurrency, full-replacement conflict, missing/reconnected baseline, automatic-apply blocking and renewed-approval coverage. Existing real filesystem roundtrip now uses one ID for probe then music with no counters.
- Local preview started using scripts/preview.ps1 at http://127.0.0.1:8766/. Desktop in-app Chromium loaded the existing integration panel; console warning/error capture was empty. The legacy browser adapter was unavailable; the supported current browser API worked.
- Browser folder permission, visual conflict-card interaction, mobile/Safari and audible acceptance were not exercised. Node filesystem tests and isolated bridge mocks establish protocol/state behavior, not physical-device or external-model acceptance.
- All paths remain relative and classic-script based; no backend, runtime dependency, CDN, deployment or commit.


## English context and JSON-key audit — 2026-10-20

68 targeted File Bridge/file-tool tests pass; 12 canonical-schema cases and one bilingual user-manual smoke test pass. A recursive audit rejects Cyrillic or parenthesized decoration in every JSON property name across all four generated JSON documents. A separate allowlist check across all five files permits Russian only inside parentheses matching a defined glossary translation; all remaining instructions are English. timing and terminology use plain English identifiers. Generated state still passes the unchanged halo-score validator. Logs: artifacts/bridge-english-context-targeted.log, artifacts/bridge-english-context-schema.log, artifacts/bridge-english-context-ui-smoke.log. git diff --check passes. Full regression remains paused; no connected-folder writes, model rerun or listening acceptance.


## Six workflows and terminology follow-up — 2026-10-20

67 targeted File Bridge/file-tool tests pass, 12 canonical-schema smoke cases pass, and the bilingual manual smoke test passes. New assertions verify the sixth scoped edit workflow, deliberate duration coverage without mandatory bar density, equal terminology dictionaries in all five files, protected JSON identifiers and the distinction between BRIDGE_ROOT and the literal ROOT slot. Current generated guide: 10,530 characters including the shared vocabulary. git diff --check passes. Full Node/model regression remains paused; no shared-folder writes or listening acceptance were performed.


## Tolerant syntax follow-up — 2026-10-20

66 targeted File Bridge/file-tool tests pass with checkout-local TEMP/TMP. Cases cover comments/strings, BOM/fences, trailing or unambiguously missing commas, quoted/unquoted data, rejection of incomplete/duplicate/executable/non-finite values, bounded nesting, unchanged raw publication, companion parsing, actual preview/apply and probe audit metadata. The canonical schema smoke checks and bilingual-guide smoke test pass; git diff --check is clean. No full model regression or full Node suite was run.

The supplied newyear-jingle-2026.json was read only and validates with the new parser against an isolated synthetic receiver at revision 1; this is not application to the user's browser. Its event starts span bars 1–3 only; bars 4–8 have no new events. Comments labeling steps as later bars do not move notes. Raw user files were not changed, no approval/playback/listening is claimed. Reload local HALO and Update Files before rechecking the unchanged request.


## Current contract-audit candidate — manual testing only

61 targeted File Bridge/file-tool tests pass, 12 canonical JSON Schema cases pass with PowerShell Test-Json, and one bilingual guide smoke test passes. Checks cover unique source-bank sound identity, literal MIDI versus acoustic register, normalized whole-song state with no internal fields, schema branch separation, real probe/ready, atomic patches, exact receipt/error handling and preservation of per-phrase Track 09 references. The workflow-only guide is 6,982 characters. The generated five-file candidate and root capabilities.json are synchronized; git diff --check passes.

Logs: artifacts/bridge-contract-audit-targeted.log, artifacts/bridge-contract-audit-schema.log, artifacts/bridge-contract-audit-ui-smoke.log. The full live-model rerun was stopped at the user's request; it is not current acceptance evidence. No full Node suite, new model run, native browser-folder permission test, Bionic access test or listening acceptance was performed after these audit changes. The user's connected folder was not modified. [Audit resolution and manual checklist](file-bridge-contract-audit.md). Earlier results below describe earlier revisions only.



## Receipt-check prompt follow-up

301/301 Node tests pass with checkout-local TEMP/TMP; git diff --check passes. New checks cover fractional/bounds/duplicate error distinctions and unchanged engine state on rejection, same-ID correction with a fresh pending receipt, and the explicit bilingual user-prompt repair/stop contract. The attached newyear-chime.json was read only: fractional positions are invalid, and authored starts stop at step 39 rather than spanning all eight bars. No score rewriting, external-model rerun, browser visual or listening acceptance was performed. Reload HALO for updated UI/diagnostics and choose Update Files for the generated guide.


## Snapshot recovery follow-up

298/298 Node tests pass with checkout-local TEMP/TMP; git diff --check passes. Regression reproduces a stale request, confirms snapshot export without revision rewriting/application, then verifies same-size/mtime corrected bytes become pending on explicit refresh. Terminal IDs still cannot replay. Both 4/4 and 3/4 sparse-score warnings identify exact missing absoluteStep ranges and remain advisory. Updated bilingual manual/messages. Browser verification was attempted with the browser-use plugin but its native connection was unavailable/untrusted; no visual/native-folder or listening acceptance is claimed. User-connected folder was read only and not modified. Reload HALO to load the new script; Update Files refreshes the generated guide, while snapshot refresh exports live state only.


## Timing vocabulary follow-up

296/296 Node tests pass with checkout-local TEMP/TMP. Added boundary/time regressions at 120 BPM: 4/4 bar = 2 s, eight bars = 16 s; 3/4 bar = 1.5 s, eight bars = 12 s. Both phrases in a song may independently begin at step zero; event starts at bar boundaries audit to the intended one-based bars. Guide/capabilities/music-rules timing definitions are identical by test. The guide is now 9,318 characters including the glossary, without score examples or mandatory density. git diff --check passes. No live Qwen/Luna rerun or browser visual check was performed for this wording update; the user's connected folder was not modified. Reload HALO and Update Files.


## Five-step live-model regression

294/294 Node tests pass (26 added regression checks). A real isolated Luna low run performed all five tasks through one real disk folder and the production receiver. Rechecking immutable snapshots after correcting a natural-minor-only test mistake passes all five structural/protocol checks. The original diagnostic report and earlier real model failures remain preserved; listening and native browser-folder acceptance are not claimed. [Scenario](file-bridge-regression.md) · [Results and limitations](file-bridge-regression-results.md).

## Earlier compact-guide validation

Local candidate; no commit, push or deployment.

## Current evidence

- Complete Node suite: 268/268 tests pass with TEMP/TMP redirected to checkout artifacts/test-tmp. Log: artifacts/compact-guide-full-tests.log. git diff --check passes.
- Generated guide: 7,882 characters versus 20,155 in the read-only connected-folder guide, a reduction of 60.9%. The instrument section is 3,561 characters; the remaining contract is 4,321. Character counts are not model token counts.
- Guide tests check absence of JSON examples/templates, state-machine mandates and musical lessons; symbolic note tuple types remain. All 62 catalog entries retain their engine-provided recommended roles. Detailed compatibility/ranges remain in instruments.json. music-rules.json contains only grid/key information.
- Strict score validation, revision/approval handling, scoreAudit and advisory warnings remain covered. Tests include descriptive-document rejection, exact authored events, all timbres/roles, companions, path safety, new submission versions, stale revisions, terminal IDs and isolated real-filesystem round trips.
- Both in-app manual locales contain one current bridge section. Shipped capabilities.json matches the generator. Current repository bridge instructions and technical references are synchronized with the shortened guide.

No new external Qwen/Claude composition, native browser-folder permission, device or audible acceptance was performed for this simplification. Passing tests and a smaller prompt do not establish model compliance or artistic quality. The user's connected folder and music were not changed. Reload HALO and choose Update Files to export the revised package.

## Earlier evidence and scope

Previous File Bridge checks exercised RU/EN review rendering and the per-bar diagnostic table in an isolated browser fixture. Those checks were not repeated for this text simplification and do not establish current visual or listening acceptance. HALO cannot impose read/write budgets on an external agent's tools; see [adapter requirements](file-bridge-tool-adapter.md).
