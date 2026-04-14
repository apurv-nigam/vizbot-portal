/**
 * Centralized permission checks for Vizbot.
 *
 * Two layers:
 *   1. Org role (owner / admin / member) — platform-wide permissions
 *   2. Project role (admin / surveyor) — per-project permissions
 *   Groups have no separate roles; members inherit their project role.
 *
 * The backend enforces these on every API call (returns 403).
 * The frontend uses these to hide/show UI elements so users
 * don't click things they can't do.
 *
 * Usage:
 *   import { can } from "@/lib/permissions";
 *   const { vizUser } = useUser();
 *   if (can.createWorkflow(vizUser)) { ... }
 */

// ── Helpers ──
function isOrgOwner(user) { return user?.role === "owner"; }
function isOrgAdmin(user) { return user?.role === "admin"; }
function isOrgAdminOrAbove(user) { return isOrgOwner(user) || isOrgAdmin(user); }

// ── Org-level permissions ──

/** Create/edit/delete workflow templates */
function createWorkflow(user) { return isOrgAdminOrAbove(user); }

/** Invite members to the organization */
function inviteToOrg(user) { return isOrgAdminOrAbove(user); }

/** Change org member roles */
function changeOrgRole(user) { return isOrgOwner(user); }

/** Create top-level groups */
function createGroup(user) { return isOrgAdminOrAbove(user); }

/** Delete a group */
function deleteGroup(user) { return isOrgOwner(user); }

/** Import/create/delete sites */
function manageSites(user) { return isOrgAdminOrAbove(user); }

/** Create jobs (single or bulk) — org admin or group admin */
function createJob(user, groupRole) { return isOrgAdminOrAbove(user) || groupRole === "admin"; }

/** Review, rework, reassign, resend jobs — org admin or group admin */
function manageJobs(user, groupRole) { return isOrgAdminOrAbove(user) || groupRole === "admin"; }

// ── Project-level permissions ──
// Project roles: "admin" (manages project/groups) or "surveyor" (field worker).
// Groups have no separate roles — members inherit their project role.
// `groupRole` below is actually the user's role in the *project* (passed from the page).

/** Add/remove members in a group */
function manageGroupMembers(user, groupRole) {
  return isOrgAdminOrAbove(user) || groupRole === "admin";
}

/** Create sub-groups under a group */
function createSubGroup(user, groupRole) {
  return isOrgAdminOrAbove(user) || groupRole === "admin";
}

/** Review jobs for sites in a group */
function reviewGroupJobs(user, groupRole) {
  return isOrgAdminOrAbove(user) || groupRole === "admin";
}

/** See all jobs in a group (not just own assignments) */
function viewAllGroupJobs(user, groupRole) {
  return isOrgAdminOrAbove(user) || groupRole === "admin";
}

/** View group contents (sites, members) */
function viewGroup(user, groupRole) {
  return isOrgAdminOrAbove(user) || !!groupRole;
}

// ── Utility ──

/**
 * Find the current user's role in a project.
 * @param {object} group — project detail response (has .members array)
 * @param {object} user — vizUser from UserProvider (has .user_id)
 * @returns {string|null} — "admin", "surveyor", or null
 */
export function getMyGroupRole(group, user) {
  if (!group?.members || !user?.user_id) return null;
  const membership = group.members.find((m) => m.user_id === user.user_id);
  return membership?.role || null;
}

// ── Export as a single object ──
export const can = {
  // Org-level
  createWorkflow,
  inviteToOrg,
  changeOrgRole,
  createGroup,
  deleteGroup,
  manageSites,
  createJob,
  manageJobs,

  // Group-level
  manageGroupMembers,
  createSubGroup,
  reviewGroupJobs,
  viewAllGroupJobs,
  viewGroup,
};
