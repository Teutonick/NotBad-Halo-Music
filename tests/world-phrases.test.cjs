const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../src/sounds.js'),R=require('../src/roles.js'),W=require('../src/world-phrases.js'),M=require('../src/motion.js'),P=require('../src/project.js'),C=require('../src/composition.js'),Song=require('../src/song.js'),Agent=require('../src/agent.js');
function tracks(setup,seed=1,bars=4,timeSignature='4/4',generate=true){
 const ts=R.roles.map(r=>({name:r.slot,setup,...R.initial(setup,r.slot),variation:seed,phraseBars:bars,timeSignature,on:true,density:77,level:65,character:50,duration:50,space:25}));
 if(generate){ts.forEach((t,i)=>Object.assign(t,S.randomizeTrack(t,i,seed,bars,timeSignature)));const mix=S.randomizeArrangement(ts,seed,bars,timeSignature);ts.forEach((t,i)=>Object.assign(t,mix[i]))}
 S.arrange(ts);return ts;
}
function events(t,i,seed,bars=4,timeSignature='4/4',start=0,key=0){const spb=timeSignature==='3/4'?12:16;return M.phraseSteps({...t,variation:seed},i,start,seed,S,bars,timeSignature).filter(e=>e.fires).map(e=>[e.step,S.notesFor(t,i,Math.floor(((start+e.step)%(bars*spb)+bars*spb)%(bars*spb)/spb),(start+e.step)%spb,seed,C.offsets[key],bars,start+e.step,C.modes[key],timeSignature),S.velocityFor(t,i,start+e.step,seed,bars,timeSignature)])}

test('pre-change generator 2/3 scores remain byte-identical in all three worlds',()=>{
 const hashes={ambient:'be59612f5acdb501145cde96aa9b0daf87e7da5009f2fb14c1d07df45c1662d9',reactor:'593bfeb789794e1c4659229acc82b2504331cf617e12ef9e652b407f361ba08c',water:'0dd590d5c82d2685696cca59786b580a05303504a605097aba568eda0ec74af2'};
 for(const setup of Object.keys(hashes)){
  const out=[];for(const generator of [2,3])for(const bars of [4,8])for(const sig of ['4/4','3/4'])for(const seed of [1,2,9,27]){
   const ts=tracks(setup,seed,bars,sig,false);ts.forEach(t=>t.generator=generator);S.arrange(ts);ts.forEach((t,i)=>out.push(events(t,i,seed,bars,sig)));
  }
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex'),hashes[setup],setup);
 }
});

test('world scores have ten original bilingual profiles each and distinct harmony/voicing',()=>{
 for(const setup of ['water','reactor']){
  assert.equal(W.profiles[setup].length,10);assert.ok(Object.isFrozen(W.profiles[setup]));
  for(const p of W.profiles[setup])assert.ok(p[1]&&p[2]);
  const ts=tracks(setup);assert.ok(ts.every(t=>t.generator===4));
  assert.equal(tracks('ambient')[0].generator,3);
 }
 assert.notDeepEqual(W.chordFor('water',1,0),W.chordFor('reactor',1,0).map(n=>n+12));
 assert.deepEqual(W.chordFor('reactor',1,0),[38,41,45,50]); // D minor triad + root.
 assert.deepEqual(W.chordFor('reactor',1,0,4,0,'major'),[38,42,45,50]);
 assert.deepEqual(W.chordFor('water',1,0),[50,53,57,60]);
 const a=tracks('water',1),b=tracks('reactor',1);assert.notDeepEqual(R.plan(a[0],S.soundFor(a[0]),1).steps,R.plan(b[0],S.soundFor(b[0]),1).steps);
});

test('genre choices remain native and compatible, with restrained pop-rock timbres and anchored cycles',()=>{
 for(const setup of ['water','reactor'])for(let seed=1;seed<=60;seed++)for(const sig of ['4/4','3/4']){
  const ts=tracks(setup,seed,4,sig);assert.equal(ts.filter(t=>t.on).length,6);
  for(const i of [0,1,4,5])assert.equal(ts[i].on,true);
  if(setup==='reactor'){
   assert.deepEqual([0,1,2,3,4,5,7].map(i=>S.soundFor(ts[i]).engine),['kick','snare','metal','tom','rockbass','guitar','piano']);
   assert.equal(S.soundFor(ts[5]).lead,undefined);assert.ok(S.soundFor(ts[6]).lead||S.soundFor(ts[6]).arp);
   assert.ok(ts.every(t=>!/(?:gain-guitar|fuzz-bass|feedback-lead|war-tom|heavy-snare|arena-snare|crash)$/.test(t.sound)));
  }
  for(const t of ts){const sound=S.soundFor(t);assert.equal(t.soundWorld,setup);assert.ok(R.compatible(t,sound));assert.deepEqual(t.sequence,{length:sig==='3/4'?12:16,stepLength:1,offset:0});if(setup==='reactor')assert.doesNotMatch(sound.name,/high gain|fuzz|feedback|war tom|heavy snare|layered snare|crash/i)}
  assert.deepEqual(tracks(setup,seed,4,sig),ts,'same seed and input reproduce all choices');
 }
});

