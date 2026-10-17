/* HALO role operators. Original policies; no OP-Z sounds, code or UI assets. */
(function(root){
 'use strict';
 const F=typeof module!=='undefined'&&module.exports?require('./phrases.js'):root.HaloPhrases;
 const slots=['GLASS','TIDAL','ROOT','EMBER','RAIN','VEIL','MOSS','AURA'];
 const definitions=[
  ['pulse','Pulse',1,2,'Short low impulses'],['accent','Accent',2,2,'Short accents'],
  ['percussion','Percussion',2,2,'Rhythmic details'],['texture','Texture',2,2,'Atmospheric layers'],
  ['bass','Bass',1,1,'One note at a time'],['melody','Melody',3,3,'Melodic phrases'],
  ['arpeggio','Arpeggio',1,1,'One arpeggiated note at a time'],['harmony','Harmony',4,4,'Four-note harmony']
 ];
 const roles=Object.freeze(definitions.map(([id,label,maxNotes,voices,description],i)=>Object.freeze({id,label,maxNotes,voices,description,slot:slots[i]})));
 const byId=Object.freeze(Object.fromEntries(roles.map(r=>[r.id,r])));
 function forTrack(track){return roles[slots.indexOf(track.name)]}
 function describe(sound){
  const sampled=!!sound.sampleBank,unpitched=['noise','kick','drop','snare','clap','metal','tom'].includes(sound.engine),pitched=!unpitched;
  const melodic=['bass','melody','arpeggio','harmony'];
  const compatible=sampled?['pulse','accent','percussion','texture',...(pitched?melodic:[])]:sound.ambient?['texture']:sound.engine==='pad'?['texture',...melodic]:sound.engine==='bass'?['pulse','texture',...melodic]:pitched?['accent','percussion','texture',...melodic]:['pulse','accent','percussion','texture'];
  let affinity;
  if(sound.engine==='kick')affinity=sound.id==='tom'?['accent','texture']:['pulse'];
  else if(sound.engine==='drop')affinity=['texture'];
  else if(['snare','clap'].includes(sound.engine))affinity=['accent'];
  else if(sound.engine==='metal')affinity=sound.sparse?['percussion','texture']:['percussion'];
  else if(sound.engine==='tom')affinity=['accent','texture'];
  else if(sound.engine==='noise')affinity=sound.ambient?['texture']:['percussion'];
  else if(['bass','rockbass'].includes(sound.engine))affinity=['bass'];
  else if(sound.engine==='pad')affinity=sound.id==='drone'?['texture','harmony']:['harmony'];
  else if(sound.engine==='wood')affinity=sound.id==='wood'?['accent']:['melody','arpeggio'];
  else if(sound.engine==='guitar')affinity=['melody'];
  else if(sound.engine==='piano')affinity=['melody','harmony'];
  else if(sound.engine==='rocksynth')affinity=['bass','arpeggio'];
  else affinity=['melody','arpeggio'];
  const allowed=(sound.compatibleRoles||compatible).filter(id=>Object.hasOwn(byId,id));
  const preferred=(sound.affinityRoles||affinity).filter(id=>allowed.includes(id));
  const range=!sampled?[26,88]:sound.engine==='rockbass'?[26,45]:sound.engine==='guitar'?[31,90]:sound.engine==='piano'?[42,86]:sound.engine==='rocksynth'?[35,85]:[0,0];
  return Object.freeze({engine:sampled?'sampler':sound.engine==='noise'?'noise':'oscillator',pitched,setups:Object.freeze(sound.setups||(sampled?['reactor']:['ambient'])),compatibleRoles:Object.freeze(allowed),affinityRoles:Object.freeze(preferred),range:Object.freeze(range),referenceNote:pitched?fold(60,...range):0});
 }
 function metadata(sound){return sound.playback||describe(sound)}
 function compatible(track,sound){return metadata(sound).compatibleRoles.includes(forTrack(track).id)}
 function pool(track,banks,preferred=false){
  const role=forTrack(track).id;
  return Object.entries(banks).flatMap(([instrument,bank])=>bank.sounds.filter(s=>metadata(s)[preferred?'affinityRoles':'compatibleRoles'].includes(role)).map(sound=>({instrument,sound})));
 }
 const defaults={ambient:[['ROOT','pulse'],['MOSS','wood'],['RAIN','shaker'],['AURA','wind'],['ROOT','round'],['GLASS','bell'],['EMBER','string'],['TIDAL','air']],reactor:[['GLASS','reactor-dry-kick'],['TIDAL','reactor-dry-snare'],['ROOT','reactor-tight-hat'],['EMBER','reactor-floor-tom'],['RAIN','reactor-pick-bass'],['VEIL','reactor-palm-guitar'],['AURA','reactor-analog-arp'],['AURA','reactor-attack-piano']]};
 function initial(setup,name){const index=slots.indexOf(name),[instrument,sound]=defaults[setup==='reactor'?'reactor':'ambient'][index];return {instrument,sound,role:roles[index].id,generator:3,sequence:{length:16,stepLength:1,offset:0}}}
 function sequence(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid track cycle');
  const length=value.length??16,stepLength=value.stepLength??1,offset=value.offset??0;
  if(!Number.isInteger(length)||length<4||length>32||![1,2,4].includes(stepLength)||!Number.isInteger(offset)||offset<0||offset>=length)throw Error('Invalid track cycle');
  return {length,stepLength,offset};
 }
 const mod=(n,d)=>((n%d)+d)%d;
 function position(track,absoluteStep,bars=4){const s=sequence(track.sequence),shift=absoluteStep+s.offset*s.stepLength,period=s.length*s.stepLength;return {cell:mod(Math.floor(shift/period),bars),local:Math.floor(mod(shift,period)/s.stepLength),onGrid:mod(shift,s.stepLength)===0,sequence:s}}
 function virtualSound(track,sound){
  const role=forTrack(track).id;
  const engine=role==='pulse'?'kick':role==='accent'?'snare':role==='percussion'?'metal':role==='texture'?(sound.engine==='tom'||sound.id==='tom'?'tom':'noise'):role==='bass'?'bass':role==='arpeggio'?'pluck':role==='harmony'?'pad':sound.engine;
  return {...sound,id:'role3:'+role+':'+sound.id,engine,ambient:role==='texture'&&engine==='noise',lead:role==='melody'&&sound.lead};
 }
 const cache=new Map();
 function plan(track,sound,seed,bars=4,timeSignature=track.timeSignature||'4/4'){
  const timeSig=timeSignature==='3/4'?'3/4':'4/4';
  const spb=timeSig==='3/4'?12:16;
  const s=sequence(track.sequence),role=forTrack(track).id,key=[track.setup,track.name,track.instrument,sound.id,seed,bars,timeSig,s.length,s.stepLength,s.offset,track.arrangement?.count||1,track.arrangement?.ordinal||0].join(':');
  if(cache.has(key))return cache.get(key);
  const virtual=virtualSound(track,sound),base=F.plan(track,virtual,seed,bars,timeSig),period=bars*s.length*s.stepLength,entries=new Map();
  base.steps.forEach((step,i)=>{const mapped=mod((Math.floor(step/spb)*s.length+Math.floor((step%spb)*s.length/spb)-s.offset)*s.stepLength,period);if(!entries.has(mapped))entries.set(mapped,{original:step,accent:base.accents[i]})});
  const steps=[...entries.keys()].sort((a,b)=>a-b);
  const result=Object.freeze({...base,version:3,trackRole:role,period,steps:Object.freeze(steps),accents:Object.freeze(steps.map(step=>entries.get(step).accent)),origins:Object.freeze(Object.fromEntries([...entries].map(([step,e])=>[step,e.original])))});
  if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function fold(n,low,high){while(n<low)n+=12;while(n>high)n-=12;return n}
 function constrain(notes,sound,role){
  const m=metadata(sound),[min,max]=m.range;
  let low=min,high=max;
  if(role==='bass'){low=Math.max(min,26);high=Math.min(max,Math.max(low+12,49))}
  return [...new Set(notes.map(n=>fold(n,low,high)))].slice(0,byId[role].maxNotes);
 }
 function notes(track,sound,bar,local,seed,transpose,bars=4,absoluteStep=undefined,mode='minor',timeSignature=track.timeSignature||'4/4'){
  if(typeof transpose==='object'&&transpose!==null){mode=transpose.mode||mode;transpose=transpose.offset??0}
  const timeSig=timeSignature==='3/4'?'3/4':'4/4';
  const spb=timeSig==='3/4'?12:16;
  if(absoluteStep===undefined)absoluteStep=bar*spb+local;
  const role=forTrack(track).id,m=metadata(sound);if(!m.pitched)return [];
  if(['pulse','accent','percussion'].includes(role))return [m.referenceNote];
  const clock=track.manualSteps?mod(absoluteStep,(track.manualBars||bars)*spb):absoluteStep,p=plan(track,sound,seed,bars,timeSig),pos=position(track,clock,bars),virtual=virtualSound(track,sound),base=F.plan(track,virtual,seed,bars,timeSig);
  const original=p.origins[mod(clock,p.period)]??(pos.cell*spb+Math.floor(pos.local*spb/pos.sequence.length));
  const within=base.steps.filter(n=>Math.floor(n/spb)===pos.cell).map(n=>n%spb),ordinal=Math.max(0,within.filter(n=>n<=original%spb).length-1);
  const chord=F.chordFor(track.setup,seed,bar,bars,transpose,mode),answer=pos.cell>=4||pos.cell%4===3;
  const degree=pos.cell===bars-1&&original%spb>=(within.at(-1)??(spb-1))?0:base.degrees[(ordinal+(answer?pos.cell%3:0))%base.degrees.length];
  const pitch=chord[degree%4],world=track.setup==='reactor';let result;
  if(role==='bass'){
   const isRoot=timeSig==='3/4'?(bars===8?(original%6===0):(original%4===0)):(original%4===0);
   result=[isRoot?chord[0]-12:pitch-12];
  }
  else if(role==='texture')result=[chord[0]+(world?12:-12)];
  else if(role==='harmony')result=chord.map((_,i)=>chord[(i+degree)%4]+(world?12:0));
  else if(role==='arpeggio')result=[pitch+12];
  else if(sound.engine==='guitar'&&!sound.lead){let fifth=pitch+7;const currentScale=mode==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];if(!currentScale.includes(mod(fifth-38-transpose,12)))fifth--;result=[pitch+12,fifth+12]}
  else {const n=pitch+24+(answer&&sound.lead&&ordinal%3===0?12:0);result=[n,...(sound.octave?[n+12]:[])]}
  return constrain(result,sound,role);
 }
 function velocity(track,sound,step,seed,bars=4,timeSignature=track.timeSignature||'4/4'){const p=plan(track,sound,seed,bars,timeSignature),i=p.steps.indexOf(mod(step,p.period));return i<0?.72:p.accents[i]}
 function voicePolicy(track,sound){
  const role=forTrack(track),short=['pulse','accent','percussion'].includes(role.id);
  return {maxNotes:role.maxNotes,voices:role.voices,short,attack:short?.003:role.id==='arpeggio'?.008:role.id==='bass'?.012:null,maxDuration:short?(role.id==='percussion'?.35:.8):role.id==='arpeggio'?.65:8,naturalGuitar:!short&&role.id!=='arpeggio'&&sound.engine==='guitar'};
 }
 const glyphs=Object.freeze({
  pulse:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 3 16 H 10 L 13 20 L 16 6 L 19 25 L 22 16 H 29"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/></svg>',
  accent:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 16 4 Q 16 16 28 16 Q 16 16 16 28 Q 16 16 4 16 Q 16 16 16 4 Z"/><circle cx="16" cy="16" r="2" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="24" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="24" r="1" fill="currentColor"/><circle cx="24" cy="24" r="1" fill="currentColor"/></svg>',
  percussion:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 6 13 C 10 9, 22 9, 26 13"/><path d="M 7 17 C 11 20, 21 20, 25 17"/><path d="M 16 5 V 27"/><circle cx="16" cy="5" r="1.5" fill="currentColor"/><path d="M 3 15 H 1 M 31 15 H 29 M 5 10 L 3 8 M 27 10 L 29 8"/></svg>',
  texture:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 5 9 C 11 6, 17 12, 23 9 C 25.5 7.5, 27.5 8, 29 9"/><path d="M 3 16 C 9 13, 15 19, 21 16 C 24.5 14.5, 27 15, 29 16"/><path d="M 6 23 C 12 20, 18 26, 24 23 C 26 22, 27.5 22, 29 23"/><circle cx="10" cy="12" r="1" fill="currentColor"/><circle cx="25" cy="13" r="1" fill="currentColor"/><circle cx="8" cy="19" r="1" fill="currentColor"/></svg>',
  bass:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 2 16 H 30" stroke-dasharray="1 3" opacity="0.35"/><path d="M 3 16 C 7 6, 12 6, 16 16 C 20 26, 25 26, 29 16" stroke-width="1.8"/><path d="M 5 19 C 8 11, 12 11, 16 19 C 20 27, 24 27, 27 19" stroke-dasharray="2 2" opacity="0.55"/></svg>',
  melody:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="9" cy="22" rx="3.2" ry="2.4" transform="rotate(-20 9 22)" fill="currentColor"/><ellipse cx="23" cy="18" rx="3.2" ry="2.4" transform="rotate(-20 23 18)" fill="currentColor"/><path d="M 12 21 V 8"/><path d="M 26 17 V 4"/><path d="M 11.5 8 L 26.5 4" stroke-width="2.6"/></svg>',
  arpeggio:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 4 25 H 9 V 19 H 15 V 13 H 21 V 7 H 28"/><circle cx="9" cy="19" r="2" fill="currentColor"/><circle cx="15" cy="13" r="2" fill="currentColor"/><circle cx="21" cy="7" r="2" fill="currentColor"/><path d="M 9 23 V 26 M 15 17 V 26 M 21 11 V 26" stroke-dasharray="1 2" opacity="0.35"/></svg>',
  harmony:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="9" cy="13" r="2" fill="currentColor"/><circle cx="9" cy="19" r="2" fill="currentColor"/><circle cx="9" cy="25" r="2" fill="currentColor"/><path d="M 15 5 C 18 5, 18 14.5, 16 16 C 18 17.5, 18 27, 15 27"/><path d="M 19 16 H 28"/><circle cx="28" cy="16" r="1.5" fill="currentColor"/></svg>'
 });
 function glyph(roleOrTrack){
  if(!roleOrTrack)return glyphs.pulse;
  if(typeof roleOrTrack==='string')return glyphs[roleOrTrack]||glyphs.pulse;
  const spec=forTrack(roleOrTrack);
  return (spec&&glyphs[spec.id])||glyphs.pulse;
 }
 const api={roles,byId,forTrack,describe,metadata,compatible,pool,initial,sequence,position,plan,notes,constrain,velocity,voicePolicy,mod,glyphs,glyph};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloRoles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
