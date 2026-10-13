const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../src/sounds.js'),R=require('../src/roles.js'),M=require('../src/motion.js'),P=require('../src/project.js'),C=require('../src/composition.js'),A=require('../src/audio.js');
const tracks=setup=>R.roles.map(role=>({name:role.slot,setup,...R.initial(setup,role.slot),level:65,density:100,character:50,duration:50,space:20,on:true}));
function events(t,index,seed,bars,start=0){return M.phraseSteps({...t,variation:seed},index,start,seed,S,bars).filter(e=>e.fires).map(e=>({step:e.step,notes:S.notesFor(t,index,Math.floor(e.step/16),e.step%16,seed,0,bars,start+e.step),velocity:S.velocityFor(t,index,start+e.step,seed,bars)}))}
function context(){
 const nodes=[],sources=[];
 const param=()=>({value:0,calls:[],setValueAtTime(v,t){this.value=v;this.calls.push([v,t])},setTargetAtTime(v,t){this.calls.push([v,t])},exponentialRampToValueAtTime(v,t){assert.ok(v>0);this.calls.push([v,t])},cancelAndHoldAtTime(t){this.calls.push([0,t])}});
 const node=()=>{const n={connect(){},disconnect(){this.disconnected=true},gain:param(),frequency:param(),Q:param(),detune:param(),playbackRate:param(),pan:param()};nodes.push(n);return n};
 const source=()=>{const n=node();n.start=t=>n.started=t;n.stop=t=>n.stopped=t;sources.push(n);return n};
 return {currentTime:0,sampleRate:8000,destination:node(),nodes,sources,createGain:node,createBiquadFilter:node,createWaveShaper:node,createStereoPanner:node,createConvolver:node,createBufferSource:source,createOscillator:source,createDynamicsCompressor(){const n=node();for(const key of ['threshold','knee','ratio','attack','release'])n[key]=param();return n},createBuffer(ch,length){const data=Array.from({length:ch},()=>new Float32Array(length));return {duration:length/8000,getChannelData:i=>data[i]}}};
}

test('both worlds have the same eight fixed roles and compatible, preferred native presets',()=>{
 assert.deepEqual(R.roles.map(r=>r.id),['pulse','accent','percussion','texture','bass','melody','arpeggio','harmony']);
 for(const setup of ['ambient','reactor'])for(const t of tracks(setup)){
  const spec=R.forTrack(t),sound=S.soundFor(t);assert.equal(t.role,spec.id);assert.ok(R.compatible(t,sound));
  assert.ok(sound.playback.affinityRoles.includes(spec.id));assert.ok(R.pool(t,S.banksFor(setup),true).length>1);
 }
 const counts=Object.values(S.banks).flatMap(b=>b.sounds).length+Object.values(S.reactorBanks).flatMap(b=>b.sounds).length;assert.equal(counts,62);
});

test('presets declare engine, compatibility and affinity separately; generation stays in the affinity pool',()=>{
 for(const setup of ['ambient','reactor'])for(const [i,t] of tracks(setup).entries())for(let seed=2;seed<100;seed++){
  const before={...t,sequence:{length:7,stepLength:2,offset:3},on:false},choice=S.randomizeTrack(before,i,seed),sound=S.soundFor({...before,...choice});
  assert.ok(sound.playback.compatibleRoles.includes(R.forTrack(t).id));assert.ok(sound.playback.affinityRoles.includes(R.forTrack(t).id));
  assert.deepEqual(choice.sequence,before.sequence);assert.equal(choice.role,R.forTrack(t).id);assert.equal(choice.generator,3);assert.equal(choice.on,undefined);
  for(const key of ['character','duration','space','level','density'])assert.ok(choice[key]>=20&&choice[key]<=100);
 }
 const pulse=tracks('ambient')[0],melody=tracks('ambient')[5];assert.equal(R.compatible(pulse,S.banks.GLASS.sounds[0]),false);assert.equal(R.compatible(melody,S.banks.GLASS.sounds[0]),true);
 const piano=S.reactorBanks.AURA.sounds[0];assert.equal(R.metadata(piano).engine,'sampler');assert.equal(R.compatible(tracks('reactor')[0],piano),true);
});

