const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createEnvironment() {
  const sandbox = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance,
    Float32Array,
    Uint8Array,
    ArrayBuffer,
    Blob,
    window: {},
    document: {
      createElement(tag) {
        return {
          tagName: tag.toUpperCase(),
          style: {},
          classList: {
            add() {},
            remove() {},
            toggle() {},
            contains() { return false; }
          },
          setAttribute() {},
          getAttribute() { return null; },
          addEventListener() {},
          removeEventListener() {},
          appendChild() {},
          append() {},
          children: []
        };
      },
      getElementById(id) {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    },
    navigator: {
      mediaDevices: {}
    },
    indexedDB: {
      open() {
        return {
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null
        };
      }
    }
  };
  sandbox.window = sandbox;

  // Mock AudioContext and AudioBuffer
  class FakeAudioBuffer {
    constructor({ length, numberOfChannels, sampleRate }) {
      this.length = length;
      this.numberOfChannels = numberOfChannels || 1;
      this.sampleRate = sampleRate || 44100;
      this.duration = this.length / this.sampleRate;
      this._channels = [];
      for (let c = 0; c < this.numberOfChannels; c++) {
        this._channels.push(new Float32Array(length));
      }
    }
    getChannelData(c) {
      return this._channels[c || 0];
    }
    copyToChannel(data, c) {
      this._channels[c || 0].set(data);
    }
  }

  class FakeAudioContext {
    constructor() {
      this.sampleRate = 44100;
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }
    createBuffer(channels, length, rate) {
      return new FakeAudioBuffer({ numberOfChannels: channels, length, sampleRate: rate });
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          setTargetAtTime() {}
        },
        connect() {},
        disconnect() {}
      };
    }
    createStereoPanner() {
      return {
        pan: {
          value: 0,
          setValueAtTime() {},
          setTargetAtTime() {}
        },
        connect() {},
        disconnect() {}
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        playbackRate: { value: 1 },
        connect() {},
        disconnect() {},
        start() {},
        stop() {}
      };
    }
  }

  sandbox.AudioBuffer = FakeAudioBuffer;
  sandbox.AudioContext = FakeAudioContext;
  sandbox.webkitAudioContext = FakeAudioContext;

  const context = vm.createContext(sandbox);

  // Load i18n
  const i18nCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.js'), 'utf8');
  vm.runInContext(i18nCode, context);

  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'audio-input.js'), 'utf8'), context);

  // Load live-loop
  const liveLoopCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'live-loop.js'), 'utf8');
  vm.runInContext(liveLoopCode, context);

  return context;
}

test('Track 09 defaults and settings validation', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  assert.ok(HaloLiveLoop, 'HaloLiveLoop should be defined');

  const settings = HaloLiveLoop.getSettings();
  assert.equal(settings.bars, 4);
  assert.equal(settings.level, 75);
  assert.equal(settings.pan, 0);
  assert.equal(settings.space, 20);
  assert.equal(settings.delay, 0);
  assert.equal(settings.mute, false);
  assert.equal(settings.solo, false);
  assert.equal(settings.latencyMs, 40);
  assert.equal(settings.monitor, false);
  assert.equal(settings.trimStart, 0);
  assert.equal(settings.trimEnd, 1);

  // Update settings with valid values
  HaloLiveLoop.updateSettings({ level: 85, pan: -30, bars: 8, latencyMs: 50 });
  const updated = HaloLiveLoop.getSettings();
  assert.equal(updated.level, 85);
  assert.equal(updated.pan, -30);
  assert.equal(updated.bars, 8);
  assert.equal(updated.latencyMs, 50);

  // Mute toggle
  assert.equal(HaloLiveLoop.toggleMute(), true);
  assert.equal(HaloLiveLoop.getSettings().mute, true);
  assert.equal(HaloLiveLoop.toggleMute(), false);
  assert.equal(HaloLiveLoop.getSettings().mute, false);
});

test('Track 09 layer management and non-destructive Undo', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  assert.equal(HaloLiveLoop.getLayerCount(), 0);
  assert.equal(HaloLiveLoop.hasAudio(), false);

  // Create test PCM
  const sampleRate = 44100;
  const length = sampleRate * 2; // 2 seconds
  const pcm1 = new Float32Array(length);
  for (let i = 0; i < length; i++) pcm1[i] = Math.sin(i * 0.05) * 0.4;

  HaloLiveLoop.addLayer({
    duration: 2.0,
    bars: 4,
    sampleRate,
    pcm: pcm1
  }, ctx);

  assert.equal(HaloLiveLoop.getLayerCount(), 1);
  assert.equal(HaloLiveLoop.hasAudio(), true);
  const composite1 = HaloLiveLoop.getCompositeBuffer();
  assert.ok(composite1, 'Composite buffer should exist');
  assert.equal(composite1.length, length);

  // Add overdub layer
  const pcm2 = new Float32Array(length);
  for (let i = 0; i < length; i++) pcm2[i] = Math.cos(i * 0.08) * 0.3;

  HaloLiveLoop.addLayer({
    duration: 2.0,
    bars: 4,
    sampleRate,
    pcm: pcm2
  }, ctx);

  assert.equal(HaloLiveLoop.getLayerCount(), 2);
  const composite2 = HaloLiveLoop.getCompositeBuffer();
  assert.ok(composite2);

  // Undo pops second layer
  const popped = HaloLiveLoop.undo(ctx);
  assert.ok(popped, 'Undo should pop the layer');
  assert.equal(HaloLiveLoop.getLayerCount(), 1);

  // Undo pops first layer
  const poppedFirst = HaloLiveLoop.undo(ctx);
  assert.ok(poppedFirst);
  assert.equal(HaloLiveLoop.getLayerCount(), 0);
  assert.equal(HaloLiveLoop.hasAudio(), false);

  // Undo on empty does nothing and returns null
  assert.equal(HaloLiveLoop.undo(ctx), null);
});

