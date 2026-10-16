/* Small, persistent DOM panel; rerenders never discard a connection or draft. */
(function(root){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const mounted=new WeakMap(),players=new Set();
 function mount(host,api,language,env={}){
  let session=mounted.get(host);
  if(!session){
   let config;try{const text=localStorage.getItem(root.HaloAIComposer.STORE);config=root.HaloAIComposer.settings(text&&text.length<12000?JSON.parse(text):{})}catch{config=root.HaloAIComposer.settings()}
   session={config,key:'',models:[],driver:root.HaloAIComposer.create(api,{progress:n=>session.progress?.(n)}),locale:null,previewToken:0,url:null,connectAbort:null};mounted.set(host,session);
  }
  if(session.locale===language())return;
  session.locale=language();const tr=(ru,en)=>language()==='ru'?ru:en,C=root.HaloAIComposer;
  session.cleanup?.();host.replaceChildren();
  const el=(tag,text,parent=host)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n};
  const heading=el('div',undefined);heading.className='agent-heading';el('strong',tr('AI-КОМПОЗИТОР','AI COMPOSER'),heading);
  const connectionStatus=el('span',undefined,heading);
  el('p',tr('Музыку создаёт HALO. Выбранной LLM отправляются текст запроса, каталог, ноты и настройки. Аудиозаписи Track 09 не отправляются. Облачные запросы могут быть платными.','HALO creates the audio. Your chosen LLM receives the prompt, catalog, notes and settings. Track 09 recordings are never sent. Cloud requests may incur charges.'));
  const connection=el('details');connection.open=!session.driver.isConnected();el('summary',tr('Подключение модели','Model connection'),connection);
  const grid=el('div',undefined,connection);grid.className='agent-connection';
  function field(label,tag='input'){const l=el('label',label,grid),n=el(tag,undefined,l);n.setAttribute('aria-label',label);return n}
  const provider=field(tr('Провайдер','Provider'),'select');
  for(const [value,text] of [['local',tr('Локальная модель (совместимый API)','Local model (compatible API)')],['openrouter','OpenRouter'],['custom',tr('Другой локальный endpoint','Other local endpoint')]]){const option=el('option',text,provider);option.value=value}
  provider.value=session.config.provider;
  const address=field(tr('Базовый URL API','API base URL'));address.type='url';address.value=session.config.endpoint;address.placeholder='http://127.0.0.1:11434/v1';address.autocomplete='off';
  const key=field(tr('API-ключ · только на этот сеанс','API key · this session only'));key.type='password';key.autocomplete='off';key.value=session.key;key.spellcheck=false;
  const model=field(tr('Модель','Model'));model.value=session.config.model;model.maxLength=160;model.autocomplete='off';model.setAttribute('list','haloAIModels');
  const list=el('datalist',undefined,grid);list.id='haloAIModels';
  const connectionHint=el('p',tr('Локальный сервер должен уже работать и разрешать Origin этой страницы через CORS. HTTPS, доступ к локальной сети и file:// зависят от браузера. Для облака поддержан OpenRouter; прямые секретные ключи OpenAI не поддерживаются. Ключ не сохраняется, но доступен скриптам этой страницы и расширениям браузера.','Your local server must already be running and allow this page’s Origin through CORS. HTTPS, local-network access and file:// depend on your browser. Cloud option: OpenRouter; direct secret OpenAI keys are unsupported. The key is not saved, but page scripts and browser extensions can access it.'),connection);
  connectionHint.className='agent-hint';
  const connect=el('button',tr('Подключить / обновить модели','Connect / refresh models'),connection),disconnect=el('button',tr('Отключить и забыть ключ','Disconnect and forget key'),connection);
  const promptLabel=el('label',tr('Что сочинить или изменить?','What would you like to compose or change?'));
  const prompt=el('textarea',undefined,promptLabel);prompt.rows=3;prompt.maxLength=C.MAX_PROMPT;prompt.value=session.config.prompt;prompt.setAttribute('aria-label',tr('Музыкальный запрос','Music request'));prompt.placeholder=tr('Напиши лёгкую приключенческую мелодию на 8 тактов…','Write a light adventurous melody in 8 bars…');
  const guardLabel=el('label',tr('Область изменений','Edit scope'));
  const guard=el('select',undefined,guardLabel);guard.setAttribute('aria-label',tr('Область изменений','Edit scope'));
  for(const [v,t] of [['auto',tr('По запросу · проверить план','From request · review plan')],['melody',tr('Сохранить основную мелодию','Preserve main melody')],['mix',tr('Только звук и мастер · сохранить ноты','Sound and master only · preserve notes')],['visual',tr('Только визуализация','Visuals only')],...Array.from({length:8},(_,i)=>['track:'+i,tr('Только трек ','Only track ')+(i+1)])]){const o=el('option',t,guard);o.value=v}guard.value=session.config.guard;
  const actions=el('div');actions.className='agent-actions';
  const generate=el('button',tr('Создать / Изменить','Create / Modify'),actions),cancel=el('button',tr('Прервать','Cancel request'),actions);
  const status=el('p');status.className='agent-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const result=el('div');result.className='agent-result';
  const resultActions=el('div');resultActions.className='agent-actions';
  const audition=el('button',tr('Прослушать вариант','Audition proposal'),resultActions),apply=el('button',tr('Применить','Apply'),resultActions),discard=el('button',tr('Отклонить','Discard'),resultActions),undo=el('button',tr('Отменить правку','Undo edit'),resultActions),redo=el('button',tr('Повторить правку','Redo edit'),resultActions);
  const audio=el('audio');audio.controls=true;audio.preload='none';audio.hidden=true;players.add(audio);
  const debug=el('details');el('summary',tr('Для разработчиков · JSON / Agent API','Developer tools · JSON / Agent API'),debug);
  const debugArea=el('textarea',undefined,debug);debugArea.rows=4;debugArea.maxLength=524288;debugArea.setAttribute('aria-label',tr('Отладочный JSON агента','Agent debug JSON'));
  const contextButton=el('button',tr('Прочитать контекст','Read context'),debug),debugPreview=el('button',tr('Проверить пакет','Validate transaction'),debug),debugApply=el('button',tr('Применить пакет','Apply transaction'),debug);
  function release(){session.previewToken++;audio.pause();audio.removeAttribute('src');audio.hidden=true;if(session.url){URL.revokeObjectURL(session.url);session.url=null}}
  session.cleanup=()=>{release();players.delete(audio)};
  function save(){session.config=C.settings({provider:provider.value,endpoint:address.value,model:model.value,prompt:prompt.value,guard:guard.value});try{localStorage.setItem(C.STORE,JSON.stringify(session.config))}catch{status.textContent=tr('Настройки остаются в памяти: локальное сохранение недоступно.','Settings remain in memory: local storage unavailable.')}}
  function displayError(e){
   const code=String(e.message||'ERROR');
   const messages={NETWORK_CORS:tr('Нет доступа из браузера. Проверьте сервер, CORS для текущего Origin и разрешение локальной сети.','Browser connection failed. Check the server, CORS for this Origin and local-network permission.'),NOT_CONNECTED:tr('Сначала подключите модель.','Connect a model first.'),MODEL_REQUIRED:tr('Введите или выберите модель.','Enter or choose a model.'),CONFLICT_REVISION_MISMATCH:tr('Проект изменился. Создайте новый вариант на актуальном состоянии.','The project changed. Generate a new proposal from its current state.'),OPENAI_BROWSER_KEY:tr('Секретные ключи OpenAI не поддерживаются в браузере. Выберите OpenRouter или локальную модель.','Secret OpenAI keys are unsupported in the browser. Choose OpenRouter or a local model.'),CANCELLED:tr('Запрос прерван.','Request cancelled.'),TIMEOUT:tr('Модель не ответила за 120 секунд.','The model did not respond within 120 seconds.'),KEY_REQUIRED:tr('Введите ключ OpenRouter.','Enter an OpenRouter key.'),NO_HISTORY:tr('Нет доступной истории.','No history available.'),NO_PROPOSAL:tr('Сначала создайте вариант.','Generate a proposal first.')};
   status.textContent=messages[code]||(code.startsWith('HTTP_')?tr('Провайдер отклонил запрос: ','Provider rejected the request: ')+code:tr('Не удалось завершить: ','Could not complete: ')+code);
  }
  function update(){const busy=session.driver.isBusy()||!!session.connectAbort;host.setAttribute('aria-busy',String(busy));generate.disabled=busy;connect.disabled=busy;cancel.disabled=!busy;const p=session.driver.getPending();audition.disabled=busy||!p?.preview||p.plan.mode==='visual';apply.disabled=busy||!p?.preview;discard.disabled=busy||!p;undo.disabled=busy;redo.disabled=busy;connectionStatus.textContent=session.driver.isConnected()?tr('Модель подключена','Model connected'):tr('Нет подключения','Disconnected')}
  function showProposal(){
   result.replaceChildren();const p=session.driver.getPending();if(!p){update();return}
   el('strong',p.summary,result);const plan=el('dl',undefined,result);
   for(const [k,ru,en] of [['intent','Замысел','Intent'],['tempoAndKey','Темп и тональность','Tempo and key'],['harmony','Гармония','Harmony'],['rhythm','Ритм','Rhythm'],['development','Развитие','Development']])if(typeof p.plan[k]==='string'){el('dt',tr(ru,en),plan);el('dd',p.plan[k].slice(0,2000),plan)}
   for(const item of p.plan.limitations)el('p',item,result);
   if(p.preview){
    const after=p.preview.after,bars=after.phrases?root.HaloSong.bars(after):after.bars,seconds=bars*240/after.tempo;
    el('p',tr('Фактический вариант: ','Actual proposal: ')+bars+tr(' тактов · ',' bars · ')+Math.floor(seconds/60)+':'+String(Math.round(seconds%60)).padStart(2,'0')+' · '+after.tempo+' BPM',result);
    const before=p.preview.before,original=before.phrases||[{id:null,project:before}];
    for(const entry of (after.phrases||[{id:null,project:after}])){const previous=original.find(p=>p.id===entry.id)?.project,changed=[];for(const [i,t] of entry.project.tracks.entries())if(JSON.stringify(t)!==JSON.stringify(previous?.tracks[i]))changed.push(i+1);if(changed.length)el('p',tr('Фраза ','Phrase ')+(entry.id??1)+tr(' · изменены треки: ',' · changed tracks: ')+changed.join(', '),result);if(JSON.stringify(previous?.liveLoop)!==JSON.stringify(entry.project.liveLoop))el('p',tr('Обработка Track 09 изменена в фразе ','Track 09 treatment changed in phrase ')+(entry.id??1),result)}
    if(JSON.stringify(before.sections)!==JSON.stringify(after.sections))el('p',tr('Структура секций изменена.','Section structure changed.'),result);
    for(const [k,label,unit] of [['tempo',tr('Темп','Tempo'),' BPM'],['masterVolume',tr('Мастер','Master'),' %']])if(before[k]!==after[k])el('p',label+': '+before[k]+' → '+after[k]+unit,result);
    for(const [k,label,unit] of [['low',tr('Низ','Low'),' dB'],['mid',tr('Середина','Mid'),' dB'],['high',tr('Верх','High'),' dB'],['width',tr('Ширина','Width'),' %']])if(before.mix[k]!==after.mix[k])el('p',label+': '+before.mix[k]+' → '+after.mix[k]+unit,result);
    if(JSON.stringify(p.preview.visualBefore)!==JSON.stringify(p.preview.visualAfter))el('p',tr('Визуализация: ','Visuals: ')+Object.values(p.preview.visualAfter).join(' · '),result);
    el('p',p.plan.mode==='visual'?tr('Музыка и транспорт сохраняются.','Music and transport stay unchanged.'):tr('Применение остановит транспорт; Play продолжит работу с вариантом.','Applying pauses the transport; Play resumes with the proposal.'),result);
   }
   update();
  }
  session.refresh=showProposal;
  session.progress=n=>{status.textContent=n?tr('Исправление плана · попытка ','Repairing plan · attempt ')+(n+1):tr('Модель сочиняет и проверяет музыкальный план…','The model is composing a musical plan…')};
  function changed(){session.connectAbort?.abort();session.connectAbort=null;session.driver.disconnect();session.key=key.value;release();save();result.replaceChildren();update()}
  provider.onchange=()=>{address.value=C.providers[provider.value].endpoint;key.value='';session.models=[];list.replaceChildren();changed()};address.oninput=changed;key.oninput=changed;model.oninput=changed;
  prompt.oninput=()=>{session.driver.cancel();release();save();result.replaceChildren();update()};guard.onchange=prompt.oninput;
  connect.onclick=async()=>{
   save();session.key=key.value;session.driver.disconnect();release();const abort=new AbortController();session.connectAbort=abort;status.textContent=tr('Проверяем доступ и список моделей…','Checking access and model list…');update();
   try{
    try{session.models=await session.driver.models(session.config,session.key,abort.signal);list.replaceChildren();for(const id of session.models){const o=el('option',undefined,list);o.value=id}if(!model.value&&session.models.length)model.value=session.models[0];save()}
    catch(e){if(!['HTTP_404','HTTP_405','MODELS_UNSUPPORTED'].includes(e.message)||!session.config.model)throw e;status.textContent=tr('Список моделей недоступен; Chat API будет проверен при создании.','Model list unavailable; Chat API will be checked when composing.')}
    if(abort.signal.aborted)return;session.driver.connect(session.config,session.key);if(!session.config.model)throw Error('MODEL_REQUIRED');connection.open=false;status.textContent=tr('Можно писать музыкальный запрос. Совместимость генерации проверяется при первом запросе.','Ready for your music request. Generation compatibility is checked on the first request.');
   }catch(e){session.driver.disconnect();displayError(e)}finally{if(session.connectAbort===abort)session.connectAbort=null;update()}
  };
  disconnect.onclick=()=>{session.connectAbort?.abort();session.connectAbort=null;session.driver.disconnect();api.setEnabled(false);key.value='';session.key='';release();result.replaceChildren();status.textContent=tr('Подключение закрыто; ключ забыт.','Disconnected; key forgotten.');update()};
  cancel.onclick=()=>{session.connectAbort?.abort();session.connectAbort=null;session.driver.cancel();status.textContent=tr('Запрос прерван.','Request cancelled.');update()};
  generate.onclick=async()=>{release();save();try{await env.pause?.();const task=session.driver.propose(prompt.value,guard.value,language());update();await task;status.textContent=tr('Вариант готов к проверке. Проект пока не изменён.','Proposal ready for review. Your project has not changed.');session.refresh?.()}catch(e){displayError(e)}finally{update()}};
  audition.onclick=async()=>{
   const p=session.driver.getPending();if(!p?.preview)return;release();const token=session.previewToken;audition.disabled=true;status.textContent=tr('Рендерим короткое превью локально…','Rendering a short preview locally…');
   try{const excerpt=clone(p.preview.after.phrases?p.preview.after.phrases[0].project:p.preview.after);if(p.preview.after.phrases)Object.assign(excerpt,{tempo:p.preview.after.tempo,masterVolume:p.preview.after.masterVolume,mix:p.preview.after.mix});if(excerpt.tempo<60&&excerpt.bars===8){excerpt.bars=4;excerpt.startStep=0;for(const t of excerpt.tracks){t.steps=t.steps.filter(s=>s<64);if(t.noteEvents)t.noteEvents=t.noteEvents.filter(e=>e.step<64)}}const buffer=await root.HaloExport.render(excerpt);if(token!==session.previewToken)return;session.url=URL.createObjectURL(new Blob([root.HaloProject.wav(buffer)],{type:'audio/wav'}));audio.src=session.url;audio.hidden=false;status.textContent=tr('Превью первой фразы (до 32 секунд). Нажмите ▶ ниже.','First-phrase preview (up to 32 seconds). Press ▶ below.')}catch(e){displayError(e)}finally{update()}
  };
  audio.onplay=()=>{env.pause?.();};
  apply.onclick=async()=>{release();try{await session.driver.apply();status.textContent=tr('Применено. Нажмите Play; сохранить можно обычной кнопкой SAVE.','Applied. Press Play; save using the normal SAVE button.');result.replaceChildren()}catch(e){displayError(e)}finally{update()}};
  discard.onclick=()=>{session.driver.cancel();release();result.replaceChildren();status.textContent=tr('Вариант отклонён.','Proposal discarded.');update()};
  for(const [button,method] of [[undo,'undo'],[redo,'redo']])button.onclick=async()=>{release();try{api.setEnabled(true);await api[method]();session.driver.cancel();result.replaceChildren();status.textContent=tr('Готово; Play для прослушивания.','Done; press Play to listen.')}catch(e){displayError(e)}finally{update()}};
  contextButton.onclick=()=>{debugArea.value=JSON.stringify(api.getContext(),null,2)};
  debugPreview.onclick=()=>{try{const p=api.previewOperations(JSON.parse(debugArea.value));status.textContent=tr('Пакет проверен. ','Transaction validated. ')+p.playback}catch(e){displayError(e)}};
  debugApply.onclick=async()=>{try{api.setEnabled(true);await api.applyOperations(JSON.parse(debugArea.value));status.textContent=tr('Пакет применён.','Transaction applied.')}catch(e){displayError(e)}};
  update();showProposal();
 }
 root.HaloComposerUI={mount,stopAllPreviews(){for(const audio of players)audio.pause()}};
})(globalThis);
