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
});

test('resetLocalChanges clears requests/responses, resets project, and updates context', async () => {
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

  // Verify localStorage cleared
  assert.equal(fakeWin.localStorage.items['halo-pattern-v1'], undefined);
  assert.equal(fakeWin.localStorage.items['notbad-halo-autosave-v1'], undefined);
  assert.equal(fakeWin.localStorage.items['halo-composition-v1'], undefined);

  // Verify project reset back to default 72 bpm
  assert.equal(api.getProjectState().project.tempo, 72);

  // Verify toast
  assert.ok(toastMsg.includes('сброшены'));

  // Verify context files updated
  assert.ok(rootFiles.has('project-state.json'));
  assert.ok(rootFiles.has('AGENT_GUIDE.md'));

  await bridge.disconnect();
});



