import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { OcrInfoBadge } from "../../components/OcrInfoBadge";
import { ResumeSessionModal } from "../../components/ResumeSessionModal";
import { Sidebar } from "../../components/Sidebar";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { StarRatingInput, StarIcons } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { filterSkillCategoriesByBranchAndJob, searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { createInterviewCategory, dismissMockSession, getInterviewCategories, getLatestIncompleteMockSession, getMyInterviewSets, getReadyMockDocuments, startMockInterview } from "../../lib/interviewApi";
import { buildResumedSessionSnapshot } from "../../lib/resumeInterviewSession";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { clearInterviewStartDraft, loadInterviewStartDraft, saveInterviewStartDraft } from "../../lib/interviewStartDraft";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";
import { getInterviewLanguageLabel, INTERVIEW_LANGUAGE_OPTIONS, normalizeInterviewLanguage } from "../../lib/interviewLanguage";

const DOCUMENT_TYPES = [
  { key: "RESUME", label: "이력서" },
  { key: "INTRODUCE", label: "자기소개서" },
  { key: "PORTFOLIO", label: "포트폴리오" },
];

const extractFileList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};
const toTimestamp = (rawDateTime) => {
  const time = new Date(rawDateTime || "").getTime();
  return Number.isNaN(time) ? 0 : time;
};
const resolveDisplayFileName = (file) => (
  file?.originalFileName || file?.original_filename || file?.fileName || file?.file_name || file?.name || "미선택"
);
const buildSelectedDocumentMeta = (file, type) => {
  if (!file) return null;
  return {
    fileId: file?.fileId || file?.file_id || null,
    fileType: type,
    label: resolveDisplayFileName(file),
    ocrUsed: Boolean(file?.ocrUsed),
  };
};
const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/35 px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-start-logout-title"
      aria-describedby="interview-start-logout-description"
      className="w-full max-w-105 rounded-2xl border border-[#d9d9d9] bg-white p-5"
    >
      <p id="interview-start-logout-title" className="text-[15px] font-medium text-[#252525]">
        정말 로그아웃 하시겠습니까?
      </p>
      <p id="interview-start-logout-description" className="mt-1 text-[13px] text-[#4f5664]">
        종료하지 않은 면접 내용은 저장되지 않습니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
      </div>
    </div>
  </div>
);

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    <span>{label}</span>
  </div>
);

const BlockingLoadingOverlay = ({ title, description }) => (
  <div className="fixed inset-0 z-120 flex items-center justify-center bg-[#0f172a]/55 px-4">
    <div className="w-full max-w-105 rounded-2xl border border-white/25 bg-white/95 p-5 text-center shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#cbd5e1] border-t-[#171b24] animate-spin" />
      <p className="mt-4 text-[16px] font-semibold text-[#111827]">{title}</p>
      <p className="mt-2 text-[13px] leading-[1.6] text-[#4b5563]">{description}</p>
    </div>
  </div>
);

const InterviewPrerequisiteGuideModal = ({ onClose, onMoveToUpload }) => (
  <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/55 px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-prereq-title"
      aria-describedby="interview-prereq-description"
      className="w-full max-w-115 rounded-2xl border border-[#d9d9d9] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
    >
      <p id="interview-prereq-title" className="text-[16px] font-semibold text-[#1f2937]">면접 시작 전 필수 준비가 필요합니다</p>
      <p id="interview-prereq-description" className="mt-2 text-[13px] leading-[1.7] text-[#4f5664]">
        이력서 업로드와 AI 분석이 완료되어야 면접을 시작하실 수 있습니다. 자기소개서와 포트폴리오는 선택 사항입니다.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">닫기</button>
        <button type="button" onClick={onMoveToUpload} className="rounded-[10px] border border-[#171b24] bg-[#171b24] px-3 py-1.5 text-[12px] text-white">이력서 업로드 페이지로 이동</button>
      </div>
    </div>
  </div>
);

const CategoryCard = ({ title, description, children }) => (
  <section className="rounded-3xl border border-[#e4e7ee] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-6">
    <div className="mb-4">
      <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">{title}</p>
      {description ? <p className="mt-1 text-[13px] leading-[1.7] text-[#5e6472]">{description}</p> : null}
    </div>
    {children}
  </section>
);

