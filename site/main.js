// Light/dark toggle. Everything else on the site is CSS.
// The inline script in each page's <head> applies a saved choice before first paint; this file handles clicks.
(() => {
  const root = document.documentElement;
  const KEY = 'notes-mode';
  const PAPER = { light: '#EFEEEA', dark: '#111110' };
  const button = document.querySelector('[data-mode-toggle]');
  const metas = document.querySelectorAll('meta[name="theme-color"]');

  const systemDark = () => {
    try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  };
  // data-theme is only set once the visitor has chosen (or chose earlier); otherwise the system decides.
  const current = () => root.dataset.theme || (systemDark() ? 'dark' : 'light');

  function paint(mode) {
    if (button) button.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    metas.forEach((m) => { m.content = PAPER[mode]; });
  }

  paint(current());

  if (button) {
    button.hidden = false; // without JS the toggle would do nothing, so it starts hidden
    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked: the choice just won't be remembered */ }
      paint(next);
    });
  }

  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!root.dataset.theme) paint(current());
    });
  } catch (e) { /* old browser: nothing to follow */ }
})();
