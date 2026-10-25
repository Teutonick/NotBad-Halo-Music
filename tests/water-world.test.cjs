const test=require('node:test'),assert=require('node:assert/strict');
const Water=require('../src/worlds/water.js'),Orbits=require('../src/worlds/orbits.js');
const WaterMotion=require('../src/worlds/water-motion.js'),Stones=require('../src/worlds/water-stones.js'),Sounds=require('../src/sounds.js');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function context(){
 const calls=[];const ctx=new Proxy({calls,createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},
 {get(target,key){if(key in target)return target[key];return (...args)=>{for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x));calls.push([key,...args])}}});return ctx;
}
const waterTracks=()=>Object.keys(Sounds.banks).map(name=>({...Sounds.roles.initial('ambient',name),name,setup:'ambient',on:true,color:'#a4e7dd',variation:1}));

test('detached WATER wakes remain identical on pause, above and below the shared refracting surface',()=>{
 for(const beat of [4,12])for(const effectMode of [0,1,2]){
  const frame={tracks:waterTracks(),beat,motionMode:2,phraseBars:4,meter:'4/4',cx:600,cy:400,scale:1,tempo:72,effectMode,playing:true,reduced:false};
  const lane=WaterMotion.layout(frame)[3],moving=context(),paused=context();
  Stones.trail(moving,lane,frame);Stones.trail(paused,lane,{...frame,playing:false});
  assert.deepEqual(paused.calls,moving.calls);assert.ok(paused.calls.some(c=>c[0]==='stroke'));
  assert.ok(!paused.calls.some(c=>c[0]==='lineTo'||c[0]==='bezierCurveTo'));
  const p={x:600,y:450},q=Stones.project(p,frame,3);assert.notDeepEqual(q,p);assert.deepEqual(p,{x:600,y:450});
  assert.deepEqual(Stones.project({x:600,y:350},frame,3),{x:600,y:350});
 }
});

test('splash sizes vary per crossing inside mode-specific ranges without frame randomness',()=>{
 for(const [mode,min,max] of [[0,.65,1.05],[1,.65,1.45],[2,.7,1.9]]){
  const values=[];for(let k=0;k<60;k++){const a=WaterMotion.splashScale(k%8,k*3.4,mode);assert.ok(a>=min&&a<=max);assert.equal(a,WaterMotion.splashScale(k%8,k*3.4,mode));values.push(a)}
  assert.ok(new Set(values.map(v=>v.toFixed(3))).size>40);
 }
});

test('sky horizontal projection stays within the local panorama on portrait and ultrawide screens',()=>{
 for(const [w,h] of [[390,844],[1440,900],[2507,992],[3840,1080]]){
  const angle=Math.atan(w/h*.5/.82),scale=Water.skyScale(w,h);
  assert.ok(.5-angle*scale-.012>0);assert.ok(.5+angle*scale+.012<1);
 }
});

test('WATER note glints consume an existing pulse only while playing, including a reduced-motion soft highlight',()=>{
 const frame={tracks:waterTracks(),beat:4,motionMode:2,phraseBars:4,meter:'4/4',cx:600,cy:400,scale:1,tempo:72,effectMode:2,playing:true,reduced:false};
 const lane=WaterMotion.layout(frame)[0],live=context(),silent=context(),paused=context(),reduced=context();
 Stones.glint(live,lane,frame,.85);Stones.glint(silent,lane,frame,0);Stones.glint(paused,lane,{...frame,playing:false},.85);Stones.glint(reduced,lane,{...frame,reduced:true},.85);
 assert.ok(live.calls.some(c=>c[0]==='fill')&&live.calls.some(c=>c[0]==='stroke'));assert.equal(silent.calls.length,0);assert.equal(paused.calls.length,0);assert.ok(reduced.calls.some(c=>c[0]==='fill'));
});

test('each core voice has a different detached WATER wake shape, with no long connecting paths',()=>{
 const frame={tracks:waterTracks(),beat:4,motionMode:2,phraseBars:4,meter:'4/4',cx:600,cy:400,scale:1,tempo:72,effectMode:2,playing:false,reduced:false};
 const shapes=WaterMotion.layout(frame).map(lane=>{const ctx=context();Stones.trail(ctx,lane,frame);assert.ok(!ctx.calls.some(c=>c[0]==='lineTo'||c[0]==='bezierCurveTo'));return JSON.stringify(ctx.calls.map(c=>c[0]==='ellipse'?[c[0],+(c[4]/c[3]).toFixed(2),+c[6].toFixed(2),+c[7].toFixed(2)]:[c[0]]))});
 assert.equal(new Set(shapes).size,8);
});

