---
name: Bug Fixes Log
description: Complete record of all bugs found and fixed — used in bug hunts to avoid re-investigating the same issues
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
All confirmed and fixed bugs, grouped by hunt round. Before starting a new bug hunt, read this file so none of these are re-reported or re-fixed.

---

## Round 0 — Pre-hunt fixes (shipped during feature work)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `App.tsx`, `ManagerDashboard.tsx` | Unused imports (`isPro`, `useMemo`, `listTasks`, `Task`) caused Vercel CI build failure | Removed unused imports |

---

## Round 1 — First deliberate bug hunt (role/permission focus)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 2 | `NavBar.tsx` | Team tab shown to any `tier === 'team'` user, including advisors | Changed condition to `isManager` only |
| 3 | `ManagerDashboard.tsx` | `/team` route had no role guard — advisors could navigate directly to org admin UI | Added early return with 🔒 screen if `teamStatus.role !== 'manager'` |
| 4 | `ManagerDashboardPage.tsx` | Stale profiles with removed advisor were silently dropped (`.filter(x => x.advisor)`) | Kept all stale profiles; render "Advisor removed" italic when advisor is null, hide action button |
| 5 | `ManagerDashboardPage.tsx` | Non-sortable column headers (Advisor, Hospital Plan) used `colHd('name')` key and highlighted when sorting by name | Applied `cursor:'default'`, `color:'var(--text-5)'`, `background:'transparent'` overrides |
| 6 | `EditModal.tsx` | Hospital plan premium inputs used `value \|\| ''` — treated `0` as falsy, clearing the field | Changed to `value > 0 ? value : ''` |

---

## Round 2 — Second bug hunt

| # | File | Bug | Fix |
|---|------|-----|-----|
| 7 | `teamService.ts` + `ManagerDashboardPage.tsx` | `getAllTeamProfiles()` fell back to raw UUID when advisor was removed — UUID shown as advisor name in table and filter dropdown | Changed fallback to `''`; UI shows "Advisor removed" italic |
| 8 | `ManagerDashboardPage.tsx` | FIRE view action column `<th>` used `colHd('name')` without `cursor/background` override — highlighted when sorting by name | Added `cursor:'default', background:'transparent'` overrides (Insurance view was already fixed) |
| 9 | `TasksPage.tsx` | "To do" `SectionHeader` passed `collapsed={false}` and `onToggle={() => {}}` — chevron button rendered but did nothing | Added `todoCollapsed` state, wired up like the "Completed" section |
| 10 | `ManagerDashboardPage.tsx` | `summary.totalClients` summed `advisor.clientCount` from leaderboard (active advisors only) — excluded manager's own clients and pending advisors' clients | Changed to `teamProfiles.length` |
| 11 | `ManagerDashboardPage.tsx` | `summary.newThisMonth` summed from leaderboard for same reason | Changed to `teamProfiles.filter(p => p.createdAt >= monthStart).length` |
| 12 | `teamService.ts` | `getMyTeamStatus()` had no `user_id` filter — relied on RLS alone. RLS allows all org members to see each other's rows, so advisors got the manager's row (created first) and inherited `role:'manager'` | Added `.eq('user_id', user.id)` filter |
| 13 | `ManagerDashboardPage.tsx` | `summary` useMemo missing `monthStart` and `teamProfiles` deps → Vercel CI lint failure | Added both to dep array |
| 14 | `ManagerDashboardPage.tsx` | `summary` useMemo had stale `leaderboard` dep after removing its usage → Vercel CI lint failure | Removed `leaderboard` from dep array |

---

## Round 3 — Third bug hunt

| # | File | Bug | Fix |
|---|------|-----|-----|
| 15 | `profileStorageSupabase.ts` | `purgeExpiredDeletions()` had no `user_id` filter — deleted all soft-deleted profiles older than 7 days for whoever's RLS scope applied. Manager's extended RLS could wipe other users' recoverable profiles | Added `.eq('user_id', user.id)` |
| 16 | `profileStorageSupabase.ts` | `migrateInputs()` did not add a default `hospitalPlan` — old profiles (stored before the field was added) had `inputs.hospitalPlan = undefined` after migration | Added `hospitalPlan: inputs.hospitalPlan ?? defaultInputs.hospitalPlan` |
| 17 | `ManagerDashboardPage.tsx` | `summary.openTasks`/`urgentTasks` counted from raw `tasks` array with no org filter — if RLS is permissive, counts include tasks from other orgs | Added org filter: only count tasks where `assignedTo` or `createdBy` is a known org member |
| 18 | `App.tsx` | `/admin` route was unguarded — any authenticated user could navigate to it directly; `AdminPage` had an internal check but only after loading delay, causing a flash | Added `AdminRoute` wrapper component that blocks non-admin users before `AdminPage` mounts |

---

## Areas already thoroughly audited (no bugs found)

- `AdvisorDashboard.tsx` — `listProfiles()` correctly RLS-scoped; sort logic sound; no role/permission issues
- `TasksPage.tsx` — `listMyTasks()` correctly filtered to `assigned_to = current user`; `listProfiles()` correctly scoped for client dropdown
- `ManagerDashboard.tsx` — role guard in place; `removeMember` correctly requires confirmation; manager self-removal protected client-side by `isManager` check hiding ✕ button
- `SettingsPage.tsx` — team section correctly branches on `teamStatus.role === 'manager'`
- `AdminPage.tsx` — has internal `userId !== ADMIN_USER_ID` check (now also backed by `AdminRoute`)
- `calculations.ts` — not audited for math bugs yet
- `premiumUtils.ts` — not audited yet
- Supabase RLS policies — not directly accessible (no migration files in repo); several queries rely on RLS without explicit user/org filters (noted but not changed where RLS is expected to be correct)
