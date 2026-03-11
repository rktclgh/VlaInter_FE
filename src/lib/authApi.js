import { apiRequest } from "./apiClient";
import { clearAuthenticatedBrowserSession, markAuthenticatedBrowserSession } from "./authSessionMarker";
import { extractProfile } from "./profileUtils";
import { resetMyProfileCache } from "./userApi";

function extractAuthResult(payload) {
  return extractProfile(payload);
}

export async function login(payload) {
  const result = await apiRequest("/api/auth/login", {
    method: "POST",
    body: payload,
  });
  const authResult = extractAuthResult(result);
  if (authResult?.userId != null) {
    markAuthenticatedBrowserSession(authResult.userId);
  }
  return result;
}

export async function signup(payload) {
  return apiRequest("/api/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export async function sendVerificationEmail(email) {
  return apiRequest("/api/auth/email-verification/send", {
    method: "POST",
    body: { email },
  });
}

export async function verifyEmailCode(email, code) {
  return apiRequest("/api/auth/email-verification/verify", {
    method: "POST",
    body: { email, code },
  });
}

export async function kakaoLogin(payload) {
  const result = await apiRequest("/api/auth/kakao/login", {
    method: "POST",
    body: payload,
  });
  const authResult = extractAuthResult(result);
  if (authResult?.userId != null) {
    markAuthenticatedBrowserSession(authResult.userId);
  }
  return result;
}

export async function logout() {
  try {
    return await apiRequest("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    clearAuthenticatedBrowserSession();
    resetMyProfileCache();
  }
}

export async function sendTemporaryPassword(email, name) {
  return apiRequest("/api/auth/password/temporary", {
    method: "POST",
    body: { email, name },
  });
}