test('Track 09 composite buffer summing and peak limiting', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const length = 1000;
  const loudPcm1 = new Float32Array(length);
  const loudPcm2 = new Float32Array(length);
  loudPcm1.fill(0.8);
  loudPcm2.fill(0.8);

  HaloLiveLoop.addLayer({ duration: 1, bars: 1, sampleRate, pcm: loudPcm1 }, ctx);
  HaloLiveLoop.addLayer({ duration: 1, bars: 1, sampleRate, pcm: loudPcm2 }, ctx);

  const comp = HaloLiveLoop.getCompositeBuffer();
  assert.ok(comp);
  const data = comp.getChannelData(0);

  // Check that peak normalization kept values within [-0.98, 0.98]
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
  }
  assert.ok(max <= 0.9801, `Max peak ${max} should not exceed 0.98`);
});

test('Track 09 offline render schedules looping correctly', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const length = sampleRate; // 1 second
  const pcm = new Float32Array(length);
  pcm.fill(0.2);

  HaloLiveLoop.updateSettings({ bars: 1, mute: false });
  HaloLiveLoop.addLayer({ duration: 1, bars: 1, sampleRate, pcm }, ctx);

  let scheduledStarts = [];
  const fakeOfflineCtx = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain() {
      return {
        gain: { value: 1, setValueAtTime() {}, setTargetAtTime() {} },
        connect() {}
      };
    },
    createStereoPanner() {
      return {
        pan: { value: 0, setValueAtTime() {} },
        connect() {}
      };
    },
    createBufferSource() {
      const src = {
        buffer: null,
        connect() {},
        start(time, offset, duration) {
          scheduledStarts.push({ time, offset, duration });
        }
      };
      return src;
    }
  };

  // Render 4 bars at 120 BPM (1-bar loop at 120 BPM is 2.0s, so 4 bars is 8.0s -> 4 repetitions)
  HaloLiveLoop.renderOffline(fakeOfflineCtx, null, 4, 120);

  assert.equal(scheduledStarts.length, 4);
  assert.equal(scheduledStarts[0].time, 0);
  assert.equal(scheduledStarts[1].time, 2.0);
  assert.equal(scheduledStarts[2].time, 4.0);
  assert.equal(scheduledStarts[3].time, 6.0);

  // When muted, renderOffline does not schedule any audio
  HaloLiveLoop.updateSettings({ mute: true });
  scheduledStarts = [];
  HaloLiveLoop.renderOffline(fakeOfflineCtx, null, 4, 120);
  assert.equal(scheduledStarts.length, 0);
});

test('Track 09 preserves full duration for long audio and calculates window span', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  // 10 second audio file
  const fullDur = 10;
  const length = sampleRate * fullDur;
  const pcm = new Float32Array(length);
  pcm.fill(0.15);

  HaloLiveLoop.updateSettings({ bars: 2, mute: false, trimStart: 0, trimEnd: 1 });
  HaloLiveLoop.addLayer({ duration: fullDur, bars: 2, sampleRate, pcm }, ctx);

  const comp = HaloLiveLoop.getCompositeBuffer();
  assert.ok(comp, 'Composite buffer must exist');
  assert.equal(comp.duration, fullDur, 'Composite buffer must preserve full audio duration (10s)');

  // 2 bars at 120 BPM = 4.0 seconds -> span should be 4.0 / 10.0 = 0.4 (40%)
  const loopDur = (2 * 4 * 60) / 120;
  const span = loopDur / fullDur;
  assert.equal(span, 0.4);

  // Test sliding window logic: move start to 0.3, end should be 0.7
  const newStart = 0.3;
  const newEnd = newStart + span;
  HaloLiveLoop.updateSettings({ trimStart: newStart, trimEnd: newEnd });

  const s = HaloLiveLoop.getSettings();
  assert.equal(s.trimStart, 0.3);
  assert.equal(s.trimEnd, 0.7);

  // Test latency boundary validation
  HaloLiveLoop.updateSettings({ latencyMs: 35 });
  assert.equal(HaloLiveLoop.getSettings().latencyMs, 35);

  // Test offsetSec navigation: position window at 3.5 seconds into the 10s audio
  HaloLiveLoop.updateSettings({ offsetSec: 3.5, trimStart: 0, trimEnd: 1 });
  assert.equal(HaloLiveLoop.getSettings().offsetSec, 3.5);

  let offlineStarts = [];
  const fakeOfflineCtx = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain() { return { gain: { value: 1, setValueAtTime() {}, setTargetAtTime() {} }, connect() {} }; },
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start(time, offset, duration) {
          offlineStarts.push({ time, offset, duration });
        }
      };
    }
  };

  // 2 bars at 120 BPM = 4.0s loop duration. Total 4 bars = 8.0s -> 2 repetitions
  HaloLiveLoop.renderOffline(fakeOfflineCtx, null, 4, 120);
  assert.equal(offlineStarts.length, 2);
  assert.equal(offlineStarts[0].offset, 3.5, 'Playback should start from offsetSec = 3.5s');
  assert.equal(offlineStarts[0].duration, 4.0, 'Playback duration should equal 2 bars = 4.0s');
  assert.equal(offlineStarts[1].offset, 3.5, 'Second repetition should also start from offsetSec = 3.5s');
});

