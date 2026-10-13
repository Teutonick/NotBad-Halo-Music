(function(root){
 'use strict';
 const MAX_BYTES=65536;
 function number(value,min,max){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Invalid numeric value');return value}
 function bpm(text){if(typeof text!=='string'||text.length>7||!/^\d{2,3}(\.\d{1,2})?$/.test(text))throw Error('BPM must be 30–200');return number(Number(text),30,200)}
 function mixSettings(value={}){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid mix settings');return {low:number(value.low??0,-9,9),mid:number(value.mid??0,-9,9),high:number(value.high??0,-9,9),width:number(value.width??35,0,100)}}
 function validate(data,sounds){
  if(!data||data.format!=='notbad-halo-project'||data.version!==1||![4,8].includes(data.bars))throw Error('Unsupported project');
  if(data.setup!==undefined&&!['ambient','reactor'].includes(data.setup))throw Error('Unsupported setup');
  const setup=data.setup||'ambient',banks=sounds.banksFor(setup);
  const startStep=number(data.startStep??0,0,1000000000);if(!Number.isInteger(startStep)||startStep%(data.bars*16)!==0)throw Error('Invalid phrase position');
  const result={format:data.format,version:1,setup,bars:data.bars,startStep,tempo:number(data.tempo,30,200),masterVolume:number(data.masterVolume??50,0,100),mix:mixSettings(data.mix),seed:number(data.seed,1,1000000000),key:number(data.key,0,11),tracks:[]};
  if(!Number.isInteger(result.seed)||!Number.isInteger(result.key)||!Array.isArray(data.tracks)||data.tracks.length!==8)throw Error('Invalid project state');
  const names=Object.keys(banks),seen=new Set();
  for(const t of data.tracks){
   const instrument=t?.instrument??t?.name,generator=t?.generator??1;
   if(!t||!names.includes(t.name)||!names.includes(instrument)||![1,2,3].includes(generator)||seen.has(t.name)||typeof t.on!=='boolean'||!banks[instrument].sounds.some(s=>s.id===t.sound)||!Array.isArray(t.steps)||t.steps.length>128||t.steps.some(n=>!Number.isInteger(n)||n<0||n>=data.bars*16)||new Set(t.steps).size!==t.steps.length)throw Error('Invalid track');
   seen.add(t.name);const clean={name:t.name,instrument,generator,sound:t.sound,on:t.on,steps:[...t.steps].sort((a,b)=>a-b)};
   if(generator===3){const role=sounds.roles.forTrack(t).id;if(t.role!==undefined&&t.role!==role||t.exact!==undefined&&typeof t.exact!=='boolean'||!sounds.roles.compatible(t,banks[instrument].sounds.find(s=>s.id===t.sound)))throw Error('Invalid track role');clean.role=role;clean.sequence=sounds.roles.sequence(t.sequence);clean.exact=t.exact===true}
   for(const field of ['level','density','character','duration','space'])clean[field]=number(t[field],0,100);
   result.tracks.push(clean);
  }
  result.tracks.sort((a,b)=>names.indexOf(a.name)-names.indexOf(b.name));return result;
 }
 function parse(text,sounds){if(typeof text!=='string'||text.length>MAX_BYTES||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Project file exceeds 64 KiB');let data;try{data=JSON.parse(text)}catch{throw Error('Invalid JSON file')}return validate(data,sounds)}
 function capture(tracks,bars,tempo,seed,key,sounds,motion,masterVolume=50,mix,startStep=0){sounds.arrange(tracks);return validate({format:'notbad-halo-project',version:1,setup:tracks[0]?.setup||'ambient',bars,startStep,tempo,masterVolume,mix,seed,key,tracks:tracks.map((t,i)=>({...t,exact:!!t.manualSteps,steps:motion.phraseSteps({...t,variation:seed},i,startStep,seed,sounds,bars).filter(e=>e.fires).map(e=>e.step)}))},sounds)}
 function wav(buffer){
  const length=buffer.length,channels=buffer.numberOfChannels,bytes=new ArrayBuffer(44+length*channels*2),v=new DataView(bytes);
  const text=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};
  text(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,length*channels*2,true);
  const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let at=44;
  for(let n=0;n<length;n++)for(let ch=0;ch<channels;ch++){const sample=Number.isFinite(data[ch][n])?Math.max(-1,Math.min(1,data[ch][n])):0;v.setInt16(at,sample<0?sample*32768:sample*32767,true);at+=2}return bytes;
 }
 const api={MAX_BYTES,bpm,validate,parse,capture,wav,mixSettings};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloProject=api;
})(typeof globalThis!=='undefined'?globalThis:this);
