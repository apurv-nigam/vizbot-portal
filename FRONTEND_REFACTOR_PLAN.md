# Vizbot Portal — Frontend Refactor Plan

**Context:** This document describes changes needed in the `vizbot-portal` React frontend to align with the new backend architecture and wireframe design. Give this to the frontend developer or Claude Code working on the portal.

---

## Current State

The vizbot-portal frontend is a React 19 app (Vite + TanStack Query + Auth0 + Tailwind + Radix UI) with these pages:

### Current Sidebar Navigation
```
Dashboard
Projects        → list of workflow templates (cards)
Teams           → flat list of teams (cards)
Jobs            → (accessed via project detail)
```

### Current Data Model (in the frontend's mental model)
- **Projects** own workflow templates (capture_config) and jobs are listed under them
- **Teams** are flat — each team has members and sites
- **Sites** live under teams (`/groups/:id/sites`)
- **Jobs** live under projects (`/projects/:id/jobs/:jobId`)
- There is no concept of group hierarchy or unassigned sites

### Current Routes
```
/dashboard              → DashboardPage
/projects/new           → CreateProjectPage
/projects/:id           → ProjectDetailPage (shows jobs list)
/projects/:id/workflow  → WorkflowBuilderPage
/projects/:id/jobs/new  → CreateJobPage
/projects/:id/jobs/:id  → JobDetailPage
/teams                  → TeamsPage (list)
/groups/:id              → TeamDetailPage (members, sites, bulk import)
/profile                → ProfilePage
```

### Current API Calls (from src/lib/queries.js)
- Teams: `GET /teams`, `GET /groups/:id`, `POST /teams`, `GET /groups/:id/sites`, `POST /groups/:id/sites/bulk`
- Sites: `GET /sites/:id`, `PATCH /sites/:id`, `POST /sites/:id/transfer`
- Jobs: `GET /jobs?project_id=X&status=Y`, `POST /jobs`, `POST /jobs/bulk`, `GET /jobs/:id`, `POST /jobs/:id/review`, etc.
- Projects: `GET /projects`, `GET /projects/:id`, `POST /projects`, `PATCH /projects/:id`

---

## Why We're Changing

1. **Teams are being replaced by Groups** — the flat team model doesn't support the real-world hierarchy (Circle > Zone > Cluster). Groups are generic containers that can be nested to any depth. The backend `teams` table is being replaced/renamed to `groups`.

2. **Sites are now the primary concept** — sites are physical locations that exist independently. They get organized INTO groups, not created under teams. Many sites may be unassigned (imported but not yet organized).

3. **Projects are renamed to Workflow Templates** — they're org-level workflow definitions, not containers for jobs/sites. The name "project" confused users into thinking sites belonged to projects.

4. **Jobs are flat resources** — jobs are accessed by ID (`/jobs/:id`), not nested under projects. They reference both a workflow template (project_id) and a site (site_id).

5. **Bottom-up hierarchy** — clients create groups and nest them later. They don't have to use all levels. A client with 26 sites might just create 3 flat groups. A client with 500 sites might create 3 levels of nesting.

---

## New Data Model

```
Org
  ├── Workflow Templates (org-level, formerly "projects")
  │     Each has capture_config defining tasks and fields
  │
  ├── Sites (org-level, physical locations)
  │     Each has: name, code, state, district, lat/lng, type, group_id (nullable)
  │     Sites with group_id=null are "unassigned"
  │
  ├── Groups (org-level, generic hierarchy)
  │     Each has: name, parent_id (nullable), manager
  │     parent_id=null means root-level group
  │     A group with no children is a "leaf group" — sites can only be assigned to leaves
  │     Groups can be nested: root > child > grandchild (any depth)
  │     Labels (Circle/Zone/Cluster) are derived from depth, not stored
  │
  └── Jobs (org-level, flat)
        Each has: project_id (workflow), site_id, assigned_to, status, due_date
        Status: pending → in_progress → submitted → reviewed (with rework loop)
```

---

## New Sidebar Navigation