test('Track 09 Instant Restart, Pitch, and Reverse settings', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const s = HaloLiveLoop.getSettings();
  assert.equal(s.instantRestart, true, 'instantRestart should default to true');
  assert.equal(s.pitch, 0, 'pitch should default to 0');
  assert.equal(s.reverse, false, 'reverse should default to false');

  HaloLiveLoop.updateSettings({ instantRestart: false, pitch: 3, reverse: true });
  const updated = HaloLiveLoop.getSettings();
  assert.equal(updated.instantRestart, false);
  assert.equal(updated.pitch, 3);
  assert.equal(updated.reverse, true);
});

test('Track 09 Reverse buffer mirroring and sample-offset calculation', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const pcm = new Float32Array([0.125, 0.25, 0.5, 0.75, 1.0]);
  HaloLiveLoop.addLayer({ duration: 5 / sampleRate, bars: 1, sampleRate, pcm }, ctx);

  HaloLiveLoop.updateSettings({ reverse: false });
  const fwdBuf = HaloLiveLoop.getPlaybackBuffer(ctx);
  assert.equal(fwdBuf.getChannelData(0)[0], 0.125);
  assert.equal(fwdBuf.getChannelData(0)[4], 1.0);

  HaloLiveLoop.updateSettings({ reverse: true });
  const revBuf = HaloLiveLoop.getPlaybackBuffer(ctx);
  assert.equal(revBuf.getChannelData(0)[0], 1.0);
  assert.equal(revBuf.getChannelData(0)[4], 0.125);
});

test('Track 09 timing edits request the shared phrase restart and never retrigger alone', () => {
  const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),starts=[],restarts=[];
  ctx.createBufferSource=()=>({playbackRate:{value:1},connect(){},start(...args){starts.push(args)},stop(){}});
  loop.init({isPlaying:()=>true,retriggerPhrase:q=>restarts.push(q),settings:()=>({tempo:120})});
  loop.addLayer({id:1,duration:4,sampleRate:44100,pcm:new Float32Array(44100*4)},ctx);
  const audio={ctx,master:ctx.createGain()};loop.connectToAudio(audio);loop.onPlay(0,0);loop.tick(0,0,audio,120,4);
  for(const edit of [{pitch:4},{reverse:true},{trimStart:.1},{trimEnd:.8},{offsetSec:1},{bars:1}]){
    const count=starts.length,before=restarts.length;loop.setSettings(edit);
    assert.equal(restarts.length,before+1);assert.equal(restarts.at(-1),true);assert.equal(starts.length,count);
    loop.tick(.5,8,audio,120,4);assert.equal(starts.length,count,'No independent beat restart');
    loop.onPlay(1,0);loop.tick(1,0,audio,120,4);assert.equal(starts.length,count+1,'Sample joins common step zero');
  }
});

test('Track 09 disabled instant restart applies loop edits only at the next phrase boundary',()=>{
  const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),starts=[];
  ctx.createBufferSource=()=>{const src={playbackRate:{value:1},connect(){},start(t,o,d){starts.push({t,o,d,rate:src.playbackRate.value})},stop(){}};return src};
  loop.addLayer({id:1,duration:4,sampleRate:44100,pcm:new Float32Array(44100*4)},ctx);
  const audio={ctx,master:ctx.createGain()};loop.connectToAudio(audio);loop.setSettings({instantRestart:false,bars:1});loop.onPlay(0,0);loop.tick(0,0,audio,120,4);
  loop.setSettings({pitch:12,bars:2,trimStart:.2,reverse:true});
  loop.tick(2,16,audio,120,4);assert.equal(starts.at(-1).rate,1,'Old sample treatment throughout current phrase');
  loop.tick(4,32,audio,120,4);assert.equal(starts.at(-1).rate,1);
  loop.tick(8,64,audio,120,4);assert.equal(starts.at(-1).rate,2);assert.equal(starts.at(-1).t,8);
});

