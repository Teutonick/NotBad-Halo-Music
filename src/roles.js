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
  return Object.freeze({engine:sampled?'sampler':sound.engine==='noise'?'noise':'oscillator',pitched,compatibleRoles:Object.freeze(allowed),affinityRoles:Object.freeze(preferred),range:Object.freeze(range),referenceNote:pitched?fold(60,...range):0});
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
 function plan(track,sound,seed,bars=4){
  const s=sequence(track.sequence),role=forTrack(track).id,key=[track.setup,track.name,track.instrument,sound.id,seed,bars,s.length,s.stepLength,s.offset,track.arrangement?.count||1,track.arrangement?.ordinal||0].join(':');
  if(cache.has(key))return cache.get(key);
  const virtual=virtualSound(track,sound),base=F.plan(track,virtual,seed,bars),period=bars*s.length*s.stepLength,entries=new Map();
  base.steps.forEach((step,i)=>{const mapped=mod((Math.floor(step/16)*s.length+Math.floor(step%16*s.length/16)-s.offset)*s.stepLength,period);if(!entries.has(mapped))entries.set(mapped,{original:step,accent:base.accents[i]})});
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
 function notes(track,sound,bar,local,seed,transpose,bars=4,absoluteStep=bar*16+local){
  const role=forTrack(track).id,m=metadata(sound);if(!m.pitched)return [];
  if(['pulse','accent','percussion'].includes(role))return [m.referenceNote];
  const clock=track.manualSteps?mod(absoluteStep,track.manualBars*16):absoluteStep,p=plan(track,sound,seed,bars),pos=position(track,clock,bars),virtual=virtualSound(track,sound),base=F.plan(track,virtual,seed,bars);
  const original=p.origins[mod(clock,p.period)]??(pos.cell*16+Math.floor(pos.local*16/pos.sequence.length));
  const within=base.steps.filter(n=>Math.floor(n/16)===pos.cell).map(n=>n%16),ordinal=Math.max(0,within.filter(n=>n<=original%16).length-1);
  const chord=F.chordFor(track.setup,seed,bar,bars,transpose),answer=pos.cell>=4||pos.cell%4===3;
  const degree=pos.cell===bars-1&&original%16>=(within.at(-1)??15)?0:base.degrees[(ordinal+(answer?pos.cell%3:0))%base.degrees.length];
  const pitch=chord[degree%4],world=track.setup==='reactor';let result;
  if(role==='bass')result=[original%4===0?chord[0]-12:pitch-12];
  else if(role==='texture')result=[chord[0]+(world?12:-12)];
  else if(role==='harmony')result=chord.map((_,i)=>chord[(i+degree)%4]+(world?12:0));
  else if(role==='arpeggio')result=[pitch+(world?24:12)];
  else if(sound.engine==='guitar'&&!sound.lead){let fifth=pitch+7;if(![0,2,3,5,7,8,10].includes(mod(fifth-38-transpose,12)))fifth--;result=[pitch+12,fifth+12]}
  else {const n=pitch+(world?24:12)+(answer&&sound.lead&&ordinal%3===0?12:0);result=[n,...(sound.octave?[n+12]:[])]}
  return constrain(result,sound,role);
 }
 function velocity(track,sound,step,seed,bars=4){const p=plan(track,sound,seed,bars),i=p.steps.indexOf(mod(step,p.period));return i<0?.72:p.accents[i]}
 function voicePolicy(track,sound){
  const role=forTrack(track),short=['pulse','accent','percussion'].includes(role.id);
  return {maxNotes:role.maxNotes,voices:role.voices,short,attack:short?.003:role.id==='arpeggio'?.008:role.id==='bass'?.012:null,maxDuration:short?(role.id==='percussion'?.35:.8):role.id==='arpeggio'?.65:8,naturalGuitar:!short&&role.id!=='arpeggio'&&sound.engine==='guitar'};
 }
 const api={roles,byId,forTrack,describe,metadata,compatible,pool,initial,sequence,position,plan,notes,velocity,voicePolicy,mod};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloRoles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
