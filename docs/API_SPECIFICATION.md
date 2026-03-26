# Vizbot — API Specification

**Base URL:** `http://localhost:8000/api/v1` (dev) | `https://<lambda-url>/api/v1` (prod)

**Authentication:** Every request (except invitation details) requires a Bearer token from Auth0.
```
Authorization: Bearer <jwt-access-token>
```

**Content Type:** All POST/PATCH requests use `Content-Type: application/json`.

**Error Format:** All errors return:
```json
{ "detail": "Error message string" }
```

**Common HTTP Status Codes:**
- `200` — Success
- `201` — Created
- `204` — Deleted (no body)
- `400` — Bad request (wrong status for action, validation failure)
- `401` — Unauthorized (missing/expired token)
- `403` — Forbidden (insufficient role)
- `404` — Not found
- `422` — Validation error (wrong body shape)

---

## 1. Auth & User Sync

### POST `/auth/sync`

**What it does:** Called immediately after Auth0 login. Syncs the Auth0 user to Vizbot's database. Creates the user record on first login, or updates name/avatar on subsequent logins. Also checks for pending org invitations.

**Who can call:** Any authenticated user.

**Request:** No body. The JWT token contains all needed claims.

**Response:**
```json
{
  "user_id": "uuid",
  "org_id": "uuid or null",
  "org_name": "ZRC Associates or null",
  "role": "owner|admin|member or null",
  "is_new": true,
  "pending_invitations": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "org_name": "ZRC Associates",
      "role": "admin",
      "invited_by_name": "Apurv Nigam"
    }
  ]
}
```

**Frontend behavior:**
- If `org_id` exists → navigate to dashboard
- If `org_id` is null and `pending_invitations` is not empty → show invitation acceptance screen
- If `org_id` is null and no invitations → navigate to onboarding (create org)
- If `is_new` is true → the user was just created in Vizbot

**Android behavior:** Same flow. Store `user_id`, `org_id`, `role` locally after sync.

---

### GET `/users/me`

**What it does:** Returns the current user's profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "apurv@gmail.com",
  "name": "Apurv Nigam",
  "avatar_url": "https://...",
  "created_at": "2026-03-18T00:00:00",
  "updated_at": "2026-03-18T00:00:00"
}
```

---

### PATCH `/users/me`

**What it does:** Updates the current user's display name.

**Request:**
```json
{ "name": "Apurv Nigam" }
```

---

## 2. Organization

### POST `/org/`

**What it does:** Creates a new organization. The calling user becomes the `owner`. A user can only belong to one org — calling this when already in an org returns 409.

**Request:**
```json
{ "name": "ZRC Associates" }
```

**Response:**
```json
{
  "org_id": "uuid",
  "name": "ZRC Associates",
  "slug": "zrc-associates",
  "role": "owner"
}
```

---

### PATCH `/org/`

**What it does:** Updates the org name. If the user has no org yet, this creates one (onboarding flow).

**Request:**
```json
{ "name": "ZRC Associates (Updated)" }
```

---

### GET `/org/members`

**What it does:** Lists all members of the current user's org, with their roles.

**Who can call:** Any org member.

**Response:**
```json
[
  {
    "user_id": "uuid",
    "email": "apurv@gmail.com",
    "name": "Apurv Nigam",
    "avatar_url": "https://...",
    "role": "owner",
    "joined_at": "2026-03-18T00:00:00"
  },
  {
    "user_id": "uuid",
    "email": "ravi@zrc.com",
    "name": "Ravi Kumar",
    "avatar_url": null,
    "role": "member",
    "joined_at": "2026-03-19T00:00:00"
  }
]
```

---

### PATCH `/org/members/{user_id}/role`

**What it does:** Changes a member's org-level role. Only the org owner can do this. Cannot demote the last owner.

**Who can call:** Org owner only.

**Request:**
```json
{ "role": "admin" }
```

Valid roles: `owner`, `admin`, `member`.

**Error cases:**
- `403` if caller is not owner
- `400` if trying to demote yourself
- `400` if demoting the last owner

---

### POST `/org/invite`

**What it does:** Sends an email invitation to join the org. The invitee receives an email with a link. The invitation expires in 7 days.

**Who can call:** Org owner or admin.

**Request:**
```json
{
  "email": "newuser@company.com",
  "role": "member"
}
```

Valid roles: `admin`, `member`.

**Response:**
```json
{
  "invitation_id": "uuid",
  "email": "newuser@company.com",
  "role": "member",
  "status": "pending"
}
```

**Error cases:**
- `409` if email is already an org member
- `409` if a pending invitation already exists for this email

---

### GET `/org/invitations`

**What it does:** Lists all pending (not yet accepted) invitations for the org.

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "newuser@company.com",
    "role": "member",
    "status": "pending",
    "invited_by_name": "Apurv Nigam",
    "created_at": "2026-03-20T00:00:00",
    "expires_at": "2026-03-27T00:00:00"
  }
]
```

