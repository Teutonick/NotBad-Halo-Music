const test = require('node:test');
const assert = require('node:assert/strict');
const { banks, chords, soundFor, notesFor, shouldTrigger } = require('../src/sounds.js');
const Audio = require('../src/audio.js');
const track = name => ({ name, sound: banks[name].sounds[0].id, character: 50, duration: 50, space: 55, level: 65, density: 100, on: true, pattern: [0, 4, 8, 12] });

test('full randomization selects another affinity sound for the fixed role and bounds tuning to 20–100',()=>{
 const S=require('../src/sounds.js');
 for(const setup of ['ambient','reactor'])for(const [index,name] of Object.keys(banks).entries()){
  let t={...track(name),setup,on:false};
  for(let seed=2;seed<=128;seed++){
   const result=S.randomizeTrack(t,index,seed);assert.deepEqual(result,S.randomizeTrack(t,index,seed));
   assert.ok(S.roles.pool(t,S.banksFor(setup),true).some(c=>c.sound.id===result.sound&&c.instrument===result.instrument));assert.notEqual(result.sound,t.sound);
   for(const field of ['character','duration','density','level','space']){assert.ok(Number.isInteger(result[field])&&result[field]>=20&&result[field]<=100);assert.notEqual(result[field],t[field])}
   assert.equal(result.on,undefined);t={...t,...result};assert.equal(t.on,false);
  }
 }
});

test('eight distinct roles, 30 local patches, safe unknown patch fallback', () => {
  assert.equal(Object.keys(banks).length, 8);
  assert.equal(Object.values(banks).reduce((n,b)=>n+b.sounds.length,0),30);
  assert.equal(new Set(Object.values(banks).map(b => b.role)).size, 8);
  for (const [name, bank] of Object.entries(banks)) {
    assert.ok(bank.sounds.length >= 3);
    assert.equal(new Set(bank.sounds.map(s => s.id)).size, bank.sounds.length);
    assert.equal(soundFor({ name, sound: 'missing' }), bank.sounds[0]);
  }
});

test('all pitched patches stay in the current chord; noises and percussion have no chord pitches', () => {
  Object.keys(banks).forEach((name, index) => {
    for (const patch of banks[name].sounds) for (let bar = 0; bar < 16; bar++) for (let local = 0; local < 16; local++) {
      const t = { ...track(name), sound: patch.id };
      const notes = notesFor(t, index, bar, local, 3);
      assert.deepEqual(notes, notesFor(t, index, bar, local, 3));
      if (['noise', 'kick', 'drop', 'snare', 'clap'].includes(patch.engine)) assert.deepEqual(notes, []);
      else {
        assert.ok(notes.length > 0 && notes.length <= 3);
        for (const n of notes) assert.ok(chords[bar % 4].some(c => (n - c) % 12 === 0));
      }
    }
  });
});

test('events obey mute, pattern, density and alternate-bar ambient phrasing', () => {
  const t = track('GLASS');
  assert.equal(shouldTrigger(t, 0, 0, 1), true);
  assert.equal(shouldTrigger(t, 0, 1, 1), false);
  assert.equal(shouldTrigger({ ...t, on: false }, 0, 0, 1), false);
  assert.equal(shouldTrigger({ ...t, density: 0 }, 0, 0, 1), false);
  assert.equal(shouldTrigger(track('AURA'), 7, 16, 1), false);
  const events = seed => Array.from({ length: 256 }, (_, step) => shouldTrigger({ ...t, density: 50 }, 0, step, seed));
  assert.deepEqual(events(1), events(1)); assert.notDeepEqual(events(1), events(2));
});

