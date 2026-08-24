# Amya Agency

Next.js rebuild of [amya.agency](https://amya.agency), migrated from Webflow for deployment on Vercel.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Motion (framer-motion) for the theme toggle animation
- Self-hosted Helvetica Neue via `next/font/local` (`fonts/`)
- pnpm

## Pages

- `/` — single-viewport landing page: top heading, flickering plus-sign grid (twinkle + hover halo, driven by one `requestAnimationFrame` loop), bottom bar with Access / Contact links and the dark/light toggle (+ rotates into − on switch).
- `/contact` — contact info and LinkedIn link, themed.
- `/access` — password gate. Checks `ACCESS_PASSWORD` and sets a cookie for 7 days. The content behind the gate is a placeholder.

## Theming

Dark by default. The choice persists to `localStorage` under `themePreference` (same key the Webflow site used, so returning visitors keep their preference). A small inline script in `<head>` applies the saved theme before first paint.

## Development

```bash
pnpm install
cp .env.example .env.local   # set ACCESS_PASSWORD
pnpm dev
```

## Deploy

Push to a git remote and import into Vercel. Set the `ACCESS_PASSWORD` environment variable in the Vercel project settings.
