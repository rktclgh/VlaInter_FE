const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function apiRequest(path, options = {}) {
  const { retryOnUnauthorized = true } = options;
  const method = String(options.method || "GET").toUpperCase();
  const safeRetryMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const canRetryUnauthorized = safeRetryMethods.has(method);

  let response = await executeJsonRequest(path, options);
  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    canRetryUnauthorized &&
    path !== "/api/auth/refresh"
  ) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
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