test('Track 09 phrase copies isolate settings, undo, clearing and offline source selection',()=>{
  const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext();
  const audio={ctx,master:ctx.createGain()};loop.connectToAudio(audio);
  loop.addLayer({id:101,duration:1,sampleRate:44100,pcmL:new Float32Array(44100).fill(.2)},ctx);
  loop.setSettings({pitch:3,reverse:true,mode:'slice',sliceSteps:Array(16).fill(2)});
  const original=loop.capturePhrase(),duplicate=JSON.parse(JSON.stringify(original));
  loop.restorePhrase(duplicate);loop.setSettings({pitch:-5,sliceSteps:Array(16).fill(1)});loop.undo(ctx);
  assert.equal(loop.getLayerCount(),0);loop.restorePhrase(original);
  assert.equal(loop.getLayerCount(),1);assert.equal(loop.getSettings().pitch,3);assert.equal(loop.getSettings().sliceSteps[0],2);
  const exposed=loop.getSettings();exposed.sliceSteps[0]=9;assert.equal(loop.getSettings().sliceSteps[0],2);
  loop.clearAllData(); // Explicit workspace reset clears library; regular Undo above preserves it.
  loop.addLayer({id:102,duration:1,sampleRate:44100,pcmL:new Float32Array(44100).fill(.4)},ctx);
  const second=loop.capturePhrase();loop.restorePhrase(undefined);assert.equal(loop.getLayerCount(),0);
  loop.restorePhrase(second);assert.equal(loop.getLayerCount(),1);
  const starts=[];ctx.createBufferSource=()=>({playbackRate:{value:1},connect(){},start(t){starts.push(t)},stop(){}});
  loop.setSettings({mode:'loop',bars:1});const state=loop.capturePhrase();
  loop.renderPhraseOffline(ctx,null,1,120,state,8);assert.equal(starts[0],8);
  loop.renderPhraseOffline(ctx,null,1,120,undefined,10);assert.equal(starts.length,1,'Empty phrase never borrows active audio');
  assert.equal(loop.getLayerCount(),1,'Export leaves current phrase intact');
});

test('Track 09 Offline render respects Pitch and Reverse', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const pcm = new Float32Array(sampleRate * 2);
  HaloLiveLoop.addLayer({ duration: 2, bars: 1, sampleRate, pcm }, ctx);

  HaloLiveLoop.updateSettings({ bars: 1, pitch: 7, reverse: true });

  const offlineStarts = [];
  const fakeOfflineCtx = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain() { return { gain: { value: 1, setValueAtTime() {}, setTargetAtTime() {} }, connect() {} }; },
    createBufferSource() {
      const src = {
        buffer: null,
        playbackRate: { value: 1 },
        connect() {},
        start(time, offset, duration) {
          offlineStarts.push({ time, offset, duration, rate: src.playbackRate.value });
        }
      };
      return src;
    }
  };

  HaloLiveLoop.renderOffline(fakeOfflineCtx, null, 2, 120);
  assert.equal(offlineStarts.length, 2);
  assert.ok(Math.abs(offlineStarts[0].rate - Math.pow(2, 7 / 12)) < 0.001, 'Playback rate should match +7 st in offline render');
});

test('Track 09 SLICE transient detection and slice rebuilding', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  // Create an audio buffer with artificial transient energy peaks
  const pcm = new Float32Array(sampleRate * 2);
  // Add transient bursts at 0.1s, 0.4s, 0.8s, 1.2s, 1.6s
  [0.1, 0.4, 0.8, 1.2, 1.6].forEach(sec => {
    const idx = Math.floor(sec * sampleRate);
    for (let k = 0; k < 500 && idx + k < pcm.length; k++) {
      pcm[idx + k] = 0.9 * Math.sin(k * 0.1);
    }
  });

  HaloLiveLoop.addLayer({ duration: 2, bars: 1, sampleRate, pcm }, ctx);

  // Test detectTransients directly
  const compBuf = HaloLiveLoop.getCompositeBuffer();
  assert.ok(compBuf, 'Composite buffer must exist');

  const slices4 = HaloLiveLoop.detectTransients(compBuf, 4, 0, 2);
  assert.equal(slices4.length, 4, 'Should detect 4 slices');
  assert.equal(slices4[0].index, 0);
  assert.ok(slices4[0].startSec >= 0 && slices4[0].duration > 0);

  const slices8 = HaloLiveLoop.detectTransients(compBuf, 8, 0, 2);
  assert.equal(slices8.length, 8, 'Should detect 8 slices');

  const slices16 = HaloLiveLoop.detectTransients(compBuf, 16, 0, 2);
  assert.equal(slices16.length, 16, 'Should detect 16 slices');

  // Verify slice mode toggle
  HaloLiveLoop.setMode('slice');
  assert.equal(HaloLiveLoop.getMode(), 'slice');

  const rebuilt = HaloLiveLoop.rebuildSlices();
  assert.ok(Array.isArray(rebuilt));
  assert.equal(rebuilt.length, 8, 'Default slice count is 8');
});

test('Track 09 SLICE patterns and phrase steps calculation', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;

  const beatPat = HaloLiveLoop.getPresetSlicePattern('beat', 8);
  assert.equal(beatPat.length, 16, 'Pattern has 16 steps');
  assert.ok(beatPat[0] >= 0, 'Step 0 should have an active chop');
  assert.ok(beatPat[4] >= 0, 'Step 4 should have an active chop');

  const chronoPat = HaloLiveLoop.getPresetSlicePattern('chrono', 8);
  assert.equal(chronoPat.length, 16);
  assert.equal(chronoPat[0], 0);
  assert.equal(chronoPat[1], -1);
  assert.equal(chronoPat[2], 1);

  const shufflePat = HaloLiveLoop.getPresetSlicePattern('shuffle', 8);
  assert.equal(shufflePat.length, 16);

  const arpPat = HaloLiveLoop.getPresetSlicePattern('arp', 8);
  assert.equal(arpPat.length, 16);

  // Phrase steps calculation
  const ctx = new env.AudioContext();
  const sampleRate = 44100;
  const pcm = new Float32Array(sampleRate * 2);
  HaloLiveLoop.addLayer({ duration: 2, bars: 1, sampleRate, pcm }, ctx);
  HaloLiveLoop.setMode('slice');
  HaloLiveLoop.rebuildSlices();

  const phraseSteps = HaloLiveLoop.getSlicePhraseSteps(0, 4);
  assert.ok(Array.isArray(phraseSteps));
  assert.ok(phraseSteps.length > 0, 'Phrase steps should contain events across 4 bars');
  assert.ok(phraseSteps[0].step >= 0);
});

