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
  assert.equal(caps.operations.length, 7);
  assert.ok(caps.operations.some(o => o.op === 'project.patch'));

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

test('File Bridge capabilities and music rules declare 15 phrases limit, sound worlds, and canonical form', () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);
  const caps = JSON.parse(files['capabilities.json']);
  const rules = JSON.parse(files['music-rules.json']);
  const guide = files['AGENT_GUIDE.md'];

  assert.equal(caps.limits.phrases, 15);
  assert.equal(rules.songFormAndComposition.limits.maxPhrases, 15);
  assert.equal(rules.songFormAndComposition.defaultMode, 'single_phrase');
  assert.ok(rules.songFormAndComposition.canonicalForm.some(s => s.name === 'intro'));
  assert.ok(rules.songFormAndComposition.canonicalForm.some(s => s.name === 'chorus'));

  assert.ok(rules.soundWorlds.ambient);
  assert.ok(rules.soundWorlds.reactor);
  assert.match(rules.soundWorlds.ambient.vibe, /Meditative/);
  assert.match(rules.soundWorlds.reactor.vibe, /Driving/);

  assert.match(guide, /AMBIENT vs REACTOR/);
  assert.match(guide, /MAXIMUM 15 UNIQUE PHRASES/);
  assert.match(guide, /Intro/);
  assert.match(guide, /Chorus/);
  assert.match(guide, /DEFAULT MODE: SINGLE PHRASE/);
});

test('File Bridge persists directory handle in IndexedDB across reloads', async () => {
  const {api} = createTestApp();

  // In-memory mock of indexedDB
  const storage = new Map();
  const mockIdb = {
    open(name, version) {
      const listeners = { success: [], error: [], upgradeneeded: [] };
      const req = {
        result: {
          objectStoreNames: { contains: (s) => true },
          createObjectStore: () => {},
          transaction(store, mode) {
            const txObj = {
              objectStore: (s) => ({
                put(val, key) { storage.set(key, val); },
                get(key) {
                  const getReq = { result: storage.get(key) };
                  setTimeout(() => getReq.onsuccess?.({ target: getReq }), 0);
                  return getReq;
                },
                delete(key) { storage.delete(key); }
              }),
              oncomplete: null,
              onerror: null
            };
            setTimeout(() => txObj.oncomplete?.(), 0);
            return txObj;
          }
        },
        set onsuccess(fn) { fn({ target: this }); },
        set onupgradeneeded(fn) { fn({ target: this }); }
      };
      return req;
    }
  };

  const mockHandle = {
    name: 'HALO-Bridge-Test',
    kind: 'directory',
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getDirectoryHandle: async (name) => ({
      kind: 'directory',
      name,
      entries: async function*() {}
    }),
    getFileHandle: async (name) => ({
      kind: 'file',
      name,
      createWritable: async () => ({
        write: async () => {},
        close: async () => {}
      })
    })
  };

  const fakeWin = { indexedDB: mockIdb, showDirectoryPicker: async () => mockHandle };
  const bridge1 = FileBridge.createBridge(api, { window: fakeWin });

  await bridge1.connect(mockHandle);
  assert.equal(bridge1.getStatus().connected, true);
  assert.equal(bridge1.getStatus().directoryName, 'HALO-Bridge-Test');
  assert.ok(storage.has('last-directory'));
  assert.equal(storage.get('last-directory').name, 'HALO-Bridge-Test');

  bridge1.dispose();

  // Simulate page reload: new bridge instance with the same fakeWin / IndexedDB
  const bridge2 = FileBridge.createBridge(api, { window: fakeWin });
  await bridge2.tryRestore();

  // Since queryPermission returned 'granted', it auto-reconnects!
  assert.equal(bridge2.getStatus().connected, true);
  assert.equal(bridge2.getStatus().directoryName, 'HALO-Bridge-Test');

  // Disconnecting clears the stored handle from IndexedDB
  await bridge2.disconnect();
  assert.equal(bridge2.getStatus().connected, false);
  assert.equal(storage.has('last-directory'), false);

  bridge2.dispose();
});

