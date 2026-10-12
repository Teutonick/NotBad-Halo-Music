/* Web Audio only: events arrive from the shared lookahead scheduler. */
(function (root) {
  'use strict';
  function create(ctx, tracks) {
    const master = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
    master.gain.value = .52;
    compressor.threshold.value = -20; compressor.knee.value = 20;
    compressor.ratio.value = 4; compressor.attack.value = .008; compressor.release.value = .3;
    master.connect(compressor); compressor.connect(ctx.destination);
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
    const sends = [], voices = tracks.map(() => new Set());
    const trackGains = tracks.map(t => {
      const gain = ctx.createGain(), send = ctx.createGain();
      gain.gain.value = t.on ? t.level / 100 : 0;
      send.gain.value = t.space / 100 * .8;
      gain.connect(master); gain.connect(send); send.connect(reverb); sends.push(send);
      return gain;
    });
    function update(index) {
      const t = tracks[index], now = ctx.currentTime;
      trackGains[index].gain.setTargetAtTime(t.on ? t.level / 100 : 0, now, .04);
      sends[index].gain.setTargetAtTime(t.space / 100 * .8, now, .06);
      for (const voice of voices[index]) {
        voice.filter.frequency.setTargetAtTime(cutoff(t, voice.patch), now, .06);
      }
    }
    function cutoff(t, patch) {
      return Math.min(ctx.sampleRate * .42, Math.max(100, patch.tone * Math.pow(2, (t.character - 50) / 45)));
    }
    function play(index, notes, time, velocity, patch) {
      const t = tracks[index], active = voices[index];
      // Four sustained events per track; stolen events finish a short release.
      if (active.size >= 4) {
        const oldest = active.values().next().value;
        oldest.release(); active.delete(oldest);
      }
      const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      filter.type = patch.filter || 'lowpass'; filter.Q.value = .65;
      filter.frequency.value = cutoff(t, patch); gain.gain.value = .00001;
      gain.connect(filter); filter.connect(trackGains[index]);
      const duration = Math.min(8, Math.max(.08, patch.decay * (.35 + t.duration / 100 * 1.3)));
      const attack = patch.engine === 'pad' || patch.ambient ? .35 : .012;
      const peak = velocity * (patch.ambient ? .03 : patch.engine === 'noise' ? .035 : .06);
      gain.gain.setValueAtTime(.00001, time);
      gain.gain.exponentialRampToValueAtTime(peak, time + attack);
      gain.gain.exponentialRampToValueAtTime(.00001, time + attack + duration);
      const end = time + attack + duration + .06, sources = [];
      let remaining = 0, released = false;
      const voice = { filter, patch, release() {
        if (released) return; released = true;
        const now = ctx.currentTime;
        if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
        else { gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(.00001, now); }
        gain.gain.setTargetAtTime(.00001, now, .012);
        sources.forEach(source => source.stop(now + .06));
      } };
      const cleanup = () => {
        active.delete(voice); gain.disconnect(); filter.disconnect();
      };
      function start(source, amplitude) {
        const level = ctx.createGain(); level.gain.value = amplitude;
        source.connect(level); level.connect(gain); sources.push(source); remaining++;
        source.onended = () => { source.disconnect(); level.disconnect(); if (--remaining === 0) cleanup(); };
        source.start(time); source.stop(end);
      }
      function tone(hz, wave, amplitude, detune = 0, sweep = false) {
        const o = ctx.createOscillator(); o.type = wave; o.detune.value = detune;
        o.frequency.setValueAtTime(hz, time);
        if (sweep) o.frequency.exponentialRampToValueAtTime(hz * .35, time + Math.min(.2, duration));
        start(o, amplitude);
      }
      active.add(voice);
      if (patch.engine === 'noise') {
        const source = ctx.createBufferSource(); source.buffer = noiseBuffer; source.loop = true; start(source, 1);
      } else if (patch.engine === 'kick' || patch.engine === 'drop') {
        tone(patch.engine === 'kick' ? 115 : 950, 'sine', 1, 0, true);
      } else {
        const pitches = notes.slice(0, 3);
        pitches.forEach(n => {
          const hz = 440 * Math.pow(2, (n - 69) / 12), weight = 1 / pitches.length;
          tone(hz, patch.wave || (patch.engine === 'pluck' ? 'triangle' : 'sine'), weight * .78);
          if (patch.engine === 'pad') tone(hz * (patch.ratio || 1.002), patch.wave || 'triangle', weight * .22, patch.detune || 4);
          else if (patch.engine !== 'bass') tone(hz * (patch.ratio || (patch.engine === 'wood' ? 4 : 2.005)), 'sine', weight * .22);
        });
        if (!pitches.length) cleanup();
      }
    }
    return { ctx, master, trackGains, update, play, voices };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
