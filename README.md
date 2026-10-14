# NotBad Halo Music Constructor — Interactive Sound Universe

Click a phrase name to rename it in place (Enter saves, Escape cancels): 1–10 letters or digits, no spaces/special characters. New saved phrases have sequential numbers; linked repeats share their name. The transport shows the phrase being edited. / Нажмите имя фразы для переименования: Enter сохраняет, Escape отменяет; до 10 букв или цифр, без пробелов и спецсимволов.

Shared URL fragments and imported JSON are bounded and allowlisted. Tokens accept only base64url, one recognized fragment parameter, and at most 24,000 characters; decompression stops above 512 KiB. Numeric controls reject nonfinite/out-of-range/off-grid input. Query parameters do not configure music. These checks reduce injection/resource abuse; they are not a security certification.

First use opens PHRASE view; validated saved views still restore. Instruments loops and edits the current phrase; switching to Composition continues the ordered sections without stopping playback. Optional REPEAT loops the entire composition and persists locally and in JSON. / При первом запуске открыт экран ФРАЗА; сохранённый вид восстанавливается. Инструменты зацикливают текущую фразу, Композиция продолжает секции без остановки. REPEAT повторяет всю композицию.

**Compose worlds, not timelines.**

NotBad Halo Music Constructor is an open-source, browser-based relaxation constructor. Eight musical voices share one pulse while glowing bodies travel along different closed trajectories. Choose and shape a calm soundscape without musical expertise or the demands of a professional instrument.

![HALO desktop preview](screenshot.png)

## The idea

- **Music first:** gentle timbres, coherent harmony, controlled dynamics, and room to breathe.
- **Eight voices, one clock:** inspired by the immediacy of compact grooveboxes such as the OP-Z, without reproducing their interface.
- **Visual complexity, musical clarity:** trajectories, phases, trails, and particles obscure the obvious repetition without making the audio chaotic.
- **Play before configuration:** direct interaction first; technical parameters stay secondary.
- **Relax through construction:** gently shape an evolving environment with simple interactions.

## Try HALO

