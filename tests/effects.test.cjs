const test=require('node:test');
const assert=require('node:assert/strict');
const {styles,reactorStyles,hyperStyles,draw,drawHyper}=require('../src/effects.js');
function canvas(){
  const calls=[];let balance=0;
  const ctx={save(){balance++},restore(){balance--},calls,get balance(){return balance}};
  for(const name of ['beginPath','closePath','moveTo','lineTo','arc','ellipse','rect','stroke','fill'])ctx[name]=(...args)=>{
    args.forEach(n=>assert.ok(Number.isFinite(n)));calls.push([name,...args]);
  }
  return ctx;
}
const position=a=>({x:700+200*Math.cos(a),y:430+150*Math.sin(a)});
test('reactor signatures remain bounded with Canvas fallback and reduced motion',()=>{
 assert.equal(new Set(reactorStyles.map(s=>s.name)).size,8);
 for(let i=0;i<8;i++)for(const small of [true,false]){
  const ctx=canvas(),later=canvas();draw(ctx,i,position,1,0,.8,'#ff7046',1,small,true,'reactor');draw(later,i,position,1,99,.8,'#ff7046',1,small,true,'reactor');
  assert.equal(ctx.balance,0);assert.ok(ctx.calls.length<900);assert.deepEqual(ctx.calls,later.calls);
 }
});
test('eight distinct signatures render finite, bounded paths with balanced Canvas state',()=>{
  assert.equal(new Set(styles.map(s=>s.name)).size,8);
  for(let i=0;i<8;i++)for(const small of [false,true])for(const reduced of [false,true]){
    const ctx=canvas();draw(ctx,i,position,2.2,100,.85,'#a4f6ef',.7,small,reduced);
    assert.equal(ctx.balance,0);assert.ok(ctx.calls.length<900);
  }
});
test('mobile and reduced-motion tiers lower draw workload; reduced decoration ignores wall time',()=>{
  for(let i=0;i<8;i++){
    const full=canvas(),small=canvas(),reduced=canvas(),later=canvas();
    draw(full,i,position,1,0,.8,'#a4f6ef',1,false,false);
    draw(small,i,position,1,0,.8,'#a4f6ef',1,true,false);
    draw(reduced,i,position,1,0,.8,'#a4f6ef',1,false,true);
    draw(later,i,position,1,99,.8,'#a4f6ef',1,false,true);
    assert.ok(small.calls.length<full.calls.length);
    assert.ok(reduced.calls.length<small.calls.length);
    assert.deepEqual(reduced.calls,later.calls);
  }
});
test('eight hyper signatures render bounded, distinct paths with balanced state and reduced-motion invariance',()=>{
  assert.equal(new Set(hyperStyles.map(s=>s.name)).size,8);
  for(let i=0;i<8;i++){
    const full=canvas(),small=canvas(),reduced=canvas(),later=canvas();
    drawHyper(full,i,position,1,0,.85,'#a4f6ef',1,false,false);
    drawHyper(small,i,position,1,0,.85,'#a4f6ef',1,true,false);
    drawHyper(reduced,i,position,1,0,.85,'#a4f6ef',1,false,true);
    drawHyper(later,i,position,1,99,.85,'#a4f6ef',1,false,true);
    assert.equal(full.balance,0);
    assert.equal(small.balance,0);
    assert.equal(reduced.balance,0);
    assert.ok(full.calls.length<1500);
    assert.ok(small.calls.length<full.calls.length);
    assert.ok(reduced.calls.length<small.calls.length);
    assert.deepEqual(reduced.calls,later.calls);
    const viaDraw=canvas();
    draw(viaDraw,i,position,1,0,.85,'#a4f6ef',1,false,false,'ambient','hyper');
    assert.deepEqual(viaDraw.calls,full.calls);
  }
});
