### Implemented — 2026-10-17: 3/4 & 6/8 Meter Arranger Assembly & AudioContext Closed Guard

- **Arranger 3/4 & 6/8 Meter Assembly (`src/arranger.js`, `src/song.js`, `src/song-ui.js`):**
  - Resolved `INVALID_STEPS: steps for track "GLASS" must be unique integers between 0 and 47` occurring when assembling compositions («Собрать композицию») with 3/4 meter (3/4 waltz and 6/8 pirate swing).
  - Dynamically computes steps per bar (`spb = timeSignature === '3/4' ? 12 : 16`) across all section development phases (`intro`, `verse`, `chorus`, `bridge`, `outro`).
  - Constrains step bounds in 4-bar intro/outro (`p.bars * spb = 48`) to indices 0..47 instead of hardcoded 0..63.
  - Updates note pitch resolution (`pitch(i, step)`) to use `Math.floor(step / spb)` and `step % spb` with active `timeSignature`.
  - Preserves `timeSignature: '3/4'` at the root of `halo-composition` across `Arranger.build()`, `Song.validate()`, and `song-ui.js` state.
  - Updated `visualGain(step)` in `src/song-ui.js` to compute phrase step length dynamically using each phrase's time signature.
- **Closed AudioContext Node Connection Guard (`src/live-loop.js`):**
  - Resolved browser console warnings: `Connecting nodes after the context has been closed is not useful.`
  - `updateMixerNodes(at)` in `src/live-loop.js` now verifies `activeAudio.ctx.state !== 'closed'` before creating or connecting mixer and delay send nodes.

### Implemented — 2026-10-17: Revision Reset Guarantees, project.patch & Bank Alias Resolution

- **Project Revision Baseline Reset (`src/agent.js`, `src/file-bridge.js`):**
  - Resetting local changes or calling `resetProject()` resets the internal revision accumulator back to 0 (`revision = 0; last = '';`), ensuring the restored baseline project is always at `revision: 1`.
  - Fixes `CONFLICT_REVISION_MISMATCH` where resetting a project that had advanced to high revision numbers (e.g. 13) left external AI models assuming a clean project started at `baseRevision: 1`.
  - Error guidance in `generateErrorGuidance` now explicitly reports the exact required revision number: `The project is currently at revision ${rev}. Read "revision" from project-state.json and set "baseRevision": ${rev} in your request.`
  - `resetLocalChanges()` now fully purges `processedContent`, `processedIds`, and `appliedIds`, and populating `state.pending` clears stale error banners (`state.lastResult = null; state.error = null;`).
- **Support for `project.patch` and Partial `project.replace` (`src/agent.js`):**
  - Added `project.patch` as an allowlisted operation in `capabilities()` and `preview()` for partial modifications of project-level properties (`setup`, `world`, `bars`, `tempo`, `masterVolume`, `mix`, `timeSignature`, etc.).
  - Partial `project.replace` tolerance: if an external model submits `project.replace` with `values` or top-level properties instead of the full 8-track array, the engine gracefully treats it as a project patch instead of throwing `MISSING_PAYLOAD`.
- **Role and Bank Alias Resolution & Auto-Locating Sounds (`src/project.js`):**
  - Added comprehensive slot/bank alias mapping in `validateTrack` supporting intuitive musical labels (`BASS`, `KEYS`, `LEAD`, `RIFF`, `PERC`, `KICK`, `SNARE`, `BELL`, etc.) mapping directly to canonical orbit slots (`GLASS`..`AURA`).
  - Automatic cross-bank sound resolution: if a sound belongs to another bank of the active setup (e.g. `sound: "harp"` specified under `GLASS`), the track's canonical slot/instrument is automatically updated to the bank owning that sound (`MOSS` or `EMBER`).

### Implemented — 2026-10-17: Sound World & Vibe Setup Availability and AI Self-Correction Protocol

- **Vibe & Setup Sound Availability (`src/sounds.js`, `src/roles.js`, `src/file-bridge.js`):**
  - Clarified and formalized that instruments and motifs are strictly tied to sound worlds/setups (`ambient` vs `reactor`).
  - Added explicit `setups` array (`['ambient']`, `['reactor']`, or multi-setup `['ambient', 'reactor']`) on every preset definition.
  - `instruments.json` now exposes `vibeAndSetupPolicy`, `canonicalId`, `setups: [...]`, and role-level `soundsBySetup: { ambient: [...], reactor: [...] }` so external agents immediately understand which sounds belong to which vibe.
  - Setup auto-detection and aliases:
    - Added support for `setup`, `world`, and `soundWorld` aliases across `project.js` and `agent.js`.
    - Automatic inference: if `setup` is omitted from `project.replace` but reactor presets are selected, the engine automatically resolves `setup = 'reactor'`.
    - Preset prefix stripping: tolerate names like `reactor-dry-kick` or `dry-kick`.
- **Actionable AI Error Self-Correction & File Modification Retry (`src/file-bridge.js`, `src/project.js`):**
  - Enhanced error messages for `INVALID_SOUND` and schema errors with explicit corrective guidance (`help`) and actionable instructions (`instructionForAgent`).
  - Agents are explicitly informed to either set `"setup": "reactor"` (or `"world": "reactor"`) or pick sounds available in `ambient`.
  - File Bridge now tracks content hashes/text (`processedContent = new Map()`) instead of merely request IDs: when an external agent modifies an existing failed request file in `requests/`, HALO automatically re-evaluates the updated content, clears stale error `.result.json` files and bridge errors, and moves the valid proposal into `state.pending` for human approval.

### Implemented — 2026-10-17: AI File Bridge Anti-Hallucination & Zero-Execution Protocol

- **Zero Localhost & Zero CLI Prohibitions (`AGENT_GUIDE.md`, `src/file-bridge.js`, `.agents/rules/`):**
  - Strict architectural guarantees eliminating LLM hallucination of backend servers, localhost ports, CLI binaries, and endless polling loops:
    - HALO runs 100% client-side in the browser via Web Audio and the File System Access API; there is **NO backend server, NO local HTTP daemon, NO API port** (no port 3000, 3001, 8080, 5173), and **NO CLI command** (`halo`).
    - External agents are strictly prohibited from executing `curl`, `netstat`, `node`, `npm`, `python`, `where.exe halo`, or port scans to "ping" or "execute" HALO.
    - External agents are strictly prohibited from launching browser windows or opening `localhost` / `file://` URLs.
  - **Asynchronous Human-in-the-Loop & Immediate Turn Termination:**
    - HALO enforces human review and approval in the browser UI before applying changes. Results in `responses/` are generated asynchronously only after the user clicks «Apply Changes».
    - External models must NEVER wait, sleep, or poll for `responses/` during request creation turns. If user prompts mention "verify that the response confirms application", agents must treat this asynchronously: assemble and validate the batch in-memory, write to `requests/<requestId>.json`, output a clear notification directing the user to approve the change in HALO, and **STOP IMMEDIATELY**.

