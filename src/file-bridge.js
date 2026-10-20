/* HALO File Bridge for desktop Chrome/Edge via native File System Access API. Zero server, 100% static. */
(function(root){
  'use strict';
  const bridges = new WeakMap();

  function clone(x){ return JSON.parse(JSON.stringify(x)); }


  // Evidence about authored attacks, not an estimate of audible sustain or musical quality.
  function emptyBarRuns(counts){
    const ranges=[]; let start=null;
    for(let i=0;i<=counts.length;i++){
      if(i<counts.length && counts[i]===0){if(start===null)start=i;}
      else if(start!==null){if(i-start>=2)ranges.push([start+1,i]);start=null;}
    }
    return ranges;
  }
  function auditScore(project,caps){
    const pitchNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const phrases=(project.phrases || [{id:null,project}]).map(phrase=>{
      const p=phrase.project,meter=p.timeSignature||'4/4',stepsPerBar=meter==='3/4'?12:16;
      const barSeconds=(meter==='3/4'?3:4)*60/project.tempo,key=caps.harmony.keys[p.key];
      const root=pitchNames.indexOf(key.root.replace(/♯/g,'#'));
      return {phraseId:phrase.id,bars:p.bars,meter,key:key.name,barSeconds,seconds:p.bars*barSeconds,
        scalePitchClasses:caps.harmony.scales[key.mode].map(n=>(root+n)%12),
        voices:p.tracks.map(t=>{
          const counts=t.exact?Array(p.bars).fill(0):null;
          if(counts)for(const step of t.steps)counts[Math.floor(step/stepsPerBar)]++;
          const pitches=[...new Set((t.noteEvents||[]).flatMap(e=>e.notes.map(n=>n%12)))].sort((a,b)=>a-b);
          return {role:t.role,sound:t.sound,enabled:t.on&&t.level>0,source:t.exact?'authored':'generated',
            attacksPerBar:counts,firstStep:t.exact&&t.steps.length?t.steps[0]:null,lastStep:t.exact&&t.steps.length?t.steps[t.steps.length-1]:null,
            pitchClasses:pitches};
        })};
    });
    let elapsed=0;
    const sections=(project.sections||[{phrase:null,repeats:1}]).map(section=>{
      const phrase=phrases.find(p=>p.phraseId===section.phrase),seconds=phrase.seconds*section.repeats;
      const item={phraseId:section.phrase,repeats:section.repeats,startSeconds:elapsed,seconds};elapsed+=seconds;return item;
    });
    return {tempo:project.tempo,seconds:elapsed,phrases,sections,pitchClassReference:['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B'],
      meaning:'attacksPerBar counts authored event starts in one-based bars, not sounding duration. Zero does not prove silence; generated parts are unknown (null). Key/scale labels do not transpose or quantize literal MIDI. This is not listening or artistic approval.'};
  }

  function diagnoseScore(project,audit){
    const report=[];
    const warn=(code,path,ru,en)=>report.push({severity:'warning',code,path,ru,en});
    for(const phrase of project.phrases || [{id:null,project}]) {
      const p=phrase.project, path=phrase.id===null?'score':'phrase '+phrase.id;
      const size=p.bars*(p.timeSignature==='3/4'?12:16);
      // Retained generator parts in edit mode have no authored event coverage to inspect.
      const generated=p.tracks.some(t=>t.on&&t.level>0&&!t.exact);
      const active=p.tracks.filter(t=>t.on&&t.level>0&&t.exact&&t.steps.length);
      for(const t of p.tracks.filter(t=>t.exact)) {
        if((!t.on||t.level===0)&&t.steps.length) warn('SILENT_PART',path+'.'+t.role,'Партия содержит события, но выключена или имеет нулевую громкость','Part has events but is off or at zero level');
        if(t.on&&!t.steps.length) warn('EMPTY_PART',path+'.'+t.role,'Включённая партия без событий','Enabled part has no events');
      }
      if(!active.length&&!generated) warn('SILENT_PHRASE',path,'Нет звучащих партий','No sounding parts');
      else if(active.length&&!generated&&active.every(t=>t.steps.every(step=>step<size/2))) warn('EMPTY_SECOND_HALF',path,'Во второй половине нет новых событий; хвосты звуков могут продолжаться','No new events in the second half; sound tails may continue');

      const evidence=audit.phrases.find(p=>p.phraseId===phrase.id);
      for(const t of active.filter(t=>t.noteEvents?.length)){
        const counts=evidence.voices.find(v=>v.role===t.role).attacksPerBar,ranges=emptyBarRuns(counts);
        if(ranges.length){
          const bars=ranges.map(([a,b])=>a+'–'+b).join(', ');
          warn('PART_BAR_GAP',path+'.'+t.role,'Нет новых нот в тактах '+bars+'; проверьте замысел, хвосты не анализируются','No new notes in bars '+bars+'; check the intended rest/development, sustain is not analyzed');
        }
      }
      const melody=active.find(t=>t.role==='melody');
      if(melody?.noteEvents?.length) {
        const half=size/2, first=melody.noteEvents.filter(e=>e.step<half), second=melody.noteEvents.filter(e=>e.step>=half).map(e=>({...e,step:e.step-half}));
        if(first.length&&JSON.stringify(first)===JSON.stringify(second)) warn('REPEATED_MELODY',path+'.melody','Мелодия повторяет первую половину без изменения нот','Melody repeats the first half without note changes');
      }
      if(!generated&&active.length>=3&&active.every(t=>JSON.stringify(t.steps)===JSON.stringify(active[0].steps))) warn('SHARED_RHYTHM',path,'Все звучащие партии используют один ритм','All sounding parts use the same rhythm');
    }
    return report;
  }

  // Composer-facing notation. All output still passes the authoritative agent preview.
  function compileScore(score, api, report = []){
    const caps = api.getCapabilities(), state = api.getProjectState();
    const registry = generateInstruments(caps), errors = [];
    const fail = (path, message) => errors.push(path + ': ' + message);
    const object = (value, allowed, path) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) { fail(path, 'expected ONE object, not an array, string or list of sounds'); return false; }
      for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path + '.' + key, 'unknown field; allowed: ' + allowed.join(', '));
      return true;
    };
    object(score, scoreFields, 'score');
    for (const field of ['mode','world','tempo','bars','meter','key']) if (!Object.hasOwn(score,field)) fail('score.'+field,'required explicit field');
    const edit = score.mode === 'edit';
    if (score.mode !== undefined && !['edit','replace'].includes(score.mode)) fail('score.mode', 'use replace for new music or edit to preserve unmentioned voices');
    if (!Number.isSafeInteger(score.baseRevision)) fail('score.baseRevision', 'copy the revision number from project-state.json');
    const current = state.project;
    let source = current;
    if (current.phrases) {
      const found = current.phrases.find(p => p.id === score.phraseId);
      if (edit && !found) fail('score.phraseId', 'editing a song requires an existing phrase ID from project-state.json');
      source = (found || current.phrases[0]).project;
    } else if (score.phraseId !== undefined) fail('score.phraseId', 'only supported when editing an existing song');
    if (score.phraseId !== undefined && !edit) fail('score.phraseId', 'only supported in edit mode');
    const world = score.world ?? (edit ? source.setup : 'ambient');
    if (!['ambient','reactor'].includes(world)) fail('score.world', 'use ambient or reactor');
    if (edit && world !== source.setup) fail('score.world', 'edit preserves the sound world; use replace to create music in another world');
    const keys = caps.harmony.keys;
    const keyIndex = (value, fallback, path) => {
      if (value === undefined) return fallback;
      const name = typeof value === 'string' ? value.trim().toUpperCase().replace(/#/g, '\u266f') : '';
      const index = keys.findIndex(k => k.name === name);
      if (index < 0) { fail(path, 'use a key name such as C major or D minor'); return fallback; }
      return index;
    };
    const rootKey = keyIndex(score.key, edit ? source.key : 2, 'score.key');
    const tempo = score.tempo ?? current.tempo;
    if (typeof tempo !== 'number' || !Number.isFinite(tempo) || tempo < 30 || tempo > 200) fail('score.tempo', 'expected BPM from 30 to 200');
    const controls = ['level','character','duration','space','delay','chorus'];
    const makePhrase = (spec, path) => {
      const bars = spec.bars ?? score.bars ?? (edit ? source.bars : 8);
      const meter = spec.meter ?? score.meter ?? (edit ? source.timeSignature || '4/4' : '4/4');
      const key = keyIndex(spec.key, rootKey, path + '.key');
      if (![4,8].includes(bars)) fail(path + '.bars', 'use 4 or 8');
      if (!['4/4','3/4'].includes(meter)) fail(path + '.meter', 'use 4/4 or 3/4');
      const limit = bars * (meter === '3/4' ? 12 : 16);
      const voices = spec.voices;
      object(voices, caps.roles.map(r => r.id), path + '.voices');
      const project = {...clone(source), setup:world, tempo, bars, timeSignature:meter, startStep:0, key};
      if (!edit) project.seed = 1;
      project.tracks = caps.roles.map((role, i) => {
        const part = voices?.[role.id];
        if (edit && part === undefined) return clone(source.tracks[i]);
        const pool = registry.sounds.filter(s => s.setups.includes(world) && s.compatibleRoles.includes(role.id));
        const preferred = pool.find(s => s.affinityRoles.includes(role.id)) || pool[0];
        let sound = preferred;
        if (part?.sound !== undefined) {
          sound = pool.find(s => s.canonicalId === part.sound);
          if (!sound) { fail(path + '.voices.' + role.id + '.sound', 'choose one of: ' + pool.map(s=>s.canonicalId).join(', ')); sound = preferred; }
        } else if (edit) {
          sound = pool.find(s => s.canonicalId === source.tracks[i].sound);
          if (!sound && part) fail(path+'.voices.'+role.id+'.sound', 'retained sound is incompatible; choose an explicit compatible canonical ID');
          sound ||= preferred;
        }
        if (part && part.sound === undefined && !edit) fail(path+'.voices.'+role.id+'.sound', 'required explicit canonical sound ID');
        const track = edit ? clone(source.tracks[i]) : {name:role.slot,level:50,density:100,character:50,duration:50,space:30,delay:0,chorus:0};
        // A timbre/level-only edit must not turn a generated voice into another generator.
        if (!edit || part?.sound !== undefined || part?.notes !== undefined || part?.steps !== undefined) {
          Object.assign(track, {instrument:sound?.bankId, sound:sound?.canonicalId});
        }
        if (!edit) Object.assign(track, {role:role.id,generator:3});
        if (part === undefined) return {...track,on:false,exact:true,steps:[],noteEvents:[],noteTranspose:keys[key].offset};
        const partPath = path + '.voices.' + role.id;
        if (!object(part, voiceFields, partPath)) return track;
        if (part.on !== undefined && typeof part.on !== 'boolean') fail(partPath + '.on', 'expected true or false');
        for (const field of controls) if (part[field] !== undefined) {
          if (typeof part[field] !== 'number' || !Number.isFinite(part[field]) || part[field] < 0 || part[field] > 100) fail(partPath + '.' + field, 'expected 0..100');
          else track[field] = part[field];
        }
        const hasNotes = part.notes !== undefined, hasSteps = part.steps !== undefined;
        if (hasNotes && hasSteps) fail(partPath, 'use notes for pitched music OR steps for percussion, not both');
        const pitched = ['bass','melody','arpeggio','harmony'].includes(role.id);
        if ((pitched || sound?.pitched) && hasSteps) fail(partPath + '.steps', 'pitched voices require notes, e.g. [[0,60],[4,64]]');
        if (sound && !sound.pitched && hasNotes) fail(partPath+'.notes', 'unpitched timbres require steps');
        if (!edit && !hasNotes && !hasSteps) fail(partPath, 'supply notes or steps (an empty array means silence)');
        if (hasNotes || hasSteps) {
          const entries = hasNotes ? part.notes : part.steps;
          const events = [], steps = [], seen = new Set();
          if (!Array.isArray(entries) || entries.length > 128) fail(partPath, 'expected at most 128 events');
          else for (const [n, entry] of entries.entries()) {
            const step = hasNotes ? entry?.[0] : entry;
            if (!Number.isInteger(step) || step < 0 || step >= limit || seen.has(step)) { fail(partPath + '[' + n + ']', 'step must be unique and in 0..' + (limit-1)); continue; }
            seen.add(step); steps.push(step);
            if (hasNotes) {
              const notes = Array.isArray(entry) ? entry.slice(1) : [];
              if (!notes.length || notes.length > role.maxNotes || notes.some(note=>!Number.isInteger(note)||note<0||note>127)) fail(partPath + '.notes[' + n + ']', 'use [step, MIDI, ...], 1..' + role.maxNotes + ' notes, MIDI 0..127');
              events.push({step,notes});
            }
          }
          Object.assign(track, {role:role.id,generator:3,steps:steps.sort((a,b)=>a-b),noteEvents:events.sort((a,b)=>a.step-b.step),exact:true,noteTranspose:keys[key].offset});
        }
        track.on = part.on ?? (edit ? track.on : true);
        return track;
      });
      return project;
    };
    let operations;
    if (score.phrases !== undefined) {
      if (edit || score.voices !== undefined || score.phraseId !== undefined) fail('score.phrases', 'song creation uses replace mode and phrases instead of root voices');
      if (!Array.isArray(score.phrases) || !score.phrases.length || score.phrases.length > 15) fail('score.phrases', 'expected 1..15 phrases');
      if (!Array.isArray(score.sections) || !score.sections.length || score.sections.length > 32) fail('score.sections', 'expected 1..32 sections');
      const phrases = (Array.isArray(score.phrases) ? score.phrases.slice(0,15) : []).map((p,i) => {
        object(p,['id','bars','meter','key','voices'],'score.phrases['+i+']');
        return {id:p?.id,project:makePhrase(p || {}, 'score.phrases['+i+']')};
      });
      const sections = (Array.isArray(score.sections) ? score.sections.slice(0,32) : []).map((s,i) => {
        object(s,['phrase','repeats','name','fade'],'score.sections['+i+']');
        return {...s,repeats:s?.repeats??1,name:s?.name??'phrase',fade:s?.fade??'none'};
      });
      if (score.repeat !== undefined && typeof score.repeat !== 'boolean') fail('score.repeat','expected true or false');
      operations = [{op:'composition.replace',project:{format:'halo-composition',version:1,tempo,masterVolume:current.masterVolume,mix:clone(current.mix),repeat:score.repeat??false,phrases,sections}}];
    } else {
      if (score.sections !== undefined || score.repeat !== undefined) fail('score.sections', 'sections/repeat require phrases');
      const project = makePhrase(score, 'score');
      if (edit && current.phrases) {
        const song = clone(current);
        const target = song.phrases.find(p=>p.id===score.phraseId);
        if (target) target.project = project;
        song.tempo = tempo;
        for (const p of song.phrases) p.project.tempo = tempo;
        operations = [{op:'composition.replace',project:song}];
      } else operations = [{op:'project.replace',project}];
    }
    if (errors.length) throw Error('SCORE_ERROR:\n' + errors.slice(0,16).join('\n'));
    return {requestId:score.requestId,schemaVersion:1,baseRevision:score.baseRevision,operations};
  }

  const protocolVersion = 3;
  const references = {
    agentGuide: 'AGENT_GUIDE.md#contents',
    capabilities: 'capabilities.json',
    instruments: 'instruments.json',
    musicRules: 'music-rules.json',
    projectState: 'project-state.json'
  };
  const scoreFields = ['format','requestId','baseRevision','mode','world','tempo','bars','meter','key','voices','phraseId','phrases','sections','repeat'];
  const voiceFields = ['sound','notes','steps','on','level','character','duration','space','delay','chorus'];
  function generateCapabilities(caps){
    return {
      schemaVersion: protocolVersion, protocol: 'halo-score', engine: 'NotBad Halo Music Constructor',
      references, authority: 'File Bridge score contract only. WebMCP is a separate API.',
      delivery: {request:'requests/<ID>.json', receipt:'responses/<ID>.result.json',
        companion:'requests/<ID>--<role>.json', reference:'<ID>--<role>.json',
        directories:'HALO creates requests/ and responses/. Agents never create directories.',
        publication:'Complete and read back companions first, publish and read back request last.',
        root:'Verify one connected root containing AGENT_GUIDE.md, project-state.json, requests/ and responses/. Fix ROOT, STATE, ID, REQUEST and RECEIPT once.'},
      limits: {tempo:caps.limits.bpm,bars:caps.limits.bars,tracks:caps.limits.tracks,stepsPerBar:{'4/4':16,'3/4':12},phrases:caps.limits.phrases,sections:caps.limits.sections,totalBars:caps.limits.totalBars,bytes:caps.limits.bytes},
      score: {fields:scoreFields, required:['format','baseRevision','mode','world','tempo','bars','meter','key'],
        format:'halo-score', mode:['replace','edit'], world:['ambient','reactor'], tempo:[30,200], bars:[4,8], meter:['4/4','3/4'],
        shape:'Exactly one of voices (phrase) or phrases + sections (song). Song creation requires replace. Song edit requires phraseId.',
        phrases:{fields:['id','bars','meter','key','voices'],required:['id','voices'],max:15},
        sections:{fields:['phrase','repeats','name','fade'],required:['phrase'],max:32,
          names:['intro','verse','verse2','chorus','bridge','outro','phrase'],fade:['none','in','out'],defaults:{repeats:1,name:'phrase',fade:'none'}},
        repeat:'Boolean; song only, default false.',
        voices:{roles:caps.roles.map(r=>r.id),fields:voiceFields,
          creation:'voices is an object keyed by role. Each role contains ONE object, ONE sound string and exactly one notes/steps event array. Never an array of sounds. Omitted roles are silent.',
          editing:'Unmentioned voices and fields are preserved; changing sound is explicit.',
          notes:'[step, MIDI, ...] with unique steps, integer MIDI 0..127 and role polyphony from instruments.json.tracks.',
          steps:'Unique integer hits for unpitched timbres only; [] means intentional silence.',
          controls:'on is boolean; level, character, duration, space, delay, chorus are 0..100.',
          defaults:{on:true,level:50,character:50,duration:50,space:30,delay:0,chorus:0}},
        strict:'Unknown fields, aliases, prefixed/case-variant sounds, operation envelopes and unsafe references are errors. No automatic revision rebasing.'},
      receipts:{statuses:['pending_approval','applied','rejected','error'],
        identity:'id equals ID; requestId, if supplied, equals the request basename.',
        freshness:'After correction require a changed submissionVersion for pending/error. Matching applied/rejected are terminal.',
        checks:'Read immediately; absent/stale only: built-in wait 4–5 seconds, at most 3 reads. Without wait tool: one immediate reread. Never shell waits.',
        corrections:2, approval:'Receipt statuses are output only, never request commands. Only the HALO user can approve. Stop on pending_approval and invite human approval; never poll for it.',
        idLifecycle:'Each later user musical change needs a new ID and live revision. Same ID is only for the current unfinished submission within the same turn. Reported pending, applied and rejected end it.',
        evidence:'scoreAudit contains actual seconds, named keys, scale/pitch classes and per-role attacksPerBar. Counts are event starts, not sustain or musical quality. scoreReport warns PART_BAR_GAP for two or more consecutive bars without new notes in an active authored pitched part.',
        enforcement:'HALO cannot police external receipt reads or file writes; those limits require the external tool adapter.'}
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
            bankId: slotKey,
            canonicalId,
            name: s.name,
            pitched: !!s.playback?.pitched,
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
      trackIndex: i, slot: r.slot, role: r.id, name: r.label,
      description: r.description, policy: r.policy, maxNotes: r.maxNotes,
      noteRange: { minMidi: r.minMidi ?? 24, maxMidi: r.maxMidi ?? 96 }
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
      chorus: {
        range: [0, 100],
        musicalMeaning: 'Stereo chorus modulation send for shimmering pitch detuning and width expansion.'
      },
      level: {
        range: [0, 100],
        musicalMeaning: 'Individual voice gain level (0..100%).'
      },
    };

    return {
      schemaVersion: protocolVersion,
      description: 'HALO Voice and Instrument Registry. 8 simultaneous voices with assigned musical roles, compatible banks, note registers, and sonic parameter meanings.',
      references: {
        agentGuide: 'AGENT_GUIDE.md (submission workflow)',
        capabilities: 'capabilities.json (strict score vocabulary, delivery and limits)',
        musicRules: 'music-rules.json (HALO grid and supported key names)',
        projectState: 'project-state.json (Read-only live state snapshot, base revision, active voices)'
      },
      concepts: {
        physicalSlot:'tracks[].trackIndex and slot are fixed UI identities, not instrument banks or timbre descriptions.',
        musicalRole:'tracks[].role is the voices key. GLASS=pulse, TIDAL=accent, ROOT=percussion; read all eight mappings in tracks.',
        soundBank:'sounds[].bankId identifies the internal source bank, not the destination slot. Never send instrument in a score.',
        timbre:'Choose sounds[].canonicalId literally as voice.sound, filtered by world in setups and role in compatibleRoles.',
        affinity:'affinityRoles are recommended orchestration, compatibleRoles are hard constraints. Neither reassigns a physical slot.',
        pitch:'Pitched timbres require notes, unpitched timbres use steps. Register octave folding remains possible.'
      },
      sounds: allSounds,
      tracks: roles,
      parameterGlossary,
      soundWorlds: {
        ambient: {
          description: '30 procedural synthesis patches designed for meditative, calming soundscapes.',
          selection: 'Filter sounds by setups containing ambient and compatibleRoles containing the target role.'
        },
        reactor: {
          description: '32 organic presets backed by 130 authentic CC0 acoustic/electric instrument recordings.',
          selection: 'Filter sounds by setups containing reactor and compatibleRoles containing the target role.'
        }
      }
    };
  }

  function generateMusicRules(caps){
    return {schemaVersion:protocolVersion,references,
      description:'Optional HALO grid and key reference; musical composition is the agent’s task.',
      timeSignatures:{'4/4':{stepsPerBar:16,phraseSteps:{4:64,8:128}},'3/4':{stepsPerBar:12,phraseSteps:{4:48,8:96}}},
      keys:caps.harmony.keys.map(k=>k.name),
      events:'Absolute phrase steps; unique steps per voice. Integer MIDI 0..127; per-role polyphony and acoustic ranges are in instruments.json.',
      pitch:'Authored MIDI is literal. The key label does not transpose or quantize it; existing acoustic octave folding still applies.'};
  }

  function generateProjectState(state){
    return {
      schemaVersion: protocolVersion,
      notice: 'READ-ONLY LIVE SNAPSHOT. Do not edit this file directly. Submit change requests to requests/<requestId>.json.',
      references: {
        agentGuide: 'AGENT_GUIDE.md (submission workflow)',
        capabilities: 'capabilities.json (strict score vocabulary, delivery and limits)',
        instruments: 'instruments.json (8 voices, sound catalogs by setup, note registers, role policies)',
        musicRules: 'music-rules.json (HALO grid and supported key names)'
      },
      revision: state.revision,
      exportedAt: new Date().toISOString(),
      project: state.project,
      visual: state.visual || null
    };
  }

  function generateAgentGuide(caps){
    const registry=generateInstruments(caps);
    const roles=caps.roles.map(r=>'| '+r.id+' | '+r.maxNotes+' |').join('\n');
    const palette=['ambient','reactor'].map(world=>'### '+world+'\n| sound | Timbre | Recommended roles |\n| --- | --- | --- |\n'+
      registry.sounds.filter(s=>s.setups.includes(world)).map(s=>'| '+s.canonicalId+' | '+s.name+(s.pitched?' (pitched)':' (unpitched)')+' | '+s.affinityRoles.join(', ')+' |').join('\n')).join('\n\n');
    return `# HALO: compose music

Turn the user's musical request into one JSON score. Compose the notes yourself; HALO plays the submitted events.

## Contents
[Format](#required-json-structure) · [Instruments](#instruments) · [Delivery](#delivery) · [References](#references)

## Required JSON structure
Root is one object. All fields below are required; format is the exact string "halo-score".

| Field | Type / allowed values |
| --- | --- |
| format | string: "halo-score" |
| baseRevision | integer: current project-state.json.revision |
| mode | string: replace or edit |
| world | string: ambient or reactor |
| tempo | number: 30..200 BPM |
| bars | integer: 4 or 8 |
| meter | string: 4/4 or 3/4 |
| key | named key string; supported names in music-rules.json |
| voices | object mapping role IDs to Voice objects |

Each Voice is ONE object with ONE sound string, not an array of instruments.
- sound: exact ID from the selected world's catalog below. Required for new music; edits may retain it.
- notes: array of tuples [absoluteStep, MIDI, ...] for a pitched sound. A tuple contains one step and one or more MIDI integers (0..127); several MIDI values form a chord.
- steps: flat array of integer hit positions for an unpitched sound, INSTEAD OF notes.
- Optional: on (boolean); level, character, duration, space, delay, chorus (numbers 0..100). duration controls the voice envelope. No per-note duration or velocity.

New voices require notes OR steps. Empty arrays mean intentional silence. Each step occurs once per voice; 16 steps/bar in 4/4, 12 in 3/4, counted from zero across the whole phrase. Events do not repeat automatically. Authored MIDI is literal; changing key alone does not transpose it. Acoustic register folding may apply.

replace creates new music with omitted roles silent; edit preserves unmentioned parts/fields. Editing a song requires root phraseId from STATE. Slots and instrument banks are routed internally: use role keys and sound IDs only. Unknown fields, lyrics, descriptions and planning/audit objects are not accepted.

For a song use root phrases and sections INSTEAD OF voices, with mode replace. Each phrase has id (unique positive integer), voices and optional bars/meter/key inherited from root. Each section has phrase (ID), optional repeats (1..8, default 1), name (intro/verse/verse2/chorus/bridge/outro/phrase, default phrase), fade (none/in/out, default none). Optional root repeat is boolean, default false. Limits: 15 phrases, 32 sections, 128 total bars; 512 KiB for request plus companions. Optional requestId must equal the filename ID; no id field.

## Instruments
One role = one simultaneous timbre; different timbres need different compatible roles or phrases. Recommended roles below are valid choices. For other assignments consult instruments.json.sounds[].compatibleRoles and ranges. One world per score/song.

| Role | Maximum notes per event |
| --- | --- |
${roles}

${palette}

## Delivery
1. Verify the connected ROOT contains this guide, project-state.json and existing requests/ and responses/. Read live STATE; stop if ROOT/access cannot be verified. Fix ROOT once; create no directories.
2. Use a new unused ASCII ID (letters/digits with single - or _ separators, at most 128 chars) for each new user musical request. Write ROOT/requests/ID.json and read it back. Optional voice companions are ROOT/requests/ID--role.json, containing the Voice object; its reference contains only file with that basename. Complete/read companions first, publish root last.
3. Read only ROOT/responses/ID.result.json with matching id. pending_approval: report status and invite approval in HALO, then stop. applied/rejected: stop. Statuses are receipts, never commands to write. Read scoreReport as advisory diagnostics; scoreAudit is event/timing evidence.
4. For error, correct this unfinished submission under the same ID at most twice. After correction require a changed submissionVersion for pending/error receipts. For absent/stale receipt: at most 3 reads, using built-in waits of 4–5 seconds; without a wait tool one immediate reread. Then report unconfirmed and stop. Never poll for human approval. Use file tools, not shell commands, servers or browsers. A reported pending/applied/rejected ID is finished; further user music changes need a new ID and live revision.

## References
capabilities.json: complete fields/limits/receipt contract. instruments.json: detailed sound compatibility and ranges. music-rules.json: HALO grid and supported key names. project-state.json: live read-only project and revision. These are optional lookups apart from STATE; no additional music tutorial is required.
`;
  }

  function getContextFiles(api){
    const caps = api.getCapabilities();
    const state = api.getProjectState();
    return {
      'AGENT_GUIDE.md': generateAgentGuide(caps),
      'capabilities.json': JSON.stringify(generateCapabilities(caps), null, 2),
      'instruments.json': JSON.stringify(generateInstruments(caps), null, 2),
      'music-rules.json': JSON.stringify(generateMusicRules(caps), null, 2),
      'project-state.json': JSON.stringify(generateProjectState(state), null, 2)
    };
  }

  function scoreIdentity(req, fallbackId){
    if (!req || typeof req !== 'object' || Array.isArray(req) || req.format !== 'halo-score') throw Error('SCORE_ERROR: only format halo-score is accepted; root.format must be the exact string \"halo-score\". Write an event score using AGENT_GUIDE.md#required-json-structure, not lyrics or an arrangement description. receipt/status/approved objects are not requests. Human approval happens only in HALO.');
    const id = fallbackId || req.requestId;
    if (typeof id !== 'string' || id.length > 128 || !/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/.test(id)) throw Error('SCORE_ERROR: invalid ID; use ASCII letters/digits separated by single - or _');
    if (req.requestId !== undefined && req.requestId !== id) throw Error('SCORE_ERROR: requestId must match the request filename ID');
    return id;
  }
  function scoreReferences(req, id){
    const refs=[];
    for (const phrase of [req,...(Array.isArray(req.phrases)?req.phrases:[])]) {
      for (const [role,part] of Object.entries(phrase?.voices||{})) if (part && Object.hasOwn(part,'file')) {
        if (Object.keys(part).length!==1 || !['pulse','accent','percussion','texture','bass','melody','arpeggio','harmony'].includes(role) || part.file!==id+'--'+role+'.json') throw Error('SCORE_ERROR: companion must be '+id+'--<role>.json with file as its only field');
        refs.push({voices:phrase.voices,role,path:part.file});
      }
    }
    return refs;
  }
  function companionValue(raw,path){
    if (raw===undefined || raw===null) throw Error('FILE_NOT_FOUND: '+path);
    try { return typeof raw==='string'?JSON.parse(raw):clone(raw); }
    catch(err){ throw Error('SCORE_ERROR: invalid JSON in '+path+': '+err.message); }
  }
  function resolveRequestPayloadSync(parsed, reader, fallbackId){
    const id=scoreIdentity(parsed,fallbackId),req=clone(parsed);
    for (const ref of scoreReferences(req,id)) {
      if (!reader) throw Error('FILE_NOT_FOUND: no file reader for '+ref.path);
      ref.voices[ref.role]=companionValue(reader(ref.path),ref.path);
    }
    return req;
  }
  async function resolveRequestPayload(parsed, reader, fallbackId){
    const id=scoreIdentity(parsed,fallbackId),req=clone(parsed);
    for (const ref of scoreReferences(req,id)) {
      if (!reader) throw Error('FILE_NOT_FOUND: no file reader for '+ref.path);
      ref.voices[ref.role]=companionValue(await reader(ref.path),ref.path);
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
      resolved = await resolveRequestPayload(parsed, fileReader, fallbackId);
    } catch(err) {
      return { ok: false, error: err.message, id: fallbackId };
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
        parsed = resolveRequestPayloadSync(parsed, (p) => options.files[p], fallbackId);
      } catch(err) {
        return { ok: false, error: err.message, id: fallbackId };
      }
    }

    const scoreMode = parsed.mode;
    const scoreReport = [];
    try {
      scoreIdentity(parsed,fallbackId);
      if (new TextEncoder().encode(JSON.stringify(parsed)).length > (api.getCapabilities().limits.bytes || 524288)) throw Error('PAYLOAD_TOO_LARGE');
      parsed = compileScore(parsed, api, scoreReport);
    } catch(err) { return {ok:false,error:err.message,id:fallbackId}; }
    const transaction = parsed;
    const requestId = String(parsed.requestId || transaction.requestId || fallbackId);

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(requestId)) return {ok:false,error:'INVALID_REQUEST_ID: use 1..128 letters, digits, hyphens or underscores',id:fallbackId};


    const currentRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
    const isRevisionMismatch = transaction.baseRevision !== currentRevision;
    if (isRevisionMismatch) {
      return {
        ok: false,
        error: `CONFLICT_REVISION_MISMATCH: expected revision ${currentRevision}, request was based on ${transaction.baseRevision}`,
        id: requestId,
        currentRevision
      };
    }

    const effectiveTransaction = transaction;

    let preview;
    try {
      preview = api.previewOperations(effectiveTransaction);
    } catch(err) {
      return { ok: false, error: 'SCORE_ERROR: ' + err.message, id: requestId, currentRevision };
    }

    const scoreAudit=auditScore(preview.after,api.getCapabilities());
    return {
      ok: true,
      id: requestId,
      transaction: effectiveTransaction,
      preview,
      scoreMode, scoreAudit, scoreReport:[...scoreReport,...diagnoseScore(preview.after,scoreAudit)],
      currentRevision
    };
  }

  function generateErrorGuidance(errorMessage, consecutiveCount = 1){
    const msg=String(errorMessage||'');
    if(msg==='REJECTED_BY_USER')return {help:'The user rejected this proposal. This ID is terminal.',instructionForAgent:'STOP. Never rewrite or resubmit this ID or write an approval command. A later user music request requires a new ID and live STATE revision.'};
    const help=msg.includes('score.format') || msg.includes('only format halo-score')
      ? 'Read AGENT_GUIDE.md#required-json-structure. Root requires format: halo-score. voices maps each role to ONE object with one sound string and actual numeric notes/steps arrays. Remove lyrics, composition_notes and bar_audit_plan; do not merely add format to a descriptive document.'
      : msg.includes('CONFLICT_REVISION')
      ? 'Read STATE again and reconcile the score with user changes. Never change baseRevision alone to bypass a conflict.'
      : msg.includes('FILE_NOT_FOUND')
        ? 'Check the exact fixed ROOT/requests/<ID>--<role>.json companion. Write and read back companions before publishing REQUEST. Never create folders or change ROOT.'
        : 'Keep format halo-score. Read the indicated field and capabilities.json; sound IDs and role compatibility are in instruments.json. Do not switch formats or locations.';
    return {help,instructionForAgent:consecutiveCount>=3
      ? 'STOP: two correction rounds exhausted. Report the exact error and fixed paths.'
      : 'Correct only the indicated cause in the same ID and paths, at most two rounds. Read the matching RECEIPT and require a changed submissionVersion after correction. Stop on pending_approval, applied or rejected.'};
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
        status:'applied', scoreReport:validated.scoreReport, scoreAudit:validated.scoreAudit,
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
    const content = JSON.stringify(generateProjectState(state), null, 2);
    await writeFsFile(dirHandle, 'project-state.json', content);
    // Keep the self-contained composer guide's revision current without rewriting catalogs.
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
            const detail = error.name === 'NotFoundError' ? 'FILE_NOT_FOUND: Companion file '+JSON.stringify(path)+' is missing inside the fixed requests/ directory' : 'COMPANION_READ_ERROR: '+JSON.stringify(path)+': '+error.message;
            files.set(path, {error:detail});
            throw Error(detail);
          }
        }, fallbackId);
        // Score-only validation preserves the original revision.
        // Validation happens after the content identity check below.
      } catch(error) {
        parsed = {ok:false, id:fallbackId, error:error.message};
      }
      const fingerprint = JSON.stringify([text, [...files].sort(([a],[b])=>a.localeCompare(b))]);
      const previous = submissionCache.get(fallbackId);
      if (!force && previous?.fingerprint === fingerprint) return previous;
      if (!parsed) parsed = parseAndValidateRequest(api, resolved, fallbackId, {});
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
            if (result.id === name.slice(0,-12) && ['rejected','applied'].includes(result.status)) {
              terminalIds.add(name.slice(0, -12));
            }
          } catch {}
        }
        for await (const [name, handle] of reqDir.entries()) {
          if (handle.kind !== 'file' || !name.endsWith('.json') || name.includes('--')) continue;
          const baseId = name.slice(0,-5);
          if (!/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/.test(baseId) || baseId.length>128 || terminalIds.has(baseId)) continue;
          if (state.pending && state.pending.baseId !== baseId) continue;
          const directory=reqDir, requestFile=handle, filename=name;
          const text = await cachedText(requestFile, 'request/' + baseId);
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
            ...(parsed.scoreMode ? {scoreMode:parsed.scoreMode,scoreReport:parsed.scoreReport,scoreAudit:parsed.scoreAudit} : {}),
};
          // Private handles/fingerprint are not serialized into UI or context files.
          pendingSource = {directory, requestFile, fingerprint:submission.fingerprint};
          const response = {ok:true, status:'pending_approval', applied:false, id:parsed.id, submissionVersion:submission.submissionVersion,
            baseRevision:parsed.transaction.baseRevision, currentRevision:parsed.currentRevision,
            instructionForAgent:'Inspect scoreAudit and every scoreReport item. After reporting pending_approval, STOP; only the user approves in HALO. Never write status/approved commands. A later user musical change requires a NEW ID and live STATE.',
            ...(parsed.scoreReport ? {scoreReport:parsed.scoreReport,scoreAudit:parsed.scoreAudit} : {}),
timestamp:new Date().toISOString()};
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
          const current = await readSubmission(pendingSource.directory, await readFsFile(pendingSource.requestFile), p.baseId, true);
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
          instructionForAgent:'STOP. This ID is applied and terminal. Never rewrite it or wait for approval. A later user musical change requires a NEW ID and live STATE.',
          ...(p.scoreReport ? {scoreReport:p.scoreReport,scoreAudit:p.scoreAudit} : {}),
