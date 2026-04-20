import { buildPayload } from './payload.js';

/**
 * POSTs a ClawClip payload to the given endpoint.
 * Throws on network failure or non-2xx HTTP status.
 *
 * @param {object} endpoint  — { name, url, headers, tags }
 * @param {object} context   — { url, title, selection, note }
 * @returns {Promise<{ ok: true, status: number }>}
 */
export async function sendToEndpoint(endpoint, context) {
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