test('fixed operators constrain notes, harmony and recorded roots for every compatible preset and key',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/reactor/manifest.json'),'utf8')),roots={};for(const entry of manifest.samples)(roots[entry.bank]??=[]).push({root:entry.root});
 for(const setup of ['ambient','reactor'])for(const [i,t] of tracks(setup).entries())for(const choice of R.pool(t,S.banksFor(setup)))for(const transpose of C.offsets)for(const bars of [4,8]){
  const track={...t,instrument:choice.instrument,sound:choice.sound.id,sequence:{length:7,stepLength:2,offset:1}};
  for(const step of [0,1,7,15,23,39,63,81,127]){
   const local=step%(bars*16),notes=S.notesFor(track,i,Math.floor(local/16),local%16,9,transpose,bars,step),role=R.forTrack(track);
   assert.ok(notes.length<=role.maxNotes,role.id);assert.ok(notes.every(n=>Number.isInteger(n)&&n>=26&&n<=90));
   if(['bass','arpeggio'].includes(role.id))assert.equal(notes.length,1);
   if(role.id==='harmony')assert.equal(notes.length,4);
   if(!['pulse','accent','percussion'].includes(role.id)&&choice.sound.playback.pitched)for(const n of notes)assert.ok([0,2,3,5,7,8,10].includes(R.mod(n-(setup==='reactor'?38:50)-transpose,12)));
   if(choice.sound.sampleBank&&notes.length)for(const n of notes){const nearest=require('../src/samples.js').select(roots[choice.sound.sampleBank],n,.8);assert.ok(Math.abs(nearest.root-n)<=(choice.sound.engine==='rockbass'?6:5),choice.sound.id+' '+n)}
  }
 }
});

test('independent 7/9-step cycles keep phase through global phrase boundaries and previews',()=>{
 const ts=tracks('reactor');ts[5].sequence={length:7,stepLength:1,offset:0};ts[6].sequence={length:9,stepLength:2,offset:2};S.arrange(ts);
 assert.equal(R.plan(ts[5],S.soundFor(ts[5]),3,4).period,28);assert.equal(R.plan(ts[6],S.soundFor(ts[6]),3,4).period,72);
 assert.notDeepEqual(events(ts[5],5,3,4,0),events(ts[5],5,3,4,64));
 for(const [i,t] of ts.entries())for(const start of [0,64,128,192]){
  const preview=M.phraseSteps({...t,variation:3},i,start,3,S,4);
  for(const e of preview)assert.equal(e.fires,S.shouldTrigger(t,i,start+e.step,3,4));
  assert.deepEqual(preview,M.phraseSteps({...t,on:false,variation:3},i,start,3,S,4));
 }
 const t=ts[6],p=R.plan(t,S.soundFor(t),3,4);for(const step of p.steps){assert.equal(step%2,0);assert.equal(M.phaseAt(p.steps,step,p.period),0)}
});

test('cycle speed and phase remain bounded; manual steps override independent cycles including warm-up',()=>{
 for(const value of [{length:3},{length:33},{stepLength:.5},{stepLength:3},{length:7,offset:7},{offset:-1},null,[],{length:'7'}])assert.throws(()=>R.sequence(value));
 const t={...tracks('reactor')[6],sequence:{length:9,stepLength:4,offset:5},manualSteps:[0,7,63],manualBars:4,density:0};
 assert.equal(S.shouldTrigger(t,6,-64,1,4),true);assert.equal(S.shouldTrigger(t,6,71,1,4),true);assert.equal(S.shouldTrigger({...t,on:false},6,71,1,4),false);
 for(const start of [0,64,128])assert.deepEqual(events(t,6,1,4,start).map(e=>e.step),[0,7,63]);
});

test('audio enforces total musical polyphony, mono retrigger and four-note chords independently of preset claims',()=>{
 for(const setup of ['ambient','reactor']){
  const ts=tracks(setup);S.arrange(ts);const ctx=context(),samples={};
  for(const bank of Object.values(S.banksFor(setup)))for(const sound of bank.sounds)if(sound.sampleBank)samples[sound.sampleBank]=[{root:60,buffer:ctx.createBuffer(1,80000)}];
  const audio=A.create(ctx,ts,50,samples);
  for(const [i,t] of ts.entries()){
   const patch={...S.soundFor(t),polyphony:99};
   for(let step=0;step<20;step++){
    audio.play(i,[48,52,55,58,60],1+step*.05,.8,patch);
    assert.ok([...audio.voices[i]].reduce((sum,v)=>sum+v.noteCount,0)<=R.forTrack(t).voices);
   }
   if(['bass','arpeggio'].includes(t.role))assert.equal(audio.voices[i].size,1);
   if(t.role==='harmony')assert.equal([...audio.voices[i]][0].noteCount,4);
  }
  assert.ok(ctx.sources.every(s=>Number.isFinite(s.stopped)));assert.ok(ctx.sources.some(s=>Math.abs(s.stopped-1.11)<1e-8));
  ctx.sources.forEach(s=>s.onended());assert.ok(audio.voices.every(set=>set.size===0));
 }
});