test('WATER PHRASE uses the selected four/eight bars in either meter; IN TIME lands on its own musical events',()=>{
 for(const meter of ['4/4','3/4'])for(const bars of [4,8]){
  const bpb=meter==='3/4'?3:4,frame={tracks:waterTracks(),beat:bpb*bars/2,meter,phraseBars:bars,motionMode:2,cx:500,cy:350,scale:.8,tempo:72};
  const lane=WaterMotion.layout(frame)[3];assert.ok(Math.abs(lane.position.y-350)<1e-8);assert.ok(lane.position.x>500);assert.equal(lane.crossing.entering,true);
  frame.beat=bpb*bars;assert.ok(WaterMotion.layout(frame)[3].position.x<500);
 }
 const frame={tracks:waterTracks(),beat:1,meter:'4/4',phraseBars:4,motionMode:1,cx:500,cy:350,scale:1,tempo:72};
 frame.tracks[0].manualSteps=[0,4,10];frame.tracks[0].manualBars=4;
 let lane=WaterMotion.layout(frame)[0];assert.equal(lane.position.x,635);assert.ok(Math.abs(lane.position.y-350)<1e-8);assert.equal(lane.crossing.beat,1);assert.equal(lane.crossing.entering,true);
 frame.beat=1.8;lane=WaterMotion.layout(frame)[0];assert.equal(lane.crossing.beat,1.75);assert.equal(lane.crossing.entering,false);assert.ok(lane.crossing.x<500);
});

test('DRIFT splashes follow actual scene/horizon intersections and do not depend on previous rendered frames',()=>{
 let count=0;
 for(const scene of [0,1,2])for(let beat=.2;beat<20;beat+=.7){
  const frame={tracks:waterTracks(),beat,motionMode:0,effectMode:2,scene,cx:500,cy:350,scale:.8,tempo:100};
  const lanes=WaterMotion.layout(frame);
  for(const lane of lanes)if(lane.crossing){
   const event=lane.crossing;count++;assert.ok(event.beat<=beat);assert.ok(event.age<=2.20001);assert.ok(Math.abs(lane.at(event.beat).y-350)<.001);
   assert.equal(event.entering,lane.at(event.beat+.00001).y>lane.at(event.beat-.00001).y);
  }
  assert.deepEqual(WaterMotion.layout(frame).map(x=>x.position),lanes.map(x=>x.position));
 }
 assert.ok(count>100);
});

test('all WATER scene/motion/effect combinations render with stable input music and finite hit targets',()=>{
 for(const meter of ['4/4','3/4'])for(const phraseBars of [4,8])for(const scene of [0,1,2])for(const motionMode of [0,1,2])for(const effectMode of [0,1,2])for(const gpu of [false,true]){
  const tracks=waterTracks(),before=JSON.stringify(tracks),frame={width:1200,height:900,cx:600,cy:400,scale:.8,beat:7.31,tempo:72,meter,phraseBars,scene,motionMode,effectMode,tracks,pulses:Array(8).fill(.3),playing:true,reduced:false,time:10,gpu,labels:true};
  const nodes=Water.draw(context(),frame);assert.equal(nodes.length,8);assert.ok(nodes.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.equal(JSON.stringify(tracks),before);
 }
 assert.equal(new Set(Stones.signatures.slice(0,8)).size,8);
 assert.ok(Stones.intensity[0].drops<Stones.intensity[1].drops&&Stones.intensity[1].drops<Stones.intensity[2].drops);
});
test('water horizon crossings are bar 1 and bar 3 in both meters and repeat every four bars',()=>{
 for(const [meter,bpb] of [['4/4',4],['3/4',3]]){
  for(const cycle of [0,1,30])for(const [bar,side,entering] of [[0,-1,false],[2,1,true]]){
   const beat=(cycle*4+bar)*bpb,a=Water.phase(beat,meter)*Math.PI*2;
   const p=Water.point(7,a,500,350,.8),event=Water.crossing(beat,meter);
   assert.ok(Math.abs(p.y-350)<1e-8);assert.equal(event.side,side);assert.equal(event.entering,entering);assert.equal(event.age,0);
  }
  assert.ok(Water.point(0,Water.phase(bpb,meter)*Math.PI*2,500,350,1).y<350);
  assert.ok(Water.point(0,.02,500,350,1).x>Water.point(0,0,500,350,1).x);
  assert.ok(Water.point(0,Math.PI/2+.02,500,350,1).x>Water.point(0,Math.PI/2,500,350,1).x);
  assert.ok(Water.point(0,Water.phase(bpb*3,meter)*Math.PI*2,500,350,1).y>350);
 }
});
test('water render keeps eight or nine hit targets, is deterministic after seeking, and supports CPU fallback',()=>{
 for(const n of [8,9])for(const gpu of [false,true])for(const reduced of [false,true]){
  const frame={width:390,height:844,cx:195,cy:337,scale:.4,beat:8.3,tempo:72,meter:'4/4',tracks:Array.from({length:n},()=>({color:'#a4e7dd',on:true})),pulses:Array(n).fill(.5),playing:true,reduced,time:10,gpu,labels:true};
  const ctx=context(),nodes=Water.draw(ctx,frame);assert.equal(nodes.length,n);assert.deepEqual(Water.draw(context(),frame),nodes);
  assert.equal(ctx.calls.some(c=>c[0]==='fillRect'&&c[3]===390),!gpu);
  frame.playing=false;const paused=context();Water.draw(paused,frame);if(!gpu)assert.ok(paused.calls.length<ctx.calls.length);
 }
});
test('space geometry preserves synchronized ellipses and finite closed scene trajectories',()=>{
 for(const scene of [0,1,2])for(const syncMotion of [false,true])for(let i=0;i<9;i++){
  const frame={scene,syncMotion,cx:450,cy:350,scale:.8},start=Orbits.position(i,0,frame),end=Orbits.position(i,Math.PI*2,frame);
  assert.ok(Math.abs(start.x-end.x)<1e-8&&Math.abs(start.y-end.y)<1e-8);
  for(let a=0;a<6.3;a+=.2){const p=Orbits.position(i,a,frame);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y))}
 }
});

