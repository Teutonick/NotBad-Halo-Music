/* Browser-native WebMCP bridge over the one existing musical API. No network. */
(function(root){
 'use strict';
 const bridges=new WeakMap();
 const clone=x=>JSON.parse(JSON.stringify(x));
 const empty={type:'object',properties:{},additionalProperties:false};
 const transaction={type:'object',required:['schemaVersion','baseRevision','operations'],additionalProperties:false,properties:{schemaVersion:{type:'integer',const:1},baseRevision:{type:'integer',minimum:0},operations:{type:'array',minItems:1,maxItems:256,items:{type:'object',required:['op'],properties:{op:{type:'string',enum:['track.patch','phrase.patch','master.patch','project.replace','composition.replace','visual.patch']},trackIndex:{type:'integer',minimum:0,maximum:7},phraseId:{type:'integer',minimum:1},values:{type:'object'},project:{type:'object'}},additionalProperties:false}}}};
 function install(api,env={}){
  const listeners=new Set(),definitions=new Map();let controller=null,disposed=false,generation=0;
  let status={state:'initializing',surface:null,registered:[],errors:[]};
  const guidance='HALO is a local music instrument, not an AI chat. The external agent composes original MIDI parts. Read halo_get_context first; pause transport for stable long edits, then use baseRevision with one batch of up to 256 operations. Use exact:true, steps and noteEvents for explicit notes. Re-read state to verify. User track 6 is index 5. No mouse/keyboard emulation, model key, server or manual JSON exchange is needed. Audio stays local; no microphone permission or raw recordings are exposed. See registry for 4/4, role ranges, fixed orbit geometry and unavailable per-note parameters.';
  function announce(){for(const fn of listeners)try{fn()}catch{}}
  function add(name,description,schema,readOnly,run){definitions.set(name,{name,description,inputSchema:schema,annotations:{readOnlyHint:readOnly,consequentialHint:false,untrustedContentHint:true},run})}
  function authorize(){api.setEnabled(true)}
  add('halo_get_context',guidance+' Returns catalog, limits, current score, resolved notes, visual state and history counts.',empty,true,()=>({...api.getContext(),agentInstructions:guidance}));
  add('halo_get_capabilities','Read actual built-in sounds/sample metadata, role compatibility, MIDI/key/FX/master/visual limits and operation fields. No PCM.',empty,true,()=>api.getCapabilities());
  add('halo_get_state','Read the current canonical project, visual settings and revision after an edit. No audio data.',empty,true,()=>api.getProjectState());
  const batch={type:'object',properties:{transaction},required:['transaction'],additionalProperties:false};
  add('halo_validate_operations','Validate an entire musical transaction without changes. Return precise errors; fix invalid commands instead of inventing capabilities.',batch,true,({transaction:t})=>api.validateOperations(t));
  add('halo_preview_operations','Compute before/after project and visual state on copies. Does not play or apply. A stale revision fails.',batch,true,({transaction:t})=>api.previewOperations(t));
  add('halo_apply_operations','Apply one validated batch to the actual open HALO score, with session Undo/Redo and autosave. Supports tracks/notes, phrases, complete arrangements, FX, master and supported visual modes. Musical loading pauses playback; no automatic download or microphone access.',batch,false,async({transaction:t})=>{authorize();return api.applyOperations(t)});
  add('halo_undo','Undo the last applied agent transaction; reject if later manual edits conflict.',empty,false,async()=>{authorize();return api.undo()});
  add('halo_redo','Redo the last undone agent transaction; reject conflicting manual edits.',empty,false,async()=>{authorize();return api.redo()});
  add('halo_playback','Request play/pause through HALO transport. Play may still need a browser audio gesture; inspect the returned playing flag and never claim sound if blocked.',{type:'object',properties:{playing:{type:'boolean'}},required:['playing'],additionalProperties:false},false,async({playing})=>{authorize();return api.setPlayback({playing})});
  add('halo_export_project','Read a portable project object for saving by the external agent. The live score is already autosaved locally. No audio or model configuration.',empty,true,()=>({filename:'halo-agent-project.json',project:api.getProjectState().project}));
  function check(args,schema){
   if(!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_ARGUMENTS');
   if(Object.keys(args).some(k=>!Object.hasOwn(schema.properties,k))||(schema.required||[]).some(k=>!Object.hasOwn(args,k)))throw Error('INVALID_ARGUMENTS');
   if(Object.hasOwn(args,'playing')&&typeof args.playing!=='boolean')throw Error('INVALID_ARGUMENTS');
  }
  async function callTool(name,args={},options={}){
   if(disposed)throw Error('SITE_TOOLS_DISPOSED');if(options.signal?.aborted)throw Error('CANCELLED');
   const def=definitions.get(name);if(!def)throw Error('UNKNOWN_TOOL');check(args,def.inputSchema);
   // Only registered WebMCP callbacks dispatch musical commands.
   return clone(await def.run(args));
  }
  function context(){const mc=(env.document||root.document)?.modelContext;return typeof mc?.registerTool==='function'?{surface:'document.modelContext',mc}:null}
  async function register(){
   const serial=++generation;controller?.abort();controller=null;
   const selected=context();status={state:selected?'registering':'unsupported',surface:selected?.surface||null,registered:[],errors:[]};announce();
   if(!selected||disposed)return clone(status);
   const ownController=new AbortController();controller=ownController;
   for(const def of definitions.values()){
    if(serial!==generation||disposed)break;
    const {run,...descriptor}=def;
    try{
     await selected.mc.registerTool({...descriptor,execute:async(args={},agent={})=>{
      try{const result=await callTool(def.name,args,{signal:agent.signal});return {content:[{type:'text',text:JSON.stringify({ok:true,result})}]}}
      catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({ok:false,error:e.message})}]}}
     }},{signal:ownController.signal});
     if(serial===generation)status.registered.push(def.name);
    }catch(e){if(serial===generation)status.errors.push({tool:def.name,error:String(e.name||'REGISTRATION_ERROR')})}
   }
   if(serial===generation){status.state=status.errors.length?'failed':'registered';announce()}
   return clone(status);
  }
  function hide(event){if(event?.persisted)return;dispose()}
  function dispose(){if(disposed)return;disposed=true;generation++;controller?.abort();controller=null;env.removeEventListener?.('pagehide',hide);listeners.clear()}
  env.addEventListener?.('pagehide',hide);
  const bridge={version:1,getStatus:()=>clone(status),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},dispose,ready:null};
  bridges.set(api,bridge);bridge.ready=register();return bridge;
 }
 function panel(host,api,language){
  const tr=(ru,en)=>language()==='ru'?ru:en,bridge=bridges.get(api);
  host._haloAgentUnsubscribe?.();host.replaceChildren();
  function el(tag,text){const n=document.createElement(tag);n.textContent=text;host.append(n);return n}
  el('strong',tr('AI / АГЕНТЫ','AI / AGENTS'));
  const status=el('p','');status.setAttribute('role','status');
  function update(){const s=bridge?.getStatus();status.textContent=s?.state==='registered'?tr('WebMCP доступен. Инструменты HALO зарегистрированы.','WebMCP available. HALO tools are registered.'):tr('WebMCP недоступен.','WebMCP unavailable.')}
  update();if(bridge)host._haloAgentUnsubscribe=bridge.subscribe(update);
  el('p',tr('Как включить в Chrome: откройте chrome://flags/#enable-webmcp-testing, выберите Enabled, перезапустите браузер и снова откройте HALO. Если флага нет, эта версия браузера не предоставляет такой способ включения.','Enable in Chrome: open chrome://flags/#enable-webmcp-testing, select Enabled, relaunch the browser and reopen HALO. If the flag is absent, this browser version does not offer this activation method.'));
  el('p',tr('Статус выше подтверждает регистрацию в этой вкладке. Для работы агент должен обнаружить и вызвать инструменты WebMCP именно этой вкладки.','The status above confirms registration in this tab. To work, the agent must discover and call this tab’s WebMCP tools.'));
  function steps(title,items){el('strong',title);const list=el('ol','');for(const text of items){const item=document.createElement('li');item.textContent=text;list.append(item)}}
  steps(tr('1. Codex / Claude / Antigravity','1. Codex / Claude / Antigravity'),[
   tr('Запустите агент с браузерным подключением, поддерживающим WebMCP. Откройте HALO в браузере этого подключения. Для локальной проверки: http://127.0.0.1:8766/.','Start the agent with a browser connection that supports WebMCP. Open HALO in that connection’s browser. For a local check: http://127.0.0.1:8766/.'),
   tr('Попросите: «Открой http://127.0.0.1:8766/ и через WebMCP вызови halo_get_context. Сообщи число дорожек и доступные звуки. Если инструментов нет, остановись и сообщи об этом».','Ask: “Open http://127.0.0.1:8766/ and call halo_get_context through WebMCP. Report the track count and available sounds. If no tools are available, stop and report it.”'),
   tr('После успешного чтения: «Через WebMCP сочини и примени оригинальный новогодний джингл на 8 тактов: своя мелодия колокольчиков, бас, гармония и мягкая перкуссия. Сначала проверь и просмотри пакет изменений, затем примени и прочитай результат».','After a successful read: “Through WebMCP, compose and apply an original eight-bar New Year jingle: your own bell melody, bass, harmony and soft percussion. Validate and preview the batch first, then apply it and read back the result.”')]);
  steps(tr('2. Bionic','2. Bionic'),[
   tr('Откройте HALO в управляемой агентом вкладке Bionic. В этой вкладке должен отображаться статус «WebMCP доступен».','Open HALO in the Bionic tab controlled by its agent. This tab must show “WebMCP available”.'),
   tr('В чате агента для этой вкладки попросите: «Через WebMCP вызови halo_get_context на открытой странице HALO. Если инструменты не обнаружены, остановись и сообщи об этом».','In the agent chat for this tab, ask: “Call halo_get_context through WebMCP on the open HALO page. If tools are not discovered, stop and report it.”'),
   tr('После успешного чтения используйте запрос про джингл из первого примера. Для опубликованного HALO замените локальный адрес его HTTPS-адресом.','After a successful read, use the jingle request from the first example. For a published HALO, replace the local address with its HTTPS URL.')]);
  el('p',tr('Примеры описывают порядок проверки. Поддержка зависит от конкретного браузерного подключения агента; Claude, Antigravity и Bionic пока не проверены нами. Флаг Chrome включает браузерный API, но сам не подключает агента к вкладке.','These examples describe the verification workflow. Support depends on the agent’s specific browser connection; Claude, Antigravity and Bionic have not yet been verified by us. The Chrome flag enables the browser API but does not itself connect an agent to the tab.'));
  el('p',tr('После применения нажмите Play для прослушивания. Изменения сохраняются локально; доступны Undo/Redo через WebMCP. Аудиозаписи Track 09 агенту не передаются.','After application, press Play to listen. Changes save locally; Undo/Redo are available through WebMCP. Track 09 recordings are not provided to the agent.'));
 }
 const api={install,panel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloBrowserTools=api;
})(globalThis);
