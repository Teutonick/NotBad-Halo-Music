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
  const api = { phaseAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