test('Track 09 SLICE tick playback scheduling, mono choke, and pulse callback', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const pcm = new Float32Array(sampleRate * 2);
  HaloLiveLoop.addLayer({ duration: 2, bars: 1, sampleRate, pcm }, ctx);
  HaloLiveLoop.setMode('slice');
  HaloLiveLoop.rebuildSlices();

  const pulses = [];
  env.HaloPulse = (i, time) => pulses.push({ i, time });

  const startedSources = [];
  const stoppedSources = [];
  ctx.createBufferSource = () => {
    const src = {
      buffer: null,
      playbackRate: { value: 1 },
      connect() {},
      start(time, offset, duration) {
        startedSources.push({ time, offset, duration });
      },
      stop(time) {
        stoppedSources.push({ time });
      }
    };
    return src;
  };
  ctx.createBiquadFilter = () => {
    return {
      type: 'lowpass',
      frequency: { setValueAtTime() {} },
      connect() {}
    };
  };

  const fakeAudio = { ctx, master: ctx.createGain() };
  HaloLiveLoop.connectToAudio(fakeAudio);
  HaloLiveLoop.onPlay(0, 0);

  // Tick step 0 -> slice 0 triggers
  HaloLiveLoop.tick(0.0, 0, fakeAudio, 120);
  assert.equal(startedSources.length, 1, 'Slice voice scheduled at step 0');
  assert.equal(pulses.length, 1, 'Pulse event sent for orbit 8');
  assert.equal(pulses[0].i, 8, 'Pulse orbit index is 8');

  // Tick step 1 -> if slice is active, next voice chokes earlier voice
  HaloLiveLoop.setSettings({ sliceSteps: [0, 1, 2, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1] });
  HaloLiveLoop.tick(0.125, 1, fakeAudio, 120);
  assert.equal(startedSources.length, 2, 'Slice voice 1 scheduled at step 1');
  assert.ok(stoppedSources.length >= 2, 'Slice voice choked on retrigger and scheduled stop');
});

test('Track 09 SLICE randomization and offline export', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const pcm = new Float32Array(sampleRate * 2);
  HaloLiveLoop.addLayer({ duration: 2, bars: 1, sampleRate, pcm }, ctx);
  HaloLiveLoop.setMode('slice');

  // Test randomizeSlice
  HaloLiveLoop.randomizeSlice(42);
  const s = HaloLiveLoop.getSettings();
  assert.ok(s.character >= 20 && s.character <= 100);
  assert.ok(s.duration >= 20 && s.duration <= 95);
  assert.ok(s.density >= 40 && s.density <= 95);
  assert.ok(s.space >= 0 && s.space <= 70);
  assert.ok(s.delay >= 0 && s.delay <= 65);
  assert.ok(s.chorus >= 0 && s.chorus <= 50);

  // Test offline export with SLICE mode
  const offlineStarts = [];
  const fakeOfflineCtx = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime() {} }, connect() {} }; },
    createBufferSource() {
      const src = {
        buffer: null,
        playbackRate: { value: 1 },
        connect() {},
        start(time, offset, duration) {
          offlineStarts.push({ time, offset, duration });
        }
      };
      return src;
    }
  };

  HaloLiveLoop.renderOffline(fakeOfflineCtx, null, 2, 120);
  assert.ok(offlineStarts.length > 0, 'Offline slice render should schedule slice triggers');
});

