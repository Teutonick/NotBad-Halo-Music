# AI Composer acceptance evidence — 2026-10-16

## Implemented and checked

- 211 Node tests pass with the bundled Node runtime, including the existing audio, transport, world, project and Track 09 tests. New tests cover natural-language request packaging, catalog/context, exact note transactions, full composition data, repair feedback (maximum three calls), HTTP/auth/CORS error paths, byte bounds, cancellation, stale revisions, scope/preservation guards, history, rejected unknown musical features and memory-only key settings.
- The 130-entry metadata-only sample catalog exactly matches the checked-in CC0 rights manifest. No PCM is embedded in the AI registry.
- Local preview used the same `python -m http.server` loopback operation as `scripts/preview.ps1`, at `http://127.0.0.1:8766/`. PowerShell is unavailable on this Mac. A separately running preview server was reused when the port was already occupied.
- Desktop in-app Chromium, 1280×720; responsive viewport 390×844. RU and EN panels, connection form/model list, request, musical plan/diff, asynchronous local audio audition, explicit Apply, SAVE, WAV, Undo/Redo, ordinary live Play/Pause and reload were exercised. The viewport check is emulation, not physical-device evidence. The scrollable AI panel was bounded to leave transport and the default phrase HUD clear.
- Browser errors/warnings were checked during the control flow: none were recorded at that check. No claim of exhaustive all-path browser coverage.
- Endpoint/model/prompt/scope restored after reload; connection reset to disconnected and key field remained empty. A model connection is not silently restored. The temporary fixture address/model were removed from saved connection preferences after the test.

## Control task: original eight-bar New Year jingle

Codex inspected HALO's live context/capability catalog and authored an original MIDI score, harmony, bass and rhythm. `examples/ai/new-year-jingle.halo.json` is the project downloaded from HALO's SAVE action. No generator motif/ensemble was invoked for this score.

The full UI path was exercised using a **test-only loopback HTTP fixture** serving that agent-authored plan: connect → natural-language request → structured musical plan → validation → local first-phrase audio render → Apply → standard SAVE/WAV. The fixture implemented `/models` and `/chat/completions` only for this check. It is **not a live LLM, not a shipped model or requirement, and not evidence of arbitrary-prompt model quality**. A final one-note bass cadence refinement and start-position reset were applied through the browser Agent API developer tools and saved/exported again.

Music: 8 bars, 4/4, F major, 112 BPM, seven active roles. Exact notes and rests, independent bass and four-note harmony, theme/response and later variation, quieter final bar. Full details in `examples/ai/README.md`.

Actual final WAV exported through HALO:

| Measurement | Value |
| --- | --- |
| Duration | 17.142857 seconds |
| Format | 44,100 Hz, stereo, 16-bit PCM |
| Absolute peak | 0.1002197 full scale |
| RMS across both channels | 0.0190005 full scale |
| Samples at clipping threshold | 0 |

These measurements prove a non-silent, finite, bounded exported signal; they do not replace human listening or establish musical taste. The live transport visibly advanced while the phrase played; no acoustic listening is claimed.

## Scenario coverage and limits

| Requirement | Evidence / boundary |
| --- | --- |
| A: original loop | Original eight-bar control score, actual browser apply/play/save/export; provider response authored by Codex |
| B: genre / waltz | Model instructions and contract explicitly say only 4/4; unsupported-result path tested. No true 3/4 added |
| C: preserve melody | Scope validation tests; generation reads resolved current note events. Model's interpretation still requires real-model acceptance |
| D: track 6 only | Targeted edit test preserves other voices and masters; unrelated edits rejected |
| E: visuals | Scene/motion/comet operations use independent visual setter; visual-only guard tests. Orbit reordering and free geometry remain unsupported |
| F: complete song | Version-1 phrase/section structure, timing calculation and composition transaction tests. No live-model three-minute artistic result claimed |
| G: mix without notes | Explicit preservation tests; only existing EQ, sends, levels and width exposed. No audio analysis or new dynamics controls |
| H: iterative work | Applied-snapshot context plus revision-checked ten-step API Undo/Redo tested. Session-only history, four snapshots sent; no unlimited/named historical recall |

## Remaining acceptance

No real OpenRouter inference or existing local neural server was available with credentials in this session. Provider schemas/browser usage were checked against primary documentation; HTTP interaction was verified against a controlled fixture. A user-supplied compatible endpoint/model or user-entered key is still needed to evaluate live musical planning quality, token/context limits, provider billing, CORS from the deployed Pages origin and model-specific behavior.

Safari/iOS, physical input hardware, physical phones, accessibility screen readers, all scenes/fallback paths and deployed GitHub Pages were not newly exercised. Existing regression tests remain green; do not treat that as full audible/device acceptance.

## Primary integration references

- [OpenRouter browser authentication / fetch example](https://openrouter.ai/docs/guides/overview/auth/oauth)
- [OpenRouter request/response API](https://openrouter.ai/docs/api/reference/overview)
- [Ollama OpenAI-compatible API](https://docs.ollama.com/api/openai-compatibility)
- [Ollama origin configuration](https://docs.ollama.com/faq)
- [OpenAI authentication: secret keys must not be exposed in client code](https://developers.openai.com/api/reference/overview)
