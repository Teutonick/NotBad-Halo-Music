const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../src/sounds.js'),F=require('../src/phrases.js'),R=require('../src/roles.js'),M=require('../src/motion.js'),P=require('../src/project.js');

const makeTrack=(setup='ambient',slot='ROOT',role='percussion',sound='pulse',timeSignature='3/4',phraseBars=4)=>({
  name:slot,instrument:slot,setup,generator:3,role,sound,
  timeSignature,phraseBars,on:true,level:70,density:100,character:50,duration:50,space:25,
  sequence:{length:12,stepLength:1,offset:0}
});

test('authored 3/4 waltz and 6/8 pirate swing catalogs provide 10 unique musical patterns per role in 0..11',()=>{
  const roles=Object.keys(F.catalog);
  assert.equal(roles.length,14);

  // 3/4 Waltz catalog
  const waltzCat=F.catalog3_4_waltz;
  assert.ok(waltzCat);
  for(const role of roles){
    const list=waltzCat[role];
    assert.equal(list.length,10,`Waltz catalog for ${role} should have 10 patterns`);
    const uniqueSteps=new Set(list.map(m=>JSON.stringify(m.steps)));
    assert.equal(uniqueSteps.size,10,`All 10 waltz patterns for ${role} must be unique`);
    for(const m of list){
      assert.ok(m.en&&m.ru);
      assert.ok(m.steps.length>0,`Waltz pattern ${m.id} cannot be empty`);
      assert.ok(m.steps.every(s=>Number.isInteger(s)&&s>=0&&s<12),`Waltz step out of bounds in ${m.id}`);
      assert.ok(m.degrees.every(d=>d>=0&&d<4));
    }
  }

  // 6/8 Pirate Swing catalog
  const swingCat=F.catalog6_8_swing;
  assert.ok(swingCat);
  for(const role of roles){
    const list=swingCat[role];
    assert.equal(list.length,10,`6/8 Swing catalog for ${role} should have 10 patterns`);
    const uniqueSteps=new Set(list.map(m=>JSON.stringify(m.steps)));
    assert.equal(uniqueSteps.size,10,`All 10 6/8 swing patterns for ${role} must be unique`);
    for(const m of list){
      assert.ok(m.en&&m.ru);
      assert.ok(m.steps.length>0,`6/8 Swing pattern ${m.id} cannot be empty`);
      assert.ok(m.steps.every(s=>Number.isInteger(s)&&s>=0&&s<12),`6/8 Swing step out of bounds in ${m.id}`);
      assert.ok(m.degrees.every(d=>d>=0&&d<4));
    }
  }

  // Verify getCatalog helper
  assert.equal(F.getCatalog('4/4',4),F.catalog);
  assert.equal(F.getCatalog('4/4',8),F.catalog);
  assert.equal(F.getCatalog('3/4',4),F.catalog3_4_waltz);
  assert.equal(F.getCatalog('3/4',8),F.catalog6_8_swing);
});

test('3/4 waltz orchestration exhibits classic downbeat and afterbeat accompaniment',()=>{
  // Kick downbeat anchor on 0
  const kick0=F.catalog3_4_waltz.kick[0].steps;
  assert.deepEqual(kick0,[0]);
  // Snare afterbeat on 4 and 8 (beats 2 and 3)
  const snare0=F.catalog3_4_waltz.snare[0].steps;
  assert.deepEqual(snare0,[4,8]);
  // Keys piano chords on 4 and 8
  const keys0=F.catalog3_4_waltz.keys[0].steps;
  assert.deepEqual(keys0,[4,8]);
  // Pluck cascading waltz eighths on 0, 2, 4, 6, 8, 10
  const pluck0=F.catalog3_4_waltz.pluck[0].steps;
  assert.deepEqual(pluck0,[0,2,4,6,8,10]);
  // Bass roots on beat 1 (step 0)
  for(let i=0;i<10;i++){
    assert.equal(F.catalog3_4_waltz.bass[i].steps[0],0,'Waltz bass must anchor downbeat on step 0');
  }
});

test('6/8 pirate swing orchestration exhibits compound dotted-quarter beats and rolling eighths',()=>{
  // Kick on compound beats 0 and 6 (ONE, TWO)
  const kick0=F.catalog6_8_swing.kick[0].steps;
  assert.deepEqual(kick0,[0,6]);
  // Snare backbeat on compound beat 2 (step 6)
  const snare0=F.catalog6_8_swing.snare[0].steps;
  assert.deepEqual(snare0,[6]);
  // Metal rolling eighths (0, 2, 4, 6, 8, 10)
  const metal0=F.catalog6_8_swing.metal[0].steps;
  assert.deepEqual(metal0,[0,2,4,6,8,10]);
  // Zimmer-style dactylic pirate ostinato riff [0, 3, 4, 6, 9, 10]
  const riff0=F.catalog6_8_swing.riff[0].steps;
  assert.deepEqual(riff0,[0,3,4,6,9,10]);
  // Swashbuckling lead melody theme
  const lead0=F.catalog6_8_swing.lead[0].steps;
  assert.deepEqual(lead0,[0,2,4,6,8]);
  // Bass compound anchors on 0 and 6
  assert.equal(F.catalog6_8_swing.bass[0].steps[0],0);
  assert.equal(F.catalog6_8_swing.bass[0].steps[1],6);
});