test('splash fallback has a finite lifetime and reduced motion retains only surface waves',()=>{
 const splash=require('../src/worlds/water-splashes.js'),full=context(),reduced=context(),expired=context();
 splash.fallback(full,200,300,.2,true,.8,false);splash.fallback(reduced,200,300,.2,true,.8,true);splash.fallback(expired,200,300,2,true,.8,false);
 assert.equal(expired.calls.length,0);
 assert.ok(full.calls.some(c=>c[0]==='fill'));assert.ok(!reduced.calls.some(c=>c[0]==='fill'));
 assert.ok(!full.calls.some(c=>c[0]==='arc'));assert.ok(full.calls.filter(c=>c[0]==='lineTo').length>reduced.calls.filter(c=>c[0]==='lineTo').length);
});

test('extracted space foreground draws all scenes, motion modes and effects without app closure state',()=>{
 const sandbox={HaloOrbitGeometry:Orbits,HaloSounds:require('../src/sounds.js'),HaloMotion:require('../src/motion.js'),HaloEffects:require('../src/effects.js'),HaloI18n:require('../src/i18n.js')};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/worlds/space.js'),'utf8'),sandbox);
 const S=sandbox.HaloSounds,tracks=Object.keys(S.banks).map(name=>({...S.roles.initial('ambient',name),name,setup:'ambient',on:true,color:'#a4e7dd',variation:1}));
 for(const setup of ['ambient','reactor'])for(const scene of [0,1,2])for(const motionMode of [0,1,2])for(const effectMode of [0,1,2]){
  const nodes=sandbox.HaloSpaceWorld.draw(context(),{particles:[],time:1,delta:.025,W:1200,H:900,cx:600,cy:400,scale:.8,fade:1,playing:false,master:1,instruments:tracks,motionMode,phraseBars:4,timeSignature:'4/4',visibleComposition:{seed:1},language:'en',setup,reducedMotion:{matches:false},effectMode,visualOnly:false,pulses:Array(8).fill(0),syncMotion:motionMode!==0,scene,phrase:sandbox.HaloMotion.phraseAt(1)});
  assert.equal(nodes.length,8);
 }
});

