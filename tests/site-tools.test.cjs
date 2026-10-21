const test=require('node:test'),assert=require('node:assert/strict');
const Bridge=require('../src/site-tools.js'),Agent=require('../src/agent.js'),P=require('../src/project.js'),Song=require('../src/song.js'),S=require('../src/sounds.js'),M=require('../src/motion.js'),C=require('../src/composition.js');
function app(modelContext={registerTool(){}}){const native=new Map();const nativeContext=modelContext?{registerTool(d,o){native.set(d.name,d);return modelContext.registerTool(d,o)}}:null;let project=P.capture(Object.keys(S.banks).map(name=>({...S.roles.initial('ambient',name),name,setup:'ambient',on:true,level:50,density:50,character:50,duration:50,space:30,pattern:[0,4,8,12]})),4,72,1,0,S,M),playing=false;const events={};const api=Agent.create({project:P,song:Song,sounds:S,composition:C,read:()=>project,write:async p=>{project=p},playback:async on=>{playing=on;return {playing}}});const tools=Bridge.install(api,{document:{modelContext:nativeContext},addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k]});const call=async(name,args={},options={})=>{const d=native.get(name);if(!d)throw Error('UNKNOWN_TOOL');const r=await d.execute(args,options);const data=JSON.parse(r.content[0].text);if(r.isError)throw Error(data.error);return data.result};return {api,tools,events,call}}
const tx=(api,operations)=>({schemaVersion:1,baseRevision:api.getProjectState().revision,operations});

test('registered WebMCP validates and preserves a borrowed timbre through apply, export and history',async()=>{
 const a=app();await a.tools.ready;
 const transaction=tx(a.api,[{op:'track.patch',trackIndex:5,values:{sound:'reactor-attack-piano'}}]);
 assert.equal((await a.call('halo_validate_operations',{transaction})).valid,true);
 const preview=await a.call('halo_preview_operations',{transaction});assert.equal(preview.after.tracks[5].soundWorld,'reactor');
 await a.call('halo_apply_operations',{transaction});assert.equal((await a.call('halo_export_project')).project.tracks[5].soundWorld,'reactor');
 await a.call('halo_undo');assert.equal((await a.call('halo_get_state')).project.tracks[5].soundWorld,undefined);
 await a.call('halo_redo');assert.equal((await a.call('halo_get_state')).project.tracks[5].soundWorld,'reactor');a.tools.dispose();
});
test('automatic native registration publishes schemas and shared commands; tools run through the existing API',async()=>{const registered=new Map(),a=app({async registerTool(d,options){registered.set(d.name,d);options.signal.addEventListener('abort',()=>registered.delete(d.name))}});assert.equal((await a.tools.ready).state,'registered');assert.equal(registered.size,10);const context=JSON.parse((await registered.get('halo_get_context').execute({})).content[0].text);assert.equal(context.result.state.project.tracks.length,8);const request=tx(a.api,[{op:'track.patch',trackIndex:5,values:{exact:true,steps:[0,2,6,10],noteEvents:[{step:0,notes:[74]},{step:2,notes:[77]},{step:6,notes:[81]},{step:10,notes:[77]}]}}]);const result=JSON.parse((await registered.get('halo_apply_operations').execute({transaction:request})).content[0].text);assert.equal(result.ok,true);assert.deepEqual(result.result.project.tracks[5].steps,[0,2,6,10]);assert.deepEqual(a.api.getProjectState().project,result.result.project);a.tools.dispose();assert.equal(registered.size,0)});
test('native WebMCP supports batch edits, preview and history',async()=>{const a=app();assert.equal((await a.tools.ready).state,'registered');const before=await a.call('halo_get_state');const request=tx(a.api,[{op:'track.patch',trackIndex:5,values:{space:66}},{op:'master.patch',values:{masterVolume:41}}]);const p=await a.call('halo_preview_operations',{transaction:request});assert.equal(p.after.masterVolume,41);assert.deepEqual(await a.call('halo_get_state'),before);await a.call('halo_apply_operations',{transaction:request});await a.call('halo_undo');assert.deepEqual(a.api.getProjectState().project,before.project);await a.call('halo_redo');assert.equal(a.api.getProjectState().project.masterVolume,41);assert.equal((await a.call('halo_export_project')).project.masterVolume,41)});
test('invalid batches and stale revisions fail without changing the score or unhandled rejections',async()=>{const registered=new Map(),a=app({registerTool:d=>registered.set(d.name,d)});await a.tools.ready;const before=a.api.getProjectState(),request=tx(a.api,[{op:'master.patch',values:{tempo:95}},{op:'track.patch',trackIndex:99,values:{level:20}}]);const result=await registered.get('halo_apply_operations').execute({transaction:request});assert.equal(result.isError,true);assert.deepEqual(a.api.getProjectState(),before);await a.call('halo_apply_operations',{transaction:tx(a.api,[{op:'master.patch',values:{tempo:99}}])});await assert.rejects(a.call('halo_apply_operations',{transaction:request}),/CONFLICT/)});
test('registration failure exposes no command bridge',async()=>{const a=app({registerTool(){throw new Error('Unsupported schema')}});assert.equal((await a.tools.ready).state,'failed');assert.equal(a.tools.getStatus().errors.length,10);assert.equal(a.tools.callTool,undefined);assert.equal(a.tools.listTools,undefined)});
test('only current document WebMCP is supported; unsupported browsers expose no commands',async()=>{const a=app(null);assert.equal((await a.tools.ready).state,'unsupported');assert.equal(a.tools.callTool,undefined);const bridge=Bridge.install(a.api,{document:{},navigator:{modelContext:{registerTool(){throw Error('legacy must not run')}}}});assert.equal((await bridge.ready).state,'unsupported')});
test('aborted tool calls, unknown arguments and disposed bridges cannot mutate',async()=>{const a=app(),before=a.api.getProjectState();await a.tools.ready;const cancel=new AbortController();cancel.abort();await assert.rejects(a.call('halo_playback',{playing:true},{signal:cancel.signal}),/CANCELLED/);await assert.rejects(a.call('halo_get_state',{url:'https://example.com'}),/ARGUMENTS/);await assert.rejects(a.call('halo_playback',{playing:'yes'}),/ARGUMENTS/);await assert.rejects(a.call('eval',{code:'...'}),/UNKNOWN_TOOL/);a.tools.dispose();await assert.rejects(a.call('halo_get_context'),/DISPOSED/);assert.deepEqual(a.api.getProjectState(),before)});
test('tab lifecycle keeps tools for BFCache and disposes on ordinary teardown',async()=>{let signal;const a=app({registerTool(_d,o){signal=o.signal}});await a.tools.ready;a.events.pagehide({persisted:true});assert.equal(signal.aborted,false);a.events.pagehide({persisted:false});assert.equal(signal.aborted,true)});
test('sample metadata catalog remains exactly matched to the local rights manifest, without PCM',()=>{const catalog=require('../src/sample-catalog.js'),manifest=require('../assets/reactor/manifest.json');assert.deepEqual(catalog,manifest.samples.map(({id,bank,root,duration,localFile})=>({id,bank,root,duration,localFile})));assert.equal(catalog.length,130);assert.doesNotMatch(JSON.stringify(catalog),/base64|downloadURL/)});

