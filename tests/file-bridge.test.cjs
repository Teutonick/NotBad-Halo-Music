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
  assert.equal(inst.schemaVersion, 2);
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
  assert.ok(files['AGENT_GUIDE.md'].includes('pending_approval'));
  assert.ok(files['AGENT_GUIDE.md'].includes('No response means UNCONFIRMED'));
  assert.ok(files['AGENT_GUIDE.md'].includes('Strict 4-Step Agent Workflow & Verification Protocol'));
  assert.ok(files['AGENT_GUIDE.md'].includes('manifest.json LAST'));

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
    for (const id of track.compatibleSounds) {
      const s = inst.sounds.find(sound => sound.id === id);
      assert.ok(s, 'Every role sound reference resolves');
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
  assert.equal(JSON.parse(resFiles.get('req-holiday.result.json')).status, 'pending_approval', 'Valid retry replaces the error with an explicit acknowledgement');
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

test('AGENT_GUIDE.md provides zero-prompt directives and canonical recipes validate cleanly', async () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);
  const guide = files['AGENT_GUIDE.md'];
  const rules = JSON.parse(files['music-rules.json']);

  // Guide assertions
  assert.ok(guide.includes('ZERO-PROMPT-ENGINEERING CREATIVE DIRECTIVE'));
  assert.ok(guide.includes('Quick Prompt-to-Architecture Decision Matrix'));
  assert.ok(guide.includes('THE FULL-SPAN DURATION PRINCIPLE (MANDATORY MUSICAL INTEGRITY)'));
  assert.ok(guide.includes('RECIPE A: Holiday / New Year 8-Bar Jingle'));
  assert.ok(guide.includes('RECIPE B: Epic Cinematic Soundtrack / Pirates of the Caribbean'));

  // Music rules assertions
  assert.ok(rules.grid.fullPhraseCoverageWarning);
  assert.ok(rules.compositionGuidelines.fullPhraseCoverageRule);

  // Validate Recipe A (Holiday Jingle 8-bar loop)
  const jinglePayload = {
    requestId: 'test-recipe-a-jingle',
    schemaVersion: 1,
    baseRevision: api.getProjectState().revision,
    operations: [
      {
        op: 'project.patch',
        values: { tempo: 96, bars: 8, key: 0 }
      },
      {
        op: 'track.patch',
        trackIndex: 5,
        values: {
          sound: 'bell',
          character: 75,
          steps: [0, 4, 8, 16, 20, 24, 32, 36, 40, 44, 48, 64, 68, 72, 76, 80, 84, 88, 96, 100, 104, 108, 112],
          noteEvents: [
            { step: 0, notes: [64] }, { step: 4, notes: [64] }, { step: 8, notes: [64] },
            { step: 16, notes: [64] }, { step: 20, notes: [64] }, { step: 24, notes: [64] },
            { step: 32, notes: [64] }, { step: 36, notes: [67] }, { step: 40, notes: [60] },
            { step: 44, notes: [62] }, { step: 48, notes: [64] },
            { step: 64, notes: [65] }, { step: 68, notes: [65] }, { step: 72, notes: [65] },
            { step: 76, notes: [65] }, { step: 80, notes: [65] }, { step: 84, notes: [64] },
            { step: 88, notes: [64] },
            { step: 96, notes: [67] }, { step: 100, notes: [67] }, { step: 104, notes: [65] },
            { step: 108, notes: [62] }, { step: 112, notes: [60] }
          ]
        }
      },
      {
        op: 'track.patch',
        trackIndex: 4,
        values: {
          sound: 'round',
          steps: [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120],
          noteEvents: [
            { step: 0, notes: [36] }, { step: 8, notes: [36] }, { step: 16, notes: [36] }, { step: 24, notes: [36] },
            { step: 32, notes: [36] }, { step: 40, notes: [36] }, { step: 48, notes: [36] }, { step: 56, notes: [36] },
            { step: 64, notes: [41] }, { step: 72, notes: [41] }, { step: 80, notes: [36] }, { step: 88, notes: [36] },
            { step: 96, notes: [43] }, { step: 104, notes: [43] }, { step: 112, notes: [36] }, { step: 120, notes: [36] }
          ]
        }
      }
    ]
  };
  const jingleCheck = FileBridge.parseAndValidateRequest(api, JSON.stringify(jinglePayload), 'test-recipe-a-jingle');
  assert.equal(jingleCheck.ok, true);
  assert.equal(jingleCheck.preview.after.bars, 8);
  assert.equal(jingleCheck.preview.after.tracks[5].exact, true);
  assert.equal(jingleCheck.preview.after.tracks[5].steps.length, 23);
  assert.equal(jingleCheck.preview.after.tracks[5].steps[22], 112);

  // Validate Recipe B (Pirates of the Caribbean composition with 3/4 6/8 pirate swing)
  const defaultTracks = [
    { name: 'GLASS', instrument: 'GLASS', generator: 3, sound: 'dry-kick', on: true, level: 70, density: 50, character: 50, duration: 50, space: 15, steps: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90] },
    { name: 'TIDAL', instrument: 'TIDAL', generator: 3, sound: 'dry-snare', on: true, level: 65, density: 50, character: 50, duration: 50, space: 20, steps: [6, 18, 30, 42, 54, 66, 78, 90] },
    { name: 'ROOT', instrument: 'ROOT', generator: 3, sound: 'tight-hat', on: true, level: 55, density: 50, character: 50, duration: 50, space: 10, steps: [0, 2, 4, 6, 8, 10] },
    { name: 'EMBER', instrument: 'EMBER', generator: 3, sound: 'war-tom', on: true, level: 60, density: 50, character: 50, duration: 50, space: 25, steps: [0, 12, 24, 36, 48, 60, 72, 84] },
    { name: 'RAIN', instrument: 'RAIN', generator: 3, sound: 'pick-bass', on: true, level: 70, density: 50, character: 50, duration: 50, space: 10, steps: [0, 6, 12, 18, 24, 30, 36, 42] },
    { name: 'VEIL', instrument: 'VEIL', generator: 3, sound: 'power-guitar', on: true, level: 70, density: 50, character: 50, duration: 50, space: 15, steps: [0, 6, 12, 18, 24, 30, 36, 42] },
    { name: 'MOSS', instrument: 'MOSS', generator: 3, sound: 'octave-lead', on: true, level: 75, density: 50, character: 50, duration: 50, space: 25, steps: [0, 3, 6, 9, 12, 15, 18, 21] },
    { name: 'AURA', instrument: 'AURA', generator: 3, sound: 'dark-piano', on: true, level: 65, density: 50, character: 50, duration: 50, space: 25, steps: [0, 12, 24, 36, 48, 60, 72, 84] }
  ];
  const piratesPayload = {
    requestId: 'test-recipe-b-pirates',
    schemaVersion: 1,
    baseRevision: api.getProjectState().revision,
    operations: [
      {
        op: 'composition.replace',
        project: {
          format: 'halo-composition',
          version: 1,
          tempo: 104,
          repeat: true,
          timeSignature: '3/4',
          phrases: [
            {
              id: 1,
              label: 'Intro',
              project: {
                format: 'notbad-halo-project',
                version: 1,
                setup: 'reactor',
                bars: 8,
                tempo: 104,
                key: 14,
                timeSignature: '3/4',
                tracks: defaultTracks
              }
            },
            {
              id: 2,
              label: 'Theme',
              project: {
                format: 'notbad-halo-project',
                version: 1,
                setup: 'reactor',
                bars: 8,
                tempo: 104,
                key: 14,
                timeSignature: '3/4',
                tracks: defaultTracks
              }
            }
          ],
          sections: [
            { phrase: 1, name: 'intro', repeats: 1, fade: 'none' },
            { phrase: 2, name: 'verse', repeats: 2, fade: 'none' },
            { phrase: 1, name: 'outro', repeats: 1, fade: 'out' }
          ]
        }
      }
    ]
  };
  const piratesCheck = FileBridge.parseAndValidateRequest(api, JSON.stringify(piratesPayload), 'test-recipe-b-pirates');
  assert.equal(piratesCheck.ok, true);
  assert.equal(piratesCheck.preview.after.format, 'halo-composition');
  assert.equal(piratesCheck.preview.after.timeSignature, '3/4');
  assert.equal(piratesCheck.preview.after.tempo, 104);
  assert.equal(piratesCheck.preview.after.phrases.length, 2);
  assert.equal(piratesCheck.preview.after.sections.length, 3);
});

