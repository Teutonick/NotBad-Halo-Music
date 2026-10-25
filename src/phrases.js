/* Version 2: original local motifs and ensemble rules, no model/network/runtime dependency. */
(function(root){
 'use strict';
 const VERSION=2,slots=Object.freeze(['GLASS','TIDAL','ROOT','EMBER','RAIN','VEIL','MOSS','AURA']);
 const scale=[0,2,3,5,7,8,10];
 const profiles={
  ambient:[
   ['still-water','Still water','Тихая вода',[0,5,2,6],0],
   ['open-sky','Open sky','Открытое небо',[0,2,5,3],1],
   ['slow-tide','Slow tide','Медленный прилив',[0,3,5,6],2],
   ['glass-garden','Glass garden','Стеклянный сад',[2,6,0,5],3],
   ['warm-current','Warm current','Тёплое течение',[0,5,3,0],4],
   ['woodland','Woodland','Лес',[3,0,2,5],5],
   ['night-air','Night air','Ночной воздух',[0,6,5,0],6],
   ['distant-lights','Distant lights','Далёкие огни',[5,2,6,0],7],
   ['soft-pulse','Soft pulse','Мягкий пульс',[0,3,6,5],8],
   ['floating-room','Floating room','Парящая комната',[0,2,3,0],9]
  ],
  reactor:[
   ['arena-pulse','Arena pulse','Пульс арены',[0,0,5,6],0],
   ['half-time','Half time','Половинный ритм',[0,5,3,6],1],
   ['driving-eighths','Driving eighths','Напористые восьмые',[0,6,5,6],2],
   ['piano-engine','Piano engine','Фортепианный двигатель',[0,2,5,6],3],
   ['broken-groove','Broken groove','Ломаный грув',[0,3,5,0],4],
   ['octave-motor','Octave motor','Октавный мотор',[0,5,0,6],5],
   ['rising-room','Rising room','Нарастание',[3,5,6,0],6],
   ['sparse-heavy','Sparse heavy','Тяжёлые паузы',[0,0,3,5],7],
   ['melodic-drive','Melodic drive','Мелодичный драйв',[0,2,6,5],8],
   ['final-answer','Final answer','Финальный ответ',[5,6,0,0],9]
  ]
 };
 // Each row is an authored rhythm + chord-degree contour, not a rotated preset.
 const rhythms={
  accent:[[0,7,12],[2,9],[0,6,11,15],[3,8,14],[0,10],[1,5,12],[4,11,15],[0,5,9],[2,7,13],[0,8,15]],
  bed:[[0],[0,10],[2],[0,8],[3,12],[0,6],[4],[0,12],[2,10],[0,7]],
  bass:[[0,8],[0,6,8,14],[0,3,8,11],[0,7,10],[0,4,8,12],[0,6,10,15],[0,2,8,14],[0,5,9,12],[0,8,11,14],[0,3,6,8,13]],
  pluck:[[0,5,10],[2,7,11,15],[0,4,9,14],[3,6,12],[0,7,8,15],[1,5,9,13],[0,6,11],[2,8,14],[0,3,10,12],[4,7,11,15]],
  rhythm:[[2,6,10,14],[0,4,10],[3,7,12,15],[0,6,8,14],[2,5,11],[0,3,8,12],[4,9,14],[1,6,10,15],[0,7,12],[2,8,11,14]],
  texture:[[0],[4],[0,12],[2,10],[6],[0,8],[3],[1,11],[0,14],[7]],
  wood:[[3,9,13],[0,6,11],[2,7,14],[0,5,10,15],[4,8,13],[1,6,12],[0,3,9],[2,8,11,15],[5,10,14],[0,7,12]],
  kick:[[0,8],[0,6,8],[0,3,8,10],[0,7,8,14],[0,4,8,12],[0,6,10,14],[0,2,8,11],[0,5,8],[0,8,10,15],[0,3,6,8,14]],
  snare:[[4,12],[8],[4,11,12],[4,12,15],[4,10,12],[4,7,12],[4,12,14],[4,8,12],[4,12,13,15],[4,6,12]],
  metal:[[0,2,4,6,8,10,12,14],[2,6,10,14],[0,4,8,12],[0,3,6,8,11,14],[2,4,8,10,14],[0,6,8,12,15],[1,5,9,13],[0,2,6,8,10,14],[0,7,8,15],[0,4,6,10,12,14]],
  tom:[[10,14],[6,12,15],[3,10,14],[8,11,14,15],[2,9,13],[7,12,14],[4,10,15],[1,8,12],[5,11,14],[6,10,13,15]],
  riff:[[0,3,6,8,14],[0,8,11],[0,2,6,8,10,14],[0,5,8,13],[1,4,7,10,14],[0,7,8,15],[0,4,10,12],[2,6,9,14],[0,3,8,12,15],[0,6,8,11,14]],
  lead:[[2,7,11],[3,10,15],[1,6,9,14],[2,5,11,15],[3,7,10],[1,9,13],[2,6,11,14],[3,10,12,15],[1,5,9],[2,7,13,15]],
  keys:[[0,4,8,12],[0,6,11],[0,8],[2,6,10,14],[0,3,7,10,14],[0,5,8,13],[1,4,9,12],[0,2,8,10],[0,7,12],[2,5,8,11,14]]
 };
 const rhythms3_4_waltz={
  accent:[[0,8],[4],[0,4,8],[2,8],[0,6,10],[4,10],[0,2,8],[3,7,11],[0,4,10],[2,6,8,11]],
  bed:[[0],[0,6],[2],[0,8],[4],[0,4],[6],[2,8],[0,10],[4,8]],
  bass:[[0],[0,4],[0,8],[0,4,8],[0,6],[0,4,7],[0,2,4],[0,8,10],[0,6,8],[0,4,8,10]],
  pluck:[[0,2,4,6,8,10],[4,6,8,10],[0,4,8],[2,4,8,10],[0,3,6,9],[0,2,6,8],[4,8],[0,4,6,10],[2,6,8,11],[0,2,4,7,8,10]],
  rhythm:[[0,2,4,6,8,10],[2,4,6,8,10],[0,4,8],[4,8],[0,3,6,9],[0,4,6,8,10],[2,6,10],[0,2,6,8],[4,7,8,11],[0,4,7,10]],
  texture:[[0],[4],[0,6],[2,8],[6],[0,8],[3,9],[0,10],[4,8],[0,4,8]],
  wood:[[2,6,10],[0,4,8],[4,8],[0,2,6,8],[2,4,8,10],[0,6],[4,7,10],[1,5,9],[0,4,7,8],[2,8,11]],
  kick:[[0],[0,8],[0,4],[0,6],[0,8,10],[0,4,8],[0,2],[0,7],[0,4,10],[0,2,8]],
  snare:[[4,8],[4],[8],[4,8,11],[4,7,8],[4,10],[2,4,8],[8,10],[4,6,8],[2,8,11]],
  metal:[[0,4,8],[4,8],[0,2,4,6,8,10],[0,4,6,8,10],[2,4,6,8,10],[0,3,4,7,8,11],[0,8],[4,8,10],[0,2,4,8],[0,4,7,8,10]],
  tom:[[0,8],[8,10],[6,10],[4,8,10],[0,4],[2,6,10],[7,9,11],[0,10],[4,8],[6,8,10,11]],
  riff:[[0,4,8],[0,2,4,8],[0,4,6,8],[0,3,6,9],[2,4,7,10],[0,6,10],[0,2,6,8,10],[0,4,7,11],[2,6,8],[0,4,8,10]],
  lead:[[0,4,8],[2,4,8,10],[0,3,6,8],[0,2,6,9],[4,6,8,11],[0,4,7,10],[2,5,8],[0,6,8,10],[1,4,8,10],[0,2,4,8,11]],
  keys:[[4,8],[0,4,8],[4,6,8],[2,4,8,10],[0,6,8],[4,8,11],[0,4,8,10],[4,7,9],[0,2,4,8],[2,6,10]]
 };
 const rhythms6_8_swing={
  accent:[[0,6],[6],[0,4,6],[2,6,10],[0,3,6,9],[4,6,10],[0,2,6,8],[0,6,10],[2,8,11],[0,4,6,8,10]],
  bed:[[0,6],[0],[0,4,6],[2,6,8],[0,8],[4,6,10],[0,3,6],[2,8,10],[0,6,10],[0,4,8]],
  bass:[[0,6],[0,4,6,10],[0,2,4,6,8,10],[0,3,6,9],[0,4,6],[0,6,8,10],[0,2,6],[0,4,6,9],[0,5,6,10],[0,2,4,6,8]],
  pluck:[[0,2,4,6,8,10],[0,4,6,10],[2,4,8,10],[0,3,6,8,10],[4,6,8,10],[0,2,6,8],[0,4,8,10],[2,6,9,11],[0,2,4,6,10],[0,6,8,10]],
  rhythm:[[0,2,4,6,8,10],[0,4,6,10],[2,4,8,10],[0,3,6,9],[4,6,10],[0,2,6,8],[0,6],[2,6,10],[0,4,8,10],[0,2,4,6,7,10]],
  texture:[[0],[6],[0,6],[2,8],[4,10],[0,4],[3,9],[0,8],[6,11],[0,6,10]],
  wood:[[0,2,4,6,8,10],[0,4,6,10],[2,4,8,10],[4,6,10],[0,3,6,9],[0,2,6],[2,6,8,10],[0,6,10,11],[4,7,10],[0,2,4,7,10]],
  kick:[[0,6],[0,4,6],[0,6,10],[0,3,6],[0,4,6,10],[0,2,6],[0,6,8],[0,2,4,6],[0,5,6,11],[0,4,6,8,10]],
  snare:[[6],[6,10],[4,6],[6,11],[0,6],[2,6,10],[4,6,10],[6,8,10],[2,4,6,10],[0,3,6,9]],
  metal:[[0,2,4,6,8,10],[0,4,6,10],[0,6],[2,4,8,10],[0,3,6,9],[0,2,6,8],[0,2,4,6,8,11],[4,6,10],[0,2,4,6,7,8,10],[0,6,10]],
  tom:[[0,4,6,10],[6,10,11],[0,6],[4,6,8,10],[2,4,6,10],[0,2,6],[6,8,10],[0,3,6,9],[0,4,6,8,10],[4,6,10,11]],
  riff:[[0,3,4,6,9,10],[0,2,4,6,8,10],[0,4,6,10],[0,6],[0,2,6,8],[0,3,6,8,11],[0,4,6,9],[2,4,6,8,10],[0,5,6,10],[0,2,4,6,8]],
  lead:[[0,2,4,6,8],[0,4,6,10],[0,3,6,8,10],[2,4,6,9,11],[0,2,6,8,10],[0,4,6,8],[1,4,6,10],[0,3,4,6,9,10],[2,5,8,11],[0,2,4,6,8,10]],
  keys:[[0,4,6,10],[0,6],[0,2,4,6,8,10],[2,4,6,8,10],[0,3,6,9],[4,6,10],[0,2,6,8],[0,4,6,8,11],[0,6,9,11],[2,6,10]]
 };
 const contours={
  accent:[[0,2,1],[3,1,0],[0,1,3,2],[2,0,1],[0,3],[1,2,0],[3,2,1],[0,2,3],[1,0,2],[2,3,0]],
  bed:[[0,1,2],[1,2,3],[0,2,3],[2,0,1],[3,1,2],[0,1,3],[1,0,2],[2,3,1],[3,2,0],[0,3,2]],
  bass:[[0,2,0,3],[0,0,2,1],[0,3,2,0],[0,1,2,3],[0,2,1,0],[0,3,0,2],[0,1,0,3],[0,2,3,2],[0,3,1,0],[0,2,0,1]],
  pluck:[[0,1,2,3],[0,2,1,3],[3,2,1,0],[0,3,2,1],[1,2,0,3],[2,1,3,0],[0,2,3,1],[1,3,2,0],[0,1,3,2],[2,0,1,3]],
  wood:[[0,2,1],[1,3,0],[2,0,3],[0,1,2,3],[3,1,0],[0,3,2],[1,0,2],[2,3,1],[0,2,3],[3,2,0]],
  riff:[[0,0,2,0,3],[0,3,2],[0,2,0,1,2,3],[0,1,2,0],[2,0,3,0,2],[0,3,0,2],[0,2,1,0],[3,2,0,1],[0,1,0,3,2],[2,0,1,0,3]],
  lead:[[0,1,2,3],[3,2,1,0],[0,2,1,3],[2,1,0,3],[0,3,2,1],[1,2,3,0],[3,1,2,0],[0,2,3,1],[1,0,2,3],[2,3,1,0]],
  keys:[[0,1,2,3],[0,2,3,1],[0,3,1,2],[3,2,1,0],[0,1,3,2],[2,0,1,3],[1,3,0,2],[0,2,1,3],[3,0,2,1],[1,2,0,3]]
 };
 const familyNames=[['Ground','Опора'],['Answer','Ответ'],['Broken','Ломаная'],['Climb','Подъём'],['Return','Возврат'],['Pendulum','Маятник'],['Steps','Ступени'],['Echo','Эхо'],['Space','Пространство'],['Turn','Поворот']];
 function makeCatalog(sourceRhythms){
  return Object.fromEntries(Object.entries(sourceRhythms).map(([role,rows])=>[role,rows.map((steps,i)=>Object.freeze({id:role+'-'+i,en:familyNames[i][0],ru:familyNames[i][1],steps:Object.freeze(steps),degrees:Object.freeze((contours[role]||[[0]])[i%((contours[role]||[[0]]).length)])}))]));
 }
 const catalog=makeCatalog(rhythms);
 const catalog3_4_waltz=makeCatalog(rhythms3_4_waltz);
 const catalog6_8_swing=makeCatalog(rhythms6_8_swing);
 Object.values(catalog).forEach(Object.freeze);Object.freeze(catalog);
 Object.values(catalog3_4_waltz).forEach(Object.freeze);Object.freeze(catalog3_4_waltz);
 Object.values(catalog6_8_swing).forEach(Object.freeze);Object.freeze(catalog6_8_swing);
 function getCatalog(timeSignature='4/4',bars=4){
  if(timeSignature==='3/4')return bars===8?catalog6_8_swing:catalog3_4_waltz;
  return catalog;
 }
 profiles.water=[['reef-step','Reef step','Рифовый шаг',[0,0,5,6],0],['tidal-dub','Tidal dub','Приливный даб',[0,5,0,3],1],['broken-reef','Broken reef','Ломаный риф',[0,6,3,5],2],['acid-lagoon','Acid lagoon','Эйсид-лагуна',[0,0,3,0],3],['deep-house','Deep house','Глубокий хаус',[0,5,2,6],4],['liquid-trance','Liquid trance','Жидкий транс',[0,6,5,3],5],['half-tide','Half tide','Полуприлив',[0,3,0,5],6],['circuit-surf','Circuit surf','Цифровой прибой',[0,2,6,0],7],['submarine','Submarine','Под водой',[0,0,5,0],8],['ocean-break','Ocean break','Океанский брейк',[0,5,6,0],9]];
 Object.values(profiles).forEach(list=>{list.forEach(profile=>{Object.freeze(profile[3]);Object.freeze(profile)});Object.freeze(list)});Object.freeze(profiles);
 const unpitched=new Set(['kick','snare','metal','tom','rhythm','texture']);
 function roleFor(track,sound){
  if(sound.id==='tom'||sound.engine==='tom')return 'tom';
  if(sound.engine==='kick'||sound.engine==='drop')return 'kick';
  if(['snare','clap'].includes(sound.engine))return 'snare';
  if(sound.engine==='metal'||sound.id==='hat')return 'metal';
  if(sound.engine==='noise')return sound.ambient?'texture':'rhythm';
  if(['bass','rockbass'].includes(sound.engine))return 'bass';
  if(sound.engine==='guitar')return sound.lead?'lead':'riff';
  if(['piano','rocksynth'].includes(sound.engine))return 'keys';
  if(sound.engine==='pad')return 'bed';
  if(sound.engine==='pluck')return 'pluck';
  if(sound.engine==='wood')return 'wood';
  return 'accent';
 }
 // All same-world instrument/orbit pairs are allowed; musical role is independent of geometry.
 const matrix=Object.freeze(Object.fromEntries(['ambient','reactor','water'].map(world=>[world,Object.freeze(Object.fromEntries(slots.map(instrument=>[instrument,Object.freeze(Object.fromEntries(slots.map(orbit=>[orbit,Object.freeze({allowed:true,fit:instrument===orbit?'native':'alternative'})])))])))])));
 function pair(a,b){return Object.freeze({allowed:true,relation:a===b?'layer':unpitched.has(a)!==unpitched.has(b)?'support':'contrast',balance:a===b?'share':'independent'})}
 const roleMatrix=Object.freeze(Object.fromEntries(Object.keys(catalog).map(a=>[a,Object.freeze(Object.fromEntries(Object.keys(catalog).map(b=>[b,pair(a,b)])))])));
 function assignments(tracks,sounds){
  const roles=tracks.map(t=>roleFor(t,sounds.soundFor(t)));
  return roles.map((role,i)=>({role,count:roles.filter(r=>roleMatrix[role][r].balance==='share').length,ordinal:roles.slice(0,i).filter(r=>roleMatrix[role][r].balance==='share').length}));
 }
 function ensemble(setup,seed){const list=(profiles[setup]||profiles.ambient);return list[(seed-1)%list.length]}
 const majorScale=Object.freeze([0,2,4,5,7,9,11]);
 function chordFor(setup,seed,bar,bars=4,transpose=0,mode='minor'){
  if(typeof transpose==='object'&&transpose!==null){mode=transpose.mode||mode;transpose=transpose.offset??0}
  const profile=ensemble(setup,seed),degrees=profile[3];
  // The second four bars answer the first, with a tonic resolution on bar eight.
  const degree=bars===8&&bar%8===7?0:degrees[bar%4];
  const tonic=setup==='reactor'?38:50;
  const currentScale=mode==='major'?majorScale:scale;
  return [0,2,4,6].map(n=>tonic+currentScale[(degree+n)%7]+12*Math.floor((degree+n)/7)+transpose);
 }
 const cache=new Map();
 function plan(track,sound,seed,bars=4,timeSignature=track.timeSignature||'4/4'){
  bars=bars===8?8:4;
  timeSignature=timeSignature==='3/4'?'3/4':'4/4';
  const spb=timeSignature==='3/4'?12:16;
  const isWaltz=timeSignature==='3/4'&&bars===4;
  const isSwing=timeSignature==='3/4'&&bars===8;
  const cat=getCatalog(timeSignature,bars);
  const role=roleFor(track,sound),assignment=track.arrangement||{count:1,ordinal:0},lane=slots.indexOf(track.name);
  const key=[track.setup,track.instrument||track.name,sound.id,lane,seed,bars,timeSignature,assignment.count,assignment.ordinal].join(':');
  if(cache.has(key))return cache.get(key);
  const profile=ensemble(track.setup,seed),family=(profile[4]+lane*3+assignment.ordinal*2+Math.floor((seed-1)/10)*7)%10,motif=cat[role][family];
  const steps=[],accents=[];
  for(let bar=0;bar<bars;bar++){
   let local=[...(bar>=4?cat[role][(family+1)%10].steps:motif.steps)];
   const answer=bar%4===3||bar>=4;
   if(['bed','texture'].includes(role)){
    // Long voices leave breathing room; duplicates share alternating bars.
    const spacing=Math.min(bars,Math.max(2,assignment.count));
    if(bar%spacing!==assignment.ordinal%spacing)local=[];
   }else if(role==='metal'&&sound.sparse)local=[(bar%2)*(isSwing?6:isWaltz?4:8)];
   else if(answer){
    const addition=isSwing?(role==='lead'?10:role==='tom'?11:role==='snare'?10:8):isWaltz?(role==='lead'?10:role==='tom'?10:role==='snare'?8:9):(role==='lead'?15:role==='tom'?15:role==='snare'?14:13);
    if((seed+bar)%2===0)local.push(addition);else if(local.length>2)local.splice(local.length-1,1);
   }
   if(track.setup==='ambient'&&['rhythm','metal','tom'].includes(role)&&local.length>4)local=local.filter((_,i)=>i%2===0);
   // Repeated roles distribute activity but never forcibly mute a slot.
   if(assignment.count>1)local=local.filter((step,i)=>i%assignment.count===assignment.ordinal||i===0);
   local=[...new Set(local)].sort((a,b)=>a-b);
   for(const step of local){
    steps.push(bar*spb+step);
    let acc;
    if(isSwing)acc=step===0?.90:step===6?.86:step%2===0?.76:.64;
    else if(isWaltz)acc=step===0?.88:(step===4||step===8)?.78:.64;
    else acc=step%4===0?.86:step>=12&&answer?.77:.64;
    accents.push(acc);
   }
  }
  const result=Object.freeze({version:VERSION,role,ensemble:profile[0],family:motif.id,bars,timeSignature,steps:Object.freeze(steps),accents:Object.freeze(accents),degrees:motif.degrees});
  if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function fold(note,low,high){while(note<low)note+=12;while(note>high)note-=12;return note}
 function notes(track,sound,bar,local,seed,transpose=0,bars=4,mode='minor',timeSignature=track.timeSignature||'4/4'){
  if(typeof transpose==='object'&&transpose!==null){mode=transpose.mode||mode;transpose=transpose.offset??0}
  const spb=timeSignature==='3/4'?12:16;
  const p=plan(track,sound,seed,bars,timeSignature),role=p.role;if(unpitched.has(role))return [];
  const chord=chordFor(track.setup,seed,bar,bars,transpose,mode);
  const within=p.steps.filter(step=>Math.floor(step/spb)===bar%bars).map(step=>step%spb);
  const ordinal=Math.max(0,within.filter(step=>step<=local).length-1);
  const answer=bar>=4||(bar%4===3),contour=p.degrees;
  const degree=bar%bars===bars-1&&local>=(within.at(-1)??(spb-1))?0:contour[(ordinal+(answer?bar%3:0))%contour.length];
  const pitch=chord[degree%4],world=track.setup==='reactor';
  if(role==='bass')return [fold(pitch-12,26,world?45:49)];
  if(role==='riff'){
   // A fifth above the chosen chord tone, quantized to the active scale.
   let fifth=pitch+7;const tonic=38+transpose,currentScale=mode==='major'?majorScale:scale;
   if(!currentScale.includes(((fifth-tonic)%12+12)%12))fifth--;
   return [fold(pitch+12,41,82),fold(fifth+12,48,89)];
  }
  if(role==='lead'){const n=fold(pitch+24+(answer&&ordinal%3===0?12:0),50,89),upper=fold(n+12,50,89);return [n,...(sound.octave&&upper!==n?[upper]:[])]}
  if(role==='bed')return [0,1,2].map((_,i)=>fold(chord[(i+degree)%4]+((track.instrument||track.name)==='VEIL'?-12:0),38,76));
  if(role==='keys'&&!sound.arp&&p.family.endsWith('2'))return chord.slice(0,3).map(n=>fold(n+12,42,86));
  return [fold(pitch+(world?24:role==='wood'?0:12),world?40:48,world?85:88)];
 }
 function velocity(track,sound,step,seed,bars=4,timeSignature=track.timeSignature||'4/4'){const spb=timeSignature==='3/4'?12:16;const p=plan(track,sound,seed,bars,timeSignature),i=p.steps.indexOf(step%(p.bars*spb));return i<0?.72:p.accents[i]}
 const api={VERSION,slots,catalog,catalog3_4_waltz,catalog6_8_swing,getCatalog,profiles,matrix,roleMatrix,roleFor,assignments,ensemble,chordFor,plan,notes,velocity};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloPhrases=api;
})(typeof globalThis!=='undefined'?globalThis:this);
