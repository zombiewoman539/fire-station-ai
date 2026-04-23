---
name: Agreed Pricing
description: The exact SGD prices agreed with user for each tier — DO NOT change without explicit user instruction
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
## Tier Pricing (agreed, source of truth: TIERS.md)

| Tier | Monthly | Annual | Effective/mo |
|---|---|---|---|
| Starter | Free | Free | — |
| Pro | S$59/mo | S$590/yr | S$49/mo |
| Team | S$149/mo | S$1,490/yr | S$124/mo |

All prices are ex-GST, in SGD.

Annual discount is ~17% for both paid tiers.

## Stripe Price IDs (live)
- Pro monthly:  price_1TOLYyKQ4OjU0R9eXyO9p85H  → S$59
- Pro annual:   price_1TOLZDKQ4OjU0R9ey7JlCVHA  → S$590
- Team monthly: price_1TOLZdKQ4OjU0R9egp11z5gX  → S$149
- Team annual:  price_1TOLZuKQ4OjU0R9e1aYCnGvk  → S$1,490

**Why:** These were explicitly agreed with the user in a prior conversation and documented in TIERS.md. A previous session forgot them and used wrong prices (S$29/S$79) because the amounts weren't in memory and TIERS.md wasn't read before building PlansPage.

**How to apply:** Any time pricing is displayed or referenced in code, cross-check against this memory AND TIERS.md before writing numbers. Never invent or estimate prices.
