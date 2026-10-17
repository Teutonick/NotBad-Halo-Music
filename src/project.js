(function(root){
 'use strict';
 const MAX_BYTES=65536,MAX_TOKEN=24000,MAX_SHARE_BYTES=524288;
 function number(value,min,max){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Invalid numeric value');return value}
 function bpm(text){if(typeof text!=='string'||text.length>7||!/^\d{2,3}(\.\d{1,2})?$/.test(text))throw Error('BPM must be 30–200');return number(Number(text),30,200)}
 function mixSettings(value={}){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid mix settings');return {low:number(value.low??0,-9,9),mid:number(value.mid??0,-9,9),high:number(value.high??0,-9,9),width:number(value.width??35,0,100)}}
 function liveLoop(value){
  if(!value||value.version!==1||!Array.isArray(value.layerIds)||value.layerIds.length>128)throw Error('Invalid Track 09');
  const layerIds=value.layerIds.map(id=>{if(!Number.isSafeInteger(id)||id<0)throw Error('Invalid audio reference');return id});
  const input=value.settings;if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid Track 09 settings');
  const settings={},ranges={bars:[1,8],level:[0,100],pan:[-100,100],space:[0,100],delay:[0,100],trimStart:[0,.95],trimEnd:[.01,1],offsetSec:[0,120],latencyMs:[0,200],pitch:[-12,12],rootNote:[36,84],pitchOctave:[-1,1],character:[0,100],duration:[0,100],density:[0,100],chorus:[0,100],cycle:[4,32],stepLength:[1,4],offset:[0,15]};
  for(const [key,range] of Object.entries(ranges))if(input[key]!==undefined)settings[key]=number(input[key],...range);
  for(const key of ['mute','solo','monitor','copyrightConfirmed','instantRestart','reverse'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error('Invalid Track 09 flag');settings[key]=input[key]}
  for(const [key,allowed] of Object.entries({bars:[1,2,4,8],stepLength:[1,2,4],mode:['loop','slice','pitch'],sliceCount:[4,8,16],slicePattern:['beat','chrono','shuffle','arp','arpeggio','custom'],delayTime:['1/16','1/8','1/8d','1/4']}))if(input[key]!==undefined){if(!allowed.includes(input[key]))throw Error('Invalid Track 09 option');settings[key]=input[key]}
  if(settings.trimStart!==undefined&&settings.trimEnd!==undefined&&settings.trimStart>=settings.trimEnd)throw Error('Invalid audio trim');
  for(const key of ['rootNote','pitchOctave'])if(settings[key]!==undefined&&!Number.isInteger(settings[key]))throw Error('Invalid pitch note');
  if(input.pitchSteps!==undefined){if(!Array.isArray(input.pitchSteps)||input.pitchSteps.length!==16||input.pitchSteps.some(n=>!Number.isInteger(n)||n< -1||n>7))throw Error('Invalid pitch steps');settings.pitchSteps=[...input.pitchSteps]}
  if(input.sliceSteps!==undefined){if(!Array.isArray(input.sliceSteps)||input.sliceSteps.length!==16||input.sliceSteps.some(n=>!Number.isInteger(n)||n< -1||n>15))throw Error('Invalid slice steps');settings.sliceSteps=[...input.sliceSteps]}
  return {version:1,layerIds,settings};
 }
 function validate(data,sounds){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('INVALID_PROJECT: project payload must be an object');
  const format=data.format;
  if(format!=='notbad-halo-project'&&format!=='halo-project')throw Error('UNSUPPORTED_FORMAT: project format must be "notbad-halo-project" or "halo-project" (received: "'+format+'")');
  if(data.version!==1)throw Error('UNSUPPORTED_VERSION: project version must be 1 (received: '+data.version+')');
  if(![4,8].includes(data.bars))throw Error('INVALID_BARS: phrase length must be 4 or 8 bars (received: '+data.bars+')');
  if(data.setup!==undefined&&!['ambient','reactor'].includes(data.setup))throw Error('Unsupported setup');
  if(data.timeSignature!==undefined&&!['4/4','3/4'].includes(data.timeSignature))throw Error('Unsupported time signature');
  const timeSignature=data.timeSignature==='3/4'?'3/4':'4/4';
  const stepsPerBar=timeSignature==='3/4'?12:16;
  const maxPhraseSteps=data.bars*stepsPerBar;
  const setup=data.setup||'ambient',banks=sounds.banksFor(setup);
  const startStep=number(data.startStep??0,0,1000000000);if(!Number.isInteger(startStep)||startStep%maxPhraseSteps!==0)throw Error('Invalid phrase position');
  const seed=data.seed!==undefined?number(data.seed,1,1000000000):1;
  const key=data.key!==undefined?number(data.key,0,23):0;
  if(!Number.isInteger(seed)||!Number.isInteger(key))throw Error('INVALID_HARMONY: seed and key must be integers (key: 0..23, seed: integer)');
  if(!Array.isArray(data.tracks)||data.tracks.length!==8)throw Error('INVALID_TRACKS_COUNT: exactly 8 tracks required in "tracks" array (received: '+(Array.isArray(data.tracks)?data.tracks.length:'non-array')+'). All 8 voice slots must be specified: [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]. To modify fewer tracks, use "track.patch".');
  const result={format:data.format,version:1,setup,bars:data.bars,startStep,tempo:number(data.tempo,30,200),masterVolume:number(data.masterVolume??50,0,100),mix:mixSettings(data.mix),seed,key,tracks:[]};
  if(timeSignature==='3/4')result.timeSignature='3/4';
  const names=Object.keys(banks),seen=new Set();
  for(const t of data.tracks){
   if(!t||typeof t!=='object')throw Error('INVALID_TRACK: track entry must be an object');
   const instrument=t.instrument??t.name,generator=t.generator??1;
   if(!names.includes(t.name))throw Error('INVALID_TRACK_SLOT: unknown track name "'+t.name+'". Valid slot names are: ['+names.join(', ')+']');
   if(!names.includes(instrument))throw Error('INVALID_INSTRUMENT: unknown instrument "'+instrument+'". Valid instruments in "'+setup+'": ['+names.join(', ')+']');
   if(![1,2,3].includes(generator))throw Error('INVALID_GENERATOR: generator must be 1, 2, or 3');
   if(seen.has(t.name))throw Error('DUPLICATE_TRACK: duplicate track slot "'+t.name+'"');
   seen.add(t.name);
   if(typeof t.on!=='boolean')throw Error('INVALID_TRACK_ON: track "'+t.name+'" requires boolean "on" flag');
   let soundId=t.sound;
   if(typeof soundId==='string'&&soundId.startsWith(setup+'-')){
     const stripped=soundId.slice(setup.length+1);
     if(banks[instrument].sounds.some(s=>s.id===stripped))soundId=stripped;
   }
   if(!banks[instrument].sounds.some(s=>s.id===soundId))throw Error('INVALID_SOUND: sound "'+t.sound+'" is not available for slot "'+instrument+'" in world "'+setup+'". Available sounds: ['+banks[instrument].sounds.map(s=>s.id).join(', ')+']');
   if(!Array.isArray(t.steps)||t.steps.length>128||t.steps.some(n=>!Number.isInteger(n)||n<0||n>=maxPhraseSteps)||new Set(t.steps).size!==t.steps.length)throw Error('INVALID_STEPS: steps for track "'+t.name+'" must be unique integers between 0 and '+(maxPhraseSteps-1));
   const clean={name:t.name,instrument,generator,sound:soundId,on:t.on,steps:[...t.steps].sort((a,b)=>a-b)};
   if(generator===3){const role=sounds.roles.forTrack(t).id;if(t.role!==undefined&&t.role!==role||t.exact!==undefined&&typeof t.exact!=='boolean'||!sounds.roles.compatible(clean,banks[instrument].sounds.find(s=>s.id===soundId)))throw Error('Invalid track role');clean.role=role;clean.sequence=sounds.roles.sequence(t.sequence);clean.exact=t.exact===true}
   for(const field of ['level','density','character','duration','space'])clean[field]=number(t[field],0,100);
   clean.delay=number(t.delay??0,0,100);
   clean.delayTime=['1/16','1/8','1/8d','1/4'].includes(t.delayTime)?t.delayTime:'1/8';
   clean.chorus=number(t.chorus??0,0,100);
   if(t.noteEvents!==undefined){
    if(!Array.isArray(t.noteEvents)||t.noteEvents.length>128||generator===3&&!clean.exact)throw Error('Invalid phrase notes');const used=new Set();
    clean.noteTranspose=number(t.noteTranspose??0,-12,12);if(!Number.isInteger(clean.noteTranspose))throw Error('Invalid phrase notes');
    clean.noteEvents=t.noteEvents.map(e=>{if(!e||!clean.steps.includes(e.step)||used.has(e.step)||!Array.isArray(e.notes)||e.notes.length>4||e.notes.some(n=>!Number.isInteger(n)||n<0||n>127))throw Error('Invalid phrase notes');used.add(e.step);return {step:e.step,notes:[...e.notes]}}).sort((a,b)=>a.step-b.step);
   }
   result.tracks.push(clean);
  }
  if(data.liveLoop!==undefined)result.liveLoop=liveLoop(data.liveLoop);
  result.tracks.sort((a,b)=>names.indexOf(a.name)-names.indexOf(b.name));return result;
 }
 function parse(text,sounds){if(typeof text!=='string'||text.length>MAX_BYTES||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Project file exceeds 64 KiB');let data;try{data=JSON.parse(text)}catch{throw Error('Invalid JSON file')}return validate(data,sounds)}
 function capture(tracks,bars,tempo,seed,key,sounds,motion,masterVolume=50,mix,startStep=0,timeSignature='4/4'){
  sounds.arrange(tracks);
  const spb=timeSignature==='3/4'?12:16;
  return validate({format:'notbad-halo-project',version:1,setup:tracks[0]?.setup||'ambient',bars,...(timeSignature==='3/4'?{timeSignature:'3/4'}:{}),startStep,tempo,masterVolume,mix,seed,key,tracks:tracks.map((t,i)=>{const steps=motion.phraseSteps({...t,...(t.manualSteps?{on:true}:{}),variation:seed,timeSignature},i,startStep,seed,sounds,bars,timeSignature).filter(e=>e.fires).map(e=>e.step);return {...t,exact:!!t.manualSteps,steps,...(t.noteEvents?{noteEvents:steps.flatMap(step=>{const e=t.noteEvents.find(e=>e.step===(startStep+step)%((t.manualBars||bars)*spb));return e?[{step,notes:[...e.notes]}]:[]})}:{})}})},sounds);
 }
 function wav(buffer){
  const length=buffer.length,channels=buffer.numberOfChannels,bytes=new ArrayBuffer(44+length*channels*2),v=new DataView(bytes);
  const text=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};
  text(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,length*channels*2,true);
  const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let at=44;
  for(let n=0;n<length;n++)for(let ch=0;ch<channels;ch++){const sample=Number.isFinite(data[ch][n])?Math.max(-1,Math.min(1,data[ch][n])):0;v.setInt16(at,sample<0?sample*32768:sample*32767,true);at+=2}return bytes;
 }
 function bytesToBase64Url(bytes){
  let bin='';
  for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
  if(typeof btoa==='function')return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return Buffer.from(bytes).toString('base64url');
 }
 function base64UrlToBytes(str){
  let b=str.replace(/-/g,'+').replace(/_/g,'/');
  while(b.length%4)b+='=';
  if(typeof atob==='function'){
   const bin=atob(b),bytes=new Uint8Array(bin.length);
   for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
   return bytes;
  }
  return new Uint8Array(Buffer.from(b,'base64'));
 }
 async function encodeShare(project){
  const text=JSON.stringify(project);if(new TextEncoder().encode(text).length>MAX_SHARE_BYTES)throw Error('Shared data exceeds size limit');
  if(typeof CompressionStream==='function'){
   const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
   const compressed=new Uint8Array(await new Response(stream).arrayBuffer());
   return bytesToBase64Url(compressed);
  }
  return bytesToBase64Url(new TextEncoder().encode(text));
 }
 async function boundedText(stream,limit){
  const reader=stream.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel().catch(()=>{});throw Error('Shared data exceeds size limit')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 }
 function shareHash(hash){
  if(typeof hash!=='string'||hash.length>MAX_TOKEN*3+16)throw Error('Invalid share token');
  if(!/^#(?:loop|project|share|song)=/.test(hash))return null;
  const match=hash.match(/^#(loop|project|share|song)=([^&]+)$/);if(!match)throw Error('Invalid share token');
  const token=decodeURIComponent(match[2]);if(!token||token.length>MAX_TOKEN||token.length%4===1||! /^[A-Za-z0-9_-]+$/.test(token))throw Error('Invalid share token');return {kind:match[1],token};
 }
 async function decodeShare(token,sounds){
  if(typeof token!=='string'||!token||token.length>MAX_TOKEN||token.length%4===1||! /^[A-Za-z0-9_-]+$/.test(token))throw Error('Invalid share token');
  const bytes=base64UrlToBytes(token);
  let text='';
  if(typeof DecompressionStream==='function'){
   try{
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    text=await boundedText(stream,MAX_SHARE_BYTES);
   }catch(error){
    if(error.message==='Shared data exceeds size limit')throw error;
    text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   }
  }else{
   text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }
  if(new TextEncoder().encode(text).length>MAX_SHARE_BYTES)throw Error('Shared data exceeds size limit');
  if(root.HaloSong&&text.length<=root.HaloSong.MAX_BYTES){const value=JSON.parse(text);if(value.format==='halo-composition')return root.HaloSong.parse(text,api,sounds)}
  return parse(text,sounds);
 }
 const api={MAX_BYTES,MAX_TOKEN,liveLoop,shareHash,bpm,validate,parse,capture,wav,mixSettings,encodeShare,decodeShare};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloProject=api;
})(typeof globalThis!=='undefined'?globalThis:this);
