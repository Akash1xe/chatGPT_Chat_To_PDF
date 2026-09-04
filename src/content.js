'use strict';

(() => {
  const dom = window.ChatPdfDom;
  const selection = window.ChatPdfSelection;
  const exporter = window.ChatPdfExport;
  let toastTimer = null;
  let exporting = false;
  let partialResolver = null;

  function createUi() {
    if (document.getElementById('chatpdf-root')) return;
    const root = document.createElement('div');
    root.id = 'chatpdf-root';
    root.innerHTML = `
      <div class="chatpdf-actions">
        <button id="chatpdf-save" class="chatpdf-button chatpdf-primary" type="button">Save PDF</button>
        <button id="chatpdf-menu-toggle" class="chatpdf-button" type="button" aria-label="Open PDF export menu">▾</button>
        <div id="chatpdf-menu" class="chatpdf-menu" hidden>
          <button data-action="full" type="button">Full conversation<small>Load and export the whole chat</small></button>
          <button data-action="browser-selection" type="button">Browser text selection<small>Export turns touched by highlighted text</small></button>
          <hr>
          <button data-action="range" type="button">Choose range<small>Pick a start message and an end message</small></button>
          <button data-action="messages" type="button">Select messages<small>Pick individual ChatGPT turns</small></button>
          <hr>
          <button data-action="preset-a4p" type="button">A4 Portrait</button>
          <button data-action="preset-a4l" type="button">A4 Landscape</button>
          <button data-action="preset-lp" type="button">Letter Portrait</button>
          <button data-action="preset-ll" type="button">Letter Landscape</button>
          <button data-action="preset-single" type="button">Single Page</button>
          <hr>
          <button data-action="options" type="button">Options</button>
        </div>
      </div>`;

    const selectionBar = document.createElement('div');
    selectionBar.id = 'chatpdf-selection-bar';
    selectionBar.hidden = true;
    selectionBar.innerHTML = `<span id="chatpdf-selection-status">Select messages for PDF</span><button id="chatpdf-selection-export" class="chatpdf-button chatpdf-primary" type="button">Export selected</button><button id="chatpdf-selection-cancel" class="chatpdf-button" type="button">Cancel</button>`;

    const loading = document.createElement('div');
    loading.id = 'chatpdf-loading-overlay';
    loading.hidden = true;
    loading.innerHTML = `
      <div class="chatpdf-dialog chatpdf-loading-dialog">
        <div class="chatpdf-spinner" aria-hidden="true"></div>
        <strong>Loading conversation…</strong>
        <span id="chatpdf-loading-progress">Preparing messages</span>
        <button id="chatpdf-loading-cancel" class="chatpdf-button" type="button">Cancel</button>
      </div>`;

    const incomplete = document.createElement('div');
    incomplete.id = 'chatpdf-incomplete-overlay';
    incomplete.hidden = true;
    incomplete.innerHTML = `
      <div class="chatpdf-dialog">
        <h2>Conversation may be incomplete</h2>
        <p id="chatpdf-incomplete-message"></p>
        <p>Some older messages are still not available. You can export the captured part now or cancel and scroll through the conversation before trying again.</p>
        <div class="chatpdf-dialog-actions">
          <button id="chatpdf-save-partial" class="chatpdf-button chatpdf-primary" type="button">Save captured part</button>
          <button id="chatpdf-partial-cancel" class="chatpdf-button" type="button">Cancel</button>
        </div>
      </div>`;

    const toast = document.createElement('div');
    toast.id = 'chatpdf-toast';
    toast.hidden = true;

    document.body.append(root, selectionBar, loading, incomplete, toast);
    bindUi(root, selectionBar, loading, incomplete);
  }

  function bindUi(root, selectionBar, loading, incomplete) {
    const saveButton = root.querySelector('#chatpdf-save');
    const menuToggle = root.querySelector('#chatpdf-menu-toggle');
    const menu = root.querySelector('#chatpdf-menu');
    saveButton.addEventListener('click', () => exportFullConversation(saveButton));
    menuToggle.addEventListener('click', (event) => { event.stopPropagation(); menu.hidden = !menu.hidden; });

    menu.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      menu.hidden = true;
      const presetMap = {
        'preset-a4p': { pageSize: 'a4', orientation: 'portrait', singlePage: false },
        'preset-a4l': { pageSize: 'a4', orientation: 'landscape', singlePage: false },
        'preset-lp': { pageSize: 'letter', orientation: 'portrait', singlePage: false },
        'preset-ll': { pageSize: 'letter', orientation: 'landscape', singlePage: false },
        'preset-single': { singlePage: true }
      };
      if (presetMap[button.dataset.action]) {
        await exportFullConversation(saveButton, presetMap[button.dataset.action]);
        return;
      }
      switch (button.dataset.action) {
        case 'full': await exportFullConversation(saveButton); break;
        case 'browser-selection': await exportBrowserSelection(saveButton); break;
        case 'range': startSelectionMode('range', selectionBar); break;
        case 'messages': startSelectionMode('messages', selectionBar); break;
        case 'options': chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }); break;
      }
    });

    document.addEventListener('click', (event) => { if (!root.contains(event.target)) menu.hidden = true; });
    loading.querySelector('#chatpdf-loading-cancel').addEventListener('click', () => dom.cancelHarvest());
    incomplete.querySelector('#chatpdf-save-partial').addEventListener('click', () => resolvePartial(true));
    incomplete.querySelector('#chatpdf-partial-cancel').addEventListener('click', () => resolvePartial(false));

    selectionBar.querySelector('#chatpdf-selection-export').addEventListener('click', async () => {
      try {
        let turns;
        if (selection.getMode() === 'range') {
          const range = selection.getRange();
          if (!range) { showToast('Choose both the start and end message first.', true); return; }
          setBusy(saveButton, true, 'Loading range…');
          const allTurns = await harvestForExport();
          if (!allTurns) return;
          turns = selection.resolveRangeFromTurns(allTurns);
          const expected = range.end - range.start + 1;
          if (turns.length < expected) {
            const proceed = await confirmPartial({
              captured: turns.length,
              total: expected,
              missing: [],
              placeholders: 0
            }, 'The selected range could not be captured completely.');
            if (!proceed) return;
          }
        } else {
          turns = selection.getSelectedTurns();
        }
        if (!turns.length) { showToast('No messages were found for this selection.', true); return; }
        await runExport(turns, saveButton, {}, true);
        selection.stop();
        selectionBar.hidden = true;
      } catch (error) {
        showToast(error.message || String(error), true, 7000);
      } finally {
        setBusy(saveButton, false, 'Save PDF');
      }
    });

    selectionBar.querySelector('#chatpdf-selection-cancel').addEventListener('click', () => {
      selection.stop();
      selectionBar.hidden = true;
    });
  }

  function startSelectionMode(mode, selectionBar) {
    const status = selectionBar.querySelector('#chatpdf-selection-status');
    selectionBar.hidden = false;
    const onChange = ({ count, range }) => {
      status.textContent = mode === 'range'
        ? (range ? `Messages ${range.start}–${range.end} selected` : 'Choose the first message, then choose the last')
        : (count ? `${count} message${count === 1 ? '' : 's'} selected` : 'Choose individual messages to include');
    };
    if (mode === 'range') selection.startRangeSelection(onChange);
    else selection.startMessageSelection(onChange);
  }

  async function harvestForExport() {
    const overlay = document.getElementById('chatpdf-loading-overlay');
    const progress = document.getElementById('chatpdf-loading-progress');
    overlay.hidden = false;
    try {
      const turns = await dom.harvestConversation((stats) => {
        const total = stats.total || '?';
        progress.textContent = `${stats.captured} / ${total} messages captured`;
      });
      if (dom.wasHarvestCancelled()) {
        showToast('Conversation loading cancelled.');
        return null;
      }
      return turns;
    } finally {
      overlay.hidden = true;
    }
  }

  async function exportFullConversation(button, overrides = {}) {
    if (exporting || dom.isHarvesting()) return;
    try {
      setBusy(button, true, 'Loading chat…');
      const turns = await harvestForExport();
      if (!turns) return;
      const stats = dom.getConversationStats();
      if (stats.incomplete) {
        const proceed = await confirmPartial(stats);
        if (!proceed) return;
      }
      await runExport(turns, button, overrides, true);
    } catch (error) {
      showToast(error.message || String(error), true);
    } finally {
      setBusy(button, false, 'Save PDF');
    }
  }

  function confirmPartial(stats, prefix = '') {
    const overlay = document.getElementById('chatpdf-incomplete-overlay');
    const message = document.getElementById('chatpdf-incomplete-message');
    const missingCount = stats.missing?.length || Math.max(0, (stats.total || 0) - (stats.captured || 0));
    message.textContent = `${prefix ? `${prefix} ` : ''}${stats.captured} messages were captured${stats.total ? ` out of ${stats.total}` : ''}.${missingCount ? ` ${missingCount} numbered message${missingCount === 1 ? '' : 's'} appear to be missing.` : ''}`;
    overlay.hidden = false;
    return new Promise((resolve) => { partialResolver = resolve; });
  }

  function resolvePartial(value) {
    const overlay = document.getElementById('chatpdf-incomplete-overlay');
    overlay.hidden = true;
    const resolve = partialResolver;
    partialResolver = null;
    resolve?.(value);
  }

  async function exportBrowserSelection(button) {
    const turns = selection.getBrowserSelectionTurns();
    if (!turns.length) {
      showToast('Highlight some text in the chat first, then choose Browser text selection.', true);
      return;
    }
    await runExport(turns, button);
  }

  async function runExport(turns, button, overrides = {}, keepBusy = false) {
    if (exporting && !keepBusy) return;
    exporting = true;
    try {
      if (!keepBusy) setBusy(button, true, 'Preparing…');
      await exporter.exportTurns(turns, overrides, (status) => {
        setBusy(button, true, status.includes('Generating') ? 'Generating…' : 'Preparing…');
        showToast(status, false, 1400);
      });
      showToast('PDF download started.');
    } catch (error) {
      showToast(error.message || String(error), true, 7000);
      if ((error.message || '').includes('credentials')) chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      throw error;
    } finally {
      exporting = false;
      if (!keepBusy) setBusy(button, false, 'Save PDF');
    }
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = label;
  }

  function showToast(message, isError = false, duration = 3200) {
    const toast = document.getElementById('chatpdf-toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('chatpdf-error', isError);
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'CHATPDF_DIAGNOSTICS') return false;
    const stats = dom.getConversationStats();
    sendResponse({
      ok: true,
      title: dom.getConversationTitle(),
      stats,
      harvesting: dom.isHarvesting(),
      selectionMode: selection.getMode(),
      host: location.host
    });
    return false;
  });

  function boot() {
    createUi();
    dom.startCapture();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
