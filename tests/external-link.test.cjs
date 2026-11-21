const assert = require('node:assert/strict');
const test = require('node:test');
const { midiClock } = require('../src/external-link');

test('MIDI follows transport timestamps with six pulses per sixteenth note', () => {
  const events = [];
  const port = { state: 'connected', send: (...event) => events.push(event), clear: () => events.push(['clear']) };
  const ctx = { currentTime: 3, state: 'running' };
  const clock = midiClock(() => 2000);
  clock.tick(ctx, 3.125, 120, 0);
  assert.deepEqual(events, []);
  clock.select(port);
  clock.tick(ctx, 3.125, 120, 0);
  assert.deepEqual(events[0], [[0xfa], 2125]);
  assert.equal(events.slice(1).length, 6);
  assert.ok(events.slice(1).every(([bytes], i) => bytes[0] === 0xf8));
  assert.equal(events[2][1], events[1][1] + 60000 / (24 * 120));
  clock.tick(ctx, 3.25, 60, 1);
  assert.equal(events[8][1], events[7][1] + 60000 / (24 * 60));
  clock.stop();
  assert.deepEqual(events.slice(-2), [['clear'], [[0xfc], undefined]]);
  assert.equal(clock.active(), false);
  clock.tick(ctx, 3.375, 60, 4);
  assert.equal(events[events.length - 7][0][0], 0xfb);
});
