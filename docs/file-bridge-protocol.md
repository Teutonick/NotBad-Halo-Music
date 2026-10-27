# File Bridge — current halo-score contract

## Complete agent world reference — 2026-10-27

The live WebMCP and File Bridge catalogs already include all 96 timbres across AMBIENT (30 procedural), REACTOR (32 recorded presets) and WATER (32 procedural + 2 recorded handpans). The generator update added musical rules, rather than new instruments or another world.

WebMCP capabilities now expose readable `worlds` records: bilingual directions/names, live-derived timbre counts, generator versions and ten named profiles per world, including minor/major scale-degree progressions, chord voicing and generator-4 groove/active-role/cycle/fill defaults. Existing `catalog`, generator tuples and request operations remain compatible. File Bridge `instruments.json.soundWorlds` adds counts/version/reference; each sound declares recorded/procedural origin, with handpan register/native-key guidance. `music-rules.json.worldGeneration` derives the same 30 profiles from live capabilities. File Bridge retains English instructions and its RU glossary; UI/WebMCP metadata is bilingual. Profiles guide creative choices; external agents continue to author original events using any compatible built-in timbre, including borrowing across worlds.

Reference packages retain schemaVersion 3; halo-score requests keep their existing structure and the project format stays 1. The single timbre registry, approval/conflict handling and authored-note semantics are unchanged. `capabilities.json` is regenerated from runtime. Existing connected folders receive the new guide/catalog/rules after reloading updated HALO and choosing **Update Files**. No connected user folder was modified by repository tests.

## 2026-10-21 — Shared preflight, one-phrase recovery and borrowed timbres

HALO validates incoming scores before preview/application using the same pure `HaloFileBridge.preflightScore(api, draft, id, options)` entry point available to host adapters. The result includes `ok`, errors or the validated preview/transaction, `normalizedScore`, `scoreReport` and `scoreAudit`; checking alone leaves the draft and live music unchanged. File Bridge keeps its existing probe/ready, freshness, conflict and approval lifecycle.

A `mode:replace` request with root `voices` plus `repeat` or `sections` referencing one positive integer phrase ID is normalized to `phrases + sections`. A missing/empty sections list becomes one section for that authored phrase. Existing section order, repeats, names, fades, the repeat flag, tempo and all musical events are preserved. `SINGLE_PHRASE_ARRANGEMENT_NORMALIZED` is informational. Multiple distinct section targets still require explicitly authored phrases; musical data is supplied by its author. Canonical requestSchema continues to describe the normalized forms.

A voice `sound` may select any built-in canonicalId compatible with its role, across AMBIENT and REACTOR. The root `world` retains the phrase world/visuals and native generation palette. Catalog world/setups describe the timbre origin. HALO stores an optional per-track `soundWorld` in native projects and derives it automatically from the selected score sound; score voices continue to use `sound`, with the existing fields. `CROSS_WORLD_TIMBRE` reports a borrowed origin. Unknown identifiers, incompatible roles, event-kind/polyphony/timing errors and unsafe file references retain strict validation.

Imported timbres survive parameter-only patches, scoped edits, portable/share/local storage, Undo/Redo, score audit/export and phrase transitions. The manual editor identifies the imported timbre and offers native banks; its parameter controls preserve the sound. Native bank selection and GENERATE return the track to the phrase world's palette. Local sample preparation checks actual timbres across every song phrase, including later borrowed sampled parts, before live/offline playback. Existing sample-failure handling remains authoritative.

### Optional host draft gate before file publication

From a checkout with Node, a host can run:

```text
node scripts/preflight-score.cjs DRAFT.json --state PROJECT_STATE_PATH --id TASK_ID --output NEW_CHECKED_FILE.json
```

