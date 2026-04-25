# National Ride Fuel Sharing System (NRFSS)

## Overview

This repository is a full-stack ride/fuel sharing application built with:

- `backend/` — Express API server
- `frontend/` — static HTML/CSS/JS app that calls backend APIs
- `docs/` — legacy duplicate frontend files; the real app is in `frontend/`
- `scripts/` — helper utilities and PDF-related scripts
- `archive/` — legacy or temporary files moved out of the main app flow

## Recommended structure

- `frontend/`
  - public UI pages
  - shared JS under `frontend/js/`
- `backend/`
  - API routes, controllers, middleware, utilities
- `scripts/`
  - PDF tools and other helper scripts that are not part of the core app

## What changed

- Added `frontend/js/utils/api.js` for shared auth and API helper logic
- Added top-level `README.md` to document the project layout
- Added `.gitignore` for legacy duplicates and temporary files
- Copied PDF helper scripts into `scripts/`
- Created `scripts/` and `archive/` folders for improved organization

## How to run the app

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables in `backend/.env`:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

3. Start the backend server:
   ```bash
   npm start
   ```

4. Open the frontend pages from `frontend/` in a static server or browser.

## Notes

- `frontend/` is the source of truth for the app UI.
- `docs/` contains duplicate pages and should be treated as legacy copy.
- `code1.html` through `code9.html` are legacy or temporary files and can be archived.
- `read_pdf*.js` and `pdf_content.txt` are helper scripts, not part of the main app.