test('resolveRequestPayload and resolveRequestPayloadSync resolve modular track.patch operations from companion files', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  const companionFiles = {
    'track-5.json': JSON.stringify({
      sound: 'bell',
      character: 75,
      steps: [0, 4, 8, 12],
      noteEvents: [
        { step: 0, notes: [64] },
        { step: 4, notes: [64] },
        { step: 8, notes: [64] },
        { step: 12, notes: [67] }
      ]
    })
  };

  const req = {
    requestId: 'req-modular-001',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [
      {
        op: 'track.patch',
        trackIndex: 5,
        file: 'track-5.json'
      }
    ]
  };

  // 1. Sync resolution
  const syncResolved = FileBridge.resolveRequestPayloadSync(req, p => companionFiles[p]);
  assert.equal(syncResolved.operations[0].trackIndex, 5);
  assert.equal(syncResolved.operations[0].values.sound, 'bell');
  assert.deepEqual(syncResolved.operations[0].values.steps, [0, 4, 8, 12]);
  assert.equal(syncResolved.operations[0].file, undefined);

  // 2. Async resolution
  const asyncResolved = await FileBridge.resolveRequestPayload(req, async p => companionFiles[p]);
  assert.equal(asyncResolved.operations[0].trackIndex, 5);
  assert.equal(asyncResolved.operations[0].values.character, 75);

  // 3. parseAndValidateRequest with options.files
  const validated = FileBridge.parseAndValidateRequest(api, JSON.stringify(req), 'req-modular-001', { files: companionFiles });
  assert.equal(validated.ok, true);
  assert.equal(validated.id, 'req-modular-001');
  assert.equal(validated.preview.after.tracks[5].sound, 'bell');
  assert.deepEqual(validated.preview.after.tracks[5].steps, [0, 4, 8, 12]);
});

