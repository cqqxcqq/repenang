const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/sorting-game.json');
const { createSortingRound } = require('../sorting-game.js');

test('every playable item has a route, explanation and cited dataset source', () => {
  assert.match(data.sourceUrl, /^https:\/\/www\.pgc\.com\.my\//);
  for (const bag of data.bags) {
    assert.equal(new Set(bag.items).size, bag.items.length);
    for (const id of bag.items) {
      const item = data.items.find((value) => value.id === id);
      assert(item && item.condition && item.explanation && item.hint);
      assert(['recycling', 'special', 'residual'].includes(item.destination));
    }
  }
});
test('bottle requires preparation, and duplicate drops cannot increase progress', () => {
  const round = createSortingRound(data.items);
  assert.equal(round.place('bottle', 'recycling').result, 'prepare');
  assert.equal(round.sorted.size, 0);
  assert.equal(round.prepare('bottle'), true);
  assert.equal(round.place('bottle', 'recycling').result, 'sorted');
  assert.equal(round.place('bottle', 'recycling').result, 'ignore');
  assert.equal(round.sorted.size, 1);
  assert(round.retried.has('bottle'));
});
test('condition changes paper route, and every bag can be finished', () => {
  assert.notEqual(data.items.find((x) => x.id === 'paper').destination, data.items.find((x) => x.id === 'dirty-paper').destination);
  for (const bag of data.bags) {
    const items = bag.items.map((id) => data.items.find((x) => x.id === id));
    const round = createSortingRound(items);
    for (const item of items) {
      if (item.preparation) round.prepare(item.id);
      assert.equal(round.place(item.id, item.destination).result, 'sorted');
    }
    assert.equal(round.sorted.size, items.length);
    assert.equal(round.retried.size, 0);
    assert.equal(round.place('unknown', 'special').result, 'ignore');
    assert.equal(createSortingRound(items).sorted.size, 0);
  }
});