// A deterministic Web Audio contract fake: validates schedule, finite parameters,
// ramped updates, bounded events and complete source/graph cleanup, not sound quality.
function context() {
  const nodes = [], sources = [];
  const param = () => ({ value: 0, calls: [], setValueAtTime(v, t) { this.record(v,t); },
    exponentialRampToValueAtTime(v,t) { assert.ok(v > 0); this.record(v,t); },
    setTargetAtTime(v,t,tau) { assert.ok(tau > 0); this.record(v,t); },
    cancelAndHoldAtTime(t) { this.record(0,t); },
    record(v,t) { assert.ok(Number.isFinite(v) && Number.isFinite(t)); this.calls.push([v,t]); } });
  const node = () => { const n = { disconnected: false, connect() {}, disconnect() { this.disconnected = true; },
    gain: param(), frequency: param(), detune: param(), Q: param(),playbackRate:param() }; nodes.push(n); return n; };
  const source = () => { const n = node(); n.start = t => { n.started = t; }; n.stop = t => { n.stopped = t; }; sources.push(n); return n; };
  return { currentTime: 0, sampleRate: 8000, destination: node(), nodes, sources,
    createGain: node, createDynamicsCompressor() { const n = node(); for (const k of ['threshold','knee','ratio','attack','release']) n[k] = param(); return n; },
    createStereoPanner(){const n=node();n.pan=param();return n},createConvolver: node, createBiquadFilter: node, createWaveShaper:node, createOscillator(){const n=source();n.oscillator=true;return n}, createBufferSource: source,
    createBuffer(ch, length) { const data = Array.from({ length: ch }, () => new Float32Array(length)); return { duration:length/8000,getChannelData: i => data[i] }; } };
}
test('every patch schedules finite, bounded audio and releases all event nodes', () => {
  const tracks = Object.keys(banks).map(track), ctx = context(), audio = Audio.create(ctx, tracks);
  const baseline = ctx.nodes.length;
  tracks.forEach((t, index) => {
    for (const patch of banks[t.name].sounds) for (const value of [0,100]) {
      t.sound = patch.id; t.character = t.duration = t.space = value;
      audio.play(index, notesFor(t,index,0,0,1), .1, .8, patch);
      audio.update(index);
    }
  });
  for (const source of ctx.sources) {
    assert.equal(source.started, .1); assert.ok(source.stopped >= .06 && source.stopped < 9);
    source.onended();
  }
  assert.ok(audio.voices.every(v => v.size === 0));
  assert.ok(ctx.nodes.slice(baseline).every(n => n.disconnected));
  tracks[0].on = false; audio.update(0);
  assert.equal(audio.trackGains[0].gain.calls.at(-1)[0], 0);
});
test('dense retriggers steal old events with bounded release times', () => {
  const t = track('TIDAL'), ctx = context(), audio = Audio.create(ctx,[t]);
  for (let i=0; i<40; i++) audio.play(0,[50,53,57], .1,.8,soundFor(t));
  assert.equal(audio.voices[0].size,4);
  assert.ok(ctx.sources.some(s => Math.abs(s.stopped-.16)<.000001));
  ctx.sources.forEach(s=>s.onended());
  assert.equal(audio.voices[0].size,0);
});
test('master gain defaults to half volume and includes complete silence',()=>{
 const tracks=Object.keys(banks).map(track);
 assert.equal(Audio.create(context(),tracks).master.gain.value,.5);
 for(const volume of [0,25,100])assert.equal(Audio.create(context(),tracks,volume).master.gain.value,volume/100);
});

test('new 50 percent master matches previous 100 percent instrument feed and mute remains silent',()=>{
 const tracks=Object.keys(banks).map(track),audio=Audio.create(context(),tracks,50);
 tracks.forEach((t,i)=>{
  assert.equal(audio.trackGains[i].gain.value*audio.master.gain.value,(t.level/100)*2);
  t.level=100;audio.update(i,1);assert.equal(audio.trackGains[i].gain.calls.at(-1)[0]*audio.master.gain.value,2);
  t.on=false;audio.update(i,2);assert.equal(audio.trackGains[i].gain.calls.at(-1)[0],0);
 });
});

test('master EQ ramps without suppressing other bands and independent bounded stereo positions',()=>{
 const ctx=context(),audio=Audio.create(ctx,Object.keys(banks).map(track));
 assert.deepEqual(audio.eq.map(n=>n.type),['lowshelf','peaking','highshelf']);
 audio.setMix({low:6,mid:-3,high:2,width:100},2);
 assert.deepEqual(audio.eq.map(n=>n.gain.calls.at(-1)),[[6,2],[-3,2],[2,2]]);
 assert.equal(audio.headroom.gain.calls.at(-1)[0],1);
 assert.equal(audio.compressor.threshold.value,-1);assert.equal(audio.compressor.knee.value,0);
 const pans=audio.panners.map(n=>n.pan.calls.at(-1)[0]);
 assert.equal(new Set(pans).size,8);assert.ok(pans.every(n=>Math.abs(n)<=.7));assert.ok(Math.abs(pans[0])<.1);
 audio.setMix({low:0,mid:0,high:0,width:0},3);
 assert.ok(audio.panners.every(n=>n.pan.calls.at(-1)[0]===0));
 assert.equal(audio.headroom.gain.calls.at(-1)[0],1);
 const fallback=context();delete fallback.createStereoPanner;assert.doesNotThrow(()=>Audio.create(fallback,Object.keys(banks).map(track)).setMix({width:100}));
});