test('File Bridge gracefully handles and purges corrupt directory handles from IndexedDB', async () => {
  const {api} = createTestApp();
  const storage = new Map();
  // Simulate corrupt handle stored without method functions
  storage.set('last-directory', { name: 'Corrupt-Bridge', handle: { notAHandle: true } });

  const mockIdb = {
    open(name, version) {
      return {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction(store, mode) {
            const txObj = {
              objectStore: () => ({
                put(val, key) { storage.set(key, val); },
                get(key) {
                  const getReq = { result: storage.get(key) };
                  setTimeout(() => getReq.onsuccess?.({ target: getReq }), 0);
                  return getReq;
                },
                delete(key) { storage.delete(key); }
              }),
              oncomplete: null,
              onerror: null
            };
            setTimeout(() => txObj.oncomplete?.(), 0);
            return txObj;
          }
        },
        set onsuccess(fn) { fn({ target: this }); },
        set onupgradeneeded(fn) { fn({ target: this }); }
      };
    }
  };

  const fakeWin = { indexedDB: mockIdb };
  const bridge = FileBridge.createBridge(api, { window: fakeWin });

  await bridge.tryRestore();
  const st = bridge.getStatus();
  assert.equal(st.connected, false);
  assert.equal(st.savedDirectory, null);
  // Corrupt IDB record must be cleaned up
  assert.equal(storage.has('last-directory'), false);

  // Connecting an invalid object directly must fail cleanly without setting connected = true
  await bridge.connect({ notAHandle: true });
  assert.equal(bridge.getStatus().connected, false);
  assert.match(bridge.getStatus().error, /Invalid directory handle/);

  bridge.dispose();
});

test('processRequest applies full multi-phrase composition and switches world to reactor', async () => {
  const {api} = createTestApp();
  const initialRev = api.getProjectState().revision;

  const reactorTracks = Object.keys(S.banksFor('reactor')).map(name => ({
    ...S.roles.initial('reactor', name),
    name,
    setup: 'reactor',
    on: true,
    level: 50,
    density: 50,
    character: 50,
    duration: 50,
    space: 30,
    pattern: [0, 4, 8, 12]
  }));
  const phrase1 = P.capture(reactorTracks, 4, 100, 1, 0, S, M);
  const phrase2 = P.capture(reactorTracks, 4, 100, 2, 0, S, M);
  phrase2.tracks[0].steps = [0, 4, 8, 12];

  const fullSongRequest = {
    requestId: 'composition-001',
    schemaVersion: 1,
    baseRevision: initialRev,
    operations: [
      {
        op: 'composition.replace',
        project: {
          format: 'halo-composition',
          version: 1,
          tempo: 100,
          masterVolume: 50,
          mix: { low: 1, mid: 0, high: -1, width: 40 },
          repeat: true,
          phrases: [
            { id: 1, label: 'Intro', project: phrase1 },
            { id: 2, label: 'Chorus', project: phrase2 }
          ],
          sections: [
            { phrase: 1, name: 'intro', repeats: 1, fade: 'none' },
            { phrase: 2, name: 'chorus', repeats: 2, fade: 'none' },
            { phrase: 1, name: 'outro', repeats: 1, fade: 'out' }
          ]
        }
      }
    ]
  };

  const result = await FileBridge.processRequest(api, JSON.stringify(fullSongRequest), 'composition-001');
  assert.equal(result.ok, true);
  assert.equal(result.id, 'composition-001');
  assert.equal(result.appliedRevision, initialRev + 1);

  const updatedState = api.getProjectState();
  assert.equal(updatedState.project.format, 'halo-composition');
  assert.equal(updatedState.project.phrases.length, 2);
  assert.equal(updatedState.project.sections.length, 3);
  assert.equal(updatedState.project.tempo, 100);
  assert.equal(updatedState.project.phrases[0].project.setup, 'reactor');
});

