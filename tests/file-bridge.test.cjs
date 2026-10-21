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
function scoreRequest(api, values={}){
 return {format:'halo-score',baseRevision:api.getProjectState().revision,mode:'replace',world:'ambient',tempo:96,bars:8,meter:'4/4',key:'C major',voices:{melody:{sound:'harp',notes:[[0,72],[124,76]]}},...values};
}
test('workflow guide delegates format and complete palette to their authoritative files',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),guide=files['AGENT_GUIDE.md'];
 const registry=JSON.parse(files['instruments.json']);
 assert.equal(registry.sounds.length,62);
 assert.match(guide,/capabilities.json.requestSchema/);
 assert.match(guide,/compatibleRoles/);
 assert.match(guide,/Choose from this catalog/);
 assert.doesNotMatch(guide,/### ambient|### reactor|Voice fields/);
});

test('every advertised instrument can score an original part through the real engine validator',()=>{
 const {api}=createTestApp(),registry=JSON.parse(FileBridge.getContextFiles(api)['instruments.json']);
 for(const sound of registry.sounds){
  const role=sound.affinityRoles[0],pitched=sound.pitched;
  const voice={sound:sound.canonicalId,...(pitched?{notes:[[0,60],[124,67]]}:{steps:[0,124]})};
  const result=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{world:sound.world,voices:{[role]:voice}}),'instrument');
  assert.equal(result.ok,true,sound.world+'/'+sound.canonicalId+': '+result.error);
  const track=result.preview.after.tracks.find(t=>t.role===role);
  assert.equal(track.instrument,sound.bankId);assert.ok(api.getCapabilities().catalog[sound.world][sound.bankId].sounds.some(s=>s.id===track.sound));
  assert.deepEqual(track.steps,[0,124]);assert.equal(track.exact,true);
 }
});

test('authored chromatic pitches and rests survive score application independently of generated motifs',async()=>{
 for(const world of ['ambient','reactor']){
  const {api}=createTestApp();api.setEnabled(true);
  const notes=[[1,73],[19,78],[57,82],[119,75]];
  const sound=world==='ambient'?'crystal':'singing-lead';
  const request=scoreRequest(api,{world,key:'C major',voices:{melody:{sound,notes}}});
  const result=FileBridge.parseAndValidateRequest(api,request,'authored');assert.equal(result.ok,true,result.error);
  await api.applyOperations(result.transaction);
  const events=api.getContext().music[0].tracks[5].events;
  assert.deepEqual(events.map(e=>e.step),notes.map(n=>n[0]),'No generated notes or repeated first-bar fragments');
  assert.deepEqual(events.map(e=>e.notes.map(n=>n%12)),notes.map(n=>[n[1]%12]),'The C major key does not rewrite authored chromatic notes');
  assert.deepEqual(api.getProjectState().project.tracks[5].noteEvents,notes.map(([step,...notes])=>({step,notes})));
 }
});

test('edit preserves unrelated voices, defaults, master mix, local audio references and song phrases',async()=>{
 const {api}=createTestApp();api.setEnabled(true);
 const source=api.getProjectState().project;
 source.liveLoop={version:1,layerIds:[42],settings:{mute:true}};
 source.masterVolume=37;source.mix.width=23;
 await api.applyOperations({schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:'project.replace',project:source}]});
 const before=api.getProjectState().project;
 const score=scoreRequest(api,{mode:'edit',bars:before.bars,key:api.getCapabilities().harmony.keys[before.key].name,voices:{melody:{sound:'harp',notes:[[0,72],[63,76]]}}});
 const result=FileBridge.parseAndValidateRequest(api,score,'edit');assert.equal(result.ok,true,result.error);
 const after=result.preview.after;
 for(let i=0;i<8;i++)if(i!==5)assert.deepEqual(after.tracks[i],before.tracks[i]);
 assert.equal(after.bars,before.bars);assert.equal(after.key,before.key);assert.deepEqual(after.liveLoop,before.liveLoop);assert.equal(after.masterVolume,37);assert.deepEqual(after.mix,before.mix);
 const songScore=scoreRequest(api,{phrases:[{id:1,voices:{melody:{sound:'harp',notes:[[0,72],[127,76]]}}},{id:2,voices:{bass:{sound:'deep',notes:[[0,36],[127,43]]}}}],sections:[{phrase:1},{phrase:2,repeats:2}]});
 delete songScore.voices;
 const song=FileBridge.parseAndValidateRequest(api,songScore,'song');assert.equal(song.ok,true,song.error);await api.applyOperations(song.transaction);
 const original=api.getProjectState().project;
 const edit=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{mode:'edit',phraseId:2,voices:{bass:{level:35}}}),'edit-song');
 assert.equal(edit.ok,true,edit.error);assert.deepEqual(edit.preview.after.phrases[0],original.phrases[0]);assert.deepEqual(edit.preview.after.sections,original.sections);
 assert.equal(edit.preview.after.phrases[1].project.tracks[4].level,35);
 assert.equal(FileBridge.parseAndValidateRequest(api,scoreRequest(api,{mode:'edit'}),'bad-edit').ok,false);
});

test('score errors report several actionable fields together and reject ambiguous or unsafe music',async()=>{
 const {api}=createTestApp();
 const bad=scoreRequest(api,{bars:7,key:'wrong',voices:{melody:{sound:'dry-kick',notes:[[0,300]],velocity:92},bass:{steps:[0]}}});
 const result=await FileBridge.processRequest(api,bad,'bad');
 assert.equal(result.ok,false);assert.match(result.error,/score.bars/);assert.match(result.error,/score.key/);assert.match(result.error,/melody.sound/);assert.match(result.error,/bass.steps/);
 assert.match(result.help,/Keep format halo-score/);
 for(const change of [
  {voices:{melody:{sound:'harp',notes:[[128,72]]}}},
  {voices:{harmony:{sound:'harp',notes:[[0,60,64,67,71,74]]}}},
  {voices:{melody:{sound:'harp',notes:[[0,72]],steps:[0]}}},
  {schemaVersion:2},{operations:[]},{world:'invalid'},{mode:'guess'}
 ])assert.equal(FileBridge.parseAndValidateRequest(api,scoreRequest(api,change),'bad').ok,false,JSON.stringify(change));
 const conflict=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{baseRevision:0}),'stale');assert.match(conflict.error,/CONFLICT_REVISION/);
});

test('simple score song supports 3/4 and validates bounded arrangement references',()=>{
 const {api}=createTestApp();
 const score={format:'halo-score',mode:'replace',tempo:104,bars:8,baseRevision:api.getProjectState().revision,world:'reactor',meter:'3/4',key:'D minor',phrases:[{id:1,voices:{melody:{sound:'singing-lead',notes:[[0,74],[95,77]]}}}],sections:[{phrase:1,repeats:2}]};
 const result=FileBridge.parseAndValidateRequest(api,score,'waltz');assert.equal(result.ok,true,result.error);assert.equal(result.preview.after.timeSignature,'3/4');assert.equal(result.preview.after.phrases[0].project.tracks[5].steps.at(-1),95);
 for(const altered of [{...score,sections:[{phrase:2}]},{...score,sections:[{phrase:1,repeats:8},{phrase:1,repeats:8},{phrase:1}]},{...score,phrases:[...score.phrases,...score.phrases]}])assert.equal(FileBridge.parseAndValidateRequest(api,altered,'bad-song').ok,false);
});

