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

export const buildCategoryMap = (categories) => new Map((categories || []).map((item) => [item.categoryId, item]));

export const getCategoryAncestors = (categoriesOrMap, categoryId) => {
  const byId = categoriesOrMap instanceof Map ? categoriesOrMap : buildCategoryMap(categoriesOrMap);
  const category = byId.get(categoryId);
  if (!category) return { branch: null, job: null, skill: null };
  if (Number(category.depth) === 0) return { branch: category, job: null, skill: null };
  if (Number(category.depth) === 1) {
    return {
      branch: category.parentId ? byId.get(category.parentId) || null : null,
      job: category,
      skill: null,
    };
  }
  const job = category.parentId ? byId.get(category.parentId) || null : null;
  const branch = job?.parentId ? byId.get(job.parentId) || null : null;
  return { branch, job, skill: category };
};

export const getBranchDisplayName = (categoriesOrMap, categoryId) =>
  getCategoryDisplayName(getCategoryAncestors(categoriesOrMap, categoryId).branch);

export const getJobDisplayName = (categoriesOrMap, categoryId) =>
  getCategoryDisplayName(getCategoryAncestors(categoriesOrMap, categoryId).job);

export const getSkillDisplayName = (categoriesOrMap, categoryId) =>
  getCategoryDisplayName(getCategoryAncestors(categoriesOrMap, categoryId).skill);

export const isCommonJobCategory = (category) => String(category?.name || "").trim() === "공통";

export const isCommonSkillCategory = (categoriesOrMap, categoryId) => {
  const { job } = getCategoryAncestors(categoriesOrMap, categoryId);
  return isCommonJobCategory(job);
};

export const getBranchCommonJob = (categoriesOrMap, branchId) => {
  const categories = categoriesOrMap instanceof Map ? [...categoriesOrMap.values()] : categoriesOrMap || [];
  return categories.find(
    (item) =>
      Number(item?.depth) === 1 &&
      String(item?.parentId || "") === String(branchId || "") &&
      isCommonJobCategory(item)
  ) || null;
};

export const getAllowedJobIdsForBranchAndJob = (categoriesOrMap, branchId, jobId = "") => {
  const categories = categoriesOrMap instanceof Map ? [...categoriesOrMap.values()] : categoriesOrMap || [];
  if (!branchId && !jobId) return [];
  if (!jobId) {
    return categories
      .filter((item) => Number(item?.depth) === 1)
      .filter((item) => !branchId || String(item?.parentId || "") === String(branchId))
      .map((item) => String(item.categoryId));
  }
  const commonJobId = getBranchCommonJob(categories, branchId)?.categoryId;
  return [...new Set([String(jobId), commonJobId ? String(commonJobId) : null].filter(Boolean))];
};

export const matchesBranchAndJobSelection = ({
  categories,
  categoryId,
  branchId = "",
  jobId = "",
}) => {
  const byId = categories instanceof Map ? categories : buildCategoryMap(categories);
  const { branch, job } = getCategoryAncestors(byId, categoryId);
  if (branchId && String(branch?.categoryId || "") !== String(branchId)) return false;
  if (!jobId) return true;
  const allowedJobIds = getAllowedJobIdsForBranchAndJob(byId, branchId || branch?.categoryId || "", jobId);
  return allowedJobIds.includes(String(job?.categoryId || ""));
};

export const filterSkillCategoriesByBranchAndJob = ({
  categories,
  branchId = "",
  jobId = "",
  keyword = "",
}) => {
  const byId = buildCategoryMap(categories);
  const normalizedKeyword = normalize(keyword);

  return (categories || [])
    .filter((item) => Number(item?.depth) === 2)
    .filter((item) => {
      if (!matchesBranchAndJobSelection({ categories: byId, categoryId: item.categoryId, branchId, jobId })) return false;
      if (!normalizedKeyword) return true;
      return searchCategoryByText(item, normalizedKeyword);
    })
    .sort((left, right) => {
      const leftCommon = isCommonSkillCategory(byId, left.categoryId) ? 0 : 1;
      const rightCommon = isCommonSkillCategory(byId, right.categoryId) ? 0 : 1;
      if (leftCommon !== rightCommon) return leftCommon - rightCommon;
      return String(left?.displayName || left?.name || "").localeCompare(String(right?.displayName || right?.name || ""), "ko");
    })
    .map((item) => ({
      ...item,
      isCommon: isCommonSkillCategory(byId, item.categoryId),
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
