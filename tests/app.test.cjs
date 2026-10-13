const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app(storage, options = {}) {
  const elements = new Map(), events = {}, calls = [], timers = [], timeouts = [];
  function element(id) {
    const classes = new Set(), children = [];
    const el = { id, children, value: 50, textContent: '', style: { setProperty() {} },
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains:x=>classes.has(x) },
      setAttribute(k,v) { this[k] = v; }, append(x) { children.push(x); }, focus() {},
      addEventListener(k,v) { this[k] = v; }, click() { this.onclick?.(); },
      getContext: kind => kind === 'webgl2' ? null : {setTransform() {}}, getBoundingClientRect: () => ({left:0,top:0,width:1200,height:800}) };
    Object.defineProperty(el,'innerHTML',{ set(v) { children.length=0; },get() { return ''; } });
    return el;
  }
  const document = { getElementById(id) { if(!elements.has(id)) elements.set(id,element(id)); return elements.get(id); },
    createElement: () => element(''), addEventListener(k,v) { events[k] = v; } };
  const ctx = { currentTime: 0, resume: async()=>{}, suspend:async()=>{},close:async()=>{} };
  const sandbox = { document, console, Math, Float32Array, TextEncoder, TextDecoder: globalThis.TextDecoder,
    CompressionStream: globalThis.CompressionStream, DecompressionStream: globalThis.DecompressionStream, URL: globalThis.URL,
    performance:{now:()=>0},
    innerWidth:1200,innerHeight:800,devicePixelRatio:1, requestAnimationFrame() {},
    setInterval(fn) { timers.push(fn); return timers.length; }, clearInterval() {}, setTimeout(fn,ms) {timeouts.push({fn,ms});return timeouts.length}, clearTimeout() {},
    addEventListener(k,v) { events[k] = v; }, AudioContext:function(){return ctx} };
  const initialHash = options.hash || (storage && storage.initialHash) || '';
  sandbox.window=sandbox;sandbox.confirm=()=>false;
  sandbox.location={reload(){calls.push(['reload'])},hash:initialHash,href:'https://teutonick.github.io/NotBad-Halo-Music/'+initialHash,origin:'https://teutonick.github.io',pathname:'/NotBad-Halo-Music/',search:''};
  sandbox.history={replaceState(st,ti,u){sandbox.location.href=u;const m=u.match(/#.*/);sandbox.location.hash=m?m[0]:'';calls.push(['replaceState',u]);}};
  sandbox.navigator={clipboard:{writeText:async text=>calls.push(['clipboard',text])}};
  sandbox.HaloSounds=require('../src/sounds.js');
  sandbox.HaloSamples={load:async()=>{},prepare:async()=>({})};
  sandbox.HaloMotion=require('../src/motion.js');
  sandbox.HaloEffects=require('../src/effects.js');
  sandbox.HaloComposition=require('../src/composition.js');
  sandbox.HaloProject=require('../src/project.js');
  sandbox.HaloControls=require('../src/controls.js');
  sandbox.HaloI18n=require('../src/i18n.js');
  sandbox.HaloProducts=[{name:'test',en:'description',ru:'описание',url:'https://example.com'}];
  sandbox.HaloPreferences=require('../src/preferences.js');
  sandbox.localStorage=storage||{getItem(){return null},setItem(){}};
  sandbox.HaloAudio={ create(ctx,tracks) { return {ctx,setSamples(){},update:i=>calls.push(['update',i]),
    play:(i,notes,time,v,patch)=>calls.push(['play',i,notes,time,patch.id])}; } };
  vm.createContext(sandbox);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  vm.runInContext(code,sandbox);
  return { document, elements, events, calls, timers, ctx, sandbox, timeouts };
}

test('musical worlds preserve sounds, generated/manual identity and drafts across switches and reload',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const a=app(storage),$=id=>a.document.getElementById(id);
 $('motion').onclick();$('motion').onclick();$('editPattern').onclick();$('stepGrid').children[1].click();
 $('setupSwitch').onclick();assert.equal($('bpmInput').value,'100');
 $('tracks').children[7].oncontextmenu({preventDefault(){}});assert.equal($('types').children.length,4);$('types').children[2].click();
 $('bpmInput').onchange({target:{value:'112'}});$('editPattern').onclick();$('stepGrid').children[3].click();
 $('setupSwitch').onclick();assert.equal($('bpmInput').value,'72');assert.equal($('patternEditor').hidden,false);
 $('setupSwitch').onclick();assert.equal($('bpmInput').value,'112');assert.equal($('typeLabel').textContent,'Analog arpeggio');assert.equal($('patternEditor').hidden,false);
 a.timeouts.find(t=>t.ms===250).fn();const saved=JSON.parse(data.get('notbad-halo-autosave-v1'));
 assert.equal(saved.project.setup,'reactor');assert.equal(saved.worlds.ambient.project.setup,'ambient');assert.equal(saved.manual.every(t=>t===null),true);
 const b=app(storage),get=id=>b.document.getElementById(id);assert.equal(get('bpmInput').value,'112');get('setupSwitch').onclick();assert.equal(get('bpmInput').value,'72');assert.equal(get('patternEditor').hidden,false);
});

test('reactor GENERATE clears all manual tracks and replaces every displayed phrase rhythm',()=>{
 const data=new Map(),a=app({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}),$=id=>a.document.getElementById(id);
 $('setupSwitch').onclick();
 const read=()=>{a.timeouts.filter(t=>t.ms===250).at(-1).fn();return JSON.parse(data.get('notbad-halo-autosave-v1')).project;};
 $('motion').onclick();$('motion').onclick();$('editPattern').onclick();$('savePattern').onclick();
 const before=read();$('regen').onclick();const after=read();
 assert.ok(JSON.parse(data.get('notbad-halo-autosave-v1')).manual.every(t=>t===null));
 assert.equal(after.seed,before.seed+1);
 for(let i=0;i<8;i++)assert.notDeepEqual(after.tracks[i].steps,before.tracks[i].steps);
});

test('EQ and stereo width persist and survive switching musical worlds',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},a=app(storage),$=id=>a.document.getElementById(id);
 for(const [id,value] of [['eqLow',5],['eqMid',-2],['eqHigh',3],['stereoWidth',80]])$(id).oninput({target:{value:String(value)}});
 $('setupSwitch').onclick();assert.equal($('stereoWidth').value,'80');
 a.timeouts.filter(t=>t.ms===250).at(-1).fn();
 const project=JSON.parse(data.get('notbad-halo-autosave-v1')).project;assert.deepEqual(project.mix,{low:5,mid:-2,high:3,width:80});
 const b=app(storage);assert.equal(b.document.getElementById('eqLow').value,'5');assert.equal(b.document.getElementById('stereoWidth').value,'80');
 assert.ok($('eqCurve').d.includes('14'));
 $('eqLow').oninput({target:{value:'100'}});assert.equal($('eqLow').value,'5');
});

