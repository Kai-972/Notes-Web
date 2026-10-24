// Light/dark toggle, scroll reveal, and the year grid. Everything else on the site is CSS.
// The inline script in each page's <head> applies a saved choice before first paint; this file handles clicks.

// Scroll reveal: each [data-reveal] section gets the class "in" once it is on screen, and the CSS does the rest.
// IntersectionObserver hands us "this box crossed the viewport" without a scroll listener, so scrolling stays smooth.
(() => {
  const sections = document.querySelectorAll('[data-reveal]');
  let reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* assume motion is fine */ }
  if (reduce || !('IntersectionObserver' in window)) {
    sections.forEach((s) => s.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target); // once per section
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  sections.forEach((s) => io.observe(s));
})();

// A year of days: 52 weeks x 7 dots from a seeded generator (the same year every visit), recoloured per goal.
(() => {
  const grid = document.querySelector('[data-year-grid]');
  const count = document.querySelector('[data-year-count]');
  const chips = document.querySelector('[data-year-chips]');
  if (!grid || !count || !chips) return;

  const GOALS = ['code', 'fitness', 'reading', 'writing'];
  const CHANCE = [0.72, 0.42, 0.58, 0.8];
  let seed = 7031;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const days = [];
  const frag = document.createDocumentFragment();
  for (let d = 0; d < 364; d++) {
    const col = Math.floor(d / 7);
    const row = d % 7;
    const away = col === 19 || col === 20 || (col === 38 && row > 2); // two quiet stretches, like a holiday
    const levels = CHANCE.map((p) => ((!away && rnd() < p * (row >= 5 ? 0.8 : 1)) ? 1 + Math.floor(rnd() * 4) : 0));
    const el = document.createElement('span');
    const today = d === 363;
    el.className = today ? 'yd today' : 'yd';
    el.style.setProperty('--col', col);
    el.style.setProperty('--row', row);
    days.push({ el, today, levels, all: levels.filter((x) => x > 0).length });
    frag.appendChild(el);
  }
  grid.appendChild(frag);

  // goal is -1 for everything, or an index into GOALS
  function show(goal) {
    let on = 0;
    days.forEach((day) => {
      const level = goal < 0 ? day.all : day.levels[goal];
      if (level > 0 || day.today) on++;
      if (!day.today) day.el.dataset.l = level;
    });
    grid.style.setProperty('--c', goal < 0 ? 'var(--ink)' : 'var(--g' + goal + ')');
    const text = on + ' of 364 days with ' + (goal < 0 ? 'something done' : GOALS[goal]);
    count.textContent = text;
    grid.setAttribute('aria-label', 'A year of days as dots, ' + text);
  }

  chips.hidden = false; // the chips do nothing without JS, so they start hidden
  chips.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-goal]');
    if (!button) return;
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    show(Number(button.dataset.goal));
  });
  show(-1);
})();

// The day line plays by itself (CSS) when revealed. "Play the day again" restarts it: a CSS animation only restarts
// when it is removed and applied again, so we add "off" (animations: none), force a reflow so the browser
// really applies that, then take "off" away again.
(() => {
  const line = document.querySelector('[data-day-line]');
  const button = document.querySelector('[data-day-replay]');
  if (!line || !button) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    line.classList.add('off');
    void line.offsetWidth;
    line.classList.remove('off');
  });
})();

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
