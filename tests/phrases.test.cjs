const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../src/sounds.js'),F=require('../src/phrases.js'),M=require('../src/motion.js'),P=require('../src/project.js'),C=require('../src/composition.js');
const make=(setup='ambient',instrument,name=instrument,sound)=>({name,instrument,setup,generator:2,sound:sound||S.banksFor(setup)[instrument].sounds[0].id,on:true,level:65,density:100,character:50,duration:50,space:25,pattern:[0,4,8,12]});
const ensemble=setup=>F.slots.map(name=>make(setup,name));
const events=(t,i,seed,bars=4,key=0)=>M.phraseSteps({...t,variation:seed},i,0,seed,S,bars).filter(e=>e.fires).map(e=>({step:e.step,notes:S.notesFor(t,i,Math.floor(e.step/16),e.step%16,seed,C.offsets[key],bars),velocity:S.velocityFor(t,i,e.step,seed,bars)}));

test('classic scripts initialize without CommonJS and resolve under a GitHub Pages repository subpath',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(scripts.findIndex(s=>s.includes('/phrases.js'))<scripts.findIndex(s=>s.includes('/sounds.js')));
 const sandbox={};vm.createContext(sandbox);
 for(const file of ['phrases.js','roles.js','water-sounds.js','sounds.js','motion.js','composition.js','project.js','controls.js']){
  const relative=scripts.find(s=>s.startsWith('./src/'+file));assert.ok(relative);
  assert.ok(new URL(relative,'https://example.invalid/NotBad-Halo-Music/').pathname.startsWith('/NotBad-Halo-Music/src/'));
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),sandbox);
 }
 const t=make('reactor','VEIL','GLASS');assert.ok(sandbox.HaloSounds.notesFor(t,0,0,3,7,0,8).length>0);
 assert.equal(sandbox.HaloPhrases.VERSION,2);
});

test('original versioned catalog covers every patch with ten families and ten ensembles per world',()=>{
 assert.equal(F.VERSION,2);assert.equal(Object.keys(F.catalog).length,14);
 for(const [role,list] of Object.entries(F.catalog)){
  assert.equal(list.length,10);assert.equal(new Set(list.map(m=>m.id)).size,10);
  assert.equal(new Set(list.map(m=>JSON.stringify(m.steps))).size,10,role);
  assert.ok(Object.isFrozen(list));
  for(const m of list){assert.ok(m.en&&m.ru);assert.ok(m.steps.every(n=>Number.isInteger(n)&&n>=0&&n<16));assert.ok(m.degrees.every(n=>n>=0&&n<4));}
 }
 for(const setup of ['ambient','reactor']){
  assert.equal(F.profiles[setup].length,10);assert.equal(new Set(F.profiles[setup].map(p=>p[0])).size,10);
  for(const name of F.slots)for(const sound of S.banksFor(setup)[name].sounds){
   const t=make(setup,name,name,sound.id);assert.ok(F.catalog[F.roleFor(t,sound)]);
   const families=new Set();for(let seed=1;seed<=10;seed++)families.add(F.plan(t,sound,seed,4).family);assert.equal(families.size,10,sound.id);
  }
 }
});

test('all instrument/orbit assignments and role pairings are allowed and keep musical identity',()=>{
 for(const setup of ['ambient','reactor'])for(const instrument of F.slots)for(const name of F.slots){
  const t=make(setup,instrument,name),sound=S.soundFor(t);
  assert.equal(F.matrix[setup][instrument][name].allowed,true);assert.equal(S.bankFor(t),S.banksFor(setup)[instrument]);
  assert.equal(F.roleFor(t,sound),F.roleFor(make(setup,instrument),sound));
  const e=events(t,F.slots.indexOf(name),7,8);assert.ok(e.length>0);assert.ok(e.every(x=>x.step<128));
 }
 for(const [role,row] of Object.entries(F.roleMatrix))for(const [other,entry] of Object.entries(row)){
  assert.equal(entry.allowed,true);assert.equal(entry.relation,F.roleMatrix[other][role].relation);
 }
});

