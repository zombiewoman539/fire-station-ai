---
name: Feature Backlog
description: Planned features that are scoped but not yet built — check here before starting new work
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
## Hospital Plans (Singapore ISP)

**Status:** Planned, do not build yet.

**Why:** Singapore healthcare uses a layered system — MediShield Life (mandatory government base) + optional Integrated Shield Plan (ISP) upgrade + optional rider (zero co-payment). This is a major FA product category, distinct from life/CI policies (annual-renewable, no sum assured, advisor sell is ISP + rider upsell).

**Proposed data model — new `hospitalPlan?: HospitalPlan` field in `FireInputs`:**
```
HospitalPlan {
  hasMediShieldLife: boolean       // always true for SC/PR — default checked
  hasISP: boolean
  ispInsurer: string               // AIA | NTUC Income | HSBC Life | Great Eastern | Prudential | Raffles
  ispWardClass: 'B1' | 'A' | 'Private' | ''
  hasRider: boolean                // rider = zero co-payment — the key upsell
  annualPremiumMedisave: number    // ISP base portion paid from MA
  annualPremiumCash: number        // rider must be 100% cash → flows into annual expenses
}
```

**What to build when ready:**
- `HospitalPlan` interface in `types.ts`, add `hospitalPlan?` to `FireInputs`
- Default in `defaults.ts`
- New "Hospital Plan" section in `EditModal` (inside Policies/Insurance tab)
- Update `computeInsurance()` in `ManagerDashboardPage.tsx` to include hospital signal
- 2 new intel cards: "No ISP (N clients)" and "No rider (N clients)"
- 3 buying signal tiers: No ISP → No rider → Wrong ward class

**FIRE calc impact:** `annualPremiumCash` reduces annual investable surplus (add to expenses).

---

## Stripe Trials

**Status:** Planned, do not build yet.

**Why:** Push trials through Stripe API so free-trial users auto-convert to paid when trial ends. Reduces manual follow-up.

---

## Recurring Tasks

**Status:** Deferred from brainstorm.

**Why:** Manager sets a task template that auto-creates every N weeks (e.g. "Monthly check-in with [client]"). Useful for systematic follow-up cadence.

---

## Client Pipeline Stages

**Status:** Deferred from brainstorm.

**Why:** Prospect → Engaged → Proposal → Active stages on each client profile. The deal-closure lever for FAs. Needs a new `stage` field on `client_profiles` and a visual pipeline view.

---

## Manager Hierarchy / Tree View

**Status:** Planned, do not build yet. (Also documented in project_nav_segmentation.md)

**Why:** FA businesses are pyramid-structured. Senior managers oversee junior managers who manage advisors. Needs a "Hierarchy" tab on the Team page with a tree diagram.

**DB change needed:** Add `reports_to_user_id` (nullable FK) to `team_memberships`.
