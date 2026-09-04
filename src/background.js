'use strict';

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000;

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PDF_UPLOAD_CHUNK') {
    cleanupSessions();
    let session = sessions.get(message.sessionId);
    if (!session) {
      session = {
        createdAt: Date.now(),
        total: message.total,
        chunks: new Array(message.total),
        filename: 'chatgpt-conversation.pdf'
      };
      sessions.set(message.sessionId, session);
    }
    session.chunks[message.index] = message.chunk;
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'PRINT_OPEN') {
    (async () => {
      try {
        const session = sessions.get(message.sessionId);
        if (!session) throw new Error('Conversation transfer session was not found.');
        if (session.chunks.some((chunk) => typeof chunk !== 'string')) {
          throw new Error('Conversation transfer is incomplete.');
        }
        session.filename = message.filename || session.filename;
        const url = chrome.runtime.getURL(`print.html?session=${encodeURIComponent(message.sessionId)}`);
        const tab = await chrome.tabs.create({ url });
        sendResponse({ ok: true, tabId: tab.id });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }

  if (message?.type === 'PRINT_SESSION_INFO') {
    const session = sessions.get(message.sessionId);
    if (!session) {
      sendResponse({ ok: false, error: 'Print session expired. Start the export again.' });
      return true;
    }
    sendResponse({ ok: true, total: session.total, filename: session.filename });
    return true;
  }

  if (message?.type === 'PRINT_GET_CHUNK') {
    const session = sessions.get(message.sessionId);
    const chunk = session?.chunks?.[message.index];
    if (typeof chunk !== 'string') {
      sendResponse({ ok: false, error: 'A print chunk is missing.' });
      return true;
    }
    sendResponse({ ok: true, chunk });
    return true;
  }

  if (message?.type === 'PRINT_CONSUME') {
    sessions.delete(message.sessionId);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
