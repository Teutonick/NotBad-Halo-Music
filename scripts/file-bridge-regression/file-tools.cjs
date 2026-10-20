const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
class FileTools{
 constructor(root,log,receiver){this.root=path.resolve(root);this.log=log;this.receiver=receiver;this.beginStep(0)}
 beginStep(step){this.step=step;this.calls=0;this.reads=new Map();this.writes=new Map();this.events=[];this.closed=false}
 async record(event){event={at:new Date().toISOString(),actor:'luna',step:this.step,...event};this.events.push(event);await fs.appendFile(this.log,JSON.stringify(event)+'\n')}
 async resolve(name,write=false){
  if(typeof name!=='string'||name.includes('\\')||name.includes(':')||name.includes('\0')||name.split('/').some(s=>s==='..'||s==='.'||!s))throw Error('PATH_DENIED');
  if(!/^(AGENT_GUIDE\.md|project-state\.json|capabilities\.json|instruments\.json|music-rules\.json|requests|responses|(?:requests|responses)\/[A-Za-z0-9_-]+(?:\.result)?\.json)$/.test(name))throw Error('PATH_DENIED');
  if(write&&!/^requests\/[A-Za-z0-9_-]+\.json$/.test(name))throw Error('WRITE_DENIED');
  const p=path.join(this.root,name),parent=await fs.realpath(path.dirname(p));
  if(parent!==this.root&&!parent.startsWith(this.root+path.sep))throw Error('PATH_DENIED');
  try{const real=await fs.realpath(p);if(real!==this.root&&!real.startsWith(this.root+path.sep))throw Error('PATH_DENIED')}catch(e){if(e.code!=='ENOENT')throw e}
  return p;
 }
 async call(name,args={}){
  const event={tool:name,path:args.path};
  try{
   if(this.closed)throw Error('TURN_CLOSED');if(++this.calls>80)throw Error('TOOL_BUDGET_EXCEEDED');
   let result;
   if(name==='list'){const rel=args.path||'';if(!['','requests','responses'].includes(rel))throw Error('PATH_DENIED');result=await fs.readdir(rel?await this.resolve(rel):this.root)}
   else if(name==='read'){
    const p=await this.resolve(args.path);
    if(args.path.startsWith('responses/')){let version='missing';try{version=crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex')}catch(e){if(e.code!=='ENOENT')throw e}const key=args.path+':'+version,n=(this.reads.get(key)||0)+1;this.reads.set(key,n);if(n>3)throw Error('RECEIPT_READ_BUDGET_EXCEEDED')}
    result=await fs.readFile(p,'utf8');event.bytes=Buffer.byteLength(result);
    if(args.path.startsWith('responses/')){try{const r=JSON.parse(result);event.receipt={id:r.id,status:r.status,submissionVersion:r.submissionVersion,currentRevision:r.currentRevision}}catch{}}
   }else if(name==='write'){
    const p=await this.resolve(args.path,true);if(typeof args.content!=='string'||Buffer.byteLength(args.content)>524288)throw Error('CONTENT_SIZE_DENIED');
    const n=(this.writes.get(args.path)||0)+1;this.writes.set(args.path,n);if(n>3)throw Error('WRITE_BUDGET_EXCEEDED');
    // Do not normalize, fill, repair or validate content here: HALO must detect mistakes.
    try{const value=require('../../src/file-bridge.js').parseScoreText(args.content);event.mode=value.mode;event.baseRevision=value.baseRevision}catch{}
    await fs.writeFile(p,args.content);await this.receiver.bridge.checkFolder();
    result={written:args.path,bytes:Buffer.byteLength(args.content)};event.sha256=crypto.createHash('sha256').update(args.content).digest('hex');
   }else if(name==='wait'){
    if(!Number.isInteger(args.milliseconds)||args.milliseconds<1||args.milliseconds>5000)throw Error('WAIT_DENIED');
    await new Promise(r=>setTimeout(r,args.milliseconds));await this.receiver.bridge.checkFolder();result={waited:args.milliseconds};
   }else throw Error('TOOL_DENIED');
   await this.record({...event,ok:true});return result;
  }catch(e){await this.record({...event,ok:false,error:e.message});throw e}
 }
}
module.exports={FileTools};
