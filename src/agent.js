/* Declarative local bridge. Audio and model transport remain separate. */
(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const fields=['instrument','sound','generator','on','steps','exact','sequence','noteEvents','noteTranspose','level','density','character','duration','space','delay','delayTime','chorus'];
 const visualOptions={scene:['ORBIT','BLOOM','CURRENT'],motion:['DRIFT','IN TIME','PHRASE'],effects:['CLASSIC','COSMIC','HYPER']};
 function create(env){
  let enabled=false,busy=false,last='',revision=0,undo=[],redo=[];
  function state(){const value={project:check(env.read()),...(env.visual?{visual:env.visual()}:{} )},text=JSON.stringify(value);if(text!==last){revision++;last=text}return {revision,...copy(value)}}
  function only(value,allowed,path){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error('UNKNOWN_PARAMETER: '+path)}
  function strictProject(p){
   only(p,['format','version','setup','bars','startStep','tempo','masterVolume','mix','seed','key','tracks','liveLoop'],'project');
   if(p.mix)only(p.mix,['low','mid','high','width'],'mix');
   if(Array.isArray(p.tracks))for(const t of p.tracks){only(t,['name','role',...fields],'track');if(t.sequence)only(t.sequence,['length','stepLength','offset'],'sequence');if(t.delayTime!==undefined&&!['1/16','1/8','1/8d','1/4'].includes(t.delayTime))throw Error('INVALID_DELAY_TIME');if(Array.isArray(t.noteEvents))for(const e of t.noteEvents)only(e,['step','notes'],'noteEvent')}
   if(p.liveLoop){only(p.liveLoop,['version','layerIds','settings'],'liveLoop');only(p.liveLoop.settings,['bars','level','pan','space','delay','trimStart','trimEnd','offsetSec','latencyMs','pitch','rootNote','pitchOctave','character','duration','density','chorus','cycle','stepLength','offset','mute','solo','monitor','copyrightConfirmed','instantRestart','reverse','mode','sliceCount','slicePattern','delayTime','pitchSteps','sliceSteps'],'liveLoop.settings')}
  }
  function check(value){
   if(!value||new TextEncoder().encode(JSON.stringify(value)).length>524288)throw Error('PAYLOAD_TOO_LARGE');
   if(value.format==='halo-composition'){only(value,['format','version','repeat','tempo','masterVolume','mix','phrases','sections'],'composition');if(value.mix)only(value.mix,['low','mid','high','width'],'mix');if(Array.isArray(value.phrases))for(const p of value.phrases){only(p,['id','label','project'],'phrase');strictProject(p.project)}if(Array.isArray(value.sections))for(const s of value.sections)only(s,['phrase','repeats','name','fade'],'section');return env.song.validate(value,env.project,env.sounds)}
   strictProject(value);return env.project.validate(value,env.sounds);
  }
  function capabilities(){
   const R=env.sounds.roles;
   return {version:2,transport:'browser-local API; optional AI Composer uses user-selected LLM endpoint',operations:['track.patch','phrase.patch','master.patch','composition.replace','project.replace',...(env.visual?['visual.patch']:[])],trackFields:fields,phraseFields:['bars','startStep','seed','key','liveLoop'],masterFields:['tempo','masterVolume','mix'],limits:{bpm:[30,200],bars:[4,8],tracks:8,stepsPerBar:16,timeSignatures:['4/4'],phrases:32,sections:32,totalBars:128,bytes:524288,operations:256},
    samples:env.samples||[],defaults:env.defaults?.()||{},catalog:Object.fromEntries(['ambient','reactor'].map(world=>[world,env.sounds.banksFor(world)])),
    roles:R.roles.map(r=>({...r,policy:R.voicePolicy({name:r.slot},{engine:'bell'})})),
    harmony:{keys:env.composition?.definitions||[],scales:{minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11]},customChords:'Explicit MIDI noteEvents on harmony/bass/melody; no separate editable chord progression field'},
    parameters:{voice:{range:[0,100],fields:['level','density','character','duration','space','delay','chorus'],density:'Generated probability only; exact steps bypass density',duration:'Per-track envelope, bounded by role; no per-note duration',sequence:{length:[4,32],stepLength:[1,2,4],offset:'integer 0..length-1; exact steps bypass cycle'}},master:{masterVolume:[0,100],defaultVolume:50,mix:{low:[-9,9],mid:[-9,9],high:[-9,9],width:[0,100]},eqHz:[120,1000,6000],pan:'Core pan fixed per slot scaled by width; bass/pulse near center',dynamics:'Fixed peak-protection compressor, not editable'},fx:{space:'Shared 2.8 s convolution reverb send',delay:'Shared BPM-synced feedback',delayTime:['1/16','1/8','1/8d','1/4'],chorus:'Shared stereo chorus send'}},
    notes:'MIDI 0..127, up to four per event and limited by role.maxNotes; exact=true for generator 3. steps must include each noteEvents.step. noteTranspose is the source key OFFSET, not key index: set it to harmony.keys[key].offset to play literal MIDI. Role/sample range folds octaves. No per-note velocity/duration/microtiming. Supply explicit notes for all pitched events when composing, rather than randomizing generators. Steps are sixteenths; eighths use 0,2,4,... . Rest = absent step.',
    visuals:{...visualOptions,writable:env.visual?Object.keys(visualOptions):[],geometry:'Fixed slot index i, radius=(135+24*i)*responsiveScale; melody/arpeggio/harmony are outer slots. Track 09 outermost. No orbit reorder/radius/speed/phase/direction setters. Scenes only in DRIFT; shared clock owns notes. PHRASE markers show actual scheduled steps. Visual-only operations must never change music.'},
    composition:{schema:{format:'halo-composition',version:1,tempo:'30..200',masterVolume:'0..100',mix:'same as master',repeat:'boolean',phrases:[{id:'unique integer 1..1000000',label:'optional 1..10 letters/digits',project:'complete version-1 project'}],sections:[{phrase:'existing phrase ID',name:['intro','verse','verse2','chorus','bridge','outro','phrase'],repeats:'1..8',fade:['none','in','out']}]},durationSeconds:'totalBars * 240 / tempo (4/4)',repeatedReferences:'Same phrase ID shares edits; new ID+deep copy creates independent variation',transitions:'Section boundary, optional one-phrase fade in/out; no crossfade'},
    track09:{audioSentToModel:false,settings:'Existing liveLoop {version:1,layerIds,settings}; only local reference IDs, never PCM. Keep layerIds unchanged.',ranges:{bars:[1,2,4,8],level:[0,100],pan:[-100,100],space:[0,100],delay:[0,100],chorus:[0,100],character:[0,100],duration:[0,100],density:[0,100],pitch:[-12,12],rootNote:[36,84],pitchOctave:[-1,0,1],trimStart:[0,.95],trimEnd:[.01,1],offsetSec:[0,120],cycle:[4,32],stepLength:[1,2,4],offset:[0,15]},modes:['loop','slice','pitch'],patterns:'16 entries; sliceSteps -1..15; pitchSteps -1..7; -1=rest',flags:['mute','solo','reverse','instantRestart'],unsupported:['upload','record','enable monitoring','read PCM']},
    documentation:['docs/engine-capabilities.md','docs/agent-api-specification.md']};
  }
  function patch(target,values,allowed){if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(k=>!allowed.includes(k)))throw Error('UNKNOWN_PARAMETER');Object.assign(target,copy(values))}
  function preview(request){
   const before=state();if(!request||request.schemaVersion!==1||request.baseRevision!==before.revision)throw Error('CONFLICT_REVISION_MISMATCH');
   if(new TextEncoder().encode(JSON.stringify(request)).length>524288||!Array.isArray(request.operations)||!request.operations.length||request.operations.length>256)throw Error('INVALID_TRANSACTION');
   let next=copy(before.project),visual=copy(before.visual||{});
   for(const o of request.operations){
    if(!o||typeof o!=='object')throw Error('UNKNOWN_OPERATION');
    if(o.op==='visual.patch'){if(!env.visual)throw Error('VISUAL_UNAVAILABLE');patch(visual,o.values,Object.keys(visualOptions));for(const k of Object.keys(visualOptions))if(!visualOptions[k].includes(visual[k]))throw Error('INVALID_VISUAL');if(o.values.scene!==undefined&&visual.motion!=='DRIFT')throw Error('SCENE_REQUIRES_DRIFT');continue}
    if(o.op==='project.replace'||o.op==='composition.replace'){next=check(o.project);continue}
    if(o.op==='master.patch'){patch(next,o.values,['tempo','masterVolume','mix']);if(next.phrases)for(const p of next.phrases)patch(p.project,o.values,['tempo','masterVolume','mix']);continue}
    const p=next.phrases?next.phrases.find(p=>p.id===o.phraseId)?.project:next;if(!p)throw Error('PHRASE_NOT_FOUND');
    if(o.op==='phrase.patch')patch(p,o.values,['bars','startStep','seed','key','liveLoop']);
    else if(o.op==='track.patch'){if(!Number.isInteger(o.trackIndex)||o.trackIndex<0||o.trackIndex>7)throw Error('INVALID_TRACK');const t=p.tracks[o.trackIndex],prior=JSON.stringify(t.steps);patch(t,o.values,fields);if(t.generator===3&&!t.exact&&prior!==JSON.stringify(t.steps))throw Error('EXACT_REQUIRED')}
    else throw Error('UNKNOWN_OPERATION');
   }
   next=check(next);return {baseRevision:before.revision,before:before.project,after:next,...(env.visual?{visualBefore:before.visual,visualAfter:visual}:{}),playback:JSON.stringify(next)===JSON.stringify(before.project)?'unchanged':'paused on apply; press Play to resume'};
  }
  async function write(next,visual){if(!enabled)throw Error('AGENT_DISABLED');if(busy)throw Error('AGENT_BUSY');busy=true;try{const before=state();if(JSON.stringify(next)!==JSON.stringify(before.project))await env.write(copy(next));if(env.writeVisual&&visual)env.writeVisual(copy(visual));return state()}finally{busy=false}}
  function context(){
   const current=state(),C=env.composition;
   const music=(current.project.phrases||[{id:null,project:current.project}]).map(entry=>{
    const p=entry.project,key=C?.definitions[p.key]||{offset:0,mode:'minor'};const runtime=p.tracks.map(t=>({...t,setup:p.setup}));env.sounds.arrange(runtime);const tracks=runtime.map((t,i)=>{
     const track={...t,setup:p.setup,phraseBars:p.bars,...(t.generator!==3||t.exact?{manualSteps:t.steps,manualBars:p.bars}:{})};
     return {trackIndex:i,role:env.sounds.roles.forTrack(t).id,policy:env.sounds.roles.voicePolicy(t,env.sounds.soundFor(track)),events:t.steps.map(step=>({step,notes:env.sounds.notesFor(track,i,Math.floor(step/16),step%16,p.seed,key.offset,p.bars,(p.startStep||0)+step,key.mode)}))};
    });
    return {phraseId:entry.id,key,tracks,generatedHarmony:Array.from({length:p.bars},(_,bar)=>env.sounds.phrases.chordFor(p.setup,p.seed,bar,p.bars,key.offset,key.mode))};
   });
   return {state:current,capabilities:copy(capabilities()),music,history:{undo:undo.length,redo:redo.length}};
  }
  async function history(from,to,side){const h=from.at(-1);if(!h)throw Error('NO_HISTORY');const current=state(),expected=side==='before'?h.after:h.before;if(JSON.stringify(current.project)!==JSON.stringify(expected.project)||JSON.stringify(current.visual)!==JSON.stringify(expected.visual))throw Error('CONFLICT_REVISION_MISMATCH');const result=await write(h[side].project,h[side].visual);from.pop();to.push(h);return result}
  return {getCapabilities:()=>copy(capabilities()),getProjectState:state,getContext:context,isEnabled:()=>enabled,setEnabled(value){enabled=value===true;return enabled},previewOperations:preview,validateOperations(r){try{preview(r);return {valid:true}}catch(e){return {valid:false,error:e.message}}},async applyOperations(r){const p=preview(r),before={project:p.before,...(env.visual?{visual:p.visualBefore}:{})},result=await write(p.after,p.visualAfter);undo.push({before,after:copy(result)});if(undo.length>10)undo.shift();redo=[];return result},undo:()=>history(undo,redo,'before'),redo:()=>history(redo,undo,'after')};
 }
 function panel(host,api,language,env){
  if(root.HaloComposerUI)return root.HaloComposerUI.mount(host,api,language,env);
  host.textContent=language()==='ru'?'AI-композитор недоступен':'AI Composer unavailable';
 }
 const api={create,panel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloAgent=api;
})(globalThis);
