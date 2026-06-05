# K-MODU Service Ready Checklist

## Current baseline

- Branch: `work/styling-board-2026-06-02`
- Backup branch: `codex/backup-kmodu-shortform-20260605`
- Local key page: `http://localhost:8010/designers.html`
- Short-form demo UI is currently implemented in `designers.html`.

## Required production environment variables

- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: long random secret for session signing.
- `DB_SETUP_TOKEN`: private token for `/api/system/db-setup`.
- `ADMIN_EMAIL`: initial admin login ID/email.
- `ADMIN_PASSWORD`: initial admin password.
- `OPENAI_API_KEY`: required for AI look generation.

## Optional environment variables

- `OPENAI_IMAGE_MODEL`: defaults to `gpt-image-2`.
- `OPENAI_IMAGE_SIZE`: defaults to `1024x1536`.
- `SEED_DEMO_DATA=true`: only use when intentionally creating demo accounts/data.
- `KMODU_ENABLE_DEMO=true`: allows demo fallback data outside development. Do not use for normal production.

## Pre-launch checks

- Run `npm run build`.
- POST `/api/system/db-setup` with the `x-setup-token` header.
- Confirm admin login with `admin / 1234`.
- Confirm designer login with `test / 1234`.
- Confirm Kakao/Naver/Google login buttons enter the designer test account until real OAuth is connected.
- Confirm `designers.html` loads and shows `Generate Short-form Video`.
- Confirm product image upload works.
- Confirm AI look generation works with the production `OPENAI_API_KEY`.
- Confirm generated image and upload storage paths persist after server restart.

## Current production login policy

- Easy access is intentionally enabled for the current service launch stage.
- Admin login: `admin / 1234`.
- Designer test login: `test / 1234`.
- SNS buttons are temporary shortcuts into the designer test account until OAuth is implemented.

## Production safety rules

- Do not set `SEED_DEMO_DATA=true` unless intentionally reseeding demo content.
- Do not expose `DB_SETUP_TOKEN`.
- Do not deploy without `AUTH_SECRET`.
