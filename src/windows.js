(function(root){
 'use strict';
 function setup(elements){
  let order=20;
  const front=el=>{if(order>1000){order=20;elements.forEach((x,i)=>x.style.zIndex=String(20+i))}el.style.zIndex=String(++order)};
  function clamp(el){const box=el.getBoundingClientRect();el.style.left=Math.max(0,Math.min(window.innerWidth-box.width,box.left))+'px';el.style.top=Math.max(0,Math.min(window.innerHeight-Math.min(box.height,window.innerHeight),box.top))+'px'}
  for(const el of elements){
   el.addEventListener('pointerdown',()=>front(el));
   const handle=el.querySelector('[data-drag]');if(!handle)continue;
   let drag=null;
   handle.addEventListener('pointerdown',e=>{if(e.target.closest('button,input'))return;const box=el.getBoundingClientRect();drag={x:e.clientX-box.left,y:e.clientY-box.top};el.style.position='fixed';el.style.transform='none';el.style.bottom='auto';el.style.right='auto';el.style.left=box.left+'px';el.style.top=box.top+'px';front(el);handle.setPointerCapture(e.pointerId);e.preventDefault()});
   handle.addEventListener('pointermove',e=>{if(!drag)return;el.style.left=e.clientX-drag.x+'px';el.style.top=e.clientY-drag.y+'px';clamp(el)});
   for(const type of ['pointerup','pointercancel'])handle.addEventListener(type,()=>drag=null);
  }
  window.addEventListener('resize',()=>elements.forEach(el=>{if(el.style.position==='fixed')clamp(el)}));
  return {front};
 }
 root.HaloWindows={setup};
})(globalThis);
