const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const media = require('../src/external-media');
const project = require('../src/project');
const song = require('../src/song');

const id = '1ca064a8-c307-4e16-96c8-11fe6e5707c3';
const clip = { id, scope: 'phrase:0', layout: 'ambient:4:4/4', start: 0, steps: 4, bpm: 120,
  meter: '4/4', offset: 0, frames: 4000, rate: 8000, tail: 48 };
const state = { version: 1, mode: 'recorded', volume: 74, mute: false, fit: false, clips: [clip] };

test('Track 10 metadata is bounded and distinguishes original tempo from playback fit', () => {
  assert.deepEqual(media.validate(state), state);
  for (const patch of [{ frames: 0 }, { tail: 49 }, { rate: 192000 }, { scope: 'phrase:../../' }, { start: 2048 }, { offset: 501 }]) {
    assert.throws(() => media.validate({ ...state, clips: [{ ...clip, ...patch }] }), /recording reference/);
  }
  assert.throws(() => media.validate({ ...state, clips: [clip, clip] }), /recording reference/);
  assert.equal(media.fits(clip, clip.layout, 140, false), false);
  assert.equal(media.fits(clip, clip.layout, 140, true), true);
  assert.equal(media.fits(clip, 'ambient:8:4/4', 120, true), false);
});

test('composition bar selection counts mixed meters and repeats on the shared grid', () => {
  const songData = {
    phrases: [{ id: 1, project: { setup: 'water', bars: 4, timeSignature: '3/4' } }, { id: 2, project: { setup: 'water', bars: 8 } }],
    sections: [{ phrase: 1, repeats: 2 }, { phrase: 2, repeats: 1 }]
  };
  const boundaries = song.barSteps(songData);
  assert.equal(boundaries[8], 96);
  assert.equal(boundaries[9], 112);
  assert.equal(boundaries.at(-1), 224);
  assert.equal(song.at(songData, boundaries[8]).index, 1);
});

function useStorage() {
  const saved = new Map();
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          transaction() {
            const tx = {
              objectStore() {
                return {
                  add(data, key) { assert.ok(!saved.has(key)); saved.set(key, data); },
                  get(key) { return { result: saved.get(key) }; },
                  clear() { saved.clear(); }
                };
              }
            };
            queueMicrotask(() => tx.oncomplete());
            return tx;
          }
        };
        request.onsuccess();
      });
      return request;
    }
  };
  return saved;
}

test('portable package preserves stereo WAV and rejects damaged audio before changing storage', async () => {
  const records = useStorage();
  const frames = clip.frames + clip.tail;
  const audio = [
    Float32Array.from({ length: frames }, (_, i) => Math.sin(i / 10) * .3),
    Float32Array.from({ length: frames }, (_, i) => Math.cos(i / 10) * .2)
  ];
  const wav = new Blob([project.wav({ length: frames, numberOfChannels: 2, sampleRate: clip.rate, getChannelData: ch => audio[ch] })]);
  await media.store([[clip.id, wav]]);
  const bundle = await media.pack({ setup: 'ambient', externalLink: state });
  await media.clear();
  assert.equal(records.size, 0);
  const parse = text => JSON.parse(text);
  const exported = new Uint8Array(await bundle.arrayBuffer());
  exported[exported.length - 1] ^= 0xff;
  await assert.rejects(() => media.unpack(new Blob([exported]), parse), /checksum/);
  assert.equal(records.size, 0);
  const imported = await media.unpack(bundle, parse);
  const importedClip = imported.externalLink.clips[0];
  assert.notEqual(importedClip.id, clip.id);
  assert.deepEqual({ ...importedClip, id: clip.id }, clip);
  assert.deepEqual(await (await media.read(importedClip)).arrayBuffer(), await wav.arrayBuffer());
  await assert.rejects(() => media.read(clip), /missing/);
});

test('clip placement uses absolute Web Audio time and recorded tempo for resume, fit and crossfade', () => {
  const calls = [];
  const param = {
    setValueAtTime: (...args) => calls.push(['set', ...args]),
    linearRampToValueAtTime: (...args) => calls.push(['ramp', ...args]),
    cancelScheduledValues() {},
    setTargetAtTime() {}
  };
  const source = { connect() {}, disconnect() {}, playbackRate: {}, start: (...args) => calls.push(['start', ...args]), stop() {} };
  const gain = { gain: param, connect() {}, disconnect() {} };
  const engine = { ctx: { createBufferSource: () => source, createGain: () => gain } };
  const player = media.schedule(engine, {}, { duration: .506 }, clip, 10, 2, 60);
  assert.equal(source.playbackRate.value, .5);
  assert.equal(player.end, 10.5);
  assert.deepEqual(calls.at(-1), ['start', 10, .25, .256]);
  assert.deepEqual(calls.at(-2), ['ramp', 0, 10.512]);
});

