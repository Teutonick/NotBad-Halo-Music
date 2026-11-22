(function (root) {
  'use strict';

  const KEY = 'halo-first-track-v1';
  const steps = [
    ['generate', 'Нажми «Генерировать», чтобы получить новую фразу.', 'Press Generate to make a new phrase.', '#regen'],
    ['meter', 'Поменяй размер и послушай, как изменился ритм.', 'Change the time signature and hear how the rhythm changes.', '#meterToggle, #meterBtn'],
    ['tempo', 'Прибавь несколько ударов в минуту в поле BPM.', 'Raise the tempo by a few beats per minute in the BPM field.', '#bpmInput'],
    ['mute', 'Выключи один голос во вкладке инструментов или нажми на его орбиту.', 'Mute a voice in Instruments or tap its orbit.', '#tracks button[aria-pressed="true"]', '#tourInstruments'],
    ['song', 'Открой «Композицию» и нажми «+», чтобы добавить текущую фразу.', 'Open Composition and press + to add your current phrase.', '.song-add', '#tourComposition'],
    ['audio', 'Открой дорожку 09 и запиши голос или импортируй аудиофайл для лупа.', 'Open Track 09 and record your voice or import an audio file to loop.', '#btnLoopRecord, #loopImportBtn', '#modeBtnLoop', '#tourTrack09'],
    ['slice', 'Выбери SLICE на дорожке 09 и нажми 4, 8 или 16, чтобы нарезать луп.', 'Choose SLICE on Track 09, then press 4, 8 or 16 to chop the loop.', '[data-slice-count]', '#modeBtnSlice', '#tourTrack09'],
    ['video', 'Переключись на VIDEO LOOPER, выбери MP4 или WebM и запусти предпросмотр.', 'Switch to VIDEO LOOPER, choose an MP4 or WebM, and start Preview.', '#videoLooperPreview:not(:disabled)', '#videoLooperChoose', '#modeBtnVideo', '#tourTrack09'],
    ['midi', 'Есть MIDI-устройство? Открой HALO LINK, разреши MIDI и выбери порт.', 'Have a MIDI device? Open HALO LINK, allow MIDI access, and select a port.', '#externalMidi:has(option:nth-child(2)), #externalMidiTransport:has(option:nth-child(2))', '#externalMidiAccess', '#externalToggle'],
    ['save', 'Сохрани проект в файл, чтобы открыть его снова.', 'Save the project to a file so you can open it again.', '#saveProject'],
    ['wav', 'Нажми WAV, чтобы скачать трек.', 'Press WAV to download your track.', '#exportWav']
  ];
  const ids = steps.map(([id]) => id);

  function createProgress(storage) {
    let status = 'unseen';
    let visited = new Set();
    try {
      const value = JSON.parse(storage()?.getItem(KEY));
      if (['active', 'closed'].includes(value?.status)) status = value.status;
      if (status === 'active' && Array.isArray(value.visited)) {
        visited = new Set(value.visited.filter(id => ids.includes(id)));
      }
    } catch {}
    const next = () => ids.find(id => !visited.has(id));
    function save() {
      try { storage()?.setItem(KEY, JSON.stringify({status, visited: [...visited]})); } catch {}
    }
    function close() {
      status = 'closed';
      visited.clear();
      save();
    }
    if (status === 'active' && !next()) close();
    return {
      status: () => status,
      next,
      start() {
        status = 'active';
        visited.clear();
        save();
      },
      close,
      mark(id) {
        if (status !== 'active' || !ids.includes(id) || visited.has(id)) return false;
        visited.add(id);
        if (!next()) close();
        else save();
        return true;
      }
    };
  }

  function install({language, accepted, layout, demoAvailable, loadDemo}) {
    const doc = root.document;
    const card = doc.getElementById('firstTrack');
    if (!card || !doc.querySelector) return;
    const progress = createProgress(() => root.localStorage);
    const heading = doc.getElementById('firstTrackTitle');
    const hint = doc.getElementById('firstTrackHint');
    const primary = doc.getElementById('firstTrackPrimary');
    const skip = doc.getElementById('firstTrackSkip');
    const demo = doc.getElementById('firstTrackDemo');
    const close = doc.getElementById('firstTrackClose');
    const restart = doc.getElementById('firstTrackRestart');
    const tr = (ru, en) => language() === 'ru' ? ru : en;
    let invited = false;
    let finished = false;
    let wav;
    let highlighted = [];
    let pending = false;

    function highlight() {
      for (const control of highlighted) control.classList.remove('first-track-target');
      highlighted = [];
      if (card.hidden || progress.status() !== 'active') return;
      const step = steps.find(([id]) => id === progress.next());
      if (!step) return;
      for (const selector of [...step.slice(3), '#workstationToggle[aria-expanded="false"]']) {
        highlighted = Array.from(doc.querySelectorAll(selector)).filter(control => control.getClientRects().length);
        if (highlighted.length) break;
      }
      for (const control of highlighted) control.classList.add('first-track-target');
      demo.hidden = step[0] !== 'slice' || !demoAvailable();
    }
    function refreshTargets() {
      if (pending || progress.status() !== 'active') return;
      pending = true;
      root.requestAnimationFrame(() => { pending = false; highlight(); });
    }
    function render() {
      const active = progress.status() === 'active';
      const step = steps.find(([id]) => id === progress.next());
      card.hidden = !accepted() || !(invited || active || finished);
      restart.textContent = tr('Обучение «Первый трек»', 'First track tutorial');
      if (!card.hidden) {
        const index = steps.indexOf(step) + 1;
        heading.textContent = tr('Первый трек', 'First track') + (active ? ' · ' + index + '/' + steps.length : '');
        hint.textContent = finished
          ? (wav ? tr('Твой первый трек готов.', 'Your first track is ready.') : tr('Обучение завершено.', 'Tutorial complete.'))
          : active ? step[language() === 'ru' ? 1 : 2]
            : tr('Соберём первый трек? Начни с одной фразы.', 'Make your first track? Start with one phrase.');
        primary.hidden = active || (finished && !wav);
        primary.textContent = finished
          ? (canShare() ? tr('Поделиться WAV', 'Share WAV') : tr('Скачать WAV', 'Download WAV'))
          : tr('Начать', 'Start');
        demo.hidden = true;
        demo.textContent = tr('Загрузить пример', 'Load example');
        skip.hidden = !active;
        skip.textContent = tr('Пропустить шаг', 'Skip step');
        close.textContent = finished ? tr('Готово', 'Done') : active
          ? tr('Выйти из обучения', 'Exit tutorial') : tr('Не сейчас', 'Not now');
      }
      highlight();
      layout?.();
    }
    function canShare() {
      try { return !!root.navigator.share && root.navigator.canShare?.({files: [wav]}); }
      catch { return false; }
    }
    function mark(id, file) {
      const wasSkipping = doc.activeElement === skip;
      if (!progress.mark(id)) return;
      if (id === 'wav') wav = file;
      finished = progress.status() === 'closed';
      render();
      if (skip.hidden && wasSkipping) close.focus();
    }
    function start() {
      if (!accepted()) return;
      invited = finished = false;
      wav = undefined;
      progress.start();
      render();
    }

    root.addEventListener('halo-terms-accepted', () => {
      invited = progress.status() === 'unseen';
      render();
    });
    doc.addEventListener('click', refreshTargets);
    doc.addEventListener('change', refreshTargets);
    root.addEventListener('resize', refreshTargets);
    primary.onclick = async () => {
      if (!finished) { start(); skip.focus(); return; }
      if (!wav) return;
      if (canShare()) {
        try { await root.navigator.share({files: [wav]}); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      if (!wav) return;
      const link = doc.createElement('a');
      const url = root.URL.createObjectURL(wav);
      link.href = url;
      link.download = wav.name;
      link.click();
      root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
    };
    skip.onclick = () => mark(progress.next());
    demo.onclick = async () => {
      demo.disabled = true;
      try {
        await loadDemo(() => progress.status() === 'active' && progress.next() === 'slice');
      } catch {
        if (progress.next() === 'slice') hint.textContent = tr(
          'Не удалось загрузить пример. Импортируй свой луп или пропусти шаг.',
          'Could not load the example. Import your own loop or skip the step.');
      } finally {
        demo.disabled = false;
        refreshTargets();
      }
    };
    close.onclick = () => {
      invited = finished = false;
      wav = undefined;
      progress.close();
      render();
      doc.getElementById('guideBtn')?.focus();
    };
    restart.onclick = () => {
      doc.getElementById('guideClose')?.click();
      start();
      skip.focus();
    };

    render();
    return {mark, render, refreshTargets};
  }

  root.HaloOnboarding = {install};
  if (typeof module !== 'undefined' && module.exports) module.exports = {createProgress, KEY, ids};
})(globalThis);
