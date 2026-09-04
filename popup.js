'use strict';

const shared = window.ChatPdfShared;
const versionEl = document.getElementById('version');
const pageStatusEl = document.getElementById('page-status');
const turnCountEl = document.getElementById('turn-count');
const completenessEl = document.getElementById('completeness');
const guidanceEl = document.getElementById('guidance');
const statusMessageEl = document.getElementById('status-message');

function setValue(element, text, state = 'muted') {
  element.textContent = text;
  element.className = `value ${state}`;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function refreshDiagnostics() {
  statusMessageEl.textContent = 'Checking current tab…';
  setValue(versionEl, shared.VERSION, 'ok');

  let tab;
  try {
    tab = await getActiveTab();
  } catch (_) {
    setValue(pageStatusEl, 'Unavailable', 'bad');
    statusMessageEl.textContent = 'Could not inspect the current tab.';
    return;
  }

  if (!tab?.id) {
    setValue(pageStatusEl, 'No active tab', 'bad');
    statusMessageEl.textContent = 'Open a ChatGPT conversation and try again.';
    return;
  }

  try {
    const diagnostics = await chrome.tabs.sendMessage(tab.id, { type: 'CHATPDF_DIAGNOSTICS' });
    if (!diagnostics?.ok) throw new Error('No diagnostics response');

    setValue(pageStatusEl, 'ChatGPT detected', 'ok');
    setValue(turnCountEl, String(diagnostics.stats?.captured ?? 0), diagnostics.stats?.captured ? 'ok' : 'warn');

    if (diagnostics.stats?.incomplete) {
      const missing = diagnostics.stats.missing?.length || 0;
      const suffix = missing ? ` (${missing} missing)` : '';
      setValue(completenessEl, `May be incomplete${suffix}`, 'warn');
    } else {
      setValue(completenessEl, 'Looks complete', 'ok');
    }

    guidanceEl.textContent = diagnostics.stats?.captured
      ? `Conversation detected: ${diagnostics.title || 'ChatGPT conversation'}. Use Save PDF on the page; Chrome will open a local print preview.`
      : 'ChatGPT is open, but no conversation turns are currently detected. Open a conversation or refresh the tab.';
    statusMessageEl.textContent = diagnostics.harvesting ? 'Conversation harvesting is currently running.' : 'Status is up to date.';
  } catch (_) {
    setValue(pageStatusEl, 'Not detected', 'warn');
    setValue(turnCountEl, '—', 'muted');
    setValue(completenessEl, '—', 'muted');
    guidanceEl.textContent = 'Open chatgpt.com or chat.com, open a conversation, then refresh the page once after installing or reloading the extension.';
    statusMessageEl.textContent = 'The content script is not responding on this tab.';
  }
}

document.getElementById('refresh').addEventListener('click', refreshDiagnostics);
document.getElementById('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
refreshDiagnostics();
