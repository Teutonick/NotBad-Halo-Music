/* Original procedural patches. No samples or third-party audio assets. */
(function (root) {
  'use strict';
  const patch = (id, name, engine, tone, decay, extra = {}) =>
    Object.freeze({ id, name, engine, tone, decay, ...extra });
  const banks = {
    GLASS: { role: 'Ringing accents', sounds: [
      patch('bell', 'Soft bell', 'bell', 4200, 2.7),
      patch('vibes', 'Vibes', 'bell', 2200, 1.8, { ratio: 3 }),
      patch('crystal', 'Crystal', 'bell', 5800, 3.2, { ratio: 2.71 })] },
    TIDAL: { role: 'Harmonic bed', sounds: [
      patch('air', 'Air pad', 'pad', 1300, 4.8),
      patch('organ', 'Soft organ', 'pad', 1800, 3.6, { wave: 'sine', ratio: 2 }),
      patch('tide', 'Warm tide', 'pad', 800, 5.5, { wave: 'triangle', detune: 8 })] },
    ROOT: { role: 'Low foundation', sounds: [
      patch('round', 'Round bass', 'bass', 650, 1.15),
      patch('deep', 'Deep tone', 'bass', 350, 2.1, { wave: 'triangle' }),
      patch('pulse', 'Soft kick', 'kick', 480, .45),
      patch('punch', 'Punch kick', 'kick', 2200, .32, { punch: true, pattern: [0,4,8,12] })] },
    EMBER: { role: 'Plucked tones', sounds: [
      patch('string', 'Soft string', 'pluck', 2400, 1.2),
      patch('harp', 'Harp glow', 'pluck', 3400, 2, { ratio: 2 }),
      patch('warm', 'Warm pluck', 'pluck', 1100, .8, { wave: 'sine' })] },
    RAIN: { role: 'Light rhythm', sounds: [
      patch('shaker', 'Shaker', 'noise', 3500, .16, { filter: 'bandpass' }),
      patch('brush', 'Brush', 'noise', 1700, .45, { filter: 'bandpass' }),
      patch('drop', 'Drops', 'drop', 2800, .35),
      patch('snare', 'Dry snare', 'snare', 6500, .18, { punch: true, pattern: [4,12] }),
      patch('clap', 'Clap', 'clap', 3800, .16, { punch: true, filter: 'bandpass', pattern: [4,12] }),
      patch('hat', 'Closed hat', 'noise', 7500, .07, { filter: 'highpass', pattern: [2,6,10,14] })] },
    VEIL: { role: 'Sustained textures', sounds: [
      patch('bow', 'Bowed veil', 'pad', 950, 5, { wave: 'triangle', detune: 6 }),
      patch('drone', 'Low drone', 'pad', 600, 6, { wave: 'sine', detune: 2 }),
      patch('ensemble', 'Ensemble', 'pad', 1600, 4.5, { wave: 'triangle', detune: 11 })] },
    MOSS: { role: 'Wooden percussion', sounds: [
      patch('marimba', 'Marimba', 'wood', 1700, .8),
      patch('kalimba', 'Kalimba', 'wood', 2800, 1.4, { ratio: 3 }),
      patch('wood', 'Wood click', 'wood', 1200, .22, { ratio: 4.1 }),
      patch('hat', 'Closed hat', 'noise', 7500, .07, { filter: 'highpass', pattern: [2,6,10,14] }),
      patch('tom', 'Low tom', 'kick', 1500, .4, { startHz: 105, pattern: [6,14] })] },
    AURA: { role: 'Environmental atmosphere', sounds: [
      patch('wind', 'Wind', 'noise', 700, 5, { ambient: true }),
      patch('water', 'Water hush', 'noise', 1300, 3.5, { ambient: true, filter: 'bandpass' }),
      patch('rustle', 'Rustle', 'noise', 2200, 2.8, { ambient: true, filter: 'bandpass' })] }
  };
  for (const bank of Object.values(banks)) {
    for (const sound of bank.sounds) if (sound.pattern) Object.freeze(sound.pattern);
    Object.freeze(bank.sounds); Object.freeze(bank);
  }
  Object.freeze(banks);
  const chords = Object.freeze([[50,53,57,60],[46,50,53,57],[53,57,60,64],[48,52,55,60]].map(Object.freeze));
  const random01 = n => { const x = Math.sin(n * 127.1 + 34.233) * 43758.5453; return x - Math.floor(x); };
  function soundFor(track) {
    const bank = banks[track.name];
    return bank.sounds.find(s => s.id === track.sound) || bank.sounds[0];
  }
  function notesFor(track, index, bar, local, seed) {
    const s = soundFor(track), chord = chords[((bar % 4) + 4) % 4];
    if (['noise','kick','drop','snare','clap'].includes(s.engine)) return [];
    if (track.name === 'ROOT') return [chord[0] - 12];
    if (track.name === 'TIDAL' || track.name === 'VEIL')
      return chord.slice(0, 3).map(n => n + (track.name === 'VEIL' ? -12 : 0));
    const pick = ((Math.floor(local * 1.73 + bar * .87 + index * 1.69 + seed * 1.11) % 4) + 4) % 4;
    return [chord[pick] + (track.name === 'MOSS' ? 0 : 12)];
  }
  function shouldTrigger(track, index, step, seed) {
    const bar = Math.floor(step / 16);
    return track.on && track.density > 0 && patternFor(track).includes(step % 16) &&
      !((track.name === 'VEIL' || track.name === 'AURA') && bar % 2 === 1) &&
      random01(index * 97 + step * 31 + seed * 191) <= track.density / 100;
  }
  function patternFor(track) { return soundFor(track).pattern || track.pattern; }
  const api = { banks, chords, random01, soundFor, notesFor, shouldTrigger, patternFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloSounds = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
