# HALO Engine Capabilities & Technical Specification

**Version:** 1.0 · **Date:** 2026-10-14 · **Status:** Authoritative Implementation Reference  
**Product:** NotBad HALO — Browser-Based Unobtrusive Relaxation Music Constructor

---

## 1. Обзор архитектуры системы (System Overview)

HALO построен по принципу чистого статического Web Audio приложения с нулевой серверной зависимостью (zero-build static deployment).
Все вычисления, синтез, полиметрия, воспроизведение сэмплов, динамическая обработка и визуализация выполняются на стороне клиента (браузер) в рамках единой вкладки.

### Ключевые архитектурные константы
- **Аудио-транспорт:** Единый высокоточный планировщик опережающего времени Web Audio (`AudioContext.currentTime`).
- **Сетка:** 16 шестнадцатых долей на такт (16 steps/bar, размер 4/4).
- **Диапазон темпа (BPM):** 30.00 — 200.00 (числа с плавающей точкой до 2 знаков после запятой).
- **Количество дорожек:** Строго 8 параллельных инструментальных слотов.
- **Длительность фразы:** Строго 4 или 8 тактов (64 или 128 шестнадцатых шагов).
- **Ограничения композиции:** До 32 уникальных фраз, до 32 секций, до 128 суммарных тактов, размер JSON до 512 КиБ.
- **Разделение миров (World Isolation):** Проект может находиться либо в мире `ambient`, либо в мире `reactor`. Смешивание пресетов из разных миров внутри одной фразы строго запрещено.
- **Безопасность аудио:** Мастер-компрессор/пиковый лимитер предотвращает клиппинг при любых комбинациях пресетов.

---

## 2. Восемь инструментальных слотов и ролевых операторов (Track Roles)

HALO использует 8 фиксированных позиций слотов, жестко связанных с индексами 0..7.

```
Слот 0: GLASS  → Роль: pulse      (Основной импульс)
Слот 1: TIDAL  → Роль: accent     (Ритмический акцент / бэкбит)
Слот 2: ROOT   → Роль: percussion (Ритмические микродетали)
Слот 3: EMBER  → Роль: texture    (Атмосферный фактурный слой)
Слот 4: RAIN   → Роль: bass       (Монофонический бас)
Слот 5: VEIL   → Роль: melody     (Ведущая мелодия)
Слот 6: MOSS   → Роль: arpeggio   (Артикулированное арпеджио)
Слот 7: AURA   → Роль: harmony    (4-голосная аккордовая гармония)
```

### Спецификация ролевых операторов (`src/roles.js`)

| № | ID роли | Слот | Название | Max нот | Max голосов | Ограничение длительности (maxDuration) | Регистровый сдвиг | Музыкальное назначение |
|---|---|---|---|---|---|---|---|---|
| 0 | `pulse` | `GLASS` | Pulse | 1 | 2 | 0.8 с | Reference Note (унпитч/бас) | Низкий ритмический фундамент, бочка. Шаг 0 защищен якорем. |
| 1 | `accent` | `TIDAL` | Accent | 2 | 2 | 0.8 с | Reference Note | Малый барабан, щелчки, хлопки, синкопированный бэкбит. |
| 2 | `percussion` | `ROOT` | Percussion | 2 | 2 | 0.35 с | Reference Note | Хэты, тарелки, шейкеры, перкуссионный микрорельеф. |
| 3 | `texture` | `EMBER` | Texture | 2 | 2 | 8.0 с | `chord[0] - 12` (ambient) / `+ 12` (reactor) | Атмосферные пэды, шум, томы, пространственные слои. |
| 4 | `bass` | `RAIN` | Bass | 1 | 1 (Mono) | 8.0 с | `chord[0] - 12` (шаг % 4 == 0) / `pitch - 12` | Монофоническая басовая линия. Bounded range: 26–49 MIDI. Панорама strictly center. |
| 5 | `melody` | `VEIL` | Melody | 3 | 3 | 8.0 с | `pitch + 24` (+12 для октавных звуков) | Ведущая фразовая мелодия в верхнем регистре. |
| 6 | `arpeggio` | `MOSS` | Arpeggio | 1 | 1 (Mono) | 0.65 с | `pitch + 12` | Быстрые арпеджио в среднем регистре. Специфический decay для четкости. |
| 7 | `harmony` | `AURA` | Harmony | 4 | 4 (Poly) | 8.0 с | `chord[(i + degree) % 4]` | Аккордовые подкладки, раскрывающие гармонию. |