```
Dashboard

SITES
⊙ All Sites                    (26)     ← flat table of every site
    ▸ Telangana                 (12)     ← groups appear as tree nodes
        Hyderabad Cluster        (6)     ← child groups indented
        Warangal Cluster         (6)
    ▸ UP West                    (8)
    Unassigned                  (12)     ← shown at bottom if count > 0, red badge

WORK
  Workflows                      (3)     ← formerly "Projects"
  Jobs                           (3)     ← flat, with filters
```

Key behaviors:
- Groups appear inline under "All Sites" as an expandable tree
- Tree builds itself as groups are created — if no groups exist, only "All Sites" and "Unassigned" show
- "Unassigned" appears at the bottom of the sites section with a red badge; hidden when count is 0
- Clicking a group navigates to a group drill-down view
- Tree nodes are expandable/collapsible with chevrons

---

## New Routes

```
/dashboard                    → DashboardPage (updated)
/sites                        → SitesPage (NEW — flat table of all sites)
/sites/unassigned             → SitesPage with pre-filter (or same page with filter param)
/groups                       → GroupsPage (NEW — root-level groups view)
/groups/:id                   → GroupDetailPage (NEW — drill-down into a group)
/workflows                    → WorkflowsPage (renamed from /projects, same content)
/workflows/new                → CreateWorkflowPage (renamed)
/workflows/:id                → WorkflowDetailPage (renamed, shows workflow tasks)
/workflows/:id/builder        → WorkflowBuilderPage (existing)
/jobs                         → JobsPage (NEW — flat table with filters)
/jobs/new                     → CreateJobPage (updated — project_id in body, not URL)
/jobs/:id                     → JobDetailPage (updated — no project_id in URL)
/profile                      → ProfilePage (unchanged)
/onboarding                   → OnboardingPage (unchanged)
```

Routes to REMOVE:
- `/projects/*` → replaced by `/workflows/*`
- `/groups/*` → replaced by `/groups/*` and `/sites`
- `/projects/:id/jobs/*` → replaced by `/jobs/*`

---

## New Pages — Detailed Specs

### 1. SitesPage (NEW) — `/sites`

**Purpose:** Flat inventory of every site in the org.

**Layout:** Full-width table with detail panel on the right (350px, slides open on row click).

**Top bar:** Title "All Sites" with subtitle "26 sites · 12 unassigned". Buttons: "Import CSV", "+ Add Site".

**Filters toolbar:** Search input (name, code, district), State dropdown, Assignment dropdown (All / Unassigned / Assigned).

**Table columns:** Checkbox, Site (name + code), State, District, Group (clickable link to group, or "Unassigned" in amber), Technician, Type, Status badge.

**Unassigned banner:** If unassigned sites exist, show amber banner above the table: "X sites not assigned to any group — Select sites and use 'Assign to Group'". Button: "Show only unassigned" (sets filter).

**Bulk actions:** When checkboxes are selected, dark bar appears at top: "3 sites selected — Assign to Group / Assign Technician / Clear".

**Detail panel (right sidebar):** Opens when clicking a row. Shows:
- Site name, code, state, district, type, status
- Group assignment section: breadcrumb path if assigned, "Not assigned" warning with "Assign to Group" button if not
- Manager info (from the group)
- Technician section with "Change" link
- Site details (metadata)
- Close button (×)

**API calls:**
- Sites data comes from iterating through `GET /groups/:id/sites` for each team, OR we need a new `GET /sites` endpoint (org-level). Check if backend has this.
- For now, can use `GET /teams` + `GET /groups/:id/sites` for each team to build full site list, plus track unassigned separately.

### 2. GroupsPage (NEW) — `/groups`

**Purpose:** View and manage the group hierarchy. This is what you see when clicking a root-level group in the sidebar tree.

**Layout:** Main content with optional detail panel on the right.

**When no groups exist (empty state):**
- Large card: "No groups yet — Create your first group to start organizing your X sites." Button: "+ Create First Group"

**When groups exist (root level):**
- Stats row: Total Sites, Assigned, Unassigned, Groups count
- If unassigned sites exist: compact amber banner "X sites not assigned — View in Sites"
- Group cards in a 2-column grid: name, manager (avatar + name), stats (sites, active, sub-groups)
- "+ Add Group" button in top bar

