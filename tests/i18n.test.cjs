const test=require('node:test'),assert=require('node:assert/strict');
const I=require('../src/i18n.js');

test('all original ensemble/family names and orbit assignment labels localize in RU and EN',()=>{
 const F=require('../src/phrases.js');
 for(const text of ['INSTRUMENT ON THIS ORBIT','Instrument on this orbit','ENSEMBLE','Legacy phrase',...Object.values(F.profiles).flat().map(p=>p[1]),...Object.values(F.catalog).flat().map(m=>m.en)]){const ru=I.translate(text,'ru');assert.notEqual(ru,text);assert.equal(I.translate(ru,'en'),text)}
});

test('master EQ and stereo controls localize in both directions',()=>{
 for(const [en,ru] of [['LOW','НИЗ'],['MID','СЕРЕДИНА'],['HIGH','ВЕРХ'],['STAGE','СЦЕНА']]){assert.equal(I.translate(en,'ru'),ru);assert.equal(I.translate(ru,'en'),en)}
 for(const text of ['Master equalizer','Equalizer settings preview','LOW · 120 Hz','MID · 1 kHz','HIGH · 6 kHz','STEREO WIDTH','Low frequencies','Mid frequencies','High frequencies','Stereo width','Invalid mix settings']){const ru=I.translate(text,'ru');assert.notEqual(ru,text);assert.equal(I.translate(ru,'en'),text)}
});
test('compact project labels support RU/EN without changing audio format names',()=>{
 for(const [en,ru] of [['PROJECT','ПРОЕКТ'],['SAVE','СОХРАНИТЬ'],['LOAD','ЗАГРУЗИТЬ']]){assert.equal(I.translate(en,'ru'),ru);assert.equal(I.translate(ru,'en'),en)}
 for(const format of ['WAV','MP3'])assert.equal(I.translate(format,'ru'),format);
});
test('all reactor patches and roles localize in both directions',()=>{
 const S=require('../src/sounds.js');for(const bank of Object.values(S.reactorBanks))for(const text of [bank.role,...bank.sounds.map(s=>s.name)]){const ru=I.translate(text,'ru');assert.notEqual(ru,text);assert.equal(I.translate(ru,'en'),text)}
 assert.equal(I.translate('Switch musical setup','ru'),'Переключить музыкальный сетап');
});
test('browser locale falls back to English and recognizes Russian variants',()=>{
 for(const value of ['ru','ru-RU','RU-ru'])assert.equal(I.detect(value),'ru');
 for(const value of [undefined,'','de-DE','en-US','russian'])assert.equal(I.detect(value),'en');
});
test('static and dynamic interface labels localize without swallowing layout spaces',()=>{
 assert.equal(I.translate(' ','ru'),' ');
 assert.equal(I.translate('   ','ru'),'   ');
 assert.equal(I.translate(' теплота, пространство','ru'),' теплота, пространство');
 assert.equal(I.translate(' с помощью ','ru'),' с помощью ');
 assert.equal(I.translate('  PULSE  ','ru'),'  ПУЛЬС  ');
 assert.equal(I.translate('Конструктор содержит ','ru'),'Конструктор содержит ');
 assert.equal(I.translate(' 30 оригинальных','ru'),' 30 оригинальных');
 assert.equal(I.translate('Switch language','ru'),'Переключить язык');
 assert.equal(I.translate('PHRASE 2 · 8 BARS · BAR 1/8 · BEAT 2/4','ru'),'ФРАЗА 2 · 8 ТАКТОВ · ТАКТ 1/8 · ДОЛЯ 2/4');
 assert.equal(I.translate('GLASS, Ringing accents, on. Tap to toggle; hold to edit.','ru'),'GLASS, Звонкие акценты, включён. Нажмите для переключения; удерживайте для правки.');
 assert.equal(I.translate('Общая громкость','en'),'Master volume');
 assert.equal(I.translate('  Master volume  ','ru'),'  Общая громкость  ');
 assert.equal(I.translate('Load failed: Invalid JSON file','ru'),'Ошибка загрузки: Некорректный файл JSON');
});

test('fixed roles and cycle controls localize in both directions',()=>{
 const R=require('../src/roles.js');
 const labels=[...R.roles.flatMap(r=>[r.label.toUpperCase(),r.label,r.description]),'COMPATIBLE SOUNDS','Compatible sound family','Transport and eight musical roles','CYCLE','STEP','OFFSET','Track cycle length, 4 to 32 steps','Track step duration','Track cycle offset','Saved steps override the cycle','Invalid track cycle','Invalid track role','Invalid phrase position','Sound is incompatible with track role'];
 for(const text of labels){const ru=I.translate(text,'ru');assert.notEqual(ru,text);assert.equal(I.translate(ru,'en'),text)}
});

test('all instrument setting hints are localized titles on labels without extra icons',()=>{
 const fs=require('node:fs'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const hints=[...html.matchAll(/<span class="setting-name" tabindex="0" title="([^"]+)">([^<]+)<\/span>/g)];
 assert.equal(hints.length,15);
 for(const [,text] of hints){const ru=I.translate(text,'ru');assert.notEqual(ru,text);assert.equal(I.translate(ru,'en'),text)}
});


test('dynamic translation scans only changed connected subtrees and full language switch still works',()=>{
 const walked=[];let onMutation;
 const label={isConnected:true,tagName:'SPAN',closest:()=>null,matches:()=>false,querySelectorAll:()=>[],contains:()=>false};
 const text={nodeValue:'Play or pause',parentElement:label};label.text=[text];
 const body={...label,text:[text],contains:n=>n===label};
 const previous={document:global.document,NodeFilter:global.NodeFilter,MutationObserver:global.MutationObserver};
 global.document={body,documentElement:{},querySelectorAll:()=>[],querySelector:()=>null,createTreeWalker(scope){walked.push(scope);let i=0;return {nextNode:()=>scope.text[i++]}}};
 global.NodeFilter={SHOW_TEXT:4};global.MutationObserver=class{constructor(fn){onMutation=fn}observe(){}disconnect(){}};
 try{const locale=I.setup('ru');assert.equal(text.nodeValue,'Воспроизвести или приостановить');walked.length=0;text.nodeValue='Master volume';onMutation([{type:'characterData',target:text}]);assert.deepEqual(walked,[label]);assert.equal(text.nodeValue,'Общая громкость');locale.set('en');assert.equal(walked.at(-1),body);assert.equal(text.nodeValue,'Master volume')}finally{Object.assign(global,previous)}
});