const FilterChip = ({ label, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-[12px] transition ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d9dde5] bg-white text-[#505866]"}`}
  >
    {label}
  </button>
);

const LanguageSelect = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="rounded-[14px] border border-[#dfe3eb] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
  >
    {INTERVIEW_LANGUAGE_OPTIONS.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const toggleSkillSelection = (prev, nextId) => {
  if (prev.includes(nextId)) {
    return prev.filter((id) => id !== nextId);
  }
  if (prev.length >= 3) {
    return prev;
  }
  return [...prev, nextId];
};

const prioritizeCreatedSelection = (prev, nextId, limit = 3) => {
  const deduped = prev.filter((id) => id !== nextId);
  return [...deduped.slice(-(limit - 1)), nextId];
};

const initialDraft = loadInterviewStartDraft();
const hasAnySelectedFile = (value) => Boolean(value?.RESUME || value?.INTRODUCE || value?.PORTFOLIO);

export const InterviewStartPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [categoryTree, setCategoryTree] = useState([]);
  const [filesByType, setFilesByType] = useState({ RESUME: [], INTRODUCE: [], PORTFOLIO: [] });
  const [selectedFiles, setSelectedFiles] = useState(initialDraft?.selectedFiles || { RESUME: "", INTRODUCE: "", PORTFOLIO: "" });
  const [branchFilter, setBranchFilter] = useState(initialDraft?.branchFilter || "");
  const [branchQuery, setBranchQuery] = useState(initialDraft?.branchQuery || "");
  const [jobFilter, setJobFilter] = useState(initialDraft?.jobFilter || "");
  const [jobQuery, setJobQuery] = useState(initialDraft?.jobQuery || "");
  const [skillQuery, setSkillQuery] = useState(initialDraft?.skillQuery || "");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialDraft?.selectedCategoryIds || []);
  const [myQuestionSets, setMyQuestionSets] = useState([]);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState(initialDraft?.selectedQuestionSetId || "");
  const [selectedRating, setSelectedRating] = useState(initialDraft?.selectedRating || 3);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(initialDraft?.selectedQuestionCount || 5);
  const [selectedLanguage, setSelectedLanguage] = useState(initialDraft?.selectedLanguage || "KO");
  const [includeSelfIntroduction, setIncludeSelfIntroduction] = useState(initialDraft?.includeSelfIntroduction || false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);
  const [showPrereqGuideModal, setShowPrereqGuideModal] = useState(false);
  const [pendingResumeSession, setPendingResumeSession] = useState(null);
  const [resumeModalBusy, setResumeModalBusy] = useState(false);
  const [resumeSessionChecked, setResumeSessionChecked] = useState(false);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  const loadPageData = useCallback(async () => {
    let profile = {};
    try {
      const profilePayload = await getMyProfile();
      profile = extractProfile(profilePayload);
      setUserName(profile?.name || "사용자");
      setUserPoint(parsePoint(profile?.point));
      setProfileImageUrl(getMyProfileImageUrl());
    } catch (error) {
      if (isAuthenticationError(error)) {
        navigate("/login", { replace: true });
        return;
      }
    }

    try {
      const [filesPayload, categoriesPayload, mySetsPayload] = await Promise.all([
        getReadyMockDocuments(),
        getInterviewCategories(),
        getMyInterviewSets(),
      ]);
      const nextCategoryTree = Array.isArray(categoriesPayload) ? categoriesPayload : [];
      const nextJobs = nextCategoryTree
        .filter((item) => Number(item?.depth) === 1 && Boolean(item?.categoryId))
        .map((item) => ({
          categoryId: Number(item.categoryId),
          parentId: item.parentId ? Number(item.parentId) : null,
          name: String(item?.name || "").trim(),
          displayName: String(item?.name || "").trim(),
        }));
      const rawFiles = extractFileList(filesPayload);
      const nextFilesByType = { RESUME: [], INTRODUCE: [], PORTFOLIO: [] };

      rawFiles.forEach((file) => {
        const type = file?.fileType || file?.file_type;
        if (!nextFilesByType[type]) return;
        nextFilesByType[type].push(file);
      });

      Object.keys(nextFilesByType).forEach((type) => {
        nextFilesByType[type].sort((a, b) => toTimestamp(b?.createdAt || b?.created_at) - toTimestamp(a?.createdAt || a?.created_at));
      });

      const profileJobName = typeof profile?.jobName === "string" ? profile.jobName.trim() : "";
      const matchedJob = profileJobName
        ? nextJobs.find((item) => [item.displayName, item.name].filter(Boolean).some((name) => name.trim().toLowerCase() === profileJobName.toLowerCase()))
        : null;
      const defaultJob = matchedJob?.categoryId ? String(matchedJob.categoryId) : nextJobs[0]?.categoryId ? String(nextJobs[0].categoryId) : "";
      const defaultBranch = matchedJob?.parentId ? String(matchedJob.parentId) : nextJobs[0]?.parentId ? String(nextJobs[0].parentId) : "";

      setCategoryTree(nextCategoryTree);
      setMyQuestionSets(Array.isArray(mySetsPayload) ? mySetsPayload.filter((item) => !item?.aiGenerated && Number(item?.questionCount || 0) > 0) : []);
      setFilesByType(nextFilesByType);
      setSelectedFiles((prev) => {
        if (hasAnySelectedFile(prev)) return prev;
        return {
          RESUME: String(nextFilesByType.RESUME[0]?.fileId || nextFilesByType.RESUME[0]?.file_id || ""),
          INTRODUCE: String(nextFilesByType.INTRODUCE[0]?.fileId || nextFilesByType.INTRODUCE[0]?.file_id || ""),
          PORTFOLIO: String(nextFilesByType.PORTFOLIO[0]?.fileId || nextFilesByType.PORTFOLIO[0]?.file_id || ""),
        };
      });
      setBranchFilter((prev) => prev || defaultBranch);
      setJobFilter((prev) => prev || defaultJob);
    } catch (error) {
      setPageErrorMessage(error?.message || "면접 설정 데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingPage(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (loadingPage || resumeSessionChecked) return;
    let cancelled = false;

    const loadIncompleteSession = async () => {
      try {
        const response = await getLatestIncompleteMockSession();
        if (!cancelled) {
          setPendingResumeSession(response || null);
        }
      } catch {
        if (!cancelled) {
          setPendingResumeSession(null);
        }
      } finally {
        if (!cancelled) {
          setResumeSessionChecked(true);
        }
      }
    };

    void loadIncompleteSession();
    return () => {
      cancelled = true;
    };
  }, [loadingPage, resumeSessionChecked]);

  const jobs = useMemo(
    () => (categoryTree || [])
      .filter((item) => Number(item.depth) === 1)
      .map((item) => ({
        ...item,
        categoryId: Number(item.categoryId),
        parentId: item.parentId ? Number(item.parentId) : null,
        displayName: String(item.name || "").trim(),
      }))
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ko")),
    [categoryTree]
  );
  const branchItems = useMemo(
    () => (categoryTree || []).filter((item) => Number(item.depth) === 0).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko")),
    [categoryTree]
  );
  const visibleBranches = useMemo(() => (
    branchItems.filter((branch) => searchCategoryByText(branch, branchQuery))
  ), [branchItems, branchQuery]);
  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!searchCategoryByText(job, jobQuery)) return false;
      return !branchFilter || String(job.parentId || "") === String(branchFilter);
    });
  }, [branchFilter, jobQuery, jobs]);
  const skillItems = useMemo(
    () => filterSkillCategoriesByBranchAndJob({
      categories: categoryTree || [],
      branchId: branchFilter,
      jobId: jobFilter,
      keyword: "",
    })
      .map((item) => ({
        ...item,
        categoryId: Number(item.categoryId),
        parentId: item.parentId ? Number(item.parentId) : null,
        displayName: String(item.name || "").trim(),
        isLeaf: true,
      }))
      .sort((left, right) => {
        if (Boolean(left.isCommon) !== Boolean(right.isCommon)) return left.isCommon ? -1 : 1;
        return String(left.name || "").localeCompare(String(right.name || ""), "ko");
      }),
    [branchFilter, categoryTree, jobFilter]
  );
  const visibleSkills = useMemo(() => {
    const keyword = skillQuery.trim().toLowerCase();
    return skillItems
      .filter((category) => searchCategoryByText(category, keyword))
      .map((category) => ({
        ...category,
        label: category.displayName || category.name,
      }));
  }, [skillItems, skillQuery]);

  useEffect(() => {
    if (!jobFilter) return;
    if (visibleJobs.some((job) => String(job.categoryId) === String(jobFilter))) return;
    setJobFilter("");
    setSelectedCategoryIds([]);
  }, [jobFilter, visibleJobs]);

  useEffect(() => {
    if (!selectedCategoryIds.length) return;
    const availableIds = new Set(skillItems.map((item) => String(item.categoryId)));
    setSelectedCategoryIds((prev) => {
      const next = prev.filter((id) => availableIds.has(String(id)));
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [selectedCategoryIds, skillItems]);

  const canCreateJob = Boolean(branchFilter && jobQuery.trim() && !visibleJobs.some((job) => (job.displayName || job.name || "").trim().toLowerCase() === jobQuery.trim().toLowerCase()));
  const canCreateBranch = Boolean(branchQuery.trim() && !branchItems.some((branch) => (branch.name || "").trim().toLowerCase() === branchQuery.trim().toLowerCase()));
  const canCreateSkill = Boolean(jobFilter && skillQuery.trim() && !(categoryTree || []).some((item) => Number(item.depth) === 2 && String(item.name || "").trim().toLowerCase() === skillQuery.trim().toLowerCase()));
  const branchAlreadyExists = Boolean(branchQuery.trim() && !canCreateBranch);
  const jobAlreadyExists = Boolean(jobQuery.trim() && !canCreateJob);
  const skillAlreadyExists = Boolean(skillQuery.trim() && !canCreateSkill);

  const selectedSkills = useMemo(
    () => skillItems.filter((item) => selectedCategoryIds.includes(String(item.categoryId))),
    [selectedCategoryIds, skillItems]
  );
  const selectedJob = useMemo(() => jobs.find((item) => String(item.categoryId) === String(jobFilter)) || null, [jobFilter, jobs]);
  const selectedQuestionSet = useMemo(
    () => myQuestionSets.find((item) => String(item.setId) === String(selectedQuestionSetId)) || null,
    [myQuestionSets, selectedQuestionSetId]
  );
  const visibleQuestionSets = useMemo(() => {
    const normalizedBranchName = String(branchItems.find((item) => String(item.categoryId) === String(branchFilter))?.name || "").trim().toLowerCase();
    const normalizedJobName = String(selectedJob?.displayName || selectedJob?.name || "").trim().toLowerCase();
    return myQuestionSets.filter((set) => {
      const setBranchName = String(set.branchName || "").trim().toLowerCase();
      const setJobNames = Array.isArray(set.jobNames)
        ? set.jobNames.map((name) => String(name || "").trim().toLowerCase()).filter(Boolean)
        : [String(set.jobName || "").trim().toLowerCase()].filter(Boolean);
      if (normalizedBranchName && setBranchName !== normalizedBranchName) return false;
      if (!normalizedJobName) return true;
      return setJobNames.includes(normalizedJobName) || setJobNames.includes("공통");
    });
  }, [branchFilter, branchItems, myQuestionSets, selectedJob]);

  useEffect(() => {
    if (!selectedQuestionSetId) return;
    if (visibleQuestionSets.some((set) => String(set.setId) === String(selectedQuestionSetId))) return;
    setSelectedQuestionSetId("");
  }, [selectedQuestionSetId, visibleQuestionSets]);

  useEffect(() => {
    if (loadingPage) return;
    setSelectedFiles((prev) => {
      const next = { ...prev };
      let changed = false;
      DOCUMENT_TYPES.forEach((item) => {
        const options = filesByType[item.key] || [];
        const current = String(prev[item.key] || "");
        const exists = options.some((file) => String(file?.fileId || file?.file_id || "") === current);
        if (!exists) {
          next[item.key] = String(options[0]?.fileId || options[0]?.file_id || "");
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [filesByType, loadingPage]);

  useEffect(() => {
    if (loadingPage) return;
    saveInterviewStartDraft({
      selectedFiles,
      branchFilter,
      branchQuery,
      jobFilter,
      jobQuery,
      skillQuery,
      selectedCategoryIds,
      selectedQuestionSetId,
      selectedRating,
      selectedQuestionCount,
      selectedLanguage,
      includeSelfIntroduction,
    });
  }, [
    branchFilter,
    branchQuery,
    includeSelfIntroduction,
    jobFilter,
    jobQuery,
    loadingPage,
    selectedCategoryIds,
    selectedFiles,
    selectedLanguage,
    selectedQuestionCount,
    selectedQuestionSetId,
    selectedRating,
    skillQuery,
  ]);

  const selectedFileObjects = useMemo(() => DOCUMENT_TYPES.reduce((acc, item) => {
    acc[item.key] = filesByType[item.key].find((file) => String(file?.fileId || file?.file_id || "") === String(selectedFiles[item.key] || "")) || null;
    return acc;
  }, {}), [filesByType, selectedFiles]);
  const totalInterviewQuestionCount = Math.max(5, Number(selectedQuestionCount) || 5) + (includeSelfIntroduction ? 1 : 0);

  const handleSidebarNavigate = (item) => {
    if (startingInterview) return;
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      clearInterviewStartDraft();
      navigate("/login", { replace: true });
    }
  };

  const handleCreateJob = async () => {
    if (!branchFilter || !jobQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCategory({
        parentId: Number(branchFilter),
        name: jobQuery.trim(),
      });
      const displayName = (created?.name || jobQuery.trim()).trim();
      const refreshed = await getInterviewCategories();
      const nextCategoryTree = Array.isArray(refreshed) ? refreshed : [];
      setCategoryTree(nextCategoryTree);
      const matched = nextCategoryTree.find(
        (item) => Number(item?.depth) === 1
          && String(item?.parentId || "") === String(branchFilter)
          && String(item?.name || "").trim().toLowerCase() === displayName.toLowerCase()
      ) || nextCategoryTree.find((item) => Number(item?.depth) === 1 && String(item?.parentId || "") === String(branchFilter)) || null;
      setJobFilter(matched?.categoryId ? String(matched.categoryId) : "");
      setSelectedCategoryIds([]);
      setSkillQuery("");
      setJobQuery(displayName);
    } catch (error) {
      setPageErrorMessage(error?.message || "직무 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCategory({
        parentId: null,
        name: branchQuery.trim(),
      });
      const displayName = (created?.name || branchQuery.trim()).trim();
      const refreshed = await getInterviewCategories();
      const nextCategoryTree = Array.isArray(refreshed) ? refreshed : [];
      setCategoryTree(nextCategoryTree);
      const matched = nextCategoryTree.find(
        (item) => Number(item?.depth) === 0 && String(item?.name || "").trim().toLowerCase() === displayName.toLowerCase()
      ) || nextCategoryTree.find((item) => Number(item?.depth) === 0) || null;
      setBranchFilter(matched?.categoryId ? String(matched.categoryId) : "");
      setJobFilter("");
      setSelectedCategoryIds([]);
      setJobQuery("");
      setSkillQuery("");
      setBranchQuery(displayName);
    } catch (error) {
      setPageErrorMessage(error?.message || "계열 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateSkill = async () => {
    if (!jobFilter || !skillQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCategory({
        parentId: Number(jobFilter),
        name: skillQuery.trim(),
      });
      const displayName = (created?.name || skillQuery.trim()).trim();
      const refreshed = await getInterviewCategories();
      const nextCategoryTree = Array.isArray(refreshed) ? refreshed : [];
      setCategoryTree(nextCategoryTree);
      const matched = nextCategoryTree.find(
        (item) => Number(item?.depth) === 2
          && String(item?.parentId || "") === String(jobFilter)
          && String(item?.name || "").trim().toLowerCase() === displayName.toLowerCase()
      ) || nextCategoryTree.find((item) => Number(item?.depth) === 2 && String(item?.parentId || "") === String(jobFilter)) || null;
      if (matched?.categoryId) {
        setSelectedCategoryIds((prev) => prioritizeCreatedSelection(prev, String(matched.categoryId)));
        setSelectedQuestionSetId("");
      }
      setSkillQuery("");
    } catch (error) {
      setPageErrorMessage(error?.message || "기술 카테고리 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleStartInterview = async () => {
    const hasRequiredDocuments = Boolean(selectedFileObjects.RESUME);
    const selectedDocumentIds = DOCUMENT_TYPES
      .map((item) => selectedFiles[item.key])
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .map((value) => Number(value));

    if (!hasRequiredDocuments) {
      setShowPrereqGuideModal(true);
      setPageErrorMessage("이력서를 선택해 주세요.");
      return;
    }
    const resolvedJobName = (selectedJob?.displayName || selectedJob?.name || jobQuery.trim()).trim();
    const resolvedSkillNames = selectedSkills.map((skill) => (skill.displayName || skill.name || "").trim()).filter(Boolean);
    if (!resolvedJobName) {
      setPageErrorMessage("모의면접에는 직무 입력이 필요합니다.");
      return;
    }
    if (!selectedQuestionSet && !resolvedSkillNames.length) {
      setPageErrorMessage("모의면접에는 기술 카테고리를 선택하거나 내 질문 세트를 골라 주세요.");
      return;
    }

    setStartingInterview(true);
    setPageErrorMessage("");
    try {
      const response = await startMockInterview({
        documentFileIds: selectedDocumentIds,
        questionSetId: selectedQuestionSet ? Number(selectedQuestionSet.setId) : null,
        categoryIds: selectedCategoryIds.map((id) => Number(id)).filter(Number.isFinite),
        jobName: resolvedJobName,
        difficulty: ratingToDifficulty(selectedRating),
        language: selectedLanguage,
        includeSelfIntroduction,
        questionCount: Math.max(5, Number(selectedQuestionCount) || 5),
      });

      if (!response?.sessionId || !response?.currentQuestion) {
        setPageErrorMessage("면접 세션은 생성되었지만 첫 질문을 불러오지 못했습니다.");
        return;
      }

      saveTechInterviewSession({
        sessionId: response.sessionId,
        currentQuestion: response.currentQuestion,
        pendingResult: null,
        completed: false,
        metadata: {
          apiBasePath: "/api/interview/mock",
          selectedDocuments: {
            resume: buildSelectedDocumentMeta(selectedFileObjects.RESUME, "RESUME"),
            introduce: buildSelectedDocumentMeta(selectedFileObjects.INTRODUCE, "INTRODUCE"),
            portfolio: buildSelectedDocumentMeta(selectedFileObjects.PORTFOLIO, "PORTFOLIO"),
          },
          language: normalizeInterviewLanguage(response.language || selectedLanguage),
          difficulty: ratingToDifficulty(selectedRating),
          difficultyRating: selectedRating,
          categoryId: null,
          categoryName: selectedQuestionSet
            ? ((Array.isArray(selectedQuestionSet.skillNames) ? selectedQuestionSet.skillNames : [selectedQuestionSet.skillName]).filter(Boolean).join(", "))
            : resolvedSkillNames.join(", "),
          jobName: resolvedJobName,
          questionCount: totalInterviewQuestionCount,
          requestedQuestionCount: Math.max(5, Number(selectedQuestionCount) || 5),
          includeSelfIntroduction,
          questionSetId: selectedQuestionSet ? Number(selectedQuestionSet.setId) : null,
          providerUsed: response.providerUsed || null,
          fallbackDepth: Number(response.fallbackDepth || 0),
          paidFallbackPopupPending: String(response.providerUsed || "").toUpperCase() === "BEDROCK",
        },
      });
      clearInterviewStartDraft();

      navigate("/content/interview/session");
    } catch (error) {
      if (isGeminiOverloadError(error)) {
        setShowGeminiOverloadModal(true);
        setPageErrorMessage("");
        return;
      }
      setPageErrorMessage(error?.message || "면접 시작에 실패했습니다.");
    } finally {
      setStartingInterview(false);
    }
  };

  const handleResumeInterview = async () => {
    if (!pendingResumeSession) return;
    setResumeModalBusy(true);
    try {
      const snapshot = buildResumedSessionSnapshot(pendingResumeSession, {
        apiBasePath: "/api/interview/mock",
        requestedQuestionCount: Math.max(Number(pendingResumeSession.questionCount || 0), 1),
      });
      if (!snapshot) {
        setPendingResumeSession(null);
        return;
      }
      saveTechInterviewSession(snapshot);
      navigate("/content/interview/session");
    } finally {
      setResumeModalBusy(false);
    }
  };

  const handleDismissInterviewResume = async () => {
    if (!pendingResumeSession?.sessionId) {
      setPendingResumeSession(null);
      return;
    }
    setResumeModalBusy(true);
    try {
      await dismissMockSession(pendingResumeSession.sessionId);
      setPendingResumeSession(null);
    } catch (error) {
      setPageErrorMessage(error?.message || "미완료 면접 세션 종료에 실패했습니다.");
    } finally {
      setResumeModalBusy(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-13.5">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => {
          if (startingInterview) return;
          setShowPointChargeModal(true);
        }}
        onOpenMenu={() => {
          if (startingInterview) return;
          setIsMobileMenuOpen(true);
        }}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="interview_start"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        onLogout={() => {
          if (startingInterview) return;
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-68 shrink-0 md:block">
          <Sidebar
            activeKey="interview_start"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            onLogout={() => {
              if (startingInterview) return;
              setShowLogoutModal(true);
            }}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto w-full max-w-7xl space-y-5">
              <section className="rounded-3xl border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-5 sm:p-6">
                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">MOCK INTERVIEW</p>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[42px]">
                  서류와 직무를 고르고
                  <br />
                  실전처럼 면접을 시작합니다
                </h1>
                <p className="mt-3 max-w-180 text-[14px] leading-[1.7] text-[#5e6472] sm:text-[15px]">
                  분석 완료된 서류만 선택하실 수 있습니다. 이력서는 필수이고, 자기소개서와 포트폴리오는 선택 사항입니다. 직무와 기술 카테고리를 함께 선택하시면 문서 질문과 기술 질문을 섞어 면접을 생성합니다.
                </p>
              </section>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <CategoryCard title="계열 선택" description="최상위 루트(계열)를 먼저 선택하면 직무/기술 후보를 더 빠르게 좁힐 수 있습니다.">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={branchQuery}
                        onChange={(event) => setBranchQuery(event.target.value)}
                        placeholder="계열 검색 또는 새 계열 입력"
                        className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                      />
                      {canCreateBranch ? (
                        <button type="button" disabled={creatingCategory} onClick={handleCreateBranch} className="rounded-[14px] border border-[#171b24] px-4 py-3 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">
                          {creatingCategory ? "생성 중..." : "계열 추가"}
                        </button>
                      ) : <div />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <FilterChip
                        label="전체 계열"
                        active={!branchFilter}
                        onClick={() => setBranchFilter("")}
                      />
                      {visibleBranches.map((branch) => (
                        <FilterChip
                          key={branch.categoryId}
                          label={branch.name}
                          active={branchFilter === String(branch.categoryId)}
                          onClick={() => setBranchFilter(String(branch.categoryId))}
                        />
                      ))}
                      {!visibleBranches.length && !loadingPage ? <span className="text-[12px] text-[#7a8190]">표시할 계열이 없습니다.</span> : null}
                    </div>
                    <p className={`mt-3 text-[12px] ${branchAlreadyExists ? "text-[#d14343]" : "text-[#7a8190]"}`}>
                      {branchAlreadyExists
                        ? "같은 이름의 계열이 이미 있습니다. 중복/장난 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."
                        : "없는 계열은 직접 추가할 수 있습니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="직무 선택" description="직무는 한글 기준으로 선택하시고, 없으면 바로 추가해 주세요.">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={jobQuery}
                        onChange={(event) => setJobQuery(event.target.value)}
                        placeholder="직무 검색 또는 새 직무 입력"
                        className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                      />
                      {canCreateJob ? (
                        <button type="button" disabled={creatingCategory} onClick={handleCreateJob} className="rounded-[14px] border border-[#171b24] px-4 py-3 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">
                          {creatingCategory ? "생성 중..." : "직무 추가"}
                        </button>
                      ) : <div />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {visibleJobs.map((job) => (
                        <FilterChip
                          key={job.categoryId}
                          label={job.displayName || job.name}
                          active={String(job.categoryId) === jobFilter}
                          onClick={() => setJobFilter(String(job.categoryId))}
                        />
                      ))}
                      {!visibleJobs.length && !loadingPage ? <span className="text-[12px] text-[#7a8190]">표시할 직무가 없습니다.</span> : null}
                    </div>
                    <p className={`mt-3 text-[12px] ${jobAlreadyExists ? "text-[#d14343]" : "text-[#7a8190]"}`}>
                      {jobAlreadyExists
                        ? "같은 이름의 직무가 이미 있습니다. 중복/장난 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."
                        : "새로 만든 직무는 바로 선택됩니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="기술 카테고리 선택" description="모의면접에는 기술질문이 40% 비율로 포함됩니다. 직무를 먼저 고른 뒤 기술을 여러 개 선택하거나 직접 추가해 주세요.">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={skillQuery}
                        onChange={(event) => setSkillQuery(event.target.value)}
                        placeholder={jobFilter ? "기술 검색 또는 새 기술 입력" : "직무를 먼저 선택해 주세요"}
                        disabled={!jobFilter}
                        className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8] disabled:bg-[#f4f6f8]"
                      />
                      {canCreateSkill ? (
                        <button type="button" disabled={creatingCategory} onClick={handleCreateSkill} className="rounded-[14px] border border-[#171b24] px-4 py-3 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">
                          {creatingCategory ? "생성 중..." : "기술 추가"}
                        </button>
                      ) : <div />}
                    </div>
                    {selectedSkills.length ? (
                      <div className="mt-4 flex flex-wrap gap-2 rounded-[14px] border border-[#eef1f5] bg-[#fafbfd] p-3">
                        {selectedSkills.map((skill) => (
                          <span
                            key={`selected-skill-${skill.categoryId}`}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] ${skill.isCommon ? "border-[#61a8e8] bg-[#e8f4ff] text-[#2563a6]" : "border-[#171b24] bg-[#171b24] text-white"}`}
                          >
                            <span>{skill.displayName || skill.name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedCategoryIds((prev) => prev.filter((id) => id !== String(skill.categoryId)))}
                              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none ${skill.isCommon ? "bg-[#61a8e8]/15 text-[#2563a6]" : "bg-white/18 text-white/90"}`}
                              aria-label={`${skill.displayName || skill.name} 제거`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {visibleSkills.map((skill) => (
                        <FilterChip
                          key={skill.categoryId}
                          label={skill.isCommon ? `${skill.label} · 공통` : skill.label}
                          active={selectedCategoryIds.includes(String(skill.categoryId))}
                          onClick={() => {
                            const nextId = String(skill.categoryId);
                            if (!selectedCategoryIds.includes(nextId) && selectedCategoryIds.length >= 3) {
                              setPageErrorMessage("기술 카테고리는 최대 3개까지 선택하실 수 있습니다.");
                              return;
                            }
                            setPageErrorMessage("");
                            setSelectedQuestionSetId("");
                            setSelectedCategoryIds((prev) => toggleSkillSelection(prev, nextId));
                          }}
                        />
                      ))}
                      {!visibleSkills.length && jobFilter ? <span className="text-[12px] text-[#7a8190]">현재 직무에 등록된 기술이 없습니다. 직접 추가하시면 바로 사용하실 수 있습니다.</span> : null}
                    </div>
                    <p className={`mt-3 text-[12px] ${skillAlreadyExists ? "text-[#d14343]" : "text-[#7a8190]"}`}>
                      {skillAlreadyExists
                        ? "같은 이름의 기술이 이미 있습니다. 직무가 달라도 중복 생성은 막힙니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."
                        : "새로 만든 기술은 바로 선택됩니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."}
                    </p>
                    <p className="mt-3 text-[12px] text-[#7a8190]">최대 3개까지 선택하실 수 있으며, 선택한 기술 전체에서 질문 후보를 한 번에 생성한 뒤 품질 통과분만 섞어 출제합니다.</p>
                  </CategoryCard>

                  <CategoryCard title="내 질문 세트로 기술질문 대체" description="AI 기술질문 대신 내가 만든 질문 세트를 그대로 기술 질문 풀로 사용할 수 있습니다. 선택 시 위 기술 카테고리 대신 이 세트가 우선 적용됩니다.">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionSetId("")}
                        className={`flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition ${!selectedQuestionSetId ? "border-[#171b24] bg-[#f8fafc]" : "border-[#d9dde5] bg-white text-[#4f5664]"}`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${!selectedQuestionSetId ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#c7cfdd] bg-white text-transparent"}`}>✓</span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#171b24]">기술 카테고리 생성 사용</p>
                          <p className="mt-0.5 text-[11px] text-[#7a8190]">선택한 기술 카테고리 기준으로 AI 기술질문을 생성합니다.</p>
                        </div>
                      </button>
                      {visibleQuestionSets.map((set) => {
                        const selected = selectedQuestionSetId === String(set.setId);
                        const skillLabels = (Array.isArray(set.skillNames) ? set.skillNames : [set.skillName]).filter(Boolean);
                        return (
                          <button
                            key={set.setId}
                            type="button"
                            onClick={() => {
                              setSelectedQuestionSetId(String(set.setId));
                              setSelectedCategoryIds([]);
                              setPageErrorMessage("");
                            }}
                            className={`flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition ${selected ? "border-[#171b24] bg-[#f8fafc]" : "border-[#d9dde5] bg-white text-[#4f5664]"}`}
                          >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${selected ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#c7cfdd] bg-white text-transparent"}`}>✓</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-[#171b24]">{set.title}</p>
                              <p className="mt-0.5 truncate text-[11px] text-[#7a8190]">
                                {(set.branchName || set.jobName || "계열 미지정")} · {(skillLabels.length ? skillLabels.slice(0, 3).join(", ") : "기술 없음")}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      {!visibleQuestionSets.length ? <span className="text-[12px] text-[#7a8190]">현재 선택한 직무에서 사용할 수 있는 내 질문 세트가 없습니다.</span> : null}
                    </div>
                    <p className="mt-3 text-[12px] text-[#7a8190]">세트를 선택하면 기술질문은 AI 생성 대신 해당 세트 문답에서 랜덤하게 대체됩니다.</p>
                  </CategoryCard>

                  <CategoryCard title="서류 선택" description="AI 분석이 끝난 서류만 노출됩니다. 이력서는 필수이며, 자기소개서와 포트폴리오는 선택 사항입니다. OCR fallback이 사용된 문서는 배지를 함께 표시합니다.">
                    <div className="grid gap-4 md:grid-cols-3">
                      {DOCUMENT_TYPES.map((documentType) => {
                        const files = filesByType[documentType.key] || [];
                        return (
                          <div key={documentType.key} className="rounded-[18px] border border-[#e4e7ee] bg-[#f8fafc] p-4">
                            <p className="text-[12px] font-semibold text-[#6a7383]">{documentType.label}</p>
                            <div className="mt-3 space-y-2">
                              <button
                                type="button"
                                onClick={() => setSelectedFiles((prev) => ({ ...prev, [documentType.key]: "" }))}
                                className={`block w-full rounded-xl border px-3 py-2 text-left text-[12px] ${!selectedFiles[documentType.key] ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d7dce5] bg-white text-[#485160]"}`}
                              >
                                미선택
                              </button>
                              {files.map((file) => {
                                const fileId = String(file?.fileId || file?.file_id || "");
                                const active = String(selectedFiles[documentType.key] || "") === fileId;
                                return (
                                  <button
                                    key={`${documentType.key}-${fileId}`}
                                    type="button"
                                    onClick={() => setSelectedFiles((prev) => ({ ...prev, [documentType.key]: fileId }))}
                                    className={`block w-full rounded-xl border px-3 py-2 text-left text-[12px] ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d7dce5] bg-white text-[#485160]"}`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span className="truncate">{resolveDisplayFileName(file)}</span>
                                      {file?.ocrUsed ? <OcrInfoBadge compact /> : null}
                                    </span>
                                  </button>
                                );
                              })}
                              {!loadingPage && !files.length ? <p className="text-[11px] text-[#7a8190]">분석 완료된 파일이 없습니다.</p> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-[14px] border border-[#e6eaf2] bg-[#fbfcfe] px-4 py-3">
                      <p className="text-[12px] leading-[1.7] text-[#5e6472]">
                        면접 시작 전, 이력서 업로드 및 AI 분석 완료가 반드시 선행되어야 합니다. 자기소개서와 포트폴리오는 선택 사항입니다.
                      </p>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate("/content/files")}
                          className="rounded-[10px] border border-[#171b24] px-3 py-1.5 text-[12px] font-semibold text-[#171b24]"
                        >
                          이력서 업로드 페이지로 이동
                        </button>
                      </div>
                    </div>
                  </CategoryCard>
                </div>

                <div className="space-y-5">
                  <CategoryCard title="난이도와 문항 수" description="모의면접은 최소 5문항이며, 기술질문은 전체의 40% 비율로 자동 배분됩니다.">
                    <div className="rounded-[18px] border border-[#eef1f5] bg-[#fafbfd] p-4">
                      <p className="text-[12px] font-semibold text-[#6a7383]">난이도</p>
                      <div className="mt-3 flex items-center gap-3">
                        <StarRatingInput value={selectedRating} onChange={setSelectedRating} />
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#f3ddad] bg-[#fff8e8] px-3 py-1 text-[12px] text-[#8a5a00]">
                          <StarIcons rating={selectedRating} />
                          <span className="font-medium">{selectedRating} / 5</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[18px] border border-[#eef1f5] bg-[#fafbfd] p-4">
                      <p className="text-[12px] font-semibold text-[#6a7383]">문항 수</p>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number"
                          min={5}
                          max={20}
                          value={selectedQuestionCount}
                          onChange={(event) => setSelectedQuestionCount(Math.max(5, Number(event.target.value) || 5))}
                          className="w-30 rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                        />
                        <span className="text-[12px] text-[#6a7383]">최소 5문항, 최대 20문항</span>
                      </div>
                      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[12px] text-[#4f5664]">
                        <input
                          type="checkbox"
                          checked={includeSelfIntroduction}
                          onChange={(event) => setIncludeSelfIntroduction(event.target.checked)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border text-[11px] leading-none transition ${
                            includeSelfIntroduction
                              ? "border-[#171b24] bg-[#171b24] text-white"
                              : "border-[#cfd6e4] bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span>첫 질문에 자기소개 문항 추가</span>
                      </label>
                      <p className="mt-2 text-[12px] text-[#7a8190]">
                        체크하면 첫 질문으로 &quot;자기소개 부탁드리겠습니다.&quot;가 추가되며, 선택 문항 수에 1문항이 더해집니다.
                      </p>
                    </div>
                  </CategoryCard>

                  <CategoryCard title="면접 언어" description="영어 면접을 선택하면 질문, 답변, 피드백이 영어 기준으로 진행됩니다. 영어 세션에서는 답변도 영어로 작성해야 합니다.">
                    <LanguageSelect value={selectedLanguage} onChange={setSelectedLanguage} />
                    <p className="mt-3 text-[12px] text-[#7a8190]">
                      현재 선택: {getInterviewLanguageLabel(selectedLanguage)}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="선택 요약" description="세션 상단에 그대로 표시되는 메타 정보입니다.">
                    <div className="flex flex-wrap gap-2">
                      {selectedJob ? <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">{selectedJob.displayName || selectedJob.name}</span> : null}
                      <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                        언어: {getInterviewLanguageLabel(selectedLanguage)}
                      </span>
                      {selectedQuestionSet ? (
                        <span className="rounded-full border border-[#d8dde7] bg-[#f7f9fc] px-3 py-1 text-[12px] text-[#4f5664]">
                          질문 세트: {selectedQuestionSet.title}
                        </span>
                      ) : selectedSkills.length ? selectedSkills.map((skill) => (
                        <span key={`summary-skill-${skill.categoryId}`} className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                          {skill.displayName || skill.name}
                        </span>
                      )) : (
                        <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                          기술 미선택
                        </span>
                      )}
                      <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                        문항 {totalInterviewQuestionCount}개{includeSelfIntroduction ? " (자기소개 포함)" : ""}
                      </span>
                      {includeSelfIntroduction ? (
                        <span className="rounded-full border border-[#bfe3fb] bg-[#f3fbff] px-3 py-1 text-[12px] font-medium text-[#2b6cb0]">
                          첫 질문: 자기소개
                        </span>
                      ) : null}
                      {DOCUMENT_TYPES.map((type) => {
                        const file = selectedFileObjects[type.key];
                        return (
                          <span key={type.key} className="inline-flex items-center gap-1.5 rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                            <span>{file ? resolveDisplayFileName(file) : `${type.label} 미선택`}</span>
                            {file?.ocrUsed ? <OcrInfoBadge compact /> : null}
                          </span>
                        );
                      })}
                    </div>
                    {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
                    <div className="mt-6 flex items-center justify-between gap-3">
                      {startingInterview ? <InlineSpinner label="면접 세션과 질문을 생성하고 있습니다." /> : <span />}
                      <button type="button" onClick={handleStartInterview} disabled={loadingPage || startingInterview} className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                        {startingInterview ? "면접 생성 중..." : "면접 시작"}
                      </button>
                    </div>
                  </CategoryCard>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {startingInterview ? (
        <BlockingLoadingOverlay
          title="면접 세션을 준비하는 중입니다"
          description="질문 생성이 완료될 때까지 잠시만 기다려 주세요. 이 과정에서는 다른 화면으로 이동할 수 없습니다."
        />
      ) : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} /> : null}
      {showGeminiOverloadModal ? <GeminiOverloadModal onClose={() => setShowGeminiOverloadModal(false)} /> : null}
      {showPrereqGuideModal ? (
        <InterviewPrerequisiteGuideModal
          onClose={() => setShowPrereqGuideModal(false)}
          onMoveToUpload={() => {
            setShowPrereqGuideModal(false);
            navigate("/content/files");
          }}
        />
      ) : null}
      <ResumeSessionModal
        open={Boolean(pendingResumeSession)}
        title="완료하지 못한 면접 세션이 있습니다"
        description="이전에 진행 중이던 실전 모의면접이 남아 있습니다. 이어서 진행하시겠습니까?"
        onContinue={() => void handleResumeInterview()}
        onDismiss={() => void handleDismissInterviewResume()}
        busy={resumeModalBusy}
      />
    </div>
  );
};