The tool uses only repository code and Node built-ins. A complete exported `project-state.json` supplies the baseline for edits. It reads voice companions from the draft's directory with the existing receiver rules, checks the entire resolved draft, and creates a new canonical file only after success. Output publication uses exclusive hard-link creation from fully written temporary bytes in the same directory; existing files remain protected even under a competing writer. An unsupported filesystem fails closed and the staged temporary file is removed. Omitting `--output` performs a read-only check. Exit 0 means this snapshot-based check passed; exit 1 means no checked output was created. Draft/candidate files belong to the host adapter; the existing flat bridge delivery paths still govern publication of the final request.

This is optional host tooling, separate from the five exported context files and the static site's runtime. A folder-only agent without this integration is checked when HALO reads its request. The live receiver owns freshness and approvals; offline preflight certifies the supplied snapshot and music structure, rather than a later live browser revision. The CLI performs no browser writes, approval or playback and preserves the current request-ID/probe workflow.

Reference layout, 2026-10-21: capabilities.json, instruments.json and music-rules.json remain standard JSON with complete members packed within 480 characters per line. Catalog sound records stay separate; nested structures wrap when required. The guide packs symbolic forms, uses a glossary table and wraps prose to the same character budget. This is a selected formatting budget, not a measured Bionic response limit. project-state.json retains expanded objects and bounded horizontal event arrays; initial export and incremental state synchronization share the serializer. Formatting preserves parsed values and introduces no dependency.

Implemented in [src/file-bridge.js](../src/file-bridge.js), 2026-10-21. One strict format, `halo-score`, with four modes: probe, replace, edit, patch. WebMCP/internal operations and portable projects are separate APIs, never alternative File Bridge request shapes.

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

ROOT is the absolute connected folder supplied by the user. Verify existing AGENT_GUIDE.md, project-state.json, requests/ and responses/; never create substitutes or directories. Choose one fresh task ID and write requests/ID.json with format halo-score and mode probe. No world, notes or other musical fields are allowed. Optional requestId must match its filename.

Read back the request and only responses/ID.result.json. A matching ready proves exchange without music mutation or approval. HALO captures the original project for this task. Read STATE and replace the probe with music under the SAME ID. No version numbers need to be copied, compared or corrected by the agent. On denial or missing ready within the bounded read limit, stop before composing.

### HALO-owned synchronization

HALO compiles against the captured task state and compares original, current and proposed music. Independent field changes merge; identical concurrent changes are accepted. Track slots merge independently. Phrase arrays merge only when IDs and order are unchanged. Note arrays and arrangement arrays are atomic; HALO never invents notes or combines conflicting musical arrays. Full replace after any project change requires human review. Explicit parameter patches retain their requested values, including values equal to the original state.

Conflicts appear as pending_approval.conflicts and a bilingual user choice, even with automatic application enabled. Accept agent version uses the displayed proposal, retaining safely merged site changes; reject preserves current browser music and archives the request as rejected. Request source files remain unchanged. This is not a folder rollback or an automatic rewrite of the agent's score.

Task bases are bounded to 16 session snapshots. Reload, reconnect, reset or eviction can make a task baseline unavailable; HALO then requires explicit user review (TASK_BASE_UNAVAILABLE), never blind automatic rebasing. Existing ready receipts do not recreate a lost baseline. Corrected files keep their original task baseline. Before application HALO rereads all source bytes and checks current state again. Later project changes rebuild the proposal and require another review; later source changes invalidate approval. Internal revision counters, content fingerprints and schema versions remain HALO responsibilities. WebMCP retains its separate explicit revision contract.

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

STATE.score is a directly accepted halo-score replacement projection without transport counters, with per-phrase bars/meter/key, all eight voices, their events and exposed parameters, sections and repeats. It represents current applied browser music, never unapproved requests. STATE contains only this normalized score, revision/export metadata and file references. Internal project fields (setup, numeric key index, noteEvents, startStep, visual state) are not exported to the agent. There is no second score-state file or competing musical representation.

The complete internal project stays inside HALO, including master settings, generator configuration and Track 09 references. These are preserved by parameter patching; they are not fields to copy into a music request.