**Group card shows:**
- Level badge (color based on depth: gold for depth 0, blue for depth 1, green for depth 2+)
- Group name
- Manager with small avatar
- Stats: total sites under this group (including descendants), active count, child group count
- Chevron indicating it's drillable

### 3. GroupDetailPage (NEW) — `/groups/:id`

**Purpose:** Drill-down view of a specific group.

**Top bar:** Breadcrumb: "All Groups / South-India / Telangana" — each clickable. Buttons: "Settings" (opens detail panel), "+ Add Group" (creates sub-group).

**Stats row:** Total Sites (in this group + descendants), Active, Maintenance, No Technician.

**Child groups:** If this group has children, show them as cards (same as root level).

**Sites table:** If this is a leaf group (no children), show sites table with checkboxes. If non-leaf, show all descendant sites with a "Group" column.

**Detail panel (triggered by "Settings" button):** Shows:
- Group name and computed level label
- Manager with "Change" link
- If has children: list of child groups (clickable)
- If leaf: list of direct sites (first 5)
- If non-leaf: info message "Sites can only be assigned to leaf groups"
- "Organize" section: "Move under..." button (opens modal), "Make root level" button (if has parent)
- Danger zone: "Delete Group" button

### 4. WorkflowsPage (RENAMED) — `/workflows`

Same content as current ProjectsPage, just renamed. Grid of workflow template cards.

### 5. WorkflowDetailPage (RENAMED) — `/workflows/:id`

Same content as current ProjectDetailPage, but:
- Remove the jobs list from this page (jobs are now on `/jobs`)
- Show workflow task list with expandable field details
- Button to open workflow builder

### 6. JobsPage (NEW or heavily modified) — `/jobs`

**Purpose:** Flat table of all jobs with filters.

**Filters:** Search, Workflow dropdown, Status dropdown, Group dropdown (optional).

**Table columns:** Title, Site (name + code), Workflow, Assigned To, Status badge, Due Date.

**Click row:** Navigate to `/jobs/:id`.

### 7. JobDetailPage (UPDATED) — `/jobs/:id`

Same as current but:
- URL changes from `/projects/:id/jobs/:jobId` to `/jobs/:id`
- Back button goes to `/jobs` not `/projects/:id`
- Otherwise same: info grid, action buttons (conditional), rework banner, submission checklist

### 8. CreateJobPage (UPDATED) — `/jobs/new`

Updated form:
- Workflow Template dropdown (was "Project")
- Site dropdown (searchable — from all assigned sites)
- Assign To dropdown
- Due Date
- Instructions
- Also: "Bulk Create" option that takes a group and creates one job per site in that group

### 9. DashboardPage (UPDATED)

Changes:
- "Projects" section renamed to "Workflow Templates"
- Remove site_count from project cards (sites no longer belong to projects)
- Add compact banner if unassigned sites exist: "X sites not assigned — View in Sites"
- Review queue and overdue list remain the same

---

## New Components Needed

### SidebarTree
A recursive component that renders the group hierarchy inline in the sidebar under "All Sites". Each node shows: expand chevron (if has children), group name, site count. Clicking navigates to `/groups/:id`. Expanding/collapsing is local state.

### SiteDetailPanel
Right sidebar panel (350px) showing site details. Used on SitesPage and GroupDetailPage. Receives a site object, shows group assignment, technician, metadata.

### GroupDetailPanel
Right sidebar panel showing group settings. Used on GroupDetailPage. Shows manager, children, organize actions, delete.

### AssignToGroupModal
Modal with dropdown of leaf groups (groups with no children). Shows breadcrumb path for each option. Used from SitesPage and GroupDetailPage bulk actions.

### MoveGroupModal
Modal for moving a group under another. Dropdown excludes self and descendants. Warning if target is a leaf with direct sites.

### BulkActionBar
Dark bar that appears at top when sites are selected. Shows count + action buttons. Used on SitesPage and GroupDetailPage.

---

## Complete API Reference

