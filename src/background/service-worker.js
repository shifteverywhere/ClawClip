import ext from '../core/compat.js';
import { getEndpoints } from '../core/storage.js';
import { sendToEndpoint } from '../core/sender.js';

const MENU_PAGE      = 'clawclip_page';
const MENU_SELECTION = 'clawclip_selection';

// ── Menu construction ─────────────────────────────────────────────────────────

async function buildMenus() {
  await ext.contextMenus.removeAll();

  const endpoints = await getEndpoints();

  // Top-level parents
  ext.contextMenus.create({ id: MENU_PAGE,      title: 'Send page to ClawClip',      contexts: ['page', 'frame', 'link'] });
  ext.contextMenus.create({ id: MENU_SELECTION, title: 'Send selection to ClawClip', contexts: ['selection'] });

  for (const [parent, ctx] of [
    [MENU_PAGE,      ['page', 'frame', 'link']],
    [MENU_SELECTION, ['selection']],
  ]) {
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

// Rebuild on install/update and whenever the endpoint list changes.
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

  // Matches clawclip_page_ep_<uuid> or clawclip_selection_ep_<uuid>
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