test('project.replace supports halo-project alias, strips setup prefix on sounds, and defaults seed/key', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  // 8 tracks with "ambient-" sound prefix and format: "halo-project"
  const tracks = Object.keys(S.banks).map(name => {
    const init = S.roles.initial('ambient', name);
    return {
      name,
      instrument: init.instrument,
      generator: 3,
      sound: 'ambient-' + init.sound,
      on: true,
      exact: true,
      steps: [0, 4, 8, 12],
      level: 60,
      density: 50,
      character: 50,
      duration: 50,
      space: 30
    };
  });

  const req = {
    requestId: 'project-alias-001',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [
      {
        op: 'project.replace',
        project: {
          format: 'halo-project',
          version: 1,
          setup: 'ambient',
          bars: 8,
          tempo: 76,
          masterVolume: 55,
          tracks
        }
      }
    ]
  };

  const res = await FileBridge.processRequest(api, JSON.stringify(req), 'project-alias-001');
  assert.equal(res.ok, true);
  assert.equal(res.appliedRevision, rev + 1);

  const current = api.getProjectState().project;
  assert.equal(current.bars, 8);
  assert.equal(current.tempo, 76);
  assert.equal(current.tracks[0].sound, 'pulse'); // stripped "ambient-" prefix from "ambient-pulse"
  assert.equal(current.seed, 1); // defaulted
  assert.equal(current.key, 0); // defaulted
});

test('processRequest enriches errors with help and instructionForAgent, preventing blind retry loops', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  // Request with only 4 tracks instead of 8
  const badReq = {
    requestId: 'bad-req-001',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [
      {
        op: 'project.replace',
        project: {
          format: 'halo-project',
          version: 1,
          setup: 'ambient',
          bars: 8,
          tempo: 76,
          tracks: [
            { name: 'GLASS', sound: 'bell', on: true, steps: [0] },
            { name: 'ROOT', sound: 'round', on: true, steps: [0] }
          ]
        }
      }
    ]
  };

  const res = await FileBridge.processRequest(api, JSON.stringify(badReq), 'bad-req-001');
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('INVALID_TRACKS_COUNT'));
  assert.ok(res.help.includes('requires all 8 tracks'));
  assert.ok(res.instructionForAgent.includes('Maximum 2 retry attempts allowed'));
});

test('AGENT_GUIDE.md and music-rules.json contain no Cyrillic characters (100% English AI instructions)', () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);
  const cyrillicRegex = /[А-Яа-яЁё]/;

  assert.equal(cyrillicRegex.test(files['AGENT_GUIDE.md']), false, 'AGENT_GUIDE.md must not contain Cyrillic characters');
  assert.equal(cyrillicRegex.test(files['music-rules.json']), false, 'music-rules.json must not contain Cyrillic characters');

  // Verify Zero Localhost, Zero CLI, and 5-Second Verification Loop directives
  assert.ok(files['AGENT_GUIDE.md'].includes('NO LOCALHOST, NO WEBSERVERS, NO PORTS'));
  assert.ok(files['AGENT_GUIDE.md'].includes('NO CLI OR EXECUTABLES'));
  assert.ok(files['AGENT_GUIDE.md'].includes('5-SECOND ERROR VERIFICATION vs HUMAN APPROVAL'));
  assert.ok(files['AGENT_GUIDE.md'].includes('Strict 4-Step Agent Workflow & Verification Protocol'));
  assert.ok(files['AGENT_GUIDE.md'].includes('5-Second Verification & Self-Correction'));

  // All 5 files must be 100% English
  for (const filename of ['AGENT_GUIDE.md', 'capabilities.json', 'instruments.json', 'music-rules.json', 'project-state.json']) {
    assert.equal(cyrillicRegex.test(files[filename]), false, `${filename} must not contain Cyrillic characters`);
  }
});

