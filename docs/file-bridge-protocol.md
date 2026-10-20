# File Bridge — current halo-score contract

Implemented in [src/file-bridge.js](../src/file-bridge.js), 2026-10-20. One strict format, `halo-score`, with four modes: probe, replace, edit, patch. WebMCP/internal operations and portable projects are separate APIs, never alternative File Bridge request shapes.

## Contents

1. [Folder preflight](#folder-preflight)
2. [Package and authority](#package-and-authority)
3. [Required JSON structure](#required-json-structure)
4. [Timing terminology](#timing-terminology)
5. [Slots, roles, banks and timbres](#slots-roles-banks-and-timbres)
6. [Large scores and songs](#large-scores-and-songs)
7. [Paths and delivery](#paths-and-delivery)
8. [Receipts and correction](#receipts-and-correction)
9. [Runtime score diagnostics](#runtime-score-diagnostics)
10. [Refresh and validation](#refresh-and-validation)

## Folder preflight

ROOT is the absolute connected folder supplied by the user. Verify existing AGENT_GUIDE.md, project-state.json, requests/ and responses/; never create substitutes or directories. Before composing each task, read live revision and write a small probe request into requests/ using format halo-score, mode probe and that integer baseRevision. No world, notes or other musical fields are allowed in a probe. Optional requestId must match its filename.

Read back that request and only its responses/ID.result.json. HALO returns ready with matching ID, currentRevision, submissionVersion and applied:false. It creates no approval proposal, changes no project state and never starts playback. A ready ID is finished and cannot later carry music; readiness persists across reconnection. Use a different fresh ID for the score. On failure or no ready within the normal bounded read limit, stop before composing; report exact path/error.

The external agent requires read access to context/receipts and write access only to requests/. ONLY HALO writes responses/ and project-state.json. A probe verifies the real exchange; it does not grant operating-system or Bionic/LM Studio tool permissions. Those must be arranged in that tool host. HALO cannot block an external shell from writing arbitrary paths: [external adapter requirements](file-bridge-tool-adapter.md).

## Package and authority

Five linked files retain schemaVersion 3. Existing replace/edit inputs remain accepted; new additive probe/patch modes are advertised explicitly. No aliases or legacy bundles are added.

| File | Authority |
| --- | --- |
| AGENT_GUIDE.md | Preflight, six user workflows, delivery/stop rules; links to the authoritative references |
| project-state.json | Current browser revision, normalized whole-composition score, export limitations; no internal engine state |
| capabilities.json | Sole format authority: requestSchema (JSON Schema 2020-12), mode-specific fields/limits, statuses and handshake contract |
| instruments.json | Physical slots, roles, canonical timbres, compatible roles, pitched flags and registers |
| music-rules.json | HALO time grid, exact timing vocabulary and key names |

The guide contains no live revision and no scored examples. It distinguishes creating a phrase, developing that phrase into a song, transforming the current song, creating unrelated new music and changing existing parameters. Users need only a folder and a musical brief.

### Complete current score export

STATE.score is a directly accepted halo-score replacement projection with live baseRevision, per-phrase bars/meter/key, all eight voices, their events and exposed parameters, sections and repeats. It represents current applied browser music, never unapproved requests. STATE contains only this normalized score, revision/export metadata and file references. Internal project fields (setup, numeric key index, noteEvents, startStep, visual state) are not exported to the agent. There is no second score-state file or competing musical representation.

The complete internal project stays inside HALO, including master settings, generator configuration and Track 09 references. These are preserved by parameter patching; they are not fields to copy into a music request.

Authored effective MIDI is exported with key offset/noteTranspose accounted for; saved startStep is rotated to a score starting at zero. Generated voices are resolved through the engine into explicit events for the phrase cycle at saved startStep, including latent muted parts; they are listed in scoreExport.materialized. Future generated cycles, probability, per-note dynamics and internal generator state cannot all be represented as a static event score. Replacing with this projection freezes that cycle, not the future generator. Use patch when musical data must remain unchanged.

scoreExport.complete=false and score=null explicitly report an unrepresentable state (e.g. incompatible legacy timbre/role, polyphony or missing MIDI). The original project remains unchanged inside HALO. Do not invent missing events or claim a lossless transformation in that case. No PCM is exported.

## Stable terminology and scoped editing

All five context files share one generated terminology dictionary. Prose uses PHRASE (фраза), LOOP (цикл), VOICE (голос), STATE (снимок состояния), SCORE (партитура), COMPOSITION (композиция), SECTION (секция), BAR (такт), BEAT (доля), STEP (шаг сетки) and the other defined uppercase terms. JSON keys, mode/status values, role IDs and filenames keep their literal spelling. BRIDGE_ROOT (корневая папка) is the connected-folder variable; the literal ROOT slot ID is a different identity and is never expanded as a folder term. All generated instructions are English. Russian appears only as parenthesized glossary translations in string values. Every JSON property name, including timing and terminology entries, is an undecorated English identifier. The shared terminology keys are PHRASE, LOOP, VOICE and the other plain identifiers; the timing keys are BAR, BEAT, TEMPO, STEP, POSITION, PHRASE, SECTION and REST.

The sixth workflow routes note or timbre changes in one PHRASE (фраза) to edit with an existing phraseId, voices containing only requested edits, and unchanged world/tempo/bars/meter/key copied from that target. Other phrases/voices remain unchanged. tempo is song-wide, so a scoped note edit retains it. Repeated sections reference shared phrases: do not promise to change just one occurrence of shared data without clarifying whether an independent variation is wanted.

Before publication the agent must ensure that the musical idea spans the requested duration. Long rests must be deliberate parts of the composition. This is an authoring requirement, not a new rejection threshold or automatic filler: no note is required in every bar and intentional silence is preserved.

## Required JSON structure

capabilities.json.requestSchema is the machine-readable canonical syntax (JSON Schema 2020-12). Its five exclusive branches cover probe, phrase replacement, song replacement, edit and patch; voices is never required for a song replacement. Schema references use local $defs; no runtime fetch, validator dependency or CDN is added. The existing receiver remains authoritative for live revision, filename/companion identity, world/timbre/role compatibility, event kind/polyphony, phrase-specific bounds, unique note onsets, references and arranged length. A schema pass alone is not delivery or musical acceptance.

Common fields: format is exactly halo-score; baseRevision is the live integer; mode selects the shape below. Optional requestId must equal the basename. Other unknown fields fail.

| Mode | Fields besides common fields | Semantics |
| --- | --- | --- |
| probe | none | Technical exchange test; ready receipt, no music/approval |
| replace | world, tempo, bars, meter, key; voices OR phrases+sections | New phrase/song or full transformation; omitted roles silent |
| edit | world, tempo, bars, meter, key, voices; phraseId for songs | One phrase edit; omitted voice fields/roles retained; tempo remains song-wide |
| patch | patches | Atomic parameter-only edit of existing phrases; metadata inherited |

world: ambient/reactor. tempo: 30..200 BPM. bars: 4/8. meter: 4/4 or 3/4. key: supported named key. Creation Voice: one object, one compatible canonical sound, notes for pitched or steps for unpitched timbres. notes uses symbolic tuples [absoluteStep, MIDI, ...], with integer MIDI 0..127 and role polyphony. steps is a flat integer array. Unique integer positions within the phrase; empty arrays mean silence. No per-note duration/velocity, arbitrary wrappers or prose.

Voice parameters: on boolean; level/character/duration/space/delay/chorus numeric 0..100. Creation defaults: on true; level/character/duration 50; space 30; delay/chorus 0. duration controls the voice envelope. Pitched MIDI is literal; changing key alone never transposes it. Integer MIDI 0..127 is the hard input pitch bound. instruments.json.midiInputRange makes this explicit; sounds[].acousticRange describes playback octave folding, not an input rejection bound. Role acousticRange gives register guidance; bass uses the existing engine bass policy. For example, bell MIDI 92 is valid although its timbre register is 26..88; playback may fold it by octaves, preserving pitch class. No new transposition is introduced.

### Presentation-tolerant parsing

HALO itself parses root requests AND voice companions as data before strict score validation. The canonical notation remains JSON/requestSchema, but the receiver also accepts BOM, a single json/jsonc/json5 Markdown fence, line/block comments, trailing commas, single-quoted strings, unquoted identifier keys and single-token string values, and missing commas between whitespace-separated complete values. This is a bounded subset, not a JavaScript/JSON5 interpreter. Comment text is ignored, including musical claims; numeric positions remain authoritative.

The reader never executes expressions, resolves duplicate keys or invents missing values, colons, closing quotes/containers or digits. Those cases remain errors. Strings containing // or /* are preserved literally. Nesting is bounded to 64 and existing 512 KiB combined-byte/path limits remain. Original source bytes are never rewritten, remain part of proposal identity and are reread before approval. Canonical state/receipts are still emitted as strict JSON. Revision, event type, bounds, MIDI, polyphony and approval validation are unchanged. The regression file-tool audit uses the same parser only to record mode/revision; it does not repair or rewrite publication.

### Atomic parameter patch

patches is a nonempty array of at most 15 objects, each with voices and, for a song, a required existing phraseId. For a single phrase omit phraseId. A target may appear once. Each voices maps role IDs to nonempty objects containing ONLY on/level/character/duration/space/delay/chorus. No notes, steps, sound, key, tempo, world or meter are permitted. Unmentioned data is cloned unchanged. Every entry validates before a single authoritative preview/apply; an invalid target/value rejects the entire request. One approval applies all entries under the same revision check and Undo transaction. Approval rereads all submitted content; stale revisions or modified proposals cannot silently apply.

For drum muting, inspect actual sound.pitched separately in each phrase. A pulse slot may hold pitched bass. Build only the appropriate per-phrase on:false changes. This preserves latent notes/timbres, repeated references, generator settings and Track 09. The preview lists changed parameters, not a replacement score.

## Timing terminology

Bar = measure = такт, an ordinary musical measure. Beat = доля = quarter note in both supported meters. Step = sixteenth note/semiquaver = шаг сетки; four steps per beat. 4/4 has 16 steps/bar; 3/4 has 12. BPM counts quarter-note beats per minute.

beatSeconds = 60 / tempo; stepSeconds = 15 / tempo; barSeconds = beatsPerBar × 60 / tempo. At 120 BPM: a 4/4 bar is 2 seconds and 8 bars are 16 seconds; 8 bars of 3/4 are 12 seconds. Positions begin at zero within EACH phrase and do not reset at bar boundaries. Bar n begins at (n−1)×stepsPerBar. In 8-bar 4/4, 0..15 are only bar 1, 112..127 are bar 8. Sections/repeats reference phrase events rather than introducing global indices. Intentional rests are allowed.

## Slots, roles, banks and timbres

| Physical slot | Role / voices key | Maximum notes |
| --- | --- | --- |
| GLASS | pulse | 1 |
| TIDAL | accent | 2 |
| ROOT | percussion | 2 |
| EMBER | texture | 2 |
| RAIN | bass | 1 |
| VEIL | melody | 3 |
| MOSS | arpeggio | 1 |
| AURA | harmony | 4 |

A fixed physical slot is not an instrument bank. Choose canonical sound IDs by world and compatibleRoles. affinityRoles are recommendations. Only instruments.json lists all 62 timbres, recommended/compatible roles and acoustic registers. canonicalId is unique within each world: the formerly ambiguous ambient hat entries are rain-hat (RAIN source bank) and moss-hat (MOSS source bank). The receiver maps them to original engine IDs/banks without changing synthesis or saved projects. Bare hat is not a current canonical ID. Never submit trackIndex, instrument or a role field inside Voice.

## Large scores and songs

Songs use replace with phrases and sections instead of root voices. A phrase has unique positive integer id, voices and optional bars/meter/key inherited from root. Sections reference existing phrase IDs; repeats 1..8 default 1, name intro/verse/verse2/chorus/bridge/outro/phrase defaults phrase, fade none/in/out defaults none. Root repeat defaults false. Limits: 15 phrases, 32 sections, 128 arranged bars, one world/tempo. Repeats share notes; new variations need independent IDs and musical events.

Optional companions are requests/ID--role.json containing a Voice; the reference contains only file with that exact basename. No subfolders, traversal, absolute paths, wrappers or cross-request references. Write/read companions first; root last. A shared companion deliberately shares that voice across phrases. Request and unique companions together are bounded to 512 KiB.

## Paths and delivery

Bind ROOT and the path variables once: STATE_PATH=ROOT/project-state.json; REQUEST_PATH=ROOT/requests/ID.json; RECEIPT_PATH=ROOT/responses/ID.result.json. Binding never authorizes editing: STATE_PATH and RECEIPT_PATH remain read-only to the agent. New unused IDs: 1..128 ASCII letters/digits separated by single hyphen/underscore; double hyphens are reserved for companions. No directory creation or fallback paths on denial. Each new user task uses a fresh probe ID and a separate fresh music ID. Correct an unfinished error under its existing ID; never use a new ID to evade errors.

## Receipts and correction

Only matching real receipts count. Process applied/rejected first regardless of ok:false; report and stop. pending_approval means technically validated and waiting for the human: report diagnostics and invite approval, then stop. Do not wait for approval, create it or claim playback. A later user task reads newly applied live STATE. ready belongs only to the probe and permits proceeding to compose under a different ID.

On error/ok:false, read error/help/instructionForAgent, correct the same unfinished request at most twice, then require changed submissionVersion. Revision conflicts require reconciling with STATE, not blindly replacing baseRevision. Missing/stale receipt: at most 3 reads with built-in waits of 4–5 seconds; without a wait tool one immediate reread. Then unconfirmed and stop. No shell waits, servers, browsers or delegated polling. Resolve an earlier pending proposal before assuming it applied.

## Runtime score diagnostics

scoreAudit reports actual time, keys, per-role attacksPerBar and section timing. Counts describe starts, not sustain or quality; retained generated parts have unknown counts. PART_BAR_GAP includes missing absoluteStep ranges. More events in the first bar do not populate later bars. Warnings are advisory, permit intentional rests and never add notes. A structurally valid sparse score is not artistic completion.

## Refresh and validation

Reload HALO and choose Update Files to refresh all five context documents. Refresh snapshot exports current state/projection and forces fresh request/companion/receipt reads; it never rebases, edits or applies a request. Terminal ready/applied/rejected IDs cannot replay. Auto scans run only while the integration panel/page are visible; manual checks remain. Clear Requests requires confirmation and preserves browser music/localStorage.

No backend, runtime dependency, CDN or build step is introduced. Related: [engine registry](engine-capabilities.md), [agent API](agent-api-specification.md), [regression](file-bridge-regression.md), [validation](release-validation.md).
