const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Song=require('../src/song.js'),P=require('../src/project.js'),S=require('../src/sounds.js'),M=require('../src/motion.js');
function app(){
 const nodes=new Map(),events={},storage=new Map(),messages=[];let dropTarget=null;
 function node(tag){const classes=new Set();const n={tagName:(tag||'div').toUpperCase(),parent:null,children:[],dataset:{},style:{setProperty(){}},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x)},has:x=>classes.has(x)},append(...x){x.forEach(c=>{if(c&&typeof c==='object')c.parent=n});this.children.push(...x)},insertBefore(x){if(x&&typeof x==='object')x.parent=n;this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(k,v){this[k]=v},contains(x){return this===x||this.children.some(c=>c.contains(x))},getBoundingClientRect:()=>({left:0,right:900}),setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){},closest(sel){let cur=this;while(cur){if(sel==='[data-section]'&&cur.dataset?.section!==undefined)return cur;if((sel==='button'||sel.includes('button'))&&cur.tagName==='BUTTON')return cur;if((sel==='input'||sel.includes('input'))&&cur.tagName==='INPUT')return cur;cur=cur.parent}return null}};return n}
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 const doc={elementFromPoint:()=>dropTarget,getElementById:get,querySelector:selector=>get(selector==='.bottom'?'bottom':'hint'),createElement:node,addEventListener(k,f){events[k]=f}};
 const tracks=Object.keys(S.banks).map(name=>({name,sound:S.banks[name].sounds[0].id,on:true,level:65,density:70,character:50,duration:50,space:55,pattern:[0,4,8,12]}));
 let current=P.capture(tracks,4,81,2,0,S,M),reset=false;
 const env={language:()=> 'en',snapshot:()=>Song.copy(current),load:async p=>{current=Song.copy(p)},toast:s=>messages.push(s),download(){},tracks:[],pulse(){},setTracks(){},finish(){},rewind(){},resetting:()=>reset};
 const sandbox={document:doc,HaloSong:Song,HaloComposition:require('../src/composition.js'),HaloProject:P,HaloSounds:S,TextEncoder,Blob,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},location:{hash:'',href:'https://example.com/halo/'},navigator:{}};
 sandbox.window=sandbox;sandbox.addEventListener=(k,f)=>events[k]=f;vm.createContext(sandbox);vm.runInContext(fs.readFileSync('src/song-ui.js','utf8'),sandbox);const ui=sandbox.HaloSongUI.install(env);
 const dock=get('bottom').children[0],blocks=dock.children[1].children[0];
 const descendants=n=>n.children.flatMap(c=>[c,...descendants(c)]);
 return {ui,env,blocks,target:i=>dropTarget=blocks.children[i],click:async(label,i)=>{const parent=i===undefined?get('bottom'):blocks.children[i],b=descendants(parent).find(x=>x['aria-label']===label)||descendants(parent).find(x=>x['aria-label']?.startsWith(label));assert.ok(b,'Missing action '+label);await b.onclick()},select:async i=>blocks.children[i].onclick(),move:async(i,dir)=>blocks.children[i].children[0].onkeydown({altKey:true,key:dir,preventDefault(){}}),instruments:async()=>dock.children[0].children[0].onclick(),composition:async()=>dock.children[0].children[1].onclick(),saved:()=>JSON.parse(storage.get('halo-composition-v1')),current:()=>current,events,messages,name:(i,value)=>{const input=blocks.children[i].children.find(c=>c.className==='song-name-input');input.value=value;input.onkeydown({key:'Enter',stopPropagation(){},preventDefault(){}})},reset:()=>reset=true};
}
test('UI assembly keeps intro sparse; repeat and variation preserve reference semantics',async()=>{
 const a=app();await a.click('Build composition');assert.ok(a.current().tracks.filter(t=>t.on).length<8);assert.equal(a.saved().song.sections.length,8);
 await a.select(2);await a.click('Repeat phrase',2);let saved=a.saved();assert.equal(saved.song.sections[2].phrase,saved.song.sections[3].phrase);
 await a.click('Create variation',3);saved=a.saved();assert.notEqual(saved.song.sections[3].phrase,saved.song.sections[4].phrase);assert.equal(a.messages.length,0);
});
test('reordering and deleting sections do not overwrite another phrase with the selected snapshot',async()=>{
 const a=app();await a.click('Build composition');await a.select(2);const before=a.saved().song.phrases;
 await a.move(2,'ArrowLeft');assert.deepEqual(a.saved().song.phrases,before);await a.click('Remove section',1);assert.deepEqual(a.saved().song.phrases,before);assert.equal(a.messages.length,0);
});
test('workspace reset pagehide cannot resurrect the discarded composition',async()=>{
 const a=app();await a.click('Build composition');const before=a.saved();a.reset();a.events.pagehide();assert.deepEqual(a.saved(),before);
});

