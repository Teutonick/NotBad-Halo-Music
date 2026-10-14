# HALO — Universal Agent API & AI Composer Specification

**Technical Specification & Architecture · Version 1.1**  
**Adapted & Reconciled with HALO Audio/Visual Engine**  
**Date:** 2026-10-14 · **Author:** Codex Architecture & HALO Core Team

---

## Введение и цель

Настоящий документ представляет собой адаптированную техническую спецификацию (ТЗ v1.1) для реализации **Universal Agent API & AI Composer** в браузерном конструкторе **HALO**.

Спецификация скорректирована с учетом фактической реализации музыкального движка, ограничений статического хостинга GitHub Pages, структуры данных, математических формул синтеза, гармонии и строгих архитектурных правил репозитория.

---

## 1. Сверка и корректировка ТЗ v1.0 с реальной архитектурой HALO

В ходе глубокого аудита кодовой базы HALO выявлены и исправлены следующие расхождения между первоначальным черновиком ТЗ и реальной системой:

| Область | Черновик ТЗ v1.0 (Ошибочные предположения) | Реальная реализация HALO (Источник истины) | Архитектурная адаптация в API |
|---|---|---|---|
| **Идентификаторы дорожек** | Предполагались абстрактные дорожки 01–08 с произвольными именами. | Строго 8 слотов: `GLASS`, `TIDAL`, `ROOT`, `EMBER`, `RAIN`, `VEIL`, `MOSS`, `AURA` со стабильными индексами 0..7. | API идентифицирует дорожки по слоту (`slot`: `'GLASS'`) или индексу (`trackIndex`: `0..7`). |
| **Музыкальные роли** | Роли рассматривались как произвольные теги. | 8 фиксированных ролевых операторов (`src/roles.js`): `pulse`, `accent`, `percussion`, `texture`, `bass`, `melody`, `arpeggio`, `harmony`. | Роли неизменны; пресеты выбираются строго из пула совместимости (`compatibleRoles` / `affinityRoles`). |
| **Звуковые движки** | Предполагалось наличие FM, AM, свободного сэмплера. | Два изолированных мира: **AMBIENT** (30 процедурных патчей) и **REACTOR** (32 пресета на 130 локальных CC0 PCM сэмплах). | Кросс-мирное смешивание запрещено. API оперирует пресетами текущего мира проекта. |
| **Параметры звука** | Предполагались произвольные единицы (мс, дБ, %). | Все параметры регуляторов нормализованы к шкале **0..100** (`character`, `duration`, `space`, `density`, `level`, `delay`, `chorus`). | В API параметры передаются как целые числа `0..100`. Перевод в физические формулы выполняет движок. |
| **Длительность фразы** | Диапазон 4..8 тактов трактовался как произвольный. | Допустимы **только 4 или 8 тактов** (64 или 128 шестнадцатых шагов). Никаких 5, 6 или 7 тактов. | Валидатор API жестко отклоняет `bars`, отличные от 4 и 8. |
| **Мастер-эквалайзер** | Запрашивалось описание неизвестной схемы EQ. | 3-полосный фиксированный Biquad: Low (Lowshelf 120 Гц), Mid (Peaking 1000 Гц, Q 0.7), High (Highshelf 6000 Гц). Диапазон усиления строго **-9 .. +9 dB**. | API принимает объект `{ low: -9..9, mid: -9..9, high: -9..9, width: 0..100 }`. |
| **Связь орбит и звука** | Предполагалась возможность изменения радиусов и скоростей орбит для изменения музыки. | **Звуковой транспорт авторитетен.** Orbits визуализируют фазу и шаги через Web Audio время; рендер никогда не вызывает звук. | API разделяет визуальные команды (смена сцены/режима) и музыкальные (ноты, циклы, плотность). |
| **Окружение и сеть** | Рассматривалась возможность бэкенда или MCP-сервера. | Строгий статический запуск на **GitHub Pages**: без бэкенда, без обязательных CLI/MCP, без внешних CDNs. | AI Composer работает прямо в браузере (клиентский fetch к OpenAI-совместимым эндпоинтам с BYOK). |