---

## 3. Invitations

### GET `/invitations/{invitation_id}/details`

**What it does:** Returns invitation details so the invitee can see who invited them and to which org. This is a **public endpoint** — no authentication required. The invitation UUID serves as the secret.

**Response:**
```json
{
  "email": "newuser@company.com",
  "org_name": "ZRC Associates",
  "role": "member",
  "invited_by_name": "Apurv Nigam"
}
```

**Error cases:**
- `404` if invitation not found
- `409` if already accepted
- `410` if expired

---

### POST `/invitations/{invitation_id}/accept`

**What it does:** Accepts an invitation. The calling user joins the org with the invited role. The user must be authenticated and their email must match the invitation email.

**Request:** No body.

**Response:**
```json
{
  "org_id": "uuid",
  "org_name": "ZRC Associates",
  "role": "member"
}
```

---

## 4. Workflows

Workflow templates define what data to collect. They're org-level — not tied to any group or site.

### GET `/workflows`

**What it does:** Lists all workflow templates in the org.

**Who can call:** Any org member.

**Response:**
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Monthly Tower PM",
    "description": "Preventive maintenance checklist",
    "asset_type": "image",
    "capture_config": {
      "layout": "multi_page",
      "tasks": [
        {
          "id": "task_123",
          "name": "Overall Condition",
          "icon": "🏗️",
          "description": "Check site cleanliness",
          "fields": [
            { "id": "field_456", "label": "Site Photo", "type": "image", "required": true },
            { "id": "field_789", "label": "Vegetation", "type": "single_select", "required": true, "options": ["Clean", "Not Clean"] }
          ]
        }
      ]
    },
    "created_by": "uuid",
    "created_at": "2026-03-18T00:00:00",
    "updated_at": "2026-03-18T00:00:00",
    "job_count": 18,
    "task_count": 14
  }
]
```

**Notes:**
- `task_count` is computed from `capture_config.tasks.length`
- `job_count` is the total number of jobs using this workflow
- `capture_config` can be null if the workflow hasn't been built yet

---

### POST `/workflows`

**What it does:** Creates a new workflow template. The capture_config (tasks and fields) is typically added later via PATCH.

**Who can call:** Org owner or admin.

**Request:**
```json
{
  "name": "Monthly Tower PM",
  "description": "Preventive maintenance checklist",
  "asset_type": "image"
}
```

---

### GET `/workflows/{workflow_id}`

**What it does:** Returns a single workflow with full capture_config.

**Who can call:** Any org member. Field workers can also access if they have a job using this workflow.

---

### PATCH `/workflows/{workflow_id}`

**What it does:** Updates a workflow. Use this to save the capture_config from the workflow builder.

**Who can call:** Org owner or admin.

**Request:** Any subset of fields:
```json
{
  "name": "Updated Name",
  "capture_config": { "layout": "multi_page", "tasks": [...] }
}
```

---

### DELETE `/workflows/{workflow_id}`

**What it does:** Deletes a workflow. This will CASCADE delete all jobs using this workflow.

**Who can call:** Org owner or admin.

---

## 5. Sites

Physical locations where work happens. Sites are org-level and can be assigned to groups.

### GET `/sites`

**What it does:** Lists ALL sites in the org with optional filters. This is the primary way to get a flat inventory of every site.

**Who can call:** Any org member.

**Query parameters (all optional):**
| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `state` | string | `Telangana` | Exact match on state |
| `district` | string | `Siddipet` | Exact match on district |
| `site_type` | string | `Outdoor (OD)` | Exact match on type |
| `search` | string | `kist` | Case-insensitive search on name or code |
| `assigned` | string | `unassigned` or `assigned` | Filter by group assignment status |
| `group_id` | UUID | `uuid` | Filter by specific group |

**Response:**
```json
[
  {
    "id": "uuid",
    "group_id": "uuid or null",
    "org_id": "uuid",
    "name": "Kistampet",
    "code": "T-187",
    "state": "Telangana",
    "district": "Siddipet",
    "latitude": 18.4461,
    "longitude": 79.5704,
    "site_type": "Outdoor (OD)",
    "metadata": null,
    "created_at": "2026-03-18T00:00:00",
    "updated_at": "2026-03-18T00:00:00"
  }
]
```

**Notes:**
- `group_id` is null for unassigned sites
- `metadata` is a free-form JSON object for client-specific extra fields
- Use `?assigned=unassigned` to get sites that need to be organized into groups

---

### GET `/sites/{site_id}`

**What it does:** Returns a single site by ID.

---

### PATCH `/sites/{site_id}`

**What it does:** Updates site details.

**Who can call:** Org owner or admin.

**Request:** Any subset of fields:
```json
{
  "name": "Kistampet Tower",
  "code": "T-187-A",
  "state": "Telangana",
  "latitude": 18.4462
}
```

---

### DELETE `/sites/{site_id}`

**What it does:** Deletes a site.

**Who can call:** Org owner or admin.

---

### POST `/sites/{site_id}/transfer`

**What it does:** Moves a site from its current group (or unassigned) to a different group.

**Who can call:** Org owner or admin.

**Request:**
```json
{ "target_group_id": "uuid-of-destination-group" }
```

**Use cases:**
- Assigning an unassigned site to a group
- Moving a site from one group to another
- The frontend's "Assign to Group" action calls this for each selected site

---

### GET `/groups/{group_id}/sites`

**What it does:** Lists sites belonging to a specific group. Same filters as `GET /sites`.

**Query parameters:** Same as `GET /sites` (state, district, site_type, search).

---

### POST `/groups/{group_id}/sites`

**What it does:** Creates a new site and assigns it directly to this group.

**Who can call:** Org owner or admin.

**Request:**
```json
{
  "name": "Kistampet",
  "code": "T-187",
  "state": "Telangana",
  "district": "Siddipet",
  "latitude": 18.4461,
  "longitude": 79.5704,
  "site_type": "Outdoor (OD)",
  "metadata": { "custom_field": "value" }
}
```

Only `name` is required. All other fields are optional.

---

### POST `/groups/{group_id}/sites/bulk`

**What it does:** Creates multiple sites at once in a group. Used for CSV import.

**Who can call:** Org owner or admin.

**Request:** Array of site objects:
```json
[
  { "name": "Kistampet", "code": "T-187", "state": "Telangana", "district": "Siddipet", "latitude": 18.4461, "longitude": 79.5704, "site_type": "Outdoor (OD)" },
  { "name": "Bheempalli", "code": "T-116", "state": "Telangana", "district": "Karimnagar" }
]
```

**Response:** Array of created SiteResponse objects.

---

## 6. Groups

Groups organize sites into a hierarchy and control access. They support nesting via `parent_id`.

### GET `/groups`

**What it does:** Lists all groups in the org. Owners and admins see all groups. Regular members see only groups they belong to.

**Who can call:** Any org member.

**Response:**
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "parent_id": null,
    "name": "Telangana",
    "created_by": "uuid",
    "created_at": "2026-03-18T00:00:00",
    "updated_at": "2026-03-18T00:00:00",
    "member_count": 8,
    "site_count": 0
  },
  {
    "id": "uuid",
    "org_id": "uuid",
    "parent_id": "uuid-of-telangana",
    "name": "Hyderabad Cluster",
    "created_by": "uuid",
    "created_at": "2026-03-18T00:00:00",
    "updated_at": "2026-03-18T00:00:00",
    "member_count": 5,
    "site_count": 25
  }
]
```

