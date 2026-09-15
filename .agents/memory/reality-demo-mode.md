---
name: Reality demo mode
description: Why Reality has a mock perception path and how it relates to production persistence.
---

Reality's first MVP keeps the perception provider replaceable and uses an in-process demo store when no vision credentials are configured. Each mock scan alternates the desk's Coca Cola count, which makes event generation and MCP responses testable without external services.

**Why:** The central product value is the structured physical-world state and temporal change pipeline, not a dependency on one vision vendor. A deterministic local mode keeps the critical flow usable during development and previews.

**How to apply:** Preserve the mock path when adding a real vision provider, and keep the production database schema as the persistence contract rather than coupling world-state logic to a UI or provider.