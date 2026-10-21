# File Bridge external file-tool guard — integration requirements

This is a contract for the external tool host (for example Bionic), **not an installed adapter or HALO feature**. HALO remains a browser-only receiver. Its repository cannot restrict arbitrary reads/writes performed by another application's file/shell tools.

An effective adapter must be the only allowed file publication/receipt-reading route during composition; leaving unrestricted shell/file tools available bypasses its budgets. No HALO server, daemon or browser-automation runner is needed.

| Boundary | Enforced rule |
| --- | --- |
| Session open | Verify one accessible connected root with guide/state/requests/responses. Bind its canonical path/handle; reject ambiguous or missing root; never create directories |
| Exchange preflight | Before composing each task allow only a fresh halo-score probe without version counters, request readback and real matching ready receipt. No write to responses/ or state; no alternate root after denial. Use the same ID for music |
| Begin user task | Bind a fresh unused task request ID to the current user task/message. Retire any ID already reported pending, applied or rejected; a new musical instruction cannot reuse it |
| Publish | Use HALO-equivalent data parsing for permitted presentation variations; require an object with format halo-score and matching ID and canonical fields before any filesystem mutation. Reject all receipt/status/approved objects. Restrict root and voice files to exact fixed paths; complete companions first and publish the root atomically last |
| Correction | Same task and unfinished submission only; at most two changed-content correction rounds. Do not reset budgets for identical rewrites, file renames or tool calls |
| Receipt read | Only the fixed matching receipt, at most three reads per submitted content version; waits through the host's built-in wait facility. No alternate roots, listing-based delays or shell bypass |
| State result | pending_approval returns evidence for review, then ends the task once reported; applied/rejected immediately stop and retire ID. A stale receipt never counts as a fresh acknowledgement |
| Budget exhausted | Return a terminal tool error with fixed paths and observed status; disable further receipt reads/publication for that task instead of relying on another NEVER paragraph |

The adapter must retain task identity and counters across tool calls and model retries. It must not trust model-supplied status objects or counters as authority, manufacture approval, increment HALO revisions or rewrite STATE. Expose scoreAudit and scoreReport as evidence; they do not certify musical quality.

Integration acceptance should replay: copied sparse score with continuous shaker; a later D-minor request after applied; repeated status-only approved writes; identical old receipt reads; unchanged-content rewrites; correction budget exhaustion; denied root; pending proposal awaiting human action. Verify that prohibited calls are actually refused, including all alternate write/read tools. The HALO unit suite alone cannot establish this external enforcement.

See [current receiver protocol](file-bridge-protocol.md) and [release evidence](release-validation.md).
