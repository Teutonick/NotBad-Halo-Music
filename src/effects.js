/* Decorative only. Bounded procedural comet trails; no audio or retained particles. */
(function(root){
  'use strict';
  const styles = Object.freeze([
    {name:'Prism shards',lanes:2,length:1.5,width:3,kind:'prism'},
    {name:'Tidal ribbons',lanes:3,length:2,width:7,kind:'ribbon'},
    {name:'Pressure wake',lanes:1,length:1.1,width:5,kind:'rings'},
    {name:'Ember sparks',lanes:2,length:1.4,width:3,kind:'spark'},
    {name:'Silver droplets',lanes:1,length:1.8,width:2,kind:'drops'},
    {name:'Silk veil',lanes:4,length:2.1,width:5,kind:'silk'},
    {name:'Spore cloud',lanes:2,length:1.3,width:4,kind:'spore'},
    {name:'Aurora helix',lanes:2,length:2,width:6,kind:'helix'}
  ].map(Object.freeze));
  const reactorStyles=Object.freeze([
    {name:'Impact wake',lanes:1,length:.8,width:6,kind:'rings'},
    {name:'Steel fragments',lanes:2,length:1.1,width:3,kind:'prism'},
    {name:'Metal sparks',lanes:1,length:1.3,width:2,kind:'spark'},
    {name:'Hammer rings',lanes:2,length:.9,width:5,kind:'rings'},
    {name:'Voltage cable',lanes:2,length:1.8,width:4,kind:'electric'},
    {name:'Arc discharge',lanes:3,length:1.5,width:4,kind:'electric'},
    {name:'White filament',lanes:1,length:2,width:2,kind:'electric'},
    {name:'Oscillator lattice',lanes:2,length:1.6,width:3,kind:'helix'}
  ].map(Object.freeze));
  const hyperStyles=Object.freeze([
    {name:'Plasma lightning',lanes:3,length:2.4,width:7,kind:'lightning'},
    {name:'Vortex ribbons',lanes:3,length:2.8,width:9,kind:'vortex'},
    {name:'Shock diamonds',lanes:2,length:2.2,width:8,kind:'shock'},
    {name:'Solar firestorm',lanes:3,length:2.6,width:9,kind:'fire'},
    {name:'Laser grid',lanes:2,length:2.5,width:7,kind:'laser'},
    {name:'Celestial mandala',lanes:2,length:2.8,width:8,kind:'mandala'},
    {name:'Prismatic shards',lanes:3,length:2.4,width:8,kind:'crystal'},
    {name:'Hyperspace warp',lanes:3,length:3.0,width:10,kind:'warp'}
  ].map(Object.freeze));

  function draw(ctx,index,position,angle,time,pulse,color,scale,small,reduced,setup='ambient',mode='cosmic'){
    if(mode==='hyper'||mode===2)return drawHyper(ctx,index,position,angle,time,pulse,color,scale,small,reduced,setup);
    const style=(setup==='reactor'?reactorStyles:styles)[(index%8+8)%8],count=reduced?12:small?22:44;
    const span=style.length*(reduced?.45:1),size=Math.max(.7,scale);
    const clock=reduced?0:time;
    const points=Array.from({length:count},(_,j)=>{
      const fraction=j/(count-1),a=angle-span*fraction,p=position(a),ahead=position(a+.008);
      const dx=ahead.x-p.x,dy=ahead.y-p.y,len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len;
      const snake=reduced?0:Math.sin(fraction*8.5-clock*3.2)*Math.sin(fraction*Math.PI*0.95)*Math.min(style.width*0.22,2.2)*size;
      return {x:p.x+nx*snake,y:p.y+ny*snake,nx,ny,fraction};
    });
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
    // One sleek tapered glow pass per voice with narrower width
    ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=color;ctx.globalAlpha=.08;ctx.lineWidth=style.width*size*1.6;
    ctx.shadowColor=color;ctx.shadowBlur=reduced?0:small?6:14;ctx.stroke();ctx.shadowBlur=0;
    for(let lane=0;lane<style.lanes;lane++) for(let j=1;j<count;j++){
      const at=p=>{
        const taper=Math.sin(Math.PI*p.fraction);
        const oscillation=style.kind==='electric'?Math.sin(p.fraction*93+lane*5+clock*.55)*Math.sin(p.fraction*41+lane):Math.sin(p.fraction*(style.kind==='helix'?22:12)+clock*.55+lane*Math.PI);
        const spread=(lane-(style.lanes-1)/2)*style.width*size;
        const offset=taper*(spread+oscillation*style.width*size*(style.kind==='silk'?1.5:.6));
        return {x:p.x+p.nx*offset,y:p.y+p.ny*offset};
      };
      const a=at(points[j-1]),b=at(points[j]);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
      ctx.globalAlpha=Math.pow(1-points[j].fraction,1.6)*.5;
      ctx.lineWidth=Math.max(.4,style.width*size*(1-points[j].fraction)/(style.lanes+1));
      ctx.stroke();
    }
    const decorations=reduced?4:small?9:18;
    for(let j=1;j<=decorations;j++){
      const f=j/(decorations+1),p=points[Math.floor(f*(count-1))];
      const scatter=Math.sin(j*9.17+clock*.4)*style.width*size*f*2;
      const x=p.x+p.nx*scatter,y=p.y+p.ny*scatter;
      const r=(.7+(1-f)*2.4)*size;
      ctx.globalAlpha=(1-f)*.55;ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=.8;
      ctx.beginPath();
      if(style.kind==='prism'){
        ctx.moveTo(x,y-r*2);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*2);ctx.lineTo(x-r,y);ctx.closePath();ctx.stroke();
      }else if(style.kind==='rings'){
        ctx.ellipse(x,y,r*(2+f*3),r*.8,angle-f,0,Math.PI*2);ctx.stroke();
      }else if(style.kind==='spark'||style.kind==='electric'){
        ctx.moveTo(x,y);ctx.lineTo(x+p.nx*r*3,y+p.ny*r*3);ctx.stroke();
      }else if(style.kind==='drops'){
        ctx.ellipse(x,y,r*.5,r*1.4,angle-f,0,Math.PI*2);ctx.fill();
      }else if(style.kind==='spore'){
        ctx.arc(x,y,r*(1+f),0,Math.PI*2);ctx.stroke();
      }else if(style.kind==='helix'){
        const bridge=Math.sin(f*22+clock*.55)*style.width*size;
        ctx.moveTo(x-p.nx*bridge,y-p.ny*bridge);ctx.lineTo(x+p.nx*bridge,y+p.ny*bridge);ctx.stroke();
      }else{
        ctx.arc(x,y,r*.4,0,Math.PI*2);ctx.fill();
      }
    }
    if(pulse>.08&&!reduced){
      const head=points[0],radius=(12+(1-pulse)*28)*size;
      ctx.globalAlpha=pulse*.22;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.ellipse(head.x,head.y,radius,radius*.65,angle,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }

  function drawHyper(ctx,index,position,angle,time,pulse,color,scale,small,reduced,setup='ambient'){
    const style=hyperStyles[(index%8+8)%8];
    const count=reduced?12:small?24:48;
    const span=style.length*(reduced?.45:1);
    const size=Math.max(.7,scale);
    const clock=reduced?0:time;
    const points=Array.from({length:count},(_,j)=>{
      const fraction=j/(count-1),a=angle-span*fraction,p=position(a),ahead=position(a+.008);
      const dx=ahead.x-p.x,dy=ahead.y-p.y,len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len,tx=dx/len,ty=dy/len;
      // Gentle subtle serpentine wave along the comet trail:
      // Zero at head (fraction=0) so comet head stays precisely locked on the orbit.
      // Waves gently backwards with traveling wave phase.
      const snake=reduced?0:Math.sin(fraction*9.2-clock*3.6)*Math.sin(fraction*Math.PI*0.95)*Math.min(style.width*0.32,2.8)*size;
      return {x:p.x+nx*snake,y:p.y+ny*snake,nx,ny,tx,ty,fraction};
    });
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.lineCap='round';
    ctx.lineJoin='round';

    // 1. Sleek tapered outer hyper bloom (narrows and fades to zero at tip)
    ctx.beginPath();
    for(let j=0;j<count;j++){
      const p=points[j],f=p.fraction;
      const w=style.width*size*0.72*Math.pow(1-f,1.35);
      const x=p.x+p.nx*w,y=p.y+p.ny*w;
      j===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    for(let j=count-1;j>=0;j--){
      const p=points[j],f=p.fraction;
      const w=style.width*size*0.72*Math.pow(1-f,1.35);
      ctx.lineTo(p.x-p.nx*w,p.y-p.ny*w);
    }
    ctx.closePath();
    ctx.fillStyle=color;
    ctx.globalAlpha=.13;
    ctx.shadowColor=color;
    ctx.shadowBlur=reduced?0:small?6:14;
    ctx.fill();
    ctx.shadowBlur=0;

    // 2. High-energy core laser spine with smooth tip fade-out
    for(let j=1;j<count;j++){
      const p=points[j],prev=points[j-1],f=p.fraction;
      const taper=Math.pow(1-f,1.5);
      if(taper<0.01)continue;
      ctx.beginPath();
      ctx.moveTo(prev.x,prev.y);
      ctx.lineTo(p.x,p.y);
      ctx.strokeStyle='#ffffff';
      ctx.globalAlpha=0.45*taper;
      ctx.lineWidth=Math.max(.3,style.width*size*0.25*taper);
      ctx.stroke();
    }

    // 3. Track-specific signature engines
    if(style.kind==='lightning'){
      // Track 0: Jagged high-voltage plasma lightning forks & ionization rings
      for(let lane=0;lane<style.lanes;lane++){
        ctx.beginPath();
        for(let j=0;j<count;j++){
          const p=points[j],f=p.fraction;
          const taper=Math.pow(1-f,1.3);
          const jag=reduced?0:Math.sin(j*4.7+lane*3.1+clock*14)*Math.cos(j*2.3-clock*9)*style.width*size*Math.sin(f*Math.PI)*1.3*taper;
          const spread=(lane-(style.lanes-1)/2)*style.width*size*0.35*taper;
          const x=p.x+p.nx*(spread+jag),y=p.y+p.ny*(spread+jag);
          j?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.strokeStyle=lane===1?'#ffffff':color;
        ctx.globalAlpha=Math.pow(1-lane*0.2,1.5)*0.55;
        ctx.lineWidth=Math.max(.4,style.width*size*(1.1-lane*0.3)/(style.lanes));
        ctx.stroke();
      }
      const branches=reduced?3:small?6:12;
      for(let b=1;b<=branches;b++){
        const f=b/(branches+1),p=points[Math.floor(f*(count-1))];
        const dir=b%2===0?1:-1;
        const taper=Math.pow(1-f,1.35);
        const forkLen=taper*style.width*size*(reduced?1.2:1.8+Math.sin(b*7.3+clock*8)*0.7);
        const fx=p.x+p.nx*dir*forkLen+p.tx*forkLen*0.4;
        const fy=p.y+p.ny*dir*forkLen+p.ty*forkLen*0.4;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(fx,fy);
        ctx.strokeStyle=b%3===0?'#ffffff':color;
        ctx.globalAlpha=taper*0.6;
        ctx.lineWidth=Math.max(.3,0.8*size*taper);
        ctx.stroke();
      }
      if(pulse>.06&&!reduced){
        const head=points[0];
        const blast=(16+(1-pulse)*42)*size;
        ctx.strokeStyle='#ffffff';ctx.globalAlpha=pulse*0.45;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(head.x,head.y,blast,0,Math.PI*2);ctx.stroke();
        for(let a=0;a<8;a++){
          const ang=a*Math.PI/4+clock*5;
          ctx.beginPath();ctx.moveTo(head.x,head.y);
          ctx.lineTo(head.x+Math.cos(ang)*blast*1.6,head.y+Math.sin(ang)*blast*1.6);
          ctx.strokeStyle=color;ctx.globalAlpha=pulse*0.5;ctx.lineWidth=1.2;ctx.stroke();
        }
      }
    }else if(style.kind==='vortex'){
      // Track 1: Braided chromatic vortex ribbons with undulating 3D helical phase & cross-struts
      for(let lane=0;lane<style.lanes;lane++){
        const lanePhase=lane*(Math.PI*2/style.lanes);
        ctx.beginPath();
        for(let j=0;j<count;j++){
          const p=points[j],f=p.fraction;
          const taper=Math.pow(1-f,1.3);
          const osc=Math.sin(f*16+clock*5+lanePhase)*Math.sin(f*Math.PI);
          const push=osc*style.width*size*1.3*taper;
          const x=p.x+p.nx*push,y=p.y+p.ny*push;
          j?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.strokeStyle=lane===1?color:lane===0?'#d0b4ff':'#78f0e6';
        ctx.globalAlpha=0.55*(1-lane*0.15);
        ctx.lineWidth=Math.max(.5,style.width*size*0.55);
        ctx.stroke();
      }
      const struts=reduced?4:small?8:16;
      for(let s=1;s<=struts;s++){
        const f=s/(struts+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.4);
        const osc=Math.sin(f*16+clock*5)*Math.sin(f*Math.PI)*style.width*size*1.3*taper;
        ctx.beginPath();
        ctx.moveTo(p.x-p.nx*osc,p.y-p.ny*osc);
        ctx.lineTo(p.x+p.nx*osc,p.y+p.ny*osc);
        ctx.strokeStyle=color;ctx.globalAlpha=taper*0.45;ctx.lineWidth=Math.max(.3,0.7*taper);ctx.stroke();
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(14+(1-pulse)*36)*size;
        ctx.strokeStyle='#78f0e6';ctx.globalAlpha=pulse*0.4;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.ellipse(head.x,head.y,r*1.4,r*0.7,angle+clock*3,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#d0b4ff';ctx.beginPath();ctx.ellipse(head.x,head.y,r*0.9,r*1.3,angle-clock*3,0,Math.PI*2);ctx.stroke();
      }
    }else if(style.kind==='shock'){
      // Track 2: Supersonic Mach diamonds & heavy gravitational compression barriers
      const numDiamonds=reduced?3:small?5:9;
      for(let k=1;k<=numDiamonds;k++){
        const f=k/(numDiamonds+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.4);
        const dw=style.width*size*0.75*taper*(1+(reduced?0:0.3*Math.sin(k*2.5-clock*8)));
        const dl=dw*1.4;
        const fx=p.x+p.tx*dl,fy=p.y+p.ty*dl;
        const rx=p.x+p.nx*dw,ry=p.y+p.ny*dw;
        const bx=p.x-p.tx*dl,by=p.y-p.ty*dl;
        const lx=p.x-p.nx*dw,ly=p.y-p.ny*dw;
        ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(rx,ry);ctx.lineTo(bx,by);ctx.lineTo(lx,ly);ctx.closePath();
        ctx.strokeStyle=color;ctx.globalAlpha=taper*0.65;ctx.lineWidth=Math.max(.3,1.2*taper);ctx.stroke();
        ctx.fillStyle=color;ctx.globalAlpha=taper*0.18;ctx.fill();
        ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(rx,ry);ctx.stroke();
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(18+(1-pulse)*48)*size;
        ctx.strokeStyle='#ffffff';ctx.globalAlpha=pulse*0.5;ctx.lineWidth=2.2;
        ctx.beginPath();
        ctx.moveTo(head.x+head.tx*r*1.5,head.y+head.ty*r*1.5);
        ctx.lineTo(head.x+head.nx*r,head.y+head.ny*r);
        ctx.lineTo(head.x-head.tx*r*0.5,head.y-head.ty*r*0.5);
        ctx.lineTo(head.x-head.nx*r,head.y-head.ny*r);
        ctx.closePath();ctx.stroke();
      }
    }else if(style.kind==='fire'){
      // Track 3: Coronal magnetic loops & turbulent solar prominence firestorm
      for(let lane=0;lane<style.lanes;lane++){
        ctx.beginPath();
        for(let j=0;j<count;j++){
          const p=points[j],f=p.fraction;
          const taper=Math.pow(1-f,1.3);
          const flame=Math.abs(Math.sin(f*14+clock*5+lane*1.8))*Math.sin(f*Math.PI)*style.width*size*1.6*taper;
          const side=(lane-1);
          const x=p.x+p.nx*(side*flame),y=p.y+p.ny*(side*flame);
          j?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.strokeStyle=lane===1?'#ffffff':color;
        ctx.globalAlpha=0.52*(1-lane*0.15);
        ctx.lineWidth=Math.max(.4,style.width*size*0.6);
        ctx.stroke();
      }
      const embers=reduced?4:small?10:20;
      for(let j=1;j<=embers;j++){
        const f=j/(embers+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.35);
        const drift=Math.sin(j*8.3+clock*6)*style.width*size*f*2.2*taper;
        const ex=p.x+p.nx*drift-p.tx*f*size*5;
        const ey=p.y+p.ny*drift-p.ty*f*size*5;
        const er=Math.max(.4,(0.5+taper*2.8)*size);
        ctx.beginPath();ctx.arc(ex,ey,er,0,Math.PI*2);
        ctx.fillStyle=j%3===0?'#ffffff':color;ctx.globalAlpha=taper*0.7;ctx.fill();
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(15+(1-pulse)*40)*size;
        ctx.strokeStyle='#ffe082';ctx.globalAlpha=pulse*0.45;ctx.lineWidth=1.8;
        ctx.beginPath();ctx.arc(head.x,head.y,r,0,Math.PI*2);ctx.stroke();
        for(let a=0;a<6;a++){
          const flareAng=angle+a*Math.PI/3+clock*4;
          const fx=head.x+Math.cos(flareAng)*r*1.5,fy=head.y+Math.sin(flareAng)*r*1.5;
          ctx.beginPath();ctx.arc(fx,fy,r*0.35,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        }
      }
    }else if(style.kind==='laser'){
      // Track 4: Cyberpunk digital oscilloscope & neon chevron beam
      ctx.beginPath();
      for(let j=0;j<count;j++){
        const p=points[j],f=p.fraction;
        const taper=Math.pow(1-f,1.3);
        const quant=reduced?0:(Math.floor(Math.sin(j*0.9+clock*11)*3)/3)*style.width*size*1.4*Math.sin(f*Math.PI)*taper;
        const x=p.x+p.nx*quant,y=p.y+p.ny*quant;
        j?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.strokeStyle='#ffffff';ctx.globalAlpha=0.65;ctx.lineWidth=1.0*size;ctx.stroke();
      const chevrons=reduced?3:small?6:11;
      for(let c=1;c<=chevrons;c++){
        const f=c/(chevrons+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.35);
        const chw=style.width*size*0.9*taper;
        const chl=chw*0.85;
        ctx.beginPath();
        ctx.moveTo(p.x-p.tx*chl+p.nx*chw,p.y-p.ty*chl+p.ny*chw);
        ctx.lineTo(p.x+p.tx*chl*0.3,p.y+p.ty*chl*0.3);
        ctx.lineTo(p.x-p.tx*chl-p.nx*chw,p.y-p.ty*chl-p.ny*chw);
        ctx.strokeStyle=color;ctx.globalAlpha=taper*0.75;ctx.lineWidth=Math.max(.4,1.3*taper);ctx.stroke();
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(16+(1-pulse)*44)*size;
        ctx.strokeStyle='#52ffb8';ctx.globalAlpha=pulse*0.5;ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(head.x-r,head.y);ctx.lineTo(head.x+r,head.y);
        ctx.moveTo(head.x,head.y-r);ctx.lineTo(head.x,head.y+r);
        ctx.stroke();
        ctx.beginPath();ctx.rect(head.x-r*0.6,head.y-r*0.6,r*1.2,r*1.2);ctx.stroke();
      }
    }else if(style.kind==='mandala'){
      // Track 5: Celestial mandala spiral & rotating 8-pointed star constellations
      for(let arm=0;arm<2;arm++){
        ctx.beginPath();
        for(let j=0;j<count;j++){
          const p=points[j],f=p.fraction;
          const taper=Math.pow(1-f,1.3);
          const spin=Math.sin(f*18+clock*4.5+arm*Math.PI)*style.width*size*1.4*Math.sin(f*Math.PI)*taper;
          const x=p.x+p.nx*spin,y=p.y+p.ny*spin;
          j?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.strokeStyle=arm===0?color:'#ffd5fa';ctx.globalAlpha=0.55;ctx.lineWidth=Math.max(.4,style.width*size*0.5);ctx.stroke();
      }
      const stars=reduced?3:small?6:10;
      let prevX=0,prevY=0;
      for(let s=1;s<=stars;s++){
        const f=s/(stars+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.35);
        const rot=reduced?0:clock*3+s;
        const sr=Math.max(.5,(0.8+taper*3.5)*size);
        ctx.beginPath();
        for(let a=0;a<8;a++){
          const ang=rot+a*Math.PI/4;
          const rNode=a%2===0?sr*2.0:sr*0.75;
          const sx=p.x+Math.cos(ang)*rNode,sy=p.y+Math.sin(ang)*rNode;
          a?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy);
        }
        ctx.closePath();
        ctx.strokeStyle='#ffffff';ctx.fillStyle=color;ctx.globalAlpha=taper*0.65;
        ctx.lineWidth=Math.max(.3,0.8*taper);ctx.stroke();ctx.fill();
        if(s>1){
          ctx.beginPath();ctx.moveTo(prevX,prevY);ctx.lineTo(p.x,p.y);
          ctx.strokeStyle=color;ctx.globalAlpha=taper*0.3;ctx.lineWidth=Math.max(.3,0.6*taper);ctx.stroke();
        }
        prevX=p.x;prevY=p.y;
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(16+(1-pulse)*40)*size;
        ctx.strokeStyle='#ffffff';ctx.globalAlpha=pulse*0.45;ctx.lineWidth=1.5;
        ctx.beginPath();
        for(let a=0;a<16;a++){
          const ang=a*Math.PI/8+clock*2;
          const len=a%2===0?r*1.6:r*0.7;
          ctx.moveTo(head.x,head.y);ctx.lineTo(head.x+Math.cos(ang)*len,head.y+Math.sin(ang)*len);
        }
        ctx.stroke();
      }
    }else if(style.kind==='crystal'){
      // Track 6: Tumbling 3D prismatic crystals & rainbow dispersion rays
      const numCrystals=reduced?3:small?6:11;
      for(let c=1;c<=numCrystals;c++){
        const f=c/(numCrystals+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.35);
        const rot=reduced?0:clock*4+c*1.2;
        const cr=Math.max(.5,(1.0+taper*4.5)*size);
        const cosR=Math.cos(rot);
        const top={x:p.x-p.tx*cr*1.5,y:p.y-p.ty*cr*1.5};
        const btm={x:p.x+p.tx*cr*1.5,y:p.y+p.ty*cr*1.5};
        const left={x:p.x-p.nx*cr*cosR,y:p.y-p.ny*cr*cosR};
        const right={x:p.x+p.nx*cr*cosR,y:p.y+p.ny*cr*cosR};
        ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(right.x,right.y);ctx.lineTo(btm.x,btm.y);ctx.closePath();
        ctx.fillStyle=c%2===0?'#ffffff':color;ctx.globalAlpha=taper*0.35;ctx.fill();
        ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(.3,0.8*taper);ctx.stroke();
        ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(left.x,left.y);ctx.lineTo(btm.x,btm.y);ctx.closePath();
        ctx.strokeStyle=color;ctx.globalAlpha=taper*0.6;ctx.stroke();
        const rayLen=cr*2.2;
        ctx.beginPath();ctx.moveTo(right.x,right.y);ctx.lineTo(right.x+p.nx*rayLen,right.y+p.ny*rayLen);
        ctx.strokeStyle='#ffe082';ctx.globalAlpha=taper*0.4;ctx.lineWidth=Math.max(.3,0.6*taper);ctx.stroke();
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(18+(1-pulse)*42)*size;
        ctx.strokeStyle='#ffffff';ctx.globalAlpha=pulse*0.5;ctx.lineWidth=2;
        ctx.beginPath();
        for(let a=0;a<6;a++){
          const ang=a*Math.PI/3+clock*3;
          const px=head.x+Math.cos(ang)*r,py=head.y+Math.sin(ang)*r;
          a?ctx.lineTo(px,py):ctx.moveTo(px,py);
        }
        ctx.closePath();ctx.stroke();
      }
    }else{
      // Track 7: Hyperspace warp drive tunnel & tachyon perspective rings
      const numRings=reduced?3:small?6:11;
      for(let k=0;k<numRings;k++){
        const phase=reduced?(k/numRings):((k/numRings+clock*0.8)%1.0);
        const idx=Math.floor(Math.pow(phase,1.6)*(count-1));
        const p=points[Math.min(count-1,Math.max(0,idx))];
        const taper=Math.pow(1-phase,1.4);
        const rw=style.width*size*1.6*taper;
        const rh=rw*0.42;
        ctx.beginPath();
        ctx.ellipse(p.x,p.y,Math.max(.5,rw),Math.max(.3,rh),angle,0,Math.PI*2);
        ctx.strokeStyle=k%2===0?'#ffffff':color;
        ctx.globalAlpha=taper*0.65;
        ctx.lineWidth=Math.max(.3,1.3*taper);
        ctx.stroke();
      }
      const streaks=reduced?3:small?5:9;
      for(let s=1;s<=streaks;s++){
        const f=s/(streaks+1),p=points[Math.floor(f*(count-1))];
        const taper=Math.pow(1-f,1.35);
        const spread=(s-(streaks-1)/2)*style.width*size*0.35*taper;
        const len=style.width*size*2.6*taper;
        ctx.beginPath();
        ctx.moveTo(p.x+p.nx*spread,p.y+p.ny*spread);
        ctx.lineTo(p.x+p.nx*spread-p.tx*len,p.y+p.ny*spread-p.ty*len);
        ctx.strokeStyle=color;ctx.globalAlpha=taper*0.55;ctx.lineWidth=Math.max(.3,0.9*taper);ctx.stroke();
      }
      if(pulse>.06&&!reduced){
        const head=points[0],r=(20+(1-pulse)*50)*size;
        ctx.strokeStyle='#ffffff';ctx.globalAlpha=pulse*0.5;ctx.lineWidth=2.2;
        ctx.beginPath();ctx.ellipse(head.x,head.y,r*1.8,r*0.6,angle,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.ellipse(head.x,head.y,r*0.6,r*1.8,angle,0,Math.PI*2);ctx.stroke();
      }
    }

    ctx.restore();
  }

  const api={styles,reactorStyles,hyperStyles,draw,drawHyper};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
