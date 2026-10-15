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

test('Track 09 Immediate sample restart vs Quantized loop restart behavior', () => {
  const env = createEnvironment();
  const HaloLiveLoop = env.HaloLiveLoop;
  const ctx = new env.AudioContext();

  const sampleRate = 44100;
  const pcm = new Float32Array(sampleRate * 4); // 4 seconds
  HaloLiveLoop.addLayer({ duration: 4, bars: 2, sampleRate, pcm }, ctx);

  // Setup fake audio context with running state and tracking buffer sources
  const startedSources = [];
  ctx.createBufferSource = () => {
    const src = {
      buffer: null,
      playbackRate: { value: 1 },
      connect() {},
      start(time, offset, duration) {
        startedSources.push({ time, offset, duration, rate: src.playbackRate.value });
      },
      stop() {}
    };
    return src;
  };

  const fakeAudio = { ctx, master: ctx.createGain() };
  HaloLiveLoop.connectToAudio(fakeAudio);

  // 1. Initial play at step 0
  HaloLiveLoop.onPlay(0, 0);
  HaloLiveLoop.tick(0.0, 0, fakeAudio, 120);
  assert.equal(startedSources.length, 1, 'Initial playback scheduled at step 0');

  // 2. Sample tweak with instantRestart: true -> Immediate restart (e.g. Pitch or Reverse)
  startedSources.length = 0;
  HaloLiveLoop.setSettings({ pitch: 4 });
  // Immediate restart executes
  assert.equal(startedSources.length, 1, 'Pitch tweak immediately restarts sample playback');
  assert.ok(Math.abs(startedSources[0].rate - Math.pow(2, 4 / 12)) < 0.001, 'Playback rate should match +4 st');

  // 3. Loop Length change (BARS) with instantRestart: true -> Quantized restart on nearest beat or bar (absStep % 4 === 0)
  startedSources.length = 0;
  HaloLiveLoop.setSettings({ bars: 1 }); // was 2, now 1 bar
  assert.equal(HaloLiveLoop.isPendingQuantizedRestart(), true, 'Quantized restart should be pending');
  assert.equal(startedSources.length, 0, 'Should NOT restart immediately mid-beat');

  // Step 5 is not a beat boundary (5 % 4 !== 0) -> no restart
  HaloLiveLoop.tick(0.5, 5, fakeAudio, 120);
  assert.equal(startedSources.length, 0, 'Step 5 is not on beat boundary');
  assert.equal(HaloLiveLoop.isPendingQuantizedRestart(), true, 'Quantized restart still pending at step 5');

  // Step 8 is a beat boundary (8 % 4 === 0) -> Quantized restart fires!
  HaloLiveLoop.tick(0.8, 8, fakeAudio, 120);
  assert.equal(startedSources.length, 1, 'Step 8 is on beat boundary -> restart fires');
  assert.equal(HaloLiveLoop.isPendingQuantizedRestart(), false, 'Quantized restart flag cleared');
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