Authored effective MIDI is exported with key offset/noteTranspose accounted for; saved startStep is rotated to a score starting at zero. Generated voices are resolved through the engine into explicit events for the phrase cycle at saved startStep, including latent muted parts; they are listed in scoreExport.materialized. Future generated cycles, probability, per-note dynamics and internal generator state cannot all be represented as a static event score. Replacing with this projection freezes that cycle, not the future generator. Use patch when musical data must remain unchanged.

scoreExport.complete=false and score=null explicitly report an unrepresentable state (e.g. incompatible legacy timbre/role, polyphony or missing MIDI). The original project remains unchanged inside HALO. Do not invent missing events or claim a lossless transformation in that case. No PCM is exported.

## Stable terminology and scoped editing

All five context files share one generated terminology dictionary. Prose uses PHRASE (фраза), LOOP (цикл), VOICE (голос), STATE (снимок состояния), SCORE (партитура), COMPOSITION (композиция), SECTION (секция), BAR (такт), BEAT (доля), STEP (шаг сетки) and the other defined uppercase terms. JSON keys, mode/status values, role IDs and filenames keep their literal spelling. BRIDGE_ROOT (корневая папка) is the connected-folder variable; the literal ROOT slot ID is a different identity and is never expanded as a folder term. All generated instructions are English. Russian appears only as parenthesized glossary translations in string values. Every JSON property name, including timing and terminology entries, is an undecorated English identifier. The shared terminology keys are PHRASE, LOOP, VOICE and the other plain identifiers; the timing keys are BAR, BEAT, TEMPO, STEP, POSITION, PHRASE, SECTION and REST.

The sixth workflow routes note or timbre changes in one PHRASE (фраза) to edit with an existing phraseId, voices containing only requested edits, and unchanged world/tempo/bars/meter/key copied from that target. Other phrases/voices remain unchanged. tempo is song-wide, so a scoped note edit retains it. Repeated sections reference shared phrases: do not promise to change just one occurrence of shared data without clarifying whether an independent variation is wanted.

Before publication the agent must ensure that the musical idea spans the requested duration. Long rests must be deliberate parts of the composition. This is an authoring requirement, not a new rejection threshold or automatic filler: no note is required in every bar and intentional silence is preserved.

## Required JSON structure

AGENT_GUIDE.md#required-json-structure leads with the single copy of symbolic authoring forms. capabilities.json.authoring.guide links to that section; requestSchema remains in capabilities.json. These forms are generated from requestSchema, with literal keys and ASCII-delimited typed slots (`<<slot>>`). Five request forms plus pitched/unpitched voice forms carry structure and leave musical values for original composition. Select the form for the task, fill slots with their stated JSON types, and validate the completed request. Edit/patch song targets use the existing phraseId as explained beside the forms. Exported guidance and corrective receipts describe required actions affirmatively; receiver checks and protocol ownership remain authoritative.

capabilities.json.requestSchema is the machine-readable canonical syntax (JSON Schema 2020-12). Its five exclusive branches cover probe, phrase replacement, song replacement, edit and patch; voices is never required for a song replacement. Schema references use local $defs; no runtime fetch, validator dependency or CDN is added. The existing receiver remains authoritative for task freshness, filename/companion identity, timbre origin and role compatibility, event kind/polyphony, phrase-specific bounds, unique note onsets, references and arranged length. A schema pass alone is not delivery or musical acceptance.

Common fields: format is exactly halo-score; mode selects the shape below. Optional requestId must equal the basename. Other unknown fields fail.

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

patches is a nonempty array of at most 15 objects, each with voices and, for a song, a required existing phraseId. For a single phrase omit phraseId. A target may appear once. Each voices maps role IDs to nonempty objects containing ONLY on/level/character/duration/space/delay/chorus. No notes, steps, sound, key, tempo, world or meter are permitted. Unmentioned data is cloned unchanged. Every entry validates before a single authoritative preview/apply; an invalid target/value rejects the entire request. One approval applies all entries under HALO freshness checks and Undo transaction. Approval rereads all submitted content; stale revisions or modified proposals cannot silently apply.

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

