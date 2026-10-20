// Opt-in live-model evaluation. No authored reference music or score repair.
const fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),readline=require('node:readline'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {createReceiver}=require('./receiver.cjs'),{FileTools}=require('./file-tools.cjs'),{evaluateStep}=require('./acceptance.cjs'),scenario=require('./scenario.json');
const {protocolChecks}=require('./protocol-checks.cjs');
const base=path.resolve(__dirname,'../../artifacts/file-bridge-regression');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const runDir=path.join(base,stamp),folder=path.join(runDir,'shared');
const cli=process.env.HALO_CODEX_BIN||'codex';
const diagnostic=process.argv.includes('--diagnostic');
const config=[
 'model_reasoning_effort="low"','features.shell_tool=false','features.shell_snapshot=false','features.apps=false','features.plugins=false',
 'features.multi_agent=false','features.skill_search=false','features.skip_host_skill_discovery=true',
 'project_doc_max_bytes=0','web_search="disabled"','approval_policy="never"',
 ...['list','read','write','wait'].map(name=>'mcp_servers.shared.tools.'+name+'.approval_mode="approve"'),
 'developer_instructions="Use only the shared-folder file tools. The connected folder is your entire workspace. No other sources or filesystem tools."'
];
function argsFor(pipe,session){
 const args=['exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','-C',folder,'--sandbox','read-only','--model',scenario.model,'--json'];
 const mcp='mcp_servers.shared={command='+JSON.stringify(process.execPath)+',args=['+[path.join(__dirname,'mcp.cjs'),pipe].map(v=>JSON.stringify(v)).join(',')+'],startup_timeout_sec=20,required=true}';
 // Define the server before its per-tool config overrides.
 for(const c of [mcp,...config])args.push('-c',c);
 if(session)args.push('resume',session);
 args.push('-');return args;
}
async function runModel(pipe,step,session){
 const args=argsFor(pipe,session),prefix=path.join(runDir,'step-'+step.id);
 await fs.writeFile(prefix+'-prompt.txt',step.prompt+'\n');
 return new Promise((resolve,reject)=>{
  const env={...process.env};
  // Do not attach the standalone composer to the parent desktop task/tools.
  for(const name of ['CODEX_APP_TOOLS_PIPE_PATH','CODEX_THREAD_ID','CODEX_SESSION_ID','CODEX_TOOL_CALL_ID','CODEX_INTERNAL_ORIGINATOR_OVERRIDE'])delete env[name];
  const child=spawn(cli,args,{cwd:folder,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill()},240000);
  child.stdout.on('data',b=>{stdout+=b});child.stderr.on('data',b=>{stderr+=b});child.on('error',e=>{clearTimeout(timer);reject(e)});
  child.on('close',async code=>{clearTimeout(timer);try{
   await fs.writeFile(prefix+'-model.jsonl',stdout);await fs.writeFile(prefix+'-stderr.log',stderr);
   const events=stdout.split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
   const thread=events.find(e=>e.type==='thread.started');
   resolve({code,timedOut,session:thread?.thread_id||session,events});
  }catch(e){reject(e)}});
  child.stdin.end(step.prompt+'\n');
 });
}
async function main(){
 await fs.mkdir(runDir,{recursive:true});
 const report={version:1,mode:diagnostic?'diagnostic-continuation':'strict',startedAt:new Date().toISOString(),model:scenario.model,reasoningEffort:'low',folder,runDir,
  environment:'Real Node filesystem + production HALO receiver/API; no native browser picker or listening acceptance.',
  isolation:'Luna: ignored user config/rules/project docs, shell/apps/plugins/web/delegation disabled, read-only built-in sandbox; only folder MCP writes. Sol evaluator never writes requests/context/receipts.',steps:[],pass:false,musicalReview:'NOT_PERFORMED'};
 report.criteriaSha256=crypto.createHash('sha256').update(await fs.readFile(path.join(__dirname,'acceptance.cjs'))).digest('hex');
 await fs.writeFile(path.join(runDir,'launch-config.json'),JSON.stringify({model:scenario.model,config,scenario},null,2));
 const receiver=await createReceiver(folder),tools=new FileTools(folder,path.join(runDir,'file-access.jsonl'),receiver);
 const pipe=process.platform==='win32'?'\\\\.\\pipe\\halo-regression-'+crypto.randomUUID():path.join(runDir,'tools.sock');
 const server=net.createServer(s=>{const rl=readline.createInterface({input:s});rl.once('line',async line=>{try{const m=JSON.parse(line),result=await tools.call(m.name,m.args);s.end(JSON.stringify({result})+'\n')}catch(e){s.end(JSON.stringify({error:e.message})+'\n')}})});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(pipe,resolve)});
 let session,history=[];
 try{
  for(const step of scenario.steps){
   tools.beginStep(step.id);const before=structuredClone(receiver.state());
   console.log('STEP '+step.id+' START '+new Date().toISOString());
   const model=await runModel(pipe,step,session);session=model.session;tools.closed=true;
   const pending=receiver.bridge.getStatus().pending;
   const result={id:step.id,prompt:step.prompt,modelExit:model.code,modelTimedOut:model.timedOut,session,checks:[],accepted:false};
   const add=(name,pass,details)=>result.checks.push({name,pass:!!pass,details});
   add('model completed',model.code===0&&!model.timedOut,model.code);
   const nonFileTools=model.events.filter(e=>e.type==='item.started'&&['command_execution','file_change','web_search','collab_tool_call'].includes(e.item?.type)||e.item?.type==='mcp_tool_call'&&e.item.server!=='shared');
   add('no tools outside shared folder',nonFileTools.length===0,nonFileTools);
   const {checks,roots}=protocolChecks(tools.events,history);result.checks.push(...checks);
   add('HALO has pending proposal',!!pending,pending?.id);
   if(pending){
    const receipt=JSON.parse(await fs.readFile(path.join(folder,'responses',pending.id+'.result.json'),'utf8'));
    add('matching pending receipt was actually read',receipt.status==='pending_approval'&&roots[0]==='requests/'+receipt.id+'.json'&&tools.events.some(e=>e.tool==='read'&&e.path==='responses/'+receipt.id+'.result.json'&&e.ok),receipt.status);
    const files={};for(const rel of tools.events.filter(e=>e.tool==='write'&&e.ok).map(e=>e.path))files[rel]=await fs.readFile(path.join(folder,rel),'utf8');
    await fs.writeFile(path.join(runDir,'step-'+step.id+'-submission.json'),JSON.stringify({files,receipt},null,2));
    const proposed=pending.preview?.after;
    if(proposed){result.acceptance=evaluateStep(step.id,before.project,proposed,history);result.checks.push(...result.acceptance.checks)}
    else add('pending preview exposed',false,Object.keys(pending));
    const unsafe=result.checks.some(c=>!c.pass&&['model completed','no tools outside shared folder','no denied/budget tool attempts','guide learned in session; live state read before write','one fresh root request for this task','matching pending receipt was actually read'].includes(c.name));
    if(result.checks.every(c=>c.pass)||(diagnostic&&!unsafe)){
     // Explicit user-authorized regression acceptance action; never performed by Luna.
     await receiver.bridge.applyPending();await receiver.bridge.checkFolder();
     const applied=JSON.parse(await fs.readFile(path.join(folder,'responses',pending.id+'.result.json'),'utf8'));
     add('HALO applied and advanced live revision',applied.status==='applied'&&receiver.state().revision!==before.revision,applied.status);
     result.accepted=result.checks.every(c=>c.pass);
     result.applied=applied.status==='applied';
     result.appliedForContinuation=result.applied&&!result.accepted;
    }
   }
   const after=structuredClone(receiver.state());
   await fs.writeFile(path.join(runDir,'step-'+step.id+'-states.json'),JSON.stringify({before,proposed:pending?.preview?.after,after},null,2));
   report.steps.push(result);await fs.writeFile(path.join(runDir,'report.json'),JSON.stringify(report,null,2));
   console.log('STEP '+step.id+' '+(result.accepted?'ACCEPTED':result.appliedForContinuation?'FAILED_APPLIED_FOR_DIAGNOSTICS':'FAILED')+' '+JSON.stringify(result.checks.filter(c=>!c.pass)));
   if(!result.accepted){
    // Step 4 is explicitly a new task. Resolve a failed proposal before it;
    // never feed a failed transformation into a dependent task or claim it passed.
    if(diagnostic&&result.applied){history.push({after:after.project,request:roots[0]});continue;}
    if(pending){await receiver.bridge.rejectPending();result.resolution='rejected_by_evaluator';}
    if(step.id===3)continue;
    break;
   }
   history.push({after:after.project,request:roots[0]});
  }
  report.pass=report.steps.length===5&&report.steps.every(s=>s.accepted);
 }catch(e){report.harnessError=e.stack||e.message;throw e}
 finally{receiver.dispose();server.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(runDir,'report.json'),JSON.stringify(report,null,2));console.log('REPORT '+path.join(runDir,'report.json'))}
 if(!report.pass)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={argsFor};
