'use strict';

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000;

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

async function compressHtml(html) {
  if (typeof CompressionStream === 'undefined') {
    return { blob: new Blob([html], { type: 'text/html' }), filename: 'index.html' };
  }
  try {
    const stream = new Blob([new TextEncoder().encode(html)]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return { blob: new Blob([buffer], { type: 'application/gzip' }), filename: 'index.html.gz' };
  } catch (_) {
    return { blob: new Blob([html], { type: 'text/html' }), filename: 'index.html' };
  }
}

async function convertWithPdfCrowd(html, config) {
  const file = await compressHtml(html);
  const formData = new FormData();
  formData.append('file', file.blob, file.filename);
  if (config.singlePage) {
    formData.append('page_height', '-1');
  } else {
    formData.append('page_size', config.pageSize || 'a4');
    formData.append('orientation', config.orientation || 'portrait');
  }

  const auth = btoa(`${config.username}:${config.apiKey}`);
  const response = await fetch('https://api.pdfcrowd.com/convert/24.04/', {
    method: 'POST', headers: { Authorization: `Basic ${auth}` }, body: formData
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `PDFCrowd request failed (${response.status}).`);
  }
  return response.blob();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read generated PDF.'));
    reader.readAsDataURL(blob);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PDF_UPLOAD_CHUNK') {
    cleanupSessions();
    let session = sessions.get(message.sessionId);
    if (!session) {
      session = { createdAt: Date.now(), total: message.total, chunks: new Array(message.total) };
      sessions.set(message.sessionId, session);
    }
    session.chunks[message.index] = message.chunk;
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'PDF_PROCESS') {
    (async () => {
      try {
        const session = sessions.get(message.sessionId);
        if (!session) throw new Error('Conversation transfer session was not found.');
        if (session.chunks.some((chunk) => typeof chunk !== 'string')) throw new Error('Conversation transfer is incomplete.');
        const html = session.chunks.join('');
        sessions.delete(message.sessionId);
        const pdfBlob = await convertWithPdfCrowd(html, message.config || {});
        const dataUrl = await blobToDataUrl(pdfBlob);
        const downloadId = await chrome.downloads.download({ url: dataUrl, filename: message.filename || 'chatgpt-conversation.pdf', saveAs: true });
        sendResponse({ ok: true, downloadId });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }

  if (message?.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