test('Track 09 SLICE pattern randomizer, presets, and count adjustments', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;

  // Test pattern presets
  const beat = HaloLiveLoop.getPresetSlicePattern('beat', 8);
  assert.equal(beat.length, 16);
  assert.equal(beat[0], 0);
  assert.equal(beat[4], 2 % 8);

  const arp = HaloLiveLoop.getPresetSlicePattern('arp', 8);
  assert.equal(arp.length, 16);
  assert.equal(arp[0], 0);
  assert.equal(arp[1], -1);
  assert.equal(arp[2], 1);

  const arpeggio = HaloLiveLoop.getPresetSlicePattern('arpeggio', 8);
  assert.deepEqual(arpeggio, arp);

  const chrono = HaloLiveLoop.getPresetSlicePattern('chrono', 8);
  assert.equal(chrono[0], 0);
  assert.equal(chrono[14], 7);

  const shuffle = HaloLiveLoop.getPresetSlicePattern('shuffle', 8);
  assert.equal(shuffle.length, 16);
  assert.equal(shuffle[0], 0);

  // Test pattern randomizer
  for (let count of [4, 8, 16]) {
    const randomized = HaloLiveLoop.randomizeSlicePattern(count);
    assert.equal(randomized.length, 16);
    assert.equal(randomized[0], 0, 'Downbeat step 0 is anchored to slice 0');
    for (let i = 0; i < 16; i++) {
      assert.ok(randomized[i] >= -1 && randomized[i] < count, `Step ${i} value ${randomized[i]} should be between -1 and ${count - 1}`);
    }
  }

  // Test setSliceCount clamps pattern steps
  HaloLiveLoop.setMode('slice');
  HaloLiveLoop.setSliceCount(16);
  HaloLiveLoop.setSlicePattern([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  HaloLiveLoop.setSliceCount(4);
  const clampedPattern = HaloLiveLoop.getSlicePattern();
  assert.equal(HaloLiveLoop.getSliceCount(), 4);
  for (let i = 0; i < 16; i++) {
    assert.ok(clampedPattern[i] < 4, `Pattern step ${i} was not clamped to 4`);
  }
});

test('Track 09 createUI and HTML structure integrity in LOOP and SLICE modes', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;

  function validateHtmlTagBalance(html, modeName) {
    const voidTags = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'wbr']);
    const tagRegex = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?\/?>/g;
    const stack = [];
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = fullTag.endsWith('/>') || voidTags.has(tagName);

      if (isSelfClosing && !isClosing) continue;
      if (isClosing) {
        assert.ok(stack.length > 0, `Unexpected closing tag </${tagName}> in mode ${modeName}`);
        const top = stack.pop();
        assert.equal(top, tagName, `Mismatched tags: expected </${top}> but found </${tagName}> in mode ${modeName}`);
      } else {
        stack.push(tagName);
      }
    }
    assert.equal(stack.length, 0, `Unclosed tags in ${modeName}: ${stack.join(', ')}`);
  }

  function makeContainer() {
    const elements = new Map();
    const listeners = new Map();
    const container = {
      id: 'liveLoopPanel',
      _html: '',
      set innerHTML(val) {
        this._html = val;
        const idMatches = val.matchAll(/id=["']([^"']+)["']/g);
        for (const m of idMatches) {
          if (!elements.has(m[1])) {
            elements.set(m[1], {
              id: m[1],
              tagName: 'DIV',
              classList: {
                toggle() {},
                add() {},
                remove() {},
                contains() { return false; }
              },
              children: [],
              addEventListener(ev, fn) {
                listeners.set(`${m[1]}:${ev}`, fn);
              }
            });
          }
        }
      },
      get innerHTML() {
        return this._html;
      },
      querySelector(sel) {
        if (sel && sel.startsWith('#')) {
          const id = sel.slice(1);
          return elements.get(id) || null;
        }
        return null;
      },
      querySelectorAll() {
        return [];
      },
      children: []
    };
    return container;
  }

  const mockAppEnv = {
    settings: () => ({ tempo: 72 }),
    toast: () => {},
    confirm: async () => true
  };

  // 1. Test LOOP mode
  HaloLiveLoop.setMode('loop');
  const loopContainer = makeContainer();
  assert.doesNotThrow(() => {
    HaloLiveLoop.createUI(loopContainer, mockAppEnv);
  }, 'createUI in LOOP mode must not throw ReferenceError or binding errors');
  assert.ok(loopContainer.innerHTML.includes('09 — LIVE LOOP'), 'Loop mode header should be present');
  assert.ok(loopContainer.innerHTML.includes('id="loopBarsGroup"'), 'Bars group should be present in loop mode');
  validateHtmlTagBalance(loopContainer.innerHTML, 'LOOP');

  // 2. Test SLICE mode
  HaloLiveLoop.setMode('slice');
  const sliceContainer = makeContainer();
  assert.doesNotThrow(() => {
    HaloLiveLoop.createUI(sliceContainer, mockAppEnv);
  }, 'createUI in SLICE mode must not throw ReferenceError or binding errors');
  assert.ok(sliceContainer.innerHTML.includes('09 — SLICE'), 'Slice mode header should be present');
  assert.ok(sliceContainer.innerHTML.includes('slice-seq-grid'), '16-step sequencer grid should be present in slice mode');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-count="4"'), 'Slice count 4 pill present');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-count="8"'), 'Slice count 8 pill present');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-count="16"'), 'Slice count 16 pill present');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-pattern="beat"'), 'Beat pattern pill present');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-pattern="chrono"'), 'Chrono pattern pill present');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-pattern="shuffle"'), 'Shuffle pattern pill present');
  assert.ok(sliceContainer.innerHTML.includes('data-slice-pattern="arp"'), 'Arp pattern pill present');
  assert.ok(sliceContainer.innerHTML.includes('id="slicePatRandBtn"'), 'Pattern random button present');
  assert.ok(sliceContainer.innerHTML.includes('id="slicePatResetBtn"'), 'Pattern reset button present');
  validateHtmlTagBalance(sliceContainer.innerHTML, 'SLICE');
  HaloLiveLoop.setMode('pitch');
  const pitchContainer=makeContainer();HaloLiveLoop.createUI(pitchContainer,mockAppEnv);
  validateHtmlTagBalance(pitchContainer.innerHTML,'PITCH');
  let locale='en';const localized={...mockAppEnv,language:()=>locale};
  HaloLiveLoop.createUI(pitchContainer,localized);pitchContainer.children=[{}];
  env.document.getElementById=id=>id==='liveLoopPanel'?pitchContainer:null;
  locale='ru';HaloLiveLoop.renderUI();assert.ok(pitchContainer.innerHTML.includes('ИСХОДНАЯ НОТА СЕМПЛА'));assert.ok(pitchContainer.innerHTML.includes('loopInputToggle'));
  locale='en';HaloLiveLoop.renderUI();assert.ok(pitchContainer.innerHTML.includes('SAMPLE ROOT NOTE'));

  assert.ok(pitchContainer.innerHTML.includes('09 — PITCH'));
  assert.ok(pitchContainer.innerHTML.includes('id="pitchRootNote"'));
  assert.ok(pitchContainer.innerHTML.includes('id="sliceBtnRec"'));
  assert.ok(!pitchContainer.innerHTML.includes('data-slice-count='));
  for(const html of [loopContainer.innerHTML,sliceContainer.innerHTML,pitchContainer.innerHTML]){
    for(const id of ['modeBtnPitch','loopInputToggle','loopCompact','loopFileInput','loopTrimStart','loopTrimEnd'])assert.ok(html.includes('id="'+id+'"'));
    const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Each control ID is unique');
  }

});