test('compatible instruments can move between orbits and mappings survive autosave and world switching',()=>{
 for(const reactor of [false,true]){
  const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},a=app(storage),$=id=>a.document.getElementById(id);
  if(reactor)$('setupSwitch').onclick();
  $('tracks').children[0].oncontextmenu({preventDefault(){}});
  assert.ok($('instrumentBank').children.length>0);
  $('instrumentBank').onchange({target:{value:reactor?'VEIL':'ROOT'}});
  assert.equal($('instrumentBank').value,reactor?'VEIL':'ROOT');
  assert.equal($('typeLabel').textContent,reactor?'Palm mute':'Round bass');
  assert.notEqual($('ensembleName').textContent,'Legacy phrase');
  $('instrumentBank').onchange({target:{value:'unknown'}});assert.equal($('instrumentBank').value,reactor?'VEIL':'ROOT');
  a.timeouts.filter(t=>t.ms===250).at(-1).fn();const saved=JSON.parse(data.get('notbad-halo-autosave-v1'));
  assert.equal(saved.project.tracks[0].instrument,reactor?'VEIL':'ROOT');assert.equal(saved.project.tracks[0].generator,3);
  assert.equal(new Set(saved.project.tracks.map(t=>t.name)).size,8);
  const b=app(storage);b.document.getElementById('tracks').children[0].oncontextmenu({preventDefault(){}});
  assert.equal(b.document.getElementById('instrumentBank').value,reactor?'VEIL':'ROOT');
  $('setupSwitch').onclick();$('setupSwitch').onclick();assert.equal($('instrumentBank').value,reactor?'VEIL':'ROOT');
 }
});

