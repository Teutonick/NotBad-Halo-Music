---
name: halo-bridge-assistant
description: Autonomous handling of HALO Music Constructor File Bridge requests
---

# Autonomous HALO Bridge Assistant

Whenever the user references a HALO Bridge folder (e.g. `temp/`, `HALO-Bridge/`, or any folder with `AGENT_GUIDE.md` / `project-state.json`) and asks to compose, modify, or rearrange music:

1. **Autonomous Context Ingestion**:
   - Do NOT ask the user for technical details or instruct them to explain instruments.
   - Automatically inspect `project-state.json` (to get current `revision`, tempo, setup, active tracks).
   - Automatically inspect `instruments.json` (to find compatible voices, role policies, and MIDI ranges).
   - Automatically inspect `music-rules.json` (to follow 4/4 grid, 16 steps/bar, key, and scale).
   - Automatically inspect `capabilities.json` (to know allowed operation types and ranges).

2. **Compose and Validate**:
   - Construct valid musical operations (`track.patch`, `phrase.patch`, `master.patch`, `project.replace`, or `composition.replace`).
   - Use current `revision` as `baseRevision`.
   - Set unique `requestId` (e.g. `req-<timestamp>` or `req-jingle-01`).
   - Set `schemaVersion: 1`.

3. **Publish and verify before ending the turn**:
   - Complete and read back companions first; publish the manifest LAST in `requests/<requestId>/manifest.json`, or use a standalone JSON request.
   - Use canonical operations such as `{op:"track.patch",trackIndex:5,values:{...}}`; a referenced track companion contains the values object itself.
   - Wait 4–5 seconds and read `responses/<requestId>.result.json`. Only `status: "pending_approval"` confirms validation awaiting approval; `applied` confirms application and `rejected` means stop.
   - On `error`, inspect error/help/instructionForAgent and correct only the indicated cause, at most twice. Keep the same request ID and manifest for corrections. `submissionVersion` covers manifest and companion contents: an unchanged receipt after editing may be stale; wait for a fresh scan before diagnosing again.
   - No response means unconfirmed; ask the user to check the page/folder connection. Never infer success from silence. End after pending acknowledgement and invite human approval; never wait indefinitely for approval.

4. **Hard Prohibitions**:
   - **NO LOCALHOST / NO SERVERS / NO PORTS**: HALO has no backend server or API ports (no localhost:3000, 3001, etc.). Never run `curl`, `netstat`, or port scans.
   - **NO CLI / NO COMMANDS**: There is no `halo` CLI or executable. Never run `halo bridge run`, `where.exe halo`, `node`, `npm`, or `python` to execute HALO.
   - **NO BROWSERS**: Do not launch browsers or open URLs.
   - **NO INDEFINITE APPROVAL POLLING**: Validation receipts are automatic before human review. A bounded 4–5 second validation check is required; human approval remains in HALO.
   - These prohibitions apply to folder composition, not repository development or browser regression.