The backend has been fully refactored. There are no more `/teams` or `/projects` URLs. Everything uses the new names. No aliases needed.

### Workflows (`/api/v1/workflows`)

Workflow templates define what work to do (checklist tasks and fields).

```
GET    /api/v1/workflows                              → list all workflows
POST   /api/v1/workflows                              → create workflow
         Body: { "name": "...", "description": "...", "asset_type": "image" }
GET    /api/v1/workflows/:id                          → get workflow (includes capture_config)
PATCH  /api/v1/workflows/:id                          → update workflow
         Body: { "name": "...", "capture_config": {...} }  (any field optional)
DELETE /api/v1/workflows/:id                          → delete workflow
```

Response includes: `id, org_id, name, description, asset_type, capture_config, created_by, created_at, updated_at, job_count, task_count`

### Jobs (`/api/v1/jobs`)

Jobs connect a workflow + site + assignee. All flat — no nesting under workflows.

```
GET    /api/v1/jobs                                   → list jobs
         Query params: ?workflow_id=X &site_id=X &group_id=X &status=pending|in_progress|submitted|reviewed
POST   /api/v1/jobs                                   → create single job
         Body: { "title": "...", "workflow_id": "uuid", "site_id": "uuid", "assigned_to": "uuid", "due_date": "...", "instructions": "..." }
POST   /api/v1/jobs/bulk?workflow_id=X                → bulk create (one job per site in group)
         Body: { "group_id": "uuid", "assigned_to": "uuid", "due_date": "...", "instructions": "...", "site_ids": ["uuid",...] (optional, defaults to all in group) }
GET    /api/v1/jobs/:id                               → get job detail (includes submission data)
POST   /api/v1/jobs/:id/review                        → mark as reviewed (admin only, status must be submitted)
POST   /api/v1/jobs/:id/rework                        → send for rework (admin only, status must be submitted)
         Body: { "comments": { "<task_id>": "feedback text", ... } }
PATCH  /api/v1/jobs/:id/reassign                      → reassign to different user (admin only, status must be pending)
         Body: { "assigned_to": "uuid" }
POST   /api/v1/jobs/:id/resend                        → send reminder (admin only, status must be pending)
GET    /api/v1/jobs/mine                              → list jobs assigned to me (field worker)
POST   /api/v1/jobs/:id/submit                        → submit job (field worker)
         Body: { "submissions": { "<task_id>": { "<field_id>": "value", ... }, ... } }
```

JobResponse includes: `id, workflow_id, org_id, site_id, site_name, title, status, assigned_to, assigned_to_name, assigned_to_email, due_date, location, instructions, submissions, reviewed_at, reviewed_by, rework_comments, rework_count, created_by, created_at, updated_at`

MyJobResponse (field worker) includes: `id, workflow_id, workflow_name, org_id, title, status, assigned_to, due_date, location, instructions, submissions, rework_comments, rework_count, capture_config, created_at, updated_at`

### Sites (`/api/v1/sites`)

Physical locations. Flat access by ID, plus org-level listing with filters.

```
GET    /api/v1/sites                                  → list ALL sites in org
         Query params: ?state=X &district=X &site_type=X &search=X &assigned=unassigned|assigned &group_id=X
GET    /api/v1/sites/:id                              → get site
PATCH  /api/v1/sites/:id                              → update site (admin only)
DELETE /api/v1/sites/:id                              → delete site (admin only)
POST   /api/v1/sites/:id/transfer                     → move site to another group (admin only)
         Body: { "target_group_id": "uuid" }
```

SiteResponse includes: `id, group_id (nullable), org_id, name, code, state, district, latitude, longitude, site_type, metadata, created_at, updated_at`

### Sites under Groups (`/api/v1/groups/:id/sites`)

Create/list sites scoped to a specific group.

```
GET    /api/v1/groups/:id/sites                       → list sites in this group
         Query params: ?state=X &district=X &site_type=X &search=X
POST   /api/v1/groups/:id/sites                       → create site in this group (admin only)
         Body: { "name": "...", "code": "T-123", "state": "...", "district": "...", "latitude": 18.4, "longitude": 79.5, "site_type": "Outdoor (OD)", "metadata": {} }
POST   /api/v1/groups/:id/sites/bulk                  → bulk create sites in group (admin only)
         Body: [ { SiteCreate }, { SiteCreate }, ... ]
```

