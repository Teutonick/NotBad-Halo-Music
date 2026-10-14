/* Develop an authored verse using the same ensemble, instruments and harmonic clock. */
(function(root){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const alias={bass:'bass',texture:'texture',accent:'melody',kick:'pulse',snare:'accent',metal:'percussion',rhythm:'percussion',tom:'texture',bed:'harmony',lead:'melody',riff:'melody',pluck:'arpeggio',wood:'melody',keys:'harmony'};
 function build(source,sounds){
  const transpose=(typeof module!=='undefined'&&module.exports?require('./composition.js'):root.HaloComposition).offsets[source.key];
  const original=clone(source),runtime=source.tracks.map(t=>({...clone(t),setup:source.setup,...(t.generator!==3||t.exact?{manualSteps:[...t.steps],manualBars:source.bars}:{})}));
  sounds.arrange(runtime);
  const roles=runtime.map(t=>t.generator===3?sounds.roles.forTrack(t).id:(alias[sounds.phrases.roleFor(t,sounds.soundFor(t))]||'melody'));
  const activity=runtime.map((t,i)=>t.on&&t.level>0&&source.tracks[i].steps.length?source.tracks[i].steps.length:0);
  const candidates=runtime.map((t,i)=>i).filter(i=>activity[i]);
  if(!candidates.length)throw Error('The verse needs at least one active part');
  const priority={melody:8,arpeggio:6,harmony:4,bass:3,texture:2,pulse:1,accent:0,percussion:0};
  const hook=candidates.sort((a,b)=>(priority[roles[b]]??0)-(priority[roles[a]]??0)||activity[b]-activity[a])[0];
  const profile=sounds.phrases.ensemble(source.setup,source.seed),sparse=[1,7,9].includes(profile[4]);
  function library(i,bars){const t=runtime[i],sound=sounds.soundFor(t),plan=(t.generator===3?sounds.roles:sounds.phrases).plan(t,sound,source.seed,bars),period=plan.period||bars*16,hits=new Set(plan.steps);return Array.from({length:bars*16},(_,n)=>n).filter(n=>hits.has((n+(t.generator===3?source.startStep:0))%period))}
  function pitch(i,step){return sounds.notesFor(runtime[i],i,Math.floor(step/16),step%16,source.seed,transpose,source.bars,source.startStep+step)}
  function chooseParts(kind){
   const selected=new Set([hook]);
   const wants=kind==='intro'?['texture','harmony']:kind==='bridge'?['harmony','texture','percussion']:kind==='outro'?['harmony','texture']:kind==='verse2'?['bass','pulse','texture','accent']:['bass','pulse','harmony','percussion','arpeggio','accent','texture'];
   const limit=kind==='intro'||kind==='outro'?3:kind==='bridge'?4:kind==='verse2'?Math.max(3,Math.min(5,candidates.length)):sparse?5:7;
   for(const role of wants){const match=runtime.map((t,i)=>i).filter(i=>roles[i]===role&&!selected.has(i)).sort((a,b)=>activity[b]-activity[a])[0];if(match!==undefined&&selected.size<limit)selected.add(match)}
   return selected;
  }
  function develop(kind){
   const p=clone(source);p.bars=kind==='intro'||kind==='outro'?4:source.bars;p.startStep=0;const selected=chooseParts(kind);
   p.tracks.forEach((t,i)=>{
    const role=roles[i],base=source.tracks[i].steps.filter(n=>n<p.bars*16),pattern=library(i,p.bars),isHook=i===hook,long=['texture','harmony'].includes(role);
    let steps=base.length?[...base]:[...pattern];
    if(isHook&&['chorus','verse2'].includes(kind))steps=[...base];
    else if(kind==='intro'||kind==='outro')steps=steps.filter((n,k)=>isHook?base.filter(x=>Math.floor(x/16)===Math.floor(n/16)).indexOf(n)<2:n%32<4);
    else if(kind==='bridge')steps=steps.filter(n=>isHook?Math.floor(n/16)%2===0:n%16<4||role==='percussion'&&n%16===8);
    else if(kind==='verse2')steps=steps.filter(n=>isHook||n%4===0||n%16<8);
    else if(kind==='chorus'&&!isHook){
     const cap=long?1:role==='bass'?3:role==='percussion'?6:4;
     for(const n of pattern){if(steps.includes(n)||steps.filter(x=>Math.floor(x/16)===Math.floor(n/16)).length>=cap)continue;
      // Fill gaps and phrase answers, using the same motif family rather than a new seed.
      if(!base.length||n%4===0||Math.floor(n/16)%4===3)steps.push(n);
     }
    }
    if(long&&!isHook)steps=steps.filter(n=>n%16<4&&Math.floor(n/16)%2===0);
    steps=[...new Set(steps)].sort((a,b)=>a-b);
    t.on=selected.has(i)&&steps.length>0;t.exact=true;t.steps=steps;
    // Freeze pitch at every event: changing accompaniment rhythm cannot rewrite the hook.
    t.noteTranspose=transpose;t.noteEvents=steps.map(step=>({step,notes:pitch(i,step)}));
    if(kind==='intro'||kind==='outro'){t.level=Math.round(t.level*.72);t.space=Math.min(50,t.space+8);t.delay=Math.min(20,t.delay||0)}
    else if(kind==='bridge'){t.level=Math.round(t.level*.82);t.space=Math.min(50,t.space+5);t.delay=Math.min(25,t.delay||0)}
    else if(kind==='chorus'&&!isHook)t.level=Math.round(t.level*.88);
   });
   return p;
  }
  const phrases=[{id:1,project:develop('intro')},{id:2,project:original},{id:3,project:develop('chorus')},{id:4,project:develop('verse2')},{id:5,project:develop('bridge')},{id:6,project:develop('outro')}];
  const section=(phrase,name,repeats=1,fade='none')=>({phrase,name,repeats,fade});
  return {format:'halo-composition',version:1,tempo:source.tempo,masterVolume:source.masterVolume,mix:clone(source.mix),phrases,sections:[section(1,'intro',1,'in'),section(2,'verse',8/source.bars),section(3,'chorus',8/source.bars),section(4,'verse2',8/source.bars),section(3,'chorus',8/source.bars),section(5,'bridge',8/source.bars),section(3,'chorus',8/source.bars),section(6,'outro',1,'out')]};
 }
 const api={build};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloArranger=api;
})(globalThis);
