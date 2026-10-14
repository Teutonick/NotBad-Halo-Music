const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/composition.js'),S=require('../src/sounds.js'),M=require('../src/motion.js');
test('default loops stay identical; auto pattern and auto harmony are independent and change once per boundary',()=>{
  const c=C.create();for(let loop=0;loop<20;loop++)assert.deepEqual(c.at(loop),{seed:1,key:0});
  c.setAutoEvolve(true);assert.equal(c.at(20).seed,2);assert.equal(c.at(20).seed,2);assert.equal(c.at(20).key,0);
  c.setAutoEvolve(false);c.setAutoKey(true);const next=c.at(21);assert.equal(next.seed,2);assert.notEqual(next.key,0);
  c.setAutoKey(false);assert.deepEqual(c.at(22),next);
  assert.equal(c.generate().seed,3);assert.equal(c.nextKey().key,(next.key+1)%24);
  assert.equal(c.prevKey().key,next.key);
});
test('keys follow the Circle of Fifths and switching navigates strictly adjacent neighbors',()=>{
  assert.equal(C.keys.length,24);
  assert.equal(C.definitions.length,24);
  for(let i=0;i<24;i++){
    const curr=C.definitions[i],next=C.definitions[(i+1)%24];
    if(curr.mode!==next.mode){
      const [minorKey,majorKey]=curr.mode==='minor'?[curr,next]:[next,curr];
      assert.equal(((majorKey.offset-minorKey.offset)%12+12)%12,3,'relative pair share identical pitch scale');
    }else{
      const currFifth=(curr.offset+120)%12,nextFifth=(next.offset+120)%12;
      assert.ok(nextFifth===(currFifth+7)%12||nextFifth===(currFifth+5)%12,'adjacent modulation is by fifth/fourth');
    }
  }
  const comp=C.create({key:0});
  assert.equal(comp.nextKey().key,1);
  assert.equal(comp.prevKey().key,0);
  assert.equal(comp.prevKey().key,23);
  assert.equal(comp.nextKey().key,0);
  assert.equal(comp.toggleMode().key,1);
  assert.equal(comp.toggleMode().key,0);
  comp.setAutoKey(true);
  for(let loop=0;loop<24;loop++){
    const prevKey=comp.key;
    const current=comp.at(loop);
    if(loop>0){
      const diff=(current.key-prevKey+24)%24;
      assert.ok(diff===1||diff===23,'auto key must transition strictly to adjacent circle-of-fifths neighbors');
    }
  }
});
test('lookahead retains prior loop decisions; automatic keys do not depend on melody evolution',()=>{
  const a=C.create(),b=C.create();a.setAutoKey(true);b.setAutoKey(true);b.setAutoEvolve(true);
  const first=b.at(0);b.at(1);assert.deepEqual(b.at(0),first);assert.deepEqual(b.view(0),first);
  for(let loop=0;loop<12;loop++)assert.equal(a.at(loop).key,b.at(loop).key);
});
test('4/8-bar phrase clocks wrap independently of tempo; transposition preserves chord intervals',()=>{
  assert.equal(M.phraseAt(16,8).bar,5);assert.equal(M.phraseAt(32,8).number,2);assert.equal(M.phraseAt(32,8).phase,0);
  assert.equal(M.phraseSteps({name:'ROOT',sound:'punch',on:true,density:100,pattern:[0]},2,0,1,S,8).length,128);
  const t={name:'TIDAL',sound:'air'};
  for(const offset of C.offsets)assert.deepEqual(S.notesFor(t,1,0,0,1,offset),S.notesFor(t,1,0,0,1).map(n=>n+offset));
  assert.equal(new Set(C.names).size,24);assert.equal(C.offsets[1],3);
});
test('exact edited hits bypass random density and alternate-bar silences and repeat over 8 bars',()=>{
  const t={name:'VEIL',sound:'bow',on:true,density:0,pattern:[0],manualSteps:[0,17,127],manualBars:8};
  for(const step of [0,17,127,128,145,255])assert.equal(S.shouldTrigger(t,5,step,100),true);
  assert.equal(S.shouldTrigger(t,5,16,100),false);assert.equal(S.shouldTrigger({...t,on:false},5,17,1),false);
});
test('versioned local pattern roundtrip validates every track and rejects unsafe data',()=>{
  const names=Object.keys(S.banks),tracks=names.map(name=>({name,sound:S.banks[name].sounds[0].id,manualSteps:[0,17,127],manualBars:8}));
  const saved=C.encode(tracks,8,3,4),data=C.decode(saved,names);
  assert.equal(data.seed,3);assert.equal(data.key,4);assert.equal(data.bars,8);assert.deepEqual(data.tracks[0].steps,[0,17,127]);
  for(const bad of [{...data,version:2},{...data,bars:7},{...data,key:24},{...data,tracks:[...data.tracks.slice(1),data.tracks[1]]},
    {...data,tracks:data.tracks.map((t,i)=>i? t:{...t,steps:[128]})}])assert.throws(()=>C.decode(JSON.stringify(bad),names));
});


test('huge clock jumps keep harmony constant-time and seeds inside serialized bounds',()=>{
 const c=require('../src/composition.js').create({seed:1000000000,key:11});c.setAutoEvolve(true);c.setAutoKey(true);c.at(0);const next=c.at(1000000000);assert.ok(next.seed>=1&&next.seed<=1000000000);assert.equal(next.key,(11+1000000000)%24);assert.ok(c.generate().seed<=1000000000);
});