test('Modular project.replace resolves all 8 companion track files and scores entire orchestra note-by-note', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  const trackFiles = {};
  const names = ['GLASS', 'TIDAL', 'ROOT', 'EMBER', 'RAIN', 'VEIL', 'MOSS', 'AURA'];
  const sounds = ['pulse', 'wood', 'shaker', 'wind', 'round', 'bell', 'string', 'air'];
  const instruments = ['ROOT', 'MOSS', 'RAIN', 'AURA', 'ROOT', 'GLASS', 'EMBER', 'TIDAL'];

  for (let i = 0; i < 8; i++) {
    trackFiles[`t${i}.json`] = JSON.stringify({
      name: names[i],
      instrument: instruments[i],
      sound: sounds[i],
      steps: [0, 4, 8, 12],
      noteEvents: [
        { step: 0, notes: [48 + i * 4] },
        { step: 4, notes: [50 + i * 4] },
        { step: 8, notes: [52 + i * 4] },
        { step: 12, notes: [55 + i * 4] }
      ]
    });
  }

  const manifest = {
    requestId: 'req-full-orchestra',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [
      {
        op: 'project.replace',
        project: {
          format: 'notbad-halo-project',
          version: 1,
          setup: 'ambient',
          bars: 8,
          tempo: 96,
          key: 0,
          tracks: [
            { file: 't0.json' },
            { file: 't1.json' },
            { file: 't2.json' },
            { file: 't3.json' },
            { file: 't4.json' },
            { file: 't5.json' },
            { file: 't6.json' },
            { file: 't7.json' }
          ]
        }
      }
    ]
  };

  const validated = await FileBridge.resolveAndValidateRequest(api, JSON.stringify(manifest), async p => trackFiles[p], 'req-full-orchestra');
  assert.equal(validated.ok, true);
  assert.equal(validated.preview.after.tracks.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.equal(validated.preview.after.tracks[i].sound, sounds[i]);
    assert.deepEqual(validated.preview.after.tracks[i].steps, [0, 4, 8, 12]);
    assert.equal(validated.preview.after.tracks[i].noteEvents.length, 4);
    assert.equal(validated.preview.after.tracks[i].exact, true);
  }
});

test('Modular request supports "parts" array expanding into atomic operations', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  const partFiles = {
    'part-drums.json': JSON.stringify([
      { op: 'track.patch', trackIndex: 0, values: { sound: 'pulse', steps: [0, 4, 8, 12] } },
      { op: 'track.patch', trackIndex: 1, values: { sound: 'wood', steps: [4, 12] } }
    ]),
    'part-lead.json': JSON.stringify({
      op: 'track.patch',
      trackIndex: 5,
      values: { sound: 'bow', steps: [0, 8], noteEvents: [{ step: 0, notes: [72] }, { step: 8, notes: [76] }] }
    })
  };

  const rootReq = {
    requestId: 'req-parts',
    schemaVersion: 1,
    baseRevision: rev,
    parts: [
      'part-drums.json',
      'part-lead.json'
    ]
  };

  const resolved = await FileBridge.resolveRequestPayload(rootReq, async p => partFiles[p]);
  assert.equal(resolved.operations.length, 3);
  assert.equal(resolved.operations[0].trackIndex, 0);
  assert.equal(resolved.operations[1].trackIndex, 1);
  assert.equal(resolved.operations[2].trackIndex, 5);

  const validated = FileBridge.parseAndValidateRequest(api, resolved, 'req-parts');
  assert.equal(validated.ok, true);
});

test('Path traversal security guard rejects unsafe relative and absolute paths', async () => {
  const unsafePaths = ['../secret.json', '..\\secret.json', '/etc/passwd', '\\Windows\\System32', 'C:\\autoexec.bat'];

  for (const p of unsafePaths) {
    assert.throws(() => {
      FileBridge.resolveRequestPayloadSync({
        schemaVersion: 1,
        baseRevision: 1,
        operations: [{ op: 'track.patch', trackIndex: 0, file: p }]
      }, () => '{}');
    }, /SECURITY_PATH_TRAVERSAL/);
  }
});

test('Invalid JSON syntax or missing companion file reports clean error guidance', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  // Missing file
  const reqMissing = {
    requestId: 'req-missing',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [{ op: 'track.patch', trackIndex: 0, file: 'nonexistent.json' }]
  };
  const resMissing = await FileBridge.resolveAndValidateRequest(api, reqMissing, async () => null, 'req-missing');
  assert.equal(resMissing.ok, false);
  assert.match(resMissing.error, /FILE_NOT_FOUND/);

  // Invalid JSON in companion
  const reqBadJson = {
    requestId: 'req-badjson',
    schemaVersion: 1,
    baseRevision: rev,
    operations: [{ op: 'track.patch', trackIndex: 0, file: 'corrupt.json' }]
  };
  const resBadJson = await FileBridge.resolveAndValidateRequest(api, reqBadJson, async () => '{ bad: json', 'req-badjson');
  assert.equal(resBadJson.ok, false);
  assert.match(resBadJson.error, /INVALID_JSON/);
});