test('new phrases drive the live scheduler on eight bars and retain old projects until explicit regeneration',async()=>{
 const a=app(),$=id=>a.document.getElementById(id),S=a.sandbox.HaloSounds;
 $('setupSwitch').onclick();$('bars').onclick();$('tracks').children[0].oncontextmenu({preventDefault(){}});$('instrumentBank').onchange({target:{value:'MOSS'}});
 await $('play').onclick();
 for(let now=.1;now<19.1;now+=.04){a.ctx.currentTime=now;a.timers[1]()}
 const lead=a.calls.filter(c=>c[0]==='play'&&c[1]===0);assert.ok(lead.length>4);assert.ok(lead.every(c=>c[4]==='reactor-singing-lead'));
 const steps=lead.map(c=>Math.round((c[3]-.08)/.15));assert.ok(steps.some(step=>step>=64&&step<128));
 const legacy={name:'GLASS',sound:'reactor-palm-guitar',instrument:'VEIL',generator:1,setup:'reactor',on:true,level:60,density:100,character:50,duration:50,space:20};
 const tracks=Object.keys(S.banks).map(name=>({...legacy,name,instrument:name,sound:S.reactorBanks[name].sounds[0].id}));
 const project=a.sandbox.HaloProject.capture(tracks,4,100,4,0,S,a.sandbox.HaloMotion);
 project.tracks.forEach(t=>{delete t.generator;delete t.instrument});
 await $('projectFile').onchange({target:{files:[{size:5000,text:async()=>JSON.stringify(project)}]}});
 $('tracks').children[0].oncontextmenu({preventDefault(){}});assert.equal($('ensembleName').textContent,'Legacy phrase');
 $('regen').onclick();assert.notEqual($('ensembleName').textContent,'Legacy phrase');
});

test('GENERATE randomizes all slot sounds and tuning, preserves mute and master settings and restores results',()=>{
 for(const reactor of [false,true]){
  const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},a=app(storage),$=id=>a.document.getElementById(id);
  if(reactor)$('setupSwitch').onclick();
  $('tracks').children[0].onclick();$('eqLow').oninput({target:{value:'4'}});$('masterVolume').oninput({target:{value:'35'}});
  const read=()=>{a.timeouts.filter(t=>t.ms===250).at(-1).fn();return JSON.parse(data.get('notbad-halo-autosave-v1')).project;};
  const before=read();$('regen').onclick();const after=read();
  assert.deepEqual(after.mix,before.mix);assert.equal(after.tempo,before.tempo);assert.equal(after.key,before.key);assert.equal(after.masterVolume,35);
  for(let i=0;i<8;i++){
   assert.equal(after.tracks[i].on,before.tracks[i].on);assert.notEqual(after.tracks[i].sound,before.tracks[i].sound);
   for(const field of ['character','duration','density','level','space'])assert.ok(after.tracks[i][field]>=20&&after.tracks[i][field]<=100);
  }
  const b=app(storage);b.timeouts.filter(t=>t.ms===250).at(-1)?.fn();
  b.document.getElementById('tracks').children[1].oncontextmenu({preventDefault(){}});
  assert.equal(b.document.getElementById('typeLabel').textContent,a.sandbox.HaloSounds.soundFor({...after.tracks[1],setup:after.setup}).name);
  assert.equal(b.document.getElementById('level').value,after.tracks[1].level);
 }
});

