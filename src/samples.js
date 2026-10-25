/* Local CC0 recordings. Lazy classic-script packs preserve file:// and Pages. */
(function(root){
 'use strict';
 const packs={drums:['kick-damped','kick-open','snare-center','snare-edge','snare-rim','snare-layer','hat-tight','hat-open','ride','crash','tom-floor','tom-mid','tom-high','tom-war'],bass:['bass-pick','bass-finger'],guitars:['guitar-direct','guitar-dist'],keys:['piano','synth-arp','synth-cut'],handpan:['water-handpan']};
 const base=typeof document!=='undefined'&&document.currentScript?new URL('../assets/reactor/',document.currentScript.src).href:null;
 const waterBase=base?new URL('../water/',base).href:null;
 const encoded=Object.create(null),loading=new Map(),decoded=new WeakMap();
 function register(pack,banks){
  if(!Object.hasOwn(packs,pack)||!banks||Object.keys(banks).length!==packs[pack].length)throw Error('Invalid sample pack');
  const clean={};
  for(const bank of packs[pack]){
   const regions=banks[bank];if(!Array.isArray(regions)||!regions.length||regions.length>64)throw Error('Invalid sample pack');
   clean[bank]=regions.map(s=>{if(!s||!Number.isInteger(s.root)||s.root<0||s.root>127||typeof s.data!=='string'||s.data.length>2600000||!/^UklGR[\w+/=]+$/.test(s.data))throw Error('Invalid sample pack');return {root:s.root,data:s.data}});
  }
  encoded[pack]=clean;
 }
 function loadPack(pack){
  if(encoded[pack])return Promise.resolve();if(loading.has(pack))return loading.get(pack);
  const promise=new Promise((resolve,reject)=>{
   if(!base||typeof document==='undefined'){reject(Error('Sample pack could not load'));return}
   const script=document.createElement('script');let timer;
   const finish=error=>{clearTimeout(timer);script.remove();error?reject(Error('Sample pack could not load')):resolve()};
   script.src=(pack==='handpan'?waterBase:base)+pack+'.js?v=cc0-water-4';script.async=true;
   script.onload=()=>finish(!encoded[pack]);script.onerror=()=>finish(true);
   timer=setTimeout(()=>finish(true),30000);document.head.append(script);
  }).catch(error=>{loading.delete(pack);throw error});loading.set(pack,promise);return promise;
 }
 function requestedPacks(banks){
  if(banks===undefined)return ['drums','bass','guitars','keys'];
  if(!Array.isArray(banks)||banks.some(b=>!Object.values(packs).some(names=>names.includes(b))))throw Error('Invalid sample bank');
  return Object.keys(packs).filter(pack=>packs[pack].some(name=>banks.includes(name)));
 }
 function load(banks){return Promise.all(requestedPacks(banks).map(loadPack))}
 async function decodePack(ctx,pack){
  await loadPack(pack);const bank=Object.create(null);
  for(const [name,regions] of Object.entries(encoded[pack])){
   bank[name]=[];
   for(let at=0;at<regions.length;at+=4){const part=await Promise.all(regions.slice(at,at+4).map(async region=>{
    const binary=root.atob(region.data),bytes=new Uint8Array(binary.length);for(let i=0;i<bytes.length;i++)bytes[i]=binary.charCodeAt(i);
    let buffer;try{buffer=await ctx.decodeAudioData(bytes.buffer)}catch{throw Error('Sample audio could not decode')}
    if(!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.duration>30||buffer.numberOfChannels>2)throw Error('Sample audio could not decode');
    return {root:region.root,buffer};
   }));bank[name].push(...part)}
  }
  return bank;
 }
 function prepare(ctx,banks){
  if(!decoded.has(ctx))decoded.set(ctx,{bank:Object.create(null),packs:new Map(),requests:new Map(),tail:Promise.resolve()});
  const state=decoded.get(ctx),names=requestedPacks(banks),key=names.join(',');
  if(state.requests.has(key))return state.requests.get(key);
  const promise=Promise.allSettled(names.map(pack=>{
   if(!state.packs.has(pack)){const loaded=loadPack(pack);loaded.catch(()=>{});const job=state.tail.then(()=>loaded).then(()=>decodePack(ctx,pack));state.tail=job.catch(()=>{});state.packs.set(pack,job.then(bank=>Object.assign(state.bank,bank)).catch(error=>{state.packs.delete(pack);throw error}));}
   return state.packs.get(pack);
  })).then(results=>{const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;return state.bank}).catch(error=>{state.requests.delete(key);throw error});
  state.requests.set(key,promise);return promise;
 }
 function select(regions,note,velocity){
  if(!Array.isArray(regions)||!regions.length||!Number.isFinite(note)||!Number.isFinite(velocity))throw Error('Sample bank is not ready');
  let nearest=regions[0].root;for(const region of regions)if(Math.abs(region.root-note)<Math.abs(nearest-note)||(Math.abs(region.root-note)===Math.abs(nearest-note)&&region.root<nearest))nearest=region.root;
  const choices=regions.filter(region=>region.root===nearest);
  return choices[Math.abs(Math.round(velocity*1000)+Math.round(note))%choices.length];
 }
 const api={register,load,prepare,select,packs};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloSamples=api;
})(typeof globalThis!=='undefined'?globalThis:this);
