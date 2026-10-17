const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/project.js'),S=require('../src/sounds.js'),M=require('../src/motion.js');
const tracks=Object.keys(S.banks).map(name=>({name,sound:S.banks[name].sounds[0].id,on:true,level:65,density:70,character:50,duration:50,space:55,pattern:[0,4,8,12]}));

test('project mix settings roundtrip, old neutral defaults and strict bounds',()=>{
 const project=P.capture(tracks,4,100,2,0,S,M,50,{low:6,mid:-3,high:2,width:90});
 assert.deepEqual(P.parse(JSON.stringify(project),S).mix,project.mix);
 delete project.mix;assert.deepEqual(P.validate(project,S).mix,{low:0,mid:0,high:0,width:35});
 for(const mix of [null,[],{low:10},{mid:-10},{high:Infinity},{width:101},{width:'50'}])assert.throws(()=>P.validate({...project,mix},S));
 assert.deepEqual(P.mixSettings({low:0,mid:0,high:0,width:0,secret:'discard'}),{low:0,mid:0,high:0,width:0});
});

test('offline export passes the same master EQ and scene width to the audio engine',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');let settings;
 const project=P.capture(tracks,4,100,2,0,S,M,50,{low:4,mid:-2,high:1,width:70});
 const sandbox={HaloSounds:S,HaloComposition:require('../src/composition.js'),HaloAudio:{create(ctx,tracks,volume,samples,mix){settings=mix;return {play(){}}}},OfflineAudioContext:function(ch,length,rate){this.startRendering=async()=>({getChannelData:()=>new Float32Array(length)})}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/export.js'),'utf8'),sandbox);
 await sandbox.HaloExport.render(project);assert.deepEqual(settings,project.mix);
});
test('reactor project roundtrip preserves setup and rejects mixed or unknown banks; older files stay ambient',()=>{
 const rock=tracks.map(t=>({...t,setup:'reactor',sound:S.reactorBanks[t.name].sounds[0].id})),project=P.capture(rock,4,100,2,0,S,M);
 assert.equal(P.parse(JSON.stringify(project),S).setup,'reactor');
 assert.throws(()=>P.validate({...project,setup:'unknown'},S));assert.throws(()=>P.validate({...project,setup:'ambient'},S));
 const old=P.capture(tracks,4,72,1,0,S,M);delete old.setup;assert.equal(P.validate(old,S).setup,'ambient');
});
test('bounded BPM rejects overflows, scientific notation, nonnumbers and out-of-range input',()=>{
 for(const value of ['30','200','72.25'])assert.equal(P.bpm(value),Number(value));
 for(const value of ['29','201','Infinity','NaN','1e200','10000000','-60','99.999','<script>'])assert.throws(()=>P.bpm(value));
});
test('project roundtrip contains only validated settings and steps, and rejects oversized or malformed input',()=>{
 const project=P.capture(tracks,8,72.25,2,3,S,M),text=JSON.stringify(project);
 assert.deepEqual(P.parse(text,S),project);assert.ok(!text.includes('samples'));assert.equal(project.tracks.length,8);
 for(const value of [{...project,tempo:Infinity},{...project,key:24},{...project,seed:1e20},{...project,bars:5},{...project,tracks:project.tracks.map((t,i)=>i?t:{...t,steps:[128]})},{...project,tracks:[...project.tracks.slice(1),project.tracks[1]]}])assert.throws(()=>P.validate(value,S));
 assert.throws(()=>P.parse(' '.repeat(65537),S));
});
test('WAV produces actual PCM headers and safely clamps nonfinite samples',()=>{
 const bytes=P.wav({length:3,numberOfChannels:1,sampleRate:44100,getChannelData(){return new Float32Array([2,-2,NaN])}}),view=new DataView(bytes);
 assert.equal(new TextDecoder().decode(new Uint8Array(bytes,0,4)),'RIFF');assert.equal(bytes.byteLength,50);
 assert.equal(view.getInt16(44,true),32767);assert.equal(view.getInt16(46,true),-32768);assert.equal(view.getInt16(48,true),0);
});
test('master volume is bounded and old projects retain the 50 percent default',()=>{
 const project=P.capture(tracks,4,72,2,3,S,M,25);assert.equal(P.parse(JSON.stringify(project),S).masterVolume,25);
 const old={...project};delete old.masterVolume;assert.equal(P.validate(old,S).masterVolume,50);
 for(const volume of [-1,101,Infinity,'50'])assert.throws(()=>P.validate({...project,masterVolume:volume},S));
});

test('shareable token encodes and decodes project roundtrip within compact URL bounds',async()=>{
 const project=P.capture(tracks,4,115.5,5,7,S,M,60,{low:3,mid:-1,high:2,width:45});
 const token=await P.encodeShare(project);
 assert.ok(typeof token==='string'&&token.length>50&&token.length<1500);
 assert.ok(!/[+/=]/.test(token));
 const decoded=await P.decodeShare(token,S);
 assert.deepEqual(decoded,project);
 await assert.rejects(async()=>P.decodeShare('invalid!!!',S));
 await assert.rejects(async()=>P.decodeShare('x'.repeat(70000),S));
});

