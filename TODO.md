# TODO — FIRE Station

Items from user feedback and planning sessions.

---

## From Feedback Session (2026-04-24)

### 1. Nominations — split across multiple beneficiaries totalling 100%
**Current state:** Each insurance policy has a single `nomineeName` + optional `nomineeClientId`. The UI is a name field/client link.
**What's needed:** Support multiple nominees with a percentage split that must total 100% (similar to how ILP fund allocations work). E.g. 50% spouse, 50% child.
**Files:** `src/types.ts` (InsurancePolicy interface), `src/components/EditModal.tsx` (lines ~943–991)

---

### 2. ILP — treat as investment, not just insurance
**Current state:** ILP is one of six `policyType` options. Fund allocations are tracked but the fund value isn't modelled in the investment portfolio or net worth projection.
**What's needed:** Design decision needed — the investment portion of an ILP should likely contribute to the client's investable assets / net worth. Cash value grows with the fund. This is architecturally different from a pure protection policy.
**Files:** `src/types.ts`, `src/calculations.ts`, `src/components/EditModal.tsx` (lines ~858–899)
**Note:** Needs design thinking before coding.

---

### 3. Housing — rename "recurring payments" to "mortgage"
**Current state:** In the MajorPurchase editor, the recurring cost fields are labelled generically ("recurring payments", `recurringCost`, `recurringYears`).
**What's needed:** Rename UI label from "Recurring payments" → "Mortgage / recurring payments" (or just "Mortgage") so it's clearer for housing purchases.
**Files:** `src/components/EditModal.tsx` (MajorPurchase recurring cost section)

---

### 4. LPA — support up to 2 donees + 1 replacement donee
**Current state:** LPA is a simple boolean (`lpa: boolean` in `EstatePlanning`). The description says "a trusted person" (singular). No donee names stored.
**What's needed:** Expand to store up to 2 donees and 1 replacement donee (names, at minimum). Matches Singapore OPG rules — a donor can appoint up to 2 donees, plus 1 replacement donee.
**Files:** `src/types.ts` (EstatePlanning interface), `src/components/EditModal.tsx` (lines ~1149–1151), `src/defaults.ts`

---

## Backlog (from prior planning)

See [project_backlog.md](_claude-memory/project_backlog.md) for the full feature backlog including Hospital Plans, Stripe trials, recurring tasks, pipeline stages, and manager hierarchy.

See the [Strategic Roadmap](_claude-memory/) for CPF modelling, AI Meeting Notes, Fact-Find Wizard, Risk Profiling, and Live Presentation editing priorities.
