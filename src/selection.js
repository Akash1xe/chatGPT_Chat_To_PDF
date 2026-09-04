'use strict';

(() => {
  const dom = window.ChatPdfDom;

  let mode = 'none';
  let rangeStart = null;
  let rangeEnd = null;
  const selected = new Map();
  let onChange = null;
  let observer = null;
  let reconcileTimer = null;

  function notify() {
    onChange?.({
      mode,
      count: selected.size,
      turns: getSelectedTurns(),
      range: getRange()
    });
  }

  function removeMarker(turn) {
    turn.querySelector(':scope > .pdf-select-marker')?.remove();
    turn.classList.remove('pdf-turn-selected', 'pdf-turn-range-start');
  }

  function clearDecorations() {
    document.querySelectorAll('.pdf-select-marker').forEach((node) => node.remove());
    document.querySelectorAll('.pdf-turn-selected, .pdf-turn-range-start').forEach((node) => {
      node.classList.remove('pdf-turn-selected', 'pdf-turn-range-start');
    });
  }

  function stopObserver() {
    if (observer) observer.disconnect();
    observer = null;
    if (reconcileTimer) clearTimeout(reconcileTimer);
    reconcileTimer = null;
  }

  function stop() {
    stopObserver();
    clearDecorations();
    selected.clear();
    mode = 'none';
    rangeStart = null;
    rangeEnd = null;
    onChange = null;
  }

  function descriptorNumber(turn, index) {
    return dom.getTurnDescriptor(turn, index).number;
  }

  function applyTurnState(turn, index) {
    const number = descriptorNumber(turn, index);
    turn.classList.toggle('pdf-turn-selected', selected.has(number));
    turn.classList.toggle('pdf-turn-range-start', rangeStart === number && rangeEnd === null);
  }

  function markerLabel() {
    if (mode === 'messages') return 'Add';
    if (rangeStart === null) return 'Start';
    if (rangeEnd === null) return 'End';
    return 'Selected';
  }

  function attachMarker(turn, index) {
    let marker = turn.querySelector(':scope > .pdf-select-marker');
    if (!marker) {
      marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'pdf-select-marker';
      marker.setAttribute('aria-label', 'Select this ChatGPT message for PDF export');
      marker.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const liveTurns = dom.getTurns();
        const liveIndex = liveTurns.indexOf(turn);
        if (liveIndex !== -1) handleTurnClick(turn, liveIndex);
      });

      const style = getComputedStyle(turn);
      if (style.position === 'static') turn.style.position = 'relative';
      turn.appendChild(marker);
    }

    marker.textContent = markerLabel();
    applyTurnState(turn, index);
  }

  function reconcileMarkers() {
    if (mode === 'none') return;
    const liveTurns = new Set(dom.getTurns());

    document.querySelectorAll('.pdf-select-marker').forEach((marker) => {
      const parent = marker.parentElement;
      if (!parent || !liveTurns.has(parent)) marker.remove();
    });

    dom.getTurns().forEach((turn, index) => attachMarker(turn, index));
  }

  function scheduleReconcile() {
    if (reconcileTimer || mode === 'none') return;
    reconcileTimer = setTimeout(() => {
      reconcileTimer = null;
      reconcileMarkers();
    }, 120);
  }

  function startObserver() {
    observer = new MutationObserver(scheduleReconcile);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function rebuildVisibleRangeSelection() {
    selected.clear();
    if (rangeStart === null || rangeEnd === null) return;

    const start = Math.min(rangeStart, rangeEnd);
    const end = Math.max(rangeStart, rangeEnd);
    dom.getTurns().forEach((candidate, candidateIndex) => {
      const item = dom.getTurnDescriptor(candidate, candidateIndex);
      if (item.number >= start && item.number <= end) {
        selected.set(item.number, item);
      }
    });
  }

  function handleTurnClick(turn, index) {
    const descriptor = dom.getTurnDescriptor(turn, index);

    if (mode === 'messages') {
      if (selected.has(descriptor.number)) selected.delete(descriptor.number);
      else selected.set(descriptor.number, descriptor);
      reconcileMarkers();
      notify();
      return;
    }

    if (mode === 'range') {
      if (rangeStart === null || rangeEnd !== null) {
        selected.clear();
        rangeStart = descriptor.number;
        rangeEnd = null;
      } else {
        rangeEnd = descriptor.number;
        rebuildVisibleRangeSelection();
      }
      reconcileMarkers();
      notify();
    }
  }

  function start(nextMode, changeHandler) {
    stop();
    mode = nextMode;
    onChange = changeHandler || null;
    reconcileMarkers();
    startObserver();
    notify();
  }

  function getSelectedTurns() {
    return Array.from(selected.values()).sort((a, b) => a.number - b.number);
  }

  function getRange() {
    if (rangeStart === null || rangeEnd === null) return null;
    return {
      start: Math.min(rangeStart, rangeEnd),
      end: Math.max(rangeStart, rangeEnd)
    };
  }

  function resolveRangeFromTurns(turns) {
    const range = getRange();
    if (!range) return [];
    return turns.filter((turn) => turn.number >= range.start && turn.number <= range.end);
  }

  function getBrowserSelectionTurns() {
    const browserSelection = window.getSelection();
    if (!browserSelection || browserSelection.isCollapsed || browserSelection.rangeCount === 0) return [];

    const range = browserSelection.getRangeAt(0);
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
    getRange,
    resolveRangeFromTurns,
    getBrowserSelectionTurns,
    reconcileMarkers,
    getMode() {
      return mode;
    }
  };
})();
