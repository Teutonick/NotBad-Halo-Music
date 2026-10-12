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
  function phraseAt(beat,bars=4) {
    const length=bars*16;
    const steps = Math.max(0, beat * 4), start = Math.floor(steps / length) * length;
    const local = steps - start;
    return { number: start / length + 1, start, phase: local / length,
      bar: Math.floor(local / 16) + 1, beat: Math.floor(local % 16 / 4) + 1,
      step: Math.floor(local), bars };
  }
  // Preview uses the same seeded trigger rules as audio, including skipped bars.
  // Muted voices show what WOULD play when enabled, without scheduling anything.
  function phraseSteps(track, index, start, seed, sounds,bars=4) {
    const pattern = sounds.patternFor(track), enabled = { ...track, on: true };
    return Array.from({length: bars*16}, (_,step) => ({ step,
      candidate: track.manualSteps?track.manualSteps.includes(step%(track.manualBars*16)):pattern.includes(step % 16),
      fires: sounds.shouldTrigger(enabled,index,step,seed) }));
  }
  const api = { phaseAt, phraseAt, phraseSteps, PHRASE_BARS, PHRASE_STEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
