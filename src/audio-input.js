/* Local audio input selection. Permission and monitoring always require a gesture. */
(function(root){
 'use strict';
 function create(env={}){
  const media=env.media||root.navigator?.mediaDevices;let storage=env.storage;try{storage=storage||root.localStorage}catch(_){}
  let config={kind:'microphone',deviceId:''},devices=[],stream=null,monitorSource=null,monitorGain=null,monitoring=false,busy=false,disposed=false,lastError=null,accessReady=false;
  const changed=()=>env.changed?.(),say=(ru,en)=>env.toast?.(env.language?.()==='ru'?ru:en);
  try{const saved=JSON.parse(storage?.getItem('halo-audio-input-v1')||'null');if(saved&&['microphone','instrument'].includes(saved.kind)&&typeof saved.deviceId==='string'&&saved.deviceId.length<=256)config={kind:saved.kind,deviceId:saved.deviceId}}catch(_){}
  function report(stage,error){
   lastError={stage,name:String(error?.name||'Error').slice(0,60),constraint:String(error?.constraint||'').slice(0,60)};
   (env.log||root.console?.error)?.call(root.console,'[HALO audio input] '+JSON.stringify({...lastError,context:root.location?.protocol==='file:'?'file':'secure-context',inputKind:config.kind,explicitDevice:!!config.deviceId}));changed();
  }
  function clearError(){lastError=null;}
  function save(){try{storage?.setItem('halo-audio-input-v1',JSON.stringify(config))}catch(_){}changed()}
  function release(){
   monitoring=false;
   try{monitorSource?.disconnect();monitorGain?.disconnect()}catch(_){}
   monitorSource=monitorGain=null;
   const old=stream;stream=null;old?.getTracks().forEach(t=>t.stop());changed();
  }
  async function refresh(){
   if(!media?.enumerateDevices)return [];
   try{const listed=(await media.enumerateDevices()).filter(d=>d.kind==='audioinput'&&typeof d.deviceId==='string'&&d.deviceId).slice(0,64);if(listed.length||!devices.length)devices=listed;changed();return devices}catch(error){report('enumerateDevices',error);say('Список аудиовходов недоступен','Audio input list unavailable');return []}
  }
  function configure(next){
   if(busy||env.recording?.())return false;
   const value={...config,...next};
   if(!['microphone','instrument'].includes(value.kind)||typeof value.deviceId!=='string'||value.deviceId.length>256)return false;
   clearError();release();config=value;save();return true;
  }
  async function acquireImpl(){
   if(!media?.getUserMedia)throw Error(env.language?.()==='ru'?'Аудиовход требует HTTPS/localhost и поддержки браузера':'Audio input requires HTTPS/localhost and browser support');
   if(config.kind==='instrument'&&!config.deviceId){const error=new Error(env.language?.()==='ru'?'Выберите вход аудиоинтерфейса':'Choose an audio interface input');error.name='InputSelectionRequired';throw error}
   if(stream?.active&&stream.getAudioTracks().some(t=>t.readyState==='live'))return stream;
   const selection={...config};
   let incoming;try{incoming=await media.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,...(selection.deviceId?{deviceId:{exact:selection.deviceId}}:{})},video:false});clearError()}catch(error){report('getUserMedia',error);throw error}
   if(disposed||selection.deviceId!==config.deviceId||selection.kind!==config.kind){incoming.getTracks().forEach(t=>t.stop());throw Error(env.language?.()==='ru'?'Аудиовход изменён':'Audio input changed')}
   stream=incoming;
   for(const track of stream.getAudioTracks())track.addEventListener?.('ended',()=>{if(stream===incoming){release();env.inputEnded?.();say('Аудиовход отключён','Audio input disconnected')}});
   await refresh();return incoming;
  }
  async function acquire(){try{return await acquireImpl()}catch(error){if(!lastError)report('capture',error);throw error}}
  async function requestAccess(){
   if(busy)return;busy=true;clearError();changed();let probe=null;
   try{
    if(!media?.getUserMedia)throw Error('Audio input unavailable');
    await refresh();
    // Only a successful probe in this session can suppress another permission request.
    // A named default input alone does not prove capture permission.
    if(accessReady&&devices.some(d=>d.deviceId&&d.label)){return true}
    probe=await media.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    // Some browsers hide IDs/labels immediately after the last track stops.
    await refresh();accessReady=true;
    if(!devices.length){const error=new Error('No selectable audio inputs');error.name='NotFoundError';report('enumerateDevices',error);say('Браузер не предоставил выбираемые аудиовходы','Browser did not expose selectable audio inputs');return false}
    return true;
   }catch(error){report('requestAccess',error);say('Доступ к аудиовходам не предоставлен','Audio input permission was not granted');return false}
   finally{probe?.getTracks().forEach(t=>t.stop());busy=false;changed()}
  }
  async function listen(on){
   if(!on){if(env.recording?.()){monitoring=false;try{monitorSource?.disconnect();monitorGain?.disconnect()}catch(_){}monitorSource=monitorGain=null;changed()}else release();return false}
   if(monitoring)return true;
   if(busy)return monitoring;busy=true;changed();
   try{
    const audio=await env.audio?.();if(!audio?.ctx)throw Error('Audio unavailable');
    const incoming=await acquire();
    monitorSource=audio.ctx.createMediaStreamSource(incoming);monitorGain=audio.ctx.createGain();
    monitorGain.gain.setValueAtTime(0,audio.ctx.currentTime);monitorGain.gain.linearRampToValueAtTime(.5,audio.ctx.currentTime+.02);
    monitorSource.connect(monitorGain);monitorGain.connect(audio.master||audio.ctx.destination);monitoring=true;
    say('Прослушивание входа · используйте наушники','Input monitoring · use headphones');return true;
   }catch(error){if(!lastError)report('monitor',error);release();if(config.kind==='instrument'&&!config.deviceId)say('Выберите конкретный вход аудиоинтерфейса: ДОСТУП К ВХОДАМ → УСТРОЙСТВО','Choose an interface input: ENABLE INPUTS → DEVICE');else say('Не удалось открыть выбранный аудиовход','Could not open the selected audio input');return false}
   finally{busy=false;changed()}
  }
  const onDevices=()=>{refresh();if(stream&&!stream.getAudioTracks().some(t=>t.readyState==='live'))release()};
  media?.addEventListener?.('devicechange',onDevices);
  return {refresh,configure,acquire,requestAccess,listen,release,releaseCapture(){if(!monitoring)release()},state:()=>({...config,devices:[...devices],monitoring,busy,accessReady,lastError:lastError?{...lastError}:null,fileContext:root.location?.protocol==='file:'}),dispose(){disposed=true;release();media?.removeEventListener?.('devicechange',onDevices)}};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloAudioInput=api;
})(globalThis);
