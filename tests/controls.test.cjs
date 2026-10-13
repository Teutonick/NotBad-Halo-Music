const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/controls.js');
function control(type='number',value='16'){
 const handlers={},events=[],classes=new Set();let captured;
 const el={type,value,disabled:false,events,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
  addEventListener:(name,fn)=>handlers[name]=fn,dispatchEvent:e=>events.push(e.type),focus(){},
  setPointerCapture:id=>captured=id,hasPointerCapture:id=>captured===id,releasePointerCapture(){captured=null},
  getBoundingClientRect:()=>({left:0,width:100}),
  event(name,extra={}){const e={type:name,button:0,pointerType:'mouse',pointerId:1,clientX:50,clientY:50,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...extra};handlers[name]?.(e);return e}};
 return el;
}
test('numeric parsing rejects overflow, injection, whitespace and disallowed steps',()=>{
 const spec={min:0,max:100,step:1};
 for(const value of ['',' ',' 50','50 ','NaN','Infinity','1e2','0x20','1e999999999','999999999999999','<img onerror=alert(1)>','50.5','-1','101','1\n',{},null,50])assert.throws(()=>C.parse(value,spec));
 for(const value of ['0','1','100'])assert.equal(C.parse(value,spec),Number(value));
 assert.equal(C.parse('72.25',{min:30,max:200,step:.01}),72.25);
 assert.throws(()=>C.parse('3',{values:[1,2,4]}));
 for(const s of [{min:0,max:NaN},{min:Infinity,max:100},{min:0,max:100,step:-1}])assert.throws(()=>C.parse('1',s));
 for(const n of [NaN,Infinity,-Infinity])assert.equal(C.snap(n,spec),0);
});
test('horizontal and vertical drags change stepwise values and clamp huge pointer distances',()=>{
 const el=control();C.install(el,{min:4,max:32,step:1});
 el.event('pointerdown');el.event('pointermove',{clientX:74});assert.equal(el.value,'19');assert.deepEqual(el.events,['change']);
 el.event('pointermove',{clientX:1e8});assert.equal(el.value,'32');
 el.event('pointermove',{clientX:-1e8});assert.equal(el.value,'4');
 el.event('pointerup');const click=el.event('click');assert.equal(click.prevented,true);
 el.event('pointerdown');el.event('pointermove',{clientY:26});assert.equal(el.value,'7');
 el.event('pointercancel');el.event('pointermove',{clientY:-100});assert.equal(el.value,'7');
 el.event('pointerdown');el.event('pointermove',{clientY:74});assert.equal(el.value,'4');
});
test('range click keeps absolute selection; drags are relative, disabled/touch remain native',()=>{
 const el=control('range','50');C.install(el,{min:0,max:100,step:1});
 el.event('pointerdown');el.event('pointerup',{clientX:80});assert.equal(el.value,'80');assert.deepEqual(el.events,['input']);
 el.event('pointerdown');el.event('pointermove',{clientY:34});assert.equal(el.value,'82');el.event('pointerup');
 el.disabled=true;el.event('pointerdown');el.event('pointermove',{clientX:-200});assert.equal(el.value,'82');
 el.disabled=false;const touch=el.event('pointerdown',{pointerType:'touch'});assert.equal(touch.prevented,undefined);el.event('pointermove',{clientX:200});assert.equal(el.value,'82');
 el.value='NaN';el.event('pointerdown');el.event('pointermove');assert.equal(el.value,'NaN');
});
test('fractional BPM precision, discrete grids, dynamic offset and pointer identities remain bounded',()=>{
 const bpm=control('text','72.25');C.install(bpm,{min:30,max:200,step:.01,dragStep:1});bpm.event('pointerdown');bpm.event('pointermove',{clientX:58});assert.equal(bpm.value,'73.25');
 const grid=control('select-one','1');C.install(grid,{values:[1,2,4]});grid.event('pointerdown');grid.event('pointermove',{clientX:66});assert.equal(grid.value,'4');grid.event('pointermove',{clientX:58});assert.equal(grid.value,'2');
 let max=15;const offset=control('number','12');C.install(offset,()=>({min:0,max,step:1}));offset.event('pointerdown');max=6;offset.event('pointermove',{clientX:58});assert.equal(offset.value,'6');
 offset.event('pointermove',{pointerId:2,clientX:-100});assert.equal(offset.value,'6');offset.event('lostpointercapture');offset.event('pointermove',{clientX:-100});assert.equal(offset.value,'6');
});