test('flat score companion submission reaches pending, applies exact notes, rejects races and never replays',async()=>{
 const {api}=createTestApp(),root=bridgeFolder(),req=await root.getDirectoryHandle('requests',{create:true}),res=await root.getDirectoryHandle('responses',{create:true});
 const score=scoreRequest(api,{voices:{melody:{file:'req-simple--melody.json'}}});
 const read=()=>JSON.parse(res.files.get('req-simple.result.json'));
 req.files.set('req-simple.json',JSON.stringify(score));req.files.set('req-simple--melody.json',JSON.stringify({sound:'harp',notes:[[0,72],[127,76]]}));
 const b=FileBridge.createBridge(api,{pollInterval:0});await b.connect(root);
 try{
  assert.equal(read().status,'pending_approval');assert.equal(api.getProjectState().project.bars,4);
  req.files.set('req-simple--melody.json',JSON.stringify({sound:'harp',notes:[[0,72],[127,79]]}));await b.applyPending();assert.match(read().error,/REQUEST_CHANGED/);
  await b.checkFolder();assert.equal(read().status,'pending_approval');await b.applyPending();assert.equal(read().status,'applied');
  const applied=api.getProjectState();assert.deepEqual(applied.project.tracks[5].noteEvents,[{step:0,notes:[72]},{step:127,notes:[79]}]);
  const exported=JSON.parse(root.files.get('project-state.json'));assert.equal(exported.project,undefined);assert.deepEqual(exported.score.voices.melody.notes,[[0,72],[127,79]]);
  assert.ok(!root.files.get('AGENT_GUIDE.md').includes('Current revision:'),'Only STATE supplies a live revision');
  const melody=api.getContext().music[0].tracks[5];
  assert.deepEqual(melody.events.map(e=>({step:e.step,notes:e.notes})),applied.project.tracks[5].noteEvents,'Authored melody reaches the engine without transposition');
  await b.checkFolder();assert.equal(b.getStatus().pending,null);assert.deepEqual(api.getProjectState(),applied);
 }finally{b.dispose()}
 const c=FileBridge.createBridge(api,{pollInterval:0});await c.connect(root);assert.equal(c.getStatus().pending,null);c.dispose();
 for(const file of ['../escape.json','C:/secret.json','/secret.json']){
  const payload=scoreRequest(api,{voices:{melody:{file}}});
  const sync=FileBridge.parseAndValidateRequest(api,payload,'unsafe',{files:{}});
  const asyncResult=await FileBridge.resolveAndValidateRequest(api,payload,async()=>({sound:'harp',notes:[[0,72]]}),'unsafe');
  assert.equal(sync.ok,false);assert.equal(asyncResult.ok,false);assert.match(sync.error,/SCORE_ERROR/);
 }
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
  assert.equal(JSON.parse(rootFiles.get('project-state.json')).score.tempo, 135);
  assert.ok(rootFiles.has('AGENT_GUIDE.md'));

  await bridge.disconnect();
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


test('normalized export exposes the full song without leaking engine representation', () => {
  const fs=require('node:fs'),path=require('node:path');
  const {api}=createTestApp();
  const project=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/ai/adventure-song.halo.json'),'utf8'));
  const state={revision:17,project,visual:{scene:'ORBIT'}};
  const files=FileBridge.getContextFiles({getCapabilities:()=>api.getCapabilities(),getProjectState:()=>state,getContext(){throw Error('Derived score must not be requested')}});
  const exported=JSON.parse(files['project-state.json']);
  assert.equal(exported.project,undefined);assert.equal(exported.visual,undefined);assert.equal(exported.score.phrases.length,project.phrases.length);assert.deepEqual(exported.score.sections,project.sections);
  assert.equal(exported.revision,17);
  assert.equal(exported.music,undefined);
  const caps=JSON.parse(files['capabilities.json']);
  const inst=JSON.parse(files['instruments.json']),engine=api.getCapabilities();
  assert.equal(inst.sounds.length,62);
  for(const role of inst.tracks){
    const source=engine.roles[role.trackIndex];
    assert.equal(role.maxNotes,source.maxNotes);
    assert.deepEqual(role.policy,source.policy);
    assert.deepEqual(role.acousticRange,{minMidi:source.minMidi??24,maxMidi:source.maxMidi??96});
  }
  for(const sound of inst.sounds){
    const source=engine.catalog[sound.world][sound.bankId].sounds.find(s=>s.id.replace(/^(ambient|reactor)-/,'')===sound.canonicalId || sound.bankId.toLowerCase()+'-'+s.id===sound.canonicalId);
    assert.deepEqual(sound.compatibleRoles,source.playback.compatibleRoles);
    assert.deepEqual(sound.acousticRange,source.playback.range);
  }
});



test('v3 package has one contract, complete cross references, no slot timbre conflation and no duplicated live revision',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),guide=files['AGENT_GUIDE.md'];
 for(const [name,text] of Object.entries(files)){
  if(name.endsWith('.json')){
   const doc=JSON.parse(text);assert.equal(doc.schemaVersion,3,name);
   for(const peer of Object.keys(files))if(peer!==name)assert.ok(Object.values(doc.references).some(ref=>ref.startsWith(peer)),name+' -> '+peer);
  }
  assert.doesNotMatch(text,/manifest\.json|legacy operation|partsArray|project\.replace|track\.patch/);
 }
 const caps=JSON.parse(files['capabilities.json']),inst=JSON.parse(files['instruments.json']),rules=JSON.parse(files['music-rules.json']);
 assert.equal(caps.operations,undefined);assert.equal(caps.protocol,'halo-score');
 assert.deepEqual(inst.tracks.slice(0,3).map(t=>[t.slot,t.role]),[['GLASS','pulse'],['TIDAL','accent'],['ROOT','percussion']]);
 assert.equal(rules.soundWorlds,undefined);
 for(const sound of inst.sounds){assert.ok(sound.bankId);assert.equal(sound.id,undefined);assert.equal(sound.sound,undefined);assert.equal(sound.instrument,undefined);}
 assert.doesNotMatch(guide,/Current revision:|Current tempo:/);
 assert.match(guide,/BRIDGE_ROOT \(корневая папка\) is the exact absolute path supplied by the user/);
 assert.match(guide,/pending_approval/);
 assert.match(guide,/at most 3 reads/);
 const anchors=[...guide.matchAll(/\]\(#([^)]+)\)/g)].map(m=>m[1]);
 const headings=guide.split('\n').filter(l=>l.startsWith('## ')).map(l=>l.slice(3).toLowerCase().replace(/[^a-z0-9 -]/g,'').replace(/ /g,'-'));
 for(const anchor of anchors)assert.ok(headings.includes(anchor),anchor);
});

test('only canonical score fields are accepted; no aliases, defaults, case repair or unknown metadata',()=>{
 const {api}=createTestApp();
 const rejected=[{format:'halo-project'},{bpm:96},{timeSignature:'4/4'},{duration:32},{operations:[]},{transaction:{}},{parts:[]},{schemaVersion:1},
  {voices:{MELODY:{sound:'harp',notes:[[0,72]]}}},{voices:{melody:{sound:' HARP ',notes:[[0,72]]}}},
  {voices:{melody:{sound:'ambient-harp',notes:[[0,72]]}}},{voices:{melody:{notes:[[0,72]]}}},
  {voices:{melody:{sound:'harp',notes:[[0,72]],comment:'metadata'}}},{voices:{texture:{sound:'wind',notes:[[0,72]]}}},
  {voices:{texture:{sound:'organ',steps:[0]}}},{voices:{melody:{sound:'harp',notes:[[0,72],[0,76]]}}}];
 for(const extra of rejected){const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,extra),'strict');assert.equal(r.ok,false,JSON.stringify(extra));}
 for(const field of ['mode','world','tempo','bars','meter','key']){
  const req=scoreRequest(api);delete req[field];assert.equal(FileBridge.parseAndValidateRequest(api,req,'required').ok,false,field);
 }
});

test('identity and companion paths fail before any file access in sync and async readers',async()=>{
 const {api}=createTestApp();let reads=0;
 for(const file of ['../escape.json','C:/secret.json','/secret.json','req-other--melody.json','req-safe--bass.json','sub/req-safe--melody.json','req-safe--melody.JSON']){
  const req=scoreRequest(api,{voices:{melody:{file}}});
  const r=await FileBridge.resolveAndValidateRequest(api,req,async()=>{reads++;return {}},'req-safe');assert.equal(r.ok,false,file);
  assert.equal(FileBridge.parseAndValidateRequest(api,req,'req-safe',{files:{}}).ok,false);
 }
 const mismatch=await FileBridge.resolveAndValidateRequest(api,scoreRequest(api,{requestId:'other'}),async()=>{reads++;return {}},'req-safe');assert.equal(mismatch.ok,false);assert.equal(mismatch.id,'req-safe');assert.equal(reads,0);
});

async function scoreFixture(){
 const {api}=createTestApp(),root=bridgeFolder(),req=await root.getDirectoryHandle('requests',{create:true}),res=await root.getDirectoryHandle('responses',{create:true});
 const bridge=FileBridge.createBridge(api,{pollInterval:0});await bridge.connect(root);
 return {api,root,req,res,bridge,receipt:()=>JSON.parse(res.files.get('req-proof.result.json'))};
}

test('flat companions recover from missing/truncated input, require fresh receipts and invalidate changed pending reviews',async()=>{
 const f=await scoreFixture();try{
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api,{voices:{melody:{file:'req-proof--melody.json'}}})));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'error');const missing=f.receipt().submissionVersion;
  f.req.files.set('req-proof--melody.json','{');await f.bridge.checkFolder();assert.equal(f.receipt().status,'error');assert.notEqual(f.receipt().submissionVersion,missing);
  f.req.files.set('req-proof--melody.json',JSON.stringify({sound:'harp',notes:[[0,72],[127,79]]}));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');const pending=f.receipt().submissionVersion;
  f.req.files.set('req-proof--melody.json',JSON.stringify({sound:'harp',notes:[[0,72],[127,76]]}));await f.bridge.checkFolder();
  assert.equal(f.receipt().status,'pending_approval');assert.notEqual(f.receipt().submissionVersion,pending);
  await f.bridge.applyPending();assert.equal(f.receipt().status,'applied');assert.equal(f.api.getProjectState().project.tracks[5].noteEvents.at(-1).notes[0],76);
 }finally{f.bridge.dispose()}
});

test('operation envelopes are rejected, directories are ignored, companions never become requests',async()=>{
 const f=await scoreFixture();try{
  const dir=await f.req.getDirectoryHandle('old-bundle',{create:true});dir.files.set('manifest.json',JSON.stringify(scoreRequest(f.api)));
  f.req.files.set('req-proof--melody.json',JSON.stringify({sound:'harp',notes:[[0,72]]}));await f.bridge.checkFolder();assert.equal(f.res.files.size,0);
  f.req.files.set('req-proof.json',JSON.stringify({schemaVersion:1,baseRevision:1,operations:[{op:'master.patch',values:{tempo:104}}]}));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'error');assert.match(f.receipt().error,/only format halo-score/);assert.equal(f.bridge.getStatus().pending,null);
 }finally{f.bridge.dispose()}
});

