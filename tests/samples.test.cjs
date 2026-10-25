const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Sounds=require('../src/sounds.js');
const directory=path.join(__dirname,'../assets/reactor');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
function loader(){
 const sandbox={module:{exports:{}},URL,Uint8Array,atob,Map,WeakMap,setTimeout,clearTimeout};vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/samples.js'),'utf8'),sandbox);sandbox.HaloSamples=sandbox.module.exports;
 for(const pack of ['drums','bass','guitars','keys'])vm.runInContext(fs.readFileSync(path.join(directory,pack+'.js'),'utf8'),sandbox);
 return sandbox.HaloSamples;
}
test('every imported WAV has pinned CC0 provenance, matching hashes and bounded non-silent PCM',()=>{
 const assets={};for(const pack of ['drums','bass','guitars','keys'])vm.runInNewContext(fs.readFileSync(path.join(directory,pack+'.js'),'utf8'),{HaloSamples:{register(name,banks){assets[name]=banks}}});
 assert.equal(manifest.samples.length,130);assert.ok(manifest.totalPackBytes<70*1024*1024);
 const usedBanks=new Set();
 for(const [source,value] of Object.entries(manifest.sources)){assert.equal(value.rights,'CC0-1.0',source);assert.ok(value.sourceURL.startsWith('https://'));assert.ok(value.author.length>3);assert.match(fs.readFileSync(path.join(directory,value.localEvidence),'utf8'),/CC0/)}
 for(const entry of manifest.samples){
  const pack=entry.localFile.split('.')[0],regions=assets[pack][entry.bank],root=regions.filter(r=>r.root===entry.root);
  const ordinal=Number(entry.id.split('-').at(-1)),bytes=Buffer.from(root[ordinal].data,'base64');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.wavSHA256,entry.id);assert.equal(bytes.length,entry.bytes);assert.match(entry.sourceSHA256,/^[a-f0-9]{64}$/);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),32000);assert.equal(bytes.readUInt16LE(34),16);assert.ok(entry.duration>0&&entry.duration<=(entry.bank.startsWith('guitar-')?30:3.5));
  let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));assert.ok(peak>100&&peak<32767,entry.id);usedBanks.add(entry.bank);
 }
 for(const bank of Object.values(Sounds.reactorBanks))for(const patch of bank.sounds)assert.ok(usedBanks.has(patch.sampleBank),patch.id);
});
test('sample decoding is cached per context, retries failures and selects deterministic nearby notes',async()=>{
 const samples=loader();let calls=0;
 const ctx={async decodeAudioData(bytes){calls++;return {duration:(bytes.byteLength-44)/64000,numberOfChannels:1}}};
 const first=samples.prepare(ctx);assert.equal(samples.prepare(ctx),first);const bank=await first;assert.equal(calls,130);assert.equal((await samples.prepare(ctx)),bank);assert.equal(calls,130);
 let fail=true;const other={async decodeAudioData(bytes){if(fail)throw Error('fixture decode failure');return {duration:(bytes.byteLength-44)/64000,numberOfChannels:1}}};
 await assert.rejects(samples.prepare(other),/decode/);fail=false;assert.ok((await samples.prepare(other)).piano.length>5);
 const regions=[{root:48,buffer:'low-a'},{root:48,buffer:'low-b'},{root:60,buffer:'high'}];
 assert.equal(samples.select(regions,55,.8).root,60);assert.equal(samples.select(regions,54,.8).root,48);assert.equal(samples.select(regions,54,.8),samples.select(regions,54,.8));assert.throws(()=>samples.select([],60,.8));
});
test('recorded roots cover all generated pitched notes without extreme resampling',()=>{
 const roots={};for(const entry of manifest.samples)(roots[entry.bank]??=[]).push({root:entry.root});
 const Samples=require('../src/samples.js'),C=require('../src/composition.js');
 for(const [name,bank] of Object.entries(Sounds.reactorBanks))for(const patch of bank.sounds)for(const transpose of C.offsets)for(let bar=0;bar<4;bar++)for(let step=0;step<16;step++){
  const track={name,setup:'reactor',sound:patch.id};for(const note of Sounds.notesFor(track,0,bar,step,1,transpose)){
   const nearest=Samples.select(roots[patch.sampleBank],note,.8);assert.ok(Math.abs(nearest.root-note)<=(patch.engine==='rockbass'?6:5),patch.id+' '+note);
  }
 }
});
test('local pack loading keeps repository subpaths, coalesces requests and retries only failed packs',async()=>{
 const urls=[];let fail=true,samples;
 const document={currentScript:{src:'https://example.invalid/halo/src/samples.js?v=cc0-2'},createElement(){return {remove(){}}},head:{append(script){
  urls.push(script.src);const pack=/\/(\w+)\.js/.exec(script.src)[1];if(pack==='drums'&&fail){fail=false;script.onerror();return}
  samples.register(pack,Object.fromEntries(samples.packs[pack].map(name=>[name,[{root:60,data:'UklGRg=='}]])));script.onload();
 }}};
 const sandbox={document,module:{exports:{}},URL,Uint8Array,atob,Map,WeakMap,setTimeout,clearTimeout};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/samples.js'),'utf8'),sandbox);samples=sandbox.module.exports;
 await assert.rejects(samples.load(),/could not load/);assert.equal(urls.length,4);await samples.load();assert.equal(urls.length,5);await samples.load();assert.equal(urls.length,5);
 assert.ok(urls.every(url=>url.startsWith('https://example.invalid/halo/assets/reactor/')));
});


