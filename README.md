# ChatGPT Chat to PDF

A Chrome Manifest V3 extension that exports ChatGPT conversations to PDF.

The project is inspired by the MIT-licensed [`pdfcrowd/save-chatgpt-as-pdf`](https://github.com/pdfcrowd/save-chatgpt-as-pdf) project, but is being rebuilt with a cleaner modular structure and an expanded selection workflow.

## Current features

- Export the full ChatGPT conversation.
- Export the turns touched by the browser's text selection.
- **Choose Range**: pick a starting ChatGPT turn and an ending turn and export everything between them.
- **Select Messages**: pick individual turns and export only those.
- Passive conversation-turn caching for ChatGPT's virtualized DOM.
- Scroll-based harvesting when exporting a full long conversation.
- Preserves code, tables, images and canvas content where browser security rules allow it.
- A4 / Letter and portrait / landscape options.
- Light, dark or automatic PDF theme.
- Configurable page margins.
- Optional source conversation link.
- Chunked content-script → service-worker transfer for large conversations.
- Gzip compression before sending HTML to PDFCrowd when `CompressionStream` is available.

## Important: PDFCrowd credentials

This repository intentionally **does not copy the reference project's embedded PDFCrowd credentials**.

To generate PDFs you must use credentials from your own PDFCrowd account:

1. Install the unpacked extension.
2. Open the extension's **Options** page.
3. Enter your PDFCrowd username and API key.
4. Open ChatGPT and use **Save PDF**.

Credentials are stored using `chrome.storage.sync`; they are not committed to the repository.

## Install locally

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Open `https://chatgpt.com/` and refresh the page.

## Export modes

### Full conversation

The extension captures rendered ChatGPT turns and attempts to harvest older virtualized turns by walking the chat scroll container before generating the PDF.

### Browser text selection

Highlight text normally in ChatGPT, open the extension's export menu, then choose **Browser text selection**. All conversation turns intersecting that selection are exported.

### Choose Range

1. Open the export menu.
2. Choose **Choose range**.
3. Click **Select** on the first message.
4. Click the ending message.
5. Click **Export selected**.

### Select Messages

1. Open the export menu.
2. Choose **Select messages**.
3. Use **Add** on each message you want.
4. Click **Export selected**.

## Project structure

```text
.
├── manifest.json
├── popup.html
├── popup.js
├── options.html
├── options.js
└── src/
    ├── shared.js
    ├── chatgpt-dom.js
    ├── selection.js
    ├── export.js
    ├── content.js
    ├── content.css
    └── background.js
```

### Module responsibilities

- `src/chatgpt-dom.js` — ChatGPT DOM adapter, turn serialization, caching, long-chat harvesting.
- `src/selection.js` — individual-message and continuous-range selection.
- `src/export.js` — standalone HTML construction and chunked export requests.
- `src/content.js` — injected Save PDF UI and workflow orchestration.
- `src/background.js` — HTML reconstruction, compression, PDFCrowd request and browser download.
- `src/shared.js` — shared defaults, option storage and filename utilities.

## Reference project

Behavior and architecture were studied from:

- https://github.com/pdfcrowd/save-chatgpt-as-pdf

That project is distributed under the MIT License. This repository does not intentionally copy its private/service credentials.

## Status

`v0.1.0` is the first implementation milestone. The next validation step is to load it unpacked in Chrome against current ChatGPT UI variants and harden selectors/virtualized-chat harvesting based on real browser testing.
