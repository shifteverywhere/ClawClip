// Normalise the extension namespace.
// Firefox exposes `browser` (Promise-based); Chrome/Edge expose `chrome` (callback-based but
// also Promise-based in MV3). Both share the same WebExtensions surface for the APIs we use.
const ext = (typeof browser !== 'undefined') ? browser : chrome;
export default ext;
