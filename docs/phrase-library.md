# Local phrase library / Локальная библиотека фраз

Implemented generator version **2**, 2026-10-13. Source: `src/phrases.js`; patch resolution and integration: `src/sounds.js`. This is an original rule-based musical generator, not a trained neural model. It requires no account, API, model download, runtime dependency, CDN or backend. Classic relative scripts work with the existing zero-build GitHub Pages deployment.

## What is generated / Что генерируется

Each musical role has **ten original motif families**, with separate rhythmic hit groups and, for pitched instruments, chord-degree contours. There are 14 roles / 140 family definitions. All 30 AMBIENT patches and all 32 REACTOR presets resolve to a role through their actual engine/articulation, not their orbit number. Closely related timbres share the musical family library; they are not 62 separate libraries. Percussion families describe hit patterns rather than pitched melodies.

The seed selects one of ten ensembles for the active world, a shared four-chord minor-key progression, and a motif per voice. Four-bar endings introduce a fill or rest and melodic resolution. Eight bars add a related answering rhythm, change the contour and resolve the harmony on bar eight. Successive groups of seeds select further family combinations. Motifs are original examples of common musical techniques, not transcriptions of identifiable songs or artist performances.

«СОЗДАТЬ» выбирает ансамбль, гармонию и мотивы, а также сохраняет ранее реализованный выбор тембра и параметров в пределах 20–100%. Новая композиция повторяется до следующего создания или изменения через АВТО РИСУНКА. АВТО ТОНАЛЬНОСТИ остаётся независимым. Восемь тактов — развитие первой четырёхтактовой фразы, а не простое удвоение. При положительной плотности генератор оставляет хотя бы одно событие для дорожки за фразу; плотность 0 и выключение сохраняют тишину.

## Musical roles / Музыкальные роли

| Role | Patches and behavior | Instrument constraints |
| --- | --- | --- |
| accent | AMBIENT bells/vibes/crystal | Chord-tone accents, higher register, deliberate gaps |
| bed | AMBIENT pads/organs/veil | Three-note voicings, breathing room between bars; VEIL retains a lower voicing on any orbit |
| bass | AMBIENT bass and REACTOR electric bass | One note per event; bass/chord movement, independent rhythm; sampled bass folds to MIDI 26–45 |
| pluck | AMBIENT string/harp/pluck | Arpeggiated chord contours and short groups |
| rhythm | AMBIENT shaker/brush | Unpitched, sparse rhythmic accompaniment |
| texture | AMBIENT wind/water/rustle | Unpitched, slow entries and long spaces |
| wood | AMBIENT marimba/kalimba/wood click | Pitched chord-tone figures in a middle register |
| kick | Both worlds' kicks and AMBIENT Drops | Unpitched anchor patterns and syncopation |
| snare | AMBIENT snare/clap and REACTOR snare | Backbeats, half-time and ghost/fill positions |
| metal | Both worlds' hats and REACTOR ride/crash | Eighth/offbeat/irregular patterns; crash remains sparse but is not restricted to one bar |
| tom | AMBIENT Low tom and REACTOR toms | Distributed hits and phrase endings; articulation remains the chosen tom recording/patch |
| riff | REACTOR rhythm guitars | Two-note figures following chord contours; independent of bass timing; fifth is quantized to the active scale |
| lead | REACTOR lead guitars | Melodic contours, answers and occasional register lift; sampled pitches stay in MIDI 50–89 |
| keys | REACTOR piano/synth presets | Ostinato, arpeggio and occasional chord voicing; sample transposition is bounded |

All generated pitched notes stay in the active minor scale. Octave folding keeps the sampled instruments near their recorded roots: the tests check every articulation and key against the imported sample inventory. Riffs can use a diminished fifth where required by the scale; not every attack is a plain perfect-fifth power chord. Guitar tails still follow the actual recording and smoothly release on the next attack. There are no new recorded articulations, guitar slides or bends.

## Ensembles / Ансамбли

Each row is an ensemble profile with its own chord-degree order and family preference. Profiles are compatible with any same-world instrument assignment; choosing a profile does not forcibly mute a track or require the default eight-instrument layout.

