'use strict';

(() => {
  const shared = window.ChatPdfShared;
  const dom = window.ChatPdfDom;

  const CHUNK_SIZE = 8 * 1024 * 1024;

  function buildDocument(turns, options = {}) {
    const title = options.title || dom.getConversationTitle();
    const sourceLink = options.includeSourceLink
      ? `<p class="source-link">Source: <a href="${escapeHtml(location.href)}">${escapeHtml(location.href)}</a></p>`
      : '';
    const body = turns.map((turn) => turn.html).join('\n');
    const dark = options.theme === 'dark' ||
      (options.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  @page {
    size: ${options.pageSize || 'A4'} ${options.orientation || 'portrait'};
    margin: ${options.marginTop || '0.4in'} ${options.marginRight || '0.4in'} ${options.marginBottom || '0.4in'} ${options.marginLeft || '0.4in'};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.55;
    color: ${dark ? '#ececec' : '#1f2937'};
    background: ${dark ? '#212121' : '#ffffff'};
  }
  .pdf-shell { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; line-height: 1.25; margin: 0 0 8px; }
  .source-link { margin: 0 0 24px; font-size: 11px; color: #6b7280; word-break: break-all; }
  .source-link a { color: inherit; }
  section[data-testid^="conversation-turn"], article {
    break-inside: avoid-page;
    margin: 0 0 18px;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    padding: 12px;
    border-radius: 8px;
    background: ${dark ? '#111827' : '#f3f4f6'};
  }
  code { overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid ${dark ? '#4b5563' : '#d1d5db'}; padding: 6px 8px; vertical-align: top; }
  img, svg { max-width: 100%; height: auto; }
  a { color: ${dark ? '#93c5fd' : '#2563eb'}; }
  .pdf-select-marker { display: none !important; }
</style>
</head>
<body>
  <main class="pdf-shell">
    <h1>${escapeHtml(title)}</h1>
    ${sourceLink}
    ${body}
  </main>
</body>
</html>`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function exportTurns(turns, overrides = {}, onStatus = () => {}) {
    if (!turns.length) throw new Error('No ChatGPT messages selected.');

    const options = { ...(await shared.getOptions()), ...overrides };
    if (!options.pdfcrowdUsername || !options.pdfcrowdApiKey) {
      throw new Error('PDFCrowd credentials are missing. Open extension Options and add your username and API key.');
    }

    const title = overrides.title || dom.getConversationTitle();
    const html = buildDocument(turns, { ...options, title });
    const filename = `${shared.safeFileName(title)}.pdf`;
    const sessionId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    onStatus('Preparing conversation…');
    const chunks = [];
    for (let index = 0; index < html.length; index += CHUNK_SIZE) {
      chunks.push(html.slice(index, index + CHUNK_SIZE));
    }

    for (let index = 0; index < chunks.length; index += 1) {
      onStatus(`Preparing conversation… ${index + 1}/${chunks.length}`);
      const result = await chrome.runtime.sendMessage({
        type: 'PDF_UPLOAD_CHUNK',
        sessionId,
        index,
        total: chunks.length,
        chunk: chunks[index]
      });
      if (!result?.ok) throw new Error(result?.error || 'Could not transfer conversation data.');
    }

    onStatus('Generating PDF…');
    const response = await chrome.runtime.sendMessage({
      type: 'PDF_PROCESS',
      sessionId,
      filename,
      config: {
        username: options.pdfcrowdUsername,
        apiKey: options.pdfcrowdApiKey,
        pageSize: options.pageSize || 'a4',
        orientation: options.orientation || 'portrait'
      }
    });

    if (!response?.ok) throw new Error(response?.error || 'PDF generation failed.');
    onStatus('PDF downloaded.');
    return response;
  }

  window.ChatPdfExport = { buildDocument, exportTurns };
})();
