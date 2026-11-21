(function(root){
 'use strict';
 async function externalRenderer(ctx,project){
  const media=root.HaloExternalMedia,clips=media?.included(project)??[];
  if(!clips.length||project.externalLink.mute)return null;
  await media.checkProject(project);
  const decoded=await media.buffers(ctx,clips);
  let voice=null,destination=null;
  return (engine,time,position,phrase='phrase:0',local=position)=>{
   const at=(clip,step)=>step>=clip.start&&step<clip.start+clip.steps;
   const clip=clips.find(c=>c.scope==='song'&&at(c,position))||clips.find(c=>c.scope===phrase&&at(c,local));
   const step=clip?.scope==='song'?position:local;
   if(voice&&voice.id===clip?.id&&step===voice.step+1){voice.step=step;return;}
   if(!(voice&&clip&&voice.id===clip.id&&step===clip.start&&voice.player.end<=time+.0001))voice?.player.stop(time);
   voice=null;
   if(!clip)return;
   if(!destination){destination=ctx.createGain();destination.gain.value=project.externalLink.volume/100;destination.connect(engine.master);}
   const player=media.schedule(engine,destination,decoded.get(clip.id),clip,time,step,project.tempo);
   if(player)voice={id:clip.id,step,player};
  };
 }
 async function render(project){
  if(project.format==='halo-composition')return renderSong(project);
  const spb=project.timeSignature==='3/4'?12:16,phraseSteps=project.bars*spb;
  const rate=44100,seconds=project.bars*(project.timeSignature==='3/4'?3:4)*60/project.tempo,length=Math.round(seconds*rate);
  const ctx=new OfflineAudioContext(2,length*2,rate);
  const samples=HaloSounds.needsSamples(project)?await HaloSamples.prepare(ctx,HaloSounds.requiredSampleBanks(project)):{};
  const tracks=project.tracks.map(t=>({...t,setup:project.setup,phraseBars:project.bars,timeSignature:project.timeSignature,...(!(t.generator>=3)||t.exact?{manualSteps:t.steps,manualBars:project.bars}:{})}));HaloSounds.arrange(tracks);
  const engine=HaloAudio.create(ctx,tracks,project.masterVolume,samples,project.mix,project.tempo);
  // One warm-up loop initializes envelopes/reverb; export the next exact loop.
  if(root.HaloLiveLoop){
   await root.HaloLiveLoop.ready();
   if(project.liveLoop){root.HaloLiveLoop.renderPhraseOffline(ctx,engine,project.bars,project.tempo,project.liveLoop,0,project.key);root.HaloLiveLoop.renderPhraseOffline(ctx,engine,project.bars,project.tempo,project.liveLoop,seconds,project.key);}
  }
  const external=await externalRenderer(ctx,project);
  for(let step=0;step<phraseSteps*2;step++){
   const absolute=(project.startStep||0)+step-phraseSteps,local=((absolute%phraseSteps)+phraseSteps)%phraseSteps,time=step*60/project.tempo/4;
   external?.(engine,time,local);
   tracks.forEach((t,i)=>{const clock=t.generator>=3?absolute:local;if(!HaloSounds.shouldTrigger(t,i,clock,project.seed,project.bars,project.timeSignature))return;engine.play(i,HaloSounds.notesFor(t,i,Math.floor(local/spb),local%spb,project.seed,HaloComposition.offsets[project.key],project.bars,clock,t.generator===4?HaloComposition.modes[project.key]:'minor',project.timeSignature),time,HaloSounds.velocityFor(t,i,clock,project.seed,project.bars),HaloSounds.soundFor(t))});
  }
  const full=await ctx.startRendering();
  return {length,numberOfChannels:2,sampleRate:rate,getChannelData(ch){return full.getChannelData(ch).subarray(length,length*2)}};
 }
 async function renderSong(song){
  if(root.HaloLiveLoop)await root.HaloLiveLoop.ready();
  const totalSteps=song.sections.reduce((sum,s,i)=>{const p=HaloSong.phrase(song,i);return sum+p.bars*(p.timeSignature==='3/4'?12:16)*s.repeats},0);
  const rate=44100,length=Math.round(totalSteps*(60/song.tempo/4)*rate),ctx=new OfflineAudioContext(2,length,rate);
  const samples=HaloSounds.needsSamples(song)?await HaloSamples.prepare(ctx,HaloSounds.requiredSampleBanks(song)):{};
  const external=await externalRenderer(ctx,song);
  const tracks=Array.from({length:8},()=>({}));let engine=null,last=-1;
  for(let step=0;step<totalSteps;step++){
   const event=HaloSong.at(song,step),p=event.project,time=step*60/song.tempo/4,spb=p.timeSignature==='3/4'?12:16;
   if(last!==event.index){tracks.forEach((t,i)=>{for(const k of Object.keys(t))delete t[k];Object.assign(t,p.tracks[i],{setup:p.setup,phraseBars:p.bars,timeSignature:p.timeSignature});if(!(t.generator>=3)||t.exact){t.manualSteps=[...t.steps];t.manualBars=p.bars}});HaloSounds.arrange(tracks);if(!engine)engine=HaloAudio.create(ctx,tracks,song.masterVolume,samples,song.mix,song.tempo);else tracks.forEach((t,i)=>engine.update(i,time));last=event.index}
   external?.(engine,time,step,'phrase:'+song.sections[event.index].phrase,event.local);
   if(event.local===0&&root.HaloLiveLoop)root.HaloLiveLoop.renderPhraseOffline(ctx,engine,p.bars,song.tempo,p.liveLoop,time,p.key);
   engine.master?.gain.setTargetAtTime(song.masterVolume/100*event.gain,time,.05);
   tracks.forEach((t,i)=>{const clock=t.generator>=3?event.absolute:event.local;if(!HaloSounds.shouldTrigger(t,i,clock,p.seed,p.bars,p.timeSignature))return;engine.play(i,HaloSounds.notesFor(t,i,Math.floor(event.local/spb),event.local%spb,p.seed,HaloComposition.offsets[p.key],p.bars,clock,t.generator===4?HaloComposition.modes[p.key]:'minor',p.timeSignature),time,HaloSounds.velocityFor(t,i,clock,p.seed,p.bars)*event.gain,HaloSounds.soundFor(t))});
  }
  return ctx.startRendering();
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