test('Context files contain mutual cross-references and explicit read-only vs mutable field specifications', async () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);

  const caps = JSON.parse(files['capabilities.json']);
  const inst = JSON.parse(files['instruments.json']);
  const rules = JSON.parse(files['music-rules.json']);
  const state = JSON.parse(files['project-state.json']);
  const guide = files['AGENT_GUIDE.md'];

  // 1. Cross-references across all JSON files
  for (const doc of [caps, inst, rules, state]) {
    assert.ok(doc.references, 'Every JSON file must have references object');
    assert.ok(doc.references.agentGuide);
    assert.ok(doc.references.capabilities || doc.references.musicRules);
  }

  // 2. Capabilities fieldAccess & readOnlyProhibited
  assert.ok(caps.fieldAccess?.trackPatch?.readOnlyProhibited?.includes('role'));
  assert.ok(caps.fieldAccess?.trackPatch?.readOnlyProhibited?.includes('name'));
  const trackPatchOp = caps.operations.find(o => o.op === 'track.patch');
  assert.ok(trackPatchOp.readOnlyProhibited.includes('role'));
  assert.ok(trackPatchOp.readOnlyProhibited.includes('name'));

  // 3. Instruments trackPatchRules
  assert.ok(inst.trackPatchRules?.readOnlyProhibitedFields?.includes('role'));
  assert.ok(inst.tracks[0].trackPatchRule);

  // 4. Project state notice and fieldAccess
  assert.ok(state.notice.includes('READ-ONLY'));
  assert.ok(state.fieldAccess.readOnlyFields.includes('track.role'));
  assert.ok(state.fieldAccess.readOnlyFields.includes('track.name'));

  // 5. AGENT_GUIDE.md contains Context Map, Read-Only directive and 8 Voice table
  assert.ok(guide.includes('Context Files Map & Documentation Architecture'));
  assert.ok(guide.includes('CRITICAL DIRECTIVE: Read-Only vs Mutable Fields'));
  assert.ok(guide.includes('STRICTLY PROHIBITED IN `values`'));
  assert.ok(guide.includes('8 Voice Slots & Role Polyphony Architecture'));

  // 6. Error guidance for UNKNOWN_FIELD with role/name
  const badReq = {
    requestId: 'bad-track-patch',
    schemaVersion: 1,
    baseRevision: api.getProjectState().revision,
    operations: [
      {
        op: 'track.patch',
        trackIndex: 0,
        values: {
          role: 'bell',
          sound: 'bell'
        }
      }
    ]
  };
  const res = await FileBridge.processRequest(api, JSON.stringify(badReq), 'bad-track-patch');
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('UNKNOWN_FIELD'));
  assert.ok(res.help.includes('read-only slot identifiers'));
  assert.ok(res.help.includes('Remove "role" and "name" from values'));
});

