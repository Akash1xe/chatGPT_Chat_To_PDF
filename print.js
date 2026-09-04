'use strict';

(async () => {
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session');
  const status = document.getElementById('print-status');

  function fail(message) {
    status.textContent = message;
    document.title = 'ChatGPT PDF export error';
  }

  if (!sessionId) {
    fail('Missing print session. Start the export again from ChatGPT.');
    return;
  }

  try {
    const info = await chrome.runtime.sendMessage({ type: 'PRINT_SESSION_INFO', sessionId });
    if (!info?.ok) throw new Error(info?.error || 'Print session unavailable.');

    const chunks = [];
    for (let index = 0; index < info.total; index += 1) {
      status.textContent = `Preparing local PDF preview… ${index + 1}/${info.total}`;
      const response = await chrome.runtime.sendMessage({ type: 'PRINT_GET_CHUNK', sessionId, index });
      if (!response?.ok) throw new Error(response?.error || `Missing print chunk ${index + 1}.`);
      chunks.push(response.chunk);
    }

    const html = chunks.join('');
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const toolbar = document.createElement('div');
    toolbar.className = 'chatpdf-print-toolbar';
    toolbar.innerHTML = '<strong>Local PDF preview</strong><span>Choose “Save as PDF” in Chrome’s print dialog.</span><button id="chatpdf-print-again" type="button">Print again</button>';

    const toolbarStyle = document.createElement('style');
    toolbarStyle.textContent = `
      .chatpdf-print-toolbar{position:sticky;top:0;z-index:2147483647;display:flex;align-items:center;gap:12px;padding:10px 14px;background:#111827;color:#fff;font:13px ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.18)}
      .chatpdf-print-toolbar span{opacity:.82;flex:1}.chatpdf-print-toolbar button{border:0;border-radius:8px;padding:7px 10px;font:inherit;font-weight:700;cursor:pointer}
      @media print{.chatpdf-print-toolbar{display:none!important}}
    `;

    document.head.innerHTML = parsed.head.innerHTML;
    document.head.appendChild(toolbarStyle);
    document.body.innerHTML = parsed.body.innerHTML;
    document.body.prepend(toolbar);
    document.title = (info.filename || 'chatgpt-conversation.pdf').replace(/\.pdf$/i, '');
    document.getElementById('chatpdf-print-again').addEventListener('click', () => window.print());

    await chrome.runtime.sendMessage({ type: 'PRINT_CONSUME', sessionId });

    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }

    await Promise.all(Array.from(document.images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2500);
      });
    }));

    setTimeout(() => window.print(), 120);
  } catch (error) {
    fail(error?.message || String(error));
  }
})();
