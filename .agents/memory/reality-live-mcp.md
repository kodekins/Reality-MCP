---
name: Reality live MCP and persistence
description: Production MCP access depends on the published HTTPS URL and a provisioned Supabase schema.
---

The Reality MCP endpoint is intentionally stateless Streamable HTTP and reads only Supabase REST data. The editor preview URL can trigger Replit sign-in for external clients; Claude must use the published HTTPS `/mcp` URL after publishing.

**Why:** Remote MCP clients cannot use an authenticated workspace preview, and returning in-memory demo data would misrepresent the physical world.

**How to apply:** Keep MCP responses explicit when the Supabase schema is absent, run the Reality migration before live use, and verify public `initialize`, `tools/list`, and tool calls after every publish.