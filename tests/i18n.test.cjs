const test=require('node:test'),assert=require('node:assert/strict');
const I=require('../src/i18n.js');
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
