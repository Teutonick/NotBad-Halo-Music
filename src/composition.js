/* Loop-boundary decisions, independent of rendering and audio nodes. */
(function(root){
  'use strict';
  // 24 keys along the Circle of Fifths/Fourths, strictly alternating relative pairs and perfect fifth modulations.
  const definitions=Object.freeze([
    Object.freeze({name:'D MINOR',root:'D',mode:'minor',offset:0}),
    Object.freeze({name:'F MAJOR',root:'F',mode:'major',offset:3}),
    Object.freeze({name:'C MAJOR',root:'C',mode:'major',offset:-2}),
    Object.freeze({name:'A MINOR',root:'A',mode:'minor',offset:-5}),
    Object.freeze({name:'E MINOR',root:'E',mode:'minor',offset:2}),
    Object.freeze({name:'G MAJOR',root:'G',mode:'major',offset:5}),
    Object.freeze({name:'D MAJOR',root:'D',mode:'major',offset:0}),
    Object.freeze({name:'B MINOR',root:'B',mode:'minor',offset:-3}),
    Object.freeze({name:'F♯ MINOR',root:'F♯',mode:'minor',offset:4}),
    Object.freeze({name:'A MAJOR',root:'A',mode:'major',offset:-5}),
    Object.freeze({name:'E MAJOR',root:'E',mode:'major',offset:2}),
    Object.freeze({name:'C♯ MINOR',root:'C♯',mode:'minor',offset:-1}),
    Object.freeze({name:'G♯ MINOR',root:'G♯',mode:'minor',offset:6}),
    Object.freeze({name:'B MAJOR',root:'B',mode:'major',offset:-3}),
    Object.freeze({name:'F♯ MAJOR',root:'F♯',mode:'major',offset:4}),
    Object.freeze({name:'D♯ MINOR',root:'D♯',mode:'minor',offset:1}),
    Object.freeze({name:'A♯ MINOR',root:'A♯',mode:'minor',offset:-4}),
    Object.freeze({name:'C♯ MAJOR',root:'C♯',mode:'major',offset:-1}),
    Object.freeze({name:'G♯ MAJOR',root:'G♯',mode:'major',offset:6}),
    Object.freeze({name:'F MINOR',root:'F',mode:'minor',offset:3}),
    Object.freeze({name:'C MINOR',root:'C',mode:'minor',offset:-2}),
    Object.freeze({name:'D♯ MAJOR',root:'D♯',mode:'major',offset:1}),
    Object.freeze({name:'A♯ MAJOR',root:'A♯',mode:'major',offset:-4}),
    Object.freeze({name:'G MINOR',root:'G',mode:'minor',offset:5})
  ]);
  const keys=Object.freeze(definitions.map(d=>d.root));
  const modes=Object.freeze(definitions.map(d=>d.mode));
  const offsets=Object.freeze(definitions.map(d=>d.offset));
  const names=Object.freeze(definitions.map(d=>d.name));
  function create(initial={}){
    let seed=initial.seed||1,key=initial.key||0,autoEvolve=false,autoKey=false,epoch=-1,current={seed,key};
    const snapshots=new Map();
    function at(loop){
      if(snapshots.has(loop))return {...snapshots.get(loop)};
      if(loop!==epoch){
        if(epoch>=0&&loop>epoch){
          const jumps=loop-epoch;
          if(autoEvolve)seed=(seed-1+jumps)%1000000000+1;
          if(autoKey)key=(key+jumps)%24;
        }
        epoch=loop;current={seed,key};
        snapshots.set(loop,{...current});
        while(snapshots.size>4)snapshots.delete(snapshots.keys().next().value);
      }
      return {...current};
    }
    function refresh(){snapshots.clear();if(epoch>=0)snapshots.set(epoch,{...current});}
    return {at,view(loop){return {...(snapshots.get(loop)||current)}},generate(){seed=seed%1000000000+1;current={seed,key};refresh();return {...current}},
      nextKey(){key=(key+1)%24;current={seed,key};refresh();return {...current}},
      prevKey(){key=(key+23)%24;current={seed,key};refresh();return {...current}},
      setKey(k){key=((k%24)+24)%24;current={seed,key};refresh();return {...current}},
      toggleMode(){key=key%2===0?key+1:key-1;current={seed,key};refresh();return {...current}},
      setAutoEvolve(value){autoEvolve=!!value},setAutoKey(value){autoKey=!!value},
      get autoEvolve(){return autoEvolve},get autoKey(){return autoKey},
      resetBoundary(){epoch=-1;snapshots.clear()},get seed(){return seed},get key(){return key}};
  }
  function encode(tracks,bars,seed=1,key=0){return JSON.stringify({version:1,bars,seed,key,tracks:tracks.map(t=>({name:t.name,instrument:t.instrument||t.name,generator:t.generator||1,sequence:t.sequence,sound:t.sound,...(t.soundWorld?{soundWorld:t.soundWorld}:{}),steps:[...(t.manualSteps||[])],bars:t.manualBars||bars}))});}
  function decode(text,names){
    if(typeof text!=='string'||text.length>65536||new TextEncoder().encode(text).length>65536)throw Error('Pattern exceeds size limit');const data=JSON.parse(text);
    if(data.version!==1||![4,8].includes(data.bars)||!Array.isArray(data.tracks)||data.tracks.length!==8)throw Error('Invalid pattern format');
    if(data.seed!==undefined&&(!Number.isSafeInteger(data.seed)||data.seed<1||data.seed>1000000000))throw Error('Invalid seed');
    if(data.key!==undefined&&(!Number.isInteger(data.key)||data.key<0||data.key>=24))throw Error('Invalid key');
    const seen=new Set();
    for(const t of data.tracks){
      if(t.soundWorld!==undefined&&!['ambient','reactor'].includes(t.soundWorld))throw Error('Invalid sound world');
      if(t.instrument!==undefined&&!names.includes(t.instrument)||t.generator!==undefined&&![1,2,3].includes(t.generator))throw Error('Invalid track pattern');
      if(t.generator===3){const R=typeof module!=='undefined'&&module.exports?require('./roles.js'):root.HaloRoles;t.sequence=R.sequence(t.sequence)}
      if(!names.includes(t.name)||seen.has(t.name)||![4,8].includes(t.bars)||!Array.isArray(t.steps)||t.steps.length>128||t.steps.some(n=>!Number.isInteger(n)||n<0||n>=t.bars*16)||new Set(t.steps).size!==t.steps.length)throw Error('Invalid track pattern');
      seen.add(t.name);
    }
    return data;
  }
  const api={create,keys,modes,offsets,names,definitions,encode,decode};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloComposition=api;
})(typeof globalThis!=='undefined'?globalThis:this);
