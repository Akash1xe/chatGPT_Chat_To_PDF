'use strict';

(() => {
  const dom = window.ChatPdfDom;

  let mode = 'none';
  let rangeStart = null;
  const selected = new Map();
  let cleanupFns = [];
  let onChange = null;

  function clearDecorations() {
    document.querySelectorAll('.pdf-select-marker').forEach((node) => node.remove());
    document.querySelectorAll('.pdf-turn-selected, .pdf-turn-range-start').forEach((node) => {
      node.classList.remove('pdf-turn-selected', 'pdf-turn-range-start');
    });
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
  }

  function stop() {
    clearDecorations();
    selected.clear();
    mode = 'none';
    rangeStart = null;
    notify();
  }

  function notify() {
    onChange?.({
      mode,
      count: selected.size,
      turns: getSelectedTurns()
    });
  }

  function attachMarker(turn, index) {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'pdf-select-marker';
    marker.textContent = mode === 'range' ? 'Select' : 'Add';
    marker.setAttribute('aria-label', 'Select this ChatGPT message for PDF export');

    const style = getComputedStyle(turn);
    if (style.position === 'static') turn.style.position = 'relative';
    turn.appendChild(marker);

    const handler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleTurnClick(turn, index);
    };

    marker.addEventListener('click', handler);
    cleanupFns.push(() => marker.removeEventListener('click', handler));
  }

  function handleTurnClick(turn, index) {
    const descriptor = dom.getTurnDescriptor(turn, index);

    if (mode === 'messages') {
      if (selected.has(descriptor.number)) {
        selected.delete(descriptor.number);
        turn.classList.remove('pdf-turn-selected');
      } else {
        selected.set(descriptor.number, descriptor);
        turn.classList.add('pdf-turn-selected');
      }
      notify();
      return;
    }

    if (mode === 'range') {
      if (rangeStart === null) {
        rangeStart = descriptor.number;
        turn.classList.add('pdf-turn-range-start');
        refreshMarkerLabels('Choose end');
        notify();
        return;
      }

      const start = Math.min(rangeStart, descriptor.number);
      const end = Math.max(rangeStart, descriptor.number);
      selected.clear();

      dom.getTurns().forEach((candidate, candidateIndex) => {
        const item = dom.getTurnDescriptor(candidate, candidateIndex);
        if (item.number >= start && item.number <= end) {
          selected.set(item.number, item);
          candidate.classList.add('pdf-turn-selected');
        }
      });

      refreshMarkerLabels('Selected');
      notify();
    }
  }

  function refreshMarkerLabels(text) {
    document.querySelectorAll('.pdf-select-marker').forEach((marker) => {
      marker.textContent = text;
    });
  }

  function start(nextMode, changeHandler) {
    stop();
    mode = nextMode;
    onChange = changeHandler || null;

    dom.getTurns().forEach((turn, index) => attachMarker(turn, index));
    notify();
  }

  function getSelectedTurns() {
    return Array.from(selected.values()).sort((a, b) => a.number - b.number);
  }

  function getBrowserSelectionTurns() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return [];

    const range = selection.getRangeAt(0);
    return dom.getTurns()
      .map((turn, index) => ({ turn, descriptor: dom.getTurnDescriptor(turn, index) }))
      .filter(({ turn }) => {
        try {
          return range.intersectsNode(turn);
        } catch (_) {
          return false;
        }
      })
      .map(({ descriptor }) => descriptor);
  }

  window.ChatPdfSelection = {
    startMessageSelection(onSelectionChange) {
      start('messages', onSelectionChange);
    },
    startRangeSelection(onSelectionChange) {
      start('range', onSelectionChange);
    },
    stop,
    getSelectedTurns,
    getBrowserSelectionTurns,
    getMode() {
      return mode;
    }
  };
})();
