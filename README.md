# HALO — Interactive Sound Universe

**Compose worlds, not timelines.**

HALO is an open-source, browser-based ambient music playground. Eight musical voices share one pulse while glowing bodies travel along different closed trajectories. You shape a soundscape by interacting with the universe—not by operating a traditional digital audio workstation.

![HALO desktop preview](screenshot.png)

## The idea

- **Music first:** gentle timbres, coherent harmony, controlled dynamics, and room to breathe.
- **Eight voices, one clock:** inspired by the immediacy of compact grooveboxes such as the OP-Z, without reproducing their interface.
- **Visual complexity, musical clarity:** trajectories, phases, trails, and particles obscure the obvious repetition without making the audio chaotic.
- **Play before configuration:** direct interaction first; technical parameters stay secondary.
- **A living instrument:** create an evolving environment, not just an animation that plays music.

## Try v0.1

Open `index.html` in a modern desktop or mobile browser, or deploy the repository using **GitHub Pages**. No installation, build, backend, account, API key, or CDN is required.

Press **Play** to enable audio (browsers require user interaction before sound can start). Headphones are recommended.

### Controls

| Action | Result |
| --- | --- |
| Play / Space | Start or pause sound |
| Tap a track / press 1–8 | Mute or unmute one voice |
| Right-click a track / long-press on touch | Edit voice type, density, and level |
| Tap a moving light | Toggle its voice in the scene |
| Orbit / Bloom / Current | Change the visual universe without changing the music |
| Evolve | Change the deterministic melodic variation |
| Tempo | Cycle between 60, 72, and 84 BPM |

## What works today

- Eight independent track settings; **five active by default**.
- Four synthesized sound families: **Bell, Pad, Bass, Pluck** (shared across the eight voices).
- One Web Audio clock with 16th-note scheduling and a four-bar harmonic loop: **Dm7 → Bbmaj7 → Fmaj7 → Cadd9**.
- Three closed-trajectory visual modes, drawn using Canvas 2D over an optional WebGL2 nebula.
- Reverb, compression, individual voice levels, density, mute/unmute, and mobile layout.
- No external requests, tracking, or downloadable assets.

**Important limitation:** track patterns currently share the same 16-step grid. Different orbit speeds are visual; independent musical polymeters, orbit-based note editing, save/share, and sophisticated sound design are future work, not existing features.

## Project files

- `index.html` — the entire runnable v0.1 prototype (HTML, CSS, JS, shaders).
- `AGENTS.md` — engineering and product guardrails for coding agents.
- `PROJECT_MAP.md` — current architecture, target structure, roadmap, and acceptance criteria.
- `screenshot.png`, `screenshot-mobile.png` — visual references.
- `LICENSE` — MIT.

## Technical direction

**Today:** zero-dependency HTML/CSS/JavaScript, Web Audio API, Canvas 2D, optional WebGL2.

**Next:** separate transport/scheduler, composition/harmony, synthesis, visuals, UI, and preset serialization into small modules. Keep the app deployable as a static site. Consider AudioWorklet, better patches, or WebGPU only when a demonstrated need justifies them.

Audio events must be scheduled from `AudioContext.currentTime`, **never from the animation frame rate**. Visual scenes are alternative representations of the same composition, not separate audio engines.

## Development roadmap

1. Stabilize the prototype and separate its core modules without changing behavior.
2. Save, load, and share reproducible eight-track universes.
3. Add direct manipulation of orbit patterns and genuine per-track rhythmic variation.
4. Improve timbres, envelopes, musical phrasing, and dynamics.
5. Create richer visual worlds with accessible mobile performance modes.
6. Add PWA/offline support, audio export, and optional MIDI capabilities.

See [PROJECT_MAP.md](PROJECT_MAP.md) for detailed milestones.

## Publishing on GitHub Pages

Push the files to a repository, then enable **Settings → Pages → Deploy from a branch → main → /(root)**. The site uses relative paths and requires no server-side component.

## Contributing

Design, audio, graphics, interaction, accessibility, and performance contributions are welcome. Please read [AGENTS.md](AGENTS.md) before changing the audio scheduler or visual architecture. Protect the core feeling: **calm to hear, fascinating to watch, immediate to play**.

## License

MIT — see [LICENSE](LICENSE).
