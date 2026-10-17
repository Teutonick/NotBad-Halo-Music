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

3. **Output & Immediate Turn Termination**:
   - Save the request JSON to `<bridge_dir>/requests/<requestId>.json`.
   - Inform the user that the request has been submitted and awaits their one-click approval in the HALO web interface.
   - **STOP IMMEDIATELY AND END YOUR TURN**.

4. **Hard Prohibitions**:
   - **NO LOCALHOST / NO SERVERS / NO PORTS**: HALO has no backend server or API ports (no localhost:3000, 3001, etc.). Never run `curl`, `netstat`, or port scans.
   - **NO CLI / NO COMMANDS**: There is no `halo` CLI or executable. Never run `halo bridge run`, `where.exe halo`, `node`, `npm`, or `python` to execute HALO.
   - **NO BROWSERS**: Do not launch browsers or open URLs.
   - **NO WAITING FOR responses/**: Requests require human approval in the web UI. Response files are written asynchronously only after human review. Never block, sleep, or loop waiting for `responses/`.

