import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { apiRequest } from "./api";

// ── Authenticated fetch helper ──
function useAuthFetch() {
  const { getAccessTokenSilently } = useAuth0();
  return async (path, opts = {}) => {
    const token = await getAccessTokenSilently();
    return apiRequest(path, { token, ...opts });
  };
}

function buildQs(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ── Query keys ──
export const queryKeys = {
  workflows: (filters) => ["workflows", filters || {}],
  workflow: (id) => ["workflows", id],
  groups: () => ["groups"],
  group: (id) => ["groups", id],
  groupSites: (gid) => ["groups", gid, "sites"],
  sites: (filters) => ["sites", filters || {}],
  site: (id) => ["sites", id],
  jobs: (filters) => ["jobs", filters || {}],
  job: (id) => ["jobs", id],
  members: () => ["org", "members"],
  invitations: () => ["org", "invitations"],
  profile: () => ["users", "me"],
};

// ═══════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════

// ── Workflows (formerly projects) ──
export function useWorkflows(filters = {}) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.workflows(filters),
    queryFn: () => authFetch(`/api/v1/workflows${buildQs(filters)}`),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
export function useWorkflow(id) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.workflow(id),
    queryFn: () => authFetch(`/api/v1/workflows/${id}`),
    enabled: !!id,
  });
}

// ── Groups (formerly teams) ──
export function useGroups(filters = {}) {
  const authFetch = useAuthFetch();
  const qs = buildQs(filters);
  return useQuery({
    queryKey: ["groups", filters],
    queryFn: () => authFetch(`/api/v1/groups${qs}`),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
export function useGroup(id) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => authFetch(`/api/v1/groups/${id}`),
    enabled: !!id,
  });
}
export function useGroupSites(groupId, filters = {}) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.groupSites(groupId),
    queryFn: () => authFetch(`/api/v1/groups/${groupId}/sites${buildQs(filters)}`).catch(() => []),
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: !!groupId,
  });
}

// ── Sites (flat, org-level) ──
export function useSites(filters = {}) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.sites(filters),
    queryFn: () => authFetch(`/api/v1/sites${buildQs(filters)}`).catch(() => []),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
export function useSite(id) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.site(id),
    queryFn: () => authFetch(`/api/v1/sites/${id}`),
    enabled: !!id,
  });
}

// ── Jobs (flat) ──
// Job stats — aggregated counts for charts/dashboards.
export function useJobStats(filters = {}) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: ["jobs", "stats", filters],
    queryFn: () => authFetch(`/api/v1/jobs/stats${buildQs(filters)}`),
  });
}

// Returns { items, total, page, limit, has_more } from paginated response.
// Backward compat: if backend returns a plain array (non-paginated endpoints), wraps it.
export function useJobs(filters = {}) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.jobs(filters),
    queryFn: () => authFetch(`/api/v1/jobs${buildQs(filters)}`).catch(() => ({ items: [], total: 0 })),
    select: (data) => {
      if (Array.isArray(data)) return { items: data, total: data.length, has_more: false };
      return { items: data.items || [], total: data.total || 0, page: data.page, limit: data.limit, has_more: data.has_more || false };
    },
  });
}

// Infinite scroll hook for job list pages.
export function useJobsInfinite(filters = {}) {
  const authFetch = useAuthFetch();
  const { page, ...rest } = filters;
  return useInfiniteQuery({
    queryKey: ["jobs", "infinite", rest],
    queryFn: ({ pageParam = 1 }) => authFetch(`/api/v1/jobs${buildQs({ ...rest, page: pageParam, limit: 50 })}`).catch(() => ({ items: [], total: 0, has_more: false })),
    getNextPageParam: (lastPage) => lastPage.has_more ? (lastPage.page || 1) + 1 : undefined,
    select: (data) => ({
      items: data.pages.flatMap((p) => p.items || (Array.isArray(p) ? p : [])),
      total: data.pages[0]?.total || 0,
    }),
  });
}
export function useJob(jobId) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.job(jobId),
    queryFn: () => authFetch(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId,
  });
}

