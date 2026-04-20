// Firefox MV3 background script — loaded via background.scripts.
// background.scripts does not support ES modules, so all shared core logic is inlined here.
// The popup and options pages still use ES modules via <script type="module">; only this file differs.

/* global browser */
const ext = (typeof browser !== 'undefined') ? browser : chrome;

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY_ENDPOINTS = 'clawclip_endpoints';
const KEY_DEFAULT   = 'clawclip_default';

async function getEndpoints() {
  const r = await ext.storage.local.get(KEY_ENDPOINTS);
  return r[KEY_ENDPOINTS] ?? [];
}

async function getDefaultId() {
  const r = await ext.storage.local.get(KEY_DEFAULT);
  return r[KEY_DEFAULT] ?? null;
}

// ── Payload ───────────────────────────────────────────────────────────────────

function buildPayload({ url, title, selection, note, endpointName, tags }) {
  return {
    source:    'clawclip',
    url:       url       ?? '',
    title:     title     ?? '',
    selection: selection ?? '',
    note:      note      ?? '',
    timestamp: new Date().toISOString(),
    endpoint:  endpointName ?? '',
    tags:      Array.isArray(tags) ? tags : [],
  };
}

// ── Sender ────────────────────────────────────────────────────────────────────

async function sendToEndpoint(endpoint, context) {
  const payload = buildPayload({
    url:          context.url,
    title:        context.title,
    selection:    context.selection,
    note:         context.note,
    endpointName: endpoint.name,
    tags:         endpoint.tags ?? [],
  });

  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(endpoint.headers ?? {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${body ? ': ' + body.slice(0, 120) : ''}`);
  }

  return { ok: true, status: response.status };
}

// ── Menu construction ─────────────────────────────────────────────────────────

const MENU_PAGE      = 'clawclip_page';
const MENU_SELECTION = 'clawclip_selection';

async function buildMenus() {
  await ext.contextMenus.removeAll();

  const endpoints = await getEndpoints();

  ext.contextMenus.create({ id: MENU_PAGE,      title: 'Send page to ClawClip',      contexts: ['page', 'frame', 'link'] });
  ext.contextMenus.create({ id: MENU_SELECTION, title: 'Send selection to ClawClip', contexts: ['selection'] });

  const pairs = [
    [MENU_PAGE,      ['page', 'frame', 'link']],
    [MENU_SELECTION, ['selection']],
  ];

  for (const [parent, ctx] of pairs) {
    if (endpoints.length === 0) {
      ext.contextMenus.create({ id: `${parent}_empty`, parentId: parent, title: 'No endpoints configured', enabled: false, contexts: ctx });
    } else {
      for (const ep of endpoints) {
        ext.contextMenus.create({ id: `${parent}_ep_${ep.id}`, parentId: parent, title: ep.name, contexts: ctx });
      }
    }

    ext.contextMenus.create({ id: `${parent}_sep`,    parentId: parent, type: 'separator',        contexts: ctx });
    ext.contextMenus.create({ id: `${parent}_manage`, parentId: parent, title: 'Manage endpoints', contexts: ctx });
  }
}

ext.runtime.onInstalled.addListener(() => buildMenus());

ext.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'clawclip_endpoints' in changes) buildMenus();
});

// ── Click handler ─────────────────────────────────────────────────────────────

function flashBadge(success) {
  ext.action.setBadgeText({ text: success ? '✓' : '✗' });
  ext.action.setBadgeBackgroundColor({ color: success ? '#22c55e' : '#ef4444' });
  setTimeout(() => ext.action.setBadgeText({ text: '' }), 2500);
}

ext.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = info.menuItemId;

  if (id.endsWith('_manage')) {
    ext.tabs.create({ url: ext.runtime.getURL('src/options/options.html') });
    return;
  }

  const match = id.match(/^clawclip_(?:page|selection)_ep_(.+)$/);
  if (!match) return;

  const endpoints = await getEndpoints();
  const endpoint  = endpoints.find(e => e.id === match[1]);
  if (!endpoint) { flashBadge(false); return; }

  try {
    await sendToEndpoint(endpoint, {
      url:       info.pageUrl       ?? tab?.url   ?? '',
      title:     tab?.title         ?? '',
      selection: info.selectionText ?? '',
      note:      '',
    });
    flashBadge(true);
  } catch {
    flashBadge(false);
  }
});

// ── Popup message handler ─────────────────────────────────────────────────────

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SEND') {
    sendToEndpoint(msg.endpoint, msg.context)
      .then(r  => sendResponse({ ok: true,  result: r }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
