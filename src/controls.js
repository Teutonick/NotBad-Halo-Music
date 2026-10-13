/* Bounded numeric UI and relative pointer scrubbing. No DOM text is executed. */
(function(root){
 'use strict';
 function bounds(spec){
  if(!spec||typeof spec!=='object')throw Error('Invalid control value');
  if(spec.values){if(!Array.isArray(spec.values)||!spec.values.length||spec.values.length>8||spec.values.some(n=>typeof n!=='number'||!Number.isFinite(n)))throw Error('Invalid control value');}
  else if(!Number.isFinite(spec.min)||!Number.isFinite(spec.max)||spec.max<spec.min||!Number.isFinite(spec.step||1)||(spec.step||1)<=0)throw Error('Invalid control value');
 }
 function parse(text,spec){
  bounds(spec);
  if(typeof text!=='string'||text.length>12||! /^-?\d{1,6}(?:\.\d{1,2})?$/.test(text))throw Error('Invalid control value');
  const n=Number(text),step=spec.step||1,units=(n-spec.min)/step;
  if(spec.values){if(!spec.values.includes(n))throw Error('Invalid control value');return n;}
  if(!Number.isFinite(n)||n<spec.min||n>spec.max||Math.abs(units-Math.round(units))>1e-7)throw Error('Invalid control value');
  return n;
 }
 function snap(value,spec){
  bounds(spec);if(!Number.isFinite(value))value=spec.values?0:spec.min;
  if(spec.values)return spec.values[Math.max(0,Math.min(spec.values.length-1,Math.round(value)))];
  const bounded=Math.max(spec.min,Math.min(spec.max,value));
  return Number((Math.max(spec.min,Math.min(spec.max,spec.min+Math.round((bounded-spec.min)/(spec.step||1))*(spec.step||1)))).toFixed(2));
 }
 function install(el,getSpec){
  let drag=null,suppress=false;
  const spec=()=>typeof getSpec==='function'?getSpec():getSpec;
  const emit=()=>{el.dispatchEvent(new Event(el.type==='range'?'input':'change',{bubbles:true}));};
  function end(e){
   if(!drag||e.pointerId!==drag.id)return;
   if(drag.moved){suppress=true;e.preventDefault();}
   else if(el.type==='range'&&e.type==='pointerup'){
    const r=el.getBoundingClientRect(),s=spec();
    el.value=String(snap(s.min+(s.max-s.min)*(e.clientX-r.left)/Math.max(1,r.width),s));emit();
   }
   el.classList?.remove('scrubbing');const id=drag.id;drag=null;
   if(el.hasPointerCapture?.(id))el.releasePointerCapture(id);
  }
  el.addEventListener('pointerdown',e=>{
   // Preserve native touch slider/select behavior, text editing and right click.
   if(el.disabled||e.button!==0||e.pointerType==='touch')return;
   const s=spec();let start;
   try{start=parse(String(el.value),s)}catch{return}
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,start,moved:false};suppress=false;
   el.setPointerCapture?.(e.pointerId);
   if(el.type==='range'){e.preventDefault();el.focus();}
  });
  el.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id||el.disabled)return;
   const dx=e.clientX-drag.x,dy=drag.y-e.clientY;
   if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!drag.moved&&Math.max(Math.abs(dx),Math.abs(dy))<5))return;
   drag.moved=true;el.classList?.add('scrubbing');e.preventDefault();
   const s=spec(),pixels=8,delta=Math.abs(dx)>=Math.abs(dy)?dx:dy;
   const value=snap((s.values?s.values.indexOf(drag.start):drag.start)+Math.trunc(delta/pixels)*(s.dragStep||s.step||1),s);
   if(String(value)!==String(el.value)){el.value=String(value);emit();}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,end);
  el.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopPropagation();suppress=false;}});
  el.addEventListener('selectstart',e=>{if(drag?.moved)e.preventDefault();});
 }
 const api={parse,snap,install};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloControls=api;
})(typeof globalThis!=='undefined'?globalThis:this);
