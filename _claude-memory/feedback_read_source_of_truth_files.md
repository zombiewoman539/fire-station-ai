---
name: Read source-of-truth files before implementing
description: Always read TIERS.md and any other agreed-spec files before writing code that touches those domains
type: feedback
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
Before writing any code that involves pricing, tier features, or business rules: read the relevant source-of-truth file in the repo first (e.g. TIERS.md for pricing, CLAUDE.md for architecture).

**Why:** In a session where conversation history was compacted, specific agreed pricing numbers (S$59/S$149) were lost from the summary. The next session built PlansPage without reading TIERS.md and used invented prices (S$29/S$79) instead — which the user had to catch and correct.

**How to apply:** Whenever implementing a feature that touches a domain that likely has an agreed spec (pricing, feature gates, tier limits), run a quick Grep/Read of relevant docs first. If no doc exists yet for something the user agreed to, write one immediately so it survives context resets.
