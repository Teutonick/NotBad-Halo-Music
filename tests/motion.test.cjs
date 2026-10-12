const test = require('node:test');
const assert = require('node:assert/strict');
const {phaseAt} = require('../src/motion.js');
const {banks, patternFor, shouldTrigger} = require('../src/sounds.js');
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
