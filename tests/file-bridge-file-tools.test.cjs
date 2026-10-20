const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {FileTools}=require('../scripts/file-bridge-regression/file-tools.cjs');
const {createReceiver}=require('../scripts/file-bridge-regression/receiver.cjs');
const {protocolChecks}=require('../scripts/file-bridge-regression/protocol-checks.cjs');
async function fixture(t){const parent=path.resolve(__dirname,'../artifacts/file-bridge-tool-tests');await fs.mkdir(parent,{recursive:true});const run=await fs.mkdtemp(path.join(parent,'tools-')),root=path.join(run,'shared'),receiver=await createReceiver(root),tools=new FileTools(root,path.join(run,'access.jsonl'),receiver);tools.beginStep(1);t.after(()=>receiver.dispose());return {root,receiver,tools}}
test('external file adapter cannot read code, traverse paths, create directories or write state/receipts',async t=>{
 const {tools}=await fixture(t);
 for(const name of ['../src/file-bridge.js','C:/secret.json','requests/../project-state.json','requests/nested/id.json'])await assert.rejects(tools.call('read',{path:name}),/PATH_DENIED/);
 for(const name of ['project-state.json','AGENT_GUIDE.md','responses/id.result.json'])await assert.rejects(tools.call('write',{path:name,content:'{}'}),/WRITE_DENIED/);
 assert.ok(tools.events.every(e=>!e.ok));assert.ok((await tools.call('list',{})).includes('requests'));
});
test('external writes are delivered unchanged to real HALO and its exact error receipt',async t=>{
 const {tools,root}=await fixture(t),content='{"id":"wrong","status":"approved"}';
 await tools.call('write',{path:'requests/wrong.json',content});assert.equal(await fs.readFile(path.join(root,'requests/wrong.json'),'utf8'),content);
 const receipt=JSON.parse(await tools.call('read',{path:'responses/wrong.result.json'}));assert.equal(receipt.id,'wrong');assert.equal(receipt.ok,false);assert.equal(receipt.status,'error');assert.match(receipt.error,/format|halo-score/i);
});
test('external repeated receipt reads and repeated writes are bounded and logged as violations',async t=>{
 const {tools}=await fixture(t);await tools.call('write',{path:'requests/bad.json',content:'{}'});
 for(let i=0;i<3;i++)await tools.call('read',{path:'responses/bad.result.json'});
 await assert.rejects(tools.call('read',{path:'responses/bad.result.json'}),/RECEIPT_READ_BUDGET/);
 await tools.call('write',{path:'requests/bad.json',content:'{}'});await tools.call('write',{path:'requests/bad.json',content:'{}'});
 await assert.rejects(tools.call('write',{path:'requests/bad.json',content:'{}'}),/WRITE_BUDGET/);
 tools.closed=true;await assert.rejects(tools.call('list',{}),/TURN_CLOSED/);
});
test('HALO regression receiver refuses an existing folder instead of touching user contents',async t=>{
 const {root}=await fixture(t);await assert.rejects(createReceiver(root),/EEXIST/);
});
function event(tool,path,extra={}){return {tool,path,ok:true,...extra}}
function delivered(){return [event('read','AGENT_GUIDE.md'),event('read','project-state.json'),event('write','requests/new.json'),event('read','requests/new.json'),event('read','responses/new.result.json',{receipt:{id:'new',status:'pending_approval'}})]}
test('protocol evaluator accepts one learned guide in a session and ignores an older terminal receipt',()=>{
 const es=delivered().slice(1);es.splice(1,0,event('read','responses/old.result.json',{receipt:{id:'old',status:'applied'}}));
 assert.ok(protocolChecks(es,[{request:'requests/old.json'}]).checks.every(c=>c.pass));
 assert.equal(protocolChecks(es,[]).checks.find(c=>c.name.startsWith('guide learned')).pass,false);
});
test('protocol evaluator fails post-pending activity, retired ID reuse and missing readback',()=>{
 assert.equal(protocolChecks([...delivered(),event('read','project-state.json')]).checks.find(c=>c.name.startsWith('stop after')).pass,false);
 assert.equal(protocolChecks(delivered(),[{request:'requests/new.json'}]).checks.find(c=>c.name.startsWith('one fresh')).pass,false);
 assert.equal(protocolChecks(delivered().filter(e=>e.tool!=='read'||e.path!=='requests/new.json')).checks.find(c=>c.name==='published root read back').pass,false);
});
test('protocol evaluator tolerates an absent receipt before the real matching receipt, not wrong-ID success',()=>{
 const es=delivered();es.splice(4,0,{tool:'read',path:'responses/new.result.json',ok:false,error:'ENOENT: not ready'});
 assert.ok(protocolChecks(es).checks.every(c=>c.pass));
 es.at(-1).receipt.id='old';assert.equal(protocolChecks(es).checks.find(c=>c.name.startsWith('stop after')).pass,false);
});
test('live CLI configuration fixes Luna low and disables external workspace tools',()=>{
 const {argsFor}=require('../scripts/file-bridge-regression/run.cjs'),args=argsFor('pipe',null).join('\n');
 assert.match(args,/gpt-6-luna/);assert.match(args,/model_reasoning_effort="low"/);
 for(const flag of ['shell_tool','apps','plugins','multi_agent'])assert.ok(args.includes('features.'+flag+'=false'));
 assert.match(args,/project_doc_max_bytes=0/);assert.match(args,/web_search="disabled"/);assert.ok(args.includes('--ignore-user-config'));assert.ok(args.includes('read-only'));
});
