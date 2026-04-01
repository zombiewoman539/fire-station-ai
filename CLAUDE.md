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
  calculations.ts       — Core FIRE engine + CPF logic + formatSGD
  App.tsx               — Root: AuthGate → Dashboard (layout, state, auto-save)
  components/
    InputPanel.tsx      — Left sidebar: all user inputs
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
```

## Key Domain Concepts

### Singapore CPF
CPF has three accounts: OA (Ordinary, 2.5%), SA (Special, 4%), MA (Medisave, 4%).
- Contribution rates are age-banded (from Jan 2026 rates).
- OW ceiling: S$8,000/month = S$96,000/year.
- Extra interest: 1% on first S$60k combined (OA capped at S$20k); additional 1% for 55+.
- BHS (Basic Healthcare Sum): S$79,000 in 2026, grows ~3.5%/yr until age 65 then fixed. MA overflow → SA.
- CPF LIFE: estimated monthly annuity from ~age 65, input as `cpfLifeMonthly`.

### FIRE Number
Calculated via SWR (Safe Withdrawal Rate, default 3.5%):
- Net drawdown = retirement expenses − CPF LIFE annual payout
- Core portfolio = net drawdown / SWR
- Pre-65 bridge = full expenses for years between retirement and 65 (CPF LIFE not yet active)
- +10% inflation buffer on top

### Income Model
`annualIncome` = **gross salary**. Employee CPF is deducted to derive take-home pay. Surplus goes to investments (after 6-month cash buffer top-up).

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
│  InputPanel  │  ChartPanel + toolbar         │
│  (380px,     │  (flex-1)                     │
│   scrollable)│                               │
│              ├──────────────────────────────┤
│              │  Bottom drawer (340px max):   │
│              │  Insights | What If           │
└──────────────┴──────────────────────────────┘
```

Sidebar collapses to 0 width with a toggle button. Bottom drawer toggles between `insights` and `scenarios` tabs (clicking active tab closes it).

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
3. Add the input UI in `InputPanel.tsx`
4. Use the value in `calculations.ts`

### CPF rates
All CPF logic lives in `calculations.ts` (lines 60–130). The rates are from **January 2026**.

## What to Avoid

- Do not add error handling for impossible states inside the calculation engine — it's pure math with validated inputs.
- Do not mock Supabase in tests — the project doesn't have integration tests yet; unit tests should test `calculations.ts` directly.
- The `annualIncome` field is **gross salary**, not take-home. Don't confuse the two.
- Tailwind v4 uses the PostCSS plugin approach, not `tailwind.config.js` — don't add one.