test('live scheduler applies section snapshots once and schedules on the supplied audio timestamp',async()=>{
 const a=app();await a.click('Build composition');const calls=[],updates=[],gains=[];
 a.env.setTracks=p=>{a.env.tracks=p.tracks.map(t=>({...t,setup:p.setup,manualSteps:t.steps,manualBars:p.bars}));S.arrange(a.env.tracks)};
 const audio={master:{gain:{setTargetAtTime:(...v)=>gains.push(v)}},update:(i,time)=>updates.push({i,time}),play:(i,notes,time,v)=>calls.push({i,notes,time,v})};
 assert.equal(a.ui.tick(7,0,audio),false);
 await a.composition();assert.equal(a.ui.tick(7,0,audio),true);assert.equal(updates.length,8);assert.equal(gains[0][1],7);
 a.ui.tick(7.2,1,audio);assert.equal(updates.length,8);a.ui.tick(19,64,audio);assert.equal(updates.length,16);assert.ok(calls.every(c=>Number.isFinite(c.v)&&c.time>=7));
});

test('in-card repeat controls validate bounds and retain linked phrase identity',async()=>{
 const a=app();await a.click('Build composition');const phrase=a.saved().song.sections[1].phrase,initial=a.saved().song.sections[1].repeats;
 await a.click('More repeats',1);assert.equal(a.saved().song.sections[1].repeats,initial+1);assert.equal(a.saved().song.sections[1].phrase,phrase);
 await a.click('Fewer repeats',1);assert.equal(a.saved().song.sections[1].repeats,initial);assert.equal(a.messages.length,0);
});
test('pointer drag commits order once, while cancellation preserves the saved composition',async()=>{
 const a=app();await a.click('Build composition');const before=a.saved().song.sections.map(s=>s.phrase),handle=a.blocks.children[0].children[0];
 handle.onpointerdown({button:0,pointerId:1,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});handle.onpointercancel();assert.deepEqual(a.saved().song.sections.map(s=>s.phrase),before);
 a.target(2);handle.onpointerdown({button:0,pointerId:1,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});handle.onpointermove({clientX:90,clientY:0});await handle.onpointerup({pointerId:1});const after=a.saved().song.sections.map(s=>s.phrase);assert.equal(after[2],before[0]);assert.equal(after[0],before[1]);assert.equal(a.saved().index,2);
});

