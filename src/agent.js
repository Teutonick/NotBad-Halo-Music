/* Declarative local bridge. Audio and model transport remain separate. */
(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const fields=['instrument','sound','soundWorld','generator','on','steps','exact','sequence','noteEvents','noteTranspose','level','density','character','duration','space','delay','delayTime','chorus'];
 const visualOptions={scene:['ORBIT','BLOOM','CURRENT'],motion:['DRIFT','IN TIME','PHRASE'],effects:['CLASSIC','COSMIC','HYPER']};
 function create(env){
  let enabled=false,busy=false,last='',revision=0,undo=[],redo=[];
  function state(snapshot=true){const value={project:check(env.read()),...(env.visual?{visual:env.visual()}:{} )},text=JSON.stringify(value);if(text!==last){revision++;last=text}return snapshot?{revision,...copy(value)}:{revision}}
  function only(value,allowed,path){
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_TYPE: expected object for '+path);
   const unknown=Object.keys(value).filter(k=>!allowed.includes(k));
   if(unknown.length>0)throw Error('UNKNOWN_FIELD: unexpected field(s) ['+unknown.join(', ')+'] in '+path+'. Allowed fields: ['+allowed.join(', ')+']');
  }
  function strictProject(p){
   only(p,['format','version','setup','world','soundWorld','bars','startStep','tempo','masterVolume','mix','seed','key','tracks','liveLoop','timeSignature'],'project');
   if(p.format!=='notbad-halo-project'&&p.format!=='halo-project')throw Error('UNSUPPORTED_FORMAT: expected "notbad-halo-project" or "halo-project"');
   if(p.mix)only(p.mix,['low','mid','high','width'],'mix');
   if(Array.isArray(p.tracks))for(const t of p.tracks){only(t,['name','role',...fields],'track');if(t.sequence)only(t.sequence,['length','stepLength','offset'],'sequence');if(t.delayTime!==undefined&&!['1/16','1/8','1/8d','1/4'].includes(t.delayTime))throw Error('INVALID_DELAY_TIME');if(Array.isArray(t.noteEvents))for(const e of t.noteEvents)only(e,['step','notes'],'noteEvent')}
   if(p.liveLoop){only(p.liveLoop,['version','layerIds','settings'],'liveLoop');only(p.liveLoop.settings,['bars','level','pan','space','delay','trimStart','trimEnd','offsetSec','latencyMs','pitch','rootNote','pitchOctave','character','duration','density','chorus','cycle','stepLength','offset','mute','solo','monitor','copyrightConfirmed','instantRestart','reverse','mode','sliceCount','slicePattern','delayTime','pitchSteps','sliceSteps','slicePoints'],'liveLoop.settings')}
  }
  function check(value){
   if(!value||new TextEncoder().encode(JSON.stringify(value)).length>524288)throw Error('PAYLOAD_TOO_LARGE');
   if(value.format==='halo-composition'){
     only(value,['format','version','repeat','tempo','masterVolume','mix','phrases','sections','setup','world','soundWorld','timeSignature','bars','name','title','label'],'composition');
     if(value.mix)only(value.mix,['low','mid','high','width'],'mix');
     const compSetup = value.setup || value.world || value.soundWorld;
     if(Array.isArray(value.phrases))for(const p of value.phrases){
       only(p,['id','label','project'],'phrase');
       if(p.project){
         if(!p.project.setup&&!p.project.world&&!p.project.soundWorld&&compSetup)p.project.setup=compSetup;
         if(!p.project.timeSignature&&value.timeSignature)p.project.timeSignature=value.timeSignature;
         if(!p.project.bars&&value.bars)p.project.bars=value.bars;
       }
       strictProject(p.project);
     }
     if(Array.isArray(value.sections))for(const s of value.sections)only(s,['phrase','repeats','name','fade'],'section');
     return env.song.validate(value,env.project,env.sounds);
   }
   strictProject(value);return env.project.validate(value,env.sounds);
  }
  function capabilities(){
   const R=env.sounds.roles;
   return {version:2,transport:'External browser agents through WebMCP Site Tools only; no LLM client in HALO',operations:['track.patch','phrase.patch','master.patch','project.patch','composition.replace','project.replace',...(env.visual?['visual.patch']:[])],trackFields:fields,phraseFields:['bars','startStep','seed','key','liveLoop','timeSignature'],masterFields:['tempo','masterVolume','mix'],limits:{bpm:[30,200],bars:[4,8],tracks:8,stepsPerBar:16,timeSignatures:['4/4','3/4'],phrases:15,sections:32,totalBars:128,bytes:524288,operations:256},
    crossWorldTimbres:{source:'track.soundWorld records the catalog origin; omitted uses the phrase setup',selection:'JSON may select compatible timbres from either catalog; manual bank selection and GENERATE use the current world'},
    samples:env.samples||[],defaults:env.defaults?.()||{},catalog:Object.fromEntries(['ambient','reactor','water'].map(world=>[world,env.sounds.banksFor(world)])),
    roles:R.roles.map(r=>({...r,policy:R.voicePolicy({name:r.slot},{engine:'bell'})})),
    harmony:{keys:env.composition?.definitions||[],scales:{minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11]},customChords:'Explicit MIDI noteEvents on harmony/bass/melody; no separate editable chord progression field'},
    parameters:{voice:{range:[0,100],fields:['level','density','character','duration','space','delay','chorus'],density:'Generated probability only; exact steps bypass density',duration:'Per-track envelope, bounded by role; no per-note duration',sequence:{length:[4,32],stepLength:[1,2,4],offset:'integer 0..length-1; exact steps bypass cycle'}},master:{masterVolume:[0,100],defaultVolume:50,mix:{low:[-9,9],mid:[-9,9],high:[-9,9],width:[0,100]},eqHz:[120,1000,6000],pan:'Core pan fixed per slot scaled by width; bass/pulse near center',dynamics:'Fixed peak-protection compressor, not editable'},fx:{space:'Shared 2.8 s convolution reverb send',delay:'Shared BPM-synced feedback',delayTime:['1/16','1/8','1/8d','1/4'],chorus:'Shared stereo chorus send'}},
    notes:'MIDI 0..127, up to four per event and limited by role.maxNotes; exact=true for generator 3. steps must include each noteEvents.step. noteTranspose is the source key OFFSET, not key index: set it to harmony.keys[key].offset to play literal MIDI. Role/sample range folds octaves. No per-note velocity/duration/microtiming. Supply explicit notes for all pitched events when composing, rather than randomizing generators. Steps are sixteenths; eighths use 0,2,4,... . Rest = absent step.',
    visuals:{...visualOptions,writable:env.visual?Object.keys(visualOptions):[],geometry:'Fixed slot index i, radius=(135+24*i)*responsiveScale; melody/arpeggio/harmony are outer slots. Track 09 outermost. No orbit reorder/radius/speed/phase/direction setters. Scenes only in DRIFT; shared clock owns notes. PHRASE markers show actual scheduled steps. Visual-only operations must never change music.'},
    composition:{schema:{format:'halo-composition',version:1,tempo:'30..200',masterVolume:'0..100',mix:'same as master',repeat:'boolean',phrases:[{id:'unique integer 1..1000000',label:'optional 1..10 letters/digits',project:'complete version-1 project'}],sections:[{phrase:'existing phrase ID',name:['intro','verse','verse2','chorus','bridge','outro','phrase'],repeats:'1..8',fade:['none','in','out']}]},durationSeconds:'totalBars * 240 / tempo (4/4)',repeatedReferences:'Same phrase ID shares edits; new ID+deep copy creates independent variation',transitions:'Section boundary, optional one-phrase fade in/out; no crossfade'},
    track09:{audioSentToModel:false,settings:'Existing liveLoop {version:1,layerIds,settings}; only local reference IDs, never PCM. Keep layerIds unchanged.',ranges:{bars:[1,2,4,8],level:[0,100],pan:[-100,100],space:[0,100],delay:[0,100],chorus:[0,100],character:[0,100],duration:[0,100],density:[0,100],pitch:[-12,12],rootNote:[36,84],pitchOctave:[-1,0,1],trimStart:[0,.95],trimEnd:[.01,1],offsetSec:[0,120],cycle:[4,32],stepLength:[1,2,4],offset:[0,15]},modes:['loop','slice','pitch'],patterns:'16 entries; sliceSteps -1..15; pitchSteps -1..7; -1=rest',slicePoints:'Optional array of normalized cut positions (0..1) or null for auto-transients',flags:['mute','solo','reverse','instantRestart'],unsupported:['upload','record','enable monitoring','read PCM']},
    documentation:['docs/engine-capabilities.md','docs/agent-api-specification.md']};
  }
  function patch(target,values,allowed,contextName='patch'){
   if(!values||typeof values!=='object'||Array.isArray(values))throw Error('INVALID_TYPE: expected object for '+contextName);
   const unknown=Object.keys(values).filter(k=>!allowed.includes(k));
   if(unknown.length>0)throw Error('UNKNOWN_FIELD: unexpected field(s) ['+unknown.join(', ')+'] in '+contextName+'. Allowed fields: ['+allowed.join(', ')+']');
   Object.assign(target,copy(values));
  }
  function preview(request){
   const before=state();if(!request||request.schemaVersion!==1||request.baseRevision!==before.revision)throw Error('CONFLICT_REVISION_MISMATCH');
   if(new TextEncoder().encode(JSON.stringify(request)).length>524288||!Array.isArray(request.operations)||!request.operations.length||request.operations.length>256)throw Error('INVALID_TRANSACTION');
   let next=copy(before.project),visual=copy(before.visual||{});
   for(const o of request.operations){
    if(!o||typeof o!=='object')throw Error('UNKNOWN_OPERATION');
    if(o.op==='visual.patch'){if(!env.visual)throw Error('VISUAL_UNAVAILABLE');patch(visual,o.values,Object.keys(visualOptions),'visual.patch');for(const k of Object.keys(visualOptions))if(!visualOptions[k].includes(visual[k]))throw Error('INVALID_VISUAL');if(o.values.scene!==undefined&&visual.motion!=='DRIFT')throw Error('SCENE_REQUIRES_DRIFT');continue}
    if(o.op==='project.patch'||o.op==='project.replace'||o.op==='composition.replace'){
      const target=o.project||o.composition||o.values||(o.op==='project.patch'||o.op==='project.replace'?o:null);
      if(!target)throw Error('MISSING_PAYLOAD: "'+o.op+'" requires "project", "composition", or "values" object');
      if(o.op==='project.patch'||(!target.tracks&&!target.phrases)){
        const allowedProjectFields=['setup','world','soundWorld','bars','startStep','timeSignature','tempo','masterVolume','mix','seed','key','liveLoop'];
        const values=target===o?{...target}:target;delete values.op;
        patch(next,values,allowedProjectFields,o.op);
        const s=target.setup||target.world||target.soundWorld;
        if(s)next.setup=s;
        if(values.bars && values.startStep === undefined){
          const spb = next.timeSignature === '3/4' ? 12 : 16;
          const maxSteps = values.bars * spb;
          if(next.startStep && next.startStep % maxSteps !== 0){
            next.startStep = Math.floor(next.startStep / maxSteps) * maxSteps;
          }
        }
        if(next.phrases){
          for(const ph of next.phrases){
            patch(ph.project,target,allowedProjectFields,o.op);
            if(s)ph.project.setup=s;
            if(values.bars && values.startStep === undefined){
              const spb = ph.project.timeSignature === '3/4' ? 12 : 16;
              const maxSteps = values.bars * spb;
              if(ph.project.startStep && ph.project.startStep % maxSteps !== 0){
                ph.project.startStep = Math.floor(ph.project.startStep / maxSteps) * maxSteps;
              }
            }
          }
        }
        continue;
      }
      next=check(target);
      continue;
    }
    if(o.op==='master.patch'){patch(next,o.values,['tempo','masterVolume','mix'],'master.patch');if(next.phrases)for(const p of next.phrases)patch(p.project,o.values,['tempo','masterVolume','mix'],'master.patch');continue}
    const p=next.phrases?next.phrases.find(p=>p.id===o.phraseId)?.project:next;if(!p)throw Error('PHRASE_NOT_FOUND');
    if(o.op==='phrase.patch'){
      patch(p,o.values,['bars','startStep','seed','key','liveLoop','timeSignature','setup','world','soundWorld'],'phrase.patch');
      const s=o.values?.setup||o.values?.world||o.values?.soundWorld;
      if(s)p.setup=s;
      if(o.values?.bars && o.values?.startStep === undefined){
        const spb = p.timeSignature === '3/4' ? 12 : 16;
        const maxSteps = o.values.bars * spb;
        if(p.startStep && p.startStep % maxSteps !== 0){
          p.startStep = Math.floor(p.startStep / maxSteps) * maxSteps;
        }
      }
    }
    else if(o.op==='track.patch'){
      if(!Number.isInteger(o.trackIndex)||o.trackIndex<0||o.trackIndex>7)throw Error('INVALID_TRACK: trackIndex must be 0..7');
      const t=p.tracks[o.trackIndex],prior=JSON.stringify(t.steps);
      const gen=o.values?.generator??t.generator;
      if((o.values?.steps!==undefined||o.values?.noteEvents!==undefined)&&o.values?.exact===undefined&&gen===3){
        t.exact=true;
      }
      if(o.values?.sound!==undefined&&o.values.soundWorld===undefined)delete t.soundWorld;
      patch(t,o.values,fields,'track.patch');
      if(t.generator===3&&!t.exact&&prior!==JSON.stringify(t.steps))throw Error('EXACT_REQUIRED: manual steps modification requires exact=true');
    }
    else throw Error('UNKNOWN_OPERATION');
   }
   next=check(next);return {baseRevision:before.revision,before:before.project,after:next,...(env.visual?{visualBefore:before.visual,visualAfter:visual}:{}),playback:JSON.stringify(next)===JSON.stringify(before.project)?'unchanged':'paused on apply; press Play to resume'};
  }
  async function write(next,visual){if(!enabled)throw Error('AGENT_DISABLED');if(busy)throw Error('AGENT_BUSY');busy=true;try{const before=state();if(JSON.stringify(next)!==JSON.stringify(before.project))await env.write(copy(next));if(env.writeVisual&&visual)env.writeVisual(copy(visual));return state()}finally{busy=false}}
  function context(){
   const current=state(),C=env.composition;
   const music=(current.project.phrases||[{id:null,project:current.project}]).map(entry=>{
    const p=entry.project,key=C?.definitions[p.key]||{offset:0,mode:'minor'};const runtime=p.tracks.map(t=>({...t,setup:p.setup,timeSignature:p.timeSignature}));env.sounds.arrange(runtime);const tracks=runtime.map((t,i)=>{
     const track={...t,setup:p.setup,phraseBars:p.bars,timeSignature:p.timeSignature,...(t.generator!==3||t.exact?{manualSteps:t.steps,manualBars:p.bars}:{})};
     const spb=p.timeSignature==='3/4'?12:16;
     return {trackIndex:i,role:env.sounds.roles.forTrack(t).id,policy:env.sounds.roles.voicePolicy(t,env.sounds.soundFor(track)),events:t.steps.map(step=>({step,notes:env.sounds.notesFor(track,i,Math.floor(step/spb),step%spb,p.seed,key.offset,p.bars,(p.startStep||0)+step,key.mode,p.timeSignature)}))};
    });
    return {phraseId:entry.id,key,tracks,generatedHarmony:Array.from({length:p.bars},(_,bar)=>env.sounds.phrases.chordFor(p.setup,p.seed,bar,p.bars,key.offset,key.mode))};
   });
   return {state:current,capabilities:copy(capabilities()),music,history:{undo:undo.length,redo:redo.length}};
  }
  async function history(from,to,side){const h=from.at(-1);if(!h)throw Error('NO_HISTORY');const current=state(),expected=side==='before'?h.after:h.before;if(JSON.stringify(current.project)!==JSON.stringify(expected.project)||JSON.stringify(current.visual)!==JSON.stringify(expected.visual))throw Error('CONFLICT_REVISION_MISMATCH');const result=await write(h[side].project,h[side].visual);h[side]=copy(result);from.pop();to.push(h);return result}
  async function resetProject(){
   enabled=true;
   undo=[];
   redo=[];
   revision=0;
   last='';
   const def=env.defaults?env.defaults():null;
   const baseTracks=(def?.ambientTracks&&def.ambientTracks.length===8)?def.ambientTracks:(env.sounds?.roles?.roles||[]).map(r=>{
     const init=env.sounds?.roles?.initial?env.sounds.roles.initial('ambient',r.slot):{instrument:r.slot,sound:'pulse'};
     return {name:r.slot,instrument:init.instrument||r.slot,generator:3,sound:init.sound||'pulse',on:true,exact:false,steps:[0,4,8,12],level:65,density:65,character:50,duration:50,space:50,delay:0,delayTime:'1/8',chorus:0};
   });
   const defaultProject={
    format:'notbad-halo-project',
    version:1,
    setup:'ambient',
    bars:4,
    startStep:0,
    timeSignature:'4/4',
    tempo:def?.tempo||72,
    masterVolume:def?.masterVolume||50,
    mix:def?.mix||{low:0,mid:0,high:0,width:35},
    seed:1,
    key:0,
    tracks:baseTracks.map(t=>{
      const g=t.generator||(t.role?3:1);
      const clean={
        name:t.name,
        instrument:t.instrument||t.name,
        generator:g,
        sound:t.sound,
        on:t.on!==undefined?t.on:true,
        exact:t.exact===true,
        steps:Array.isArray(t.steps)&&t.steps.length?t.steps:[0,4,8,12],
        level:t.level??65,
        density:t.density??65,
        character:t.character??50,
        duration:t.duration??50,
        space:t.space??50,
        delay:t.delay??0,
        delayTime:t.delayTime||'1/8',
        chorus:t.chorus??0
      };
      if(g===3){
        clean.role=t.role||env.sounds?.roles?.forTrack(t)?.id||t.name.toLowerCase();
        clean.sequence=t.sequence||env.sounds?.roles?.sequence?.();
        clean.exact=t.exact===true;
      }
      return clean;
    })
   };
   await env.write(copy(defaultProject));
   if(env.writeVisual)env.writeVisual({scene:'ORBIT',motion:'DRIFT',effects:'COSMIC'});
   return state();
  }
  return {getCapabilities:()=>copy(capabilities()),getProjectState:state,getRevision:()=>state(false).revision,getContext:context,isEnabled:()=>enabled,setEnabled(value){enabled=value===true;return enabled},async setPlayback(value){if(!enabled)throw Error('AGENT_DISABLED');if(!value||typeof value.playing!=='boolean')throw Error('INVALID_PLAYBACK');if(!env.playback)throw Error('PLAYBACK_UNAVAILABLE');if(busy)throw Error('AGENT_BUSY');busy=true;try{return await env.playback(value.playing)}finally{busy=false}},previewOperations:preview,validateOperations(r){try{preview(r);return {valid:true}}catch(e){return {valid:false,error:e.message}}},async applyOperations(r){const p=preview(r),before={project:p.before,...(env.visual?{visual:p.visualBefore}:{})},result=await write(p.after,p.visualAfter);undo.push({before,after:copy(result)});if(undo.length>10)undo.shift();redo=[];return result},undo:()=>history(undo,redo,'before'),redo:()=>history(redo,undo,'after'),resetProject};
 }
 function panel(host,api,language){
  const tr=(ru,en)=>language()==='ru'?ru:en;
  host._haloAgentUnsubscribe?.();
  host.replaceChildren();

  let mode='webmcp';
  try{
   const saved=localStorage.getItem('halo-agent-bridge-mode');
   if(saved==='file'||saved==='webmcp')mode=saved;
  }catch{}

  const bar=document.createElement('div');
  bar.className='agent-mode-switcher';
  bar.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:12px;';

  const label=document.createElement('span');
  label.style.cssText='font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#8cabb9;';
  label.textContent=tr('Режим интеграции:','Integration mode:');
  bar.append(label);

  const btnWebmcp=document.createElement('button');
  btnWebmcp.className='glass-btn';
  btnWebmcp.textContent='WebMCP';

  const btnFile=document.createElement('button');
  btnFile.className='glass-btn';
  btnFile.textContent='File Bridge';

  function updateButtons(m){
    const activeStyle='font-size:10px;padding:4px 14px;min-height:28px;background:#e8f7f5;color:#071822;border:1px solid #ffffff;font-weight:700;border-radius:999px;cursor:pointer;box-shadow:0 0 14px rgba(232,247,245,.45);transition:all .18s ease;';
    const inactiveStyle='font-size:10px;padding:4px 14px;min-height:28px;background:rgba(12,22,38,.65);color:#8ea7b7;border:1px solid rgba(186,215,231,.2);font-weight:500;border-radius:999px;cursor:pointer;transition:all .18s ease;';
    btnWebmcp.style.cssText=m==='webmcp'?activeStyle:inactiveStyle;
    btnFile.style.cssText=m==='file'?activeStyle:inactiveStyle;
    btnWebmcp.classList.toggle('active',m==='webmcp');
    btnWebmcp.setAttribute('aria-pressed',String(m==='webmcp'));
    btnFile.classList.toggle('active',m==='file');
    btnFile.setAttribute('aria-pressed',String(m==='file'));
  }

  bar.append(btnWebmcp,btnFile);
  host.append(bar);

  const view=document.createElement('div');
  view.className='agent-mode-view';
  host.append(view);

  function renderView(m){
   mode=m;
   try{localStorage.setItem('halo-agent-bridge-mode',m);}catch{}
   host.classList.toggle('filebridge-mode',m==='file');
   updateButtons(m);
   view._haloCleanup?.();
   view.replaceChildren();

   if(m==='webmcp'){
    if(root.HaloBrowserTools)root.HaloBrowserTools.panel(view,api,language);
    else view.textContent=tr('WebMCP недоступен.','WebMCP unavailable.');
   }else{
    if(root.HaloFileBridge)root.HaloFileBridge.panel(view,api,language);
    else view.textContent=tr('File Bridge недоступен.','File Bridge unavailable.');
   }
   try{window.HaloLayout?.();}catch{}
  }

  btnWebmcp.onclick=()=>renderView('webmcp');
  btnFile.onclick=()=>renderView('file');
  renderView(mode);

  host._haloAgentUnsubscribe=()=>{view._haloCleanup?.()};
 }
 const api={create,panel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloAgent=api;
})(globalThis);