test('density preserves useful pulse/backbeat, zero density/mute/exact silence remain authoritative',()=>{
 for(const setup of ['water','reactor'])for(let seed=1;seed<=10;seed++)for(const bars of [4,8])for(const sig of ['4/4','3/4']){
  const spb=sig==='3/4'?12:16,ts=tracks(setup,seed,bars,sig),t=ts[1],hits=events(t,1,seed,bars,sig).map(e=>e[0]);
  const anchors=spb===16?[4,12]:bars===8?[6]:setup==='water'?[4]:[4,8];
  for(let bar=0;bar<bars;bar++)for(const n of anchors)assert.ok(hits.includes(bar*spb+n),`${setup} ${sig} bar ${bar} backbeat ${n}`);
  for(const patch of [{density:0},{manualSteps:[],manualBars:bars}])assert.deepEqual(events({...t,...patch},1,seed,bars,sig),[]);
  for(let n=0;n<bars*spb;n++)assert.equal(S.shouldTrigger({...t,on:false},1,n,seed,bars,sig),false);
 }
});

test('fills occur at phrase boundaries, hooks answer rather than changing every bar',()=>{
 for(const setup of ['water','reactor'])for(const bars of [4,8])for(let seed=1;seed<=10;seed++){
  const ts=tracks(setup,seed,bars),t={...ts[3],on:true,density:100},p=R.plan(t,S.soundFor(t),seed,bars);
  assert.ok(p.steps.length>0);assert.ok(p.steps.every(n=>Math.floor(n/16)===bars-1||bars===8&&Math.floor(n/16)===3));
  const m={...ts[5],on:true,density:100},steps=R.plan(m,S.soundFor(m),seed,bars).steps;
  const bar=n=>steps.filter(s=>Math.floor(s/16)===n).map(s=>s%16);
  assert.deepEqual(bar(0),bar(1));assert.notDeepEqual(bar(0),bar(2));
 }
});

test('all keys/meters/phrase sizes keep notes in scale, timbre range and role polyphony',()=>{
 for(const setup of ['water','reactor'])for(let seed=1;seed<=10;seed++)for(const bars of [4,8])for(const sig of ['4/4','3/4'])for(let key=0;key<24;key++){
  const ts=tracks(setup,seed,bars,sig),spb=sig==='3/4'?12:16;
  ts.forEach((t,i)=>{const sound=S.soundFor(t),meta=R.metadata(sound),role=R.forTrack(t);for(const step of [0,3,7,12,spb*2+6,spb*bars-2]){
   const notes=S.notesFor(t,i,Math.floor(step/spb),step%spb,seed,C.offsets[key],bars,step,C.modes[key],sig);
   assert.ok(notes.length<=role.maxNotes);assert.ok(notes.every(n=>Number.isInteger(n)&&n>=meta.range[0]&&n<=meta.range[1]));
   if(meta.pitched&&!['pulse','accent','percussion'].includes(role.id))for(const n of notes)assert.ok((C.modes[key]==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10]).includes(R.mod(n-(setup==='reactor'?38:50)-C.offsets[key],12)),`${setup} ${role.id} key ${key} note ${n}`);
  }});
 }
});

test('generator 4 survives project/autosave/step-save/share and composition development',async()=>{
 const Pref=require('../src/preferences.js');
 for(const setup of ['water','reactor']){
  const ts=tracks(setup,7,8),p=P.capture(ts,8,120,7,1,S,M,50,undefined,128);
  assert.ok(p.tracks.every(t=>t.generator===4&&!t.exact));assert.deepEqual(P.parse(JSON.stringify(p),S),p);
  const saved=Pref.validate({version:1,project:p,ui:{scene:0,motionMode:0,effectMode:1,autoEvolve:false,autoKey:false},manual:ts.map(()=>null),draft:null},P,S);assert.deepEqual(saved.project,p);
  assert.ok(C.decode(C.encode(ts,8,7,1),R.roles.map(r=>r.slot)).tracks.every(t=>t.generator===4));
  assert.deepEqual(await P.decodeShare(await P.encodeShare(p),S),p);
  const song=Song.validate(Song.build(p),P,S);assert.deepEqual(Song.phrase(song,1),p);
  for(const phrase of song.phrases)assert.ok(phrase.project.tracks.every(t=>t.generator===4));
 }
});