test('every patch generates repeatable full 4/8-bar phrases, independent of mute and preview position',()=>{
 for(const setup of ['ambient','reactor'])for(const [index,name] of F.slots.entries())for(const patch of S.banksFor(setup)[name].sounds)for(const bars of [4,8]){
  const t=make(setup,name,name,patch.id),seed=9;
  const preview=M.phraseSteps({...t,variation:seed},index,0,seed,S,bars);
  assert.equal(preview.length,bars*16);assert.ok(preview.some(e=>e.fires));
  assert.deepEqual(preview,M.phraseSteps({...t,on:false},index,bars*16,seed,S,bars));
  for(const e of preview){assert.equal(e.candidate,e.fires);assert.equal(e.fires,S.shouldTrigger(t,index,e.step+bars*16,seed,bars));}
  assert.deepEqual(events(t,index,seed,bars),events(t,index,seed,bars));
  assert.ok(events(t,index,seed,bars).every(e=>e.velocity>0&&e.velocity<=1));
  assert.equal(S.shouldTrigger({...t,on:false},index,0,seed,bars),false);
  assert.equal(S.shouldTrigger({...t,density:0},index,0,seed,bars),false);
  assert.equal(S.shouldTrigger({...t,manualSteps:[1,bars*16-1],manualBars:bars,density:0},index,1,seed,bars),true);
  for(const step of S.patternFor({...t,variation:seed},bars))assert.equal(M.phaseAt(S.patternFor({...t,variation:seed},bars),step,bars*16),0);
 }
});

test('melodic generation changes pitches with unchanged patches, and eight bars develop the first four',()=>{
 for(const setup of ['ambient','reactor'])for(const [i,name] of F.slots.entries()){
  const t=make(setup,name),role=F.roleFor(t,S.soundFor(t)),phrases=new Set(),pitches=new Set();
  for(let seed=1;seed<=20;seed++){
   const e=events(t,i,seed,8);phrases.add(JSON.stringify(e));pitches.add(JSON.stringify(e.map(x=>x.notes)));
   const first=e.filter(x=>x.step<64),second=e.filter(x=>x.step>=64).map(x=>({...x,step:x.step-64}));
   assert.notDeepEqual(first,second,setup+' '+name+' seed '+seed);
  }
  assert.ok(phrases.size>=10,role);
  if(!['kick','snare','metal','tom','rhythm','texture'].includes(role))assert.ok(pitches.size>=10,role+' must change note phrases');
 }
});

test('all generated keys and recorded articulations stay in scale and near available sample roots',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/reactor/manifest.json'),'utf8')),roots={};
 for(const entry of manifest.samples)(roots[entry.bank]??=[]).push({root:entry.root});
 const samples=require('../src/samples.js'),minor=[0,2,3,5,7,8,10];
 for(const setup of ['ambient','reactor'])for(const [index,name] of F.slots.entries())for(const patch of S.banksFor(setup)[name].sounds)for(const seed of [1,3,6,10,19])for(const bars of [4,8])for(const key of C.offsets){
  const t=make(setup,name,name,patch.id);
  for(let bar=0;bar<bars;bar++)for(const local of [0,3,7,11,15]){
   const notes=S.notesFor(t,index,bar,local,seed,key,bars),role=F.roleFor(t,patch);
   assert.ok(notes.length<=3);
   for(const n of notes){
    assert.ok(Number.isInteger(n)&&n>=26&&n<=89,patch.id+' '+n);
    assert.ok(minor.includes(((n-(setup==='reactor'?38:50)-key)%12+12)%12),patch.id+' scale '+n);
    if(patch.sampleBank){const nearest=samples.select(roots[patch.sampleBank],n,.8);assert.ok(Math.abs(nearest.root-n)<=(role==='bass'?6:5),patch.id+' resampling '+n);}
   }
   if(role==='bass')assert.ok(notes.every(n=>n<=(setup==='reactor'?45:49)));
  }
 }
});

