'use strict';
// Structural acceptance only. Mood, originality and sound quality require a listener.
const S = require('../../src/sounds.js');
const { definitions: keys } = require('../../src/composition.js');
const { isDeepStrictEqual: equal } = require('node:util');
const slots = ['pulse','accent','percussion','texture','bass','melody','arpeggio','harmony'];
const unwrap = value => value?.project && !value.tracks && !value.phrases ? value.project : value;
function flattenMusicalPhrases(value) {
  const p = unwrap(value);
  return p?.format === 'halo-composition' ? (p.phrases || []).map(f => ({id:f.id, project:f.project})) : p ? [{id:null,project:p}] : [];
}
function role(t) { return slots[['GLASS','TIDAL','ROOT','EMBER','RAIN','VEIL','MOSS','AURA'].indexOf(t.name)] || t.role; }
function soundInfo(t,p) {
  // Resolve actual catalog sound, never infer pitchedness from the slot alone.
  const sound = Object.values(S.banksFor(p.setup)).flatMap(b=>b.sounds).find(s=>s.id===t.sound);
  return sound ? {sound, ...S.roles.metadata(sound)} : null;
}
function events(t,p) {
  const info=soundInfo(t,p), key=keys[p.key];
  return (t.noteEvents || []).map(e=>({step:e.step,notes:e.notes.map(n=>n+(key?.offset||0)-(t.noteTranspose||0))})).map(e=>({...e,notes:t.generator===3&&info?S.roles.constrain(e.notes,info.sound,role(t)):e.notes}));
}
function melody(p) { return (p.tracks||[]).filter(t=>t.on!==false&&role(t)==='melody').flatMap(t=>events(t,p)).sort((a,b)=>a.step-b.step); }
function grams(p, contour=false) {
  const ns=melody(p).map(e=>e.notes[0]).filter(Number.isFinite), intervals=ns.slice(1).map((n,i)=>contour?Math.sign(n-ns[i]):n-ns[i]);
  return new Set(intervals.slice(0,-2).map((_,i)=>intervals.slice(i,i+3).join(',')));
}
function overlap(a,b,contour=false) { const g=grams(a,contour); return [...grams(b,contour)].some(x=>g.has(x)); }
function thematicSimilarity(a,b) {
  const ga=grams(a),gb=grams(b),shared=[...ga].filter(x=>gb.has(x)).length,union=new Set([...ga,...gb]).size;
  return {sameMelodyAndRhythm:melody(a).length>0&&equal(melody(a),melody(b)),shared,uniqueUnion:union,ratio:union?shared/union:0};
}
const sectionLayout = p => p?.sections?.map(s=>({phrase:s.phrase,repeats:s.repeats,fade:s.fade||'none'}));
function phraseSignature(p) {
  return JSON.stringify((p.tracks||[]).map(t=>({name:t.name,steps:t.steps,events:events(t,p)})));
}
function musicalSignatures(value) {return flattenMusicalPhrases(value).map(f=>({id:f.id,signature:phraseSignature(f.project),melodyMotifs:[...grams(f.project)]}));}
function evaluateStep(step,before,after,history=[]) {
  before=unwrap(before); after=unwrap(after);
  const b=flattenMusicalPhrases(before), a=flattenMusicalPhrases(after), checks=[];
  const check=(name,pass,details)=>checks.push({name,pass:!!pass,details});
  const projects=a.map(f=>f.project), active=projects.flatMap(p=>(p.tracks||[]).filter(t=>t.on!==false).map(t=>({t,p,info:soundInfo(t,p)})));
  check('authored exact events',projects.length>0&&active.length>0&&active.every(({t,info})=>info&&t.exact===true&&Array.isArray(t.steps)&&t.steps.length>0&&(!info.pitched||t.steps.every(s=>(t.noteEvents||[]).some(e=>e.step===s&&e.notes?.length)))), 'All active pitched starts must have explicit notes; no generated-music proxy.');
  const distinct=new Set(projects.map(phraseSignature)).size;
  if(Number(step)===1) {
    const p=projects[0];
    check('eight bar major loop',a.length===1&&p?.bars===8&&(p.timeSignature||'4/4')==='4/4'&&keys[p.key]?.mode==='major','Eight bars in 4/4 and a major key.');
    const m=p?melody(p):[], bars=new Set(m.filter(e=>e.notes.length).map(e=>Math.floor(e.step/16)));
    check('melody across six bars',bars.size>=6&&new Set(m.flatMap(e=>e.notes)).size>=3,'Positive starts in at least six bars and at least three melody pitches; structural proxy only.');
    check('pitched accompaniment',active.some(({t,info})=>info?.pitched&&role(t)!=='melody'&&t.noteEvents?.length),'At least one active authored pitched accompaniment.');
  } else if(Number(step)===2) {
    check('three authored phrases and sections',after?.format==='halo-composition'&&distinct>=3&&after.sections?.length>=3,'Phrase identity ignores IDs, labels and seeds.');
    const links=projects.flatMap((p,i)=>projects.slice(i+1).flatMap((q,j)=>{
      const shared=[...grams(p)].filter(g=>grams(q).has(g));
      return shared.length&&phraseSignature(p)!==phraseSignature(q)?[{from:a[i].id,to:a[i+j+1].id,sharedIntervalThreeGrams:shared}]:[];
    }));
    const phraseMetrics=projects.map((p,i)=>({id:a[i].id,melodyAttacks:melody(p).length,uniqueMelodyIntervalThreeGrams:grams(p).size,linkedByMelody:links.some(l=>l.from===a[i].id||l.to===a[i].id)}));
    check('linked thematic motif',links.length>0,'At least two musically distinct authored phrases share a melody interval three-gram. Other phrases may be introductions, endings, or bass/harmony-led passages without four melody attacks; they are not required to carry this motif. This proxy does not establish thematic unity or sound quality. Metrics: '+JSON.stringify({links,phrases:phraseMetrics}));
    check('original melody motif retained',b.length>0&&projects.some(p=>overlap(b[0].project,p)),'An interval three-gram survives from the original loop.');
  } else if(Number(step)===3) {
    check('exact half tempo',Number.isFinite(before?.tempo)&&after?.tempo===before.tempo/2,'Composition BPM must be halved exactly.');
    check('same composition references',before?.format==='halo-composition'&&after?.format==='halo-composition'&&equal(sectionLayout(before),sectionLayout(after))&&equal(b.map(f=>f.id).sort(),a.map(f=>f.id).sort()),'Preserve phrase IDs, section reference order, repeats and fades; labels and phrase-array ordering are not musical structure.');
    check('three quarter D minor',projects.length>0&&projects.every(p=>p.timeSignature==='3/4'&&p.key===0),'All phrases explicitly use 3/4 and D minor.');
    check('notes fit shortened bars',active.every(({t,p})=>(t.steps||[]).every(s=>Number.isInteger(s)&&s>=0&&s<12*p.bars)&&(t.noteEvents||[]).every(e=>e.step>=0&&e.step<12*p.bars)),'All starts fit the 12-sixteenth bar grid.');
    const dm=new Set([0,1,2,4,5,7,9,10,11]);
    const pitchedClasses=[...new Set(active.filter(x=>x.info?.pitched).flatMap(({t,p})=>events(t,p).flatMap(e=>e.notes.map(n=>((n%12)+12)%12))))].sort((x,y)=>x-y);
    check('sounding D minor pitches',pitchedClasses.every(n=>dm.has(n)),'Effective MIDI after key offset, noteTranspose and role range folding must fit the union of D natural, harmonic and melodic minor: pitch classes [0,1,2,4,5,7,9,10,11]. C# and B natural are allowed; Eb, F# and Ab are excluded. Observed classes: '+JSON.stringify(pitchedClasses)+'. This vocabulary plus the explicit D minor key label does not establish tonal center, functional harmony, or a convincing minor cadence.');
    check('authored notes changed',b.length===a.length&&a.some(f=>{const old=b.find(x=>x.id===f.id);return old&&!equal((old.project.tracks||[]).map(t=>t.noteEvents),(f.project.tracks||[]).map(t=>t.noteEvents))}),'Changing key/meter labels alone cannot pass.');
    check('related melodic contour retained',a.length===b.length&&a.every(f=>{const old=b.find(x=>x.id===f.id);return old&&overlap(old.project,f.project,true)}),'Each phrase retains a direction-of-motion three-gram, matched by phrase ID.');
  } else if(Number(step)===4) {
    const prior=flattenMusicalPhrases(unwrap(history[0]?.after||history[0]?.project||history[0]||before));
    check('new developed song',after?.format==='halo-composition'&&distinct>=3&&after.sections?.length>=3,'At least three musically distinct authored phrases and sections.');
    const comparisons=projects.flatMap((p,i)=>prior.map(f=>({phrase:a[i].id,originalPhrase:f.id,...thematicSimilarity(f.project,p)})));
    check('new thematic material',prior.length>0&&comparisons.every(c=>!c.sameMelodyAndRhythm&&c.ratio<0.6)&&projects.every(p=>prior.every(f=>phraseSignature(f.project)!==phraseSignature(p))),'Reject identical sounding melody+start sequence or Jaccard overlap >=0.6 among unique interval three-grams. Common triplets below 0.6 are allowed. Comparisons: '+JSON.stringify(comparisons)+'. This does not establish copyright originality.');
    const old=prior[0]?.project.tracks||[], now=projects[0]?.tracks||[];
    check('two timbre changes',now.filter(t=>{const prev=old.find(x=>x.name===t.name);return prev&&(prev.sound!==t.sound||prev.instrument!==t.instrument)}).length>=2,'At least two slot sound/instrument identities differ.');
    check('minor and driving rhythm proxy',projects.every(p=>keys[p.key]?.mode==='minor')&&active.some(({t,p,info})=>!info?.pitched&&t.steps.length>=p.bars*3),'Minor harmony and at least three percussion starts per bar; pirate/cinematic character requires listening.');
  } else if(Number(step)===5) {
    const expected=structuredClone(before); let disabled=0;
    for(const f of flattenMusicalPhrases(expected))for(const t of f.project.tracks||[]) {
      if(['pulse','accent','percussion','texture'].includes(role(t))&&soundInfo(t,f.project)?.pitched===false){if(t.on!==false)disabled++;t.on=false;}
    }
    check('percussion disabled without other edits',disabled>0&&equal(expected,after),'Only on=false changes for actually unpitched percussion roles are permitted; every other field and note remains identical.');
  } else check('known step',false,'Expected step 1..5.');
  return {pass:checks.every(c=>c.pass),checks,musicalReviewRequired:true};
}
module.exports={evaluateStep,flattenMusicalPhrases,musicalSignatures,phraseSignature};