---

## 2. Capability Registry (Реестр возможностей движка)

Capability Registry — это машинно-читаемый JSON-манифест, динамически генерируемый из текущего состояния приложения методом `HaloAgentAPI.getCapabilities()`.

### Структура Capability Registry

```json
{
  "$schema": "https://halo.notbad.internal/schemas/capabilities-v1.json",
  "engineVersion": "3.0.0",
  "limits": {
    "tracksCount": 8,
    "allowedPhraseBars": [4, 8],
    "stepsPerBar": 16,
    "bpm": { "min": 30.0, "max": 200.0, "step": 0.01, "default": 72.0 },
    "masterVolume": { "min": 0, "max": 100, "default": 50 },
    "trackParameters": { "min": 0, "max": 100, "default": 50 },
    "masterEq": { "minGain": -9, "maxGain": 9, "default": 0, "bands": [
      { "id": "low", "type": "lowshelf", "frequency": 120 },
      { "id": "mid", "type": "peaking", "frequency": 1000, "q": 0.7 },
      { "id": "high", "type": "highshelf", "frequency": 6000 }
    ]},
    "stageWidth": { "min": 0, "max": 100, "default": 35 },
    "composition": {
      "maxPhrases": 32,
      "maxSections": 32,
      "maxTotalBars": 128,
      "maxJsonBytes": 524288
    }
  },
  "roles": [
    {
      "index": 0,
      "slot": "GLASS",
      "id": "pulse",
      "label": "Pulse",
      "maxNotes": 1,
      "maxVoices": 2,
      "maxDuration": 0.8,
      "anchoredStepZero": true,
      "description": "Short low impulses, kick foundation"
    },
    {
      "index": 1,
      "slot": "TIDAL",
      "id": "accent",
      "label": "Accent",
      "maxNotes": 2,
      "maxVoices": 2,
      "maxDuration": 0.8,
      "description": "Short accents, backbeat snare, claps"
    },
    {
      "index": 2,
      "slot": "ROOT",
      "id": "percussion",
      "label": "Percussion",
      "maxNotes": 2,
      "maxVoices": 2,
      "maxDuration": 0.35,
      "description": "Rhythmic details, hats, cymbals, shaker"
    },
    {
      "index": 3,
      "slot": "EMBER",
      "id": "texture",
      "label": "Texture",
      "maxNotes": 2,
      "maxVoices": 2,
      "maxDuration": 8.0,
      "description": "Atmospheric layers, noise, toms, wash"
    },
    {
      "index": 4,
      "slot": "RAIN",
      "id": "bass",
      "label": "Bass",
      "maxNotes": 1,
      "maxVoices": 1,
      "maxDuration": 8.0,
      "monophonic": true,
      "boundedRange": [26, 49],
      "centerPanned": true,
      "description": "One bass note at a time, octave down"
    },
    {
      "index": 5,
      "slot": "VEIL",
      "id": "melody",
      "label": "Melody",
      "maxNotes": 3,
      "maxVoices": 3,
      "maxDuration": 8.0,
      "description": "Lead melodic phrases singing in upper register"
    },
    {
      "index": 6,
      "slot": "MOSS",
      "id": "arpeggio",
      "label": "Arpeggio",
      "maxNotes": 1,
      "maxVoices": 1,
      "maxDuration": 0.65,
      "monophonic": true,
      "description": "Articulated repeating movement in mid register"
    },
    {
      "index": 7,
      "slot": "AURA",
      "id": "harmony",
      "label": "Harmony",
      "maxNotes": 4,
      "maxVoices": 4,
      "maxDuration": 8.0,
      "description": "Four-note chord beds, lush pads"
    }
  ],
  "soundWorlds": {
    "ambient": {
      "type": "procedural_synthesis",
      "totalPresets": 30,
      "banks": ["GLASS", "TIDAL", "ROOT", "EMBER", "RAIN", "VEIL", "MOSS", "AURA"]
    },
    "reactor": {
      "type": "sample_playback_cc0",
      "totalPresets": 32,
      "totalSamples": 130,
      "banks": ["GLASS", "TIDAL", "ROOT", "EMBER", "RAIN", "VEIL", "MOSS", "AURA"]
    }
  },
  "harmony": {
    "scales": ["natural_minor", "major"],
    "totalKeys": 24,
    "keysOrder": [
      "D MINOR", "F MAJOR", "C MAJOR", "A MINOR", "E MINOR", "G MAJOR", "D MAJOR", "B MINOR",
      "F♯ MINOR", "A MAJOR", "E MAJOR", "C♯ MINOR", "G♯ MINOR", "B MAJOR", "F♯ MAJOR", "D♯ MINOR",
      "A♯ MINOR", "C♯ MAJOR", "G♯ MAJOR", "F MINOR", "C MINOR", "D♯ MAJOR", "A♯ MAJOR", "G MINOR"
    ],
    "system": "circle_of_fifths_alternating_relative_pairs",
    "relativePairToggle": true,
    "autoModulation": "adjacent_neighbor_only"
  },
  "effects": {
    "reverb": { "type": "convolver_impulse", "decaySeconds": 2.8, "control": "space" },
    "delay": { "type": "bpm_synced_feedback", "divisions": ["1/16", "1/8", "1/8d", "1/4"], "control": "delay" },
    "chorus": { "type": "stereo_dual_lfo", "delaysMs": [18, 24], "control": "chorus" }
  },
  "visuals": {
    "scenes": ["ORBIT", "BLOOM", "CURRENT"],
    "motionModes": ["DRIFT", "IN TIME", "PHRASE"],
    "effects": ["CLASSIC", "COSMIC", "HYPER"]
  }
}
```