test('Track 09 long loop is clipped at the shared phrase end and explicit transport stop is available',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),starts=[],stops=[];
 ctx.createBufferSource=()=>({playbackRate:{value:1},connect(){},start(t,o,d){starts.push({t,o,d})},stop(t){stops.push(t)}});
 loop.addLayer({id:99,duration:20,sampleRate:44100,pcm:new Float32Array(44100*20)},ctx);
 const audio={ctx,master:ctx.createGain()};loop.connectToAudio(audio);loop.setSettings({bars:8,instantRestart:false});loop.onPlay(0,0);loop.tick(0,0,audio,120,4);
 assert.equal(starts[0].d,8,'Eight-bar sample cannot run past four-bar phrase');loop.stopPlayback(8);assert.ok(stops.includes(8.005));
});


test('PITCH uses one sample with diatonic notes, explicit root, bounded shifts and isolated saved pattern',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop;env.HaloComposition=require('../src/composition.js');
 loop.setMode('pitch');loop.setSettings({pitchSteps:[0,1,2,3,4,5,6,7,-1,-1,-1,-1,-1,-1,-1,-1],density:100,rootNote:62});
 assert.equal(loop.pitchEvent(0,0).note,62);assert.equal(loop.pitchEvent(2,0).note,65);assert.equal(loop.pitchEvent(2,6).note,66);assert.equal(loop.pitchEvent(7,0).rate,2);assert.equal(loop.pitchEvent(8,0),null);
 const state=loop.capturePhrase();state.settings.pitchSteps[0]=7;assert.equal(loop.getSettings().pitchSteps[0],0);
 loop.setSettings({rootNote:36});assert.equal(loop.pitchEvent(0,0),null,'Out-of-range notes rest rather than becoming out of key');
 for(const bad of [{rootNote:35},{rootNote:60.5},{pitchOctave:2},{pitchSteps:[9]}])assert.throws(()=>loop.setSettings(bad));
});

test('PITCH live and offline scheduling agree on notes, trim, reverse, key, gate and shared phrase bounds',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),starts=[];env.HaloComposition=require('../src/composition.js');
 ctx.createBufferSource=()=>{const source={playbackRate:{value:1},connect(){},disconnect(){},start(time,offset,duration){starts.push({time,offset,duration,rate:this.playbackRate.value})},stop(){}};return source};
 const audio={ctx,master:ctx.createGain()};loop.connectToAudio(audio);loop.addLayer({id:999,sampleRate:44100,duration:12,pcmL:new Float32Array(44100*12)},ctx);
 loop.setMode('pitch');loop.setSettings({instantRestart:false,rootNote:62,pitchOctave:1,density:100,trimStart:.25,trimEnd:.5,offsetSec:2,reverse:true,pitchSteps:[0,-1,-1,-1,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]});
 assert.equal(loop.pitchWindow().startSec,4);assert.equal(loop.pitchWindow().duration,2);
 loop.onPlay(0,0);for(let step=0;step<64;step++)loop.tick(step/8,step,audio,120,4,6);
 const live=starts.splice(0);assert.equal(live.length,8);assert.equal(live[0].rate,2);assert.equal(live[0].offset,6);assert.ok(live.every(s=>s.duration<=2&&s.duration/s.rate<=.125));
 loop.renderPhraseOffline(ctx,audio,4,120,loop.capturePhrase(),3,6);
 assert.deepEqual(starts.map(s=>({...s,time:s.time-3})),live);
 assert.equal(loop.getSettings().pitchSteps[4],2);
});

test('PITCH pending note edits wait for the phrase when Instant Restart is off',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),rates=[];env.HaloComposition=require('../src/composition.js');
 ctx.createBufferSource=()=>({playbackRate:{value:1},connect(){},disconnect(){},start(){rates.push(this.playbackRate.value)},stop(){}});
 const audio={ctx,master:ctx.createGain()};loop.connectToAudio(audio);loop.addLayer({id:123,duration:1,sampleRate:44100,pcmL:new Float32Array(44100)},ctx);loop.setMode('pitch');loop.setSettings({instantRestart:false,density:100,pitchSteps:Array(16).fill(0)});loop.onPlay(0,0);loop.tick(0,0,audio,120,4);
 loop.setSettings({rootNote:50});loop.tick(.125,1,audio,120,4);assert.equal(rates.at(-1),1);loop.tick(8,64,audio,120,4);assert.equal(rates.at(-1),2);
});