test('resetLocalChanges clears requests/responses without wiping project or localStorage', async () => {
  let project = P.capture(Object.keys(S.banks).map(name=>({...S.roles.initial('ambient',name),name,setup:'ambient',on:true,level:50,density:50,character:50,duration:50,space:30,pattern:[0,4,8,12]})),4,72,1,0,S,M);
  let toastMsg = '';
  const fakeWin = {
    toast: msg => { toastMsg = msg; },
    localStorage: {
      items: { 'halo-pattern-v1': 'dirty', 'notbad-halo-autosave-v1': 'dirty', 'halo-composition-v1': 'dirty' },
      removeItem(key){ delete this.items[key]; }
    }
  };

  const api = Agent.create({
    project: P,
    song: Song,
    sounds: S,
    composition: C,
    read: () => project,
    write: async p => { project = p; },
    playback: async () => {}
  });

  // Mutate project away from default
  api.setEnabled(true);
  await api.applyOperations({
    schemaVersion: 1,
    baseRevision: api.getProjectState().revision,
    operations: [
      { op: 'master.patch', values: { tempo: 135 } }
    ]
  });
  assert.equal(api.getProjectState().project.tempo, 135);

  // Fake filesystem
  const reqFiles = new Map([['req-1.json', '{}']]);
  const resFiles = new Map([['req-1.result.json', '{}']]);
  const rootFiles = new Map();

  function makeDir(map){
    return {
      kind: 'directory',
      async getFileHandle(name, opts){
        return {
          async createWritable(){
            return {
              async write(c){ map.set(name, c); },
              async close(){}
            };
          }
        };
      },
      async removeEntry(name){
        map.delete(name);
      },
      async *entries(){
        for (const [k, v] of Array.from(map.entries())){
          yield [k, { kind: 'file', getFile: async () => ({ text: async () => v }) }];
        }
      }
    };
  }

  const fakeDirHandle = {
    name: 'test-folder',
    async getDirectoryHandle(name, opts){
      if (name === 'requests') return makeDir(reqFiles);
      if (name === 'responses') return makeDir(resFiles);
      throw Error('Unknown dir');
    },
    async getFileHandle(name, opts){
      return {
        async createWritable(){
          return {
            async write(c){ rootFiles.set(name, c); },
            async close(){}
          };
        }
      };
    }
  };

  const bridge = FileBridge.createBridge(api, { window: fakeWin });
  await bridge.connect(fakeDirHandle);

  assert.equal(reqFiles.size, 1);
  assert.equal(resFiles.size, 1);

  await bridge.resetLocalChanges('ru');

  // Verify requests and responses emptied
  assert.equal(reqFiles.size, 0);
  assert.equal(resFiles.size, 0);

  // Verify localStorage was NOT cleared (user project is preserved)
  assert.equal(fakeWin.localStorage.items['halo-pattern-v1'], 'dirty');
  assert.equal(fakeWin.localStorage.items['notbad-halo-autosave-v1'], 'dirty');

  // Verify project in browser remains intact at 135 bpm (NOT reset to 72)
  assert.equal(api.getProjectState().project.tempo, 135);

  // Verify toast indicates folder cleaned and current project re-synced
  assert.ok(toastMsg.includes('Папка очищена'));

  // Verify context files updated with current 135 bpm project
  assert.ok(rootFiles.has('project-state.json'));
  assert.equal(JSON.parse(rootFiles.get('project-state.json')).project.tempo, 135);
  assert.ok(rootFiles.has('AGENT_GUIDE.md'));

  await bridge.disconnect();
});

test('instruments.json exposes vibeAndSetupPolicy, soundsBySetup, and multi-setup sound metadata', () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);
  const inst = JSON.parse(files['instruments.json']);

  assert.ok(inst.vibeAndSetupPolicy, 'vibeAndSetupPolicy must be present');
  assert.ok(inst.vibeAndSetupPolicy.ambient);
  assert.ok(inst.vibeAndSetupPolicy.reactor);
  assert.ok(inst.vibeAndSetupPolicy.rule);

  for (const track of inst.tracks) {
    assert.ok(track.soundsBySetup, `track ${track.slot} must have soundsBySetup`);
    assert.ok(Array.isArray(track.soundsBySetup.ambient), `ambient sounds array required for ${track.slot}`);
    assert.ok(Array.isArray(track.soundsBySetup.reactor), `reactor sounds array required for ${track.slot}`);
    for (const s of track.compatibleSounds) {
      assert.ok(Array.isArray(s.setups), `sound ${s.sound} must have setups array`);
      assert.ok(s.canonicalId, `sound ${s.sound} must have canonicalId`);
    }
  }
});

