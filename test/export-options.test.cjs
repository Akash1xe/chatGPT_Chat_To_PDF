const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const shared = fs.readFileSync('src/shared.js', 'utf8');
const exporter = fs.readFileSync('src/export.js', 'utf8');
const background = fs.readFileSync('src/background.js', 'utf8');
const content = fs.readFileSync('src/content.js', 'utf8');
const options = fs.readFileSync('options.html', 'utf8');

test('advanced defaults exist', () => {
  for (const key of ['titleMode','customTitle','hideUserQuestions','questionBackground','questionForeground','questionAlign','questionRounded','pageBreakMode','tocMode','showModelName','includeExportDatetime','singlePage']) {
    assert.match(shared, new RegExp(key));
  }
});

test('export builder supports title, TOC and user styling', () => {
  assert.match(exporter, /buildToc/);
  assert.match(exporter, /hideUserQuestions/);
  assert.match(exporter, /pdf-page-break/);
  assert.match(exporter, /questionBackground/);
  assert.match(exporter, /questionForeground/);
  assert.match(exporter, /questionAlign/);
  assert.match(exporter, /showModelName/);
  assert.match(exporter, /includeExportDatetime/);
});

test('single page is sent to PDFCrowd using page_height -1', () => {
  assert.match(background, /page_height/);
  assert.match(background, /'-1'/);
});

test('quick format presets are exposed in ChatGPT menu', () => {
  for (const action of ['preset-a4p','preset-a4l','preset-lp','preset-ll','preset-single']) {
    assert.match(content, new RegExp(action));
  }
});

test('advanced controls are exposed in options UI', () => {
  for (const id of ['titleMode','customTitle','tocMode','pageBreakMode','hideUserQuestions','questionBackground','questionForeground','questionAlign','questionRounded','showModelName','includeExportDatetime','singlePage']) {
    assert.match(options, new RegExp(`id=\\"${id}\\"`));
  }
});
