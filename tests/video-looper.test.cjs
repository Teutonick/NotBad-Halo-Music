const test=require('node:test');
const assert=require('node:assert/strict');
const Video=require('../src/video-looper.js');
const Project=require('../src/project.js');
const Song=require('../src/song.js');
const Sounds=require('../src/sounds.js');
const Motion=require('../src/motion.js');
const Preferences=require('../src/preferences.js');

test('absolute transport phase fits the same fragment across cycle count, meter and BPM changes',()=>{
 for(const bars of [1,2,4,8]){
  const settings={...Video.defaults,bars,in:1,out:5};
  for(const beatsPerBar of [3,4]){
   const cycle=beatsPerBar*bars;
   for(const bpm of [30,72.25,120,200]){
    const clock={beat:cycle*.375,bpm,beatsPerBar};
    const expected={position:2.5,rate:4*bpm/(60*cycle)};
    assert.deepEqual(Video.target(settings,clock,settings.out),expected);
    assert.deepEqual(Video.target(settings,{...clock,beat:clock.beat+cycle*1000000},settings.out),expected);
    assert.equal(Video.target(settings,{...clock,beat:cycle},settings.out).position,settings.in);
   }
  }
 }
});

test('project, composition and autosave keep only versioned settings and load legacy JSON',()=>{
 const tracks=Object.keys(Sounds.banks).map(name=>({
  name,sound:Sounds.banks[name].sounds[0].id,on:true,level:50,density:50,character:50,duration:50,space:50,pattern:[0,4,8,12]
 }));
 const legacy=Project.capture(tracks,4,120,1,0,Sounds,Motion);
 assert.deepEqual(Project.parse(JSON.stringify(legacy),Sounds),legacy);
 const settings={...Video.defaults,enabled:true,selected:true,sync:false,in:1.75,out:5,bars:8,volume:32,rate:1.5};
 const supplied={...settings,src:'https://example.invalid/video.mp4',fileName:'private.mp4',bytes:[1,2]};
 const withVideo=Project.parse(JSON.stringify({...legacy,videoLooper:supplied}),Sounds);
 assert.deepEqual(withVideo.videoLooper,settings);
 assert.deepEqual(withVideo.tracks,legacy.tracks);
 const song=Song.build(withVideo);
 const clean=Song.parse(JSON.stringify({...song,videoLooper:supplied}),Project,Sounds);
 assert.deepEqual(clean.videoLooper,settings);
 assert.ok(clean.phrases.every(({project})=>project.videoLooper===undefined));
 const preference={version:1,project:withVideo,ui:{scene:0,motionMode:0,effectMode:1,autoEvolve:false,autoKey:false,videoLooperOpen:true,videoLooperShow:true,windowOrder:['videoLooper']},manual:Array(8).fill(null),draft:null,windows:[{id:'videoLooper',left:24,top:58}]};
 const restored=Preferences.parse(JSON.stringify(preference),Project,Sounds);
 assert.deepEqual(restored.project.videoLooper,settings);
 assert.equal(restored.ui.videoLooperShow,true);
 assert.deepEqual(restored.windows,preference.windows);
});

test('video settings reject unbounded or unusable values',()=>{
 for(const patch of [
  {version:2},{enabled:1},{selected:'true'},{sync:'true'},{bars:3},{rate:0},{rate:4.01},{volume:101},
  {in:-1},{in:Infinity},{in:21600},{in:5,out:5.24},{out:21601},{out:'5'}
 ]){
  assert.throws(()=>Project.videoLooper({...Video.defaults,...patch}));
 }
 assert.equal(Project.videoLooper({...Video.defaults,in:4.75,out:5}).out,5);
 assert.equal(Project.videoLooper({...Video.defaults,in:21599.75}).out,null);
 assert.equal(Project.videoLooper(Video.defaults).selected,undefined);
 assert.equal(Project.videoLooper({...Video.defaults,selected:false}).selected,false);
});

test('video import asks for rights once, restores the local clip, and supports replacement and removal',async()=>{
 const nodes=new Map(),storage=new Map(),prompts=[];
 const element=()=>({
  hidden:false,value:'',textContent:'',paused:true,dataset:{},style:{setProperty(){}},
  append(child){child.parentNode=this},querySelectorAll(){return []},
  events:{},addEventListener(name,fn){this.events[name]=fn},dispatchEvent(event){this['on'+event.type]?.()},
  setAttribute(){},removeAttribute(){},load(){},remove(){}
 });
 const original={document:global.document,window:global.window,localStorage:global.localStorage,HaloControls:global.HaloControls};
 const file=Object.assign(new Blob(['test']),{name:'clip.webm'});
 const replacement=Object.assign(new Blob(['test']),{name:'replacement.mp4'});
 let accept=false,saved,media;
 const install=()=>Video.install({
  language:()=> 'ru',selected:()=>true,changed(){},
  clock:()=>({bpm:72,beatsPerBar:4}),confirm:async options=>{prompts.push(options);return accept},
  store:{read:async()=>saved,write:async file=>{saved=file}}
 });
 try{
  global.document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement(){return media={...element(),duration:12.346,videoWidth:100}},addEventListener(){}};
  global.window={addEventListener(){}};
  global.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
  global.HaloControls=require('../src/controls.js');
  const looper=install(),input=nodes.get('videoLooperFile'),name=nodes.get('videoLooperName');
  input.files=[file];
  await input.onchange();
  assert.equal(name.textContent,'');
  assert.equal(saved,undefined);
  assert.equal(storage.size,0);
  assert.match(prompts[0].title,/Права на видео/);
  accept=true;
  await input.onchange();
  assert.equal(name.textContent,file.name);
  assert.equal(prompts.length,2);
  looper.beforeAudioClose();
  const reloaded=install();
  await reloaded.restoreLocal();
  assert.equal(name.textContent,file.name);
  assert.equal(prompts.length,2);
  media.events.loadedmetadata();
  assert.equal(nodes.get('videoLooperFrame').hidden,false);
  const end=nodes.get('videoLooperOut');
  for(const invalid of ['<svg/onload=alert(1)>','1e9','9999999999999','12.35']){
   end.value=invalid;end.onchange();
   assert.equal(reloaded.snapshot().out,null);
   assert.equal(String(end.value),'12.34');
  }
  end.value='8,25';end.onchange();
  assert.equal(reloaded.snapshot().out,8.25);
  end.value='8.25';
  const pointer={pointerId:1,button:0,pointerType:'mouse',clientX:0,clientY:0,preventDefault(){}};
  end.events.pointerdown(pointer);
  end.events.pointermove({...pointer,clientX:16});
  end.events.pointerup(pointer);
  assert.equal(reloaded.snapshot().out,8.45);
  input.files=[replacement];
  await input.onchange();
  assert.equal(saved,replacement);
  assert.equal(name.textContent,replacement.name);
  nodes.get('videoLooperRemove').onclick();
  assert.equal(saved,null);
  assert.equal(name.textContent,'');
  const empty=install();
  await empty.restoreLocal();
  assert.equal(name.textContent,'');
  assert.equal(nodes.get('videoLooperRemove').disabled,true);
 }finally{
  Object.assign(global,original);
 }
});
