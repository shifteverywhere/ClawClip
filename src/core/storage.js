import ext from './compat.js';

const KEY_ENDPOINTS = 'clawclip_endpoints';
const KEY_DEFAULT   = 'clawclip_default';

/** @returns {Promise<object[]>} */
export async function getEndpoints() {
  const r = await ext.storage.local.get(KEY_ENDPOINTS);
  return r[KEY_ENDPOINTS] ?? [];
}

/** @param {object[]} endpoints */
export async function saveEndpoints(endpoints) {
  await ext.storage.local.set({ [KEY_ENDPOINTS]: endpoints });
}

/**
 * Adds a new endpoint and assigns a random UUID id.
 * @param {object} endpoint
 * @returns {Promise<object>} the saved endpoint with its id
 */
export async function addEndpoint(endpoint) {
  const endpoints = await getEndpoints();
  const entry = { ...endpoint, id: crypto.randomUUID() };
  await saveEndpoints([...endpoints, entry]);
  return entry;
}

/**
 * Merges `changes` into the endpoint with the given id.
 * @param {string} id
 * @param {object} changes
 * @returns {Promise<object>} updated endpoint
 */
export async function updateEndpoint(id, changes) {
  const endpoints = await getEndpoints();
  const idx = endpoints.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Endpoint not found');
  endpoints[idx] = { ...endpoints[idx], ...changes };
  await saveEndpoints(endpoints);
  return endpoints[idx];
}

/**
 * Removes an endpoint by id. Clears the default if it was the deleted endpoint.
 * @param {string} id
 */
export async function deleteEndpoint(id) {
  const endpoints = await getEndpoints();
  await saveEndpoints(endpoints.filter(e => e.id !== id));
  const defaultId = await getDefaultId();
  if (defaultId === id) await setDefaultId(null);
}

/** @returns {Promise<string|null>} */
export async function getDefaultId() {
  const r = await ext.storage.local.get(KEY_DEFAULT);
  return r[KEY_DEFAULT] ?? null;
}

/** @param {string|null} id */
export async function setDefaultId(id) {
  await ext.storage.local.set({ [KEY_DEFAULT]: id });
}
