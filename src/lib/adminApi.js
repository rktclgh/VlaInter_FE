import { apiRequest } from "./apiClient";

export async function getAdminMembers({ page = 0, size = 20 } = {}) {
  const search = new URLSearchParams();
  search.set("page", String(page));
  search.set("size", String(size));
  return apiRequest(`/api/admin/members?${search.toString()}`, {
    method: "GET",
  });
}

export async function getAdminMemberDetail(memberId) {
  return apiRequest(`/api/admin/members/${encodeURIComponent(memberId)}`, {
    method: "GET",
  });
}

export async function updateAdminMember(memberId, payload) {
  return apiRequest(`/api/admin/members/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deactivateAdminMember(memberId) {
  return apiRequest(`/api/admin/members/${encodeURIComponent(memberId)}/deactivate`, {
    method: "PATCH",
  });
}

export async function activateAdminMember(memberId) {
  return apiRequest(`/api/admin/members/${encodeURIComponent(memberId)}/activate`, {
    method: "PATCH",
  });
}

export async function softDeleteAdminMember(memberId) {
  return apiRequest(`/api/admin/members/${encodeURIComponent(memberId)}/soft-delete`, {
    method: "PATCH",
  });
}

export async function hardDeleteAdminMember(memberId) {
  return apiRequest(`/api/admin/members/${encodeURIComponent(memberId)}/hard`, {
    method: "DELETE",
  });
}

export async function getAdminInterviewSets({ keyword = "" } = {}) {
  const search = new URLSearchParams();
  if (String(keyword || "").trim()) {
    search.set("keyword", String(keyword).trim());
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest(`/api/admin/interview/sets${suffix}`, {
    method: "GET",
  });
}

export async function promoteAdminInterviewSet(setId) {
  return apiRequest(`/api/admin/interview/sets/${encodeURIComponent(setId)}/promote`, {
    method: "POST",
  });
}

export async function updateAdminInterviewSet(setId, payload) {
  return apiRequest(`/api/admin/interview/sets/${encodeURIComponent(setId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminInterviewSet(setId) {
  return apiRequest(`/api/admin/interview/sets/${encodeURIComponent(setId)}`, {
    method: "DELETE",
  });
}

export async function getAdminInterviewCategories() {
  return apiRequest("/api/admin/interview/categories", {
    method: "GET",
  });
}

export async function createAdminInterviewCategory(payload) {
  return apiRequest("/api/admin/interview/categories", {
    method: "POST",
    body: payload,
  });
}

export async function updateAdminInterviewCategory(categoryId, payload) {
  return apiRequest(`/api/admin/interview/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function moveAdminInterviewCategory(categoryId, parentId) {
  return apiRequest(`/api/admin/interview/categories/${encodeURIComponent(categoryId)}/move`, {
    method: "PATCH",
    body: { parentId },
  });
}

export async function mergeAdminInterviewCategory(categoryId, targetCategoryId) {
  return apiRequest(`/api/admin/interview/categories/${encodeURIComponent(categoryId)}/merge`, {
    method: "PATCH",
    body: { targetCategoryId },
  });
}

export async function deleteAdminInterviewCategory(categoryId) {
  return apiRequest(`/api/admin/interview/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
  });
}