**Notes:**
- Returns a **flat list**, not a tree. Frontend builds the tree from `parent_id`.
- `parent_id: null` means root-level group.
- `site_count` is the **direct** count — sites assigned to this specific group, not including descendants. Frontend computes aggregate counts by tree traversal.
- `member_count` is the number of people in this group's `group_members`.

**Building the tree (frontend):**
```js
const roots = groups.filter(g => g.parent_id === null);
const getChildren = (parentId) => groups.filter(g => g.parent_id === parentId);
```

---

### POST `/groups`

**What it does:** Creates a new group. The calling user is automatically added as group admin.

**Who can call:** Org owner or admin.

**Request:**
```json
{
  "name": "Telangana",
  "parent_id": null
}
```

Set `parent_id` to another group's UUID to create it as a sub-group. Set `null` or omit for root-level.

**Response:** GroupResponse (same shape as list item).

---

### GET `/groups/{group_id}`

**What it does:** Returns group details including the full members list.

**Who can call:** Any org member (access is by org, not group membership).

**Response:**
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "parent_id": null,
  "name": "Telangana",
  "created_by": "uuid",
  "created_at": "2026-03-18T00:00:00",
  "updated_at": "2026-03-18T00:00:00",
  "member_count": 3,
  "site_count": 0,
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Ravi Kumar",
      "email": "ravi@zrc.com",
      "role": "admin",
      "added_at": "2026-03-18T00:00:00"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Vikram Singh",
      "email": "vikram@zrc.com",
      "role": "member",
      "added_at": "2026-03-19T00:00:00"
    }
  ]
}
```

---

### PATCH `/groups/{group_id}`

**What it does:** Updates group name or moves it in the hierarchy by changing `parent_id`.

**Who can call:** Org owner or group admin.

**Request:** Any subset:
```json
{ "name": "Telangana Zone" }
```

**To move a group under another:**
```json
{ "parent_id": "uuid-of-new-parent" }
```

**To move a group to root level:**
```json
{ "parent_id": null }
```

---

### DELETE `/groups/{group_id}`

**What it does:** Deletes a group. Fails if the group still has sites assigned to it.

**Who can call:** Org owner only.

**Error cases:**
- `400` "Cannot delete group with sites. Transfer or delete sites first."

---

### POST `/groups/{group_id}/members`

**What it does:** Adds a user to this group with a role.

**Who can call:** Org owner or group admin.

**Request:**
```json
{
  "user_id": "uuid",
  "role": "member"
}
```

Valid roles: `admin`, `member`, `viewer`.

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Vikram Singh",
  "email": "vikram@zrc.com",
  "role": "member",
  "added_at": "2026-03-19T00:00:00"
}
```

