/* Local audio input selection. Permission and monitoring always require a gesture. */
(function(root){
 'use strict';
 function create(env={}){
  const media=env.media||root.navigator?.mediaDevices;let storage=env.storage;try{storage=storage||root.localStorage}catch(_){}
  let config={kind:'microphone',deviceId:''},devices=[],stream=null,monitorSource=null,monitorGain=null,monitoring=false,busy=false,disposed=false;
  const changed=()=>env.changed?.(),say=(ru,en)=>env.toast?.(env.language?.()==='ru'?ru:en);
  try{const saved=JSON.parse(storage?.getItem('halo-audio-input-v1')||'null');if(saved&&['microphone','instrument'].includes(saved.kind)&&typeof saved.deviceId==='string'&&saved.deviceId.length<=256)config={kind:saved.kind,deviceId:saved.deviceId}}catch(_){}
  function save(){try{storage?.setItem('halo-audio-input-v1',JSON.stringify(config))}catch(_){}changed()}
  function release(){
   monitoring=false;
   try{monitorSource?.disconnect();monitorGain?.disconnect()}catch(_){}
   monitorSource=monitorGain=null;
   const old=stream;stream=null;old?.getTracks().forEach(t=>t.stop());changed();
  }
  async function refresh(){
   if(!media?.enumerateDevices)return [];
   try{devices=(await media.enumerateDevices()).filter(d=>d.kind==='audioinput').slice(0,64);changed();return devices}catch(_){say('Список аудиовходов недоступен','Audio input list unavailable');return []}
  }
  function configure(next){
   if(busy||env.recording?.())return false;
   const value={...config,...next};
   if(!['microphone','instrument'].includes(value.kind)||typeof value.deviceId!=='string'||value.deviceId.length>256)return false;
   release();config=value;save();return true;
  }
  async function acquire(){
   if(!media?.getUserMedia)throw Error(env.language?.()==='ru'?'Аудиовход требует HTTPS/localhost и поддержки браузера':'Audio input requires HTTPS/localhost and browser support');
   if(config.kind==='instrument'&&!config.deviceId)throw Error(env.language?.()==='ru'?'Выберите вход аудиоинтерфейса':'Choose an audio interface input');
   if(stream?.active&&stream.getAudioTracks().some(t=>t.readyState==='live'))return stream;
   const selection={...config};
   const incoming=await media.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,...(selection.deviceId?{deviceId:{exact:selection.deviceId}}:{})},video:false});
   if(disposed||selection.deviceId!==config.deviceId||selection.kind!==config.kind){incoming.getTracks().forEach(t=>t.stop());throw Error(env.language?.()==='ru'?'Аудиовход изменён':'Audio input changed')}
   stream=incoming;
   for(const track of stream.getAudioTracks())track.addEventListener?.('ended',()=>{if(stream===incoming){release();env.inputEnded?.();say('Аудиовход отключён','Audio input disconnected')}});
   await refresh();return incoming;
  }
  async function requestAccess(){
   if(busy)return;busy=true;changed();
   try{
    if(!media?.getUserMedia)throw Error('Audio input unavailable');
    const probe=await media.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    probe.getTracks().forEach(t=>t.stop());await refresh();
   }catch(_){say('Доступ к аудиовходам не предоставлен','Audio input permission was not granted')}
   finally{busy=false;changed()}
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
   }catch(error){release();if(config.kind==='instrument'&&!config.deviceId)say('Выберите конкретный вход аудиоинтерфейса: ДОСТУП К ВХОДАМ → УСТРОЙСТВО','Choose an interface input: ENABLE INPUTS → DEVICE');else say('Не удалось открыть выбранный аудиовход','Could not open the selected audio input');return false}
   finally{busy=false;changed()}
  }
  const onDevices=()=>{refresh();if(stream&&!stream.getAudioTracks().some(t=>t.readyState==='live'))release()};
  media?.addEventListener?.('devicechange',onDevices);
  return {refresh,configure,acquire,requestAccess,listen,release,releaseCapture(){if(!monitoring)release()},state:()=>({...config,devices:[...devices],monitoring,busy}),dispose(){disposed=true;release();media?.removeEventListener?.('devicechange',onDevices)}};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloAudioInput=api;
})(globalThis);
