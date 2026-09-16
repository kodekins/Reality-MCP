# Reality MCP

Reality turns a browser camera into structured, searchable physical-world context and exposes it to AI agents through Streamable HTTP MCP.

## Quick start

Requirements: Node.js 24+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`. The API runs on `http://127.0.0.1:8080`, and Vite proxies `/api`, `/health`, and `/mcp` to it. When `GEMINI_API_KEY` is absent, the app runs a deterministic demo analysis so the complete UI and event flow remain testable.

## Supabase setup

1. Create a Supabase project.
2. Open its SQL Editor and run `artifacts/reality/supabase/migrations/001_reality.sql`.
3. Copy `.env.example` to `.env` (or configure the same variables in your host).
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Optionally set `GEMINI_API_KEY` for real camera-frame analysis.

The service-role key is used only by the API server. Never expose it through a `VITE_` variable or commit it to Git.

Replit's Supabase connector remains supported as a fallback when direct Supabase variables are absent and the app is running inside Replit.

## Build and run

```bash
pnpm build
pnpm start
```

The API server serves the built frontend, REST API, health endpoints, and MCP endpoint from one port. Verify a deployment with:

```bash
curl https://YOUR_HOST/health
curl https://YOUR_HOST/mcp-info
```

Use `https://YOUR_HOST/mcp` in a Streamable HTTP MCP client.

## Deploy to Vercel

1. Import this repository into Vercel and set Root Directory to the repository root (`.`). Do not select `artifacts/reality`.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under Project Settings → Environment Variables. Add `GEMINI_API_KEY` if you want live vision analysis.
3. Apply `artifacts/reality/supabase/migrations/001_reality.sql` in the Supabase SQL Editor.
4. Deploy. Vercel runs `pnpm -w run vercel-build`, serves the frontend from `public`, and exposes the Express API as a function.

Your MCP URL is `https://YOUR_PROJECT.vercel.app/mcp`. You do not need to set `PORT`, `API_URL`, `BASE_PATH`, or `VITE_MCP_URL` for a same-origin Vercel deployment. Set `CORS_ORIGINS` only when a browser hosted on another origin must call the API.

After deployment, verify:

```bash
curl https://YOUR_PROJECT.vercel.app/health
curl https://YOUR_PROJECT.vercel.app/mcp-info
```

## Main endpoints

- `GET /health` — runtime and integration mode
- `GET /api/overview` — dashboard state
- `POST /api/analyze` — analyze a base64 camera frame or advance demo mode
- `GET /api/events` — event history
- `POST /mcp` — Streamable HTTP MCP endpoint

## Checks

```bash
pnpm typecheck
pnpm build
```