function live(a){const states=[],notes=[],calls={loads:0,finishes:0};let running=true;const load=a.env.load;a.env.load=async p=>{calls.loads++;return load(p)};a.env.isPlaying=()=>running;a.env.playhead=()=>0;a.env.setTracks=p=>{states.push(p);a.env.tracks=p.tracks.map(t=>({...t,setup:p.setup,manualSteps:t.steps,manualBars:p.bars}));S.arrange(a.env.tracks)};a.env.finish=()=>calls.finishes++;const audio={master:{gain:{setTargetAtTime(){}}},update(){},play(i,pitches,time,v){notes.push({i,pitches,time,v})}};return {states,notes,calls,audio,pause:()=>running=false}}
test('phrase title queues the latest choice until current phrase boundary without loading/stopping or changing panels',async()=>{
 const a=app();await a.click('Build composition');await a.composition();const l=live(a);
 a.ui.tick(0,0,l.audio);a.ui.tick(2,20,l.audio);await a.select(3);await a.select(2);
 assert.equal(l.calls.loads,0);assert.equal(a.saved().mode,true);assert.equal(a.blocks.children[2]['data-queued'],'true');
 a.ui.tick(5,63,l.audio);assert.equal(l.states.length,1);a.ui.tick(5.2,64,l.audio);assert.equal(l.states.length,2);assert.equal(a.saved().index,2);assert.equal(l.calls.loads,0);assert.equal(l.calls.finishes,0);
 const target=Song.phrase(a.saved().song,2);assert.equal(JSON.stringify(l.states[1]),JSON.stringify(target));a.ui.tick(6,65,l.audio);assert.equal(l.states.length,2);
});
test('cue follows the phrase end inside repeated sections and skips missed boundaries deterministically',async()=>{
 const a=app();await a.click('Build composition');await a.composition();const l=live(a);a.ui.tick(0,80,l.audio);await a.select(4);assert.equal(l.calls.loads,0);
 a.ui.tick(1,127,l.audio);assert.equal(l.states.length,1);a.ui.tick(2,130,l.audio);const p=Song.phrase(a.saved().song,4),expected=p.tracks.flatMap((t,i)=>{const track={...t,setup:p.setup,manualSteps:t.steps,manualBars:p.bars};return S.shouldTrigger(track,i,2,p.seed,p.bars)?[{i,pitches:S.notesFor(track,i,0,2,p.seed,require('../src/composition.js').offsets[p.key],p.bars,2)}]:[]});assert.equal(JSON.stringify(l.notes.filter(n=>n.time===2).map(({i,pitches})=>({i,pitches}))),JSON.stringify(expected));assert.equal(a.saved().index,4);assert.equal(l.states.length,2);assert.equal(l.calls.finishes,0);
});
test('last unscheduled boundary remains eligible and paused selection keeps Composition open',async()=>{
 const a=app();await a.click('Build composition');await a.composition();const l=live(a);a.ui.tick(0,63,l.audio);await a.select(1);a.ui.tick(1,64,l.audio);assert.equal(a.saved().index,1);assert.equal(l.calls.loads,0);
 l.pause();await a.select(3);assert.equal(l.calls.loads,1);assert.equal(a.saved().mode,true);assert.equal(a.saved().index,3);
});

test('GENERATE replaces the sounding phrase without reverting to its old seed at the next tick',async()=>{
 const a=app();await a.click('Build composition');await a.composition();const l=live(a);a.ui.tick(0,0,l.audio);
 const originalSeed=a.saved().song.phrases[1].project.seed,newProject=a.current();newProject.seed+=7;newProject.tracks.forEach((t,i)=>{delete t.noteEvents;delete t.noteTranspose;t.on=i<4;t.delay=17});
 a.ui.generated();a.ui.tick(1,1,l.audio);assert.equal(l.states.at(-1).seed,newProject.seed);assert.equal(l.states.at(-1).tracks[0].delay,17);assert.equal(a.saved().song.phrases[1].project.seed,originalSeed);assert.equal(l.calls.loads,0);assert.equal(a.saved().mode,true);
});


test('panel switches preserve playback and phrase phase without loading or finishing',async()=>{
 const a=app();await a.click('Build composition');await a.composition();const l=live(a);a.ui.tick(0,80,l.audio);
 await a.instruments();assert.equal(a.saved().mode,false);assert.equal(l.calls.loads,0);assert.equal(a.ui.tick(1,81,l.audio),false);assert.equal(a.ui.phraseStep(81)%64,17);assert.equal(a.ui.phraseStep(145),a.ui.phraseStep(81));
 a.current().tracks[0].level=37;await a.composition();a.ui.tick(2,82,l.audio);assert.equal(a.saved().mode,true);assert.equal(l.calls.loads,0);assert.equal(l.calls.finishes,0);assert.equal(l.states.at(-1).tracks[0].level,37);assert.equal(a.saved().index,1);
});
 test('whole composition repeat wraps on audio clock and persists in portable JSON',async()=>{
 const a=app();await a.click('Build composition');await a.composition();await a.click('Repeat entire composition');const l=live(a),total=Song.bars(a.saved().song)*16;
 a.ui.tick(1,total-1,l.audio);a.ui.tick(2,total,l.audio);assert.equal(l.calls.finishes,0);assert.equal(a.saved().index,0);assert.equal(a.ui.portable().repeat,true);assert.equal(Song.parse(JSON.stringify(a.ui.portable()),P,S).repeat,true);
});

