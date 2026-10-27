/* Generator 4. Original WATER dance / REACTOR light pop-rock scores.
   References inform broad musical direction only; no transcribed melodies or audio. */
(function(root){
 'use strict';
 const slots=['GLASS','TIDAL','ROOT','EMBER','RAIN','VEIL','MOSS','AURA'];
 const roleIds=['pulse','accent','percussion','texture','bass','melody','arpeggio','harmony'];
 const legacyRoles=['kick','snare','metal','texture','bass','lead','pluck','bed'];
 const mod=(n,d)=>((n%d)+d)%d;
 const profiles={
  // id, EN, RU, minor roots, major roots, groove, chord voicing, active extras
  water:[
   ['lagoon-house','Lagoon house','Лагунный хаус',[0,5,2,6],[0,4,5,3],0,'seventh',[2,7]],
   ['salt-garage','Salt garage','Солёный гараж',[0,0,5,6],[0,0,3,4],1,'ninth',[2,6]],
   ['broken-current','Broken current','Ломаное течение',[0,6,5,6],[5,3,0,4],2,'seventh',[2,7]],
   ['glass-stutter','Glass stutter','Стеклянный ста́ттер',[0,5,2,6],[0,4,5,3],3,'sus',[6,7]],
   ['tidal-dub','Tidal dub','Приливный даб',[0,0,3,6],[0,0,3,4],4,'ninth',[2,7]],
   ['foam-break','Foam break','Пенный брейк',[0,2,6,5],[5,3,0,4],2,'sus',[2,3]],
   ['moon-hook','Moon hook','Лунный хук',[0,5,2,6],[0,4,5,3],3,'seventh',[6,7]],
   ['copper-tide','Copper tide','Медный прилив',[0,3,5,6],[0,3,5,4],1,'ninth',[2,6]],
   ['drift-step','Drift step','Скользящий шаг',[0,6,3,5],[5,4,3,4],4,'sus',[2,7]],
   ['liquid-answer','Liquid answer','Жидкий ответ',[0,5,6,3],[0,5,3,4],0,'ninth',[6,7]]
  ],
  reactor:[
   ['open-road','Open road','Открытая дорога',[0,5,2,6],[0,4,5,3],0,'triad',[2,7]],
   ['porch-chorus','Porch chorus','Припев на веранде',[0,3,6,0],[0,3,4,0],1,'add9',[2,7]],
   ['bright-eighths','Bright eighths','Светлые восьмые',[0,6,5,6],[0,4,3,4],2,'triad',[2,6]],
   ['piano-postcard','Piano postcard','Фортепианная открытка',[0,5,3,6],[0,5,3,4],3,'add9',[7,6]],
   ['small-town','Small town','Маленький город',[0,2,5,6],[0,2,3,4],4,'triad',[2,3]],
   ['summer-reply','Summer reply','Летний ответ',[0,5,2,6],[0,4,5,3],1,'add9',[2,6]],
   ['soft-backbeat','Soft backbeat','Мягкий бэкбит',[0,3,5,6],[0,3,5,4],3,'triad',[2,7]],
   ['window-lights','Window lights','Свет в окнах',[0,6,3,5],[5,3,0,4],4,'add9',[7,6]],
   ['little-lift','Little lift','Лёгкий подъём',[0,5,6,0],[0,3,4,0],2,'triad',[7,3]],
   ['home-refrain','Home refrain','Домашний рефрен',[0,3,6,0],[0,5,3,4],0,'add9',[7,6]]
  ]
 };
 // Five authored, coordinated grooves per world. Rows are sixteenths within 4/4.
 // Pulse and bass are selected together; melody leaves room for its answer.
 const rhythms={
  water:{
   pulse:[[0,4,8,12],[0,6,8,14],[0,3,8,10],[0,4,8,12],[0,4,8,12]],
   accent:[[4,12],[4,12],[4,12],[4,12],[4,12]],
   percussion:[[2,6,10,14],[2,5,6,10,13,14],[0,2,6,9,10,14],[2,6,10,14],[2,6,9,10,14]],
   texture:[[14],[7,15],[10,15],[6,14],[12]],
   bass:[[2,6,10,14],[0,3,7,10,14],[0,3,6,10,14],[2,6,8,11,14],[0,6,10,14]],
   melody:[[0,3,6,10],[1,4,7,10],[2,5,8,11],[0,2,3,6,8,10,11],[0,6,7,10]],
   arpeggio:[[2,6,10,14],[2,6,9,14],[1,6,10,14],[2,3,6,10,11,14],[3,6,11,14]],
   harmony:[[2,10],[3,11],[2,10],[0,6,8,14],[2,10]]
  },
  reactor:{
   pulse:[[0,8],[0,6,8],[0,8,10],[0,8],[0,7,8]],
   accent:[[4,12],[4,12],[4,12],[4,12],[4,12]],
   percussion:[[0,2,4,6,8,10,12,14],[0,4,6,8,12,14],[0,2,4,6,8,10,12,14],[2,6,10,14],[0,2,4,8,10,12,14]],
   texture:[[14],[12,14],[13,14,15],[14],[10,14]],
   bass:[[0,4,8,12],[0,6,8,12],[0,2,4,8,10,12],[0,8,12],[0,7,8,12]],
   melody:[[0,2,6,8,10],[0,4,6,8,12],[0,2,4,8,10,12],[0,6,8],[0,4,7,8,12]],
   arpeggio:[[2,6,10],[0,6,10],[2,6,10,14],[2,6,10],[0,6,10]],
   harmony:[[0,8],[0,6,8],[0,8],[0,8],[0,6,8]]
  }
 };
 // Native triple-meter versions, not compressed 4/4 drum positions.
 const triple={
  water:{pulse:[[0,8],[0,6]],accent:[[4,10],[6]],percussion:[[2,6,10],[2,4,8,10]],texture:[[10],[10,11]],bass:[[0,3,6,10],[0,4,6,10]],melody:[[0,3,6,8],[0,2,6,8,10]],arpeggio:[[2,6,10],[2,4,8,10]],harmony:[[2,8],[0,6]]},
  reactor:{pulse:[[0,8],[0,6]],accent:[[4,8],[6]],percussion:[[0,2,4,6,8,10],[0,2,4,6,8,10]],texture:[[8,10],[10,11]],bass:[[0,4,8],[0,4,6,10]],melody:[[0,4,6,8],[0,2,6,8]],arpeggio:[[2,6,10],[2,4,8,10]],harmony:[[0],[0,6]]}
 };
 // Chord-degree hooks: repetition and call/response instead of a new random note per hit.
 const contours={
  water:[[0,0,2,1,0,2,3,1],[0,2,1,0,0,1,2,0],[2,1,0,0,2,3,1,0],[0,0,1,0,2,2,1,0],[0,2,0,1,0,3,2,0]],
  reactor:[[0,0,1,2,1,0],[0,2,1,0,1,0],[0,1,2,1,0,0],[2,1,0,0,1,0],[0,0,2,1,2,0]]
 };
 function deepFreeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value)}return value}
 deepFreeze(profiles);deepFreeze(rhythms);deepFreeze(triple);deepFreeze(contours);
 function supports(track){return track.generator===4&&Object.hasOwn(profiles,track.setup)}
 function profile(setup,seed){return profiles[setup][mod(seed-1,10)]}
 function ensemble(setup,seed){const p=profile(setup,seed);return [p[0],p[1],p[2],p[3],mod(seed-1,10)]}
 function chordFor(setup,seed,bar,bars=4,transpose=0,mode='minor'){
  const p=profile(setup,seed),scale=mode==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];
  const degree=p[mode==='major'?4:3][mod(bar,4)];
  const tonic=(setup==='reactor'?38:50)+transpose;
  // Four voices remain available to the role operator. Triads double the root;
  // WATER uses sevenths/ninths or suspended chords, REACTOR triads/add9.
  const voicing=p[6]==='triad'?[0,2,4,7]:p[6]==='add9'?[0,2,4,8]:p[6]==='ninth'?[0,2,6,8]:p[6]==='sus'?[0,3,4,6]:[0,2,4,6];
  return voicing.map(n=>tonic+scale[mod(degree+n,7)]+12*Math.floor((degree+n)/7));
 }
 const cache=new Map();
 function plan(track,sound,seed,bars=4,timeSignature=track.timeSignature||'4/4'){
  bars=bars===8?8:4;timeSignature=timeSignature==='3/4'?'3/4':'4/4';
  const index=slots.indexOf(track.name),role=roleIds[index],p=profile(track.setup,seed),groove=p[5],spb=timeSignature==='3/4'?12:16;
  const seq=track.sequence||{length:spb,stepLength:1,offset:0},period=bars*seq.length*seq.stepLength;
  const key=[track.setup,track.name,sound.id,seed,bars,timeSignature,seq.length,seq.stepLength,seq.offset].join(':');
  if(cache.has(key))return cache.get(key);
  const source=spb===12?triple[track.setup][role][bars===8?1:0]:rhythms[track.setup][role][groove];
  const entries=new Map();
  for(let bar=0;bar<bars;bar++){
   const fill=bar===bars-1,turn=bars===8&&bar===3,answer=bar%4>=2;
   let local=[...source];
   if(role==='texture')local=fill||turn?local:[];
   if(track.setup==='water'){
    if(role==='melody'&&answer)local=local.filter((_,i)=>i%2===0).concat([spb-3]);
    if(role==='arpeggio'&&bar%2===0)local=local.filter((_,i)=>i%2===0);
    if(fill||turn){
     if(role==='pulse')local=local.filter(n=>n<spb-4); // A breath before the next downbeat.
     if(role==='accent')local=local.concat(fill?[spb-3,spb-1]:[spb-2]);
     if(role==='percussion')local=local.filter(n=>n<spb-4).concat([spb-4,spb-2,spb-1]);
     if(role==='bass')local=local.filter(n=>n<spb-2);
    }
   }else{
    if(role==='arpeggio'&&bar%2===0)local=[]; // Lead replies to the rhythm guitar.
    if(role==='melody'&&answer)local=local.filter(n=>n<spb-4).concat([spb-2]);
    if(role==='melody'&&sound.lead)local=answer?[2,Math.floor(spb/2)+2,spb-2]:[0,Math.floor(spb/2)];
    if(fill||turn){
     if(role==='accent')local=local.concat([spb-2]);
     if(role==='percussion'&&fill)local=local.filter(n=>n<spb-2).concat([spb-2,spb-1]);
    }
   }
   if(sound.sparse&&role==='percussion')local=bar===0||bar===4?[0]:[];
   for(const step of [...new Set(local)].sort((a,b)=>a-b)){
    const mapped=mod((bar*seq.length+Math.floor(step*seq.length/spb)-seq.offset)*seq.stepLength,period);
    // Bounded ghost accents; never change audio time to create swing.
    let velocity=role==='accent'?(step===4||step===12||spb===12&&step===6?.84:.54):role==='pulse'?.86:step%4===0?.78:.63;
    if(role==='percussion')velocity=step%4===0?.58:step%4===2?.67:.44;
    if(role==='texture')velocity=.51;
    if(!entries.has(mapped))entries.set(mapped,{original:bar*spb+step,velocity});
   }
  }
  const steps=[...entries.keys()].sort((a,b)=>a-b),degrees=contours[track.setup][groove];
  const result=deepFreeze({version:4,trackRole:role,role:legacyRoles[index],ensemble:p[0],family:p[0]+'-'+role,en:p[1],ru:p[2],motifEn:role==='texture'?'Phrase-end fill':role==='arpeggio'?'Answer':role==='melody'?'Hook':'Groove',motifRu:role==='texture'?'Сбивка в конце фразы':role==='arpeggio'?'Ответ':role==='melody'?'Хук':'Грув',bars,timeSignature,period,steps,accents:steps.map(n=>entries.get(n).velocity),origins:Object.fromEntries([...entries].map(([n,e])=>[n,e.original])),degrees});
  if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function notes(track,sound,bar,local,seed,transpose,bars,absoluteStep,mode,timeSignature){
  const p=plan(track,sound,seed,bars,timeSignature),role=p.trackRole,spb=p.timeSignature==='3/4'?12:16;
  const clock=track.manualSteps?mod(absoluteStep,(track.manualBars||bars)*spb):absoluteStep;
  const original=p.origins[mod(clock,p.period)]??mod(clock,bars*spb),cell=Math.floor(original/spb),step=original%spb;
  // Harmonic position follows the shared bar clock, even with a manually edited cycle.
  const chord=chordFor(track.setup,seed,bar,bars,transpose,mode);
  const within=p.steps.filter(n=>Math.floor(p.origins[n]/spb)===cell),ordinal=Math.max(0,within.filter(n=>p.origins[n]%spb<=step).length-1);
  const contour=p.degrees,answer=cell%4>=2,degree=contour[mod(ordinal+(answer?2:0),contour.length)];
  if(role==='bass'){
   const fifth=chordFor(track.setup,seed,bar,bars,transpose,mode)[0]+7;
   // Root-led electric/sub bass; a fifth pickup does not compete with the hook.
   return [(step===0||step%4===0?chord[0]:ordinal%3===2?fifth:chord[0])-12];
  }
  if(role==='harmony')return chord.map(n=>n+(track.setup==='reactor'?12:0));
  if(role==='texture')return [chord[0]+12];
  if(role==='melody'&&track.setup==='reactor'&&sound.engine==='guitar'&&!sound.lead)return [chord[0]+12,chord[0]+19];
  const pitch=chord[degree%chord.length];
  // Narrow repeating hooks, with a final chord-root answer and a separate arp register.
  const final=cell===bars-1&&step>=spb-4;
  return [(final?chord[0]:pitch)+(track.setup==='reactor'?role==='arpeggio'?24:12:role==='arpeggio'?12:0)];
 }
 function sequence(setup,role,seed,bars,timeSignature){
  // Genre grooves share a bar. Surprise belongs in authored fills, not drifting kick/snare cycles.
  return {length:timeSignature==='3/4'?12:16,stepLength:1,offset:0};
 }
 function active(setup,seed){
  const p=profile(setup,seed),keep=new Set([0,1,4,5,...p[7]]);
  return keep;
 }
 function weight(setup,role,sound,seed){
  if(setup==='water'){
   const groove=profile(setup,seed)[5];
   if(sound.id.includes('handpan'))return groove===4?3:1;
   if(role==='melody')return /liquid-fm|chopped-vowel|prism-stab/.test(sound.id)?4:2;
   if(role==='bass')return groove===2?/reef-reese|hollow-bass/.test(sound.id)?4:1:/elastic-sub|hollow-bass/.test(sound.id)?4:1;
   return 2;
  }
  if(/(?:gain-guitar|fuzz-bass|feedback-lead|war-tom|heavy-snare|arena-snare|crash)$/.test(sound.id)||/high gain|fuzz|feedback|war tom|heavy snare|layered snare|crash/i.test(sound.name))return 0;
  if(role==='pulse'&&sound.engine!=='kick'||role==='accent'&&sound.engine!=='snare'||role==='percussion'&&sound.engine!=='metal'||role==='texture'&&sound.engine!=='tom')return 0;
  if(role==='melody')return /palm-guitar|crunch-guitar/.test(sound.id)?5:0;
  if(role==='arpeggio')return sound.lead?(/picked-lead/.test(sound.id)?4:1):sound.engine==='rocksynth'&&sound.arp?2:0;
  if(role==='harmony')return sound.engine==='piano'?5:0;
  if(role==='bass')return sound.engine==='rockbass'?/pick-bass|muted-bass/.test(sound.id)?4:2:0;
  return /dry-kick|dry-snare|tight-hat|mid-tom/.test(sound.id)?4:1;
 }
 const api={VERSION:4,supports,profiles,rhythms,triple,contours,profile,ensemble,chordFor,plan,notes,sequence,active,weight};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloWorldPhrases=api;
})(typeof globalThis!=='undefined'?globalThis:this);
