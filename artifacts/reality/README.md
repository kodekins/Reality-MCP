# Reality

Reality turns a phone or webcam into searchable physical-world context for AI agents.

## Current MVP

- Camera-first `/camera` flow with browser permission handling and front/rear switching.
- Live browser camera analysis through Gemini vision, with deterministic demo mode when Gemini is not configured.
- Dashboard, event history, structured search, MCP connection page, and monitoring/privacy settings.
- Shared API contract in `lib/api-spec/openapi.yaml`.
- Public `GET /health`, `GET /mcp-info`, and Streamable HTTP `/mcp` endpoints routed through the API service.
- Production-ready Supabase/Postgres schema in `supabase/migrations/001_reality.sql`.

## Privacy

Reality does not store continuous raw video. Live video stays in the browser. The application stores structured observations, events, and optionally event snapshots.

## MCP

Use the deployed HTTPS URL with `/mcp`. The endpoint exposes:

`get_current_state`, `inspect_zone`, `find_object`, `count_objects`, `search_events`, `get_recent_changes`, and `get_camera_status`.

Live camera analysis requires a captured image and a server-side `GEMINI_API_KEY`. No secret belongs in source code or client bundles. The MCP route reads persisted Supabase tables and returns an explicit configuration or schema error until Supabase is configured and the migration has been applied.

Before using MCP, run `supabase/migrations/001_reality.sql` in the Supabase SQL Editor, configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then deploy the app and use its HTTPS URL ending in `/mcp`.