test('relocated bass/kick stay near stereo center and layered roles receive ramped headroom',()=>{
 const S=require('../src/sounds.js'),tracks=Object.keys(banks).map(name=>({...track(name),setup:'reactor',instrument:name,generator:2,sound:S.reactorBanks[name].sounds[0].id}));
 tracks[7].instrument='GLASS';tracks[7].sound='reactor-dry-kick';S.arrange(tracks);
 const ctx=context(),audio=Audio.create(ctx,tracks,50,{}, {low:0,mid:0,high:0,width:100});
 assert.ok(Math.abs(audio.panners[7].pan.calls.at(-1)[0])<=.06);
 assert.ok(Math.abs(audio.panners[4].pan.calls.at(-1)[0])<=.06);
 assert.equal(audio.trackGains[7].gain.value,tracks[7].level/100*4/Math.sqrt(2));
 tracks[7].instrument='MOSS';tracks[7].sound='reactor-singing-lead';S.arrange(tracks);audio.update(7,2);
 assert.equal(audio.panners[7].pan.calls.at(-1)[0],.7);
 assert.equal(audio.trackGains[7].gain.calls.at(-1)[0],tracks[7].level/100*4/Math.sqrt(2));
});

test('reactor drum transients use a fast attack and stronger event gain than guitar',()=>{
 const S=require('../src/sounds.js');
 for(const [name,expected] of [['GLASS',.14],['TIDAL',.11],['EMBER',.11],['VEIL',.065]]){
  const ctx=context(),patch=S.reactorBanks[name].sounds[0],t={...track(name),setup:'reactor'};
  const audio=Audio.create(ctx,[t],50,{[patch.sampleBank]:[{root:60,buffer:ctx.createBuffer(1,8000)}]}),baseline=ctx.nodes.length;
  audio.play(0,[60],1,1,patch);
  const envelope=ctx.nodes.slice(baseline).find(n=>n.gain.calls.length);
  assert.equal(envelope.gain.calls[1][0],expected);
  assert.equal(envelope.gain.calls[1][1],patch.punch||name!=='VEIL'?1.003:1.012);
 }
});

test('all 32 reactor patches schedule only samples, finite rates and complete cleanup',()=>{
 const S=require('../src/sounds.js'),tracks=Object.keys(banks).map(name=>({...track(name),setup:'reactor'})),ctx=context();
 const samples=Object.fromEntries(Object.values(S.reactorBanks).flatMap(b=>b.sounds.map(s=>[s.sampleBank,[{root:60,buffer:ctx.createBuffer(1,100)}]])));
 const audio=Audio.create(ctx,tracks,50,samples),baseline=ctx.nodes.length;
 assert.equal(Object.values(S.reactorBanks).flatMap(b=>b.sounds).length,32);
 const ambientIDs=new Set(Object.values(banks).flatMap(b=>b.sounds.map(s=>s.id)));
 tracks.forEach((t,i)=>{for(const patch of S.bankFor(t).sounds){assert.ok(!ambientIDs.has(patch.id));for(const value of [0,100]){t.sound=patch.id;t.duration=t.character=value;audio.play(i,S.notesFor(t,i,1,6,1),.1,.8,patch);audio.update(i,.1)}}});
 assert.ok(audio.voices.every(v=>v.size<=4));
 assert.ok(ctx.sources.every(source=>!source.oscillator));
 for(const source of ctx.sources){assert.equal(source.started,.1);assert.ok(source.stopped<9);source.onended()}
 assert.ok(audio.voices.every(v=>v.size===0));assert.ok(ctx.nodes.slice(baseline).every(n=>n.disconnected));
});
test('missing samples fail before allocating nodes and never use procedural fallback',()=>{
 const S=require('../src/sounds.js'),ctx=context(),t={...track('VEIL'),setup:'reactor',sound:'reactor-palm-guitar'},audio=Audio.create(ctx,[t]),count=ctx.nodes.length;
 assert.throws(()=>audio.play(0,[48,55],.1,.8,S.soundFor(t)),/not ready/);assert.equal(ctx.nodes.length,count);
});

test('reactor keeps backbeat, bass/guitar harmony, independent rhythms, silence and deterministic transposition',()=>{
 const S=require('../src/sounds.js'),tracks=Object.keys(banks).map(name=>({...track(name),setup:'reactor',sound:S.reactorBanks[name].sounds[0].id,variation:12}));
 assert.ok([4,12].every(step=>S.patternFor(tracks[1]).includes(step)));assert.notDeepEqual(S.patternFor(tracks[4]),S.patternFor(tracks[5]));
 for(let seed=1;seed<5;seed++)for(let step=0;step<64;step++){
  const bar=Math.floor(step/16),local=step%16,bass=S.notesFor(tracks[4],4,bar,local,seed),guitar=S.notesFor(tracks[5],5,bar,local,seed);
  assert.ok([12,24].includes(guitar[0]-bass[0]));assert.equal(guitar[1]-guitar[0],7);assert.ok(bass[0]<=46);
  assert.deepEqual(S.notesFor(tracks[7],7,bar,local,seed,5),S.notesFor(tracks[7],7,bar,local,seed).map(n=>n+5));
  assert.equal(S.shouldTrigger({...tracks[0],on:false},0,step,seed),false);
 }
 assert.equal(S.shouldTrigger({...tracks[3],manualSteps:[0],manualBars:4,density:0},3,0,1),true);
});