### Правила полифонии и кражи голосов (Voice Stealing)
1. Если новый триггер превышает лимит голосов роли (`policy.voices`), самый старый активный голос немедленно переводится в режим быстрого релиза (`release(at)`) с рампированием в течение 12 мс, предотвращая щелчки.
2. Роли `bass` и `arpeggio` являются строго монофоническими: каждая новая нота гасит предыдущую.
3. Роль `harmony` воспроизводит до 4 нот одновременно (полные 4-звучные септаккорды).

---

## 3. Звуковые миры и каталог инструментов (Sound Catalog)

### 3.1. Мир AMBIENT (30 процедурных патчей)
Построен исключительно на осцилляторах и синтезе шума в Web Audio (`src/sounds.js`).

| Банк слота | Патч ID | Название | Движок | Базовая частота (Tone, Гц) | Спад (Decay, с) | Особенности синтеза |
|---|---|---|---|---|---|---|
| **GLASS** | `bell` | Soft bell | `bell` | 4200 | 2.7 | Sine + FM overtone (ratio 2.005) |
| | `vibes` | Vibes | `bell` | 2200 | 1.8 | Sine + FM ratio 3 |
| | `crystal` | Crystal | `bell` | 5800 | 3.2 | Sine + FM ratio 2.71 |
| **TIDAL** | `air` | Air pad | `pad` | 1300 | 4.8 | Sine/Triangle dual detuned oscillator |
| | `organ` | Soft organ | `pad` | 1800 | 3.6 | Sine wave, ratio 2 overtone |
| | `tide` | Warm tide | `pad` | 800 | 5.5 | Triangle wave, detune 8 cents |
| **ROOT** | `round` | Round bass | `bass` | 650 | 1.15 | Sine/Triangle bass, low-register |
| | `deep` | Deep tone | `bass` | 350 | 2.1 | Pure sub triangle bass |
| | `pulse` | Soft kick | `kick` | 480 | 0.45 | Pitch sweep 115 Hz → 40 Hz |
| | `punch` | Punch kick | `kick` | 2200 | 0.32 | Pitch sweep 165 Hz → 57 Hz + high click 1100 Hz |
| **EMBER** | `string` | Soft string | `pluck` | 2400 | 1.2 | Triangle wave pluck + overtone |
| | `harp` | Harp glow | `pluck` | 3400 | 2.0 | Triangle pluck, ratio 2 |
| | `warm` | Warm pluck | `pluck` | 1100 | 0.8 | Sine wave pluck |
| **RAIN** | `shaker` | Shaker | `noise` | 3500 | 0.16 | Bandpass filtered white noise buffer |
| | `brush` | Brush | `noise` | 1700 | 0.45 | Bandpass noise |
| | `drop` | Drops | `drop` | 2800 | 0.35 | Fast frequency exponential downward drop |
| | `snare` | Dry snare | `snare` | 6500 | 0.18 | Noise burst + 185 Hz triangle body |
| | `clap` | Clap | `clap` | 3800 | 0.16 | 3 micro-transient attacks (18ms, 36ms) + noise |
| | `hat` | Closed hat | `noise` | 7500 | 0.07 | Highpass filtered noise burst |
| **VEIL** | `bow` | Bowed veil | `pad` | 950 | 5.0 | Triangle detuned pad, detune 6 |
| | `drone` | Low drone | `pad` | 600 | 6.0 | Sine wave sub-drone, detune 2 |
| | `ensemble` | Ensemble | `pad` | 1600 | 4.5 | Triangle rich pad, detune 11 |
| **MOSS** | `marimba` | Marimba | `wood` | 1700 | 0.8 | Sine + 4th harmonic wood overtone |
| | `kalimba` | Kalimba | `wood` | 2800 | 1.4 | Sine + 3rd harmonic metallic wood |
| | `wood` | Wood click | `wood` | 1200 | 0.22 | Short high-Q click, ratio 4.1 |
| | `tom` | Low tom | `kick` | 1500 | 0.4 | Sweep 105 Hz → 36 Hz |
| **AURA** | `wind` | Wind | `noise` | 700 | 5.0 | Lowpass filtered ambient drone noise |
| | `water` | Water hush | `noise` | 1300 | 3.5 | Bandpass organic noise wash |
| | `rustle` | Rustle | `noise` | 2200 | 2.8 | Bandpass ambient rustle texture |

