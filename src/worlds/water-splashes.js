/* Analytic water optics. Reconstructed from transport age; no retained particles. */
(function(root){
 'use strict';
 const shader=`
 float waterSegment(vec2 p,vec2 a,vec2 b){vec2 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/max(.0001,dot(ab,ab)),0.,1.));}
 vec3 waterLens(vec3 background,vec2 p,float mask,float strength){
  vec3 normal=normalize(vec3(p*.65,sqrt(max(.01,1.-dot(p,p)))));
  vec3 reflected=sky(normalize(vec3(normal.x*.4,abs(normal.y)*.5+.12,-1.)),1.4);
  float edge=pow(clamp(length(p),0.,1.),3.);
  vec3 water=mix(background*.90,reflected,.18+edge*.36);
  float glint=pow(max(0.,dot(normal,normalize(vec3(-.4,.7,.6)))),24.);
  water+=vec3(.78,.86,.88)*glint*.55;
  return mix(background,water,mask*strength);
 }
 vec4 waterLane(int lane){if(lane==0)return splashLane0;if(lane==1)return splashLane1;if(lane==2)return splashLane2;if(lane==3)return splashLane3;if(lane==4)return splashLane4;if(lane==5)return splashLane5;if(lane==6)return splashLane6;if(lane==7)return splashLane7;return splashLane8;}
 vec3 waterSplashes(vec3 background){
  if(splashMask<.5)return background;
  float px=1./max(1.,worldScale*.001*resolution.y);
  for(int lane=0;lane<9;lane++){
   if((int(splashMask)&(1<<lane))==0)continue;
   vec4 event=waterLane(lane);float splashAge=event.x,splashEntering=event.z;
   if(splashAge<0.||splashAge>1.3+waterIntensity*.45)continue;
   float power=.62+waterIntensity*.55+max(0.,waterIntensity-1.)*.65;
   float size=(.7+float(lane)*.07)*power*event.w;
   vec2 center=vec2(event.y,origin.y);
   vec2 p=(uv-center)*vec2(resolution.x,resolution.y)/(worldScale*.001*resolution.y*size);
   if(abs(p.x)>78.||p.y< -18.||p.y>85.)continue;
   float t=splashAge,fade=exp(-t*2.5),epsilon=max(.28,px/size);
   // Three shallow wave fronts. Broken grazing highlights, not opaque rings.
   for(int k=0;k<3;k++){
    float age=t-float(k)*.10;if(age<0.)continue;
    vec2 rp=vec2(p.x,p.y*5.5);float r=length(rp),a=atan(rp.y,rp.x);
    float radius=3.+sqrt(age)*25.;float d=abs(r-radius-sin(a*(4.+float(lane%4))+age*4.)*.45);
    float ring=(1.-smoothstep(.15,1.1+epsilon,d))*exp(-age*2.)*.10;
    background+=vec3(.42,.54,.60)*ring*(.45+.55*sin(a*3.+1.)*sin(a*3.+1.));
   }
   if(splashReduced>.5)continue;
   // Thin expanding translucent crown, with the rear surface seen through its front.
   if(t<.48){
    float life=t/.48,width=3.+life*17.,height=sin(life*3.14159)*(10.+splashEntering*7.);
    float u=p.x/width;
    if(abs(u)<1.){
     float scallop=.7+.3*sin(u*21.+float(lane));
     float top=height*sqrt(max(0.,1.-u*u))*scallop;
     float back=-sqrt(max(0.,1.-u*u))*width*.12;
     float sheet=smoothstep(back-epsilon,back+epsilon,p.y)*(1.-smoothstep(top-epsilon,top+epsilon,p.y));
     background=waterLens(background,vec2(u,p.y/max(1.,height)*.7),sheet,(1.-life)*.48);
     float rim=1.-smoothstep(.12,.45+epsilon,abs(p.y-top));
     background+=vec3(.62,.73,.78)*rim*(1.-life)*.12;
    }
   }
   // Sparse torn liquid filaments; their ballistic tips break into subpixel lenses.
   for(int k=0;k<28;k++){
    if(float(k)>=8.+waterIntensity*10.)break;
    float fk=float(k),seed=hash(vec2(fk+float(lane)*13.,8.9));
    float az=fk*2.39996+float(lane)*.7;
    vec2 velocity=vec2(cos(az)*(16.+seed*36.),22.+hash(vec2(fk,13.7))*39.);
    float delay=seed*.055,age=t-delay;if(age<0.)continue;
    vec2 tip=velocity*age-vec2(0.,64.*age*age);
    if(tip.y<.1)continue;
    if(age<.24&&float(k)<4.+waterIntensity*5.){
     float tailAge=max(0.,age-.07);vec2 tail=velocity*tailAge-vec2(0.,64.*tailAge*tailAge);
     float d=waterSegment(p,tail,tip);float filament=1.-smoothstep(.12,.4+epsilon,d);
     background=waterLens(background,vec2(clamp((p.x-tip.x)*.4,-.8,.8),.4),filament,fade*.33);
    }
    vec2 radii=vec2(.20+seed*.34,.30+seed*.48);radii.y+=abs(velocity.y-128.*age)*.007;
    vec2 dp=(p-tip)/radii;float distanceToDrop=length(dp);
    float coverage=min(1.,3.14159*radii.x*radii.y/(epsilon*epsilon));
    float drop=(1.-smoothstep(.6,1.+epsilon/max(.3,radii.x),distanceToDrop))*coverage;
    background=waterLens(background,dp/max(1.,distanceToDrop),drop,fade*.72);
   }
   // Short-lived diffuse spray close to the impact. Never a bright particle disk.
   float mist=exp(-p.x*p.x/180.-pow(p.y-4.,2.)/35.)*exp(-t*9.)*.035;
   background=mix(background,vec3(.64,.73,.77),mist);
  }
  return background;
 }`;
 function fallback(ctx,x,y,age,entering,size,reduced,effectMode=1,variation=1){
  size*=(.62+effectMode*.55+Math.max(0,effectMode-1)*.65)*variation;
  if(age<0||age>1.3+effectMode*.45)return;
  ctx.save();ctx.lineWidth=.55;ctx.strokeStyle='#b8ced8';
  for(let k=0;k<3;k++){
   const t=age-k*.10;if(t<0)continue;const r=(3+Math.sqrt(t)*25)*size;
   ctx.globalAlpha=Math.exp(-t*2)*.14;ctx.beginPath();ctx.ellipse(x,y,r,r*.18,0,.12,Math.PI*.92);ctx.stroke();
  }
  if(!reduced&&age<.48){
   const t=age/.48,w=(3+t*17)*size,h=Math.sin(t*Math.PI)*(entering?17:10)*size;
   const sheet=ctx.createLinearGradient(x,y-h,x,y);sheet.addColorStop(0,'rgba(211,232,239,.18)');sheet.addColorStop(.4,'rgba(40,72,87,.04)');sheet.addColorStop(1,'rgba(171,205,217,.10)');
   ctx.globalAlpha=1-t;ctx.fillStyle=sheet;ctx.beginPath();ctx.moveTo(x-w,y);
   for(let j=0;j<=32;j++){const u=j/16-1;ctx.lineTo(x+u*w,y-h*Math.sqrt(Math.max(0,1-u*u))*(.7+.3*Math.sin(u*21)))}
   ctx.lineTo(x+w,y);ctx.closePath();ctx.fill();ctx.globalAlpha=(1-t)*.22;ctx.stroke();
  }
  // No opaque drop sprites in the Canvas fallback: only fine short ballistic streaks.
  if(!reduced)for(let k=0;k<8+effectMode*10;k++){
   const seed=(k*.6180339)%1,a=k*2.39996,vx=Math.cos(a)*(16+seed*36),vy=22+((k*.4142136)%1)*39;
   const py=vy*age-64*age*age;if(py<0)continue;const past=Math.max(0,age-.018);
   ctx.globalAlpha=Math.exp(-age*3)*.26;ctx.beginPath();ctx.moveTo(x+vx*past*size,y-(vy*past-64*past*past)*size);ctx.lineTo(x+vx*age*size,y-py*size);ctx.stroke();
  }
  ctx.restore();
 }
 const api={shader,fallback};root.HaloWaterSplashes=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
