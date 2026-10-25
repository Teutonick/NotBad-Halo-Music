/* Pure WATER geometry and surface crossings. No clocks, scheduling or retained history. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const Motion=node?require('../motion.js'):root.HaloMotion;
 const Sounds=node?require('../sounds.js'):root.HaloSounds;
 const Geometry=node?require('./orbits.js'):root.HaloOrbitGeometry;
 const TAU=Math.PI*2,speeds=[1,.5,.25,1.5,.75,.375,1.25,.625,.875],offsets=[.23,1.62,3.3,2.07,5.2,.5,4.1,2.8,1.15];
 const mod=(x,n)=>((x%n)+n)%n;
 function interval(pattern,step,cycle){
  const list=pattern.length?pattern:[0],bar=Math.floor(step/cycle),local=mod(step,cycle);
  let previous=list[list.length-1]+(bar-1)*cycle,next=list[0]+(bar+1)*cycle;
  for(const event of list){if(event<=local)previous=bar*cycle+event;else{next=bar*cycle+event;break}}
  return {previous,next};
 }
 function splashScale(index,eventBeat,mode=1){
  const ranges=[[.65,1.05],[.65,1.45],[.70,1.9]],range=ranges[mode]||ranges[1];
  const key=Math.round(eventBeat*1000),v=Math.sin(key*12.9898+index*78.233+mode*17.17)*43758.5453,random=v-Math.floor(v);
  return range[0]+random*(range[1]-range[0]);
 }
 function lane(frame,index){
  const {beat=0,cx=0,cy=0,scale=1,motionMode=2,scene=0,phraseBars=4,meter='4/4',tempo=72}=frame;
  const track=frame.tracks[index],bars=phraseBars===8?8:4,bpb=meter==='3/4'?3:4,r=(135+index*24)*scale;
  const cycle=motionMode===1&&index!==8?Sounds.cycleLength(track,bars,meter):16;
  const pattern=motionMode===1?(index===8?(frame.track09Steps||[0,4,8,12]):track.manualSteps||Sounds.patternFor(track,bars,meter)):[];
  function angleAt(b){
   if(motionMode===0)return b*TAU*speeds[index]/4+offsets[index];
   if(motionMode===1)return Motion.phaseAt(pattern,Math.max(0,b)*4,cycle)*TAU+Math.PI;
   return mod(b,bpb*bars)/(bpb*bars)*TAU;
  }
  function at(b){const a=angleAt(b);return motionMode===0?Geometry.position(index,a+Math.PI,{cx,cy,scale,scene,syncMotion:false}):{x:cx-r*Math.cos(a),y:cy-r*.8*Math.sin(a)}}
  let crossing=null;
  if(motionMode===2){const half=bpb*bars/2,n=Math.floor(Math.max(0,beat)/half);crossing={beat:n*half,entering:n%2===1};}
  else if(motionMode===1){
   const {previous,next}=interval(pattern,Math.max(0,beat)*4,cycle),middle=(previous+next)/2;
   crossing={beat:(beat*4>=middle?middle:previous)/4,entering:beat*4<middle};
  }else{
   // Search only the bounded visible splash lifetime, then refine the newest actual crossing.
   const span=(1.3+(frame.effectMode||0)*.45)*tempo/60,segments=96;
   let upper=beat,upperY=at(upper).y-cy;
   for(let j=1;j<=segments;j++){
    const lower=Math.max(0,beat-span*j/segments),lowerY=at(lower).y-cy;
    if(lowerY*upperY<0||Math.abs(upperY)<1e-9){
     let lo=lower,hi=upper;for(let k=0;k<16;k++){const mid=(lo+hi)/2;if((at(mid).y-cy)*lowerY>0)lo=mid;else hi=mid}
     crossing={beat:(lo+hi)/2,entering:upperY>lowerY};break;
    }
    if(lower===0)break;upper=lower;upperY=lowerY;
   }
  }
  if(crossing){if(crossing.beat<0)crossing=null;else{const p=at(crossing.beat);crossing={...crossing,x:p.x,age:Math.max(0,(beat-crossing.beat)*60/tempo),scale:splashScale(index,crossing.beat,frame.effectMode??1)}}}
  return {index,position:at(beat),angle:angleAt(beat),at,point:a=>motionMode===0?Geometry.position(index,a+Math.PI,{cx,cy,scale,scene,syncMotion:false}):{x:cx-r*Math.cos(a),y:cy-r*.8*Math.sin(a)},crossing};
 }
 function layout(frame){return frame.tracks.map((_,i)=>lane(frame,i))}
 const api={layout,lane,interval,splashScale};root.HaloWaterMotion=api;if(node)module.exports=api;
})(globalThis);
