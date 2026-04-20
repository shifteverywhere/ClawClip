# ClawClip

**A lightweight browser extension that captures the current tab's context and POSTs it to a configurable webhook endpoint.**

Designed as a browser-to-automation ingress tool for AI workflows — connect to n8n, Zapier, Make, Slack, or any service that accepts an HTTP POST.

![Firefox](https://img.shields.io/badge/Firefox-109%2B-orange?logo=firefox)
![Chrome](https://img.shields.io/badge/Chrome-MV3-blue?logo=googlechrome)
![Edge](https://img.shields.io/badge/Edge-MV3-blue?logo=microsoftedge)
![License](https://img.shields.io/badge/license-MIT-green)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

---

## Features

| | Feature | Detail |
|---|---|---|
| 🔗 | **Multiple endpoints** | Add, edit, and delete named webhook endpoints with custom headers and tags |
| ⚡ | **Two-click send** | Open popup → pick endpoint → Send |
| 🖱️ | **Context menu with submenus** | Right-click → Send page or Send selection → choose endpoint directly |
| 📝 | **Optional note** | Add freeform context before sending |
| 🌙 | **Dark / light mode** | Toggle in the popup or options page; preference is remembered across restarts |
| 📦 | **Structured payload** | Consistent JSON format ready for downstream automation |
| 🌐 | **Cross-browser** | Single shared codebase for Firefox, Chrome, and Edge |

---

## Payload format

Every send delivers a JSON object with this shape:

```json
{
  "source":    "clawclip",
  "url":       "https://example.com/article",
  "title":     "Article Title",
  "selection": "Highlighted text, if any",
  "note":      "User's optional note",
  "timestamp": "2025-06-01T14:30:00.000Z",
  "endpoint":  "My Zapier Hook",
  "tags":      ["ai", "research"]
}
```

---

## Installation

### 1 — Clone the repo

```bash
git clone https://github.com/shifteverywhere/ClawClip.git
cd ClawClip
```

### 2 — Generate icons

The repository ships without compiled icons. Run the generator once (Python 3 standard library only):

```bash
python3 create-icons.py
```

This creates solid-colour placeholder PNGs in `icons/`. Replace them with real artwork before publishing.

---

### Firefox

`manifest.json` is pre-configured for Firefox.

1. Open **`about:debugging`**
2. Click **This Firefox** → **Load Temporary Add-on…**
3. Select `manifest.json` from the cloned directory

> **Minimum version:** Firefox 109 (Manifest V3 with `background.scripts`)
>
> Temporary add-ons are removed on browser restart. For a persistent install, the extension must be signed by Mozilla or loaded in Firefox Developer Edition / Nightly with `xpinstall.signatures.required = false` in `about:config`.

---

### Chrome / Edge

`manifest.json` is the Firefox version. Swap in the Chrome manifest before loading:

```bash
cp manifest.chrome.json manifest.json
```

1. Navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the project directory

> Restore the Firefox manifest at any time: `git checkout manifest.json`

---

## First-time setup

1. Click the **ClawClip** toolbar icon
2. Click **Manage endpoints** in the popup footer
3. Click **+ Add Endpoint** and fill in:
   - **Name** — a label you'll recognise
   - **Webhook URL** — must be HTTPS
   - **Static Headers** — optional JSON, e.g. `{"Authorization": "Bearer token"}`
   - **Default Tags** — optional comma-separated tags sent with every payload
4. Click **Save Endpoint**

The first endpoint is automatically set as the default.

---

## Usage

### Popup

1. Click the ClawClip icon in the toolbar
2. Choose an endpoint from the dropdown (or keep the default)
3. Add an optional note
4. Click **Send**

The context preview bar shows the URL and any selected text that will be included in the payload.

### Context menu

Right-click anywhere on a page to access the send submenus:

```
Send page to ClawClip  ▶  My Webhook
                           n8n Local
                           ─────────────────
                           Manage endpoints

Send selection to ClawClip  ▶  My Webhook     (appears when text is selected)
                               n8n Local
                               ─────────────────
                               Manage endpoints
```

A badge flashes **✓** (green) on success or **✗** (red) on failure. The submenu rebuilds automatically whenever endpoints are added or removed.

### Dark mode

Click the **moon / sun icon** in the upper-right corner of the popup or options page. The preference is saved to `browser.storage.local` and restored on every page load.

---

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `scripting` | Extract selected text via `executeScript` |
| `storage` | Persist endpoint configuration and theme preference locally |
| `contextMenus` | Register the right-click menu items |
| `host_permissions *://*/*` | Send POST requests to arbitrary user-configured HTTPS webhook URLs. Required to bypass CORS restrictions for self-hosted servers that don't emit `Access-Control-Allow-Origin` headers. |

---

## Project structure

```
ClawClip/
├── manifest.json            ← Firefox (background.scripts)
├── manifest.chrome.json     ← Chrome / Edge (background.service_worker)
├── create-icons.py          ← generates placeholder PNG icons
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── core/                ← shared by all entry points
    │   ├── compat.js        browser vs chrome namespace normalisation
    │   ├── storage.js       endpoint CRUD + default tracking
    │   ├── validate.js      URL validation, header/tag parsing
    │   ├── payload.js       JSON payload construction
    │   ├── sender.js        fetch POST logic
    │   └── theme.js         dark/light mode state + toggle helper
    ├── background/
    │   ├── service-worker.js     Chrome/Edge — ES module service worker
    │   ├── background.firefox.js Firefox — self-contained event page script
    │   └── background.html       Firefox background page wrapper
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.js
    └── options/
        ├── options.html
        ├── options.css
        └── options.js
```

All business logic lives in `src/core/`. Browser-specific differences are limited to the two background entry points and `compat.js`.

---

## Cross-browser compatibility

### What works identically everywhere

- All WebExtensions APIs used: `storage`, `contextMenus`, `scripting`, `tabs`, `action`, `runtime`
- ES module scripts in popup and options (`<script type="module">`)
- `browser.*` / `chrome.*` namespace normalised by `compat.js`

### Known differences

| Area | Firefox | Chrome / Edge |
|---|---|---|
| Minimum version | 109 | MV3 (Chrome 88+) |
| Manifest | `manifest.json` | `manifest.chrome.json` → rename to `manifest.json` |
| Background | Persistent event page (`background.firefox.js`) | ES module service worker (`service-worker.js`) |
| Background lifetime | Always alive | May terminate when idle; wakes on events |
| Namespace | `browser.*` (native) | `chrome.*` — normalised by `compat.js` |

---

## Safari (future)

Key considerations for a future Safari port:

- **Wrapper app required.** Convert with `xcrun safari-web-extension-converter . --app-name ClawClip` and ship inside a native macOS/iOS app.
- **`browser.*` namespace** is supported natively — `compat.js` already handles this.
- **`scripting.executeScript`** requires Safari 16+.
- **Service workers** require Safari 15.4+ (lifetime may differ).
- **No build step needed.** The converter works directly with plain ES modules.
- **`host_permissions *://*/*`** is allowed but may require App Store review justification; consider `optional_host_permissions` to reduce the surface.

---

## Testing webhooks

Use a free temporary HTTPS endpoint to inspect payloads:

- **[webhook.site](https://webhook.site)** — live request viewer in the browser
- **[requestbin.com](https://requestbin.com)** — inspect headers and body

Both services send `Access-Control-Allow-Origin: *` headers, so no extra browser configuration is needed.

---

## Contributing

Issues and pull requests are welcome.

- Keep the no-build, no-dependency contract — plain JS/HTML/CSS only
- New features that require browser-specific code should be isolated in the relevant background entry point, not in `src/core/`
- Test against both Firefox and Chrome before opening a PR

---

## License

[MIT](LICENSE)
