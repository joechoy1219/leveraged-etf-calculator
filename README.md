# Leveraged ETF Calculator

React + TypeScript + Vite app for estimating leveraged ETF moves from underlying stock prices.

## What Runs Where

- Frontend: static files built by Vite.
- Quote API in local dev: Vite middleware in `vite.config.ts`.
- Quote API in Cloudflare Pages: Pages Functions in `functions/api/aastocks/*`.

Frontend endpoints:

- `/api/aastocks/bootstrap`
- `/api/aastocks/quote`

## Local Development

```bash
npm install
npm run dev
```

No extra setup is required for local development.

## Cloudflare Pages Deployment (Step by Step)

### 1) Push code to GitHub

Ensure these files are in your repository:

- `functions/api/aastocks/bootstrap.ts`
- `functions/api/aastocks/quote.ts`

### 2) Create a Cloudflare Pages project

1. Open Cloudflare Dashboard.
2. Go to `Workers & Pages`.
3. Click `Create` -> `Pages` -> `Connect to Git`.
4. Select this repository.

### 3) Configure build settings

Use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave empty (project root)

### 4) Set environment variable

In Pages project settings, set:

- `VITE_BASE_PATH=/`
- `VITE_AASTOCKS_API_BASE=/api`

This keeps frontend and Pages Functions on the same domain.

### 5) Deploy

Click `Save and Deploy`.

After deployment, verify:

- Open the Pages URL and use the quote button.
- Open:
  - `https://<your-pages-domain>/api/aastocks/bootstrap?symbol=NVDA`
- You should get JSON (or a 4xx/5xx JSON error), not a 404 page.

## Important Base Path Note

`vite.config.ts` reads `VITE_BASE_PATH`:

- Cloudflare Pages root hosting: set `VITE_BASE_PATH=/`
- GitHub Pages project-path hosting: set `VITE_BASE_PATH=/leveraged-etf-calculator/`

## Build

```bash
npm run build
```
