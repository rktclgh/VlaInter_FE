export const POINT_CHARGE_RETURN_PATH_KEY = "POINT_CHARGE_RETURN_PATH";
export const POINT_CHARGE_SUCCESS_RESULT_KEY = "POINT_CHARGE_SUCCESS_RESULT";
export const MOBILE_POINT_CHARGE_CALLBACK_PATH = "/content/point-charge/callback";

const normalizePathname = (pathname) => {
  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean);
  const stack = [];
  for (const segment of segments) {
    if (segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return `/${stack.join("/")}`;
};

export function sanitizeReturnPath(rawPath) {
  const fallbackPath = "/content/mypage";
  const safeRawPath = typeof rawPath === "string" ? rawPath : String(rawPath || "");
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";

  let normalizedPath = fallbackPath;
  try {
    const url = new URL(safeRawPath, base);
    const pathname = normalizePathname(url.pathname || "/");
    normalizedPath = `${pathname}${url.search || ""}${url.hash || ""}`;
  } catch {
    return fallbackPath;
  }

  if (!normalizedPath.startsWith("/content/")) return fallbackPath;
  if (
    normalizedPath === MOBILE_POINT_CHARGE_CALLBACK_PATH ||
    normalizedPath.startsWith(`${MOBILE_POINT_CHARGE_CALLBACK_PATH}?`) ||
    normalizedPath.startsWith(`${MOBILE_POINT_CHARGE_CALLBACK_PATH}#`)
  ) {
    return fallbackPath;
  }
  return normalizedPath;
}

export function buildMobileRedirectUrl() {
  return `${window.location.origin}${MOBILE_POINT_CHARGE_CALLBACK_PATH}`;
}

export function savePointChargeReturnPath(path) {
  const safePath = sanitizeReturnPath(path);
  window.sessionStorage.setItem(POINT_CHARGE_RETURN_PATH_KEY, safePath);
}

export function consumePointChargeReturnPath() {
  const raw = window.sessionStorage.getItem(POINT_CHARGE_RETURN_PATH_KEY);
  window.sessionStorage.removeItem(POINT_CHARGE_RETURN_PATH_KEY);
  return sanitizeReturnPath(raw);
}

export function savePointChargeSuccessResult(result) {
  window.sessionStorage.setItem(POINT_CHARGE_SUCCESS_RESULT_KEY, JSON.stringify(result));
}

export function consumePointChargeSuccessResult() {
  const raw = window.sessionStorage.getItem(POINT_CHARGE_SUCCESS_RESULT_KEY);
  window.sessionStorage.removeItem(POINT_CHARGE_SUCCESS_RESULT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
