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
test('composer guide includes every catalog timbre and its exact natural/other musical parts',()=>{
 const {api}=createTestApp(),files=FileBridge.getContextFiles(api),guide=files['AGENT_GUIDE.md'];
 const registry=JSON.parse(files['instruments.json']);
 const rows=guide.split('\n').filter(line=>line.startsWith('| ')&&!line.startsWith('| sound ID')&&!line.startsWith('| ---'));
 assert.equal(rows.length,registry.sounds.length);
 for(const [i,sound]of registry.sounds.entries()){
  const cells=rows[i].split('|').slice(1,-1).map(v=>v.trim());
  assert.deepEqual(cells,[sound.canonicalId,sound.name+(sound.pitched?' (pitched)':' (unpitched)'),sound.affinityRoles.join(', '),sound.compatibleRoles.filter(r=>!sound.affinityRoles.includes(r)).join(', ')||'none']);
 }
 assert.match(guide,/choose sound explicitly for each authored part/);
 assert.match(guide,/HALO does not compose missing notes/);
 assert.doesNotMatch(guide,/skip this if defaults are fine|optional sounds|Do not read the full engine\/API catalogs/);
});

test('every advertised instrument can score an original part through the real engine validator',()=>{
 const {api}=createTestApp(),registry=JSON.parse(FileBridge.getContextFiles(api)['instruments.json']);
 for(const sound of registry.sounds){
  const role=sound.affinityRoles[0],pitched=sound.pitched;
  const voice={sound:sound.canonicalId,...(pitched?{notes:[[0,60],[124,67]]}:{steps:[0,124]})};
  const result=FileBridge.parseAndValidateRequest(api,scoreRequest(api,{world:sound.world,voices:{[role]:voice}}),'instrument');
  assert.equal(result.ok,true,sound.world+'/'+sound.canonicalId+': '+result.error);
  const track=result.preview.after.tracks.find(t=>t.role===role);
  assert.equal(track.sound.replace(/^(ambient|reactor)-/,''),sound.canonicalId);
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

test('the score syntax example preserves explicit timbre choices and authored notes without bank or operation fields',()=>{
 const {api}=createTestApp(),guide=FileBridge.getContextFiles(api)['AGENT_GUIDE.md'];
 const score=JSON.parse(guide.split('## Syntax example')[1].match(/```json\n([^]*?)\n```/)[1]); score.baseRevision=api.getProjectState().revision;
 const before=api.getProjectState();
 const result=FileBridge.parseAndValidateRequest(api,score,'req-jingle');
 assert.equal(result.ok,true,result.error);
 const after=result.preview.after;
 assert.equal(after.tracks.length,8);assert.equal(after.bars,8);assert.equal(after.tempo,96);assert.equal(after.key,2);
 assert.equal(after.setup,'ambient');assert.equal(after.tracks[5].sound,'harp');assert.equal(after.tracks[4].sound,'deep');
 assert.equal(after.tracks[5].name,'VEIL');assert.equal(after.tracks[5].instrument,'EMBER');assert.equal(after.tracks[7].sound,'organ');assert.equal(after.tracks[2].sound,'brush');
 assert.deepEqual(after.tracks[5].noteEvents,score.voices.melody.notes.map(([step,...notes])=>({step,notes})));
 assert.equal(after.tracks[5].noteTranspose,-2);assert.equal(after.tracks[0].on,false);
 assert.deepEqual(api.getProjectState(),before,'Preview never mutates the project');
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
  const exported=JSON.parse(root.files.get('project-state.json'));assert.deepEqual(exported.project,applied.project);
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
  assert.equal(JSON.parse(rootFiles.get('project-state.json')).project.tempo, 135);
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


test('compact export preserves complete song state without computing a second score', () => {
  const fs=require('node:fs'),path=require('node:path');
  const {api}=createTestApp();
  const project=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/ai/adventure-song.halo.json'),'utf8'));
  const state={revision:17,project,visual:{scene:'ORBIT'}};
  const files=FileBridge.getContextFiles({getCapabilities:()=>api.getCapabilities(),getProjectState:()=>state,getContext(){throw Error('Derived score must not be requested')}});
  const exported=JSON.parse(files['project-state.json']);
  assert.deepEqual(exported.project,project);
  assert.equal(exported.revision,17);
  assert.equal(exported.music,undefined);
  const caps=JSON.parse(files['capabilities.json']);
  const inst=JSON.parse(files['instruments.json']),engine=api.getCapabilities();
  assert.equal(inst.sounds.length,62);
  for(const role of inst.tracks){
    const source=engine.roles[role.trackIndex];
    assert.equal(role.maxNotes,source.maxNotes);
    assert.deepEqual(role.policy,source.policy);
    assert.deepEqual(role.noteRange,{minMidi:source.minMidi??24,maxMidi:source.maxMidi??96});
  }
  for(const sound of inst.sounds){
    const source=engine.catalog[sound.world][sound.bankId].sounds.find(s=>s.id.replace(/^(ambient|reactor)-/,'')===sound.canonicalId);
    assert.deepEqual(sound.compatibleRoles,source.playback.compatibleRoles);
    assert.deepEqual(sound.noteRange,source.playback.range);
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
 assert.equal(rules.soundWorlds.ambient.defaultVoices,undefined);
 for(const sound of inst.sounds){assert.ok(sound.bankId);assert.equal(sound.id,undefined);assert.equal(sound.sound,undefined);assert.equal(sound.instrument,undefined);}
 assert.doesNotMatch(guide,/Current revision:|Current tempo:/);
 for(const state of ['ROOT_VERIFIED','REVISION_READ','ID_FIXED','SCORE_READY','REQUEST_WRITTEN','RECEIPT_CHECKED','RESULT'])assert.ok(guide.includes('**'+state+'**'));
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
 for(const field of ['mode','world','tempo','bars','meter','key','baseRevision']){
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

test('stale revision is never automatically rebased and later manual edits block approval',async()=>{
 const f=await scoreFixture();try{
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api,{baseRevision:0})));
  await f.bridge.checkFolder();assert.equal(f.receipt().status,'error');assert.match(f.receipt().error,/CONFLICT_REVISION/);
  assert.equal(FileBridge.parseAndValidateRequest(f.api,scoreRequest(f.api,{baseRevision:0}),'stale',{allowRebase:true}).ok,false);
  f.req.files.set('req-proof.json',JSON.stringify(scoreRequest(f.api)));await f.bridge.checkFolder();assert.equal(f.receipt().status,'pending_approval');
  f.api.setEnabled(true);await f.api.applyOperations({schemaVersion:1,baseRevision:f.api.getProjectState().revision,operations:[{op:'master.patch',values:{tempo:80}}]});
  await f.bridge.applyPending();assert.equal(f.receipt().status,'error');assert.equal(f.api.getProjectState().project.tempo,80);
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
  assert.ok(section.includes('ROOT_VERIFIED'));assert.ok(section.includes('ID--role.json'));assert.ok(section.includes('GLASS=pulse'));
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
  const exported=JSON.parse(await fs.readFile(path.join(folder,'project-state.json'),'utf8'));assert.deepEqual(exported.project,api.getProjectState().project);
  await bridge.checkFolder();assert.equal(bridge.getStatus().pending,null);
 }finally{
  bridge.dispose();assert.equal(path.dirname(path.resolve(folder)),tempRoot,'cleanup is confined to this test parent');await fs.rm(folder,{recursive:true,force:true});
 }
});


test('every complete guide JSON example validates through the same score compiler',async()=>{
 const {api}=createTestApp(),guide=FileBridge.getContextFiles(api)['AGENT_GUIDE.md'];
 const examples=[...guide.matchAll(/```json\n([^]*?)\n```/g)].map(m=>JSON.parse(m[1]));assert.equal(examples.length,3);
 for(const score of examples){score.baseRevision=api.getProjectState().revision;
  const r=await FileBridge.resolveAndValidateRequest(api,score,async()=>JSON.stringify({sound:'harp',notes:[[0,72],[124,72]]}),'req-jingle-k7p4');
  assert.equal(r.ok,true,r.error);
 }
});
