/**
 * Validates that a URL is well-formed and uses HTTPS.
 * @param {string} url
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates a full endpoint object before saving.
 * @param {object} ep
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEndpoint(ep) {
  if (!ep?.name?.trim()) {
    return { valid: false, error: 'Name is required' };
  }

  const urlResult = validateUrl(ep.url);
  if (!urlResult.valid) return urlResult;

  if (ep.headers != null) {
    if (typeof ep.headers !== 'object' || Array.isArray(ep.headers)) {
      return { valid: false, error: 'Headers must be a JSON object' };
    }
    for (const [k, v] of Object.entries(ep.headers)) {
      if (typeof k !== 'string' || typeof v !== 'string') {
        return { valid: false, error: 'Header keys and values must be strings' };
      }
    }
  }

  return { valid: true };
}

/**
 * Parses the raw headers textarea value (JSON string) into an object.
 * @param {string} raw
 * @returns {{ ok: boolean, headers?: object, error?: string }}
 */
export function parseHeaders(raw) {
  if (!raw?.trim()) return { ok: true, headers: {} };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      return { ok: false, error: 'Headers must be a JSON object, e.g. {"Key": "Value"}' };
    }
    return { ok: true, headers: parsed };
  } catch {
    return { ok: false, error: 'Invalid JSON — check for missing quotes or commas' };
  }
}

/**
 * Parses a comma-separated tags string into a trimmed array.
 * @param {string} raw
 * @returns {string[]}
 */
export function parseTags(raw) {
  if (!raw?.trim()) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}
