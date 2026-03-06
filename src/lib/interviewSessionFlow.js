export const TECH_INTERVIEW_SESSION_KEY = "TECH_INTERVIEW_SESSION";
const TECH_INTERVIEW_SESSION_VERSION = 2;

export function saveTechInterviewSession(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return;
  }
  window.sessionStorage.setItem(
    TECH_INTERVIEW_SESSION_KEY,
    JSON.stringify({
      version: TECH_INTERVIEW_SESSION_VERSION,
      ...snapshot,
    })
  );
}

export function loadTechInterviewSession() {
  const raw = window.sessionStorage.getItem(TECH_INTERVIEW_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (parsed.version !== TECH_INTERVIEW_SESSION_VERSION) {
      window.sessionStorage.removeItem(TECH_INTERVIEW_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTechInterviewSession() {
  window.sessionStorage.removeItem(TECH_INTERVIEW_SESSION_KEY);
}
