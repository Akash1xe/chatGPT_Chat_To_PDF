const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadCore() {
  const context = { window: {} };
  vm.createContext(context);
  const source = fs.readFileSync('src/selection-core.js', 'utf8');
  vm.runInContext(source, context);
  return context.window.ChatPdfSelectionCore;
}

test('normalizeRange orders reversed boundaries', () => {
  const core = loadCore();
  assert.deepEqual(
    JSON.parse(JSON.stringify(core.normalizeRange(9, 3))),
    { start: 3, end: 9 }
  );
});

test('normalizeRange rejects incomplete boundaries', () => {
  const core = loadCore();
  assert.equal(core.normalizeRange(3, null), null);
  assert.equal(core.normalizeRange(undefined, 5), null);
});

test('filterTurnsByRange includes cached turns that are not currently rendered', () => {
  const core = loadCore();
  const cachedTurns = [
    { number: 1, html: 'one' },
    { number: 2, html: 'two' },
    { number: 3, html: 'three' },
    { number: 4, html: 'four' },
    { number: 5, html: 'five' }
  ];

  const result = core.filterTurnsByRange(cachedTurns, { start: 2, end: 4 });
  assert.deepEqual(result.map((turn) => turn.number), [2, 3, 4]);
});

test('filterTurnsByRange returns turns sorted by conversation number', () => {
  const core = loadCore();
  const result = core.filterTurnsByRange(
    [{ number: 5 }, { number: 3 }, { number: 4 }],
    { start: 3, end: 5 }
  );
  assert.deepEqual(result.map((turn) => turn.number), [3, 4, 5]);
});
