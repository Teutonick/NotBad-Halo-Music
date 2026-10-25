# WATER original electronic palette

Implemented 2026-10-25. The palette now has 34 presets: 32 original procedural electronic voices and two presets built from real CC0 handpan recordings. The existing HALO synthetic noise/reverb and Web Audio oscillators are used locally. The recorded handpan uses the verified FreePats CC0 1.0 dedication; evidence and a pinned source revision are retained locally. Repository code licensing remains governed by the repository license; this document does not relicense other worlds’ assets.

The stylistic brief references [Basher Toe — Pasifika / E Ho Mai](https://bashertoe.bandcamp.com/album/pasifika). That release is not a sound source and its recording is not redistributed, sampled or transcribed. The palette aims at electronic bass, FM color, dry rhythmic detail and short stabs rather than AMBIENT bells/pads or REACTOR recordings. Genre-specific song structure, swing and a new motif generator are outside this change; ten WATER ensemble profiles reuse HALO’s original quantized motifs.

`src/water-sounds.js` owns data. `src/audio-water.js` owns sound construction. The common `src/audio.js` voice manages scheduled start/stop, gain envelope, role polyphony, filtering, FX and node cleanup. Live playback and WAV export share this path. No rAF/collision scheduling, network library or mandatory build step.

Each role has four electronic presets; the melody family additionally contains two recorded handpan presets. IDs below are engine IDs; File Bridge exposes canonical IDs without `water-` in its generated catalog.

| Role | Presets |
| --- | --- |
| Pulse | Tidal kick; Rubber kick; Sub knock; Broken kick |
| Accent | Salt clap; Rim crack; Digital snare; Hollow rim |
| Percussion | Foam hat; Glass tick; Shard shaker; Titanium ride |
| Texture | Grain spray; Circuit dust; Bubble code; Broken radio |
| Bass | Elastic sub; Reef reese; Hollow bass; Acid current |
| Melody | Prism stab; Liquid FM; Chopped vowel; Phase reed; Handpan natural; Handpan dry |
| Arpeggio | Ripple sequence; Copper arpeggio; Digital marimba; Trance pulse |
| Harmony | Lagoon chord; Dub stab; Spectral organ; Tape halo |

Kick pitch sweep, FM ratio/index, oscillator detuning, filtered noise and decay distinguish variants. The 32 electronic names describe synthesis, not actual vocals or a granular sampler; Handpan natural/dry instead use recorded acoustic strikes. Existing Character, Duration, Space, levels, delay and chorus remain available. Native initial state is 120 BPM / four bars, eight role-compatible defaults including handpan on the arpeggio slot in newly initialized WATER workspaces. Existing saved scores retain their selected timbres. GENERATE selects within WATER affinities. Original scores and separate musical worlds are preserved.

## Revised body and natural contrast — 2026-10-25

Kick: fast two-stage pitch drop, low body and short high-passed contact transient. Accent: stronger body and separately decaying noise. Bass: clean 32–65 Hz mono sub plus a separate saturated FM/detuned-saw mid band, high-passed at 120 Hz; a bounded lowpass sweep gives each variant a distinct wobble rate. Rates are .5/1/2/4 cycles per quarter-note beat, set from audio BPM when a note starts. Current tempo changes affect subsequent note starts. The bass envelope holds 80% of peak until 65% of duration, then releases; changing it does not raise master gain. Live and offline use the same graph. The full voice, its modulators and filters share bounded cleanup and role polyphony.

Recorded source: [FreePats Hang in D minor](https://freepats.zenvoid.org/ChromaticPercussion/hang.html), revision `fdeca2ec981ab374607f250bccb1452b531ac13a`. Mar performed; Gonzalo and Roberto recorded it at Medialab-Prado in July 2017; Roberto edited the recordings. Eighteen real strikes (two takes at nine original pitches), mono 32 kHz PCM16, capped at 3.4 seconds, high-pass 25 Hz, peak 0.8 and 20 ms tail fade. No voice cloning or resynthesis. `assets/water/handpan-manifest.json` records every source URL, source/output hash, root, local file and processing step; license/README evidence is in `assets/water/rights/`. Reproducible importer: `scripts/import-water-handpan.py`. No upstream picture is included.

The native recorded notes are A3, D4, E4, F4, G4, A4, B-flat4, C5, D5 (MIDI 57/62/64/65/67/69/70/72/74). D minor is the most natural register/key. Existing sampler pitch shifting supports other keys and preserves authored pitches, but the instrument’s fixed background resonances can acquire a different color; upstream specifically warns about this. This is not a physically retuned handpan. Playback folds by octave into MIDI 57–74 under existing role policy. Compatible roles: accent, percussion, texture, melody, arpeggio, harmony; not pulse/bass. Both presets use the same recordings, with different brightness/decay.

The handpan classic-script pack is about 4.3 MiB, served locally under file:// or a GitHub Pages repository prefix. Preparation loads only requested packs, caches incremental decodes per AudioContext, retains previously prepared banks and limits decoding to four buffers at once. Live WATER preparation includes its native recorded bank so GENERATE cannot select an unready recording; REACTOR preparation preserves readiness of all its native banks. Offline export prepares only banks actually used by the score. Missing/failed recordings do not fall back to synthesis.
