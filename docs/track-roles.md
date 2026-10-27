# Fixed roles / Фиксированные роли

Current update (2026-10-27): AMBIENT retains generator 3. New WATER/REACTOR GENERATE uses independent generator 4; saved 1–3 material remains unchanged. See [world-specific generation](world-generation.md) for profiles, musical rules, persistence and validation limits. The historical contracts below continue to describe generators 2/3.

Implemented 2026-10-13: generator 3, `src/roles.js`. Eight physical slots retain their IDs and geometry. A role controls timing, register, articulation and live voice budget; a preset supplies timbre and engine. Existing 140 motif families and 20 ensembles remain in `src/phrases.js` without changing generator-2 results.

| Slot | Role | AMBIENT default | REACTOR default | Concurrent note budget |
| --- | --- | --- | --- | --- |
| 1 | Pulse / Пульс | Soft pulse | Dry kick | 2, one note per hit |
| 2 | Accent / Акцент | Wooden click | Dry snare | 2 |
| 3 | Percussion / Перкуссия | Shaker | Tight hi-hat | 2 |
| 4 | Texture / Текстура | Wind | Floor tom | 2; long layers permitted |
| 5 | Bass / Бас | Round bass | Pick bass | 1 |
| 6 | Melody / Мелодия | Bell | Palm guitar | 3 |
| 7 | Arpeggio / Арпеджио | String pluck | Analog arpeggio | 1 |
| 8 | Harmony / Гармония | Air pad | Attack piano | 4 |

These are HALO policies, inspired by the [OP-Z track roles](https://teenage.engineering/guides/op-z/tracks) and [track timing](https://teenage.engineering/guides/op-z/track), not copied engines, interface or samples. Melody's cap does not force every event to be a triad. Texture extends the short-sample concept. Legacy generator-1/2 audio keeps its existing event policies.

## Selection matrix

`playback` metadata on each preset declares engine, pitched status, compatible roles, affinity roles and range. `HaloSounds.availableBanks/availableSounds` filters the manual picker; `roles.pool(..., true)` filters GENERATE. Both stay within the active world's bank. Compatibility permits experimentation; affinity selects characteristic instruments for each role/world. Adding a preset requires declaring or deriving metadata, without rewriting the scheduler.

- Sampled drums: first four roles. Sampled pitched bass/guitar/keys: first four as short shots or Texture, plus melodic roles with role-specific range and articulation.
- Procedural pads: Texture and melodic roles. Procedural bass: Pulse, Texture and melodic roles.
- Procedural bells/plucks/wood: Accent, Percussion, Texture and melodic roles. Ambient noise: Texture; other percussion engines: first four.
- Affinity: kick → Pulse; snare/clap → Accent; hats/shaker → Percussion; tom/drone/ambient noise → Texture (some also Accent/Harmony); bass → Bass; guitar → Melody; piano → Melody/Harmony; synth → Bass/Arpeggio; bell/pluck/wood → Melody/Arpeggio, with click → Accent.

Source predicates are authoritative for exceptions. GEN excludes the current preset where alternatives exist, changes five tuning parameters within 20–100%, and preserves mute and cycle settings. Manual selection can choose outside affinity, but must remain compatible. Existing sounds are unchanged; 30 procedural and 32 CC0 sample presets, no new library assets.

## Clock and persistence

Each cycle has `length` 4–32, `stepLength` 1/2/4 sixteenths and `offset` 0…length−1. Defaults are 16/1/0. A motif spans 4/8 local bars: period = bars × length × stepLength, maximum 1024 global steps. Changing length remaps the motif into local steps; offset advances its local phase. Arpeggio follows seeded contours one note at a time. Shared harmony follows the global bar even when local rhythms drift.

Audio scheduling, PHRASE preview and offline export use absolute transport steps. Manual edited steps override cycles and disable cycle controls until GENERATE clears them. Pause/resume preserves position. `startStep` stores the current global phrase boundary; portable format remains version 1 with optional generator-3 role, sequence and exact-mode metadata. Bounds and incompatible presets are rejected. Old generator-1/2 files retain their prior sounds and logic, with no leftover generator-3 sequence metadata after restoration.

The renderer exports the selected 4/8 global bars with warmup; independent cycles can make its endpoints differ. It is a phrase excerpt, not a guaranteed seamless polymetric loop. No per-note pitch editor or arbitrary engines imported into tracks.

## Validation and limits

Pure/fake-audio tests cover all roles and compatible presets, all keys, range/arity, randomization bounds, 7/9-step periods, negative warmup, manual overrides, voice stealing/cleanup, serialization and live/export parity. They do not establish listening quality, physical-device performance or visual layout. Fresh localhost navigation timed out even after an escalated preview launch; desktop/mobile visual and audible acceptance remain outstanding. All scripts/assets use local relative paths, supporting zero-build static GitHub Pages deployment.
