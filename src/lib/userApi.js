import { apiRequest, refreshAuthSession } from "./apiClient";
import defaultProfileImage from "../assets/icon/temp.png";
import { extractProfile } from "./profileUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const myProfileCache = {
  hasProfileImage: false,
};
let myProfilePromise = null;

export function getMyProfileImageUrl(cacheBust = true) {
  if (!myProfileCache.hasProfileImage) return defaultProfileImage;
  const baseUrl = `${API_BASE_URL}/api/users/files/me/profile-image`;
  if (!cacheBust) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}v=${Date.now()}`;
}

export function resetMyProfileCache() {
  myProfileCache.hasProfileImage = false;
  myProfilePromise = null;
}

export async function getMyProfile() {
  if (myProfilePromise) return myProfilePromise;

  myProfilePromise = (async () => {
    try {
      const payload = await apiRequest("/api/users/me", {
        method: "GET",
      });
      const profile = extractProfile(payload);
      myProfileCache.hasProfileImage = Boolean(profile?.hasProfileImage);
      return payload;
    } catch (error) {
      resetMyProfileCache();
      throw error;
    } finally {
      myProfilePromise = null;
    }
  })();

  return myProfilePromise;
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
    if (fileType === "PROFILE_IMAGE") {
      resetMyProfileCache();
    }
    throw new Error(data?.message || "파일 업로드 중 오류가 발생했습니다.");
  }

  if (fileType === "PROFILE_IMAGE") {
    myProfileCache.hasProfileImage = true;
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

export async function deleteMyAccount() {
  return apiRequest("/api/users/me", {
    method: "DELETE",
    retryOnUnauthorized: true,
  });
}
