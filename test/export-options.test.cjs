const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const shared = fs.readFileSync('src/shared.js', 'utf8');
const exporter = fs.readFileSync('src/export.js', 'utf8');
const background = fs.readFileSync('src/background.js', 'utf8');
const content = fs.readFileSync('src/content.js', 'utf8');
const options = fs.readFileSync('options.html', 'utf8');
const printJs = fs.readFileSync('print.js', 'utf8');

test('advanced defaults exist without external service settings', () => {
  for (const key of ['titleMode','customTitle','hideUserQuestions','questionBackground','questionForeground','questionAlign','questionRounded','pageBreakMode','tocMode','showModelName','includeExportDatetime']) {
    assert.match(shared, new RegExp(key));
  }
  assert.doesNotMatch(shared, /pdfcrowd/i);
  assert.doesNotMatch(shared, /singlePage/);
});

test('export builder supports title, TOC and user styling', () => {
  for (const token of ['buildToc','hideUserQuestions','pdf-page-break','questionBackground','questionForeground','questionAlign','showModelName','includeExportDatetime']) {
    assert.match(exporter, new RegExp(token));
  }
});

test('local print flow replaces PDFCrowd conversion', () => {
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

test('advanced controls are exposed without credentials or single-page controls', () => {
  for (const id of ['titleMode','customTitle','tocMode','pageBreakMode','hideUserQuestions','questionBackground','questionForeground','questionAlign','questionRounded','showModelName','includeExportDatetime']) {
    assert.match(options, new RegExp(`id=\\"${id}\\"`));
  }
  assert.doesNotMatch(options, /pdfcrowd/i);
  assert.doesNotMatch(options, /id=\"singlePage\"/);
});