---

## 3. Базовый контракт Agent API (Core API Contract)

Agent API объявляется как глобальный или модульный фасад `HaloAgentAPI`. Все методы синхронны или возвращают `Promise` без блокировки аудиопотока.

### 3.1. Методы чтения (Inspection)

```typescript
interface HaloAgentAPI {
  // Полное описание возможностей и ограничений текущей сборки
  getCapabilities(): CapabilityRegistry;

  // Актуальное состояние открытого проекта или композиции
  getProjectState(): ProjectState;

  // Каталог пресетов с фильтрацией по совместимости с дорожкой
  getInstrumentCatalog(setup?: 'ambient' | 'reactor', trackIndex?: number): PresetCatalogItem[];

  // Гармонический контекст: текущая тональность, ступени, аккорды текущего такта
  getMusicRules(): MusicRulesState;

  // Визуальные настройки: активная сцена, режим движения, космические эффекты
  getVisualState(): VisualState;
}
```

### 3.2. Методы валидации, предпросмотра и мутации (Mutations)

```typescript
interface HaloAgentAPI {
  // Предварительная проверка пакета операций без изменения реального состояния
  validateOperations(transaction: TransactionRequest): ValidationResult;

  // Предпросмотр: генерирует shadow-состояние для анализа и сводки изменений
  previewOperations(transaction: TransactionRequest): TransactionPreview;

  // Атомарное применение проверенных операций к состоянию HALO
  applyOperations(transaction: TransactionRequest): TransactionResult;

  // Отмена последнего примененного пакета изменений
  undo(): HistoryResult;

  // Повтор отмененного пакета изменений
  redo(): HistoryResult;
}
```

---

## 4. Спецификация атомарных операций (Operation Schema)

AI-агент не передает монолитный проект целиком при точечных изменениях. Изменения формулируются в виде пакета декларативных операций.

### 4.1. Формат пакета транзакции (Transaction Request)