### 3.2. Мир REACTOR (32 сэмплерных пресета)
Базируется на 130 локальных CC0 FLAC/PCM аудиосэмплах, декодированных в оперативной памяти (`src/samples.js`).

| Банк слота | Пресет ID | Название | Движок | Сэмплерный банк | Перегруз (Drive) | Фильтр / Характеристики |
|---|---|---|---|---|---|---|
| **GLASS** | `reactor-dry-kick` | Dry rock kick | `kick` | `kick-damped` | — | Lowpass 3500 Hz, decay 0.22s, start 180 Hz |
| | `reactor-arena-kick` | Arena kick | `kick` | `kick-open` | — | Lowpass 2800 Hz, decay 0.38s, start 145 Hz |
| | `reactor-attack-kick` | Attack kick | `kick` | `kick-damped` | — | Lowpass 5200 Hz, decay 0.18s, start 210 Hz |
| | `reactor-machine-kick` | Machine kick | `kick` | `kick-open` | 3.0 | Lowpass 4100 Hz, decay 0.25s, start 160 Hz |
| **TIDAL** | `reactor-dry-snare` | Crack snare | `snare` | `snare-center` | — | Lowpass 7200 Hz, decay 0.16s, body 190 Hz |
| | `reactor-steel-snare` | Edge snare | `snare` | `snare-edge` | — | Lowpass 9000 Hz, decay 0.23s, body 240 Hz |
| | `reactor-heavy-snare` | Heavy snare | `snare` | `snare-rim` | — | Lowpass 4800 Hz, decay 0.28s, body 150 Hz |
| | `reactor-arena-snare` | Layered snare | `snare` | `snare-layer` | — | Lowpass 6500 Hz, decay 0.36s, body 180 Hz |
| **ROOT** | `reactor-tight-hat` | Tight hat | `metal` | `hat-tight` | — | Highpass 9500 Hz, decay 0.055s |
| | `reactor-open-hat` | Open rock hat | `metal` | `hat-open` | — | Highpass 7500 Hz, decay 0.32s |
| | `reactor-ride` | Ride bell | `metal` | `ride` | — | Highpass 5200 Hz, decay 0.45s, bell 310 Hz |
| | `reactor-crash` | Crash cymbal | `metal` | `crash` | — | Highpass 6200 Hz, decay 1.30s |
| **EMBER** | `reactor-floor-tom` | Floor tom | `tom` | `tom-floor` | — | Lowpass 2200 Hz, decay 0.46s, start 100 Hz |
| | `reactor-mid-tom` | Mid tom | `tom` | `tom-mid` | — | Lowpass 3000 Hz, decay 0.32s, start 145 Hz |
| | `reactor-high-tom` | High tom | `tom` | `tom-high` | — | Lowpass 4200 Hz, decay 0.24s, start 205 Hz |
| | `reactor-war-tom` | War tom | `tom` | `tom-war` | 2.0 | Lowpass 1800 Hz, decay 0.65s, start 80 Hz |
| **RAIN** | `reactor-pick-bass` | Pick bass | `rockbass` | `bass-pick` | 1.4 | Range 26–45, decay 0.30s, cab 3200 Hz |
| | `reactor-tube-bass` | Tube bass | `rockbass` | `bass-finger` | 2.8 | Range 26–45, decay 0.40s, cab 3200 Hz |
| | `reactor-fuzz-bass` | Fuzz bass | `rockbass` | `bass-pick` | 5.0 | Range 26–45, decay 0.32s, cab 3200 Hz |
| | `reactor-muted-bass` | Muted bass | `rockbass` | `bass-finger` | 1.8 | Range 26–45, decay 0.17s, cab 3200 Hz |
| **VEIL** | `reactor-palm-guitar` | Palm mute | `guitar` | `guitar-direct` | 5.0 | Range 31–90, decay 0.16s, damping 0.965 |
| | `reactor-power-guitar` | Open power chords | `guitar` | `guitar-dist` | — | Range 31–90, decay 0.65s, damping 0.995 |
| | `reactor-crunch-guitar` | Dry crunch | `guitar` | `guitar-direct` | 2.5 | Range 31–90, decay 0.27s, damping 0.982 |
| | `reactor-gain-guitar` | High gain | `guitar` | `guitar-dist` | — | Range 31–90, decay 0.42s, damping 0.990 |
| **MOSS** | `reactor-singing-lead` | Singing lead | `guitar` | `guitar-dist` | — | Range 31–90, decay 1.20s, damping 0.997 |
| | `reactor-octave-lead` | Octave lead | `guitar` | `guitar-dist` | — | Range 31–90, decay 0.50s, octave double |
| | `reactor-picked-lead` | Picked lead | `guitar` | `guitar-direct` | 2.0 | Range 31–90, decay 0.25s, damping 0.982 |
| | `reactor-feedback-lead`| Sustained lead | `guitar` | `guitar-dist` | — | Range 31–90, decay 1.70s, damping 0.998 |
| **AURA** | `reactor-attack-piano` | Attack piano | `piano` | `piano` | — | Range 42–86, decay 0.80s |
| | `reactor-dark-piano` | Dark piano | `piano` | `piano` | — | Range 42–86, decay 1.30s, lowpass 2600 Hz |
| | `reactor-analog-arp` | Analog arpeggio | `rocksynth` | `synth-arp` | 1.2 | Range 35–85, decay 0.19s |
| | `reactor-cut-synth` | Cutting synth | `rocksynth` | `synth-cut` | 2.2 | Range 35–85, decay 0.45s |

