# WATER original electronic palette

Implemented 2026-10-25. All 32 sounds are original procedural synthesis; no downloaded audio, voice, phrase, sample pack or impulse response was added. The existing HALO synthetic noise/reverb and Web Audio oscillators are used locally. No third-party recording license is needed for this bank. Repository code licensing remains governed by the repository license; this document does not relicense other worlds’ assets.

The stylistic brief references [Basher Toe — Pasifika / E Ho Mai](https://bashertoe.bandcamp.com/album/pasifika). That release is not a sound source and its recording is not redistributed, sampled or transcribed. The palette aims at electronic bass, FM color, dry rhythmic detail and short stabs rather than AMBIENT bells/pads or REACTOR recordings. Genre-specific song structure, swing and a new motif generator are outside this change; ten WATER ensemble profiles reuse HALO’s original quantized motifs.

`src/water-sounds.js` owns data. `src/audio-water.js` owns sound construction. The common `src/audio.js` voice manages scheduled start/stop, gain envelope, role polyphony, filtering, FX and node cleanup. Live playback and WAV export share this path. No rAF/collision scheduling, network library or mandatory build step.

Each role has four presets. IDs below are engine IDs; File Bridge exposes canonical IDs without `water-` in its generated catalog.

| Role | Presets |
| --- | --- |
| Pulse | Tidal kick; Rubber kick; Sub knock; Broken kick |
| Accent | Salt clap; Rim crack; Digital snare; Hollow rim |
| Percussion | Foam hat; Glass tick; Shard shaker; Titanium ride |
| Texture | Grain spray; Circuit dust; Bubble code; Broken radio |
| Bass | Elastic sub; Reef reese; Hollow bass; Acid current |
| Melody | Prism stab; Liquid FM; Chopped vowel; Phase reed |
| Arpeggio | Ripple sequence; Copper arpeggio; Digital marimba; Trance pulse |
| Harmony | Lagoon chord; Dub stab; Spectral organ; Tape halo |

Kick pitch sweep, FM ratio/index, oscillator detuning, filtered noise and decay distinguish variants. These are descriptive timbre names, not sampled acoustic instruments, actual vocals or a granular sampler. Existing Character, Duration, Space, levels, delay and chorus remain available. Native initial state is 120 BPM / four bars, eight role-compatible defaults. GENERATE selects within WATER affinities. Original scores and separate musical worlds are preserved.
