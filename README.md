# notes, the website

The site for **notes**, a small journal app for Android. Plain HTML, CSS and a little JavaScript. No build step.

```sh
cd site
python3 -m http.server 8000   # then open http://localhost:8000
```

- `site/` is what gets published (GitHub Pages, deployed by `.github/workflows/pages.yml`).
- `design/` holds the design board sources and phone-screen renders the site is built from.

The site sets no cookies and has no trackers or analytics. The only request it makes to another host is Google Fonts.
