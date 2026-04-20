/**
 * Builds the JSON payload sent to a webhook endpoint.
 *
 * @param {{ url, title, selection, note, endpointName, tags }} ctx
 * @returns {object}
 */
export function buildPayload({ url, title, selection, note, endpointName, tags }) {
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
