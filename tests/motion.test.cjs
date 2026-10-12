const test = require('node:test');
const assert = require('node:assert/strict');
const {phaseAt} = require('../src/motion.js');
const {banks, patternFor, shouldTrigger} = require('../src/sounds.js');
const Sounds = require('../src/sounds.js');
const {phraseAt,phraseSteps} = require('../src/motion.js');
test('one revolution is four bars / 64 steps, with correct phrase wrap and count',()=>{
  assert.deepEqual(phraseAt(0),{number:1,start:0,phase:0,bar:1,beat:1,step:0,bars:4});
  assert.equal(phraseAt(4).phase,.25); assert.equal(phraseAt(4).bar,2);
  assert.equal(phraseAt(15.75).step,63); assert.equal(phraseAt(15.75).bar,4);
  assert.equal(phraseAt(16).number,2); assert.equal(phraseAt(16).phase,0);
  for(let step=0;step<256;step++) assert.equal(phraseAt(step/4).phase,(step%64)/64);
});
test('phrase markers agree with actual seeded notes, skips and alternate silent bars; mute previews stay intact',()=>{
  Object.keys(banks).forEach((name,index)=>{
    for(const sound of banks[name].sounds){
      const t={name,sound:sound.id,on:true,density:48,pattern:[0,4,8,12]};
      for(const start of [0,64,128]){
        const events=phraseSteps(t,index,start,3,Sounds);
        assert.equal(events.length,64);
        events.forEach(e=>assert.equal(e.fires,shouldTrigger(t,index,e.step,3)));
        assert.deepEqual(phraseSteps({...t,on:false},index,start,3,Sounds),events);
      }
    }
  });
  const veil={name:'VEIL',sound:'bow',on:true,density:100,pattern:[0]};
  assert.deepEqual(phraseSteps(veil,5,0,1,Sounds).filter(e=>e.fires).map(e=>e.step),[0,32]);
});
test('each musical hit crosses the shared right axis, across bar boundaries',()=>{
  for(const pattern of [[0],[0,5,10,14],[4,12],[0,4,8,12],[2,6,10,14]]) {
    for(let bar=0;bar<100;bar++) for(const step of pattern) {
      assert.equal(phaseAt(pattern,bar*16+step),0);
      assert.ok(phaseAt(pattern,bar*16+step+.001)>0);
      const before=phaseAt(pattern,bar*16+step-.001);
      if(bar*16+step>0) assert.ok(before>.99);
    }
  }
});
test('phase is bounded and deterministic between irregular events',()=>{
  for(let step=0;step<100;step+=.031) {
    const phase=phaseAt([0,5,10,14],step);
    assert.ok(phase>=0&&phase<1); assert.equal(phase,phaseAt([0,5,10,14],step));
  }
});
test('drum patches supply a quarter-note kick and backbeat snare without altering saved track pattern',()=>{
  const root={name:'ROOT',sound:'punch',on:true,density:100,pattern:[0,8]};
  const rain={name:'RAIN',sound:'snare',on:true,density:100,pattern:[0]};
  assert.deepEqual(patternFor(root),[0,4,8,12]);
  assert.deepEqual(patternFor(rain),[4,12]);
  assert.equal(shouldTrigger(root,2,4,1),true);
  assert.equal(shouldTrigger(rain,4,12,1),true);
  assert.equal(shouldTrigger(rain,4,8,1),false);
  assert.deepEqual(root.pattern,[0,8]);
  assert.ok(banks.RAIN.sounds.some(s=>s.engine==='clap'));
});