test('manual authored notes and agent Undo/Redo preserve generator 4',async()=>{
 let p=P.capture(tracks('water'),4,120,1,0,S,M);const api=Agent.create({sounds:S,project:P,song:Song,composition:C,read:()=>p,write:async v=>{p=v}});api.setEnabled(true);
 const before=api.getProjectState(),request={schemaVersion:1,baseRevision:before.revision,operations:[{op:'track.patch',trackIndex:5,values:{steps:[0,8],noteEvents:[{step:0,notes:[62]},{step:8,notes:[65]}],noteTranspose:0}}]};
 await api.applyOperations(request);assert.equal(p.tracks[5].generator,4);assert.equal(p.tracks[5].exact,true);assert.deepEqual(p.tracks[5].noteEvents,request.operations[0].values.noteEvents);
 await api.undo();assert.deepEqual(p,before.project);await api.redo();assert.equal(p.tracks[5].generator,4);
 assert.deepEqual(api.getCapabilities().generators.create,{ambient:3,reactor:4,water:4});
});

test('manual odd cycles use the shared absolute clock and phrase preview repeats deterministically',()=>{
 for(const setup of ['water','reactor']){
  const t={...tracks(setup,3)[5],sequence:{length:7,stepLength:2,offset:3},on:true,density:100};
  const a=events(t,5,3,4,'4/4',64),b=events(t,5,3,4,'4/4',64);assert.deepEqual(a,b);assert.ok(a.length);
  for(const e of a)assert.equal(S.shouldTrigger(t,5,64+e[0],3,4),true);
 }
});

test('offline export matches live generator-4 events at saved absolute position and major key',async()=>{
 for(const setup of ['water','reactor'])for(const sig of ['4/4','3/4']){
  const bars=4,spb=sig==='3/4'?12:16,start=bars*spb*2,seed=4,ts=tracks(setup,seed,bars,sig),p=P.capture(ts,bars,120,seed,1,S,M,50,undefined,start,sig),calls=[];
  const sandbox={HaloSounds:S,HaloComposition:C,HaloSamples:{prepare:async()=>({})},HaloAudio:{create(ctx,runtime){assert.ok(runtime.every(t=>t.generator===4&&!t.manualSteps));return {play:(index,notes,time,velocity)=>calls.push({index,notes,time,velocity})}}},OfflineAudioContext:function(ch,length){this.startRendering=async()=>({getChannelData:()=>new Float32Array(length)})}};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../src/export.js'),'utf8'),sandbox);await sandbox.HaloExport.render(p);
  const seconds=bars*(sig==='3/4'?3:4)*60/p.tempo;
  const expected=[];
  for(let step=0;step<bars*spb;step++)for(const [i,t] of ts.entries())if(S.shouldTrigger(t,i,start+step,seed,bars,sig))expected.push({index:i,notes:S.notesFor(t,i,Math.floor(step/spb),step%spb,seed,C.offsets[1],bars,start+step,'major',sig),time:seconds+step*60/p.tempo/4,velocity:S.velocityFor(t,i,start+step,seed,bars,sig)});
  assert.deepEqual(JSON.parse(JSON.stringify(calls.filter(c=>c.time>=seconds))),expected);
 }
});

test('classic-script order initializes generator 4 under a static repository subpath',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),sandbox={};vm.createContext(sandbox);
 for(const file of ['phrases.js','world-phrases.js','roles.js','water-sounds.js','sounds.js']){
  const relative=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).find(s=>s.startsWith('./src/'+file));assert.ok(relative);
  assert.ok(new URL(relative,'https://example.invalid/HALO/').pathname.startsWith('/HALO/src/'));vm.runInContext(fs.readFileSync(require.resolve('../src/'+file),'utf8'),sandbox);
 }
 const t={...tracks('water')[0]};assert.equal(sandbox.HaloSounds.roles.plan(t,sandbox.HaloSounds.soundFor(t),1).version,4);
});
