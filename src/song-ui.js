(function(root){
 'use strict';
 root.HaloSongUI={install(env){
  const S=root.HaloSong,$=id=>document.getElementById(id),key='halo-composition-v1';
  let song=null,index=0,mode=false,preview=false,lastSection=-1,timer=null,ended=false,queued=null,stepOffset=0,lastScheduledStep=-1;
  const tr=(ru,en)=>env.language()==='ru'?ru:en;
  const barLabel=n=>n+(env.language()==='ru'?' '+(n%100>=11&&n%100<=14?'тактов':n%10===1?'такт':n%10>=2&&n%10<=4?'такта':'тактов'):' bars');
  const names={intro:['Вступление','Intro'],verse:['Куплет','Verse'],verse2:['Куплет 2','Verse 2'],chorus:['Припев','Chorus'],bridge:['Бридж','Bridge'],outro:['Финал','Outro'],phrase:['Фраза','Phrase']};
  const bottom=document.querySelector('.bottom'),tracks=$('tracks');
  const dock=document.createElement('div');dock.className='song-dock';bottom.insertBefore(dock,tracks);
  const tabs=document.createElement('div');tabs.className='song-tabs';
  const instrumentsButton=document.createElement('button'),compositionButton=document.createElement('button');tabs.append(instrumentsButton,compositionButton);dock.append(tabs);
  const panel=document.createElement('div');panel.className='song-panel';panel.hidden=true;dock.append(panel,tracks);
  const blocks=document.createElement('div');blocks.className='song-blocks';panel.append(blocks);
  const status=document.createElement('small');status.className='song-status';panel.append(status);
  let drag=null;
  const fail=e=>env.toast(tr('Не удалось: ','Could not complete: ')+(root.HaloI18n?.translate(e.message,env.language())||e.message));
  function element(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el}
  function action(parent,cls,text,label,run){const b=element('button',cls,text);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.onclick=async e=>{e?.stopPropagation();try{await run()}catch(error){fail(error)}};parent.append(b);return b}
  function commit(){if(song&&!preview){const p=env.snapshot();if(p.setup!==S.phrase(song,index).setup)return;const next=S.copy(song);next.phrases.find(p=>p.id===next.sections[index].phrase).project=p;next.tempo=p.tempo;next.masterVolume=p.masterVolume;next.mix=S.copy(p.mix);song=S.validate(next,root.HaloProject,root.HaloSounds)}}
  function settings(){return env.settings?env.settings():env.snapshot()}
  function snapshotPhrase(n,value=song){const p=S.copy(S.phrase(value,n));p.tempo=value.tempo;p.masterVolume=value.masterVolume;p.mix=S.copy(value.mix);return p}
  function persist(){if(env.resetting())return;try{commit();if(song&&preview){const common=settings();song.tempo=common.tempo;song.masterVolume=common.masterVolume;song.mix=S.copy(common.mix);}localStorage.setItem(key,JSON.stringify({song,mode,index}));}catch(e){env.toast(tr('Композиция не сохранена: ','Composition was not saved: ')+(root.HaloI18n?.translate(e.message,env.language())||e.message))}}
  async function select(n,saveFirst=true){queued=null;stepOffset=0;lastScheduledStep=-1;if(saveFirst)commit();const p=snapshotPhrase(n);await env.load(p);preview=false;index=n;lastSection=-1;ended=false;render();persist()}
  function sectionStart(n){return song.sections.slice(0,n).reduce((steps,section,i)=>steps+S.phrase(song,i).bars*16*section.repeats,0)}
  async function choose(n){
   if(mode&&song&&env.isPlaying?.()&&!ended){
    const safeStep=Math.max(0,lastScheduledStep,Math.ceil(env.playhead?.()??0)-1),current=S.at(song,safeStep+stepOffset);
    if(current){queued={index:n,step:safeStep+current.project.bars*16-current.local};render();return}
   }
   await select(n);
  }
  async function move(from,to){
   if(from===to||to<0||to>=song.sections.length)return;
   commit();const selected=song.sections[index],moved=song.sections.splice(from,1)[0];song.sections.splice(to,0,moved);await select(song.sections.indexOf(selected),false);blocks.children[to]?.querySelector?.('.song-grip')?.focus?.();
  }
  function clearDrag(){if(!drag)return;drag.card.style.transform='';drag.card.style.pointerEvents='';drag.card.classList.remove('dragging');Array.from(blocks.children).forEach(b=>b.classList.remove('drop-target'));drag=null}
  function grip(card,i){
   const handle=action(card,'song-grip','⠿',tr('Перетащить часть · Alt + стрелки','Drag section · Alt + arrow keys'),()=>{});
   handle.onkeydown=e=>{if(e.altKey&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();return move(i,i+(e.key==='ArrowLeft'?-1:1)).catch(fail)}};
   handle.onpointerdown=e=>{if(e.button!==0||drag)return;e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId);drag={from:i,to:i,x:e.clientX,y:e.clientY,card,handle,moved:false};card.classList.add('dragging')};
   handle.onpointermove=e=>{if(!drag||drag.handle!==handle)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)<6&&!drag.moved)return;drag.moved=true;card.style.transform='translate('+dx+'px,'+Math.max(-12,Math.min(12,dy))+'px)';card.style.pointerEvents='none';const rect=blocks.getBoundingClientRect();if(e.clientX<rect.left+28)blocks.scrollLeft-=14;else if(e.clientX>rect.right-28)blocks.scrollLeft+=14;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-section]');if(target&&blocks.contains(target)){drag.to=Number(target.dataset.section);Array.from(blocks.children).forEach(b=>b.classList.toggle('drop-target',b===target))}};
   handle.onpointerup=e=>{if(!drag||drag.handle!==handle)return;const {from,to,moved}=drag;clearDrag();if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);if(moved)return move(from,to).catch(fail)};
   handle.onpointercancel=clearDrag;handle.onlostpointercapture=clearDrag;
  }
  async function build(){commit();song=S.validate(S.build(env.snapshot()),root.HaloProject,root.HaloSounds);await select(0,false)}
  async function add(){commit();const p=env.snapshot();if(!song){song=S.validate({format:'halo-composition',version:1,tempo:p.tempo,phrases:[{id:1,project:p}],sections:[{phrase:1,name:'phrase',repeats:1,fade:'none'}]},root.HaloProject,root.HaloSounds)}else{const next=S.copy(song),id=Math.max(...next.phrases.map(p=>p.id))+1;next.phrases.push({id,project:p});next.sections.push({phrase:id,name:'phrase',repeats:1,fade:'none'});song=S.validate(next,root.HaloProject,root.HaloSounds)}await select(song.sections.length-1,false)}
  async function duplicate(i,independent){commit();song=S.validate(S.duplicate(song,i,independent),root.HaloProject,root.HaloSounds);await select(i+1,false)}
  async function remove(i){if(song.sections.length===1)return;commit();const chosen=song.sections[index];song.sections.splice(i,1);song.phrases=song.phrases.filter(p=>song.sections.some(s=>s.phrase===p.id));await select(chosen===undefined||!song.sections.includes(chosen)?Math.min(i,song.sections.length-1):song.sections.indexOf(chosen),false)}
  function repeats(i,value){try{commit();const next=S.copy(song);next.sections[i].repeats=value;song=S.validate(next,root.HaloProject,root.HaloSounds);persist();render()}catch(e){fail(e);render()}}
  function render(){
   if(drag)return;
   tracks.hidden=mode;panel.hidden=!mode;bottom.classList.toggle('composition-view',mode);document.body?.classList.toggle('song-view',mode);
   for(const [b,label,active] of [[instrumentsButton,tr('Инструменты','Instruments'),!mode],[compositionButton,tr('Композиция','Composition'),mode]]){b.setAttribute('aria-label',label);b.title=label;b.setAttribute('aria-pressed',String(active))}
   instrumentsButton.textContent='‹ ≋';compositionButton.textContent='▤ ›';
   blocks.replaceChildren();
   if(song){song.sections.forEach((section,i)=>{
    const p=S.phrase(song,i),label=names[section.name][env.language()==='ru'?0:1],card=element('article','song-block');card.dataset.section=String(i);card.style.setProperty('--section-tone',({intro:'#80baca',verse:'#b29dcf',chorus:'#dcac78',bridge:'#83b9a9',outro:'#80baca',phrase:'#abc8d9'})[section.name]);card.setAttribute('aria-label',label);card.setAttribute('data-selected',String(i===index));card.setAttribute('data-queued',String(i===queued?.index));card.setAttribute('aria-current',String(i===lastSection));if(i===queued?.index)card.title=tr('Следующая фраза после текущей','Next phrase after the current one');
    const active=p.tracks.reduce((n,t)=>n+(t.on?t.steps.length/(p.bars*16):0),0);card.style.setProperty('--full',Math.round(active/8*100)+'%');
    grip(card,i);
    const removeButton=action(card,'song-remove','×',tr('Удалить часть','Remove section')+' · '+label,()=>remove(i));removeButton.disabled=song.sections.length===1;
    card.onclick=e=>{if(!e?.target?.closest('button'))return choose(i).catch(fail)};
    const open=action(card,'song-open',label,tr('Выбрать фразу','Select phrase')+' · '+label,()=>choose(i));open.setAttribute('aria-pressed',String(i===index));
    const meta=element('span','song-bars',barLabel(p.bars*section.repeats));card.append(meta);
    const foot=element('div','song-card-footer');card.append(foot);
    const counter=element('div','song-repeat');foot.append(counter);
    const minus=action(counter,'song-count','−',tr('Меньше повторов','Fewer repeats')+' · '+label,()=>repeats(i,section.repeats-1));minus.disabled=section.repeats===1;
    const value=element('span','song-repeat-value','×'+section.repeats);value.title=tr('Повторы фразы','Phrase repeats');value.setAttribute('aria-label',tr('Повторы фразы: ','Phrase repeats: ')+section.repeats);counter.append(value);
    const plus=action(counter,'song-count','+',tr('Больше повторов','More repeats')+' · '+label,()=>repeats(i,section.repeats+1));plus.disabled=section.repeats===8;
    action(foot,'song-icon','+',tr('Повторить фразу','Repeat phrase')+' · '+label,()=>duplicate(i,false));
    action(foot,'song-icon','⧉',tr('Создать вариацию','Create variation')+' · '+label,()=>duplicate(i,true));
    blocks.append(card);
   });
    const seconds=Math.round(S.bars(song)*240/song.tempo);status.textContent=barLabel(S.bars(song))+' · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · '+song.tempo+' BPM';
   }else status.textContent=tr('Один луп → целая история','One loop → a complete story');
   const addCard=element('div','song-add-card'+(!song?' song-empty':''));blocks.append(addCard);
   action(addCard,'song-add','+',tr('Добавить текущую фразу','Add current phrase'),add);
   const buildButton=action(addCard,'song-build'+(song?' song-rebuild':''),song?'✧':tr('Собрать композицию','Build composition'),tr('Собрать композицию из текущей фразы','Build composition from current phrase'),build);
   if(queued)status.textContent+=' · '+tr('Далее: ','Next: ')+names[song.sections[queued.index].name][env.language()==='ru'?0:1];
   const hint=document.querySelector('.bottom .hint');if(hint)hint.hidden=mode;
  }
  instrumentsButton.onclick=async()=>{try{if(preview)await select(index);mode=false;render();persist()}catch(e){fail(e)}};
  compositionButton.onclick=async()=>{try{if(song)await select(index);mode=true;render();persist()}catch(e){fail(e)}};
  const save=$('saveProject').onclick,share=$('shareProject').onclick;
  $('saveProject').onclick=()=>{try{if(!song)return save();commit();env.download(new Blob([JSON.stringify(S.validate(song,root.HaloProject,root.HaloSounds),null,2)],{type:'application/json'}),'halo-composition.json');persist()}catch(e){env.toast(e.message)}};
  $('projectFile').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>S.MAX_BYTES)throw Error('Composition exceeds size limit');const text=await file.text(),data=JSON.parse(text);if(data.format!=='halo-composition'){const p=root.HaloProject.parse(text,root.HaloSounds);await env.load(p);song=null;mode=false;preview=false;render();persist();return}const next=S.parse(text,root.HaloProject,root.HaloSounds);await env.load(snapshotPhrase(0,next));song=next;preview=false;index=0;mode=true;render();persist()}catch(e){env.toast(e.message)}};
  $('shareProject').onclick=async()=>{if(!song)return share();try{commit();const token=await root.HaloProject.encodeShare(S.validate(song,root.HaloProject,root.HaloSounds));const url=location.href.split('#')[0]+'#song='+token;if(url.length>24000)throw Error(tr('Ссылка слишком длинная; сохраните JSON','Link is too long; save JSON instead'));if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);else window.prompt(tr('Скопируйте ссылку','Copy link'),url);env.toast(tr('Ссылка на композицию скопирована','Composition link copied'))}catch(e){env.toast(e.message)}};
  function portable(){commit();if(!song)return null;const next=S.copy(song),common=settings();next.tempo=common.tempo;next.masterVolume=common.masterVolume;next.mix=common.mix;return next}
  document.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(persist,400)});
  document.addEventListener('click',e=>{if(tabs.contains(e.target)||panel.contains(e.target))return;clearTimeout(timer);timer=setTimeout(()=>{persist();render()},400)});
  window.addEventListener('pagehide',persist);
  try{const text=localStorage.getItem(key);if(text&&text.length<S.MAX_BYTES){const data=JSON.parse(text);song=data.song?S.validate(data.song,root.HaloProject,root.HaloSounds):null;index=song&&Number.isInteger(data.index)&&data.index>=0&&data.index<song.sections.length?data.index:0;mode=data.mode===true;}}catch(e){env.toast(tr('Не удалось восстановить композицию','Could not restore composition'))}
  if(song)env.load(snapshotPhrase(index)).catch(e=>env.toast(e.message));
  const hash=location.hash.match(/^#song=([^&]+)/);if(hash)root.HaloProject.decodeShare(hash[1],root.HaloSounds).then(async value=>{const next=S.validate(value,root.HaloProject,root.HaloSounds);await env.load(snapshotPhrase(0,next));song=next;index=0;mode=true;preview=false;window.history?.replaceState(null,'',location.href.split('#')[0]);render();persist()}).catch(e=>env.toast(e.message));
  render();
  return {generated(){if(!song)return;const n=preview&&lastSection>=0?lastSection:index,next=S.copy(song);next.phrases.find(p=>p.id===next.sections[n].phrase).project=env.snapshot();song=S.validate(next,root.HaloProject,root.HaloSounds);index=n;queued=null;lastSection=-1;render();persist()},beforePlay(){if(mode&&song&&ended){ended=false;lastSection=-1;stepOffset=0;lastScheduledStep=-1;queued=null;env.rewind()}else if(mode&&song&&!preview){commit();env.rewind()}},portable,render,visualGain(step){if(!mode||!song)return 1;const e=S.at(song,Math.floor(step)+stepOffset);if(!e)return .2;return .2+.8*e.gain*e.project.tracks.filter(t=>t.on).length/8},active:()=>mode&&!!song,tick(time,step,audio){
   if(!mode||!song)return false;
   if(!preview){commit();preview=true;lastSection=-1}
   lastScheduledStep=step;
   if(queued&&step>=queued.step){stepOffset=sectionStart(queued.index)-queued.step;index=queued.index;queued=null;lastSection=-1;render();persist()}
   const event=S.at(song,step+stepOffset);if(!event){if(!ended){ended=true;env.finish(time)}return true}
   const p=event.project;
   audio.master?.gain.setTargetAtTime(settings().masterVolume/100*event.gain,time,.05);
   if(event.index!==lastSection){env.setTracks(p);lastSection=event.index;Array.from(blocks.children).forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.section)===event.index)));env.tracks.forEach((t,i)=>audio.update(i,time));}
   env.tracks.forEach((t,i)=>{const clock=t.generator===3?event.absolute:event.local;if(!root.HaloSounds.shouldTrigger(t,i,clock,p.seed,p.bars))return;audio.play(i,root.HaloSounds.notesFor(t,i,Math.floor(event.local/16),event.local%16,p.seed,root.HaloComposition.offsets[p.key],p.bars,clock),time,root.HaloSounds.velocityFor(t,i,clock,p.seed,p.bars)*event.gain,root.HaloSounds.soundFor(t));env.pulse(i,time)});return true;
  }};
 }};
})(globalThis);
