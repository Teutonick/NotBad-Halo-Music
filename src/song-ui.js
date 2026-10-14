(function(root){
 'use strict';
 root.HaloSongUI={install(env){
  const S=root.HaloSong,$=id=>document.getElementById(id),key='halo-composition-v1';
  let song=null,index=0,mode=false,preview=false,lastSection=-1,timer=null,ended=false,queued=null,stepOffset=0,lastScheduledStep=-1,phraseOffset=0,resetGain=false;
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
  const phraseCaption=element('span','current-phrase');document.querySelector('.transport-text')?.append(phraseCaption);
  let drag=null;
  function labelFor(i){const section=song.sections[i],p=song.phrases.find(p=>p.id===section.phrase);return p.label||(section.name==='phrase'?tr('Фраза','Phrase')+p.id:names[section.name][env.language()==='ru'?0:1])}
  function showPhrase(){phraseCaption.textContent=tr('Фраза: ','Phrase: ')+(song?labelFor(index):tr('Фраза','Phrase')+'1');phraseCaption.title=tr('Редактируемая фраза','Phrase being edited')}
  function rename(i){
   const id=song.sections[i].phrase,record=song.phrases.find(p=>p.id===id),card=blocks.children[i],button=Array.from(card.children).find(c=>c.className==='song-open');if(!button||card.querySelector?.('.song-name-input'))return;
   const input=element('input','song-name-input');input.type='text';input.maxLength=10;input.value=record.label||tr('Фраза','Phrase')+id;input.setAttribute('aria-label',tr('Имя фразы: 1–10 букв или цифр, без пробелов','Phrase name: 1–10 letters or digits, no spaces'));button.hidden=true;card.append(input);input.focus?.();input.select?.();let done=false;
   function finish(save){if(done)return;if(save){let label;try{label=S.phraseName(input.value)}catch(e){fail(e);input.focus?.();return}commit();const next=S.copy(song);next.phrases.find(p=>p.id===id).label=label;song=S.validate(next,root.HaloProject,root.HaloSounds);persist()}done=true;render()}
   input.onclick=e=>e.stopPropagation();input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}};input.onblur=()=>finish(false);
  }
  const fail=e=>env.toast(tr('Не удалось: ','Could not complete: ')+(root.HaloI18n?.translate(e.message,env.language())||e.message));
  function element(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el}
  function action(parent,cls,text,label,run){const b=element('button',cls,text);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.onclick=async e=>{e?.stopPropagation();try{await run()}catch(error){fail(error)}};parent.append(b);return b}
  function commit(){if(song&&!preview){const p=env.snapshot();if(p.setup!==S.phrase(song,index).setup)return;const next=S.copy(song);next.phrases.find(p=>p.id===next.sections[index].phrase).project=p;next.tempo=p.tempo;next.masterVolume=p.masterVolume;next.mix=S.copy(p.mix);song=S.validate(next,root.HaloProject,root.HaloSounds)}}
  function settings(){return env.settings?env.settings():env.snapshot()}
  function snapshotPhrase(n,value=song){const p=S.copy(S.phrase(value,n));p.tempo=value.tempo;p.masterVolume=value.masterVolume;p.mix=S.copy(value.mix);return p}
  function persist(){if(env.resetting())return;try{commit();if(song&&preview){const common=settings();song.tempo=common.tempo;song.masterVolume=common.masterVolume;song.mix=S.copy(common.mix);}localStorage.setItem(key,JSON.stringify({song,mode,index}));}catch(e){env.toast(tr('Композиция не сохранена: ','Composition was not saved: ')+(root.HaloI18n?.translate(e.message,env.language())||e.message))}}
  async function select(n,saveFirst=true){phraseOffset=0;queued=null;stepOffset=0;lastScheduledStep=-1;if(saveFirst)commit();const p=snapshotPhrase(n);await env.load(p);preview=false;index=n;lastSection=-1;ended=false;render();persist()}
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
   if(drag)return;showPhrase();
   tracks.hidden=mode;panel.hidden=!mode;bottom.classList.toggle('composition-view',mode);document.body?.classList.toggle('song-view',mode);
   for(const [b,label,active] of [[instrumentsButton,tr('Инструменты','Instruments'),!mode],[compositionButton,tr('Композиция','Composition'),mode]]){b.setAttribute('aria-label',label);b.title=label;b.setAttribute('aria-pressed',String(active))}
   instrumentsButton.textContent='‹ ≋';compositionButton.textContent='▤ ›';
   blocks.replaceChildren();panel.querySelector?.('.song-loop')?.remove();
   if(song){song.sections.forEach((section,i)=>{
    const p=S.phrase(song,i),label=labelFor(i),card=element('article','song-block');card.dataset.section=String(i);card.style.setProperty('--section-tone',({intro:'#80baca',verse:'#b29dcf',chorus:'#dcac78',bridge:'#83b9a9',outro:'#80baca',phrase:'#abc8d9'})[section.name]);card.setAttribute('aria-label',tr('Выбрать фразу','Select phrase')+' · '+label);card.tabIndex=0;card.onkeydown=e=>{if(e.target===card&&['Enter',' '].includes(e.key)){e.preventDefault();choose(i).catch(fail)}};card.setAttribute('data-selected',String(i===index));card.setAttribute('data-queued',String(i===queued?.index));card.setAttribute('aria-current',String(i===lastSection));if(i===queued?.index)card.title=tr('Следующая фраза после текущей','Next phrase after the current one');
    const active=p.tracks.reduce((n,t)=>n+(t.on?t.steps.length/(p.bars*16):0),0);card.style.setProperty('--full',Math.round(active/8*100)+'%');
    grip(card,i);
    const removeButton=action(card,'song-remove','×',tr('Удалить часть','Remove section')+' · '+label,()=>remove(i));removeButton.disabled=song.sections.length===1;
    card.onclick=e=>{if(!e?.target?.closest('button'))return choose(i).catch(fail)};
    const open=action(card,'song-open',label,tr('Переименовать фразу','Rename phrase')+' · '+label,()=>rename(i));open.setAttribute('aria-pressed',String(i===index));
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
   if(song){const repeat=action(panel,'song-loop','↻ REPEAT',tr('Повтор всей композиции','Repeat entire composition'),()=>{song.repeat=!song.repeat;persist();render()});repeat.setAttribute('aria-pressed',String(song.repeat===true));}
   if(queued)status.textContent+=' · '+tr('Далее: ','Next: ')+labelFor(queued.index);
   const hint=document.querySelector('.bottom .hint');if(hint)hint.hidden=mode;
  }
  instrumentsButton.onclick=()=>{try{if(!mode)return;if(preview&&lastSection>=0){const event=S.at(song,lastScheduledStep+stepOffset);index=lastSection;phraseOffset=(event?.project.startStep||0)+(event?.local||0)-Math.max(0,lastScheduledStep);}queued=null;preview=false;ended=false;resetGain=true;mode=false;render();persist()}catch(e){fail(e)}};
  compositionButton.onclick=()=>{try{if(mode)return;commit();if(song){const next=Math.max(0,lastScheduledStep+1,Math.ceil(env.playhead?.()??0)),length=S.phrase(song,index).bars*16,local=((next+phraseOffset)%length+length)%length;stepOffset=sectionStart(index)+local-next;preview=true;lastSection=-1;ended=false;queued=null;}mode=true;render();persist()}catch(e){fail(e)}};
  const save=$('saveProject').onclick,share=$('shareProject').onclick;
  $('saveProject').onclick=()=>{try{if(!song)return save();commit();env.download(new Blob([JSON.stringify(S.validate(song,root.HaloProject,root.HaloSounds),null,2)],{type:'application/json'}),'halo-composition.json');persist()}catch(e){env.toast(e.message)}};
  $('projectFile').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>S.MAX_BYTES)throw Error('Composition exceeds size limit');const text=await file.text(),data=JSON.parse(text);if(data.format!=='halo-composition'){const p=root.HaloProject.parse(text,root.HaloSounds);await env.load(p);song=null;mode=false;preview=false;render();persist();return}const next=S.parse(text,root.HaloProject,root.HaloSounds);await env.load(snapshotPhrase(0,next));song=next;preview=false;index=0;mode=true;render();persist()}catch(e){env.toast(e.message)}};
  $('shareProject').onclick=async()=>{if(!song)return share();try{commit();const token=await root.HaloProject.encodeShare(S.validate(song,root.HaloProject,root.HaloSounds));const url=location.href.split('#')[0]+'#song='+token;if(url.length>24000)throw Error(tr('Ссылка слишком длинная; сохраните JSON','Link is too long; save JSON instead'));if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);else window.prompt(tr('Скопируйте ссылку','Copy link'),url);env.toast(tr('Ссылка на композицию скопирована','Composition link copied'))}catch(e){env.toast(e.message)}};
  function portable(){commit();if(!song)return null;const next=S.copy(song),common=settings();next.tempo=common.tempo;next.masterVolume=common.masterVolume;next.mix=common.mix;return next}
  document.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(persist,400)});
  document.addEventListener('click',e=>{if(tabs.contains(e.target)||panel.contains(e.target))return;clearTimeout(timer);timer=setTimeout(()=>{persist();render()},400)});
  window.addEventListener('pagehide',persist);
  try{const text=localStorage.getItem(key);if(text&&text.length<S.MAX_BYTES&&new TextEncoder().encode(text).length<S.MAX_BYTES){const data=JSON.parse(text);song=data.song?S.validate(data.song,root.HaloProject,root.HaloSounds):null;index=song&&Number.isInteger(data.index)&&data.index>=0&&data.index<song.sections.length?data.index:0;mode=data.mode===true;}}catch(e){env.toast(tr('Не удалось восстановить композицию','Could not restore composition'))}
  if(song)env.load(snapshotPhrase(index)).catch(e=>env.toast(e.message));
  async function checkSharedSong(){const hash=location.hash;try{const shared=root.HaloProject.shareHash(hash);if(!shared||shared.kind!=='song')return;const value=await root.HaloProject.decodeShare(shared.token,root.HaloSounds);if(location.hash!==hash)return;const next=S.validate(value,root.HaloProject,root.HaloSounds);await env.load(snapshotPhrase(0,next));song=next;index=0;mode=true;preview=false;window.history?.replaceState(null,'',location.href.split('#')[0]);render();persist()}catch(e){env.toast(root.HaloI18n?.translate(e.message,env.language())||e.message)}}
  window.addEventListener('hashchange',checkSharedSong);checkSharedSong();
  render();
  return {phraseStep(step){if(mode||!song)return step;const p=S.phrase(song,index),length=p.bars*16;return p.startStep+((step+phraseOffset-p.startStep)%length+length)%length},generated(){if(!song)return;const n=preview&&lastSection>=0?lastSection:index,next=S.copy(song);next.phrases.find(p=>p.id===next.sections[n].phrase).project=env.snapshot();song=S.validate(next,root.HaloProject,root.HaloSounds);index=n;queued=null;lastSection=-1;render();persist()},beforePlay(){if(mode&&song&&ended){ended=false;lastSection=-1;stepOffset=0;lastScheduledStep=-1;queued=null;env.rewind()}else if(mode&&song&&!preview){commit();stepOffset=sectionStart(index);}},portable,render,visualGain(step){if(!mode||!song)return 1;const position=Math.floor(step)+stepOffset,e=S.at(song,song.repeat?position%(S.bars(song)*16):position);if(!e)return .2;return .2+.8*e.gain*e.project.tracks.filter(t=>t.on).length/8},active:()=>mode&&!!song,tick(time,step,audio){
   if(!mode||!song){lastScheduledStep=step;if(resetGain){audio.master?.gain.setTargetAtTime(settings().masterVolume/100,time,.05);resetGain=false;}return false;}
   if(!preview){commit();preview=true;lastSection=-1}
   lastScheduledStep=step;
   if(queued&&step>=queued.step){stepOffset=sectionStart(queued.index)-queued.step;index=queued.index;queued=null;lastSection=-1;render();persist()}
   let position=step+stepOffset;const total=S.bars(song)*16;if(song.repeat&&position>=total){stepOffset-=Math.floor(position/total)*total;position=step+stepOffset;lastSection=-1;}const event=S.at(song,position);if(!event){if(!ended){ended=true;env.finish(time)}return true}
   const p=event.project;
   audio.master?.gain.setTargetAtTime(settings().masterVolume/100*event.gain,time,.05);
   if(event.index!==lastSection){env.setTracks(p);lastSection=event.index;index=event.index;showPhrase();Array.from(blocks.children).forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.section)===event.index)));env.tracks.forEach((t,i)=>audio.update(i,time));}
   env.tracks.forEach((t,i)=>{const clock=t.generator===3?event.absolute:event.local;if(!root.HaloSounds.shouldTrigger(t,i,clock,p.seed,p.bars))return;audio.play(i,root.HaloSounds.notesFor(t,i,Math.floor(event.local/16),event.local%16,p.seed,root.HaloComposition.offsets[p.key],p.bars,clock),time,root.HaloSounds.velocityFor(t,i,clock,p.seed,p.bars)*event.gain,root.HaloSounds.soundFor(t));env.pulse(i,time)});return true;
  }};
 }};
})(globalThis);
