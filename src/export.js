'use strict';

(() => {
  const shared = window.ChatPdfShared;
  const dom = window.ChatPdfDom;
  const CHUNK_SIZE = 8 * 1024 * 1024;

  function visibleTitle(options) {
    if (options.titleMode === 'none') return '';
    if (options.titleMode === 'custom') return options.customTitle?.trim() || dom.getConversationTitle();
    return options.title || dom.getConversationTitle();
  }

  function turnText(turn) {
    try {
      const doc = new DOMParser().parseFromString(turn.html || '', 'text/html');
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (_) {
      return '';
    }
  }

  function buildTurnHtml(turn, options, index, questionNumber) {
    const role = ['user', 'assistant', 'system', 'tool'].includes(turn.role) ? turn.role : 'unknown';
    if (role === 'user' && options.hideUserQuestions) return '';

    const breakClass = options.pageBreakMode === 'each-turn'
      ? ' pdf-page-break'
      : options.pageBreakMode === 'before-user' && role === 'user'
        ? ' pdf-page-break'
        : '';

    let annotation = '';
    if (role === 'user' && options.tocMode === 'numbering') {
      annotation = `<div class="pdf-export-annotation">${questionNumber}.</div>`;
    } else if (role === 'assistant' && options.showModelName) {
      annotation = `<div class="pdf-export-annotation">${escapeHtml(options.modelName || 'ChatGPT')}</div>`;
    }

    return `<section id="pdf-turn-${turn.number ?? index + 1}" class="pdf-turn pdf-turn-${role}${breakClass}" data-pdf-role="${role}">${annotation}${turn.html}</section>`;
  }

  function buildToc(turns, options) {
    if (options.tocMode === 'none' || options.hideUserQuestions) return '';
    const questions = turns.filter((turn) => turn.role === 'user');
    if (!questions.length) return '';
    const items = questions.map((turn, index) => {
      const text = turnText(turn).slice(0, 110) || `Question ${index + 1}`;
      const prefix = options.tocMode === 'numbering' ? `${index + 1}. ` : '';
      return `<li><a href="#pdf-turn-${turn.number}">${escapeHtml(prefix + text)}</a></li>`;
    }).join('');
    return `<nav class="pdf-toc"><div class="pdf-toc-title">Contents</div><ol>${items}</ol></nav>`;
  }

  function formatExportTime(options) {
    if (!options.includeExportDatetime) return '';
    const now = new Date();
    const value = options.datetimeFormat === 'iso' ? now.toISOString() : now.toLocaleString();
    return `<span>Exported ${escapeHtml(value)}</span>`;
  }

  function buildDocument(turns, options = {}) {
    const title = visibleTitle(options);
    const visual = dom.getVisualContext?.() || {};
    const background = visual.backgroundColor && visual.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? visual.backgroundColor
      : '#ffffff';
    const foreground = visual.color || '#111111';
    const fontFamily = visual.fontFamily || 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const source = options.includeSourceLink ? `<a href="${escapeHtml(location.href)}">${escapeHtml(location.href)}</a>` : '';
    const exportedAt = formatExportTime(options);
    const meta = [source, exportedAt].filter(Boolean).join('<span class="pdf-meta-separator">•</span>');

    let questionNumber = 0;
    const body = turns.map((turn, index) => {
      if (turn.role === 'user') questionNumber += 1;
      return buildTurnHtml(turn, options, index, questionNumber);
    }).join('\n');

    const toc = buildToc(turns, options);

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title || dom.getConversationTitle())}</title><style>
@page{size:${options.pageSize || 'A4'} ${options.orientation || 'portrait'};margin:${options.marginTop || '0.4in'} ${options.marginRight || '0.4in'} ${options.marginBottom || '0.4in'} ${options.marginLeft || '0.4in'}}
html,body{margin:0;padding:0;background:${background};color:${foreground};font-family:${fontFamily};-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-scheme:${escapeCss(visual.colorScheme || 'normal')}}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
.pdf-shell{width:100%;margin:0 auto;background:${background};color:${foreground}}
.pdf-snapshot-header{max-width:48rem;margin:0 auto 1.5rem;padding:0 0 1rem;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}
.pdf-snapshot-header:empty{display:none}.pdf-snapshot-header h1{font:600 1.45rem/1.3 ${fontFamily};margin:0 0 .45rem;color:inherit}.pdf-snapshot-meta{display:flex;gap:.45rem;flex-wrap:wrap;font:400 .72rem/1.4 ${fontFamily};opacity:.65}.pdf-snapshot-meta a{color:inherit;overflow-wrap:anywhere}
.pdf-toc{max-width:48rem;margin:0 auto 1.5rem;padding:1rem;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:.75rem;break-after:page}.pdf-toc-title{font-weight:600;margin-bottom:.5rem}.pdf-toc ol{margin:0;padding-left:1.4rem}.pdf-toc a{color:inherit;text-decoration:none}
.pdf-turn{display:block;width:100%;margin:0;padding:0;position:relative}.pdf-page-break{break-before:page;page-break-before:always}.pdf-turn:first-of-type.pdf-page-break{break-before:auto;page-break-before:auto}
.pdf-export-annotation{max-width:48rem;margin:.35rem auto;font:600 .72rem/1.3 ${fontFamily};opacity:.55}.pdf-image-unavailable{max-width:48rem;margin:.6rem auto;padding:.75rem 1rem;border:1px dashed currentColor;border-radius:.75rem;opacity:.7}
.pdf-turn img,.pdf-turn video,.pdf-turn canvas,.pdf-turn svg{max-width:100%!important;height:auto!important}.pdf-turn table{max-width:100%!important}.pdf-turn pre{max-width:100%!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important}.pdf-turn [style*="position: fixed"],.pdf-turn [style*="position:fixed"],.pdf-turn [style*="position: sticky"],.pdf-turn [style*="position:sticky"]{position:static!important}
@media print{html,body,.pdf-shell{background:${background}!important;color:${foreground}!important}.pdf-turn{break-inside:auto}.pdf-turn img,.pdf-turn pre,.pdf-turn table{break-inside:auto}}
</style></head><body><main class="pdf-shell"><header class="pdf-snapshot-header">${title ? `<h1>${escapeHtml(title)}</h1>` : ''}${meta ? `<div class="pdf-snapshot-meta">${meta}</div>` : ''}</header>${toc}${body}</main></body></html>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function escapeCss(value) {
    return String(value || '').replace(/[{};<>]/g, '');
  }

  async function exportTurns(turns, overrides = {}, onStatus = () => {}) {
    if (!turns.length) throw new Error('No ChatGPT messages selected.');
    const options = { ...(await shared.getOptions()), ...overrides };
    const title = visibleTitle(options) || dom.getConversationTitle();
    const html = buildDocument(turns, { ...options, title: dom.getConversationTitle() });
    const filename = `${shared.safeFileName(title)}.pdf`;
    const sessionId = `print-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    onStatus('Capturing ChatGPT appearance…');
    const chunks = [];
    for (let index = 0; index < html.length; index += CHUNK_SIZE) chunks.push(html.slice(index, index + CHUNK_SIZE));

    for (let index = 0; index < chunks.length; index += 1) {
      onStatus(`Preparing local PDF… ${index + 1}/${chunks.length}`);
      const result = await chrome.runtime.sendMessage({ type: 'PDF_UPLOAD_CHUNK', sessionId, index, total: chunks.length, chunk: chunks[index] });
      if (!result?.ok) throw new Error(result?.error || 'Could not transfer conversation data.');
    }

    onStatus('Opening print preview…');
    const response = await chrome.runtime.sendMessage({ type: 'PRINT_OPEN', sessionId, filename });
    if (!response?.ok) throw new Error(response?.error || 'Could not open the local print preview.');
    onStatus('Choose “Save as PDF” in Chrome.');
    return response;
  }

  window.ChatPdfExport = { buildDocument, buildTurnHtml, buildToc, exportTurns };
})();