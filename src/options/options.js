import ext from '../core/compat.js';
import {
  getEndpoints, getDefaultId, setDefaultId,
  addEndpoint, updateEndpoint, deleteEndpoint,
} from '../core/storage.js';
import { validateEndpoint, parseHeaders, parseTags } from '../core/validate.js';
import { initThemeToggle } from '../core/theme.js';

const $ = id => document.getElementById(id);

let allEndpoints = [];
let defaultId    = null;

// ── Render ──────────────────────────────────────────────────────────────────

function renderList() {
  const list = $('endpoint-list');

  if (!allEndpoints.length) {
    list.innerHTML = '<p class="empty-msg">No endpoints yet. Click "+ Add Endpoint" to get started.</p>';
    return;
  }

  list.innerHTML = '';
  allEndpoints.forEach(ep => {
    const isDefault = ep.id === defaultId;

    const item = document.createElement('div');
    item.className = 'ep-item';
    item.innerHTML = `
      <div class="ep-info">
        <div class="ep-name">
          ${esc(ep.name)}
          ${isDefault ? '<span class="badge-default">Default</span>' : ''}
        </div>
        <div class="ep-url" title="${esc(ep.url)}">${esc(ep.url)}</div>
        ${ep.tags?.length
          ? `<div class="ep-tags">${ep.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
          : ''}
      </div>
      <div class="ep-actions">
        ${!isDefault
          ? `<button class="btn-link" data-action="default" data-id="${esc(ep.id)}">Set Default</button>`
          : ''}
        <button class="btn-link" data-action="edit" data-id="${esc(ep.id)}">Edit</button>
        <button class="btn-link danger" data-action="delete" data-id="${esc(ep.id)}">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Form open / close ────────────────────────────────────────────────────────

function openForm(ep = null) {
  $('section-form').style.display = '';
  $('form-title').textContent  = ep ? 'Edit Endpoint' : 'Add Endpoint';
  $('btn-save').textContent    = ep ? 'Save Changes'  : 'Save Endpoint';
  $('edit-id').value      = ep?.id      ?? '';
  $('inp-name').value     = ep?.name    ?? '';
  $('inp-url').value      = ep?.url     ?? '';
  $('inp-headers').value  = ep?.headers && Object.keys(ep.headers).length
    ? JSON.stringify(ep.headers, null, 2)
    : '';
  $('inp-tags').value = ep?.tags?.join(', ') ?? '';
  clearErrors();
  $('inp-name').focus();
}

function closeForm() {
  $('section-form').style.display = 'none';
  $('endpoint-form').reset();
  $('edit-id').value = '';
  clearErrors();
}

function clearErrors() {
  $('url-error').textContent     = '';
  $('headers-error').textContent = '';
  const fb = $('form-feedback');
  fb.textContent = '';
  fb.className = 'form-feedback hidden';
}

function showFeedback(msg, isError = false) {
  const fb = $('form-feedback');
  fb.textContent = msg;
  fb.className = `form-feedback ${isError ? 'error' : 'success'}`;
}

// ── Form submit ──────────────────────────────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  const headersResult = parseHeaders($('inp-headers').value);
  if (!headersResult.ok) {
    $('headers-error').textContent = headersResult.error;
    return;
  }

  const ep = {
    name:    $('inp-name').value.trim(),
    url:     $('inp-url').value.trim(),
    headers: headersResult.headers,
    tags:    parseTags($('inp-tags').value),
  };

  const check = validateEndpoint(ep);
  if (!check.valid) {
    // Route the error to the relevant field hint or the general feedback area.
    const msg = check.error;
    if (msg.toLowerCase().includes('url') || msg.toLowerCase().includes('https')) {
      $('url-error').textContent = msg;
    } else {
      showFeedback(msg, true);
    }
    return;
  }

  try {
    const editId = $('edit-id').value;
    if (editId) {
      const updated = await updateEndpoint(editId, ep);
      allEndpoints = allEndpoints.map(e => e.id === editId ? updated : e);
    } else {
      const added = await addEndpoint(ep);
      allEndpoints = [...allEndpoints, added];
      // Auto-set first endpoint as default.
      if (allEndpoints.length === 1) {
        defaultId = added.id;
        await setDefaultId(defaultId);
      }
    }
    renderList();
    closeForm();
  } catch (err) {
    showFeedback(`Save failed: ${err.message}`, true);
  }
}

// ── List actions (edit / delete / set default) ───────────────────────────────

async function handleListClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === 'edit') {
    openForm(allEndpoints.find(ep => ep.id === id));
    $('section-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (action === 'delete') {
    const ep = allEndpoints.find(ep => ep.id === id);
    if (!confirm(`Delete endpoint "${ep?.name}"? This cannot be undone.`)) return;
    await deleteEndpoint(id);
    allEndpoints = allEndpoints.filter(ep => ep.id !== id);
    if (defaultId === id) defaultId = null;
    renderList();
    return;
  }

  if (action === 'default') {
    defaultId = id;
    await setDefaultId(id);
    renderList();
    return;
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function main() {
  await initThemeToggle('btn-theme');
  [allEndpoints, defaultId] = await Promise.all([getEndpoints(), getDefaultId()]);

  // Auto-assign first endpoint as default if none set.
  if (!defaultId && allEndpoints.length) {
    defaultId = allEndpoints[0].id;
    await setDefaultId(defaultId);
  }

  renderList();

  $('btn-add').addEventListener('click', () => {
    openForm();
    $('section-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('btn-cancel').addEventListener('click', closeForm);
  $('endpoint-form').addEventListener('submit', handleSubmit);
  $('endpoint-list').addEventListener('click', handleListClick);
}

main().catch(console.error);
