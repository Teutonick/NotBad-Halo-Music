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
      submission: {
        recommended: 'Write requests/<requestId>/ companion files first; manifest.json last.',
        response: 'responses/<requestId>.result.json',
        statuses: ['pending_approval', 'applied', 'error', 'rejected'],
        receiptVersion: 'submissionVersion covers manifest and companions; an unchanged receipt after an edit is stale, wait for a new scan.',
        tolerantInput: 'File only: direct track fields, digit-string trackIndex, case/whitespace in IDs, world-prefixed sound IDs; conflicting duplicates remain errors.',
        noResponse: 'Unconfirmed; never infer success from silence.',
        correction: 'Companion-only changes are detected. Pending changes require a new review; applied request IDs are immutable.',
        fileToolLimits: 'Split writes to fit the external file tool. No universal 1.5 KB engine limit.'
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
      schemaVersion: 2,
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
      sounds: allSounds.map(sound => ({ ...sound, id: sound.world + ':' + sound.canonicalId })),
      tracks: roles.map(r => ({ ...r,
        soundsBySetup: Object.fromEntries(Object.entries(r.soundsBySetup).map(([setup, sounds]) => [setup, sounds.map(s => allSounds.find(x => x.sound === s.sound && x.instrument === s.instrument).world + ':' + s.canonicalId)])),
        compatibleSounds: r.compatibleSounds.map(s => s.world + ':' + s.canonicalId)
      })),
      parameterGlossary,
      soundWorlds: {
        ambient: {
          description: '30 procedural synthesis patches designed for meditative, calming soundscapes.',
          soundIds: allSounds.filter(s => s.setups.includes('ambient')).map(s => s.world + ':' + s.canonicalId)
        },
        reactor: {
          description: '32 organic presets backed by 130 authentic CC0 acoustic/electric instrument recordings.',
          soundIds: allSounds.filter(s => s.setups.includes('reactor')).map(s => s.world + ':' + s.canonicalId)
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
    const keys = caps.harmony?.keys || [];
    const keyIndex = name => keys.findIndex(k => k.name === name);
    return `# HALO Agent Guide / AI Instruction Manual

## Context Files Map & Documentation Architecture
Read this guide, project-state.json (READ-ONLY revision and score), capabilities.json (operations and constraints), instruments.json (canonical sounds and role references), and music-rules.json (grid and indexed keys). Do not edit exported context files.

## ZERO-PROMPT-ENGINEERING CREATIVE DIRECTIVE
Translate the user's musical intention into original explicit MIDI parts. No technical prompting is required from the user. All eight voices are available for scoring; inspect mute states instead of assuming all are enabled.

## Strict 4-Step Agent Workflow & Verification Protocol
1. Read the context and current revision (${state.revision} at export). For long edits prefer a paused transport. Select compatible sounds by the active setup and role.
2. Compose the full requested duration. Write JSON companion files first, preferably one track or phrase per file in requests/<requestId>/. Keep each write comfortably below YOUR file-writing tool's argument/output limit; use smaller parts for separate operations, or bounded append/edit calls to complete a larger individual file. There is no universal 1.5 KB HALO limit and no 1-2 track restriction. Read back and parse the files with your available file tools before publishing. Do not execute HALO to validate them.
3. Write manifest.json LAST, after all companion files are complete. Use a fresh requestId containing only letters, digits, hyphens or underscores (maximum 128 characters). Small single-file requests remain supported. Example:
\`\`\`json
{"requestId":"req-holiday","schemaVersion":1,"baseRevision":${state.revision},"operations":[{"op":"project.patch","values":{"setup":"ambient","bars":8,"tempo":96,"key":${keyIndex('C MAJOR')}}},{"op":"track.patch","trackIndex":5,"file":"track-5.json"}]}
\`\`\`
Companion track-5.json contains mutable values, for example {"instrument":"GLASS","sound":"bell","on":true,"noteTranspose":-2,"steps":[0,32,64,96,124],"noteEvents":[{"step":0,"notes":[76]},{"step":32,"notes":[77]},{"step":64,"notes":[79]},{"step":96,"notes":[76]},{"step":124,"notes":[72]}]}. This is a sparse format illustration, not a complete holiday score. For full replacement use project.replace with exactly eight tracks, each optionally {"file":"track-N.json"}. For a song use composition.replace, phrases[{id,label,project}], and sections[{phrase,name,repeats,fade}]. Labels: 1..10 letters/digits, no spaces. All references are relative to the bundle root; no absolute paths or parent traversal. Existing flat files, include aliases and parts arrays remain compatible, but folder bundles are the recommended long-score path.
4. Wait 4-5 seconds, then inspect responses/<requestId>.result.json. status="pending_approval" means validated and awaiting the human's approval; status="applied" means appliedRevision is committed; status="error" means inspect error/help/instructionForAgent, fix the indicated files and retry at most twice; status="rejected" means stop and respect the decision. No response means UNCONFIRMED, never success: ask the user to check the folder connection/page or an earlier pending proposal. Do not poll indefinitely. End the turn after an explicit pending acknowledgement. Do not change files after acknowledgement: HALO applies only the validated snapshot; edits invalidate it and require a new review. Use a NEW requestId after application.

## Copyable inline form and correction receipts
Inline track operation: {"op":"track.patch","trackIndex":5,"values":{"instrument":"GLASS","sound":"bell","steps":[0],"noteEvents":[{"step":0,"notes":[76]}]}}.
A companion contains the values object itself, NOT an array. Flat layout is equally supported: requests/req-holiday.json references "req-holiday-track-5.json" beside it. Never rename companion files without updating references. A missing file is a publication/path error, not a musical error. Publish the manifest last even when your export tool reorders files.
File-only acceptance tolerates track fields directly on an operation, digit-string trackIndex, case/whitespace in operation/instrument/sound IDs and ambient-/reactor- sound prefixes. Conflicting duplicate fields are errors. Unknown fields, unsafe paths, incompatible sounds, note bounds and revision safeguards remain strict. Prefer the canonical values form above.
Responses contain submissionVersion, a token covering the manifest AND referenced files. After a correction, an unchanged token/timestamp is an OLD receipt: wait for the next scan before diagnosing it again. Keep the same requestId and filenames for corrections; do not leave several competing manifests. Never treat an older error as evidence that the corrected version failed. If a fresh receipt does not arrive, report unconfirmed connection/publication rather than rewriting the score again.

## CRITICAL DIRECTIVE: Read-Only vs Mutable Fields
STRICTLY PROHIBITED IN \`values\`: role, name, slot, trackIndex. track.patch targets trackIndex 0..7; in a multi-phrase composition also specify phraseId. Allowed values are listed in capabilities.json.trackFields. Custom steps/noteEvents imply exact=true when omitted; explicit exact=false remains invalid. Supply steps containing every noteEvents.step. For literal MIDI set noteTranspose to keysAndScales.circleOfFifths[key].offset, NOT the key index. Choose instrument and canonicalId from instruments.json.sounds, with compatibleRoles containing the slot role. Bank identity is independent of track slot. Sound IDs have no world prefix.

## 8 Voice Slots & Role Polyphony Architecture
${(caps.roles || []).map((r,i)=>`${i}: ${r.slot} / ${r.id}, maximum ${r.maxNotes} notes per event`).join('\n')}
Exactly eight tracks for a replacement. Explicit notes for every pitched event; percussion can use steps alone. No per-note duration or velocity; envelope settings are per track. Preserve unrelated tracks and Track 09 local references when editing.

## THE FULL-SPAN DURATION PRINCIPLE (MANDATORY MUSICAL INTEGRITY)
4/4: 16 steps/bar, 4 bars=64 or 8 bars=128 steps. 3/4: 12 steps/bar, 4 bars=48 or 8 bars=96 steps; eight-bar mode displays the compound 6/8 feel. Exact steps do not repeat a one-bar pattern automatically. Score across all bars with intentional rests, not accidental silence after step 15.

## Quick Prompt-to-Architecture Decision Matrix
DEFAULT MODE: SINGLE PHRASE for a loop/jingle. A complete song explicitly requested by the user uses composition.replace. AMBIENT vs REACTOR: ambient procedural bells/pads for calm holiday music; reactor local CC0 drums/guitar/piano for adventure rock. MAXIMUM 15 UNIQUE PHRASES, 32 sections, 128 total bars. Reuse phrase IDs for recurring sections. Allowed section names: intro, verse, verse2, chorus, bridge, outro, phrase. Intro -> Verse -> Chorus -> Verse2 -> Chorus -> Outro is one possible form, not a mandatory template.

### RECIPE A: Holiday / New Year 8-Bar Jingle
C Major: key ${keyIndex('C MAJOR')}, noteTranspose ${keys[keyIndex('C MAJOR')]?.offset}, ambient, 96 BPM, 8 bars in 4/4. Original bell melody (slot5), bass (slot4), light rhythm (slot2), four-note harmony (slot7). Score other voices deliberately; all eight may be rewritten. Select exact sound/bank IDs from the registry.

### RECIPE B: Epic Cinematic Soundtrack / Pirates of the Caribbean
D Minor: key ${keyIndex('D MINOR')}, noteTranspose ${keys[keyIndex('D MINOR')]?.offset}, reactor, 104 BPM, 8-bar phrases in 3/4 (96 steps). Write an ORIGINAL adventure theme with compound accents at 0 and 6, bass, guitar lead and piano chords. Use independent Intro, Verse, Chorus and Outro phrases with deliberate dynamics, repeats and a final fade out. Do not claim orchestral instruments absent from the catalog.

## File Bridge boundaries
NO LOCALHOST, NO WEBSERVERS, NO PORTS. NO CLI OR EXECUTABLES for running HALO. NO BROWSER LAUNCHING by a folder-only composition agent. HALO is already open and connected; use file tools only. No server, model key, account or uploads. File-writing tool limits belong to the external harness, not WebMCP. Request size and engine limits remain in capabilities.json. Approval and audio startup remain user-controlled.
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

  // File-only compatibility layer: never coerce musical values or discard unknown fields.
  function normalizeFileRequest(parsed, api){
    const req = clone(parsed), tx = req.transaction || req;
    const fields = api.getCapabilities().trackFields || [];
    for (const op of tx.operations || []) {
      if (!op || typeof op !== 'object') continue;
      if (typeof op.op === 'string') op.op = op.op.trim().toLowerCase();
      if (op.op !== 'track.patch') continue;
      if (typeof op.trackIndex === 'string' && /^[0-7]$/.test(op.trackIndex)) op.trackIndex = Number(op.trackIndex);
      if (op.values === undefined) op.values = {};
      if (!op.values || typeof op.values !== 'object' || Array.isArray(op.values)) continue;
      for (const key of fields) if (Object.hasOwn(op, key)) {
        if (Object.hasOwn(op.values, key) && JSON.stringify(op.values[key]) !== JSON.stringify(op[key])) throw Error('AMBIGUOUS_FIELD: ' + key + ' differs between operation and values');
        op.values[key] = op[key]; delete op[key];
      }
      if (typeof op.values.instrument === 'string') op.values.instrument = op.values.instrument.trim().toUpperCase();
      if (typeof op.values.sound === 'string') op.values.sound = op.values.sound.trim().toLowerCase().replace(/^(ambient|reactor)-/, '');
    }
    return req;
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

    try { parsed = normalizeFileRequest(parsed, api); }
    catch (err) { return {ok:false, error:err.message, id:String(parsed.requestId || fallbackId)}; }
    const transaction = parsed.transaction || parsed;
    const requestId = String(parsed.requestId || transaction.requestId || fallbackId);

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(requestId)) return {ok:false,error:'INVALID_REQUEST_ID: use 1..128 letters, digits, hyphens or underscores',id:fallbackId};


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

    const currentRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
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
    } else if (msg.includes('Invalid track role')) {
      help = msg + '. Slot role is fixed by trackIndex, independently of instrument bank. Read instruments.json compatibleRoles; do not move files or change their names to fix a role error.';
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
        currentRevision: (api.getRevision ? api.getRevision() : api.getProjectState().revision)
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
    let active = true, panelVisible = null, cachedBytes = 0;
    const doc = env.window?.document || root.document;
    const fileCache = new Map();
    const responseCache = new Map();
    const submissionCache = new Map();
    async function cachedText(handle, key, force = false){
      const file = await handle.getFile();
      const version = Number.isFinite(file.lastModified) && Number.isFinite(file.size) ? file.lastModified + ':' + file.size : null;
      const old = fileCache.get(key);
      if (!force && version !== null && old?.version === version) return old.text;
      if (file.size > requestByteLimit) throw Error('PAYLOAD_TOO_LARGE');
      const text = await file.text();
      if (fileCache.size >= 512 || cachedBytes + text.length * 2 > 4194304) { fileCache.clear(); cachedBytes = 0; }
      cachedBytes -= (fileCache.get(key)?.text.length || 0) * 2;
      fileCache.set(key, {version, text}); cachedBytes += text.length * 2;
      return text;
    }
    function canPoll(){ return active && !doc?.hidden && (!panelVisible || panelVisible()); }
    let consecutiveErrors = 0;
    let lastSyncedRevision = null;
    const listeners = new Set();
    const processedContent = new Map();
    const terminalIds = new Set();
    const win = env.window || root;
    const requestByteLimit = api.getCapabilities().limits.bytes || 524288;

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

    let notificationSnapshot = null;
    function notify(){
      // lastCheck changes on every idle scan but is not a UI change. Avoid
      // cloning a potentially large pending score just to redraw nothing.
      const next = [state.connected,state.directoryName,state.savedDirectory,state.lastSync,state.pending,state.lastResult,state.error,state.busy,state.autoApply,state.supported];
      if (notificationSnapshot && next.every((value,index)=>value===notificationSnapshot[index])) return;
      notificationSnapshot = next;
      for (const fn of listeners) {
        try { fn(clone(state)); } catch {}
      }
    }

    // A submission is a snapshot of the root AND every referenced companion.
    // Cache reads within one scan so repeated references resolve consistently.
    async function readSubmission(directory, text, fallbackId, force = false){
      const cached = submissionCache.get(fallbackId);
      if (!force && cached?.rootText === text) {
        let unchanged = true;
        for (const [path, value] of cached.companions) {
          if (value.error) { unchanged = false; break; }
          try {
            const handle = await directory.getFileHandle(path, {create:false});
            if (await cachedText(handle, fallbackId + '/' + path) !== value.text) { unchanged = false; break; }
          } catch { unchanged = false; break; }
        }
        if (unchanged) return cached;
      }
      const files = new Map();
      let bytes = new TextEncoder().encode(text).length;
      const maxBytes = requestByteLimit;
      let parsed, resolved;
      try {
        if (bytes > maxBytes) throw Error('PAYLOAD_TOO_LARGE');
        const raw = JSON.parse(text);
        resolved = await resolveRequestPayload(raw, async path => {
          if (files.has(path)) {
            const cached = files.get(path);
            if (cached.error) throw Error(cached.error);
            return cached.text;
          }
          try {
            const file = await directory.getFileHandle(path, {create:false});
            const content = await cachedText(file, fallbackId + "/" + path, force);
            bytes += new TextEncoder().encode(content).length;
            if (bytes > maxBytes) throw Error('PAYLOAD_TOO_LARGE');
            files.set(path, {text:content});
            return content;
          } catch(error) {
            const detail = error.name === 'NotFoundError' ? 'FILE_NOT_FOUND: Companion file '+JSON.stringify(path)+' is missing relative to the manifest directory' : 'COMPANION_READ_ERROR: '+JSON.stringify(path)+': '+error.message;
            files.set(path, {error:detail});
            throw Error(detail);
          }
        });
        // Rebase only to prepare a proposal, never to skip approval-time conflicts.
        // Validation happens after the content identity check below.
      } catch(error) {
        parsed = {ok:false, id:fallbackId, error:error.message};
      }
      const fingerprint = JSON.stringify([text, [...files].sort(([a],[b])=>a.localeCompare(b))]);
      const previous = submissionCache.get(fallbackId);
      if (!force && previous?.fingerprint === fingerprint) return previous;
      if (!parsed) parsed = parseAndValidateRequest(api, resolved, fallbackId, {allowRebase:true});
      // Correlation token, not a security hash. Includes companion content.
      let hash = 2166136261;
      for (let i=0;i<fingerprint.length;i++) hash = Math.imul(hash ^ fingerprint.charCodeAt(i), 16777619);
      const submission = {parsed, fingerprint, rootText:text, companions:[...files], submissionVersion:(hash >>> 0).toString(16).padStart(8,'0')};
      if (submissionCache.size >= 16) submissionCache.clear();
      submissionCache.set(fallbackId, submission);
      return submission;
    }

    async function writeResponse(response, baseId){
      const resDir = await dirHandle.getDirectoryHandle('responses', {create:true});
      for (const id of new Set([response.id, baseId])) {
        if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) continue;
        await writeFsFile(resDir, `${id}.result.json`, JSON.stringify(response, null, 2));
      }
    }

    function errorResponse(id, error){
      const guidance = generateErrorGuidance(error, ++consecutiveErrors);
      return {ok:false, status:'error', id, error, ...guidance, consecutiveErrors,
        currentRevision:(api.getRevision ? api.getRevision() : api.getProjectState().revision), timestamp:new Date().toISOString()};
    }

    async function checkFolder(automatic = false){
      if (!dirHandle || state.busy || (automatic && !canPoll())) return;
      state.busy = true;
      try {
        const currentRev = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
        if (currentRev !== lastSyncedRevision) {
          await syncStateOnly(dirHandle, api);
          lastSyncedRevision = currentRev;
          state.lastSync = new Date().toISOString();
        }
        const reqDir = await dirHandle.getDirectoryHandle('requests', {create:true});
        const resDir = await dirHandle.getDirectoryHandle('responses', {create:true});
        for await (const [name, handle] of resDir.entries()) {
          if (handle.kind !== 'file' || !name.endsWith('.result.json')) continue;
          try {
            const responseText = await cachedText(handle, 'response/' + name);
            if (responseCache.get(name) === responseText) continue;
            if (responseCache.size >= 512) responseCache.clear();
            responseCache.set(name, responseText);
            const result = JSON.parse(responseText);
            if (result.status === 'rejected' || (result.ok === false && result.error === 'REJECTED_BY_USER') || (result.ok === true && (result.status === 'applied' || (!result.status && Number.isInteger(result.appliedRevision))))) {
              terminalIds.add(name.slice(0, -12));
            }
          } catch {}
        }
        for await (const [name, handle] of reqDir.entries()) {
          const baseId = handle.kind === 'directory' ? name : name.replace(/\.json$/i, '');
          if (!/^[a-zA-Z0-9_-]{1,128}$/.test(baseId) || terminalIds.has(baseId)) continue;
          // One human review at a time; other requests remain unacknowledged.
          if (state.pending && state.pending.baseId !== baseId) continue;
          let directory = reqDir, manifest = handle, filename = name;
          if (handle.kind === 'directory') {
            directory = handle;
            manifest = null;
            for (const candidate of ['manifest.json','request.json',`${baseId}.json`,'index.json']) {
              try { manifest = await handle.getFileHandle(candidate, {create:false}); filename = `${name}/${candidate}`; break; } catch {}
            }
            if (!manifest) continue;
          } else if (handle.kind !== 'file' || !name.endsWith('.json') || name.startsWith('_') || name.startsWith('.') || /^t[0-7]\.json$/i.test(name) || /[.-](track|part|t)[0-7]?\./i.test(name)) continue;
          const text = await cachedText(manifest, 'manifest/' + baseId);
          if (handle.kind === 'file') {
            try {
              const raw = JSON.parse(text);
              if (!raw || (!raw.schemaVersion && !raw.operations && !raw.parts && !raw.requestId && !raw.transaction)) continue;
            } catch { if (!/^(request|req)[-_]/i.test(name)) continue; }
          }
          const submission = await readSubmission(directory, text, baseId);
          if (processedContent.get(baseId) === submission.fingerprint) continue;
          processedContent.set(baseId, submission.fingerprint);
          if (state.pending?.baseId === baseId) { state.pending = null; pendingSource = null; }
          const parsed = submission.parsed;
          if (terminalIds.has(parsed.id)) continue;
          if (!parsed.ok) {
            const response = {...errorResponse(parsed.id, parsed.error), submissionVersion:submission.submissionVersion};
            await writeResponse(response, baseId);
            state.lastResult = response; state.error = parsed.error;
            continue;
          }
          consecutiveErrors = 0;
          state.error = null;
          state.pending = {id:parsed.id, filename, transaction:parsed.transaction, preview:parsed.preview, baseId,
            rebased:!!parsed.rebased, originalBaseRevision:parsed.originalBaseRevision};
          // Private handles/fingerprint are not serialized into UI or context files.
          pendingSource = {directory, manifest, fingerprint:submission.fingerprint};
          const response = {ok:true, status:'pending_approval', applied:false, id:parsed.id, submissionVersion:submission.submissionVersion,
            baseRevision:parsed.transaction.baseRevision, currentRevision:parsed.currentRevision,
            ...(parsed.rebased ? {rebasedFrom:parsed.originalBaseRevision} : {}), timestamp:new Date().toISOString()};
          await writeResponse(response, baseId);
          state.lastResult = null;
          if (state.autoApply) await commitPending();
          break;
        }
        state.lastCheck = new Date().toISOString();
      } catch(error) { state.error = error.message; }
      finally { state.busy = false; notify(); }
    }

    let pendingSource = null;
    async function commitPending(){
      if (!state.pending || !dirHandle) return;
      const p = state.pending;
      let committedResponse = null;
      try {
        if (pendingSource) {
          const current = await readSubmission(pendingSource.directory, await readFsFile(pendingSource.manifest), p.baseId, true);
          if (current.fingerprint !== pendingSource.fingerprint) {
            processedContent.delete(p.baseId); fileCache.clear(); cachedBytes = 0; submissionCache.delete(p.baseId);
            state.pending = null; pendingSource = null;
            throw Error('REQUEST_CHANGED: Files changed after validation; wait for a new proposal and review it again.');
          }
        }
        api.setEnabled(true);
        const applied = await api.applyOperations(p.transaction);
        // Mark before I/O so a failed response write cannot re-apply in this session.
        terminalIds.add(p.baseId); terminalIds.add(p.id);
        state.pending = null; pendingSource = null;
        consecutiveErrors = 0;
        const response = {ok:true, status:'applied', applied:true, id:p.id,
          appliedRevision:applied.revision, currentRevision:applied.revision,
          ...(p.rebased ? {rebasedFrom:p.originalBaseRevision} : {}), timestamp:new Date().toISOString()};
        committedResponse = response;
        state.lastResult = response; state.error = null;
        await writeResponse(response, p.baseId);
        await syncStateOnly(dirHandle, api);
        lastSyncedRevision = applied.revision;
        state.lastSync = new Date().toISOString();
        state.lastResult = response; state.error = null;
      } catch(error) {
        if (committedResponse) {
          state.lastResult = committedResponse;
          state.error = 'RESPONSE_SYNC_FAILED: Project applied; folder update failed: ' + error.message;
          return;
        }
        const response = errorResponse(p.id, error.message);
        // A conflict requires a fresh validation and human review.
        if (state.pending) { state.pending = null; pendingSource = null; processedContent.delete(p.baseId); }
        state.lastResult = response; state.error = error.message;
        try { await writeResponse(response, p.baseId); } catch(writeError) { state.error += '; RESPONSE_SYNC_FAILED: ' + writeError.message; }
      }
    }

    async function applyPending(){
      if (state.busy || !state.pending) return;
      state.busy = true;
      try { await commitPending(); }
      finally { state.busy = false; notify(); }
    }

    async function rejectPending(){
      if (state.busy || !state.pending || !dirHandle) return;
      const p = state.pending;
      state.busy = true;
      try {
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });
        consecutiveErrors++;
        const guidance = generateErrorGuidance('REJECTED_BY_USER', consecutiveErrors);
        const rejRes = {
          ok: false,
          id: p.id,
          status: 'rejected',
          error: 'REJECTED_BY_USER',
          help: guidance.help,
          instructionForAgent: guidance.instructionForAgent,
          consecutiveErrors,
          currentRevision: (api.getRevision ? api.getRevision() : api.getProjectState().revision),
          timestamp: new Date().toISOString()
        };
        await writeFsFile(resDir, `${p.id}.result.json`, JSON.stringify(rejRes, null, 2));
        if (p.baseId && p.baseId !== p.id) {
          await writeFsFile(resDir, `${p.baseId}.result.json`, JSON.stringify(rejRes, null, 2));
        }
        terminalIds.add(p.baseId); terminalIds.add(p.id);
        pendingSource = null;
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
      fileCache.clear(); cachedBytes = 0; responseCache.clear(); submissionCache.clear(); processedContent.clear(); terminalIds.clear();
      pendingSource = null; state.pending = null;
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
        lastSyncedRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
        state.lastSync = new Date().toISOString();
        state.connected = true;
        console.log('[HALO File Bridge] connected successfully, revision:', lastSyncedRevision);
        // Start polling
        if (pollInterval) clearInterval(pollInterval);
        const intervalMs = env.pollInterval !== undefined ? env.pollInterval : 1500;
        if (intervalMs > 0) {
          pollInterval = setInterval(() => { if (canPoll()) void checkFolder(true); }, intervalMs);
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
        lastSyncedRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
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

        processedContent.clear();
        fileCache.clear(); cachedBytes = 0; responseCache.clear(); submissionCache.clear();
        terminalIds.clear();
        consecutiveErrors = 0;
        state.pending = null;
        state.lastResult = null;
        state.error = null;

        // Re-export current project state without resetting project or touching localStorage
        await syncAllContext(dirHandle, api);
        lastSyncedRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
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
        lastSyncedRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
        state.lastSync = new Date().toISOString();

        processedContent.clear(); submissionCache.clear();
        state.error = null;
        state.lastResult = null;
        consecutiveErrors = 0;
        state.busy = false;
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
      beginFolderSelection(){ state.busy = true; state.error = null; console.log('[HALO File Bridge] waiting for directory picker'); notify(); },
      reportConnectionError(error, locale){
        state.busy = false;
        const cancelled = error?.name === 'AbortError';
        state.error = locale === 'ru'
          ? (cancelled ? 'Выбор папки отменён или браузер не завершил подключение. Попробуйте настольный Chrome/Edge.' : 'Не удалось подключить папку: ' + error.message)
          : (cancelled ? 'Folder selection was cancelled or the browser did not complete the connection. Try desktop Chrome/Edge.' : 'Could not connect folder: ' + error.message);
        console.warn('[HALO File Bridge] directory picker:', error?.name, error?.message);
        notify();
      },
      setActive(value, visible){ active = !!value; if (visible) panelVisible = visible; },
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

    bridge.setActive(true, () => !host.getClientRects || host.getClientRects().length > 0);
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

    let lastView = '';
    function updateView(s){
      const key = JSON.stringify([s.connected,s.directoryName,s.savedDirectory?.name,s.supported,s.busy,s.lastSync,s.pending,s.lastResult,s.error,(api.getRevision ? api.getRevision() : api.getProjectState().revision)]);
      if (key === lastView) return;
      lastView = key;
      const focused = host.contains(document.activeElement) ? document.activeElement : null;
      const focusedText = focused?.textContent;
      statusBox.replaceChildren();

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;';
      statusBox.append(topRow);
      if (s.busy) { const progress=document.createElement('p'); progress.textContent=tr('Ожидание выбора папки или завершения операции браузером…','Waiting for folder selection or browser operation…'); statusBox.append(progress); }

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
                  bridge.beginFolderSelection();
                  const picked = await picker.call(root, { mode: 'readwrite' });
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
                  bridge.beginFolderSelection();
                  const picked = await picker.call(root, { mode: 'readwrite' });
                  await bridge.connect(picked);
                  return;
                }
                await bridge.connect(targetHandle);
              } catch(e) {
                bridge.reportConnectionError(e, language());
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
                bridge.beginFolderSelection();
                const handle = await picker.call(root, { mode: 'readwrite' });
                await bridge.connect(handle);
              } catch(e) {
                bridge.reportConnectionError(e, language());
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
                bridge.beginFolderSelection();
                const handle = await picker.call(root, { mode: 'readwrite' });
                await bridge.connect(handle);
              } catch(e) {
                bridge.reportConnectionError(e, language());
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
          <div>${tr('Ревизия проекта:','Project revision:')} <strong>${(api.getRevision ? api.getRevision() : api.getProjectState().revision)}</strong> · ${tr('Опрос 1,5 с только в открытой вкладке File Bridge','Polling every 1.5s only while File Bridge is visible')}</div>
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
      if (focused && !host.contains(focused)) {
        const replacement = [...host.querySelectorAll('button')].find(button => button.textContent === focusedText);
        replacement?.focus();
      }
    }

    const unsub = bridge.subscribe(updateView);
    host._haloCleanup = () => { bridge.setActive(false); unsub(); };

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
      '«Прочитай AGENT_GUIDE.md в папке HALO-Bridge. Изучи возможности HALO и текущий проект в project-state.json. Сочини оригинальный новогодний джингл на 8 тактов, используя только встроенные инструменты. Запиши файлы партий, затем манифест в requests/. Дождись ответа pending_approval в responses/, чтобы я мог подтвердить изменения в HALO».',
      '“Read AGENT_GUIDE.md in the HALO-Bridge folder. Study HALO capabilities and the current project in project-state.json. Compose an original eight-bar New Year jingle using only built-in sounds. Write companion files first, then the manifest in requests/. Wait for pending_approval in responses/ so I can approve the changes in HALO.”'
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
