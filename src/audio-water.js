/* Bounded original FM/subtractive WATER voices, shared by live and offline audio. */
(function(root){
 'use strict';
 function play(ctx,patch,pitches,time,duration,start,processing,noise){
  const role=patch.waterVoice,v=patch.waterVariant,limit=ctx.sampleRate*.38;
  function osc(hz,type,amp,endHz,detune=0){
   const o=ctx.createOscillator();o.type=type;o.detune.value=detune;
   o.frequency.setValueAtTime(Math.min(limit,hz),time);
   if(endHz)o.frequency.exponentialRampToValueAtTime(Math.max(20,Math.min(limit,endHz)),time+Math.min(.22,duration*.7));
   start(o,amp);return o;
  }
  function fm(hz,amp,index=patch.fmIndex){
   const c=osc(hz,'sine',amp),m=ctx.createOscillator(),depth=ctx.createGain();
   m.type='sine';m.frequency.value=Math.min(limit,hz*patch.fmRatio);
   depth.gain.setValueAtTime(hz*index,time);depth.gain.exponentialRampToValueAtTime(Math.max(.001,hz*index*.04),time+duration*.8);
   m.connect(depth);depth.connect(c.frequency);processing.push(depth);start(m,0);
  }
  function noiseLayer(amp,frequency,type='bandpass'){
   const s=ctx.createBufferSource(),f=ctx.createBiquadFilter();s.buffer=noise;s.loop=true;
   f.type=type;f.frequency.value=Math.min(limit,frequency);f.Q.value=.8;
   // The shared voice owns source stop times and filter cleanup.
   s.connect(f);processing.push(f);
   start(s,amp,f);
  }
  if(role==='pulse'){
   osc(125+v*24,'sine',.85,42+v*3);osc(750+v*230,'triangle',.055,70);return;
  }
  if(role==='accent'){
   noiseLayer(.35+patch.fmIndex*.35,1800+v*950);fm(155+v*59,.32,2+v*1.2);return;
  }
  if(role==='percussion'){
   [1,1.342,1.917].forEach((r,i)=>osc((1800+v*360)*r,'square',.085/(i+1)));
   noiseLayer(.19,6500,'highpass');return;
  }
  if(role==='texture'){
   noiseLayer(.24,1300+v*700);fm(320+v*137,.21,3+v);return;
  }
  const notes=pitches.length?pitches:[48];
  notes.forEach(n=>{
   const hz=440*2**((n-69)/12),weight=1/notes.length;
   if(role==='bass'){
    osc(hz,'sine',weight*.65);fm(hz,weight*.25);
    if(v===1||v===3){osc(hz,'sawtooth',weight*.09,undefined,-6);osc(hz,'sawtooth',weight*.09,undefined,6)}
   }else{
    fm(hz,weight*.68);osc(hz*(v===2?2:1),'triangle',weight*.14,undefined,v===3?7:0);
    if(role==='harmony')osc(hz*.998,'sine',weight*.12);
   }
  });
 }
 const api={play};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloWaterAudio=api;
})(globalThis);
