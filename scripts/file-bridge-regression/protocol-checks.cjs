// Evaluator-only checks. Never sent to the composing model.
const path=require('node:path');
function protocolChecks(events,history=[],requireProbe=false){
 const checks=[],add=(name,pass,details)=>checks.push({name,pass:!!pass,details});
 const violations=events.filter(e=>!e.ok&&!e.error?.startsWith('ENOENT'));
 add('no denied/budget tool attempts',violations.length===0,violations);
 const readGuide=events.findIndex(e=>e.tool==='read'&&e.path==='AGENT_GUIDE.md'&&e.ok),readState=events.findIndex(e=>e.tool==='read'&&e.path==='project-state.json'&&e.ok),write=events.findIndex(e=>e.tool==='write'&&e.ok);
 add('guide learned in session; live state read before write',(readGuide>=0||history.length>0)&&readState>=0&&write>readState&&(readGuide<0||write>readGuide),{readGuide,readState,write});
 const probeRoots=new Set(events.filter(e=>e.tool==='write'&&e.ok&&e.mode==='probe').map(e=>e.path));
 const roots=[...new Set(events.filter(e=>e.tool==='write'&&e.ok&&!e.path.includes('--')&&!probeRoots.has(e.path)).map(e=>e.path))],ids=new Set(roots.map(p=>path.basename(p,'.json')));
 if(requireProbe){
  const firstMusic=events.findIndex(e=>e.tool==='write'&&e.ok&&roots.includes(e.path));
  const ready=events.findIndex(e=>e.tool==='read'&&e.ok&&e.receipt?.status==='ready'&&probeRoots.has('requests/'+e.receipt.id+'.json'));
  add('real ready probe before music write',probeRoots.size===1&&ready>=0&&ready<firstMusic,{ready,firstMusic,probeIds:[...probeRoots]});
  for(const probe of probeRoots){
   const w=events.findLastIndex(e=>e.tool==='write'&&e.ok&&e.path===probe);
   add('probe read back',events.some((e,i)=>i>w&&e.tool==='read'&&e.ok&&e.path===probe),probe);
   add('fresh probe ID',!history.some(h=>h.probeRequests?.includes(probe)),probe);
   const receipt=events.find(e=>e.tool==='read'&&e.ok&&e.receipt?.status==='ready'&&'requests/'+e.receipt.id+'.json'===probe);
   if(events[w].baseRevision!==undefined)add('ready revision matches written probe',receipt?.receipt.currentRevision===events[w].baseRevision,probe);
  }
 }
 add('one fresh root request for this task',roots.length===1&&!history.some(h=>h.request===roots[0]),roots);
 const stopAt=events.findIndex(e=>e.tool==='read'&&e.ok&&ids.has(e.receipt?.id)&&['pending_approval','applied','rejected'].includes(e.receipt?.status));
 add('stop after pending or terminal receipt',stopAt>=0&&stopAt===events.length-1,{stopAt,toolCalls:events.length});
 for(const root of roots){const lastWrite=events.findLastIndex(e=>e.tool==='write'&&e.ok&&e.path===root),readBack=events.findIndex((e,i)=>i>lastWrite&&e.tool==='read'&&e.ok&&e.path===root);add('published root read back',readBack>lastWrite,root)}
 return {checks,roots,probeRoots:[...probeRoots]};
}
module.exports={protocolChecks};