test('BASS and RIFF generate independent attacks across seeds and all preset combinations',()=>{
 const S=require('../src/sounds.js'),M=require('../src/motion.js');
 for(const bass of S.reactorBanks.RAIN.sounds)for(const riff of S.reactorBanks.VEIL.sounds)for(let seed=1;seed<=128;seed++){
  const b={...track('RAIN'),setup:'reactor',sound:bass.id,variation:seed};
  const r={...track('VEIL'),setup:'reactor',sound:riff.id,variation:seed};
  const steps=t=>M.phraseSteps(t,0,0,seed,S,4).filter(e=>e.fires).map(e=>e.step);
  assert.notDeepEqual(steps(b),steps(r),bass.id+' / '+riff.id+' seed '+seed);
  assert.deepEqual(steps(b),steps(b));assert.deepEqual(steps(r),steps(r));
 }
});

test('GENERATE changes every reactor preset rhythm and percussion covers all phrase bars',()=>{
 const S=require('../src/sounds.js'),M=require('../src/motion.js');
 for(const [name,bank] of Object.entries(S.reactorBanks))for(const patch of bank.sounds){
  const t={...track(name),setup:'reactor',sound:patch.id};
  for(let seed=1;seed<33;seed++){
   assert.notDeepEqual(S.patternFor({...t,variation:seed}),S.patternFor({...t,variation:seed+1}),patch.id+' seed '+seed);
   const previous=S.patternFor({...t,variation:seed}),next=S.patternFor({...t,variation:seed+1});
   for(let shift=0;shift<16;shift++)assert.notDeepEqual(next,previous.map(step=>(step+shift)%16).sort((a,b)=>a-b),patch.id+' must rebuild, not rotate');
   for(const bars of [4,8]){
    const events=M.phraseSteps({...t,variation:seed},0,0,seed,S,bars);
    assert.deepEqual(events,M.phraseSteps({...t,variation:seed},0,bars*16,seed,S,bars));
    for(let bar=0;bar<bars;bar++)assert.ok(events.slice(bar*16,(bar+1)*16).some(e=>e.fires),patch.id+' bar '+bar);
    for(const event of events)assert.equal(event.candidate,event.fires);
   }
  }
 }
});

test('RIFF and LEAD ring for the recording duration and release only on a new event',()=>{
 const S=require('../src/sounds.js');
 for(const name of ['VEIL','MOSS'])for(const patch of S.reactorBanks[name].sounds){
  const ctx=context(),t={...track(name),setup:'reactor'},buffer=ctx.createBuffer(1,80000);
  const audio=Audio.create(ctx,[t],50,{[patch.sampleBank]:[{root:60,buffer}]});
  const baseline=ctx.nodes.length;
  audio.play(0,[60],1,.8,patch);
  const first=ctx.sources[0],envelope=ctx.nodes.slice(baseline).find(n=>n.gain.calls.length);
  assert.equal(first.stopped,11);
  assert.equal(envelope.gain.calls.length,2,'no decay ramp may truncate the recording');
  audio.play(0,[72],2,.8,patch);
  assert.equal(first.stopped,2.06);assert.equal(ctx.sources[1].stopped,7);
  assert.equal(audio.voices[0].size,1);
  assert.ok(envelope.gain.calls.some(([value,time])=>value===.00001&&time===2));
  ctx.sources.forEach(s=>s.onended());assert.equal(audio.voices[0].size,0);
 }
});

test('boosting only bass keeps other master bands and broadband gain unchanged at every EQ step',()=>{
 const audio=Audio.create(context(),Object.keys(banks).map(track));
 for(let low=-9;low<=9;low++){
  audio.setMix({low,mid:0,high:0,width:35},1);
  assert.equal(audio.eq[0].gain.calls.at(-1)[0],low);
  assert.equal(audio.eq[1].gain.calls.at(-1)[0],0);assert.equal(audio.eq[2].gain.calls.at(-1)[0],0);
  assert.equal(audio.headroom.gain.calls.at(-1)[0],1);
  assert.equal(audio.compressor.threshold.value,-1);assert.equal(audio.compressor.knee.value,0);
 }
});