test('checkFolder scans Folder Bundles in requests/ and resolves relative companion track files', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  // Create mock folder structure
  const bundleFiles = new Map([
    ['manifest.json', JSON.stringify({
      requestId: 'req-bundle-001',
      schemaVersion: 1,
      baseRevision: rev,
      operations: [
        { op: 'project.patch', values: { tempo: 110 } },
        { op: 'track.patch', trackIndex: 0, file: 'track-0.json' }
      ]
    })],
    ['track-0.json', JSON.stringify({
      sound: 'pulse',
      steps: [0, 4, 8, 12],
      noteEvents: [{ step: 0, notes: [60] }]
    })]
  ]);

  const responsesMap = new Map();
  const requestsSubdirs = new Map();

  function makeMockDir(filesMap, subdirsMap = new Map()){
    return {
      kind: 'directory',
      name: 'mockDir',
      async getFileHandle(name, opts = {}){
        if (!filesMap.has(name)) {
          if (opts.create) filesMap.set(name, '');
          else throw new Error(`FileNotFound: ${name}`);
        }
        return {
          kind: 'file',
          name,
          async createWritable(){
            return {
              async write(c){ filesMap.set(name, c); },
              async close(){}
            };
          },
          async getFile(){
            return {
              async text(){ return filesMap.get(name) || ''; }
            };
          }
        };
      },
      async getDirectoryHandle(name, opts = {}){
        if (subdirsMap.has(name)) return subdirsMap.get(name);
        if (opts.create) {
          const newDir = makeMockDir(new Map());
          subdirsMap.set(name, newDir);
          return newDir;
        }
        throw new Error(`DirNotFound: ${name}`);
      },
      async removeEntry(name, opts = {}){
        filesMap.delete(name);
        subdirsMap.delete(name);
      },
      async *entries(){
        for (const [k, v] of subdirsMap.entries()){
          yield [k, v];
        }
        for (const [k, v] of filesMap.entries()){
          yield [k, {
            kind: 'file',
            name: k,
            async getFile(){ return { async text(){ return v; } }; }
          }];
        }
      }
    };
  }

  const bundleDir = makeMockDir(bundleFiles);
  requestsSubdirs.set('req-bundle-001', bundleDir);
  const requestsDir = makeMockDir(new Map(), requestsSubdirs);
  const responsesDir = makeMockDir(responsesMap);

  const rootDir = {
    name: 'HALO-Bridge-Bundle-Test',
    async getDirectoryHandle(name, opts){
      if (name === 'requests') return requestsDir;
      if (name === 'responses') return responsesDir;
      throw new Error(`DirNotFound: ${name}`);
    },
    async getFileHandle(name, opts){
      return {
        async createWritable(){ return { async write(){}, async close(){} }; }
      };
    }
  };

  const bridge = FileBridge.createBridge(api, { pollInterval: 0 });
  await bridge.connect(rootDir);

  // Status should have pending bundle request
  const st = bridge.getStatus();
  assert.equal(st.connected, true);
  assert.ok(st.pending, 'Pending request should be set from bundle');
  assert.equal(st.pending.id, 'req-bundle-001');
  assert.equal(st.pending.filename, 'req-bundle-001/manifest.json');
  assert.equal(st.pending.transaction.operations[0].values.tempo, 110);
  assert.equal(st.pending.transaction.operations[1].values.sound, 'pulse');

  // Apply pending
  await bridge.applyPending();
  assert.equal(bridge.getStatus().pending, null);
  assert.equal(api.getProjectState().project.tempo, 110);
  assert.ok(responsesMap.has('req-bundle-001.result.json'));
  const resObj = JSON.parse(responsesMap.get('req-bundle-001.result.json'));
  assert.equal(resObj.ok, true);

  bridge.dispose();
});

test('checkFolder skips companion files in flat requests/ without triggering bogus errors', async () => {
  const {api} = createTestApp();
  const rev = api.getProjectState().revision;

  const reqFiles = new Map([
    // Companion files (must NOT be treated as root requests)
    ['_t0.json', JSON.stringify({ sound: 'pulse', steps: [0, 4] })],
    ['req-001-t1.json', JSON.stringify({ sound: 'wood', steps: [8, 12] })],
    ['t2.json', JSON.stringify({ sound: 'round', steps: [0, 8] })],
    // Root request
    ['req-001.json', JSON.stringify({
      requestId: 'req-001',
      schemaVersion: 1,
      baseRevision: rev,
      operations: [
        { op: 'track.patch', trackIndex: 0, file: '_t0.json' },
        { op: 'track.patch', trackIndex: 1, file: 'req-001-t1.json' }
      ]
    })]
  ]);
  const resFiles = new Map();

  function makeMockFlatDir(filesMap){
    return {
      kind: 'directory',
      name: 'mockFlat',
      async getFileHandle(name, opts = {}){
        if (!filesMap.has(name)) {
          if (opts.create) filesMap.set(name, '');
          else throw new Error(`FileNotFound: ${name}`);
        }
        return {
          kind: 'file',
          name,
          async createWritable(){
            return {
              async write(c){ filesMap.set(name, c); },
              async close(){}
            };
          },
          async getFile(){
            return {
              async text(){ return filesMap.get(name) || ''; }
            };
          }
        };
      },
      async getDirectoryHandle(name, opts = {}){
        throw new Error(`DirNotFound: ${name}`);
      },
      async removeEntry(name, opts = {}){
        filesMap.delete(name);
      },
      async *entries(){
        for (const [k, v] of filesMap.entries()){
          yield [k, {
            kind: 'file',
            name: k,
            async getFile(){ return { async text(){ return v; } }; }
          }];
        }
      }
    };
  }

  const rootDir = {
    name: 'HALO-Bridge-Companion-Test',
    async getDirectoryHandle(name, opts){
      if (name === 'requests') return makeMockFlatDir(reqFiles);
      if (name === 'responses') return makeMockFlatDir(resFiles);
      throw new Error(`DirNotFound: ${name}`);
    },
    async getFileHandle(name, opts){
      return {
        async createWritable(){ return { async write(){}, async close(){} }; }
      };
    }
  };

  const bridge = FileBridge.createBridge(api, { pollInterval: 0 });
  await bridge.connect(rootDir);

  const st = bridge.getStatus();
  assert.equal(st.connected, true);
  assert.ok(st.pending);
  assert.equal(st.pending.id, 'req-001');
  assert.equal(st.error, null);
  // No error result should have been created for companion files
  assert.equal(resFiles.has('_t0.result.json'), false);
  assert.equal(resFiles.has('req-001-t1.result.json'), false);
  assert.equal(resFiles.has('t2.result.json'), false);

  bridge.dispose();
});

