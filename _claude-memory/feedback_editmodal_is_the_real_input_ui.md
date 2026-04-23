---
name: EditModal is the real input UI — InputPanel is not rendered
description: All client input editing happens in EditModal.tsx. InputPanel.tsx exists but is not imported or rendered anywhere in App.tsx.
type: feedback
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
All financial input changes (income, expenses, assets, purchases, insurance, etc.) must be made in `src/components/EditModal.tsx` — this is the component actually rendered in the app.

`src/components/InputPanel.tsx` exists in the codebase but is **not imported or used in App.tsx**. Changes made only to InputPanel.tsx will not be visible to users.

**Why:** Discovered after building Phase 1 QoL features (expense breakdown, investment buckets, purchase presets) into InputPanel — none of them appeared on the live site. The fix was porting everything to EditModal.

**How to apply:** Whenever adding or changing any input field, section, or UI element that the advisor interacts with when editing a client profile, always work in `EditModal.tsx`. Verify with `grep -n "InputPanel" src/App.tsx` before starting — it should return no results.
