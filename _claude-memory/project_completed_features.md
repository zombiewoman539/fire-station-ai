---
name: Completed Features
description: Record of all major features shipped in FIRE Station, so future sessions know what's done
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
## Shipped as of 2026-04-21

### Core App (Features 1A–1C)
- **1A** — Expense breakdown panel
- **1B** — Custom investment buckets
- **1C** — Purchase presets

### Team / Manager CRM (Features 3A–3D)
- Manager Dashboard at `/team` (`ManagerDashboard.tsx`)
- Team invite system (`InviteModal.tsx`, `TeamOnboarding.tsx`, `TeamContext.tsx`)
- Supabase RLS + audit log migration deployed

### Security & Privacy
- Supabase credentials moved to `.env.local` (gitignored)
- HTML escaping in ExportReport (XSS fix)
- HTTP security headers via `vercel.json`
- Audit log table + trigger in Supabase
- PDPA-compliant Privacy Policy page at `/privacy` (no auth required)

### Soft Delete / Recently Deleted
- 7-day soft delete window; FAs can restore accidentally deleted profiles
- `listDeletedProfiles()` and `restoreProfile()` in `profileStorageSupabase.ts`
- Recently Deleted modal in `ProfileManager.tsx`

### Subscription / Monetisation (Features 2A–2C)
- **3 tiers**: Starter (free), Pro (SGD 29/mo or 290/yr), Team (SGD 79/mo or 790/yr)
- Stripe Checkout via Supabase Edge Function (`create-checkout-session`)
- Stripe webhook handler (`stripe-webhook`) maps price IDs → tiers, updates `subscriptions` table
- `SubscriptionContext` exposes `tier`, `isPro`, `isTeam`, `refresh` app-wide
- **Feature gates**:
  - Starter: max 3 client profiles
  - Insights panel: Pro/Team only
  - Presentation mode: Pro/Team only
  - Advisor Dashboard (`/dashboard`): Pro/Team only (`ProRoute` guard)

### Stripe Price IDs (live)
- pro_monthly:  price_1TOLYyKQ4OjU0R9eXyO9p85H
- pro_annual:   price_1TOLZDKQ4OjU0R9ey7JlCVHA
- team_monthly: price_1TOLZdKQ4OjU0R9egp11z5gX
- team_annual:  price_1TOLZuKQ4OjU0R9e1aYCnGvk

**How to apply:** Before suggesting a feature, check here to avoid re-implementing something that's already done.
