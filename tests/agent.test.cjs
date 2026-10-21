const test=require('node:test'),assert=require('node:assert/strict');
const Agent=require('../src/agent.js'),project=require('../src/project.js'),song=require('../src/song.js'),sounds=require('../src/sounds.js'),motion=require('../src/motion.js');
function fixture(){let value=project.capture(Object.entries(sounds.banks).map(([name,b])=>({name,sound:b.sounds[0].id,on:true,level:50,density:50,character:50,duration:50,space:50,pattern:[0,4,8,12]})),4,72,1,0,sounds,motion);return {api:Agent.create({project,song,sounds,read:()=>value,write:async p=>{value=p}}),edit(){value.masterVolume=42}}}
const request=(api,operations)=>({schemaVersion:1,baseRevision:api.getProjectState().revision,operations});

test('MCP operation validation, apply and history preserve borrowed origins across control edits',async()=>{
 const {api}=fixture();api.setEnabled(true);
 await api.applyOperations(request(api,[{op:'track.patch',trackIndex:5,values:{sound:'reactor-attack-piano'}}]));
 assert.equal(api.getProjectState().project.tracks[5].soundWorld,'reactor');
 await api.applyOperations(request(api,[{op:'track.patch',trackIndex:5,values:{level:22}}]));
 assert.equal(api.getProjectState().project.tracks[5].soundWorld,'reactor');await api.undo();await api.redo();assert.equal(api.getProjectState().project.tracks[5].level,22);
 await api.applyOperations(request(api,[{op:'track.patch',trackIndex:5,values:{sound:'harp'}}]));
 assert.equal(api.getProjectState().project.tracks[5].soundWorld,undefined);assert.equal(api.getProjectState().project.tracks[5].instrument,'EMBER');
});
test('agent edits are opt-in; preview pure; apply and undo exact, manual edits conflict',async()=>{const {api,edit}=fixture(),before=api.getProjectState(),r=request(api,[{op:'track.patch',trackIndex:5,values:{steps:[0,2,4,6]}}]);assert.equal(api.previewOperations(r).after.tracks[5].steps.length,4);assert.deepEqual(api.getProjectState(),before);await assert.rejects(api.applyOperations(r),/DISABLED/);api.setEnabled(true);await api.applyOperations(r);await api.undo();assert.deepEqual(api.getProjectState().project,before.project);await api.redo();edit();await assert.rejects(api.undo(),/CONFLICT/);assert.throws(()=>api.previewOperations(r),/CONFLICT/)});
test('invalid batch never mutates; bounds, prototype keys and unknown commands rejected',()=>{const {api}=fixture(),before=api.getProjectState();for(const op of [{op:'track.patch',trackIndex:8,values:{}},{op:'master.patch',values:{tempo:201}},{op:'track.patch',trackIndex:0,values:JSON.parse('{"__proto__":{}}')},{op:'eval',code:'alert(1)'}])assert.equal(api.validateOperations(request(api,[{op:'master.patch',values:{masterVolume:25}},op])).valid,false);assert.deepEqual(api.getProjectState(),before)});
test('catalog is serializable and composition targeting preserves other phrases',async()=>{const {api}=fixture();JSON.stringify(api.getCapabilities());const p=api.getProjectState().project,c=song.build(p);api.setEnabled(true);await api.applyOperations(request(api,[{op:'composition.replace',project:c}]));const before=api.getProjectState().project,id=before.phrases[0].id;await api.applyOperations(request(api,[{op:'track.patch',phraseId:id,trackIndex:5,values:{level:12}},{op:'master.patch',values:{tempo:90}}]));const next=api.getProjectState().project;assert.equal(next.tempo,90);assert.equal(next.phrases[0].project.tracks[5].level,12);assert.deepEqual(next.sections,before.sections)});
test('unknown musical features cannot be silently discarded during validation',()=>{const {api}=fixture();for(const values of [{noteEvents:[{step:0,notes:[60],velocity:.9}]},{delayTime:'1/32'},{sequence:{length:16,swing:50}}]){const r=request(api,[{op:'track.patch',trackIndex:5,values}]);assert.equal(api.validateOperations(r).valid,false)}const next=api.getProjectState().project;next.timeSignature='5/4';assert.equal(api.validateOperations(request(api,[{op:'project.replace',project:next}])).valid,false);const valid34=JSON.parse(JSON.stringify(next));valid34.timeSignature='3/4';valid34.tracks.forEach(t=>t.steps=t.steps.filter(s=>s<48));assert.equal(api.validateOperations(request(api,[{op:'project.replace',project:valid34}])).valid,true)});
test('visual transaction bypasses audio loading even when input object keys are reordered',async()=>{const base=fixture().api.getProjectState().project;let writes=0,visual={scene:'ORBIT',motion:'DRIFT',effects:'COSMIC'};base.liveLoop={version:1,layerIds:[],settings:{delayTime:'1/8',level:75,bars:4,trimEnd:1,trimStart:0}};const api=Agent.create({project,song,sounds,read:()=>base,write:async()=>writes++,visual:()=>visual,writeVisual:v=>{visual=v}});api.setEnabled(true);await api.applyOperations(request(api,[{op:'visual.patch',values:{scene:'BLOOM'}}]));assert.equal(writes,0);assert.equal(visual.scene,'BLOOM');await api.undo();assert.equal(writes,0);assert.equal(visual.scene,'ORBIT')});

