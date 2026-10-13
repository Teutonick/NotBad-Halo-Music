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
 for(const value of [{...project,tempo:Infinity},{...project,key:12},{...project,seed:1e20},{...project,bars:5},{...project,tracks:project.tracks.map((t,i)=>i?t:{...t,steps:[128]})},{...project,tracks:[...project.tracks.slice(1),project.tracks[1]]}])assert.throws(()=>P.validate(value,S));
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