test('playing setup switches wait for an audio-clock bar and pause/resume remain functional',async()=>{
 const a=app(),$=id=>a.document.getElementById(id);await $('play').onclick();await $('setupSwitch').onclick();
 assert.equal($('bpmInput').value,'72');assert.equal($('setupSwitch')['aria-busy'],'true');
 for(let now=.1;now<3.5;now+=.05){a.ctx.currentTime=now;a.timers[1]()}
 assert.equal($('bpmInput').value,'100');assert.ok(a.calls.some(c=>c[0]==='play'&&c[4].startsWith('reactor-')));
 const rock=a.calls.filter(c=>c[0]==='play'&&c[4].startsWith('reactor-'));assert.ok(Math.abs(rock[0][3]-(.08+60/72*4))<.0001);
 $('setupSwitch').onclick();await $('play').onclick();assert.equal($('bpmInput').value,'72');await $('play').onclick();assert.equal($('transportTitle').textContent,'YOUR UNIVERSE IS ALIVE');
});

test('reactor project import selects its bank and preserves the previous ambient workspace',async()=>{
 const a=app(),$=id=>a.document.getElementById(id),S=a.sandbox.HaloSounds,P=a.sandbox.HaloProject,M=a.sandbox.HaloMotion;
 const tracks=Object.keys(S.banks).map(name=>({name,setup:'reactor',sound:S.reactorBanks[name].sounds[3].id,on:true,level:60,density:100,character:50,duration:40,space:15,pattern:[]}));
 const project=P.capture(tracks,8,110,2,1,S,M,25),file={size:5000,text:async()=>JSON.stringify(project)};
 await $('projectFile').onchange({target:{files:[file]}});assert.equal($('bpmInput').value,'110');assert.equal($('masterVolume').value,'25');
 $('tracks').children[7].oncontextmenu({preventDefault(){}});assert.equal($('typeLabel').textContent,'Cutting synth');assert.equal($('density').disabled,true);
 $('setupSwitch').onclick();assert.equal($('bpmInput').value,'72');assert.equal($('masterVolume').value,'25');
 $('setupSwitch').onclick();assert.equal($('bpmInput').value,'110');assert.equal($('typeLabel').textContent,'Cutting synth');
});
test('loading a live sample switch can be cancelled; a failure preserves ambient playback',async()=>{
 const a=app(),$=id=>a.document.getElementById(id);await $('play').onclick();let resolve;
 a.sandbox.HaloSamples.prepare=()=>new Promise(done=>resolve=done);
 const pending=$('setupSwitch').onclick();assert.equal($('setupSwitch')['aria-busy'],'true');await $('setupSwitch').onclick();resolve({});await pending;
 a.ctx.currentTime=3.5;a.timers[1]();assert.equal($('bpmInput').value,'72');assert.ok(a.calls.filter(c=>c[0]==='play').every(c=>!c[4].startsWith('reactor-')));
 a.sandbox.HaloSamples.prepare=async()=>{throw Error('Sample pack could not load')};await $('setupSwitch').onclick();assert.equal($('bpmInput').value,'72');assert.equal($('setupSwitch')['aria-busy'],'false');assert.equal($('toast').textContent,'Sample pack could not load');
});
test('sample start failure stays paused and retry does not introduce a synthesis substitute',async()=>{
 const a=app(),$=id=>a.document.getElementById(id);$('setupSwitch').onclick();a.sandbox.console={...console,error(){}};
 a.sandbox.HaloSamples.prepare=async()=>{throw Error('Sample audio could not decode')};await $('play').onclick();assert.equal(a.calls.filter(c=>c[0]==='play').length,0);assert.equal($('play').classList.contains('is-playing'),false);
 a.sandbox.HaloSamples.prepare=async()=>({});await $('play').onclick();assert.ok(a.calls.some(c=>c[0]==='play'&&c[4].startsWith('reactor-')));
});
test('static entry references local scripts, all eight tiles and role-specific editors work',()=>{
  const a=app(), tiles=a.document.getElementById('tracks');
  assert.equal(tiles.children.length,8);
  tiles.children[4].oncontextmenu({preventDefault(){}});
  const buttons=a.document.getElementById('types').children;
  assert.equal(buttons.length,2); assert.equal(buttons[0].textContent,'Round bass');
  buttons[1].click(); assert.equal(a.document.getElementById('typeLabel').textContent,'Deep tone');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const match of html.matchAll(/<script src="([^"]+)"/g)) {
    assert.ok(match[1].startsWith('./')); assert.ok(fs.existsSync(path.join(__dirname,'..',match[1].split('?')[0])));
  }
});
test('play, scenes, tuning, tile/keyboard mutes, pause/resume and delayed scheduler integrate',async()=>{
  const a=app(), $=id=>a.document.getElementById(id);
  await $('play').onclick(); assert.ok(a.calls.some(c=>c[0]==='play'));
  const before=a.calls.filter(c=>c[0]==='play').length;
  $('effects').onclick(); assert.equal($('effects').textContent,'CLASSIC');
  $('effects').onclick(); assert.equal($('effects').textContent,'COSMIC');
  assert.equal(a.calls.filter(c=>c[0]==='play').length,before);
  $('motion').onclick(); assert.equal($('motion').textContent,'IN TIME');
  assert.equal($('motion')['aria-pressed'],'true');
  $('motion').onclick(); assert.equal($('motion').textContent,'PHRASE');
  assert.equal($('phraseGuide').hidden,false);
  $('motion').onclick(); assert.equal($('motion').textContent,'DRIFT');
  assert.equal($('phraseGuide').hidden,true);
  assert.equal(a.calls.filter(c=>c[0]==='play').length,before);
  $('scene').onclick(); assert.equal($('sceneText').textContent,'BLOOM');
  $('scene').onclick(); assert.equal($('sceneText').textContent,'CURRENT');
  $('scene').onclick(); assert.equal($('sceneText').textContent,'ORBIT');
  assert.equal(a.calls.filter(c=>c[0]==='play').length,before);
  $('tracks').children[0].click(); assert.deepEqual(a.calls.at(-1),['update',0]);
  a.events.keydown({key:'2',target:{tagName:'BODY'}}); assert.deepEqual(a.calls.at(-1),['update',1]);
  $('tracks').children[2].onkeydown({key:'Enter',shiftKey:true,preventDefault(){}});
  for(const key of ['character','duration','space','level','density']) {
    $(key).oninput({target:{value:100}}); assert.equal($(key+'Label').textContent,'100%');
  }
  a.ctx.currentTime=20; a.timers[1]();
  assert.ok(a.calls.filter(c=>c[0]==='play').slice(before).every(c=>c[3]>=20));
  await $('play').onclick(); assert.equal($('transportTitle').textContent,'UNIVERSE PAUSED');
  await $('play').onclick(); assert.equal($('transportTitle').textContent,'YOUR UNIVERSE IS ALIVE');
});
test('default playback repeats the same events and pitches across complete loops',async()=>{
  const a=app();await a.document.getElementById('play').onclick();
  for(let now=.04;now<27;now+=.04){a.ctx.currentTime=now;a.timers[1]()}
  const loops=[[],[]],length=60/72*16;
  for(const c of a.calls.filter(c=>c[0]==='play')){
    const loop=Math.floor((c[3]-.08+.000001)/length);
    if(loop<2)loops[loop].push([c[1],Array.from(c[2]),c[4]]);
  }
  assert.ok(loops[0].length>10);assert.deepEqual(loops[0],loops[1]);
});
test('saving an edited draft disables only auto pattern and retains all eight exact tracks',()=>{
  const a=app(),$=id=>a.document.getElementById(id);
  $('patternEditor').hidden=true;
  $('bars').onclick();$('evolveAuto').onclick();$('keyAuto').onclick();
  $('editPattern').onclick();assert.equal($('stepGrid').children.length,128);
  $('stepGrid').children[127].click();$('savePattern').onclick();
  assert.equal($('evolveAuto').textContent,'AUTO RANDOM OFF');
  assert.equal($('keyAuto').textContent,'AUTO RANDOM ON');
  assert.equal($('patternEditor').hidden,true);
});
test('failed browser storage keeps the draft and automation state instead of claiming save success',()=>{
  const a=app({getItem(){return null},setItem(){throw Error('storage disabled')}}),$=id=>a.document.getElementById(id);
  $('patternEditor').hidden=true;$('evolveAuto').onclick();$('editPattern').onclick();$('savePattern').onclick();
  assert.equal($('patternEditor').hidden,false);assert.equal($('evolveAuto').textContent,'AUTO RANDOM ON');
  assert.match($('toast').textContent,/Could not save/);
});