test('request modification after error triggers re-validation, clears error, and sets pending', async () => {
  const {api} = createTestApp();
  const reqFiles = new Map();
  const resFiles = new Map();
  const rootFiles = new Map();

  function makeDir(map){
    return {
      async getFileHandle(name, opts){
        return {
          async getFile(){
            if (!map.has(name)) throw Error('File not found');
            return { text: async () => map.get(name) };
          },
          async createWritable(){
            return {
              async write(c){ map.set(name, c); },
              async close(){}
            };
          }
        };
      },
      async removeEntry(name){
        map.delete(name);
      },
      async *entries(){
        for (const [k, v] of Array.from(map.entries())){
          yield [k, { kind: 'file', getFile: async () => ({ text: async () => v }) }];
        }
      }
    };
  }

  const fakeDirHandle = {
    name: 'test-folder',
    async getDirectoryHandle(name, opts){
      if (name === 'requests') return makeDir(reqFiles);
      if (name === 'responses') return makeDir(resFiles);
      throw Error('Unknown dir');
    },
    async getFileHandle(name, opts){
      return {
        async createWritable(){
          return {
            async write(c){ rootFiles.set(name, c); },
            async close(){}
          };
        }
      };
    }
  };

  const bridge = FileBridge.createBridge(api, { pollInterval: 0 });
  await bridge.connect(fakeDirHandle);

  const initialRev = api.getProjectState().revision;

  // Step 1: Agent writes an invalid request (reactor sound in ambient setup)
  const invalidReq = {
    requestId: 'req-holiday',
    schemaVersion: 1,
    baseRevision: initialRev,
    operations: [
      {
        op: 'project.replace',
        project: {
          format: 'halo-project',
          version: 1,
          setup: 'ambient',
          bars: 4,
          tempo: 80,
          tracks: [
            { name: 'GLASS', instrument: 'GLASS', generator: 3, sound: 'reactor-dry-kick', on: true, exact: true, steps: [0, 4, 8, 12], level: 70, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'TIDAL', instrument: 'TIDAL', generator: 3, sound: 'air', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'ROOT', instrument: 'ROOT', generator: 3, sound: 'round', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'EMBER', instrument: 'EMBER', generator: 3, sound: 'string', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'RAIN', instrument: 'RAIN', generator: 3, sound: 'shaker', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'VEIL', instrument: 'VEIL', generator: 3, sound: 'bow', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'MOSS', instrument: 'MOSS', generator: 3, sound: 'marimba', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'AURA', instrument: 'AURA', generator: 3, sound: 'wind', on: true, exact: true, steps: [0], level: 50, density: 50, character: 50, duration: 50, space: 30 }
          ]
        }
      }
    ]
  };

  reqFiles.set('req-holiday.json', JSON.stringify(invalidReq));
  await bridge.checkFolder();

  // Verify error response written and help instructs how to switch setup
  assert.ok(resFiles.has('req-holiday.result.json'));
  const errRes = JSON.parse(resFiles.get('req-holiday.result.json'));
  assert.equal(errRes.ok, false);
  assert.ok(errRes.error.includes('INVALID_SOUND'));
  assert.ok(errRes.help.includes('REACTOR') || errRes.help.includes('reactor'));
  assert.ok(errRes.instructionForAgent.includes('ACTION REQUIRED'));
  assert.equal(bridge.getStatus().pending, null);

  // Step 2: Agent follows error guidance and fixes request by switching world to reactor
  const validReq = {
    requestId: 'req-holiday',
    schemaVersion: 1,
    baseRevision: initialRev,
    operations: [
      {
        op: 'project.replace',
        project: {
          format: 'halo-project',
          version: 1,
          world: 'reactor',
          bars: 4,
          tempo: 96,
          tracks: [
            { name: 'GLASS', instrument: 'GLASS', generator: 3, sound: 'dry-kick', on: true, exact: true, steps: [0, 4, 8, 12], level: 70, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'TIDAL', instrument: 'TIDAL', generator: 3, sound: 'dry-snare', on: true, exact: true, steps: [4, 12], level: 70, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'ROOT', instrument: 'ROOT', generator: 3, sound: 'tight-hat', on: true, exact: true, steps: [0, 2, 4, 6, 8, 10, 12, 14], level: 60, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'EMBER', instrument: 'EMBER', generator: 3, sound: 'floor-tom', on: true, exact: true, steps: [10, 14], level: 65, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'RAIN', instrument: 'RAIN', generator: 3, sound: 'pick-bass', on: true, exact: true, steps: [0, 3, 6, 8, 10, 14], level: 75, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'VEIL', instrument: 'VEIL', generator: 3, sound: 'palm-guitar', on: true, exact: true, steps: [0, 3, 6, 8, 10, 14], level: 70, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'MOSS', instrument: 'MOSS', generator: 3, sound: 'singing-lead', on: true, exact: true, steps: [2, 7, 11], level: 70, density: 50, character: 50, duration: 50, space: 30 },
            { name: 'AURA', instrument: 'AURA', generator: 3, sound: 'attack-piano', on: true, exact: true, steps: [0, 4, 8, 12], level: 70, density: 50, character: 50, duration: 50, space: 30 }
          ]
        }
      }
    ]
  };

  reqFiles.set('req-holiday.json', JSON.stringify(validReq));
  await bridge.checkFolder();

  // Verify stale error removed, state.error cleared, and pending set
  assert.equal(resFiles.has('req-holiday.result.json'), false, 'Stale error response must be removed on valid retry');
  assert.equal(bridge.getStatus().error, null);
  assert.ok(bridge.getStatus().pending, 'Pending proposal must be awaiting user approval');
  assert.equal(bridge.getStatus().pending.id, 'req-holiday');

  // Step 3: User approves proposal
  await bridge.applyPending();
  assert.equal(bridge.getStatus().pending, null);
  assert.ok(resFiles.has('req-holiday.result.json'));
  const okRes = JSON.parse(resFiles.get('req-holiday.result.json'));
  assert.equal(okRes.ok, true);
  assert.equal(okRes.appliedRevision, initialRev + 1);
  assert.equal(api.getProjectState().project.setup, 'reactor');
  assert.equal(api.getProjectState().project.tempo, 96);

  await bridge.disconnect();
});

