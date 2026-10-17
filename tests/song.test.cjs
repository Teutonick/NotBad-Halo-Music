const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Song=require('../src/song.js'),P=require('../src/project.js'),S=require('../src/sounds.js'),M=require('../src/motion.js');
const tracks=Object.keys(S.banks).map(name=>({name,sound:S.banks[name].sounds[0].id,on:true,level:65,density:70,character:50,duration:50,space:55,pattern:[0,4,8,12]}));
const source=bars=>P.capture(tracks,bars,81,2,0,S,M);
test('arrangement preserves the entire authored first verse and develops independent sections',()=>{
 for(const n of [4,8]){const p=source(n);p.tracks[7].on=false;const before=JSON.stringify(p),song=Song.validate(Song.build(p),P,S);assert.equal(Song.bars(song),56);assert.equal(song.sections.length,8);assert.equal(song.sections[2].phrase,song.sections[4].phrase);assert.equal(song.sections[2].phrase,song.sections[6].phrase);assert.deepEqual(Song.phrase(song,1),p);assert.equal(JSON.stringify(p),before);
  for(const f of song.phrases){assert.equal(f.project.seed,p.seed);assert.equal(f.project.key,p.key);for(let i=0;i<8;i++)assert.equal(f.project.tracks[i].sound,p.tracks[i].sound)}
  assert.notDeepEqual(Song.phrase(song,2),p);assert.notDeepEqual(Song.phrase(song,3),p);assert.notDeepEqual(Song.phrase(song,5),Song.phrase(song,2));
 }
});
test('repeat shares edits; variation deep-copies tracks and sequences',()=>{
 const song=Song.validate(Song.build(source(4)),P,S),repeat=Song.duplicate(song,2,false),variation=Song.duplicate(song,2,true);
 assert.equal(repeat.sections[2].phrase,repeat.sections[3].phrase);assert.notEqual(variation.sections[2].phrase,variation.sections[3].phrase);
 Song.phrase(repeat,2).tracks[0].level=11;assert.equal(Song.phrase(repeat,3).tracks[0].level,11);
 Song.phrase(variation,3).tracks[0].steps.length=0;assert.ok(Song.phrase(variation,2).tracks[0].steps.length);assert.equal(song.phrases[2].project.tracks[0].level,65);
});
test('audio-clock section boundaries, exact repeats, fades and ending are deterministic',()=>{
 const song=Song.validate(Song.build(source(4)),P,S);assert.equal(Song.at(song,63).index,0);assert.equal(Song.at(song,64).index,1);
 assert.equal(Song.at(song,64).absolute,Song.at(song,128).absolute);assert.equal(Song.at(song,895).gain,0);assert.equal(Song.at(song,896),null);
 assert.ok(Song.at(song,0).gain<Song.at(song,63).gain);
});
test('JSON roundtrip allowlists sections and rejects dangling refs, excess bars, size and invalid worlds',()=>{
 const song=Song.validate(Song.build(source(4)),P,S);assert.deepEqual(Song.parse(JSON.stringify(song),P,S),song);
 for(const change of [s=>s.sections[0].phrase=99,s=>s.sections[0].repeats=0,s=>s.sections[0].fade='unsafe',s=>s.sections.forEach(x=>x.repeats=8),s=>s.tempo=201,s=>s.phrases[0].id=2]){const s=Song.copy(song);change(s);assert.throws(()=>Song.validate(s,P,S))}
 assert.throws(()=>Song.parse(' '.repeat(Song.MAX_BYTES+1),P,S));
});
test('offline composition schedules exactly the same phrase events and transition weights',async()=>{
 const song=Song.validate(Song.build(source(4)),P,S),calls=[];let length;
 const sandbox={HaloSong:Song,HaloSounds:S,HaloComposition:require('../src/composition.js'),HaloAudio:{create(){return {update(){},play(i,notes,time,velocity){calls.push({i,notes,time,velocity})}}}},OfflineAudioContext:function(ch,n,rate){length=n;this.startRendering=async()=>({length:n})}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/export.js','utf8'),sandbox);await sandbox.HaloExport.render(song);
 assert.equal(length,Math.round(56*240/81*44100));const expected=[];
 for(let step=0;step<896;step++){const e=Song.at(song,step),p=e.project,ts=p.tracks.map(t=>({...t,setup:p.setup,manualSteps:t.steps,manualBars:p.bars}));S.arrange(ts);ts.forEach((t,i)=>{if(S.shouldTrigger(t,i,e.local,p.seed,p.bars))expected.push({i,time:step*60/81/4,velocity:S.velocityFor(t,i,e.local,p.seed,p.bars)*e.gain})})}
 assert.equal(calls.length,expected.length);calls.forEach((c,i)=>{assert.equal(c.time,expected[i].time);assert.equal(c.velocity,expected[i].velocity)});
});

test('compact composition link roundtrip preserves shared references and global settings',async()=>{
 const sandbox={HaloSong:Song,TextEncoder,TextDecoder,Buffer,Blob,Response,CompressionStream,DecompressionStream};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/project.js','utf8'),sandbox);
 const song=Song.validate(Song.build(source(8)),P,S);song.masterVolume=37;song.mix.width=61;const token=await sandbox.HaloProject.encodeShare(song),restored=await sandbox.HaloProject.decodeShare(token,S);
 assert.equal(JSON.stringify(restored),JSON.stringify(song));assert.equal(restored.sections[2].phrase,restored.sections[4].phrase);
});

test('modern arrangements retain exact lead pitches through new rhythm, original keys and both sound worlds',()=>{
 for(const setup of ['ambient','reactor'])for(const bars of [4,8])for(const key of [0,4,8]){
  const ts=Object.keys(S.banksFor(setup)).map(name=>({...S.roles.initial(setup,name),name,setup,on:['VEIL','RAIN','EMBER'].includes(name),level:65,density:45,character:50,duration:50,space:20,delay:0,chorus:0}));
  const p=P.capture(ts,bars,81,3,key,S,M,50,undefined,128),song=Song.validate(Song.build(p),P,S),chorus=Song.phrase(song,2),lead=chorus.tracks[5];
  assert.deepEqual(Song.phrase(song,1),p);assert.deepEqual(lead.steps,p.tracks[5].steps);assert.equal(lead.on,true);
  for(const step of lead.steps){const original=S.notesFor({...p.tracks[5],setup},5,Math.floor(step/16),step%16,p.seed,require('../src/composition.js').offsets[key],bars,p.startStep+step),developed=S.notesFor({...lead,setup,manualSteps:lead.steps,manualBars:bars},5,Math.floor(step/16),step%16,p.seed,require('../src/composition.js').offsets[key],bars,step);assert.deepEqual(developed,original)}
  assert.ok(chorus.tracks.filter(t=>t.on).length>p.tracks.filter(t=>t.on).length);assert.ok(chorus.tracks.some((t,i)=>!p.tracks[i].on&&t.on&&t.steps.length));
  assert.ok(Song.phrase(song,5).tracks.filter(t=>t.on).length<chorus.tracks.filter(t=>t.on).length);
 }
});
test('frozen note events serialize, transpose with key and reject invalid events; silence is not invented into a song',()=>{
 const song=Song.validate(Song.build(source(4)),P,S),p=Song.phrase(song,2);assert.deepEqual(P.parse(JSON.stringify(p),S),p);
 const t=p.tracks.find(t=>t.noteEvents?.some(e=>e.notes.length)),event=t.noteEvents.find(e=>e.notes.length),i=p.tracks.indexOf(t);assert.deepEqual(S.notesFor(t,i,Math.floor(event.step/16),event.step%16,p.seed,2,p.bars,event.step),event.notes.map(n=>n+2-t.noteTranspose));
 for(const events of [[{step:999,notes:[60]}],[{step:t.steps[0],notes:[NaN]}],[{step:t.steps[0],notes:[128]}],[{step:t.steps[0],notes:[60,61,62,63,64]}]]){const bad=Song.copy(p);bad.tracks[i].noteEvents=events;assert.throws(()=>P.validate(bad,S))}
 const silent=source(4);silent.tracks.forEach(t=>{t.on=false;t.steps=[]});assert.throws(()=>Song.build(silent),/active part/);
});


test('phrase names and identifiers are bounded and survive serialization without markup',()=>{
 const song=Song.validate(Song.build(source(4)),P,S);song.phrases[0].label='Тема123';assert.equal(Song.parse(JSON.stringify(song),P,S).phrases[0].label,'Тема123');
 for(const label of ['', 'a'.repeat(11),'two words','<script>','a_b','a-b','a\n','😀','a\u200b'])assert.throws(()=>Song.validate({...song,phrases:song.phrases.map((p,i)=>i?p:{...p,label})},P,S));
 for(const id of [Number.MAX_SAFE_INTEGER,1e300,1000001])assert.throws(()=>Song.validate({...song,phrases:song.phrases.map((p,i)=>i?p:{...p,id})},P,S));
});


test('Track 09 treatment survives arrangement, repeats, independent duplicates and JSON',()=>{
 const p=source(4);p.liveLoop={version:1,layerIds:[123],settings:{pitch:7,reverse:true,bars:2,sliceSteps:Array(16).fill(1)}};
 const song=Song.validate(Song.build(p),P,S);assert.deepEqual(Song.phrase(song,1).liveLoop,p.liveLoop);
 const duplicate=Song.validate(Song.duplicate(song,1,true),P,S);
 Song.phrase(duplicate,2).liveLoop.settings.pitch=-3;Song.phrase(duplicate,2).liveLoop.settings.sliceSteps[0]=4;
 assert.equal(Song.phrase(duplicate,1).liveLoop.settings.pitch,7);assert.equal(Song.phrase(duplicate,1).liveLoop.settings.sliceSteps[0],1);
 assert.deepEqual(Song.parse(JSON.stringify(duplicate),P,S),duplicate);
});

test('song export selects Track 09 by phrase and schedules every phrase repeat at its audio time',async()=>{
 const p=source(4);p.liveLoop={version:1,layerIds:[123],settings:{pitch:7,bars:2}};
 const song=Song.validate(Song.build(p),P,S),calls=[];
 const sandbox={HaloSong:Song,HaloSounds:S,HaloComposition:require('../src/composition.js'),HaloLiveLoop:{ready:async()=>{},renderPhraseOffline(ctx,engine,bars,tempo,state,time){calls.push({bars,tempo,state,time})}},HaloAudio:{create(){return {update(){},play(){}}}},OfflineAudioContext:function(){this.startRendering=async()=>({})}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/export.js','utf8'),sandbox);await sandbox.HaloExport.render(song);
 let expected=0;for(const section of song.sections){const project=song.phrases.find(p=>p.id===section.phrase).project;for(let repeat=0;repeat<section.repeats;repeat++){const call=calls.shift();assert.equal(call.time,expected*240/song.tempo);assert.deepEqual(call.state,project.liveLoop);expected+=project.bars;}}
 assert.equal(calls.length,0);
});

test('composition enforces safety limit of maximum 15 phrases', () => {
 assert.equal(Song.MAX_PHRASES, 15);
 const p = source(4);

 // Exactly 15 phrases must pass
 const phrases15 = Array.from({length: 15}, (_, i) => ({
  id: i + 1,
  label: 'Phrase' + (i + 1),
  project: P.capture(tracks, 4, 80, (i % 4) + 1, 0, S, M)
 }));
 const sections15 = phrases15.map(ph => ({ phrase: ph.id, repeats: 1, name: 'phrase', fade: 'none' }));
 const song15 = {
  format: 'halo-composition',
  version: 1,
  tempo: 80,
  masterVolume: 50,
  mix: { low: 0, mid: 0, high: 0, width: 35 },
  phrases: phrases15,
  sections: sections15
 };
 assert.doesNotThrow(() => Song.validate(song15, P, S));

 // 16 phrases must be rejected
 const phrases16 = [...phrases15, { id: 16, label: 'Phrase16', project: P.capture(tracks, 4, 80, 1, 0, S, M) }];
 const sections16 = [...sections15, { phrase: 16, repeats: 1, name: 'phrase', fade: 'none' }];
 const song16 = { ...song15, phrases: phrases16, sections: sections16 };
 assert.throws(() => Song.validate(song16, P, S), /Invalid composition/);
});

