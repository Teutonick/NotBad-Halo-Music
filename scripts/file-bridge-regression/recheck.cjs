// Re-evaluate immutable captured model results after fixing a test criterion.
// Never changes the original run/report, shared folder or authored score.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {evaluateStep}=require('./acceptance.cjs'),{protocolChecks}=require('./protocol-checks.cjs');
async function recheck(dir){
 const original=JSON.parse(await fs.readFile(path.join(dir,'report.json'),'utf8'));
 const events=(await fs.readFile(path.join(dir,'file-access.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
 const report={run:dir,originalMode:original.mode,model:original.model,reasoningEffort:original.reasoningEffort,originalCriteriaSha256:original.criteriaSha256,
  criteriaSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(__dirname,'acceptance.cjs'))).digest('hex'),
  reason:'Corrected criterion accepts harmonic/melodic D minor, including C# dominant cadences. Original runtime report retained unchanged.',steps:[],pass:false,musicalReview:'NOT_PERFORMED'};
 let history=[];
 for(const step of original.steps){
  const states=JSON.parse(await fs.readFile(path.join(dir,'step-'+step.id+'-states.json'),'utf8'));
  const {roots,checks}=protocolChecks(events.filter(e=>e.step===step.id),history);
  const acceptance=states.proposed?evaluateStep(step.id,states.before.project,states.proposed,history):{checks:[{name:'proposal exists',pass:false}]};
  const runtime=step.checks.filter(c=>['model completed','no tools outside shared folder','HALO has pending proposal','matching pending receipt was actually read','HALO applied and advanced live revision'].includes(c.name));
  const all=[...runtime,...checks,...acceptance.checks];
  all.push({name:'actual HALO application recorded',pass:!!step.applied,details:'Original runtime report, not inferred from a proposal.'});
  if(step.applied)all.push({name:'applied project equals captured proposal',pass:JSON.stringify(states.after.project)===JSON.stringify(states.proposed)});
  report.steps.push({id:step.id,originalAccepted:step.accepted,originalAppliedForContinuation:step.appliedForContinuation||false,pass:all.every(c=>c.pass),checks:all});
  if(step.applied)history.push({after:states.after.project,request:roots[0]});
 }
 report.pass=report.steps.length===5&&report.steps.every(s=>s.pass);
 await fs.writeFile(path.join(dir,'recheck.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:report.pass,steps:report.steps.map(s=>({id:s.id,pass:s.pass,failed:s.checks.filter(c=>!c.pass)}))},null,2));return report;
}
if(require.main===module)recheck(path.resolve(process.argv[2])).then(r=>{if(!r.pass)process.exitCode=1}).catch(e=>{console.error(e);process.exitCode=1});
module.exports={recheck};