### Implemented — 2026-10-17: Authentic 3/4 Waltz & 6/8 Pirate Swing Pattern Generation in СОЗДАТЬ

- **Мировые стандарты ритма и паттернов (`src/phrases.js`):**
  - Созданы два авторских каталога по 10 профессиональных ритмических паттернов для каждой из 14 музыкальных ролей: `catalog3_4_waltz` (4 такта, 48 шагов) и `catalog6_8_swing` (8 тактов, 96 шагов). Каталог 4/4 (`catalog`) сохранен в исходном виде для 100% обратной совместимости.
  - **3/4 Вальс (4 такта = 48 шагов, 12 шестнадцатых на такт):**
    - Каноническая оркестровка **«Бум — Чак — Чак»**: бас и бочка берут сильную 1-ю долю (шаг 0), малый барабан, щелчки, клавиши и аккорды — слабую 2-ю и 3-ю доли (шаги 4 и 8).
    - Лирические парящие мелодии с широкими фразовыми лигами, каскадные 3-дольные арпеджио и шагающий вальсовый бас.
    - Метрические акценты динамики: сильная доля 0 (velocity 0.88), доли 4 и 8 (velocity 0.78).
  - **6/8 Пиратский свинг (8 тактов = 96 шагов, 12 шестнадцатых на такт):**
    - Качающийся грув морской баллады / пиратской саги в духе Ханса Циммера (*Pirates of the Caribbean*).
    - Две составные пунктирные доли на такт (шаги 0 и 6) с мощным свингующим бэкбитом на 6.
    - Пульсирующие маршевые восьмые `[0, 2, 4, 6, 8, 10]`, дактилический галоп `[0, 3, 4, 6, 9, 10]` и героические риффы.
    - Метрические акценты динамики: первичный составной импульс 0 (velocity 0.90), вторичный бэкбит 6 (velocity 0.86).
- **Полиметрические коридоры циклов под размерность (`src/sounds.js`):**
  - Добавлены адаптивные профили `cycleProfiles3_4` и `cycleProfiles6_8`:
    - 3/4 вальс: 12 шагов (1/16), 6 шагов (1/8), 24 шага (2 такта), 9 шагов (3-дольная гемиола).
    - 6/8 свинг: 12 шагов (1/16), 6 шагов (1/8), 24 шага, 8 шагов (полиметрия 2-против-3).
  - В 6/8 свинге приоритет отдается задержке с точкой `1/8d`.
- **Гармоническая поддержка и роли (`src/roles.js`):**
  - Динамическое масштабирование шагов в такте (`spb = 12` при 3/4 и 6/8).
  - Корневые смены баса согласованы с составными долями: `original % 6 === 0` в 8 тактах (6/8), `original % 4 === 0` в 4 тактах (3/4).
- **Синхронизация интерфейса и визуализации (`index.html`):**
  - Подсветка долей в PHRASE орбите и сетке редактора: сильные доли каждые 4 шага в 3/4 вальсе, каждые 6 шагов в 6/8 свинге.
  - Кнопка «СОЗДАТЬ» (GENERATE) генерирует сбалансированные аккомпанирующие партии в выбранной метрике.

### Implemented — 2026-10-17: File Bridge Persistence, Composition Safety Cap & Sound Worlds API

- **File Bridge Directory Persistence (`src/file-bridge.js`):** Connected desktop Chrome/Edge `FileSystemDirectoryHandle` is stored in browser IndexedDB (`halo-file-bridge-v1` / `handles` / `last-directory`).
  - On page refresh, if browser permission was retained (`'granted'`), bridge auto-reconnects with 0 clicks.
  - If browser requires user activation gesture (`'prompt'`), UI displays a prominent 1-click `🔓 Reconnect «[Folder]»` button, eliminating the need to pick the directory again.
  - Users can also choose a different folder (`📁 Choose other`) or forget the saved connection (`✕ Forget`).
  - `dispose()` cleans up polling intervals and listeners without discarding the saved handle from IndexedDB; only explicit `disconnect()` clears it.
- **Composition Safety Limit (`src/song.js`):** Hard code-level cap of **maximum 15 unique phrases** (`MAX_PHRASES = 15`) and 32 sections (`MAX_SECTIONS = 32`) to prevent memory issues or runaway loops.
- **AI Agent Composition Canon:**
  - Strict rule: By default without explicit user instruction, HALO works strictly with **single phrases/loops** (`track.patch`, `phrase.patch`).
  - Full compositions (`composition.replace`) are created strictly when the user explicitly asks for a full song/composition ("песня", "полная композиция", "аранжировка").
  - Full songs follow canonical structure: *Intro → Verse → Chorus → Verse 2 → Bridge → Outro*, reusing phrase IDs via section repeats (`repeats: 1..8`).
- **Sound World Switching in API (`setup: 'ambient' | 'reactor'`):**
  - All phrases in a composition must share the same `setup`.
  - Deep acoustic differentiation:
    - `ambient`: 100% procedural real-time Web Audio synthesis, pure sines, FM bells, warm sub-bass, filtered pink noise, spacious reverb (35..80%), meditative tempo (60..85 BPM).
    - `reactor`: 32 organic presets backed by 130 authentic CC0 acoustic/electric recordings (drums, overdriven rock bass, guitars, acoustic piano, brass), punchy mix (space: 10..30%), energetic tempo (90..140 BPM, or 6/8 pirate swing in 3/4 8 bars).

### Implemented — 2026-10-16: File Bridge and Integration Mode Switcher

