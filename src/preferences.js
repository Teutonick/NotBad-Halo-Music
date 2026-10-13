(function(root){
 'use strict';
 function validate(value,project,sounds){
  if(!value||value.version!==1)throw Error('Unsupported autosave');
  const clean={version:1,project:project.validate(value.project,sounds),ui:{},manual:[],draft:null};
  for(const field of ['scene','motionMode']){const n=value.ui?.[field];if(!Number.isInteger(n)||n<0||n>2)throw Error('Invalid view');clean.ui[field]=n}
  for(const field of ['richEffects','autoEvolve','autoKey']){if(typeof value.ui?.[field]!=='boolean')throw Error('Invalid preference');clean.ui[field]=value.ui[field]}
  clean.ui.visualOnly=value.ui.visualOnly===true;
  clean.ui.language=['ru','en'].includes(value.ui.language)?value.ui.language:null;clean.ui.promoIndex=Number.isInteger(value.ui.promoIndex)&&value.ui.promoIndex>=0&&value.ui.promoIndex<4?value.ui.promoIndex:0;
  clean.ui.windowOrder=Array.isArray(value.ui.windowOrder)?value.ui.windowOrder.filter(id=>['editor','patternEditor','storageInfo','phraseGuide'].includes(id)).slice(0,4):[];
  if(!Array.isArray(value.manual)||value.manual.length!==8)throw Error('Invalid manual patterns');
  const steps=(list,bars)=>{if(!Array.isArray(list)||list.length>128||list.some(n=>!Number.isInteger(n)||n<0||n>=bars*16)||new Set(list).size!==list.length)throw Error('Invalid steps');return [...list].sort((a,b)=>a-b)};
  clean.manual=value.manual.map(t=>{if(t===null)return null;if(![4,8].includes(t.bars))throw Error('Invalid bars');return {bars:t.bars,steps:steps(t.steps,t.bars)}});
  if(value.draft!==null){if(!Array.isArray(value.draft)||value.draft.length!==8)throw Error('Invalid draft');clean.draft=value.draft.map(t=>steps(t,clean.project.bars))}
  clean.editTrack=Number.isInteger(value.editTrack)&&value.editTrack>=0&&value.editTrack<8?value.editTrack:0;
  clean.selected=Number.isInteger(value.selected)&&value.selected>=0&&value.selected<8?value.selected:-1;
  clean.windows=Array.isArray(value.windows)?value.windows.slice(0,4).map(w=>({id:['editor','patternEditor','storageInfo','phraseGuide'].includes(w.id)?w.id:'editor',left:Math.max(0,Math.min(10000,Number(w.left)||0)),top:Math.max(0,Math.min(10000,Number(w.top)||0))})):[];
  return clean;
 }
 function parse(text,project,sounds){if(typeof text!=='string'||new TextEncoder().encode(text).length>65536)throw Error('Autosave exceeds limit');return validate(JSON.parse(text),project,sounds)}
 root.HaloPreferences={validate,parse};if(typeof module!=='undefined'&&module.exports)module.exports=root.HaloPreferences;
})(globalThis);
