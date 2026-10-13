/* Loop-boundary decisions, independent of rendering and audio nodes. */
(function(root){
  'use strict';
  const keys=Object.freeze(['D','A','E','B','F♯','C♯','G♯','D♯','A♯','F','C','G']);
  const offsets=Object.freeze([0,-5,2,-3,4,-1,6,1,-4,3,-2,5]);
  function create(initial={}){
    let seed=initial.seed||1,key=initial.key||0,autoEvolve=false,autoKey=false,epoch=-1,current={seed,key};
    const snapshots=new Map();
    function at(loop){
      if(snapshots.has(loop))return {...snapshots.get(loop)};
      if(loop!==epoch){
        if(epoch>=0&&loop>epoch){
          const jumps=loop-epoch;
          if(autoEvolve)seed+=jumps;
          if(autoKey)for(let j=0;j<jumps;j++)key=(key+1+((43+(epoch+j+1)*7)%11))%12;
        }
        epoch=loop;current={seed,key};
        snapshots.set(loop,{...current});
        while(snapshots.size>4)snapshots.delete(snapshots.keys().next().value);
      }
      return {...current};
    }
    function refresh(){snapshots.clear();if(epoch>=0)snapshots.set(epoch,{...current});}
    return {at,view(loop){return {...(snapshots.get(loop)||current)}},generate(){seed++;current={seed,key};refresh();return {...current}},
      nextKey(){key=(key+1)%12;current={seed,key};refresh();return {...current}},
      setAutoEvolve(value){autoEvolve=!!value},setAutoKey(value){autoKey=!!value},
      get autoEvolve(){return autoEvolve},get autoKey(){return autoKey},
      resetBoundary(){epoch=-1;snapshots.clear()},get seed(){return seed},get key(){return key}};
  }
  function encode(tracks,bars,seed=1,key=0){return JSON.stringify({version:1,bars,seed,key,tracks:tracks.map(t=>({name:t.name,instrument:t.instrument||t.name,generator:t.generator||1,sequence:t.sequence,sound:t.sound,steps:[...(t.manualSteps||[])],bars:t.manualBars||bars}))});}
  function decode(text,names){
    if(typeof text!=='string'||text.length>65536)throw Error('Pattern exceeds size limit');const data=JSON.parse(text);
    if(data.version!==1||![4,8].includes(data.bars)||!Array.isArray(data.tracks)||data.tracks.length!==8)throw Error('Invalid pattern format');
    if(data.seed!==undefined&&(!Number.isSafeInteger(data.seed)||data.seed<1||data.seed>1000000000))throw Error('Invalid seed');
    if(data.key!==undefined&&(!Number.isInteger(data.key)||data.key<0||data.key>=12))throw Error('Invalid key');
    const seen=new Set();
    for(const t of data.tracks){
      if(t.instrument!==undefined&&!names.includes(t.instrument)||t.generator!==undefined&&![1,2,3].includes(t.generator))throw Error('Invalid track pattern');
      if(t.generator===3){const R=typeof module!=='undefined'&&module.exports?require('./roles.js'):root.HaloRoles;t.sequence=R.sequence(t.sequence)}
      if(!names.includes(t.name)||seen.has(t.name)||![4,8].includes(t.bars)||!Array.isArray(t.steps)||t.steps.length>128||t.steps.some(n=>!Number.isInteger(n)||n<0||n>=t.bars*16)||new Set(t.steps).size!==t.steps.length)throw Error('Invalid track pattern');
      seen.add(t.name);
    }
    return data;
  }
  const api={create,keys,offsets,encode,decode};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloComposition=api;
})(typeof globalThis!=='undefined'?globalThis:this);