| AMBIENT | REACTOR |
| --- | --- |
| Still water / Тихая вода | Arena pulse / Пульс арены |
| Open sky / Открытое небо | Half time / Половинный ритм |
| Slow tide / Медленный прилив | Driving eighths / Напористые восьмые |
| Glass garden / Стеклянный сад | Piano engine / Фортепианный двигатель |
| Warm current / Тёплое течение | Broken groove / Ломаный грув |
| Woodland / Лес | Octave motor / Октавный мотор |
| Night air / Ночной воздух | Rising room / Нарастание |
| Distant lights / Далёкие огни | Sparse heavy / Тяжёлые паузы |
| Soft pulse / Мягкий пульс | Melodic drive / Мелодичный драйв |
| Floating room / Парящая комната | Final answer / Финальный ответ |

The instrument editor displays the current ensemble and motif. They are selected by the seed, not by a new permanent mixer/control panel. They share harmony, phrasing and accent rules; this does not guarantee that every randomly chosen combination will meet listening preferences.

## Instrument/orbit and combination matrices / Матрицы

`HaloPhrases.matrix` contains **two 8×8 matrices**, one per world. Every instrument-bank/orbit pair is allowed. `native` identifies the old default assignment; `alternative` is equally valid. The editor's instrument selector changes the bank on the chosen orbit, then offers that bank's existing presets. Orbit ID, color, motion, mute and manually edited timing remain independent of instrument identity.

`HaloPhrases.roleMatrix` is a **14×14 symmetric combination matrix**:

| Pair | Relation | Applied behavior |
| --- | --- | --- |
| Same role | Layer / Слой | Share candidate activity and gain headroom; long voices distribute entries across bars |
| Pitched + unpitched | Support / Поддержка | Shared pulse, harmony for the pitched voice, role-specific accompaniment |
| Different pitched roles, or different unpitched roles | Contrast / Контраст | Independent motifs under the common ensemble; no obligatory bass/riff unison |

No combination is forbidden. For `n` voices of the same role, each gets a derived gain multiplier `1 / sqrt(n)` and a separate lane within the motif activity. This does not rewrite the user's level slider or mute state. The arrangement counts muted voices too, so toggling mute cannot unexpectedly change other voices' notes, timing or gain. Kick and bass stay near the stereo center even when moved to another orbit; other voices retain the orbit's stereo position scaled by stage width.

В редакторе можно выбрать любой из восьми банков текущего мира для любой орбиты, включая повторение одного инструмента несколько раз. Музыкальная роль определяется выбранным звуком, а не номером орбиты. Повторяющиеся роли делят плотность и запас по уровню; запретов и принудительного выключения нет. Смешивание банков AMBIENT и REACTOR внутри одной композиции пока не реализовано: каждый мир сохраняет свой набор инструментов и композицию.

## Persistence and scheduling / Сохранение и время

- Portable project format stays version 1 with optional allowlisted per-track `instrument` and `generator` fields. Generator 2's catalog/rules are versioned; future algorithm changes must use another generator version rather than silently rewriting saved music.
- Old files without those fields restore `instrument = orbit ID` and `generator = 1`, retaining legacy notes and rhythm. GENERATE explicitly switches voices to generator 2; choosing another instrument enables generator 2 for that voice. Existing exact steps remain authoritative until GENERATE clears them.
- Local phrase-step saves also retain instrument and generator identifiers. The editor changes timing, not individual note pitches. Added manual hits inherit the current motif's note at that musical position.
- Seed, sound, assignment, generator version, phrase length and key reproduce the notes; the same derived arrangement is used in live scheduling, previews, autosaves and offline WAV/conditional MP3 export.
- Scheduling remains on the common 16th-note Web Audio clock. IN TIME uses the complete 64/128-step cycle; PHRASE markers preview the same candidate/firing rules. Visual animation never schedules sound.
- Motif caches are bounded; there are no additional audio nodes per motif, background model workers or remote requests.

## Verification / Проверка

Automated checks cover all patches, both worlds, every instrument/orbit pairing, every key, 4/8-bar development, note diversity with unchanged timbres, sample range coverage, duplicate-role headroom, positive/zero density, mute independence, legacy restore, project/local save bounds, relocated editor controls, live scheduler wiring and offline note/velocity parity. These establish source contracts, not audible quality or physical-device performance. Fresh browser, actual audio rendering/listening and Safari/iOS acceptance are separate checks; record their outcomes in `PROJECT_MAP.md`.
