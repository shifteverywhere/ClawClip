import ext from './compat.js';

const KEY_THEME = 'clawclip_theme';

export async function getTheme() {
  const r = await ext.storage.local.get(KEY_THEME);
  return r[KEY_THEME] ?? 'light';
}

export async function setTheme(theme) {
  await ext.storage.local.set({ [KEY_THEME]: theme });
}

/** Sets data-theme on <html>. Pass transition:true for animated toggling. */
export function applyTheme(theme, { transition = false } = {}) {
  const root = document.documentElement;
  if (transition) {
    root.classList.add('theme-transition');
    root.setAttribute('data-theme', theme);
    setTimeout(() => root.classList.remove('theme-transition'), 250);
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/**
 * Reads the saved theme from storage, applies it, and wires up the toggle button.
 * Call once per page during init.
 * @param {string} btnId  — id of the toggle button element
 */
export async function initThemeToggle(btnId) {
  const theme = await getTheme();
  applyTheme(theme);

  document.getElementById(btnId).addEventListener('click', async () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next, { transition: true });
    await setTheme(next);
  });
}
