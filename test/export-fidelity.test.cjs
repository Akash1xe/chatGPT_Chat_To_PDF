const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const exporter = fs.readFileSync('src/export.js', 'utf8');
const dom = fs.readFileSync('src/chatgpt-dom.js', 'utf8');

test('turn descriptors preserve ChatGPT author roles', () => {
  assert.match(dom, /data-message-author-role/);
  assert.match(dom, /role:\s*detectRole\(turn\)/);
  assert.match(dom, /cache\.set\(number,\s*\{\s*number,\s*key,\s*role,\s*html\s*\}\)/);
});

test('exporter wraps messages with stable role-specific print classes', () => {
  assert.match(exporter, /pdf-turn-user/);
  assert.match(exporter, /pdf-turn-assistant/);
  assert.match(exporter, /pdf-turn-label/);
  assert.match(exporter, /data-pdf-role/);
});

test('PDF stylesheet covers rich ChatGPT content', () => {
  for (const pattern of [
    /pre\s*\{/,
    /:not\(pre\)>?\s*code/,
    /table\s*\{/,
    /thead\s*\{[^}]*table-header-group/,
    /blockquote\s*\{/,
    /img\s*\{/,
    /print-color-adjust:exact/
  ]) {
    assert.match(exporter, pattern);
  }
});

test('interactive ChatGPT controls are suppressed in exported content', () => {
  assert.match(exporter, /\[role="button"\]/);
  assert.match(dom, /copy-turn-action-button/);
  assert.match(dom, /\.pdf-select-marker/);
});
