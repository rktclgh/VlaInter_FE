const AUTH_USER_ID_KEY = "vlainter_auth_user_id";
const AUTH_VERIFIED_AT_KEY = "vlainter_auth_verified_at";
const KAKAO_STATE_KEY = "kakao_oauth_state";

function canUseStorage(storage) {
  try {
    const probeKey = "__vlainter_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function getLocalStorage() {
  return typeof window !== "undefined" && canUseStorage(window.localStorage) ? window.localStorage : null;
}

function getSessionStorage() {
  return typeof window !== "undefined" && canUseStorage(window.sessionStorage) ? window.sessionStorage : null;
}

export function markAuthenticatedBrowserSession(userId) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(AUTH_USER_ID_KEY, String(userId));
  storage.setItem(AUTH_VERIFIED_AT_KEY, String(Date.now()));
}

export function clearAuthenticatedBrowserSession() {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(AUTH_USER_ID_KEY);
  storage.removeItem(AUTH_VERIFIED_AT_KEY);
}

export function hasAuthenticatedBrowserSession() {
  const storage = getLocalStorage();
  if (!storage) return false;
  return Boolean(storage.getItem(AUTH_USER_ID_KEY));
}

export function getAuthenticatedBrowserUserId() {
  const storage = getLocalStorage();
  if (!storage) return null;
  return storage.getItem(AUTH_USER_ID_KEY);
}

export function storeKakaoOAuthState(state) {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(KAKAO_STATE_KEY, state);
}

export function consumeKakaoOAuthState() {
  const storage = getSessionStorage();
  if (!storage) return "";
  const value = storage.getItem(KAKAO_STATE_KEY) || "";
  storage.removeItem(KAKAO_STATE_KEY);
  return value;
}

export function createKakaoOAuthState() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
