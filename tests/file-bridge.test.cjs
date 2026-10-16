const test=require('node:test'),assert=require('node:assert/strict');
const FileBridge=require('../src/file-bridge.js'),Agent=require('../src/agent.js'),P=require('../src/project.js'),Song=require('../src/song.js'),S=require('../src/sounds.js'),M=require('../src/motion.js'),C=require('../src/composition.js');

function createTestApp(){
  let project=P.capture(Object.keys(S.banks).map(name=>({...S.roles.initial('ambient',name),name,setup:'ambient',on:true,level:50,density:50,character:50,duration:50,space:30,pattern:[0,4,8,12]})),4,72,1,0,S,M);
  let playing=false;
  const api=Agent.create({
    project:P,
    song:Song,
    sounds:S,
    composition:C,
    read:()=>project,
    write:async p=>{project=p},
    playback:async on=>{playing=on;return {playing}}
  });
  return {api,getProject:()=>project};
}

test('File Bridge exports all 5 context files with synchronized engine capabilities', () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);

  assert.ok(files['AGENT_GUIDE.md']);
  assert.ok(files['capabilities.json']);
  assert.ok(files['instruments.json']);
  assert.ok(files['music-rules.json']);
  assert.ok(files['project-state.json']);

  // capabilities.json
  const caps = JSON.parse(files['capabilities.json']);
  assert.equal(caps.schemaVersion, 1);
  assert.equal(caps.engine, 'NotBad Halo Music Constructor');
  assert.equal(caps.limits.tracks, 8);
  assert.equal(caps.limits.bpm[0], 30);
  assert.equal(caps.limits.bpm[1], 200);
  assert.equal(caps.operations.length, 6);

  // instruments.json
  const inst = JSON.parse(files['instruments.json']);
  assert.equal(inst.schemaVersion, 1);
  assert.equal(inst.tracks.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.equal(inst.tracks[i].trackIndex, i);
    assert.ok(inst.tracks[i].role);
    assert.ok(inst.tracks[i].noteRange);
    assert.deepEqual(inst.tracks[i].allowedBanks, ['ambient', 'reactor']);
  }
  assert.ok(inst.parameterGlossary.character);
  assert.ok(inst.parameterGlossary.duration);
  assert.ok(inst.parameterGlossary.space);
  assert.ok(inst.parameterGlossary.delay);
  assert.ok(inst.soundWorlds.ambient);
  assert.ok(inst.soundWorlds.reactor);

  // music-rules.json
  const rules = JSON.parse(files['music-rules.json']);
  assert.equal(rules.schemaVersion, 1);
  assert.equal(rules.timeSignature, '4/4');
  assert.equal(rules.grid.stepsPerBar, 16);
  assert.deepEqual(rules.grid.quarterNotes, [0, 4, 8, 12]);
  assert.deepEqual(rules.grid.eighthNotes, [0, 2, 4, 6, 8, 10, 12, 14]);
  assert.equal(rules.keysAndScales.circleOfFifths.length, 24);
  assert.deepEqual(rules.keysAndScales.scales.minor, [0, 2, 3, 5, 7, 8, 10]);
  assert.deepEqual(rules.keysAndScales.scales.major, [0, 2, 4, 5, 7, 9, 11]);

  // project-state.json
  const state = JSON.parse(files['project-state.json']);
  assert.equal(state.schemaVersion, 1);
  assert.equal(typeof state.revision, 'number');
  assert.equal(state.project.tracks.length, 8);
  assert.ok(state.music.length > 0);

  // AGENT_GUIDE.md
  assert.match(files['AGENT_GUIDE.md'], /HALO Agent Guide/);
  assert.match(files['AGENT_GUIDE.md'], /project-state\.json/);
  assert.match(files['AGENT_GUIDE.md'], /requests\//);
  assert.match(files['AGENT_GUIDE.md'], /responses\//);
});

test('parseAndValidateRequest enforces requestId, schemaVersion, baseRevision and allowlisted operations', () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  // Missing requestId fallback
  const validReq = {
    requestId: 'req-001',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [
      {
        op: 'track.patch',
        trackIndex: 5,
        values: { space: 70 }
      }
    ]
  };
  const v1 = FileBridge.parseAndValidateRequest(api, JSON.stringify(validReq), 'fallback');
  assert.equal(v1.ok, true);
  assert.equal(v1.id, 'req-001');

  // Wrong schemaVersion
  const badSchema = {...validReq, schemaVersion: 2};
  const v2 = FileBridge.parseAndValidateRequest(api, JSON.stringify(badSchema), 'req-001');
  assert.equal(v2.ok, false);
  assert.match(v2.error, /INVALID_SCHEMA_VERSION/);

  // Missing baseRevision
  const noRev = {...validReq, baseRevision: undefined};
  delete noRev.baseRevision;
  const v3 = FileBridge.parseAndValidateRequest(api, JSON.stringify(noRev), 'req-001');
  assert.equal(v3.ok, false);
  assert.match(v3.error, /MISSING_BASE_REVISION/);

  // Stale baseRevision
  const staleRev = {...validReq, baseRevision: rev + 10};
  const v4 = FileBridge.parseAndValidateRequest(api, JSON.stringify(staleRev), 'req-001');
  assert.equal(v4.ok, false);
  assert.match(v4.error, /CONFLICT_REVISION_MISMATCH/);

  // Disallowed operation / script injection attempt
  const maliciousReq = {
    requestId: 'hack-001',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [
      {
        op: 'eval',
        code: 'process.exit(1)'
      }
    ]
  };
  const v5 = FileBridge.parseAndValidateRequest(api, JSON.stringify(maliciousReq), 'hack-001');
  assert.equal(v5.ok, false);
  assert.match(v5.error, /UNKNOWN_OPERATION/);
});

test('processRequest applies valid operations and increments project revision', async () => {
  const {api} = createTestApp();
  const initialRev = api.getProjectState().revision;

  const request = {
    requestId: 'jingle-001',
    schemaVersion: 1,
    baseRevision: initialRev,
    operations: [
      {
        op: 'track.patch',
        trackIndex: 5,
        values: {
          exact: true,
          steps: [0, 4, 8, 12],
          noteEvents: [
            { step: 0, notes: [72] },
            { step: 4, notes: [76] },
            { step: 8, notes: [79] },
            { step: 12, notes: [84] }
          ],
          character: 68
        }
      },
      {
        op: 'master.patch',
        values: { tempo: 112 }
      }
    ]
  };

  const result = await FileBridge.processRequest(api, JSON.stringify(request), 'jingle-001');
  assert.equal(result.ok, true);
  assert.equal(result.id, 'jingle-001');
  assert.equal(result.appliedRevision, initialRev + 1);
  assert.equal(api.getProjectState().project.tempo, 112);
  assert.deepEqual(api.getProjectState().project.tracks[5].steps, [0, 4, 8, 12]);

  // Idempotency / Stale revision check: re-applying same request must fail with CONFLICT_REVISION_MISMATCH
  const retryResult = await FileBridge.processRequest(api, JSON.stringify(request), 'jingle-001');
  assert.equal(retryResult.ok, false);
  assert.match(retryResult.error, /CONFLICT_REVISION_MISMATCH/);
});
