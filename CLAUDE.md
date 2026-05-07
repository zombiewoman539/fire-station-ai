# FIRE Station — Goals Mapper

## What This App Is

A Singapore-focused financial planning tool for financial advisors. Advisors create and manage client profiles, model each client's FIRE (Financial Independence, Retire Early) journey, and present projections in client meetings.

**Live at**: Vercel (production); `localhost:3000` for local dev.

## Tech Stack

- **React 19** + **TypeScript** (CRA / react-scripts 5)
- **Tailwind CSS v4** (PostCSS plugin, not the old CLI)
- **Chart.js 4** + react-chartjs-2 + chartjs-plugin-annotation
- **Supabase** — Auth (Google OAuth) + Postgres cloud storage for profiles
- No backend; all calculation logic is client-side

## Project Structure

```
src/
  types.ts              — All TypeScript interfaces (FireInputs, YearData, FireResults, etc.)
  profileTypes.ts       — ClientProfile interface
  defaults.ts           — Default inputs & purchases (Singapore-typical values)
  calculations.ts       — Core FIRE engine (SWR-based) + formatSGD. No CPF logic — see "CPF (deferred)" below.
  App.tsx               — Root: AuthGate → Dashboard (layout, state, auto-save)
  components/
    EditModal.tsx       — Primary client-input UI (modal opened from the toolbar). All inputs live here.
    InputPanel.tsx      — Legacy / unrendered. Do NOT add new inputs here.
    ChartPanel.tsx      — Right panel: net worth chart
    ProfileManager.tsx  — Profile switcher at top of sidebar
    AuthGate.tsx        — Google OAuth login screen
    InsightsPanel.tsx   — Bottom drawer: AI-style insights
    MilestoneTracker.tsx — Bottom drawer: milestone list
    ScenarioPanel.tsx   — Bottom drawer: What-If scenarios
    PresentationMode.tsx — Full-screen client presentation overlay
    ExportReport.tsx    — PDF/report export button
  services/
    supabaseClient.ts   — Supabase client (env vars or hardcoded fallback)
    profileStorageSupabase.ts — CRUD for ClientProfile in Supabase
    profileStorage.ts   — (legacy local storage, largely unused)
    savedViewsService.ts — CRUD for the saved_views table
  components/Dashboard/  — Saved-views + chip-based filter system
    DashboardShell.tsx     — orchestrator: rail + filter bar + ClientTable
    SavedViewsRail.tsx     — left rail (built-in / personal / team views)
    FilterBar.tsx          — chip toolbar + search + Save buttons
    FilterChip.tsx         — single chip pill + popover editor
    AddFilterMenu.tsx      — cascading "+ Add filter" menu
    ClientTable.tsx        — generic table; columnSet = advisor | fire | insurance
    SaveViewModal.tsx      — name + scope picker
    filterMeta.ts          — per-field metadata (label, ops, value editor, render)
  enrichProfile.ts    — One-shot per-row computation (FIRE + insurance + activity flags)
  filterEngine.ts     — Pure: applyFilters / applySearch / compareRows
  builtInViews.ts     — Hardcoded system views (read-only, merged into rail at runtime)
  insuranceCompute.ts — Insurance gap + signal-score logic (used by enrichProfile)
  savedViewsTypes.ts  — Shared types: FilterChip, ViewConfig, SavedView, ResolvedView
```

### Adding a new filter field

To extend the dashboard with a new filter dimension:
1. Add the field to `FilterField` in `savedViewsTypes.ts`.
2. Surface its raw value in `EnrichedProfile` (`enrichProfile.ts`).
3. Map `FilterField` → value in `getFieldValue()` inside `filterEngine.ts`.
4. Add UI metadata in `FILTER_FIELDS` in `components/Dashboard/filterMeta.ts` (group, label, allowed ops, default chip, value renderer).
The chip menu, value editor, engine, and built-in view authoring all read this metadata — no other UI changes needed.

## Key Domain Concepts

