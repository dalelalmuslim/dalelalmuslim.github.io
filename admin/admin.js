import { listPublicContentSections } from '../js/shared/contracts/public-content-manifest.js';

const MAX_PAYLOAD_BYTES = 1800 * 1024;
const VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SCHEMA_VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/;

const dom = Object.freeze({
  app: document.getElementById('adminApp'),
  identity: document.getElementById('adminIdentity'),
  authPanel: document.getElementById('authPanel'),
  bootStatus: document.getElementById('bootStatus'),
  workspace: document.getElementById('workspace'),
  form: document.getElementById('contentForm'),
  section: document.getElementById('sectionInput'),
  version: document.getElementById('versionInput'),
  schemaVersion: document.getElementById('schemaVersionInput'),
  notes: document.getElementById('notesInput'),
  payload: document.getElementById('payloadInput'),
  payloadMeter: document.getElementById('payloadMeter'),
  loadCurrent: document.getElementById('loadCurrentBtn'),
  previewButton: document.getElementById('previewBtn'),
  operationStatus: document.getElementById('operationStatus'),
  versionSummary: document.getElementById('versionSummary'),
  previewBox: document.getElementById('previewBox'),
  confirmPublish: document.getElementById('confirmPublishInput'),
  publishButton: document.getElementById('publishBtn')
});

const state = {
  admin: null,
  versions: null,
  preview: null,
  previewFingerprint: ''
};

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function setStatus(node, message, tone = 'info') {
  if (!node) return;
  node.hidden = false;
  node.className = `admin-status admin-status--${tone}`;
  node.textContent = message;
}

function clearStatus(node) {
  if (!node) return;
  node.hidden = true;
  node.textContent = '';
}

function bytesOf(value) {
  return new TextEncoder().encode(String(value || '')).length;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function readJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid JSON payload.'
    };
  }
}

function isObjectOrArray(value) {
  return Boolean(value) && typeof value === 'object';
}

function normalizeError(envelope, fallback) {
  const code = typeof envelope?.error?.code === 'string' ? envelope.error.code : '';
  const message = typeof envelope?.error?.message === 'string' ? envelope.error.message : fallback;
  const details = typeof envelope?.error?.details === 'string' ? envelope.error.details : '';
  return [code, message, details].filter(Boolean).join('\n');
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const envelope = text ? JSON.parse(text) : null;

  if (!response.ok || envelope?.ok !== true) {
    throw new Error(normalizeError(envelope, `Request failed with HTTP ${response.status}`));
  }

  return envelope;
}

function sectionDefinition(sectionId) {
  return listPublicContentSections().find((section) => section.id === sectionId) || null;
}

function sectionSlug(sectionId) {
  return sectionDefinition(sectionId)?.slug || sectionId.replaceAll('_', '-');
}

function sectionEndpoint(sectionId) {
  return sectionDefinition(sectionId)?.endpoint || '';
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function suggestNextVersion(sectionId) {
  const slug = sectionSlug(sectionId);
  const todayPrefix = `${slug}-${todayIsoDate()}-v`;
  const versionKey = sectionDefinition(sectionId)?.versionKey || `${sectionId}_version`;
  const currentVersion = state.versions?.[versionKey] || '';
  const currentMatch = String(currentVersion).match(/-v(\d+)$/);
  const nextNumber = currentVersion.startsWith(todayPrefix) && currentMatch
    ? Number(currentMatch[1]) + 1
    : 1;

  return `${todayPrefix}${Number.isFinite(nextNumber) && nextNumber > 0 ? nextNumber : 1}`;
}

function renderSections() {
  const fragment = document.createDocumentFragment();
  for (const section of listPublicContentSections()) {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = `${section.id} — ${section.slug}`;
    fragment.append(option);
  }
  dom.section.replaceChildren(fragment);
}

function updatePayloadMeter() {
  const bytes = bytesOf(dom.payload.value);
  const suffix = bytes > MAX_PAYLOAD_BYTES ? ' — exceeds publish limit' : '';
  setText(dom.payloadMeter, `${formatBytes(bytes)}${suffix}`);
  dom.payloadMeter.classList.toggle('admin-meter--danger', bytes > MAX_PAYLOAD_BYTES);
}

function currentFingerprint() {
  return JSON.stringify({
    section: dom.section.value,
    version: dom.version.value.trim(),
    schemaVersion: dom.schemaVersion.value.trim(),
    notes: dom.notes.value.trim(),
    payload: dom.payload.value
  });
}

function clearPreview(reason = '') {
  state.preview = null;
  state.previewFingerprint = '';
  dom.confirmPublish.checked = false;
  dom.confirmPublish.disabled = true;
  dom.publishButton.disabled = true;

  if (reason) {
    dom.previewBox.replaceChildren(createMutedParagraph(reason));
  }
}

function syncPublishState() {
  const previewMatches = Boolean(state.preview) && state.previewFingerprint === currentFingerprint();
  const canPublish = previewMatches && state.preview?.wouldPublish === true;

  dom.confirmPublish.disabled = !canPublish;
  dom.publishButton.disabled = !(canPublish && dom.confirmPublish.checked);

  if (state.preview && !previewMatches) {
    dom.publishButton.disabled = true;
    dom.confirmPublish.checked = false;
    dom.confirmPublish.disabled = true;
  }
}

function createMutedParagraph(text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'admin-muted';
  paragraph.textContent = text;
  return paragraph;
}

function createPreviewCard(title, value) {
  const card = document.createElement('article');
  card.className = 'admin-preview-card';

  const heading = document.createElement('h3');
  heading.textContent = title;

  const pre = document.createElement('pre');
  pre.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  card.append(heading, pre);
  return card;
}

function renderSummary(entries) {
  const fragment = document.createDocumentFragment();

  for (const [label, value] of entries) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = String(value ?? '');
    fragment.append(dt, dd);
  }

  dom.versionSummary.replaceChildren(fragment);
}

