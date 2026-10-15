const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/project.js'),S=require('../src/sounds.js'),M=require('../src/motion.js'),Prefs=require('../src/preferences.js');
const tracks=Object.keys(S.banks).map(name=>({name,sound:S.banks[name].sounds[0].id,on:true,level:65,density:70,character:50,duration:50,space:55,pattern:[0,4,8,12]}));
const snapshot=()=>({version:1,project:P.capture(tracks,8,72,3,4,S,M),ui:{scene:2,motionMode:2,richEffects:true,autoEvolve:false,autoKey:true},manual:tracks.map(()=>null),draft:tracks.map(()=>[0,127]),selected:4,editTrack:2,windows:[{id:'editor',left:90,top:50}]});
test('inactive worlds are validated, allowlisted and flattened without nested world graphs',()=>{
 const value=snapshot(),rock=snapshot();rock.project=P.capture(tracks.map(t=>({...t,setup:'reactor',sound:S.reactorBanks[t.name].sounds[0].id})),8,100,2,0,S,M);rock.worlds={untrusted:snapshot()};value.worlds={reactor:rock,unknown:rock};
 const result=Prefs.parse(JSON.stringify(value),P,S);assert.deepEqual(Object.keys(result.worlds),['reactor']);assert.equal(result.worlds.reactor.worlds,undefined);
 assert.throws(()=>Prefs.validate({...value,worlds:{ambient:rock}},P,S));
});
test('autosave roundtrip preserves independent modes, complete settings and edit drafts',()=>{
 const saved=Prefs.parse(JSON.stringify(snapshot()),P,S);assert.equal(saved.project.tempo,72);assert.equal(saved.ui.scene,2);assert.equal(saved.ui.autoKey,true);assert.equal(saved.ui.autoEvolve,false);assert.deepEqual(saved.draft[2],[0,127]);assert.equal(saved.editTrack,2);
});
test('autosave rejects malformed modes, overlong files and unsafe draft steps',()=>{
 const value=snapshot();for(const broken of [{...value,ui:{...value.ui,scene:99}},{...value,draft:[[999]]},{...value,manual:[]},{...value,version:2}])assert.throws(()=>Prefs.validate(broken,P,S));
 assert.throws(()=>Prefs.parse(' '.repeat(65537),P,S));
});
test('locale, product card and master volume persist while old preferences remain compatible',()=>{
 const value=snapshot();value.ui.language='ru';value.ui.promoIndex=3;value.project.masterVolume=25;
 const saved=Prefs.parse(JSON.stringify(value),P,S);assert.equal(saved.ui.language,'ru');assert.equal(saved.ui.promoIndex,3);assert.equal(saved.project.masterVolume,25);
 assert.equal(Prefs.validate(snapshot(),P,S).ui.language,null);
});
test('phrase panel position and stacking survive a validated preference roundtrip',()=>{
 const value=snapshot();value.ui.windowOrder=['editor','patternEditor','storageInfo','phraseGuide'];value.windows.push({id:'phraseGuide',left:120,top:480});
 const saved=Prefs.parse(JSON.stringify(value),P,S);assert.equal(saved.ui.windowOrder[3],'phraseGuide');assert.deepEqual(saved.windows[1],{id:'phraseGuide',left:120,top:480});
});
test('visual-only preference persists and older autosaves default to visible controls',()=>{
 const value=snapshot();value.ui.visualOnly=true;assert.equal(Prefs.parse(JSON.stringify(value),P,S).ui.visualOnly,true);assert.equal(Prefs.validate(snapshot(),P,S).ui.visualOnly,false);
});
test('effectMode persists across classic, cosmic and hyper and preserves legacy boolean',()=>{
 const value=snapshot();value.ui.effectMode=2;assert.equal(Prefs.parse(JSON.stringify(value),P,S).ui.effectMode,2);assert.equal(Prefs.parse(JSON.stringify(value),P,S).ui.richEffects,true);
 value.ui.effectMode=0;assert.equal(Prefs.parse(JSON.stringify(value),P,S).ui.effectMode,0);assert.equal(Prefs.parse(JSON.stringify(value),P,S).ui.richEffects,false);
 const legacy=snapshot();delete legacy.ui.effectMode;legacy.ui.richEffects=true;
 assert.equal(Prefs.validate(legacy,P,S).ui.effectMode,1);assert.equal(Prefs.validate(legacy,P,S).ui.richEffects,true);
});
test('background-audio preference persists and older autosaves default to disabled',()=>{
 const value=snapshot();value.ui.backgroundAudio=true;assert.equal(Prefs.parse(JSON.stringify(value),P,S).ui.backgroundAudio,true);assert.equal(Prefs.validate(snapshot(),P,S).ui.backgroundAudio,false);
});



test('workspace folds and the fifth floating input window survive reload independently',()=>{
 const value=snapshot();Object.assign(value.ui,{workstationCollapsed:true,track09Compact:true,audioInputOpen:true,windowOrder:['editor','patternEditor','storageInfo','phraseGuide','audioInputWindow']});
 value.windows.push({id:'audioInputWindow',left:240,top:160});
 const saved=Prefs.parse(JSON.stringify(value),P,S);
 for(const key of ['workstationCollapsed','track09Compact','audioInputOpen']){assert.equal(saved.ui[key],true);assert.equal(Prefs.validate(snapshot(),P,S).ui[key],false);}
 assert.equal(saved.ui.windowOrder[4],'audioInputWindow');assert.deepEqual(saved.windows[1],{id:'audioInputWindow',left:240,top:160});
});