### Groups (`/api/v1/groups`)

Generic hierarchy containers. Support nesting via `parent_id`.

```
GET    /api/v1/groups                                 → list groups (owner/admin see all, others see their groups)
POST   /api/v1/groups                                 → create group (admin only)
         Body: { "name": "Telangana", "parent_id": "uuid-or-null" }
GET    /api/v1/groups/:id                             → get group detail (includes members list)
PATCH  /api/v1/groups/:id                             → update group (group admin or owner)
         Body: { "name": "...", "parent_id": "uuid-or-null" }
         Use parent_id to nest/move groups. Set null to make root-level.
DELETE /api/v1/groups/:id                             → delete group (owner only, must have no sites)
POST   /api/v1/groups/:id/members                     → add member (group admin or owner)
         Body: { "user_id": "uuid", "role": "admin|member|viewer" }
PATCH  /api/v1/groups/:id/members/:userId             → change member role (group admin or owner)
         Body: { "role": "admin|member|viewer" }
DELETE /api/v1/groups/:id/members/:userId             → remove member (group admin or owner)
```

GroupResponse includes: `id, org_id, parent_id (nullable), name, created_by, created_at, updated_at, member_count, site_count`

GroupDetailResponse adds: `members` (array of `{ id, user_id, name, email, role, added_at }`)

### Auth & Users

```
POST   /api/v1/auth/sync                              → sync user from Auth0 JWT
GET    /api/v1/users/me                               → get current user profile
PATCH  /api/v1/users/me                               → update profile
```

### Organization

```
POST   /api/v1/org/                                   → create org (first-time onboarding)
PATCH  /api/v1/org/                                   → update org name
GET    /api/v1/org/members                            → list all org members
PATCH  /api/v1/org/members/:userId/role               → change org role (owner only)
         Body: { "role": "owner|admin|member" }
POST   /api/v1/org/invite                             → invite member
         Body: { "email": "...", "role": "admin|member" }
GET    /api/v1/org/invitations                        → list pending invitations
```

### Invitations

```
GET    /api/v1/invitations/:id/details                → get invite details (PUBLIC, no auth)
POST   /api/v1/invitations/:id/accept                 → accept invitation
```

### Images

```
GET    /api/v1/workflows/:id/images                   → list images for workflow
POST   /api/v1/workflows/:id/images/upload?filename=X → get presigned upload URL
```

### Key Notes for Frontend

1. **No more `/teams` or `/projects` URLs.** The backend uses `/groups` and `/workflows` everywhere. Update all API calls.

2. **`GET /api/v1/sites` exists.** Flat org-level listing with filters. No need to aggregate from multiple group calls.

3. **Groups have `parent_id`.** `GET /groups` returns all groups with `parent_id` — build the tree client-side. `parent_id: null` = root level.

4. **Moving a group** is just `PATCH /groups/:id` with `{ "parent_id": "new-parent-uuid" }`. Set `null` to make root.

5. **Jobs use `workflow_id`** not `project_id`. The field is called `workflow_id` in both requests and responses.

6. **Sites have `group_id`** (nullable). Unassigned sites have `group_id: null`. Use `GET /sites?assigned=unassigned` to list them.

### Design Tokens (match wireframe)

```js
// For Tailwind config — matches wireframe/css/styles.css
colors: {
  primary: { DEFAULT: '#0F6E56', hover: '#085041', light: '#E1F5EE', text: '#064E3B' },
  danger: { DEFAULT: '#E24B4A', light: '#FEE2E2', text: '#7F1D1D' },
  warning: { DEFAULT: '#EF9F27', light: '#FAEEDA', text: '#633806' },
  info: { DEFAULT: '#85B7EB', light: '#E6F1FB', text: '#0C447C' },
  success: { light: '#D1FAE5', text: '#064E3B' },
  surface: '#FFFFFF',
  bg: '#F5F5F2',
  border: { DEFAULT: '#E8E8E4', hover: '#D0D0CC' },
}
fontFamily: { sans: ['DM Sans', 'system-ui'], mono: ['JetBrains Mono', 'monospace'] }
borderRadius: { DEFAULT: '10px', lg: '14px' }
```

