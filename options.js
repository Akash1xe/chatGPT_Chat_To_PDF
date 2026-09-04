'use strict';

(async () => {
  const shared = window.ChatPdfShared;
  const valueFields = [
    'pageSize','orientation','titleMode','customTitle','pageBreakMode','tocMode',
    'datetimeFormat','marginTop','marginRight','marginBottom','marginLeft','modelName'
  ];
  const checkFields = [
    'includeSourceLink','includeExportDatetime','showModelName','hideUserQuestions'
  ];

  const options = await shared.getOptions();
  valueFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = options[id] ?? shared.defaults[id] ?? '';
  });
  checkFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(options[id]);
  });

  document.getElementById('save').addEventListener('click', async () => {
    const next = { ...options, fidelityMode: 'snapshot' };
    valueFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) next[id] = el.value.trim();
    });
    checkFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) next[id] = el.checked;
    });

    for (const legacyKey of [
      'pdfcrowdUsername','pdfcrowdApiKey','singlePage','theme',
      'questionBackground','questionForeground','questionAlign','questionRounded'
    ]) {
      delete next[legacyKey];
    }

    await shared.saveOptions(next);
    const status = document.getElementById('status');
    status.textContent = 'Saved';
    setTimeout(() => { status.textContent = ''; }, 1800);
  });
})();