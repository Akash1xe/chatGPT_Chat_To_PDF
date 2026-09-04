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

    const baseLabel = role === 'user' ? 'You' : role === 'assistant' ? 'ChatGPT' : role === 'system' ? 'System' : role === 'tool' ? 'Tool' : 'Message';
    const label = role === 'assistant' && options.showModelName ? escapeHtml(options.modelName || 'ChatGPT') : baseLabel;
    const numbered = role === 'user' && options.tocMode === 'numbering'
      ? `<span class="pdf-question-number">${questionNumber}.</span> `
      : '';
    const breakClass = options.pageBreakMode === 'each-turn'
      ? ' pdf-page-break'
      : options.pageBreakMode === 'before-user' && role === 'user'
        ? ' pdf-page-break'
        : '';

    return `<section id="pdf-turn-${turn.number ?? index + 1}" class="pdf-turn pdf-turn-${role}${breakClass}" data-pdf-role="${role}">
      <div class="pdf-turn-label">${numbered}${label}</div>
      <div class="pdf-turn-content">${turn.html}</div>
    </section>`;
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
    return `<p class="pdf-meta">Exported: ${escapeHtml(value)}</p>`;
  }

  function buildDocument(turns, options = {}) {
    const title = visibleTitle(options);
    const sourceLink = options.includeSourceLink
      ? `<p class="source-link">Source: <a href="${escapeHtml(location.href)}">${escapeHtml(location.href)}</a></p>`
      : '';
    let questionNumber = 0;
    const body = turns.map((turn, index) => {
      if (turn.role === 'user') questionNumber += 1;
      return buildTurnHtml(turn, options, index, questionNumber);
    }).join('\n');
    const toc = buildToc(turns, options);
    const exportTime = formatExportTime(options);
    const dark = options.theme === 'dark' || (options.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const fg = dark ? '#ececec' : '#1f2937';
    const muted = dark ? '#a3a3a3' : '#6b7280';
    const pageBg = dark ? '#212121' : '#ffffff';
    const userBg = options.questionBackground || (dark ? '#2f2f2f' : '#f4f4f4');
    const userFg = options.questionForeground || fg;
    const border = dark ? '#444444' : '#e5e7eb';
    const codeBg = dark ? '#111827' : '#f7f7f8';
    const inlineCodeBg = dark ? '#343541' : '#f1f3f5';
    const quoteBg = dark ? '#2a2a2a' : '#fafafa';
    const radius = options.questionRounded ? '16px' : '0';
    const questionAlign = ['left','center','right','justify'].includes(options.questionAlign) ? options.questionAlign : 'left';

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title || dom.getConversationTitle())}</title><style>
@page { size: ${options.pageSize || 'A4'} ${options.orientation || 'portrait'}; margin: ${options.marginTop || '0.4in'} ${options.marginRight || '0.4in'} ${options.marginBottom || '0.4in'} ${options.marginLeft || '0.4in'}; }
*{box-sizing:border-box}html,body{padding:0}body{margin:0;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.6;color:${fg};background:${pageBg};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pdf-shell{width:100%;max-width:920px;margin:0 auto}.pdf-document-header{padding-bottom:16px;border-bottom:1px solid ${border};margin-bottom:22px}.pdf-document-header:empty{display:none}h1{font-size:25px;line-height:1.25;margin:0 0 8px;color:${fg}}.source-link,.pdf-meta{margin:3px 0;font-size:10.5px;color:${muted};word-break:break-all}.source-link a{color:inherit}
.pdf-toc{border:1px solid ${border};border-radius:10px;padding:12px 16px;margin:0 0 24px;break-after:page}.pdf-toc-title{font-weight:700;margin-bottom:6px}.pdf-toc ol{margin:0;padding-left:1.3rem}.pdf-toc li{margin:3px 0}.pdf-toc a{color:${fg};text-decoration:none}
.pdf-turn{margin:0 0 22px;break-inside:auto;page-break-inside:auto}.pdf-page-break{break-before:page;page-break-before:always}.pdf-turn:first-of-type.pdf-page-break{break-before:auto;page-break-before:auto}.pdf-turn-label{font-size:11px;line-height:1;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${muted};margin:0 0 7px}.pdf-question-number{font-variant-numeric:tabular-nums}.pdf-turn-content{min-width:0}.pdf-turn-user .pdf-turn-content{background:${userBg};color:${userFg};border:1px solid ${border};border-radius:${radius};padding:13px 15px;text-align:${questionAlign}}.pdf-turn-assistant .pdf-turn-content{padding:1px 0}
.pdf-turn-content>section,.pdf-turn-content>article{margin:0!important;width:100%!important;max-width:none!important}.pdf-turn-content button,.pdf-turn-content [role="button"],.pdf-turn-content [data-testid="copy-turn-action-button"],.pdf-select-marker{display:none!important}.pdf-turn-content p{margin:.45em 0 .75em}.pdf-turn-content p:first-child{margin-top:0}.pdf-turn-content p:last-child{margin-bottom:0}
.pdf-turn-content h1,.pdf-turn-content h2,.pdf-turn-content h3,.pdf-turn-content h4{break-after:avoid-page;page-break-after:avoid;line-height:1.3;margin:1.15em 0 .45em;color:inherit}.pdf-turn-content h1{font-size:21px}.pdf-turn-content h2{font-size:18px}.pdf-turn-content h3{font-size:16px}.pdf-turn-content h4{font-size:14px}.pdf-turn-content ul,.pdf-turn-content ol{padding-left:1.4rem;margin:.6em 0 .9em}.pdf-turn-content li{margin:.22em 0}.pdf-turn-content blockquote{margin:.8em 0;padding:8px 12px;border-left:3px solid ${border};background:${quoteBg}}
pre{white-space:pre-wrap!important;overflow-wrap:anywhere;word-break:normal;padding:12px 14px!important;border:1px solid ${border};border-radius:9px!important;background:${codeBg}!important;color:${fg}!important;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:11.5px;line-height:1.5;break-inside:auto;page-break-inside:auto}code{font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;overflow-wrap:anywhere}:not(pre)>code{padding:.12em .35em;border-radius:4px;background:${inlineCodeBg};font-size:.92em}.pdf-turn-content .overflow-x-auto,.pdf-turn-content [class*="overflow-x"]{overflow:visible!important}
table{width:100%!important;max-width:100%;border-collapse:collapse;table-layout:auto;margin:.9em 0;font-size:11.5px}thead{display:table-header-group}tr{break-inside:avoid-page;page-break-inside:avoid}th,td{border:1px solid ${border};padding:6px 8px;vertical-align:top;text-align:left;overflow-wrap:anywhere}th{font-weight:700;background:${dark ? '#2f2f2f' : '#f4f4f4'}}img{display:block;max-width:100%!important;height:auto!important;object-fit:contain;border-radius:8px;margin:.6em 0;break-inside:avoid-page;page-break-inside:avoid}.pdf-image-unavailable{padding:10px 12px;border:1px dashed ${border};border-radius:8px;color:${muted};font-size:12px;margin:.6em 0}svg{max-width:100%;height:auto}hr{border:0;border-top:1px solid ${border};margin:1.2em 0}a{color:${dark ? '#93c5fd' : '#2563eb'};text-decoration:none;overflow-wrap:anywhere}strong{font-weight:700}
@media print{.pdf-turn-user .pdf-turn-content,pre,blockquote,th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><main class="pdf-shell"><header class="pdf-document-header">${title ? `<h1>${escapeHtml(title)}</h1>` : ''}${sourceLink}${exportTime}</header>${toc}${body}</main></body></html>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  async function exportTurns(turns, overrides = {}, onStatus = () => {}) {
    if (!turns.length) throw new Error('No ChatGPT messages selected.');
    const options = { ...(await shared.getOptions()), ...overrides };
    const title = visibleTitle(options) || dom.getConversationTitle();
    const html = buildDocument(turns, { ...options, title: dom.getConversationTitle() });
    const filename = `${shared.safeFileName(title)}.pdf`;
    const sessionId = `print-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    onStatus('Preparing local PDF…');
    const chunks = [];
    for (let index = 0; index < html.length; index += CHUNK_SIZE) chunks.push(html.slice(index, index + CHUNK_SIZE));

    for (let index = 0; index < chunks.length; index += 1) {
      onStatus(`Preparing local PDF… ${index + 1}/${chunks.length}`);
      const result = await chrome.runtime.sendMessage({
        type: 'PDF_UPLOAD_CHUNK',
        sessionId,
        index,
        total: chunks.length,
        chunk: chunks[index]
      });
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
