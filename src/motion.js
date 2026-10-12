/* Pure visual mapping; never schedules sound. Right-axis crossings mark events. */
(function(root){
  'use strict';
  function phaseAt(pattern, absoluteStep) {
    if (!pattern.length) return (absoluteStep / 16) % 1;
    const step = Math.max(0, absoluteStep), bar = Math.floor(step / 16), local = step % 16;
    let previous = pattern[pattern.length - 1] + (bar - 1) * 16;
    let next = pattern[0] + (bar + 1) * 16;
    for (const event of pattern) {
      const position = bar * 16 + event;
      if (event <= local) previous = position;
      else { next = position; break; }
    }
    return (step - previous) / (next - previous);
  }
  const PHRASE_BARS = 4, PHRASE_STEPS = 64;
  function phraseAt(beat) {
    const steps = Math.max(0, beat * 4), start = Math.floor(steps / PHRASE_STEPS) * PHRASE_STEPS;
    const local = steps - start;
    return { number: start / PHRASE_STEPS + 1, start, phase: local / PHRASE_STEPS,
      bar: Math.floor(local / 16) + 1, beat: Math.floor(local % 16 / 4) + 1,
      step: Math.floor(local), bars: PHRASE_BARS };
  }
  // Preview uses the same seeded trigger rules as audio, including skipped bars.
  // Muted voices show what WOULD play when enabled, without scheduling anything.
  function phraseSteps(track, index, start, seed, sounds) {
    const pattern = sounds.patternFor(track), enabled = { ...track, on: true };
    return Array.from({length: PHRASE_STEPS}, (_,step) => ({ step,
      candidate: pattern.includes(step % 16),
      fires: sounds.shouldTrigger(enabled,index,start + step,seed) }));
  }
  const api = { phaseAt, phraseAt, phraseSteps, PHRASE_BARS, PHRASE_STEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
