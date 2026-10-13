(function(root){
 'use strict';
 async function render(project){
  const rate=44100,seconds=project.bars*4*60/project.tempo,length=Math.round(seconds*rate);
  const ctx=new OfflineAudioContext(2,length*2,rate);
  const samples=project.setup==='reactor'?await HaloSamples.prepare(ctx):{};
  const tracks=project.tracks.map(t=>({...t,setup:project.setup,phraseBars:project.bars,...(t.generator!==3||t.exact?{manualSteps:t.steps,manualBars:project.bars}:{})}));HaloSounds.arrange(tracks);
  const engine=HaloAudio.create(ctx,tracks,project.masterVolume,samples,project.mix);
  // One warm-up loop initializes envelopes/reverb; export the next exact loop.
  for(let step=0;step<project.bars*32;step++){
   const absolute=(project.startStep||0)+step-project.bars*16,local=((absolute%(project.bars*16))+project.bars*16)%(project.bars*16),time=step*60/project.tempo/4;
   tracks.forEach((t,i)=>{const clock=t.generator===3?absolute:local;if(!HaloSounds.shouldTrigger(t,i,clock,project.seed,project.bars))return;engine.play(i,HaloSounds.notesFor(t,i,Math.floor(local/16),local%16,project.seed,HaloComposition.offsets[project.key],project.bars,clock),time,HaloSounds.velocityFor(t,i,clock,project.seed,project.bars),HaloSounds.soundFor(t))});
  }
  const full=await ctx.startRendering();
  return {length,numberOfChannels:2,sampleRate:rate,getChannelData(ch){return full.getChannelData(ch).subarray(length,length*2)}};
 }
 async function checkMp3(){
  const config={codec:'mp3',sampleRate:44100,numberOfChannels:2,bitrate:192000};
  if(!root.AudioEncoder||!root.AudioData)throw Error('MP3 is unavailable in this browser. Use WAV export.');
  let support;try{support=await AudioEncoder.isConfigSupported(config)}catch{throw Error('MP3 is unavailable in this browser. Use WAV export.')}
  if(!support.supported)throw Error('MP3 is unavailable in this browser. Use WAV export.');
  return config;
 }
 async function mp3(buffer){
  const config=await checkMp3();
  const chunks=[];let failure;
  const encoder=new AudioEncoder({output(chunk){const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes)},error(e){failure=e}});
  try{
   encoder.configure(config);
   for(let at=0;at<buffer.length;at+=1152){const count=Math.min(1152,buffer.length-at),pcm=new Float32Array(count*2);for(let ch=0;ch<2;ch++)pcm.set(buffer.getChannelData(ch).subarray(at,at+count),ch*count);
    const data=new AudioData({format:'f32-planar',sampleRate:buffer.sampleRate,numberOfFrames:count,numberOfChannels:2,timestamp:Math.round(at/buffer.sampleRate*1000000),data:pcm});try{encoder.encode(data)}finally{data.close()}
    if(encoder.encodeQueueSize>32)await encoder.flush();
   }
   await encoder.flush();if(failure)throw failure;return new Blob(chunks,{type:'audio/mpeg'});
  }finally{encoder.close()}
 }
 root.HaloExport={render,mp3,checkMp3};
})(globalThis);
