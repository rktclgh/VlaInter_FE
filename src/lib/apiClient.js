const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, headers = {}, credentials = "include" } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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