test('GPU world programs are lazy, cached, recovered and released without a rendering loop',()=>{
 const events={},calls=[];const gl=new Proxy({canvas:{width:0,height:0},getShaderParameter:()=>true,getProgramParameter:()=>true,isContextLost:()=>false,getAttribLocation:()=>0,getUniformLocation:()=>1},
 {get(target,key){if(key in target)return target[key];return (...args)=>{calls.push([key,...args]);return {}}}});
 const canvas={width:0,height:0,getContext:()=>gl,addEventListener:(k,fn)=>{events[k]=fn},removeEventListener:k=>delete events[k]};gl.canvas=canvas;
 const sandbox={devicePixelRatio:2,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/worlds/renderer.js'),'utf8'),sandbox);
 const r=sandbox.HaloWorldRenderer.create(canvas),builds=()=>calls.filter(c=>c[0]==='createProgram').length;
 assert.equal(builds(),0);r.resize(1000,800,.9);assert.equal(gl.canvas.width,900);
 r.setTexture('water',{width:1024,height:512});assert.equal(calls.filter(c=>c[0]==='texImage2D').length,1);
 r.render('water',Water.shader,{tm:1,splashLane0:[.2,.3,0,1.2]});r.render('water',Water.shader,{tm:2});assert.equal(builds(),1);assert.ok(calls.some(c=>c[0]==='uniform4f'));
 r.render('space','source',{});assert.equal(builds(),2);
 events.webglcontextlost({preventDefault(){}});events.webglcontextrestored();r.render('water',Water.shader,{});assert.equal(builds(),3);assert.equal(calls.filter(c=>c[0]==='texImage2D').length,2);
 r.dispose();assert.deepEqual(Object.keys(events),[]);assert.equal(r.render('water',Water.shader,{}),false);
 assert.equal(calls.filter(c=>c[0]==='deleteTexture').length,1);
});

test('local sky loads only for an active GPU world, resolves under a Pages prefix and uploads once',()=>{
 const images=[],uploads=[];
 class Image{constructor(){images.push(this)}set src(value){this.url=value;assert.equal(this.crossOrigin,'anonymous','CORS mode must be set before HTTP src')}}
 const sandbox={HaloWaterSplashes:require('../src/worlds/water-splashes.js'),HaloWaterMotion:require('../src/worlds/water-motion.js'),HaloWaterStones:require('../src/worlds/water-stones.js'),Image,URL,document:{currentScript:{src:'https://example.test/repository/src/worlds/water.js'}},console};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/worlds/water.js'),'utf8'),sandbox);
 const world=sandbox.HaloWaterWorld,renderer={gl:{},setTexture:(...args)=>uploads.push(args)};
 assert.equal(images.length,0);world.prepare({gl:null});assert.equal(images.length,0);
 world.prepare(renderer);world.prepare(renderer);assert.equal(images.length,1);assert.equal(images[0].url,'https://example.test/repository/assets/water/arctic-sky.png');
 images[0].complete=true;images[0].naturalWidth=1024;images[0].onload();world.prepare(renderer);assert.equal(uploads.length,1);
});


test('direct file sky lazily loads byte-identical packaged PNG and retries a deferred GPU upload',()=>{
 const images=[],scripts=[],uploads=[];
 class Image{constructor(){images.push(this)}set src(v){this.url=v}}
 const sandbox={HaloWaterSplashes:require('../src/worlds/water-splashes.js'),HaloWaterMotion:require('../src/worlds/water-motion.js'),HaloWaterStones:require('../src/worlds/water-stones.js'),Image,URL,console,document:{currentScript:{src:'file:///C:/HALO/src/worlds/water.js'},createElement:()=>({remove(){this.removed=true}}),head:{appendChild:s=>scripts.push(s)}}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/worlds/water.js'),'utf8'),sandbox);
 let ready=false;const renderer={gl:{},setTexture(...args){if(!ready)return false;uploads.push(args);return true}};
 sandbox.HaloWaterWorld.prepare({gl:null});assert.equal(scripts.length,0);
 sandbox.HaloWaterWorld.prepare(renderer);sandbox.HaloWaterWorld.prepare(renderer);assert.equal(scripts.length,1);
 assert.equal(scripts[0].src,'file:///C:/HALO/assets/water/arctic-sky.data.js');assert.equal(images[0].url,undefined);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/water/arctic-sky.data.js'),'utf8'),sandbox);
 const data=sandbox.HaloWaterSkyDataURL;assert.deepEqual(Buffer.from(data.split(',')[1],'base64'),fs.readFileSync(path.join(__dirname,'../assets/water/arctic-sky.png')));
 scripts[0].onload();assert.equal(scripts[0].removed,true);assert.equal(sandbox.HaloWaterSkyDataURL,undefined);assert.equal(images[0].url,data);
 images[0].complete=true;images[0].naturalWidth=1774;images[0].onload();assert.equal(uploads.length,0);
 ready=true;sandbox.HaloWaterWorld.prepare(renderer);sandbox.HaloWaterWorld.prepare(renderer);assert.equal(uploads.length,1);
});

test('failed sky uploads dispose the new GPU texture while retaining the previous valid sky',()=>{
 const calls=[];let reject=false,next=0;
 const gl=new Proxy({createTexture:()=>++next,isContextLost:()=>false,texImage2D(){if(reject)throw Error('cross-origin image')}},{get(t,k){if(k in t)return t[k];return (...args)=>{calls.push([k,...args]);return {}}}});
 const canvas={getContext:()=>gl,addEventListener(){},removeEventListener(){}};
 const sandbox={console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/worlds/renderer.js'),'utf8'),sandbox);
 const r=sandbox.HaloWorldRenderer.create(canvas);r.setTexture('water',{});reject=true;
 assert.throws(()=>r.setTexture('water',{}),/cross-origin/);
 assert.deepEqual(calls.filter(c=>c[0]==='deleteTexture').map(c=>c[1]),[2]);r.dispose();
 assert.deepEqual(calls.filter(c=>c[0]==='deleteTexture').map(c=>c[1]),[2,1]);
});
