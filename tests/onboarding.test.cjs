const test = require('node:test');
const assert = require('node:assert/strict');
const {createProgress, KEY, ids} = require('../src/onboarding.js');

function memory() {
  const values = new Map();
  return () => ({
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value)
  });
}

test('first-track progress skips completed actions even when performed out of order', () => {
  const storage = memory();
  const tour = createProgress(storage);
  assert.equal(tour.status(), 'unseen');
  assert.equal(tour.mark('meter'), false);
  tour.start();
  assert.equal(tour.next(), 'generate');
  assert.equal(tour.mark('meter'), true);
  assert.equal(tour.mark('generate'), true);
  assert.equal(tour.mark('meter'), false);
  assert.equal(tour.mark('unrecognized'), false);
  const resumed = createProgress(storage);
  assert.equal(resumed.status(), 'active');
  assert.equal(resumed.next(), 'tempo');
});

test('exiting or completing the tour persists dismissal and Guide can restart', () => {
  const storage = memory();
  const tour = createProgress(storage);
  tour.close();
  const reopened = createProgress(storage);
  assert.equal(reopened.status(), 'closed');
  reopened.start();
  for (const id of ids) {
    assert.equal(reopened.next(), id);
    assert.equal(reopened.mark(id), true);
  }
  assert.equal(reopened.status(), 'closed');
  assert.equal(createProgress(storage).status(), 'closed');
  reopened.start();
  assert.equal(reopened.next(), 'generate');
});

test('tour handles malformed saved progress and inaccessible browser storage', () => {
  const storage = memory();
  storage().setItem(KEY, JSON.stringify({status:'active', visited:['generate','generate','unknown']}));
  assert.equal(createProgress(storage).next(), 'meter');
  storage().setItem(KEY, '{broken');
  assert.equal(createProgress(storage).status(), 'unseen');
  const ephemeral = createProgress(() => { throw Error('storage blocked'); });
  ephemeral.start();
  assert.equal(ephemeral.mark('generate'), true);
  assert.equal(ephemeral.next(), 'meter');
});