A fixed physical slot is not an instrument bank. Choose canonical sound IDs by compatibleRoles; catalog world identifies their preserved origin. affinityRoles are recommendations. Only instruments.json lists all 62 timbres, recommended/compatible roles and acoustic registers. canonicalId is unique within each world: the formerly ambiguous ambient hat entries are rain-hat (RAIN source bank) and moss-hat (MOSS source bank). The receiver maps them to original engine IDs/banks without changing synthesis or saved projects. Bare hat is not a current canonical ID. Never submit trackIndex, instrument or a role field inside Voice.

## Large scores and songs

Songs use replace with phrases and sections instead of root voices. A phrase has unique positive integer id, voices and optional bars/meter/key inherited from root. Sections reference existing phrase IDs; repeats 1..8 default 1, name intro/verse/verse2/chorus/bridge/outro/phrase defaults phrase, fade none/in/out defaults none. Root repeat defaults false. Limits: 15 phrases, 32 sections, 128 arranged bars, one world/tempo. Repeats share notes; new variations need independent IDs and musical events.

Optional companions are requests/ID--role.json containing a Voice; the reference contains only file with that exact basename. No subfolders, traversal, absolute paths, wrappers or cross-request references. Write/read companions first; root last. A shared companion deliberately shares that voice across phrases. Request and unique companions together are bounded to 512 KiB.

## Paths and delivery

Bind ROOT and the path variables once: STATE_PATH=ROOT/project-state.json; REQUEST_PATH=ROOT/requests/ID.json; RECEIPT_PATH=ROOT/responses/ID.result.json. Binding never authorizes editing: STATE_PATH and RECEIPT_PATH remain read-only to the agent. New unused IDs: 1..128 ASCII letters/digits separated by single hyphen/underscore; double hyphens are reserved for companions. No directory creation or fallback paths on denial. Each new user task uses one fresh ID for probe then music. Correct an unfinished error under its existing ID; never use a new ID to evade errors.

## Receipts and correction

Only matching real receipts count. Process applied/rejected first regardless of ok:false; report and stop. pending_approval means technically validated and waiting for the human: report diagnostics and invite approval, then stop. Do not wait for approval, create it or claim playback. A later user task reads newly applied live STATE. ready belongs only to the probe and permits proceeding to compose under the same ID.

On error/ok:false, read error/help/instructionForAgent, correct the same unfinished request at most twice and read the updated response. HALO tracks submission identity internally. Report conflicts and stop for the user; do not rewrite music to bypass them. Missing/stale receipt: at most 3 reads with built-in waits of 4–5 seconds; without a wait tool one immediate reread. Then unconfirmed and stop. No shell waits, servers, browsers or delegated polling. Resolve an earlier pending proposal before assuming it applied.

## Runtime score diagnostics

scoreAudit reports actual time, keys, per-role attacksPerBar and section timing. Counts describe starts, not sustain or quality; retained generated parts have unknown counts. PART_BAR_GAP includes missing absoluteStep ranges. More events in the first bar do not populate later bars. Warnings are advisory, permit intentional rests and never add notes. A structurally valid sparse score is not artistic completion.

## Refresh and validation

Reload HALO and choose Update Files to refresh all five context documents. Refresh snapshot exports current state/projection and forces fresh request/companion/receipt reads; it never rebases, edits or applies a request. Terminal applied/rejected IDs cannot replay; ready IDs accept music for the same task. Auto scans run only while the integration panel/page are visible; manual checks remain. Clear Requests requires confirmation and preserves browser music/localStorage.

No backend, runtime dependency, CDN or build step is introduced. Related: [engine registry](engine-capabilities.md), [agent API](agent-api-specification.md), [regression](file-bridge-regression.md), [validation](release-validation.md).