test('missing baseline requires human review; changes during review rebuild instead of overwriting',async()=>{
 const f=await scoreFixture();try{
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api,{baseRevision:0})));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');assert.deepEqual(f.bridge.getStatus().pending.conflicts,['TASK_BASE_UNAVAILABLE']);
  f.api.setEnabled(true);await f.api.applyOperations({schemaVersion:1,baseRevision:f.api.getProjectState().revision,operations:[{op:'master.patch',values:{tempo:80}}]});
  await f.bridge.applyPending();assert.equal(f.receipt().status,'pending_approval');assert.equal(f.api.getProjectState().project.tempo,80);
  await f.bridge.rejectPending();assert.equal(f.api.getProjectState().project.tempo,80);
 }finally{f.bridge.dispose()}
});

test('reject is terminal across reconnect, and receipts preserve warnings without inventing notes',async()=>{
 const f=await scoreFixture();try{
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api,{voices:{melody:{sound:'harp',notes:[[0,72]]}}})));await f.bridge.checkFolder();
  assert.ok(f.receipt().scoreReport.some(r=>r.code==='EMPTY_SECOND_HALF'));
  await f.bridge.rejectPending();assert.equal(f.receipt().status,'rejected');await f.bridge.checkFolder();assert.equal(f.bridge.getStatus().pending,null);
  const other=FileBridge.createBridge(f.api,{pollInterval:0});try{await other.connect(f.root);assert.equal(other.getStatus().pending,null);}finally{other.dispose()}
 }finally{f.bridge.dispose()}
});

test('unchanged metadata is an idle optimization; approval rereads companions',async()=>{
 const f=await scoreFixture();try{
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api,{voices:{melody:{file:'req-proof--melody.json'}}})));
  f.req.files.set('req-proof--melody.json',JSON.stringify({sound:'harp',notes:[[0,72],[127,76]]}));
  const original=f.req.getFileHandle.bind(f.req);let reads=0;
  f.req.getFileHandle=async(...args)=>{const h=await original(...args),get=h.getFile.bind(h);h.getFile=async()=>{const file=await get(),text=await file.text();return {size:text.length,lastModified:1,text:async()=>{reads++;return text}}};return h};
  await f.bridge.checkFolder();const initial=reads;await f.bridge.checkFolder();assert.equal(reads,initial);
  f.req.files.set('req-proof--melody.json',JSON.stringify({sound:'harp',notes:[[0,72],[127,79]]}));await f.bridge.applyPending();assert.match(f.receipt().error,/REQUEST_CHANGED/);assert.ok(reads>initial);
 }finally{f.bridge.dispose()}
});


test('all eight roles can be authored in both worlds with explicit compatible timbres',()=>{
 for(const world of ['ambient','reactor']){
  const {api}=createTestApp(),registry=FileBridge.generateInstruments(api.getCapabilities());
  const voices=Object.fromEntries(registry.tracks.map(role=>{
   const sound=registry.sounds.find(s=>s.world===world&&s.affinityRoles.includes(role.role)&&s.compatibleRoles.includes(role.role));
   return [role.role,{sound:sound.canonicalId,...(sound.pitched?{notes:[[0,role.role==='bass'?36:60],[127,role.role==='bass'?43:67]]}:{steps:[0,127]})}];
  }));
  const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{world,voices}),'orchestra');assert.equal(r.ok,true,r.error);
  assert.ok(r.preview.after.tracks.every(t=>t.on&&t.exact&&t.steps.at(-1)===127));
 }
});

test('manual has one current bilingual bridge section and shipped capabilities match the generator',()=>{
 const fs=require('node:fs'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 for(const lang of ['ru','en']){
  const section=html.match(new RegExp('<section class="guide-section" id="g-agents-'+lang+'">([^]*?)</section>'))[1];
  assert.ok(section.includes('halo-score'));assert.ok(section.includes('ID--role.json'));assert.ok(section.includes('GLASS=pulse'));
  assert.doesNotMatch(html.match(new RegExp('<section class="guide-section" id="g-export-'+lang+'">([^]*?)</section>'))[1],/File Bridge|halo-score|AGENT_GUIDE/);
 }
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname,'../capabilities.json'),'utf8')),FileBridge.generateCapabilities(createTestApp().api.getCapabilities()));
});

test('real directory roundtrip exports linked context, detects companion-only changes, approves exact notes and does not replay',async()=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 const tempRoot=path.resolve(__dirname,'../artifacts/file-bridge-v3-tests');await fs.mkdir(tempRoot,{recursive:true});
 const folder=await fs.mkdtemp(path.join(tempRoot,'roundtrip-'));
 function handle(dir){return {kind:'directory',name:path.basename(dir),
  async getDirectoryHandle(name,{create=false}={}){const target=path.join(dir,name);if(create)await fs.mkdir(target,{recursive:true});else await fs.access(target);return handle(target)},
  async getFileHandle(name,{create=false}={}){const target=path.join(dir,name);if(create){try{await fs.access(target)}catch{await fs.writeFile(target,'')}}else await fs.access(target);
   return {kind:'file',name,async getFile(){const bytes=await fs.readFile(target),stat=await fs.stat(target);return {size:bytes.length,lastModified:stat.mtimeMs,text:async()=>bytes.toString('utf8')}},async createWritable(){let text;return {async write(v){text=v},async close(){await fs.writeFile(target,text)}}}}},
  async *entries(){for(const entry of await fs.readdir(dir,{withFileTypes:true}))yield [entry.name,entry.isDirectory()?handle(path.join(dir,entry.name)):await this.getFileHandle(entry.name)]}
 }}
 const {api}=createTestApp(),bridge=FileBridge.createBridge(api,{pollInterval:0});
 try{
  await bridge.connect(handle(folder));
  for(const name of ['AGENT_GUIDE.md','capabilities.json','instruments.json','music-rules.json','project-state.json'])assert.ok((await fs.readFile(path.join(folder,name),'utf8')).length>0);
  const req=path.join(folder,'requests'),receiptPath=path.join(folder,'responses','req-disk.result.json');
  const receipt=async()=>JSON.parse(await fs.readFile(receiptPath,'utf8'));
  const companion=path.join(req,'req-disk--melody.json');
  await fs.writeFile(companion,JSON.stringify({sound:'harp',notes:[[0,72],[127,76]]}));
  await bridge.checkFolder();assert.equal(bridge.getStatus().pending,null,'companion first produces no request');
  await fs.writeFile(path.join(req,'req-disk.json'),JSON.stringify(scoreRequest(api,{voices:{melody:{file:'req-disk--melody.json'}}})));
  await bridge.checkFolder();const first=await receipt();assert.equal(first.status,'pending_approval');
  await fs.writeFile(companion,JSON.stringify({sound:'harp',notes:[[0,72],[127,79]]}));await bridge.checkFolder();
  assert.notEqual((await receipt()).submissionVersion,first.submissionVersion);await bridge.applyPending();assert.equal((await receipt()).status,'applied');
  assert.deepEqual(api.getProjectState().project.tracks[5].noteEvents,[{step:0,notes:[72]},{step:127,notes:[79]}]);
  const exported=JSON.parse(await fs.readFile(path.join(folder,'project-state.json'),'utf8'));assert.equal(exported.project,undefined);assert.equal(exported.score.baseRevision,undefined);assert.equal(exported.scoreExport.complete,true);
  await bridge.checkFolder();assert.equal(bridge.getStatus().pending,null);
 }finally{
  bridge.dispose();assert.equal(path.dirname(path.resolve(folder)),tempRoot,'cleanup is confined to this test parent');await fs.rm(folder,{recursive:true,force:true});
 }
});