test('File Bridge continuously auto-syncs project-state.json and auto-rebases requests based on stale revision', async () => {
  const {api} = createTestApp();
  const rootFiles = new Map();
  const reqFiles = new Map();
  const resFiles = new Map();

  function makeDir(map){
    return {
      async *values(){
        for (const [name, content] of map.entries()){
          yield {
            name,
            kind: 'file',
            async getFile(){
              return {
                lastModified: Date.now(),
                async text(){ return content; }
              };
            }
          };
        }
      },
      async getFileHandle(name, opts){
        return {
          async getFile(){
            return {
              lastModified: Date.now(),
              async text(){ return map.get(name) || ''; }
            };
          },
          async createWritable(){
            return {
              async write(c){ map.set(name, c); },
              async close(){}
            };
          }
        };
      },
      async removeEntry(name){
        map.delete(name);
      },
      async *entries(){
        for (const [k, v] of Array.from(map.entries())){
          yield [k, { kind: 'file', getFile: async () => ({ text: async () => v }) }];
        }
      }
    };
  }

  const fakeDirHandle = {
    name: 'HALO-Bridge',
    async getDirectoryHandle(name, opts){
      if (name === 'requests') return makeDir(reqFiles);
      if (name === 'responses') return makeDir(resFiles);
      throw Error('Unknown dir');
    },
    async getFileHandle(name, opts){
      return {
        async getFile(){
          return {
            lastModified: Date.now(),
            async text(){ return rootFiles.get(name) || ''; }
          };
        },
        async createWritable(){
          return {
            async write(c){ rootFiles.set(name, c); },
            async close(){}
          };
        }
      };
    }
  };

  const bridge = FileBridge.createBridge(api, { pollInterval: 0 });
  await bridge.connect(fakeDirHandle);

  const initialRev = api.getProjectState().revision;
  const initialPassport = JSON.parse(rootFiles.get('project-state.json'));
  assert.equal(initialPassport.revision, initialRev);

  // 1. In-memory project changes (e.g. user changes tempo or volume in UI) -> revision increments
  api.setEnabled(true);
  await api.applyOperations({
    requestId: 'change-tempo',
    schemaVersion: 1,
    baseRevision: initialRev,
    operations: [{ op: 'master.patch', values: { tempo: 85 } }]
  });
  const updatedRev = api.getProjectState().revision;
  assert.equal(updatedRev, initialRev + 1);

  // Before checkFolder, disk passport is still initialRev
  assert.equal(JSON.parse(rootFiles.get('project-state.json')).revision, initialRev);

  // checkFolder() runs: continuous auto-sync immediately writes the new revision to disk
  await bridge.checkFolder();
  const autoSyncedPassport = JSON.parse(rootFiles.get('project-state.json'));
  assert.equal(autoSyncedPassport.revision, updatedRev, 'project-state.json must be auto-synced to disk on revision change');
  assert.equal(autoSyncedPassport.project.tempo, 85);

  // 2. An agent writes a request that was composed based on the OLD initialRev (baseRevision: initialRev)
  const staleRequest = {
    requestId: 'req-stale-001',
    schemaVersion: 1,
    baseRevision: initialRev, // stale! current is updatedRev
    operations: [
      {
        op: 'track.patch',
        trackIndex: 3,
        values: { character: 75, duration: 60 }
      }
    ]
  };
  reqFiles.set('req-stale-001.json', JSON.stringify(staleRequest));

  // Without allowRebase, parseAndValidateRequest strictly rejects with CONFLICT_REVISION_MISMATCH
  const strictCheck = FileBridge.parseAndValidateRequest(api, JSON.stringify(staleRequest), 'req-stale-001');
  assert.equal(strictCheck.ok, false);
  assert.match(strictCheck.error, /CONFLICT_REVISION_MISMATCH/);

  // With allowRebase: true, parseAndValidateRequest rebases cleanly
  const rebaseCheck = FileBridge.parseAndValidateRequest(api, JSON.stringify(staleRequest), 'req-stale-001', { allowRebase: true });
  assert.equal(rebaseCheck.ok, true);
  assert.equal(rebaseCheck.rebased, true);
  assert.equal(rebaseCheck.originalBaseRevision, initialRev);
  assert.equal(rebaseCheck.currentRevision, updatedRev);

  // 3. checkFolder() handles the stale request: automatically rebases it and sets it as pending
  await bridge.checkFolder();
  const status = bridge.getStatus();
  assert.equal(status.error, null, 'No error should be thrown on clean auto-rebase');
  assert.ok(status.pending, 'Pending proposal must be awaiting approval');
  assert.equal(status.pending.id, 'req-stale-001');
  assert.equal(status.pending.rebased, true);
  assert.equal(status.pending.originalBaseRevision, initialRev);

  // 4. User approves the rebased request
  await bridge.applyPending();
  assert.equal(bridge.getStatus().pending, null);
  assert.ok(resFiles.has('req-stale-001.result.json'));
  const okRes = JSON.parse(resFiles.get('req-stale-001.result.json'));
  assert.equal(okRes.ok, true);
  assert.equal(okRes.appliedRevision, updatedRev + 1);
  assert.equal(okRes.rebasedFrom, initialRev);
  assert.equal(api.getProjectState().project.tracks[3].character, 75);

  // 5. Test rebaseAndRetry() clears errors and triggers re-evaluation
  bridge.getStatus().error = { message: 'Temporary error' };
  await bridge.rebaseAndRetry();
  assert.equal(bridge.getStatus().error, null);

  await bridge.disconnect();
});

