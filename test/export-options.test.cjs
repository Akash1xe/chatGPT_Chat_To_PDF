const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const shared = fs.readFileSync('src/shared.js', 'utf8');
const exporter = fs.readFileSync('src/export.js', 'utf8');
const background = fs.readFileSync('src/background.js', 'utf8');
const content = fs.readFileSync('src/content.js', 'utf8');
const options = fs.readFileSync('options.html', 'utf8');
const optionsJs = fs.readFileSync('options.js', 'utf8');
const printJs = fs.readFileSync('print.js', 'utf8');

test('snapshot fidelity defaults exist without external service settings', () => {
  for (const key of ['fidelityMode','titleMode','customTitle','hideUserQuestions','pageBreakMode','tocMode','showModelName','includeExportDatetime']) {
    assert.match(shared, new RegExp(key));
  }
  assert.match(shared, /fidelityMode:\s*'snapshot'/);
  assert.doesNotMatch(shared, /pdfcrowd/i);
  assert.doesNotMatch(shared, /singlePage/);
  assert.doesNotMatch(shared, /questionBackground/);
});

test('export builder supports optional document structure without repainting ChatGPT', () => {
  for (const token of ['buildToc','hideUserQuestions','pdf-page-break','showModelName','includeExportDatetime']) {
    assert.match(exporter, new RegExp(token));
  }
  assert.doesNotMatch(exporter, /questionBackground/);
  assert.doesNotMatch(exporter, /questionForeground/);
});

test('local print flow remains fully local', () => {
  assert.match(exporter, /PRINT_OPEN/);
  assert.match(background, /PRINT_SESSION_INFO/);
  assert.match(background, /PRINT_GET_CHUNK/);
  assert.match(printJs, /window\.print\(\)/);
  assert.match(printJs, /Save as PDF/);
  assert.doesNotMatch(background, /pdfcrowd/i);
});

test('quick format presets remain available without unsupported single-page mode', () => {
  for (const action of ['preset-a4p','preset-a4l','preset-lp','preset-ll']) {
    assert.match(content, new RegExp(action));
  }
  assert.doesNotMatch(content, /preset-single/);
});

test('options explain and preserve native ChatGPT appearance', () => {
  for (const id of ['titleMode','customTitle','tocMode','pageBreakMode','hideUserQuestions','showModelName','includeExportDatetime']) {
    assert.match(options, new RegExp(`id=\\"${id}\\"`));
  }
  assert.match(options, /Snapshot fidelity is enabled/);
  assert.doesNotMatch(options, /id=\"theme\"/);
  assert.doesNotMatch(options, /questionBackground/);
  assert.doesNotMatch(options, /questionForeground/);
  assert.match(optionsJs, /fidelityMode:\s*'snapshot'/);
  assert.doesNotMatch(options, /pdfcrowd/i);
});