test('workspace reset requires confirmation, clears storage and reloads, and retains state on failure',()=>{
 let clears=0;const a=app({getItem(){return null},setItem(){},clear(){clears++}}),reset=a.document.getElementById('resetWorkspace');
 reset.click();assert.equal(clears,0);assert.equal(a.calls.some(c=>c[0]==='reload'),false);
 a.sandbox.confirm=()=>true;reset.click();assert.equal(clears,1);assert.equal(a.calls.some(c=>c[0]==='reload'),true);
 const failed=app({getItem(){return null},setItem(){},clear(){throw Error('blocked')}});failed.sandbox.confirm=()=>true;failed.document.getElementById('resetWorkspace').click();
 assert.equal(failed.calls.some(c=>c[0]==='reload'),false);assert.match(failed.document.getElementById('toast').textContent,/Could not reset/);
});
test('compact promo disclosure collapses after eight seconds and supports manual closing',()=>{
 const a=app(),toggle=a.document.getElementById('promoToggle'),card=a.document.getElementById('productPromo');
 toggle.click();assert.equal(toggle['aria-expanded'],'true');assert.ok(card.classList.contains('promo-expanded'));
 a.timeouts.find(t=>t.ms===8000).fn();assert.equal(toggle['aria-expanded'],'false');
 toggle.click();toggle.click();assert.equal(toggle['aria-expanded'],'false');
});
test('visual-only mode suppresses music shortcuts and Escape restores controls without closing editors',()=>{
 const a=app(),button=a.document.getElementById('visualOnly');a.document.getElementById('patternEditor').hidden=false;
 button.click();assert.equal(button['aria-pressed'],'true');const before=a.document.getElementById('tracks').children[0]['aria-pressed'];
 a.events.keydown({key:'1',target:{tagName:'BODY'}});assert.equal(a.document.getElementById('tracks').children[0]['aria-pressed'],before);
 a.events.keydown({key:'Escape',target:{tagName:'BODY'},preventDefault(){}});assert.equal(button['aria-pressed'],'false');assert.equal(a.document.getElementById('patternEditor').hidden,false);
});