test('track FX settings (delay, delayTime, chorus) roundtrip, default safely, and validate bounds',()=>{
 const fxTracks=tracks.map((t,i)=>({...t,delay:i*10,delayTime:['1/16','1/8','1/8d','1/4'][i%4],chorus:i*12}));
 const project=P.capture(fxTracks,4,80,1,0,S,M);
 const parsed=P.parse(JSON.stringify(project),S);
 fxTracks.forEach((t,i)=>{
  assert.equal(parsed.tracks[i].delay,t.delay);
  assert.equal(parsed.tracks[i].delayTime,t.delayTime);
  assert.equal(parsed.tracks[i].chorus,t.chorus);
 });
 const legacyTracks=tracks.map(t=>{const copy={...t};delete copy.delay;delete copy.delayTime;delete copy.chorus;return copy});
 const legacyProj=P.capture(legacyTracks,4,80,1,0,S,M);
 legacyProj.tracks.forEach(t=>{
  assert.equal(t.delay,0);
  assert.equal(t.delayTime,'1/8');
  assert.equal(t.chorus,0);
 });
 assert.throws(()=>P.validate({...project,tracks:project.tracks.map((t,i)=>i?t:{...t,delay:101})},S));
 assert.throws(()=>P.validate({...project,tracks:project.tracks.map((t,i)=>i?t:{...t,chorus:-1})},S));
 assert.throws(()=>P.validate({...project,tracks:project.tracks.map((t,i)=>i?t:{...t,delay:'50'})},S));
});

test('muting exact pitched material preserves notes and repeats in portable snapshots',()=>{
 const song=require('../src/song.js').build(P.capture(tracks,4,81,2,4,S,M)),p=song.phrases[2].project;
 const ts=p.tracks.map(t=>({...t,setup:p.setup,manualSteps:t.steps,manualBars:p.bars,pattern:[0,4,8,12],on:false}));
 const saved=P.capture(ts,8,p.tempo,p.seed,p.key,S,M);assert.ok(saved.tracks.every(t=>!t.on));
 const i=ts.findIndex(t=>t.noteEvents?.some(e=>e.notes.length));const t=ts[i],e=t.noteEvents.find(e=>e.notes.length);
 assert.deepEqual(saved.tracks[i].noteEvents.find(n=>n.step===e.step+p.bars*16).notes,e.notes);
 assert.deepEqual(S.notesFor(t,i,4,e.step%16,p.seed,require('../src/composition.js').offsets[p.key],8,e.step+64),S.notesFor(t,i,0,e.step%16,p.seed,require('../src/composition.js').offsets[p.key],4,e.step));
});


test('URL tokens reject ambiguous parameters, invalid alphabet, huge input and bad escapes',async()=>{
 for(const hash of ['#loop=abc&song=def','#song=abc&x=1','#loop=%ZZ','#project=a','#share=<script>','#loop='+ 'A'.repeat(24001)])assert.throws(()=>P.shareHash(hash));
 assert.deepEqual(P.shareHash('#song=abcd'),{kind:'song',token:'abcd'});assert.equal(P.shareHash('#other=abcd'),null);
 for(const token of ['a','abcd=','ab+c','ab/c','abc%','abc\n'])await assert.rejects(()=>P.decodeShare(token,S));
});
test('compressed expansion is stopped before unbounded JSON allocation',async()=>{
 const z=require('node:zlib'),token=z.deflateRawSync(Buffer.from(' '.repeat(524289))).toString('base64url');
 await assert.rejects(()=>P.decodeShare(token,S),/Shared data exceeds size limit/);
});
test('injected project keys are discarded and unsafe numeric/schema data never reaches state',()=>{
 const source=P.capture(tracks,4,81,2,0,S,M),payload=JSON.parse(JSON.stringify(source).replace('"version":1','"__proto__":{"polluted":true},"version":1'));payload.script='<img src=x onerror=alert(1)>';
 const parsed=P.parse(JSON.stringify(payload),S);assert.equal(Object.hasOwn(parsed,'__proto__'),false);assert.equal(parsed.script,undefined);assert.equal({}.polluted,undefined);
 for(const value of [1e300,-1,NaN,Infinity,'1',null])assert.throws(()=>P.validate({...source,seed:value},S));
});


test('Track 09 project state validates bounded local references and treatment without PCM',()=>{
 const project=P.capture(tracks,4,100,2,0,S,M);project.liveLoop={version:1,layerIds:[123],settings:{pitch:7,bars:2,reverse:true,trimStart:.1,trimEnd:.9,sliceSteps:Array(16).fill(-1),unknown:'discard'},pcm:'discard'};
 const clean=P.parse(JSON.stringify(project),S);assert.equal(clean.liveLoop.settings.pitch,7);assert.equal(clean.liveLoop.pcm,undefined);assert.equal(clean.liveLoop.settings.unknown,undefined);
 for(const change of [v=>v.layerIds=['unsafe'],v=>v.settings.pitch=13,v=>v.settings.bars=3,v=>v.settings.reverse='true',v=>v.settings.trimEnd=.05,v=>v.settings.sliceSteps=[99]]){const p=JSON.parse(JSON.stringify(project));change(p.liveLoop);assert.throws(()=>P.validate(p,S));}
});


