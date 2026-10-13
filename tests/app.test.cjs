const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app(storage) {
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
  const ctx = { currentTime: 0, resume: async()=>{}, suspend:async()=>{} };
  const sandbox = { document, console, Math, Float32Array, performance:{now:()=>0},
    innerWidth:1200,innerHeight:800,devicePixelRatio:1, requestAnimationFrame() {},
    setInterval(fn) { timers.push(fn); return timers.length; }, clearInterval() {}, setTimeout(fn,ms) {timeouts.push({fn,ms});return timeouts.length}, clearTimeout() {},
    addEventListener(){}, AudioContext:function(){return ctx} };
  sandbox.window=sandbox;sandbox.confirm=()=>false;sandbox.location={reload(){calls.push(['reload'])}};
  sandbox.HaloSounds=require('../src/sounds.js');
  sandbox.HaloMotion=require('../src/motion.js');
  sandbox.HaloEffects=require('../src/effects.js');
  sandbox.HaloComposition=require('../src/composition.js');
  sandbox.HaloProject=require('../src/project.js');
  sandbox.HaloI18n=require('../src/i18n.js');
  sandbox.HaloProducts=[{name:'test',en:'description',ru:'описание',url:'https://example.com'}];
  sandbox.HaloPreferences=require('../src/preferences.js');
  sandbox.localStorage=storage||{getItem(){return null},setItem(){}};
  sandbox.HaloAudio={ create(ctx,tracks) { return {ctx,update:i=>calls.push(['update',i]),
    play:(i,notes,time,v,patch)=>calls.push(['play',i,notes,time,patch.id])}; } };
  vm.createContext(sandbox);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  vm.runInContext(code,sandbox);
  return { document, elements, events, calls, timers, ctx, sandbox, timeouts };
}
test('static entry references local scripts, all eight tiles and role-specific editors work',()=>{
  const a=app(), tiles=a.document.getElementById('tracks');
  assert.equal(tiles.children.length,8);
  tiles.children[4].oncontextmenu({preventDefault(){}});
  const buttons=a.document.getElementById('types').children;
  assert.equal(buttons.length,6); assert.equal(buttons[0].textContent,'Shaker');
  buttons[2].click(); assert.equal(a.document.getElementById('typeLabel').textContent,'Drops');
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const match of html.matchAll(/<script src="([^"]+)"/g)) {
    assert.ok(match[1].startsWith('./')); assert.ok(fs.existsSync(path.join(__dirname,'..',match[1])));
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
