const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('floating panel drag and keyboard movement clamp to the viewport and preserve hidden positions',()=>{
 const handlers={},events={},handle={addEventListener(k,fn){handlers[k]=fn},setPointerCapture(){}};
 const el={hidden:false,style:{},querySelector(){return handle},addEventListener(){},getBoundingClientRect(){return {left:parseFloat(this.style.left)||50,top:parseFloat(this.style.top)||80,width:200,height:100}}};
 const sandbox={window:{innerWidth:800,innerHeight:600,addEventListener(k,fn){events[k]=fn}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../src/windows.js'),'utf8'),sandbox);sandbox.HaloWindows.setup([el]);
 handlers.keydown({target:handle,key:'ArrowRight',preventDefault(){}});assert.equal(el.style.left,'62px');assert.equal(el.style.position,'fixed');
 handlers.pointerdown({target:{closest(){return null}},clientX:72,clientY:90,pointerId:1,preventDefault(){}});
 handlers.pointermove({clientX:1000,clientY:1000});assert.equal(el.style.left,'600px');assert.equal(el.style.top,'500px');handlers.pointerup();
 el.hidden=true;sandbox.window.innerWidth=300;events.resize();assert.equal(el.style.left,'600px');el.hidden=false;events.resize();assert.equal(el.style.left,'100px');
});