### 3.3. Моделирование перегруза и кабинета (Drive & Cabinet DSP)
Для инструментов с параметром `drive > 0`:
1. `WaveShaperNode` с гиперболической тангенциальной кривой насыщения:
   $$y = \frac{\tanh(x \cdot \text{drive})}{\tanh(\text{drive})}$$
2. Highpass фильтр удаления постоянной составляющей (DC offset): частота 35 Гц.
3. Lowpass фильтр кабинета динамика: частота 3200 Гц (для баса) или 5500 Гц (для гитары), добротность $Q = 0.5$.

---

## 4. Параметры дорожек и нормализация (Track Parameters)

Все регуляторы дорожек в проекте HALO нормализованы к целым числам в диапазоне **0..100**.

### Математические формулы пересчета в физические величины

| Параметр | Технический ID | Диапазон | Значение по умолчанию | Физическая величина | Математическая формула пересчета в Web Audio |
|---|---|---|---|---|---|
| **Характер** | `character` | `0 .. 100` | 50 | Частота среза фильтра (Гц) | $f = \text{clamp}\left(100, \text{sampleRate} \cdot 0.42, \text{tone} \cdot 2^{\frac{\text{character} - 50}{45}}\right)$ |
| **Длительность** | `duration` | `0 .. 100` | 50 | Время затухания/релиза (сек) | $t = \text{clamp}\left(0.08, \text{maxDuration}_{\text{role}}, \text{decay} \cdot \left(0.35 + \frac{\text{duration}}{100} \cdot 1.3\right)\right)$ |
| **Пространство** | `space` | `0 .. 100` | 50 | Коэффициент посыла в ревербератор | $\text{gain}_{\text{rev}} = \frac{\text{space}}{100} \cdot 0.80$ |
| **Плотность** | `density` | `0 .. 100` | 65 | Вероятность срабатывания нот | Thinning с весовыми коэффициентами акцента (пороги: $100\%$ — все ноты; $\ge 35\%$ — даунбиты foundation; $< 35\%$ — прореживание синкоп) |
| **Уровень** | `level` | `0 .. 100` | 65 | Коэффициент усиления трека | $\text{gain}_{\text{track}} = \frac{\text{level}}{100} \cdot 4.0 \cdot \text{ensembleGain}$ |
| **Посыл дилея** | `delay` | `0 .. 100` | 0 | Коэффициент посыла в дилей | $\text{gain}_{\text{delay}} = \frac{\text{delay}}{100} \cdot 0.70$ |
| **Время дилея** | `delayTime` | `['1/16','1/8','1/8d','1/4']` | `'1/8'` | Длительность эхо относительно BPM | $t_{\text{delay}} = \frac{60}{\text{BPM}} \cdot \text{mult}$, где mult $\in \{0.25, 0.5, 0.75, 1.0\}$ |
| **Посыл хоруса** | `chorus` | `0 .. 100` | 0 | Коэффициент посыла в стереохорус | $\text{gain}_{\text{chorus}} = \frac{\text{chorus}}{100} \cdot 0.75$ |

### Полиметрический цикл дорожки (`sequence`)
Каждая дорожка имеет независимый цикл, синхронизированный с абсолютным транспортом:
- `length`: число локальных шагов в цикле (`4 .. 32`, по умолчанию `16`).
- `stepLength`: длительность одного локального шага в шестнадцатых (`1` = 1/16, `2` = 1/8, `4` = 1/4).
- `offset`: фазовый сдвиг начала цикла (`0 .. length - 1`).

