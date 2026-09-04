# ChatGPT Chat to PDF

A Chrome Manifest V3 extension that exports ChatGPT conversations to PDF.

The project is inspired by the MIT-licensed [`pdfcrowd/save-chatgpt-as-pdf`](https://github.com/pdfcrowd/save-chatgpt-as-pdf) project, but is being rebuilt with a cleaner modular structure and an expanded selection workflow.

## Current features

- Export the full ChatGPT conversation.
- Export the turns touched by the browser's text selection.
- **Choose Range**: pick a starting ChatGPT turn and an ending turn and export everything between them.
- **Select Messages**: pick individual turns and export only those.
- Passive conversation-turn caching for ChatGPT's virtualized DOM.
- Scroll-based harvesting for long conversations with progress reporting and cancellation.
- Incomplete-conversation detection with an explicit **Save captured part** fallback.
- Preserves code, tables, images and canvas content where browser security rules allow it.
- Replaces expired/inaccessible ChatGPT images with an explanatory placeholder instead of silently losing them.
- A4 / Letter, portrait / landscape and single-page presets.
- Light, dark or automatic PDF theme.
- Configurable page margins, title modes, question styling, page breaks, TOC/numbering, model label and exported-at datetime.
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

The extension captures rendered ChatGPT turns and attempts to harvest older virtualized turns by walking the chat scroll container before generating the PDF. A loading overlay shows capture progress and can be cancelled.

If the extension still detects missing turns after harvesting, it warns before export. You can either cancel and load more of the conversation manually, or choose **Save captured part**.

### Browser text selection

Highlight text normally in ChatGPT, open the extension's export menu, then choose **Browser text selection**. All conversation turns intersecting that selection are exported.

### Choose Range

1. Open the export menu.
2. Choose **Choose range**.
3. Click **Select** on the first message.
4. Click the ending message.
5. Click **Export selected**.

For a virtualized long conversation, the extension harvests the chat before resolving the final range. If not every turn inside the selected range can be found, it asks before exporting the partial range.

### Select Messages

1. Open the export menu.
2. Choose **Select messages**.
3. Use **Add** on each message you want.
4. Click **Export selected**.

## Local release checklist

Before considering a build release-ready:

1. Open the repository's GitHub Actions page and confirm **Validate Extension** passes.
2. In `chrome://extensions`, remove any older unpacked copy, then load the repository folder again.
3. Refresh an existing ChatGPT tab after loading or updating the extension.
4. Verify the **Save PDF** button and dropdown appear on `chatgpt.com`.
5. Test a short conversation with user text, assistant Markdown, a code block and a table.
6. Test **Choose range** and select the end message before the start message once to verify reverse-range handling.
7. Test **Select messages** with non-adjacent turns.
8. Test a long conversation and verify the loading overlay, progress counter and Cancel button.
9. Test the incomplete-chat warning by exporting before all older turns are available.
10. Test A4 portrait, A4 landscape and Single Page.
11. Verify an inaccessible ChatGPT image produces an explanatory placeholder rather than an empty gap.
12. Confirm the browser download prompt appears and the generated PDF opens successfully.

## Project structure

```text
.
├── manifest.json
├── popup.html
├── popup.js
├── options.html
├── options.js
├── test/
│   ├── selection-core.test.cjs
│   ├── export-fidelity.test.cjs
│   ├── advanced-options.test.cjs
│   └── runtime-hardening.test.cjs
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

- `src/chatgpt-dom.js` — ChatGPT DOM adapter, turn serialization, caching, long-chat harvesting, completeness checks and cancellation.
- `src/selection.js` — individual-message and continuous-range selection.
- `src/export.js` — standalone HTML construction and chunked export requests.
- `src/content.js` — injected Save PDF UI, progress/incomplete dialogs and workflow orchestration.
- `src/background.js` — HTML reconstruction, compression, PDFCrowd request and browser download.
- `src/shared.js` — shared defaults, option storage and filename utilities.

## Reference project

Behavior and architecture were studied from:

- https://github.com/pdfcrowd/save-chatgpt-as-pdf

That project is distributed under the MIT License. This repository does not intentionally copy its private/service credentials.

## Status

The core clone plus the expanded range/message-selection workflow is implemented. Static validation and regression tests run in GitHub Actions. The remaining release gate is hands-on Chrome testing against current ChatGPT UI variants and real PDFCrowd credentials, because those runtime behaviors cannot be fully validated by repository-only CI.
