(function (root) {
  'use strict';
  const realtime = { clock: 0xf8, start: 0xfa, continue: 0xfb, stop: 0xfc };

  function midiClock(now) {
    let output, active = false, stopAt;
    function stop(when) {
      if (!active && !(stopAt > now() && when === undefined)) return;
      active = false;
      stopAt = when;
      try {
        if (when === undefined) output.clear();
        output.send([realtime.stop], when);
      } catch (_) {}
    }
    return {
      select(port) { if (output !== port) { stop(); output = port; } },
      stop,
      active: () => active,
      tick(ctx, time, bpm, step) {
        if (output?.state !== 'connected' || ctx.state !== 'running') return;
        const reference = ctx.getOutputTimestamp?.();
        const stamp = reference?.performanceTime > 0
          ? reference.performanceTime + (time - reference.contextTime) * 1000
          : now() + (time - ctx.currentTime) * 1000;
        try {
          if (!active) {
            output.send([step === 0 ? realtime.start : realtime.continue], stamp);
            active = true;
          }
          for (let pulse = 0; pulse < 6; pulse++) {
            output.send([realtime.clock], stamp + pulse * 60000 / (24 * bpm));
          }
        } catch (_) { stop(); }
      }
    };
  }

  function install(env) {
    const get = id => document.getElementById('external' + id);
    const media = navigator.mediaDevices;
    const clock = midiClock(() => performance.now());
    const key = 'halo-external-link-v1';
    const settings = { input: '', midi: '', trim: 100, monitor: false, solo: false, count: 1, offset: 0, from: 1, to: 4, kind: 'phrase' };
    let stream, source, trim, meter, gain, engine, midi, levelTimer, connectedInput, generation = 0, status = 'disconnected';
    let takes, selectedMidi;
    const copy = {
      mode: ['Source', 'Источник'], live: ['Live input', 'Живой вход'], recorded: ['Recorded', 'Записи'],
      kind: ['Recording area', 'Область записи'], phrase: ['Phrase (4 or 8 bars)', 'Фраза (4 или 8 тактов)'],
      song: ['Composition', 'Композиция'], from: ['From bar', 'С такта'], to: ['Through bar', 'По такт'],
      count: ['Count-in (bars)', 'Отсчёт (такты)'],
      countdown: ['Starts in beats', 'До записи, долей'], whole: ['Whole composition', 'Вся композиция'],
      bpmMismatch: ['Track 10 tempo differs. Match the original BPM or enable Fit tempo.', 'Темп дорожки 10 отличается. Верните исходный BPM или включите подгонку.'], offset: ['Recording offset (ms)', 'Смещение записи (мс)'],
      fit: ['Fit tempo (changes pitch)', 'Подогнать темп (меняет высоту)'],
      record: ['Record', 'Записать'], stop: ['Stop', 'Стоп'], saved: ['Saved takes', 'Сохранённые дубли'],
      preview: ['Preview saved', 'Прослушать сохранённый'], draft: ['Preview new take', 'Прослушать новый дубль'],
      keep: ['Keep', 'Сохранить дубль'], retry: ['Retry', 'Перезаписать'], remove: ['Delete take', 'Удалить дубль'],
      confirmDelete: ['Delete this audio take from this browser? JSON copies that reference it will no longer find it.', 'Удалить аудио этого дубля из браузера? Копии JSON со ссылкой на него больше не найдут запись.'],
      noTake: ['Select a take', 'Выберите дубль'], deleteError: ['Could not delete the take.', 'Не удалось удалить дубль.'],
      cancelTake: ['Discard new take', 'Отменить новый дубль'], bundle: ['Save project with audio', 'Сохранить проект с аудио'],
      saveClip: ['Download take WAV', 'Скачать дубль WAV'],
      backup: ['Clearing site data removes recordings. Save the project with audio to keep a backup.', 'Очистка данных сайта удаляет записи. Сохраните проект с аудио для резервной копии.'],
      interrupted: ['Recording interrupted. Review the available take.', 'Запись прервана. Можно прослушать записанную часть.'],
      changedGrid: ['The musical grid changed. Download the take or delete it and record again.', 'Музыкальная сетка изменилась. Скачайте дубль или удалите его и запишите заново.'],
      changedTempo: ['Recording tempo differs. Match the original BPM, enable Fit tempo, or record again.', 'Темп записи отличается. Верните исходный BPM, включите подгонку или запишите заново.'],
      needInput: ['Connect an input to record.', 'Подключите вход для записи.'],
      needSong: ['Open the composition workspace first.', 'Сначала откройте композицию.'],
      needPhrase: ['Open the instrument workspace to record a phrase.', 'Для записи фразы откройте вкладку инструментов.'],
      badRange: ['Choose a valid bar range.', 'Выберите допустимый диапазон тактов.'],
      missed: ['The recording boundary was missed. Retry from the beginning.', 'Граница записи пропущена. Повторите запись с начала.'],
      recordError: ['Could not record Track 10.', 'Не удалось записать дорожку 10.'],
      playbackError: ['Track 10 playback stopped because of an audio error.', 'Воспроизведение дорожки 10 остановилось из-за ошибки аудио.'],
      missing: ['Track 10 audio is missing or unreadable.', 'Аудио дорожки 10 отсутствует или не читается.'],
      storage: ['Could not save the new take. The previous recording is still available.', 'Не удалось сохранить новый дубль. Предыдущая запись доступна.'],
      armed: ['Waiting for the musical boundary', 'Ожидание музыкальной границы'],
      recording: ['Recording', 'Идёт запись'], review: ['New take ready to review', 'Новый дубль готов к прослушиванию'],
      kept: ['Take kept', 'Дубль сохранён'], discarded: ['New take discarded', 'Новый дубль отменён'],
      deleted: ['Take deleted', 'Дубль удалён'],
      solo: ['Solo', 'Соло'], jsonWarning: ['JSON excludes Track 10 audio. Use Save project with audio for a portable copy.', 'JSON не содержит звук дорожки 10. Для переносимой копии сохраните проект с аудио.'],
      packageError: ['Could not save or open the Track 10 package.', 'Не удалось сохранить или открыть пакет дорожки 10.'],
      title: ['10 · EXTERNAL', '10 · ВНЕШНИЙ ЗВУК'], close: ['Collapse', 'Свернуть'],
      unlock: ['Allow audio access', 'Разрешить доступ к аудио'], input: ['Audio input', 'Аудиовход'],
      none: ['Select a device', 'Выберите устройство'], monitor: ['Monitor', 'Мониторинг'],
      mute: ['Mute', 'Без звука'], volume: ['Track volume', 'Громкость дорожки'],
      trim: ['Input gain', 'Усиление входа'], level: ['Input level', 'Уровень сигнала'],
      connect: ['Connect input', 'Подключить вход'], disconnect: ['Disconnect', 'Отключить'],
      midiAccess: ['Enable MIDI access', 'Разрешить доступ к MIDI'], midi: ['MIDI clock output', 'Выход MIDI Clock'],
      disconnected: ['Disconnected', 'Отключено'], connected: ['Audio connected', 'Аудио подключено'],
      monitoring: ['Live monitoring', 'Живой мониторинг'], lost: ['Audio device lost', 'Аудиоустройство отключено'],
      denied: ['Permission denied', 'Доступ запрещён'], error: ['Could not open audio input', 'Не удалось открыть аудиовход'],
      unsupported: ['Audio capture unavailable', 'Захват аудио недоступен'],
      midiUnsupported: ['Web MIDI unavailable', 'Web MIDI недоступен'],
      midiDenied: ['MIDI access unavailable', 'Нет доступа к MIDI'],
      midiLost: ['MIDI output lost', 'MIDI-выход отключён'],
      midiReady: ['MIDI output selected', 'MIDI-выход выбран'],
      sending: ['Clock sending · check sync on the instrument', 'Clock отправляется · проверьте синхронизацию на инструменте'],
      hardware: ['Turn off HALO monitoring when using direct monitoring on your interface.', 'Отключите мониторинг HALO при прямом мониторинге через аудиоинтерфейс.']
    };
    const t = name => copy[name][env.language() === 'ru' ? 1 : 0];
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      for (const [name, value] of Object.entries(settings)) {
        const candidate = saved?.[name];
        if (typeof candidate !== typeof value) continue;
        if (typeof value === 'string' && candidate.length > 512) continue;
        const bounds = { trim: [0, 150], count: [0, 4], offset: [-500, 500], from: [1, 128], to: [1, 128] };
        if (typeof value === 'number' && (!Number.isInteger(candidate) || candidate < bounds[name][0] || candidate > bounds[name][1])) continue;
        if (name === 'kind' && !['song', 'phrase'].includes(candidate)) continue;
        settings[name] = candidate;
      }
    } catch (_) {}
    function save() { try { localStorage.setItem(key, JSON.stringify(settings)); } catch (_) {} }
    function render() {
      const panel = get('Panel');
      for (const node of panel.querySelectorAll('[data-link]')) node.textContent = t(node.dataset.link);
      get('Toggle').setAttribute('aria-label', 'HALO LINK · ' + t('title'));
      get('Toggle').classList.toggle('active', !!stream);
      get('Status').textContent = t(stream && settings.monitor ? 'monitoring' : status);
      const transport = env.transport();
      get('Timing').textContent = transport.bpm + ' BPM · ' + transport.meter;
      const midiStatus = clock.active() ? 'sending' : get('MidiStatus').dataset.error ||
        (selectedMidi ? 'midiReady' : midi && settings.midi ? 'midiLost' : '');
      get('MidiStatus').textContent = midiStatus ? t(midiStatus) : '';
      for (const select of [get('Input'), get('Midi')]) select.options[0].text = t('none');
      get('Close').setAttribute('aria-label', t('close'));
      get('Level').setAttribute('aria-label', t('level'));
      if (!takes) return;
      const view = takes.view();
      const { state, draft, pending, take, loading, selected } = view;
      if (pending || take) get('Status').textContent = t(take && !view.beats ? 'recording' : 'armed');
      else if (state.mode === 'recorded' && state.clips.length) get('Status').textContent = t('recorded');
      for (const [id, value] of Object.entries({ Mode: state.mode, Volume: state.volume })) get(id).value = value;
      get('Mute').checked = state.mute;
      get('Fit').checked = state.fit;
      get('Range').hidden = settings.kind !== 'song';
      get('Record').disabled = !!(pending || take || loading);
      get('Stop').disabled = !(pending || take || takes.previewing());
      get('Draft').disabled = get('Keep').disabled = get('Retry').disabled = get('CancelTake').disabled = !draft || loading;
      get('Preview').disabled = get('Remove').disabled = get('SaveClip').disabled = !selected || loading;
      get('Bundle').disabled = !state.clips.length || loading;
      const select = get('Saved');
      const entries = state.clips.map(clip => [clip.id, (clip.scope === 'song' ? t('song') : t('phrase')) +
        ' · ♩ ' + (clip.start / 4 + 1) + ' · ' + clip.bpm + ' BPM']);
      options(select, entries, selected, t('noTake'));
      const feedback = view.missing ? 'missing' : view.changedGrid ? 'changedGrid' : view.changedTempo ? 'changedTempo' : view.message;
      get('RecordStatus').textContent = feedback ? t(feedback) : '';
    }
    function setGain(node, value) {
      if (!node) return;
      const at = engine.ctx.currentTime;
      node.gain.cancelScheduledValues(at);
      node.gain.setTargetAtTime(value, at, .012);
    }
    function mix() {
      setGain(trim, settings.trim / 100);
      const state = takes?.view().state;
      setGain(gain, settings.monitor && takes?.monitor() && !state.mute ? state.volume / 100 : 0);
      env.solo(settings.solo && (!!stream && settings.monitor && takes?.monitor() || state?.mode === 'recorded' && state.clips.length > 0));
    }
    function release(reason = 'disconnected') {
      generation++;
      takes?.detach();
      for (const track of stream?.getTracks() ?? []) track.stop();
      for (const node of [source, trim, meter, gain]) node?.disconnect();
      stream = source = trim = meter = gain = engine = connectedInput = null;
      get('Level').value = 0;
      status = reason;
      mix();
      render();
    }
    function options(select, entries, selected, placeholder = t('none')) {
      const expected = [['', placeholder], ...entries];
      if (select.options.length !== expected.length ||
          expected.some(([id, label], index) => select.options[index].value !== id || select.options[index].text !== label)) {
        select.replaceChildren(...expected.map(([id, label]) => new Option(label, id)));
      }
      select.value = entries.some(([id]) => id === selected) ? selected : '';
    }
    async function refreshInputs() {
      const devices = (await media.enumerateDevices()).filter(d => d.kind === 'audioinput' && d.deviceId);
      options(get('Input'), devices.map((d, i) => [d.deviceId, d.label || t('input') + ' ' + (i + 1)]), settings.input);
      if (stream && !devices.some(device => device.deviceId === connectedInput)) release('lost');
    }
    const constraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    function failure(error) { status = error.name === 'NotAllowedError' ? 'denied' : 'error'; render(); }
    async function unlock() {
      if (!media?.getUserMedia) { status = 'unsupported'; render(); return; }
      let permission;
      try {
        permission = await media.getUserMedia({ audio: constraints });
        await refreshInputs();
      } catch (error) { failure(error); }
      finally { permission?.getTracks().forEach(track => track.stop()); }
    }
    async function connect() {
      if (!media?.getUserMedia) { status = 'unsupported'; render(); return; }
      const input = get('Input').value;
      if (!input) return;
      release();
      const request = generation;
      let capture;
      try {
        const audio = env.ensureAudio();
        await audio.ctx.resume();
        capture = await media.getUserMedia({ audio: { ...constraints, deviceId: { exact: input } } });
        if (request !== generation || audio.ctx.state === 'closed') return;
        engine = audio;
        source = audio.ctx.createMediaStreamSource(capture);
        trim = audio.ctx.createGain();
        meter = audio.ctx.createAnalyser();
        gain = audio.ctx.createGain();
        gain.gain.value = 0;
        source.connect(trim);
        trim.connect(meter);
        meter.connect(gain);
        gain.connect(audio.master);
        stream = capture;
        connectedInput = input;
        capture = null;
        for (const track of stream.getAudioTracks()) track.addEventListener('ended', () => {
          if (request === generation) release('lost');
        }, { once: true });
        takes?.setInput(audio, trim);
        wakeMeter();
        status = 'connected';
        mix();
        render();
      } catch (error) {
        if (request === generation) { release(); failure(error); }
      } finally { capture?.getTracks().forEach(track => track.stop()); }
    }
    function refreshMidi() {
      const ports = [...midi.outputs.values()].filter(port => port.state === 'connected');
      options(get('Midi'), ports.map(port => [port.id, port.name || port.id]), settings.midi);
      selectedMidi = ports.find(port => port.id === get('Midi').value);
      clock.select(selectedMidi);
      render();
    }
    get('MidiAccess').onclick = async () => {
      const feedback = get('MidiStatus');
      try {
        feedback.dataset.error = '';
        if (!navigator.requestMIDIAccess) feedback.dataset.error = 'midiUnsupported';
        else if (!midi) {
          midi = await navigator.requestMIDIAccess({ sysex: false });
          midi.onstatechange = event => {
            if (event.port.type === 'output' && event.port.state !== 'connected') refreshMidi();
            else if (event.port.type === 'output' && ![...get('Midi').options].some(o => o.value === event.port.id)) refreshMidi();
          };
          refreshMidi();
        }
      } catch (_) { feedback.dataset.error = 'midiDenied'; }
      render();
    };
    get('Midi').onchange = e => { settings.midi = e.target.value; save(); refreshMidi(); };
    get('Input').onchange = e => { settings.input = e.target.value; save(); };
    get('Unlock').onclick = unlock;
    get('Connect').onclick = connect;
    get('Disconnect').onclick = () => release();
    for (const name of ['monitor', 'trim', 'solo', 'count', 'offset', 'from', 'to', 'kind']) {
      const control = get(name[0].toUpperCase() + name.slice(1));
      const checkbox = control.type === 'checkbox';
      if (checkbox) control.checked = settings[name];
      else control.value = settings[name];
      control.onchange = control.type === 'range' ? null : update;
      if (control.type === 'range') control.oninput = update;
      function update() {
        const value = Number(control.value);
        settings[name] = checkbox ? control.checked : name === 'kind' ? control.value :
          Math.round(Math.max(Number(control.min), Math.min(Number(control.max), value)));
        if (!checkbox) control.value = settings[name];
        save();
        mix();
        render();
      }
    }
    function show(open) {
      get('Panel').hidden = !open;
      get('Toggle').setAttribute('aria-expanded', String(open));
      if (open) {
        env.front();
        render();
        refreshInputs().catch(() => {});
      }
      else get('Toggle').focus();
    }
    get('Toggle').onclick = () => show(get('Panel').hidden);
    get('Close').onclick = () => show(false);
    media?.addEventListener?.('devicechange', () => refreshInputs().catch(() => {}));
    takes = root.HaloExternalTakes.install({
      ...env, render() { mix(); render(); }
    });
    const inputSettings = () => ({ ...settings });
    get('Whole').onclick = () => {
      const total = env.describe()?.barSteps?.length - 1;
      if (!Number.isInteger(total) || total < 1) { env.toast(t('needSong')); return; }
      settings.from = 1;
      settings.to = total;
      get('From').value = 1;
      get('To').value = total;
      save();
    };
    get('Record').onclick = () => takes.arm(inputSettings());
    get('Stop').onclick = () => takes.stop();
    get('Saved').onchange = e => takes.select(e.target.value);
    get('Preview').onclick = () => { if (!takes.recording()) takes.audition(false); };
    get('Draft').onclick = () => takes.audition(true);
    get('Keep').onclick = takes.keep;
    get('Retry').onclick = () => takes.arm(inputSettings());
    get('CancelTake').onclick = takes.discard;
    get('Remove').onclick = async () => {
      const { selected } = takes.view();
      if (selected && await env.confirm(t('confirmDelete'))) await takes.remove(selected);
    };
    get('Mode').onchange = e => takes.modify({ mode: e.target.value });
    get('Fit').onchange = e => takes.modify({ fit: e.target.checked });
    get('Mute').onchange = e => takes.modify({ mute: e.target.checked });
    get('Volume').oninput = e => takes.modify({ volume: Number(e.target.value) });
    get('SaveClip').onclick = async () => {
      const view = takes.view(), clip = view.state.clips.find(item => item.id === view.selected);
      if (!clip) return;
      try { env.download(await root.HaloExternalMedia.read(clip), 'halo-track-10.wav'); }
      catch (_) { env.toast(t('missing')); }
    };
    get('Bundle').onclick = async () => {
      try { env.download(await root.HaloExternalMedia.pack(env.project()), 'halo-project.halolink'); }
      catch (_) { env.toast(t('packageError')); }
    };
    const samples = new Float32Array(512);
    function meterTick() {
      takes.updatePreview();
      const node = takes.monitor() ? meter : takes.view().meter;
      const visible = !get('Panel').hidden;
      if (node) node.getFloatTimeDomainData(samples);
      const level = node ? samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0) : 0;
      if (visible) {
        get('Level').value = level;
        const { timeline, beats, elapsed, take, pending } = takes.view();
        const showingCountdown = (pending || take) && beats > 0;
        if (pending || take) get('Status').textContent = t(showingCountdown || pending ? 'armed' : 'recording');
        get('Position').textContent = showingCountdown ? t('countdown') + ' · ' + beats :
          timeline && env.running() ? Math.max(1, timeline.position / 4 + 1 + elapsed).toFixed(2) + ' ♩' : '';
        if (!(take || pending)) get('Stop').disabled = !takes.previewing();
      }
      get('Toggle').style.setProperty('--external-level', Math.min(1, level * 2));
    }
    function wakeMeter() {
      if (levelTimer) return;
      levelTimer = setInterval(() => {
        if (!stream && !takes.view().meter) { clearInterval(levelTimer); levelTimer = null; }
        meterTick();
      }, 80);
    }
    render();
    return {
      render, release, takes, warnJson: () => { if (takes.snapshot()?.clips.length) env.toast(t('jsonWarning')); },
      packageError: () => env.toast(t('packageError')),
      exportError(error) {
        const name = error.message === 'Track 10 musical grid changed' ? 'changedGrid' :
          error.message === 'Track 10 tempo differs' ? 'bpmMismatch' : 'missing';
        env.toast(t(name));
      },
      connect(engine) {
        try { takes.connect(engine); wakeMeter(); }
        catch (_) { env.toast(t('playbackError')); }
      },
      recordTick(engine, time, position) {
        try { takes.tick(engine, time, position); }
        catch (_) { takes.failPlayback(); }
      },
      monitoring: () => !!stream && settings.monitor && takes.monitor() || takes.busy(),
      tick(ctx, time, bpm, step) {
        const active = clock.active();
        clock.tick(ctx, time, bpm, step);
        if (active !== clock.active()) render();
      },
      stopMidi: () => clock.stop(),
      stop(time, ctx, natural = false) {
        takes.stop(time, natural);
        const reference = ctx?.getOutputTimestamp?.();
        const stamp = time === undefined ? undefined : reference?.performanceTime > 0
          ? reference.performanceTime + (time - reference.contextTime) * 1000
          : performance.now() + (time - ctx.currentTime) * 1000;
        clock.stop(stamp);
        render();
      }
    };
  }
  const api = { install, midiClock };
  if (typeof module !== 'undefined') module.exports = api;
  else root.HaloExternalLink = api;
})(globalThis);
