import { Circle, Clock, CheckCircle2 } from "lucide-react";

// ── Job statuses ──
export const STATUS_CONFIG = {
  pending: { label: "Pending", color: "var(--color-text-secondary)", bg: "var(--color-canvas)", css: "status-pending", icon: Circle },
  in_progress: { label: "In Progress", color: "#0C447C", bg: "#E6F1FB", css: "status-in_progress", icon: Clock },
  submitted: { label: "Submitted", color: "#633806", bg: "#FAEEDA", css: "status-submitted", icon: CheckCircle2 },
  reviewed: { label: "Reviewed", color: "#064E3B", bg: "#D1FAE5", css: "status-reviewed", icon: CheckCircle2 },
};

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
];

// ── Site statuses ──
export const SITE_STATUS_CONFIG = {
  Active: { color: "#064E3B", bg: "#D1FAE5" },
  Maintenance: { color: "#633806", bg: "#FAEEDA" },
  Inactive: { color: "var(--color-text-muted)", bg: "var(--color-canvas)" },
};

// ── Group hierarchy levels ──
export const LEVEL_NAMES = ["Circle", "Zone", "Cluster"];
export const LEVEL_COLORS = [
  { bg: "#FEF3C7", text: "#92400E", css: "level-circle" },   // depth 0
  { bg: "#DBEAFE", text: "#1E40AF", css: "level-zone" },      // depth 1
  { bg: "#DCFCE7", text: "#166534", css: "level-cluster" },    // depth 2
];

export function getGroupDepth(group, allGroups) {
  let depth = 0;
  let cur = group;
  while (cur?.parent_id) {
    depth++;
    cur = allGroups.find((g) => g.id === cur.parent_id);
  }
  return depth;
}

export function getLevelName(depth) {
  return LEVEL_NAMES[depth] || "Group";
}

export function getLevelColor(depth) {
  return LEVEL_COLORS[depth] || LEVEL_COLORS[LEVEL_COLORS.length - 1];
}

// ── Org roles ──
export const ORG_ROLE_CONFIG = {
  owner: { label: "Owner", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  admin: { label: "Admin", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  member: { label: "Member", color: "var(--color-text-secondary)", bg: "var(--color-canvas)" },
};

// ── Group roles ──
export const ROLE_CONFIG = {
  admin: { label: "Admin", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  surveyor: { label: "Surveyor", color: "var(--color-text-secondary)", bg: "var(--color-canvas)" },
};

// ── Workflow types ──
export const TYPE_CONFIG = {
  image: { emoji: "\u{1F4F7}", color: "var(--color-accent)", bg: "var(--color-accent-light)" },
  video: { emoji: "\u{1F3AC}", color: "#0C447C", bg: "#E6F1FB" },
  point_cloud: { emoji: "\u{1F9CA}", color: "#0D9488", bg: "#E6F7F5" },
  geospatial: { emoji: "\u{1F30D}", color: "#92400E", bg: "#FEF3C7" },
};

// ── Group tree helpers ──
export function getChildren(groups, parentId) {
  return groups.filter((g) => g.parent_id === parentId);
}

export function getDescendantIds(groups, groupId) {
  let ids = [groupId];
  groups.filter((g) => g.parent_id === groupId).forEach((c) => {
    ids = ids.concat(getDescendantIds(groups, c.id));
  });
  return ids;
}

export function getBreadcrumbPath(groups, groupId) {
  const trail = [];
  let cur = groups.find((g) => g.id === groupId);
  while (cur) {
    trail.unshift(cur);
    cur = cur.parent_id ? groups.find((g) => g.id === cur.parent_id) : null;
  }
  return trail;
}

export function isLeafGroup(groups, groupId) {
  return getChildren(groups, groupId).length === 0;
}
