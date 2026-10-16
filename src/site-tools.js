/* Browser-native WebMCP bridge over the one existing musical API. No network. */
(function(root){
 'use strict';
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
   // Native callers and context callers share the same validation and state.
   return clone(await def.run(args));
  }
  function descriptors(){return [...definitions.values()].map(({run,...d})=>clone(d))}
  function context(){const doc=env.document||root.document,nav=env.navigator||root.navigator;for(const [surface,mc] of [['document.modelContext',doc?.modelContext],['navigator.modelContext',nav?.modelContext]])if(typeof mc?.registerTool==='function')return {surface,mc};return null}
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
  const bridge={version:1,listTools:descriptors,callTool,getStatus:()=>clone(status),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},dispose,ready:null};
  bridge.ready=register();return bridge;
 }
 function panel(host,api,language){
  const tr=(ru,en)=>language()==='ru'?ru:en,bridge=root.HaloSiteTools;
  host._haloAgentUnsubscribe?.();host.replaceChildren();
  function el(tag,text){const n=document.createElement(tag);n.textContent=text;host.append(n);return n}
  el('strong',tr('AI / АГЕНТЫ','AI / AGENTS'));
  const status=el('p','');status.setAttribute('role','status');
  function update(){const s=bridge?.getStatus();status.textContent=s?.state==='registered'?tr('WebMCP: инструменты доступны браузерному агенту.','WebMCP: tools registered for browser agents.'):s?.state==='failed'?tr('WebMCP: регистрация не завершена. Доступен API контекста страницы.','WebMCP: registration failed. The page-context API is available.'):s?.state==='registering'?tr('WebMCP: регистрация инструментов…','WebMCP: registering tools…'):tr('WebMCP недоступен в этом браузере. API контекста страницы доступен; агенту нужен доступ к JavaScript страницы.','WebMCP is unavailable in this browser. The page-context API is available; the agent needs page JavaScript access.')}
  update();if(bridge)host._haloAgentUnsubscribe=bridge.subscribe(update);
  el('p',tr('Откройте этот HALO во внешнем агенте (например, Codex) и попросите: «Сочини оригинальный новогодний джингл на 8 тактов из встроенных звуков, создай свои ноты, бас, гармонию и эффекты». Агент читает каталог, сочиняет и применяет команды непосредственно в этой вкладке.','Open this HALO in an external agent such as Codex and ask: “Compose an original eight-bar New Year jingle with built-in sounds, your own notes, bass, harmony and effects.” The agent reads the catalog, composes and applies commands directly in this tab.'));
  el('p',tr('Настраивать модель, ключ или чат внутри HALO не нужно. Совместимость зависит от браузера и агента. Воспроизведение может потребовать обычного нажатия Play из-за правил браузерного аудио.','No model, key or chat setup in HALO. Compatibility depends on the browser and agent. Browser audio policy may still require an ordinary Play gesture.'));
  el('p',tr('Для агента: начните с halo_get_context. Резервный интерфейс: window.HaloSiteTools.listTools(), callTool(name, args) и window.HaloAgentAPI. Пакеты проверяются до применения; доступны Undo/Redo. Аудиозаписи Track 09 не предоставляются.','For agents: start with halo_get_context. Fallback: window.HaloSiteTools.listTools(), callTool(name, args) and window.HaloAgentAPI. Batches validate before application; Undo/Redo are available. Track 09 recordings are not exposed.'));
 }
 const api={install,panel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloBrowserTools=api;
})(globalThis);
