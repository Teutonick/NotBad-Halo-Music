# World-specific generation / Генерация по мирам

Implemented 2026-10-27. `src/world-phrases.js` owns generator **4** for new WATER/REACTOR generations. AMBIENT keeps generator **3**, its original library, parameter corridors, cycle selection and arrangement rules. `src/phrases.js` remains unchanged; generators 1–3 retain their previous results in all worlds. Existing workspace defaults also remain unchanged until GENERATE is pressed.

## Musical direction

| World | Rhythm and development | Harmony and sound selection |
| --- | --- | --- |
| WATER | Five coordinated groove families: house, garage, broken beat, stutter and dub. Offbeat/syncopated sub bass, repeating chord-tone hooks and alternate-bar arpeggio replies. A shortened kick bar leaves room for a bounded snare/hat fill at the phrase end; eight bars also answer at bar four. | Ten profiles with separate major/minor progressions and seventh, ninth or suspended voicings. Electronic bass, FM/stab/vowel hooks, arpeggios, chords and occasional handpan remain native to WATER. |
| REACTOR | Five light pop-rock grooves. Kick and root-led electric bass share rhythmic anchors; snare backbeat, restrained hats, rhythm-guitar strokes, piano support and alternate-bar lead/arp replies. Toms occur only at phrase boundaries when enabled. | Ten profiles with separate major/minor progressions, triads with doubled roots or add9 voicings. The core roles select kick, snare, cymbals, toms, electric bass, palm-muted/dry-crunch rhythm guitar and piano; the arpeggio role can use compatible sampled lead guitar or analog synth. Weights favor picked/muted bass and tight drums. GENERATE excludes high gain, fuzz, feedback, war toms, heavy/layered snares and crash cymbals; manual selection still permits them. |

WATER reference directions were supplied by the user: Ian Asher / DANNY “Take Me”, 2D.NAME “Shoom”, and Andrey Bugrov “Sliding”. These are creative references, not transcriptions or claims of measured similarity. Artist/publisher context: [Ian Asher](https://www.insomniac.com/music/artists/ian-asher/), [2D.NAME — SHOOM](https://2dname.bandcamp.com/track/shoom), [Andrey Bugrov catalog](https://music.apple.com/us/artist/andrey-bugrov/668781947). All patterns, contours and arrangements in this implementation are original code/data; no reference audio, lyrics, melodies or assets were imported. No claim of acoustic reference analysis is made.

Each world has ten bilingual profiles. Profiles coordinate the groove, harmonic roots, chord voicing, hook contour, timbre weights and optional voices. This is a bounded phrase generator, not a genre classifier or a full song imitation system. Existing Build Composition develops the generated phrase using the same version and material.

## Clock, dynamics and controls

- Eight fixed roles remain pulse/accent/percussion/texture/bass/melody/arpeggio/harmony. GENERATE enables six voices: pulse, accent, bass and melody plus two profile-selected voices. Disabled voices still receive compatible sounds/settings for later manual activation.
- New cycles are one bar long, `stepLength:1`, `offset:0`: 16 cells for 4/4 or 12 for 3/4. Manual 4–32-cell cycles, divisions 1/2/4 and offsets remain available. Editing a sound or cycle preserves generator 4.
- Triple meter uses authored 12-step patterns. Four-bar 3/4 has a three-beat feel; eight-bar 3/4 uses a six-step compound grouping. No off-grid swing or microtiming is introduced.
- The same absolute audio-clock steps drive playback, PHRASE preview, score materialization and offline export. World motion does not schedule notes. Manual odd cycles can extend beyond the phrase and are not guaranteed to make seamless phrase exports.
- Density zero and mute remain silent. At density ≥35, authored pulse hits and primary backbeats are retained; extra accents/hat details can thin out. Manual exact steps bypass density and cycles, including intentionally empty steps.
- New world parameter corridors are restrained, with no AMBIENT-style wildcard excursions. Low voices have at most 8% reverb and no delay/chorus. REACTOR drum delays/chorus stay off; pitched delay ≤14%, chorus ≤10%. WATER pitched delay ≤26%, chorus ≤18%; drum delay ≤8%, chorus off. Master gain/limiter and synthesis engines are unchanged.
- GENERATE preserves BPM, key/mode, meter, phrase length, master settings and transport position. It replaces manual steps/notes, native timbres, track parameters, active voices and FX in the current phrase. Linked repeats share that phrase. Existing Track 09 re-grooving remains unchanged and preserves the source recording/root/trim.

## Persistence and API

Portable projects, compositions and autosaves remain format version 1. The existing track `generator` enum now permits **4** only in WATER/REACTOR. Its `role`, `sequence`, `exact`, `startStep` and note fields use the generator-3 contract. No new editable parameter, operation, dependency, sample or schema envelope is introduced. Unknown generator values still fail validation. Older app versions that do not support generator 4 cannot import its projects.

WebMCP capabilities publish `generators.supported`, `generators.create`, the two profile catalogs and retention policy. `track.patch` treats explicit steps/notes on generator 4 exactly like generator 3: exact mode, bounded notes and role validation. File Bridge score syntax stays unchanged; generated notes can be materialized for its score export. Existing approval, revision and conflict checks remain authoritative.

Сохранённые партии не переводятся на новую версию автоматически. СОЗДАТЬ обновляет только текущую фразу WATER/REACTOR; AMBIENT и другие сохранённые фразы сохраняют прежние правила. В новой версии шесть активных голосов, собственные грувы и гармонии каждого мира, тактовая опора, ответы и сбивки. Все ручные настройки и партитуры продолжают сохраняться локально.

## Validation limits

Unit tests compare pre-change generator-2/3 event hashes in all worlds and exercise new generation across 24 keys, meters, phrase lengths, note bounds, density, persistence, agent history, absolute-clock preview and offline scheduling. Browser/audio rendering coverage is recorded in `release-validation.md`. These checks do not establish listening acceptance, reference similarity or physical-device support.