#### Вероятностные коридоры генерации циклов в СОЗДАТЬ / GENERATE (`src/sounds.js`)
При генерации фразы длина цикла и шаг дорожки гармонично варьируются в зависимости от роли (принцип «без фанатизма»):
- **`pulse`**: 85% `{16, 1}`, 10% `{8, 2}`, 5% `{32, 1}` (сохранение фундамента)
- **`accent`**: 85% `{16, 1}`, 10% `{8, 1}`, 5% `{32, 1}` (сохранение бэкбита)
- **`percussion`**: 60% `{16, 1}`, 15% `{12, 1}`, 10% `{8, 1}`, 8% `{14, 1}`, 7% `{16, 2}`
- **`texture`**: 55% `{16, 1}`, 20% `{8, 2}`, 15% `{16, 2}`, 10% `{8, 4}`
- **`bass`**: 80% `{16, 1}`, 10% `{8, 2}`, 6% `{12, 1}`, 4% `{32, 1}`
- **`melody`**: 75% `{16, 1}`, 15% `{16, 2}`, 6% `{32, 1}`, 4% `{8, 1}`
- **`arpeggio`**: 50% `{16, 1}`, 18% `{12, 1}`, 12% `{8, 1}`, 10% `{14, 1}`, 6% `{6, 1}`, 4% `{8, 2}`
- **`harmony`**: 60% `{16, 1}`, 18% `{8, 2}`, 12% `{16, 2}`, 10% `{8, 4}`
- **Фазовый сдвиг (`offset`)**: Для ролей `arpeggio` и `percussion` с вероятностью 20% выбирается тонкий фазовый сдвиг `0 .. min(4, length - 1)`.

---

## 5. Аудиограф и мастер-секция (Audio Graph & Master Chain)

```
[Voice Oscillator / Sample Source]
                 │
                 ▼
       [BiquadFilter (Cutoff)]
                 │
        [Drive & Cabinet] (optional)
                 │
           [Voice Gain]
                 │
           [Track Gain] (level * 4 * ensembleGain)
         ┌───────┼──────────────────────────────┬────────────────────────┐
         │       │                              │                        │
         ▼       ▼                              ▼                        ▼
     [Reverb] [Delay]                        [Chorus]               [Stereo Panner]
     Send     Send                           Send                   pan * (width/100)
         │       │                              │                        │
         ▼       ▼                              ▼                        │
     [Reverb] [Delay 4-Tap Line]            [Stereo Chorus]              │
     Convolver Feedback 0.36, LP 3400 Hz    LFO 0.65/0.82 Hz             │
     Wet 0.20 Wet 0.52                      Wet 0.50                     │
         │       │                              │                        │
         └───────┴──────────────┬───────────────┴────────────────────────┘
                                │
                                ▼
                        [Master Gain Bus] (masterVolume / 100)
                                │
                                ▼
                         [Headroom Gain] (1.0)
                                │
                                ▼
                   [Master 3-Band Biquad EQ]
                   - Lowshelf:  120 Hz,  Q 0.7, -9..+9 dB
                   - Peaking:   1000 Hz, Q 0.7, -9..+9 dB
                   - Highshelf: 6000 Hz, Q 0.7, -9..+9 dB
                                │
                                ▼
                 [Dynamics Peak Compressor / Limiter]
                 - Threshold: -1 dB
                 - Knee: 0 dB
                 - Ratio: 20:1
                 - Attack: 0.002 s
                 - Release: 0.08 s
                                │
                                ▼
                     [AudioContext.destination]
```

### Панорамирование инструментов по умолчанию
Вектор базового стереорасположения:
$$\text{Pan}_{\text{base}} = [-0.06, +0.08, -0.55, +0.50, -0.14, +0.40, -0.70, +0.70]$$
- Дорожки с ролями `pulse`, `kick`, `bass` принудительно центрируются ($\pm 0.06$).
- Результирующая панорама масштабируется регулятором `width`: $\text{Pan} = \text{Pan}_{\text{base}} \cdot \frac{\text{width}}{100}$.

---

## 6. Гармоническая модель и Квинтовый круг (Harmony Matrix)

### Структура 24 тональностей (Квинто-квартовый круг с параллельными парами)
HALO объединяет **24 тональности** (12 минорных и 12 параллельных мажорных), расположенных непрерывной цепочкой вдоль Квинтового круга: чередование параллельной пары (0 знаков различия) и модуляции на чистую квинту/кварту (строго 1 знак различия):