function renderPreview(preview) {
  const blockingReasons = Array.isArray(preview.blockingReasons) ? preview.blockingReasons : [];

  renderSummary([
    ['Section', preview.sectionId],
    ['Version', preview.version],
    ['Payload Hash', preview.payloadHash],
    ['Payload Size', formatBytes(Number(preview.payloadBytes || 0))],
    ['Would Publish', preview.wouldPublish ? 'yes' : 'no']
  ]);

  const cards = [
    createPreviewCard('Current publication', preview.currentPublication || 'No current publication found.'),
    createPreviewCard('Existing document check', preview.existingDocument || 'No duplicate section/version document found.'),
    createPreviewCard('Blocking reasons', blockingReasons.length ? blockingReasons : 'None')
  ];

  dom.previewBox.replaceChildren(...cards);

  if (preview.wouldPublish) {
    setStatus(dom.operationStatus, 'Preview صالح. راجع البيانات ثم فعّل التأكيد قبل النشر.', 'ok');
  } else {
    setStatus(dom.operationStatus, `Preview مرفوض: ${blockingReasons.join(', ') || 'Unknown reason'}`, 'warning');
  }
}

function validateForm() {
  const section = dom.section.value;
  const version = dom.version.value.trim();
  const schemaVersion = dom.schemaVersion.value.trim();
  const notes = dom.notes.value;
  const payloadText = dom.payload.value.trim();

  if (!section) return { ok: false, message: 'section is required.' };
  if (!VERSION_PATTERN.test(version)) {
    return { ok: false, message: 'version must be lowercase and use letters, numbers, dot, underscore, colon, or hyphen.' };
  }
  if (!SCHEMA_VERSION_PATTERN.test(schemaVersion)) {
    return { ok: false, message: 'schemaVersion must be a stable lowercase identifier.' };
  }
  if (notes.length > 1000) return { ok: false, message: 'notes must not exceed 1000 characters.' };
  if (!payloadText) return { ok: false, message: 'payload JSON is required.' };

  const jsonResult = readJson(payloadText);
  if (!jsonResult.ok) return { ok: false, message: `payload must be valid JSON.\n${jsonResult.message}` };
  if (!isObjectOrArray(jsonResult.value)) return { ok: false, message: 'payload must be a JSON object or array.' };

  const normalizedPayloadText = JSON.stringify(jsonResult.value);
  const payloadBytes = bytesOf(normalizedPayloadText);
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, message: `payload must not exceed ${formatBytes(MAX_PAYLOAD_BYTES)}.` };
  }

  return {
    ok: true,
    input: {
      section,
      version,
      schemaVersion,
      notes: notes.trim(),
      payload: jsonResult.value
    }
  };
}

async function loadIdentity() {
  const envelope = await requestJson('/api/admin/whoami');
  const admin = envelope?.data?.admin || null;
  state.admin = admin;
  setText(dom.identity, admin?.email || 'Authenticated admin');
  dom.authPanel.hidden = true;
  dom.workspace.hidden = false;
}

async function loadVersions() {
  const envelope = await requestJson('/api/public/versions');
  state.versions = envelope?.data?.versions || {};
  renderSummary(
    Object.entries(state.versions).map(([key, value]) => [key, value])
  );
}

