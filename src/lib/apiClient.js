const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const LAST_REFRESH_AT_KEY = "vlainter_last_refresh_at";
let refreshPromise = null;
let lastSuccessfulRefreshAt = 0;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readSharedLastRefreshAt() {
  const storage = getLocalStorage();
  if (!storage) return 0;
  const raw = Number(storage.getItem(LAST_REFRESH_AT_KEY) || "0");
  return Number.isFinite(raw) ? raw : 0;
}

function recordSuccessfulRefresh(timestamp) {
  lastSuccessfulRefreshAt = timestamp;
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(LAST_REFRESH_AT_KEY, String(timestamp));
  } catch {
    // ignore storage write failures
  }
}

function getKnownLastSuccessfulRefreshAt() {
  return Math.max(lastSuccessfulRefreshAt, readSharedLastRefreshAt());
}

export function isAuthenticationError(error) {
  const status = Number(error?.status || 0);
  return status === 401 || status === 403;
}

async function executeJsonRequest(path, options = {}) {
  const { method = "GET", body, headers = {}, credentials = "include" } = options;
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        recordSuccessfulRefresh(Date.now());
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const retryOnUnauthorizedOption = options.retryOnUnauthorized;
  const requestMethod = String(options.method || "GET").trim().toUpperCase();
  const safeRetryMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const retryOnUnauthorized = retryOnUnauthorizedOption !== false;
  const canRetryUnauthorized = retryOnUnauthorizedOption === true || safeRetryMethods.has(requestMethod);
  const requestStartedAt = Date.now();

  let response = await executeJsonRequest(path, options);
  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    canRetryUnauthorized &&
    path !== "/api/auth/refresh"
  ) {
    const refreshed = getKnownLastSuccessfulRefreshAt() > requestStartedAt
      ? true
      : await refreshAuthSession();
    const refreshedByAnotherContext = getKnownLastSuccessfulRefreshAt() > requestStartedAt;
    if (refreshed || refreshedByAnotherContext) {
      response = await executeJsonRequest(path, {
        ...options,
        retryOnUnauthorized: false,
      });
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
    const message = data?.message || "요청 처리 중 오류가 발생했습니다.";
    throw new ApiError(message, response.status);
  }

  return data;
}