// ── Org ──
export function useMembers() {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.members(),
    queryFn: () => authFetch("/api/v1/org/members").catch(() => []),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
export function useSearchMembers(query) {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: ["org", "members", "search", query],
    queryFn: () => authFetch(`/api/v1/org/members/search?q=${encodeURIComponent(query)}`).catch(() => []),
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: (query || "").length >= 2,
  });
}

export function useOrg() {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: ["org"],
    queryFn: () => authFetch("/api/v1/org/"),
  });
}

export function useInvitations() {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.invitations(),
    queryFn: () => authFetch("/api/v1/org/invitations").catch(() => []),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
export function useProfile() {
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => authFetch("/api/v1/users/me"),
  });
}

// ── Backward-compat aliases (used by pages not yet migrated) ──
export const useProjects = useWorkflows;
export const useProject = useWorkflow;
export const useTeams = useGroups;
export const useTeam = useGroup;
export const useTeamSites = useGroupSites;
export const useTeamMembers = (groupId) => {
  const query = useGroup(groupId);
  return { ...query, data: query.data?.members || [] };
};

// ═══════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════

// ── Workflows ──
export function useCreateWorkflow() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch("/api/v1/workflows", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
}
export const useCreateProject = useCreateWorkflow;

export function useUpdateWorkflow(id) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch(`/api/v1/workflows/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflow(id) });
      qc.invalidateQueries({ queryKey: queryKeys.workflows() });
    },
  });
}
export const useUpdateProject = useUpdateWorkflow;

// ── Groups ──
export function useCreateGroup() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch("/api/v1/groups", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups() }),
  });
}
export const useCreateTeam = useCreateGroup;

export function useUpdateGroup(id) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch(`/api/v1/groups/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.group(id) });
      qc.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useDeleteGroup(id) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authFetch(`/api/v1/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups() }),
  });
}

export function useAddGroupMember(groupId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch(`/api/v1/groups/${groupId}/members`, { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
  });
}
export const useAddTeamMember = useAddGroupMember;

export function useRemoveGroupMember(groupId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => authFetch(`/api/v1/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
  });
}
export const useRemoveTeamMember = useRemoveGroupMember;

// ── Sites ──
export function useCreateSite(groupId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch(`/api/v1/groups/${groupId}/sites`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: queryKeys.groupSites(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useBulkCreateSites(groupId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sites) => authFetch(`/api/v1/groups/${groupId}/sites/bulk`, { method: "POST", body: sites }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: queryKeys.groupSites(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups() });
    },
  });
}

export function useUpdateSite(siteId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch(`/api/v1/sites/${siteId}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteSite(siteId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authFetch(`/api/v1/sites/${siteId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useTransferSite() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, targetGroupId }) => authFetch(`/api/v1/sites/${siteId}/transfer`, { method: "POST", body: { target_group_id: targetGroupId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

// ── Jobs ──
export function useCreateJob() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch("/api/v1/jobs", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: queryKeys.workflows() });
    },
  });
}

export function useBulkCreateJobs() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowId, ...body }) => authFetch(`/api/v1/jobs/bulk?workflow_id=${workflowId}`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: queryKeys.workflows() });
    },
  });
}

export function useReviewJob(jobId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authFetch(`/api/v1/jobs/${jobId}/review`, { method: "POST" }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.job(jobId), data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useReworkJob(jobId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comments) => authFetch(`/api/v1/jobs/${jobId}/rework`, { method: "POST", body: { comments } }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.job(jobId), data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useReassignJob(jobId) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => authFetch(`/api/v1/jobs/${jobId}/reassign`, { method: "PATCH", body: { assigned_to: userId } }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.job(jobId), data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useResendJob(jobId) {
  const authFetch = useAuthFetch();
  return useMutation({
    mutationFn: () => authFetch(`/api/v1/jobs/${jobId}/resend`, { method: "POST" }),
  });
}

// ── Org ──
export function useUpdateProfile() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch("/api/v1/users/me", { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile() }),
  });
}

export function useUpdateOrg() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch("/api/v1/org/", { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });
}

export function useInviteMember() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => authFetch("/api/v1/org/invite", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.invitations() }),
  });
}
