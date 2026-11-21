const assert = require('node:assert/strict');
const test = require('node:test');
const { midiClock, transportInput } = require('../src/external-link');

test('selected MIDI input accepts only Start and Stop and detaches on port changes',()=>{
  const commands=[],input=transportInput(command=>commands.push(command)),first={},second={};
  input.select(first);
  for(const data of [[0xf8],[0xfb],[0x90,60,100],[0xfa,0],[0xfa],[0xfc]])first.onmidimessage({data});
  assert.deepEqual(commands,['start','stop']);
  input.select(second);
  assert.equal(first.onmidimessage,null);
  second.onmidimessage({data:Uint8Array.of(0xfc)});
  assert.deepEqual(commands,['start','stop','stop']);
  input.select(undefined);
  assert.equal(second.onmidimessage,null);
});

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

test('MIDI reports a rejected send and recovers when the port can queue messages again', () => {
  const clock = midiClock(() => 2000);
  const ctx = { currentTime: 3, state: 'running' };
  let blocked = true;
  clock.select({ state: 'connected', clear() {}, send() { if (blocked) throw Error('unavailable'); } });
  clock.tick(ctx, 3.125, 120, 0);
  assert.equal(clock.active(), false);
  assert.equal(clock.failed(), true);
  blocked = false;
  clock.tick(ctx, 3.25, 120, 1);
  assert.equal(clock.active(), true);
  assert.equal(clock.failed(), false);
});
