const test = require('node:test');
const assert = require('node:assert/strict');
const { banks, chords, soundFor, notesFor, shouldTrigger } = require('../src/sounds.js');
const Audio = require('../src/audio.js');
const track = name => ({ name, sound: banks[name].sounds[0].id, character: 50, duration: 50, space: 55, level: 65, density: 100, on: true, pattern: [0, 4, 8, 12] });

test('eight distinct roles, 30 local patches, safe unknown patch fallback', () => {
  assert.equal(Object.keys(banks).length, 8);
  assert.equal(Object.values(banks).reduce((n,b)=>n+b.sounds.length,0),30);
  assert.equal(new Set(Object.values(banks).map(b => b.role)).size, 8);
  for (const [name, bank] of Object.entries(banks)) {
    assert.ok(bank.sounds.length >= 3);
    assert.equal(new Set(bank.sounds.map(s => s.id)).size, bank.sounds.length);
    assert.equal(soundFor({ name, sound: 'missing' }), bank.sounds[0]);
  }
});

test('all pitched patches stay in the current chord; noises and percussion have no chord pitches', () => {
  Object.keys(banks).forEach((name, index) => {
    for (const patch of banks[name].sounds) for (let bar = 0; bar < 16; bar++) for (let local = 0; local < 16; local++) {
      const t = { ...track(name), sound: patch.id };
      const notes = notesFor(t, index, bar, local, 3);
      assert.deepEqual(notes, notesFor(t, index, bar, local, 3));
      if (['noise', 'kick', 'drop', 'snare', 'clap'].includes(patch.engine)) assert.deepEqual(notes, []);
      else {
        assert.ok(notes.length > 0 && notes.length <= 3);
        for (const n of notes) assert.ok(chords[bar % 4].some(c => (n - c) % 12 === 0));
      }
    }
  });
});

test('events obey mute, pattern, density and alternate-bar ambient phrasing', () => {
  const t = track('GLASS');
  assert.equal(shouldTrigger(t, 0, 0, 1), true);
  assert.equal(shouldTrigger(t, 0, 1, 1), false);
  assert.equal(shouldTrigger({ ...t, on: false }, 0, 0, 1), false);
  assert.equal(shouldTrigger({ ...t, density: 0 }, 0, 0, 1), false);
  assert.equal(shouldTrigger(track('AURA'), 7, 16, 1), false);
  const events = seed => Array.from({ length: 256 }, (_, step) => shouldTrigger({ ...t, density: 50 }, 0, step, seed));
  assert.deepEqual(events(1), events(1)); assert.notDeepEqual(events(1), events(2));
});

// A deterministic Web Audio contract fake: validates schedule, finite parameters,
// ramped updates, bounded events and complete source/graph cleanup, not sound quality.
function context() {
  const nodes = [], sources = [];
  const param = () => ({ value: 0, calls: [], setValueAtTime(v, t) { this.record(v,t); },
    exponentialRampToValueAtTime(v,t) { assert.ok(v > 0); this.record(v,t); },
    setTargetAtTime(v,t,tau) { assert.ok(tau > 0); this.record(v,t); },
    cancelAndHoldAtTime(t) { this.record(0,t); },
    record(v,t) { assert.ok(Number.isFinite(v) && Number.isFinite(t)); this.calls.push([v,t]); } });
  const node = () => { const n = { disconnected: false, connect() {}, disconnect() { this.disconnected = true; },
    gain: param(), frequency: param(), detune: param(), Q: param() }; nodes.push(n); return n; };
  const source = () => { const n = node(); n.start = t => { n.started = t; }; n.stop = t => { n.stopped = t; }; sources.push(n); return n; };
  return { currentTime: 0, sampleRate: 8000, destination: node(), nodes, sources,
    createGain: node, createDynamicsCompressor() { const n = node(); for (const k of ['threshold','knee','ratio','attack','release']) n[k] = param(); return n; },
    createConvolver: node, createBiquadFilter: node, createOscillator: source, createBufferSource: source,
    createBuffer(ch, length) { const data = Array.from({ length: ch }, () => new Float32Array(length)); return { getChannelData: i => data[i] }; } };
}
test('every patch schedules finite, bounded audio and releases all event nodes', () => {
  const tracks = Object.keys(banks).map(track), ctx = context(), audio = Audio.create(ctx, tracks);
  const baseline = ctx.nodes.length;
  tracks.forEach((t, index) => {
    for (const patch of banks[t.name].sounds) for (const value of [0,100]) {
      t.sound = patch.id; t.character = t.duration = t.space = value;
      audio.play(index, notesFor(t,index,0,0,1), .1, .8, patch);
      audio.update(index);
    }
  });
  for (const source of ctx.sources) {
    assert.equal(source.started, .1); assert.ok(source.stopped >= .06 && source.stopped < 9);
    source.onended();
  }
  assert.ok(audio.voices.every(v => v.size === 0));
  assert.ok(ctx.nodes.slice(baseline).every(n => n.disconnected));
  tracks[0].on = false; audio.update(0);
  assert.equal(audio.trackGains[0].gain.calls.at(-1)[0], 0);
});
test('dense retriggers steal old events with bounded release times', () => {
  const t = track('TIDAL'), ctx = context(), audio = Audio.create(ctx,[t]);
  for (let i=0; i<40; i++) audio.play(0,[50,53,57], .1,.8,soundFor(t));
  assert.equal(audio.voices[0].size,4);
  assert.ok(ctx.sources.some(s => s.stopped === .06));
  ctx.sources.forEach(s=>s.onended());
  assert.equal(audio.voices[0].size,0);
});
