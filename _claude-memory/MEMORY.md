# Memory Index

- [Screen Names](screen_names.md) — Internal names for the two main screens in FIRE Station
- [EditModal is the real input UI](feedback_editmodal_is_the_real_input_ui.md) — InputPanel.tsx is not rendered; all client input editing is in EditModal.tsx
- [Auto commit and push](feedback_auto_commit_push.md) — Always commit and push automatically after changes, no confirmation needed
- [Light/dark mode discipline](feedback_light_dark_mode.md) — Every new page/component must use CSS vars for all colors; page wrappers need background: var(--bg) and color: var(--text-1)
- [Run commands directly](feedback_run_commands_directly.md) — Always run terminal commands directly; don't ask user to copy-paste them
- [Completed Features](project_completed_features.md) — All major features shipped (1A–1C, 2A–2C, 3A–3D, security, soft-delete, Stripe)
- [Infrastructure & Deployment](project_infrastructure.md) — Supabase project ID, Stripe, Vercel, env vars, CLI paths
- [Agreed Pricing](project_pricing.md) — EXACT SGD prices per tier (Pro S$59/mo, Team S$149/mo) + Stripe Price IDs — do not invent
- [Read source-of-truth files first](feedback_read_source_of_truth_files.md) — Always read TIERS.md etc. before coding anything in that domain
- [Nav segmentation — Dashboard vs Team](project_nav_segmentation.md) — Dashboard=daily monitoring, Team=org admin only; future hierarchy/tree view planned for Team
- [Feature Backlog](project_backlog.md) — Planned but not-yet-built features: Hospital Plans, Stripe trials, Recurring tasks, Pipeline stages, Manager hierarchy
- [Bug Fixes Log](bug_fixes_log.md) — All 18 confirmed+fixed bugs across 3 hunt rounds, plus areas already audited clean — read before any future bug hunt
- [Cross-platform setup](user_cross_platform.md) — User works on Mac + Windows PC; _claude-memory/ in repo is the source of truth for memories across machines
