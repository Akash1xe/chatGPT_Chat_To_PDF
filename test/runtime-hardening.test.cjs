'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const domSource = fs.readFileSync('src/chatgpt-dom.js', 'utf8');
const contentSource = fs.readFileSync('src/content.js', 'utf8');
const cssSource = fs.readFileSync('src/content.css', 'utf8');

test('conversation harvesting exposes cancellation and completeness stats', () => {
  assert.match(domSource, /function cancelHarvest\(/);
  assert.match(domSource, /function getConversationStats\(/);
  assert.match(domSource, /incomplete: missing\.length > 0 \|\| placeholders > 0/);
  assert.match(domSource, /harvestCancelled/);
});

test('runtime includes loading and incomplete-conversation workflows', () => {
  assert.match(contentSource, /chatpdf-loading-overlay/);
  assert.match(contentSource, /chatpdf-incomplete-overlay/);
  assert.match(contentSource, /Save captured part/);
  assert.match(contentSource, /dom\.cancelHarvest\(\)/);
  assert.match(contentSource, /confirmPartial\(/);
});

test('expired or inaccessible ChatGPT images get explicit placeholders', () => {
  assert.match(domSource, /ChatGPT image is unavailable/);
  assert.match(domSource, /ChatGPT image could not be embedded/);
  assert.match(domSource, /pdf-image-unavailable/);
});

test('runtime overlays have dedicated styles and hidden-state rules', () => {
  assert.match(cssSource, /#chatpdf-loading-overlay/);
  assert.match(cssSource, /#chatpdf-incomplete-overlay/);
  assert.match(cssSource, /chatpdf-spinner/);
  assert.match(cssSource, /\[hidden\] \{ display: none; \}/);
});
