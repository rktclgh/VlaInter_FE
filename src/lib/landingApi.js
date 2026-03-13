import { apiRequest } from "./apiClient";

export async function getLandingPatchNotes() {
  return apiRequest("/api/site/patch-notes", {
    method: "GET",
  });
}

export async function getLandingSiteSettings() {
  return apiRequest("/api/site/settings", {
    method: "GET",
  });
}
