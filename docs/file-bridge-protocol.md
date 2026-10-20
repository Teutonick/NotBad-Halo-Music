# File Bridge v3 — current contract

Implemented 2026-10-19. Source: [file-bridge.js](../src/file-bridge.js). This is a breaking replacement of the File Bridge input protocol. WebMCP and portable project import retain their separate engine formats.

## Contents

1. [Required JSON structure](#required-json-structure)
2. [Package and authority](#package-and-authority)
3. [Paths and delivery](#paths-and-delivery)
4. [Score fields](#score-fields)
5. [Slots, roles, banks and timbres](#slots-roles-banks-and-timbres)
6. [Large scores and songs](#large-scores-and-songs)
7. [Receipts and correction](#receipts-and-correction)
8. [Runtime score diagnostics](#runtime-score-diagnostics)
9. [Refresh and validation](#refresh-and-validation)

## Required JSON structure

AGENT_GUIDE.md describes the strict halo-score fields with a type table and symbolic note tuples. It contains no JSON example, template or ready-made musical sequence. voices is an object keyed by role; each role maps to one voice object with one sound and actual numeric notes/steps. Lyrics and arrangement prose are not score fields. The filename supplies the request ID; optional requestId must match it.

This reference documents the receiver. The composer guide deliberately omits music theory and prescriptive composition procedures.

## Package and authority

HALO exports exactly five files with schema/protocol version **3**. Each JSON file links to the other four; the guide has linked contents and a package map. The guide is generated from the actual catalog, including all 62 timbres and recommended roles; detailed compatibility is in instruments.json.

| File | Owns | Read when |
| --- | --- | --- |
| AGENT_GUIDE.md | Score fields, complete palette with recommended roles, delivery and stopping | Always, completely |
| project-state.json | Live revision and project/visual state, read-only | Always after root verification; inspect phrase for edits |
| capabilities.json | Strict score fields, limits, paths, receipt statuses | Exact field/limit lookup |
| instruments.json | Fixed slot/role map, timbres, compatible roles, acoustic ranges, controls | Orchestration and register lookup |
| music-rules.json | HALO meter/grid and supported key names | Musical planning |

No file offers an alternative submission protocol. A missing/mixed package requires Update Files in HALO, never guessing. The guide deliberately contains **no live revision or tempo**: STATE is the sole revision authority.

## Paths and delivery

Verify one user-connected directory containing readable AGENT_GUIDE.md and project-state.json plus existing requests/ and responses/. A detached guide or agent workspace proves nothing. If no root is verified, stop without writing; if multiple active roots are ambiguous, ask which to use. No disk-wide search or directory creation.

Bind once:

```text
ROOT     = verified connected folder
STATE    = ROOT/project-state.json
ID       = unused ID, 1..128 ASCII letters/digits with single - or _ separators
REQUEST  = ROOT/requests/ID.json
RECEIPT  = ROOT/responses/ID.result.json
```

Use absolute paths or explicitly ROOT-bound handles for every operation. Double hyphens are reserved for companions. Filename supplies ID; optional requestId must match it exactly. Check names for collisions before selecting ID. Never write responses/, edit STATE, switch roots on a failed write, or create request subfolders.

Publish and read back the score, then inspect its matching receipt. Path/access errors terminate delivery.

## Score fields

Only `format: "halo-score"` is accepted. Root required fields: **format, baseRevision, mode, world, tempo, bars, meter, key**. Additional allowed root fields: **requestId, voices, phraseId, phrases, sections, repeat**. Every other field is an error. No bpm/timeSignature aliases, ignored metadata, case/prefix repairs, operation envelopes, parts or include.

| Field | Contract |
| --- | --- |
| baseRevision | Current integer STATE.revision; stale revisions fail, never auto-rebase |
| mode | replace for new music; edit preserves unmentioned voices/fields |
| world | ambient or reactor; edit must retain the existing world |
| tempo | Explicit BPM 30..200; choose for new music, copy for edits unless deliberately changed |
| bars | Explicit 4 or 8; per-phrase override allowed |
| meter | Explicit 4/4 (16 steps/bar) or 3/4 (12 steps/bar); per-phrase override allowed |
| key | Named key such as C major or D minor; per-phrase override allowed |
| voices | Role-keyed voice objects; omitted roles are silent in replace |
| phraseId | Required existing phrase ID for editing a song; forbidden for new music |

A voice allows exactly **sound, notes, steps, on, level, character, duration, space, delay, chorus**. New authored voices require a literal canonical sound ID and exactly one of notes/steps. Edit can retain sound and/or events by omitting those fields. Empty arrays mean intentional silence. `on` is boolean; the six controls are 0..100. Creation defaults: on true, level/character/duration 50, space 30, delay/chorus 0.

Pitched timbres use `notes: [[step, MIDI, ...]]`; chords share a tuple. Unpitched timbres use integer `steps`. Bass/melody/arpeggio/harmony always require notes and compatible pitched sounds. Steps are unique within each voice, zero-based across the whole phrase. MIDI is integer 0..127, bounded by role polyphony and existing acoustic register folding. No per-note duration or velocity. `duration` is a voice envelope control. No automatic repetition or insertion of missing music.

The package supplies field types and symbolic tuple notation, without concrete musical examples.

## Slots, roles, banks and timbres

| Physical slot | Fixed role (voices key) | Maximum simultaneous notes |
| --- | --- | --- |
| GLASS | pulse | 1 |
| TIDAL | accent | 2 |
| ROOT | percussion | 2 |
| EMBER | texture | 2 |
| RAIN | bass | 1 |
| VEIL | melody | 3 |
| MOSS | arpeggio | 1 |
| AURA | harmony | 4 |

Physical slots are fixed UI destinations. A sound bank (sounds[].bankId) is an internal catalog grouping, independent of that destination. The registry exposes one selectable ID, canonicalId, without competing prefixed aliases. A timbre is selected with `sound`, using instruments.json.sounds[].canonicalId, filtered by world in setups and role in compatibleRoles. affinityRoles recommend natural uses; they do not override compatibility or slot identities. For example, a harp from bank EMBER can play the melody role in physical slot VEIL. GLASS never means “bells” as a slot assignment. Agents never submit trackIndex, instrument, name or role fields. HALO derives those internally.

## Large scores and songs

The only companion path is **ROOT/requests/ID--role.json**, referenced as `{"file":"ID--role.json"}` in that role. No extra fields beside file. A companion contains the voice object itself, including sound for new music. No nesting, wrappers, subfolders, absolute paths, traversal or cross-request references. Complete and read back companions first; publish the root JSON last. Companion names containing `--` are never scanned as root requests.

A song uses `phrases` and `sections` instead of root voices, in replace mode. Phrase fields: id (unique positive integer), voices, optional bars/meter/key inherited from root. Sections: phrase (existing ID), repeats 1..8 (default 1), name intro/verse/verse2/chorus/bridge/outro/phrase (default phrase), fade none/in/out (default none). Optional root repeat is boolean, default false. Limits: 15 phrases, 32 sections, 128 total bars. All phrases share world and tempo. Reused phrase IDs share music; variations need distinct IDs and authored events.

A companion is fixed per ID and role: referencing it in multiple phrases deliberately shares the same voice data. Use inline voices for different phrase parts. All eight voices can be authored; combined root and unique companions are bounded to 512 KiB. Individual file-tool call limits belong to the external harness.

## Receipts and correction

Read RECEIPT immediately and require id === ID. Applied/rejected are terminal and take precedence over ok:false or freshness checks. Applied includes appliedRevision and need not include submissionVersion. Pending/error carry submissionVersion covering root plus companions; after correction require it to change.

| Status | Action |
| --- | --- |
| pending_approval | Report the waiting proposal; invite approval in HALO and end |
| applied | Report confirmed application and stop |
| rejected | Respect the user's decision and stop |
| error / ok:false, except rejected | Read error/help/instructionForAgent; correct the same files/ID, at most two correction rounds total |
| Missing/stale | Built-in wait only, 4–5 seconds, maximum three reads total per submission; without wait tool one immediate reread. Then UNCONFIRMED |

Never use shell timeout/sleep/ping/Start-Sleep, delegated waiting, alternative roots or indefinite approval polling. A revision conflict requires reading STATE and reconciling user changes, not blindly replacing baseRevision. Empty scoreReport is complete. Warnings describe event structure: empty/silenced parts, no new second-half attacks, repeated melody halves, shared rhythms. They neither infer artistic intent nor certify quality. Report the actual delivery status. Never claim listening without evidence.

## Runtime score diagnostics

The receiver computes event evidence automatically; the composer guide imposes no separate bar-audit procedure.

HALO returns **scoreAudit** in the pending and applied receipts and retains it in review. It contains tempo/total seconds, each phrase's named key, meter, seconds per bar, total seconds, scale pitch classes, per-voice enabled/source, attacksPerBar, first/last step and literal pitch classes. The sections array includes repeats, startSeconds and seconds. Pitch classes are integers C=0..B=11 with an enharmonic reference; octave folding does not change them. Zero attacks does not establish audible silence or count sound tails. Retained generated voices have null attack counts because this snapshot does not resolve their generated notes.

The expandable Events per bar table in review displays this evidence in RU/EN. **PART_BAR_GAP** is an advisory warning for at least two consecutive bars without new note events in an enabled authored pitched part, independently of other voices. Intentional rests/sustains remain valid; warnings neither reject sparse music nor automatically add notes. Empty scoreReport is not artistic approval. Warnings are diagnostic information, not composition instructions.

A later user request changing music always needs a **new ID and live STATE revision**, even for transposition. Same-ID repair is only for the current unfinished submission within the same turn. Once pending_approval has been reported, or applied/rejected is reached, retire the ID for agent writes. A previous pending proposal must be applied/rejected through HALO before a queued new proposal is reviewed. Never infer that a terminal receipt for the old ID proves a later edit.

Changing score.key alone does not transpose literal MIDI. A deliberate key edit requires checking/remapping every pitched voice and verifying named key/pitch classes; intentional chromaticism remains allowed. HALO cannot infer the user's intended key from prose and cannot certify theory or taste from a label.

Receipt statuses and **approved** are output/state words, never request commands. A status-only object is rejected as a non-score; replacing a terminal request cannot reapply it. Human approval is a HALO UI action. Rejection receipts now explicitly say STOP, rather than providing generic retry instructions.

HALO cannot count another application's receipt reads or intercept its arbitrary shell writes. Actual enforcement needs an external file-tool adapter, with no unguarded shell bypass: see [adapter requirements](file-bridge-tool-adapter.md). No Bionic adapter is installed or integrated by this patch.

## Refresh and validation

Reload updated HALO and choose **Update Files** in the connected folder. Existing old requests are not migrated or applied; submit newly authored v3 scores under fresh IDs. No user-connected folder is altered by repository development.

Default flow requires human approval; the explicit user Auto-apply setting remains available. Approval rereads root/companions and checks revision; edits invalidate review. Terminal IDs do not replay across reconnect. Auto-scans run only while the integration panel and page are visible; manual checks remain available. Snapshot sync occurs on revision changes; bounded caches avoid idle rereads. Clear Requests requires confirmation and preserves the browser composition/localStorage. No new dependency, server, CDN, sound asset or deployment step.

Related: [engine capabilities](engine-capabilities.md), [WebMCP/internal API](agent-api-specification.md), [release validation](release-validation.md), [tests](../tests/file-bridge.test.cjs). Node validation establishes format and engine behavior; live external-agent compliance, audible quality and native folder permissions require their own evidence.