timestamp:new Date().toISOString()};
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

    async function refreshSnapshot(){
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
      refreshSnapshot,
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
              'Revision mismatch: project changed. Refresh the snapshot and ask the agent to reconcile the score with the current project.'
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
            btnRebase.textContent = tr('Обновить снимок', 'Refresh snapshot');
            btnRebase.title = tr('Обновить снимок на диске и повторно оценить запрос агента', 'Refresh snapshot on disk and re-evaluate agent request');
            btnRebase.onclick = () => bridge.refreshSnapshot();
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
        pHead.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong style="color:#d8ffff;font-size:11px;">🔔 ${tr('Входящий запрос от агента:','Incoming agent request:')} <span style="color:#7ef0dc;">${s.pending.id}</span></strong>
          </div>
          <span style="font-size:10px;color:#a2bacb;">Base rev: ${s.pending.transaction.baseRevision}</span>
        `;
        pendingBox.append(pHead);

        const pOps = document.createElement('ul');
        pOps.style.cssText = 'margin:6px 0 10px 18px;padding:0;font-size:10px;color:#cbe2ee;';
        if (s.pending.scoreMode) {
          const after = s.pending.preview.after;
          const heading = document.createElement('p');
          heading.style.cssText = 'font-size:11px;line-height:1.5;color:#d8ffff;';
          heading.textContent = (s.pending.scoreMode === 'edit' ? tr('Правка партитуры','Score edit') : tr('Новая партитура: замена музыки','New score: replaces music')) +
            ` · ${after.tempo} BPM · ` + (after.phrases ? `${after.phrases.length} ${tr('фраз','phrases')}, ${after.sections.length} ${tr('секций','sections')}` : `${after.bars} ${tr('тактов','bars')}`);
          pendingBox.append(heading);
          const roleNames = {pulse:['Пульс','Pulse'],accent:['Акцент','Accent'],percussion:['Перкуссия','Percussion'],texture:['Фактура','Texture'],bass:['Бас','Bass'],melody:['Мелодия','Melody'],arpeggio:['Арпеджио','Arpeggio'],harmony:['Гармония','Harmony']};
          const roles = api.getCapabilities().roles;
          for (const phrase of after.phrases || [{id:null,project:after}]) {
            for (const [i, track] of phrase.project.tracks.entries()) {
              const li = document.createElement('li'), role = roleNames[roles[i].id];
              li.textContent = (phrase.id === null ? '' : `${tr('Фраза','Phrase')} ${phrase.id}: `) + tr(...role) +
                ' — ' + (track.on ? `${track.sound}, ${tr('событий:','events:')} ${track.steps.length}` : tr('выкл.','off'));
              pOps.append(li);
            }
          }
        }
        pendingBox.append(pOps);

        if(s.pending.scoreAudit){
          const audit=s.pending.scoreAudit,details=document.createElement('details'),summary=document.createElement('summary');
          details.style.cssText='margin:8px 0;font-size:11px;line-height:1.5;overflow-x:auto;';
          summary.textContent=tr('События по тактам','Events per bar')+' · '+Number(audit.seconds.toFixed(2))+' '+tr('с','s');
          details.append(summary);
          const note=document.createElement('p');
          note.textContent=tr('Числа — начала событий, не длительность звучания. 0 не доказывает тишину; ? — сохранённая генеративная партия.','Counts are event starts, not sounding duration. 0 does not prove silence; ? is a retained generated part.');details.append(note);
          for(const phrase of audit.phrases){
            const title=document.createElement('p');title.textContent=(phrase.phraseId===null?'':tr('Фраза ','Phrase ')+phrase.phraseId+' · ')+phrase.key+' · '+phrase.meter+' · '+Number(phrase.barSeconds.toFixed(2))+' '+tr('с/такт','s/bar');details.append(title);
            const table=document.createElement('table'),head=document.createElement('tr');table.style.cssText='border-collapse:collapse;font-size:10px;white-space:nowrap;';
            for(const text of [tr('Партия','Part'),...Array.from({length:phrase.bars},(_,i)=>String(i+1))]){
              const cell=document.createElement('th');cell.textContent=text;cell.style.padding='3px 7px';head.append(cell);
            }
            table.append(head);
            for(const voice of phrase.voices){
              const row=document.createElement('tr');
              for(const text of [voice.role+(voice.enabled?'':' ('+tr('выкл.','off')+')'),...(voice.attacksPerBar||Array(phrase.bars).fill('?'))]){
                const cell=document.createElement('td');cell.textContent=String(text);cell.style.cssText='padding:3px 7px;border-top:1px solid rgba(255,255,255,.1);';row.append(cell);
              }
              table.append(row);
            }
            details.append(table);
          }
          pendingBox.append(details);
        }
        if(s.pending.scoreReport?.length) {
          const report=document.createElement('ul');
          report.style.cssText='font-size:11px;line-height:1.5;color:#ead5a5;';
          for(const item of s.pending.scoreReport) {
            const row=document.createElement('li');
            row.textContent=(item.severity==='warning'?tr('Предупреждение: ','Warning: '):tr('Исправлено: ','Adapted: '))+item.path+' — '+tr(item.ru,item.en);
            report.append(row);
          }
          pendingBox.append(report);
        }

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
      <li><code>AGENT_GUIDE.md</code> — ${tr('Формат, инструменты и передача запроса','Format, instruments and delivery')}</li>
      <li><code>capabilities.json</code> — ${tr('Контракт партитуры, пути, статусы и лимиты','Score contract, paths, statuses and limits')}</li>
      <li><code>instruments.json</code> — ${tr('8 голосов, пресеты, совместимость и звуковой смысл каждого параметра','8 voices, presets, compatibility, and sonic meaning of each parameter')}</li>
      <li><code>music-rules.json</code> — ${tr('Сетки HALO и названия тональностей','HALO grids and supported key names')}</li>
      <li><code>project-state.json</code> — ${tr('Снимок текущей композиции (ревизия, ноты, фразы) — только для чтения','Snapshot of active composition (revision, notes, phrases) — read-only')}</li>
      <li><code>requests/</code> — ${tr('Готовая папка входящих команд: пишите JSON-файлы прямо сюда (request-001.json и request-001--melody.json), без создания подпапок','Prepared incoming folder: write JSON files directly here (request-001.json and request-001--melody.json), without creating subfolders')}</li>
      <li><code>responses/</code> — ${tr('Папка ответов HALO (например, request-001.result.json)','HALO response folder (e.g. request-001.result.json)')}</li>
    `;

    el('strong', tr('Пример запроса для агента (Bionic / Antigravity / Codex):', 'Example prompt for agent (Bionic / Antigravity / Codex):'), 'display:block;font-size:11px;margin-bottom:4px;');
    const promptBox = el('div', tr(
      '«Вот папка HALO. Прочитай AGENT_GUIDE.md, сочини новогодний джингл на 8 тактов и передай его в HALO. Сообщи статус».',
      '“Here is the HALO folder. Read AGENT_GUIDE.md, compose an eight-bar New Year jingle and send it to HALO. Report the status.”'
    ), 'font-size:10px;line-height:1.5;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px;color:#d5ebf5;user-select:all;');
  }

  const api = {
    auditScore,
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
