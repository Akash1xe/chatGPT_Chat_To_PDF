const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const popup = fs.readFileSync('popup.js', 'utf8');
const popupHtml = fs.readFileSync('popup.html', 'utf8');
const content = fs.readFileSync('src/content.js', 'utf8');
const background = fs.readFileSync('src/background.js', 'utf8');
const shared = fs.readFileSync('src/shared.js', 'utf8');

test('manifest and runtime versions stay aligned', () => {
  assert.equal(manifest.version, '0.2.0');
  assert.match(shared, /VERSION:\s*'0\.2\.0'/);
});

test('popup diagnostics can inspect the active ChatGPT tab', () => {
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.match(popup, /chrome\.tabs\.query/);
  assert.match(popup, /CHATPDF_DIAGNOSTICS/);
  assert.match(content, /CHATPDF_DIAGNOSTICS/);
  assert.match(content, /getConversationStats\(\)/);
  for (const id of ['page-status', 'turn-count', 'completeness', 'credentials', 'refresh']) {
    assert.ok(popupHtml.includes(`id="${id}"`), `missing diagnostics element: ${id}`);
  }
});

test('PDFCrowd errors are mapped to actionable messages', () => {
  assert.match(background, /friendlyPdfCrowdError/);
  assert.match(background, /status === 401 \|\| status === 403/);
  assert.match(background, /status === 429/);
  assert.match(background, /status >= 500/);
  assert.match(background, /PDFCROWD_TIMEOUT_MS/);
  assert.match(background, /AbortController/);
  assert.match(background, /timed out after 90 seconds/);
});
