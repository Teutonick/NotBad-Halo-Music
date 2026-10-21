/* HALO File Bridge for desktop Chrome/Edge via native File System Access API. Zero server, 100% static. */
(function(root){
  'use strict';
  const bridges = new WeakMap();

  function clone(x){ return JSON.parse(JSON.stringify(x)); }


  // Data-only reader: presentation repairs never execute JavaScript or invent values.
  function parseScoreText(input){
    let text=input.replace(/^\uFEFF/,'').trim();
    const fenced=text.match(/^```(?:json|jsonc|json5)?\s*\n([\s\S]*?)\n```$/i);
    if(fenced)text=fenced[1];
    if(new TextEncoder().encode(text).length>524288)throw Error('PAYLOAD_TOO_LARGE');
    let at=0;
    const fail=message=>{throw Error('INVALID_JSON: '+message+' at character '+at)};
    function space(){
      const start=at;
      while(at<text.length){
        if(/\s/.test(text[at])){at++;continue;}
        if(text.slice(at,at+2)==='//'){at+=2;while(at<text.length&&!/[\r\n]/.test(text[at]))at++;continue;}
        if(text.slice(at,at+2)==='/*'){const end=text.indexOf('*/',at+2);if(end<0)fail('Unclosed comment');at=end+2;continue;}
        break;
      }
      return at>start;
    }
    function string(){
      const quote=text[at++];let result='';
      while(at<text.length){
        const ch=text[at++];if(ch===quote)return result;
        if(ch.charCodeAt(0)<32)fail('Control character or unclosed string');
        if(ch!=='\\'){result+=ch;continue;}
        const escape=text[at++],escapes={'"':'"',"'":"'",'\\':'\\','/':'/','b':'\b','f':'\f','n':'\n','r':'\r','t':'\t'};
        if(escape==='u'){
          const hex=text.slice(at,at+4);if(!/^[a-fA-F0-9]{4}$/.test(hex))fail('Invalid Unicode escape');result+=String.fromCharCode(parseInt(hex,16));at+=4;
        }else if(Object.hasOwn(escapes,escape))result+=escapes[escape];else fail('Invalid escape');
      }
      fail('Unclosed string');
    }
    function value(depth){
      if(depth>64)fail('Nesting limit exceeded');space();
      const ch=text[at];
      if(ch==='"'||ch==="'")return string();
      if(ch==='{'||ch==='['){
        const object=ch==='{',end=object?'}':']',out=object?{}:[];at++;space();
        if(text[at]===end){at++;return out;}
        while(at<text.length){
          if(object){
            space();let key;
            if(text[at]==='"'||text[at]==="'")key=string();
            else {const match=text.slice(at).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);if(!match)fail('Expected property name');key=match[0];at+=key.length;}
            space();if(text[at++]!==':')fail('Expected colon after property name');
            if(Object.hasOwn(out,key))fail('Duplicate property '+key);
            const item=value(depth+1);Object.defineProperty(out,key,{value:item,enumerable:true,writable:true,configurable:true});
          }else out.push(value(depth+1));
          const separated=space();
          if(text[at]===end){at++;return out;}
          if(text[at]===','){at++;space();if(text[at]===end){at++;return out;}continue;}
          // A boundary after a complete value is required; never split fused tokens.
          if(!separated)fail('Expected comma or '+end);
        }
        fail('Unclosed container');
      }
      const number=text.slice(at).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if(number){at+=number[0].length;const result=Number(number[0]);if(!Number.isFinite(result))fail('Non-finite number');return result;}
      const word=text.slice(at).match(/^[A-Za-z_][A-Za-z0-9_-]*/);
      if(word){at+=word[0].length;if(word[0]==='true')return true;if(word[0]==='false')return false;if(word[0]==='null')return null;
        if(['undefined','NaN','Infinity'].includes(word[0]))fail('Unsupported value');return word[0];}
      fail('Expected a complete data value');
    }
    const result=value(0);space();if(at!==text.length)fail('Unexpected trailing content');return result;
  }

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
    const registry=generateInstruments(caps);
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
          const canonical=registry.sounds.find(s=>s.world===p.setup&&s.bankId===t.instrument&&engineSoundId(s,caps)===t.sound);
          return {role:t.role,sound:canonical?.canonicalId??null,enabled:t.on&&t.level>0,source:t.exact?'authored':'generated',
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
          const stepsPerBar=p.timeSignature==='3/4'?12:16;
          const positions=ranges.map(([a,b])=>((a-1)*stepsPerBar)+'–'+(b*stepsPerBar-1)).join(', ');
          warn('PART_BAR_GAP',path+'.'+t.role,'Нет новых нот в тактах '+bars+' (absoluteStep '+positions+'). Больше нот на шагах 0–'+(stepsPerBar-1)+' меняет только такт 1. Паузы допустимы; хвосты не анализируются.','No new notes in bars '+bars+' (absoluteStep '+positions+'). More notes at steps 0–'+(stepsPerBar-1)+' change only bar 1. Rests are allowed; sustain is not analyzed.');
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
  // Arrays of notes/sections are authored musical units, never guessed or merged.
  function mergeBridgeState(base, current, proposed, path = 'project', conflicts = []){
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    if(same(base,proposed)) return clone(current);
    if(same(base,current)||same(current,proposed)) return clone(proposed);
    if(base&&current&&proposed&&!Array.isArray(base)&&typeof base==='object'&&typeof current==='object'&&typeof proposed==='object'){
      const out={};
      for(const key of new Set([...Object.keys(base),...Object.keys(current),...Object.keys(proposed)])){
        if(!(key in base)||!(key in current)||!(key in proposed)){
          if(same(base[key],proposed[key])) {if(key in current)out[key]=clone(current[key]);}
          else if(same(base[key],current[key])||same(current[key],proposed[key])) {if(key in proposed)out[key]=clone(proposed[key]);}
          else {conflicts.push(path+'.'+key);if(key in proposed)out[key]=clone(proposed[key]);}
        }else out[key]=mergeBridgeState(base[key],current[key],proposed[key],path+'.'+key,conflicts);
      }
      return out;
    }
    if(path.endsWith('.phrases')&&[base,current,proposed].every(a=>Array.isArray(a))&&JSON.stringify(base.map(p=>p.id))===JSON.stringify(current.map(p=>p.id))&&JSON.stringify(base.map(p=>p.id))===JSON.stringify(proposed.map(p=>p.id)))
      return base.map((v,i)=>mergeBridgeState(v,current[i],proposed[i],path+'.'+i,conflicts));
    if(path.endsWith('.tracks')&&[base,current,proposed].every(a=>Array.isArray(a)&&a.length===8))
      return base.map((v,i)=>mergeBridgeState(v,current[i],proposed[i],path+'.'+i,conflicts));
    conflicts.push(path); return clone(proposed);
  }

  function compileScore(score, api, report = []){
    const caps = api.getCapabilities(), state = api.getProjectState();
    const registry = generateInstruments(caps), errors = [];
    const fail = (path, message) => errors.push(path + ': ' + message);
    const object = (value, allowed, path) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) { fail(path, 'expected one object with named voice fields'); return false; }
      for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path + '.' + key, 'unknown field; allowed: ' + allowed.join(', '));
      return true;
    };
    object(score, scoreFields, 'score');
    if (score.mode === 'patch') {
      object(score,['format','requestId','baseRevision','mode','patches'],'score');

      const current=state.project, next=clone(current), seen=new Set();
      if (!Array.isArray(score.patches)||!score.patches.length||score.patches.length>15) fail('score.patches','expected 1..15 phrase parameter patches');
      for (const [i,entry] of (Array.isArray(score.patches)?score.patches:[]).entries()) {
        const path='score.patches['+i+']';
        if (!object(entry,['phraseId','voices'],path)) continue;
        let target=next;
        if (next.phrases) {
          target=next.phrases.find(p=>p.id===entry.phraseId)?.project;
          if (!target) { fail(path+'.phraseId','required existing phrase ID from STATE'); continue; }
        } else if (entry.phraseId!==undefined) fail(path+'.phraseId','omit for a single phrase');
        const id=entry.phraseId??'single';
        if(seen.has(id)){fail(path+'.phraseId','duplicate target');continue;}seen.add(id);
        if(!object(entry.voices,caps.roles.map(r=>r.id),path+'.voices'))continue;
        if(!Object.keys(entry.voices).length)fail(path+'.voices','at least one role is required');
        for(const [role,values]of Object.entries(entry.voices)){
          const index=caps.roles.findIndex(r=>r.id===role);if(index<0)continue;
          if(!object(values,['on','level','character','duration','space','delay','chorus'],path+'.voices.'+role))continue;
          if(!Object.keys(values).length)fail(path+'.voices.'+role,'at least one parameter is required');
          for(const [field,value]of Object.entries(values)){
            if(field==='on'?typeof value!=='boolean':typeof value!=='number'||!Number.isFinite(value)||value<0||value>100){fail(path+'.voices.'+role+'.'+field,'on is boolean; numeric parameters are 0..100');continue;}
            target.tracks[index][field]=value;
          }
        }
      }
      if(errors.length)throw Error('SCORE_ERROR:\n'+errors.slice(0,16).join('\n'));
      return {requestId:score.requestId,schemaVersion:1,baseRevision:score.baseRevision ?? state.revision,operations:[{op:current.phrases?'composition.replace':'project.replace',project:next}]};
    }
    if(score.patches!==undefined)fail('score.patches','only supported in mode patch');

    for (const field of ['mode','world','tempo','bars','meter','key']) if (!Object.hasOwn(score,field)) fail('score.'+field,'required explicit field');
    const edit = score.mode === 'edit';
    if (score.mode !== undefined && !['edit','replace'].includes(score.mode)) fail('score.mode', 'use replace for new music or edit to preserve unmentioned voices');

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
    const makePhrase = (spec, path, phraseSource=source) => {
      const bars = spec.bars ?? score.bars ?? (edit ? phraseSource.bars : 8);
      const meter = spec.meter ?? score.meter ?? (edit ? phraseSource.timeSignature || '4/4' : '4/4');
      const key = keyIndex(spec.key, rootKey, path + '.key');
      if (![4,8].includes(bars)) fail(path + '.bars', 'use 4 or 8');
      if (!['4/4','3/4'].includes(meter)) fail(path + '.meter', 'use 4/4 or 3/4');
      const limit = bars * (meter === '3/4' ? 12 : 16);
      const voices = spec.voices;
      object(voices, caps.roles.map(r => r.id), path + '.voices');
      const project = {...clone(phraseSource), setup:world, tempo, bars, timeSignature:meter, startStep:0, key};
      if (!edit) project.seed = 1;
      project.tracks = caps.roles.map((role, i) => {
        const part = voices?.[role.id];
        if (edit && part === undefined) return clone(phraseSource.tracks[i]);
        const pool = registry.sounds.filter(s => s.setups.includes(world) && s.compatibleRoles.includes(role.id));
        const preferred = pool.find(s => s.affinityRoles.includes(role.id)) || pool[0];
        let sound = preferred;
        if (part?.sound !== undefined) {
          sound = pool.find(s => s.canonicalId === part.sound);
          if (!sound) { fail(path + '.voices.' + role.id + '.sound', 'choose one of: ' + pool.map(s=>s.canonicalId).join(', ')); sound = preferred; }
        } else if (edit) {
          sound = pool.find(s => s.bankId === phraseSource.tracks[i].instrument && engineSoundId(s,caps) === phraseSource.tracks[i].sound);
          if (!sound && part) fail(path+'.voices.'+role.id+'.sound', 'retained sound is incompatible; choose an explicit compatible canonical ID');
          sound ||= preferred;
        }
        if (part && part.sound === undefined && !edit) fail(path+'.voices.'+role.id+'.sound', 'required explicit canonical sound ID');
        const track = edit ? clone(phraseSource.tracks[i]) : {name:role.slot,level:50,density:100,character:50,duration:50,space:30,delay:0,chorus:0};
        // A timbre/level-only edit must not turn a generated voice into another generator.
        if (!edit || part?.sound !== undefined || part?.notes !== undefined || part?.steps !== undefined) {
          Object.assign(track, {instrument:sound?.bankId, sound:sound?engineSoundId(sound,caps):undefined});
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
            const eventPath=partPath+(hasNotes?'.notes':'.steps')+'['+n+']';
            if (!Number.isInteger(step)) { fail(eventPath,'absoluteStep must be an integer in 0..'+(limit-1)+'; received '+JSON.stringify(step)+'. One step = a sixteenth note; fractional steps are unsupported'); continue; }
            if (step < 0 || step >= limit) { fail(eventPath,'absoluteStep '+step+' is outside this phrase; expected 0..'+(limit-1)); continue; }
            if (seen.has(step)) { fail(eventPath,'duplicate absoluteStep '+step+' in this voice; pitched notes at the same step belong in one chord tuple'); continue; }
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
        return {id:p?.id,project:makePhrase(p || {}, 'score.phrases['+i+']', current.phrases?.find(existing=>existing.id===p?.id)?.project || source)};
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
    return {requestId:score.requestId,schemaVersion:1,baseRevision:score.baseRevision ?? state.revision,operations};
  }

  const protocolVersion = 3;
  const references = {
    agentGuide: 'AGENT_GUIDE.md#required-json-structure',
    capabilities: 'capabilities.json',
    instruments: 'instruments.json',
    musicRules: 'music-rules.json',
    projectState: 'project-state.json'
  };
  const scoreFields = ['format','requestId','baseRevision','mode','world','tempo','bars','meter','key','voices','phraseId','phrases','sections','repeat','patches'];
  const voiceFields = ['sound','notes','steps','on','level','character','duration','space','delay','chorus'];
  const termTranslations={PHRASE:'фраза',LOOP:'цикл',VOICE:'голос',STATE:'снимок состояния',SCORE:'партитура',COMPOSITION:'композиция',SECTION:'секция',BAR:'такт',BEAT:'доля',STEP:'шаг сетки',REST:'пауза',TEMPO:'темп',METER:'размер',KEY:'тональность',BRIDGE_ROOT:'корневая папка',REQUEST:'запрос',RECEIPT:'ответ HALO',REVISION:'ревизия',ROLE:'роль',SLOT:'физический слот',BANK:'банк тембров',TIMBRE:'тембр'};
  function terminology(){
    const definitions={
      PHRASE:'A container of 4 or 8 BAR with its own events; the `phrases` field contains these containers.',
      LOOP:'Repeated playback of one PHRASE; submit it using the phrase request form.',
      VOICE:'One part in a fixed ROLE; `voices` contains up to eight parts.',
      STATE:'The read-only project-state.json file; contains the applied SCORE in `score`.',
      SCORE:'Numeric musical events, timbres and structure in halo-score format.',
      COMPOSITION:'The whole piece: one PHRASE or several PHRASE arranged through SECTION.',
      SECTION:'An arrangement entry referencing a PHRASE and specifying `repeats`.',
      BAR:'An ordinary musical measure. Use BAR consistently for this unit.',
      BEAT:'One quarter note in either supported meter.',
      STEP:'One sixteenth note; four STEP per BEAT.',
      REST:'A deliberate absence of new attacks; previous sounds may sustain.',
      TEMPO:'Quarter-note BEAT per minute; the `tempo` field.',
      METER:'The supported time signature, 4/4 or 3/4; the `meter` field.',
      KEY:'A supported named key; authored MIDI supplies the actual pitches.',
      BRIDGE_ROOT:'The one verified connected folder; remains fixed throughout a task.',
      REQUEST:'The requests/ID.json file written by the agent.',
      RECEIPT:'The responses/ID.result.json file written only by HALO.',
      ROLE:'A fixed musical function and a key in `voices`.',
      SLOT:'A stable UI position independent of the chosen TIMBRE.',
      BANK:'A source of TIMBRE; select ROLE using compatibleRoles.',
      TIMBRE:'The selected sound; supply its `canonicalId` in `sound`.'
    };
    return Object.fromEntries(Object.entries(definitions).map(([term,meaning])=>[term,term+' ('+termTranslations[term]+'): '+explainTerms(meaning)]));
  }
  function explainTerms(text){
    // Prose only. Preserve backticked literals, JSON paths, filenames and existing labels.
    return text.split(/(`[^`]*`)/g).map((part,index)=>index%2?part:part.replace(/(?<![A-Za-z0-9_.\/#-])(phrases?|loops?|voices?|state|score|compositions?|songs?|sections?|bars?|measure|beats?|steps?|rests?|root|requests?|receipts?|revision|roles?|slots?|banks?|timbres?)(?![A-Za-z0-9_\/#-]|\.[A-Za-z]|\s*\()/gi,word=>{
      const lower=word.toLowerCase(),term=lower==='root'?'BRIDGE_ROOT':/^songs?$/.test(lower)?'COMPOSITION':lower==='measure'?'BAR':lower.replace(/s$/,'').toUpperCase();
      return term+' ('+termTranslations[term]+')';
    })).join('');
  }
  function explainedDocument(doc){
    const prose=new Set(['authority','title','patches','description','notice','meaning','root','directories','publication','shape','creation','editing','notes','steps','controls','strict','score','identity','freshness','checks','approval','idLifecycle','evidence','enforcement','physicalSlot','musicalRole','soundBank','timbre','affinity','pitch','identifier','sounds','tracks','selection','events','musicalMeaning','repairPolicy']);
    function walk(value,key){
      if(typeof value==='string')return prose.has(key)||/^(?:BAR|BEAT|STEP|TEMPO|POSITION|PHRASE|SECTION|REST)$/.test(key)?explainTerms(value):value;
      if(Array.isArray(value))return value.map(v=>walk(v,key));
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,k)]));
      return value;
    }
    return walk({...doc,terminology:terminology()});
  }
  function timingVocabulary(){
    return {
      'BAR':'Ordinary musical bar: 4 quarter-note beats in 4/4; 3 in 3/4.',
      'BEAT':'One quarter note in both supported meters. Four steps form one beat.',
      'TEMPO':'Quarter-note beats per minute, not bars per minute.',
      'STEP':'One sixteenth note (semiquaver): 4 steps per beat; 16 per 4/4 bar, 12 per 3/4 bar.',
      'POSITION':'Zero-based event onset within ONE phrase; continues across bar boundaries. Each different phrase starts again at 0.',
      'PHRASE':'HALO score container of 4 or 8 musical bars; tempo and meter determine duration in seconds.',
      'SECTION':'Song arrangement entry referencing a phrase and its repeats; events use that phrase’s position grid.',
      'REST':'Intentional absence of new attacks; earlier sounds may sustain. Empty bars are allowed; the agent authors each intended event explicitly.'
    };
  }
  function requestSchema(caps){
    const integer=(min,max)=>({type:'integer',minimum:min,...(max===undefined?{}:{maximum:max})});
    const parameterProperties={on:{type:'boolean'},...Object.fromEntries(['level','character','duration','space','delay','chorus'].map(k=>[k,{type:'number',minimum:0,maximum:100}]))};
    const object=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
    const literalVoice=edit=>{
      const value={...object({sound:{type:'string',minLength:1},...parameterProperties,
        notes:{type:'array',maxItems:128,items:{type:'array',minItems:2,maxItems:5,prefixItems:[integer(0,127)],items:integer(0,127)}},
        steps:{type:'array',maxItems:128,uniqueItems:true,items:integer(0,127)}},edit?[]:['sound']),not:{required:['notes','steps']}};
      if(!edit)value.oneOf=[{required:['notes']},{required:['steps']}];
      return value;
    };
    const roleProperties=ref=>Object.fromEntries(caps.roles.map(r=>[r.id,{$ref:'#/$defs/'+ref}]));
    const roles=edit=>object(roleProperties(edit?'editVoice':'createVoice'));
    const common={format:{const:'halo-score'},requestId:{type:'string',pattern:'^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$',maxLength:128}};
    const metadata={world:{enum:['ambient','reactor']},tempo:{type:'number',minimum:30,maximum:200},bars:{enum:[4,8]},meter:{enum:['4/4','3/4']},key:{type:'string',enum:caps.harmony.keys.map(k=>k.name)}};
    const required=['format','mode'],music=[...required,...Object.keys(metadata)];
    const phrase=object({id:integer(1),bars:metadata.bars,meter:metadata.meter,key:metadata.key,voices:roles(false)},['id','voices']);
    const section=object({phrase:integer(1),repeats:integer(1,8),name:{enum:['intro','verse','verse2','chorus','bridge','outro','phrase']},fade:{enum:['none','in','out']}},['phrase']);
    return {$schema:'https://json-schema.org/draft/2020-12/schema',title:'HALO File Bridge canonical request',
      description:'Canonical syntax only. HALO manages freshness and additionally validates filename identity, world/role compatibility, canonical timbre ID, pitched/unpitched event kind, role polyphony, retained edit sound, phrase-specific event bounds, unique note onsets, reference identity, arranged length and companion bytes. Host permissions and musical quality require separate verification.',
      $defs:{
        createVoice:{oneOf:[literalVoice(false),{$ref:'#/$defs/companion'}]},
        editVoice:{oneOf:[literalVoice(true),{$ref:'#/$defs/companion'}]},
        companion:object({file:{type:'string',pattern:'^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*--(?:'+caps.roles.map(r=>r.id).join('|')+')\\.json$'}},['file']),
        parameters:{...object(parameterProperties),minProperties:1}
      },
      oneOf:[
        object({...common,mode:{const:'probe'}},required),
        object({...common,mode:{const:'replace'},...metadata,voices:roles(false)},[...music,'voices']),
        object({...common,mode:{const:'replace'},...metadata,phrases:{type:'array',minItems:1,maxItems:15,items:phrase},sections:{type:'array',minItems:1,maxItems:32,items:section},repeat:{type:'boolean'}},[...music,'phrases','sections']),
        object({...common,mode:{const:'edit'},...metadata,phraseId:integer(1),voices:roles(true)},[...music,'voices']),
        object({...common,mode:{const:'patch'},patches:{type:'array',minItems:1,maxItems:15,items:object({phraseId:integer(1),voices:{...object(roleProperties('parameters')),minProperties:1}},['voices'])}},[...required,'patches'])
      ]};
  }
  const contextLineWidth=480;
  // Pack complete JSON members, preserving values and keeping catalog records distinct.
  // Reserve one column for a trailing comma; strings remain indivisible JSON tokens.
  function referenceJson(value,expandedObjects=false){
    const flat=v=>Array.isArray(v)?'['+v.map(flat).join(', ')+']':v&&typeof v==='object'?'{'+Object.entries(v).map(([k,x])=>JSON.stringify(k)+': '+flat(x)).join(', ')+'}':JSON.stringify(v);
    function lines(v,depth=0,head='',path=''){
      const pad=' '.repeat(depth),one=pad+head+flat(v);
      const inline=!expandedObjects||Array.isArray(v)&&v.every(x=>!x||typeof x!=='object'||Array.isArray(x));
      if(inline&&one.length<contextLineWidth||!v||typeof v!=='object')return [one];
      const array=Array.isArray(v),entries=array?v.map((x,i)=>[i,x]):Object.entries(v),groups=[];
      const records=array&&['sounds','tracks'].includes(path.split('.').pop());
      for(const [k,x]of entries){
        const next=lines(x,depth+2,array?'':JSON.stringify(k)+': ',path+'.'+k),last=groups.at(-1);
        if((!expandedObjects||array)&&!records&&next.length===1&&last?.length===1&&last[0].length+2+next[0].trimStart().length<contextLineWidth)last[0]+=', '+next[0].trimStart();
        else groups.push(next);
      }
      return [pad+head+(array?'[':'{'),...groups.flatMap((g,i)=>g.map((s,j)=>s+(i<groups.length-1&&j===g.length-1?',':''))),pad+(array?']':'}')];
    }
    return lines(value).join('\n');
  }
  function compactGuide(text){
    let code=false;
    return text.split('\n').flatMap(line=>{
      if(line.startsWith('```')){code=!code;return [line];}
      if(code||line.length<=contextLineWidth)return [line];
      const indent=/^\d+\. /.test(line)?'   ':'',parts=[];
      let current='';
      for(const word of line.split(' ')){
        if(current.length+1+word.length>contextLineWidth){parts.push(current);current=indent+word;}
        else current+=(current?' ':'')+word;
      }
      return [...parts,current];
    }).join('\n');
  }
  // Render symbolic authoring forms from the same schema used by the contract.
  // Placeholders carry types, never playable musical content.
  function requestTemplates(caps){
    const schema=requestSchema(caps),slot=label=>'⟨'+label+'⟩';
    function shape(node,path=''){
      if(node.$ref)return shape(schema.$defs[node.$ref.split('/').pop()],path);
      if(node.const!==undefined)return node.const;
      if(path.endsWith('.voices'))return {[slot('role ID from instruments.json')]:shape(node.properties[Object.keys(node.properties)[0]],path+'.role')};
      if(path.endsWith('.notes'))return [[slot('integer absolute phrase step'),slot('integer MIDI pitch; add pitches up to role polyphony')]];
      if(path.endsWith('.steps'))return [slot('integer absolute phrase step')];
      if(node.minProperties===1&&node.properties?.on)return {[slot('requested parameter: '+Object.keys(node.properties).join(' | '))]:slot('boolean for on; number 0..100 for other parameters')};
      if(node.oneOf&&!node.properties){
        const voice=shape(node.oneOf[0],path);
        if(node.oneOf[0].properties){voice.sound=slot('compatible canonicalId from instruments.json');voice.notes=shape(node.oneOf[0].properties.notes,path+'.notes');}
        return voice;
      }
      if(node.type==='object')return Object.fromEntries((node.required?.length?node.required:['on']).map(k=>[k,shape(node.properties[k],path+'.'+k)]));
      if(node.type==='array')return [shape(node.items,path+'[]')];
      const bounds=node.minimum===undefined?'':'; '+node.minimum+(node.maximum===undefined?' or greater':'..'+node.maximum);
      return slot(path.split('.').pop()+': '+(node.enum?'choose '+(node.enum.length>8?'from capabilities.json.requestSchema '+path.split('.').pop()+' enum':node.enum.join(' | ')):node.type+bounds));
    }
    const names=['probe','replacePhrase','replaceSong','edit','patch'];
    const templates=Object.fromEntries(schema.oneOf.map((branch,i)=>[names[i],shape(branch)]));
    templates.pitchedVoice=shape(schema.$defs.createVoice,'voice');
    templates.unpitchedVoice={sound:slot('compatible unpitched canonicalId from instruments.json'),steps:shape(schema.$defs.createVoice.oneOf[0].properties.steps,'voice.steps')};
    return Object.fromEntries(Object.entries(templates).map(([name,value])=>[name,referenceJson(value)]));
  }
  function generateCapabilitiesData(caps){
    return {
      schemaVersion: protocolVersion, protocol: 'halo-score', engine: 'NotBad Halo Music Constructor',
      references, authority: 'File Bridge score contract only. WebMCP is a separate API.',
      delivery: {agentWrite:['requests/'],haloOnlyWrite:['responses/','AGENT_GUIDE.md','capabilities.json','instruments.json','music-rules.json','project-state.json'],request:'requests/<ID>.json', receipt:'responses/<ID>.result.json',
        companion:'requests/<ID>--<role>.json', reference:'<ID>--<role>.json',
        directories:'HALO creates requests/ and responses/. Agents use those existing directories.',
        publication:'Complete and read back companions first, publish and read back request last.',
        root:'Verify one connected root containing AGENT_GUIDE.md, project-state.json, requests/ and responses/. Bind immutable path variables ROOT, STATE_PATH, REQUEST_PATH and RECEIPT_PATH once per task. Write permission covers requests/; STATE_PATH and RECEIPT_PATH are read-only to the agent.'},
      timing:timingVocabulary(),
      limits: {tempo:caps.limits.bpm,bars:caps.limits.bars,tracks:caps.limits.tracks,stepsPerBar:{'4/4':16,'3/4':12},phrases:caps.limits.phrases,sections:caps.limits.sections,totalBars:caps.limits.totalBars,bytes:caps.limits.bytes},
      syntax:{canonical:'JSON matching requestSchema',acceptedPresentation:['UTF-8 BOM','one json/jsonc/json5 code fence','line and block comments','trailing commas','single-quoted strings','unquoted identifier keys and single-token string values','missing commas between whitespace-separated complete values'],repairPolicy:'Presentation normalization preserves complete, uniquely keyed literal data and musical values. Incomplete values, fused numbers, duplicate keys and expressions require an author correction. Musical, freshness and path checks apply after parsing.'},
      requestSchema:requestSchema(caps),
      authoring:{guide:'AGENT_GUIDE.md#required-json-structure',instruction:'Fill the matching symbolic form in the guide with typed values and original musical events. requestSchema is the formal contract.'},
      score: {fields:scoreFields.filter(k=>k!=='baseRevision'), required:['format','mode'],
        requiredByMode:{probe:[],patch:['patches'],replace:['world','tempo','bars','meter','key'],edit:['world','tempo','bars','meter','key','voices']},
        alternativesByMode:{replace:[['voices'],['phrases','sections']]},
        editTarget:'Existing phraseId is required when editing one PHRASE (фраза) within a COMPOSITION (композиция) containing phrases; omit it for a single PHRASE (фраза).',
        format:'halo-score', mode:['replace','edit','patch','probe'], world:['ambient','reactor'], tempo:[30,200], bars:[4,8], meter:['4/4','3/4'],
        shape:'replace or edit: `voices` for one phrase; `phrases` and `sections` for a new composition; edit on a composition needs `phraseId`. patch: format/mode/patches only. probe: format/mode only.',
        phrases:{fields:['id','bars','meter','key','voices'],required:['id','voices'],max:15},
        sections:{fields:['phrase','repeats','name','fade'],required:['phrase'],max:32,
          names:['intro','verse','verse2','chorus','bridge','outro','phrase'],fade:['none','in','out'],defaults:{repeats:1,name:'phrase',fade:'none'}},
        repeat:'Boolean; song only, default false.',
        voices:{roles:caps.roles.map(r=>r.id),fields:voiceFields,
          creation:'`voices` is an object keyed by role. Each role contains ONE object, ONE sound string and exactly one notes/steps event array.  Omitted roles are silent.',
          editing:'Unmentioned voices and fields are preserved; changing sound is explicit. edit targets one phrase; tempo is shared by the whole song. Use patch for parameter-only changes.',
          notes:'[step, MIDI, ...] with unique steps, integer MIDI 0..127 and role polyphony from instruments.json.tracks.',
          steps:'Unique integer hits for unpitched timbres only; [] means intentional silence.',
          controls:'on is boolean; level, character, duration, space, delay, chorus are 0..100.',
          defaults:{on:true,level:50,character:50,duration:50,space:30,delay:0,chorus:0}},
        strict:'Unknown structural fields, aliases, prefixed/case-variant sounds, operation envelopes and unsafe references are errors. HALO owns task baselines, safe merging and user conflict decisions.'},
      synchronization:{owner:'HALO',task:'Use one fresh ID: probe, ready, then music under the same ID. HALO captures the original project; HALO supplies and manages version counters.',merge:'Non-overlapping field changes merge. Note/section arrays are atomic; phrase arrays merge only with identical IDs and order. Full replacement conflicts with later musical edits.',conflict:'pending_approval.conflicts requires user choice: accept the proposed conflict values or reject and keep site music. Missing task baseline after reconnect also requires user review. Changes during review trigger a new review.'},
      preflight:{format:'halo-score',mode:'probe',required:['format','mode'],receipt:'ready',meaning:'Use the SAME fresh ID for probe then music. Before composing, write a probe into existing requests/ and read its real ready receipt from responses/. The probe checks exchange and preserves the project. On denial or missing ready, report the path and error and end the attempt. Agent writes stay in the verified requests/ folder; HALO writes responses/.'},
      parameterPatch:{mode:'patch',required:['format','mode','patches'],patches:'1..15 objects: {phraseId, voices}. Existing phraseId required for a song; omitted for single phrase. Unique targets. voices maps roles to on/level/character/duration/space/delay/chorus ONLY. All patches apply atomically after one approval; existing notes, steps and sound are preserved.'},
      stateExport:{score:'Canonical halo-score projection of all phrases and sections; HALO manages freshness. Check scoreExport.complete and materialized. The exported representation uses score fields; patch preserves internal HALO data.'},
      receipts:{statuses:['ready','pending_approval','applied','rejected','error'],
        identity:'id equals ID; requestId, if supplied, equals the request basename.',
        freshness:'After correction read the response; HALO tracks content identity internally. Matching applied/rejected are terminal.',
        checks:'Read immediately; absent/stale only: built-in wait 4–5 seconds, at most 3 reads. Without wait tool: one immediate reread. Use the available built-in wait tool for these bounded checks.',
        corrections:2, approval:'Receipt statuses describe HALO output. Conflicts are reported in pending_approval.conflicts and always require the HALO user, even with automatic apply enabled. Only the HALO user can approve. Report pending_approval, invite human approval and end the turn.',
        idLifecycle:'Each later user musical change needs a new ID and a new probe. Same ID is only for the current unfinished submission within the same turn. Reported pending, applied and rejected end it.',
        evidence:'scoreAudit contains actual seconds, named keys, scale/pitch classes and per-role attacksPerBar. Counts are event starts, not sustain or musical quality. scoreReport warns PART_BAR_GAP for two or more consecutive bars without new notes in an active authored pitched part.',
        enforcement:'The external tool adapter enforces agent file permissions and bounded receipt reads.'}
    };
  }

  // Bridge IDs identify a world + source bank + timbre without changing engine IDs.
  function canonicalSoundId(sound, bank, world, catalog){
    const short=id=>id.startsWith(world+'-')?id.slice(world.length+1):id;
    const id=short(sound.id);
    const duplicates=Object.values(catalog).flatMap(b=>b.sounds||[]).filter(s=>short(s.id)===id).length;
    return duplicates>1?bank.toLowerCase()+'-'+id:id;
  }
  function engineSoundId(sound,caps){
    const catalog=caps.catalog[sound.world];
    return catalog[sound.bankId].sounds.find(s=>canonicalSoundId(s,sound.bankId,sound.world,catalog)===sound.canonicalId).id;
  }
  function generateInstrumentsData(caps){
    function findCompatible(catalog, worldName) {
      if (!catalog) return [];
      const res = [];
      for (const [slotKey, bank] of Object.entries(catalog)) {
        for (const s of (bank.sounds || [])) {
          const canonicalId = canonicalSoundId(s, slotKey, worldName, catalog);
          res.push({
            world: worldName,
            setups: s.setups || [worldName],
            bankId: slotKey,
            canonicalId,
            name: s.name,
            pitched: !!s.playback?.pitched,
            compatibleRoles: s.playback?.compatibleRoles || [],
            affinityRoles: s.playback?.affinityRoles || [],
            acousticRange: s.playback?.range || [24, 96]
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
      acousticRange: { minMidi: r.minMidi ?? 24, maxMidi: r.maxMidi ?? 96 }
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
      references,
      concepts: {
        physicalSlot:'tracks[].trackIndex and slot are fixed UI identities, not instrument banks or timbre descriptions.',
        musicalRole:'tracks[].role is the `voices` key. `GLASS`=pulse, `TIDAL`=accent, `ROOT`=percussion; read all eight mappings in tracks.',
        soundBank:'sounds[].bankId identifies the internal source bank; tracks[].role identifies the destination role. Use canonicalId as the score sound value.',
        timbre:'Choose sounds[].canonicalId literally as voice.sound, filtered by world in setups and role in compatibleRoles.',
        affinity:'affinityRoles are recommended orchestration, compatibleRoles are hard constraints. Neither reassigns a physical slot.',
        pitch:'Pitched timbres require notes; unpitched timbres require steps. Integer MIDI 0..127 is the hard input limit. acousticRange guides the engine playback register: playback octave folding moves valid MIDI into the timbre register (plus bass-specific register policy), preserving pitch class. tracks[].acousticRange guides the role playback register; integer MIDI 0..127 remains the input pitch bound.'
      },
      midiInputRange:{min:0,max:127,integer:true},
      identifier:'canonicalId is unique within world; duplicate engine timbre names are qualified by source bank. Only canonicalId goes in voice.sound; bankId is informational.',
      sounds: allSounds,
      tracks: roles,
      parameterGlossary,
      rangeSemantics:{sounds:'acousticRange is the timbre playback register; octave folding brings valid MIDI pitches into the playback register while preserving pitch class.',tracks:'acousticRange describes role register guidance; bass additionally uses the engine bass register policy.'},
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

  function generateMusicRulesData(caps){
    return {schemaVersion:protocolVersion,references,
      description:'Optional HALO grid and key reference; musical composition is the agent’s task.',
      timing:timingVocabulary(),
      timeSignatures:{'4/4':{stepsPerBar:16,phraseSteps:{4:64,8:128}},'3/4':{stepsPerBar:12,phraseSteps:{4:48,8:96}}},
      keys:caps.harmony.keys.map(k=>k.name),
      events:'Absolute phrase steps; unique steps per voice. Integer MIDI 0..127; per-role polyphony and acoustic playback ranges are in instruments.json. Only integer MIDI 0..127 is a hard input pitch bound.',
      pitch:'Authored MIDI is literal. The key label supplies harmonic context; the engine plays authored pitches with its existing acoustic octave folding.'};
  }

  function exportScore(state,caps){
    try {
      const registry=generateInstruments(caps),current=state.project;
      const sounds=typeof module!=='undefined'&&module.exports?require('./sounds.js'):root.HaloSounds;
      const materialized=[];
      function phrase(project,id){
        const meter=project.timeSignature||'4/4',spb=meter==='3/4'?12:16,key=caps.harmony.keys[project.key];
        const tracks=project.tracks.map(t=>({...clone(t),setup:project.setup,phraseBars:project.bars,timeSignature:meter,...(t.exact?{manualSteps:[...t.steps],manualBars:project.bars}:{})}));
        sounds.arrange(tracks);
        const voices={},size=project.bars*spb;
        const position=step=>((step-(project.startStep||0))%size+size)%size;
        for(const [index,t]of tracks.entries()){
          const role=caps.roles[index].id,actual=sounds.soundFor(t);
          const sound=registry.sounds.find(s=>s.world===project.setup&&s.bankId===t.instrument&&engineSoundId(s,caps)===actual.id);
          const canonical=sound?.canonicalId||actual.id;
          if(!sound||!sound.compatibleRoles.includes(role))throw Error('Cannot represent '+role+' / '+canonical+' in halo-score without changing its role or timbre');
          const v={sound:canonical,on:t.on};for(const c of ['level','character','duration','space','delay','chorus'])v[c]=t[c]??(c==='space'?30:['delay','chorus'].includes(c)?0:50);
          if(t.exact){
            if(sound.pitched){
              if(t.steps.some(step=>!t.noteEvents?.some(e=>e.step===step)))throw Error('Missing explicit MIDI in '+role);
              v.notes=(t.noteEvents||[]).map(e=>[position(e.step),...e.notes.map(n=>Math.max(0,Math.min(127,n+key.offset-(t.noteTranspose||0))))]).sort((a,b)=>a[0]-b[0]);
            }else v.steps=t.steps.map(position).sort((a,b)=>a-b);
          }else{
            materialized.push({phraseId:id,role});const events=[];
            for(let step=0;step<project.bars*spb;step++){
              const absolute=(project.startStep||0)+step,local=((absolute%size)+size)%size,clock=t.generator===3?absolute:local,active={...t,on:true};
              if(sounds.shouldTrigger(active,index,clock,project.seed,project.bars,meter)){
                const notes=sound.pitched?sounds.notesFor(t,index,Math.floor(local/spb),local%spb,project.seed,key.offset,project.bars,clock,key.mode,meter):[];
                events.push(sound.pitched?[step,...notes]:step);
              }
            }
            if(sound.pitched)v.notes=events;else v.steps=events;
          }
          if(v.notes?.some(e=>e.length<2||e.length>caps.roles[index].maxNotes+1))throw Error('Cannot represent note polyphony for '+role);
          voices[role]=v;
        }
        return {bars:project.bars,meter,key:key.name,voices};
      }
      const first=current.phrases?current.phrases[0].project:current;
      const score={format:'halo-score',mode:'replace',world:first.setup,tempo:current.tempo};
      if(current.phrases){
        if(current.phrases.some(p=>p.project.setup!==first.setup))throw Error('Mixed worlds cannot be represented in one halo-score');
        const phrases=current.phrases.map(p=>({id:p.id,...phrase(p.project,p.id)}));
        Object.assign(score,{bars:first.bars,meter:first.timeSignature||'4/4',key:caps.harmony.keys[first.key].name,phrases,sections:clone(current.sections),repeat:current.repeat});
      }else Object.assign(score,phrase(current,null));
      return {score,scoreExport:{complete:true,materialized,meaning:materialized.length?'Generated voices are explicit events for the phrase cycle starting at its saved startStep. Future generated cycles/velocities may differ; parameter patch preserves original generator data in HALO.':'All saved MIDI events, timbres, voice parameters and sections are represented. HALO retains internal settings not expressible in halo-score; parameter patch preserves them.'}};
    }catch(error){return {score:null,scoreExport:{complete:false,error:error.message,meaning:'Original project remains unchanged in HALO. Report the export error and obtain a complete score before replacement.'}};}
  }
  function generateProjectStateData(state,caps){
    return {
      schemaVersion:protocolVersion,
      notice:'READ-ONLY LIVE SNAPSHOT. Only HALO writes this file. Submit requests inside requests/.',
      references,revision:state.revision,exportedAt:new Date().toISOString(),
      ...(caps?exportScore(state,caps):{score:null,scoreExport:{complete:false,error:'Capabilities required for normalized export'}})
    };
  }

  function generateCapabilities(...args){return explainedDocument(generateCapabilitiesData(...args));}
  function generateInstruments(...args){return explainedDocument(generateInstrumentsData(...args));}
  function generateMusicRules(...args){return explainedDocument(generateMusicRulesData(...args));}
  function generateProjectState(...args){return explainedDocument(generateProjectStateData(...args));}
  function generateAgentGuide(caps){
    return compactGuide(`# HALO — Compose and edit music

Translate the user's creative brief into original musical events. Preserve the requested music when developing or editing it. Report file writes, HALO responses, approval and playback only from observed tool results.

## Required JSON structure
Start here: choose the form for the user's intent, fill every symbolic slot and preserve literal keys and nesting. Forms come from capabilities.json.requestSchema. Replace angle-bracket slots with their stated JSON types. Compose original numeric events. Repeat collection members as needed. Select world, key, role and sound from the catalogs.

${Object.entries(requestTemplates(caps)).map(([name,text])=>'### '+name+'\n\n```text\n'+text+'\n```').join('\n\n')}

For pitched voices use notes: each event is [absolute phrase step, MIDI pitch, additional simultaneous MIDI pitches up to role polyphony]. For unpitched voices replace the notes member with steps: an array of integer absolute phrase steps. Choose the event kind using instruments.json sound.pitched. Empty event arrays express intentional silence. Omitted roles are silent in replace.
For edit include just the requested sound, events or controls in each selected voice. Add phraseId with the existing integer phrase ID for edit and each patch entry when STATE.score contains a song; omit phraseId for a single phrase. Patches use the requested subset of on, level, character, duration, space, delay and chorus; replace the parameter-key slot with each requested parameter name. on is boolean; the other controls are numbers 0..100. For song replacement each section.phrase references an authored phrase.id; add optional repeats/name/fade and repeat using requestSchema.
Before delivery, verify the completed form against requestSchema, catalog compatibility, phrase bounds and the requested musical duration. Read [the delivery procedure](#delivery) for folder exchange; the probe form starts that exchange.

## Contents
[Required JSON structure](#required-json-structure) · [Vocabulary](#vocabulary) · [Files](#files) · [Folder preflight](#folder-preflight) · [Six workflows](#six-workflows) · [Timing](#timing) · [Delivery](#delivery)

## Vocabulary
Uppercase terms name concepts. JSON keys, filenames, role IDs, mode values and status values retain their EXACT spelling. Copy identifiers literally from the schema and catalogs. All JSON property names, including timing and terminology entries, use English identifiers without translations.

| Term | Meaning |
| --- | --- |
${Object.values(terminology()).map(value=>value.replace(/^([^:]+): (.*)$/,'| $1 | $2 |')).join('\n')}

## Files
| Read-only file | Responsibility |
| --- | --- |
| [capabilities.json](capabilities.json) | Sole format authority: requestSchema, mode fields, limits and responses. Read before writing. |
| [instruments.json](instruments.json) | Complete TIMBRE (тембр) catalog: canonicalId, compatibleRoles, pitched, acousticRange and fixed ROLE (роль). Choose from this catalog. |
| [music-rules.json](music-rules.json) | Exact timing vocabulary, grid and supported key names. |
| [project-state.json](project-state.json) | STATE (снимок состояния): the whole COMPOSITION (композиция) in score and scoreExport limitations. |

A REQUEST (запрос) is one object with format exactly halo-score. Its structure is capabilities.json.requestSchema. A SCORE (партитура) contains numeric musical events in the structure above. SLOT (физический слот), BANK (банк тембров) and TIMBRE (тембр) are distinct concepts. MIDI input bounds and acousticRange are different constraints in instruments.json.

## Folder preflight
BRIDGE_ROOT (корневая папка) is the exact absolute path supplied by the user. Verify existing AGENT_GUIDE.md, project-state.json, requests/ and responses/. Bind one BRIDGE_ROOT (корневая папка). Use the existing requests/ and responses/ under this verified root.
Before composing EACH new task choose a fresh ID. Write requests/ID.json with only format=halo-score and mode=probe. Read responses/ID.result.json with matching id and status=ready. HALO captures the task baseline. Read STATE, then replace the probe with your musical score using the SAME ID. HALO handles versions, freshness and conflicts; leave revision counters to HALO.
The agent writes ONLY requests/. ONLY HALO writes responses/ and context files. Agent write permission covers requests/; context and response paths are read-only. On denied access, ambiguous BRIDGE_ROOT (корневая папка) or no ready within the delivery limit, STOP before composing and report the exact path and error. Read each RECEIPT (ответ HALO) from its matching HALO-owned response file. Bionic or LM Studio permissions must be granted in that host separately from browser permissions.

## Six workflows
Choose from the user's current brief:

| Intent | Operation |
| --- | --- |
| A. New LOOP (цикл) | mode=replace with root voices. Author original events for the requested duration and select TIMBRE (тембр) from the catalog. Author the theme and events freshly for this brief. |
| B. Develop the current PHRASE (фраза) | Read STATE.score. mode=replace with phrases and sections. Preserve the seed motif and create related, musically different PHRASE (фраза). Form is free; Give each developed phrase distinct musical events. |
| C. Transform the whole COMPOSITION (композиция) | Read all phrases and sections in STATE.score. mode=replace with the whole transformed structure. Reposition events for a new METER (размер); change actual MIDI for a new KEY (тональность). Authored MIDI supplies the transformed pitches. Half speed means tempo/2 within supported bounds. |
| D. Entirely new COMPOSITION (композиция) | mode=replace with new phrases and sections, an original theme and suitable TIMBRE (тембр). Compose a fresh original theme for this brief. |
| E. Parameters only, including mute | mode=patch with only requested parameters for each affected PHRASE (фраза). Preserve notes, TIMBRE (тембр) and structure. Identify drums by actual sound.pitched. A percussion-muting request keeps pitched parts; “only melody” also mutes the other requested parts. |
| F. Change notes or TIMBRE (тембр) in one PHRASE (фраза) | mode=edit with an existing phraseId from STATE.score and only requested voices changes. Copy world, tempo, bars, meter and key from that target. Preserve ALL other PHRASE (фраза). Repeated references share its edit. |

tempo is shared by the whole COMPOSITION (композиция). Reused SECTION (секция) references share one PHRASE (фраза), so editing it affects all repeats; clarify before making just one occurrence independent.

STATE.score represents current applied browser music. Pending REQUEST (запрос) data is available through its receipt. Its halo-score fields match the input contract. Check scoreExport.complete before reuse. If false, report the export error and request a complete export before reusing the score. scoreExport.materialized lists generated VOICE (голос) frozen into one explicit cycle; future generated variations and dynamics may differ from this saved cycle. Use patch for parameter-only edits. For new music author a fresh SCORE (партитура).

## Timing
Read the full timing vocabulary in music-rules.json. A BAR (такт) has 16 STEP (шаг сетки) in 4/4 and 12 in 3/4. One BEAT (доля) is a quarter note, four STEP (шаг сетки). Positions start at zero in EACH PHRASE (фраза) and continue across its BAR (такт) boundaries. BAR (такт) n starts at (n−1) × stepsPerBar.
At 120 BPM one 4/4 BAR (такт) lasts 2 s; eight last 16 s. In eight-bar 4/4, positions 0..15 belong only to the first BAR (такт); 112..127 belong to the eighth. Events for later bars use their corresponding absolute phrase steps. Event starts count attacks; earlier sounds may sustain.

## Delivery
1. After real ready, keep the SAME task ID and read STATE (снимок состояния). Bind REQUEST_PATH=BRIDGE_ROOT/requests/ID.json and RECEIPT_PATH=BRIDGE_ROOT/responses/ID.result.json. Keep these exact paths for the task. Read STATE (снимок состояния) and RECEIPT (ответ HALO); write REQUEST_PATH.
2. Before writing, check capabilities.json.requestSchema, compatible TIMBRE (тембр), notes for pitched or steps for unpitched sounds, unique integer positions, each PHRASE (фраза) boundary, polyphony and all sections references. Ensure the musical idea spans the requested duration. Long REST (пауза) must be deliberate parts of the COMPOSITION (композиция). Compare actual events across all BAR (такт) with the brief. Preserve intentional silence and assess the musical idea across the complete requested span. For patch verify ONLY requested parameters change; for edit verify unrelated VOICE (голос) and PHRASE (фраза) remain unchanged.
3. Write REQUEST_PATH and read it back. Optional VOICE (голос) companion files follow capabilities.json.delivery: write and read companions first, publish the main REQUEST (запрос) last. Use these exact flat paths in the verified requests/ directory.
4. Read only RECEIPT_PATH with matching id. applied or rejected: report and STOP regardless of ok:false. pending_approval: report actual status and relevant scoreReport diagnostics, invite approval in HALO and STOP. End the turn after reporting pending_approval; report playback only after an observed playback result. ready belongs only to the probe; replace that probe with music under the same ID.
5. On error or ok:false read error, help and instructionForAgent. Correct the same unfinished REQUEST (запрос) at most twice; Read the new response. Conflicts belong to the user in HALO; stop and report them without rewriting music to bypass them. Keep corrections under the same unfinished ID and read the HALO-owned RECEIPT (ответ HALO).
6. Missing or stale RECEIPT (ответ HALO): at most 3 reads with built-in waits of 4–5 seconds. Without a wait tool, only one immediate reread. Then report unconfirmed delivery and STOP. Use direct file reads and the bounded built-in waits described here. The same limit applies to probes.
7. Each later user brief needs one fresh ID for probe then music. Reported pending_approval, applied and rejected retire the music ID. Resolve pending_approval with the user before treating a REQUEST (запрос) as applied.

Final report: exact request path and ID, real status or unconfirmed delivery, relevant feedback and required user action. Confirm loading, approval and playback through their corresponding observed results.
`);
  }

  function getContextFiles(api){
    const caps = api.getCapabilities();
    const state = api.getProjectState();
    return {
      'AGENT_GUIDE.md': generateAgentGuide(caps),
      'capabilities.json': referenceJson(generateCapabilities(caps)),
      'instruments.json': referenceJson(generateInstruments(caps)),
      'music-rules.json': referenceJson(generateMusicRules(caps)),
      'project-state.json': referenceJson(generateProjectState(state, caps),true)
    };
  }

  function scoreIdentity(req, fallbackId){
    if (!req || typeof req !== 'object' || Array.isArray(req) || req.format !== 'halo-score') throw Error('SCORE_ERROR: only format halo-score is accepted; root.format must be the exact string \"halo-score\". Fill the symbolic form in AGENT_GUIDE.md#required-json-structure with numeric musical events matching capabilities.json.requestSchema. Human approval happens only in HALO.');
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
    try { return typeof raw==='string'?parseScoreText(raw):clone(raw); }
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
      parsed = typeof textContent === 'string' ? parseScoreText(textContent) : textContent;
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
      parsed = typeof textContent === 'string' ? parseScoreText(textContent) : textContent;
    } catch(e) {
      return { ok: false, error: 'INVALID_JSON: ' + e.message, id: fallbackId };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'INVALID_REQUEST_OBJECT', id: fallbackId };
    }

    if(parsed.mode==='probe'){
      try{
        const id=scoreIdentity(parsed,fallbackId);
        const allowed=['format','requestId','baseRevision','mode'];
        if(Object.keys(parsed).some(k=>!allowed.includes(k)))throw Error('SCORE_ERROR: probe allows only format, mode, requestId');
        const currentRevision=api.getProjectState().revision;
        // The folder bridge owns task freshness; probe carries no revision obligation.
        return {ok:true,id,probe:true,currentRevision};
      }catch(e){return {ok:false,id:fallbackId,error:e.message};}
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
    if(msg==='REJECTED_BY_USER')return {help:'The user rejected this proposal. This ID is terminal.',instructionForAgent:'Report the rejection and end this turn. A later user music request starts with a fresh ID and probe.'};
    const help=msg.includes('score.format') || msg.includes('only format halo-score')
      ? 'Read AGENT_GUIDE.md#required-json-structure. Root requires format: halo-score. voices maps each role to ONE object with one sound string and actual numeric notes/steps arrays. Fill the matching symbolic form in that section with original numeric events and catalog sound IDs.'
      : msg.includes('CONFLICT_REVISION')
      ? 'Report the conflict, ask the user to resolve the proposal in HALO and end the turn.'
      : msg.includes('absoluteStep must be an integer')
        ? 'Use integer phrase-local absoluteStep positions on the sixteenth-note grid. Author the reported positions as deliberate integer steps in the same halo-score request, then reread the matching receipt.'
      : msg.includes('FILE_NOT_FOUND')
        ? 'Check the exact fixed ROOT/requests/<ID>--<role>.json companion. Write and read back companions before publishing REQUEST. Use the existing requests/ directory under the verified ROOT.'
        : 'Keep format halo-score. Read the indicated field and capabilities.json; sound IDs and role compatibility are in instruments.json. Apply corrections to the same halo-score request path.';
    return {help,instructionForAgent:consecutiveCount>=3
      ? 'STOP: two correction rounds exhausted. Report the exact error and fixed paths.'
      : 'Correct only the indicated cause in the same ID and paths, at most two rounds. Read the matching RECEIPT and read the updated response after correction. Stop on pending_approval, applied or rejected.'};
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
    const content = referenceJson(generateProjectState(state, api.getCapabilities()),true);
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
    let reviewingAgain = false;
    let lastSyncedRevision = null;
    const listeners = new Set();
    const processedContent = new Map();
    const terminalIds = new Set();
    const taskBases = new Map();
    const readyIds = new Set();
    const win = env.window || root;
    const requestByteLimit = api.getCapabilities().limits.bytes || 524288;

    const state = {
      connected: false,
      directoryName: '',
      savedDirectory: null, // { name: string, handle: FileSystemDirectoryHandle }
      lastSync: null,
      snapshotRevision: null,
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
        const raw = parseScoreText(text);
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
      if (!parsed) {
        const base=taskBases.get(fallbackId), live=api.getProjectState();
        const source=base||live;
        const sourceApi=Object.create(api);
        sourceApi.getProjectState=()=>clone(source);
        sourceApi.getRevision=()=>source.revision;
        // Preview against the captured base without mutating the live engine.
        sourceApi.previewOperations=request=>{
          // Score compilation emits full replacements. Validate them through the
          // real engine at its live revision, while retaining the task's before.
          const preview=api.previewOperations({...request,baseRevision:live.revision});
          return {...preview,before:clone(source.project)};
        };
        parsed=parseAndValidateRequest(sourceApi,{...resolved,baseRevision:source.revision},fallbackId,{});
        if(parsed.ok&&!parsed.probe){
          const conflicts=[];
          const proposed=parsed.preview.after;
          const after=base?(resolved.mode==='replace'&&JSON.stringify(base.project)!==JSON.stringify(live.project)
            ?(conflicts.push('project'),proposed):mergeBridgeState(base.project,live.project,proposed,'project',conflicts)):proposed;
          if(!base)conflicts.push('TASK_BASE_UNAVAILABLE');
          if(base&&resolved.mode==='patch')for(const entry of resolved.patches){
            const find=p=>p.phrases?p.phrases.find(v=>v.id===entry.phraseId)?.project:p;
            const b=find(base.project),c=find(live.project),a=find(after);
            if(b&&c&&a)for(const [role,values]of Object.entries(entry.voices)){
              const i=api.getCapabilities().roles.findIndex(r=>r.id===role);
              for(const [key,value]of Object.entries(values)){
                if(c.tracks[i][key]!==b.tracks[i][key]&&c.tracks[i][key]!==value)conflicts.push('patch.'+(entry.phraseId??'single')+'.'+role+'.'+key);
                a.tracks[i][key]=value;
              }
            }
          }
          parsed.transaction={schemaVersion:1,baseRevision:live.revision,operations:[{op:after.phrases?'composition.replace':'project.replace',project:after}]};
          try{
            parsed.preview=api.previewOperations(parsed.transaction);
          }catch(e){
            // Individually valid concurrent edits may be incompatible together
            // (for example a shorter meter and later note positions). Do not ask
            // the composer to repair an automatic merge or invent a compromise.
            conflicts.push('project: incompatible concurrent changes');
            parsed.transaction.operations[0].project=proposed;
            parsed.transaction.operations[0].op=proposed.phrases?'composition.replace':'project.replace';
            parsed.preview=api.previewOperations(parsed.transaction);
          }
          parsed.currentRevision=live.revision;
          parsed.scoreAudit=auditScore(parsed.preview.after,api.getCapabilities());
          parsed.scoreReport=diagnoseScore(parsed.preview.after,parsed.scoreAudit);
          parsed.conflicts=conflicts;
        }
      }
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
            if(result.id===name.slice(0,-12)&&result.status==='ready')readyIds.add(result.id);
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
          if(parsed.probe){
            consecutiveErrors=0;state.error=null;state.lastResult=null;
            await writeResponse({ok:true,status:'ready',applied:false,id:parsed.id,submissionVersion:submission.submissionVersion,currentRevision:parsed.currentRevision,instructionForAgent:'Folder exchange verified. Read STATE and submit music using this same ID. HALO manages freshness; only HALO writes responses.'},baseId);
            if(!readyIds.has(baseId)&&!taskBases.has(baseId)){
              if(taskBases.size>=16)taskBases.delete(taskBases.keys().next().value);
              taskBases.set(baseId,clone(api.getProjectState()));
            }
            readyIds.add(baseId);continue;
          }
          consecutiveErrors = 0;
          state.error = null;
          state.snapshotRevision = null;
          state.pending = {id:parsed.id, conflicts:parsed.conflicts||[], filename, transaction:parsed.transaction, preview:parsed.preview, baseId,
            ...(parsed.scoreMode ? {scoreMode:parsed.scoreMode,scoreReport:parsed.scoreReport,scoreAudit:parsed.scoreAudit} : {}),
};
          // Private handles/fingerprint are not serialized into UI or context files.
          pendingSource = {directory, requestFile, fingerprint:submission.fingerprint};
          const response = {ok:true, status:'pending_approval', applied:false, id:parsed.id, submissionVersion:submission.submissionVersion,
            conflicts:parsed.conflicts||[], baseRevision:parsed.transaction.baseRevision, currentRevision:parsed.currentRevision,
            instructionForAgent:'Inspect scoreAudit and every scoreReport item. After reporting pending_approval, STOP; only the user approves in HALO. Approval is performed by the user in HALO. A later user musical change requires a NEW ID and probe.',
            ...(parsed.scoreReport ? {scoreReport:parsed.scoreReport,scoreAudit:parsed.scoreAudit} : {}),
timestamp:new Date().toISOString()};
          await writeResponse(response, baseId);
          state.lastResult = null;
          if (state.autoApply && !reviewingAgain && !state.pending.conflicts.length) await commitPending();
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
        const liveRevision=api.getRevision?api.getRevision():api.getProjectState().revision;
        if(p.transaction.baseRevision!==liveRevision){
          submissionCache.delete(p.baseId);processedContent.delete(p.baseId);
          state.pending=null;pendingSource=null;
          // Rebuild the proposal against the live state; require another review.
          state.busy=false;reviewingAgain=true;
          try{await checkFolder();}finally{state.busy=true;reviewingAgain=false;}
          return;
        }
        api.setEnabled(true);
        const applied = await api.applyOperations(p.transaction);
        // Mark before I/O so a failed response write cannot re-apply in this session.
        terminalIds.add(p.baseId); terminalIds.add(p.id);
        state.pending = null; pendingSource = null;
        consecutiveErrors = 0;
        const response = {ok:true, status:'applied', applied:true, id:p.id,
          appliedRevision:applied.revision, currentRevision:applied.revision,
          instructionForAgent:'Report applied and end this turn; this ID is terminal. A later user musical change requires a NEW ID and probe.',
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
      taskBases.clear();
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
      fileCache.clear(); cachedBytes = 0; responseCache.clear(); submissionCache.clear(); processedContent.clear(); terminalIds.clear(); readyIds.clear();
      pendingSource = null; state.pending = null;
      dirHandle = validHandle;
      state.snapshotRevision = null;
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
      taskBases.clear();
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
      taskBases.clear();
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
        state.snapshotRevision = null;
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
      if (!dirHandle || state.busy) return;
      state.busy = true;
      state.snapshotRevision = null;
      notify();
      try {
        await syncStateOnly(dirHandle, api);
        lastSyncedRevision = (api.getRevision ? api.getRevision() : api.getProjectState().revision);
        state.lastSync = new Date().toISOString();

        // An explicit refresh must read real bytes, including same-size/mtime edits.
        processedContent.clear(); submissionCache.clear();
        fileCache.clear(); cachedBytes = 0; responseCache.clear();
        state.snapshotRevision = lastSyncedRevision;
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
        taskBases.clear();readyIds.clear();
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
          ${s.error && s.error !== s.lastResult?.error ? `<div style="color:#f89a9a;margin-top:4px;">⚠ ${s.error}</div>` : ''}
        `;
        if (Number.isSafeInteger(s.snapshotRevision)) {
          const refreshed=document.createElement('p');
          refreshed.textContent=tr('Снимок обновлён: ревизия '+s.snapshotRevision+'. HALO самостоятельно проверяет актуальность предложений.','Snapshot updated: revision '+s.snapshotRevision+'. HALO checks proposal freshness automatically.');
          meta.append(refreshed);
        }
        if (hasError) {
          const errSuggest = document.createElement('div');
          errSuggest.style.cssText = 'margin-top:8px;padding:8px 10px;background:rgba(230,80,60,.12);border:1px solid rgba(248,163,154,.35);border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;';
          const errText = document.createElement('span');
          errText.style.cssText = 'font-size:10px;color:#ffd8d4;line-height:1.4;flex:1;min-width:200px;';
          const isRevMismatch = String(s.error || s.lastResult?.error || '').includes('CONFLICT_REVISION_MISMATCH');
          if (isRevMismatch) {
            errText.textContent = tr(
              'Запрос основан на старой ревизии. «Обновить снимок» выгружает текущий проект, но не исправляет и не применяет запрос. HALO пересобирает предложение относительно текущего проекта; проверьте конфликты в карточке предложения.',
              'The request uses an old revision. Refresh snapshot exports the current project; it neither repairs nor applies the request. HALO rebuilds proposals against the current project; review conflicts in the proposal panel.'
            );
          } else {
            errText.textContent = tr('Агент должен прочитать error/help в responses/ID.result.json и исправить указанные поля того же незавершённого запроса. Очистка папки удаляет запросы и ответы, а не исправляет партитуру.', 'The agent must read error/help in responses/ID.result.json and correct the indicated fields of the same unfinished request. Clearing the folder deletes requests and receipts; it does not repair the score.');
          }

          const btnGroup = document.createElement('div');
          btnGroup.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';

          if (isRevMismatch) {
            const btnRebase = document.createElement('button');
            btnRebase.className = 'glass-btn';
            btnRebase.style.cssText = 'font-size:10px;padding:3px 10px;min-height:26px;background:rgba(30,110,95,.6);border-color:#7df0dc;color:#d8fff8;cursor:pointer;white-space:nowrap;font-weight:600;';
            btnRebase.textContent = tr('Обновить снимок', 'Refresh snapshot');
            btnRebase.disabled = s.busy;
            btnRebase.title = tr('Выгрузить текущий проект и перечитать файлы. Не меняет baseRevision запроса и не применяет музыку.', 'Export the current project and reread files. Does not change request baseRevision or apply music.');
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

        `;
        pendingBox.append(pHead);
        if(s.pending.conflicts?.length){
          const warning=document.createElement('p');
          warning.textContent=tr('Изменения пересекаются или исходное состояние задания недоступно. Принять предложение — заменить конфликтующие данные вариантом агента. Отклонить — сохранить музыку сайта.','Changes overlap or the task baseline is unavailable. Accept proposal to replace conflicting data with the agent version; reject to keep site music.')+' '+s.pending.conflicts.join(', ');
          pendingBox.append(warning);
        }

        const pOps = document.createElement('ul');
        pOps.style.cssText = 'margin:6px 0 10px 18px;padding:0;font-size:10px;color:#cbe2ee;';
        if (s.pending.scoreMode) {
          const after = s.pending.preview.after;
          const heading = document.createElement('p');
          heading.style.cssText = 'font-size:11px;line-height:1.5;color:#d8ffff;';
          heading.textContent = (s.pending.scoreMode === 'patch' ? tr('Атомарное изменение параметров','Atomic parameter changes') : s.pending.scoreMode === 'edit' ? tr('Правка партитуры','Score edit') : tr('Новая партитура: замена музыки','New score: replaces music')) +
            ` · ${after.tempo} BPM · ` + (after.phrases ? `${after.phrases.length} ${tr('фраз','phrases')}, ${after.sections.length} ${tr('секций','sections')}` : `${after.bars} ${tr('тактов','bars')}`);
          pendingBox.append(heading);
          const roleNames = {pulse:['Пульс','Pulse'],accent:['Акцент','Accent'],percussion:['Перкуссия','Percussion'],texture:['Фактура','Texture'],bass:['Бас','Bass'],melody:['Мелодия','Melody'],arpeggio:['Арпеджио','Arpeggio'],harmony:['Гармония','Harmony']};
          const roles = api.getCapabilities().roles;
          for (const phrase of after.phrases || [{id:null,project:after}]) {
            for (const [i, track] of phrase.project.tracks.entries()) {
              const li = document.createElement('li'), role = roleNames[roles[i].id];
              if(s.pending.scoreMode==='patch'){
                const before=s.pending.preview.before;
                const old=(before.phrases?before.phrases.find(p=>p.id===phrase.id)?.project:before)?.tracks[i];
                const changes=['on','level','character','duration','space','delay','chorus'].filter(k=>old?.[k]!==track[k]);
                if(!changes.length)continue;
                li.textContent=(phrase.id===null?'':tr('Фраза ','Phrase ')+phrase.id+': ')+tr(...role)+' — '+changes.map(k=>k+': '+(old?.[k]??'—')+' → '+track[k]).join(', ');
                pOps.append(li);continue;
              }
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
          note.textContent=tr('Такт = bar/measure; доля = beat (четверть); шаг = step (шестнадцатая). 4/4: 4 доли, 16 шагов; 3/4: 3 доли, 12 шагов. Шаги отсчитываются от 0 внутри каждой фразы. Числа — начала событий, не длительность: 0 не доказывает тишину; ? — генеративная партия.','Bar = measure; beat = quarter note; step = sixteenth note. 4/4: 4 beats, 16 steps; 3/4: 3 beats, 12 steps. Steps start at 0 within each phrase. Counts are event starts, not duration: 0 does not prove silence; ? is a generated part.');details.append(note);
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
        btnApply.textContent = s.pending.conflicts?.length ? tr('Принять вариант агента','Accept agent version') : tr('✓ Применить изменения', '✓ Apply Changes');
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
      <li><code>project-state.json</code> — ${tr('Текущая ревизия и вся композиция как halo-score; scoreExport сообщает ограничения — только чтение','Live revision and complete composition as halo-score; scoreExport discloses limits — read-only')}</li>
      <li><code>requests/</code> — ${tr('Готовая папка входящих команд: пишите JSON-файлы прямо сюда (request-001.json и request-001--melody.json), без создания подпапок','Prepared incoming folder: write JSON files directly here (request-001.json and request-001--melody.json), without creating subfolders')}</li>
      <li><code>responses/</code> — ${tr('Папка ответов HALO (например, request-001.result.json)','HALO response folder (e.g. request-001.result.json)')}</li>
    `;

    el('strong', tr('Пример запроса для агента (Bionic / Antigravity / Codex):', 'Example prompt for agent (Bionic / Antigravity / Codex):'), 'display:block;font-size:11px;margin-bottom:4px;');
    const promptBox = el('div', tr(
      '«Вот папка HALO. Прочитай AGENT_GUIDE.md и сочини новогодний джингл на 8 тактов. Выбери подходящие тембры из каталога, запиши оригинальные партии в score и передай их в HALO по руководству. Прочитай ответ HALO и сообщи результат; если нужно моё решение, остановись».',
      '“Here is the HALO folder. Read AGENT_GUIDE.md and compose an eight-bar New Year jingle. Choose suitable catalog timbres, write original parts as a score and deliver them to HALO using the guide. Read HALO’s response and report the result; stop if my decision is needed.”'
    ), 'font-size:10px;line-height:1.5;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px;color:#d5ebf5;user-select:all;');
  }

  const api = {
    mergeBridgeState,
    parseScoreText,
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
