import { apiRequest, refreshAuthSession } from "./apiClient";
import defaultProfileImage from "../assets/icon/temp.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
let hasMyProfileImage = false;

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
};

export function getMyProfileImageUrl(cacheBust = true) {
  if (!hasMyProfileImage) return defaultProfileImage;
  const baseUrl = `${API_BASE_URL}/api/users/files/me/profile-image`;
  if (!cacheBust) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}v=${Date.now()}`;
}

export async function getMyProfile() {
  const payload = await apiRequest("/api/users/me", {
    method: "GET",
  });
  const profile = extractProfile(payload);
  hasMyProfileImage = Boolean(profile?.hasProfileImage);
  return payload;
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

  if (fileType === "PROFILE_IMAGE") {
    hasMyProfileImage = true;
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