test('repeat button toggles phrase repeat in instruments mode and composition repeat in composition mode with independent states',async()=>{
 const a=app();
 assert.equal(a.ui.isPhraseRepeat(),true);
 await a.click('Build composition');
 assert.equal(a.ui.isCompositionRepeat(),false);

 await a.click('Repeat phrase');
 assert.equal(a.ui.isPhraseRepeat(),false);
 assert.equal(a.ui.isCompositionRepeat(),false);

 const l=live(a);
 a.ui.beforePlay();
 for(let s=0;s<64;s++){
  assert.equal(a.ui.tick(0.1*s,s,l.audio),false);
 }
 assert.equal(l.calls.finishes,0);
 assert.equal(a.ui.tick(6.4,64,l.audio),true);
 assert.equal(l.calls.finishes,1);

 await a.click('Repeat phrase');
 assert.equal(a.ui.isPhraseRepeat(),true);
 a.ui.beforePlay();
 for(let s=0;s<65;s++){
  assert.equal(a.ui.tick(0.1*s,s,l.audio),false);
 }
 assert.equal(l.calls.finishes,1);

 await a.composition();
 assert.equal(a.ui.isCompositionRepeat(),false);
 assert.equal(a.ui.isPhraseRepeat(),true);

 await a.click('Repeat entire composition');
 assert.equal(a.ui.isCompositionRepeat(),true);
 assert.equal(a.ui.isPhraseRepeat(),true);

 await a.instruments();
 assert.equal(a.ui.isPhraseRepeat(),true);
 assert.equal(a.ui.isCompositionRepeat(),true);
});


test('name clicks rename linked phrase, invalid names preserve state and new phrases have sequential numbers',async()=>{
 const a=app();await a.click('Build composition');await a.click('Rename phrase',2);a.name(2,'Тема1');assert.equal(a.saved().song.phrases.find(p=>p.id===a.saved().song.sections[2].phrase).label,'Тема1');
 await a.click('Rename phrase',2);a.name(2,'<img>');assert.equal(a.saved().song.phrases.find(p=>p.id===a.saved().song.sections[2].phrase).label,'Тема1');assert.equal(a.messages.length,1);
 await a.click('Add current phrase');const id=a.saved().song.sections.at(-1).phrase;assert.equal(id,7);assert.equal(a.blocks.children.at(-2)['aria-label'],'Select phrase · Phrase7');
});

test('phrase title click selects phrase, while pencil icon activates renaming',async()=>{
 const a=app();await a.click('Build composition');
 const card=a.blocks.children[2];
 const titleSpan=card.children.find(c=>c.className==='song-block-head')?.children.find(c=>c.className==='song-title');
 assert.ok(titleSpan,'Missing song-title span');
 await card.onclick({target:titleSpan});
 assert.equal(a.saved().index,2);
 assert.equal(a.blocks.children[2].children.some(c=>c.className==='song-name-input'),false);
 await a.click('Rename phrase',2);
 assert.equal(a.blocks.children[2].children.some(c=>c.className==='song-name-input'),true);
});

test('deleting a section prompts for confirmation and respects cancel or confirm',async()=>{
 const a=app();let confirmCalled=0,confirmResult=false;
 a.env.confirm=async(opts)=>{confirmCalled++;assert.match(opts.title,/Delete phrase|Удаление фразы/);return confirmResult;};
 await a.click('Build composition');
 const initialCount=a.saved().song.sections.length;
 confirmResult=false;
 await a.click('Remove section',1);
 assert.equal(confirmCalled,1);
 assert.equal(a.saved().song.sections.length,initialCount);
 confirmResult=true;
 await a.click('Remove section',1);
 assert.equal(confirmCalled,2);
 assert.equal(a.saved().song.sections.length,initialCount-1);
});