test('File Bridge validates and accepts track.patch with custom steps omitting exact=true', () => {
  const {api} = createTestApp();
  const requestPayload = {
    requestId: 'req-jingle-test',
    schemaVersion: 1,
    baseRevision: api.getProjectState().revision,
    operations: [
      {
        op: 'project.patch',
        values: { tempo: 96, bars: 8 }
      },
      {
        op: 'track.patch',
        trackIndex: 0,
        values: {
          steps: [0, 4, 8, 12],
          level: 60
        }
      }
    ]
  };

  const check = FileBridge.parseAndValidateRequest(api, JSON.stringify(requestPayload), 'req-jingle-test');
  assert.equal(check.ok, true);
  assert.equal(check.preview.after.tracks[0].exact, true);
  assert.deepEqual(check.preview.after.tracks[0].steps, [0, 4, 8, 12]);
});

test('File Bridge auto-aligns startStep to phrase boundaries when bars changes', () => {
  const {api, getProject} = createTestApp();
  getProject().startStep = 64;
  getProject().bars = 4;

  const requestPayload = {
    requestId: 'req-bars-align',
    schemaVersion: 1,
    baseRevision: api.getProjectState().revision,
    operations: [
      {
        op: 'project.patch',
        values: { bars: 8 }
      }
    ]
  };

  const check = FileBridge.parseAndValidateRequest(api, JSON.stringify(requestPayload), 'req-bars-align');
  assert.equal(check.ok, true);
  assert.equal(check.preview.after.bars, 8);
  assert.equal(check.preview.after.startStep, 0);
});


