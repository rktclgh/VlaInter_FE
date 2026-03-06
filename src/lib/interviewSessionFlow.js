export const TECH_INTERVIEW_SESSION_KEY = "TECH_INTERVIEW_SESSION";

export function saveTechInterviewSession(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return;
  }
  window.sessionStorage.setItem(TECH_INTERVIEW_SESSION_KEY, JSON.stringify(snapshot));
}

export function loadTechInterviewSession() {
  const raw = window.sessionStorage.getItem(TECH_INTERVIEW_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
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
