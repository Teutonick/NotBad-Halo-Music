/* Existing AMBIENT / REACTOR background, isolated from WATER. */
(function(root){
 'use strict';
 const shader=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;uniform vec2 resolution;uniform vec2 origin;uniform float worldScale;uniform float tm;uniform float mode;uniform float energy;uniform float richness;uniform float reactor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.07+vec2(7.1,3.2);a*=.5;}return v;}
void main(){vec2 p=(uv-origin)*vec2(resolution.x/resolution.y,1.)/worldScale;float r=length(p);float angle=atan(p.y,p.x);float flow=tm*.015;vec2 q=mat2(cos(flow),-sin(flow),sin(flow),cos(flow))*p*5.;q+=vec2(sin(r*5.-flow),cos(r*5.+flow))*.7;float cloud=fbm(q*.85+vec2(2.4,1.5));float n=fbm(p*3.8+vec2(flow,-flow));float core=exp(-r*r*17.);float ring=exp(-pow((r-.27)*6.,2.));float swirl=exp(-pow((r-.30+sin(angle*5.+tm*.055)*.018)*12.,2.));vec3 bg=mix(vec3(.008,.017,.048),vec3(.012,.035,.074),clamp(uv.y+.13,0.,1.));vec3 violet=vec3(.19,.10,.32);vec3 teal=vec3(.036,.22,.26);vec3 pink=vec3(.20,.075,.18);float neb=pow(max(0.,cloud-.32),2.)*3.7;bg+=mix(violet,teal,clamp(.5+.4*sin(angle+tm*.045+mode),0.,1.))*neb*exp(-r*r*8.);bg+=pink*pow(n,3.)*.13*exp(-r*r*6.);bg+=teal*ring*.25+violet*swirl*.12;bg+=vec3(.09,.26,.31)*core*(.29+energy*.23);bg*=1.-.19*smoothstep(.5,1.0,r);float star=step(.9984,hash(floor(uv*resolution/2.)))*(.12+.18*hash(floor(uv*resolution/2.)+50.));bg+=vec3(.66,.85,1.)*star;if(richness>.5){float veil=pow(max(0.,sin(angle*3.+r*23.-flow*2.)*.5+.5),6.)*exp(-r*r*3.);bg+=mix(teal,violet,.5+.5*sin(angle+flow))*veil*.20;bg+=vec3(.04,.11,.14)*exp(-pow((r-.22-sin(angle*3.+flow)*.035)*20.,2.))*(.4+energy*.12);}if(richness>1.5){float warp=pow(max(0.,sin(angle*8.+flow*4.)*.5+.5),8.)*exp(-r*r*4.);bg+=mix(vec3(.32,.12,.55),vec3(.12,.45,.62),.5+.5*sin(angle*3.-flow*2.))*warp*(.35+energy*.28);bg+=vec3(.14,.08,.22)*exp(-pow((r-.36-sin(angle*5.+flow*2.)*.02)*24.,2.))*(.5+energy*.25);}
if(reactor>.5){float heat=fbm(p*8.+vec2(flow,-flow));bg=vec3(.015,.014,.018)+vec3(.42,.07,.025)*neb*exp(-r*r*5.);bg+=vec3(.7,.19,.045)*pow(heat,4.)*ring*(.3+energy*.22);bg+=vec3(.25,.32,.38)*star;bg+=vec3(.45,.12,.04)*core*.3;}
frag=vec4(pow(max(bg,vec3(0.)),vec3(.86)),1.);}`;
 function draw(ctx,frame){
 const {particles,time,delta,W,H,cx,cy,scale,fade,playing,master,instruments,motionMode,phraseBars,timeSignature,visibleComposition,language,setup,reducedMotion,effectMode,visualOnly,pulses,syncMotion,scene,phrase}=frame;
 const TWO=Math.PI*2;let lastNodes=[];
 function position(i,angle,sceneMode=scene){return root.HaloOrbitGeometry.position(i,angle,{scene:sceneMode,syncMotion,cx,cy,scale})}
 function stroke(color,alpha,width=1,blur=0){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.stroke()}
// Ambient stars and dust, deliberately not quantized to the audio clock.
ctx.save();ctx.globalCompositeOperation='screen';for(let p of particles){p.ang+=delta*p.s*.16;let x=cx+Math.cos(p.ang)*p.dist*1.47,y=cy+Math.sin(p.ang)*p.dist*.85;if(x<0||x>W||y<0||y>H)continue;let flicker=.8+.2*Math.sin(time*1.4+p.ang*23);ctx.beginPath();ctx.fillStyle=`rgba(178,219,255,${p.al*flicker})`;ctx.arc(x,y,p.sz,0,TWO);ctx.fill()}
// Diffuse central aura.
let central=ctx.createRadialGradient(cx,cy,10,cx,cy,160*scale);central.addColorStop(0,'rgba(119,239,227,.066)');central.addColorStop(.45,'rgba(92,145,250,.027)');central.addColorStop(1,'rgba(35,90,177,0)');ctx.fillStyle=central;ctx.beginPath();ctx.arc(cx,cy,160*scale,0,TWO);ctx.fill();
for(let k=0;k<4;k++){ctx.beginPath();const r=(63+k*29)*scale,phi=time*(k%2?-.022:.015);ctx.ellipse(cx,cy,r,r*.48,phi,0,TWO);stroke(k%2?'#7abada':'#d0acff',.045*fade,.6,.8)}
const hasTrack09=(typeof HaloLiveLoop!=='undefined'&&HaloLiveLoop.hasAudio&&HaloLiveLoop.hasAudio());
const maxOrbit=hasTrack09?8:7;
if(syncMotion){ctx.beginPath();ctx.moveTo(cx,cy);if(motionMode===2){const pointer=position(maxOrbit,phrase.phase*TWO);ctx.lineTo(pointer.x,pointer.y)}else ctx.lineTo(cx+320*scale,cy);stroke('#a4f6ef',.25,1);ctx.font='10px sans-serif';ctx.fillStyle='#a4f6ef';ctx.globalAlpha=.6;if(!visualOnly&&motionMode===1)ctx.fillText(HaloI18n.translate('BAR '+(Math.floor(master/4)+1)+' · BEAT '+(Math.floor(master%4)+1)+'/4',language),cx+40*scale,cy-12);if(!visualOnly&&motionMode===2){for(let bar=0;bar<phraseBars;bar++){const label=position(maxOrbit,bar*TWO/phraseBars);ctx.fillText(HaloI18n.translate('BAR '+(bar+1),language),Math.max(8,Math.min(W-44,label.x+(bar===2?-40:5))),label.y+(bar===3?-12:15))}}ctx.globalAlpha=1;}
// Closed trajectories. One master beat, irrational-looking visual harmonics.
lastNodes=[];
let speeds=[1,.5,.25,1.5,.75,.375,1.25,.625,.875];let phases=[.23,1.62,3.3,2.07,5.2,.5,4.1,2.8,1.15];for(let i=maxOrbit;i>=0;i--){const is9=(i===8);const t=is9?{name:'live-loop',color:'#ffffff',on:!HaloLiveLoop.isMuted()}:instruments[i];const speed=speeds[i],phase=phases[i];let angle=master*TWO*speed/4+phase+time*.017*(i%2?1:-1);if(syncMotion){if(motionMode===2)angle=phrase.phase*TWO;else if(!is9)angle=HaloMotion.phaseAt(t.manualSteps||HaloSounds.patternFor(t,phraseBars,timeSignature),master*4,HaloSounds.cycleLength(t,phraseBars,timeSignature))*TWO;else angle=HaloMotion.phaseAt([0,4,8,12],master*4,16)*TWO;}let N=112;ctx.beginPath();for(let j=0;j<=N;j++){let p=position(i,TWO*j/N,scene);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}stroke(t.color,(t.on?.18:.036)*fade,.95,0);
if(motionMode===2){
 const events=is9?(HaloLiveLoop.getSlicePhraseSteps?HaloLiveLoop.getSlicePhraseSteps(phrase.start,phraseBars):[]):HaloMotion.phraseSteps({...t,variation:visibleComposition.seed},i,phrase.start,visibleComposition.seed,HaloSounds,phraseBars,timeSignature);
 for(const event of events){const spb=timeSignature==='3/4'?12:16;const marker=position(i,event.step*TWO/(phraseBars*spb)),size=(event.fires?2.6:event.candidate?2:1)*Math.max(.7,scale);ctx.beginPath();ctx.arc(marker.x,marker.y,size,0,TWO);ctx.fillStyle=t.color;ctx.strokeStyle=t.color;ctx.lineWidth=.8;const beatStep=timeSignature==='3/4'?(phraseBars===8?6:4):4;ctx.globalAlpha=(t.on?1:.24)*(event.fires?.85:event.candidate?.35:event.step%beatStep===0?.26:.08);if(event.fires||!event.candidate)ctx.fill();else ctx.stroke()}
 ctx.globalAlpha=1;
}
if(t.on){
 if(effectMode===0){ctx.beginPath();for(let j=0;j<=24;j++){let aa=angle-j*.034*(speed>.6?1:.8),p=position(i,aa);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}stroke(t.color,.39*fade,1.7,8)}
 else if(effectMode===1){HaloEffects.draw(ctx,i,a=>position(i,a),angle,time,pulses[i]||0,t.color,scale,W<700,reducedMotion?.matches||false,setup)}
 else{HaloEffects.drawHyper(ctx,i,a=>position(i,a),angle,time,pulses[i]||0,t.color,scale,W<700,reducedMotion?.matches||false,setup)}
}
let pos=position(i,angle);if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))continue;lastNodes[i]=pos;if(pulses[i])pulses[i]*=Math.exp(-delta*2.25);if(!t.on){if(motionMode===2){ctx.beginPath();ctx.arc(pos.x,pos.y,3,0,TWO);ctx.fillStyle=t.color;ctx.globalAlpha=.22;ctx.fill();ctx.globalAlpha=1}continue}let radius=(4.9+3.2*(pulses[i]||0))*Math.max(.72,scale);let halo=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,radius*9);halo.addColorStop(0,t.color+'f2');halo.addColorStop(.09,t.color+'b0');halo.addColorStop(.31,t.color+'31');halo.addColorStop(1,t.color+'00');ctx.fillStyle=halo;ctx.globalAlpha=.88;ctx.beginPath();ctx.arc(pos.x,pos.y,radius*9,0,TWO);ctx.fill();ctx.beginPath();ctx.fillStyle='#ffffff';ctx.globalAlpha=.9;ctx.arc(pos.x,pos.y,radius*.56,0,TWO);ctx.fill();ctx.beginPath();ctx.strokeStyle=t.color;ctx.globalAlpha=.60;ctx.lineWidth=.85;ctx.arc(pos.x,pos.y,radius*(1.6+(pulses[i]||0)*1.9),0,TWO);ctx.stroke();ctx.globalAlpha=1;
}
// A living central nucleus with oscillating petal interference.
ctx.save();ctx.translate(cx,cy);let pulse=playing?Math.sin(master*TWO)*.026:Math.sin(time*.28)*.024;let cr=(30+pulse*15)*scale;for(let k=0;k<3;k++){ctx.beginPath();for(let j=0;j<=256;j++){let a=TWO*j/256;let r=cr*(1+.1*Math.sin(6*a+k*1.85+time*.19));let x=Math.cos(a)*r,y=Math.sin(a)*r*.74;j?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle=setup==='reactor'?['#ffd7b3','#ff9365','#f0b1a0'][k]:k===0?'#d5fffa':k===1?'#9bd9fa':'#d1b6ff';ctx.globalAlpha=[.32,.20,.12][k];ctx.lineWidth=[1.1,2,3][k];ctx.shadowColor=setup==='reactor'?'#ff8b52':'#93efe8';ctx.shadowBlur=15;ctx.stroke()}ctx.restore();ctx.restore();
 return lastNodes;
 }
 root.HaloSpaceWorld={shader,draw};
})(globalThis);
