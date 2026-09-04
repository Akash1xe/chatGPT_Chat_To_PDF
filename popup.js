'use strict';

document.getElementById('options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