```json
{
  "schemaVersion": 1,
  "baseRevision": 142,
  "title": "Add lush ambient arpeggio and warm master",
  "operations": [
    {
      "op": "track.setParameter",
      "trackIndex": 6,
      "parameter": "space",
      "value": 65
    },
    {
      "op": "track.setPreset",
      "trackIndex": 6,
      "presetId": "kalimba"
    },
    {
      "op": "track.setCycle",
      "trackIndex": 6,
      "length": 7,
      "stepLength": 1,
      "offset": 0
    },
    {
      "op": "master.setMix",
      "low": 2,
      "mid": -1,
      "high": 3,
      "width": 60
    }
  ]
}
```

### 4.2. Каталог поддерживаемых операций

#### Операции с дорожками (Track Operations)
- `track.setParameter`: `{ trackIndex: 0..7, parameter: 'level'|'space'|'duration'|'character'|'density'|'delay'|'chorus', value: 0..100 }`
- `track.setPreset`: `{ trackIndex: 0..7, presetId: string }` (проверяется совместимость с ролью).
- `track.setMute`: `{ trackIndex: 0..7, on: boolean }`
- `track.setCycle`: `{ trackIndex: 0..7, length: 4..32, stepLength: 1|2|4, offset: 0..(length-1) }`
- `track.setDelayTime`: `{ trackIndex: 0..7, delayTime: '1/16'|'1/8'|'1/8d'|'1/4' }`
- `track.setManualSteps`: `{ trackIndex: 0..7, steps: number[] }` (индексы шестнадцатых в пределах `bars * 16`).
- `track.clearManualSteps`: `{ trackIndex: 0..7 }` (возврат к генеративному мотиву).
- `track.setNoteEvents`: `{ trackIndex: 0..7, events: Array<{ step: number, notes: number[] }>, transpose?: -12..12 }`

#### Операции с фразами (Phrase Operations)
- `phrase.create`: `{ copyFromIndex?: number, bars?: 4|8, label?: string }`
- `phrase.setLabel`: `{ phraseId: number, label: string }` (1–10 букв/цифр).
- `phrase.setBars`: `{ phraseId: number, bars: 4|8 }`
- `phrase.generate`: `{ phraseId?: number, seed?: number, randomizeCycles?: boolean }` (генерация фразы с вероятностным варьированием циклов и шагов по ролевым коридорам).
- `phrase.delete`: `{ phraseId: number }` (с проверкой отсутствия активных ссылок в секциях).

#### Операции с композицией (Composition Operations)
- `composition.addSection`: `{ phraseId: number, name?: SectionName, repeats?: 1..8, fade?: 'none'|'in'|'out', atIndex?: number }`
- `composition.removeSection`: `{ sectionIndex: number }`
- `composition.reorderSections`: `{ order: number[] }`
- `composition.setSectionRepeats`: `{ sectionIndex: number, repeats: 1..8 }`
- `composition.setSectionFade`: `{ sectionIndex: number, fade: 'none'|'in'|'out' }`
- `composition.setRepeat`: `{ repeat: boolean }`
- `composition.autoArrange`: `{ vibe?: string }` (вызов детерминированного 56-тактового аранжировщика).

#### Операции с мастером и транспортом (Master & Transport)
- `transport.setBpm`: `{ bpm: 30..200 }`
- `transport.setKey`: `{ key: 0..23 }` (индекс по квинтовому кругу).
- `transport.toggleMode`: `{}` (мгновенное переключение между параллельным минором и мажором).
- `transport.nextKey`: `{}`
- `transport.prevKey`: `{}`
- `master.setVolume`: `{ volume: 0..100 }`
- `master.setMix`: `{ low?: -9..9, mid?: -9..9, high?: -9..9, width?: 0..100 }`

