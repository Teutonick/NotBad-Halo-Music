# HALO through WebMCP / HALO через WebMCP

WebMCP connects compatible browser agents. File Bridge is a separate supported folder transport; see [Agent API](agent-api-specification.md). Internal musical APIs are implementation details.

## Включение

1. Для локальной проверки Chrome откройте `chrome://flags/#enable-webmcp-testing`.
2. Выберите **Enabled**, перезапустите браузер, откройте HALO заново. Если флага нет, такой способ включения недоступен в этой версии.
3. Для рабочей копии запустите `./scripts/preview.ps1` и используйте `http://127.0.0.1:8766/`. Для опубликованного сайта используйте его HTTPS-адрес.
4. Панель AI / Агенты показывает **WebMCP доступен** после регистрации всех инструментов. Это проверка страницы; доступ агента проверяется отдельным вызовом.

Флаг включает браузерный API; подключение агента к вкладке он не создаёт. Источник: [Chrome WebMCP](https://developer.chrome.com/docs/ai/webmcp).

## Кейс 1: Codex / Claude / Antigravity

1. Запустите агент с браузерным подключением, которое умеет обнаруживать и вызывать WebMCP. Откройте HALO в браузере этого подключения. Один лишь терминальный клиент не доказывает доступ к вкладке.
2. Напишите: «Открой http://127.0.0.1:8766/ и через WebMCP вызови halo_get_context. Сообщи число дорожек и доступные звуки. Если инструментов нет, остановись и сообщи об этом».
3. После успешного чтения: «Через WebMCP сочини и примени оригинальный новогодний джингл на 8 тактов: своя мелодия колокольчиков, бас, гармония и мягкая перкуссия. Сначала проверь и просмотри пакет изменений, затем примени и прочитай результат».
4. Нажмите Play. Пример следующего запроса: «Через WebMCP уменьши реверберацию мелодии, не меняя остальные партии». Для отмены: «Через WebMCP отмени последнее изменение».

Codex проверяется в текущем встроенном браузере Windows; результаты в [отчёте](release-validation.md). Claude и Antigravity — теоретический порядок, поддержка конкретных подключений не проверена. Не утверждаем наличие определённой кнопки или настройки в этих клиентах.

## Кейс 2: Bionic

1. Откройте HALO в управляемой агентом вкладке Bionic. Проверьте статус WebMCP в панели HALO.
2. В чате агента этой вкладки: «Через WebMCP вызови halo_get_context на открытой странице HALO. Если инструменты не обнаружены, остановись и сообщи об этом».
3. После успешного чтения отправьте запрос про джингл из первого кейса.
4. Нажмите Play для прослушивания. Если чтение инструментов недоступно, этот клиент пока не прошёл проверку совместимости; статус регистрации страницы сам по себе недостаточен.

Bionic пока не проверен. Здесь дан сценарий приёмки, а не обещание доступности WebMCP в каждой версии. Названия меню Bionic не предполагаются.

## English

Enable local Chrome testing at `chrome://flags/#enable-webmcp-testing`, choose Enabled, relaunch and reopen HALO. If the flag is absent, this activation method is unavailable. Run `./scripts/preview.ps1` for `http://127.0.0.1:8766/`, or use the published HTTPS URL. The flag enables the browser API; it does not connect an agent to a tab.

### Case 1: Codex / Claude / Antigravity

1. Start the agent with a browser connection that supports WebMCP and open HALO in that browser.
2. Ask: “Open http://127.0.0.1:8766/ and call halo_get_context through WebMCP. Report the track count and available sounds. If no tools are available, stop and report it.”
3. After success: “Through WebMCP, compose and apply an original eight-bar New Year jingle: your own bell melody, bass, harmony and soft percussion. Validate and preview the batch first, then apply it and read back the result.”
4. Press Play. Follow-up: “Through WebMCP, reduce melody reverb without changing other parts.” Undo: “Through WebMCP, undo the last edit.”

Codex acceptance is limited to the tested Windows in-app browser. Claude and Antigravity remain theoretical workflows until their specific browser connections pass discovery and invocation. No client-specific menu or automatic support is assumed.

### Case 2: Bionic

1. Open HALO in the tab controlled by Bionic’s agent and check HALO’s WebMCP status.
2. Ask in the agent chat for that tab: “Call halo_get_context through WebMCP on the open HALO page. If tools are not discovered, stop and report it.”
3. After success, use the jingle prompt above, replacing localhost with the HTTPS URL when appropriate.
4. Press Play to listen. Registration alone does not prove agent access. Bionic is unverified; these steps are an acceptance procedure, not a compatibility claim.

HALO uses no embedded model/key/chat. Tools validate bounded batches and retain session Undo/Redo. Preview compares data, not audio. Recordings from Track 09 are never returned. Manual music use remains available without WebMCP.
