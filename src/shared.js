'use strict';

window.ChatPdfShared = {
  VERSION: '0.1.0',
  TURN_SELECTOR: 'section[data-testid^="conversation-turn"], article',
  defaults: {
    exportMode: 'full',
    pageSize: 'a4',
    orientation: 'portrait',
    titleMode: 'conversation',
    includeSourceLink: true,
    theme: 'auto',
    marginTop: '0.4in',
    marginRight: '0.4in',
    marginBottom: '0.4in',
    marginLeft: '0.4in',
    pdfcrowdUsername: '',
    pdfcrowdApiKey: ''
  },

  async getOptions() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('options', (result) => {
        resolve({ ...this.defaults, ...(result.options || {}) });
      });
    });
  },

  async saveOptions(options) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ options }, resolve);
    });
  },

  safeFileName(value) {
    return (value || 'chatgpt-conversation')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'chatgpt-conversation';
  }
};
