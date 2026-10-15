const test=require('node:test'),assert=require('node:assert/strict'),{create}=require('../src/audio-input.js');
function fixture(options={}){
 const calls=[],tracks=[],messages=[],storage=new Map(),listeners={};let recording=false;
 const media={async enumerateDevices(){return [{kind:'audioinput',deviceId:'usb-test',label:'Test USB'},{kind:'videoinput',deviceId:'camera'}]},async getUserMedia(constraints){calls.push(constraints);if(options.denied)throw Error('Denied');const events={};const track={readyState:'live',stop(){this.readyState='ended'},addEventListener(name,f){events[name]=f},events};tracks.push(track);return {active:true,getAudioTracks:()=>[track],getTracks:()=>[track]}},addEventListener(n,f){listeners[n]=f},removeEventListener(n){delete listeners[n]}};
 const ctx={currentTime:0,destination:{},createMediaStreamSource(){return {connect(){},disconnect(){}}},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}};
 const env={media,storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},audio:async()=>({ctx}),recording:()=>recording,toast:m=>messages.push(m),language:()=> 'en'};
 return {input:create(env),env,calls,tracks,messages,storage,listeners,record:()=>recording=true};
}
test('inputs require a gesture; exact instrument selection disables voice processing and never chooses a camera',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);assert.equal(f.input.configure({kind:'instrument'}),true);
 await assert.rejects(f.input.acquire(),/Choose an audio interface/);assert.equal(f.calls.length,0);
 f.input.configure({deviceId:'usb-test'});await f.input.acquire();assert.equal(f.calls[0].audio.deviceId.exact,'usb-test');assert.equal(f.calls[0].audio.echoCancellation,false);assert.equal(f.calls[0].audio.noiseSuppression,false);assert.equal(f.calls[0].audio.autoGainControl,false);assert.equal(f.calls[0].video,false);assert.equal(f.input.state().devices.length,1);
 f.input.releaseCapture();assert.equal(f.tracks[0].readyState,'ended');
});
test('monitor is explicit and idempotent; switching devices releases it and saved preferences never reopen hardware',async()=>{
 const f=fixture();assert.equal(await f.input.listen(true),true);assert.equal(await f.input.listen(true),true);assert.equal(f.calls.length,1);
 f.input.releaseCapture();assert.equal(f.tracks[0].readyState,'live');
 f.input.configure({kind:'instrument',deviceId:'usb-test'});assert.equal(f.tracks[0].readyState,'ended');assert.equal(f.input.state().monitoring,false);
 const restored=create(f.env);assert.equal(restored.state().deviceId,'usb-test');assert.equal(restored.state().monitoring,false);assert.equal(f.calls.length,1);restored.dispose();
});
test('permission denial returns to a silent idle state and device disconnect releases monitoring',async()=>{
 const denied=fixture({denied:true});assert.equal(await denied.input.listen(true),false);assert.equal(denied.input.state().monitoring,false);assert.ok(denied.messages.length);
 const f=fixture();await f.input.listen(true);f.tracks[0].events.ended();assert.equal(f.input.state().monitoring,false);assert.equal(f.tracks[0].readyState,'ended');f.input.dispose();assert.equal(f.listeners.devicechange,undefined);
});
test('recording locks input selection; stopping monitor does not stop an active recording stream',async()=>{
 const f=fixture();await f.input.listen(true);f.record();assert.equal(f.input.configure({deviceId:'other'}),false);await f.input.listen(false);assert.equal(f.tracks[0].readyState,'live');assert.equal(f.input.state().monitoring,false);f.input.releaseCapture();assert.equal(f.tracks[0].readyState,'ended');
});
test('permission probe releases hardware and unavailable APIs fail without requiring a backend',async()=>{
 const f=fixture();await f.input.requestAccess();assert.equal(f.tracks[0].readyState,'ended');assert.equal(f.input.state().devices.length,1);
 const unsupported=create({media:{},storage:{getItem(){throw Error('Unavailable')}}});assert.deepEqual(await unsupported.refresh(),[]);await assert.rejects(unsupported.acquire(),/HTTPS/);assert.equal(unsupported.configure({deviceId:'x'.repeat(257)}),false);
});
