const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app() {
  const elements = new Map(), events = {}, calls = [], timers = [];
  function element(id) {
    const classes = new Set(), children = [];
    const el = { id, children, value: 50, textContent: '', style: { setProperty() {} },
      classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
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
    setInterval(fn) { timers.push(fn); return timers.length; }, clearInterval() {}, setTimeout() {}, clearTimeout() {},
    addEventListener(){}, AudioContext:function(){return ctx} };
  sandbox.window=sandbox;
  sandbox.HaloSounds=require('../src/sounds.js');
  sandbox.HaloMotion=require('../src/motion.js');
  sandbox.HaloAudio={ create(ctx,tracks) { return {ctx,update:i=>calls.push(['update',i]),
    play:(i,notes,time,v,patch)=>calls.push(['play',i,notes,time,patch.id])}; } };
  vm.createContext(sandbox);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  vm.runInContext(code,sandbox);
  return { document, elements, events, calls, timers, ctx };
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
  a.ctx.currentTime=20; a.timers[0]();
  assert.ok(a.calls.filter(c=>c[0]==='play').slice(before).every(c=>c[3]>=20));
  await $('play').onclick(); assert.equal($('transportTitle').textContent,'UNIVERSE PAUSED');
  await $('play').onclick(); assert.equal($('transportTitle').textContent,'YOUR UNIVERSE IS ALIVE');
});