test('phrase WAV warm-up restarts Track 09 at the same phrase boundary as the eight voices',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),calls=[],project=P.capture(tracks,4,120,2,0,S,M);
 project.liveLoop={version:1,layerIds:[123],settings:{bars:8}};
 const sandbox={HaloSounds:S,HaloComposition:require('../src/composition.js'),HaloLiveLoop:{ready:async()=>{},renderPhraseOffline(ctx,engine,bars,tempo,state,time=0){calls.push({bars,time})}},HaloAudio:{create(){return {play(){}}}},OfflineAudioContext:function(ch,length){this.startRendering=async()=>({getChannelData:()=>new Float32Array(length)})}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/export.js','utf8'),sandbox);await sandbox.HaloExport.render(project);
 assert.deepEqual(calls,[{bars:4,time:0},{bars:4,time:8}]);
});


test('PITCH state roundtrips through the bounded phrase schema and excludes hardware IDs',()=>{
 const project=P.capture(tracks,4,100,2,0,S,M);project.liveLoop={version:1,layerIds:[123],settings:{mode:'pitch',rootNote:57,pitchOctave:-1,pitchSteps:Array(16).fill(3),inputDeviceId:'private-hardware-id'}};
 const restored=P.parse(JSON.stringify(project),S);assert.equal(restored.liveLoop.settings.rootNote,57);assert.equal(restored.liveLoop.settings.pitchSteps[0],3);assert.equal(restored.liveLoop.settings.inputDeviceId,undefined);
 for(const edit of [s=>s.rootNote=90,s=>s.pitchOctave=.5,s=>s.pitchSteps[0]=8]){const p=JSON.parse(JSON.stringify(project));edit(p.liveLoop.settings);assert.throws(()=>P.validate(p,S));}
});

test('3/4 waltz and 6/8 pirate swing meter validation, clamping, and roundtrip', () => {
  // 3/4 waltz (4 bars = 48 steps)
  const waltz = P.capture(tracks, 4, 96, 1, 0, S, M, 50, undefined, 0, '3/4');
  assert.equal(waltz.timeSignature, '3/4');
  assert.equal(waltz.bars, 4);
  const parsedWaltz = P.parse(JSON.stringify(waltz), S);
  assert.equal(parsedWaltz.timeSignature, '3/4');
  for (const t of parsedWaltz.tracks) {
    assert.ok(t.steps.every(s => s >= 0 && s < 48));
  }

  // 6/8 pirate swing (8 bars = 96 steps)
  const pirate = P.capture(tracks, 8, 112, 1, 0, S, M, 50, undefined, 0, '3/4');
  assert.equal(pirate.timeSignature, '3/4');
  assert.equal(pirate.bars, 8);
  const parsedPirate = P.parse(JSON.stringify(pirate), S);
  assert.equal(parsedPirate.timeSignature, '3/4');
  for (const t of parsedPirate.tracks) {
    assert.ok(t.steps.every(s => s >= 0 && s < 96));
  }

  // Clamping: steps >= bars * 12 are clamped / rejected
  const invalid = JSON.parse(JSON.stringify(waltz));
  invalid.tracks[0].steps.push(48); // Step 48 is out of bounds for 4 bars in 3/4
  assert.throws(() => P.validate(invalid, S));

  // Invalid meter rejected
  const badMeter = JSON.parse(JSON.stringify(waltz));
  badMeter.timeSignature = '5/4';
  assert.throws(() => P.validate(badMeter, S));
});

test('bank and role aliases resolve to canonical slots and cross-bank sounds auto-resolve within setup', () => {
  const base = P.capture(tracks, 4, 100, 2, 0, S, M);
  const proj = JSON.parse(JSON.stringify(base));

  // Change track 0 to use alias 'BELL' and sound 'bell' (canonical GLASS)
  proj.tracks[0].name = 'BELL';
  proj.tracks[0].instrument = 'BELL';
  proj.tracks[0].sound = 'bell';

  // Change track 2 (ROOT) to use alias 'BASS' and sound 'round' (canonical ROOT in ambient)
  proj.tracks[2].name = 'BASS';
  proj.tracks[2].instrument = 'BASS';
  proj.tracks[2].sound = 'round';

  // Change track 6 to specify instrument GLASS but sound 'harp' (which belongs to EMBER in ambient)
  proj.tracks[6].instrument = 'GLASS';
  proj.tracks[6].sound = 'harp';

  const validated = P.validate(proj, S);
  assert.equal(validated.tracks[0].instrument, 'GLASS');
  assert.equal(validated.tracks[2].instrument, 'ROOT');
  assert.equal(validated.tracks[6].instrument, 'EMBER'); // Auto-resolved to EMBER
});