async function loadCurrentPayload() {
  clearStatus(dom.operationStatus);
  const sectionId = dom.section.value;
  const endpoint = sectionEndpoint(sectionId);
  if (!endpoint) {
    setStatus(dom.operationStatus, 'Unknown section endpoint.', 'error');
    return;
  }

  dom.loadCurrent.disabled = true;
  try {
    const envelope = await requestJson(endpoint);
    dom.payload.value = JSON.stringify(envelope.data, null, 2);
    dom.version.value = suggestNextVersion(sectionId);
    updatePayloadMeter();
    clearPreview('تم تحميل المنشور الحالي. نفّذ Preview بعد تعديل المحتوى أو version.');
    setStatus(dom.operationStatus, `تم تحميل ${sectionId} من ${endpoint}.`, 'ok');
  } catch (error) {
    setStatus(dom.operationStatus, error instanceof Error ? error.message : 'Failed to load current payload.', 'error');
  } finally {
    dom.loadCurrent.disabled = false;
    syncPublishState();
  }
}

async function previewPublishRequest(event) {
  event.preventDefault();
  clearStatus(dom.operationStatus);
  clearPreview();

  const validation = validateForm();
  if (!validation.ok) {
    setStatus(dom.operationStatus, validation.message, 'error');
    return;
  }

  dom.previewButton.disabled = true;
  try {
    const envelope = await requestJson('/api/admin/public-content/preview', {
      method: 'POST',
      body: validation.input
    });
    state.preview = envelope.data;
    state.previewFingerprint = currentFingerprint();
    dom.confirmPublish.checked = false;
    renderPreview(envelope.data);
  } catch (error) {
    setStatus(dom.operationStatus, error instanceof Error ? error.message : 'Preview failed.', 'error');
  } finally {
    dom.previewButton.disabled = false;
    syncPublishState();
  }
}

async function publishRequest() {
  clearStatus(dom.operationStatus);

  if (!state.preview || state.previewFingerprint !== currentFingerprint()) {
    setStatus(dom.operationStatus, 'Form changed after Preview. Run Preview again before publishing.', 'warning');
    syncPublishState();
    return;
  }

  if (!dom.confirmPublish.checked) {
    setStatus(dom.operationStatus, 'Confirm checkbox is required before publish.', 'warning');
    return;
  }

  const validation = validateForm();
  if (!validation.ok) {
    setStatus(dom.operationStatus, validation.message, 'error');
    return;
  }

  dom.publishButton.disabled = true;
  dom.previewButton.disabled = true;

  try {
    const envelope = await requestJson('/api/admin/public-content/publish', {
      method: 'POST',
      body: validation.input
    });

    setStatus(dom.operationStatus, `تم النشر بنجاح.\nsection=${envelope.data.sectionId}\nversion=${envelope.data.version}`, 'ok');
    clearPreview('تم النشر. نفّذ Preview جديد لأي عملية نشر أخرى.');
    await loadVersions();
  } catch (error) {
    setStatus(dom.operationStatus, error instanceof Error ? error.message : 'Publish failed.', 'error');
  } finally {
    dom.previewButton.disabled = false;
    syncPublishState();
  }
}

function bindEvents() {
  dom.form.addEventListener('submit', previewPublishRequest);
  dom.loadCurrent.addEventListener('click', loadCurrentPayload);
  dom.confirmPublish.addEventListener('change', syncPublishState);
  dom.publishButton.addEventListener('click', publishRequest);

  for (const input of [dom.section, dom.version, dom.schemaVersion, dom.notes, dom.payload]) {
    input.addEventListener('input', () => {
      if (input === dom.payload) updatePayloadMeter();
      syncPublishState();
    });
    input.addEventListener('change', () => {
      if (input === dom.section && !dom.version.value.trim()) {
        dom.version.value = suggestNextVersion(dom.section.value);
      }
      syncPublishState();
    });
  }
}

async function boot() {
  renderSections();
  bindEvents();
  updatePayloadMeter();

  try {
    await loadIdentity();
    await loadVersions();
    dom.version.value = suggestNextVersion(dom.section.value);
    setStatus(dom.operationStatus, 'جاهز. ابدأ بتحميل المنشور الحالي أو ضع payload جديد ثم Preview.', 'info');
  } catch (error) {
    dom.workspace.hidden = true;
    dom.authPanel.hidden = false;
    setText(dom.identity, 'غير مصرح');
    setStatus(
      dom.bootStatus,
      error instanceof Error ? error.message : 'Admin authentication failed.',
      'error'
    );
  }
}

boot();
