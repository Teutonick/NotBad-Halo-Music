/* src/live-loop.js — NotBad Halo Track 09: Live Loop Audio Layer & Recorder */
(function (root) {
  'use strict';

  const DB_NAME = 'halo-live-loop-v1';
  const DB_VERSION = 1;
  const STORE_LAYERS = 'audio-layers';
  const STORE_SETTINGS = 'settings';
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_DURATION_SEC = 120; // 120s max

  const defaultSettings = {
    bars: 4,
    level: 75,
    pan: 0,
    space: 20,
    delay: 0,
    delayTime: '1/8',
    mute: false,
    solo: false,
    trimStart: 0.0,
    trimEnd: 1.0,
    offsetSec: 0.0,
    latencyMs: 40,
    monitor: false,
    copyrightConfirmed: false,
    instantRestart: true,
    pitch: 0,
    reverse: false,
    mode: 'loop', // 'loop' | 'slice' | 'pitch'
    rootNote: 62,
    pitchOctave: 0,
    pitchSteps: [0,-1,2,-1,4,-1,2,-1,0,-1,3,-1,4,-1,2,7],
    sliceCount: 8, // 4 | 8 | 16
    slicePattern: 'beat', // 'beat' | 'chrono' | 'shuffle' | 'arpeggio' | 'custom'
    sliceSteps: [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 3, -1, 2, -1, 1, 3],
    character: 60,
    duration: 65,
    density: 75,
    chorus: 0,
    cycle: 16,
    stepLength: 1,
    offset: 0,
    slicePoints: null
  };

  const IDB = {
    open() {
      if (typeof indexedDB === 'undefined') return Promise.resolve(null);
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_LAYERS)) {
              db.createObjectStore(STORE_LAYERS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
              db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    },
    async saveSettings(settings) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_SETTINGS, 'readwrite');
          tx.objectStore(STORE_SETTINGS).put({ key: 'track09', ...settings });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async loadSettings() {
      const db = await this.open();
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_SETTINGS, 'readonly');
          const req = tx.objectStore(STORE_SETTINGS).get('track09');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
      });
    },
    async saveLayer(layer) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_LAYERS, 'readwrite');
          const pcmLBuf = layer.pcmL.buffer.slice(layer.pcmL.byteOffset, layer.pcmL.byteOffset + layer.pcmL.byteLength);
          const pcmRBuf = layer.pcmR ? layer.pcmR.buffer.slice(layer.pcmR.byteOffset, layer.pcmR.byteOffset + layer.pcmR.byteLength) : pcmLBuf;
          tx.objectStore(STORE_LAYERS).put({
            id: layer.id,
            timestamp: layer.timestamp,
            duration: layer.duration,
            bars: layer.bars,
            sampleRate: layer.sampleRate,
            pcmL: pcmLBuf,
            pcmR: pcmRBuf,
            gain: layer.gain,
            name: layer.name
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async deleteLayer(id) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_LAYERS, 'readwrite');
          tx.objectStore(STORE_LAYERS).delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async loadLayers() {
      const db = await this.open();
      if (!db) return [];
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_LAYERS, 'readonly');
          const req = tx.objectStore(STORE_LAYERS).getAll();
          req.onsuccess = () => {
            const list = (req.result || []).map(r => ({
              id: r.id,
              timestamp: r.timestamp,
              duration: r.duration,
              bars: r.bars,
              sampleRate: r.sampleRate,
              pcmL: new Float32Array(r.pcmL),
              pcmR: new Float32Array(r.pcmR || r.pcmL),
              gain: r.gain || 1,
              name: r.name || 'Layer'
            }));
            resolve(list);
          };
          req.onerror = () => resolve([]);
        } catch (_) { resolve([]); }
      });
    },
    async clearAll() {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction([STORE_LAYERS, STORE_SETTINGS], 'readwrite');
          tx.objectStore(STORE_LAYERS).clear();
          tx.objectStore(STORE_SETTINGS).clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    }
  };

  // State
  let settings = { ...defaultSettings };
  let layers = [];
  const layerLibrary = new Map();
  let phraseState = undefined;
  let ready = Promise.resolve();
  let initialized = false;
  let hydrated = false;
  let playbackSettings = null, playbackSlices = null;
  const copySettings = value => Object.fromEntries(Object.keys(defaultSettings).map(key=>[key,['sliceSteps','pitchSteps','slicePoints'].includes(key)?(Array.isArray(value[key])?[...value[key]]:(key==='slicePoints'?null:[...(defaultSettings[key]||[])])):value[key]??defaultSettings[key]]));
  let undoStack = [];
  let compositeBuffer = null;
  let bufferContext = null;
  function compositeContext(){return activeAudio?.ctx || bufferContext || (typeof root.AudioBuffer==='function'?{sampleRate:44100,createBuffer(channels,length,sampleRate){return new root.AudioBuffer({numberOfChannels:channels,length,sampleRate})}}:null)}
  let activeAudio = null;
  let trackContext = null;
  let trackGain = null, panner = null, reverbSend = null, delaySend = null, chorusSend = null;
  let activeSource = null;
  const playbackSources = new Set();
  let lastScheduledStep = -1;
  let envRef = null;

  // SLICE State
  let activeSliceVoice = null;
  let slices = [];
  let activeSliceIndex = -1;
  let activeSliceStep = -1;
  let hoveredDividerIndex = -1;
  let isCanvasDragOver = false;
  let dragMode = null;
  let dragDividerIndex = -1;
  let dragStrip = null;

  function detectTransients(buf, count, windowStartSec = 0, windowDurSec = 0) {
    if (!buf) return [];
    const sampleRate = buf.sampleRate || 44100;
    const pcm = buf.getChannelData(0);
    const totalLen = pcm.length;
    const dur = buf.duration || (totalLen / sampleRate);
    const winDur = (windowDurSec > 0 && windowDurSec <= dur) ? windowDurSec : dur;
    const winStart = Math.max(0, Math.min(Math.max(0, dur - winDur), windowStartSec || 0));

    const startSample = Math.floor(winStart * sampleRate);
    const numSamples = Math.min(totalLen - startSample, Math.floor(winDur * sampleRate));
    if (numSamples < 512) {
      return [{ index: 0, startSec: winStart, endSec: winStart + winDur, duration: winDur }];
    }

    const frameSize = 512;
    const hopSize = 256;
    const numFrames = Math.floor((numSamples - frameSize) / hopSize);
    if (numFrames < 4) {
      return [{ index: 0, startSec: winStart, endSec: winStart + winDur, duration: winDur }];
    }

    const energy = new Float32Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      const offset = startSample + i * hopSize;
      let sum = 0;
      for (let j = 0; j < frameSize; j += 2) {
        const val = pcm[offset + j] || 0;
        sum += val * val;
      }
      energy[i] = Math.sqrt(sum / (frameSize / 2));
    }

    const odf = new Float32Array(numFrames);
    let maxFlux = 0.0001;
    for (let i = 1; i < numFrames; i++) {
      const diff = energy[i] - energy[i - 1];
      if (diff > 0) {
        odf[i] = diff;
        if (diff > maxFlux) maxFlux = diff;
      }
    }

    const minSecDistance = 0.065;
    const threshold = maxFlux * 0.12;
    const candidates = [];

    for (let i = 2; i < numFrames - 2; i++) {
      const val = odf[i];
      if (val >= threshold && val > odf[i - 1] && val >= odf[i + 1]) {
        const peakTime = winStart + (i * hopSize) / sampleRate;
        if (peakTime > winStart + 0.04 && peakTime < winStart + winDur - 0.04) {
          candidates.push({ frame: i, time: peakTime, flux: val });
        }
      }
    }

    candidates.sort((a, b) => b.flux - a.flux);
    const pickedTimes = [];

    for (const c of candidates) {
      if (pickedTimes.length >= count - 1) break;
      const tooClose = pickedTimes.some(t => Math.abs(t - c.time) < minSecDistance);
      if (!tooClose) {
        pickedTimes.push(c.time);
      }
    }

    if (pickedTimes.length < count - 1) {
      for (let s = 1; s < count; s++) {
        const gridTime = winStart + (s / count) * winDur;
        const tooClose = pickedTimes.some(t => Math.abs(t - gridTime) < minSecDistance);
        if (!tooClose) {
          pickedTimes.push(gridTime);
          if (pickedTimes.length >= count - 1) break;
        }
      }
    }

    pickedTimes.sort((a, b) => a - b);

    const boundaries = [winStart, ...pickedTimes, winStart + winDur];
    const result = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const s0 = boundaries[i];
      const s1 = boundaries[i + 1];
      result.push({
        index: i,
        startSec: s0,
        endSec: s1,
        duration: Math.max(0.02, s1 - s0)
      });
    }
    return result;
  }

  function getPresetSlicePattern(patternName, count) {
    const N = Math.max(2, Math.min(16, count || 8));
    const steps = new Array(16).fill(-1);
    if (patternName === 'chrono') {
      if (N === 16) {
        for (let i = 0; i < 16; i++) steps[i] = i;
      } else if (N === 8) {
        for (let i = 0; i < 8; i++) steps[i * 2] = i;
      } else {
        for (let i = 0; i < 4; i++) steps[i * 4] = i;
      }
    } else if (patternName === 'shuffle') {
      const seq = [0, -1, 1 % N, 1 % N, 2 % N, -1, -1, 2 % N, 0, -1, 3 % N, -1, 1 % N, 1 % N, 4 % N, 5 % N];
      for (let i = 0; i < 16; i++) steps[i] = seq[i] === -1 ? -1 : seq[i] % N;
    } else if (patternName === 'arpeggio' || patternName === 'arp') {
      const seq = [0, -1, 1 % N, -1, 2 % N, -1, 3 % N, -1, 2 % N, -1, 1 % N, -1, 0, -1, 1 % N, -1];
      for (let i = 0; i < 16; i++) steps[i] = seq[i] === -1 ? -1 : seq[i] % N;
    } else {
      steps[0] = 0;
      steps[2] = 1 % N;
      steps[4] = (N >= 4 ? 2 : 1) % N;
      steps[6] = 1 % N;
      steps[8] = 0;
      steps[10] = (N >= 4 ? 3 : 1) % N;
      steps[12] = (N >= 4 ? 2 : 1) % N;
      steps[14] = 1 % N;
      steps[15] = (N >= 4 ? N - 1 : 0) % N;
    }
    return steps;
  }

  function randomizeSlicePattern(count) {
    const N = Math.max(2, Math.min(16, count || settings.sliceCount || 8));
    const steps = new Array(16).fill(-1);
    steps[0] = 0;
    [4, 8, 12].forEach(st => {
      if (Math.random() < 0.85) {
        steps[st] = Math.floor(Math.random() * N);
      }
    });
    [2, 6, 10, 14].forEach(st => {
      if (Math.random() < 0.65) {
        steps[st] = Math.floor(Math.random() * N);
      }
    });
    [1, 3, 5, 7, 9, 11, 13, 15].forEach(st => {
      if (Math.random() < 0.32) {
        steps[st] = Math.floor(Math.random() * N);
      }
    });
    return steps;
  }

  let samplerKey=0;
  function pitchWindow(tempo=72){
    if(!compositeBuffer)return null;
    const total=compositeBuffer.duration,window=Math.min(8,total);
    const offset=Math.max(0,Math.min(total-window,settings.offsetSec||0));
    const start=offset+Math.max(0,Math.min(.95,settings.trimStart||0))*window;
    const end=Math.min(total,offset+Math.max((settings.trimStart||0)+.01,Math.min(1,settings.trimEnd??1))*window);
    return {startSec:start,endSec:end,duration:Math.max(0,end-start)};
  }
  const noteName = midi => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);
  function pitchEvent(step,key=samplerKey){
    const length=settings.stepLength||1;if(step%length!==0)return null;
    const index=(Math.floor(step/length)+(settings.offset||0))%(settings.cycle||16)%16;
    const degree=settings.pitchSteps[index];
    if(degree<0||!Number.isInteger(degree))return null;
    const scale=root.HaloComposition?.modes?.[key]==='major'?[0,2,4,5,7,9,11,12]:[0,2,3,5,7,8,10,12];
    const note=62+(root.HaloComposition?.offsets?.[key]||0)+12*(settings.pitchOctave||0)+scale[degree];
    const semitones=note-settings.rootNote+(settings.pitch||0);
    if(!Number.isFinite(semitones)||Math.abs(semitones)>24)return null;
    const threshold=index%4===0?15:index%2===0?35:55;
    if(settings.density<threshold)return null;
    return {index,note,semitones,rate:Math.pow(2,semitones/12)};
  }
  function schedulePitch(ctx,destination,time,event,tempo,remaining=Infinity,previous){
    const window=pitchWindow(tempo),buffer=getPlaybackBuffer(ctx);
    if(!window||window.duration<.04||!buffer||!event)return null;
    const rate=event.rate;
    const durSetting=(typeof settings.duration==='number')?settings.duration:65;
    const durFraction=Math.max(0.05,Math.min(1.0,durSetting/100));
    const realDur=window.duration/rate;
    const targetDur=Math.max(0.035,realDur*durFraction);
    const gate=Math.min(targetDur,remaining);
    if(gate<.006)return null;
    if(previous){try{previous.gain.gain.cancelAndHoldAtTime?.(time);previous.gain.gain.linearRampToValueAtTime(.0001,time+.004);previous.source.stop(time+.005)}catch(_){}}
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.playbackRate.value=rate;
    let filter=null;
    if(ctx.createBiquadFilter){filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(250*Math.pow(80,settings.character/100),time);source.connect(filter);filter.connect(gain)}else source.connect(gain);
    gain.connect(destination);gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(.85,time+.003);
    const releaseDur=Math.min(0.025,Math.max(0.006,gate*0.08));
    const holdEnd=Math.max(time+0.004,time+gate-releaseDur);
    const end=time+gate;
    gain.gain.setValueAtTime(.85,holdEnd);
    if(gain.gain.linearRampToValueAtTime)gain.gain.linearRampToValueAtTime(.0001,end);else if(gain.gain.exponentialRampToValueAtTime)gain.gain.exponentialRampToValueAtTime(.0001,end);
    const offset=settings.reverse?Math.max(0,buffer.duration-window.endSec):window.startSec;
    source.start(time,offset,Math.min(window.duration,(gate*rate)+0.02));source.stop(end+.005);
    source.onended=()=>{try{source.disconnect();gain.disconnect();filter?.disconnect()}catch(_){}};
    return {source,gain,filter,stopTime:end+.005};
  }

  function rebuildSlices(forceDetect = false) {
    if (!compositeBuffer) {
      slices = [];
      return slices;
    }
    const tempo = envRef?.settings?.().tempo || 72;
    const loopDur = settings.mode==='pitch'?8:(settings.bars * 4 * 60) / tempo;
    const totalDur = compositeBuffer.duration;
    const isLonger = totalDur > loopDur + 0.05;
    const winDur = isLonger ? loopDur : totalDur;
    const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
    const trimStart = Math.max(0, Math.min(0.95, settings.trimStart || 0));
    const trimEnd = Math.max(trimStart + 0.01, Math.min(1.0, settings.trimEnd || 1));
    const startSec = offsetSec + trimStart * winDur;
    const activeDur = (trimEnd - trimStart) * winDur;
    const count = settings.sliceCount || 8;

    if (!forceDetect && settings.slicePoints && Array.isArray(settings.slicePoints) && settings.slicePoints.length === count - 1) {
      const boundaries = [startSec, ...settings.slicePoints.map(p => startSec + Math.max(0, Math.min(1.0, p)) * activeDur), startSec + activeDur];
      slices = [];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const s0 = boundaries[i];
        const s1 = boundaries[i + 1];
        slices.push({
          index: i,
          startSec: s0,
          endSec: s1,
          duration: Math.max(0.02, s1 - s0)
        });
      }
      return slices;
    }

    slices = detectTransients(compositeBuffer, count, startSec, activeDur);
    return slices;
  }

  function playSlice(sliceIndex, time, audioCtx, optionalTempo, remaining = Infinity) {
    if (!compositeBuffer) return;
    if (!slices || !slices.length) rebuildSlices();
    if (!slices || !slices.length) return;
    const slice = slices[Math.max(0, Math.min(slices.length - 1, sliceIndex))];
    if (!slice) return;

    const ctx = audioCtx || (activeAudio && activeAudio.ctx);
    if (!ctx) return;
    const atTime = (typeof time === 'number' && time >= ctx.currentTime) ? time : ctx.currentTime;

    if (activeSliceVoice) {
      try {
        if (activeSliceVoice.gain && activeSliceVoice.gain.gain) {
          try {
            if (activeSliceVoice.gain.gain.cancelAndHoldAtTime) {
              activeSliceVoice.gain.gain.cancelAndHoldAtTime(atTime);
            } else if (activeSliceVoice.gain.gain.cancelScheduledValues) {
              activeSliceVoice.gain.gain.cancelScheduledValues(atTime);
            }
          } catch (_) {}
          activeSliceVoice.gain.gain.setValueAtTime(activeSliceVoice.gain.gain.value, atTime);
          activeSliceVoice.gain.gain.linearRampToValueAtTime(0.0001, atTime + 0.004);
        }
        activeSliceVoice.source.stop(atTime + 0.005);
      } catch (_) {}
      activeSliceVoice = null;
    }

    const playBuf = getPlaybackBuffer(ctx);
    if (!playBuf) return;

    const source = ctx.createBufferSource();
    source.buffer = playBuf;

    const pitchVal = Number(settings.pitch) || 0;
    const rate = Math.pow(2, pitchVal / 12);
    if (pitchVal !== 0 && source.playbackRate) {
      source.playbackRate.value = rate;
    }

    let filter = null;
    if (ctx.createBiquadFilter) {
      try {
        filter = ctx.createBiquadFilter();
        const charVal = (typeof settings.character === 'number') ? settings.character : 60;
        const cutoff = 250 * Math.pow(20000 / 250, Math.max(0, Math.min(100, charVal)) / 100);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, atTime);
        filter.Q.value = 1.0;
      } catch (_) { filter = null; }
    }

    const vGain = ctx.createGain();
    const peak = 1.0;

    const durSetting = (typeof settings.duration === 'number') ? settings.duration : 65;
    const durFraction = Math.max(0.05, Math.min(1.0, durSetting / 100));
    const realDur = slice.duration / rate;
    const targetDur = Math.max(0.035, realDur * durFraction);
    const gateDur = Math.min(targetDur, (typeof remaining === 'number' && remaining > 0) ? remaining : targetDur);
    const releaseDur = Math.min(0.025, Math.max(0.006, gateDur * 0.08));
    const holdEnd = Math.max(atTime + 0.004, atTime + gateDur - releaseDur);
    const soundEnd = atTime + gateDur;

    vGain.gain.setValueAtTime(0.0001, atTime);
    vGain.gain.linearRampToValueAtTime(peak, atTime + 0.003);
    vGain.gain.setValueAtTime(peak, holdEnd);
    if (vGain.gain.linearRampToValueAtTime) {
      vGain.gain.linearRampToValueAtTime(0.0001, soundEnd);
    } else if (vGain.gain.exponentialRampToValueAtTime) {
      vGain.gain.exponentialRampToValueAtTime(0.0001, soundEnd);
    }

    if (filter) {
      source.connect(filter);
      filter.connect(vGain);
    } else {
      source.connect(vGain);
    }
    if (trackGain) vGain.connect(trackGain);

    let sliceStart = slice.startSec;
    if (settings.reverse) {
      const totalBufDur = playBuf.duration;
      sliceStart = Math.max(0, Math.min(totalBufDur - slice.duration, totalBufDur - (slice.startSec + slice.duration)));
    }

    const bufferDur = Math.min(slice.duration, (gateDur * rate) + 0.02);
    source.start(atTime, sliceStart, bufferDur);
    source.stop(soundEnd + 0.005);

    activeSliceVoice = { source, gain: vGain, filter, stopTime: soundEnd + 0.005 };
    activeSliceIndex = sliceIndex;

    if (typeof root.HaloPulse === 'function') {
      root.HaloPulse(8, atTime);
    } else if (envRef?.pulse) {
      envRef.pulse(8, atTime);
    }
  }

  function getSlicePhraseSteps(phraseStart = 0, phraseBars = 4) {
    const events = [];
    const totalSteps = phraseBars * 16;
    if (!compositeBuffer) return events;

    if(settings.mode==='pitch')return Array.from({length:totalSteps},(_,step)=>({step,candidate:!!pitchEvent(phraseStart+step),fires:!!pitchEvent(phraseStart+step)}));
    if (settings.mode === 'slice') {
      if (!slices.length) rebuildSlices();
      const stepLen = settings.stepLength || 1;
      const cycleLen = settings.cycle || 16;
      const dens = (typeof settings.density === 'number') ? settings.density : 75;

      for (let step = 0; step < totalSteps; step++) {
        const absS = phraseStart + step;
        if (absS % stepLen === 0) {
          const s = Math.floor(absS / stepLen);
          const patternStep = (s + (settings.offset || 0)) % cycleLen;
          const stepIdx = patternStep % 16;
          const sliceIdx = (settings.sliceSteps && typeof settings.sliceSteps[stepIdx] === 'number') ? settings.sliceSteps[stepIdx] : -1;
          const isCandidate = sliceIdx >= 0;
          const isAnchor = (stepIdx % 4 === 0);
          const isMedium = (stepIdx % 2 === 0);
          const threshold = isAnchor ? 15 : (isMedium ? 35 : 55);
          const fires = isCandidate && (dens >= threshold);
          events.push({ step, fires, candidate: isCandidate, sliceIndex: sliceIdx });
        } else {
          events.push({ step, fires: false, candidate: false });
        }
      }
    } else {
      for (let step = 0; step < totalSteps; step++) {
        const isLoopStart = (step % (settings.bars * 16) === 0);
        const isDownbeat = (step % 16 === 0);
        events.push({ step, fires: isLoopStart, candidate: isDownbeat });
      }
    }
    return events;
  }

  function randomizeSlice(seed) {
    if (!compositeBuffer) return;
    const rng = (offset) => {
      const x = Math.sin((seed || 1) * 91.17 + offset * 13.37) * 43758.5453;
      return x - Math.floor(x);
    };

    if(settings.mode==='pitch'){
      settings.pitchSteps=Array.from({length:16},(_,i)=>i%4===0?0:rng(30+i)<.45?-1:Math.floor(rng(50+i)*8));
      settings.duration=Math.round(40+rng(4)*40);settings.density=Math.round(65+rng(5)*25);
      settings.space=Math.round(15+rng(7)*35);settings.delay=Math.round(rng(8)*25);
    } else if (settings.mode === 'slice') {
      const patterns = ['beat', 'chrono', 'shuffle', 'arpeggio'];
      const patIndex = Math.floor(rng(1) * patterns.length);
      settings.slicePattern = patterns[patIndex];

      const counts = [4, 8, 16];
      settings.sliceCount = counts[Math.floor(rng(2) * counts.length)];

      settings.character = Math.round(35 + rng(3) * 55);
      settings.duration = Math.round(45 + rng(4) * 45);
      settings.density = Math.round(50 + rng(5) * 40);
      settings.pan = Math.round(rng(6) * 80 - 40);
      settings.space = Math.round(15 + rng(7) * 35);
      settings.delay = Math.round(rng(8) * 35);
      settings.chorus = Math.round(rng(9) * 30);

      const cycles = [8, 16, 16, 32];
      settings.cycle = cycles[Math.floor(rng(10) * cycles.length)];
      const steps = [1, 1, 1, 2];
      settings.stepLength = steps[Math.floor(rng(11) * steps.length)];
      settings.offset = Math.floor(rng(12) * 8);

      rebuildSlices();
      settings.sliceSteps = getPresetSlicePattern(settings.slicePattern, settings.sliceCount);
    } else {
      settings.space = Math.round(15 + rng(7) * 35);
      settings.delay = Math.round(rng(8) * 35);
      settings.pan = Math.round(rng(6) * 60 - 30);
    }

    updateMixerNodes();
    persistSettings();
    renderWaveform();
    renderUI();
    if(settings.mode==='pitch')triggerQuantizedLoopRestart();
  }

  // Recording State
  let recordingState = 'idle'; // 'idle' | 'preroll' | 'recording' | 'overdubbing' | 'looping'
  let isOverdubMode = false;
  let recordStartStep = -1;
  let recordStartTime = 0;
  let recordTargetSteps = 64;
  let micStream = null;
  let micSourceNode = null;
  let processorNode = null;
  let analyserNode = null;
  let recAnimFrame = null;
  let recWaveData = [];
  let dummyGain = null;
  let recordedChunks = [];
  let loopPlayStartTime = 0;
  let loopPlayDuration = 0;
  let isPlaybackRunning = false;
  let reversedBuffer = null;
  let pendingQuantizedRestart = false;
  let loopAnchorStep = 0;

  function getReversedBuffer(ctx, buf) {
    if (!buf || !ctx) return null;
    try {
      const numChannels = buf.numberOfChannels;
      const length = buf.length;
      const rev = ctx.createBuffer(numChannels, length, buf.sampleRate);
      for (let ch = 0; ch < numChannels; ch++) {
        const srcData = buf.getChannelData(ch);
        const dstData = rev.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          dstData[i] = srcData[length - 1 - i];
        }
      }
      return rev;
    } catch (_) {
      return null;
    }
  }

  function getPlaybackBuffer(ctx) {
    if (!compositeBuffer) return null;
    if (!settings.reverse) return compositeBuffer;
    const c = ctx || (activeAudio && activeAudio.ctx);
    if (!c) return compositeBuffer;
    if (!reversedBuffer || reversedBuffer.length !== compositeBuffer.length || reversedBuffer.sampleRate !== compositeBuffer.sampleRate) {
      reversedBuffer = getReversedBuffer(c, compositeBuffer);
    }
    return reversedBuffer || compositeBuffer;
  }

  function triggerSampleRestart(immediate = false) {
    triggerQuantizedLoopRestart();
  }

  function triggerQuantizedLoopRestart() {
    if (!settings.instantRestart) return;
    const playing = envRef?.isPlaying ? envRef.isPlaying() : isPlaybackRunning;
    if (!playing) return;
    pendingQuantizedRestart = true;
    const restart = envRef?.retriggerPhrase || root.HaloRetriggerPhrase;
    if (typeof restart === 'function') restart(true);
  }

  function capturePhrase() {
    for (const layer of layers) {
      if (!Number.isSafeInteger(layer.id)) layer.id = Date.now() + layerLibrary.size;
      layerLibrary.set(layer.id, layer);
    }
    return {version:1,settings:copySettings(settings),layerIds:initialized&&!hydrated&&phraseState?.layerIds?.length?[...phraseState.layerIds]:layers.map(l=>l.id)};
  }

  function restorePhrase(value, time) {
    capturePhrase();
    if(recordingActive())cancelInputCapture();
    phraseState = value === undefined ? null : value;
    settings = copySettings({...defaultSettings,...value?.settings});
    layers = (value?.layerIds || []).map(id=>layerLibrary.get(id)).filter(Boolean);
    undoStack = [];
    stopPlayback(time);
    compositeBuffer = layers.length ? buildCompositeBuffer(compositeContext(),layers) : null;
    reversedBuffer = null;
    playbackSettings = copySettings(settings);
    pendingQuantizedRestart = false;
    loopAnchorStep = 0;
    lastScheduledStep = -1;
    slices = [];
    if (compositeBuffer){rebuildSlices();playbackSlices=slices;}
    updateMixerNodes(time);
    const container=typeof document!=='undefined'?document.getElementById('liveLoopPanel'):null;
    if(container?.children?.length)createUI(container,envRef);else renderUI();
  }

  function tr(ru, en) {
    if (!envRef || typeof envRef.language !== 'function') return ru;
    return envRef.language() === 'ru' ? ru : en;
  }

  function buildCompositeBuffer(ctx, layerList, targetDuration) {
    reversedBuffer = null;
    if (!layerList.length || !ctx) return null;
    bufferContext=ctx;
    const sampleRate = ctx.sampleRate || 44100;
    let maxLayerDur = 0;
    for (const l of layerList) {
      const d = l.duration || (l.pcmL ? l.pcmL.length / (l.sampleRate || sampleRate) : 0);
      if (d > maxLayerDur) maxLayerDur = d;
    }
    const dur = Math.max(targetDuration || 0, maxLayerDur);
    const length = Math.max(1, Math.round(dur * sampleRate));
    const buf = ctx.createBuffer(2, length, sampleRate);
    const outL = buf.getChannelData(0);
    const outR = buf.getChannelData(1);

    for (const l of layerList) {
      const pL = l.pcmL || l.pcm, pR = l.pcmR || l.pcmL || l.pcm;
      if (!pL) continue;
      const g = typeof l.gain === 'number' ? l.gain : 1.0;
      const ratio=(l.sampleRate||sampleRate)/sampleRate;
      const len = Math.min(length, Math.round(pL.length/ratio));
      if(ratio===1){for(let i=0;i<len;i++){outL[i]+=pL[i]*g;outR[i]+=(pR?pR[i]:pL[i])*g}continue;}
      for (let i = 0; i < len; i++) {
        const position=i*ratio,index=Math.min(pL.length-1,Math.floor(position)),next=Math.min(pL.length-1,index+1),fraction=position-index;
        outL[i] += (pL[index]+(pL[next]-pL[index])*fraction)*g;
        const right=pR||pL,ri=Math.min(right.length-1,index),rn=Math.min(right.length-1,next);
        outR[i] += (right[ri]+(right[rn]-right[ri])*fraction)*g;
      }
    }

    let maxPeak = 0;
    for (let i = 0; i < length; i++) {
      const aL = Math.abs(outL[i]), aR = Math.abs(outR[i]);
      if (aL > maxPeak) maxPeak = aL;
      if (aR > maxPeak) maxPeak = aR;
    }
    if (maxPeak > 1.0) {
      const scale = 0.98 / maxPeak;
      for (let i = 0; i < length; i++) {
        outL[i] *= scale;
        outR[i] *= scale;
      }
    }
    return buf;
  }

  let compactMode=false,inputWindowOpen=false,inputWindowLanguage=null;
  const latencyControls=new WeakSet();
  function syncCompact(container){
    container=container||(typeof document!=='undefined'?document.getElementById('liveLoopPanel'):null);
    const advanced=container?.querySelector?.('.loop-advanced'),button=container?.querySelector?.('#loopCompact')||(typeof document!=='undefined'?document.getElementById('loopCompact'):null);
    if(advanced)advanced.hidden=compactMode;
    container?.classList?.toggle('loop-minimized',compactMode);
    if(button){button.textContent='';button.setAttribute('aria-expanded',String(!compactMode));button.setAttribute('aria-label',tr(compactMode?'Развернуть настройки Track 09':'Минимизировать настройки Track 09',compactMode?'Expand Track 09 settings':'Minimize Track 09 settings'));button.title=button.getAttribute?.('aria-label')||'';}
  }
  function setCompact(value){compactMode=value===true;syncCompact();envRef?.changed?.();}
  function setInputWindow(value,focus=false){
    inputWindowOpen=value===true;
    const panel=typeof document!=='undefined'?document.getElementById('audioInputWindow'):null;
    if(panel){panel.hidden=!inputWindowOpen;if(inputWindowOpen){renderInputWindow();envRef?.frontWindow?.('audioInputWindow');if(focus)panel.querySelector?.('[data-drag]')?.focus?.();}}
    const button=typeof document!=='undefined'?document.getElementById('loopInputToggle'):null;
    if(button)button.setAttribute('aria-expanded',String(inputWindowOpen));
    envRef?.changed?.();
  }
  function renderInputWindow(){
    if(typeof document==='undefined')return;
    const panel=document.getElementById('audioInputWindow'),body=document.getElementById('audioInputBody');
    if(!panel||!body)return;
    panel.hidden=!inputWindowOpen;
    const language=envRef?.language?.()||'ru';
    const title=document.getElementById('audioInputTitle'),close=document.getElementById('closeAudioInput'),handle=panel.querySelector?.('[data-drag]');
    if(title)title.textContent=tr('Аудиовход','Audio input');
    panel.setAttribute('aria-label',tr('Микрофон и аудиоустройства','Microphone and audio devices'));
    handle?.setAttribute('aria-label',tr('Перемещайте окно аудиовхода стрелками','Move audio input window with arrow keys'));
    if(close){close.setAttribute('aria-label',tr('Закрыть аудиовход','Close audio input'));close.onclick=()=>{setInputWindow(false);document.getElementById('loopInputToggle')?.focus?.()};}
    if(inputWindowLanguage!==language||!body.children?.length){
      inputWindowLanguage=language;
      body.innerHTML=`<div class="loop-input-strip">
        <label>${tr('ВХОД','INPUT')} <select id="loopInputKind" aria-label="${tr('Тип аудиовхода','Audio input type')}"><option value="microphone">${tr('Микрофон','Microphone')}</option><option value="instrument">${tr('Инструмент / аудиоинтерфейс','Instrument / audio interface')}</option></select></label>
        <label>${tr('УСТРОЙСТВО','DEVICE')} <select id="loopInputDevice" aria-label="${tr('Устройство аудиовхода','Audio input device')}"></select></label>
        <button type="button" class="glass-btn" id="loopInputAccess">${tr('ДОСТУП К ВХОДАМ','ENABLE INPUTS')}</button>
        <button type="button" class="glass-btn" id="loopInputListen" aria-pressed="false">${tr('СЛУШАТЬ ВХОД','LISTEN TO INPUT')}</button>
        <small>${tr('Файл — через ИМПОРТ. Запись — с выбранного входа. Для прослушивания используйте наушники. USB/линейный вход должен определяться системой как аудиоустройство.','Use IMPORT for a file, RECORD for the selected input. Use headphones for monitoring. USB/line input must appear as a system audio device.')}</small>
        <small id="loopInputDiagnostics" role="status" aria-live="polite"></small>
        <label>${tr('Задержка записи, мс','Recording latency, ms')} <input id="loopInputLatency" type="number" min="0" max="200" step="1" value="${settings.latencyMs}"></label>
      </div>`;
      bindInputControls();
    }
    const latency=document.getElementById('loopInputLatency');if(latency&&document.activeElement!==latency)latency.value=String(settings.latencyMs);
    updateInputUI();
  }
  function bindInputControls(){
    const find=id=>document.getElementById(id),kind=find('loopInputKind'),device=find('loopInputDevice'),access=find('loopInputAccess'),listen=find('loopInputListen'),latency=find('loopInputLatency');
    if(kind)kind.onchange=e=>inputController?.configure({kind:e.target.value,deviceId:''});
    if(device)device.onchange=e=>inputController?.configure({deviceId:e.target.value});
    if(access)access.onclick=()=>inputController?.requestAccess();
    if(listen)listen.onclick=()=>listenInput(!inputController?.state().monitoring);
    if(latency){
      latency.onchange=e=>{try{settings.latencyMs=root.HaloControls.parse(String(e.target.value),{min:0,max:200,step:1});persistSettings()}catch(_){e.target.value=String(settings.latencyMs)}};
      if(root.HaloControls?.install&&!latencyControls.has(latency)){root.HaloControls.install(latency,{min:0,max:200,step:1,dragStep:1});latencyControls.add(latency);}
    }
  }
  function organizeUI(container){
    const head=container.querySelector?.('.loop-head');if(!head)return;
    const primary=document.createElement('div'),quick=document.createElement('div'),advanced=document.createElement('div');
    primary.className='loop-primary';quick.className='loop-quick';advanced.className='loop-advanced';advanced.id='track09Advanced';
    const original=Array.from(container.children).filter(node=>node!==head);
    primary.append(quick);container.append(primary,advanced);
    const move=(selector,target)=>{const node=container.querySelector(selector);if(node)target.append(node);return node};
    for(const id of ['btnLoopRecord','sliceBtnRec','btnLoopLoop','btnLoopOverdub','loopImportBtn','btnLoopUndo','loopMute','loopSolo'])move('#'+id,quick);
    const level=container.querySelector('#loopLevel')?.closest?.('label');if(level)quick.append(level);
    for(const [id,label] of [['loopBarsGroup','BARS'],['sliceCountGroup',tr('СЛАЙСЫ','SLICES')]]){const group=move('#'+id,quick);if(group){const caption=document.createElement('span');caption.className='loop-quick-caption';caption.textContent=label;group.prepend(caption);}}
    const wave=move('.loop-waveform-card',primary);
    if(wave){const trim=wave.querySelector('.loop-trim-wrap');if(trim)advanced.append(trim);}
    const sequencer=move('.slice-seq-card',primary);
    if(sequencer){const timing=document.createElement('div');timing.className='loop-pattern-timing';for(const attr of ['data-slice-cycle','data-slice-step-len']){const group=container.querySelector('['+attr+']')?.closest('.loop-slice-subgroup');if(group)timing.append(group);}sequencer.prepend(timing);}
    const clear=container.querySelector('#loopClearBtn');if(clear){clear.textContent='DELETE';clear.setAttribute('aria-label',tr('Удалить семпл Track 09','Delete Track 09 sample'));quick.append(clear);}

    for(const node of original){if(node.parentNode===container)advanced.append(node);}
    // Remove empty action containers after moving their controls.
    for(const selector of ['.loop-actions','.loop-bars-group','.loop-aux-group'])for(const node of advanced.querySelectorAll?.(selector)||[])if(!node.querySelector('button,input,select'))node.remove();
    for(const label of container.querySelectorAll('.loop-slider-label')){const input=label.querySelector('input[type=range]');if(input){const caption=document.createElement('span');caption.className='loop-slider-caption';for(const node of Array.from(label.childNodes))if(node!==input)caption.append(node);label.prepend(caption);}}
    syncCompact(container);
  }

  let inputController=null;
  function recordingActive(){return ['preroll','recording','overdubbing'].includes(recordingState)}
  function cancelInputCapture(){
    recordingState='idle';recordedChunks=[];
    for(const node of [micSourceNode,processorNode,analyserNode,dummyGain]){try{node?.disconnect()}catch(_){}}
    micSourceNode=processorNode=analyserNode=dummyGain=null;micStream=null;
    if(recAnimFrame){cancelAnimationFrame(recAnimFrame);recAnimFrame=null}
    inputController?.releaseCapture();updateStatusBadge();updateInputUI();
  }
  function updateInputUI(){
    if(typeof document==='undefined'||!inputController)return;
    const state=inputController.state();
    const diagnostics=document.getElementById('loopInputDiagnostics');
    if(diagnostics){
      const error=state.lastError;
      const reason=error?({InputSelectionRequired:tr('Выберите конкретный вход аудиоинтерфейса в списке УСТРОЙСТВО','Choose a specific interface input in the DEVICE list'),NotAllowedError:tr('Разрешение отклонено браузером или системой','Permission denied by browser or operating system'),NotFoundError:tr('Выбираемые аудиовходы не найдены','No selectable audio inputs found'),NotReadableError:tr('Устройство занято или недоступно драйверу','Device is busy or unavailable to the driver'),OverconstrainedError:tr('Выбранное устройство недоступно: выберите вход заново','Selected device unavailable: select an input again'),SecurityError:tr('Доступ заблокирован контекстом безопасности','Access blocked by security context')})[error.name]||tr('Не удалось открыть аудиовход','Could not open audio input'):'';
      diagnostics.textContent=[error?`${reason} (${error.stage}: ${error.name}${error.constraint?' / '+error.constraint:''}).`:'',state.accessReady&&!error?tr('Доступ проверен. Выберите устройство и нажмите СЛУШАТЬ ВХОД.','Access checked. Choose a device and press LISTEN TO INPUT.'):'',state.fileContext?tr('Открыто как локальный файл. Если браузер повторяет запрос разрешения, запустите scripts/preview.ps1 и откройте http://127.0.0.1:8766/. Разрешением управляет браузер.','Opened as a local file. If permission keeps being requested, run scripts/preview.ps1 and open http://127.0.0.1:8766/. Permission persistence is controlled by the browser.'):''].filter(Boolean).join(' ');
    }

    const toggle=document.getElementById('loopInputToggle');if(toggle){toggle.classList?.toggle('is-monitoring',state.monitoring);toggle.title=state.monitoring?tr('Аудиовход · прослушивание включено','Audio input · monitoring active'):tr('Микрофон и аудиоустройства','Microphone and audio devices');}
    const select=document.getElementById('loopInputDevice');
    if(select){
      select.replaceChildren?.();
      const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o)};
      option('',tr('Системный вход по умолчанию','System default input'));
      if(state.deviceId&&!state.devices.some(d=>d.deviceId===state.deviceId))option(state.deviceId,tr('Сохранённый вход (недоступен до разрешения)','Saved input (permission may be needed)'));
      state.devices.forEach((d,i)=>option(d.deviceId,d.label||tr('Аудиовход ','Audio input ')+(i+1)));
      select.value=state.deviceId;select.disabled=state.busy||recordingActive();
    }
    const kind=document.getElementById('loopInputKind');if(kind){kind.value=state.kind;kind.disabled=state.busy||recordingActive()}
    const listen=document.getElementById('loopInputListen');if(listen){listen.textContent=state.monitoring?tr('■ СТОП ВХОД','■ STOP INPUT'):tr('▶ СЛУШАТЬ ВХОД','▶ LISTEN TO INPUT');listen.setAttribute('aria-pressed',String(state.monitoring));listen.disabled=state.busy||recordingActive()}
    const access=document.getElementById('loopInputAccess');if(access)access.disabled=state.busy||recordingActive();
  }
  async function listenInput(on){
    if(!inputController)return false;
    settings.monitor=await inputController.listen(on);persistSettings();updateInputUI();return settings.monitor;
  }

  function init(env) {
    initialized = true;
    hydrated = false;
    envRef = env;
    inputController?.dispose();
    if(root.HaloAudioInput)inputController=root.HaloAudioInput.create({audio:async()=>{const audio=await envRef?.ensureAudio?.();if(audio)connectToAudio(audio);return audio||activeAudio},recording:recordingActive,changed:updateInputUI,inputEnded:cancelInputCapture,toast:message=>envRef?.toast(message),language:()=>envRef?.language?.()||'en'});
    renderInputWindow();
    ready = IDB.loadSettings().then(s => {
      if (s && phraseState === undefined) {
        settings = { ...defaultSettings, ...s };
        if(settings.delayTime==='1/8D')settings.delayTime='1/8d';
        if(Array.isArray(settings.slicePattern)){settings.sliceSteps=[...settings.slicePattern];settings.slicePattern='custom';}
      }
      return IDB.loadLayers();
    }).then(list => {
      for (const layer of list) layerLibrary.set(layer.id,layer);
      layers = phraseState === undefined ? (settings.layerIds ? settings.layerIds.map(id=>layerLibrary.get(id)).filter(Boolean) : list) : (phraseState?.layerIds || []).map(id=>layerLibrary.get(id)).filter(Boolean);
      if (layers.length) compositeBuffer=buildCompositeBuffer(compositeContext(),layers);
      hydrated=true;
      const panel=typeof document!=='undefined'?document.getElementById('liveLoopPanel'):null;
      if(panel?.children?.length)createUI(panel);else renderUI();
    }).catch(() => {});
  }

  function connectToAudio(audio) {
    if (!audio || !audio.ctx) return;
    activeAudio = audio;
    const ctx = audio.ctx;

    if (trackGain && trackContext !== ctx) {
      stopPlayback();
      for (const node of [trackGain,panner,reverbSend,delaySend,chorusSend]) {try {node?.disconnect();} catch (_) {}}
      trackGain=panner=reverbSend=delaySend=chorusSend=null;
    }
    trackContext=ctx;
    if (!trackGain) {
      trackGain = ctx.createGain();
      if (ctx.createStereoPanner) panner = ctx.createStereoPanner();
      reverbSend = ctx.createGain();
      delaySend = ctx.createGain();

      if (panner) {
        trackGain.connect(panner);
        if (audio.master) panner.connect(audio.master);
      } else if (audio.master) {
        trackGain.connect(audio.master);
      }

      if (audio.reverb) {
        trackGain.connect(reverbSend);
        reverbSend.connect(audio.reverb);
      }
      if (audio.delayTaps && audio.delayTaps['1/8']) {
        trackGain.connect(delaySend);
        const tapDiv = (audio.delayTaps && audio.delayTaps[settings.delayTime]) ? settings.delayTime : '1/8';
        delaySend.connect(audio.delayTaps[tapDiv] || audio.delayTaps['1/8']);
      }
      if (audio.chorusIn) {
        chorusSend = ctx.createGain();
        trackGain.connect(chorusSend);
        chorusSend.connect(audio.chorusIn);
      }
    }

    updateMixerNodes();

    if (layers.length && (!compositeBuffer || compositeBuffer.sampleRate !== ctx.sampleRate)) {
      const dur = (settings.bars * 4 * 60) / 72;
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
    }
  }

  function updateMixerNodes(at) {
    activeAudio?.setCoreMuted?.(settings.solo===true,at);
    if (!trackGain || !activeAudio || !activeAudio.ctx || activeAudio.ctx.state === 'closed') return;
    const now = at || activeAudio.ctx.currentTime;
    const vol = settings.mute ? 0 : (settings.level / 100) * 1.5;
    trackGain.gain.setTargetAtTime(vol, now, 0.04);
    if (panner) panner.pan.setTargetAtTime(settings.pan / 100, now, 0.05);
    if (reverbSend) reverbSend.gain.setTargetAtTime((settings.space / 100) * 0.8, now, 0.06);
    if (delaySend) {
      delaySend.gain.setTargetAtTime((settings.delay / 100) * 0.7, now, 0.05);
      const tapDiv = (activeAudio.delayTaps && activeAudio.delayTaps[settings.delayTime]) ? settings.delayTime : '1/8';
      if (activeAudio.delayTaps && activeAudio.delayTaps[tapDiv]) {
        try {
          delaySend.disconnect();
          if (activeAudio.ctx.state !== 'closed') {
            delaySend.connect(activeAudio.delayTaps[tapDiv]);
          }
        } catch (_) {}
      }
    }
    if (chorusSend) {
      chorusSend.gain.setTargetAtTime(((settings.chorus || 0) / 100) * 0.75, now, 0.05);
    }
  }

  function persistSettings() {
    const latency=typeof document!=='undefined'?document.getElementById('loopInputLatency'):null;if(latency&&document.activeElement!==latency)latency.value=String(settings.latencyMs);
    IDB.saveSettings({...settings, layerIds:capturePhrase().layerIds});
    envRef?.changed?.();
  }

  function schedulePlayback(time, audio, tempo, remaining = Infinity) {
    if (!compositeBuffer || settings.mute) return;
    try {
      if (activeSource) {
        try { activeSource.stop(time); } catch (_) {}
        activeSource = null;
      }
      const ctx = audio.ctx;
      const playBuf = getPlaybackBuffer(ctx);
      if (!playBuf) return;

      const source = ctx.createBufferSource();
      source.buffer = playBuf;
      const voiceGain=ctx.createGain();
      source.connect(voiceGain);voiceGain.connect(trackGain);
      source.loopGain=voiceGain;
      playbackSources.add(source);
      source.onended=()=>{playbackSources.delete(source);try{source.disconnect();voiceGain.disconnect();}catch(_){}};

      const pitchVal = Number(settings.pitch) || 0;
      if (pitchVal !== 0 && source.playbackRate) {
        source.playbackRate.value = Math.pow(2, pitchVal / 12);
      }

      const totalDur = playBuf.duration;
      const loopDur = (settings.bars * 4 * 60) / (tempo || 72);
      const isLonger = totalDur > loopDur + 0.05;
      const winDur = isLonger ? loopDur : totalDur;
      const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
      const trimStartFrac = Math.max(0, Math.min(0.95, settings.trimStart || 0));
      const trimEndFrac = Math.max(trimStartFrac + 0.01, Math.min(1.0, settings.trimEnd || 1));
      let startOffset = offsetSec + trimStartFrac * winDur;
      const playDur = Math.max(0.01, (trimEndFrac - trimStartFrac) * winDur);

      if (settings.reverse) {
        startOffset = Math.max(0, Math.min(totalDur - playDur, totalDur - (startOffset + playDur)));
      }

      const rate=Math.pow(2,pitchVal/12),duration=Math.min(playDur/rate,loopDur,remaining);
      voiceGain.gain.setValueAtTime(0,time);
      voiceGain.gain.linearRampToValueAtTime(1,time+Math.min(.005,duration/2));
      voiceGain.gain.setValueAtTime(1,time+Math.max(.005,duration-.005));
      voiceGain.gain.linearRampToValueAtTime(0,time+duration);
      source.start(time, startOffset, Math.min(playDur,loopDur*rate,remaining*rate));
      activeSource = source;
      loopPlayStartTime = time;
      loopPlayDuration = duration;

      if (typeof root.HaloPulse === 'function') {
        root.HaloPulse(8, time);
      } else if (envRef?.pulse) {
        envRef.pulse(8, time);
      }
    } catch (_) {}
  }

  function stopPlayback(time) {
    const at=Number.isFinite(time)?time:activeAudio?.ctx?.currentTime||0;
    for(const source of playbackSources){
      try{const gain=source.loopGain?.gain;gain?.cancelScheduledValues?.(at);gain?.setValueAtTime(1,at);gain?.linearRampToValueAtTime(0,at+.005);source.stop(at+.005);}catch(_){}
    }
    playbackSources.clear();
    if (activeSource) {
      try { activeSource.stop(at + .005); } catch (_) {}
      activeSource = null;
    }
    if (activeSliceVoice) {
      try { activeSliceVoice.source.stop(at); } catch (_) {}
      activeSliceVoice = null;
    }
    loopPlayStartTime = 0;
    pendingQuantizedRestart = false;
    activeSliceIndex = -1;
    activeSliceStep = -1;
  }

  function tick(time, absStep, audio, tempo, phraseBars = 4, key = envRef?.settings?.().key || 0, timeSignature = envRef?.settings?.().timeSignature || '4/4') {
    samplerKey=key;
    const spb = timeSignature === '3/4' ? 12 : 16;
    const boundary = absStep % (phraseBars * spb) === 0;
    if (!playbackSettings || boundary || pendingQuantizedRestart && absStep === 0) {
      playbackSettings = copySettings(settings);
      pendingQuantizedRestart = false;
      if (boundary) {loopAnchorStep = absStep; lastScheduledStep = -1;}
      rebuildSlices();playbackSlices=slices;
    }
    const editing = settings,editingSlices=slices;
    if(playbackSlices)slices=playbackSlices;
    // Only timing/sample-window changes wait; mixer controls stay live.
    settings = {...settings};
    for (const key of ['bars','pitch','reverse','trimStart','trimEnd','offsetSec','rootNote','pitchOctave','pitchSteps']) settings[key]=playbackSettings[key];
    try { tickPlayback(time, absStep, audio, tempo, phraseBars, timeSignature); }
    finally { settings = editing;slices=editingSlices; }
  }

  function tickPlayback(time, absStep, audio, tempo, phraseBars, timeSignature = '4/4') {
    const spb = timeSignature === '3/4' ? 12 : 16;
    if (!audio || !audio.ctx) return;
    if (!trackGain) connectToAudio(audio);

    // Pre-roll (Waiting for bar boundary)
    if (recordingState === 'preroll') {
      if (absStep % 16 === 0) {
        recordingState = isOverdubMode ? 'overdubbing' : 'recording';
        recordStartStep = absStep;
        recordStartTime = time;
        recordTargetSteps = settings.mode==='pitch'?Math.max(1,Math.min(settings.bars*16,Math.floor(8*tempo/15))):settings.bars*16;
        recordedChunks = [];
        updateStatusBadge();
        updateStepIndicators();
      }
      return;
    }

    // Active Recording / Overdubbing
    if (recordingState === 'recording' || recordingState === 'overdubbing') {
      if (absStep >= recordStartStep + recordTargetSteps) {
        finishRecording(audio, tempo, time);
      }
      return;
    }

    if(settings.mode==='pitch'){
      if(compositeBuffer&&!settings.mute&&absStep!==lastScheduledStep){
        lastScheduledStep=absStep;
        if(absStep%(settings.stepLength||1)===0){
          activeSliceStep=(Math.floor(absStep/(settings.stepLength||1))+(settings.offset||0))%(settings.cycle||16)%16;
          if(typeof document!=='undefined')document.querySelectorAll('.slice-seq-pad').forEach((pad,i)=>pad.classList.toggle('is-current-step',i===activeSliceStep));
        }
        const event=pitchEvent(absStep);
        if(event){
          activeSliceVoice=schedulePitch(audio.ctx,trackGain,time,event,tempo,(phraseBars*spb-absStep%(phraseBars*spb))*60/tempo/4,activeSliceVoice);
          activeSliceStep=event.index;
          if(activeSliceVoice)(root.HaloPulse||envRef?.pulse)?.(8,time);
        }
      }
      return;
    }

    // SLICE MODE Playback
    if (settings.mode === 'slice') {
      if (compositeBuffer && !settings.mute) {
        if (!slices || !slices.length) rebuildSlices();
        if (slices && slices.length) {
          const stepLen = settings.stepLength || 1;
          if (absStep % stepLen === 0 && absStep !== lastScheduledStep) {
            lastScheduledStep = absStep;
            const s = Math.floor(absStep / stepLen);
            const cycleLen = settings.cycle || 16;
            const patternStep = (s + (settings.offset || 0)) % cycleLen;
            const stepIdx = patternStep % 16;
            activeSliceStep = stepIdx;
            if (typeof document !== 'undefined') {
              const grid = document.getElementById('sliceSeqGrid');
              if (grid) {
                const pads = grid.children;
                for (let pi = 0; pi < pads.length; pi++) {
                  pads[pi].classList.toggle('is-current-step', pi === stepIdx);
                }
              }
            }
            const sliceIdx = (settings.sliceSteps && typeof settings.sliceSteps[stepIdx] === 'number') ? settings.sliceSteps[stepIdx] : -1;

            if (sliceIdx >= 0 && sliceIdx < slices.length) {
              const isAnchor = (stepIdx % 4 === 0);
              const isMedium = (stepIdx % 2 === 0);
              const threshold = isAnchor ? 15 : (isMedium ? 35 : 55);
              const dens = (typeof settings.density === 'number') ? settings.density : 75;
              if (dens >= threshold) {
                const remaining = (phraseBars * spb - absStep % (phraseBars * spb)) * 60 / tempo / 4;
                playSlice(sliceIdx, time, audio.ctx, tempo, remaining);
              }
            }
          }
        }
      }
      return;
    }

    // Normal Loop Playback
    if (compositeBuffer && !settings.mute) {
      const loopSteps = settings.bars * 16;
      const stepDiff = absStep - loopAnchorStep;
      if (stepDiff >= 0 && stepDiff % loopSteps === 0 && absStep !== lastScheduledStep) {
        lastScheduledStep = absStep;
        schedulePlayback(time, audio, tempo, (phraseBars*spb-(absStep%(phraseBars*spb)))*60/tempo/4);
      }
    }
  }

  async function checkCopyrightConfirmation() {
    if (settings.copyrightConfirmed) return true;
    const confirmFn = envRef?.confirm || root.HaloConfirm;
    if (!confirmFn) {
      settings.copyrightConfirmed = true;
      persistSettings();
      return true;
    }

    const message = tr(
      'Ваши аудиозаписи и файлы сохраняются только в этом браузере (IndexedDB) и не отправляются на сервер.\n\nПожалуйста, подтвердите, что вы обладаете авторскими правами или необходимым разрешением на использование этого звукового материала.',
      'Your audio recordings and imported files stay exclusively in this browser (IndexedDB) and are never uploaded to any server.\n\nPlease confirm that you own the copyright or have the necessary permission to use this audio material.'
    );

    const ok = await confirmFn({
      title: tr('Права на аудио · Copyright', 'User Audio & Copyright'),
      message,
      confirmText: tr('Подтверждаю', 'Confirm'),
      cancelText: tr('Отмена', 'Cancel'),
      danger: false
    });

    if (ok) {
      settings.copyrightConfirmed = true;
      persistSettings();
    }
    return ok;
  }

  function startLiveVisualizer(audio, tempo) {
    if (recAnimFrame) cancelAnimationFrame(recAnimFrame);
    if (!analyserNode) return;

    const timeDomain = new Float32Array(analyserNode.fftSize);

    function frame() {
      if (recordingState !== 'preroll' && recordingState !== 'recording' && recordingState !== 'overdubbing') {
        recAnimFrame = null;
        return;
      }
      recAnimFrame = requestAnimationFrame(frame);
      drawLiveRecording(audio, tempo, timeDomain);
    }
    recAnimFrame = requestAnimationFrame(frame);
  }

  function drawLiveRecording(audio, tempo, timeDomain) {
    const canvas = document.getElementById('loopCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 110;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(7, 16, 31, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    ctx.strokeStyle = 'rgba(139, 232, 227, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const barCount = settings.bars || 4;

    // Bar lines
    ctx.fillStyle = 'rgba(140, 175, 195, 0.5)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (let b = 0; b < barCount; b++) {
      const bx = (b / barCount) * width;
      if (b > 0) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(186, 215, 231, 0.18)';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillText(String(b + 1), bx + 4, height - 3);
    }

    if (recordingState === 'preroll') {
      // Draw pre-roll count-in prompt and mic test meter
      analyserNode?.getFloatTimeDomainData?.(timeDomain);
      let peak = 0;
      for (let i = 0; i < timeDomain.length; i++) {
        const v = Math.abs(timeDomain[i]);
        if (v > peak) peak = v;
      }
      ctx.fillStyle = '#ffd280';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tr('⏱ ПРЕРОЛЛ · ЗАПИСЬ НАЧНЁТСЯ СО СЛЕДУЮЩЕГО ТАКТА…', '⏱ PRE-ROLL · RECORDING STARTS ON NEXT BAR…'), width / 2, height / 2 - 12);

      // Mic level preview bar
      const meterW = Math.min(240, width - 60);
      const meterH = 8;
      const meterX = (width - meterW) / 2;
      const meterY = height / 2 + 10;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(meterX, meterY, meterW, meterH);
      ctx.fillStyle = '#63d2c6';
      const levelW = Math.min(meterW, peak * 3 * meterW);
      ctx.fillRect(meterX, meterY, levelW, meterH);
      ctx.strokeStyle = 'rgba(186,215,231,0.25)';
      ctx.strokeRect(meterX, meterY, meterW, meterH);

      ctx.fillStyle = 'rgba(186, 215, 231, 0.7)';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.fillText(tr('Сигнал микрофона активен', 'Microphone signal active'), width / 2, meterY + 22);
      return;
    }

    // Active Recording / Overdubbing
    if (isOverdubMode && compositeBuffer) {
      // Dimmed composite background
      const pcm = compositeBuffer.getChannelData(0);
      const totalSamples = pcm.length;
      const barWidth = 3;
      const barGap = 1.5;
      const totalBars = Math.floor(width / (barWidth + barGap));
      const step = Math.floor(totalSamples / totalBars);
      ctx.fillStyle = 'rgba(99, 210, 198, 0.18)';
      for (let i = 0; i < totalBars; i++) {
        const start = i * step;
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j += 4) {
          const val = pcm[start + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const amp = Math.max(0.04, Math.max(Math.abs(min), Math.abs(max)));
        const barHeight = Math.min(height * 0.88, amp * height * 0.88);
        const x = i * (barWidth + barGap);
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    analyserNode?.getFloatTimeDomainData?.(timeDomain);
    let peak = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const v = Math.abs(timeDomain[i]);
      if (v > peak) peak = v;
    }

    const now = audio.ctx.currentTime;
    const targetDur = (recordTargetSteps / 16) * (4 * 60 / tempo);
    const elapsed = Math.max(0, now - recordStartTime);
    const progress = Math.min(1.0, elapsed / Math.max(0.1, targetDur));

    recWaveData.push({ progress, amp: Math.max(0.05, peak) });

    // Draw recorded waveform history
    const waveColor = isOverdubMode ? '#ffa852' : '#ff6b6b';
    ctx.fillStyle = waveColor;
    for (let i = 0; i < recWaveData.length; i++) {
      const pt = recWaveData[i];
      const px = pt.progress * width;
      const bH = Math.min(height * 0.9, pt.amp * height * 1.4);
      const bY = (height - bH) / 2;
      ctx.fillRect(px, bY, 2.5, bH);
    }

    // Playhead line
    const curX = progress * width;
    ctx.strokeStyle = isOverdubMode ? '#ffd280' : '#ff9e9e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curX, 0);
    ctx.lineTo(curX, height);
    ctx.stroke();

    // Mini oscilloscope wave at playhead
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const oscW = 36;
    const oscStep = oscW / timeDomain.length;
    for (let i = 0; i < timeDomain.length; i++) {
      const ox = (curX - oscW / 2) + i * oscStep;
      const oy = (height / 2) + timeDomain[i] * (height * 0.35);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
    }
    ctx.stroke();

    // Live Badge in top-left
    const curBar = Math.min(barCount, Math.floor(progress * barCount) + 1);
    ctx.fillStyle = waveColor;
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const recText = `● ${isOverdubMode ? 'OVERDUB' : 'REC'}  ${elapsed.toFixed(1)}s / ${targetDur.toFixed(1)}s · ${tr('Такт', 'Bar')} ${curBar}/${barCount}`;
    ctx.fillText(recText, 8, 8);
  }

  async function armRecording(isOverdub, audio, tempo) {
    const rightsOk = await checkCopyrightConfirmation();
    if (!rightsOk) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      envRef?.toast(tr('Аудиовход требует HTTPS/localhost и поддержки браузера', 'Audio input requires HTTPS/localhost and browser support'));
      return;
    }

    if(recordingActive())return;
    try{
      audio=audio||await envRef?.ensureAudio?.();
      if(!audio?.ctx)throw Error(tr('Нажмите Play перед записью','Press Play before recording'));
      connectToAudio(audio);
      if(envRef?.isPlaying&&!envRef.isPlaying())await envRef?.startPlayback?.();
      if(!audio.ctx.createScriptProcessor)throw Error(tr('Запись не поддерживается браузером','Recording is unsupported by this browser'));
    }catch(err){envRef?.toast(err.message);return}
    let stream;
    try{stream=await inputController.acquire()}catch(err){envRef?.toast(tr('Аудиовход недоступен: ','Audio input unavailable: ')+err.message);return}
    micStream = stream;

    const ctx = audio.ctx;
    micSourceNode = ctx.createMediaStreamSource(micStream);
    analyserNode = ctx.createAnalyser ? ctx.createAnalyser() : null;
    if (analyserNode) {
      analyserNode.fftSize = 512;
      micSourceNode.connect(analyserNode);
    }

    processorNode = ctx.createScriptProcessor ? ctx.createScriptProcessor(4096, 1, 1) : null;
    if (!processorNode) {
      envRef?.toast(tr('Web Audio запись не поддерживается', 'Web Audio recording not supported'));
      return;
    }

    micSourceNode.connect(processorNode);
    dummyGain = ctx.createGain();
    dummyGain.gain.value = 0;
    processorNode.connect(dummyGain);
    dummyGain.connect(ctx.destination);



    recordedChunks = [];
    recWaveData = [];
    processorNode.onaudioprocess = (e) => {
      if (recordingState === 'recording' || recordingState === 'overdubbing') {
        const input = e.inputBuffer.getChannelData(0);
        recordedChunks.push(new Float32Array(input));
      }
    };

    isOverdubMode = isOverdub;
    recordingState = 'preroll';
    updateInputUI();
    recordStartStep = -1;
    recordStartTime = 0;
    updateStatusBadge();
    updateStepIndicators();

    startLiveVisualizer(audio, tempo);
    envRef?.toast(tr('Подготовка к записи: отсчёт до начала такта…', 'Preparing to record: count-in to next bar…'));
  }

  function finishRecording(audio, tempo, endTime = audio?.ctx?.currentTime) {
    recordingState = 'looping';
    updateStatusBadge();
    updateStepIndicators();

    if (recAnimFrame) {
      cancelAnimationFrame(recAnimFrame);
      recAnimFrame = null;
    }

    if (processorNode) {
      try { processorNode.disconnect(); } catch (_) {}
      processorNode = null;
    }
    if (analyserNode) {
      try { analyserNode.disconnect(); } catch (_) {}
      analyserNode = null;
    }
    if (micSourceNode) {
      try { micSourceNode.disconnect(); } catch (_) {}
      micSourceNode = null;
    }
    if (dummyGain) {
      try { dummyGain.disconnect(); } catch (_) {}
      dummyGain = null;
    }
    micStream=null;
    inputController?.releaseCapture();updateInputUI();

    if (!recordedChunks.length) {
      envRef?.toast(tr('Запись не содержит аудио', 'Recording contains no audio'));
      return;
    }

    const totalSamples = recordedChunks.reduce((acc, ch) => acc + ch.length, 0);
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const ch of recordedChunks) {
      merged.set(ch, offset);
      offset += ch.length;
    }
    recordedChunks = [];
    recWaveData = [];

    // Latency compensation
    const sampleRate = audio.ctx.sampleRate;
    const latencyOffset = Math.max(0, Math.round((settings.latencyMs / 1000) * sampleRate));
    const requestedDuration=(settings.mode==='pitch'?recordTargetSteps:settings.bars*16)*15/tempo;
    const targetDur = Math.min(requestedDuration,Math.max(.04,(endTime??recordStartTime+requestedDuration)-recordStartTime));
    const targetLength = Math.max(1, Math.round(targetDur * sampleRate));
    const finalPcm = new Float32Array(targetLength);

    const copySrc = merged.subarray(Math.min(latencyOffset, merged.length));
    finalPcm.set(copySrc.subarray(0, Math.min(targetLength, copySrc.length)));

    const newLayer = {
      id: Date.now(),
      timestamp: Date.now(),
      duration: targetDur,
      bars: settings.bars,
      sampleRate,
      pcmL: finalPcm,
      pcmR: finalPcm,
      gain: 1.0,
      name: (isOverdubMode ? 'Overdub ' : 'Layer ') + (layers.length + 1)
    };

    layers.push(newLayer);
    undoStack = [];
    IDB.saveLayer(newLayer);

    compositeBuffer = buildCompositeBuffer(audio.ctx, layers, targetDur);
    settings.trimStart = 0;
    settings.trimEnd = 1.0;
    persistSettings();
    renderWaveform();
    renderUI();

    envRef?.toast(tr(
      `Записано ${settings.bars} такта · Зациклено`,
      `Recorded ${settings.bars} bars · Looping`
    ));
  }

  function isSupportedAudioFile(file) {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (type.startsWith('audio/')) return true;
    return /\.(wav|mp3|ogg|m4a|aac|flac|weba|webm)$/i.test(name);
  }

  async function importAudioFile(file, audio, tempo) {
    if (!file) return;
    const rightsOk = await checkCopyrightConfirmation();
    if (!rightsOk) return;

    if (file.size > MAX_FILE_SIZE) {
      envRef?.toast(tr('Файл превышает 50 МБ. Выберите файл меньшего размера.', 'File exceeds 50 MB limit. Please select a smaller file.'));
      return;
    }

    envRef?.toast(tr('Декодирование аудиофайла…', 'Decoding audio file…'));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = audio?.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      if (decoded.duration > MAX_DURATION_SEC) {
        envRef?.toast(tr('Длительность ограничена 120 сек. Аудио обрезано.', 'Audio duration limited to 120s. Cropped to limit.'));
      }

      const dur = Math.min(MAX_DURATION_SEC, decoded.duration);
      const sampleRate = ctx.sampleRate;
      const length = Math.round(dur * sampleRate);

      const pcmL = new Float32Array(length);
      const pcmR = new Float32Array(length);
      pcmL.set(decoded.getChannelData(0).subarray(0, length));
      if (decoded.numberOfChannels > 1) {
        pcmR.set(decoded.getChannelData(1).subarray(0, length));
      } else {
        pcmR.set(pcmL);
      }

      const newLayer = {
        id: Date.now(),
        timestamp: Date.now(),
        duration: dur,
        bars: settings.bars,
        sampleRate,
        pcmL,
        pcmR,
        gain: 1.0,
        name: file.name.slice(0, 24)
      };

      layers.push(newLayer);
      undoStack = [];
      IDB.saveLayer(newLayer);

      const loopDur = settings.mode==='pitch'?8:(settings.bars * 4 * 60) / tempo;
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
      settings.offsetSec = 0;
      settings.trimStart = 0;
      settings.trimEnd = 1.0;
      settings.slicePoints = null;
      persistSettings();
      recordingState = 'looping';
      renderWaveform();
      renderUI();

      envRef?.toast(tr('Файл успешно импортирован на 9-й трек', 'Audio file imported to Track 09'));
    } catch (err) {
      envRef?.toast(tr('Ошибка импорта аудио: ', 'Import failed: ') + err.message);
    }
  }

  function addLayer(layer, optionalCtx) {
    layers.push(layer);
    capturePhrase();
    persistSettings();
    IDB.saveLayer(layer);
    const ctx = optionalCtx || (activeAudio && activeAudio.ctx);
    if (ctx) {
      const dur = layer.duration || ((settings.bars * 4 * 60) / 72);
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
    }
    return layer;
  }

  function undoLastLayer(optionalCtx) {
    if (!layers.length) return null;
    const removed = layers.pop();
    undoStack.push(removed);
    // Referenced PCM is immutable and may belong to another phrase.
    persistSettings();

    const ctx = optionalCtx || (activeAudio && activeAudio.ctx);
    if (ctx && layers.length) {
      const dur = (settings.bars * 4 * 60) / 72;
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
    } else {
      compositeBuffer = null;
      reversedBuffer = null;
      settings.slicePoints = null;
      recordingState = 'idle';
      stopPlayback();
    }
    renderWaveform();
    renderUI();
    envRef?.toast(tr('Последняя запись отменена (Undo)', 'Last take undone'));
    return removed;
  }

  function clearAllLayers() {
    if (!layers.length) return;
    layers = [];
    undoStack = [];
    compositeBuffer = null;
    reversedBuffer = null;
    settings.slicePoints = null;
    recordingState = 'idle';
    stopPlayback();
    cancelInputCapture();inputController?.release();
    persistSettings();
    renderWaveform();
    renderUI();
    envRef?.toast(tr('Все записи 9-го трека очищены', 'All Track 09 layers cleared'));
  }

  // Waveform Renderer
  function renderWaveform() {
    const canvas = document.getElementById('loopCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 110;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(7, 16, 31, 0.65)';
    ctx.fillRect(0, 0, width, height);

    const tempo = envRef?.settings?.().tempo || 72;
    const loopDur = settings.mode==='pitch'?8:(settings.bars * 4 * 60) / tempo;
    const totalDur = compositeBuffer ? compositeBuffer.duration : 0;
    const isLonger = totalDur > loopDur + 0.05;
    const winDur=isLonger?loopDur:totalDur;
    const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
    const trimStart = Math.max(0, Math.min(0.95, settings.trimStart || 0));
    const trimEnd = Math.max(trimStart + 0.01, Math.min(1.0, settings.trimEnd || 1));

    canvas.classList.toggle('can-drag', !!compositeBuffer);
    canvas.classList.toggle('can-import', !compositeBuffer);
    if (!compositeBuffer) {
      canvas.title = tr('Нажмите или перетащите аудиофайл сюда', 'Tap or drag & drop audio here');
    } else if (settings.mode === 'slice') {
      canvas.title = tr('SLICE: перетаскивайте полоски нарезки или нажимайте для прослушивания', 'SLICE: drag slice dividers or tap to audition');
    } else {
      canvas.title = '';
    }

    // Update Waveform Header info
    const title = document.getElementById('loopWaveTitle');
    if (title) {
      const revTag = settings.reverse ? ' · REV' : '';
      const pitchTag = (settings.pitch && settings.pitch !== 0) ? ` · ${settings.pitch > 0 ? '+' + settings.pitch : settings.pitch}st` : '';
      if (totalDur > 0) {
        if(settings.mode==='pitch'){
          const window=pitchWindow(tempo),unit=tr('с','s');
          title.textContent=`PITCH · ${window.duration.toFixed(2)}${unit} / ${totalDur.toFixed(1)}${unit} · ${noteName(settings.rootNote)}${revTag}${pitchTag}`;
        } else if (isLonger) {
          title.textContent = `${settings.mode==='pitch'?tr('Один семпл · PITCH','One sample · PITCH'):tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')} (${loopDur.toFixed(1)}с / ${totalDur.toFixed(1)}с · ${tr('Позиция', 'Pos')}: ${offsetSec.toFixed(1)}с)${revTag}${pitchTag}`;
        } else {
          title.textContent = `${settings.mode==='pitch'?tr('Один семпл · PITCH','One sample · PITCH'):tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')} (${totalDur.toFixed(1)}с)${revTag}${pitchTag}`;
        }
      } else {
        title.textContent = `${settings.mode==='pitch'?tr('Один семпл · PITCH','One sample · PITCH'):tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')}`;
      }
    }

    if (compositeBuffer) {
      const pcm = compositeBuffer.getChannelData(0);
      const totalSamples = pcm.length;

      let topH = 0;
      let mainY = 0;
      let mainH = height;

      if (isLonger) {
        topH = 14;
        mainY = 18;
        mainH = height - mainY;

        // 1. Top Mini-Overview Bar for full composition
        ctx.fillStyle = 'rgba(9, 20, 36, 0.75)';
        ctx.fillRect(0, 0, width, topH);
        ctx.strokeStyle = 'rgba(139, 232, 227, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, topH);

        // Mini-waveform of entire audio in the overview
        const ovBars = Math.floor(width / 3);
        const ovStep = Math.max(1, Math.floor(totalSamples / ovBars));
        ctx.fillStyle = 'rgba(99, 210, 198, 0.35)';
        for (let i = 0; i < ovBars; i++) {
          const start = i * ovStep;
          let max = 0;
          for (let j = 0; j < ovStep; j += 8) {
            const v = Math.abs(pcm[start + j] || 0);
            if (v > max) max = v;
          }
          const bh = Math.max(2, max * (topH - 2));
          ctx.fillRect(i * 3, (topH - bh) / 2, 2, bh);
        }

        // Highlighted active window in mini-overview
        const winX1 = (offsetSec / totalDur) * width;
        const winW = Math.max(6, (loopDur / totalDur) * width);
        ctx.fillStyle = 'rgba(99, 210, 198, 0.28)';
        ctx.fillRect(winX1, 0, winW, topH);
        ctx.strokeStyle = '#78bab6';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(winX1, 0.5, winW, topH - 1);
      }

      // Center baseline of main waveform
      ctx.strokeStyle = 'rgba(139, 232, 227, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mainY + mainH / 2);
      ctx.lineTo(width, mainY + mainH / 2);
      ctx.stroke();

      // 2. High-resolution slice of PCM for the active window
      const startSample = isLonger ? Math.floor((offsetSec / totalDur) * totalSamples) : 0;
      const sliceSamples = isLonger ? Math.floor((loopDur / totalDur) * totalSamples) : totalSamples;
      const barWidth = 3;
      const barGap = 1.5;
      const totalBars = Math.floor(width / (barWidth + barGap));
      const step = Math.max(1, Math.floor(sliceSamples / totalBars));

      const x1 = trimStart * width;
      const x2 = trimEnd * width;

      for (let i = 0; i < totalBars; i++) {
        const start = startSample + i * step;
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j += 4) {
          const val = pcm[start + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const amp = Math.max(0.04, Math.max(Math.abs(min), Math.abs(max)));
        const barHeight = Math.min(mainH * 0.88, amp * mainH * 0.88);
        const x = i * (barWidth + barGap);
        const y = mainY + (mainH - barHeight) / 2;

        const isInside = (x + barWidth >= x1 && x <= x2);
        ctx.fillStyle = isInside ? '#63d2c6' : 'rgba(99, 210, 198, 0.22)';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Outside trim dim overlays
      ctx.fillStyle = 'rgba(4, 9, 20, 0.68)';
      if (x1 > 0) ctx.fillRect(0, mainY, x1, mainH);
      if (x2 < width) ctx.fillRect(x2, mainY, width - x2, mainH);

      // Active region bounding box & border highlight
      ctx.strokeStyle = '#78bab6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, mainY + 1, Math.max(2, x2 - x1), mainH - 2);

      if (settings.mode === 'slice') {
        if (!slices || !slices.length) rebuildSlices();
        const activeDur = (trimEnd - trimStart) * winDur;
        const startSec = offsetSec + trimStart * winDur;

        // Draw Slices
        if (slices && slices.length) {
          for (let k = 0; k < slices.length; k++) {
            const sl = slices[k];
            const frac1 = Math.max(0, Math.min(1.0, (sl.startSec - startSec) / Math.max(0.001, activeDur)));
            const frac2 = Math.max(0, Math.min(1.0, (sl.endSec - startSec) / Math.max(0.001, activeDur)));
            const sx1 = x1 + frac1 * (x2 - x1);
            const sx2 = x1 + frac2 * (x2 - x1);

            // Active slice audition / playback glow / strip drag glow
            const isStripActive = (activeSliceIndex === k || (dragMode === 'slice-strip' && dragStrip && dragStrip.sliceIdx === k));
            if (isStripActive) {
              ctx.fillStyle = 'rgba(99, 210, 198, 0.32)';
              ctx.fillRect(sx1, mainY, sx2 - sx1, mainH);
            }

            // Divider line
            if (k > 0) {
              const isHovered = (hoveredDividerIndex === k);
              const isDragged = (dragMode === 'slice-divider' && dragDividerIndex === k);
              ctx.strokeStyle = isDragged ? '#ffffff' : (isHovered ? '#b6fff8' : '#63d2c6');
              ctx.lineWidth = isDragged ? 2.5 : (isHovered ? 2.0 : 1.2);
              if (isDragged || isHovered) {
                ctx.shadowColor = '#63d2c6';
                ctx.shadowBlur = isDragged ? 8 : 4;
              }
              ctx.beginPath();
              ctx.moveTo(sx1, mainY);
              ctx.lineTo(sx1, height);
              ctx.stroke();
              if (isDragged || isHovered) {
                ctx.shadowBlur = 0;
              }
            }

            // Slice number badge at top of slice
            const badgeW = 14;
            const badgeH = 12;
            const badgeX = Math.min(x2 - badgeW, sx1 + 3);
            const isDividerActive = (k > 0 && (hoveredDividerIndex === k || (dragMode === 'slice-divider' && dragDividerIndex === k)));
            ctx.fillStyle = isDividerActive ? '#ffffff' : (isStripActive ? '#63d2c6' : 'rgba(10, 26, 42, 0.85)');
            ctx.fillRect(badgeX, mainY + 2, badgeW, badgeH);
            ctx.strokeStyle = isDividerActive ? '#ffffff' : '#63d2c6';
            ctx.lineWidth = isDividerActive ? 1.5 : 0.8;
            ctx.strokeRect(badgeX, mainY + 2, badgeW, badgeH);
            ctx.fillStyle = (isDividerActive || isStripActive) ? '#07101f' : '#cefff3';
            ctx.font = 'bold 8px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(k + 1), badgeX + badgeW / 2, mainY + 2 + badgeH / 2);
          }
        }
      } else if(settings.mode==='loop') {
        // Draw Bar Division Lines & Labels inside the active window
        const barCount = settings.bars || 4;
        ctx.fillStyle = 'rgba(206, 255, 243, 0.85)';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        for (let b = 0; b < barCount; b++) {
          const bx = (b / barCount) * width;
          if (b > 0) {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(120, 186, 182, 0.45)';
            ctx.beginPath();
            ctx.moveTo(bx, mainY);
            ctx.lineTo(bx, height);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.fillText(String(b + 1), bx + 3, height - 3);
        }

        // Real-time Playhead cursor if playing in LOOP mode
        if (loopPlayStartTime > 0 && loopPlayDuration > 0 && activeAudio && activeAudio.ctx) {
          const elapsed = (activeAudio.ctx.currentTime - loopPlayStartTime) % loopPlayDuration;
          const playFrac = Math.max(0, Math.min(1.0, elapsed / loopPlayDuration));
          const phX = x1 + playFrac * (x2 - x1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(phX - 1, mainY, 2, mainH);
        }
      }
    } else {
      // Empty waveform placeholder
      if (isCanvasDragOver) {
        ctx.strokeStyle = '#63d2c6';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(6, 6, width - 12, height - 12);
        ctx.setLineDash([]);
        ctx.fillStyle = '#cefff3';
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tr('Отпустите аудиофайл для импорта (WAV, MP3, OGG, FLAC, M4A)', 'Drop audio file to import (WAV, MP3, OGG, FLAC, M4A)'), width / 2, height / 2);
      } else {
        ctx.fillStyle = 'rgba(140, 175, 195, 0.45)';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tr('Нет записи · Нажмите или перетащите аудиофайл сюда', 'No recording · Tap Record or import audio'), width / 2, height / 2);
      }
    }
  }

  function updateStatusBadge() {
    const badge = document.getElementById('loopStatusBadge');
    if (!badge) return;
    if (recordingState === 'preroll') {
      badge.textContent = tr('ОТСЧЁТ', 'COUNT-IN');
      badge.className = 'loop-status-pill badge-preroll';
    } else if (recordingState === 'recording') {
      badge.textContent = tr('ЗАПИСЬ', 'REC');
      badge.className = 'loop-status-pill badge-recording';
    } else if (recordingState === 'overdubbing') {
      badge.textContent = 'OVERDUB';
      badge.className = 'loop-status-pill badge-overdub';
    } else if (compositeBuffer && !settings.mute) {
      badge.textContent = settings.mode==='pitch'?'PITCH':settings.mode==='slice'?'SLICE':tr('ПОВТОР', 'LOOP');
      badge.className = 'loop-status-pill badge-looping';
    } else if (settings.mute) {
      badge.textContent = tr('MUTE', 'MUTED');
      badge.className = 'loop-status-pill badge-muted';
    } else {
      badge.textContent = tr('ГОТОВ', 'READY');
      badge.className = 'loop-status-pill';
    }
  }

  function updateStepIndicators() {
    const steps = {
      preroll: document.getElementById('stepPreroll'),
      record: document.getElementById('stepRecord'),
      loop: document.getElementById('stepLoop'),
      overdub: document.getElementById('stepOverdub')
    };
    for (const [key, el] of Object.entries(steps)) {
      if (!el) continue;
      el.classList.remove('active');
    }
    if (recordingState === 'preroll') steps.preroll?.classList.add('active');
    else if (recordingState === 'recording') steps.record?.classList.add('active');
    else if (recordingState === 'overdubbing') steps.overdub?.classList.add('active');
    else if (compositeBuffer) steps.loop?.classList.add('active');

    const btnRec = document.getElementById('btnLoopRecord');
    const btnLoop = document.getElementById('btnLoopLoop');
    const btnOverdub = document.getElementById('btnLoopOverdub');
    const btnUndo = document.getElementById('btnLoopUndo');

    if (btnRec) btnRec.classList.toggle('recording', recordingState === 'recording' || (recordingState === 'preroll' && !isOverdubMode));
    if (btnOverdub) btnOverdub.classList.toggle('recording', recordingState === 'overdubbing' || (recordingState === 'preroll' && isOverdubMode));
    if (btnLoop) btnLoop.classList.toggle('active', !!compositeBuffer && !settings.mute && recordingState === 'idle');
    if (btnUndo) btnUndo.disabled = (layers.length === 0);
  }

  let panelLanguage=null;
  function createUI(container, env) {
    const oldWindowButton=typeof document!=='undefined'?document.getElementById('loopCompact'):null;if(oldWindowButton&&oldWindowButton.parentNode?.id==='workspaceWindowActions')oldWindowButton.remove();
    if (env) envRef = env;
    if (!container && typeof document !== 'undefined') container = document.getElementById('liveLoopPanel');
    if (!container) return;
    panelLanguage=envRef?.language?.()||'ru';
    const isSlice = (settings.mode === 'slice'), isPitch=settings.mode==='pitch',isSequenced=isSlice||isPitch;
    const sliceCount = settings.sliceCount || 8;
    const slicePat = settings.slicePattern || 'beat';
    const cycle = settings.cycle || 16;
    const stepLen = settings.stepLength || 1;
    const offset = settings.offset || 0;
    const delayTime = settings.delayTime || '1/8';

    let stepsHtml = '';
    if (isSequenced) {
      stepsHtml = `
        <div class="slice-seq-card">
          <div class="slice-seq-header">
            <div class="slice-seq-header-left">
              <span class="slice-pill-title">${isPitch?tr('16 ШАГОВ · СТУПЕНИ ЛАДА','16 STEPS · SCALE DEGREES'):tr('16-ШАГОВЫЙ ПАТТЕРН', '16-STEP SLICE PATTERN')}</span>
              <small class="slice-seq-hint">${isPitch?tr('Нажмите: ступень 1–8 или пауза','Tap: scale degree 1–8 or rest'):tr('Кликните по шагу для выбора сэмпла (1..N или пауза)', 'Click step to cycle slice or rest')}</small>
            </div>
            <div class="slice-seq-header-actions">
              <button type="button" class="slice-pill-btn slice-pill-rand-btn" id="sliceSeqRandBtn" title="${isPitch?tr('Случайный нотный рисунок','Random note pattern'):tr('Случайный ритм слайсов', 'Random slice pattern')}">🎲 ${tr('РАНДОМ', 'RANDOM')}</button>
              <button type="button" class="slice-pill-btn slice-pill-reset-btn" id="sliceSeqResetBtn" title="${isPitch?tr('Восстановить исходный нотный рисунок','Restore initial note pattern'):tr('Сбросить паттерн к начальному (BEAT)', 'Reset pattern to default (BEAT)')}">↺ ${tr('СБРОС', 'RESET')}</button>
            </div>
          </div>
          <div class="slice-seq-grid" id="sliceSeqGrid">
            ${Array.from({ length: 16 }, (_, i) => {
              const val = settings[isPitch?'pitchSteps':'sliceSteps'][i];
              const isActive = (val >= 0);
              const isAnchor = (i % 4 === 0);
              const label = isActive ? String(val + 1) : '—';
              return `<button type="button" class="slice-seq-pad ${isActive ? 'active' : ''} ${isAnchor ? 'anchor' : ''}" data-slice-step="${i}" title="${tr('Шаг', 'Step')} ${i + 1}: ${isActive ? (isPitch?tr('Ступень','Degree'):tr('Слайс', 'Slice')) + ' ' + (val + 1) : tr('Пауза', 'Rest')}">
                <span class="slice-step-num">${i + 1}</span>
                <span class="slice-step-val">${label}</span>
              </button>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="loop-head">
        <div class="loop-title-wrap">
          <span class="loop-mic-icon">🎙</span>
          <strong>09 — ${isPitch?'PITCH':isSlice ? 'SLICE' : 'LIVE LOOP'}</strong>
          <div class="loop-mode-switch" role="tablist">
            <button type="button" class="loop-mode-btn ${!isSequenced ? 'active' : ''}" id="modeBtnLoop" title="${tr('Режим зацикленного воспроизведения и наложения', 'Continuous loop and overdub mode')}">◈ LOOP</button>
            <button type="button" class="loop-mode-btn ${isSlice ? 'active' : ''}" id="modeBtnSlice" title="${tr('Режим нарезки сэмплов по транзиентам', 'Transient slice chopping and sequencing')}">✂ SLICE</button>
            <button type="button" class="loop-mode-btn ${isPitch?'active':''}" id="modeBtnPitch" title="${tr('Один семпл: воспроизведение нотами без нарезки','One sample played as notes without slicing')}">♪ PITCH</button>
          </div>
        </div>
        <div class="loop-head-actions">
          <button type="button" class="loop-small-btn" id="loopInputToggle" aria-controls="audioInputWindow" aria-expanded="${inputWindowOpen}" title="${tr('Микрофон и аудиоустройства','Microphone and audio devices')}">${tr('АУДИОВХОД / МИКРОФОН','AUDIO INPUT / MIC')}</button>
          <button type="button" class="loop-small-btn" id="loopCompact" aria-controls="track09Advanced" aria-expanded="${!compactMode}" aria-label="${tr(compactMode?'Развернуть настройки Track 09':'Минимизировать настройки Track 09',compactMode?'Expand Track 09 settings':'Minimize Track 09 settings')}">${compactMode?'▣':'▁'}</button>
          <button type="button" class="loop-instant-btn ${settings.instantRestart ? 'active' : ''}" id="loopInstantRestart" title="${tr('Мгновенный перезапуск при изменении параметров', 'Instant restart on parameter change')}">
            <span class="loop-instant-glyph">⚡</span>
            <span>INSTANT RESTART</span>
          </button>
          <div class="loop-status-pill" id="loopStatusBadge">ГОТОВ</div>
        </div>
      </div>

      ${isPitch ? `
        <div class="pitch-setup">
          <label>${tr('ИСХОДНАЯ НОТА СЕМПЛА','SAMPLE ROOT NOTE')}
            <select id="pitchRootNote" aria-label="${tr('Исходная нота записи','Recorded root note')}">${Array.from({length:49},(_,i)=>`<option value="${i+36}" ${settings.rootNote===i+36?'selected':''}>${noteName(i+36)}</option>`).join('')}</select>
          </label>
          <label>${tr('ОКТАВА МЕЛОДИИ','MELODY OCTAVE')}
            <select id="pitchOctave" aria-label="${tr('Октава мелодии семпла','Sample melody octave')}">${[-1,0,1].map(n=>`<option value="${n}" ${settings.pitchOctave===n?'selected':''}>${n>0?'+':''}${n}</option>`).join('')}</select>
          </label>
          <small>${tr('Одна нота или фраза · окно до 8 с, минимум 40 мс · ±24 полутона. Укажите реальную ноту записи; высота и длительность меняются вместе. Высоты вне диапазона пропускаются.','One note or phrase · window up to 8 s, minimum 40 ms · ±24 semitones. Set the actual recorded note; pitch and playback length change together. Out-of-range notes rest.')}</small>
          <div class="loop-btn-row">
            <button type="button" class="glass-btn" id="sliceBtnRec">● ${tr('ЗАПИСЬ','RECORD')}</button>
            <button type="button" class="glass-btn" id="btnLoopOverdub">🥞 OVERDUB</button>
            <button type="button" class="glass-btn" id="btnLoopUndo" ${layers.length?'':'disabled'}>↺ ${tr('ОТМЕНА','UNDO')}</button>
            <button type="button" class="glass-btn" id="loopImportBtn">📂 ${tr('ИМПОРТ','IMPORT')}</button>
            <input type="file" id="loopFileInput" accept="audio/*" hidden>
            <button type="button" class="glass-btn" id="loopClearBtn">${tr('СБРОС','CLEAR')}</button>
          </div>
        </div>
      ` : isSlice ? `
        <div class="slice-toolbar">
          <div class="slice-pill-group" id="sliceCountGroup">
            <span class="slice-pill-title">SLICES:</span>
            <button type="button" class="slice-pill-btn ${sliceCount === 4 ? 'active' : ''}" data-slice-count="4">4</button>
            <button type="button" class="slice-pill-btn ${sliceCount === 8 ? 'active' : ''}" data-slice-count="8">8</button>
            <button type="button" class="slice-pill-btn ${sliceCount === 16 ? 'active' : ''}" data-slice-count="16">16</button>
          </div>
          <div class="slice-pill-group" id="slicePatternGroup">
            <span class="slice-pill-title">PATTERN:</span>
            <button type="button" class="slice-pill-btn ${slicePat === 'beat' ? 'active' : ''}" data-slice-pattern="beat">BEAT</button>
            <button type="button" class="slice-pill-btn ${slicePat === 'chrono' ? 'active' : ''}" data-slice-pattern="chrono">CHRONO</button>
            <button type="button" class="slice-pill-btn ${slicePat === 'shuffle' ? 'active' : ''}" data-slice-pattern="shuffle">SHUFFLE</button>
            <button type="button" class="slice-pill-btn ${(slicePat === 'arp' || slicePat === 'arpeggio') ? 'active' : ''}" data-slice-pattern="arp">ARP</button>
            <button type="button" class="slice-pill-btn slice-pill-rand-btn" id="slicePatRandBtn" title="${tr('Случайный ритм слайсов', 'Random slice pattern')}">🎲 ${tr('РАНДОМ', 'RAND')}</button>
            <button type="button" class="slice-pill-btn slice-pill-reset-btn" id="slicePatResetBtn" title="${tr('Сбросить паттерн к начальному (BEAT)', 'Reset pattern to default (BEAT)')}">↺ ${tr('СБРОС', 'RESET')}</button>
          </div>
          <div class="slice-pill-group slice-actions-group">
            <button type="button" class="glass-btn slice-aux-btn" id="sliceBtnRec" title="${tr('Запись с микрофона', 'Record from microphone')}">🎙 REC</button>
            <button type="button" class="glass-btn slice-aux-btn" id="loopImportBtn">📂 ${tr('ИМПОРТ', 'IMPORT')}</button>
            <input type="file" id="loopFileInput" accept="audio/*" hidden>
            <button type="button" class="glass-btn slice-aux-btn" id="loopClearBtn" title="${tr('Очистить аудио', 'Clear audio')}">🗑</button>
            <button type="button" class="glass-btn slice-aux-btn" id="btnLoopUndo" title="${tr('Отменить последний слой', 'Undo last take')}" ${layers.length === 0 ? 'disabled' : ''}>↺</button>
          </div>
        </div>
      ` : `
        <div class="loop-steps-bar" role="tablist" aria-label="Live loop workflow">
          <div class="loop-step" id="stepPreroll">
            <span class="loop-step-icon">⏱</span>
            <strong>${tr('Подготовка', 'Preparation')}</strong>
            <small>${tr('Отсчёт', 'Count-in')}</small>
          </div>
          <div class="loop-step" id="stepRecord">
            <span class="loop-step-icon">🎙</span>
            <strong>${tr('Запись', 'Recording')}</strong>
            <small id="stepRecordBars">${settings.bars} ${tr('такта', 'bars')}</small>
          </div>
          <div class="loop-step" id="stepLoop">
            <span class="loop-step-icon">🔁</span>
            <strong>${tr('Повтор', 'Playback')}</strong>
            <small>Loop</small>
          </div>
          <div class="loop-step" id="stepOverdub">
            <span class="loop-step-icon">🥞</span>
            <strong>Overdub</strong>
            <small>${tr('Слой', 'Layer')}</small>
          </div>
        </div>
      `}

      <div class="loop-waveform-card">
        <div class="loop-wave-header">
          <span id="loopWaveTitle">${isPitch?tr('Один семпл · PITCH','One sample · PITCH'):isSlice ? `${tr('Нарезка сэмплов', 'Slice Chops')} · ${sliceCount} ${tr('кусочков', 'Slices')}` : `${settings.mode==='pitch'?tr('Один семпл · PITCH','One sample · PITCH'):tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')}`}</span>
          <span id="loopWaveBpm">72 BPM</span>
        </div>
        <div class="loop-canvas-wrap">
          <canvas id="loopCanvas" height="110"></canvas>
        </div>
        <div class="loop-trim-wrap">
          ${isSlice ? `
            <label class="loop-trim-label">
              <span>TRIM START: <output id="trimStartVal">${Math.round((settings.trimStart||0)*100)}%</output></span>
              <input type="range" id="loopTrimStart" min="0" max="95" value="${Math.round((settings.trimStart||0)*100)}" step="1">
            </label>
            <label class="loop-trim-label">
              <span>TRIM END: <output id="trimEndVal">${Math.round((settings.trimEnd||1)*100)}%</output></span>
              <input type="range" id="loopTrimEnd" min="5" max="100" value="${Math.round((settings.trimEnd||1)*100)}" step="1">
            </label>

            <label class="loop-trim-label">
              <span>PITCH: <output id="loopPitchVal">${(settings.pitch||0) > 0 ? '+' + settings.pitch : (settings.pitch || 0)} st</output></span>
              <input type="range" id="loopPitch" min="-12" max="12" value="${settings.pitch || 0}" step="1">
            </label>
            <div class="loop-rev-wrap">
              <button type="button" class="loop-rev-btn ${settings.reverse ? 'active' : ''}" id="loopRevBtn" title="${tr('Реверс воспроизведения аудио', 'Reverse audio playback')}">
                <span>⇄ REV</span>
              </button>
            </div>
            <div class="loop-slice-hint-label">
              <small>${tr('✂ Транзиенты найдены автоматически · Нажмите на срез для проверки', '✂ Transients detected · Tap slice on waveform to audition')}</small>
            </div>
          ` : `
            <label class="loop-trim-label">
              <span>TRIM START: <output id="trimStartVal">${Math.round((settings.trimStart||0)*100)}%</output></span>
              <input type="range" id="loopTrimStart" min="0" max="95" value="${Math.round((settings.trimStart||0)*100)}" step="1">
            </label>
            <label class="loop-trim-label">
              <span>TRIM END: <output id="trimEndVal">${Math.round((settings.trimEnd||1)*100)}%</output></span>
              <input type="range" id="loopTrimEnd" min="5" max="100" value="${Math.round((settings.trimEnd||1)*100)}" step="1">
            </label>
            <label class="loop-trim-label">
              <span>PITCH: <output id="loopPitchVal">${(settings.pitch||0) > 0 ? '+' + settings.pitch : (settings.pitch || 0)} st</output></span>
              <input type="range" id="loopPitch" min="-12" max="12" value="${settings.pitch || 0}" step="1">
            </label>
            <div class="loop-rev-wrap">
              <button type="button" class="loop-rev-btn ${settings.reverse ? 'active' : ''}" id="loopRevBtn" title="${tr('Реверс воспроизведения аудио', 'Reverse audio playback')}">
                <span>⇄ REV</span>
              </button>
            </div>
          `}
        </div>
      </div>

      ${isSequenced ? stepsHtml : `
        <div class="loop-actions">
          <button type="button" class="loop-action-btn loop-btn-record" id="btnLoopRecord" title="${tr('Начать запись с микрофона', 'Start recording from microphone')}">
            <span class="loop-action-glyph rec-glyph">●</span>
            <span>Record</span>
          </button>
          <button type="button" class="loop-action-btn loop-btn-loop" id="btnLoopLoop" title="${tr('Зациклить воспроизведение', 'Play / loop')}">
            <span class="loop-action-glyph loop-glyph">🔁</span>
            <span>Loop</span>
          </button>
          <button type="button" class="loop-action-btn loop-btn-overdub" id="btnLoopOverdub" title="${tr('Записать Overdub слой', 'Record new overdub layer')}">
            <span class="loop-action-glyph overdub-glyph">🥞</span>
            <span>Overdub</span>
          </button>
          <button type="button" class="loop-action-btn loop-btn-undo" id="btnLoopUndo" title="${tr('Отменить последний Overdub', 'Undo last overdub')}">
            <span class="loop-action-glyph undo-glyph">↺</span>
            <span>Undo</span>
          </button>
        </div>
      `}

      <div class="loop-controls-strip">
        ${isSequenced ? `
          <div class="loop-ctrl-group loop-slice-sound-group">
            <span class="loop-group-title">SOUND</span>
            <div class="loop-sliders-grid loop-slice-grid">
              <label class="loop-slider-label" title="${tr('Фильтр среза низких/высоких частот (250 Гц .. 20 кГц)', 'Lowpass filter cutoff')}">
                <span>${tr('ХАРАКТЕР', 'CHARACTER')} <output id="loopCharVal">${settings.character || 60}%</output></span>
                <input type="range" id="loopCharacter" min="0" max="100" value="${settings.character || 60}">
              </label>
              <label class="loop-slider-label" title="${isPitch?tr('Длина звучания семпла; новый запуск прерывает предыдущий','Sample duration; a new trigger chokes the previous voice'):tr('Длина звучания кусочка (гейт / затухание)', 'Slice gate duration and release')}">
                <span>${tr('ДЛИТЕЛЬНОСТЬ', 'DURATION')} <output id="loopDurVal">${settings.duration || 65}%</output></span>
                <input type="range" id="loopDuration" min="10" max="100" value="${settings.duration || 65}">
              </label>
              <label class="loop-slider-label" title="${tr('Плотность срабатывания ритмических шагов', 'Rhythmic trigger density')}">
                <span>${tr('ПЛОТНОСТЬ', 'DENSITY')} <output id="loopDensVal">${settings.density || 75}%</output></span>
                <input type="range" id="loopDensity" min="0" max="100" value="${settings.density || 75}">
              </label>
              <label class="loop-slider-label">
                <span>LEVEL <output id="loopLevelVal">${settings.level}%</output></span>
                <input type="range" id="loopLevel" min="0" max="100" value="${settings.level}">
              </label>
              <label class="loop-slider-label">
                <span>PAN <output id="loopPanVal">${settings.pan}</output></span>
                <input type="range" id="loopPan" min="-100" max="100" value="${settings.pan}">
              </label>
            </div>
            <div class="loop-slice-meta-row">
              <div class="loop-slice-subgroup">
                <span class="slice-pill-title">CYCLE:</span>
                <div class="loop-mini-pills">
                  <button type="button" class="slice-pill-btn ${cycle===4?'active':''}" data-slice-cycle="4">4</button>
                  <button type="button" class="slice-pill-btn ${cycle===8?'active':''}" data-slice-cycle="8">8</button>
                  <button type="button" class="slice-pill-btn ${cycle===16?'active':''}" data-slice-cycle="16">16</button>
                  <button type="button" class="slice-pill-btn ${cycle===32?'active':''}" data-slice-cycle="32">32</button>
                </div>
              </div>
              <div class="loop-slice-subgroup">
                <span class="slice-pill-title">STEP:</span>
                <div class="loop-mini-pills">
                  <button type="button" class="slice-pill-btn ${stepLen===1?'active':''}" data-slice-step-len="1">1/16</button>
                  <button type="button" class="slice-pill-btn ${stepLen===2?'active':''}" data-slice-step-len="2">1/8</button>
                  <button type="button" class="slice-pill-btn ${stepLen===4?'active':''}" data-slice-step-len="4">1/4</button>
                </div>
              </div>
              <div class="loop-slice-subgroup">
                <span class="slice-pill-title">OFFSET:</span>
                <div class="loop-mini-pills">
                  <button type="button" class="slice-pill-btn ${offset===0?'active':''}" data-slice-offset="0">0</button>
                  <button type="button" class="slice-pill-btn ${offset===2?'active':''}" data-slice-offset="2">2</button>
                  <button type="button" class="slice-pill-btn ${offset===4?'active':''}" data-slice-offset="4">4</button>
                  <button type="button" class="slice-pill-btn ${offset===8?'active':''}" data-slice-offset="8">8</button>
                </div>
              </div>
              <div class="loop-btn-row loop-mute-solo-row">
                <button type="button" class="loop-mini-toggle ${settings.mute?'active':''}" id="loopMute">MUTE</button>
                <button type="button" class="loop-mini-toggle ${settings.solo?'active':''}" id="loopSolo">SOLO</button>
              </div>
            </div>
          </div>

          <div class="loop-ctrl-group loop-slice-fx-group">
            <span class="loop-group-title">FX</span>
            <div class="loop-sliders-grid loop-slice-fx-grid">
              <label class="loop-slider-label">
                <span>${tr('РЕВЕРБ', 'REVERB')} <output id="loopReverbVal">${settings.space}%</output></span>
                <input type="range" id="loopReverb" min="0" max="100" value="${settings.space}">
              </label>
              <label class="loop-slider-label">
                <span>${tr('ДИЛЭЙ', 'DELAY')} <output id="loopDelayVal">${settings.delay}%</output></span>
                <input type="range" id="loopDelay" min="0" max="100" value="${settings.delay}">
              </label>
              <label class="loop-slider-label">
                <span>${tr('ХОРУС', 'CHORUS')} <output id="loopChorusVal">${settings.chorus||0}%</output></span>
                <input type="range" id="loopChorus" min="0" max="100" value="${settings.chorus||0}">
              </label>
            </div>
            <div class="loop-slice-subgroup loop-delay-time-subgroup">
              <span class="slice-pill-title">DELAY TIME:</span>
              <div class="loop-mini-pills">
                <button type="button" class="slice-pill-btn ${delayTime==='1/16'?'active':''}" data-slice-delay-time="1/16">1/16</button>
                <button type="button" class="slice-pill-btn ${delayTime==='1/8'?'active':''}" data-slice-delay-time="1/8">1/8</button>
                <button type="button" class="slice-pill-btn ${delayTime==='1/8d'?'active':''}" data-slice-delay-time="1/8d">1/8D</button>
                <button type="button" class="slice-pill-btn ${delayTime==='1/4'?'active':''}" data-slice-delay-time="1/4">1/4</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="loop-ctrl-group loop-bars-group">
            <span class="loop-group-title">BARS</span>
            <div class="loop-bars-buttons" id="loopBarsGroup">
              <button type="button" class="loop-bar-btn ${settings.bars===1?'active':''}" data-bars="1">1</button>
              <button type="button" class="loop-bar-btn ${settings.bars===2?'active':''}" data-bars="2">2</button>
              <button type="button" class="loop-bar-btn ${settings.bars===4?'active':''}" data-bars="4">4</button>
              <button type="button" class="loop-bar-btn ${settings.bars===8?'active':''}" data-bars="8">8</button>
            </div>
            <div class="loop-btn-row loop-mute-solo-row">
              <button type="button" class="loop-mini-toggle ${settings.mute?'active':''}" id="loopMute">MUTE</button>
              <button type="button" class="loop-mini-toggle ${settings.solo?'active':''}" id="loopSolo">SOLO</button>
            </div>
          </div>

          <div class="loop-ctrl-group loop-mix-group">
            <span class="loop-group-title">MIX</span>
            <div class="loop-sliders-grid">
              <label class="loop-slider-label">
                <span>LEVEL <output id="loopLevelVal">${settings.level}%</output></span>
                <input type="range" id="loopLevel" min="0" max="100" value="${settings.level}">
              </label>
              <label class="loop-slider-label">
                <span>PAN <output id="loopPanVal">${settings.pan}</output></span>
                <input type="range" id="loopPan" min="-100" max="100" value="${settings.pan}">
              </label>
              <label class="loop-slider-label">
                <span>${tr('РЕВЕРБ', 'REVERB')} <output id="loopReverbVal">${settings.space}%</output></span>
                <input type="range" id="loopReverb" min="0" max="100" value="${settings.space}">
              </label>
              <label class="loop-slider-label">
                <span>${tr('ДИЛЭЙ', 'DELAY')} <output id="loopDelayVal">${settings.delay}%</output></span>
                <input type="range" id="loopDelay" min="0" max="100" value="${settings.delay}">
              </label>
            </div>
          </div>

          <div class="loop-ctrl-group loop-aux-group">
            <div class="loop-btn-row">
              <button type="button" class="glass-btn loop-import-btn" id="loopImportBtn">📂 ${tr('ИМПОРТ', 'IMPORT')}</button>
              <input type="file" id="loopFileInput" accept="audio/*" hidden>
              <button type="button" class="glass-btn loop-clear-btn" id="loopClearBtn">🗑 ${tr('СБРОС', 'CLEAR')}</button>
            </div>

          </div>
        `}
      </div>

      <div class="loop-footer-notice">
        <small id="loopFooterText">${tr('Ваше аудио остаётся в этом браузере · Не передаётся на сервер', 'Your audio stays in this browser · Never uploaded to a server')}</small>
      </div>
    `;

    organizeUI(container);
    bindUIEvents(container);
    const windowActions=document.getElementById('workspaceWindowActions'),windowButton=container.querySelector?.('#loopCompact');
    if(windowActions&&windowButton){windowButton.className='window-action track09-window-action';windowButton.textContent='';windowActions.prepend(windowButton);}
    renderInputWindow();
    updateInputUI();
    if(initialized&&!hydrated)Array.from(container.querySelectorAll?.('button,input,select')||[]).forEach(control=>control.disabled=true);
    renderWaveform();
    updateStatusBadge();
    updateStepIndicators();
  }

  function bindUIEvents(container) {
    if (!container && typeof document !== 'undefined') container = document.getElementById('liveLoopPanel');
    const rootEl = container || (typeof document !== 'undefined' ? document : null);
    if (!rootEl) return;
    const find = (id) => (rootEl.querySelector ? rootEl.querySelector('#' + id) : null) || (typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null);
    const findAll = (sel) => Array.from((rootEl.querySelectorAll ? rootEl.querySelectorAll(sel) : []) || []);

    const inputToggle=find('loopInputToggle'),compact=find('loopCompact');
    if(inputToggle)inputToggle.onclick=()=>setInputWindow(!inputWindowOpen,true);
    if(compact)compact.onclick=()=>{setCompact(!compactMode);syncCompact(container);};
    const rootNote=find('pitchRootNote'),octave=find('pitchOctave');
    if(rootNote)rootNote.onchange=e=>api.setSettings({rootNote:Number(e.target.value)});
    if(octave)octave.onchange=e=>api.setSettings({pitchOctave:Number(e.target.value)});
    const pitchMode=find('modeBtnPitch');if(pitchMode)pitchMode.onclick=()=>{api.setMode('pitch');stopPlayback();createUI(container)};

    const btnModeLoop = find('modeBtnLoop') || find('btnLoopModeLoop');
    const btnModeSlice = find('modeBtnSlice') || find('btnLoopModeSlice');
    if (btnModeLoop) btnModeLoop.onclick = () => {
      if (settings.mode !== 'loop') {
        settings.mode = 'loop';
        persistSettings();
        stopPlayback();
        createUI(container);
        envRef?.toast(tr('Режим LOOP: Непрерывное зацикливание', 'LOOP mode: Continuous audio loop'));
      }
    };
    if (btnModeSlice) btnModeSlice.onclick = () => {
      if (settings.mode !== 'slice') {
        settings.mode = 'slice';
        rebuildSlices();
        persistSettings();
        stopPlayback();
        createUI(container);
        envRef?.toast(tr('Режим SLICE: Нарезка по транзиентам', 'SLICE mode: Transient chop sequencer'));
      }
    };

    // Transport / Layer Buttons (Loop Mode)
    const btnRec = find('btnLoopRecord');
    const btnLoop = find('btnLoopLoop');
    const btnOverdub = find('btnLoopOverdub');
    const btnUndo = find('btnLoopUndo');

    if (btnRec) btnRec.onclick = () => {
      if (recordingState === 'recording') {
        if (activeAudio) finishRecording(activeAudio, envRef?.settings?.().tempo || 72);
      } else {
        armRecording(false, activeAudio, envRef?.settings?.().tempo || 72);
      }
    };

    if (btnLoop) btnLoop.onclick = () => {
      if (recordingState === 'recording' || recordingState === 'overdubbing') {
        if (activeAudio) finishRecording(activeAudio, envRef?.settings?.().tempo || 72);
      } else if (compositeBuffer) {
        settings.mute = false;
        updateMixerNodes();
        persistSettings();
        updateStatusBadge();
        envRef?.toast(tr('9-й трек включён в повтор', 'Track 09 loop playing'));
      }
    };

    if (btnOverdub) btnOverdub.onclick = () => {
      armRecording(true, activeAudio, envRef?.settings?.().tempo || 72);
    };

    if (btnUndo) btnUndo.onclick = () => {
      undoLastLayer();
    };

    // Instant Restart Button
    const instantBtn = find('loopInstantRestart');
    if (instantBtn) instantBtn.onclick = () => {
      settings.instantRestart = !settings.instantRestart;
      instantBtn.classList.toggle('active', settings.instantRestart);
      persistSettings();
      envRef?.toast(settings.instantRestart ? tr('Instant Restart включён', 'Instant Restart ON') : tr('Instant Restart выключен', 'Instant Restart OFF'));
    };

    // Bars Buttons (Loop Mode)
    const barsGroup = find('loopBarsGroup');
    if (barsGroup) {
      Array.from(barsGroup.children).forEach(btn => {
        btn.onclick = () => {
          const b = Number(btn.dataset.bars) || 4;
          settings.bars = b;
          Array.from(barsGroup.children).forEach(el => el.classList.toggle('active', el === btn));
          const recBars = find('stepRecordBars');
          if (recBars) recBars.textContent = `${b} ${tr('такта', 'bars')}`;

          if (compositeBuffer) {
            const tempo = envRef?.settings?.().tempo || 72;
            const loopDur = (b * 4 * 60) / tempo;
            const totalDur = compositeBuffer.duration;
            if (totalDur > loopDur + 0.05) {
              settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, settings.offsetSec || 0));
            } else {
              settings.offsetSec = 0;
            }
          }

          persistSettings();
          renderWaveform();
          triggerQuantizedLoopRestart();
        };
      });
    }

    // Slice Count Buttons (Slice Mode)
    const countBtns = findAll('[data-slice-count]');
    countBtns.forEach(btn => {
      btn.onclick = () => {
        const c = Number(btn.dataset.sliceCount) || 8;
        settings.sliceCount = c;
        rebuildSlices();
        if (Array.isArray(settings.sliceSteps)) {
          settings.sliceSteps = settings.sliceSteps.map(v => (v >= c ? (v % c) : v));
        }
        persistSettings();
        createUI(container);
        renderWaveform();
        envRef?.toast(tr(`Нарезка: ${c} слайсов`, `Slices: ${c} chops`));
      };
    });

    // Slice Pattern Buttons (Slice Mode)
    const patBtns = findAll('[data-slice-pattern]');
    patBtns.forEach(btn => {
      btn.onclick = () => {
        const pat = btn.dataset.slicePattern || btn.dataset.slicePat || 'beat';
        settings.slicePattern = pat;
        settings.sliceSteps = getPresetSlicePattern(pat, settings.sliceCount || 8);
        persistSettings();
        createUI(container);
        renderWaveform();
        triggerQuantizedLoopRestart();
        envRef?.toast(tr(`Паттерн: ${pat.toUpperCase()}`, `Pattern: ${pat.toUpperCase()}`));
      };
    });

    // Slice Pattern Random & Reset Buttons
    const doRandomPattern = () => {
      if(settings.mode==='pitch'){api.setSettings({pitchSteps:Array.from({length:16},(_,i)=>i%4===0?0:Math.random()<.4?-1:Math.floor(Math.random()*8))});createUI(container);return;}
      settings.slicePattern = 'custom';
      settings.sliceSteps = randomizeSlicePattern(settings.sliceCount || 8);
      persistSettings();
      createUI(container);
      renderWaveform();
      triggerQuantizedLoopRestart();
      envRef?.toast(tr('Случайный рисунок слайсов', 'Random slice pattern generated'));
    };

    const doResetPattern = () => {
      if(settings.mode==='pitch'){api.setSettings({pitchSteps:[...defaultSettings.pitchSteps]});createUI(container);return;}
      settings.slicePattern = 'beat';
      settings.sliceSteps = getPresetSlicePattern('beat', settings.sliceCount || 8);
      persistSettings();
      createUI(container);
      renderWaveform();
      triggerQuantizedLoopRestart();
      envRef?.toast(tr('Паттерн сброшен к начальному (BEAT)', 'Pattern reset to default (BEAT)'));
    };

    ['slicePatRandBtn', 'sliceSeqRandBtn'].forEach(id => {
      const el = find(id);
      if (el) el.onclick = doRandomPattern;
    });
    ['slicePatResetBtn', 'sliceSeqResetBtn'].forEach(id => {
      const el = find(id);
      if (el) el.onclick = doResetPattern;
    });

    // Slice Record Button
    const sliceBtnRec = find('sliceBtnRec');
    if (sliceBtnRec) {
      sliceBtnRec.onclick = () => {
        if (recordingState === 'recording') {
          if (activeAudio) finishRecording(activeAudio, envRef?.settings?.().tempo || 72);
        } else {
          armRecording(false, activeAudio, envRef?.settings?.().tempo || 72);
        }
      };
    }

    // Slice 16-Step Sequencer Grid
    const seqGrid = find('sliceSeqGrid');
    if (seqGrid) {
      const resetPadStep = (stepIdx, pad) => {
        if (isNaN(stepIdx) || stepIdx < 0 || stepIdx > 15) return;
        if (settings.mode === 'pitch') {
          const steps = [...(settings.pitchSteps || [])];
          steps[stepIdx] = -1;
          api.setSettings({ pitchSteps: steps });
          createUI(container);
          return;
        }
        if (!Array.isArray(settings.sliceSteps) || settings.sliceSteps.length !== 16) {
          settings.sliceSteps = getPresetSlicePattern('beat', settings.sliceCount || 8);
        }
        settings.sliceSteps[stepIdx] = -1;
        settings.slicePattern = 'custom';
        const patGroup = find('slicePatternGroup');
        if (patGroup) {
          Array.from(patGroup.children).forEach(b => {
            if (b.dataset && b.dataset.slicePattern) b.classList.remove('active');
          });
        }
        persistSettings();
        pad.classList.remove('active');
        const label = pad.querySelector('.slice-step-val') || pad;
        label.textContent = '—';
        pad.title = `${tr('Шаг', 'Step')} ${stepIdx + 1}: ${tr('Пауза', 'Rest')}`;
      };

      Array.from(seqGrid.children).forEach(pad => {
        let longPressTimer = null;
        let isLongPress = false;

        const startLongPress = (e) => {
          if (e.button !== undefined && e.button !== 0) return;
          isLongPress = false;
          clearTimeout(longPressTimer);
          longPressTimer = setTimeout(() => {
            isLongPress = true;
            const stepIdx = Number(pad.dataset.sliceStep);
            resetPadStep(stepIdx, pad);
          }, 450);
        };

        const cancelLongPress = () => {
          clearTimeout(longPressTimer);
        };

        pad.onpointerdown = startLongPress;
        pad.onpointerup = cancelLongPress;
        pad.onpointercancel = cancelLongPress;
        pad.onpointerleave = cancelLongPress;

        pad.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          cancelLongPress();
          const stepIdx = Number(pad.dataset.sliceStep);
          resetPadStep(stepIdx, pad);
        };

        pad.onkeydown = (e) => {
          if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') {
            e.preventDefault();
            const stepIdx = Number(pad.dataset.sliceStep);
            resetPadStep(stepIdx, pad);
          }
        };

        pad.onclick = (e) => {
          if (isLongPress) {
            isLongPress = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          const stepIdx = Number(pad.dataset.sliceStep);
          if (isNaN(stepIdx) || stepIdx < 0 || stepIdx > 15) return;
          if (!Array.isArray(settings.sliceSteps) || settings.sliceSteps.length !== 16) {
            settings.sliceSteps = getPresetSlicePattern('beat', settings.sliceCount || 8);
          }
          if (settings.mode === 'pitch') {
            const steps = [...settings.pitchSteps];
            steps[stepIdx] = steps[stepIdx] >= 7 ? -1 : steps[stepIdx] + 1;
            api.setSettings({ pitchSteps: steps });
            createUI(container);
            return;
          }
          const curVal = (typeof settings.sliceSteps[stepIdx] === 'number') ? settings.sliceSteps[stepIdx] : -1;
          const count = settings.sliceCount || 8;
          // Cycle: -1 -> 0 -> 1 -> ... -> (count - 1) -> -1
          const nextVal = (curVal + 2 > count) ? -1 : curVal + 1;
          settings.sliceSteps[stepIdx] = nextVal;
          settings.slicePattern = 'custom';
          const patGroup = find('slicePatternGroup');
          if (patGroup) {
            Array.from(patGroup.children).forEach(b => {
              if (b.dataset && b.dataset.slicePattern) b.classList.remove('active');
            });
          }
          persistSettings();
          if (nextVal >= 0) playSlice(nextVal);
          pad.classList.toggle('active', nextVal >= 0);
          const label = pad.querySelector('.slice-step-val') || pad;
          label.textContent = nextVal >= 0 ? String(nextVal + 1) : '—';
          pad.title = `${tr('Шаг', 'Step')} ${stepIdx + 1}: ${nextVal >= 0 ? tr('Слайс', 'Slice') + ' ' + (nextVal + 1) : tr('Пауза', 'Rest')}`;
        };
      });
    }

    // Interactive Waveform Dragging, Slice Editing & Navigation
    const canvas = find('loopCanvas');
    if (canvas) {
      let dragStart = null;

      canvas.onpointerdown = (e) => {
        if (e.button !== 0) return;
        if (!compositeBuffer) {
          const fileInput = find('loopFileInput');
          if (fileInput) fileInput.click();
          return;
        }
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0) return;

        const tempo = envRef?.settings?.().tempo || 72;
        const loopDur = settings.mode==='pitch'?8:(settings.bars * 4 * 60) / tempo;
        const totalDur = compositeBuffer.duration;
        const isLonger = totalDur > loopDur + 0.05;
        const winDur = isLonger ? loopDur : totalDur;
        const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
        const trimStartFrac = Math.max(0, Math.min(0.95, settings.trimStart || 0));
        const trimEndFrac = Math.max(trimStartFrac + 0.01, Math.min(1.0, settings.trimEnd || 1));
        const x1 = trimStartFrac * rect.width;
        const x2 = trimEndFrac * rect.width;
        const activeDur = (trimEndFrac - trimStartFrac) * winDur;
        const startSec = offsetSec + trimStartFrac * winDur;

        const clickY = e.clientY - rect.top;
        const clickX = e.clientX - rect.left;

        if (isLonger && clickY <= 17) {
          dragMode = 'overview';
          canvas.setPointerCapture?.(e.pointerId);
          const targetCenterSec = (clickX / rect.width) * totalDur;
          settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, targetCenterSec - loopDur / 2));
          renderWaveform();
          triggerSampleRestart(true);
          e.preventDefault();
          return;
        }

        if (settings.mode === 'slice' && clickY > 17) {
          if (!slices || !slices.length) rebuildSlices();
          if (slices && slices.length) {
            // 1. Check if clicking/dragging near a divider line (between slices)
            for (let k = 1; k < slices.length; k++) {
              const slFrac = (slices[k].startSec - startSec) / Math.max(0.001, activeDur);
              const sx = x1 + slFrac * (x2 - x1);
              const badgeW = 14;
              const badgeX = Math.min(x2 - badgeW, sx + 3);
              const isNearLine = Math.abs(clickX - sx) <= 7;
              const isOverBadge = (clickX >= badgeX && clickX <= badgeX + badgeW && clickY >= 18 && clickY <= 34);
              if (isNearLine || isOverBadge) {
                dragMode = 'slice-divider';
                dragDividerIndex = k;
                canvas.setPointerCapture?.(e.pointerId);
                renderWaveform();
                e.preventDefault();
                return;
              }
            }

            // 2. Check if clicking inside the trimmed slice region [x1, x2]
            if (clickX >= x1 && clickX <= x2) {
              const frac = (clickX - x1) / Math.max(1, x2 - x1);
              const clickTime = startSec + frac * activeDur;
              let foundIdx = slices.findIndex(s => clickTime >= s.startSec && clickTime <= s.endSec);
              if (foundIdx < 0) foundIdx = Math.min(slices.length - 1, Math.floor(frac * slices.length));
              const slice = slices[foundIdx];

              playSlice(foundIdx);
              renderWaveform();

              dragMode = 'slice-strip-pending';
              dragDividerIndex = -1;
              dragStrip = {
                sliceIdx: foundIdx,
                startX: clickX,
                startY: clickY,
                origStart: slice.startSec,
                origEnd: slice.endSec,
                origDur: slice.duration,
                prevStart: (foundIdx > 0) ? slices[foundIdx - 1].startSec : startSec,
                nextEnd: (foundIdx < slices.length - 1) ? slices[foundIdx + 1].endSec : (startSec + activeDur),
                isDragging: false
              };
              canvas.setPointerCapture?.(e.pointerId);
              e.preventDefault();
              return;
            }
          }
        }

        if (isLonger) {
          dragMode = 'waveform';
          canvas.setPointerCapture?.(e.pointerId);
          dragStart = {
            x: e.clientX,
            origOffset: settings.offsetSec || 0,
            rectWidth: rect.width,
            loopDur,
            totalDur
          };
          canvas.classList.add('is-dragging');
          e.preventDefault();
        }
      };

      canvas.onpointermove = (e) => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const tempo = envRef?.settings?.().tempo || 72;
        const loopDur = settings.mode==='pitch'?8:(settings.bars * 4 * 60) / tempo;
        const totalDur = compositeBuffer ? compositeBuffer.duration : 0;
        const isLonger = totalDur > loopDur + 0.05;
        const winDur = isLonger ? loopDur : totalDur;
        const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
        const trimStartFrac = Math.max(0, Math.min(0.95, settings.trimStart || 0));
        const trimEndFrac = Math.max(trimStartFrac + 0.01, Math.min(1.0, settings.trimEnd || 1));
        const x1 = trimStartFrac * rect.width;
        const x2 = trimEndFrac * rect.width;
        const activeDur = (trimEndFrac - trimStartFrac) * winDur;
        const startSec = offsetSec + trimStartFrac * winDur;

        // Hover handling when not dragging
        if (!dragMode) {
          if (settings.mode === 'slice' && compositeBuffer && clickY > 17 && slices && slices.length) {
            let nearDiv = -1;
            for (let k = 1; k < slices.length; k++) {
              const slFrac = (slices[k].startSec - startSec) / Math.max(0.001, activeDur);
              const sx = x1 + slFrac * (x2 - x1);
              const badgeW = 14;
              const badgeX = Math.min(x2 - badgeW, sx + 3);
              if (Math.abs(clickX - sx) <= 7 || (clickX >= badgeX && clickX <= badgeX + badgeW && clickY >= 18 && clickY <= 34)) {
                nearDiv = k;
                break;
              }
            }
            if (nearDiv > 0) {
              canvas.style.cursor = 'col-resize';
              if (hoveredDividerIndex !== nearDiv) {
                hoveredDividerIndex = nearDiv;
                renderWaveform();
              }
            } else if (clickX >= x1 && clickX <= x2) {
              canvas.style.cursor = 'grab';
              if (hoveredDividerIndex !== -1) {
                hoveredDividerIndex = -1;
                renderWaveform();
              }
            } else {
              canvas.style.cursor = '';
              if (hoveredDividerIndex !== -1) {
                hoveredDividerIndex = -1;
                renderWaveform();
              }
            }
          }
          return;
        }

        // Dragging handlers:
        if (dragMode === 'slice-divider') {
          canvas.style.cursor = 'col-resize';
          const k = dragDividerIndex;
          if (k > 0 && k < slices.length) {
            const frac = Math.max(0, Math.min(1.0, (clickX - x1) / Math.max(1, x2 - x1)));
            const targetSec = startSec + frac * activeDur;
            const minSec = slices[k - 1].startSec + 0.025;
            const maxSec = slices[k].endSec - 0.025;
            const clamped = Math.max(minSec, Math.min(maxSec, targetSec));
            slices[k - 1].endSec = clamped;
            slices[k - 1].duration = Math.max(0.02, clamped - slices[k - 1].startSec);
            slices[k].startSec = clamped;
            slices[k].duration = Math.max(0.02, slices[k].endSec - clamped);
            settings.slicePoints = slices.slice(1).map(s => (s.startSec - startSec) / Math.max(0.001, activeDur));
            playbackSlices = slices;
            renderWaveform();
          }
        } else if (dragMode === 'slice-strip-pending' || dragMode === 'slice-strip') {
          if (dragStrip) {
            const dx = clickX - dragStrip.startX;
            if (!dragStrip.isDragging && Math.abs(dx) > 3) {
              dragStrip.isDragging = true;
              dragMode = 'slice-strip';
            }
            if (dragStrip.isDragging) {
              canvas.style.cursor = 'grabbing';
              const idx = dragStrip.sliceIdx;
              const dt = (dx / Math.max(1, x2 - x1)) * activeDur;
              const origDur = dragStrip.origDur;
              if (idx > 0 && idx < slices.length - 1) {
                const minStart = dragStrip.prevStart + 0.025;
                const maxStart = dragStrip.nextEnd - 0.025 - origDur;
                if (maxStart >= minStart) {
                  const newStart = Math.max(minStart, Math.min(maxStart, dragStrip.origStart + dt));
                  const newEnd = newStart + origDur;
                  slices[idx - 1].endSec = newStart;
                  slices[idx - 1].duration = Math.max(0.02, newStart - slices[idx - 1].startSec);
                  slices[idx].startSec = newStart;
                  slices[idx].endSec = newEnd;
                  slices[idx].duration = origDur;
                  slices[idx + 1].startSec = newEnd;
                  slices[idx + 1].duration = Math.max(0.02, slices[idx + 1].endSec - newEnd);
                }
              } else if (idx === 0 && slices.length > 1) {
                const minEnd = startSec + 0.025;
                const maxEnd = slices[1].endSec - 0.025;
                const newEnd = Math.max(minEnd, Math.min(maxEnd, dragStrip.origEnd + dt));
                slices[0].endSec = newEnd;
                slices[0].duration = Math.max(0.02, newEnd - startSec);
                slices[1].startSec = newEnd;
                slices[1].duration = Math.max(0.02, slices[1].endSec - newEnd);
              } else if (idx === slices.length - 1 && slices.length > 1) {
                const minStart = slices[idx - 1].startSec + 0.025;
                const maxStart = (startSec + activeDur) - 0.025;
                const newStart = Math.max(minStart, Math.min(maxStart, dragStrip.origStart + dt));
                slices[idx - 1].endSec = newStart;
                slices[idx - 1].duration = Math.max(0.02, newStart - slices[idx - 1].startSec);
                slices[idx].startSec = newStart;
                slices[idx].duration = Math.max(0.02, (startSec + activeDur) - newStart);
              }
              settings.slicePoints = slices.slice(1).map(s => (s.startSec - startSec) / Math.max(0.001, activeDur));
              playbackSlices = slices;
              renderWaveform();
            }
          }
        } else if (dragMode === 'overview') {
          const curX = e.clientX - rect.left;
          const targetCenterSec = (curX / rect.width) * totalDur;
          settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, targetCenterSec - loopDur / 2));
          renderWaveform();
          triggerSampleRestart(false);
        } else if (dragMode === 'waveform' && dragStart) {
          const dx = e.clientX - dragStart.x;
          const secDelta = -(dx / dragStart.rectWidth) * dragStart.loopDur;
          settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, dragStart.origOffset + secDelta));
          renderWaveform();
          triggerSampleRestart(false);
        }
      };

      const endDrag = (e) => {
        if (!dragMode) return;
        const prevMode = dragMode;
        const wasStripDrag = (dragStrip && dragStrip.isDragging);
        const stripIdx = dragStrip ? dragStrip.sliceIdx : -1;
        const divIdx = dragDividerIndex;

        dragMode = null;
        dragStart = null;
        dragDividerIndex = -1;
        dragStrip = null;
        canvas.classList.remove('is-dragging');
        canvas.style.cursor = '';
        if (canvas.hasPointerCapture?.(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }

        if (prevMode === 'slice-divider' || wasStripDrag) {
          persistSettings();
          playbackSlices = slices;
          triggerQuantizedLoopRestart();
          renderWaveform();
          if (wasStripDrag && stripIdx >= 0) {
            playSlice(stripIdx);
          } else if (divIdx > 0) {
            playSlice(divIdx - 1);
          }
        } else if (prevMode === 'overview' || prevMode === 'waveform') {
          persistSettings();
          triggerSampleRestart(true);
        }
      };

      canvas.onpointerup = endDrag;
      canvas.onpointercancel = endDrag;
      canvas.onpointerleave = () => {
        if (!dragMode) {
          if (hoveredDividerIndex !== -1) {
            hoveredDividerIndex = -1;
            canvas.style.cursor = '';
            renderWaveform();
          }
        }
      };
    }

    // Sliders Helper
    const bindSlider = (id, outId, key, scale = 1, unit = '%') => {
      const el = find(id);
      const out = find(outId);
      if (!el) return;
      el.oninput = (e) => {
        const val = Number(e.target.value);
        settings[key] = val;
        if (out) out.textContent = val + unit;
        updateMixerNodes();
        persistSettings();
      };
    };

    // Shared Sliders
    bindSlider('loopLevel', 'loopLevelVal', 'level');
    bindSlider('loopPan', 'loopPanVal', 'pan', 1, '');
    bindSlider('loopReverb', 'loopReverbVal', 'space');
    bindSlider('loopDelay', 'loopDelayVal', 'delay');

    // Slice Specific Sliders
    bindSlider('loopCharacter', 'loopCharVal', 'character');
    bindSlider('loopDuration', 'loopDurVal', 'duration');
    bindSlider('loopDensity', 'loopDensVal', 'density');
    bindSlider('loopChorus', 'loopChorusVal', 'chorus');

    // Slice Cycle Pills
    findAll('[data-slice-cycle]').forEach(btn => {
      btn.onclick = () => {
        const cyc = Number(btn.dataset.sliceCycle) || 16;
        settings.cycle = cyc;
        persistSettings();
        findAll('[data-slice-cycle]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // Slice Step Length Pills
    findAll('[data-slice-step-len]').forEach(btn => {
      btn.onclick = () => {
        const sl = Number(btn.dataset.sliceStepLen) || 1;
        settings.stepLength = sl;
        persistSettings();
        findAll('[data-slice-step-len]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // Slice Offset Pills
    findAll('[data-slice-offset]').forEach(btn => {
      btn.onclick = () => {
        const off = Number(btn.dataset.sliceOffset) || 0;
        settings.offset = off;
        persistSettings();
        findAll('[data-slice-offset]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // Slice Delay Time Pills
    findAll('[data-slice-delay-time]').forEach(btn => {
      btn.onclick = () => {
        const dt = btn.dataset.sliceDelayTime || '1/8';
        settings.delayTime = dt;
        persistSettings();
        updateMixerNodes();
        findAll('[data-slice-delay-time]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // Trim sliders (Loop Mode)
    const trimStartEl = find('loopTrimStart');
    const trimEndEl = find('loopTrimEnd');
    const trimStartVal = find('trimStartVal');
    const trimEndVal = find('trimEndVal');

    if (trimStartEl) trimStartEl.oninput = (e) => {
      const v = Number(e.target.value) / 100;
      settings.trimStart = Math.min(v, (settings.trimEnd || 1) - 0.05);
      if(settings.mode==='slice')rebuildSlices();
      if (trimStartVal) trimStartVal.textContent = Math.round(settings.trimStart * 100) + '%';
      renderWaveform();
      persistSettings();
      triggerSampleRestart(false);
    };

    if (trimEndEl) trimEndEl.oninput = (e) => {
      const v = Number(e.target.value) / 100;
      settings.trimEnd = Math.max(v, (settings.trimStart || 0) + 0.05);
      if(settings.mode==='slice')rebuildSlices();
      if (trimEndVal) trimEndVal.textContent = Math.round(settings.trimEnd * 100) + '%';
      renderWaveform();
      persistSettings();
      triggerQuantizedLoopRestart();
    };

    // Pitch & Reverse
    const pitchEl = find('loopPitch');
    const pitchVal = find('loopPitchVal');
    if (pitchEl) pitchEl.oninput = (e) => {
      const p = Number(e.target.value) || 0;
      settings.pitch = p;
      if (pitchVal) pitchVal.textContent = (p > 0 ? '+' + p : p) + ' st';
      renderWaveform();
      persistSettings();
      triggerSampleRestart(false);
    };

    const revBtn = find('loopRevBtn');
    if (revBtn) revBtn.onclick = () => {
      settings.reverse = !settings.reverse;
      revBtn.classList.toggle('active', settings.reverse);
      renderWaveform();
      persistSettings();
      triggerSampleRestart(true);
      envRef?.toast(settings.reverse ? tr('Реверс включён', 'Reverse ON') : tr('Реверс выключен', 'Reverse OFF'));
    };

    // Mute & Solo
    const muteBtn = find('loopMute');
    if (muteBtn) muteBtn.onclick = () => {
      settings.mute = !settings.mute;
      muteBtn.classList.toggle('active', settings.mute);
      updateMixerNodes();
      updateStatusBadge();
      persistSettings();
    };

    const soloBtn = find('loopSolo');
    if (soloBtn) soloBtn.onclick = () => {
      settings.solo = !settings.solo;
      soloBtn.classList.toggle('active', settings.solo);
      updateMixerNodes();
      persistSettings();
      envRef?.toast(settings.solo ? tr('9-й трек в режиме соло', 'Track 09 solo ON') : tr('Соло 9-го трека выключено', 'Track 09 solo OFF'));
    };

    // Import & Clear
    const importBtn = find('loopImportBtn');
    const fileInput = find('loopFileInput');
    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) importAudioFile(file, activeAudio, envRef?.settings?.().tempo || 72);
      };
    }

    // Drag & Drop Audio File onto Waveform Area (Requirement 2)
    const waveWrap = find('loopCanvas')?.closest?.('.loop-waveform-card') || find('loopCanvas')?.parentElement;
    if (waveWrap) {
      let dragDepth = 0;
      waveWrap.ondragenter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth++;
        waveWrap.classList?.add?.('is-dragover');
        isCanvasDragOver = true;
        renderWaveform();
      };
      waveWrap.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (!waveWrap.classList?.contains?.('is-dragover')) {
          waveWrap.classList?.add?.('is-dragover');
          isCanvasDragOver = true;
          renderWaveform();
        }
      };
      waveWrap.ondragleave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0 || !waveWrap.contains?.(e.relatedTarget)) {
          dragDepth = 0;
          waveWrap.classList?.remove?.('is-dragover');
          isCanvasDragOver = false;
          renderWaveform();
        }
      };
      waveWrap.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth = 0;
        waveWrap.classList?.remove?.('is-dragover');
        isCanvasDragOver = false;
        renderWaveform();

        const dt = e.dataTransfer;
        const files = dt ? Array.from(dt.files || []) : [];
        if (!files.length) return;

        const file = files[0];
        if (!isSupportedAudioFile(file)) {
          envRef?.toast(tr(
            'Неподдерживаемый формат. Принимаются аудиофайлы: WAV, MP3, OGG, FLAC, M4A, AAC',
            'Unsupported format. Accepted audio files: WAV, MP3, OGG, FLAC, M4A, AAC'
          ));
          return;
        }

        const tempo = envRef?.settings?.().tempo || 72;
        importAudioFile(file, activeAudio, tempo);
      };
    }

    const clearBtn = find('loopClearBtn');
    if (clearBtn) clearBtn.onclick = async () => {
      if (!layers.length) return;
      const confirmFn = envRef?.confirm || root.HaloConfirm;
      if (confirmFn) {
        const ok = await confirmFn({
          title: tr('Очистить 9-й трек', 'Clear Track 09'),
          message: tr('Удалить все записанные слои 9-го трека?', 'Delete all recorded layers on Track 09?'),
          confirmText: tr('Удалить', 'Clear'),
          cancelText: tr('Отмена', 'Cancel'),
          danger: true
        });
        if (!ok) return;
      }
      clearAllLayers();
    };

    // Latency & Monitor
    const latInput = find('loopLatency');
    if (latInput) {
      if (typeof root.HaloControls !== 'undefined' && root.HaloControls.install) {
        root.HaloControls.install(latInput, { min: 0, max: 200, step: 1, dragStep: 1 });
      }
      const onLat = (e) => {
        settings.latencyMs = Math.max(0, Math.min(200, Number(e.target.value) || 0));
        persistSettings();
      };
      latInput.oninput = onLat;
      latInput.onchange = onLat;
    }

    const monCheck = find('loopMonitor');
    if (monCheck) monCheck.onchange = (e) => {
      listenInput(e.target.checked);
      if (settings.monitor) {
        envRef?.toast(tr('Прямой мониторинг включён · Рекомендуем наушники во избежание свиста', 'Direct mic monitor enabled · Use headphones to prevent acoustic feedback'));
      }
    };
  }

  function renderUI() {
    const container = document.getElementById('liveLoopPanel');
    if (!container) return;
    renderInputWindow();
    if(container.children?.length&&panelLanguage!==(envRef?.language?.()||'ru')){createUI(container);return;}
    updateStatusBadge();
    updateStepIndicators();
    renderWaveform();
    const bpmLabel = document.getElementById('loopWaveBpm');
    if (bpmLabel && envRef?.settings) {
      bpmLabel.textContent = `${Math.round(envRef.settings().tempo || 72)} BPM`;
    }
    const rootNote=document.getElementById('pitchRootNote'),octave=document.getElementById('pitchOctave');if(rootNote)rootNote.value=settings.rootNote;if(octave)octave.value=settings.pitchOctave;
    const instantBtn = document.getElementById('loopInstantRestart');
    if (instantBtn) instantBtn.classList.toggle('active', !!settings.instantRestart);
    const revBtn = document.getElementById('loopRevBtn');
    if (revBtn) revBtn.classList.toggle('active', !!settings.reverse);
    const pitchEl = document.getElementById('loopPitch');
    const pitchVal = document.getElementById('loopPitchVal');
    if (pitchEl) pitchEl.value = settings.pitch || 0;
    if (pitchVal) pitchVal.textContent = ((settings.pitch || 0) > 0 ? '+' + settings.pitch : (settings.pitch || 0)) + ' st';

    // Active slice highlight
    if (settings.mode === 'slice'||settings.mode==='pitch') {
      const pads = document.querySelectorAll('.slice-seq-pad');
      pads.forEach((pad, idx) => {
        pad.classList.toggle('is-current-step', idx === activeSliceStep);
      });
    }
  }

  // Offline Export Rendering
  function renderOffline(ctx, engine, totalBars, tempo, startTime = 0) {
    if (!compositeBuffer || settings.mute) return;
    if (typeof engine === 'number') {
      tempo = totalBars || 72;
      totalBars = engine;
      engine = null;
    }
    tempo = tempo || 72;
    totalBars = totalBars || settings.bars || 4;
    try {
      const playBuf = getPlaybackBuffer(ctx);
      if (!playBuf) return;

      const trackG = ctx.createGain();
      const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const revG = ctx.createGain();
      const delG = ctx.createGain();

      const vol = (settings.level / 100) * 1.5;
      trackG.gain.value = vol;
      if (panNode) {
        panNode.pan.value = settings.pan / 100;
        trackG.connect(panNode);
        if (engine && engine.master) panNode.connect(engine.master);
        else panNode.connect(ctx.destination);
      } else if (engine && engine.master) {
        trackG.connect(engine.master);
      } else {
        trackG.connect(ctx.destination);
      }

      if (engine && engine.reverb) {
        trackG.connect(revG);
        revG.gain.value = (settings.space / 100) * 0.8;
        revG.connect(engine.reverb);
      }
      if (engine && engine.delayTaps) {
        const tapDiv = (engine.delayTaps && engine.delayTaps[settings.delayTime]) ? settings.delayTime : '1/8';
        if (engine.delayTaps[tapDiv] || engine.delayTaps['1/8']) {
          trackG.connect(delG);
          delG.gain.value = (settings.delay / 100) * 0.7;
          delG.connect(engine.delayTaps[tapDiv] || engine.delayTaps['1/8']);
        }
      }
      if (engine && engine.chorusIn) {
        const chorG = ctx.createGain();
        trackG.connect(chorG);
        chorG.gain.value = ((settings.chorus || 0) / 100) * 0.75;
        chorG.connect(engine.chorusIn);
      }

      if(settings.mode==='pitch'){
        let previous=null;
        const totalSteps=totalBars*16,duration=totalBars*240/tempo;
        for(let step=0;step<totalSteps;step++){
          const local=step*60/tempo/4,event=pitchEvent(step);
          if(event)previous=schedulePitch(ctx,trackG,startTime+local,event,tempo,duration-local,previous);
        }
        return;
      }

      if (settings.mode === 'slice') {
        if (!slices || !slices.length) rebuildSlices();
        if (!slices || !slices.length) return;

        let previousVoice = null;
        const totalSteps = totalBars * 16;
        const secPerStep = (60 / tempo) / 4;
        const stepLen = settings.stepLength || 1;
        const cycleLen = settings.cycle || 16;
        const dens = (typeof settings.density === 'number') ? settings.density : 75;

        for (let step = 0; step < totalSteps; step++) {
          if (step % stepLen === 0) {
            const s = Math.floor(step / stepLen);
            const patternStep = (s + (settings.offset || 0)) % cycleLen;
            const stepIdx = patternStep % 16;
            const sliceIdx = (settings.sliceSteps && typeof settings.sliceSteps[stepIdx] === 'number') ? settings.sliceSteps[stepIdx] : -1;

            if (sliceIdx >= 0 && sliceIdx < slices.length) {
              const isAnchor = (stepIdx % 4 === 0);
              const isMedium = (stepIdx % 2 === 0);
              const threshold = isAnchor ? 15 : (isMedium ? 35 : 55);
              if (dens >= threshold) {
                const t = step * secPerStep;
                const triggerTime = startTime + t;

                if (previousVoice) {
                  try {
                    previousVoice.gain.gain.cancelAndHoldAtTime?.(triggerTime);
                    previousVoice.gain.gain.linearRampToValueAtTime(0.0001, triggerTime + 0.004);
                    previousVoice.source.stop(triggerTime + 0.005);
                  } catch (_) {}
                }

                const slice = slices[sliceIdx];
                const src = ctx.createBufferSource();
                src.buffer = playBuf;
                const pitchVal = Number(settings.pitch) || 0;
                const rate = Math.pow(2, pitchVal / 12);
                if (pitchVal !== 0 && src.playbackRate) {
                  src.playbackRate.value = rate;
                }
                let filter = null;
                if (ctx.createBiquadFilter) {
                  try {
                    filter = ctx.createBiquadFilter();
                    const charVal = (typeof settings.character === 'number') ? settings.character : 60;
                    const cutoff = 250 * Math.pow(20000 / 250, Math.max(0, Math.min(100, charVal)) / 100);
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(cutoff, triggerTime);
                  } catch (_) {}
                }
                const vGain = ctx.createGain();
                const peak = 1.0;
                const durSetting = (typeof settings.duration === 'number') ? settings.duration : 65;
                const durFraction = Math.max(0.05, Math.min(1.0, durSetting / 100));
                const realDur = slice.duration / rate;
                const targetDur = Math.max(0.035, realDur * durFraction);
                const remaining = Math.max(0.01, (totalBars * 4 * 60 / tempo) - t);
                const gateDur = Math.min(targetDur, remaining);
                const releaseDur = Math.min(0.025, Math.max(0.006, gateDur * 0.08));
                const holdEnd = triggerTime + Math.max(0.004, gateDur - releaseDur);
                const soundEnd = triggerTime + gateDur;

                vGain.gain.setValueAtTime(0.0001, triggerTime);
                vGain.gain.linearRampToValueAtTime(peak, triggerTime + 0.003);
                vGain.gain.setValueAtTime(peak, holdEnd);
                if (vGain.gain.linearRampToValueAtTime) {
                  vGain.gain.linearRampToValueAtTime(0.0001, soundEnd);
                } else if (vGain.gain.exponentialRampToValueAtTime) {
                  vGain.gain.exponentialRampToValueAtTime(0.0001, soundEnd);
                }

                if (filter) {
                  src.connect(filter);
                  filter.connect(vGain);
                } else {
                  src.connect(vGain);
                }
                vGain.connect(trackG);

                let sliceStart = slice.startSec;
                if (settings.reverse) {
                  const totalBufDur = playBuf.duration;
                  sliceStart = Math.max(0, Math.min(totalBufDur - slice.duration, totalBufDur - (slice.startSec + slice.duration)));
                }
                src.start(triggerTime, sliceStart, Math.min(slice.duration, (gateDur * rate) + 0.02));
                src.stop(soundEnd + 0.005);
                previousVoice = { source: src, gain: vGain, stopTime: soundEnd + 0.005 };
              }
            }
          }
        }
        return;
      }

      const loopDur = settings.mode==='pitch'?8:(settings.bars * 4 * 60) / tempo;
      const totalDur = (totalBars * 4 * 60) / tempo;
      const bufDur = playBuf.duration;
      const isLonger = bufDur > loopDur + 0.05;
      const winDur = isLonger ? loopDur : bufDur;
      const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, bufDur - loopDur), settings.offsetSec || 0)) : 0;
      const trimStart = Math.max(0, Math.min(0.95, settings.trimStart || 0));
      const trimEnd = Math.max(trimStart + 0.01, Math.min(1.0, settings.trimEnd || 1));
      let startOffset = offsetSec + trimStart * winDur;
      const playDur = Math.max(0.01, (trimEnd - trimStart) * winDur);

      if (settings.reverse) {
        startOffset = Math.max(0, Math.min(bufDur - playDur, bufDur - (startOffset + playDur)));
      }

      for (let t = 0; t < totalDur; t += loopDur) {
        const src = ctx.createBufferSource();
        src.buffer = playBuf;
        if (settings.pitch && src.playbackRate) {
          src.playbackRate.value = Math.pow(2, settings.pitch / 12);
        }
        src.connect(trackG);
        src.start(startTime + t, startOffset, Math.min(playDur, (totalDur - t) * Math.pow(2, (settings.pitch || 0) / 12)));
      }
    } catch (_) {}
  }

  function renderPhraseOffline(ctx, engine, bars, tempo, state, startTime = 0, key = 0) {
    engine?.setCoreMuted?.(state?.settings?.solo===true,startTime);
    const saved = {settings,layers,compositeBuffer,reversedBuffer,slices,bufferContext,samplerKey};
    try {
      samplerKey=key;
      settings = copySettings({...defaultSettings,...state?.settings});
      layers = (state?.layerIds || []).map(id=>layerLibrary.get(id)).filter(Boolean);
      compositeBuffer = layers.length ? buildCompositeBuffer(ctx,layers) : null;
      reversedBuffer=null;
      slices=[];
      if (compositeBuffer && settings.mode==='slice') rebuildSlices();
      renderOffline(ctx,engine,bars,tempo,startTime);
    } finally {
      ({settings,layers,compositeBuffer,reversedBuffer,slices,bufferContext,samplerKey}=saved);
    }
  }

  function renderOfflineSong(ctx, engine, totalBars, tempo) {
    renderOffline(ctx, engine, totalBars, tempo);
  }

  const api = {
    init,
    getUIState:()=>({compact:compactMode,inputOpen:inputWindowOpen}),
    setUIState(value){compactMode=value?.compact===true;inputWindowOpen=value?.inputOpen===true;syncCompact();if(typeof document!=='undefined'){const panel=document.getElementById('audioInputWindow');if(panel)panel.hidden=!inputWindowOpen;}},
    setCompact,
    setInputWindow,
    renderInputWindow,
    armRecording,
    releaseInput(){cancelInputCapture();inputController?.release()},
    beforePhraseChange(time,audio,tempo){if(recordingState==='recording'||recordingState==='overdubbing')finishRecording(audio,tempo,time);else if(recordingState==='preroll')cancelInputCapture()},
    listenInput,
    getInputState:()=>inputController?.state()||{kind:'microphone',deviceId:'',devices:[],monitoring:false},
    configureInput:value=>inputController?.configure(value),
    refreshInputs:()=>inputController?.requestAccess(),
    isMonitoring:()=>!!inputController?.state().monitoring,
    ready: () => ready,
    isInitialized: () => initialized,
    capturePhrase,
    restorePhrase,
    pitchWindow,
    pitchEvent,
    connectToAudio,
    stopPlayback,
    tick,
    onPlay(time, startStep) {
      if(typeof time==='number')stopPlayback(time);
      isPlaybackRunning = true;
      if (typeof time === 'object' && time && time.ctx) {
        connectToAudio(time);
      } else if (activeAudio) {
        connectToAudio(activeAudio);
      }
      playbackSettings = copySettings(settings);
      loopAnchorStep = 0; // Shared phrase grid, including resume.
      lastScheduledStep = -1;
      pendingQuantizedRestart = false;
    },
    onPause() {
      isPlaybackRunning = false;
      stopPlayback();
      pendingQuantizedRestart = false;
      loopAnchorStep = 0;
      lastScheduledStep = -1;
      if (recordingActive()) {
        cancelInputCapture();
        recordingState = 'idle';
        updateStatusBadge();
        updateStepIndicators();
      }
    },
    hasAudio() {
      return !!compositeBuffer && layers.length > 0;
    },
    isMuted() {
      return !!settings.mute;
    },
    toggleMute() {
      settings.mute = !settings.mute;
      updateMixerNodes();
      updateStatusBadge();
      persistSettings();
      return settings.mute;
    },
    getSettings() {
      return copySettings(settings);
    },
    setSettings(newSettings) {
      if(newSettings.rootNote!==undefined&&(!Number.isInteger(newSettings.rootNote)||newSettings.rootNote<36||newSettings.rootNote>84))throw Error('Invalid root note');
      if(newSettings.pitchOctave!==undefined&&![-1,0,1].includes(newSettings.pitchOctave))throw Error('Invalid pitch octave');
      if(newSettings.pitchSteps!==undefined&&(!Array.isArray(newSettings.pitchSteps)||newSettings.pitchSteps.length!==16||newSettings.pitchSteps.some(n=>!Number.isInteger(n)||n< -1||n>7)))throw Error('Invalid pitch pattern');
      if(newSettings.pitchSteps)newSettings={...newSettings,pitchSteps:[...newSettings.pitchSteps]};
      const oldPitch = settings.pitch;
      const oldRoot=settings.rootNote,oldOctave=settings.pitchOctave,oldSteps=JSON.stringify(settings.pitchSteps);
      const oldRev = settings.reverse;
      const oldStart = settings.trimStart;
      const oldEnd = settings.trimEnd;
      const oldBars = settings.bars;
      const oldOffset = settings.offsetSec;

      settings = { ...settings, ...newSettings };
      if(settings.mode==='slice'&&(settings.trimStart!==oldStart||settings.trimEnd!==oldEnd))rebuildSlices();
      updateMixerNodes();
      persistSettings();
      renderUI();

      if (settings.instantRestart) {
        if ((settings.rootNote!==oldRoot||settings.pitchOctave!==oldOctave||JSON.stringify(settings.pitchSteps)!==oldSteps)||
            (newSettings.pitch !== undefined && newSettings.pitch !== oldPitch) ||
            (newSettings.reverse !== undefined && newSettings.reverse !== oldRev) ||
            (newSettings.trimStart !== undefined && newSettings.trimStart !== oldStart) ||
            (newSettings.offsetSec !== undefined && newSettings.offsetSec !== oldOffset)) {
          triggerSampleRestart(true);
        } else if ((newSettings.bars !== undefined && newSettings.bars !== oldBars) ||
                   (newSettings.trimEnd !== undefined && newSettings.trimEnd !== oldEnd)) {
          triggerQuantizedLoopRestart();
        }
      }
    },
    getLayers() {
      return [...layers];
    },
    getLayerCount() {
      return layers.length;
    },
    getCompositeBuffer() {
      return compositeBuffer;
    },
    getPlaybackBuffer,
    triggerSampleRestart,
    triggerQuantizedLoopRestart,
    isPendingQuantizedRestart() {
      return pendingQuantizedRestart;
    },
    addLayer,
    undo: undoLastLayer,
    updateSettings(newSettings) {
      api.setSettings(newSettings);
    },
    buildCompositeBuffer,
    createUI,
    renderUI,
    renderWaveform,
    renderOffline,
    renderOfflineSong,
    renderPhraseOffline,
    clearAllLayers,
    clearAllData() {
      cancelInputCapture();inputController?.release();
      clearAllLayers();
      layerLibrary.clear();
      IDB.clearAll();
    },
    getMode() {
      return settings.mode || 'loop';
    },
    setMode(m) {
      if (['loop','slice','pitch'].includes(m)) {
        settings.mode = m;
        if (m === 'slice') rebuildSlices();
        persistSettings();
        createUI();
      }
    },
    detectTransients,
    getPresetSlicePattern,
    randomizeSlicePattern,
    rebuildSlices,
    playSlice,
    getSlicePhraseSteps,
    randomizeSlice,
    getSlices() {
      return slices ? [...slices] : [];
    },
    getActiveSliceIndex() {
      return activeSliceIndex;
    },
    getActiveSliceStep() {
      return activeSliceStep;
    },
    getSlicePattern() {
      return [...settings.sliceSteps];
    },
    setSlicePattern(pat) {
      if (Array.isArray(pat) && pat.length === 16 && pat.every(n=>Number.isInteger(n)&&n>=-1&&n<(settings.sliceCount||8))) {
        settings.slicePattern = 'custom';
        settings.sliceSteps = [...pat];
        persistSettings();
      }
    },
    getSliceCount() {
      return settings.sliceCount || 8;
    },
    setSliceCount(c) {
      if (c === 4 || c === 8 || c === 16) {
        settings.sliceCount = c;
        rebuildSlices();
        settings.sliceSteps = settings.sliceSteps.map(val => (val >= c ? (val % c) : val));
        persistSettings();
      }
    },
    getSlicePoints() {
      return settings.slicePoints ? [...settings.slicePoints] : null;
    },
    setSlicePoints(points) {
      if (Array.isArray(points)) {
        settings.slicePoints = [...points];
        rebuildSlices();
        persistSettings();
      }
    },
    isSupportedAudioFile,
    importAudioFile
  };

  if (typeof window !== 'undefined') {
    window.addEventListener?.('pagehide', () => {
      cancelInputCapture();inputController?.release();
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloLiveLoop = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
