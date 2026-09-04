const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const exporter = fs.readFileSync('src/export.js', 'utf8');
const dom = fs.readFileSync('src/chatgpt-dom.js', 'utf8');
const shared = fs.readFileSync('src/shared.js', 'utf8');

test('turn descriptors preserve ChatGPT author roles', () => {
  assert.match(dom, /data-message-author-role/);
  assert.match(dom, /role:\s*detectRole\(turn\)/);
  assert.match(dom, /cache\.set\(number,\s*\{\s*number,\s*key,\s*role,\s*html\s*\}\)/);
});

test('capture inlines rendered ChatGPT computed styles', () => {
  assert.match(dom, /function copyComputedStyle\(/);
  assert.match(dom, /function inlineComputedStyles\(/);
  assert.match(dom, /getComputedStyle\(source\)/);
  assert.match(dom, /computed\.getPropertyValue\(property\)/);
  assert.match(dom, /inlineComputedStyles\(turn, clone\)/);
  assert.match(dom, /getVisualContext/);
});

test('default export is snapshot fidelity rather than transcript restyling', () => {
  assert.match(shared, /fidelityMode:\s*'snapshot'/);
  assert.match(shared, /titleMode:\s*'none'/);
  assert.match(shared, /includeSourceLink:\s*false/);
  assert.match(exporter, /\$\{turn\.html\}/);
  assert.match(exporter, /print-color-adjust:exact!important/);
  assert.match(exporter, /backgroundColor/);
  assert.match(exporter, /fontFamily/);
});

test('exporter keeps only print-safety overrides for rich content', () => {
  assert.match(exporter, /\.pdf-turn img/);
  assert.match(exporter, /\.pdf-turn table/);
  assert.match(exporter, /\.pdf-turn pre/);
  assert.match(exporter, /position:static!important/);
  assert.doesNotMatch(exporter, /background:\$\{codeBg\}/);
  assert.doesNotMatch(exporter, /font-size:11\.5px/);
});

test('interactive controls are removed without deleting meaningful button text blindly', () => {
  assert.match(dom, /copy-turn-action-button/);
  assert.match(dom, /good response\|bad response/);
  assert.match(dom, /node\.replaceWith\(span\)/);
  assert.match(dom, /\.pdf-select-marker/);
});
