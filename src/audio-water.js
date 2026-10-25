/* Bounded original FM/subtractive WATER voices, shared by live and offline audio. */
(function(root){
 'use strict';
 function play(ctx,patch,pitches,time,duration,start,processing,noise,tempo=120){
  const role=patch.waterVoice,v=patch.waterVariant,limit=ctx.sampleRate*.38;
  function osc(hz,type,amp,endHz,detune=0,output){
   const o=ctx.createOscillator();o.type=type;o.detune.value=detune;
   o.frequency.setValueAtTime(Math.min(limit,hz),time);
   if(endHz)o.frequency.exponentialRampToValueAtTime(Math.max(20,Math.min(limit,endHz)),time+Math.min(.22,duration*.7));
   if(output)o.connect(output.input);start(o,amp,output?.output||o);return o;
  }
  function fm(hz,amp,index=patch.fmIndex,output){
   const c=osc(hz,'sine',amp,undefined,0,output),m=ctx.createOscillator(),depth=ctx.createGain();
   m.type='sine';m.frequency.value=Math.min(limit,hz*patch.fmRatio);
   depth.gain.setValueAtTime(hz*index,time);depth.gain.exponentialRampToValueAtTime(Math.max(.001,hz*index*.04),time+duration*.8);
   m.connect(depth);depth.connect(c.frequency);processing.push(depth);start(m,0);
  }
  function noiseLayer(amp,frequency,type='bandpass',decay){
   const s=ctx.createBufferSource(),f=ctx.createBiquadFilter();s.buffer=noise;s.loop=true;
   f.type=type;f.frequency.value=Math.min(limit,frequency);f.Q.value=.8;
   // The shared voice owns source stop times and filter cleanup.
   s.connect(f);processing.push(f);
   if(decay){const env=ctx.createGain();env.gain.setValueAtTime(1,time);env.gain.exponentialRampToValueAtTime(.0001,time+Math.min(duration,decay));f.connect(env);processing.push(env);start(s,amp,env)}else start(s,amp,f);
  }
  if(role==='pulse'){
   const body=osc(160+v*20,'sine',1.04);
   body.frequency.exponentialRampToValueAtTime(58+v*2,time+.025);
   body.frequency.exponentialRampToValueAtTime(43+v*2,time+Math.min(.15,duration));
   osc(88+v*4,'triangle',.15,46+v*2);noiseLayer(.09,4800,'highpass',.016);return;
  }
  if(role==='accent'){
   noiseLayer(v===0?.72:.57,2100+v*950,'bandpass',.14+v*.015);
   fm(175+v*33,.42,1.5+v*.65);osc(345+v*17,'triangle',.14,170);return;
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
    // Clean mono sub and a separate moving mid-band: distortion never eats the sub.
    let sub=hz;while(sub>65)sub/=2;while(sub<32)sub*=2;
    osc(sub,'sine',weight*.78);
    const input=ctx.createGain(),shaper=ctx.createWaveShaper(),hp=ctx.createBiquadFilter(),lp=ctx.createBiquadFilter();
    const curve=new Float32Array(1024),drive=2.2+v*.7;
    for(let k=0;k<curve.length;k++){const x=k*2/(curve.length-1)-1;curve[k]=Math.tanh(x*drive)/Math.tanh(drive)}
    shaper.curve=curve;shaper.oversample='2x';input.gain.value=.65;hp.type='highpass';hp.frequency.value=120;lp.type='lowpass';lp.Q.value=.8+v*.25;
    const center=600+v*270;lp.frequency.value=Math.min(limit,center);
    input.connect(shaper);shaper.connect(hp);hp.connect(lp);processing.push(input,shaper,hp,lp);
    const wobble=ctx.createOscillator(),depth=ctx.createGain();wobble.type=v===3?'triangle':'sine';
    wobble.frequency.value=Math.max(30,Math.min(200,tempo))/60*[.5,1,2,4][v];depth.gain.value=center*.72;
    wobble.connect(depth);depth.connect(lp.frequency);processing.push(depth);start(wobble,0);
    fm(hz,weight*.46,1.7+patch.fmIndex*2.5,{input,output:lp});
    for(const detune of [-9,9]){const saw=osc(hz,'sawtooth',0,undefined,detune);saw.connect(input)}
   }else{
    fm(hz,weight*.55);osc(hz*(v===2?2:1),role==='melody'&&v!==1?'sawtooth':'triangle',weight*.23,undefined,v===3?7:0);
    if(role==='harmony')osc(hz*.998,'sine',weight*.12);
   }
  });
 }
 const api={play};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloWaterAudio=api;
})(globalThis);
