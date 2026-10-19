---
name: halo-bridge-assistant
description: Autonomous handling of HALO Music Constructor File Bridge requests
---

# Autonomous HALO Bridge Assistant

Whenever the user references a HALO Bridge folder (e.g. `temp/`, `HALO-Bridge/`, or any folder with `AGENT_GUIDE.md` / `project-state.json`) and asks to compose, modify, or rearrange music:

1. **Read the short composer guide**:
   - Read only AGENT_GUIDE.md with its current revision; inspect the target phrase in project-state.json for edits.
   - Do not ask the user for technical details. Read the complete instrument palette with natural/compatible parts embedded in the guide; full API schemas remain unnecessary.

2. **Compose one score format**:
   - Use format: "halo-score", current baseRevision, role-keyed voices (melody, bass, harmony, percussion, etc.). Notes are [step, MIDI, ...] tuples; percussion can use steps.
   - Choose sound explicitly for each authored part from the guide catalog. Compose original notes, accompaniment, rests and development; do not select generated phrase fragments or reuse the syntax example as a composition. HALO resolves slots/banks internally; omitted sound remains a compatibility fallback only.
   - mode: replace creates new music with omitted roles silent; mode: edit preserves unmentioned parts and requires phraseId for existing songs. Songs use phrases/sections in the same notation.
   - No operations, schemaVersion, trackIndex, instrument, project/values wrappers. Legacy operation API is only for deliberate advanced editing.

3. **Publish and verify before ending the turn**:
   - Complete and read back companions first; publish the root request LAST as `requests/<requestId>.json`. HALO already creates requests/ and responses/: create files only, never directories or requestId subfolders. Use prefixed companions such as `requests/<requestId>-track-0.json`; JSON file references contain only the basename. Join the connected folder once for absolute file-tool paths. If a write is denied, report the failed file path and stop; do not retry creating folders.
   - A voice companion contains the score voice object itself, e.g. {"notes":[[0,72]]}; reference it with voices:{"melody":{"file":"req-jingle-track-5.json"}}. No wrappers or API operations.
   - Wait 4–5 seconds and read `responses/<requestId>.result.json`. Only `status: "pending_approval"` confirms validation awaiting approval; `applied` confirms application and `rejected` means stop.
   - On `error`, inspect error/help/instructionForAgent and correct only the indicated cause, at most twice. Keep the same request ID and manifest for corrections. `submissionVersion` covers manifest and companion contents: an unchanged receipt after editing may be stale; wait for a fresh scan before diagnosing again.
   - No response means unconfirmed; ask the user to check the page/folder connection. Never infer success from silence. End after pending acknowledgement and invite human approval; never wait indefinitely for approval.

4. **Hard Prohibitions**:
   - **NO LOCALHOST / NO SERVERS / NO PORTS**: HALO has no backend server or API ports (no localhost:3000, 3001, etc.). Never run `curl`, `netstat`, or port scans.
   - **NO CLI / NO COMMANDS**: There is no `halo` CLI or executable. Never run `halo bridge run`, `where.exe halo`, `node`, `npm`, or `python` to execute HALO.
   - **NO BROWSERS**: Do not launch browsers or open URLs.
   - **NO INDEFINITE APPROVAL POLLING**: Validation receipts are automatic before human review. A bounded 4–5 second validation check is required; human approval remains in HALO.
   - These prohibitions apply to folder composition, not repository development or browser regression.

