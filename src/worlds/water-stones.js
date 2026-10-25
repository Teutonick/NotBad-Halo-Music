/* Original matte sea pebbles and nine slot-specific water signatures. */
(function(root){
 'use strict';
 const TAU=Math.PI*2;
 const palette=['#b4cbbf','#cfc4b0','#b5c3d4','#ccb9b7','#b8ccd3','#d4c2ac','#bfc9af','#c4bad0','#d0d7d6'];
 const signatures=['ripples','spray','eddies','fan','mist','bubbles','foam','surf','foam'];
 const intensity=[{length:.16,width:2,drops:16},{length:.38,width:5,drops:30},{length:.70,width:10,drops:48}];
 const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
 function outline(ctx,i,size){ctx.beginPath();for(let k=0;k<=48;k++){const a=k/48*TAU,r=size*(1+.075*Math.sin(a*3+i*1.7)+.04*Math.cos(a*2+i));const x=Math.cos(a)*r*(1.08+(i%3)*.055),y=Math.sin(a)*r*(.68+(i%4)*.045);k?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath()}
 function stone(ctx,i,p,scale,pulse,under,angle){
  const size=(8.6+pulse*1.1)/1.5*Math.max(.72,scale),color=palette[i];
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(angle*.5+i)*.20+i*.39);
  ctx.globalAlpha=under?.36:.98;ctx.shadowColor=under?'#193c4b':'#081c25';ctx.shadowBlur=under?2.5:1.3;ctx.shadowOffsetY=under?0:1.5;
  const g=ctx.createLinearGradient(-size*.4,-size,size*.4,size);g.addColorStop(0,'#e1e4da');g.addColorStop(.30,color);g.addColorStop(.76,color);g.addColorStop(1,under?'#294754':'#657773');ctx.fillStyle=g;outline(ctx,i,size);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();ctx.clip();ctx.lineWidth=.45;ctx.strokeStyle='#edf0e5';ctx.globalAlpha=under?.04:.16;ctx.beginPath();ctx.moveTo(-size,size*.14);ctx.bezierCurveTo(-size*.3,-size*.24,size*.18,size*.3,size,size*.04);ctx.stroke();
  for(let k=0;k<14;k++){ctx.globalAlpha=(under?.04:.10)*hash(k+i*19);ctx.fillStyle=k%2?'#f2eee1':'#4b635f';ctx.fillRect((hash(k*7+i)-.5)*size*2,(hash(k*13+i+2)-.5)*size*1.4,.5,.5)}ctx.restore();
  ctx.restore();
 }
 function project(p,frame,index){
  const depth=Math.max(0,p.y-frame.cy);if(!depth)return {...p};
  const strength=Math.min(3.5,depth*.018)*(frame.scale||1),clock=frame.beat*.21;
  return {x:p.x+Math.sin(p.y*.043+clock+index)*strength,y:frame.cy+depth*.96+Math.sin(p.x*.035+clock)*strength*.3};
 }
 function trail(ctx,lane,frame){
  const {effectMode=1,reduced=false,beat,tempo=72,scale=1,cy}=frame,i=lane.index,profile=i%8,cfg=intensity[effectMode]||intensity[1];
  if(reduced)return;
  const span=cfg.length*tempo/60,amplitude=cfg.width*scale,clock=beat*1.7+i*2.3;
  ctx.save();ctx.lineCap='round';
  // Detached cross-wake fragments. Never connect the stone to a long centerline.
  for(let k=0;k<cfg.drops;k++){
   const seed=hash(k*11+i*37),f=.12+.88*hash(k*7+i*23+1),p=lane.at(Math.max(0,beat-f*span));
   const next=lane.at(Math.max(0,beat-f*span)+.002),dx=next.x-p.x,dy=next.y-p.y,n=Math.max(.01,Math.hypot(dx,dy));
   let spread=(seed-.5)*amplitude*(.4+f),fall=f*f*amplitude*.3;
   if(profile===2)spread=Math.sin(f*23+clock)*amplitude*.65;
   if(profile===3)spread=(seed-.5)*amplitude*f*2;
   if(profile===5)spread=(k%2?1:-1)*amplitude*(.2+seed*.4);
   if(profile===6)spread=Math.sin(f*37+clock)*amplitude*.8;
   if(profile===7)fall*=1.8;
   const raw={x:p.x-dy/n*spread,y:p.y+dx/n*spread+fall},q=project(raw,frame,i),under=raw.y>cy;
   const size=(.65+seed*1.5)*(effectMode===0?.7:effectMode===2?1.15:1)*Math.max(.65,scale);
   ctx.globalAlpha=(1-f*.65)*(under?.38:.50)*(effectMode===0?.7:1);ctx.strokeStyle=under?'#a1c1cb':profile===0||profile>5?'#d6e6e4':palette[i];ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=.7+seed*.5;
   const rotation=Math.atan2(dy,dx)+Math.PI/2,flat=under?.32:.5;
   if(profile===0){
    for(let ring=0;ring<2;ring++){ctx.beginPath();ctx.ellipse(q.x,q.y,size*(1+ring*.5),size*flat*(1+ring*.5),rotation,.15,Math.PI*.8);ctx.stroke()}
   }else if(profile===1){
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(rotation+seed*.5);ctx.fillRect(-.35,-size*.55,.7,size*1.1);ctx.restore();
   }else if(profile===2){
    ctx.beginPath();ctx.ellipse(q.x,q.y,size,size*flat,rotation,seed,Math.PI*1.65);ctx.stroke();
    ctx.beginPath();ctx.ellipse(q.x+size*.2,q.y,size*.45,size*flat*.45,rotation,0,Math.PI);ctx.stroke();
   }else if(profile===3){
    for(let ray=0;ray<3;ray++){ctx.beginPath();ctx.ellipse(q.x,q.y,size*(.65+ray*.3),size*flat,rotation+ray*.45,0,.65);ctx.stroke()}
   }else if(profile===4){
    const mist=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,size*1.4);mist.addColorStop(0,under?'#a1c1cb80':'#d6e6e480');mist.addColorStop(1,'#d6e6e400');ctx.fillStyle=mist;ctx.fillRect(q.x-size*1.4,q.y-size*1.4,size*2.8,size*2.8);
   }else if(profile===5){
    for(let bubble=0;bubble<2;bubble++){ctx.beginPath();ctx.ellipse(q.x+bubble*size*.8,q.y-bubble*size*.4,size*.65,size*(under?.3:.65),rotation,.2,Math.PI*1.65);ctx.stroke()}
   }else if(profile===6){
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(rotation+seed);ctx.fillRect(-size*.5,-.4,size,.8);ctx.globalAlpha*=.5;ctx.fillRect(size*.3,size*.4,size*.5,.6);ctx.restore();
   }else{
    for(let wave=0;wave<2;wave++){ctx.beginPath();ctx.ellipse(q.x,q.y+wave*size*.6,size*(1+wave*.3),size*flat,rotation,Math.PI*.1,Math.PI*.9);ctx.stroke()}
   }
  }
  ctx.restore();
 }
 function glint(ctx,lane,frame,pulse){
  if(!frame.playing||pulse<.025)return;
  const p=project(lane.position,frame,lane.index),under=lane.position.y>frame.cy,scale=Math.max(.7,frame.scale||1),mode=frame.effectMode||0;
  const strength=Math.min(.72,pulse*.8)*(under?.45:1),radius=(frame.reduced?7:10+mode*4)*scale;
  ctx.save();ctx.globalAlpha=strength;const light=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);light.addColorStop(0,'#f3fff1d0');light.addColorStop(.25,'#d5f0e770');light.addColorStop(1,'#d5f0e700');ctx.fillStyle=light;ctx.beginPath();ctx.ellipse(p.x,p.y,radius,radius*(under?.38:.65),-.4,0,TAU);ctx.fill();
  ctx.strokeStyle='#edf9eb';ctx.lineWidth=.8;ctx.globalAlpha=strength*.8;ctx.beginPath();
  for(let j=0;j<=10;j++){const q=project(lane.point(lane.angle+(j/10-.5)*(.06+mode*.03)),frame,lane.index);j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.stroke();ctx.restore();
 }
 const api={palette,signatures,intensity,stone,trail,project,glint};root.HaloWaterStones=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