test('sampled piano on Pulse is a bounded strike while the same preset makes four-note Harmony',()=>{
 const ts=tracks('reactor');ts[0].instrument='AURA';ts[0].sound='reactor-attack-piano';S.arrange(ts);
 assert.deepEqual(S.notesFor(ts[0],0,0,0,1,0,4),[60]);assert.equal(S.notesFor(ts[7],7,0,0,1,0,4).length,4);
 const ctx=context(),samples={piano:[{root:60,buffer:ctx.createBuffer(1,80000)}]},audio=A.create(ctx,ts,50,samples),patch=S.soundFor(ts[0]);
 audio.play(0,[60],1,.8,patch);assert.ok(ctx.sources[0].stopped<=1.863);
 const before=ctx.sources.length;audio.play(7,[48,52,55,58],1,.8,patch);assert.equal(ctx.sources.length-before,4);
 const invalid={...ts[4],instrument:'ROOT',sound:'reactor-tight-hat'},other=A.create(context(),[invalid]);assert.throws(()=>other.play(0,[],1,.8,S.soundFor(invalid)),/not ready|incompatible/);
});

test('generator-3 projects preserve generated mode and cycle phase while old versions stay exact legacy',()=>{
 const ts=tracks('reactor');ts[5].sequence={length:7,stepLength:2,offset:3};S.arrange(ts);
 const project=P.capture(ts,8,100,4,2,S,M,50,undefined,128),clean=P.parse(JSON.stringify(project),S);
 assert.equal(clean.startStep,128);assert.equal(clean.tracks[5].exact,false);assert.deepEqual(clean.tracks[5].sequence,ts[5].sequence);
 for(const change of [{role:'bass'},{sequence:{length:40}},{instrument:'ROOT',sound:'reactor-tight-hat',name:'RAIN'}]){
  const index=change.name==='RAIN'?4:5;assert.throws(()=>P.validate({...project,tracks:project.tracks.map((t,i)=>i===index?{...t,...change}:t)},S));
 }
 assert.throws(()=>P.validate({...project,startStep:3},S));
 const saved=C.decode(C.encode(ts.map(t=>({...t,manualSteps:[0,7],manualBars:8})),8,4,2),R.roles.map(r=>r.slot));assert.deepEqual(saved.tracks[5].sequence,ts[5].sequence);
});

test('exported selected phrase matches live polymetric notes and velocities at its absolute position',async()=>{
 for(const bars of [4,8]){
  const ts=tracks('reactor');ts[5].sequence={length:7,stepLength:1,offset:2};ts[6].sequence={length:9,stepLength:2,offset:1};S.arrange(ts);
  const start=bars*16*3,project=P.capture(ts,bars,100,6,2,S,M,50,undefined,start),calls=[],samples={};
  const sandbox={HaloSounds:S,HaloComposition:C,HaloSamples:{prepare:async()=>samples},HaloAudio:{create(ctx,exportTracks){assert.ok(exportTracks.every(t=>!t.manualSteps));return {play:(index,notes,time,velocity)=>calls.push({index,notes,time,velocity})}}},OfflineAudioContext:function(ch,length){this.startRendering=async()=>({getChannelData:()=>new Float32Array(length)})}};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/export.js'),'utf8'),sandbox);await sandbox.HaloExport.render(project);
  const actual=calls.filter(c=>c.time>=bars*16*.15-1e-8),expected=[];
  for(let step=0;step<bars*16;step++)for(let i=0;i<8;i++)if(S.shouldTrigger(ts[i],i,start+step,6,bars))expected.push({index:i,notes:S.notesFor(ts[i],i,Math.floor(step/16),step%16,6,C.offsets[2],bars,start+step),velocity:S.velocityFor(ts[i],i,start+step,6,bars),time:(step+bars*16)*.15});
  assert.equal(actual.length,expected.length);actual.forEach((a,i)=>{assert.equal(a.index,expected[i].index);assert.deepEqual(a.notes,expected[i].notes);assert.equal(a.velocity,expected[i].velocity);assert.ok(Math.abs(a.time-expected[i].time)<1e-8)});
 }
});