test('all Track 09 modes record the selected input; PITCH bounds takes to eight seconds',async()=>{
 for(const mode of ['loop','slice','pitch']){
  const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),calls=[],tracks=[],processors=[];
  ctx.createMediaStreamSource=()=>({connect(){},disconnect(){}});
  ctx.createScriptProcessor=()=>{const p={connect(){},disconnect(){}};processors.push(p);return p};
  env.navigator.mediaDevices.getUserMedia=async constraints=>{calls.push(constraints);const track={readyState:'live',stop(){this.readyState='ended'}};tracks.push(track);return {active:true,getAudioTracks:()=>[track],getTracks:()=>[track]}};
  env.navigator.mediaDevices.enumerateDevices=async()=>[{kind:'audioinput',deviceId:'test-interface',label:'Test interface'}];
  const audio={ctx,master:ctx.createGain()};loop.init({isPlaying:()=>true,language:()=> 'en',ensureAudio:async()=>audio,settings:()=>({tempo:120}),confirm:async()=>true,toast(){}});
  loop.setMode(mode);loop.setSettings({copyrightConfirmed:true,bars:8,latencyMs:0});loop.configureInput({kind:'instrument',deviceId:'test-interface'});
  await loop.armRecording(false,audio,120);assert.equal(calls[0].audio.deviceId.exact,'test-interface');
  loop.tick(0,0,audio,120,8);processors[0].onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(44100*9).fill(.1)}});
  const last=mode==='pitch'?64:128;ctx.currentTime=last/8;loop.tick(last/8,last,audio,120,8);
  assert.equal(loop.getLayerCount(),1);assert.ok(loop.getLayers()[0].duration<=(mode==='pitch'?8:16));assert.equal(tracks[0].readyState,'ended');
 }
});


test('recording PCM sample rates are resampled for context/export without changing pitch or duration',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),rate=48000,pcm=new Float32Array(rate/10);
 for(let i=0;i<pcm.length;i++)pcm[i]=.2*Math.sin(2*Math.PI*440*i/rate);
 const buffer=loop.buildCompositeBuffer(ctx,[{sampleRate:rate,duration:.1,pcmL:pcm}],.1);
 assert.equal(buffer.length,4410);assert.equal(buffer.sampleRate,44100);
 for(const i of [1,50,100,1000,4000])assert.ok(Math.abs(buffer.getChannelData(0)[i]-.2*Math.sin(2*Math.PI*440*i/44100))<.0002);
});


test('loaded waveforms draw finite geometry in LOOP, SLICE and PITCH including longer sample windows',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),calls=[];
 const drawing=new Proxy({}, {get(target,key){return target[key]||((...args)=>{if(['fillRect','strokeRect','moveTo','lineTo'].includes(key))assert.ok(args.every(Number.isFinite),key+' geometry');calls.push(key)})}});
 const canvas={clientWidth:600,clientHeight:110,classList:{toggle(){}},getContext:()=>drawing};
 env.document.getElementById=id=>id==='loopCanvas'?canvas:null;
 loop.addLayer({id:123,duration:12,sampleRate:44100,pcmL:new Float32Array(44100*12)},ctx);
 for(const mode of ['loop','slice','pitch']){loop.setMode(mode);loop.setSettings({bars:1,trimStart:.1,trimEnd:.8});assert.doesNotThrow(()=>loop.renderWaveform());}
 assert.ok(calls.includes('fillRect'));assert.ok(calls.includes('fillText'));
});


test('pending IndexedDB hydration cannot erase a restored phrase audio reference',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop;loop.init({});
 loop.restorePhrase({version:1,settings:{mode:'pitch',rootNote:57},layerIds:[1234]});
 assert.deepEqual(Array.from(loop.capturePhrase().layerIds),[1234]);assert.equal(loop.capturePhrase().settings.rootNote,57);
});


test('workspace-only Track 09 folding preserves phrase processing and audio',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext();
 loop.addLayer({id:42,duration:1,sampleRate:44100,pcmL:new Float32Array(44100)},ctx);
 loop.setMode('pitch');loop.setSettings({rootNote:57,trimStart:.1,trimEnd:.8});
 const before=JSON.stringify(loop.capturePhrase());
 loop.setCompact(true);loop.setInputWindow(true);
 assert.equal(loop.getUIState().compact,true);assert.equal(loop.getUIState().inputOpen,true);
 assert.equal(JSON.stringify(loop.capturePhrase()),before);
 loop.setUIState({compact:false,inputOpen:false});
 assert.equal(loop.getUIState().compact,false);assert.equal(loop.getUIState().inputOpen,false);
 assert.equal(JSON.stringify(loop.capturePhrase()),before);
});


test('slice trim rebuilds all slices inside new boundaries and solo reaches live/offline engines',()=>{
 const env=createEnvironment(),loop=env.HaloLiveLoop,ctx=new env.AudioContext(),calls=[];
 loop.connectToAudio({ctx,master:ctx.createGain(),setCoreMuted:(v,t)=>calls.push([v,t])});loop.setSettings({solo:true});assert.equal(calls.at(-1)[0],true);
 loop.addLayer({id:321,duration:2,sampleRate:44100,pcmL:new Float32Array(88200)},ctx);loop.setMode('slice');
 loop.setSettings({trimStart:.25,trimEnd:.75,instantRestart:false});
 const slices=loop.getSlices();assert.ok(slices.length);assert.ok(slices.every(s=>s.startSec>=.5&&s.endSec<=1.5+.00001));
 loop.renderPhraseOffline(ctx,{setCoreMuted:(v,t)=>calls.push([v,t])},4,72,undefined,2);assert.deepEqual(calls.at(-1),[false,2]);
});
