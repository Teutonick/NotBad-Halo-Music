const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/project.js'),S=require('../src/sounds.js'),M=require('../src/motion.js'),Prefs=require('../src/preferences.js');
const tracks=Object.keys(S.banks).map(name=>({name,sound:S.banks[name].sounds[0].id,on:true,level:65,density:70,character:50,duration:50,space:55,pattern:[0,4,8,12]}));
const snapshot=()=>({version:1,project:P.capture(tracks,8,72,3,4,S,M),ui:{scene:2,motionMode:2,richEffects:true,autoEvolve:false,autoKey:true},manual:tracks.map(()=>null),draft:tracks.map(()=>[0,127]),selected:4,editTrack:2,windows:[{id:'editor',left:90,top:50}]});
test('autosave roundtrip preserves independent modes, complete settings and edit drafts',()=>{
 const saved=Prefs.parse(JSON.stringify(snapshot()),P,S);assert.equal(saved.project.tempo,72);assert.equal(saved.ui.scene,2);assert.equal(saved.ui.autoKey,true);assert.equal(saved.ui.autoEvolve,false);assert.deepEqual(saved.draft[2],[0,127]);assert.equal(saved.editTrack,2);
});
test('autosave rejects malformed modes, overlong files and unsafe draft steps',()=>{
 const value=snapshot();for(const broken of [{...value,ui:{...value.ui,scene:99}},{...value,draft:[[999]]},{...value,manual:[]},{...value,version:2}])assert.throws(()=>Prefs.validate(broken,P,S));
 assert.throws(()=>Prefs.parse(' '.repeat(65537),P,S));
});
