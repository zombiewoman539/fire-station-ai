---
name: Screen Names
description: Internal reference names for the main screens in FIRE Station to avoid ambiguity
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
**Advisor Dashboard** — the `/dashboard` route (`AdvisorDashboard.tsx`). Overview of all clients with stats, filters, and per-client summary rows.

**Client Report** — the full-screen PresentationMode overlay (`PresentationMode.tsx`) shown to clients during meetings.

The per-client inputs/chart screen (where the advisor edits inputs, views the chart and drawers) does not yet have an agreed name.

**Why:** User said "dashboard" and it was initially unclear — they meant the Advisor Dashboard at /dashboard, not the per-client screen. Established these names so future conversations don't get confused.

**How to apply:** Always use these names when discussing which screen a feature lives on or should be added to.