### Visual Reference

The interactive wireframe is at `../vizbot-portal-api/wireframe/index.html`. Run:
```
npx live-server ../vizbot-portal-api/wireframe/
```
This is the spec — match it visually.

---

## Migration Strategy (Step by Step)

### Phase 1: Pre-work (low risk, no UI changes visible)
1. Create `src/lib/constants.js` — extract STATUS_CONFIG, ROLE_CONFIG, status strings from all pages into one file
2. Create query hook aliases: `useGroups = useGroups`, `useWorkflows = useProjects`
3. Extract TeamDetailPage modals into separate component files

### Phase 2: New pages (additive, no breaking changes)
4. Build SitesPage (`/sites`) — new page, new route, no conflict with existing
5. Build GroupsPage + GroupDetailPage (`/groups`, `/groups/:id`)
6. Build SidebarTree component
7. Build shared components: SiteDetailPanel, GroupDetailPanel, AssignToGroupModal, MoveGroupModal, BulkActionBar

### Phase 3: Sidebar restructure
8. Update AppShell.jsx sidebar to new navigation structure:
   - Replace "Projects" nav → "Workflows"
   - Replace "Teams" nav → Remove (groups are in sidebar tree under Sites)
   - Add "All Sites" with tree underneath
   - Add "Unassigned" sub-item
   - Add "Jobs" as top-level nav item

### Phase 4: Rename and redirect
9. Create `/workflows` route → renders existing ProjectsPage with renamed labels
10. Create `/workflows/:id` route → renders existing ProjectDetailPage with renamed labels
11. Update `/jobs` route to be standalone (not under `/projects/:id`)
12. Update CreateJobPage to work without project_id in URL
13. Add redirects: `/projects/*` → `/workflows/*`, `/groups/*` → `/groups/*`

### Phase 5: Cleanup
14. Remove old TeamsPage and TeamDetailPage (functionality moved to groups)
15. Remove old routes
16. Update DashboardPage to use new terminology

---

## Files to Create

```
src/lib/constants.js                    — shared status/role/type configs
src/pages/SitesPage.jsx                 — all sites table + detail panel
src/pages/GroupsPage.jsx                — root groups view
src/pages/GroupDetailPage.jsx           — drill-down into a group
src/pages/JobsPage.jsx                  — flat jobs table (may reuse from ProjectDetailPage)
src/components/SidebarTree.jsx          — recursive group tree for sidebar
src/components/SiteDetailPanel.jsx      — right panel for site details
src/components/GroupDetailPanel.jsx     — right panel for group settings
src/components/AssignToGroupModal.jsx   — assign sites to leaf group
src/components/MoveGroupModal.jsx       — move group under another
src/components/BulkActionBar.jsx        — dark bar for bulk site actions
```

## Files to Modify

```
src/components/AppShell.jsx             — sidebar navigation restructure
src/lib/queries.js                      — add alias hooks, possibly new queries
src/App.jsx                             — add new routes, rename old ones
src/pages/DashboardPage.jsx             — rename "Projects" to "Workflows"
src/pages/CreateJobPage.jsx             — remove project_id from URL dependency
src/pages/JobDetailPage.jsx             — update back navigation
```

## Files to Eventually Remove (Phase 5)

```
src/pages/TeamsPage.jsx                 — replaced by groups in sidebar
src/pages/TeamDetailPage.jsx            — replaced by GroupDetailPage
```

---

## Visual Reference

The working wireframe is at `../vizbot-portal-api/wireframe/index.html` — open it in a browser to see the exact UI being implemented. It has:
- The sidebar tree navigation
- All Sites page with detail panel
- Groups drill-down with breadcrumbs
- Unassigned sites banner
- Bulk selection and assignment
- Dashboard, Workflows, Jobs pages

Run `npx live-server ../vizbot-portal-api/wireframe/` to view it with auto-reload.
