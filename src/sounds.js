/* AMBIENT: original synthesis. REACTOR: local CC0 samples, assets/reactor/manifest.json. */
(function (root) {
  'use strict';
  const phrases=typeof module!=='undefined'&&module.exports?require('./phrases.js'):root.HaloPhrases;
  const roles=typeof module!=='undefined'&&module.exports?require('./roles.js'):root.HaloRoles;
  const patch = (id,name,engine,tone,decay,extra={}) => {const s={id,name,engine,tone,decay,...extra};return Object.freeze({...s,playback:roles.describe(s)})};
  const banks = {
    GLASS: { role: 'Ringing accents', sounds: [
      patch('bell', 'Soft bell', 'bell', 4200, 2.7),
      patch('vibes', 'Vibes', 'bell', 2200, 1.8, { ratio: 3 }),
      patch('crystal', 'Crystal', 'bell', 5800, 3.2, { ratio: 2.71 })] },
    TIDAL: { role: 'Harmonic bed', sounds: [
      patch('air', 'Air pad', 'pad', 1300, 4.8),
      patch('organ', 'Soft organ', 'pad', 1800, 3.6, { wave: 'sine', ratio: 2 }),
      patch('tide', 'Warm tide', 'pad', 800, 5.5, { wave: 'triangle', detune: 8 })] },
    ROOT: { role: 'Low foundation', sounds: [
      patch('round', 'Round bass', 'bass', 650, 1.15),
      patch('deep', 'Deep tone', 'bass', 350, 2.1, { wave: 'triangle' }),
      patch('pulse', 'Soft kick', 'kick', 480, .45),
      patch('punch', 'Punch kick', 'kick', 2200, .32, { punch: true, pattern: [0,4,8,12] })] },
    EMBER: { role: 'Plucked tones', sounds: [
      patch('string', 'Soft string', 'pluck', 2400, 1.2),
      patch('harp', 'Harp glow', 'pluck', 3400, 2, { ratio: 2 }),
      patch('warm', 'Warm pluck', 'pluck', 1100, .8, { wave: 'sine' })] },
    RAIN: { role: 'Light rhythm', sounds: [
      patch('shaker', 'Shaker', 'noise', 3500, .16, { filter: 'bandpass' }),
      patch('brush', 'Brush', 'noise', 1700, .45, { filter: 'bandpass' }),
      patch('drop', 'Drops', 'drop', 2800, .35),
      patch('snare', 'Dry snare', 'snare', 6500, .18, { punch: true, pattern: [4,12] }),
      patch('clap', 'Clap', 'clap', 3800, .16, { punch: true, filter: 'bandpass', pattern: [4,12] }),
      patch('hat', 'Closed hat', 'noise', 7500, .07, { filter: 'highpass', pattern: [2,6,10,14] })] },
    VEIL: { role: 'Sustained textures', sounds: [
      patch('bow', 'Bowed veil', 'pad', 950, 5, { wave: 'triangle', detune: 6 }),
      patch('drone', 'Low drone', 'pad', 600, 6, { wave: 'sine', detune: 2 }),
      patch('ensemble', 'Ensemble', 'pad', 1600, 4.5, { wave: 'triangle', detune: 11 })] },
    MOSS: { role: 'Wooden percussion', sounds: [
      patch('marimba', 'Marimba', 'wood', 1700, .8),
      patch('kalimba', 'Kalimba', 'wood', 2800, 1.4, { ratio: 3 }),
      patch('wood', 'Wood click', 'wood', 1200, .22, { ratio: 4.1 }),
      patch('hat', 'Closed hat', 'noise', 7500, .07, { filter: 'highpass', pattern: [2,6,10,14] }),
      patch('tom', 'Low tom', 'kick', 1500, .4, { startHz: 105, pattern: [6,14] })] },
    AURA: { role: 'Environmental atmosphere', sounds: [
      patch('wind', 'Wind', 'noise', 700, 5, { ambient: true }),
      patch('water', 'Water hush', 'noise', 1300, 3.5, { ambient: true, filter: 'bandpass' }),
      patch('rustle', 'Rustle', 'noise', 2200, 2.8, { ambient: true, filter: 'bandpass' })] }
  };
  for (const bank of Object.values(banks)) {
    for (const sound of bank.sounds) if (sound.pattern) Object.freeze(sound.pattern);
    Object.freeze(bank.sounds); Object.freeze(bank);
  }
  Object.freeze(banks);
  const chords = Object.freeze([[50,53,57,60],[46,50,53,57],[53,57,60,64],[48,52,55,60]].map(Object.freeze));
  const random01 = n => { const x = Math.sin(n * 127.1 + 34.233) * 43758.5453; return x - Math.floor(x); };
  // Stable slot identities retain old project compatibility; each world owns its patches.
  const sampleBanks={
    'dry-kick':'kick-damped','arena-kick':'kick-open','attack-kick':'kick-damped','machine-kick':'kick-open',
    'dry-snare':'snare-center','steel-snare':'snare-edge','heavy-snare':'snare-rim','arena-snare':'snare-layer',
    'tight-hat':'hat-tight','open-hat':'hat-open','ride':'ride','crash':'crash',
    'floor-tom':'tom-floor','mid-tom':'tom-mid','high-tom':'tom-high','war-tom':'tom-war',
    'pick-bass':'bass-pick','tube-bass':'bass-finger','fuzz-bass':'bass-pick','muted-bass':'bass-finger',
    'palm-guitar':'guitar-direct','power-guitar':'guitar-dist','crunch-guitar':'guitar-direct','gain-guitar':'guitar-dist',
    'singing-lead':'guitar-dist','octave-lead':'guitar-dist','picked-lead':'guitar-direct','feedback-lead':'guitar-dist',
    'attack-piano':'piano','dark-piano':'piano','analog-arp':'synth-arp','cut-synth':'synth-cut'
  };
  const rock = (id,name,engine,tone,decay,pattern,extra={}) => patch('reactor-'+id,name,engine,engine==='metal'?14000:tone,decay,{pattern,punch:true,...extra,filter:'lowpass',sampleBank:sampleBanks[id],drive:sampleBanks[id]==='guitar-dist'?0:extra.drive});
  const reactorBanks = {
    GLASS:{label:'KICK',role:'Rock kick',sounds:[
      rock('dry-kick','Dry rock kick','kick',3500,.22,[0,6,8,10],{startHz:180}),
      rock('arena-kick','Arena kick','kick',2800,.38,[0,6,8],{startHz:145}),
      rock('attack-kick','Attack kick','kick',5200,.18,[0,3,6,8,10],{startHz:210}),
      rock('machine-kick','Machine kick','kick',4100,.25,[0,6,8,14],{startHz:160,drive:3})]},
    TIDAL:{label:'SNARE',role:'Rock snare',sounds:[
      rock('dry-snare','Crack snare','snare',7200,.16,[4,12],{bodyHz:190}),
      rock('steel-snare','Edge snare','snare',9000,.23,[4,12],{bodyHz:240}),
      rock('heavy-snare','Heavy snare','snare',4800,.28,[4,12],{bodyHz:150}),
      rock('arena-snare','Layered snare','snare',6500,.36,[4,12],{bodyHz:180})]},
    ROOT:{label:'METAL',role:'Cymbals and hats',sounds:[
      rock('tight-hat','Tight hat','metal',9500,.055,[0,2,4,6,8,10,12,14],{filter:'highpass'}),
      rock('open-hat','Open rock hat','metal',7500,.32,[2,6,10,14],{filter:'highpass'}),
      rock('ride','Ride bell','metal',5200,.45,[0,2,4,6,8,10,12,14],{filter:'highpass',metalHz:310}),
      rock('crash','Crash cymbal','metal',6200,1.3,[0],{filter:'highpass',sparse:true})]},
    EMBER:{label:'TOMS',role:'Tom fills',sounds:[
      rock('floor-tom','Floor tom','tom',2200,.46,[10,14,15],{startHz:100}),
      rock('mid-tom','Mid tom','tom',3000,.32,[10,12,14],{startHz:145}),
      rock('high-tom','High tom','tom',4200,.24,[11,14,15],{startHz:205}),
      rock('war-tom','War tom','tom',1800,.65,[8,10,12,14],{startHz:80,drive:2})]},
    RAIN:{label:'BASS',role:'Electric bass riff',sounds:[
      rock('pick-bass','Pick bass','rockbass',2200,.3,[0,3,6,8,10,14],{drive:1.4}),
      rock('tube-bass','Tube bass','rockbass',1600,.4,[0,3,6,8,10,14],{drive:2.8}),
      rock('fuzz-bass','Fuzz bass','rockbass',2700,.32,[0,3,6,8,10,14],{drive:5}),
      rock('muted-bass','Muted bass','rockbass',1300,.17,[0,3,6,8,10,14],{drive:1.8})]},
    VEIL:{label:'RIFF',role:'Rhythm guitar',sounds:[
      rock('palm-guitar','Palm mute','guitar',3200,.16,[0,3,6,8,10,14],{drive:5,damping:.965}),
      rock('power-guitar','Open power chords','guitar',4000,.65,[0,6,8,14],{drive:4,damping:.995}),
      rock('crunch-guitar','Dry crunch','guitar',4500,.27,[0,3,6,8,10,14],{drive:2.5,damping:.982}),
      rock('gain-guitar','High gain','guitar',3500,.42,[0,3,6,8,10,14],{drive:7,damping:.99})]},
    MOSS:{label:'LEAD',role:'Lead guitar',sounds:[
      rock('singing-lead','Singing lead','guitar',4200,1.2,[2,7,11],{drive:3,damping:.997,lead:true}),
      rock('octave-lead','Octave lead','guitar',5200,.5,[2,7,11],{drive:4,damping:.99,lead:true,octave:true}),
      rock('picked-lead','Picked lead','guitar',5800,.25,[2,7,11,15],{drive:2,damping:.982,lead:true}),
      rock('feedback-lead','Sustained lead','guitar',3000,1.7,[2,11],{drive:6,damping:.998,lead:true})]},
    AURA:{label:'KEYS',role:'Piano and synthesizers',sounds:[
      rock('attack-piano','Attack piano','piano',6000,.8,[0,4,8,12]),
      rock('dark-piano','Dark piano','piano',2600,1.3,[0,8],{dark:true}),
      rock('analog-arp','Analog arpeggio','rocksynth',3800,.19,[0,2,4,6,8,10,12,14],{arp:true,drive:1.2}),
      rock('cut-synth','Cutting synth','rocksynth',5200,.45,[0,6,8,14],{drive:2.2})]}
  };
  for(const bank of Object.values(reactorBanks)){for(const s of bank.sounds)Object.freeze(s.pattern);Object.freeze(bank.sounds);Object.freeze(bank)}
  Object.freeze(reactorBanks);
  function banksFor(setup){return setup==='reactor'?reactorBanks:banks}
  function bankFor(track){return banksFor(track.setup)[track.instrument||track.name]}
  function soundFor(track) {
    const bank = bankFor(track);
    return bank.sounds.find(s => s.id === track.sound) || bank.sounds[0];
  }
  function notesFor(track,index,bar,local,seed,transpose=0,bars=track.phraseBars||4,absoluteStep=bar*16+local){
    if(track.generator===3)return roles.notes(track,soundFor(track),bar,local,seed,transpose,bars,absoluteStep);
    return track.generator===2?phrases.notes(track,soundFor(track),bar,local,seed,transpose,bars):legacyNotesFor({...track,name:track.instrument||track.name},index,bar,local,seed,transpose);
  }
  function legacyNotesFor(track, index, bar, local, seed, transpose=0) {
    if(track.setup==='reactor'){
      const s=soundFor(track),root=[38,38,34,36][((bar%4)+4)%4]+transpose;
      if(['kick','snare','metal','tom'].includes(s.engine))return [];
      const riff=[0,0,0,7,0,0,0,10,0,0,7,0,0,0,10,7];
      const offset=riff[(local+(seed%3)*2)%16];
      // Keep the riff within both recorded bass articulations' 26–45 range.
      if(s.engine==='rockbass')return [root+offset>45?root+offset-12:root+offset];
      if(s.engine==='guitar'&&!s.lead)return [root+12+offset,root+19+offset];
      const minor=[0,3,7,10];
      if(s.lead)return [root+24+minor[(Math.floor(local/2)+bar+seed)%4],...(s.octave?[root+36+minor[(Math.floor(local/2)+bar+seed)%4]]:[])];
      if(s.arp)return [root+24+minor[(Math.floor(local/2)+seed)%4]];
      return [root+12,root+15,root+19];
    }
    const s = soundFor(track), chord = chords[((bar % 4) + 4) % 4].map(n=>n+transpose);
    if (['noise','kick','drop','snare','clap'].includes(s.engine)) return [];
    if (track.name === 'ROOT') return [chord[0] - 12];
    if (track.name === 'TIDAL' || track.name === 'VEIL')
      return chord.slice(0, 3).map(n => n + (track.name === 'VEIL' ? -12 : 0));
    const pick = ((Math.floor(local * 1.73 + bar * .87 + index * 1.69 + seed * 1.11) % 4) + 4) % 4;
    return [chord[pick] + (track.name === 'MOSS' ? 0 : 12)];
  }
  const densityCache=new WeakMap();
  function generatedSteps(track,index,seed,bars){
    const p=track.generator===3?roles.plan(track,soundFor(track),seed,bars):phrases.plan(track,soundFor(track),seed,bars),key=index+':'+track.density;
    let cache=densityCache.get(p);if(!cache){cache=new Map();densityCache.set(p,cache)}
    if(cache.has(key))return cache.get(key);
    const steps=track.density>0?p.steps.filter(step=>random01(index*97+step*31+seed*191)<=track.density/100):[];
    // Low density leaves space but never silently disables an enabled instrument.
    if(track.density>0&&!steps.length&&p.steps.length){const loudest=Math.max(...p.accents);steps.push(p.steps[p.accents.indexOf(loudest)])}
    if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,steps);return steps;
  }
  function shouldTrigger(track, index, step, seed,bars=track.phraseBars||4) {
    if(track.manualSteps)return track.on&&track.manualSteps.includes(track.generator===3?roles.mod(step,track.manualBars*16):step%(track.manualBars*16));
    if(track.generator===3)return track.on&&generatedSteps(track,index,seed,bars).includes(roles.mod(step,roles.plan(track,soundFor(track),seed,bars).period));
    if(track.generator===2)return track.on&&generatedSteps(track,index,seed,bars).includes(step%(bars*16));
    const bar = Math.floor(step / 16);
    if(track.setup==='reactor'){
      return track.on&&track.density>0&&patternFor({...track,variation:seed}).includes(step%16)&&
        random01(index*97+step*31+seed*191)<=track.density/100;
    }
    return track.on && track.density > 0 && patternFor(track).includes(step % 16) &&
      !(((track.instrument||track.name) === 'VEIL' || (track.instrument||track.name) === 'AURA') && bar % 2 === 1) &&
      random01(index * 97 + step * 31 + seed * 191) <= track.density / 100;
  }
  const rhythmCache=new Map();
  function patternFor(track,bars=track.phraseBars||4) {
    if(track.generator===3)return roles.plan(track,soundFor(track),track.variation||1,bars).steps;
    if(track.generator===2)return phrases.plan(track,soundFor(track),track.variation||1,bars).steps;
    const base=soundFor(track).pattern||track.pattern;
    if(track.setup==='reactor'){
      const variation=track.variation||1,s=soundFor(track);
      const cacheKey=track.name+':'+s.id+':'+variation;
      if(rhythmCache.has(cacheKey))return rhythmCache.get(cacheKey);
      // Rebuild hit groups, never rotate a preset. Keep only musical anchors.
      // Each slot has its own rhythm; harmony still follows the shared clock.
      const lane=Object.keys(reactorBanks).indexOf(track.name);
      const anchors=s.engine==='snare'?[4,12]:s.engine==='kick'?[0]:[];
      const count=Math.min(11,Math.max(s.engine==='snare'?3:2,base.length)+(variation%2===0?1:0)+(lane===5?1:0));
      const ranked=Array.from({length:16},(_,step)=>step).filter(step=>!anchors.includes(step));
      const salt=base.reduce((sum,n)=>sum+n,0)*17;
      const score=step=>random01(variation*7919+lane*193+step*101+salt);
      ranked.sort((a,b)=>score(a)-score(b)||a-b);
      const generated=Object.freeze([...anchors,...ranked.slice(0,count-anchors.length)].sort((a,b)=>a-b));
      if(rhythmCache.size>=256)rhythmCache.delete(rhythmCache.keys().next().value);
      rhythmCache.set(cacheKey,generated);return generated;
    }
    if(!track.variation||track.variation===1)return base;
    const identity=Object.keys(banks).indexOf(track.name),division=['kick','snare','clap'].includes(soundFor(track).engine)?4:1;
    const shift=Math.floor(random01(track.variation*53+identity*17)* (16/division))*division;
    return base.map(step=>(step+shift)%16).sort((a,b)=>a-b);
  }
  function randomizeTrack(track,index,seed){
    const sounds=roles.pool(track,banksFor(track.setup),true).filter(choice=>choice.sound.id!==track.sound);
    const choice=sounds[Math.floor(random01(seed*1777+index*97)*sounds.length)];
    const result={instrument:choice.instrument,sound:choice.sound.id,variation:seed,generator:3,role:roles.forTrack(track).id,sequence:roles.sequence(track.sequence)};
    ['character','duration','density','level','space'].forEach((key,i)=>{
      const values=Array.from({length:81},(_,n)=>n+20).filter(n=>n!==track[key]);
      result[key]=values[Math.floor(random01(seed*3571+index*193+i*71)*values.length)];
    });
    return result;
  }
  function arrange(tracks){const types=tracks.map(t=>t.generator===3?roles.forTrack(t).id:phrases.roleFor(t,soundFor(t))),assignments=types.map((role,i)=>({role,count:types.filter(r=>r===role).length,ordinal:types.slice(0,i).filter(r=>r===role).length}));tracks.forEach((t,i)=>{t.arrangement=assignments[i];t.ensembleGain=t.generator>=2?1/Math.sqrt(assignments[i].count):1});return assignments}
  function velocityFor(track,index,step,seed,bars=4){return track.generator===3?roles.velocity(track,soundFor(track),step,seed,bars):track.generator===2?phrases.velocity(track,soundFor(track),step,seed,bars):.67+random01(step*19+index*41+seed*11)*.15}
  function cycleLength(track,bars=4){return track.manualSteps?track.manualBars*16:track.generator===3?roles.plan(track,soundFor(track),track.variation||1,bars).period:track.generator===2?bars*16:16}
  function availableBanks(track){if(track.generator!==3)return banksFor(track.setup);return Object.fromEntries(Object.entries(banksFor(track.setup)).filter(([id,bank])=>bank.sounds.some(s=>roles.compatible(track,s))))}
  function availableSounds(track){return bankFor(track).sounds.filter(s=>track.generator!==3||roles.compatible(track,s))}
  const api = { banks, reactorBanks, banksFor, bankFor, chords, random01, soundFor, notesFor, shouldTrigger, patternFor,randomizeTrack,arrange,velocityFor,phrases,roles,cycleLength,availableBanks,availableSounds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HaloSounds = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
