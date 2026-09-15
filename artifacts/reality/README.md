# Reality

Reality turns a phone or webcam into searchable physical-world context for AI agents.

## Current MVP

- Camera-first `/camera` flow with browser permission handling and front/rear switching.
- Mock mode when no vision provider is configured. Each analysis alternates the desk between two and one Coca Cola can, creating a real count-decreased event.
- Dashboard, event history, structured search, MCP connection page, and monitoring/privacy settings.
- Shared API contract in `lib/api-spec/openapi.yaml`.
- Public `GET /health` and `GET/POST /mcp` endpoints routed through the API service.
- Production-ready Supabase/Postgres schema in `supabase/migrations/001_reality.sql`.

## Privacy

Reality does not store continuous raw video. Live video stays in the browser. The application stores structured observations, events, and optionally event snapshots.

## MCP

Use the deployed HTTPS URL with `/mcp`. The endpoint exposes:

`get_current_state`, `inspect_zone`, `find_object`, `count_objects`, `search_events`, `get_recent_changes`, and `get_camera_status`.

The local demo server uses a mock perception provider. To connect a real vision provider, implement the `visionService` boundary and supply provider configuration through Replit Secrets; no secret belongs in source code or client bundles.