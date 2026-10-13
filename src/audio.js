/* Web Audio only: events arrive from the shared lookahead scheduler. */
(function (root) {
  'use strict';
  const selectSample=typeof module!=='undefined'&&module.exports?require('./samples.js').select:root.HaloSamples.select;
  const roles=typeof module!=='undefined'&&module.exports?require('./roles.js'):root.HaloRoles;
  function create(ctx, tracks,volume=50,sampleBank={},mix={low:0,mid:0,high:0,width:35}) {
    const master = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
    master.gain.value = Math.max(0,Math.min(100,volume))/100;
    compressor.threshold.value = -20; compressor.knee.value = 20;
    compressor.ratio.value = 4; compressor.attack.value = .008; compressor.release.value = .3;
    const eq=['lowshelf','peaking','highshelf'].map((type,i)=>{const n=ctx.createBiquadFilter();n.type=type;n.frequency.value=[120,1000,6000][i];n.Q.value=.7;return n}),headroom=ctx.createGain();
    master.connect(headroom);headroom.connect(eq[0]);eq[0].connect(eq[1]);eq[1].connect(eq[2]);eq[2].connect(compressor);compressor.connect(ctx.destination);
    const reverb = ctx.createConvolver(), wet = ctx.createGain();
    wet.gain.value = .18; reverb.connect(wet); wet.connect(master);
    const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.6), ctx.sampleRate);
    let seed = 147;
    const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let n = 0; n < data.length; n++) data[n] = noise() * Math.pow(1 - n / data.length, 2.9) * .5;
    }
    reverb.buffer = impulse;
    // One shared, deterministic buffer, not a new allocation on every trigger.
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let n = 0; n < data.length; n++) data[n] = noise() * .65;
    const sends = [], panners=[], voices = tracks.map(() => new Set());
    const trackGains = tracks.map((t,i) => {
      const gain = ctx.createGain(), send = ctx.createGain();
      gain.gain.value = t.on ? t.level / 100 * 2 * (t.ensembleGain||1) : 0;
      send.gain.value = t.space / 100 * .8;
      if(ctx.createStereoPanner){const pan=ctx.createStereoPanner();gain.connect(pan);pan.connect(master);panners[i]=pan}else gain.connect(master);
      gain.connect(send); send.connect(reverb); sends.push(send);
      return gain;
    });
    let sceneWidth=0;
    function panFor(i){return ['pulse','kick','bass'].includes(tracks[i].arrangement?.role)?(i%2?.06:-.06):[-.06,.08,-.55,.5,-.14,.4,-.7,.7][i]}
    function setMix(value,at=ctx.currentTime){
      const gains=['low','mid','high'].map(key=>Math.max(-9,Math.min(9,Number(value[key])||0)));
      eq.forEach((node,i)=>node.gain.setTargetAtTime(gains[i],at,.05));
      headroom.gain.setTargetAtTime(Math.pow(10,-Math.max(0,...gains)/20),at,.05);
      sceneWidth=Math.max(0,Math.min(100,Number(value.width)||0))/100;
      panners.forEach((node,i)=>node.pan.setTargetAtTime(panFor(i)*sceneWidth,at,.05));
    }
    setMix(mix);
    function update(index, at=ctx.currentTime) {
      const t = tracks[index], now = at;
      panners[index]?.pan.setTargetAtTime(panFor(index)*sceneWidth,now,.05);
      trackGains[index].gain.setTargetAtTime(t.on ? t.level / 100 * 2 * (t.ensembleGain||1) : 0, now, .04);
      sends[index].gain.setTargetAtTime(t.space / 100 * .8, now, .06);
      for (const voice of voices[index]) {
        voice.filter.frequency.setTargetAtTime(cutoff(t, voice.patch), now, .06);
      }
    }
    function cutoff(t, patch) {
      return Math.min(ctx.sampleRate * .42, Math.max(100, patch.tone * Math.pow(2, (t.character - 50) / 45)));
    }
    function play(index, notes, time, velocity, patch) {
      if(patch.sampleBank&&!sampleBank[patch.sampleBank]?.length)throw Error('Sample bank is not ready');
      const t = tracks[index], active = voices[index];
      if(t.generator===3&&!roles.compatible(t,patch))throw Error('Sound is incompatible with track role');
      const policy=t.generator===3?roles.voicePolicy(t,patch):null;
      const pitches=notes.slice(0,policy?.maxNotes||3),noteCount=Math.max(1,pitches.length);
      const ringingGuitar = !!patch.sampleBank && patch.engine === 'guitar' && (!policy||policy.naturalGuitar);
      for(const voice of active)if(voice.end<=time)active.delete(voice);
      if(ringingGuitar&&!policy)for(const voice of [...active]){voice.release(time);active.delete(voice);}
      // Four sustained events per track; stolen events finish a short release.
      while(policy?[...active].reduce((n,v)=>n+v.noteCount,0)+noteCount>policy.voices:active.size>=4){
        const oldest = active.values().next().value;
        oldest.release(time); active.delete(oldest);
      }
      const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      filter.type = patch.filter || 'lowpass'; filter.Q.value = .65;
      filter.frequency.value = cutoff(t, patch); gain.gain.value = .00001;
      const processing=[];
      if(patch.drive){
        const shaper=ctx.createWaveShaper(),dc=ctx.createBiquadFilter(),cabinet=ctx.createBiquadFilter();
        const curve=new Float32Array(1024),drive=patch.drive;
        for(let j=0;j<curve.length;j++){const x=j*2/(curve.length-1)-1;curve[j]=Math.tanh(x*drive)/Math.tanh(drive)}
        shaper.curve=curve;shaper.oversample='2x';dc.type='highpass';dc.frequency.value=35;
        cabinet.type='lowpass';cabinet.frequency.value=Math.min(ctx.sampleRate*.42,patch.engine==='rockbass'?3200:5500);cabinet.Q.value=.5;
        filter.connect(shaper);shaper.connect(dc);dc.connect(cabinet);cabinet.connect(gain);gain.connect(trackGains[index]);processing.push(shaper,dc,cabinet);
      }else {gain.connect(filter);filter.connect(trackGains[index]);}
      const duration = Math.min(policy?.maxDuration||8, Math.max(.08, patch.decay * (.35 + t.duration / 100 * 1.3)));
      const rockDrum=patch.sampleBank&&['kick','snare','tom'].includes(patch.engine);
      const attack = policy?.attack ?? (patch.engine === 'pad' || patch.ambient ? .35 : patch.punch || rockDrum ? .003 : .012);
      const peak = velocity * (rockDrum ? (patch.engine==='kick'?.14:.11) : patch.id.startsWith('reactor-') ? .065 : patch.punch ? .095 : patch.ambient ? .03 : patch.engine === 'noise' ? .035 : .06);
      gain.gain.setValueAtTime(.00001, time);
      gain.gain.exponentialRampToValueAtTime(peak, time + attack);
      if(patch.sampleBank&&!ringingGuitar)gain.gain.exponentialRampToValueAtTime(peak*.8,time+attack+duration*.65);
      if(!ringingGuitar)gain.gain.exponentialRampToValueAtTime(.00001, time + attack + duration);
      const end = time + attack + duration + .06, sources = [];
      let remaining = 0, released = false;
      const voice = { filter, patch, end,noteCount, release(at=ctx.currentTime) {
        if (released) return; released = true;
        const now = at;
        if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
        else { gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(peak, now); }
        gain.gain.setTargetAtTime(.00001, now, .012);
        sources.forEach(source => source.stop(now + .06));
      } };
      const cleanup = () => {
        active.delete(voice); gain.disconnect(); filter.disconnect();processing.forEach(node=>node.disconnect());
      };
      function start(source, amplitude) {
        const level = ctx.createGain(); level.gain.value = amplitude;
        source.connect(level); level.connect(patch.drive?filter:gain); sources.push(source); remaining++;
        source.onended = () => { source.disconnect(); level.disconnect(); if (--remaining === 0) cleanup(); };
        source.start(time); source.stop(ringingGuitar ? time + source.buffer.duration / source.playbackRate.value : end);
      }
      function tone(hz, wave, amplitude, detune = 0, sweep = false) {
        const o = ctx.createOscillator(); o.type = wave; o.detune.value = detune;
        o.frequency.setValueAtTime(hz, time);
        if (sweep) o.frequency.exponentialRampToValueAtTime(hz * .35, time + Math.min(.2, duration));
        start(o, amplitude);
      }
      active.add(voice);
      if(patch.sampleBank){
        const samplePitches=pitches.length?pitches:[0];
        const regions=sampleBank[patch.sampleBank];
        samplePitches.forEach(note=>{
          const region=selectSample(regions,note,velocity);
          const source=ctx.createBufferSource();source.buffer=region.buffer;
          const rate=Math.pow(2,(note-region.root)/12);
          source.playbackRate.value=rate;source.playbackRate.setValueAtTime(rate,time);
          if(ringingGuitar)voice.end=Math.max(voice.end,time+region.buffer.duration/rate);
          start(source,1/samplePitches.length);
        });
      } else if (['noise','snare','clap'].includes(patch.engine)) {
        const source = ctx.createBufferSource(); source.buffer = noiseBuffer; source.loop = true; start(source, 1);
        if (patch.engine === 'snare') tone(patch.bodyHz||185, 'triangle', .3);
        if (patch.engine === 'clap') {
          // Three fast attacks create a clap transient, then a short noise tail.
          for (const offset of [.018,.036]) {
            gain.gain.exponentialRampToValueAtTime(peak * .12, time + offset - .004);
            gain.gain.exponentialRampToValueAtTime(peak, time + offset);
          }
          gain.gain.exponentialRampToValueAtTime(.00001, time + attack + duration);
        }
      } else if (patch.engine === 'kick' || patch.engine === 'drop') {
        tone(patch.engine === 'kick' ? (patch.startHz || (patch.punch ? 165 : 115)) : 950, 'sine', 1, 0, true);
        if (patch.punch) tone(1100, 'sine', .07, 0, true);
      } else {
        pitches.forEach(n => {
          const hz = 440 * Math.pow(2, (n - 69) / 12), weight = 1 / pitches.length;
          tone(hz, patch.wave || (patch.engine === 'pluck' ? 'triangle' : 'sine'), weight * .78);
          if (patch.engine === 'pad') tone(hz * (patch.ratio || 1.002), patch.wave || 'triangle', weight * .22, patch.detune || 4);
          else if (patch.engine !== 'bass') tone(hz * (patch.ratio || (patch.engine === 'wood' ? 4 : 2.005)), 'sine', weight * .22);
        });
        if (!pitches.length) cleanup();
      }
    }
    return { ctx, master, trackGains, eq,headroom,panners,setMix, update, play, voices,setSamples(value){sampleBank=value} };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