#### Визуальные операции (Visual Operations)
- `visual.setScene`: `{ scene: 'ORBIT'|'BLOOM'|'CURRENT' }`
- `visual.setMotion`: `{ motion: 'DRIFT'|'IN TIME'|'PHRASE' }`
- `visual.setEffectMode`: `{ mode: 'CLASSIC'|'COSMIC'|'HYPER' }`
- `visual.setCosmic`: `{ enabled: boolean }` *(обратная совместимость: `true` переключает в `COSMIC`, `false` — в `CLASSIC`)*


---

## 5. Защита от конфликтов и транзакционная модель (Concurrency & Safety)

1. **Ревизионный контроль (Optimistic Concurrency):**
   Каждая мутация увеличивает внутренний счетчик `revision`. Если пользователь вручную изменил параметр во время работы AI, `baseRevision` в запросе не совпадет с текущей ревизией. API возвращает ошибку `CONFLICT_REVISION_MISMATCH` и предлагает свежее состояние вместо перезаписи.
2. **Атомарность (All-or-Nothing):**
   Если хотя бы одна операция в пакете нарушает валидацию (например, несуществующий пресет или длительность цикла 33 шага), ни одна операция из пакета не применяется.
3. **Безопасность аудиопотока:**
   Применение изменений никогда не вызывает `AudioContext.close()`, `AudioContext.suspend()` или пересоздание глобального аудиографа. Параметры обновляются через гладкие рампы `setTargetAtTime` на текущем времени Web Audio.

---

## 6. Встроенный клиент AI Composer (Browser Client Architecture)

Интеграция работает непосредственно во вкладке браузера без локального сервера.

```
[Пользовательский текстовый запрос]
                 │
                 ▼
     [Prompt Intent Analyzer] (создание, правка, мастер, аранжировка)
                 │
                 ▼
     [LLM Model Adapter (OpenAI-compatible)]
     - Base URL (например, https://api.openai.com/v1 или http://localhost:11434/v1)
     - Model (gpt-4o, claude-3-5, llama-3, qwen-2.5)
     - Ephemeral BYOK (хранится только в памяти вкладки)
                 │
                 ▼
       [Structured JSON Operations]
                 │
                 ▼
     [HaloAgentAPI.validateOperations()]
                 │
                 ▼
     [Visual Change Summary Modal]
     - Какие инструменты изменятся
     - Изменится ли тональность / BPM
     - Новая длительность и форма
                 │
          [Подтверждение]
                 │
                 ▼
     [HaloAgentAPI.applyOperations()] ──► [История изменений / Undo]
```

### Безопасность и конфиденциальность AI Composer
- **BYOK (Bring Your Own Key):** Ключи пользователя никогда не сохраняются в `localStorage`, проектах или ссылках. Хранятся строго в замыкании памяти JavaScript до закрытия вкладки.
- **Никакого выполнения `eval()`:** Модель возвращает строго валидируемый JSON со списком допустимых операций. Исполнение сгенерированного JavaScript исключено.
- **CORS & Localhost:** Поддерживается прямое подключение к локальным инференс-серверам (Ollama, LM Studio, vLLM) по адресу `http://localhost:*` или `http://127.0.0.1:*`.

---

## 7. Критерии готовности реализации (Definition of Done)

Реализация Agent API считается полностью готовой к передаче в продакшн, если:
1. Статическая совместимость: проект полностью работает на GitHub Pages без сервера и сторонних CDN.
2. Чтение состояния: `HaloAgentAPI.getProjectState()` возвращает полное валидное состояние проекта, идентичное данным сохранения.
3. Валидация: 100% невалидных операций (выход за пределы 0..100, несуществующие пресеты, несовместимые роли, кросс-мирные пресеты) отсекаются с понятными ошибками на двух языках (RU/EN).
4. Бесшовность: применение изменений во время воспроизведения не вызывает щелчков, пауз, заиканий звука или рассинхронизации транспорта.
5. Двусторонний Undo/Redo: любое примененное действие AI Composer может быть мгновенно отменено одной кнопкой или комбинацией клавиш.