- Dual agent integration modes in AI / Agents tab: **WebMCP** and **File Bridge**, persisted in `localStorage['halo-agent-bridge-mode']`.
- **File Bridge (`src/file-bridge.js`):** Desktop Chrome/Edge native `window.showDirectoryPicker` integration without polyfills, servers, or external libraries. Fully static and compatible with GitHub Pages.
- Automatic context export into `HALO-Bridge/`: `AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, and read-only `project-state.json`.
- Strict incoming request protocol via `requests/*.json` and `responses/*.result.json`:
  - No silent auto-apply: requests are validated, revision-checked, and presented in the UI with explicit «Apply Changes» and «Reject» buttons.
  - Required fields: `requestId`, `schemaVersion: 1`, `baseRevision`, and allowlisted operations array (`track.patch`, `phrase.patch`, `master.patch`, `project.patch`, `project.replace`, `composition.replace`, `visual.patch`).
  - Stale revisions rejected (`CONFLICT_REVISION_MISMATCH`), repeated request reprocessing prohibited.
  - Public static `capabilities.json` added at repository root for external HTTP inspection.

# HALO Engine Capabilities & Technical Specification

### Implemented — 2026-10-16: external agents, WebMCP Site Tools and File Bridge

- HALO is controlled by external agents such as Codex, Antigravity, Bionic, Claude. The fourth **AI / Agents** tab provides an integration mode switcher between WebMCP and File Bridge. Embedded chat, provider/model/endpoint/key controls and LLM clients were removed.
- `src/site-tools.js` registers ten WebMCP tools over the internal musical API via `document.modelContext.registerTool`.
- `src/file-bridge.js` manages local folder synchronization via desktop Chrome/Edge `window.showDirectoryPicker`.
- Registry v2 retains the complete built-in catalog, metadata for 130 local recordings, defaults, resolved notes, roles, bounds, FX/master, composition and visual limits. Track 09 PCM, recordings, device IDs and capture permissions are not exposed. External agents control their own model/data policies; HALO has no LLM connection or key storage.
- Supported: exact MIDI, 4/8-bar phrases, 4/4 and 3/4 (4 bars = 3/4 waltz with 48 steps, 8 bars = 6/8 rocking pirate swing with 96 steps), eight core roles, bounded arrangements, FX/master and existing visual modes. Unsupported: per-note duration/velocity, acoustic analysis, orbit reordering/arbitrary geometry. GitHub Pages remains zero-build with relative classic scripts.


### Compact workspace controls — 2026-10-15

The universal workspace toggle retains the transport on every editor page. Track 09 separately folds advanced trim/sound/FX/cycle settings while retaining mode, primary sample actions, level, waveform and note/slice steps. INPUT opens a compact movable microphone/device window; heading drag and arrow-key movement use the existing window manager. Recording latency accepts typing and mouse scrubbing in 1 ms steps, bounded to 0–200 ms. Visibility, both folds, position and stacking persist locally. View changes do not restart audio; closing INPUT does not stop monitoring.


**Version:** 1.0 · **Date:** 2026-10-14 · **Status:** Authoritative Implementation Reference  
**Product:** NotBad HALO — Browser-Based Unobtrusive Relaxation Music Constructor

---

## 1. Обзор архитектуры системы (System Overview)

HALO построен по принципу чистого статического Web Audio приложения с нулевой серверной зависимостью (zero-build static deployment).
Все вычисления, синтез, полиметрия, воспроизведение сэмплов, динамическая обработка и визуализация выполняются на стороне клиента (браузер) в рамках единой вкладки.

### Ключевые архитектурные константы
- **Аудио-транспорт:** Единый высокоточный планировщик опережающего времени Web Audio (`AudioContext.currentTime`).
- **Сетка и размеры:** Поддерживаются размеры `4/4` (16 шестнадцатых на такт; 4 такта = 64 шага, 8 тактов = 128 шагов) и `3/4` (12 шестнадцатых на такт: 4 такта = 48 шагов, плавный вальс 3/4; 8 тактов = 96 шагов, качающийся пиратский свинг 6/8).
- **Диапазон темпа (BPM):** 30.00 — 200.00 (числа с плавающей точкой до 2 знаков после запятой).
- **Количество дорожек:** Строго 8 параллельных инструментальных слотов.
- **Длительность фразы:** Строго 4 или 8 тактов (64 или 128 шестнадцатых шагов).
- **Ограничения композиции:** До 15 уникальных фраз (`MAX_PHRASES = 15`), до 32 секций (`MAX_SECTIONS = 32`), до 128 суммарных тактов, размер JSON до 512 КиБ.
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
При генерации фразы длина цикла и шаг дорожки гармонично варьируются в зависимости от роли и выбранной размерности:

**В размере 4/4 (`cycleProfiles`):**
- **`pulse`**: 85% `{16, 1}`, 10% `{8, 2}`, 5% `{32, 1}` (сохранение фундамента)
- **`accent`**: 85% `{16, 1}`, 10% `{8, 1}`, 5% `{32, 1}` (сохранение бэкбита)
- **`percussion`**: 60% `{16, 1}`, 15% `{12, 1}`, 10% `{8, 1}`, 8% `{14, 1}`, 7% `{16, 2}`
- **`texture`**: 55% `{16, 1}`, 20% `{8, 2}`, 15% `{16, 2}`, 10% `{8, 4}`
- **`bass`**: 80% `{16, 1}`, 10% `{8, 2}`, 6% `{12, 1}`, 4% `{32, 1}`
- **`melody`**: 75% `{16, 1}`, 15% `{16, 2}`, 6% `{32, 1}`, 4% `{8, 1}`
- **`arpeggio`**: 50% `{16, 1}`, 18% `{12, 1}`, 12% `{8, 1}`, 10% `{14, 1}`, 6% `{6, 1}`, 4% `{8, 2}`
- **`harmony`**: 60% `{16, 1}`, 18% `{8, 2}`, 12% `{16, 2}`, 10% `{8, 4}`

**В размере 3/4 Вальс (`cycleProfiles3_4`, 4 такта):**
- **`pulse`**: 85% `{12, 1}`, 10% `{6, 2}`, 5% `{24, 1}`
- **`accent`**: 85% `{12, 1}`, 10% `{6, 1}`, 5% `{24, 1}`
- **`percussion`**: 60% `{12, 1}`, 20% `{6, 1}`, 10% `{9, 1}` (3-дольная гемиола), 10% `{12, 2}`
- **`texture`**: 55% `{12, 1}`, 25% `{6, 2}`, 20% `{12, 2}`
- **`bass`**: 80% `{12, 1}`, 15% `{6, 2}`, 5% `{24, 1}`
- **`melody`**: 75% `{12, 1}`, 15% `{12, 2}`, 10% `{6, 1}`
- **`arpeggio`**: 50% `{12, 1}`, 20% `{6, 1}`, 15% `{9, 1}`, 15% `{6, 2}`
- **`harmony`**: 60% `{12, 1}`, 20% `{6, 2}`, 20% `{12, 2}`

**В размере 6/8 Пиратский свинг (`cycleProfiles6_8`, 8 тактов):**
- **`pulse`**: 85% `{12, 1}`, 10% `{6, 2}`, 5% `{24, 1}`
- **`accent`**: 85% `{12, 1}`, 10% `{6, 1}`, 5% `{24, 1}`
- **`percussion`**: 60% `{12, 1}`, 20% `{6, 1}`, 10% `{8, 1}` (полиметрия 2-против-3), 10% `{12, 2}`
- **`texture`**: 55% `{12, 1}`, 25% `{6, 2}`, 20% `{12, 2}`
- **`bass`**: 80% `{12, 1}`, 15% `{6, 2}`, 5% `{24, 1}`
- **`melody`**: 75% `{12, 1}`, 15% `{12, 2}`, 10% `{6, 1}`
- **`arpeggio`**: 50% `{12, 1}`, 20% `{6, 1}`, 15% `{8, 1}`, 15% `{6, 2}`
- **`harmony`**: 60% `{12, 1}`, 20% `{6, 2}`, 20% `{12, 2}`

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

### 7.4. Создание композиций внешними агентами и лимит 15 фраз (`src/song.js`)
В HALO заложены четкие правила создания композиций через Agent API и File Bridge:
1. **Поведение по умолчанию — работа с одиночной фразой:**
   Без прямого указания пользователя ("сочини песню", "полная композиция", "аранжировка") агент генерирует или модифицирует исключительно одну текущую фразу (`phrase.patch`, `track.patch`, `project.replace`). HALO в основном режиме функционирует как зацикленный 4/8-тактовый релакс-луп.
2. **Лимит 15 уникальных фраз (`MAX_PHRASES = 15`):**
   В коде валидации `src/song.js` (`HaloSong.validate()`) установлен жесткий порог на уровне движка: композиция может содержать не более 15 уникальных фраз в массиве `phrases`. Попытка загрузить или применить более 15 фраз выбрасывает исключение валидации (`Exceeded maximum 15 phrases`). Лимит секций (`sections`) составляет 32.
3. **Каноническая форма и переиспользование фраз (Section Repeats):**
   Полноценная драматургическая песня строится по канонам композиции с переиспользованием одних и тех же идентификаторов фраз через свойство `repeats: 1..8`:
   - `intro`: фраза 1, 4 такта, fade in, разреженная ритм-секция (Pulse/Accent mute), тихие пэды.
   - `verse`: фраза 2, 8 тактов, вступает бас (Rain) и основной грув.
   - `chorus`: фраза 3, 8 тактов, кульминация с ведущей мелодией (Veil), арпеджио (Moss) и полными аккордами (Aura).
   - `verse2`: фраза 4 (или повтор фразы 2), 8 тактов, развитие куплета.
   - `bridge`: фраза 5, 8 тактов, контрастная гармония и полиметрический сдвиг.
   - `outro`: фраза 6 (или вариация интро), 4 такта, fade out, постепенное затухание до тишины.
   Такой подход дает богатую 40–80 тактовую композицию всего из 4–6 уникальных фраз, гарантируя мгновенную загрузку и безопасность памяти.
4. **Звуковые миры (setup: 'ambient' | 'reactor'):**
   - Все фразы внутри одной композиции обязаны иметь одинаковый `setup` (`'ambient'` либо `'reactor'`).
   - `ambient`: 100% процедурный синтез Web Audio, синусоидальные пэды, FM-колокола, теплый суб-бас, пространственный ревербератор (Space 35..80%), темп 60..85 BPM.
   - `reactor`: 32 пресета на базе 130 реальных CC0-записей ударных, гитар, рояля и баса. Драйвовый, панчевый микс (Space 10..30%), темп 90..140 BPM (или качающийся 6/8 пиратский свинг в 3/4 8 тактов).

### 7.5. Авторские каталоги мировых ритмических стандартов для 3/4 и 6/8 (`src/phrases.js`)
В генераторе фраз HALO заложены авторские библиотеки из 10 канонических ритмических паттернов для каждого из 14 инструментальных ролевых операторов, адаптированные под выбранный метр:

#### 1. Каталог 3/4 Вальс (`catalog3_4_waltz`, 4 такта, 48 шагов)
- **Метрическая сетка:** 12 шестнадцатых в такте. Сильные четвертные доли: 0, 4, 8.
- **Оркестровка «Бум — Чак — Чак»:**
  - `pulse` / `kick`: даунбит на 1-ю четверть (шаг 0), акцентирующий начало каждого такта.
  - `accent` / `snare`: аккомпанирующий бэкбит на 2-ю и 3-ю четверти (шаги 4 и 8).
  - `bass`: шагающий вальсовый бас (даунбит 0 с переходными нотами на 4 и 8).
  - `harmony` / `keys`: аккордовые пульсации на слабые доли 4 и 8.
  - `melody` / `lead`: широкие парящие фразы с паузами на дыхание.
  - `arpeggio`: 3-дольные и 6-дольные переливы (каждые 2 шестнадцатые: 0, 2, 4, 6, 8, 10).
- **Динамические акценты:** сильная доля 0 (velocity 0.88), доли 4 и 8 (velocity 0.78).

#### 2. Каталог 6/8 Пиратский свинг (`catalog6_8_swing`, 8 тактов, 96 шагов)
- **Метрическая сетка:** 12 шестнадцатых в такте. Две составные пунктирные четверти на такт: шаги 0 и 6.
- **Оркестровка морской саги / Hans Zimmer (*Pirates of the Caribbean*):**
  - `pulse` / `kick`: мощные составные импульсы на 0 и 6 с подбивками.
  - `accent` / `snare`: тяжелый сокрушительный бэкбит на вторую составную долю (шаг 6).
  - `bass`: маршевые пунктирные фигуры `[0, 3, 6, 9]` и октавные скачки.
  - `riff` / `melody`: swashbuckling-риффы с дактилическим галопом `[0, 3, 4, 6, 9, 10]` и непрерывным драйвом.
  - `percussion` / `metal`: пульсирующие маршевые восьмые `[0, 2, 4, 6, 8, 10]`.
  - `texture` / `ember`: кинематографичные наплывы на границы тактов и взрывные синкопы.
- **Динамические акценты:** первичный составной импульс 0 (velocity 0.90), вторичный бэкбит 6 (velocity 0.86).

### 7.6. Защита от зацикливания ИИ-агентов, валидация полей и диагностика ошибок (Anti-Looping Protocol & Error Guidance)
Взаимодействие с внешними LLM-агентами (Codex, Antigravity, Bionic, Claude) через File Bridge и WebMCP снабжено надежным защитным контуром, исключающим тупиковые циклы перебора параметров:

1. **Защита от бесконечных циклов (Anti-Looping Circuit Breaker):**
   - Движок отслеживает счетчик последовательных ошибок `consecutiveErrors`.
   - При успешном применении запроса счетчик сбрасывается в `0`.
   - Если внешний агент совершает 3 последовательные ошибки валидации (`consecutiveErrors >= 3`), файл ответа `responses/<requestId>.result.json` возвращает жесткую директиву останова:
     `CRITICAL STOP DIRECTIVE: 3 consecutive request failures detected. STOP YOUR RETRY LOOP IMMEDIATELY. Do not guess parameters or invent new schemas. Formulate a brief, helpful question to the human user explaining what you are trying to compose and asking them to confirm or clarify the tracks/instrument settings.`
   - Это гарантирует, что запутавшаяся нейросеть не уходит в «исследовательскую работу» и не спамит файловую систему сотнями ошибочных мутаций.

2. **Контекстное руководство для агента в ответе (`help` и `instructionForAgent`):**
   - Каждый ошибочный ответ `responses/<requestId>.result.json` снабжается полями `help` (техническое объяснение сути сбоя) и `instructionForAgent` (четкая пошаговая инструкция, что исправить).
   - При ошибке количества треков агент получает указание использовать `track.patch` для точечных изменений либо передать все 8 треков `[GLASS, TIDAL, ROOT, EMBER, RAIN, VEIL, MOSS, AURA]`.
   - При неверном имени пресета возвращается полный список допустимых пресетов для текущего мира.

3. **Диагностика неожиданных полей (`UNKNOWN_FIELD`):**
   - Вместо туманного `UNKNOWN_PARAMETER: <path>` движок выводит точный список недопустимых ключей: `UNKNOWN_FIELD: unexpected field(s) ["foo", "bar"] in composition. Allowed fields: ["format", "version", "phrases", "sections", ...]`.

4. **Толерантность схемы проекта и композиции:**
   - **Алиасы формата проекта:** поддерживаются как `'notbad-halo-project'`, так и `'halo-project'`.
   - **Алиасы полезной нагрузки операций:** для операций `project.replace` и `composition.replace` данные принимаются как из поля `o.project`, так и из `o.composition`.
   - **Автоматическая очистка префиксов пресетов:** если агент указывает пресет с префиксом мира (например, `'ambient-bell'` вместо `'bell'`), префикс автоматически отсекается.
   - **Метаданные верхнего уровня в `halo-composition`:** поддерживаются поля `setup`, `timeSignature`, `bars`, `name`, `title`, `label` на верхнем уровне структуры композиции; если они опущены в отдельных фразах, они автоматически наследуются из заголовка.

---

## 8. Форматы сохранения и URL-шеринг (Persistence)

### 8.1. Формат `notbad-halo-project` (v1)
Максимальный размер: 64 КиБ. Строгая валидация полей через `HaloProject.validate()`. Допускается имя формата `'notbad-halo-project'` или `'halo-project'`.

### 8.2. Формат `halo-composition` (v1)
Максимальный размер: 512 КиБ. Хранит массив `phrases` и порядок секций `sections`. Толерантен к метаданным верхнего уровня (`setup`, `timeSignature`, `bars`).

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

---

## 11. Девятый трек: Live Loop, микрофон и сэмплер (Track 09 Live Loop Engine)

### 11.1. Назначение и концептуальная изоляция
- **Модуль:** `src/live-loop.js` (`HaloLiveLoop`).
- **Связь с транспортом:** 9-й трек синхронизирован с общими часами Web Audio (`currentTime`), темпом (BPM 30–200) и границами тактов (Bar boundaries), но функционирует как независимый аудиослой.
- **Изоляция орбит:** Дорожки 01–08 остаются замкнутым 8-голосным генеративным синтезатором с фиксированными ролями и модальной гармонией. 9-й трек свободен от нотных ограничений и предназначен для живого аудио, записи гитары, вокала, битбокса и внешних сэмплов.

### 11.2. Хранение данных: IndexedDB вместо localStorage
- **База данных:** `halo-live-loop-v1`.
  - Хранилище `audio-layers`: сохраняет слои с метаданными и PCM-буферами (`Float32Array`).
  - Хранилище `settings`: сохраняет микшерные и интерфейсные параметры 9-го трека.
- **Чистота проекта и ссылок:** Аудиоданные **не сериализуются** в файл проекта JSON (`snapshotProject()`) и **не раздувают** share-токены `#loop=` и `#song=`. Звук хранится локально на устройстве пользователя.

### 11.3. Запись с микрофона, защита от обратной связи и задержка
- **Захват звука:** `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`.
- **Защита от свиста (Feedback Protection):** Прямой мониторинг отключен по умолчанию (`monitor: false`). Сигнал микрофона поступает только в буфер записи, предотвращая акустическую обратную связь на открытых динамиках.
- **Предварительный отсчёт (Count-in pre-roll):** При нажатии Record конструктор ожидает ближайшую границу такта, выводя статус «ОТСЧЁТ» / «COUNT-IN». Запись длится строго выбранное количество тактов (1, 2, 4 или 8).
- **Компенсация аппаратной задержки (Latency Compensation):** Настраиваемый параметр `latencyMs` (по умолчанию 40 мс, диапазон 0–200 мс). При квантовании смещение `(latencyMs / 1000) * sampleRate` автоматически вычитается из начала буфера, обеспечивая безупречный бит-матчинг.

### 11.4. Неразрушающий Live Overdub и стек слоев
- **Многослойность:** Каждое наложение (Overdub) сохраняется как отдельный объект в массиве `layers` и IndexedDB.
- **Суммирование и лимитирование (`buildCompositeBuffer`):** Все активные слои суммируются в единый результирующий `AudioBuffer`. Если пиковая амплитуда суммы превышает 1.0, применяется автоматическое мягкое масштабирование с запасом по перегрузке до 0.98 (`maxPeak <= 0.98`), предотвращающее цифровой клиппинг.
- **Undo (↺):** Кнопка Undo снимает последний записанный слой, возвращая композитный буфер к предыдущему состоянию.

### 11.5. Импорт аудиофайлов
- **Форматы:** Поддержка WAV, MP3, AAC, OGG и любых форматов, декодируемых `ctx.decodeAudioData()`.
- **Ограничения безопасности:** Лимит размера файла **50 МБ** (`MAX_FILE_SIZE = 50 * 1024 * 1024`) и длительности **120 секунд** (`MAX_DURATION_SEC = 120`). При превышении лимита отображается понятное уведомление (Toast) вместо зависания вкладки.

### 11.6. Форма волны (Waveform), навигация по длине трека и обрезка (Trim)
- **Двухуровневый Canvas-рендер:**
  - **Верхняя полоса обзора (Mini-Overview Strip):** при длительности аудио больше выбранного окна лупа сверху отображается миниатюрная форма всей композиции с подсветкой текущего активного участка. Клик или перетаскивание полосы позволяет мгновенно перемещаться по всему файлу (до 120 с).
  - **Основная форма волны в высоком разрешении:** отображает выбранный тактовый фрагмент лупа с сеткой тактов (1..N), метками долей и динамическим курсором воспроизведения.
  - **Интерактивное горизонтальное перетаскивание (Tape Scrubbing):** зажатие мыши или пальца на основной форме волны напрямую сдвигает аудиоматериал (`offsetSec`) влево/вправо с естественным тактильным откликом 1:1, позволяя выбрать нужный участок композиции.
- **Обрезка (Trim):** Параметры `trimStart` (0..95%) и `trimEnd` (5..100%) позволяют подрезать границы выбранного фрагмента.

### 11.7. Микшерная шина и оффлайн-экспорт
- **Канальная линейка:**
  - `LEVEL`: 0..100% (усиление до +3.5 дБ).
  - `PAN`: -100..+100 (стереопанорама).
  - `REVERB SEND`: 0..100% в общий сверточный ревербератор (2.8с).
  - `DELAY SEND`: 0..100% в BPM-синхронизированную линию задержки `1/8`.
  - `MUTE / SOLO`: мгновенное глушение / солирование с плавным рампированием. Расположены прямо под кнопками выбора длины цикла `BARS`.
- **Экспорт в WAV / MP3:** Метод `renderOffline(ctx, engine, totalBars, tempo)` автоматически вызывается из `src/export.js`, зацикливая луп на всю протяженность экспортируемой фразы или песни при активном и разглушенном 9-м треке с учетом выбранного питча, реверса и границ обрезки.

### 11.8. Перезапуск, питч и реверс (Instant Restart, Pitch & Reverse)
- **Мгновенный / квантованный перезапуск (Instant Restart):**
  - Переключатель `⚡ INSTANT RESTART` (параметр `settings.instantRestart`, по умолчанию `true`) расположен в верхней строке заголовка рядом со статусом готовности («ГОТОВ»).
  - Все изменения `BARS` (1/2/4/8), `trimEnd`, `Pitch`, `Reverse`, `Sample Start` / `offsetSec` / `trimStart` запрашивают один общий перезапуск через `HaloRetriggerPhrase(true)`: на ближайшей ещё не запланированной четвертной доле транспорт, такты, фраза, восемь инструментов и Track 09 начинают с шага 0 на одном Web Audio timestamp. Отдельный ретриггер семпла исключён.
  - При выключенном Instant Restart текущая фраза сохраняет прежние параметры окна/скорости/реверса; новые значения вступают в силу на следующей границе фразы (4/8 тактов), даже если луп Track 09 короче. Громкость, панорама и FX остаются живыми.
  - Состояние `project.liveLoop = {version:1, settings, layerIds}` сохраняет обработку и ссылки на локальные PCM-слои для каждой фразы. Вариации получают глубокую копию настроек; повтор одной и той же фразы разделяет её состояние по существующей ссылочной модели. Undo и очистка текущего трека не удаляют PCM других фраз.
  - PCM остаётся в IndexedDB: JSON/ссылки сохраняют только настройки и локальные идентификаторы, без аудиофайлов. В другом браузере отсутствующие слои дают тишину, а не аудио чужой фразы. Экспорт выбирает Track 09 каждой фразы и её повторов, включая пустые фразы. Удаление сохранённого PCM выполняется полным сбросом рабочей области.
- **Питч-шифтинг (Pitch):**
  - Ползунок диапазона от -12 до +12 полутонов.
  - Масштабирует скорость воспроизведения `playbackRate = Math.pow(2, pitch / 12)`.
  - Полная поддержка в живом планировщике и при оффлайн-рендеринге (`renderOffline`).
- **Реверс (Reverse, ⇄ REV):**
  - Зеркалирование аудио-буфера с сохранением фазы и обрезки.
  - Создает зеркальный PCM-буфер (`getReversedBuffer`), инвертируя сэмплы каждого канала.
  - Автоматически пересчитывает смещение начала воспроизведения (`startOffset = totalDur - (offsetSec + trimStart * winDur + playDur)`), гарантируя, что выбранное окно обрезки воспроизводится задом наперед именно в том же временном интервале.
- **Эргономика и стилизация:**
  - Из поля ввода `LATENCY` удалены нативные браузерные стрелки (`-webkit-appearance: none; appearance: textfield`), исключая случайные сдвиги калибровки.
  - Кнопки `MUTE` и `SOLO` перенесены непосредственно под селектор `BARS [ 1 ] [ 2 ] [ 4 ] [ 8 ]` в левом блоке управления, освобождая место для регуляторов посылов.

### 11.9. Режим SLICE: транзиентная нарезка сэмплов (Transient Slicing & Beat Chopping)
- **Концепция и переключение режимов:**
  - Тумблер `[ ◈ LOOP ]` / `[ ✂ SLICE ]` в верхней панели Track 09.
  - Режим `LOOP`: классический непрерывный овердаб-лупер с подрезкой и навигацией по волне.
  - Режим `SLICE`: сэмплер в духе портативных грувбоксов Teenage Engineering (OP-1 / OP-Z / PO-33). Сэмпл мгновенно нарезается на ритмические кусочки, запускаемые по сетке шестнадцатых долей.
- **Детекция транзиентов (`detectTransients`):**
  - Алгоритм базируется на функции обнаружения атак (Onset Detection Function, ODF) по нарастанию локальной среднеквадратичной энергии (RMS Energy Rise) в скользящих окнах по 1024 сэмпла (~23 мс при 44.1 кГц).
  - Учитывается динамический порог и рефрактерное расстояние (минимальная дистанция между соседними атаками не менее 50 мс), предотвращая ложные срабатывания на высокочастотных хвостах и вибрато.
  - При отсутствии явных атак звука (плавный эмбиентный пэд, чистый синус) алгоритм автоматически переключается на равномерное деление (fallback to even grid), гарантируя стабильное разбиение.
  - Количество слайсов: выбор из **4**, **8** или **16** фрагментов с мгновенной переразметкой сетки и волны.
- **Интерактивная волна со слайсами:**
  - На канвасе формы волны отрисовываются вертикальные разделители слайсов и круглые бейджи с номерами `1..N`.
  - Клик по бейджу слайса на форме волны позволяет мгновенно прослушать (audition) выбранный фрагмент через Web Audio.

### 11.10. 16-шаговый секвенсер слайсов, пресеты, рандомизатор и монофонический чок (Voice Choke)
- **16-шаговый секвенсер:**
  - Компактная сетка из 16 интерактивных пэдов, оформленных в едином космическом стиле полупрозрачного стекла (dark-teal glass) с индикаторами сильных долей на шагах 1, 5, 9, 13.
  - Клик по шагу циклически переключает назначенный слайс (от 1 до количества слайсов) или выставляет паузу (`—`).
  - Активный играющий шаг подсвечивается ярким свечением в реальном времени.
- **Быстрые пресеты грува (Groove Presets):**
  - `BEAT`: классическая танцевальная ритм-основа (прямая бочка на сильных долях и синкопированные акценты).
  - `CHRONO`: хронологическое последовательное воспроизведение фрагментов по порядку.
  - `SHUFFLE`: свингованный, прыгающий ритмический рисунок со смещенными акцентами.
  - `ARP`: арпеджированный волнообразный каскад (подъемы и спуски номеров слайсов).
- **Кнопки рандомайзера и сброса паттерна:**
  - `🎲 RAND`: алгоритмическая генерация музыкального паттерна (`randomizeSlicePattern(count)`), закрепляющая фундаментальный слайс `0` на сильной доле (шаг 0), распределяющая четвертные и восьмые доли с акцентами и расставляющая музыкальные паузы.
  - `↺ RESET`: мгновенный возврат к заводскому паттерну по умолчанию (`BEAT`).
- **Монофонический чок (Voice Choke Group):**
  - Воспроизведение слайсов монофоническое: запуск нового слайса немедленно прерывает (`source.stop(atTime + 0.005)`) звучание предыдущего фрагмента с быстрым микро-фейдом (5 мс).
  - Исключает наслоение фаз, клиппинг и фазовую кашу в миксе, гарантируя панчевый и четкий ритмический грув.

### 11.11. Полноценная синтезаторная обработка (SOUND & FX) и полиметрия
- **Синтезаторный стрип SOUND:**
  - `CHARACTER`: двухполюсный резонансный Lowpass/Bandpass фильтр (12 dB/oct) с диапазоном среза 80–14000 Гц и адаптивным резонансом (Q 0.7–4.0).
  - `DURATION`: огибающая затухания слайса (Decay / Release) от ультракоротких стаккато (0.05 с) до полного звучания фрагмента.
  - `DENSITY`: вероятностная маска срабатывания шагов (20–100%). При снижении плотности в первую очередь выпадают слабые доли, сохраняя ритмический скелет.
  - `PRESENCE / LEVEL`: регулятор громкости дорожки.
  - `PAN`: панорама стереополя (-100..+100).
- **Полиметрия и фазовый сдвиг:**
  - `CYCLE`: независимая длина цикла Track 09 от 4 до 32 шагов (например, 12 или 14 шагов для создания бесконечно развивающихся полиритмов поверх стабильного 16-шагового бита).
  - `STEP`: длительность шага сетки (шестнадцатая `1/16`, восьмая `1/8` или четвертная `1/4`).
  - `OFFSET`: смещение фазы паттерна от 0 до 15 шагов.
- **Пространственный стрип FX:**
  - `REVERB SEND`: посыл в мастер-ревербератор (0..100%).
  - `DELAY SEND`: посыл в темпо-синхронизированную линию задержки (0..100%).
  - `DELAY TIME`: кнопки быстрого переключения деления задержки (`1/16`, `1/8`, `1/8D`, `1/4`) с бесшовной перенастройкой времени эха на лету.
  - `CHORUS SEND`: посыл в мастер стереохорус (0..100%) для придания сэмплам объема и анимации.

### 11.12. Интеграция с генератором композиции («СОЗДАТЬ» / GENERATE)
- **Функция:** `HaloLiveLoop.randomizeSlice(seed)`.
- **Поведение при нажатии кнопки `GENERATE` (`Создать`):**
  - Если Track 09 находится в режиме `SLICE` и содержит аудио, нажатие `GENERATE` автоматически перемиксовывает партию слайсов.
  - Случайно выбирается один из органичных алгоритмических паттернов (Beat, Chrono, Shuffle, Arp или синкопированная вариация) с музыкальной адаптацией под плотность (Density 40–90%).
  - Подбирается легкая рандомизация характера фильтра (Character 30–80%), огибающей (Duration 40–85%) и деликатные посылы в эффекты (Reverb 15–50%, Delay 0–40%).
  - Пользовательский сэмпл моментально встраивается в общее звучание ансамбля без необходимости ручной настройки.

### 11.13. Девятая визуальная орбита и интерактивный холст (9th Orbit Rendering & Interaction)
- **Условие появления:** `HaloLiveLoop.hasAudio()` возвращает `true`.
- **Визуальные атрибуты 9-й орбиты:**
  - Радиус: внешняя орбита (индекс `8`), располагающаяся за орбитой AURA.
  - Цветовая палитра: снежно-белый оттенок `#ffffff` (Snow White), контрастирующий со звездным фоном и цветными кольцами орбит 01–08.
  - Фазовое движение: персональная угловая скорость и фазовое смещение, плавно анимируемое в режимах `DRIFT`, `IN TIME` и `PHRASE`.
  - Кометные хвосты: полная совместимость с режимами визуализации `CLASSIC`, `COSMIC` и `HYPER` (безопасное деление стиля хвоста `index % 8`).
  - Ореол ядра (Nucleus Glow): пульсирующее световое ядро, вспыхивающее в момент воспроизведения сэмпла или слайса (`window.HaloPulse(8, time)`).
- **Отображение слайсов в режиме `PHRASE`:**
  - Метод `getSlicePhraseSteps(startStep, barCount)` передает позиции активных слайсов на кольцевую траекторию орбиты.
  - На кольце 9-й орбиты рендерятся визуальные маркеры слайсов с цветовой индикацией активности и приглушением при Mute.
- **Интерактивное касание / клик:**
  - Обработчик `universe.onpointerdown` расширен для радиуса 9-й орбиты (`maxOrbit = hasTrack09 ? 8 : 7`).
  - Клик или тап по 9-й орбите переключает режим `MUTE` 9-го трека без необходимости открывать панель Live Loop.


### 11.9. PITCH sampler and selected audio inputs (2026-10-15)

Implemented Track 09 modes: `loop`, `slice`, `pitch`. The core remains eight synthesis tracks plus one optional sample layer.

- PITCH plays one unsliced trimmed sample. `rootNote` is integer MIDI 36–84 (C2–C6), default 62/D4; `pitchOctave` is −1/0/+1, default 0. `pitchSteps` has exactly 16 integers −1 (rest) or 0–7 (tonic through octave), with its own saved pattern independent of `sliceSteps`.
- Target MIDI = `62 + HaloComposition.offsets[key] + 12*pitchOctave + scale[degree]`. Minor scale `[0,2,3,5,7,8,10,12]`; major `[0,2,4,5,7,9,11,12]`. Playback rate = `2^((target-rootNote+pitch)/12)`. Shifts beyond ±24 semitones rest rather than clamping out of key. Root detection and formant/time-stretch processing are absent; polyphonic/melodic recordings transpose as a whole.
- PITCH's source window is at most 8 seconds. `offsetSec` selects the window in longer audio; existing trim fractions select within it. Windows shorter than 40 ms do not trigger. PITCH recording auto-stops after at most 8 seconds rounded down to a shared transport step; manual stop/section transition may shorten it.
- Monophonic gated notes use a 3 ms attack, bounded release, ~5 ms voice choke, resonant lowpass, existing level/pan/FX sends. Gate = min(source duration/rate × (0.15+0.85*duration/100), 0.94*step seconds, remaining phrase seconds). Source offsets/duration stay within trim even in Reverse. Live/offline use the same note scheduler and phrase key.
- Cycle 4–32, step 1/16–1/4, offset and density reuse the sequenced controls. RANDOM and RESET edit only `pitchSteps`; GENERATE uses seeded note choices without changing root or trim. Notes/root/octave/window/pitch updates follow shared Instant Restart / next-phrase rules. Processing persists per phrase through existing `liveLoop` state and independent variations.
- `src/audio-input.js` owns the shared microphone/instrument device selector, explicit permission, monitoring and cleanup. It uses only `audioinput` devices and requests exact `deviceId` for selected hardware, `video:false`, and voice-processing constraints off. Missing instrument selection never substitutes a microphone. AudioContext monitoring starts only from a user gesture; no permission request or capture occurs on load.
- Source kind/device ID are stored under localStorage `halo-audio-input-v1`, separate from phrase/project/share state. Device names are inserted with textContent, not HTML. Device choices are locked during recording. Tracks/nodes are released on stop, device change/disconnection, pagehide and explicit project load; monitoring can continue through transport pause and timed composition transitions. Master volume governs the monitoring feed (50% input gain before master).
- All three modes expose audio-file import, selected input recording and direct listening. Recording uses the current mono ScriptProcessor capture pipeline and 0–200 ms latency compensation; interfaces must be exposed by the OS/browser as audio inputs. Browser permission may be named microphone even for USB/line input. HTTPS/localhost is required. No system-output capture, ASIO, MIDI or separate interface channel selection is claimed.
- A section boundary finalizes captured audio in the outgoing phrase before switching layer references. Monitoring audio is not serialized or rendered into exports; recorded takes are. Missing APIs, denied permissions and unplugged devices leave playback usable and show localized feedback.

- Layer PCM is resampled from its stored sample rate to the live/offline context rate when building composite buffers, preserving timing and pitch for 48 kHz device recordings exported at 44.1 kHz. Same-rate buffers use a direct summation path.


UI refinement (2026-10-15): frameless window actions share the top-right edge; Track 09 minimization is visible only on its page. LOOP/SLICE/PITCH share 26 px buttons, compact selects and sliders, aligned parameter grids and thin arrow-free scrollbars. PITCH octave and actions share one row. The input button is labeled AUDIO INPUT / MIC (localized). Musical settings and timing are unchanged.

Track 09 UI: RECORD is red; orange OVERDUB sits beside recording/Loop in the primary actions. All range controls use the master-volume/EQ accent style. PITCH recorded root is grouped with melody octave in advanced settings (hidden when minimized). Audio semantics are unchanged.


Audio input fix (2026-10-15): enumerate selectable nonempty device IDs before stopping the permission probe; preserve the exposed list if a browser later hides IDs, and avoid probing again only after a successful permission probe in the current session. Hardware stays released after the probe. Local controller state adds accessReady, lastError {stage,name,constraint}, and fileContext; the input window reports errors and console diagnostics include operation/error codes without device IDs/labels. For repeated file:// permission prompts, use scripts/preview.ps1 and localhost:8766; persistent permission remains browser-controlled. No automatic monitoring or permissions on reload.

The first ENABLE INPUTS action always probes capture permission; a named system default alone is insufficient. Diagnostic console entries are readable JSON strings.


Track 09 SOLO smoothly silences the eight core voices without changing their mute states or levels; disabling SOLO restores them. Offline export honors this gate too. SLICE advanced settings expose TRIM START/END and automatically rebuild slices on trim changes. With Instant Restart off, live playback retains the previous slices until the next phrase cycle; with it on, the new slices apply at the shared phrase restart.


DELETE sits at the right of the recording/import row. SLICE/PITCH expose CYCLE 4/8/16/32 and STEP 1/16, 1/8, 1/4 beside the pattern grid (16 cells; CYCLE 32 repeats them twice). DURATION selects a fraction of natural slice/sample-window playback length, accounting for pitch; PITCH is no longer capped at one step. Rests let notes ring; a new trigger gently chokes the previous voice. PITCH remains bounded by the phrase end in live/offline playback. No slice time stretching is introduced.

---

## 12. Архитектура интеграции с AI-агентами: WebMCP и File Bridge (2026-10-17)

### 12.1. Режимы интеграции
- **WebMCP (Browser Site Tools):** Регистрация через `document.modelContext.registerTool` для встроенных браузерных агентов (Codex).
- **File Bridge (Локальная папка HALO-Bridge):** Интеграция с внешними автономными агентами (Antigravity, Bionic, Claude) через стандартный File System Access API (`window.showDirectoryPicker`).

### 12.2. Управление локальной папкой и безопасность
- **Кнопки управления:**
  - `⟳ Обновить файлы`: Экспорт 5 файлов технического паспорта (`AGENT_GUIDE.md`, `capabilities.json`, `instruments.json`, `music-rules.json`, `project-state.json`).
  - `⯈ Проверить requests/`: Ручной запуск проверки новых запросов в `requests/`.
  - `↺ Сбросить изменения`: Очистка файлов в `requests/` и `responses/`, сброс счётчиков ошибок и очереди, удаление временных ключей localStorage (`halo-pattern-v1`, `notbad-halo-autosave-v1`, `halo-composition-v1`), восстановление исходного чистого состояния проекта с сервера и повторная синхронизация 5 файлов контекста. Требует обязательного подтверждения пользователя через внутренний модальный диалог (`window.HaloConfirm`).
  - `✕ Отключить`: Остановка таймера опроса, отсоединение папки и удаление сохранённого дескриптора из IndexedDB. Требует обязательного подтверждения через внутренний модальный диалог (`window.HaloConfirm`).
- **Подсказка и восстановление при ошибках в UI:** При возникновении ошибки выполнения команды под строкой статуса отображается явное напутствие пользователю: *«Если ошибка не уходит, сбросьте локальные изменения и попросите нейросеть повторить запрос.»* с кнопкой быстрого сброса `[↺ Сбросить локальные изменения]`.
- **100% английские инструкции для AI:** Руководство `AGENT_GUIDE.md` и спецификации `music-rules.json` поддерживаются строго на английском языке для исключения языковых галлюцинаций и ошибок нейросетевых агентов.
- **Защита от зацикливания:** При 3 последовательных ошибках агенту выдается `CRITICAL STOP DIRECTIVE` в поле ответа `responses/<requestId>.result.json`, предписывающий немедленно прекратить перебор параметров и запросить инструкции у человека.

