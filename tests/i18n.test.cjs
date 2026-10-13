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
 assert.equal(I.translate('Switch language','ru'),'Переключить язык');
 assert.equal(I.translate('PHRASE 2 · 8 BARS · BAR 1/8 · BEAT 2/4','ru'),'ФРАЗА 2 · 8 ТАКТОВ · ТАКТ 1/8 · ДОЛЯ 2/4');
 assert.equal(I.translate('GLASS, Ringing accents, on. Tap to toggle; hold to edit.','ru'),'GLASS, Звонкие акценты, включён. Нажмите для переключения; удерживайте для правки.');
 assert.equal(I.translate('Общая громкость','en'),'Master volume');
 assert.equal(I.translate('Load failed: Invalid JSON file','ru'),'Ошибка загрузки: Некорректный файл JSON');
});

test('fixed roles and cycle controls localize in both directions',()=>{
 const R=require('../src/roles.js');
 const labels=[...R.roles.flatMap(r=>[r.label.toUpperCase(),r.label,r.description]),'COMPATIBLE SOUNDS','Compatible sound family','Transport and eight musical roles','CYCLE','STEP','OFFSET','Track cycle length, 4 to 32 steps','Track step duration','Track cycle offset','Saved steps override the cycle','Invalid track cycle','Invalid track role','Invalid phrase position','Sound is incompatible with track role'];
 for(const text of labels){const ru=I.translate(text,'ru');assert.notEqual(ru,text);assert.equal(I.translate(ru,'en'),text)}
});