test('Redo accepts normalization performed by Undo but still rejects subsequent manual edits',async()=>{
 let value=fixture().api.getProjectState().project;
 const api=Agent.create({project,song,sounds,read:()=>value,write:async p=>{value=p;if(value.tempo===72)value.masterVolume=49}});
 api.setEnabled(true);await api.applyOperations(request(api,[{op:'master.patch',values:{tempo:96}}]));
 await api.undo();assert.equal(api.getProjectState().project.masterVolume,49);
 await api.redo();assert.equal(api.getProjectState().project.tempo,96);
 await api.undo();value.masterVolume=33;await assert.rejects(api.redo(),/CONFLICT/);
});

test('composition.replace tolerates top-level metadata, composition payload alias, and reports specific unknown fields',async()=>{
  const {api}=fixture();
  const p=api.getProjectState().project,c=song.build(p);
  // Add top-level metadata: setup, timeSignature, bars, title
  c.setup='ambient';
  c.timeSignature='4/4';
  c.bars=4;
  c.title='New Year Jingle';
  api.setEnabled(true);

  // Test payload alias: "composition" instead of "project"
  const req=request(api,[{op:'composition.replace',composition:c}]);
  const res=await api.applyOperations(req);
  assert.equal(res.project.format,'halo-composition');
  assert.equal(res.project.phrases.length,c.phrases.length);

  // Test specific unknown field error message
  c.unexpectedField='invalid';
  assert.throws(()=>api.previewOperations(request(api,[{op:'composition.replace',composition:c}])),/UNKNOWN_FIELD: unexpected field\(s\) \[unexpectedField\] in composition/);
});

test('resetProject resets to clean ambient state with startStep: 0, generator: 3, and passes project validation',async()=>{
  const {api}=fixture();
  const res=await api.resetProject();
  assert.equal(res.project.format,'notbad-halo-project');
  assert.equal(res.project.version,1);
  assert.equal(res.project.setup,'ambient');
  assert.equal(res.project.bars,4);
  assert.equal(res.project.startStep,0);
  assert.equal(res.project.tempo,72);
  assert.equal(res.project.tracks.length,8);

  // Validate the reset project using core validator
  const validated=project.validate(res.project,sounds);
  assert.equal(validated.startStep,0);
  for(const t of validated.tracks){
    assert.equal(t.generator,3);
    assert.equal(t.exact,false);
    assert.ok(t.role);
    assert.ok(t.sequence);
    assert.ok(Number.isFinite(t.level));
  }

  // Simulate snapshot / capture with startStep=0
  const captured=project.capture(validated.tracks,validated.bars,validated.tempo,validated.seed,validated.key,sounds,motion,validated.masterVolume,validated.mix,validated.startStep);
  assert.equal(captured.startStep,0);
});

test('resetProject resets revision counter so next request starts at revision 1',async()=>{
  const {api}=fixture();
  api.setEnabled(true);
  // Apply a couple operations to advance revision
  await api.applyOperations(request(api,[{op:'master.patch',values:{tempo:80}}]));
  await api.applyOperations(request(api,[{op:'master.patch',values:{tempo:84}}]));
  assert.ok(api.getProjectState().revision > 1);

  // Reset project
  await api.resetProject();
  assert.equal(api.getProjectState().revision, 1);

  // A request based on revision 1 should succeed cleanly
  const nextReq = { schemaVersion: 1, baseRevision: 1, operations: [{ op: 'master.patch', values: { tempo: 90 } }] };
  const res = await api.applyOperations(nextReq);
  assert.equal(res.project.tempo, 90);
  assert.equal(api.getProjectState().revision, 2);
});

test('project.patch and partial project.replace update top-level project settings gracefully',async()=>{
  const {api}=fixture();
  api.setEnabled(true);

  // Test project.patch
  const r1 = request(api, [{ op: 'project.patch', values: { tempo: 104, bars: 8 } }]);
  const res1 = await api.applyOperations(r1);
  assert.equal(res1.project.tempo, 104);
  assert.equal(res1.project.bars, 8);

  // Test partial project.replace with values object
  const r2 = request(api, [{ op: 'project.replace', values: { tempo: 110 } }]);
  const res2 = await api.applyOperations(r2);
  assert.equal(res2.project.tempo, 110);

  // Test partial project.replace with flat object omitting tracks
  const r3 = request(api, [{ op: 'project.replace', tempo: 95 }]);
  const res3 = await api.applyOperations(r3);
  assert.equal(res3.project.tempo, 95);
});

test('track.patch auto-promotes exact=true when steps or noteEvents are supplied, while explicit exact=false still requires exact=true check', async () => {
  const {api} = fixture();
  api.setEnabled(true);

  // 1. Passing steps without exact automatically sets exact=true and succeeds
  const r1 = request(api, [{ op: 'track.patch', trackIndex: 0, values: { generator: 3, sound: 'pulse', steps: [0, 4, 8, 12] } }]);
  const res1 = await api.applyOperations(r1);
  assert.equal(res1.project.tracks[0].exact, true);
  assert.deepEqual(res1.project.tracks[0].steps, [0, 4, 8, 12]);

  // 2. Passing explicit exact: false while modifying steps throws EXACT_REQUIRED
  const r2 = request(api, [{ op: 'track.patch', trackIndex: 0, values: { generator: 3, sound: 'pulse', steps: [2, 6, 10, 14], exact: false } }]);
  assert.throws(() => api.previewOperations(r2), /EXACT_REQUIRED: manual steps modification requires exact=true/);
});


