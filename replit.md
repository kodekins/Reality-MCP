# Reality

Reality turns browser cameras into structured, searchable physical-world context for AI agents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/reality run build` — build the web artifact locally
- Required env for the preconfigured API server: `DATABASE_URL` is supplied by the workspace template; Reality's demo mode does not require external service credentials.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/reality/src/pages/reality-pages.tsx` — dashboard, camera, events, search, MCP connection, and settings screens.
- `artifacts/api-server/src/lib/reality-state.ts` — demo world state, object normalization, mock scan transitions, and event generation.
- `artifacts/api-server/src/routes/reality.ts` — typed Reality API routes.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts and generated hooks.
- `artifacts/reality/supabase/migrations/001_reality.sql` — production persistence schema for a Supabase/Postgres deployment.

## Architecture decisions

- The world state engine is independent from the UI and treats vision as a replaceable perception provider.
- Demo mode intentionally alternates the Coca Cola count so the full change → event → MCP flow can be tested without paid AI calls.
- Raw video is not persisted by default; the browser keeps the live stream and the server receives selected analysis frames only.
- The public MCP surface is routed separately from `/api` so the deployed endpoint is simply `/mcp`.

## Product

- Camera monitoring with mock-mode analysis and browser permission handling.
- Structured current state, recent changes, object counts, searchable events, privacy settings, and MCP connection instructions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The generated API client requires `dom.iterable` in `lib/api-client-react/tsconfig.json` because its fetch helper uses `Headers.entries()`.
- The first MVP runs on the in-process demo store when no external vision provider is configured; restarting the API process resets demo observations.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
