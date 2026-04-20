import ext from '../core/compat.js';
import { getEndpoints, getDefaultId, setDefaultId } from '../core/storage.js';
import { initThemeToggle } from '../core/theme.js';

const $ = id => document.getElementById(id);

const STATES = ['state-empty', 'state-form', 'state-sending', 'state-result'];

function show(id) {
  STATES.forEach(s => document.getElementById(s).classList.toggle('hidden', s !== id));
}

function showResult(ok, message) {
  show('state-result');
  const icon = $('result-icon');
  icon.textContent = ok ? '✓' : '✗';
  icon.className = `result-icon ${ok ? 'success' : 'error'}`;
  $('result-msg').textContent = message;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/** Runs window.getSelection() in the active tab. Returns '' on any failure. */
async function getPageSelection(tabId) {
  try {
    const [res] = await ext.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() ?? '',
    });
    return res?.result ?? '';
  } catch {
    // Restricted pages (browser internals, PDFs) do not allow scripting.
    return '';
  }
}

async function main() {
  await initThemeToggle('btn-theme');
  $('btn-options').addEventListener('click', () => ext.runtime.openOptionsPage());

  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });

  const [endpoints, defaultId, selection] = await Promise.all([
    getEndpoints(),
    getDefaultId(),
    tab ? getPageSelection(tab.id) : Promise.resolve(''),
  ]);

  if (!endpoints.length) {
    show('state-empty');
    $('btn-setup').addEventListener('click', () => ext.runtime.openOptionsPage());
    return;
  }

  // Populate endpoint dropdown, pre-selecting the default.
  const dropdown = $('sel-endpoint');
  endpoints.forEach(ep => {
    const opt = document.createElement('option');
    opt.value = ep.id;
    opt.textContent = ep.name;
    if (ep.id === defaultId) opt.selected = true;
    dropdown.appendChild(opt);
  });

  // Show a compact preview of what will be sent.
  const parts = [];
  if (tab?.url)  parts.push(truncate(tab.url, 42));
  if (selection) parts.push(`"${truncate(selection, 38)}"`);
  const preview = $('ctx-preview');
  preview.textContent = parts.join(' · ') || '(no URL)';
  preview.title = tab?.url ?? '';

  show('state-form');

  $('btn-send').addEventListener('click', async () => {
    const endpoint = endpoints.find(e => e.id === dropdown.value);
    if (!endpoint) return;

    const note = $('inp-note').value.trim();
    show('state-sending');

    // Persist the chosen endpoint as the new default.
    if (dropdown.value !== defaultId) setDefaultId(dropdown.value);

    try {
      const resp = await ext.runtime.sendMessage({
        type: 'SEND',
        endpoint,
        context: {
          url:       tab?.url   ?? '',
          title:     tab?.title ?? '',
          selection,
          note,
        },
      });
      showResult(resp.ok, resp.ok ? 'Sent successfully!' : `Error: ${resp.error ?? 'Unknown error'}`);
    } catch (err) {
      showResult(false, `Error: ${err.message}`);
    }
  });

  $('btn-again').addEventListener('click', () => show('state-form'));
}

main().catch(err => showResult(false, err.message));
