'use strict';

(async () => {
  const shared = window.ChatPdfShared;
  const valueFields = [
    'pageSize','orientation','titleMode','customTitle','theme','pageBreakMode','tocMode',
    'datetimeFormat','marginTop','marginRight','marginBottom','marginLeft','modelName',
    'questionBackground','questionForeground','questionAlign'
  ];
  const checkFields = [
    'includeSourceLink','includeExportDatetime','showModelName','hideUserQuestions','questionRounded'
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
    const next = { ...options };
    valueFields.forEach((id) => { next[id] = document.getElementById(id).value.trim(); });
    checkFields.forEach((id) => { next[id] = document.getElementById(id).checked; });
    delete next.pdfcrowdUsername;
    delete next.pdfcrowdApiKey;
    delete next.singlePage;
    await shared.saveOptions(next);
    const status = document.getElementById('status');
    status.textContent = 'Saved';
    setTimeout(() => { status.textContent = ''; }, 1800);
  });
})();