Live site: [NotBad Halo](https://teutonick.github.io/NotBad-Halo-Music/) · [GitHub source](https://github.com/Teutonick/NotBad-Halo-Music) · [Other projects](https://tnick.cc).

Open `index.html` in a modern desktop or mobile browser, or deploy the repository using **GitHub Pages**. No installation, build, backend, account, API key, or CDN is required.

Press **Play** to enable audio (browsers require user interaction before sound can start). Headphones are recommended.

### Two musical setups

The small upper-right orbit switches **AMBIENT ↔ REACTOR**. AMBIENT retains its original 30 procedural patches. REACTOR has **32 sample-backed presets** across kick, snare, cymbals, toms, electric bass, rhythm guitar, lead guitar and keyboards. The local bank contains **130 CC0 recordings** from Karoryfer Big Rusty Drums and FreePats: actual drums, electric guitar/bass and upright piano, plus recorded synth timbres. KEYS offers Attack piano, Dark piano, Analog arpeggio and Cutting synth. Presets may share recordings with different envelopes, EQ and amp processing; they are not 32 separately sampled instrument models. REACTOR starts at 100 BPM. Both worlds now use original local motif libraries and ensemble rules to generate 4/8-bar music; bass and riff have independent parts under shared harmony.

Recordings load on demand only from the local site when REACTOR is selected, played or exported (about 65.47 MiB of classic-script WAV packs, including long guitar tails). First playback waits for decoding; failure shows a retryable message and never substitutes procedural instruments. Classic-script packaging supports direct file opening and GitHub Pages, without a build, account, API key, runtime CDN or third-party dependency. [Sound provenance, rights evidence and limitations](assets/reactor/README.md) document every imported recording. All selected sources are CC0/public domain, without payment or mandatory attribution; listening and physical-device acceptance remain required.

### Numeric controls and hints / Числовые настройки и подсказки

Drag numeric controls right/up to increase or left/down to decrease, within their bounds and steps. Mouse drags are relative; ordinary slider clicks, touch interaction and keyboard controls remain available. BPM drag changes by 1 BPM while typed input retains 0.01 precision. Short RU/EN definitions appear after hovering over instrument setting captions. Sound buttons wrap into two columns to accommodate longer names.

Зажмите числовое поле и тяните вправо/вверх для увеличения или влево/вниз для уменьшения. Значения ограничены диапазоном и шагом; обычные клики по ползункам, клавиатура и сенсорное управление сохраняются. Перетаскивание BPM меняет темп на 1, ввод допускает сотые. Наведите курсор на подпись настройки инструмента и задержите его для короткой подсказки.

### Roles, motifs and compatible instruments

Both worlds share one transport/instrument panel with eight fixed roles: **Pulse, Accent, Percussion, Texture, Bass, Melody, Arpeggio, Harmony**. Each world starts with suitable instruments. The editor offers compatible sound families; GENERATE uses a narrower world/role affinity pool and varies active parts and gentle FX while keeping master settings and cycle configuration. Tuning remains within 20–100%. Each card displays a light schematic drawing matching its musical theme: audio impulse for Pulse, dynamic spark for Accent, hi-hat cymbals for Percussion, flowing atmospheric layers for Texture, deep sub sine wave for Bass, beamed notes for Melody, stepped sequence ladder for Arpeggio, and a braced chord stack for Harmony.

Каждая карточка инструмента отображает лёгкий схематичный рисунок своей роли: звуковой импульс для Пульса, динамическая искра для Акцента, тарелки хэта для Перкуссии, плавные атмосферные волны для Текстуры, глубокая синусоида для Баса, ноты для Мелодии, ступенчатая лестница для Арпеджио и аккордовый стэк со скобкой для Гармонии.

The existing original motif library and ten ensembles per world remain the basis of the local generator. Generator 3 adapts their patterns and notes to the track role: mono bass/arpeggio, up to three simultaneous melodic notes and four harmony notes. No model, service or download is required. Old generator-1/2 projects retain their prior behavior until explicit generation or a compatible sound/cycle change.

Right-click, hold or Shift+Enter opens sound and cycle controls. Cycle length is 4–32 local steps, each lasting a sixteenth, eighth or quarter note, with an adjustable phase offset. Default 16 sixteenths preserves aligned 4/8-bar phrasing; alternate lengths develop across the shared clock. Exact edited steps override these cycles. Autosaves and portable projects preserve their settings and phrase position. WAV/MP3 exports render the selected 4/8-bar window; a polymetric window is not necessarily a seamless loop. See [role rules, defaults and compatibility](docs/track-roles.md).

### Phrase → Composition / Фраза → Композиция

Use the compact rocker on the left edge of the lower panel to switch **Instruments ↔ Composition**. The current loop is treated as the **author’s first verse**, kept intact. **Build composition** develops Intro (4 bars), Verse (8), Chorus (8), Verse 2 (8), the same Chorus (8), Bridge (8), the same Chorus (8), and Outro (4): 56 bars, about 2:46 at 81 BPM.

The arranger identifies the leading active melodic part and retains its original event pitches. Other parts use the same instruments, seed, key and existing role/ensemble motif families: chorus fills accompaniment gaps and introduces suitable dormant parts; Verse 2 changes accompaniment while keeping the lead; bridge answers with alternating bars and sparse support; intro/outro expose fragments and sustained support. Slow texture/harmony voices leave two-bar space. This is deterministic local rule-based development, not an AI model or an arbitrary new song. First-verse settings/mutes remain untouched; derived parts may activate dormant accompaniment. Intro/outro fade on the audio clock. Block fill represents event activity, not loudness.

**GENERATE / СОЗДАТЬ** now chooses a changing ensemble of 4–6 active voices, retaining bass and melody as anchors, plus independent optional reverb/delay/chorus sends between 0 and 50%. Low/percussive voices use smaller sends; delays stay BPM-synchronized. Character, duration, density and presence still vary within 20–100%; master settings and local cycles persist. Manual FX controls can still exceed the generator’s 50% ceiling. Generation clears saved steps/pitches, makes generator-3 material, and updates the selected/sounding phrase when a composition exists.

**Русский:** исходный луп считается первым куплетом и сохраняется целиком. Из него развиваются вступление, припев, второй куплет, бридж и финал; три припева используют одну фразу. Ведущий мотив сохраняет ноты, а сопровождение использует совместимые семейства паттернов и тот же ансамбль. «СОЗДАТЬ» меняет состав из 4–6 голосов и выбирает мягкие FX от выключенных до 50%; бас и мелодия остаются опорой. Это локальный алгоритм музыкальных правил, без нейросети или сервера.

Tap a card’s title or background to select its phrase while keeping Composition visible. During playback, it queues the phrase for the end of the current 4/8-bar phrase cycle; a later click replaces the queued choice. The queued card has a dashed border and “Next” status. Playback continues from that section in composition order, without restarting the audio context. While paused, selection loads the phrase immediately; use the side rocker explicitly to open Instruments. Drag the dotted grip to reorder cards with mouse or touch; Alt+Left/Right on the focused grip provides keyboard movement. **Repeat phrase** inserts a reference: editing either repeat changes both. **Create variation** inserts an independent copy for separate editing. Use the + / × actions on each card to repeat/delete it, ⧉ for an independent variation, and the − / ×N / + counter inside it for 1–8 repeats. The trailing + adds the current phrase; ✧ rebuilds an arrangement. No separate phrase toolbar or tab row. Card titles share the drag/delete header; the side rocker matches the height of the visible phrase/track area. EQ captions and values share a line. Composition playback starts at the beginning; pause resumes its position. Switching to Instruments restores the selected phrase for editing. The right instrument editor remains available.

**Русский:** переключите нижнюю панель на «Композиция» и нажмите «Собрать композицию». Нажмите название или фон карточки, чтобы выбрать фразу. Во время проигрывания она начнётся после текущего 4/8-тактового цикла; повторный выбор заменяет следующую фразу. Панель композиции остаётся открытой. Для редактирования используйте боковой переключатель инструментов. Порядок меняется перетаскиванием за точечную ручку (или Alt + стрелки); повторы и кнопки +, ×, ⧉ находятся прямо на карточке. Боковой переключатель возвращает к композиции. «Повторить фразу» связывает музыкальные данные; «Создать вариацию» делает независимую копию. Заполнение карточки показывает активность нот, а не громкость. Для редактирования поставьте воспроизведение на паузу и перейдите к инструментам боковым переключателем. Выбор карточки во время проигрывания не ставит музыку на паузу.

Composition autosaves in localStorage. SAVE/LOAD serialize all referenced phrases into JSON; SHARE uses a compact `#song=` link (up to 24,000 characters, otherwise use JSON). WAV/conditional MP3 exports the whole composition when its panel is selected, and the selected phrase in Instruments mode. Old loop files remain supported. One composition uses one sound world, at most 32 phrases/sections and 128 bars; no backend, build, dependency, CDN or imported asset was added. GitHub Pages uses relative local scripts as before.

The arranger develops accompaniment rather than composing an unrelated lead, and does not offer a separate saved-phrase library or crossfade worlds. Visual orbit brightness responds to section activity/fades; no automatic scene switching. 127 automated tests pass, including model, DOM, pointer/keyboard ordering, live/offline scheduling and compact-link contracts. The in-app browser verified drag, in-card repeats, mode switching, editor coexistence and bounded layouts at 1440×900, 390×844 and 320×568; long songs scroll horizontally, short viewports scroll the lower panel vertically. Phrase overlays hide in Composition without discarding placement; default editor and promotion avoid the transport. Listening, Safari/iOS and physical touch-device acceptance remain pending.

### Existing controls

| Action | Result |
| --- | --- |
| Play / Space | Start or pause sound |
| Tap a track / press 1–8 | Mute or unmute one voice |
| Right-click a track / long-press on touch | Open sound editor to choose sounds and tune character, duration, space, density, and presence |
| SOUND / FX tabs in instrument editor | Toggle between core timbre controls (character, duration, space, density, presence) and shared FX sends (Reverb, BPM-synced Delay with 1/16, 1/8, 1/8D, 1/4 taps, and stereo Chorus) |
| Shift+Enter on a focused track / Escape | Open / close its sound editor |
| Tap a moving light | Toggle its voice in the scene |
| Orbit / Bloom / Current | Change the visual universe without changing the music |
| CLASSIC / COSMIC | Original graphics or individual comet trails and richer nebula glow |
| DRIFT / IN TIME / PHRASE | Free trajectories, event-aligned orbits, or a 4/8-bar phrase loop with note markers |
| NEW PATTERN | Generate a new seeded melody/rhythm once |
| AUTO PATTERN | Generate again at each completed 4/8-bar phrase; off by default |
| ◀ / key ▶ | Previous/next minor key on the circle of fifths |
| AUTO KEY | Independently choose another key after each phrase; off by default |
| 4 BARS / 8 BARS in PHRASE | Select phrase length |
| PHRASE panel grip / arrow keys on its focused header | Move the floating phrase controls; Shift+arrows moves farther. Position persists locally |
| EDIT → SAVE PATTERN | Set exact sixteenth-note events for all eight voices and save locally |
| BPM field | Enter 30–200 BPM (up to two decimal places), then Enter or leave the field |
| SAVE / LOAD | Export/import a versioned 4/8-bar JSON project, without audio or samples |
| SHARE | Generate and copy a shareable link encoding the current loop into a compact URL hash (`#loop=...`), restoring the exact setup on GitHub Pages without a backend |
| WAV / MP3 | Render the selected loop locally; MP3 requires native browser codec support |
| RU / EN in the visual panel | Switch language; first visit uses the primary browser language, Russian for `ru`, English otherwise |
| Master volume | Adjust the whole loop from 0–100%, initially 50%; saved projects and offline exports retain it |
| Maximize-style icon in the upper right | Visuals only: hide all controls and labels; click/tap anywhere or press Escape to restore them. Music and open editor state remain intact; the mode is saved locally |

The small card below the introductory text rotates Privacy Detector Agent, Video Wallpaper, Filexa and AI360 every 15 seconds. On narrow screens, or short windows where the introductory text is hidden, it folds beyond the left edge, leaving a vertical product title and an expand arrow. Expanded cards collapse after 8 seconds (Escape also closes them). Folded titles continue rotating; hovering or focusing an open card pauses rotation, as does hiding the page. Descriptions are available in Russian and English. Cards use local text, with no external media or requests before opening a link.

**Reset workspace**, beside the local autosave hint, asks for confirmation, clears all localStorage at the current site origin, and reloads the default workspace. Export a project first to keep your composition. Playback remains paused; language is detected from the browser again. Other applications sharing the same origin may also use that storage.

**Русский:** на широком экране карточка находится под вводным текстом; на узком или низком окне остаются вертикальное название продукта и стрелка раскрытия слева. Через 8 секунд карточка сворачивается; Escape также закрывает её, а названия продолжают меняться. «Сбросить рабочую область» рядом с подсказкой об автосохранении запрашивает подтверждение, очищает весь localStorage текущего адреса сайта и возвращает начальные настройки. Сначала экспортируйте проект, если хотите сохранить композицию. Данные других приложений на том же origin также могут быть удалены.

**Русский:** язык определяется по основному языку браузера: RU для русского, иначе EN. Кнопка справа переключает язык. Общая громкость лупа — 0–100%, по умолчанию 50%; она сохраняется в проекте и применяется к экспорту. Небольшая карточка других продуктов меняется раз в 15 секунд, задерживается при наведении, фокусе или скрытии страницы; стрелка переключает её вручную.

All current and future user configuration must persist in validated localStorage, including language, master volume, sounds, patterns, drafts, visual modes and window positions. Playback starts only after a user gesture. Storage belongs to the browser profile and site origin, not an account. Future features, descriptions, messages and accessible labels must support RU and EN.

Use original assets created for this project or verified freely redistributable assets only. Do not add fonts, images, media or third-party libraries requiring paid, restrictive or separately acquired licensing. Document provenance and redistribution conditions before adding any third-party asset. This update adds no external font, image, media or library.

**Русский:** все текущие и будущие пользовательские настройки должны сохраняться в проверяемом localStorage. Все функции, описания, сообщения и подписи доступности поддерживают RU/EN. Допустимы собственные ресурсы или проверенные свободно распространяемые материалы; запрещены шрифты, изображения, медиа и библиотеки с платным, ограничительным или отдельно приобретаемым лицензированием. Происхождение и условия распространения документируются заранее.

The PHRASE panel starts above the bottom transport, keeping the central visualization clear. Drag its dotted grip or focus its header and use arrow keys; its position and stacking order are saved. The Play button keeps its circular shape during responsive resizing. A local SVG favicon reproduces the original header emblem. Canonical, description, Open Graph, Twitter card and WebApplication metadata describe the public GitHub Pages site; descriptions switch with RU/EN. Search indexing and social preview refresh depend on crawlers and deployment.

The nebula shares the orbit center and scale. Its flowing noise uses continuous coordinates to avoid the angular background seam; cloud brightness fades outside the sphere. The CSS fallback glow uses the same center when WebGL2 is unavailable.

**Русский:** кнопка с символом максимизации справа сверху включает режим «Только визуализация»: исчезают элементы интерфейса и надписи, музыка продолжает играть. Клик или касание в любом месте либо Escape возвращает интерфейс, сохраняя открытые окна. Возвращающий клик не переключает голос. Режим сохраняется в localStorage; он скрывает интерфейс без перехода в системный полноэкранный режим.

**Русский:** туманность привязана к центру и масштабу орбит. Непрерывные координаты текстуры устраняют угловой шов, а яркость облаков плавно снижается за пределами сферы. Без WebGL2 фоновое CSS-свечение использует тот же центр.

**Русский:** плашка ФРАЗА изначально находится над нижней панелью. Её можно перетаскивать за точечный захват или двигать стрелками при фокусе на заголовке; позиция и порядок окон сохраняются. Кнопка воспроизведения остаётся круглой при изменении ширины окна. Добавлены собственный SVG favicon по эмблеме из шапки и метаданные публичного сайта, включая описание, canonical, Open Graph, Twitter и WebApplication. Описания поддерживают RU/EN; фактическая индексация и обновление превью зависят от публикации и поисковых роботов.

## What works today

- Eight independent track settings; **five active by default**.
- Eight AMBIENT sound banks assignable to any orbit, **original procedural sounds** (30 patches): ringing accents, harmonic bed, low foundation, plucks, light rhythm, sustained textures, wooden percussion, and environment.
- Per-track sound selection, character (filter brightness), duration (future note envelopes), and space (reverb send). Environmental sounds are synthesized textures, not field recordings or realistic instrument samples.
- One Web Audio clock with 16th-note scheduling, shared transposable minor-key ensemble harmony and original 4/8-bar motifs. The second four bars develop the first; old generator-1 files retain their original harmonic rules.
- Three closed-trajectory visual modes, drawn using Canvas 2D over an optional WebGL2 nebula.
- Three shared FX buses (stereo Reverb, BPM-synced Delay with 4 rhythmic taps, and wide stereo Chorus) with per-instrument send levels, master compression, smoothly ramped track levels/mutes, density, and a scrollable editor for small screens.
- Four sustained events per track with a short release for stolen events, bounded envelopes, shared noise buffers, and source cleanup.
- No runtime requests to third-party services or tracking. REACTOR downloads only its local CC0 packs on demand.

**Important limitation:** track patterns currently share the same 16-step grid. Different orbit speeds are visual; independent musical polymeters, direct orbit editing, cloud sharing, and external sample playback are future work, not existing features.

### Seeing and building a beat

**DRIFT** preserves the original free trajectories. **IN TIME** uses regular aligned orbits: each voice completes a revolution between its pattern steps and crosses the common horizontal axis on a potential note/strike. The axis shows the bar and beat. Light accents appear when a scheduled audio event reaches the audio clock, rather than during lookahead. Density can skip a note; a silent crossing is not a trigger. Switching motion modes never changes sound or transport. Orbit/Bloom/Current remain separate scene choices; in IN TIME their voice paths use the same aligned geometry.

**PHRASE** supports **4 BARS (64 steps)** or **8 BARS (128 steps)** per revolution. All voices share one rotating playhead; bar labels divide the orbit accordingly. Filled markers show notes, hollow markers show generated skips, and small dots show subdivisions. Muted rings retain their enabled preview. Switching length preserves the musical clock but changes loop grouping immediately; an existing four-bar edited pattern repeats twice in eight bars, while four-bar view uses only the first half of an eight-bar pattern (the stored eight-bar data is retained).

### Fixed loops, generation and harmony

By default the generated melody, probability decisions, rhythm and velocities repeat within the selected 4/8-bar loop. **GENERATE** explicitly changes the seed and rebuilds generated rhythmic positions and melodic choices. **PATTERN → AUTO RANDOM** does this at each loop boundary; it starts off. **KEY → AUTO RANDOM** is independent and selects a different minor key at the same boundary; it also starts off. Use **◀ / key ▶** to move manually through the circle of fifths (D → A → E → B → F♯ → C♯ → G♯ → D♯ → A♯ → F → C → G). All pitched voices transpose together; drums remain unpitched. Re-enabling generation discards manual timing in the current session; the last saved browser pattern remains available after reload until replaced by another save.

### Edit and save phrase steps

In PHRASE, choose 4/8 BARS, then **EDIT**. Select one of eight voices and toggle the 16 sixteenth-note buttons in each bar. Labels like `3.9` mean bar 3, step 9; accessible labels also specify beat and subdivision. Switch voices to edit the rest. Changes remain a draft until **SAVE PATTERN**; **CANCEL** discards the draft. On a phone, swipe the grid sideways and scroll vertically for later bars.

SAVE PATTERN writes a validated version-1 record to this browser's local storage, then applies exact steps to all eight voices and switches **AUTO PATTERN OFF**. AUTO KEY retains its independent setting. Exact edited events bypass density and generated alternate-bar rests; muted voices still produce no sound. Saved records contain phrase length, steps, sound selections, seed and current key. They restore on reload on the same site/origin; levels, effects, mute states and automatic-mode preferences are not saved. Storage failure leaves the draft available instead of claiming success. There is no account or cloud sync. Use SAVE / LOAD for portable project files. This is note-timing editing, not pitch-per-step editing or queued clip launching.

Audio is still scheduled ahead: manual changes can take about 160 ms to affect already planned events. Automatic changes are assigned to the next phrase's events by the scheduler; no animation frame triggers sound.

For a stronger beat in AMBIENT, select **ROOT → Punch kick**, **RAIN → Dry snare** (or Clap), and **MOSS → Closed hat** on three orbits. Enable those voices. Density 100% plays all hits of the selected motif; generator-2 percussion uses varied role-specific phrases. For a fixed quarter-note kick or backbeat, enter exact hits in PHRASE EDIT. Lower space for a drier beat and adjust presence to taste. MOSS also has Low tom; RAIN also offers Closed hat. Changing sound changes its actual musical role; choosing another bank lets you place it on any orbit. These are original procedural drums, not imported recordings.

### Cosmic graphics

**COSMIC + DRIFT** is the first-visit default; restored preferences take priority. CLASSIC restores the previous tails and background. **COSMIC** adds eight original visual signatures: GLASS prism shards, TIDAL layered wave ribbons, ROOT pressure rings, EMBER sparks, RAIN silver droplets, VEIL silk threads, MOSS spores, and AURA a double helix. An extra WebGL2 nebula layer adds soft flowing light; all comet effects also work through Canvas 2D without WebGL2.

Graphics selection is independent of scene, motion mode and audio. Trails use bounded procedural geometry without accumulating particle objects. Desktop uses up to 44 samples and 18 decorations per trail; narrow screens use 22/9. Reduced-motion preference lowers this to 12/4, removes time-driven ornament motion and extra pulse rings, and disables the extra shader layer. This does not yet stop the original universe's decorative motion. Device performance varies; CLASSIC is always available. No libraries, CDNs or downloaded assets are required.

### Portable projects and audio export

**SAVE** downloads `notbad-halo-project.json`: a version-1 settings/events document for 4 or 8 bars. It includes BPM, seed, key, selected sounds, enabled voices, levels and tuning, and exact note-step arrays. It contains no audio, samples, URLs or executable code. **LOAD** validates the complete document before changing state and leaves playback paused. Imports are capped at 64 KiB, eight unique known voices, 128 unique steps per voice, bounded numeric settings and recognized sound IDs. Unknown fields are ignored rather than copied into application state. Automatic generation is off after import so the imported loop remains reproducible.

**WAV** renders one exact loop using the same synthesis in an OfflineAudioContext, entirely in the browser. One prior loop warms up the effects; the exported duration is exactly 4/8 bars at the selected BPM. **MP3** works only if the browser provides a native WebCodecs MP3 encoder; it checks support before rendering and otherwise explicitly offers WAV. The tested in-app Chromium browser has no native MP3 encoder. No audio is uploaded, no backend/CDN/encoder dependency is introduced, and no WAV file is mislabeled as MP3. This implementation does not supply a third-party encoder, in line with the restriction on introducing license obligations.

BPM accepts only decimal values from 30 to 200, with at most two fractional digits and seven input characters; invalid values leave the previous tempo intact. Tuning values are finite and bounded to 0–100. Project files are parsed as data, never evaluated or inserted as HTML. These checks are input hardening, not a claim of a complete security audit.

### Floating editors and larger universe

The voice editor and PHRASE EDIT are independent floating windows. The **⠿ grip** in each heading identifies the drag area; clicking a window brings it forward, and opening one places it above the other. Dragging is constrained to the viewport, and moved windows are clamped after resizing. On phones the editors keep internal scrolling.

The universe targets 1.5× its former scale where space permits, with conservative viewport bounds and smaller scaling on narrow/short windows. GENERATE also rebuilds an open PHRASE EDIT draft so its grid follows the newly generated pattern; use SAVE PATTERN to keep the new draft.

### Automatic local state and compact controls

The menu is grouped into **PATTERN** (GENERATE, AUTO RANDOM), **KEY** (previous/current/next key, independent AUTO RANDOM), and **PROJECT** (SAVE, LOAD, MP3, WAV). Scene selection (Orbit/Bloom/Current) is visible and affects representation only in DRIFT; IN TIME and PHRASE retain their synchronized geometry and neutral background. The stored DRIFT scene returns when you switch back.

State is automatically saved, coalesced over about 250 ms, to `notbad-halo-autosave-v1` in **localStorage**, not cookies. It retains sounds, enabled voices, tuning/levels, generated seed, exact manual steps, 4/8 bars, BPM/key, both auto flags, visual modes/scene, open voice selection, EDIT draft/tab and dragged window positions. Records are size-limited and validated before restore. Playback returns paused rather than unexpectedly starting sound. Blocked/full storage is reported in the information window; current in-memory work remains usable and project-file export remains available.

This storage belongs to the current site origin and browser profile, not an authenticated person. It does not synchronize across devices; people sharing a browser profile share its saved state. The **? · Local autosave** footer opens a draggable explanation of what is stored, that nothing is sent for analytics/tracking, how to clear site data, and the continued-use agreement. No audio, samples, login or tracking cookies are stored.

## Project files

- `index.html` — static entry, inline UI/transport and visual scenes.
- `src/sounds.js` — eight patch banks and deterministic harmonic/event rules.
- `src/audio.js` — procedural synthesis, audio routing, effects and voice cleanup.
- `src/preferences.js` — bounded complete local-autosave validation.
- `src/project.js` — bounded project/BPM validation and PCM WAV serialization.
- `src/export.js` — offline loop rendering and conditional native MP3 encoding.
- `src/windows.js` — draggable editor stacking and viewport constraints.
- `src/composition.js` — loop-boundary generation/key decisions and validated pattern serialization.
- `src/effects.js` — bounded individual Canvas comet effects.
- `src/motion.js` — pure musical-step-to-orbit phase mapping.
- `tests/` — Node tests for sound rules, audio contracts and app wiring.
- `.nojekyll` — serve repository assets directly on GitHub Pages.
- `AGENTS.md` — engineering and product guardrails for coding agents.
- `PROJECT_MAP.md` — current architecture, target structure, roadmap, and acceptance criteria.
- `CHANGELOG.md` — short dated record of significant changes.
- `screenshot.png`, `screenshot-mobile.png` — visual references.
- `LICENSE` — MIT.

## Technical direction

**Today:** zero-dependency HTML/CSS/JavaScript, Web Audio API, Canvas 2D, optional WebGL2.

**Current extraction:** sound banks/composition and synthesis live in small dependency-free scripts; transport/UI/visuals remain inline. Classic scripts preserve direct file opening as well as static HTTP hosting.

**Next:** extract remaining transport, visuals, UI, and versioned serialization as needed. Keep the app deployable as a static site. Consider AudioWorklet, better patches, or WebGPU only when a demonstrated need justifies them.

Audio events must be scheduled from `AudioContext.currentTime`, **never from the animation frame rate**. Visual scenes are alternative representations of the same composition, not separate audio engines.

## Development roadmap

The first sound-bank stage is implemented: eight roles with procedural sound banks, and character/duration/space tuning in the object editor. Existing slot order, colors and worlds remain. External CC0 sample banks and their loading/failure handling remain planned. See [PROJECT_MAP.md](PROJECT_MAP.md#approved-sound-bank-direction-2026-10-12).

External sounds must have verified **CC0/public-domain** status, with source evidence recorded per file. Free downloads and royalty-free labels are insufficient; sounds requiring payment, attribution, or restricted redistribution are excluded. Original procedural synthesis remains available without sample downloads. See [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/) and [Freesound's rights guidance](https://freesound.org/help/faq/).

Longer-term milestones:

1. Stabilize the prototype and separate its core modules without changing behavior.
2. Save, load, and share reproducible eight-track universes.
3. Add direct manipulation of orbit patterns and genuine per-track rhythmic variation.
4. Improve timbres, envelopes, musical phrasing, and dynamics.
5. Create richer visual worlds with accessible mobile performance modes.
6. Add PWA/offline support, audio export, and optional MIDI capabilities.

See [PROJECT_MAP.md](PROJECT_MAP.md) for detailed milestones.

## Publishing on GitHub Pages

**Required deployment target:** HALO must continue to run directly on GitHub Pages, including project URLs under `/<repository>/`. No backend, mandatory build, secrets, runtime CDN, or server rewrites. HTML, JavaScript, and any future sound files are served from the repository using relative paths.

### Первая публикация

1. Создайте репозиторий на GitHub или откройте существующий. Для бесплатного аккаунта используйте публичный репозиторий. Нужны права на настройку Pages.
2. Загрузите файлы проекта через **Add file → Upload files** либо GitHub Desktop. `index.html` должен находиться в корне выбранной ветки, обычно `main`, а не во вложенной папке. При появлении модулей и звуков загружайте их папки с сохранением структуры и регистра имён.
3. В **Settings → Pages → Build and deployment** выберите **Source: Deploy from a branch**, ветку `main` (либо вашу ветку публикации) и **/(root)**, затем **Save**.
4. Дождитесь успешного **pages build and deployment** во вкладке **Actions**. Откройте адрес из **Settings → Pages**; обычно это `https://<user>.github.io/<repository>/`.
5. Нажмите **Play**: звук запускается после действия пользователя. Проверьте паузу/возобновление, восемь дорожек, редактор, три сцены и страницу на телефоне.

### Обновление сайта

1. Проверьте изменения локально. До публикации обновите описание возможностей в README, состояние проекта в PROJECT_MAP и короткую запись в CHANGELOG для значимых изменений.
2. Через GitHub Desktop или загрузку файлов на GitHub отправьте проверенные изменения в ту же ветку и папку, которые выбраны в Pages. Публикация запускается автоматически; повторно включать Pages не требуется. Это действия владельца репозитория — агент не коммитит и не публикует без отдельного разрешения.
3. Дождитесь успешного deployment в **Actions**, затем откройте прежний адрес сайта. Если видна старая версия, выполните жёсткое обновление (`Ctrl+Shift+R`) или проверьте в приватном окне.
4. Повторите проверку Play, паузы, дорожек и сцен. При добавлении ресурсов проверьте отсутствие ошибок загрузки в Network/Console. Пути вида `/assets/...` ведут в корень домена; для проектного сайта используйте `./assets/...` или URL относительно модуля.
5. Если deployment завершился ошибкой, изучите его журнал в Actions. Для отката восстановите предыдущие рабочие файлы в ветке публикации и отправьте обновление; дождитесь нового успешного deployment.

Official instructions: [configure the publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [create a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Development checks

### Локальный предпросмотр и проверка в Codex

Из корня проекта в PowerShell запустите `./scripts/preview.ps1` (нужен Python 3), затем откройте `http://127.0.0.1:8766/` во встроенном браузере Codex. Для другого порта: `./scripts/preview.ps1 -Port 8770`. Остановить сервер: `Ctrl+C`. Сервер слушает только `127.0.0.1`; он нужен для разработки, а GitHub Pages продолжает работать без Python и backend.

Для автоматической браузерной проверки используйте HTTP-предпросмотр: браузерный инструмент может запрещать `file://`, даже если вручную файл открывается в Chrome. В Windows sandbox локальные сокеты могут быть запрещены; при ошибке доступа к сокету запустите только сервер предпросмотра вне sandbox через штатное разрешение на выполнение. Не отключайте ограничения безопасности браузера. Если старый браузерный адаптер сообщает `native pipe bridge is not available`, используйте доступный текущий Browser/Computer Use API для того же встроенного браузера; ошибка адаптера сама по себе не доказывает недоступность браузера.

После правок перезагрузите вкладку. Проверьте Play/паузу/возобновление, все восемь редакторов, выбор звуков, ползунки, клавиатуру, три сцены и Console. Для проверки мобильной раскладки используйте узкий viewport; это не заменяет Safari/iOS или реальный телефон.

Run `node --test tests/sounds.test.cjs tests/app.test.cjs tests/motion.test.cjs tests/effects.test.cjs tests/composition.test.cjs tests/project.test.cjs tests/preferences.test.cjs` with Node.js (development only; no runtime dependency or installation is needed for playback). Tests cover chord membership, deterministic triggers, all patch audio contracts, event limits/cleanup, editor wiring, shared scene-independent scheduling, pause/resume, and late-tick recovery with fake DOM/Web Audio objects.

These checks do not establish audible quality, mobile/browser rendering, ten-minute stability, or actual Pages deployment. Before publishing, listen to all eight voices, try all banks and parameter extremes, check keyboard/touch, and test Chrome plus Safari/iOS when available.

## Contributing

Design, audio, graphics, interaction, accessibility, and performance contributions are welcome. Please read [AGENTS.md](AGENTS.md) before changing the audio scheduler or visual architecture. Protect the core feeling: **calm to hear, fascinating to watch, immediate to play**.

Major or consequential changes must update project documentation and add a concise dated entry to [CHANGELOG.md](CHANGELOG.md) in the same patch. Document actual behavior, compatibility impact, and known limits; keep roadmap proposals separate from shipped features.

## License

MIT — see [LICENSE](LICENSE).

REACTOR: GENERATE rebuilds rhythmic steps for every voice. METAL/TOMS can play in each bar; density and mute still control actual hits. RIFF/LEAD ring with the recording's natural decay until a new note replaces them smoothly; the duration control does not truncate guitars. Longer guitar recordings increase the local sample-bank download to about 65.47 MiB. / REACTOR: СОЗДАТЬ меняет ритм всех восьми голосов. METAL/TOMS доступны в каждом такте, с учётом плотности и выключения. RIFF/LEAD затухают естественно и плавно сменяются новой нотой; регулятор длительности не обрезает гитары. Размер локального банка — около 65,47 МиБ.

REACTOR generation rebuilds note positions, hit groups and rests rather than rotating the previous rhythm. The generated loop stays repeatable until GENERATE or AUTO PATTERN changes it. / Генерация REACTOR заново выбирает позиции нот, группы ударов и паузы вместо поворота старого рисунка. Новый цикл повторяется до следующего СОЗДАТЬ или изменения через АВТО.

BASS and RIFF in REACTOR generate independent rhythmic patterns while sharing harmony and tempo. Existing exact saved steps change only after GENERATE. / BASS и RIFF в REACTOR получают независимые ритмические рисунки при общей гармонии и темпе. Ранее сохранённые точные шаги изменятся после СОЗДАТЬ.

### Master sound controls / Мастер-звук
The transport card contains Play/Pause, volume, BPM, three-band EQ (120 Hz / 1 kHz / 6 kHz, ±9 dB) and stereo width. The curve previews the band settings. EQ defaults to flat; width defaults to 35%. Each voice has a fixed stereo position; width 0 centers the direct instruments while reverb retains its stereo space. EQ boosts no longer turn down the whole mix. A near-peak compressor (-1 dB threshold, hard knee) replaces the former broad compression and automatic boost trim; arbitrary loud mixes can still activate peak protection. Master settings persist locally and travel with project files and WAV/MP3 exports. REACTOR drums have stronger event gains. Listening and device acceptance remain separate from tests.

Плашка транспорта объединяет Play/Pause, громкость, BPM, три полосы EQ (120 Гц / 1 кГц / 6 кГц, ±9 дБ) и ширину сцены. Кривая показывает настройки полос. По умолчанию EQ нейтрален, ширина — 35%. Голоса имеют разные позиции в стерео; 0% ставит прямой звук в центр, реверберация сохраняет объём. Подъём полосы EQ больше не уменьшает громкость всего микса. Компрессор с порогом −1 dB вместо прежней сильной компрессии срабатывает у пиков; очень громкий микс всё ещё может включить защитное сжатие. Настройки сохраняются локально, в проектах и экспорте. Ударные REACTOR получили более сильный уровень атаки.

GENERATE now selects another sound for each voice and randomizes character, duration, density, level and space within 20–100%. Muted tracks stay muted; master controls, tempo and key are preserved. AUTO PATTERN still changes only the generated pattern. / СОЗДАТЬ выбирает новый звук каждого голоса и меняет характер, длительность, плотность, уровень и пространство в пределах 20–100%. Выключенные дорожки остаются выключенными; мастер-настройки, темп и тональность сохраняются. АВТО рисунка по-прежнему меняет только рисунок.

Internal voice gain is calibrated ×2: at the same composition and EQ, master 50% feeds the previous master-100% level into master processing. The master card uses compact LOW/MID/HIGH/STAGE captions. The upper-right miniature orbit switches musical worlds; its label names the destination. / Внутренний уровень голосов поднят вдвое: при тех же настройках мастер 50% подаёт прежний сигнал 100% в мастер-обработку. Подписи плашки — НИЗ/СЕРЕДИНА/ВЕРХ/СЦЕНА. Мини-орбита справа сверху переключает музыкальные миры; подпись указывает мир назначения.
