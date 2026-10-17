/* Bounded phrase references and deterministic arrangement, independent of UI/audio. */
(function(root){
 'use strict';
 const MAX_BYTES=524288,MAX_BARS=128;
 const copy=x=>JSON.parse(JSON.stringify(x));
 function numberVolume(n){if(!Number.isFinite(n)||n<0||n>100)throw Error('Invalid master volume');return n}
 function phraseName(value){if(typeof value!=='string'||value.length>20||Array.from(value).length<1||Array.from(value).length>10||! /^[\p{L}\p{N}]+$/u.test(value))throw Error('Phrase name: 1–10 letters or digits, no spaces');return value}
 function validate(value,project,sounds){
  if(!value||value.format!=='halo-composition'||value.version!==1||!Array.isArray(value.phrases)||!value.phrases.length||value.phrases.length>32||!Array.isArray(value.sections)||!value.sections.length||value.sections.length>32)throw Error('Invalid composition');
  const phrases=value.phrases.map(p=>({id:p.id,...(p.label!==undefined?{label:phraseName(p.label)}:{}),project:project.validate(p.project,sounds)})),ids=new Set();
  for(const p of phrases){if(!Number.isSafeInteger(p.id)||p.id<1||p.id>1000000||ids.has(p.id))throw Error('Invalid phrase reference');ids.add(p.id);if(p.project.setup!==phrases[0].project.setup)throw Error('Mixed sound worlds are unsupported')}
  const sections=value.sections.map(s=>{if(!ids.has(s.phrase)||!Number.isInteger(s.repeats)||s.repeats<1||s.repeats>8||!['intro','verse','verse2','chorus','bridge','outro','phrase'].includes(s.name)||!['none','in','out'].includes(s.fade))throw Error('Invalid section');return {phrase:s.phrase,repeats:s.repeats,name:s.name,fade:s.fade}});
  const result={format:value.format,version:1,repeat:value.repeat===true,tempo:project.bpm(String(value.tempo)),masterVolume:typeof value.masterVolume==='number'?numberVolume(value.masterVolume):phrases[0].project.masterVolume,mix:project.mixSettings(value.mix??phrases[0].project.mix),phrases,sections};
  if(bars(result)>MAX_BARS)throw Error('Composition exceeds 128 bars');if(new TextEncoder().encode(JSON.stringify(result)).length>MAX_BYTES-128)throw Error('Composition exceeds size limit');return result;
 }
 function parse(text,project,sounds){if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Composition exceeds size limit');return validate(JSON.parse(text),project,sounds)}
 function phrase(song,index){return song.phrases.find(p=>p.id===song.sections[index].phrase).project}
 function bars(song){return song.sections.reduce((n,s,i)=>n+phrase(song,i).bars*s.repeats,0)}
 function at(song,step){let start=0;for(let i=0;i<song.sections.length;i++){const p=phrase(song,i),s=song.sections[i],spb=p.timeSignature==='3/4'?12:16,barSteps=p.bars*spb,length=barSteps*s.repeats;if(step<start+length){const local=step-start,edge=barSteps;return {index:i,project:p,local:local%barSteps,absolute:p.startStep+local%barSteps,gain:s.fade==='in'?Math.min(1,(local+1)/edge):s.fade==='out'?Math.min(1,Math.max(0,(length-local-1)/edge)):1}}start+=length}return null}
 function duplicate(song,index,independent){const next=copy(song),s=copy(next.sections[index]);if(independent){const id=Math.max(...next.phrases.map(p=>p.id))+1;next.phrases.push({id,project:copy(phrase(next,index))});s.phrase=id;s.name='phrase';s.fade='none'}next.sections.splice(index+1,0,s);return next}
 function build(source){const sounds=typeof module!=='undefined'&&module.exports?require('./sounds.js'):root.HaloSounds,arranger=typeof module!=='undefined'&&module.exports?require('./arranger.js'):root.HaloArranger;return arranger.build(source,sounds)}

 const api={MAX_BYTES,MAX_BARS,phraseName,validate,parse,phrase,bars,at,duplicate,build,copy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloSong=api;
})(globalThis);
