'use strict';

(() => {
  const cache = new Map();
  let cachePath = window.location.pathname;
  let captureTimer = null;
  let harvestCancelled = false;
  let harvesting = false;

  function resetIfConversationChanged() {
    if (cachePath !== window.location.pathname) {
      cache.clear();
      cachePath = window.location.pathname;
    }
  }

  function getTurns(root = document) {
    const modern = Array.from(root.querySelectorAll('section[data-testid^="conversation-turn"]'));
    if (modern.length) return modern;
    return Array.from(root.querySelectorAll('article'));
  }

  function turnNumber(turn, fallbackIndex = 0) {
    const testId = turn.getAttribute('data-testid') || '';
    const match = testId.match(/conversation-turn-(\d+)\s*$/);
    return match ? Number(match[1]) : fallbackIndex + 1;
  }

  function turnKey(turn, fallbackIndex = 0) {
    return turn.getAttribute('data-turn-id') || turn.getAttribute('data-testid') || `turn-${turnNumber(turn, fallbackIndex)}`;
  }

  function findScroller() {
    const turns = getTurns();
    if (!turns.length) return null;
    let el = turns[0].parentElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      const scrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 100;
      if (scrollable) return el;
      el = el.parentElement;
    }
    return null;
  }

  function copyComputedStyle(source, clone) {
    if (!(source instanceof Element) || !(clone instanceof Element)) return;
    const computed = getComputedStyle(source);
    const style = [];
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed[index];
      const value = computed.getPropertyValue(property);
      if (!value) continue;
      style.push(`${property}:${value}`);
    }
    clone.setAttribute('style', `${style.join(';')};animation:none!important;transition:none!important;caret-color:transparent!important;`);
  }

  function inlineComputedStyles(source, clone) {
    copyComputedStyle(source, clone);
    const sourceNodes = source.querySelectorAll('*');
    const cloneNodes = clone.querySelectorAll('*');
    const count = Math.min(sourceNodes.length, cloneNodes.length);
    for (let index = 0; index < count; index += 1) {
      copyComputedStyle(sourceNodes[index], cloneNodes[index]);
    }
  }

  function materializeCanvas(source, clone) {
    const sourceCanvases = source.querySelectorAll('canvas');
    const cloneCanvases = clone.querySelectorAll('canvas');
    sourceCanvases.forEach((canvas, index) => {
      const clonedCanvas = cloneCanvases[index];
      if (!clonedCanvas) return;
      try {
        const image = document.createElement('img');
        image.src = canvas.toDataURL('image/png');
        image.alt = 'Canvas content';
        image.setAttribute('style', clonedCanvas.getAttribute('style') || 'max-width:100%;height:auto;');
        clonedCanvas.replaceWith(image);
      } catch (_) {
        clonedCanvas.replaceWith(createUnavailableImage('Canvas content could not be captured.'));
      }
    });
  }

  function createUnavailableImage(message) {
    const placeholder = document.createElement('div');
    placeholder.className = 'pdf-image-unavailable';
    placeholder.textContent = message;
    return placeholder;
  }

  function materializeChatImages(source, clone) {
    const sourceImages = source.querySelectorAll('img');
    const cloneImages = clone.querySelectorAll('img');
    sourceImages.forEach((img, index) => {
      const clonedImg = cloneImages[index];
      if (!clonedImg) return;
      const src = img.currentSrc || img.src || '';
      if (!src.includes('chatgpt.com/backend-api/')) return;
      if (!img.complete || !img.naturalWidth) {
        clonedImg.replaceWith(createUnavailableImage('ChatGPT image is unavailable. Refresh the conversation and export again.'));
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        ctx.drawImage(img, 0, 0);
        clonedImg.src = canvas.toDataURL('image/png');
        clonedImg.removeAttribute('srcset');
      } catch (_) {
        clonedImg.replaceWith(createUnavailableImage('ChatGPT image could not be embedded. Refresh the conversation and export again.'));
      }
    });
  }

  function cleanTurnClone(clone) {
    clone.querySelectorAll('script, style, [data-testid="copy-turn-action-button"], .pdf-select-marker').forEach((node) => node.remove());
    clone.querySelectorAll('[contenteditable="true"]').forEach((node) => node.removeAttribute('contenteditable'));
    clone.querySelectorAll('button, [role="button"]').forEach((node) => {
      const text = (node.textContent || '').trim();
      if (!text || /copy|edit|retry|regenerate|good response|bad response|read aloud|share/i.test(text)) {
        node.remove();
        return;
      }
      const span = document.createElement('span');
      span.innerHTML = node.innerHTML;
      span.setAttribute('style', node.getAttribute('style') || '');
      node.replaceWith(span);
    });
    return clone;
  }

  function detectRole(turn) {
    const author = turn.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
    if (author) return author;
    return turn.getAttribute('data-message-author-role') || 'unknown';
  }

  function serializeTurn(turn) {
    const clone = turn.cloneNode(true);
    inlineComputedStyles(turn, clone);
    materializeCanvas(turn, clone);
    materializeChatImages(turn, clone);
    cleanTurnClone(clone);
    return clone.outerHTML;
  }

  function getVisualContext() {
    const root = document.querySelector('main') || document.body || document.documentElement;
    const style = getComputedStyle(root);
    const bodyStyle = getComputedStyle(document.body || root);
    return {
      backgroundColor: style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : bodyStyle.backgroundColor,
      color: style.color || bodyStyle.color,
      fontFamily: style.fontFamily || bodyStyle.fontFamily,
      fontSize: style.fontSize || bodyStyle.fontSize,
      colorScheme: getComputedStyle(document.documentElement).colorScheme || ''
    };
  }

  function captureRenderedTurns() {
    resetIfConversationChanged();
    getTurns().forEach((turn, index) => {
      if (!turn.innerHTML.trim()) return;
      const number = turnNumber(turn, index);
      const key = turnKey(turn, index);
      const html = serializeTurn(turn);
      const role = detectRole(turn);
      const previous = cache.get(number);
      if (!previous || previous.key !== key || previous.html.length < html.length) {
        cache.set(number, { number, key, role, html });
      }
    });
    return cache;
  }

  function scheduleCapture() {
    if (captureTimer) return;
    captureTimer = setTimeout(() => {
      captureTimer = null;
      captureRenderedTurns();
    }, 350);
  }

  function startCapture() {
    captureRenderedTurns();
    new MutationObserver(scheduleCapture).observe(document.body, { childList: true, subtree: true });
  }

  function countPlaceholders() {
    const turns = getTurns();
    if (!turns.length) return 0;
    const first = turns[0];
    const last = turns[turns.length - 1];
    let list = first.parentElement;
    while (list && !list.contains(last)) list = list.parentElement;
    if (!list) return 0;
    return Array.from(list.children).filter((child) => {
      const containsTurn = child.querySelector?.('section[data-testid^="conversation-turn"]');
      const empty = !child.textContent?.trim() && !containsTurn;
      return empty && child.getBoundingClientRect().height > 40;
    }).length;
  }

  function getConversationStats() {
    captureRenderedTurns();
    const known = new Set(cache.keys());
    let maxNumber = 0;
    getTurns().forEach((turn, index) => {
      const number = turnNumber(turn, index);
      maxNumber = Math.max(maxNumber, number);
      if (turn.innerHTML.trim()) known.add(number);
    });
    known.forEach((number) => { maxNumber = Math.max(maxNumber, number); });
    const missing = [];
    for (let number = 1; number <= maxNumber; number += 1) {
      if (!known.has(number)) missing.push(number);
    }
    const placeholders = countPlaceholders();
    return { captured: known.size, total: maxNumber, missing, placeholders, incomplete: missing.length > 0 || placeholders > 0 };
  }

  function cancelHarvest() { harvestCancelled = true; }

  async function harvestConversation(onProgress) {
    captureRenderedTurns();
    harvestCancelled = false;
    harvesting = true;
    const scroller = findScroller();
    if (!scroller) {
      harvesting = false;
      return getCachedTurns();
    }
    const originalScrollTop = scroller.scrollTop;
    const step = Math.max(250, Math.floor(scroller.clientHeight * 0.7));
    let stablePasses = 0;
    let lastCount = cache.size;
    try {
      scroller.scrollTop = 0;
      await wait(350);
      for (let i = 0; i < 350; i += 1) {
        if (harvestCancelled) break;
        captureRenderedTurns();
        onProgress?.(getConversationStats());
        if (cache.size === lastCount) stablePasses += 1;
        else { lastCount = cache.size; stablePasses = 0; }
        const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        if (scroller.scrollTop >= maxScroll - 2) {
          if (stablePasses >= 2) break;
          scroller.scrollTop = scroller.scrollHeight;
        } else {
          scroller.scrollTop = Math.min(maxScroll, scroller.scrollTop + step);
        }
        await wait(180);
      }
      captureRenderedTurns();
      onProgress?.(getConversationStats());
      return getCachedTurns();
    } finally {
      scroller.scrollTop = originalScrollTop;
      harvesting = false;
    }
  }

  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function getCachedTurns() { captureRenderedTurns(); return Array.from(cache.values()).sort((a, b) => a.number - b.number); }
  function getConversationTitle() {
    const title = document.title.replace(/\s*[|-]\s*ChatGPT\s*$/i, '').replace(/^ChatGPT\s*[|-]\s*/i, '').trim();
    return title || 'ChatGPT Conversation';
  }
  function getTurnDescriptor(turn, index = 0) {
    return { number: turnNumber(turn, index), key: turnKey(turn, index), role: detectRole(turn), html: serializeTurn(turn) };
  }

  window.ChatPdfDom = {
    getTurns,
    turnNumber,
    turnKey,
    serializeTurn,
    captureRenderedTurns,
    harvestConversation,
    cancelHarvest,
    getConversationStats,
    getCachedTurns,
    getConversationTitle,
    getTurnDescriptor,
    getVisualContext,
    startCapture,
    isHarvesting() { return harvesting; },
    wasHarvestCancelled() { return harvestCancelled; }
  };
})();