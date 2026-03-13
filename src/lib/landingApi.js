import { apiRequest } from "./apiClient";

export async function getLandingPatchNotes() {
  return apiRequest("/api/site/patch-notes", {
    method: "GET",
  });
}
