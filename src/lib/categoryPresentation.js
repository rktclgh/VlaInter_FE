const HIDDEN_CODES = new Set(["NON_TECH", "UNCATEGORIZED"]);
const JOB_CODE_LABELS = {
  BACKEND: "백엔드 개발자",
  FRONTEND: "프론트엔드 개발자",
  EMBEDDED: "임베디드 개발자",
  SYSTEM_ARCH: "시스템 아키텍트",
  MOBILE: "모바일 개발자",
  DATA: "데이터 직무",
  AI: "AI 개발자",
  DEVOPS: "데브옵스 엔지니어",
  SECURITY: "보안 엔지니어",
  FINANCE: "재무",
  ACCOUNTING: "회계",
  SALES: "영업",
  MARKETING: "마케팅",
  HR: "인사",
  DESIGN: "디자인",
  PM: "프로덕트 매니저",
};

const DOCUMENT_CATEGORY_LABELS = {
  INTRODUCE_MOTIVATION: "자기소개서",
  PORTFOLIO_PROJECT: "포트폴리오",
  RESUME_EXPERIENCE: "이력서",
};

const normalize = (value) => String(value || "").trim().toUpperCase();

export const buildCategoryCode = (value) => {
  const base = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `CUSTOM_${Date.now()}`;
};

export const isHiddenCategory = (category) => HIDDEN_CODES.has(normalize(category?.code || category?.name));

export const findTechRootId = (categories) => {
  const techRoot = (categories || []).find((item) => normalize(item?.code) === "TECH" && !item?.parentId);
  return techRoot?.categoryId || 1;
};

export const getCategoryDisplayName = (category) => {
  if (!category) return "";
  const code = normalize(category.code);
  if (Number(category.depth) === 1 && JOB_CODE_LABELS[code]) return JOB_CODE_LABELS[code];
  return category.name || code;
};

export const getQuestionCategoryDisplayName = (value) => {
  const normalized = normalize(value);
  if (!normalized) return "";
  if (DOCUMENT_CATEGORY_LABELS[normalized]) return DOCUMENT_CATEGORY_LABELS[normalized];
  if (JOB_CODE_LABELS[normalized]) return JOB_CODE_LABELS[normalized];
  return String(value || "")
    .split(/[/_]/)
    .filter(Boolean)
    .map((token) => {
      const upper = normalize(token);
      if (DOCUMENT_CATEGORY_LABELS[upper]) return DOCUMENT_CATEGORY_LABELS[upper];
      if (JOB_CODE_LABELS[upper]) return JOB_CODE_LABELS[upper];
      return token.length <= 4 ? upper : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
};

export const sanitizeQuestionTag = (tag) => {
  const normalized = normalize(tag);
  if (!normalized) return "";
  if (DOCUMENT_CATEGORY_LABELS[normalized]) return "";
  if (normalized.includes("BACKEND_") || normalized.includes("FRONTEND_")) {
    return normalized.split("_").slice(-1)[0];
  }
  return tag;
};

export const buildVisibleCategories = (rawCategories) => {
  const byId = new Map((rawCategories || []).map((item) => [item.categoryId, item]));

  const isVisible = (category) => {
    if (!category || isHiddenCategory(category)) return false;
    let cursor = category;
    while (cursor?.parentId) {
      const parent = byId.get(cursor.parentId);
      if (parent && isHiddenCategory(parent)) return false;
      cursor = parent;
    }
    return true;
  };

  return (rawCategories || [])
    .filter(isVisible)
    .map((category) => ({
      ...category,
      displayName: getCategoryDisplayName(category),
    }));
};

export const findJobLabel = (categories, categoryId) => {
  const byId = new Map((categories || []).map((item) => [item.categoryId, item]));
  const category = byId.get(categoryId);
  const job = category?.parentId ? byId.get(category.parentId) : category;
  return getCategoryDisplayName(job);
};
