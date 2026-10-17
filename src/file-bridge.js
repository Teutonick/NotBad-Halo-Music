/* HALO File Bridge for desktop Chrome/Edge via native File System Access API. Zero server, 100% static. */
(function(root){
  'use strict';
  const bridges = new WeakMap();

  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function generateCapabilities(caps){
    return {
      schemaVersion: 1,
      engine: 'NotBad Halo Music Constructor',
      version: caps.version || 2,
      transport: 'Desktop Chrome/Edge File System Access API (HALO File Bridge) and WebMCP Site Tools',
      limits: caps.limits,
      operations: [
        {
          op: 'track.patch',
          description: 'Update specific parameters, steps, and notes of a voice slot (0..7)',
          required: ['op', 'trackIndex', 'values'],
          optional: ['phraseId (required in multi-phrase compositions)'],
          allowedValues: caps.trackFields
        },
        {
          op: 'phrase.patch',
          description: 'Update phrase properties: bars, startStep, seed, key, liveLoop',
          required: ['op', 'values'],
          allowedValues: caps.phraseFields
        },
        {
          op: 'master.patch',
          description: 'Update master tempo (30..200 BPM), volume (0..100%), 3-band EQ (-9..9 dB) and stereo width (0..100%)',
          required: ['op', 'values'],
          allowedValues: caps.masterFields
        },
        {
          op: 'project.replace',
          description: 'Replace the entire single-phrase project snapshot',
          required: ['op', 'project']
        },
        {
          op: 'composition.replace',
          description: 'Replace the entire multi-phrase song structure',
          required: ['op', 'project']
        },
        {
          op: 'visual.patch',
          description: 'Update visual scene (ORBIT/BLOOM/CURRENT), motion (DRIFT/IN TIME/PHRASE), effects (CLASSIC/COSMIC/HYPER)',
          required: ['op', 'values']
        }
      ],
      trackFields: caps.trackFields,
      phraseFields: caps.phraseFields,
      masterFields: caps.masterFields,
      parameters: caps.parameters,
      visuals: caps.visuals,
      track09: caps.track09,
      composition: caps.composition
    };
  }

  function generateInstruments(caps){
    function findCompatible(catalog, worldName) {
      if (!catalog) return [];
      const res = [];
      for (const [slotKey, bank] of Object.entries(catalog)) {
        for (const s of (bank.sounds || [])) {
          res.push({
            world: worldName,
            instrument: slotKey,
            sound: s.id,
            name: s.name,
            compatibleRoles: s.playback?.compatibleRoles || [],
            affinityRoles: s.playback?.affinityRoles || [],
            noteRange: s.playback?.range || [24, 96]
          });
        }
      }
      return res;
    }

    const allSounds = [
      ...findCompatible(caps.catalog?.ambient, 'ambient'),
      ...findCompatible(caps.catalog?.reactor, 'reactor')
    ];

    const roles = (caps.roles || []).map((r, i) => ({
      trackIndex: i,
      slot: r.slot,
      role: r.id,
      name: r.label,
      description: r.description,
      policy: r.policy,
      noteRange: { minMidi: r.minMidi || 24, maxMidi: r.maxMidi || 96 },
      allowedBanks: ['ambient', 'reactor'],
      compatibleSounds: allSounds
        .filter(s => s.compatibleRoles.includes(r.id))
        .map(s => ({
          world: s.world,
          instrument: s.instrument,
          sound: s.sound,
          name: s.name,
          affinity: s.affinityRoles.includes(r.id),
          noteRange: { minMidi: s.noteRange[0], maxMidi: s.noteRange[1] }
        }))
    }));

    const parameterGlossary = {
      character: {
        range: [0, 100],
        musicalMeaning: {
          melodic_and_bells: 'Controls spectral brightness, overtone richness and chime brilliance (higher = brighter crystalline chime; lower = soft mellow fundamental)',
          bass_and_sub: 'Controls harmonic saturation, drive and warmth (higher = warm saturated growl; lower = pure sub fundamental pulse)',
          percussion_and_drums: 'Controls transient snap, click bite, and attack sharpness (higher = punchy attack; lower = soft thud)',
          pads_and_strings: 'Controls filter resonance and high-frequency presence'
        }
      },
      duration: {
        range: [0, 100],
        musicalMeaning: 'Voice envelope release / decay time (0 = short staccato or muted pluck, 100 = sustained ringing tails and ambient washes). Bounded by role acoustic policy.'
      },
      space: {
        range: [0, 100],
        musicalMeaning: 'Send level into shared 2.8s convolution reverb bus for depth, distance, and cosmic wash.'
      },
      delay: {
        range: [0, 100],
        musicalMeaning: 'Send level into BPM-synchronized stereo feedback delay.'
      },
      delayTime: {
        options: ['1/16', '1/8', '1/8d', '1/4'],
        musicalMeaning: 'Delay tap division. 1/8d provides dotted-eighth polyrhythmic groove; 1/16 gives tight slapback; 1/8 and 1/4 create spacious echoes.'
      },
      chorus: {
        range: [0, 100],
        musicalMeaning: 'Stereo chorus modulation send for shimmering pitch detuning and width expansion.'
      },
      level: {
        range: [0, 100],
        musicalMeaning: 'Individual voice gain level (0..100%).'
      },
      density: {
        range: [0, 100],
        musicalMeaning: 'Algorithmic note probability for procedural generation. Bypassed when exact=true.'
      }
    };

    return {
      schemaVersion: 1,
      description: 'HALO Voice and Instrument Registry. 8 simultaneous voices with assigned musical roles, compatible banks, note registers, and sonic parameter meanings.',
      tracks: roles,
      parameterGlossary,
      soundWorlds: {
        ambient: {
          description: '30 procedural synthesis patches designed for meditative, calming soundscapes.',
          catalog: caps.catalog?.ambient || {}
        },
        reactor: {
          description: '32 organic presets backed by 130 authentic CC0 acoustic/electric instrument recordings.',
          catalog: caps.catalog?.reactor || {}
        }
      }
    };
  }

  function generateMusicRules(caps){
    return {
      schemaVersion: 1,
      description: 'HALO Musical Rules, Transport, Time Signatures, Rhythmic Grid, and Harmony Guidelines.',
      timeSignature: '4/4',
      supportedTimeSignatures: ['4/4', '3/4'],
      timeSignatures: {
        '4/4': {
          meter: '4/4 Common Time',
          stepsPerBar: 16,
          phraseSteps: { 4: 64, 8: 128 },
          quarterNotes: [0, 4, 8, 12],
          eighthNotes: [0, 2, 4, 6, 8, 10, 12, 14],
          description: 'Standard quadruple meter with 4 quarter-note beats of 4 sixteenths each.'
        },
        '3/4': {
          meter: '3/4 Waltz / 6/8 Swing',
          stepsPerBar: 12,
          phraseSteps: { 4: 48, 8: 96 },
          waltz4Bars: {
            bars: 4,
            steps: 48,
            downbeats: [0, 4, 8],
            orchestration: 'Boom - Chak - Chak: kick & bass on downbeat (step 0), snare, keys & chords on afterbeats (steps 4 & 8)',
            feel: 'Graceful 3/4 waltz (ONE-two-three, ONE-two-three)',
            accents: { downbeat: { steps: [0], velocity: 0.88 }, afterbeats: { steps: [4, 8], velocity: 0.78 } }
          },
          swing8Bars: {
            bars: 8,
            steps: 96,
            compoundBeats: [0, 6],
            eighthNotes: [0, 2, 4, 6, 8, 10],
            orchestration: 'Hans Zimmer / compound pirate groove: two compound beats (steps 0 and 6), heavy backbeat on 6, rolling eighths, dactylic gallop riffs [0, 3, 4, 6, 9, 10]',
            feel: 'Compound 6/8 rocking pirate swing (ONE-two-three, TWO-two-three)',
            accents: { compoundBeat: { steps: [0], velocity: 0.90 }, compoundBackbeat: { steps: [6], velocity: 0.86 } }
          },
          description: '12 sixteenth steps per bar. In 4 bars, forms a 3/4 waltz; in 8 bars, forms a rocking 6/8 pirate swing.'
        }
      },
      tempo: { min: 30, max: 200, default: 72 },
      grid: {
        stepsPerBar: 16,
        stepDuration: '1 sixteenth note (1/16)',
        quarterNotes: [0, 4, 8, 12],
        eighthNotes: [0, 2, 4, 6, 8, 10, 12, 14],
        sixteenthNotes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        rests: 'A rest or pause is created simply by omitting the step index from the "steps" array.'
      },
      phraseLengths: {
        allowedBars: [4, 8],
        stepsIn4Bars: 64,
        stepsIn8Bars: 128,
        maxSongBars: 128
      },
      keysAndScales: {
        circleOfFifths: caps.harmony?.keys || [],
        scales: caps.harmony?.scales || {
          minor: [0, 2, 3, 5, 7, 8, 10],
          major: [0, 2, 4, 5, 7, 9, 11]
        }
      },
      compositionGuidelines: {
        generatorMode: 'Set "generator": 3 and "exact": true for deterministic manual note scheduling.',
        stepsAndNoteEvents: 'The "steps" array contains the integer step indices where notes trigger (0..bars*16-1). The "noteEvents" array contains objects "{ step: N, notes: [MIDI...] }". Every step with pitched notes must match an entry in "steps".',
        noteTranspose: 'Set "noteTranspose" to the key\'s offset (from harmony.keys[key].offset) so that noteEvents MIDI numbers are played as literal pitches.',
        rolePolyphonyConstraints: {
          bass: 'Mono: maximum 1 note per step (MIDI 24..60)',
          lead: 'Mono or duo: 1 to 2 notes per step (MIDI 48..96)',
          harmony: 'Polyphonic: up to 4 notes per step (MIDI 36..84)',
          arpeggio: 'Mono: 1 note per step, fast and short (MIDI 48..84)',
          pulse_and_percussion: 'Rhythmic: empty notes array "notes: []" triggers the percussive timbre'
        }
      },
      soundWorlds: {
        ambient: {
          vibe: 'Meditative, calming, ethereal, cosmic relaxation',
          engine: '100% procedural real-time Web Audio synthesis (pure sines, FM, soft filters, cosmic pink noise)',
          defaultTempo: 72,
          tempoRange: [60, 85],
          reverbSpace: 'Spacious 2.8s convolution reverb send (30..80%)',
          defaultVoices: ['GLASS (celestial bells)', 'TIDAL (soft atmosphere)', 'ROOT (sub frequencies)', 'EMBER (warm plucks)', 'RAIN (light rhythm)', 'VEIL (velvet strings)', 'MOSS (slow marimba)', 'AURA (environmental atmosphere)']
        },
        reactor: {
          vibe: 'Driving, energetic, organic rock & acoustic rhythm',
          engine: '32 organic presets backed by 130 authentic CC0 acoustic and electric instrument recordings',
          defaultTempo: 100,
          tempoRange: [90, 140],
          reverbSpace: 'Punchy, focused mix with moderate reverb (10..30%)',
          defaultVoices: ['BEAT (kick/snare punch)', 'BASS (overdriven rock bass)', 'KEYS (acoustic piano/Rhodes)', 'CHORD (palm-muted guitar)', 'RIFF (electric lead)', 'LEAD (synth lead/brass)', 'PERC (cymbals/percussion)', 'TEXTURE (ambient guitar wash/sub)']
        },
        switchingPolicy: 'Set "setup": "ambient" or "setup": "reactor" in project.replace or in every phrase of composition.replace. All phrases within a composition must share the same sound world. Instruments can be freely assigned from any bank to any track, but the overall acoustic environment and default styling are governed by setup.'
      },
      songFormAndComposition: {
        defaultMode: 'single_phrase',
        policy: 'HALO works with individual 4/8-bar phrases by default unless a full composition/song is explicitly requested ("песня", "полная композиция", "аранжировка").',
        limits: {
          maxPhrases: 15,
          maxSections: 32,
          maxBars: 128,
          repeatsPerSection: [1, 8]
        },
        canonicalForm: [
          { name: 'intro', description: 'Introduction: sparse texture, atmosphere, bells, no heavy bass, 1..2 repeats' },
          { name: 'verse', description: 'First Verse: groove enters, bassline establishes tonal center, 1..2 repeats' },
          { name: 'chorus', description: 'Chorus / Climax: all voices active, leading melodic hook, bright character, peak dynamic, 1..2 repeats' },
          { name: 'verse2', description: 'Second Verse: rhythmic variation or melodic development, 1..2 repeats' },
          { name: 'bridge', description: 'Bridge: harmonic or rhythmic contrast, altered density or filter, 1..2 repeats' },
          { name: 'outro', description: 'Outro / Coda: gradual dissolution, fade="out", tails ringing, 1..2 repeats' }
        ],
        phraseReusability: 'Reuse identical phrases across sections by referencing their phrase ID (e.g. verse 1 and verse 2 can share phrase 1, or chorus can repeat phrase 2). Independent variations require a new phrase ID with distinct track notes.'
      }
    };
  }

  function generateProjectState(state, context){
    return {
      schemaVersion: 1,
      revision: state.revision,
      exportedAt: new Date().toISOString(),
      project: state.project,
      visual: state.visual || null,
      music: context?.music || [],
      history: context?.history || { undo: 0, redo: 0 }
    };
  }

  function generateAgentGuide(caps, state){
    return `# HALO Agent Guide / Руководство для AI-агента

HALO — браузерный музыкальный конструктор релаксации (8 голосов, сетка 16 шагов на такт, 4/4 и 3/4).
HALO is a browser relaxation music constructor (8 voices, 16-step grid per bar, 4/4 and 3/4).

## Архитектура папки / Folder Structure

\`\`\`
HALO-Bridge/
├── AGENT_GUIDE.md        # Эта инструкция / This guide
├── capabilities.json     # Возможности движка, пределы, операции / Capabilities, limits, operations
├── instruments.json      # 8 голосов, пресеты, совместимость, смысл параметров / Instruments & parameters
├── music-rules.json      # Ритмическая сетка, размеры, тональности, гармония / Music rules & grid
├── project-state.json    # Текущая композиция, ноты, ревизия / Current project state & revision
├── requests/             # Папка для команд агента / Agent requests folder (e.g. request-001.json)
└── responses/            # Папка для ответов HALO / HALO responses folder (e.g. request-001.result.json)
\`\`\`

## Правила работы / Agent Rules

1. **project-state.json — только для чтения:**
   Агент читает текущее состояние и ревизию проекта (\`revision\`). Изменять проект напрямую в этом файле запрещено.
2. **Все изменения отправляются через requests/:**
   Создайте новый JSON-файл в папке \`requests/\` (например, \`requests/request-001.json\`).
3. **Обязательные поля пакета:**
   Каждый пакет ОБЯЗАН содержать:
   - \`requestId\`: уникальный строковый идентификатор запроса (например, "request-001")
   - \`schemaVersion\`: 1
   - \`baseRevision\`: число, совпадающее с текущей ревизией из \`project-state.json\`
   - \`operations\`: массив операций (до 256 операций)
4. **Белый список операций (Allowlist):**
   Разрешены только следующие операции:
   - \`track.patch\` — изменение параметров и нот дорожки (trackIndex: 0..7, values: { on, exact, steps, noteEvents, noteTranspose, level, density, character, duration, space, delay, delayTime, chorus, instrument, sound })
   - \`phrase.patch\` — изменение фразы (bars: 4|8, startStep, seed, key, liveLoop, timeSignature: "4/4"|"3/4")
   - \`master.patch\` — изменение мастера (tempo: 30..200, masterVolume: 0..100, mix: { low, mid, high, width })
   - \`project.replace\` — полная замена однофразового проекта (включая выбор мира "setup": "ambient" | "reactor")
   - \`composition.replace\` — полная замена многофразовой композиции (до 15 фраз)
   - \`visual.patch\` — визуальный режим (scene: ORBIT/BLOOM/CURRENT, motion: DRIFT/IN TIME/PHRASE, effects: CLASSIC/COSMIC/HYPER)
   Никаких скриптов, сторонних URL, файлов или команд ОС.
5. **Подтверждение пользователя:**
   Команды в HALO не применяются скрытно: HALO читает файл, валидирует его, показывает пользователю предпросмотр изменений и ожидает подтверждения.
6. **Ответ в responses/:**
   После обработки HALO записывает результат в \`responses/<requestId>.result.json\`:
   - При успехе: \`{ "ok": true, "id": "request-001", "appliedRevision": 43, "timestamp": "..." }\`
   - При ошибке или отклонении: \`{ "ok": false, "id": "request-001", "error": "...", "help": "...", "instructionForAgent": "...", "currentRevision": 42 }\`
7. **Идемпотентность и актуальность:**
   Повторная обработка уже выполненного пакета запрещена. Устаревшие ревизии отклоняются с ошибкой \`CONFLICT_REVISION_MISMATCH\`.

## Защита от зацикливания и правила обработки ошибок / Anti-Looping & Error Handling

1. **Не угадывайте параметры (Do not guess parameters):**
   Все имена полей, операции, диапазоны и форматы строго зафиксированы в \`capabilities.json\`, \`instruments.json\` и \`music-rules.json\`. Не придумывайте несуществующие свойства.
2. **Лимит 2 попыток (Max 2 retries):**
   Если запрос завершился ошибкой, внимательно прочитайте поля \`"error"\` и \`"help"\` в файле ответа \`responses/<requestId>.result.json\`. Если повторная попытка снова дает сбой, **ОСТАНОВИТЕСЬ НЕМЕДЛЕННО**. Сообщите пользователю точный текст ошибки и спросите разъяснений вместо бесконечных попыток подбора параметров.
3. **Строго 8 дорожек в project.replace:**
   Операция \`project.replace\` всегда требует массив ровно из 8 дорожек: \`[GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]\`. Не отправляйте урезанный массив из 4 дорожек! Если вы хотите изменить только 1–4 инструмента, используйте операции \`track.patch\` для нужных дорожек!
4. **Имена звуков без префиксов мира:**
   Имена звуков берутся строго из \`instruments.json\` (например, \`"bell"\`, \`"sine"\`, \`"piano"\`, \`"shaker"\`). Не добавляйте префиксы вроде \`"ambient-bell"\`!
5. **Фраза или Песня:**
   Для запросов «сочини джингл/мелодию/мотив на 8 тактов» создавайте одну фразу через \`track.patch\` или \`project.replace\` (\`bars: 8\`). Не создавайте \`composition.replace\`, если вас не просили написать полную многочастную композицию!

## Политика создания: Фраза vs Композиция / Phrase vs Full Composition

- **РЕЖИМ ПО УМОЛЧАНИЮ — КОНКРЕТНАЯ ФРАЗА (DEFAULT: SINGLE PHRASE):**
  Если в запросе пользователя нет прямого указания написать целую композицию или песню (например: «сочини новогодний джингл на 8 тактов», «напиши тему пиратов», «сделай грув», «добавь бас»), агент работает **исключительно с текущей фразой / лупом** через \`track.patch\` или \`project.replace\`.
- **ЦЕЛАЯ КОМПОЗИЦИЯ (FULL COMPOSITION):**
  Создается **ТОЛЬКО** когда пользователь прямо просит: *«сочини песню»*, *«напиши целую композицию»*, *«сделай полную аранжировку с интро и припевом»*.
  В этом случае используется операция \`composition.replace\`.

### Каноны построения формы композиции / Song Form Canons:
1. **Intro (Вступление, 1..2 повтора):**
   Разреженная текстура. Пэд, колокольчики, шелест дождя или тихий пульс. Без тяжелого баса и перегруженных риффов. Устанавливает тональность и дыхание.
2. **Verse (Куплет, 1..2 повтора):**
   Вступает ритмический грув и бас. Излагается основная гармоническая последовательность и сдержанный мелодический мотив.
3. **Chorus (Припев, 1..2 повтора):**
   Кульминация энергии. Все ключевые дорожки активны (lead, harmony, chord, bass, beat). Повышенная яркость (\`character\`: 60..80) и громкость. Яркий запоминающийся хук.
4. **Verse 2 (Второй куплет, 1..2 повтора):**
   Развитие первого куплета. Добавляются контрапунктные арпеджио или вариации барабанов.
5. **Bridge (Бридж, 1..2 повтора):**
   Контрастный эпизод: смена гармонии, разрежение или синкопирование ритма, фильтрация частот. Подготовка к финальному припеву.
6. **Outro (Финал / Кода, 1..2 повтора, fade: "out"):**
   Постепенное растворение инструментов, хвосты реверберации, затухание в тишину.

### Ограничения композиции / Composition Limits:
- **МАКСИМУМ 15 УНИКАЛЬНЫХ ФРАЗ (\`phrases.length <= 15\`):**
  Строгий защитный лимит движка HALO. Попытка передать более 15 фраз будет отклонена валидатором.
- **Повторы секций (\`repeats: 1..8\`):**
  Используйте повторы одной и той же фразы через поле \`repeats\` секции (например, \`{ "phrase": 2, "name": "chorus", "repeats": 2 }\`), а также ссылайтесь на один и тот же ID фразы в разных секциях.
- **Суммарный хронометраж:** не более 128 тактов (MAX_BARS = 128).
- **Секции:** до 32 секций в массиве \`sections\`.

## Звуковые миры: AMBIENT vs REACTOR / Sound Worlds: AMBIENT vs REACTOR

HALO содержит два принципиально разных звуковых мира, переключаемых свойством \`"setup": "ambient" | "reactor"\`:

### 1. AMBIENT (Медитативный, эфирный, космический)
- **Синтез:** 100% процедурный чистый Web Audio синтез в реальном времени.
- **Вайб:** Спокойствие, созерцание, медитация, космос, органическое дыхание.
- **Темп:** 60..85 BPM (по умолчанию 72 BPM).
- **Пространство:** Глубокая реверберация (\`space\`: 35..80%), стереохорус, мягкие огибающие.
- **8 голосов по умолчанию:**
  - 0: GLASS (хрустальные колокольчики, чистые обертоны)
  - 1: TIDAL (дышащие мягкие атмосферные пэды)
  - 2: ROOT (глубокий аналоговый суб-бас)
  - 3: EMBER (теплые щипковые тембры)
  - 4: RAIN (шум дождя, щелчки, нежный ритм)
  - 5: VEIL (бархатные смычковые струнные)
  - 6: MOSS (деревянная маримба / перкуссия)
  - 7: AURA (окружающий космический фон / дрон)

### 2. REACTOR (Драйвовый, энергичный, рок/акустический)
- **Сэмплы:** 32 органических пресета на базе 130 аутентичных CC0-аудиозаписей живых инструментов.
- **Вайб:** Драйв, рок, плотный грув, акустическое присутствие, напор.
- **Темп:** 90..140 BPM (по умолчанию 100 BPM; для 6/8 pirate swing используйте 3/4 8 bars).
- **Пространство:** Плотный, сфокусированный микс (\`space\`: 10..30%), быстрый панч, четкие транзиенты.
- **8 голосов по умолчанию:**
  - 0: BEAT (живой панчевый кик и рабочий барабан)
  - 1: BASS (перегруженный роковый бас с овердрайвом)
  - 2: KEYS (акустическое фортепиано / Rhodes)
  - 3: CHORD (глушеная ритм-гитара / палм-мьют)
  - 4: RIFF (электрогитара с перегрузом / лид)
  - 5: LEAD (аналоговый синтезаторный лид / духовые)
  - 6: PERC (живые тарелки, хэт, шейкер)
  - 7: TEXTURE (гитарный фидбек, атмосферный низкочастотный слой)

### Правила миров / World Rules:
- Инструменты из каталога \`instruments.json\` могут назначаться на любую дорожку, но общее акустическое оформление, сэмплерный движок и эстетика задаются полем \`"setup"\`.
- **Единый мир:** Все фразы одной композиции обязаны иметь один и тот же \`setup\` (смешивание AMBIENT и REACTOR внутри одной песни не поддерживается).

## Примеры запросов / Example Requests

### Пример 1: Изменение дорожки фразы (track.patch)
\`\`\`json
{
  "requestId": "request-001",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "track.patch",
      "trackIndex": 5,
      "values": {
        "exact": true,
        "steps": [0, 4, 8, 12],
        "noteEvents": [
          { "step": 0, "notes": [72] },
          { "step": 4, "notes": [76] },
          { "step": 8, "notes": [79] },
          { "step": 12, "notes": [84] }
        ],
        "character": 65,
        "space": 40
      }
    }
  ]
}
\`\`\`

### Пример 2: Создание полной композиции (composition.replace)
\`\`\`json
{
  "requestId": "request-002",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "composition.replace",
      "project": {
        "format": "halo-composition",
        "version": 1,
        "tempo": 72,
        "masterVolume": 50,
        "mix": { "low": 0, "mid": 0, "high": 0, "width": 35 },
        "repeat": true,
        "phrases": [
          { "id": 1, "label": "Intro", "project": { /* полный объект проекта phrase 1 */ } },
          { "id": 2, "label": "Verse", "project": { /* полный объект проекта phrase 2 */ } },
          { "id": 3, "label": "Chorus", "project": { /* полный объект проекта phrase 3 */ } },
          { "id": 4, "label": "Bridge", "project": { /* полный объект проекта phrase 4 */ } },
          { "id": 5, "label": "Outro", "project": { /* полный объект проекта phrase 5 */ } }
        ],
        "sections": [
          { "phrase": 1, "name": "intro", "repeats": 1, "fade": "none" },
          { "phrase": 2, "name": "verse", "repeats": 2, "fade": "none" },
          { "phrase": 3, "name": "chorus", "repeats": 2, "fade": "none" },
          { "phrase": 2, "name": "verse2", "repeats": 2, "fade": "none" },
          { "phrase": 4, "name": "bridge", "repeats": 1, "fade": "none" },
          { "phrase": 3, "name": "chorus", "repeats": 2, "fade": "none" },
          { "phrase": 5, "name": "outro", "repeats": 1, "fade": "out" }
        ]
      }
    }
  ]
}
\`\`\`
*(Примечание: в \`composition.replace\` в качестве ключа полезной нагрузки поддерживается как \`"project"\`, так и \`"composition"\`).*

### Пример 3: Замена однофразового проекта на 8 тактов (project.replace)
*Важно: для \`project.replace\` массив \`tracks\` ОБЯЗАН содержать ровно 8 дорожек (все голоса [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]). Для изменения меньшего числа инструментов используйте \`track.patch\`.*
\`\`\`json
{
  "requestId": "request-003",
  "schemaVersion": 1,
  "baseRevision": ${state.revision},
  "operations": [
    {
      "op": "project.replace",
      "project": {
        "format": "notbad-halo-project",
        "version": 1,
        "setup": "ambient",
        "bars": 8,
        "tempo": 76,
        "masterVolume": 58,
        "mix": { "low": 0, "mid": 0, "high": 0, "width": 35 },
        "seed": 1,
        "key": 0,
        "tracks": [
          { "name": "GLASS", "instrument": "GLASS", "generator": 3, "sound": "bell", "on": true, "exact": true, "steps": [0, 4, 8, 12], "level": 65, "density": 70, "character": 50, "duration": 50, "space": 40 },
          { "name": "TIDAL", "instrument": "TIDAL", "generator": 3, "sound": "pad", "on": true, "exact": true, "steps": [0, 8], "level": 60, "density": 60, "character": 50, "duration": 60, "space": 50 },
          { "name": "ROOT", "instrument": "ROOT", "generator": 3, "sound": "round", "on": true, "exact": true, "steps": [0, 4, 8, 12], "level": 60, "density": 60, "character": 50, "duration": 50, "space": 30 },
          { "name": "EMBER", "instrument": "EMBER", "generator": 3, "sound": "piano", "on": true, "exact": true, "steps": [2, 6, 10, 14], "level": 60, "density": 60, "character": 55, "duration": 50, "space": 35 },
          { "name": "RAIN", "instrument": "RAIN", "generator": 3, "sound": "shaker", "on": true, "exact": true, "steps": [0, 2, 4, 6, 8, 10, 12, 14], "level": 50, "density": 70, "character": 60, "duration": 40, "space": 25 },
          { "name": "VEIL", "instrument": "VEIL", "generator": 3, "sound": "bow", "on": true, "exact": true, "steps": [0, 8], "level": 60, "density": 60, "character": 50, "duration": 65, "space": 55 },
          { "name": "MOSS", "instrument": "MOSS", "generator": 3, "sound": "pluck", "on": true, "exact": true, "steps": [4, 12], "level": 55, "density": 50, "character": 50, "duration": 45, "space": 35 },
          { "name": "AURA", "instrument": "AURA", "generator": 3, "sound": "drone", "on": true, "exact": true, "steps": [0], "level": 55, "density": 50, "character": 40, "duration": 70, "space": 60 }
        ]
      }
    }
  ]
}
\`\`\`
`;
  }

  function getContextFiles(api){
    const caps = api.getCapabilities();
    const state = api.getProjectState();
    const context = api.getContext();
    return {
      'AGENT_GUIDE.md': generateAgentGuide(caps, state),
      'capabilities.json': JSON.stringify(generateCapabilities(caps), null, 2),
      'instruments.json': JSON.stringify(generateInstruments(caps), null, 2),
      'music-rules.json': JSON.stringify(generateMusicRules(caps), null, 2),
      'project-state.json': JSON.stringify(generateProjectState(state, context), null, 2)
    };
  }

  function parseAndValidateRequest(api, textContent, fallbackId){
    let parsed;
    try {
      parsed = typeof textContent === 'string' ? JSON.parse(textContent) : textContent;
    } catch(e) {
      return { ok: false, error: 'INVALID_JSON: ' + e.message, id: fallbackId };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'INVALID_REQUEST_OBJECT', id: fallbackId };
    }

    const transaction = parsed.transaction || parsed;
    const requestId = String(parsed.requestId || transaction.requestId || fallbackId);

    if (transaction.schemaVersion !== 1) {
      return { ok: false, error: 'INVALID_SCHEMA_VERSION: schemaVersion must be 1', id: requestId };
    }
    if (typeof transaction.baseRevision !== 'number') {
      return { ok: false, error: 'MISSING_BASE_REVISION: baseRevision number is required', id: requestId };
    }
    if (!Array.isArray(transaction.operations) || !transaction.operations.length) {
      return { ok: false, error: 'INVALID_OPERATIONS: operations must be a non-empty array', id: requestId };
    }

    const currentRevision = api.getProjectState().revision;
    if (transaction.baseRevision !== currentRevision) {
      return {
        ok: false,
        error: `CONFLICT_REVISION_MISMATCH: expected revision ${currentRevision}, request was based on ${transaction.baseRevision}`,
        id: requestId,
        currentRevision
      };
    }

    let preview;
    try {
      preview = api.previewOperations(transaction);
    } catch(err) {
      return { ok: false, error: err.message, id: requestId, currentRevision };
    }

    return {
      ok: true,
      id: requestId,
      transaction,
      preview,
      currentRevision
    };
  }

  function generateErrorGuidance(errorMessage, consecutiveCount = 1){
    let help = 'Review your request schema against capabilities.json, instruments.json and AGENT_GUIDE.md.';
    const msg = String(errorMessage || '');

    if (msg.includes('CONFLICT_REVISION_MISMATCH')) {
      help = 'Base revision is outdated. Read "revision" from project-state.json and set "baseRevision" in your request to match it.';
    } else if (msg.includes('INVALID_TRACKS_COUNT')) {
      help = 'operation "project.replace" requires all 8 tracks in the "tracks" array: [GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]. If you only want to modify specific tracks, use one or more "track.patch" operations instead.';
    } else if (msg.includes('UNKNOWN_FIELD')) {
      help = 'An unexpected property was found. Consult capabilities.json and AGENT_GUIDE.md for allowed fields. Do not invent custom properties.';
    } else if (msg.includes('INVALID_SOUND')) {
      help = 'Sound ID not found. Sound names must match instruments.json exactly (e.g. "bell", "piano", "sine", "shaker" without world prefixes like "ambient-").';
    } else if (msg.includes('UNSUPPORTED_FORMAT')) {
      help = 'For single-phrase project, format must be "notbad-halo-project" or "halo-project". For multi-phrase songs, format must be "halo-composition".';
    } else if (msg.includes('INVALID_BARS')) {
      help = 'Phrase length must be either 4 or 8 bars.';
    } else if (msg.includes('UNSUPPORTED_SETUP')) {
      help = 'Setup must be either "ambient" (procedural synthesis) or "reactor" (CC0 acoustic/rock samples).';
    } else if (msg.includes('UNSUPPORTED_TIME_SIGNATURE')) {
      help = 'Time signature must be "4/4" or "3/4".';
    } else if (msg.includes('EXACT_REQUIRED')) {
      help = 'Generator 3 requires "exact": true when providing custom steps or noteEvents.';
    } else if (msg.includes('PHRASE_NOT_FOUND')) {
      help = 'The specified phraseId was not found in the composition phrases array.';
    } else if (msg.includes('MISSING_PAYLOAD')) {
      help = 'Provide the payload object ("project" or "composition") inside the operation.';
    } else if (msg.includes('REJECTED_BY_USER')) {
      help = 'The user reviewed the proposal preview in HALO and clicked "Reject". Ask the user for their preferred direction before proposing changes.';
    }

    let instructionForAgent;
    if (consecutiveCount >= 3) {
      instructionForAgent = `CRITICAL STOP DIRECTIVE: ${consecutiveCount} consecutive request failures detected. STOP YOUR RETRY LOOP IMMEDIATELY. Do not guess parameters or attempt brute-force trial and error. Stop and report the exact error to the user, and ask for clarification, or consult AGENT_GUIDE.md and instruments.json.`;
    } else {
      instructionForAgent = 'Review the error and help above. Do not guess parameters. Consult instruments.json and AGENT_GUIDE.md. Maximum 2 retry attempts allowed.';
    }

    return { help, instructionForAgent };
  }

  async function processRequest(api, textContent, fallbackId){
    const validated = parseAndValidateRequest(api, textContent, fallbackId);
    if (!validated.ok) {
      const guidance = generateErrorGuidance(validated.error, 1);
      return {
        ...validated,
        help: guidance.help,
        instructionForAgent: guidance.instructionForAgent
      };
    }

    try {
      api.setEnabled(true);
      const result = await api.applyOperations(validated.transaction);
      return {
        ok: true,
        id: validated.id,
        appliedRevision: result.revision,
        currentRevision: result.revision,
        project: result.project,
        timestamp: new Date().toISOString()
      };
    } catch(e) {
      const guidance = generateErrorGuidance(e.message, 1);
      return {
        ok: false,
        id: validated.id,
        error: e.message,
        help: guidance.help,
        instructionForAgent: guidance.instructionForAgent,
        currentRevision: api.getProjectState().revision
      };
    }
  }

  // --- Browser File System Access API integration ---

  async function writeFsFile(dirHandle, filename, textContent){
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(textContent);
    await writable.close();
  }

  async function readFsFile(fileHandle){
    const file = await fileHandle.getFile();
    return await file.text();
  }

  async function syncAllContext(dirHandle, api){
    const files = getContextFiles(api);
    for (const [name, content] of Object.entries(files)){
      await writeFsFile(dirHandle, name, content);
    }
  }

  async function syncStateOnly(dirHandle, api){
    const state = api.getProjectState();
    const context = api.getContext();
    const content = JSON.stringify(generateProjectState(state, context), null, 2);
    await writeFsFile(dirHandle, 'project-state.json', content);
  }

  // --- IndexedDB directory persistence across page reloads ---
  const IDB_NAME = 'halo-file-bridge-v1';
  const IDB_STORE = 'handles';
  const IDB_KEY = 'last-directory';

  function openIdb(win){
    return new Promise(resolve => {
      const idb = win?.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : root.indexedDB);
      if (!idb) return resolve(null);
      try {
        const req = idb.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function storeDirectoryHandle(handle, win){
    try {
      const db = await openIdb(win);
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ name: handle.name, handle, timestamp: Date.now() }, IDB_KEY);
      await new Promise(r => {
        tx.oncomplete = r;
        tx.onerror = r;
        setTimeout(r, 100);
      });
    } catch {}
  }

  async function retrieveStoredDirectory(win){
    try {
      const db = await openIdb(win);
      if (!db) return null;
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      return await new Promise(r => {
        req.onsuccess = () => r(req.result || null);
        req.onerror = () => r(null);
        setTimeout(() => r(null), 100);
      });
    } catch {
      return null;
    }
  }

  async function clearStoredDirectory(win){
    try {
      const db = await openIdb(win);
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      await new Promise(r => {
        tx.oncomplete = r;
        tx.onerror = r;
        setTimeout(r, 100);
      });
    } catch {}
  }

  function createBridge(api, env = {}){
    let dirHandle = null;
    let pollInterval = null;
    let consecutiveErrors = 0;
    const listeners = new Set();
    const processedIds = new Set();
    const win = env.window || root;

    const state = {
      connected: false,
      directoryName: '',
      savedDirectory: null, // { name: string, handle: FileSystemDirectoryHandle }
      lastSync: null,
      lastCheck: null,
      pending: null,
      lastResult: null,
      error: null,
      busy: false,
      autoApply: false,
      supported: typeof win?.showDirectoryPicker === 'function' || typeof root.showDirectoryPicker === 'function'
    };

    function notify(){
      for (const fn of listeners) {
        try { fn(clone(state)); } catch {}
      }
    }

    async function checkFolder(){
      if (!dirHandle || state.busy) return;
      state.busy = true;
      try {
        const reqDir = await dirHandle.getDirectoryHandle('requests', { create: true });
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });

        // Scan existing responses to populate processedIds
        for await (const [name, handle] of resDir.entries()){
          if (handle.kind === 'file' && name.endsWith('.result.json')){
            const id = name.replace(/\.result\.json$/i, '');
            processedIds.add(id);
          }
        }

        // If there's already a pending request awaiting user confirmation, don't pick another one yet
        if (state.pending) {
          state.lastCheck = new Date().toISOString();
          notify();
          return;
        }

        for await (const [name, handle] of reqDir.entries()){
          if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
          const baseId = name.replace(/\.json$/i, '');
          if (processedIds.has(baseId)) continue;

          const text = await readFsFile(handle);
          const parsed = parseAndValidateRequest(api, text, baseId);

          if (!parsed.ok) {
            consecutiveErrors++;
            const guidance = generateErrorGuidance(parsed.error, consecutiveErrors);
            const errRes = {
              ok: false,
              id: parsed.id,
              error: parsed.error,
              help: guidance.help,
              instructionForAgent: guidance.instructionForAgent,
              consecutiveErrors,
              currentRevision: parsed.currentRevision || api.getProjectState().revision,
              timestamp: new Date().toISOString()
            };
            await writeFsFile(resDir, `${parsed.id}.result.json`, JSON.stringify(errRes, null, 2));
            processedIds.add(baseId);
            state.lastResult = errRes;
            notify();
            continue;
          }

          // Rule 1: Never apply automatically by default
          if (!state.autoApply) {
            state.pending = {
              id: parsed.id,
              filename: name,
              transaction: parsed.transaction,
              preview: parsed.preview,
              baseId
            };
            notify();
            break; // Wait for user decision
          } else {
            api.setEnabled(true);
            const applied = await api.applyOperations(parsed.transaction);
            consecutiveErrors = 0;
            const okRes = {
              ok: true,
              id: parsed.id,
              appliedRevision: applied.revision,
              currentRevision: applied.revision,
              timestamp: new Date().toISOString()
            };
            await writeFsFile(resDir, `${parsed.id}.result.json`, JSON.stringify(okRes, null, 2));
            await syncStateOnly(dirHandle, api);
            processedIds.add(baseId);
            state.lastResult = okRes;
            notify();
          }
        }
        state.lastCheck = new Date().toISOString();
        state.error = null;
      } catch(err) {
        state.error = err.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function applyPending(){
      if (!state.pending || !dirHandle) return;
      const p = state.pending;
      state.busy = true;
      try {
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });
        api.setEnabled(true);
        const applied = await api.applyOperations(p.transaction);
        consecutiveErrors = 0;
        const okRes = {
          ok: true,
          id: p.id,
          appliedRevision: applied.revision,
          currentRevision: applied.revision,
          timestamp: new Date().toISOString()
        };
        await writeFsFile(resDir, `${p.id}.result.json`, JSON.stringify(okRes, null, 2));
        await syncStateOnly(dirHandle, api);
        processedIds.add(p.baseId);
        state.lastResult = okRes;
        state.pending = null;
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function rejectPending(){
      if (!state.pending || !dirHandle) return;
      const p = state.pending;
      state.busy = true;
      try {
        const resDir = await dirHandle.getDirectoryHandle('responses', { create: true });
        consecutiveErrors++;
        const guidance = generateErrorGuidance('REJECTED_BY_USER', consecutiveErrors);
        const rejRes = {
          ok: false,
          id: p.id,
          error: 'REJECTED_BY_USER',
          help: guidance.help,
          instructionForAgent: guidance.instructionForAgent,
          consecutiveErrors,
          currentRevision: api.getProjectState().revision,
          timestamp: new Date().toISOString()
        };
        await writeFsFile(resDir, `${p.id}.result.json`, JSON.stringify(rejRes, null, 2));
        processedIds.add(p.baseId);
        state.lastResult = rejRes;
        state.pending = null;
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function connect(handle){
      dirHandle = handle;
      state.connected = true;
      state.directoryName = handle.name || 'HALO-Bridge';
      state.savedDirectory = null;
      state.error = null;
      state.busy = true;
      notify();
      try {
        await storeDirectoryHandle(handle, win);
        // Ensure subfolders
        await dirHandle.getDirectoryHandle('requests', { create: true });
        await dirHandle.getDirectoryHandle('responses', { create: true });
        // Sync context
        await syncAllContext(dirHandle, api);
        state.lastSync = new Date().toISOString();
        // Start polling
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(checkFolder, 1500);
        await checkFolder();
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    async function disconnect(){
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = null;
      dirHandle = null;
      state.connected = false;
      state.directoryName = '';
      state.savedDirectory = null;
      state.pending = null;
      await clearStoredDirectory(win);
      notify();
    }

    let restoringPromise = null;
    async function doRestore(){
      if (state.connected || dirHandle) return;
      const stored = await retrieveStoredDirectory(win);
      if (!stored || !stored.handle) return;
      const handle = stored.handle;
      try {
        if (typeof handle.queryPermission === 'function') {
          const perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            await connect(handle);
            return;
          }
        }
      } catch {}
      state.savedDirectory = { name: stored.name || handle.name || 'HALO-Bridge', handle };
      notify();
    }

    function tryRestore(){
      if (!restoringPromise) {
        restoringPromise = doRestore().finally(() => { restoringPromise = null; });
      }
      return restoringPromise;
    }

    async function forgetSavedDirectory(){
      state.savedDirectory = null;
      await clearStoredDirectory(win);
      notify();
    }

    tryRestore();

    async function syncFiles(){
      if (!dirHandle) return;
      state.busy = true;
      notify();
      try {
        await syncAllContext(dirHandle, api);
        state.lastSync = new Date().toISOString();
      } catch(e) {
        state.error = e.message;
      } finally {
        state.busy = false;
        notify();
      }
    }

    return {
      connect,
      disconnect,
      tryRestore,
      forgetSavedDirectory,
      syncFiles,
      checkFolder,
      applyPending,
      rejectPending,
      setAutoApply(v){ state.autoApply = !!v; notify(); },
      getStatus: () => clone(state),
      subscribe(fn){
        listeners.add(fn);
        fn(clone(state));
        return () => listeners.delete(fn);
      },
      dispose(){
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
        dirHandle = null;
        listeners.clear();
      }
    };
  }

  // --- UI Renderer ---

  function renderFileBridgePanel(host, api, language){
    const tr = (ru, en) => language() === 'ru' ? ru : en;
    let bridge = bridges.get(api);
    if (!bridge) {
      bridge = createBridge(api, { window: root });
      bridges.set(api, bridge);
    }

    host.replaceChildren();

    function el(tag, text, css){
      const n = document.createElement(tag);
      if (text) n.textContent = text;
      if (css) n.style.cssText = css;
      host.append(n);
      return n;
    }

    el('strong', tr('HALO File Bridge — подключение через локальную папку', 'HALO File Bridge — Local Folder Connection'), 'display:block;font-size:12px;margin-bottom:6px;');

    el('p', tr(
      'Экспортирует технический паспорт музыкального движка и снимок текущей композиции в локальную папку HALO-Bridge. AI-агенты (Antigravity, Bionic, Codex, Claude) читают файлы, создают команды в requests/, а HALO валидирует их и ожидает вашего подтверждения перед применением.',
      'Exports the music engine technical passport and current composition snapshot into a local HALO-Bridge folder. AI agents (Antigravity, Bionic, Codex, Claude) read these files, write commands into requests/, and HALO validates them and awaits your confirmation before applying.'
    ), 'font-size:11px;color:#9bb2c2;margin-bottom:12px;');

    const statusBox = document.createElement('div');
    statusBox.style.cssText = 'background:rgba(12,24,42,.7);border:1px solid rgba(139,232,227,.2);border-radius:10px;padding:12px;margin-bottom:14px;';
    host.append(statusBox);

    const pendingBox = document.createElement('div');
    pendingBox.style.cssText = 'display:none;background:rgba(35,52,78,.9);border:1px solid #75dfd6;border-radius:10px;padding:12px;margin-bottom:14px;';
    host.append(pendingBox);

    function updateView(s){
      statusBox.replaceChildren();

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;';
      statusBox.append(topRow);

      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = 'font-size:11px;font-weight:550;letter-spacing:.05em;display:flex;align-items:center;gap:6px;';
      if (s.connected) {
        statusBadge.innerHTML = `<span style="color:#7ef0dc;">●</span> ${tr('Папка подключена:','Folder connected:')} <span style="color:#fff;">${s.directoryName}</span>`;
      } else if (s.savedDirectory) {
        statusBadge.innerHTML = `<span style="color:#f8c98f;">⏸</span> ${tr('Сохранённая папка:','Saved folder:')} <span style="color:#fff;">${s.savedDirectory.name}</span>`;
      } else {
        statusBadge.innerHTML = `<span style="color:#8ca2b3;">○</span> ${tr('Папка не подключена','Folder disconnected')}`;
      }
      topRow.append(statusBadge);

      const actionGroup = document.createElement('div');
      actionGroup.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
      topRow.append(actionGroup);

      if (!s.connected) {
        if (s.supported) {
          if (s.savedDirectory) {
            const btnReconnect = document.createElement('button');
            btnReconnect.className = 'glass-btn';
            btnReconnect.style.cssText = 'font-size:10px;padding:4px 14px;min-height:30px;background:rgba(35,80,110,.85);border-color:#75dfd6;color:#d8fff8;font-weight:600;cursor:pointer;';
            btnReconnect.textContent = tr(`🔓 Возобновить доступ к «${s.savedDirectory.name}»`, `🔓 Reconnect «${s.savedDirectory.name}»`);
            btnReconnect.title = tr('Подтвердить разрешение браузера и продолжить синхронизацию', 'Confirm browser permission and resume synchronization');
            btnReconnect.onclick = async () => {
              try {
                if (typeof s.savedDirectory.handle.requestPermission === 'function') {
                  const perm = await s.savedDirectory.handle.requestPermission({ mode: 'readwrite' });
                  if (perm === 'granted') {
                    await bridge.connect(s.savedDirectory.handle);
                    return;
                  } else {
                    alert(tr('Доступ к папке не был разрешен пользователем', 'Folder permission was not granted by the user'));
                    return;
                  }
                }
                await bridge.connect(s.savedDirectory.handle);
              } catch(e) {
                if (e.name !== 'AbortError') alert(e.message);
              }
            };

            const btnOther = document.createElement('button');
            btnOther.className = 'glass-btn';
            btnOther.style.cssText = 'font-size:10px;padding:4px 10px;min-height:30px;border-color:rgba(139,232,227,.4);color:#c4e6ed;cursor:pointer;';
            btnOther.textContent = tr('📁 Выбрать другую', '📁 Choose other');
            btnOther.onclick = async () => {
              try {
                const picker = root.showDirectoryPicker;
                if (typeof picker !== 'function') throw Error(tr('File System Access API недоступен в этом браузере', 'File System Access API is not supported in this browser'));
                const handle = await picker({ mode: 'readwrite' });
                await bridge.connect(handle);
              } catch(e) {
                if (e.name !== 'AbortError') alert(e.message);
              }
            };

            const btnForget = document.createElement('button');
            btnForget.className = 'glass-btn';
            btnForget.style.cssText = 'font-size:10px;padding:4px 8px;min-height:30px;background:rgba(70,25,25,.4);border-color:#f8a39a;color:#ffdada;cursor:pointer;';
            btnForget.textContent = tr('✕ Забыть', '✕ Forget');
            btnForget.title = tr('Очистить сохранённую папку', 'Clear saved folder');
            btnForget.onclick = () => bridge.forgetSavedDirectory();

            actionGroup.append(btnReconnect, btnOther, btnForget);
          } else {
            const btnConnect = document.createElement('button');
            btnConnect.className = 'glass-btn';
            btnConnect.style.cssText = 'font-size:10px;padding:4px 12px;min-height:30px;border-color:rgba(139,232,227,.4);';
            btnConnect.textContent = tr('📁 Подключить папку HALO-Bridge', '📁 Connect HALO-Bridge Folder');
            btnConnect.onclick = async () => {
              try {
                const picker = root.showDirectoryPicker;
                if (typeof picker !== 'function') throw Error(tr('File System Access API недоступен в этом браузере', 'File System Access API is not supported in this browser'));
                const handle = await picker({ mode: 'readwrite' });
                await bridge.connect(handle);
              } catch(e) {
                if (e.name !== 'AbortError') alert(e.message);
              }
            };
            actionGroup.append(btnConnect);
          }
        } else {
          const warn = document.createElement('span');
          warn.style.cssText = 'color:#f8b595;font-size:10px;';
          warn.textContent = tr('Требуется настольный Chrome или Edge с File System Access API.', 'Desktop Chrome or Edge with File System Access API required.');
          actionGroup.append(warn);
        }
      } else {
        const btnSync = document.createElement('button');
        btnSync.className = 'glass-btn';
        btnSync.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(20,44,70,.7);border-color:#75dfd6;color:#d8fff8;cursor:pointer;';
        btnSync.textContent = tr('⟳ Обновить файлы', '⟳ Sync Files');
        btnSync.title = tr('Перезаписать AGENT_GUIDE.md, capabilities.json, instruments.json, music-rules.json и project-state.json', 'Rewrite AGENT_GUIDE.md, capabilities.json, instruments.json, music-rules.json and project-state.json');
        btnSync.onclick = () => bridge.syncFiles();

        const btnCheck = document.createElement('button');
        btnCheck.className = 'glass-btn';
        btnCheck.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(20,44,70,.7);border-color:#75dfd6;color:#d8fff8;cursor:pointer;';
        btnCheck.textContent = tr('⯈ Проверить requests/', '⯈ Check requests/');
        btnCheck.onclick = () => bridge.checkFolder();

        const btnDisconnect = document.createElement('button');
        btnDisconnect.className = 'glass-btn';
        btnDisconnect.style.cssText = 'font-size:10px;padding:3px 10px;min-height:28px;background:rgba(70,25,25,.55);border-color:#f8a39a;color:#ffdada;cursor:pointer;';
        btnDisconnect.textContent = tr('✕ Отключить', '✕ Disconnect');
        btnDisconnect.onclick = () => bridge.disconnect();

        actionGroup.append(btnSync, btnCheck, btnDisconnect);
      }

      // Details info
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:#8ba2b3;line-height:1.5;';
      if (s.connected) {
        meta.innerHTML = `
          <div>${tr('Ревизия проекта:','Project revision:')} <strong>${api.getProjectState().revision}</strong> · ${tr('Опрос requests/ каждые 1.5с: активен','Polling requests/ every 1.5s: active')}</div>
          ${s.lastSync ? `<div>${tr('Последний экспорт паспорта:','Last passport sync:')} ${new Date(s.lastSync).toLocaleTimeString()}</div>` : ''}
          ${s.lastResult ? `<div style="margin-top:4px;color:${s.lastResult.ok ? '#8fe5d2' : '#f8a39a'};">${s.lastResult.ok ? '✓ ' + tr('Команда успешно обработана: ','Command applied: ') + s.lastResult.id : '⚠ ' + tr('Ошибка команды ','Command error ') + s.lastResult.id + ': ' + s.lastResult.error}</div>` : ''}
          ${s.error ? `<div style="color:#f89a9a;margin-top:4px;">⚠ ${s.error}</div>` : ''}
        `;
      } else if (s.savedDirectory) {
        meta.textContent = tr(
          `Папка «${s.savedDirectory.name}» сохранена. Нажмите «Возобновить доступ», чтобы восстановить синхронизацию без повторного выбора папки.`,
          `Folder «${s.savedDirectory.name}» is saved. Click "Reconnect" to resume synchronization without picking the folder again.`
        );
      } else {
        meta.textContent = tr(
          'Создайте на диске папку HALO-Bridge (или temp) и нажмите кнопку подключения. HALO создаст технический паспорт движка и папки requests/ и responses/.',
          'Create a HALO-Bridge (or temp) folder on your disk and press connect. HALO will generate the engine passport and the requests/ and responses/ subdirectories.'
        );
      }
      statusBox.append(meta);

      // Pending Request Banner
      if (s.pending) {
        pendingBox.style.display = 'block';
        pendingBox.replaceChildren();

        const pHead = document.createElement('div');
        pHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
        pHead.innerHTML = `<strong style="color:#d8ffff;font-size:11px;">🔔 ${tr('Входящий запрос от агента:','Incoming agent request:')} <span style="color:#7ef0dc;">${s.pending.id}</span></strong><span style="font-size:10px;color:#a2bacb;">Base rev: ${s.pending.transaction.baseRevision}</span>`;
        pendingBox.append(pHead);

        const pOps = document.createElement('ul');
        pOps.style.cssText = 'margin:6px 0 10px 18px;padding:0;font-size:10px;color:#cbe2ee;';
        for (const o of (s.pending.transaction.operations || [])){
          const li = document.createElement('li');
          if (o.op === 'track.patch') {
            li.textContent = `track.patch: Track 0${(o.trackIndex||0)+1} (${Object.keys(o.values||{}).join(', ')})`;
          } else if (o.op === 'master.patch') {
            li.textContent = `master.patch: ${Object.keys(o.values||{}).join(', ')}`;
          } else if (o.op === 'phrase.patch') {
            li.textContent = `phrase.patch: ${Object.keys(o.values||{}).join(', ')}`;
          } else {
            li.textContent = `${o.op}`;
          }
          pOps.append(li);
        }
        pendingBox.append(pOps);

        const pButtons = document.createElement('div');
        pButtons.style.cssText = 'display:flex;gap:8px;';

        const btnApply = document.createElement('button');
        btnApply.className = 'glass-btn';
        btnApply.style.cssText = 'font-size:10px;padding:4px 14px;background:rgba(42,120,105,.6);border-color:#7df0dc;color:#fff;font-weight:600;';
        btnApply.textContent = tr('✓ Применить изменения', '✓ Apply Changes');
        btnApply.onclick = () => bridge.applyPending();

        const btnReject = document.createElement('button');
        btnReject.className = 'glass-btn';
        btnReject.style.cssText = 'font-size:10px;padding:4px 12px;background:rgba(100,40,40,.5);border-color:#f8a39a;color:#fdd;';
        btnReject.textContent = tr('✕ Отклонить', '✕ Reject');
        btnReject.onclick = () => bridge.rejectPending();

        pButtons.append(btnApply, btnReject);
        pendingBox.append(pButtons);
      } else {
        pendingBox.style.display = 'none';
        pendingBox.replaceChildren();
      }
    }

    const unsub = bridge.subscribe(updateView);
    host._haloCleanup = () => { unsub(); };

    // Structure info
    const guideHead = el('strong', tr('Структура папки HALO-Bridge', 'HALO-Bridge Folder Structure'), 'display:block;font-size:11px;margin-top:14px;margin-bottom:6px;');
    const list = el('ul', '', 'font-size:10px;line-height:1.6;color:#a8c0cf;margin:0 0 12px 18px;padding:0;');
    list.innerHTML = `
      <li><code>AGENT_GUIDE.md</code> — ${tr('Инструкция агенту: правила создания музыки и форматы команд','Agent instructions: music creation rules and request schema')}</li>
      <li><code>capabilities.json</code> — ${tr('Паспорт движка: операции, параметры, FX, мастер, лимиты','Engine passport: operations, parameters, FX, master, limits')}</li>
      <li><code>instruments.json</code> — ${tr('8 голосов, пресеты, совместимость и звуковой смысл каждого параметра','8 voices, presets, compatibility, and sonic meaning of each parameter')}</li>
      <li><code>music-rules.json</code> — ${tr('Сетка 16 шагов 4/4, 24 тональности квинтового круга, гаммы, полифония','16-step 4/4 grid, 24 Circle of Fifths keys, scales, polyphony')}</li>
      <li><code>project-state.json</code> — ${tr('Снимок текущей композиции (ревизия, ноты, фразы) — только для чтения','Snapshot of active composition (revision, notes, phrases) — read-only')}</li>
      <li><code>requests/</code> — ${tr('Папка входящих команд агента (например, request-001.json)','Incoming agent command folder (e.g. request-001.json)')}</li>
      <li><code>responses/</code> — ${tr('Папка ответов HALO (например, request-001.result.json)','HALO response folder (e.g. request-001.result.json)')}</li>
    `;

    el('strong', tr('Пример запроса для агента (Bionic / Antigravity / Codex):', 'Example prompt for agent (Bionic / Antigravity / Codex):'), 'display:block;font-size:11px;margin-bottom:4px;');
    const promptBox = el('div', tr(
      '«Прочитай AGENT_GUIDE.md в папке HALO-Bridge. Изучи возможности HALO и текущий проект в project-state.json. Сочини оригинальный новогодний джингл на 8 тактов, используя только встроенные инструменты. Запиши команду в папку requests/ и проверь, что ответ в responses/ подтвердил применение».',
      '“Read AGENT_GUIDE.md in the HALO-Bridge folder. Study HALO capabilities and the current project in project-state.json. Compose an original eight-bar New Year jingle using only built-in sounds. Write your request file to the requests/ folder and verify the response in responses/ confirms application.”'
    ), 'font-size:10px;line-height:1.5;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px;color:#d5ebf5;user-select:all;');
  }

  const api = {
    generateCapabilities,
    generateInstruments,
    generateMusicRules,
    generateProjectState,
    generateAgentGuide,
    getContextFiles,
    parseAndValidateRequest,
    processRequest,
    createBridge,
    panel: renderFileBridgePanel
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloFileBridge = api;
})(globalThis);