test('GENERATE (randomizeTrack) selects 12-step adapted cycles and patterns in 3/4 waltz and 6/8 swing',()=>{
  for(const setup of ['ambient','reactor']){
    const banks=S.banksFor(setup);
    for(const [slot,bank] of Object.entries(banks)){
      const t=makeTrack(setup,slot,R.forTrack({name:slot}).id,bank.sounds[0].id,'3/4',4);

      // Randomize in 3/4 waltz (4 bars)
      const waltzResult=S.randomizeTrack(t,0,13,4,'3/4');
      assert.ok([6,9,12,24].includes(waltzResult.sequence.length),`Waltz cycle length should be 6, 9, 12, or 24: got ${waltzResult.sequence.length}`);
      assert.equal(waltzResult.timeSignature,'3/4');
      assert.equal(waltzResult.phraseBars,4);

      // Randomize in 6/8 pirate swing (8 bars)
      const swingResult=S.randomizeTrack(t,0,17,8,'3/4');
      assert.ok([6,8,12,24].includes(swingResult.sequence.length),`Swing cycle length should be 6, 8, 12, or 24: got ${swingResult.sequence.length}`);
      assert.equal(swingResult.timeSignature,'3/4');
      assert.equal(swingResult.phraseBars,8);
    }
  }
});

test('Roles and Phrases plan strictly confines 3/4 waltz steps to 0..47 and 6/8 swing steps to 0..95',()=>{
  for(const setup of ['ambient','reactor']){
    for(const slot of F.slots){
      const bank=S.banksFor(setup)[slot];
      for(const sound of bank.sounds.slice(0,2)){
        const waltzTrack=makeTrack(setup,slot,R.forTrack({name:slot}).id,sound.id,'3/4',4);
        const waltzPlan=R.plan(waltzTrack,sound,5,4,'3/4');
        assert.ok(waltzPlan.steps.length>0);
        assert.ok(waltzPlan.steps.every(s=>s>=0&&s<48),`Waltz step out of 48-step bounds: ${waltzPlan.steps}`);

        const swingTrack=makeTrack(setup,slot,R.forTrack({name:slot}).id,sound.id,'3/4',8);
        const swingPlan=R.plan(swingTrack,sound,7,8,'3/4');
        assert.ok(swingPlan.steps.length>0);
        assert.ok(swingPlan.steps.every(s=>s>=0&&s<96),`6/8 swing step out of 96-step bounds: ${swingPlan.steps}`);
      }
    }
  }
});

test('Accents in 3/4 waltz and 6/8 swing emphasize authentic metric beats',()=>{
  const waltzTrack=makeTrack('ambient','ROOT','pulse','pulse','3/4',4);
  const waltzPlan=F.plan(waltzTrack,S.soundFor(waltzTrack),1,4,'3/4');
  // In waltz: downbeat 0 is strongest accent (.88), beats 4 and 8 are .78
  assert.equal(waltzPlan.accents[0],0.88);

  const swingTrack=makeTrack('ambient','ROOT','pulse','pulse','3/4',8);
  const swingPlan=F.plan(swingTrack,S.soundFor(swingTrack),1,8,'3/4');
  // In 6/8: downbeat 0 is .90, compound beat 6 is .86
  assert.equal(swingPlan.accents[0],0.90);
  assert.equal(swingPlan.accents[1],0.86);
});

test('Notes and chord resolution strictly respect 12-step bar boundaries without drift',()=>{
  const bassTrack={
    name:'RAIN',instrument:'ROOT',setup:'ambient',generator:3,role:'bass',sound:'round',
    timeSignature:'3/4',phraseBars:4,on:true,level:70,density:100,character:50,duration:50,space:25,
    sequence:{length:12,stepLength:1,offset:0}
  };
  // Bar 0 downbeat (step 0), Bar 1 downbeat (step 12), Bar 2 downbeat (step 24), Bar 3 downbeat (step 36)
  for(let bar=0;bar<4;bar++){
    const notes=S.notesFor(bassTrack,4,bar,0,3,0,4,bar*12,'minor','3/4');
    assert.ok(notes.length===1);
    assert.ok(notes[0]>=26&&notes[0]<=49,`Bass note ${notes[0]} out of bass range [26, 49]`);
  }
});
