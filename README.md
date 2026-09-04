# ChatGPT Chat to PDF

A Chrome Manifest V3 extension that exports ChatGPT conversations to PDF **locally in Chrome**.

## Current features

- Export the full ChatGPT conversation.
- Export turns touched by the browser's text selection.
- **Choose Range**: pick a starting turn and ending turn and export everything between them.
- **Select Messages**: export only individually selected turns.
- Passive caching for ChatGPT's virtualized DOM.
- Long-chat harvesting with progress, cancellation, and incomplete-chat warnings.
- Preserves code, tables, images and canvas content where browser security rules allow it.
- Explicit placeholders for expired/inaccessible ChatGPT images.
- A4 / Letter and portrait / landscape presets.
- Light, dark or automatic transcript theme.
- Configurable margins, title modes, question styling, page breaks, TOC/numbering, model label and exported-at datetime.
- Optional source conversation link.
- Chunked content-script → service-worker transfer for large conversations.
- Runtime diagnostics popup showing ChatGPT detection, captured turns, completeness and version.
- **No PDF API, no account, no API key, and no external conversion service.**

## How PDF generation works

The extension builds a standalone printable transcript inside the browser. It then opens an extension-owned local print page and launches Chrome's native print dialog.

Choose **Save as PDF** in Chrome's print dialog.

Your ChatGPT transcript is not sent to PDFCrowd or another PDF conversion service.

> Chrome does not expose a reliable extension API for an infinitely tall single-page PDF, so the earlier Single Page option was removed instead of emulating it inaccurately.

## Install locally

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Open `https://chatgpt.com/` and refresh the page.
7. Click the extension icon to verify **ChatGPT detected**.

## Export modes

### Full conversation

Click **Save PDF**. The extension harvests the conversation, builds the transcript locally, opens a print preview tab, then opens Chrome's print dialog.

### Browser text selection

Highlight text in ChatGPT, open the export dropdown, then choose **Browser text selection**.

### Choose Range

1. Open the export dropdown.
2. Choose **Choose range**.
3. Pick the first message.
4. Pick the last message.
5. Click **Export selected**.

### Select Messages

1. Open the export dropdown.
2. Choose **Select messages**.
3. Add the messages you want.
4. Click **Export selected**.

## Runtime diagnostics

Click the extension toolbar icon while a ChatGPT tab is active. The popup reports:

- extension version
- ChatGPT content-script detection
- captured conversation-turn count
- whether the conversation may be incomplete
- PDF engine: **Local Chrome print**

## Local test checklist

1. Confirm GitHub Actions **Validate Extension** passes.
2. Reload the unpacked extension in `chrome://extensions`.
3. Refresh the ChatGPT tab.
4. Verify the popup reports **ChatGPT detected**.
5. Export a short conversation and confirm Chrome opens the print dialog.
6. Choose **Save as PDF** and verify the PDF opens correctly.
7. Test Markdown, code blocks, tables and images.
8. Test **Choose range**, including selecting end before start.
9. Test **Select messages** with non-adjacent turns.
10. Test a long conversation, progress and Cancel.
11. Test the incomplete-chat warning.
12. Test A4 portrait and landscape / Letter presets.

## Project structure

```text
.
├── manifest.json
├── popup.html
├── popup.js
├── options.html
├── options.js
├── print.html
├── print.js
├── test/
└── src/
    ├── shared.js
    ├── chatgpt-dom.js
    ├── selection-core.js
    ├── selection.js
    ├── export.js
    ├── content.js
    ├── content.css
    └── background.js
```

### Module responsibilities

- `src/chatgpt-dom.js` — ChatGPT DOM adapter, serialization, caching and long-chat harvesting.
- `src/selection.js` — individual-message and range selection.
- `src/export.js` — transcript HTML construction and chunked local print-session transfer.
- `src/content.js` — Save PDF UI and export orchestration.
- `src/background.js` — temporary in-memory print sessions and local print-tab creation.
- `print.js` — reconstructs the transcript and launches Chrome's native print dialog.
- `src/shared.js` — local options and filename utilities.

## Reference project

Behavior and UX ideas were studied from:

- https://github.com/pdfcrowd/save-chatgpt-as-pdf

The reference project is MIT-licensed. This project intentionally uses a different PDF backend: local browser printing instead of the reference service integration.

## Status

Version `0.3.0` implements the intended local-only architecture. Automated validation covers the manifest, JavaScript syntax and regression invariants. The remaining release gate is hands-on testing against the live ChatGPT UI and Chrome's print dialog.