test('AudioWorklet returns only the target musical frames and preserves captured partial PCM', () => {
  const events = [];
  let Recorder;
  const context = {
    AudioWorkletProcessor: class { port = { postMessage: (data) => events.push(data) }; },
    registerProcessor: (name, value) => Recorder = value,
    currentFrame: 0
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/external-record-worklet.js'), 'utf8'), context);
  const recorder = new Recorder();
  const input = Float32Array.from({ length: 128 }, (_, i) => i / 128);
  const output = [[new Float32Array(128)]];
  recorder.port.onmessage({ data: { type: 'begin', id, start: 122, end: 250 } });
  recorder.process([[input]], output);
  recorder.port.onmessage({ data: { type: 'end', id, end: 134 } });
  context.currentFrame = 128;
  recorder.process([[input]], output);
  const left = Array.from(events[0].channels[0]);
  assert.deepEqual(left, [...input.slice(122), ...input.slice(0, 6)]);
  assert.deepEqual(Array.from(events[0].channels[1]), left);
  assert.equal(events[1].done, true);
  assert.ok(output[0][0].every(sample => sample === 0));
});

test('mixed offline export adds kept Track 10 at the same phrase and composition grid positions', async () => {
  const events = [];
  class OfflineContext {
    createGain() {
      return { gain: { value: 1, setTargetAtTime() {} }, connect() {} };
    }
    startRendering() { return this; }
    getChannelData() { return new Float32Array(400000); }
  }
  const master = { gain: { setTargetAtTime() {} } };
  const trackedMedia = {
    ...media,
    checkProject: async () => {},
    buffers: async (_, clips) => new Map(clips.map(c => [c.id, {}])),
    schedule(_, destination, buffer, item, time, step) {
      events.push({ id: item.id, time, step, volume: destination.gain.value });
      return { end: time + item.steps * 15 / item.bpm, stop() {} };
    }
  };
  const context = {
    HaloExternalMedia: trackedMedia, HaloSong: song,
    HaloSounds: { needsSamples: () => false, arrange() {}, shouldTrigger: () => false },
    HaloAudio: { create: () => ({ master, update() {} }) },
    OfflineAudioContext: OfflineContext
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/export.js'), 'utf8'), context);
  const phrase = { setup: 'ambient', bars: 4, tempo: 120, startStep: 0, tracks: [] };
  await context.HaloExport.render({ ...phrase, externalLink: state });
  assert.deepEqual(events.splice(0), [
    { id, time: 0, step: 0, volume: .74 },
    { id, time: 8, step: 0, volume: .74 }
  ]);
  const composition = {
    format: 'halo-composition', tempo: 120, masterVolume: 50,
    phrases: [{ id: 1, project: { ...phrase, tracks: Array.from({ length: 8 }, () => ({ generator: 3 })) } }],
    sections: [{ phrase: 1, repeats: 2 }],
    externalLink: { ...state, clips: [{ ...clip, scope: 'song', start: 64 }] }
  };
  await context.HaloExport.render(composition);
  assert.deepEqual(events.splice(0), [{ id, time: 8, step: 64, volume: .74 }]);
  await context.HaloExport.render({ ...phrase, externalLink: { ...state, mute: true } });
  assert.deepEqual(events, []);
});

test('portable project remaps referenced Track 09 layers alongside Track 10', async () => {
  const pcmL = new Float32Array([.125, -.25]);
  const pcmR = new Float32Array([-.375, .5]);
  const layer = { id: 17, sampleRate: 8000, bars: 4, name: 'Track 09', gain: .5, pcmL, pcmR };
  let saved;
  globalThis.HaloLiveLoop = {
    async packageLayers(ids) { assert.deepEqual(ids, [17]); return [layer]; },
    async importPackageLayers(layers) { saved = layers; }
  };
  try {
    const source = { setup: 'water', liveLoop: { layerIds: [17] }, externalLink: { ...state, clips: [] } };
    const file = await media.pack(source);
    const loaded = await media.unpack(file, JSON.parse);
    assert.deepEqual(loaded.liveLoop.layerIds, [saved[0].id]);
    assert.notEqual(saved[0].id, 17);
    assert.deepEqual(saved[0].pcmL, pcmL);
    assert.deepEqual(saved[0].pcmR, pcmR);
    assert.equal(saved[0].gain, .5);
    assert.deepEqual(source.liveLoop.layerIds, [17]);
  } finally { delete globalThis.HaloLiveLoop; }
});

test('eight-bar 3/4 recording uses shared boundaries and subtracts a negative offset from the capture frame', async () => {
  const commands = [];
  class Worklet {
    port = {
      postMessage: message => commands.push(message),
      addEventListener() {},
      close() {}
    };
    connect() {}
    disconnect() {}
  }
  const param = { value: 0, cancelScheduledValues() {}, setTargetAtTime() {} };
  const ctx = {
    sampleRate: 8000, currentTime: 5, destination: {},
    audioWorklet: { async addModule() {} },
    createGain: () => ({ gain: param, connect() {}, disconnect() {} }),
    createAnalyser: () => ({ connect() {}, disconnect() {} })
  };
  const descriptor = { scope: 'phrase:0', layout: 'ambient:8:3/4', bpm: 120, meter: '3/4', length: 96, position: 0 };
  const context = {
    URL, document: { baseURI: 'https://example.test/NotBad-Halo-Music/' },
    HaloExternalMedia: media, AudioWorkletNode: Worklet, crypto: { randomUUID: () => id }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/external-takes.js'), 'utf8'), context);
  let running = false;
  const takes = context.HaloExternalTakes.install({
    describe: () => descriptor, render() {}, changed() {},
    running: () => running, async start() { running = true; }
  });
  const engine = { ctx, master: {} };
  takes.setInput(engine, { connect() {} });
  await takes.arm({ kind: 'phrase', count: 1, offset: -250 });
  assert.equal(takes.lead(), 1.62);
  assert.equal(commands.length, 0);
  takes.tick(engine, 6.62, descriptor);
  const capture = commands[0];
  assert.equal(capture.start, 50960);
  assert.equal(capture.end - capture.start, 96 * 15 * 8000 / 120 + 48);
  takes.stop(7);
  assert.equal(commands[1].end, 56000);
});
