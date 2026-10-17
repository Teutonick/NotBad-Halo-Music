/* Pure visual mapping; never schedules sound. Right-axis crossings mark events. */
(function(root){
  'use strict';
  function phaseAt(pattern, absoluteStep,cycle=16) {
    if (!pattern.length) return (absoluteStep / cycle) % 1;
    const step = Math.max(0, absoluteStep), bar = Math.floor(step / cycle), local = step % cycle;
    let previous = pattern[pattern.length - 1] + (bar - 1) * cycle;
    let next = pattern[0] + (bar + 1) * cycle;
    for (const event of pattern) {
      const position = bar * cycle + event;
      if (event <= local) previous = position;
      else { next = position; break; }
    }
    return (step - previous) / (next - previous);
  }
  const PHRASE_BARS = 4, PHRASE_STEPS = 64;
  function phraseAt(beat,bars=4,timeSignature='4/4') {
    const spb = timeSignature==='3/4'?12:16;
    const length=bars*spb;
    const steps = Math.max(0, beat * 4), start = Math.floor(steps / length) * length;
    const local = steps - start;
    const bar = Math.floor(local / spb) + 1;
    const beatDiv = timeSignature==='3/4' ? (bars===8?6:4) : 4;
    const res = { number: start / length + 1, start, phase: local / length,
      bar, beat: Math.floor((local % spb) / beatDiv) + 1,
      step: Math.floor(local), bars };
    if (timeSignature === '3/4') {
      res.totalBeats = bars === 8 ? 2 : 3;
      res.timeSignature = '3/4';
    }
    return res;
  }
  // Preview uses the same seeded trigger rules as audio, including skipped bars.
  // Muted voices show what WOULD play when enabled, without scheduling anything.
  function phraseSteps(track, index, start, seed, sounds,bars=4,timeSignature=track.timeSignature||'4/4') {
    const spb = timeSignature==='3/4'?12:16;
    const pattern = sounds.patternFor({...track,variation:seed},bars,timeSignature), enabled = { ...track, on: true };
    return Array.from({length: bars*spb}, (_,step) => ({ step,
      candidate: track.manualSteps?track.manualSteps.includes(track.generator===3?sounds.roles.mod(start+step,(track.manualBars||bars)*spb):step%((track.manualBars||bars)*spb)):pattern.includes(track.generator===3?sounds.roles.mod(start+step,sounds.cycleLength(track,bars,timeSignature)):track.generator===2?step:step % spb),
      fires: sounds.shouldTrigger(enabled,index,track.generator===3?start+step:step,seed,bars,timeSignature) }));
  }
  const api = { phaseAt, phraseAt, phraseSteps, PHRASE_BARS, PHRASE_STEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