test('composer workflow guide is bounded and has symbolic forms without scored music',()=>{
 const files=FileBridge.getContextFiles(createTestApp().api),guide=files['AGENT_GUIDE.md'];
 assert.doesNotMatch(guide,/\[\s*\[\s*\d|\[\s*\d+\s*,\s*\d+/);
 assert.doesNotMatch(guide,/```json|REPLACE_WITH|Mandatory bar audit|ROOT_VERIFIED|climax|cadence|solfege|D natural minor/);
 assert.match(guide,/format exactly halo-score/);assert.match(guide,/Before writing, check/);
 assert.doesNotMatch(guide,/baseRevision|submissionVersion/);assert.match(guide,/SAME task ID|SAME ID/);
 assert.match(guide,/canonicalId/);assert.ok(guide.length<=15000,'bounded workflow and symbolic forms without catalog duplication');
 const rules=JSON.parse(files['music-rules.json']);assert.equal(rules.barAudit,undefined);assert.equal(rules.orchestration,undefined);assert.equal(rules.keyChanges,undefined);
 assert.ok(rules.keys.includes('D MINOR'));assert.equal(rules.timeSignatures['3/4'].stepsPerBar,12);
});

test('schema-derived symbolic forms fill into requests accepted by the real receiver',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),caps=JSON.parse(files['capabilities.json']);
 const guide=files['AGENT_GUIDE.md'],templates=Object.fromEntries([...guide.matchAll(/### (\w+)\n\n```text\n([\s\S]*?)\n```/g)].map(m=>[m[1],m[2]]));
 assert.equal(caps.authoring.templates,undefined,'guide owns symbolic forms');
 assert.deepEqual(Object.keys(templates),['probe','replacePhrase','replaceSong','edit','patch','pitchedVoice','unpitchedVoice']);
 const registry=JSON.parse(files['instruments.json']);
 const pitched=registry.sounds.find(s=>s.world==='ambient'&&s.pitched&&s.compatibleRoles.includes('melody'));
 const hit=registry.sounds.find(s=>s.world==='ambient'&&!s.pitched&&s.compatibleRoles.includes('percussion'));
 function fill(value,key=''){
  if(Array.isArray(value))return value.map((v,i)=>fill(v,key==='notes'?(Array.isArray(v)?'event':i===0?'step':'pitch'):key==='event'?(i===0?'step':'pitch'):key==='steps'?'step':key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k.startsWith('⟨')?(k.includes('requested parameter')?'on':'melody'):k,fill(v,k.includes('requested parameter')?'on':k)]));
  if(typeof value!=='string'||!value.startsWith('⟨'))return value;
  const values={world:'ambient',tempo:96,bars:4,meter:'4/4',key:'C MAJOR',id:1,phrase:1,on:true,sound:pitched.canonicalId,step:0,pitch:60};
  assert.ok(key in values,'typed placeholder '+key);return values[key];
 }
 for(const [name,text]of Object.entries(templates)){
  assert.ok(guide.includes(text),name+' appears literally in guide');
  const symbolic=JSON.parse(text);
  function noMusic(v){if(Array.isArray(v))for(const x of v)noMusic(x);else if(v&&typeof v==='object')for(const x of Object.values(v))noMusic(x);else assert.equal(typeof v,'string','all creative values remain symbolic');}
  noMusic(symbolic);
  let request=fill(symbolic);
  if(name==='pitchedVoice')request={...fill(JSON.parse(templates.replacePhrase)),voices:{melody:request}};
  if(name==='unpitchedVoice')request={...fill(JSON.parse(templates.replacePhrase)),voices:{percussion:{...request,sound:hit.canonicalId}}};
  const result=FileBridge.parseAndValidateRequest(api,request,'filled-form');
  assert.equal(result.ok,true,name+': '+result.error);
 }
 assert.ok(guide.indexOf('## Required JSON structure')<guide.indexOf('## Vocabulary'));
 for(const [name,text]of Object.entries(files))assert.doesNotMatch(text,/\b(?:never|do not|must not|not allowed)\b/i,name+' uses affirmative instructions');
});

test('compact references preserve complete JSON data and bounded independently readable catalog rows',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),caps=api.getCapabilities();
 const documents={'capabilities.json':FileBridge.generateCapabilities(caps),'instruments.json':FileBridge.generateInstruments(caps),'music-rules.json':FileBridge.generateMusicRules(caps)};
 let referenceLines=files['AGENT_GUIDE.md'].split('\n').length;
 for(const [name,data]of Object.entries(documents)){
  assert.deepEqual(JSON.parse(files[name]),data,name+' round trips all catalog/schema/metadata values');
  referenceLines+=files[name].split('\n').length;
 }
 assert.ok(referenceLines<=450,'bounded reference package including full formal schema');
 for(const [name,text]of Object.entries(files))for(const line of text.split('\n')){
  assert.ok(line.length<=480,name+' exceeds character budget');
  assert.ok(Buffer.byteLength(line,'utf8')<=768,name+' exceeds UTF-8 byte budget');
 }
 const catalog=JSON.parse(files['instruments.json']);
 for(const sound of catalog.sounds){
  const id='"canonicalId": '+JSON.stringify(sound.canonicalId);
  const rows=files['instruments.json'].split('\n').filter(line=>line.includes(id));
  assert.equal(rows.length,1,sound.canonicalId+' has one readable record');
  assert.equal((rows[0].match(/"canonicalId":/g)||[]).length,1,'catalog records remain separate');
 }
 assert.equal(JSON.parse(files['capabilities.json']).authoring.templates,undefined);
});

test('compact note tuples preserve a full phrase through export while keeping score objects expanded',async()=>{
 const {api}=createTestApp(),notes=Array.from({length:128},(_,step)=>[step,60+step%12]);
 const request=scoreRequest(api,{voices:{melody:{sound:'harp',notes}}});
 const result=FileBridge.parseAndValidateRequest(api,request,'compact-events');assert.equal(result.ok,true,result.error);
 api.setEnabled(true);await api.applyOperations(result.transaction);
 const text=FileBridge.getContextFiles(api)['project-state.json'],state=JSON.parse(text);
 assert.deepEqual(state.score.voices.melody.notes,notes);
 assert.match(text,/"notes": \[\n\s*\[0, 60\], \[1, 61\]/);
 assert.match(text,/"score": \{\n\s*"format": "halo-score",\n/);
 assert.ok(text.split('\n').every(line=>line.length<=480));
 const accepted=FileBridge.parseAndValidateRequest(api,state.score,'compact-reimport');assert.equal(accepted.ok,true,accepted.error);
});

test('copied sparse score has a long melody/accompaniment gap even while percussion covers the whole phrase',()=>{
 const {api}=createTestApp();
 const score=scoreRequest(api,{voices:{melody:{sound:'harp',notes:[[0,72],[4,76],[120,79],[124,72]]},bass:{sound:'deep',notes:[[0,36],[112,43]]},harmony:{sound:'organ',notes:[[0,60,64,67],[112,59,62,67]]},percussion:{sound:'shaker',steps:[0,16,32,48,64,80,96,112]}}});
 const r=FileBridge.parseAndValidateRequest(api,score,'sparse');assert.equal(r.ok,true,r.error);
 assert.equal(r.scoreAudit.seconds,20);const p=r.scoreAudit.phrases[0];assert.equal(p.barSeconds,2.5);
 assert.deepEqual(p.voices.find(v=>v.role==='melody').attacksPerBar,[2,0,0,0,0,0,0,2]);
 assert.deepEqual(p.voices.find(v=>v.role==='percussion').attacksPerBar,Array(8).fill(1));
 for(const role of ['melody','bass','harmony'])assert.ok(r.scoreReport.some(x=>x.code==='PART_BAR_GAP'&&x.path==='score.'+role),role);
 assert.ok(!r.scoreReport.some(x=>x.code==='EMPTY_SECOND_HALF'),'the old global warning alone missed the problem');
});

test('bar audit distinguishes intended rests, generated parts and disabled authored events without rejecting music',()=>{
 const {api}=createTestApp();
 const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{melody:{sound:'harp',notes:[[16,72],[48,74],[80,76],[112,72]]},texture:{sound:'air',on:false,notes:[[0,60]]}}}),'rests');
 assert.equal(r.ok,true,r.error);assert.ok(!r.scoreReport.some(x=>x.code==='PART_BAR_GAP'));
 const texture=r.scoreAudit.phrases[0].voices.find(v=>v.role==='texture');assert.equal(texture.enabled,false);assert.equal(texture.attacksPerBar[0],1);
 const edit=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{mode:'edit',bars:4,voices:{melody:{notes:[[0,72],[48,76]]}}}),'edit-audit');assert.equal(edit.ok,true,edit.error);
 const generated=edit.scoreAudit.phrases[0].voices.find(v=>v.source==='generated');assert.ok(generated);assert.equal(generated.attacksPerBar,null);
});

test('audit counts song duration including section repeats and reports literal pitch classes',()=>{
 const {api}=createTestApp();
 const score=scoreRequest(api,{key:'D minor',phrases:[{id:1,bars:4,meter:'3/4',voices:{melody:{sound:'harp',notes:[[0,62],[47,70]]}}},{id:2,bars:8,meter:'3/4',voices:{bass:{sound:'deep',notes:[[0,38],[95,45]]}}}],sections:[{phrase:1,repeats:2},{phrase:2}]});delete score.voices;
 const r=FileBridge.parseAndValidateRequest(api,score,'timed-song');assert.equal(r.ok,true,r.error);assert.equal(r.scoreAudit.seconds,30);
 assert.deepEqual(r.scoreAudit.sections.map(s=>s.startSeconds),[0,15]);
 const p=r.scoreAudit.phrases[0];assert.equal(p.key,'D MINOR');assert.deepEqual(p.scalePitchClasses,[2,4,5,7,9,10,0]);assert.equal(p.barSeconds,1.875);
 assert.deepEqual(p.voices.find(v=>v.role==='melody').pitchClasses,[2,10]);
 const onlyLabel=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{key:'D minor',voices:{melody:{sound:'harp',notes:[[0,60],[127,64]]}}}),'literal-key');
 assert.deepEqual(onlyLabel.preview.after.tracks[5].noteEvents,[{step:0,notes:[60]},{step:127,notes:[64]}],'key changes never invent transposed MIDI');
});

test('status/approved objects never apply and rejection guidance never asks to resubmit the terminal ID',async()=>{
 const f=await scoreFixture();try{
  for(const status of ['approved','pending_approval','applied','rejected']){
   f.req.files.set('req-proof.json',JSON.stringify({id:'req-proof',status}));await f.bridge.checkFolder();
   assert.equal(f.receipt().status,'error');assert.match(f.receipt().error,/Fill the symbolic form/);assert.equal(f.bridge.getStatus().pending,null);
  }
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api)));await f.bridge.checkFolder();await f.bridge.rejectPending();
  const terminal=f.receipt();assert.match(terminal.instructionForAgent,/end this turn/);assert.doesNotMatch(terminal.instructionForAgent,/Correct only/);
  f.req.files.set('req-proof.json',JSON.stringify({id:'req-proof',status:'approved'}));await f.bridge.checkFolder();assert.deepEqual(f.receipt(),terminal);
  f.req.files.set('req-next.json',JSON.stringify(scoreRequest(f.api,{key:'D minor'})));await f.bridge.checkFolder();assert.equal(f.bridge.getStatus().pending.id,'req-next');
 }finally{f.bridge.dispose()}
});

test('receipts keep the same bar audit from review through application and give explicit stopping instructions',async()=>{
 const f=await scoreFixture();try{
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api)));await f.bridge.checkFolder();const pending=f.receipt();
  assert.equal(pending.status,'pending_approval');assert.match(pending.instructionForAgent,/only the user approves/);assert.ok(pending.scoreAudit);
  assert.deepEqual(f.bridge.getStatus().pending.scoreAudit,pending.scoreAudit);await f.bridge.applyPending();
  assert.equal(f.receipt().status,'applied');assert.deepEqual(f.receipt().scoreAudit,pending.scoreAudit);assert.match(f.receipt().instructionForAgent,/terminal/);
 }finally{f.bridge.dispose()}
});


test('NYE descriptive document fails with useful structural guidance and cannot be repaired by format alone',async()=>{
 const {api}=createTestApp();
 const descriptive={id:'NYE2026',baseRevision:api.getProjectState().revision,mode:'replace',world:'ambient',tempo:30,bars:8,meter:'4/4',key:'D minor',
  voices:{melody:[{sound:'bell'},{sound:'vibes'}],harmony:[{sound:'air'},{sound:'organ'}],percussion:[{sound:'shaker'},{sound:'hat'}]},
  lyrics:{theme:'holiday'},composition_notes:{development:'described, not scored'},bar_audit_plan:{seconds_per_bar:2.5}};
 const r=await FileBridge.processRequest(api,descriptive,'NYE2026');assert.equal(r.ok,false);assert.match(r.error,/root.format/);assert.match(r.help,/ONE object/);assert.match(r.help,/Fill the matching symbolic form/);
 const withFormat=FileBridge.parseAndValidateRequest(api,{...descriptive,format:'halo-score'},'NYE2026');
 assert.equal(withFormat.ok,false);assert.match(withFormat.error,/score.lyrics/);assert.match(withFormat.error,/score.voices.melody: expected one object/);
 assert.equal(FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{melody:{sound:'bell'}}}),'no-events').ok,false);
});

test('compact field contract accepts typed voices and exact events at the chosen tempo',()=>{
 const {api}=createTestApp();
 const score={format:'halo-score',mode:'replace',baseRevision:api.getProjectState().revision,world:'ambient',tempo:30,bars:8,meter:'4/4',key:'D minor',
  voices:{melody:{sound:'bell',notes:[[0,62],[127,65]]},percussion:{sound:'shaker',steps:[8,120]}}};
 const r=FileBridge.parseAndValidateRequest(api,score,'typed');assert.equal(r.ok,true,r.error);assert.equal(r.scoreAudit.seconds,64);assert.equal(r.scoreAudit.phrases[0].barSeconds,8);
 assert.deepEqual(r.preview.after.tracks[5].noteEvents,[{step:0,notes:[62]},{step:127,notes:[65]}]);
});


test('timing glossary is shared by context files and uses musical bars, quarter beats and phrase-local steps',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),guide=files['AGENT_GUIDE.md'];
 const caps=JSON.parse(files['capabilities.json']),rules=JSON.parse(files['music-rules.json']);
 assert.deepEqual(caps.timing,rules.timing);
 assert.match(caps.timing.BAR,/Ordinary musical BAR/);
 assert.match(caps.timing.POSITION,/within ONE PHRASE/);assert.match(caps.timing.POSITION,/Each different PHRASE.*starts again at 0/);
 assert.match(guide,/Read the full timing vocabulary in music-rules.json/);assert.match(guide,/BAR \(такт\)/);
 assert.match(guide,/4\/4 BAR.*lasts 2 s; eight last 16 s/);assert.match(guide,/positions 0\.\.15.*112\.\.127/);
});

test('musical timing and bar boundaries at 120 BPM agree with published glossary for both meters',()=>{
 const {api}=createTestApp();
 for(const [meter,lastStart,lastStep,seconds,barSeconds]of [['4/4',112,127,16,2],['3/4',84,95,12,1.5]]){
  const spb=meter==='4/4'?16:12;
  const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{tempo:120,meter,voices:{melody:{sound:'bell',notes:[[0,72],[spb-1,74],[spb,76],[lastStart,79],[lastStep,72]]}}}),'timing');
  assert.equal(r.ok,true,r.error);assert.equal(r.scoreAudit.seconds,seconds);assert.equal(r.scoreAudit.phrases[0].barSeconds,barSeconds);
  assert.deepEqual(r.scoreAudit.phrases[0].voices.find(v=>v.role==='melody').attacksPerBar,[2,1,0,0,0,0,0,2]);
 }
 const song=scoreRequest(api,{tempo:120,bars:4,voices:undefined,phrases:[{id:1,voices:{melody:{sound:'bell',notes:[[0,72]]}}},{id:2,voices:{melody:{sound:'bell',notes:[[0,76]]}}}],sections:[{phrase:1},{phrase:2}]});
 const r=FileBridge.parseAndValidateRequest(api,song,'phrase-local');assert.equal(r.ok,true,r.error);
 for(const p of r.scoreAudit.phrases)assert.deepEqual(p.voices.find(v=>v.role==='melody').attacksPerBar,[1,0,0,0]);
});


test('snapshot refresh rereads same-metadata corrections without replaying terminal IDs',async()=>{
 const f=await scoreFixture();try{
  const original=f.req.getFileHandle.bind(f.req);
  f.req.getFileHandle=async(...args)=>{const h=await original(...args),get=h.getFile.bind(h);h.getFile=async()=>{const file=await get(),text=await file.text();return {size:text.length,lastModified:1,text:async()=>text}};return h};
  const score=scoreRequest(f.api,{tempo:120});f.req.files.set('req-proof.json',JSON.stringify(score));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');
  f.req.files.set('req-proof.json',JSON.stringify({...score,tempo:140}));
  await f.bridge.refreshSnapshot();assert.equal(f.bridge.getStatus().pending.preview.after.tempo,140);
  await f.bridge.applyPending();assert.equal(f.receipt().status,'applied');const applied=f.api.getProjectState();
  f.req.files.set('req-proof.json',JSON.stringify({...score,tempo:100}));await f.bridge.refreshSnapshot();assert.deepEqual(f.api.getProjectState(),applied);
 }finally{f.bridge.dispose()}
});

test('bar gap diagnostics give missing absolute-step ranges instead of suggesting density in bar one',()=>{
 const {api}=createTestApp();
 for(const [meter,range,last]of [['4/4','16–127','15'],['3/4','12–95','11']]){
  const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{meter,voices:{melody:{sound:'bell',notes:[[0,72],[2,76],[4,79]]}}}),'one-bar');
  assert.equal(r.ok,true,r.error);const warning=r.scoreReport.find(w=>w.code==='PART_BAR_GAP'&&w.path==='score.melody');
  assert.ok(JSON.stringify(warning).includes('absoluteStep '+range));assert.ok(JSON.stringify(warning).includes('0–'+last));
  assert.equal(r.scoreAudit.phrases[0].voices.find(v=>v.role==='melody').attacksPerBar.filter(Boolean).length,1);
 }
});


test('step errors distinguish fractional positions, phrase bounds and duplicates without repairing authored music',()=>{
 const {api}=createTestApp(),before=api.getProjectState();
 for(const [notes,message]of [[[[0.5,72]],/must be an integer.*received 0.5/],[[[128,72]],/outside this phrase/],[[[0,72],[0,76]],/duplicate absoluteStep 0/]]){
  const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{melody:{sound:'bell',notes}}}),'step-error');
  assert.equal(r.ok,false);assert.match(r.error,message);assert.match(r.error,/score.voices.melody.notes\[/);assert.deepEqual(api.getProjectState(),before);
 }
});

test('fractional-step receipt explains the grid and same-ID correction produces fresh pending approval',async()=>{
 const f=await scoreFixture();try{
  const score=scoreRequest(f.api,{voices:{melody:{sound:'bell',notes:[[0.5,72],[127,76]]}}});
  f.req.files.set('req-proof.json',JSON.stringify(score));await f.bridge.checkFolder();const error=f.receipt();
  assert.equal(error.status,'error');assert.match(error.help,/sixteenth-note grid/);assert.match(error.instructionForAgent,/same ID and paths/);
  score.voices.melody.notes[0][0]=0;f.req.files.set('req-proof.json',JSON.stringify(score));await f.bridge.checkFolder();
  assert.equal(f.receipt().id,error.id);assert.equal(f.receipt().status,'pending_approval');assert.notEqual(f.receipt().submissionVersion,error.submissionVersion);
 }finally{f.bridge.dispose()}
});

test('copyable bilingual prompt focuses on music and delegates delivery rules to the guide',()=>{
 const fs=require('node:fs'),source=fs.readFileSync(require.resolve('../src/file-bridge.js'),'utf8');
 const prompt=source.slice(source.indexOf('const promptBox ='),source.indexOf('const api = {',source.indexOf('const promptBox =')));
 for(const text of ['Прочитай AGENT_GUIDE.md','Read AGENT_GUIDE.md','оригинальные партии','original parts','сообщи результат','report the result'])assert.ok(prompt.includes(text),text);
 assert.doesNotMatch(prompt,/baseRevision|submissionVersion|at most 2 corrections/);
 assert.match(FileBridge.getContextFiles(createTestApp().api)['AGENT_GUIDE.md'],/read error, help and instructionForAgent/);
});


async function seedTwoPhraseSong(api){
 const score=scoreRequest(api,{tempo:100,bars:4,voices:undefined,phrases:[
  {id:11,voices:{pulse:{sound:'pulse',steps:[0,16,32,48]},melody:{sound:'bell',notes:[[0,60],[32,64],[63,67]],duration:70}}},
  {id:22,bars:8,meter:'3/4',key:'D minor',voices:{pulse:{sound:'round',notes:[[0,36],[48,38]]},melody:{sound:'harp',notes:[[0,62],[48,65],[95,69]],space:45}}}
 ],sections:[{phrase:11,name:'intro'},{phrase:22,name:'chorus',repeats:2,fade:'out'}],repeat:true});
 const parsed=FileBridge.parseAndValidateRequest(api,score,'seed');assert.equal(parsed.ok,true,parsed.error);api.setEnabled(true);await api.applyOperations(parsed.transaction);return api.getProjectState();
}

test('snapshot exports all phrase events and parameters in directly accepted halo-score with live revision',async()=>{
 const {api}=createTestApp();await seedTwoPhraseSong(api);const before=api.getProjectState();
 const state=JSON.parse(FileBridge.getContextFiles(api)['project-state.json']);
 assert.equal(state.scoreExport.complete,true);assert.deepEqual(state.scoreExport.materialized,[]);assert.equal(state.project,undefined);
 assert.equal(state.score.baseRevision,undefined);assert.equal(state.score.phrases.length,2);assert.deepEqual(state.score.sections,before.project.sections);
 assert.equal(state.score.phrases[0].voices.melody.duration,70);assert.equal(state.score.phrases[1].voices.melody.space,45);
 const parsed=FileBridge.parseAndValidateRequest(api,state.score,'roundtrip');assert.equal(parsed.ok,true,parsed.error);
 assert.deepEqual(parsed.preview.after,before.project,'canonical full song reimports without losing notes, sounds, parameters or arrangement');
});

test('atomic parameter patch preserves every other field across mixed-meter phrases and timbres',async()=>{
 const {api}=createTestApp();await seedTwoPhraseSong(api);const before=api.getProjectState(),expected=structuredClone(before.project);
 expected.phrases[0].project.tracks[0].on=false;expected.phrases[1].project.tracks[5].level=30;
 const patch={format:'halo-score',mode:'patch',baseRevision:before.revision,patches:[{phraseId:11,voices:{pulse:{on:false}}},{phraseId:22,voices:{melody:{level:30}}}]};
 const r=FileBridge.parseAndValidateRequest(api,patch,'patch');assert.equal(r.ok,true,r.error);assert.deepEqual(r.preview.after,expected);assert.deepEqual(api.getProjectState(),before);
 await api.applyOperations(r.transaction);assert.deepEqual(api.getProjectState().project,expected);assert.equal(api.getProjectState().project.phrases[1].project.tracks[0].on,true,'pitched pulse in another phrase stays enabled');
 for(const bad of [
  {...patch,world:'reactor'},
  {...patch,patches:[patch.patches[0],{phraseId:999,voices:{melody:{on:false}}}]},
  {...patch,patches:[patch.patches[0],patch.patches[0]]},
  {...patch,patches:[{phraseId:11,voices:{melody:{notes:[[0,72]]}}}]},
  {...patch,patches:[{phraseId:11,voices:{melody:{sound:'bell'}}}]},
  {...patch,patches:[{phraseId:11,voices:{melody:{on:'false'}}}]}
 ]){bad.baseRevision=api.getProjectState().revision;const prior=api.getProjectState();assert.equal(FileBridge.parseAndValidateRequest(api,bad,'bad').ok,false);assert.deepEqual(api.getProjectState(),prior);}
});

test('single-phrase parameter patch needs no musical metadata and rejects stale revision atomically',()=>{
 const {api}=createTestApp(),before=api.getProjectState();
 const patch={format:'halo-score',mode:'patch',baseRevision:before.revision,patches:[{voices:{melody:{on:false}}}]};
 const r=FileBridge.parseAndValidateRequest(api,patch,'patch-one');assert.equal(r.ok,true,r.error);const expected=structuredClone(before.project);expected.tracks[5].on=false;assert.deepEqual(r.preview.after,expected);
 assert.equal(FileBridge.parseAndValidateRequest(api,{...patch,baseRevision:0},'stale').ok,false);assert.deepEqual(api.getProjectState(),before);
});

test('probe verifies real folder roundtrip without approval/mutation and its ID becomes the music request',async()=>{
 const f=await scoreFixture();try{
  const before=f.api.getProjectState();f.req.files.set('req-proof.json',JSON.stringify({format:'halo-score',mode:'probe',baseRevision:before.revision}));
  await f.bridge.checkFolder();const ready=f.receipt();assert.equal(ready.status,'ready');assert.equal(ready.applied,false);assert.equal(ready.id,'req-proof');assert.ok(ready.submissionVersion);
  assert.equal(f.bridge.getStatus().pending,null);assert.deepEqual(f.api.getProjectState(),before);
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api)));await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');assert.deepEqual(f.api.getProjectState(),before);assert.deepEqual(f.bridge.getStatus().pending.conflicts,[]);
 }finally{f.bridge.dispose()}
});

test('probe rejects forged readiness and music payloads; counters are HALO-owned',()=>{
 const {api}=createTestApp(),probe={format:'halo-score',mode:'probe',baseRevision:api.getProjectState().revision};
 assert.equal(FileBridge.parseAndValidateRequest(api,probe,'access-check').probe,true);
 for(const extra of [{status:'ready'},{voices:{}}])assert.equal(FileBridge.parseAndValidateRequest(api,{...probe,...extra},'access-check').ok,false);
});

test('generated snapshot discloses materialization and its emitted score passes the same validator',()=>{
 const {api}=createTestApp(),snapshot=JSON.parse(FileBridge.getContextFiles(api)['project-state.json']);
 assert.equal(snapshot.scoreExport.complete,true);assert.ok(snapshot.scoreExport.materialized.length);assert.match(snapshot.scoreExport.meaning,/Future generated cycles/);
 const r=FileBridge.parseAndValidateRequest(api,snapshot.score,'generated-cycle');assert.equal(r.ok,true,r.error);
});

test('unrepresentable snapshot never truncates notes or fabricates a complete score',()=>{
 const {api}=createTestApp(),state=api.getProjectState(),before=structuredClone(api.getProjectState());state.project.tracks[5].exact=true;state.project.tracks[5].steps=[0];state.project.tracks[5].noteEvents=[];
 const out=FileBridge.generateProjectState(state,api.getCapabilities());assert.equal(out.score,null);assert.equal(out.scoreExport.complete,false);assert.match(out.scoreExport.error,/Missing explicit MIDI/);assert.equal(out.project,undefined);assert.deepEqual(api.getProjectState(),before);
});

test('song-wide patch is reviewed once, reread on approval and applied as one revision',async()=>{
 const f=await scoreFixture();try{
  await seedTwoPhraseSong(f.api);await f.bridge.checkFolder();const before=f.api.getProjectState();
  const patch={format:'halo-score',mode:'patch',baseRevision:before.revision,patches:[{phraseId:11,voices:{melody:{on:false}}},{phraseId:22,voices:{melody:{on:false}}}]};
  f.req.files.set('req-proof.json',JSON.stringify(patch));await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');assert.deepEqual(f.api.getProjectState(),before);
  await f.bridge.applyPending();assert.equal(f.receipt().status,'applied');const after=f.api.getProjectState();assert.equal(after.revision,before.revision+1);
  const expected=structuredClone(before.project);for(const p of expected.phrases)p.project.tracks[5].on=false;assert.deepEqual(after.project,expected);
  const exported=JSON.parse(f.root.files.get('project-state.json'));assert.equal(exported.score.baseRevision,undefined);assert.ok(exported.score.phrases.every(p=>p.voices.melody.on===false));
 }finally{f.bridge.dispose()}
});


test('score projection preserves phrase start phase and effective literal MIDI',()=>{
 const {api}=createTestApp();const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{bars:4,voices:{melody:{sound:'bell',notes:[[0,60],[32,64],[63,67]]}}}),'phase');assert.equal(r.ok,true,r.error);
 const state={revision:api.getProjectState().revision,project:structuredClone(r.preview.after)};state.project.startStep=16;
 const exported=FileBridge.generateProjectState(state,api.getCapabilities());assert.equal(exported.scoreExport.complete,true);
 assert.deepEqual(exported.score.voices.melody.notes,[[16,64],[47,67],[48,60]]);
 assert.equal(FileBridge.parseAndValidateRequest(api,exported.score,'rotated').ok,true);
});


test('full canonical song roundtrip retains distinct per-phrase Track 09 references and settings',async()=>{
 const {api}=createTestApp();await seedTwoPhraseSong(api);const project=api.getProjectState().project;
 project.phrases[0].project.liveLoop={version:1,layerIds:[101],settings:{pitch:7,bars:2}};
 project.phrases[1].project.liveLoop={version:1,layerIds:[202],settings:{pitch:-3,bars:4}};
 await api.applyOperations({schemaVersion:1,baseRevision:api.getProjectState().revision,operations:[{op:'composition.replace',project}]});
 const state=JSON.parse(FileBridge.getContextFiles(api)['project-state.json']);const r=FileBridge.parseAndValidateRequest(api,state.score,'keep-loop');assert.equal(r.ok,true,r.error);
 assert.deepEqual(r.preview.after,api.getProjectState().project);
 const patch={format:'halo-score',mode:'patch',baseRevision:state.revision,patches:[{phraseId:11,voices:{pulse:{on:false}}},{phraseId:22,voices:{melody:{on:false}}}]};
 const p=FileBridge.parseAndValidateRequest(api,patch,'keep-loop-patch');assert.equal(p.ok,true,p.error);for(let i=0;i<2;i++)assert.deepEqual(p.preview.after.phrases[i].project.liveLoop,api.getProjectState().project.phrases[i].project.liveLoop);
});


test('canonical sound identity is unique and both formerly ambiguous hats retain their real source bank',async()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),registry=JSON.parse(files['instruments.json']);
 for(const world of ['ambient','reactor']){
  const rows=registry.sounds.filter(s=>s.world===world);assert.equal(new Set(rows.map(s=>s.canonicalId)).size,rows.length);
 }
 const hats=registry.sounds.filter(s=>s.world==='ambient'&&['RAIN','MOSS'].includes(s.bankId)&&s.canonicalId.endsWith('-hat'));
 assert.deepEqual(hats.map(s=>s.canonicalId),['rain-hat','moss-hat']);
 for(const sound of hats){
  const voice={sound:sound.canonicalId,steps:[0,16,64,127]},role=sound.compatibleRoles[0];
  const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{[role]:voice}}),'hat-test');assert.equal(r.ok,true,r.error);
  const t=r.preview.after.tracks.find(t=>t.role===role);assert.equal(t.instrument,sound.bankId);assert.equal(t.sound,'hat');assert.equal(r.scoreAudit.phrases[0].voices.find(v=>v.role===role).sound,sound.canonicalId);
  api.setEnabled(true);await api.applyOperations(r.transaction);
  const state=JSON.parse(FileBridge.getContextFiles(api)['project-state.json']);assert.deepEqual(state.score.voices[role].steps,voice.steps);assert.equal(state.score.voices[role].sound,sound.canonicalId);
  const edit=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{mode:'edit',voices:{[role]:{level:40}}}),'hat-edit');assert.equal(edit.ok,true,edit.error);assert.equal(edit.preview.after.tracks.find(t=>t.role===role).instrument,sound.bankId);
 }
 assert.equal(FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{percussion:{sound:'hat',steps:[0]}}}),'ambiguous').ok,false);
});

test('MIDI hard bounds differ from acoustic playback register without rewriting authored pitches',async()=>{
 const {api}=createTestApp(),registry=FileBridge.generateInstruments(api.getCapabilities());
 assert.deepEqual(registry.midiInputRange,{min:0,max:127,integer:true});assert.deepEqual(registry.sounds.find(s=>s.world==='ambient'&&s.canonicalId==='bell').acousticRange,[26,88]);
 const r=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{melody:{sound:'bell',notes:[[0,92],[127,127]]}}}),'register');assert.equal(r.ok,true,r.error);
 api.setEnabled(true);await api.applyOperations(r.transaction);
 const state=JSON.parse(FileBridge.getContextFiles(api)['project-state.json']);assert.deepEqual(state.score.voices.melody.notes,[[0,92],[127,127]]);
 for(const midi of [-1,128,60.5])assert.equal(FileBridge.parseAndValidateRequest(api,scoreRequest(api,{voices:{melody:{sound:'bell',notes:[[0,midi]]}}}),'register-bad').ok,false);
});

test('one machine-readable canonical schema separates mutually exclusive modes and snapshot has no engine fields',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),caps=JSON.parse(files['capabilities.json']),state=JSON.parse(files['project-state.json']);
 assert.equal(caps.requestSchema.$schema,'https://json-schema.org/draft/2020-12/schema');assert.equal(caps.requestSchema.oneOf.length,5);
 const [probe,phrase,song,edit,patch]=caps.requestSchema.oneOf;
 for(const shape of caps.requestSchema.oneOf){assert.equal(shape.additionalProperties,false);assert.ok(!shape.required.includes('baseRevision'));assert.ok(shape.required.includes('format'));}
 assert.ok(phrase.required.includes('voices'));assert.ok(!song.properties.voices);assert.ok(song.required.includes('phrases'));assert.ok(song.required.includes('sections'));
 assert.deepEqual(probe.required,['format','mode']);assert.ok(!probe.properties.voices);assert.ok(!patch.properties.world);assert.ok(patch.required.includes('patches'));assert.ok(edit.properties.phraseId);
 assert.doesNotMatch(files['capabilities.json'],/Fix ROOT|Fix STATE|Fix.*RECEIPT/);
 assert.doesNotMatch(files['project-state.json'],/"(?:project|visual|setup|noteEvents|startStep|noteTranspose|instrument)"\s*:/);
 assert.equal(state.score.baseRevision,undefined);assert.equal(typeof state.score.key,'string');assert.ok(state.score.meter);
 assert.equal(FileBridge.parseAndValidateRequest(api,state.score,'schema-export').ok,true);
});


test('presentation-tolerant score parsing preserves events and all semantic checks',()=>{
 const {api}=createTestApp(),score=scoreRequest(api),canonical=FileBridge.parseAndValidateRequest(api,score,'syntax');assert.equal(canonical.ok,true);
 const original=JSON.stringify(score,null,2);
 const variants=[
  '\uFEFF'+original,
  '```jsonc\n'+original+'\n```',
  original.replace('"tempo": 96,','"tempo": 96, // tempo, not bars\n /* keep literal events */'),
  original.replace(/\n}/,' ,\n}'),
  original.replace(/"/g,"'"),
  original.replace(/"(\w+)":/g,'$1:'),
  original.replace('"ambient"','ambient').replace('"replace"','replace'),
  original.replace('"tempo": 96,','"tempo": 96 '),
  original.replace('72\n','72,\n'),
  original.replace('72\n      ],','72\n      ] ')
 ];
 for(const text of variants){const r=FileBridge.parseAndValidateRequest(api,text,'syntax');assert.equal(r.ok,true,r.error+'\n'+text);assert.deepEqual(r.preview.after,canonical.preview.after);}
 const wrong=original.replace('"baseRevision": 1','"baseRevision": 0').replace('"tempo": 96,','"tempo": 96, // comment\n');assert.equal(FileBridge.parseAndValidateRequest(api,wrong,'syntax').ok,false);
 const fractional=original.replace('72\n','72.5\n');assert.equal(FileBridge.parseAndValidateRequest(api,fractional,'syntax').ok,false);
});

test('tolerant reader rejects ambiguous or executable data instead of inventing a score',()=>{
 const {api}=createTestApp(),original=JSON.stringify(scoreRequest(api));
 for(const text of [
  original.slice(0,-1), original.replace('"tempo":96','"tempo":'),
  original.replace('"tempo":96','"tempo":96,"tempo":120'),
  original.replace('"tempo":96','"tempo":Math.max(96,120)'),
  original.replace('"tempo":96','"tempo":NaN'),
  original.replace('"tempo":96','"tempo":1e999'),
  original.replace('"tempo":96','"tempo":096'),
  original.replace('"sound":"harp"','"sound":"harp'),
  original+' garbage', original+' /* unclosed',
  original.replace('"voices":','"__proto__":{"polluted":true},"voices":')
 ]){assert.equal(FileBridge.parseAndValidateRequest(api,text,'syntax-bad').ok,false,text);}
 assert.equal({}.polluted,undefined);
});

test('real folder loader accepts comments and companions through preview and approval without rewriting source',async()=>{
 const f=await scoreFixture();try{
  const score=scoreRequest(f.api,{voices:{melody:{file:'req-proof--melody.json'}}});
  const text=JSON.stringify(score,null,2).replace('"tempo": 96,','tempo: 96 // musical comment\n');
  f.req.files.set('req-proof.json',text);
  f.req.files.set('req-proof--melody.json',"{sound:'bell', notes:[[0 72] [32,76], [127,79],], /* keep notes */}");
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval',f.receipt().error);
  await f.bridge.applyPending();assert.equal(f.receipt().status,'applied');
  assert.deepEqual(f.api.getProjectState().project.tracks[5].noteEvents,[{step:0,notes:[72]},{step:32,notes:[76]},{step:127,notes:[79]}]);
  assert.equal(f.req.files.get('req-proof.json'),text);
 }finally{f.bridge.dispose()}
});


test('data lexer preserves comment delimiters and escapes inside strings and bounds nesting',()=>{
 const input="{label:'https://host/a/*literal*/', text:\"\\\"//literal\\\"\", unicode:'\\u0043', apostrophe:'it\\'s'}";
 assert.deepEqual(FileBridge.parseScoreText(input),{label:'https://host/a/*literal*/',text:'"//literal"',unicode:'C',apostrophe:"it's"});
 assert.throws(()=>FileBridge.parseScoreText('['.repeat(66)+'0'+']'.repeat(66)),/Nesting limit/);
 assert.throws(()=>FileBridge.parseScoreText('{value:[1,,2]}'),/Expected a complete data value/);
});


test('sixth edit workflow and mandatory duration review share a stable bilingual vocabulary across all five files',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),guide=files['AGENT_GUIDE.md'];
 const rows=guide.split('\n').filter(line=>/^\| [A-F]\./.test(line));assert.equal(rows.length,6);
 const edit=rows[5];assert.match(edit,/mode=edit/);assert.match(edit,/phraseId/);assert.match(edit,/Preserve ALL other PHRASE/);assert.match(edit,/Repeated references share its edit/);
 assert.match(guide,/musical idea spans the requested duration/);assert.match(guide,/Long REST[\s\S]*?must be deliberate parts/);assert.match(guide,/Preserve intentional silence/);
 const canonical=JSON.parse(files['capabilities.json']).terminology;
 assert.ok(canonical.BRIDGE_ROOT);assert.match(JSON.parse(files['instruments.json']).concepts.musicalRole,/`ROOT`=percussion/);
 assert.doesNotMatch(JSON.parse(files['instruments.json']).concepts.musicalRole,/BRIDGE_ROOT/);
 for(const [name,text]of Object.entries(files)){
  if(name.endsWith('.json'))assert.deepEqual(JSON.parse(text).terminology,canonical,name);
  for(const term of Object.keys(canonical))assert.ok(text.includes(term),name+' lacks '+term);
 }
 assert.doesNotMatch(guide,/phrase\/loop|bar\s*\/\s*measure|song\s*\/\s*composition/i);
 const state=JSON.parse(files['project-state.json']);assert.equal(state.score.format,'halo-score');assert.equal(state.score.mode,'replace');
 assert.equal(FileBridge.parseAndValidateRequest(api,state.score,'terminology-score').ok,true);
});


test('all context instructions are English and translations appear only in glossary parentheses, never property names',()=>{
 const files=FileBridge.getContextFiles(createTestApp().api);
 const cyrillic=/[\u0400-\u04ff]/;
 const translations=new Set(Object.values(JSON.parse(files['capabilities.json']).terminology).map(value=>value.match(/^[A-Z_]+ \(([^)]+)\):/)[1]));
 for(const [name,text]of Object.entries(files)){
  for(const match of text.matchAll(/\(([^()]*[\u0400-\u04ff][^()]*)\)/g))assert.ok(translations.has(match[1]),name+' has non-glossary Russian text');
  const withoutTranslations=text.replace(/\([^()]*[\u0400-\u04ff][^()]*\)/g,'');
  assert.equal(cyrillic.test(withoutTranslations),false,name+' has Russian outside glossary parentheses');
  if(!name.endsWith('.json'))continue;
  const doc=JSON.parse(text);
  function walk(value){
   if(Array.isArray(value)){for(const item of value)walk(item);return;}
   if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){
    assert.equal(cyrillic.test(key),false,name+' translated property '+key);
    assert.doesNotMatch(key,/\s*\([^)]*\)/,name+' decorated property '+key);
    walk(item);
   }
  }
  walk(doc);
  assert.ok(doc.terminology.PHRASE);assert.match(doc.terminology.PHRASE,/PHRASE \(фраза\)/);
 }
 const caps=JSON.parse(files['capabilities.json']);assert.deepEqual(Object.keys(caps.timing),['BAR','BEAT','TEMPO','STEP','POSITION','PHRASE','SECTION','REST']);
});

async function openTask(f){
 f.req.files.set('req-proof.json',JSON.stringify({format:'halo-score',mode:'probe'}));
 await f.bridge.checkFolder();assert.equal(f.receipt().status,'ready');
}
async function manualLevel(f,index,level){
 f.api.setEnabled(true);await f.api.applyOperations({schemaVersion:1,baseRevision:f.api.getProjectState().revision,operations:[{op:'track.patch',trackIndex:index,values:{level}}]});
}
test('bridge merges independent parameter edits and accepts no counters from agent',async()=>{
 const f=await scoreFixture();try{
  await openTask(f);await manualLevel(f,0,25);
  f.req.files.set('req-proof.json',JSON.stringify({format:'halo-score',mode:'patch',patches:[{voices:{melody:{level:35}}}]}));
  await f.bridge.checkFolder();assert.deepEqual(f.bridge.getStatus().pending.conflicts,[]);
  await f.bridge.applyPending();const p=f.api.getProjectState().project;assert.equal(p.tracks[0].level,25);assert.equal(p.tracks[5].level,35);
 }finally{f.bridge.dispose()}
});
test('overlap blocks auto apply and offers explicit user acceptance or rejection',async()=>{
 const f=await scoreFixture();try{
  await openTask(f);await manualLevel(f,5,25);f.bridge.setAutoApply(true);
  f.req.files.set('req-proof.json',JSON.stringify({format:'halo-score',mode:'patch',patches:[{voices:{melody:{level:50}}}]}));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');assert.ok(f.bridge.getStatus().pending.conflicts.length);assert.equal(f.api.getProjectState().project.tracks[5].level,25);
  await f.bridge.applyPending();assert.equal(f.receipt().status,'applied');assert.equal(f.api.getProjectState().project.tracks[5].level,50);
 }finally{f.bridge.dispose()}
});
test('full replacement conflicts after manual edits and missing baseline blocks auto apply',async()=>{
 const f=await scoreFixture();try{
  await openTask(f);await manualLevel(f,0,25);f.bridge.setAutoApply(true);
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api)));await f.bridge.checkFolder();assert.deepEqual(f.bridge.getStatus().pending.conflicts,['project']);
  await f.bridge.rejectPending();assert.equal(f.api.getProjectState().project.tracks[0].level,25);
  f.req.files.set('another.json',JSON.stringify(scoreRequest(f.api)));await f.bridge.checkFolder();assert.deepEqual(f.bridge.getStatus().pending.conflicts,['TASK_BASE_UNAVAILABLE']);
 }finally{f.bridge.dispose()}
});
test('three-way merging treats notes as atomic and merges stable phrase IDs independently',()=>{
 const base={phrases:[{id:1,project:{tracks:Array.from({length:8},()=>({level:50,notes:[[0,60]]}))}}]};
 const live=structuredClone(base),next=structuredClone(base);live.phrases[0].project.tracks[0].level=25;next.phrases[0].project.tracks[5].level=35;
 const conflicts=[],out=FileBridge.mergeBridgeState(base,live,next,'project',conflicts);assert.deepEqual(conflicts,[]);assert.equal(out.phrases[0].project.tracks[0].level,25);
 live.phrases[0].project.tracks[5].notes=[[0,62]];next.phrases[0].project.tracks[5].notes=[[0,64]];
 FileBridge.mergeBridgeState(base,live,next,'project',conflicts);assert.ok(conflicts.some(p=>p.endsWith('.notes')));
});

test('reconnect never recreates a baseline from an old ready receipt',async()=>{
 const f=await scoreFixture();let other;try{
  await openTask(f);f.bridge.dispose();await manualLevel(f,5,25);
  other=FileBridge.createBridge(f.api,{pollInterval:0});other.setAutoApply(true);await other.connect(f.root);
  f.req.files.set('req-proof.json',JSON.stringify({format:'halo-score',mode:'patch',patches:[{voices:{melody:{level:35}}}]}));
  await other.checkFolder();assert.deepEqual(other.getStatus().pending.conflicts,['TASK_BASE_UNAVAILABLE']);assert.equal(f.api.getProjectState().project.tracks[5].level,25);
  await other.rejectPending();assert.equal(f.receipt().status,'rejected');assert.equal(f.api.getProjectState().project.tracks[5].level,25);
 }finally{other?.dispose();f.bridge.dispose()}
});
test('identical concurrent patch values do not conflict and auto apply works with a live task',async()=>{
 const f=await scoreFixture();try{
  await openTask(f);await manualLevel(f,5,35);f.bridge.setAutoApply(true);
  f.req.files.set('req-proof.json',JSON.stringify({format:'halo-score',mode:'patch',patches:[{voices:{melody:{level:35}}}]}));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'applied');assert.equal(f.api.getProjectState().project.tracks[5].level,35);
 }finally{f.bridge.dispose()}
});

test('scoped score edit preserves independent manual changes and changes after preview require renewed approval',async()=>{
 const f=await scoreFixture();try{
  await openTask(f);await manualLevel(f,0,25);
  const score=scoreRequest(f.api,{mode:'edit',voices:{melody:{level:35}}});delete score.baseRevision;
  f.req.files.set('req-proof.json',JSON.stringify(score));await f.bridge.checkFolder();assert.deepEqual(f.bridge.getStatus().pending.conflicts,[]);
  await manualLevel(f,1,20);await f.bridge.applyPending();assert.equal(f.receipt().status,'pending_approval');assert.equal(f.api.getProjectState().project.tracks[5].level,50);
  await f.bridge.applyPending();const after=f.api.getProjectState().project;assert.equal(after.tracks[0].level,25);assert.equal(after.tracks[1].level,20);assert.equal(after.tracks[5].level,35);
 }finally{f.bridge.dispose()}
});
