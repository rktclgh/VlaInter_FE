export const INTERVIEW_LANGUAGE_OPTIONS = [
  { value: "KO", label: "한국어" },
  { value: "EN", label: "English" },
];

export function normalizeInterviewLanguage(value) {
  return String(value || "").trim().toUpperCase() === "EN" ? "EN" : "KO";
}

export function getInterviewLanguageLabel(value) {
  return normalizeInterviewLanguage(value) === "EN" ? "English" : "한국어";
}

export function getInterviewAnswerPlaceholder(language) {
  return normalizeInterviewLanguage(language) === "EN"
    ? "Answer in English. State the intent first, then explain your reasoning, actions, and result."
    : "질문의 의도, 핵심 개념, 실무 사례 순서로 답변을 구성해 보세요.";
}

export function isEnglishInterview(language) {
  return normalizeInterviewLanguage(language) === "EN";
}

export function looksEnglishEnough(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  const englishWords = value.match(/\b[A-Za-z]{2,}\b/g) || [];
  const englishLetters = (value.match(/[A-Za-z]/g) || []).length;
  const hangulLetters = (value.match(/[가-힣]/g) || []).length;
  if (hangulLetters === 0 && englishLetters >= 2 && englishWords.length >= 1) return true;
  if (englishWords.length >= 5 && englishLetters >= hangulLetters * 2) return true;
  if (englishWords.length >= 3 && hangulLetters === 0 && englishLetters >= 12) return true;
  return englishWords.length >= 8;
}
