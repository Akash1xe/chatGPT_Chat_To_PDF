'use strict';

(() => {
  function normalizeRange(start, end) {
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return { start: Math.min(start, end), end: Math.max(start, end) };
  }

  function filterTurnsByRange(turns, range) {
    if (!range) return [];
    return (turns || [])
      .filter((turn) => Number.isFinite(turn?.number))
      .filter((turn) => turn.number >= range.start && turn.number <= range.end)
      .sort((a, b) => a.number - b.number);
  }

  window.ChatPdfSelectionCore = { normalizeRange, filterTurnsByRange };
})();
