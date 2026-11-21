(function (root) {
  'use strict';
  const MAGIC = 'HALOLINK';
  const MAX_CLIP = 400 * 1024 * 1024;
  const MAX_PACKAGE = 512 * 1024 * 1024;
  const MAX_CLIPS = 32;
  const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
  const inRange = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  let database;

  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.clips) || value.clips.length > MAX_CLIPS ||
        !inRange(value.volume, 0, 100) || typeof value.mute !== 'boolean' || typeof value.fit !== 'boolean' ||
        !['live', 'recorded'].includes(value.mode)) throw Error('Invalid Track 10 settings');
    const ids = new Set();
    const clips = value.clips.map(clip => {
      const { id, scope, layout, start, steps, bpm, meter, offset, frames, rate, tail = 0 } = clip ?? {};
      if (typeof id !== 'string' || !UUID.test(id) || ids.has(id) || typeof scope !== 'string' || !/^(song|phrase:[0-9]{1,7})$/.test(scope) ||
          typeof layout !== 'string' || layout.length > 1024 || !/^[a-z0-9,:/|-]+$/.test(layout) ||
          !Number.isInteger(start) || !inRange(start, 0, 2047) ||
          !inRange(steps, .001, 2048 - start) || !inRange(bpm, 30, 200) ||
          !['3/4', '4/4'].includes(meter) || !inRange(offset, -500, 500) ||
          !Number.isInteger(frames) || !Number.isInteger(rate) || !inRange(rate, 8000, 96000) ||
          !Number.isInteger(tail) || !inRange(tail, 0, Math.ceil(rate * .006)) ||
          !inRange(frames + tail, 1, (MAX_CLIP - 44) / 4) || frames < 1 ||
          Math.abs(frames - steps * 15 * rate / bpm) > 2) throw Error('Invalid Track 10 recording reference');
      ids.add(id);
      return { id, scope, layout, start, steps, bpm, meter, offset, frames, rate, tail };
    });
    return { version: 1, mode: value.mode, volume: value.volume, mute: value.mute, fit: value.fit, clips };
  }

  function open() {
    database ??= new Promise((resolve, reject) => {
      const request = root.indexedDB.open('halo-external-audio', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('takes');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); database = null; };
        resolve(request.result);
      };
    }).catch(error => { database = null; throw error; });
    return database;
  }

  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('takes', mode);
      const request = action(tx.objectStore('takes'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onabort = () => reject(tx.error ?? Error('Track 10 storage error'));
    });
  }

  async function store(entries) {
    const bytes = entries.reduce((sum, [, blob]) => sum + blob.size, 0);
    const space = await root.navigator?.storage?.estimate?.().catch(() => undefined);
    if (space?.quota > 0 && space.usage + bytes > space.quota) throw Error('Not enough storage for Track 10');
    await transaction('readwrite', bucket => {
      for (const [id, blob] of entries) bucket.add(blob, id);
    });
  }

  async function read(clip) {
    const blob = await transaction('readonly', bucket => bucket.get(clip.id));
    if (!(blob instanceof Blob)) throw Error('Track 10 recording is missing');
    await checkWav(blob, clip);
    return blob;
  }

  async function checkWav(blob, clip) {
    if (blob.size !== 44 + 4 * (clip.frames + clip.tail) || blob.size > MAX_CLIP) throw Error('Invalid Track 10 audio');
    const header = new DataView(await blob.slice(0, 44).arrayBuffer());
    if (header.getUint32(0) !== 0x52494646 || header.getUint32(4, true) !== blob.size - 8 ||
        header.getUint32(8) !== 0x57415645 || header.getUint32(12) !== 0x666d7420 ||
        header.getUint32(16, true) !== 16 || header.getUint16(20, true) !== 1 ||
        header.getUint16(22, true) !== 2 || header.getUint32(24, true) !== clip.rate ||
        header.getUint32(28, true) !== 4 * clip.rate || header.getUint16(32, true) !== 4 ||
        header.getUint16(34, true) !== 16 || header.getUint32(36) !== 0x64617461 ||
        header.getUint32(40, true) !== blob.size - 44) throw Error('Invalid Track 10 audio');
  }

  const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
    for (let bit = 0; bit < 8; bit++) byte = (byte >>> 1) ^ (byte & 1 ? 0xedb88320 : 0);
    return byte;
  });
  async function checksum(blob) {
    let crc = 0xffffffff;
    const reader = blob.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return (crc ^ 0xffffffff) >>> 0;
      for (const byte of value) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    }
  }

  function legacyReferences(project) {
    const phrases = project.format === 'halo-composition' ? project.phrases.map(item => item.project) : [project];
    return [...new Set(phrases.flatMap(phrase => phrase.liveLoop?.layerIds || []))];
  }

  function layerMeta(raw) {
    const { id, sampleRate, frames, gain, bars, name } = raw;
    if (!Number.isSafeInteger(id) || id < 0 || !Number.isInteger(sampleRate) || !inRange(sampleRate, 8000, 192000) ||
        !Number.isInteger(frames) || !inRange(frames, 1, 120 * sampleRate) || !inRange(gain, 0, 8) ||
        ![1, 2, 4, 8].includes(bars) || typeof name !== 'string' || name.length > 128) throw Error('Invalid Track 09 audio in package');
    return { id, sampleRate, frames, gain, bars, name };
  }

  async function packLayers(project) {
    const ids = legacyReferences(project);
    if (!ids.length) return [];
    const layers = await root.HaloLiveLoop.packageLayers(ids);
    return layers.map(layer => {
      const meta = layerMeta({ ...layer, frames: layer.pcmL.length });
      const right = layer.pcmR || layer.pcmL;
      if (right.length !== meta.frames) throw Error('Invalid Track 09 audio in package');
      return { meta, blob: new Blob([layer.pcmL, right]) };
    });
  }

  function replaceLayerIds(project, ids) {
    const phrases = project.format === 'halo-composition' ? project.phrases.map(item => item.project) : [project];
    for (const phrase of phrases) {
      if (phrase.liveLoop) phrase.liveLoop.layerIds = phrase.liveLoop.layerIds.map(id => ids.get(id));
    }
  }

  function newLayerId() {
    const words = root.crypto.getRandomValues(new Uint32Array(2));
    return (words[0] & 0x1fffff) * 0x100000000 + words[1];
  }

  async function unpackLayers(project, file, position, manifest) {
    const ids = legacyReferences(project), layers = manifest.track09 || [];
    if (!Array.isArray(layers) || layers.length !== ids.length) throw Error('Invalid Track 09 package references');
    const replacements = new Map(), pending = [];
    for (let index = 0; index < layers.length; index++) {
      const info = layerMeta(layers[index]);
      if (ids[index] !== info.id) throw Error('Invalid Track 09 package reference');
      const end = position + 8 * info.frames;
      if (end > file.size) throw Error('Invalid Track 09 package audio length');
      const blob = file.slice(position, end);
      if (await checksum(blob) !== layers[index].checksum) throw Error('Invalid Track 09 audio checksum');
      const data = await blob.arrayBuffer();
      const pcmL = new Float32Array(data.slice(0, 4 * info.frames));
      const pcmR = new Float32Array(data.slice(4 * info.frames));
      if (pcmL.some(sample => !Number.isFinite(sample)) || pcmR.some(sample => !Number.isFinite(sample))) throw Error('Invalid Track 09 audio samples');
      const id = newLayerId();
      replacements.set(info.id, id);
      pending.push({ ...info, id, timestamp: Date.now(), duration: info.frames / info.sampleRate, pcmL, pcmR });
      position = end;
    }
    return { pending, replacements, position };
  }

  async function pack(project) {
    const clips = validate(project.externalLink).clips;
    const blobs = await Promise.all(clips.map(read));
    const track09 = await packLayers(project);
    const allAudio = [...blobs, ...track09.map(item => item.blob)];
    const audioBytes = allAudio.reduce((sum, blob) => sum + blob.size, 0);
    if (audioBytes > MAX_PACKAGE - 12) throw Error('Track 10 package exceeds size limit');
    const checksums = [];
    for (const blob of blobs) checksums.push(await checksum(blob));
    const layers = [];
    for (const { meta, blob } of track09) layers.push({ ...meta, checksum: await checksum(blob) });
    const manifest = new TextEncoder().encode(JSON.stringify({ version: 1, project, checksums, track09: layers }));
    if (12 + audioBytes + manifest.length > MAX_PACKAGE || manifest.length > 786432) throw Error('Track 10 package exceeds size limit');
    const header = new Uint8Array(12);
    header.set(new TextEncoder().encode(MAGIC));
    new DataView(header.buffer).setUint32(8, manifest.length, true);
    return new Blob([header, manifest, ...allAudio], { type: 'application/octet-stream' });
  }

  async function unpack(file, parse) {
    if (file.size < 12 || file.size > MAX_PACKAGE) throw Error('Invalid Track 10 package');
    const header = await file.slice(0, 12).arrayBuffer();
    const length = new DataView(header).getUint32(8, true);
    if (new TextDecoder().decode(header.slice(0, 8)) !== MAGIC ||
        length < 1 || length > 786432 || length > file.size - 12) throw Error('Invalid Track 10 package');
    const manifest = JSON.parse(await file.slice(12, 12 + length).text());
    if (manifest.version !== 1 || !Array.isArray(manifest.checksums) || !manifest.project) throw Error('Invalid Track 10 package');
    const project = parse(JSON.stringify(manifest.project));
    const clips = validate(project.externalLink).clips;
    if (manifest.checksums.length !== clips.length) throw Error('Invalid Track 10 package');
    let position = 12 + length;
    const entries = [];
    for (const clip of clips) {
      const end = position + 44 + 4 * (clip.frames + clip.tail);
      const blob = file.slice(position, end, 'audio/wav');
      await checkWav(blob, clip);
      if (await checksum(blob) !== manifest.checksums[entries.length]) throw Error('Invalid Track 10 audio checksum');
      position = end;
      // Local IDs are never trusted to identify the same recording on another computer.
      clip.id = root.crypto.randomUUID();
      entries.push([clip.id, blob]);
    }
    const legacy = await unpackLayers(project, file, position, manifest);
    if (legacy.position !== file.size) throw Error('Invalid Track 10 package');
    project.externalLink = { ...project.externalLink, clips };
    if (entries.length) await store(entries);
    if (legacy.pending.length) {
      try { await root.HaloLiveLoop.importPackageLayers(legacy.pending); }
      catch (error) {
        await Promise.allSettled(entries.map(([id]) => remove(id)));
        throw error;
      }
      replaceLayerIds(project, legacy.replacements);
    }
    return project;
  }

  function phraseLayout(world, bars, meter) { return [world, bars, meter].join(':'); }
  function songLayout(song) {
    const songEngine = root.HaloSong || (typeof module !== 'undefined' && require('./song.js'));
    return song.sections.map((section, index) => {
      const project = songEngine.phrase(song, index);
      return [section.phrase, section.repeats, phraseLayout(project.setup, project.bars, project.timeSignature || '4/4')].join(':');
    }).join('|');
  }

  function fits(clip, layout, bpm, fit) { return clip.layout === layout && (clip.bpm === bpm || fit); }

  function schedule(engine, destination, buffer, clip, at, position, bpm) {
    const offset = (position - clip.start) * 15 / clip.bpm;
    const rate = bpm / clip.bpm;
    const remaining = Math.min(buffer.duration - offset, (clip.start + clip.steps - position) * 15 / clip.bpm);
    if (!(remaining > 0)) return null;
    const end = at + remaining / rate;
    const tail = Math.min(clip.tail / clip.rate, Math.max(0, buffer.duration - offset - remaining));
    const release = end + tail / rate;
    const source = engine.ctx.createBufferSource(), envelope = engine.ctx.createGain();
    const edge = Math.min(.006, (end - at) / 3);
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(envelope);
    envelope.connect(destination);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(1, at + edge);
    envelope.gain.setValueAtTime(1, tail > 0 ? end : end - edge);
    envelope.gain.linearRampToValueAtTime(0, release);
    source.onended = () => { source.disconnect(); envelope.disconnect(); };
    source.start(at, offset, remaining + tail);
    return {
      end,
      stop(time) {
        if (time >= release) return;
        envelope.gain.cancelScheduledValues(time);
        envelope.gain.setTargetAtTime(0, time, .003);
        source.stop(Math.min(release, time + .009));
      }
    };
  }

  function layoutFor(project, scope) {
    if (project.format === 'halo-composition') {
      if (scope === 'song') return songLayout(project);
      project = project.phrases.find(p => 'phrase:' + p.id === scope)?.project;
    } else if (scope !== 'phrase:0') return null;
    return project ? phraseLayout(project.setup, project.bars, project.timeSignature || '4/4') : null;
  }

  function included(project) {
    const state = project.externalLink;
    if (!state?.clips.length) return [];
    const scopes = project.format === 'halo-composition'
      ? new Set(['song', ...project.sections.map(section => 'phrase:' + section.phrase)])
      : new Set(['phrase:0']);
    return state.clips.filter(clip => scopes.has(clip.scope));
  }

  async function checkProject(project) {
    for (const clip of included(project)) {
      if (clip.layout !== layoutFor(project, clip.scope)) throw Error('Track 10 musical grid changed');
      if (clip.bpm !== project.tempo && !project.externalLink.fit) throw Error('Track 10 tempo differs');
      await read(clip);
    }
  }

  async function buffers(ctx, clips) {
    const decoded = new Map();
    for (const clip of clips) {
      const blob = await read(clip);
      try { decoded.set(clip.id, await ctx.decodeAudioData(await blob.arrayBuffer())); }
      catch (_) { throw Error('Invalid Track 10 audio'); }
    }
    return decoded;
  }

  async function remove(id) { await transaction('readwrite', bucket => bucket.delete(id)); }
  async function clear() { await transaction('readwrite', bucket => bucket.clear()); }

  const api = { clear, remove, MAX_CLIPS, MAX_CLIP, MAX_PACKAGE, validate, store, read, pack, unpack, phraseLayout, songLayout, fits, schedule, buffers, included, checkProject };
  if (typeof module !== 'undefined') module.exports = api;
  else root.HaloExternalMedia = api;
})(globalThis);