```
Индекс: 0        1        2        3        4        5        6        7
Имя:    D MINOR  F MAJOR  C MAJOR  A MINOR  E MINOR  G MAJOR  D MAJOR  B MINOR
Тоника: D        F        C        A        E        G        D        B
Лад:    minor    major    major    minor    minor    major    major    minor
Сдвиг:  0        +3       -2       -5       +2       +5       0        -3

Индекс: 8        9        10       11       12       13       14       15
Имя:    F♯ MINOR A MAJOR  E MAJOR  C♯ MINOR G♯ MINOR B MAJOR  F♯ MAJOR D♯ MINOR
Тоника: F♯       A        E        C♯       G♯       B        F♯       D♯
Лад:    minor    major    major    minor    minor    major    major    minor
Сдвиг:  +4       -5       +2       -1       +6       -3       +4       +1

Индекс: 16       17       18       19       20       21       22       23
Имя:    A♯ MINOR C♯ MAJOR G♯ MAJOR F MINOR  C MINOR  D♯ MAJOR A♯ MAJOR G MINOR
Тоника: A♯       C♯       G♯       F        C        D♯       A♯       G
Лад:    minor    major    major    minor    minor    major    major    minor
Сдвиг:  -4       -1       +6       +3       -2       +1       -4       +5
```

### Мгновенное переключение параллельного лада (`toggleMode()`)
Поскольку параллельные тональности расположены парами $(2k \leftrightarrow 2k+1)$, клик по названию тональности в интерфейсе или вызов `toggleMode()` мгновенно переключает лад:
$$K_{\text{toggle}} = \begin{cases} K + 1, & K \text{ четный (minor} \to \text{major)} \\ K - 1, & K \text{ нечетный (major} \to \text{minor)} \end{cases}$$
При этом ключевые знаки и звукоряд остаются на 100% идентичными, кардинально меняя эмоциональный окрас музыки без малейшего фальшивого диссонанса.

### Гармоническая 4-тактовая сетка аккордов

#### Минорный лад (Aeolian Mode, `mode = 'minor'`)
Интервалы ступеней: `[0, 2, 3, 5, 7, 8, 10]`.  
4-тактовая последовательность септаккордов (базовый Ре-минор):
- **Такт 0:** `[50, 53, 57, 60]` — $Dm^7$ (тоника, ступени I, bIII, V, bVII)
- **Такт 1:** `[46, 50, 53, 57]` — $B\flat^{\text{maj}7}$ (субдоминантовая группа, ступени VI, I, bIII, V)
- **Такт 2:** `[53, 57, 60, 64]` — $F^{\text{maj}7}$ (параллельный мажор, ступени bIII, V, bVII, IX)
- **Такт 3:** `[48, 52, 55, 60]` — $C^7$ (доминантовая ступень, ступени bVII, II, IV, I)

#### Мажорный лад (Ionian Mode, `mode = 'major'`)
Интервалы ступеней: `[0, 2, 4, 5, 7, 9, 11]`.  
4-тактовая последовательность диатонических септаккордов:
- **Такт 0:** `[0, 4, 7, 11]` — $I^{\text{maj}7}$ (тонический большой мажорный септаккорд)
- **Такт 1:** `[5, 9, 12, 16]` — $IV^{\text{maj}7}$ (субдоминантовый большой мажорный септаккорд)
- **Такт 2:** `[7, 11, 14, 17]` — $V^7$ (доминантсептаккорд)
- **Такт 3:** `[4, 7, 11, 14]` — $iii^7$ (медианта, малый минорный септаккорд)

При смене тональности на индекс $K$ все ноты сдвигаются на `offsets[K]`.

### Автоматическая модуляция (AUTO KEY)
При включенном `autoKey` в конце каждого фразового цикла происходит детерминированный шаг:
$$K_{\text{next}} = (K + 1) \pmod{24}$$
Это обеспечивает модуляцию исключительно в соседнюю родственную тональность квинтового круга (максимум один знак различия: либо параллельный лад, либо чистая квинта/кварта).

---

## 7. Фразы, композиция и аранжировка (Song Architecture)

### 7.1. Сущность `Phrase`
Фраза — неделимый снимок состояния 8 дорожек:
- Длина: 4 или 8 тактов.
- Содержит: `setup`, `tempo`, `masterVolume`, `mix`, `seed`, `key`, массив из 8 дорожек (`tracks`).
- Дорожка может содержать либо генеративные параметры, либо массив точных сохраненных шестнадцатых шагов (`manualSteps`), либо явные нотные события (`noteEvents`).

