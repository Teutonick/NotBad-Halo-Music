(function (root) {
  'use strict';
  function install(env) {
    const media = root.HaloExternalMedia;
    const empty = () => ({ version: 1, mode: 'live', volume: 70, mute: false, fit: false, clips: [] });
    let state = empty(), timeline, node, audio, input, bus, pending, take, draft, voice, preview, loading, message;
    let generation = 0, countUntil = null, selectId = '', meter = 0;
    const cache = new Map(), missing = new Set();

    function signal(name) { message = name; env.render(); }
    function changed() { env.changed(); env.render(); }
    function stopVoice(at = audio?.ctx.currentTime ?? 0) {
      voice?.player.stop(at);
      voice = null;
    }
    function stopPreview() {
      if (!preview) return;
      preview.player.stop(audio.ctx.currentTime);
      preview = null;
      mix();
      env.render();
    }
    function connect(engine) {
      if (audio === engine) return;
      if (audio) close();
      audio = engine;
      bus = audio.ctx.createGain();
      bus.gain.value = 0;
      const analyser = audio.ctx.createAnalyser();
      bus.connect(analyser);
      analyser.connect(audio.master);
      meter = analyser;
      mix();
    }
    function mix() {
      if (!bus) return;
      const at = audio.ctx.currentTime;
      bus.gain.cancelScheduledValues(at);
      bus.gain.setTargetAtTime(preview || !state.mute && state.mode === 'recorded' ? state.volume / 100 : 0, at, .012);
    }
    function restore(value, at) {
      interrupt('interrupted', at);
      stopVoice(at);
      stopPreview();
      state = value ? media.validate(value) : empty();
      generation++;
      missing.clear();
      cache.clear();
      draft = timeline = null;
      selectId = '';
      message = null;
      mix();
      changed();
    }
    function modify(patch) {
      if (patch.mode && patch.mode !== state.mode) {
        stopVoice();
        stopPreview();
      }
      state = { ...state, ...patch };
      mix();
      changed();
    }

    async function attach() {
      if (node) return;
      const current = audio, inputNode = input;
      if (!current?.ctx.audioWorklet || !root.AudioWorkletNode) throw Error('unsupported');
      await current.ctx.audioWorklet.addModule(new URL('./src/external-record-worklet.js', root.document.baseURI));
      if (current !== audio || inputNode !== input || !inputNode) throw Error('interrupted');
      if (node) return;
      node = new AudioWorkletNode(current.ctx, 'halo-external-recorder', { channelCount: 2, channelCountMode: 'explicit', outputChannelCount: [1] });
      node.port.onmessage = receive;
      inputNode.connect(node);
      // The processor leaves its output silent.
      node.connect(current.ctx.destination);
    }

    async function arm(options) {
      if (!input || pending || take || loading) { signal('needInput'); return; }
      const descriptor = env.describe();
      if (options.kind === 'song' && !descriptor?.barSteps) { signal('needSong'); return; }
      if (options.kind === 'phrase' && descriptor?.barSteps) { signal('needPhrase'); return; }
      const range = options.kind === 'song'
        ? [descriptor.barSteps[options.from - 1], descriptor.barSteps[options.to]]
        : [0, descriptor?.length];
      if (!Number.isInteger(range[0]) || !Number.isInteger(range[1]) || range[0] >= range[1]) { signal('badRange'); return; }
      loading = true;
      env.render();
      try {
        await attach();
        pending = { descriptor, options, range, earliest: null, initial: !env.running() || options.kind === 'song' };
        if (pending.initial) timeline = null;
        draft = null;
        stopPreview();
        modify({ mode: 'live' });
        signal('armed');
        await env.start(options.kind === 'song');
        if (!env.running()) interrupt('recordError');
      } catch (error) {
        pending = null;
        signal(error.message === 'unsupported' ? 'unsupported' : 'recordError');
      } finally {
        loading = false;
        env.render();
      }
    }

    function begin(at, current) {
      const { options, range } = pending;
      const bar = current.barSteps?.indexOf(range[0]);
      const meterAtStart = bar >= 0 ? (current.barSteps[bar + 1] - range[0] === 12 ? '3/4' : '4/4') : current.meter;
      const rate = audio.ctx.sampleRate;
      const frame = Math.round((at + options.offset / 1000) * rate);
      const frames = Math.round((range[1] - range[0]) * 15 * rate / current.bpm);
      const tail = current.scope.startsWith('phrase:') ? Math.floor(rate * .006) : 0;
      if (frame < Math.ceil(audio.ctx.currentTime * rate) || rate > 96000 || (frames + tail) * 4 > media.MAX_CLIP - 44) {
        pending = null;
        signal('recordError');
        return;
      }
      const id = root.crypto.randomUUID();
      take = { clip: { id, scope: current.scope, layout: current.layout, start: range[0], bpm: current.bpm,
        meter: meterAtStart, offset: options.offset, rate }, frame, end: frame + frames + tail, frames: 0, planned: frames, chunks: [], revision: generation };
      node.port.postMessage({ type: 'begin', id, start: frame, end: take.end });
      pending = null;
      countUntil = at;
      signal('recording');
    }

    function wavHeader(frames, rate) {
      const bytes = new Uint8Array(44);
      const v = new DataView(bytes.buffer);
      v.setUint32(0, 0x52494646);
      v.setUint32(4, 36 + frames * 4, true);
      v.setUint32(8, 0x57415645);
      v.setUint32(12, 0x666d7420);
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 2, true);
      v.setUint32(24, rate, true);
      v.setUint32(28, rate * 4, true);
      v.setUint16(32, 4, true);
      v.setUint16(34, 16, true);
      v.setUint32(36, 0x64617461);
      v.setUint32(40, frames * 4, true);
      return bytes;
    }
    function finishTake() {
      const recorded = take;
      take = null;
      if (!recorded || recorded.revision !== generation) return;
      const { clip, frames, chunks } = recorded;
      if (frames < clip.rate * .01) { signal(recorded.reason || 'recordError'); return; }
      clip.frames = Math.min(frames, recorded.planned);
      clip.tail = frames - clip.frames;
      clip.steps = Math.min(2048 - clip.start, clip.frames * clip.bpm / (15 * clip.rate));
      draft = { clip, blob: new Blob([wavHeader(frames, clip.rate), ...chunks], { type: 'audio/wav' }) };
      signal(recorded.reason || 'review');
    }
    function receive({ data }) {
      if (data.id !== take?.clip.id) return;
      if (data.done) { finishTake(); return; }
      try {
        const length = Math.min(data.channels[0].length, take.end - take.frame - take.frames);
        if (length <= 0) return;
        const pcm = new DataView(new ArrayBuffer(length * 4));
        for (let frame = 0; frame < length; frame++) {
          for (let channel = 0; channel < 2; channel++) {
            const sample = Math.max(-1, Math.min(1, data.channels[channel][frame]));
            pcm.setInt16(frame * 4 + channel * 2, sample * (sample < 0 ? 32768 : 32767), true);
          }
        }
        take.frames += length;
        take.chunks.push(pcm.buffer);
      } catch (_) { interrupt('recordError'); }
    }
    function interrupt(reason, at = audio?.ctx.currentTime ?? 0) {
      countUntil = null;
      if (pending) { pending = null; signal(reason); }
      if (!take || take.stopping) return;
      take.reason = reason;
      take.stopping = true;
      take.end = Math.min(take.end, Math.max(take.frame, Math.floor(at * take.clip.rate)));
      node?.port.postMessage({ type: 'end', id: take.clip.id, end: take.end });
    }
    function detach() {
      interrupt('interrupted');
      const old = node;
      node = null;
      if (old) {
        input?.disconnect(old);
        // Flush the final partial block after the input ends.
        old.port.addEventListener('message', ({ data }) => {
          if (data.done) { old.disconnect(); old.port.close(); }
        });
        if (!take) { old.disconnect(); old.port.close(); }
      }
      input = null;
    }
    function close() {
      detach();
      finishTake();
      stopVoice();
      stopPreview();
      bus?.disconnect();
      if (meter) meter.disconnect();
      audio = bus = null;
      meter = 0;
      cache.clear();
    }

    function fetchBuffer(clip) {
      if (cache.has(clip.id)) return cache.get(clip.id);
      const ctx = audio.ctx;
      const wanted = generation;
      const record = {};
      record.promise = media.read(clip).then(blob => blob.arrayBuffer()).then(bytes => ctx.decodeAudioData(bytes))
        .then(buffer => { record.buffer = buffer; return buffer; })
        .catch(error => {
          if (generation === wanted && audio?.ctx === ctx) {
            missing.add(clip.id);
            env.render();
          }
          throw error;
        });
      record.promise.catch(() => {});
      cache.set(clip.id, record);
      if (cache.size > 4) cache.delete(cache.keys().next().value);
      return record;
    }
    function matching(descriptor) {
      return state.clips.filter(clip => clip.scope === descriptor.scope);
    }
    async function warm(engine, descriptor) {
      if (!descriptor || state.mode !== 'recorded') return;
      connect(engine);
      const current = [descriptor, descriptor.phrase].filter(Boolean);
      const needed = current.map(item => matching(item).find(clip => item.position >= clip.start && item.position < clip.start + clip.steps)).filter(Boolean);
      await Promise.allSettled(needed.map(clip => fetchBuffer(clip).promise));
      for (const clip of matching(descriptor).filter(clip => clip.start > descriptor.position).slice(0, 1)) fetchBuffer(clip);
    }

    function tick(engine, at, current) {
      if (!current || (state.mode === 'live' && !pending && !take)) return;
      connect(engine);
      const previous = timeline;
      timeline = { ...current, at };
      if (pending) {
        const plan = pending;
        if (plan.descriptor.layout !== current.layout || plan.descriptor.scope !== current.scope || plan.descriptor.bpm !== current.bpm) interrupt('changedGrid', at);
        else {
          const offset = plan.options.offset / 1000;
          plan.earliest ??= at + (plan.initial ? 0 : plan.options.count * (current.meter === '3/4' ? 3 : 4) * 60 / current.bpm);
          const distance = current.scope === 'song'
            ? plan.range[0] - current.position
            : (current.length - current.position) % current.length;
          const boundary = at + distance * 15 / current.bpm;
          const cycle = current.length * 15 / current.bpm;
          const additionalCycles = cycle > 0 ? Math.max(0, Math.ceil((plan.earliest - boundary - 1e-5) / cycle)) : 0;
          countUntil = distance < 0 ? null : boundary + additionalCycles * (cycle || 0);
          if (distance >= 0 && boundary >= plan.earliest - 1e-5 &&
              boundary + offset > engine.ctx.currentTime + .025 &&
              (distance === 0 || boundary + offset < engine.ctx.currentTime + .2)) begin(boundary, current);
          else if (current.scope === 'song' && distance < 0) interrupt('missed', at);
        }
      }
      const nextPosition = current.scope.startsWith('phrase:')
        ? (previous?.position + 1) % current.length : previous?.position + 1;
      if (take && !take.stopping && (take.clip.layout !== current.layout || take.clip.scope !== current.scope ||
          take.clip.bpm !== current.bpm || (previous?.scope === current.scope && current.position !== nextPosition &&
          at < (take.frame + take.planned) / take.clip.rate - take.clip.offset / 1000 - 1e-5))) interrupt('changedGrid', at);
      if (state.mode !== 'recorded') return;
      const clipAt = descriptor => matching(descriptor).find(clip => media.fits(clip, descriptor.layout, descriptor.bpm, state.fit) &&
        descriptor.position >= clip.start && descriptor.position < clip.start + clip.steps);
      const upcoming = current.upcoming;
      const upcomingClip = upcoming && (clipAt(upcoming) || (upcoming.phrase && clipAt(upcoming.phrase)));
      if (upcomingClip && !missing.has(upcomingClip.id)) fetchBuffer(upcomingClip);
      const next = matching(current).find(c => c.start > current.position && c.start <= current.position + 16);
      if (next && !missing.has(next.id)) fetchBuffer(next);
      const clip = clipAt(current) || (current.phrase && clipAt(current.phrase));
      const position = clip?.scope === current.scope ? current.position : current.phrase?.position;
      if (voice && voice.id === clip?.id && voice.bpm === current.bpm && position === voice.position + 1) {
        voice.position = position;
        return;
      }
      if (voice?.id === clip?.id && voice?.bpm === current.bpm && position === clip.start && voice.player.end <= at + .0001) voice = null;
      else stopVoice(at);
      if (!clip || missing.has(clip.id)) return;
      const record = fetchBuffer(clip);
      if (!record.buffer) return;
      const player = media.schedule(engine, bus, record.buffer, clip, at, position, current.bpm);
      if (player) voice = { id: clip.id, bpm: current.bpm, position, player };
    }

    async function audition(useDraft) {
      const selection = state.clips.find(clip => clip.id === selectId);
      const item = useDraft && draft ? draft : selection ? { clip: selection } : null;
      if (!item) return;
      try {
        if (env.running()) await env.pause();
        connect(env.audio());
        const current = audio;
        const revision = generation;
        await audio.ctx.resume();
        stopPreview();
        const buffer = item.blob ? await audio.ctx.decodeAudioData(await item.blob.arrayBuffer()) : await fetchBuffer(item.clip).promise;
        if (current !== audio || revision !== generation) return;
        const player = media.schedule(audio, bus, buffer, item.clip, audio.ctx.currentTime + .03, item.clip.start, item.clip.bpm);
        if (player) preview = { player };
        mix();
        env.render();
      } catch (_) { signal('missing'); }
    }
    async function keep() {
      if (!draft || loading) return;
      const kept = draft;
      const revision = generation;
      const clips = state.clips.filter(clip => clip.scope !== kept.clip.scope ||
        (clip.scope === 'song' && clip.layout === kept.clip.layout &&
         (clip.start + clip.steps <= kept.clip.start || kept.clip.start + kept.clip.steps <= clip.start)));
      const totalBytes = clips.reduce((sum, clip) => sum + 44 + 4 * (clip.frames + clip.tail), kept.blob.size);
      if (clips.length >= media.MAX_CLIPS || totalBytes > media.MAX_PACKAGE - 526348) { signal('storage'); return; }
      loading = true;
      env.render();
      try {
        await media.store([[kept.clip.id, kept.blob]]);
        if (generation !== revision) return;
        draft = null;
        stopPreview();
        selectId = kept.clip.id;
        modify({ clips: [...clips, kept.clip], mode: 'recorded' });
        signal('kept');
      } catch (_) { if (generation === revision) signal('storage'); }
      finally { loading = false; env.render(); }
    }

    return {
      failPlayback() {
        try { stopVoice(); interrupt('recordError'); } catch (_) {}
        state = { ...state, mode: 'live' };
        mix();
        signal('playbackError');
      },
      restore, modify, snapshot: () => (state.clips.length || state.mode !== 'live' || state.volume !== 70 || state.mute || state.fit ? state : undefined),
      close, connect, warm, tick, keep, arm, audition,
      setInput(engine, value) { connect(engine); input = value; }, detach,
      stop(at, natural = false) {
        stopVoice(at);
        stopPreview();
        const expected = take && ((take.frame + take.planned) / take.clip.rate - take.clip.offset / 1000);
        if (!natural || !take || at < expected - 1e-4) interrupt('interrupted', at);
      },
      lead: () => pending?.initial ? Math.max(.60, .12 + pending.options.count *
        (pending.descriptor.meter === '3/4' ? 3 : 4) * 60 / pending.descriptor.bpm) : .08,
      countIn(position) { if (pending) countUntil = position; },
      recording: () => !!(take || pending),
      previewing: () => !!(preview && preview.player.end > audio.ctx.currentTime),
      updatePreview() {
        if (!preview || preview.player.end > audio.ctx.currentTime) return;
        preview = null;
        mix();
        env.render();
      }, busy: () => !!(take || pending || loading || (preview && preview.player.end > audio.ctx.currentTime)),
      monitor: () => state.mode === 'live' && !(preview && preview.player.end > audio.ctx.currentTime),
      stopPreview,
      adoptPhrase(id) {
        if (!id || !state.clips.some(clip => clip.scope === 'phrase:0')) return;
        modify({ clips: state.clips.map(clip => clip.scope === 'phrase:0' ? { ...clip, scope: 'phrase:' + id } : clip) });
      },
      discard() { draft = null; stopPreview(); signal('discarded'); },
      select(id) { selectId = id; env.render(); },
      async remove(id) {
        if (!id || loading) return;
        const revision = generation;
        loading = true;
        env.render();
        try {
          await media.remove(id);
          if (revision !== generation) return;
          stopVoice();
          stopPreview();
          cache.delete(id);
          missing.delete(id);
          selectId = '';
          modify({ clips: state.clips.filter(clip => clip.id !== id) });
          signal('deleted');
        } catch (_) { if (revision === generation) signal('deleteError'); }
        finally { loading = false; env.render(); }
      },
      view() {
        const descriptor = env.describe();
        const beats = countUntil === null || !audio ? 0 : Math.max(0, Math.ceil((countUntil - audio.ctx.currentTime) * (timeline?.bpm ?? descriptor?.bpm ?? 60) / 60));
        const elapsed = timeline && audio ? (audio.ctx.currentTime - timeline.at) * timeline.bpm / 60 : 0;
        return { state, draft, selected: selectId, pending, take, loading, timeline, elapsed, beats, message, meter,
          missing: state.clips.some(clip => missing.has(clip.id)),
          changedGrid: descriptor && matching(descriptor).some(clip => clip.layout !== descriptor.layout),
          changedTempo: descriptor && matching(descriptor).some(clip => clip.bpm !== descriptor.bpm) };
      }
    };
  }
  root.HaloExternalTakes = { install };
})(globalThis);
