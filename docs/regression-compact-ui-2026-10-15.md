# Compact UI regression — 2026-10-15

- Full Node suite: 186 passed, zero failures/skips. Includes phrase-owned audio/restart, PITCH live/offline, input cleanup, all eight core roles, preferences and floating-window contracts.
- Chromium in-app browser, isolated localhost:18767 origin: universal folding on Instruments, Composition and Track 09; LOOP/SLICE/PITCH compact state; expanded advanced settings; reload persistence; RU/EN localization; latency mouse drag 40→44 ms and value retained across reload; input-window keyboard movement and close; transport remains playing after folding. Console error/warning log empty.
- Default desktop viewport and 390×844 mobile viewport checked. Narrow layouts scroll vertically; viewport override reset afterwards. No user origin storage reset or live hardware permission requested.
- `git diff --check` clean. Relative classic scripts, no dependencies or new assets; static GitHub Pages path retained.
- Not established by these checks: audible quality, actual recording/monitoring latency, physical audio-interface operation, Safari/iOS and real touch hardware. Audio scheduler and capture engine are unchanged by this UI patch.

## Follow-up visual refinement

Verified at 835×904: frameless right-edge actions work; one Track 09 action survives LOOP/SLICE/PITCH rebuilds and is hidden on Instruments; all four sound slider tracks align on the same Y coordinate. PITCH octave and actions occupy one compact row. Thin styled scrollbar replaces the native arrow controls. Input label updated in RU/EN. No audio processing changes.