### 7.2. Сущность `Section`
Секция композиции ссылается на существующую фразу:
```json
{
  "phrase": 1,
  "repeats": 2,
  "name": "verse",
  "fade": "none"
}
```
- Допустимые имена: `'intro'`, `'verse'`, `'verse2'`, `'chorus'`, `'bridge'`, `'outro'`, `'phrase'`.
- Допустимые фейды: `'none'`, `'in'`, `'out'`.
- Повторы: целое число `1 .. 8`.

### 7.3. Автоматическая 8-частная аранжировка (`src/arranger.js`)
При генерации полной песни на основе куплета создается драматургическая форма на 56 тактов:
1. `intro` (4 такта, fade in, разреженная фактура)
2. `verse` (8 тактов, исходный куплет)
3. `chorus` (8 тактов, кульминация, плотная гармония)
4. `verse2` (8 тактов, вариация куплета)
5. `chorus` (8 тактов, связанный повтор припева)
6. `bridge` (8 тактов, контрастный ритмический рисунок)
7. `chorus` (8 тактов, финальный припев)
8. `outro` (4 такта, fade out, разрежение до тишины)

---

## 8. Форматы сохранения и URL-шеринг (Persistence)

### 8.1. Формат `notbad-halo-project` (v1)
Максимальный размер: 64 КиБ. Строгая валидация полей через `HaloProject.validate()`.

### 8.2. Формат `halo-composition` (v1)
Максимальный размер: 512 КиБ. Хранит массив `phrases` и порядок секций `sections`.

### 8.3. Сжатый URL-токен
Использует поток сжатия `CompressionStream('deflate-raw')` с кодированием в безопасный алфавит Base64URL (`#loop=` или `#song=`). Ограничение длины URL: не более 24 000 символов.

---

## 9. Визуальная подсистема (Visual Engine: Classic, Cosmic, Hyper)

Визуальная подсистема HALO строго подчинена принципу *«Звук важнее зрелища»*: визуал считывает тайминги Web Audio и фазы нот, но никогда не запускает аудиособытия из `requestAnimationFrame`.

### 9.1. Геометрические сцены (Scenes)
- **`ORBIT`:** Концентрические круговые орбиты с гармоническими фазовыми возмущениями.
- **`BLOOM`:** Фазовые цветочные лепестки с полярной модуляцией радиуса.
- **`CURRENT`:** Струящиеся параллельные потоки с гармоническими сдвигами волн.

### 9.2. Режимы движения (Motion Modes)
- **`DRIFT`:** Свободное непрерывное космическое скольжение голосов.
- **`IN TIME`:** Строгая синхронизация с часами такта (встреча правой оси на ключевых долях).
- **`PHRASE`:** Один оборот за 4 или 8 тактов (64 или 128 шагов) с интерактивным предпросмотром нотных маркеров и пропусков.

### 9.3. Режимы кометных хвостов (Comet Trails)
HALO поддерживает три режима визуализации комет:
1. **`CLASSIC`:** Минималистичные световые траектории (24-точечный след с деликатным затуханием).
2. **`COSMIC`:** 8 процедурных кометных сигнатур (призмы, ленты, кольца давления, искры, капли, шелк, споры, спираль), деликатная серпантинная волна траектории и WebGL2-туманность.
3. **`HYPER`:** Сверхдинамичные гипер-хвосты комет с глубокой аудио-реактивностью, элегантным коническим сужением фонового свечения, органической волновой «змейкой» вдоль орбиты, плавным растворением кончика хвоста в пространстве и **кардинально разными спецэффектами** для каждой из восьми дорожек:
   - **Дорожка 0 (GLASS / Pulse):** *Плазменная молния (Plasma Lightning Bolt)* — высокочастотные зигзагообразные разряды, ветвящиеся электрические дуги Теслы, ослепительно белое ядро и взрывная радиальная плазменная волна на триггерах бочки.
   - **Дорожка 1 (TIDAL / Accent):** *Хроматические вихревые ленты (Chromatic Vortex Ribbons)* — трехполосные 3D-переплетенные волновые ленты с перекрестными световыми перемычками и спиральными звездными частицами.
   - **Дорожка 2 (ROOT / Percussion):** *Сейсмические ударные алмазы (Seismic Shock Diamonds)* — серия сверхзвуковых компрессионных алмазных ячеек Маха с силовыми экранами и ударными кольцами сжатия.
   - **Дорожка 3 (EMBER / Texture):** *Протуберанцы солнечного огня (Solar Flare Firestorm)* — закручивающиеся магнитные корональные петли, конвективный турбулентный огненный шлейф и рой светящихся раскаленных искр.
   - **Дорожка 4 (RAIN / Bass):** *Киберпанк-лазерная сетка (Cyberpunk Laser Grid)* — квантованный цифровой осциллограф с прямоугольными ступенями, голографическими стрелками-шевронами и матричными лазерными визирами.
   - **Дорожка 5 (VEIL / Melody):** *Небесная спираль мандалы (Celestial Mandala Spiral)* — логарифмические спиральные галактические рукава, геометрическая паутина созвездий и вращающиеся 8-лучевые алмазные звезды.
   - **Дорожка 6 (MOSS / Arpeggio):** *Призматические осколки кристаллов (Prismatic Crystal Shards)* — парящие в 3D ограненные полигональные кристаллы, преломляющие радужные лучи дисперсии света с яркими бликами на гранях.
   - **Дорожка 7 (AURA / Harmony):** *Гиперпространственный тоннель (Hyperspace Warp Tunnel)* — 3D-перспективные кольца гиперпрыжка, тахионные световые лучи скорости света и струящиеся паруса размерности.

