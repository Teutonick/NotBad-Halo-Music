/* src/live-loop.js — NotBad Halo Track 09: Live Loop Audio Layer & Recorder */
(function (root) {
  'use strict';

  const DB_NAME = 'halo-live-loop-v1';
  const DB_VERSION = 1;
  const STORE_LAYERS = 'audio-layers';
  const STORE_SETTINGS = 'settings';
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_DURATION_SEC = 120; // 120s max

  const defaultSettings = {
    bars: 4,
    level: 75,
    pan: 0,
    space: 20,
    delay: 0,
    delayTime: '1/8',
    mute: false,
    solo: false,
    trimStart: 0.0,
    trimEnd: 1.0,
    offsetSec: 0.0,
    latencyMs: 40,
    monitor: false,
    copyrightConfirmed: false,
    instantRestart: true,
    pitch: 0,
    reverse: false
  };

  const IDB = {
    open() {
      if (typeof indexedDB === 'undefined') return Promise.resolve(null);
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_LAYERS)) {
              db.createObjectStore(STORE_LAYERS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
              db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    },
    async saveSettings(settings) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_SETTINGS, 'readwrite');
          tx.objectStore(STORE_SETTINGS).put({ key: 'track09', ...settings });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async loadSettings() {
      const db = await this.open();
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_SETTINGS, 'readonly');
          const req = tx.objectStore(STORE_SETTINGS).get('track09');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
      });
    },
    async saveLayer(layer) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_LAYERS, 'readwrite');
          const pcmLBuf = layer.pcmL.buffer.slice(layer.pcmL.byteOffset, layer.pcmL.byteOffset + layer.pcmL.byteLength);
          const pcmRBuf = layer.pcmR ? layer.pcmR.buffer.slice(layer.pcmR.byteOffset, layer.pcmR.byteOffset + layer.pcmR.byteLength) : pcmLBuf;
          tx.objectStore(STORE_LAYERS).put({
            id: layer.id,
            timestamp: layer.timestamp,
            duration: layer.duration,
            bars: layer.bars,
            sampleRate: layer.sampleRate,
            pcmL: pcmLBuf,
            pcmR: pcmRBuf,
            gain: layer.gain,
            name: layer.name
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async deleteLayer(id) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_LAYERS, 'readwrite');
          tx.objectStore(STORE_LAYERS).delete(id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    },
    async loadLayers() {
      const db = await this.open();
      if (!db) return [];
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_LAYERS, 'readonly');
          const req = tx.objectStore(STORE_LAYERS).getAll();
          req.onsuccess = () => {
            const list = (req.result || []).map(r => ({
              id: r.id,
              timestamp: r.timestamp,
              duration: r.duration,
              bars: r.bars,
              sampleRate: r.sampleRate,
              pcmL: new Float32Array(r.pcmL),
              pcmR: new Float32Array(r.pcmR || r.pcmL),
              gain: r.gain || 1,
              name: r.name || 'Layer'
            }));
            resolve(list);
          };
          req.onerror = () => resolve([]);
        } catch (_) { resolve([]); }
      });
    },
    async clearAll() {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction([STORE_LAYERS, STORE_SETTINGS], 'readwrite');
          tx.objectStore(STORE_LAYERS).clear();
          tx.objectStore(STORE_SETTINGS).clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (_) { resolve(false); }
      });
    }
  };

  // State
  let settings = { ...defaultSettings };
  let layers = [];
  let undoStack = [];
  let compositeBuffer = null;
  let activeAudio = null;
  let trackGain = null, panner = null, reverbSend = null, delaySend = null;
  let activeSource = null;
  let lastScheduledStep = -1;
  let envRef = null;

  // Recording State
  let recordingState = 'idle'; // 'idle' | 'preroll' | 'recording' | 'overdubbing' | 'looping'
  let isOverdubMode = false;
  let recordStartStep = -1;
  let recordStartTime = 0;
  let recordTargetSteps = 64;
  let cachedMicStream = null;
  let micStream = null;
  let micSourceNode = null;
  let processorNode = null;
  let analyserNode = null;
  let recAnimFrame = null;
  let recWaveData = [];
  let dummyGain = null;
  let recordedChunks = [];
  let loopPlayStartTime = 0;
  let loopPlayDuration = 0;
  let isPlaybackRunning = false;
  let reversedBuffer = null;
  let pendingQuantizedRestart = false;
  let loopAnchorStep = 0;
  let restartDebounceTimer = null;

  function getReversedBuffer(ctx, buf) {
    if (!buf || !ctx) return null;
    try {
      const numChannels = buf.numberOfChannels;
      const length = buf.length;
      const rev = ctx.createBuffer(numChannels, length, buf.sampleRate);
      for (let ch = 0; ch < numChannels; ch++) {
        const srcData = buf.getChannelData(ch);
        const dstData = rev.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          dstData[i] = srcData[length - 1 - i];
        }
      }
      return rev;
    } catch (_) {
      return null;
    }
  }

  function getPlaybackBuffer(ctx) {
    if (!compositeBuffer) return null;
    if (!settings.reverse) return compositeBuffer;
    const c = ctx || (activeAudio && activeAudio.ctx);
    if (!c) return compositeBuffer;
    if (!reversedBuffer || reversedBuffer.length !== compositeBuffer.length || reversedBuffer.sampleRate !== compositeBuffer.sampleRate) {
      reversedBuffer = getReversedBuffer(c, compositeBuffer);
    }
    return reversedBuffer || compositeBuffer;
  }

  function triggerSampleRestart(immediate = false) {
    if (!settings.instantRestart) return;
    if (!compositeBuffer || settings.mute) return;
    if (!activeAudio || !activeAudio.ctx) return;
    const isPlaying = envRef?.isPlaying ? envRef.isPlaying() : (isPlaybackRunning || activeSource !== null || (activeAudio && activeAudio.ctx.state === 'running'));
    if (!isPlaying) return;

    if (restartDebounceTimer) {
      clearTimeout(restartDebounceTimer);
      restartDebounceTimer = null;
    }

    const doRestart = () => {
      const tempo = envRef?.settings?.().tempo || 72;
      schedulePlayback(activeAudio.ctx.currentTime, activeAudio, tempo);
    };

    if (immediate) {
      doRestart();
    } else {
      restartDebounceTimer = setTimeout(doRestart, 40);
    }
  }

  function triggerQuantizedLoopRestart() {
    if (!settings.instantRestart) return;
    if (!compositeBuffer || settings.mute) return;
    if (!activeAudio || !activeAudio.ctx) return;
    const isPlaying = envRef?.isPlaying ? envRef.isPlaying() : (isPlaybackRunning || activeSource !== null || (activeAudio && activeAudio.ctx.state === 'running'));
    if (!isPlaying) return;
    pendingQuantizedRestart = true;
  }

  function tr(ru, en) {
    if (!envRef || typeof envRef.language !== 'function') return ru;
    return envRef.language() === 'ru' ? ru : en;
  }

  function buildCompositeBuffer(ctx, layerList, targetDuration) {
    reversedBuffer = null;
    if (!layerList.length || !ctx) return null;
    const sampleRate = ctx.sampleRate || 44100;
    let maxLayerDur = 0;
    for (const l of layerList) {
      const d = l.duration || (l.pcmL ? l.pcmL.length / (l.sampleRate || sampleRate) : 0);
      if (d > maxLayerDur) maxLayerDur = d;
    }
    const dur = Math.max(targetDuration || 0, maxLayerDur);
    const length = Math.max(1, Math.round(dur * sampleRate));
    const buf = ctx.createBuffer(2, length, sampleRate);
    const outL = buf.getChannelData(0);
    const outR = buf.getChannelData(1);

    for (const l of layerList) {
      const pL = l.pcmL || l.pcm, pR = l.pcmR || l.pcmL || l.pcm;
      if (!pL) continue;
      const g = typeof l.gain === 'number' ? l.gain : 1.0;
      const len = Math.min(length, pL.length);
      for (let i = 0; i < len; i++) {
        outL[i] += pL[i] * g;
        outR[i] += (pR ? pR[i] : pL[i]) * g;
      }
    }

    let maxPeak = 0;
    for (let i = 0; i < length; i++) {
      const aL = Math.abs(outL[i]), aR = Math.abs(outR[i]);
      if (aL > maxPeak) maxPeak = aL;
      if (aR > maxPeak) maxPeak = aR;
    }
    if (maxPeak > 1.0) {
      const scale = 0.98 / maxPeak;
      for (let i = 0; i < length; i++) {
        outL[i] *= scale;
        outR[i] *= scale;
      }
    }
    return buf;
  }

  function init(env) {
    envRef = env;
    IDB.loadSettings().then(s => {
      if (s) {
        settings = { ...defaultSettings, ...s };
      }
      return IDB.loadLayers();
    }).then(list => {
      layers = list;
      if (activeAudio && activeAudio.ctx && layers.length) {
        const dur = (settings.bars * 4 * 60) / 72;
        compositeBuffer = buildCompositeBuffer(activeAudio.ctx, layers, dur);
      }
      renderUI();
    }).catch(() => {});
  }

  function connectToAudio(audio) {
    if (!audio || !audio.ctx) return;
    activeAudio = audio;
    const ctx = audio.ctx;

    if (!trackGain) {
      trackGain = ctx.createGain();
      if (ctx.createStereoPanner) panner = ctx.createStereoPanner();
      reverbSend = ctx.createGain();
      delaySend = ctx.createGain();

      if (panner) {
        trackGain.connect(panner);
        if (audio.master) panner.connect(audio.master);
      } else if (audio.master) {
        trackGain.connect(audio.master);
      }

      if (audio.reverb) {
        trackGain.connect(reverbSend);
        reverbSend.connect(audio.reverb);
      }
      if (audio.delayTaps && audio.delayTaps['1/8']) {
        trackGain.connect(delaySend);
        delaySend.connect(audio.delayTaps['1/8']);
      }
    }

    updateMixerNodes();

    if (layers.length && (!compositeBuffer || compositeBuffer.sampleRate !== ctx.sampleRate)) {
      const dur = (settings.bars * 4 * 60) / 72;
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
    }
  }

  function updateMixerNodes(at) {
    if (!trackGain || !activeAudio || !activeAudio.ctx) return;
    const now = at || activeAudio.ctx.currentTime;
    const vol = settings.mute ? 0 : (settings.level / 100) * 1.5;
    trackGain.gain.setTargetAtTime(vol, now, 0.04);
    if (panner) panner.pan.setTargetAtTime(settings.pan / 100, now, 0.05);
    if (reverbSend) reverbSend.gain.setTargetAtTime((settings.space / 100) * 0.8, now, 0.06);
    if (delaySend) delaySend.gain.setTargetAtTime((settings.delay / 100) * 0.7, now, 0.05);
  }

  function persistSettings() {
    IDB.saveSettings(settings);
  }

  function schedulePlayback(time, audio, tempo) {
    if (!compositeBuffer || settings.mute) return;
    try {
      if (activeSource) {
        try { activeSource.stop(time); } catch (_) {}
        activeSource = null;
      }
      const ctx = audio.ctx;
      const playBuf = getPlaybackBuffer(ctx);
      if (!playBuf) return;

      const source = ctx.createBufferSource();
      source.buffer = playBuf;
      source.connect(trackGain);

      const pitchVal = Number(settings.pitch) || 0;
      if (pitchVal !== 0 && source.playbackRate) {
        source.playbackRate.value = Math.pow(2, pitchVal / 12);
      }

      const totalDur = playBuf.duration;
      const loopDur = (settings.bars * 4 * 60) / (tempo || 72);
      const isLonger = totalDur > loopDur + 0.05;
      const winDur = isLonger ? loopDur : totalDur;
      const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
      const trimStartFrac = Math.max(0, Math.min(0.95, settings.trimStart || 0));
      const trimEndFrac = Math.max(trimStartFrac + 0.01, Math.min(1.0, settings.trimEnd || 1));
      let startOffset = offsetSec + trimStartFrac * winDur;
      const playDur = Math.max(0.01, (trimEndFrac - trimStartFrac) * winDur);

      if (settings.reverse) {
        startOffset = Math.max(0, Math.min(totalDur - playDur, totalDur - (startOffset + playDur)));
      }

      source.start(time, startOffset, playDur);
      activeSource = source;
      loopPlayStartTime = time;
      loopPlayDuration = playDur;
    } catch (_) {}
  }

  function stopPlayback() {
    if (activeSource) {
      try { activeSource.stop(); } catch (_) {}
      activeSource = null;
    }
    loopPlayStartTime = 0;
    pendingQuantizedRestart = false;
  }

  function tick(time, absStep, audio, tempo, phraseBars) {
    if (!audio || !audio.ctx) return;
    if (!trackGain) connectToAudio(audio);

    // Pre-roll (Waiting for bar boundary)
    if (recordingState === 'preroll') {
      if (absStep % 16 === 0) {
        recordingState = isOverdubMode ? 'overdubbing' : 'recording';
        recordStartStep = absStep;
        recordStartTime = time;
        recordTargetSteps = settings.bars * 16;
        recordedChunks = [];
        updateStatusBadge();
        updateStepIndicators();
      }
      return;
    }

    // Active Recording / Overdubbing
    if (recordingState === 'recording' || recordingState === 'overdubbing') {
      if (absStep >= recordStartStep + recordTargetSteps) {
        finishRecording(audio, tempo);
      }
      return;
    }

    // Quantized Loop Retrigger (Instant Restart active on loop length / cycle boundaries)
    if (pendingQuantizedRestart && compositeBuffer && !settings.mute) {
      if (absStep % 4 === 0) {
        pendingQuantizedRestart = false;
        loopAnchorStep = absStep;
        lastScheduledStep = absStep;
        schedulePlayback(time, audio, tempo);
        return;
      }
    }

    // Normal Loop Playback
    if (compositeBuffer && !settings.mute) {
      const loopSteps = settings.bars * 16;
      const stepDiff = absStep - loopAnchorStep;
      if (stepDiff >= 0 && stepDiff % loopSteps === 0 && absStep !== lastScheduledStep) {
        lastScheduledStep = absStep;
        schedulePlayback(time, audio, tempo);
      }
    }
  }

  async function checkCopyrightConfirmation() {
    if (settings.copyrightConfirmed) return true;
    const confirmFn = envRef?.confirm || root.HaloConfirm;
    if (!confirmFn) {
      settings.copyrightConfirmed = true;
      persistSettings();
      return true;
    }

    const message = tr(
      'Ваши аудиозаписи и файлы сохраняются только в этом браузере (IndexedDB) и не отправляются на сервер.\n\nПожалуйста, подтвердите, что вы обладаете авторскими правами или необходимым разрешением на использование этого звукового материала.',
      'Your audio recordings and imported files stay exclusively in this browser (IndexedDB) and are never uploaded to any server.\n\nPlease confirm that you own the copyright or have the necessary permission to use this audio material.'
    );

    const ok = await confirmFn({
      title: tr('Права на аудио · Copyright', 'User Audio & Copyright'),
      message,
      confirmText: tr('Подтверждаю', 'Confirm'),
      cancelText: tr('Отмена', 'Cancel'),
      danger: false
    });

    if (ok) {
      settings.copyrightConfirmed = true;
      persistSettings();
    }
    return ok;
  }

  function startLiveVisualizer(audio, tempo) {
    if (recAnimFrame) cancelAnimationFrame(recAnimFrame);
    if (!analyserNode) return;

    const timeDomain = new Float32Array(analyserNode.fftSize);

    function frame() {
      if (recordingState !== 'preroll' && recordingState !== 'recording' && recordingState !== 'overdubbing') {
        recAnimFrame = null;
        return;
      }
      recAnimFrame = requestAnimationFrame(frame);
      drawLiveRecording(audio, tempo, timeDomain);
    }
    recAnimFrame = requestAnimationFrame(frame);
  }

  function drawLiveRecording(audio, tempo, timeDomain) {
    const canvas = document.getElementById('loopCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 110;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(7, 16, 31, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    ctx.strokeStyle = 'rgba(139, 232, 227, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const barCount = settings.bars || 4;

    // Bar lines
    ctx.fillStyle = 'rgba(140, 175, 195, 0.5)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (let b = 0; b < barCount; b++) {
      const bx = (b / barCount) * width;
      if (b > 0) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(186, 215, 231, 0.18)';
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillText(String(b + 1), bx + 4, height - 3);
    }

    if (recordingState === 'preroll') {
      // Draw pre-roll count-in prompt and mic test meter
      analyserNode?.getFloatTimeDomainData?.(timeDomain);
      let peak = 0;
      for (let i = 0; i < timeDomain.length; i++) {
        const v = Math.abs(timeDomain[i]);
        if (v > peak) peak = v;
      }
      ctx.fillStyle = '#ffd280';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tr('⏱ ПРЕРОЛЛ · ЗАПИСЬ НАЧНЁТСЯ СО СЛЕДУЮЩЕГО ТАКТА…', '⏱ PRE-ROLL · RECORDING STARTS ON NEXT BAR…'), width / 2, height / 2 - 12);

      // Mic level preview bar
      const meterW = Math.min(240, width - 60);
      const meterH = 8;
      const meterX = (width - meterW) / 2;
      const meterY = height / 2 + 10;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(meterX, meterY, meterW, meterH);
      ctx.fillStyle = '#63d2c6';
      const levelW = Math.min(meterW, peak * 3 * meterW);
      ctx.fillRect(meterX, meterY, levelW, meterH);
      ctx.strokeStyle = 'rgba(186,215,231,0.25)';
      ctx.strokeRect(meterX, meterY, meterW, meterH);

      ctx.fillStyle = 'rgba(186, 215, 231, 0.7)';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.fillText(tr('Сигнал микрофона активен', 'Microphone signal active'), width / 2, meterY + 22);
      return;
    }

    // Active Recording / Overdubbing
    if (isOverdubMode && compositeBuffer) {
      // Dimmed composite background
      const pcm = compositeBuffer.getChannelData(0);
      const totalSamples = pcm.length;
      const barWidth = 3;
      const barGap = 1.5;
      const totalBars = Math.floor(width / (barWidth + barGap));
      const step = Math.floor(totalSamples / totalBars);
      ctx.fillStyle = 'rgba(99, 210, 198, 0.18)';
      for (let i = 0; i < totalBars; i++) {
        const start = i * step;
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j += 4) {
          const val = pcm[start + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const amp = Math.max(0.04, Math.max(Math.abs(min), Math.abs(max)));
        const barHeight = Math.min(height * 0.88, amp * height * 0.88);
        const x = i * (barWidth + barGap);
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    analyserNode?.getFloatTimeDomainData?.(timeDomain);
    let peak = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const v = Math.abs(timeDomain[i]);
      if (v > peak) peak = v;
    }

    const now = audio.ctx.currentTime;
    const targetDur = (recordTargetSteps / 16) * (4 * 60 / tempo);
    const elapsed = Math.max(0, now - recordStartTime);
    const progress = Math.min(1.0, elapsed / Math.max(0.1, targetDur));

    recWaveData.push({ progress, amp: Math.max(0.05, peak) });

    // Draw recorded waveform history
    const waveColor = isOverdubMode ? '#ffa852' : '#ff6b6b';
    ctx.fillStyle = waveColor;
    for (let i = 0; i < recWaveData.length; i++) {
      const pt = recWaveData[i];
      const px = pt.progress * width;
      const bH = Math.min(height * 0.9, pt.amp * height * 1.4);
      const bY = (height - bH) / 2;
      ctx.fillRect(px, bY, 2.5, bH);
    }

    // Playhead line
    const curX = progress * width;
    ctx.strokeStyle = isOverdubMode ? '#ffd280' : '#ff9e9e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curX, 0);
    ctx.lineTo(curX, height);
    ctx.stroke();

    // Mini oscilloscope wave at playhead
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const oscW = 36;
    const oscStep = oscW / timeDomain.length;
    for (let i = 0; i < timeDomain.length; i++) {
      const ox = (curX - oscW / 2) + i * oscStep;
      const oy = (height / 2) + timeDomain[i] * (height * 0.35);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
    }
    ctx.stroke();

    // Live Badge in top-left
    const curBar = Math.min(barCount, Math.floor(progress * barCount) + 1);
    ctx.fillStyle = waveColor;
    ctx.font = 'bold 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const recText = `● ${isOverdubMode ? 'OVERDUB' : 'REC'}  ${elapsed.toFixed(1)}s / ${targetDur.toFixed(1)}s · ${tr('Такт', 'Bar')} ${curBar}/${barCount}`;
    ctx.fillText(recText, 8, 8);
  }

  async function armRecording(isOverdub, audio, tempo) {
    const rightsOk = await checkCopyrightConfirmation();
    if (!rightsOk) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      envRef?.toast(tr('Запись с микрофона недоступна в этом браузере', 'Microphone recording unavailable in this browser'));
      return;
    }

    let stream = cachedMicStream;
    const isStreamAlive = stream && stream.active && stream.getAudioTracks().some(t => t.readyState === 'live');
    if (isStreamAlive) {
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        cachedMicStream = stream;
      } catch (err) {
        envRef?.toast(tr('Доступ к микрофону отклонен: ', 'Microphone access denied: ') + err.message);
        return;
      }
    }
    micStream = stream;

    const ctx = audio.ctx;
    micSourceNode = ctx.createMediaStreamSource(micStream);
    analyserNode = ctx.createAnalyser ? ctx.createAnalyser() : null;
    if (analyserNode) {
      analyserNode.fftSize = 512;
      micSourceNode.connect(analyserNode);
    }

    processorNode = ctx.createScriptProcessor ? ctx.createScriptProcessor(4096, 1, 1) : null;
    if (!processorNode) {
      envRef?.toast(tr('Web Audio запись не поддерживается', 'Web Audio recording not supported'));
      return;
    }

    micSourceNode.connect(processorNode);
    dummyGain = ctx.createGain();
    dummyGain.gain.value = 0;
    processorNode.connect(dummyGain);
    dummyGain.connect(ctx.destination);

    if (settings.monitor && trackGain) {
      micSourceNode.connect(trackGain);
    }

    recordedChunks = [];
    recWaveData = [];
    processorNode.onaudioprocess = (e) => {
      if (recordingState === 'recording' || recordingState === 'overdubbing') {
        const input = e.inputBuffer.getChannelData(0);
        recordedChunks.push(new Float32Array(input));
      }
    };

    isOverdubMode = isOverdub;
    recordingState = 'preroll';
    recordStartStep = -1;
    recordStartTime = 0;
    updateStatusBadge();
    updateStepIndicators();

    startLiveVisualizer(audio, tempo);
    envRef?.toast(tr('Подготовка к записи: отсчёт до начала такта…', 'Preparing to record: count-in to next bar…'));
  }

  function finishRecording(audio, tempo) {
    recordingState = 'looping';
    updateStatusBadge();
    updateStepIndicators();

    if (recAnimFrame) {
      cancelAnimationFrame(recAnimFrame);
      recAnimFrame = null;
    }

    if (processorNode) {
      try { processorNode.disconnect(); } catch (_) {}
      processorNode = null;
    }
    if (analyserNode) {
      try { analyserNode.disconnect(); } catch (_) {}
      analyserNode = null;
    }
    if (micSourceNode) {
      try { micSourceNode.disconnect(); } catch (_) {}
      micSourceNode = null;
    }
    if (dummyGain) {
      try { dummyGain.disconnect(); } catch (_) {}
      dummyGain = null;
    }
    if (micStream) {
      // Mute active tracks instead of stopping them, so the browser preserves permission for next take
      micStream.getAudioTracks().forEach(t => { t.enabled = false; });
      micStream = null;
    }

    if (!recordedChunks.length) {
      envRef?.toast(tr('Запись не содержит аудио', 'Recording contains no audio'));
      return;
    }

    const totalSamples = recordedChunks.reduce((acc, ch) => acc + ch.length, 0);
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const ch of recordedChunks) {
      merged.set(ch, offset);
      offset += ch.length;
    }
    recordedChunks = [];
    recWaveData = [];

    // Latency compensation
    const sampleRate = audio.ctx.sampleRate;
    const latencyOffset = Math.max(0, Math.round((settings.latencyMs / 1000) * sampleRate));
    const targetDur = (settings.bars * 4 * 60) / tempo;
    const targetLength = Math.max(1, Math.round(targetDur * sampleRate));
    const finalPcm = new Float32Array(targetLength);

    const copySrc = merged.subarray(Math.min(latencyOffset, merged.length));
    finalPcm.set(copySrc.subarray(0, Math.min(targetLength, copySrc.length)));

    const newLayer = {
      id: Date.now(),
      timestamp: Date.now(),
      duration: targetDur,
      bars: settings.bars,
      sampleRate,
      pcmL: finalPcm,
      pcmR: finalPcm,
      gain: 1.0,
      name: (isOverdubMode ? 'Overdub ' : 'Layer ') + (layers.length + 1)
    };

    layers.push(newLayer);
    undoStack = [];
    IDB.saveLayer(newLayer);

    compositeBuffer = buildCompositeBuffer(audio.ctx, layers, targetDur);
    settings.trimStart = 0;
    settings.trimEnd = 1.0;
    persistSettings();
    renderWaveform();
    renderUI();

    envRef?.toast(tr(
      `Записано ${settings.bars} такта · Зациклено`,
      `Recorded ${settings.bars} bars · Looping`
    ));
  }

  async function importAudioFile(file, audio, tempo) {
    if (!file) return;
    const rightsOk = await checkCopyrightConfirmation();
    if (!rightsOk) return;

    if (file.size > MAX_FILE_SIZE) {
      envRef?.toast(tr('Файл превышает 50 МБ. Выберите файл меньшего размера.', 'File exceeds 50 MB limit. Please select a smaller file.'));
      return;
    }

    envRef?.toast(tr('Декодирование аудиофайла…', 'Decoding audio file…'));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = audio?.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      if (decoded.duration > MAX_DURATION_SEC) {
        envRef?.toast(tr('Длительность ограничена 120 сек. Аудио обрезано.', 'Audio duration limited to 120s. Cropped to limit.'));
      }

      const dur = Math.min(MAX_DURATION_SEC, decoded.duration);
      const sampleRate = ctx.sampleRate;
      const length = Math.round(dur * sampleRate);

      const pcmL = new Float32Array(length);
      const pcmR = new Float32Array(length);
      pcmL.set(decoded.getChannelData(0).subarray(0, length));
      if (decoded.numberOfChannels > 1) {
        pcmR.set(decoded.getChannelData(1).subarray(0, length));
      } else {
        pcmR.set(pcmL);
      }

      const newLayer = {
        id: Date.now(),
        timestamp: Date.now(),
        duration: dur,
        bars: settings.bars,
        sampleRate,
        pcmL,
        pcmR,
        gain: 1.0,
        name: file.name.slice(0, 24)
      };

      layers.push(newLayer);
      undoStack = [];
      IDB.saveLayer(newLayer);

      const loopDur = (settings.bars * 4 * 60) / tempo;
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
      settings.offsetSec = 0;
      settings.trimStart = 0;
      settings.trimEnd = 1.0;
      persistSettings();
      recordingState = 'looping';
      renderWaveform();
      renderUI();

      envRef?.toast(tr('Файл успешно импортирован на 9-й трек', 'Audio file imported to Track 09'));
    } catch (err) {
      envRef?.toast(tr('Ошибка импорта аудио: ', 'Import failed: ') + err.message);
    }
  }

  function addLayer(layer, optionalCtx) {
    layers.push(layer);
    IDB.saveLayer(layer);
    const ctx = optionalCtx || (activeAudio && activeAudio.ctx);
    if (ctx) {
      const dur = layer.duration || ((settings.bars * 4 * 60) / 72);
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
    }
    return layer;
  }

  function undoLastLayer(optionalCtx) {
    if (!layers.length) return null;
    const removed = layers.pop();
    undoStack.push(removed);
    IDB.deleteLayer(removed.id);

    const ctx = optionalCtx || (activeAudio && activeAudio.ctx);
    if (ctx && layers.length) {
      const dur = (settings.bars * 4 * 60) / 72;
      compositeBuffer = buildCompositeBuffer(ctx, layers, dur);
    } else {
      compositeBuffer = null;
      reversedBuffer = null;
      recordingState = 'idle';
      stopPlayback();
    }
    renderWaveform();
    renderUI();
    envRef?.toast(tr('Последняя запись отменена (Undo)', 'Last take undone'));
    return removed;
  }

  function clearAllLayers() {
    if (!layers.length) return;
    layers = [];
    undoStack = [];
    compositeBuffer = null;
    reversedBuffer = null;
    recordingState = 'idle';
    stopPlayback();
    if (cachedMicStream) {
      try { cachedMicStream.getTracks().forEach(t => t.stop()); } catch (_) {}
      cachedMicStream = null;
    }
    IDB.clearAll();
    renderWaveform();
    renderUI();
    envRef?.toast(tr('Все записи 9-го трека очищены', 'All Track 09 layers cleared'));
  }

  // Waveform Renderer
  function renderWaveform() {
    const canvas = document.getElementById('loopCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 110;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(7, 16, 31, 0.65)';
    ctx.fillRect(0, 0, width, height);

    const tempo = envRef?.settings?.().tempo || 72;
    const loopDur = (settings.bars * 4 * 60) / tempo;
    const totalDur = compositeBuffer ? compositeBuffer.duration : 0;
    const isLonger = totalDur > loopDur + 0.05;
    const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, totalDur - loopDur), settings.offsetSec || 0)) : 0;
    const trimStart = Math.max(0, Math.min(0.95, settings.trimStart || 0));
    const trimEnd = Math.max(trimStart + 0.01, Math.min(1.0, settings.trimEnd || 1));

    canvas.classList.toggle('can-drag', !!compositeBuffer);

    // Update Waveform Header info
    const title = document.getElementById('loopWaveTitle');
    if (title) {
      const revTag = settings.reverse ? ' · REV' : '';
      const pitchTag = (settings.pitch && settings.pitch !== 0) ? ` · ${settings.pitch > 0 ? '+' + settings.pitch : settings.pitch}st` : '';
      if (totalDur > 0) {
        if (isLonger) {
          title.textContent = `${tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')} (${loopDur.toFixed(1)}с / ${totalDur.toFixed(1)}с · ${tr('Позиция', 'Pos')}: ${offsetSec.toFixed(1)}с)${revTag}${pitchTag}`;
        } else {
          title.textContent = `${tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')} (${totalDur.toFixed(1)}с)${revTag}${pitchTag}`;
        }
      } else {
        title.textContent = `${tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')}`;
      }
    }

    if (compositeBuffer) {
      const pcm = compositeBuffer.getChannelData(0);
      const totalSamples = pcm.length;

      let topH = 0;
      let mainY = 0;
      let mainH = height;

      if (isLonger) {
        topH = 14;
        mainY = 18;
        mainH = height - mainY;

        // 1. Top Mini-Overview Bar for full composition
        ctx.fillStyle = 'rgba(9, 20, 36, 0.75)';
        ctx.fillRect(0, 0, width, topH);
        ctx.strokeStyle = 'rgba(139, 232, 227, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, topH);

        // Mini-waveform of entire audio in the overview
        const ovBars = Math.floor(width / 3);
        const ovStep = Math.max(1, Math.floor(totalSamples / ovBars));
        ctx.fillStyle = 'rgba(99, 210, 198, 0.35)';
        for (let i = 0; i < ovBars; i++) {
          const start = i * ovStep;
          let max = 0;
          for (let j = 0; j < ovStep; j += 8) {
            const v = Math.abs(pcm[start + j] || 0);
            if (v > max) max = v;
          }
          const bh = Math.max(2, max * (topH - 2));
          ctx.fillRect(i * 3, (topH - bh) / 2, 2, bh);
        }

        // Highlighted active window in mini-overview
        const winX1 = (offsetSec / totalDur) * width;
        const winW = Math.max(6, (loopDur / totalDur) * width);
        ctx.fillStyle = 'rgba(99, 210, 198, 0.28)';
        ctx.fillRect(winX1, 0, winW, topH);
        ctx.strokeStyle = '#78bab6';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(winX1, 0.5, winW, topH - 1);
      }

      // Center baseline of main waveform
      ctx.strokeStyle = 'rgba(139, 232, 227, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mainY + mainH / 2);
      ctx.lineTo(width, mainY + mainH / 2);
      ctx.stroke();

      // 2. High-resolution slice of PCM for the active window
      const startSample = isLonger ? Math.floor((offsetSec / totalDur) * totalSamples) : 0;
      const sliceSamples = isLonger ? Math.floor((loopDur / totalDur) * totalSamples) : totalSamples;
      const barWidth = 3;
      const barGap = 1.5;
      const totalBars = Math.floor(width / (barWidth + barGap));
      const step = Math.max(1, Math.floor(sliceSamples / totalBars));

      const x1 = trimStart * width;
      const x2 = trimEnd * width;

      for (let i = 0; i < totalBars; i++) {
        const start = startSample + i * step;
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j += 4) {
          const val = pcm[start + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const amp = Math.max(0.04, Math.max(Math.abs(min), Math.abs(max)));
        const barHeight = Math.min(mainH * 0.88, amp * mainH * 0.88);
        const x = i * (barWidth + barGap);
        const y = mainY + (mainH - barHeight) / 2;

        const isInside = (x + barWidth >= x1 && x <= x2);
        ctx.fillStyle = isInside ? '#63d2c6' : 'rgba(99, 210, 198, 0.22)';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Outside trim dim overlays
      ctx.fillStyle = 'rgba(4, 9, 20, 0.68)';
      if (x1 > 0) ctx.fillRect(0, mainY, x1, mainH);
      if (x2 < width) ctx.fillRect(x2, mainY, width - x2, mainH);

      // Active region bounding box & border highlight
      ctx.strokeStyle = '#78bab6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, mainY + 1, Math.max(2, x2 - x1), mainH - 2);

      // Draw Bar Division Lines & Labels inside the active window
      const barCount = settings.bars || 4;
      ctx.fillStyle = 'rgba(206, 255, 243, 0.85)';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      for (let b = 0; b < barCount; b++) {
        const bx = (b / barCount) * width;
        if (b > 0) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(120, 186, 182, 0.45)';
          ctx.beginPath();
          ctx.moveTo(bx, mainY);
          ctx.lineTo(bx, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillText(String(b + 1), bx + 3, height - 3);
      }

      // Real-time Playhead cursor if playing
      if (loopPlayStartTime > 0 && loopPlayDuration > 0 && activeAudio && activeAudio.ctx) {
        const elapsed = (activeAudio.ctx.currentTime - loopPlayStartTime) % loopPlayDuration;
        const playFrac = Math.max(0, Math.min(1.0, elapsed / loopPlayDuration));
        const phX = x1 + playFrac * (x2 - x1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(phX - 1, mainY, 2, mainH);
      }
    } else {
      // Empty waveform placeholder
      ctx.fillStyle = 'rgba(140, 175, 195, 0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tr('Нет записи · Нажмите Запись или импортируйте аудио', 'No recording · Tap Record or import audio'), width / 2, height / 2);
    }
  }

  function updateStatusBadge() {
    const badge = document.getElementById('loopStatusBadge');
    if (!badge) return;
    if (recordingState === 'preroll') {
      badge.textContent = tr('ОТСЧЁТ', 'COUNT-IN');
      badge.className = 'loop-status-pill badge-preroll';
    } else if (recordingState === 'recording') {
      badge.textContent = tr('ЗАПИСЬ', 'REC');
      badge.className = 'loop-status-pill badge-recording';
    } else if (recordingState === 'overdubbing') {
      badge.textContent = 'OVERDUB';
      badge.className = 'loop-status-pill badge-overdub';
    } else if (compositeBuffer && !settings.mute) {
      badge.textContent = tr('ПОВТОР', 'LOOP');
      badge.className = 'loop-status-pill badge-looping';
    } else if (settings.mute) {
      badge.textContent = tr('MUTE', 'MUTED');
      badge.className = 'loop-status-pill badge-muted';
    } else {
      badge.textContent = tr('ГОТОВ', 'READY');
      badge.className = 'loop-status-pill';
    }
  }

  function updateStepIndicators() {
    const steps = {
      preroll: document.getElementById('stepPreroll'),
      record: document.getElementById('stepRecord'),
      loop: document.getElementById('stepLoop'),
      overdub: document.getElementById('stepOverdub')
    };
    for (const [key, el] of Object.entries(steps)) {
      if (!el) continue;
      el.classList.remove('active');
    }
    if (recordingState === 'preroll') steps.preroll?.classList.add('active');
    else if (recordingState === 'recording') steps.record?.classList.add('active');
    else if (recordingState === 'overdubbing') steps.overdub?.classList.add('active');
    else if (compositeBuffer) steps.loop?.classList.add('active');

    const btnRec = document.getElementById('btnLoopRecord');
    const btnLoop = document.getElementById('btnLoopLoop');
    const btnOverdub = document.getElementById('btnLoopOverdub');
    const btnUndo = document.getElementById('btnLoopUndo');

    if (btnRec) btnRec.classList.toggle('recording', recordingState === 'recording' || (recordingState === 'preroll' && !isOverdubMode));
    if (btnOverdub) btnOverdub.classList.toggle('recording', recordingState === 'overdubbing' || (recordingState === 'preroll' && isOverdubMode));
    if (btnLoop) btnLoop.classList.toggle('active', !!compositeBuffer && !settings.mute && recordingState === 'idle');
    if (btnUndo) btnUndo.disabled = (layers.length === 0);
  }

  function createUI(container, env) {
    envRef = env;
    container.innerHTML = `
      <div class="loop-head">
        <div class="loop-title-wrap">
          <span class="loop-mic-icon">🎙</span>
          <strong>09 — LIVE LOOP</strong>
        </div>
        <div class="loop-head-actions">
          <button type="button" class="loop-instant-btn ${settings.instantRestart ? 'active' : ''}" id="loopInstantRestart" title="${tr('Мгновенный перезапуск при изменении параметров', 'Instant restart on parameter change')}">
            <span class="loop-instant-glyph">⚡</span>
            <span>INSTANT RESTART</span>
          </button>
          <div class="loop-status-pill" id="loopStatusBadge">ГОТОВ</div>
        </div>
      </div>

      <div class="loop-steps-bar" role="tablist" aria-label="Live loop workflow">
        <div class="loop-step" id="stepPreroll">
          <span class="loop-step-icon">⏱</span>
          <strong>${tr('Подготовка', 'Preparation')}</strong>
          <small>${tr('Отсчёт', 'Count-in')}</small>
        </div>
        <div class="loop-step" id="stepRecord">
          <span class="loop-step-icon">🎙</span>
          <strong>${tr('Запись', 'Recording')}</strong>
          <small id="stepRecordBars">${settings.bars} ${tr('такта', 'bars')}</small>
        </div>
        <div class="loop-step" id="stepLoop">
          <span class="loop-step-icon">🔁</span>
          <strong>${tr('Повтор', 'Playback')}</strong>
          <small>Loop</small>
        </div>
        <div class="loop-step" id="stepOverdub">
          <span class="loop-step-icon">🥞</span>
          <strong>Overdub</strong>
          <small>${tr('Слой', 'Layer')}</small>
        </div>
      </div>

      <div class="loop-waveform-card">
        <div class="loop-wave-header">
          <span id="loopWaveTitle">${tr('Записанный луп', 'Recorded Loop')} · ${settings.bars} ${tr('такта', 'Bars')}</span>
          <span id="loopWaveBpm">72 BPM</span>
        </div>
        <div class="loop-canvas-wrap">
          <canvas id="loopCanvas" height="110"></canvas>
        </div>
        <div class="loop-trim-wrap">
          <label class="loop-trim-label">
            <span>TRIM START: <output id="trimStartVal">${Math.round((settings.trimStart||0)*100)}%</output></span>
            <input type="range" id="loopTrimStart" min="0" max="95" value="${Math.round((settings.trimStart||0)*100)}" step="1">
          </label>
          <label class="loop-trim-label">
            <span>TRIM END: <output id="trimEndVal">${Math.round((settings.trimEnd||1)*100)}%</output></span>
            <input type="range" id="loopTrimEnd" min="5" max="100" value="${Math.round((settings.trimEnd||1)*100)}" step="1">
          </label>
          <label class="loop-trim-label">
            <span>PITCH: <output id="loopPitchVal">${(settings.pitch||0) > 0 ? '+' + settings.pitch : (settings.pitch || 0)} st</output></span>
            <input type="range" id="loopPitch" min="-12" max="12" value="${settings.pitch || 0}" step="1">
          </label>
          <div class="loop-rev-wrap">
            <button type="button" class="loop-rev-btn ${settings.reverse ? 'active' : ''}" id="loopRevBtn" title="${tr('Реверс воспроизведения аудио', 'Reverse audio playback')}">
              <span>⇄ REV</span>
            </button>
          </div>
        </div>
      </div>

      <div class="loop-actions">
        <button type="button" class="loop-action-btn loop-btn-record" id="btnLoopRecord" title="${tr('Начать запись с микрофона', 'Start recording from microphone')}">
          <span class="loop-action-glyph rec-glyph">●</span>
          <span>Record</span>
        </button>
        <button type="button" class="loop-action-btn loop-btn-loop" id="btnLoopLoop" title="${tr('Зациклить воспроизведение', 'Play / loop')}">
          <span class="loop-action-glyph loop-glyph">🔁</span>
          <span>Loop</span>
        </button>
        <button type="button" class="loop-action-btn loop-btn-overdub" id="btnLoopOverdub" title="${tr('Записать Overdub слой', 'Record new overdub layer')}">
          <span class="loop-action-glyph overdub-glyph">🥞</span>
          <span>Overdub</span>
        </button>
        <button type="button" class="loop-action-btn loop-btn-undo" id="btnLoopUndo" title="${tr('Отменить последний Overdub', 'Undo last overdub')}">
          <span class="loop-action-glyph undo-glyph">↺</span>
          <span>Undo</span>
        </button>
      </div>

      <div class="loop-controls-strip">
        <div class="loop-ctrl-group loop-bars-group">
          <span class="loop-group-title">BARS</span>
          <div class="loop-bars-buttons" id="loopBarsGroup">
            <button type="button" class="loop-bar-btn ${settings.bars===1?'active':''}" data-bars="1">1</button>
            <button type="button" class="loop-bar-btn ${settings.bars===2?'active':''}" data-bars="2">2</button>
            <button type="button" class="loop-bar-btn ${settings.bars===4?'active':''}" data-bars="4">4</button>
            <button type="button" class="loop-bar-btn ${settings.bars===8?'active':''}" data-bars="8">8</button>
          </div>
          <div class="loop-btn-row loop-mute-solo-row">
            <button type="button" class="loop-mini-toggle ${settings.mute?'active':''}" id="loopMute">MUTE</button>
            <button type="button" class="loop-mini-toggle ${settings.solo?'active':''}" id="loopSolo">SOLO</button>
          </div>
        </div>

        <div class="loop-ctrl-group loop-mix-group">
          <span class="loop-group-title">MIX</span>
          <div class="loop-sliders-grid">
            <label class="loop-slider-label">
              <span>LEVEL <output id="loopLevelVal">${settings.level}%</output></span>
              <input type="range" id="loopLevel" min="0" max="100" value="${settings.level}">
            </label>
            <label class="loop-slider-label">
              <span>PAN <output id="loopPanVal">${settings.pan}</output></span>
              <input type="range" id="loopPan" min="-100" max="100" value="${settings.pan}">
            </label>
            <label class="loop-slider-label">
              <span>${tr('РЕВЕРБ', 'REVERB')} <output id="loopReverbVal">${settings.space}%</output></span>
              <input type="range" id="loopReverb" min="0" max="100" value="${settings.space}">
            </label>
            <label class="loop-slider-label">
              <span>${tr('ДИЛЭЙ', 'DELAY')} <output id="loopDelayVal">${settings.delay}%</output></span>
              <input type="range" id="loopDelay" min="0" max="100" value="${settings.delay}">
            </label>
          </div>
        </div>

        <div class="loop-ctrl-group loop-aux-group">
          <div class="loop-btn-row">
            <button type="button" class="glass-btn loop-import-btn" id="loopImportBtn">📂 ${tr('ИМПОРТ', 'IMPORT')}</button>
            <input type="file" id="loopFileInput" accept="audio/*" hidden>
            <button type="button" class="glass-btn loop-clear-btn" id="loopClearBtn">🗑 ${tr('СБРОС', 'CLEAR')}</button>
          </div>
          <div class="loop-setting-row">
            <label class="loop-latency-label" title="${tr('Компенсация задержки микрофона', 'Microphone latency compensation')}">
              <span>LATENCY:</span>
              <input type="number" id="loopLatency" min="0" max="200" step="5" value="${settings.latencyMs}">ms
            </label>
            <label class="loop-monitor-label" title="${tr('Прямой мониторинг микрофона (выключен по умолчанию для защиты от обратной связи)', 'Direct microphone monitoring (off by default to prevent feedback)')}">
              <input type="checkbox" id="loopMonitor" ${settings.monitor?'checked':''}>
              <span>${tr('МОНИТОР', 'MONITOR')}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="loop-footer-notice">
        <small id="loopFooterText">${tr('Ваше аудио остаётся в этом браузере · Не передаётся на сервер', 'Your audio stays in this browser · Never uploaded to a server')}</small>
      </div>
    `;

    bindUIEvents();
    renderWaveform();
    updateStatusBadge();
    updateStepIndicators();
  }

  function bindUIEvents() {
    const btnRec = document.getElementById('btnLoopRecord');
    const btnLoop = document.getElementById('btnLoopLoop');
    const btnOverdub = document.getElementById('btnLoopOverdub');
    const btnUndo = document.getElementById('btnLoopUndo');

    if (btnRec) btnRec.onclick = () => {
      if (recordingState === 'recording') {
        if (activeAudio) finishRecording(activeAudio, envRef?.settings?.().tempo || 72);
      } else {
        armRecording(false, activeAudio, envRef?.settings?.().tempo || 72);
      }
    };

    if (btnLoop) btnLoop.onclick = () => {
      if (recordingState === 'recording' || recordingState === 'overdubbing') {
        if (activeAudio) finishRecording(activeAudio, envRef?.settings?.().tempo || 72);
      } else if (compositeBuffer) {
        settings.mute = false;
        updateMixerNodes();
        persistSettings();
        updateStatusBadge();
        envRef?.toast(tr('9-й трек включён в повтор', 'Track 09 loop playing'));
      }
    };

    if (btnOverdub) btnOverdub.onclick = () => {
      armRecording(true, activeAudio, envRef?.settings?.().tempo || 72);
    };

    if (btnUndo) btnUndo.onclick = () => {
      undoLastLayer();
    };

    // Instant Restart Button
    const instantBtn = document.getElementById('loopInstantRestart');
    if (instantBtn) instantBtn.onclick = () => {
      settings.instantRestart = !settings.instantRestart;
      instantBtn.classList.toggle('active', settings.instantRestart);
      persistSettings();
      envRef?.toast(settings.instantRestart ? tr('Instant Restart включён', 'Instant Restart ON') : tr('Instant Restart выключен', 'Instant Restart OFF'));
    };

    // Bars Buttons
    const barsGroup = document.getElementById('loopBarsGroup');
    if (barsGroup) {
      Array.from(barsGroup.children).forEach(btn => {
        btn.onclick = () => {
          const b = Number(btn.dataset.bars) || 4;
          settings.bars = b;
          Array.from(barsGroup.children).forEach(el => el.classList.toggle('active', el === btn));
          const recBars = document.getElementById('stepRecordBars');
          if (recBars) recBars.textContent = `${b} ${tr('такта', 'bars')}`;

          if (compositeBuffer) {
            const tempo = envRef?.settings?.().tempo || 72;
            const loopDur = (b * 4 * 60) / tempo;
            const totalDur = compositeBuffer.duration;
            if (totalDur > loopDur + 0.05) {
              settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, settings.offsetSec || 0));
            } else {
              settings.offsetSec = 0;
            }
          }

          persistSettings();
          renderWaveform();
          triggerQuantizedLoopRestart();
        };
      });
    }

    // Interactive Waveform Dragging & Navigation
    const canvas = document.getElementById('loopCanvas');
    if (canvas) {
      let dragMode = null;
      let dragStart = null;

      canvas.onpointerdown = (e) => {
        if (!compositeBuffer || e.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0) return;
        canvas.setPointerCapture?.(e.pointerId);

        const tempo = envRef?.settings?.().tempo || 72;
        const loopDur = (settings.bars * 4 * 60) / tempo;
        const totalDur = compositeBuffer.duration;
        const isLonger = totalDur > loopDur + 0.05;

        const clickY = e.clientY - rect.top;
        const clickX = e.clientX - rect.left;

        if (isLonger && clickY <= 17) {
          dragMode = 'overview';
          const targetCenterSec = (clickX / rect.width) * totalDur;
          settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, targetCenterSec - loopDur / 2));
          renderWaveform();
          triggerSampleRestart(true);
        } else if (isLonger) {
          dragMode = 'waveform';
          dragStart = {
            x: e.clientX,
            origOffset: settings.offsetSec || 0,
            rectWidth: rect.width,
            loopDur,
            totalDur
          };
          canvas.classList.add('is-dragging');
        }
        e.preventDefault();
      };

      canvas.onpointermove = (e) => {
        if (!dragMode) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0) return;

        const tempo = envRef?.settings?.().tempo || 72;
        const loopDur = (settings.bars * 4 * 60) / tempo;
        const totalDur = compositeBuffer.duration;
        const isLonger = totalDur > loopDur + 0.05;
        if (!isLonger) return;

        if (dragMode === 'overview') {
          const curX = e.clientX - rect.left;
          const targetCenterSec = (curX / rect.width) * totalDur;
          settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, targetCenterSec - loopDur / 2));
          renderWaveform();
          triggerSampleRestart(false);
        } else if (dragMode === 'waveform' && dragStart) {
          const dx = e.clientX - dragStart.x;
          // Drag left (dx < 0) -> move audio left -> increase offsetSec
          const secDelta = -(dx / dragStart.rectWidth) * dragStart.loopDur;
          settings.offsetSec = Math.max(0, Math.min(totalDur - loopDur, dragStart.origOffset + secDelta));
          renderWaveform();
          triggerSampleRestart(false);
        }
      };

      const endDrag = (e) => {
        if (!dragMode) return;
        dragMode = null;
        dragStart = null;
        canvas.classList.remove('is-dragging');
        if (canvas.hasPointerCapture?.(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
        persistSettings();
        triggerSampleRestart(true);
      };

      canvas.onpointerup = endDrag;
      canvas.onpointercancel = endDrag;
    }

    // Sliders
    const bindSlider = (id, outId, key, scale = 1, unit = '%') => {
      const el = document.getElementById(id);
      const out = document.getElementById(outId);
      if (!el) return;
      el.oninput = (e) => {
        const val = Number(e.target.value);
        settings[key] = val;
        if (out) out.textContent = val + unit;
        updateMixerNodes();
        persistSettings();
      };
    };

    bindSlider('loopLevel', 'loopLevelVal', 'level');
    bindSlider('loopPan', 'loopPanVal', 'pan', 1, '');
    bindSlider('loopReverb', 'loopReverbVal', 'space');
    bindSlider('loopDelay', 'loopDelayVal', 'delay');

    // Trim sliders
    const trimStartEl = document.getElementById('loopTrimStart');
    const trimEndEl = document.getElementById('loopTrimEnd');
    const trimStartVal = document.getElementById('trimStartVal');
    const trimEndVal = document.getElementById('trimEndVal');

    if (trimStartEl) trimStartEl.oninput = (e) => {
      const v = Number(e.target.value) / 100;
      settings.trimStart = Math.min(v, (settings.trimEnd || 1) - 0.05);
      if (trimStartVal) trimStartVal.textContent = Math.round(settings.trimStart * 100) + '%';
      renderWaveform();
      persistSettings();
      triggerSampleRestart(false);
    };

    if (trimEndEl) trimEndEl.oninput = (e) => {
      const v = Number(e.target.value) / 100;
      settings.trimEnd = Math.max(v, (settings.trimStart || 0) + 0.05);
      if (trimEndVal) trimEndVal.textContent = Math.round(settings.trimEnd * 100) + '%';
      renderWaveform();
      persistSettings();
      triggerQuantizedLoopRestart();
    };

    // Pitch & Reverse
    const pitchEl = document.getElementById('loopPitch');
    const pitchVal = document.getElementById('loopPitchVal');
    if (pitchEl) pitchEl.oninput = (e) => {
      const p = Number(e.target.value) || 0;
      settings.pitch = p;
      if (pitchVal) pitchVal.textContent = (p > 0 ? '+' + p : p) + ' st';
      renderWaveform();
      persistSettings();
      triggerSampleRestart(false);
    };

    const revBtn = document.getElementById('loopRevBtn');
    if (revBtn) revBtn.onclick = () => {
      settings.reverse = !settings.reverse;
      revBtn.classList.toggle('active', settings.reverse);
      renderWaveform();
      persistSettings();
      triggerSampleRestart(true);
      envRef?.toast(settings.reverse ? tr('Реверс включён', 'Reverse ON') : tr('Реверс выключен', 'Reverse OFF'));
    };

    // Mute & Solo
    const muteBtn = document.getElementById('loopMute');
    if (muteBtn) muteBtn.onclick = () => {
      settings.mute = !settings.mute;
      muteBtn.classList.toggle('active', settings.mute);
      updateMixerNodes();
      updateStatusBadge();
      persistSettings();
    };

    const soloBtn = document.getElementById('loopSolo');
    if (soloBtn) soloBtn.onclick = () => {
      settings.solo = !settings.solo;
      soloBtn.classList.toggle('active', settings.solo);
      persistSettings();
      envRef?.toast(settings.solo ? tr('9-й трек в режиме соло', 'Track 09 solo ON') : tr('Соло 9-го трека выключено', 'Track 09 solo OFF'));
    };

    // Import & Clear
    const importBtn = document.getElementById('loopImportBtn');
    const fileInput = document.getElementById('loopFileInput');
    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) importAudioFile(file, activeAudio, envRef?.settings?.().tempo || 72);
      };
    }

    const clearBtn = document.getElementById('loopClearBtn');
    if (clearBtn) clearBtn.onclick = async () => {
      if (!layers.length) return;
      const confirmFn = envRef?.confirm || root.HaloConfirm;
      if (confirmFn) {
        const ok = await confirmFn({
          title: tr('Очистить 9-й трек', 'Clear Track 09'),
          message: tr('Удалить все записанные слои 9-го трека?', 'Delete all recorded layers on Track 09?'),
          confirmText: tr('Удалить', 'Clear'),
          cancelText: tr('Отмена', 'Cancel'),
          danger: true
        });
        if (!ok) return;
      }
      clearAllLayers();
    };

    // Latency & Monitor
    const latInput = document.getElementById('loopLatency');
    if (latInput) {
      if (typeof root.HaloControls !== 'undefined' && root.HaloControls.install) {
        root.HaloControls.install(latInput, { min: 0, max: 200, step: 1, dragStep: 1 });
      }
      const onLat = (e) => {
        settings.latencyMs = Math.max(0, Math.min(200, Number(e.target.value) || 0));
        persistSettings();
      };
      latInput.oninput = onLat;
      latInput.onchange = onLat;
    }

    const monCheck = document.getElementById('loopMonitor');
    if (monCheck) monCheck.onchange = (e) => {
      settings.monitor = e.target.checked;
      persistSettings();
      if (settings.monitor) {
        envRef?.toast(tr('Прямой мониторинг включён · Рекомендуем наушники во избежание свиста', 'Direct mic monitor enabled · Use headphones to prevent acoustic feedback'));
      }
    };
  }

  function renderUI() {
    const container = document.getElementById('liveLoopPanel');
    if (!container) return;
    updateStatusBadge();
    updateStepIndicators();
    renderWaveform();
    const bpmLabel = document.getElementById('loopWaveBpm');
    if (bpmLabel && envRef?.settings) {
      bpmLabel.textContent = `${Math.round(envRef.settings().tempo || 72)} BPM`;
    }
    const instantBtn = document.getElementById('loopInstantRestart');
    if (instantBtn) instantBtn.classList.toggle('active', !!settings.instantRestart);
    const revBtn = document.getElementById('loopRevBtn');
    if (revBtn) revBtn.classList.toggle('active', !!settings.reverse);
    const pitchEl = document.getElementById('loopPitch');
    const pitchVal = document.getElementById('loopPitchVal');
    if (pitchEl) pitchEl.value = settings.pitch || 0;
    if (pitchVal) pitchVal.textContent = ((settings.pitch || 0) > 0 ? '+' + settings.pitch : (settings.pitch || 0)) + ' st';
  }

  // Offline Export Rendering
  function renderOffline(ctx, engine, totalBars, tempo) {
    if (!compositeBuffer || settings.mute) return;
    if (typeof engine === 'number') {
      tempo = totalBars || 72;
      totalBars = engine;
      engine = null;
    }
    tempo = tempo || 72;
    totalBars = totalBars || settings.bars || 4;
    try {
      const playBuf = getPlaybackBuffer(ctx);
      if (!playBuf) return;

      const trackG = ctx.createGain();
      const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const revG = ctx.createGain();
      const delG = ctx.createGain();

      const vol = (settings.level / 100) * 1.5;
      trackG.gain.value = vol;
      if (panNode) {
        panNode.pan.value = settings.pan / 100;
        trackG.connect(panNode);
        if (engine && engine.master) panNode.connect(engine.master);
        else panNode.connect(ctx.destination);
      } else if (engine && engine.master) {
        trackG.connect(engine.master);
      } else {
        trackG.connect(ctx.destination);
      }

      if (engine && engine.reverb) {
        trackG.connect(revG);
        revG.gain.value = (settings.space / 100) * 0.8;
        revG.connect(engine.reverb);
      }
      if (engine && engine.delayTaps && engine.delayTaps['1/8']) {
        trackG.connect(delG);
        delG.gain.value = (settings.delay / 100) * 0.7;
        delG.connect(engine.delayTaps['1/8']);
      }

      const loopDur = (settings.bars * 4 * 60) / tempo;
      const totalDur = (totalBars * 4 * 60) / tempo;
      const bufDur = playBuf.duration;
      const isLonger = bufDur > loopDur + 0.05;
      const winDur = isLonger ? loopDur : bufDur;
      const offsetSec = isLonger ? Math.max(0, Math.min(Math.max(0, bufDur - loopDur), settings.offsetSec || 0)) : 0;
      const trimStart = Math.max(0, Math.min(0.95, settings.trimStart || 0));
      const trimEnd = Math.max(trimStart + 0.01, Math.min(1.0, settings.trimEnd || 1));
      let startOffset = offsetSec + trimStart * winDur;
      const playDur = Math.max(0.01, (trimEnd - trimStart) * winDur);

      if (settings.reverse) {
        startOffset = Math.max(0, Math.min(bufDur - playDur, bufDur - (startOffset + playDur)));
      }

      for (let t = 0; t < totalDur; t += loopDur) {
        const src = ctx.createBufferSource();
        src.buffer = playBuf;
        if (settings.pitch && src.playbackRate) {
          src.playbackRate.value = Math.pow(2, settings.pitch / 12);
        }
        src.connect(trackG);
        src.start(t, startOffset, Math.min(playDur, totalDur - t));
      }
    } catch (_) {}
  }

  function renderOfflineSong(ctx, engine, totalBars, tempo) {
    renderOffline(ctx, engine, totalBars, tempo);
  }

  const api = {
    init,
    connectToAudio,
    tick,
    onPlay(time, startStep) {
      isPlaybackRunning = true;
      if (typeof time === 'object' && time && time.ctx) {
        connectToAudio(time);
      } else if (activeAudio) {
        connectToAudio(activeAudio);
      }
      loopAnchorStep = (typeof startStep === 'number' && startStep >= 0) ? startStep : 0;
      lastScheduledStep = -1;
      pendingQuantizedRestart = false;
    },
    onPause() {
      isPlaybackRunning = false;
      stopPlayback();
      pendingQuantizedRestart = false;
      loopAnchorStep = 0;
      lastScheduledStep = -1;
      if (recordingState === 'preroll' || recordingState === 'recording' || recordingState === 'overdubbing') {
        recordingState = 'idle';
        updateStatusBadge();
        updateStepIndicators();
      }
    },
    hasAudio() {
      return !!compositeBuffer && layers.length > 0;
    },
    isMuted() {
      return !!settings.mute;
    },
    toggleMute() {
      settings.mute = !settings.mute;
      updateMixerNodes();
      updateStatusBadge();
      persistSettings();
      return settings.mute;
    },
    getSettings() {
      return { ...settings };
    },
    setSettings(newSettings) {
      const oldPitch = settings.pitch;
      const oldRev = settings.reverse;
      const oldStart = settings.trimStart;
      const oldEnd = settings.trimEnd;
      const oldBars = settings.bars;
      const oldOffset = settings.offsetSec;

      settings = { ...settings, ...newSettings };
      updateMixerNodes();
      persistSettings();
      renderUI();

      if (settings.instantRestart) {
        if ((newSettings.pitch !== undefined && newSettings.pitch !== oldPitch) ||
            (newSettings.reverse !== undefined && newSettings.reverse !== oldRev) ||
            (newSettings.trimStart !== undefined && newSettings.trimStart !== oldStart) ||
            (newSettings.offsetSec !== undefined && newSettings.offsetSec !== oldOffset)) {
          triggerSampleRestart(true);
        } else if ((newSettings.bars !== undefined && newSettings.bars !== oldBars) ||
                   (newSettings.trimEnd !== undefined && newSettings.trimEnd !== oldEnd)) {
          triggerQuantizedLoopRestart();
        }
      }
    },
    getLayers() {
      return [...layers];
    },
    getLayerCount() {
      return layers.length;
    },
    getCompositeBuffer() {
      return compositeBuffer;
    },
    getPlaybackBuffer,
    triggerSampleRestart,
    triggerQuantizedLoopRestart,
    isPendingQuantizedRestart() {
      return pendingQuantizedRestart;
    },
    addLayer,
    undo: undoLastLayer,
    updateSettings(newSettings) {
      api.setSettings(newSettings);
    },
    buildCompositeBuffer,
    createUI,
    renderUI,
    renderWaveform,
    renderOffline,
    renderOfflineSong,
    clearAllData() {
      clearAllLayers();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener?.('pagehide', () => {
      if (cachedMicStream) {
        try { cachedMicStream.getTracks().forEach(t => t.stop()); } catch (_) {}
        cachedMicStream = null;
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloLiveLoop = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
