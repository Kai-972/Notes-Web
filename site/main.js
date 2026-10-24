// Light/dark toggle, scroll reveal, the year grid, a few demos and the skin switcher. Everything else on the site is CSS.
// The inline script in each page's <head> applies a saved choice before first paint; this file handles clicks.

// 'light' or 'dark' as the page shows it. data-theme is only set once the visitor has chosen (now or earlier);
// until then the system decides, which is what prefers-color-scheme in the CSS follows too.
function pageMode() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
}

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

// "Everything in it": three demos are drawn here so the HTML stays readable. They are decoration (aria-hidden),
// so with JS off those frames are simply empty and the tile text still says everything.
(() => {
  const el = (cls, parent, style) => {
    const e = document.createElement('span');
    e.className = cls;
    if (style) e.style.cssText = style;
    parent.appendChild(e);
    return e;
  };

  // Focus: a ring of 25 dots, one dot a minute; each fills in turn.
  const ring = document.querySelector('[data-ring]');
  if (ring) {
    for (let i = 0; i < 25; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 25;
      const pos = 'left:' + (66 + 58 * Math.cos(a) - 4).toFixed(1) + 'px;top:' + (66 + 58 * Math.sin(a) - 4).toFixed(1) + 'px';
      el('rd base', ring, pos);
      el('rd fill f-pop', ring, pos + ';--d:' + (0.4 + i * 0.15).toFixed(2) + 's');
    }
  }

  // Review: three months of dots, 13 weeks x 7, the last column holds today and then the days to come.
  const mini = document.querySelector('[data-mini]');
  if (mini) {
    let seed = 4242;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let c = 0; c < 13; c++) {
      for (let r = 0; r < 7; r++) {
        const future = c === 12 && r > 0;
        const today = c === 12 && r === 0;
        const level = Math.floor(rnd() * 5);
        const dot = el('sd f-pop' + (today ? ' today today-ring' : '') + (future ? ' future' : ''), mini, '--d:' + (0.2 + c * 0.05 + r * 0.015).toFixed(3) + 's');
        if (!today && !future) dot.dataset.l = level;
      }
    }
  }

  // Past days: October, days 1 to 19 shaded, today (19) ringed, the rest greyed out.
  const cal = document.querySelector('[data-cal]');
  if (cal) {
    const levels = [3, 2, 4, 1, 3, 0, 2, 4, 3, 2, 4, 3, 1, 4, 2, 3, 4, 3, 1];
    for (let i = 0; i < 35; i++) {
      const day = i - 2; // the month starts on a Thursday
      if (day < 1 || day > 31) { el('cd off', cal); continue; }
      const cell = el('cd' + (day > 19 ? ' off' : '') + (day === 19 ? ' today-ring' : ''), cal);
      cell.textContent = day;
      if (day <= 19) cell.dataset.l = levels[day - 1];
    }
  }
})();

// Skins: picking one sets data-skin and data-sm on the section and the CSS does the rest (paper, ink, heading font).
// The other skins' fonts are not part of the page: they load as tiny subsets (only the letters used here) when the
// section is about to come into view, so a visitor who never scrolls there never downloads them.
(() => {
  const section = document.querySelector('[data-skins]');
  if (!section) return;
  const list = section.querySelector('[data-skin-list]');
  const modes = section.querySelector('[data-skin-modes]');
  const note = section.querySelector('[data-skin-note]');
  const images = section.querySelectorAll('img[data-s]');
  const skinButtons = section.querySelectorAll('[data-skin-pick]');
  const modeButtons = section.querySelectorAll('[data-skin-mode]');

  // from here JS decides which preview shows, so the no-JS light/dark classes on the Quiet pair must go
  images.forEach((img) => img.classList.remove('on-light', 'on-dark'));

  let skin = 'q';
  let chosen = null; // null: the preview follows the page's light or dark

  function render(animate) {
    const mode = chosen || pageMode();
    section.dataset.skin = skin;
    section.dataset.sm = mode;
    images.forEach((img) => {
      const show = img.dataset.s === skin && img.dataset.m === mode;
      img.hidden = !show;
      img.classList.remove('swap');
      if (show && animate) { void img.offsetWidth; img.classList.add('swap'); }
    });
    skinButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skinPick === skin)));
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skinMode === mode)));
    note.hidden = skin === 'q';
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-skin-pick]');
    if (!b || b.dataset.skinPick === skin) return;
    skin = b.dataset.skinPick;
    render(true);
  });
  modes.addEventListener('click', (e) => {
    const b = e.target.closest('[data-skin-mode]');
    if (!b) return;
    chosen = b.dataset.skinMode;
    render(true);
  });
  // flipping the page's own light/dark takes the preview back to following it
  document.addEventListener('notes:mode', () => { chosen = null; render(false); });

  list.hidden = false;
  modes.hidden = false;
  render(false);

  const FONTS = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Caveat:wght@700&family=Bangers'
    + '&family=Bricolage+Grotesque:wght@800&family=Big+Shoulders+Display:wght@900&display=swap&text='
    + encodeURIComponent('One app, six tastes.ONE APP, SIX TASTES.QuietPebblesDiaryPanelsRisoPoster');
  const loadFonts = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    document.head.appendChild(link);
  };
  if (!('IntersectionObserver' in window)) { loadFonts(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { loadFonts(); io.disconnect(); }
  }, { rootMargin: '700px 0px' });
  io.observe(section);
})();

// Not a game: four 30-day strips, seeded like the board. The "N of 30" counts in the HTML are what this produces.
(() => {
  const strips = document.querySelectorAll('[data-strip]');
  if (!strips.length) return;
  const CHANCE = [0.8, 0.5, 0.64, 0.88];
  let seed = 20261019;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  strips.forEach((strip, g) => {
    for (let d = 0; d < 30; d++) {
      const on = rnd() < CHANCE[g];
      const level = on ? 1 + Math.floor(rnd() * 4) : 0;
      const dot = document.createElement('span');
      dot.className = 'gd' + (d === 29 ? ' last' : ''); // the last dot is today
      dot.dataset.l = level;
      dot.style.setProperty('--d', (0.2 + g * 0.12 + d * 0.025).toFixed(3) + 's');
      strip.appendChild(dot);
    }
  });
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

  const current = pageMode;

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
      document.dispatchEvent(new Event('notes:mode'));
    });
  }

  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!root.dataset.theme) { paint(current()); document.dispatchEvent(new Event('notes:mode')); }
    });
  } catch (e) { /* old browser: nothing to follow */ }
})();
