# Reality

Reality turns a phone or webcam into searchable physical-world context for AI agents.

## Current MVP

- Camera-first `/camera` flow with browser permission handling and front/rear switching.
- Live browser camera analysis through Gemini vision. Reality does not fabricate objects when the camera or vision provider is unavailable.
- Dashboard, event history, structured search, MCP connection page, and monitoring/privacy settings.
- Shared API contract in `lib/api-spec/openapi.yaml`.
- Public `GET /health`, `GET /mcp-info`, and Streamable HTTP `/mcp` endpoints routed through the API service.
- Production-ready Supabase/Postgres schema in `supabase/migrations/001_reality.sql`.

## Privacy

Reality does not store continuous raw video. Live video stays in the browser. The application stores structured observations, events, and optionally event snapshots.

## MCP

Use the deployed HTTPS URL with `/mcp`. The endpoint exposes:

`get_current_state`, `inspect_zone`, `find_object`, `count_objects`, `search_events`, `get_recent_changes`, and `get_camera_status`.

The camera route requires a real captured image and `GEMINI_API_KEY` in Replit Secrets. No secret belongs in source code or client bundles. The MCP route reads persisted Supabase tables and returns an explicit schema error until the migration has been applied.

Before using MCP with Claude, run `supabase/migrations/001_reality.sql` in the connected Supabase project's SQL Editor. Then publish the app and give Claude the published URL ending in `/mcp` (not the Replit preview URL).