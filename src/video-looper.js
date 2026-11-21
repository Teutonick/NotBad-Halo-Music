/* One browser decoder. The HALO transport supplies beat and AudioContext time. */
(function(root){
 'use strict';
 const defaults=Object.freeze({version:1,enabled:false,sync:true,bars:1,in:0,out:null,rate:1,volume:35});
 const wrap=(value,length)=>((value%length)+length)%length;
 function target(settings,clock,end){
  const length=end-settings.in,cycle=settings.bars*clock.beatsPerBar;
  return {rate:length*clock.bpm/(60*cycle),position:settings.in+wrap(clock.beat,cycle)/cycle*length};
 }

 function install(env){
  const $=id=>document.getElementById(id);
  const panel=$('videoLooper'),toggle=$('videoLooperToggle'),frame=$('videoLooperFrame');
  const labels={
   title:['ВИДЕОЛУПЕР','VIDEO LOOPER'], file:['Выбрать MP4 / WebM','Choose MP4 / WebM'],
   timeline:['Позиция видео и границы фрагмента','Video position and fragment bounds'],
   in:['Начало (IN), с','Start (IN), s'], out:['Конец (OUT), с','End (OUT), s'],
   enabled:['Включить видеолупер','Enable video looper'], sync:['Привязка к тактам','Sync to bars'],
   bars:['Такты','Bars'], rate:['Ручная скорость ×','Manual speed ×'], volume:['Звук видео','Video volume'],
   play:['Играть','Play'], pause:['Пауза','Pause'], stop:['Стоп','Stop'],
   preview:['Предпросмотр','Preview'], show:['Режим показа','Show mode'], edit:['К настройкам','Back to controls'],
   close:['Свернуть видеолупер','Collapse video looper'],
   drag:['Переместить окно стрелками','Move window with arrow keys'],
   missing:['Выберите локальный файл','Choose a local file'], loading:['Открываем видео…','Opening video…'],
   invalid:['Выберите MP4 или WebM размером до 1 ГиБ.','Choose an MP4 or WebM file up to 1 GiB.'],
   error:['Видео недоступно. Проверьте кодек и файл.','Video unavailable. Check the codec and file.'],
   audioError:['Не удалось подключить видео к микшеру.','Could not connect video to the mixer.'],
   blocked:['Браузер заблокировал запуск. Нажмите «Играть» или «Предпросмотр».','Browser blocked playback. Press Play or Preview.'],
   range:['Скорость вне диапазона 0,25–4×. Измените отрезок или число тактов.','Rate outside 0.25–4×. Adjust the fragment or the bar count.'],
   disabled:['Видеолупер выключен','Looper disabled'], waiting:['Ожидание транспорта HALO','Waiting for HALO transport'],
   synced:['Привязка к тактам','Synced to bars'], free:['Ручная скорость','Manual rate'],
   paused:['Пауза видео','Video paused'], stopped:['Видео остановлено','Video stopped'],
   previewing:['Предпросмотр со звуком','Preview with sound']
  };
  const tr=key=>labels[key][env.language()==='ru'?0:1];
  const controls=Object.fromEntries(['Choose','File','Name','Timeline','In','Out','Enabled','Sync','Bars','Rate','Volume','Play','Pause','Stop','Preview','Show','Close','Metrics','Status'].map(key=>[key,$('videoLooper'+key)]));
  let settings={...defaults},mode='armed',duration=0,url=null,video,engine=null,source=null,gain=null;
  let timer=null,attempt=null,problem='',ready=false,gate=false,manualTime=0,anchorTime=null,shown=false;
  let syncCycle=null,forceSeek=true,priming=false,cutoff=null,rangeClock=null,previewStarting=false;
  const end=()=>Math.min(settings.out??duration,duration);
  const setText=(el,value)=>{if(el.textContent!==value)el.textContent=value};
  const format=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
  function playbackStatus(clock){
   if(problem)return problem;
   if(!ready)return url?'loading':'missing';
   if(mode==='preview')return 'previewing';
   if(!settings.enabled)return 'disabled';
   if(mode==='paused'||mode==='stopped')return mode;
   if(!clock.running)return 'waiting';
   return settings.sync?'synced':'free';
  }
  function render(clock=env.clock()){
   const loaded=ready&&duration>0;
   const updateValue=(el,value)=>{if(el!==document.activeElement&&el.value!==String(value))el.value=value};
   controls.Enabled.checked=settings.enabled;
   controls.Sync.checked=settings.sync;
   updateValue(controls.Bars,settings.bars);
   updateValue(controls.Rate,settings.rate);
   updateValue(controls.Volume,settings.volume);
   controls.Bars.disabled=!settings.sync;
   controls.Rate.disabled=settings.sync;
   for(const name of ['In','Out','Timeline','Play','Pause','Stop','Preview','Show'])controls[name].disabled=!loaded;
   updateValue(controls.In,settings.in);
   updateValue(controls.Out,settings.out??(loaded?duration:''));
   const rate=settings.sync&&mode!=='preview'&&loaded?target(settings,clock,end()).rate:settings.rate;
   setText(controls.Status,tr(playbackStatus(clock)));
   setText(controls.Metrics,`${loaded?format(end()-settings.in):'—'} ${env.language()==='ru'?'с':'s'} · ${format(rate)}× · ${clock.bpm} BPM · ${clock.beatsPerBar}/4`);
   controls.Timeline.max=duration||1;
   controls.Timeline.style.setProperty('--video-in',(loaded?settings.in/duration*100:0)+'%');
   controls.Timeline.style.setProperty('--video-out',(loaded?end()/duration*100:100)+'%');
   updateValue(controls.Timeline,video?.currentTime||0);
   panel.classList.toggle('video-looper-show',shown&&loaded);
   controls.Show.setAttribute('aria-pressed',String(shown&&loaded));
   frame.hidden=!loaded;
  }
  function localize(){
   toggle.textContent=tr('title');
   for(const el of panel.querySelectorAll('[data-video-text]'))el.textContent=tr(el.dataset.videoText);
   for(const el of panel.querySelectorAll('[data-video-label]'))el.setAttribute('aria-label',tr(el.dataset.videoLabel));
   setText(controls.Show,tr(shown?'edit':'show'));
   render();
  }
  function audioGate(value,until=null){
   if(!gain||value===gate&&(!value||Math.abs(until-cutoff)<.015))return;
   gate=value;
   const now=engine.ctx.currentTime,param=gain.gain;
   param.cancelScheduledValues(now);
   param.setTargetAtTime(value?settings.volume/100:0,now,.008);
   if(value&&until!==null)param.setTargetAtTime(0,Math.max(now,until),.006);
   cutoff=until;
  }
  function pauseMedia(){
   audioGate(false);
   if(video&&!video.paused)video.pause();
   attempt=null;
  }
  function disconnect(){
   pauseMedia();
   engine?.ctx.removeEventListener('statechange',update);
   source?.disconnect();
   gain?.disconnect();
   source=gain=engine=null;
   gate=false;
  }
  function attach(audio){
   if(engine===audio&&source)return true;
   if(!audio||!video)return false;
   try{
    gain=audio.ctx.createGain();
    gain.gain.value=0;
    source=audio.ctx.createMediaElementSource(video);
    engine=audio;
    source.connect(gain);
    gain.connect(audio.program || audio.master);
    audio.ctx.addEventListener('statechange',update);
    return true;
   }catch{
    disconnect();
    problem='audioError';
    return false;
   }
  }
  function requestPlayback(){
   if(attempt||!video.paused)return;
   const media=video,token={};
   attempt=token;
   media.play().then(()=>{
    if(attempt!==token)return;
    attempt=null;
    if(priming){priming=false;update()}
   },error=>{
    if(attempt!==token)return;
    attempt=null;
    if(priming){priming=false;return}
    problem=error.name==='NotAllowedError'?'blocked':'error';
    update();
   });
  }
  function seek(position){
   audioGate(false);
   video.currentTime=position;
  }
  function cue(position=settings.in){
   if(ready)seek(position);
  }
  function resetPhase(){
   syncCycle=null;
   forceSeek=true;
  }
  function update(){
   const clock=env.clock();
   const active=ready&&(mode==='preview'?clock.audioRunning:mode==='armed'&&settings.enabled&&clock.running);
   const canRetry=problem===''||problem==='range';
   if((priming||previewStarting&&mode==='preview')&&!active)return;
   priming=false;
   if(!active||!canRetry){
    if(timer!==null){clearInterval(timer);timer=null}
    if(anchorTime!==null){
     manualTime+=Math.max(0,clock.time-anchorTime);
     anchorTime=null;
    }
    pauseMedia();
    forceSeek=true;
    render(clock);
    return;
   }
   const length=end()-settings.in,synced=settings.sync&&mode!=='preview';
   let rate,position,nextCycle=null;
   if(synced){
    ({rate,position}=target(settings,clock,end()));
    nextCycle=Math.floor(clock.beat/(settings.bars*clock.beatsPerBar));
   }else{
    if(anchorTime===null)anchorTime=clock.time;
    rate=settings.rate;
    position=settings.in+wrap((manualTime+Math.max(0,clock.time-anchorTime))*rate,length);
    nextCycle=Math.floor((manualTime+Math.max(0,clock.time-anchorTime))*rate/length);
   }
   problem=rate<.25||rate>4?'range':'';
   rangeClock=problem?[clock.bpm,clock.beatsPerBar]:null;
   if(problem||!attach(env.audio())){
    if(timer!==null){clearInterval(timer);timer=null}
    pauseMedia();
    render(clock);
    return;
   }
   if(timer===null)timer=setInterval(update,32);
   const error=position-video.currentTime;
   const crossed=syncCycle!==null&&syncCycle!==nextCycle;
   if(crossed)forceSeek=true;
   syncCycle=nextCycle;
   // Small corrections avoid constant decoder seeks. Large offsets and wraps seek to current phase.
   const correction=video.seeking?0:Math.max(-.08,Math.min(.08,error*.65/rate));
   try{
    if(!video.seeking&&(forceSeek||video.ended||video.currentTime<settings.in-.01||video.currentTime>=end()||Math.abs(error)>.12*rate+.025)){
     if(Math.abs(error)>.008)seek(position);
     forceSeek=false;
    }
    const correctedRate=Math.max(.25,Math.min(4,rate*(1+correction)));
    if(Math.abs(video.playbackRate-correctedRate)>.004)video.playbackRate=correctedRate;
    requestPlayback();
   }catch{problem='error';pauseMedia();}
   const remaining=Math.min((end()-position)/rate,(end()-video.currentTime)/video.playbackRate);
   audioGate(!problem&&!video.paused&&!video.seeking&&video.readyState>=2&&remaining>.008,clock.time+remaining);
   if(!panel.hidden&&document.visibilityState!=='hidden')render(clock);
  }
  function replaceMedia(){
   priming=false;
   previewStarting=false;
   disconnect();
   ready=false;
   duration=0;
   if(video){
    const old=video;
    video=null;
    old.removeAttribute('src');
    old.load();
    old.remove();
   }
   if(!url)return;
   const media=document.createElement('video');
   video=media;
   media.playsInline=true;
   media.preload='metadata';
   frame.append(media);
   media.addEventListener('loadedmetadata',()=>{
    if(video!==media)return;
    const length=media.duration;
    if(!Number.isFinite(length)||length<.25||length>21600||!media.videoWidth){
     problem='error';update();return;
    }
    duration=length;
    if(settings.in+.25>duration){settings.in=0;settings.out=null}
    else if(settings.out!==null&&settings.out>duration)settings.out=null;
    ready=true;
    cue();
    update();
    render();
    env.changed();
   });
   for(const event of ['playing','seeked','waiting','ended'])media.addEventListener(event,()=>{if(video===media)update()});
   media.addEventListener('error',()=>{
    if(video!==media)return;
    ready=false;
    problem='error';
    update();
   });
   media.src=url;
  }
  function unload(){
   setText(controls.Name,'');
   if(url)URL.revokeObjectURL(url);
   url=null;
   replaceMedia();
  }
  function restore(value,clearFile=false){
   mode='armed';
   problem='';
   manualTime=0;
   anchorTime=null;
   settings=value?{...value}:{...defaults};
   resetPhase();
   if(clearFile)unload();
   update();
  }
  controls.Choose.onclick=()=>controls.File.click();
  controls.File.onchange=()=>{
   const file=controls.File.files[0];
   controls.File.value='';
   if(!file)return;
   if(!/\.(mp4|webm)$/i.test(file.name)||!file.size||file.size>1073741824){
    unload();
    problem='invalid';
    update();
    return;
   }
   unload();
   url=URL.createObjectURL(file);
   setText(controls.Name,file.name);
   mode='armed';
   problem='';
   manualTime=0;
   anchorTime=null;
   resetPhase();
   replaceMedia();
   update();
  };
  function edit(name,value){
   settings[name]=value;
   if(problem==='range')problem='';
   resetPhase();
   update();
   env.changed();
  }
  controls.Enabled.onchange=()=>{
   priming=false;
   if(mode==='preview')mode='armed';
   edit('enabled',controls.Enabled.checked);
  };
  controls.Sync.onchange=()=>{
   anchorTime=null;
   manualTime=0;
   edit('sync',controls.Sync.checked);
  };
  controls.Bars.onchange=()=>edit('bars',Number(controls.Bars.value));
  controls.Rate.onchange=()=>{
   const rate=controls.Rate.valueAsNumber;
   if(!Number.isFinite(rate)||rate<.25||rate>4){controls.Rate.value=settings.rate;return}
   const previous=settings.rate;
   if(!settings.sync){
    const now=env.clock().time;
    const elapsed=anchorTime===null?0:Math.max(0,now-anchorTime);
    manualTime=(manualTime+elapsed)*previous/rate;
    if(anchorTime!==null)anchorTime=now;
   }
   edit('rate',rate);
  };
  controls.Volume.oninput=()=>{
   settings.volume=Number(controls.Volume.value);
   if(gate){gate=false;audioGate(true,cutoff)}
   env.changed();
  };
  for(const name of ['In','Out']){
   controls[name].onchange=()=>{
    const key=name.toLowerCase(),value=controls[name].valueAsNumber;
    const valid=Number.isFinite(value)&&value>=0&&value<=duration&&
      (key==='in'?value+.25<=end():value>=settings.in+.25);
    controls[name].value=valid?value:settings[key]??duration;
    if(!valid)return;
    if(mode!=='preview'&&video.paused)cue(key==='in'?value:settings.in);
    edit(key,value);
   };
  }
  controls.Timeline.oninput=()=>{
   priming=false;
   mode='paused';
   update();
   const position=Number(controls.Timeline.value);
   manualTime=wrap(position-settings.in,end()-settings.in)/settings.rate;
   cue(position);
  };
  controls.Play.onclick=()=>{
   if(mode==='preview'){anchorTime=null;manualTime=0}
   mode='armed';
   problem='';
   edit('enabled',true);
  };
  controls.Pause.onclick=()=>{priming=false;mode='paused';update()};
  controls.Stop.onclick=()=>{
   priming=false;
   mode='stopped';
   manualTime=0;
   anchorTime=null;
   update();
   cue();
  };
  controls.Preview.onclick=()=>{
   if(mode!=='paused'){anchorTime=null;manualTime=0}
   mode='preview';
   problem='';
   resetPhase();
   try{
    const audio=env.ensureAudio();
    if(attach(audio)){
     const position=settings.in+wrap(manualTime*settings.rate,end()-settings.in);
     seek(position);
     video.playbackRate=settings.rate;
     requestPlayback();
     previewStarting=true;
     const media=video;
     audio.ctx.resume().then(()=>{
      if(video!==media)return;
      previewStarting=false;
      update();
     },()=>{
      if(video!==media)return;
      previewStarting=false;
      if(mode==='preview'){problem='audioError';update()}
     });
    }
   }catch{problem='audioError'}
   update();
  };
  function visibility(open){
   panel.hidden=!open;
   toggle.setAttribute('aria-expanded',String(open));
   if(open){env.front();panel.querySelector('[data-drag]').focus()}
   else toggle.focus();
   render();
   env.changed();
  }
  toggle.onclick=()=>visibility(panel.hidden);
  controls.Close.onclick=()=>visibility(false);
  controls.Show.onclick=()=>{
   shown=!shown;
   localize();
   env.front();
   env.changed();
  };
  panel.addEventListener('keydown',event=>{
   if(document.body.classList.contains('visual-only'))return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();visibility(false)}
   else if(event.code==='Space'&&event.target.matches('button,input,select'))event.stopPropagation();
  });
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',update);
  window.addEventListener('pagehide',()=>{
   priming=false;
   if(timer!==null){clearInterval(timer);timer=null}
   pauseMedia();
  });
  localize();
  return {
   snapshot:()=>({...settings}), restore, update, localize,
   keepsAudioRunning:()=>mode==='preview'&&!problem,
   wake(){
    if(!ready||mode!=='armed'||!settings.enabled||timer!==null)return;
    const clock=env.clock();
    if(clock.running&&(problem===''||problem==='range'&&
       (clock.bpm!==rangeClock?.[0]||clock.beatsPerBar!==rangeClock?.[1])))update();
   },
   prepare(){
    if(!ready||mode!=='armed'||!settings.enabled||!video.paused)return;
    try{
     if(!attach(env.ensureAudio()))return;
     problem='';
     priming=true;
     requestPlayback();
    }catch{priming=false;problem='audioError';}
   },
   view:()=>({videoLooperOpen:!panel.hidden,videoLooperShow:shown}),
   restoreView(ui){
    shown=ui.videoLooperShow===true;
    panel.hidden=ui.videoLooperOpen!==true;
    toggle.setAttribute('aria-expanded',String(!panel.hidden));
    localize();
   },
   beforeAudioClose(){
    if(mode==='preview')mode='armed';
    anchorTime=null;
    update();
    if(engine)replaceMedia(); // An element can only be bound to one MediaElementAudioSourceNode.
   }
  };
 }
 const api={defaults,target,install};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.HaloVideoLooper=api;
})(globalThis);