test('All 5 context files contain 0 Cyrillic characters (100% English AI instructions)', () => {
  const {api} = createTestApp();
  const files = FileBridge.getContextFiles(api);
  const cyrillicRegex = /[А-Яа-яЁё]/;

  for (const [filename, content] of Object.entries(files)) {
    const hasCyrillic = cyrillicRegex.test(content);
    if (hasCyrillic) {
      const match = content.match(cyrillicRegex);
      assert.fail(`File "${filename}" contains Cyrillic character: "${match[0]}"`);
    }
    assert.equal(hasCyrillic, false, `File "${filename}" must be 100% English`);
  }
});




// Realistic filesystem contract: reads are snapshots, writes become visible on close.
function bridgeFolder(){
  function directory(name='root'){
    const files=new Map(),dirs=new Map();
    return {kind:'directory',name,files,dirs,
      async getFileHandle(n,{create=false}={}){if(!files.has(n)){if(!create)throw Error('FILE_NOT_FOUND: '+n);files.set(n,'')}
        return {kind:'file',name:n,async getFile(){const text=files.get(n);return {text:async()=>text}},async createWritable(){let value;return {async write(s){value=s},async close(){files.set(n,value)}}}}},
      async getDirectoryHandle(n,{create=false}={}){if(!dirs.has(n)){if(!create)throw Error('DIRECTORY_NOT_FOUND: '+n);dirs.set(n,directory(n))}return dirs.get(n)},
      async removeEntry(n){files.delete(n);dirs.delete(n)},
      async *entries(){for(const [n,d]of dirs)yield[n,d];for(const n of files.keys())yield[n,await this.getFileHandle(n)]}
    };
  }
  return directory();
}
async function modularFixture({flat=false,content='{"tempo":201}',stale=false}={}){
  const {api}=createTestApp(),root=bridgeFolder();
  const req=await root.getDirectoryHandle('requests',{create:true}),res=await root.getDirectoryHandle('responses',{create:true});
  const bundle=flat?req:await req.getDirectoryHandle('req-proof',{create:true});
  const revision=api.getProjectState().revision;
  bundle.files.set('master.json',content);
  bundle.files.set(flat?'req-proof.json':'manifest.json',JSON.stringify({requestId:'req-proof',schemaVersion:1,baseRevision:stale?revision-1:revision,operations:[{op:'master.patch',file:'master.json'}]}));
  const bridge=FileBridge.createBridge(api,{pollInterval:0});await bridge.connect(root);
  return {api,root,req,res,bundle,bridge,result:()=>JSON.parse(res.files.get('req-proof.result.json'))};
}
for(const flat of [false,true])test(`companion-only corrections, explicit acknowledgement and immutable application (${flat?'flat':'bundle'})`,async()=>{
  const f=await modularFixture({flat,stale:true});
  assert.equal(f.result().status,'error');
  assert.doesNotMatch(f.result().error,/CONFLICT_REVISION/, 'Rebased numeric error must not be hidden behind stale revision');
  const previousReceipt=f.result().submissionVersion;
  assert.match(previousReceipt,/^[0-9a-f]{8}$/);
  await f.bridge.checkFolder();assert.equal(f.result().submissionVersion,previousReceipt);
  f.bundle.files.set('master.json','{"tempo":104}');
  await f.bridge.checkFolder();
  assert.equal(f.result().status,'pending_approval');assert.equal(f.result().applied,false);
  assert.notEqual(f.result().submissionVersion,previousReceipt,'Companion correction must have a fresh receipt');
  assert.equal(f.api.getProjectState().project.tempo,72,'Acknowledgement is not application');
  // Changed after preview, before next poll: do not apply a different snapshot.
  f.bundle.files.set('master.json','{"tempo":108}');
  await f.bridge.applyPending();
  assert.match(f.result().error,/REQUEST_CHANGED/);assert.equal(f.api.getProjectState().project.tempo,72);
  await f.bridge.checkFolder();assert.equal(f.result().status,'pending_approval');
  assert.equal(f.bridge.getStatus().pending.transaction.operations[0].values.tempo,108);
  await f.bridge.applyPending();assert.equal(f.result().status,'applied');assert.equal(f.api.getProjectState().project.tempo,108);
  f.bundle.files.set('master.json','{"tempo":120}');await f.bridge.checkFolder();
  assert.equal(f.api.getProjectState().project.tempo,108,'Applied request ID never replays');
  f.bridge.dispose();
  const reconnect=FileBridge.createBridge(f.api,{pollInterval:0});await reconnect.connect(f.root);
  assert.equal(reconnect.getStatus().pending,null);assert.equal(f.api.getProjectState().project.tempo,108);reconnect.dispose();
});
test('truncated or missing companions recover without rewriting manifest; pending is rediscovered on reconnect',async()=>{
  const f=await modularFixture({content:'{"tempo":'});assert.equal(f.result().status,'error');
  f.bundle.files.delete('master.json');await f.bridge.checkFolder();assert.equal(f.result().status,'error');
  f.bundle.files.set('master.json','{"tempo":100}');await f.bridge.checkFolder();assert.equal(f.result().status,'pending_approval');
  f.bridge.dispose();const b=FileBridge.createBridge(f.api,{pollInterval:0});await b.connect(f.root);
  assert.equal(b.getStatus().pending.id,'req-proof','Pending ack must not be mistaken for an applied result');
  await b.rejectPending();assert.equal(f.result().status,'rejected');b.dispose();
  const c=FileBridge.createBridge(f.api,{pollInterval:0});await c.connect(f.root);assert.equal(c.getStatus().pending,null,'Respect rejected request across reconnect');c.dispose();
});
test('pending companion change on poll replaces the proposal instead of applying old notes',async()=>{
  const f=await modularFixture({content:'{"tempo":100}'});assert.equal(f.result().status,'pending_approval');
  f.bundle.files.set('master.json','{"tempo":102}');await f.bridge.checkFolder();
  assert.equal(f.bridge.getStatus().pending.transaction.operations[0].values.tempo,102);
  assert.equal(f.api.getProjectState().project.tempo,72);f.bridge.dispose();
});
test('request identity cannot create response paths outside the chosen folder',()=>{
  const {api}=createTestApp();const result=FileBridge.parseAndValidateRequest(api,{schemaVersion:1,requestId:'../escape',baseRevision:api.getProjectState().revision,operations:[{op:'master.patch',values:{tempo:100}}]},'req-safe');
  assert.equal(result.ok,false);assert.match(result.error,/INVALID_REQUEST_ID/);assert.equal(result.id,'req-safe');
});
test('compact context has one canonical sound registry and recipes use authoritative keys',()=>{
  const {api}=createTestApp(),files=FileBridge.getContextFiles(api),caps=api.getCapabilities();
  const inst=JSON.parse(files['instruments.json']),guide=files['AGENT_GUIDE.md'];
  assert.equal(inst.sounds.length,62);assert.ok(Buffer.byteLength(files['instruments.json'])<85000);
  assert.ok(Buffer.byteLength(guide)<10000);assert.doesNotMatch(guide,/KEEP YOUR REQUEST JSON UNDER|ONLY on 1 or 2 tracks/);
  for(const role of inst.tracks)for(const [setup,ids]of Object.entries(role.soundsBySetup))for(const id of ids){
    const sound=inst.sounds.find(s=>s.id===id);assert.ok(sound);assert.ok(sound.setups.includes(setup));assert.ok(sound.compatibleRoles.includes(role.role));
  }
  for(const name of ['C MAJOR','D MINOR']){const key=caps.harmony.keys.findIndex(k=>k.name===name);assert.match(guide,new RegExp('key '+key+', noteTranspose '+caps.harmony.keys[key].offset));}
});
test('both delivered full scores resolve and apply via the file transport with literal pitches',async()=>{
  const fs=require('node:fs');
  for(const filename of ['holiday-loop.halo.json','adventure-song.halo.json']){
    const {api}=createTestApp(),project=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../examples/ai',filename),'utf8'));
    const root=bridgeFolder(),req=await root.getDirectoryHandle('requests',{create:true}),dir=await req.getDirectoryHandle('req-score',{create:true});
    dir.files.set('score.json',JSON.stringify(project));dir.files.set('manifest.json',JSON.stringify({requestId:'req-score',schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:project.phrases?'composition.replace':'project.replace',file:'score.json'}]}));
    const b=FileBridge.createBridge(api,{pollInterval:0});await b.connect(root);assert.ok(b.getStatus().pending);await b.applyPending();
    const saved=api.getProjectState().project;const phrases=saved.phrases?saved.phrases.map(p=>p.project):[saved];
    for(const p of phrases){assert.equal(p.tracks.length,8);const key=api.getCapabilities().harmony.keys[p.key];for(const t of p.tracks){assert.equal(t.exact,true);assert.equal(t.noteTranspose,key.offset);for(const e of t.noteEvents||[])assert.ok(t.steps.includes(e.step));}}
    const music=api.getContext().music;
    for(const [pi,p]of phrases.entries())for(const [ti,t]of p.tracks.entries())for(const event of t.noteEvents||[]){
      const resolved=music[pi].tracks[ti].events.find(e=>e.step===event.step);
      assert.ok(resolved);assert.deepEqual(resolved.notes.map(n=>n%12).sort((a,b)=>a-b),event.notes.map(n=>n%12).sort((a,b)=>a-b),'Literal MIDI pitch classes survive role/sample octave folding');
    }
    if(saved.phrases){assert.equal(saved.phrases.length,4);assert.equal(saved.sections.reduce((n,s)=>n+8*s.repeats,0),72);}else assert.equal(saved.key,2);
    b.dispose();
  }
});