test('actual WebMCP control score is a portable exact eight-bar project with original parts and safe bounded master',async()=>{
 const score=require('../examples/ai/webmcp-jingle.halo.json'),a=app();await a.tools.ready;
 const request=tx(a.api,[{op:'project.replace',project:score}]);
 assert.equal((await a.call('halo_validate_operations',{transaction:request})).valid,true);
 await a.call('halo_apply_operations',{transaction:request});
 const saved=(await a.call('halo_export_project')).project;
 assert.deepEqual(saved,score);assert.equal(score.bars,8);assert.equal(score.key,5);assert.equal(score.tempo,108);
 assert.equal(score.tracks.filter(t=>t.on).length,7);
 const pcs=new Set([7,9,11,0,2,4,6]);for(const i of [4,5,6,7]){const t=score.tracks[i];assert.equal(t.exact,true);assert.equal(t.noteTranspose,5);assert.ok(t.noteEvents.length>0);for(const e of t.noteEvents){assert.ok(e.step<128);assert.ok(e.notes.every(n=>pcs.has(n%12)))}}
});

test('published WebMCP operation enum matches engine capabilities including project.patch',async()=>{
 const registered=new Map(),a=app({registerTool:d=>registered.set(d.name,d)});await a.tools.ready;
 const context=await a.call('halo_get_context');
 for(const name of ['halo_validate_operations','halo_preview_operations','halo_apply_operations']){
  const schema=registered.get(name).inputSchema.properties.transaction.properties.operations.items;
  assert.deepEqual([...schema.properties.op.enum].sort(),[...context.capabilities.operations].sort());
 }
 const request=tx(a.api,[{op:'project.patch',values:{tempo:96,bars:8,key:2}}]);
 assert.equal((await a.call('halo_validate_operations',{transaction:request})).valid,true);
 await a.call('halo_apply_operations',{transaction:request});assert.equal((await a.call('halo_get_state')).project.key,2);a.tools.dispose();
});