### CPF (deferred — not modelled)
CPF logic was intentionally stripped from the engine. There is no OA/SA/MA account tracking, no age-banded contribution rates, no BHS, and no CPF LIFE annuity. Adding it back is a future feature, not a near-term concern. Until then, all FIRE numbers are pure SWR-on-take-home-pay with no SG-specific quirks.

### FIRE Number
Calculated via SWR (Safe Withdrawal Rate, default 3.5%):
- Net drawdown = inflated retirement expenses (no CPF LIFE deduction since CPF isn't modelled)
- Core portfolio = net drawdown / SWR
- +10% inflation buffer on top

### Income Model
`annualIncome` is **take-home pay** — already net of CPF + tax. The EditModal labels it "Annual Take-Home Income after deductions and tax". Surplus goes to investments (after a cash buffer threshold).

### Scenarios (What-If)
Four types: `none`, `critical-illness` (with CI sub-type), `tpd`, `death`. Scenarios apply insurance payouts and model income loss.

## Auth & Dev

- **Production**: Google OAuth via Supabase. Users must be signed in.
- **Local dev**: `localhost` / `127.0.0.1` skips auth entirely; uses a local `'local-dev'` profile (not persisted to Supabase unless a session is active).
- Auth check has a 4-second safety timeout to prevent hanging on network issues.

## Auto-Save

Inputs auto-save to Supabase with an **800ms debounce** after each change. Save status shown in ProfileManager (`saving` → `saved` → `idle`).

## Layout

```
┌─────────────────────────────────────────────┐
│  ProfileManager (top of sidebar)             │
├──────────────┬──────────────────────────────┤
│  Sidebar     │  ChartPanel + toolbar         │
│  (profiles + │  (flex-1)                     │
│   nav)       │  Click "Edit" → EditModal     │
│              │  opens (primary input UI)     │
│              ├──────────────────────────────┤
│              │  Bottom drawer (340px max):   │
│              │  Insights | What If           │
└──────────────┴──────────────────────────────┘
```

Sidebar collapses to 0 width with a toggle button. Bottom drawer toggles between `insights` and `scenarios` tabs (clicking active tab closes it). Client inputs are edited inside the EditModal overlay, not in the left sidebar.

## Common Tasks

### Run locally
```bash
npm start
```
No env vars needed for local dev — Supabase client falls back to hardcoded credentials.

### Build for Vercel
```bash
npm run build
```
Vercel picks up `build/` automatically.

### Add a new input field
1. Add the field to the relevant interface in `types.ts`
2. Update `defaultInputs` in `defaults.ts`
3. Add the input UI in the relevant section of `EditModal.tsx` (e.g. `AssetsSection`, `IncomeSection`, etc. — NOT `InputPanel.tsx`)
4. Use the value in `calculations.ts`
5. If the field affects an existing client's stored data, add a defaulted fallback in `migrateInputs()` in `services/profileStorageSupabase.ts`

## Source-of-Truth Files — Read Before Coding

These files contain agreed decisions. **Always read them before implementing anything in their domain:**

| File | Domain |
|---|---|
| `TIERS.md` | Subscription tiers, pricing (SGD), feature gates, Stripe Price IDs |
| `CLAUDE.md` (this file) | Architecture, stack, conventions |

**Pricing quick-ref (from TIERS.md):**
- Starter: Free
- Pro: S$59/mo · S$590/yr
- Team: S$149/mo · S$1,490/yr

Do not invent or estimate these numbers — always copy from TIERS.md.

## What to Avoid

- Do not add error handling for impossible states inside the calculation engine — it's pure math with validated inputs.
- Do not mock Supabase in tests — the project doesn't have integration tests yet; unit tests should test `calculations.ts` directly.
- The `annualIncome` field is **take-home pay** (already net of CPF + tax). The EditModal label confirms this. Do not deduct anything else from it.
- Tailwind v4 uses the PostCSS plugin approach, not `tailwind.config.js` — don't add one.
