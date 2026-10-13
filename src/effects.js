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
  function draw(ctx,index,position,angle,time,pulse,color,scale,small,reduced,setup='ambient'){
    const style=(setup==='reactor'?reactorStyles:styles)[index],count=reduced?12:small?22:44;
    const span=style.length*(reduced?.45:1),size=Math.max(.7,scale);
    const clock=reduced?0:time;
    const points=Array.from({length:count},(_,j)=>{
      const fraction=j/(count-1),a=angle-span*fraction,p=position(a),ahead=position(a+.008);
      const dx=ahead.x-p.x,dy=ahead.y-p.y,len=Math.hypot(dx,dy)||1;
      return {...p,nx:-dy/len,ny:dx/len,fraction};
    });
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
    // One broad glow pass per voice, rather than blurring every particle.
    ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=color;ctx.globalAlpha=.09;ctx.lineWidth=style.width*size*3;
    ctx.shadowColor=color;ctx.shadowBlur=reduced?0:small?8:18;ctx.stroke();ctx.shadowBlur=0;
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
  const api={styles,reactorStyles,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
