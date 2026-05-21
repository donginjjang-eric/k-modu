# K-MODU Deploy Notes

## Project Type

Static HTML/CSS site. No build step is required.

## Production Root

Upload the project root as the web root.

Required entry page:

- `index.html`

Required shared assets:

- `platform.css`
- `assets/`
- all linked `.html` pages

## Pre-Deploy Checks

Run these before uploading:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preflight.ps1
```

For review order, see `REVIEW_WORKFLOW.md`.

## Server Notes

- Serve `index.html` as the default document.
- Use HTTPS on the production domain.
- Cache image files aggressively after final approval.
- Do not upload `.git/`, local logs, cache folders, or editor files.

## Current Cleanup

- Root-level duplicate/unused images were removed.
- Production assets are kept under `assets/`.