test('natural WATER handpan has pinned CC0 evidence, verified PCM hashes and distinct recorded roots',()=>{
 const folder=path.join(__dirname,'../assets/water'),m=JSON.parse(fs.readFileSync(path.join(folder,'handpan-manifest.json'),'utf8'));
 assert.equal(m.rights,'CC0-1.0');assert.match(m.revision,/^[a-f0-9]{40}$/);assert.match(fs.readFileSync(path.join(folder,m.localEvidence),'utf8'),/CC0/);
 let bank;vm.runInNewContext(fs.readFileSync(path.join(folder,'handpan.js'),'utf8'),{HaloSamples:{register(pack,banks){assert.equal(pack,'handpan');bank=banks['water-handpan']}}});
 assert.equal(bank.length,18);assert.equal(new Set(bank.map(r=>r.root)).size,9);assert.ok(m.totalPackBytes<6*1024*1024);
 for(const [i,e] of m.samples.entries()){
  const bytes=Buffer.from(bank[i].data,'base64');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),e.wavSHA256);assert.match(e.sourceSHA256,/^[a-f0-9]{64}$/);
  assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),32000);assert.equal(bytes.readUInt16LE(34),16);assert.ok(e.duration>1&&e.duration<=3.4);
  let peak=0;for(let j=44;j<bytes.length;j+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(j)));assert.ok(peak>1000&&peak<27000);
 }
});

test('WATER handpan decodes alone and incremental REACTOR preparation retains cached natural recordings',async()=>{
 const samples=loader();vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/water/handpan.js'),'utf8'),{HaloSamples:samples});
 let count=0;const ctx={async decodeAudioData(bytes){count++;return {duration:(bytes.byteLength-44)/64000,numberOfChannels:1}}};
 const first=samples.prepare(ctx,['water-handpan']);assert.equal(samples.prepare(ctx,['water-handpan']),first);
 const bank=await first;assert.equal(count,18);assert.deepEqual(Object.keys(bank),['water-handpan']);
 const all=await samples.prepare(ctx);assert.equal(all,bank);assert.equal(count,148);assert.equal(all['water-handpan'].length,18);
 await samples.prepare(ctx,['water-handpan']);assert.equal(count,148);
});


test('concurrent pack requests never decode more than four buffers at once',async()=>{
 const samples=loader();let active=0,max=0;
 const ctx={async decodeAudioData(bytes){active++;max=Math.max(max,active);await new Promise(resolve=>setImmediate(resolve));active--;return {duration:(bytes.byteLength-44)/64000,numberOfChannels:1}}};
 await samples.prepare(ctx);assert.equal(max,4);assert.equal(active,0);
});