test('failed acknowledgement/context I/O after application cannot roll back the reported application or replay the request',async()=>{
 const f=await modularFixture({content:'{"tempo":99}'});assert.equal(f.result().status,'pending_approval');
 const getHandle=f.res.getFileHandle;f.res.getFileHandle=async()=>{throw Error('Permission denied')};
 await f.bridge.applyPending();
 assert.equal(f.api.getProjectState().project.tempo,99);assert.equal(f.bridge.getStatus().lastResult.status,'applied');
 assert.match(f.bridge.getStatus().error,/RESPONSE_SYNC_FAILED/);assert.equal(f.bridge.getStatus().pending,null);
 f.res.getFileHandle=getHandle;await f.bridge.checkFolder();assert.equal(f.bridge.getStatus().pending,null);f.bridge.dispose();
});

test('idle polling preserves the pending Apply button and keyboard focus',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');const {api}=createTestApp(),root=bridgeFolder();
 const req=await root.getDirectoryHandle('requests',{create:true});req.files.set('req-focus.json',JSON.stringify({requestId:'req-focus',schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:'master.patch',values:{tempo:100}}]}));
 let poll;
 const doc={activeElement:null,createElement(tag){return {tag,children:[],style:{},textContent:'',append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this}},replaceChildren(){if(this.contains(doc.activeElement))doc.activeElement=null;this.children=[]},contains(n){return n===this||this.children.some(c=>c.contains(n))},querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)])},focus(){doc.activeElement=this}}}};
 const context={document:doc,console:{log(){},warn(){},error(){}},TextEncoder,showDirectoryPicker:async()=>root,setInterval(fn){poll=fn;return 1},clearInterval(){},setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/file-bridge.js'),'utf8'),context);
 const host=doc.createElement('host');context.HaloFileBridge.panel(host,api,()=> 'en');
 await host.querySelectorAll('button').find(b=>b.textContent.includes('Connect HALO')).onclick();
 const apply=host.querySelectorAll('button').find(b=>b.textContent.includes('Apply Changes'));assert.ok(apply);apply.focus();
 await poll();await poll();assert.equal(doc.activeElement,apply);assert.ok(host.contains(apply));
 host._haloCleanup();
});

