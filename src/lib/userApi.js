import { apiRequest, refreshAuthSession } from "./apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function getMyProfileImageUrl(cacheBust = true) {
  const baseUrl = `${API_BASE_URL}/api/users/files/me/profile-image`;
  if (!cacheBust) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}v=${Date.now()}`;
}

export async function getMyProfile() {
  return apiRequest("/api/users/me", {
    method: "GET",
  });
}

export async function getMyFiles() {
  return apiRequest("/api/users/files", {
    method: "GET",
  });
}

export async function uploadMyFile(fileType, file) {
  const formData = new FormData();
  formData.append("fileType", fileType);
  formData.append("file", file);

  const doUpload = () => fetch(`${API_BASE_URL}/api/users/files`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  let response = await doUpload();
  if (response.status === 401) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await doUpload();
    }
  }

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || "파일 업로드 중 오류가 발생했습니다.");
  }

  return data;
}

export async function deleteMyFile(fileId) {
  return apiRequest(`/api/users/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function changeMyPassword(currentPassword, newPassword) {
  return apiRequest("/api/users/me/password", {
    method: "PATCH",
    body: {
      currentPassword,
      newPassword,
    },
  });
}

export async function updateMyGeminiApiKey(geminiApiKey) {
  return apiRequest("/api/users/me/gemini-api-key", {
    method: "PUT",
    retryOnUnauthorized: true,
    body: {
      geminiApiKey,
    },
  });
}

export async function clearMyGeminiApiKey() {
  return apiRequest("/api/users/me/gemini-api-key", {
    method: "DELETE",
    retryOnUnauthorized: true,
  });
}
