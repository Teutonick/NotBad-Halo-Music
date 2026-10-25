/* Original WATER study: procedural sky/sea, analytic splashes, no media or physics loop. */
(function(root){
 'use strict';
 const TAU=Math.PI*2;
 const movement=typeof module!=='undefined'&&module.exports?require('./water-motion.js'):root.HaloWaterMotion;
 const stones=typeof module!=='undefined'&&module.exports?require('./water-stones.js'):root.HaloWaterStones;
 const splashes=typeof module!=='undefined'&&module.exports?require('./water-splashes.js'):root.HaloWaterSplashes;
 // Capture the local script base once; never load an external sky or media URL.
 const assetURL=typeof document!=='undefined'&&document.currentScript?.src?new URL('../../assets/water/arctic-sky.png',document.currentScript.src).href:null;
 let skyImage=null,skyFailed=false;const prepared=new WeakSet();
 function prepare(renderer){
  if(!renderer.gl||!assetURL||skyFailed||typeof root.Image!=='function')return;
  if(!skyImage){skyImage=new root.Image();skyImage.onload=()=>{try{renderer.setTexture('water',skyImage);prepared.add(renderer)}catch(error){skyFailed=true;console.warn('WATER sky unavailable:',error.message)}};skyImage.onerror=()=>{skyFailed=true;console.warn('WATER sky unavailable; procedural fallback active')};skyImage.src=assetURL}
  if(skyImage.complete&&skyImage.naturalWidth&&!prepared.has(renderer)){try{renderer.setTexture('water',skyImage);prepared.add(renderer)}catch(error){skyFailed=true;console.warn('WATER sky unavailable:',error.message)}}
 }
 const shader=`#version 300 es
 precision highp float;
 in vec2 uv;out vec4 frag;
 uniform vec2 resolution;uniform vec2 origin;uniform float tm;uniform float skyHorizontalScale;
 uniform sampler2D skyMap;uniform float hasSky;
 uniform float worldScale;uniform float waterIntensity;
 uniform vec4 splashLane0;uniform vec4 splashLane1;uniform vec4 splashLane2;uniform vec4 splashLane3;uniform vec4 splashLane4;uniform vec4 splashLane5;uniform vec4 splashLane6;uniform vec4 splashLane7;uniform vec4 splashLane8;uniform float splashMask;uniform float splashReduced;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 vec3 sky(vec3 ray,float roughness){
  float elevation=atan(max(0.,ray.y),length(ray.xz));
  vec2 st=vec2(.5+atan(ray.x,-ray.z)*skyHorizontalScale,elevation/.59);
  st.x+=sin(tm*.008)*.012;st=clamp(st,vec2(.002),vec2(.998));
  vec3 col;
  if(hasSky>.5){col=textureLod(skyMap,st,roughness).rgb;col=pow(col,vec3(1.12));}
  else{float cloud=noise(st*8.+noise(st*17.));col=mix(vec3(.40,.49,.55),vec3(.09,.15,.21),smoothstep(.2,.75,cloud));}
  // A distant continuous mist line removes high-frequency horizon aliasing.
  return mix(vec3(.43,.51,.55),col,smoothstep(0.,.055,elevation));
 }
 ${splashes.shader}
 vec2 seaSlope(vec2 p,float distanceToCamera){
  vec2 slope=vec2(0.);
  // Incommensurate directional wave train. Derivatives are analytic, with distance filtering.
  float frequency=.46,amplitude=.11;
  for(int i=0;i<9;i++){
   float fi=float(i);float angle=fi*2.39996+.3*sin(fi*1.73);
   vec2 direction=vec2(cos(angle),sin(angle));
   float wavePhase=dot(p,direction)*frequency+tm*(.12+sqrt(frequency)*.18)+fi*7.13;
   float attenuation=exp(-distanceToCamera*frequency*.012);
   slope+=direction*cos(wavePhase+sin(wavePhase*.37+fi)*.35)*amplitude*frequency*attenuation;
   frequency*=1.79;amplitude*=.53;
  }
  return slope;
 }
 void main(){
  vec2 q=vec2((uv.x-origin.x)*resolution.x/resolution.y,uv.y-origin.y);
  vec3 ray=normalize(vec3(q.x,q.y,-.82));vec3 col;
  if(q.y>=0.)col=sky(ray,0.);
  else{
   float distanceToCamera=1.35/max(.00001,-ray.y);
   vec2 p=ray.xz*distanceToCamera;
   // Gentle forward dolly through the surface; horizon, sky and musical geometry stay fixed.
   p.y-=tm*.42;
   vec2 slope=seaSlope(p,distanceToCamera);
   vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
   vec3 reflected=reflect(ray,normal);reflected.y=max(.001,reflected.y);
   float fresnel=.02+.98*pow(1.-max(0.,dot(-ray,normal)),5.);
   float roughness=clamp(log2(1.+distanceToCamera)*.22,0.,2.8);
   vec3 reflectedSky=sky(reflected,roughness);
   vec3 deep=vec3(.009,.027,.035);
   col=mix(deep,reflectedSky,.36+.59*fresnel);
   // Small-scale wave facets vary luminance without a repeating screen-space grid.
   col*=.94+.06*normal.y;
   vec3 light=normalize(vec3(.36,.48,-.82));
   float highlight=pow(max(0.,dot(reflected,light)),190.);
   col+=vec3(.74,.83,.86)*highlight*.22;
   float fog=1.-exp(-distanceToCamera*.007);
   col=mix(col,vec3(.43,.51,.55),fog*.82);
  }
  float vignette=1.-.20*pow(length((uv-.5)*vec2(1.,.8)),1.6);
  frag=vec4(waterSplashes(col)*vignette,1.);
 }`;
 // Four bars per revolution: emergence at bar 1, immersion at bar 3, for either meter.
 function phase(beat,meter='4/4'){const length=(meter==='3/4'?3:4)*4;return ((beat%length)+length)%length/length}
 function point(i,angle,cx,cy,scale){const r=(135+i*24)*scale;return {x:cx-r*Math.cos(angle),y:cy-r*.8*Math.sin(angle)}}
 function crossing(beat,meter='4/4'){
  const half=(meter==='3/4'?3:4)*2,n=Math.floor(Math.max(0,beat)/half);
  return {beat:n*half,side:n%2===0?-1:1,entering:n%2===1,age:Math.max(0,beat)-n*half};
 }
 function fallback(ctx,w,h,cy,time,reduced){
  const sky=ctx.createLinearGradient(0,0,0,cy);sky.addColorStop(0,'#101e30');sky.addColorStop(.78,'#425963');sky.addColorStop(1,'#8da9af');ctx.fillStyle=sky;ctx.fillRect(0,0,w,cy);
  const sea=ctx.createLinearGradient(0,cy,0,h);sea.addColorStop(0,'#67878e');sea.addColorStop(.15,'#1e414e');sea.addColorStop(1,'#061321');ctx.fillStyle=sea;ctx.fillRect(0,cy,w,h-cy);
  ctx.strokeStyle='#9fc4cc';ctx.lineWidth=1;for(let j=1;j<30;j++){const depth=(j/30+(reduced?0:time*.01))%1;let y=cy+Math.pow(depth,2)*(h-cy);ctx.globalAlpha=.07;ctx.beginPath();for(let x=0;x<=w;x+=24){const yy=y+Math.sin(x*.018+j+(reduced?0:time*.16))*j*.11;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.stroke()}ctx.globalAlpha=1;
 }
 function draw(ctx,frame){
  const {width:w,height:h,cx,cy,scale,beat,tempo,meter,tracks,pulses,playing,reduced,time,gpu,labels,motionMode=2,phraseBars=4,effectMode=1}=frame;
  const layout=frame.layout||movement.layout(frame),nodes=[];
  ctx.save();if(!gpu)fallback(ctx,w,h,cy,time,reduced);
  for(let i=tracks.length-1;i>=0;i--){
   const t=tracks[i],lane=layout[i],p=stones.project(lane.position,frame,i),under=lane.position.y>cy,color=stones.palette[i];nodes[i]=p;
   ctx.strokeStyle=color;ctx.lineWidth=.7;
   // Sample actual paths, including rotated/lobed DRIFT scenes; submerge their lower segments.
   for(const submerged of [false,true]){
    ctx.save();ctx.beginPath();ctx.rect(0,submerged?cy:0,w,submerged?h-cy:cy);ctx.clip();ctx.globalAlpha=(t.on?1:.28)*(submerged?.045:.13);ctx.beginPath();
    for(let j=0;j<=96;j++){const q=lane.point(j/96*TAU);j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.stroke();ctx.restore();
   }
   if(motionMode===2){
    const totalSteps=phraseBars*(meter==='3/4'?12:16);
    for(const marker of frame.markerSets?.[i]||[]){
     const q=lane.point(marker.step/totalSteps*TAU),alpha=(t.on?1:.25)*(marker.fires?.65:marker.candidate?.22:.06)*(q.y>cy?.35:1);
     ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,(marker.fires?1.8:1)*Math.max(.7,scale),0,TAU);ctx.fill();
    }
   }
   if(!t.on){ctx.globalAlpha=.18;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(p.x,p.y,2.5,1.8,0,0,TAU);ctx.fill();continue}
   stones.trail(ctx,lane,frame);
   if(!under){
    ctx.save();ctx.translate(p.x,cy+(cy-p.y)*.24);ctx.scale(1,.22);ctx.globalAlpha=.09;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,10/1.5*scale,7/1.5*scale,0,0,TAU);ctx.fill();ctx.restore();
   }
   stones.stone(ctx,i,p,scale,pulses[i]||0,under,lane.angle);
   stones.glint(ctx,lane,frame,pulses[i]||0);
   const event=lane.crossing;
   if(playing&&!gpu&&event)splashes.fallback(ctx,event.x,cy,event.age,event.entering,Math.max(.6,scale)*(.7+i*.07),reduced,effectMode,event.scale);
  }
  if(labels){
   ctx.globalAlpha=.42;ctx.fillStyle='#c7d8d7';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('W A T E R',cx,cy-25);
   if(motionMode===2){
    for(let bar=0;bar<phraseBars;bar++){const p=layout[tracks.length-1].point(bar/phraseBars*TAU);ctx.globalAlpha=p.y>cy?.17:.42;ctx.fillText((frame.language==='ru'?'ТАКТ ':'BAR ')+(bar+1),Math.max(28,Math.min(w-28,p.x)),p.y+(bar<phraseBars/2?-12:16))}
   }else if(motionMode===1){ctx.globalAlpha=.18;ctx.strokeStyle='#b5ccc7';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(Math.min(w-8,cx+(135+(tracks.length-1)*24)*scale),cy);ctx.stroke()}
  }
  ctx.restore();return nodes;
 }
 function skyScale(width,height){return Math.min(.62,.48/Math.atan(width/height*.5/.82))}
 const api={skyScale,shader,phase,point,crossing,draw,prepare,layout:movement.layout};root.HaloWaterWorld=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
