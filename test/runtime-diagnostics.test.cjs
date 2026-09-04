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
  assert.equal(manifest.version, '0.4.0');
  assert.match(shared, /VERSION:\s*'0\.4\.0'/);
});

test('popup diagnostics can inspect the active ChatGPT tab', () => {
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.match(popup, /chrome\.tabs\.query/);
  assert.match(popup, /CHATPDF_DIAGNOSTICS/);
  assert.match(content, /CHATPDF_DIAGNOSTICS/);
  assert.match(content, /getConversationStats\(\)/);
  for (const id of ['page-status', 'turn-count', 'completeness', 'pdf-engine', 'refresh']) {
    assert.ok(popupHtml.includes(`id="${id}"`), `missing diagnostics element: ${id}`);
  }
});

test('manifest has no external PDF host or download dependency', () => {
  assert.ok(!manifest.permissions.includes('downloads'));
  assert.ok(!manifest.host_permissions || manifest.host_permissions.length === 0);
  assert.doesNotMatch(background, /pdfcrowd/i);
  assert.match(background, /chrome\.tabs\.create/);
});
