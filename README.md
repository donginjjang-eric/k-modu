# K-MODU

Static GitHub Pages site for the K-MODU landing page and lightweight platform pages.

## File Map

- `index.html`: main landing-page markup only.
- `home.css`: main landing-page styles.
- `scripts/home.js`: main landing-page interactions.
- `platform.css`: shared styles for creators, campaign, apply, login, admin, and detail pages.
- `scripts/creators.js`: creator-directory view switch and modal behavior.
- `assets/`: site images. Keep file names lowercase or exact-case because GitHub Pages is case-sensitive.

## Before Editing

1. Keep page copy in the HTML file that owns the page.
2. Keep landing-page layout changes in `home.css`.
3. Keep subpage/shared layout changes in `platform.css`.
4. Keep behavior changes in `scripts/*.js`.

## Check Before Upload

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preflight.ps1
```

Then have a review pass before committing and pushing.