test('real directory roundtrip: bounded writes, manifest-last, both full scores, no duplicate application',async()=>{
 const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'halo-bridge-regression-'));
 function handle(location){return {kind:'directory',name:path.basename(location),
  async getDirectoryHandle(name,{create=false}={}){const next=path.join(location,name);if(create)await fs.mkdir(next,{recursive:true});else await fs.access(next);return handle(next)},
  async getFileHandle(name,{create=false}={}){const file=path.join(location,name);if(create){try{await fs.access(file)}catch{await fs.writeFile(file,'')}}else await fs.access(file);
   return {kind:'file',name,async getFile(){const snapshot=await fs.readFile(file,'utf8');return {text:async()=>snapshot}},async createWritable(){let content='';return {async write(text){content=text},async close(){await fs.writeFile(file+'.tmp',content);await fs.rename(file+'.tmp',file)}}}}},
  async removeEntry(name,{recursive=false}={}){await fs.rm(path.join(location,name),{recursive})},
  async *entries(){for(const entry of await fs.readdir(location,{withFileTypes:true})){yield [entry.name,entry.isDirectory()?handle(path.join(location,entry.name)):await this.getFileHandle(entry.name)]}}
 }}
 const {api}=createTestApp();const b=FileBridge.createBridge(api,{pollInterval:0});
 try{
  await b.connect(handle(folder));const context=JSON.parse(await fs.readFile(path.join(folder,'instruments.json'),'utf8'));assert.equal(context.schemaVersion,2);
  for(const [index,filename]of ['holiday-loop.halo.json','adventure-song.halo.json'].entries()){
   const score=JSON.parse(await fs.readFile(path.join(__dirname,'../examples/ai',filename),'utf8'));
   const id='req-disk-'+index,dir=path.join(folder,'requests',id);await fs.mkdir(dir);
   async function boundedWrite(name,value){const json=JSON.stringify(value),destination=path.join(dir,name);await fs.writeFile(destination,'');for(let offset=0;offset<json.length;offset+=1000){const chunk=json.slice(offset,offset+1000);assert.ok(Buffer.byteLength(chunk)<1500);await fs.appendFile(destination,chunk)}assert.deepEqual(JSON.parse(await fs.readFile(destination,'utf8')),value)}
   const projects=score.phrases?score.phrases.map(p=>p.project):[score];
   for(const [pi,p]of projects.entries())for(let ti=0;ti<8;ti++){const name=`phrase-${pi}-track-${ti}.json`;await boundedWrite(name,p.tracks[ti]);p.tracks[ti]={file:name}}
   await b.checkFolder();assert.equal(b.getStatus().pending,null,'No manifest: no premature proposal');
   await boundedWrite('manifest.json',{requestId:id,schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:score.phrases?'composition.replace':'project.replace',project:score}]});
   await b.checkFolder();let result=JSON.parse(await fs.readFile(path.join(folder,'responses',id+'.result.json'),'utf8'));assert.equal(result.status,'pending_approval');
   await b.applyPending();result=JSON.parse(await fs.readFile(path.join(folder,'responses',id+'.result.json'),'utf8'));assert.equal(result.status,'applied');
   const live=api.getProjectState(),snapshot=JSON.parse(await fs.readFile(path.join(folder,'project-state.json'),'utf8'));assert.deepEqual(snapshot.project,live.project);
   await b.checkFolder();assert.equal(b.getStatus().pending,null);assert.deepEqual(api.getProjectState().project,live.project);
  }
 }finally{b.dispose();await fs.rm(folder,{recursive:true,force:true})}
});