### 9.4. Оптимизация и доступность
- **Органическая серпантинная волна:** Нежная бегущая волна перпендикулярно вектору движения кометы (`snake`), создающая живое волнообразное движение без смещения ядра кометы.
- **Плавное затухание (Tip Dissolve):** Коническое сужение полигона фонового ореола и степенной спад прозрачности (`Math.pow(1 - f, 1.3..1.6)`), исключающий резкие обрывы на конце хвоста.
- **Canvas 2D Fallback:** Полная функциональность без WebGL2.
- **Mobile Tier (`small`):** Автоматическое масштабирование и снижение плотности шагов траекторий на экранах шириной < 700px.
- **Reduced Motion:** При включенном `prefers-reduced-motion` устраняются резкие вспышки, отключен джиттер и серпантинная волна, а геометрия инвариантна ко времени (стабильные замкнутые формы).

---

## 10. Фоновое воспроизведение и деплой (Background Playback & Deployment)

### 10.1. Фоновое воспроизведение (Background Playback Engine)
- **Параметр:** `clean.ui.backgroundAudio` (boolean, по умолчанию `false`).
- **Интерфейс:** Кнопка `#bgAudio` на верхней панели рядом с `#visualOnly` с наглядной иконкой окна и звучащей ноты.
- **Поведение при потере фокуса / сворачивании:**
  - При `backgroundAudio === false` (стандартное поведение): событие `visibilitychange` при скрытии вкладки останавливает интервал планировщика и переводит `AudioContext` в состояние `suspend()`, сохраняя заряд батареи и процессорное время.
  - При `backgroundAudio === true`: `visibilitychange` не гасит звук и не приостанавливает аудиоконтекст.
  - **Адаптивный планировщик опережения (Lookahead Adaptation):** современные браузеры (Chrome, Firefox, Safari) принудительно троттлят таймеры `setInterval`/`setTimeout` в фоновых вкладках до 1000 мс. Обычного окна планирования 160 мс (`now + .16`) недостаточно — возникали бы выпадения звука. При `document.hidden && backgroundAudio` планировщик `schedule()` динамически расширяет окно планирования до **1.5 секунды** (`now + 1.5`, лимит до 192 тиков). Ноты заблаговременно передаются в аппаратный аудиопоток браузера, обеспечивая безупречно плавное воспроизведение даже в свернутом окне.
- **Персистентность:** Состояние сохраняется в `localStorage` и восстанавливается при перезагрузке страницы.

### 10.2. Надежный статический деплой на GitHub Pages
- **Конфигурация:** `.github/workflows/deploy.yml` с поддержкой автоматического деплоя при пуше в `main` и ручного запуска (`workflow_dispatch`).
- **Таймаут CDN:** Параметр `timeout: 1200000` (20 минут) для `actions/deploy-pages@v4`, предотвращающий таймауты при синхронизации и прогреве кэша для статических аудио-паков мира REACTOR.
- **Нулевая сборка:** Архитектура проекта не требует компиляции или пакетирования (Node/Vite/Webpack), гарантируя 100% совместимость со статическим хостингом.


