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
      references: {
        agentGuide: 'AGENT_GUIDE.md (Workflow, rules, compact request directives, batch examples)',
        instruments: 'instruments.json (8 voices, sound catalogs by setup, note registers, role policies)',
        musicRules: 'music-rules.json (Rhythmic grids 4/4 and 3/4, Circle of Fifths keys, scales, polyphony)',
        projectState: 'project-state.json (Read-only live state snapshot, base revision, active voices)'
      },
      fieldAccess: {
        trackPatch: {
          mutableValues: caps.trackFields,
          readOnlyProhibited: ['role', 'name', 'slot', 'trackIndex'],
          rule: 'Track roles and names are permanent slot identifiers fixed by trackIndex 0..7. Never include role or name inside track.patch.values.'
        },
        projectPatch: {
          mutableValues: ['tempo', 'masterVolume', 'bars', 'startStep', 'key', 'seed', 'setup', 'world', 'soundWorld', 'timeSignature', 'mix', 'liveLoop'],
          readOnlyProhibited: ['revision', 'format', 'version', 'tracks', 'phrases', 'sections']
        }
      },
      modularRequests: {
        supported: true,
        bundleFolders: 'requests/<requestId>/manifest.json (or request.json) resolves relative files within folder',
        companionFiles: 'requests/<requestId>-<part>.json referenced via "file" or "include"',
        partsArray: 'transaction.parts: ["part1.json", "part2.json"] resolves and concatenates into operations',
        trackFileInclude: 'In track.patch: { "op": "track.patch", "trackIndex": i, "file": "t.json" } or project.replace tracks[i]: { "file": "t.json" }'
      },
      limits: caps.limits,
      operations: [
        {
          op: 'track.patch',
          description: 'Update specific mutable parameters, steps, and notes of a voice slot (0..7). Do NOT include role or name in values.',
          required: ['op', 'trackIndex'],
          optional: ['values (object)', 'file (relative path to companion track JSON)', 'include', 'phraseId (required in multi-phrase compositions)'],
          allowedValues: caps.trackFields,
          readOnlyProhibited: ['role', 'name', 'slot', 'trackIndex'],
          rule: 'role and name are immutable properties of track slots 0..7. Passing role or name inside values throws UNKNOWN_FIELD. When supplying custom steps or noteEvents, HALO automatically sets exact=true if omitted.'
        },
        {
          op: 'phrase.patch',
          description: 'Update phrase properties: bars, startStep, seed, key, liveLoop, timeSignature',
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
          op: 'project.patch',
          description: 'Update project-level settings (tempo, masterVolume, bars, key, seed, setup/world, timeSignature, mix, liveLoop) without replacing all tracks',
          required: ['op'],
          optional: ['values (object)', 'file (relative path to companion JSON)', 'include'],
          allowedValues: ['tempo', 'masterVolume', 'bars', 'startStep', 'key', 'seed', 'setup', 'world', 'soundWorld', 'timeSignature', 'mix', 'liveLoop'],
          readOnlyProhibited: ['revision', 'format', 'version', 'tracks', 'phrases', 'sections']
        },
        {
          op: 'project.replace',
          description: 'Replace the entire single-phrase project snapshot (must contain exactly 8 track objects covering slots 0..7). Supports modular track files via tracks[i].file or operation-level file.',
          required: ['op'],
          optional: ['project (object)', 'file (relative path to companion project JSON)', 'include']
        },
        {
          op: 'composition.replace',
          description: 'Replace the entire multi-phrase song structure (up to 15 unique phrases, up to 32 sections). Supports modular phrase/track files.',
          required: ['op'],
          optional: ['project (object)', 'file (relative path to companion composition JSON)', 'include']
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
          const canonicalId = s.id.startsWith(worldName + '-') ? s.id.slice(worldName.length + 1) : s.id;
          res.push({
            world: worldName,
            setups: s.setups || [worldName],
            instrument: slotKey,
            sound: s.id,
            canonicalId,
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

    const roles = (caps.roles || []).map((r, i) => {
      const compatible = allSounds.filter(s => s.compatibleRoles.includes(r.id));
      const soundsBySetup = {
        ambient: compatible.filter(s => (s.setups || [s.world]).includes('ambient')).map(s => ({
          instrument: s.instrument,
          sound: s.sound,
          canonicalId: s.canonicalId,
          name: s.name,
          affinity: s.affinityRoles.includes(r.id),
          noteRange: { minMidi: s.noteRange[0], maxMidi: s.noteRange[1] }
        })),
        reactor: compatible.filter(s => (s.setups || [s.world]).includes('reactor')).map(s => ({
          instrument: s.instrument,
          sound: s.sound,
          canonicalId: s.canonicalId,
          name: s.name,
          affinity: s.affinityRoles.includes(r.id),
          noteRange: { minMidi: s.noteRange[0], maxMidi: s.noteRange[1] }
        }))
      };
      return {
        trackIndex: i,
        slot: r.slot,
        role: r.id,
        name: r.label,
        description: r.description,
        policy: r.policy,
        noteRange: { minMidi: r.minMidi || 24, maxMidi: r.maxMidi || 96 },
        allowedBanks: ['ambient', 'reactor'],
        trackPatchRule: `Use { op: 'track.patch', trackIndex: ${i}, values: { ... } }. NEVER include 'role' or 'name' in values.`,
        soundsBySetup,
        compatibleSounds: compatible.map(s => ({
          world: s.world,
          setups: s.setups || [s.world],
          instrument: s.instrument,
          sound: s.sound,
          canonicalId: s.canonicalId,
          name: s.name,
          affinity: s.affinityRoles.includes(r.id),
          noteRange: { minMidi: s.noteRange[0], maxMidi: s.noteRange[1] }
        }))
      };
    });

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
      references: {
        agentGuide: 'AGENT_GUIDE.md (Workflow, rules, compact request directives, batch examples)',
        capabilities: 'capabilities.json (Engine limits, operations allowlist, mutable vs read-only schema)',
        musicRules: 'music-rules.json (Rhythmic grids 4/4 and 3/4, Circle of Fifths keys, scales, polyphony)',
        projectState: 'project-state.json (Read-only live state snapshot, base revision, active voices)'
      },
      trackPatchRules: {
        usage: "Target a track using { op: 'track.patch', trackIndex: 0..7, values: { ... } }.",
        mutableFields: caps.trackFields,
        readOnlyProhibitedFields: ['role', 'name', 'slot', 'trackIndex'],
        warning: "CRITICAL: Do NOT include 'role' or 'name' inside track.patch.values. They are immutable slot identifiers. Passing them will fail with UNKNOWN_FIELD. When supplying custom steps or noteEvents, HALO automatically sets exact=true if omitted."
      },
      vibeAndSetupPolicy: {
        description: 'HALO soundscapes and motifs are strictly vibe-dependent. All 8 tracks must use sounds from the active project setup (world). In project.replace, specify "setup": "ambient" or "setup": "reactor" (or "world": "ambient"/"reactor").',
        ambient: {
          vibe: 'Atmospheric, meditative, calm soundscape using procedural synthesis.',
          instruments: 'Bells, vibes, crystals, warm pads, sub-bass, organic wood clicks, nature noise (no acoustic drum kits or rock guitars).',
          motifs: 'Contemplative, fluid, ambient motifs.'
        },
        reactor: {
          vibe: 'Driving, energetic acoustic and rock rhythm using 130 local CC0 recordings.',
          instruments: 'Punchy kicks, crack/steel snares, hats, toms, electric bass, palm-muted and power guitars, piano, analog synth.',
          motifs: 'Driving eighths, half-time, rock riffs, melodic hooks.'
        },
        rule: 'To use REACTOR acoustic drums or rock guitars, set "setup": "reactor" in project.replace. In AMBIENT setup ("setup": "ambient"), only AMBIENT procedural sounds are available. A sound may belong to multiple setups if listed in its "setups" array.'
      },
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
      references: {
        agentGuide: 'AGENT_GUIDE.md (Workflow, rules, compact request directives, batch examples)',
        capabilities: 'capabilities.json (Engine limits, operations allowlist, mutable vs read-only schema)',
        instruments: 'instruments.json (8 voices, sound catalogs by setup, note registers, role policies)',
        projectState: 'project-state.json (Read-only live state snapshot, base revision, active voices)'
      },
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
        rests: 'A rest or pause is created simply by omitting the step index from the "steps" array.',
        fullPhraseCoverageWarning: 'CRITICAL: In an 8-bar loop in 4/4 (128 steps) or 3/4 (96 steps), you must write steps and noteEvents across ALL bars (e.g. Bar 1: 0..15, Bar 2: 16..31, ... Bar 8: 112..127). Writing steps only within 0..15 leaves bars 2 through 8 completely silent!'
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
        fullPhraseCoverageRule: 'When composing a melody, chords, or bassline for an 8-bar loop, distribute notes across the entire duration (0..127 in 4/4; 0..95 in 3/4). Do NOT stop at step 15!',
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
      notice: 'READ-ONLY LIVE SNAPSHOT. Do not edit this file directly. Submit change requests to requests/<requestId>.json.',
      references: {
        agentGuide: 'AGENT_GUIDE.md (Workflow, rules, compact request directives, batch examples)',
        capabilities: 'capabilities.json (Engine limits, operations allowlist, mutable vs read-only schema)',
        instruments: 'instruments.json (8 voices, sound catalogs by setup, note registers, role policies)',
        musicRules: 'music-rules.json (Rhythmic grids 4/4 and 3/4, Circle of Fifths keys, scales, polyphony)'
      },
      fieldAccess: {
        readOnlyFields: ['revision', 'schemaVersion', 'exportedAt', 'music', 'history', 'track.name', 'track.role'],
        trackPatchMutableValues: ['instrument', 'sound', 'generator', 'on', 'steps', 'exact', 'sequence', 'noteEvents', 'noteTranspose', 'level', 'density', 'character', 'duration', 'space', 'delay', 'delayTime', 'chorus'],
        warning: "CRITICAL: 'role' and 'name' are read-only slot identifiers. NEVER include 'role' or 'name' inside track.patch.values!"
      },
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

## MANDATORY TOKEN BUDGET & COMPACT BATCH DIRECTIVE (CRITICAL FOR TOOL HARNESSES)

⚠️ **KEEP YOUR REQUEST JSON UNDER 1.5 KB!**
When external LLM harnesses (Cursor, Claude Code, LiteLLM, OpenAI functions) invoke tools like \`write_file\`, the entire file payload is encoded as a string parameter inside a single-line JSON tool call.
If you generate a massive 3 KB+ JSON file or thousands of characters of formatted arrays, the tool call buffer will be cut off mid-stream, throwing the fatal error:
\`Error: Unterminated string in JSON at position ...\`

**HOW TO COMPOSE SAFELY & COMPACTLY (< 1.5 KB):**
1. **Never generate monolithic 8-track \`project.replace\` for loops or jingles!**
2. Use \`project.patch\` for global parameters (\`tempo\`, \`bars\`, \`key\`).
3. Use targeted \`track.patch\` operations ONLY on 1 or 2 tracks (e.g. Lead Melody on Track 5 and Bassline on Track 4).
4. Leave other voices unpatched! In HALO, all 8 voices are active and harmonious by default. Unpatched voices automatically play their role-specific patterns.
5. Format \`noteEvents\` compactly: place step and notes concisely (e.g. \`{ "step": 0, "notes": [64] }, { "step": 4, "notes": [64] }\`).

## ZERO-PROMPT-ENGINEERING CREATIVE DIRECTIVE (Mandatory)

The human user will provide ONLY a high-level creative prompt (such as "napishi novogodniy loop-jingle" / "write an 8-bar holiday jingle", or "sochini kompozitsiyu po motivam OST piraty karibskogo morya" / "compose a composition inspired by Pirates of the Caribbean OST").
The user will NEVER provide technical JSON schemas, parameter names, step indices, or MIDI note values.

**YOUR ROLE AS THE AGENT:**
You must autonomously translate the user's creative prompt into the appropriate HALO mode, sound world setup, time signature, key, structure, and explicit notes spanning the entire duration of the piece!

### Quick Prompt-to-Architecture Decision Matrix

| User Prompt Intent | Mode & Target Op | Sound World (\`setup\`) | Meter (\`timeSignature\`) | Bars | Key | Voices & Orchestration |
| --- | --- | --- | --- | --- | --- | --- |
| **Holiday / New Year Loop** (e.g. "napishi novogodniy loop-jingle", "holiday bells loop", "celebratory jingle") | Single Phrase (\`project.patch\` + \`track.patch\`) | \`"ambient"\` | \`"4/4"\` (16 steps/bar) | \`8\` (128 steps total) | C Major (\`key: 0\`) | Crystal bells melody on VEIL/GLASS across all 8 bars, festive sleigh-bell shaker on RAIN, warm sub-bass on ROOT, rich pad chords on AURA |
| **Cinematic Soundtrack / Epic Adventure** (e.g. "sochini kompozitsiyu po motivam OST piraty karibskogo morya", "pirate battle theme", "epic orchestral rock") | Multi-section Composition (\`composition.replace\`) | \`"reactor"\` | \`"3/4"\` (8 bars = 96 steps of 6/8 pirate swing) | \`8\` per phrase | D Minor (\`key: 14\`) | 4 phrases (Intro, Verse, Chorus, Outro) arranged into 6 sections; punchy rock drums, galloping bass, distorted electric guitar lead, acoustic piano chords |
| **Meditative Ambient Soundscape** (e.g. "calm cosmic ambient", "deep sleep meditation", "relaxing space") | Single Phrase (\`project.patch\` + \`track.patch\`) | \`"ambient"\` | \`"4/4"\` | \`4\` or \`8\` | A Minor (\`key: 2\`) or F Major (\`key: 1\`) | Generative plucks on EMBER, soft bowed cello on VEIL, wide reverb (\`space: 60..80\`), slow attack |
| **Driving Rock Groove** (e.g. "driving rock riff", "energetic drum and bass") | Single Phrase (\`project.patch\` + \`track.patch\`) | \`"reactor"\` | \`"4/4"\` | \`4\` or \`8\` | E Minor (\`key: 8\`) | Punchy kick/snare on BEAT, overdriven bass on BASS, power chord riff on RIFF |

---

## THE FULL-SPAN DURATION PRINCIPLE (MANDATORY MUSICAL INTEGRITY)

A common and critical failure mode of AI music composers is writing notes ONLY for the first bar (steps 0..15) and leaving the rest of the phrase completely dead and silent!

**Step Boundaries by Time Signature and Bar Length:**
- **In 4/4 meter (16 steps per bar):**
  - **4-Bar phrase = 64 steps total:** Bar 1: \`0..15\`, Bar 2: \`16..31\`, Bar 3: \`32..47\`, Bar 4: \`48..63\`.
  - **8-Bar phrase = 128 steps total:**
    - Bar 1: \`0..15\`
    - Bar 2: \`16..31\`
    - Bar 3: \`32..47\`
    - Bar 4: \`48..63\`
    - Bar 5: \`64..79\`
    - Bar 6: \`80..95\`
    - Bar 7: \`96..111\`
    - Bar 8: \`112..127\`
- **In 3/4 meter (12 steps per bar):**
  - **4-Bar phrase (3/4 Waltz) = 48 steps total:** Bar 1: \`0..11\`, Bar 2: \`12..23\`, Bar 3: \`24..35\`, Bar 4: \`36..47\`.
  - **8-Bar phrase (6/8 Pirate Swing) = 96 steps total:**
    - Bar 1: \`0..11\`
    - Bar 2: \`12..23\`
    - Bar 3: \`24..35\`
    - Bar 4: \`36..47\`
    - Bar 5: \`48..59\`
    - Bar 6: \`60..71\`
    - Bar 7: \`72..83\`
    - Bar 8: \`84..95\`

**FATAL ERROR TO AVOID:**
Writing \`steps: [0, 4, 8, 12]\` for an 8-bar loop only plays notes during Bar 1! During Bars 2 through 8 (steps 16..127), that track will be 100% silent!
When you compose an 8-bar melody or bassline, you MUST distribute your musical steps and noteEvents across the ENTIRE phrase (from step 0 to step 127 in 4/4, or step 0 to step 95 in 3/4).

---

## CANONICAL CREATIVE RECIPES

### RECIPE A: Holiday / New Year 8-Bar Jingle ("napishi novogodniy loop-jingle")
- **Creative Goal:** Celebratory, sparkling festive jingle in AMBIENT procedural synthesis.
- **Key & Tempo:** C Major (\`key: 0\`), 96 BPM (\`tempo: 96\`), 8 Bars (\`bars: 8\`, 128 steps total).
- **Orchestration:**
  - Track 5 (VEIL, bell): Lead melody ("Jingle Bells" / festive chimes) playing across all 8 bars (steps 0..112).
  - Track 4 (RAIN, round): Warm bassline supporting C -> F -> G -> C chord roots across all 8 bars (steps 0..120).
  - Track 2 (ROOT, shaker): Sleigh bells / festive shaker pulse on eighth notes across the entire phrase.
  - Track 7 (AURA, wind): Rich 4-note ambient chord pads on bar downbeats (steps 0, 32, 64, 96, 112).

### RECIPE B: Epic Cinematic Soundtrack / Pirates of the Caribbean ("sochini kompozitsiyu po motivam OST piraty karibskogo morya")
- **Creative Goal:** Multi-part orchestral adventure rock composition in REACTOR CC0 recordings.
- **Key & Meter:** D Minor (\`key: 14\`), 104 BPM (\`tempo: 104\`), 8 bars per phrase in \`timeSignature: "3/4"\` (produces authentic 96-step 6/8 galloping pirate swing!).
- **Multi-Phrase Architecture (\`composition.replace\`):**
  - **Phrase 1 (Intro):** Sparse brooding piano (\`dark-piano\`) playing D minor chords on compound downbeats (steps 0, 24, 48, 72), subtle hats.
  - **Phrase 2 (Verse / Main Theme):** Driving rock beat kick on 0 and snare on 6 (\`[0, 6, 12, 18...]\`), galloping bass (\`pick-bass\`), rhythm guitar (\`palm-guitar\`), and famous galloping lead motif on guitar (\`octave-lead\`).
  - **Phrase 3 (Chorus / Battle Climax):** Full rock orchestra! Crashing cymbals, thunderous kick/snare, roaring lead guitar (\`singing-lead\`), power chords (\`power-guitar\`), maximum presence and high brightness (\`character: 85\`).
  - **Phrase 4 (Outro):** Heroic final cadence resolving to Dm, ringing reverb wash, fading out into silence (\`fade: "out"\`).
- **Arrangement Flow & Section Names:** \`intro\` (phrase 1, x1) -> \`verse\` (phrase 2, x2) -> \`chorus\` (phrase 3, x2) -> \`verse2\` (phrase 2, x1) -> \`chorus\` (phrase 3, x2) -> \`outro\` (phrase 4, x1, fade out). (Note: allowed section names are strictly \`["intro", "verse", "verse2", "chorus", "bridge", "outro", "phrase"]\`).

---

## Context Files Map & Documentation Architecture

Before composing, understand the roles of the 5 synchronized context files in this folder:

| File | Format | Primary Role & Information Contained | When to Consult |
| --- | --- | --- | --- |
| \`AGENT_GUIDE.md\` | Markdown | Master operational instructions, batch envelope, schema rules, mutable vs read-only properties, and batch examples | Read first for workflow, batch envelope, and patch structure |
| \`capabilities.json\` | JSON | Engine limits, operation schemas, field mutability allowlists, FX and master specifications | Check before creating operations to verify allowed/forbidden fields |
| \`instruments.json\` | JSON | 8 voice slots (0..7), sound matrix by setup (\`ambient\` / \`reactor\`), MIDI note registers, role polyphony | Consult to pick compatible sounds, registers, and timbral parameters |
| \`music-rules.json\` | JSON | Rhythmic grid (4/4 and 3/4), step indexing, Circle of Fifths keys (0..23), scales, chord polyphony | Consult for step numbers, chord notes, key transpositions, and meters |
| \`project-state.json\` | JSON | READ-ONLY live composition snapshot: base \`revision\`, tempo, meter, active voices, and note events | Read to get \`baseRevision\` and inspect sounding tracks |

## CRITICAL DIRECTIVE: Read-Only vs Mutable Fields (Strict Schema Enforcement)

HALO enforces strict schema validation on all operations. Passing unrecognized or read-only properties throws fatal \`UNKNOWN_FIELD\` errors!

### 1. \`track.patch\` (Targeting a single track 0..7):
- **\`trackIndex\`**: Integer \`0..7\` (required). Specifies the target slot (0: GLASS, 1: TIDAL, 2: ROOT, 3: EMBER, 4: RAIN, 5: VEIL, 6: MOSS, 7: AURA).
- **\`values\`**: Object containing ONLY mutable track parameters.
  - **ALLOWED MUTABLE FIELDS**:
    \`[ "instrument", "sound", "generator", "on", "steps", "exact", "sequence", "noteEvents", "noteTranspose", "level", "density", "character", "duration", "space", "delay", "delayTime", "chorus" ]\`
  - **STRICTLY PROHIBITED IN \`values\`**:
    \`role\`, \`name\`, \`slot\`, \`trackIndex\`.
    *Why?* In HALO, \`role\` (e.g. "pulse", "bass", "melody") and \`name\` (e.g. "GLASS", "ROOT") are permanent slot identities fixed by \`trackIndex: 0..7\`. They are read-only metadata in \`project-state.json\`. If you include \`"role"\` or \`"name"\` inside \`track.patch.values\`, HALO rejects the request with:
    \`UNKNOWN_FIELD: unexpected field(s) [role] in track.patch. Allowed fields: [instrument, sound, generator, on, steps, exact, sequence, noteEvents, noteTranspose, level, density, character, duration, space, delay, delayTime, chorus]\`.
- **MANUAL STEPS & \`exact: true\`**:
  In Generator 3 (the default mode), tracks use procedural generation unless \`exact: true\`. When providing custom rhythm via \`steps: [0, 4, 8, ...]\` or \`noteEvents: [...]\`, include \`"exact": true\` in \`values\`. HALO also automatically sets \`exact = true\` when custom steps or noteEvents are supplied if \`exact\` is omitted, ensuring your manual pattern is played rather than ignored.

### 2. \`project.patch\` (Targeting global project parameters):
- **\`values\`**: Object containing top-level project settings.
  - **ALLOWED MUTABLE FIELDS**:
    \`[ "tempo", "masterVolume", "bars", "startStep", "key", "seed", "setup", "world", "soundWorld", "timeSignature", "mix", "liveLoop" ]\`
  - **PROHIBITED IN \`project.patch\`**:
    \`tracks\`, \`phrases\`, \`sections\`, \`revision\`, \`schemaVersion\`, \`format\`, \`version\`. (To replace tracks, use \`project.replace\` or \`track.patch\`).

### 3. \`project.replace\` (Full 8-track project snapshot):
- **\`project\`**: Complete project object. MUST contain an array of **EXACTLY 8 tracks** covering all voice slots 0..7.
- Inside track objects of \`project.replace\`, \`name\` is required and \`role\` is optional for identification, but when patching tracks via \`track.patch\`, \`role\` is forbidden.

## CRITICAL DIRECTIVE: Zero Localhost, Zero CLI, 5-Second Verification Loop

1. **NO LOCALHOST, NO WEBSERVERS, NO PORTS:**
   HALO runs 100% client-side in the user's browser. There is **NO backend server, NO local HTTP daemon, NO API port** (no port 3000, 3001, 8080, 5173, etc.).
   - **DO NOT** execute \`curl\`, \`fetch\`, \`netstat\`, or scan local ports.
   - **DO NOT** search for or ping \`http://localhost:3000\` or \`http://localhost:3001\`.
2. **NO CLI OR EXECUTABLES:**
   There is **NO command-line tool, NO executable binary, NO npm package** for HALO.
   - **DO NOT** run \`halo\`, \`halo.exe\`, \`where.exe halo\`, \`halo bridge run\`, \`npm\`, \`node\`, or \`python\` to run HALO or execute requests.
3. **NO BROWSER LAUNCHING:**
   - **DO NOT** launch Chrome, Edge, Playwright, Puppeteer, or attempt to open \`file://\` or \`localhost\` URLs. HALO is already open in the user's browser and connects to this folder via the native Web File System Access API.
4. **5-SECOND ERROR VERIFICATION vs HUMAN APPROVAL:**
   - HALO polls \`requests/\` every 1.5 seconds.
   - **When a request fails validation**, HALO writes an immediate error response to \`responses/<requestId>.result.json\` within 1.5–3 seconds.
   - **When a request is valid**, HALO creates a pending proposal in the web UI and waits for the human user to click "Approve".
   - Therefore, after writing your request, **wait 4 to 5 seconds and inspect \`responses/<requestId>.result.json\`**:
     - If an error result exists (\`"ok": false\`), read \`error\` and \`help\`, fix the request, and rewrite it.
     - If NO error exists after 4–5 seconds, the request is valid and queued for human approval! Only then finish your turn.

## Strict 4-Step Agent Workflow & Verification Protocol

1. **Step 1: Read Context (Read-Only)**
   - Read \`project-state.json\` to get current \`revision\`, active voices, tempo, key, and meter.
   - Read \`instruments.json\` to select compatible voices, sound catalog IDs, role policies, and MIDI ranges.
   - Read \`music-rules.json\` to follow the rhythmic grid (4/4 or 3/4) and harmony.
   - Read \`capabilities.json\` for allowed operation types and limits.
2. **Step 2: Compose & Validate In-Memory**
   - Compose musical content tailored to the user's prompt.
   - Validate JSON envelope: \`requestId\`, \`schemaVersion: 1\`, \`baseRevision\` (matching current \`revision\` from \`project-state.json\`), and valid \`operations\`.
   - Ensure \`project.replace\` has exactly 8 tracks; sound IDs have no world prefixes; notes are within role MIDI boundaries.
3. **Step 3: Write Request File to requests/<requestId>.json**
   - Save the request JSON file to \`requests/<requestId>.json\`.
4. **Step 4: 5-Second Verification & Self-Correction (DO NOT Rush to Report Done!)**
   - Wait 4 to 5 seconds and read \`responses/<requestId>.result.json\`:
     - **CASE A: ERROR DETECTED (\`"ok": false\`):**
       - Read \`"error"\`, \`"help"\`, and \`"instructionForAgent"\`.
       - Understand the exact issue (e.g. unknown field, setup mismatch, unaligned steps).
       - Correct your batch in-memory, overwrite \`requests/<requestId>.json\` (or create a new request file), and check \`responses/\` again.
       - Maximum 2 self-correction retries allowed. Do NOT leave the user with an unresolved error!
     - **CASE B: SUCCESS / PENDING APPROVAL (No error result, or \`"ok": true\`):**
       - The request passed validation! HALO has accepted the proposal and queued it for human review in the web UI.
       - **ONLY NOW** output your summary to the user and terminate your turn:
         *"Request <requestId>.json has been validated by HALO and is awaiting your approval in the web UI. Please switch to your HALO browser tab and click 'Approve' to apply the changes."*

## Anti-Looping Protocol & Error Handling

1. **Never Guess Parameters:**
   All property names, operations, valid ranges, and enum values are strictly specified in \`capabilities.json\`, \`instruments.json\`, and \`music-rules.json\`. Do not invent non-existent properties (such as guessing \`"composition"\` inside \`project.replace\` or wrapping operations in unapproved keys).
2. **Maximum 2 Retries:**
   If a command batch fails, carefully inspect \`"error"\`, \`"help"\`, and \`"instructionForAgent"\` in \`responses/<requestId>.result.json\`. If a revised attempt fails again, **STOP IMMEDIATELY**. Report the exact error text to the human user and ask for guidance instead of endlessly guessing parameters.
3. **Exactly 8 Tracks in project.replace:**
   The \`project.replace\` operation ALWAYS requires an array of exactly 8 track objects: \`[GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]\`. Do not provide a truncated 4-track array. To modify 1–4 specific instruments, use individual \`track.patch\` operations!
4. **Sound Identifiers Have No World Prefix:**
   Sound names must match the catalogs in \`instruments.json\` (e.g., \`"bell"\`, \`"sine"\`, \`"piano"\`, \`"shaker"\`). Do NOT prefix with world names like \`"ambient-bell"\`.
5. **Composing Real Music: noteEvents is Mandatory for Melodies, Chords & Themes:**
   Do NOT simply send \`steps: [0, 4, 8, 12]\` without notes and claim you composed a melody! Without \`noteEvents\`, tracks have no musical pitch data. When asked to compose a melody, jingle, or progression, you MUST supply explicit \`noteEvents\` containing MIDI note pitches for each step across the requested bars (e.g. steps 0..127 for 8 bars). For chords on AURA (slot 7), supply up to 4 notes per event (e.g. \`{ "step": 0, "notes": [48, 52, 55, 60] }\`). For lead melody on VEIL (slot 5) or GLASS (slot 0), supply 1 note per event (e.g. \`{ "step": 0, "notes": [72] }\`).

## Modular Multi-File Requests & Full 8-Track Scoring Architecture

### Complete Orchestral Freedom: Score All 8 Voices Without Restrictions
HALO is an 8-voice polyphonic constructor. You are NEVER restricted to modifying only 1 or 2 voices. You have complete creative freedom to rewrite and orchestrate **all 8 tracks simultaneously** in full 16th-note detail across all 4 or 8 bars (128 steps per track).

### Why Modular Multi-File Requests?
External LLM tool runners (Cursor, Claude Code, Aider, LiteLLM) pass file-writing arguments as single-string JSON buffers. When generating an exhaustive 8-track score containing hundreds of note events, monolithic payloads exceed tool buffer limits (~2 KB) and get truncated mid-string (\`Unterminated string in JSON at position 2158\`).

To eliminate this buffer limit entirely and allow unlimited musical depth, HALO natively supports **Modular Multi-File Requests** and **Folder Bundles**:

### Approach 1: Folder Bundle (\`requests/<requestId>/\`) — RECOMMENDED FOR FULL 8-TRACK SCORING
Organize your composition as a folder bundle inside \`requests/\`:
1. Create directory \`requests/<requestId>/\` (e.g. \`requests/request-newyear/\`).
2. Write each track's sound, steps, and notes into lightweight companion files \`track-0.json\` ... \`track-7.json\` (each file is only 200–500 bytes and never truncates).
3. Write \`manifest.json\` (or \`request.json\` / \`<requestId>.json\`) in that folder linking the tracks.

#### Bundle Manifest Example: \`requests/request-newyear/manifest.json\`
\`\`\`json
{
  "requestId": "request-newyear",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    { "op": "project.patch", "values": { "tempo": 96, "bars": 8, "key": 0 } },
    { "op": "track.patch", "trackIndex": 0, "file": "track-0.json" },
    { "op": "track.patch", "trackIndex": 1, "file": "track-1.json" },
    { "op": "track.patch", "trackIndex": 2, "file": "track-2.json" },
    { "op": "track.patch", "trackIndex": 3, "file": "track-3.json" },
    { "op": "track.patch", "trackIndex": 4, "file": "track-4.json" },
    { "op": "track.patch", "trackIndex": 5, "file": "track-5.json" },
    { "op": "track.patch", "trackIndex": 6, "file": "track-6.json" },
    { "op": "track.patch", "trackIndex": 7, "file": "track-7.json" }
  ]
}
\`\`\`

#### Companion Track File Example: \`requests/request-newyear/track-5.json\` (Lead Melody)
\`\`\`json
{
  "sound": "bell",
  "character": 75,
  "space": 40,
  "level": 70,
  "steps": [0, 4, 8, 16, 20, 24, 32, 36, 40, 44, 48, 64, 68, 72, 76, 80, 84, 88, 96, 100, 104, 108, 112],
  "noteEvents": [
    { "step": 0, "notes": [64] }, { "step": 4, "notes": [64] }, { "step": 8, "notes": [64] },
    { "step": 16, "notes": [64] }, { "step": 20, "notes": [64] }, { "step": 24, "notes": [64] },
    { "step": 32, "notes": [64] }, { "step": 36, "notes": [67] }, { "step": 40, "notes": [60] },
    { "step": 44, "notes": [62] }, { "step": 48, "notes": [64] },
    { "step": 64, "notes": [65] }, { "step": 68, "notes": [65] }, { "step": 72, "notes": [65] },
    { "step": 76, "notes": [65] }, { "step": 80, "notes": [65] }, { "step": 84, "notes": [64] },
    { "step": 88, "notes": [64] },
    { "step": 96, "notes": [67] }, { "step": 100, "notes": [67] }, { "step": 104, "notes": [65] },
    { "step": 108, "notes": [62] }, { "step": 112, "notes": [60] }
  ]
}
\`\`\`

#### Modular \`project.replace\` Example (Folder Bundle):
\`\`\`json
{
  "requestId": "request-newyear",
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
        "tempo": 96,
        "key": 0,
        "tracks": [
          { "file": "track-0.json" },
          { "file": "track-1.json" },
          { "file": "track-2.json" },
          { "file": "track-3.json" },
          { "file": "track-4.json" },
          { "file": "track-5.json" },
          { "file": "track-6.json" },
          { "file": "track-7.json" }
        ]
      }
    }
  ]
}
\`\`\`

### Approach 2: Flat Modular Files in \`requests/\`
You can also place companion files directly in \`requests/\`:
- \`requests/req-001.json\` (the root manifest)
- \`requests/req-001-t0.json\` ... \`requests/req-001-t7.json\`
Referenced via \`"file": "req-001-t0.json"\`.

### Approach 3: Multi-Part Operations with \`parts\`
Group your score into logical musical sections:
\`\`\`json
{
  "requestId": "request-newyear",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "parts": [
    "part-rhythm.json",
    "part-harmony.json",
    "part-melody.json"
  ]
}
\`\`\`

### Approach 4: Compact Monolithic Single-File
For smaller batches (1–3 tracks) or compact patterns, single-file \`requests/<requestId>.json\` is fully supported.

## Composition Policy: Single Phrase vs Full Composition

- **DEFAULT MODE: SINGLE PHRASE:**
  Unless the user explicitly specifies a full multi-part song or arrangement (e.g. "compose a full song", "write a complete composition with intro and chorus"), the agent works **exclusively with the current phrase/loop** via \`project.patch\` + \`track.patch\` or \`project.replace\`.
- **FULL COMPOSITION (Multi-section Song):**
  Created **ONLY** when the user explicitly requests: *"compose a song"*, *"write a complete composition"*, *"create a full arrangement with intro, verses, and chorus"*, or thematic soundtrack like *"compose Pirates of the Caribbean soundtrack"*.
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
  - 0: BEAT / GLASS (punchy acoustic kick and snare backbeat)
  - 1: TIDAL / SNARE (crack and steel snares)
  - 2: ROOT / METAL (cymbals, hi-hats, acoustic ride)
  - 3: EMBER / TOMS (floor, mid, high, war toms)
  - 4: RAIN / BASS (overdriven rock bass with tube warmth)
  - 5: VEIL / RIFF (palm-muted and power electric guitars)
  - 6: MOSS / LEAD (singing and octave lead guitars)
  - 7: AURA / KEYS (acoustic grand piano, dark piano, analog synth)

### 8 Voice Slots & Role Polyphony Architecture:
| Slot (\`trackIndex\`) | Slot Name | Fixed Role | Polyphony Limit | Register | Recommended Ambient Sound | Recommended Reactor Sound |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | GLASS | Pulse / Anchor | 1 note (or unpitched) | Reference | bell, chime, pulse | dry-kick, arena-kick |
| 1 | TIDAL | Accent / Backbeat | 1-2 notes (or unpitched) | Reference | air, breath, wood | dry-snare, steel-snare |
| 2 | ROOT | Bass (Ambient) / Metal (Reactor) | 1 note (mono) | Low / High | round, sub, pulse | tight-hat, open-hat, ride |
| 3 | EMBER | Pluck / Toms | 1-2 notes | Mid | string, harp, kalimba | floor-tom, war-tom |
| 4 | RAIN | Shaker (Ambient) / Bass (Reactor) | Empty notes \`[]\` or 1 note | Transient / Low | shaker, noise, clicks | pick-bass, tube-bass |
| 5 | VEIL | Lead Melody / Riff | 1-2 notes | High / Mid | bow, crystal, vibe | power-guitar, palm-guitar |
| 6 | MOSS | Arpeggio / Lead | Strictly 1 note (mono) | Mid/High | marimba, wood, sine | octave-lead, singing-lead |
| 7 | AURA | Harmony / Keys Bed | Up to 4 notes (poly) | Broad (MIDI 36..84) | wind, drone, pad | dark-piano, attack-piano |

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

### Example 2: Compact Monolithic Holiday / New Year 8-Bar Jingle (project.patch + track.patch)
*Composes an 8-bar holiday jingle in C major with explicit notes in a single compact ~1.2 KB payload.*
\`\`\`json
{
  "requestId": "request-newyear",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "project.patch",
      "values": {
        "tempo": 96,
        "bars": 8,
        "key": 0
      }
    },
    {
      "op": "track.patch",
      "trackIndex": 5,
      "values": {
        "sound": "bell",
        "character": 75,
        "space": 40,
        "level": 70,
        "steps": [0, 4, 8, 16, 20, 24, 32, 36, 40, 44, 48, 64, 68, 72, 76, 80, 84, 88, 96, 100, 104, 108, 112],
        "noteEvents": [
          { "step": 0, "notes": [64] }, { "step": 4, "notes": [64] }, { "step": 8, "notes": [64] },
          { "step": 16, "notes": [64] }, { "step": 20, "notes": [64] }, { "step": 24, "notes": [64] },
          { "step": 32, "notes": [64] }, { "step": 36, "notes": [67] }, { "step": 40, "notes": [60] },
          { "step": 44, "notes": [62] }, { "step": 48, "notes": [64] },
          { "step": 64, "notes": [65] }, { "step": 68, "notes": [65] }, { "step": 72, "notes": [65] },
          { "step": 76, "notes": [65] }, { "step": 80, "notes": [65] }, { "step": 84, "notes": [64] },
          { "step": 88, "notes": [64] },
          { "step": 96, "notes": [67] }, { "step": 100, "notes": [67] }, { "step": 104, "notes": [65] },
          { "step": 108, "notes": [62] }, { "step": 112, "notes": [60] }
        ]
      }
    },
    {
      "op": "track.patch",
      "trackIndex": 4,
      "values": {
        "sound": "round",
        "character": 50,
        "level": 65,
        "steps": [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120],
        "noteEvents": [
          { "step": 0, "notes": [36] }, { "step": 8, "notes": [36] }, { "step": 16, "notes": [36] }, { "step": 24, "notes": [36] },
          { "step": 32, "notes": [36] }, { "step": 40, "notes": [36] }, { "step": 48, "notes": [36] }, { "step": 56, "notes": [36] },
          { "step": 64, "notes": [41] }, { "step": 72, "notes": [41] }, { "step": 80, "notes": [36] }, { "step": 88, "notes": [36] },
          { "step": 96, "notes": [43] }, { "step": 104, "notes": [43] }, { "step": 112, "notes": [36] }, { "step": 120, "notes": [36] }
        ]
      }
    }
  ]
}
\`\`\`

### Example 3: Full Multi-section Composition — Pirates of the Caribbean OST (composition.replace)
*Composes a 6-section pirate soundtrack in D minor with 6/8 pirate swing (3/4 time signature, 8 bars per phrase).*
\`\`\`json
{
  "requestId": "request-pirates-ost",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "composition.replace",
      "project": {
        "format": "halo-composition",
        "version": 1,
        "tempo": 104,
        "masterVolume": 55,
        "mix": { "low": 1, "mid": 0, "high": 0, "width": 45 },
        "repeat": true,
        "timeSignature": "3/4",
        "phrases": [
          {
            "id": 1,
            "label": "Intro",
            "project": {
              "format": "notbad-halo-project",
              "version": 1,
              "setup": "reactor",
              "bars": 8,
              "tempo": 104,
              "key": 14,
              "timeSignature": "3/4",
              "tracks": [
                { "name": "GLASS", "instrument": "GLASS", "generator": 3, "sound": "dry-kick", "on": false, "level": 60, "space": 15 },
                { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "dry-snare", "on": false, "level": 60, "space": 20 },
                { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "tight-hat", "on": true, "exact": true, "steps": [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90], "level": 45, "space": 25 },
                { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "war-tom", "on": false, "level": 60, "space": 25 },
                { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "tube-bass", "on": true, "exact": true, "steps": [0, 24, 48, 72], "noteEvents": [{ "step": 0, "notes": [38] }, { "step": 24, "notes": [34] }, { "step": 48, "notes": [36] }, { "step": 72, "notes": [38] }], "level": 55, "space": 20 },
                { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "palm-guitar", "on": false, "level": 60, "space": 20 },
                { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "picked-lead", "on": false, "level": 60, "space": 20 },
                { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "dark-piano", "on": true, "exact": true, "steps": [0, 24, 48, 72], "noteEvents": [{ "step": 0, "notes": [50, 53, 57, 62] }, { "step": 24, "notes": [46, 50, 53, 58] }, { "step": 48, "notes": [48, 52, 55, 60] }, { "step": 72, "notes": [50, 53, 57, 62] }], "level": 65, "space": 35 }
              ]
            }
          },
          {
            "id": 2,
            "label": "Theme",
            "project": {
              "format": "notbad-halo-project",
              "version": 1,
              "setup": "reactor",
              "bars": 8,
              "tempo": 104,
              "key": 14,
              "timeSignature": "3/4",
              "tracks": [
                { "name": "GLASS", "instrument": "GLASS", "generator": 3, "sound": "dry-kick", "on": true, "exact": true, "steps": [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90], "level": 70, "space": 10 },
                { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "dry-snare", "on": true, "exact": true, "steps": [6, 18, 30, 42, 54, 66, 78, 90], "level": 70, "space": 20 },
                { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "tight-hat", "on": true, "exact": true, "steps": [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94], "level": 55, "space": 10 },
                { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "war-tom", "on": true, "exact": true, "steps": [44, 46, 92, 94], "level": 60, "space": 25 },
                { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "pick-bass", "on": true, "exact": true, "steps": [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94], "noteEvents": [{ "step": 0, "notes": [38] }, { "step": 24, "notes": [34] }, { "step": 48, "notes": [36] }, { "step": 72, "notes": [38] }], "level": 70, "space": 10 },
                { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "palm-guitar", "on": true, "exact": true, "steps": [0, 3, 4, 6, 9, 10, 12, 15, 16, 18, 21, 22, 24, 27, 28, 30, 33, 34, 36, 39, 40, 42, 45, 46, 48, 51, 52, 54, 57, 58, 60, 63, 64, 66, 69, 70, 72, 75, 76, 78, 81, 82, 84, 87, 88, 90, 93, 94], "level": 65, "space": 15 },
                { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "octave-lead", "on": true, "exact": true, "steps": [0, 2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 44, 45, 46, 48, 50, 51, 52, 54, 56, 57, 58, 60, 62, 63, 64, 66, 68, 69, 70, 72, 74, 75, 76, 78, 80, 81, 82, 84, 86, 87, 88, 90, 92, 93, 94], "noteEvents": [{ "step": 0, "notes": [62] }, { "step": 2, "notes": [62] }, { "step": 3, "notes": [62] }, { "step": 4, "notes": [65] }, { "step": 6, "notes": [67] }, { "step": 8, "notes": [67] }, { "step": 9, "notes": [67] }, { "step": 10, "notes": [69] }, { "step": 12, "notes": [65] }, { "step": 14, "notes": [65] }, { "step": 15, "notes": [65] }, { "step": 16, "notes": [67] }, { "step": 18, "notes": [64] }, { "step": 20, "notes": [64] }, { "step": 21, "notes": [65] }, { "step": 22, "notes": [62] }], "level": 75, "space": 25 },
                { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "dark-piano", "on": true, "exact": true, "steps": [0, 24, 48, 72], "noteEvents": [{ "step": 0, "notes": [50, 53, 57, 62] }, { "step": 24, "notes": [46, 50, 53, 58] }, { "step": 48, "notes": [48, 52, 55, 60] }, { "step": 72, "notes": [50, 53, 57, 62] }], "level": 60, "space": 25 }
              ]
            }
          },
          {
            "id": 3,
            "label": "Climax",
            "project": {
              "format": "notbad-halo-project",
              "version": 1,
              "setup": "reactor",
              "bars": 8,
              "tempo": 104,
              "key": 14,
              "timeSignature": "3/4",
              "tracks": [
                { "name": "GLASS", "instrument": "GLASS", "generator": 3, "sound": "arena-kick", "on": true, "exact": true, "steps": [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 93], "level": 75, "space": 10 },
                { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "steel-snare", "on": true, "exact": true, "steps": [6, 18, 30, 42, 54, 66, 78, 90], "level": 75, "space": 20 },
                { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "crash", "on": true, "exact": true, "steps": [0, 24, 48, 72], "level": 60, "space": 30 },
                { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "war-tom", "on": true, "exact": true, "steps": [20, 22, 44, 46, 68, 70, 92, 94], "level": 65, "space": 20 },
                { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "fuzz-bass", "on": true, "exact": true, "steps": [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94], "noteEvents": [{ "step": 0, "notes": [38] }, { "step": 24, "notes": [34] }, { "step": 48, "notes": [36] }, { "step": 72, "notes": [38] }], "level": 75, "space": 10 },
                { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "power-guitar", "on": true, "exact": true, "steps": [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90], "level": 75, "space": 15 },
                { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "singing-lead", "on": true, "exact": true, "steps": [0, 2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 26, 27, 28, 30, 32, 33, 34, 36, 38, 39, 40, 42, 44, 45, 46, 48, 50, 51, 52, 54, 56, 57, 58, 60, 62, 63, 64, 66, 68, 69, 70, 72, 74, 75, 76, 78, 80, 81, 82, 84, 86, 87, 88, 90, 92, 93, 94], "noteEvents": [{ "step": 0, "notes": [62] }, { "step": 2, "notes": [62] }, { "step": 3, "notes": [62] }, { "step": 4, "notes": [65] }, { "step": 6, "notes": [67] }, { "step": 8, "notes": [67] }, { "step": 9, "notes": [67] }, { "step": 10, "notes": [69] }, { "step": 12, "notes": [65] }, { "step": 14, "notes": [65] }, { "step": 15, "notes": [65] }, { "step": 16, "notes": [67] }, { "step": 18, "notes": [64] }, { "step": 20, "notes": [64] }, { "step": 21, "notes": [65] }, { "step": 22, "notes": [62] }], "level": 80, "character": 85, "space": 25 },
                { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "attack-piano", "on": true, "exact": true, "steps": [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90], "level": 70, "space": 25 }
              ]
            }
          },
          {
            "id": 4,
            "label": "Outro",
            "project": {
              "format": "notbad-halo-project",
              "version": 1,
              "setup": "reactor",
              "bars": 8,
              "tempo": 104,
              "key": 14,
              "timeSignature": "3/4",
              "tracks": [
                { "name": "GLASS", "instrument": "GLASS", "generator": 3, "sound": "dry-kick", "on": false, "level": 60, "space": 15 },
                { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "dry-snare", "on": false, "level": 60, "space": 20 },
                { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "ride", "on": true, "exact": true, "steps": [0, 12, 24, 36], "level": 40, "space": 40 },
                { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "war-tom", "on": false, "level": 60, "space": 25 },
                { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "tube-bass", "on": true, "exact": true, "steps": [0, 48], "noteEvents": [{ "step": 0, "notes": [38] }, { "step": 48, "notes": [38] }], "level": 55, "space": 30 },
                { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "palm-guitar", "on": false, "level": 60, "space": 20 },
                { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "feedback-lead", "on": true, "exact": true, "steps": [0], "noteEvents": [{ "step": 0, "notes": [62] }], "level": 60, "space": 50 },
                { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "dark-piano", "on": true, "exact": true, "steps": [0, 48], "noteEvents": [{ "step": 0, "notes": [50, 53, 57, 62] }, { "step": 48, "notes": [50, 53, 57, 62] }], "level": 60, "space": 50 }
              ]
            }
          }
        ],
        "sections": [
          { "phrase": 1, "name": "intro", "repeats": 1, "fade": "none" },
          { "phrase": 2, "name": "verse", "repeats": 2, "fade": "none" },
          { "phrase": 3, "name": "chorus", "repeats": 2, "fade": "none" },
          { "phrase": 2, "name": "verse2", "repeats": 1, "fade": "none" },
          { "phrase": 3, "name": "chorus", "repeats": 2, "fade": "none" },
          { "phrase": 4, "name": "outro", "repeats": 1, "fade": "out" }
        ]
      }
    }
  ]
}
\`\`\`

### Example 4: Single-Phrase 8-Bar Project Replacement (project.replace)
*Important: for \`project.replace\`, the \`tracks\` array MUST contain exactly 8 track objects covering all voice slots [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]. Use valid sound names from instruments.json for the chosen setup.*
\`\`\`json
{
  "requestId": "request-004",
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
          { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "air", "on": true, "exact": true, "steps": [0, 8], "level": 60, "density": 60, "character": 50, "duration": 60, "space": 50 },
          { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "round", "on": true, "exact": true, "steps": [0, 4, 8, 12], "level": 60, "density": 60, "character": 50, "duration": 50, "space": 30 },
          { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "string", "on": true, "exact": true, "steps": [2, 6, 10, 14], "level": 60, "density": 60, "character": 55, "duration": 50, "space": 35 },
          { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "shaker", "on": true, "exact": true, "steps": [0, 2, 4, 6, 8, 10, 12, 14], "level": 50, "density": 70, "character": 60, "duration": 40, "space": 25 },
          { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "bow", "on": true, "exact": true, "steps": [0, 8], "level": 60, "density": 60, "character": 50, "duration": 65, "space": 55 },
          { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "marimba", "on": true, "exact": true, "steps": [4, 12], "level": 55, "density": 50, "character": 50, "duration": 45, "space": 35 },
          { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "wind", "on": true, "exact": true, "steps": [0], "level": 55, "density": 50, "character": 40, "duration": 70, "space": 60 }
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

  function checkSafePath(relPath){
    if (!relPath || typeof relPath !== 'string') return;
    if (relPath.includes('..') || relPath.startsWith('/') || relPath.startsWith('\\') || /^[a-zA-Z]:/.test(relPath)) {
      throw new Error(`SECURITY_PATH_TRAVERSAL: Invalid path "${relPath}". Paths must be relative and cannot contain ".." or absolute roots.`);
    }
  }

  function resolveRequestPayloadSync(parsed, syncFileReader){
    if (!parsed || typeof parsed !== 'object') return parsed;
    const req = clone(parsed);
    const transaction = req.transaction || req;

    function readSync(relPath) {
      checkSafePath(relPath);
      if (!syncFileReader) {
        throw new Error(`MISSING_FILE_READER: Cannot resolve file "${relPath}" because no file reader was provided.`);
      }
      const raw = syncFileReader(relPath);
      if (raw === undefined || raw === null) {
        throw new Error(`FILE_NOT_FOUND: Companion file "${relPath}" could not be read.`);
      }
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch(err) {
          throw new Error(`INVALID_JSON in companion file "${relPath}": ${err.message}`);
        }
      }
      return clone(raw);
    }

    function resolveOp(op) {
      if (!op || typeof op !== 'object') return op;
      let resOp = clone(op);

      if (resOp.file || resOp.include) {
        const opFile = resOp.file || resOp.include;
        const fileData = readSync(opFile);
        delete resOp.file;
        delete resOp.include;
        if (fileData && typeof fileData === 'object') {
          if (fileData.op) {
            resOp = { ...fileData, ...resOp };
          } else if (resOp.op === 'track.patch') {
            if (fileData.values && typeof fileData.values === 'object') {
              if (resOp.trackIndex === undefined && fileData.trackIndex !== undefined) resOp.trackIndex = fileData.trackIndex;
              resOp.values = { ...fileData.values, ...(resOp.values || {}) };
            } else {
              const { op: _o, trackIndex: _t, ...vals } = fileData;
              if (resOp.trackIndex === undefined && fileData.trackIndex !== undefined) resOp.trackIndex = fileData.trackIndex;
              resOp.values = { ...vals, ...(resOp.values || {}) };
            }
          } else if (resOp.op === 'project.replace' || resOp.op === 'composition.replace') {
            resOp.project = fileData.project || fileData;
          } else if (resOp.op === 'project.patch' || resOp.op === 'master.patch' || resOp.op === 'phrase.patch' || resOp.op === 'visual.patch') {
            resOp.values = { ...(fileData.values || fileData), ...(resOp.values || {}) };
          }
        }
      }

      if (resOp.op === 'track.patch' && resOp.values && (resOp.values.file || resOp.values.include)) {
        const vFile = resOp.values.file || resOp.values.include;
        const vData = readSync(vFile);
        delete resOp.values.file;
        delete resOp.values.include;
        if (vData && typeof vData === 'object') {
          const { op: _o, trackIndex: _t, ...vals } = (vData.values || vData);
          resOp.values = { ...vals, ...resOp.values };
        }
      }

      if (resOp.op === 'project.replace' && resOp.project && Array.isArray(resOp.project.tracks)) {
        const defaultNames = ['GLASS', 'TIDAL', 'ROOT', 'EMBER', 'RAIN', 'VEIL', 'MOSS', 'AURA'];
        const resolvedTracks = [];
        for (let i = 0; i < resOp.project.tracks.length; i++) {
          const tr = resOp.project.tracks[i];
          let trackData = {};
          if (typeof tr === 'string') {
            trackData = readSync(tr);
          } else if (tr && (tr.file || tr.include)) {
            const trFile = tr.file || tr.include;
            const trRaw = readSync(trFile);
            const { file: _f, include: _inc, ...restTr } = tr;
            trackData = { ...(trRaw.values || trRaw), ...restTr };
          } else if (tr && typeof tr === 'object') {
            trackData = { ...tr };
          }
          if (!trackData.name && defaultNames[i]) trackData.name = defaultNames[i];
          if (!trackData.instrument && trackData.name) trackData.instrument = trackData.name;
          if (trackData.on === undefined) trackData.on = true;
          if (trackData.generator === undefined) trackData.generator = 3;
          if (trackData.exact === undefined && (trackData.steps || trackData.noteEvents)) trackData.exact = true;
          resolvedTracks.push(trackData);
        }
        resOp.project.tracks = resolvedTracks;
      }

      if (resOp.op === 'composition.replace' && resOp.project && Array.isArray(resOp.project.phrases)) {
        const resolvedPhrases = [];
        for (const ph of resOp.project.phrases) {
          let phraseObj = ph;
          if (typeof ph === 'string') {
            phraseObj = readSync(ph);
          } else if (ph && (ph.file || ph.include)) {
            const phData = readSync(ph.file || ph.include);
            const { file: _f, include: _inc, ...restPh } = ph;
            phraseObj = { ...phData, ...restPh };
          }
          if (phraseObj && phraseObj.project && Array.isArray(phraseObj.project.tracks)) {
            const resolvedTracks = [];
            for (const tr of phraseObj.project.tracks) {
              if (typeof tr === 'string') {
                resolvedTracks.push(readSync(tr));
              } else if (tr && (tr.file || tr.include)) {
                const trData = readSync(tr.file || tr.include);
                const { file: _f, include: _inc, ...restTr } = tr;
                resolvedTracks.push({ ...(trData.values || trData), ...restTr });
              } else {
                resolvedTracks.push(tr);
              }
            }
            phraseObj.project.tracks = resolvedTracks;
          }
          resolvedPhrases.push(phraseObj);
        }
        resOp.project.phrases = resolvedPhrases;
      }

      return resOp;
    }

    if (Array.isArray(transaction.parts)) {
      transaction.operations = Array.isArray(transaction.operations) ? transaction.operations : [];
      for (const part of transaction.parts) {
        const partFile = typeof part === 'string' ? part : (part && (part.file || part.include));
        if (partFile) {
          const content = readSync(partFile);
          if (Array.isArray(content)) {
            transaction.operations.push(...content);
          } else if (content && Array.isArray(content.operations)) {
            transaction.operations.push(...content.operations);
          } else if (content && content.op) {
            transaction.operations.push(content);
          }
        } else if (part && part.op) {
          transaction.operations.push(part);
        }
      }
      delete transaction.parts;
    }

    if (Array.isArray(transaction.operations)) {
      const resolvedOps = [];
      for (const opEntry of transaction.operations) {
        if (typeof opEntry === 'string' || (opEntry && (opEntry.file || opEntry.include) && !opEntry.op)) {
          const opFile = typeof opEntry === 'string' ? opEntry : (opEntry.file || opEntry.include);
          const content = readSync(opFile);
          if (Array.isArray(content)) {
            for (const sub of content) {
              resolvedOps.push(resolveOp(sub));
            }
          } else if (content && Array.isArray(content.operations)) {
            for (const sub of content.operations) {
              resolvedOps.push(resolveOp(sub));
            }
          } else if (content && content.op) {
            resolvedOps.push(resolveOp(content));
          }
        } else {
          resolvedOps.push(resolveOp(opEntry));
        }
      }
      transaction.operations = resolvedOps;
    }

    return req;
  }

  async function resolveRequestPayload(parsed, fileReader){
    if (!parsed || typeof parsed !== 'object') return parsed;
    const req = clone(parsed);
    const transaction = req.transaction || req;

    async function readAsync(relPath) {
      checkSafePath(relPath);
      if (!fileReader) {
        throw new Error(`MISSING_FILE_READER: Cannot resolve file "${relPath}" because no file reader was provided.`);
      }
      const raw = await fileReader(relPath);
      if (raw === undefined || raw === null) {
        throw new Error(`FILE_NOT_FOUND: Companion file "${relPath}" could not be read.`);
      }
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch(err) {
          throw new Error(`INVALID_JSON in companion file "${relPath}": ${err.message}`);
        }
      }
      return clone(raw);
    }

    async function resolveOp(op) {
      if (!op || typeof op !== 'object') return op;
      let resOp = clone(op);

      if (resOp.file || resOp.include) {
        const opFile = resOp.file || resOp.include;
        const fileData = await readAsync(opFile);
        delete resOp.file;
        delete resOp.include;
        if (fileData && typeof fileData === 'object') {
          if (fileData.op) {
            resOp = { ...fileData, ...resOp };
          } else if (resOp.op === 'track.patch') {
            if (fileData.values && typeof fileData.values === 'object') {
              if (resOp.trackIndex === undefined && fileData.trackIndex !== undefined) resOp.trackIndex = fileData.trackIndex;
              resOp.values = { ...fileData.values, ...(resOp.values || {}) };
            } else {
              const { op: _o, trackIndex: _t, ...vals } = fileData;
              if (resOp.trackIndex === undefined && fileData.trackIndex !== undefined) resOp.trackIndex = fileData.trackIndex;
              resOp.values = { ...vals, ...(resOp.values || {}) };
            }
          } else if (resOp.op === 'project.replace' || resOp.op === 'composition.replace') {
            resOp.project = fileData.project || fileData;
          } else if (resOp.op === 'project.patch' || resOp.op === 'master.patch' || resOp.op === 'phrase.patch' || resOp.op === 'visual.patch') {
            resOp.values = { ...(fileData.values || fileData), ...(resOp.values || {}) };
          }
        }
      }

      if (resOp.op === 'track.patch' && resOp.values && (resOp.values.file || resOp.values.include)) {
        const vFile = resOp.values.file || resOp.values.include;
        const vData = await readAsync(vFile);
        delete resOp.values.file;
        delete resOp.values.include;
        if (vData && typeof vData === 'object') {
          const { op: _o, trackIndex: _t, ...vals } = (vData.values || vData);
          resOp.values = { ...vals, ...resOp.values };
        }
      }

      if (resOp.op === 'project.replace' && resOp.project && Array.isArray(resOp.project.tracks)) {
        const defaultNames = ['GLASS', 'TIDAL', 'ROOT', 'EMBER', 'RAIN', 'VEIL', 'MOSS', 'AURA'];
        const resolvedTracks = [];
        for (let i = 0; i < resOp.project.tracks.length; i++) {
          const tr = resOp.project.tracks[i];
          let trackData = {};
          if (typeof tr === 'string') {
            trackData = await readAsync(tr);
          } else if (tr && (tr.file || tr.include)) {
            const trFile = tr.file || tr.include;
            const trRaw = await readAsync(trFile);
            const { file: _f, include: _inc, ...restTr } = tr;
            trackData = { ...(trRaw.values || trRaw), ...restTr };
          } else if (tr && typeof tr === 'object') {
            trackData = { ...tr };
          }
          if (!trackData.name && defaultNames[i]) trackData.name = defaultNames[i];
          if (!trackData.instrument && trackData.name) trackData.instrument = trackData.name;
          if (trackData.on === undefined) trackData.on = true;
          if (trackData.generator === undefined) trackData.generator = 3;
          if (trackData.exact === undefined && (trackData.steps || trackData.noteEvents)) trackData.exact = true;
          resolvedTracks.push(trackData);
        }
        resOp.project.tracks = resolvedTracks;
      }

      if (resOp.op === 'composition.replace' && resOp.project && Array.isArray(resOp.project.phrases)) {
        const resolvedPhrases = [];
        for (const ph of resOp.project.phrases) {
          let phraseObj = ph;
          if (typeof ph === 'string') {
            phraseObj = await readAsync(ph);
          } else if (ph && (ph.file || ph.include)) {
            const phData = await readAsync(ph.file || ph.include);
            const { file: _f, include: _inc, ...restPh } = ph;
            phraseObj = { ...phData, ...restPh };
          }
          if (phraseObj && phraseObj.project && Array.isArray(phraseObj.project.tracks)) {
            const resolvedTracks = [];
            for (const tr of phraseObj.project.tracks) {
              if (typeof tr === 'string') {
                resolvedTracks.push(await readAsync(tr));
              } else if (tr && (tr.file || tr.include)) {
                const trData = await readAsync(tr.file || tr.include);
                const { file: _f, include: _inc, ...restTr } = tr;
                resolvedTracks.push({ ...(trData.values || trData), ...restTr });
              } else {
                resolvedTracks.push(tr);
              }
            }
            phraseObj.project.tracks = resolvedTracks;
          }
          resolvedPhrases.push(phraseObj);
        }
        resOp.project.phrases = resolvedPhrases;
      }

      return resOp;
    }

    if (Array.isArray(transaction.parts)) {
      transaction.operations = Array.isArray(transaction.operations) ? transaction.operations : [];
      for (const part of transaction.parts) {
        const partFile = typeof part === 'string' ? part : (part && (part.file || part.include));
        if (partFile) {
          const content = await readAsync(partFile);
          if (Array.isArray(content)) {
            transaction.operations.push(...content);
          } else if (content && Array.isArray(content.operations)) {
            transaction.operations.push(...content.operations);
          } else if (content && content.op) {
            transaction.operations.push(content);
          }
        } else if (part && part.op) {
          transaction.operations.push(part);
        }
      }
      delete transaction.parts;
    }

    if (Array.isArray(transaction.operations)) {
      const resolvedOps = [];
      for (const opEntry of transaction.operations) {
        if (typeof opEntry === 'string' || (opEntry && (opEntry.file || opEntry.include) && !opEntry.op)) {
          const opFile = typeof opEntry === 'string' ? opEntry : (opEntry.file || opEntry.include);
          const content = await readAsync(opFile);
          if (Array.isArray(content)) {
            for (const sub of content) {
              resolvedOps.push(await resolveOp(sub));
            }
          } else if (content && Array.isArray(content.operations)) {
            for (const sub of content.operations) {
              resolvedOps.push(await resolveOp(sub));
            }
          } else if (content && content.op) {
            resolvedOps.push(await resolveOp(content));
          }
        } else {
          resolvedOps.push(await resolveOp(opEntry));
        }
      }
      transaction.operations = resolvedOps;
    }

    return req;
  }

  async function resolveAndValidateRequest(api, textContent, fileReader, fallbackId, options = {}){
    let parsed;
    try {
      parsed = typeof textContent === 'string' ? JSON.parse(textContent) : textContent;
    } catch(e) {
      return { ok: false, error: 'INVALID_JSON: ' + e.message, id: fallbackId };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'INVALID_REQUEST_OBJECT', id: fallbackId };
    }
    let resolved;
    try {
      resolved = await resolveRequestPayload(parsed, fileReader);
    } catch(err) {
      return { ok: false, error: err.message, id: String(parsed.requestId || fallbackId) };
    }
    return parseAndValidateRequest(api, resolved, fallbackId, options);
  }

  function parseAndValidateRequest(api, textContent, fallbackId, options = {}){
    let parsed;
    try {
      parsed = typeof textContent === 'string' ? JSON.parse(textContent) : textContent;
    } catch(e) {
      return { ok: false, error: 'INVALID_JSON: ' + e.message, id: fallbackId };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'INVALID_REQUEST_OBJECT', id: fallbackId };
    }

    if (options && options.files) {
      try {
        parsed = resolveRequestPayloadSync(parsed, (p) => options.files[p]);
      } catch(err) {
        return { ok: false, error: err.message, id: String(parsed.requestId || fallbackId) };
      }
    }

    const transaction = parsed.transaction || parsed;
    const requestId = String(parsed.requestId || transaction.requestId || fallbackId);

    if (Array.isArray(transaction.parts) && transaction.parts.length > 0) {
      return { ok: false, error: 'UNRESOLVED_MODULAR_REFERENCE: Request contains modular "parts" that have not been resolved', id: requestId };
    }
    if (Array.isArray(transaction.operations)) {
      for (const op of transaction.operations) {
        if (op && (op.file || op.include || (op.values && (op.values.file || op.values.include)))) {
          return { ok: false, error: 'UNRESOLVED_MODULAR_REFERENCE: Operation contains modular "file" reference that has not been resolved', id: requestId };
        }
      }
    }

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
    const isRevisionMismatch = transaction.baseRevision !== currentRevision;
    if (isRevisionMismatch && !options.allowRebase) {
      return {
        ok: false,
        error: `CONFLICT_REVISION_MISMATCH: expected revision ${currentRevision}, request was based on ${transaction.baseRevision}`,
        id: requestId,
        currentRevision
      };
    }

    const effectiveTransaction = isRevisionMismatch ? { ...transaction, baseRevision: currentRevision } : transaction;

    let preview;
    try {
      preview = api.previewOperations(effectiveTransaction);
    } catch(err) {
      return { ok: false, error: err.message, id: requestId, currentRevision };
    }

    return {
      ok: true,
      id: requestId,
      transaction: effectiveTransaction,
      preview,
      currentRevision,
      rebased: isRevisionMismatch,
      originalBaseRevision: isRevisionMismatch ? transaction.baseRevision : undefined
    };
  }

  function generateErrorGuidance(errorMessage, consecutiveCount = 1){
    let help = 'Review your request schema against capabilities.json, instruments.json and AGENT_GUIDE.md.';
    const msg = String(errorMessage || '');

    if (msg.includes('CONFLICT_REVISION_MISMATCH')) {
      const match = msg.match(/expected revision (\d+)/);
      const rev = match ? match[1] : '';
      help = `Base revision is outdated. The project is currently at revision ${rev || 'N'}. project-state.json has been automatically updated on disk. Set "baseRevision": ${rev ? Number(rev) : 1} in your request or click «⚡ Rebase & Retry» in HALO.`;
    } else if (msg.includes('INVALID_TRACKS_COUNT')) {
      help = 'operation "project.replace" requires all 8 tracks in the "tracks" array: [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]. If you only want to modify specific tracks, use one or more "track.patch" operations instead.';
    } else if (msg.includes('UNKNOWN_FIELD')) {
      if (msg.includes('track.patch') && (msg.includes('role') || msg.includes('name') || msg.includes('slot'))) {
        help = 'In "track.patch", "role" and "name" are permanent read-only slot identifiers and MUST NOT be included in "values". Allowed fields in track.patch.values: [instrument, sound, generator, on, steps, exact, sequence, noteEvents, noteTranspose, level, density, character, duration, space, delay, delayTime, chorus]. Remove "role" and "name" from values.';
      } else {
        help = 'An unexpected property was found: ' + msg + '. Consult capabilities.json and AGENT_GUIDE.md for allowed fields. In track.patch, only mutable voice parameters are allowed (role and name are read-only slot identifiers).';
      }
    } else if (msg.includes('INVALID_SOUND')) {
      if (msg.includes('belongs to the "REACTOR" setup') || msg.includes('belongs to the "AMBIENT" setup')) {
        help = 'Sound setup/vibe mismatch: ' + msg + ' To use this sound, set "setup": "reactor" (or "world": "reactor") in project.replace, or choose sounds available in the current setup from instruments.json.';
      } else {
        help = 'Sound ID not found or not available in this slot/setup. Check soundsBySetup in instruments.json for your active setup ("ambient" or "reactor") and slot name. Ensure sound names do not have invalid prefixes.';
      }
    } else if (msg.includes('UNSUPPORTED_FORMAT')) {
      help = 'For single-phrase project, format must be "notbad-halo-project" or "halo-project". For multi-phrase songs, format must be "halo-composition".';
    } else if (msg.includes('INVALID_BARS')) {
      help = 'Phrase length must be either 4 or 8 bars.';
    } else if (msg.includes('UNSUPPORTED_SETUP') || msg.includes('Unsupported setup')) {
      help = 'Setup must be either "ambient" (procedural synthesis) or "reactor" (CC0 acoustic/rock samples). Set "setup": "ambient" or "setup": "reactor" (or "world": "ambient" / "world": "reactor").';
    } else if (msg.includes('UNSUPPORTED_TIME_SIGNATURE')) {
      help = 'Time signature must be "4/4" or "3/4".';
    } else if (msg.includes('EXACT_REQUIRED')) {
      help = 'Generator 3 requires "exact": true when providing custom steps or noteEvents. Add "exact": true to your track.patch values (or omit "exact": false).';
    } else if (msg.includes('Invalid phrase position') || msg.includes('phrase position')) {
      help = 'Phrase startStep must be aligned to phrase boundaries (multiples of bars * stepsPerBar). In single-phrase mode, omit startStep or set startStep: 0.';
    } else if (msg.includes('PHRASE_NOT_FOUND')) {
      help = 'The specified phraseId was not found in the composition phrases array.';
    } else if (msg.includes('MISSING_PAYLOAD')) {
      help = 'Provide the payload object ("project" or "composition") inside the operation.';
    } else if (msg.includes('REJECTED_BY_USER')) {
      help = 'The user reviewed the proposal preview in HALO and clicked "Reject". Ask the user for their preferred direction before proposing changes.';
    } else if (msg.includes('FILE_NOT_FOUND')) {
      help = 'A companion file referenced by "file" or "parts" was not found. Ensure all modular files exist in requests/ or in your request subfolder.';
    } else if (msg.includes('SECURITY_PATH_TRAVERSAL')) {
      help = 'File paths must be relative and cannot contain ".." or absolute paths. Keep all companion files inside the request directory.';
    } else if (msg.includes('INVALID_JSON in companion file')) {
      help = 'A syntax error was found in a companion JSON file. Validate that each track JSON file contains well-formed JSON.';
    } else if (msg.includes('UNRESOLVED_MODULAR_REFERENCE')) {
      help = 'Request references external companion files but the files could not be located or loaded.';
    }

    let instructionForAgent;
    if (consecutiveCount >= 3) {
      instructionForAgent = `CRITICAL STOP DIRECTIVE: ${consecutiveCount} consecutive request failures detected. STOP YOUR RETRY LOOP IMMEDIATELY. Do not guess parameters or attempt brute-force trial and error. Stop and report the exact error to the user, and ask for clarification, or consult AGENT_GUIDE.md and instruments.json.`;
    } else {
      instructionForAgent = 'ACTION REQUIRED: Carefully follow the error message and help above to fix your request. You can overwrite the same request file or write a new one with a new requestId. Do NOT idle or wait for errors to disappear without modifying your request. Consult instruments.json and AGENT_GUIDE.md. Maximum 2 retry attempts allowed.';
    }

    return { help, instructionForAgent };
  }

  async function processRequest(api, textContent, fallbackId, options = {}){
    const validated = parseAndValidateRequest(api, textContent, fallbackId, options);
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
        ...(validated.rebased ? { rebasedFrom: validated.originalBaseRevision } : {}),
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
    console.log('[HALO File Bridge] syncAllContext start', { dir: dirHandle?.name });
    try {
      const files = getContextFiles(api);
      console.log('[HALO File Bridge] getContextFiles successfully prepared', Object.keys(files));
      for (const [name, content] of Object.entries(files)){
        await writeFsFile(dirHandle, name, content);
      }
      console.log('[HALO File Bridge] all 5 context files written successfully to', dirHandle?.name);
    } catch(err) {
      console.error('[HALO File Bridge] syncAllContext failed:', err);
      throw err;
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

  function asDirectoryHandle(obj){
    if (!obj) return null;
    if (typeof obj.getDirectoryHandle === 'function' && typeof obj.getFileHandle === 'function') {
      return obj;
    }
    if (obj.handle && typeof obj.handle.getDirectoryHandle === 'function' && typeof obj.handle.getFileHandle === 'function') {
      return obj.handle;
    }
    return null;
  }

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
    const valid = asDirectoryHandle(handle);
    if (!valid) return;
    try {
      const db = await openIdb(win);
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ name: valid.name, handle: valid, timestamp: Date.now() }, IDB_KEY);
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
      const res = await new Promise(r => {
        req.onsuccess = () => r(req.result || null);
        req.onerror = () => r(null);
        setTimeout(() => r(null), 100);
      });
      if (!res) return null;
      const handle = asDirectoryHandle(res);
      if (!handle) {
        await clearStoredDirectory(win);
        return null;
      }
      return { name: res.name || handle.name || 'HALO-Bridge', handle };
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
    let lastSyncedRevision = null;
    const listeners = new Set();
    const processedIds = new Set();
    const processedContent = new Map();
    const appliedIds = new Set();
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
        // Continuous auto-sync: keep project-state.json fresh on disk whenever in-memory revision changes
        const currentRev = api.getProjectState().revision;
        if (lastSyncedRevision === null || currentRev !== lastSyncedRevision) {
          try {
            await syncStateOnly(dirHandle, api);
            lastSyncedRevision = currentRev;
            state.lastSync = new Date().toISOString();
          } catch(syncErr) {
            console.warn('File Bridge auto-sync warning:', syncErr);
          }
        }

        const reqDir = await dirHandle.getDirectoryHandle('requests', { create: true });
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });

        // Scan existing responses to populate appliedIds
        for await (const [name, handle] of resDir.entries()){
          if (handle.kind === 'file' && name.endsWith('.result.json')){
            const id = name.replace(/\.result\.json$/i, '');
            try {
              const resText = await readFsFile(handle);
              const resData = JSON.parse(resText);
              if (resData && resData.ok === true) {
                appliedIds.add(id);
              }
            } catch {}
          }
        }

        // If there's already a pending request awaiting user confirmation, don't pick another one yet
        if (state.pending) {
          state.lastCheck = new Date().toISOString();
          notify();
          return;
        }

        for await (const [name, handle] of reqDir.entries()){
          // CASE 1: Folder Bundle (Directory in requests/)
          if (handle.kind === 'directory') {
            const bundleId = name;
            let manifestHandle = null;
            let manifestName = null;
            for (const candidate of ['manifest.json', 'request.json', `${bundleId}.json`, 'index.json']) {
              try {
                manifestHandle = await handle.getFileHandle(candidate, { create: false });
                manifestName = candidate;
                break;
              } catch {}
            }
            if (!manifestHandle) continue;

            const text = await readFsFile(manifestHandle);
            const bundleContentKey = `bundle:${bundleId}:${text}`;
            if (processedContent.get(bundleId) === bundleContentKey) continue;
            if (appliedIds.has(bundleId) && !processedContent.has(bundleId)) {
              processedContent.set(bundleId, bundleContentKey);
              continue;
            }

            processedContent.set(bundleId, bundleContentKey);

            const bundleFileReader = async (relPath) => {
              const fHandle = await handle.getFileHandle(relPath, { create: false });
              return await readFsFile(fHandle);
            };

            let parsed = await resolveAndValidateRequest(api, text, bundleFileReader, bundleId);

            if (!parsed.ok && parsed.error && parsed.error.includes('CONFLICT_REVISION_MISMATCH')) {
              const rebaseAttempt = await resolveAndValidateRequest(api, text, bundleFileReader, bundleId, { allowRebase: true });
              if (rebaseAttempt.ok) {
                parsed = rebaseAttempt;
              }
            }

            if (!parsed.ok) {
              consecutiveErrors++;
              try {
                await syncStateOnly(dirHandle, api);
                lastSyncedRevision = api.getProjectState().revision;
                state.lastSync = new Date().toISOString();
              } catch {}

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
              if (bundleId !== parsed.id) {
                await writeFsFile(resDir, `${bundleId}.result.json`, JSON.stringify(errRes, null, 2));
              }
              processedIds.add(bundleId);
              state.lastResult = errRes;
              state.error = parsed.error;
              notify();
              continue;
            }

            consecutiveErrors = 0;
            state.error = null;
            await resDir.removeEntry(`${parsed.id}.result.json`).catch(() => {});
            if (bundleId !== parsed.id) {
              await resDir.removeEntry(`${bundleId}.result.json`).catch(() => {});
            }

            // Rule 1: Never apply automatically by default
            if (!state.autoApply) {
              state.pending = {
                id: parsed.id,
                filename: `${bundleId}/${manifestName}`,
                transaction: parsed.transaction,
                preview: parsed.preview,
                baseId: bundleId,
                rebased: !!parsed.rebased,
                originalBaseRevision: parsed.originalBaseRevision
              };
              state.lastResult = null;
              state.error = null;
              notify();
              break; // Wait for user decision
            } else {
              api.setEnabled(true);
              const applied = await api.applyOperations(parsed.transaction);
              appliedIds.add(bundleId);
              appliedIds.add(parsed.id);
              const okRes = {
                ok: true,
                id: parsed.id,
                appliedRevision: applied.revision,
                currentRevision: applied.revision,
                ...(parsed.rebased ? { rebasedFrom: parsed.originalBaseRevision } : {}),
                timestamp: new Date().toISOString()
              };
              await writeFsFile(resDir, `${parsed.id}.result.json`, JSON.stringify(okRes, null, 2));
              if (bundleId !== parsed.id) {
                await writeFsFile(resDir, `${bundleId}.result.json`, JSON.stringify(okRes, null, 2));
              }
              await syncStateOnly(dirHandle, api);
              lastSyncedRevision = applied.revision;
              state.lastSync = new Date().toISOString();
              processedIds.add(bundleId);
              state.lastResult = okRes;
              notify();
            }
            continue;
          }

          // CASE 2: Files in requests/
          if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
          const baseId = name.replace(/\.json$/i, '');

          // Skip companion files
          if (name.startsWith('_') || name.startsWith('.') || /^t[0-7]\.json$/i.test(name) || /[\.-](track|part|t)[0-7]?\./i.test(name)) {
            continue;
          }

          const text = await readFsFile(handle);

          // Fast inspection: skip non-root companion files
          let parsedRaw;
          try {
            parsedRaw = JSON.parse(text);
          } catch(e) {
            if (!/^(request|req)[-_]/i.test(name)) {
              continue;
            }
          }

          if (parsedRaw) {
            const hasRootHallmarks = parsedRaw.schemaVersion === 1 || parsedRaw.operations || parsedRaw.parts || parsedRaw.requestId;
            if (!hasRootHallmarks && (Array.isArray(parsedRaw) || parsedRaw.values || parsedRaw.steps || parsedRaw.notes || parsedRaw.trackIndex !== undefined)) {
              continue;
            }
          }

          if (processedContent.get(baseId) === text) continue;
          if (appliedIds.has(baseId) && !processedContent.has(baseId)) {
            processedContent.set(baseId, text);
            continue;
          }

          processedContent.set(baseId, text);

          const reqDirFileReader = async (relPath) => {
            const fHandle = await reqDir.getFileHandle(relPath, { create: false });
            return await readFsFile(fHandle);
          };

          let parsed = await resolveAndValidateRequest(api, text, reqDirFileReader, baseId);

          if (!parsed.ok && parsed.error && parsed.error.includes('CONFLICT_REVISION_MISMATCH')) {
            const rebaseAttempt = await resolveAndValidateRequest(api, text, reqDirFileReader, baseId, { allowRebase: true });
            if (rebaseAttempt.ok) {
              parsed = rebaseAttempt;
            }
          }

          if (!parsed.ok) {
            consecutiveErrors++;
            try {
              await syncStateOnly(dirHandle, api);
              lastSyncedRevision = api.getProjectState().revision;
              state.lastSync = new Date().toISOString();
            } catch {}

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
            if (baseId !== parsed.id) {
              await writeFsFile(resDir, `${baseId}.result.json`, JSON.stringify(errRes, null, 2));
            }
            processedIds.add(baseId);
            state.lastResult = errRes;
            state.error = parsed.error;
            notify();
            continue;
          }

          consecutiveErrors = 0;
          state.error = null;
          await resDir.removeEntry(`${parsed.id}.result.json`).catch(() => {});
          if (baseId !== parsed.id) {
            await resDir.removeEntry(`${baseId}.result.json`).catch(() => {});
          }

          // Rule 1: Never apply automatically by default
          if (!state.autoApply) {
            state.pending = {
              id: parsed.id,
              filename: name,
              transaction: parsed.transaction,
              preview: parsed.preview,
              baseId,
              rebased: !!parsed.rebased,
              originalBaseRevision: parsed.originalBaseRevision
            };
            state.lastResult = null;
            state.error = null;
            notify();
            break; // Wait for user decision
          } else {
            api.setEnabled(true);
            const applied = await api.applyOperations(parsed.transaction);
            appliedIds.add(baseId);
            appliedIds.add(parsed.id);
            const okRes = {
              ok: true,
              id: parsed.id,
              appliedRevision: applied.revision,
              currentRevision: applied.revision,
              ...(parsed.rebased ? { rebasedFrom: parsed.originalBaseRevision } : {}),
              timestamp: new Date().toISOString()
            };
            await writeFsFile(resDir, `${parsed.id}.result.json`, JSON.stringify(okRes, null, 2));
            if (baseId !== parsed.id) {
              await writeFsFile(resDir, `${baseId}.result.json`, JSON.stringify(okRes, null, 2));
            }
            await syncStateOnly(dirHandle, api);
            lastSyncedRevision = applied.revision;
            state.lastSync = new Date().toISOString();
            processedIds.add(baseId);
            state.lastResult = okRes;
            notify();
          }
        }
        state.lastCheck = new Date().toISOString();
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
          ...(p.rebased ? { rebasedFrom: p.originalBaseRevision } : {}),
          timestamp: new Date().toISOString()
        };
        await writeFsFile(resDir, `${p.id}.result.json`, JSON.stringify(okRes, null, 2));
        if (p.baseId && p.baseId !== p.id) {
          await writeFsFile(resDir, `${p.baseId}.result.json`, JSON.stringify(okRes, null, 2));
        }
        await syncStateOnly(dirHandle, api);
        lastSyncedRevision = applied.revision;
        state.lastSync = new Date().toISOString();
        appliedIds.add(p.baseId);
        appliedIds.add(p.id);
        processedIds.add(p.baseId);
        state.lastResult = okRes;
        state.pending = null;
        state.error = null;
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
        if (p.baseId && p.baseId !== p.id) {
          await writeFsFile(resDir, `${p.baseId}.result.json`, JSON.stringify(rejRes, null, 2));
        }
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
      console.log('[HALO File Bridge] connect() called with:', handle?.name);
      const validHandle = asDirectoryHandle(handle);
      if (!validHandle) {
        state.error = 'Invalid directory handle: missing getDirectoryHandle or getFileHandle';
        state.connected = false;
        dirHandle = null;
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        console.error('[HALO File Bridge] connect(): invalid directory handle', handle);
        notify();
        return;
      }
      dirHandle = validHandle;
      state.directoryName = validHandle.name || 'HALO-Bridge';
      state.savedDirectory = null;
      state.error = null;
      state.busy = true;
      notify();
      try {
        await storeDirectoryHandle(validHandle, win);
        console.log('[HALO File Bridge] stored folder handle in IndexedDB');
        // Ensure subfolders
        await dirHandle.getDirectoryHandle('requests', { create: true });
        await dirHandle.getDirectoryHandle('responses', { create: true });
        console.log('[HALO File Bridge] ensured requests/ and responses/ directories');
        // Sync context
        await syncAllContext(dirHandle, api);
        lastSyncedRevision = api.getProjectState().revision;
        state.lastSync = new Date().toISOString();
        state.connected = true;
        console.log('[HALO File Bridge] connected successfully, revision:', lastSyncedRevision);
        // Start polling
        if (pollInterval) clearInterval(pollInterval);
        const intervalMs = env.pollInterval !== undefined ? env.pollInterval : 1500;
        if (intervalMs > 0) {
          pollInterval = setInterval(checkFolder, intervalMs);
          if (typeof pollInterval?.unref === 'function') pollInterval.unref();
        }
        state.busy = false;
        await checkFolder();
      } catch(e) {
        console.error('[HALO File Bridge] connect() failed with exception:', e);
        state.error = (e && e.message) ? e.message : String(e);
        state.connected = false;
        dirHandle = null;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
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
      const handle = asDirectoryHandle(stored.handle);
      if (!handle) {
        await clearStoredDirectory(win);
        state.savedDirectory = null;
        notify();
        return;
      }
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
        lastSyncedRevision = api.getProjectState().revision;
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
      console.log('[HALO File Bridge] resetLocalChanges initiated on folder:', dirHandle.name);
      state.busy = true;
      notify();
      try {
        try {
          const reqDir = await dirHandle.getDirectoryHandle('requests', { create: false });
          for await (const [name] of reqDir.entries()){
            try { await reqDir.removeEntry(name, { recursive: true }); } catch {}
          }
          console.log('[HALO File Bridge] cleared requests/ folder');
        } catch(e) {
          console.warn('[HALO File Bridge] note on cleaning requests/:', e?.message);
        }
        try {
          const resDir = await dirHandle.getDirectoryHandle('responses', { create: false });
          for await (const [name] of resDir.entries()){
            try { await resDir.removeEntry(name, { recursive: true }); } catch {}
          }
          console.log('[HALO File Bridge] cleared responses/ folder');
        } catch(e) {
          console.warn('[HALO File Bridge] note on cleaning responses/:', e?.message);
        }

        processedIds.clear();
        processedContent.clear();
        appliedIds.clear();
        consecutiveErrors = 0;
        state.pending = null;
        state.lastResult = null;
        state.error = null;

        // Re-export current project state without resetting project or touching localStorage
        await syncAllContext(dirHandle, api);
        lastSyncedRevision = api.getProjectState().revision;
        state.lastSync = new Date().toISOString();
        console.log('[HALO File Bridge] resynced context files with current project, revision:', lastSyncedRevision);

        const isRu = lang === 'ru';
        const msg = isRu ? 'Папка очищена, текущий проект синхронизирован' : 'Folder cleaned, current project re-synced';
        if (typeof win?.toast === 'function') {
          win.toast(msg);
        } else if (typeof win?.HaloNotification === 'function') {
          win.HaloNotification(msg);
        }
      } catch(e) {
        console.error('[HALO File Bridge] resetLocalChanges failed:', e);
        state.error = (e && e.message) ? e.message : String(e);
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function rebaseAndRetry(){
      if (!dirHandle) return;
      state.busy = true;
      notify();
      try {
        await syncStateOnly(dirHandle, api);
        lastSyncedRevision = api.getProjectState().revision;
        state.lastSync = new Date().toISOString();

        if (state.lastResult?.id) {
          processedContent.delete(state.lastResult.id);
          processedIds.delete(state.lastResult.id);
        }
        state.error = null;
        state.lastResult = null;
        consecutiveErrors = 0;
        await checkFolder();
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
      rebaseAndRetry,
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
                let targetHandle = asDirectoryHandle(s.savedDirectory?.handle) || asDirectoryHandle(s.savedDirectory);
                if (!targetHandle) {
                  const picker = root.showDirectoryPicker;
                  if (typeof picker !== 'function') throw Error(tr('File System Access API недоступен в этом браузере', 'File System Access API is not supported in this browser'));
                  const picked = await picker({ mode: 'readwrite' });
                  await bridge.connect(picked);
                  return;
                }
                if (typeof targetHandle.requestPermission === 'function') {
                  const perm = await targetHandle.requestPermission({ mode: 'readwrite' });
                  if (perm === 'granted') {
                    await bridge.connect(targetHandle);
                    return;
                  } else {
                    alert(tr('Доступ к папке не был разрешен пользователем', 'Folder permission was not granted by the user'));
                    return;
                  }
                }
                const picker = root.showDirectoryPicker;
                if (typeof picker === 'function') {
                  const picked = await picker({ mode: 'readwrite' });
                  await bridge.connect(picked);
                  return;
                }
                await bridge.connect(targetHandle);
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
        btnReset.textContent = tr('↺ Очистить запросы', '↺ Reset Requests');
        btnReset.title = tr('Очистить requests/, responses/ и заново синхронизировать текущий проект в папку', 'Clear requests/, responses/ and re-sync current project into folder');
        btnReset.onclick = async () => {
          const isRu = language() === 'ru';
          const confirmed = await (typeof win.HaloConfirm === 'function' ? win.HaloConfirm({
            title: isRu ? 'Очистить запросы в папке?' : 'Clear Folder Requests?',
            message: isRu
              ? 'Очистить папки requests/ и responses/ и заново выгрузить текущий проект в папку? Ваш проект в браузере останется без изменений.'
              : 'Clear requests/ and responses/ folders and re-export current project? Your browser project will remain unchanged.',
            confirmText: isRu ? 'Очистить папку' : 'Clear Folder',
            cancelText: isRu ? 'Отмена' : 'Cancel',
            danger: false
          }) : Promise.resolve(win.confirm ? win.confirm(isRu ? 'Очистить запросы в папке?' : 'Clear folder requests?') : true));
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
          const isRevMismatch = String(s.error || s.lastResult?.error || '').includes('CONFLICT_REVISION_MISMATCH');
          if (isRevMismatch) {
            errText.textContent = tr(
              'Несовпадение ревизий: проект в браузере изменился. Нажмите «Согласовать ревизию», чтобы обновить снимок и применить команду агента.',
              'Revision mismatch: project in browser changed. Click "Rebase & Retry" to refresh passport and apply agent command.'
            );
          } else {
            errText.textContent = tr('Если ошибка не уходит, очистите запросы папки и попросите нейросеть повторить запрос.', 'If the error persists, clear folder requests and ask the AI agent to repeat the request.');
          }

          const btnGroup = document.createElement('div');
          btnGroup.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';

          if (isRevMismatch) {
            const btnRebase = document.createElement('button');
            btnRebase.className = 'glass-btn';
            btnRebase.style.cssText = 'font-size:10px;padding:3px 10px;min-height:26px;background:rgba(30,110,95,.6);border-color:#7df0dc;color:#d8fff8;cursor:pointer;white-space:nowrap;font-weight:600;';
            btnRebase.textContent = tr('⚡ Согласовать ревизию', '⚡ Rebase & Retry');
            btnRebase.title = tr('Обновить снимок на диске и повторно оценить запрос агента', 'Refresh snapshot on disk and re-evaluate agent request');
            btnRebase.onclick = () => bridge.rebaseAndRetry();
            btnGroup.append(btnRebase);
          }

          const errBtn = document.createElement('button');
          errBtn.className = 'glass-btn';
          errBtn.style.cssText = 'font-size:10px;padding:3px 10px;min-height:26px;background:rgba(180,60,50,.4);border-color:#f8a39a;color:#ffdada;cursor:pointer;white-space:nowrap;';
          errBtn.textContent = tr('↺ Очистить запросы в папке', '↺ Clear Folder Requests');
          errBtn.title = tr('Очистить папки requests/ и responses/ и заново выгрузить текущий проект в папку', 'Clear requests/ and responses/ and re-export current project');
          errBtn.onclick = async () => {
            const isRu = language() === 'ru';
            const confirmed = await (typeof win.HaloConfirm === 'function' ? win.HaloConfirm({
              title: isRu ? 'Очистить запросы в папке?' : 'Clear Folder Requests?',
              message: isRu
                ? 'Очистить папки requests/ и responses/ и заново выгрузить текущий проект в папку? Ваш проект в браузере останется без изменений.'
                : 'Clear requests/ and responses/ folders and re-export current project? Your browser project will remain unchanged.',
              confirmText: isRu ? 'Очистить папку' : 'Clear Folder',
              cancelText: isRu ? 'Отмена' : 'Cancel',
              danger: false
            }) : Promise.resolve(win.confirm ? win.confirm(isRu ? 'Очистить запросы в папке?' : 'Clear folder requests?') : true));
            if (confirmed) {
              await bridge.resetLocalChanges(language());
            }
          };
          btnGroup.append(errBtn);
          errSuggest.append(errText, btnGroup);
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

      if (!s.connected && s.error) {
        const connErrCard = document.createElement('div');
        connErrCard.style.cssText = 'margin-top:8px;padding:8px 12px;background:rgba(230,80,60,.16);border:1px solid rgba(248,163,154,.45);border-radius:8px;color:#ffd8d4;font-size:11px;line-height:1.45;';
        connErrCard.innerHTML = `
          <div style="font-weight:600;display:flex;align-items:center;gap:6px;margin-bottom:4px;color:#ffb8b0;">
            <span>⚠</span> ${tr('Ошибка подключения папки:','Folder connection error:')}
          </div>
          <div style="font-family:monospace;font-size:10px;background:rgba(0,0,0,.3);padding:4px 8px;border-radius:4px;margin-bottom:6px;word-break:break-all;">
            ${s.error}
          </div>
          <div style="font-size:10px;color:#c9dce8;">
            ${tr('Проверьте права доступа к папке или выберите другую папку. Подробный стек ошибки выведен в консоль браузера (F12).','Check folder permissions or choose another directory. Detailed error stack is available in browser console (F12).')}
          </div>
        `;
        statusBox.append(connErrCard);
      }

      // Pending Request Banner
      if (s.pending) {
        pendingBox.style.display = 'block';
        pendingBox.replaceChildren();

        const pHead = document.createElement('div');
        pHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px;';
        const rebaseBadge = s.pending.rebased ? `<span style="font-size:9.5px;padding:2px 7px;background:rgba(126,240,220,.15);border:1px solid #7ef0dc;color:#a8fbeb;border-radius:999px;">${tr(`✓ Ревизия согласована (${s.pending.originalBaseRevision} → ${s.pending.transaction.baseRevision})`, `✓ Auto-rebased (${s.pending.originalBaseRevision} → ${s.pending.transaction.baseRevision})`)}</span>` : '';
        pHead.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong style="color:#d8ffff;font-size:11px;">🔔 ${tr('Входящий запрос от агента:','Incoming agent request:')} <span style="color:#7ef0dc;">${s.pending.id}</span></strong>
            ${rebaseBadge}
          </div>
          <span style="font-size:10px;color:#a2bacb;">Base rev: ${s.pending.transaction.baseRevision}</span>
        `;
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
      <li><code>requests/</code> — ${tr('Папка входящих команд агента: отдельные JSON или бандлы-папки (например, request-001.json или request-001/manifest.json)','Incoming agent command folder: standalone JSON or subfolder bundles (e.g. request-001.json or request-001/manifest.json)')}</li>
      <li><code>responses/</code> — ${tr('Папка ответов HALO (например, request-001.result.json)','HALO response folder (e.g. request-001.result.json)')}</li>
    `;

    el('strong', tr('Пример запроса для агента (Bionic / Antigravity / Codex):', 'Example prompt for agent (Bionic / Antigravity / Codex):'), 'display:block;font-size:11px;margin-bottom:4px;');
    const promptBox = el('div', tr(
      '«Прочитай AGENT_GUIDE.md в папке HALO-Bridge. Изучи возможности HALO и текущий проект в project-state.json. Сочини оригинальный новогодний джингл на 8 тактов, используя только встроенные инструменты. Запиши команду в папку requests/ и заверши работу, чтобы я мог подтвердить изменения в HALO».',
      '“Read AGENT_GUIDE.md in the HALO-Bridge folder. Study HALO capabilities and the current project in project-state.json. Compose an original eight-bar New Year jingle using only built-in sounds. Write your request file to the requests/ folder and terminate your turn so I can approve the changes in HALO.”'
    ), 'font-size:10px;line-height:1.5;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px;color:#d5ebf5;user-select:all;');
  }

  const api = {
    generateCapabilities,
    generateInstruments,
    generateMusicRules,
    generateProjectState,
    generateAgentGuide,
    getContextFiles,
    resolveRequestPayloadSync,
    resolveRequestPayload,
    resolveAndValidateRequest,
    parseAndValidateRequest,
    processRequest,
    createBridge,
    panel: renderFileBridgePanel
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloFileBridge = api;
})(globalThis);
