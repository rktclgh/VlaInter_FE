const HIDDEN_CODES = new Set(["NON_TECH", "UNCATEGORIZED"]);

const DOCUMENT_CATEGORY_LABELS = {
  INTRODUCE_MOTIVATION: "자기소개서",
  PORTFOLIO_PROJECT: "포트폴리오",
  RESUME_EXPERIENCE: "이력서",
};

const normalize = (value) => String(value || "").trim().toLowerCase();

export const buildCategoryCode = (value) => {
  const base = String(value || "")
    .trim()
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return base || `custom_${Date.now()}`;
};

export const isHiddenCategory = (category) => HIDDEN_CODES.has(String(category?.code || "").trim().toUpperCase());

export const findTechRootId = (categories) => {
  const root = (categories || []).find((item) => !item?.parentId) || (categories || []).find((item) => Number(item.depth) === 0);
  return root?.categoryId || 1;
};

export const getCategoryDisplayName = (category) => {
  if (!category) return "";
  return String(category.name || "").trim();
};

export const getQuestionCategoryDisplayName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (DOCUMENT_CATEGORY_LABELS[upper]) return DOCUMENT_CATEGORY_LABELS[upper];
  if (raw.includes("/")) {
    const token = raw.split("/").filter(Boolean).at(-1);
    return token ? token.trim() : raw;
  }
  return raw;
};

export const sanitizeQuestionTag = (tag) => {
  const raw = String(tag || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (DOCUMENT_CATEGORY_LABELS[upper]) return "";
  if (HIDDEN_CODES.has(upper)) return "";
  return raw;
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

export const searchCategoryByText = (category, keyword) => {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return true;
  const haystack = [category?.displayName, category?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedKeyword);
};
