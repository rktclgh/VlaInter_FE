import { normalizeInterviewLanguage } from "./interviewLanguage";

const INTERVIEW_START_DRAFT_KEY = "vlainter.interview-start.draft";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function loadInterviewStartDraft() {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(INTERVIEW_START_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      selectedFiles: {
        RESUME: String(parsed?.selectedFiles?.RESUME || ""),
        INTRODUCE: String(parsed?.selectedFiles?.INTRODUCE || ""),
        PORTFOLIO: String(parsed?.selectedFiles?.PORTFOLIO || ""),
      },
      branchFilter: String(parsed?.branchFilter || ""),
      branchQuery: String(parsed?.branchQuery || ""),
      jobFilter: String(parsed?.jobFilter || ""),
      jobQuery: String(parsed?.jobQuery || ""),
      skillQuery: String(parsed?.skillQuery || ""),
      selectedCategoryIds: Array.isArray(parsed?.selectedCategoryIds)
        ? parsed.selectedCategoryIds.map((value) => String(value || "")).filter(Boolean)
        : [],
      selectedQuestionSetId: String(parsed?.selectedQuestionSetId || ""),
      selectedRating: Math.max(1, Math.min(5, Number(parsed?.selectedRating) || 3)),
      selectedQuestionCount: Math.max(5, Math.min(20, Number(parsed?.selectedQuestionCount) || 5)),
      selectedLanguage: normalizeInterviewLanguage(parsed?.selectedLanguage),
      includeSelfIntroduction: Boolean(parsed?.includeSelfIntroduction),
    };
  } catch {
    storage.removeItem(INTERVIEW_START_DRAFT_KEY);
    return null;
  }
}

export function saveInterviewStartDraft(draft) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(
    INTERVIEW_START_DRAFT_KEY,
    JSON.stringify({
      selectedFiles: {
        RESUME: String(draft?.selectedFiles?.RESUME || ""),
        INTRODUCE: String(draft?.selectedFiles?.INTRODUCE || ""),
        PORTFOLIO: String(draft?.selectedFiles?.PORTFOLIO || ""),
      },
      branchFilter: String(draft?.branchFilter || ""),
      branchQuery: String(draft?.branchQuery || ""),
      jobFilter: String(draft?.jobFilter || ""),
      jobQuery: String(draft?.jobQuery || ""),
      skillQuery: String(draft?.skillQuery || ""),
      selectedCategoryIds: Array.isArray(draft?.selectedCategoryIds)
        ? draft.selectedCategoryIds.map((value) => String(value || "")).filter(Boolean)
        : [],
      selectedQuestionSetId: String(draft?.selectedQuestionSetId || ""),
      selectedRating: Math.max(1, Math.min(5, Number(draft?.selectedRating) || 3)),
      selectedQuestionCount: Math.max(5, Math.min(20, Number(draft?.selectedQuestionCount) || 5)),
      selectedLanguage: normalizeInterviewLanguage(draft?.selectedLanguage),
      includeSelfIntroduction: Boolean(draft?.includeSelfIntroduction),
    })
  );
}

export function clearInterviewStartDraft() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(INTERVIEW_START_DRAFT_KEY);
}
