# HALO — Interactive Sound Universe

**Compose worlds, not timelines.**

HALO is an open-source, browser-based relaxation constructor. Eight musical voices share one pulse while glowing bodies travel along different closed trajectories. Choose and shape a calm soundscape without musical expertise or the demands of a professional instrument.

![HALO desktop preview](screenshot.png)

## The idea

- **Music first:** gentle timbres, coherent harmony, controlled dynamics, and room to breathe.
- **Eight voices, one clock:** inspired by the immediacy of compact grooveboxes such as the OP-Z, without reproducing their interface.
- **Visual complexity, musical clarity:** trajectories, phases, trails, and particles obscure the obvious repetition without making the audio chaotic.
- **Play before configuration:** direct interaction first; technical parameters stay secondary.
- **Relax through construction:** gently shape an evolving environment with simple interactions.

## Try HALO

Open `index.html` in a modern desktop or mobile browser, or deploy the repository using **GitHub Pages**. No installation, build, backend, account, API key, or CDN is required.

Press **Play** to enable audio (browsers require user interaction before sound can start). Headphones are recommended.

### Controls

| Action | Result |
| --- | --- |
| Play / Space | Start or pause sound |
| Tap a track / press 1–8 | Mute or unmute one voice |
| Right-click a track / long-press on touch | Choose a bank sound; tune character, duration, space, density, and presence |
| Shift+Enter on a focused track / Escape | Open / close its sound editor |
| Tap a moving light | Toggle its voice in the scene |
| Orbit / Bloom / Current | Change the visual universe without changing the music |
| DRIFT / IN TIME / PHRASE | Free trajectories, event-aligned orbits, or a four-bar phrase loop with note markers |
| Evolve | Change the deterministic melodic variation |
| Tempo | Cycle between 60, 72, and 84 BPM |

## What works today

- Eight independent track settings; **five active by default**.
- Eight dedicated sound banks, **original procedural sounds** (30 patches): ringing accents, harmonic bed, low foundation, plucks, light rhythm, sustained textures, wooden percussion, and environment.
- Per-track sound selection, character (filter brightness), duration (future note envelopes), and space (reverb send). Environmental sounds are synthesized textures, not field recordings or realistic instrument samples.
- One Web Audio clock with 16th-note scheduling and a four-bar harmonic loop: **Dm7 → Bbmaj7 → Fmaj7 → Cadd9**.
- Three closed-trajectory visual modes, drawn using Canvas 2D over an optional WebGL2 nebula.
- Reverb, compression, smoothly ramped track levels/mutes, density, and a scrollable editor for small screens.
- Four sustained events per track with a short release for stolen events, bounded envelopes, shared noise buffers, and source cleanup.
- No external requests, tracking, or downloadable assets.

**Important limitation:** track patterns currently share the same 16-step grid. Different orbit speeds are visual; independent musical polymeters, orbit-based note editing, save/share, and external sample playback are future work, not existing features.

### Seeing and building a beat

**DRIFT** preserves the original free trajectories. **IN TIME** uses regular aligned orbits: each voice completes a revolution between its pattern steps and crosses the common horizontal axis on a potential note/strike. The axis shows the bar and beat. Light accents appear when a scheduled audio event reaches the audio clock, rather than during lookahead. Density can skip a note; a silent crossing is not a trigger. Switching motion modes never changes sound or transport. Orbit/Bloom/Current remain separate scene choices; in IN TIME their voice paths use the same aligned geometry.

**PHRASE** makes one full revolution equal **four bars / 64 sixteenth-note steps**, matching the current Dm7 → Bbmaj7 → Fmaj7 → Cadd9 phrase. All voices follow the same rotating playhead. The four cardinal points mark bars 1–4; filled markers show scheduled notes, hollow markers show candidate steps skipped by density or phrasing, and small dots show subdivisions. The header displays phrase number, current bar and beat. Muted rings remain dimly visible so you can see what will play when enabled. Switching on a voice follows the existing quantized scheduler; it does not restart the phrase or queue a next-phrase launch. Preview updates with sound, density and Evolve; the next phrase can have a different seeded pattern. Existing lookahead means the most recent setting change may take up to about 160 ms to affect already planned events.

For a stronger beat, open **ROOT → Punch kick**, **RAIN → Dry snare** (or Clap), and **MOSS → Closed hat**. Enable MOSS. Set density to 100% for regular hits: kick uses steps 0/4/8/12, snare/clap 4/12, hats 2/6/10/14. MOSS also has Low tom (6/14); RAIN also offers Closed hat. Lower space for a drier beat and adjust presence to taste. Each track plays one selected sound; three tracks allow simultaneous kick/snare/hat. Returning to a melodic patch restores that track's original pattern. These are original procedural drums, not imported recordings.

## Project files

- `index.html` — static entry, inline UI/transport and visual scenes.
- `src/sounds.js` — eight patch banks and deterministic harmonic/event rules.
- `src/audio.js` — procedural synthesis, audio routing, effects and voice cleanup.
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

Run `node --test tests/sounds.test.cjs tests/app.test.cjs tests/motion.test.cjs` with Node.js (development only; no runtime dependency or installation is needed for playback). Tests cover chord membership, deterministic triggers, all patch audio contracts, event limits/cleanup, editor wiring, shared scene-independent scheduling, pause/resume, and late-tick recovery with fake DOM/Web Audio objects.

These checks do not establish audible quality, mobile/browser rendering, ten-minute stability, or actual Pages deployment. Before publishing, listen to all eight voices, try all banks and parameter extremes, check keyboard/touch, and test Chrome plus Safari/iOS when available.

## Contributing

Design, audio, graphics, interaction, accessibility, and performance contributions are welcome. Please read [AGENTS.md](AGENTS.md) before changing the audio scheduler or visual architecture. Protect the core feeling: **calm to hear, fascinating to watch, immediate to play**.

Major or consequential changes must update project documentation and add a concise dated entry to [CHANGELOG.md](CHANGELOG.md) in the same patch. Document actual behavior, compatibility impact, and known limits; keep roadmap proposals separate from shipped features.

## License

MIT — see [LICENSE](LICENSE).
