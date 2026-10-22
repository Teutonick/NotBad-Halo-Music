const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function setup(saved,unavailable=false){
 const nodes=[],writes=[];
 function el(tag){const n={tag,children:[],handlers:{},append(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(k,f){this.handlers[k]=f},showModal(){this.open=true},close(){this.open=false},remove(){this.removed=true}};nodes.push(n);return n}
 const context={document:{createElement:el,createTextNode:text=>({text}),head:el('head'),body:el('body')},localStorage:{getItem(){if(unavailable)throw Error();return saved},setItem(k,v){if(unavailable)throw Error();writes.push([k,JSON.parse(v)])}},dispatchEvent(){},Event:class{}};
 vm.runInNewContext(fs.readFileSync('src/terms.js','utf8'),context);context.HaloTerms.init('ru');return {api:context.HaloTerms,nodes,writes};
}
test('terms block dismissal and require explicit checked acceptance, stored with version',()=>{
 const {api,nodes,writes}=setup(null),d=nodes.find(n=>n.tag==='dialog'),check=nodes.find(n=>n.tag==='input'),button=nodes.filter(n=>n.tag==='button').at(-1);
 assert.equal(api.KEY,'halo-terms-acceptance');
 assert.equal(api.isAccepted(),false);assert.equal(d.open,true);assert.equal(button.disabled,true);
 let prevented=false;d.handlers.cancel({preventDefault(){prevented=true}});assert.ok(prevented);
 prevented=false;d.handlers.keydown({key:'Escape',preventDefault(){prevented=true},stopPropagation(){}});assert.ok(prevented);
 button.onclick();assert.equal(api.isAccepted(),false);
 check.checked=true;check.onchange();assert.equal(button.disabled,false);button.onclick();
 assert.equal(api.isAccepted(),true);assert.equal(d.removed,true);assert.equal(writes[0][1].version,api.version);assert.ok(writes[0][1].acceptedAt);
});
test('current acceptance skips modal; old or malformed acceptance prompts again',()=>{
 for(const saved of [null,'bad',JSON.stringify({version:'old'})])assert.ok(setup(saved).nodes.some(n=>n.tag==='dialog'));
 assert.ok(!setup(JSON.stringify({version:'2026-10-18.1'})).nodes.some(n=>n.tag==='dialog'));
});
test('unavailable storage allows only in-memory acceptance and language switch resets checkbox',()=>{
 const {api,nodes}=setup(null,true);nodes.find(n=>n.tag==='button').onclick();
 const check=nodes.filter(n=>n.tag==='input').at(-1),button=nodes.filter(n=>n.tag==='button').at(-1);assert.equal(button.textContent,'Accept and open HALO');assert.equal(button.disabled,true);check.checked=true;button.onclick();assert.equal(api.isAccepted(),true);
});