test('legacy rejection receipts without status remain terminal on reconnect',async()=>{
 const {api}=createTestApp(),root=bridgeFolder();const req=await root.getDirectoryHandle('requests',{create:true}),res=await root.getDirectoryHandle('responses',{create:true});
 req.files.set('req-legacy.json',JSON.stringify({requestId:'req-legacy',schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:'master.patch',values:{tempo:104}}]}));
 res.files.set('req-legacy.result.json',JSON.stringify({ok:false,id:'req-legacy',error:'REJECTED_BY_USER'}));
 const b=FileBridge.createBridge(api,{pollInterval:0});await b.connect(root);assert.equal(b.getStatus().pending,null);assert.equal(api.getProjectState().project.tempo,72);b.dispose();
});


test('File-only normalization accepts presentation variants without changing musical values', () => {
  const {api}=createTestApp();
  const request={schemaVersion:1,requestId:'tolerant',baseRevision:api.getProjectState().revision,
    operations:[{op:' TRACK.PATCH ',trackIndex:'5',instrument:' glass ',sound:' AMBIENT-BELL ',steps:[0,32],noteEvents:[{step:0,notes:[76]},{step:32,notes:[79]}]}]};
  const result=FileBridge.parseAndValidateRequest(api,request,'tolerant');
  assert.equal(result.ok,true,result.error);
  assert.deepEqual(result.transaction.operations[0].values.noteEvents,request.operations[0].noteEvents);
  assert.equal(result.transaction.operations[0].values.instrument,'GLASS');
  assert.equal(result.transaction.operations[0].values.sound,'bell');
  assert.equal(request.operations[0].trackIndex,'5');
  request.operations[0].values={sound:'wind'};
  assert.match(FileBridge.parseAndValidateRequest(api,request,'tolerant').error,/AMBIGUOUS_FIELD/);
});

test('File normalization retains strict unknown fields, indices and musical bounds', () => {
  const {api}=createTestApp();
  for(const operation of [
    {op:'track.patch',trackIndex:5,values:{invented:true}},
    {op:'track.patch',trackIndex:'8',values:{level:50}},
    {op:'track.patch',trackIndex:5,values:{level:999}}
  ]) {
    const result=FileBridge.parseAndValidateRequest(api,{schemaVersion:1,requestId:'strict',baseRevision:api.getProjectState().revision,operations:[operation]},'strict');
    assert.equal(result.ok,false);
  }
});


test('automatic scans stop outside integration and on hidden pages; manual scan remains available', async()=>{
 const {api}=createTestApp(),folder=bridgeFolder(),doc={hidden:false};
 const bridge=FileBridge.createBridge(api,{pollInterval:0,window:{document:doc}});
 await bridge.connect(folder);
 const requests=folder.dirs.get('requests');let scans=0;
 const entries=requests.entries.bind(requests);requests.entries=async function*(){scans++;yield* entries()};
 bridge.setActive(false);await bridge.checkFolder(true);assert.equal(scans,0);
 bridge.setActive(true);doc.hidden=true;await bridge.checkFolder(true);assert.equal(scans,0);
 await bridge.checkFolder();assert.equal(scans,1);
 doc.hidden=false;await bridge.checkFolder(true);assert.equal(scans,2);
 bridge.dispose();
});

test('unchanged metadata avoids file text reads but approval forces a companion read',async()=>{
 const {api}=createTestApp(),folder=bridgeFolder(),requests=await folder.getDirectoryHandle('requests',{create:true});
 const bundle=await requests.getDirectoryHandle('req-cache',{create:true});
 bundle.files.set('manifest.json',JSON.stringify({requestId:'req-cache',schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:'master.patch',file:'master.json'}]}));
 bundle.files.set('master.json','{"tempo":90}');
 const original=bundle.getFileHandle.bind(bundle);let reads=0;
 bundle.getFileHandle=async(...args)=>{const handle=await original(...args);const get=handle.getFile.bind(handle);handle.getFile=async()=>{const f=await get();const text=await f.text();return {size:text.length,lastModified:1,text:async()=>{reads++;return text}}};return handle};
 const bridge=FileBridge.createBridge(api,{pollInterval:0});await bridge.connect(folder);
 assert.ok(bridge.getStatus().pending);const initial=reads;
 await bridge.checkFolder();assert.equal(reads,initial);
 // Same metadata is only an idle optimization, never approval authority.
 bundle.files.set('master.json','{"tempo":91}');
 await bridge.applyPending();assert.match(bridge.getStatus().error,/REQUEST_CHANGED/);
 assert.equal(api.getProjectState().project.tempo,72);assert.ok(reads>initial);bridge.dispose();
});


test('idle scans do not clone and notify the same pending score repeatedly',async()=>{
 const f=await modularFixture({content:'{"tempo":90}'});let notifications=0;
 f.bridge.subscribe(()=>notifications++);const initial=notifications;
 await f.bridge.checkFolder();await f.bridge.checkFolder();assert.equal(notifications,initial);
 f.bridge.dispose();
});
