---
name: Light/dark mode discipline
description: Every new page/component must use CSS variables for all colors — never hardcode theme-sensitive values
type: feedback
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
Every new page or component must support light and dark mode from the start.

**Why:** The app has two themes (dark default, light toggle) via CSS variables in index.css. Hardcoded colors break one of the two themes.

**How to apply:**
- Page wrapper divs must always set `background: 'var(--bg)'` and `color: 'var(--text-1)'`
- Use CSS variables for all text and background colors: `--text-1` through `--text-5`, `--surface`, `--card`, `--inset`, `--border`, `--input-bg`, `--input-border`
- Brand/accent colors (e.g. `#34d399`, `#f87171`, `#10b981`, `#60a5fa`) are intentional and fine in both modes
- Semi-transparent overlays like `rgba(0,0,0,0.5)` for modal backdrops are acceptable
- CSS variables CAN be used as inline React style values — `color: 'var(--text-4)'` is valid
- Do NOT use hardcoded grays like `#6b7280`, `#374151`, `#1f2937` for text or backgrounds — those are dark-mode-only values
