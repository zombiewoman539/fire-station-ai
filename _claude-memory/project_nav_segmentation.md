---
name: Nav segmentation — Dashboard vs Team
description: Agreed product design for what each nav item owns, and the Team page roadmap including hierarchy
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
## Agreed segmentation

**Dashboard** (`/dashboard`) — "What do I need to know today?"
- Daily-use page, data-driven, time-sensitive
- Manager view: leaderboard, stale clients, monthly targets, future pipeline health
- Advisor view: own portfolio stats, upcoming premiums, client health flags
- Everything that drives action goes here

**Team** (`/team`) — "Who is on my team?"
- Infrequent, structural/admin only
- Invite advisor, remove advisor, see pending invites, dissolve org
- No analytics, no client lists, no tasks — purely org admin
- Visited maybe once a week

**Tasks** (`/tasks`) — personal task list, unchanged for both roles

## Team page cleanup (done)
- Removed the Tasks tab from Team page (tasks live at /tasks)
- Removed the All Clients tab from Team page (de-emphasised)
- Team page is now: members list + invite + danger zone

**Why:** Dashboard = daily monitoring. Team = admin. Clean separation prevents the Team page from becoming a dumping ground.

## Future: Manager hierarchy / tree view

FA businesses are structured pyramids — senior managers oversee junior managers who manage advisors. We will need to model this eventually.

**Planned feature:**
- New "Hierarchy" tab on the Team page (tab 2 after Members)
- Tree diagram showing the reporting structure: who manages whom
- Nodes: each person shown with their name, role, client count
- Eventually: sub-managers can be invited and assigned their own advisor pools
- DB model needed: add `reports_to_user_id` (nullable) to `team_memberships`
- The current flat structure (one manager, N advisors) becomes the base case of the tree

**Why:** Do not build now — the flat model covers the immediate use case. Revisit when a customer needs multi-level management.