test('duplicate voices share rhythmic space and gain without mute changing other parts',()=>{
 for(const setup of ['ambient','reactor'])for(const instrument of F.slots){
  const tracks=F.slots.map(name=>make(setup,instrument,name));S.arrange(tracks);
  assert.ok(tracks.every(t=>t.arrangement.count===8&&t.ensembleGain===1/Math.sqrt(8)));
  const before=tracks.map((t,i)=>events(t,i,5,8));assert.ok(before.every(e=>e.length>0));
  tracks[0].on=false;S.arrange(tracks);assert.deepEqual(tracks.slice(1).map((t,i)=>events(t,i+1,5,8)),before.slice(1));
  assert.ok(tracks.every(t=>t.ensembleGain>0));
 }
});

test('positive density preserves at least one playable event per phrase; zero density and mute stay silent',()=>{
 for(const setup of ['ambient','reactor'])for(const [index,name] of F.slots.entries())for(const patch of S.banksFor(setup)[name].sounds)for(const bars of [4,8])for(const seed of [1,7,15]){
  const t={...make(setup,name,name,patch.id),density:20};
  assert.ok(events(t,index,seed,bars).length>0,patch.id);
  assert.equal(events({...t,density:0},index,seed,bars).length,0);
  for(let step=0;step<bars*16;step++)assert.equal(S.shouldTrigger({...t,on:false},index,step,seed,bars),false);
 }
});

test('new project mappings and generator versions restore exact steps and pitches; old versions stay legacy',()=>{
 for(const setup of ['ambient','reactor']){
  const tracks=ensemble(setup);tracks[0]=make(setup,'AURA','GLASS');tracks[7]=make(setup,'ROOT','AURA');S.arrange(tracks);
  const project=P.capture(tracks,8,100,13,4,S,M,50),restored=P.parse(JSON.stringify(project),S).tracks.map(t=>({...t,setup,manualSteps:t.steps,manualBars:8}));S.arrange(restored);
  for(let i=0;i<8;i++)assert.deepEqual(events(restored[i],i,13,8,4),events(tracks[i],i,13,8,4));
  assert.equal(project.tracks[0].instrument,'AURA');assert.equal(project.tracks[0].generator,2);
  for(const patch of [{instrument:'unknown'},{generator:5},{instrument:'ROOT',sound:'unknown'}])assert.throws(()=>P.validate({...project,tracks:project.tracks.map((t,i)=>i?t:{...t,...patch})},S));
  const old=ensemble(setup).map(t=>({...t,generator:1})),oldProject=P.capture(old,4,100,5,0,S,M);
  oldProject.tracks.forEach(t=>{delete t.generator;delete t.instrument});const validated=P.validate(oldProject,S);
  assert.ok(validated.tracks.every(t=>t.generator===1&&t.instrument===t.name));
 }
});

test('offline export uses the same arrangement, note phrases, articulation and velocities as live scheduling',async()=>{
 for(const setup of ['ambient','reactor'])for(const bars of [4,8]){
  const tracks=ensemble(setup);tracks[0]=make(setup,'AURA','GLASS');S.arrange(tracks);
  const project=P.capture(tracks,bars,100,6,2,S,M,50),calls=[];
  const sandbox={HaloSounds:S,HaloComposition:C,HaloSamples:{prepare:async()=>({})},HaloAudio:{create(ctx,exportTracks){assert.ok(exportTracks.every(t=>t.arrangement));return {play:(index,notes,time,velocity,patch)=>calls.push({index,notes,time,velocity,sound:patch.id})}}},OfflineAudioContext:function(ch,length,rate){this.startRendering=async()=>({getChannelData:()=>new Float32Array(length)})}};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/export.js'),'utf8'),sandbox);await sandbox.HaloExport.render(project);
  const expected=[];for(let step=0;step<bars*16;step++)for(let i=0;i<8;i++)if(S.shouldTrigger(tracks[i],i,step,6,bars))expected.push({index:i,notes:S.notesFor(tracks[i],i,Math.floor(step/16),step%16,6,C.offsets[2],bars),time:step*.15,velocity:S.velocityFor(tracks[i],i,step,6,bars),sound:tracks[i].sound});
  assert.equal(calls.length,expected.length*2);
  expected.forEach((e,i)=>{assert.equal(calls[i].index,e.index);assert.deepEqual(calls[i].notes,e.notes);assert.ok(Math.abs(calls[i].time-e.time)<1e-8);assert.equal(calls[i].velocity,e.velocity);assert.equal(calls[i].sound,e.sound)});
 }
});