test('fixed role cycles survive generation, world switching and reload with compatible affinity sounds',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const a=app(storage),$=id=>a.document.getElementById(id);
 const read=()=>{a.timeouts.filter(t=>t.ms===250).at(-1).fn();return JSON.parse(data.get('notbad-halo-autosave-v1')).project};
 $('tracks').children[6].oncontextmenu({preventDefault(){}});
 $('cycleLength').onchange({target:{value:'7'}});$('stepLength').onchange({target:{value:'2'}});$('cycleOffset').onchange({target:{value:'3'}});
 let saved=read();assert.deepEqual(saved.tracks[6].sequence,{length:7,stepLength:2,offset:3});
 $('regen').onclick();saved=read();assert.deepEqual(saved.tracks[6].sequence,{length:7,stepLength:2,offset:3});
 for(const t of saved.tracks){assert.equal(t.generator,3);const sound=a.sandbox.HaloSounds.soundFor(t);assert.ok(sound.playback.affinityRoles.includes(t.role))}
 $('setupSwitch').onclick();$('setupSwitch').onclick();assert.equal($('cycleLength').value,'7');read();
 const b=app(storage);b.document.getElementById('tracks').children[6].oncontextmenu({preventDefault(){}});
 assert.equal(b.document.getElementById('cycleLength').value,'7');assert.equal(b.document.getElementById('stepLength').value,'2');assert.equal(b.document.getElementById('cycleOffset').value,'3');
});

