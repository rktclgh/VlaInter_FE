export const POINT_CHARGE_RETURN_PATH_KEY = "POINT_CHARGE_RETURN_PATH";
export const POINT_CHARGE_SUCCESS_RESULT_KEY = "POINT_CHARGE_SUCCESS_RESULT";
export const MOBILE_POINT_CHARGE_CALLBACK_PATH = "/content/point-charge/callback";

export function sanitizeReturnPath(rawPath) {
  if (typeof rawPath !== "string") return "/content/mypage";
  if (!rawPath.startsWith("/content/")) return "/content/mypage";
  if (rawPath.startsWith(MOBILE_POINT_CHARGE_CALLBACK_PATH)) return "/content/mypage";
  return rawPath;
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
