/* HALO File Bridge for desktop Chrome/Edge via native File System Access API. Zero server, 100% static. */
(function(root){
  'use strict';
  const bridges = new WeakMap();

  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function generateCapabilities(caps){
    return {
      schemaVersion: 1,
      engine: 'NotBad Halo Music Constructor',
      version: caps.version || 2,
      transport: 'Desktop Chrome/Edge File System Access API (HALO File Bridge) and WebMCP Site Tools',
      limits: caps.limits,
      operations: [
        {
          op: 'track.patch',
          description: 'Update specific parameters, steps, and notes of a voice slot (0..7)',
          required: ['op', 'trackIndex', 'values'],
          optional: ['phraseId (required in multi-phrase compositions)'],
          allowedValues: caps.trackFields
        },
        {
          op: 'phrase.patch',
          description: 'Update phrase properties: bars, startStep, seed, key, liveLoop',
          required: ['op', 'values'],
          allowedValues: caps.phraseFields
        },
        {
          op: 'master.patch',
          description: 'Update master tempo (30..200 BPM), volume (0..100%), 3-band EQ (-9..9 dB) and stereo width (0..100%)',
          required: ['op', 'values'],
          allowedValues: caps.masterFields
        },
        {
          op: 'project.replace',
          description: 'Replace the entire single-phrase project snapshot',
          required: ['op', 'project']
        },
        {
          op: 'composition.replace',
          description: 'Replace the entire multi-phrase song structure',
          required: ['op', 'project']
        },
        {
          op: 'visual.patch',
          description: 'Update visual scene (ORBIT/BLOOM/CURRENT), motion (DRIFT/IN TIME/PHRASE), effects (CLASSIC/COSMIC/HYPER)',
          required: ['op', 'values']
        }
      ],
      trackFields: caps.trackFields,
      phraseFields: caps.phraseFields,
      masterFields: caps.masterFields,
      parameters: caps.parameters,
      visuals: caps.visuals,
      track09: caps.track09,
      composition: caps.composition
    };
  }

  function generateInstruments(caps){
    function findCompatible(catalog, worldName) {
      if (!catalog) return [];
      const res = [];
      for (const [slotKey, bank] of Object.entries(catalog)) {
        for (const s of (bank.sounds || [])) {
          res.push({
            world: worldName,
            instrument: slotKey,
            sound: s.id,
            name: s.name,
            compatibleRoles: s.playback?.compatibleRoles || [],
            affinityRoles: s.playback?.affinityRoles || [],
            noteRange: s.playback?.range || [24, 96]
          });
        }
      }
      return res;
    }

    const allSounds = [
      ...findCompatible(caps.catalog?.ambient, 'ambient'),
      ...findCompatible(caps.catalog?.reactor, 'reactor')
    ];

    const roles = (caps.roles || []).map((r, i) => ({
      trackIndex: i,
      slot: r.slot,
      role: r.id,
      name: r.label,
      description: r.description,
      policy: r.policy,
      noteRange: { minMidi: r.minMidi || 24, maxMidi: r.maxMidi || 96 },
      allowedBanks: ['ambient', 'reactor'],
      compatibleSounds: allSounds
        .filter(s => s.compatibleRoles.includes(r.id))
        .map(s => ({
          world: s.world,
          instrument: s.instrument,
          sound: s.sound,
          name: s.name,
          affinity: s.affinityRoles.includes(r.id),
          noteRange: { minMidi: s.noteRange[0], maxMidi: s.noteRange[1] }
        }))
    }));

    const parameterGlossary = {
      character: {
        range: [0, 100],
        musicalMeaning: {
          melodic_and_bells: 'Controls spectral brightness, overtone richness and chime brilliance (higher = brighter crystalline chime; lower = soft mellow fundamental)',
          bass_and_sub: 'Controls harmonic saturation, drive and warmth (higher = warm saturated growl; lower = pure sub fundamental pulse)',
          percussion_and_drums: 'Controls transient snap, click bite, and attack sharpness (higher = punchy attack; lower = soft thud)',
          pads_and_strings: 'Controls filter resonance and high-frequency presence'
        }
      },
      duration: {
        range: [0, 100],
        musicalMeaning: 'Voice envelope release / decay time (0 = short staccato or muted pluck, 100 = sustained ringing tails and ambient washes). Bounded by role acoustic policy.'
      },
      space: {
        range: [0, 100],
        musicalMeaning: 'Send level into shared 2.8s convolution reverb bus for depth, distance, and cosmic wash.'
      },
      delay: {
        range: [0, 100],
        musicalMeaning: 'Send level into BPM-synchronized stereo feedback delay.'
      },
      delayTime: {
        options: ['1/16', '1/8', '1/8d', '1/4'],
        musicalMeaning: 'Delay tap division. 1/8d provides dotted-eighth polyrhythmic groove; 1/16 gives tight slapback; 1/8 and 1/4 create spacious echoes.'
      },
      chorus: {
        range: [0, 100],
        musicalMeaning: 'Stereo chorus modulation send for shimmering pitch detuning and width expansion.'
      },
      level: {
        range: [0, 100],
        musicalMeaning: 'Individual voice gain level (0..100%).'
      },
      density: {
        range: [0, 100],
        musicalMeaning: 'Algorithmic note probability for procedural generation. Bypassed when exact=true.'
      }
    };

    return {
      schemaVersion: 1,
      description: 'HALO Voice and Instrument Registry. 8 simultaneous voices with assigned musical roles, compatible banks, note registers, and sonic parameter meanings.',
      tracks: roles,
      parameterGlossary,
      soundWorlds: {
        ambient: {
          description: '30 procedural synthesis patches designed for meditative, calming soundscapes.',
          catalog: caps.catalog?.ambient || {}
        },
        reactor: {
          description: '32 organic presets backed by 130 authentic CC0 acoustic/electric instrument recordings.',
          catalog: caps.catalog?.reactor || {}
        }
      }
    };
  }

  function generateMusicRules(caps){
    return {
      schemaVersion: 1,
      description: 'HALO Musical Rules, Transport, Time Signatures, Rhythmic Grid, and Harmony Guidelines.',
      timeSignature: '4/4',
      supportedTimeSignatures: ['4/4', '3/4'],
      timeSignatures: {
        '4/4': {
          meter: '4/4 Common Time',
          stepsPerBar: 16,
          phraseSteps: { 4: 64, 8: 128 },
          quarterNotes: [0, 4, 8, 12],
          eighthNotes: [0, 2, 4, 6, 8, 10, 12, 14],
          description: 'Standard quadruple meter with 4 quarter-note beats of 4 sixteenths each.'
        },
        '3/4': {
          meter: '3/4 Waltz / 6/8 Swing',
          stepsPerBar: 12,
          phraseSteps: { 4: 48, 8: 96 },
          waltz4Bars: {
            bars: 4,
            steps: 48,
            downbeats: [0, 4, 8],
            orchestration: 'Boom - Chak - Chak: kick & bass on downbeat (step 0), snare, keys & chords on afterbeats (steps 4 & 8)',
            feel: 'Graceful 3/4 waltz (ONE-two-three, ONE-two-three)',
            accents: { downbeat: { steps: [0], velocity: 0.88 }, afterbeats: { steps: [4, 8], velocity: 0.78 } }
          },
          swing8Bars: {
            bars: 8,
            steps: 96,
            compoundBeats: [0, 6],
            eighthNotes: [0, 2, 4, 6, 8, 10],
            orchestration: 'Hans Zimmer / compound pirate groove: two compound beats (steps 0 and 6), heavy backbeat on 6, rolling eighths, dactylic gallop riffs [0, 3, 4, 6, 9, 10]',
            feel: 'Compound 6/8 rocking pirate swing (ONE-two-three, TWO-two-three)',
            accents: { compoundBeat: { steps: [0], velocity: 0.90 }, compoundBackbeat: { steps: [6], velocity: 0.86 } }
          },
          description: '12 sixteenth steps per bar. In 4 bars, forms a 3/4 waltz; in 8 bars, forms a rocking 6/8 pirate swing.'
        }
      },
      tempo: { min: 30, max: 200, default: 72 },
      grid: {
        stepsPerBar: 16,
        stepDuration: '1 sixteenth note (1/16)',
        quarterNotes: [0, 4, 8, 12],
        eighthNotes: [0, 2, 4, 6, 8, 10, 12, 14],
        sixteenthNotes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        rests: 'A rest or pause is created simply by omitting the step index from the "steps" array.'
      },
      phraseLengths: {
        allowedBars: [4, 8],
        stepsIn4Bars: 64,
        stepsIn8Bars: 128,
        maxSongBars: 128
      },
      keysAndScales: {
        circleOfFifths: caps.harmony?.keys || [],
        scales: caps.harmony?.scales || {
          minor: [0, 2, 3, 5, 7, 8, 10],
          major: [0, 2, 4, 5, 7, 9, 11]
        }
      },
      compositionGuidelines: {
        generatorMode: 'Set "generator": 3 and "exact": true for deterministic manual note scheduling.',
        stepsAndNoteEvents: 'The "steps" array contains the integer step indices where notes trigger (0..bars*16-1). The "noteEvents" array contains objects "{ step: N, notes: [MIDI...] }". Every step with pitched notes must match an entry in "steps".',
        noteTranspose: 'Set "noteTranspose" to the key\'s offset (from harmony.keys[key].offset) so that noteEvents MIDI numbers are played as literal pitches.',
        rolePolyphonyConstraints: {
          bass: 'Mono: maximum 1 note per step (MIDI 24..60)',
          lead: 'Mono or duo: 1 to 2 notes per step (MIDI 48..96)',
          harmony: 'Polyphonic: up to 4 notes per step (MIDI 36..84)',
          arpeggio: 'Mono: 1 note per step, fast and short (MIDI 48..84)',
          pulse_and_percussion: 'Rhythmic: empty notes array "notes: []" triggers the percussive timbre'
        }
      },
      soundWorlds: {
        ambient: {
          vibe: 'Meditative, calming, ethereal, cosmic relaxation',
          engine: '100% procedural real-time Web Audio synthesis (pure sines, FM, soft filters, cosmic pink noise)',
          defaultTempo: 72,
          tempoRange: [60, 85],
          reverbSpace: 'Spacious 2.8s convolution reverb send (30..80%)',
          defaultVoices: ['GLASS (celestial bells)', 'TIDAL (soft atmosphere)', 'ROOT (sub frequencies)', 'EMBER (warm plucks)', 'RAIN (light rhythm)', 'VEIL (velvet strings)', 'MOSS (slow marimba)', 'AURA (environmental atmosphere)']
        },
        reactor: {
          vibe: 'Driving, energetic, organic rock & acoustic rhythm',
          engine: '32 organic presets backed by 130 authentic CC0 acoustic and electric instrument recordings',
          defaultTempo: 100,
          tempoRange: [90, 140],
          reverbSpace: 'Punchy, focused mix with moderate reverb (10..30%)',
          defaultVoices: ['BEAT (kick/snare punch)', 'BASS (overdriven rock bass)', 'KEYS (acoustic piano/Rhodes)', 'CHORD (palm-muted guitar)', 'RIFF (electric lead)', 'LEAD (synth lead/brass)', 'PERC (cymbals/percussion)', 'TEXTURE (ambient guitar wash/sub)']
        },
        switchingPolicy: 'Set "setup": "ambient" or "setup": "reactor" in project.replace or in every phrase of composition.replace. All phrases within a composition must share the same sound world. Instruments can be freely assigned from any bank to any track, but the overall acoustic environment and default styling are governed by setup.'
      },
      songFormAndComposition: {
        defaultMode: 'single_phrase',
        policy: 'HALO works with individual 4/8-bar phrases by default unless a full composition/song is explicitly requested ("song", "full composition", "arrangement").',
        limits: {
          maxPhrases: 15,
          maxSections: 32,
          maxBars: 128,
          repeatsPerSection: [1, 8]
        },
        canonicalForm: [
          { name: 'intro', description: 'Introduction: sparse texture, atmosphere, bells, no heavy bass, 1..2 repeats' },
          { name: 'verse', description: 'First Verse: groove enters, bassline establishes tonal center, 1..2 repeats' },
          { name: 'chorus', description: 'Chorus / Climax: all voices active, leading melodic hook, bright character, peak dynamic, 1..2 repeats' },
          { name: 'verse2', description: 'Second Verse: rhythmic variation or melodic development, 1..2 repeats' },
          { name: 'bridge', description: 'Bridge: harmonic or rhythmic contrast, altered density or filter, 1..2 repeats' },
          { name: 'outro', description: 'Outro / Coda: gradual dissolution, fade="out", tails ringing, 1..2 repeats' }
        ],
        phraseReusability: 'Reuse identical phrases across sections by referencing their phrase ID (e.g. verse 1 and verse 2 can share phrase 1, or chorus can repeat phrase 2). Independent variations require a new phrase ID with distinct track notes.'
      }
    };
  }

  function generateProjectState(state, context){
    return {
      schemaVersion: 1,
      revision: state.revision,
      exportedAt: new Date().toISOString(),
      project: state.project,
      visual: state.visual || null,
      music: context?.music || [],
      history: context?.history || { undo: 0, redo: 0 }
    };
  }

  function generateAgentGuide(caps, state){
    return `# HALO Agent Guide / AI Instruction Manual

HALO is a 100% static browser-based relaxation music constructor (8 voices, 16-step grid per bar for 4/4 or 12-step grid for 3/4).

## CRITICAL DIRECTIVE: Zero Localhost, Zero CLI, No Waiting

1. **NO LOCALHOST, NO WEBSERVERS, NO PORTS:**
   HALO runs 100% client-side in the user's browser. There is **NO backend server, NO local HTTP daemon, NO API port** (no port 3000, 3001, 8080, 5173, etc.).
   - **DO NOT** execute \`curl\`, \`fetch\`, \`netstat\`, or scan local ports.
   - **DO NOT** search for or ping \`http://localhost:3000\` or \`http://localhost:3001\`.
2. **NO CLI OR EXECUTABLES:**
   There is **NO command-line tool, NO executable binary, NO npm package** for HALO.
   - **DO NOT** run \`halo\`, \`halo.exe\`, \`where.exe halo\`, \`halo bridge run\`, \`npm\`, \`node\`, or \`python\` to run HALO or execute requests.
3. **NO BROWSER LAUNCHING:**
   - **DO NOT** launch Chrome, Edge, Playwright, Puppeteer, or attempt to open \`file://\` or \`localhost\` URLs. HALO is already open in the user's browser and connects to this folder via the native Web File System Access API.
4. **DO NOT WAIT, SLEEP, OR POLL FOR responses/:**
   - HALO uses strict **Human-in-the-Loop** confirmation. When a request is written to \`requests/\`, HALO displays a visual diff to the human user in the browser. The response in \`responses/\` is created **ONLY AFTER THE USER PHYSICALLY CLICKS "Approve"** in the web UI.
   - Because user approval takes human time, a response file will **NEVER** appear synchronously during the agent's turn.
   - If the user prompt says "check that response confirms application", understand this as an asynchronous instruction: write the request file, inform the user that it awaits their approval in HALO, and **TERMINATE YOUR TURN IMMEDIATELY**. Never loop or wait for the response file!

## Strict 3-Step Agent Workflow (No Deviations)

1. **Step 1: Read Context (Read-Only)**
   - Read \`project-state.json\` to get current \`revision\`, active voices, tempo, key, and meter.
   - Read \`instruments.json\` to select compatible voices, sound catalog IDs, role policies, and MIDI ranges.
   - Read \`music-rules.json\` to follow the rhythmic grid (4/4 or 3/4) and harmony.
   - Read \`capabilities.json\` for allowed operation types and limits.
2. **Step 2: Compose & Validate In-Memory**
   - Compose musical content tailored to the user's prompt.
   - Validate JSON envelope: \`requestId\`, \`schemaVersion: 1\`, \`baseRevision\` (matching current \`revision\` from \`project-state.json\`), and valid \`operations\`.
   - Ensure \`project.replace\` has exactly 8 tracks; sound IDs have no world prefixes; notes are within role MIDI boundaries.
3. **Step 3: Write File & FINISH**
   - Save the request JSON file to \`requests/<requestId>.json\`.
   - **STOP IMMEDIATELY AND END YOUR TURN.**
   - Output a clear message to the user: *"Request <requestId>.json has been generated and written to requests/. Please switch to your HALO browser tab and click 'Approve' to apply the changes."*

## Folder Structure

\`\`\`
HALO-Bridge/
├── AGENT_GUIDE.md        # This instruction manual
├── capabilities.json     # Engine capabilities, limits, supported operations
├── instruments.json      # 8 voices, presets, compatibility, parameter meanings
├── music-rules.json      # Rhythmic grid, meters, time signatures, harmony
├── project-state.json    # Current project state, note events, base revision
├── requests/             # Folder for incoming agent command batches (e.g. request-001.json)
└── responses/            # Folder for HALO execution results (e.g. request-001.result.json)
\`\`\`

## Agent Operational Rules

1. **project-state.json is Read-Only:**
   The agent reads current project state, active notes, and the base revision (\`revision\`). Never modify this file directly.
2. **All Changes Must Be Placed in requests/:**
   Create a new JSON file inside the \`requests/\` directory (e.g., \`requests/request-001.json\`).
3. **Mandatory Batch Envelope Fields:**
   Every command batch MUST include:
   - \`requestId\`: Unique string identifier (e.g., "request-001")
   - \`schemaVersion\`: 1
   - \`baseRevision\`: Integer matching the current \`revision\` from \`project-state.json\`
   - \`operations\`: Array of allowlisted operations (up to 256 operations)
4. **Allowlisted Operations:**
   Only the following operations are permitted:
   - \`track.patch\` — Modify parameters and note events for a single track (\`trackIndex\`: 0..7, \`values\`: { on, exact, steps, noteEvents, noteTranspose, level, density, character, duration, space, delay, delayTime, chorus, instrument, sound })
   - \`phrase.patch\` — Modify phrase settings (\`bars\`: 4|8, \`startStep\`, \`seed\`, \`key\`, \`liveLoop\`, \`timeSignature\`: "4/4"|"3/4")
   - \`master.patch\` — Master bus controls (\`tempo\`: 30..200, \`masterVolume\`: 0..100, \`mix\`: { low, mid, high, width })
   - \`project.replace\` — Full replacement of a single-phrase project (including sound world \`"setup": "ambient" | "reactor"\`)
   - \`composition.replace\` — Full replacement of a multi-phrase song/composition (up to 15 phrases)
   - \`visual.patch\` — Visual scene, motion, and effect modes (\`scene\`: ORBIT/BLOOM/CURRENT, \`motion\`: DRIFT/IN TIME/PHRASE, \`effects\`: CLASSIC/COSMIC/HYPER)
   No arbitrary scripts, remote URLs, shell commands, or unverified keys are allowed.
5. **Human-in-the-Loop Approval & Asynchronous Execution:**
   Commands in HALO are never applied secretly in the background: HALO reads the request, validates it against schemas, displays a visual diff/preview to the human user, and waits for user confirmation. The response in \`responses/\` is written only after user approval. The agent must NEVER wait or poll for this response during request generation.
6. **Execution Feedback in responses/:**
   HALO writes a response to \`responses/<requestId>.result.json\` only after human review in the web UI:
   - On success: \`{ "ok": true, "id": "request-001", "appliedRevision": 43, "timestamp": "..." }\`
   - On rejection or failure: \`{ "ok": false, "id": "request-001", "error": "...", "help": "...", "instructionForAgent": "...", "currentRevision": 42 }\`
7. **Idempotence & Revision Freshness:**
   Re-processing previously applied requests is disallowed. Stale revisions are rejected with \`CONFLICT_REVISION_MISMATCH\`.

## Anti-Looping Protocol & Error Handling

1. **Never Guess Parameters:**
   All property names, operations, valid ranges, and enum values are strictly specified in \`capabilities.json\`, \`instruments.json\`, and \`music-rules.json\`. Do not invent non-existent properties (such as guessing \`"composition"\` inside \`project.replace\` or wrapping operations in unapproved keys).
2. **Maximum 2 Retries:**
   If a command batch fails, carefully inspect \`"error"\`, \`"help"\`, and \`"instructionForAgent"\` in \`responses/<requestId>.result.json\`. If a revised attempt fails again, **STOP IMMEDIATELY**. Report the exact error text to the human user and ask for guidance instead of endlessly guessing parameters.
3. **Exactly 8 Tracks in project.replace:**
   The \`project.replace\` operation ALWAYS requires an array of exactly 8 track objects: \`[GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]\`. Do not provide a truncated 4-track array. To modify 1–4 specific instruments, use individual \`track.patch\` operations!
4. **Sound Identifiers Have No World Prefix:**
   Sound names must match the catalogs in \`instruments.json\` (e.g., \`"bell"\`, \`"sine"\`, \`"piano"\`, \`"shaker"\`). Do NOT prefix with world names like \`"ambient-bell"\`.
5. **Phrase vs Song Mode:**
   For prompts like "compose an 8-bar holiday jingle / pirate theme / ambient groove", operate on a single phrase using \`track.patch\` or \`project.replace\` (\`bars: 8\`). Do NOT create a \`composition.replace\` unless the user explicitly requested a complete multi-section song.
6. **No Terminal/Server/Browser Execution:**
   Never invoke curl, netstat, node, npm, python, halo CLI, or browser automation. Doing so indicates hallucination and will immediately cause execution failures.

## Composition Policy: Single Phrase vs Full Composition

- **DEFAULT MODE: SINGLE PHRASE:**
  Unless the user explicitly specifies a full multi-part song or arrangement (e.g. "compose a full song", "write a complete composition with intro and chorus"), the agent works **exclusively with the current phrase/loop** via \`track.patch\` or \`project.replace\`.
- **FULL COMPOSITION (Multi-section Song):**
  Created **ONLY** when the user explicitly requests: *"compose a song"*, *"write a complete composition"*, *"create a full arrangement with intro, verses, and chorus"*.
  In this scenario, use \`composition.replace\`.

### Song Form Canons:
1. **Intro (1..2 repeats):**
   Sparse texture. Atmospheric pads, celestial bells, gentle rain, or subtle pulse. No heavy bass or overdriven lead riffs. Establishes the key and acoustic breathing room.
2. **Verse (1..2 repeats):**
   Rhythmic groove and bassline enter. Establishes the primary harmonic progression and understated melodic motif.
3. **Chorus / Climax (1..2 repeats):**
   Peak energy and density. All primary voices active (lead, harmony, chord, bass, beat). Elevated brightness (\`character\`: 60..80) and level. Memorable melodic hook.
4. **Verse 2 (1..2 repeats):**
   Melodic or rhythmic variation upon Verse 1, counterpoint arpeggios or drum fills.
5. **Bridge (1..2 repeats):**
   Harmonic or rhythmic contrast: key modulation, altered density, filtered frequencies, or syncopated breakdown leading into the final chorus.
6. **Outro / Coda (1..2 repeats, fade: "out"):**
   Gradual instrumental dissolution, ringing reverb tails, gentle fade into silence.

### Composition Engine Limits:
- **MAXIMUM 15 UNIQUE PHRASES (\`phrases.length <= 15\`):**
  Strict engine safeguard. Batches exceeding 15 phrases are rejected.
- **Section Repeats (\`repeats: 1..8\`):**
  Reuse phrases by setting \`repeats\` in section objects (e.g., \`{ "phrase": 2, "name": "chorus", "repeats": 2 }\`), and reference the same phrase ID across multiple sections (e.g. verse 1 and verse 2 sharing phrase 2).
- **Total Song Duration:** Maximum 128 bars (\`MAX_BARS = 128\`).
- **Sections:** Up to 32 sections in the \`sections\` array.

## Sound Worlds: AMBIENT vs REACTOR

HALO features two distinct sonic worlds, selected by \`"setup": "ambient" | "reactor"\`:

### 1. AMBIENT (Meditative, Ethereal, Cosmic)
- **Synthesis:** 100% real-time procedural Web Audio synthesis (pure sines, FM, soft filters, cosmic pink noise).
- **Vibe:** Calm, contemplative, meditative, spacious, organic breathing.
- **Tempo:** 60..85 BPM (default 72 BPM).
- **Acoustic Space:** Deep 2.8s convolution reverb (\`space\`: 35..80%), stereo chorus, soft attack/decay envelopes.
- **8 Default Voices:**
  - 0: GLASS (celestial crystal bells, clean overtone spectrum)
  - 1: TIDAL (breathing soft atmospheric pads)
  - 2: ROOT (deep analog sub-bass foundation)
  - 3: EMBER (warm plucked harp/kalimba/piano timbres)
  - 4: RAIN (gentle rainfall texture, soft transient clicks)
  - 5: VEIL (velvet bowed strings and cello warmth)
  - 6: MOSS (slow wooden marimba, mellow tuned percussion)
  - 7: AURA (environmental background drone, cosmic wash)

### 2. REACTOR (Driving, Energetic, Organic Rock & Acoustic)
- **Samples:** 32 organic presets backed by 130 authentic CC0 acoustic/electric instrument recordings.
- **Vibe:** Punchy, energetic drive, acoustic presence, rhythmic momentum.
- **Tempo:** 90..140 BPM (default 100 BPM; for 6/8 pirate swing use 3/4 meter with 8 bars).
- **Acoustic Space:** Focused, punchy mix (\`space\`: 10..30%), rapid transients, tight stereo imaging.
- **8 Default Voices:**
  - 0: BEAT (punchy acoustic kick and snare backbeat)
  - 1: BASS (overdriven rock bass with tube warmth)
  - 2: KEYS (acoustic grand piano / vintage Rhodes)
  - 3: CHORD (palm-muted rhythm guitar)
  - 4: RIFF (distorted electric guitar lead)
  - 5: LEAD (analog synthesizer lead / warm brass)
  - 6: PERC (cymbals, tambourine, hi-hats, acoustic shaker)
  - 7: TEXTURE (ambient guitar feedback, electric sub wash)

### Sound World Rules:
- Instruments from \`instruments.json\` may be assigned to any track slot, but the default sound environment and sample engine are governed by \`"setup"\`.
- **Single World per Composition:** All phrases in a composition must share the same \`setup\` world (mixing AMBIENT and REACTOR within the same song is unsupported).

## Example Requests

### Example 1: Track Note & Parameter Modification (track.patch)
\`\`\`json
{
  "requestId": "request-001",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "track.patch",
      "trackIndex": 5,
      "values": {
        "exact": true,
        "steps": [0, 4, 8, 12],
        "noteEvents": [
          { "step": 0, "notes": [72] },
          { "step": 4, "notes": [76] },
          { "step": 8, "notes": [79] },
          { "step": 12, "notes": [84] }
        ],
        "character": 65,
        "space": 40
      }
    }
  ]
}
\`\`\`

### Example 2: Full Multi-section Composition (composition.replace)
\`\`\`json
{
  "requestId": "request-002",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "composition.replace",
      "project": {
        "format": "halo-composition",
        "version": 1,
        "tempo": 72,
        "masterVolume": 50,
        "mix": { "low": 0, "mid": 0, "high": 0, "width": 35 },
        "repeat": true,
        "phrases": [
          { "id": 1, "label": "Intro", "project": { /* full single-phrase project object */ } },
          { "id": 2, "label": "Verse", "project": { /* full single-phrase project object */ } },
          { "id": 3, "label": "Chorus", "project": { /* full single-phrase project object */ } },
          { "id": 4, "label": "Bridge", "project": { /* full single-phrase project object */ } },
          { "id": 5, "label": "Outro", "project": { /* full single-phrase project object */ } }
        ],
        "sections": [
          { "phrase": 1, "name": "intro", "repeats": 1, "fade": "none" },
          { "phrase": 2, "name": "verse", "repeats": 2, "fade": "none" },
          { "phrase": 3, "name": "chorus", "repeats": 2, "fade": "none" },
          { "phrase": 2, "name": "verse2", "repeats": 2, "fade": "none" },
          { "phrase": 4, "name": "bridge", "repeats": 1, "fade": "none" },
          { "phrase": 3, "name": "chorus", "repeats": 2, "fade": "none" },
          { "phrase": 5, "name": "outro", "repeats": 1, "fade": "out" }
        ]
      }
    }
  ]
}
\`\`\`
*(Note: \`composition.replace\` accepts payload under either \`"project"\` or \`"composition"\` key).*

### Example 3: Single-Phrase 8-Bar Project Replacement (project.replace)
*Important: for \`project.replace\`, the \`tracks\` array MUST contain exactly 8 track objects covering all voice slots [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]. To update fewer tracks, use \`track.patch\`.*
\`\`\`json
{
  "requestId": "request-003",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "project.replace",
      "project": {
        "format": "notbad-halo-project",
        "version": 1,
        "setup": "ambient",
        "bars": 8,
        "tempo": 76,
        "masterVolume": 58,
        "mix": { "low": 0, "mid": 0, "high": 0, "width": 35 },
        "seed": 1,
        "key": 0,
        "tracks": [
          { "name": "GLASS", "instrument": "GLASS", "generator": 3, "sound": "bell", "on": true, "exact": true, "steps": [0, 4, 8, 12], "level": 65, "density": 70, "character": 50, "duration": 50, "space": 40 },
          { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "pad", "on": true, "exact": true, "steps": [0, 8], "level": 60, "density": 60, "character": 50, "duration": 60, "space": 50 },
          { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "round", "on": true, "exact": true, "steps": [0, 4, 8, 12], "level": 60, "density": 60, "character": 50, "duration": 50, "space": 30 },
          { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "piano", "on": true, "exact": true, "steps": [2, 6, 10, 14], "level": 60, "density": 60, "character": 55, "duration": 50, "space": 35 },
          { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "shaker", "on": true, "exact": true, "steps": [0, 2, 4, 6, 8, 10, 12, 14], "level": 50, "density": 70, "character": 60, "duration": 40, "space": 25 },
          { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "bow", "on": true, "exact": true, "steps": [0, 8], "level": 60, "density": 60, "character": 50, "duration": 65, "space": 55 },
          { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "pluck", "on": true, "exact": true, "steps": [4, 12], "level": 55, "density": 50, "character": 50, "duration": 45, "space": 35 },
          { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "drone", "on": true, "exact": true, "steps": [0], "level": 55, "density": 50, "character": 40, "duration": 70, "space": 60 }
        ]
      }
    }
  ]
}
\`\`\`
`;
  }

  function getContextFiles(api){
    const caps = api.getCapabilities();
    const state = api.getProjectState();
    const context = api.getContext();
    return {
      'AGENT_GUIDE.md': generateAgentGuide(caps, state),
      'capabilities.json': JSON.stringify(generateCapabilities(caps), null, 2),
      'instruments.json': JSON.stringify(generateInstruments(caps), null, 2),
      'music-rules.json': JSON.stringify(generateMusicRules(caps), null, 2),
      'project-state.json': JSON.stringify(generateProjectState(state, context), null, 2)
    };
  }

  function parseAndValidateRequest(api, textContent, fallbackId){
    let parsed;
    try {
      parsed = typeof textContent === 'string' ? JSON.parse(textContent) : textContent;
    } catch(e) {
      return { ok: false, error: 'INVALID_JSON: ' + e.message, id: fallbackId };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'INVALID_REQUEST_OBJECT', id: fallbackId };
    }

    const transaction = parsed.transaction || parsed;
    const requestId = String(parsed.requestId || transaction.requestId || fallbackId);

    if (transaction.schemaVersion !== 1) {
      return { ok: false, error: 'INVALID_SCHEMA_VERSION: schemaVersion must be 1', id: requestId };
    }
    if (typeof transaction.baseRevision !== 'number') {
      return { ok: false, error: 'MISSING_BASE_REVISION: baseRevision number is required', id: requestId };
    }
    if (!Array.isArray(transaction.operations) || !transaction.operations.length) {
      return { ok: false, error: 'INVALID_OPERATIONS: operations must be a non-empty array', id: requestId };
    }

    const currentRevision = api.getProjectState().revision;
    if (transaction.baseRevision !== currentRevision) {
      return {
        ok: false,
        error: `CONFLICT_REVISION_MISMATCH: expected revision ${currentRevision}, request was based on ${transaction.baseRevision}`,
        id: requestId,
        currentRevision
      };
    }

    let preview;
    try {
      preview = api.previewOperations(transaction);
    } catch(err) {
      return { ok: false, error: err.message, id: requestId, currentRevision };
    }

    return {
      ok: true,
      id: requestId,
      transaction,
      preview,
      currentRevision
    };
  }

  function generateErrorGuidance(errorMessage, consecutiveCount = 1){
    let help = 'Review your request schema against capabilities.json, instruments.json and AGENT_GUIDE.md.';
    const msg = String(errorMessage || '');

    if (msg.includes('CONFLICT_REVISION_MISMATCH')) {
      help = 'Base revision is outdated. Read "revision" from project-state.json and set "baseRevision" in your request to match it.';
    } else if (msg.includes('INVALID_TRACKS_COUNT')) {
      help = 'operation "project.replace" requires all 8 tracks in the "tracks" array: [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]. If you only want to modify specific tracks, use one or more "track.patch" operations instead.';
    } else if (msg.includes('UNKNOWN_FIELD')) {
      help = 'An unexpected property was found. Consult capabilities.json and AGENT_GUIDE.md for allowed fields. Do not invent custom properties.';
    } else if (msg.includes('INVALID_SOUND')) {
      help = 'Sound ID not found. Sound names must match instruments.json exactly (e.g. "bell", "piano", "sine", "shaker" without world prefixes like "ambient-").';
    } else if (msg.includes('UNSUPPORTED_FORMAT')) {
      help = 'For single-phrase project, format must be "notbad-halo-project" or "halo-project". For multi-phrase songs, format must be "halo-composition".';
    } else if (msg.includes('INVALID_BARS')) {
      help = 'Phrase length must be either 4 or 8 bars.';
    } else if (msg.includes('UNSUPPORTED_SETUP')) {
      help = 'Setup must be either "ambient" (procedural synthesis) or "reactor" (CC0 acoustic/rock samples).';
    } else if (msg.includes('UNSUPPORTED_TIME_SIGNATURE')) {
      help = 'Time signature must be "4/4" or "3/4".';
    } else if (msg.includes('EXACT_REQUIRED')) {
      help = 'Generator 3 requires "exact": true when providing custom steps or noteEvents.';
    } else if (msg.includes('PHRASE_NOT_FOUND')) {
      help = 'The specified phraseId was not found in the composition phrases array.';
    } else if (msg.includes('MISSING_PAYLOAD')) {
      help = 'Provide the payload object ("project" or "composition") inside the operation.';
    } else if (msg.includes('REJECTED_BY_USER')) {
      help = 'The user reviewed the proposal preview in HALO and clicked "Reject". Ask the user for their preferred direction before proposing changes.';
    }

    let instructionForAgent;
    if (consecutiveCount >= 3) {
      instructionForAgent = `CRITICAL STOP DIRECTIVE: ${consecutiveCount} consecutive request failures detected. STOP YOUR RETRY LOOP IMMEDIATELY. Do not guess parameters or attempt brute-force trial and error. Stop and report the exact error to the user, and ask for clarification, or consult AGENT_GUIDE.md and instruments.json.`;
    } else {
      instructionForAgent = 'Review the error and help above. Do not guess parameters. Consult instruments.json and AGENT_GUIDE.md. Maximum 2 retry attempts allowed.';
    }

    return { help, instructionForAgent };
  }

  async function processRequest(api, textContent, fallbackId){
    const validated = parseAndValidateRequest(api, textContent, fallbackId);
    if (!validated.ok) {
      const guidance = generateErrorGuidance(validated.error, 1);
      return {
        ...validated,
        help: guidance.help,
        instructionForAgent: guidance.instructionForAgent
      };
    }

    try {
      api.setEnabled(true);
      const result = await api.applyOperations(validated.transaction);
      return {
        ok: true,
        id: validated.id,
        appliedRevision: result.revision,
        currentRevision: result.revision,
        project: result.project,
        timestamp: new Date().toISOString()
      };
    } catch(e) {
      const guidance = generateErrorGuidance(e.message, 1);
      return {
        ok: false,
        id: validated.id,
        error: e.message,
        help: guidance.help,
        instructionForAgent: guidance.instructionForAgent,
        currentRevision: api.getProjectState().revision
      };
    }
  }

  // --- Browser File System Access API integration ---

  async function writeFsFile(dirHandle, filename, textContent){
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(textContent);
    await writable.close();
  }

  async function readFsFile(fileHandle){
    const file = await fileHandle.getFile();
    return await file.text();
  }

  async function syncAllContext(dirHandle, api){
    const files = getContextFiles(api);
    for (const [name, content] of Object.entries(files)){
      await writeFsFile(dirHandle, name, content);
    }
  }

  async function syncStateOnly(dirHandle, api){
    const state = api.getProjectState();
    const context = api.getContext();
    const content = JSON.stringify(generateProjectState(state, context), null, 2);
    await writeFsFile(dirHandle, 'project-state.json', content);
  }

  // --- IndexedDB directory persistence across page reloads ---
  const IDB_NAME = 'halo-file-bridge-v1';
  const IDB_STORE = 'handles';
  const IDB_KEY = 'last-directory';

  function openIdb(win){
    return new Promise(resolve => {
      const idb = win?.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : root.indexedDB);
      if (!idb) return resolve(null);
      try {
        const req = idb.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function storeDirectoryHandle(handle, win){
    try {
      const db = await openIdb(win);
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ name: handle.name, handle, timestamp: Date.now() }, IDB_KEY);
      await new Promise(r => {
        tx.oncomplete = r;
        tx.onerror = r;
        setTimeout(r, 100);
      });
    } catch {}
  }

  async function retrieveStoredDirectory(win){
    try {
      const db = await openIdb(win);
      if (!db) return null;
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      return await new Promise(r => {
        req.onsuccess = () => r(req.result || null);
        req.onerror = () => r(null);
        setTimeout(() => r(null), 100);
      });
    } catch {
      return null;
    }
  }

  async function clearStoredDirectory(win){
    try {
      const db = await openIdb(win);
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      await new Promise(r => {
        tx.oncomplete = r;
        tx.onerror = r;
        setTimeout(r, 100);
      });
    } catch {}
  }

  function createBridge(api, env = {}){
    let dirHandle = null;
    let pollInterval = null;
    let consecutiveErrors = 0;
    const listeners = new Set();
    const processedIds = new Set();
    const win = env.window || root;

    const state = {
      connected: false,
      directoryName: '',
      savedDirectory: null, // { name: string, handle: FileSystemDirectoryHandle }
      lastSync: null,
      lastCheck: null,
      pending: null,
      lastResult: null,
      error: null,
      busy: false,
      autoApply: false,
      supported: typeof win?.showDirectoryPicker === 'function' || typeof root.showDirectoryPicker === 'function'
    };

    function notify(){
      for (const fn of listeners) {
        try { fn(clone(state)); } catch {}
      }
    }

    async function checkFolder(){
      if (!dirHandle || state.busy) return;
      state.busy = true;
      try {
        const reqDir = await dirHandle.getDirectoryHandle('requests', { create: true });
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });

        // Scan existing responses to populate processedIds
        for await (const [name, handle] of resDir.entries()){
          if (handle.kind === 'file' && name.endsWith('.result.json')){
            const id = name.replace(/\.result\.json$/i, '');
            processedIds.add(id);
          }
        }

        // If there's already a pending request awaiting user confirmation, don't pick another one yet
        if (state.pending) {
          state.lastCheck = new Date().toISOString();
          notify();
          return;
        }

        for await (const [name, handle] of reqDir.entries()){
          if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
          const baseId = name.replace(/\.json$/i, '');
          if (processedIds.has(baseId)) continue;

          const text = await readFsFile(handle);
          const parsed = parseAndValidateRequest(api, text, baseId);

          if (!parsed.ok) {
            consecutiveErrors++;
            const guidance = generateErrorGuidance(parsed.error, consecutiveErrors);
            const errRes = {
              ok: false,
              id: parsed.id,
              error: parsed.error,
              help: guidance.help,
              instructionForAgent: guidance.instructionForAgent,
              consecutiveErrors,
              currentRevision: parsed.currentRevision || api.getProjectState().revision,
              timestamp: new Date().toISOString()
            };
            await writeFsFile(resDir, `${parsed.id}.result.json`, JSON.stringify(errRes, null, 2));
            processedIds.add(baseId);
            state.lastResult = errRes;
            notify();
            continue;
          }

          // Rule 1: Never apply automatically by default
          if (!state.autoApply) {
            state.pending = {
              id: parsed.id,
              filename: name,
              transaction: parsed.transaction,
              preview: parsed.preview,
              baseId
            };
            notify();
            break; // Wait for user decision
          } else {
            api.setEnabled(true);
            const applied = await api.applyOperations(parsed.transaction);
            consecutiveErrors = 0;
            const okRes = {
              ok: true,
              id: parsed.id,
              appliedRevision: applied.revision,
              currentRevision: applied.revision,
              timestamp: new Date().toISOString()
            };
            await writeFsFile(resDir, `${parsed.id}.result.json`, JSON.stringify(okRes, null, 2));
            await syncStateOnly(dirHandle, api);
            processedIds.add(baseId);
            state.lastResult = okRes;
            notify();
          }
        }
        state.lastCheck = new Date().toISOString();
        state.error = null;
      } catch(err) {
        state.error = err.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function applyPending(){
      if (!state.pending || !dirHandle) return;
      const p = state.pending;
      state.busy = true;
      try {
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });
        api.setEnabled(true);
        const applied = await api.applyOperations(p.transaction);
        consecutiveErrors = 0;
        const okRes = {
          ok: true,
          id: p.id,
          appliedRevision: applied.revision,
          currentRevision: applied.revision,
          timestamp: new Date().toISOString()
        };
        await writeFsFile(resDir, `${p.id}.result.json`, JSON.stringify(okRes, null, 2));
        await syncStateOnly(dirHandle, api);
        processedIds.add(p.baseId);
        state.lastResult = okRes;
        state.pending = null;
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function rejectPending(){
      if (!state.pending || !dirHandle) return;
      const p = state.pending;
      state.busy = true;
      try {
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });
        consecutiveErrors++;
        const guidance = generateErrorGuidance('REJECTED_BY_USER', consecutiveErrors);
        const rejRes = {
          ok: false,
          id: p.id,
          error: 'REJECTED_BY_USER',
          help: guidance.help,
          instructionForAgent: guidance.instructionForAgent,
          consecutiveErrors,
          currentRevision: api.getProjectState().revision,
          timestamp: new Date().toISOString()
        };
        await writeFsFile(resDir, `${p.id}.result.json`, JSON.stringify(rejRes, null, 2));
        processedIds.add(p.baseId);
        state.lastResult = rejRes;
        state.pending = null;
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function connect(handle){
      dirHandle = handle;
      state.connected = true;
      state.directoryName = handle.name || 'HALO-Bridge';
      state.savedDirectory = null;
      state.error = null;
      state.busy = true;
      notify();
      try {
        await storeDirectoryHandle(handle, win);
        // Ensure subfolders
        await dirHandle.getDirectoryHandle('requests', { create: true });
        await dirHandle.getDirectoryHandle('responses', { create: true });
        // Sync context
        await syncAllContext(dirHandle, api);
        state.lastSync = new Date().toISOString();
        // Start polling
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(checkFolder, 1500);
        await checkFolder();
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function disconnect(){
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = null;
      dirHandle = null;
      state.connected = false;
      state.directoryName = '';
      state.savedDirectory = null;
      state.pending = null;
      await clearStoredDirectory(win);
      notify();
    }

    let restoringPromise = null;
    async function doRestore(){
      if (state.connected || dirHandle) return;
      const stored = await retrieveStoredDirectory(win);
      if (!stored || !stored.handle) return;
      const handle = stored.handle;
      try {
        if (typeof handle.queryPermission === 'function') {
          const perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            await connect(handle);
            return;
          }
        }
      } catch {}
      state.savedDirectory = { name: stored.name || handle.name || 'HALO-Bridge', handle };
      notify();
    }

    function tryRestore(){
      if (!restoringPromise) {
        restoringPromise = doRestore().finally(() => { restoringPromise = null; });
      }
      return restoringPromise;
    }

    async function forgetSavedDirectory(){
      state.savedDirectory = null;
      await clearStoredDirectory(win);
      notify();
    }

    tryRestore();

    async function syncFiles(){
      if (!dirHandle) return;
      state.busy = true;
      notify();
      try {
        await syncAllContext(dirHandle, api);
        state.lastSync = new Date().toISOString();
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function resetLocalChanges(lang = 'ru'){
      if (!dirHandle) return;
      state.busy = true;
      notify();
      try {
        try {
          const reqDir = await dirHandle.getDirectoryHandle('requests', { create: false });
          for await (const [name] of reqDir.entries()){
            try { await reqDir.removeEntry(name); } catch {}
          }
        } catch {}
        try {
          const resDir = await dirHandle.getDirectoryHandle('responses', { create: false });
          for await (const [name] of resDir.entries()){
            try { await resDir.removeEntry(name); } catch {}
          }
        } catch {}

        processedIds.clear();
        consecutiveErrors = 0;
        state.pending = null;
        state.lastResult = null;
        state.error = null;

        try {
          win?.localStorage?.removeItem?.('halo-pattern-v1');
          win?.localStorage?.removeItem?.('notbad-halo-autosave-v1');
          win?.localStorage?.removeItem?.('halo-composition-v1');
        } catch {}

        if (typeof api.resetProject === 'function') {
          await api.resetProject();
        }

        await syncAllContext(dirHandle, api);
        state.lastSync = new Date().toISOString();

        const isRu = lang === 'ru';
        if (typeof win?.toast === 'function') {
          win.toast(isRu ? 'Локальные изменения сброшены, проект возвращен к исходному состоянию' : 'Local changes cleared, project restored to default');
        }
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    return {
      connect,
      disconnect,
      resetLocalChanges,
      tryRestore,
      forgetSavedDirectory,
      syncFiles,
      checkFolder,
      applyPending,
      rejectPending,
      setAutoApply(v){ state.autoApply = !!v; notify(); },
      getStatus: () => clone(state),
      subscribe(fn){
        listeners.add(fn);
        fn(clone(state));
        return () => listeners.delete(fn);
      },
      dispose(){
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
        dirHandle = null;
        listeners.clear();
      }
    };
  }

  // --- UI Renderer ---

  function renderFileBridgePanel(host, api, language){
    const tr = (ru, en) => language() === 'ru' ? ru : en;
    const win = root.window || root;
    let bridge = bridges.get(api);
    if (!bridge) {
      bridge = createBridge(api, { window: root });
      bridges.set(api, bridge);
    }

    host.replaceChildren();

    function el(tag, text, css){
      const n = document.createElement(tag);
      if (text) n.textContent = text;
      if (css) n.style.cssText = css;
      host.append(n);
      return n;
    }

    el('strong', tr('HALO File Bridge — подключение через локальную папку', 'HALO File Bridge — Local Folder Connection'), 'display:block;font-size:12px;margin-bottom:6px;');

    el('p', tr(
      'Экспортирует технический паспорт музыкального движка и снимок текущей композиции в локальную папку HALO-Bridge. AI-агенты (Antigravity, Bionic, Codex, Claude) читают файлы, создают команды в requests/, а HALO валидирует их и ожидает вашего подтверждения перед применением.',
      'Exports the music engine technical passport and current composition snapshot into a local HALO-Bridge folder. AI agents (Antigravity, Bionic, Codex, Claude) read these files, write commands into requests/, and HALO validates them and awaits your confirmation before applying.'
    ), 'font-size:11px;color:#9bb2c2;margin-bottom:12px;');

    const statusBox = document.createElement('div');
    statusBox.style.cssText = 'background:rgba(12,24,42,.7);border:1px solid rgba(139,232,227,.2);border-radius:10px;padding:12px;margin-bottom:14px;';
    host.append(statusBox);

    const pendingBox = document.createElement('div');
    pendingBox.style.cssText = 'display:none;background:rgba(35,52,78,.9);border:1px solid #75dfd6;border-radius:10px;padding:12px;margin-bottom:14px;';
    host.append(pendingBox);

    function updateView(s){
      statusBox.replaceChildren();

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;';
      statusBox.append(topRow);

      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = 'font-size:11px;font-weight:550;letter-spacing:.05em;display:flex;align-items:center;gap:6px;';
      if (s.connected) {
        statusBadge.innerHTML = `<span style="color:#7ef0dc;">●</span> ${tr('Папка подключена:','Folder connected:')} <span style="color:#fff;">${s.directoryName}</span>`;
      } else if (s.savedDirectory) {
        statusBadge.innerHTML = `<span style="color:#f8c98f;">⏸</span> ${tr('Сохранённая папка:','Saved folder:')} <span style="color:#fff;">${s.savedDirectory.name}</span>`;
      } else {
        statusBadge.innerHTML = `<span style="color:#8ca2b3;">○</span> ${tr('Папка не подключена','Folder disconnected')}`;
      }
      topRow.append(statusBadge);

      const actionGroup = document.createElement('div');
      actionGroup.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
      topRow.append(actionGroup);

      if (!s.connected) {
        if (s.supported) {
          if (s.savedDirectory) {
            const btnReconnect = document.createElement('button');
            btnReconnect.className = 'glass-btn';
            btnReconnect.style.cssText = 'font-size:10px;padding:4px 14px;min-height:30px;background:rgba(35,80,110,.85);border-color:#75dfd6;color:#d8fff8;font-weight:600;cursor:pointer;';
            btnReconnect.textContent = tr(`🔓 Возобновить доступ к «${s.savedDirectory.name}»`, `🔓 Reconnect «${s.savedDirectory.name}»`);
            btnReconnect.title = tr('Подтвердить разрешение браузера и продолжить синхронизацию', 'Confirm browser permission and resume synchronization');
            btnReconnect.onclick = async () => {
              try {
                if (typeof s.savedDirectory.handle.requestPermission === 'function') {
                  const perm = await s.savedDirectory.handle.requestPermission({ mode: 'readwrite' });
                  if (perm === 'granted') {
                    await bridge.connect(s.savedDirectory.handle);
                    return;
                  } else {
                    alert(tr('Доступ к папке не был разрешен пользователем', 'Folder permission was not granted by the user'));
                    return;
                  }
                }
                await bridge.connect(s.savedDirectory.handle);
              } catch(e) {
                if (e.name !== 'AbortError') alert(e.message);
              }
            };

            const btnOther = document.createElement('button');
            btnOther.className = 'glass-btn';
            btnOther.style.cssText = 'font-size:10px;padding:4px 10px;min-height:30px;border-color:rgba(139,232,227,.4);color:#c4e6ed;cursor:pointer;';
            btnOther.textContent = tr('📁 Выбрать другую', '📁 Choose other');
            btnOther.onclick = async () => {
              try {
                const picker = root.showDirectoryPicker;
                if (typeof picker !== 'function') throw Error(tr('File System Access API недоступен в этом браузере', 'File System Access API is not supported in this browser'));
                const handle = await picker({ mode: 'readwrite' });
                await bridge.connect(handle);
              } catch(e) {
                if (e.name !== 'AbortError') alert(e.message);
              }
            };

            const btnForget = document.createElement('button');
            btnForget.className = 'glass-btn';
            btnForget.style.cssText = 'font-size:10px;padding:4px 8px;min-height:30px;background:rgba(70,25,25,.4);border-color:#f8a39a;color:#ffdada;cursor:pointer;';
            btnForget.textContent = tr('✕ Забыть', '✕ Forget');
            btnForget.title = tr('Очистить сохранённую папку', 'Clear saved folder');
            btnForget.onclick = () => bridge.forgetSavedDirectory();

            actionGroup.append(btnReconnect, btnOther, btnForget);
          } else {
            const btnConnect = document.createElement('button');
            btnConnect.className = 'glass-btn';
            btnConnect.style.cssText = 'font-size:10px;padding:4px 12px;min-height:30px;border-color:rgba(139,232,227,.4);';
            btnConnect.textContent = tr('📁 Подключить папку HALO-Bridge', '📁 Connect HALO-Bridge Folder');
            btnConnect.onclick = async () => {
              try {
                const picker = root.showDirectoryPicker;
                if (typeof picker !== 'function') throw Error(tr('File System Access API недоступен в этом браузере', 'File System Access API is not supported in this browser'));
                const handle = await picker({ mode: 'readwrite' });
                await bridge.connect(handle);
              } catch(e) {
                if (e.name !== 'AbortError') alert(e.message);
              }
            };
            actionGroup.append(btnConnect);
          }
        } else {
          const warn = document.createElement('span');
          warn.style.cssText = 'color:#f8b595;font-size:10px;';
          warn.textContent = tr('Требуется настольный Chrome или Edge с File System Access API.', 'Desktop Chrome or Edge with File System Access API required.');
          actionGroup.append(warn);
        }
      } else {
        const btnSync = document.createElement('button');
        btnSync.className = 'glass-btn';
        btnSync.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(20,44,70,.7);border-color:#75dfd6;color:#d8fff8;cursor:pointer;';
        btnSync.textContent = tr('⟳ Обновить файлы', '⟳ Sync Files');
        btnSync.title = tr('Перезаписать AGENT_GUIDE.md, capabilities.json, instruments.json, music-rules.json и project-state.json', 'Rewrite AGENT_GUIDE.md, capabilities.json, instruments.json, music-rules.json and project-state.json');
        btnSync.onclick = () => bridge.syncFiles();

        const btnCheck = document.createElement('button');
        btnCheck.className = 'glass-btn';
        btnCheck.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(20,44,70,.7);border-color:#75dfd6;color:#d8fff8;cursor:pointer;';
        btnCheck.textContent = tr('⯈ Проверить requests/', '⯈ Check requests/');
        btnCheck.onclick = () => bridge.checkFolder();

        const btnReset = document.createElement('button');
        btnReset.className = 'glass-btn';
        btnReset.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(80,35,35,.5);border-color:#f8a39a;color:#ffdada;cursor:pointer;';
        btnReset.textContent = tr('↺ Сбросить изменения', '↺ Reset Changes');
        btnReset.title = tr('Очистить requests/, responses/ и вернуть проект к исходному состоянию', 'Clear requests/, responses/ and restore clean default project');
        btnReset.onclick = async () => {
          const isRu = language() === 'ru';
          const confirmed = await (typeof win.HaloConfirm === 'function' ? win.HaloConfirm({
            title: isRu ? 'Сбросить локальные изменения?' : 'Reset Local Changes?',
            message: isRu
              ? 'Удалить все локальные изменения проекта и очистить папки requests/ и responses/? Проект вернётся к исходной версии с сервера, а команды агента будут сброшены.'
              : 'Discard all local project changes and clear requests/ and responses/ folders? The project will be restored to clean defaults, and agent commands will be reset.',
            confirmText: isRu ? 'Сбросить изменения' : 'Reset Changes',
            cancelText: isRu ? 'Отмена' : 'Cancel',
            danger: true
          }) : Promise.resolve(win.confirm ? win.confirm(isRu ? 'Сбросить локальные изменения?' : 'Reset Local Changes?') : true));
          if (confirmed) {
            await bridge.resetLocalChanges(language());
          }
        };

        const btnDisconnect = document.createElement('button');
        btnDisconnect.className = 'glass-btn';
        btnDisconnect.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(70,25,25,.55);border-color:#f8a39a;color:#ffdada;cursor:pointer;';
        btnDisconnect.textContent = tr('✕ Отключить', '✕ Disconnect');
        btnDisconnect.onclick = async () => {
          const isRu = language() === 'ru';
          const confirmed = await (typeof win.HaloConfirm === 'function' ? win.HaloConfirm({
            title: isRu ? 'Отключить папку?' : 'Disconnect Folder?',
            message: isRu
              ? `Отключить синхронизацию с папкой «${s.directoryName}»? Опрос команд агента будет остановлен.`
              : `Disconnect synchronization with folder «${s.directoryName}»? Polling for agent commands will be stopped.`,
            confirmText: isRu ? 'Отключить' : 'Disconnect',
            cancelText: isRu ? 'Отмена' : 'Cancel',
            danger: false
          }) : Promise.resolve(win.confirm ? win.confirm(isRu ? 'Отключить папку?' : 'Disconnect folder?') : true));
          if (confirmed) {
            await bridge.disconnect();
          }
        };

        actionGroup.append(btnSync, btnCheck, btnReset, btnDisconnect);
      }

      // Details info
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:#8ba2b3;line-height:1.5;';
      if (s.connected) {
        const hasError = (s.lastResult && !s.lastResult.ok) || !!s.error;
        meta.innerHTML = `
          <div>${tr('Ревизия проекта:','Project revision:')} <strong>${api.getProjectState().revision}</strong> · ${tr('Опрос requests/ каждые 1.5с: активен','Polling requests/ every 1.5s: active')}</div>
          ${s.lastSync ? `<div>${tr('Последний экспорт паспорта:','Last passport sync:')} ${new Date(s.lastSync).toLocaleTimeString()}</div>` : ''}
          ${s.lastResult ? `<div style="margin-top:4px;color:${s.lastResult.ok ? '#8fe5d2' : '#f8a39a'};">${s.lastResult.ok ? '✓ ' + tr('Команда успешно обработана: ','Command applied: ') + s.lastResult.id : '⚠ ' + tr('Ошибка команды ','Command error ') + s.lastResult.id + ': ' + s.lastResult.error}</div>` : ''}
          ${s.error ? `<div style="color:#f89a9a;margin-top:4px;">⚠ ${s.error}</div>` : ''}
        `;
        if (hasError) {
          const errSuggest = document.createElement('div');
          errSuggest.style.cssText = 'margin-top:8px;padding:8px 10px;background:rgba(230,80,60,.12);border:1px solid rgba(248,163,154,.35);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;';
          const errText = document.createElement('span');
          errText.style.cssText = 'font-size:10px;color:#ffd8d4;line-height:1.4;flex:1;min-width:200px;';
          errText.textContent = tr('Если ошибка не уходит, сбросьте локальные изменения и попросите нейросеть повторить запрос.', 'If the error persists, reset local changes and ask the AI agent to repeat the request.');
          const errBtn = document.createElement('button');
          errBtn.className = 'glass-btn';
          errBtn.style.cssText = 'font-size:10px;padding:3px 10px;min-height:26px;background:rgba(180,60,50,.4);border-color:#f8a39a;color:#ffdada;cursor:pointer;white-space:nowrap;';
          errBtn.textContent = tr('↺ Сбросить локальные изменения', '↺ Reset Local Changes');
          errBtn.onclick = async () => {
            const isRu = language() === 'ru';
            const confirmed = await (typeof win.HaloConfirm === 'function' ? win.HaloConfirm({
              title: isRu ? 'Сбросить локальные изменения?' : 'Reset Local Changes?',
              message: isRu
                ? 'Удалить все локальные изменения проекта и очистить папки requests/ и responses/? Проект вернётся к исходной версии с сервера, а команды агента будут сброшены.'
                : 'Discard all local project changes and clear requests/ and responses/ folders? The project will be restored to clean defaults, and agent commands will be reset.',
              confirmText: isRu ? 'Сбросить изменения' : 'Reset Changes',
              cancelText: isRu ? 'Отмена' : 'Cancel',
              danger: true
            }) : Promise.resolve(win.confirm ? win.confirm(isRu ? 'Сбросить локальные изменения?' : 'Reset Local Changes?') : true));
            if (confirmed) {
              await bridge.resetLocalChanges(language());
            }
          };
          errSuggest.append(errText, errBtn);
          meta.append(errSuggest);
        }
      } else if (s.savedDirectory) {
        meta.textContent = tr(
          `Папка «${s.savedDirectory.name}» сохранена. Нажмите «Возобновить доступ», чтобы восстановить синхронизацию без повторного выбора папки.`,
          `Folder «${s.savedDirectory.name}» is saved. Click "Reconnect" to resume synchronization without picking the folder again.`
        );
      } else {
        meta.textContent = tr(
          'Создайте на диске папку HALO-Bridge (или temp) и нажмите кнопку подключения. HALO создаст технический паспорт движка и папки requests/ и responses/.',
          'Create a HALO-Bridge (or temp) folder on your disk and press connect. HALO will generate the engine passport and the requests/ and responses/ subdirectories.'
        );
      }
      statusBox.append(meta);

      // Pending Request Banner
      if (s.pending) {
        pendingBox.style.display = 'block';
        pendingBox.replaceChildren();

        const pHead = document.createElement('div');
        pHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
        pHead.innerHTML = `<strong style="color:#d8ffff;font-size:11px;">🔔 ${tr('Входящий запрос от агента:','Incoming agent request:')} <span style="color:#7ef0dc;">${s.pending.id}</span></strong><span style="font-size:10px;color:#a2bacb;">Base rev: ${s.pending.transaction.baseRevision}</span>`;
        pendingBox.append(pHead);

        const pOps = document.createElement('ul');
        pOps.style.cssText = 'margin:6px 0 10px 18px;padding:0;font-size:10px;color:#cbe2ee;';
        for (const o of (s.pending.transaction.operations || [])){
          const li = document.createElement('li');
          if (o.op === 'track.patch') {
            li.textContent = `track.patch: Track 0${(o.trackIndex||0)+1} (${Object.keys(o.values||{}).join(', ')})`;
          } else if (o.op === 'master.patch') {
            li.textContent = `master.patch: ${Object.keys(o.values||{}).join(', ')}`;
          } else if (o.op === 'phrase.patch') {
            li.textContent = `phrase.patch: ${Object.keys(o.values||{}).join(', ')}`;
          } else {
            li.textContent = `${o.op}`;
          }
          pOps.append(li);
        }
        pendingBox.append(pOps);

        const pButtons = document.createElement('div');
        pButtons.style.cssText = 'display:flex;gap:8px;';

        const btnApply = document.createElement('button');
        btnApply.className = 'glass-btn';
        btnApply.style.cssText = 'font-size:10px;padding:4px 14px;background:rgba(42,120,105,.6);border-color:#7df0dc;color:#fff;font-weight:600;';
        btnApply.textContent = tr('✓ Применить изменения', '✓ Apply Changes');
        btnApply.onclick = () => bridge.applyPending();

        const btnReject = document.createElement('button');
        btnReject.className = 'glass-btn';
        btnReject.style.cssText = 'font-size:10px;padding:4px 12px;background:rgba(100,40,40,.5);border-color:#f8a39a;color:#fdd;';
        btnReject.textContent = tr('✕ Отклонить', '✕ Reject');
        btnReject.onclick = () => bridge.rejectPending();

        pButtons.append(btnApply, btnReject);
        pendingBox.append(pButtons);
      } else {
        pendingBox.style.display = 'none';
        pendingBox.replaceChildren();
      }
    }

    const unsub = bridge.subscribe(updateView);
    host._haloCleanup = () => { unsub(); };

    // Structure info
    const guideHead = el('strong', tr('Структура папки HALO-Bridge', 'HALO-Bridge Folder Structure'), 'display:block;font-size:11px;margin-top:14px;margin-bottom:6px;');
    const list = el('ul', '', 'font-size:10px;line-height:1.6;color:#a8c0cf;margin:0 0 12px 18px;padding:0;');
    list.innerHTML = `
      <li><code>AGENT_GUIDE.md</code> — ${tr('Инструкция агенту: правила создания музыки и форматы команд','Agent instructions: music creation rules and request schema')}</li>
      <li><code>capabilities.json</code> — ${tr('Паспорт движка: операции, параметры, FX, мастер, лимиты','Engine passport: operations, parameters, FX, master, limits')}</li>
      <li><code>instruments.json</code> — ${tr('8 голосов, пресеты, совместимость и звуковой смысл каждого параметра','8 voices, presets, compatibility, and sonic meaning of each parameter')}</li>
      <li><code>music-rules.json</code> — ${tr('Сетка 16 шагов 4/4, 24 тональности квинтового круга, гаммы, полифония','16-step 4/4 grid, 24 Circle of Fifths keys, scales, polyphony')}</li>
      <li><code>project-state.json</code> — ${tr('Снимок текущей композиции (ревизия, ноты, фразы) — только для чтения','Snapshot of active composition (revision, notes, phrases) — read-only')}</li>
      <li><code>requests/</code> — ${tr('Папка входящих команд агента (например, request-001.json)','Incoming agent command folder (e.g. request-001.json)')}</li>
      <li><code>responses/</code> — ${tr('Папка ответов HALO (например, request-001.result.json)','HALO response folder (e.g. request-001.result.json)')}</li>
    `;

    el('strong', tr('Пример запроса для агента (Bionic / Antigravity / Codex):', 'Example prompt for agent (Bionic / Antigravity / Codex):'), 'display:block;font-size:11px;margin-bottom:4px;');
    const promptBox = el('div', tr(
      '«Прочитай AGENT_GUIDE.md в папке HALO-Bridge. Изучи возможности HALO и текущий проект в project-state.json. Сочини оригинальный новогодний джингл на 8 тактов, используя только встроенные инструменты. Запиши команду в папку requests/ и проверь, что ответ в responses/ подтвердил применение».',
      '“Read AGENT_GUIDE.md in the HALO-Bridge folder. Study HALO capabilities and the current project in project-state.json. Compose an original eight-bar New Year jingle using only built-in sounds. Write your request file to the requests/ folder and verify the response in responses/ confirms application.”'
    ), 'font-size:10px;line-height:1.5;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px;color:#d5ebf5;user-select:all;');
  }

  const api = {
    generateCapabilities,
    generateInstruments,
    generateMusicRules,
    generateProjectState,
    generateAgentGuide,
    getContextFiles,
    parseAndValidateRequest,
    processRequest,
    createBridge,
    panel: renderFileBridgePanel
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloFileBridge = api;
})(globalThis);
