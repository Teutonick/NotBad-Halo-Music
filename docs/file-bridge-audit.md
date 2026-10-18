# File Bridge contract audit — 2026-10-18

## Evidence and causes

The supplied QWEN transcript crosses three independent failure classes: external file-tool export permissions/order, request envelope shape, and musical role compatibility. Changing filenames cannot repair role compatibility; changing sounds cannot repair a missing values object. The previous generic missing-file error did not identify the referenced path. The old role validator also merged role mismatch, a non-boolean exact flag and incompatible sound into one message.

Read-only inspection of the connected folder found the final newyear2026 receipt applied at revision 7 and a separate req-newyear-2026-manifest error receipt. Multiple surviving roots can produce unrelated receipts. The transcript and retained files do not establish that QWEN read the same stale error twice; the previous receipt format provided no content correlation token.

The repository's .agents/rules/halo-bridge.md contradicted the exported guide: it required immediate termination and prohibited waiting for automatic validation. This is now synchronized with the bounded validation check, distinct from waiting for human approval.

## Resulting contract

Canonical track patch: {"op":"track.patch","trackIndex":5,"values":{"instrument":"GLASS","sound":"bell","space":40}}. A track companion is the values object, or a wrapped values object. Flat and bundle layouts remain supported. References resolve relative to the manifest directory; publish companions first and manifest last. Keep one manifest/request ID while correcting; new IDs are required after application/rejection.

File Bridge normalizes direct mutable track fields, digit-string indices, operation/instrument/sound casing and surrounding whitespace, and world-prefixed sound IDs. Contradictory duplicate fields fail rather than picking a winner. Unknown fields, musical ranges, sound compatibility, path boundaries and revision checks remain enforced. No inference of missing notes, replacement sounds or musical intent is performed. WebMCP is unchanged.

Error and pending receipts now carry submissionVersion, a non-cryptographic content correlation token covering the manifest and referenced companion reads. It is not a security digest or a client attempt counter. An unchanged token after a correction is not evidence of a fresh failure. Missing-file diagnostics identify the path; role errors identify the slot and cause.

## Verification and remaining acceptance

275 Node tests pass, including flat/bundle companion-only corrections, receipt changes, immutable reviewed snapshots, no replay, presentation normalization, duplicate conflicts and strict rejection of unknown fields/ranges. Test temporary files were redirected inside the working copy. git diff --check passes.

No new browser/device or listening acceptance was performed, and no live QWEN retry was run. The connected user folder and music were not modified. To use the new guide/receipts, open the updated HALO page, reconnect the folder and use its context sync action. Existing applied IDs remain terminal. No commit or deployment was made.