test('all numeric UI handlers reject malformed, overflow and off-grid values without changing saved music',()=>{
 const data=new Map(),a=app({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}),$=id=>a.document.getElementById(id);
 $('tracks').children[6].oncontextmenu({preventDefault(){}});
 const read=()=>{a.timeouts.filter(t=>t.ms===250).at(-1).fn();return JSON.parse(data.get('notbad-halo-autosave-v1')).project};
 a.events.change();const before=read();
 for(const id of ['density','level','character','duration','space','masterVolume','eqLow','eqMid','eqHigh','stereoWidth','cycleLength','cycleOffset','stepLength','bpmInput']){
  const el=$(id),handler=el.oninput||el.onchange;
  for(const bad of ['','NaN','Infinity','1e99','<script>','9'.repeat(1000),'1.333','-999','999']){el.value=bad;handler({target:el});}
 }
 assert.deepEqual(read(),before);
 $('cycleOffset').value='3';$('cycleOffset').dispatchEvent=()=>{$('cycleOffset').onchange({target:$('cycleOffset')});a.events.change();};
 const event=(x,y)=>({button:0,pointerType:'mouse',pointerId:7,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
 $('cycleOffset').pointerdown(event(20,20));$('cycleOffset').pointermove(event(44,20));$('cycleOffset').pointerup(event(44,20));
 assert.equal(read().tracks[6].sequence.offset,6);
});

test('SHARE button generates compact hash link, and opening or hashchange restores full loop paused',async()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const a=app(storage),$=id=>a.document.getElementById(id);
 $('setupSwitch').onclick();
 $('bpmInput').onchange({target:{value:'115'}});
 $('masterVolume').oninput({target:{value:'42'}});
 $('tracks').children[0].onclick();
 assert.ok($('shareProject'));

 await $('shareProject').onclick();
 const clip=a.calls.find(c=>c[0]==='clipboard');
 assert.ok(clip,'copied link to clipboard');
 assert.ok(clip[1].includes('#loop='),'link contains #loop= hash');
 const token=clip[1].split('#loop=')[1];
 assert.ok(token.length>50&&token.length<1500,'token is within compact bounds');

 const b=app(storage,{hash:'#loop='+token});
 await new Promise(r=>setTimeout(r,50));
 const get=id=>b.document.getElementById(id);
 assert.equal(get('bpmInput').value,'115');
 assert.equal(get('masterVolume').value,'42');
 b.timeouts.filter(t=>t.ms===250).at(-1)?.fn();
 const saved=JSON.parse(data.get('notbad-halo-autosave-v1'));
 assert.equal(saved.project.setup,'reactor');
 assert.equal(saved.project.tempo,115);
 assert.equal(saved.project.masterVolume,42);
 assert.equal(b.document.getElementById('tracks').children[0]['aria-pressed'],'false');
 assert.equal(get('transportTitle').textContent,'UNIVERSE PAUSED');
});

test('editor mode switch toggles between SOUND and FX panes, and FX controls update audio and sync reverb',async()=>{
 const a=app(), $=id=>a.document.getElementById(id);
 await $('play').onclick();
 $('tracks').children[0].oncontextmenu({preventDefault(){}});
 assert.equal($('modeSound')['aria-selected'],'true');
 assert.equal($('paneSound').hidden,false);
 assert.equal($('paneFx').hidden,true);

 $('modeFx').onclick();
 assert.equal($('modeSound')['aria-selected'],'false');
 assert.equal($('modeFx')['aria-selected'],'true');
 assert.equal($('paneSound').hidden,true);
 assert.equal($('paneFx').hidden,false);

 $('fxReverb').oninput({target:{value:'75'}});
 assert.equal($('fxReverbLabel').textContent,'75%');
 assert.equal($('space').value,'75');
 assert.equal($('spaceLabel').textContent,'75%');
 assert.ok(a.calls.some(c=>c[0]==='update'&&c[1]===0));

 $('space').oninput({target:{value:'40'}});
 assert.equal($('spaceLabel').textContent,'40%');
 assert.equal($('fxReverb').value,'40');
 assert.equal($('fxReverbLabel').textContent,'40%');

 $('fxDelay').oninput({target:{value:'55'}});
 assert.equal($('fxDelayLabel').textContent,'55%');

 $('fxChorus').oninput({target:{value:'35'}});
 assert.equal($('fxChorusLabel').textContent,'35%');

 $('modeSound').onclick();
 assert.equal($('paneSound').hidden,false);
 assert.equal($('paneFx').hidden,true);
});

test('HaloAudio builds shared Delay (4 sync taps) and Chorus buses when createDelay is provided',()=>{
 const HaloAudio=require('../src/audio.js');
 const param=()=>({value:0,calls:[],setTargetAtTime(v,t,tau){this.calls.push([v,t,tau])}});
 const node=()=>({connect(){},disconnect(){},gain:param(),delayTime:param(),pan:param(),frequency:param(),Q:param()});
 const ctx={
   currentTime:0,sampleRate:44100,destination:node(),
   createGain:node,createDynamicsCompressor:()=>({threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}}),
   createStereoPanner:node,createConvolver:()=>({connect(){},buffer:null}),
   createBiquadFilter:node,createBuffer:(ch,len)=>({duration:len/44100,getChannelData:()=>new Float32Array(len)}),
   createDelay:()=>node(),createOscillator:()=>({frequency:param(),connect(){},start(){},stop(){}})
 };
 const tracks=[{name:'GLASS',sound:'glass-1',on:true,level:60,space:40,delay:50,delayTime:'1/8',chorus:30,character:50,duration:50}];
 const audio=HaloAudio.create(ctx,tracks,50,{},{low:0,mid:0,high:0,width:35},72);
 assert.ok(audio.delayTaps);
 assert.ok(audio.delayTaps['1/16']);
 assert.ok(audio.delayTaps['1/8']);
 assert.ok(audio.delayTaps['1/8d']);
 assert.ok(audio.delayTaps['1/4']);
 assert.equal(audio.delaySends.length,1);
 assert.equal(audio.chorusSends.length,1);
 assert.ok(Math.abs(audio.delayTaps['1/8'].delayTime.value - (60/72*0.5)) < 0.001);
 assert.ok(Math.abs(audio.delayTaps['1/16'].delayTime.value - (60/72*0.25)) < 0.001);
 assert.ok(Math.abs(audio.delayTaps['1/8d'].delayTime.value - (60/72*0.75)) < 0.001);
 assert.ok(Math.abs(audio.delayTaps['1/4'].delayTime.value - (60/72*1.0)) < 0.001);

 audio.setTempo(120, 1.0);
 assert.ok(audio.delayTaps['1/8'].delayTime.calls.length > 0);
 assert.ok(Math.abs(audio.delayTaps['1/8'].delayTime.calls.at(-1)[0] - (60/120*0.5)) < 0.001);
});