**Error cases:**
- `400` "User not in this organization" — the user must be an org member first
- `400` "User is already a group member"

---

### PATCH `/groups/{group_id}/members/{user_id}`

**What it does:** Changes a member's role within the group.

**Who can call:** Org owner or group admin.

**Request:**
```json
{ "role": "viewer" }
```

---

### DELETE `/groups/{group_id}/members/{user_id}`

**What it does:** Removes a user from the group.

**Who can call:** Org owner or group admin.

---

## 7. Jobs

Jobs are the actual work assignments. They connect a workflow + site + person.

### GET `/jobs`

**What it does:** Lists all jobs in the org with optional filters.

**Who can call:** Any org member. (Note: currently no group-level filtering of visibility — all org members see all jobs. This may change.)

**Query parameters (all optional):**
| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `workflow_id` | UUID | `uuid` | Filter by workflow template |
| `site_id` | UUID | `uuid` | Filter by site |
| `group_id` | UUID | `uuid` | Filter by group (via site's group_id) |
| `status` | string | `submitted` | Filter by status: `pending`, `in_progress`, `submitted`, `reviewed` |

**Response:**
```json
[
  {
    "id": "uuid",
    "workflow_id": "uuid",
    "org_id": "uuid",
    "site_id": "uuid",
    "site_name": "Kistampet",
    "title": "Kistampet (T-187) — Mar 2026",
    "status": "submitted",
    "assigned_to": "uuid",
    "assigned_to_name": "Vikram Singh",
    "assigned_to_email": "vikram@zrc.com",
    "due_date": "2026-03-31T00:00:00",
    "location": "18.4461,79.5704",
    "instructions": "Monthly PM inspection",
    "submissions": null,
    "reviewed_at": null,
    "reviewed_by": null,
    "rework_comments": null,
    "rework_count": 0,
    "created_by": "uuid",
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-20T00:00:00"
  }
]
```

**Notes:**
- `site_name` is resolved from the site — saves a separate lookup
- `assigned_to_name` and `assigned_to_email` are resolved from the user
- `submissions` is null until the field worker submits
- `submissions` contains presigned S3 URLs for images (auto-resolved by backend)
- `rework_comments` is null unless the job has been sent for rework

---

### POST `/jobs`

**What it does:** Creates a single job.

**Who can call:** Org owner or admin.

**Request:**
```json
{
  "title": "Kistampet (T-187) — Mar 2026",
  "workflow_id": "uuid",
  "site_id": "uuid",
  "assigned_to": "uuid",
  "due_date": "2026-03-31T00:00:00",
  "location": "18.4461,79.5704",
  "instructions": "Monthly PM inspection"
}
```

Only `title` and `assigned_to` are required. `workflow_id` and `site_id` are technically optional but should always be provided.

---

### POST `/jobs/bulk?workflow_id={uuid}`

**What it does:** Creates one job per site in a group. The title and location are auto-populated from site data.

**Who can call:** Org owner or admin.

**Query parameter:** `workflow_id` (required) — which workflow template to use.

**Request:**
```json
{
  "group_id": "uuid",
  "assigned_to": "uuid",
  "due_date": "2026-03-31T00:00:00",
  "instructions": "Monthly PM inspection",
  "site_ids": ["uuid1", "uuid2"]
}
```

- `group_id` (required) — which group's sites to create jobs for
- `assigned_to` (required) — who to assign all jobs to
- `site_ids` (optional) — specific sites. If omitted, creates jobs for ALL sites in the group.

**Response:** Array of JobResponse objects.

**Example:** If the group has 50 sites and `site_ids` is omitted, this creates 50 jobs in one call.

---

### GET `/jobs/{job_id}`

**What it does:** Returns full job details including submission data and `capture_config` from the workflow. Image fields in submissions are automatically converted to presigned S3 URLs.

**This is the endpoint to call when opening a job** — it has everything needed to render the checklist (via `capture_config`) and show submitted values (via `submissions`).

**Response includes all JobResponse fields plus:**
- `capture_config` — the full workflow definition (tasks, fields, options) from the linked workflow template

---

### POST `/jobs/{job_id}/review`

**What it does:** Marks a submitted job as reviewed (approved). Records who reviewed it and when.

**Who can call:** Org owner or admin.

**Guard:** Job status must be `submitted`. Returns 400 otherwise.

**Request:** No body.

**Effect:**
- Sets `status` to `reviewed`
- Sets `reviewed_at` to current timestamp
- Sets `reviewed_by` to the calling user's ID

---

### POST `/jobs/{job_id}/rework`

**What it does:** Sends a submitted job back to the field worker with per-task feedback. Only the flagged tasks are included — the worker knows exactly what to fix.

**Who can call:** Org owner or admin.

**Guard:** Job status must be `submitted`. Returns 400 otherwise.

**Request:**
```json
{
  "comments": {
    "task_dg": "DG photos are blurry, please retake",
    "task_earthpits": "Values seem too low, verify measurement"
  }
}
```

Keys are task IDs from the workflow's capture_config. Only include tasks that need rework.

**Effect:**
- Sets `status` back to `in_progress`
- Sets `rework_comments` to the comments object
- Increments `rework_count` by 1

**Android app behavior:** When fetching a job with `rework_comments`, the app should only show the flagged tasks for re-submission, keeping existing submissions for other tasks intact.

---

### PATCH `/jobs/{job_id}/reassign`

**What it does:** Changes which field worker is assigned to a pending job.

**Who can call:** Org owner or admin.

**Guard:** Job status must be `pending`. Returns 400 otherwise.

**Request:**
```json
{ "assigned_to": "uuid-of-new-assignee" }
```

**Validation:** The new assignee must be a member of the same org.

---

### POST `/jobs/{job_id}/resend`

**What it does:** Sends a reminder notification to the assigned field worker. Currently a stub — returns 200 with a message. Will connect to FCM push notifications in the future.

**Who can call:** Org owner or admin.

**Guard:** Job status must be `pending`. Returns 400 otherwise.

**Request:** No body.

**Response:**
```json
{ "message": "Notification sent" }
```

---

### GET `/jobs/mine`

**What it does:** Lists all jobs assigned to the current user. This is the primary endpoint for the **Android field worker app**.

**Who can call:** Any authenticated user.

**Response:** Array of MyJobResponse:
```json
[
  {
    "id": "uuid",
    "workflow_id": "uuid",
    "workflow_name": "Monthly Tower PM",
    "org_id": "uuid",
    "title": "Kistampet (T-187) — Mar 2026",
    "status": "in_progress",
    "assigned_to": "uuid",
    "due_date": "2026-03-31T00:00:00",
    "location": "18.4461,79.5704",
    "instructions": "Monthly PM inspection",
    "submissions": { ... },
    "rework_comments": { "task_dg": "Photos blurry" },
    "rework_count": 1,
    "created_at": "2026-03-01T00:00:00",
    "updated_at": "2026-03-20T00:00:00"
  }
]
```

**Key difference from JobResponse:** Includes `workflow_name` for display. Does NOT include `capture_config` — the list is for showing job cards, not rendering checklists. When the user opens a specific job, call `GET /jobs/{id}` which includes `capture_config`.

---

### POST `/jobs/{job_id}/submit`

**What it does:** The field worker submits their completed checklist. This is the primary write endpoint for the **Android app**.

**Who can call:** The assigned field worker only (enforced by `assigned_to == user_id`).

**Guard:** Job status must be `pending` or `in_progress`. Returns 400 if already submitted.

**Request:**
```json
{
  "submissions": {
    "task_site_condition": {
      "field_site_photo": ["projects/uuid/images/uuid/photo.jpg"],
      "field_vegetation": "Clean",
      "field_dry_grass": "Ok"
    },
    "task_sps": {
      "field_sps_photo": ["projects/uuid/images/uuid/sps.jpg"],
      "field_mains_ry": 440,
      "field_automation_working": "Yes"
    }
  }
}
```

**Submissions structure:**
- Top-level keys are task IDs (from capture_config)
- Each task contains field IDs mapped to their values
- Image fields contain arrays of S3 keys (uploaded via the presigned URL flow)
- Select fields contain the selected option string
- Number fields contain numbers
- Text fields contain strings

**Effect:**
- Sets `status` to `submitted`
- Stores the `submissions` JSON

---

## 8. Images

Images are uploaded via presigned S3 URLs, scoped to a workflow.

### GET `/workflows/{workflow_id}/images`

**What it does:** Lists all images uploaded for a workflow.

---

### POST `/workflows/{workflow_id}/images/upload?filename=photo.jpg`

**What it does:** Returns a presigned S3 upload URL. The client uploads the file directly to S3 using this URL.

**Query parameter:** `filename` (required) — the original filename.

**Response:**
```json
{
  "upload_url": "https://s3.amazonaws.com/bucket/projects/uuid/images/uuid/photo.jpg?...",
  "s3_key": "projects/uuid/images/uuid/photo.jpg",
  "image_id": "uuid"
}
```

**Upload flow (Android/React):**
1. Call this endpoint to get the presigned URL
2. PUT the file directly to the `upload_url`
3. Store the `s3_key` in the job's submission data
4. When the backend returns submissions, it auto-converts S3 keys to presigned GET URLs

---

## 9. Annotations

### GET `/annotations`

**What it does:** Lists annotations.

### POST `/annotations`

**What it does:** Creates an annotation.

### PATCH `/annotations/{annotation_id}`

**What it does:** Updates an annotation.

### DELETE `/annotations/{annotation_id}`

**What it does:** Deletes an annotation.

---

## Status Values Reference

### Job Status
| Value | Description | Next transitions |
|-------|-------------|-----------------|
| `pending` | Created, waiting for field worker | → `in_progress` (worker opens it) |
| `in_progress` | Worker is filling the checklist | → `submitted` (worker submits) |
| `submitted` | Worker completed, awaiting review | → `reviewed` (admin approves) or → `in_progress` (admin sends rework) |
| `reviewed` | Admin approved, complete | Terminal state |

### Org Roles
| Value | Description |
|-------|-------------|
| `owner` | Full access, can change roles, delete groups |
| `admin` | Can create workflows/groups/jobs, invite members |
| `member` | Basic access, power comes from group roles |

### Group Roles
| Value | Description |
|-------|-------------|
| `admin` | Manage group members/sites, review jobs |
| `member` | Field worker, sees only assigned jobs |
| `viewer` | Read-only access to group's sites and jobs |
