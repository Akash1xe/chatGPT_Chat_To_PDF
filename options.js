'use strict';

(async () => {
  const shared = window.ChatPdfShared;
  const fields = [
    'pdfcrowdUsername',
    'pdfcrowdApiKey',
    'pageSize',
    'orientation',
    'theme',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft'
  ];

  const options = await shared.getOptions();
  fields.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = options[id] ?? shared.defaults[id] ?? '';
  });
  document.getElementById('includeSourceLink').checked = options.includeSourceLink !== false;

  document.getElementById('save').addEventListener('click', async () => {
    const next = { ...options };
    fields.forEach((id) => {
      next[id] = document.getElementById(id).value.trim();
    });
    next.includeSourceLink = document.getElementById('includeSourceLink').checked;

    await shared.saveOptions(next);
    const status = document.getElementById('status');
    status.textContent = 'Saved';
    setTimeout(() => { status.textContent = ''; }, 1800);
  });
})();
