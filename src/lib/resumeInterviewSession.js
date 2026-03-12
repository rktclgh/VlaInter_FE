import { normalizeInterviewLanguage } from "./interviewLanguage";

const toDocumentMeta = (document) => {
  if (!document || typeof document !== "object") return null;
  const label = String(document.label || "").trim();
  if (!label) return null;
  return {
    fileId: document.fileId ?? null,
    fileType: document.fileType || null,
    label,
    ocrUsed: Boolean(document.ocrUsed),
  };
};

export function mapSelectedDocumentsByType(documents = []) {
  return (Array.isArray(documents) ? documents : []).reduce((acc, item, index) => {
    const normalized = toDocumentMeta(item);
    if (!normalized) return acc;
    const key = String(normalized.fileType || `doc-${index}`).toLowerCase();
    acc[key] = normalized;
    return acc;
  }, {});
}

export function buildResumedSessionSnapshot(session, metadata = {}) {
  if (!session?.sessionId || !session?.currentQuestion) return null;
  return {
    sessionId: session.sessionId,
    currentQuestion: session.currentQuestion,
    pendingResult: null,
    completed: false,
    metadata: {
      selectedDocuments: mapSelectedDocumentsByType(session.selectedDocuments),
      questionCount: Number(session.questionCount || 0),
      language: session.language ? normalizeInterviewLanguage(session.language) : null,
      difficulty: session.difficulty || null,
      difficultyLabel: session.difficulty || null,
      difficultyRating: session.difficultyRating ?? null,
      categoryId: session.categoryId ?? null,
      categoryName: session.categoryName || null,
      jobName: session.jobName || null,
      questionSetId: session.questionSetId ?? null,
      includeSelfIntroduction: Boolean(session.includeSelfIntroduction),
      providerUsed: session.providerUsed || null,
      fallbackDepth: Number(session.fallbackDepth || 0),
      paidFallbackPopupPending: String(session.providerUsed || "").toUpperCase() === "BEDROCK",
      ...metadata,
    },
  };
}
